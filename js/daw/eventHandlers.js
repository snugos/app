// js/daw/eventHandlers.js - Global Event Listeners and Input Handling Module
// NOTE: Tone, Konva, JSZip are loaded globally via script tags in snaw.html.
// Constants is also loaded globally via script tag.
// Functions from utils.js, auth.js, db.js, effectsRegistry.js are typically accessed via appServices or are also global.

import { getTracks, getTrackById, getSoloedTrackId, setSoloedTrackId, getArmedTrackId, setArmedTrackId, isRecording as isTrackRecordingState, setIsRecording as setIsRecordingState, getRecordingTrackId, setRecordingTrackId, getRecordingStartTime, addTrack, removeTrack } from './state/trackState.js'; // CORRECTED: removeTrackFromStateInternal is now removeTrack
import { getPlaybackMode as getPlaybackModeState, setPlaybackMode as setPlaybackModeState, getMidiAccess as getMidiAccessState, setActiveMIDIInput as setActiveMIDIInputState, getActiveMIDIInput as getActiveMIDIInputState, getMidiRecordModeState } from './state/appState.js';
import { captureStateForUndo as captureStateForUndoInternal, undoLastAction as undoLastActionInternal, redoLastAction as redoLastActionInternal, saveProject as saveProjectInternal, loadProject as loadProjectInternal, handleProjectFileLoad as handleProjectFileLoadInternal, exportToWav as exportToWavInternal, getUndoStack as getUndoStackState, getRedoStack as getRedoStackState, getClipboardData } from './state/projectState.js';
import { getOpenWindows as getOpenWindowsState, getWindowById as getWindowByIdState } from './state/windowState.js';

// Global Utility functions (loaded via script tags in HTML)
// These are not imported as modules here because they are global.
// If they were truly modular, they would be imported from '../utils.js' etc.
// import { showNotification, showCustomModal, createContextMenu } from '../utils.js'; // NO LONGER IMPORTED HERE, RELY ON APP SERVICES OR GLOBAL
// import { incrementOctaveShift, decrementOctaveShift } from '../constants.js'; // NO LONGER IMPORTED HERE, RELY ON GLOBAL Constants object.

let localAppServices = {};
const currentlyPressedKeys = new Set();
let isSustainPedalDown = false;
const sustainedNotes = new Map();

export function initializeEventHandlersModule(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
}

