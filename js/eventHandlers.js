// js/eventHandlers.js - Global Event Listeners and Input Handling Module
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
    setActiveSequencerTrackIdState as setActiveSequencerTrackId,
    setIsRecordingState as setIsRecording,
    isTrackRecordingState,
    setRecordingTrackIdState as setRecordingTrackId,
    getRecordingTrackIdState as getRecordingTrackId,
    setRecordingStartTimeState as setRecordingStartTime,
    removeTrackFromStateInternal as coreRemoveTrackFromState,
    getPlaybackModeState,
    setPlaybackModeState,
    getMidiAccessState,
    setActiveMIDIInputState,
    getUndoStackState, 
    getRedoStackState  
} from './state.js';

let localAppServices = {};
let transportKeepAliveBufferSource = null;
let silentKeepAliveBuffer = null;

export function initializeEventHandlersModule(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
}

export function initializePrimaryEventListeners() {
    const uiCache = localAppServices.uiElementsCache || {};

    uiCache.startButton?.addEventListener('click', () => {
        uiCache.startMenu?.classList.toggle('hidden');
        if (!uiCache.startMenu?.classList.contains('hidden')) {
            updateUndoRedoButtons();
        }
    });

    document.addEventListener('click', (e) => {
        if (uiCache.startMenu && !uiCache.startMenu.classList.contains('hidden')) {
            if (!uiCache.startMenu.contains(e.target) && e.target !== uiCache.startButton) {
                uiCache.startMenu.classList.add('hidden');
            }
        }
    });

    // --- Start Menu Item Listeners ---
    uiCache.menuAddSynthTrack?.addEventListener('click', () => {
        localAppServices.initAudioContextAndMasterMeter?.(true);
        const newTrack = localAppServices.addTrack('Synth');
        if (newTrack) { localAppServices.openTrackInspectorWindow?.(newTrack.id); }
        uiCache.startMenu.classList.add('hidden');
    });
    uiCache.menuAddSamplerTrack?.addEventListener('click', () => {
        localAppServices.initAudioContextAndMasterMeter?.(true);
        const newTrack = localAppServices.addTrack('Sampler');
        if (newTrack) { localAppServices.openTrackInspectorWindow?.(newTrack.id); }
        uiCache.startMenu.classList.add('hidden');
    });
    uiCache.menuAddDrumSamplerTrack?.addEventListener('click', () => {
        localAppServices.initAudioContextAndMasterMeter?.(true);
        const newTrack = localAppServices.addTrack('DrumSampler');
        if (newTrack) { localAppServices.openTrackInspectorWindow?.(newTrack.id); }
        uiCache.startMenu.classList.add('hidden');
    });
    uiCache.menuAddInstrumentSamplerTrack?.addEventListener('click', () => {
        localAppServices.initAudioContextAndMasterMeter?.(true);
        const newTrack = localAppServices.addTrack('InstrumentSampler');
        if (newTrack) { localAppServices.openTrackInspectorWindow?.(newTrack.id); }
        uiCache.startMenu.classList.add('hidden');
    });
    uiCache.menuAddAudioTrack?.addEventListener('click', () => {
        localAppServices.initAudioContextAndMasterMeter?.(true);
        const newTrack = localAppServices.addTrack('Audio');
        if (newTrack) { localAppServices.openTrackInspectorWindow?.(newTrack.id); }
        uiCache.startMenu.classList.add('hidden');
    });

    uiCache.menuOpenSoundBrowser?.addEventListener('click', () => {
        localAppServices.openSoundBrowserWindow?.();
        uiCache.startMenu.classList.add('hidden');
    });
    
    document.getElementById('menuOpenYouTubeImporter')?.addEventListener('click', () => {
        handleOpenYouTubeImporter();
        uiCache.startMenu.classList.add('hidden');
    });

    uiCache.menuOpenTimeline?.addEventListener('click', () => {
        localAppServices.openTimelineWindow?.();
        uiCache.startMenu.classList.add('hidden');
    });
    
    document.getElementById('menuOpenPianoRoll')?.addEventListener('click', () => {
        const currentTracks = getTracks();
        const firstInstrumentTrack = currentTracks.find(t => t.type === 'Synth' || t.type === 'InstrumentSampler');
        if (firstInstrumentTrack) {
            handleOpenPianoRoll(firstInstrumentTrack.id);
        } else {
            showNotification("Add a Synth or Instrument Sampler track first.", 3000);
        }
        uiCache.startMenu?.classList.add('hidden');
    });

    uiCache.menuOpenMixer?.addEventListener('click', () => {
        localAppServices.openMixerWindow?.();
        uiCache.startMenu.classList.add('hidden');
    });

    uiCache.menuOpenMasterEffects?.addEventListener('click', () => {
        localAppServices.openMasterEffectsRackWindow?.();
        uiCache.startMenu.classList.add('hidden');
    });

    uiCache.menuUndo?.addEventListener('click', () => {
        localAppServices.undoLastAction?.();
        updateUndoRedoButtons(); 
        uiCache.startMenu.classList.add('hidden');
    });

    uiCache.menuRedo?.addEventListener('click', () => {
        localAppServices.redoLastAction?.();
        updateUndoRedoButtons();
        uiCache.startMenu.classList.add('hidden');
    });

    uiCache.menuSaveProject?.addEventListener('click', () => {
        localAppServices.saveProject?.();
        uiCache.startMenu.classList.add('hidden');
    });

    uiCache.menuLoadProject?.addEventListener('click', () => {
        uiCache.loadProjectInput?.click();
        uiCache.startMenu.classList.add('hidden');
    });

    uiCache.menuExportWav?.addEventListener('click', () => {
        localAppServices.exportToWav?.();
        uiCache.startMenu.classList.add('hidden');
    });

    uiCache.menuToggleFullScreen?.addEventListener('click', () => {
        toggleFullScreen();
        uiCache.startMenu.classList.add('hidden');
    });

    if (uiCache.loadProjectInput && localAppServices.handleProjectFileLoad) {
        uiCache.loadProjectInput.addEventListener('change', localAppServices.handleProjectFileLoad);
    }
}

