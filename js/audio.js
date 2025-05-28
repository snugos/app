// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading
import * as Constants from './constants.js';
import { showNotification } from './utils.js';
import { createEffectInstance, getEffectDefaultParams } from './effectsRegistry.js';
import { storeAudio, getAudio, deleteAudio } from './db.js'; // ADDED for IndexedDB

let audioContextInitialized = false;
window.masterEffectsBusInput = null;
window.masterEffectsChain = [];
let masterGainNode = null;
window.masterGainNode = masterGainNode; // Ensure it's available if needed globally

console.log("[Audio.js] Initializing. window.masterEffectsChain declared as (structure):", (window.masterEffectsChain || []).map(e => ({id: e.id, type: e.type, params: e.params, toneNodeExists: !!e.toneNode})));

/**
 * Initializes the AudioContext and master meter if not already done.
 * Sets up the master audio bus.
 * @param {boolean} [isUserInitiated=false] - Whether this call is a direct result of user interaction.
 * @returns {Promise<boolean>} True if audio context is ready, false otherwise.
 */
export async function initAudioContextAndMasterMeter(isUserInitiated = false) {
    console.log(`[Audio] initAudioContextAndMasterMeter called. isUserInitiated: ${isUserInitiated}, audioContextInitialized: ${audioContextInitialized}, Tone.context.state: ${Tone.context?.state}`);
    if (audioContextInitialized && Tone.context.state === 'running') {
        if (!window.masterEffectsBusInput || window.masterEffectsBusInput.disposed || !masterGainNode || masterGainNode.disposed) {
            console.log("[Audio] initAudioContextAndMasterMeter: Master bus nodes missing or disposed, re-setting up master bus.");
            setupMasterBus();
        } else {
            console.log("[Audio] initAudioContextAndMasterMeter: Audio context already running and master bus nodes seem OK.");
        }
        return true;
    }
    try {
        await Tone.start();
        console.log("[Audio] Tone.start() successful. Context state:", Tone.context.state);
        if (Tone.context.state === 'running') {
            setupMasterBus();

            if (window.masterGainNode && !window.masterGainNode.disposed) {
                if (!window.masterMeter || window.masterMeter.disposed) {
                    window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
                    console.log("[Audio] NEW masterMeter created.");
                }
                try { window.masterGainNode.disconnect(window.masterMeter); } catch(e) {/*ignore*/}
                window.masterGainNode.connect(window.masterMeter);
                console.log("[Audio] Master meter connected to masterGainNode.");
            }

            audioContextInitialized = true;
            console.log("[Audio] initAudioContextAndMasterMeter: Audio context started and initialized successfully.");
            return true;
        } else {
            if (isUserInitiated) {
                showNotification("AudioContext could not be started even with user interaction.", 5000);
            } else {
                showNotification("Audio system needs a user interaction (like clicking Play) to start.", 4000);
            }
            console.warn("[Audio] initAudioContextAndMasterMeter: Tone.context.state is not 'running' after Tone.start().");
            audioContextInitialized = false;
            return false;
        }
    } catch (error) {
        console.error("[Audio] Error during Tone.start() or meter setup:", error);
        showNotification("Error initializing audio. Please check permissions and refresh.", 4000);
        audioContextInitialized = false;
        return false;
    }
}

/**
 * Sets up the master audio bus, including the input node for track effects
 * and the final master gain node.
 */
function setupMasterBus() {
    console.log("[Audio - setupMasterBus] Called.");
    if (!window.masterEffectsBusInput || window.masterEffectsBusInput.disposed) {
        if (window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed) {
             try {window.masterEffectsBusInput.dispose();} catch(e){console.warn("[Audio - setupMasterBus] Error disposing old master bus input", e.message)}
        }
        window.masterEffectsBusInput = new Tone.Gain();
        console.log("[Audio - setupMasterBus] Created NEW window.masterEffectsBusInput:", window.masterEffectsBusInput);
    } else {
        console.log("[Audio - setupMasterBus] Using existing window.masterEffectsBusInput.");
    }

    if (!masterGainNode || masterGainNode.disposed) {
        if (masterGainNode && !masterGainNode.disposed) {
            try {masterGainNode.dispose();} catch(e){console.warn("[Audio - setupMasterBus] Error disposing old master gain node", e.message)}
        }
        masterGainNode = new Tone.Gain();
        window.masterGainNode = masterGainNode;
        console.log("[Audio - setupMasterBus] Created NEW masterGainNode (and exposed to window):", masterGainNode);
    } else {
        if (!window.masterGainNode || window.masterGainNode.disposed) window.masterGainNode = masterGainNode;
        console.log("[Audio - setupMasterBus] Using existing masterGainNode.");
    }

    rebuildMasterEffectChain();
}

/**
 * Rebuilds the master effect chain, connecting masterEffectsBusInput through
 * all active master effects to the masterGainNode, and then to destination.
 */
