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
        console.log("[EventHandlers] Play/Pause button clicked."); // DEBUG
        try {
            const audioReady = await window.initAudioContextAndMasterMeter(true);
            if (!audioReady) {
                console.warn("[EventHandlers] Audio context not ready after play button click.");
                showNotification("Audio system not ready. Please try again or check browser permissions.", 3000);
                return;
            }

            if (Tone.Transport.state !== 'started') {
                console.log("[EventHandlers] Transport state is not 'started'. Resetting position and starting transport."); // DEBUG
                Tone.Transport.position = 0;
                document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));
                Tone.Transport.start("+0.1");
                console.log("[EventHandlers] Tone.Transport.start() called. Current state:", Tone.Transport.state); // DEBUG
            } else {
                console.log("[EventHandlers] Transport state is 'started'. Pausing transport."); // DEBUG
                Tone.Transport.pause();
                console.log("[EventHandlers] Tone.Transport.pause() called. Current state:", Tone.Transport.state); // DEBUG
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
            selectMIDIInput(); // Let selectMIDIInput handle notification if it's not a skipUndo call
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
            window.midiAccess.onstatechange = populateMIDIInputs; // Listen for changes (device plug/unplug)
            // No general "MIDI ready" notification here, as populateMIDIInputs will handle specific device selection notices
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
    window.midiInputSelectGlobal.innerHTML = '<option value="">No MIDI Input</option>'; // Clear existing

    const inputs = window.midiAccess.inputs;
    if (inputs.size === 0) {
        console.log("[EventHandlers] No MIDI input devices found."); // DEBUG
    } else {
        inputs.forEach(input => {
            console.log(`[EventHandlers] Found MIDI Input: ID=${input.id}, Name=${input.name}, State=${input.state}, Connection=${input.connection}`); // DEBUG
            const option = document.createElement('option');
            option.value = input.id;
            option.textContent = input.name;
            window.midiInputSelectGlobal.appendChild(option);
        });
    }

    // Attempt to restore previous selection if that device is still available
    if (previouslySelectedId && window.midiAccess.inputs.get(previouslySelectedId)) {
        window.midiInputSelectGlobal.value = previouslySelectedId;
        console.log(`[EventHandlers] Restored MIDI selection to: ${previouslySelectedId} (${window.midiAccess.inputs.get(previouslySelectedId).name})`); // DEBUG
    } else {
        window.midiInputSelectGlobal.value = ""; // Default to "No MIDI Input"
        if (previouslySelectedId) {
            console.log(`[EventHandlers] Previously selected MIDI ID ${previouslySelectedId} not found or no longer valid. Defaulting to 'No MIDI Input'.`); // DEBUG
        }
    }
    selectMIDIInput(true); // Re-apply selection and update listeners without triggering undo/notification for this populate call
}

