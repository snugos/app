// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading
import * as Constants from './constants.js';
// showNotification will be accessed via localAppServices
// import { showNotification } from './utils.js'; // Not directly imported, accessed via appServices
import { createEffectInstance } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';
import { getRecordingStartTimeState, getLoadedZipFilesState } from './state.js'; // Added getLoadedZipFilesState for debug


let masterEffectsBusInputNode = null;
let masterGainNodeActual = null; // The actual Tone.Gain node for master volume
let masterMeterNode = null;
let activeMasterEffectNodes = new Map(); // Stores { id: Tone.jsNode } for master effects

let audioContextInitialized = false;

let localAppServices = {};

// Variables for audio recording
let mic = null;
let recorder = null;


export function initializeAudioModule(appServicesFromMain) {
    localAppServices = appServicesFromMain;
    // MODIFICATION START: Debug to confirm function reference
    if (typeof getLoadedZipFilesState !== 'undefined') { // Need to import it for this check to be valid
        console.log('[Audio Init DEBUG] localAppServices.getLoadedZipFiles === getLoadedZipFilesState (from state.js import)?', localAppServices.getLoadedZipFiles === getLoadedZipFilesState);
    } else {
        // console.log('[Audio Init DEBUG] getLoadedZipFilesState not imported, cannot compare reference directly here.');
    }
    // MODIFICATION END
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


export async function initAudioContextAndMasterMeter(isUserInitiated = false) {
    // Check if already initialized and context is running
    if (audioContextInitialized && Tone.context && Tone.context.state === 'running') {
        // Ensure master bus components are also initialized
        if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed ||
            !masterGainNodeActual || masterGainNodeActual.disposed ||
            !masterMeterNode || masterMeterNode.disposed) {
            console.warn("[Audio initAudioContextAndMasterMeter] Context was running, but master bus components are not fully initialized. Re-setting up.");
            setupMasterBus(); // Attempt to re-initialize them
        }
        return true; // Already initialized and running
    }

    console.log('[Audio initAudioContextAndMasterMeter] Attempting Tone.start(). Current context state:', Tone.context?.state);
    try {
        // Attempt to start/resume the AudioContext
        await Tone.start();
        console.log('[Audio initAudioContextAndMasterMeter] Tone.start() completed. Context state:', Tone.context?.state);

        if (Tone.context && Tone.context.state === 'running') {
            if (!audioContextInitialized) {
                // First time setup for master bus after context became running
                console.log('[Audio initAudioContextAndMasterMeter] First time setup for master bus after context became running.');
                setupMasterBus();
            } else if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed ||
                       !masterGainNodeActual || masterGainNodeActual.disposed ||
                       !masterMeterNode || masterMeterNode.disposed) {
                // If context is running but components are bad, re-init
                console.warn('[Audio initAudioContextAndMasterMeter] Audio context is running, but master bus components seem to be missing or disposed. Re-initializing master bus.');
                setupMasterBus();
            }
            audioContextInitialized = true;
            console.log('[Audio initAudioContextAndMasterMeter] Audio context initialized and running.');
            return true;
        } else {
            console.warn('[Audio initAudioContextAndMasterMeter] Audio context NOT running after Tone.start(). State:', Tone.context?.state);
            // Notify user if context couldn't start (e.g., browser restrictions)
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
        console.error("[Audio initAudioContextAndMasterMeter] Error during Tone.start() or master bus setup:", error);
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

/**
 * Sets up the master audio bus: InputNode -> Effects Chain -> MasterGain -> MasterMeter -> Destination
 */
function setupMasterBus() {
    console.log('[Audio setupMasterBus] Setting up master bus...');
    if (!Tone.context || Tone.context.state !== 'running') {
        console.warn('[Audio setupMasterBus] Audio context not running. Aborting master bus setup.');
        return;
    }

    // Dispose existing nodes if they exist and are not disposed
    if (masterEffectsBusInputNode && !masterEffectsBusInputNode.disposed) {
        try { masterEffectsBusInputNode.dispose(); } catch(e){ console.warn("[Audio setupMasterBus] Error disposing old master bus input:", e.message); }
    }
    masterEffectsBusInputNode = new Tone.Gain(); // Tracks will connect here
    console.log('[Audio setupMasterBus] Master effects bus input node created.');


    if (masterGainNodeActual && !masterGainNodeActual.disposed) {
        try { masterGainNodeActual.dispose(); } catch(e){ console.warn("[Audio setupMasterBus] Error disposing old master gain node actual:", e.message); }
    }
    const initialMasterVolumeValue = localAppServices.getMasterGainValue ? localAppServices.getMasterGainValue() : Tone.dbToGain(0);
    masterGainNodeActual = new Tone.Gain(initialMasterVolumeValue);
    if (localAppServices.setMasterGainValueState) localAppServices.setMasterGainValueState(masterGainNodeActual.gain.value); // Update state module
    console.log('[Audio setupMasterBus] Master gain node actual created with gain:', masterGainNodeActual.gain.value);


    if (masterMeterNode && !masterMeterNode.disposed) {
        try { masterMeterNode.dispose(); } catch(e) { console.warn("[Audio setupMasterBus] Error disposing old master meter:", e.message); }
    }
    masterMeterNode = new Tone.Meter({ smoothing: 0.8 });
    console.log('[Audio setupMasterBus] Master meter node created.');

    rebuildMasterEffectChain(); // This will handle connections
    console.log('[Audio setupMasterBus] Master bus setup process complete.');
}

/**
 * Rebuilds the master effect chain.
 * Connects: masterEffectsBusInputNode -> [effects] -> masterGainNodeActual -> masterMeterNode -> Destination
 */
export function rebuildMasterEffectChain() {
    console.log('[Audio rebuildMasterEffectChain] Rebuilding master effect chain...');
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

    // Disconnect everything before rebuilding
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
    console.log(`[Audio rebuildMasterEffectChain] Master effects in state: ${masterEffectsState.length}`);

    masterEffectsState.forEach(effectState => {
        let effectNode = activeMasterEffectNodes.get(effectState.id);
        // Recreate effect node if it doesn't exist or is disposed
        if (!effectNode || effectNode.disposed) {
            console.warn(`[Audio rebuildMasterEffectChain] Master effect node for ${effectState.type} (ID: ${effectState.id}) not found or disposed. Attempting recreation.`);
            effectNode = createEffectInstance(effectState.type, effectState.params);
            if (effectNode) {
                activeMasterEffectNodes.set(effectState.id, effectNode);
                console.log(`[Audio rebuildMasterEffectChain] Recreated master effect node for ${effectState.type} (ID: ${effectState.id}).`);
            } else {
                console.error(`[Audio rebuildMasterEffectChain] CRITICAL: Failed to recreate master effect node for ${effectState.type} (ID: ${effectState.id}). Chain will be broken here.`);
                return; // Skip connecting this effect if it failed to create
            }
        }

        // Connect current end of chain to this effect
        if (currentAudioPathEnd && !currentAudioPathEnd.disposed) {
            try {
                console.log(`[Audio rebuildMasterEffectChain] Connecting ${currentAudioPathEnd.toString()} to ${effectNode.toString()} (${effectState.type})`);
                currentAudioPathEnd.connect(effectNode);
                currentAudioPathEnd = effectNode; // This effect is now the end of the chain
            } catch (e) {
                console.error(`[Audio rebuildMasterEffectChain] Error connecting master effect ${effectState.type}:`, e);
                // If connection fails, this effect node might become an orphaned start of a new chain segment
                // or the chain might be broken. For simplicity, we'll just update currentAudioPathEnd.
                currentAudioPathEnd = effectNode; // Try to continue chain from this effect
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
            console.log(`[Audio rebuildMasterEffectChain] Connecting end of master effect chain (${currentAudioPathEnd.toString()}) to masterGainNodeActual.`);
            currentAudioPathEnd.connect(masterGainNodeActual);
        } catch (e) {
            console.error(`[Audio rebuildMasterEffectChain] Error connecting master chain output to masterGainNodeActual:`, e);
        }
    } else {
        console.warn('[Audio rebuildMasterEffectChain] Could not connect master chain output to masterGainNodeActual. Current end:', currentAudioPathEnd?.toString(), 'Master Gain:', masterGainNodeActual?.toString());
         // If there were no effects, currentAudioPathEnd would be masterEffectsBusInputNode.
         // If masterEffectsBusInputNode has no outputs (meaning it wasn't connected to any effects),
         // connect it directly to masterGainNodeActual.
         if (masterEffectsBusInputNode && masterEffectsBusInputNode.numberOfOutputs === 0 && masterGainNodeActual && !masterGainNodeActual.disposed) {
            try {
                masterEffectsBusInputNode.connect(masterGainNodeActual);
                console.log("[Audio rebuildMasterEffectChain] Connected masterEffectsBusInputNode directly to masterGainNodeActual (no effects).");
            } catch (e) {
                console.error("[Audio rebuildMasterEffectChain] Error directly connecting masterEffectsBusInputNode to masterGainNodeActual:", e.message);
            }
        }
    }

    // Connect masterGainNodeActual to destination and meter
    if (masterGainNodeActual && !masterGainNodeActual.disposed) {
        try {
            console.log('[Audio rebuildMasterEffectChain] Connecting masterGainNodeActual to destination and meter.');
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


/**
 * Adds a master effect to the audio chain.
 * @param {string} effectIdInState - The ID of the effect from the state module.
 * @param {string} effectType - The type of effect (e.g., 'Reverb').
 * @param {object} initialParams - Initial parameters for the effect.
 */
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

/**
 * Removes a master effect from the audio chain.
 * @param {string} effectId - The ID of the effect to remove.
 */
export async function removeMasterEffectFromAudio(effectId) {
    const nodeToRemove = activeMasterEffectNodes.get(effectId);
    if (nodeToRemove) {
        if (!nodeToRemove.disposed) {
            try {
                nodeToRemove.dispose();
            } catch (e) {
                console.warn(`[Audio removeMasterEffectFromAudio] Error disposing master effect node for ID ${effectId}:`, e.message);
            }
        }
        activeMasterEffectNodes.delete(effectId);
        rebuildMasterEffectChain();
    } else {
        console.warn(`[Audio removeMasterEffectFromAudio] Node to remove with ID ${effectId} not found in activeMasterEffectNodes.`);
    }
}

/**
 * Updates a parameter of an active master effect.
 * @param {string} effectId - The ID of the effect.
 * @param {string} paramPath - The path to the parameter (e.g., 'delayTime.value' or 'type').
 * @param {*} value - The new value for the parameter.
 */
export function updateMasterEffectParamInAudio(effectId, paramPath, value) {
    const effectNode = activeMasterEffectNodes.get(effectId);
    if (!effectNode || effectNode.disposed) {
        console.warn(`[Audio updateMasterEffectParamInAudio] Master effect node for ID ${effectId} not found or disposed for param update.`);
        return;
    }
    try {
        const keys = paramPath.split('.');
        let targetObject = effectNode;
        for (let i = 0; i < keys.length - 1; i++) {
            if (targetObject && typeof targetObject[keys[i]] !== 'undefined') {
                targetObject = targetObject[keys[i]];
            } else {
                throw new Error(`Path ${keys.slice(0,i+1).join('.')} not found on Tone node.`);
            }
        }
        const finalParamKey = keys[keys.length - 1];
        const paramInstance = targetObject[finalParamKey];

        if (paramInstance && typeof paramInstance.value !== 'undefined') { // It's a Tone.Param or Signal
            if (typeof paramInstance.rampTo === 'function') {
                paramInstance.rampTo(value, 0.02); // Smooth ramp
            } else {
                paramInstance.value = value; // Direct value assignment
            }
        } else if (typeof targetObject[finalParamKey] !== 'undefined') { // Direct property like 'type' or 'oversample'
            targetObject[finalParamKey] = value;
        } else {
            console.warn(`[Audio updateMasterEffectParamInAudio] Parameter ${finalParamKey} not found on target object for effect ID ${effectId}. Target:`, targetObject);
        }
    } catch (err) {
        console.error(`[Audio updateMasterEffectParamInAudio] Error updating param "${paramPath}" for master effect ID ${effectId}:`, err);
    }
}

/**
 * Reorders master effects (primarily a state operation, audio chain is just rebuilt).
 * @param {string} effectIdIgnored - The ID of the effect being moved (not directly used here).
 * @param {number} newIndexIgnored - The new index of the effect (not directly used here).
 */
export function reorderMasterEffectInAudio(effectIdIgnored, newIndexIgnored) {
    // The actual reordering happens in state; this just rebuilds the audio chain
    rebuildMasterEffectChain();
}


/**
 * Updates meter UI elements based on current audio levels.
 * @param {HTMLElement} globalMasterMeterBar - The master meter bar in global controls.
 * @param {HTMLElement} mixerMasterMeterBar - The master meter bar in the mixer.
 * @param {Array<Track>} tracks - Array of track instances.
 */
export function updateMeters(globalMasterMeterBar, mixerMasterMeterBar, tracks) {
    if (!Tone.context || Tone.context.state !== 'running' || !audioContextInitialized) return;

    // Update Master Meter
    if (masterMeterNode && typeof masterMeterNode.getValue === 'function' && !masterMeterNode.disposed) {
        const masterLevelValue = masterMeterNode.getValue();
        // Ensure masterLevelValue is a number, taking the first channel if it's an array (stereo)
        const numericMasterLevel = Array.isArray(masterLevelValue) ? masterLevelValue[0] : masterLevelValue;
        if (typeof numericMasterLevel === 'number' && isFinite(numericMasterLevel)) {
            const level = Tone.dbToGain(numericMasterLevel);
            const isClipping = numericMasterLevel > -0.1; // Clipping threshold

            if (globalMasterMeterBar) {
                globalMasterMeterBar.style.width = `${Math.min(100, Math.max(0, level * 100))}%`;
                globalMasterMeterBar.classList.toggle('clipping', isClipping);
            }
            if (mixerMasterMeterBar) {
                mixerMasterMeterBar.style.width = `${Math.min(100, Math.max(0, level * 100))}%`;
                mixerMasterMeterBar.classList.toggle('clipping', isClipping);
            }
        } else {
            // console.warn("[Audio updateMeters] Master meter returned invalid value:", masterLevelValue);
        }
    } else if (masterMeterNode && masterMeterNode.disposed) {
        console.warn("[Audio updateMeters] Master meter node is disposed. Attempting to re-initialize master bus.");
        setupMasterBus(); // Attempt to re-initialize if disposed
    }


    // Update Track Meters
    (tracks || []).forEach(track => {
        if (track && track.trackMeter && typeof track.trackMeter.getValue === 'function' && !track.trackMeter.disposed) {
            const meterValue = track.trackMeter.getValue();
            // Handle potential stereo meter values
            const numericMeterValue = Array.isArray(meterValue) ? meterValue[0] : meterValue;

            if (typeof numericMeterValue === 'number' && isFinite(numericMeterValue)) {
                const level = Tone.dbToGain(numericMeterValue);
                const isClipping = numericMeterValue > -0.1; // Clipping threshold

                if (localAppServices.updateTrackMeterUI) {
                    localAppServices.updateTrackMeterUI(track.id, level, isClipping);
                }
            } else {
                // console.warn(`[Audio updateMeters] Track ${track.id} meter returned invalid value:`, meterValue);
            }
        }
    });
}

/**
 * Plays a preview of a sampler slice.
 * @param {number} trackId - The ID of the Sampler track.
 * @param {number} sliceIndex - The index of the slice to preview.
 * @param {number} [velocity=0.7] - The velocity to play the slice at.
 * @param {number} [additionalPitchShiftInSemitones=0] - Additional pitch shift for preview.
 */
export async function playSlicePreview(trackId, sliceIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0) {
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        if (localAppServices.showNotification) localAppServices.showNotification("Audio not ready for preview.", 2000);
        return;
    }

    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;

    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded || !track.slices[sliceIndex]) {
        console.warn(`[Audio playSlicePreview] Conditions not met for playing slice preview for track ${trackId}, slice ${sliceIndex}`);
        return;
    }
    const sliceData = track.slices[sliceIndex];
    if (!sliceData || sliceData.duration <= 0) {
        console.warn(`[Audio playSlicePreview] Invalid slice data or zero duration for track ${trackId}, slice ${sliceIndex}.`);
        return;
    }

    const time = Tone.now();
    const totalPitchShift = (sliceData.pitchShift || 0) + additionalPitchShiftInSemitones;
    const playbackRate = Math.pow(2, totalPitchShift / 12);
    let playDuration = sliceData.duration / playbackRate;
    if (sliceData.loop) playDuration = Math.min(playDuration, 2); // Limit looped preview duration

    // Determine the correct destination node (start of effects chain or track's gain node)
    const actualDestination = (track.activeEffects.length > 0 && track.activeEffects[0].toneNode && !track.activeEffects[0].toneNode.disposed)
        ? track.activeEffects[0].toneNode
        : (track.gainNode && !track.gainNode.disposed ? track.gainNode : getMasterEffectsBusInputNode()); // Fallback to master bus if gainNode is bad

    if (!actualDestination || actualDestination.disposed) {
        console.error(`[Audio playSlicePreview] No valid destination node for track ${trackId}.`);
        return;
    }

    if (!track.slicerIsPolyphonic) {
        // Ensure mono slicer nodes are set up and connected
        if (!track.slicerMonoPlayer || track.slicerMonoPlayer.disposed) {
            track.setupSlicerMonoNodes(); // This also assigns track.audioBuffer to player
            if (!track.slicerMonoPlayer) { // Check again after setup
                console.error(`[Audio playSlicePreview] Mono slicer player still not set up for track ${trackId} after attempt.`);
                return;
            }
        }
        const player = track.slicerMonoPlayer;
        const env = track.slicerMonoEnvelope;
        const gain = track.slicerMonoGain;

        // Ensure correct connection (monoGain should already be connected via rebuildEffectChain if it's the source)
        // If monoGain is the source, it's already in the chain. If effects exist, it's before them.
        // This preview should respect the track's effect chain.
        // The `actualDestination` logic above handles this correctly if `rebuildEffectChain` is sound.
        // For mono, slicerMonoGain is the output of the internal mono chain.
        if (gain && !gain.disposed && actualDestination && !actualDestination.disposed) {
            try { gain.disconnect(); } catch(e) { /* ignore if not connected */ }
            gain.connect(actualDestination); // Connect mono slicer's gain to the track's output/effect chain
        }


        if (player.state === 'started') player.stop(time);
        if (env && env.getValueAtTime(time) > 0.001) env.triggerRelease(time); // Release previous envelope if active

        if (track.audioBuffer && track.audioBuffer.loaded) player.buffer = track.audioBuffer; else return; // No buffer
        if (env) env.set(sliceData.envelope);
        if (gain) gain.gain.value = Tone.dbToGain(-6) * sliceData.volume * velocity; // Apply slight attenuation for previews
        player.playbackRate = playbackRate;
        player.reverse = sliceData.reverse || false;
        player.loop = sliceData.loop || false;
        player.loopStart = sliceData.offset;
        player.loopEnd = sliceData.offset + sliceData.duration;

        player.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
        if (env) env.triggerAttack(time);
        if (!sliceData.loop && env) {
            const releaseTime = time + playDuration - (sliceData.envelope.release || 0.1);
            env.triggerRelease(Math.max(time, releaseTime));
        }
    } else { // Polyphonic: Use a temporary player from the pool
        const voiceUnit = track._getVoiceFromSlicerPool();
        if (voiceUnit) {
            const { player, envelope, gain } = voiceUnit;
            player.buffer = track.audioBuffer;
            envelope.set(sliceData.envelope);
            gain.gain.value = Tone.dbToGain(-6) * sliceData.volume * velocity; // Attenuation

            player.playbackRate = playbackRate;
            player.reverse = sliceData.reverse || false;
            player.loop = sliceData.loop || false;
            player.loopStart = sliceData.offset;
            player.loopEnd = sliceData.offset + sliceData.duration;

            player.chain(envelope, gain, actualDestination); // Connect to track's output/effect chain

            player.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
            envelope.triggerAttack(time);
            if (!sliceData.loop) envelope.triggerRelease(time + playDuration * 0.95);

            const releaseDuration = sliceData.envelope?.release || 0.2;
            const totalSoundDuration = playDuration + releaseDuration + 0.5; // Generous buffer
            Tone.Transport.scheduleOnce(() => {
                track._returnVoiceToSlicerPool(voiceUnit);
            }, time + totalSoundDuration);
        } else {
            console.warn(`[Audio playSlicePreview] No available voice in pool for polyphonic preview on track ${trackId}.`);
        }
    }
}

/**
 * Plays a preview of a drum sampler pad.
 * @param {number} trackId - The ID of the DrumSampler track.
 * @param {number} padIndex - The index of the pad to preview.
 * @param {number} [velocity=0.7] - The velocity to play the pad at.
 * @param {number} [additionalPitchShiftInSemitones=0] - Additional pitch shift.
 */
export async function playDrumSamplerPadPreview(trackId, padIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0) {
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        if (localAppServices.showNotification) localAppServices.showNotification("Audio not ready for preview.", 2000);
        return;
    }

    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;

    if (!track || track.type !== 'DrumSampler' || !track.drumPadPlayers[padIndex] || track.drumPadPlayers[padIndex].disposed || !track.drumPadPlayers[padIndex].loaded) {
        console.warn(`[Audio playDrumSamplerPadPreview] Conditions not met for playing drum pad preview for track ${trackId}, pad ${padIndex}. Player loaded: ${track?.drumPadPlayers[padIndex]?.loaded}`);
        if (localAppServices.showNotification && track && track.type === 'DrumSampler' && (!track.drumPadPlayers[padIndex] || !track.drumPadPlayers[padIndex].loaded) ) {
            localAppServices.showNotification(`Sample for Pad ${padIndex + 1} not loaded or player error.`, 2000);
        }
        return;
    }
    const player = track.drumPadPlayers[padIndex];
    const padData = track.drumSamplerPads[padIndex];

    if (!padData) {
        console.error(`[Audio playDrumSamplerPadPreview] No padData for track ${trackId}, pad ${padIndex}.`);
        return;
    }

    // Determine destination: start of effects or track's gain node
    const actualDestination = (track.activeEffects.length > 0 && track.activeEffects[0].toneNode && !track.activeEffects[0].toneNode.disposed)
        ? track.activeEffects[0].toneNode
        : (track.gainNode && !track.gainNode.disposed ? track.gainNode : getMasterEffectsBusInputNode());

    if (!actualDestination || actualDestination.disposed) {
        console.error(`[Audio playDrumSamplerPadPreview] No valid destination node for track ${trackId}, pad ${padIndex}.`);
        return;
    }

    try {
        player.disconnect(); // Disconnect from any previous connections
        player.connect(actualDestination); // Connect to the determined destination
    } catch (e) {
        console.warn(`[Audio playDrumSamplerPadPreview] Error reconnecting drum pad player for track ${trackId}, pad ${padIndex}:`, e.message);
        return; // Don't proceed if connection fails
    }

    player.volume.value = Tone.gainToDb(padData.volume * velocity * 0.7); // Apply some headroom

    // Auto-Stretch Logic for Preview
    if (padData.autoStretchEnabled && padData.stretchOriginalBPM > 0 && padData.stretchBeats > 0 && player.buffer) {
        const currentProjectTempo = Tone.Transport.bpm.value;
        const sampleBufferDuration = player.buffer.duration; // Actual duration of the loaded sample
        
        const targetDurationAtCurrentTempo = (60 / currentProjectTempo) * padData.stretchBeats;

        if (targetDurationAtCurrentTempo > 1e-6 && sampleBufferDuration > 1e-6) {
             player.playbackRate = sampleBufferDuration / targetDurationAtCurrentTempo;
             console.log(`[Audio Preview Stretch] Pad ${padIndex}: OrigBPM ${padData.stretchOriginalBPM}, Beats ${padData.stretchBeats}, ProjTempo ${currentProjectTempo}, SampleDur ${sampleBufferDuration.toFixed(3)}, TargetDur ${targetDurationAtCurrentTempo.toFixed(3)}, Rate ${player.playbackRate.value.toFixed(3)}`);
        } else {
            player.playbackRate = 1; // Fallback
        }
    } else {
        // Standard pitch shift if auto-stretch is off or params invalid
        const totalPadPitchShift = (padData.pitchShift || 0) + additionalPitchShiftInSemitones;
        player.playbackRate = Math.pow(2, totalPadPitchShift / 12);
    }

    player.start(Tone.now());
}


/**
 * Infers MIME type from filename extension.
 * @param {string} filename - The filename.
 * @returns {string} The inferred MIME type or a default.
 */
export function getMimeTypeFromFilename(filename) {
    if (!filename || typeof filename !== 'string') return "application/octet-stream"; // Default MIME type
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.endsWith(".wav")) return "audio/wav";
    if (lowerFilename.endsWith(".mp3")) return "audio/mpeg";
    if (lowerFilename.endsWith(".ogg")) return "audio/ogg";
    if (lowerFilename.endsWith(".flac")) return "audio/flac";
    if (lowerFilename.endsWith(".aac")) return "audio/aac";
    if (lowerFilename.endsWith(".m4a")) return "audio/mp4"; // Often audio/mp4 or audio/x-m4a
    // Add more types if needed
    return "application/octet-stream"; // Fallback
}

/**
 * Common logic for loading a sample file into a track (Sampler, InstrumentSampler, DrumSampler pad).
 * @param {File} fileObject - The File object to load.
 * @param {string} sourceName - The original name of the file.
 * @param {Track} track - The target track instance.
 * @param {string} trackTypeHint - 'Sampler', 'InstrumentSampler', or 'DrumSampler'.
 * @param {number|null} [padIndex=null] - The pad index if trackTypeHint is 'DrumSampler'.
 */
async function commonLoadSampleLogic(fileObject, sourceName, track, trackTypeHint, padIndex = null) {
    const isReconstructing = localAppServices.getIsReconstructingDAW ? localAppServices.getIsReconstructingDAW() : false;

    // Capture undo state only if it's a direct user action and not during reconstruction
    if (localAppServices.captureStateForUndo && !isReconstructing) {
        const targetName = trackTypeHint === 'DrumSampler' && padIndex !== null ?
            `Pad ${padIndex + 1} on ${track.name}` :
            track.name;
        localAppServices.captureStateForUndo(`Load ${sourceName} to ${targetName}`);
    }

    let objectURLForTone = null;

    try {
        objectURLForTone = URL.createObjectURL(fileObject);

        // Create a unique DB key
        const dbKeySuffix = trackTypeHint === 'DrumSampler' && padIndex !== null ?
            `drumPad-${padIndex}-${sourceName.replace(/[^a-zA-Z0-9-_.]/g, '_')}` :
            `${trackTypeHint}-${sourceName.replace(/[^a-zA-Z0-9-_.]/g, '_')}`;
        const dbKey = `track-${track.id}-${dbKeySuffix}-${fileObject.size}-${fileObject.lastModified || Date.now()}`; // Add timestamp if lastModified is 0
        await storeAudio(dbKey, fileObject); // Store in IndexedDB
        console.log(`[Audio commonLoadSampleLogic] Stored in DB with key: ${dbKey}`);

        // Load into Tone.Buffer
        const newAudioBuffer = await new Tone.Buffer().load(objectURLForTone);

        // Update track state based on type
        if (trackTypeHint === 'Sampler') {
            if (track.audioBuffer && !track.audioBuffer.disposed) track.audioBuffer.dispose();
            track.disposeSlicerMonoNodes(); // Important for mono/poly switching
            track.audioBuffer = newAudioBuffer;
            track.samplerAudioData = { fileName: sourceName, dbKey: dbKey, status: 'loaded' };
            // Re-initialize voice pool or mono nodes based on current polyphony setting and new buffer
            if (track.slicerIsPolyphonic) {
                track._initializeSlicerVoicePool(); // Re-init pool with new buffer implicitly used by players
                track._slicerVoicePool.forEach(voice => {
                    if (voice.player && !voice.player.disposed) voice.player.buffer = track.audioBuffer;
                });
            } else {
                track.setupSlicerMonoNodes(); // This will use the new track.audioBuffer
            }
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
                audioBuffer: newAudioBuffer, // Store Tone.Buffer
                originalFileName: sourceName,
                dbKey: dbKey,
                status: 'loaded',
                // Reset loop points to new buffer duration if not already set or if they exceed new duration
                loopStart: Math.min(track.instrumentSamplerSettings.loopStart || 0, newAudioBuffer.duration),
                loopEnd: Math.min(track.instrumentSamplerSettings.loopEnd || newAudioBuffer.duration, newAudioBuffer.duration)
            };
            if (track.instrumentSamplerSettings.loopEnd === 0 && newAudioBuffer.duration > 0) { // Default loop end to full duration
                track.instrumentSamplerSettings.loopEnd = newAudioBuffer.duration;
            }
            track.setupToneSampler(); // Recreate Tone.Sampler with new buffer
            if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'instrumentSamplerLoaded');

        } else if (trackTypeHint === 'DrumSampler' && padIndex !== null) {
            const padData = track.drumSamplerPads[padIndex];
            if (padData) {
                if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
                if (track.drumPadPlayers[padIndex] && !track.drumPadPlayers[padIndex].disposed) track.drumPadPlayers[padIndex].dispose();

                padData.audioBuffer = newAudioBuffer; // Store Tone.Buffer
                padData.originalFileName = sourceName;
                padData.dbKey = dbKey;
                padData.status = 'loaded';
                track.drumPadPlayers[padIndex] = new Tone.Player(newAudioBuffer); // Create new player
                // Connection of drumPadPlayer happens in rebuildEffectChain or play logic
            } else {
                console.error(`[Audio commonLoadSampleLogic] Pad data not found for index ${padIndex} on track ${track.id}`);
                throw new Error(`Pad data not found for index ${padIndex}.`);
            }
            if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'drumPadLoaded', padIndex);
        }

        track.rebuildEffectChain(); // Ensure chain is up-to-date with new/changed sources
        if (localAppServices.showNotification) {
            localAppServices.showNotification(`Sample "${sourceName}" loaded for ${track.name}${trackTypeHint === 'DrumSampler' && padIndex !== null ? ` (Pad ${padIndex+1})` : ''}.`, 2000);
        }

    } catch (error) {
        console.error(`[Audio commonLoadSampleLogic] Error loading sample "${sourceName}" for track ${track.id} (${trackTypeHint}):`, error);
        if (localAppServices.showNotification) {
            localAppServices.showNotification(`Error loading sample "${sourceName.substring(0,30)}": ${error.message || 'Unknown error.'}`, 4000);
        }
        // Update status to error on track's data object
        if (trackTypeHint === 'Sampler') if(track.samplerAudioData) track.samplerAudioData.status = 'error';
        else if (trackTypeHint === 'InstrumentSampler') if(track.instrumentSamplerSettings) track.instrumentSamplerSettings.status = 'error';
        else if (trackTypeHint === 'DrumSampler' && padIndex !== null && track.drumSamplerPads[padIndex]) track.drumSamplerPads[padIndex].status = 'error';

        if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sampleLoadError', padIndex);
    } finally {
        if (objectURLForTone) URL.revokeObjectURL(objectURLForTone);
    }
}

