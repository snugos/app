// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading
import * as Constants from './constants.js';
import { showNotification } from './utils.js';

let audioContextInitialized = false; // Module-level flag

export async function initAudioContextAndMasterMeter(isUserInitiated = false) {
    // If already initialized and context is running, nothing more to do.
    if (audioContextInitialized && Tone.context.state === 'running') {
        // console.log("[Audio] AudioContext already initialized and running.");
        return true;
    }

    // If context is running but our flag is false (e.g., page reloaded but context persisted),
    // update flag and set up meter if needed.
    if (!audioContextInitialized && Tone.context.state === 'running') {
        console.log("[Audio] Context is running (e.g. from previous interaction or auto-resume), ensuring meter is set up.");
        if (!window.masterMeter && Tone.getDestination()) {
            window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
            Tone.getDestination().connect(window.masterMeter);
            console.log("[Audio] Master meter (re)initialized and connected.");
        }
        audioContextInitialized = true;
        return true;
    }

    // Context is not running, attempt to start it.
    console.log("[Audio] Attempting to initialize AudioContext. User initiated:", isUserInitiated);
    try {
        // Tone.start() must be called in response to a user gesture for most browsers.
        await Tone.start();
        console.log("[Audio] Tone.start() attempt completed. AudioContext state:", Tone.context.state);

        if (Tone.context.state === 'running') {
            if (!window.masterMeter && Tone.getDestination()) {
                window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
                Tone.getDestination().connect(window.masterMeter);
                console.log("[Audio] Master meter initialized and connected post Tone.start().");
            }
            audioContextInitialized = true;
            console.log("[Audio] AudioContext successfully started and initialized.");
            return true; // Indicate success
        } else {
            // If Tone.start() was called but context is still not running
            if (isUserInitiated) {
                showNotification("AudioContext could not be started even with user interaction. Please check browser permissions or try another interaction.", 5000);
            } else {
                // This case should be less common if we primarily call this with isUserInitiated=true
                // or if Tone.js internally queues operations until context starts.
                showNotification("Audio system needs a user interaction (like clicking Play) to start.", 4000);
            }
            console.warn("[Audio] AudioContext failed to start. Current state:", Tone.context.state);
            audioContextInitialized = false; // Explicitly mark as not initialized
            return false; // Indicate failure
        }
    } catch (error) {
        console.error("[Audio] Error during Tone.start() or meter setup:", error);
        showNotification("Error initializing audio. Please check permissions and refresh.", 4000);
        audioContextInitialized = false;
        return false; // Indicate failure
    }
}

export function updateMeters(masterMeter, masterMeterBar, mixerMasterMeter, tracks) {
    if (Tone.context.state !== 'running' && !audioContextInitialized) return; // Don't try to update if not ready

    if (masterMeter && masterMeterBar) {
        const level = Tone.dbToGain(masterMeter.getValue());
        masterMeterBar.style.width = `${Math.min(100, level * 100)}%`;
        masterMeterBar.classList.toggle('clipping', masterMeter.getValue() > -0.1);
    }
    
    if (masterMeter && mixerMasterMeter) {
        const level = Tone.dbToGain(masterMeter.getValue());
        mixerMasterMeter.style.width = `${Math.min(100, level * 100)}%`;
        mixerMasterMeter.classList.toggle('clipping', masterMeter.getValue() > -0.1);
    }

    (tracks || []).forEach(track => {
        if (track && track.trackMeter) {
            const level = Tone.dbToGain(track.trackMeter.getValue());
            const inspectorMeterBar = track.inspectorWindow?.element?.querySelector(`#trackMeterBar-${track.id}`);
            if (inspectorMeterBar) {
                inspectorMeterBar.style.width = `${Math.min(100, level * 100)}%`;
                inspectorMeterBar.classList.toggle('clipping', track.trackMeter.getValue() > -0.1);
            }
            const mixerMeterBar = window.openWindows['mixer']?.element?.querySelector(`#mixerTrackMeterBar-${track.id}`);
             if (mixerMeterBar) {
                mixerMeterBar.style.width = `${Math.min(100, level * 100)}%`;
                mixerMeterBar.classList.toggle('clipping', track.trackMeter.getValue() > -0.1);
            }
        }
    });
}