export function selectMIDIInput(skipUndoCaptureAndNotification = false) {
    console.log(`[EventHandlers] selectMIDIInput called. skipUndoCaptureAndNotification: ${skipUndoCaptureAndNotification}`); // DEBUG
    // Remove listener from previously active input
    if (window.activeMIDIInput) {
        console.log(`[EventHandlers] Removing onmidimessage from old input: ${window.activeMIDIInput.name}`); // DEBUG
        window.activeMIDIInput.onmidimessage = null;
        // It's often not necessary to explicitly close MIDI inputs, and can sometimes cause issues with reopening.
        // if (typeof window.activeMIDIInput.close === 'function') {
        //     window.activeMIDIInput.close();
        // }
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
            // Some implementations might require explicit open, though usually not.
            // if (typeof window.activeMIDIInput.open === 'function') {
            //     window.activeMIDIInput.open().then(() => {
            //         console.log(`[EventHandlers] MIDI Input ${window.activeMIDIInput.name} opened successfully.`);
            //     }).catch(err => {
            //         console.error(`[EventHandlers] Error opening MIDI Input ${window.activeMIDIInput.name}:`, err);
            //     });
            // }
            if (!skipUndoCaptureAndNotification) {
                showNotification(`MIDI Input: ${window.activeMIDIInput.name} selected.`, 2000);
            }
        } else {
             if (!skipUndoCaptureAndNotification) showNotification("Selected MIDI input not found or unavailable.", 2000);
             console.warn(`[EventHandlers] Selected MIDI device ID "${selectedId}" not found in available inputs.`); // DEBUG
        }
    } else {
        if (!skipUndoCaptureAndNotification && selectedId === "") showNotification("MIDI Input deselected.", 1500);
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
                rowIndex = note - Constants.samplerMIDINoteStart;
                if (rowIndex < 0 || rowIndex >= Constants.numDrumSamplerPads) rowIndex = -1;
            }

            if (rowIndex !== -1 && currentStep >= 0 && currentStep < track.sequenceLength) {
                if (!track.sequenceData[rowIndex]) track.sequenceData[rowIndex] = Array(track.sequenceLength).fill(null);
                track.sequenceData[rowIndex][currentStep] = { active: true, velocity: normVel };

                if (track.sequencerWindow && !track.sequencerWindow.isMinimized && getActiveSequencerTrackId() === track.id) {
                    const cell = track.sequencerWindow.element.querySelector(`.sequencer-step-cell[data-row="${rowIndex}"][data-col="${currentStep}"]`);
                    if (cell && typeof window.updateSequencerCellUI === 'function') {
                        window.updateSequencerCellUI(cell, track.type, true);
                    }
                }
            }
        }
    }

    const currentArmedTrackId = getArmedTrackId();
    if (!currentArmedTrackId) return;
    const currentArmedTrack = getTrackById(currentArmedTrackId);
    if (!currentArmedTrack) return;

    // Live MIDI playing (not recording to sequencer)
    if (command === 144 && velocity > 0) { // Note On
        if (currentArmedTrack.type === 'Synth' && currentArmedTrack.instrument) {
            currentArmedTrack.instrument.triggerAttack(Tone.Frequency(note, "midi").toNote(), time, normVel);
        } else if (currentArmedTrack.type === 'Sampler') { // Slicer Sampler
            const sliceIdx = note - Constants.samplerMIDINoteStart;
            if (sliceIdx >= 0 && sliceIdx < currentArmedTrack.slices.length && typeof window.playSlicePreview === 'function') {
                window.playSlicePreview(currentArmedTrack.id, sliceIdx, normVel);
            }
        } else if (currentArmedTrack.type === 'DrumSampler') { // Pad Sampler
            const padIndex = note - Constants.samplerMIDINoteStart;
            if (padIndex >= 0 && padIndex < Constants.numDrumSamplerPads && typeof window.playDrumSamplerPadPreview === 'function') {
                window.playDrumSamplerPadPreview(currentArmedTrack.id, padIndex, normVel);
            }
        } else if (currentArmedTrack.type === 'InstrumentSampler' && currentArmedTrack.toneSampler && currentArmedTrack.toneSampler.loaded) {
            if (!currentArmedTrack.instrumentSamplerIsPolyphonic) {
                currentArmedTrack.toneSampler.releaseAll(time); // Ensure mono behavior for live play
            }
            currentArmedTrack.toneSampler.triggerAttack(Tone.Frequency(note, "midi").toNote(), time, normVel);
        } else if (currentArmedTrack.type === 'InstrumentSampler' && currentArmedTrack.toneSampler && !currentArmedTrack.toneSampler.loaded) {
            console.warn(`[EventHandlers] InstrumentSampler on track ${currentArmedTrack.id} not loaded, cannot play MIDI note.`);
        }
    } else if (command === 128 || (command === 144 && velocity === 0)) { // Note Off
        if (currentArmedTrack.type === 'Synth' && currentArmedTrack.instrument) {
            currentArmedTrack.instrument.triggerRelease(Tone.Frequency(note, "midi").toNote(), time + 0.05);
        } else if (currentArmedTrack.type === 'InstrumentSampler' && currentArmedTrack.toneSampler && currentArmedTrack.toneSampler.loaded) {
            if (currentArmedTrack.instrumentSamplerIsPolyphonic) {
                 currentArmedTrack.toneSampler.triggerRelease(Tone.Frequency(note, "midi").toNote(), time + 0.05);
            }
        }
    }
}

