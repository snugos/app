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
    getUndoStackState, 
    getRedoStackState  
} from './state.js';

let localAppServices = {};
const currentlyPressedKeys = new Set();

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

    // --- FIX: Make this handler async to wait for track initialization ---
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
        
        if (currentlyRecording) {
            setIsRecording(false);
            recordBtn.classList.remove('recording');
            if (localAppServices.stopAudioRecording) {
                await localAppServices.stopAudioRecording();
            }
        } else if (armedTrack && armedTrack.type === 'Audio') {
            const success = await localAppServices.startAudioRecording(armedTrack, armedTrack.isMonitoringEnabled);
            if (success) {
                setIsRecording(true);
                setRecordingTrackId(armedTrackId);
                if (Tone.Transport.state !== 'started') {
                    Tone.Transport.start();
                }
            }
        } else if (armedTrack) {
            showNotification(`Cannot record on a ${armedTrack.type} track. Arm an Audio track.`, 3000);
        } else {
            showNotification("No track armed for recording.", 2500);
        }
    };

    playBtn?.addEventListener('click', handlePlayStop);
    stopBtn?.addEventListener('click', handleStop);
    recordBtn?.addEventListener('click', handleRecord);

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
                const note = Constants.computerKeySynthMap[key] + (Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT * 12);
                armedTrack.instrument.triggerAttack(note, Tone.now(), 0.75);
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
                const note = Constants.computerKeySynthMap[key] + (Constants.COMPUTER_KEY_SYNTH_OCTAVE_SHIFT * 12);
                armedTrack.instrument.triggerRelease(note, Tone.now());
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
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess({ sysex: false })
            .then(onMIDISuccess)
            .catch(onMIDIFailure);
    } else {
        console.warn("Web MIDI API is not supported in this browser.");
    }
}

function onMIDISuccess(midiAccess) {
    if (localAppServices.setMidiAccess) {
        localAppServices.setMidiAccess(midiAccess);
    }
    populateMIDIInputSelector();
    midiAccess.onstatechange = populateMIDIInputSelector;
}

function onMIDIFailure(msg) {
    showNotification(`Failed to get MIDI access - ${msg}`, 4000);
}

function populateMIDIInputSelector() {
    const midiSelect = document.getElementById('midiInputSelectGlobalTop');
    const midiAccess = getMidiAccessState();
    if (!midiSelect || !midiAccess) return;

    midiSelect.innerHTML = '<option value="">None</option>';
    if (midiAccess.inputs.size > 0) {
        midiAccess.inputs.forEach(input => {
            const option = document.createElement('option');
            option.value = input.id;
            option.textContent = input.name;
            midiSelect.appendChild(option);
        });
    }
    
    const activeInput = getActiveMIDIInputState();
    if (activeInput) {
        midiSelect.value = activeInput.id;
    }
}

export function selectMIDIInput(event) {
    const midiAccess = getMidiAccessState();
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
    const [command, note, velocity] = message.data;
    const armedTrackId = getArmedTrackId();
    const armedTrack = getTrackById(armedTrackId);
    
    if (armedTrack && armedTrack.instrument) {
        if (command === 144 && velocity > 0) {
            armedTrack.instrument.triggerAttack(note, Tone.now(), velocity / 127);
        } else if (command === 128 || (command === 144 && velocity === 0)) {
            armedTrack.instrument.triggerRelease(note, Tone.now());
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
                targetTrack.addExternalAudioFileAsClip?.(file, startTime, file.name);
            } else {
                showNotification(`Cannot add audio files to a ${targetTrack.type} track. Drop on an Audio track.`, 3500);
            }
        }
    } else {
        const jsonDataString = event.dataTransfer.getData("application/json");
        if (jsonDataString) {
            const soundData = JSON.parse(jsonDataString);
            if (soundData.type === 'sound-browser-item') {
                showNotification(`Cannot drag from Sound Browser to timeline yet. Drop on a sampler track's inspector instead.`, 4000);
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
