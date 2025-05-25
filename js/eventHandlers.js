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

export function initializePrimaryEventListeners(appContext) {
    const {
        addTrack, openSoundBrowserWindow, undoLastAction, redoLastAction,
        saveProject, loadProject, exportToWav,
        openGlobalControlsWindow, openMixerWindow,
        handleProjectFileLoad 
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

    // Menu item listeners
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
        // loadProject function (from state.js) now handles clicking the input
        if (typeof loadProject === 'function') loadProject();
        else document.getElementById('loadProjectInput')?.click(); 
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
        openGlobalControlsWindow(); // Open global controls to adjust tempo
    });

    // Project file loading
    const loadProjectInputEl = document.getElementById('loadProjectInput');
    if (loadProjectInputEl && typeof handleProjectFileLoad === 'function') {
        loadProjectInputEl.addEventListener('change', handleProjectFileLoad);
    } else if (!handleProjectFileLoad) {
        console.warn("[EventHandlers] handleProjectFileLoad function not provided via appContext. Project loading from file will not work.");
    } else if (!loadProjectInputEl) {
        console.warn("[EventHandlers] loadProjectInput element not found.");
    }

    // Keyboard input
    document.addEventListener('keydown', handleComputerKeyDown);
    document.addEventListener('keyup', handleComputerKeyUp);

    // Tone.Transport event listeners (ensure they are only added once)
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
            // Pass true to indicate this is a direct user initiation
            const audioReady = await window.initAudioContextAndMasterMeter(true); 
            if (!audioReady) {
                console.warn("[EventHandlers] Audio context not ready after play button click.");
                showNotification("Audio system not ready. Please try again or check browser permissions.", 3000);
                return;
            }

            if (Tone.Transport.state !== 'started') {
                // Reset position only if not already started, to allow resuming from pause point
                if (Tone.Transport.state !== 'paused') Tone.Transport.position = 0; 
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
            // Pass true to indicate this is a direct user initiation
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
                setRecordingStartTime(Tone.Transport.seconds); // Record start time relative to transport
                
                if(window.recordBtn) {window.recordBtn.textContent = 'Stop Rec'; window.recordBtn.classList.add('recording');}
                showNotification(`Recording started for ${trackToRecord.name}.`, 2000);
                captureStateForUndo(`Start Recording on ${trackToRecord.name}`);
                if (Tone.Transport.state !== 'started') { 
                    if (Tone.Transport.state !== 'paused') Tone.Transport.position = 0; 
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
        if (!isNaN(newTempo) && newTempo >= Constants.MIN_TEMPO && newTempo <= Constants.MAX_TEMPO) { // Assuming MIN/MAX_TEMPO in constants
            if (Tone.Transport.bpm.value !== newTempo) captureStateForUndo(`Set Tempo to ${newTempo.toFixed(1)} BPM`);
            Tone.Transport.bpm.value = newTempo;
            if(typeof window.updateTaskbarTempoDisplay === 'function') window.updateTaskbarTempoDisplay(newTempo);
            else if(taskbarTempoDisplay) taskbarTempoDisplay.textContent = `${newTempo.toFixed(1)} BPM`;
        } else { 
            e.target.value = Tone.Transport.bpm.value.toFixed(1); 
            showNotification(`Tempo must be between ${Constants.MIN_TEMPO} and ${Constants.MAX_TEMPO}.`, 2500);
        }
    });

     if (window.midiInputSelectGlobal) {
        window.midiInputSelectGlobal.onchange = () => {
            const oldMidiName = window.activeMIDIInput ? window.activeMIDIInput.name : "No MIDI Input";
            const newMidiId = window.midiInputSelectGlobal.value;
            const newMidiDevice = window.midiAccess && newMidiId ? window.midiAccess.inputs.get(newMidiId) : null;
            const newMidiName = newMidiDevice ? newMidiDevice.name : "No MIDI Input";
            if (oldMidiName !== newMidiName) { // Only capture undo if it actually changed
                 captureStateForUndo(`Change MIDI Input to ${newMidiName}`);
            }
            selectMIDIInput(); // This will set the activeMIDIInput
        };
    }
}


export async function setupMIDI() {
    if (navigator.requestMIDIAccess) {
        try {
            window.midiAccess = await navigator.requestMIDIAccess();
            populateMIDIInputs();
            window.midiAccess.onstatechange = populateMIDIInputs; // Listen for MIDI device changes
            showNotification("MIDI ready.", 2000);
        } catch (e) {
            console.error("[EventHandlers] Could not access MIDI devices.", e);
            showNotification(`Could not access MIDI: ${e.message}. Ensure permissions.`, 6000);
        }
    } else {
        showNotification("Web MIDI API not supported in this browser.", 3000);
    }
}

