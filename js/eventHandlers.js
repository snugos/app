// js/eventHandlers.js - Global Event Listeners and Input Handling Module
import * as Constants from './constants.js';
import { showNotification, showConfirmationDialog } from './utils.js'; // createContextMenu is also in utils
import {
    getTracks, getTrackById, captureStateForUndo,
    setSoloedTrackId, getSoloedTrackId,
    setArmedTrackId, getArmedTrackId,
    setActiveSequencerTrackId, getActiveSequencerTrackId,
    setIsRecording, isTrackRecording,
    setRecordingTrackId, getRecordingTrackId,
    setRecordingStartTime,
    removeTrackFromState as coreRemoveTrackFromState // Renamed to avoid conflict if exporting removeTrack
} from './state.js';

// These will be initialized by main.js
let localAppServices = {
    // UI functions
    openTrackInspectorWindow: () => {},
    openTrackEffectsRackWindow: () => {},
    openTrackSequencerWindow: () => {},
    updateSequencerCellUI: () => {},
    openGlobalControlsWindow: () => {}, // For tempo click
    // Audio functions
    initAudioContextAndMasterMeter: async () => false,
    // Main.js managed UI elements (passed in via appContext to initializePrimaryEventListeners)
    // playBtnGlobal: null, // Reference to the global play button
    // recordBtnGlobal: null, // Reference to the global record button
    // midiInputSelectGlobal: null, // Reference to MIDI select dropdown
    // midiIndicatorGlobalEl: null,
    // keyboardIndicatorGlobalEl: null,
};

export function initializeEventHandlersModule(appServicesFromMain) {
    localAppServices = { ...localAppServices, ...appServicesFromMain };
}


export let currentlyPressedComputerKeys = {};
let currentOctaveShift = 0;
const MAX_OCTAVE_SHIFT = 2;
const MIN_OCTAVE_SHIFT = -2;
const OCTAVE_SHIFT_AMOUNT = 12;

