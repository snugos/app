// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading
import * as Constants from './constants.js';
import { showNotification } from './utils.js';
import { createEffectInstance, getEffectDefaultParams } from './effectsRegistry.js';
import { storeAudio, getAudio, deleteAudio } from './db.js'; // For IndexedDB

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

export function addMasterEffect(effectType) { /* ... (no changes from previous version) ... */ }
export function removeMasterEffect(effectId) { /* ... (no changes from previous version) ... */ }
export function updateMasterEffectParam(effectId, paramPath, value) { /* ... (no changes from previous version) ... */ }
export function reorderMasterEffect(effectId, newIndex) { /* ... (no changes from previous version) ... */ }
export function updateMeters(masterMeterVisualElement, masterMeterBarVisualElement, mixerMasterMeterVisualElement, tracks) { /* ... (no changes from previous version) ... */ }
export async function playSlicePreview(trackId, sliceIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0) { /* ... (no changes from previous version) ... */ }
export async function playDrumSamplerPadPreview(trackId, padIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0) { /* ... (no changes from previous version) ... */ }
export function getMimeTypeFromFilename(filename) { /* ... (no changes from previous version) ... */ }

function generateAudioDbKey(trackId, originalFileName, typeHint, padIndex = null) {
    const timestamp = Date.now();
    const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    let key = `track-${trackId}-${typeHint}-${sanitizedFileName}-${timestamp}`;
    if (padIndex !== null) {
        key = `track-${trackId}-${typeHint}-pad-${padIndex}-${sanitizedFileName}-${timestamp}`;
    }
    return key.slice(0, 250);
}

