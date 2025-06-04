// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading

import * as Constants from './constants.js';
import { createEffectInstance } from './effectsRegistry.js';
import { storeAudio as dbStoreAudio, getAudio as dbGetAudio } from './db.js';

let masterEffectsBusInputNode = null;
let masterGainNodeActual = null;
let masterMeterNode = null;
let activeMasterEffectNodes = new Map();

let audioContextInitialized = false;
let localAppServices = {};

let mic = null;
let audioRecorder = null;

export function initializeAudioModule(appServicesFromMain) {
    localAppServices = appServicesFromMain;
}

export function getMasterEffectsBusInputNode() { return masterEffectsBusInputNode; }
export function getActualMasterGainNode() { return masterGainNodeActual; }
export function getMasterMeter() { return masterMeterNode; }

export async function initAudioContextAndMasterMeter(forceStart = false) {
    if (audioContextInitialized && !forceStart && typeof Tone !== 'undefined' && Tone.context.state === 'running') {
        _rechainMasterEffectsAudio();
        return;
    }

    if (typeof Tone === 'undefined') {
        console.error("[Audio Init] CRITICAL: Tone.js is not loaded.");
        if (localAppServices.showNotification) localAppServices.showNotification("Audio engine (Tone.js) failed to load!", "error", 0);
        audioContextInitialized = false;
        return;
    }

    audioContextInitialized = false;

    try {
        if (Tone.context.state !== 'running' || forceStart) {
            await Tone.start();
            console.log("[Audio Init] AudioContext started successfully via Tone.start(). State:", Tone.context.state);
        }

        if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed) {
            masterEffectsBusInputNode = new Tone.Channel({ volume: 0, channelCount: 2 });
            console.log("[Audio Init] MasterEffectsBusInputNode created/verified.");
        }

        let gainValue = 0.707; // Default gain (0dB)
        if (localAppServices.getMasterGainValueState && typeof localAppServices.getMasterGainValueState === 'function') {
            const stateGain = localAppServices.getMasterGainValueState();
            if (typeof stateGain === 'number' && isFinite(stateGain)) {
                gainValue = stateGain;
            }
        } else if (localAppServices.masterGainValue !== undefined && typeof localAppServices.masterGainValue === 'number' && isFinite(localAppServices.masterGainValue)) {
            gainValue = localAppServices.masterGainValue;
        }


        if (!masterGainNodeActual || masterGainNodeActual.disposed) {
            masterGainNodeActual = new Tone.Gain(gainValue);
            console.log("[Audio Init] MasterGainNodeActual created/verified with gain:", gainValue);
        } else {
            masterGainNodeActual.gain.value = gainValue;
        }

        if (!masterMeterNode || masterMeterNode.disposed) {
            masterMeterNode = new Tone.Meter({ channels: 2, smoothing: 0.8 });
            console.log("[Audio Init] MasterMeterNode created/verified.");
        }
        
        if (!Tone.getDestination() || Tone.getDestination().disposed) {
            console.error("[Audio Init] Tone.Destination is not available or disposed. Cannot complete audio setup.");
            if (localAppServices.showNotification) localAppServices.showNotification("Audio output destination error.", "error", 0);
            return;
        }

        audioContextInitialized = true;
        console.log("[Audio Init] Essential audio nodes ready. Proceeding to chain.");

        _rechainMasterEffectsAudio(); 

        if (Tone.Transport && Tone.Transport.bpm) {
            const tempo = localAppServices.globalSettings?.tempo || (Constants.MIN_TEMPO + Constants.MAX_TEMPO) / 2; // More robust default
            Tone.Transport.bpm.value = Math.max(Constants.MIN_TEMPO, Math.min(Constants.MAX_TEMPO, tempo));
            if (localAppServices.updateTaskbarTempoDisplay) {
                localAppServices.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
            }
        }

        if (localAppServices.showNotification && forceStart) {
            localAppServices.showNotification("Audio Context Initialized and Chained.", "success", 1500);
        }

    } catch (error) {
        console.error("[Audio Init] Error during initAudioContextAndMasterMeter:", error);
        if (localAppServices.showNotification) localAppServices.showNotification("Error initializing audio system. Please refresh.", "error", 0);
        audioContextInitialized = false;
    }
}