export function rebuildMasterEffectChain() {
    console.log("[Audio - rebuildMasterEffectChain] Called.");

    if (!window.masterEffectsBusInput || window.masterEffectsBusInput.disposed || !masterGainNode || masterGainNode.disposed) {
        console.warn("[Audio - rebuildMasterEffectChain] Master bus nodes are not valid. Forcing setupMasterBus.");
        setupMasterBus(); // This will call rebuildMasterEffectChain again, so return to avoid infinite loop if setupMasterBus fails.
        return;
    }

    console.log("[Audio - rebuildMasterEffectChain] Current window.masterEffectsChain (structure):", (window.masterEffectsChain || []).map(e => ({id: e.id, type: e.type, params: e.params, toneNodeExists: !!e.toneNode})));
    console.log(`[Audio - rebuildMasterEffectChain] masterEffectsBusInput valid: ${!!window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed}, masterGainNode valid: ${!!masterGainNode && !masterGainNode.disposed}`);

    try {
        window.masterEffectsBusInput.disconnect();
        console.log("[Audio - rebuildMasterEffectChain] Disconnected all outputs from masterEffectsBusInput.");
    } catch(e) { console.warn(`[Audio - rebuildMasterEffectChain] Minor error disconnecting masterEffectsBusInput: ${e.message}`);}

    (window.masterEffectsChain || []).forEach((effectWrapper, index) => {
        if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
            try {
                effectWrapper.toneNode.disconnect();
                console.log(`[Audio - rebuildMasterEffectChain] Disconnected all outputs from effect ${index}: ${effectWrapper.type}`);
            } catch (e) { console.warn(`[Audio - rebuildMasterEffectChain] Minor error disconnecting effect ${effectWrapper.type}: ${e.message}`); }
        }
    });
    try {
        masterGainNode.disconnect();
        console.log("[Audio - rebuildMasterEffectChain] Disconnected all outputs from masterGainNode.");
    } catch(e) { console.warn(`[Audio - rebuildMasterEffectChain] Minor error disconnecting masterGainNode: ${e.message}`);}


    let currentAudioPathEnd = window.masterEffectsBusInput;
    console.log(`[Audio - rebuildMasterEffectChain] Chain Rebuild: Starting audio path with masterEffectsBusInput (${currentAudioPathEnd?.constructor.name})`);

    (window.masterEffectsChain || []).forEach((effectWrapper, index) => {
        if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
            if (currentAudioPathEnd && !currentAudioPathEnd.disposed) {
                try {
                    console.log(`[Audio - rebuildMasterEffectChain] Master Chain: Connecting ${currentAudioPathEnd.constructor.name} to effect ${index + 1} (${effectWrapper.type})`);
                    currentAudioPathEnd.connect(effectWrapper.toneNode);
                    currentAudioPathEnd = effectWrapper.toneNode;
                } catch (e) {
                    console.error(`[Audio - rebuildMasterEffectChain] Error connecting ${currentAudioPathEnd.constructor.name} to ${effectWrapper.type}:`, e);
                }
            } else {
                 console.warn(`[Audio - rebuildMasterEffectChain] currentAudioPathEnd is invalid before connecting effect ${effectWrapper.type}. Setting effect as new start.`);
                 currentAudioPathEnd = effectWrapper.toneNode;
            }
        } else {
            console.warn(`[Audio - rebuildMasterEffectChain] Effect ${index} (${effectWrapper.type}) has invalid or disposed toneNode.`);
        }
    });

    if (masterGainNode && !masterGainNode.disposed) {
        if (currentAudioPathEnd && !currentAudioPathEnd.disposed) {
             try {
                console.log(`[Audio - rebuildMasterEffectChain] Master Chain: Connecting ${currentAudioPathEnd.constructor.name} to MasterGainNode`);
                currentAudioPathEnd.connect(masterGainNode);
            } catch (e) {
                console.error(`[Audio - rebuildMasterEffectChain] Error connecting output of effects chain (${currentAudioPathEnd.constructor.name}) to masterGainNode:`, e);
            }
        } else {
            console.log("[Audio - rebuildMasterEffectChain] No valid effects output or currentAudioPathEnd is masterEffectsBusInput itself, connecting masterEffectsBusInput directly to masterGainNode.");
            try {
                if (window.masterEffectsBusInput !== masterGainNode) { // Avoid self-connection
                    window.masterEffectsBusInput.connect(masterGainNode);
                }
            } catch (e) {
                 console.error(`[Audio - rebuildMasterEffectChain] Error connecting masterEffectsBusInput directly to masterGainNode:`, e);
            }
        }
        try {
            masterGainNode.toDestination();
            console.log("[Audio - rebuildMasterEffectChain] masterGainNode re-connected to Tone.Destination.");
            if (window.masterMeter && !window.masterMeter.disposed) {
                try { masterGainNode.disconnect(window.masterMeter); } catch(e) {/* ignore */}
                masterGainNode.connect(window.masterMeter);
                console.log("[Audio - rebuildMasterEffectChain] masterGainNode re-connected to existing masterMeter.");
            } else {
                window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
                masterGainNode.connect(window.masterMeter);
                console.log("[Audio - rebuildMasterEffectChain] masterGainNode connected to NEW masterMeter (as old one was invalid).");
            }
        } catch (e) { console.error("[Audio - rebuildMasterEffectChain] Error connecting masterGainNode to destination or meter:", e); }
    } else {
        console.error("[Audio - rebuildMasterEffectChain] masterGainNode is invalid. Cannot complete master audio path.");
    }
    console.log(`[Audio - rebuildMasterEffectChain] Master chain rebuild finished.`);

    if (typeof window.getTracks === 'function') {
        const currentTracks = window.getTracks();
        console.log(`[Audio - rebuildMasterEffectChain] Triggering rebuildEffectChain for ${currentTracks.length} tracks to ensure they connect to the updated master bus.`);
        currentTracks.forEach(track => {
            if (track && typeof track.rebuildEffectChain === 'function') {
                console.log(`[Audio - rebuildMasterEffectChain] Calling rebuildEffectChain for track ${track.id} (${track.name})`);
                track.rebuildEffectChain();
            }
        });
    }
}

/**
 * Adds a new effect to the master effect chain.
 * @param {string} effectType - The type of effect to add (key from AVAILABLE_EFFECTS).
 * @returns {string|null} The ID of the added effect, or null if failed.
 */
export function addMasterEffect(effectType) {
    console.log(`[Audio - addMasterEffect] Attempting to add effect: ${effectType}`);
    if (typeof window.captureStateForUndo === 'function') {
        window.captureStateForUndo(`Add ${effectType} to Master`);
    }
    const defaultParams = getEffectDefaultParams(effectType);
    const toneNode = createEffectInstance(effectType, defaultParams);
    if (toneNode) {
        const effectId = `mastereffect_${effectType}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        if(!window.masterEffectsChain) {
            console.warn("[Audio - addMasterEffect] window.masterEffectsChain was undefined, initializing.");
            window.masterEffectsChain = [];
        }
        window.masterEffectsChain.push({
            id: effectId, type: effectType, toneNode: toneNode, params: JSON.parse(JSON.stringify(defaultParams))
        });
        console.log(`[Audio - addMasterEffect] Effect ${effectType} (ID: ${effectId}) added to masterEffectsChain. New chain (structure):`, window.masterEffectsChain.map(e => ({id: e.id, type: e.type, params: e.params, toneNodeExists: !!e.toneNode})));
        rebuildMasterEffectChain();
        return effectId;
    }
    console.warn(`[Audio - addMasterEffect] Failed to create master effect instance for ${effectType}`);
    return null;
}

/**
 * Removes an effect from the master effect chain by its ID.
 * @param {string} effectId - The ID of the effect to remove.
 */
export function removeMasterEffect(effectId) {
    console.log(`[Audio - removeMasterEffect] Attempting to remove effect ID: ${effectId}`);
    if(!window.masterEffectsChain) window.masterEffectsChain = [];
    const effectIndex = window.masterEffectsChain.findIndex(e => e.id === effectId);
    if (effectIndex > -1) {
        const effectToRemove = window.masterEffectsChain[effectIndex];
        console.log(`[Audio - removeMasterEffect] Found effect to remove (structure):`, {id: effectToRemove.id, type: effectToRemove.type, params: effectToRemove.params});
        if (typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Remove ${effectToRemove.type} from Master`);
        }
        if (effectToRemove.toneNode && !effectToRemove.toneNode.disposed) {
            effectToRemove.toneNode.dispose();
            console.log(`[Audio - removeMasterEffect] Disposed ToneNode for ${effectToRemove.type}`);
        }
        window.masterEffectsChain.splice(effectIndex, 1);
        console.log(`[Audio - removeMasterEffect] Effect removed. New chain (structure):`, window.masterEffectsChain.map(e => ({id: e.id, type: e.type, params: e.params, toneNodeExists: !!e.toneNode})));
        rebuildMasterEffectChain();
    } else {
        console.warn(`[Audio - removeMasterEffect] Effect ID ${effectId} not found in masterEffectsChain.`);
    }
}

/**
 * Updates a parameter of a specific master effect.
 * @param {string} effectId - The ID of the effect to update.
 * @param {string} paramPath - The path to the parameter (e.g., "frequency", "filter.Q").
 * @param {*} value - The new value for the parameter.
 */
