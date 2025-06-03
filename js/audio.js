// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading (MODIFIED - Ensured appServices reference)
import * as Constants from './constants.js';
import { createEffectInstance } from './effectsRegistry.js';
import { storeAudio as dbStoreAudio, getAudio as dbGetAudio } from './db.js';

let masterEffectsBusInputNode = null;
let masterGainNodeActual = null; 
let masterMeterNode = null;
let activeMasterEffectNodes = new Map(); 

let audioContextInitialized = false;
// This will be the single appServices instance from main.js
let localAppServices = {}; 

let mic = null;
let audioRecorder = null; 

export function initializeAudioModule(appServicesFromMain) {
    localAppServices = appServicesFromMain; // Use the direct reference
    // console.log("[Audio Init] Module initialized.");
}

export function getMasterEffectsBusInputNode() { return masterEffectsBusInputNode; }
export function getActualMasterGainNode() { return masterGainNodeActual; }
export function getMasterMeter() { return masterMeterNode; }

export async function initAudioContextAndMasterMeter(forceStart = false) {
    if (audioContextInitialized && !forceStart) return;
    if (typeof Tone === 'undefined') {
        console.error("[Audio Init] CRITICAL: Tone.js is not loaded.");
        if (localAppServices.showNotification) localAppServices.showNotification("Audio engine (Tone.js) failed to load!", "error", 0);
        return;
    }

    try {
        if (Tone.context.state !== 'running' || forceStart) {
            await Tone.start();
            console.log("[Audio Init] AudioContext started successfully.");
        }

        if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed) {
            masterEffectsBusInputNode = new Tone.Channel({ volume: 0, channelCount: 2 }); 
        }
        let gainValue = 0.707; // Default if service not ready
        if (localAppServices.getMasterGainValueState && typeof localAppServices.getMasterGainValueState === 'function'){
            gainValue = localAppServices.getMasterGainValueState();
        } else if (localAppServices.masterGainValue !== undefined) { // Fallback if main.js appServices structure not fully updated yet
            gainValue = localAppServices.masterGainValue;
        }

        if (!masterGainNodeActual || masterGainNodeActual.disposed) {
            masterGainNodeActual = new Tone.Gain(gainValue);
        } else {
            masterGainNodeActual.gain.value = gainValue; // Update if already exists
        }

        if (!masterMeterNode || masterMeterNode.disposed) {
            masterMeterNode = new Tone.Meter({ channels: 2, smoothing: 0.8 });
        }

        // Chain: masterEffectsBusInputNode -> (effects) -> masterGainNodeActual -> masterMeterNode -> Tone.Destination
        // The _rechainMasterEffectsAudio function will handle effects.
        // For initial setup, connect bus input to gain, then to meter, then to destination.
        if(activeMasterEffectNodes.size === 0) { // If no effects yet, connect bus directly to gain
            masterEffectsBusInputNode.chain(masterGainNodeActual, masterMeterNode, Tone.Destination);
        } else { // If effects might exist (e.g. project load), rechain will handle it
            _rechainMasterEffectsAudio();
        }


        Tone.Transport.bpm.value = (typeof Tone !== 'undefined' && Tone.Transport) ? (localAppServices.globalSettings?.tempo || Constants.MIN_TEMPO) : Constants.MIN_TEMPO;
        if (localAppServices.updateTaskbarTempoDisplay) localAppServices.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);

        audioContextInitialized = true;
        if (localAppServices.showNotification && forceStart) localAppServices.showNotification("Audio Context Initialized.", "success", 1500);

    } catch (error) {
        console.error("[Audio Init] Error starting AudioContext:", error);
        if (localAppServices.showNotification) localAppServices.showNotification("Error initializing audio system. Please refresh.", "error", 0);
        audioContextInitialized = false;
    }
}

export function setMasterVolume(linearGain) {
    if (masterGainNodeActual && !masterGainNodeActual.disposed) {
        masterGainNodeActual.gain.value = linearGain;
    }
    // State update is handled by main.js calling State.setMasterGainValueState
}

