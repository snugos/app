// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading
import * as Constants from './constants.js';
import { showNotification } from './utils.js'; // Already correctly imported
import { createEffectInstance, getEffectDefaultParams } from './effectsRegistry.js'; // Already correctly imported
import { storeAudio, getAudio } from './db.js'; // Already correctly imported

// These global audio nodes are central to the audio routing.
// While ideally managed by a dedicated audio manager, they remain global for this pass.
// main.js will ensure these are initialized.
// window.masterEffectsBusInput = null; // Set in setupMasterBus
// window.masterEffectsChain = []; // Managed here and in state.js for save/load
// window.masterGainNode = null; // Set in setupMasterBus

let audioContextInitialized = false;
// let masterGainNodeLocal = null; // Internal reference

// appServices will be passed from main.js to provide access to state functions if needed
let localAppServices = {};
export function initializeAudioModule(appServices) {
    localAppServices = appServices;
    // Initialize masterEffectsChain on window if not already present (e.g. by state.js during load)
    if (typeof window !== 'undefined' && !window.masterEffectsChain) {
        window.masterEffectsChain = [];
    }
}


export async function initAudioContextAndMasterMeter(isUserInitiated = false) {
    console.log('[Audio] initAudioContextAndMasterMeter called. isUserInitiated:', isUserInitiated, 'Current Tone.context.state:', Tone.context.state, 'audioContextInitialized:', audioContextInitialized);

    if (audioContextInitialized && Tone.context.state === 'running') {
        if (typeof window !== 'undefined' && (!window.masterEffectsBusInput || window.masterEffectsBusInput.disposed || !window.masterGainNode || window.masterGainNode.disposed)) {
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
                setupMasterBus();
            }
            // Ensure masterGainNode is on window for other modules if they still expect it
            if (typeof window !== 'undefined' && window.masterGainNode && !window.masterGainNode.disposed) {
                if (!window.masterMeter || window.masterMeter.disposed) {
                    window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
                    console.log('[Audio] Master meter created.');
                }
                try { window.masterGainNode.disconnect(window.masterMeter); } catch(e) {/*ignore*/}
                window.masterGainNode.connect(window.masterMeter);
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
    if (typeof window === 'undefined') return; // Should not happen in browser
    console.log('[Audio] setupMasterBus called.');

    if (!window.masterEffectsBusInput || window.masterEffectsBusInput.disposed) {
        if (window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed) {
             try {window.masterEffectsBusInput.dispose();} catch(e){console.warn("[Audio - setupMasterBus] Error disposing old master bus input", e.message)}
        }
        window.masterEffectsBusInput = new Tone.Gain();
        console.log('[Audio] Master effects bus input created/recreated.');
    }

    if (!window.masterGainNode || window.masterGainNode.disposed) {
        if (window.masterGainNode && !window.masterGainNode.disposed) {
            try {window.masterGainNode.dispose();} catch(e){console.warn("[Audio - setupMasterBus] Error disposing old master gain node", e.message)}
        }
        window.masterGainNode = new Tone.Gain();
        // masterGainNodeLocal = window.masterGainNode;
        console.log('[Audio] Master gain node created/recreated.');
    }
    rebuildMasterEffectChain();
}

export function rebuildMasterEffectChain() {
    console.log('[Audio] rebuildMasterEffectChain called.');
    if (typeof window === 'undefined' || !window.masterEffectsBusInput || window.masterEffectsBusInput.disposed || !window.masterGainNode || window.masterGainNode.disposed) {
        console.log('[Audio] Master bus components not ready, attempting setupMasterBus first.');
        setupMasterBus();
        if (!window.masterEffectsBusInput || !window.masterGainNode) {
            console.error('[Audio] Master bus setup failed within rebuildMasterEffectChain. Aborting.');
            return;
        }
    }

    try { window.masterEffectsBusInput.disconnect(); } catch(e) { /* ignore */ }

    (window.masterEffectsChain || []).forEach(effectWrapper => {
        if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
            try { effectWrapper.toneNode.disconnect(); } catch (e) { /* ignore */ }
        }
    });
    try { window.masterGainNode.disconnect(); } catch(e) { /* ignore */}

    let currentAudioPathEnd = window.masterEffectsBusInput;
    console.log('[Audio] Starting master chain with:', currentAudioPathEnd?.name || 'MasterBusInput');

    (window.masterEffectsChain || []).forEach(effectWrapper => {
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

    if (currentAudioPathEnd && !currentAudioPathEnd.disposed && window.masterGainNode && !window.masterGainNode.disposed) {
        try {
            console.log(`[Audio] Connecting ${currentAudioPathEnd.name || 'LastEffect/BusInput'} to MasterGainNode`);
            currentAudioPathEnd.connect(window.masterGainNode);
        } catch (e) {
            console.error(`[Audio - rebuildMasterEffectChain] Error connecting output of effects chain to masterGainNode:`, e);
        }
    } else {
        console.warn('[Audio] Could not connect end of master chain to masterGainNode. CurrentOutput:', currentAudioPathEnd, 'MasterGain:', window.masterGainNode);
    }

    if (window.masterGainNode && !window.masterGainNode.disposed) {
        try {
            console.log('[Audio] Connecting MasterGainNode to destination and meter.');
            window.masterGainNode.toDestination();
            if (window.masterMeter && !window.masterMeter.disposed) {
                window.masterGainNode.connect(window.masterMeter);
            } else {
                window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
                window.masterGainNode.connect(window.masterMeter);
                console.log('[Audio] New master meter created and connected.');
            }
        } catch (e) { console.error("[Audio - rebuildMasterEffectChain] Error connecting masterGainNode to destination or meter:", e); }
    } else {
        console.warn('[Audio] MasterGainNode not available or disposed for final connection.');
    }

    // Rebuild individual track chains as they connect to the master bus
    const currentTracks = localAppServices.getTracks ? localAppServices.getTracks() : (typeof window !== 'undefined' && window.getTracks ? window.getTracks() : []);
    console.log(`[Audio] Rebuilding effect chains for ${currentTracks.length} tracks.`);
    currentTracks.forEach(track => {
        if (track && typeof track.rebuildEffectChain === 'function') {
            track.rebuildEffectChain();
        }
    });
    console.log('[Audio] rebuildMasterEffectChain finished.');
}


export function addMasterEffect(effectType, initialParams = null) {
    const isReconstructing = typeof window !== 'undefined' && window.isReconstructingDAW;
    if (localAppServices.captureStateForUndo && !isReconstructing) {
        localAppServices.captureStateForUndo(`Add ${effectType} to Master`);
    }
    const paramsToUse = initialParams ? JSON.parse(JSON.stringify(initialParams)) : getEffectDefaultParams(effectType);
    const toneNode = createEffectInstance(effectType, paramsToUse);

    if (toneNode) {
        const effectId = `mastereffect_${effectType}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        if(typeof window !== 'undefined' && !window.masterEffectsChain) {
            window.masterEffectsChain = [];
        }
        window.masterEffectsChain.push({
            id: effectId, type: effectType, toneNode: toneNode, params: paramsToUse
        });
        rebuildMasterEffectChain();
        return effectId;
    }
    return null;
}

export function removeMasterEffect(effectId) {
    if(typeof window === 'undefined' || !window.masterEffectsChain) window.masterEffectsChain = [];
    const effectIndex = window.masterEffectsChain.findIndex(e => e.id === effectId);
    if (effectIndex > -1) {
        const effectToRemove = window.masterEffectsChain[effectIndex];
        const isReconstructing = typeof window !== 'undefined' && window.isReconstructingDAW;
        if (localAppServices.captureStateForUndo && !isReconstructing) {
            localAppServices.captureStateForUndo(`Remove ${effectToRemove.type} from Master`);
        }
        if (effectToRemove.toneNode && !effectToRemove.toneNode.disposed) {
            effectToRemove.toneNode.dispose();
        }
        window.masterEffectsChain.splice(effectIndex, 1);
        rebuildMasterEffectChain();
    }
}

export function updateMasterEffectParam(effectId, paramPath, value) {
    if (typeof window === 'undefined' || !window.masterEffectsChain) window.masterEffectsChain = [];
    const effectWrapper = window.masterEffectsChain.find(e => e.id === effectId);
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
        } else if (typeof effectWrapper.toneNode.set === 'function' && keys.length > 0) {
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
    if(typeof window === 'undefined' || !window.masterEffectsChain) window.masterEffectsChain = [];
    const oldIndex = window.masterEffectsChain.findIndex(e => e.id === effectId);
     if (oldIndex === -1 || oldIndex === newIndex) return;

    const maxValidInsertIndex = window.masterEffectsChain.length;
    const clampedNewIndex = Math.max(0, Math.min(newIndex, maxValidInsertIndex));
    const isReconstructing = typeof window !== 'undefined' && window.isReconstructingDAW;

    if (localAppServices.captureStateForUndo && !isReconstructing) {
        localAppServices.captureStateForUndo(`Reorder Master effect`);
    }
    const [effectToMove] = window.masterEffectsChain.splice(oldIndex, 1);
    window.masterEffectsChain.splice(clampedNewIndex, 0, effectToMove);

    rebuildMasterEffectChain();
}

export function updateMeters(masterMeterVisualElement, masterMeterBarVisualElement, mixerMasterMeterVisualElement, tracks) {
    if (Tone.context.state !== 'running' || !audioContextInitialized || typeof window === 'undefined') return;

    if (window.masterMeter && typeof window.masterMeter.getValue === 'function') {
        const masterLevelValue = window.masterMeter.getValue();
        const level = Tone.dbToGain(masterLevelValue);
        const isClipping = masterLevelValue > -0.1; // Clipping if very close to 0dBFS or above
        if (masterMeterBarVisualElement) { // This is the one in Global Controls
            masterMeterBarVisualElement.style.width = `${Math.min(100, level * 100)}%`;
            masterMeterBarVisualElement.classList.toggle('clipping', isClipping);
        }
        // The mixerMasterMeterVisualElement is passed directly if the mixer is open
        if (mixerMasterMeterVisualElement) {
            mixerMasterMeterVisualElement.style.width = `${Math.min(100, level * 100)}%`;
            mixerMasterMeterVisualElement.classList.toggle('clipping', isClipping);
        }
    }

    (tracks || []).forEach(track => {
        if (track && track.trackMeter && typeof track.trackMeter.getValue === 'function') {
            const meterValue = track.trackMeter.getValue();
            const level = Tone.dbToGain(meterValue);
            const isClipping = meterValue > -0.1;

            // UI updates for track meters are now handled by ui.js or main.js
            // This function provides the data, but doesn't directly touch DOM outside its scope
            if (localAppServices.updateTrackMeterUI) {
                localAppServices.updateTrackMeterUI(track.id, level, isClipping);
            }
        }
    });
}

export async function playSlicePreview(trackId, sliceIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0) {
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio not ready for preview.", 2000); return; }

    const tracksArray = localAppServices.getTracks ? localAppServices.getTracks() : (typeof window !== 'undefined' && window.getTracks ? window.getTracks() : []);
    const track = tracksArray.find(t => t.id === trackId);

    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded || !track.slices[sliceIndex]) {
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
    const actualDestination = (firstEffectNodeInTrack && !firstEffectNodeInTrack.disposed)
        ? firstEffectNodeInTrack
        : (typeof window !== 'undefined' && window.masterEffectsBusInput || Tone.getDestination());

    if (!track.slicerIsPolyphonic) {
        if (!track.slicerMonoPlayer || track.slicerMonoPlayer.disposed) {
            track.setupSlicerMonoNodes(); // This internally chains to slicerMonoGain
            if(!track.slicerMonoPlayer) return;
             if(track.audioBuffer && track.audioBuffer.loaded) track.slicerMonoPlayer.buffer = track.audioBuffer;
        }
        const player = track.slicerMonoPlayer; const env = track.slicerMonoEnvelope; const gain = track.slicerMonoGain;
        if (player.state === 'started') player.stop(time);
        if (env.getValueAtTime(time) > 0.001) env.triggerRelease(time); // Release previous note if still ringing
        player.buffer = track.audioBuffer; env.set(sliceData.envelope);
        gain.gain.value = Tone.dbToGain(-6) * sliceData.volume * velocity; // Apply some headroom
        player.playbackRate = playbackRate; player.reverse = sliceData.reverse;
        player.loop = sliceData.loop; player.loopStart = sliceData.offset; player.loopEnd = sliceData.offset + sliceData.duration;

        // Connect the mono slicer's gain node to the track's effect chain start or gain node
        if (gain && !gain.disposed && actualDestination && !actualDestination.disposed) {
            try { gain.disconnect(); } catch(e) {/*ignore*/} // Disconnect from previous target
            gain.connect(actualDestination);
        }


        player.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
        env.triggerAttack(time);
        if (!sliceData.loop) {
            const releaseTime = time + playDuration - (sliceData.envelope.release || 0.1);
            env.triggerRelease(Math.max(time, releaseTime)); // Ensure release time is not in the past
        }
    } else { // Polyphonic
        const tempPlayer = new Tone.Player(track.audioBuffer);
        const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
        const tempGain = new Tone.Gain(Tone.dbToGain(-6) * sliceData.volume * velocity); // Apply some headroom
        tempPlayer.chain(tempEnv, tempGain, actualDestination);
        tempPlayer.playbackRate = playbackRate; tempPlayer.reverse = sliceData.reverse;
        tempPlayer.loop = sliceData.loop; tempPlayer.loopStart = sliceData.offset; tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
        tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
        tempEnv.triggerAttack(time);
        if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95); // Slightly earlier release for natural decay
        Tone.Transport.scheduleOnce(() => { if(tempPlayer && !tempPlayer.disposed) tempPlayer.dispose(); if(tempEnv && !tempEnv.disposed) tempEnv.dispose(); if(tempGain && !tempGain.disposed) tempGain.dispose(); }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);
    }
}

export async function playDrumSamplerPadPreview(trackId, padIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0) {
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio not ready for preview.", 2000); return; }

    const tracksArray = localAppServices.getTracks ? localAppServices.getTracks() : (typeof window !== 'undefined' && window.getTracks ? window.getTracks() : []);
    const track = tracksArray.find(t => t.id === trackId);

    if (!track || track.type !== 'DrumSampler' || !track.drumPadPlayers[padIndex] || !track.drumPadPlayers[padIndex].loaded) {
        return;
    }
    const player = track.drumPadPlayers[padIndex];
    const padData = track.drumSamplerPads[padIndex];
    player.volume.value = Tone.dbToGain(padData.volume * velocity * 0.5); // Apply some headroom
    const totalPadPitchShift = (padData.pitchShift || 0) + additionalPitchShiftInSemitones;
    player.playbackRate = Math.pow(2, totalPadPitchShift / 12);
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
    if (lowerFilename.endsWith(".m4a")) return "audio/mp4"; // m4a is mp4 container
    return "application/octet-stream";
}

async function commonLoadSampleLogic(fileObject, sourceName, track, trackTypeHint, padIndex = null) {
    const isReconstructing = typeof window !== 'undefined' && window.isReconstructingDAW;
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
            reader.onerror = reject;
            reader.readAsDataURL(fileObject);
        });

        const dbKeySuffix = trackTypeHint === 'DrumSampler' ? `drumPad-${padIndex}-${sourceName}` : `${trackTypeHint}-${sourceName}`;
        const dbKey = `track-${track.id}-${dbKeySuffix}`;
        await storeAudio(dbKey, fileObject);

        const newAudioBuffer = await new Tone.Buffer().load(objectURLForTone);

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
                ...track.instrumentSamplerSettings, // Preserve existing envelope, loop settings etc.
                audioBuffer: newAudioBuffer, audioBufferDataURL: base64DataURL, originalFileName: sourceName, dbKey: dbKey, status: 'loaded',
                loopStart: 0, loopEnd: newAudioBuffer.duration // Reset loop points for new sample
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
            if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'drumPadLoaded', padIndex);
        }

        track.rebuildEffectChain();
        showNotification(`Sample "${sourceName}" loaded for ${track.name}${trackTypeHint === 'DrumSampler' ? ` (Pad ${padIndex+1})` : ''}.`, 2000);

    } catch (error) {
        console.error(`[Audio] Error in commonLoadSampleLogic for "${sourceName}":`, error);
        showNotification(`Error loading sample "${sourceName}": ${error.message || 'Unknown error.'}`, 4000);
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

    if (isUrlSource) {
        sourceName = fileNameForUrl || eventOrUrl.split('/').pop().split('?')[0] || "loaded_sample";
        try {
            const response = await fetch(eventOrUrl);
            if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            providedBlob = await response.blob();
        } catch (e) { showNotification(`Error fetching sample: ${e.message}`, 3000); return; }
    } else if (eventOrUrl && eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
        providedBlob = eventOrUrl.target.files[0]; sourceName = providedBlob.name;
    } else if (isDirectFile) {
        providedBlob = eventOrUrl; sourceName = providedBlob.name;
    } else if (isBlobEvent) {
        providedBlob = eventOrUrl; sourceName = fileNameForUrl || "loaded_blob_sample";
    } else { showNotification("No file selected or invalid source.", 3000); return; }

    if (!providedBlob) { showNotification("Could not obtain file data.", 3000); return; }

    const inferredType = getMimeTypeFromFilename(sourceName);
    const explicitType = providedBlob.type || inferredType || 'application/octet-stream';
    const fileObject = new File([providedBlob], sourceName, { type: explicitType });

    if (!fileObject.type.startsWith('audio/') && fileObject.type !== "application/octet-stream") {
        showNotification(`Invalid audio file type: "${fileObject.type}".`, 3000); return;
    }
    if (fileObject.size === 0) { showNotification(`Audio file "${sourceName}" is empty.`, 3000); return; }

    await commonLoadSampleLogic(fileObject, sourceName, track, trackTypeHint);
}

export async function loadDrumSamplerPadFile(eventOrUrl, trackId, padIndex, fileNameForUrl = null) {
    const tracksArray = localAppServices.getTracks ? localAppServices.getTracks() : [];
    const track = tracksArray.find(t => t.id === trackId);
    if (!track || track.type !== 'DrumSampler') { return; }
    if (typeof padIndex !== 'number' || isNaN(padIndex) || padIndex < 0 || padIndex >= track.drumSamplerPads.length) { return; }
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { return; }

    let providedBlob, sourceName;
    const isUrlSource = typeof eventOrUrl === 'string';
    const isDirectFile = eventOrUrl instanceof File;
    const isBlobEvent = eventOrUrl instanceof Blob;

    if (isUrlSource) {
        sourceName = fileNameForUrl || "pad_sample_from_url";
        try {
            const response = await fetch(eventOrUrl); if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
            providedBlob = await response.blob();
        } catch (e) { showNotification(`Error fetching drum sample: ${e.message}`, 3000); return; }
    } else if (eventOrUrl && eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
        providedBlob = eventOrUrl.target.files[0]; sourceName = providedBlob.name;
    } else if (isDirectFile) {
        providedBlob = eventOrUrl; sourceName = providedBlob.name;
    } else if (isBlobEvent) {
        providedBlob = eventOrUrl; sourceName = fileNameForUrl || "pad_blob_sample";
    } else { showNotification("No file for drum pad.", 3000); return; }

    if (!providedBlob) { showNotification("Could not get drum sample data.", 3000); return; }

    const inferredType = getMimeTypeFromFilename(sourceName);
    const explicitType = providedBlob.type || inferredType || 'application/octet-stream';
    const fileObject = new File([providedBlob], sourceName, { type: explicitType });

    if (!fileObject.type.startsWith('audio/') && fileObject.type !== "application/octet-stream") {
        showNotification(`Invalid audio file type for drum pad: "${fileObject.type}".`, 3000); return;
    }
    if (fileObject.size === 0) { showNotification(`Drum sample "${sourceName}" is empty.`, 3000); return; }

    await commonLoadSampleLogic(fileObject, sourceName, track, 'DrumSampler', padIndex);
}


export async function loadSoundFromBrowserToTarget(soundData, targetTrackId, targetTrackTypeIgnored, targetPadOrSliceIndex = null) {
    // targetTrackTypeIgnored is not needed as we get the type from the track object.
    const tracksArray = localAppServices.getTracks ? localAppServices.getTracks() : [];
    const track = tracksArray.find(t => t.id === parseInt(targetTrackId));
    if (!track) { showNotification("Target track not found.", 3000); return; }

    const { fullPath, libraryName, fileName } = soundData;
    const isTargetSamplerType = ['Sampler', 'InstrumentSampler', 'DrumSampler'].includes(track.type);
    if (!isTargetSamplerType) { showNotification(`Cannot load to ${track.type} track.`, 3000); return; }

    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio not ready.", 3000); return; }

    showNotification(`Loading "${fileName}" to ${track.name}...`, 2000);
    let tempBlobUrlForDirectLoad = null;
    try {
        if (typeof window === 'undefined' || !window.loadedZipFiles || !window.loadedZipFiles[libraryName] || window.loadedZipFiles[libraryName] === "loading") {
            throw new Error(`Library "${libraryName}" not loaded or still loading.`);
        }
        const zipEntry = window.loadedZipFiles[libraryName].file(fullPath);
        if (!zipEntry) throw new Error(`File "${fullPath}" not in ZIP.`);

        const fileBlobFromZip = await zipEntry.async("blob");
        const inferredMimeType = getMimeTypeFromFilename(fileName);
        const finalMimeType = fileBlobFromZip.type || inferredMimeType || 'application/octet-stream';
        const blobToLoad = new File([fileBlobFromZip], fileName, {type: finalMimeType});
        // tempBlobUrlForDirectLoad = URL.createObjectURL(blobToLoad); // Not needed if passing blob directly

        if (track.type === 'DrumSampler') {
            let actualPadIndex = targetPadOrSliceIndex;
            if (typeof actualPadIndex !== 'number' || isNaN(actualPadIndex) || actualPadIndex < 0 || actualPadIndex >= Constants.numDrumSamplerPads) {
                actualPadIndex = track.drumSamplerPads.findIndex(p => !p.audioBufferDataURL && !p.dbKey); // Find first empty
                if (actualPadIndex === -1) actualPadIndex = track.selectedDrumPadForEdit;
                if (actualPadIndex === -1 || typeof actualPadIndex !== 'number') actualPadIndex = 0;
            }
            await commonLoadSampleLogic(blobToLoad, fileName, track, 'DrumSampler', actualPadIndex);
        } else { // Sampler or InstrumentSampler
            await commonLoadSampleLogic(blobToLoad, fileName, track, track.type);
        }
    } catch (error) {
        console.error(`[Audio] Error loading sound from browser:`, error);
        showNotification(`Error loading "${fileName}": ${error.message}`, 3000);
    } finally {
        // if (tempBlobUrlForDirectLoad) URL.revokeObjectURL(tempBlobUrlForDirectLoad); // Not needed if blob passed
    }
}

export async function fetchSoundLibrary(libraryName, zipUrl, isAutofetch = false) {
    if (typeof window === 'undefined') return;
    if (!window.loadedZipFiles) window.loadedZipFiles = {};
    if (!window.soundLibraryFileTrees) window.soundLibraryFileTrees = {};

    if (window.loadedZipFiles[libraryName] && window.loadedZipFiles[libraryName] !== "loading") {
        if (!isAutofetch && localAppServices.updateSoundBrowserDisplayForLibrary) {
            localAppServices.updateSoundBrowserDisplayForLibrary(libraryName);
        }
        return;
    }
    if (window.loadedZipFiles[libraryName] === "loading") return;

    if (!isAutofetch && localAppServices.updateSoundBrowserDisplayForLibrary) {
        // Signal UI that loading has started
        localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, true /* isLoading */);
    }

    try {
        window.loadedZipFiles[libraryName] = "loading";
        const response = await fetch(zipUrl);
        if (!response.ok) throw new Error(`HTTP error ${response.status} fetching ${zipUrl}`);
        const zipData = await response.arrayBuffer();

        if (typeof JSZip === 'undefined') throw new Error("JSZip library not found.");

        const jszip = new JSZip();
        const loadedZip = await jszip.loadAsync(zipData);
        window.loadedZipFiles[libraryName] = loadedZip;

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
        window.soundLibraryFileTrees[libraryName] = fileTree;

        if (localAppServices.updateSoundBrowserDisplayForLibrary) {
            localAppServices.updateSoundBrowserDisplayForLibrary(libraryName);
        }
    } catch (error) {
        console.error(`[Audio] Error fetching/processing ${libraryName} from ${zipUrl}:`, error);
        if (window.loadedZipFiles) delete window.loadedZipFiles[libraryName];
        if (window.soundLibraryFileTrees) delete window.soundLibraryFileTrees[libraryName];
        if (!isAutofetch) showNotification(`Error loading library ${libraryName}: ${error.message}`, 4000);
        if (localAppServices.updateSoundBrowserDisplayForLibrary) {
             localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, false, true /* hasError */);
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
    track.setSequenceLength(track.sequenceLength, true); // true to skip undo capture inside setSequenceLength

    if (localAppServices.updateTrackUI) {
        localAppServices.updateTrackUI(track.id, 'sampleSliced');
    }
    showNotification(`Sample auto-sliced into ${numSlicesToCreate} parts.`, 2000);
}
