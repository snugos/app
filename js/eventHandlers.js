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
    // Ensure playback mode services are available, falling back to direct state functions if needed
    if (!localAppServices.setPlaybackMode && setPlaybackModeState) {
        localAppServices.setPlaybackMode = setPlaybackModeState;
    }
    if (!localAppServices.getPlaybackMode && getPlaybackModeState) {
        localAppServices.getPlaybackMode = getPlaybackModeState;
    }
}

export let currentlyPressedComputerKeys = {};
let currentOctaveShift = 0;
const MIN_OCTAVE_SHIFT = -2;
const MAX_OCTAVE_SHIFT = 2;

export function initializePrimaryEventListeners(appContext) {
    const services = appContext || localAppServices;
    const uiCache = services.uiElementsCache || {};
    console.log('[EventHandlers initializePrimaryEventListeners] Initializing. uiCache keys:', Object.keys(uiCache));

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
            console.warn('[EventHandlers initializePrimaryEventListeners] Start Button (uiCache.startButton) NOT found in uiCache!');
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
                    // { label: "Open Global Controls", action: () => { if(services.openGlobalControlsWindow) services.openGlobalControlsWindow(); } }, // REMOVED
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
             console.warn('[EventHandlers initializePrimaryEventListeners] Desktop element (uiCache.desktop) NOT found in uiCache!');
        }

        const menuActions = {
            menuAddSynthTrack: () => services.addTrack?.('Synth', {_isUserActionPlaceholder: true}),
            menuAddSamplerTrack: () => services.addTrack?.('Sampler', {_isUserActionPlaceholder: true}),
            menuAddDrumSamplerTrack: () => services.addTrack?.('DrumSampler', {_isUserActionPlaceholder: true}),
            menuAddInstrumentSamplerTrack: () => services.addTrack?.('InstrumentSampler', {_isUserActionPlaceholder: true}),
            menuAddAudioTrack: () => services.addTrack?.('Audio', {_isUserActionPlaceholder: true}),
            menuOpenSoundBrowser: () => services.openSoundBrowserWindow?.(),
            menuOpenTimeline: () => services.openTimelineWindow?.(),
            // menuOpenGlobalControls: () => services.openGlobalControlsWindow?.(), // REMOVED
            menuOpenMixer: () => services.openMixerWindow?.(),
            menuOpenMasterEffects: () => services.openMasterEffectsRackWindow?.(),
            menuUndo: () => services.undoLastAction?.(),
            menuRedo: () => services.redoLastAction?.(),
            menuSaveProject: () => services.saveProject?.(),
            menuLoadProject: () => services.loadProject?.(),
            menuExportWav: () => services.exportToWav?.(),
            menuToggleFullScreen: toggleFullScreen,
            // Note: Theme toggle is handled by the top taskbar button in main.js
        };

        for (const menuItemId in menuActions) {
            if (uiCache[menuItemId]) { // uiCache.menuOpenGlobalControls will be null if it was defined
                uiCache[menuItemId].addEventListener('click', () => {
                    menuActions[menuItemId]();
                    if (uiCache.startMenu) uiCache.startMenu.classList.add('hidden');
                });
            } else if (menuItemId !== 'menuOpenGlobalControls') { // Don't warn for the intentionally removed item
                 console.warn(`[EventHandlers] Start Menu item element with ID "${menuItemId}" not found in uiCache.`);
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
            console.warn("[EventHandlers] Load project input (uiCache.loadProjectInput) not found.");
        }

    } catch (error) {
        console.error("[EventHandlers initializePrimaryEventListeners] Error during initialization:", error);
        showNotification("Error setting up primary interactions. Some UI might not work.", 5000);
    }
}