export async function addMasterEffectToAudio(effectId, effectType, params) {
    if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed) {
        console.warn("[Audio addMasterEffect] Master effects bus input node not ready.");
        await initAudioContextAndMasterMeter(true);
        if (!masterEffectsBusInputNode) return;
    }

    const effectNode = createEffectInstance(effectType, params);
    if (effectNode) {
        activeMasterEffectNodes.set(effectId, effectNode);
        _rechainMasterEffectsAudio();
    }
}
export async function removeMasterEffectFromAudio(effectId) {
    const effectNode = activeMasterEffectNodes.get(effectId);
    if (effectNode && !effectNode.disposed) {
        try { effectNode.dispose(); } catch (e) { console.warn(`Error disposing master effect node ${effectId}: ${e.message}`);}
    }
    activeMasterEffectNodes.delete(effectId);
    _rechainMasterEffectsAudio();
}
export function updateMasterEffectParamInAudio(effectId, paramPath, value) {
    const effectNode = activeMasterEffectNodes.get(effectId);
    if (effectNode && typeof effectNode.set === 'function') {
        try {
            effectNode.set({ [paramPath]: value });
        } catch (e) { console.error(`Error setting param ${paramPath} on master effect ${effectId}:`, e); }
    }
}
export async function reorderMasterEffectInAudio() { 
    _rechainMasterEffectsAudio();
}
export async function clearAllMasterEffectNodes() {
    activeMasterEffectNodes.forEach(node => { if (node && !node.disposed) node.dispose(); });
    activeMasterEffectNodes.clear();
    _rechainMasterEffectsAudio();
}
export function _rechainMasterEffectsAudio() { // Made exportable for state.js if needed for bypass
    if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed || !masterGainNodeActual || masterGainNodeActual.disposed || !masterMeterNode || !Tone.Destination) {
        console.warn("[Audio _rechainMasterEffectsAudio] Core audio nodes not ready. Cannot re-chain master effects.");
        return;
    }

    masterEffectsBusInputNode.disconnect();
    let currentNode = masterEffectsBusInputNode;
    const masterEffectsState = localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : [];

    masterEffectsState.forEach(effectState => {
        const effectNode = activeMasterEffectNodes.get(effectState.id);
        if (effectNode && !effectNode.disposed) {
            if (!effectState.isBypassed) { // Check bypass state from masterEffectsChainState
                try {
                    currentNode.connect(effectNode);
                    currentNode = effectNode;
                } catch (e) { console.error(`Error connecting master effect ${effectState.type} (${effectState.id}):`, e); }
            }
        }
    });
    currentNode.chain(masterGainNodeActual, masterMeterNode, Tone.Destination);
}

export async function togglePlayback() {
    if (typeof Tone === 'undefined') return;
    if (!audioContextInitialized) await initAudioContextAndMasterMeter(true);
    if (!audioContextInitialized) return; 

    if (Tone.Transport.state === 'started') {
        Tone.Transport.pause();
         if (localAppServices.showNotification) localAppServices.showNotification("Playback Paused", "info", 1000);
        if(localAppServices.uiElementsCache?.playBtn) localAppServices.uiElementsCache.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        if(localAppServices.uiElementsCache?.playBtnGlobal) localAppServices.uiElementsCache.playBtnGlobal.innerHTML = '<i class="fas fa-play"></i>';
    } else {
        await Tone.start(); // Ensure context is running before transport start
        Tone.Transport.start();
        if (localAppServices.showNotification) localAppServices.showNotification("Playback Started", "info", 1000);
        if(localAppServices.uiElementsCache?.playBtn) localAppServices.uiElementsCache.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        if(localAppServices.uiElementsCache?.playBtnGlobal) localAppServices.uiElementsCache.playBtnGlobal.innerHTML = '<i class="fas fa-pause"></i>';
    }
}
export async function stopPlayback() {
    if (typeof Tone === 'undefined') return;
    if (!audioContextInitialized) return;
    Tone.Transport.stop();
    Tone.Transport.position = 0; 
    if (localAppServices.showNotification) localAppServices.showNotification("Playback Stopped", "info", 1000);
    if(localAppServices.uiElementsCache?.playBtn) localAppServices.uiElementsCache.playBtn.innerHTML = '<i class="fas fa-play"></i>';
    if(localAppServices.uiElementsCache?.playBtnGlobal) localAppServices.uiElementsCache.playBtnGlobal.innerHTML = '<i class="fas fa-play"></i>';

    const tracks = localAppServices.getTracksState ? localAppServices.getTracksState() : [];
    tracks.forEach(track => {
        if (track.patternPlayerSequence && typeof track.patternPlayerSequence.stop === 'function' && track.patternPlayerSequence.state === "started") {
            track.patternPlayerSequence.stop(0); 
        }
        if (track.type === "Audio" && track.activeAudioPlayers) {
            track.activeAudioPlayers.forEach(player => { if(player && !player.disposed) player.stop()});
            track.activeAudioPlayers = [];
        }
    });
    if(localAppServices.updatePlayheadPosition) localAppServices.updatePlayheadPosition(); 
}