export function initializePrimaryEventListeners() {
    const startButton = document.getElementById('startButton');
    const startMenu = document.getElementById('startMenu');
    const desktopEl = document.getElementById('desktop');
    const customBgInput = document.getElementById('customBgInput');

    startButton?.addEventListener('click', (e) => {
        e.stopPropagation();
        startMenu?.classList.toggle('hidden');
        if (!startMenu?.classList.contains('hidden')) {
            updateUndoRedoButtons();
        }
    });

    document.addEventListener('click', (e) => {
        if (startMenu && !startMenu.classList.contains('hidden')) {
            if (!startMenu.contains(e.target) && e.target !== startButton) {
                startMenu.classList.add('hidden');
            }
        }
    });

    desktopEl?.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const menuItems = [
            {
                label: 'Change Background',
                action: () => customBgInput?.click()
            }
        ];
        localAppServices.createContextMenu(e, menuItems, localAppServices);
    });

    // UPDATED: This now calls the new server upload function
    customBgInput?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            localAppServices.handleBackgroundUpload(file);
        }
        e.target.value = null;
    });


    const addTrackHandler = async (type) => {
        await localAppServices.initAudioContextAndMasterMeter?.(true);
        const newTrack = await localAppServices.addTrack(type);
        if (newTrack) {
            localAppServices.openTrackInspectorWindow?.(newTrack.id);
        }
        startMenu?.classList.add('hidden');
    };

    document.getElementById('menuAddSynthTrack')?.addEventListener('click', () => addTrackHandler('Synth'));
    document.getElementById('menuAddSamplerTrack')?.addEventListener('click', () => addTrackHandler('Sampler'));
    document.getElementById('menuAddDrumSamplerTrack')?.addEventListener('click', () => addTrackHandler('DrumSampler'));
    document.getElementById('menuAddInstrumentSamplerTrack')?.addEventListener('click', () => addTrackHandler('InstrumentSampler'));
    document.getElementById('menuAddAudioTrack')?.addEventListener('click', () => addTrackHandler('Audio'));

    document.getElementById('menuOpenSoundBrowser')?.addEventListener('click', () => {
        localAppServices.openSoundBrowserWindow?.();
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuOpenYouTubeImporter')?.addEventListener('click', () => {
        localAppServices.handleOpenYouTubeImporter();
        startMenu?.classList.add('hidden');
    });

    // Removed menuOpenTimeline as timeline is removed
    // document.getElementById('menuOpenTimeline')?.addEventListener('click', () => {
    //     localAppServices.openTimelineWindow?.();
    //     startMenu?.classList.add('hidden');
    // });

    document.getElementById('menuOpenPianoRoll')?.addEventListener('click', () => {
        const currentTracks = getTracks();
        const firstInstrumentTrack = currentTracks.find(t => t.type === 'Synth' || t.type === 'InstrumentSampler' || t.type === 'Sampler' || t.type === 'DrumSampler');
        if (firstInstrumentTrack) {
            localAppServices.handleOpenPianoRoll(firstInstrumentTrack.id);
        } else {
            localAppServices.showNotification("Add an instrument or sampler track first.", 3000);
        }
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuOpenMixer')?.addEventListener('click', () => {
        localAppServices.openMixerWindow?.();
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuOpenMasterEffects')?.addEventListener('click', () => {
        localAppServices.openMasterEffectsRackWindow?.();
        startMenu?.classList.add('hidden');
    });

    document.getElementById('undoBtnTop')?.addEventListener('click', () => {
        undoLastActionInternal();
        updateUndoRedoButtons();
    });

    document.getElementById('redoBtnTop')?.addEventListener('click', () => {
        redoLastActionInternal();
        // Ensure redo logic is properly implemented in state.js
        localAppServices.showNotification("Redo not yet implemented fully.", 2000);
        updateUndoRedoButtons();
    });


    document.getElementById('menuSaveProject')?.addEventListener('click', () => {
        saveProjectInternal();
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuLoadProject')?.addEventListener('click', () => {
        document.getElementById('loadProjectInput')?.click();
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuExportWav')?.addEventListener('click', () => {
        exportToWavInternal();
        startMenu?.classList.add('hidden');
    });

    // NEW: Event listener for opening a profile page in a new tab
    document.getElementById('menuOpenTestProfile')?.addEventListener('click', () => {
        const usernameToOpen = 'testuser';
        window.open(`profile.html?user=${usernameToOpen}`, '_blank');
        document.getElementById('startMenu')?.classList.add('hidden');
    });

    document.getElementById('menuRefreshMidi')?.addEventListener('click', () => {
        localAppServices.showNotification('Refreshing MIDI devices...', 1500);
        setupMIDI();
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuToggleFullScreen')?.addEventListener('click', () => {
        toggleFullScreen();
        startMenu?.classList.add('hidden');
    });

    const loadProjectInput = document.getElementById('loadProjectInput');
    if (loadProjectInput && handleProjectFileLoadInternal) {
        loadProjectInput.addEventListener('change', handleProjectFileLoadInternal);
    }
}

