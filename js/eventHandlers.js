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
        console.warn("[EventHandlers Init] showNotification service not found in appServices. Using direct import as fallback.");
        localAppServices.showNotification = showNotification;
    }
}

export let currentlyPressedComputerKeys = {};
let currentOctaveShift = 0;
const MIN_OCTAVE_SHIFT = -2;
const MAX_OCTAVE_SHIFT = 2;

export function initializePrimaryEventListeners(appContext) {
    // ... (This function remains the same as your last provided version,
    // with menuOpenGlobalControls removed from menuActions)
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
                    console.error('[EventHandlers] Start Menu (uiCache.startMenu) not found when Start Button clicked!');
                }
            });
        } else {
            // console.warn('[EventHandlers initializePrimaryEventListeners] Start Button (uiCache.startButton) NOT found in uiCache!');
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
                    { label: "Add Synth Track", action: () => { if(services.addTrack) services.addTrack('Synth', {_isUserActionPlaceholder: true}); } },
                    { label: "Add Slicer Sampler Track", action: () => { if(services.addTrack) services.addTrack('Sampler', {_isUserActionPlaceholder: true}); } },
                    { label: "Add Sampler (Pads)", action: () => { if(services.addTrack) services.addTrack('DrumSampler', {_isUserActionPlaceholder: true}); } },
                    { label: "Add Instrument Sampler Track", action: () => { if(services.addTrack) services.addTrack('InstrumentSampler', {_isUserActionPlaceholder: true}); } },
                    { label: "Add Audio Track", action: () => { if(services.addTrack) services.addTrack('Audio', {_isUserActionPlaceholder: true}); } },
                    { separator: true },
                    { label: "Open Sound Browser", action: () => { if(services.openSoundBrowserWindow) services.openSoundBrowserWindow(); } },
                    { label: "Open Timeline", action: () => { if(services.openTimelineWindow) services.openTimelineWindow(); } },
                    { label: "Open Mixer", action: () => { if(services.openMixerWindow) services.openMixerWindow(); } },
                    { label: "Open Master Effects", action: () => { if(services.openMasterEffectsRackWindow) services.openMasterEffectsRackWindow(); } },
                    { separator: true },
                    { label: "Upload Custom Background", action: () => { if(services.triggerCustomBackgroundUpload) services.triggerCustomBackgroundUpload(); } },
                    { label: "Remove Custom Background", action: () => { if(services.removeCustomDesktopBackground) services.removeCustomDesktopBackground(); } },
                    { separator: true },
                    { label: "Toggle Full Screen", action: toggleFullScreen }
                ];
                if (typeof createContextMenu === 'function') {
                    createContextMenu(e, menuItems, services);
                } else {
                    console.error("[EventHandlers] createContextMenu function not available.");
                }
            });
        } else {
            //  console.warn('[EventHandlers initializePrimaryEventListeners] Desktop element (uiCache.desktop) NOT found in uiCache!');
        }

        const menuActions = {
            menuAddSynthTrack: () => services.addTrack?.('Synth', {_isUserActionPlaceholder: true}),
            menuAddSamplerTrack: () => services.addTrack?.('Sampler', {_isUserActionPlaceholder: true}),
            menuAddDrumSamplerTrack: () => services.addTrack?.('DrumSampler', {_isUserActionPlaceholder: true}),
            menuAddInstrumentSamplerTrack: () => services.addTrack?.('InstrumentSampler', {_isUserActionPlaceholder: true}),
            menuAddAudioTrack: () => services.addTrack?.('Audio', {_isUserActionPlaceholder: true}),
            menuOpenSoundBrowser: () => services.openSoundBrowserWindow?.(),
            menuOpenTimeline: () => services.openTimelineWindow?.(),
            menuOpenMixer: () => services.openMixerWindow?.(),
            menuOpenMasterEffects: () => services.openMasterEffectsRackWindow?.(),
            menuUndo: () => services.undoLastAction?.(),
            menuRedo: () => services.redoLastAction?.(),
            menuSaveProject: () => services.saveProject?.(),
            menuLoadProject: () => services.loadProject?.(),
            menuExportWav: () => services.exportToWav?.(),
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
            } else if (menuItemId !== 'menuOpenGlobalControls') {
                // console.warn(`[EventHandlers initializePrimaryEventListeners] Menu item element for "${menuItemId}" NOT found in uiCache!`);
            }
        }

        if (uiCache.loadProjectInput) {
            uiCache.loadProjectInput.addEventListener('change', (e) => {
                if (services.handleProjectFileLoad) {
                    services.handleProjectFileLoad(e);
                } else {
                    console.error("[EventHandlers] handleProjectFileLoad service not available.");
                }
            });
        } else {
            // console.warn("[EventHandlers] Load project input (uiCache.loadProjectInput) not found.");
        }

    } catch (error) {
        console.error("[EventHandlers initializePrimaryEventListeners] Error during initialization:", error);
        (services.showNotification || localAppServices.showNotification || showNotification)("Error setting up primary interactions. Some UI might not work.", 5000);
    }
}

