// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading
import * as Constants from './constants.js';
// showNotification will be accessed via localAppServices
import { createEffectInstance } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';
import { getRecordingStartTimeState, getLoadedZipFilesState } from './state.js';

let masterEffectsBusInputNode = null;
let masterGainNodeActual = null; // The actual Tone.Gain node for master volume
let masterMeterNode = null;
let activeMasterEffectNodes = new Map();

let audioContextInitialized = false; // Tracks if Tone.start() has been successfully called and context is running

let localAppServices = {};

// Variables for audio recording
let mic = null;
let recorder = null;

export function initializeAudioModule(appServicesFromMain) {
    localAppServices = appServicesFromMain;
    console.log('[Audio Init] Audio module initialized.');
}

export function getMasterEffectsBusInputNode() {
    if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed) {
        console.warn("[Audio getMasterEffectsBusInputNode] Master bus input node was not ready or disposed. Attempting setup.");
        if (Tone.context && Tone.context.state === 'running') {
            setupMasterBus();
        } else {
            console.error("[Audio getMasterEffectsBusInputNode] Cannot setup master bus, AudioContext not running.");
            return null; // Indicate failure
        }
    }
    return masterEffectsBusInputNode;
}

export function getActualMasterGainNode() {
    if (!masterGainNodeActual || masterGainNodeActual.disposed) {
        console.warn("[Audio getActualMasterGainNode] Actual master gain node was not ready or disposed. Attempting setup.");
        if (Tone.context && Tone.context.state === 'running') {
            setupMasterBus();
        } else {
            console.error("[Audio getActualMasterGainNode] Cannot setup master bus, AudioContext not running.");
            return null; // Indicate failure
        }
    }
    return masterGainNodeActual;
}

export async function initAudioContextAndMasterMeter(isUserInitiated = false) {
    console.log(`[Audio initAudioContextAndMasterMeter] Attempting initialization. User initiated: ${isUserInitiated}. Current Tone.context state: ${Tone.context?.state}. audioContextInitialized: ${audioContextInitialized}`);

    if (audioContextInitialized && Tone.context && Tone.context.state === 'running') {
        console.log('[Audio initAudioContextAndMasterMeter] Context already initialized and running.');
        // Ensure master bus components are valid, re-setup if necessary
        if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed ||
            !masterGainNodeActual || masterGainNodeActual.disposed ||
            !masterMeterNode || masterMeterNode.disposed) {
            console.warn("[Audio initAudioContextAndMasterMeter] Context was running, but master bus components are invalid. Re-setting up master bus.");
            setupMasterBus();
        }
        return true;
    }

    if (!isUserInitiated && Tone.context?.state !== 'running') {
        console.warn('[Audio initAudioContextAndMasterMeter] AudioContext not running and not user-initiated. Deferring full setup.');
        // Do not show notification here, let the user-initiated path handle it.
        return false;
    }

    console.log('[Audio initAudioContextAndMasterMeter] Calling Tone.start().');
    try {
        await Tone.start();
        console.log(`[Audio initAudioContextAndMasterMeter] Tone.start() completed. New context state: ${Tone.context?.state}`);

        if (Tone.context && Tone.context.state === 'running') {
            audioContextInitialized = true; // Set flag *after* successful start
            console.log('[Audio initAudioContextAndMasterMeter] Audio context successfully started and running.');
            setupMasterBus(); // Setup or ensure master bus is correct
            return true;
        } else {
            console.error(`[Audio initAudioContextAndMasterMeter] Audio context did NOT reach 'running' state after Tone.start(). State: ${Tone.context?.state}`);
            const message = "AudioContext could not be started. Please interact with the page (e.g., click a button) or refresh.";
            if (localAppServices.showNotification) {
                localAppServices.showNotification(message, 5000);
            } else {
                alert(message);
            }
            audioContextInitialized = false;
            return false;
        }
    } catch (error) {
        console.error("[Audio initAudioContextAndMasterMeter] Error during Tone.start() or master bus setup:", error);
        const message = `Error initializing audio: ${error.message || 'Unknown error.'}. Please try again or refresh.`;
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
    console.log('[Audio setupMasterBus] Setting up master audio bus...');
    if (!Tone.context || Tone.context.state !== 'running') {
        console.error('[Audio setupMasterBus] CRITICAL: AudioContext not running. Aborting master bus setup.');
        audioContextInitialized = false; // Reset this flag as context is not usable
        return;
    }
    if (!audioContextInitialized) {
        console.warn('[Audio setupMasterBus] Called but audioContextInitialized flag was false. This might indicate an issue with init flow.');
        // Attempting to proceed, but this is a potential problem area.
    }

    console.log('[Audio setupMasterBus] Disposing existing master bus nodes if any...');
    // Dispose existing nodes safely
    if (masterEffectsBusInputNode && !masterEffectsBusInputNode.disposed) {
        try { masterEffectsBusInputNode.dispose(); } catch(e){ console.warn("[Audio setupMasterBus] Error disposing old master bus input:", e.message); }
    }
    if (masterGainNodeActual && !masterGainNodeActual.disposed) {
        try { masterGainNodeActual.dispose(); } catch(e){ console.warn("[Audio setupMasterBus] Error disposing old master gain node actual:", e.message); }
    }
    if (masterMeterNode && !masterMeterNode.disposed) {
        try { masterMeterNode.dispose(); } catch(e) { console.warn("[Audio setupMasterBus] Error disposing old master meter:", e.message); }
    }
    activeMasterEffectNodes.forEach(node => { if (node && !node.disposed) try { node.dispose(); } catch(e){} });
    activeMasterEffectNodes.clear();


    console.log('[Audio setupMasterBus] Creating new master bus nodes...');
    masterEffectsBusInputNode = new Tone.Gain();
    console.log(`[Audio setupMasterBus] masterEffectsBusInputNode created (ID: ${masterEffectsBusInputNode.id})`);

    const initialMasterVolumeValue = localAppServices.getMasterGainValue ? localAppServices.getMasterGainValue() : Tone.dbToGain(0);
    masterGainNodeActual = new Tone.Gain(initialMasterVolumeValue);
    if (localAppServices.setMasterGainValueState) localAppServices.setMasterGainValueState(masterGainNodeActual.gain.value);
    console.log(`[Audio setupMasterBus] masterGainNodeActual created with gain: ${masterGainNodeActual.gain.value} (ID: ${masterGainNodeActual.id})`);

    masterMeterNode = new Tone.Meter({ smoothing: 0.8 });
    console.log(`[Audio setupMasterBus] masterMeterNode created (ID: ${masterMeterNode.id})`);

    rebuildMasterEffectChain();
    console.log('[Audio setupMasterBus] Master bus setup process finished.');
}

