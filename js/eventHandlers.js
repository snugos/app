// js/eventHandlers.js - Global Event Listeners and Input Handling Module
import * as Constants from './constants.js';
import { showNotification, showConfirmationDialog, createContextMenu } from './utils.js';
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
import { Track } from './Track.js'; // Import Track for instanceof check

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
            startMenu?.classList.toggle('hidden');
            if (startMenu && !startMenu.classList.contains('hidden')) {
                startButton.classList.add('active');
            } else if (startButton) {
                startButton.classList.remove('active');
            }
        });

        document.addEventListener('click', (e) => {
            if (startMenu && !startMenu.classList.contains('hidden') && startButton && !startButton.contains(e.target) && !startMenu.contains(e.target)) {
                startMenu.classList.add('hidden');
                startButton.classList.remove('active');
            }
        });

        document.getElementById('menuAddSynthTrack')?.addEventListener('click', () => { addTrack('Synth', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); startButton?.classList.remove('active'); });
        document.getElementById('menuAddSamplerTrack')?.addEventListener('click', () => { addTrack('Sampler', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); startButton?.classList.remove('active'); });
        document.getElementById('menuAddDrumSamplerTrack')?.addEventListener('click', () => { addTrack('DrumSampler', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); startButton?.classList.remove('active'); });
        document.getElementById('menuAddInstrumentSamplerTrack')?.addEventListener('click', () => { addTrack('InstrumentSampler', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); startButton?.classList.remove('active');});


        document.getElementById('menuOpenSoundBrowser')?.addEventListener('click', () => { if(typeof openSoundBrowserWindow === 'function') openSoundBrowserWindow(); else console.error("openSoundBrowserWindow is not defined"); startMenu?.classList.add('hidden'); startButton?.classList.remove('active'); });
        document.getElementById('menuUndo')?.addEventListener('click', () => { if (!document.getElementById('menuUndo').classList.contains('disabled')) { undoLastAction(); } startMenu?.classList.add('hidden'); startButton?.classList.remove('active'); });
        document.getElementById('menuRedo')?.addEventListener('click', () => { if (!document.getElementById('menuRedo').classList.contains('disabled')) { redoLastAction(); } startMenu?.classList.add('hidden'); startButton?.classList.remove('active'); });
        document.getElementById('menuSaveProject')?.addEventListener('click', () => { saveProject(); startMenu?.classList.add('hidden'); startButton?.classList.remove('active'); });
        document.getElementById('menuLoadProject')?.addEventListener('click', () => {
            if (typeof loadProject === 'function') loadProject();
            else document.getElementById('loadProjectInput')?.click();
            startMenu?.classList.add('hidden'); startButton?.classList.remove('active');
        });
        document.getElementById('menuExportWav')?.addEventListener('click', () => { exportToWav(); startMenu?.classList.add('hidden'); startButton?.classList.remove('active'); });
        document.getElementById('menuOpenGlobalControls')?.addEventListener('click', () => { if(typeof openGlobalControlsWindow === 'function') openGlobalControlsWindow(); else console.error("openGlobalControlsWindow is not defined"); startMenu?.classList.add('hidden'); startButton?.classList.remove('active'); });
        document.getElementById('menuOpenMixer')?.addEventListener('click', () => { if(typeof openMixerWindow === 'function') openMixerWindow(); else console.error("openMixerWindow is not defined"); startMenu?.classList.add('hidden'); startButton?.classList.remove('active'); });
        document.getElementById('menuOpenMasterEffects')?.addEventListener('click', () => {
            if(typeof openMasterEffectsRackWindow === 'function') openMasterEffectsRackWindow(); else console.error("openMasterEffectsRackWindow is not defined");
            startMenu?.classList.add('hidden'); startButton?.classList.remove('active');
        });
        document.getElementById('menuUploadCustomBg')?.addEventListener('click', () => {
            if (triggerCustomBackgroundUpload) triggerCustomBackgroundUpload();
            startMenu?.classList.add('hidden'); startButton?.classList.remove('active');
        });
        document.getElementById('menuRemoveCustomBg')?.addEventListener('click', () => {
            if (removeCustomDesktopBackground) removeCustomDesktopBackground();
            startMenu?.classList.add('hidden'); startButton?.classList.remove('active');
        });

        
        document.getElementById('menuToggleFullScreen')?.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    showNotification(`Error entering full screen: ${err.message}`, 3000);
                });
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
            startMenu?.classList.add('hidden'); startButton?.classList.remove('active');
        });

        const desktopElement = document.getElementById('desktop');
        if (desktopElement) {
            desktopElement.addEventListener('contextmenu', (event) => {
                event.preventDefault();
                console.log('[EventHandlers] Desktop context menu triggered.');

                const menuItems = [
                    {
                        label: "Change Custom Background...",
                        action: () => {
                            if (appContext && typeof appContext.triggerCustomBackgroundUpload === 'function') {
                                appContext.triggerCustomBackgroundUpload();
                            } else {
                                console.error("triggerCustomBackgroundUpload function not available in appContext.");
                            }
                        }
                    },
                    {
                        label: "Remove Custom Background",
                        action: () => {
                             if (appContext && typeof appContext.removeCustomDesktopBackground === 'function') {
                                appContext.removeCustomDesktopBackground();
                            } else {
                                console.error("removeCustomDesktopBackground function not available in appContext.");
                            }
                        }
                    }
                ];

                if (typeof createContextMenu === 'function') { 
                    createContextMenu(event, menuItems);
                } else if (typeof window.createContextMenu === 'function') { 
                    window.createContextMenu(event, menuItems);
                } else {
                    console.error("[EventHandlers] createContextMenu function is not available for desktop.");
                }
            });
        } else {
            console.warn("[EventHandlers] Desktop element not found, cannot attach context menu.");
        }


        const loadProjectInputEl = document.getElementById('loadProjectInput');
        if (loadProjectInputEl && typeof handleProjectFileLoad === 'function') {
            loadProjectInputEl.addEventListener('change', handleProjectFileLoad);
        } 

        document.addEventListener('keydown', handleComputerKeyDown);
        document.addEventListener('keyup', handleComputerKeyUp);

        if (!window.transportEventsInitialized && typeof Tone !== 'undefined' && Tone.Transport) {
            Tone.Transport.on('start', () => {
                console.log("[EventHandlers] Tone.Transport 'start' EVENT FIRED. Current state:", Tone.Transport.state);
                if (window.playBtn) {window.playBtn.textContent = 'Pause'; window.playBtn.classList.remove('bg-green-500','hover:bg-green-600','dark:bg-green-600','dark:hover:bg-green-700'); window.playBtn.classList.add('bg-yellow-500','hover:bg-yellow-600','dark:bg-yellow-600','dark:hover:bg-yellow-700');}
            });
            Tone.Transport.on('pause', () => {
                console.log("[EventHandlers] Tone.Transport 'pause' EVENT FIRED. Current state:", Tone.Transport.state);
                if (window.playBtn) {window.playBtn.textContent = 'Play'; window.playBtn.classList.add('bg-green-500','hover:bg-green-600','dark:bg-green-600','dark:hover:bg-green-700'); window.playBtn.classList.remove('bg-yellow-500','hover:bg-yellow-600','dark:bg-yellow-600','dark:hover:bg-yellow-700');}
                if (isTrackRecording()) {
                    setIsRecording(false);
                    if(window.recordBtn) { window.recordBtn.textContent = 'Record'; window.recordBtn.classList.remove('recording','armed'); }
                    showNotification("Recording stopped due to transport pause.", 2000);
                    captureStateForUndo(`Stop Recording (transport paused)`);
                    setRecordingTrackId(null);
                }
            });
            Tone.Transport.on('stop', () => {
                console.log("[EventHandlers] Tone.Transport 'stop' EVENT FIRED. Current state:", Tone.Transport.state);
                if (window.playBtn) {window.playBtn.textContent = 'Play'; window.playBtn.classList.add('bg-green-500','hover:bg-green-600','dark:bg-green-600','dark:hover:bg-green-700'); window.playBtn.classList.remove('bg-yellow-500','hover:bg-yellow-600','dark:bg-yellow-600','dark:hover:bg-yellow-700');}
                document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));
                 getTracks().forEach(track => track.currentPlayheadStep = -1); // Reset playhead for all tracks

                if (isTrackRecording()) {
                    setIsRecording(false);
                     if(window.recordBtn) { window.recordBtn.textContent = 'Record'; window.recordBtn.classList.remove('recording','armed'); }
                    showNotification("Recording stopped due to transport stop.", 2000);
                    captureStateForUndo(`Stop Recording (transport stopped)`);
                    setRecordingTrackId(null);
                }
            });
            window.transportEventsInitialized = true;
        }
         // Global Keyboard Shortcuts
        document.addEventListener('keydown', (event) => {
            const activeElement = document.activeElement;
            const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);
            const isCtrlPressed = event.ctrlKey || event.metaKey;

            if (isCtrlPressed && !isInputFocused) {
                switch (event.key.toLowerCase()) {
                    case 's': event.preventDefault(); if (typeof saveProject === 'function') saveProject(); break;
                    case 'o': event.preventDefault(); if (typeof loadProject === 'function') loadProject(); break;
                    case 'z':
                        if (event.shiftKey) { // Ctrl+Shift+Z or Cmd+Shift+Z for Redo
                            event.preventDefault();
                            if (typeof redoLastAction === 'function') redoLastAction();
                        } else { // Ctrl+Z or Cmd+Z for Undo
                            event.preventDefault();
                            if (typeof undoLastAction === 'function') undoLastAction();
                        }
                        break;
                    case 'y': // Ctrl+Y or Cmd+Y for Redo
                        event.preventDefault();
                        if (typeof redoLastAction === 'function') redoLastAction();
                        break;
                    // case 'n': // Ctrl+N - temporarily removed
                    //     event.preventDefault();
                    //     showConfirmationDialog('New Project', 'Create a new project? Any unsaved changes will be lost.',
                    //         () => { if (typeof window.reconstructDAW === 'function') window.reconstructDAW(null, true); }
                    //     );
                    //     break;
                }
            }
        });

    } catch (error) {
        console.error("[EventHandlers] Error during initializePrimaryEventListeners:", error);
        showNotification("Error setting up primary event listeners. Some UI elements might not work.", 5000);
    }
}

