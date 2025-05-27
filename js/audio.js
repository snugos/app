// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading
import * as Constants from './constants.js';
import { showNotification } from './utils.js';
import { createEffectInstance, getEffectDefaultParams } from './effectsRegistry.js';

let audioContextInitialized = false;
window.masterEffectsBusInput = null; // Input to the master chain
window.masterEffectsChain = []; // Array of {id, type, toneNode, params} for master
let masterGainNode = null; // Final gain before Tone.getDestination()

export async function initAudioContextAndMasterMeter(isUserInitiated = false) {
    if (audioContextInitialized && Tone.context.state === 'running') {
        if (!window.masterEffectsBusInput) setupMasterBus();
        return true;
    }
    try {
        await Tone.start();
        if (Tone.context.state === 'running') {
            setupMasterBus();
            if (!window.masterMeter && masterGainNode) {
                window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
                masterGainNode.connect(window.masterMeter);
            }
            audioContextInitialized = true;
            return true;
        } else {
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
    if (window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed) {
        return;
    }
    console.log("[Audio] Setting up Master Bus.");
    window.masterEffectsBusInput = new Tone.Gain();
    masterGainNode = new Tone.Gain();
    rebuildMasterEffectChain();
}

export function rebuildMasterEffectChain() {
    if (!window.masterEffectsBusInput || !masterGainNode) {
        console.warn("[Audio] Master bus input or master gain node not initialized. Cannot rebuild chain.");
        return;
    }
    console.log("[Audio] Rebuilding Master Effect Chain.");
    window.masterEffectsBusInput.disconnect();
    let currentSource = window.masterEffectsBusInput;
    (window.masterEffectsChain || []).forEach(effect => {
        if (effect.toneNode && !effect.toneNode.disposed) {
            currentSource.connect(effect.toneNode);
            currentSource = effect.toneNode;
        }
    });
    currentSource.connect(masterGainNode);
    masterGainNode.connect(Tone.getDestination());

    if (window.masterMeter && masterGainNode && !window.masterMeter.disposed) {
        masterGainNode.disconnect(window.masterMeter);
        masterGainNode.connect(window.masterMeter);
    } else if (!window.masterMeter && masterGainNode) {
        window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
        masterGainNode.connect(window.masterMeter);
    }
    console.log(`[Audio] Master chain rebuilt. ${(window.masterEffectsChain || []).length} effects.`);
}

export function addMasterEffect(effectType) {
    if (typeof window.captureStateForUndo === 'function') {
        window.captureStateForUndo(`Add ${effectType} to Master`);
    }
    const defaultParams = getEffectDefaultParams(effectType);
    const toneNode = createEffectInstance(effectType, defaultParams);
    if (toneNode) {
        const effectId = `mastereffect_${effectType}_${Date.now()}`;
        if(!window.masterEffectsChain) window.masterEffectsChain = [];
        window.masterEffectsChain.push({
            id: effectId, type: effectType, toneNode: toneNode, params: { ...defaultParams }
        });
        rebuildMasterEffectChain();
        return effectId;
    }
    return null;
}

export function removeMasterEffect(effectId) {
    if(!window.masterEffectsChain) window.masterEffectsChain = [];
    const effectIndex = window.masterEffectsChain.findIndex(e => e.id === effectId);
    if (effectIndex > -1) {
        const effectToRemove = window.masterEffectsChain[effectIndex];
        if (typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Remove ${effectToRemove.type} from Master`);
        }
        if (effectToRemove.toneNode && !effectToRemove.toneNode.disposed) {
            effectToRemove.toneNode.dispose();
        }
        window.masterEffectsChain.splice(effectIndex, 1);
        rebuildMasterEffectChain();
    }
}

export function updateMasterEffectParam(effectId, paramPath, value) {
    if(!window.masterEffectsChain) window.masterEffectsChain = [];
    const effect = window.masterEffectsChain.find(e => e.id === effectId);
    if (effect && effect.toneNode) {
        const keys = paramPath.split('.');
        let currentStoredParamLevel = effect.params;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!currentStoredParamLevel[keys[i]]) currentStoredParamLevel[keys[i]] = {};
            currentStoredParamLevel = currentStoredParamLevel[keys[i]];
        }
        currentStoredParamLevel[keys[keys.length - 1]] = value;

        try {
            let targetNodeProperty = effect.toneNode;
            for (let i = 0; i < keys.length - 1; i++) {
                targetNodeProperty = targetNodeProperty[keys[i]];
                if (!targetNodeProperty) throw new Error(`Nested property ${keys.slice(0,i+1).join('.')} not found on Tone node.`);
            }
            const finalKey = keys[keys.length - 1];

            if (targetNodeProperty && typeof targetNodeProperty[finalKey] !== 'undefined') {
                if (targetNodeProperty[finalKey] && typeof targetNodeProperty[finalKey].value !== 'undefined' && typeof targetNodeProperty[finalKey].rampTo === 'function') {
                    targetNodeProperty[finalKey].rampTo(value, 0.05);
                } else if (targetNodeProperty[finalKey] && typeof targetNodeProperty[finalKey].value !== 'undefined') {
                    targetNodeProperty[finalKey].value = value;
                } else {
                    targetNodeProperty[finalKey] = value;
                }
            } else if (typeof effect.toneNode.set === 'function') {
                const updateObj = {};
                let currentLevelForSet = updateObj;
                for(let i=0; i < keys.length -1; i++){
                    currentLevelForSet[keys[i]] = {};
                    currentLevelForSet = currentLevelForSet[keys[i]];
                }
                currentLevelForSet[keys[keys.length -1]] = value;
                effect.toneNode.set(updateObj);
            } else {
                 console.warn(`[Audio] Could not set param ${paramPath} on master effect ${effect.type} node directly or via .set().`);
            }
        } catch (err) { console.error(`[Audio] Error updating param ${paramPath} for master effect ${effect.type}:`, err); }
    }
}

export function reorderMasterEffect(effectId, newIndex) {
    if(!window.masterEffectsChain) window.masterEffectsChain = [];
    const oldIndex = window.masterEffectsChain.findIndex(e => e.id === effectId);
    if (oldIndex === -1 || oldIndex === newIndex || newIndex < 0 || newIndex > window.masterEffectsChain.length) {
        return;
    }
    if (typeof window.captureStateForUndo === 'function') {
        window.captureStateForUndo(`Reorder Master effect`);
    }
    const [effectToMove] = window.masterEffectsChain.splice(oldIndex, 1);
    window.masterEffectsChain.splice(newIndex, 0, effectToMove);
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
    const actualDestination = firstEffectNodeInTrack || (window.masterEffectsBusInput || Tone.getDestination());

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
        Tone.Transport.scheduleOnce(() => { if(!tempPlayer.disposed) tempPlayer.dispose(); if(!tempEnv.disposed) tempEnv.dispose(); if(!tempGain.disposed) tempGain.dispose(); }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);
    }
}

export async function playDrumSamplerPadPreview(trackId, padIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0) {
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio not ready for preview.", 2000); return; }
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : (window.tracks || []);
    const track = tracksArray.find(t => t.id === trackId);

    if (!track || track.type !== 'DrumSampler' || !track.drumPadPlayers[padIndex] || !track.drumPadPlayers[padIndex].loaded) return;
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
            track.disposeSlicerMonoNodes(); // Important to clean up old mono player if any
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
            track.setupToneSampler(); // This will create the Tone.Sampler
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
        // Common UI updates
        if (trackTypeHint === 'Sampler' && typeof window.drawWaveform === 'function') window.drawWaveform(track);
        if (trackTypeHint === 'InstrumentSampler' && typeof window.drawInstrumentWaveform === 'function') window.drawInstrumentWaveform(track);

        track.rebuildEffectChain(); // Ensure the new/updated audio source is connected
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
        track.rebuildEffectChain(); // Reconnect chain as player instance has changed
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
        if (typeof JSZip === 'undefined') { // Ensure JSZip is loaded
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
    track.setSequenceLength(track.sequenceLength, true); // This will also re-evaluate rows
    if (typeof window.renderSamplePads === 'function') window.renderSamplePads(track);
    if (typeof window.updateSliceEditorUI === 'function') window.updateSliceEditorUI(track);
    if (typeof window.drawWaveform === 'function') window.drawWaveform(track);
    showNotification(`Sample auto-sliced into ${numSlicesToCreate} parts.`, 2000);
}
