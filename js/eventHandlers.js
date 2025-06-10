// js/eventhandlers.js - Global Event Listeners and Input Handling Module
import * as Constants from './constants.js'; // [cite: eventHandlers.js]
import { showNotification, showConfirmationDialog, createContextMenu } from './utils.js'; // [cite: eventHandlers.js]
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
} from './state.js'; // [cite: eventHandlers.js]
import { incrementOctaveShift, decrementOctaveShift } from './constants.js'; // [cite: eventHandlers.js]
import { lastActivePianoRollTrackId, openPianoRolls } from './ui/pianoRollUI.js'; // [cite: eventHandlers.js]


let localAppServices = {}; // [cite: eventHandlers.js]
const currentlyPressedKeys = new Set(); // [cite: eventHandlers.js]
let isSustainPedalDown = false; // [cite: eventHandlers.js]
const sustainedNotes = new Map(); // [cite: eventHandlers.js]

export function initializeEventHandlersModule(appServicesFromMain) {
    localAppServices = appServicesFromMain || {}; // [cite: eventHandlers.js]
}

export function initializePrimaryEventListeners() {
    const startButton = document.getElementById('startButton'); // [cite: eventHandlers.js]
    const startMenu = document.getElementById('startMenu'); // [cite: eventHandlers.js]
    const desktopEl = document.getElementById('desktop'); // [cite: eventHandlers.js]
    const customBgInput = document.getElementById('customBgInput'); // [cite: eventHandlers.js]

    startButton?.addEventListener('click', (e) => { // [cite: eventHandlers.js]
        e.stopPropagation(); // [cite: eventHandlers.js]
        startMenu?.classList.toggle('hidden'); // [cite: eventHandlers.js]
        if (!startMenu?.classList.contains('hidden')) { // [cite: eventHandlers.js]
            updateUndoRedoButtons();
        }
    });

    document.addEventListener('click', (e) => { // [cite: eventHandlers.js]
        if (startMenu && !startMenu.classList.contains('hidden')) { // [cite: eventHandlers.js]
            if (!startMenu.contains(e.target) && e.target !== startButton) { // [cite: eventHandlers.js]
                startMenu.classList.add('hidden'); // [cite: eventHandlers.js]
            }
        }
    });
    
    desktopEl?.addEventListener('contextmenu', (e) => { // [cite: eventHandlers.js]
        e.preventDefault(); // [cite: eventHandlers.js]
        const menuItems = [ // [cite: eventHandlers.js]
            {
                label: 'Change Background',
                action: () => customBgInput?.click()
            }
        ];
        createContextMenu(e, menuItems, localAppServices); // [cite: eventHandlers.js]
    });
    
    customBgInput?.addEventListener('change', (e) => { // [cite: eventHandlers.js]
        const file = e.target.files[0]; // [cite: eventHandlers.js]
        if (file) { // [cite: eventHandlers.js]
            localAppServices.applyCustomBackground(file);
        }
        e.target.value = null;  // [cite: eventHandlers.js]
    });


    const addTrackHandler = async (type) => { // [cite: eventHandlers.js]
        await localAppServices.initAudioContextAndMasterMeter?.(true); // [cite: eventHandlers.js]
        const newTrack = await localAppServices.addTrack(type); // [cite: eventHandlers.js]
        if (newTrack) { // [cite: eventHandlers.js]
            localAppServices.openTrackInspectorWindow?.(newTrack.id); // [cite: eventHandlers.js]
        }
        startMenu?.classList.add('hidden'); // [cite: eventHandlers.js]
    };
    
    document.getElementById('menuAddSynthTrack')?.addEventListener('click', () => addTrackHandler('Synth')); // [cite: eventHandlers.js]
    document.getElementById('menuAddSamplerTrack')?.addEventListener('click', () => addTrackHandler('Sampler')); // [cite: eventHandlers.js]
    document.getElementById('menuAddDrumSamplerTrack')?.addEventListener('click', () => addTrackHandler('DrumSampler')); // [cite: eventHandlers.js]
    document.getElementById('menuAddInstrumentSamplerTrack')?.addEventListener('click', () => addTrackHandler('InstrumentSampler')); // [cite: eventHandlers.js]
    document.getElementById('menuAddAudioTrack')?.addEventListener('click', () => addTrackHandler('Audio')); // [cite: eventHandlers.js]
    
    document.getElementById('menuOpenSoundBrowser')?.addEventListener('click', () => { // [cite: eventHandlers.js]
        localAppServices.openSoundBrowserWindow?.(); // [cite: eventHandlers.js]
        startMenu?.classList.add('hidden'); // [cite: eventHandlers.js]
    });
    
    document.getElementById('menuOpenYouTubeImporter')?.addEventListener('click', () => { // [cite: eventHandlers.js]
        handleOpenYouTubeImporter(); // [cite: eventHandlers.js]
        startMenu?.classList.add('hidden'); // [cite: eventHandlers.js]
    });

    document.getElementById('menuOpenTimeline')?.addEventListener('click', () => { // [cite: eventHandlers.js]
        localAppServices.openTimelineWindow?.(); // [cite: eventHandlers.js]
        startMenu?.classList.add('hidden'); // [cite: eventHandlers.js]
    });
    
    document.getElementById('menuOpenPianoRoll')?.addEventListener('click', () => { // [cite: eventHandlers.js]
        const currentTracks = getTracks(); // [cite: eventHandlers.js]
        const firstInstrumentTrack = currentTracks.find(t => t.type === 'Synth' || t.type === 'InstrumentSampler' || t.type === 'Sampler' || t.type === 'DrumSampler'); // [cite: eventHandlers.js]
        if (firstInstrumentTrack) { // [cite: eventHandlers.js]
            handleOpenPianoRoll(firstInstrumentTrack.id); // [cite: eventHandlers.js]
        } else {
            showNotification("Add an instrument or sampler track first.", 3000); // [cite: eventHandlers.js]
        }
        startMenu?.classList.add('hidden'); // [cite: eventHandlers.js]
    });

    document.getElementById('menuOpenMixer')?.addEventListener('click', () => { // [cite: eventHandlers.js]
        localAppServices.openMixerWindow?.(); // [cite: eventHandlers.js]
        startMenu?.classList.add('hidden'); // [cite: eventHandlers.js]
    });

    document.getElementById('menuOpenMasterEffects')?.addEventListener('click', () => { // [cite: eventHandlers.js]
        localAppServices.openMasterEffectsRackWindow?.(); // [cite: eventHandlers.js]
        startMenu?.classList.add('hidden'); // [cite: eventHandlers.js]
    });

    document.getElementById('menuUndo')?.addEventListener('click', () => { // [cite: eventHandlers.js]
        localAppServices.undoLastAction?.(); // [cite: eventHandlers.js]
        updateUndoRedoButtons(); // [cite: eventHandlers.js]
        startMenu?.classList.add('hidden'); // [cite: eventHandlers.js]
    });

    document.getElementById('menuRedo')?.addEventListener('click', () => { // [cite: eventHandlers.js]
        localAppServices.redoLastAction?.(); // [cite: eventHandlers.js]
        updateUndoRedoButtons();
        startMenu?.classList.add('hidden'); // [cite: eventHandlers.js]
    });

    document.getElementById('menuSaveProject')?.addEventListener('click', () => { // [cite: eventHandlers.js]
        localAppServices.saveProject?.(); // [cite: eventHandlers.js]
        startMenu?.classList.add('hidden'); // [cite: eventHandlers.js]
    });

    document.getElementById('menuLoadProject')?.addEventListener('click', () => { // [cite: eventHandlers.js]
        document.getElementById('loadProjectInput')?.click(); // [cite: eventHandlers.js]
        startMenu?.classList.add('hidden'); // [cite: eventHandlers.js]
    });

    document.getElementById('menuExportWav')?.addEventListener('click', () => { // [cite: eventHandlers.js]
        localAppServices.exportToWav?.(); // [cite: eventHandlers.js]
        startMenu?.classList.add('hidden'); // [cite: eventHandlers.js]
    });

    document.getElementById('menuRefreshMidi')?.addEventListener('click', () => { // [cite: eventHandlers.js]
        showNotification('Refreshing MIDI devices...', 1500); // [cite: eventHandlers.js]
        setupMIDI(); // [cite: eventHandlers.js]
        startMenu?.classList.add('hidden'); // [cite: eventHandlers.js]
    });

    document.getElementById('menuToggleFullScreen')?.addEventListener('click', () => { // [cite: eventHandlers.js]
        toggleFullScreen(); // [cite: eventHandlers.js]
        startMenu?.classList.add('hidden'); // [cite: eventHandlers.js]
    });

    const loadProjectInput = document.getElementById('loadProjectInput'); // [cite: eventHandlers.js]
    if (loadProjectInput && localAppServices.handleProjectFileLoad) { // [cite: eventHandlers.js]
        loadProjectInput.addEventListener('change', localAppServices.handleProjectFileLoad); // [cite: eventHandlers.js]
    }
}