/**
 * Loads a sample file for Sampler or InstrumentSampler tracks.
 * @param {Event|string|File|Blob} eventOrUrl - File input event, URL string, File object, or Blob.
 * @param {number} trackId - The ID of the target track.
 * @param {string} trackTypeHint - 'Sampler' or 'InstrumentSampler'.
 * @param {string|null} [fileNameForUrl=null] - Filename to use if eventOrUrl is a URL.
 */
export async function loadSampleFile(eventOrUrl, trackId, trackTypeHint, fileNameForUrl = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) {
        if (localAppServices.showNotification) localAppServices.showNotification(`Track ID ${trackId} not found.`, 3000);
        return;
    }
    if (trackTypeHint !== 'Sampler' && trackTypeHint !== 'InstrumentSampler') {
        if (localAppServices.showNotification) localAppServices.showNotification(`Cannot load general sample into ${trackTypeHint} track. Use specific loader.`, 3000);
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
    const isBlobEvent = eventOrUrl instanceof Blob && !(eventOrUrl instanceof File); // Check if it's a Blob but not a File

    if (isUrlSource) {
        sourceName = fileNameForUrl || eventOrUrl.split('/').pop().split('?')[0] || "loaded_sample_from_url";
        try {
            const response = await fetch(eventOrUrl);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status} for "${sourceName}"`);
            providedBlob = await response.blob();
        } catch (e) {
            console.error(`[Audio loadSampleFile] Error fetching sample from URL "${eventOrUrl}":`, e);
            if (localAppServices.showNotification) localAppServices.showNotification(`Error fetching sample "${sourceName.substring(0,30)}": ${e.message}`, 3000);
            return;
        }
    } else if (eventOrUrl && eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) { // File input event
        providedBlob = eventOrUrl.target.files[0];
        sourceName = providedBlob.name;
    } else if (isDirectFile) { // Direct File object
        providedBlob = eventOrUrl;
        sourceName = providedBlob.name;
    } else if (isBlobEvent) { // Direct Blob object (not a File)
        providedBlob = eventOrUrl;
        sourceName = fileNameForUrl || `loaded_blob_${Date.now()}.wav`; // Assign a generic name if none provided
    } else {
        if (localAppServices.showNotification) localAppServices.showNotification("No file selected or invalid source.", 3000);
        return;
    }

    if (!providedBlob) {
        if (localAppServices.showNotification) localAppServices.showNotification("Could not obtain file data.", 3000);
        return;
    }

    // Ensure it's a File object for consistent handling downstream (e.g., for name, lastModified)
    const inferredType = getMimeTypeFromFilename(sourceName);
    const explicitType = providedBlob.type || inferredType || 'application/octet-stream';
    const fileObject = new File([providedBlob], sourceName, { type: explicitType });

    if (!fileObject.type.startsWith('audio/') && fileObject.type !== "application/octet-stream") { // Allow octet-stream as a fallback
        if (localAppServices.showNotification) localAppServices.showNotification(`Invalid audio file type: "${fileObject.type}". Please use common audio formats.`, 3000);
        return;
    }
    if (fileObject.size === 0) {
        if (localAppServices.showNotification) localAppServices.showNotification(`Audio file "${sourceName}" is empty.`, 3000);
        return;
    }
    console.log(`[Audio loadSampleFile] Attempting to load "${sourceName}" (Type: ${fileObject.type}, Size: ${fileObject.size}) for track ${trackId} (${trackTypeHint})`);
    await commonLoadSampleLogic(fileObject, sourceName, track, trackTypeHint);
}


/**
 * Loads a sample file for a specific DrumSampler pad.
 * @param {Event|string|File|Blob} eventOrUrl - File input event, URL string, File object, or Blob.
 * @param {number} trackId - The ID of the DrumSampler track.
 * @param {number} padIndex - The index of the pad to load the sample into.
 * @param {string|null} [fileNameForUrl=null] - Filename to use if eventOrUrl is a URL.
 */
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
    console.log(`[Audio loadDrumSamplerPadFile] Attempting to load "${sourceName}" (Type: ${fileObject.type}, Size: ${fileObject.size}) for track ${trackId}, pad ${padIndex}`);
    await commonLoadSampleLogic(fileObject, sourceName, track, 'DrumSampler', padIndex);
}

/**
 * Loads a sound from the sound browser to a target track/pad/slice.
 * @param {object} soundData - Data about the sound from the browser.
 * @param {number} targetTrackId - ID of the target track.
 * @param {string} targetTrackTypeIgnored - Type of the target track (used by caller, ignored here).
 * @param {number|null} [targetPadOrSliceIndex=null] - Index for drum pad or sampler slice.
 */
export async function loadSoundFromBrowserToTarget(soundData, targetTrackId, targetTrackTypeIgnored, targetPadOrSliceIndex = null) {
    const trackIdNum = parseInt(targetTrackId); // Ensure it's a number
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
        // Prefer blob's type if it's specific, otherwise use inferred, then fallback
        const finalMimeType = fileBlobFromZip.type && fileBlobFromZip.type !== "application/octet-stream" ? fileBlobFromZip.type : inferredMimeType;
        const blobToLoad = new File([fileBlobFromZip], fileName, { type: finalMimeType });
        console.log(`[Audio loadSoundFromBrowserToTarget] Blob created from ZIP: ${fileName}, Type: ${blobToLoad.type}, Size: ${blobToLoad.size}`);


        if (track.type === 'DrumSampler') {
            let actualPadIndex = targetPadOrSliceIndex;
            // If no specific pad index, try to find the first empty one or use selected
            if (typeof actualPadIndex !== 'number' || isNaN(actualPadIndex) || actualPadIndex < 0 || actualPadIndex >= Constants.numDrumSamplerPads) {
                actualPadIndex = track.drumSamplerPads.findIndex(p => !p.dbKey && !p.originalFileName); // Find first truly empty
                if (actualPadIndex === -1) actualPadIndex = track.selectedDrumPadForEdit; // Fallback to selected
                if (typeof actualPadIndex !== 'number' || actualPadIndex < 0) actualPadIndex = 0; // Final fallback
                console.log(`[Audio loadSoundFromBrowserToTarget] Adjusted pad index for DrumSampler to: ${actualPadIndex}`);
            }
            await commonLoadSampleLogic(blobToLoad, fileName, track, 'DrumSampler', actualPadIndex);
        } else { // Sampler or InstrumentSampler
            await commonLoadSampleLogic(blobToLoad, fileName, track, track.type, null);
        }
    } catch (error) {
        console.error(`[Audio loadSoundFromBrowserToTarget] Error loading sound "${fileName}" from browser:`, error);
        if (localAppServices.showNotification) {
            localAppServices.showNotification(`Error loading "${fileName.substring(0,30)}": ${error.message}`, 4000);
        }
        if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sampleLoadError', targetPadOrSliceIndex);
    }
}

/**
 * Fetches and processes a sound library from a ZIP URL.
 * @param {string} libraryName - The name of the library.
 * @param {string} zipUrl - The URL of the ZIP file.
 * @param {boolean} [isAutofetch=false] - True if called during initial auto-load.
 */
export async function fetchSoundLibrary(libraryName, zipUrl, isAutofetch = false) {
    // Ensure appServices and its methods are available
    const getLoadedZips = localAppServices.getLoadedZipFiles;
    const setLoadedZips = localAppServices.setLoadedZipFilesState;
    const getSoundTrees = localAppServices.getSoundLibraryFileTrees;
    const setSoundTrees = localAppServices.setSoundLibraryFileTreesState;
    const updateBrowserUI = localAppServices.updateSoundBrowserDisplayForLibrary;
    const showUINotification = localAppServices.showNotification;

    if (!getLoadedZips || !setLoadedZips || !getSoundTrees || !setSoundTrees || !updateBrowserUI || !showUINotification) {
        console.error("[Audio fetchSoundLibrary] Critical appServices missing. Aborting library load for:", libraryName);
        if (showUINotification) showUINotification(`Internal error: Cannot load library ${libraryName}. Required services missing.`, 5000);
        return;
    }

    const initialLoadedZips = getLoadedZips() || {};
    console.log(`[Audio fetchSoundLibrary DEBUG] Initial loadedZips object for ${libraryName} (Autofetch: ${isAutofetch}):`,
        Object.keys(initialLoadedZips),
        `Value for ${libraryName}:`, initialLoadedZips[libraryName],
        `Is JSZip: ${initialLoadedZips[libraryName] instanceof JSZip}`
    );
    const loadedZips = initialLoadedZips; // Use the state-retrieved value

    const soundTrees = getSoundTrees() || {};

    console.log(`[Audio fetchSoundLibrary ENTRY] Library: ${libraryName}, URL: ${zipUrl}, Autofetch: ${isAutofetch}.`);
    if (loadedZips && typeof loadedZips === 'object') {
        console.log(`[Audio fetchSoundLibrary ENTRY] Existing loadedZips keys:`, Object.keys(loadedZips), `Status for ${libraryName}:`, loadedZips[libraryName]);
    } else {
        console.warn(`[Audio fetchSoundLibrary ENTRY] loadedZips is undefined, null, or not an object.`);
    }
    if (soundTrees && typeof soundTrees === 'object') {
        console.log(`[Audio fetchSoundLibrary ENTRY] Existing soundTrees keys:`, Object.keys(soundTrees));
    } else {
        console.warn(`[Audio fetchSoundLibrary ENTRY] soundTrees is undefined, null, or not an object.`);
    }


    // Check if already loaded or loading
    if (loadedZips && loadedZips[libraryName] && loadedZips[libraryName] !== "loading") {
        console.log(`[Audio fetchSoundLibrary INFO] ${libraryName} already loaded or processed. Status:`, loadedZips[libraryName] instanceof JSZip ? 'JSZip Instance' : loadedZips[libraryName]);
        if (!isAutofetch && updateBrowserUI) {
            updateBrowserUI(libraryName, false, false); // Update UI to show it's loaded
        }
        return;
    }
    if (loadedZips && loadedZips[libraryName] === "loading") {
        console.log(`[Audio fetchSoundLibrary INFO] ${libraryName} is currently being loaded by another call. Skipping this call.`);
        return;
    }

    // Update UI to show loading state if not autofetching
    if (!isAutofetch && updateBrowserUI) {
        updateBrowserUI(libraryName, true, false); // isLoading = true
    }

    try {
        console.log(`[Audio fetchSoundLibrary SET_LOADING_STATE] Setting ${libraryName} to "loading" state.`);
        const newLoadedZips = { ...(getLoadedZips() || {}) }; // Get fresh copy before modifying
        newLoadedZips[libraryName] = "loading";
        setLoadedZips(newLoadedZips);


        console.log(`[Audio fetchSoundLibrary HTTP_REQUEST] Fetching ${zipUrl} for ${libraryName}`);
        const response = await fetch(zipUrl);
        console.log(`[Audio fetchSoundLibrary HTTP_RESPONSE] Response for ${libraryName} - Status: ${response.status}, OK: ${response.ok}`);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status} fetching ZIP for ${libraryName} from ${zipUrl}`);
        }
        const zipData = await response.arrayBuffer();
        console.log(`[Audio fetchSoundLibrary ZIP_DATA_RECEIVED] Received arrayBuffer for ${libraryName}, length: ${zipData.byteLength}`);

        if (typeof JSZip === 'undefined') {
            console.error("[Audio fetchSoundLibrary JSZIP_ERROR] JSZip library not found. Cannot process library.");
            throw new Error("JSZip library not available for processing sound libraries.");
        }

        const jszip = new JSZip();
        console.log(`[Audio fetchSoundLibrary JSZIP_LOAD_ASYNC_START] Starting jszip.loadAsync for ${libraryName}`);
        const loadedZipInstance = await jszip.loadAsync(zipData);
        console.log(`[Audio fetchSoundLibrary JSZIP_LOAD_ASYNC_SUCCESS] JSZip successfully loaded ${libraryName}. Num files in zip: ${Object.keys(loadedZipInstance.files).length}`);

        // Update state with the loaded JSZip instance
        const latestLoadedZipsAfterLoad = { ...(getLoadedZips() || {}) };
        latestLoadedZipsAfterLoad[libraryName] = loadedZipInstance; // Store the actual JSZip instance

        console.log(`[Audio Fetch DEBUG] About to set state for ${libraryName} (loadedZips).`);
        console.log(`[Audio Fetch DEBUG] setLoadedZips exists:`, !!setLoadedZips);
        if (setLoadedZips) {
            console.log(`[Audio Fetch DEBUG] Calling setLoadedZips for ${libraryName} (loadedZips) with keys:`, Object.keys(latestLoadedZipsAfterLoad));
            setLoadedZips(latestLoadedZipsAfterLoad);
        } else {
             console.error(`[Audio Fetch ERROR] setLoadedZips is UNDEFINED for ${libraryName} (loadedZips)`);
        }


        // Build file tree
        const fileTree = {};
        let audioFileCount = 0;
        console.log(`[Audio fetchSoundLibrary PARSE_ZIP_START] Parsing files for ${libraryName}`);
        loadedZipInstance.forEach((relativePath, zipEntry) => {
            // Skip directories, macOS resource forks, hidden files/folders
            if (zipEntry.dir || relativePath.startsWith("__MACOSX") || relativePath.includes("/.") || relativePath.startsWith(".")) {
                return;
            }
            const pathParts = relativePath.split('/').filter(p => p); // Filter out empty parts (e.g., from trailing slash)
            if (pathParts.length === 0) return; // Skip if path is effectively empty

            let currentLevel = fileTree;
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                if (i === pathParts.length - 1) { // It's a file
                    // Check if it's an audio file by extension
                    if (part.match(/\.(wav|mp3|ogg|flac|aac|m4a)$/i)) {
                        currentLevel[part] = { type: 'file', entry: zipEntry, fullPath: relativePath };
                        audioFileCount++;
                    }
                } else { // It's a directory part
                    if (!currentLevel[part] || currentLevel[part].type !== 'folder') {
                        currentLevel[part] = { type: 'folder', children: {} };
                    }
                    currentLevel = currentLevel[part].children;
                }
            }
        });
        console.log(`[Audio fetchSoundLibrary PARSE_ZIP_COMPLETE] Parsed ${audioFileCount} audio files for ${libraryName}. FileTree keys:`, Object.keys(fileTree));

        // Update state with the new file tree
        const latestSoundTrees = { ...(getSoundTrees() || {}) };
        latestSoundTrees[libraryName] = fileTree;

        console.log(`[Audio Fetch DEBUG] About to set state for ${libraryName} (soundTrees).`);
        console.log(`[Audio Fetch DEBUG] setSoundTrees exists:`, !!setSoundTrees);
        if (setSoundTrees) {
            console.log(`[Audio Fetch DEBUG] Calling setSoundTrees for ${libraryName} (soundTrees) with keys:`, Object.keys(latestSoundTrees));
             if(latestSoundTrees[libraryName]) {
                console.log(`[Audio Fetch DEBUG] Tree for ${libraryName} being set has children count:`, Object.keys(latestSoundTrees[libraryName]).length);
            }
            setSoundTrees(latestSoundTrees);
        } else {
             console.error(`[Audio Fetch ERROR] setSoundTrees is UNDEFINED for ${libraryName} (soundTrees)`);
        }

        // Verify state after setting
        const checkZipsAfterSet = getLoadedZips() || {};
        console.log(`[Audio Fetch DEBUG] State for loadedZips after set for ${libraryName}. Keys:`, Object.keys(checkZipsAfterSet), `Has ${libraryName}:`, !!checkZipsAfterSet[libraryName]);
        const checkTreesAfterSet = getSoundTrees() || {};
        console.log(`[Audio Fetch DEBUG] State for soundTrees after set for ${libraryName}. Keys:`, Object.keys(checkTreesAfterSet), `Has ${libraryName}:`, !!checkTreesAfterSet[libraryName]);
        if (checkTreesAfterSet[libraryName]) {
             console.log(`[Audio Fetch DEBUG] Verified tree for ${libraryName} in state has children count:`, Object.keys(checkTreesAfterSet[libraryName]).length);
        }


        console.log(`[Audio fetchSoundLibrary SUCCESS] Successfully loaded and processed library: ${libraryName}.`);
        if (updateBrowserUI) {
            updateBrowserUI(libraryName, false, false); // Loaded, no error
        }

    } catch (error) {
        console.error(`[Audio fetchSoundLibrary CATCH_ERROR] Error fetching/processing library ${libraryName} from ${zipUrl}:`, error);

        // Clear the 'loading' state or erroneous entry
        const errorLoadedZips = { ...(getLoadedZips() || {}) };
        delete errorLoadedZips[libraryName]; // Remove or set to an error state if preferred
        if (setLoadedZips) setLoadedZips(errorLoadedZips);

        const errorSoundTrees = { ...(getSoundTrees() || {}) };
        delete errorSoundTrees[libraryName];
        if (setSoundTrees) setSoundTrees(errorSoundTrees);

        console.warn(`[Audio fetchSoundLibrary ERROR_STATE_CLEARED] State for ${libraryName} cleared due to error.`);
        if (!isAutofetch && showUINotification) {
            showUINotification(`Error loading library ${libraryName}: ${error.message}`, 4000);
        }
        if (updateBrowserUI) {
             updateBrowserUI(libraryName, false, true); // Not loading, has error
        }
    }
}

