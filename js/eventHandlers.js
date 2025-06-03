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
    getActiveMIDIInputState
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
    if (!localAppServices.showNotification) {
        localAppServices.showNotification = showNotification;
    }
}

export let currentlyPressedComputerKeys = {};
let currentOctaveShift = 0;
const MIN_OCTAVE_SHIFT = -2;
const MAX_OCTAVE_SHIFT = 2;

export function initializePrimaryEventListeners(appContext) {
    const services = appContext || localAppServices;
    const uiCache = services.uiElementsCache || {};
    // console.log('[EventHandlers initializePrimaryEventListeners] Initializing. uiCache keys:', Object.keys(uiCache));

    try {
        if (uiCache.startButton) {
            uiCache.startButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (uiCache.startMenu) {
                    uiCache.startMenu.classList.toggle('hidden');
                } else {
                    console.error('[EventHandlers] Start Menu (uiCache.startMenu) not found!');
                }
            });
        }

        if (uiCache.desktop) {
            uiCache.desktop.addEventListener('click', () => {
                if (uiCache.startMenu && !uiCache.startMenu.classList.contains('hidden')) {
                    uiCache.startMenu.classList.add('hidden');
                }
                const activeContextMenu = document.querySelector('.context-menu#snug-context-menu');
                if (activeContextMenu) {
                    activeContextMenu.remove();
                }
            });

            uiCache.desktop.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const menuItems = [
                    { label: "Add Synth Track", action: () => { if(services.addTrack && typeof services.addTrack === 'function') services.addTrack('Synth', {_isUserActionPlaceholder: true}); else console.warn("services.addTrack is not a function") } },
                    { label: "Add Slicer Sampler Track", action: () => { if(services.addTrack && typeof services.addTrack === 'function') services.addTrack('Sampler', {_isUserActionPlaceholder: true}); } },
                    { label: "Add Sampler (Pads)", action: () => { if(services.addTrack && typeof services.addTrack === 'function') services.addTrack('DrumSampler', {_isUserActionPlaceholder: true}); } },
                    { label: "Add Instrument Sampler Track", action: () => { if(services.addTrack && typeof services.addTrack === 'function') services.addTrack('InstrumentSampler', {_isUserActionPlaceholder: true}); } },
                    { label: "Add Audio Track", action: () => { if(services.addTrack && typeof services.addTrack === 'function') services.addTrack('Audio', {_isUserActionPlaceholder: true}); } },
                    { separator: true },
                    { label: "Open Sound Browser", action: () => { if(services.openSoundBrowserWindow && typeof services.openSoundBrowserWindow === 'function') services.openSoundBrowserWindow(); } },
                    { label: "Open Timeline", action: () => { if(services.openTimelineWindow && typeof services.openTimelineWindow === 'function') services.openTimelineWindow(); } },
                    { label: "Open Mixer", action: () => { if(services.openMixerWindow && typeof services.openMixerWindow === 'function') services.openMixerWindow(); } },
                    { label: "Open Master Effects", action: () => { if(services.openMasterEffectsRackWindow && typeof services.openMasterEffectsRackWindow === 'function') services.openMasterEffectsRackWindow(); } },
                    { separator: true },
                    { label: "Upload Custom Background", action: () => { if(services.triggerCustomBackgroundUpload && typeof services.triggerCustomBackgroundUpload === 'function') services.triggerCustomBackgroundUpload(); } },
                    { label: "Remove Custom Background", action: () => { if(services.removeCustomDesktopBackground && typeof services.removeCustomDesktopBackground === 'function') services.removeCustomDesktopBackground(); } },
                    { separator: true },
                    { label: "Toggle Full Screen", action: toggleFullScreen }
                ];
                if (typeof createContextMenu === 'function') {
                    createContextMenu(e, menuItems, services);
                } else {
                    console.error("[EventHandlers] createContextMenu function not available.");
                }
            });
        }

        const menuActions = {
            menuAddSynthTrack: () => { if (services.addTrack && typeof services.addTrack === 'function') services.addTrack('Synth', {_isUserActionPlaceholder: true}); },
            menuAddSamplerTrack: () => { if (services.addTrack && typeof services.addTrack === 'function') services.addTrack('Sampler', {_isUserActionPlaceholder: true}); },
            menuAddDrumSamplerTrack: () => { if (services.addTrack && typeof services.addTrack === 'function') services.addTrack('DrumSampler', {_isUserActionPlaceholder: true}); },
            menuAddInstrumentSamplerTrack: () => { if (services.addTrack && typeof services.addTrack === 'function') services.addTrack('InstrumentSampler', {_isUserActionPlaceholder: true}); },
            menuAddAudioTrack: () => { if (services.addTrack && typeof services.addTrack === 'function') services.addTrack('Audio', {_isUserActionPlaceholder: true}); },
            menuOpenSoundBrowser: () => { if (services.openSoundBrowserWindow && typeof services.openSoundBrowserWindow === 'function') services.openSoundBrowserWindow(); },
            menuOpenTimeline: () => { if (services.openTimelineWindow && typeof services.openTimelineWindow === 'function') services.openTimelineWindow(); },
            menuOpenMixer: () => { if (services.openMixerWindow && typeof services.openMixerWindow === 'function') services.openMixerWindow(); },
            menuOpenMasterEffects: () => { if (services.openMasterEffectsRackWindow && typeof services.openMasterEffectsRackWindow === 'function') services.openMasterEffectsRackWindow(); },
            menuUndo: () => { if (services.undoLastAction && typeof services.undoLastAction === 'function') services.undoLastAction(); },
            menuRedo: () => { if (services.redoLastAction && typeof services.redoLastAction === 'function') services.redoLastAction(); },
            menuSaveProject: () => { if (services.saveProject && typeof services.saveProject === 'function') services.saveProject(); },
            menuLoadProject: () => { if (services.loadProject && typeof services.loadProject === 'function') services.loadProject(); },
            menuExportWav: () => { if (services.exportToWav && typeof services.exportToWav === 'function') services.exportToWav(); },
            menuToggleFullScreen: toggleFullScreen,
        };

        for (const menuItemId in menuActions) {
            if (uiCache[menuItemId]) {
                uiCache[menuItemId].addEventListener('click', () => {
                    if (typeof menuActions[menuItemId] === 'function') {
                        menuActions[menuItemId]();
                    } else {
                        console.warn(`[EventHandlers] Action for menu item "${menuItemId}" is not a function or service is unavailable.`);
                    }
                    if (uiCache.startMenu) uiCache.startMenu.classList.add('hidden');
                });
            }
        }

        if (uiCache.loadProjectInput) {
            uiCache.loadProjectInput.addEventListener('change', (e) => {
                if (services.handleProjectFileLoad && typeof services.handleProjectFileLoad === 'function') {
                    services.handleProjectFileLoad(e);
                } else {
                    console.error("[EventHandlers] handleProjectFileLoad service not available.");
                }
            });
        }

    } catch (error) {
        console.error("[EventHandlers initializePrimaryEventListeners] Error:", error);
        const notify = services.showNotification || localAppServices.showNotification || showNotification;
        if (typeof notify === 'function') notify("Error setting up primary interactions.", 5000);
    }
}

