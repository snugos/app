// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading (MODIFIED)
import * as Constants from './constants.js';
import { createEffectInstance } from './effectsRegistry.js';
import { storeAudio as dbStoreAudio, getAudio as dbGetAudio } from './db.js'; // Renamed to avoid conflict

let masterEffectsBusInputNode = null;
let masterGainNodeActual = null; // The actual Tone.Gain node for master volume
let masterMeterNode = null;
let activeMasterEffectNodes = new Map(); // Stores { id: Tone.jsNode } for master effects

let audioContextInitialized = false;
let localAppServices = {};

// Variables for audio recording
let mic = null;
let audioRecorder = null; // Renamed to avoid conflict with Tone.Recorder if used elsewhere

export function initializeAudioModule(appServicesFromMain) {
    localAppServices = appServicesFromMain;
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
            masterEffectsBusInputNode = new Tone.Channel({ volume: 0, channelCount: 2 }).toDestination(); // Input point for master effects chain
        }
        if (!masterGainNodeActual || masterGainNodeActual.disposed) {
             // The final gain stage before Tone.Destination, controlled by master fader
            masterGainNodeActual = new Tone.Gain(localAppServices.getMasterGainValueState ? localAppServices.getMasterGainValueState() : 0.707);
        }
        if (!masterMeterNode || masterMeterNode.disposed) {
            masterMeterNode = new Tone.Meter({ channels: 2, smoothing: 0.8 });
        }

        // Re-chain: masterEffectsBusInputNode -> masterGainNodeActual -> masterMeterNode -> Tone.Destination
        if (masterEffectsBusInputNode && masterGainNodeActual && masterMeterNode && Tone.Destination) {
            Tone.disconnect(masterEffectsBusInputNode); // Disconnect from any previous direct connection
            masterEffectsBusInputNode.chain(masterGainNodeActual, masterMeterNode, Tone.Destination);
        }


        Tone.Transport.bpm.value = Constants.MIN_TEMPO; // Set initial tempo
        if (localAppServices.updateTaskbarTempoDisplay) localAppServices.updateTaskbarTempoDisplay(Constants.MIN_TEMPO);

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
    if (localAppServices.setMasterGainValueState) localAppServices.setMasterGainValueState(linearGain);
}

// --- Master Effects Audio Chain Management ---
export async function addMasterEffectToAudio(effectId, effectType, params) {
    if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed) {
        console.warn("[Audio addMasterEffect] Master effects bus input node not ready.");
        await initAudioContextAndMasterMeter(true); // Try to init if not ready
        if (!masterEffectsBusInputNode) return; // Still not ready, abort
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
export async function reorderMasterEffectInAudio(effectId, newIndex) { // newIndex is not directly used here, relies on state order
    _rechainMasterEffectsAudio();
}
export async function clearAllMasterEffectNodes() {
    activeMasterEffectNodes.forEach(node => { if (node && !node.disposed) node.dispose(); });
    activeMasterEffectNodes.clear();
    _rechainMasterEffectsAudio(); // Reconnect input bus directly to master gain
}
function _rechainMasterEffectsAudio() {
    if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed || !masterGainNodeActual || masterGainNodeActual.disposed) {
        console.warn("[Audio _rechainMasterEffectsAudio] Bus input or master gain not ready. Cannot re-chain.");
        return;
    }

    // Disconnect the entire chain after masterEffectsBusInputNode's previous connection point
    masterEffectsBusInputNode.disconnect(); // Disconnects from whatever it was connected to

    let currentNode = masterEffectsBusInputNode;
    const masterEffectsState = localAppServices.getMasterEffectsState ? localAppServices.getMasterEffectsState() : [];

    masterEffectsState.forEach(effectState => {
        const effectNode = activeMasterEffectNodes.get(effectState.id);
        if (effectNode && !effectNode.disposed) {
            if (!effectState.isBypassed) {
                try {
                    currentNode.connect(effectNode);
                    currentNode = effectNode;
                } catch (e) { console.error(`Error connecting master effect ${effectState.type} (${effectState.id}):`, e); }
            }
        }
    });
    // Connect the end of the effects chain (or masterEffectsBusInputNode if no effects) to the masterGainNodeActual
    currentNode.connect(masterGainNodeActual);
}


