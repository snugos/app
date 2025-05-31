// js/eventHandlers.js - Global Event Listeners and Input Handling Module
import * as Constants from './constants.js'; //
import { showNotification, showConfirmationDialog, createContextMenu } from './utils.js';  //
import {
    getTracksState as getTracks,
    getTrackByIdState as getTrackById,
    captureStateForUndoInternal as captureStateForUndo,
    setSoloedTrackIdState as setSoloedTrackId,
    getSoloedTrackIdState as getSoloedTrackId,
    setArmedTrackIdState as setArmedTrackId,
    getArmedTrackIdState as getArmedTrackId,
    setActiveSequencerTrackIdState as setActiveSequencerTrackId,
    getActiveSequencerTrackIdState as getActiveSequencerTrackId,
    setIsRecordingState as setIsRecording,
    isTrackRecordingState as isTrackRecording,
    setRecordingTrackIdState as setRecordingTrackId,
    getRecordingTrackIdState as getRecordingTrackId,
    setRecordingStartTimeState as setRecordingStartTime,
    removeTrackFromStateInternal as coreRemoveTrackFromState,
    getPlaybackModeState,
    setPlaybackModeState
} from './state.js'; //

let localAppServices = {};

export function initializeEventHandlersModule(appServicesFromMain) {
    localAppServices = { ...localAppServices, ...appServicesFromMain };
}

export let currentlyPressedComputerKeys = {};
let currentOctaveShift = 0;
const MIN_OCTAVE_SHIFT = -2; //
const MAX_OCTAVE_SHIFT = 2; //