export function rebuildMasterEffectChain() {
    console.log('[Audio rebuildMasterEffectChain] Rebuilding master effect chain...');
    if (!audioContextInitialized || !Tone.context || Tone.context.state !== 'running') {
        console.error('[Audio rebuildMasterEffectChain] Audio context not running or not initialized. Aborting.');
        return;
    }

    if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed ||
        !masterGainNodeActual || masterGainNodeActual.disposed ||
        !masterMeterNode || masterMeterNode.disposed) {
        console.warn('[Audio rebuildMasterEffectChain] Master bus components not fully ready. Attempting re-setup of master bus first...');
        setupMasterBus();
        if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed || // Re-check after setup
            !masterGainNodeActual || masterGainNodeActual.disposed ||
            !masterMeterNode || masterMeterNode.disposed) {
            console.error('[Audio rebuildMasterEffectChain] CRITICAL: Master bus components still not ready after setup attempt. Aborting chain rebuild.');
            return;
        }
        console.log('[Audio rebuildMasterEffectChain] Master bus re-setup successful, continuing chain rebuild.');
    }

    console.log('[Audio rebuildMasterEffectChain] Disconnecting all nodes in current master chain path...');
    try { masterEffectsBusInputNode.disconnect(); } catch(e) { /* console.warn("[Audio rebuildMasterEffectChain] Error disconnecting masterEffectsBusInputNode (might be okay if nothing was connected):", e.message); */ }
    activeMasterEffectNodes.forEach((node, id) => {
        if (node && !node.disposed) {
            try { node.disconnect(); } catch(e) { console.warn(`[Audio rebuildMasterEffectChain] Error disconnecting active master effect node ${id} ("${node.name}"):`, e.message); }
        }
    });
    try { masterGainNodeActual.disconnect(); } catch(e) { /* console.warn("[Audio rebuildMasterEffectChain] Error disconnecting masterGainNodeActual (might be okay):", e.message); */ }


    let currentAudioPathEnd = masterEffectsBusInputNode;
    const masterEffectsState = localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : [];
    console.log(`[Audio rebuildMasterEffectChain] Processing ${masterEffectsState.length} master effects from state.`);

    masterEffectsState.forEach(effectState => {
        if (!effectState || !effectState.type) {
            console.warn("[Audio rebuildMasterEffectChain] Invalid effect state found, skipping:", effectState);
            return;
        }
        let effectNode = activeMasterEffectNodes.get(effectState.id);

        if (!effectNode || effectNode.disposed) {
            console.log(`[Audio rebuildMasterEffectChain] Master effect node for ${effectState.type} (ID: ${effectState.id}) not found or disposed. Recreating.`);
            effectNode = createEffectInstance(effectState.type, effectState.params);
            if (effectNode) {
                activeMasterEffectNodes.set(effectState.id, effectNode);
                console.log(`[Audio rebuildMasterEffectChain] Recreated master effect node for ${effectState.type} (ID: ${effectState.id}, Tone ID: ${effectNode.id}).`);
            } else {
                console.error(`[Audio rebuildMasterEffectChain] CRITICAL: Failed to recreate master effect node for ${effectState.type} (ID: ${effectState.id}). Chain may be broken.`);
                return; // Skip connecting this effect if it failed to create
            }
        }

        if (currentAudioPathEnd && !currentAudioPathEnd.disposed && effectNode && !effectNode.disposed) {
            try {
                console.log(`[Audio rebuildMasterEffectChain] Connecting ${currentAudioPathEnd.name || 'InputNode'} (ID: ${currentAudioPathEnd.id}) to ${effectNode.name || effectState.type} (ID: ${effectNode.id})`);
                currentAudioPathEnd.connect(effectNode);
                currentAudioPathEnd = effectNode;
            } catch (e) {
                console.error(`[Audio rebuildMasterEffectChain] Error connecting master effect ${effectState.type} (from ${currentAudioPathEnd.name} to ${effectNode.name}):`, e);
                currentAudioPathEnd = effectNode; // Attempt to continue chain from this effect even if previous connection failed
            }
        } else {
             console.warn(`[Audio rebuildMasterEffectChain] Cannot connect effect ${effectState.type}. currentAudioPathEnd invalid: ${currentAudioPathEnd?.name} (Disposed: ${currentAudioPathEnd?.disposed}), or effectNode invalid: ${effectNode?.name} (Disposed: ${effectNode?.disposed}).`);
             if (effectNode && !effectNode.disposed) currentAudioPathEnd = effectNode; // Start new chain segment if possible
        }
    });

    // Connect the end of the effect chain (or the bus input if no effects) to masterGainNodeActual
    if (currentAudioPathEnd && !currentAudioPathEnd.disposed && masterGainNodeActual && !masterGainNodeActual.disposed) {
        try {
            console.log(`[Audio rebuildMasterEffectChain] Connecting end of master effect chain (${currentAudioPathEnd.name || 'Node'}) to masterGainNodeActual.`);
            currentAudioPathEnd.connect(masterGainNodeActual);
        } catch (e) {
            console.error(`[Audio rebuildMasterEffectChain] Error connecting master chain output to masterGainNodeActual:`, e);
        }
    } else {
        console.error(`[Audio rebuildMasterEffectChain] CRITICAL: Cannot connect master chain output to masterGainNodeActual. currentAudioPathEnd: ${currentAudioPathEnd?.name} (Disposed: ${currentAudioPathEnd?.disposed}), masterGainNodeActual: ${masterGainNodeActual?.name} (Disposed: ${masterGainNodeActual?.disposed})`);
    }

    // Connect masterGainNodeActual to destination and meter
    if (masterGainNodeActual && !masterGainNodeActual.disposed) {
        try {
            console.log('[Audio rebuildMasterEffectChain] Connecting masterGainNodeActual to Tone.Destination and masterMeterNode.');
            masterGainNodeActual.toDestination();
            if (masterMeterNode && !masterMeterNode.disposed) {
                masterGainNodeActual.connect(masterMeterNode);
            } else {
                 console.warn("[Audio rebuildMasterEffectChain] Master meter node not available or disposed for connection from masterGainNodeActual.");
            }
        } catch (e) { console.error("[Audio rebuildMasterEffectChain] Error connecting masterGainNodeActual to destination/meter:", e); }
    } else {
         console.error('[Audio rebuildMasterEffectChain] CRITICAL: masterGainNodeActual not available for final connection to destination.');
    }
    console.log('[Audio rebuildMasterEffectChain] Master effect chain rebuild finished.');
}


export async function addMasterEffectToAudio(effectIdInState, effectType, initialParams) {
    if (!audioContextInitialized) {
        console.warn(`[Audio addMasterEffectToAudio] Audio context not initialized. Cannot add master effect ${effectType}.`);
        if (localAppServices.showNotification) localAppServices.showNotification("Audio system not ready. Effect not added.", 3000);
        return;
    }
    console.log(`[Audio addMasterEffectToAudio] Adding master effect: ${effectType} (ID in state: ${effectIdInState})`);
    const toneNode = createEffectInstance(effectType, initialParams);
    if (toneNode) {
        activeMasterEffectNodes.set(effectIdInState, toneNode);
        console.log(`[Audio addMasterEffectToAudio] Created Tone node for ${effectType}. Rebuilding chain.`);
        rebuildMasterEffectChain();
    } else {
        if (localAppServices.showNotification) localAppServices.showNotification(`Failed to create master effect: ${effectType}`, 3000);
        console.error(`[Audio addMasterEffectToAudio] Failed to create Tone.js instance for master effect: ${effectType}`);
    }
}

export async function removeMasterEffectFromAudio(effectId) {
    console.log(`[Audio removeMasterEffectFromAudio] Removing master effect with ID: ${effectId}`);
    const nodeToRemove = activeMasterEffectNodes.get(effectId);
    if (nodeToRemove) {
        if (!nodeToRemove.disposed) {
            try {
                console.log(`[Audio removeMasterEffectFromAudio] Disposing Tone node for effect ID ${effectId} ("${nodeToRemove.name}").`);
                nodeToRemove.dispose();
            } catch (e) {
                console.warn(`[Audio removeMasterEffectFromAudio] Error disposing master effect node for ID ${effectId}:`, e.message);
            }
        }
        activeMasterEffectNodes.delete(effectId);
        console.log(`[Audio removeMasterEffectFromAudio] Effect node removed from active map. Rebuilding chain.`);
        rebuildMasterEffectChain();
    } else {
        console.warn(`[Audio removeMasterEffectFromAudio] Node to remove with ID ${effectId} not found in activeMasterEffectNodes. Chain may already be correct or node was never added.`);
    }
}

