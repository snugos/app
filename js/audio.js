// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading (Improved)
import * as Constants from './constants.js';
import { showNotification } from './utils.js';
import { createEffectInstance, getEffectDefaultParams } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';

// Global audio nodes are now initialized and managed here,
// but their state (like master gain value or effect chain structure)
// might be mirrored or controlled via state.js for persistence.
let masterEffectsBusInput = null;
// masterEffectsChain is now managed in state.js
let masterGainNode = null; // This is the Tone.Gain node
let masterMeter = null;

let audioContextInitialized = false;

let localAppServices = {};
export function initializeAudioModule(appServices) {
    localAppServices = appServices;
    // Ensure masterEffectsChain is initialized if not already by state.js
    if (!localAppServices.getMasterEffectsChain) {
        console.warn("[Audio] getMasterEffectsChain service not available. Master effects might not work correctly.");
        localAppServices.getMasterEffectsChain = () => []; // Provide a fallback
    }
    if (!localAppServices.setMasterEffectsChain) {
        localAppServices.setMasterEffectsChain = () => {}; // Provide a fallback
    }
}


export async function initAudioContextAndMasterMeter(isUserInitiated = false) {
    console.log('[Audio] initAudioContextAndMasterMeter called. isUserInitiated:', isUserInitiated, 'Current Tone.context.state:', Tone.context.state, 'audioContextInitialized:', audioContextInitialized);

    if (audioContextInitialized && Tone.context.state === 'running') {
        if (!masterEffectsBusInput || masterEffectsBusInput.disposed || !masterGainNode || masterGainNode.disposed) {
            console.log('[Audio] Context running, but master bus needs setup.');
            setupMasterBus();
        }
        console.log('[Audio] Context already running and initialized.');
        return true;
    }
    try {
        console.log('[Audio] Attempting Tone.start(). Current state:', Tone.context.state);
        await Tone.start();
        console.log('[Audio] Tone.start() completed. New state:', Tone.context.state);

        if (Tone.context.state === 'running') {
            if(!audioContextInitialized) {
                console.log('[Audio] First time setup for master bus after Tone.start()');
                setupMasterBus(); // This will initialize masterGainNode
            }
            // Ensure masterGainNode value is synced with state.js
            if (masterGainNode && !masterGainNode.disposed && localAppServices.getMasterGainNodeValue) {
                masterGainNode.gain.value = localAppServices.getMasterGainNodeValue();
            }

            if (masterGainNode && !masterGainNode.disposed) {
                if (!masterMeter || masterMeter.disposed) {
                    masterMeter = new Tone.Meter({ smoothing: 0.8 });
                    console.log('[Audio] Master meter created.');
                }
                try { masterGainNode.disconnect(masterMeter); } catch(e) {/*ignore*/}
                masterGainNode.connect(masterMeter);
                console.log('[Audio] Master gain node connected to master meter.');
            }

            audioContextInitialized = true;
            console.log('[Audio] Audio context now running and initialized successfully.');
            return true;
        } else {
            console.warn('[Audio] Audio context NOT running after Tone.start(). State:', Tone.context.state);
            if (isUserInitiated) {
                showNotification("AudioContext could not be started even with user interaction.", 5000);
            } else {
                showNotification("Audio system needs a user interaction (like clicking Play) to start.", 4000);
            }
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
    console.log('[Audio] setupMasterBus called.');

    if (!masterEffectsBusInput || masterEffectsBusInput.disposed) {
        if (masterEffectsBusInput && !masterEffectsBusInput.disposed) {
             try {masterEffectsBusInput.dispose();} catch(e){console.warn("[Audio - setupMasterBus] Error disposing old master bus input", e.message)}
        }
        masterEffectsBusInput = new Tone.Gain();
        console.log('[Audio] Master effects bus input created/recreated.');
    }

    if (!masterGainNode || masterGainNode.disposed) {
        if (masterGainNode && !masterGainNode.disposed) {
            try {masterGainNode.dispose();} catch(e){console.warn("[Audio - setupMasterBus] Error disposing old master gain node", e.message)}
        }
        masterGainNode = new Tone.Gain();
        if (localAppServices.getMasterGainNodeValue) { // Sync with persisted value
            masterGainNode.gain.value = localAppServices.getMasterGainNodeValue();
        }
        // Expose masterGainNode globally if other modules still expect it (legacy, aim to remove)
        if (typeof window !== 'undefined') window.masterGainNode = masterGainNode;
        console.log('[Audio] Master gain node created/recreated.');
    }
    rebuildMasterEffectChain();
}

export function rebuildMasterEffectChain() {
    console.log('[Audio] rebuildMasterEffectChain called.');
    if (!masterEffectsBusInput || masterEffectsBusInput.disposed || !masterGainNode || masterGainNode.disposed) {
        console.log('[Audio] Master bus components not ready, attempting setupMasterBus first.');
        setupMasterBus();
        if (!masterEffectsBusInput || !masterGainNode) {
            console.error('[Audio] Master bus setup failed within rebuildMasterEffectChain. Aborting.');
            return;
        }
    }

    try { masterEffectsBusInput.disconnect(); } catch(e) { /* ignore */ }

    const currentMasterEffects = localAppServices.getMasterEffectsChain ? localAppServices.getMasterEffectsChain() : [];
    currentMasterEffects.forEach(effectWrapper => {
        if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
            try { effectWrapper.toneNode.disconnect(); } catch (e) { /* ignore */ }
        }
    });
    try { masterGainNode.disconnect(); } catch(e) { /* ignore */}

    let currentAudioPathEnd = masterEffectsBusInput;
    console.log('[Audio] Starting master chain with:', currentAudioPathEnd?.name || 'MasterBusInput');

    currentMasterEffects.forEach(effectWrapper => {
        if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
            if (currentAudioPathEnd && !currentAudioPathEnd.disposed) {
                try {
                    console.log(`[Audio] Connecting ${currentAudioPathEnd.name || 'PreviousEffect'} to ${effectWrapper.type}`);
                    currentAudioPathEnd.connect(effectWrapper.toneNode);
                    currentAudioPathEnd = effectWrapper.toneNode;
                } catch (e) {
                    console.error(`[Audio - rebuildMasterEffectChain] Error connecting to effect ${effectWrapper.type}:`, e);
                }
            } else {
                 currentAudioPathEnd = effectWrapper.toneNode;
                 console.log(`[Audio] Setting currentAudioPathEnd to ${effectWrapper.type} as previous was null/disposed.`);
            }
        }
    });

    if (currentAudioPathEnd && !currentAudioPathEnd.disposed && masterGainNode && !masterGainNode.disposed) {
        try {
            console.log(`[Audio] Connecting ${currentAudioPathEnd.name || 'LastEffect/BusInput'} to MasterGainNode`);
            currentAudioPathEnd.connect(masterGainNode);
        } catch (e) {
            console.error(`[Audio - rebuildMasterEffectChain] Error connecting output of effects chain to masterGainNode:`, e);
        }
    } else {
        console.warn('[Audio] Could not connect end of master chain to masterGainNode. CurrentOutput:', currentAudioPathEnd, 'MasterGain:', masterGainNode);
    }

    if (masterGainNode && !masterGainNode.disposed) {
        try {
            console.log('[Audio] Connecting MasterGainNode to destination and meter.');
            masterGainNode.toDestination();
            if (masterMeter && !masterMeter.disposed) {
                masterGainNode.connect(masterMeter);
            } else {
                masterMeter = new Tone.Meter({ smoothing: 0.8 });
                masterGainNode.connect(masterMeter);
                console.log('[Audio] New master meter created and connected.');
            }
        } catch (e) { console.error("[Audio - rebuildMasterEffectChain] Error connecting masterGainNode to destination or meter:", e); }
    } else {
        console.warn('[Audio] MasterGainNode not available or disposed for final connection.');
    }

    const currentTracks = localAppServices.getTracks ? localAppServices.getTracks() : [];
    console.log(`[Audio] Rebuilding effect chains for ${currentTracks.length} tracks.`);
    currentTracks.forEach(track => {
        if (track && typeof track.rebuildEffectChain === 'function') {
            // Pass masterEffectsBusInput to track for connection
            track.rebuildEffectChain(masterEffectsBusInput);
        }
    });
    console.log('[Audio] rebuildMasterEffectChain finished.');
}