export function setMasterVolume(linearGain) {
    if (masterGainNodeActual && !masterGainNodeActual.disposed) {
        masterGainNodeActual.gain.value = linearGain;
    }
}

export async function addMasterEffectToAudio(effectId, effectType, params) {
    if (!audioContextInitialized || !masterEffectsBusInputNode || masterEffectsBusInputNode.disposed) {
        console.warn("[Audio addMasterEffect] Core audio system not ready. Attempting re-init.");
        await initAudioContextAndMasterMeter(true);
        if (!audioContextInitialized || !masterEffectsBusInputNode) {
            console.error("[Audio addMasterEffect] Failed to initialize core audio after re-attempt.");
            if(localAppServices.showNotification) localAppServices.showNotification("Audio system error. Cannot add master effect.", "error");
            return;
        }
    }

    const effectNode = createEffectInstance(effectType, params);
    if (effectNode) {
        activeMasterEffectNodes.set(effectId, effectNode);
        _rechainMasterEffectsAudio();
    } else {
        console.error(`[Audio addMasterEffect] Could not create effect instance for ${effectType}`);
        if(localAppServices.showNotification) localAppServices.showNotification(`Error creating master effect: ${effectType}`, "error");
    }
}

export async function removeMasterEffectFromAudio(effectId) {
    const effectNode = activeMasterEffectNodes.get(effectId);
    if (effectNode) {
        if (!effectNode.disposed) {
            try {
                effectNode.disconnect();
                effectNode.dispose();
            } catch (e) { console.warn(`Error disposing master effect node ${effectId}: ${e.message}`); }
        }
        activeMasterEffectNodes.delete(effectId);
    }
    _rechainMasterEffectsAudio();
}

export function updateMasterEffectParamInAudio(effectId, paramPath, value) {
    const effectNode = activeMasterEffectNodes.get(effectId);
    if (effectNode && !effectNode.disposed && typeof effectNode.set === 'function') {
        try {
            if (paramPath === 'wet' && effectNode.wet && typeof effectNode.wet.value !== 'undefined') {
                 effectNode.wet.value = value;
            } else {
                // For nested params, Tone.js set might handle it if path is like 'oscillator.type'
                // However, it's safer to check if the property exists and is a signal-like object
                const pathParts = paramPath.split('.');
                let target = effectNode;
                for (let i = 0; i < pathParts.length - 1; i++) {
                    if (target && target[pathParts[i]] !== undefined) {
                        target = target[pathParts[i]];
                    } else {
                        target = null;
                        break;
                    }
                }
                const finalKey = pathParts[pathParts.length - 1];
                if (target && target[finalKey] !== undefined) {
                    if (target[finalKey] && typeof target[finalKey].value !== 'undefined' && typeof value !== 'object') {
                        target[finalKey].value = value; // For signal-like parameters
                    } else {
                         target[finalKey] = value; // For direct properties
                    }
                } else {
                    // Fallback to .set if direct path access fails or for complex objects
                    effectNode.set({ [paramPath]: value });
                }
            }
        } catch (e) { console.error(`Error setting param ${paramPath} on master effect ${effectId}:`, e); }
    }
}

export async function reorderMasterEffectInAudio() {
    _rechainMasterEffectsAudio();
}

export async function clearAllMasterEffectNodes() {
    activeMasterEffectNodes.forEach(node => {
        if (node && !node.disposed) {
            try {
                node.disconnect();
                node.dispose();
            } catch (e) { console.warn(`Error disposing a master effect node during clearAll: ${e.message}`); }
        }
    });
    activeMasterEffectNodes.clear();
    _rechainMasterEffectsAudio();
}