export function initializePrimaryEventListeners(appContext) {
    const uiCache = appContext.uiElementsCache || {};
    console.log('[EventHandlers initializePrimaryEventListeners] Initializing. uiCache available:', !!uiCache);


    try {
        if (uiCache.startButton) {
            console.log('[EventHandlers initializePrimaryEventListeners] Start Button found in uiCache. Attaching listener.'); //
            uiCache.startButton.addEventListener('click', (e) => {
                console.log('[EventHandlers] Start Button clicked.');  //
                e.stopPropagation();
                if (uiCache.startMenu) {
                    console.log(`[EventHandlers] Start Menu found. Current classes before toggle: '${uiCache.startMenu.className}'`);  //
                    uiCache.startMenu.classList.toggle('hidden'); // MODIFIED LINE
                    console.log(`[EventHandlers] Start Menu after toggle. New classes: '${uiCache.startMenu.className}'`);  //
                } else {
                    console.error('[EventHandlers] Start Menu (uiCache.startMenu) not found when Start Button clicked!');  //
                }
            });
        } else {
            console.error('[EventHandlers initializePrimaryEventListeners] Start Button (uiCache.startButton) NOT found in uiCache!'); //
        }

        if (uiCache.desktop) {
            uiCache.desktop.addEventListener('click', () => {
                if (uiCache.startMenu && !uiCache.startMenu.classList.contains('hidden')) { // MODIFIED CONDITION
                    console.log('[EventHandlers] Desktop clicked, closing Start Menu.'); //
                    uiCache.startMenu.classList.add('hidden'); // MODIFIED LINE
                }
                const activeContextMenu = document.querySelector('.context-menu'); // Use class selector
                if (activeContextMenu) {
                    console.log('[EventHandlers] Desktop clicked, closing active context menu.'); //
                    activeContextMenu.remove();
                }
            });
        } else {
             console.error('[EventHandlers initializePrimaryEventListeners] Desktop element (uiCache.desktop) NOT found in uiCache!'); //
        }

        if (uiCache.desktop) {
            uiCache.desktop.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                console.log('[EventHandlers] Desktop context menu triggered.'); //
                const menuItems = [
                    { label: "Add Synth Track", action: () => { if(localAppServices.addTrack) localAppServices.addTrack('Synth', {_isUserActionPlaceholder: true}); } }, //
                    { label: "Add Slicer Sampler Track", action: () => { if(localAppServices.addTrack) localAppServices.addTrack('Sampler', {_isUserActionPlaceholder: true}); } }, //
                    { label: "Add Sampler (Pads)", action: () => { if(localAppServices.addTrack) localAppServices.addTrack('DrumSampler', {_isUserActionPlaceholder: true}); } }, //
                    { label: "Add Instrument Sampler Track", action: () => { if(localAppServices.addTrack) localAppServices.addTrack('InstrumentSampler', {_isUserActionPlaceholder: true}); } }, //
                    { label: "Add Audio Track", action: () => { if(localAppServices.addTrack) localAppServices.addTrack('Audio', {_isUserActionPlaceholder: true}); } }, //
                    { separator: true }, //
                    { label: "Open Sound Browser", action: () => { if(localAppServices.openSoundBrowserWindow) localAppServices.openSoundBrowserWindow(); } }, //
                    { label: "Open Timeline", action: () => { if(localAppServices.openTimelineWindow) localAppServices.openTimelineWindow(); } }, //
                    { label: "Open Global Controls", action: () => { if(localAppServices.openGlobalControlsWindow) localAppServices.openGlobalControlsWindow(); } }, //
                    { label: "Open Mixer", action: () => { if(localAppServices.openMixerWindow) localAppServices.openMixerWindow(); } }, //
                    { label: "Open Master Effects", action: () => { if(localAppServices.openMasterEffectsRackWindow) localAppServices.openMasterEffectsRackWindow(); } }, //
                    { separator: true }, //
                    { label: "Upload Custom Background", action: () => { if(localAppServices.triggerCustomBackgroundUpload) localAppServices.triggerCustomBackgroundUpload(); } }, //
                    { label: "Remove Custom Background", action: () => { if(localAppServices.removeCustomDesktopBackground) localAppServices.removeCustomDesktopBackground(); } }, //
                    { separator: true }, //
                    { label: "Toggle Full Screen", action: toggleFullScreen } //
                ];
                createContextMenu(e, menuItems, localAppServices); // Pass appServices for z-index
            });
        }


        uiCache.menuAddSynthTrack?.addEventListener('click', () => { if(localAppServices.addTrack) localAppServices.addTrack('Synth', {_isUserActionPlaceholder: true}); uiCache.startMenu.classList.add('hidden'); }); //
        uiCache.menuAddSamplerTrack?.addEventListener('click', () => { if(localAppServices.addTrack) localAppServices.addTrack('Sampler', {_isUserActionPlaceholder: true}); uiCache.startMenu.classList.add('hidden'); }); //
        uiCache.menuAddDrumSamplerTrack?.addEventListener('click', () => { if(localAppServices.addTrack) localAppServices.addTrack('DrumSampler', {_isUserActionPlaceholder: true}); uiCache.startMenu.classList.add('hidden'); }); //
        uiCache.menuAddInstrumentSamplerTrack?.addEventListener('click', () => { if(localAppServices.addTrack) localAppServices.addTrack('InstrumentSampler', {_isUserActionPlaceholder: true}); uiCache.startMenu.classList.add('hidden'); }); //
        uiCache.menuAddAudioTrack?.addEventListener('click', () => { if(localAppServices.addTrack) localAppServices.addTrack('Audio', {_isUserActionPlaceholder: true}); uiCache.startMenu.classList.add('hidden'); }); //

        uiCache.menuOpenSoundBrowser?.addEventListener('click', () => { if(localAppServices.openSoundBrowserWindow) localAppServices.openSoundBrowserWindow(); uiCache.startMenu.classList.add('hidden'); }); //
        uiCache.menuOpenTimeline?.addEventListener('click', () => { if(localAppServices.openTimelineWindow) localAppServices.openTimelineWindow(); uiCache.startMenu.classList.add('hidden'); }); //
        uiCache.menuOpenGlobalControls?.addEventListener('click', () => { if(localAppServices.openGlobalControlsWindow) localAppServices.openGlobalControlsWindow(); uiCache.startMenu.classList.add('hidden'); }); //
        uiCache.menuOpenMixer?.addEventListener('click', () => { if(localAppServices.openMixerWindow) localAppServices.openMixerWindow(); uiCache.startMenu.classList.add('hidden'); }); //
        uiCache.menuOpenMasterEffects?.addEventListener('click', () => { if(localAppServices.openMasterEffectsRackWindow) localAppServices.openMasterEffectsRackWindow(); uiCache.startMenu.classList.add('hidden'); }); //

        uiCache.menuUndo?.addEventListener('click', () => { if(localAppServices.undoLastAction) localAppServices.undoLastAction(); uiCache.startMenu.classList.add('hidden'); }); //
        uiCache.menuRedo?.addEventListener('click', () => { if(localAppServices.redoLastAction) localAppServices.redoLastAction(); uiCache.startMenu.classList.add('hidden'); }); //

        uiCache.menuSaveProject?.addEventListener('click', () => { if(localAppServices.saveProject) localAppServices.saveProject(); uiCache.startMenu.classList.add('hidden'); }); //
        uiCache.menuLoadProject?.addEventListener('click', () => { if(localAppServices.loadProject) localAppServices.loadProject(); uiCache.startMenu.classList.add('hidden'); }); //
        uiCache.menuExportWav?.addEventListener('click', () => { if(localAppServices.exportToWav) localAppServices.exportToWav(); uiCache.startMenu.classList.add('hidden'); }); //

        uiCache.menuToggleFullScreen?.addEventListener('click', () => { toggleFullScreen(); uiCache.startMenu.classList.add('hidden'); }); //

        if (uiCache.loadProjectInput) {
            uiCache.loadProjectInput.addEventListener('change', (e) => {
                if (localAppServices.handleProjectFileLoad) {
                    localAppServices.handleProjectFileLoad(e);
                }
            });
        }

    } catch (error) {
        console.error("[EventHandlers] Error in initializePrimaryEventListeners:", error); //
    }
}