export function updateMasterEffectParamInAudio(effectId, paramPath, value) {
    const effectNode = activeMasterEffectNodes.get(effectId);
    if (!effectNode || effectNode.disposed) {
        console.warn(`[Audio updateMasterEffectParamInAudio] Master effect node for ID ${effectId} not found or disposed. Cannot update param "${paramPath}".`);
        return;
    }
    console.log(`[Audio updateMasterEffectParamInAudio] Updating param "${paramPath}" to ${value} for effect ID ${effectId} ("${effectNode.name}").`);
    try {
        const keys = paramPath.split('.');
        let targetObject = effectNode;
        for (let i = 0; i < keys.length - 1; i++) {
            if (targetObject && typeof targetObject[keys[i]] !== 'undefined') {
                targetObject = targetObject[keys[i]];
            } else {
                throw new Error(`Path segment "${keys[i]}" (from path "${paramPath}") not found on Tone node.`);
            }
        }
        const finalParamKey = keys[keys.length - 1];
        const paramInstance = targetObject[finalParamKey];

        if (typeof paramInstance !== 'undefined') {
            if (paramInstance && typeof paramInstance.value !== 'undefined' && typeof paramInstance.rampTo === 'function') {
                paramInstance.rampTo(value, 0.02); // Smooth ramp for signal-like parameters
            } else if (paramInstance && typeof paramInstance.value !== 'undefined') {
                 paramInstance.value = value; // Direct value assignment for simple signals
            } else {
                targetObject[finalParamKey] = value; // Direct property assignment (e.g., 'type', 'oversample')
            }
            console.log(`[Audio updateMasterEffectParamInAudio] Successfully updated "${paramPath}" on "${effectNode.name}".`);
        } else if (typeof targetObject.set === 'function' && keys.length > 0) {
            // Fallback for objects that use a .set() method for nested params
            const setObj = {};
            let currentLevelForSet = setObj;
            keys.forEach((k, idx) => {
                if (idx === keys.length -1) currentLevelForSet[k] = value;
                else { currentLevelForSet[k] = {}; currentLevelForSet = currentLevelForSet[k];}
            });
            targetObject.set(setObj);
            console.log(`[Audio updateMasterEffectParamInAudio] Successfully updated "${paramPath}" on "${effectNode.name}" using .set().`);
        } else {
             console.warn(`[Audio updateMasterEffectParamInAudio] Parameter instance or .set() method for "${finalParamKey}" not found on target object for effect ID ${effectId}. Target:`, targetObject);
        }
    } catch (err) {
        console.error(`[Audio updateMasterEffectParamInAudio] Error updating param "${paramPath}" for master effect ID ${effectId}:`, err);
    }
}

export function reorderMasterEffectInAudio(effectIdIgnored, newIndexIgnored) {
    // The actual reordering happens in state by manipulating masterEffectsChainState;
    // this function just rebuilds the audio chain based on the new order in state.
    console.log("[Audio reorderMasterEffectInAudio] Reordering detected, rebuilding master effect chain.");
    rebuildMasterEffectChain();
}

export function updateMeters(globalMasterMeterBar, mixerMasterMeterBar, tracks) {
    if (!audioContextInitialized || !Tone.context || Tone.context.state !== 'running') {
        // Silence console warn for this as it's called in a loop
        // console.warn("[Audio updateMeters] Audio context not ready or running. Skipping meter updates.");
        return;
    }

    if (masterMeterNode && typeof masterMeterNode.getValue === 'function' && !masterMeterNode.disposed) {
        const masterLevelValue = masterMeterNode.getValue();
        const numericMasterLevel = Array.isArray(masterLevelValue) ? masterLevelValue[0] : masterLevelValue; // Use left channel for stereo
        if (typeof numericMasterLevel === 'number' && isFinite(numericMasterLevel)) {
            const level = Tone.dbToGain(numericMasterLevel); // Convert dB to gain (0-1 range)
            const isClipping = numericMasterLevel > -0.1; // dB value close to 0 indicates clipping

            if (globalMasterMeterBar) {
                globalMasterMeterBar.style.width = `${Math.min(100, Math.max(0, level * 100))}%`;
                globalMasterMeterBar.classList.toggle('clipping', isClipping);
            }
            if (mixerMasterMeterBar) {
                mixerMasterMeterBar.style.width = `${Math.min(100, Math.max(0, level * 100))}%`;
                mixerMasterMeterBar.classList.toggle('clipping', isClipping);
            }
        }
    } else if (masterMeterNode && masterMeterNode.disposed) {
        console.warn("[Audio updateMeters] Master meter node is disposed. Attempting to re-initialize master bus.");
        setupMasterBus();
    } else if (!masterMeterNode) {
        // console.warn("[Audio updateMeters] Master meter node does not exist yet.");
    }


    (tracks || []).forEach(track => {
        if (track && track.trackMeter && typeof track.trackMeter.getValue === 'function' && !track.trackMeter.disposed) {
            const meterValue = track.trackMeter.getValue();
            const numericMeterValue = Array.isArray(meterValue) ? meterValue[0] : meterValue;

            if (typeof numericMeterValue === 'number' && isFinite(numericMeterValue)) {
                const level = Tone.dbToGain(numericMeterValue);
                const isClipping = numericMeterValue > -0.1;

                if (localAppServices.updateTrackMeterUI) {
                    localAppServices.updateTrackMeterUI(track.id, level, isClipping);
                }
            }
        }
    });
}

export async function playSlicePreview(trackId, sliceIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0) {
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        if (localAppServices.showNotification) localAppServices.showNotification("Audio not ready for preview.", 2000);
        return;
    }

    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;

    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded || !track.slices[sliceIndex]) {
        console.warn(`[Audio playSlicePreview] Conditions not met for playing slice preview. Track ID: ${trackId}, Slice Index: ${sliceIndex}, Buffer Loaded: ${track?.audioBuffer?.loaded}, Slice Exists: ${!!track?.slices?.[sliceIndex]}`);
        if (localAppServices.showNotification) localAppServices.showNotification("Cannot preview slice: sample not loaded or slice invalid.", 2500);
        return;
    }
    const sliceData = track.slices[sliceIndex];
    if (!sliceData || sliceData.duration <= 0) {
        console.warn(`[Audio playSlicePreview] Invalid slice data or zero duration for track ${trackId}, slice ${sliceIndex}. Duration: ${sliceData?.duration}`);
        if (localAppServices.showNotification) localAppServices.showNotification("Cannot preview: Slice has no duration.", 2000);
        return;
    }

    const time = Tone.now();
    const totalPitchShift = (sliceData.pitchShift || 0) + additionalPitchShiftInSemitones;
    const playbackRate = Math.pow(2, totalPitchShift / 12);
    let playDuration = sliceData.duration / playbackRate;
    if (sliceData.loop) playDuration = Math.min(playDuration, 2); // Limit looped preview duration for sanity

    const actualDestination = (track.activeEffects.length > 0 && track.activeEffects[0].toneNode && !track.activeEffects[0].toneNode.disposed)
        ? track.activeEffects[0].toneNode
        : (track.gainNode && !track.gainNode.disposed ? track.gainNode : (getMasterEffectsBusInputNode() || Tone.Destination));

    if (!actualDestination || actualDestination.disposed) {
        console.error(`[Audio playSlicePreview] No valid destination node for track ${trackId}. Destination:`, actualDestination);
        if (localAppServices.showNotification) localAppServices.showNotification("Preview error: Output node missing.", 3000);
        return;
    }
    console.log(`[Audio playSlicePreview] Destination node for slice preview on track ${track.id}: ${actualDestination.name || 'Tone.Destination'}`);


    if (!track.slicerIsPolyphonic) {
        if (!track.slicerMonoPlayer || track.slicerMonoPlayer.disposed) {
            console.log(`[Audio playSlicePreview] Mono slicer player for track ${trackId} not ready, setting up...`);
            track.setupSlicerMonoNodes();
            if (!track.slicerMonoPlayer) {
                console.error(`[Audio playSlicePreview] CRITICAL: Mono slicer player still not set up after attempt for track ${trackId}.`);
                return;
            }
        }
        const player = track.slicerMonoPlayer;
        const env = track.slicerMonoEnvelope;
        const gain = track.slicerMonoGain;

        if (gain && !gain.disposed && actualDestination && !actualDestination.disposed) {
            try { gain.disconnect(); gain.connect(actualDestination); }
            catch(e) { console.error("Error connecting mono slicer gain to destination:", e); return; }
        } else { console.error("Mono slicer gain or destination invalid."); return; }


        if (player.state === 'started') player.stop(time);
        if (env && !env.disposed && env.getValueAtTime(time) > 0.001) env.triggerRelease(time);

        if (track.audioBuffer && track.audioBuffer.loaded) player.buffer = track.audioBuffer; else { console.warn("AudioBuffer for mono slicer not loaded."); return; }
        if (env && !env.disposed) env.set(sliceData.envelope);
        if (gain && !gain.disposed) gain.gain.value = Tone.dbToGain(-6) * sliceData.volume * velocity;
        player.playbackRate = playbackRate;
        player.reverse = sliceData.reverse || false;
        player.loop = sliceData.loop || false;
        player.loopStart = sliceData.offset;
        player.loopEnd = sliceData.offset + sliceData.duration;

        player.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
        if (env && !env.disposed) env.triggerAttack(time);
        if (!sliceData.loop && env && !env.disposed) {
            const releaseTime = time + playDuration - (sliceData.envelope.release || 0.1);
            env.triggerRelease(Math.max(time, releaseTime));
        }
    } else { // Polyphonic
        let tempPlayer, tempEnv, tempGain;
        try {
            tempPlayer = new Tone.Player(track.audioBuffer);
            tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
            tempGain = new Tone.Gain(Tone.dbToGain(-6) * sliceData.volume * velocity);

            tempPlayer.chain(tempEnv, tempGain, actualDestination);
            tempPlayer.playbackRate = playbackRate;
            tempPlayer.reverse = sliceData.reverse || false;
            tempPlayer.loop = sliceData.loop || false;
            tempPlayer.loopStart = sliceData.offset;
            tempPlayer.loopEnd = sliceData.offset + sliceData.duration;

            tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
            tempEnv.triggerAttack(time);
            if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95);

            const disposeTime = time + playDuration + (sliceData.envelope.release || 0.1) + 0.5;
            Tone.Transport.scheduleOnce(() => {
                if (tempPlayer && !tempPlayer.disposed) try {tempPlayer.dispose();} catch(e){}
                if (tempEnv && !tempEnv.disposed) try {tempEnv.dispose();} catch(e){}
                if (tempGain && !tempGain.disposed) try {tempGain.dispose();} catch(e){}
            }, disposeTime);
        } catch (error) {
            console.error(`[Audio playSlicePreview] Error setting up polyphonic preview player for track ${trackId}:`, error);
            if (tempPlayer && !tempPlayer.disposed) try {tempPlayer.dispose();} catch(e){}
            if (tempEnv && !tempEnv.disposed) try {tempEnv.dispose();} catch(e){}
            if (tempGain && !tempGain.disposed) try {tempGain.dispose();} catch(e){}
        }
    }
}