export function _rechainMasterEffectsAudio() {
    if (!audioContextInitialized ||
        !masterEffectsBusInputNode || masterEffectsBusInputNode.disposed ||
        !masterGainNodeActual || masterGainNodeActual.disposed ||
        !masterMeterNode || masterMeterNode.disposed ||
        !Tone.getDestination() || Tone.getDestination().disposed) {
        console.warn("[Audio _rechainMasterEffectsAudio] Core audio nodes not ready. Cannot re-chain master effects.");
        return;
    }

    // Disconnect the existing chain
    masterEffectsBusInputNode.disconnect();
    activeMasterEffectNodes.forEach(node => {
        if (node && !node.disposed) {
            try { node.disconnect(); } catch(e) { /* ignore if already disconnected */ }
        }
    });
    masterGainNodeActual.disconnect();
    masterMeterNode.disconnect(); // Meter was connected to destination, ensure it's cleared

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

    try {
        // Chain: last effect (or bus input) -> masterGain -> masterMeter -> Tone.Destination
        currentNode.connect(masterGainNodeActual);
        masterGainNodeActual.connect(masterMeterNode);
        masterMeterNode.connect(Tone.getDestination());
    } catch (e) {
        console.error("[Audio _rechainMasterEffectsAudio] Error chaining final part of master audio path:", e);
        // Fallback connection attempts if the full chain fails
        try {
            if (currentNode && !currentNode.disposed && masterGainNodeActual && !masterGainNodeActual.disposed) {
                currentNode.connect(masterGainNodeActual);
                if (masterMeterNode && !masterMeterNode.disposed) {
                    masterGainNodeActual.connect(masterMeterNode);
                    if (Tone.getDestination() && !Tone.getDestination().disposed) {
                        masterMeterNode.connect(Tone.getDestination());
                    }
                } else if (Tone.getDestination() && !Tone.getDestination().disposed) {
                    masterGainNodeActual.connect(Tone.getDestination());
                }
            }
        } catch (fallbackError) {
            console.error("[Audio _rechainMasterEffectsAudio] Fallback connection also failed:", fallbackError);
        }
    }
}

export async function togglePlayback() {
    if (typeof Tone === 'undefined') return;
    if (!audioContextInitialized) await initAudioContextAndMasterMeter(true);
    if (!audioContextInitialized) {
        if(localAppServices.showNotification) localAppServices.showNotification("Audio system not ready.", "warning");
        return;
    }

    if (Tone.Transport.state === 'started') {
        Tone.Transport.pause();
        if (localAppServices.showNotification) localAppServices.showNotification("Playback Paused", "info", 1000);
        if(localAppServices.uiElementsCache?.playBtn) localAppServices.uiElementsCache.playBtn.innerHTML = '<i class="fas fa-play"></i>';
        if(localAppServices.uiElementsCache?.playBtnGlobal) localAppServices.uiElementsCache.playBtnGlobal.innerHTML = '<i class="fas fa-play"></i>';
    } else {
        await Tone.start(); // Ensure context is running before starting transport
        Tone.Transport.start();
        if (localAppServices.showNotification) localAppServices.showNotification("Playback Started", "info", 1000);
        if(localAppServices.uiElementsCache?.playBtn) localAppServices.uiElementsCache.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
        if(localAppServices.uiElementsCache?.playBtnGlobal) localAppServices.uiElementsCache.playBtnGlobal.innerHTML = '<i class="fas fa-pause"></i>';
    }
}