export function updateMasterEffectParam(effectId, paramPath, value) {
    console.log(`[Audio - updateMasterEffectParam] Updating param for effect ID: ${effectId}, Path: ${paramPath}, Value: ${value}`);
    if (!window.masterEffectsChain) window.masterEffectsChain = [];
    const effectWrapper = window.masterEffectsChain.find(e => e.id === effectId);
    if (!effectWrapper || !effectWrapper.toneNode || effectWrapper.toneNode.disposed) {
        console.warn(`[Audio - updateMasterEffectParam] Master Effect node not found or disposed for ID: ${effectId} while trying to update ${paramPath}.`);
        return;
    }

    console.log(`[Audio - updateMasterEffectParam] Found effect wrapper (structure):`, {id: effectWrapper.id, type: effectWrapper.type, params: effectWrapper.params});
    const keys = paramPath.split('.');
    let currentStoredParamLevel = effectWrapper.params;
    for (let i = 0; i < keys.length - 1; i++) {
        currentStoredParamLevel[keys[i]] = currentStoredParamLevel[keys[i]] || {};
        currentStoredParamLevel = currentStoredParamLevel[keys[i]];
    }
    currentStoredParamLevel[keys[keys.length - 1]] = value;
    console.log(`[Audio - updateMasterEffectParam] Updated effectWrapper.params:`, JSON.parse(JSON.stringify(effectWrapper.params)));

    try {
        let targetObject = effectWrapper.toneNode;
        for (let i = 0; i < keys.length - 1; i++) {
            targetObject = targetObject[keys[i]];
            if (typeof targetObject === 'undefined') {
                throw new Error(`Nested object for path "${keys.slice(0, i + 1).join('.')}" not found on Tone node.`);
            }
        }
        const finalParamKey = keys[keys.length - 1];
        const paramInstance = targetObject[finalParamKey];

        if (typeof paramInstance !== 'undefined') {
            if (paramInstance && typeof paramInstance.value !== 'undefined') { // It's a Signal or AudioParam
                if (typeof paramInstance.rampTo === 'function') {
                    paramInstance.rampTo(value, 0.02);
                } else {
                    paramInstance.value = value;
                }
            } else { // Direct property
                targetObject[finalParamKey] = value;
            }
             console.log(`[Audio - updateMasterEffectParam] Successfully updated ToneNode param ${paramPath}.`);
        } else if (typeof effectWrapper.toneNode.set === 'function' && keys.length > 0) { // Fallback to .set if property not directly found
            const setObj = {};
            let currentLevelForSet = setObj;
            for(let i = 0; i < keys.length - 1; i++){
                currentLevelForSet[keys[i]] = {};
                currentLevelForSet = currentLevelForSet[keys[i]];
            }
            currentLevelForSet[finalParamKey] = value;
            effectWrapper.toneNode.set(setObj);
            console.log(`[Audio - updateMasterEffectParam] Successfully updated ToneNode param ${paramPath} using .set().`);
        } else {
            console.warn(`[Audio - updateMasterEffectParam] Cannot set param "${paramPath}" on master effect ${effectWrapper.type}. Property or .set() method not available. Target object:`, targetObject, "Final Key:", finalParamKey);
        }
    } catch (err) {
        console.error(`[Audio - updateMasterEffectParam] Error updating param ${paramPath} for master effect ${effectWrapper.type}:`, err, "Value:", value, "Effect Node:", effectWrapper.toneNode);
    }
}

/**
 * Reorders an effect in the master effect chain.
 * @param {string} effectId - The ID of the effect to move.
 * @param {number} newIndex - The new index for the effect in the chain.
 */
export function reorderMasterEffect(effectId, newIndex) {
    console.log(`[Audio - reorderMasterEffect] Reordering effect ID: ${effectId} to newIndex: ${newIndex}`);
    if(!window.masterEffectsChain) window.masterEffectsChain = [];
    const oldIndex = window.masterEffectsChain.findIndex(e => e.id === effectId);
     if (oldIndex === -1 ) {
        console.warn(`[Audio - reorderMasterEffect] Effect ID ${effectId} not found. Cannot reorder.`);
        return;
     }
     if (oldIndex === newIndex ) {
        console.log(`[Audio - reorderMasterEffect] Old index ${oldIndex} is same as new index ${newIndex}. No reorder needed.`);
        return;
     }

    const maxValidInsertIndex = window.masterEffectsChain.length; // Can insert at the end
    const clampedNewIndex = Math.max(0, Math.min(newIndex, maxValidInsertIndex));
    console.log(`[Audio - reorderMasterEffect] Old index: ${oldIndex}, Requested newIndex: ${newIndex}, Clamped newIndex for splice: ${clampedNewIndex}`);


    if (typeof window.captureStateForUndo === 'function') {
        window.captureStateForUndo(`Reorder Master effect`);
    }
    const [effectToMove] = window.masterEffectsChain.splice(oldIndex, 1);
    window.masterEffectsChain.splice(clampedNewIndex, 0, effectToMove); // Corrected splice index

    console.log(`[Audio - reorderMasterEffect] Reordered master effect. New order (structure):`, window.masterEffectsChain.map(e=>({id: e.id, type: e.type})));
    rebuildMasterEffectChain();
}


/**
 * Updates visual meter elements for master and track levels.
 * @param {HTMLElement} masterMeterVisualElement - The main master meter bar element (e.g., in global controls).
 * @param {HTMLElement} masterMeterBarVisualElement - (Potentially redundant if same as above) The bar part of the master meter.
 * @param {HTMLElement} mixerMasterMeterVisualElement - The master meter bar element in the mixer window.
 * @param {Array<Track>} tracks - An array of track objects.
 */
export function updateMeters(masterMeterVisualElement, masterMeterBarVisualElement, mixerMasterMeterVisualElement, tracks) {
    if (Tone.context.state !== 'running' || !audioContextInitialized) return;

    if (window.masterMeter && typeof window.masterMeter.getValue === 'function') {
        const masterLevelValue = window.masterMeter.getValue();
        const level = Tone.dbToGain(masterLevelValue); // Convert dB to gain (0-1 range, can exceed 1)
        const isClipping = masterLevelValue > -0.1; // Clipping threshold in dB

        // Use masterMeterBarVisualElement if it's distinct, otherwise masterMeterVisualElement
        const mainMasterBar = masterMeterBarVisualElement || masterMeterVisualElement?.querySelector('.meter-bar');
        if (mainMasterBar) {
            mainMasterBar.style.width = `${Math.min(100, Math.max(0, level * 100))}%`;
            mainMasterBar.classList.toggle('clipping', isClipping);
        }

        const mixerWindow = window.openWindows ? window.openWindows['mixer'] : null;
        if (mixerMasterMeterVisualElement && mixerWindow && mixerWindow.element && !mixerWindow.isMinimized) {
            mixerMasterMeterVisualElement.style.width = `${Math.min(100, Math.max(0, level * 100))}%`;
            mixerMasterMeterVisualElement.classList.toggle('clipping', isClipping);
        }
    }

    (tracks || []).forEach(track => {
        if (track && track.trackMeter && typeof track.trackMeter.getValue === 'function') {
            const meterValue = track.trackMeter.getValue();
            const level = Tone.dbToGain(meterValue);
            const isClipping = meterValue > -0.1;

            if (track.inspectorWindow && track.inspectorWindow.element && !track.inspectorWindow.isMinimized) {
                const inspectorMeterBar = track.inspectorWindow.element.querySelector(`#trackMeterBar-${track.id}`);
                if (inspectorMeterBar) {
                    inspectorMeterBar.style.width = `${Math.min(100, Math.max(0, level * 100))}%`;
                    inspectorMeterBar.classList.toggle('clipping', isClipping);
                }
            }
            const mixerWindow = window.openWindows ? window.openWindows['mixer'] : null;
            if (mixerWindow && mixerWindow.element && !mixerWindow.isMinimized) {
                const mixerMeterBar = mixerWindow.element.querySelector(`#mixerTrackMeterBar-${track.id}`);
                 if (mixerMeterBar) {
                    mixerMeterBar.style.width = `${Math.min(100, Math.max(0, level * 100))}%`;
                    mixerMeterBar.classList.toggle('clipping', isClipping);
                }
            }
        }
    });
}

