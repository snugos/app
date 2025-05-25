// js/eventHandlers.js - Global Event Listeners and Input Handling Module
import * as Constants from './constants.js';
import { showNotification, showConfirmationDialog } from './utils.js';
// ... (other imports remain the same)
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
        // Add new functions from appContext for backgrounds
        triggerCustomBackgroundUpload,
        removeCustomDesktopBackground
    } = appContext;

    const startButton = document.getElementById('startButton');
    const startMenu = document.getElementById('startMenu');
    // ... (startButton and document click listeners remain the same)
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
    // ... (existing menu listeners remain the same)
    document.getElementById('menuAddSynthTrack')?.addEventListener('click', () => { addTrack('Synth', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); });
    document.getElementById('menuAddSamplerTrack')?.addEventListener('click', () => { addTrack('Sampler', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); });
    document.getElementById('menuAddDrumSamplerTrack')?.addEventListener('click', () => { addTrack('DrumSampler', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); });
    document.getElementById('menuAddInstrumentSamplerTrack')?.addEventListener('click', () => { addTrack('InstrumentSampler', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); });
    document.getElementById('menuOpenSoundBrowser')?.addEventListener('click', () => { openSoundBrowserWindow(); startMenu?.classList.add('hidden'); });
    document.getElementById('menuUndo')?.addEventListener('click', () => { /* ... */ });
    document.getElementById('menuRedo')?.addEventListener('click', () => { /* ... */ });
    document.getElementById('menuSaveProject')?.addEventListener('click', () => { /* ... */ });
    document.getElementById('menuLoadProject')?.addEventListener('click', () => { /* ... */ });
    document.getElementById('menuExportWav')?.addEventListener('click', () => { /* ... */ });
    document.getElementById('menuOpenGlobalControls')?.addEventListener('click', () => { /* ... */ });
    document.getElementById('menuOpenMixer')?.addEventListener('click', () => { /* ... */ });

    // New Menu Item Listeners for Backgrounds
    document.getElementById('menuUploadCustomBg')?.addEventListener('click', () => {
        if (triggerCustomBackgroundUpload) triggerCustomBackgroundUpload();
        startMenu?.classList.add('hidden');
    });
    document.getElementById('menuRemoveCustomBg')?.addEventListener('click', () => {
        if (removeCustomDesktopBackground) removeCustomDesktopBackground();
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuToggleFullScreen')?.addEventListener('click', () => { /* ... */ });
    // ... (rest of initializePrimaryEventListeners, including loadProjectInputEl, keyboard listeners, Tone.Transport listeners)
    document.getElementById('taskbarTempoDisplay')?.addEventListener('click', () => {
        openGlobalControlsWindow();
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

// ... (attachGlobalControlEvents, setupMIDI, populateMIDIInputs, selectMIDIInput, handleMIDIMessage,
//      handleComputerKeyDown, handleComputerKeyUp,
//      handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
//      handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
//      functions remain the same as your last correct version of these)

// Make sure the handleComputerKeyDown and handleComputerKeyUp functions
// are the ones that include the octave shift logic we previously implemented.
// For brevity here, I'm not re-pasting them if they were correct in your local files
// from the octave shift implementation. If they need to be re-pasted, let me know.
// The key is that they should be the version that correctly handles 'KeyZ' and 'KeyX'
// and applies currentOctaveShift.
async function handleComputerKeyDown(e) {
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
        if(window.keyboardIndicatorGlobalEl && Object.keys(currentlyPressedComputerKeys).length === 0) {
            window.keyboardIndicatorGlobalEl.classList.remove('active');
        }
        return;
    }

    if (isTrackRecording() && getArmedTrackId() === getRecordingTrackId()) {
        const track = getTrackById(getRecordingTrackId());
        if (track) {
            const currentTimeInSeconds = Tone.Transport.seconds;
            const sixteenthNoteDuration = Tone.Time("16n").toSeconds();
            let currentStep = Math.round(currentTimeInSeconds / sixteenthNoteDuration);
            currentStep = (currentStep % track.sequenceLength + track.sequenceLength) % track.sequenceLength;

            let rowIndex = -1;
            if ((track.type === 'Synth' || track.type === 'InstrumentSampler') && Constants.computerKeySynthMap[e.code]) {
                const pitchName = Tone.Frequency(baseComputerKeyNote, "midi").toNote();
                rowIndex = Constants.synthPitches.indexOf(pitchName);
            } else if ((track.type === 'Sampler' || track.type === 'DrumSampler') && Constants.computerKeySamplerMap[e.code]) {
                if (track.type === 'Sampler') {
                     rowIndex = baseComputerKeyNote - Constants.samplerMIDINoteStart;
                     if (rowIndex < 0 || rowIndex >= track.slices.length) rowIndex = -1;
                } else {
                     rowIndex = baseComputerKeyNote - Constants.samplerMIDINoteStart;
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
        currentArmedTrack.instrument.triggerAttack(Tone.Frequency(computerKeyNote, "midi").toNote(), time, computerKeyVelocity);
    } else if (currentArmedTrack.type === 'Sampler' && Constants.computerKeySamplerMap[e.code] !== undefined) {
        const sliceIdx = baseComputerKeyNote - Constants.samplerMIDINoteStart;
        if (sliceIdx >= 0 && sliceIdx < currentArmedTrack.slices.length && typeof window.playSlicePreview === 'function') {
            window.playSlicePreview(currentArmedTrack.id, sliceIdx, computerKeyVelocity, currentOctaveShift * OCTAVE_SHIFT_AMOUNT);
        }
    } else if (currentArmedTrack.type === 'DrumSampler' && Constants.computerKeySamplerMap[e.code] !== undefined) {
        const padIndex = baseComputerKeyNote - Constants.samplerMIDINoteStart;
        if (padIndex >= 0 && padIndex < Constants.numDrumSamplerPads && typeof window.playDrumSamplerPadPreview === 'function') {
            window.playDrumSamplerPadPreview(currentArmedTrack.id, padIndex, computerKeyVelocity, currentOctaveShift * OCTAVE_SHIFT_AMOUNT);
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

    if (e.code === 'KeyZ' || e.code === 'KeyX') {
        delete currentlyPressedComputerKeys[e.code];
        if(window.keyboardIndicatorGlobalEl && Object.keys(currentlyPressedComputerKeys).length === 0) {
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

    if(window.keyboardIndicatorGlobalEl && Object.keys(currentlyPressedComputerKeys).length === 0) {
        window.keyboardIndicatorGlobalEl.classList.remove('active');
    }
}
// ... other handlers like handleTrackMute etc.
export function handleTrackMute(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    captureStateForUndo(`${track.isMuted ? "Unmute" : "Mute"} Track "${track.name}"`);
    track.isMuted = !track.isMuted;
    track.applyMuteState();

    const inspectorMuteBtn = track.inspectorWindow?.element?.querySelector(`#muteBtn-${track.id}`);
    if (inspectorMuteBtn) inspectorMuteBtn.classList.toggle('muted', track.isMuted);
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
        setSoloedTrackId(null);
    } else {
        setSoloedTrackId(track.id);
    }

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
    const track = getTrackById(trackId);
    if (!track) return;

    const currentArmedId = getArmedTrackId();
    const isCurrentlyArmed = currentArmedId === track.id;

    captureStateForUndo(`${isCurrentlyArmed ? "Disarm" : "Arm"} Track "${track.name}" for Input`);

    if (isCurrentlyArmed) {
        setArmedTrackId(null);
    } else {
        setArmedTrackId(track.id);
    }

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
            coreRemoveTrackFromState(trackId);
        }
    );
}

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
