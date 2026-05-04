// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading
import * as Constants from './constants.js';
// showNotification will be accessed via localAppServices
// import { showNotification } from './utils.js'; // Not directly imported, accessed via appServices
import { createEffectInstance } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';
import {
    getRecordingStartTimeState,
    getRecordingTrackIdState,
    setIsRecordingState,
    setRecordingTrackIdState,
    setRecordingStartTimeState,
    getLoadedZipFilesState,
    getTracksState,
    getPlaybackModeState
} from './state.js';


let masterEffectsBusInputNode = null;
let masterGainNodeActual = null; // The actual Tone.Gain node for master volume
let masterMeterNode = null;
let activeMasterEffectNodes = new Map();

let audioContextInitialized = false;
let contextSuspendedCount = 0; // Track suspension events for monitoring/recovery
let resumeAttemptScheduled = false;

let localAppServices = {};

// Variables for sidechain compression
let sidechainBus = null; // Tone.Gain node that receives mic input for sidechain
let micForSidechain = null; // Reference to the mic when used for sidechain
let sidechainTrackAssignments = new Map(); // effectId -> { trackId, trackName } for track-in mode

// Variables for audio recording
let mic = null;
let recorder = null;
let recordingScheduledId = null; // For punch-in/out enforcement callback
let recordingScheduledTrackId = null; // Track ID for the scheduled recording callback
let recordingInputGainNode = null;
let recordingInputGainValue = Constants.DEFAULT_RECORDING_INPUT_GAIN;

// Send Bus Audio Routing
let sendBusNodes = new Map(); // sendId -> { inputGain, effects[], outputGain, muted }
let trackSendNodes = new Map(); // trackId -> Map<sendId, { sendGainNode, sendLevel }>

export function initializeAudioModule(appServicesFromMain) {
    localAppServices = appServicesFromMain;
}

export function getMasterEffectsBusInputNode() {
    if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed) {
        console.log("[Audio getMasterEffectsBusInputNode] Master bus input node not ready or disposed, attempting setup.");
        setupMasterBus();
    }
    return masterEffectsBusInputNode;
}

export function getActualMasterGainNode() {
    if (!masterGainNodeActual || masterGainNodeActual.disposed) {
        console.log("[Audio getActualMasterGainNode] Actual master gain node not ready or disposed, attempting setup.");
        setupMasterBus();
    }
    return masterGainNodeActual;
}

function getRecordingInputGainNode() {
    if (!recordingInputGainNode || recordingInputGainNode.disposed) {
        if (recordingInputGainNode && !recordingInputGainNode.disposed) {
            try { recordingInputGainNode.dispose(); } catch (e) { console.warn('[Audio getRecordingInputGainNode] Error disposing old recording input gain node:', e.message); }
        }
        recordingInputGainNode = new Tone.Gain(recordingInputGainValue);
    }
    return recordingInputGainNode;
}

function cleanupRecordingAudioResources() {
    if (mic) {
        try { mic.disconnect(); } catch (e) {}
        try { mic.close(); } catch (e) {}
        try { mic.dispose(); } catch (e) {}
        mic = null;
    }
    if (recorder) {
        try { recorder.disconnect(); } catch (e) {}
        try { recorder.dispose(); } catch (e) {}
        recorder = null;
    }
    if (recordingInputGainNode && !recordingInputGainNode.disposed) {
        try { recordingInputGainNode.disconnect(); } catch (e) {}
    }
}

export function setRecordingInputGain(gainValue) {
    const nextValue = Number.isFinite(parseFloat(gainValue))
        ? Math.max(Constants.MIN_RECORDING_INPUT_GAIN, Math.min(Constants.MAX_RECORDING_INPUT_GAIN, parseFloat(gainValue)))
        : Constants.DEFAULT_RECORDING_INPUT_GAIN;
    recordingInputGainValue = nextValue;
    if (recordingInputGainNode && !recordingInputGainNode.disposed) {
        try {
            recordingInputGainNode.gain.value = nextValue;
        } catch (e) {
            console.warn('[Audio setRecordingInputGain] Failed to update recording input gain node:', e.message);
        }
    }
    return recordingInputGainValue;
}

export async function startAudioRecording(track, isMonitoringEnabled = false) {
    if (!track || track.type !== 'Audio') {
        console.warn('[Audio startAudioRecording] Recording is only available for Audio tracks.');
        if (localAppServices.showNotification) {
            localAppServices.showNotification('Recording is only available for Audio tracks.', 3000);
        }
        return false;
    }

    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        return false;
    }

    try {
        if (recorder && recorder.state === 'started') {
            await stopAudioRecording();
        } else {
            cleanupRecordingAudioResources();
        }

        const recordingConstraints = {
            echoCancellation: Constants.RECORDING_ECHO_CANCELLATION,
            autoGainControl: Constants.RECORDING_AUTO_GAIN_CONTROL,
            noiseSuppression: Constants.RECORDING_NOISE_SUPPRESSION,
            sampleRate: Constants.RECORDING_SAMPLE_RATE,
            channelCount: Constants.RECORDING_NUM_CHANNELS,
            latencyHint: Constants.RECORDING_LATENCY_HINT
        };
        console.log('[Audio startAudioRecording] Recording constraints:', recordingConstraints);

        const availableDevices = Tone.UserMedia.enumerateDevices ? await Tone.UserMedia.enumerateDevices() : [];
        const preferredDevice = Array.isArray(availableDevices) && availableDevices.length > 0 ? availableDevices[0] : null;

        mic = new Tone.UserMedia({ volume: 0 });
        if (preferredDevice && preferredDevice.deviceId) {
            await mic.open(preferredDevice.deviceId);
        } else {
            await mic.open();
        }

        const gainNode = getRecordingInputGainNode();
        setRecordingInputGain(recordingInputGainValue);
        recorder = new Tone.Recorder({ mimeType: Constants.RECORDING_MIME_TYPE });

        mic.connect(gainNode);
        gainNode.connect(recorder);
        if (isMonitoringEnabled && track.inputChannel && !track.inputChannel.disposed) {
            gainNode.connect(track.inputChannel);
        }

        await recorder.start();

        setIsRecordingState(true);
        setRecordingTrackIdState(track.id);
        setRecordingStartTimeState(Tone.Transport.seconds || 0);

        if (localAppServices.showNotification) {
            localAppServices.showNotification(`Recording started for ${track.name}.`, 1500);
        }

        return true;
    } catch (error) {
        console.error('[Audio startAudioRecording] Error starting recording:', error);
        const errorMessage = error && error.name === 'NotAllowedError'
            ? 'Microphone permission was denied.'
            : error && error.name === 'NotFoundError'
                ? 'No microphone device was found.'
                : error && error.name === 'AbortError'
                    ? 'Microphone capture was interrupted.'
                    : `Failed to start recording: ${error && error.message ? error.message : 'Unknown error'}`;
        if (localAppServices.showNotification) {
            localAppServices.showNotification(errorMessage, 4000);
        }
        cleanupRecordingAudioResources();
        setIsRecordingState(false);
        setRecordingTrackIdState(null);
        setRecordingStartTimeState(0);
        return false;
    }
}