/**
 * Plays a preview of a sampler slice.
 * @param {number} trackId - The ID of the sampler track.
 * @param {number} sliceIndex - The index of the slice to play.
 * @param {number} [velocity=0.7] - The velocity to play the slice at.
 * @param {number} [additionalPitchShiftInSemitones=0] - Additional pitch shift for preview.
 */
export async function playSlicePreview(trackId, sliceIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0) {
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio not ready for preview.", 2000); return; }
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : (window.tracks || []);
    const track = tracksArray.find(t => t.id === trackId);

    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded || !track.slices[sliceIndex]) {
        console.warn(`[Audio] playSlicePreview: Conditions not met for track ${trackId}, slice ${sliceIndex}.`);
        return;
    }
    const sliceData = track.slices[sliceIndex];
    if (sliceData.duration <= 0) return;
    const time = Tone.now();
    const totalPitchShift = (sliceData.pitchShift || 0) + additionalPitchShiftInSemitones;
    const playbackRate = Math.pow(2, totalPitchShift / 12);
    let playDuration = sliceData.duration / playbackRate;
    if (sliceData.loop) playDuration = Math.min(playDuration, 2); // Limit looped preview duration

    // Determine the correct destination node within the track's effect chain
    const firstEffectNodeInTrack = track.activeEffects.length > 0 ? track.activeEffects[0].toneNode : track.gainNode;
    const actualDestination = (firstEffectNodeInTrack && !firstEffectNodeInTrack.disposed) ? firstEffectNodeInTrack : (window.masterEffectsBusInput || Tone.getDestination());

    if (!track.slicerIsPolyphonic) {
        // Mono slicer logic
        if (!track.slicerMonoPlayer || track.slicerMonoPlayer.disposed) {
            track.setupSlicerMonoNodes(); // This should connect to the effect chain start
            if(!track.slicerMonoPlayer) { console.warn("[Audio] Mono player not set up after setupSlicerMonoNodes."); return; }
             if(track.audioBuffer && track.audioBuffer.loaded) track.slicerMonoPlayer.buffer = track.audioBuffer;
        }
        const player = track.slicerMonoPlayer; const env = track.slicerMonoEnvelope; const gain = track.slicerMonoGain;

        // Ensure mono nodes are connected to the track's output chain (or master bus if no effects)
        // This connection should ideally be handled in setupSlicerMonoNodes or rebuildEffectChain
        if (player && env && gain && actualDestination) {
            try {
                player.disconnect(); gain.disconnect(); // Disconnect previous connections
                player.chain(env, gain, actualDestination);
            } catch (e) { console.warn("Error re-chaining mono slicer nodes for preview:", e); }
        } else {
            console.warn("Mono slicer nodes or destination invalid for preview."); return;
        }


        if (player.state === 'started') player.stop(time);
        if (env.getValueAtTime(time) > 0.001) env.triggerRelease(time); // Ensure previous envelope is released

        player.buffer = track.audioBuffer; env.set(sliceData.envelope);
        gain.gain.value = Tone.dbToGain(-6) * sliceData.volume * velocity; // Apply some headroom
        player.playbackRate = playbackRate; player.reverse = sliceData.reverse;
        player.loop = sliceData.loop; player.loopStart = sliceData.offset; player.loopEnd = sliceData.offset + sliceData.duration;

        player.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
        env.triggerAttack(time);
        if (!sliceData.loop) {
            const releaseTime = time + playDuration - (sliceData.envelope.release || 0.1);
            env.triggerRelease(Math.max(time, releaseTime)); // Ensure release doesn't happen before attack
        }
    } else {
        // Polyphonic slicer logic (temporary player)
        const tempPlayer = new Tone.Player(track.audioBuffer);
        const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
        const tempGain = new Tone.Gain(Tone.dbToGain(-6) * sliceData.volume * velocity); // Apply some headroom

        tempPlayer.chain(tempEnv, tempGain, actualDestination);

        tempPlayer.playbackRate = playbackRate; tempPlayer.reverse = sliceData.reverse;
        tempPlayer.loop = sliceData.loop; tempPlayer.loopStart = sliceData.offset; tempPlayer.loopEnd = sliceData.offset + sliceData.duration;

        tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
        tempEnv.triggerAttack(time);
        if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95); // Slightly before sound ends

        // Schedule disposal
        Tone.Transport.scheduleOnce(() => {
            if(tempPlayer && !tempPlayer.disposed) tempPlayer.dispose();
            if(tempEnv && !tempEnv.disposed) tempEnv.dispose();
            if(tempGain && !tempGain.disposed) tempGain.dispose();
        }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2); // Add release tail + buffer
    }
}

/**
 * Plays a preview of a drum sampler pad.
 * @param {number} trackId - The ID of the drum sampler track.
 * @param {number} padIndex - The index of the pad to play.
 * @param {number} [velocity=0.7] - The velocity to play the pad at.
 * @param {number} [additionalPitchShiftInSemitones=0] - Additional pitch shift for preview.
 */
export async function playDrumSamplerPadPreview(trackId, padIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0) {
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio not ready for preview.", 2000); return; }
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : (window.tracks || []);
    const track = tracksArray.find(t => t.id === trackId);

    if (!track || track.type !== 'DrumSampler' || !track.drumPadPlayers[padIndex] || !track.drumPadPlayers[padIndex].loaded) {
        console.warn(`[Audio] playDrumSamplerPadPreview: Conditions not met. Track: ${!!track}, Type: ${track?.type}, Player ${padIndex} exists: ${!!track?.drumPadPlayers[padIndex]}, Player loaded: ${track?.drumPadPlayers[padIndex]?.loaded}`);
        return;
    }
    const player = track.drumPadPlayers[padIndex];
    const padData = track.drumSamplerPads[padIndex];

    // Ensure player is connected through the track's effect chain
    // This should be handled by track.rebuildEffectChain() when the player is created/loaded.
    // For preview, we assume it's correctly routed.

    player.volume.value = Tone.gainToDb(padData.volume * velocity * 0.5); // Apply some headroom for preview
    const totalPadPitchShift = (padData.pitchShift || 0) + additionalPitchShiftInSemitones;
    player.playbackRate = Math.pow(2, totalPadPitchShift / 12);

    player.start(Tone.now());
}

/**
 * Infers a MIME type from a filename extension.
 * @param {string} filename - The filename.
 * @returns {string} The inferred MIME type or "application/octet-stream".
 */
export function getMimeTypeFromFilename(filename) {
    if (!filename || typeof filename !== 'string') return "application/octet-stream";
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.endsWith(".wav")) return "audio/wav";
    if (lowerFilename.endsWith(".mp3")) return "audio/mpeg";
    if (lowerFilename.endsWith(".ogg")) return "audio/ogg";
    if (lowerFilename.endsWith(".flac")) return "audio/flac";
    if (lowerFilename.endsWith(".aac")) return "audio/aac";
    if (lowerFilename.endsWith(".m4a")) return "audio/mp4"; // Common for AAC in MP4 container
    console.warn(`[Audio - getMimeTypeFromFilename] Could not infer MIME type for: ${filename}, returning octet-stream.`);
    return "application/octet-stream"; // Default fallback
}

/**
 * Generates a unique key for storing audio in IndexedDB.
 * @param {number} trackId - The ID of the track.
 * @param {string} originalFileName - The original name of the file.
 * @param {string} typeHint - The type of track or usage (e.g., 'Sampler', 'DrumSampler').
 * @param {number|null} [padIndex=null] - Optional pad index for drum samplers.
 * @returns {string} A unique key string.
 */