export function addMasterEffect(effectType, initialParams = null) {
    const isReconstructing = localAppServices.getIsReconstructingDAW ? localAppServices.getIsReconstructingDAW() : false;
    if (localAppServices.captureStateForUndo && !isReconstructing) {
        localAppServices.captureStateForUndo(`Add ${effectType} to Master`);
    }
    const paramsToUse = initialParams ? JSON.parse(JSON.stringify(initialParams)) : getEffectDefaultParams(effectType);
    const toneNode = createEffectInstance(effectType, paramsToUse);

    if (toneNode) {
        const effectId = `mastereffect_${effectType}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        const currentChain = localAppServices.getMasterEffectsChain ? localAppServices.getMasterEffectsChain() : [];
        const newChain = [...currentChain, {
            id: effectId, type: effectType, toneNode: toneNode, params: paramsToUse
        }];
        if (localAppServices.setMasterEffectsChain) {
            localAppServices.setMasterEffectsChain(newChain);
        } else {
            console.error("[Audio] setMasterEffectsChain service not available.");
        }
        rebuildMasterEffectChain();
        return effectId;
    }
    return null;
}

export function removeMasterEffect(effectId) {
    const currentChain = localAppServices.getMasterEffectsChain ? localAppServices.getMasterEffectsChain() : [];
    const effectIndex = currentChain.findIndex(e => e.id === effectId);
    if (effectIndex > -1) {
        const effectToRemove = currentChain[effectIndex];
        const isReconstructing = localAppServices.getIsReconstructingDAW ? localAppServices.getIsReconstructingDAW() : false;

        if (localAppServices.captureStateForUndo && !isReconstructing) {
            localAppServices.captureStateForUndo(`Remove ${effectToRemove.type} from Master`);
        }
        if (effectToRemove.toneNode && !effectToRemove.toneNode.disposed) {
            effectToRemove.toneNode.dispose();
        }
        const newChain = currentChain.filter(e => e.id !== effectId);
        if (localAppServices.setMasterEffectsChain) {
            localAppServices.setMasterEffectsChain(newChain);
        }
        rebuildMasterEffectChain();
    }
}

export function updateMasterEffectParam(effectId, paramPath, value) {
    const currentChain = localAppServices.getMasterEffectsChain ? localAppServices.getMasterEffectsChain() : [];
    const effectWrapper = currentChain.find(e => e.id === effectId);
    if (!effectWrapper || !effectWrapper.toneNode || effectWrapper.toneNode.disposed) {
        return;
    }

    const keys = paramPath.split('.');
    let currentStoredParamLevel = effectWrapper.params;
    for (let i = 0; i < keys.length - 1; i++) {
        currentStoredParamLevel[keys[i]] = currentStoredParamLevel[keys[i]] || {};
        currentStoredParamLevel = currentStoredParamLevel[keys[i]];
    }
    currentStoredParamLevel[keys[keys.length - 1]] = value;

    // Update the Tone.js node
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
            if (paramInstance && typeof paramInstance.value !== 'undefined') { // Tone.Signal or AudioParam
                if (typeof paramInstance.rampTo === 'function') {
                    paramInstance.rampTo(value, 0.02);
                } else {
                    paramInstance.value = value;
                }
            } else { // Direct property
                targetObject[finalParamKey] = value;
            }
        } else if (typeof effectWrapper.toneNode.set === 'function' && keys.length > 0) {
            // Fallback for complex objects if .set is available and appropriate
            const setObj = {};
            let currentLevelForSet = setObj;
            for(let i = 0; i < keys.length - 1; i++){
                currentLevelForSet[keys[i]] = {};
                currentLevelForSet = currentLevelForSet[keys[i]];
            }
            currentLevelForSet[finalParamKey] = value;
            effectWrapper.toneNode.set(setObj);
        }
    } catch (err) {
        console.error(`[Audio] Error updating param ${paramPath} for master effect ${effectWrapper.type}:`, err);
    }
}

export function reorderMasterEffect(effectId, newIndex) {
    const currentChain = localAppServices.getMasterEffectsChain ? localAppServices.getMasterEffectsChain() : [];
    const oldIndex = currentChain.findIndex(e => e.id === effectId);
     if (oldIndex === -1 || oldIndex === newIndex) return;

    const maxValidInsertIndex = currentChain.length; // Can insert at the end
    const clampedNewIndex = Math.max(0, Math.min(newIndex, maxValidInsertIndex));

    const isReconstructing = localAppServices.getIsReconstructingDAW ? localAppServices.getIsReconstructingDAW() : false;
    if (localAppServices.captureStateForUndo && !isReconstructing) {
        localAppServices.captureStateForUndo(`Reorder Master effect`);
    }

    const newChain = [...currentChain];
    const [effectToMove] = newChain.splice(oldIndex, 1);
    newChain.splice(clampedNewIndex, 0, effectToMove);

    if (localAppServices.setMasterEffectsChain) {
        localAppServices.setMasterEffectsChain(newChain);
    }
    rebuildMasterEffectChain();
}

export function updateMeters(masterMeterVisualElement, masterMeterBarVisualElement, mixerMasterMeterVisualElement, tracks) {
    if (Tone.context.state !== 'running' || !audioContextInitialized) return;

    if (masterMeter && typeof masterMeter.getValue === 'function') {
        const masterLevelValue = masterMeter.getValue();
        const level = Tone.dbToGain(masterLevelValue);
        const isClipping = masterLevelValue > -0.1;
        if (masterMeterBarVisualElement) {
            masterMeterBarVisualElement.style.width = `${Math.min(100, level * 100)}%`;
            masterMeterBarVisualElement.classList.toggle('clipping', isClipping);
        }
        if (mixerMasterMeterVisualElement) { // Passed if mixer window is open
            mixerMasterMeterVisualElement.style.width = `${Math.min(100, level * 100)}%`;
            mixerMasterMeterVisualElement.classList.toggle('clipping', isClipping);
        }
    }

    (tracks || []).forEach(track => {
        if (track && track.trackMeter && typeof track.trackMeter.getValue === 'function') {
            const meterValue = track.trackMeter.getValue();
            const level = Tone.dbToGain(meterValue);
            const isClipping = meterValue > -0.1;

            if (localAppServices.updateTrackUI) { // Pass data to UI updater
                localAppServices.updateTrackUI(track.id, 'meterUpdate', { level, isClipping });
            }
        }
    });
}

export async function playSlicePreview(trackId, sliceIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0) {
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio not ready for preview.", 2000); return; }

    const tracksArray = localAppServices.getTracks ? localAppServices.getTracks() : [];
    const track = tracksArray.find(t => t.id === trackId);

    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded || !track.slices[sliceIndex]) {
        console.warn(`[Audio] Cannot play slice preview for track ${trackId}, slice ${sliceIndex}. Conditions not met.`);
        return;
    }
    const sliceData = track.slices[sliceIndex];
    if (sliceData.duration <= 0) return;
    const time = Tone.now();
    const totalPitchShift = (sliceData.pitchShift || 0) + additionalPitchShiftInSemitones;
    const playbackRate = Math.pow(2, totalPitchShift / 12);
    let playDuration = sliceData.duration / playbackRate;
    if (sliceData.loop) playDuration = Math.min(playDuration, 2); // Limit loop preview duration

    // Determine the actual destination node for the preview player
    const actualDestination = (masterEffectsBusInput && !masterEffectsBusInput.disposed)
        ? masterEffectsBusInput
        : Tone.getDestination();

    if (!track.slicerIsPolyphonic) {
        if (!track.slicerMonoPlayer || track.slicerMonoPlayer.disposed) {
            track.setupSlicerMonoNodes();
            if(!track.slicerMonoPlayer) return;
             if(track.audioBuffer && track.audioBuffer.loaded) track.slicerMonoPlayer.buffer = track.audioBuffer;
        }
        const player = track.slicerMonoPlayer; const env = track.slicerMonoEnvelope; const gain = track.slicerMonoGain;
        if (player.state === 'started') player.stop(time);
        if (env.getValueAtTime(time) > 0.001) env.triggerRelease(time);
        player.buffer = track.audioBuffer; env.set(sliceData.envelope);
        gain.gain.value = Tone.dbToGain(-6) * sliceData.volume * velocity;
        player.playbackRate = playbackRate; player.reverse = sliceData.reverse;
        player.loop = sliceData.loop; player.loopStart = sliceData.offset; player.loopEnd = sliceData.offset + sliceData.duration;

        if (gain && !gain.disposed && actualDestination && !actualDestination.disposed) {
            try { gain.disconnect(); } catch(e) {/*ignore*/}
            gain.connect(actualDestination); // Connect directly to master bus input or destination for preview
        }

        player.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
        env.triggerAttack(time);
        if (!sliceData.loop) {
            const releaseTime = time + playDuration - (sliceData.envelope.release || 0.1);
            env.triggerRelease(Math.max(time, releaseTime));
        }
    } else { // Polyphonic
        const tempPlayer = new Tone.Player(track.audioBuffer);
        const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
        const tempGain = new Tone.Gain(Tone.dbToGain(-6) * sliceData.volume * velocity);
        tempPlayer.chain(tempEnv, tempGain, actualDestination); // Connect to master bus input or destination
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

    const tracksArray = localAppServices.getTracks ? localAppServices.getTracks() : [];
    const track = tracksArray.find(t => t.id === trackId);

    if (!track || track.type !== 'DrumSampler' || !track.drumPadPlayers[padIndex] || !track.drumPadPlayers[padIndex].loaded) {
        console.warn(`[Audio] Cannot play drum pad preview for track ${trackId}, pad ${padIndex}. Conditions not met.`);
        return;
    }
    const player = track.drumPadPlayers[padIndex];
    const padData = track.drumSamplerPads[padIndex];

    // For preview, connect directly to master bus input or destination, bypassing track effects
    const actualDestination = (masterEffectsBusInput && !masterEffectsBusInput.disposed)
        ? masterEffectsBusInput
        : Tone.getDestination();
    try { player.disconnect(); } catch(e) {/* ignore */} // Disconnect from previous target if any
    player.connect(actualDestination);

    player.volume.value = Tone.dbToGain(padData.volume * velocity * 0.5);
    const totalPadPitchShift = (padData.pitchShift || 0) + additionalPitchShiftInSemitones;
    player.playbackRate = Math.pow(2, totalPadPitchShift / 12);
    player.start(Tone.now());

    // Reconnect to track's normal output after preview (or handle this in track.rebuildEffectChain)
    // For simplicity, we assume rebuildEffectChain will handle reconnections if needed.
    // If not, a more robust solution would be to temporarily store and restore connections.
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
        const targetName = trackTypeHint === 'DrumSampler' ? `Pad ${padIndex + 1} on ${track.name}` : track.name;
        localAppServices.captureStateForUndo(`Load ${sourceName} to ${targetName}`);
    }

    let objectURLForTone = null;
    let base64DataURL = null;

    try {
        objectURLForTone = URL.createObjectURL(fileObject);
        base64DataURL = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = (err) => reject(new Error(`FileReader error: ${err.message}`)); // Enhanced error
        });

        const dbKeySuffix = trackTypeHint === 'DrumSampler' ? `drumPad-${padIndex}-${sourceName}` : `${trackTypeHint}-${sourceName}`;
        const dbKey = `track-${track.id}-${dbKeySuffix}`;
        await storeAudio(dbKey, fileObject); // Ensure this can be caught

        const newAudioBuffer = await new Tone.Buffer().load(objectURLForTone); // Ensure this can be caught

        if (trackTypeHint === 'Sampler') {
            if (track.audioBuffer && !track.audioBuffer.disposed) track.audioBuffer.dispose();
            track.disposeSlicerMonoNodes();
            track.audioBuffer = newAudioBuffer;
            track.samplerAudioData = { fileName: sourceName, audioBufferDataURL: base64DataURL, dbKey: dbKey, status: 'loaded' };
            if (!track.slicerIsPolyphonic && track.audioBuffer?.loaded) track.setupSlicerMonoNodes();
            if (localAppServices.autoSliceSample) localAppServices.autoSliceSample(track.id, Constants.numSlices);
            if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'samplerLoaded');

        } else if (trackTypeHint === 'InstrumentSampler') {
            if (track.instrumentSamplerSettings.audioBuffer && !track.instrumentSamplerSettings.audioBuffer.disposed) track.instrumentSamplerSettings.audioBuffer.dispose();
            if (track.toneSampler && !track.toneSampler.disposed) track.toneSampler.dispose();
            track.instrumentSamplerSettings = {
                ...track.instrumentSamplerSettings,
                audioBuffer: newAudioBuffer, audioBufferDataURL: base64DataURL, originalFileName: sourceName, dbKey: dbKey, status: 'loaded',
                loopStart: 0, loopEnd: newAudioBuffer.duration
            };
            track.setupToneSampler();
            if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'instrumentSamplerLoaded');

        } else if (trackTypeHint === 'DrumSampler' && padIndex !== null) {
            const padData = track.drumSamplerPads[padIndex];
            if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
            if (track.drumPadPlayers[padIndex] && !track.drumPadPlayers[padIndex].disposed) track.drumPadPlayers[padIndex].dispose();
            padData.audioBuffer = newAudioBuffer; padData.audioBufferDataURL = base64DataURL;
            padData.originalFileName = sourceName; padData.dbKey = dbKey; padData.status = 'loaded';
            track.drumPadPlayers[padIndex] = new Tone.Player(newAudioBuffer);
            // Ensure drum pad player is connected within the track's effect chain
            track.rebuildEffectChain(); // This should connect the new player
            if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'drumPadLoaded', padIndex);
        }

        if (track.type !== 'DrumSampler') { // Drum sampler rebuilds chain internally for each pad
             track.rebuildEffectChain();
        }
        showNotification(`Sample "${sourceName}" loaded for ${track.name}${trackTypeHint === 'DrumSampler' ? ` (Pad ${padIndex+1})` : ''}.`, 2000);

    } catch (error) {
        console.error(`[Audio] Error in commonLoadSampleLogic for "${sourceName}":`, error);
        showNotification(`Error loading sample "${sourceName}": ${error.message || 'Unknown error. Check console.'}`, 4000);
        if (trackTypeHint === 'Sampler') track.samplerAudioData.status = 'error';
        else if (trackTypeHint === 'InstrumentSampler') track.instrumentSamplerSettings.status = 'error';
        else if (trackTypeHint === 'DrumSampler' && padIndex !== null) track.drumSamplerPads[padIndex].status = 'error';
        if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sampleLoadError', padIndex);

    } finally { if (objectURLForTone) URL.revokeObjectURL(objectURLForTone); }
}


export async function loadSampleFile(eventOrUrl, trackId, trackTypeHint, fileNameForUrl = null) {
    const tracksArray = localAppServices.getTracks ? localAppServices.getTracks() : [];
    const track = tracksArray.find(t => t.id === trackId);
    if (!track) { showNotification(`Track ID ${trackId} not found.`, 3000); return; }
    if (trackTypeHint !== 'Sampler' && trackTypeHint !== 'InstrumentSampler') {
        showNotification(`Cannot load sample into ${trackTypeHint} track.`, 3000); return;
    }
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio system not ready.", 3000); return; }

    let providedBlob, sourceName;
    const isUrlSource = typeof eventOrUrl === 'string';
    const isDirectFile = eventOrUrl instanceof File;
    const isBlobEvent = eventOrUrl instanceof Blob;

    try {
        if (isUrlSource) {
            sourceName = fileNameForUrl || eventOrUrl.split('/').pop().split('?')[0] || "loaded_sample";
            const response = await fetch(eventOrUrl);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status} for ${sourceName}`);
            providedBlob = await response.blob();
        } else if (eventOrUrl && eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
            providedBlob = eventOrUrl.target.files[0]; sourceName = providedBlob.name;
        } else if (isDirectFile) {
            providedBlob = eventOrUrl; sourceName = providedBlob.name;
        } else if (isBlobEvent) {
            providedBlob = eventOrUrl; sourceName = fileNameForUrl || "loaded_blob_sample";
        } else { throw new Error("No file selected or invalid source."); }

        if (!providedBlob) { throw new Error("Could not obtain file data."); }

        const inferredType = getMimeTypeFromFilename(sourceName);
        const explicitType = providedBlob.type || inferredType || 'application/octet-stream';
        const fileObject = new File([providedBlob], sourceName, { type: explicitType });

        if (!fileObject.type.startsWith('audio/') && fileObject.type !== "application/octet-stream") {
            throw new Error(`Invalid audio file type: "${fileObject.type}".`);
        }
        if (fileObject.size === 0) { throw new Error(`Audio file "${sourceName}" is empty.`); }

        await commonLoadSampleLogic(fileObject, sourceName, track, trackTypeHint);
    } catch (error) {
        console.error(`[Audio] Error in loadSampleFile for track ${trackId}:`, error);
        showNotification(error.message, 4000);
         if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sampleLoadError');
    }
}