export async function toggleRecording() {
    if (typeof Tone === 'undefined') return;
    if (!audioContextInitialized) await initAudioContextAndMasterMeter(true);
    if (!audioContextInitialized) return;

    const isCurrentlyRecording = localAppServices.isGlobalRecordingActiveState ? localAppServices.isGlobalRecordingActiveState() : false;
    const armedTrackId = localAppServices.getArmedTrackIdState ? localAppServices.getArmedTrackIdState() : null;

    if (isCurrentlyRecording) { 
        await stopAudioRecording(); // Handles both MIDI and Audio recording stop logic via state
    } else { 
        if (!armedTrackId) {
            if (localAppServices.showNotification) localAppServices.showNotification("No track armed for recording.", "warning");
            return;
        }
        const track = localAppServices.getTrackById ? localAppServices.getTrackById(armedTrackId) : null;
        if (!track) {
             if (localAppServices.showNotification) localAppServices.showNotification("Armed track not found.", "error");
            return;
        }
        if (track.type === 'Audio') {
            await startAudioRecording(armedTrackId);
        } else {
            if (localAppServices.setIsRecordingState) localAppServices.setIsRecordingState(true); 
            if (localAppServices.showNotification) localAppServices.showNotification(`Recording armed for ${track.name}. Play MIDI or use sequencer.`, "info");
        }
    }
}

export async function startAudioRecording(trackId) {
    if (typeof Tone === 'undefined') return;
    if (!trackId) {
        if(localAppServices.showNotification) localAppServices.showNotification("Cannot start audio recording: No track ID provided.", "error");
        return;
    }
    try {
        if (!mic || mic.state === "closed") {
            mic = new Tone.UserMedia();
            await mic.open();
        }
        if (mic.state !== "started") { // Double check after potential open
            await mic.open(); 
        }

        if (!audioRecorder || audioRecorder.disposed) {
            audioRecorder = new Tone.Recorder();
        }
        mic.connect(audioRecorder);
        await audioRecorder.start();

        if (localAppServices.setRecordingTrackIdState) localAppServices.setRecordingTrackIdState(trackId);
        if (localAppServices.setRecordingStartTimeState) localAppServices.setRecordingStartTimeState(Tone.Transport.seconds);
        if (localAppServices.setIsRecordingState) localAppServices.setIsRecordingState(true); 
        if (localAppServices.showNotification) localAppServices.showNotification(`Recording audio started on track ${trackId}...`, "info");

    } catch (error) {
        console.error("[Audio startAudioRecording] Error starting audio recording:", error);
        if (localAppServices.showNotification) localAppServices.showNotification(`Error starting audio recording: ${error.message}`, "error");
        if (mic) mic.close();
        if (audioRecorder && !audioRecorder.disposed) audioRecorder.dispose();
        if (localAppServices.setIsRecordingState) localAppServices.setIsRecordingState(false);
        if (localAppServices.setRecordingTrackIdState) localAppServices.setRecordingTrackIdState(null);
    }
}

