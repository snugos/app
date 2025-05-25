// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading
import * as Constants from './constants.js';
import { showNotification } from './utils.js';

export async function initAudioContextAndMasterMeter() {
    console.log("[Audio] Attempting to initialize AudioContext and Master Meter...");
    try {
        if (Tone.context.state !== 'running') {
            console.log("[Audio] AudioContext not running. Calling Tone.start()...");
            await Tone.start();
            console.log("[Audio] Tone.start() completed. AudioContext state:", Tone.context.state);
            if (Tone.context.state !== 'running') {
                showNotification("AudioContext could not be started. Please interact with the page (e.g., click a button) and try again.", 5000);
                console.warn("[Audio] AudioContext failed to start even after Tone.start(). User gesture might be required earlier or was missed.");
                // return false; // Indicate failure
            }
        } else {
            console.log("[Audio] AudioContext already running.");
        }

        if (!window.masterMeter && Tone.getDestination()) {
            window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
            Tone.getDestination().connect(window.masterMeter);
            console.log("[Audio] Master meter initialized and connected. Master Volume:", Tone.getDestination().volume.value);
        } else if (window.masterMeter) {
            console.log("[Audio] Master meter already initialized. Master Volume:", Tone.getDestination().volume.value);
        }
        // return true; // Indicate success
    } catch (error) {
        console.error("[Audio] Error initializing audio context or master meter:", error);
        showNotification("Error initializing audio. Please ensure permissions and refresh.", 4000);
        throw error; // Re-throw to indicate failure
    }
}

