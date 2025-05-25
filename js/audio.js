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
    if (Tone.context.state !== 'running' && !audioContextInitialized) return;

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
                    if (part.endsWith('.wav') || part.endsWith('.mp3') || part.endsWith('.ogg')) {
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
        if (window.loadedZipFiles) delete window.loadedZipFiles[libraryName];
        if (!isAutofetch) {
            showNotification(`Error with ${libraryName} library: ${error.message}`, 4000);
            const soundBrowserList = document.getElementById('soundBrowserList');
            const pathDisplay = document.getElementById('soundBrowserPathDisplay');
            if (soundBrowserList) soundBrowserList.innerHTML = `<div class="sound-browser-loading">Error fetching ${libraryName}. Check console.</div>`;
            if (pathDisplay) pathDisplay.textContent = `Path: / (Error - ${libraryName})`;
        }
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

    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        showNotification("Audio system not ready. Please click Play or interact with the app first.", 3000);
        return;
    }

    showNotification(`Loading "${fileName}" to ${track.name}...`, 2000);
    try {
        if (!window.loadedZipFiles[libraryName] || window.loadedZipFiles[libraryName] === "loading") {
            throw new Error(`Sound library "${libraryName}" not fully loaded or still loading.`);
        }
        const zipEntry = window.loadedZipFiles[libraryName].file(fullPath);
        if (!zipEntry) throw new Error(`File "${fullPath}" not found in "${libraryName}" ZIP.`);

        const fileBlob = await zipEntry.async("blob");
        const blobUrl = URL.createObjectURL(fileBlob);

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
            await loadDrumSamplerPadFile(blobUrl, track.id, actualPadIndex, fileName);
        } else if (track.type === 'Sampler') {
            await loadSampleFile(blobUrl, track.id, 'Sampler', fileName);
        } else if (track.type === 'InstrumentSampler') {
            await loadSampleFile(blobUrl, track.id, 'InstrumentSampler', fileName);
        }
        // URL.revokeObjectURL(blobUrl); // Revoke after all processing is done by the callbacks
    } catch (error) {
        console.error(`[Audio] Error loading sound "${fileName}" from browser:`, error);
        showNotification(`Error loading "${fileName}": ${error.message}`, 3000);
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
    if (sliceData.loop) playDuration = Math.min(playDuration, 2);

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
            env.triggerRelease(Math.max(time, releaseTime));
        }
    } else {
        const tempPlayer = new Tone.Player(track.audioBuffer);
        const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
        const tempGain = new Tone.Gain(Tone.dbToGain(-6) * sliceData.volume * velocity);

        tempPlayer.chain(tempEnv, tempGain, track.distortionNode);

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

    if (!track || track.type !== 'DrumSampler' || !track.drumPadPlayers[padIndex] || !track.drumPadPlayers[padIndex].loaded) {
        console.warn(`[Audio] playDrumSamplerPadPreview: Conditions not met for track ${trackId}, pad ${padIndex}.`);
        return;
    }

    const player = track.drumPadPlayers[padIndex];
    const padData = track.drumSamplerPads[padIndex];

    player.volume.value = Tone.gainToDb(padData.volume * velocity);
    const totalPadPitchShift = (padData.pitchShift || 0) + additionalPitchShiftInSemitones;
    player.playbackRate = Math.pow(2, totalPadPitchShift / 12);
    player.start(Tone.now());
}