export async function stopAudioRecording() {
    const activeRecorder = recorder;
    const activeMic = mic;
    const activeTrackId = getRecordingTrackIdState();
    const activeStartTime = getRecordingStartTimeState();

    if (!activeRecorder) {
        console.warn('[Audio stopAudioRecording] No active recorder to stop.');
        cleanupRecordingAudioResources();
        setIsRecordingState(false);
        setRecordingTrackIdState(null);
        setRecordingStartTimeState(0);
        return false;
    }

    let recording = null;
    try {
        if (activeRecorder.state === 'started') {
            recording = await activeRecorder.stop();
        } else {
            console.warn(`[Audio stopAudioRecording] Recorder was not in the started state. Current state: ${activeRecorder.state}`);
        }
    } catch (error) {
        console.error('[Audio stopAudioRecording] Error stopping recorder:', error);
    }

    try { if (activeMic) activeMic.disconnect(); } catch (e) {}
    try { if (activeMic) activeMic.close(); } catch (e) {}
    try { if (activeMic) activeMic.dispose(); } catch (e) {}
    try { if (recordingInputGainNode && !recordingInputGainNode.disposed) recordingInputGainNode.disconnect(); } catch (e) {}
    try { if (activeRecorder) activeRecorder.dispose(); } catch (e) {}

    mic = null;
    recorder = null;

    if (!recording || !recording.size || recording.size < 1000) {
        console.warn('[Audio stopAudioRecording] Recording was empty or too small:', recording ? recording.size : null);
        if (localAppServices.showNotification) {
            localAppServices.showNotification('Recording was empty. Try again with a longer take.', 3000);
        }
        setIsRecordingState(false);
        setRecordingTrackIdState(null);
        setRecordingStartTimeState(0);
        cleanupRecordingScheduling();
        return false;
    }

    const recordedTrack = activeTrackId !== null && localAppServices.getTrackById ? localAppServices.getTrackById(activeTrackId) : null;
    if (!recordedTrack || recordedTrack.type !== 'Audio' || typeof recordedTrack.addAudioClip !== 'function') {
        console.warn('[Audio stopAudioRecording] Audio track not found for saved recording:', activeTrackId);
        if (localAppServices.showNotification) {
            localAppServices.showNotification('Recording finished, but the destination track was not found.', 3000);
        }
        setIsRecordingState(false);
        setRecordingTrackIdState(null);
        setRecordingStartTimeState(0);
        cleanupRecordingScheduling();
        return recording;
    }

    try {
        await recordedTrack.addAudioClip(recording, activeStartTime || 0);
        if (localAppServices.showNotification) {
            localAppServices.showNotification(`Recording saved to ${recordedTrack.name}.`, 2000);
        }
    } catch (error) {
        console.error('[Audio stopAudioRecording] Error saving recording to track:', error);
        if (localAppServices.showNotification) {
            localAppServices.showNotification(`Error saving recording: ${error.message}`, 4000);
        }
        setIsRecordingState(false);
        setRecordingTrackIdState(null);
        setRecordingStartTimeState(0);
        cleanupRecordingScheduling();
        return false;
    }

    setIsRecordingState(false);
    setRecordingTrackIdState(null);
    setRecordingStartTimeState(0);
    cleanupRecordingScheduling();
    return recording;
}

export async function initAudioContextAndMasterMeter(isUserInitiated = false) {
    if (audioContextInitialized && Tone.context && Tone.context.state === 'running') {
        if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed ||
            !masterGainNodeActual || masterGainNodeActual.disposed ||
            !masterMeterNode || masterMeterNode.disposed) {
            console.warn("[Audio initAudioContextAndMasterMeter] Context was running, but master bus components are not fully initialized. Re-setting up.");
            setupMasterBus();
        }
        return true;
    }

    try {
        await Tone.start();

        if (Tone.context && Tone.context.state === 'running') {
            if (!audioContextInitialized) {
                console.log('[Audio initAudioContextAndMasterMeter] First time setup for master bus after context became running.');
                setupMasterBus();
            } else if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed ||
                       !masterGainNodeActual || masterGainNodeActual.disposed ||
                       !masterMeterNode || masterMeterNode.disposed) {
                console.warn('[Audio initAudioContextAndMasterMeter] Audio context is running, but master bus components seem to be missing or disposed. Re-initializing master bus.');
                setupMasterBus();
            }
            audioContextInitialized = true;
            console.log('[Audio initAudioContextAndMasterMeter] Audio context initialized and running.');
            return true;
        } else {
            const message = "AudioContext could not be started. Please click again or refresh the page.";
            if (localAppServices.showNotification) {
                localAppServices.showNotification(message, 5000);
            } else {
                alert(message); // Fallback if showNotification is not available
            }
            audioContextInitialized = false;
            return false;
        }
    } catch (error) {
        const message = `Error initializing audio: ${error.message || 'Please check console.'}. Try interacting with the page or refreshing.`;
        if (localAppServices.showNotification) {
            localAppServices.showNotification(message, 5000);
        } else {
            alert(message);
        }
        audioContextInitialized = false;
        return false;
    }
}

function setupMasterBus() {
    console.log('[Audio setupMasterBus] Setting up master bus...');
    if (!Tone.context || Tone.context.state !== 'running') {
        console.warn('[Audio setupMasterBus] Audio context not running. Aborting master bus setup.');
        return;
    }

    if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed) {
        if (masterEffectsBusInputNode && !masterEffectsBusInputNode.disposed) {
             try { masterEffectsBusInputNode.dispose(); } catch(e){ console.warn("[Audio setupMasterBus] Error disposing old master bus input:", e.message); }
        }
        masterEffectsBusInputNode = new Tone.Gain(); // Destination will be set by rebuildMasterEffectChain
    }

    if (!masterGainNodeActual || masterGainNodeActual.disposed) {
        if (masterGainNodeActual && !masterGainNodeActual.disposed) {
            try { masterGainNodeActual.dispose(); } catch(e){ console.warn("[Audio setupMasterBus] Error disposing old master gain node actual:", e.message); }
        }
        const initialMasterVolumeValue = localAppServices.getMasterGainValue ? localAppServices.getMasterGainValue() : Tone.dbToGain(0);
        masterGainNodeActual = new Tone.Gain(initialMasterVolumeValue);
        if (localAppServices.setMasterGainValueState) localAppServices.setMasterGainValueState(masterGainNodeActual.gain.value); // Update state module
    }

    if (!masterMeterNode || masterMeterNode.disposed) {
        if (masterMeterNode && !masterMeterNode.disposed) {
            try { masterMeterNode.dispose(); } catch(e) { console.warn("[Audio setupMasterBus] Error disposing old master meter:", e.message); }
        }
        masterMeterNode = new Tone.Meter({ smoothing: 0.8 });
    }
    rebuildMasterEffectChain(); // This will handle connections
    console.log('[Audio setupMasterBus] Master bus setup process complete.');
}