export async function loadDrumSamplerPadFile(eventOrUrl, trackId, padIndex, fileNameForUrl = null) {
    const tracksArray = localAppServices.getTracks ? localAppServices.getTracks() : [];
    const track = tracksArray.find(t => t.id === trackId);
    if (!track || track.type !== 'DrumSampler') {
        console.warn(`[Audio] Invalid track or type for loadDrumSamplerPadFile. Track ID: ${trackId}, Type: ${track?.type}`);
        return;
    }
    if (typeof padIndex !== 'number' || isNaN(padIndex) || padIndex < 0 || padIndex >= track.drumSamplerPads.length) {
        console.warn(`[Audio] Invalid padIndex for loadDrumSamplerPadFile: ${padIndex}`);
        return;
    }
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { return; }

    let providedBlob, sourceName;
    const isUrlSource = typeof eventOrUrl === 'string';
    const isDirectFile = eventOrUrl instanceof File;
    const isBlobEvent = eventOrUrl instanceof Blob;

    try {
        if (isUrlSource) {
            sourceName = fileNameForUrl || "pad_sample_from_url";
            const response = await fetch(eventOrUrl); if (!response.ok) throw new Error(`Fetch failed: ${response.status} for ${sourceName}`);
            providedBlob = await response.blob();
        } else if (eventOrUrl && eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
            providedBlob = eventOrUrl.target.files[0]; sourceName = providedBlob.name;
        } else if (isDirectFile) {
            providedBlob = eventOrUrl; sourceName = providedBlob.name;
        } else if (isBlobEvent) {
            providedBlob = eventOrUrl; sourceName = fileNameForUrl || "pad_blob_sample";
        } else { throw new Error("No file for drum pad."); }

        if (!providedBlob) { throw new Error("Could not get drum sample data."); }

        const inferredType = getMimeTypeFromFilename(sourceName);
        const explicitType = providedBlob.type || inferredType || 'application/octet-stream';
        const fileObject = new File([providedBlob], sourceName, { type: explicitType });

        if (!fileObject.type.startsWith('audio/') && fileObject.type !== "application/octet-stream") {
            throw new Error(`Invalid audio file type for drum pad: "${fileObject.type}".`);
        }
        if (fileObject.size === 0) { throw new Error(`Drum sample "${sourceName}" is empty.`); }

        await commonLoadSampleLogic(fileObject, sourceName, track, 'DrumSampler', padIndex);
    } catch (error) {
        console.error(`[Audio] Error in loadDrumSamplerPadFile for track ${trackId}, pad ${padIndex}:`, error);
        showNotification(error.message, 4000);
        if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sampleLoadError', padIndex);
    }
}