export async function loadSampleFile(eventOrUrl, trackId, trackTypeHint, fileNameForUrl = null) {
    // console.log(`[Audio] loadSampleFile CALLED. trackId: ${trackId}, typeHint: ${trackTypeHint}, eventOrUrl type: ${typeof eventOrUrl}`, eventOrUrl);

    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : window.tracks;
    const track = tracksArray.find(t => t.id === trackId);

    if (!track) {
        console.error(`[Audio] loadSampleFile: Track ${trackId} not found.`);
        showNotification(`Track ${trackId} not found for sample loading.`, 3000);
        return;
    }
    if (trackTypeHint !== 'Sampler' && trackTypeHint !== 'InstrumentSampler') {
        console.error(`[Audio] loadSampleFile: Invalid trackTypeHint "${trackTypeHint}" for track ${trackId}. Expected 'Sampler' or 'InstrumentSampler'.`);
        showNotification("Invalid track type for this sample loading method.", 3000);
        return;
    }
    // console.log(`[Audio] loadSampleFile: Target track is ${track.name} (Type: ${track.type}, Expected Hint: ${trackTypeHint})`);

    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        showNotification("Audio system not ready. Please click Play or interact with the app first.", 3000);
        return;
    }

    let fileObject;
    let sourceName;
    const isUrlSource = typeof eventOrUrl === 'string';

    if (isUrlSource) {
        sourceName = fileNameForUrl || eventOrUrl.split('/').pop().split('?')[0] || "loaded_sample_from_url";
        // console.log(`[Audio] loadSampleFile: Fetching blob from URL: ${eventOrUrl}`);
        try {
            const response = await fetch(eventOrUrl);
            if (!response.ok) throw new Error(`Failed to fetch blob URL: ${response.status}`);
            const blob = await response.blob();
            let inferredMimeType = blob.type;
            if (!inferredMimeType || inferredMimeType === 'application/octet-stream' || inferredMimeType === 'text/plain') {
                if (sourceName.toLowerCase().endsWith('.wav')) {
                    inferredMimeType = 'audio/wav';
                } else if (sourceName.toLowerCase().endsWith('.mp3')) {
                    inferredMimeType = 'audio/mpeg';
                } else if (sourceName.toLowerCase().endsWith('.ogg')) {
                    inferredMimeType = 'audio/ogg';
                } else {
                    inferredMimeType = 'audio/*'; // Fallback, Tone.Buffer might still figure it out
                }
                console.log(`[Audio] loadSampleFile: Blob type was '${blob.type}', inferred MIME type as '${inferredMimeType}' from filename '${sourceName}'`);
            }
            fileObject = new File([blob], sourceName, { type: inferredMimeType });
            // console.log(`[Audio] loadSampleFile: Created File object from blob URL. Name: ${fileObject.name}, Type: ${fileObject.type}`);
        } catch (e) {
            console.error(`[Audio] Error fetching blob URL or creating File object for loadSampleFile: ${eventOrUrl}`, e);
            showNotification("Error processing sample from URL.", 3000);
            if (isUrlSource && eventOrUrl.startsWith('blob:')) URL.revokeObjectURL(eventOrUrl); // Clean up blob URL on error
            return;
        }
    } else if (eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
        fileObject = eventOrUrl.target.files[0];
        sourceName = fileObject.name;
        // console.log(`[Audio] loadSampleFile: Using File object from event. Name: ${sourceName}, Type: ${fileObject.type}`);
    } else {
        console.error("[Audio] loadSampleFile: No valid file, file event, or URL provided.");
        showNotification("No file or URL provided for sample.", 3000);
        return;
    }

    if (!fileObject || !fileObject.type || !fileObject.type.startsWith('audio/')) {
        console.error("[Audio] loadSampleFile: Invalid or missing file type after processing. File object type:", fileObject ? fileObject.type : 'undefined', "File name:", sourceName);
        showNotification(`Cannot load "${sourceName}". Invalid audio file type detected: ${fileObject?.type || 'unknown'}.`, 4000);
        if (isUrlSource && eventOrUrl.startsWith('blob:')) URL.revokeObjectURL(eventOrUrl); // Clean up blob URL if it was the source of the bad file type
        return;
    }

    console.log(`[Audio] loadSampleFile: Processing file "${sourceName}" for track ${track.id} (Type: ${trackTypeHint})`);
    if(typeof window.captureStateForUndo === 'function') {
        window.captureStateForUndo(`Load sample ${sourceName} to ${track.name}`);
    }

    try {
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

        const base64DataURL = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = (err) => {
                console.error("[Audio] FileReader error in loadSampleFile:", err);
                reject(err);
            };
            reader.readAsDataURL(fileObject);
        });

        const newBuffer = await new Tone.Buffer().load(base64DataURL);
        console.log(`[Audio] Sample "${sourceName}" loaded into Tone.Buffer for track ${track.id}. Duration: ${newBuffer.duration}`);

        if (trackTypeHint === 'Sampler') {
            track.audioBufferDataURL = base64DataURL;
            track.audioBuffer = newBuffer;
            track.originalFileName = sourceName;
            if (!track.slicerIsPolyphonic && track.audioBuffer?.loaded) {
                track.setupSlicerMonoNodes();
            }
            autoSliceSample(track.id, Constants.numSlices);
            if (typeof window.drawWaveform === 'function') window.drawWaveform(track);
            if (track.inspectorWindow?.element) {
                 const dropZone = track.inspectorWindow.element.querySelector(`#dropZone-${track.id}-sampler`);
                 if (dropZone) dropZone.innerHTML = `Loaded: ${sourceName.substring(0,25)}${sourceName.length > 25 ? '...' : ''}<br>Drag/Click to replace.`;
            }
        } else if (trackTypeHint === 'InstrumentSampler') {
            track.instrumentSamplerSettings.audioBufferDataURL = base64DataURL;
            track.instrumentSamplerSettings.audioBuffer = newBuffer;
            track.instrumentSamplerSettings.originalFileName = sourceName;
            track.instrumentSamplerSettings.loopStart = 0;
            track.instrumentSamplerSettings.loopEnd = newBuffer.duration;
            track.setupToneSampler();
            if (typeof window.drawInstrumentWaveform === 'function') window.drawInstrumentWaveform(track);
            if (track.inspectorWindow?.element) {
                const dropZone = track.inspectorWindow.element.querySelector(`#dropZone-${track.id}-instrumentsampler`);
                if (dropZone) dropZone.innerHTML = `Loaded: ${sourceName.substring(0,25)}${sourceName.length > 25 ? '...' : ''}<br>Drag/Click to replace.`;
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
        if (isUrlSource && eventOrUrl.startsWith('blob:')) {
            URL.revokeObjectURL(eventOrUrl); // Clean up the blob URL if it was created by loadSoundFromBrowserToTarget
            console.log(`[Audio] Revoked blob URL: ${eventOrUrl}`);
        }
    }
}