// --- Playback Control ---
export async function togglePlayback() {
    if (!audioContextInitialized) await initAudioContextAndMasterMeter(true);
    if (!audioContextInitialized) return; // Still not ready

    if (Tone.Transport.state === 'started') {
        Tone.Transport.pause();
         if (localAppServices.showNotification) localAppServices.showNotification("Playback Paused", "info", 1000);
        if(localAppServices.uiElementsCache?.playBtn) localAppServices.uiElementsCache.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        if(localAppServices.uiElementsCache?.playBtnGlobal) localAppServices.uiElementsCache.playBtnGlobal.innerHTML = '<i class="fas fa-play"></i>';
    } else {
        Tone.Transport.start();
        if (localAppServices.showNotification) localAppServices.showNotification("Playback Started", "info", 1000);
        if(localAppServices.uiElementsCache?.playBtn) localAppServices.uiElementsCache.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        if(localAppServices.uiElementsCache?.playBtnGlobal) localAppServices.uiElementsCache.playBtnGlobal.innerHTML = '<i class="fas fa-pause"></i>';
    }
}
export async function stopPlayback() {
    if (!audioContextInitialized) return;
    Tone.Transport.stop();
    Tone.Transport.position = 0; // Reset position
    if (localAppServices.showNotification) localAppServices.showNotification("Playback Stopped", "info", 1000);
    if(localAppServices.uiElementsCache?.playBtn) localAppServices.uiElementsCache.playBtn.innerHTML = '<i class="fas fa-play"></i>';
    if(localAppServices.uiElementsCache?.playBtnGlobal) localAppServices.uiElementsCache.playBtnGlobal.innerHTML = '<i class="fas fa-play"></i>';

    // Stop all track-specific pattern players
    const tracks = localAppServices.getTracksState ? localAppServices.getTracksState() : [];
    tracks.forEach(track => {
        if (track.patternPlayerSequence && track.patternPlayerSequence.state === "started") {
            track.patternPlayerSequence.stop(0); // 0 ensures it stops at the next subdivision
        }
        if (track.type === "Audio" && track.activeAudioPlayers) {
            track.activeAudioPlayers.forEach(player => player.stop());
            track.activeAudioPlayers = [];
        }
    });
    if(localAppServices.updatePlayheadPosition) localAppServices.updatePlayheadPosition(); // Reset visual playhead
}


// --- Recording ---
export async function toggleRecording() {
    if (!audioContextInitialized) await initAudioContextAndMasterMeter(true);
    if (!audioContextInitialized) return;

    const isCurrentlyRecording = localAppServices.isGlobalRecordingActiveState ? localAppServices.isGlobalRecordingActiveState() : false;
    const armedTrackId = localAppServices.getArmedTrackIdState ? localAppServices.getArmedTrackIdState() : null;

    if (isCurrentlyRecording) { // Stop recording
        await stopAudioRecording();
    } else { // Start recording
        if (!armedTrackId) {
            if (localAppServices.showNotification) localAppServices.showNotification("No track armed for recording.", "warning");
            return;
        }
        const track = localAppServices.getTrackById(armedTrackId);
        if (!track) {
             if (localAppServices.showNotification) localAppServices.showNotification("Armed track not found.", "error");
            return;
        }
        if (track.type === 'Audio') {
            await startAudioRecording(armedTrackId);
        } else {
            // For MIDI/instrument tracks, "recording" is enabling step input or live MIDI recording to sequences
            if (localAppServices.setIsRecordingState) localAppServices.setIsRecordingState(true); // Global flag
            if (localAppServices.showNotification) localAppServices.showNotification(`Recording armed for ${track.name}. Play MIDI or click sequencer.`, "info");
        }
    }
}