async function handleComputerKeyDown(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
            const playBtnGlobal = document.getElementById('playBtnGlobal');
            if (playBtnGlobal && typeof playBtnGlobal.click === 'function') {
                playBtnGlobal.click();
            } else if (window.playBtn && typeof window.playBtn.click === 'function') {
                 window.playBtn.click();
            }
        }
        return;
    }

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

    if (e.code === 'KeyZ') {
        if (!currentlyPressedComputerKeys[e.code]) {
            if (currentOctaveShift > MIN_OCTAVE_SHIFT) {
                currentOctaveShift--;
                showNotification(`Octave: ${currentOctaveShift >= 0 ? '+' : ''}${currentOctaveShift}`, 1000);
            } else {
                showNotification(`Min Octave (${MIN_OCTAVE_SHIFT}) Reached`, 1000);
            }
        }
        currentlyPressedComputerKeys[e.code] = true;
        if(window.keyboardIndicatorGlobalEl) window.keyboardIndicatorGlobalEl.classList.add('active');
        return;
    }
    if (e.code === 'KeyX') {
        if (!currentlyPressedComputerKeys[e.code]) {
            if (currentOctaveShift < MAX_OCTAVE_SHIFT) {
                currentOctaveShift++;
                showNotification(`Octave: ${currentOctaveShift >= 0 ? '+' : ''}${currentOctaveShift}`, 1000);
            } else {
                showNotification(`Max Octave (${MAX_OCTAVE_SHIFT}) Reached`, 1000);
            }
        }
        currentlyPressedComputerKeys[e.code] = true;
        if(window.keyboardIndicatorGlobalEl) window.keyboardIndicatorGlobalEl.classList.add('active');
        return;
    }

    if (e.repeat || currentlyPressedComputerKeys[e.code]) return;

    currentlyPressedComputerKeys[e.code] = true;
    if(window.keyboardIndicatorGlobalEl) window.keyboardIndicatorGlobalEl.classList.add('active');

    const time = Tone.now();
    const baseComputerKeyNote = Constants.computerKeySynthMap[e.code] || Constants.computerKeySamplerMap[e.code];

    if (baseComputerKeyNote === undefined) {
        return;
    }

    const computerKeyNote = baseComputerKeyNote + (currentOctaveShift * OCTAVE_SHIFT_AMOUNT);
    const computerKeyVelocity = Constants.defaultVelocity;

    if (computerKeyNote < 0 || computerKeyNote > 127) {
        console.warn(`Octave shifted note ${computerKeyNote} (Base: ${baseComputerKeyNote}, Shift: ${currentOctaveShift}) is out of MIDI range.`);
        return;
    }

    const audioReady = await window.initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        console.warn("[EventHandlers] Audio context not ready for Computer Key Down note playing.");
        delete currentlyPressedComputerKeys[e.code];
        if(window.keyboardIndicatorGlobalEl && Object.keys(currentlyPressedComputerKeys).filter(k => k !== 'KeyZ' && k !== 'KeyX').length === 0) {
            window.keyboardIndicatorGlobalEl.classList.remove('active');
        }
        return;
    }

    const currentRecordingTrackId = getRecordingTrackId();
    if (isTrackRecording() && getArmedTrackId() === currentRecordingTrackId) {
        const track = getTrackById(currentRecordingTrackId);
        if (track) {
            const currentTimeInSeconds = Tone.Transport.seconds;
            const sixteenthNoteDuration = Tone.Time("16n").toSeconds();
            let currentStep = Math.round(currentTimeInSeconds / sixteenthNoteDuration);
            currentStep = (currentStep % track.sequenceLength + track.sequenceLength) % track.sequenceLength;

            let rowIndex = -1;
            if ((track.type === 'Synth' || track.type === 'InstrumentSampler') && Constants.computerKeySynthMap[e.code]) {
                const pitchName = Tone.Frequency(computerKeyNote, "midi").toNote();
                rowIndex = Constants.synthPitches.indexOf(pitchName);
            } else if (track.type === 'Sampler' && Constants.computerKeySamplerMap[e.code]) {
                 rowIndex = (baseComputerKeyNote - Constants.samplerMIDINoteStart) + (currentOctaveShift * Constants.numSlices);
                 if (rowIndex < 0 || rowIndex >= track.slices.length) rowIndex = -1;
            } else if (track.type === 'DrumSampler' && Constants.computerKeySamplerMap[e.code]) {
                 rowIndex = (baseComputerKeyNote - Constants.samplerMIDINoteStart) + (currentOctaveShift * Constants.numDrumSamplerPads);
                 if (rowIndex < 0 || rowIndex >= Constants.numDrumSamplerPads) rowIndex = -1;
            }

            if (rowIndex !== -1 && currentStep >= 0 && currentStep < track.sequenceLength) {
                if (!track.sequenceData[rowIndex]) track.sequenceData[rowIndex] = Array(track.sequenceLength).fill(null);
                track.sequenceData[rowIndex][currentStep] = { active: true, velocity: computerKeyVelocity };
                if (track.sequencerWindow && !track.sequencerWindow.isMinimized && getActiveSequencerTrackId() === track.id) {
                    const cell = track.sequencerWindow.element.querySelector(`.sequencer-step-cell[data-row="${rowIndex}"][data-col="${currentStep}"]`);
                     if (cell && typeof window.updateSequencerCellUI === 'function') window.updateSequencerCellUI(cell, track.type, true);
                }
            }
        }
    }

    const currentArmedTrackId = getArmedTrackId();
    if (!currentArmedTrackId) return;
    const currentArmedTrack = getTrackById(currentArmedTrackId);
    if (!currentArmedTrack) return;

    if (currentArmedTrack.type === 'Synth' && Constants.computerKeySynthMap[e.code] && currentArmedTrack.instrument) {
        currentArmedTrack.instrument.triggerAttack(Tone.Frequency(computerKeyNote, "midi").toNote(), time, computerKeyVelocity);
    } else if (currentArmedTrack.type === 'Sampler' && Constants.computerKeySamplerMap[e.code] !== undefined) {
        const sliceIdx = (baseComputerKeyNote - Constants.samplerMIDINoteStart) + (currentOctaveShift * Constants.numSlices);
        if (sliceIdx >= 0 && sliceIdx < currentArmedTrack.slices.length && typeof window.playSlicePreview === 'function') {
            window.playSlicePreview(currentArmedTrack.id, sliceIdx, computerKeyVelocity, 0); // Octave shift handled by slice index
        }
    } else if (currentArmedTrack.type === 'DrumSampler' && Constants.computerKeySamplerMap[e.code] !== undefined) {
        const padIndex = (baseComputerKeyNote - Constants.samplerMIDINoteStart) + (currentOctaveShift * Constants.numDrumSamplerPads);
        if (padIndex >= 0 && padIndex < Constants.numDrumSamplerPads && typeof window.playDrumSamplerPadPreview === 'function') {
            window.playDrumSamplerPadPreview(currentArmedTrack.id, padIndex, computerKeyVelocity, 0); // Octave shift handled by pad index
        }
    } else if (currentArmedTrack.type === 'InstrumentSampler' && Constants.computerKeySynthMap[e.code] && currentArmedTrack.toneSampler && currentArmedTrack.toneSampler.loaded) {
        if (!currentArmedTrack.instrumentSamplerIsPolyphonic) {
            currentArmedTrack.toneSampler.releaseAll(time);
        }
        currentArmedTrack.toneSampler.triggerAttack(Tone.Frequency(computerKeyNote, "midi").toNote(), time, computerKeyVelocity);
    } else if (currentArmedTrack.type === 'InstrumentSampler' && currentArmedTrack.toneSampler && !currentArmedTrack.toneSampler.loaded) {
        console.warn(`[EventHandlers] InstrumentSampler on track ${currentArmedTrack.id} not loaded, cannot play note (KBD).`);
    }
}