function populateMIDIInputs() {
    if (!window.midiAccess || !window.midiInputSelectGlobal) return;
    
    const previouslySelectedId = window.midiInputSelectGlobal.value;
    window.midiInputSelectGlobal.innerHTML = '<option value="">No MIDI Input</option>'; // Clear existing options
    
    const inputs = window.midiAccess.inputs.values();
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        const option = document.createElement('option');
        option.value = input.value.id;
        option.textContent = input.value.name;
        window.midiInputSelectGlobal.appendChild(option);
    }
    
    // Try to reselect the previously selected device if it still exists
    if (previouslySelectedId && Array.from(window.midiInputSelectGlobal.options).some(opt => opt.value === previouslySelectedId)) {
        window.midiInputSelectGlobal.value = previouslySelectedId;
    } else if (window.midiAccess.inputs.size > 0) {
        // If previous not found, select the first available one by default
        // window.midiInputSelectGlobal.value = window.midiAccess.inputs.values().next().value.id;
        // Or, better, leave it as "No MIDI Input" unless explicitly chosen or was previously set
    }
    
    // Ensure the onchange handler is attached
    if (!window.midiInputSelectGlobal.onchange) {
        window.midiInputSelectGlobal.onchange = () => selectMIDIInput();
    }
    selectMIDIInput(true); // Update active input, skip undo capture as this is system-driven
}

export function selectMIDIInput(skipUndoCapture = false) {
    if (window.activeMIDIInput && typeof window.activeMIDIInput.close === 'function') {
        // Though onmidimessage = null is often enough, some implementations might benefit from close()
        // However, closing and reopening might not be necessary if just changing the listener.
        // For now, just nullify the message handler.
        window.activeMIDIInput.onmidimessage = null;
    }
    window.activeMIDIInput = null; // Clear previous active input
    
    const selectedId = window.midiInputSelectGlobal ? window.midiInputSelectGlobal.value : null;
    
    if (window.midiAccess && selectedId) {
        const inputDevice = window.midiAccess.inputs.get(selectedId);
        if (inputDevice) {
            window.activeMIDIInput = inputDevice;
            window.activeMIDIInput.onmidimessage = handleMIDIMessage; // Attach listener to new input
            if (!skipUndoCapture) { // Only show notification and capture undo if user explicitly selected
                showNotification(`MIDI Input: ${window.activeMIDIInput.name} selected.`, 2000);
            }
        } else {
             if (!skipUndoCapture) showNotification("Selected MIDI input not found.", 2000);
        }
    } else {
        if (!skipUndoCapture && selectedId === "") showNotification("MIDI Input deselected.", 1500);
    }
    // Update MIDI indicator UI
    if (window.midiIndicatorGlobalEl) window.midiIndicatorGlobalEl.classList.toggle('active', !!window.activeMIDIInput);
}