export function attachGlobalControlEvents(uiCache) {
    const playBtn = document.getElementById('playBtnGlobalTop'); // [cite: eventHandlers.js]
    const stopBtn = document.getElementById('stopBtnGlobalTop'); // [cite: eventHandlers.js]
    const recordBtn = document.getElementById('recordBtnGlobalTop'); // [cite: eventHandlers.js]
    const tempoInput = document.getElementById('tempoGlobalInputTop'); // [cite: eventHandlers.js]
    const midiSelect = document.getElementById('midiInputSelectGlobalTop'); // [cite: eventHandlers.js]
    const playbackModeToggle = document.getElementById('playbackModeToggleBtnGlobalTop'); // [cite: eventHandlers.js]
    const themeToggleBtn = document.getElementById('themeToggleBtn'); // [cite: eventHandlers.js]
    const metronomeBtn = document.getElementById('metronomeToggleBtn'); // [cite: eventHandlers.js]
    
    const handlePlayPause = async () => { // [cite: eventHandlers.js]
        const audioReady = await localAppServices.initAudioContextAndMasterMeter(true); // [cite: eventHandlers.js]
        if (!audioReady) { // [cite: eventHandlers.js]
            showNotification("Audio context not running. Please interact with the page.", 3000); // [cite: eventHandlers.js]
            return; // [cite: eventHandlers.js]
        }

        const transportState = Tone.Transport.state; // [cite: eventHandlers.js]

        if (transportState === 'started') { // [cite: eventHandlers.js]
            Tone.Transport.pause(); // [cite: eventHandlers.js]
        } else {
            if (transportState === 'stopped') { // [cite: eventHandlers.js]
                localAppServices.onPlaybackModeChange?.(getPlaybackModeState(), 'reschedule'); // [cite: eventHandlers.js]
            }
            Tone.Transport.start(); // [cite: eventHandlers.js]
        }
    };

    const handlePlayStop = async () => { // [cite: eventHandlers.js]
        const audioReady = await localAppServices.initAudioContextAndMasterMeter(true); // [cite: eventHandlers.js]
        if (!audioReady) { // [cite: eventHandlers.js]
            showNotification("Audio context not running. Please interact with the page.", 3000); // [cite: eventHandlers.js]
            return; // [cite: eventHandlers.js]
        }

        if (Tone.Transport.state === 'started') { // [cite: eventHandlers.js]
            handleStop(); // [cite: eventHandlers.js]
        } else {
            localAppServices.onPlaybackModeChange?.(getPlaybackModeState(), 'reschedule'); // [cite: eventHandlers.js]
            Tone.Transport.start(); // [cite: eventHandlers.js]
        }
    };
    
    const handleStop = () => { // [cite: eventHandlers.js]
        localAppServices.forceStopAllAudio?.(); // [cite: eventHandlers.js]
        
        if (Tone.Transport.state !== 'stopped') { // [cite: eventHandlers.js]
            Tone.Transport.stop(); // [cite: eventHandlers.js]
        }
    };

    const handleRecord = async () => { // [cite: eventHandlers.js]
        const audioReady = await localAppServices.initAudioContextAndMasterMeter(true); // [cite: eventHandlers.js]
        if (!audioReady) return; // [cite: eventHandlers.js]
    
        const currentlyRecording = isTrackRecordingState(); // [cite: eventHandlers.js]
        const armedTrackId = getArmedTrackId(); // [cite: eventHandlers.js]
        const armedTrack = getTrackById(armedTrackId); // [cite: eventHandlers.js]
        
        const recordBtn = document.getElementById('recordBtnGlobalTop'); // [cite: eventHandlers.js]

        if (currentlyRecording) { // [cite: eventHandlers.js]
            setIsRecording(false); // [cite: eventHandlers.js]
            recordBtn.classList.remove('recording'); // [cite: eventHandlers.js]
            if (getRecordingTrackId() === armedTrackId && armedTrack?.type === 'Audio' && localAppServices.stopAudioRecording) { // [cite: eventHandlers.js]
                await localAppServices.stopAudioRecording(); // [cite: eventHandlers.js]
            }
            if (Tone.Transport.state === 'started') { // [cite: eventHandlers.js]
                handleStop(); // [cite: eventHandlers.js]
            }
        } else if (armedTrack) { // [cite: eventHandlers.js]
            setRecordingTrackId(armedTrackId); // [cite: eventHandlers.js]
            setIsRecording(true); // [cite: eventHandlers.js]
            recordBtn.classList.add('recording'); // [cite: eventHandlers.js]
            
            setRecordingStartTimeState(Tone.Transport.seconds); // [cite: eventHandlers.js]
    
            if (armedTrack.type === 'Audio') { // [cite: eventHandlers.js]
                const success = await localAppServices.startAudioRecording(armedTrack, armedTrack.isMonitoringEnabled); // [cite: eventHandlers.js]
                if (!success) { // [cite: eventHandlers.js]
                    setIsRecording(false); // [cite: eventHandlers.js]
                    recordBtn.classList.remove('recording'); // [cite: eventHandlers.js]
                    return; // [cite: eventHandlers.js]
                }
            }
    
            if (Tone.Transport.state !== 'started') { // [cite: eventHandlers.js]
                Tone.Transport.start(); // [cite: eventHandlers.js]
            }
        } else {
            showNotification("No track armed for recording.", 2500); // [cite: eventHandlers.js]
        }
    };

    playBtn?.addEventListener('click', handlePlayPause); // [cite: eventHandlers.js]
    stopBtn?.addEventListener('click', handleStop); // [cite: eventHandlers.js]
    recordBtn?.addEventListener('click', handleRecord); // [cite: eventHandlers.js]
    
    metronomeBtn?.addEventListener('click', () => { // [cite: eventHandlers.js]
        const isEnabled = localAppServices.toggleMetronome(); // [cite: eventHandlers.js]
        metronomeBtn.classList.toggle('active', isEnabled); // [cite: eventHandlers.js]
    });

    tempoInput?.addEventListener('change', (e) => { // [cite: eventHandlers.js]
        const newTempo = parseFloat(e.target.value); // [cite: eventHandlers.js]
        if (newTempo >= Constants.MIN_TEMPO && newTempo <= Constants.MAX_TEMPO) { // [cite: eventHandlers.js]
            Tone.Transport.bpm.value = newTempo; // [cite: eventHandlers.js]
        }
    });

    document.getElementById('taskbarTempoDisplay')?.addEventListener('click', () => { // [cite: eventHandlers.js]
        tempoInput?.select(); // [cite: eventHandlers.js]
    });

    midiSelect?.addEventListener('change', selectMIDIInput); // [cite: eventHandlers.js]
    
    playbackModeToggle?.addEventListener('click', () => { // [cite: eventHandlers.js]
        const currentMode = getPlaybackModeState(); // [cite: eventHandlers.js]
        const newMode = currentMode === 'piano-roll' ? 'timeline' : 'piano-roll'; // [cite: eventHandlers.js]
        setPlaybackModeState(newMode); // [cite: eventHandlers.js]
    });
    
    themeToggleBtn?.addEventListener('click', () => { // [cite: eventHandlers.js]
        const isLightTheme = document.body.classList.contains('theme-light'); // [cite: eventHandlers.js]
        const newTheme = isLightTheme ? 'dark' : 'light'; // [cite: eventHandlers.js]
        localAppServices.setCurrentUserThemePreference?.(newTheme); // [cite: eventHandlers.js]
    });

    document.addEventListener('keydown', (e) => { // [cite: eventHandlers.js]
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) { // [cite: eventHandlers.js]
            return; // [cite: eventHandlers.js]
        }
        if (e.repeat) return; // [cite: eventHandlers.js]
        
        // FIX: Add a check to ensure e.key is a string before calling toLowerCase()
        const key = typeof e.key === 'string' ? e.key.toLowerCase() : ''; // [cite: eventHandlers.js]

        if (Constants.computerKeySynthMap[key] && !currentlyPressedKeys.has(key)) { // [cite: eventHandlers.js]
            e.preventDefault(); // [cite: eventHandlers.js]
            const armedTrackId = getArmedTrackId(); // [cite: eventHandlers.js]
            const armedTrack = getTrackById(armedTrackId); // [cite: eventHandlers.js]
            
            if (armedTrack && armedTrack.instrument) { // [cite: eventHandlers.js]
                const noteNumber = Constants.computerKeySynthMap[key] + (Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT * 12); // [cite: eventHandlers.js]
                const noteName = Tone.Midi(noteNumber).toNote(); // [cite: eventHandlers.js]
                armedTrack.instrument.triggerAttack(noteName, Tone.now(), 0.75); // [cite: eventHandlers.js]
                currentlyPressedKeys.add(key); // [cite: eventHandlers.js]
            }
        } else {
            if (e.code === 'Space') { // [cite: eventHandlers.js]
                e.preventDefault(); // [cite: eventHandlers.js]
                handlePlayStop(); // [cite: eventHandlers.js]
            } else if (e.key === 'Escape') { // [cite: eventHandlers.js]
                handleStop(); // [cite: eventHandlers.js]
            } else if (key === 'r' && !e.ctrlKey && !e.metaKey) { // [cite: eventHandlers.js]
                handleRecord(); // [cite: eventHandlers.js]
            } else if (key === 'z') { // [cite: eventHandlers.js]
                decrementOctaveShift(); // [cite: eventHandlers.js]
                localAppServices.showNotification?.(`Keyboard Octave: ${Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT > 0 ? '+' : ''}${Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT}`, 1000); // [cite: eventHandlers.js]
            } else if (key === 'x') { // [cite: eventHandlers.js]
                incrementOctaveShift(); // [cite: eventHandlers.js]
                localAppServices.showNotification?.(`Keyboard Octave: ${Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT > 0 ? '+' : ''}${Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT}`, 1000); // [cite: eventHandlers.js]
            } else if (e.key === 'Delete' || e.key === 'Backspace') { // [cite: eventHandlers.js]
                if (lastActivePianoRollTrackId !== null) { // [cite: eventHandlers.js]
                    const pianoRoll = openPianoRolls.get(lastActivePianoRollTrackId); // [cite: eventHandlers.js]
                    if (pianoRoll && pianoRoll.selectedNotes.size > 0) { // [cite: eventHandlers.js]
                        e.preventDefault(); // [cite: eventHandlers.js]
                        const track = pianoRoll.track; // [cite: eventHandlers.js]
                        const activeSequence = track.sequences.getActiveSequence(); // [cite: eventHandlers.js]
                        track.sequences.removeNotesFromSequence(activeSequence.id, pianoRoll.selectedNotes); // [cite: eventHandlers.js]
                        
                        const win = localAppServices.getWindowById(`pianoRollWin-${track.id}`); // [cite: eventHandlers.js]
                        if (win) { // [cite: eventHandlers.js]
                            win.close(true); // [cite: eventHandlers.js]
                            localAppServices.openPianoRollWindow(track.id, activeSequence.id); // [cite: eventHandlers.js]
                        }
                    }
                }
            } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) { // [cite: eventHandlers.js]
                if (lastActivePianoRollTrackId !== null) { // [cite: eventHandlers.js]
                    e.preventDefault(); // [cite: eventHandlers.js]
                    
                    const pianoRoll = openPianoRolls.get(lastActivePianoRollTrackId); // [cite: eventHandlers.js]
                    if (pianoRoll && pianoRoll.selectedNotes.size > 0) { // [cite: eventHandlers.js]
                        const track = pianoRoll.track; // [cite: eventHandlers.js]
                        const activeSequence = track.sequences.getActiveSequence(); // [cite: eventHandlers.js]

                        let pitchOffset = 0; // [cite: eventHandlers.js]
                        let timeOffset = 0; // [cite: eventHandlers.js]

                        switch (e.key) { // [cite: eventHandlers.js]
                            case 'ArrowUp':    pitchOffset = -1; break;
                            case 'ArrowDown':  pitchOffset = 1;  break;
                            case 'ArrowLeft':  timeOffset = -1;  break;
                            case 'ArrowRight': timeOffset = 1;   break;
                        }

                        const newSelection = track.sequences.moveSelectedNotes(activeSequence.id, pianoRoll.selectedNotes, pitchOffset, timeOffset); // [cite: eventHandlers.js]

                        if (newSelection) { // [cite: eventHandlers.js]
                            pianoRoll.selectedNotes.clear(); // [cite: eventHandlers.js]
                            newSelection.forEach(id => pianoRoll.selectedNotes.add(id)); // [cite: eventHandlers.js]
                            
                            const win = localAppServices.getWindowById(`pianoRollWin-${track.id}`); // [cite: eventHandlers.js]
                            if (win) { // [cite: eventHandlers.js]
                                win.close(true); // [cite: eventHandlers.js]
                                localAppServices.openPianoRollWindow(track.id, activeSequence.id); // [cite: eventHandlers.js]
                            }
                        }
                    }
                }
            }
        }
    });

    document.addEventListener('keyup', (e) => { // [cite: eventHandlers.js]
        const key = typeof e.key === 'string' ? e.key.toLowerCase() : ''; // [cite: eventHandlers.js]
        if (Constants.computerKeySynthMap[key]) { // [cite: eventHandlers.js]
            e.preventDefault(); // [cite: eventHandlers.js]
            const armedTrackId = getArmedTrackId(); // [cite: eventHandlers.js]
            const armedTrack = getTrackById(armedTrackId); // [cite: eventHandlers.js]

            if (armedTrack && armedTrack.instrument) { // [cite: eventHandlers.js]
                const noteNumber = Constants.computerKeySynthMap[key] + (Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT * 12); // [cite: eventHandlers.js]
                const noteName = Tone.Midi(noteNumber).toNote(); // [cite: eventHandlers.js]
                armedTrack.instrument.triggerRelease(noteName, Tone.now()); // [cite: eventHandlers.js]
                currentlyPressedKeys.delete(key); // [cite: eventHandlers.js]
            }
        }
    });
}