function handleComputerKeyUp(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') return;

    const isOctaveKey = (e.code === 'KeyZ' || e.code === 'KeyX');
    if (isOctaveKey) {
        delete currentlyPressedComputerKeys[e.code];
        const noteKeysPressed = Object.keys(currentlyPressedComputerKeys).some(key => key !== 'KeyZ' && key !== 'KeyX');
        if(window.keyboardIndicatorGlobalEl && !noteKeysPressed && !currentlyPressedComputerKeys['KeyZ'] && !currentlyPressedComputerKeys['KeyX']) {
            window.keyboardIndicatorGlobalEl.classList.remove('active');
        }
        return;
    }

    if (currentlyPressedComputerKeys[e.code]) {
        const time = Tone.now();
        const currentArmedTrackId = getArmedTrackId();
        if (currentArmedTrackId) {
            const track = getTrackById(currentArmedTrackId);
            if (track) {
                const baseComputerKeyNote = Constants.computerKeySynthMap[e.code];
                if (baseComputerKeyNote !== undefined) {
                    const computerKeyNote = baseComputerKeyNote + (currentOctaveShift * OCTAVE_SHIFT_AMOUNT);
                     if (computerKeyNote >= 0 && computerKeyNote <= 127) {
                        if (track.type === 'Synth' && track.instrument) {
                            track.instrument.triggerRelease(Tone.Frequency(computerKeyNote, "midi").toNote(), time + 0.05);
                        } else if (track.type === 'InstrumentSampler' && track.toneSampler && track.toneSampler.loaded) {
                            if (track.instrumentSamplerIsPolyphonic) {
                                track.toneSampler.triggerRelease(Tone.Frequency(computerKeyNote, "midi").toNote(), time + 0.05);
                            }
                        }
                     }
                }
            }
        }
        delete currentlyPressedComputerKeys[e.code];
    }

    const noteKeysPressed = Object.keys(currentlyPressedComputerKeys).some(key => key !== 'KeyZ' && key !== 'KeyX');
    if(window.keyboardIndicatorGlobalEl && !noteKeysPressed && !currentlyPressedComputerKeys['KeyZ'] && !currentlyPressedComputerKeys['KeyX']) {
        window.keyboardIndicatorGlobalEl.classList.remove('active');
    }
}