export function attachGlobalControlEvents(uiCache) {
    const playBtn = document.getElementById('playBtnGlobalTop');
    const stopBtn = document.getElementById('stopBtnGlobalTop');
    const recordBtn = document.getElementById('recordBtnGlobalTop');
    const tempoInput = document.getElementById('tempoGlobalInputTop');
    const midiSelect = document.getElementById('midiInputSelectGlobalTop');
    const playbackModeToggle = document.getElementById('playbackModeToggleBtnGlobalTop');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const metronomeBtn = document.getElementById('metronomeToggleBtn');

    const handlePlayPause = async () => {
        const audioReady = await localAppServices.initAudioContextAndMasterMeter?.(true);
        if (!audioReady) {
            localAppServices.showNotification("Audio context not running. Please interact with the page.", 3000);
            return;
        }

        const transportState = Tone.Transport.state;

        if (transportState === 'started') {
            Tone.Transport.pause();
        } else {
            if (transportState === 'stopped') {
                localAppServices.onPlaybackModeChange?.(getPlaybackModeState(), 'reschedule');
            }
            Tone.Transport.start();
        }
    };

    const handlePlayStop = async () => {
        const audioReady = await localAppServices.initAudioContextAndMasterMeter?.(true);
        if (!audioReady) {
            localAppServices.showNotification("Audio context not running. Please interact with the page.", 3000);
            return;
        }

        if (Tone.Transport.state === 'started') {
            handleStop();
        } else {
            localAppServices.onPlaybackModeChange?.(getPlaybackModeState(), 'reschedule');
            Tone.Transport.start();
        }
    };

    const handleStop = () => {
        localAppServices.forceStopAllAudio?.();

        if (Tone.Transport.state !== 'stopped') {
            Tone.Transport.stop();
        }
    };

    const handleRecord = async () => {
        const audioReady = await localAppServices.initAudioContextAndMasterMeter?.(true);
        if (!audioReady) return;

        const currentlyRecording = isTrackRecordingState();
        const armedTrackId = getArmedTrackId();
        const armedTrack = getTrackById(armedTrackId);

        const recordBtn = document.getElementById('recordBtnGlobalTop');

        if (currentlyRecording) {
            setIsRecordingState(false);
            recordBtn.classList.remove('recording');
            if (getRecordingTrackId() === armedTrackId && armedTrack?.type === 'Audio' && localAppServices.stopAudioRecording) {
                await localAppServices.stopAudioRecording();
            }
            if (Tone.Transport.state === 'started') {
                handleStop();
            }
        } else if (armedTrack) {
            setRecordingTrackId(armedTrackId);
            setIsRecordingState(true);
            recordBtn.classList.add('recording');

            setRecordingStartTime(Tone.Transport.seconds);

            if (armedTrack.type === 'Audio') {
                const success = await localAppServices.startAudioRecording(armedTrack, armedTrack.isMonitoringEnabled);
                if (!success) {
                    setIsRecordingState(false);
                    recordBtn.classList.remove('recording');
                    return;
                }
            }

            if (Tone.Transport.state !== 'started') {
                Tone.Transport.start();
            }
        } else {
            localAppServices.showNotification("No track armed for recording.", 2500);
        }
    };

    playBtn?.addEventListener('click', handlePlayPause);
    stopBtn?.addEventListener('click', handleStop);
    recordBtn?.addEventListener('click', handleRecord);

    metronomeBtn?.addEventListener('click', () => {
        const isEnabled = localAppServices.toggleMetronome();
        metronomeBtn.classList.toggle('active', isEnabled);
    });

    tempoInput?.addEventListener('change', (e) => {
        const newTempo = parseFloat(e.target.value);
        if (newTempo >= Constants.MIN_TEMPO && newTempo <= Constants.MAX_TEMPO) {
            Tone.Transport.bpm.value = newTempo;
        }
    });

    document.getElementById('taskbarTempoDisplay')?.addEventListener('click', () => {
        tempoInput?.select();
    });

    midiSelect?.addEventListener('change', selectMIDIInput);

    playbackModeToggle?.addEventListener('click', () => {
        const currentMode = getPlaybackModeState();
        const newMode = currentMode === 'piano-roll' ? 'timeline' : 'piano-roll';
        setPlaybackModeState(newMode);
    });

    themeToggleBtn?.addEventListener('click', () => {
        const isLightTheme = document.body.classList.contains('theme-light');
        const newTheme = isLightTheme ? 'dark' : 'light';
        localAppServices.setCurrentUserThemePreference(newTheme);
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }
        if (e.repeat) return;

        const key = typeof e.key === 'string' ? e.key.toLowerCase() : '';

        if (Constants.computerKeySynthMap[key] && !currentlyPressedKeys.has(key)) {
            e.preventDefault();
            const armedTrackId = getArmedTrackId();
            const armedTrack = getTrackById(armedTrackId);

            if (armedTrack && armedTrack.instrument) {
                const noteNumber = Constants.computerKeySynthMap[key] + (Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT * 12);
                const noteName = Tone.Midi(noteNumber).toNote();
                armedTrack.instrument.triggerAttack(noteName, Tone.now(), 0.75);
                currentlyPressedKeys.add(key);
            }
        } else {
            if (e.code === 'Space') {
                e.preventDefault();
                handlePlayStop();
            } else if (e.key === 'Escape') {
                handleStop();
            } else if (key === 'r' && !e.ctrlKey && !e.metaKey) {
                handleRecord();
            } else if (key === 'z') {
                Constants.decrementOctaveShift();
                localAppServices.showNotification?.(`Keyboard Octave: ${Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT > 0 ? '+' : ''}${Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT}`, 1000);
            } else if (key === 'x') {
                Constants.incrementOctaveShift();
                localAppServices.showNotification?.(`Keyboard Octave: ${Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT > 0 ? '+' : ''}${Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT}`, 1000);
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                // Removed timeline interaction code
            } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                // Removed timeline interaction code
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        const key = typeof e.key === 'string' ? e.key.toLowerCase() : '';
        if (Constants.computerKeySynthMap[key]) {
            e.preventDefault();
            const armedTrackId = getArmedTrackId();
            const armedTrack = getTrackById(armedTrackId);

            if (armedTrack && armedTrack.instrument) {
                const noteNumber = Constants.computerKeySynthMap[key] + (Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT * 12);
                const noteName = Tone.Midi(noteNumber).toNote();
                armedTrack.instrument.triggerRelease(noteName, Tone.now());
                currentlyPressedKeys.delete(key);
            }
        }
    });
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtnTop');
    const redoBtn = document.getElementById('redoBtnTop');

    if (undoBtn) {
        const undoStack = getUndoStack();
        if (undoStack.length > 0) {
            undoBtn.disabled = false;
            undoBtn.title = `Undo: ${undoStack[undoStack.length - 1].actionDescription}`;
        } else {
            undoBtn.disabled = true;
            undoBtn.title = 'Undo';
        }
    }
    if (redoBtn) {
        const redoStack = getRedoStack();
        if (redoStack.length > 0) {
            redoBtn.disabled = false;
            redoBtn.title = `Redo: ${redoStack[redoStack.length - 1].actionDescription}`;
        } else {
            redoBtn.disabled = true;
            redoBtn.title = 'Redo';
        }
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            localAppServices.showNotification(`Error attempting to enable full-screen mode: ${err.message}`, 3000);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

export function setupMIDI() {
    if (!navigator.requestMIDIAccess) {
        localAppServices.showNotification("Web MIDI is not supported in this browser.", 4000);
        return;
    }
    if (!window.isSecureContext) {
        localAppServices.showNotification("MIDI access requires a secure connection (HTTPS).", 6000);
        return;
    }

    navigator.requestMIDIAccess({ sysex: true })
        .then(onMIDISuccess)
        .catch(onMIDIFailure);
}

function onMIDISuccess(midiAccess) {
    localAppServices.setMidiAccess?.(midiAccess);
    populateMIDIInputSelector(midiAccess);
    midiAccess.onstatechange = () => {
        populateMIDIInputSelector(midiAccess);
    };
}

function onMIDIFailure(error) {
    console.error("Failed to get MIDI access -", error);
    localAppServices.showNotification(`Failed to get MIDI access: ${error.name}`, 4000);
}

function populateMIDIInputSelector(midiAccess) {
    const midiSelect = document.getElementById('midiInputSelectGlobalTop');
    if (!midiSelect || !midiAccess) {
        return;
    }

    const currentInputs = new Set();
    midiSelect.innerHTML = '';

    const noneOption = document.createElement('option');
    noneOption.value = "";
    noneOption.textContent = "None";
    midiSelect.appendChild(noneOption);

    if (midiAccess.inputs.size > 0) {
        midiAccess.inputs.forEach(input => {
            currentInputs.add(input.id);
            const option = document.createElement('option');
            option.value = input.id;
            option.textContent = input.name;
            midiSelect.appendChild(option);
        });
    }

    const activeInput = getActiveMIDIInputState();
    if (activeInput && currentInputs.has(activeInput.id)) {
        midiSelect.value = activeInput.id;
    } else {
        setActiveMIDIInputState(null);
    }
}

export function selectMIDIInput(event) {
    const midiAccess = localAppServices.getMidiAccess?.();
    const selectedId = event.target.value;
    const currentActiveInput = getActiveMIDIInputState();

    if (currentActiveInput) {
        currentActiveInput.onmidimessage = null;
    }

    if (selectedId && midiAccess) {
        const newActiveInput = midiAccess.inputs.get(selectedId);
        newActiveInput.onmidimessage = onMIDIMessage;
        setActiveMIDIInputState(newActiveInput);
    } else {
        setActiveMIDIInputState(null);
    }
}

function onMIDIMessage(message) {
    const [command, noteNumber, velocity] = message.data;
    const commandType = command & 0xF0;
    const noteOn = commandType === 0x90 && velocity > 0;
    const noteOff = commandType === 0x80 || (commandType === 0x90 && velocity === 0);

    const armedTrackId = getArmedTrackId();
    if (armedTrackId === null) return;
    const armedTrack = getTrackById(armedTrackId);
    if (!armedTrack || !armedTrack.instrument) return;

    if (commandType === 0xB0 && noteNumber === 64) {
        if (velocity > 63) {
            isSustainPedalDown = true;
        } else {
            isSustainPedalDown = false;
            sustainedNotes.forEach((noteValue, midiNote) => {
                armedTrack.instrument.triggerRelease(noteValue, Tone.now());
            });
            sustainedNotes.clear();
        }
        return;
    }

    if (noteOn || noteOff) {
        const noteName = Tone.Midi(noteNumber).toNote();

        if (noteOn) {
            if (sustainedNotes.has(noteNumber)) {
                armedTrack.instrument.triggerRelease(sustainedNotes.get(noteName), Tone.now());
                sustainedNotes.delete(noteNumber);
            }
            armedTrack.instrument.triggerAttack(noteName, Tone.now(), velocity / 127);
        } else {
            if (isSustainPedalDown) {
                sustainedNotes.set(noteNumber, noteName);
            } else {
                armedTrack.instrument.triggerRelease(noteName, Tone.now());
            }
        }
    }

    if (noteOn && isTrackRecordingState()) {
        const track = armedTrack;
        if (track.type !== 'Audio') {
            const activeSequence = track.sequences.getActiveSequence();
            if (activeSequence) {
                const ticksPerStep = Tone.Transport.PPQ / 4;
                const currentStep = Math.round(Tone.Transport.ticks / ticksPerStep) % activeSequence.length;
                const pitchIndex = Constants.PIANO_ROLL_END_MIDI_NOTE - noteNumber;

                if (pitchIndex >= 0 && pitchIndex < Constants.SYNTH_PITCHES.length) {

                    const recordMode = getMidiRecordModeState();
                    if (recordMode === 'replace') {
                        for (let i = 0; i < Constants.SYNTH_PITCHES.length; i++) {
                            if (activeSequence.data[i][currentStep]) {
                                track.sequences.removeNoteFromSequence(activeSequence.id, i, currentStep, true);
                            }
                        }
                    }

                    track.sequences.addNoteToSequence(activeSequence.id, pitchIndex, currentStep, { velocity: velocity / 127, duration: 1 });

                    const pianoRollWindow = getWindowByIdState(`pianoRollWin-${track.id}`);
                    if (pianoRollWindow && !pianoRollWindow.isMinimized) {
                       if(localAppServices.openPianoRollWindow) {
                           pianoRollWindow.close(true);
                           localAppServices.openPianoRollWindow(track.id, activeSequence.id);
                       }
                    }
                }
            }
        }
    }
}


export function handleTrackMute(trackId) {
    console.log(`[eventHandlers.js] handleTrackMute called for trackId: ${trackId}`);
    const track = getTrackById(trackId);
    if (!track) {
        console.warn(`[eventHandlers.js] handleTrackMute: Track with ID ${trackId} not found.`);
        return;
    }
    captureStateForUndoInternal(`${track.isMuted ? 'Unmute' : 'Mute'} Track: ${track.name}`);
    track.isMuted = !track.isMuted;
    track.applyMuteState();
    if (localAppServices.updateTrackUI) {
        getTracks().forEach(t => localAppServices.updateTrackUI(t.id, 'muteChanged'));
        localAppServices.updateMixerWindow();
    }
}

export function handleTrackSolo(trackId) {
    console.log(`[eventHandlers.js] handleTrackSolo called for trackId: ${trackId}`);
    const track = getTrackById(trackId);
    if (!track) {
        console.warn(`[eventHandlers.js] handleTrackSolo: Track with ID ${trackId} not found.`);
        return;
    }
    captureStateForUndoInternal(`Solo Track: ${track.name}`);
    const currentSoloId = getSoloedTrackId();
    const newSoloId = (currentSoloId === trackId) ? null : trackId;
    setSoloedTrackId(newSoloId);
    getTracks().forEach(t => {
        if (t.updateSoloMuteState) {
            t.updateSoloMuteState(newSoloId);
        }
        localAppServices.updateTrackUI(t.id, 'soloChanged');
    });
    if (localAppServices.updateMixerWindow) {
        localAppServices.updateMixerWindow();
    }
}

export function handleTrackArm(trackId) {
    console.log(`[eventHandlers.js] handleTrackArm called for trackId: ${trackId}`);
    const currentArmedId = getArmedTrackId();
    const newArmedId = (currentArmedId === trackId) ? null : trackId;
    setArmedTrackId(newArmedId);
    if (localAppServices.updateTrackUI) {
        localAppServices.updateTrackUI(trackId, 'armChanged');
        if (currentArmedId !== null && currentArmedId !== trackId) {
            localAppServices.updateTrackUI(currentArmedId, 'armChanged');
        }
    }
}

export function handleRemoveTrack(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    showConfirmationDialog('Remove Track', `Are you sure you want to remove "${track.name}"? This cannot be undone.`, () => {
        removeTrack(trackId); // Corrected from removeTrackFromStateInternal
    });
}

export function handleOpenTrackInspector(trackId) {
    if (localAppServices.openTrackInspectorWindow) {
        localAppServices.openTrackInspectorWindow(trackId);
    }
}

export function handleOpenEffectsRack(trackId) {
    if (localAppServices.openTrackEffectsRackWindow) {
        localAppServices.openTrackEffectsRackWindow(trackId);
    }
}

export function handleOpenPianoRoll(trackId) {
    if (localAppServices.openPianoRollWindow) {
        localAppServices.openPianoRollWindow(trackId);
    } else {
        localAppServices.showNotification("Piano Roll UI is currently unavailable.", 3000);
    }
}

export async function handleTimelineLaneDrop(event, targetTrackId, startTime) {
    const files = event.dataTransfer.files;
    const targetTrack = getTrackById(targetTrackId);

    if (!targetTrack) return;

    if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('audio/')) {
            if (targetTrack.type === 'Audio') {
                targetTrack.clips.addAudioClip(file, startTime, file.name);
            } else {
                localAppServices.showNotification(`Cannot add audio files to a ${targetTrack.type} track. Drop on an Audio track.`, 3500);
            }
        }
    } else {
        const jsonDataString = event.dataTransfer.getData("application/json");
        if (jsonDataString) {
            try {
                const soundData = JSON.parse(jsonDataString);
                if (soundData.type === 'piano-roll-sequence') {
                    const sourceTrack = getTrackById(soundData.sourceTrackId);
                    const sequence = sourceTrack?.sequences.sequences.find(s => s.id === soundData.sequenceId);
                    if (targetTrack && sequence) {
                        targetTrack.clips.addMidiClip(sequence, startTime);
                    }
                } else if (soundData.type === 'sound-browser-item') {
                    localAppServices.showNotification(`Cannot drag from Sound Browser to timeline yet. Drop on a sampler track's inspector instead.`, 4000);
                }
            } catch(e) {
                console.error("Error parsing dropped JSON data:", e);
            }
        }
    }
}

export function handleOpenYouTubeImporter() {
    if (localAppServices.openYouTubeImporterWindow) {
        localAppServices.openYouTubeImporterWindow();
    } else {
        localAppServices.showNotification("YouTube Importer UI is currently unavailable.", 3000);
    }
}