export function attachGlobalControlEvents(elements) {
    if (!elements) {
        console.error("[EventHandlers attachGlobalControlEvents] Elements object is null or undefined.");
        return;
    }
    const { playBtnGlobal, recordBtnGlobal, stopBtnGlobal, tempoGlobalInput, midiInputSelectGlobal, playbackModeToggleBtnGlobal } = elements;

    if (playBtnGlobal) {
        playBtnGlobal.addEventListener('click', async () => {
            try {
                if (!localAppServices.initAudioContextAndMasterMeter) {
                    console.error("initAudioContextAndMasterMeter service not available.");
                    showNotification("Audio system error.", 3000); return;
                }
                const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
                if (!audioReady) {
                    showNotification("Audio context not ready. Please interact with the page.", 3000);
                    return;
                }

                const transport = Tone.Transport;
                console.log(`[EventHandlers Play/Resume] Clicked. Transport state: ${transport.state}, time: ${transport.seconds.toFixed(2)}`);

                const tracks = getTracks();
                tracks.forEach(track => { if (typeof track.stopPlayback === 'function') track.stopPlayback(); });
                transport.cancel(0);

                if (transportKeepAliveBufferSource && !transportKeepAliveBufferSource.disposed) {
                    try { transportKeepAliveBufferSource.stop(0); transportKeepAliveBufferSource.dispose(); } catch (e) {}
                    transportKeepAliveBufferSource = null;
                }

                if (transport.state === 'stopped' || transport.state === 'paused') {
                    const wasPaused = transport.state === 'paused';
                    const startTime = wasPaused ? transport.seconds : 0;
                    if (!wasPaused) transport.position = 0;

                    console.log(`[EventHandlers Play/Resume] Starting/Resuming from ${startTime.toFixed(2)}s.`);
                    transport.loop = true;
                    transport.loopStart = 0;
                    transport.loopEnd = 3600;

                    if (!silentKeepAliveBuffer && Tone.context) {
                        try {
                            silentKeepAliveBuffer = Tone.context.createBuffer(1, 1, Tone.context.sampleRate);
                            silentKeepAliveBuffer.getChannelData(0)[0] = 0;
                        } catch (e) { console.error("Error creating silent buffer:", e); silentKeepAliveBuffer = null; }
                    }
                    if (silentKeepAliveBuffer) {
                        transportKeepAliveBufferSource = new Tone.BufferSource(silentKeepAliveBuffer).toDestination();
                        transportKeepAliveBufferSource.loop = true;
                        transportKeepAliveBufferSource.start(Tone.now() + 0.02, 0, transport.loopEnd);
                    }

                    for (const track of tracks) {
                        if (typeof track.schedulePlayback === 'function') {
                            await track.schedulePlayback(startTime, transport.loopEnd);
                        }
                    }
                    transport.start(Tone.now() + 0.05, startTime);
                    playBtnGlobal.textContent = 'Pause';
                } else {
                    console.log(`[EventHandlers Play/Resume] Pausing transport.`);
                    transport.pause();
                    playBtnGlobal.textContent = 'Play';
                }
            } catch (error) {
                console.error("[EventHandlers Play/Pause] Error:", error);
                showNotification(`Error during playback: ${error.message}`, 4000);
                if (playBtnGlobal) playBtnGlobal.textContent = 'Play';
            }
        });
    } else { console.warn("[EventHandlers] playBtnGlobal (for top taskbar) not found in provided elements."); }

    if (stopBtnGlobal) {
        stopBtnGlobal.addEventListener('click', () => {
            console.log("[EventHandlers StopAll] Stop All button clicked.");
            if (localAppServices.panicStopAllAudio) {
                localAppServices.panicStopAllAudio();
            } else {
                console.error("[EventHandlers StopAll] panicStopAllAudio service not available.");
                if (typeof Tone !== 'undefined') {
                    Tone.Transport.stop();
                    Tone.Transport.cancel(0);
                }
                const playButton = localAppServices.uiElementsCache?.playBtnGlobal;
                if(playButton) playButton.textContent = 'Play';
                showNotification("Emergency stop executed (minimal).", 2000);
            }
        });
    } else {
        console.warn("[EventHandlers] stopBtnGlobal (for top taskbar) not found in provided elements.");
    }

    if (recordBtnGlobal) {
        recordBtnGlobal.addEventListener('click', async () => {
            try {
                if (!localAppServices.initAudioContextAndMasterMeter) {
                    console.error("initAudioContextAndMasterMeter service not available.");
                    showNotification("Audio system error.", 3000); return;
                }
                const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
                if (!audioReady) { showNotification("Audio context not ready.", 3000); return; }

                const isCurrentlyRec = isTrackRecording();
                const trackToRecordId = getArmedTrackId();
                const trackToRecord = trackToRecordId !== null ? getTrackById(trackToRecordId) : null;

                if (!isCurrentlyRec) {
                    if (!trackToRecord) { showNotification("No track armed for recording.", 2000); return; }
                    let recordingInitialized = false;
                    if (trackToRecord.type === 'Audio') {
                        if (localAppServices.startAudioRecording) {
                            recordingInitialized = await localAppServices.startAudioRecording(trackToRecord, trackToRecord.isMonitoringEnabled);
                        } else { console.error("[EventHandlers] startAudioRecording service not available."); showNotification("Recording service unavailable.", 3000); }
                    } else { recordingInitialized = true; }

                    if (recordingInitialized) {
                        setIsRecording(true);
                        setRecordingTrackId(trackToRecord.id);
                        if (Tone.Transport.state !== 'started') { Tone.Transport.cancel(0); Tone.Transport.position = 0; }
                        setRecordingStartTime(Tone.Transport.seconds);
                        if (Tone.Transport.state !== 'started') Tone.Transport.start();
                        if (localAppServices.updateRecordButtonUI) localAppServices.updateRecordButtonUI(true);
                        showNotification(`Recording started for ${trackToRecord.name}.`, 2000);
                    } else { showNotification(`Failed to initialize recording for ${trackToRecord.name}.`, 3000); }
                } else {
                    if (localAppServices.stopAudioRecording && getRecordingTrackId() !== null && getTrackById(getRecordingTrackId())?.type === 'Audio') {
                        await localAppServices.stopAudioRecording();
                    }
                    setIsRecording(false);
                    const previouslyRecordingTrackId = getRecordingTrackId();
                    setRecordingTrackId(null);
                    if (localAppServices.updateRecordButtonUI) localAppServices.updateRecordButtonUI(false);
                    const prevTrack = previouslyRecordingTrackId !== null ? getTrackById(previouslyRecordingTrackId) : null;
                    showNotification(`Recording stopped${prevTrack ? ` for ${prevTrack.name}` : ''}.`, 2000);
                }
            } catch (error) {
                console.error("[EventHandlers Record] Error:", error);
                showNotification(`Error during recording: ${error.message}`, 4000);
                if (localAppServices.updateRecordButtonUI) localAppServices.updateRecordButtonUI(false);
                setIsRecording(false); setRecordingTrackId(null);
            }
        });
    } else { console.warn("[EventHandlers] recordBtnGlobal (for top taskbar) not found."); }

    if (tempoGlobalInput) {
        tempoGlobalInput.addEventListener('input', (e) => {
            try {
                const newTempo = parseFloat(e.target.value);
                if (!isNaN(newTempo) && newTempo >= Constants.MIN_TEMPO && newTempo <= Constants.MAX_TEMPO) {
                    Tone.Transport.bpm.value = newTempo;
                    if (localAppServices.updateTaskbarTempoDisplay) {
                        localAppServices.updateTaskbarTempoDisplay(newTempo);
                    }
                }
            } catch (error) { console.error("[EventHandlers Tempo Input] Error:", error); }
        });
        tempoGlobalInput.addEventListener('change', () => {
            if (localAppServices.captureStateForUndo) {
                localAppServices.captureStateForUndo(`Set Tempo to ${Tone.Transport.bpm.value.toFixed(1)}`);
            }
        });
    } else { console.warn("[EventHandlers] tempoGlobalInput (for top taskbar) not found."); }

    if (midiInputSelectGlobal) {
        midiInputSelectGlobal.addEventListener('change', (e) => {
            if (localAppServices.selectMIDIInput) localAppServices.selectMIDIInput(e.target.value);
            else console.error("[EventHandlers] selectMIDIInput service not available.");
        });
    } else { console.warn("[EventHandlers] midiInputSelectGlobal (for top taskbar) not found."); }

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
                }
            } catch (error) { console.error("[EventHandlers PlaybackModeToggle] Error:", error); }
        });
    } else { console.warn("[EventHandlers] playbackModeToggleBtnGlobal (for top taskbar) not found."); }
}

