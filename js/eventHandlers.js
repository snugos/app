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
    console.log("[EventHandlers] initializePrimaryEventListeners called with appContext:", appContext);
    const {
        addTrack, openSoundBrowserWindow, undoLastAction, redoLastAction,
        saveProject, loadProject, exportToWav,
        openGlobalControlsWindow, openMixerWindow,
        openMasterEffectsRackWindow,
        handleProjectFileLoad,
        triggerCustomBackgroundUpload,
        removeCustomDesktopBackground
    } = appContext;

    try {
        const startButton = document.getElementById('startButton');
        const startMenu = document.getElementById('startMenu');
        startButton?.addEventListener('click', (e) => {
            e.stopPropagation();
            startMenu.classList.toggle('hidden');
            if (!startMenu.classList.contains('hidden')) {
                startButton.classList.add('active');
            } else {
                startButton.classList.remove('active');
            }
        });

        document.addEventListener('click', (e) => {
            if (startMenu && !startMenu.classList.contains('hidden') && startButton && !startButton.contains(e.target) && !startMenu.contains(e.target)) {
                startMenu.classList.add('hidden');
                startButton.classList.remove('active');
            }
        });

        document.getElementById('menuAddSynthTrack')?.addEventListener('click', () => { addTrack('Synth'); startMenu.classList.add('hidden'); startButton.classList.remove('active'); });
        document.getElementById('menuAddSamplerTrack')?.addEventListener('click', () => { addTrack('Sampler'); startMenu.classList.add('hidden'); startButton.classList.remove('active'); });
        document.getElementById('menuAddDrumSamplerTrack')?.addEventListener('click', () => { addTrack('DrumSampler'); startMenu.classList.add('hidden'); startButton.classList.remove('active'); });
        document.getElementById('menuAddInstrumentSamplerTrack')?.addEventListener('click', () => { addTrack('InstrumentSampler'); startMenu.classList.add('hidden'); startButton.classList.remove('active');});


        document.getElementById('menuOpenSoundBrowser')?.addEventListener('click', () => { openSoundBrowserWindow(); startMenu.classList.add('hidden'); startButton.classList.remove('active'); });
        document.getElementById('menuUndo')?.addEventListener('click', () => { if (!document.getElementById('menuUndo').classList.contains('disabled')) { undoLastAction(); } startMenu.classList.add('hidden'); startButton.classList.remove('active'); });
        document.getElementById('menuRedo')?.addEventListener('click', () => { if (!document.getElementById('menuRedo').classList.contains('disabled')) { redoLastAction(); } startMenu.classList.add('hidden'); startButton.classList.remove('active'); });
        document.getElementById('menuSaveProject')?.addEventListener('click', () => { saveProject(); startMenu.classList.add('hidden'); startButton.classList.remove('active'); });
        document.getElementById('menuLoadProject')?.addEventListener('click', () => { loadProject(); startMenu.classList.add('hidden'); startButton.classList.remove('active'); });
        document.getElementById('menuExportWav')?.addEventListener('click', () => { exportToWav(); startMenu.classList.add('hidden'); startButton.classList.remove('active'); });
        document.getElementById('menuOpenGlobalControls')?.addEventListener('click', () => { openGlobalControlsWindow(); startMenu.classList.add('hidden'); startButton.classList.remove('active'); });
        document.getElementById('menuOpenMixer')?.addEventListener('click', () => { openMixerWindow(); startMenu.classList.add('hidden'); startButton.classList.remove('active'); });
        document.getElementById('menuOpenMasterEffects')?.addEventListener('click', () => { openMasterEffectsRackWindow(); startMenu.classList.add('hidden'); startButton.classList.remove('active');});
        document.getElementById('menuUploadCustomBg')?.addEventListener('click', () => { triggerCustomBackgroundUpload(); startMenu.classList.add('hidden'); startButton.classList.remove('active'); });
        document.getElementById('menuRemoveCustomBg')?.addEventListener('click', () => { removeCustomDesktopBackground(); startMenu.classList.add('hidden'); startButton.classList.remove('active'); });

        
        document.getElementById('menuToggleFullScreen')?.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
            startMenu.classList.add('hidden');
            startButton.classList.remove('active');
        });


        const loadProjectInput = document.getElementById('loadProjectInput');
        loadProjectInput?.addEventListener('change', handleProjectFileLoad);

        const taskbarTempoDisplay = document.getElementById('taskbarTempoDisplay');
        if (taskbarTempoDisplay) {
            taskbarTempoDisplay.addEventListener('click', () => {
                if (window.openGlobalControlsWindow && typeof window.openGlobalControlsWindow === 'function') {
                    const gcWin = window.openGlobalControlsWindow(); 
                    if (gcWin && gcWin.element) {
                        const tempoInputEl = gcWin.element.querySelector('#tempoGlobalInput');
                        if (tempoInputEl) {
                           setTimeout(()=> tempoInputEl.focus(), 0); 
                           setTimeout(()=> tempoInputEl.select(), 0); 
                        }
                    }
                }
            });
        }


    } catch (error) {
        console.error("[EventHandlers] Error setting up primary event listeners:", error);
        showNotification("Error initializing some UI controls. Check console.", 5000);
    }

    // --- GLOBAL KEYBOARD SHORTCUTS LISTENER ---
    document.addEventListener('keydown', (event) => {
        const activeElement = document.activeElement;
        const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);

        const isCtrlPressed = event.ctrlKey || event.metaKey; // metaKey for Cmd on Mac

        if (isCtrlPressed && !isInputFocused) { 
            switch (event.key.toLowerCase()) {
                case 's': 
                    event.preventDefault();
                    console.log('[Shortcut] Save Project triggered');
                    if (typeof window.saveProject === 'function') window.saveProject();
                    break;
                case 'o': 
                    event.preventDefault();
                    console.log('[Shortcut] Load Project triggered');
                    if (typeof window.loadProject === 'function') window.loadProject();
                    break;
                case 'z': 
                    if (event.shiftKey) { // Handle Ctrl+Shift+Z for Redo
                        event.preventDefault();
                        console.log('[Shortcut] Redo (Ctrl+Shift+Z) triggered');
                        if (typeof window.redoLastAction === 'function') window.redoLastAction();
                    } else { // Handle Ctrl+Z for Undo
                        event.preventDefault();
                        console.log('[Shortcut] Undo triggered');
                        if (typeof window.undoLastAction === 'function') window.undoLastAction();
                    }
                    break;
                case 'y': // Ctrl+Y or Cmd+Y for Redo
                    event.preventDefault();
                    console.log('[Shortcut] Redo triggered');
                    if (typeof window.redoLastAction === 'function') window.redoLastAction();
                    break;
                case 'n': 
                     event.preventDefault();
                     console.log('[Shortcut] New Project triggered');
                     showConfirmationDialog(
                        'New Project',
                        'Create a new project? Any unsaved changes will be lost.',
                        () => {
                            // Actual new project logic would go here.
                            // For now, just a notification, or could reset state.
                            if (typeof window.reconstructDAW === 'function') {
                                window.reconstructDAW(null, true); // true to indicate it's a new project
                                showNotification("New project started.", 2000);
                            } else {
                                showNotification("New Project functionality not fully implemented.", 3000);
                            }
                        }
                    );
                    break;
            }
        } else if (!isCtrlPressed && !isInputFocused) { // Non-Ctrl shortcuts that also should not fire if typing
             switch (event.key.toLowerCase()) {
                case 'z': // Lower octave (without Ctrl/Cmd)
                    if (!event.shiftKey) { // Ensure Shift is not also pressed (for Ctrl+Shift+Z)
                        currentOctaveShift = Math.max(MIN_OCTAVE_SHIFT, currentOctaveShift - 1);
                        showNotification(`Octave: ${currentOctaveShift > 0 ? '+' : ''}${currentOctaveShift}`, 1000);
                    }
                    break;
                case 'x': // Raise octave (without Ctrl/Cmd)
                    currentOctaveShift = Math.min(MAX_OCTAVE_SHIFT, currentOctaveShift + 1);
                    showNotification(`Octave: ${currentOctaveShift > 0 ? '+' : ''}${currentOctaveShift}`, 1000);
                    break;
            }
        }
    });
     // --- END GLOBAL KEYBOARD SHORTCUTS LISTENER ---
}