// appContext here will be passed from main.js, containing necessary functions
export function initializePrimaryEventListeners(appContext) {
    // Store appContext for use in other event handlers if they are not instance methods
    // or if they need access to parts of appContext not directly passed.
    // For now, directly use what's destructured.
    const {
        addTrack, // from state.js via main
        openSoundBrowserWindow, // from ui.js via main
        undoLastAction, redoLastAction, // from state.js via main
        saveProject, loadProject, exportToWav, // from state.js via main
        openGlobalControlsWindow, // from ui.js via main
        openMixerWindow, // from ui.js via main
        openMasterEffectsRackWindow, // from ui.js via main
        handleProjectFileLoad, // from state.js via main
        triggerCustomBackgroundUpload, // from main.js
        removeCustomDesktopBackground // from main.js
    } = appContext;


    try {
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

        document.getElementById('menuOpenSoundBrowser')?.addEventListener('click', () => { if(openSoundBrowserWindow) openSoundBrowserWindow(); startMenu?.classList.add('hidden'); });

        document.getElementById('menuUndo')?.addEventListener('click', () => {
            if (!document.getElementById('menuUndo').classList.contains('disabled') && undoLastAction) {
                undoLastAction(); startMenu?.classList.add('hidden');
            }
        });
        document.getElementById('menuRedo')?.addEventListener('click', () => {
            if (!document.getElementById('menuRedo').classList.contains('disabled') && redoLastAction) {
                redoLastAction(); startMenu?.classList.add('hidden');
            }
        });

        document.getElementById('menuSaveProject')?.addEventListener('click', () => { if(saveProject) saveProject(); startMenu?.classList.add('hidden'); });
        document.getElementById('menuLoadProject')?.addEventListener('click', () => {
            if (loadProject) loadProject(); // loadProject (from state.js) now handles clicking the input
            startMenu?.classList.add('hidden');
        });
        document.getElementById('menuExportWav')?.addEventListener('click', () => { if(exportToWav) exportToWav(); startMenu?.classList.add('hidden'); });

        document.getElementById('menuOpenGlobalControls')?.addEventListener('click', () => { if(openGlobalControlsWindow) openGlobalControlsWindow(attachGlobalControlEvents); startMenu?.classList.add('hidden'); });
        document.getElementById('menuOpenMixer')?.addEventListener('click', () => { if(openMixerWindow) openMixerWindow(); startMenu?.classList.add('hidden'); });
        document.getElementById('menuOpenMasterEffects')?.addEventListener('click', () => { if(openMasterEffectsRackWindow) openMasterEffectsRackWindow(); startMenu?.classList.add('hidden'); });


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
            // Use the openGlobalControlsWindow from the passed appContext
            if(openGlobalControlsWindow) openGlobalControlsWindow(attachGlobalControlEvents);
        });

        const loadProjectInputEl = document.getElementById('loadProjectInput');
        if (loadProjectInputEl && handleProjectFileLoad) { // handleProjectFileLoad from state.js via appContext
            loadProjectInputEl.addEventListener('change', handleProjectFileLoad);
        }

        document.addEventListener('keydown', handleComputerKeyDown);
        document.addEventListener('keyup', handleComputerKeyUp);

        // Transport events are global to Tone.js, no direct appContext needed here
        // but the UI updates they trigger might use appContext.uiElements
        if (typeof window !== 'undefined' && !window.transportEventsInitialized && typeof Tone !== 'undefined' && Tone.Transport) {
            Tone.Transport.on('start', () => {
                if (appContext.uiElements?.playBtnGlobal) appContext.uiElements.playBtnGlobal.textContent = 'Pause';
                // Also update the main play button if it's separate and managed by main.js
                const mainPlayBtn = document.getElementById('playBtn'); // Assuming an ID for a main play button if it exists
                if (mainPlayBtn) mainPlayBtn.textContent = 'Pause';
            });
            Tone.Transport.on('pause', () => {
                if (appContext.uiElements?.playBtnGlobal) appContext.uiElements.playBtnGlobal.textContent = 'Play';
                const mainPlayBtn = document.getElementById('playBtn');
                if (mainPlayBtn) mainPlayBtn.textContent = 'Play';

                if (isTrackRecording()) { // isTrackRecording from state.js
                    setIsRecording(false); // from state.js
                    if(appContext.uiElements?.recordBtnGlobal) { appContext.uiElements.recordBtnGlobal.textContent = 'Record'; appContext.uiElements.recordBtnGlobal.classList.remove('recording');}
                    showNotification("Recording stopped due to transport pause.", 2000);
                    captureStateForUndo(`Stop Recording (transport paused)`); // from state.js
                    setRecordingTrackId(null); // from state.js
                }
            });
            Tone.Transport.on('stop', () => {
                if (appContext.uiElements?.playBtnGlobal) appContext.uiElements.playBtnGlobal.textContent = 'Play';
                const mainPlayBtn = document.getElementById('playBtn');
                if (mainPlayBtn) mainPlayBtn.textContent = 'Play';

                document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));
                if (isTrackRecording()) {
                    setIsRecording(false);
                    if(appContext.uiElements?.recordBtnGlobal) { appContext.uiElements.recordBtnGlobal.textContent = 'Record'; appContext.uiElements.recordBtnGlobal.classList.remove('recording');}
                    showNotification("Recording stopped due to transport stop.", 2000);
                    captureStateForUndo(`Stop Recording (transport stopped)`);
                    setRecordingTrackId(null);
                }
            });
            if (typeof window !== 'undefined') window.transportEventsInitialized = true;
        }
    } catch (error) {
        console.error("[EventHandlers] Error during initializePrimaryEventListeners:", error);
    }
}