function updateUndoRedoButtons() {
    const menuUndo = document.getElementById('menuUndo'); // [cite: eventHandlers.js]
    const menuRedo = document.getElementById('menuRedo'); // [cite: eventHandlers.js]
    if (menuUndo) { // [cite: eventHandlers.js]
        const undoStack = getUndoStackState(); // [cite: eventHandlers.js]
        if (undoStack.length > 0) { // [cite: eventHandlers.js]
            menuUndo.classList.remove('disabled'); // [cite: eventHandlers.js]
            menuUndo.title = `Undo: ${undoStack[undoStack.length - 1].actionDescription}`; // [cite: eventHandlers.js]
        } else {
            menuUndo.classList.add('disabled'); // [cite: eventHandlers.js]
            menuUndo.title = 'Undo'; // [cite: eventHandlers.js]
        }
    }
    if (menuRedo) { // [cite: eventHandlers.js]
        const redoStack = getRedoStackState(); // [cite: eventHandlers.js]
        if (redoStack.length > 0) { // [cite: eventHandlers.js]
            menuRedo.classList.remove('disabled'); // [cite: eventHandlers.js]
            menuRedo.title = `Redo: ${redoStack[redoStack.length - 1].actionDescription}`; // [cite: eventHandlers.js]
        } else {
            menuRedo.classList.add('disabled'); // [cite: eventHandlers.js]
            menuRedo.title = 'Redo'; // [cite: eventHandlers.js]
        }
    }
}