export function attachGlobalControlEvents(globalControlsWindowElement) {
    console.log("[EventHandlers] attachGlobalControlEvents called with element:", globalControlsWindowElement);
    if (!globalControlsWindowElement) {
        console.error("[EventHandlers] attachGlobalControlEvents: globalControlsWindowElement is null. Cannot attach events.");
        return;
    }
    try {
        const playButton = globalControlsWindowElement.querySelector('#playBtnGlobal');
        console.log("[EventHandlers] Play button query result:", playButton);
        if (playButton) {
            playButton.addEventListener('click', async () => {
                console.log("[EventHandlers] Play/Pause button clicked. Current Tone.Transport.state:", Tone.Transport.state);
                try {
                    const audioReady = await window.initAudioContextAndMasterMeter(true);
                    if (!audioReady) {
                        console.warn("[EventHandlers] Audio context not ready after play button click.");
                        showNotification("Audio system not ready. Please try again or check browser permissions.", 3000);
                        return;
                    }

                    if (Tone.Transport.state !== 'started') {
                        console.log("[EventHandlers] Transport state is not 'started'. Resetting position and starting transport.");
                        document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));
                        getTracks().forEach(track => track.currentPlayheadStep = -1);
                        Tone.Transport.start(); 
                        console.log("[EventHandlers] After Tone.Transport.start() call. New state:", Tone.Transport.state);
                    } else {
                        console.log("[EventHandlers] Transport state is 'started'. Pausing transport.");
                        Tone.Transport.pause();
                        console.log("[EventHandlers] After Tone.Transport.pause() call. New state:", Tone.Transport.state);
                    }
                } catch (error) {
                    console.error("[EventHandlers] Error in play/pause click:", error);
                    showNotification("Error starting playback. AudioContext might not be ready.", 3000);
                }
            });
        } else { console.warn("[EventHandlers] Play button (#playBtnGlobal) not found in global controls window."); }

        const recordButton = globalControlsWindowElement.querySelector('#recordBtnGlobal');
        console.log("[EventHandlers] Record button query result:", recordButton);
        if (recordButton) {
            recordButton.addEventListener('click', async () => {
                console.log("[EventHandlers] Record button clicked.");
                 try {
                    const audioReady = await window.initAudioContextAndMasterMeter(true);
                    if (!audioReady) {
                        showNotification("Audio system not ready for recording.", 3000);
                        return;
                    }

                    if (!isTrackRecording()) {
                        const currentArmedTrackId = getArmedTrackId();
                        if (!currentArmedTrackId) { showNotification("No track armed for recording.", 3000); return; }
                        const trackToRecord = getTrackById(currentArmedTrackId);
                        if (!trackToRecord) { showNotification("Armed track not found.", 3000); return; }

                        setIsRecording(true);
                        setRecordingTrackId(currentArmedTrackId);
                        setRecordingStartTime(Tone.Transport.seconds);

                        recordButton.textContent = 'Stop Rec'; recordButton.classList.add('recording','armed');

                        showNotification(`Recording started for ${trackToRecord.name}.`, 2000);
                        captureStateForUndo(`Start Recording on ${trackToRecord.name}`);
                        if (Tone.Transport.state !== 'started') {
                            document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));
                            getTracks().forEach(track => track.currentPlayheadStep = -1);
                            Tone.Transport.start(); 
                            console.log("[EventHandlers] Record button started transport. New state:", Tone.Transport.state);
                        }
                    } else {
                        setIsRecording(false);
                        recordButton.textContent = 'Record'; recordButton.classList.remove('recording','armed'); // Keep armed if track is still armed

                        const recordedTrack = getTrackById(getRecordingTrackId());
                        showNotification("Recording stopped.", 2000);
                        captureStateForUndo(`Stop Recording (Track: ${recordedTrack?.name || 'Unknown'})`);
                        setRecordingTrackId(null);
                    }
                } catch (error) {
                    console.error("[EventHandlers] Error in record button click:", error);
                    showNotification("Error during recording setup.", 3000);
                    recordButton.textContent = 'Record'; recordButton.classList.remove('recording');
                    if(getArmedTrackId() === null) recordButton.classList.remove('armed');
                    setIsRecording(false); setRecordingTrackId(null);
                }
            });
        } else { console.warn("[EventHandlers] Record button (#recordBtnGlobal) not found in global controls window."); }

        const tempoInputElement = globalControlsWindowElement.querySelector('#tempoGlobalInput');
        console.log("[EventHandlers] Tempo input query result:", tempoInputElement);
        if (tempoInputElement) {
            tempoInputElement.addEventListener('change', (e) => {
                console.log("[EventHandlers] Tempo input changed. Raw value:", e.target.value);
                const newTempo = parseFloat(e.target.value);
                console.log("[EventHandlers] Parsed newTempo:", newTempo);
                const taskbarTempoDisplay = document.getElementById('taskbarTempoDisplay');
                if (!isNaN(newTempo) && newTempo >= Constants.MIN_TEMPO && newTempo <= Constants.MAX_TEMPO) { // Using constants
                    if (Tone.Transport.bpm.value !== newTempo) captureStateForUndo(`Set Tempo to ${newTempo.toFixed(1)} BPM`);
                    Tone.Transport.bpm.value = newTempo;
                    console.log("[EventHandlers] Tone.Transport.bpm is now:", Tone.Transport.bpm.value);
                    if(typeof window.updateTaskbarTempoDisplay === 'function') window.updateTaskbarTempoDisplay(newTempo);
                } else {
                    e.target.value = Tone.Transport.bpm.value.toFixed(1);
                    showNotification(`Tempo must be between ${Constants.MIN_TEMPO} and ${Constants.MAX_TEMPO}.`, 2500);
                }
            });
        } else { console.warn("[EventHandlers] Tempo input (#tempoGlobalInput) not found in global controls window."); }


        if (window.midiInputSelectGlobal) {
            window.midiInputSelectGlobal.onchange = () => {
                console.log("[EventHandlers] midiInputSelectGlobal changed.");
                // Undo capture is handled within selectMIDIInput if it's not a silent update
                selectMIDIInput(window.midiInputSelectGlobal.value, false); // false to allow undo/notification
            };
        } else {
            console.warn("[EventHandlers] attachGlobalControlEvents: window.midiInputSelectGlobal not found.");
        }
    } catch (error) {
        console.error("[EventHandlers] UNCAUGHT ERROR during event attachment:", error);
        showNotification("Critical error setting up global control events. Functionality will be impaired.", 5000);
    }
}