export async function handleMIDIMessage(message) {
    const [command, note, velocity] = message.data;
    const time = Tone.now(); // Use Tone.now() for precise timing
    const normVel = velocity / 127;

    // MIDI activity indicator
    if (window.midiIndicatorGlobalEl) {
        window.midiIndicatorGlobalEl.classList.add('active');
        setTimeout(() => window.midiIndicatorGlobalEl.classList.remove('active'), 100);
    }
    
    // Ensure audio context is ready before processing MIDI notes that trigger sound
    if (command === 144 && velocity > 0) { // Note On
        const audioReady = await window.initAudioContextAndMasterMeter(true); // User interaction
        if (!audioReady) {
            console.warn("[EventHandlers] Audio context not ready for MIDI Note On.");
            return; 
        }
    }


    // Handle MIDI recording
    if (isTrackRecording() && getArmedTrackId() === getRecordingTrackId() && command === 144 && velocity > 0) {
        const track = getTrackById(getRecordingTrackId());
        if (track) {
            const currentTimeInSeconds = Tone.Transport.seconds;
            const sixteenthNoteDuration = Tone.Time("16n").toSeconds();
            // Quantize to the nearest 16th note step
            let currentStep = Math.round(currentTimeInSeconds / sixteenthNoteDuration); 
            // Ensure step is within sequence bounds (looping)
            currentStep = (currentStep % track.sequenceLength + track.sequenceLength) % track.sequenceLength; 
            
            let rowIndex = -1;
            if (track.type === 'Synth' || track.type === 'InstrumentSampler') {
                const pitchName = Tone.Frequency(note, "midi").toNote();
                rowIndex = Constants.synthPitches.indexOf(pitchName);
            } else if (track.type === 'Sampler') {
                rowIndex = note - Constants.samplerMIDINoteStart; // Map MIDI note to slice index
                if (rowIndex < 0 || rowIndex >= track.slices.length) rowIndex = -1;
            } else if (track.type === 'DrumSampler') {
                rowIndex = note - Constants.samplerMIDINoteStart; // Map MIDI note to pad index
                if (rowIndex < 0 || rowIndex >= Constants.numDrumSamplerPads) rowIndex = -1;
            }

            if (rowIndex !== -1 && currentStep >= 0 && currentStep < track.sequenceLength) {
                if (!track.sequenceData[rowIndex]) track.sequenceData[rowIndex] = Array(track.sequenceLength).fill(null);
                track.sequenceData[rowIndex][currentStep] = { active: true, velocity: normVel };
                
                // Update sequencer UI if open and active
                if (track.sequencerWindow && !track.sequencerWindow.isMinimized && getActiveSequencerTrackId() === track.id) {
                    const cell = track.sequencerWindow.element.querySelector(`.sequencer-step-cell[data-row="${rowIndex}"][data-col="${currentStep}"]`);
                    if (cell && typeof window.updateSequencerCellUI === 'function') {
                        window.updateSequencerCellUI(cell, track.type, true);
                    }
                }
            }
        }
    }

    // Handle live MIDI playback for armed track
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
                currentArmedTrack.toneSampler.releaseAll(time); // Monophonic behavior
            }
            currentArmedTrack.toneSampler.triggerAttack(Tone.Frequency(note, "midi").toNote(), time, normVel);
        } else if (currentArmedTrack.type === 'InstrumentSampler' && currentArmedTrack.toneSampler && !currentArmedTrack.toneSampler.loaded) {
            console.warn(`[EventHandlers] InstrumentSampler on track ${currentArmedTrack.id} not loaded, cannot play MIDI note.`);
        }
    } else if (command === 128 || (command === 144 && velocity === 0)) { // Note Off
        if (currentArmedTrack.type === 'Synth' && currentArmedTrack.instrument) {
            currentArmedTrack.instrument.triggerRelease(Tone.Frequency(note, "midi").toNote(), time + 0.05); // Slight delay for release
        } else if (currentArmedTrack.type === 'InstrumentSampler' && currentArmedTrack.toneSampler && currentArmedTrack.toneSampler.loaded) {
            if (currentArmedTrack.instrumentSamplerIsPolyphonic) { // Only trigger release if polyphonic
                currentArmedTrack.toneSampler.triggerRelease(Tone.Frequency(note, "midi").toNote(), time + 0.05);
            }
            // For monophonic InstrumentSampler, note-off might not be needed if retrigger handles it.
        }
        // Note: Sampler and DrumSampler previews are one-shot, so Note Off might not apply directly to them here.
    }
}