export async function loadDrumSamplerPadFile(eventOrUrl, trackId, padIndex, fileNameForUrl = null) {
    // console.log(`[Audio] loadDrumSamplerPadFile CALLED. trackId: ${trackId}, padIndex: ${padIndex}, eventOrUrl type: ${typeof eventOrUrl}`, eventOrUrl);
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

    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) {
        showNotification("Audio system not ready. Please click Play or interact with the app first.", 3000);
        return;
    }

    let fileObject;
    let sourceName;
    const isUrlSource = typeof eventOrUrl === 'string';

    if (isUrlSource) {
        sourceName = fileNameForUrl || eventOrUrl.split('/').pop().split('?')[0] || "loaded_pad_sample_url";
        // console.log(`[Audio] loadDrumSamplerPadFile: Fetching blob from URL: ${eventOrUrl}`);
        try {
            const response = await fetch(eventOrUrl);
            if (!response.ok) throw new Error(`Failed to fetch blob URL: ${response.status}`);
            const blob = await response.blob();
            let inferredMimeType = blob.type;
             if (!inferredMimeType || inferredMimeType === 'application/octet-stream' || inferredMimeType === 'text/plain') {
                if (sourceName.toLowerCase().endsWith('.wav')) inferredMimeType = 'audio/wav';
                else if (sourceName.toLowerCase().endsWith('.mp3')) inferredMimeType = 'audio/mpeg';
                else if (sourceName.toLowerCase().endsWith('.ogg')) inferredMimeType = 'audio/ogg';
                else inferredMimeType = 'audio/*';
                console.log(`[Audio] loadDrumSamplerPadFile: Blob type was '${blob.type}', inferred MIME type as '${inferredMimeType}' from filename '${sourceName}'`);
            }
            fileObject = new File([blob], sourceName, { type: inferredMimeType });
        } catch (e) {
            console.error(`[Audio] Error fetching blob URL for loadDrumSamplerPadFile: ${eventOrUrl}`, e);
            showNotification("Error processing sample for pad from URL.", 3000);
            if (isUrlSource && eventOrUrl.startsWith('blob:')) URL.revokeObjectURL(eventOrUrl);
            return;
        }
    } else if (eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
        fileObject = eventOrUrl.target.files[0];
        sourceName = fileObject.name;
    } else {
        showNotification("No file provided for drum pad.", 3000);
        return;
    }

     if (!fileObject || !fileObject.type || !fileObject.type.startsWith('audio/')) {
        console.error("[Audio] loadDrumSamplerPadFile: Invalid or missing file type after processing. File object type:", fileObject ? fileObject.type : 'undefined', "File name:", sourceName);
        showNotification(`Cannot load "${sourceName}" to pad. Invalid audio file type detected: ${fileObject?.type || 'unknown'}.`, 4000);
        if (isUrlSource && eventOrUrl.startsWith('blob:')) URL.revokeObjectURL(eventOrUrl);
        return;
    }

    if(typeof window.captureStateForUndo === 'function') {
        window.captureStateForUndo(`Load sample ${sourceName} to Pad ${padIndex + 1} on ${track.name}`);
    }
    console.log(`[Audio] Loading sample "${sourceName}" for track ${track.id}, pad ${padIndex}`);

    try {
        const padData = track.drumSamplerPads[padIndex];

        const base64DataURL = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = (err) => {
                console.error("[Audio] FileReader error in loadDrumSamplerPadFile:", err);
                reject(err);
            };
            reader.readAsDataURL(fileObject);
        });

        const newAudioBuffer = await new Tone.Buffer().load(base64DataURL);
        console.log(`[Audio] Sample "${sourceName}" loaded into Tone.Buffer for track ${track.id}, pad ${padIndex}. Duration: ${newAudioBuffer.duration}`);


        if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
        if (track.drumPadPlayers[padIndex] && !track.drumPadPlayers[padIndex].disposed) track.drumPadPlayers[padIndex].dispose();

        padData.audioBuffer = newAudioBuffer;
        padData.audioBufferDataURL = base64DataURL;
        padData.originalFileName = sourceName;
        track.drumPadPlayers[padIndex] = new Tone.Player(newAudioBuffer).connect(track.distortionNode);
        console.log(`[Audio] Drum pad ${padIndex} for track ${track.id} player created and connected.`);


        showNotification(`Sample "${sourceName}" loaded for Pad ${padIndex + 1} on track ${track.name}.`, 2000);
        if (typeof window.updateDrumPadControlsUI === 'function') window.updateDrumPadControlsUI(track);
        if (typeof window.renderDrumSamplerPads === 'function') window.renderDrumSamplerPads(track);

    } catch (error) {
        console.error(`[Audio] Error loading sample "${sourceName}" for drum pad ${padIndex} of track ${track.id}:`, error);
        showNotification(`Error loading sample "${sourceName}": ${error.message}`, 3000);
    } finally {
        if (isUrlSource && eventOrUrl.startsWith('blob:')) {
            URL.revokeObjectURL(eventOrUrl); // Clean up the blob URL if it was created by loadSoundFromBrowserToTarget
            console.log(`[Audio] Revoked blob URL: ${eventOrUrl}`);
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
    track.slices = [];
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
    track.selectedSliceForEdit = 0;
    track.setSequenceLength(track.sequenceLength, true);

    if (typeof window.renderSamplePads === 'function') window.renderSamplePads(track);
    if (typeof window.updateSliceEditorUI === 'function') window.updateSliceEditorUI(track);
    if (typeof window.drawWaveform === 'function') window.drawWaveform(track);
    
    showNotification(`Sample auto-sliced into ${numSlicesToCreate} parts.`, 2000);
}