export async function stopAudioRecording() {
    if (typeof Tone === 'undefined') return;
    const wasGloballyRecording = localAppServices.isGlobalRecordingActiveState ? localAppServices.isGlobalRecordingActiveState() : false;
    if (localAppServices.setIsRecordingState) localAppServices.setIsRecordingState(false); 
    
    const recordingTrackId = localAppServices.getRecordingTrackIdState ? localAppServices.getRecordingTrackIdState() : null;
    const startTime = localAppServices.getRecordingStartTimeState ? localAppServices.getRecordingStartTimeState() : 0;

    if (audioRecorder && audioRecorder.state === "started") {
        const blob = await audioRecorder.stop();
        if (mic && mic.state === "started") mic.close(); 

        if (recordingTrackId !== null) {
            const track = localAppServices.getTrackById ? localAppServices.getTrackById(recordingTrackId) : null;
            if (track && typeof track.addAudioClip === 'function') {
                await track.addAudioClip(blob, startTime); 
                if (localAppServices.showNotification) localAppServices.showNotification(`Audio recorded to ${track.name}.`, "success");
            } else {
                if (localAppServices.showNotification) localAppServices.showNotification("Error: Recorded track not found or cannot add clip.", "error");
            }
        }
        if (localAppServices.setRecordingTrackIdState) localAppServices.setRecordingTrackIdState(null); 
    } else if (wasGloballyRecording && !audioRecorder) { // Was in MIDI record mode
         if (localAppServices.showNotification) localAppServices.showNotification("Recording stopped.", "info");
    }
}