async function handleComputerKeyDown(e) {
    // Ignore if typing in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    if (e.repeat || currentlyPressedComputerKeys[e.code]) return; // Prevent retriggering if key is held
    
    currentlyPressedComputerKeys[e.code] = true;
    if(window.keyboardIndicatorGlobalEl) window.keyboardIndicatorGlobalEl.classList.add('active');
    
    const time = Tone.now();
    const computerKeyNote = Constants.computerKeySynthMap[e.code] || Constants.computerKeySamplerMap[e.code];
    const computerKeyVelocity = Constants.defaultVelocity;

    if (!computerKeyNote) return; // Not a mapped key

    // Ensure audio context is ready
    const audioReady = await window.initAudioContextAndMasterMeter(true); // User interaction
    if (!audioReady) {
        console.warn("[EventHandlers] Audio context not ready for Computer Key Down.");
        delete currentlyPressedComputerKeys[e.code]; // Release key if audio not ready
        if(window.keyboardIndicatorGlobalEl && Object.keys(currentlyPressedComputerKeys).length === 0) {
            window.keyboardIndicatorGlobalEl.classList.remove('active');
        }
        return;
    }

    // Handle recording computer keyboard input
    if (isTrackRecording() && getArmedTrackId() === getRecordingTrackId()) {
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
                } else { // DrumSampler
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
    
    // Handle live playback with computer keyboard
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
            currentArmedTrack.toneSampler.releaseAll(time); // Monophonic behavior
        }
        currentArmedTrack.toneSampler.triggerAttack(Tone.Frequency(Constants.computerKeySynthMap[e.code], "midi").toNote(), time, computerKeyVelocity);
    } else if (currentArmedTrack.type === 'InstrumentSampler' && currentArmedTrack.toneSampler && !currentArmedTrack.toneSampler.loaded) {
        console.warn(`[EventHandlers] InstrumentSampler on track ${currentArmedTrack.id} not loaded, cannot play note (KBD).`);
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
                if (track.instrumentSamplerIsPolyphonic) { // Only trigger release if polyphonic
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

export function handleTrackMute(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    captureStateForUndo(`${track.isMuted ? "Unmute" : "Mute"} Track "${track.name}"`);
    track.isMuted = !track.isMuted;
    track.applyMuteState(); // This updates the gain node based on new mute and current solo state
    
    // Update UI in Inspector
    const inspectorMuteBtn = track.inspectorWindow?.element?.querySelector(`#muteBtn-${track.id}`);
    if (inspectorMuteBtn) inspectorMuteBtn.classList.toggle('muted', track.isMuted);
    // Update UI in Mixer
    const mixerMuteBtn = window.openWindows['mixer']?.element?.querySelector(`#mixerMuteBtn-${track.id}`);
    if (mixerMuteBtn) mixerMuteBtn.classList.toggle('muted', track.isMuted);
}

export function handleTrackSolo(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    
    const currentGlobalSoloId = getSoloedTrackId();
    const isCurrentlySoloed = currentGlobalSoloId === track.id;

    captureStateForUndo(`${isCurrentlySoloed ? "Unsolo" : "Solo"} Track "${track.name}"`);

    if (isCurrentlySoloed) {
        setSoloedTrackId(null); // Unsolo this track
    } else {
        setSoloedTrackId(track.id); // Solo this track (this will also unsolo any other track)
    }
    
    // Update all tracks' solo states and UI
    getTracks().forEach(t => {
        t.isSoloed = (getSoloedTrackId() === t.id); // Update local isSoloed flag
        t.applySoloState(); // Recalculate gain based on new global solo state and own mute state
        
        // Update Inspector UI
        const inspectorSoloBtn = t.inspectorWindow?.element?.querySelector(`#soloBtn-${t.id}`);
        if (inspectorSoloBtn) inspectorSoloBtn.classList.toggle('soloed', t.isSoloed);
        // Update Mixer UI
        const mixerSoloBtn = window.openWindows['mixer']?.element?.querySelector(`#mixerSoloBtn-${t.id}`);
        if (mixerSoloBtn) mixerSoloBtn.classList.toggle('soloed', t.isSoloed);
    });
}

export function handleTrackArm(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    
    const currentArmedId = getArmedTrackId();
    const isCurrentlyArmed = currentArmedId === track.id;

    captureStateForUndo(`${isCurrentlyArmed ? "Disarm" : "Arm"} Track "${track.name}" for Input`);
    
    if (isCurrentlyArmed) {
        setArmedTrackId(null); // Disarm this track
    } else {
        setArmedTrackId(track.id); // Arm this track (implicitly disarms others if logic enforces single arm)
    }

    // Update UI for all tracks
    getTracks().forEach(t => {
        const inspectorArmBtn = t.inspectorWindow?.element?.querySelector(`#armInputBtn-${t.id}`);
        if (inspectorArmBtn) inspectorArmBtn.classList.toggle('armed', getArmedTrackId() === t.id);
    });
    
    const newArmedTrack = getTrackById(getArmedTrackId());
    showNotification(newArmedTrack ? `${newArmedTrack.name} armed for input.` : "Input disarmed.", 1500);
}

export function handleRemoveTrack(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    showConfirmationDialog(
        'Confirm Delete Track',
        `Are you sure you want to remove track "${track.name}"? This cannot be undone directly (only via project reload or undo history).`,
        () => {
            coreRemoveTrackFromState(trackId); // This is the function from state.js
        }
    );
}

// --- Window Opening Handlers ---
// These ensure that the global window opening functions are called.
// These are typically invoked from menu items or other UI elements.

export function handleOpenTrackInspector(trackId) {
    if (typeof window.openTrackInspectorWindow === 'function') {
        window.openTrackInspectorWindow(trackId);
    } else {
        console.warn("openTrackInspectorWindow function not available on window object.");
    }
}

export function handleOpenEffectsRack(trackId) {
    if (typeof window.openTrackEffectsRackWindow === 'function') {
        window.openTrackEffectsRackWindow(trackId);
    } else {
        console.warn("openTrackEffectsRackWindow function not available on window object.");
    }
}

export function handleOpenSequencer(trackId) {
    if (typeof window.openTrackSequencerWindow === 'function') {
        window.openTrackSequencerWindow(trackId);
    } else {
        console.warn("openTrackSequencerWindow function not available on window object.");
    }
}