export async function setupMIDI() {
    console.log("[EventHandlers] setupMIDI called.");
    if (navigator.requestMIDIAccess) {
        try {
            console.log("[EventHandlers] Requesting MIDI access...");
            window.midiAccess = await navigator.requestMIDIAccess();
            console.log("[EventHandlers] MIDI Access Granted:", window.midiAccess);
            populateMIDIInputs();
            window.midiAccess.onstatechange = populateMIDIInputs;
        } catch (e) {
            console.error("[EventHandlers] Could not access MIDI devices.", e);
            showNotification(`Could not access MIDI: ${e.message}. Ensure permissions.`, 6000);
        }
    } else {
        console.warn("[EventHandlers] Web MIDI API not supported in this browser.");
        showNotification("Web MIDI API not supported in this browser.", 3000);
    }
}

function populateMIDIInputs() {
    console.log("[EventHandlers] populateMIDIInputs called.");
    if (!window.midiAccess) {
        console.warn("[EventHandlers] populateMIDIInputs: window.midiAccess is null.");
        return;
    }
    if (!window.midiInputSelectGlobal) {
        console.warn("[EventHandlers] populateMIDIInputs: window.midiInputSelectGlobal is null. Cannot populate MIDI dropdown.");
        return;
    }

    const previouslySelectedId = window.activeMIDIInput ? window.activeMIDIInput.id : window.midiInputSelectGlobal.value;
    console.log(`[EventHandlers] populateMIDIInputs: Previously selected MIDI ID: ${previouslySelectedId}`);
    window.midiInputSelectGlobal.innerHTML = '<option value="">No MIDI Input</option>';

    const inputs = window.midiAccess.inputs;
    if (inputs.size === 0) {
        console.log("[EventHandlers] No MIDI input devices found.");
    } else {
        inputs.forEach(input => {
            console.log(`[EventHandlers] Found MIDI Input: ID=${input.id}, Name=${input.name}, State=${input.state}, Connection=${input.connection}`);
            const option = document.createElement('option');
            option.value = input.id;
            option.textContent = input.name;
            window.midiInputSelectGlobal.appendChild(option);
        });
    }

    if (previouslySelectedId && window.midiAccess.inputs.get(previouslySelectedId)) {
        window.midiInputSelectGlobal.value = previouslySelectedId;
        console.log(`[EventHandlers] Restored MIDI selection to: ${previouslySelectedId} (${window.midiAccess.inputs.get(previouslySelectedId).name})`);
    } else {
        window.midiInputSelectGlobal.value = "";
        if (previouslySelectedId) {
            console.log(`[EventHandlers] Previously selected MIDI ID ${previouslySelectedId} not found or no longer valid. Defaulting to 'No MIDI Input'.`);
        }
    }
    selectMIDIInput(window.midiInputSelectGlobal.value, true); // Update selection silently
}

