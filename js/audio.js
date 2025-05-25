// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading
import * as Constants from './constants.js';
import { showNotification } from './utils.js';
// Track class might be needed if we directly instantiate or do complex manipulations,
// but mostly track instances will be passed.

export async function initAudioContextAndMasterMeter() {
    try {
        if (Tone.context.state !== 'running') {
            await Tone.start();
            console.log("AudioContext started.");
        }
        if (!window.masterMeter && Tone.getDestination()) { // Assuming masterMeter is global for now
            window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
            Tone.getDestination().connect(window.masterMeter);
            console.log("Master meter initialized.");
        }
    } catch (error) {
        console.error("Error initializing audio context or master meter:", error);
        showNotification("Error initializing audio. Please ensure permissions and refresh.", 4000);
        throw error;
    }
}

export function updateMeters(masterMeter, masterMeterBar, mixerMasterMeter, tracks) {
    if (masterMeter && masterMeterBar) {
        const level = Tone.dbToGain(masterMeter.getValue());
        masterMeterBar.style.width = `${Math.min(100, level * 100)}%`;
        masterMeterBar.classList.toggle('clipping', masterMeter.getValue() > -0.1);
    }
    
    if (masterMeter && mixerMasterMeter) { // mixerMasterMeter is passed now
        const level = Tone.dbToGain(masterMeter.getValue());
        mixerMasterMeter.style.width = `${Math.min(100, level * 100)}%`;
        mixerMasterMeter.classList.toggle('clipping', masterMeter.getValue() > -0.1);
    }

    tracks.forEach(track => {
        if (track.trackMeter) {
            const level = Tone.dbToGain(track.trackMeter.getValue());
            // Assuming track.inspectorWindow and window.openWindows are still globally accessible for now
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
    // requestAnimationFrame should be managed by the caller (main.js)
}


export async function fetchSoundLibrary(libraryName, zipUrl) {
    const soundBrowserList = document.getElementById('soundBrowserList');
    const pathDisplay = document.getElementById('soundBrowserPathDisplay');
    if (!soundBrowserList || !pathDisplay) {
        console.warn("Sound browser DOM elements not found for fetchSoundLibrary.");
        return;
    }

    soundBrowserList.innerHTML = `<div class="sound-browser-loading">Fetching ${libraryName} sounds...</div>`;
    pathDisplay.textContent = `Path: / (${libraryName} - Loading...)`;
    window.currentLibraryName = libraryName; // Global for now

    try {
        const response = await fetch(zipUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status} fetching ${zipUrl}`);
        const zipData = await response.arrayBuffer();
        const jszip = new JSZip();
        window.loadedZipFiles[libraryName] = await jszip.loadAsync(zipData); // Global for now
        
        window.currentSoundFileTree = {}; // Global for now
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
        window.currentSoundBrowserPath = []; // Global for now
        // renderSoundBrowserDirectory is a UI function, should be called from ui.js or passed as callback
        // For now, assuming it's globally available or will be imported by main.js and made available
        if (typeof window.renderSoundBrowserDirectory === 'function') {
            window.renderSoundBrowserDirectory(window.currentSoundBrowserPath, window.currentSoundFileTree);
        } else {
            console.warn("renderSoundBrowserDirectory function not found. UI for sound browser won't update.");
        }

    } catch (error) {
        console.error(`Error fetching or processing ${libraryName} ZIP:`, error);
        showNotification(`Error with ${libraryName} library: ${error.message}`, 4000);
        if (soundBrowserList) soundBrowserList.innerHTML = `<div class="sound-browser-loading">Error fetching ${libraryName}. Check console.</div>`;
        if (pathDisplay) pathDisplay.textContent = `Path: / (Error - ${libraryName})`;
    }
}

// This function is more UI related and should ideally live in ui.js or soundBrowserUI.js
// Kept here temporarily as it's called by fetchSoundLibrary.
export function renderSoundBrowserDirectory(pathArray, treeNode) {
    const soundBrowserList = document.getElementById('soundBrowserList');
    const pathDisplay = document.getElementById('soundBrowserPathDisplay');
    if (!soundBrowserList || !pathDisplay || !treeNode) return;

    soundBrowserList.innerHTML = '';
    pathDisplay.textContent = `Path: /${pathArray.join('/')} (${window.currentLibraryName || 'No Library Selected'})`;

    if (pathArray.length > 0) {
        const backButton = document.createElement('div');
        backButton.className = 'sound-browser-item font-semibold';
        backButton.textContent = 'ç­®ï½¸.. (Up)';
        backButton.onclick = () => {
            window.currentSoundBrowserPath.pop();
            let newTreeNode = window.currentSoundFileTree;
            for (const segment of window.currentSoundBrowserPath) {
                newTreeNode = newTreeNode[segment]?.children;
                if (!newTreeNode) {
                    window.currentSoundBrowserPath = []; newTreeNode = window.currentSoundFileTree; break;
                }
            }
            renderSoundBrowserDirectory(window.currentSoundBrowserPath, newTreeNode); // Recursive call
        };
        soundBrowserList.appendChild(backButton);
    }

    const sortedEntries = Object.entries(treeNode).sort(([nameA, itemA], [nameB, itemB]) => {
        if (itemA.type === 'folder' && itemB.type === 'file') return -1;
        if (itemA.type === 'file' && itemB.type === 'folder') return 1;
        return nameA.localeCompare(nameB);
    });

    sortedEntries.forEach(([name, item]) => {
        const div = document.createElement('div');
        div.className = 'sound-browser-item';
        if (item.type === 'folder') {
            div.textContent = `î žåˆ€ ${name}`;
            div.onclick = () => {
                window.currentSoundBrowserPath.push(name);
                renderSoundBrowserDirectory(window.currentSoundBrowserPath, item.children); // Recursive call
            };
        } else if (item.type === 'file') {
            div.textContent = `î žä¸ƒ ${name}`;
            div.title = `Click to play. Drag to load: ${name}`;
            div.draggable = true;
            div.addEventListener('dragstart', (event) => {
                const soundData = { fullPath: item.fullPath, libraryName: window.currentLibraryName, fileName: name };
                event.dataTransfer.setData("application/json", JSON.stringify(soundData));
                event.dataTransfer.effectAllowed = "copy";
                div.style.opacity = '0.5';
            });
            div.addEventListener('dragend', () => { div.style.opacity = '1'; });
            div.addEventListener('click', async (event) => {
                if (event.detail === 0) return;
                await initAudioContextAndMasterMeter();
                if (window.previewPlayer && !window.previewPlayer.disposed) {
                    window.previewPlayer.stop(); window.previewPlayer.dispose();
                }
                try {
                    if (!window.loadedZipFiles[window.currentLibraryName]) throw new Error("Current ZIP library not loaded.");
                    const zipEntry = window.loadedZipFiles[window.currentLibraryName].file(item.fullPath);
                    if (!zipEntry) throw new Error(`File ${item.fullPath} not found.`);
                    const fileBlob = await zipEntry.async("blob");
                    const buffer = await new Tone.Buffer().load(URL.createObjectURL(fileBlob));
                    window.previewPlayer = new Tone.Player(buffer).toDestination();
                    window.previewPlayer.autostart = true;
                    window.previewPlayer.onstop = () => {
                        if (window.previewPlayer && !window.previewPlayer.disposed) window.previewPlayer.dispose();
                        window.previewPlayer = null;
                    };
                } catch (error) {
                    console.error(`Error previewing sound ${name}:`, error);
                    showNotification(`Error previewing ${name}: ${error.message}`, 3000);
                }
            });
        }
        soundBrowserList.appendChild(div);
    });
}


export async function loadSoundFromBrowserToTarget(soundData, targetTrackId, targetTrackType, targetPadOrSliceIndex = null) {
    const { fullPath, libraryName, fileName } = soundData;
    const track = window.tracks.find(t => t.id === parseInt(targetTrackId)); // Assuming window.tracks is global
    if (!track) {
        showNotification(`Target track ID ${targetTrackId} not found.`, 3000);
        return;
    }
    if (track.type !== targetTrackType &&
        !( (targetTrackType === 'Sampler' || targetTrackType === 'InstrumentSampler' || targetTrackType === 'DrumSampler') &&
           (track.type === 'Sampler' || track.type === 'InstrumentSampler' || track.type === 'DrumSampler') )
    ) {
        showNotification(`Cannot load "${fileName}" into a ${track.type} track from a ${targetTrackType} drop zone.`, 3500);
        return;
    }
    showNotification(`Loading "${fileName}" to ${track.name}...`, 2000);
    try {
        if (!window.loadedZipFiles[libraryName]) throw new Error(`Sound library "${libraryName}" not loaded.`);
        const zipEntry = window.loadedZipFiles[libraryName].file(fullPath);
        if (!zipEntry) throw new Error(`File "${fullPath}" not found in "${libraryName}" ZIP.`);

        const fileBlob = await zipEntry.async("blob");
        const blobUrl = URL.createObjectURL(fileBlob); // Create a URL for the blob

        if (track.type === 'DrumSampler') {
            let actualPadIndex = targetPadOrSliceIndex;
            if (actualPadIndex === null) {
                actualPadIndex = track.drumSamplerPads.findIndex(p => !p.audioBufferDataURL);
                if (actualPadIndex === -1) actualPadIndex = track.selectedDrumPadForEdit;
            }
            await loadDrumSamplerPadFile(blobUrl, track.id, actualPadIndex, fileName);
        } else if (track.type === 'Sampler') {
            if (targetPadOrSliceIndex !== null) {
                showNotification("Drag & drop to individual slices reloads the main sample for now.", 3000);
            }
            await loadSampleFile(blobUrl, track.id, 'Sampler', fileName);
        } else if (track.type === 'InstrumentSampler') {
            await loadSampleFile(blobUrl, track.id, 'InstrumentSampler', fileName);
        }
        // It's good practice to revoke the object URL when it's no longer needed,
        // but Tone.Buffer.load might need it for a bit. If Tone.js handles blobs directly, that's better.
        // For now, we'll rely on Tone.js to manage the blob URL it's given.
        // URL.revokeObjectURL(blobUrl); // Consider if this is safe here or needs to be later.
    } catch (error) {
        console.error(`Error loading sound "${fileName}" from browser:`, error);
        showNotification(`Error loading "${fileName}": ${error.message}`, 3000);
    }
}

export async function playSlicePreview(trackId, sliceIndex, velocity = 0.7) {
    await initAudioContextAndMasterMeter();
    const track = window.tracks.find(t => t.id === trackId);
    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded || !track.slices[sliceIndex]) return;
    
    const sliceData = track.slices[sliceIndex];
    if (sliceData.duration <= 0) return;

    const time = Tone.now();
    const totalPitchShift = sliceData.pitchShift;
    const playbackRate = Math.pow(2, totalPitchShift / 12);
    let playDuration = sliceData.duration / playbackRate;
    if (sliceData.loop) playDuration = Math.min(playDuration, 2); // Limit loop preview

    if (!track.slicerIsPolyphonic) {
        if (!track.slicerMonoPlayer || track.slicerMonoPlayer.disposed) {
            track.setupSlicerMonoNodes();
            if(!track.slicerMonoPlayer) { console.warn("Mono player not set up for preview"); return; }
        }
        const player = track.slicerMonoPlayer;
        const env = track.slicerMonoEnvelope;
        const gain = track.slicerMonoGain;

        if (player.state === 'started') player.stop(time);
        if (env.getValueAtTime(time) > 0.001) env.triggerRelease(time);

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
            env.triggerRelease(Math.max(time, releaseTime));
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
        if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95);

        Tone.Transport.scheduleOnce(() => {
            if (tempPlayer && !tempPlayer.disposed) { tempPlayer.stop(); tempPlayer.dispose(); }
            if (tempEnv && !tempEnv.disposed) tempEnv.dispose();
            if (tempGain && !tempGain.disposed) tempGain.dispose();
        }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.1);
    }
}

export async function playDrumSamplerPadPreview(trackId, padIndex, velocity = 0.7) {
    await initAudioContextAndMasterMeter();
    const track = window.tracks.find(t => t.id === trackId);
    if (!track || track.type !== 'DrumSampler' || !track.drumPadPlayers[padIndex] || !track.drumPadPlayers[padIndex].loaded) return;
    
    const player = track.drumPadPlayers[padIndex];
    const padData = track.drumSamplerPads[padIndex];

    player.volume.value = Tone.gainToDb(padData.volume * velocity);
    player.playbackRate = Math.pow(2, (padData.pitchShift) / 12);
    player.start(Tone.now());
}

export async function loadSampleFile(eventOrUrl, trackId, trackTypeHint, fileNameForUrl = null) {
    const track = window.tracks.find(t => t.id === trackId);
    if (!track || (trackTypeHint !== 'Sampler' && trackTypeHint !== 'InstrumentSampler')) {
        showNotification("Invalid track or track type for sample loading.", 3000);
        return;
    }

    let file;
    let sourceName;
    let isUrlSource = typeof eventOrUrl === 'string';

    if (isUrlSource) {
        sourceName = fileNameForUrl || eventOrUrl.split('/').pop().split('?')[0]; // Basic name extraction
    } else if (eventOrUrl.target && eventOrUrl.target.files && eventOrUrl.target.files.length > 0) {
        file = eventOrUrl.target.files[0];
        sourceName = file.name;
    } else {
        showNotification("No file or URL provided for sample.", 3000);
        return;
    }

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
            } else { // Local file
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            }
        });

        const newBuffer = await new Tone.Buffer().load(base64DataURL);

        if (trackTypeHint === 'Sampler') {
            track.audioBufferDataURL = base64DataURL;
            track.audioBuffer = newBuffer;
            track.originalFileName = sourceName;
            if (!track.slicerIsPolyphonic && track.audioBuffer?.loaded) {
                track.setupSlicerMonoNodes();
            }
            autoSliceSample(track.id, Constants.numSlices); // Use imported constant
            if (typeof window.drawWaveform === 'function') window.drawWaveform(track); // UI update
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
            track.setupToneSampler();
            if (typeof window.drawInstrumentWaveform === 'function') window.drawInstrumentWaveform(track); // UI update
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
        console.error("Error loading sample:", error);
        showNotification(`Error loading sample: ${error.message}`, 3000);
    }
}

export async function loadDrumSamplerPadFile(eventOrUrl, trackId, padIndex, fileNameForUrl = null) {
    const track = window.tracks.find(t => t.id === trackId);
    if (!track || track.type !== 'DrumSampler') return;

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

        if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
        if (track.drumPadPlayers[padIndex] && !track.drumPadPlayers[padIndex].disposed) track.drumPadPlayers[padIndex].dispose();

        padData.audioBuffer = newAudioBuffer;
        padData.audioBufferDataURL = base64DataURL;
        padData.originalFileName = sourceName;
        track.drumPadPlayers[padIndex] = new Tone.Player(newAudioBuffer).connect(track.distortionNode);

        showNotification(`Sample "${sourceName}" loaded for Pad ${padIndex + 1} on track ${track.name}.`, 2000);
        // These UI updates should ideally be handled by ui.js, called from main.js or after this function resolves.
        if (typeof window.updateDrumPadControlsUI === 'function') window.updateDrumPadControlsUI(track);
        if (typeof window.renderDrumSamplerPads === 'function') window.renderDrumSamplerPads(track);

    } catch (error) {
        console.error(`Error loading sample for drum pad ${padIndex}:`, error);
        showNotification(`Error loading sample "${sourceName}": ${error.message}`, 3000);
    }
}

export function autoSliceSample(trackId, numSlicesToCreate = Constants.numSlices) {
    const track = window.tracks.find(t => t.id === trackId);
    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded) {
        showNotification("Cannot auto-slice: No audio loaded or track not a Sampler.", 3000);
        return;
    }
    const duration = track.audioBuffer.duration;
    track.slices = []; // Clear existing slices
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
    track.setSequenceLength(track.sequenceLength, true); // true to skipUndoCapture

    // UI updates - these should ideally be handled by ui.js
    if (typeof window.renderSamplePads === 'function') window.renderSamplePads(track);
    if (typeof window.updateSliceEditorUI === 'function') window.updateSliceEditorUI(track);
    if (typeof window.drawWaveform === 'function') window.drawWaveform(track);
    
    showNotification(`Sample auto-sliced into ${numSlicesToCreate} parts.`, 2000);
}
