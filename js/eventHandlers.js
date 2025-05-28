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
            startMenu?.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (startMenu && !startMenu.classList.contains('hidden') && !startMenu.contains(e.target) && e.target !== startButton) {
                startMenu.classList.add('hidden');
            }
        });

        document.getElementById('menuAddSynthTrack')?.addEventListener('click', () => { addTrack('Synth', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); });
        document.getElementById('menuAddSamplerTrack')?.addEventListener('click', () => { addTrack('Sampler', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); });
        document.getElementById('menuAddDrumSamplerTrack')?.addEventListener('click', () => { addTrack('DrumSampler', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); });
        document.getElementById('menuAddInstrumentSamplerTrack')?.addEventListener('click', () => { addTrack('InstrumentSampler', {_isUserActionPlaceholder: true}); startMenu?.classList.add('hidden'); });
        document.getElementById('menuOpenSoundBrowser')?.addEventListener('click', () => { if(typeof openSoundBrowserWindow === 'function') openSoundBrowserWindow(); else console.error("openSoundBrowserWindow is not defined"); startMenu?.classList.add('hidden'); });
        document.getElementById('menuUndo')?.addEventListener('click', () => { if (!document.getElementById('menuUndo').classList.contains('disabled')) { undoLastAction(); startMenu?.classList.add('hidden'); } });
        document.getElementById('menuRedo')?.addEventListener('click', () => { if (!document.getElementById('menuRedo').classList.contains('disabled')) { redoLastAction(); startMenu?.classList.add('hidden'); } });
        document.getElementById('menuSaveProject')?.addEventListener('click', () => { saveProject(); startMenu?.classList.add('hidden'); });
        document.getElementById('menuLoadProject')?.addEventListener('click', () => { if (typeof loadProject === 'function') loadProject(); else document.getElementById('loadProjectInput')?.click(); startMenu?.classList.add('hidden'); });
        document.getElementById('menuExportWav')?.addEventListener('click', () => { exportToWav(); startMenu?.classList.add('hidden'); });
        document.getElementById('menuOpenGlobalControls')?.addEventListener('click', () => { if(typeof openGlobalControlsWindow === 'function') openGlobalControlsWindow(); else console.error("openGlobalControlsWindow is not defined"); startMenu?.classList.add('hidden'); });
        document.getElementById('menuOpenMixer')?.addEventListener('click', () => { if(typeof openMixerWindow === 'function') openMixerWindow(); else console.error("openMixerWindow is not defined"); startMenu?.classList.add('hidden'); });
        document.getElementById('menuOpenMasterEffects')?.addEventListener('click', () => {
            console.log("[EventHandlers] 'Master Effects Rack' menu item clicked.");
            if(typeof openMasterEffectsRackWindow === 'function') {
                console.log("[EventHandlers] openMasterEffectsRackWindow IS a function. Calling it...");
                openMasterEffectsRackWindow();
            } else {
                console.error("[EventHandlers] openMasterEffectsRackWindow is NOT defined or not a function in appContext!");
                if (typeof window.openMasterEffectsRackWindow === 'function') {
                    console.warn("[EventHandlers] Fallback: Found openMasterEffectsRackWindow on global window object. Calling it.");
                    window.openMasterEffectsRackWindow();
                } else {
                     console.error("[EventHandlers] Fallback: openMasterEffectsRackWindow is also NOT on global window object.");
                }
            }
            startMenu?.classList.add('hidden');
        });
        document.getElementById('menuUploadCustomBg')?.addEventListener('click', () => { if (triggerCustomBackgroundUpload) triggerCustomBackgroundUpload(); startMenu?.classList.add('hidden'); });
        document.getElementById('menuRemoveCustomBg')?.addEventListener('click', () => { if (removeCustomDesktopBackground) removeCustomDesktopBackground(); startMenu?.classList.add('hidden'); });
        document.getElementById('menuToggleFullScreen')?.addEventListener('click', () => { if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(err => { showNotification(`Error entering full screen: ${err.message}`, 3000); }); } else { if (document.exitFullscreen) document.exitFullscreen(); } startMenu?.classList.add('hidden'); });
        document.getElementById('taskbarTempoDisplay')?.addEventListener('click', () => { if(typeof openGlobalControlsWindow === 'function') openGlobalControlsWindow(); });
        const loadProjectInputEl = document.getElementById('loadProjectInput');
        if (loadProjectInputEl && typeof handleProjectFileLoad === 'function') { loadProjectInputEl.addEventListener('change', handleProjectFileLoad); }
        else if (!handleProjectFileLoad) { console.warn("[EventHandlers] handleProjectFileLoad function not provided via appContext."); }
        else if (!loadProjectInputEl) { console.warn("[EventHandlers] loadProjectInput element not found."); }

        document.addEventListener('keydown', handleComputerKeyDown);
        document.addEventListener('keyup', handleComputerKeyUp);

        if (!window.transportEventsInitialized && typeof Tone !== 'undefined' && Tone.Transport) {
            Tone.Transport.on('start', () => { if (window.playBtn) window.playBtn.textContent = 'Pause'; });
            Tone.Transport.on('pause', () => { if (window.playBtn) window.playBtn.textContent = 'Play'; if (isTrackRecording()) { setIsRecording(false); if(window.recordBtn) { window.recordBtn.textContent = 'Record'; window.recordBtn.classList.remove('recording'); } showNotification("Recording stopped (transport paused).", 2000); captureStateForUndo(`Stop Recording (transport paused)`); setRecordingTrackId(null); } });
            Tone.Transport.on('stop', () => { if (window.playBtn) window.playBtn.textContent = 'Play'; document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing')); if (isTrackRecording()) { setIsRecording(false); if(window.recordBtn) { window.recordBtn.textContent = 'Record'; window.recordBtn.classList.remove('recording'); } showNotification("Recording stopped (transport stopped).", 2000); captureStateForUndo(`Stop Recording (transport stopped)`); setRecordingTrackId(null); } });
            window.transportEventsInitialized = true;
        }
    } catch (error) {
        console.error("[EventHandlers] Error in initializePrimaryEventListeners:", error);
    }
}