export async function fetchSoundLibrary(libraryName, libraryPath) {
    // ... (same as response #50) ...
    if (!libraryName || !libraryPath) {
        console.error("[Audio fetchSoundLibrary] Library name or path is missing.");
        if (localAppServices.showNotification) localAppServices.showNotification("Error: Library information missing.", "error");
        return;
    }
    const loadedZips = localAppServices.getLoadedZipFiles ? localAppServices.getLoadedZipFiles() : {};
    if (loadedZips[libraryName] === "loading") return; 

    try {
        if (localAppServices.setLoadedZipFiles) {
             localAppServices.setLoadedZipFiles({...loadedZips, [libraryName]: "loading" });
        }
        if (localAppServices.updateSoundBrowserDisplayForLibrary) localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, true, false);

        const response = await fetch(libraryPath);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${libraryPath}`);
        const zipBlob = await response.blob();
        
        if (typeof JSZip === 'undefined') {
            throw new Error("JSZip library is not loaded. Cannot process .zip file.");
        }
        const jszip = new JSZip();
        const zip = await jszip.loadAsync(zipBlob);
        
        const fileTree = {};
        zip.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir) {
                const pathParts = relativePath.split('/');
                let currentLevel = fileTree;
                pathParts.forEach((part, index) => {
                    if (index === pathParts.length - 1) { 
                        currentLevel[part] = { type: 'file', fullPath: relativePath, zipEntry };
                    } else { 
                        if (!currentLevel[part]) {
                            currentLevel[part] = { type: 'folder', children: {} };
                        }
                        currentLevel = currentLevel[part].children;
                    }
                });
            }
        });

        if (localAppServices.getSoundLibraryFileTreesState && localAppServices.setSoundLibraryFileTreesState) {
            const currentTrees = localAppServices.getSoundLibraryFileTreesState();
            localAppServices.setSoundLibraryFileTreesState({ ...currentTrees, [libraryName]: fileTree });
        }
        if (localAppServices.setLoadedZipFiles) {
            const currentLoadedAfterFetch = localAppServices.getLoadedZipFiles ? localAppServices.getLoadedZipFiles() : {};
            localAppServices.setLoadedZipFiles({ ...currentLoadedAfterFetch, [libraryName]: zip }); 
        }

        const currentLibNameFunc = localAppServices.getCurrentLibraryNameState;
        if (localAppServices.setCurrentLibraryNameState && (!currentLibNameFunc || !currentLibNameFunc())) {
            localAppServices.setCurrentLibraryNameState(libraryName); 
        } else if (localAppServices.updateSoundBrowserDisplayForLibrary) {
            localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, false, false);
        }
        if(localAppServices.showNotification) localAppServices.showNotification(`Library "${libraryName}" loaded.`, "success");

    } catch (error) {
        console.error(`[Audio fetchSoundLibrary] Error loading library ${libraryName}:`, error);
        if (localAppServices.showNotification) localAppServices.showNotification(`Failed to load library ${libraryName}: ${error.message}`, "error");
        if (localAppServices.setLoadedZipFiles) {
             const currentLoaded = localAppServices.getLoadedZipFiles ? localAppServices.getLoadedZipFiles() : {};
            localAppServices.setLoadedZipFiles({ ...currentLoaded, [libraryName]: "error" });
        }
        if (localAppServices.updateSoundBrowserDisplayForLibrary) localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, false, true);
    }
}

export async function loadSoundFromBrowserToTarget(soundData, trackId, targetType, targetContext = {}) {
    // ... (same as response #50, ensure Tone is checked before use) ...
    if (typeof Tone === 'undefined') return;
    if (!audioContextInitialized) await initAudioContextAndMasterMeter(true);
    if (!audioContextInitialized) return;

    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) {
        if (localAppServices.showNotification) localAppServices.showNotification("Target track not found.", "error");
        return;
    }
    const loadedZips = localAppServices.getLoadedZipFiles ? localAppServices.getLoadedZipFiles() : {};
    const zipInstance = loadedZips[soundData.libraryName];
    if (!zipInstance || zipInstance === "loading" || zipInstance === "error") {
        if (localAppServices.showNotification) localAppServices.showNotification(`Library ${soundData.libraryName} not loaded or in error state.`, "warning");
        return;
    }
    const fileEntry = zipInstance.file(soundData.fullPath);
    if (!fileEntry) {
         if (localAppServices.showNotification) localAppServices.showNotification(`File ${soundData.fileName} not found in library.`, "error");
        return;
    }
    try {
        const blob = await fileEntry.async('blob');
        const audioFile = new File([blob], soundData.fileName, { type: blob.type || getMimeTypeFromFilename(soundData.fileName) });

        if (track && typeof track.loadSample === 'function') {
            await track.loadSample(audioFile, targetType, targetContext);
            if (localAppServices.showNotification) localAppServices.showNotification(`${soundData.fileName} loaded to ${track.name}.`, "success");
        } else {
            console.error(`Track ${trackId} cannot load samples or method is missing.`);
             if (localAppServices.showNotification) localAppServices.showNotification(`Error loading sample to track.`, "error");
        }
    } catch (err) {
        console.error(`Error loading sound ${soundData.fileName} from zip:`, err);
        if (localAppServices.showNotification) localAppServices.showNotification(`Failed to load ${soundData.fileName}.`, "error");
    }
}

export async function loadAndPreviewSample(filePath, libraryName, fileNameToDisplay) {
    // ... (same as response #50, ensure Tone is checked before use) ...
    if (typeof Tone === 'undefined') return;
    if (!audioContextInitialized) await initAudioContextAndMasterMeter(true);
    if (!audioContextInitialized) return;

    const loadedZips = localAppServices.getLoadedZipFiles ? localAppServices.getLoadedZipFiles() : {};
    const zipInstance = loadedZips[libraryName];

    if (!zipInstance || zipInstance === "loading" || zipInstance === "error") {
        if (localAppServices.showNotification) localAppServices.showNotification(`Library ${libraryName} not ready for preview.`, "warning");
        return;
    }
    const fileEntry = zipInstance.file(filePath);
    if (!fileEntry) {
         if (localAppServices.showNotification) localAppServices.showNotification(`File ${fileNameToDisplay} not found in library for preview.`, "error");
        return;
    }
    try {
        const arrayBuffer = await fileEntry.async('arraybuffer');
        const audioBuffer = await Tone.context.decodeAudioData(arrayBuffer);
        
        let previewPlayer = localAppServices.getPreviewPlayerState ? localAppServices.getPreviewPlayerState() : null;
        if (previewPlayer && !previewPlayer.disposed) {
            previewPlayer.stop();
            previewPlayer.dispose();
        }
        previewPlayer = new Tone.Player(audioBuffer).toDestination();
        if (localAppServices.setPreviewPlayerState) localAppServices.setPreviewPlayerState(previewPlayer);
        previewPlayer.start();
        if (localAppServices.showNotification) localAppServices.showNotification(`Playing: ${fileNameToDisplay}`, "info", audioBuffer.duration * 1000);

    } catch (err) {
        console.error(`Error previewing sample ${fileNameToDisplay}:`, err);
        if (localAppServices.showNotification) localAppServices.showNotification(`Could not preview ${fileNameToDisplay}.`, "error");
    }
}
export function getMimeTypeFromFilename(filename) { /* ... same as response #50 ... */
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
        case 'mp3': return 'audio/mpeg';
        case 'wav': return 'audio/wav';
        case 'ogg': return 'audio/ogg';
        case 'aac': return 'audio/aac';
        case 'flac': return 'audio/flac';
        default: return 'application/octet-stream'; 
    }
}

export function updateMeters(globalMasterMeterElement, globalControlsMasterMeterElement, tracksForMetering) {
    // ... (same as response #50, ensure Tone is checked before use) ...
    if (typeof Tone === 'undefined') return;
    if (globalMasterMeterElement && masterMeterNode && !masterMeterNode.disposed) {
        const value = masterMeterNode.getValue(); 
        const db = Tone.gainToDb(Array.isArray(value) ? Math.max(value[0], value[1]) : value);
        const percentage = Math.min(100, Math.max(0, ((db + 60) / 60) * 100)); 
        globalMasterMeterElement.style.width = `${percentage}%`;
        globalMasterMeterElement.classList.toggle('clipping', db >= 0);
    }
    if (globalControlsMasterMeterElement && masterMeterNode && !masterMeterNode.disposed) {
        const value = masterMeterNode.getValue();
        const db = Tone.gainToDb(Array.isArray(value) ? Math.max(value[0], value[1]) : value);
        const percentage = Math.min(100, Math.max(0, ((db + 60) / 60) * 100));
        globalControlsMasterMeterElement.style.width = `${percentage}%`;
        globalControlsMasterMeterElement.classList.toggle('clipping', db >= 0);
    }
    (tracksForMetering || []).forEach(track => {
        if (track && track.channel && !track.channel.disposed && track.meterNode && !track.meterNode.disposed) {
            const mixerMeterEl = document.getElementById(`mixerMeter-${track.id}`);
            if (mixerMeterEl) {
                const value = track.meterNode.getValue();
                const db = Tone.gainToDb(Array.isArray(value) ? Math.max(value[0], value[1]) : value);
                const percentage = Math.min(100, Math.max(0, ((db + 60) / 60) * 100));
                mixerMeterEl.style.width = `${percentage}%`;
                mixerMeterEl.classList.toggle('clipping', db >= 0);
            }
        }
    });
}

export function playSlicePreview(trackId, sliceIndex) { 
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if(track && typeof track.playSlice === 'function') track.playSlice(sliceIndex);
}
export function playDrumSamplerPadPreview(trackId, padIndex) { 
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if(track && typeof track.playPad === 'function') track.playPad(padIndex);
}
export async function loadSampleFile(file, trackId, samplePurpose, context) { 
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (track && typeof track.loadSample === 'function') {
        await track.loadSample(file, samplePurpose, context);
    }
}
export async function loadDrumSamplerPadFile(file, trackId, padIndex) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (track && track.type === 'DrumSampler' && typeof track.loadSample === 'function') {
        await track.loadSample(file, 'DrumPad', { padIndex });
    }
}
export function autoSliceSample(trackId, numSlices) { 
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (track && track.type === 'Sampler' && typeof track.performAutoSlice === 'function') {
        track.performAutoSlice(numSlices);
    }
}