export function setupMIDI() {
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess()
            .then(onMIDISuccess, onMIDIFailure)
            .catch(onMIDIFailure);
    } else {
        console.warn("WebMIDI is not supported in this browser.");
        showNotification("WebMIDI not supported. Cannot use MIDI devices.", 3000);
    }
}

function onMIDISuccess(midiAccess) {
    if (localAppServices.setMidiAccess) {
        localAppServices.setMidiAccess(midiAccess);
    } else {
        console.error("[EventHandlers onMIDISuccess] setMidiAccess service not available.");
    }

    const inputs = midiAccess.inputs.values();
    const selectElement = localAppServices.uiElementsCache?.midiInputSelectGlobal;

    if (!selectElement) {
        console.warn("[EventHandlers onMIDISuccess] MIDI input select element (midiInputSelectGlobal) not found in UI cache.");
        return;
    }

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
    if (activeMIDIId) {
        selectElement.value = activeMIDIId;
    }

    midiAccess.onstatechange = (event) => {
        console.log(`[MIDI] State change: ${event.port.name}, State: ${event.port.state}, Type: ${event.port.type}`);
        setupMIDI();
        if (localAppServices.showNotification) {
            localAppServices.showNotification(`MIDI device ${event.port.name} ${event.port.state}.`, 2500);
        }
    };
}