export function selectMIDIInput(inputId, skipUndoCaptureAndNotification = false) {
    console.log(`[EventHandlers] selectMIDIInput called with ID: "${inputId}". skipUndo: ${skipUndoCaptureAndNotification}`);
    if (window.activeMIDIInput) {
        console.log(`[EventHandlers] Removing onmidimessage from old input: ${window.activeMIDIInput.name}`);
        window.activeMIDIInput.onmidimessage = null;
    }
    window.activeMIDIInput = null;

    if (window.midiInputSelectGlobal && window.midiInputSelectGlobal.value !== inputId) {
        // Sync dropdown if called programmatically with a different ID
        window.midiInputSelectGlobal.value = inputId || "";
    }
    
    const selectedId = inputId || (window.midiInputSelectGlobal ? window.midiInputSelectGlobal.value : null);
    console.log(`[EventHandlers] Effective selected MIDI ID: ${selectedId}`);


    if (window.midiAccess && selectedId) {
        const inputDevice = window.midiAccess.inputs.get(selectedId);
        if (inputDevice) {
            window.activeMIDIInput = inputDevice;
            console.log(`[EventHandlers] Setting onmidimessage for new input: ${window.activeMIDIInput.name}`);
            window.activeMIDIInput.onmidimessage = handleMIDIMessage;
            if (!skipUndoCaptureAndNotification) {
                if (typeof captureStateForUndo === 'function') captureStateForUndo(`Select MIDI Input ${window.activeMIDIInput.name}`);
                showNotification(`MIDI Input: ${window.activeMIDIInput.name} selected.`, 2000);
            }
        } else {
             if (!skipUndoCaptureAndNotification) showNotification("Selected MIDI input not found or unavailable.", 2000);
             console.warn(`[EventHandlers] Selected MIDI device ID "${selectedId}" not found in available inputs.`);
        }
    } else {
        if (!skipUndoCaptureAndNotification && (inputId === "" || inputId === null)) showNotification("MIDI Input deselected.", 1500);
        console.log("[EventHandlers] No MIDI input selected or midiAccess not available.");
    }
    if (window.midiIndicatorGlobalEl) window.midiIndicatorGlobalEl.classList.toggle('active', !!window.activeMIDIInput);
}