export async function fetchSoundLibrary(libraryName, zipUrl) {
    const soundBrowserList = document.getElementById('soundBrowserList');
    const pathDisplay = document.getElementById('soundBrowserPathDisplay');
    if (!soundBrowserList || !pathDisplay) {
        console.warn("[Audio] Sound browser DOM elements not found for fetchSoundLibrary.");
        return;
    }

    soundBrowserList.innerHTML = `<div class="sound-browser-loading">Fetching ${libraryName} sounds...</div>`;
    pathDisplay.textContent = `Path: / (${libraryName} - Loading...)`;
    window.currentLibraryName = libraryName; 

    try {
        const response = await fetch(zipUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} fetching ${zipUrl}`);
        const zipData = await response.arrayBuffer();
        const jszip = new JSZip();
        window.loadedZipFiles[libraryName] = await jszip.loadAsync(zipData);
        
        window.currentSoundFileTree = {};
        window.loadedZipFiles[libraryName].forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return; // Skip directories
            const pathParts = relativePath.split('/').filter(p => p); // Filter out empty parts (e.g. from leading/trailing slashes)
            let currentLevel = window.currentSoundFileTree;
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                if (i === pathParts.length - 1) { // File part
                    // Ensure it's a recognized audio file before adding
                    if (part.endsWith('.wav') || part.endsWith('.mp3') || part.endsWith('.ogg')) {
                        currentLevel[part] = { type: 'file', entry: zipEntry, fullPath: relativePath };
                    }
                } else { // Directory part
                    if (!currentLevel[part] || currentLevel[part].type !== 'folder') {
                        currentLevel[part] = { type: 'folder', children: {} };
                    }
                    currentLevel = currentLevel[part].children;
                }
            }
        });
        window.currentSoundBrowserPath = []; // Reset path to root
        if (typeof window.renderSoundBrowserDirectory === 'function') {
            window.renderSoundBrowserDirectory(window.currentSoundBrowserPath, window.currentSoundFileTree);
        } else {
            console.warn("[Audio] renderSoundBrowserDirectory function not found. UI for sound browser won't update.");
        }

    } catch (error) {
        console.error(`[Audio] Error fetching or processing ${libraryName} ZIP:`, error);
        showNotification(`Error with ${libraryName} library: ${error.message}`, 4000);
        if (soundBrowserList) soundBrowserList.innerHTML = `<div class="sound-browser-loading">Error fetching ${libraryName}. Check console.</div>`;
        if (pathDisplay) pathDisplay.textContent = `Path: / (Error - ${libraryName})`;
    }
}

export async function loadSoundFromBrowserToTarget(soundData, targetTrackId, targetTrackType, targetPadOrSliceIndex = null) {
    const { fullPath, libraryName, fileName } = soundData;
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : window.tracks;
    const track = tracksArray.find(t => t.id === parseInt(targetTrackId));

    if (!track) {
        showNotification(`Target track ID ${targetTrackId} not found.`, 3000);
        return;
    }
    const isTargetSamplerType = ['Sampler', 'InstrumentSampler', 'DrumSampler'].includes(track.type);
    if (!isTargetSamplerType) {
         showNotification(`Cannot load "${fileName}" into a ${track.type} track. Target must be a sampler type.`, 3500);
        return;
    }
    
    // Ensure audio context is ready before proceeding with audio operations
    const audioReady = await initAudioContextAndMasterMeter(true); // true because this is user-initiated (drag/drop)
    if (!audioReady) {
        showNotification("Audio system not ready. Please click Play or interact with the app first.", 3000);
        return;
    }

    showNotification(`Loading "${fileName}" to ${track.name}...`, 2000);
    try {
        if (!window.loadedZipFiles[libraryName]) throw new Error(`Sound library "${libraryName}" not loaded.`);
        const zipEntry = window.loadedZipFiles[libraryName].file(fullPath);
        if (!zipEntry) throw new Error(`File "${fullPath}" not found in "${libraryName}" ZIP.`);

        const fileBlob = await zipEntry.async("blob");
        const blobUrl = URL.createObjectURL(fileBlob); // Create a URL for the blob

        // Capture state before making changes
        if(typeof window.captureStateForUndo === 'function') {
             window.captureStateForUndo(`Load ${fileName} to ${track.name}`);
        }

        if (track.type === 'DrumSampler') {
            let actualPadIndex = targetPadOrSliceIndex;
            if (targetPadOrSliceIndex === null || targetPadOrSliceIndex === undefined) { 
                actualPadIndex = track.drumSamplerPads.findIndex(p => !p.audioBufferDataURL);
                if (actualPadIndex === -1) actualPadIndex = track.selectedDrumPadForEdit;
                 if (actualPadIndex === -1) actualPadIndex = 0;
            }
            await loadDrumSamplerPadFile(blobUrl, track.id, actualPadIndex, fileName); // Pass blobUrl
        } else if (track.type === 'Sampler') {
            await loadSampleFile(blobUrl, track.id, 'Sampler', fileName); // Pass blobUrl
        } else if (track.type === 'InstrumentSampler') {
            await loadSampleFile(blobUrl, track.id, 'InstrumentSampler', fileName); // Pass blobUrl
        }
        // URL.revokeObjectURL(blobUrl); // Tone.Buffer.load should handle this if it makes its own copy.
                                      // Or, if Tone.Buffer uses the URL directly, revoke later.
                                      // For safety, if Tone.Buffer loads into an ArrayBuffer, revoking here is fine.
                                      // Let's assume Tone.Buffer copies the data.
    } catch (error) {
        console.error(`[Audio] Error loading sound "${fileName}" from browser:`, error);
        showNotification(`Error loading "${fileName}": ${error.message}`, 3000);
    }
}

export async function playSlicePreview(trackId, sliceIndex, velocity = 0.7) {
    const audioReady = await initAudioContextAndMasterMeter(true); // User interaction
    if (!audioReady) { showNotification("Audio not ready for preview.", 2000); return; }

    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : window.tracks;
    const track = tracksArray.find(t => t.id === trackId);

    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded || !track.slices[sliceIndex]) {
        console.warn(`[Audio] playSlicePreview: Conditions not met for track ${trackId}, slice ${sliceIndex}. Track:`, track);
        return;
    }
    
    const sliceData = track.slices[sliceIndex];
    if (sliceData.duration <= 0) {
        console.warn(`[Audio] playSlicePreview: Slice ${sliceIndex} has zero duration.`);
        return;
    }

    const time = Tone.now();
    const totalPitchShift = sliceData.pitchShift;
    const playbackRate = Math.pow(2, totalPitchShift / 12);
    let playDuration = sliceData.duration / playbackRate;
    if (sliceData.loop) playDuration = Math.min(playDuration, 2); // Limit looped preview duration

    if (!track.slicerIsPolyphonic) {
        if (!track.slicerMonoPlayer || track.slicerMonoPlayer.disposed) {
            track.setupSlicerMonoNodes(); // This should ensure player is ready
            if(!track.slicerMonoPlayer) { console.warn("[Audio] Mono player not set up for preview after setupSlicerMonoNodes."); return; }
        }
        const player = track.slicerMonoPlayer;
        const env = track.slicerMonoEnvelope;
        const gain = track.slicerMonoGain;

        if (player.state === 'started') player.stop(time); // Stop current sound
        if (env.getValueAtTime(time) > 0.001) env.triggerRelease(time); // Ensure envelope is reset

        player.buffer = track.audioBuffer; // Ensure buffer is current
        env.set(sliceData.envelope);
        gain.gain.value = Tone.dbToGain(-6) * sliceData.volume * velocity;
        player.playbackRate = playbackRate;
        player.reverse = sliceData.reverse;
        player.loop = sliceData.loop;
        player.loopStart = sliceData.offset;
        player.loopEnd = sliceData.offset + sliceData.duration;
        
        player.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
        env.triggerAttack(time);
        if (!sliceData.loop) {
            const releaseTime = time + playDuration - (sliceData.envelope.release || 0.1);
            env.triggerRelease(Math.max(time, releaseTime)); // Ensure release doesn't happen before attack
        }
    } else { // Polyphonic
        const tempPlayer = new Tone.Player(track.audioBuffer);
        const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
        const tempGain = new Tone.Gain(Tone.dbToGain(-6) * sliceData.volume * velocity);
        
        tempPlayer.chain(tempEnv, tempGain, track.distortionNode); // Connect to track's effect chain start
        
        tempPlayer.playbackRate = playbackRate;
        tempPlayer.reverse = sliceData.reverse;
        tempPlayer.loop = sliceData.loop;
        tempPlayer.loopStart = sliceData.offset;
        tempPlayer.loopEnd = sliceData.offset + sliceData.duration;

        tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
        tempEnv.triggerAttack(time);
        if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95); // Give a slight tail

        // Cleanup polyphonic player
        Tone.Transport.scheduleOnce(() => {
            if (tempPlayer && !tempPlayer.disposed) { tempPlayer.stop(); tempPlayer.dispose(); }
            if (tempEnv && !tempEnv.disposed) tempEnv.dispose();
            if (tempGain && !tempGain.disposed) tempGain.dispose();
        }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2); // Add a bit more buffer for release
    }
}

export async function playDrumSamplerPadPreview(trackId, padIndex, velocity = 0.7) {
    const audioReady = await initAudioContextAndMasterMeter(true); // User interaction
    if (!audioReady) { showNotification("Audio not ready for preview.", 2000); return; }

    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : window.tracks;
    const track = tracksArray.find(t => t.id === trackId);

    if (!track || track.type !== 'DrumSampler' || !track.drumPadPlayers[padIndex] || !track.drumPadPlayers[padIndex].loaded) {
        console.warn(`[Audio] playDrumSamplerPadPreview: Conditions not met for track ${trackId}, pad ${padIndex}. Player:`, track?.drumPadPlayers[padIndex]);
        return;
    }
    
    const player = track.drumPadPlayers[padIndex];
    const padData = track.drumSamplerPads[padIndex];

    player.volume.value = Tone.gainToDb(padData.volume * velocity);
    player.playbackRate = Math.pow(2, (padData.pitchShift) / 12);
    player.start(Tone.now());
}

// Handles both file input events and direct blob URLs
export async function loadSampleFile(eventOrUrl, trackId, trackTypeHint, fileNameForUrl = null) {
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : window.tracks;
    const track = tracksArray.find(t => t.id === trackId);

    if (!track || (trackTypeHint !== 'Sampler' && trackTypeHint !== 'InstrumentSampler')) {
        showNotification("Invalid track or track type for sample loading.", 3000);
        return;
    }

    const audioReady = await initAudioContextAndMasterMeter(true); // User interaction (file dialog / drop)
    if (!audioReady) {
        showNotification("Audio system not ready. Please click Play or interact with the app first.", 3000);
        return;
    }

    let fileUrl;
    let sourceName;
    const isUrlSource = typeof eventOrUrl === 'string';

    if (isUrlSource) {
        fileUrl = eventOrUrl;
        sourceName = fileNameForUrl || eventOrUrl.split('/').pop().split('?')[0] || "loaded_sample";
    } else if (eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
        const file = eventOrUrl.target.files[0];
        fileUrl = URL.createObjectURL(file); // Create a URL for the local file
        sourceName = file.name;
    } else {
        showNotification("No file or URL provided for sample.", 3000);
        return;
    }
    
    if(typeof window.captureStateForUndo === 'function') {
        window.captureStateForUndo(`Load sample ${sourceName} to ${track.name}`);
    }

    console.log(`[Audio] Loading sample "${sourceName}" for track ${track.id} from ${isUrlSource ? 'URL' : 'file event'}`);

    try {
        // Dispose old resources
        if (track.audioBuffer && !track.audioBuffer.disposed) track.audioBuffer.dispose();
        if (track.instrumentSamplerSettings?.audioBuffer && !track.instrumentSamplerSettings.audioBuffer.disposed) {
            track.instrumentSamplerSettings.audioBuffer.dispose();
        }
        if (track.toneSampler && !track.toneSampler.disposed) track.toneSampler.dispose();
        if (track.type === 'Sampler') track.disposeSlicerMonoNodes();

        // Convert file/URL to Base64 Data URL for persistent storage in project save
        const base64DataURL = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            // Fetch the blob if it's a URL (blob URL or remote URL)
            fetch(fileUrl)
                .then(response => response.blob())
                .then(blob => reader.readAsDataURL(blob))
                .catch(reject);
        });

        // Load into Tone.Buffer using the base64 Data URL (Tone.js can handle data URLs)
        const newBuffer = await new Tone.Buffer().load(base64DataURL);
        console.log(`[Audio] Sample "${sourceName}" loaded into Tone.Buffer for track ${track.id}. Duration: ${newBuffer.duration}`);

        if (trackTypeHint === 'Sampler') {
            track.audioBufferDataURL = base64DataURL; // Store for saving
            track.audioBuffer = newBuffer;
            track.originalFileName = sourceName;
            if (!track.slicerIsPolyphonic && track.audioBuffer?.loaded) {
                track.setupSlicerMonoNodes(); // Re-setup mono player with new buffer
            }
            autoSliceSample(track.id, Constants.numSlices); // Auto-slice the new sample
            if (typeof window.drawWaveform === 'function') window.drawWaveform(track);
            if (track.inspectorWindow?.element) {
                 const dropZone = track.inspectorWindow.element.querySelector(`#dropZone-${track.id}-sampler`);
                 if (dropZone) dropZone.innerHTML = `Loaded: ${sourceName}.<br>Drag/Click to replace.`;
            }
        } else if (trackTypeHint === 'InstrumentSampler') {
            track.instrumentSamplerSettings.audioBufferDataURL = base64DataURL; // Store for saving
            track.instrumentSamplerSettings.audioBuffer = newBuffer;
            track.instrumentSamplerSettings.originalFileName = sourceName;
            track.instrumentSamplerSettings.loopStart = 0; // Reset loop points for new sample
            track.instrumentSamplerSettings.loopEnd = newBuffer.duration;
            track.setupToneSampler(); // This will use the new buffer
            if (typeof window.drawInstrumentWaveform === 'function') window.drawInstrumentWaveform(track);
            if (track.inspectorWindow?.element) {
                const dropZone = track.inspectorWindow.element.querySelector(`#dropZone-${track.id}-instrumentsampler`);
                if (dropZone) dropZone.innerHTML = `Loaded: ${sourceName}.<br>Drag/Click to replace.`;
                const loopStartInput = track.inspectorWindow.element.querySelector(`#instrumentLoopStart-${track.id}`);
                const loopEndInput = track.inspectorWindow.element.querySelector(`#instrumentLoopEnd-${track.id}`);
                if(loopStartInput) loopStartInput.value = track.instrumentSamplerSettings.loopStart.toFixed(3);
                if(loopEndInput) loopEndInput.value = track.instrumentSamplerSettings.loopEnd.toFixed(3);
            }
        }
        showNotification(`Sample "${sourceName}" loaded for ${track.name}.`, 2000);

    } catch (error) {
        console.error(`[Audio] Error loading sample "${sourceName}" for track ${track.id}:`, error);
        showNotification(`Error loading sample: ${error.message}`, 3000);
    } finally {
        // Clean up object URL if it was created from a local file
        if (!isUrlSource && fileUrl.startsWith('blob:')) {
            URL.revokeObjectURL(fileUrl);
        }
    }
}