export function rebuildMasterEffectChain() {
    if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed ||
        !masterGainNodeActual || masterGainNodeActual.disposed ||
        !masterMeterNode || masterMeterNode.disposed) {
        console.warn('[Audio rebuildMasterEffectChain] Master bus components not fully ready, attempting setup...');
        setupMasterBus(); // Try to set them up again
        // Re-check after setup attempt
        if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed ||
            !masterGainNodeActual || masterGainNodeActual.disposed ||
            !masterMeterNode || masterMeterNode.disposed) {
            console.error('[Audio rebuildMasterEffectChain] Master bus components still not ready after setup attempt. Aborting chain rebuild.');
            return;
        }
    }

    try { masterEffectsBusInputNode.disconnect(); } catch(e) { console.warn("[Audio rebuildMasterEffectChain] Error disconnecting masterEffectsBusInputNode:", e.message); }
    activeMasterEffectNodes.forEach((node, id) => {
        if (node && !node.disposed) {
            try { node.disconnect(); } catch(e) { console.warn(`[Audio rebuildMasterEffectChain] Error disconnecting active master effect node ${id}:`, e.message); }
        }
    });
    try { masterGainNodeActual.disconnect(); } catch(e) { console.warn("[Audio rebuildMasterEffectChain] Error disconnecting masterGainNodeActual:", e.message); }
    // masterMeterNode is connected in parallel, so usually disconnect from source (masterGainNodeActual)

    let currentAudioPathEnd = masterEffectsBusInputNode;
    const masterEffectsState = localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : [];

    masterEffectsState.forEach(effectState => {
        let effectNode = activeMasterEffectNodes.get(effectState.id);
        if (!effectNode || effectNode.disposed) {
            console.warn(`[Audio rebuildMasterEffectChain] Master effect node for ${effectState.type} (ID: ${effectState.id}) not found or disposed. Attempting recreation.`);
            effectNode = createEffectInstance(effectState.type, effectState.params);
            if (effectNode) {
                activeMasterEffectNodes.set(effectState.id, effectNode);

            } else {
                console.error(`[Audio rebuildMasterEffectChain] Failed to recreate master effect node for ${effectState.type} (ID: ${effectState.id}). Skipping but continuing to next effect.`);
                // Don't return — continue so subsequent effects still get connected through the chain
                currentAudioPathEnd = null; // Mark chain as needing bypass
            }
        }

        if (currentAudioPathEnd && !currentAudioPathEnd.disposed) {
            try {

                currentAudioPathEnd.connect(effectNode);
                currentAudioPathEnd = effectNode;
            } catch (e) {
                console.error(`[Audio rebuildMasterEffectChain] Error connecting master effect ${effectState.type}:`, e);
            }
        } else {
            // This case means the chain started with this effect or a previous connection failed
            currentAudioPathEnd = effectNode;
             console.warn(`[Audio rebuildMasterEffectChain] currentAudioPathEnd was null or disposed before connecting ${effectState.type}. Starting new chain segment.`);
        }
    });

    // Connect the end of the effect chain to masterGainNodeActual
    if (currentAudioPathEnd && !currentAudioPathEnd.disposed && masterGainNodeActual && !masterGainNodeActual.disposed) {
        try {

            currentAudioPathEnd.connect(masterGainNodeActual);
        } catch (e) {
            console.error(`[Audio rebuildMasterEffectChain] Error connecting master chain output to masterGainNodeActual:`, e);
        }
    } else {
        console.warn('[Audio rebuildMasterEffectChain] Could not connect master chain output to masterGainNodeActual. Current end:', ((currentAudioPathEnd) && (currentAudioPathEnd).toString)(), 'Master Gain:', ((masterGainNodeActual) && (masterGainNodeActual).toString)());
         if (!masterEffectsBusInputNode.numberOfOutputs && masterGainNodeActual && !masterGainNodeActual.disposed) { // If no effects, connect input directly
            try {
                masterEffectsBusInputNode.connect(masterGainNodeActual);
            } catch (e) {
                console.error("[Audio rebuildMasterEffectChain] Error directly connecting masterEffectsBusInputNode to masterGainNodeActual:", e.message);
            }
        }
    }

    // Connect masterGainNodeActual to destination and meter
    if (masterGainNodeActual && !masterGainNodeActual.disposed) {
        try {
            masterGainNodeActual.toDestination(); // Connects to Tone.Destination (context.destination)
            if (masterMeterNode && !masterMeterNode.disposed) {
                masterGainNodeActual.connect(masterMeterNode);
            } else {
                 console.warn("[Audio rebuildMasterEffectChain] Master meter node not available for connection during rebuild. Should have been re-created by setupMasterBus.");
            }
        } catch (e) { console.error("[Audio rebuildMasterEffectChain] Error connecting masterGainNodeActual to destination/meter:", e); }
    } else {
         console.warn('[Audio rebuildMasterEffectChain] masterGainNodeActual not available for final connection.');
    }
    console.log('[Audio rebuildMasterEffectChain] Master effect chain rebuild complete.');
}


export async function addMasterEffectToAudio(effectIdInState, effectType, initialParams) {
    const toneNode = createEffectInstance(effectType, initialParams);
    if (toneNode) {
        activeMasterEffectNodes.set(effectIdInState, toneNode);
        rebuildMasterEffectChain();
    } else {
        if (localAppServices.showNotification) localAppServices.showNotification(`Failed to create master effect: ${effectType}`, 3000);
        console.error(`[Audio addMasterEffectToAudio] Failed to create Tone.js instance for master effect: ${effectType}`);
    }
}

export async function removeMasterEffectFromAudio(effectId) {
    const effectNode = activeMasterEffectNodes.get(effectId);
    if (effectNode) {
        if (effectNode && typeof effectNode.disconnect === 'function') {
            try { effectNode.disconnect(); } catch(e) {}
        }
        if (effectNode && !effectNode.disposed && typeof effectNode.dispose === 'function') {
            try { effectNode.dispose(); } catch(e) {}
        }
        activeMasterEffectNodes.delete(effectId);
        rebuildMasterEffectChain();
    }
}

export function updateMasterEffectParamInAudio(effectId, paramPath, value) {
    const effectNode = activeMasterEffectNodes.get(effectId);
    if (!effectNode || effectNode.disposed) {
        console.warn('[Audio updateMasterEffectParamInAudio] Effect node not available:', effectId);
        return;
    }
    const pathParts = paramPath.split('.');
    let target = effectNode;
    for (let i = 0; i < pathParts.length - 1; i++) {
        target = target[pathParts[i]];
        if (!target) return;
    }
    const lastKey = pathParts[pathParts.length - 1];
    const currentValue = target[lastKey];
    try {
        if (currentValue && typeof currentValue.rampTo === 'function' && typeof value === 'number') {
            currentValue.rampTo(value, 0.02);
        } else {
            target[lastKey] = value;
        }
    } catch (e) {
        console.warn('[Audio updateMasterEffectParamInAudio] Failed to update parameter:', e.message);
    }
}

export function handleSidechainParamChangeForEffect(effectId, effectNode, sidechainValue) {
    if (!effectNode || effectNode.disposed) return;
    if (!sidechainTrackAssignments.has(effectId)) return;
    const assignment = sidechainTrackAssignments.get(effectId);
    if (!assignment) return;
    if (typeof effectNode.set === 'function') {
        try {
            effectNode.set({ sidechain: sidechainValue });
        } catch (e) {
            console.warn('[Audio handleSidechainParamChangeForEffect] Failed to update sidechain param:', e.message);
        }
    }
}

export function enableSidechainFromTrackForEffect(effectId, trackId) {
    const effectNode = activeMasterEffectNodes.get(effectId);
    if (!effectNode || effectNode.disposed) return false;
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) return false;
    sidechainTrackAssignments.set(effectId, { trackId: track.id, trackName: track.name });
    return enableSidechainFromTrackIn(trackId, effectNode);
}

export function reorderMasterEffectInAudio(effectIdIgnored, newIndexIgnored) {
    rebuildMasterEffectChain();
}

export function updateMeters(globalMasterMeterBar, mixerMasterMeterBar, tracks) {
    if (!masterMeterNode || masterMeterNode.disposed) {
        return;
    }
    try {
        const levelDb = masterMeterNode.getValue(Tone.context);
        const level = Tone.dbToGain(levelDb);
        if (globalMasterMeterBar) {
            globalMasterMeterBar.style.width = `${Math.min(100, Math.max(0, level * 100))}%`;
        }
        if (mixerMasterMeterBar) {
            mixerMasterMeterBar.style.width = `${Math.min(100, Math.max(0, level * 100))}%`;
        }
    } catch (e) {
        console.warn('[Audio updateMeters] Failed to update meters:', e.message);
    }
}

export async function playSlicePreview(trackId, sliceIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0) {
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) return;

    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded) {
        console.warn(`[Audio playSlicePreview] Conditions not met for playing slice preview for track ${trackId}, slice ${sliceIndex}.`);
        if (localAppServices.showNotification && track && track.type === 'Sampler' && (!track.audioBuffer || !track.audioBuffer.loaded)) {
            localAppServices.showNotification(`Sampler audio is not loaded for ${track.name}.`, 3000);
        }
        return;
    }

    const sliceData = track.slices && track.slices[sliceIndex];
    if (!sliceData) {
        console.error(`[Audio playSlicePreview] No sliceData for track ${trackId}, slice ${sliceIndex}.`);
        return;
    }

    try {
        const player = track.slicerIsPolyphonic ? new Tone.Player(track.audioBuffer) : track.slicerMonoPlayer;
        const env = track.slicerIsPolyphonic ? null : track.slicerMonoEnvelope;
        const gain = track.slicerIsPolyphonic ? null : track.slicerMonoGain;
        const playbackRate = Math.pow(2, ((sliceData.pitchShift || 0) + additionalPitchShiftInSemitones) / 12);
        const volumeGain = Tone.dbToGain((sliceData.volume ?? 0.7) * 12 - 6);

        if (!player) {
            console.warn('[Audio playSlicePreview] No player available.');
            return;
        }

        player.playbackRate = playbackRate;
        player.reverse = !!sliceData.reverse;
        player.loop = !!sliceData.loop;
        player.loopStart = sliceData.offset || 0;
        player.loopEnd = (sliceData.offset || 0) + (sliceData.duration || 0.1);

        if (track.slicerIsPolyphonic) {
            player.connect(getActualMasterGainNode());
            player.start(Tone.now(), sliceData.offset || 0, sliceData.duration || 0.1);
            setTimeout(() => {
                try { player.stop(); } catch (e) {}
                try { player.dispose(); } catch (e) {}
            }, Math.max(50, ((sliceData.duration || 0.1) / playbackRate) * 1000));
        } else {
            if (gain && !gain.disposed) {
                gain.gain.value = volumeGain;
            }
            if (env && !env.disposed) {
                env.triggerAttack(Tone.now());
            }
            if (player && !player.disposed) {
                player.playbackRate = playbackRate;
                player.start(Tone.now(), sliceData.offset || 0, sliceData.duration || 0.1);
                setTimeout(() => {
                    try { player.stop(); } catch (e) {}
                    try { env && env.triggerRelease(Tone.now()); } catch (e) {}
                }, Math.max(50, ((sliceData.duration || 0.1) / playbackRate) * 1000));
            }
        }
    } catch (error) {
        console.error('[Audio playSlicePreview] Error:', error);
    }
}

