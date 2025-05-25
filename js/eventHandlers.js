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

// `appContext` will contain callbacks for Start Menu actions and other globally needed functions
export function initializePrimaryEventListeners(appContext) {
    const {
        // Callbacks from appContext
        addTrack, openSoundBrowserWindow, undoLastAction, redoLastAction,
        saveProject, loadProject, exportToWav,
        openGlobalControlsWindow, openMixerWindow,
        // DOM elements (still queried directly for now, could be passed in appContext too)
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

    // Start Menu Item Event Listeners - Now using appContext
    document.getElementById('menuAddSynthTrack')?.addEventListener('click', () => { addTrack('Synth', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); });
    document.getElementById('menuAddSamplerTrack')?.addEventListener('click', () => { addTrack('Sampler', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); });
    document.getElementById('menuAddDrumSamplerTrack')?.addEventListener('click', () => { addTrack('DrumSampler', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); });
    document.getElementById('menuAddInstrumentSamplerTrack')?.addEventListener('click', () => { addTrack('InstrumentSampler', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); });
    
    document.getElementById('menuOpenSoundBrowser')?.addEventListener('click', () => { openSoundBrowserWindow(); startMenu?.classList.add('hidden'); });
    
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
        // loadProject (from state.js) is now just a trigger for the input element.
        // The actual file handling is done by handleProjectFileLoad (also from state.js)
        // which is attached to the input's 'change' event.
        document.getElementById('loadProjectInput').click(); 
        startMenu?.classList.add('hidden'); 
    });
    document.getElementById('menuExportWav')?.addEventListener('click', () => { exportToWav(); startMenu?.classList.add('hidden'); });
    
    document.getElementById('menuOpenGlobalControls')?.addEventListener('click', () => { openGlobalControlsWindow(); startMenu?.classList.add('hidden'); });
    document.getElementById('menuOpenMixer')?.addEventListener('click', () => { openMixerWindow(); startMenu?.classList.add('hidden'); });
    
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
        openGlobalControlsWindow(); // This is fine as openGlobalControlsWindow is part of appContext
    });

    // The 'change' listener for loadProjectInput is better placed in main.js or where appContext.handleProjectFileLoad is defined
    // For now, we assume it's correctly attached in main.js or via a more direct mechanism.
    // If appContext included handleProjectFileLoad:
    // document.getElementById('loadProjectInput')?.addEventListener('change', appContext.handleProjectFileLoad);

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
    // This function now assumes that the functions it calls (like initAudioContextAndMasterMeter, captureStateForUndo)
    // are available, likely through window or passed via a broader app context if this function itself was part of a class.
    globalControlsWindowElement.querySelector('#playBtnGlobal')?.addEventListener('click', async () => {
        try {
            if (typeof window.initAudioContextAndMasterMeter === 'function') await window.initAudioContextAndMasterMeter();
            if (Tone.Transport.state !== 'started') {
                Tone.Transport.position = 0; Tone.Transport.start();
            } else { Tone.Transport.pause(); }
        } catch (error) { console.error("Error in play/pause click:", error); }
    });

    globalControlsWindowElement.querySelector('#recordBtnGlobal')?.addEventListener('click', async () => {
         try {
            if (typeof window.initAudioContextAndMasterMeter === 'function') await window.initAudioContextAndMasterMeter();
            if (!isTrackRecording()) {
                const currentArmedTrackId = getArmedTrackId();
                if (!currentArmedTrackId) { showNotification("No track armed for recording.", 3000); return; }
                const trackToRecord = getTrackById(currentArmedTrackId);
                if (!trackToRecord) { showNotification("Armed track not found.", 3000); return; }
                setIsRecording(true); setRecordingTrackId(currentArmedTrackId); setRecordingStartTime(Tone.Transport.seconds);
                if(window.recordBtn) {window.recordBtn.textContent = 'Stop Rec'; window.recordBtn.classList.add('recording');}
                showNotification(`Recording started for ${trackToRecord.name}.`, 2000);
                captureStateForUndo(`Start Recording on ${trackToRecord.name}`);
                if (Tone.Transport.state !== 'started') { Tone.Transport.position = 0; Tone.Transport.start(); }
            } else {
                setIsRecording(false);
                if(window.recordBtn) {window.recordBtn.textContent = 'Record'; window.recordBtn.classList.remove('recording');}
                showNotification("Recording stopped.", 2000);
                captureStateForUndo(`Stop Recording (Track: ${getTrackById(getRecordingTrackId())?.name || 'Unknown'})`);
                setRecordingTrackId(null);
            }
        } catch (error) {
            console.error("Error in record button click:", error);
            showNotification("Error during recording setup.", 3000);
            if (window.recordBtn) { window.recordBtn.textContent = 'Record'; window.recordBtn.classList.remove('recording');}
            setIsRecording(false); setRecordingTrackId(null);
        }
    });

    globalControlsWindowElement.querySelector('#tempoGlobalInput')?.addEventListener('change', (e) => {
        const newTempo = parseFloat(e.target.value);
        const taskbarTempoDisplay = document.getElementById('taskbarTempoDisplay'); // Direct DOM access
        if (!isNaN(newTempo) && newTempo >= 40 && newTempo <= 240) {
            if (Tone.Transport.bpm.value !== newTempo) captureStateForUndo(`Set Tempo to ${newTempo.toFixed(1)} BPM`);
            Tone.Transport.bpm.value = newTempo;
            // updateTaskbarTempoDisplay should be a dedicated UI function
            if(taskbarTempoDisplay) taskbarTempoDisplay.textContent = `${newTempo.toFixed(1)} BPM`;
        } else { e.target.value = Tone.Transport.bpm.value.toFixed(1); }
    });

     if (window.midiInputSelectGlobal) { // Assumes midiInputSelectGlobal is on window
        window.midiInputSelectGlobal.onchange = () => { // This onchange itself is an event handler
            const oldMidiName = window.activeMIDIInput ? window.activeMIDIInput.name : "No MIDI Input";
            const newMidiId = window.midiInputSelectGlobal.value;
            const newMidiDevice = window.midiAccess && newMidiId ? window.midiAccess.inputs.get(newMidiId) : null;
            const newMidiName = newMidiDevice ? newMidiDevice.name : "No MIDI Input";
            if (oldMidiName !== newMidiName) {
                 captureStateForUndo(`Change MIDI Input to ${newMidiName}`);
            }
            selectMIDIInput(); // Calls local selectMIDIInput
        };
    }
}