export function attachGlobalControlEvents(elements) {
    // ... (stop, record, tempo, MIDI, playback mode toggle listeners remain the same as response #30)
    if (!elements) { console.error("[EventHandlers attachGlobalControlEvents] Elements object is null."); return; }
    const { playBtnGlobal, recordBtnGlobal, stopBtnGlobal, tempoGlobalInput, midiInputSelectGlobal, playbackModeToggleBtnGlobal } = elements;
    const showUINotification = localAppServices.showNotification || showNotification;

    if (playBtnGlobal) {
        playBtnGlobal.addEventListener('click', async () => {
            console.log("[EventHandlers PlayBtn] Global Play button CLICKED."); // Enhanced LOG
            try {
                if (!localAppServices.initAudioContextAndMasterMeter || typeof localAppServices.initAudioContextAndMasterMeter !== 'function') {
                    console.error("initAudioContextAndMasterMeter service not available.");
                    showUINotification("Audio system critical error.", 3000); return;
                }
                const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
                if (!audioReady) {
                    showUINotification("Audio context not ready. Click again.", 3000);
                    console.warn("[EventHandlers PlayBtn] Audio context not ready.");
                    return;
                }
                if (typeof Tone === 'undefined' || !Tone.Transport) {
                    console.error("[EventHandlers PlayBtn] Tone or Tone.Transport unavailable!");
                    showUINotification("Audio engine (Tone.Transport) error.", 3000);
                    return;
                }

                const transport = Tone.Transport;
                console.log(`[EventHandlers PlayBtn] Current Transport state: ${transport.state}, time: ${transport.seconds.toFixed(2)}s`);
                const tracks = (localAppServices.getTracks && typeof localAppServices.getTracks === 'function') ? localAppServices.getTracks() : [];
                console.log(`[EventHandlers PlayBtn] Found ${tracks.length} tracks. Playback Mode: ${localAppServices.getPlaybackMode ? localAppServices.getPlaybackMode() : 'unknown'}`);

                tracks.forEach(track => { if (track && typeof track.stopPlayback === 'function') track.stopPlayback(); });
                transport.cancel(0);

                if (transportKeepAliveBufferSource && !transportKeepAliveBufferSource.disposed) {
                    try { transportKeepAliveBufferSource.stop(0); transportKeepAliveBufferSource.dispose(); } catch (e) {}
                    transportKeepAliveBufferSource = null;
                }

                if (transport.state === 'stopped' || transport.state === 'paused') {
                    const wasPaused = transport.state === 'paused';
                    const startTime = wasPaused ? transport.seconds : 0;
                    if (!wasPaused) transport.position = 0;
                    console.log(`[EventHandlers PlayBtn] Action: STARTING/RESUMING transport from ${startTime.toFixed(2)}s.`);
                    transport.loop = true; transport.loopStart = 0;
                    const projectLoopEnd = (localAppServices.getProjectLoopEnd && typeof localAppServices.getProjectLoopEnd === 'function') ? localAppServices.getProjectLoopEnd() : 3600;
                    transport.loopEnd = projectLoopEnd;

                    if (!silentKeepAliveBuffer && Tone.context) { /* ... */ }
                    if (silentKeepAliveBuffer) { /* ... */ }

                    console.log(`[EventHandlers PlayBtn] Scheduling playback for ${tracks.length} tracks...`);
                    for (const track of tracks) {
                        if (track && typeof track.schedulePlayback === 'function') {
                            // console.log(`[EventHandlers PlayBtn] Calling schedulePlayback for track ${track.id} ("${track.name}")`);
                            await track.schedulePlayback(startTime, transport.loopEnd);
                        } else if (track) { console.warn(`[EventHandlers PlayBtn] Track ${track.id} missing schedulePlayback.`); }
                    }
                    console.log(`[EventHandlers PlayBtn] Playback scheduling complete. Starting transport.`);
                    transport.start(Tone.now() + 0.05, startTime);
                    if (playBtnGlobal) playBtnGlobal.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>`;
                } else {
                    console.log(`[EventHandlers PlayBtn] Action: PAUSING transport.`);
                    transport.pause();
                    if (playBtnGlobal) playBtnGlobal.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>`;
                }
                console.log(`[EventHandlers PlayBtn] New Transport state: ${transport.state}`);
            } catch (error) { /* ... error handling ... */ }
        });
    } else { console.warn("[EventHandlers] playBtnGlobal not found."); }
    // ... (stop, record, tempo, MIDI, playback mode toggle listeners remain the same as response #30)
}