export async function loadDrumSamplerPadFile(eventOrUrl, trackId, padIndex, fileNameForUrl = null) {
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : window.tracks;
    const track = tracksArray.find(t => t.id === trackId);

    if (!track || track.type !== 'DrumSampler') {
        console.warn(`[Audio] loadDrumSamplerPadFile: Track ${trackId} not found or not a DrumSampler.`);
        return;
    }
    if (padIndex < 0 || padIndex >= track.drumSamplerPads.length) {
        console.warn(`[Audio] loadDrumSamplerPadFile: Invalid padIndex ${padIndex} for track ${trackId}.`);
        return;
    }
    
    const audioReady = await initAudioContextAndMasterMeter(true); // User interaction
    if (!audioReady) {
        showNotification("Audio system not ready. Please click Play or interact with the app first.", 3000);
        return;
    }

    let fileUrl;
    let sourceName;
    const isUrlSource = typeof eventOrUrl === 'string';

    if (isUrlSource) {
        fileUrl = eventOrUrl;
        sourceName = fileNameForUrl || eventOrUrl.split('/').pop().split('?')[0] || "loaded_pad_sample";
    } else if (eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
        const file = eventOrUrl.target.files[0];
        fileUrl = URL.createObjectURL(file);
        sourceName = file.name;
    } else {
        showNotification("No file provided for drum pad.", 3000);
        return;
    }

    if(typeof window.captureStateForUndo === 'function') {
        window.captureStateForUndo(`Load sample ${sourceName} to Pad ${padIndex + 1} on ${track.name}`);
    }
    console.log(`[Audio] Loading sample "${sourceName}" for track ${track.id}, pad ${padIndex}`);

    try {
        const padData = track.drumSamplerPads[padIndex];

        // Convert file/URL to Base64 Data URL
        const base64DataURL = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            fetch(fileUrl)
                .then(response => response.blob())
                .then(blob => reader.readAsDataURL(blob))
                .catch(reject);
        });
        
        const newAudioBuffer = await new Tone.Buffer().load(base64DataURL);
        console.log(`[Audio] Sample "${sourceName}" loaded into Tone.Buffer for track ${track.id}, pad ${padIndex}. Duration: ${newAudioBuffer.duration}`);

        // Dispose old resources for this specific pad
        if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
        if (track.drumPadPlayers[padIndex] && !track.drumPadPlayers[padIndex].disposed) track.drumPadPlayers[padIndex].dispose();

        padData.audioBuffer = newAudioBuffer;
        padData.audioBufferDataURL = base64DataURL; // Store for saving
        padData.originalFileName = sourceName;
        track.drumPadPlayers[padIndex] = new Tone.Player(newAudioBuffer).connect(track.distortionNode); // Connect to track's effect chain
        console.log(`[Audio] Drum pad ${padIndex} for track ${track.id} player created and connected.`);

        showNotification(`Sample "${sourceName}" loaded for Pad ${padIndex + 1} on track ${track.name}.`, 2000);
        if (typeof window.updateDrumPadControlsUI === 'function') window.updateDrumPadControlsUI(track);
        if (typeof window.renderDrumSamplerPads === 'function') window.renderDrumSamplerPads(track);

    } catch (error) {
        console.error(`[Audio] Error loading sample "${sourceName}" for drum pad ${padIndex} of track ${track.id}:`, error);
        showNotification(`Error loading sample "${sourceName}": ${error.message}`, 3000);
    } finally {
        if (!isUrlSource && fileUrl.startsWith('blob:')) {
            URL.revokeObjectURL(fileUrl);
        }
    }
}