// globalControlsElements are passed from main.js after the window is created
export function attachGlobalControlEvents(globalControlsElements) {
    if (!globalControlsElements) {
        console.error("[EventHandlers] attachGlobalControlEvents: globalControlsElements is null.");
        return;
    }
    const { playBtnGlobal, recordBtnGlobal, tempoGlobalInput, midiInputSelectGlobal } = globalControlsElements;

    if (playBtnGlobal) {
        playBtnGlobal.addEventListener('click', async () => {
            const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
            if (!audioReady) {
                showNotification("Audio system not ready. Please try again.", 3000);
                return;
            }
            if (Tone.Transport.state !== 'started') {
                Tone.Transport.position = 0;
                document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));
                Tone.Transport.start();
            } else {
                Tone.Transport.pause();
            }
        });
    }

    if (recordBtnGlobal) {
        recordBtnGlobal.addEventListener('click', async () => {
            const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
            if (!audioReady) {
                showNotification("Audio system not ready for recording.", 3000);
                return;
            }
            if (!isTrackRecording()) {
                const currentArmedTrackId = getArmedTrackId();
                if (currentArmedTrackId === null) { // Explicitly check for null
                    showNotification("No track armed for recording.", 3000);
                    return;
                }
                const trackToRecord = getTrackById(currentArmedTrackId);
                if (!trackToRecord) { showNotification("Armed track not found.", 3000); return; }

                setIsRecording(true);
                setRecordingTrackId(currentArmedTrackId);
                setRecordingStartTime(Tone.Transport.seconds);
                recordBtnGlobal.textContent = 'Stop Rec'; recordBtnGlobal.classList.add('recording');
                // Update main record button if it exists and is managed
                if (localAppServices.uiElements?.mainRecordBtn) {
                    localAppServices.uiElements.mainRecordBtn.textContent = 'Stop Rec';
                    localAppServices.uiElements.mainRecordBtn.classList.add('recording');
                }

                showNotification(`Recording started for ${trackToRecord.name}.`, 2000);
                captureStateForUndo(`Start Recording on ${trackToRecord.name}`);
                if (Tone.Transport.state !== 'started') {
                    Tone.Transport.position = 0;
                    document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));
                    Tone.Transport.start();
                }
            } else {
                setIsRecording(false);
                recordBtnGlobal.textContent = 'Record'; recordBtnGlobal.classList.remove('recording');
                if (localAppServices.uiElements?.mainRecordBtn) {
                    localAppServices.uiElements.mainRecordBtn.textContent = 'Record';
                    localAppServices.uiElements.mainRecordBtn.classList.remove('recording');
                }
                const recordedTrack = getTrackById(getRecordingTrackId());
                showNotification("Recording stopped.", 2000);
                captureStateForUndo(`Stop Recording (Track: ${recordedTrack?.name || 'Unknown'})`);
                setRecordingTrackId(null);
            }
        });
    }

    if (tempoGlobalInput) {
        tempoGlobalInput.addEventListener('change', (e) => {
            const newTempo = parseFloat(e.target.value);
            if (!isNaN(newTempo) && newTempo >= Constants.MIN_TEMPO && newTempo <= Constants.MAX_TEMPO) {
                if (Tone.Transport.bpm.value !== newTempo) captureStateForUndo(`Set Tempo to ${newTempo.toFixed(1)} BPM`);
                Tone.Transport.bpm.value = newTempo;
                if(localAppServices.updateTaskbarTempoDisplay) localAppServices.updateTaskbarTempoDisplay(newTempo);
            } else {
                e.target.value = Tone.Transport.bpm.value.toFixed(1);
                showNotification(`Tempo must be between ${Constants.MIN_TEMPO} and ${Constants.MAX_TEMPO}.`, 2500);
            }
        });
    }

    if (midiInputSelectGlobal) {
        midiInputSelectGlobal.onchange = () => {
            const oldMidiName = (typeof window !== 'undefined' && window.activeMIDIInput) ? window.activeMIDIInput.name : "No MIDI Input";
            const newMidiId = midiInputSelectGlobal.value;
            const newMidiDevice = (typeof window !== 'undefined' && window.midiAccess && newMidiId) ? window.midiAccess.inputs.get(newMidiId) : null;
            const newMidiName = newMidiDevice ? newMidiDevice.name : "No MIDI Input";
            if (oldMidiName !== newMidiName) {
                 captureStateForUndo(`Change MIDI Input to ${newMidiName}`);
            }
            selectMIDIInput(newMidiId); // Pass ID directly
        };
    }
}


export async function setupMIDI() {
    if (typeof window === 'undefined') return; // Guard for non-browser environments

    if (navigator.requestMIDIAccess) {
        try {
            window.midiAccess = await navigator.requestMIDIAccess();
            populateMIDIInputs();
            window.midiAccess.onstatechange = populateMIDIInputs;
        } catch (e) {
            console.error("[EventHandlers] Could not access MIDI devices.", e);
            showNotification(`Could not access MIDI: ${e.message}.`, 6000);
        }
    } else {
        showNotification("Web MIDI API not supported in this browser.", 3000);
    }
}