export function attachGlobalControlEvents(elements) {
    // ... (This function remains the same as your last provided version)
    if (!elements) {
        console.error("[EventHandlers attachGlobalControlEvents] Elements object is null or undefined.");
        return;
    }
    const { playBtnGlobal, recordBtnGlobal, stopBtnGlobal, tempoGlobalInput, midiInputSelectGlobal, playbackModeToggleBtnGlobal } = elements;
    const showUINotification = localAppServices.showNotification || showNotification;

    if (playBtnGlobal) {
        playBtnGlobal.addEventListener('click', async () => {
            try {
                if (!localAppServices.initAudioContextAndMasterMeter) {
                    console.error("initAudioContextAndMasterMeter service not available.");
                    showUINotification("Audio system error.", 3000); return;
                }
                const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
                if (!audioReady) {
                    showUINotification("Audio context not ready. Please interact with the page.", 3000);
                    return;
                }

                const transport = Tone.Transport;
                // console.log(`[EventHandlers Play/Resume] Clicked. Transport state: ${transport.state}, time: ${transport.seconds.toFixed(2)}`);

                const tracks = getTracks();
                if (tracks) {
                    tracks.forEach(track => { if (track && typeof track.stopPlayback === 'function') track.stopPlayback(); });
                }
                transport.cancel(0);

                if (transportKeepAliveBufferSource && typeof transportKeepAliveBufferSource.dispose === 'function' && !transportKeepAliveBufferSource.disposed) {
                    try { transportKeepAliveBufferSource.stop(0); transportKeepAliveBufferSource.dispose(); } catch (e) { /* ignore */ }
                    transportKeepAliveBufferSource = null;
                }

                if (transport.state === 'stopped' || transport.state === 'paused') {
                    const wasPaused = transport.state === 'paused';
                    const startTime = wasPaused ? transport.seconds : 0;
                    if (!wasPaused) transport.position = 0;

                    // console.log(`[EventHandlers Play/Resume] Starting/Resuming from ${startTime.toFixed(2)}s.`);
                    transport.loop = true;
                    transport.loopStart = 0;
                    const projectLoopEnd = localAppServices.getProjectLoopEnd ? localAppServices.getProjectLoopEnd() : 3600;
                    transport.loopEnd = projectLoopEnd;


                    if (!silentKeepAliveBuffer && Tone.context) {
                        try {
                            silentKeepAliveBuffer = Tone.context.createBuffer(1, 1, Tone.context.sampleRate);
                            const channelData = silentKeepAliveBuffer.getChannelData(0);
                            if (channelData) channelData[0] = 0;
                        } catch (e) { console.error("Error creating silent buffer:", e); silentKeepAliveBuffer = null; }
                    }
                    if (silentKeepAliveBuffer) {
                        transportKeepAliveBufferSource = new Tone.BufferSource(silentKeepAliveBuffer).toDestination();
                        transportKeepAliveBufferSource.loop = true;
                        transportKeepAliveBufferSource.start(Tone.now() + 0.02, 0, transport.loopEnd);
                    }

                    if (tracks) {
                        for (const track of tracks) {
                            if (track && typeof track.schedulePlayback === 'function') {
                                await track.schedulePlayback(startTime, transport.loopEnd);
                            }
                        }
                    }
                    transport.start(Tone.now() + 0.05, startTime);
                    playBtnGlobal.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>`; // Pause Icon
                } else {
                    // console.log(`[EventHandlers Play/Resume] Pausing transport.`);
                    transport.pause();
                    playBtnGlobal.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>`; // Play Icon
                }
            } catch (error) {
                console.error("[EventHandlers Play/Pause] Error:", error);
                showUINotification(`Error during playback: ${error.message}`, 4000);
                if (playBtnGlobal) playBtnGlobal.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>`;
            }
        });
    } else { console.warn("[EventHandlers] playBtnGlobal not found in provided elements."); }

    if (stopBtnGlobal) {
        stopBtnGlobal.addEventListener('click', () => {
            // console.log("[EventHandlers StopAll] Stop All button clicked.");
            if (localAppServices.panicStopAllAudio) {
                localAppServices.panicStopAllAudio();
            } else {
                console.error("[EventHandlers StopAll] panicStopAllAudio service not available.");
                if (typeof Tone !== 'undefined') {
                    Tone.Transport.stop();
                    Tone.Transport.cancel(0);
                }
                const playButton = elements.playBtnGlobal || localAppServices.uiElementsCache?.playBtnGlobal;
                if(playButton) playButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>`;
                showUINotification("Emergency stop executed (minimal).", 2000);
            }
        });
    } else {
        console.warn("[EventHandlers] stopBtnGlobal not found in provided elements.");
    }

    if (recordBtnGlobal) {
        recordBtnGlobal.addEventListener('click', async () => {
            try {
                if (!localAppServices.initAudioContextAndMasterMeter) {
                    console.error("initAudioContextAndMasterMeter service not available.");
                    showUINotification("Audio system error.", 3000); return;
                }
                const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
                if (!audioReady) { showUINotification("Audio context not ready.", 3000); return; }

                const isCurrentlyRec = isTrackRecording();
                const trackToRecordId = getArmedTrackId();
                const trackToRecord = trackToRecordId !== null ? getTrackById(trackToRecordId) : null;

                if (!isCurrentlyRec) {
                    if (!trackToRecord) { showUINotification("No track armed for recording.", 2000); return; }

                    let recordingInitialized = false;
                    if (trackToRecord.type === 'Audio') {
                        if (localAppServices.startAudioRecording) {
                            recordingInitialized = await localAppServices.startAudioRecording(trackToRecord, trackToRecord.isMonitoringEnabled);
                        } else { console.error("[EventHandlers] startAudioRecording service not available."); showUINotification("Recording service unavailable.", 3000); }
                    } else {
                        recordingInitialized = true;
                        showUINotification(`MIDI/Synth recording for "${trackToRecord.name}" armed.`, 2500);
                    }

                    if (recordingInitialized) {
                        setIsRecording(true);
                        setRecordingTrackId(trackToRecord.id);
                        if (Tone.Transport.state !== 'started') { Tone.Transport.cancel(0); Tone.Transport.position = 0; }
                        setRecordingStartTime(Tone.Transport.seconds);
                        if (Tone.Transport.state !== 'started') Tone.Transport.start();

                        if (localAppServices.updateRecordButtonUI) localAppServices.updateRecordButtonUI(true);
                        showUINotification(`Recording started for ${trackToRecord.name}.`, 2000);
                    } else {
                        showUINotification(`Failed to initialize recording for ${trackToRecord.name}.`, 3000);
                    }
                } else {
                    if (localAppServices.stopAudioRecording && getRecordingTrackId() !== null && getTrackById(getRecordingTrackId())?.type === 'Audio') {
                        await localAppServices.stopAudioRecording();
                    }

                    setIsRecording(false);
                    const previouslyRecordingTrackId = getRecordingTrackId();
                    setRecordingTrackId(null);
                    if (localAppServices.updateRecordButtonUI) localAppServices.updateRecordButtonUI(false);
                    const prevTrack = previouslyRecordingTrackId !== null ? getTrackById(previouslyRecordingTrackId) : null;
                    showUINotification(`Recording stopped${prevTrack ? ` for ${prevTrack.name}` : ''}.`, 2000);
                }
            } catch (error) {
                console.error("[EventHandlers Record] Error:", error);
                showUINotification(`Error during recording: ${error.message}`, 4000);
                if (localAppServices.updateRecordButtonUI) localAppServices.updateRecordButtonUI(false);
                setIsRecording(false); setRecordingTrackId(null);
            }
        });
    } else { console.warn("[EventHandlers] recordBtnGlobal not found."); }

    if (tempoGlobalInput) {
        tempoGlobalInput.addEventListener('input', (e) => {
            try {
                const newTempo = parseFloat(e.target.value);
                if (!isNaN(newTempo) && newTempo >= Constants.MIN_TEMPO && newTempo <= Constants.MAX_TEMPO) {
                    if (Tone.Transport.bpm) {
                        Tone.Transport.bpm.value = newTempo;
                    } else {
                        console.warn("Tone.Transport.bpm not available to set tempo.");
                    }
                    if (localAppServices.updateTaskbarTempoDisplay) localAppServices.updateTaskbarTempoDisplay(newTempo);
                }
            } catch (error) { console.error("[EventHandlers Tempo Input] Error:", error); }
        });
        tempoGlobalInput.addEventListener('change', () => {
            if (localAppServices.captureStateForUndo && Tone.Transport.bpm) {
                localAppServices.captureStateForUndo(`Set Tempo to ${Tone.Transport.bpm.value.toFixed(1)}`);
            }
        });
    } else { console.warn("[EventHandlers] tempoGlobalInput not found."); }

    if (midiInputSelectGlobal) {
        midiInputSelectGlobal.addEventListener('change', (e) => {
            if (localAppServices.selectMIDIInput) localAppServices.selectMIDIInput(e.target.value);
            else console.error("[EventHandlers] selectMIDIInput service not available.");
        });
    } else { console.warn("[EventHandlers] midiInputSelectGlobal not found."); }

    if (playbackModeToggleBtnGlobal) {
        playbackModeToggleBtnGlobal.addEventListener('click', () => {
            try {
                const currentGetMode = localAppServices.getPlaybackMode || getPlaybackModeState;
                const currentSetMode = localAppServices.setPlaybackMode || setPlaybackModeState;
                if (currentGetMode && currentSetMode) {
                    const currentMode = currentGetMode();
                    const newMode = currentMode === 'sequencer' ? 'timeline' : 'sequencer';
                    currentSetMode(newMode);
                } else {
                    console.warn("[EventHandlers PlaybackModeToggle] getPlaybackMode or setPlaybackMode service not available.");
                    showUINotification("Playback mode toggle service unavailable.", 3000);
                }
            } catch (error) {
                console.error("[EventHandlers PlaybackModeToggle] Error:", error);
                showUINotification("Error toggling playback mode.", 3000);
            }
        });
    } else { console.warn("[EventHandlers] playbackModeToggleBtnGlobal not found."); }
}