export async function loadSoundFromBrowserToTarget(soundData, targetTrackId, targetTrackTypeIgnored, targetPadOrSliceIndex = null) {
    const tracksArray = localAppServices.getTracks ? localAppServices.getTracks() : [];
    const track = tracksArray.find(t => t.id === parseInt(targetTrackId));
    if (!track) { showNotification("Target track not found.", 3000); return; }

    const { fullPath, libraryName, fileName } = soundData;
    const isTargetSamplerType = ['Sampler', 'InstrumentSampler', 'DrumSampler'].includes(track.type);
    if (!isTargetSamplerType) { showNotification(`Cannot load to ${track.type} track.`, 3000); return; }

    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio system not ready.", 3000); return; }

    showNotification(`Loading "${fileName}" to ${track.name}...`, 2000);
    try {
        const loadedZipFiles = localAppServices.getLoadedZipFiles ? localAppServices.getLoadedZipFiles() : {};
        if (!loadedZipFiles[libraryName] || loadedZipFiles[libraryName] === "loading") {
            throw new Error(`Library "${libraryName}" not loaded or still loading.`);
        }
        const zipEntry = loadedZipFiles[libraryName].file(fullPath);
        if (!zipEntry) throw new Error(`File "${fullPath}" not in ZIP.`);

        const fileBlobFromZip = await zipEntry.async("blob");
        const inferredMimeType = getMimeTypeFromFilename(fileName);
        const finalMimeType = fileBlobFromZip.type || inferredMimeType || 'application/octet-stream';
        const blobToLoad = new File([fileBlobFromZip], fileName, {type: finalMimeType});

        if (track.type === 'DrumSampler') {
            let actualPadIndex = targetPadOrSliceIndex;
            if (typeof actualPadIndex !== 'number' || isNaN(actualPadIndex) || actualPadIndex < 0 || actualPadIndex >= Constants.numDrumSamplerPads) {
                actualPadIndex = track.drumSamplerPads.findIndex(p => !p.audioBufferDataURL && !p.dbKey);
                if (actualPadIndex === -1) actualPadIndex = track.selectedDrumPadForEdit;
                if (actualPadIndex === -1 || typeof actualPadIndex !== 'number') actualPadIndex = 0;
            }
            await commonLoadSampleLogic(blobToLoad, fileName, track, 'DrumSampler', actualPadIndex);
        } else {
            await commonLoadSampleLogic(blobToLoad, fileName, track, track.type);
        }
    } catch (error) {
        console.error(`[Audio] Error loading sound from browser:`, error);
        showNotification(`Error loading "${fileName}": ${error.message}`, 3000);
        if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sampleLoadError', targetPadOrSliceIndex);
    }
}