export async function handleMIDIMessage(message) {
    const [command, note, velocity] = message.data;
    const time = Tone.now();
    const normVel = velocity / 127;

    if (window.midiIndicatorGlobalEl) {
        window.midiIndicatorGlobalEl.classList.add('active');
        setTimeout(() => window.midiIndicatorGlobalEl.classList.remove('active'), 100);
    }

    if (command === 144 && velocity > 0) { 
        const audioReady = await window.initAudioContextAndMasterMeter(true);
        if (!audioReady) {
            console.warn("[EventHandlers] Audio context not ready for MIDI Note On.");
            return;
        }
    }

    const currentArmedTrackId = getArmedTrackId();
    const currentRecordingTrackId = getRecordingTrackId();

    if (isTrackRecording() && currentArmedTrackId === currentRecordingTrackId && command === 144 && velocity > 0) {
        const track = getTrackById(currentRecordingTrackId);
        if (track) {
            const currentTransportTime = Tone.Transport.seconds;
            const sixteenthNoteDuration = Tone.Time("16n").toSeconds();
            let currentStep = Math.round(currentTransportTime / sixteenthNoteDuration);
            currentStep = (currentStep % track.sequenceLength + track.sequenceLength) % track.sequenceLength;

            let rowIndex = -1;
            const pitchName = Tone.Frequency(note, "midi").toNote();
            if (track.type === 'Synth' || track.type === 'InstrumentSampler') {
                rowIndex = Constants.synthPitches.indexOf(pitchName);
            } else if (track.type === 'Sampler') {
                rowIndex = note - Constants.samplerMIDINoteStart;
                if (rowIndex < 0 || rowIndex >= track.slices.length) rowIndex = -1;
            } else if (track.type === 'DrumSampler') {
                rowIndex = note - Constants.samplerMIDINoteStart; // Using samplerMIDINoteStart for drum pads for now
                if (rowIndex < 0 || rowIndex >= Constants.numDrumSamplerPads) rowIndex = -1;
            }

            if (rowIndex !== -1 && currentStep >= 0 && currentStep < track.sequenceLength) {
                if (!track.sequenceData[rowIndex]) track.sequenceData[rowIndex] = Array(track.sequenceLength).fill(null);
                track.sequenceData[rowIndex][currentStep] = { active: true, velocity: normVel };

                if (track.sequencerWindow && !track.sequencerWindow.isMinimized && getActiveSequencerTrackId() === track.id) {
                    const cell = track.sequencerWindow.element.querySelector(`.sequencer-step-cell[data-row="${rowIndex}"][data-col="${currentStep}"]`);
                    if (cell && typeof window.updateSequencerCellUI === 'function') {
                        window.updateSequencerCellUI(cell, track.type, true);
                    }
                }
            }
        }
    }

    if (!currentArmedTrackId) return;
    const currentArmedTrack = getTrackById(currentArmedTrackId);
    if (!currentArmedTrack) return;

    if (command === 144 && velocity > 0) { 
        console.log('[EventHandlers DEBUG] MIDI Note ON. Track:', currentArmedTrack.name, 'Typeof playNote:', typeof currentArmedTrack.playNote);
        if (typeof currentArmedTrack.playNote === 'function') {
            currentArmedTrack.playNote(note, normVel);
        } else {
            console.error(`[EventHandlers] track.playNote is not a function for track ${currentArmedTrack.name}`);
        }
    } else if (command === 128 || (command === 144 && velocity === 0)) { // Note Off
        console.log('[EventHandlers DEBUG] MIDI Note OFF. Track:', currentArmedTrack.name, 'Typeof releaseNote:', typeof currentArmedTrack.releaseNote);
        if (typeof currentArmedTrack.releaseNote === 'function') {
            currentArmedTrack.releaseNote(note);
        } else {
            console.error(`[EventHandlers] track.releaseNote is not a function for track ${currentArmedTrack.name}`);
        }
    }
}