/**
 * Auto-slices a sample in a Sampler track.
 * @param {number} trackId - The ID of the Sampler track.
 * @param {number} [numSlicesToCreate=Constants.numSlices] - Number of slices to create.
 */
export function autoSliceSample(trackId, numSlicesToCreate = Constants.numSlices) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded) {
        if (localAppServices.showNotification) localAppServices.showNotification("Cannot auto-slice: Load sample first or ensure sample is valid.", 3000);
        return;
    }
    const duration = track.audioBuffer.duration;
    if (duration <= 0) {
        if (localAppServices.showNotification) localAppServices.showNotification("Cannot auto-slice: Sample has no duration.", 3000);
        return;
    }

    track.slices = []; // Reset slices
    const sliceDuration = duration / numSlicesToCreate;
    for (let i = 0; i < numSlicesToCreate; i++) {
        track.slices.push({
            offset: i * sliceDuration,
            duration: sliceDuration,
            userDefined: false, // Mark as not user-defined initially
            volume: 0.7,
            pitchShift: 0,
            loop: false,
            reverse: false,
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 0.2 } // Default envelope
        });
    }
    track.selectedSliceForEdit = 0; // Select the first slice
    track.recreateToneSequence(true); // Update sequencer if it uses this track

    // Update UI
    if (localAppServices.updateTrackUI) {
        localAppServices.updateTrackUI(track.id, 'sampleSliced'); // Custom reason for UI to update sampler view
    }
    if (localAppServices.showNotification) localAppServices.showNotification(`Sample auto-sliced into ${numSlicesToCreate} parts.`, 2000);
}

