// js/eventhandlers.js - Global Event Listeners and Input Handling Module
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
    setIsRecordingState as setIsRecording,
    isTrackRecordingState,
    setRecordingTrackIdState as setRecordingTrackId,
    removeTrackFromStateInternal as coreRemoveTrackFromState,
    getPlaybackModeState,
    setPlaybackModeState,
    getMidiAccessState,
    setActiveMIDIInputState,
    getActiveMIDIInputState,
    getUndoStackState, 
    getRedoStackState,
    getRecordingTrackIdState,
    setRecordingStartTimeState
} from './state.js';
import { incrementOctaveShift, decrementOctaveShift } from './constants.js';
import { lastActivePianoRollTrackId, openPianoRolls } from './ui/pianoRollUI.js';


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
        createContextMenu(e, menuItems, localAppServices);
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
        handleOpenYouTubeImporter();
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuOpenTimeline')?.addEventListener('click', () => {
        localAppServices.openTimelineWindow?.();
        startMenu?.classList.add('hidden');
    });
    
    document.getElementById('menuOpenPianoRoll')?.addEventListener('click', () => {
        const currentTracks = getTracks();
        const firstInstrumentTrack = currentTracks.find(t => t.type === 'Synth' || t.type === 'InstrumentSampler' || t.type === 'Sampler' || t.type === 'DrumSampler');
        if (firstInstrumentTrack) {
            handleOpenPianoRoll(firstInstrumentTrack.id);
        } else {
            showNotification("Add an instrument or sampler track first.", 3000);
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

    document.getElementById('menuUndo')?.addEventListener('click', () => {
        localAppServices.undoLastAction?.();
        updateUndoRedoButtons(); 
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuRedo')?.addEventListener('click', () => {
        localAppServices.redoLastAction?.();
        updateUndoRedoButtons();
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuSaveProject')?.addEventListener('click', () => {
        localAppServices.saveProject?.();
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuLoadProject')?.addEventListener('click', () => {
        document.getElementById('loadProjectInput')?.click();
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuExportWav')?.addEventListener('click', () => {
        localAppServices.exportToWav?.();
        startMenu?.classList.add('hidden');
    });
    
    // NEW: Event listener for opening a profile page in a new tab
    document.getElementById('menuOpenTestProfile')?.addEventListener('click', () => {
        // Replace 'testuser' with a username that actually exists in your database
        const usernameToOpen = 'testuser';
        window.open(`profile.html?user=${usernameToOpen}`, '_blank');
        document.getElementById('startMenu')?.classList.add('hidden');
    });

    document.getElementById('menuRefreshMidi')?.addEventListener('click', () => {
        showNotification('Refreshing MIDI devices...', 1500);
        setupMIDI();
        startMenu?.classList.add('hidden');
    });

    document.getElementById('menuToggleFullScreen')?.addEventListener('click', () => {
        toggleFullScreen();
        startMenu?.classList.add('hidden');
    });

    const loadProjectInput = document.getElementById('loadProjectInput');
    if (loadProjectInput && localAppServices.handleProjectFileLoad) {
        loadProjectInput.addEventListener('change', localAppServices.handleProjectFileLoad);
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
        const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
        if (!audioReady) {
            showNotification("Audio context not running. Please interact with the page.", 3000);
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
        const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
        if (!audioReady) {
            showNotification("Audio context not running. Please interact with the page.", 3000);
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
        const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
        if (!audioReady) return;
    
        const currentlyRecording = isTrackRecordingState();
        const armedTrackId = getArmedTrackId();
        const armedTrack = getTrackById(armedTrackId);
        
        const recordBtn = document.getElementById('recordBtnGlobalTop');

        if (currentlyRecording) {
            setIsRecording(false);
            recordBtn.classList.remove('recording');
            if (getRecordingTrackId() === armedTrackId && armedTrack?.type === 'Audio' && localAppServices.stopAudioRecording) {
                await localAppServices.stopAudioRecording();
            }
            if (Tone.Transport.state === 'started') {
                handleStop();
            }
        } else if (armedTrack) {
            setRecordingTrackId(armedTrackId);
            setIsRecording(true);
            recordBtn.classList.add('recording');
            
            setRecordingStartTimeState(Tone.Transport.seconds);
    
            if (armedTrack.type === 'Audio') {
                const success = await localAppServices.startAudioRecording(armedTrack, armedTrack.isMonitoringEnabled);
                if (!success) {
                    setIsRecording(false);
                    recordBtn.classList.remove('recording');
                    return;
                }
            }
    
            if (Tone.Transport.state !== 'started') {
                Tone.Transport.start();
            }
        } else {
            showNotification("No track armed for recording.", 2500);
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
        localAppServices.setCurrentUserThemePreference?.(newTheme);
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
            return;
        }
        if (e.repeat) return;
        
        // This line includes the fix for the toLowerCase error
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
                decrementOctaveShift();
                localAppServices.showNotification?.(`Keyboard Octave: ${Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT > 0 ? '+' : ''}${Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT}`, 1000);
            } else if (key === 'x') {
                incrementOctaveShift();
                localAppServices.showNotification?.(`Keyboard Octave: ${Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT > 0 ? '+' : ''}${Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT}`, 1000);
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (lastActivePianoRollTrackId !== null) {
                    const pianoRoll = openPianoRolls.get(lastActivePianoRollTrackId);
                    if (pianoRoll && pianoRoll.selectedNotes.size > 0) {
                        e.preventDefault();
                        const track = pianoRoll.track;
                        const activeSequence = track.sequences.getActiveSequence();
                        track.sequences.removeNotesFromSequence(activeSequence.id, pianoRoll.selectedNotes);
                        
                        const win = localAppServices.getWindowById(`pianoRollWin-${track.id}`);
                        if (win) {
                            win.close(true);
                            localAppServices.openPianoRollWindow(track.id, activeSequence.id);
                        }
                    }
                }
            } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                if (lastActivePianoRollTrackId !== null) {
                    e.preventDefault();
                    
                    const pianoRoll = openPianoRolls.get(lastActivePianoRollTrackId);
                    if (pianoRoll && pianoRoll.selectedNotes.size > 0) {
                        const track = pianoRoll.track;
                        const activeSequence = track.sequences.getActiveSequence();

                        let pitchOffset = 0;
                        let timeOffset = 0;

                        switch (e.key) {
                            case 'ArrowUp':    pitchOffset = -1; break;
                            case 'ArrowDown':  pitchOffset = 1;  break;
                            case 'ArrowLeft':  timeOffset = -1;  break;
                            case 'ArrowRight': timeOffset = 1;   break;
                        }

                        const newSelection = track.sequences.moveSelectedNotes(activeSequence.id, pianoRoll.selectedNotes, pitchOffset, timeOffset);

                        if (newSelection) {
                            pianoRoll.selectedNotes.clear();
                            newSelection.forEach(id => pianoRoll.selectedNotes.add(id));
                            
                            const win = localAppServices.getWindowById(`pianoRollWin-${track.id}`);
                            if (win) {
                                win.close(true);
                                localAppServices.openPianoRollWindow(track.id, activeSequence.id);
                            }
                        }
                    }
                }
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
    const menuUndo = document.getElementById('menuUndo');
    const menuRedo = document.getElementById('menuRedo');
    if (menuUndo) {
        const undoStack = getUndoStackState();
        if (undoStack.length > 0) {
            menuUndo.classList.remove('disabled');
            menuUndo.title = `Undo: ${undoStack[undoStack.length - 1].actionDescription}`;
        } else {
            menuUndo.classList.add('disabled');
            menuUndo.title = 'Undo';
        }
    }
    if (menuRedo) {
        const redoStack = getRedoStackState();
        if (redoStack.length > 0) {
            menuRedo.classList.remove('disabled');
            menuRedo.title = `Redo: ${redoStack[redoStack.length - 1].actionDescription}`;
        } else {
            menuRedo.classList.add('disabled');
            menuRedo.title = 'Redo';
        }
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            showNotification(`Error attempting to enable full-screen mode: ${err.message}`, 3000);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

export function setupMIDI() {
    if (!navigator.requestMIDIAccess) {
        showNotification("Web MIDI is not supported in this browser.", 4000);
        return;
    }
    if (!window.isSecureContext) {
        showNotification("MIDI access requires a secure connection (HTTPS).", 6000);
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
    showNotification(`Failed to get MIDI access: ${error.name}`, 4000);
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
                const currentStep = Math.round(Tone.Transport.ticks / ticksPerStep);
                const pitchIndex = Constants.PIANO_ROLL_END_MIDI_NOTE - noteNumber;

                if (pitchIndex >= 0 && pitchIndex < Constants.SYNTH_PITCHES.length) {
                    track.sequences.addNoteToSequence(activeSequence.id, pitchIndex, currentStep, { velocity: velocity / 127, duration: 1 });
                    
                    const pianoRollWindow = localAppServices.getWindowById?.(`pianoRollWin-${track.id}`);
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
    const track = getTrackById(trackId);
    if (!track) return;
    captureStateForUndo(`${track.isMuted ? 'Unmute' : 'Mute'} Track: ${track.name}`);
    track.isMuted = !track.isMuted;
    track.applyMuteState();
    if (localAppServices.updateTrackUI) {
        localAppServices.updateTrackUI(trackId, 'muteChanged');
    }
}

export function handleTrackSolo(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    captureStateForUndo(`Solo Track: ${track.name}`);
    const currentSoloId = getSoloedTrackId();
    const newSoloId = (currentSoloId === trackId) ? null : trackId;
    setSoloedTrackId(newSoloId);
    getTracks().forEach(t => {
        if (t.updateSoloMuteState) {
            t.updateSoloMuteState(newSoloId);
        }
    });
    if (localAppServices.updateMixerWindow) {
        localAppServices.updateMixerWindow();
    }
}

export function handleTrackArm(trackId) {
    const currentArmedId = getArmedTrackId();
    const newArmedId = (currentArmedId === trackId) ? null : trackId;
    setArmedTrackId(newArmedId);
    localAppServices.updateTrackUI?.(trackId, 'armChanged');
    if (currentArmedId !== null) {
        localAppServices.updateTrackUI?.(currentArmedId, 'armChanged');
    }
}

export function handleRemoveTrack(trackId) {
    const track = getTrackById(trackId);
    if (!track) return;
    showConfirmationDialog('Remove Track', `Are you sure you want to remove "${track.name}"? This cannot be undone.`, () => {
        coreRemoveTrackFromState(trackId);
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
        showNotification("Piano Roll UI is currently unavailable.", 3000);
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
                showNotification(`Cannot add audio files to a ${targetTrack.type} track. Drop on an Audio track.`, 3500);
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
                    showNotification(`Cannot drag from Sound Browser to timeline yet. Drop on a sampler track's inspector instead.`, 4000);
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
        showNotification("YouTube Importer UI is currently unavailable.", 3000);
    }
}