export function attachGlobalControlEvents(globalControlsWindowElement) {
    console.log("[EventHandlers - attachGlobalControlEvents] Attaching events to Global Controls Window Element:", globalControlsWindowElement);
    if (!globalControlsWindowElement) {
        console.error("[EventHandlers - attachGlobalControlEvents] Global Controls Window Element is null. Cannot attach events.");
        return;
    }

    try { // OUTER TRY-CATCH FOR THE WHOLE FUNCTION
        const playBtn = globalControlsWindowElement.querySelector('#playBtnGlobal');
        const recordBtn = globalControlsWindowElement.querySelector('#recordBtnGlobal');
        const tempoInputEl = globalControlsWindowElement.querySelector('#tempoGlobalInput');
        const midiSelect = globalControlsWindowElement.querySelector('#midiInputSelectGlobal'); // This is window.midiInputSelectGlobal

        if (playBtn) {
            try {
                playBtn.addEventListener('click', async () => {
                    console.log("[EventHandlers] Play/Pause button clicked.");
                    const audioReady = await window.initAudioContextAndMasterMeter(true);
                    if (!audioReady) {
                        console.warn("[EventHandlers] Audio context not ready after play button click.");
                        showNotification("Audio system not ready. Please try again or check browser permissions.", 3000);
                        return;
                    }
                    if (Tone.Transport.state !== 'started') {
                        console.log("[EventHandlers] Transport state is not 'started'. Resetting position and starting transport.");
                        Tone.Transport.position = 0;
                        document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));
                        Tone.Transport.start("+0.1");
                        console.log("[EventHandlers] Tone.Transport.start() called. Current state:", Tone.Transport.state);
                    } else {
                        console.log("[EventHandlers] Transport state is 'started'. Pausing transport.");
                        Tone.Transport.pause();
                        console.log("[EventHandlers] Tone.Transport.pause() called. Current state:", Tone.Transport.state);
                    }
                });
            } catch (e) { console.error("[EventHandlers] Error attaching playBtn listener:", e); }
        } else { console.warn("[EventHandlers - attachGlobalControlEvents] Play button (#playBtnGlobal) not found."); }

        if (recordBtn) {
            try {
                recordBtn.addEventListener('click', async () => {
                    const audioReady = await window.initAudioContextAndMasterMeter(true);
                    if (!audioReady) { showNotification("Audio system not ready for recording.", 3000); return; }
                    if (!isTrackRecording()) {
                        const currentArmedTrackId = getArmedTrackId();
                        if (!currentArmedTrackId) { showNotification("No track armed for recording.", 3000); return; }
                        const trackToRecord = getTrackById(currentArmedTrackId);
                        if (!trackToRecord) { showNotification("Armed track not found.", 3000); return; }
                        setIsRecording(true); setRecordingTrackId(currentArmedTrackId); setRecordingStartTime(Tone.Transport.seconds);
                        if(window.recordBtn) {window.recordBtn.textContent = 'Stop Rec'; window.recordBtn.classList.add('recording');}
                        showNotification(`Recording started for ${trackToRecord.name}.`, 2000); captureStateForUndo(`Start Recording on ${trackToRecord.name}`);
                        if (Tone.Transport.state !== 'started') { Tone.Transport.position = 0; document.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing')); Tone.Transport.start("+0.1");}
                    } else {
                        setIsRecording(false); if(window.recordBtn) {window.recordBtn.textContent = 'Record'; window.recordBtn.classList.remove('recording');}
                        const recordedTrack = getTrackById(getRecordingTrackId()); showNotification("Recording stopped.", 2000); captureStateForUndo(`Stop Recording (Track: ${recordedTrack?.name || 'Unknown'})`); setRecordingTrackId(null);
                    }
                });
            } catch (e) { console.error("[EventHandlers] Error attaching recordBtn listener:", e); }
        } else { console.warn("[EventHandlers - attachGlobalControlEvents] Record button (#recordBtnGlobal) not found."); }

        if (tempoInputEl) {
            try {
                tempoInputEl.addEventListener('change', (e) => {
                    const newTempo = parseFloat(e.target.value);
                    if (!isNaN(newTempo) && newTempo >= 40 && newTempo <= 240) {
                        if (Tone.Transport.bpm.value !== newTempo) captureStateForUndo(`Set Tempo to ${newTempo.toFixed(1)} BPM`);
                        Tone.Transport.bpm.value = newTempo;
                        if(typeof window.updateTaskbarTempoDisplay === 'function') window.updateTaskbarTempoDisplay(newTempo);
                    } else {
                        e.target.value = Tone.Transport.bpm.value.toFixed(1);
                        showNotification(`Tempo must be between 40 and 240.`, 2500);
                    }
                });
            } catch (e) { console.error("[EventHandlers] Error attaching tempoInputEl listener:", e); }
        } else { console.warn("[EventHandlers - attachGlobalControlEvents] Tempo input (#tempoGlobalInput) not found."); }

        if (midiSelect) { // This is window.midiInputSelectGlobal from ui.js's assignment
            try {
                midiSelect.onchange = () => { // Using onchange directly here
                    console.log("[EventHandlers - attachGlobalControlEvents] midiInputSelectGlobal (element from GCW) changed.");
                    const oldMidiName = window.activeMIDIInput ? window.activeMIDIInput.name : "No MIDI Input";
                    const newMidiId = midiSelect.value;
                    const newMidiDevice = window.midiAccess && newMidiId ? window.midiAccess.inputs.get(newMidiId) : null;
                    const newMidiName = newMidiDevice ? newMidiDevice.name : "No MIDI Input";
                    if (oldMidiName !== newMidiName) {
                         captureStateForUndo(`Change MIDI Input to ${newMidiName}`);
                    }
                    selectMIDIInput();
                };
            } catch (e) { console.error("[EventHandlers] Error attaching midiSelect listener:", e); }
        } else { console.warn("[EventHandlers - attachGlobalControlEvents] MIDI select dropdown (#midiInputSelectGlobal) not found."); }

        console.log("[EventHandlers - attachGlobalControlEvents] All event listeners in attachGlobalControlEvents attempted.");

    } catch (error) {
        console.error("[EventHandlers - attachGlobalControlEvents] UNCAUGHT ERROR during event attachment:", error);
        showNotification("Critical error setting up global control events. Functionality will be impaired.", 5000);
    }
}

export async function setupMIDI() { /* ... (no changes from your uploaded version) ... */ }
function populateMIDIInputs() { /* ... (no changes from your uploaded version) ... */ }
export function selectMIDIInput(skipUndoCaptureAndNotification = false) { /* ... (no changes from your uploaded version) ... */ }
export async function handleMIDIMessage(message) { /* ... (no changes from your uploaded version) ... */ }
async function handleComputerKeyDown(e) { /* ... (no changes from your uploaded version) ... */ }
function handleComputerKeyUp(e) { /* ... (no changes from your uploaded version) ... */ }
export function handleTrackMute(trackId) { /* ... (no changes from your uploaded version) ... */ }
export function handleTrackSolo(trackId) { /* ... (no changes from your uploaded version) ... */ }
export function handleTrackArm(trackId) { /* ... (no changes from your uploaded version) ... */ }
export function handleRemoveTrack(trackId) { /* ... (no changes from your uploaded version) ... */ }
export function handleOpenTrackInspector(trackId) { /* ... (no changes from your uploaded version) ... */ }
export function handleOpenEffectsRack(trackId) { /* ... (no changes from your uploaded version) ... */ }
export function handleOpenSequencer(trackId) { /* ... (no changes from your uploaded version) ... */ }
