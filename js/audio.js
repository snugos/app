// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading
import * as Constants from './constants.js';
import { showNotification } from './utils.js';
import { createEffectInstance, getEffectDefaultParams } from './effectsRegistry.js';

let audioContextInitialized = false;
window.masterEffectsBusInput = null; 
window.masterEffectsChain = []; 
let masterGainNode = null; 
window.masterGainNode = masterGainNode; 

console.log("[Audio.js] Initializing. window.masterEffectsChain declared as (structure):", (window.masterEffectsChain || []).map(e => ({id: e.id, type: e.type, params: e.params, toneNodeExists: !!e.toneNode})));

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

export function rebuildMasterEffectChain() {
    console.log("[Audio - rebuildMasterEffectChain] Called.");
    
    if (!window.masterEffectsBusInput || window.masterEffectsBusInput.disposed || !masterGainNode || masterGainNode.disposed) {
        console.warn("[Audio - rebuildMasterEffectChain] Master bus nodes are not valid. Forcing setupMasterBus.");
        setupMasterBus(); 
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
                if (window.masterEffectsBusInput !== masterGainNode) { 
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
    rebuildMasterEffectChain();
}

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
    if (!filename || typeof filename !== 'string') return "application/octet-stream"; // Default if no filename
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.endsWith(".wav")) return "audio/wav";
    if (lowerFilename.endsWith(".mp3")) return "audio/mpeg";
    if (lowerFilename.endsWith(".ogg")) return "audio/ogg";
    if (lowerFilename.endsWith(".flac")) return "audio/flac";
    if (lowerFilename.endsWith(".aac")) return "audio/aac";
    if (lowerFilename.endsWith(".m4a")) return "audio/mp4"; // Common for AAC
    console.warn(`[Audio - getMimeTypeFromFilename] Could not infer MIME type for: ${filename}`);
    return "application/octet-stream"; // Fallback
}