export async function playDrumSamplerPadPreview(trackId, padIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0) {
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) return;

    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track || track.type !== 'DrumSampler' || !track.drumPadPlayers[padIndex] || track.drumPadPlayers[padIndex].disposed || !track.drumPadPlayers[padIndex].loaded) {
        console.warn(`[Audio playDrumSamplerPadPreview] Conditions not met for playing drum pad preview for track ${trackId}, pad ${padIndex}. Player loaded: ${((track) && (track).drumPadPlayers)[padIndex]?.loaded}`);
        if (localAppServices.showNotification && track && track.type === 'DrumSampler' && (!track.drumPadPlayers[padIndex] || !track.drumPadPlayers[padIndex].loaded) ) {
            localAppServices.showNotification(`Drum pad ${padIndex + 1} is not loaded for ${track.name}.`, 3000);
        }
        return;
    }

    const padData = track.drumSamplerPads && track.drumSamplerPads[padIndex];
    if (!padData) {
        console.error(`[Audio playDrumSamplerPadPreview] No padData for track ${trackId}, pad ${padIndex}.`);
        return;
    }

    const player = track.drumPadPlayers[padIndex];
    const destination = getActualMasterGainNode();
    if (!destination || destination.disposed) {
        console.error(`[Audio playDrumSamplerPadPreview] No valid destination node for track ${trackId}, pad ${padIndex}.`);
        return;
    }

    try {
        if (player && !player.disposed) {
            player.disconnect();
            player.connect(destination);
            const totalPadPitchShift = (padData.pitchShift || 0) + additionalPitchShiftInSemitones;
            player.playbackRate = Math.pow(2, totalPadPitchShift / 12);
            player.volume.value = Tone.gainToDb(Math.max(0.0001, Math.min(1, (padData.volume ?? 0.7) * velocity)));
            player.start(Tone.now());
        }
    } catch (error) {
        console.error('[Audio playDrumSamplerPadPreview] Error:', error);
    }
}

export function getMimeTypeFromFilename(filename) {
    if (!filename || typeof filename !== 'string') {
        return 'application/octet-stream';
    }
    const lower = filename.toLowerCase();
    if (lower.endsWith('.wav')) return 'audio/wav';
    if (lower.endsWith('.mp3')) return 'audio/mpeg';
    if (lower.endsWith('.ogg')) return 'audio/ogg';
    if (lower.endsWith('.m4a')) return 'audio/mp4';
    if (lower.endsWith('.aac')) return 'audio/aac';
    if (lower.endsWith('.flac')) return 'audio/flac';
    if (lower.endsWith('.webm')) return 'audio/webm';
    return 'application/octet-stream';
}

async function commonLoadSampleLogic(fileObject, sourceName, track, trackTypeHint, padIndex = null) {
    const isReconstructing = localAppServices.getIsReconstructingDAW ? localAppServices.getIsReconstructingDAW() : false;

    if (localAppServices.captureStateForUndo && !isReconstructing) {
        const targetName = trackTypeHint === 'DrumSampler' && padIndex !== null ?
            `Pad ${padIndex + 1} on ${track.name}` :
            track.name;
        localAppServices.captureStateForUndo(`Load ${sourceName} to ${targetName}`);
    }

    let objectURLForTone = null;
    try {
        objectURLForTone = URL.createObjectURL(fileObject);
        const dbKeySuffix = trackTypeHint === 'DrumSampler' && padIndex !== null ?
            `drumPad-${padIndex}-${sourceName.replace(/[^a-zA-Z0-9-_.]/g, '_')}` :
            `${trackTypeHint}-${sourceName.replace(/[^a-zA-Z0-9-_.]/g, '_')}`;
        const dbKey = `track-${track.id}-${dbKeySuffix}-${fileObject.size}-${fileObject.lastModified}`;
        await storeAudio(dbKey, fileObject);
        const newAudioBuffer = await new Tone.Buffer().load(objectURLForTone);

        if (trackTypeHint === 'Sampler') {
            if (track.audioBuffer && !track.audioBuffer.disposed) track.audioBuffer.dispose();
            track.disposeSlicerMonoNodes();
            track.audioBuffer = newAudioBuffer;
            track.samplerAudioData = { fileName: sourceName, dbKey: dbKey, status: 'loaded' };
            if (!track.slicerIsPolyphonic && track.audioBuffer && track.audioBuffer.loaded) track.setupSlicerMonoNodes();
            if (localAppServices.autoSliceSample && track.audioBuffer.loaded && (!track.slices || track.slices.every(s => s.duration === 0))) {
                localAppServices.autoSliceSample(track.id, Constants.numSlices);
            }
            if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'samplerLoaded');

        } else if (trackTypeHint === 'InstrumentSampler') {
            if (track.instrumentSamplerSettings.audioBuffer && !track.instrumentSamplerSettings.audioBuffer.disposed) {
                track.instrumentSamplerSettings.audioBuffer.dispose();
            }
            if (track.toneSampler && !track.toneSampler.disposed) track.toneSampler.dispose();

            track.instrumentSamplerSettings = {
                ...track.instrumentSamplerSettings,
                audioBuffer: newAudioBuffer,
                originalFileName: sourceName,
                dbKey: dbKey,
                status: 'loaded',
                loopStart: 0,
                loopEnd: newAudioBuffer.duration
            };
            track.setupToneSampler();
            if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'instrumentSamplerLoaded');

        } else if (trackTypeHint === 'DrumSampler' && padIndex !== null) {
            const padData = track.drumSamplerPads[padIndex];
            if (padData) {
                if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
                if (track.drumPadPlayers[padIndex] && !track.drumPadPlayers[padIndex].disposed) track.drumPadPlayers[padIndex].dispose();

                padData.audioBuffer = newAudioBuffer;
                padData.originalFileName = sourceName;
                padData.dbKey = dbKey;
                padData.status = 'loaded';
                track.drumPadPlayers[padIndex] = new Tone.Player(newAudioBuffer);
            } else {
                console.error(`[Audio commonLoadSampleLogic] Pad data not found for index ${padIndex} on track ${track.id}`);
                throw new Error(`Pad data not found for index ${padIndex}.`);
            }
            if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'drumPadLoaded', padIndex);
        }

        track.rebuildEffectChain();
        if (localAppServices.showNotification) {
            localAppServices.showNotification(`Sample "${sourceName}" loaded for ${track.name}${trackTypeHint === 'DrumSampler' && padIndex !== null ? ` (Pad ${padIndex+1})` : ''}.`, 2000);
        }

    } catch (error) {
        console.error(`[Audio commonLoadSampleLogic] Error loading sample "${sourceName}" for track ${track.id} (${trackTypeHint}):`, error);
        if (localAppServices.showNotification) {
            localAppServices.showNotification(`Error loading sample "${sourceName.substring(0,30)}": ${error.message || 'Unknown error.'}`, 4000);
        }
        if (trackTypeHint === 'Sampler') if(track.samplerAudioData) track.samplerAudioData.status = 'error';
        else if (trackTypeHint === 'InstrumentSampler') if(track.instrumentSamplerSettings) track.instrumentSamplerSettings.status = 'error';
        else if (trackTypeHint === 'DrumSampler' && padIndex !== null && track.drumSamplerPads[padIndex]) track.drumSamplerPads[padIndex].status = 'error';

        if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sampleLoadError', padIndex);
    } finally {
        if (objectURLForTone) URL.revokeObjectURL(objectURLForTone);
    }
}