export function attachGlobalControlEvents(globalControlsWindowElement) {
    console.log("[EventHandlers] attachGlobalControlEvents called with element:", globalControlsWindowElement);
    if (!globalControlsWindowElement) {
        console.error("[EventHandlers] Global controls window element not provided for attaching events.");
        return;
    }

    const playBtn = globalControlsWindowElement.querySelector('#playBtnGlobal');
    const recordBtn = globalControlsWindowElement.querySelector('#recordBtnGlobal');
    const tempoInput = globalControlsWindowElement.querySelector('#tempoGlobalInput');
    const midiInputSelectGlobal = globalControlsWindowElement.querySelector('#midiInputSelectGlobal');

    console.log("[EventHandlers] Play button query result:", playBtn);
    console.log("[EventHandlers] Record button query result:", recordBtn);
    console.log("[EventHandlers] Tempo input query result:", tempoInput);


    if (playBtn) {
        playBtn.addEventListener('click', () => {
            if (typeof Tone !== 'undefined') {
                if (Tone.Transport.state === 'started') {
                    Tone.Transport.pause();
                    playBtn.textContent = 'Play';
                    playBtn.classList.remove('bg-yellow-500', 'hover:bg-yellow-600', 'dark:bg-yellow-600', 'dark:hover:bg-yellow-700');
                    playBtn.classList.add('bg-green-500', 'hover:bg-green-600', 'dark:bg-green-600', 'dark:hover:bg-green-700');
                    if (window.recordBtn) {
                         window.recordBtn.classList.remove('armed');
                         setIsRecording(false);
                         setRecordingTrackId(null);
                    }

                } else {
                    Tone.Transport.start();
                    playBtn.textContent = 'Pause';
                    playBtn.classList.remove('bg-green-500', 'hover:bg-green-600', 'dark:bg-green-600', 'dark:hover:bg-green-700');
                    playBtn.classList.add('bg-yellow-500', 'hover:bg-yellow-600', 'dark:bg-yellow-600', 'dark:hover:bg-yellow-700');
                     if (getArmedTrackId() !== null && window.recordBtn && window.recordBtn.classList.contains('armed')) {
                         setIsRecording(true);
                         setRecordingTrackId(getArmedTrackId());
                         setRecordingStartTime(Tone.now());
                         console.log(`[EventHandlers] Recording started for track ${getRecordingTrackId()} at time ${Tone.now()}`);
                    }
                }
            }
        });
    } else { console.warn("[EventHandlers] Play button not found in global controls window."); }

    if (recordBtn) {
        recordBtn.addEventListener('click', () => {
            if (getArmedTrackId() === null && !recordBtn.classList.contains('armed')) {
                 showNotification("No track is armed for recording.", 2500);
                 return;
            }
            recordBtn.classList.toggle('armed');
            if (recordBtn.classList.contains('armed')) {
                 recordBtn.textContent = 'Armed';
                 if (Tone.Transport.state === 'started') { 
                     setIsRecording(true);
                     setRecordingTrackId(getArmedTrackId());
                     setRecordingStartTime(Tone.now());
                     console.log(`[EventHandlers] Recording started (armed while playing) for track ${getRecordingTrackId()} at time ${Tone.now()}`);
                 }
            } else {
                 recordBtn.textContent = 'Record';
                 setIsRecording(false);
                 setRecordingTrackId(null);
                 console.log(`[EventHandlers] Recording stopped/disarmed.`);
            }
        });
    } else { console.warn("[EventHandlers] Record button not found in global controls window."); }


    if (tempoInput) {
        if (typeof Tone !== 'undefined' && Tone.Transport) {
            tempoInput.value = Tone.Transport.bpm.value.toFixed(1);
        }
        tempoInput.addEventListener('change', (e) => {
            const newTempo = parseFloat(e.target.value);
            if (!isNaN(newTempo) && newTempo >= 30 && newTempo <= 300) {
                if (typeof Tone !== 'undefined' && Tone.Transport) {
                    if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set Tempo to ${newTempo}`);
                    Tone.Transport.bpm.value = newTempo;
                     if (typeof window.updateTaskbarTempoDisplay === 'function') window.updateTaskbarTempoDisplay(newTempo);

                }
            } else {
                showNotification("Tempo must be between 30 and 300 BPM.", 2500);
                e.target.value = Tone.Transport.bpm.value.toFixed(1); 
            }
        });
    } else { console.warn("[EventHandlers] Tempo input not found in global controls window."); }

    if (midiInputSelectGlobal) {
        midiInputSelectGlobal.addEventListener('change', (e) => {
            if (typeof window.selectMIDIInput === 'function') {
                window.selectMIDIInput(e.target.value, false); 
            }
        });
    } else {
        console.warn("[EventHandlers] Global MIDI input select not found.");
    }

}


function handleMIDIMessage(event) {
    if (typeof Tone === 'undefined' || !Tone.context || Tone.context.state !== 'running') {
        console.warn("[MIDI] AudioContext not running. MIDI message ignored.");
        return;
    }
    if (!window.activeMIDIInput) {
        return;
    }

    const command = event.data[0];
    const note = event.data[1];
    const velocity = (event.data.length > 2) ? event.data[2] : 0; 

    const armedTrackId = getArmedTrackId();
    if (armedTrackId === null) return; 

    const track = getTrackById(armedTrackId);
    if (!track || !track.instrument) return;

    if (window.midiIndicatorGlobalEl) {
        window.midiIndicatorGlobalEl.classList.add('active');
        setTimeout(() => {
            if (window.midiIndicatorGlobalEl) window.midiIndicatorGlobalEl.classList.remove('active');
        }, 100);
    }

    switch (command & 0xF0) { 
        case 0x90: 
            if (velocity > 0) {
                track.playNote(note, velocity / 127);
                if (isTrackRecording() && getRecordingTrackId() === armedTrackId && Tone.Transport.state === 'started') {
                    const currentTransportTime = Tone.Transport.seconds;
                    const timeSinceRecordingStart = currentTransportTime - (window.recordingStartTime || 0);
                    const stepTime = 60 / Tone.Transport.bpm.value / (Constants.STEPS_PER_BAR / 4); 
                    const currentStep = Math.floor(timeSinceRecordingStart / stepTime) % track.sequenceLength;

                    let pitchToRecord = Tone.Frequency(note, "midi").toNote();

                    let rowIndex = -1;
                    if (track.type === 'Synth' || track.type === 'InstrumentSampler') {
                        rowIndex = Constants.synthPitches.indexOf(pitchToRecord);
                    } else if (track.type === 'DrumSampler' || track.type === 'Sampler') {
                        const baseNote = (track.type === 'DrumSampler') ? Constants.drumSamplerMIDINoteStart : Constants.samplerMIDINoteStart;
                        rowIndex = note - baseNote; 
                        const maxRows = (track.type === 'DrumSampler') ? Constants.numDrumSamplerPads : (track.slices ? track.slices.length : Constants.numSlices);
                        if (rowIndex < 0 || rowIndex >= maxRows) rowIndex = -1; 
                    }


                    if (rowIndex !== -1 && currentStep >= 0 && currentStep < track.sequenceLength) {
                        if (!track.sequenceData[rowIndex]) {
                            track.sequenceData[rowIndex] = Array(track.sequenceLength).fill(null);
                        }
                        track.sequenceData[rowIndex][currentStep] = { active: true, velocity: velocity / 127 };
                        console.log(`[MIDI Rec] Recorded note ${pitchToRecord} (row ${rowIndex}) at step ${currentStep} for track ${track.id}`);
                        
                        const sequencerWindow = window.openWindows[`sequencerWin-${track.id}`];
                        if (sequencerWindow && sequencerWindow.element) {
                            const cell = sequencerWindow.element.querySelector(`.sequencer-step-cell[data-row="${rowIndex}"][data-col="${currentStep}"]`);
                            if (cell && typeof window.updateSequencerCellUI === 'function') {
                                window.updateSequencerCellUI(cell, track.type, true);
                            }
                        }
                    }
                }
            } else { 
                track.releaseNote(note);
            }
            break;
        case 0x80: 
            track.releaseNote(note);
            break;
    }
}


export async function setupMIDI() {
    console.log("[EventHandlers] setupMIDI called.");
    if (navigator.requestMIDIAccess) {
        try {
            console.log("[EventHandlers] Requesting MIDI access...");
            const midiAccess = await navigator.requestMIDIAccess({ sysex: false });
            console.log("[EventHandlers] MIDI Access Granted:", midiAccess);
            window.midiAccess = midiAccess; 
            populateMIDIInputs();
            midiAccess.onstatechange = populateMIDIInputs; 
        } catch (error) {
            console.error("[EventHandlers] MIDI access denied or error:", error);
            showNotification("MIDI access denied or an error occurred.", 3000);
        }
    } else {
        console.warn("[EventHandlers] Web MIDI API not supported in this browser.");
        showNotification("Web MIDI API not supported in this browser.", 3000);
    }
}

function populateMIDIInputs() {
    console.log("[EventHandlers] populateMIDIInputs called.");
    if (!window.midiAccess || !window.midiInputSelectGlobal) {
        if (!window.midiInputSelectGlobal) console.warn("[EventHandlers] Global MIDI input select element not found. Cannot populate.");
        if (!window.midiAccess) console.warn("[EventHandlers] MIDI Access not available. Cannot populate.");
        return;
    }

    const previouslySelectedId = window.midiInputSelectGlobal.value;
    window.midiInputSelectGlobal.innerHTML = '<option value="">No MIDI Input</option>'; 

    const inputs = window.midiAccess.inputs.values();
    let deviceFound = false;
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        deviceFound = true;
        const option = document.createElement('option');
        option.value = input.value.id;
        option.textContent = input.value.name;
        window.midiInputSelectGlobal.appendChild(option);
    }
    console.log(`[EventHandlers] populateMIDIInputs: Previously selected MIDI ID: `, previouslySelectedId);

    if (deviceFound) {
        if (previouslySelectedId && window.midiInputSelectGlobal.querySelector(`option[value="${previouslySelectedId}"]`)) {
            window.midiInputSelectGlobal.value = previouslySelectedId;
            selectMIDIInput(previouslySelectedId, true); 
        } else if (window.midiAccess.inputs.size > 0) {
            const firstInputId = window.midiAccess.inputs.values().next().value?.id;
            if (firstInputId) {
                window.midiInputSelectGlobal.value = firstInputId;
                selectMIDIInput(firstInputId, true);
            }
        }
    } else {
        console.log("[EventHandlers] No MIDI input devices found.");
        selectMIDIInput("", true); 
    }
}

export function selectMIDIInput(inputId, skipUndoCaptureAndNotification = false) {
    console.log("[EventHandlers] selectMIDIInput called. skipUndoCaptureAndNotification:", skipUndoCaptureAndNotification);
    if (window.activeMIDIInput) {
        window.activeMIDIInput.onmidimessage = null; 
        window.activeMIDIInput.close?.(); 
        window.activeMIDIInput = null;
        console.log("[EventHandlers] Cleared listeners from previous MIDI input.");
    }
    console.log("[EventHandlers] Selected MIDI ID in dropdown:", inputId);

    if (inputId && window.midiAccess) {
        const selectedInput = window.midiAccess.inputs.get(inputId);
        if (selectedInput) {
            window.activeMIDIInput = selectedInput;
            window.activeMIDIInput.onmidimessage = handleMIDIMessage;
            if (!skipUndoCaptureAndNotification) {
                if (typeof captureStateForUndo === 'function') captureStateForUndo(`Select MIDI Input ${selectedInput.name}`);
                showNotification(`MIDI Input: ${selectedInput.name}`, 2000);
            }
            console.log(`[EventHandlers] MIDI Input selected: ${selectedInput.name}`);
        } else {
            if (!skipUndoCaptureAndNotification) showNotification("Selected MIDI input not found.", 3000);
            console.warn(`[EventHandlers] Selected MIDI input with ID ${inputId} not found.`);
        }
    } else {
        if (!skipUndoCaptureAndNotification && inputId) showNotification("No MIDI input selected.", 2000);
        console.log("[EventHandlers] No MIDI input selected or midiAccess not available.");
    }
}


const computerKeyNoteMap = Constants.computerKeySynthMap;


function getNoteFromComputerKey(key) {
    let midiNote = computerKeyNoteMap[key];
    if (midiNote !== undefined) {
        return midiNote + (currentOctaveShift * OCTAVE_SHIFT_AMOUNT);
    }
    return null; 
}

document.addEventListener('keydown', (event) => {
    if (event.repeat) return; 
    
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);

    // Handle octave shifts only if not focused on input and no Ctrl/Meta/Shift keys are pressed
    if (!isInputFocused && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        if (event.key.toLowerCase() === 'z') { 
            currentOctaveShift = Math.max(MIN_OCTAVE_SHIFT, currentOctaveShift - 1);
            showNotification(`Octave: ${currentOctaveShift > 0 ? '+' : ''}${currentOctaveShift}`, 1000);
            return; 
        }
        if (event.key.toLowerCase() === 'x') { 
            currentOctaveShift = Math.min(MAX_OCTAVE_SHIFT, currentOctaveShift + 1);
            showNotification(`Octave: ${currentOctaveShift > 0 ? '+' : ''}${currentOctaveShift}`, 1000);
            return; 
        }
    }

    if (isInputFocused) return; // Other shortcuts are handled after this, so input focus check here is fine.

    const note = getNoteFromComputerKey(event.code); // Use event.code for layout-independent keys
    if (note !== null && !currentlyPressedComputerKeys[event.code]) {
        currentlyPressedComputerKeys[event.code] = true;
        
        const armedTrackId = getArmedTrackId();
        if (armedTrackId === null) return;
        const track = getTrackById(armedTrackId);
        if (!track) return;

        track.playNote(note, Constants.defaultVelocity / 127); 

        if (window.keyboardIndicatorGlobalEl) {
            window.keyboardIndicatorGlobalEl.classList.add('active');
        }
    }
});

document.addEventListener('keyup', (event) => {
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);
    if (isInputFocused) return;

    const note = getNoteFromComputerKey(event.code); // Use event.code
    if (note !== null && currentlyPressedComputerKeys[event.code]) {
        currentlyPressedComputerKeys[event.code] = false;
        
        const armedTrackId = getArmedTrackId();
        if (armedTrackId === null) return;
        const track = getTrackById(armedTrackId);
        if (!track) return;

        track.releaseNote(note);
        if (window.keyboardIndicatorGlobalEl) {
            window.keyboardIndicatorGlobalEl.classList.remove('active');
        }
    }
});



export function handleTrackMute(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    if (typeof captureStateForUndo === 'function') captureStateForUndo(`${track.isMuted ? 'Unmute' : 'Mute'} track "${track.name}"`);
    track.toggleMute();
    if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
    const inspector = window.openWindows[`trackInspector-${trackId}`];
    if (inspector && inspector.element) {
        const muteBtn = inspector.element.querySelector(`#muteBtn-${trackId}`);
        if (muteBtn) {
            muteBtn.textContent = track.isMuted ? 'Unmute' : 'Mute';
            muteBtn.classList.toggle('muted', track.isMuted);
        }
    }
}

export function handleTrackSolo(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    if (typeof captureStateForUndo === 'function') captureStateForUndo(`${track.isSoloed ? 'Unsolo' : 'Solo'} track "${track.name}"`);
    
    const wasSoloed = track.isSoloed; 
    setSoloedTrackId(wasSoloed ? null : trackId); 

    const tracks = getTracks();
    tracks.forEach(t => {
        t.applySoloState(getSoloedTrackId()); 
    });

    if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
    tracks.forEach(t => {
        const inspector = window.openWindows[`trackInspector-${t.id}`];
        if (inspector && inspector.element) {
            const soloBtn = inspector.element.querySelector(`#soloBtn-${t.id}`);
            if (soloBtn) {
                const isCurrentlySoloed = getSoloedTrackId() === t.id;
                soloBtn.textContent = isCurrentlySoloed ? 'Unsolo' : 'Solo';
                soloBtn.classList.toggle('soloed', isCurrentlySoloed);
            }
        }
    });
}

export function handleTrackArm(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;

    const currentlyArmedTrackId = getArmedTrackId();
    let actionMessage = "";

    if (currentlyArmedTrackId === trackId) { 
        setArmedTrackId(null);
        actionMessage = `Disarm track "${track.name}"`;
    } else { 
        setArmedTrackId(trackId);
        actionMessage = `Arm track "${track.name}"`;
    }
    if (typeof captureStateForUndo === 'function') captureStateForUndo(actionMessage);

    if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow(); 
    const tracks = getTracks();
    tracks.forEach(t => { 
        const inspector = window.openWindows[`trackInspector-${t.id}`];
        if (inspector && inspector.element) {
            const armBtn = inspector.element.querySelector(`#armInputBtn-${t.id}`);
            if (armBtn) armBtn.classList.toggle('armed', getArmedTrackId() === t.id);
        }
    });
    const globalRecordBtn = window.recordBtn; 
    if (globalRecordBtn) {
        if (getArmedTrackId() === null && globalRecordBtn.classList.contains('armed')) {
            globalRecordBtn.classList.remove('armed');
            globalRecordBtn.textContent = 'Record';
            setIsRecording(false);
            setRecordingTrackId(null);
        }
    }
}

export function handleRemoveTrack(trackId) {
    const track = getTrackById(trackId);
    if (!track) {
        console.warn(`[EventHandlers] handleRemoveTrack: Track ID ${trackId} not found.`);
        return;
    }
    showConfirmationDialog(
        'Confirm Delete Track',
        `Are you sure you want to remove track \"${track.name}\"? This cannot be undone directly (only via project reload or undo history).`,
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