function onMIDIFailure(msg) {
    console.error(`[MIDI] Failed to get MIDI access - ${msg}`);
    showNotification(`Failed to access MIDI devices: ${msg.toString()}`, 4000);
}

export function selectMIDIInput(deviceId, silent = false) {
    try {
        const midi = getMidiAccessState();
        const currentActiveInput = getActiveMIDIInputState();

        if (currentActiveInput && typeof currentActiveInput.close === 'function') {
            currentActiveInput.onmidimessage = null;
            try {
                currentActiveInput.close();
            } catch (e) {
                console.warn(`[MIDI] Error closing previously active input "${currentActiveInput.name}":`, e.message);
            }
        }

        if (deviceId && midi && midi.inputs) {
            const input = midi.inputs.get(deviceId);
            if (input) {
                input.open().then((port) => {
                    port.onmidimessage = handleMIDIMessage;
                    if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(port);
                    if (!silent && localAppServices.showNotification) localAppServices.showNotification(`MIDI Input: ${port.name} selected.`, 2000);
                    console.log(`[MIDI] Input selected: ${port.name}`);
                }).catch(err => {
                    console.error(`[MIDI] Error opening port ${input.name}:`, err);
                    if (!silent && localAppServices.showNotification) localAppServices.showNotification(`Error opening MIDI port: ${input.name}`, 3000);
                    if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(null);
                });
            } else {
                if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(null);
                if (!silent && localAppServices.showNotification) localAppServices.showNotification("Selected MIDI input not found.", 2000);
                console.warn(`[MIDI] Input with ID ${deviceId} not found.`);
            }
        } else {
            if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(null);
            if (!silent && deviceId !== "" && localAppServices.showNotification) showNotification("MIDI input disconnected.", 2000);
        }
    } catch (error) {
        console.error("[EventHandlers selectMIDIInput] Error:", error);
        if (!silent && localAppServices.showNotification) showNotification("Error selecting MIDI input.", 3000);
    }
}

function handleMIDIMessage(message) {
    try {
        const [command, note, velocity] = message.data;
        const armedTrackId = getArmedTrackId();
        const armedTrack = armedTrackId !== null ? getTrackById(armedTrackId) : null;
        const midiIndicator = localAppServices.uiElementsCache?.midiIndicatorGlobal;

        if (midiIndicator) {
            midiIndicator.classList.add('active');
            setTimeout(() => midiIndicator.classList.remove('active'), 100);
        }

        if (!armedTrack) return;

        const freqOrNote = Tone.Frequency(note, "midi").toNote();

        if (armedTrack.type === 'Synth') {
            if (!armedTrack.instrument || armedTrack.instrument.disposed) return;
            if (command === 144 && velocity > 0) {
                if (typeof armedTrack.instrument.triggerAttack === 'function') {
                    armedTrack.instrument.triggerAttack(freqOrNote, Tone.now(), velocity / 127);
                }
            } else if (command === 128 || (command === 144 && velocity === 0)) {
                if (typeof armedTrack.instrument.triggerRelease === 'function') {
                    armedTrack.instrument.triggerRelease(freqOrNote, Tone.now() + 0.05);
                }
            }
        } else if (armedTrack.type === 'InstrumentSampler') {
            if (!armedTrack.toneSampler || armedTrack.toneSampler.disposed || !armedTrack.toneSampler.loaded) {
                return;
            }
            if (command === 144 && velocity > 0) {
                armedTrack.toneSampler.triggerAttack(freqOrNote, Tone.now(), velocity / 127);
            } else if (command === 128 || (command === 144 && velocity === 0)) {
                armedTrack.toneSampler.triggerRelease(freqOrNote, Tone.now() + 0.05);
            }
        }
    } catch (error) {
        console.error("[EventHandlers handleMIDIMessage] Error:", error, "Message Data:", message?.data);
    }
}

const keyToMIDIMap = Constants.computerKeySynthMap || {
    'a': 48, 'w': 49, 's': 50, 'e': 51, 'd': 52, 'f': 53, 't': 54, 'g': 55, 'y': 56, 'h': 57, 'u': 58, 'j': 59, 'k': 60
};