export async function loadSampleFile(eventOrUrl, trackId, trackTypeHint, fileNameForUrl = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) {
        if (localAppServices.showNotification) localAppServices.showNotification(`Track ID ${trackId} not found.`, 3000);
        return;
    }

    let providedBlob, sourceName;
    const isUrlSource = typeof eventOrUrl === 'string';
    const isDirectFile = eventOrUrl instanceof File;
    const isBlobEvent = eventOrUrl instanceof Blob && !(eventOrUrl instanceof File);

    if (isUrlSource) {
        sourceName = fileNameForUrl || eventOrUrl.split('/').pop().split('?')[0] || 'loaded_audio';
        try {
            const response = await fetch(eventOrUrl);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            providedBlob = await response.blob();
        } catch (e) {
            console.error(`[Audio loadSampleFile] Error fetching sample from URL "${eventOrUrl}":`, e);
            if (localAppServices.showNotification) localAppServices.showNotification(`Error fetching sample "${sourceName.substring(0,30)}": ${e.message}`, 3000);
            return;
        }
    } else if (eventOrUrl && eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) { // From file input event
        providedBlob = eventOrUrl.target.files[0];
        sourceName = providedBlob.name;
    } else if (isDirectFile) { // Directly passed File object
        providedBlob = eventOrUrl;
        sourceName = providedBlob.name;
    } else if (isBlobEvent) { // Directly passed Blob object
        providedBlob = eventOrUrl;
        sourceName = fileNameForUrl || `loaded_blob_${Date.now()}.wav`; // Provide a default name
    } else {
        if (localAppServices.showNotification) localAppServices.showNotification("No file selected or invalid source.", 3000);
        return;
    }

    if (!providedBlob) {
        if (localAppServices.showNotification) localAppServices.showNotification("Could not obtain file data.", 3000);
        return;
    }

    const inferredType = getMimeTypeFromFilename(sourceName);
    const explicitType = providedBlob.type || inferredType || 'application/octet-stream'; // Use provided type, then inferred, then default
    const fileObject = new File([providedBlob], sourceName, { type: explicitType });

    if (!fileObject.type.startsWith('audio/') && fileObject.type !== "application/octet-stream") {
        if (localAppServices.showNotification) localAppServices.showNotification(`Invalid audio file type: "${fileObject.type}". Please use common audio formats.`, 3000);
        return;
    }
    if (fileObject.size === 0) {
        if (localAppServices.showNotification) localAppServices.showNotification(`Audio file "${sourceName}" is empty.`, 3000);
        return;
    }
    await commonLoadSampleLogic(fileObject, sourceName, track, trackTypeHint);
}