export function setupMIDI() { /* ... same as response #30 ... */ }
function onMIDISuccess(midiAccess) { /* ... same as response #30 ... */ }
function onMIDIFailure(msg, notifyFn) { /* ... same as response #30 ... */ }
export function selectMIDIInput(deviceId, silent = false) { /* ... same as response #30 ... */ }
function handleMIDIMessage(message) { /* ... same as response #30 ... */ }
// document.addEventListener('keydown', ...); // same as response #30
// document.addEventListener('keyup', ...); // same as response #30
export function handleTrackMute(trackId) { /* ... same as response #30 ... */ }
export function handleTrackSolo(trackId) { /* ... same as response #30 ... */ }
export function handleTrackArm(trackId) { /* ... same as response #30 ... */ }
export function handleRemoveTrack(trackId) { /* ... same as response #30 (robust version) ... */ }

// --- Window Opening Handlers (called via appServices from UI) ---
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
    if (localAppServices.openTrackSequencerWindow && typeof localAppServices.openTrackSequencerWindow === 'function') {
        localAppServices.openTrackSequencerWindow(trackId);
    } else { console.error("[EventHandlers] openTrackSequencerWindow service not available or not a function."); }
}

function toggleFullScreen() { /* ... same as response #30 ... */ }
export async function processTimelineDrop(droppedItemData, targetTrackId, startTime, appServicesPassed) { /* ... same as response #30 ... */ }
export { processTimelineDrop as handleTimelineLaneDrop };