function toggleFullScreen() {
    if (!document.fullscreenElement) { // [cite: eventHandlers.js]
        document.documentElement.requestFullscreen().catch(err => { // [cite: eventHandlers.js]
            showNotification(`Error attempting to enable full-screen mode: ${err.message}`, 3000); // [cite: eventHandlers.js]
        });
    } else {
        if (document.exitFullscreen) { // [cite: eventHandlers.js]
            document.exitFullscreen(); // [cite: eventHandlers.js]
        }
    }
}

export function setupMIDI() {
    if (!navigator.requestMIDIAccess) { // [cite: eventHandlers.js]
        showNotification("Web MIDI is not supported in this browser.", 4000); // [cite: eventHandlers.js]
        return; // [cite: eventHandlers.js]
    }
    if (!window.isSecureContext) { // [cite: eventHandlers.js]
        showNotification("MIDI access requires a secure connection (HTTPS).", 6000); // [cite: eventHandlers.js]
        return; // [cite: eventHandlers.js]
    }

    navigator.requestMIDIAccess({ sysex: true }) // [cite: eventHandlers.js]
        .then(onMIDISuccess) // [cite: eventHandlers.js]
        .catch(onMIDIFailure); // [cite: eventHandlers.js]
}

function onMIDISuccess(midiAccess) {
    localAppServices.setMidiAccess?.(midiAccess); // [cite: eventHandlers.js]
    populateMIDIInputSelector(midiAccess); // [cite: eventHandlers.js]
    midiAccess.onstatechange = () => { // [cite: eventHandlers.js]
        populateMIDIInputSelector(midiAccess); // [cite: eventHandlers.js]
    };
}

