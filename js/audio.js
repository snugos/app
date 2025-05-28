// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading
import * as Constants from './constants.js';
import { showNotification } from './utils.js';
import { createEffectInstance, getEffectDefaultParams } from './effectsRegistry.js';

let audioContextInitialized = false;
// Initialize to null, setupMasterBus will create them.
window.masterEffectsBusInput = null;
window.masterEffectsChain = [];
let masterGainNode = null;

console.log("[Audio.js] Initializing. window.masterEffectsChain declared as (structure):", window.masterEffectsChain.map(e => ({id: e.id, type: e.type, params: e.params})));

export async function initAudioContextAndMasterMeter(isUserInitiated = false) {
    console.log(`[Audio] initAudioContextAndMasterMeter called. isUserInitiated: ${isUserInitiated}, audioContextInitialized: ${audioContextInitialized}, Tone.context.state: ${Tone.context?.state}`);
    if (audioContextInitialized && Tone.context.state === 'running') {
        if (!window.masterEffectsBusInput || window.masterEffectsBusInput.disposed || !masterGainNode || masterGainNode.disposed) {
            console.log("[Audio] initAudioContextAndMasterMeter: Master bus nodes missing or disposed, re-setting up master bus.");
            setupMasterBus(); // This will create them if they don't exist or are disposed
        } else {
            console.log("[Audio] initAudioContextAndMasterMeter: Audio context already running and master bus nodes seem OK.");
        }
        return true;
    }
    try {
        await Tone.start();
        console.log("[Audio] Tone.start() successful. Context state:", Tone.context.state);
        if (Tone.context.state === 'running') {
            setupMasterBus(); // Creates master bus nodes if not existing/disposed, then rebuilds chain
            
            // Connect master meter
            if (masterGainNode && !masterGainNode.disposed) {
                if (!window.masterMeter || window.masterMeter.disposed) {
                    window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
                    console.log("[Audio] NEW masterMeter created.");
                }
                // Ensure meter is connected (or reconnected if it was disposed)
                // Disconnect masterGainNode from meter first to avoid multiple connections if this runs again
                try { masterGainNode.disconnect(window.masterMeter); } catch(e) {/*ignore if not connected*/}
                masterGainNode.connect(window.masterMeter);
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

function setupMasterBus() {
    console.log("[Audio - setupMasterBus] Called.");
    // Create masterEffectsBusInput if it doesn't exist or is disposed
    if (!window.masterEffectsBusInput || window.masterEffectsBusInput.disposed) {
        if (window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed) {
             try {window.masterEffectsBusInput.dispose();} catch(e){console.warn("[Audio - setupMasterBus] Error disposing old master bus input", e.message)}
        }
        window.masterEffectsBusInput = new Tone.Gain();
        console.log("[Audio - setupMasterBus] Created NEW window.masterEffectsBusInput:", window.masterEffectsBusInput);
    } else {
        console.log("[Audio - setupMasterBus] Using existing window.masterEffectsBusInput.");
    }

    // Create masterGainNode if it doesn't exist or is disposed
    if (!masterGainNode || masterGainNode.disposed) {
        if (masterGainNode && !masterGainNode.disposed) {
            try {masterGainNode.dispose();} catch(e){console.warn("[Audio - setupMasterBus] Error disposing old master gain node", e.message)}
        }
        masterGainNode = new Tone.Gain();
        console.log("[Audio - setupMasterBus] Created NEW masterGainNode:", masterGainNode);
    } else {
        console.log("[Audio - setupMasterBus] Using existing masterGainNode.");
    }
    
    // Always rebuild the chain to ensure connections are correct with potentially new/existing nodes
    rebuildMasterEffectChain();
}

export function rebuildMasterEffectChain() {
    console.log("[Audio - rebuildMasterEffectChain] Called.");
    
    // Ensure master bus nodes are valid before proceeding. If not, setupMasterBus should be called first.
    // However, setupMasterBus itself calls rebuildMasterEffectChain, so this check helps avoid infinite loops
    // if called externally before setupMasterBus has a chance to run (e.g. project load).
    if (!window.masterEffectsBusInput || window.masterEffectsBusInput.disposed || !masterGainNode || masterGainNode.disposed) {
        console.warn("[Audio - rebuildMasterEffectChain] Master bus nodes are not valid. Attempting to run setupMasterBus first.");
        // Calling setupMasterBus here could lead to recursion if setupMasterBus always calls rebuild.
        // Instead, let's ensure that any external call path leading here has already ensured master bus nodes are ready.
        // For now, just log and proceed cautiously, relying on init or add/remove effect to call setupMasterBus.
        // If this log appears frequently without a prior setupMasterBus call, the initialization order needs review.
         if (!window.masterEffectsBusInput || window.masterEffectsBusInput.disposed) {
            window.masterEffectsBusInput = new Tone.Gain();
            console.log("[Audio - rebuildMasterEffectChain] Critically re-initialized masterEffectsBusInput as it was invalid.");
        }
        if (!masterGainNode || masterGainNode.disposed) {
            masterGainNode = new Tone.Gain();
            console.log("[Audio - rebuildMasterEffectChain] Critically re-initialized masterGainNode as it was invalid.");
        }
    }

    console.log("[Audio - rebuildMasterEffectChain] Current window.masterEffectsChain (structure):", (window.masterEffectsChain || []).map(e => ({id: e.id, type: e.type, params: e.params, toneNodeExists: !!e.toneNode})));
    console.log(`[Audio - rebuildMasterEffectChain] masterEffectsBusInput valid: ${!!window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed}, masterGainNode valid: ${!!masterGainNode && !masterGainNode.disposed}`);

    // Disconnect everything downstream from masterEffectsBusInput
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
    // masterGainNode should only be disconnected from its inputs if they are part of this chain.
    // Its connection to Destination and Meter should remain unless masterGainNode itself is re-created.
    // However, since effects connect to it, it's safer to disconnect it and reconnect the end of the chain.
    try { 
        masterGainNode.disconnect(); 
        console.log("[Audio - rebuildMasterEffectChain] Disconnected all outputs from masterGainNode (it will be reconnected to Destination/Meter).");
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

    // Connect the end of the effect chain (or masterEffectsBusInput if no effects) to masterGainNode
    if (masterGainNode && !masterGainNode.disposed) {
        if (currentAudioPathEnd && !currentAudioPathEnd.disposed) {
             try {
                console.log(`[Audio - rebuildMasterEffectChain] Master Chain: Connecting ${currentAudioPathEnd.constructor.name} to MasterGainNode`);
                currentAudioPathEnd.connect(masterGainNode);
            } catch (e) {
                console.error(`[Audio - rebuildMasterEffectChain] Error connecting output of effects chain (${currentAudioPathEnd.constructor.name}) to masterGainNode:`, e);
            }
        } else {
            console.error("[Audio - rebuildMasterEffectChain] currentAudioPathEnd is invalid, cannot connect to masterGainNode.");
        }
        // Always ensure masterGainNode is connected to destination and meter
        try {
            masterGainNode.toDestination();
            console.log("[Audio - rebuildMasterEffectChain] masterGainNode re-connected to Tone.Destination.");
            if (window.masterMeter && !window.masterMeter.disposed) {
                 // Avoid multiple connections to meter if already connected
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
}


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
        rebuildMasterEffectChain(); // This will now use the stable master bus nodes
        return effectId;
    }
    console.warn(`[Audio - addMasterEffect] Failed to create master effect instance for ${effectType}`);
    return null;
}

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
        rebuildMasterEffectChain(); // This will now use the stable master bus nodes
    } else {
        console.warn(`[Audio - removeMasterEffect] Effect ID ${effectId} not found in masterEffectsChain.`);
    }
}

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
            if (paramInstance && typeof paramInstance.value !== 'undefined') {
                if (typeof paramInstance.rampTo === 'function') {
                    paramInstance.rampTo(value, 0.02);
                } else {
                    paramInstance.value = value;
                }
            } else {
                targetObject[finalParamKey] = value;
            }
             console.log(`[Audio - updateMasterEffectParam] Successfully updated ToneNode param ${paramPath}.`);
        } else if (typeof effectWrapper.toneNode.set === 'function' && keys.length > 0) {
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

    const maxValidInsertIndex = window.masterEffectsChain.length;
    const clampedNewIndex = Math.max(0, Math.min(newIndex, maxValidInsertIndex));
    console.log(`[Audio - reorderMasterEffect] Old index: ${oldIndex}, Requested newIndex: ${newIndex}, Clamped newIndex for splice: ${clampedNewIndex}`);


    if (typeof window.captureStateForUndo === 'function') {
        window.captureStateForUndo(`Reorder Master effect`);
    }
    const [effectToMove] = window.masterEffectsChain.splice(oldIndex, 1);
    window.masterEffectsChain.splice(clampedNewIndex, 0, effectToMove);

    console.log(`[Audio - reorderMasterEffect] Reordered master effect. New order (structure):`, window.masterEffectsChain.map(e=>({id: e.id, type: e.type})));
    rebuildMasterEffectChain(); // This will now use the stable master bus nodes
}

// ... (rest of the audio.js file remains the same: updateMeters, playSlicePreview, etc.)
export function updateMeters(masterMeterVisualElement, masterMeterBarVisualElement, mixerMasterMeterVisualElement, tracks) {
    if (Tone.context.state !== 'running' || !audioContextInitialized) return;

    if (window.masterMeter && typeof window.masterMeter.getValue === 'function') {
        const masterLevelValue = window.masterMeter.getValue();
        const level = Tone.dbToGain(masterLevelValue);
        const isClipping = masterLevelValue > -0.1;
        if (masterMeterBarVisualElement) {
            masterMeterBarVisualElement.style.width = `${Math.min(100, level * 100)}%`;
            masterMeterBarVisualElement.classList.toggle('clipping', isClipping);
        }
        const mixerWindow = window.openWindows ? window.openWindows['mixer'] : null;
        if (mixerMasterMeterVisualElement && mixerWindow && mixerWindow.element && !mixerWindow.isMinimized) {
            mixerMasterMeterVisualElement.style.width = `${Math.min(100, level * 100)}%`;
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
                    inspectorMeterBar.style.width = `${Math.min(100, level * 100)}%`;
                    inspectorMeterBar.classList.toggle('clipping', isClipping);
                }
            }
            const mixerWindow = window.openWindows ? window.openWindows['mixer'] : null;
            if (mixerWindow && mixerWindow.element && !mixerWindow.isMinimized) {
                const mixerMeterBar = mixerWindow.element.querySelector(`#mixerTrackMeterBar-${track.id}`);
                 if (mixerMeterBar) {
                    mixerMeterBar.style.width = `${Math.min(100, level * 100)}%`;
                    mixerMeterBar.classList.toggle('clipping', isClipping);
                }
            }
        }
    });
}

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
    if (sliceData.loop) playDuration = Math.min(playDuration, 2);

    const firstEffectNodeInTrack = track.activeEffects.length > 0 ? track.activeEffects[0].toneNode : track.gainNode;
    const actualDestination = (firstEffectNodeInTrack && !firstEffectNodeInTrack.disposed) ? firstEffectNodeInTrack : (window.masterEffectsBusInput || Tone.getDestination());

    if (!track.slicerIsPolyphonic) {
        if (!track.slicerMonoPlayer || track.slicerMonoPlayer.disposed) {
            track.setupSlicerMonoNodes();
            if(!track.slicerMonoPlayer) { console.warn("[Audio] Mono player not set up."); return; }
             if(track.audioBuffer && track.audioBuffer.loaded) track.slicerMonoPlayer.buffer = track.audioBuffer;
        }
        const player = track.slicerMonoPlayer; const env = track.slicerMonoEnvelope; const gain = track.slicerMonoGain;
        if (player.state === 'started') player.stop(time);
        if (env.getValueAtTime(time) > 0.001) env.triggerRelease(time);
        player.buffer = track.audioBuffer; env.set(sliceData.envelope);
        gain.gain.value = Tone.dbToGain(-6) * sliceData.volume * velocity;
        player.playbackRate = playbackRate; player.reverse = sliceData.reverse;
        player.loop = sliceData.loop; player.loopStart = sliceData.offset; player.loopEnd = sliceData.offset + sliceData.duration;
        player.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
        env.triggerAttack(time);
        if (!sliceData.loop) {
            const releaseTime = time + playDuration - (sliceData.envelope.release || 0.1);
            env.triggerRelease(Math.max(time, releaseTime));
        }
    } else {
        const tempPlayer = new Tone.Player(track.audioBuffer);
        const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
        const tempGain = new Tone.Gain(Tone.dbToGain(-6) * sliceData.volume * velocity);
        tempPlayer.chain(tempEnv, tempGain, actualDestination);
        tempPlayer.playbackRate = playbackRate; tempPlayer.reverse = sliceData.reverse;
        tempPlayer.loop = sliceData.loop; tempPlayer.loopStart = sliceData.offset; tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
        tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
        tempEnv.triggerAttack(time);
        if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95);
        Tone.Transport.scheduleOnce(() => { if(tempPlayer && !tempPlayer.disposed) tempPlayer.dispose(); if(tempEnv && !tempEnv.disposed) tempEnv.dispose(); if(tempGain && !tempGain.disposed) tempGain.dispose(); }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);
    }
}

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
    player.volume.value = Tone.gainToDb(padData.volume * velocity * 0.5); 
    const totalPadPitchShift = (padData.pitchShift || 0) + additionalPitchShiftInSemitones;
    player.playbackRate = Math.pow(2, totalPadPitchShift / 12);
    player.start(Tone.now());
}

