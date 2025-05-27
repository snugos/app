// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading
import * as Constants from './constants.js';
import { showNotification } from './utils.js';

let audioContextInitialized = false;

export async function initAudioContextAndMasterMeter(isUserInitiated = false) {
    if (audioContextInitialized && Tone.context.state === 'running') {
        return true;
    }
    if (!audioContextInitialized && Tone.context.state === 'running') {
        if (!window.masterMeter && Tone.getDestination()) {
            window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
            Tone.getDestination().connect(window.masterMeter);
        }
        audioContextInitialized = true;
        return true;
    }
    try {
        await Tone.start();
        if (Tone.context.state === 'running') {
            if (!window.masterMeter && Tone.getDestination()) {
                window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
                Tone.getDestination().connect(window.masterMeter);
            }
            audioContextInitialized = true;
            return true;
        } else {
            if (isUserInitiated) {
                showNotification("AudioContext could not be started even with user interaction. Please check browser permissions or try another interaction.", 5000);
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

export function updateMeters(masterMeter, masterMeterBar, mixerMasterMeter, tracks) {
    if (Tone.context.state !== 'running' && !audioContextInitialized) {
        return;
    }

    if (masterMeter && masterMeterBar) {
        const level = Tone.dbToGain(masterMeter.getValue());
        masterMeterBar.style.width = `${Math.min(100, level * 100)}%`;
        masterMeterBar.classList.toggle('clipping', masterMeter.getValue() > -0.1);
    }

    // Check if mixer window exists and is visible for its master meter
    const mixerWindow = window.openWindows ? window.openWindows['mixer'] : null;
    if (masterMeter && mixerMasterMeter && mixerWindow && mixerWindow.element && !mixerWindow.isMinimized) {
        const level = Tone.dbToGain(masterMeter.getValue());
        mixerMasterMeter.style.width = `${Math.min(100, level * 100)}%`;
        mixerMasterMeter.classList.toggle('clipping', masterMeter.getValue() > -0.1);
    }

    (tracks || []).forEach(track => {
        if (track && track.trackMeter && typeof track.trackMeter.getValue === 'function') { // Added check for getValue
            const meterValue = track.trackMeter.getValue();
            const level = Tone.dbToGain(meterValue);
            const isClipping = meterValue > -0.1;

            // Inspector Meter - only update if inspector window is open and not minimized
            if (track.inspectorWindow && track.inspectorWindow.element && !track.inspectorWindow.isMinimized) {
                const inspectorMeterBar = track.inspectorWindow.element.querySelector(`#trackMeterBar-${track.id}`);
                if (inspectorMeterBar) {
                    inspectorMeterBar.style.width = `${Math.min(100, level * 100)}%`;
                    inspectorMeterBar.classList.toggle('clipping', isClipping);
                }
            }

            // Mixer Meter - only update if mixer window is open and not minimized
            if (mixerWindow && mixerWindow.element && !mixerWindow.isMinimized) {
                const mixerMeterBar = mixerWindow.element.querySelector(`#mixerTrackMeterBar-${track.id}`);
                 if (mixerMeterBar) {
                    mixerMeterBar.style.width = `${Math.min(100, level * 100)}%`;
                    mixerMeterBar.classList.toggle('clipping', isClipping);
                }
            }
        } else if (track && !track.trackMeter) {
            // console.warn(`[Audio] updateMeters: Track ${track.id} has no trackMeter object.`);
        }
    });
}


export async function fetchSoundLibrary(libraryName, zipUrl, isAutofetch = false) {
    if (window.loadedZipFiles && window.loadedZipFiles[libraryName] && window.loadedZipFiles[libraryName] !== "loading") {
        if (isAutofetch) console.log(`[Audio] Autofetch: Library ${libraryName} already loaded.`);
        if (!isAutofetch && typeof window.updateSoundBrowserDisplayForLibrary === 'function') {
            window.updateSoundBrowserDisplayForLibrary(libraryName);
        }
        return;
    }
    if (window.loadedZipFiles && window.loadedZipFiles[libraryName] === "loading") {
        if (isAutofetch) console.log(`[Audio] Autofetch: Library ${libraryName} is currently being loaded by another call.`);
        return;
    }

    console.log(`[Audio] Fetching library: ${libraryName} from ${zipUrl}. Autofetch: ${isAutofetch}`);
    if (!isAutofetch) {
        const soundBrowserList = document.getElementById('soundBrowserList');
        const pathDisplay = document.getElementById('soundBrowserPathDisplay');
        if (soundBrowserList) soundBrowserList.innerHTML = `<div class="sound-browser-loading">Fetching ${libraryName} sounds...</div>`;
        if (pathDisplay) pathDisplay.textContent = `Path: / (${libraryName} - Loading...)`;
    }

    try {
        if (!window.loadedZipFiles) window.loadedZipFiles = {};
        window.loadedZipFiles[libraryName] = "loading";

        const response = await fetch(zipUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} fetching ${zipUrl}`);
        const zipData = await response.arrayBuffer();
        const jszip = new JSZip();
        const loadedZip = await jszip.loadAsync(zipData);
        window.loadedZipFiles[libraryName] = loadedZip;

        const fileTree = {};
        window.loadedZipFiles[libraryName].forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return;
            const pathParts = relativePath.split('/').filter(p => p);
            let currentLevel = fileTree;
            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                if (i === pathParts.length - 1) {
                    if (part.endsWith('.wav') || part.endsWith('.mp3') || part.endsWith('.ogg')) { // Common audio types
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
        console.log(`[Audio] Library ${libraryName} fetched and processed.`);

        if (!isAutofetch && typeof window.updateSoundBrowserDisplayForLibrary === 'function') {
            window.updateSoundBrowserDisplayForLibrary(libraryName);
        }

    } catch (error) {
        console.error(`[Audio] Error fetching or processing ${libraryName} ZIP:`, error);
        if (window.loadedZipFiles) delete window.loadedZipFiles[libraryName]; // Clear loading state on error
        if (!isAutofetch) {
            showNotification(`Error with ${libraryName} library: ${error.message}`, 4000);
            const soundBrowserList = document.getElementById('soundBrowserList');
            const pathDisplay = document.getElementById('soundBrowserPathDisplay');
            if (soundBrowserList) soundBrowserList.innerHTML = `<div class="sound-browser-loading">Error fetching ${libraryName}. Check console.</div>`;
            if (pathDisplay) pathDisplay.textContent = `Path: / (Error - ${libraryName})`;
        }
    }
}

function getMimeTypeFromFilename(filename) {
    if (!filename || typeof filename !== 'string') return null;
    if (filename.toLowerCase().endsWith(".wav")) return "audio/wav";
    if (filename.toLowerCase().endsWith(".mp3")) return "audio/mpeg";
    if (filename.toLowerCase().endsWith(".ogg")) return "audio/ogg";
    // Add more types as needed
    return null;
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

    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        showNotification("Audio system not ready. Please click Play or interact with the app first.", 3000);
        return;
    }

    showNotification(`Loading "${fileName}" to ${track.name}...`, 2000);
    let blobUrl = null;
    try {
        if (!window.loadedZipFiles[libraryName] || window.loadedZipFiles[libraryName] === "loading") {
            throw new Error(`Sound library "${libraryName}" not fully loaded or still loading.`);
        }
        const zipEntry = window.loadedZipFiles[libraryName].file(fullPath);
        if (!zipEntry) throw new Error(`File "${fullPath}" not found in "${libraryName}" ZIP.`);

        const fileBlob = await zipEntry.async("blob");
        blobUrl = URL.createObjectURL(fileBlob); // blobUrl is created from the ZIP entry's blob

        if(typeof window.captureStateForUndo === 'function') {
             window.captureStateForUndo(`Load ${fileName} to ${track.name}`);
        }

        if (track.type === 'DrumSampler') {
            let actualPadIndex = targetPadOrSliceIndex;
            // Validate targetPadOrSliceIndex or determine fallback
            if (typeof actualPadIndex !== 'number' || isNaN(actualPadIndex) || actualPadIndex < 0 || actualPadIndex >= Constants.numDrumSamplerPads) {
                console.warn(`[Audio] loadSoundFromBrowserToTarget: targetPadOrSliceIndex for DrumSampler is invalid (${targetPadOrSliceIndex}). Finding fallback.`);
                actualPadIndex = track.drumSamplerPads.findIndex(p => !p.audioBufferDataURL); // First empty
                if (actualPadIndex === -1) actualPadIndex = track.selectedDrumPadForEdit;    // Current selection
                if (actualPadIndex === -1 || typeof actualPadIndex !== 'number' || isNaN(actualPadIndex)) actualPadIndex = 0; // Default to 0
                console.log(`[Audio] loadSoundFromBrowserToTarget: Fallback actualPadIndex for DrumSampler: ${actualPadIndex}`);
            }
            await loadDrumSamplerPadFile(blobUrl, track.id, actualPadIndex, fileName);
        } else if (track.type === 'Sampler') {
            await loadSampleFile(blobUrl, track.id, 'Sampler', fileName);
        } else if (track.type === 'InstrumentSampler') {
            await loadSampleFile(blobUrl, track.id, 'InstrumentSampler', fileName);
        }

    } catch (error) {
        console.error(`[Audio] Error loading sound "${fileName}" from browser:`, error);
        showNotification(`Error loading "${fileName}": ${error.message}`, 3000);
    } finally {
        if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            // console.log(`[Audio] Revoked blob URL from ZIP entry after processing in loadSoundFromBrowserToTarget: ${blobUrl}`);
        }
    }
}

export async function playSlicePreview(trackId, sliceIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0) {
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio not ready for preview.", 2000); return; }

    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : window.tracks;
    const track = tracksArray.find(t => t.id === trackId);

    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded || !track.slices[sliceIndex]) {
        console.warn(`[Audio] playSlicePreview: Conditions not met for track ${trackId}, slice ${sliceIndex}.`);
        return;
    }

    const sliceData = track.slices[sliceIndex];
    if (sliceData.duration <= 0) {
        console.warn(`[Audio] playSlicePreview: Slice ${sliceIndex} has zero duration.`);
        return;
    }

    const time = Tone.now();
    const totalPitchShift = (sliceData.pitchShift || 0) + additionalPitchShiftInSemitones;
    const playbackRate = Math.pow(2, totalPitchShift / 12);
    let playDuration = sliceData.duration / playbackRate;
    if (sliceData.loop) playDuration = Math.min(playDuration, 2); // Limit looped preview duration

    if (!track.slicerIsPolyphonic) {
        if (!track.slicerMonoPlayer || track.slicerMonoPlayer.disposed) {
            track.setupSlicerMonoNodes();
            if(!track.slicerMonoPlayer) { console.warn("[Audio] Mono player not set up for preview after setupSlicerMonoNodes."); return; }
        }
        const player = track.slicerMonoPlayer;
        const env = track.slicerMonoEnvelope;
        const gain = track.slicerMonoGain;

        if (player.state === 'started') player.stop(time);
        if (env.getValueAtTime(time) > 0.001) env.triggerRelease(time);

        player.buffer = track.audioBuffer;
        env.set(sliceData.envelope);
        gain.gain.value = Tone.dbToGain(-6) * sliceData.volume * velocity; // Apply preview volume adjustment
        player.playbackRate = playbackRate;
        player.reverse = sliceData.reverse;
        player.loop = sliceData.loop;
        player.loopStart = sliceData.offset;
        player.loopEnd = sliceData.offset + sliceData.duration;

        player.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
        env.triggerAttack(time);
        if (!sliceData.loop) {
            const releaseTime = time + playDuration - (sliceData.envelope.release || 0.1);
            env.triggerRelease(Math.max(time, releaseTime));
        }
    } else {
        const tempPlayer = new Tone.Player(track.audioBuffer);
        const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
        const tempGain = new Tone.Gain(Tone.dbToGain(-6) * sliceData.volume * velocity); // Apply preview volume adjustment

        const destinationNode = (track.distortionNode && !track.distortionNode.disposed) ? track.distortionNode : Tone.getDestination();
        tempPlayer.chain(tempEnv, tempGain, destinationNode);


        tempPlayer.playbackRate = playbackRate;
        tempPlayer.reverse = sliceData.reverse;
        tempPlayer.loop = sliceData.loop;
        tempPlayer.loopStart = sliceData.offset;
        tempPlayer.loopEnd = sliceData.offset + sliceData.duration;

        tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
        tempEnv.triggerAttack(time);
        if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95);

        Tone.Transport.scheduleOnce(() => {
            if (tempPlayer && !tempPlayer.disposed) { tempPlayer.stop(); tempPlayer.dispose(); }
            if (tempEnv && !tempEnv.disposed) tempEnv.dispose();
            if (tempGain && !tempGain.disposed) tempGain.dispose();
        }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);
    }
}

export async function playDrumSamplerPadPreview(trackId, padIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0) {
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio not ready for preview.", 2000); return; }

    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : window.tracks;
    const track = tracksArray.find(t => t.id === trackId);

    // console.log(`[Audio] playDrumSamplerPadPreview attempt for track ${trackId}, pad ${padIndex}.`);
    if (!track || track.type !== 'DrumSampler' || !track.drumPadPlayers[padIndex] || !track.drumPadPlayers[padIndex].loaded) {
        // console.warn(`[Audio] playDrumSamplerPadPreview: Conditions not met for track ${trackId}, pad ${padIndex}.`);
        // console.log(`[Audio] Details: track exists: ${!!track}, is DrumSampler: ${track?.type === 'DrumSampler'}, player exists: ${!!track?.drumPadPlayers[padIndex]}, player loaded: ${track?.drumPadPlayers[padIndex]?.loaded}`);
        return;
    }
    // console.log(`[Audio] playDrumSamplerPadPreview: Conditions MET for track ${trackId}, pad ${padIndex}. Player:`, track.drumPadPlayers[padIndex]);

    const player = track.drumPadPlayers[padIndex];
    const padData = track.drumSamplerPads[padIndex];

    player.volume.value = Tone.gainToDb(padData.volume * velocity * 0.5); // -6dB for preview
    const totalPadPitchShift = (padData.pitchShift || 0) + additionalPitchShiftInSemitones;
    player.playbackRate = Math.pow(2, totalPadPitchShift / 12);
    player.start(Tone.now());
}

export async function loadSampleFile(eventOrUrl, trackId, trackTypeHint, fileNameForUrl = null) {
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : window.tracks;
    const track = tracksArray.find(t => t.id === trackId);

    // console.log(`[Audio] loadSampleFile ENTERED. Args: eventOrUrl type=${typeof eventOrUrl}, trackId=${trackId}, trackTypeHint=${trackTypeHint}, fileNameForUrl=${fileNameForUrl}`);

    if (!track) { showNotification(`Track ID ${trackId} not found for sample load.`, 3000); return; }
    if (trackTypeHint !== 'Sampler' && trackTypeHint !== 'InstrumentSampler') {
        showNotification(`Cannot load sample into ${trackTypeHint} track type.`, 3000); return;
    }

    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio system not ready. Click Play or interact.", 3000); return; }

    let fileObject;
    let sourceName;
    const isUrlSource = typeof eventOrUrl === 'string';

    if (isUrlSource) {
        sourceName = fileNameForUrl || eventOrUrl.split('/').pop().split('?')[0] || "loaded_sample_from_url";
        try {
            // console.log(`[Audio] loadSampleFile: Fetching from URL source: ${eventOrUrl}`);
            const response = await fetch(eventOrUrl);
            if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status} ${eventOrUrl}`);
            const blob = await response.blob();

            let explicitType = blob.type;
            const inferredType = getMimeTypeFromFilename(sourceName); // Use helper
            if ((!explicitType || explicitType === "application/octet-stream" || explicitType === "text/plain") && inferredType) {
                explicitType = inferredType;
                // console.log(`[Audio] loadSampleFile: Blob type was "${blob.type}". Inferred and using type "${explicitType}" from filename "${sourceName}".`);
            }
            fileObject = new File([blob], sourceName, { type: explicitType });
            // console.log(`[Audio] loadSampleFile: Created File object from URL source. Name: ${fileObject.name}, Size: ${fileObject.size}, Type: ${fileObject.type}`);
        } catch (e) {
            console.error(`[Audio] Error fetching sample from URL "${eventOrUrl}":`, e);
            showNotification(`Error fetching sample: ${e.message}`, 3000);
            return;
        }
    } else if (eventOrUrl && eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
        fileObject = eventOrUrl.target.files[0];
        sourceName = fileObject.name;
        // console.log(`[Audio] loadSampleFile: Using File object from event. Name: ${fileObject.name}, Size: ${fileObject.size}, Type: ${fileObject.type}`);
    } else {
        console.error(`[Audio] loadSampleFile: No valid file source provided. eventOrUrl:`, eventOrUrl);
        showNotification("No file selected or provided for sample load.", 3000);
        return;
    }

    if (!fileObject || !fileObject.type || !fileObject.type.startsWith('audio/')) {
        showNotification(`Invalid or undetermined audio file type: "${fileObject?.type || 'unknown'}" for "${sourceName}". Please select a valid audio file.`, 3000);
        console.error(`[Audio] loadSampleFile: Invalid file type after potential correction. Type: ${fileObject?.type}, Name: ${sourceName}`);
        return;
    }
    if (fileObject.size === 0) {
        console.warn(`[Audio] loadSampleFile: The provided audio file "${sourceName}" is empty (0 bytes). Aborting load.`);
        showNotification(`Audio file "${sourceName}" is empty and cannot be loaded.`, 3000);
        return;
    }

    // console.log(`[Audio] loadSampleFile: Processing file "${sourceName}" for track ${track.id} (Type: ${trackTypeHint})`);
    if(typeof window.captureStateForUndo === 'function') {
        window.captureStateForUndo(`Load sample ${sourceName} to ${track.name}`);
    }

    let blobUrlForLoadingToneBuffer = null;
    let base64DataURLForSaving = null;

    try {
        blobUrlForLoadingToneBuffer = URL.createObjectURL(fileObject);
        // console.log(`[Audio] loadSampleFile: Created blobUrlForLoadingToneBuffer: ${blobUrlForLoadingToneBuffer} for Tone.Buffer().load()`);

        base64DataURLForSaving = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = (err) => {
                console.error("[Audio] FileReader error for DataURL in loadSampleFile:", err);
                reject(err);
            };
            reader.readAsDataURL(fileObject);
        });
        // console.log(`[Audio] loadSampleFile: Generated base64DataURLForSaving (length: ${base64DataURLForSaving?.length})`);

        if (trackTypeHint === 'Sampler' && track.audioBuffer && !track.audioBuffer.disposed) {
            track.audioBuffer.dispose();
            track.disposeSlicerMonoNodes();
        } else if (trackTypeHint === 'InstrumentSampler') {
            if (track.instrumentSamplerSettings?.audioBuffer && !track.instrumentSamplerSettings.audioBuffer.disposed) {
                track.instrumentSamplerSettings.audioBuffer.dispose();
            }
            if (track.toneSampler && !track.toneSampler.disposed) {
                track.toneSampler.dispose();
            }
        }

        const newAudioBuffer = await new Tone.Buffer().load(blobUrlForLoadingToneBuffer);
        console.log(`[Audio] Sample "${sourceName}" loaded into Tone.Buffer for track ${track.id}. Duration: ${newAudioBuffer.duration}, Loaded: ${newAudioBuffer.loaded}`);

        if (trackTypeHint === 'Sampler') {
            track.audioBufferDataURL = base64DataURLForSaving;
            track.audioBuffer = newAudioBuffer;
            track.originalFileName = sourceName;
            if (!track.slicerIsPolyphonic && track.audioBuffer?.loaded) {
                track.setupSlicerMonoNodes();
            }
            autoSliceSample(track.id, Constants.numSlices);
            if (typeof window.drawWaveform === 'function') window.drawWaveform(track);
            if (track.inspectorWindow?.element) {
                 const dropZoneInfo = track.inspectorWindow.element.querySelector(`#dropZoneContainer-${track.id}-sampler .drop-zone span.drop-zone-info`); // More specific selector if you add a span
                 if (dropZoneInfo) {
                    dropZoneInfo.textContent = `Loaded: ${sourceName.substring(0,25)}${sourceName.length > 25 ? '...' : ''}`;
                 } else { // Fallback to replacing drop-zone content
                    const dropZone = track.inspectorWindow.element.querySelector(`#dropZoneContainer-${track.id}-sampler .drop-zone`);
                    if (dropZone) dropZone.innerHTML = `Loaded: ${sourceName.substring(0,25)}${sourceName.length > 25 ? '...' : ''}<br>Drag/Click to replace.`;
                 }
            }
        } else if (trackTypeHint === 'InstrumentSampler') {
            track.instrumentSamplerSettings.audioBufferDataURL = base64DataURLForSaving;
            track.instrumentSamplerSettings.audioBuffer = newAudioBuffer;
            track.instrumentSamplerSettings.originalFileName = sourceName;
            track.instrumentSamplerSettings.loopStart = 0;
            track.instrumentSamplerSettings.loopEnd = newAudioBuffer.duration;
            track.setupToneSampler();
            if (typeof window.drawInstrumentWaveform === 'function') window.drawInstrumentWaveform(track);
            if (track.inspectorWindow?.element) {
                const dropZoneInfo = track.inspectorWindow.element.querySelector(`#dropZoneContainer-${track.id}-instrumentsampler .drop-zone span.drop-zone-info`);
                 if (dropZoneInfo) {
                    dropZoneInfo.textContent = `Loaded: ${sourceName.substring(0,25)}${sourceName.length > 25 ? '...' : ''}`;
                 } else {
                    const dropZone = track.inspectorWindow.element.querySelector(`#dropZoneContainer-${track.id}-instrumentsampler .drop-zone`);
                    if (dropZone) dropZone.innerHTML = `Loaded: ${sourceName.substring(0,25)}${sourceName.length > 25 ? '...' : ''}<br>Drag/Click to replace.`;
                 }

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
        if (blobUrlForLoadingToneBuffer) {
            URL.revokeObjectURL(blobUrlForLoadingToneBuffer);
            // console.log(`[Audio] Revoked blob URL (blobUrlForLoadingToneBuffer for sample file): ${blobUrlForLoadingToneBuffer}`);
        }
    }
}

export async function loadDrumSamplerPadFile(eventOrUrl, trackId, padIndex, fileNameForUrl = null) {
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : window.tracks;
    const track = tracksArray.find(t => t.id === trackId);

    // console.log(`[Audio] loadDrumSamplerPadFile ENTERED. Args: eventOrUrl type=${typeof eventOrUrl}, trackId=${trackId}, padIndex=${padIndex} (type: ${typeof padIndex}), fileNameForUrl=${fileNameForUrl}`);

    if (!track || track.type !== 'DrumSampler') {
        showNotification("Invalid track for drum sample.", 3000);
        console.error(`[Audio] loadDrumSamplerPadFile: Invalid track or track type. Track ID: ${trackId}, Type: ${track?.type}`);
        return;
    }
    if (typeof padIndex !== 'number' || isNaN(padIndex)) {
        console.error(`[Audio] loadDrumSamplerPadFile: padIndex is not a valid number. Received: ${padIndex} (type: ${typeof padIndex}). Aborting load for track ${trackId}.`);
        showNotification(`Internal error: Invalid pad index (${padIndex}) for drum sample load.`, 4000);
        return;
    }
    if (padIndex < 0 || padIndex >= track.drumSamplerPads.length) {
        showNotification(`Invalid pad index: ${padIndex}. Max pads: ${track.drumSamplerPads.length}.`, 3000);
        console.error(`[Audio] loadDrumSamplerPadFile: padIndex out of bounds. Index: ${padIndex}, Pads: ${track.drumSamplerPads.length}`);
        return;
    }

    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio system not ready. Click Play or interact.", 3000); return; }

    let fileObject;
    let sourceName;
    const isUrlSource = typeof eventOrUrl === 'string';

    if (isUrlSource) {
        sourceName = fileNameForUrl || eventOrUrl.split('/').pop().split('?')[0] || "loaded_pad_sample_url";
        try {
            // console.log(`[Audio] loadDrumSamplerPadFile: Fetching from URL source: ${eventOrUrl}`);
            const response = await fetch(eventOrUrl);
            if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status} ${eventOrUrl}`);
            const blob = await response.blob();

            let explicitType = blob.type;
            const inferredType = getMimeTypeFromFilename(sourceName); // Use helper
            if ((!explicitType || explicitType === "application/octet-stream" || explicitType === "text/plain") && inferredType) {
                explicitType = inferredType;
                // console.log(`[Audio] loadDrumSamplerPadFile: Blob type was "${blob.type}". Inferred and using type "${explicitType}" from filename "${sourceName}".`);
            }

            fileObject = new File([blob], sourceName, { type: explicitType });
            // console.log(`[Audio] loadDrumSamplerPadFile: Created File object from URL source. Name: ${fileObject.name}, Size: ${fileObject.size}, Type: ${fileObject.type}`);
        } catch (e) {
            console.error(`[Audio] Error fetching drum sample from URL "${eventOrUrl}":`, e);
            showNotification(`Error fetching drum sample: ${e.message}`, 3000);
            return;
        }
    } else if (eventOrUrl && eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
        fileObject = eventOrUrl.target.files[0];
        sourceName = fileObject.name;
        // console.log(`[Audio] loadDrumSamplerPadFile: Using File object from event. Name: ${fileObject.name}, Size: ${fileObject.size}, Type: ${fileObject.type}`);
    } else {
        console.error(`[Audio] loadDrumSamplerPadFile: No valid file source provided (eventOrUrl is problematic). eventOrUrl:`, eventOrUrl);
        showNotification("No file selected or provided for drum pad.", 3000);
        return;
    }

    if (!fileObject || !fileObject.type || !fileObject.type.startsWith('audio/')) {
        showNotification(`Invalid or undetermined audio file type: "${fileObject?.type || 'unknown'}" for "${sourceName}". Please select a valid audio file.`, 3000);
        console.error(`[Audio] loadDrumSamplerPadFile: Invalid file type after potential correction. Type: ${fileObject?.type}, Name: ${sourceName}`);
        return;
    }
    if (fileObject.size === 0) {
        console.warn(`[Audio] loadDrumSamplerPadFile: The provided audio file "${sourceName}" is empty (0 bytes). Aborting load.`);
        showNotification(`Audio file "${sourceName}" is empty and cannot be loaded.`, 3000);
        return;
    }

    if(typeof window.captureStateForUndo === 'function') {
        window.captureStateForUndo(`Load sample ${sourceName} to Pad ${padIndex + 1} on ${track.name}`);
    }
    // console.log(`[Audio] Loading sample "${sourceName}" for track ${track.id}, pad ${padIndex}`);


    let blobUrlForLoadingToneBuffer = null;
    let base64DataURLForSaving = null;

    try {
        const padData = track.drumSamplerPads[padIndex];
        if (!padData) {
            console.error(`[Audio] loadDrumSamplerPadFile: padData is undefined for padIndex ${padIndex} on track ${track.id}. This should not happen based on earlier checks.`);
            return; // Safeguard
        }

        blobUrlForLoadingToneBuffer = URL.createObjectURL(fileObject);
        // console.log(`[Audio] loadDrumSamplerPadFile: Created blobUrlForLoadingToneBuffer: ${blobUrlForLoadingToneBuffer} for Tone.Buffer().load()`);

        base64DataURLForSaving = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = (err) => {
                console.error("[Audio] FileReader error for DataURL in loadDrumSamplerPadFile:", err);
                reject(err); // Propagate error
            };
            reader.readAsDataURL(fileObject);
        });
        // console.log(`[Audio] loadDrumSamplerPadFile: Generated base64DataURLForSaving (length: ${base64DataURLForSaving?.length})`);

        const newAudioBuffer = await new Tone.Buffer().load(blobUrlForLoadingToneBuffer);
        console.log(`[Audio] Sample "${sourceName}" loaded into Tone.Buffer for track ${track.id}, pad ${padIndex}. Duration: ${newAudioBuffer.duration}, Loaded: ${newAudioBuffer.loaded}`);

        if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
        if (track.drumPadPlayers[padIndex] && !track.drumPadPlayers[padIndex].disposed) track.drumPadPlayers[padIndex].dispose();

        padData.audioBuffer = newAudioBuffer;
        padData.audioBufferDataURL = base64DataURLForSaving;
        padData.originalFileName = sourceName;

        const destinationNode = (track.distortionNode && !track.distortionNode.disposed) ? track.distortionNode : Tone.getDestination();
        track.drumPadPlayers[padIndex] = new Tone.Player(newAudioBuffer).connect(destinationNode);

        if (!track.distortionNode || track.distortionNode.disposed) {
            console.warn(`[Audio] Track ${track.id} distortionNode is invalid in loadDrumSamplerPadFile when creating player for pad ${padIndex}. Player connected to destination.`);
        }

        // console.log(`[Audio] Drum pad ${padIndex} for track ${track.id} player created and connected.`);
        // if (track.drumPadPlayers[padIndex]) {
        //     console.log(`[Audio] Player for pad ${padIndex} (track ${track.id}) exists. Loaded state immediately after creation: ${track.drumPadPlayers[padIndex].loaded}`);
        // } else {
        //     console.error(`[Audio] Player for pad ${padIndex} (track ${track.id}) is NULL after creation attempt!`);
        // }

        showNotification(`Sample "${sourceName}" loaded for Pad ${padIndex + 1} on track ${track.name}.`, 2000);
        if (typeof window.updateDrumPadControlsUI === 'function') window.updateDrumPadControlsUI(track);
        if (typeof window.renderDrumSamplerPads === 'function') window.renderDrumSamplerPads(track);

    } catch (error) {
        console.error(`[Audio] Error during main loading logic for sample "${sourceName}", pad ${padIndex}, track ${track.id}:`, error);
        showNotification(`Error loading sample "${sourceName}": ${error.message}`, 3000);
        if (track.drumSamplerPads[padIndex]) { // Ensure padData reference is still valid if error occurred after its definition
            track.drumSamplerPads[padIndex].audioBuffer = null;
            track.drumSamplerPads[padIndex].audioBufferDataURL = null;
            track.drumSamplerPads[padIndex].originalFileName = null;
        }
        if (track.drumPadPlayers[padIndex] && !track.drumPadPlayers[padIndex].disposed) {
            track.drumPadPlayers[padIndex].dispose();
        }
        track.drumPadPlayers[padIndex] = null;
    } finally {
        if (blobUrlForLoadingToneBuffer) {
            URL.revokeObjectURL(blobUrlForLoadingToneBuffer);
            // console.log(`[Audio] Revoked blob URL (blobUrlForLoadingToneBuffer): ${blobUrlForLoadingToneBuffer}`);
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
    track.slices = []; // Reset slices
    const sliceDuration = duration / numSlicesToCreate;

    for (let i = 0; i < numSlicesToCreate; i++) {
        track.slices.push({
            offset: i * sliceDuration,
            duration: sliceDuration,
            userDefined: false,
            volume: 1.0, pitchShift: 0, loop: false, reverse: false,
            envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 }
        });
    }
    track.selectedSliceForEdit = 0; // Reset selected slice
    // Ensure sequence data rows match the new number of slices
    track.setSequenceLength(track.sequenceLength, true); // true to skipUndo and re-evaluate rows

    if (typeof window.renderSamplePads === 'function') window.renderSamplePads(track);
    if (typeof window.updateSliceEditorUI === 'function') window.updateSliceEditorUI(track);
    if (typeof window.drawWaveform === 'function') window.drawWaveform(track);

    showNotification(`Sample auto-sliced into ${numSlicesToCreate} parts.`, 2000);
}