export async function stopPlayback() {
    if (typeof Tone === 'undefined' || !audioContextInitialized) return;

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
        if (track.instrument && typeof track.instrument.releaseAll === 'function' && !track.instrument.disposed) {
            try { track.instrument.releaseAll(0); } catch(e) { console.warn(`Error releasing all on track ${track.id}: ${e.message}`);}
        }
    });
    if(localAppServices.updatePlayheadPosition) localAppServices.updatePlayheadPosition();
    if(localAppServices.setIsRecordingState) localAppServices.setIsRecordingState(false); // Also stop recording if it was active
    if(localAppServices.setRecordingTrackIdState) localAppServices.setRecordingTrackIdState(null);
}

export async function toggleRecording() {
    if (typeof Tone === 'undefined') return;
    if (!audioContextInitialized) await initAudioContextAndMasterMeter(true);
    if (!audioContextInitialized) {
        if(localAppServices.showNotification) localAppServices.showNotification("Audio system not ready for recording.", "warning");
        return;
    }

    const isCurrentlyRecording = localAppServices.isGlobalRecordingActiveState ? localAppServices.isGlobalRecordingActiveState() : false;
    const armedTrackId = localAppServices.getArmedTrackIdState ? localAppServices.getArmedTrackIdState() : null;

    if (isCurrentlyRecording) {
        // If it was an audio recording, stopAudioRecording handles notifications.
        // If it was MIDI recording, just update state.
        if (localAppServices.getRecordingTrackIdState && localAppServices.getRecordingTrackIdState()) { // Was audio recording
            await stopAudioRecording();
        } else { // Was MIDI/Sequencer recording
            if (localAppServices.setIsRecordingState) localAppServices.setIsRecordingState(false);
            if (localAppServices.showNotification) localAppServices.showNotification("Recording stopped.", "info");
        }
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
        } else { // Synth, Sampler, DrumSampler, InstrumentSampler
            if (localAppServices.setIsRecordingState) localAppServices.setIsRecordingState(true);
            if (Tone.Transport.state !== 'started') {
                await Tone.start(); // Ensure context is running
                Tone.Transport.start();
                 if (localAppServices.showNotification) localAppServices.showNotification(`Playback started. Recording armed for ${track.name}.`, "info");
                 if(localAppServices.uiElementsCache?.playBtn) localAppServices.uiElementsCache.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
                if(localAppServices.uiElementsCache?.playBtnGlobal) localAppServices.uiElementsCache.playBtnGlobal.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                if (localAppServices.showNotification) localAppServices.showNotification(`Recording armed for ${track.name}. Play MIDI or use sequencer.`, "info");
            }
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
        }
        if (mic.state !== "started") {
            await mic.open(); // This might throw if permission denied
            if (mic.state !== "started") { // Double check after open attempt
                 throw new Error("Microphone could not be started. Please grant permission.");
            }
        }

        if (!audioRecorder || audioRecorder.disposed) {
            audioRecorder = new Tone.Recorder();
        }
        mic.connect(audioRecorder);
        await audioRecorder.start();

        if (localAppServices.setRecordingTrackIdState) localAppServices.setRecordingTrackIdState(trackId);
        if (localAppServices.setRecordingStartTimeState) localAppServices.setRecordingStartTimeState(Tone.Transport.seconds);
        if (localAppServices.setIsRecordingState) localAppServices.setIsRecordingState(true);

        if (Tone.Transport.state !== 'started') {
            await Tone.start(); // Ensure context is running
            Tone.Transport.start();
             if (localAppServices.showNotification) localAppServices.showNotification(`Playback started. Recording audio started on track ${trackId}...`, "info");
             if(localAppServices.uiElementsCache?.playBtn) localAppServices.uiElementsCache.playBtn.innerHTML = '<i class="fas fa-pause"></i>';
            if(localAppServices.uiElementsCache?.playBtnGlobal) localAppServices.uiElementsCache.playBtnGlobal.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            if (localAppServices.showNotification) localAppServices.showNotification(`Recording audio started on track ${trackId}...`, "info");
        }

    } catch (error) {
        console.error("[Audio startAudioRecording] Error starting audio recording:", error);
        if (localAppServices.showNotification) localAppServices.showNotification(`Error starting audio recording: ${error.message}`, "error");
        if (mic && mic.state !== "closed") mic.close();
        if (audioRecorder && !audioRecorder.disposed) audioRecorder.dispose();
        if (localAppServices.setIsRecordingState) localAppServices.setIsRecordingState(false);
        if (localAppServices.setRecordingTrackIdState) localAppServices.setRecordingTrackIdState(null);
    }
}