function onMIDIFailure(error) {
    console.error("Failed to get MIDI access -", error); // [cite: eventHandlers.js]
    showNotification(`Failed to get MIDI access: ${error.name}`, 4000); // [cite: eventHandlers.js]
}

function populateMIDIInputSelector(midiAccess) {
    const midiSelect = document.getElementById('midiInputSelectGlobalTop'); // [cite: eventHandlers.js]
    if (!midiSelect || !midiAccess) { // [cite: eventHandlers.js]
        return; // [cite: eventHandlers.js]
    }

    const currentInputs = new Set(); // [cite: eventHandlers.js]
    midiSelect.innerHTML = '';  // [cite: eventHandlers.js]

    const noneOption = document.createElement('option'); // [cite: eventHandlers.js]
    noneOption.value = ""; // [cite: eventHandlers.js]
    noneOption.textContent = "None"; // [cite: eventHandlers.js]
    midiSelect.appendChild(noneOption); // [cite: eventHandlers.js]
    
    if (midiAccess.inputs.size > 0) { // [cite: eventHandlers.js]
        midiAccess.inputs.forEach(input => { // [cite: eventHandlers.js]
            currentInputs.add(input.id); // [cite: eventHandlers.js]
            const option = document.createElement('option'); // [cite: eventHandlers.js]
            option.value = input.id; // [cite: eventHandlers.js]
            option.textContent = input.name; // [cite: eventHandlers.js]
            midiSelect.appendChild(option); // [cite: eventHandlers.js]
        });
    }

    const activeInput = getActiveMIDIInputState(); // [cite: eventHandlers.js]
    if (activeInput && currentInputs.has(activeInput.id)) { // [cite: eventHandlers.js]
        midiSelect.value = activeInput.id; // [cite: eventHandlers.js]
    } else {
        setActiveMIDIInputState(null); // [cite: eventHandlers.js]
    }
}