export function setupMIDI() {
    // ... (setupMIDI remains the same)
    const showUINotification = localAppServices.showNotification || showNotification;
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess()
            .then(onMIDISuccess, (err) => onMIDIFailure(err, showUINotification))
            .catch((err) => onMIDIFailure(err, showUINotification));
    } else {
        console.warn("WebMIDI is not supported in this browser.");
        showUINotification("WebMIDI not supported. Cannot use MIDI devices.", 3000);
    }
}

function onMIDISuccess(midiAccess) {
    // ... (onMIDISuccess remains the same)
    const showUINotification = localAppServices.showNotification || showNotification;
    if (localAppServices.setMidiAccess) {
        localAppServices.setMidiAccess(midiAccess);
    } else {
        console.error("[EventHandlers onMIDISuccess] setMidiAccess service not available.");
    }

    const inputs = midiAccess.inputs.values();
    const selectElement = localAppServices.uiElementsCache?.midiInputSelectGlobal;

    if (!selectElement) {
        console.warn("[EventHandlers onMIDISuccess] MIDI input select element not found in UI cache.");
        return;
    }

    const currentSelectedValue = selectElement.value;
    selectElement.innerHTML = '<option value="">No MIDI Input</option>';
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        if (input.value) {
            const option = document.createElement('option');
            option.value = input.value.id;
            option.textContent = input.value.name || `Unknown MIDI Device ${input.value.id.slice(-4)}`;
            selectElement.appendChild(option);
        }
    }

    const activeMIDIId = getActiveMIDIInputState()?.id;
    if (activeMIDIId && Array.from(selectElement.options).some(opt => opt.value === activeMIDIId)) {
        selectElement.value = activeMIDIId;
    } else if (currentSelectedValue && Array.from(selectElement.options).some(opt => opt.value === currentSelectedValue)) {
        selectElement.value = currentSelectedValue;
    }


    midiAccess.onstatechange = (event) => {
        console.log(`[MIDI] State change: ${event.port.name}, State: ${event.port.state}, Type: ${event.port.type}`);
        setupMIDI();
        showUINotification(`MIDI device ${event.port.name} ${event.port.state}.`, 2500);
    };
}