export function getMimeTypeFromFilename(filename) {
    if (!filename || typeof filename !== 'string') return null;
    if (filename.toLowerCase().endsWith(".wav")) return "audio/wav";
    if (filename.toLowerCase().endsWith(".mp3")) return "audio/mpeg";
    if (filename.toLowerCase().endsWith(".ogg")) return "audio/ogg";
    return null;
}

export async function loadSampleFile(eventOrUrl, trackId, trackTypeHint, fileNameForUrl = null) {
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : (window.tracks || []);
    const track = tracksArray.find(t => t.id === trackId);
    if (!track) { showNotification(`Track ID ${trackId} not found.`, 3000); return; }
    if (trackTypeHint !== 'Sampler' && trackTypeHint !== 'InstrumentSampler') {
        showNotification(`Cannot load sample into ${trackTypeHint} track.`, 3000); return;
    }
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio system not ready.", 3000); return; }

    let fileObject; let sourceName;
    const isUrlSource = typeof eventOrUrl === 'string';
    if (isUrlSource) {
        sourceName = fileNameForUrl || eventOrUrl.split('/').pop().split('?')[0] || "loaded_sample";
        try {
            const response = await fetch(eventOrUrl);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            const blob = await response.blob();
            let explicitType = blob.type; const inferredType = getMimeTypeFromFilename(sourceName);
            if ((!explicitType || explicitType === "application/octet-stream") && inferredType) explicitType = inferredType;
            fileObject = new File([blob], sourceName, { type: explicitType });
        } catch (e) { showNotification(`Error fetching sample: ${e.message}`, 3000); return; }
    } else if (eventOrUrl && eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
        fileObject = eventOrUrl.target.files[0]; sourceName = fileObject.name;
    } else { showNotification("No file selected.", 3000); return; }

    if (!fileObject || !fileObject.type || !fileObject.type.startsWith('audio/')) {
        showNotification(`Invalid audio file type: "${fileObject?.type || 'unknown'}".`, 3000); return;
    }
    if (fileObject.size === 0) { showNotification(`Audio file "${sourceName}" is empty.`, 3000); return; }

    if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Load ${sourceName} to ${track.name}`);
    let blobUrlForLoading = null; let base64DataURL = null;
    try {
        blobUrlForLoading = URL.createObjectURL(fileObject);
        base64DataURL = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(fileObject);
        });

        const newAudioBuffer = await new Tone.Buffer().load(blobUrlForLoading);

        if (trackTypeHint === 'Sampler') {
            if (track.audioBuffer && !track.audioBuffer.disposed) track.audioBuffer.dispose();
            track.disposeSlicerMonoNodes();
            track.audioBuffer = newAudioBuffer;
            track.audioBufferDataURL = base64DataURL;
            track.originalFileName = sourceName;
            if (!track.slicerIsPolyphonic && track.audioBuffer?.loaded) track.setupSlicerMonoNodes();
            if (typeof autoSliceSample === 'function') autoSliceSample(track.id, Constants.numSlices);
             if (track.inspectorWindow?.element) {
                const dz = track.inspectorWindow.element.querySelector(`#dropZoneContainer-${track.id}-sampler .drop-zone`);
                if (dz) dz.innerHTML = `Loaded: ${sourceName.substring(0,25)}${sourceName.length > 25 ? '...' : ''}<br><label for="fileInput-${track.id}" class="text-blue-600 hover:text-blue-800 underline cursor-pointer">Replace</label><input type="file" id="fileInput-${track.id}" accept="audio/*" class="hidden">`;
                const fileInputEl = dz.querySelector(`#fileInput-${track.id}`);
                if (fileInputEl) fileInputEl.onchange = (e) => loadSampleFile(e, track.id, 'Sampler');
            }
        } else if (trackTypeHint === 'InstrumentSampler') {
            if (track.instrumentSamplerSettings.audioBuffer && !track.instrumentSamplerSettings.audioBuffer.disposed) track.instrumentSamplerSettings.audioBuffer.dispose();
            if (track.toneSampler && !track.toneSampler.disposed) track.toneSampler.dispose();
            track.instrumentSamplerSettings.audioBuffer = newAudioBuffer;
            track.instrumentSamplerSettings.audioBufferDataURL = base64DataURL;
            track.instrumentSamplerSettings.originalFileName = sourceName;
            track.instrumentSamplerSettings.loopStart = 0;
            track.instrumentSamplerSettings.loopEnd = newAudioBuffer.duration;
            track.setupToneSampler();
            if (track.inspectorWindow?.element) {
                const dz = track.inspectorWindow.element.querySelector(`#dropZoneContainer-${track.id}-instrumentsampler .drop-zone`);
                if (dz) dz.innerHTML = `Loaded: ${sourceName.substring(0,25)}${sourceName.length > 25 ? '...' : ''}<br><label for="instrumentFileInput-${track.id}" class="text-blue-600 hover:text-blue-800 underline cursor-pointer">Replace</label><input type="file" id="instrumentFileInput-${track.id}" accept="audio/*" class="hidden">`;
                const fileInputEl = dz.querySelector(`#instrumentFileInput-${track.id}`);
                if(fileInputEl) fileInputEl.onchange = (e) => loadSampleFile(e, track.id, 'InstrumentSampler');
                const loopStartInput = track.inspectorWindow.element.querySelector(`#instrumentLoopStart-${track.id}`);
                const loopEndInput = track.inspectorWindow.element.querySelector(`#instrumentLoopEnd-${track.id}`);
                if(loopStartInput) loopStartInput.value = track.instrumentSamplerSettings.loopStart.toFixed(3);
                if(loopEndInput) loopEndInput.value = track.instrumentSamplerSettings.loopEnd.toFixed(3);
            }
        }
        if (trackTypeHint === 'Sampler' && typeof window.drawWaveform === 'function') window.drawWaveform(track);
        if (trackTypeHint === 'InstrumentSampler' && typeof window.drawInstrumentWaveform === 'function') window.drawInstrumentWaveform(track);

        track.rebuildEffectChain();
        showNotification(`Sample "${sourceName}" loaded for ${track.name}.`, 2000);
    } catch (error) {
        console.error(`Error loading sample "${sourceName}":`, error);
        showNotification(`Error loading sample: ${error.message}`, 3000);
    } finally { if (blobUrlForLoading) URL.revokeObjectURL(blobUrlForLoading); }
}