/**
 * Clears all active master effect Tone.js nodes and rebuilds the chain.
 */
export function clearAllMasterEffectNodes() {
    activeMasterEffectNodes.forEach((node, id) => {
        if (node && !node.disposed) {
            try {
                node.dispose();
            } catch (e) {
                console.warn(`[Audio clearAllMasterEffectNodes] Error disposing master effect node ID ${id}:`, e.message);
            }
        }
    });
    activeMasterEffectNodes.clear();
    console.log("[Audio clearAllMasterEffectNodes] All active master effect nodes cleared and disposed.");
    rebuildMasterEffectChain(); // Rebuild with an empty chain (input -> gain -> meter -> dest)
}


// --- Audio Recording Functions ---
/**
 * Starts audio recording for a given Audio track.
 * @param {Track} track - The Audio track instance to record to.
 * @param {boolean} isMonitoringEnabled - Whether to monitor the input through the track.
 * @returns {Promise<boolean>} True if recording started successfully, false otherwise.
 */
export async function startAudioRecording(track, isMonitoringEnabled) {
    console.log("[Audio startAudioRecording] Called for track:", track?.name, "Monitoring:", isMonitoringEnabled);

    // Clean up previous instances if they exist
    if (mic) {
        console.log("[Audio startAudioRecording] Existing mic instance found. State:", mic.state);
        if (mic.state === "started") {
            try { mic.close(); console.log("[Audio startAudioRecording] Existing mic closed."); }
            catch (e) { console.warn("[Audio startAudioRecording] Error closing existing mic:", e.message); }
        }
        mic = null; // Ensure it's nullified for new instance
        console.log("[Audio startAudioRecording] Previous mic instance nullified.");
    }

    if (recorder) {
        console.log("[Audio startAudioRecording] Existing recorder instance found. State:", recorder.state, "Disposed:", recorder.disposed);
        if (recorder.state === "started") {
            try { await recorder.stop(); console.log("[Audio startAudioRecording] Existing recorder stopped."); } // Await stop if it was recording
            catch (e) { console.warn("[Audio startAudioRecording] Error stopping existing recorder:", e.message); }
        }
        if (!recorder.disposed) {
            try { recorder.dispose(); console.log("[Audio startAudioRecording] Existing recorder disposed."); }
            catch (e) { console.warn("[Audio startAudioRecording] Error disposing existing recorder:", e.message); }
        }
        recorder = null; // Nullify for new instance
        console.log("[Audio startAudioRecording] Previous recorder instance nullified.");
    }

    // Create new instances
    mic = new Tone.UserMedia({
        audio: { // Attempt to request specific constraints for better quality/latency
            echoCancellation: false, // Usually desired for music recording
            autoGainControl: false,
            noiseSuppression: false,
            latency: 0.01 // Desired latency in seconds (browser support varies)
        }
    });
    console.log("[Audio startAudioRecording] New Tone.UserMedia instance created.");
    recorder = new Tone.Recorder();
    console.log("[Audio startAudioRecording] New Tone.Recorder instance created.");

    if (!track || track.type !== 'Audio' || !track.inputChannel || track.inputChannel.disposed) {
        const errorMsg = `Recording failed: Track (ID: ${track?.id}) is not a valid audio track or its input channel is missing/disposed. Type: ${track?.type}. Input channel valid: ${!!(track?.inputChannel && !track.inputChannel.disposed)}`;
        console.error(`[Audio startAudioRecording] ${errorMsg}`);
        if (localAppServices.showNotification) localAppServices.showNotification(errorMsg, 4000);
        return false;
    }
    console.log(`[Audio startAudioRecording] Attempting to record on track: ${track.name} (ID: ${track.id})`);

    try {
        // Log available devices for debugging if needed
        if (Tone.UserMedia.enumerateDevices && typeof Tone.UserMedia.enumerateDevices === 'function') {
            try {
                const devices = await Tone.UserMedia.enumerateDevices();
                const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
                console.log("[Audio startAudioRecording] Available audio input devices:", audioInputDevices.map(d => ({ label: d.label, deviceId: d.deviceId, groupId: d.groupId })));
                if (audioInputDevices.length === 0) console.warn("[Audio startAudioRecording] No audio input devices found by enumerateDevices.");
            } catch (enumError) {
                console.error("[Audio startAudioRecording] Error enumerating devices:", enumError);
            }
        } else {
            console.warn("[Audio startAudioRecording] Tone.UserMedia.enumerateDevices is not available or not a function.");
        }

        console.log("[Audio startAudioRecording] Opening microphone (mic.open())...");
        await mic.open(); // Request microphone access
        console.log("[Audio startAudioRecording] Microphone opened successfully. State:", mic.state, "Selected device label (mic.label):", mic.label || "N/A");

        // Disconnect mic from any previous connections before new ones
        try { mic.disconnect(); } catch (e) { /* ignore if not connected */ }

        if (isMonitoringEnabled) {
            console.log("[Audio startAudioRecording] Monitoring is ON. Connecting mic to track inputChannel.");
            mic.connect(track.inputChannel); // For live monitoring through track's effects and volume
        } else {
            console.log("[Audio startAudioRecording] Monitoring is OFF.");
        }
        mic.connect(recorder); // Always connect mic to recorder
        console.log("[Audio startAudioRecording] Mic connected to recorder.");

        console.log("[Audio startAudioRecording] Starting recorder...");
        await recorder.start(); // Start the actual recording process
        console.log("[Audio startAudioRecording] Recorder started. State:", recorder.state);
        return true; // Recording started successfully

    } catch (error) {
        console.error("[Audio startAudioRecording] Error starting microphone/recorder:", error);
        let userMessage = "Could not start recording. Check microphone permissions and ensure a microphone is connected.";
        if (error.name === "NotAllowedError" || error.message.toLowerCase().includes("permission denied")) {
            userMessage = "Microphone permission denied. Please allow microphone access in browser/system settings.";
        } else if (error.name === "NotFoundError" || error.message.toLowerCase().includes("no device") || error.message.toLowerCase().includes("device not found")) {
            userMessage = "No microphone found. Please connect a microphone and ensure it's selected by the browser/OS.";
        } else if (error.name === "AbortError" || error.message.toLowerCase().includes("starting audio input failed")) {
            userMessage = "Failed to start audio input. The microphone might be in use by another application or a hardware issue.";
        }
        if (localAppServices.showNotification) localAppServices.showNotification(userMessage, 6000);

        // Cleanup on error
        if (mic) {
            if (mic.state === "started") try { mic.close(); } catch(e) { console.warn("Cleanup error closing mic:", e.message); }
            mic = null;
        }
        if (recorder) {
            if (!recorder.disposed) try { recorder.dispose(); } catch(e) { console.warn("Cleanup error disposing recorder:", e.message); }
            recorder = null;
        }
        return false; // Recording failed to start
    }
}