function populateMIDIInputs() {
    if (typeof window === 'undefined' || !window.midiAccess || !localAppServices.uiElements?.midiInputSelectGlobal) {
        return;
    }
    const midiSelect = localAppServices.uiElements.midiInputSelectGlobal;
    const previouslySelectedId = window.activeMIDIInput ? window.activeMIDIInput.id : midiSelect.value;
    midiSelect.innerHTML = '<option value="">No MIDI Input</option>';

    const inputs = window.midiAccess.inputs;
    if (inputs.size > 0) {
        inputs.forEach(input => {
            const option = document.createElement('option');
            option.value = input.id;
            option.textContent = input.name;
            midiSelect.appendChild(option);
        });
    }

    if (previouslySelectedId && window.midiAccess.inputs.get(previouslySelectedId)) {
        midiSelect.value = previouslySelectedId;
    } else {
        midiSelect.value = "";
    }
    selectMIDIInput(midiSelect.value, true); // true to skip notification/undo
}

export function selectMIDIInput(selectedId, skipUndoCaptureAndNotification = false) {
    if (typeof window === 'undefined') return;

    if (window.activeMIDIInput) {
        window.activeMIDIInput.onmidimessage = null;
    }
    window.activeMIDIInput = null;

    if (window.midiAccess && selectedId) {
        const inputDevice = window.midiAccess.inputs.get(selectedId);
        if (inputDevice) {
            window.activeMIDIInput = inputDevice;
            window.activeMIDIInput.onmidimessage = handleMIDIMessage; // handleMIDIMessage defined below
            if (!skipUndoCaptureAndNotification) {
                showNotification(`MIDI Input: ${window.activeMIDIInput.name} selected.`, 2000);
            }
        } else {
             if (!skipUndoCaptureAndNotification) showNotification("Selected MIDI input not found.", 2000);
        }
    } else {
        if (!skipUndoCaptureAndNotification && selectedId === "") showNotification("MIDI Input deselected.", 1500);
    }
    if (localAppServices.uiElements?.midiIndicatorGlobalEl) {
        localAppServices.uiElements.midiIndicatorGlobalEl.classList.toggle('active', !!window.activeMIDIInput);
    }
}


export async function handleMIDIMessage(message) {
    const [command, note, velocityByte] = message.data;
    const time = Tone.now();
    const normVel = velocityByte / 127;

    if (localAppServices.uiElements?.midiIndicatorGlobalEl) {
        localAppServices.uiElements.midiIndicatorGlobalEl.classList.add('active');
        setTimeout(() => localAppServices.uiElements.midiIndicatorGlobalEl.classList.remove('active'), 100);
    }

    if (command === 144 && velocityByte > 0) { // Note On
        const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
        if (!audioReady) return;
    }

    const currentRecordingTrackId = getRecordingTrackId();
    if (isTrackRecording() && getArmedTrackId() === currentRecordingTrackId && command === 144 && velocityByte > 0) {
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

                if (localAppServices.updateSequencerCellUI) {
                    localAppServices.updateSequencerCellUI(track.id, rowIndex, currentStep, true);
                }
            }
        }
    }

    const currentArmedTrackId = getArmedTrackId();
    if (currentArmedTrackId === null) return; // Explicitly check for null
    const currentArmedTrack = getTrackById(currentArmedTrackId);
    if (!currentArmedTrack) return;

    if (command === 144 && velocityByte > 0) {
        if (currentArmedTrack.type === 'Synth' && currentArmedTrack.instrument) {
            currentArmedTrack.instrument.triggerAttack(Tone.Frequency(note, "midi").toNote(), time, normVel);
        } else if (currentArmedTrack.type === 'Sampler' && localAppServices.playSlicePreview) {
            const sliceIdx = note - Constants.samplerMIDINoteStart;
            if (sliceIdx >= 0 && sliceIdx < currentArmedTrack.slices.length) {
                localAppServices.playSlicePreview(currentArmedTrack.id, sliceIdx, normVel);
            }
        } else if (currentArmedTrack.type === 'DrumSampler' && localAppServices.playDrumSamplerPadPreview) {
            const padIndex = note - Constants.samplerMIDINoteStart;
            if (padIndex >= 0 && padIndex < Constants.numDrumSamplerPads) {
                localAppServices.playDrumSamplerPadPreview(currentArmedTrack.id, padIndex, normVel);
            }
        } else if (currentArmedTrack.type === 'InstrumentSampler' && currentArmedTrack.toneSampler?.loaded) {
            if (!currentArmedTrack.instrumentSamplerIsPolyphonic) {
                currentArmedTrack.toneSampler.releaseAll(time);
            }
            currentArmedTrack.toneSampler.triggerAttack(Tone.Frequency(note, "midi").toNote(), time, normVel);
        }
    } else if (command === 128 || (command === 144 && velocityByte === 0)) { // Note Off
        if (currentArmedTrack.type === 'Synth' && currentArmedTrack.instrument) {
            currentArmedTrack.instrument.triggerRelease(time + 0.05);
        } else if (currentArmedTrack.type === 'InstrumentSampler' && currentArmedTrack.toneSampler?.loaded) {
            if (currentArmedTrack.instrumentSamplerIsPolyphonic) {
                 currentArmedTrack.toneSampler.triggerRelease(Tone.Frequency(note, "midi").toNote(), time + 0.05);
            }
        }
    }
}