export async function playDrumSamplerPadPreview(trackId, padIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0) {
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        if (localAppServices.showNotification) localAppServices.showNotification("Audio not ready for preview.", 2000);
        return;
    }

    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;

    if (!track || track.type !== 'DrumSampler' || !track.drumPadPlayers[padIndex] || track.drumPadPlayers[padIndex].disposed || !track.drumPadPlayers[padIndex].loaded) {
        console.warn(`[Audio playDrumSamplerPadPreview] Conditions not met. Track ID: ${trackId}, Pad: ${padIndex}, Player valid/loaded: ${!!track?.drumPadPlayers?.[padIndex] && !track.drumPadPlayers[padIndex].disposed && track.drumPadPlayers[padIndex].loaded}`);
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

    const actualDestination = (track.activeEffects.length > 0 && track.activeEffects[0].toneNode && !track.activeEffects[0].toneNode.disposed)
        ? track.activeEffects[0].toneNode
        : (track.gainNode && !track.gainNode.disposed ? track.gainNode : (getMasterEffectsBusInputNode() || Tone.Destination));

    if (!actualDestination || actualDestination.disposed) {
        console.error(`[Audio playDrumSamplerPadPreview] No valid destination node for track ${trackId}, pad ${padIndex}. Destination:`, actualDestination);
        if (localAppServices.showNotification) localAppServices.showNotification("Preview error: Output node missing for drum pad.", 3000);
        return;
    }
    console.log(`[Audio playDrumSamplerPadPreview] Destination node for drum pad ${padIndex} preview on track ${track.id}: ${actualDestination.name || 'Tone.Destination'}`);


    try {
        player.disconnect();
        player.connect(actualDestination);
    } catch (e) {
        console.error(`[Audio playDrumSamplerPadPreview] Error reconnecting drum pad player for track ${trackId}, pad ${padIndex}:`, e.message);
        return;
    }

    player.volume.value = Tone.gainToDb(padData.volume * velocity * 0.7);

    if (padData.autoStretchEnabled && padData.stretchOriginalBPM > 0 && padData.stretchBeats > 0 && player.buffer) {
        const currentProjectTempo = Tone.Transport.bpm.value;
        const sampleBufferDuration = player.buffer.duration;
        const targetDurationAtCurrentTempo = (60 / currentProjectTempo) * padData.stretchBeats;

        if (targetDurationAtCurrentTempo > 1e-6 && sampleBufferDuration > 1e-6) {
             player.playbackRate = sampleBufferDuration / targetDurationAtCurrentTempo;
        } else { player.playbackRate = 1; }
    } else {
        const totalPadPitchShift = (padData.pitchShift || 0) + additionalPitchShiftInSemitones;
        player.playbackRate = Math.pow(2, totalPadPitchShift / 12);
    }

    player.start(Tone.now());
}


export function getMimeTypeFromFilename(filename) {
    if (!filename || typeof filename !== 'string') return "application/octet-stream";
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.endsWith(".wav")) return "audio/wav";
    if (lowerFilename.endsWith(".mp3")) return "audio/mpeg";
    if (lowerFilename.endsWith(".ogg")) return "audio/ogg";
    if (lowerFilename.endsWith(".flac")) return "audio/flac";
    if (lowerFilename.endsWith(".aac")) return "audio/aac";
    if (lowerFilename.endsWith(".m4a")) return "audio/mp4";
    return "application/octet-stream";
}

async function commonLoadSampleLogic(fileObject, sourceName, track, trackTypeHint, padIndex = null) {
    const isReconstructing = localAppServices.getIsReconstructingDAW ? localAppServices.getIsReconstructingDAW() : false;

    if (localAppServices.captureStateForUndo && !isReconstructing) {
        const targetName = trackTypeHint === 'DrumSampler' && padIndex !== null ?
            `Pad ${padIndex + 1} on ${track.name}` :
            track.name;
        localAppServices.captureStateForUndo(`Load ${sourceName.substring(0,20)} to ${targetName}`);
    }

    let objectURLForTone = null;

    try {
        objectURLForTone = URL.createObjectURL(fileObject);
        console.log(`[Audio commonLoadSampleLogic] CreatedObjectURL: ${objectURLForTone} for ${sourceName}`);

        const dbKeySuffix = trackTypeHint === 'DrumSampler' && padIndex !== null ?
            `drumPad-${padIndex}-${sourceName.replace(/[^a-zA-Z0-9-_.]/g, '_')}` :
            `${trackTypeHint}-${sourceName.replace(/[^a-zA-Z0-9-_.]/g, '_')}`;
        const dbKey = `track-${track.id}-${dbKeySuffix}-${fileObject.size}-${Date.now()}`; // Added timestamp for more uniqueness
        await storeAudio(dbKey, fileObject);
        console.log(`[Audio commonLoadSampleLogic] Stored in DB with key: ${dbKey}`);

        const newAudioBuffer = new Tone.Buffer();
        await newAudioBuffer.load(objectURLForTone);
        console.log(`[Audio commonLoadSampleLogic] Tone.Buffer loaded for ${sourceName}. Duration: ${newAudioBuffer.duration}`);


        if (trackTypeHint === 'Sampler') {
            if (track.audioBuffer && !track.audioBuffer.disposed) track.audioBuffer.dispose();
            track.disposeSlicerMonoNodes(); // Important to do before reassigning buffer
            track.audioBuffer = newAudioBuffer;
            track.samplerAudioData = { fileName: sourceName, dbKey: dbKey, status: 'loaded' };
            if (!track.slicerIsPolyphonic && track.audioBuffer?.loaded) track.setupSlicerMonoNodes();
            if (localAppServices.autoSliceSample && track.audioBuffer.loaded && (!track.slices || track.slices.every(s => s.duration === 0))) {
                localAppServices.autoSliceSample(track.id, track.numSlices > 0 ? track.numSlices : Constants.DEFAULT_SLICES);
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
                loopStart: 0, // Reset loop points on new sample
                loopEnd: newAudioBuffer.duration
            };
            track.setupToneSampler(); // This will use the new buffer
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
                track.drumPadPlayers[padIndex] = new Tone.Player(newAudioBuffer); // Create new player with new buffer
            } else {
                console.error(`[Audio commonLoadSampleLogic] Pad data not found for index ${padIndex} on track ${track.id}`);
                throw new Error(`Pad data not found for index ${padIndex}.`);
            }
            if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'drumPadLoaded', padIndex);
        }

        track.rebuildEffectChain(); // Rebuild chain as source (buffer) might have changed
        if (localAppServices.showNotification) {
            localAppServices.showNotification(`Sample "${sourceName}" loaded for ${track.name}${trackTypeHint === 'DrumSampler' && padIndex !== null ? ` (Pad ${padIndex+1})` : ''}.`, 2000);
        }

    } catch (error) {
        console.error(`[Audio commonLoadSampleLogic] Error loading sample "${sourceName}" for track ${track.id} (${trackTypeHint}):`, error);
        if (localAppServices.showNotification) {
            localAppServices.showNotification(`Error loading "${sourceName.substring(0,30)}": ${error.message || 'Format unsupported or file corrupt.'}`, 4000);
        }
        // Update status to error
        if (trackTypeHint === 'Sampler' && track.samplerAudioData) track.samplerAudioData.status = 'error';
        else if (trackTypeHint === 'InstrumentSampler' && track.instrumentSamplerSettings) track.instrumentSamplerSettings.status = 'error';
        else if (trackTypeHint === 'DrumSampler' && padIndex !== null && track.drumSamplerPads[padIndex]) track.drumSamplerPads[padIndex].status = 'error';

        if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sampleLoadError', padIndex);
    } finally {
        if (objectURLForTone) {
            URL.revokeObjectURL(objectURLForTone);
            console.log(`[Audio commonLoadSampleLogic] Revoked ObjectURL: ${objectURLForTone}`);
        }
    }
}