export function selectMIDIInput(event) {
    const midiAccess = localAppServices.getMidiAccess?.(); // [cite: eventHandlers.js]
    const selectedId = event.target.value; // [cite: eventHandlers.js]
    const currentActiveInput = getActiveMIDIInputState(); // [cite: eventHandlers.js]

    if (currentActiveInput) { // [cite: eventHandlers.js]
        currentActiveInput.onmidimessage = null; // [cite: eventHandlers.js]
    }

    if (selectedId && midiAccess) { // [cite: eventHandlers.js]
        const newActiveInput = midiAccess.inputs.get(selectedId); // [cite: eventHandlers.js]
        newActiveInput.onmidimessage = onMIDIMessage; // [cite: eventHandlers.js]
        setActiveMIDIInputState(newActiveInput); // [cite: eventHandlers.js]
    } else {
        setActiveMIDIInputState(null); // [cite: eventHandlers.js]
    }
}

function onMIDIMessage(message) {
    const [command, noteNumber, velocity] = message.data; // [cite: eventHandlers.js]
    const commandType = command & 0xF0; // [cite: eventHandlers.js]
    const noteOn = commandType === 0x90 && velocity > 0; // [cite: eventHandlers.js]
    const noteOff = commandType === 0x80 || (commandType === 0x90 && velocity === 0); // [cite: eventHandlers.js]

    const armedTrackId = getArmedTrackId(); // [cite: eventHandlers.js]
    if (armedTrackId === null) return; // [cite: eventHandlers.js]
    const armedTrack = getTrackById(armedTrackId); // [cite: eventHandlers.js]
    if (!armedTrack || !armedTrack.instrument) return; // [cite: eventHandlers.js]

    if (commandType === 0xB0 && noteNumber === 64) {  // [cite: eventHandlers.js]
        if (velocity > 63) { // [cite: eventHandlers.js]
            isSustainPedalDown = true; // [cite: eventHandlers.js]
        } else {
            isSustainPedalDown = false; // [cite: eventHandlers.js]
            sustainedNotes.forEach((noteValue, midiNote) => { // [cite: eventHandlers.js]
                armedTrack.instrument.triggerRelease(noteValue, Tone.now()); // [cite: eventHandlers.js]
            });
            sustainedNotes.clear(); // [cite: eventHandlers.js]
        }
        return; // [cite: eventHandlers.js]
    }
    
    if (noteOn || noteOff) { // [cite: eventHandlers.js]
        const noteName = Tone.Midi(noteNumber).toNote(); // [cite: eventHandlers.js]
        
        if (noteOn) { // [cite: eventHandlers.js]
            if (sustainedNotes.has(noteNumber)) { // [cite: eventHandlers.js]
                armedTrack.instrument.triggerRelease(sustainedNotes.get(noteName), Tone.now()); // [cite: eventHandlers.js]
                sustainedNotes.delete(noteNumber); // [cite: eventHandlers.js]
            }
            armedTrack.instrument.triggerAttack(noteName, Tone.now(), velocity / 127); // [cite: eventHandlers.js]
        } else { 
            if (isSustainPedalDown) { // [cite: eventHandlers.js]
                sustainedNotes.set(noteNumber, noteName); // [cite: eventHandlers.js]
            } else {
                armedTrack.instrument.triggerRelease(noteName, Tone.now()); // [cite: eventHandlers.js]
            }
        }
    }
    
    if (noteOn && isTrackRecordingState()) { // [cite: eventHandlers.js]
        const track = armedTrack; // [cite: eventHandlers.js]
        if (track.type !== 'Audio') { // [cite: eventHandlers.js]
            const activeSequence = track.sequences.getActiveSequence(); // [cite: eventHandlers.js]
            if (activeSequence) { // [cite: eventHandlers.js]
                const ticksPerStep = Tone.Transport.PPQ / 4; // [cite: eventHandlers.js]
                const currentStep = Math.round(Tone.Transport.ticks / ticksPerStep); // [cite: eventHandlers.js]
                const pitchIndex = Constants.PIANO_ROLL_END_MIDI_NOTE - noteNumber; // [cite: eventHandlers.js]

                if (pitchIndex >= 0 && pitchIndex < Constants.SYNTH_PITCHES.length) { // [cite: eventHandlers.js]
                    track.sequences.addNoteToSequence(activeSequence.id, pitchIndex, currentStep, { velocity: velocity / 127, duration: 1 }); // [cite: eventHandlers.js]
                    
                    const pianoRollWindow = localAppServices.getWindowById?.(`pianoRollWin-${track.id}`); // [cite: eventHandlers.js]
                    if (pianoRollWindow && !pianoRollWindow.isMinimized) { // [cite: eventHandlers.js]
                       if(localAppServices.openPianoRollWindow) { // [cite: eventHandlers.js]
                           pianoRollWindow.close(true); // [cite: eventHandlers.js]
                           localAppServices.openPianoRollWindow(track.id, activeSequence.id); // [cite: eventHandlers.js]
                       }
                    }
                }
            }
        }
    }
}


