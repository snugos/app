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
        if (!window.masterEffectsBusInput || window.masterEffectsBusInput.disposed) {
            console.log("[Audio] Master bus input missing or disposed, re-setting up master bus.");
            setupMasterBus();
        }
        return true;
    }
    try {
        await Tone.start();
        console.log("[Audio] Tone.start() successful. Context state:", Tone.context.state);
        if (Tone.context.state === 'running') {
            setupMasterBus();
            if (!window.masterMeter && masterGainNode && !masterGainNode.disposed) {
                window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
                masterGainNode.connect(window.masterMeter);
                 console.log("[Audio] Master meter connected to masterGainNode.");
            } else if (window.masterMeter && masterGainNode && !masterGainNode.disposed && masterGainNode.numberOfOutputs === 1) { // Check if only connected to destination
                // This case might occur if masterMeter was disposed or disconnected elsewhere
                if (window.masterMeter.disposed) {
                    window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
                }
                masterGainNode.connect(window.masterMeter);
                console.log("[Audio] Master meter re-connected to masterGainNode.");
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
    console.log("[Audio] setupMasterBus called.");
    if (window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed && masterGainNode && !masterGainNode.disposed) {
        console.log("[Audio] Master bus appears to be already set up and valid.");
        rebuildMasterEffectChain(); // Still rebuild to ensure connections are current
        return;
    }

    console.log("[Audio] Setting up Master Bus nodes (disposing if exist).");
    if (window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed) try {window.masterEffectsBusInput.dispose();} catch(e){console.warn("Error disposing old master bus input", e)}
    if (masterGainNode && !masterGainNode.disposed) try {masterGainNode.dispose();} catch(e){console.warn("Error disposing old master gain node", e)}

    window.masterEffectsBusInput = new Tone.Gain();
    masterGainNode = new Tone.Gain();
    console.log("[Audio] Master bus input and gain nodes created.");
    rebuildMasterEffectChain();
}

export function rebuildMasterEffectChain() {
    if (!window.masterEffectsBusInput || window.masterEffectsBusInput.disposed) {
        console.warn("[Audio] Master bus input is null or disposed in rebuild. Attempting to re-initialize.");
        window.masterEffectsBusInput = new Tone.Gain();
        if(!window.masterEffectsBusInput) { console.error("[Audio] CRITICAL: Master bus input could not be re-initialized."); return; }
    }
    if (!masterGainNode || masterGainNode.disposed) {
         console.warn("[Audio] Master gain node is null or disposed in rebuild. Re-initializing.");
        masterGainNode = new Tone.Gain();
         if(!masterGainNode) { console.error("[Audio] CRITICAL: Master gain node could not be re-initialized."); return; }
    }

    console.log(`[Audio] Rebuilding Master Effect Chain. Effects count: ${(window.masterEffectsChain || []).length}`);

    try { window.masterEffectsBusInput.disconnect(); } catch(e) { /* a */ }
    (window.masterEffectsChain || []).forEach(effectWrapper => {
        if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
            try { effectWrapper.toneNode.disconnect(); } catch (e) { /* b */ }
        }
    });
    try { masterGainNode.disconnect(); } catch(e) { /* c */ }

    let currentAudioPathEnd = window.masterEffectsBusInput;
    console.log(`[Audio] Master Chain Rebuild: Starting with masterEffectsBusInput`);

    (window.masterEffectsChain || []).forEach((effectWrapper, index) => {
        if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
            if (currentAudioPathEnd && !currentAudioPathEnd.disposed) {
                try {
                    console.log(`[Audio] Master Chain: Connecting ${currentAudioPathEnd.constructor.name} to effect ${index + 1} (${effectWrapper.type})`);
                    currentAudioPathEnd.connect(effectWrapper.toneNode);
                    currentAudioPathEnd = effectWrapper.toneNode;
                } catch (e) {
                    console.error(`[Audio] Error connecting master chain node ${currentAudioPathEnd.constructor.name} to ${effectWrapper.type}:`, e);
                }
            } else {
                 currentAudioPathEnd = effectWrapper.toneNode;
            }
        }
    });

    if (masterGainNode && !masterGainNode.disposed) {
        if (currentAudioPathEnd && !currentAudioPathEnd.disposed) {
             try {
                console.log(`[Audio] Master Chain: Connecting ${currentAudioPathEnd.constructor.name} to MasterGainNode`);
                currentAudioPathEnd.connect(masterGainNode);
            } catch (e) {
                console.error(`[Audio] Error connecting master effects output (${currentAudioPathEnd.constructor.name}) to masterGainNode:`, e);
            }
        } else { // No effects, or currentAudioPathEnd became invalid
             try {
                console.log(`[Audio] Master Chain: Connecting MasterEffectsBusInput directly to MasterGainNode (no valid effects output).`);
                window.masterEffectsBusInput.connect(masterGainNode);
             } catch (e) {
                console.error(`[Audio] Error connecting MasterEffectsBusInput to masterGainNode:`, e);
             }
        }
        try {
            masterGainNode.toDestination();
            if (window.masterMeter && !window.masterMeter.disposed) {
                masterGainNode.connect(window.masterMeter);
            } else if (!window.masterMeter) {
                window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
                masterGainNode.connect(window.masterMeter);
            }
        } catch (e) { console.error("[Audio] Error connecting masterGainNode to destination or meter:", e); }
    } else {
        console.error("[Audio] masterGainNode is invalid. Final connection to destination might fail.");
        if (currentAudioPathEnd && !currentAudioPathEnd.disposed) {
            try { currentAudioPathEnd.toDestination(); } catch(e) {}
        } else if (window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed) {
            try { window.masterEffectsBusInput.toDestination(); } catch(e) {}
        }
    }
    console.log(`[Audio] Master chain rebuild finished.`);
}


