// js/eventHandlers.js - Global Event Listeners and Input Handling Module
import * as Constants from './constants.js';
import { showNotification, showConfirmationDialog } from './utils.js';
import {
    getTracks, getTrackById, captureStateForUndo,
    setSoloedTrackId, getSoloedTrackId,
    setArmedTrackId, getArmedTrackId,
    setActiveSequencerTrackId, getActiveSequencerTrackId,
    setIsRecording, isTrackRecording,
    setRecordingTrackId, getRecordingTrackId,
    setRecordingStartTime,
    removeTrackFromState as coreRemoveTrackFromState
} from './state.js';

export let currentlyPressedComputerKeys = {};
let currentOctaveShift = 0;
const MAX_OCTAVE_SHIFT = 2;
const MIN_OCTAVE_SHIFT = -2;
const OCTAVE_SHIFT_AMOUNT = 12;

export function initializePrimaryEventListeners(appContext) {
    const {
        addTrack, openSoundBrowserWindow, undoLastAction, redoLastAction,
        saveProject, loadProject, exportToWav,
        openGlobalControlsWindow, openMixerWindow,
        handleProjectFileLoad,
        triggerCustomBackgroundUpload,
        removeCustomDesktopBackground
    } = appContext;

    const startButton = document.getElementById('startButton');
    const startMenu = document.getElementById('startMenu');
    startButton?.addEventListener('click', (e) => {
        e.stopPropagation();
        startMenu?.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
        if (startMenu && !startMenu.classList.contains('hidden') && !startMenu.contains(e.target) && e.target !== startButton) {
            startMenu.classList.add('hidden');
        }
    });

    document.getElementById('menuAddSynthTrack')?.addEventListener('click', () => { addTrack('Synth', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); });
    document.getElementById('menuAddSamplerTrack')?.addEventListener('click', () => { addTrack('Sampler', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); });
    document.getElementById('menuAddDrumSamplerTrack')?.addEventListener('click', () => { addTrack('DrumSampler', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); });
    document.getElementById('menuAddInstrumentSamplerTrack')?.addEventListener('click', () => { addTrack('InstrumentSampler', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); });

    document.getElementById('menuOpenSoundBrowser')?.addEventListener('click', () => { if(typeof openSoundBrowserWindow === 'function') openSoundBrowserWindow(); else console.error("openSoundBrowserWindow is not defined"); startMenu?.classList.add('hidden'); });

    document.getElementById('menuUndo')?.addEventListener('click', () => {
        if (!document.getElementById('menuUndo').classList.contains('disabled')) {
            undoLastAction(); startMenu?.classList.add('hidden');
        }
    });
    document.getElementById('menuRedo')?.addEventListener('click', () => {
        if (!document.getElementById('menuRedo').classList.contains('disabled')) {
            redoLastAction(); startMenu?.classList.add('hidden');
        }
    });

    document.getElementById('menuSaveProject')?.addEventListener('click', () => { saveProject(); startMenu?.classList.add('hidden'); });
    document.getElementById('menuLoadProject')?.addEventListener('click', () => {
        if (typeof loadProject === 'function') loadProject();
        else document.getElementById('loadProjectInput')?.click();
        startMenu?.classList.add('hidden');
    });
    document.getElementById('menuExportWav')?.addEventListener('click', () => { exportToWav(); startMenu?.classList.add('hidden'); });

    document.getElementById('menuOpenGlobalControls')?.addEventListener('click', () => { if(typeof openGlobalControlsWindow === 'function') openGlobalControlsWindow(); else console.error("openGlobalControlsWindow is not defined"); startMenu?.classList.add('hidden'); });
    document.getElementById('menuOpenMixer')?.addEventListener('click', () => { if(typeof openMixerWindow === 'function') openMixerWindow(); else console.error("openMixerWindow is not defined"); startMenu?.classList.add('hidden'); });

    document.getElementById('menuUploadCustomBg')?.addEventListener('click', () => {
        if (triggerCustomBackgroundUpload) triggerCustomBackgroundUpload();
        startMenu?.classList.add('hidden');
    });
    document.getElementById('menuRemoveCustomBg')?.addEventListener('click', () => {
        if (removeCustomDesktopBackground) removeCustomDesktopBackground();
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuToggleFullScreen')?.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                showNotification(`Error entering full screen: ${err.message}`, 3000);
            });
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
        startMenu?.classList.add('hidden');
    });

    document.getElementById('taskbarTempoDisplay')?.addEventListener('click', () => {
        if(typeof openGlobalControlsWindow === 'function') openGlobalControlsWindow(); else console.error("openGlobalControlsWindow is not defined");
    });

    const loadProjectInputEl = document.getElementById('loadProjectInput');
    if (loadProjectInputEl && typeof handleProjectFileLoad === 'function') {
        loadProjectInputEl.addEventListener('change', handleProjectFileLoad);
    } else if (!handleProjectFileLoad) {
        console.warn("[EventHandlers] handleProjectFileLoad function not provided via appContext. Project loading from file will not work.");
    } else if (!loadProjectInputEl) {
        console.warn("[EventHandlers] loadProjectInput element not found.");
    }

    document.addEventListener('keydown', handleComputerKeyDown);
    document.addEventListener('keyup', handleComputerKeyUp);

    if (!window.transportEventsInitialized && typeof Tone !== 'undefined' && Tone.Transport) {
        Tone.Transport.on('start', () => {
            if (window.playBtn) window.playBtn.textContent = 'Pause';
        });
        Tone.Transport.on('pause', () => {
            if (window.playBtn) window.playBtn.textContent = 'Play';
            if (isTrackRecording()) {
                setIsRecording(false);
                if(window.recordBtn) { window.recordBtn.textContent = 'Record'; window.recordBtn.classList.remove('recording'); }
                showNotification("Recording stopped due to transport pause.", 2000);
                captureStateForUndo(`Stop Recording (transport paused)`);
                setRecordingTrackId(null);
            }
        });
        Tone.Transport.on('stop', () => {
            if (window.playBtn) window.playBtn.textContent = 'Play';
            document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));
            if (isTrackRecording()) {
                setIsRecording(false);
                if(window.recordBtn) { window.recordBtn.textContent = 'Record'; window.recordBtn.classList.remove('recording'); }
                showNotification("Recording stopped due to transport stop.", 2000);
                captureStateForUndo(`Stop Recording (transport stopped)`);
                setRecordingTrackId(null);
            }
        });
        window.transportEventsInitialized = true;
    }
}