export async function stopAudioRecording() {
    if (typeof Tone === 'undefined') return;
    const wasGloballyRecording = localAppServices.isGlobalRecordingActiveState ? localAppServices.isGlobalRecordingActiveState() : false;
    if (localAppServices.setIsRecordingState) localAppServices.setIsRecordingState(false); // Update global recording state first

    const recordingTrackId = localAppServices.getRecordingTrackIdState ? localAppServices.getRecordingTrackIdState() : null;
    const startTime = localAppServices.getRecordingStartTimeState ? localAppServices.getRecordingStartTimeState() : 0;

    if (audioRecorder && audioRecorder.state === "started") {
        try {
            const blob = await audioRecorder.stop();
            if (mic && mic.state === "started") mic.close();

            if (recordingTrackId !== null) {
                const track = localAppServices.getTrackById ? localAppServices.getTrackById(recordingTrackId) : null;
                if (track && typeof track.addAudioClip === 'function') {
                    const clipDuration = Tone.Transport.seconds - startTime;
                    await track.addAudioClip(blob, startTime, clipDuration); // Pass duration
                    if (localAppServices.showNotification) localAppServices.showNotification(`Audio recorded to ${track.name}.`, "success");
                } else {
                    if (localAppServices.showNotification) localAppServices.showNotification("Error: Recorded track not found or cannot add clip.", "error");
                    // Fallback to download the recording if track processing fails
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.style.display = "none"; a.href = url; a.download = `fallback_rec_${Date.now()}.webm`; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); document.body.removeChild(a);
                }
            } else {
                 if (localAppServices.showNotification) localAppServices.showNotification("Recording stopped, but no target track was set.", "warning");
            }
        } catch (error) {
            console.error("[Audio stopAudioRecording] Error stopping or processing recording:", error);
            if (localAppServices.showNotification) localAppServices.showNotification(`Error during recording stop: ${error.message}`, "error");
        } finally {
            if (localAppServices.setRecordingTrackIdState) localAppServices.setRecordingTrackIdState(null);
        }
    } else if (wasGloballyRecording && !recordingTrackId) { // If it was a non-audio recording that was stopped
         if (localAppServices.showNotification) localAppServices.showNotification("Recording stopped.", "info");
    }
}