export async function loadDrumSamplerPadFile(eventOrUrl, trackId, padIndex, fileNameForUrl = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track || track.type !== 'DrumSampler') {
        if (localAppServices.showNotification) localAppServices.showNotification(`Track ID ${trackId} is not a Drum Sampler.`, 3000);
        return;
    }
    if (typeof padIndex !== 'number' || isNaN(padIndex) || padIndex < 0 || padIndex >= track.drumSamplerPads.length) {
        if (localAppServices.showNotification) localAppServices.showNotification(`Invalid pad index: ${padIndex}.`, 3000);
        return;
    }
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        if (localAppServices.showNotification) localAppServices.showNotification("Audio system not ready. Please interact with the page.", 3000);
        return;
    }

    let providedBlob, sourceName;
    const isUrlSource = typeof eventOrUrl === 'string';
    const isDirectFile = eventOrUrl instanceof File;
    const isBlobEvent = eventOrUrl instanceof Blob && !(eventOrUrl instanceof File);


    if (isUrlSource) {
        sourceName = fileNameForUrl || eventOrUrl.split('/').pop().split('?')[0] || `pad_${padIndex}_sample_from_url`;
        try {
            const response = await fetch(eventOrUrl);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status} for "${sourceName}"`);
            providedBlob = await response.blob();
        } catch (e) {
            console.error(`[Audio loadDrumSamplerPadFile] Error fetching drum sample from URL "${eventOrUrl}":`, e);
            if (localAppServices.showNotification) localAppServices.showNotification(`Error fetching drum sample "${sourceName.substring(0,30)}": ${e.message}`, 3000);
            return;
        }
    } else if (eventOrUrl && eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
        providedBlob = eventOrUrl.target.files[0];
        sourceName = providedBlob.name;
    } else if (isDirectFile) {
        providedBlob = eventOrUrl;
        sourceName = providedBlob.name;
    } else if (isBlobEvent) {
        providedBlob = eventOrUrl;
        sourceName = fileNameForUrl || `pad_${padIndex}_blob_${Date.now()}.wav`;
    } else {
        if (localAppServices.showNotification) localAppServices.showNotification("No file selected for drum pad or invalid source.", 3000);
        return;
    }

    if (!providedBlob) {
        if (localAppServices.showNotification) localAppServices.showNotification("Could not obtain drum sample data.", 3000);
        return;
    }

    const inferredType = getMimeTypeFromFilename(sourceName);
    const explicitType = providedBlob.type || inferredType || 'application/octet-stream';
    const fileObject = new File([providedBlob], sourceName, { type: explicitType });

    if (!fileObject.type.startsWith('audio/') && fileObject.type !== "application/octet-stream") {
        if (localAppServices.showNotification) localAppServices.showNotification(`Invalid audio file type for drum pad: "${fileObject.type}".`, 3000);
        return;
    }
    if (fileObject.size === 0) {
        if (localAppServices.showNotification) localAppServices.showNotification(`Drum sample "${sourceName}" is empty.`, 3000);
        return;
    }
    await commonLoadSampleLogic(fileObject, sourceName, track, 'DrumSampler', padIndex);
}

export async function loadSoundFromBrowserToTarget(soundData, targetTrackId, targetTrackTypeIgnored, targetPadOrSliceIndex = null) {
    const trackIdNum = parseInt(targetTrackId);
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackIdNum) : null;

    if (!track) {
        if (localAppServices.showNotification) localAppServices.showNotification(`Target track (ID: ${targetTrackId}) not found.`, 3000);
        return;
    }

    const { fullPath, libraryName, fileName } = soundData;
    const isTargetSamplerType = ['Sampler', 'InstrumentSampler', 'DrumSampler'].includes(track.type);

    if (!isTargetSamplerType) {
        if (localAppServices.showNotification) localAppServices.showNotification(`Cannot load sample from browser to a ${track.type} track. Target must be a sampler type.`, 3000);
        return;
    }

    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        if (localAppServices.showNotification) localAppServices.showNotification("Audio system not ready. Please interact with the page.", 3000);
        return;
    }

    if (localAppServices.showNotification) localAppServices.showNotification(`Loading "${fileName}" to ${track.name}...`, 2000);
    console.log(`[Audio loadSoundFromBrowserToTarget] Attempting to load: ${fileName} from lib: ${libraryName} (Path: ${fullPath}) to Track ID: ${track.id} (${track.type}), Pad/Slice Index: ${targetPadOrSliceIndex}`);

    try {
        const loadedZips = localAppServices.getLoadedZipFiles ? localAppServices.getLoadedZipFiles() : {};
        if (!loadedZips[libraryName] || loadedZips[libraryName] === "loading") {
            throw new Error(`Library "${libraryName}" not loaded or is still loading.`);
        }
        const zipFile = loadedZips[libraryName];
        const zipEntry = zipFile.file(fullPath);
        if (!zipEntry) {
            throw new Error(`File "${fullPath}" not found in library "${libraryName}". Check path case and existence.`);
        }

        const fileBlobFromZip = await zipEntry.async("blob");
        const inferredMimeType = getMimeTypeFromFilename(fileName);
        const finalMimeType = fileBlobFromZip.type && fileBlobFromZip.type !== "application/octet-stream" ? fileBlobFromZip.type : inferredMimeType;
        const blobToLoad = new File([fileBlobFromZip], fileName, { type: finalMimeType });

        if (track.type === 'DrumSampler') {
            let actualPadIndex = targetPadOrSliceIndex;
            // If targetPadOrSliceIndex is not valid, try to find an empty pad or use selected
            if (typeof actualPadIndex !== 'number' || isNaN(actualPadIndex) || actualPadIndex < 0 || actualPadIndex >= Constants.numDrumSamplerPads) {
                actualPadIndex = track.drumSamplerPads.findIndex(p => !p.dbKey && !p.originalFileName); // Find first truly empty
                if (actualPadIndex === -1) actualPadIndex = track.selectedDrumPadForEdit; // Fallback to selected
                if (typeof actualPadIndex !== 'number' || actualPadIndex < 0) actualPadIndex = 0; // Final fallback

            }
            await commonLoadSampleLogic(blobToLoad, fileName, track, 'DrumSampler', actualPadIndex);
        } else { // Sampler or InstrumentSampler
            await commonLoadSampleLogic(blobToLoad, fileName, track, track.type, null); // padIndex is null for these
        }
    } catch (error) {
        console.error(`[Audio loadSoundFromBrowserToTarget] Error loading sound "${fileName}" from browser:`, error);
        if (localAppServices.showNotification) {
            localAppServices.showNotification(`Error loading "${fileName.substring(0,30)}": ${error.message}`, 4000);
        }
        if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sampleLoadError', targetPadOrSliceIndex);
    }
}

export async function fetchSoundLibrary(libraryName, zipUrl, isAutofetch = false) {

    const soundTrees = localAppServices.getSoundLibraryFileTrees ? localAppServices.getSoundLibraryFileTrees() : {};
    const loadedZips = localAppServices.getLoadedZipFiles ? localAppServices.getLoadedZipFiles() : {};

    if (loadedZips && typeof loadedZips === 'object') { // Ensure loadedZips is an object before keying

    } else {
    }
    if (soundTrees && typeof soundTrees === 'object') {

    } else {
    }


    if (loadedZips && loadedZips[libraryName] && loadedZips[libraryName] !== "loading") {
        if (!isAutofetch && localAppServices.updateSoundBrowserDisplayForLibrary) {
            localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, false, false); // isLoading = false, hasError = false
        }
        return; // Already loaded
    }
    if (loadedZips && loadedZips[libraryName] === "loading") {
        return; // Already being loaded
    }

    // Update UI to show loading state if not autofetching
    if (!isAutofetch && localAppServices.updateSoundBrowserDisplayForLibrary) {
        localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, true, false); // isLoading = true, hasError = false
    }

    try {
        const newLoadedZips = localAppServices.getLoadedZipFiles ? { ...(localAppServices.getLoadedZipFiles()) } : {}; // Ensure we start with a fresh copy if getLoadedZipFiles is available
        newLoadedZips[libraryName] = "loading";
        if (localAppServices.setLoadedZipFilesState) localAppServices.setLoadedZipFilesState(newLoadedZips);


        const response = await fetch(zipUrl);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status} fetching ZIP for ${libraryName} from ${zipUrl}`);
        }
        const zipData = await response.arrayBuffer();
        const loadedZipInstance = await new JSZip().loadAsync(zipData);

        // Build fileTree from loadedZipInstance
        const fileTree = {};
        const files = Object.keys(loadedZipInstance.files);
        for (const file of files) {
            if (!file.endsWith('/') && !file.startsWith('_')) {
                fileTree[file] = loadedZipInstance.files[file];
            }
        }
        const latestSoundTrees = localAppServices.getSoundLibraryFileTrees ? localAppServices.getSoundLibraryFileTrees() : {};
        latestSoundTrees[libraryName] = fileTree;
        if (localAppServices.setSoundLibraryFileTreesState) localAppServices.setSoundLibraryFileTreesState(latestSoundTrees);
        if (localAppServices.setLoadedZipFilesState) localAppServices.setLoadedZipFilesState(newLoadedZips);

        if (!isAutofetch && localAppServices.updateSoundBrowserDisplayForLibrary) {
            localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, false, false); // isLoading = false, hasError = false
        }
    } catch (error) {
        console.error(`[Audio fetchSoundLibrary] Error loading library "${libraryName}" from ${zipUrl}:`, error);
        const failedLoadedZips = localAppServices.getLoadedZipFiles ? { ...(localAppServices.getLoadedZipFiles()) } : {};
        failedLoadedZips[libraryName] = null;
        if (localAppServices.setLoadedZipFilesState) localAppServices.setLoadedZipFilesState(failedLoadedZips);
        if (localAppServices.updateSoundBrowserDisplayForLibrary) {
            localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, false, true); // isLoading = false, hasError = true
        }
    }
}

export function autoSliceSample(trackId, numSlicesToCreate = Constants.numSlices) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track || track.type !== 'Sampler') {
        if (localAppServices.showNotification) localAppServices.showNotification('Auto-slicing is only available for Sampler tracks.', 3000);
        return false;
    }
    return true;
}

export function clearAllMasterEffectNodes() {
    activeMasterEffectNodes.forEach(node => {
        if (node && !node.disposed && typeof node.dispose === 'function') {
            try { node.dispose(); } catch(e) {}
        }
    });
    activeMasterEffectNodes.clear();
}

export function isMetronomeEnabled() { return metronomeEnabled; }
export function getCountInBars() { return countInBars; }
export function setCountInBars(bars) { countInBars = Math.max(0, Math.min(4, Math.floor(bars))); }
export function isCountInActive() { return countInActive; }

export function setMetronomeEnabled(enabled) {
    metronomeEnabled = !!enabled;
    return metronomeEnabled;
}

export function setMetronomeVolume(vol) {
    const nextValue = Math.max(0, Math.min(1, parseFloat(vol) || 0));
    _metronomeVolume = nextValue;
    return nextValue;
}

export function getMetronomeVolume() { return _metronomeVolume; }

export function stopMetronome() {
    countInActive = false;
}

export function cleanupMetronome() {
    stopMetronome();
}

export function cleanupCountIn() {
    countInActive = false;
}

export function startCountIn(onCountInComplete, startPosition = 0) {
    countInActive = true;
    if (typeof onCountInComplete === 'function') {
        setTimeout(() => {
            countInActive = false;
            onCountInComplete(startPosition);
        }, countInBars * 1000);
    }
}

export function startAutomation() {
    automationActive = true;
}

export function stopAutomation() {
    automationActive = false;
}

export function cleanupAutomation() {
    stopAutomation();
}

export function onTransportStart() {
    automationActive = true;
}

export function onTransportStop() {
    automationActive = false;
}

export function writeMasterVolumeAutomation(time, value) {
    masterVolumeAutomation.push({ time, value });
}

export function applyMasterVolumeAutomationAtTime(time) {
    const event = masterVolumeAutomation.find(entry => entry.time === time);
    if (event) {
        setMasterVolumeAutomation(event.value);
    }
}

export function getMasterVolumeAutomation() {
    return masterVolumeAutomation.map(entry => ({ ...entry }));
}

export function setMasterVolumeAutomation(automationData) {
    masterVolumeAutomation = Array.isArray(automationData) ? automationData.map(entry => ({ ...entry })) : [];
}

export function resetTapTempo() {
    tapTimes = [];
}

export function tapTempo() {
    tapTimes.push(Date.now());
}

export function getTapTempoBpm() {
    if (tapTimes.length < 2) return null;
    const deltas = [];
    for (let i = 1; i < tapTimes.length; i++) {
        deltas.push(tapTimes[i] - tapTimes[i - 1]);
    }
    const avgMs = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    return 60000 / avgMs;
}