export function attachGlobalControlEvents(globalControlsWindowElement) {
    globalControlsWindowElement.querySelector('#playBtnGlobal')?.addEventListener('click', async () => {
        try {
            const audioReady = await window.initAudioContextAndMasterMeter(true);
            if (!audioReady) {
                console.warn("[EventHandlers] Audio context not ready after play button click.");
                showNotification("Audio system not ready. Please try again or check browser permissions.", 3000);
                return;
            }

            if (Tone.Transport.state !== 'started') {
                Tone.Transport.position = 0;
                document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));
                Tone.Transport.start("+0.1");
            } else {
                Tone.Transport.pause();
            }
        } catch (error) {
            console.error("[EventHandlers] Error in play/pause click:", error);
            showNotification("Error starting playback. AudioContext might not be ready.", 3000);
        }
    });

    globalControlsWindowElement.querySelector('#recordBtnGlobal')?.addEventListener('click', async () => {
         try {
            const audioReady = await window.initAudioContextAndMasterMeter(true);
            if (!audioReady) {
                showNotification("Audio system not ready for recording. Please click Play or interact to initialize audio.", 3000);
                return;
            }

            if (!isTrackRecording()) {
                const currentArmedTrackId = getArmedTrackId();
                if (!currentArmedTrackId) { showNotification("No track armed for recording.", 3000); return; }
                const trackToRecord = getTrackById(currentArmedTrackId);
                if (!trackToRecord) { showNotification("Armed track not found.", 3000); return; }

                setIsRecording(true);
                setRecordingTrackId(currentArmedTrackId);
                setRecordingStartTime(Tone.Transport.seconds);

                if(window.recordBtn) {window.recordBtn.textContent = 'Stop Rec'; window.recordBtn.classList.add('recording');}
                showNotification(`Recording started for ${trackToRecord.name}.`, 2000);
                captureStateForUndo(`Start Recording on ${trackToRecord.name}`);
                if (Tone.Transport.state !== 'started') {
                    Tone.Transport.position = 0;
                    document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));
                    Tone.Transport.start("+0.1");
                }
            } else {
                setIsRecording(false);
                if(window.recordBtn) {window.recordBtn.textContent = 'Record'; window.recordBtn.classList.remove('recording');}
                const recordedTrack = getTrackById(getRecordingTrackId());
                showNotification("Recording stopped.", 2000);
                captureStateForUndo(`Stop Recording (Track: ${recordedTrack?.name || 'Unknown'})`);
                setRecordingTrackId(null);
            }
        } catch (error) {
            console.error("[EventHandlers] Error in record button click:", error);
            showNotification("Error during recording setup.", 3000);
            if (window.recordBtn) { window.recordBtn.textContent = 'Record'; window.recordBtn.classList.remove('recording');}
            setIsRecording(false); setRecordingTrackId(null);
        }
    });

    globalControlsWindowElement.querySelector('#tempoGlobalInput')?.addEventListener('change', (e) => {
        const newTempo = parseFloat(e.target.value);
        const taskbarTempoDisplay = document.getElementById('taskbarTempoDisplay');
        if (!isNaN(newTempo) && newTempo >= 40 && newTempo <= 240) {
            if (Tone.Transport.bpm.value !== newTempo) captureStateForUndo(`Set Tempo to ${newTempo.toFixed(1)} BPM`);
            Tone.Transport.bpm.value = newTempo;
            if(typeof window.updateTaskbarTempoDisplay === 'function') window.updateTaskbarTempoDisplay(newTempo);
            else if(taskbarTempoDisplay) taskbarTempoDisplay.textContent = `${newTempo.toFixed(1)} BPM`;
        } else {
            e.target.value = Tone.Transport.bpm.value.toFixed(1);
            showNotification(`Tempo must be between 40 and 240.`, 2500);
        }
    });

     if (window.midiInputSelectGlobal) {
        window.midiInputSelectGlobal.onchange = () => {
            console.log("[EventHandlers] midiInputSelectGlobal changed."); // DEBUG
            const oldMidiName = window.activeMIDIInput ? window.activeMIDIInput.name : "No MIDI Input";
            const newMidiId = window.midiInputSelectGlobal.value;
            const newMidiDevice = window.midiAccess && newMidiId ? window.midiAccess.inputs.get(newMidiId) : null;
            const newMidiName = newMidiDevice ? newMidiDevice.name : "No MIDI Input";
            if (oldMidiName !== newMidiName) {
                 captureStateForUndo(`Change MIDI Input to ${newMidiName}`);
            }
            selectMIDIInput();
        };
    } else {
        console.warn("[EventHandlers] attachGlobalControlEvents: window.midiInputSelectGlobal not found.");
    }
}