function onMIDIFailure(msg, notifyFn) {
    // ... (onMIDIFailure remains the same)
    console.error(`[MIDI] Failed to get MIDI access - ${msg}`);
    const errorMessage = (typeof msg === 'string') ? msg : (msg.message || 'Unknown error');
    notifyFn(`Failed to access MIDI devices: ${errorMessage}`, 4000);
}

export function selectMIDIInput(deviceId, silent = false) {
    // ... (selectMIDIInput remains the same)
    const showUINotification = localAppServices.showNotification || showNotification;
    try {
        const midi = getMidiAccessState();
        const currentActiveInput = getActiveMIDIInputState();

        if (currentActiveInput && typeof currentActiveInput.close === 'function') {
            currentActiveInput.onmidimessage = null;
            try {
                // MIDIPort does not have a close() method in the Web MIDI API spec.
                // currentActiveInput.close();
            } catch (e) {
                console.warn(`[MIDI] Error "closing" previously active input "${currentActiveInput.name}":`, e.message);
            }
        }

        if (deviceId && midi && midi.inputs) {
            const input = midi.inputs.get(deviceId);
            if (input) {
                input.onmidimessage = handleMIDIMessage; // Assign listener
                if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(input);
                if (!silent) showUINotification(`MIDI Input: ${input.name} selected.`, 2000);
                console.log(`[MIDI] Input selected: ${input.name}`);
            } else {
                if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(null);
                if (!silent) showUINotification("Selected MIDI input not found.", 2000);
                console.warn(`[MIDI] Input with ID ${deviceId} not found.`);
            }
        } else {
            if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(null);
            if (!silent && deviceId !== "" ) showUINotification("MIDI input disconnected.", 2000);
        }
    } catch (error) {
        console.error("[EventHandlers selectMIDIInput] Error:", error);
        if (!silent) showUINotification("Error selecting MIDI input.", 3000);
    }
}