export function handleTrackMute(trackId) {
    const track = getTrackById(trackId); // [cite: eventHandlers.js]
    if (!track) return; // [cite: eventHandlers.js]
    captureStateForUndo(`${track.isMuted ? 'Unmute' : 'Mute'} Track: ${track.name}`); // [cite: eventHandlers.js]
    track.isMuted = !track.isMuted; // [cite: eventHandlers.js]
    track.applyMuteState(); // [cite: eventHandlers.js]
    if (localAppServices.updateTrackUI) { // [cite: eventHandlers.js]
        localAppServices.updateTrackUI(trackId, 'muteChanged'); // [cite: eventHandlers.js]
    }
}

export function handleTrackSolo(trackId) {
    const track = getTrackById(trackId); // [cite: eventHandlers.js]
    if (!track) return; // [cite: eventHandlers.js]
    captureStateForUndo(`Solo Track: ${track.name}`); // [cite: eventHandlers.js]
    const currentSoloId = getSoloedTrackId(); // [cite: eventHandlers.js]
    const newSoloId = (currentSoloId === trackId) ? null : trackId; // [cite: eventHandlers.js]
    setSoloedTrackId(newSoloId); // [cite: eventHandlers.js]
    getTracks().forEach(t => { // [cite: eventHandlers.js]
        if (t.updateSoloMuteState) { // [cite: eventHandlers.js]
            t.updateSoloMuteState(newSoloId); // [cite: eventHandlers.js]
        }
    });
    if (localAppServices.updateMixerWindow) { // [cite: eventHandlers.js]
        localAppServices.updateMixerWindow(); // [cite: eventHandlers.js]
    }
}