export async function loadSampleFile(eventOrUrl, trackId, trackTypeHint, fileNameForUrl = null) {
    console.log(`[Audio - loadSampleFile] Called. TrackID: ${trackId}, TypeHint: ${trackTypeHint}, FileNameForURL: ${fileNameForUrl}`); // DEBUG
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : (window.tracks || []);
    const track = tracksArray.find(t => t.id === trackId);
    if (!track) { showNotification(`Track ID ${trackId} not found.`, 3000); return; }
    if (trackTypeHint !== 'Sampler' && trackTypeHint !== 'InstrumentSampler') {
        showNotification(`Cannot load sample into ${trackTypeHint} track.`, 3000); return;
    }
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio system not ready.", 3000); return; }

    let fileObject; 
    let sourceName;
    let providedBlob = null;

    const isUrlSource = typeof eventOrUrl === 'string';
    const isDirectFile = eventOrUrl instanceof File;
    const isBlobEvent = eventOrUrl instanceof Blob; // Check if it's a blob directly (like from zip)

    if (isUrlSource) { // Handles blob URLs from sound browser, or actual http URLs
        sourceName = fileNameForUrl || eventOrUrl.split('/').pop().split('?')[0] || "loaded_sample";
        console.log(`[Audio - loadSampleFile] URL source. sourceName: ${sourceName}, eventOrUrl: ${eventOrUrl}`); // DEBUG
        try {
            const response = await fetch(eventOrUrl);
            if (!response.ok) throw new Error(`Fetch failed for ${eventOrUrl}: ${response.status}`);
            providedBlob = await response.blob(); // This is the blob we'll work with
            console.log(`[Audio - loadSampleFile] Fetched blob from URL. Type: '${providedBlob.type}', Size: ${providedBlob.size}`); // DEBUG
        } catch (e) { 
            console.error(`[Audio - loadSampleFile] Error fetching sample from URL ${eventOrUrl}:`, e);
            showNotification(`Error fetching sample: ${e.message}`, 3000); return; 
        }
    } else if (eventOrUrl && eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) { // From <input type="file">
        providedBlob = eventOrUrl.target.files[0];
        sourceName = providedBlob.name;
        console.log(`[Audio - loadSampleFile] File input source. sourceName: ${sourceName}, Type: '${providedBlob.type}'`); // DEBUG
    } else if (isDirectFile) { // If a File object is passed directly
        providedBlob = eventOrUrl;
        sourceName = providedBlob.name;
        console.log(`[Audio - loadSampleFile] Direct File object source. sourceName: ${sourceName}, Type: '${providedBlob.type}'`); // DEBUG
    } else if (isBlobEvent) { // If a Blob object is passed directly (less common for this function's design but possible)
        providedBlob = eventOrUrl;
        sourceName = fileNameForUrl || "loaded_blob_sample"; // Try to get a name
        console.log(`[Audio - loadSampleFile] Direct Blob object source. sourceName: ${sourceName}, Type: '${providedBlob.type}'`); // DEBUG
    } else { 
        showNotification("No file selected or invalid source.", 3000); 
        console.error("[Audio - loadSampleFile] No valid file source provided.");
        return; 
    }

    if (!providedBlob) {
        showNotification("Could not obtain file data.", 3000);
        console.error("[Audio - loadSampleFile] providedBlob is null or undefined.");
        return;
    }
    
    let explicitType = providedBlob.type;
    const inferredType = getMimeTypeFromFilename(sourceName);
    console.log(`[Audio - loadSampleFile] For "${sourceName}": Original Blob Type='${explicitType}', Inferred Type='${inferredType}'`); // DEBUG

    if ((!explicitType || explicitType === "application/octet-stream" || explicitType === "") && inferredType !== "application/octet-stream") {
        explicitType = inferredType;
        console.log(`[Audio - loadSampleFile] Using inferred type for "${sourceName}": '${explicitType}'`); // DEBUG
    } else if (explicitType && explicitType !== "application/octet-stream") {
        console.log(`[Audio - loadSampleFile] Using explicit blob type for "${sourceName}": '${explicitType}'`); // DEBUG
    } else {
        console.warn(`[Audio - loadSampleFile] Could not determine a specific audio type for "${sourceName}", staying with '${explicitType}' or default.`); // DEBUG
    }

    // Create a new File object with the (potentially corrected) MIME type
    // This is important because Tone.Buffer().load() might behave differently with a File vs a raw Blob/URL
    fileObject = new File([providedBlob], sourceName, { type: explicitType });
    console.log(`[Audio - loadSampleFile] Created File object for Tone.Buffer. Name: "${fileObject.name}", Type: "${fileObject.type}", Size: ${fileObject.size}`);


    if (!fileObject.type || (!fileObject.type.startsWith('audio/') && fileObject.type !== "application/octet-stream" ) ) { // Allow octet-stream if we couldn't infer better
        showNotification(`Invalid audio file type: "${fileObject.type || 'unknown'}". Please use WAV, MP3, OGG.`, 3000); 
        console.error(`[Audio - loadSampleFile] Final fileObject type is invalid: ${fileObject.type}`);
        return; 
    }
    if (fileObject.size === 0) { showNotification(`Audio file "${sourceName}" is empty.`, 3000); return; }

    if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Load ${sourceName} to ${track.name}`);
    
    let objectURLForTone = null;
    let base64DataURL = null;
    
    try {
        objectURLForTone = URL.createObjectURL(fileObject); // Create URL from the new File object
        console.log(`[Audio - loadSampleFile] Object URL for Tone.Buffer: ${objectURLForTone} (from File with type: ${fileObject.type})`); // DEBUG

        base64DataURL = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(fileObject); // Read from the new File object
        });
        console.log(`[Audio - loadSampleFile] Base64 DataURL generated for ${sourceName}. Length: ${base64DataURL?.length}`); // DEBUG

        console.log(`[Audio - loadSampleFile] Attempting Tone.Buffer().load('${objectURLForTone}') for ${sourceName}`); // DEBUG
        const newAudioBuffer = await new Tone.Buffer().load(objectURLForTone);
        console.log(`[Audio - loadSampleFile] Tone.Buffer loaded successfully for "${sourceName}". Duration: ${newAudioBuffer.duration}`); // DEBUG

        if (trackTypeHint === 'Sampler') {
            // ... (rest of sampler logic)
        } else if (trackTypeHint === 'InstrumentSampler') {
            // ... (rest of instrument sampler logic)
        }
        // ... (UI updates as before) ...
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
        console.error(`[Audio - loadSampleFile] Error in Tone.Buffer().load or subsequent processing for "${sourceName}":`, error); // DEBUG
        showNotification(`Error loading sample "${sourceName}": ${error.message || 'Unknown error, check console.'}`, 4000);
    } finally { if (objectURLForTone) URL.revokeObjectURL(objectURLForTone); }
}

export async function loadDrumSamplerPadFile(eventOrUrl, trackId, padIndex, fileNameForUrl = null) {
    // Simplified for brevity, assume similar logging and MIME type handling as loadSampleFile
    console.log(`[Audio - loadDrumSamplerPadFile] Called. TrackID: ${trackId}, Pad: ${padIndex}, FileName: ${fileNameForUrl}`);
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : (window.tracks || []);
    const track = tracksArray.find(t => t.id === trackId);
    if (!track || track.type !== 'DrumSampler') { return; }
    if (typeof padIndex !== 'number' || isNaN(padIndex) || padIndex < 0 || padIndex >= track.drumSamplerPads.length) { return; }
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { return; }

    let fileObject; 
    let sourceName;
    let providedBlob = null;

    const isUrlSource = typeof eventOrUrl === 'string';
    const isDirectFile = eventOrUrl instanceof File;
     const isBlobEvent = eventOrUrl instanceof Blob;

    if (isUrlSource) {
        sourceName = fileNameForUrl || "pad_sample_from_url";
         console.log(`[Audio - loadDrumSamplerPadFile] URL source. sourceName: ${sourceName}`);
        try {
            const response = await fetch(eventOrUrl); if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            providedBlob = await response.blob();
        } catch (e) { 
            console.error(`[Audio - loadDrumSamplerPadFile] Error fetching:`, e);
            showNotification(`Error fetching drum sample: ${e.message}`, 3000); return; 
        }
    } else if (eventOrUrl && eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
        providedBlob = eventOrUrl.target.files[0];
        sourceName = providedBlob.name;
    } else if (isDirectFile) {
        providedBlob = eventOrUrl;
        sourceName = providedBlob.name;
    } else if (isBlobEvent) {
        providedBlob = eventOrUrl;
        sourceName = fileNameForUrl || "pad_blob_sample";
    } else { showNotification("No file for drum pad.", 3000); return; }

    if (!providedBlob) { showNotification("Could not get drum sample data.", 3000); return; }

    let explicitType = providedBlob.type;
    const inferredType = getMimeTypeFromFilename(sourceName);
    console.log(`[Audio - loadDrumSamplerPadFile] For "${sourceName}": Original Blob Type='${explicitType}', Inferred Type='${inferredType}'`);

    if ((!explicitType || explicitType === "application/octet-stream" || explicitType === "") && inferredType !== "application/octet-stream") {
        explicitType = inferredType;
        console.log(`[Audio - loadDrumSamplerPadFile] Using inferred type for "${sourceName}": '${explicitType}'`);
    }
    
    fileObject = new File([providedBlob], sourceName, { type: explicitType });
     console.log(`[Audio - loadDrumSamplerPadFile] Created File object for Tone.Buffer. Name: "${fileObject.name}", Type: "${fileObject.type}"`);

    if (!fileObject.type || (!fileObject.type.startsWith('audio/') && fileObject.type !== "application/octet-stream")) {
        showNotification(`Invalid audio file type for drum pad: "${fileObject.type || 'unknown'}".`, 3000); return;
    }
    if (fileObject.size === 0) { showNotification(`Drum sample "${sourceName}" is empty.`, 3000); return; }

    if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Load ${sourceName} to Pad ${padIndex + 1} on ${track.name}`);
    
    let objectURLForTone = null; 
    let base64Url = null;
    try {
        const padData = track.drumSamplerPads[padIndex];
        objectURLForTone = URL.createObjectURL(fileObject);
        base64Url = await new Promise((resolve, reject) => {
            const reader = new FileReader(); reader.onloadend = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(fileObject);
        });
        
        console.log(`[Audio - loadDrumSamplerPadFile] Attempting Tone.Buffer().load('${objectURLForTone}') for ${sourceName}`);
        const newBuffer = await new Tone.Buffer().load(objectURLForTone);
        console.log(`[Audio - loadDrumSamplerPadFile] Tone.Buffer loaded for pad "${sourceName}". Duration: ${newBuffer.duration}`);

        if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
        if (track.drumPadPlayers[padIndex] && !track.drumPadPlayers[padIndex].disposed) track.drumPadPlayers[padIndex].dispose();
        padData.audioBuffer = newBuffer; padData.audioBufferDataURL = base64Url; padData.originalFileName = sourceName;
        track.drumPadPlayers[padIndex] = new Tone.Player(newBuffer);
        track.rebuildEffectChain();
        showNotification(`Sample "${sourceName}" loaded for Pad ${padIndex + 1}.`, 2000);
        if (typeof window.updateDrumPadControlsUI === 'function') window.updateDrumPadControlsUI(track);
        if (typeof window.renderDrumSamplerPads === 'function') window.renderDrumSamplerPads(track);
    } catch (error) {
        console.error(`[Audio - loadDrumSamplerPadFile] Error loading drum sample "${sourceName}":`, error);
        showNotification(`Error loading drum sample "${sourceName}": ${error.message || 'Unknown error, check console.'}`, 4000);
    } finally { if (objectURLForTone) URL.revokeObjectURL(objectURLForTone); }
}