export async function fetchSoundLibrary(libraryName, libraryPath) {
    if (!libraryName || !libraryPath) {
        console.error("[Audio fetchSoundLibrary] Library name or path is missing for fetch.");
        if (localAppServices.showNotification) localAppServices.showNotification("Error: Library information missing for fetch.", "error");
        return;
    }
    console.log(`[Audio fetchSoundLibrary] Attempting to fetch: ${libraryName} from ${libraryPath}`);

    const loadedZips = localAppServices.getLoadedZipFilesState ? localAppServices.getLoadedZipFilesState() : {};
    if (loadedZips[libraryName] === "loading") {
        if (localAppServices.showNotification) localAppServices.showNotification(`Library "${libraryName}" is already loading.`, "info");
        return;
    }

    try {
        if (localAppServices.setLoadedZipFiles) {
            localAppServices.setLoadedZipFiles({ ...loadedZips, [libraryName]: "loading" });
        }
        if (localAppServices.updateSoundBrowserDisplayForLibrary) {
            localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, true, false);
        }

        const response = await fetch(libraryPath);
        console.log(`[Audio fetchSoundLibrary] Response for ${libraryPath}: Status ${response.status}, OK: ${response.ok}, Type: ${response.type}, URL: ${response.url}`);

        if (!response.ok) {
            const errorText = await response.text().catch(() => "Could not read error response body.");
            console.error(`[Audio fetchSoundLibrary] HTTP error! status: ${response.status} for ${libraryPath}. Response body snippet: ${errorText.substring(0, 200)}`);
            throw new Error(`HTTP error! status: ${response.status} for ${libraryPath}. Response likely not a valid ZIP file.`);
        }

        const zipBlob = await response.blob();
        console.log(`[Audio fetchSoundLibrary] Blob received for ${libraryName}, size: ${zipBlob.size}, type: ${zipBlob.type}`);

        if (zipBlob.size === 0) {
            console.error(`[Audio fetchSoundLibrary] Fetched blob for ${libraryName} is empty (0 bytes). Path: ${libraryPath}`);
            throw new Error(`Fetched file for ${libraryName} is empty. Ensure the file path is correct and the file is not empty.`);
        }
        
        if (zipBlob.type && !zipBlob.type.includes('zip') && !zipBlob.type.includes('octet-stream') && !zipBlob.type.includes('binary') && !zipBlob.type.includes('x-zip-compressed')) {
            const blobText = await zipBlob.text().catch(() => "Could not read blob as text for type checking.");
            console.error(`[Audio fetchSoundLibrary] Fetched blob for ${libraryName} does NOT appear to be a ZIP file. Type: ${zipBlob.type}, Size: ${zipBlob.size}. Path: ${libraryPath}. Blob text snippet: ${blobText.substring(0, 500)}`);
            throw new Error(`Fetched file for ${libraryName} is not a ZIP (Type: ${zipBlob.type}). Check the network response in developer tools. It might be an HTML error page or a misconfigured server response.`);
        }
        

        if (typeof JSZip === 'undefined') {
            console.error("[Audio fetchSoundLibrary] JSZip library is not loaded. Cannot process .zip file.");
            throw new Error("JSZip library is not loaded.");
        }
        const jszip = new JSZip();
        const zip = await jszip.loadAsync(zipBlob);
        console.log(`[Audio fetchSoundLibrary] JSZip loaded for ${libraryName}.`);


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
            const currentLoadedAfterFetch = localAppServices.getLoadedZipFilesState ? localAppServices.getLoadedZipFilesState() : {};
            localAppServices.setLoadedZipFiles({ ...currentLoadedAfterFetch, [libraryName]: zip });
        }

        const currentLibNameFunc = localAppServices.getCurrentLibraryNameState;
        if (localAppServices.setCurrentLibraryNameState && (!currentLibNameFunc || !currentLibNameFunc())) {
            localAppServices.setCurrentLibraryNameState(libraryName);
        } else if (localAppServices.updateSoundBrowserDisplayForLibrary) {
            localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, false, false);
        }
        if(localAppServices.showNotification) localAppServices.showNotification(`Library "${libraryName}" loaded successfully.`, "success");

    } catch (error) {
        let userMessage = `Failed to load library ${libraryName}. `;
        if (error.message) {
            if (error.message.toLowerCase().includes("failed to fetch") || error.message.toLowerCase().includes("http error")) {
                userMessage += `Could not retrieve the library file. Please check if the file exists at the specified path and that there are no network issues (e.g., CORS). Path: ${libraryPath}`;
            } else if (error.message.toLowerCase().includes("jszip") || error.message.toLowerCase().includes("not a zip") || error.message.toLowerCase().includes("zip file")) {
                userMessage += `The file obtained from '${libraryPath}' is not a valid ZIP archive or is corrupted.`;
            } else {
                userMessage += `An unexpected error occurred: ${error.message}`;
            }
        } else {
            userMessage += `An unknown error occurred.`;
        }
        userMessage += " Check console for technical details.";

        console.error(`[Audio fetchSoundLibrary] Error loading library ${libraryName} from path ${libraryPath}:`, error);
        if (localAppServices.showNotification) localAppServices.showNotification(userMessage, "error", 10000);

        if (localAppServices.setLoadedZipFiles) {
            const currentLoaded = localAppServices.getLoadedZipFilesState ? localAppServices.getLoadedZipFilesState() : {};
            localAppServices.setLoadedZipFiles({ ...currentLoaded, [libraryName]: "error" });
        }
        if (localAppServices.updateSoundBrowserDisplayForLibrary) {
            localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, false, true);
        }
    }
}