function handleMIDIMessage(message) {
    // ... (handleMIDIMessage remains the same)
    try {
        if (!message || !message.data || message.data.length < 3) {
            console.warn("[EventHandlers handleMIDIMessage] Invalid MIDI message received:", message);
            return;
        }
        const [command, note, velocity] = message.data;
        const armedTrackId = getArmedTrackId();
        const armedTrack = armedTrackId !== null ? getTrackById(armedTrackId) : null;
        const midiIndicator = localAppServices.uiElementsCache?.midiIndicatorGlobal;

        if (midiIndicator) {
            midiIndicator.classList.add('active');
            setTimeout(() => midiIndicator.classList.remove('active'), 100);
        }

        if (!armedTrack) return;

        const instrument = armedTrack.instrument || armedTrack.toneSampler;
        if (!instrument || (typeof instrument.disposed === 'boolean' && instrument.disposed)) {
            return;
        }

        const freqOrNote = Tone.Frequency(note, "midi").toNote();

        if (armedTrack.type === 'Synth' || armedTrack.type === 'InstrumentSampler') {
            if (command === 144 && velocity > 0) {
                if (typeof instrument.triggerAttack === 'function') {
                    instrument.triggerAttack(freqOrNote, Tone.now(), velocity / 127);
                }
            } else if (command === 128 || (command === 144 && velocity === 0)) {
                if (typeof instrument.triggerRelease === 'function') {
                    instrument.triggerRelease(freqOrNote, Tone.now() + 0.01);
                }
            }
        } else if (armedTrack.type === 'DrumSampler' || armedTrack.type === 'Sampler') {
            const padOrSliceIndex = note - (Constants.samplerMIDINoteStart || 36);
            if (padOrSliceIndex >= 0) {
                if (command === 144 && velocity > 0) {
                    if (armedTrack.type === 'DrumSampler' && padOrSliceIndex < (Constants.numDrumSamplerPads || 8)) {
                        if (localAppServices.playDrumSamplerPadPreview) {
                            localAppServices.playDrumSamplerPadPreview(armedTrack.id, padOrSliceIndex, velocity / 127);
                        }
                    } else if (armedTrack.type === 'Sampler' && padOrSliceIndex < (armedTrack.slices?.length || Constants.numSlices || 8)) {
                         if (localAppServices.playSlicePreview) {
                            localAppServices.playSlicePreview(armedTrack.id, padOrSliceIndex, velocity / 127);
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error("[EventHandlers handleMIDIMessage] Error:", error, "Message Data:", message?.data);
    }
}

const keyToMIDIMap = Constants.computerKeySynthMap || {};

document.addEventListener('keydown', (event) => {
    // ... (keydown listener remains the same)
    try {
        if (event.repeat) return;
        const key = event.key.toLowerCase();
        const kbdIndicator = localAppServices.uiElementsCache?.keyboardIndicatorGlobal;

        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
            if (key === 'escape') activeEl.blur();
            return;
        }

        if (event.metaKey || event.ctrlKey) {
            if (key === 'z' && !event.shiftKey) { // MODIFIED: ensure shift-Z is not undo
                if (localAppServices.undoLastAction) localAppServices.undoLastAction();
                event.preventDefault(); return;
            }
            if (key === 'y' || (key === 'z' && event.shiftKey)) {
                 if (localAppServices.redoLastAction) localAppServices.redoLastAction();
                 event.preventDefault(); return;
            }
            return;
        }

        if (key === 'z' && !(event.ctrlKey || event.metaKey)) {
            currentOctaveShift = Math.max(MIN_OCTAVE_SHIFT, currentOctaveShift - 1);
            (localAppServices.showNotification || showNotification)(`Octave: ${currentOctaveShift}`, 1000);
            return;
        }
        if (key === 'x' && !(event.ctrlKey || event.metaKey)) {
            currentOctaveShift = Math.min(MAX_OCTAVE_SHIFT, currentOctaveShift + 1);
            (localAppServices.showNotification || showNotification)(`Octave: ${currentOctaveShift}`, 1000);
            return;
        }

        if (key === ' ' && !(activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA'))) {
            event.preventDefault();
            const playBtn = localAppServices.uiElementsCache?.playBtnGlobal;
            if (playBtn) playBtn.click();
            return;
        }

        const armedTrackId = getArmedTrackId();
        const armedTrack = armedTrackId !== null ? getTrackById(armedTrackId) : null;
        if (!armedTrack) return;

        let targetInstrument;
        if (armedTrack.type === 'Synth') {
            targetInstrument = armedTrack.instrument;
        } else if (armedTrack.type === 'InstrumentSampler') {
            targetInstrument = armedTrack.toneSampler;
            if (targetInstrument && (!targetInstrument.loaded || (typeof targetInstrument.disposed === 'boolean' && targetInstrument.disposed))) {
                return;
            }
        }

        if (!targetInstrument || (typeof targetInstrument.disposed === 'boolean' && targetInstrument.disposed)) return;


        let midiNote = keyToMIDIMap[event.key] ?? keyToMIDIMap[key];

        if (midiNote !== undefined && !currentlyPressedComputerKeys[midiNote]) {
            if (kbdIndicator) kbdIndicator.classList.add('active');

            const finalNote = midiNote + (currentOctaveShift * 12);
            if (finalNote >=0 && finalNote <= 127 && typeof targetInstrument.triggerAttack === 'function') {
                const freq = Tone.Frequency(finalNote, "midi").toNote();
                targetInstrument.triggerAttack(freq, Tone.now(), 0.7);
                currentlyPressedComputerKeys[midiNote] = true;
            }
        }
    } catch (error) { console.error("[EventHandlers Keydown] Error:", error); }
});

document.addEventListener('keyup', (event) => {
    // ... (keyup listener remains the same)
    let armedTrack = null;
    let midiNote = undefined;
    let freq = '';
    let targetInstrumentKeyUp;

    try {
        const key = event.key.toLowerCase();
        const kbdIndicator = localAppServices.uiElementsCache?.keyboardIndicatorGlobal;
        if (kbdIndicator) kbdIndicator.classList.remove('active');

        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
            return;
        }
        if (event.metaKey || event.ctrlKey) return;


        const armedTrackId = getArmedTrackId();
        armedTrack = armedTrackId !== null ? getTrackById(armedTrackId) : null;

        if (armedTrack && armedTrack.type === 'Synth') {
            targetInstrumentKeyUp = armedTrack.instrument;
        } else if (armedTrack && armedTrack.type === 'InstrumentSampler') {
            targetInstrumentKeyUp = armedTrack.toneSampler;
        }

        if (!armedTrack || !targetInstrumentKeyUp || typeof targetInstrumentKeyUp.triggerRelease !== 'function' || (typeof targetInstrumentKeyUp.disposed === 'boolean' && targetInstrumentKeyUp.disposed)) {
            Object.keys(currentlyPressedComputerKeys).forEach(noteKey => delete currentlyPressedComputerKeys[noteKey]);
            return;
        }

        midiNote = keyToMIDIMap[event.key] ?? keyToMIDIMap[key];

        if (midiNote !== undefined && currentlyPressedComputerKeys[midiNote]) {
            const finalNote = midiNote + (currentOctaveShift * 12);
             if (finalNote >=0 && finalNote <= 127) {
                freq = Tone.Frequency(finalNote, "midi").toNote();
                targetInstrumentKeyUp.triggerRelease(freq, Tone.now() + 0.01);
            }
            delete currentlyPressedComputerKeys[midiNote];
        }
    } catch (error) {
        console.error("[EventHandlers Keyup] Error during specific note release:", error,
            "Key:", event.key, "Armed Track ID:", armedTrack ? armedTrack.id : 'N/A',
            "Instrument Type:", armedTrack ? armedTrack.type : 'N/A', "Target Frequency:", freq,
            "Calculated MIDI Note:", midiNote);

        if (armedTrack && targetInstrumentKeyUp && typeof targetInstrumentKeyUp.releaseAll === 'function' && !(typeof targetInstrumentKeyUp.disposed === 'boolean' && targetInstrumentKeyUp.disposed)) {
            try {
                console.warn(`[EventHandlers Keyup] Forcing releaseAll on ${armedTrack.name} (instrument type: ${armedTrack.type}) due to error on keyup for note ${freq || 'unknown'}.`);
                targetInstrumentKeyUp.releaseAll(Tone.now());
            } catch (releaseAllError) {
                console.error("[EventHandlers Keyup] Error during emergency releaseAll:", releaseAllError);
            }
        }
        if (midiNote !== undefined && currentlyPressedComputerKeys[midiNote]) {
            delete currentlyPressedComputerKeys[midiNote];
        }
    }
});

export function handleTrackMute(trackId) {
    // ... (handleTrackMute remains the same)
    try {
        const track = getTrackById(trackId);
        if (!track) { console.warn(`[EventHandlers] Mute: Track ${trackId} not found.`); return; }
        captureStateForUndo(`Toggle Mute for ${track.name}`);
        track.isMuted = !track.isMuted;
        if (typeof track.applyMuteState === 'function') {
            track.applyMuteState();
        } else {
            console.warn(`[EventHandlers Mute] Track ${track.id} does not have applyMuteState method.`);
        }
        if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(trackId, 'muteChanged');
        if (localAppServices.updateMixerWindow) localAppServices.updateMixerWindow();
    } catch (error) { console.error(`[EventHandlers handleTrackMute] Error for track ${trackId}:`, error); }
}

export function handleTrackSolo(trackId) {
    // ... (handleTrackSolo remains the same)
    try {
        const track = getTrackById(trackId);
        if (!track) { console.warn(`[EventHandlers] Solo: Track ${trackId} not found.`); return; }
        const currentSoloed = getSoloedTrackId();
        captureStateForUndo(`Toggle Solo for ${track.name}`);
        setSoloedTrackId(currentSoloed === trackId ? null : trackId);

        const tracks = getTracks();
        if (tracks && Array.isArray(tracks)) {
            tracks.forEach(t => {
                if (t) {
                    t.isSoloed = (t.id === getSoloedTrackId());
                    if (typeof t.applySoloState === 'function') {
                        t.applySoloState();
                    } else {
                        console.warn(`[EventHandlers Solo] Track ${t.id} does not have applySoloState method.`);
                    }
                    if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(t.id, 'soloChanged');
                }
            });
        }
        if (localAppServices.updateMixerWindow) localAppServices.updateMixerWindow();
    } catch (error) { console.error(`[EventHandlers handleTrackSolo] Error for track ${trackId}:`, error); }
}

export function handleTrackArm(trackId) {
    // ... (handleTrackArm remains the same)
    try {
        const track = getTrackById(trackId);
        if (!track) { console.warn(`[EventHandlers] Arm: Track ${trackId} not found.`); return; }
        const currentArmedId = getArmedTrackId();
        const isCurrentlyArmed = currentArmedId === track.id;
        captureStateForUndo(`${isCurrentlyArmed ? "Disarm" : "Arm"} Track "${track.name}" for Input`);
        setArmedTrackId(isCurrentlyArmed ? null : track.id);

        const newArmedTrack = getTrackById(getArmedTrackId());
        const notificationMessage = newArmedTrack ? `${newArmedTrack.name} armed for input.` : "All tracks disarmed.";
        (localAppServices.showNotification || showNotification)(notificationMessage, 1500);

        const tracks = getTracks();
        if (tracks && Array.isArray(tracks)) {
            tracks.forEach(t => {
                if (t && localAppServices.updateTrackUI) localAppServices.updateTrackUI(t.id, 'armChanged');
            });
        }
        if (localAppServices.updateMixerWindow) localAppServices.updateMixerWindow();
    } catch (error) { console.error(`[EventHandlers handleTrackArm] Error for track ${trackId}:`, error); }
}

// MODIFICATION: Added more robust checks and logging for track removal process
export function handleRemoveTrack(trackId) {
    console.log(`[EventHandlers handleRemoveTrack] Attempting to remove track ID: ${trackId}`);
    const showUINotification = localAppServices.showNotification || showNotification;
    try {
        const track = getTrackById(trackId);
        if (!track) {
            console.warn(`[EventHandlers handleRemoveTrack] Track ${trackId} not found.`);
            showUINotification(`Error: Track ${trackId} not found for removal.`, 3000);
            return;
        }

        const confirmDialogFn = localAppServices.showConfirmationDialog || showConfirmationDialog;
        if (typeof confirmDialogFn !== 'function') {
            console.error("[EventHandlers handleRemoveTrack] showConfirmationDialog service not available. Using native confirm.");
            if (confirm(`Are you sure you want to remove track "${track.name}"? This can be undone.`)) {
                if (localAppServices.removeTrack) {
                    localAppServices.removeTrack(trackId);
                } else {
                    console.error("[EventHandlers handleRemoveTrack] removeTrack service not available. Attempting core removal.");
                    coreRemoveTrackFromState(trackId);
                }
            }
            return;
        }

        confirmDialogFn(
            'Confirm Delete Track',
            `Are you sure you want to remove track "${track.name}"? This can be undone.`,
            () => { // onConfirm
                console.log(`[EventHandlers handleRemoveTrack] Confirmation received for track ${trackId}.`);
                if (localAppServices.removeTrack && typeof localAppServices.removeTrack === 'function') {
                    localAppServices.removeTrack(trackId);
                } else {
                    console.error("[EventHandlers handleRemoveTrack] localAppServices.removeTrack service is not available or not a function. Attempting core removal function.");
                    if (typeof coreRemoveTrackFromState === 'function') {
                        coreRemoveTrackFromState(trackId);
                    } else {
                        console.error("[EventHandlers handleRemoveTrack] CRITICAL: coreRemoveTrackFromState is also not available. Track removal failed.");
                        showUINotification(`Critical error: Cannot remove track ${track.name}.`, 4000);
                    }
                }
            },
            () => { // onCancel
                console.log(`[EventHandlers handleRemoveTrack] Track removal cancelled for ID: ${trackId}`);
            }
        );
    } catch (error) {
        console.error(`[EventHandlers handleRemoveTrack] Error initiating removal for track ${trackId}:`, error);
        showUINotification(`Error removing track: ${error.message || 'Unknown error.'}`, 4000);
    }
}


export function handleOpenTrackInspector(trackId) {
    // ... (handleOpenTrackInspector remains the same)
    if (localAppServices.openTrackInspectorWindow) {
        localAppServices.openTrackInspectorWindow(trackId);
    } else { console.error("[EventHandlers] openTrackInspectorWindow service not available."); }
}
export function handleOpenEffectsRack(trackId) {
    // ... (handleOpenEffectsRack remains the same)
    if (localAppServices.openTrackEffectsRackWindow) {
        localAppServices.openTrackEffectsRackWindow(trackId);
    } else { console.error("[EventHandlers] openTrackEffectsRackWindow service not available."); }
}
export function handleOpenSequencer(trackId) {
    // ... (handleOpenSequencer remains the same)
    if (localAppServices.openTrackSequencerWindow) {
        localAppServices.openTrackSequencerWindow(trackId);
    } else { console.error("[EventHandlers] openTrackSequencerWindow service not available."); }
}

function toggleFullScreen() {
    // ... (toggleFullScreen remains the same)
    const showUINotification = localAppServices.showNotification || showNotification;
    try {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                const message = `Error attempting to enable full-screen mode: ${err.message} (${err.name})`;
                showUINotification(message, 3000);
                console.error(message, err);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    } catch (error) {
        console.error("[EventHandlers toggleFullScreen] Error:", error);
        showUINotification("Fullscreen toggle error.", 3000);
    }
}

export async function processTimelineDrop(droppedItemData, targetTrackId, startTime, appServicesPassed) {
    // ... (processTimelineDrop remains the same)
    const services = appServicesPassed || localAppServices;
    const showUINotification = services.showNotification || showNotification;

    if (!services || !services.getTrackById || !services.captureStateForUndo || !services.renderTimeline) {
        console.error("Required appServices not available in processTimelineDrop");
        showUINotification("Internal error handling timeline drop.", 3000);
        return;
    }

    const targetTrack = services.getTrackById(targetTrackId);
    if (!targetTrack) {
        showUINotification("Target track not found for drop.", 3000);
        return;
    }

    try {
        if (droppedItemData) {
            if (droppedItemData.type === 'sequence-timeline-drag') {
                if (targetTrack.type === 'Audio') {
                    showUINotification("Cannot place sequence clips on Audio tracks.", 3000);
                    return;
                }
                if (typeof targetTrack.addSequenceClipToTimeline === 'function') {
                    targetTrack.addSequenceClipToTimeline(droppedItemData.sourceSequenceId, startTime, droppedItemData.clipName);
                } else {
                    showUINotification("Error: Track cannot accept sequence clips.", 3000);
                }
            } else if (droppedItemData.type === 'sound-browser-item') {
                if (targetTrack.type !== 'Audio') {
                    showUINotification("Sound browser audio files can only be dropped onto Audio Track timeline lanes.", 3000);
                    return;
                }
                if (services.getAudioBlobFromSoundBrowserItem && typeof targetTrack.addExternalAudioFileAsClip === 'function') {
                    const audioBlob = await services.getAudioBlobFromSoundBrowserItem(droppedItemData);
                    if (audioBlob) {
                        targetTrack.addExternalAudioFileAsClip(audioBlob, startTime, droppedItemData.fileName);
                    } else {
                        showUINotification(`Could not load audio for "${droppedItemData.fileName}".`, 3000);
                    }
                } else {
                     showUINotification("Error: Cannot process sound browser item for timeline.", 3000);
                }
            } else if (droppedItemData.type === 'timeline-clip-reposition' && droppedItemData.originalClipData) {
                    const originalTrack = services.getTrackById(droppedItemData.originalTrackId);
                    const clipToMove = droppedItemData.originalClipData;

                    if (originalTrack && clipToMove) {
                        if (targetTrack.id === originalTrack.id) {
                            if (typeof targetTrack.updateAudioClipPosition === 'function') {
                                targetTrack.updateAudioClipPosition(clipToMove.id, startTime);
                            } else {
                                console.error(`[TimelineDrop] updateAudioClipPosition method missing on track ${targetTrack.id}`);
                            }
                        } else {
                            if (targetTrack.type === originalTrack.type) {
                                if(services.captureStateForUndo) services.captureStateForUndo(`Move Clip "${clipToMove.name}" to Track "${targetTrack.name}"`);

                                if (typeof originalTrack.removeTimelineClip === 'function') {
                                    originalTrack.removeTimelineClip(clipToMove.id, true);
                                } else {
                                    originalTrack.timelineClips = originalTrack.timelineClips.filter(c => c.id !== clipToMove.id);
                                    console.warn(`[TimelineDrop] removeTimelineClip method missing on track ${originalTrack.id}, fallback used.`);
                                }

                                if (typeof targetTrack.addExistingClipFromOtherTrack === 'function') {
                                    targetTrack.addExistingClipFromOtherTrack(clipToMove, startTime, true);
                                } else {
                                    const newClipInstance = {...JSON.parse(JSON.stringify(clipToMove)), startTime: startTime, id: `clip_${targetTrack.id}_${Date.now()}`};
                                    targetTrack.timelineClips.push(newClipInstance);
                                    console.warn(`[TimelineDrop] addExistingClipFromOtherTrack method missing on track ${targetTrack.id}, fallback used.`);
                                }
                                if (services.renderTimeline) services.renderTimeline();
                            } else {
                                showUINotification(`Cannot move ${originalTrack.type} clip to ${targetTrack.type} track.`, 3000);
                                if (services.renderTimeline) services.renderTimeline();
                            }
                        }
                    } else {
                         showUINotification("Error moving clip: Original clip data or track not found.", 3000);
                    }
            } else {
                console.warn("[EventHandlers processTimelineDrop] Unrecognized item dropped on timeline:", droppedItemData);
                showUINotification("Unrecognized item dropped on timeline.", 2000);
            }
        } else {
            console.log("[EventHandlers processTimelineDrop] No droppedItemData provided.");
        }
    } catch (e) {
        console.error("[EventHandlers processTimelineDrop] Error processing dropped data:", e);
        showUINotification("Error processing dropped item.", 3000);
    }
}
export { processTimelineDrop as handleTimelineLaneDrop };