async function handleComputerKeyDown(e) {
    console.log('[EventHandlers] handleComputerKeyDown triggered. Key:', e.code, 'Target:', e.target.tagName);

    if (e.code === 'Space') {
        e.preventDefault();
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
            if (localAppServices.uiElements?.playBtnGlobal && typeof localAppServices.uiElements.playBtnGlobal.click === 'function') {
                localAppServices.uiElements.playBtnGlobal.click();
            }
        }
        return;
    }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        console.log('[EventHandlers] Input field focused, ignoring key for note play.');
        return;
    }


    if (e.code === 'KeyZ' || e.code === 'KeyX') {
        if (!currentlyPressedComputerKeys[e.code]) {
            if (e.code === 'KeyZ' && currentOctaveShift > MIN_OCTAVE_SHIFT) currentOctaveShift--;
            else if (e.code === 'KeyX' && currentOctaveShift < MAX_OCTAVE_SHIFT) currentOctaveShift++;
            else { showNotification(`Octave limit reached.`, 1000); return; }
            showNotification(`Octave: ${currentOctaveShift >= 0 ? '+' : ''}${currentOctaveShift}`, 1000);
        }
        currentlyPressedComputerKeys[e.code] = true;
        if(localAppServices.uiElements?.keyboardIndicatorGlobalEl) localAppServices.uiElements.keyboardIndicatorGlobalEl.classList.add('active');
        return;
    }

    if (e.repeat || currentlyPressedComputerKeys[e.code]) {
        console.log('[EventHandlers] Key repeat or already pressed, skipping. Code:', e.code);
        return;
    }
    currentlyPressedComputerKeys[e.code] = true;
    if(localAppServices.uiElements?.keyboardIndicatorGlobalEl) localAppServices.uiElements.keyboardIndicatorGlobalEl.classList.add('active');

    const time = Tone.now();
    const baseComputerKeyNote = Constants.computerKeySynthMap[e.code] || Constants.computerKeySamplerMap[e.code];
    console.log('[EventHandlers] baseComputerKeyNote:', baseComputerKeyNote, 'for key:', e.code);

    if (baseComputerKeyNote === undefined) {
        console.log('[EventHandlers] Key not mapped for notes.');
        return;
    }

    const computerKeyNote = baseComputerKeyNote + (currentOctaveShift * OCTAVE_SHIFT_AMOUNT);
    console.log('[EventHandlers] computerKeyNote (with octave shift):', computerKeyNote);

    if (computerKeyNote < 0 || computerKeyNote > 127) {
        console.log('[EventHandlers] Note out of MIDI range.');
        return;
    }

    const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
    console.log('[EventHandlers] audioReady from initAudioContextAndMasterMeter:', audioReady);

    if (!audioReady) {
        console.warn('[EventHandlers] Audio not ready, note play aborted.');
        delete currentlyPressedComputerKeys[e.code];
        if(localAppServices.uiElements?.keyboardIndicatorGlobalEl && Object.keys(currentlyPressedComputerKeys).filter(k => k !== 'KeyZ' && k !== 'KeyX').length === 0) {
            localAppServices.uiElements.keyboardIndicatorGlobalEl.classList.remove('active');
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
                track.sequenceData[rowIndex][currentStep] = { active: true, velocity: Constants.defaultVelocity };
                if (localAppServices.updateSequencerCellUI) {
                    localAppServices.updateSequencerCellUI(track.id, rowIndex, currentStep, true);
                }
            }
        }
    }

    const currentArmedTrackId = getArmedTrackId();
    console.log('[EventHandlers] currentArmedTrackId for note play:', currentArmedTrackId);

    // *** THIS IS THE CORRECTED LOGIC ***
    if (currentArmedTrackId === null || typeof currentArmedTrackId === 'undefined') {
        console.log('[EventHandlers] No track armed (currentArmedTrackId is null or undefined), note play aborted.');
        return;
    }
    const currentArmedTrack = getTrackById(currentArmedTrackId);
    console.log('[EventHandlers] currentArmedTrack for note play:', currentArmedTrack ? currentArmedTrack.name : 'null', 'Type:', currentArmedTrack ? currentArmedTrack.type : 'N/A');

    if (!currentArmedTrack) {
        console.warn('[EventHandlers] Armed track object not found, note play aborted.');
        return;
    }

    if (currentArmedTrack.type === 'Synth' && Constants.computerKeySynthMap[e.code]) {
        if (currentArmedTrack.instrument) {
            console.log('[EventHandlers] Synth track armed. Instrument:', currentArmedTrack.instrument.name, 'Disposed:', currentArmedTrack.instrument.disposed, 'Volume:', currentArmedTrack.instrument.volume?.value);
            console.log('[EventHandlers] Playing Synth note:', Tone.Frequency(computerKeyNote, "midi").toNote(), 'at time:', time, 'with velocity:', Constants.defaultVelocity);
            currentArmedTrack.instrument.triggerAttack(Tone.Frequency(computerKeyNote, "midi").toNote(), time, Constants.defaultVelocity);
        } else {
            console.warn('[EventHandlers] Synth track armed, but instrument is NULL.');
        }
    } else if (currentArmedTrack.type === 'Sampler' && Constants.computerKeySamplerMap[e.code] !== undefined && localAppServices.playSlicePreview) {
        const sliceIdx = (baseComputerKeyNote - Constants.samplerMIDINoteStart) + (currentOctaveShift * Constants.numSlices);
        if (sliceIdx >= 0 && sliceIdx < currentArmedTrack.slices.length) {
            console.log('[EventHandlers] Playing Sampler slice:', sliceIdx);
            localAppServices.playSlicePreview(currentArmedTrack.id, sliceIdx, Constants.defaultVelocity);
        }
    } else if (currentArmedTrack.type === 'DrumSampler' && Constants.computerKeySamplerMap[e.code] !== undefined && localAppServices.playDrumSamplerPadPreview) {
        const padIndex = (baseComputerKeyNote - Constants.samplerMIDINoteStart) + (currentOctaveShift * Constants.numDrumSamplerPads);
        if (padIndex >= 0 && padIndex < Constants.numDrumSamplerPads) {
            console.log('[EventHandlers] Playing DrumSampler pad:', padIndex);
            localAppServices.playDrumSamplerPadPreview(currentArmedTrack.id, padIndex, Constants.defaultVelocity);
        }
    } else if (currentArmedTrack.type === 'InstrumentSampler' && Constants.computerKeySynthMap[e.code] && currentArmedTrack.toneSampler) {
        if (currentArmedTrack.toneSampler.loaded) {
            console.log('[EventHandlers] InstrumentSampler track armed. ToneSampler loaded. Poly:', currentArmedTrack.instrumentSamplerIsPolyphonic);
            if (!currentArmedTrack.instrumentSamplerIsPolyphonic) currentArmedTrack.toneSampler.releaseAll(time);
            console.log('[EventHandlers] Playing InstrumentSampler note:', Tone.Frequency(computerKeyNote, "midi").toNote());
            currentArmedTrack.toneSampler.triggerAttack(Tone.Frequency(computerKeyNote, "midi").toNote(), time, Constants.defaultVelocity);
        } else {
            console.warn('[EventHandlers] InstrumentSampler armed, but toneSampler not loaded.');
        }
    } else {
        console.log('[EventHandlers] No matching condition to play note for track type:', currentArmedTrack.type, 'and key map:', Constants.computerKeySynthMap[e.code] ? 'SynthMap' : (Constants.computerKeySamplerMap[e.code] ? 'SamplerMap' : 'None'));
    }
}