function generateAudioDbKey(trackId, originalFileName, typeHint, padIndex = null) {
    const timestamp = Date.now();
    // Sanitize filename: replace non-alphanumeric (excluding _, ., -) with underscore
    const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    let key = `track-${trackId}-${typeHint}-${sanitizedFileName}-${timestamp}`;
    if (padIndex !== null) {
        key = `track-${trackId}-${typeHint}-pad-${padIndex}-${sanitizedFileName}-${timestamp}`;
    }
    return key.slice(0, 250); // Keep keys reasonably short, IndexedDB keys can be long but good practice
}


/**
 * Loads an audio sample file into a Sampler or InstrumentSampler track.
 * Stores the audio Blob in IndexedDB and updates the track with a reference key.
 * @param {Event|string|File|Blob} eventOrUrlOrFile - File input event, URL string, or File/Blob object.
 * @param {number} trackId - The ID of the target track.
 * @param {string} trackTypeHint - 'Sampler' or 'InstrumentSampler'.
 * @param {string|null} [fileNameForUrl=null] - Filename to use if eventOrUrl is a URL.
 */
export async function loadSampleFile(eventOrUrlOrFile, trackId, trackTypeHint, fileNameForUrl = null) {
    console.log(`[Audio - loadSampleFile] Called. TrackID: ${trackId}, TypeHint: ${trackTypeHint}, FileNameForURL: ${fileNameForUrl}`);
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : (window.tracks || []);
    const track = tracksArray.find(t => t.id === trackId);

    if (!track) {
        showNotification(`Track ID ${trackId} not found.`, 3000);
        return;
    }
    if (trackTypeHint !== 'Sampler' && trackTypeHint !== 'InstrumentSampler') {
        showNotification(`Cannot load sample into ${trackTypeHint} track.`, 3000);
        return;
    }

    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        showNotification("Audio system not ready. Please interact with the app and try again.", 3000);
        return;
    }

    let fileObjectToStore; // This will be the File/Blob to store in IndexedDB
    let sourceName;

    const isUrlSource = typeof eventOrUrlOrFile === 'string';
    const isDirectFile = eventOrUrlOrFile instanceof File;
    const isBlobSource = eventOrUrlOrFile instanceof Blob; // Catches Files too, but File check is more specific

    if (isUrlSource) {
        sourceName = fileNameForUrl || eventOrUrlOrFile.split('/').pop().split('?')[0] || "loaded_sample_from_url";
        console.log(`[Audio - loadSampleFile] URL source. sourceName: ${sourceName}, URL: ${eventOrUrlOrFile}`);
        try {
            const response = await fetch(eventOrUrlOrFile);
            if (!response.ok) throw new Error(`Fetch failed for ${eventOrUrlOrFile}: ${response.statusText} (${response.status})`);
            const blob = await response.blob();
            fileObjectToStore = new File([blob], sourceName, { type: blob.type || getMimeTypeFromFilename(sourceName) });
            console.log(`[Audio - loadSampleFile] Fetched blob from URL. Type: '${fileObjectToStore.type}', Size: ${fileObjectToStore.size}`);
        } catch (e) {
            console.error(`[Audio - loadSampleFile] Error fetching sample from URL ${eventOrUrlOrFile}:`, e);
            showNotification(`Error fetching sample: ${e.message}`, 3000); return;
        }
    } else if (eventOrUrlOrFile && eventOrUrlOrFile.target && eventOrUrlOrFile.target.files && eventOrUrlOrFile.target.files.length > 0) { // File Input Event
        fileObjectToStore = eventOrUrlOrFile.target.files[0];
        sourceName = fileObjectToStore.name;
        console.log(`[Audio - loadSampleFile] File input source. sourceName: ${sourceName}, Type: '${fileObjectToStore.type}'`);
    } else if (isDirectFile) { // Direct File object
        fileObjectToStore = eventOrUrlOrFile;
        sourceName = fileObjectToStore.name;
        console.log(`[Audio - loadSampleFile] Direct File object source. sourceName: ${sourceName}, Type: '${fileObjectToStore.type}'`);
    } else if (isBlobSource) { // Direct Blob object (could be a File, handled by above, or a generic Blob)
        fileObjectToStore = eventOrUrlOrFile;
        sourceName = fileNameForUrl || "loaded_blob_sample";
        // Ensure it's a File object for consistent naming and type handling
        if (!(fileObjectToStore instanceof File)) {
            fileObjectToStore = new File([fileObjectToStore], sourceName, { type: fileObjectToStore.type || getMimeTypeFromFilename(sourceName) });
        }
        console.log(`[Audio - loadSampleFile] Direct Blob object source. sourceName: ${sourceName}, Type: '${fileObjectToStore.type}'`);
    } else {
        showNotification("No file selected or invalid source provided.", 3000);
        console.error("[Audio - loadSampleFile] No valid file source provided.");
        return;
    }

    if (!fileObjectToStore) {
        showNotification("Could not obtain file data.", 3000);
        console.error("[Audio - loadSampleFile] fileObjectToStore is null or undefined after source processing.");
        return;
    }
     if (!fileObjectToStore.type || (!fileObjectToStore.type.startsWith('audio/') && fileObjectToStore.type !== "application/octet-stream" && !getMimeTypeFromFilename(sourceName).startsWith('audio/'))) {
        showNotification(`Invalid audio file type: "${fileObjectToStore.type || getMimeTypeFromFilename(sourceName) || 'unknown'}". Please use WAV, MP3, OGG etc.`, 3000);
        console.error(`[Audio - loadSampleFile] Final fileObjectToStore type is invalid: ${fileObjectToStore.type}, inferred: ${getMimeTypeFromFilename(sourceName)}`);
        return;
    }
    if (fileObjectToStore.size === 0) { showNotification(`Audio file "${sourceName}" is empty.`, 3000); return; }

    if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Load ${sourceName} to ${track.name}`);

    let objectURLForTone = null;

    try {
        objectURLForTone = URL.createObjectURL(fileObjectToStore);
        console.log(`[Audio - loadSampleFile] Object URL for Tone.Buffer: ${objectURLForTone} (from File with type: ${fileObjectToStore.type})`);

        const newAudioBuffer = await new Tone.Buffer().load(objectURLForTone);
        console.log(`[Audio - loadSampleFile] Tone.Buffer loaded successfully for "${sourceName}". Duration: ${newAudioBuffer.duration}`);

        const audioDbKey = generateAudioDbKey(track.id, sourceName, trackTypeHint);
        await storeAudio(audioDbKey, fileObjectToStore); // Store the original File object (Blob)
        console.log(`[Audio - loadSampleFile] Stored "${sourceName}" in IndexedDB with key: ${audioDbKey}`);

        if (trackTypeHint === 'Sampler') {
            if (track.audioBuffer && !track.audioBuffer.disposed) track.audioBuffer.dispose();
            if (track.samplerAudioData?.audioDbKey && track.samplerAudioData.audioDbKey !== audioDbKey) { // Delete old if exists and key is different
                await deleteAudio(track.samplerAudioData.audioDbKey).catch(e => console.warn("Error deleting old sampler audio from DB", e));
            }

            track.disposeSlicerMonoNodes(); // Important before changing buffer potentially
            track.audioBuffer = newAudioBuffer;
            track.samplerAudioData = {
                fileName: sourceName,
                audioDbKey: audioDbKey
            };
            track.originalFileName = sourceName; // Keep for display convenience
            if (!track.slicerIsPolyphonic && track.audioBuffer?.loaded) track.setupSlicerMonoNodes(); // Re-setup mono nodes if applicable
            if (typeof window.autoSliceSample === 'function') window.autoSliceSample(track.id, Constants.numSlices);

            if (track.inspectorWindow?.element) { // Update UI
                const dz = track.inspectorWindow.element.querySelector(`#dropZoneContainer-${track.id}-sampler .drop-zone`);
                if (dz) {
                    dz.innerHTML = `Loaded: ${sourceName.substring(0,25)}${sourceName.length > 25 ? '...' : ''}<br><label for="fileInput-${track.id}" class="text-blue-600 hover:text-blue-800 underline cursor-pointer">Replace</label><input type="file" id="fileInput-${track.id}" accept="audio/*" class="hidden">`;
                    const fileInputEl = dz.querySelector(`#fileInput-${track.id}`);
                    if (fileInputEl) fileInputEl.onchange = (e) => loadSampleFile(e, track.id, 'Sampler');
                }
            }
        } else if (trackTypeHint === 'InstrumentSampler') {
            if (track.instrumentSamplerSettings.audioBuffer && !track.instrumentSamplerSettings.audioBuffer.disposed) track.instrumentSamplerSettings.audioBuffer.dispose();
            if (track.instrumentSamplerSettings.audioDbKey && track.instrumentSamplerSettings.audioDbKey !== audioDbKey) { // Delete old if exists
                await deleteAudio(track.instrumentSamplerSettings.audioDbKey).catch(e => console.warn("Error deleting old inst sampler audio from DB", e));
            }
            if (track.toneSampler && !track.toneSampler.disposed) track.toneSampler.dispose();

            track.instrumentSamplerSettings.audioBuffer = newAudioBuffer;
            track.instrumentSamplerSettings.audioDbKey = audioDbKey;
            track.instrumentSamplerSettings.originalFileName = sourceName;
            track.instrumentSamplerSettings.loopStart = 0; // Reset loop points for new sample
            track.instrumentSamplerSettings.loopEnd = newAudioBuffer.duration;
            track.setupToneSampler(); // This will use the new buffer

            if (track.inspectorWindow?.element) { // Update UI
                const dz = track.inspectorWindow.element.querySelector(`#dropZoneContainer-${track.id}-instrumentsampler .drop-zone`);
                 if (dz) {
                    dz.innerHTML = `Loaded: ${sourceName.substring(0,25)}${sourceName.length > 25 ? '...' : ''}<br><label for="instrumentFileInput-${track.id}" class="text-blue-600 hover:text-blue-800 underline cursor-pointer">Replace</label><input type="file" id="instrumentFileInput-${track.id}" accept="audio/*" class="hidden">`;
                    const fileInputEl = dz.querySelector(`#instrumentFileInput-${track.id}`);
                    if(fileInputEl) fileInputEl.onchange = (e) => loadSampleFile(e, track.id, 'InstrumentSampler');
                }
                const loopStartInput = track.inspectorWindow.element.querySelector(`#instrumentLoopStart-${track.id}`);
                const loopEndInput = track.inspectorWindow.element.querySelector(`#instrumentLoopEnd-${track.id}`);
                if(loopStartInput) loopStartInput.value = track.instrumentSamplerSettings.loopStart.toFixed(3);
                if(loopEndInput) loopEndInput.value = track.instrumentSamplerSettings.loopEnd.toFixed(3);
            }
        }

        if (trackTypeHint === 'Sampler' && typeof window.drawWaveform === 'function') window.drawWaveform(track);
        if (trackTypeHint === 'InstrumentSampler' && typeof window.drawInstrumentWaveform === 'function') window.drawInstrumentWaveform(track);

        track.rebuildEffectChain(); // Ensure effects are connected after potential instrument changes
        showNotification(`Sample "${sourceName}" loaded for ${track.name}.`, 2000);

    } catch (error) {
        console.error(`[Audio - loadSampleFile] Error in Tone.Buffer().load or subsequent processing for "${sourceName}":`, error);
        showNotification(`Error loading sample "${sourceName}": ${error.message || 'Unknown error, check console.'}`, 4000);
    } finally { if (objectURLForTone) URL.revokeObjectURL(objectURLForTone); }
}