export function isTapTempoReady() {
    return tapTimes.length >= 2;
}

export function getLoopRegion() {
    return { ...loopRegion };
}

export function setLoopRegion(startBars, endBars) {
    if (startBars < 0 || endBars <= startBars || endBars > Constants.MAX_BARS) {
        console.warn('[Loop] Invalid region:', startBars, endBars);
        return false;
    }
    loopRegion.start = startBars;
    loopRegion.end = endBars;
    return true;
}

export function setLoopRegionEnabled(enabled) {
    loopRegion.enabled = !!enabled;
    return loopRegion.enabled;
}

export function isLoopRegionEnabled() {
    return loopRegion.enabled;
}

export function getLoopStartBars() { return loopRegion.start; }
export function getLoopEndBars() { return loopRegion.end; }

export function getPunchRegion() {
    return { ...punchRegion };
}

export function setPunchRegion(inBars, outBars) {
    if (inBars < 0 || outBars <= inBars || outBars > Constants.MAX_BARS) {
        console.warn('[Punch] Invalid region:', inBars, outBars);
        return false;
    }
    punchRegion.in = inBars;
    punchRegion.out = outBars;
    console.log(`[Punch] Set to ${punchRegion.in} - ${punchRegion.out} bars`);
    return true;
}

export function setPunchRegionEnabled(enabled) {
    punchRegion.enabled = !!enabled;
    console.log(`[Punch] ${punchRegion.enabled ? 'Enabled' : 'Disabled'}`);
    return punchRegion.enabled;
}

export function isPunchRegionEnabled() {
    return punchRegion.enabled;
}

export function getPunchInBars() { return punchRegion.in; }
export function getPunchOutBars() { return punchRegion.out; }

export function isPositionInPunchRegion(positionString) {
    if (!punchRegion.enabled) return false;
    const posParts = positionString.split(':').map(Number);
    if (posParts.length < 3 || posParts.some(isNaN)) return false;
    const [bars, beats, sixteenths] = posParts;
    const totalSixteenths = bars * 16 + beats * 4 + sixteenths;
    const punchInSixteenths = punchRegion.in * 16;
    const punchOutSixteenths = punchRegion.out * 16;
    return totalSixteenths >= punchInSixteenths && totalSixteenths < punchOutSixteenths;
}

// ============================================================
// PUNCH-IN/OUT RECORDING ENFORCEMENT
// ============================================================
// When punch-in is enabled, we need to schedule a callback that starts/stops the
// actual Tone.Recorder at the correct transport positions (punch in/out points).
// The Tone.Recorder is an offline recorder — we need to manage its start/stop
// based on transport position to implement punch-in/out correctly.

export function scheduleRecordingForPunch(trackId, onPunchOutTriggered) {
    // Clear any previous scheduling
    if (recordingScheduledId !== null) {
        try { Tone.Transport.clear(recordingScheduledId); } catch(e) {}
        recordingScheduledId = null;
    }
    recordingScheduledTrackId = trackId;

    // Schedule the punch-out trigger
    const punchOutPosition = `+0:${punchRegion.out * 16}:0`;
    recordingScheduledId = Tone.Transport.schedule((time) => {
        console.log(`[Punch Recording] Punch-out point reached at ${punchOutPosition}. Stopping recorder.`);
        if (recorder && recorder.state === 'started') {
            recorder.stop().then(() => {
                console.log('[Punch Recording] Recorder stopped at punch-out.');
                if (onPunchOutTriggered) onPunchOutTriggered();
            }).catch(e => console.error('[Punch Recording] Error stopping at punch-out:', e));
        }
    }, punchOutPosition);
    console.log(`[Punch Recording] Scheduled punch-out at ${punchOutPosition}, ID:`, recordingScheduledId);
}

export function cancelScheduledRecording() {
    if (recordingScheduledId !== null) {
        try { Tone.Transport.clear(recordingScheduledId); } catch(e) {}
        recordingScheduledId = null;
    }
    recordingScheduledTrackId = null;
    console.log('[Punch Recording] Cancelled scheduled recording.');
}

export function getRecordingScheduledTrackId() {
    return recordingScheduledTrackId;
}

// Cleanup function to be called when recording stops
export function cleanupRecordingScheduling() {
    cancelScheduledRecording();
}

// ============================================================
// CONTEXT SUSPENSION MONITORING & RECOVERY
// ============================================================

// Monitor the Tone.context.state and attempt to recover from suspension.
// This handles the case where browsers auto-suspend AudioContext after
// a period of inactivity (especially on mobile/low-power modes).
export function startContextSuspensionMonitoring(intervalMs = 3000) {
    if (resumeAttemptScheduled) return; // Already monitoring
    resumeAttemptScheduled = true;

    const checkInterval = setInterval(() => {
        if (!Tone.context) {
            resumeAttemptScheduled = false;
            clearInterval(checkInterval);
            return;
        }

        const currentState = Tone.context.state;
        if (currentState === 'suspended') {
            contextSuspendedCount++;
            console.warn(`[Audio ContextMonitor] Context suspended (count: ${contextSuspendedCount}). Attempting auto-resume...`);
            Tone.context.resume().then(() => {
                if (Tone.context.state === 'running') {
                    // Re-initialize master bus components if they were disposed
                    if (masterEffectsBusInputNode?.disposed || masterGainNodeActual?.disposed || masterMeterNode?.disposed) {
                        setupMasterBus();
                    }
                    // Emit a notification if this was a significant suspension
                    if (contextSuspendedCount > 0 && localAppServices.showNotification) {
                        localAppServices.showNotification('Audio context resumed.', 2000);
                    }
                } else {
                    console.warn('[Audio ContextMonitor] Resume attempted but context still not running. State:', Tone.context.state);
                    if (contextSuspendedCount >= 3 && localAppServices.showNotification) {
                        localAppServices.showNotification('Audio suspended. Tap/click to reactivate.', 4000);
                    }
                }
            }).catch(err => {
                console.error('[Audio ContextMonitor] Error during context resume:', err.message);
            });
        } else if (currentState === 'running') {
            // Context is running — reset the suspension counter if we were previously suspended
            if (contextSuspendedCount > 0) {
                contextSuspendedCount = 0;
            }
        }
    }, intervalMs);

    console.log('[Audio ContextMonitor] Started context suspension monitoring, interval:', intervalMs, 'ms');
}

export function stopContextSuspensionMonitoring() {
    resumeAttemptScheduled = false;
    contextSuspendedCount = 0;
    console.log('[Audio ContextMonitor] Stopped context suspension monitoring.');
}

export function getContextSuspensionCount() {
    return contextSuspendedCount;
}

export function getContextState() {
    return Tone.context ? Tone.context.state : 'unavailable';
}

export async function exportMixdownToWav(durationSeconds) {
    console.log('[Audio exportMixdownToWav] Starting export, duration:', durationSeconds, 's');
    const maxDuration = 600; // 10 minutes max
    const safeDuration = Math.min(Math.max(durationSeconds, 1), maxDuration);

    // Pause transport if running to avoid double audio
    const wasPlaying = Tone.Transport.state === 'started';
    if (wasPlaying) {
        Tone.Transport.pause();
    }

    try {
        // Use Tone.Recorder to capture output via live transport playback
        // This approach is more reliable than Tone.Offline which requires a
        // reconstructTransportSchedule() function that doesn't exist
        const recorder = new Tone.Recorder();
        const masterGain = getActualMasterGainNode();

        if (!masterGain || masterGain.disposed) {
            throw new Error('Master output not available.');
        }

        // Connect master gain to recorder
        masterGain.connect(recorder);

        // Reset transport state
        Tone.Transport.position = 0;
        Tone.Transport.loop = false;

        // Stop any existing playback on tracks
        const tracks = getTracksState();
        tracks.forEach(t => {
            if (t && typeof t.stopPlayback === 'function') t.stopPlayback();
        });
        await new Promise(r => setTimeout(r, 100));

        // Schedule all tracks for playback
        for (const track of tracks) {
            if (track && typeof track.schedulePlayback === 'function') {
                await track.schedulePlayback(0, safeDuration);
            }
        }

        // Start recording and transport
        await recorder.start();

        Tone.Transport.start();

        // Wait for full duration
        await new Promise(resolve => setTimeout(resolve, safeDuration * 1000 + 500));

        // Stop recording
        const recording = await recorder.stop();

        // Stop transport and cleanup
        Tone.Transport.stop();
        Tone.Transport.cancel(0);
        tracks.forEach(t => {
            if (t && typeof t.stopPlayback === 'function') t.stopPlayback();
        });

        try { masterGain.disconnect(recorder); } catch (e) {}
        recorder.dispose();

        if (!recording || recording.size < 1000) {
            throw new Error('No audio recorded. Add some notes or audio first.');
        }

        console.log('[Audio exportMixdownToWav] Export complete.');
        return recording;
    } catch (err) {
        console.error('[Audio exportMixdownToWav] Error during export:', err);
        throw err;
    } finally {
        // Restore transport state
        if (wasPlaying) {
            Tone.Transport.start();
        }
    }
}