export function attachGlobalControlEvents(uiCache) {
    const playBtn = document.getElementById('playBtnGlobalTop');
    const stopBtn = document.getElementById('stopBtnGlobalTop');
    const recordBtn = document.getElementById('recordBtnGlobalTop');
    const tempoInput = document.getElementById('tempoGlobalInputTop');
    const midiSelect = document.getElementById('midiInputSelectGlobalTop');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const taskbarTempoDisplay = document.getElementById('taskbarTempoDisplay');
    const playbackModeToggle = document.getElementById('playbackModeToggleBtnGlobalTop');

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
        
        if (currentlyRecording) { // Stop recording
            setIsRecording(false);
            recordBtn.classList.remove('recording');
            if (localAppServices.stopAudioRecording) {
                await localAppServices.stopAudioRecording();
            }
        } else if (armedTrack && armedTrack.type === 'Audio') { // Start recording
            const success = await localAppServices.startAudioRecording(armedTrack, armedTrack.isMonitoringEnabled);
            if (success) {
                setIsRecording(true);
                setRecordingTrackId(armedTrackId);
                setRecordingStartTime(Tone.Transport.seconds);
                recordBtn.classList.add('recording');
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

    taskbarTempoDisplay?.addEventListener('click', () => {
        tempoInput?.select();
    });

    // --- Start of Corrected Code ---
    midiSelect?.addEventListener('change', selectMIDIInput);
    // --- End of Corrected Code ---
    
    playbackModeToggle?.addEventListener('click', () => {
        const currentMode = getPlaybackModeState();
        const newMode = currentMode === 'sequencer' ? 'song' : 'sequencer';
        setPlaybackModeState(newMode);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
        
        if (e.code === 'Space') {
            e.preventDefault();
            handlePlayStop();
        } else if (e.key === 'Escape') {
            handleStop();
        } else if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) {
            handleRecord();
        }
    });
}

function updateUndoRedoButtons() {
    const uiCache = localAppServices.uiElementsCache || {};
    const menuUndo = uiCache.menuUndo;
    const menuRedo = uiCache.menuRedo;
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

// --- MIDI Handling ---
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
        if (command === 144 && velocity > 0) { // Note On
            armedTrack.instrument.triggerAttack(note, Tone.now(), velocity / 127);
        } else if (command === 128 || (command === 144 && velocity === 0)) { // Note Off
            armedTrack.instrument.triggerRelease(note, Tone.now());
        }
    }
}

// --- Track Context Menu and Actions ---
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

// --- Timeline Lane Drop Handling ---
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
