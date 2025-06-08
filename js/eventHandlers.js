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
    getRedoStackState  
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
        const firstInstrumentTrack = currentTracks.find(t => t.type === 'Synth' || t.type === 'InstrumentSampler');
        if (firstInstrumentTrack) {
            handleOpenPianoRoll(firstInstrumentTrack.id);
        } else {
            showNotification("Add a Synth or Instrument Sampler track first.", 3000);
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
    
    const handlePlayStop = async () => {
        const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
        if (!audioReady) {
            showNotification("Audio context not running. Please interact with the page.", 3000);
            return;
        }

        if (Tone.Transport.state === 'started') {
            Tone.Transport.pause();
        } else {
            Tone.Transport.start();
        }
    };
    
    const handleStop = () => {
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
            if (armedTrack?.type === 'Audio' && localAppServices.stopAudioRecording) {
                await localAppServices.stopAudioRecording();
            }
        } else if (armedTrack) {
            setRecordingTrackId(armedTrackId);
            setIsRecording(true);
            recordBtn.classList.add('recording');
    
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

    playBtn?.addEventListener('click', handlePlayStop);
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
        const newMode = currentMode === 'sequencer' ? 'song' : 'sequencer';
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
        const key = e.key.toLowerCase();

        if (Constants.computerKeySynthMap[key] && !currentlyPressedKeys.has(key)) {
            e.preventDefault();
            const armedTrackId = getArmedTrackId();
            const armedTrack = getTrackById(armedTrackId);
            
            if (armedTrack && armedTrack.instrument) {
                const noteNumber = Constants.computerKeySynthMap[key] + (Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT * 12);
                const frequency = Tone.Midi(noteNumber).toFrequency();
                armedTrack.instrument.triggerAttack(frequency, Tone.now(), 0.75);
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
                        const activeSequence = track.getActiveSequence();
                        track.removeNotesFromSequence(activeSequence.id, pianoRoll.selectedNotes);
                        
                        const win = localAppServices.getWindowById(`pianoRollWin-${track.id}`);
                        if (win) {
                            win.close(true);
                            localAppServices.openPianoRollWindow(track.id);
                        }
                    }
                }
            } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                if (lastActivePianoRollTrackId !== null) {
                    e.preventDefault();
                    
                    const pianoRoll = openPianoRolls.get(lastActivePianoRollTrackId);
                    if (pianoRoll && pianoRoll.selectedNotes.size > 0) {
                        const track = pianoRoll.track;
                        const activeSequence = track.getActiveSequence();

                        let pitchOffset = 0;
                        let timeOffset = 0;

                        switch (e.key) {
                            case 'ArrowUp':    pitchOffset = -1; break;
                            case 'ArrowDown':  pitchOffset = 1;  break;
                            case 'ArrowLeft':  timeOffset = -1;  break;
                            case 'ArrowRight': timeOffset = 1;   break;
                        }

                        const newSelection = track.moveSelectedNotes(activeSequence.id, pianoRoll.selectedNotes, pitchOffset, timeOffset);

                        if (newSelection) {
                            pianoRoll.selectedNotes.clear();
                            newSelection.forEach(id => pianoRoll.selectedNotes.add(id));
                            
                            const win = localAppServices.getWindowById(`pianoRollWin-${track.id}`);
                            if (win) {
                                win.close(true);
                                localAppServices.openPianoRollWindow(track.id);
                            }
                        }
                    }
                }
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (Constants.computerKeySynthMap[key]) {
            e.preventDefault();
            const armedTrackId = getArmedTrackId();
            const armedTrack = getTrackById(armedTrackId);

            if (armedTrack && armedTrack.instrument) {
                const noteNumber = Constants.computerKeySynthMap[key] + (Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT * 12);
                const frequency = Tone.Midi(noteNumber).toFrequency();
                armedTrack.instrument.triggerRelease(frequency, Tone.now());
                currentlyPressedKeys.delete(key);
            }
        }
    });
}

// ... (rest of file remains the same)