export async function loadSampleFile(eventOrUrl, trackId, trackTypeHint, fileNameForUrl = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) {
        if (localAppServices.showNotification) localAppServices.showNotification(`Track ID ${trackId} not found for sample load.`, 3000);
        console.error(`[Audio loadSampleFile] Track ${trackId} not found.`);
        return;
    }
    if (trackTypeHint !== 'Sampler' && trackTypeHint !== 'InstrumentSampler') {
        if (localAppServices.showNotification) localAppServices.showNotification(`Cannot load general sample into ${trackTypeHint} track. Use specific loader if available.`, 3000);
        console.warn(`[Audio loadSampleFile] Invalid trackTypeHint: ${trackTypeHint} for general sample load.`);
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
    const isBlobEvent = eventOrUrl instanceof Blob && !(eventOrUrl instanceof File); // A File is a Blob, so ensure it's not a File

    if (isUrlSource) {
        sourceName = fileNameForUrl || eventOrUrl.split('/').pop().split('?')[0] || "loaded_sample_from_url";
        console.log(`[Audio loadSampleFile] Fetching from URL: ${eventOrUrl} as ${sourceName}`);
        try {
            const response = await fetch(eventOrUrl);
            if (!response.ok) throw new Error(`HTTP error ${response.status} fetching sample from "${eventOrUrl}"`);
            providedBlob = await response.blob();
        } catch (e) {
            console.error(`[Audio loadSampleFile] Error fetching sample from URL "${eventOrUrl}":`, e);
            if (localAppServices.showNotification) localAppServices.showNotification(`Error fetching sample "${sourceName.substring(0,30)}": ${e.message}`, 3000);
            return;
        }
    } else if (eventOrUrl && eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) { // From file input event
        providedBlob = eventOrUrl.target.files[0];
        sourceName = providedBlob.name;
        console.log(`[Audio loadSampleFile] Loading from file input: ${sourceName}`);
    } else if (isDirectFile) { // Direct File object
        providedBlob = eventOrUrl;
        sourceName = providedBlob.name;
        console.log(`[Audio loadSampleFile] Loading direct File object: ${sourceName}`);
    } else if (isBlobEvent) { // Direct Blob object (not a File)
        providedBlob = eventOrUrl;
        sourceName = fileNameForUrl || `loaded_blob_${Date.now()}.wav`; // Provide a default name
        console.log(`[Audio loadSampleFile] Loading direct Blob object: ${sourceName}`);
    }
     else {
        if (localAppServices.showNotification) localAppServices.showNotification("No file selected or invalid source for sample.", 3000);
        console.warn("[Audio loadSampleFile] No valid file source provided.");
        return;
    }

    if (!providedBlob) {
        if (localAppServices.showNotification) localAppServices.showNotification("Could not obtain file data for sample.", 3000);
        console.warn("[Audio loadSampleFile] providedBlob is null or undefined.");
        return;
    }

    const inferredType = getMimeTypeFromFilename(sourceName);
    const explicitType = providedBlob.type || inferredType; // Prioritize blob's own type
    const fileObject = new File([providedBlob], sourceName, { type: explicitType }); // Re-cast to File for consistent naming

    if (!fileObject.type.startsWith('audio/') && fileObject.type !== "application/octet-stream") { // Allow octet-stream as a fallback
        if (localAppServices.showNotification) localAppServices.showNotification(`Invalid audio file type: "${fileObject.type}". Please use common audio formats.`, 3000);
        console.warn(`[Audio loadSampleFile] Invalid file type: ${fileObject.type} for file ${sourceName}`);
        return;
    }
    if (fileObject.size === 0) {
        if (localAppServices.showNotification) localAppServices.showNotification(`Audio file "${sourceName}" is empty.`, 3000);
        console.warn(`[Audio loadSampleFile] File ${sourceName} is empty.`);
        return;
    }
    console.log(`[Audio loadSampleFile] Ready to load "${sourceName}" (Type: ${fileObject.type}, Size: ${fileObject.size}) for track ${trackId} (${trackTypeHint})`);
    await commonLoadSampleLogic(fileObject, sourceName, track, trackTypeHint, null); // null for padIndex as this is general sampler
}


export async function loadDrumSamplerPadFile(eventOrUrl, trackId, padIndex, fileNameForUrl = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track || track.type !== 'DrumSampler') {
        if (localAppServices.showNotification) localAppServices.showNotification(`Track ID ${trackId} is not a Drum Sampler. Cannot load pad.`, 3000);
        console.error(`[Audio loadDrumSamplerPadFile] Track ${trackId} not a DrumSampler.`);
        return;
    }
    if (typeof padIndex !== 'number' || isNaN(padIndex) || padIndex < 0 || padIndex >= track.drumSamplerPads.length) {
        if (localAppServices.showNotification) localAppServices.showNotification(`Invalid pad index: ${padIndex} for track ${track.name}.`, 3000);
        console.error(`[Audio loadDrumSamplerPadFile] Invalid padIndex ${padIndex} for track ${trackId}. Num pads: ${track.drumSamplerPads.length}`);
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
        console.log(`[Audio loadDrumSamplerPadFile] Fetching from URL: ${eventOrUrl} for pad ${padIndex}`);
        try {
            const response = await fetch(eventOrUrl);
            if (!response.ok) throw new Error(`HTTP error ${response.status} fetching drum sample from "${eventOrUrl}"`);
            providedBlob = await response.blob();
        } catch (e) {
            console.error(`[Audio loadDrumSamplerPadFile] Error fetching drum sample from URL "${eventOrUrl}":`, e);
            if (localAppServices.showNotification) localAppServices.showNotification(`Error fetching drum sample "${sourceName.substring(0,30)}": ${e.message}`, 3000);
            return;
        }
    } else if (eventOrUrl && eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
        providedBlob = eventOrUrl.target.files[0];
        sourceName = providedBlob.name;
        console.log(`[Audio loadDrumSamplerPadFile] Loading from file input: ${sourceName} for pad ${padIndex}`);
    } else if (isDirectFile) {
        providedBlob = eventOrUrl;
        sourceName = providedBlob.name;
        console.log(`[Audio loadDrumSamplerPadFile] Loading direct File object: ${sourceName} for pad ${padIndex}`);
    } else if (isBlobEvent) {
        providedBlob = eventOrUrl;
        sourceName = fileNameForUrl || `pad_${padIndex}_blob_${Date.now()}.wav`;
        console.log(`[Audio loadDrumSamplerPadFile] Loading direct Blob object: ${sourceName} for pad ${padIndex}`);
    }
     else {
        if (localAppServices.showNotification) localAppServices.showNotification("No file selected for drum pad or invalid source.", 3000);
        console.warn(`[Audio loadDrumSamplerPadFile] No valid file source provided for pad ${padIndex}.`);
        return;
    }

    if (!providedBlob) {
        if (localAppServices.showNotification) localAppServices.showNotification("Could not obtain drum sample data.", 3000);
        console.warn(`[Audio loadDrumSamplerPadFile] providedBlob is null or undefined for pad ${padIndex}.`);
        return;
    }

    const inferredType = getMimeTypeFromFilename(sourceName);
    const explicitType = providedBlob.type || inferredType;
    const fileObject = new File([providedBlob], sourceName, { type: explicitType });

    if (!fileObject.type.startsWith('audio/') && fileObject.type !== "application/octet-stream") {
        if (localAppServices.showNotification) localAppServices.showNotification(`Invalid audio file type for drum pad: "${fileObject.type}".`, 3000);
        console.warn(`[Audio loadDrumSamplerPadFile] Invalid file type: ${fileObject.type} for file ${sourceName} on pad ${padIndex}`);
        return;
    }
    if (fileObject.size === 0) {
        if (localAppServices.showNotification) localAppServices.showNotification(`Drum sample "${sourceName}" is empty.`, 3000);
        console.warn(`[Audio loadDrumSamplerPadFile] File ${sourceName} is empty for pad ${padIndex}.`);
        return;
    }
    console.log(`[Audio loadDrumSamplerPadFile] Ready to load "${sourceName}" (Type: ${fileObject.type}, Size: ${fileObject.size}) for track ${trackId}, pad ${padIndex}`);
    await commonLoadSampleLogic(fileObject, sourceName, track, 'DrumSampler', padIndex);
}

