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
export function getMasterMeter() { return masterMeterNode; } // Used by updateMeters in main.js

export async function initAudioContextAndMasterMeter(forceStart = false) {
    if (audioContextInitialized && !forceStart && Tone.context.state === 'running') { // Added check for running state
        // console.log("[Audio Init] AudioContext already initialized and running.");
        return;
    }
    if (typeof Tone === 'undefined') {
        console.error("[Audio Init] CRITICAL: Tone.js is not loaded.");
        if (localAppServices.showNotification) localAppServices.showNotification("Audio engine (Tone.js) failed to load!", "error", 0);
        return;
    }

    try {
        if (Tone.context.state !== 'running' || forceStart) {
            await Tone.start(); // Ensure Tone.js internal context is started
            console.log("[Audio Init] AudioContext started successfully via Tone.start(). State:", Tone.context.state);
        }

        // Initialize or re-initialize master bus input if needed
        if (!masterEffectsBusInputNode || masterEffectsBusInputNode.disposed) {
            masterEffectsBusInputNode = new Tone.Channel({ volume: 0, channelCount: 2 });
            // console.log("[Audio Init] MasterEffectsBusInputNode created.");
        }

        // Initialize or re-initialize master gain node
        let gainValue = 0.707; // Default linear gain (approx -3dB)
        if (localAppServices.getMasterGainValueState && typeof localAppServices.getMasterGainValueState === 'function'){
            gainValue = localAppServices.getMasterGainValueState();
        } else if (localAppServices.masterGainValue !== undefined) {
            gainValue = localAppServices.masterGainValue;
        }

        if (!masterGainNodeActual || masterGainNodeActual.disposed) {
            masterGainNodeActual = new Tone.Gain(gainValue).toDestination(); // Connect to destination initially
            // console.log("[Audio Init] MasterGainNodeActual created with gain:", gainValue);
        } else {
            masterGainNodeActual.gain.value = gainValue;
            // console.log("[Audio Init] MasterGainNodeActual updated with gain:", gainValue);
        }

        // Initialize or re-initialize master meter node
        if (!masterMeterNode || masterMeterNode.disposed) {
            masterMeterNode = new Tone.Meter({ channels: 2, smoothing: 0.8 });
            // console.log("[Audio Init] MasterMeterNode created.");
        }

        // Re-chain master effects. This will connect everything up to Tone.Destination.
        // The _rechainMasterEffectsAudio handles the full chain:
        // masterEffectsBusInputNode -> (effects) -> masterGainNodeActual -> masterMeterNode -> Tone.Destination
        _rechainMasterEffectsAudio();


        if (Tone.Transport && Tone.Transport.bpm) {
            Tone.Transport.bpm.value = (localAppServices.globalSettings?.tempo || Constants.MIN_TEMPO);
             if (localAppServices.updateTaskbarTempoDisplay) {
                localAppServices.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
            }
        }


        audioContextInitialized = true;
        // console.log("[Audio Init] Master audio chain configured.");
        if (localAppServices.showNotification && forceStart) localAppServices.showNotification("Audio Context Initialized.", "success", 1500);

    } catch (error) {
        console.error("[Audio Init] Error starting AudioContext or setting up master chain:", error);
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
        console.warn("[Audio addMasterEffect] Master effects bus input node not ready. Attempting re-init.");
        await initAudioContextAndMasterMeter(true); // Try to re-initialize if nodes are missing
        if (!masterEffectsBusInputNode) {
            console.error("[Audio addMasterEffect] Failed to initialize master bus after re-attempt.");
            return;
        }
    }

    const effectNode = createEffectInstance(effectType, params);
    if (effectNode) {
        activeMasterEffectNodes.set(effectId, effectNode);
        _rechainMasterEffectsAudio();
    } else {
        console.error(`[Audio addMasterEffect] Could not create effect instance for ${effectType}`);
    }
}
export async function removeMasterEffectFromAudio(effectId) {
    const effectNode = activeMasterEffectNodes.get(effectId);
    if (effectNode) {
        if (!effectNode.disposed) {
            try {
                effectNode.disconnect(); // Disconnect before disposing
                effectNode.dispose();
            } catch (e) { console.warn(`Error disposing master effect node ${effectId}: ${e.message}`);}
        }
        activeMasterEffectNodes.delete(effectId);
    }
    _rechainMasterEffectsAudio();
}
export function updateMasterEffectParamInAudio(effectId, paramPath, value) {
    const effectNode = activeMasterEffectNodes.get(effectId);
    if (effectNode && typeof effectNode.set === 'function' && !effectNode.disposed) {
        try {
            // Special handling for 'wet' if it's a direct property (like on FeedbackEffect)
            if (paramPath === 'wet' && effectNode.wet && effectNode.wet instanceof Tone.Signal) {
                 effectNode.wet.value = value;
            } else {
                effectNode.set({ [paramPath]: value });
            }
        } catch (e) { console.error(`Error setting param ${paramPath} on master effect ${effectId}:`, e); }
    }
}
export async function reorderMasterEffectInAudio() {
    // The reordering logic is handled by _rechainMasterEffectsAudio based on the state's order
    _rechainMasterEffectsAudio();
}
export async function clearAllMasterEffectNodes() {
    activeMasterEffectNodes.forEach(node => {
        if (node && !node.disposed) {
            try {
                node.disconnect();
                node.dispose();
            } catch (e) { /* ignore */ }
        }
    });
    activeMasterEffectNodes.clear();
    _rechainMasterEffectsAudio();
}