export async function loadSoundFromBrowserToTarget(soundData, trackId, targetType, targetContext = {}) {
    if (typeof Tone === 'undefined') return;
    if (!audioContextInitialized) await initAudioContextAndMasterMeter(true);
    if (!audioContextInitialized) {
         if (localAppServices.showNotification) localAppServices.showNotification("Audio system not ready.", "warning");
        return;
    }

    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) {
        if (localAppServices.showNotification) localAppServices.showNotification("Target track not found.", "error");
        return;
    }
    const loadedZips = localAppServices.getLoadedZipFilesState ? localAppServices.getLoadedZipFilesState() : {};
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

        if (track.type === 'Audio' && typeof track.addSoundBrowserItemAsClip === 'function') {
            await track.addSoundBrowserItemAsClip(soundData, targetContext.startTime);
        } else if (['Sampler', 'DrumSampler', 'InstrumentSampler'].includes(track.type) && typeof track.loadSampleFromBrowser === 'function'){
            await track.loadSampleFromBrowser(soundData, targetType, targetContext);
        } else if (typeof track.loadSample === 'function') { // Fallback for older track implementations
             await track.loadSample(audioFile, targetType, targetContext);
        }
        else {
            console.error(`Track ${trackId} (type ${track.type}) cannot load samples for targetType ${targetType}.`);
            if (localAppServices.showNotification) localAppServices.showNotification(`Error loading sample to track. Incompatible type or method missing.`, "error");
            return;
        }
        if (localAppServices.showNotification) localAppServices.showNotification(`${soundData.fileName} loaded to ${track.name}.`, "success");

    } catch (err) {
        console.error(`Error loading sound ${soundData.fileName} from zip:`, err);
        if (localAppServices.showNotification) localAppServices.showNotification(`Failed to load ${soundData.fileName}.`, "error");
    }
}

export async function loadAndPreviewSample(filePath, libraryName, fileNameToDisplay) {
    if (typeof Tone === 'undefined') return;
    if (!audioContextInitialized) await initAudioContextAndMasterMeter(true);
    if (!audioContextInitialized) {
        if (localAppServices.showNotification) localAppServices.showNotification("Audio system not ready for preview.", "warning");
        return;
    }

    const loadedZips = localAppServices.getLoadedZipFilesState ? localAppServices.getLoadedZipFilesState() : {};
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
        const audioBuffer = await (Tone.context?.decodeAudioData(arrayBuffer) || new AudioContext().decodeAudioData(arrayBuffer));

        let previewPlayer = localAppServices.getPreviewPlayerState ? localAppServices.getPreviewPlayerState() : null;
        if (previewPlayer && !previewPlayer.disposed) {
            previewPlayer.stop();
            previewPlayer.dispose();
        }
        previewPlayer = new Tone.Player(audioBuffer).toDestination();
        if (localAppServices.setPreviewPlayerState) localAppServices.setPreviewPlayerState(previewPlayer);

        previewPlayer.start();
        if (localAppServices.setSelectedSoundForPreview && localAppServices.showNotification) {
            localAppServices.setSelectedSoundForPreview({ fullPath: filePath, libraryName, fileName: fileNameToDisplay });
            localAppServices.showNotification(`Playing: ${fileNameToDisplay}`, "info", audioBuffer.duration * 1000 + 300);
        }
    } catch (err) {
        console.error(`Error previewing sample ${fileNameToDisplay}:`, err);
        if (localAppServices.showNotification) localAppServices.showNotification(`Could not preview ${fileNameToDisplay}. ${err.message}`, "error");
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
        case 'webm': return 'audio/webm';
        default: return 'application/octet-stream'; // A generic binary type
    }
}