export async function loadSoundFromBrowserToTarget(soundData, targetTrackId, targetTrackTypeIgnored, targetPadOrSliceIndex = null) {
    const trackIdNum = parseInt(targetTrackId); // Ensure it's a number
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackIdNum) : null;

    if (!track) {
        if (localAppServices.showNotification) localAppServices.showNotification(`Target track (ID: ${targetTrackId}) not found. Cannot load sample.`, 3000);
        console.error(`[Audio loadSoundFromBrowserToTarget] Track ${targetTrackId} not found.`);
        return;
    }

    const { fullPath, libraryName, fileName } = soundData;
    const isTargetSamplerType = ['Sampler', 'InstrumentSampler', 'DrumSampler'].includes(track.type);

    if (!isTargetSamplerType) {
        if (localAppServices.showNotification) localAppServices.showNotification(`Cannot load sample to a ${track.type} track. Target must be a sampler type.`, 3000);
        console.warn(`[Audio loadSoundFromBrowserToTarget] Invalid target track type: ${track.type} for sample loading.`);
        return;
    }

    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        if (localAppServices.showNotification) localAppServices.showNotification("Audio system not ready. Please interact with the page.", 3000);
        return;
    }

    if (localAppServices.showNotification) localAppServices.showNotification(`Loading "${fileName}" to ${track.name}...`, 1500); // Shorter notification while loading
    console.log(`[Audio loadSoundFromBrowserToTarget] Loading: "${fileName}" from lib: "${libraryName}" (Path: "${fullPath}") to Track ID: ${track.id} (${track.type}), Index: ${targetPadOrSliceIndex}`);

    try {
        const loadedZips = localAppServices.getLoadedZipFiles ? localAppServices.getLoadedZipFiles() : {};
        if (!loadedZips[libraryName] || loadedZips[libraryName] === "loading") {
            throw new Error(`Library "${libraryName}" not loaded or is still loading. Please try again shortly.`);
        }
        const zipFile = loadedZips[libraryName];
        const zipEntry = zipFile.file(fullPath);
        if (!zipEntry) {
            throw new Error(`File "${fullPath}" not found in library "${libraryName}". Check path and file name (case-sensitive).`);
        }

        const fileBlobFromZip = await zipEntry.async("blob");
        const inferredMimeType = getMimeTypeFromFilename(fileName);
        // Prefer blob's own type if it's specific, otherwise use inferred, then default
        const finalMimeType = (fileBlobFromZip.type && fileBlobFromZip.type !== "application/octet-stream") ? fileBlobFromZip.type : inferredMimeType;
        const blobToLoad = new File([fileBlobFromZip], fileName, { type: finalMimeType });
        console.log(`[Audio loadSoundFromBrowserToTarget] Blob created from ZIP: Name: ${blobToLoad.name}, Type: ${blobToLoad.type}, Size: ${blobToLoad.size}`);

        if (track.type === 'DrumSampler') {
            let actualPadIndex = targetPadOrSliceIndex;
            if (typeof actualPadIndex !== 'number' || isNaN(actualPadIndex) || actualPadIndex < 0 || actualPadIndex >= track.numPads) { // Use track.numPads
                actualPadIndex = track.drumSamplerPads.findIndex(p => !p.dbKey && !p.originalFileName); // Find first empty pad
                if (actualPadIndex === -1) actualPadIndex = track.selectedDrumPadForEdit; // Fallback to selected
                if (typeof actualPadIndex !== 'number' || actualPadIndex < 0 || actualPadIndex >= track.numPads) actualPadIndex = 0; // Absolute fallback
                console.log(`[Audio loadSoundFromBrowserToTarget] Adjusted pad index for DrumSampler to: ${actualPadIndex}`);
            }
            await commonLoadSampleLogic(blobToLoad, fileName, track, 'DrumSampler', actualPadIndex);
        } else { // For Sampler or InstrumentSampler
            await commonLoadSampleLogic(blobToLoad, fileName, track, track.type, null); // padIndex is null for these
        }
    } catch (error) {
        console.error(`[Audio loadSoundFromBrowserToTarget] Error loading sound "${fileName}" from browser:`, error);
        if (localAppServices.showNotification) {
            localAppServices.showNotification(`Error loading "${fileName.substring(0,30)}": ${error.message}`, 4000);
        }
        // Optionally, update UI to reflect error on the specific target (e.g., drop zone)
        if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sampleLoadError', targetPadOrSliceIndex);
    }
}