export async function loadSampleFile(eventOrUrlOrFile, trackId, trackTypeHint, fileNameForUrl = null) {
    console.log(`[Audio - loadSampleFile] Called. TrackID: ${trackId}, TypeHint: ${trackTypeHint}, FileNameForURL: ${fileNameForUrl}`);
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : (window.tracks || []);
    const track = tracksArray.find(t => t.id === trackId);

    if (!track) { showNotification(`Track ID ${trackId} not found.`, 3000); return; }
    if (trackTypeHint !== 'Sampler' && trackTypeHint !== 'InstrumentSampler') {
        showNotification(`Cannot load sample into ${trackTypeHint} track.`, 3000); return;
    }
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio system not ready.", 3000); return; }

    let fileObjectToStore;
    let sourceName;
    let providedBlob = null;

    const isUrlSource = typeof eventOrUrlOrFile === 'string';
    const isDirectFile = eventOrUrlOrFile instanceof File;
    const isBlobSource = eventOrUrlOrFile instanceof Blob;

    if (isUrlSource) {
        sourceName = fileNameForUrl || eventOrUrlOrFile.split('/').pop().split('?')[0] || "loaded_sample_from_url";
        try {
            const response = await fetch(eventOrUrlOrFile);
            if (!response.ok) throw new Error(`Fetch failed for ${eventOrUrlOrFile}: ${response.statusText} (${response.status})`);
            providedBlob = await response.blob();
        } catch (e) {
            console.error(`[Audio - loadSampleFile] Error fetching sample from URL ${eventOrUrlOrFile}:`, e);
            showNotification(`Error fetching sample: ${e.message}`, 3000); return;
        }
    } else if (eventOrUrlOrFile && eventOrUrlOrFile.target && eventOrUrlOrFile.target.files && eventOrUrlOrFile.target.files.length > 0) {
        providedBlob = eventOrUrlOrFile.target.files[0];
        sourceName = providedBlob.name;
    } else if (isDirectFile) {
        providedBlob = eventOrUrlOrFile;
        sourceName = providedBlob.name;
    } else if (isBlobSource) {
        providedBlob = eventOrUrlOrFile;
        sourceName = fileNameForUrl || "loaded_blob_sample";
        if (!(providedBlob instanceof File)) { // Ensure it's a File object for consistent naming and type handling
             fileObjectToStore = new File([providedBlob], sourceName, { type: providedBlob.type || getMimeTypeFromFilename(sourceName) });
        } else {
            fileObjectToStore = providedBlob;
        }
    } else { showNotification("No file selected or invalid source provided.", 3000); return; }
    
    if(!fileObjectToStore && providedBlob) { // If fileObjectToStore wasn't set (e.g. from URL/Input)
        fileObjectToStore = new File([providedBlob], sourceName, { type: providedBlob.type || getMimeTypeFromFilename(sourceName) });
    }

    if (!fileObjectToStore) { showNotification("Could not obtain file data.", 3000); return; }
    if (!fileObjectToStore.type || (!fileObjectToStore.type.startsWith('audio/') && fileObjectToStore.type !== "application/octet-stream" && !getMimeTypeFromFilename(sourceName).startsWith('audio/'))) {
        showNotification(`Invalid audio file type: "${fileObjectToStore.type || getMimeTypeFromFilename(sourceName) || 'unknown'}".`, 3000); return;
    }
    if (fileObjectToStore.size === 0) { showNotification(`Audio file "${sourceName}" is empty.`, 3000); return; }

    if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Load ${sourceName} to ${track.name}`);
    let objectURLForTone = null;

    try {
        objectURLForTone = URL.createObjectURL(fileObjectToStore);
        const newAudioBuffer = await new Tone.Buffer().load(objectURLForTone);
        const audioDbKey = generateAudioDbKey(track.id, sourceName, trackTypeHint);
        await storeAudio(audioDbKey, fileObjectToStore);

        if (trackTypeHint === 'Sampler') {
            if (track.audioBuffer && !track.audioBuffer.disposed) track.audioBuffer.dispose();
            if (track.samplerAudioData?.audioDbKey && track.samplerAudioData.audioDbKey !== audioDbKey) {
                await deleteAudio(track.samplerAudioData.audioDbKey).catch(e => console.warn("Error deleting old sampler audio from DB", e));
            }
            track.disposeSlicerMonoNodes();
            track.audioBuffer = newAudioBuffer;
            track.samplerAudioData = { fileName: sourceName, audioDbKey: audioDbKey, status: 'loaded' }; // SET STATUS
            track.originalFileName = sourceName;
            if (!track.slicerIsPolyphonic && track.audioBuffer?.loaded) track.setupSlicerMonoNodes();
            if (typeof window.autoSliceSample === 'function') window.autoSliceSample(track.id, Constants.numSlices);
            // UI update is now expected to be handled by the calling context or a general UI refresh
        } else if (trackTypeHint === 'InstrumentSampler') {
            if (track.instrumentSamplerSettings.audioBuffer && !track.instrumentSamplerSettings.audioBuffer.disposed) track.instrumentSamplerSettings.audioBuffer.dispose();
            if (track.instrumentSamplerSettings.audioDbKey && track.instrumentSamplerSettings.audioDbKey !== audioDbKey) {
                await deleteAudio(track.instrumentSamplerSettings.audioDbKey).catch(e => console.warn("Error deleting old inst sampler audio from DB", e));
            }
            if (track.toneSampler && !track.toneSampler.disposed) track.toneSampler.dispose();
            track.instrumentSamplerSettings.audioBuffer = newAudioBuffer;
            track.instrumentSamplerSettings.audioDbKey = audioDbKey;
            track.instrumentSamplerSettings.originalFileName = sourceName;
            track.instrumentSamplerSettings.status = 'loaded'; // SET STATUS
            track.instrumentSamplerSettings.loopStart = 0;
            track.instrumentSamplerSettings.loopEnd = newAudioBuffer.duration;
            track.setupToneSampler();
        }

        if (trackTypeHint === 'Sampler' && typeof window.drawWaveform === 'function') window.drawWaveform(track);
        if (trackTypeHint === 'InstrumentSampler' && typeof window.drawInstrumentWaveform === 'function') window.drawInstrumentWaveform(track);

        track.rebuildEffectChain();
        track.setSequenceLength(track.sequenceLength, true); // Re-init sequence
        showNotification(`Sample "${sourceName}" loaded for ${track.name}.`, 2000);
         if (track.inspectorWindow && typeof window.openTrackInspectorWindow === 'function') { // Refresh inspector
            window.openTrackInspectorWindow(track.id, track.inspectorWindow.options); // Pass existing options to maintain state
        }


    } catch (error) {
        console.error(`[Audio - loadSampleFile] Error for "${sourceName}":`, error);
        showNotification(`Error loading sample "${sourceName}": ${error.message || 'Unknown error'}`, 4000);
        if (trackTypeHint === 'Sampler' && track.samplerAudioData) track.samplerAudioData.status = 'missing';
        if (trackTypeHint === 'InstrumentSampler' && track.instrumentSamplerSettings) track.instrumentSamplerSettings.status = 'missing';
        if (typeof window.drawWaveform === 'function' && track.type === 'Sampler') window.drawWaveform(track);
        if (typeof window.drawInstrumentWaveform === 'function' && track.type === 'InstrumentSampler') window.drawInstrumentWaveform(track);
    } finally { if (objectURLForTone) URL.revokeObjectURL(objectURLForTone); }
}

export async function loadDrumSamplerPadFile(eventOrUrlOrFile, trackId, padIndex, fileNameForUrl = null) {
    console.log(`[Audio - loadDrumSamplerPadFile] Called. TrackID: ${trackId}, Pad: ${padIndex}, FileName: ${fileNameForUrl}`);
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : (window.tracks || []);
    const track = tracksArray.find(t => t.id === trackId);

    if (!track || track.type !== 'DrumSampler') {
        console.error(`[Audio - loadDrumSamplerPadFile] Track not found or not a DrumSampler. Track ID: ${trackId}`);
        return;
    }
    const numPads = track.drumSamplerPads.length || Constants.numDrumSamplerPads;
    if (typeof padIndex !== 'number' || isNaN(padIndex) || padIndex < 0 || padIndex >= numPads) {
        console.error(`[Audio - loadDrumSamplerPadFile] Invalid padIndex: ${padIndex}`);
        return;
    }

    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        showNotification("Audio system not ready.", 3000);
        return;
    }

    let fileObjectToStore;
    let sourceName;
    let providedBlob = null;

    const isUrlSource = typeof eventOrUrlOrFile === 'string';
    const isDirectFile = eventOrUrlOrFile instanceof File;
    const isBlobSource = eventOrUrlOrFile instanceof Blob;

    if (isUrlSource) {
        sourceName = fileNameForUrl || eventOrUrlOrFile.split('/').pop().split('?')[0] || `pad_sample_${padIndex}`;
        try {
            const response = await fetch(eventOrUrlOrFile);
            if (!response.ok) throw new Error(`Fetch failed for ${eventOrUrlOrFile}: ${response.statusText} (${response.status})`);
            providedBlob = await response.blob();
        } catch (e) {
            console.error(`[Audio - loadDrumSamplerPadFile] Error fetching:`, e);
            showNotification(`Error fetching drum sample: ${e.message}`, 3000); return;
        }
    } else if (eventOrUrlOrFile && eventOrUrlOrFile.target && eventOrUrlOrFile.target.files && eventOrUrlOrFile.target.files.length > 0) {
        providedBlob = eventOrUrlOrFile.target.files[0];
        sourceName = providedBlob.name;
    } else if (isDirectFile) {
        providedBlob = eventOrUrlOrFile;
        sourceName = providedBlob.name;
    } else if (isBlobSource) {
        providedBlob = eventOrUrlOrFile;
        sourceName = fileNameForUrl || `pad_blob_sample_${padIndex}`;
         if (!(providedBlob instanceof File)) {
            fileObjectToStore = new File([providedBlob], sourceName, { type: providedBlob.type || getMimeTypeFromFilename(sourceName) });
        } else {
            fileObjectToStore = providedBlob;
        }
    } else { showNotification("No file for drum pad.", 3000); return; }

    if(!fileObjectToStore && providedBlob) {
        fileObjectToStore = new File([providedBlob], sourceName, { type: providedBlob.type || getMimeTypeFromFilename(sourceName) });
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
        await storeAudio(audioDbKey, fileObjectToStore);
        console.log(`[Audio - loadDrumSamplerPadFile] Stored "${sourceName}" for pad ${padIndex} in IndexedDB with key: ${audioDbKey}`);

        if (padData.audioDbKey && padData.audioDbKey !== audioDbKey) {
            await deleteAudio(padData.audioDbKey).catch(e => console.warn(`Error deleting old drum pad audio (key: ${padData.audioDbKey}) from DB`, e));
        }

        if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
        if (track.drumPadPlayers[padIndex] && !track.drumPadPlayers[padIndex].disposed) track.drumPadPlayers[padIndex].dispose();

        padData.audioBuffer = newBuffer;
        padData.audioDbKey = audioDbKey;
        padData.originalFileName = sourceName;
        padData.status = 'loaded'; // SET PAD STATUS TO LOADED

        track.drumPadPlayers[padIndex] = new Tone.Player(newBuffer);
        track.rebuildEffectChain();
        track.setSequenceLength(track.sequenceLength, true); // Re-init sequence

        showNotification(`Sample "${sourceName}" loaded for Pad ${padIndex + 1}.`, 2000);
        if (typeof window.updateDrumPadControlsUI === 'function') window.updateDrumPadControlsUI(track);
        if (typeof window.renderDrumSamplerPads === 'function') window.renderDrumSamplerPads(track);

    } catch (error) {
        console.error(`[Audio - loadDrumSamplerPadFile] Error loading drum sample "${sourceName}":`, error);
        showNotification(`Error loading drum sample "${sourceName}": ${error.message || 'Unknown error, check console.'}`, 4000);
        if(track.drumSamplerPads[padIndex]) {
            track.drumSamplerPads[padIndex].status = 'missing';
             if (typeof window.updateDrumPadControlsUI === 'function') window.updateDrumPadControlsUI(track);
             if (typeof window.renderDrumSamplerPads === 'function') window.renderDrumSamplerPads(track);
        }
    } finally { if (objectURLForTone) URL.revokeObjectURL(objectURLForTone); }
}

export async function loadSoundFromBrowserToTarget(soundData, targetTrackId, targetTrackType, targetPadOrSliceIndex = null) { /* ... (no changes from previous version) ... */ }
export async function fetchSoundLibrary(libraryName, zipUrl, isAutofetch = false) { /* ... (no changes from previous version) ... */ }
export function autoSliceSample(trackId, numSlicesToCreate = Constants.numSlices) { /* ... (no changes from previous version) ... */ }