export async function setupMIDI() {
    if (navigator.requestMIDIAccess) {
        try {
            window.midiAccess = await navigator.requestMIDIAccess();
            populateMIDIInputs();
            window.midiAccess.onstatechange = populateMIDIInputs;
            showNotification("MIDI ready.", 2000);
        } catch (e) {
            console.error("Could not access MIDI devices.", e);
            showNotification(`Could not access MIDI: ${e.message}. Ensure permissions.`, 6000);
        }
    } else {
        showNotification("Web MIDI API not supported in this browser.", 3000);
    }
}

function populateMIDIInputs() {
    if (!window.midiAccess || !window.midiInputSelectGlobal) return;
    const currentVal = window.midiInputSelectGlobal.value;
    window.midiInputSelectGlobal.innerHTML = '<option value="">No MIDI Input</option>';
    const inputs = window.midiAccess.inputs.values();
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        const option = document.createElement('option');
        option.value = input.value.id;
        option.textContent = input.value.name;
        window.midiInputSelectGlobal.appendChild(option);
    }
    if (currentVal && Array.from(window.midiInputSelectGlobal.options).some(opt => opt.value === currentVal)) {
        window.midiInputSelectGlobal.value = currentVal;
    } else if (window.midiAccess.inputs.size > 0) {
        window.midiInputSelectGlobal.value = window.midiAccess.inputs.values().next().value.id;
    }
    if (!window.midiInputSelectGlobal.onchange) { // Ensure it's set if not by attachGlobalControlEvents
        window.midiInputSelectGlobal.onchange = () => selectMIDIInput();
    }
    selectMIDIInput(true); // skipUndoCapture
}