export async function loadDrumSamplerPadFile(eventOrUrl, trackId, padIndex, fileNameForUrl = null) {
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : (window.tracks || []);
    const track = tracksArray.find(t => t.id === trackId);
    if (!track || track.type !== 'DrumSampler') { /* ... */ return; }
    if (typeof padIndex !== 'number' || isNaN(padIndex) || padIndex < 0 || padIndex >= track.drumSamplerPads.length) { /* ... */ return; }
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { /* ... */ return; }

    let fileObject; let sourceName;
    const isUrlSource = typeof eventOrUrl === 'string';
    if (isUrlSource) {
        sourceName = fileNameForUrl || "pad_sample";
        try {
            const response = await fetch(eventOrUrl); if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            const blob = await response.blob(); let explicitType = blob.type; const inferredType = getMimeTypeFromFilename(sourceName);
            if ((!explicitType || explicitType === "application/octet-stream") && inferredType) explicitType = inferredType;
            fileObject = new File([blob], sourceName, { type: explicitType });
        } catch (e) { /* ... */ return; }
    } else if (eventOrUrl && eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
        fileObject = eventOrUrl.target.files[0]; sourceName = fileObject.name;
    } else { /* ... */ return; }
    if (!fileObject || !fileObject.type || !fileObject.type.startsWith('audio/')) { /* ... */ return; }
    if (fileObject.size === 0) { /* ... */ return; }

    if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Load ${sourceName} to Pad ${padIndex + 1} on ${track.name}`);
    let blobUrl = null; let base64Url = null;
    try {
        const padData = track.drumSamplerPads[padIndex];
        blobUrl = URL.createObjectURL(fileObject);
        base64Url = await new Promise((resolve, reject) => {
            const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(fileObject);
        });
        const newBuffer = await new Tone.Buffer().load(blobUrl);
        if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
        if (track.drumPadPlayers[padIndex] && !track.drumPadPlayers[padIndex].disposed) track.drumPadPlayers[padIndex].dispose();
        padData.audioBuffer = newBuffer; padData.audioBufferDataURL = base64Url; padData.originalFileName = sourceName;
        track.drumPadPlayers[padIndex] = new Tone.Player(newBuffer);
        track.rebuildEffectChain(); // This is important!
        showNotification(`Sample "${sourceName}" loaded for Pad ${padIndex + 1}.`, 2000);
        if (typeof window.updateDrumPadControlsUI === 'function') window.updateDrumPadControlsUI(track);
        if (typeof window.renderDrumSamplerPads === 'function') window.renderDrumSamplerPads(track);
    } catch (error) {
        console.error(`Error loading drum sample "${sourceName}":`, error);
        showNotification(`Error loading drum sample: ${error.message}`, 3000);
    } finally { if (blobUrl) URL.revokeObjectURL(blobUrl); }
}

export async function loadSoundFromBrowserToTarget(soundData, targetTrackId, targetTrackType, targetPadOrSliceIndex = null) {
    const { fullPath, libraryName, fileName } = soundData;
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : (window.tracks || []);
    const track = tracksArray.find(t => t.id === parseInt(targetTrackId));
    if (!track) { showNotification("Target track not found.", 3000); return; }
    const isTargetSamplerType = ['Sampler', 'InstrumentSampler', 'DrumSampler'].includes(track.type);
    if (!isTargetSamplerType) { showNotification(`Cannot load to ${track.type} track.`, 3000); return; }
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio not ready.", 3000); return; }

    showNotification(`Loading "${fileName}" to ${track.name}...`, 2000);
    let blobUrl = null;
    try {
        if (!window.loadedZipFiles[libraryName] || window.loadedZipFiles[libraryName] === "loading") {
            throw new Error(`Library "${libraryName}" not loaded.`);
        }
        const zipEntry = window.loadedZipFiles[libraryName].file(fullPath);
        if (!zipEntry) throw new Error(`File "${fullPath}" not in ZIP.`);
        const fileBlob = await zipEntry.async("blob");
        blobUrl = URL.createObjectURL(fileBlob);
        if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Load ${fileName} to ${track.name}`);

        if (track.type === 'DrumSampler') {
            let actualPadIndex = targetPadOrSliceIndex;
            if (typeof actualPadIndex !== 'number' || isNaN(actualPadIndex) || actualPadIndex < 0 || actualPadIndex >= Constants.numDrumSamplerPads) {
                actualPadIndex = track.drumSamplerPads.findIndex(p => !p.audioBufferDataURL);
                if (actualPadIndex === -1) actualPadIndex = track.selectedDrumPadForEdit;
                if (actualPadIndex === -1 || typeof actualPadIndex !== 'number') actualPadIndex = 0;
            }
            await loadDrumSamplerPadFile(blobUrl, track.id, actualPadIndex, fileName);
        } else if (track.type === 'Sampler') {
            await loadSampleFile(blobUrl, track.id, 'Sampler', fileName);
        } else if (track.type === 'InstrumentSampler') {
            await loadSampleFile(blobUrl, track.id, 'InstrumentSampler', fileName);
        }
    } catch (error) {
        console.error(`Error loading sound from browser:`, error);
        showNotification(`Error loading "${fileName}": ${error.message}`, 3000);
    } finally { if (blobUrl) URL.revokeObjectURL(blobUrl); }
}