function handleComputerKeyUp(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA' || e.code === 'Space') return;
    console.log('[EventHandlers] handleComputerKeyUp triggered. Key:', e.code);

    const isOctaveKey = (e.code === 'KeyZ' || e.code === 'KeyX');
    if (isOctaveKey) {
        delete currentlyPressedComputerKeys[e.code];
    } else if (currentlyPressedComputerKeys[e.code]) {
        const time = Tone.now();
        const currentArmedTrack = getTrackById(getArmedTrackId());
        if (currentArmedTrack) {
            console.log('[EventHandlers KeyUp] currentArmedTrack:', currentArmedTrack.name, 'Type:', currentArmedTrack.type);
            const isSynthKey = Constants.computerKeySynthMap[e.code] !== undefined;
            const baseComputerKeyNote = Constants.computerKeySynthMap[e.code] || Constants.computerKeySamplerMap[e.code];

            if (baseComputerKeyNote !== undefined) {
                const computerKeyNote = baseComputerKeyNote + (currentOctaveShift * OCTAVE_SHIFT_AMOUNT);
                if (computerKeyNote >= 0 && computerKeyNote <= 127) {
                    if (currentArmedTrack.type === 'Synth' && isSynthKey && currentArmedTrack.instrument) {
                        console.log('[EventHandlers KeyUp] Releasing Synth note:', Tone.Frequency(computerKeyNote, "midi").toNote());
                        currentArmedTrack.instrument.triggerRelease(time + 0.05);
                    } else if (currentArmedTrack.type === 'InstrumentSampler' && isSynthKey && currentArmedTrack.toneSampler?.loaded) {
                        if (currentArmedTrack.instrumentSamplerIsPolyphonic) {
                            console.log('[EventHandlers KeyUp] Releasing InstrumentSampler note:', Tone.Frequency(computerKeyNote, "midi").toNote());
                            currentArmedTrack.toneSampler.triggerRelease(Tone.Frequency(computerKeyNote, "midi").toNote(), time + 0.05);
                        }
                        // For monophonic InstrumentSampler, releaseAll is handled on next note attack.
                    }
                }
            }
        }
        delete currentlyPressedComputerKeys[e.code];
    }

    const noteKeysPressed = Object.keys(currentlyPressedComputerKeys).some(key => key !== 'KeyZ' && key !== 'KeyX');
    if(localAppServices.uiElements?.keyboardIndicatorGlobalEl && !noteKeysPressed && !currentlyPressedComputerKeys['KeyZ'] && !currentlyPressedComputerKeys['KeyX']) {
        localAppServices.uiElements.keyboardIndicatorGlobalEl.classList.remove('active');
    }
}