function selectMIDIInput(skipUndoCapture = false) {
    if (window.activeMIDIInput && window.activeMIDIInput.onmidimessage) {
        window.activeMIDIInput.onmidimessage = null;
    }
    window.activeMIDIInput = null;
    const selectedId = window.midiInputSelectGlobal ? window.midiInputSelectGlobal.value : null;
    if (window.midiAccess && selectedId) {
        const inputDevice = window.midiAccess.inputs.get(selectedId);
        if (inputDevice) {
            window.activeMIDIInput = inputDevice;
            window.activeMIDIInput.onmidimessage = handleMIDIMessage; // Uses exported handleMIDIMessage
            if (!skipUndoCapture) {
                showNotification(`MIDI Input: ${window.activeMIDIInput.name} selected.`, 2000);
            }
        }
    }
    if (window.midiIndicatorGlobalEl) window.midiIndicatorGlobalEl.classList.toggle('active', !!window.activeMIDIInput);
}

export function handleMIDIMessage(message) {
    const [command, note, velocity] = message.data;
    const time = Tone.now();
    const normVel = velocity / 127;

    if (window.midiIndicatorGlobalEl) {
        window.midiIndicatorGlobalEl.classList.add('active');
        setTimeout(() => window.midiIndicatorGlobalEl.classList.remove('active'), 100);
    }

    if (isTrackRecording() && getArmedTrackId() === getRecordingTrackId() && command === 144 && velocity > 0) {
        const track = getTrackById(getRecordingTrackId());
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
                    if (cell && typeof window.updateSequencerCellUI === 'function') { // Check if UI update function is available
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

    if (command === 144 && velocity > 0) { // Note On
        if (currentArmedTrack.type === 'Synth' && currentArmedTrack.instrument) {
            currentArmedTrack.instrument.triggerAttack(Tone.Frequency(note, "midi").toNote(), time, normVel);
        } else if (currentArmedTrack.type === 'Sampler') {
            const sliceIdx = note - Constants.samplerMIDINoteStart;
            if (sliceIdx >= 0 && sliceIdx < currentArmedTrack.slices.length && typeof window.playSlicePreview === 'function') {
                window.playSlicePreview(currentArmedTrack.id, sliceIdx, normVel);
            }
        } else if (currentArmedTrack.type === 'DrumSampler') {
            const padIndex = note - Constants.samplerMIDINoteStart;
            if (padIndex >= 0 && padIndex < Constants.numDrumSamplerPads && typeof window.playDrumSamplerPadPreview === 'function') {
                window.playDrumSamplerPadPreview(currentArmedTrack.id, padIndex, normVel);
            }
        } else if (currentArmedTrack.type === 'InstrumentSampler' && currentArmedTrack.toneSampler && currentArmedTrack.toneSampler.loaded) {
            if (!currentArmedTrack.instrumentSamplerIsPolyphonic) {
                currentArmedTrack.toneSampler.releaseAll(time);
            }
            currentArmedTrack.toneSampler.triggerAttack(Tone.Frequency(note, "midi").toNote(), time, normVel);
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

function handleComputerKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    if (e.repeat || currentlyPressedComputerKeys[e.code]) return;
    
    currentlyPressedComputerKeys[e.code] = true;
    if(window.keyboardIndicatorGlobalEl) window.keyboardIndicatorGlobalEl.classList.add('active');
    
    const time = Tone.now();
    const computerKeyNote = Constants.computerKeySynthMap[e.code] || Constants.computerKeySamplerMap[e.code];
    const computerKeyVelocity = Constants.defaultVelocity;

    if (isTrackRecording() && getArmedTrackId() === getRecordingTrackId() && computerKeyNote !== undefined) {
        const track = getTrackById(getRecordingTrackId());
        if (track) {
            const currentTimeInSeconds = Tone.Transport.seconds;
            const sixteenthNoteDuration = Tone.Time("16n").toSeconds();
            let currentStep = Math.round(currentTimeInSeconds / sixteenthNoteDuration);
            currentStep = (currentStep % track.sequenceLength + track.sequenceLength) % track.sequenceLength;
            let rowIndex = -1;
            if ((track.type === 'Synth' || track.type === 'InstrumentSampler') && Constants.computerKeySynthMap[e.code]) {
                const pitchName = Tone.Frequency(Constants.computerKeySynthMap[e.code], "midi").toNote();
                rowIndex = Constants.synthPitches.indexOf(pitchName);
            } else if ((track.type === 'Sampler' || track.type === 'DrumSampler') && Constants.computerKeySamplerMap[e.code]) {
                const mappedNote = Constants.computerKeySamplerMap[e.code];
                if (track.type === 'Sampler') {
                     rowIndex = mappedNote - Constants.samplerMIDINoteStart;
                     if (rowIndex < 0 || rowIndex >= track.slices.length) rowIndex = -1;
                } else { 
                     rowIndex = mappedNote - Constants.samplerMIDINoteStart;
                     if (rowIndex < 0 || rowIndex >= Constants.numDrumSamplerPads) rowIndex = -1;
                }
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
        currentArmedTrack.instrument.triggerAttack(Tone.Frequency(Constants.computerKeySynthMap[e.code], "midi").toNote(), time, computerKeyVelocity);
    } else if (currentArmedTrack.type === 'Sampler' && Constants.computerKeySamplerMap[e.code] !== undefined) {
        const sliceIdx = Constants.computerKeySamplerMap[e.code] - Constants.samplerMIDINoteStart;
        if (sliceIdx >= 0 && sliceIdx < currentArmedTrack.slices.length && typeof window.playSlicePreview === 'function') {
            window.playSlicePreview(currentArmedTrack.id, sliceIdx, computerKeyVelocity);
        }
    } else if (currentArmedTrack.type === 'DrumSampler' && Constants.computerKeySamplerMap[e.code] !== undefined) {
        const padIndex = Constants.computerKeySamplerMap[e.code] - Constants.samplerMIDINoteStart;
        if (padIndex >= 0 && padIndex < Constants.numDrumSamplerPads && typeof window.playDrumSamplerPadPreview === 'function') {
            window.playDrumSamplerPadPreview(currentArmedTrack.id, padIndex, computerKeyVelocity);
        }
    } else if (currentArmedTrack.type === 'InstrumentSampler' && Constants.computerKeySynthMap[e.code] && currentArmedTrack.toneSampler && currentArmedTrack.toneSampler.loaded) {
        if (!currentArmedTrack.instrumentSamplerIsPolyphonic) {
            currentArmedTrack.toneSampler.releaseAll(time);
        }
        currentArmedTrack.toneSampler.triggerAttack(Tone.Frequency(Constants.computerKeySynthMap[e.code], "midi").toNote(), time, computerKeyVelocity);
    }
}

function handleComputerKeyUp(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    const time = Tone.now();
    const currentArmedTrackId = getArmedTrackId();

    if (currentArmedTrackId && currentlyPressedComputerKeys[e.code]) {
        const track = getTrackById(currentArmedTrackId);
        if (track) {
            if (track.type === 'Synth' && Constants.computerKeySynthMap[e.code] && track.instrument) {
                track.instrument.triggerRelease(Tone.Frequency(Constants.computerKeySynthMap[e.code], "midi").toNote(), time + 0.05);
            } else if (track.type === 'InstrumentSampler' && Constants.computerKeySynthMap[e.code] && track.toneSampler && track.toneSampler.loaded) {
                if (track.instrumentSamplerIsPolyphonic) {
                    track.toneSampler.triggerRelease(Tone.Frequency(Constants.computerKeySynthMap[e.code], "midi").toNote(), time + 0.05);
                }
            }
        }
    }
    delete currentlyPressedComputerKeys[e.code];
    if(window.keyboardIndicatorGlobalEl && Object.keys(currentlyPressedComputerKeys).length === 0) {
        window.keyboardIndicatorGlobalEl.classList.remove('active');
    }
}

// --- Track Action Handlers ---
export function handleTrackMute(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    captureStateForUndo(`${track.isMuted ? "Unmute" : "Mute"} Track "${track.name}"`);
    track.isMuted = !track.isMuted;
    track.applyMuteState();
    // UI Update:
    const inspectorMuteBtn = track.inspectorWindow?.element?.querySelector(`#muteBtn-${track.id}`);
    if (inspectorMuteBtn) inspectorMuteBtn.classList.toggle('muted', track.isMuted);
    const mixerMuteBtn = window.openWindows['mixer']?.element?.querySelector(`#mixerMuteBtn-${track.id}`);
    if (mixerMuteBtn) mixerMuteBtn.classList.toggle('muted', track.isMuted);
}

export function handleTrackSolo(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    const currentSoloId = getSoloedTrackId();
    captureStateForUndo(`${currentSoloId === track.id ? "Unsolo" : "Solo"} Track "${track.name}"`);

    if (currentSoloId === track.id) {
        setSoloedTrackId(null); track.isSoloed = false;
    } else {
        if (currentSoloId) {
            const prevSoloTrack = getTrackById(currentSoloId);
            if (prevSoloTrack) prevSoloTrack.isSoloed = false;
        }
        setSoloedTrackId(track.id); track.isSoloed = true;
    }
    getTracks().forEach(t => {
        t.applySoloState();
        const inspectorSoloBtn = t.inspectorWindow?.element?.querySelector(`#soloBtn-${t.id}`);
        if (inspectorSoloBtn) inspectorSoloBtn.classList.toggle('soloed', t.isSoloed);
        const mixerSoloBtn = window.openWindows['mixer']?.element?.querySelector(`#mixerSoloBtn-${t.id}`);
        if (mixerSoloBtn) mixerSoloBtn.classList.toggle('soloed', t.isSoloed);
    });
}

export function handleTrackArm(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    const currentArmedId = getArmedTrackId();
    captureStateForUndo(`${currentArmedId === track.id ? "Disarm" : "Arm"} Track "${track.name}" for Input`);
    if (currentArmedId === track.id) setArmedTrackId(null);
    else setArmedTrackId(track.id);

    getTracks().forEach(t => {
        const inspectorArmBtn = t.inspectorWindow?.element?.querySelector(`#armInputBtn-${t.id}`);
        if (inspectorArmBtn) inspectorArmBtn.classList.toggle('armed', getArmedTrackId() === t.id);
    });
    showNotification(getArmedTrackId() ? `${track.name} armed for input.` : "Input disarmed.", 1500);
}

export function handleRemoveTrack(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    showConfirmationDialog(
        'Confirm Delete Track',
        `Are you sure you want to remove track "${track.name}"?`,
        () => {
            coreRemoveTrackFromState(trackId);
        }
    );
}

// --- Window Opening Handlers ---
export function handleOpenTrackInspector(trackId) {
    if (typeof window.openTrackInspectorWindow === 'function') {
        window.openTrackInspectorWindow(trackId);
    } else {
        console.warn("openTrackInspectorWindow function not available.");
    }
}

export function handleOpenEffectsRack(trackId) {
    if (typeof window.openTrackEffectsRackWindow === 'function') {
        window.openTrackEffectsRackWindow(trackId);
    } else {
        console.warn("openTrackEffectsRackWindow function not available.");
    }
}

export function handleOpenSequencer(trackId) {
    if (typeof window.openTrackSequencerWindow === 'function') {
        window.openTrackSequencerWindow(trackId);
    } else {
        console.warn("openTrackSequencerWindow function not available.");
    }
}