export async function fetchSoundLibrary(libraryName, zipUrl, isAutofetch = false) {
    const loadedZipFiles = localAppServices.getLoadedZipFiles ? localAppServices.getLoadedZipFiles() : {};
    const soundLibraryFileTrees = localAppServices.getSoundLibraryFileTrees ? localAppServices.getSoundLibraryFileTrees() : {};

    if (loadedZipFiles[libraryName] && loadedZipFiles[libraryName] !== "loading") {
        if (!isAutofetch && localAppServices.updateSoundBrowserDisplayForLibrary) {
            localAppServices.updateSoundBrowserDisplayForLibrary(libraryName);
        }
        return;
    }
    if (loadedZipFiles[libraryName] === "loading") return;

    if (!isAutofetch && localAppServices.updateSoundBrowserDisplayForLibrary) {
        localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, true);
    }

    try {
        loadedZipFiles[libraryName] = "loading"; // Directly modify; state module doesn't have setter for this complex object
        const response = await fetch(zipUrl);
        if (!response.ok) throw new Error(`HTTP error ${response.status} fetching ${zipUrl}`);
        const zipData = await response.arrayBuffer();

        if (typeof JSZip === 'undefined') throw new Error("JSZip library not found.");

        const jszip = new JSZip();
        const loadedZip = await jszip.loadAsync(zipData);
        loadedZipFiles[libraryName] = loadedZip;

        const fileTree = {};
        loadedZip.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return;
            const pathParts = relativePath.split('/').filter(p => p && p !== '__MACOSX' && !p.startsWith('.'));
            if (pathParts.length === 0) return;

            let currentLevel = fileTree;
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                if (i === pathParts.length - 1) {
                    if (part.match(/\.(wav|mp3|ogg|flac|aac|m4a)$/i)) {
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
        soundLibraryFileTrees[libraryName] = fileTree; // Directly modify

        if (localAppServices.updateSoundBrowserDisplayForLibrary) {
            localAppServices.updateSoundBrowserDisplayForLibrary(libraryName);
        }
    } catch (error) {
        console.error(`[Audio] Error fetching/processing ${libraryName} from ${zipUrl}:`, error);
        delete loadedZipFiles[libraryName];
        delete soundLibraryFileTrees[libraryName];
        if (!isAutofetch) showNotification(`Error loading library ${libraryName}: ${error.message}`, 4000);
        if (localAppServices.updateSoundBrowserDisplayForLibrary) {
             localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, false, true);
        }
    }
}

export function autoSliceSample(trackId, numSlicesToCreate = Constants.numSlices) {
    const tracksArray = localAppServices.getTracks ? localAppServices.getTracks() : [];
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

    if (localAppServices.updateTrackUI) {
        localAppServices.updateTrackUI(track.id, 'sampleSliced');
    }
    showNotification(`Sample auto-sliced into ${numSlicesToCreate} parts.`, 2000);
}