// This function is crucial for managing the master audio signal flow.
export function _rechainMasterEffectsAudio() {
    if (!audioContextInitialized || !masterEffectsBusInputNode || masterEffectsBusInputNode.disposed ||
        !masterGainNodeActual || masterGainNodeActual.disposed ||
        !masterMeterNode || masterMeterNode.disposed ||
        !Tone.getDestination() || Tone.getDestination().disposed) {
        console.warn("[Audio _rechainMasterEffectsAudio] Core audio nodes not ready. Cannot re-chain master effects.");
        // Optionally, attempt to re-initialize if called when not ready, though this could lead to loops if not careful.
        // await initAudioContextAndMasterMeter(true); // Be cautious with this.
        return;
    }

    // Disconnect everything downstream from the bus input to rebuild the chain
    masterEffectsBusInputNode.disconnect();
    if (activeMasterEffectNodes.size > 0) {
        activeMasterEffectNodes.forEach(node => {
            if (node && !node.disposed) node.disconnect(); // Disconnect all effect nodes too
        });
    }
    masterGainNodeActual.disconnect(); // Disconnect gain from meter/destination
    masterMeterNode.disconnect();    // Disconnect meter from destination


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
        } else if (!effectNode) {
             console.warn(`[Audio _rechainMasterEffectsAudio] Effect node for ID ${effectState.id} (type: ${effectState.type}) not found in activeMasterEffectNodes. It might not have been created or was already disposed.`);
        }
    });

    // Connect the end of the effects chain (or bus input if no effects) to Gain -> Meter -> Destination
    try {
        currentNode.chain(masterGainNodeActual, masterMeterNode, Tone.getDestination());
        // console.log("[Audio _rechainMasterEffectsAudio] Master chain reconfigured.");
    } catch (e) {
        console.error("[Audio _rechainMasterEffectsAudio] Error chaining final part of master audio path:", e);
        // Fallback connection if chaining fails
        if(currentNode && !currentNode.disposed && masterGainNodeActual && !masterGainNodeActual.disposed) {
            currentNode.connect(masterGainNodeActual);
            if(masterMeterNode && !masterMeterNode.disposed) masterGainNodeActual.connect(masterMeterNode);
            if(Tone.getDestination() && !Tone.getDestination().disposed) (masterMeterNode || masterGainNodeActual).connect(Tone.getDestination());
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
        await Tone.start(); // Ensure context is running before transport start
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
        // For synths and samplers, ensure all notes are released
        if (track.instrument && typeof track.instrument.releaseAll === 'function' && !track.instrument.disposed) {
            track.instrument.releaseAll(0);
        }
    });
    if(localAppServices.updatePlayheadPosition) localAppServices.updatePlayheadPosition();
    if(localAppServices.setIsRecordingState) localAppServices.setIsRecordingState(false); // Ensure recording stops if transport stops
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
        await stopAudioRecording(); // Handles both MIDI and Audio recording stop logic
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
        } else { // For MIDI/Synth/Sampler tracks
            if (localAppServices.setIsRecordingState) localAppServices.setIsRecordingState(true);
            // Ensure transport is started if not already, for MIDI recording to make sense with timeline
            if (Tone.Transport.state !== 'started') {
                Tone.Transport.start(); // Start transport if it's not already running
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
            await mic.open();
        }
        // Ensure mic is started after opening, sometimes 'open' doesn't mean 'started'
        if (mic.state !== "started") {
            await mic.open(); // Try again if not started.
            if (mic.state !== "started") { // If still not started, throw error
                 throw new Error("Microphone could not be started.");
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

        // Start transport if not already started for audio recording
        if (Tone.Transport.state !== 'started') {
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
        if (mic && mic.state !== "closed") mic.close(); // Close mic if it was opened
        if (audioRecorder && !audioRecorder.disposed) audioRecorder.dispose();
        if (localAppServices.setIsRecordingState) localAppServices.setIsRecordingState(false);
        if (localAppServices.setRecordingTrackIdState) localAppServices.setRecordingTrackIdState(null);
    }
}

export async function stopAudioRecording() {
    if (typeof Tone === 'undefined') return;
    const wasGloballyRecording = localAppServices.isGlobalRecordingActiveState ? localAppServices.isGlobalRecordingActiveState() : false;
    if (localAppServices.setIsRecordingState) localAppServices.setIsRecordingState(false); // This should update the record button UI

    const recordingTrackId = localAppServices.getRecordingTrackIdState ? localAppServices.getRecordingTrackIdState() : null;
    const startTime = localAppServices.getRecordingStartTimeState ? localAppServices.getRecordingStartTimeState() : 0;

    if (audioRecorder && audioRecorder.state === "started") {
        const blob = await audioRecorder.stop();
        if (mic && mic.state === "started") mic.close();

        if (recordingTrackId !== null) {
            const track = localAppServices.getTrackById ? localAppServices.getTrackById(recordingTrackId) : null;
            if (track && typeof track.addAudioClip === 'function') {
                // Pass the blob and start time to the track to create a clip
                const clipDuration = Tone.Transport.seconds - startTime; // Calculate duration
                await track.addAudioClip(blob, startTime, clipDuration); // Assume addAudioClip can handle this
                if (localAppServices.showNotification) localAppServices.showNotification(`Audio recorded to ${track.name}.`, "success");
            } else {
                if (localAppServices.showNotification) localAppServices.showNotification("Error: Recorded track not found or cannot add clip.", "error");
                // Save blob locally as a fallback if track handling fails
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.style.display = "none";
                a.href = url;
                a.download = `fallback_recording_${Date.now()}.webm`; // Adjust extension based on recorder's output
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

            }
        }
        if (localAppServices.setRecordingTrackIdState) localAppServices.setRecordingTrackIdState(null);
    } else if (wasGloballyRecording) { // Was in MIDI record mode or non-audio recording
         if (localAppServices.showNotification) localAppServices.showNotification("Recording stopped.", "info");
    }
    // Do not stop transport here, let user control playback separately
}

export async function fetchSoundLibrary(libraryName, libraryPath) {
    if (!libraryName || !libraryPath) {
        console.error("[Audio fetchSoundLibrary] Library name or path is missing.");
        if (localAppServices.showNotification) localAppServices.showNotification("Error: Library information missing.", "error");
        return;
    }
    const loadedZips = localAppServices.getLoadedZipFilesState ? localAppServices.getLoadedZipFilesState() : {};
    if (loadedZips[libraryName] === "loading") {
        if (localAppServices.showNotification) localAppServices.showNotification(`Library "${libraryName}" is already loading.`, "info");
        return;
    }

    try {
        if (localAppServices.setLoadedZipFiles) {
             localAppServices.setLoadedZipFiles({...loadedZips, [libraryName]: "loading" });
        }
        if (localAppServices.updateSoundBrowserDisplayForLibrary) localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, true, false);

        const response = await fetch(libraryPath);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${libraryPath}`);
        const zipBlob = await response.blob();

        if (typeof JSZip === 'undefined') {
            console.error("JSZip library is not loaded. Cannot process .zip file.");
            throw new Error("JSZip library is not loaded.");
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
                        currentLevel[part] = { type: 'file', fullPath: relativePath, zipEntry }; // Store zipEntry for later extraction
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
            localAppServices.setLoadedZipFiles({ ...currentLoadedAfterFetch, [libraryName]: zip }); // Store the JSZip instance
        }

        const currentLibNameFunc = localAppServices.getCurrentLibraryNameState;
        if (localAppServices.setCurrentLibraryNameState && (!currentLibNameFunc || !currentLibNameFunc())) {
            localAppServices.setCurrentLibraryNameState(libraryName); // This should trigger UI update via state change
        } else if (localAppServices.updateSoundBrowserDisplayForLibrary) {
            localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, false, false); // Force update if already selected
        }
        if(localAppServices.showNotification) localAppServices.showNotification(`Library "${libraryName}" loaded.`, "success");

    } catch (error) {
        console.error(`[Audio fetchSoundLibrary] Error loading library ${libraryName}:`, error);
        if (localAppServices.showNotification) localAppServices.showNotification(`Failed to load library ${libraryName}: ${error.message}`, "error");
        if (localAppServices.setLoadedZipFiles) {
             const currentLoaded = localAppServices.getLoadedZipFilesState ? localAppServices.getLoadedZipFilesState() : {};
            localAppServices.setLoadedZipFiles({ ...currentLoaded, [libraryName]: "error" });
        }
        if (localAppServices.updateSoundBrowserDisplayForLibrary) localAppServices.updateSoundBrowserDisplayForLibrary(libraryName, false, true);
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
    const zipInstance = loadedZips[soundData.libraryName]; // This should be the JSZip instance
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

        // Delegate to track's loadSample method or a more specific handler
        if (targetTrack.type === 'Audio' && typeof track.addSoundBrowserItemAsClip === 'function') {
            await track.addSoundBrowserItemAsClip(soundData, targetContext.startTime); // Assuming targetContext.startTime is passed
        } else if (['Sampler', 'DrumSampler', 'InstrumentSampler'].includes(targetTrack.type) && typeof track.loadSampleFromBrowser === 'function') {
            await track.loadSampleFromBrowser(soundData, targetType, targetContext);
        } else if (typeof track.loadSample === 'function') { // Fallback to generic loadSample
             await track.loadSample(audioFile, targetType, targetContext);
        }
        else {
            console.error(`Track ${trackId} (type ${track.type}) cannot load samples or method is missing for targetType ${targetType}.`);
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
    const zipInstance = loadedZips[libraryName]; // JSZip instance

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
        // Use Tone.context.decodeAudioData for consistency if Tone is available.
        const audioBuffer = await (Tone.context?.decodeAudioData(arrayBuffer) || new AudioContext().decodeAudioData(arrayBuffer));

        let previewPlayer = localAppServices.getPreviewPlayerState ? localAppServices.getPreviewPlayerState() : null;
        if (previewPlayer && !previewPlayer.disposed) {
            previewPlayer.stop();
            previewPlayer.dispose();
        }
        previewPlayer = new Tone.Player(audioBuffer).toDestination();
        if (localAppServices.setPreviewPlayerState) localAppServices.setPreviewPlayerState(previewPlayer);

        previewPlayer.start();
        if (localAppServices.setSelectedSoundForPreview && localAppServices.showNotification) { // Ensure setSelectedSoundForPreview exists
            localAppServices.setSelectedSoundForPreview({ fullPath: filePath, libraryName, fileName: fileNameToDisplay });
            localAppServices.showNotification(`Playing: ${fileNameToDisplay}`, "info", audioBuffer.duration * 1000 + 300); // Show for duration + a bit
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
        case 'webm': return 'audio/webm'; // Added webm
        default: return 'application/octet-stream';
    }
}

// updateMeters expects globalMasterMeterElement and globalControlsMasterMeterElement to be the *bar* elements themselves
export function updateMeters(globalMasterMeterElement, globalControlsMasterMeterElement, tracksForMetering) {
    if (typeof Tone === 'undefined' || !audioContextInitialized || !masterMeterNode || masterMeterNode.disposed) {
        // If masterMeterNode is not ready, try to set meters to 0 or a default state
        if (globalMasterMeterElement) globalMasterMeterElement.style.width = '0%';
        if (globalControlsMasterMeterElement) globalControlsMasterMeterElement.style.width = '0%';
        // Could add more logic here to show a "disabled" state if needed
        return;
    }

    const value = masterMeterNode.getValue();
    const db = Array.isArray(value) ? Tone.gainToDb(Math.max(value[0], value[1])) : Tone.gainToDb(value); // Handle mono/stereo
    const percentage = Math.min(100, Math.max(0, ((db + 60) / 60) * 100)); // Assuming -60dB is 0%

    if (globalMasterMeterElement) {
        globalMasterMeterElement.style.width = `${percentage}%`;
        globalMasterMeterElement.classList.toggle('clipping', db >= 0);
    }
    if (globalControlsMasterMeterElement) { // This is the bar inside the GlobalControls window
        globalControlsMasterMeterElement.style.width = `${percentage}%`;
        globalControlsMasterMeterElement.classList.toggle('clipping', db >= 0);
    }

    (tracksForMetering || []).forEach(track => {
        // Ensure track.meterNode exists and is valid (created in Track class for each track)
        if (track && track.meterNode && !track.meterNode.disposed) {
            const mixerMeterEl = document.getElementById(`mixerMeter-${track.id}`); // This is the bar element
            if (mixerMeterEl) {
                const trackValue = track.meterNode.getValue();
                const trackDb = Array.isArray(trackValue) ? Tone.gainToDb(Math.max(trackValue[0], trackValue[1])) : Tone.gainToDb(trackValue);
                const trackPercentage = Math.min(100, Math.max(0, ((trackDb + 60) / 60) * 100));
                mixerMeterEl.style.width = `${trackPercentage}%`;
                mixerMeterEl.classList.toggle('clipping', trackDb >= 0);
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

// Ensure Tone.js objects are properly disposed if this module itself were to be "reloaded" or "disposed",
// though typically JS modules aren't disposed in the same way objects are.
// This is more about ensuring that if a new AudioContext is created, old nodes are cleaned up.
// The initAudioContextAndMasterMeter handles some of this by checking for 'disposed'.