// ... rest of the file (loadSoundFromBrowserToTarget, fetchSoundLibrary, autoSliceSample) ...
// Ensure fetchSoundLibrary and loadSoundFromBrowserToTarget have their existing debug logs from audio_js_sound_browser_debug
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

    showNotification(`Loading "${fileName}" to ${track.name}...`, 2000);
    let tempBlobUrlForDirectLoad = null; // Use a temporary variable for the blob URL
    try {
        console.log(`[Audio - loadSoundFromBrowserToTarget] Accessing library: ${libraryName}, fullPath: ${fullPath}`); 
        if (!window.loadedZipFiles || !window.loadedZipFiles[libraryName] || window.loadedZipFiles[libraryName] === "loading") {
            throw new Error(`Library "${libraryName}" not loaded or still loading.`);
        }
        const zipEntry = window.loadedZipFiles[libraryName].file(fullPath);
        if (!zipEntry) {
            console.error(`[Audio - loadSoundFromBrowserToTarget] File "${fullPath}" not found in ZIP library "${libraryName}". Available files:`, Object.keys(window.loadedZipFiles[libraryName].files)); 
            throw new Error(`File "${fullPath}" not in ZIP.`);
        }
        console.log(`[Audio - loadSoundFromBrowserToTarget] Found zipEntry for ${fullPath}`); 
        const fileBlob = await zipEntry.async("blob"); // This blob might have an empty MIME type
        console.log(`[Audio - loadSoundFromBrowserToTarget] Got blob for ${fileName}, type from zip: '${fileBlob.type}', size: ${fileBlob.size}`); 
        
        // Create a new File object with the correct name and potentially inferred type to pass down
        // This helps loadSampleFile/loadDrumSamplerPadFile to correctly identify it
        const inferredMimeType = getMimeTypeFromFilename(fileName);
        const blobToLoad = new File([fileBlob], fileName, {type: fileBlob.type || inferredMimeType || 'application/octet-stream'});
        console.log(`[Audio - loadSoundFromBrowserToTarget] Created File object for loading. Name: ${blobToLoad.name}, Type: ${blobToLoad.type}`);

        tempBlobUrlForDirectLoad = URL.createObjectURL(blobToLoad); // Pass this URL

        if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Load ${fileName} to ${track.name}`);

        if (track.type === 'DrumSampler') {
            let actualPadIndex = targetPadOrSliceIndex;
            if (typeof actualPadIndex !== 'number' || isNaN(actualPadIndex) || actualPadIndex < 0 || actualPadIndex >= Constants.numDrumSamplerPads) {
                actualPadIndex = track.drumSamplerPads.findIndex(p => !p.audioBufferDataURL);
                if (actualPadIndex === -1) actualPadIndex = track.selectedDrumPadForEdit;
                if (actualPadIndex === -1 || typeof actualPadIndex !== 'number') actualPadIndex = 0; 
            }
            console.log(`[Audio - loadSoundFromBrowserToTarget] Loading to DrumSampler, Pad Index: ${actualPadIndex}`); 
            await loadDrumSamplerPadFile(tempBlobUrlForDirectLoad, track.id, actualPadIndex, fileName); // Pass fileName for sourceName context
        } else if (track.type === 'Sampler') {
            console.log(`[Audio - loadSoundFromBrowserToTarget] Loading to Sampler (Slicer)`); 
            await loadSampleFile(tempBlobUrlForDirectLoad, track.id, 'Sampler', fileName); // Pass fileName
        } else if (track.type === 'InstrumentSampler') {
            console.log(`[Audio - loadSoundFromBrowserToTarget] Loading to InstrumentSampler`); 
            await loadSampleFile(tempBlobUrlForDirectLoad, track.id, 'InstrumentSampler', fileName); // Pass fileName
        }
    } catch (error) {
        console.error(`[Audio - loadSoundFromBrowserToTarget] Error loading sound from browser:`, error);
        showNotification(`Error loading "${fileName}": ${error.message}`, 3000);
    } finally { 
        if (tempBlobUrlForDirectLoad) URL.revokeObjectURL(tempBlobUrlForDirectLoad); 
        console.log(`[Audio - loadSoundFromBrowserToTarget] Revoked tempBlobUrlForDirectLoad if it was created.`);
    }
}

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
    if (!isAutofetch && document.getElementById('soundBrowserList')) document.getElementById('soundBrowserList').innerHTML = `Fetching ${libraryName}...`;
    
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
        window.loadedZipFiles[libraryName] = loadedZip;
        
        const fileTree = {};
        let audioFileCount = 0; 
        loadedZip.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return;
            const pathParts = relativePath.split('/').filter(p => p && p !== '__MACOSX'); 
             if (pathParts.some(p => p.startsWith('.'))) { 
                return;
            }

            let currentLevel = fileTree;
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                if (i === pathParts.length - 1) { 
                    if (part.match(/\.(wav|mp3|ogg|flac|aac|m4a)$/i)) { // Added m4a
                        currentLevel[part] = { type: 'file', entry: zipEntry, fullPath: relativePath };
                        audioFileCount++; 
                    }
                } else { 
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
        if (window.loadedZipFiles) delete window.loadedZipFiles[libraryName]; 
        if (window.soundLibraryFileTrees) delete window.soundLibraryFileTrees[libraryName];
        if (!isAutofetch) showNotification(`Error loading library ${libraryName}: ${error.message}`, 4000);
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