export async function fetchSoundLibrary(libraryName, zipUrl, isAutofetch = false) {
    const loadedZips = localAppServices.getLoadedZipFiles ? { ...(localAppServices.getLoadedZipFiles()) } : {}; // Defensive copy
    const soundTrees = localAppServices.getSoundLibraryFileTrees ? { ...(localAppServices.getSoundLibraryFileTrees()) } : {}; // Defensive copy

    console.log(`[Audio fetchSoundLibrary] Attempting to fetch: ${libraryName} from ${zipUrl}. Autofetch: ${isAutofetch}. Current status: ${loadedZips[libraryName]}`);

    if (loadedZips[libraryName] && loadedZips[libraryName] !== "loading" && loadedZips[libraryName] instanceof JSZip) {
        console.log(`[Audio fetchSoundLibrary] ${libraryName} is already loaded (JSZip instance). Updating UI if not autofetch.`);
        if (!isAutofetch && localAppServices.updateSoundBrowserDisplayForLibrary) {
            localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, false, false);
        }
        return;
    }
    if (loadedZips[libraryName] === "loading") {
        console.log(`[Audio fetchSoundLibrary] ${libraryName} is currently being fetched by another call. Skipping duplicate fetch.`);
        return;
    }

    // Mark as loading and update UI immediately if it's a user-initiated fetch
    loadedZips[libraryName] = "loading";
    if (localAppServices.setLoadedZipFilesState) localAppServices.setLoadedZipFilesState(loadedZips);
    else console.error("[Audio fetchSoundLibrary] setLoadedZipFilesState service missing!");

    if (!isAutofetch && localAppServices.updateSoundBrowserDisplayForLibrary) {
        localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, true, false);
    }

    try {
        console.log(`[Audio fetchSoundLibrary] Starting HTTP fetch for ${libraryName} from ${zipUrl}`);
        const response = await fetch(zipUrl);
        console.log(`[Audio fetchSoundLibrary] HTTP Response for ${libraryName} - Status: ${response.status}, OK: ${response.ok}`);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status} fetching ZIP for ${libraryName}`);
        }
        const zipData = await response.arrayBuffer();
        console.log(`[Audio fetchSoundLibrary] Received arrayBuffer for ${libraryName}, length: ${zipData.byteLength}`);

        if (typeof JSZip === 'undefined') throw new Error("JSZip library not available.");

        const jszip = new JSZip();
        console.log(`[Audio fetchSoundLibrary] JSZip: Starting loadAsync for ${libraryName}`);
        const loadedZipInstance = await jszip.loadAsync(zipData);
        console.log(`[Audio fetchSoundLibrary] JSZip: Successfully loaded ${libraryName}. Files in zip: ${Object.keys(loadedZipInstance.files).length}`);

        // Update state with the actual JSZip instance
        const freshLoadedZips = localAppServices.getLoadedZipFiles ? { ...(localAppServices.getLoadedZipFiles()) } : {};
        freshLoadedZips[libraryName] = loadedZipInstance;
        if (localAppServices.setLoadedZipFilesState) localAppServices.setLoadedZipFilesState(freshLoadedZips);

        const fileTree = {};
        let audioFileCount = 0;
        console.log(`[Audio fetchSoundLibrary] Parsing ZIP contents for ${libraryName}...`);
        loadedZipInstance.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir || relativePath.startsWith("__MACOSX") || relativePath.includes("/.") || relativePath.startsWith(".")) {
                return; // Skip directories and meta files
            }
            const pathParts = relativePath.split('/').filter(p => p); // Clean path parts
            if (pathParts.length === 0) return;

            let currentLevel = fileTree;
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                if (i === pathParts.length - 1) { // File
                    if (part.match(/\.(wav|mp3|ogg|flac|aac|m4a)$/i)) { // Check for audio extensions
                        currentLevel[part] = { type: 'file', entry: zipEntry, fullPath: relativePath };
                        audioFileCount++;
                    }
                } else { // Directory
                    if (!currentLevel[part] || currentLevel[part].type !== 'folder') {
                        currentLevel[part] = { type: 'folder', children: {} };
                    }
                    currentLevel = currentLevel[part].children;
                }
            }
        });
        console.log(`[Audio fetchSoundLibrary] Parsed ${audioFileCount} audio files for ${libraryName}. FileTree root keys:`, Object.keys(fileTree).length);

        const freshSoundTrees = localAppServices.getSoundLibraryFileTrees ? { ...(localAppServices.getSoundLibraryFileTrees()) } : {};
        freshSoundTrees[libraryName] = fileTree;
        if (localAppServices.setSoundLibraryFileTreesState) localAppServices.setSoundLibraryFileTreesState(freshSoundTrees);

        console.log(`[Audio fetchSoundLibrary] Successfully loaded and processed library: ${libraryName}.`);
        if (localAppServices.updateSoundBrowserDisplayForLibrary) {
            localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, false, false);
        }

    } catch (error) {
        console.error(`[Audio fetchSoundLibrary] Error fetching/processing library ${libraryName} from ${zipUrl}:`, error);

        // Reset loading status on error
        const errorLoadedZipsUpdate = localAppServices.getLoadedZipFiles ? { ...(localAppServices.getLoadedZipFiles()) } : {};
        delete errorLoadedZipsUpdate[libraryName]; // Or set to 'error' : errorLoadedZipsUpdate[libraryName] = "error";
        if (localAppServices.setLoadedZipFilesState) localAppServices.setLoadedZipFilesState(errorLoadedZipsUpdate);

        const errorSoundTreesUpdate = localAppServices.getSoundLibraryFileTrees ? { ...(localAppServices.getSoundLibraryFileTrees()) } : {};
        delete errorSoundTreesUpdate[libraryName];
        if (localAppServices.setSoundLibraryFileTreesState) localAppServices.setSoundLibraryFileTreesState(errorSoundTreesUpdate);

        console.warn(`[Audio fetchSoundLibrary] State for ${libraryName} potentially cleared due to error.`);
        if (!isAutofetch && localAppServices.showNotification) {
            localAppServices.showNotification(`Error loading library ${libraryName}: ${error.message.substring(0,100)}`, 4000);
        }
        if (localAppServices.updateSoundBrowserDisplayForLibrary) {
             localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, false, true);
        }
    }
}

export function autoSliceSample(trackId, numSlicesToCreate = Constants.DEFAULT_SLICES) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded) {
        if (localAppServices.showNotification) localAppServices.showNotification("Cannot auto-slice: Load a valid sample first.", 3000);
        console.warn(`[Audio autoSliceSample] Preconditions not met for track ${trackId}. Buffer loaded: ${track?.audioBuffer?.loaded}`);
        return;
    }
    const duration = track.audioBuffer.duration;
    if (duration <= 0) {
        if (localAppServices.showNotification) localAppServices.showNotification("Cannot auto-slice: Sample has no duration.", 3000);
        console.warn(`[Audio autoSliceSample] Sample duration is zero or invalid for track ${trackId}.`);
        return;
    }

    const actualNumSlices = Math.max(Constants.MIN_SLICES, Math.min(numSlicesToCreate, Constants.MAX_SLICES));
    track.slices = []; // Reset slices
    const sliceDuration = duration / actualNumSlices;

    console.log(`[Audio autoSliceSample] Auto-slicing track ${trackId} into ${actualNumSlices} slices. Total duration: ${duration}s, Slice duration: ${sliceDuration}s`);

    for (let i = 0; i < actualNumSlices; i++) {
        track.slices.push({
            offset: i * sliceDuration,
            duration: sliceDuration,
            userDefined: false,
            volume: 0.7,
            pitchShift: 0,
            loop: false,
            reverse: false,
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 0.2 }
        });
    }
    track.selectedSliceForEdit = 0;
    track.numSlices = actualNumSlices; // Ensure track's internal count matches
    track.recreateToneSequence(true); // Update sequencer if open

    if (localAppServices.updateTrackUI) {
        localAppServices.updateTrackUI(track.id, 'sampleSliced'); // This should trigger UI redraw of pads and waveform
    }
    if (localAppServices.showNotification) localAppServices.showNotification(`Sample auto-sliced into ${actualNumSlices} parts.`, 2000);
}

export function clearAllMasterEffectNodes() {
    console.log("[Audio clearAllMasterEffectNodes] Clearing all active master effect nodes.");
    activeMasterEffectNodes.forEach((node, id) => {
        if (node && !node.disposed) {
            try {
                node.dispose();
                console.log(`[Audio clearAllMasterEffectNodes] Disposed master effect node ID ${id} ("${node.name}").`);
            } catch (e) {
                console.warn(`[Audio clearAllMasterEffectNodes] Error disposing master effect node ID ${id}:`, e.message);
            }
        }
    });
    activeMasterEffectNodes.clear();
    console.log("[Audio clearAllMasterEffectNodes] Active master effect nodes map cleared.");
    rebuildMasterEffectChain(); // Rebuild to ensure clean state (input to gain to destination)
}


// --- Audio Recording Functions ---
export async function startAudioRecording(track, isMonitoringEnabled) {
    console.log(`[Audio startAudioRecording] Attempting for track: ${track?.name}, Monitoring: ${isMonitoringEnabled}`);

    // Clean up previous instances
    if (mic) {
        console.log("[Audio startAudioRecording] Existing mic instance found. State:", mic.state);
        if (mic.state === "started") try { mic.close(); console.log("[Audio startAudioRecording] Closed existing mic."); }
        catch (e) { console.warn("[Audio startAudioRecording] Error closing existing mic:", e.message); }
        mic = null;
    }
    if (recorder) {
        console.log("[Audio startAudioRecording] Existing recorder found. State:", recorder.state, "Disposed:", recorder.disposed);
        if (recorder.state === "started") try { await recorder.stop(); console.log("[Audio startAudioRecording] Stopped existing recorder."); }
        catch (e) { console.warn("[Audio startAudioRecording] Error stopping existing recorder:", e.message); }
        if (!recorder.disposed) try { recorder.dispose(); console.log("[Audio startAudioRecording] Disposed existing recorder."); }
        catch (e) { console.warn("[Audio startAudioRecording] Error disposing existing recorder:", e.message); }
        recorder = null;
    }

    mic = new Tone.UserMedia({
        audio: {
            echoCancellation: false, autoGainControl: false, noiseSuppression: false, latency: 0.01
        }
    });
    recorder = new Tone.Recorder();
    console.log("[Audio startAudioRecording] New UserMedia and Recorder instances created.");

    if (!track || track.type !== 'Audio' || !track.inputChannel || track.inputChannel.disposed) {
        const errorMsg = `Recording init failed: Track (ID: ${track?.id}) is not a valid Audio track or its inputChannel is invalid. Type: ${track?.type}, inputChannel valid: ${!!(track?.inputChannel && !track.inputChannel.disposed)}`;
        console.error(`[Audio startAudioRecording] ${errorMsg}`);
        if (localAppServices.showNotification) localAppServices.showNotification(errorMsg, 4000);
        if (mic) try { mic.dispose(); } catch(e){} // Dispose if created
        if (recorder) try { recorder.dispose(); } catch(e){}
        mic = null; recorder = null;
        return false;
    }
    console.log(`[Audio startAudioRecording] Valid audio track for recording: ${track.name} (ID: ${track.id})`);

    try {
        console.log("[Audio startAudioRecording] Opening microphone (mic.open())...");
        await mic.open();
        console.log(`[Audio startAudioRecording] Microphone opened successfully. State: ${mic.state}, Label: ${mic.label || "N/A"}`);

        try { mic.disconnect(); } catch (e) { /* ignore if not connected anywhere */ }

        if (isMonitoringEnabled) {
            console.log("[Audio startAudioRecording] Monitoring ON. Connecting mic to track's inputChannel.");
            mic.connect(track.inputChannel);
        } else {
            console.log("[Audio startAudioRecording] Monitoring OFF.");
        }
        mic.connect(recorder);
        console.log("[Audio startAudioRecording] Mic connected to recorder.");

        console.log("[Audio startAudioRecording] Starting recorder...");
        await recorder.start();
        console.log("[Audio startAudioRecording] Recorder started successfully. State:", recorder.state);
        return true;

    } catch (error) {
        console.error("[Audio startAudioRecording] Error during microphone/recorder start:", error);
        let userMessage = `Could not start recording: ${error.message || 'Unknown error.'}`;
        if (error.name === "NotAllowedError" || error.message.toLowerCase().includes("permission denied")) {
            userMessage = "Microphone permission denied. Please allow microphone access in browser settings.";
        } else if (error.name === "NotFoundError" || error.message.toLowerCase().includes("no device")) {
            userMessage = "No microphone found. Please connect a microphone.";
        } else if (error.message.toLowerCase().includes("already starting") || error.message.toLowerCase().includes("already started")){
             userMessage = "Microphone is already in use or starting. Please wait or check other tabs.";
        }
        if (localAppServices.showNotification) localAppServices.showNotification(userMessage, 6000);

        // Cleanup on error
        if (mic) {
            if (mic.state === "started") try { mic.close(); } catch(e) { console.warn("Cleanup error closing mic:", e.message); }
            try { mic.dispose(); } catch(e){}
            mic = null;
        }
        if (recorder) {
            if (!recorder.disposed) try { recorder.dispose(); } catch(e) { console.warn("Cleanup error disposing recorder:", e.message); }
            recorder = null;
        }
        return false;
    }
}

export async function stopAudioRecording() {
    console.log("[Audio stopAudioRecording] Attempting to stop audio recording.");
    let blob = null;

    if (!recorder) {
        console.warn("[Audio stopAudioRecording] Recorder was not initialized. No recording to stop.");
        if (mic && mic.state === "started") {
            console.log("[Audio stopAudioRecording] Mic was active but recorder was null. Closing mic.");
            try { mic.close(); } catch(e) { console.warn("Error closing orphaned mic:", e.message); }
        }
        if (mic) try { mic.dispose(); } catch(e){}
        mic = null;
        return;
    }

    if (recorder.state === "started") {
        try {
            console.log("[Audio stopAudioRecording] Calling recorder.stop().");
            blob = await recorder.stop();
            console.log(`[Audio stopAudioRecording] Recorder.stop() completed. Blob received - Size: ${blob?.size}, Type: ${blob?.type}`);
        } catch (e) {
            console.error("[Audio stopAudioRecording] Error calling recorder.stop():", e);
            if (localAppServices.showNotification) localAppServices.showNotification("Error stopping recorder. Recording may be lost.", 3000);
        }
    } else {
        console.warn(`[Audio stopAudioRecording] Recorder was not in 'started' state. Current state: ${recorder.state}. No blob will be processed.`);
    }

    // Always try to clean up mic and recorder
    if (mic) {
        if (mic.state === "started") {
            console.log("[Audio stopAudioRecording] Closing and disconnecting microphone.");
            try {
                mic.disconnect(recorder); // Disconnect from recorder first
                if (localAppServices.getRecordingTrackId && localAppServices.getTrackById) { // Check if services exist
                    const recTrackId = localAppServices.getRecordingTrackId();
                    const recTrack = recTrackId !== null ? localAppServices.getTrackById(recTrackId) : null;
                    if (recTrack && recTrack.inputChannel && !recTrack.inputChannel.disposed) {
                       try { mic.disconnect(recTrack.inputChannel); } catch(e) { /* ignore if not connected */ }
                    }
                }
                mic.close();
            } catch (e) { console.warn("[Audio stopAudioRecording] Error during mic close/disconnect:", e.message); }
        }
        try { mic.dispose(); } catch(e) {}
        mic = null;
        console.log("[Audio stopAudioRecording] Mic instance disposed and nullified.");
    }

    if (recorder && !recorder.disposed) {
        console.log("[Audio stopAudioRecording] Disposing recorder instance.");
        try { recorder.dispose(); }
        catch(e) { console.warn("[Audio stopAudioRecording] Error disposing recorder:", e.message); }
    }
    recorder = null;
    console.log("[Audio stopAudioRecording] Recorder instance disposed and nullified.");

    if (blob && blob.size > 0) {
        const recordingTrackId = localAppServices.getRecordingTrackId ? localAppServices.getRecordingTrackId() : null;
        const startTime = getRecordingStartTimeState(); // This comes from state.js
        const track = recordingTrackId !== null && localAppServices.getTrackById ? localAppServices.getTrackById(recordingTrackId) : null;

        if (track && track.type === 'Audio') {
            console.log(`[Audio stopAudioRecording] Processing recorded blob for Audio Track ${track.name} (ID: ${track.id}). Original start time: ${startTime.toFixed(2)}s`);
            if (typeof track.addAudioClip === 'function') {
                await track.addAudioClip(blob, startTime);
            } else {
                console.error("[Audio stopAudioRecording] CRITICAL: Track object does not have addAudioClip method.");
                if (localAppServices.showNotification) localAppServices.showNotification("Error processing recorded audio: Internal track error.", 3000);
            }
        } else {
            console.error(`[Audio stopAudioRecording] Recorded track (ID: ${recordingTrackId}) not found or not an Audio track after stopping recorder. Blob will be discarded.`);
            if (localAppServices.showNotification) localAppServices.showNotification("Error: Recorded track invalid. Audio clip lost.", 3000);
        }
    } else if (blob && blob.size === 0) {
        console.warn("[Audio stopAudioRecording] Recording was empty (blob size 0). No clip created.");
        if (localAppServices.showNotification) localAppServices.showNotification("Recording was empty. No audio clip created.", 2000);
    } else if (!blob && recorder?.state === "started") { // This case should be rare if await recorder.stop() worked
        console.warn("[Audio stopAudioRecording] Recorder was in 'started' state but stop() did not yield a blob. This is unusual.");
    }
    console.log("[Audio stopAudioRecording] Finished stopAudioRecording process.");
}