export function handleTrackMute(trackId) {
    console.log(`[EventHandlers] handleTrackMute called for trackId: ${trackId}`);
    const track = getTrackById(trackId);
    console.log(`[EventHandlers] Track found for mute:`, track);
    if (!track) {
        console.warn(`[EventHandlers] handleTrackMute: Track ID ${trackId} not found.`);
        return;
    }
    captureStateForUndo(`${track.isMuted ? "Unmute" : "Mute"} Track "${track.name}"`);
    track.isMuted = !track.isMuted;
    track.applyMuteState();
    console.log(`[EventHandlers] Track ${track.id} isMuted state after toggle: ${track.isMuted}`);

    const inspectorMuteBtn = track.inspectorWindow?.element?.querySelector(`#muteBtn-${track.id}`);
    if (inspectorMuteBtn) inspectorMuteBtn.classList.toggle('muted', track.isMuted);
    const mixerMuteBtn = window.openWindows['mixer']?.element?.querySelector(`#mixerMuteBtn-${track.id}`);
    if (mixerMuteBtn) mixerMuteBtn.classList.toggle('muted', track.isMuted);
}

export function handleTrackSolo(trackId) {
    console.log(`[EventHandlers] handleTrackSolo called for trackId: ${trackId}`);
    const track = getTrackById(trackId);
    console.log(`[EventHandlers] Track found for solo:`, track);
    if (!track) {
        console.warn(`[EventHandlers] handleTrackSolo: Track ID ${trackId} not found.`);
        return;
    }

    const currentGlobalSoloId = getSoloedTrackId();
    const isCurrentlySoloed = currentGlobalSoloId === track.id;

    captureStateForUndo(`${isCurrentlySoloed ? "Unsolo" : "Solo"} Track "${track.name}"`);

    if (isCurrentlySoloed) {
        setSoloedTrackId(null);
    } else {
        setSoloedTrackId(track.id);
    }
    console.log(`[EventHandlers] Global soloedTrackId is now: ${getSoloedTrackId()}`);

    getTracks().forEach(t => {
        t.isSoloed = (getSoloedTrackId() === t.id);
        t.applySoloState();

        const inspectorSoloBtn = t.inspectorWindow?.element?.querySelector(`#soloBtn-${t.id}`);
        if (inspectorSoloBtn) inspectorSoloBtn.classList.toggle('soloed', t.isSoloed);
        const mixerSoloBtn = window.openWindows['mixer']?.element?.querySelector(`#mixerSoloBtn-${t.id}`);
        if (mixerSoloBtn) mixerSoloBtn.classList.toggle('soloed', t.isSoloed);
    });
}