export async function setupMIDI() {
    console.log("[EventHandlers] setupMIDI called."); // DEBUG
    if (navigator.requestMIDIAccess) {
        try {
            console.log("[EventHandlers] Requesting MIDI access..."); // DEBUG
            window.midiAccess = await navigator.requestMIDIAccess();
            console.log("[EventHandlers] MIDI Access Granted:", window.midiAccess); // DEBUG
            populateMIDIInputs();
            window.midiAccess.onstatechange = populateMIDIInputs;
            showNotification("MIDI ready.", 2000);
        } catch (e) {
            console.error("[EventHandlers] Could not access MIDI devices.", e);
            showNotification(`Could not access MIDI: ${e.message}. Ensure permissions.`, 6000);
        }
    } else {
        console.warn("[EventHandlers] Web MIDI API not supported in this browser."); // DEBUG
        showNotification("Web MIDI API not supported in this browser.", 3000);
    }
}

function populateMIDIInputs() {
    console.log("[EventHandlers] populateMIDIInputs called."); // DEBUG
    if (!window.midiAccess) {
        console.warn("[EventHandlers] populateMIDIInputs: window.midiAccess is null.");
        return;
    }
    if (!window.midiInputSelectGlobal) {
        console.warn("[EventHandlers] populateMIDIInputs: window.midiInputSelectGlobal is null. Cannot populate MIDI dropdown.");
        return;
    }

    const previouslySelectedId = window.activeMIDIInput ? window.activeMIDIInput.id : window.midiInputSelectGlobal.value;
    console.log(`[EventHandlers] populateMIDIInputs: Previously selected MIDI ID: ${previouslySelectedId}`); // DEBUG
    window.midiInputSelectGlobal.innerHTML = '<option value="">No MIDI Input</option>';

    const inputs = window.midiAccess.inputs;
    if (inputs.size === 0) {
        console.log("[EventHandlers] No MIDI input devices found."); // DEBUG
    } else {
        inputs.forEach(input => {
            console.log(`[EventHandlers] Found MIDI Input: ID=<span class="math-inline">\{input\.id\}, Name\=</span>{input.name}`); // DEBUG
            const option = document.createElement('option');
            option.value = input.id;
            option.textContent = input.name;
            window.midiInputSelectGlobal.appendChild(option);
        });
    }

    // Attempt to restore previous selection
    if (previouslySelectedId && Array.from(window.midiInputSelectGlobal.options).some(opt => opt.value === previouslySelectedId)) {
        window.midiInputSelectGlobal.value = previouslySelectedId;
        console.log(`[EventHandlers] Restored MIDI selection to: ${previouslySelectedId}`); // DEBUG
    } else {
        window.midiInputSelectGlobal.value = ""; // Default to "No MIDI Input"
        if (previouslySelectedId) {
            console.log(`[EventHandlers] Previously selected MIDI ID ${previouslySelectedId} not found. Defaulting to 'No MIDI Input'.`); // DEBUG
        }
    }

    selectMIDIInput(true); // Re-apply selection and update listeners without triggering undo/notification for this populate call
}