export function updateMeters(globalMasterMeterElement, globalControlsMasterMeterElement, tracksForMetering) {
    if (typeof Tone === 'undefined' || !audioContextInitialized || !masterMeterNode || masterMeterNode.disposed) {
        if (globalMasterMeterElement) globalMasterMeterElement.style.width = '0%';
        if (globalControlsMasterMeterElement) globalControlsMasterMeterElement.style.width = '0%';
        return;
    }

    const value = masterMeterNode.getValue();
    const db = Array.isArray(value) ? Tone.gainToDb(Math.max(value[0], value[1])) : Tone.gainToDb(value);
    const percentage = Math.min(100, Math.max(0, ((db + 60) / 60) * 100)); // Assuming -60dB is 0% and 0dB is 100%

    if (globalMasterMeterElement) {
        globalMasterMeterElement.style.width = `${percentage}%`;
        globalMasterMeterElement.classList.toggle('clipping', db >= 0);
    }
    if (globalControlsMasterMeterElement) {
        globalControlsMasterMeterElement.style.width = `${percentage}%`;
        globalControlsMasterMeterElement.classList.toggle('clipping', db >= 0);
    }

    (tracksForMetering || []).forEach(track => {
        if (track && track.meterNode && !track.meterNode.disposed && track.channel && !track.channel.mute) {
            const mixerMeterEl = document.getElementById(`mixerMeter-${track.id}`);
            const inspectorMeterEl = document.getElementById(`trackMeterBar-${track.id}`);

            const trackValue = track.meterNode.getValue();
            const trackDb = Array.isArray(trackValue) ? Tone.gainToDb(Math.max(trackValue[0], trackValue[1])) : Tone.gainToDb(trackValue);
            const trackPercentage = Math.min(100, Math.max(0, ((trackDb + 60) / 60) * 100));
            
            if (mixerMeterEl) {
                mixerMeterEl.style.width = `${trackPercentage}%`;
                mixerMeterEl.classList.toggle('clipping', trackDb >= 0);
            }
            if (inspectorMeterEl) {
                inspectorMeterEl.style.width = `${trackPercentage}%`;
                inspectorMeterEl.classList.toggle('clipping', trackDb >= 0);
            }
        } else if (track) { // If track is muted or meterNode not available, set meter to 0
            const mixerMeterEl = document.getElementById(`mixerMeter-${track.id}`);
            const inspectorMeterEl = document.getElementById(`trackMeterBar-${track.id}`);
            if (mixerMeterEl) mixerMeterEl.style.width = '0%';
            if (inspectorMeterEl) inspectorMeterEl.style.width = '0%';
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
    } else {
         if(localAppServices.showNotification) localAppServices.showNotification(`Cannot load sample: Track or load method not found.`, "error");
    }
}
export async function loadDrumSamplerPadFile(file, trackId, padIndex) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (track && track.type === 'DrumSampler' && typeof track.loadSample === 'function') {
        await track.loadSample(file, 'DrumPad', { padIndex });
    } else {
        if(localAppServices.showNotification) localAppServices.showNotification(`Cannot load to drum pad: Track not DrumSampler or load method missing.`, "error");
    }
}
export function autoSliceSample(trackId, numSlices) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (track && track.type === 'Sampler' && typeof track.performAutoSlice === 'function') {
        track.performAutoSlice(numSlices);
    } else {
        if(localAppServices.showNotification) localAppServices.showNotification(`Cannot auto-slice: Track not Sampler or method missing.`, "error");
    }
}