/**
 * Loads an audio sample file into a specific pad of a DrumSampler track.
 * Stores the audio Blob in IndexedDB and updates the pad with a reference key.
 * @param {Event|string|File|Blob} eventOrUrlOrFile - File input event, URL string, or File/Blob object.
 * @param {number} trackId - The ID of the target drum sampler track.
 * @param {number} padIndex - The index of the pad to load the sample into.
 * @param {string|null} [fileNameForUrl=null] - Filename to use if eventOrUrl is a URL.
 */
export async function loadDrumSamplerPadFile(eventOrUrlOrFile, trackId, padIndex, fileNameForUrl = null) {
    console.log(`[Audio - loadDrumSamplerPadFile] Called. TrackID: ${trackId}, Pad: ${padIndex}, FileName: ${fileNameForUrl}`);
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : (window.tracks || []);
    const track = tracksArray.find(t => t.id === trackId);

    if (!track || track.type !== 'DrumSampler') {
        console.error(`[Audio - loadDrumSamplerPadFile] Track not found or not a DrumSampler. Track ID: ${trackId}`);
        return;
    }
    if (typeof padIndex !== 'number' || isNaN(padIndex) || padIndex < 0 || padIndex >= track.drumSamplerPads.length) {
        console.error(`[Audio - loadDrumSamplerPadFile] Invalid padIndex: ${padIndex}`);
        return;
    }

    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        showNotification("Audio system not ready. Please interact with the app and try again.", 3000);
        return;
    }

    let fileObjectToStore; // This will be the File/Blob to store in IndexedDB
    let sourceName;

    const isUrlSource = typeof eventOrUrlOrFile === 'string';
    const isDirectFile = eventOrUrlOrFile instanceof File;
    const isBlobSource = eventOrUrlOrFile instanceof Blob;

    if (isUrlSource) {
        sourceName = fileNameForUrl || eventOrUrlOrFile.split('/').pop().split('?')[0] || `pad_sample_${padIndex}`;
        try {
            const response = await fetch(eventOrUrlOrFile);
            if (!response.ok) throw new Error(`Fetch failed for ${eventOrUrlOrFile}: ${response.statusText} (${response.status})`);
            const blob = await response.blob();
            fileObjectToStore = new File([blob], sourceName, { type: blob.type || getMimeTypeFromFilename(sourceName) });
        } catch (e) {
            console.error(`[Audio - loadDrumSamplerPadFile] Error fetching:`, e);
            showNotification(`Error fetching drum sample: ${e.message}`, 3000); return;
        }
    } else if (eventOrUrlOrFile && eventOrUrlOrFile.target && eventOrUrlOrFile.target.files && eventOrUrlOrFile.target.files.length > 0) {
        fileObjectToStore = eventOrUrlOrFile.target.files[0];
        sourceName = fileObjectToStore.name;
    } else if (isDirectFile) {
        fileObjectToStore = eventOrUrlOrFile;
        sourceName = fileObjectToStore.name;
    } else if (isBlobSource) {
        fileObjectToStore = eventOrUrlOrFile;
        sourceName = fileNameForUrl || `pad_blob_sample_${padIndex}`;
        if (!(fileObjectToStore instanceof File)) {
            fileObjectToStore = new File([fileObjectToStore], sourceName, { type: fileObjectToStore.type || getMimeTypeFromFilename(sourceName) });
        }
    } else {
        showNotification("No file for drum pad.", 3000); return;
    }

    if (!fileObjectToStore) { showNotification("Could not get drum sample data.", 3000); return; }

    if (!fileObjectToStore.type || (!fileObjectToStore.type.startsWith('audio/') && fileObjectToStore.type !== "application/octet-stream" && !getMimeTypeFromFilename(sourceName).startsWith('audio/'))) {
        showNotification(`Invalid audio file type for drum pad: "${fileObjectToStore.type || getMimeTypeFromFilename(sourceName) || 'unknown'}".`, 3000); return;
    }
    if (fileObjectToStore.size === 0) { showNotification(`Drum sample "${sourceName}" is empty.`, 3000); return; }

    if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Load ${sourceName} to Pad ${padIndex + 1} on ${track.name}`);

    let objectURLForTone = null;
    try {
        const padData = track.drumSamplerPads[padIndex];
        objectURLForTone = URL.createObjectURL(fileObjectToStore);

        const newBuffer = await new Tone.Buffer().load(objectURLForTone);
        console.log(`[Audio - loadDrumSamplerPadFile] Tone.Buffer loaded for pad "${sourceName}". Duration: ${newBuffer.duration}`);

        const audioDbKey = generateAudioDbKey(track.id, sourceName, 'DrumSampler', padIndex);
        await storeAudio(audioDbKey, fileObjectToStore); // Store the original File object (Blob)
        console.log(`[Audio - loadDrumSamplerPadFile] Stored "${sourceName}" for pad ${padIndex} in IndexedDB with key: ${audioDbKey}`);


        if (padData.audioDbKey && padData.audioDbKey !== audioDbKey) { // Delete old if exists and key is different
            await deleteAudio(padData.audioDbKey).catch(e => console.warn(`Error deleting old drum pad audio (key: ${padData.audioDbKey}) from DB`, e));
        }

        if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
        if (track.drumPadPlayers[padIndex] && !track.drumPadPlayers[padIndex].disposed) track.drumPadPlayers[padIndex].dispose();

        padData.audioBuffer = newBuffer;
        padData.audioDbKey = audioDbKey; // STORE KEY
        padData.originalFileName = sourceName;

        track.drumPadPlayers[padIndex] = new Tone.Player(newBuffer); // Create new player with new buffer
        // The player needs to be connected to the track's effect chain.
        // This is typically handled by track.rebuildEffectChain().
        track.rebuildEffectChain(); // Call this to ensure the new player is connected.

        showNotification(`Sample "${sourceName}" loaded for Pad ${padIndex + 1}.`, 2000);
        if (typeof window.updateDrumPadControlsUI === 'function') window.updateDrumPadControlsUI(track); // Update inspector
        if (typeof window.renderDrumSamplerPads === 'function') window.renderDrumSamplerPads(track); // Update pad display

    } catch (error) {
        console.error(`[Audio - loadDrumSamplerPadFile] Error loading drum sample "${sourceName}":`, error);
        showNotification(`Error loading drum sample "${sourceName}": ${error.message || 'Unknown error, check console.'}`, 4000);
    } finally { if (objectURLForTone) URL.revokeObjectURL(objectURLForTone); }
}


/**
 * Loads a sound from the sound browser (JSZip entry) to a target track/pad.
 * @param {object} soundData - Object containing { fullPath, libraryName, fileName }.
 * @param {number} targetTrackId - The ID of the track to load the sound into.
 * @param {string} targetTrackType - The type of the target track (used as hint).
 * @param {number|null} [targetPadOrSliceIndex=null] - Specific pad or slice index if applicable.
 */
export async function loadSoundFromBrowserToTarget(soundData, targetTrackId, targetTrackType, targetPadOrSliceIndex = null) {
    console.log(`[Audio - loadSoundFromBrowserToTarget] Called. SoundData:`, soundData, `Target Track ID: ${targetTrackId}, Type: ${targetTrackType}, Index: ${targetPadOrSliceIndex}`);
    const { fullPath, libraryName, fileName } = soundData;

    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : (window.tracks || []);
    const track = tracksArray.find(t => t.id === parseInt(targetTrackId));

    if (!track) {
        console.error(`[Audio - loadSoundFromBrowserToTarget] Target track ID ${targetTrackId} not found.`);
        showNotification("Target track not found.", 3000);
        return;
    }

    const isTargetSamplerType = ['Sampler', 'InstrumentSampler', 'DrumSampler'].includes(track.type);
    if (!isTargetSamplerType) {
        console.warn(`[Audio - loadSoundFromBrowserToTarget] Cannot load to non-sampler track type: ${track.type}`);
        showNotification(`Cannot load to ${track.type} track.`, 3000);
        return;
    }

    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        showNotification("Audio not ready.", 3000);
        return;
    }

    showNotification(`Loading "${fileName}" from ${libraryName} to ${track.name}...`, 2000);

    try {
        console.log(`[Audio - loadSoundFromBrowserToTarget] Accessing library: ${libraryName}, fullPath: ${fullPath}`);
        if (!window.loadedZipFiles || !window.loadedZipFiles[libraryName] || window.loadedZipFiles[libraryName] === "loading") {
            throw new Error(`Library "${libraryName}" not loaded or still loading.`);
        }
        const zipEntry = window.loadedZipFiles[libraryName].file(fullPath);
        if (!zipEntry) {
            console.error(`[Audio - loadSoundFromBrowserToTarget] File "${fullPath}" not found in ZIP library "${libraryName}". Available files:`, Object.keys(window.loadedZipFiles[libraryName].files));
            throw new Error(`File "${fullPath}" not in ZIP of library "${libraryName}".`);
        }
        console.log(`[Audio - loadSoundFromBrowserToTarget] Found zipEntry for ${fullPath}`);
        const fileBlobFromZip = await zipEntry.async("blob"); // Get the blob from JSZip
        console.log(`[Audio - loadSoundFromBrowserToTarget] Got blob for ${fileName}, type from zip: '${fileBlobFromZip.type}', size: ${fileBlobFromZip.size}`);

        // Construct a File object to pass to the loading functions, ensuring correct MIME type
        const inferredMimeType = getMimeTypeFromFilename(fileName);
        const finalMimeType = fileBlobFromZip.type && fileBlobFromZip.type !== 'application/octet-stream' ? fileBlobFromZip.type : inferredMimeType;
        const fileToLoad = new File([fileBlobFromZip], fileName, {type: finalMimeType});
        console.log(`[Audio - loadSoundFromBrowserToTarget] Created File object for loading. Name: ${fileToLoad.name}, Type: ${fileToLoad.type}`);


        // Delegate to the appropriate loading function
        if (track.type === 'DrumSampler') {
            let actualPadIndex = targetPadOrSliceIndex;
            // If no specific pad index, find first empty or use selected
            if (typeof actualPadIndex !== 'number' || isNaN(actualPadIndex) || actualPadIndex < 0 || actualPadIndex >= Constants.numDrumSamplerPads) {
                actualPadIndex = track.drumSamplerPads.findIndex(p => !p.audioDbKey && !p.audioBufferDataURL); // Check for old DataURL too for migration
                if (actualPadIndex === -1) actualPadIndex = track.selectedDrumPadForEdit;
                if (actualPadIndex === -1 || typeof actualPadIndex !== 'number') actualPadIndex = 0;
            }
            console.log(`[Audio - loadSoundFromBrowserToTarget] Loading to DrumSampler, Pad Index: ${actualPadIndex}`);
            await loadDrumSamplerPadFile(fileToLoad, track.id, actualPadIndex, fileName); // Pass File object
        } else if (track.type === 'Sampler') {
            console.log(`[Audio - loadSoundFromBrowserToTarget] Loading to Sampler (Slicer)`);
            await loadSampleFile(fileToLoad, track.id, 'Sampler', fileName); // Pass File object
        } else if (track.type === 'InstrumentSampler') {
            console.log(`[Audio - loadSoundFromBrowserToTarget] Loading to InstrumentSampler`);
            await loadSampleFile(fileToLoad, track.id, 'InstrumentSampler', fileName); // Pass File object
        }
    } catch (error) {
        console.error(`[Audio - loadSoundFromBrowserToTarget] Error loading sound from browser:`, error);
        showNotification(`Error loading "${fileName}": ${error.message}`, 3000);
    }
    // No finally block to revoke objectURL needed here as it's handled within the delegated load functions.
}


/**
 * Fetches a sound library (ZIP file), processes it with JSZip, and builds a file tree.
 * @param {string} libraryName - The name of the library.
 * @param {string} zipUrl - The URL of the ZIP file.
 * @param {boolean} [isAutofetch=false] - Whether this is an automatic fetch on startup.
 */
export async function fetchSoundLibrary(libraryName, zipUrl, isAutofetch = false) {
    console.log(`[Audio - fetchSoundLibrary] Attempting to fetch: ${libraryName} from ${zipUrl}. Is Autofetch: ${isAutofetch}`);
    if (window.loadedZipFiles && window.loadedZipFiles[libraryName] && window.loadedZipFiles[libraryName] !== "loading") {
        console.log(`[Audio - fetchSoundLibrary] Library ${libraryName} already loaded.`);
        if (!isAutofetch && typeof window.updateSoundBrowserDisplayForLibrary === 'function') window.updateSoundBrowserDisplayForLibrary(libraryName);
        return;
    }
    if (window.loadedZipFiles && window.loadedZipFiles[libraryName] === "loading") {
        console.log(`[Audio - fetchSoundLibrary] Library ${libraryName} is currently loading.`);
        return;
    }
    if (!isAutofetch && document.getElementById('soundBrowserList')) document.getElementById('soundBrowserList').innerHTML = `<div class="p-2 text-xs text-gray-500">Fetching ${libraryName}...</div>`;

    try {
        if (!window.loadedZipFiles) window.loadedZipFiles = {};
        window.loadedZipFiles[libraryName] = "loading";
        console.log(`[Audio - fetchSoundLibrary] Fetching ${zipUrl}...`);
        const response = await fetch(zipUrl);
        console.log(`[Audio - fetchSoundLibrary] Response status for ${zipUrl}: ${response.status}`);
        if (!response.ok) throw new Error(`HTTP error ${response.status} fetching ${zipUrl}`);
        const zipData = await response.arrayBuffer();
        console.log(`[Audio - fetchSoundLibrary] Zip data for ${libraryName} received, size: ${zipData.byteLength}`);

        if (typeof JSZip === 'undefined') {
            console.error("[Audio - fetchSoundLibrary] JSZip is not loaded. Cannot process ZIP file.");
            throw new Error("JSZip library not found.");
        }
        const jszip = new JSZip();
        const loadedZip = await jszip.loadAsync(zipData);
        console.log(`[Audio - fetchSoundLibrary] JSZip loaded ${libraryName} successfully. Files found in zip: ${Object.keys(loadedZip.files).length}`);
        window.loadedZipFiles[libraryName] = loadedZip; // Store the JSZip instance

        const fileTree = {};
        let audioFileCount = 0;
        // Iterate over all files in the zip
        loadedZip.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return; // Skip directories

            // Filter out common unwanted files/folders (e.g., macOS metadata)
            const pathParts = relativePath.split('/').filter(p => p && p !== '__MACOSX' && !p.startsWith('._'));
             if (pathParts.some(p => p.startsWith('.'))) { // Skip hidden files/folders
                return;
            }
            if (pathParts.length === 0) return; // Should not happen for non-dir entries

            let currentLevel = fileTree;
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                if (i === pathParts.length - 1) { // File part
                    if (part.match(/\.(wav|mp3|ogg|flac|aac|m4a)$/i)) { // Check for audio extensions
                        currentLevel[part] = { type: 'file', entry: zipEntry, fullPath: relativePath };
                        audioFileCount++;
                    }
                } else { // Directory part
                    if (!currentLevel[part] || currentLevel[part].type !== 'folder') {
                        currentLevel[part] = { type: 'folder', children: {} };
                    }
                    currentLevel = currentLevel[part].children;
                }
            }
        });
        console.log(`[Audio - fetchSoundLibrary] Finished processing ${libraryName}. Total audio files added to tree: ${audioFileCount}`);
        if (!window.soundLibraryFileTrees) window.soundLibraryFileTrees = {};
        window.soundLibraryFileTrees[libraryName] = fileTree;

        if (!isAutofetch && typeof window.updateSoundBrowserDisplayForLibrary === 'function') {
            window.updateSoundBrowserDisplayForLibrary(libraryName);
        }
    } catch (error) {
        console.error(`[Audio - fetchSoundLibrary] Error fetching/processing ${libraryName} from ${zipUrl}:`, error);
        if (window.loadedZipFiles) delete window.loadedZipFiles[libraryName]; // Reset loading state on error
        if (window.soundLibraryFileTrees) delete window.soundLibraryFileTrees[libraryName];
        if (!isAutofetch) showNotification(`Error loading library ${libraryName}: ${error.message}`, 4000);
    }
}

/**
 * Automatically slices a loaded sample in a Sampler track into a number of equal parts.
 * @param {number} trackId - The ID of the Sampler track.
 * @param {number} [numSlicesToCreate=Constants.numSlices] - The number of slices to create.
 */
export function autoSliceSample(trackId, numSlicesToCreate = Constants.numSlices) {
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : (window.tracks || []);
    const track = tracksArray.find(t => t.id === trackId);
    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded) {
        showNotification("Cannot auto-slice: Load sample first.", 3000);
        return;
    }
    const duration = track.audioBuffer.duration;
    track.slices = []; // Clear existing slices
    const sliceDuration = duration / numSlicesToCreate;

    for (let i = 0; i < numSlicesToCreate; i++) {
        track.slices.push({
            offset: i * sliceDuration,
            duration: sliceDuration,
            userDefined: false, // Mark as auto-generated
            volume: 1.0,
            pitchShift: 0,
            loop: false,
            reverse: false,
            envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 } // Default envelope
        });
    }
    track.selectedSliceForEdit = 0; // Select the first slice for editing
    // Update sequencer length if it was based on old slice count, or if it needs to match new slice count
    // This might need more nuanced logic depending on desired behavior.
    // For now, we assume setSequenceLength will handle row adjustments correctly.
    track.setSequenceLength(track.sequenceLength, true); // Force redraw of sequencer if open

    if (typeof window.renderSamplePads === 'function') window.renderSamplePads(track);
    if (typeof window.updateSliceEditorUI === 'function') window.updateSliceEditorUI(track);
    if (typeof window.drawWaveform === 'function') window.drawWaveform(track);
    showNotification(`Sample auto-sliced into ${numSlicesToCreate} parts.`, 2000);
}