export function updateMeters(masterMeter, masterMeterBar, mixerMasterMeter, tracks) {
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

    (tracks || []).forEach(track => { // Add guard for tracks
        if (track && track.trackMeter) { // Add guard for track
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
            if (zipEntry.dir) return;
            const pathParts = relativePath.split('/').filter(p => p);
            let currentLevel = window.currentSoundFileTree;
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
        window.currentSoundBrowserPath = [];
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
     // Ensure tracks are accessed via getter if possible, fallback to window.tracks for transition
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : window.tracks;
    const track = tracksArray.find(t => t.id === parseInt(targetTrackId));

    if (!track) {
        showNotification(`Target track ID ${targetTrackId} not found.`, 3000);
        return;
    }
    // Allow loading into compatible types, e.g. any sample into any sampler type
    const isTargetSamplerType = ['Sampler', 'InstrumentSampler', 'DrumSampler'].includes(track.type);
    if (!isTargetSamplerType) {
         showNotification(`Cannot load "${fileName}" into a ${track.type} track. Target must be a sampler type.`, 3500);
        return;
    }

    showNotification(`Loading "${fileName}" to ${track.name}...`, 2000);
    try {
        if (!window.loadedZipFiles[libraryName]) throw new Error(`Sound library "${libraryName}" not loaded.`);
        const zipEntry = window.loadedZipFiles[libraryName].file(fullPath);
        if (!zipEntry) throw new Error(`File "${fullPath}" not found in "${libraryName}" ZIP.`);

        const fileBlob = await zipEntry.async("blob");
        const blobUrl = URL.createObjectURL(fileBlob);

        if (track.type === 'DrumSampler') {
            let actualPadIndex = targetPadOrSliceIndex;
            // If dropping onto the main drop zone of a drum sampler, find first empty or selected pad
            if (targetPadOrSliceIndex === null || targetPadOrSliceIndex === undefined) { 
                actualPadIndex = track.drumSamplerPads.findIndex(p => !p.audioBufferDataURL);
                if (actualPadIndex === -1) actualPadIndex = track.selectedDrumPadForEdit; // Fallback to selected
                 if (actualPadIndex === -1) actualPadIndex = 0; // Fallback to first pad if still none
            }
            await loadDrumSamplerPadFile(blobUrl, track.id, actualPadIndex, fileName);
        } else if (track.type === 'Sampler') {
            await loadSampleFile(blobUrl, track.id, 'Sampler', fileName);
        } else if (track.type === 'InstrumentSampler') {
            await loadSampleFile(blobUrl, track.id, 'InstrumentSampler', fileName);
        }
        // URL.revokeObjectURL(blobUrl); // Tone.Buffer.load should handle this.
    } catch (error) {
        console.error(`[Audio] Error loading sound "${fileName}" from browser:`, error);
        showNotification(`Error loading "${fileName}": ${error.message}`, 3000);
    }
}

export async function playSlicePreview(trackId, sliceIndex, velocity = 0.7) {
    console.log(`[Audio] playSlicePreview called for Track ID: ${trackId}, Slice: ${sliceIndex}, Velocity: ${velocity}`);
    await initAudioContextAndMasterMeter();
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
    console.log(`[Audio] Playing slice ${sliceIndex} for track ${track.id}. Offset: ${sliceData.offset}, Duration: ${sliceData.duration}`);

    const time = Tone.now();
    const totalPitchShift = sliceData.pitchShift;
    const playbackRate = Math.pow(2, totalPitchShift / 12);
    let playDuration = sliceData.duration / playbackRate;
    if (sliceData.loop) playDuration = Math.min(playDuration, 2);

    if (!track.slicerIsPolyphonic) {
        if (!track.slicerMonoPlayer || track.slicerMonoPlayer.disposed) {
            track.setupSlicerMonoNodes();
            if(!track.slicerMonoPlayer) { console.warn("[Audio] Mono player not set up for preview"); return; }
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
        
        console.log(`[Audio] Starting MONO slice player for track ${track.id}, slice ${sliceIndex}.`);
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

        console.log(`[Audio] Starting POLY slice player for track ${track.id}, slice ${sliceIndex}.`);
        tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
        tempEnv.triggerAttack(time);
        if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95);

        Tone.Transport.scheduleOnce(() => {
            if (tempPlayer && !tempPlayer.disposed) { tempPlayer.stop(); tempPlayer.dispose(); }
            if (tempEnv && !tempEnv.disposed) tempEnv.dispose();
            if (tempGain && !tempGain.disposed) tempGain.dispose();
        }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.1);
    }
}

export async function playDrumSamplerPadPreview(trackId, padIndex, velocity = 0.7) {
    console.log(`[Audio] playDrumSamplerPadPreview called for Track ID: ${trackId}, Pad: ${padIndex}, Velocity: ${velocity}`);
    await initAudioContextAndMasterMeter();
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
    console.log(`[Audio] Starting drum pad player for track ${track.id}, pad ${padIndex}. Volume: ${player.volume.value}dB, Rate: ${player.playbackRate}`);
    player.start(Tone.now());
}

export async function loadSampleFile(eventOrUrl, trackId, trackTypeHint, fileNameForUrl = null) {
    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : window.tracks;
    const track = tracksArray.find(t => t.id === trackId);

    if (!track || (trackTypeHint !== 'Sampler' && trackTypeHint !== 'InstrumentSampler')) {
        showNotification("Invalid track or track type for sample loading.", 3000);
        return;
    }
    console.log(`[Audio] loadSampleFile: Track ${trackId} (${track.name}), Type: ${trackTypeHint}`);

    let file;
    let sourceName;
    let isUrlSource = typeof eventOrUrl === 'string';

    if (isUrlSource) {
        sourceName = fileNameForUrl || eventOrUrl.split('/').pop().split('?')[0];
    } else if (eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
        file = eventOrUrl.target.files[0];
        sourceName = file.name;
    } else {
        showNotification("No file or URL provided for sample.", 3000);
        return;
    }
    console.log(`[Audio] Loading sample "${sourceName}" for track ${track.id}`);

    try {
        await initAudioContextAndMasterMeter();

        if (track.audioBuffer && !track.audioBuffer.disposed) track.audioBuffer.dispose();
        if (track.instrumentSamplerSettings?.audioBuffer && !track.instrumentSamplerSettings.audioBuffer.disposed) {
            track.instrumentSamplerSettings.audioBuffer.dispose();
        }
        if (track.toneSampler && !track.toneSampler.disposed) track.toneSampler.dispose();
        if (track.type === 'Sampler') track.disposeSlicerMonoNodes();

        const base64DataURL = await new Promise((resolve, reject) => {
            if (isUrlSource) {
                fetch(eventOrUrl)
                    .then(response => response.blob())
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    })
                    .catch(reject);
            } else {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            }
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
                 if (dropZone) dropZone.innerHTML = `Loaded: ${sourceName}.<br>Drag/Click to replace.`;
            }
        } else if (trackTypeHint === 'InstrumentSampler') {
            track.instrumentSamplerSettings.audioBufferDataURL = base64DataURL;
            track.instrumentSamplerSettings.audioBuffer = newBuffer;
            track.instrumentSamplerSettings.originalFileName = sourceName;
            track.instrumentSamplerSettings.loopStart = 0;
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
    console.log(`[Audio] loadDrumSamplerPadFile: Track ${trackId}, Pad ${padIndex}`);


    let file = null;
    let sourceName = '';
    let isUrlSource = typeof eventOrUrl === 'string';

    if (isUrlSource) {
        sourceName = fileNameForUrl || eventOrUrl.split('/').pop().split('?')[0];
    } else if (eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
        file = eventOrUrl.target.files[0];
        sourceName = file.name;
    } else {
        showNotification("No file provided for drum pad.", 3000);
        return;
    }
    console.log(`[Audio] Loading sample "${sourceName}" for track ${track.id}, pad ${padIndex}`);

    try {
        await initAudioContextAndMasterMeter();
        const padData = track.drumSamplerPads[padIndex];

        const base64DataURL = await new Promise((resolve, reject) => {
            if (isUrlSource) {
                 fetch(eventOrUrl)
                    .then(response => response.blob())
                    .then(blob => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    })
                    .catch(reject);
            } else {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            }
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