export function selectMIDIInput(skipUndoCapture = false) {
    console.log(`[EventHandlers] selectMIDIInput called. skipUndoCapture: ${skipUndoCapture}`); // DEBUG
    if (window.activeMIDIInput && typeof window.activeMIDIInput.close === 'function') {
        // It's generally better not to explicitly close, as it might prevent reopening.
        // Removing the onmidimessage listener is the key part.
        // window.activeMIDIInput.close();
    }
    if (window.activeMIDIInput) {
        console.log(`[EventHandlers] Removing onmidimessage from old input: ${window.activeMIDIInput.name}`); // DEBUG
        window.activeMIDIInput.onmidimessage = null;
    }
    window.activeMIDIInput = null;

    const selectedId = window.midiInputSelectGlobal ? window.midiInputSelectGlobal.value : null;
    console.log(`[EventHandlers] Selected MIDI ID in dropdown: ${selectedId}`); // DEBUG

    if (window.midiAccess && selectedId) {
        const inputDevice = window.midiAccess.inputs.get(selectedId);
        if (inputDevice) {
            window.activeMIDIInput = inputDevice;
            console.log(`[EventHandlers] Setting onmidimessage for new input: ${window.activeMIDIInput.name}`); // DEBUG
            window.activeMIDIInput.onmidimessage = handleMIDIMessage;
            if (!skipUndoCapture) {
                showNotification(`MIDI Input: ${window.activeMIDIInput.name} selected.`, 2000);
            }
        } else {
             if (!skipUndoCapture) showNotification("Selected MIDI input not found or unavailable.", 2000);
             console.warn(`[EventHandlers] Selected MIDI device ID "${selectedId}" not found in available inputs.`); // DEBUG
        }
    } else {
        if (!skipUndoCapture && selectedId === "") showNotification("MIDI Input deselected.", 1500);
        console.log("[EventHandlers] No MIDI input selected or midiAccess not available."); // DEBUG
    }
    if (window.midiIndicatorGlobalEl) window.midiIndicatorGlobalEl.classList.toggle('active', !!window.activeMIDIInput);
}


export async function handleMIDIMessage(message) {
    const [command, note, velocity] = message.data;
    const time = Tone.now();
    const normVel = velocity / 127;

    if (window.midiIndicatorGlobalEl) {
        window.midiIndicatorGlobalEl.classList.add('active');
        setTimeout(() => window.midiIndicatorGlobalEl.classList.remove('active'), 100);
    }

    if (command === 144 && velocity > 0) { // Note On
        const audioReady = await window.initAudioContextAndMasterMeter(true);
        if (!audioReady) {
            console.warn("[EventHandlers] Audio context not ready for MIDI Note On.");
            return;
        }
    }

    const currentRecordingTrackId = getRecordingTrackId();
    if (isTrackRecording() && getArmedTrackId() === currentRecordingTrackId && command === 144 && velocity > 0) {
        const track = getTrackById(currentRecordingTrackId);
        if (track) {
            const currentTimeInSeconds = Tone.Transport.seconds;
            const sixteenthNoteDuration = Tone.Time("16n").toSeconds();
            let currentStep = Math.round(currentTimeInSeconds / sixteenthNoteDuration);
            currentStep = (currentStep % track.sequenceLength + track.sequenceLength) % track.sequenceLength;

            let rowIndex = -1;
            if (track.type === 'Synth' || track.type === 'InstrumentSampler') {
                const pitchName = Tone.Frequency(note, "midi").toNote();
                rowIndex = Constants.synthPitches.indexOf(pitchName);
            } else if (track.type === 'Sampler') {
                rowIndex = note - Constants.samplerMIDINoteStart;
                if (rowIndex < 0 || rowIndex >= track.slices.length) rowIndex = -1;
            } else if (track.type === 'DrumSampler') {
                rowIndex = note - Constants.