// These handlers are called by UI elements (e.g., buttons in inspector or mixer)
// They primarily interact with the state module.
export function handleTrackMute(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    captureStateForUndo(`${track.isMuted ? "Unmute" : "Mute"} Track "${track.name}"`);
    track.isMuted = !track.isMuted;
    track.applyMuteState();
    if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(trackId, 'muteChanged');
}

export function handleTrackSolo(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    const currentGlobalSoloId = getSoloedTrackId();
    const isCurrentlySoloed = currentGlobalSoloId === track.id;
    captureStateForUndo(`${isCurrentlySoloed ? "Unsolo" : "Solo"} Track "${track.name}"`);
    setSoloedTrackId(isCurrentlySoloed ? null : track.id);
    getTracks().forEach(t => {
        t.isSoloed = (getSoloedTrackId() === t.id);
        t.applySoloState();
        if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(t.id, 'soloChanged');
    });
}

export function handleTrackArm(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    const currentArmedId = getArmedTrackId();
    const isCurrentlyArmed = currentArmedId === track.id;
    captureStateForUndo(`${isCurrentlyArmed ? "Disarm" : "Arm"} Track "${track.name}" for Input`);
    setArmedTrackId(isCurrentlyArmed ? null : track.id);
    const newArmedTrack = getTrackById(getArmedTrackId());
    showNotification(newArmedTrack ? `${newArmedTrack.name} armed for input.` : "Input disarmed.", 1500);
    getTracks().forEach(t => {
        if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(t.id, 'armChanged');
    });
}

export function handleRemoveTrack(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    showConfirmationDialog(
        'Confirm Delete Track',
        `Are you sure you want to remove track "${track.name}"? This can be undone.`,
        () => {
            coreRemoveTrackFromState(trackId); // This is the imported removeTrackFromState from state.js
        }
    );
}

// These are called by UI elements to open windows.
// They now use the localAppServices which should be populated by main.js with UI functions.
export function handleOpenTrackInspector(trackId) {
    if (localAppServices.openTrackInspectorWindow) localAppServices.openTrackInspectorWindow(trackId);
}
export function handleOpenEffectsRack(trackId) {
    if (localAppServices.openTrackEffectsRackWindow) localAppServices.openTrackEffectsRackWindow(trackId);
}
export function handleOpenSequencer(trackId) {
    if (localAppServices.openTrackSequencerWindow) localAppServices.openTrackSequencerWindow(trackId);
}