document.addEventListener('keydown', (event) => {
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
            if (!( (event.ctrlKey || event.metaKey) && (key === 'z' || key === 'y'))) {
                 return;
            }
        }

        if (key === 'z' && (event.ctrlKey || event.metaKey)) {
            if (localAppServices.undoLastAction) localAppServices.undoLastAction();
            return;
        }
        if (key === 'y' && (event.ctrlKey || event.metaKey)) {
             if (localAppServices.redoLastAction) localAppServices.redoLastAction();
            return;
        }
        if (key === 'z' && !(event.ctrlKey || event.metaKey)) {
            currentOctaveShift = Math.max(MIN_OCTAVE_SHIFT, currentOctaveShift - 1);
            if (localAppServices.showNotification) localAppServices.showNotification(`Octave: ${currentOctaveShift}`, 1000);
            return;
        }
        if (key === 'x' && !(event.ctrlKey || event.metaKey)) {
            currentOctaveShift = Math.min(MAX_OCTAVE_SHIFT, currentOctaveShift + 1);
            if (localAppServices.showNotification) localAppServices.showNotification(`Octave: ${currentOctaveShift}`, 1000);
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
            if (targetInstrument && !targetInstrument.loaded) {
                return;
            }
        }

        if (!targetInstrument || targetInstrument.disposed) return;

        let midiNote = keyToMIDIMap[event.key];
        if (midiNote === undefined && keyToMIDIMap[key]) midiNote = keyToMIDIMap[key];

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
    let armedTrack = null;
    let midiNote = undefined;
    let freq = '';
    let targetInstrumentKeyUp;

    try {
        const key = event.key.toLowerCase();
        const kbdIndicator = localAppServices.uiElementsCache?.keyboardIndicatorGlobal;
        if (kbdIndicator) kbdIndicator.classList.remove('active');

        const armedTrackId = getArmedTrackId();
        armedTrack = armedTrackId !== null ? getTrackById(armedTrackId) : null;

        if (armedTrack && armedTrack.type === 'Synth') {
            targetInstrumentKeyUp = armedTrack.instrument;
        } else if (armedTrack && armedTrack.type === 'InstrumentSampler') {
            targetInstrumentKeyUp = armedTrack.toneSampler;
        }

        if (!armedTrack || !targetInstrumentKeyUp || typeof targetInstrumentKeyUp.triggerRelease !== 'function' || targetInstrumentKeyUp.disposed) {
            Object.keys(currentlyPressedComputerKeys).forEach(noteKey => delete currentlyPressedComputerKeys[noteKey]);
            return;
        }

        midiNote = keyToMIDIMap[event.key];
        if (midiNote === undefined && keyToMIDIMap[key]) midiNote = keyToMIDIMap[key];

        if (midiNote !== undefined && currentlyPressedComputerKeys[midiNote]) {
            const finalNote = midiNote + (currentOctaveShift * 12);
             if (finalNote >=0 && finalNote <= 127) {
                freq = Tone.Frequency(finalNote, "midi").toNote();
                targetInstrumentKeyUp.triggerRelease(freq, Tone.now());
            }
            delete currentlyPressedComputerKeys[midiNote];
        }
    } catch (error) {
        console.error("[EventHandlers Keyup] Error during specific note release:", error,
            "Key:", event.key,
            "Armed Track ID:", armedTrack ? armedTrack.id : 'N/A',
            "Instrument Type:", armedTrack ? armedTrack.type : 'N/A',
            "Target Frequency:", freq,
            "Calculated MIDI Note:", midiNote
        );

        if (armedTrack && targetInstrumentKeyUp && typeof targetInstrumentKeyUp.releaseAll === 'function' && !targetInstrumentKeyUp.disposed) {
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

// --- Track Control Handlers ---
export function handleTrackMute(trackId) { /* ... (no change) ... */ }
export function handleTrackSolo(trackId) { /* ... (no change) ... */ }
export function handleTrackArm(trackId) { /* ... (no change) ... */ }
export function handleRemoveTrack(trackId) { /* ... (no change) ... */ }

// --- Window Opening Handlers ---
export function handleOpenTrackInspector(trackId) { /* ... (no change) ... */ }
export function handleOpenEffectsRack(trackId) { /* ... (no change) ... */ }
export function handleOpenSequencer(trackId) { /* ... (no change) ... */ }

// --- Fullscreen ---
function toggleFullScreen() { /* ... (no change) ... */ }

// --- Timeline Drop Handler ---
export async function handleTimelineLaneDrop(event, targetTrackId, startTime, appServicesPassed) { /* ... (no change) ... */ }