export async function fetchSoundLibrary(libraryName, zipUrl, isAutofetch = false) {
    if (window.loadedZipFiles && window.loadedZipFiles[libraryName] && window.loadedZipFiles[libraryName] !== "loading") {
        if (!isAutofetch && typeof window.updateSoundBrowserDisplayForLibrary === 'function') window.updateSoundBrowserDisplayForLibrary(libraryName);
        return;
    }
    if (window.loadedZipFiles && window.loadedZipFiles[libraryName] === "loading") return;
    if (!isAutofetch && document.getElementById('soundBrowserList')) document.getElementById('soundBrowserList').innerHTML = `Fetching ${libraryName}...`;
    try {
        if (!window.loadedZipFiles) window.loadedZipFiles = {};
        window.loadedZipFiles[libraryName] = "loading";
        const response = await fetch(zipUrl);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const zipData = await response.arrayBuffer();
        if (typeof JSZip === 'undefined') {
            console.error("JSZip is not loaded. Cannot process ZIP file.");
            throw new Error("JSZip library not found.");
        }
        const jszip = new JSZip();
        const loadedZip = await jszip.loadAsync(zipData);
        window.loadedZipFiles[libraryName] = loadedZip;
        const fileTree = {};
        loadedZip.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return;
            const pathParts = relativePath.split('/').filter(p => p);
            let currentLevel = fileTree;
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                if (i === pathParts.length - 1) {
                    if (part.match(/\.(wav|mp3|ogg|flac|aac)$/i)) {
                        currentLevel[part] = { type: 'file', entry: zipEntry, fullPath: relativePath };
                    }
                } else {
                    if (!currentLevel[part] || currentLevel[part].type !== 'folder') {
                        currentLevel[part] = { type: 'folder', children: {} };
                    }
                    currentLevel = currentLevel[part].children;
                }
            }
        });
        if (!window.soundLibraryFileTrees) window.soundLibraryFileTrees = {};
        window.soundLibraryFileTrees[libraryName] = fileTree;
        if (!isAutofetch && typeof window.updateSoundBrowserDisplayForLibrary === 'function') window.updateSoundBrowserDisplayForLibrary(libraryName);
    } catch (error) {
        console.error(`Error fetching ${libraryName}:`, error);
        if (window.loadedZipFiles) delete window.loadedZipFiles[libraryName];
        if (!isAutofetch) showNotification(`Error with ${libraryName}: ${error.message}`, 4000);
    }
}

export function autoSliceSample(trackId, numSlicesToCreate = Constants.numSlices) {
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : (window.tracks || []);
    const track = tracksArray.find(t => t.id === trackId);
    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded) {
        showNotification("Cannot auto-slice: Load sample first.", 3000);
        return;
    }
    const duration = track.audioBuffer.duration;
    track.slices = [];
    const sliceDuration = duration / numSlicesToCreate;
    for (let i = 0; i < numSlicesToCreate; i++) {
        track.slices.push({
            offset: i * sliceDuration, duration: sliceDuration, userDefined: false,
            volume: 1.0, pitchShift: 0, loop: false, reverse: false,
            envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 }
        });
    }
    track.selectedSliceForEdit = 0;
    track.setSequenceLength(track.sequenceLength, true);
    if (typeof window.renderSamplePads === 'function') window.renderSamplePads(track);
    if (typeof window.updateSliceEditorUI === 'function') window.updateSliceEditorUI(track);
    if (typeof window.drawWaveform === 'function') window.drawWaveform(track);
    showNotification(`Sample auto-sliced into ${numSlicesToCreate} parts.`, 2000);
}