async function handleComputerKeyDown(e) {
    if (e.code === 'Space') {
        e.preventDefault();
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
            const playBtnGlobal = document.getElementById('playBtnGlobal');
            if (playBtnGlobal && typeof playBtnGlobal.click === 'function') {
                playBtnGlobal.click();
            } else if (window.playBtn && typeof window.playBtn.click === 'function') {
                 window.playBtn.click();
            }
        }
        return;
    }

    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA' || activeElement.isContentEditable);
    
    if (!isInputFocused && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (e.code === 'KeyZ') { 
            if (!currentlyPressedComputerKeys[e.code]) { // Prevent rapid fire if key is held
                currentOctaveShift = Math.max(Constants.MIN_OCTAVE_SHIFT, currentOctaveShift - 1);
                showNotification(`Octave: ${currentOctaveShift >= 0 ? '+' : ''}${currentOctaveShift}`, 1000);
            }
            currentlyPressedComputerKeys[e.code] = true; // Mark as pressed
            if(window.keyboardIndicatorGlobalEl) window.keyboardIndicatorGlobalEl.classList.add('active');
            return; 
        }
        if (e.code === 'KeyX') { 
             if (!currentlyPressedComputerKeys[e.code]) {
                currentOctaveShift = Math.min(Constants.MAX_OCTAVE_SHIFT, currentOctaveShift + 1);
                showNotification(`Octave: ${currentOctaveShift >= 0 ? '+' : ''}${currentOctaveShift}`, 1000);
            }
            currentlyPressedComputerKeys[e.code] = true;
            if(window.keyboardIndicatorGlobalEl) window.keyboardIndicatorGlobalEl.classList.add('active');
            return; 
        }
    }


    if (isInputFocused && !(activeElement.id === 'tempoGlobalInput' && (e.key === 'ArrowUp' || e.key === 'ArrowDown'))) { 
      return;
    }
    if (e.repeat || currentlyPressedComputerKeys[e.code]) return; // Prevent processing for held normal keys after initial press

    currentlyPressedComputerKeys[e.code] = true;
    if(window.keyboardIndicatorGlobalEl) window.keyboardIndicatorGlobalEl.classList.add('active');

    const time = Tone.now();
    let baseComputerKeyNote;
    if(Constants.computerKeySynthMap[e.code] !== undefined) baseComputerKeyNote = Constants.computerKeySynthMap[e.code];
    else if (Constants.computerKeySamplerMap[e.code] !== undefined) baseComputerKeyNote = Constants.computerKeySamplerMap[e.code];
    else return; // Not a mapped key for notes

    const computerKeyNote = baseComputerKeyNote + (currentOctaveShift * Constants.OCTAVE_SHIFT_AMOUNT);
    const computerKeyVelocity = Constants.defaultVelocity;

    if (computerKeyNote < 0 || computerKeyNote > 127) {
        console.warn(`Octave shifted note ${computerKeyNote} (Base: ${baseComputerKeyNote}, Shift: ${currentOctaveShift}) is out of MIDI range.`);
        return;
    }

    const audioReady = await window.initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        console.warn("[EventHandlers] Audio context not ready for Computer Key Down note playing.");
        delete currentlyPressedComputerKeys[e.code];
        if(window.keyboardIndicatorGlobalEl && Object.keys(currentlyPressedComputerKeys).filter(k => k !== 'KeyZ' && k !== 'KeyX' && !currentlyPressedComputerKeys[k]).length === 0) {
            window.keyboardIndicatorGlobalEl.classList.remove('active');
        }
        return;
    }

    const currentArmedTrackId = getArmedTrackId();
    const currentRecordingTrackId = getRecordingTrackId();

    if (isTrackRecording() && currentArmedTrackId === currentRecordingTrackId) {
        const track = getTrackById(currentRecordingTrackId);
        if (track) {
            const currentTimeInSeconds = Tone.Transport.seconds;
            const sixteenthNoteDuration = Tone.Time("16n").toSeconds();
            let currentStep = Math.round(currentTimeInSeconds / sixteenthNoteDuration);
            currentStep = (currentStep % track.sequenceLength + track.sequenceLength) % track.sequenceLength;

            let rowIndex = -1;
            if ((track.type === 'Synth' || track.type === 'InstrumentSampler') && Constants.computerKeySynthMap[e.code]) {
                const pitchName = Tone.Frequency(computerKeyNote, "midi").toNote();
                rowIndex = Constants.synthPitches.indexOf(pitchName);
            } else if (track.type === 'Sampler' && Constants.computerKeySamplerMap[e.code]) {
                 rowIndex = (baseComputerKeyNote - Constants.samplerMIDINoteStart) + (currentOctaveShift * Constants.numSlices);
                 if (rowIndex < 0 || rowIndex >= track.slices.length) rowIndex = -1;
            } else if (track.type === 'DrumSampler' && Constants.computerKeySamplerMap[e.code]) {
                 rowIndex = (baseComputerKeyNote - Constants.samplerMIDINoteStart) + (currentOctaveShift * Constants.numDrumSamplerPads);
                 if (rowIndex < 0 || rowIndex >= Constants.numDrumSamplerPads) rowIndex = -1;
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

    if (!currentArmedTrackId) return;
    const currentArmedTrack = getTrackById(currentArmedTrackId);
    if (!currentArmedTrack) return;

    // ---- DEBUG LOGS FOR playNote ----
    console.log('[EventHandlers DEBUG] currentArmedTrack object in handleComputerKeyDown:', currentArmedTrack);
    console.log('[EventHandlers DEBUG] typeof currentArmedTrack.playNote:', typeof currentArmedTrack.playNote);
    if (typeof Track !== 'undefined') { 
        console.log('[EventHandlers DEBUG] currentArmedTrack instanceof Track:', currentArmedTrack instanceof Track);
    } else {
        console.log('[EventHandlers DEBUG] Track class not imported, cannot check instanceof.');
    }
    // ---- END LOGS ----

    if (typeof currentArmedTrack.playNote === 'function') {
        currentArmedTrack.playNote(computerKeyNote, computerKeyVelocity);
    } else {
        console.error(`[EventHandlers] track.playNote is not a function for track ${currentArmedTrack.name}. Type: ${currentArmedTrack.type}`);
    }
}

function handleComputerKeyUp(e) {
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT' || activeElement.tagName === 'TEXTAREA');
    if (isInputFocused && !(activeElement.id === 'tempoGlobalInput')) return; 

    if (e.code === 'Space') return; // Spacebar release doesn't trigger note off

    const isOctaveKey = (e.code === 'KeyZ' || e.code === 'KeyX');
    if (isOctaveKey) {
        delete currentlyPressedComputerKeys[e.code];
    } else {
        if (currentlyPressedComputerKeys[e.code]) {
            const currentArmedTrackId = getArmedTrackId();
            if (currentArmedTrackId) {
                const track = getTrackById(currentArmedTrackId);
                if (track) {
                    let baseComputerKeyNote;
                    if(Constants.computerKeySynthMap[e.code] !== undefined) baseComputerKeyNote = Constants.computerKeySynthMap[e.code];
                    else if (Constants.computerKeySamplerMap[e.code] !== undefined) baseComputerKeyNote = Constants.computerKeySamplerMap[e.code];

                    if (baseComputerKeyNote !== undefined) {
                        const computerKeyNote = baseComputerKeyNote + (currentOctaveShift * Constants.OCTAVE_SHIFT_AMOUNT);
                        if (computerKeyNote >= 0 && computerKeyNote <= 127) {
                            // ---- DEBUG LOGS FOR releaseNote ----
                            console.log('[EventHandlers DEBUG] track object for keyUp:', track);
                            console.log('[EventHandlers DEBUG] typeof track.releaseNote:', typeof track.releaseNote);
                            if (typeof Track !== 'undefined') { 
                                console.log('[EventHandlers DEBUG] track for keyUp instanceof Track:', track instanceof Track);
                            } else {
                                console.log('[EventHandlers DEBUG] Track class not imported, cannot check instanceof for keyUp.');
                            }
                            // ---- END LOGS ----
                            if (typeof track.releaseNote === 'function') {
                                track.releaseNote(computerKeyNote);
                            }  else {
                                console.error(`[EventHandlers] track.releaseNote is not a function for track ${track.name}. Type: ${track.type}`);
                            }
                        }
                    }
                }
            }
            delete currentlyPressedComputerKeys[e.code];
        }
    }
    
    const noteKeysPressed = Object.keys(currentlyPressedComputerKeys).some(key => currentlyPressedComputerKeys[key] && key !== 'KeyZ' && key !== 'KeyX');
    if(window.keyboardIndicatorGlobalEl && !noteKeysPressed) {
        window.keyboardIndicatorGlobalEl.classList.remove('active');
    }
}




export function handleTrackMute(trackId) {
    console.log(`[EventHandlers] handleTrackMute called for trackId: ${trackId}`);
    const track = getTrackById(trackId);
    if (!track) {
        console.warn(`[EventHandlers] handleTrackMute: Track ID ${trackId} not found.`);
        return;
    }
    captureStateForUndo(`${track.isMuted ? "Unmute" : "Mute"} Track "${track.name}"`);
    track.toggleMute(); // This now calls applyMuteState internally

    // Update UI
    const inspectorWindow = window.openWindows[`trackInspector-${trackId}`];
    if (inspectorWindow && inspectorWindow.element) {
        const muteBtn = inspectorWindow.element.querySelector(`#muteBtn-${trackId}`);
        if (muteBtn) { muteBtn.textContent = track.isMuted ? 'Unmute' : 'Mute'; muteBtn.classList.toggle('muted', track.isMuted); }
    }
    const mixerWindow = window.openWindows['mixer'];
    if (mixerWindow && mixerWindow.element) {
        const muteBtn = mixerWindow.element.querySelector(`#mixerMuteBtn-${trackId}`);
        if (muteBtn) { muteBtn.textContent = track.isMuted ? 'U' : 'M'; muteBtn.classList.toggle('muted', track.isMuted); }
    }
}

export function handleTrackSolo(trackId) {
    console.log(`[EventHandlers] handleTrackSolo called for trackId: ${trackId}`);
    const track = getTrackById(trackId);
    if (!track) {
        console.warn(`[EventHandlers] handleTrackSolo: Track ID ${trackId} not found.`);
        return;
    }

    const currentGlobalSoloId = getSoloedTrackId();
    const isCurrentlySoloedByThisTrack = currentGlobalSoloId === track.id;

    captureStateForUndo(`${isCurrentlySoloedByThisTrack ? "Unsolo" : "Solo"} Track "${track.name}"`);

    setSoloedTrackId(isCurrentlySoloedByThisTrack ? null : track.id); 
    console.log(`[EventHandlers] Global soloedTrackId is now: ${getSoloedTrackId()}`);

    getTracks().forEach(t => {
        t.applySoloState(getSoloedTrackId()); 

        const inspectorSoloBtn = t.inspectorWindow?.element?.querySelector(`#soloBtn-${t.id}`);
        if (inspectorSoloBtn) { inspectorSoloBtn.textContent = t.isSoloed ? 'Unsolo' : 'Solo'; inspectorSoloBtn.classList.toggle('soloed', t.isSoloed); }
        
        const mixerSoloBtn = window.openWindows['mixer']?.element?.querySelector(`#mixerSoloBtn-${t.id}`);
        if (mixerSoloBtn) { mixerSoloBtn.textContent = t.isSoloed ? 'U' : 'S'; mixerSoloBtn.classList.toggle('soloed', t.isSoloed); }
    });
}

export function handleTrackArm(trackId) {
    console.log(`[EventHandlers] handleTrackArm called for trackId: ${trackId}`);
    const track = getTrackById(trackId);
    if (!track) {
        console.warn(`[EventHandlers] handleTrackArm: Track ID ${trackId} not found.`);
        return;
    }

    const currentArmedId = getArmedTrackId();
    const isCurrentlyArmedByThisTrack = currentArmedId === track.id;

    captureStateForUndo(`${isCurrentlyArmedByThisTrack ? "Disarm" : "Arm"} Track "${track.name}" for Input`);

    setArmedTrackId(isCurrentlyArmedByThisTrack ? null : track.id);
    console.log(`[EventHandlers] Global armedTrackId is now: ${getArmedTrackId()}`);

    getTracks().forEach(t => {
        const inspectorArmBtn = t.inspectorWindow?.element?.querySelector(`#armInputBtn-${t.id}`);
        if (inspectorArmBtn) inspectorArmBtn.classList.toggle('armed', getArmedTrackId() === t.id);
    });
    
    const newArmedTrack = getTrackById(getArmedTrackId());
    showNotification(newArmedTrack ? `${newArmedTrack.name} armed for input.` : "Input disarmed.", 1500);

    const globalRecordBtn = window.recordBtn || document.getElementById('recordBtnGlobal');
    if (globalRecordBtn) {
        if (getArmedTrackId() === null && globalRecordBtn.classList.contains('armed')) {
            // If no track is armed, but global record button implies it's armed for recording, disarm it.
            globalRecordBtn.classList.remove('armed','recording');
            globalRecordBtn.textContent = 'Record';
            setIsRecording(false);
            setRecordingTrackId(null);
        } else if (getArmedTrackId() !== null && !globalRecordBtn.classList.contains('armed') && isTrackRecording()){
            // If a track is armed and we ARE recording, ensure record button reflects 'armed' and 'recording'
            globalRecordBtn.classList.add('armed', 'recording');
            globalRecordBtn.textContent = 'Stop Rec';
        } else if (getArmedTrackId() !== null && !globalRecordBtn.classList.contains('armed') && !isTrackRecording()){
             // If a track is armed but we are NOT recording, button should just be 'Record' but potentially styled as armable
            // This state is tricky. Let 'armed' class be managed by its own click mainly.
        }
    }
}


export function handleRemoveTrack(trackId) {
    console.log(`[EventHandlers] handleRemoveTrack called for trackId: ${trackId}`);
    const track = getTrackById(trackId);
    if (!track) {
        console.warn(`[EventHandlers] handleRemoveTrack: Track ID ${trackId} not found.`);
        return;
    }
    showConfirmationDialog(
        'Confirm Delete Track',
        `Are you sure you want to remove track "${track.name}"? This cannot be undone directly (only via project reload or undo history).`,
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