export function attachGlobalControlEvents(elements) {
    const { playBtnGlobal, recordBtnGlobal, tempoGlobalInput, midiInputSelectGlobal, playbackModeToggleBtnGlobal } = elements; //

    if (playBtnGlobal) {
        playBtnGlobal.addEventListener('click', async () => {
            const audioReady = await localAppServices.initAudioContextAndMasterMeter(true); //
            if (!audioReady) return;

            const transport = Tone.Transport; //
            const currentTransportTime = transport.seconds; //
            console.log(`[EventHandlers Play/Resume] Clicked. Current transport state: ${transport.state}, current time: ${currentTransportTime}`); //

            // Stop all tracks first to clear their scheduled events or stop pattern players
            const tracks = getTracks(); //
            console.log(`[EventHandlers Play/Resume] Stopping playback for ${tracks.length} tracks before rescheduling.`); //
            tracks.forEach(track => {
                if (typeof track.stopPlayback === 'function') {
                    track.stopPlayback();
                }
            });
            transport.cancel(0); // Clear any globally scheduled Tone.Transport events //
            console.log(`[EventHandlers Play/Resume] Called Tone.Transport.cancel(0).`); //

            if (transport.state === 'stopped' || transport.state === 'paused') { //
                let startTime = 0; //
                if (transport.state === 'paused') { //
                    startTime = currentTransportTime; // Resume from where it was paused //
                } else { // Was stopped
                    transport.position = 0; // Ensure starting from the beginning if fully stopped //
                }
                console.log(`[EventHandlers Play/Resume] Starting/Resuming transport from ${startTime}s.`); //

                // >>> MODIFICATION START <<<
                // Explicitly set loop properties to keep the transport running
                transport.loopStart = 0;
                transport.loopEnd = 3600; // Loop for a very long time (1 hour)
                transport.loop = true;
                console.log(`[EventHandlers Play/Resume] Explicitly SET transport loop: ${transport.loop}, loopStart: ${transport.loopStart}, loopEnd: ${transport.loopEnd}`);
                // >>> MODIFICATION END <<<

                console.log(`[EventHandlers Play/Resume] Scheduling ${tracks.length} tracks for playback from ${startTime}.`); //
                for (const track of tracks) {
                    if (typeof track.schedulePlayback === 'function') {
                        // schedulePlayback in Track.js will now handle mode-specific logic
                        // Pass the transport's loopEnd to ensure tracks schedule within this boundary if needed
                        await track.schedulePlayback(startTime, transport.loopEnd);
                    }
                }
                // >>> ADDED LOGGING BEFORE START <<<
                console.log(`[EventHandlers Play/Resume] BEFORE transport.start - Loop: ${transport.loop}, LoopStart: ${transport.loopStart}, LoopEnd: ${transport.loopEnd}, Position: ${transport.position}, State: ${transport.state}`);
                transport.start(Tone.now() + 0.05, startTime); // Start with a slight delay from the specified time //
                playBtnGlobal.textContent = 'Pause'; //
            } else { // 'started'
                console.log(`[EventHandlers Play/Resume] Pausing transport.`); //
                transport.pause(); //
                // When pausing, we want the loop settings to remain for the next play.
                playBtnGlobal.textContent = 'Play'; //
            }
            // >>> ADDED LOGGING AFTER START/PAUSE <<<
            console.log(`[EventHandlers Play/Resume] AFTER transport.start/pause - Loop: ${transport.loop}, LoopStart: ${transport.loopStart}, LoopEnd: ${transport.loopEnd}, Position: ${transport.position}, State: ${transport.state}`);
        });
    }

    if (recordBtnGlobal) {
        recordBtnGlobal.addEventListener('click', async () => {
            console.log("[EventHandlers] Record button clicked."); //
            const audioReady = await localAppServices.initAudioContextAndMasterMeter(true); //
            if (!audioReady) return;

            const isCurrentlyRec = isTrackRecording(); //
            const trackToRecordId = getArmedTrackId(); //
            const trackToRecord = trackToRecordId !== null ? getTrackById(trackToRecordId) : null; //

            if (!isCurrentlyRec) {
                console.log("[EventHandlers] Attempting to start recording."); //
                if (!trackToRecord) {
                    showNotification("No track armed for recording.", 2000); //
                    return;
                }
                console.log(`[EventHandlers] Armed track: ${trackToRecord.name}, Type: ${trackToRecord.type}`); //

                let recordingInitialized = false; //
                if (trackToRecord.type === 'Audio') { //
                    if (localAppServices.startAudioRecording) {
                        recordingInitialized = await localAppServices.startAudioRecording(trackToRecord, trackToRecord.isMonitoringEnabled); //
                    } else {
                        console.error("[EventHandlers] startAudioRecording service not available."); //
                    }
                } else {
                    console.log("[EventHandlers] Non-audio track, setting recordingInitialized to true."); //
                    recordingInitialized = true;
                }

                if (recordingInitialized) {
                    console.log("[EventHandlers] Recording initialized successfully. Setting state."); //
                    setIsRecording(true); //
                    setRecordingTrackId(trackToRecord.id); //
                    if (Tone.Transport.state !== 'started') { //
                        console.log("[EventHandlers] Transport not started, resetting position to 0."); //
                        Tone.Transport.cancel(0);  //
                        Tone.Transport.position = 0;  //
                    }
                    setRecordingStartTime(Tone.Transport.seconds); //
                    console.log(`[EventHandlers] Recording start time set to: ${Tone.Transport.seconds}`); //

                    if (Tone.Transport.state !== 'started') { //
                        console.log("[EventHandlers] Starting transport for recording."); //
                        Tone.Transport.start(); //
                    }
                    if (localAppServices.updateRecordButtonUI) localAppServices.updateRecordButtonUI(true); //
                } else {
                    console.warn("[EventHandlers] Recording initialization failed."); //
                }

            } else {
                console.log("[EventHandlers] Attempting to stop recording."); //
                if (localAppServices.stopAudioRecording && getRecordingTrackId() !== null && getTrackById(getRecordingTrackId())?.type === 'Audio') { //
                    await localAppServices.stopAudioRecording(); //
                }
                setIsRecording(false); //
                setRecordingTrackId(null); //
                if (localAppServices.updateRecordButtonUI) localAppServices.updateRecordButtonUI(false); //
                console.log("[EventHandlers] Recording stopped and state reset."); //
            }
        });
    }

    if (tempoGlobalInput) {
        tempoGlobalInput.addEventListener('input', (e) => {
            const newTempo = parseFloat(e.target.value); //
            if (!isNaN(newTempo) && newTempo >= Constants.MIN_TEMPO && newTempo <= Constants.MAX_TEMPO) { //
                Tone.Transport.bpm.value = newTempo; //
                if (localAppServices.updateTaskbarTempoDisplay) localAppServices.updateTaskbarTempoDisplay(newTempo); //
            }
        });
        tempoGlobalInput.addEventListener('change', (e) => {
             if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Tempo to ${Tone.Transport.bpm.value.toFixed(1)}`); //
        });
    }

    if (midiInputSelectGlobal && localAppServices.selectMIDIInput) {
        midiInputSelectGlobal.addEventListener('change', (e) => localAppServices.selectMIDIInput(e.target.value)); //
    }

    if (playbackModeToggleBtnGlobal) {
        console.log("[EventHandlers attachGlobalControlEvents] Playback mode toggle button FOUND. Attaching listener."); //
        playbackModeToggleBtnGlobal.addEventListener('click', () => {
            console.log("[EventHandlers PlaybackModeToggle] Button clicked."); //
            if (localAppServices.getPlaybackMode && localAppServices.setPlaybackMode) {
                const currentMode = localAppServices.getPlaybackMode(); //
                const newMode = currentMode === 'pattern' ? 'timeline' : 'pattern'; //
                console.log(`[EventHandlers PlaybackModeToggle] Current mode: ${currentMode}, Attempting to set to: ${newMode}`); //
                localAppServices.setPlaybackMode(newMode); //
            } else {
                console.warn("[EventHandlers PlaybackModeToggle] getPlaybackMode or setPlaybackMode service not available."); //
                if (!localAppServices.getPlaybackMode) console.warn("getPlaybackMode is missing from localAppServices"); //
                if (!localAppServices.setPlaybackMode) console.warn("setPlaybackMode is missing from localAppServices"); //
            }
        });
    } else {
        console.warn("[EventHandlers attachGlobalControlEvents] Playback mode toggle button (playbackModeToggleBtnGlobal) NOT found in elements object passed from main.js."); //
    }
}

export function setupMIDI() {
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess()
            .then(onMIDISuccess, onMIDIFailure); //
    } else {
        console.warn("WebMIDI is not supported in this browser."); //
        showNotification("WebMIDI not supported. Cannot use MIDI devices.", 3000); //
    }
}

function onMIDISuccess(midiAccess) {
    if (localAppServices.setMidiAccess) localAppServices.setMidiAccess(midiAccess); //
    const inputs = midiAccess.inputs.values(); //
    const selectElement = localAppServices.uiElementsCache?.midiInputSelectGlobal || document.getElementById('midiInputSelectGlobal'); //
    if (!selectElement) return;

    selectElement.innerHTML = '<option value="">No MIDI Input</option>';  //
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        const option = document.createElement('option'); //
        option.value = input.value.id; //
        option.textContent = input.value.name; //
        selectElement.appendChild(option); //
    }
    const activeMIDIId = localAppServices.getActiveMIDIInput ? localAppServices.getActiveMIDIInput()?.id : null; //
    if (activeMIDIId) selectElement.value = activeMIDIId; //

    midiAccess.onstatechange = (event) => {
        console.log(`[MIDI] State change: ${event.port.name}, ${event.port.state}`); //
        setupMIDI();
    };
}

function onMIDIFailure(msg) {
    console.error(`[MIDI] Failed to get MIDI access - ${msg}`); //
    showNotification("Failed to access MIDI devices.", 3000); //
}

export function selectMIDIInput(deviceId, silent = false) {
    const midi = getMidiAccessState(); //
    const currentActiveInput = getActiveMIDIInputState(); //

    if (currentActiveInput) {
        currentActiveInput.onmidimessage = null;  //
        currentActiveInput.close();  //
    }

    if (deviceId && midi) {
        const input = midi.inputs.get(deviceId); //
        if (input) {
            input.open().then((port) => {
                port.onmidimessage = handleMIDIMessage; //
                if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(port); //
                if (!silent) showNotification(`MIDI Input: ${port.name} selected.`, 2000); //
                console.log(`[MIDI] Input selected: ${port.name}`); //
            }).catch(err => {
                console.error(`[MIDI] Error opening port ${input.name}:`, err); //
                if (!silent) showNotification(`Error opening MIDI port: ${input.name}`, 3000); //
            });
        } else {
            if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(null); //
            if (!silent) showNotification("Selected MIDI input not found.", 2000); //
        }
    } else {
        if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(null); //
        if (!silent && deviceId !== "") showNotification("MIDI input disconnected.", 2000);  //
    }
}

function handleMIDIMessage(message) {
    const [command, note, velocity] = message.data; //
    const armedTrack = getTrackById(getArmedTrackId()); //
    const midiIndicator = localAppServices.uiElementsCache?.midiIndicatorGlobal; //

    if (midiIndicator) {
        midiIndicator.classList.add('active'); //
        setTimeout(() => midiIndicator.classList.remove('active'), 100); //
    }

    if (!armedTrack || !armedTrack.instrument || armedTrack.instrument.disposed) return; //

    const freq = Tone.Frequency(note, "midi").toNote(); //
    if (command === 144 && velocity > 0) { // Note On //
        armedTrack.instrument.triggerAttack(freq, Tone.now(), velocity / 127); //
    } else if (command === 128 || (command === 144 && velocity === 0)) { // Note Off //
        armedTrack.instrument.triggerRelease(freq, Tone.now() + 0.05); //
    }
}

const keyToMIDIMap = {
    'a': 48, 'w': 49, 's': 50, 'e': 51, 'd': 52, 'f': 53, 't': 54, 'g': 55, 'y': 56, 'h': 57, 'u': 58, 'j': 59, 'k': 60, //
    'A': 48, 'W': 49, 'S': 50, 'E': 51, 'D': 52, 'F': 53, 'T': 54, 'G': 55, 'Y': 56, 'H': 57, 'U': 58, 'J': 59, 'K': 60, //
    'q': 60, '2': 61, /*'w': 62,*/ '3': 63, /*'e': 64,*/ 'r': 65, '5': 66, 't': 67, '6': 68, 'y': 69, '7': 70, 'u': 71, 'i': 72 //
};

document.addEventListener('keydown', (event) => {
    if (event.repeat) return; //
    const key = event.key.toLowerCase(); //
    const kbdIndicator = localAppServices.uiElementsCache?.keyboardIndicatorGlobal; //

    const activeEl = document.activeElement; //
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) { //
        if (key === 'escape') activeEl.blur();  //
        return;
    }
    if (event.metaKey || event.ctrlKey) return;  //

    if (key === 'z') { currentOctaveShift = Math.max(MIN_OCTAVE_SHIFT, currentOctaveShift - 1); showNotification(`Octave: ${currentOctaveShift}`, 1000); return; } //
    if (key === 'x') { currentOctaveShift = Math.min(MAX_OCTAVE_SHIFT, currentOctaveShift + 1); showNotification(`Octave: ${currentOctaveShift}`, 1000); return; } //
    if (key === ' ') {  //
        event.preventDefault(); //
        const playBtn = localAppServices.uiElementsCache?.playBtnGlobal; //
        if (playBtn) playBtn.click(); //
        return;
    }


    const armedTrack = getTrackById(getArmedTrackId()); //
    if (!armedTrack || !armedTrack.instrument || armedTrack.instrument.disposed) return; //

    let midiNote = keyToMIDIMap[event.key];  //
    if (midiNote === undefined && keyToMIDIMap[key]) midiNote = keyToMIDIMap[key]; //


    if (midiNote !== undefined && !currentlyPressedComputerKeys[midiNote]) { //
        if (kbdIndicator) { kbdIndicator.classList.add('active'); } //
        const finalNote = midiNote + (currentOctaveShift * 12); //
        if (finalNote >=0 && finalNote <= 127) { //
            const freq = Tone.Frequency(finalNote, "midi").toNote(); //
            armedTrack.instrument.triggerAttack(freq, Tone.now(), 0.7); //
            currentlyPressedComputerKeys[midiNote] = true; //
        }
    }
});

document.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase(); //
    const kbdIndicator = localAppServices.uiElementsCache?.keyboardIndicatorGlobal; //
    if (kbdIndicator) { kbdIndicator.classList.remove('active'); } //

    const armedTrack = getTrackById(getArmedTrackId()); //
    if (!armedTrack || !armedTrack.instrument || armedTrack.instrument.disposed) return; //

    let midiNote = keyToMIDIMap[event.key]; //
    if (midiNote === undefined && keyToMIDIMap[key]) midiNote = keyToMIDIMap[key]; //

    if (midiNote !== undefined && currentlyPressedComputerKeys[midiNote]) { //
        const finalNote = midiNote + (currentOctaveShift * 12); //
         if (finalNote >=0 && finalNote <= 127) { //
            const freq = Tone.Frequency(finalNote, "midi").toNote(); //
            armedTrack.instrument.triggerRelease(freq, Tone.now() + 0.05); //
            delete currentlyPressedComputerKeys[midiNote]; //
        }
    }
});


// --- Track Control Handlers (to be called from UI elements) ---
export function handleTrackMute(trackId) {
    const track = getTrackById(trackId); //
    if (!track) return;
    captureStateForUndo(`Toggle Mute for ${track.name}`); //
    track.isMuted = !track.isMuted; //
    track.applyMuteState(); //
    if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(trackId, 'muteChanged'); //
}

export function handleTrackSolo(trackId) {
    const track = getTrackById(trackId); //
    if (!track) return;
    const currentSoloed = getSoloedTrackId(); //
    captureStateForUndo(`Toggle Solo for ${track.name}`); //
    if (currentSoloed === trackId) {  //
        setSoloedTrackId(null); //
    } else {
        setSoloedTrackId(trackId); //
    }
    getTracks().forEach(t => {
        t.isSoloed = (t.id === getSoloedTrackId()); //
        t.applySoloState();  //
        if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(t.id, 'soloChanged'); //
    });
}

export function handleTrackArm(trackId) {
    const track = getTrackById(trackId); //
    if (!track) return;
    const currentArmedId = getArmedTrackId(); //
    const isCurrentlyArmed = currentArmedId === track.id; //
    captureStateForUndo(`${isCurrentlyArmed ? "Disarm" : "Arm"} Track "${track.name}" for Input`); //
    setArmedTrackId(isCurrentlyArmed ? null : track.id); //
    const newArmedTrack = getTrackById(getArmedTrackId()); //
    showNotification(newArmedTrack ? `${newArmedTrack.name} armed for input.` : "Input disarmed.", 1500); //
    getTracks().forEach(t => {
        if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(t.id, 'armChanged'); //
    });
}

export function handleRemoveTrack(trackId) {
    const track = getTrackById(trackId); //
    if (!track) return;
    showConfirmationDialog( //
        'Confirm Delete Track', //
        `Are you sure you want to remove track \"${track.name}\"? This can be undone.`, //
        () => {
            if (localAppServices.removeTrack) {
                localAppServices.removeTrack(trackId); //
            } else {
                coreRemoveTrackFromState(trackId); //
            }
        }
    );
}

export function handleOpenTrackInspector(trackId) {
    if (localAppServices.openTrackInspectorWindow) localAppServices.openTrackInspectorWindow(trackId); //
}
export function handleOpenEffectsRack(trackId) {
    if (localAppServices.openTrackEffectsRackWindow) localAppServices.openTrackEffectsRackWindow(trackId); //
}
export function handleOpenSequencer(trackId) {
    if (localAppServices.openTrackSequencerWindow) localAppServices.openTrackSequencerWindow(trackId); //
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            showNotification(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`, 3000); //
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen(); //
        }
    }
}