export async function startAudioRecording(trackId) {
    if (!trackId) {
        if(localAppServices.showNotification) localAppServices.showNotification("Cannot start audio recording: No track ID provided.", "error");
        return;
    }
    try {
        if (!mic || mic.state === "closed") {
            mic = new Tone.UserMedia();
            await mic.open();
        }
        if (mic.state !== "started") {
            await mic.open(); // Ensure it's open
        }

        if (!audioRecorder || audioRecorder.disposed) {
            audioRecorder = new Tone.Recorder();
        }
        mic.connect(audioRecorder);
        await audioRecorder.start();

        if (localAppServices.setRecordingTrackIdState) localAppServices.setRecordingTrackIdState(trackId);
        if (localAppServices.setRecordingStartTimeState) localAppServices.setRecordingStartTimeState(Tone.Transport.seconds);
        if (localAppServices.setIsRecordingState) localAppServices.setIsRecordingState(true); // Global flag + specific track ID
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
    if (localAppServices.setIsRecordingState) localAppServices.setIsRecordingState(false); // Clear global flag first
    const recordingTrackId = localAppServices.getRecordingTrackIdState ? localAppServices.getRecordingTrackIdState() : null;
    const startTime = localAppServices.getRecordingStartTimeState ? localAppServices.getRecordingStartTimeState() : 0;

    if (audioRecorder && audioRecorder.state === "started") {
        const blob = await audioRecorder.stop();
        if (mic && mic.state === "started") mic.close(); // Close mic after stopping recorder

        if (recordingTrackId !== null) {
            const track = localAppServices.getTrackById(recordingTrackId);
            if (track && typeof track.addAudioClip === 'function') {
                await track.addAudioClip(blob, startTime); // Pass blob and start time to track
                if (localAppServices.showNotification) localAppServices.showNotification(`Audio recorded to ${track.name}.`, "success");
            } else {
                if (localAppServices.showNotification) localAppServices.showNotification("Error: Recorded track not found or cannot add clip.", "error");
            }
        }
        if (localAppServices.setRecordingTrackIdState) localAppServices.setRecordingTrackIdState(null); // Clear specific track ID
    } else {
        if (localAppServices.showNotification) localAppServices.showNotification("Recording stopped. No active audio recording found.", "info");
    }
}


// --- Sample Loading & Management ---
export async function fetchSoundLibrary(libraryName, libraryPath) {
    if (!libraryName || !libraryPath) {
        console.error("[Audio fetchSoundLibrary] Library name or path is missing.");
        if (localAppServices.showNotification) localAppServices.showNotification("Error: Library information missing.", "error");
        return;
    }
    if (localAppServices.getLoadedZipFiles && localAppServices.getLoadedZipFiles()[libraryName] === "loading") return; // Already loading

    try {
        if (localAppServices.getLoadedZipFiles && localAppServices.setLoadedZipFiles) {
             const currentLoaded = localAppServices.getLoadedZipFiles();
             localAppServices.setLoadedZipFiles({...currentLoaded, [libraryName]: "loading" });
        }
        if (localAppServices.updateSoundBrowserDisplayForLibrary) localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, true, false);

        const response = await fetch(libraryPath);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const zipBlob = await response.blob();
        const jszip = new JSZip();
        const zip = await jszip.loadAsync(zipBlob);
        
        const fileTree = {};
        zip.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir) {
                const pathParts = relativePath.split('/');
                let currentLevel = fileTree;
                pathParts.forEach((part, index) => {
                    if (index === pathParts.length - 1) { // File
                        currentLevel[part] = { type: 'file', fullPath: relativePath, zipEntry };
                    } else { // Folder
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
        if (localAppServices.getLoadedZipFiles && localAppServices.setLoadedZipFiles) {
            const currentLoaded = localAppServices.getLoadedZipFiles();
            localAppServices.setLoadedZipFiles({ ...currentLoaded, [libraryName]: zip }); // Store the JSZip instance
        }

        if (localAppServices.setCurrentLibraryNameState && (!localAppServices.getCurrentLibraryNameState || !localAppServices.getCurrentLibraryNameState())) {
            localAppServices.setCurrentLibraryNameState(libraryName); // Auto-select if no library is selected
        } else if (localAppServices.updateSoundBrowserDisplayForLibrary) {
            localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, false, false);
        }
        if(localAppServices.showNotification) localAppServices.showNotification(`Library "${libraryName}" loaded.`, "success");

    } catch (error) {
        console.error(`[Audio fetchSoundLibrary] Error loading library ${libraryName}:`, error);
        if (localAppServices.showNotification) localAppServices.showNotification(`Failed to load library ${libraryName}: ${error.message}`, "error");
        if (localAppServices.getLoadedZipFiles && localAppServices.setLoadedZipFiles) {
            const currentLoaded = localAppServices.getLoadedZipFiles();
            localAppServices.setLoadedZipFiles({ ...currentLoaded, [libraryName]: "error" });
        }
        if (localAppServices.updateSoundBrowserDisplayForLibrary) localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, false, true);
    }
}

export async function loadSoundFromBrowserToTarget(soundData, trackId, targetType, targetContext = {}) {
    // soundData: { fullPath, libraryName, fileName }
    // targetType: 'Sampler', 'DrumPad', 'InstrumentSampler'
    // targetContext: { padIndex (for DrumPad) }
    if (!audioContextInitialized) await initAudioContextAndMasterMeter(true);
    if (!audioContextInitialized) return;

    const track = localAppServices.getTrackById(trackId);
    if (!track) {
        if (localAppServices.showNotification) localAppServices.showNotification("Target track not found.", "error");
        return;
    }

    const loadedZips = localAppServices.getLoadedZipFiles();
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
        // Create a File object from blob to pass to track.loadSample
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
    if (!audioContextInitialized) await initAudioContextAndMasterMeter(true);
    if (!audioContextInitialized) return;

    const loadedZips = localAppServices.getLoadedZipFiles();
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
        
        let previewPlayer = localAppServices.getPreviewPlayerState();
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
export function getMimeTypeFromFilename(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    switch (ext) {
        case 'mp3': return 'audio/mpeg';
        case 'wav': return 'audio/wav';
        case 'ogg': return 'audio/ogg';
        case 'aac': return 'audio/aac';
        case 'flac': return 'audio/flac';
        default: return 'application/octet-stream'; // Fallback
    }
}


// --- Metering ---
export function updateMeters(globalMasterMeterElement, globalControlsMasterMeterElement, tracksForMetering) {
    // Master Meter (Top Taskbar)
    if (globalMasterMeterElement && masterMeterNode && !masterMeterNode.disposed) {
        const value = masterMeterNode.getValue(); // Can be array for stereo
        const db = Tone.gainToDb(Array.isArray(value) ? Math.max(value[0], value[1]) : value);
        const percentage = Math.min(100, Math.max(0, ((db + 60) / 60) * 100)); // Assuming -60dB is min
        globalMasterMeterElement.style.width = `${percentage}%`;
        globalMasterMeterElement.classList.toggle('clipping', db >= 0);
    }
    // Master Meter (Global Controls Window)
    if (globalControlsMasterMeterElement && masterMeterNode && !masterMeterNode.disposed) {
        const value = masterMeterNode.getValue();
        const db = Tone.gainToDb(Array.isArray(value) ? Math.max(value[0], value[1]) : value);
        const percentage = Math.min(100, Math.max(0, ((db + 60) / 60) * 100));
        globalControlsMasterMeterElement.style.width = `${percentage}%`;
        globalControlsMasterMeterElement.classList.toggle('clipping', db >= 0);
    }

    // Track Meters (typically in Mixer)
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

// --- Functions exposed for Track class or other modules to call ---
// These are simplified versions, actual implementation would be in Track class methods
// or more specific audio module functions interacting with Track instances.
export function playSlicePreview(trackId, sliceIndex) { /* To be implemented in Track or called via appServices */ }
export function playDrumSamplerPadPreview(trackId, padIndex) { /* To be implemented in Track or called via appServices */ }
export async function loadSampleFile(file, trackId, samplePurpose, context) { /* Delegate to Track instance */
    const track = localAppServices.getTrackById(trackId);
    if (track && typeof track.loadSample === 'function') {
        await track.loadSample(file, samplePurpose, context);
    }
}
export async function loadDrumSamplerPadFile(file, trackId, padIndex) {
    const track = localAppServices.getTrackById(trackId);
    if (track && track.type === 'DrumSampler' && typeof track.loadSample === 'function') {
        await track.loadSample(file, 'DrumPad', { padIndex });
    }
}
export function autoSliceSample(trackId, numSlices) { /* Delegate to Track instance */
    const track = localAppServices.getTrackById(trackId);
    if (track && track.type === 'Sampler' && typeof track.performAutoSlice === 'function') {
        track.performAutoSlice(numSlices);
    }
}