// ============================================================
// EXPORT MIXDOWN TO WAV
// ============================================================

// export async function exportMixdownToWav(durationSeconds) {
//     console.log('[Audio exportMixdownToWav] Starting export, duration:', durationSeconds, 's');
//     const maxDuration = 600; // 10 minutes max
//     const safeDuration = Math.min(Math.max(durationSeconds, 1), maxDuration);

//     // Pause transport if running to avoid double audio
//     const wasPlaying = Tone.Transport.state === 'started';
//     if (wasPlaying) {
//         Tone.Transport.pause();
//     }

//     try {
//         // Tone.Offline renders all audio through the transport/scheduler
//         const buffer = await Tone.Offline(async () => {
//             // Reconstruct the transport schedule so offline context plays all scheduled events
//             if (typeof reconstructTransportSchedule === 'function') {
//                 await reconstructTransportSchedule();
//             }
//             // Schedule the transport to play for the full duration
//             Tone.Transport.start(0, 0);
//             // Let it run for the requested duration
//             await new Promise(resolve => setTimeout(resolve, (safeDuration + 0.5) * 1000));
//         }, safeDuration + 0.5);

//         console.log('[Audio exportMixdownToWav] Offline buffer created. Channels:', buffer.numberOfChannels, 'Duration:', buffer.duration, 's');

//         // Convert ToneAudioBuffer to AudioBuffer
//         const audioBuffer = buffer.get ? buffer.get() : buffer;

//         // Encode as WAV using a simple PCM encoder
//         const wavBlob = audioBufferToWav(audioBuffer);
//         console.log('[Audio exportMixdownToWav] WAV blob created. Size:', wavBlob.size, 'bytes');

//         return wavBlob;
//     } catch (err) {
//         console.error('[Audio exportMixdownToWav] Error during offline rendering:', err);
//         throw err;
//     } finally {
//         // Restore transport state
//         if (wasPlaying) {
//             Tone.Transport.start();
//         }
//     }
// }

// function audioBufferToWav(audioBuffer) {
//     const numChannels = audioBuffer.numberOfChannels;
//     const sampleRate = audioBuffer.sampleRate;
//     const format = 1; // PCM
//     const bitDepth = 16;

//     const bytesPerSample = bitDepth / 8;
//     const blockAlign = numChannels * bytesPerSample;

//     // Interleave channels
//     const length = audioBuffer.length;
//     const samples = new Int16Array(length * numChannels);
//     for (let i = 0; i < length; i++) {
//         for (let ch = 0; ch < numChannels; ch++) {
//             const val = audioBuffer.getChannelData(ch)[i];
//             // Clamp to Int16 range and convert float [-1,1] to Int16
//             const int16 = Math.max(-32768, Math.min(32767, Math.round(val * 32768)));
//             samples[i * numChannels + ch] = int16;
//         }
//     }

//     const dataSize = samples.length * bytesPerSample;
//     const buffer = new ArrayBuffer(44 + dataSize);
//     const view = new DataView(buffer);

//     // RIFF header
//     writeString(view, 0, 'RIFF');
//     view.setUint32(4, 36 + dataSize, true);
//     writeString(view, 8, 'WAVE');

//     // fmt chunk
//     writeString(view, 12, 'fmt ');
//     view.setUint32(16, 16, true); // chunk size
//     view.setUint16(20, format, true); // PCM format
//     view.setUint16(22, numChannels, true);
//     view.setUint32(24, sampleRate, true);
//     view.setUint32(28, sampleRate * blockAlign, true); // byte rate
//     view.setUint16(32, blockAlign, true);
//     view.setUint16(34, bitDepth, true);

//     // data chunk
//     writeString(view, 36, 'data');
//     view.setUint32(40, dataSize, true);
//     new Int16Array(buffer, 44).set(samples);

//     return new Blob([buffer], { type: 'audio/wav' });
// }

// function writeString(view, offset, string) {
//     for (let i = 0; i < string.length; i++) {
//         view.setUint8(offset + i, string.charCodeAt(i));
//     }
// }

// ============================================================
// SIDECHAIN COMPRESSION
// ============================================================

export function getSidechainBusInput() {
    if (!sidechainBus || sidechainBus.disposed) {
        if (sidechainBus && !sidechainBus.disposed) {
            try { sidechainBus.dispose(); } catch(e) {}
        }
        sidechainBus = new Tone.Gain(1);
    }
    return sidechainBus;
}

export async function enableSidechainFromMic(compressorNode) {
    if (!compressorNode || compressorNode.disposed) {
        console.warn('[Audio enableSidechainFromMic] Invalid compressor node provided.');
        return false;
    }
    if (micForSidechain && micForSidechain.state === 'started') {
        const bus = getSidechainBusInput();
        try { micForSidechain.connect(bus); } catch(e) {}
        try { bus.connect(compressorNode); } catch(e) {}
        return true;
    }
    try {
        await Tone.start();
        micForSidechain = await navigator.mediaDevices.getUserMedia({ audio: true });
        const micStream = new Tone.UserMedia();
        await micStream.open();
        micForSidechain = micStream;
        const bus = getSidechainBusInput();
        try { micStream.connect(bus); } catch(e) {}
        try { bus.connect(compressorNode); } catch(e) {}
        if (localAppServices.showNotification) {
            localAppServices.showNotification('Sidechain: Mic connected to compressor.', 2000);
        }
        return true;
    } catch (e) {
        console.error('[Audio enableSidechainFromMic] Failed to open mic for sidechain:', e);
        if (localAppServices.showNotification) {
            localAppServices.showNotification('Sidechain: Could not access microphone.', 3000);
        }
        return false;
    }
}

export function disableSidechainFromMic() {
    if (micForSidechain) {
        try { micForSidechain.disconnect(); } catch(e) {}
        try { micForSidechain.close(); } catch(e) {}
        micForSidechain = null;
    }
    if (sidechainBus) {
        try { sidechainBus.disconnect(); } catch(e) {}
    }
}

export async function enableSidechainFromTrackIn(trackId, compressorNode) {
    if (!compressorNode || compressorNode.disposed) {
        console.warn('[Audio enableSidechainFromTrackIn] Invalid compressor node provided.');
        return false;
    }
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) {
        console.warn('[Audio enableSidechainFromTrackIn] Track not found:', trackId);
        return false;
    }
    if (!track.inputChannel || track.inputChannel.disposed) {
        console.warn('[Audio enableSidechainFromTrackIn] Track inputChannel not available.');
        return false;
    }
    const bus = getSidechainBusInput();
    try { track.inputChannel.connect(bus); } catch(e) {}
    try { bus.connect(compressorNode); } catch(e) {}
    return true;
}

export function disableSidechainBus() {
    disableSidechainFromMic();
    if (sidechainBus) {
        try { sidechainBus.dispose(); } catch(e) {}
        sidechainBus = null;
    }
}

export function isMicOpenForSidechain() {
    return micForSidechain && micForSidechain.state === 'started';
}