export function handleTrackArm(trackId) {
    console.log(`[EventHandlers] handleTrackArm called for trackId: ${trackId}`);
    const track = getTrackById(trackId);
    console.log(`[EventHandlers] Track found for arm:`, track);
    if (!track) {
        console.warn(`[EventHandlers] handleTrackArm: Track ID ${trackId} not found.`);
        return;
    }

    const currentArmedId = getArmedTrackId();
    const isCurrentlyArmed = currentArmedId === track.id;

    captureStateForUndo(`${isCurrentlyArmed ? "Disarm" : "Arm"} Track "${track.name}" for Input`);

    if (isCurrentlyArmed) {
        setArmedTrackId(null);
    } else {
        setArmedTrackId(track.id);
    }
    console.log(`[EventHandlers] Global armedTrackId is now: ${getArmedTrackId()}`);

    getTracks().forEach(t => {
        const inspectorArmBtn = t.inspectorWindow?.element?.querySelector(`#armInputBtn-${t.id}`);
        if (inspectorArmBtn) inspectorArmBtn.classList.toggle('armed', getArmedTrackId() === t.id);
    });

    const newArmedTrack = getTrackById(getArmedTrackId());
    showNotification(newArmedTrack ? `${newArmedTrack.name} armed for input.` : "Input disarmed.", 1500);
}

export function handleRemoveTrack(trackId) {
    console.log(`[EventHandlers] handleRemoveTrack called for trackId: ${trackId}`);
    const track = getTrackById(trackId);
    if (!track) {
        console.warn(`[EventHandlers] handleRemoveTrack: Track ID ${trackId} not found.`);
        return;
    }
    showConfirmationDialog(
        'Confirm Delete Track',
        `Are you sure you want to remove track "${track.name}"? This cannot be undone directly (only via project reload or undo history).`,
        () => {
            coreRemoveTrackFromState(trackId);
        }
    );
}

export function handleOpenTrackInspector(trackId) {
    console.log(`[EventHandlers] handleOpenTrackInspector called for trackId: ${trackId}`);
    if (typeof window.openTrackInspectorWindow === 'function') {
        window.openTrackInspectorWindow(trackId);
    } else {
        console.error("[EventHandlers] openTrackInspectorWindow function not available on window object.");
    }
}

export function handleOpenEffectsRack(trackId) {
    console.log(`[EventHandlers] handleOpenEffectsRack called for trackId: ${trackId}`);
    if (typeof window.openTrackEffectsRackWindow === 'function') {
        window.openTrackEffectsRackWindow(trackId);
    } else {
        console.error("[EventHandlers] openTrackEffectsRackWindow function not available on window object.");
    }
}

export function handleOpenSequencer(trackId) {
    console.log(`[EventHandlers] handleOpenSequencer called for trackId: ${trackId}`);
    if (typeof window.openTrackSequencerWindow === 'function') {
        window.openTrackSequencerWindow(trackId);
    } else {
        console.error("[EventHandlers] openTrackSequencerWindow function not available on window object.");
    }
}