/**
 * Stops audio recording and processes the recorded blob.
 */
export async function stopAudioRecording() {
    console.log("[Audio stopAudioRecording] Called.");
    let blob = null;

    if (!recorder) {
        console.warn("[Audio stopAudioRecording] Recorder not initialized. Cannot stop recording.");
        if (mic && mic.state === "started") { // If mic was somehow started but recorder wasn't
            console.log("[Audio stopAudioRecording] Mic was started, closing it (recorder was null).");
            try { mic.close(); } catch(e) { console.warn("[Audio stopAudioRecording] Error closing mic (recorder null):", e.message); }
        }
        mic = null;
        return; // Nothing to stop
    }

    if (recorder.state === "started") {
        try {
            console.log("[Audio stopAudioRecording] Stopping recorder...");
            blob = await recorder.stop(); // This returns a Promise that resolves with the Blob
            console.log("[Audio stopAudioRecording] Recorder stopped. Blob received, size:", blob?.size, "type:", blob?.type);
        } catch (e) {
            console.error("[Audio stopAudioRecording] Error stopping recorder:", e);
            if (localAppServices.showNotification) localAppServices.showNotification("Error stopping recorder. Recording may be lost.", 3000);
        }
    } else {
        console.warn("[Audio stopAudioRecording] Recorder was not in 'started' state. Current state:", recorder.state);
    }

    // Clean up microphone
    if (mic) {
        if (mic.state === "started") {
            console.log("[Audio stopAudioRecording] Closing microphone.");
            try {
                mic.disconnect(recorder); // Disconnect from recorder
                // Disconnect from track input channel if it was monitoring
                if (localAppServices.getRecordingTrackId) { // Check if service exists
                    const recTrack = localAppServices.getTrackById(localAppServices.getRecordingTrackId());
                    if (recTrack && recTrack.inputChannel && !recTrack.inputChannel.disposed) {
                       try { mic.disconnect(recTrack.inputChannel); } catch(e) { /* ignore if not connected */ }
                    }
                }
                mic.close();
                console.log("[Audio stopAudioRecording] Microphone closed and disconnected.");
            } catch (e) {
                console.warn("[Audio stopAudioRecording] Error closing/disconnecting mic:", e.message);
            }
        }
        mic = null; // Nullify for next recording
        console.log("[Audio stopAudioRecording] Mic instance nullified.");
    }

    // Dispose recorder
    if (recorder && !recorder.disposed) {
        console.log("[Audio stopAudioRecording] Disposing recorder instance.");
        try {
            recorder.dispose();
        } catch(e) {
            console.warn("[Audio stopAudioRecording] Error disposing recorder:", e.message);
        }
    }
    recorder = null;
    console.log("[Audio stopAudioRecording] Recorder instance nullified and disposed.");

    // Process the recorded blob
    if (blob && blob.size > 0) {
        const recordingTrackId = localAppServices.getRecordingTrackId ? localAppServices.getRecordingTrackId() : null;
        const startTime = getRecordingStartTimeState(); // Get start time from state
        const track = recordingTrackId !== null && localAppServices.getTrackById ? localAppServices.getTrackById(recordingTrackId) : null;

        if (track) {
            console.log(`[Audio stopAudioRecording] Processing recorded blob for track ${track.name} (ID: ${track.id}), original startTime: ${startTime}`);
            if (typeof track.addAudioClip === 'function') {
                await track.addAudioClip(blob, startTime);
            } else {
                console.error("[Audio stopAudioRecording] Track object does not have addAudioClip method.");
                if (localAppServices.showNotification) localAppServices.showNotification("Error: Could not process recorded audio (internal error).", 3000);
            }
        } else {
            console.error(`[Audio stopAudioRecording] Recorded track (ID: ${recordingTrackId}) not found after stopping recorder.`);
            if (localAppServices.showNotification) localAppServices.showNotification("Error: Recorded track not found. Audio might be lost.", 3000);
        }
    } else if (blob && blob.size === 0) {
        console.warn("[Audio stopAudioRecording] Recording was empty.");
        if (localAppServices.showNotification) localAppServices.showNotification("Recording was empty. No clip created.", 2000);
    } else if (!blob && recorder?.state === "started") { // Should not happen if await recorder.stop() worked
        console.warn("[Audio stopAudioRecording] Recorder was in 'started' state but stop() did not yield a blob.");
    }
}