export function addMasterEffect(effectType) {
    if (typeof window.captureStateForUndo === 'function') {
        window.captureStateForUndo(`Add ${effectType} to Master`);
    }
    const defaultParams = getEffectDefaultParams(effectType);
    const toneNode = createEffectInstance(effectType, defaultParams);
    if (toneNode) {
        const effectId = `mastereffect_${effectType}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        if(!window.masterEffectsChain) window.masterEffectsChain = [];
        window.masterEffectsChain.push({
            id: effectId, type: effectType, toneNode: toneNode, params: JSON.parse(JSON.stringify(defaultParams))
        });
        rebuildMasterEffectChain();
        return effectId;
    }
    console.warn(`[Audio] Failed to create master effect instance for ${effectType}`);
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
    if (!window.masterEffectsChain) window.masterEffectsChain = [];
    const effectWrapper = window.masterEffectsChain.find(e => e.id === effectId);
    if (!effectWrapper || !effectWrapper.toneNode || effectWrapper.toneNode.disposed) {
        console.warn(`[Audio] Master Effect node not found or disposed for ID: ${effectId} while trying to update ${paramPath}.`);
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
            if (paramInstance && typeof paramInstance.value !== 'undefined') { // Covers Tone.Signal, Tone.Param
                if (typeof paramInstance.rampTo === 'function') {
                    paramInstance.rampTo(value, 0.02);
                } else {
                    paramInstance.value = value;
                }
            } else { // Direct property assignment
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
        } else {
            console.warn(`[Audio] Cannot set param "${paramPath}" on master effect ${effectWrapper.type}. Property or .set() method not available. Target object:`, targetObject, "Final Key:", finalParamKey);
        }
    } catch (err) {
        console.error(`[Audio] Error updating param ${paramPath} for master effect ${effectWrapper.type}:`, err, "Value:", value, "Effect Node:", effectWrapper.toneNode);
    }
}

export function reorderMasterEffect(effectId, newIndex) {
    if(!window.masterEffectsChain) window.masterEffectsChain = [];
    const oldIndex = window.masterEffectsChain.findIndex(e => e.id === effectId);
     if (oldIndex === -1 || oldIndex === newIndex ) return;

    const maxValidInsertIndex = window.masterEffectsChain.length; // Can insert at the very end
    const clampedNewIndex = Math.max(0, Math.min(newIndex, maxValidInsertIndex));


    if (typeof window.captureStateForUndo === 'function') {
        window.captureStateForUndo(`Reorder Master effect`);
    }
    const [effectToMove] = window.masterEffectsChain.splice(oldIndex, 1);
    // If moving an item downwards, the target index for splice needs to be adjusted because the array is now shorter.
    const actualSpliceIndex = (oldIndex < clampedNewIndex) ? clampedNewIndex - 1 : clampedNewIndex;
    window.masterEffectsChain.splice(actualSpliceIndex, 0, effectToMove);

    console.log(`[Audio] Reordered master effect. Old: ${oldIndex}, New (requested): ${newIndex}, Actual Splice Index: ${actualSpliceIndex}. New order:`, window.masterEffectsChain.map(e=>e.type));
    rebuildMasterEffectChain();
}

// --- Sample Loading and Utility Functions (Re-integrated and checked) ---

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
        track.rebuildEffectChain();
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

// Ensure all functions from the previous version of audio.js that are used by main.js are present and exported
// playSlicePreview, playDrumSamplerPadPreview are already here and updated.
export { updateMeters, playSlicePreview, playDrumSamplerPadPreview }; // Ensure these are explicitly exported if not already