export function autoSliceSample(trackId, numSlicesToCreate = Constants.numSlices) {
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : window.tracks;
    const track = tracksArray.find(t => t.id === trackId);

    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded) {
        showNotification("Cannot auto-slice: No audio loaded or track not a Sampler.", 3000);
        return;
    }
    console.log(`[Audio] Auto-slicing sample for track ${trackId} into ${numSlicesToCreate} parts.`);
    const duration = track.audioBuffer.duration;
    track.slices = []; // Clear existing slices
    const sliceDuration = duration / numSlicesToCreate;

    for (let i = 0; i < numSlicesToCreate; i++) {
        track.slices.push({
            offset: i * sliceDuration,
            duration: sliceDuration,
            userDefined: false, // Mark as auto-generated
            volume: 1.0, pitchShift: 0, loop: false, reverse: false,
            envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 } // Default envelope
        });
    }
    track.selectedSliceForEdit = 0; // Default to the first slice for editing
    // Re-initialize the sequence with the new number of slices (rows)
    // The sequence length (columns) remains the same unless explicitly changed.
    track.setSequenceLength(track.sequenceLength, true); // true to skip undo, as this is part of a larger action

    // Update UI
    if (typeof window.renderSamplePads === 'function') window.renderSamplePads(track);
    if (typeof window.updateSliceEditorUI === 'function') window.updateSliceEditorUI(track);
    if (typeof window.drawWaveform === 'function') window.drawWaveform(track);
    
    showNotification(`Sample auto-sliced into ${numSlicesToCreate} parts.`, 2000);
}