export function handleTrackArm(trackId) {
    const currentArmedId = getArmedTrackId(); // [cite: eventHandlers.js]
    const newArmedId = (currentArmedId === trackId) ? null : trackId; // [cite: eventHandlers.js]
    setArmedTrackId(newArmedId); // [cite: eventHandlers.js]
    localAppServices.updateTrackUI?.(trackId, 'armChanged'); // [cite: eventHandlers.js]
    if (currentArmedId !== null) { // [cite: eventHandlers.js]
        localAppServices.updateTrackUI?.(currentArmedId, 'armChanged'); // [cite: eventHandlers.js]
    }
}

export function handleRemoveTrack(trackId) {
    const track = getTrackById(trackId); // [cite: eventHandlers.js]
    if (!track) return; // [cite: eventHandlers.js]
    showConfirmationDialog('Remove Track', `Are you sure you want to remove "${track.name}"? This cannot be undone.`, () => { // [cite: eventHandlers.js]
        coreRemoveTrackFromState(trackId); // [cite: eventHandlers.js]
    });
}

export function handleOpenTrackInspector(trackId) {
    if (localAppServices.openTrackInspectorWindow) { // [cite: eventHandlers.js]
        localAppServices.openTrackInspectorWindow(trackId); // [cite: eventHandlers.js]
    }
}

export function handleOpenEffectsRack(trackId) {
    if (localAppServices.openTrackEffectsRackWindow) { // [cite: eventHandlers.js]
        localAppServices.openTrackEffectsRackWindow(trackId); // [cite: eventHandlers.js]
    }
}

export function handleOpenPianoRoll(trackId) {
    if (localAppServices.openPianoRollWindow) { // [cite: eventHandlers.js]
        localAppServices.openPianoRollWindow(trackId); // [cite: eventHandlers.js]
    } else {
        showNotification("Piano Roll UI is currently unavailable.", 3000); // [cite: eventHandlers.js]
    }
}

export async function handleTimelineLaneDrop(event, targetTrackId, startTime) {
    const files = event.dataTransfer.files; // [cite: eventHandlers.js]
    const targetTrack = getTrackById(targetTrackId); // [cite: eventHandlers.js]

    if (!targetTrack) return; // [cite: eventHandlers.js]
    
    if (files && files.length > 0) { // [cite: eventHandlers.js]
        const file = files[0]; // [cite: eventHandlers.js]
        if (file.type.startsWith('audio/')) { // [cite: eventHandlers.js]
            if (targetTrack.type === 'Audio') { // [cite: eventHandlers.js]
                targetTrack.addAudioClip(file, startTime, file.name); // [cite: eventHandlers.js]
            } else {
                showNotification(`Cannot add audio files to a ${targetTrack.type} track. Drop on an Audio track.`, 3500); // [cite: eventHandlers.js]
            }
        }
    } else {
        const jsonDataString = event.dataTransfer.getData("application/json"); // [cite: eventHandlers.js]
        if (jsonDataString) { // [cite: eventHandlers.js]
            try { // [cite: eventHandlers.js]
                const soundData = JSON.parse(jsonDataString); // [cite: eventHandlers.js]
                if (soundData.type === 'piano-roll-sequence') { // [cite: eventHandlers.js]
                    const sourceTrack = getTrackById(soundData.sourceTrackId); // [cite: eventHandlers.js]
                    const sequence = sourceTrack?.sequences.sequences.find(s => s.id === soundData.sequenceId); // [cite: eventHandlers.js]
                    if (targetTrack && sequence) { // [cite: eventHandlers.js]
                        targetTrack.clips.addMidiClip(sequence, startTime); // [cite: eventHandlers.js]
                    }
                } else if (soundData.type === 'sound-browser-item') { // [cite: eventHandlers.js]
                    showNotification(`Cannot drag from Sound Browser to timeline yet. Drop on a sampler track's inspector instead.`, 4000); // [cite: eventHandlers.js]
                }
            } catch(e) {
                console.error("Error parsing dropped JSON data:", e); // [cite: eventHandlers.js]
            }
        }
    }
}

export function handleOpenYouTubeImporter() {
    if (localAppServices.openYouTubeImporterWindow) { // [cite: eventHandlers.js]
        localAppServices.openYouTubeImporterWindow(); // [cite: eventHandlers.js]
    } else {
        showNotification("YouTube Importer UI is currently unavailable.", 3000); // [cite: eventHandlers.js]
    }
}
