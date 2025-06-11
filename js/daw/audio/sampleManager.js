// js/daw/audio/sampleManager.js

import { storeAudio, getAudio } from '../../db.js'; // Path updated
import * as Constants from '../../constants.js'; // Path updated
import {
    getIsReconstructingDAW as getIsReconstructingDAWGlobal,
    getLoadedZipFiles as getLoadedZipFilesGlobal,
    setLoadedZipFiles as setLoadedZipFilesGlobal,
    setSoundLibraryFileTrees as setSoundLibraryFileTreesGlobal,
    getSoundLibraryFileTrees as getSoundLibraryFileTreesGlobal
} from '../state/state.js'; // Path updated


let localAppServices = {};

export function initializeSampleManager(appServices) {
    localAppServices = appServices;
}

function getMimeTypeFromFilename(filename) {
    if (!filename || typeof filename !== 'string') return "application/octet-stream";
    const lowerFilename = filename.toLowerCase();
    if (lowerFilename.endsWith(".wav")) return "audio/wav";
    if (lowerFilename.endsWith(".mp3")) return "audio/mpeg";
    if (lowerFilename.endsWith(".ogg")) return "audio/ogg";
    if (lowerFilename.endsWith(".flac")) return "audio/flac";
    if (lowerFilename.endsWith(".aac")) return "audio/aac";
    if (lowerFilename.endsWith(".m4a")) return "audio/mp4";
    return "application/octet-stream";
}

async function commonLoadSampleLogic(fileObject, sourceName, track, trackTypeHint, padIndex = null) {
    const isReconstructing = getIsReconstructingDAWGlobal?.(); // Use global state
    if (!isReconstructing) {
        const targetName = trackTypeHint === 'DrumSampler' && padIndex !== null ? `Pad ${padIndex + 1} on ${track.name}` : track.name;
        localAppServices.captureStateForUndo?.(`Load ${sourceName} to ${targetName}`);
    }

    let objectURLForTone = null;
    try {
        objectURLForTone = URL.createObjectURL(fileObject);
        const dbKey = `track-${track.id}-${trackTypeHint}-${padIndex ?? ''}-${sourceName}-${fileObject.size}-${fileObject.lastModified}`;
        await storeAudio(dbKey, fileObject);
        
        const newAudioBuffer = await new Tone.Buffer().load(objectURLForTone);

        if (track.instrument && typeof track.instrument.add === 'function') {
            if (trackTypeHint === 'Sampler') {
                track.audioBuffer?.dispose();
                track.audioBuffer = newAudioBuffer;
                track.samplerAudioData = { fileName: sourceName, dbKey: dbKey, status: 'loaded' };
                
                autoSliceSample(track.id, Constants.numSlices);
                track.slices.forEach((slice, index) => {
                    const midiNote = Constants.SAMPLER_PIANO_ROLL_START_NOTE + index;
                    const noteName = Tone.Midi(midiNote).toNote();
                    const sliceBuffer = new Tone.Buffer().fromArray(track.audioBuffer.getChannelData(0).slice(
                        slice.offset * track.audioBuffer.sampleRate,
                        (slice.offset + slice.duration) * track.audioBuffer.sampleRate
                    ));
                    track.instrument.add(noteName, sliceBuffer);
                });
                localAppServices.updateTrackUI?.(track.id, 'samplerLoaded');

            } else if (trackTypeHint === 'DrumSampler' && padIndex !== null) {
                const padData = track.drumSamplerPads[padIndex];
                if (padData) {
                    padData.audioBuffer?.dispose();
                    padData.audioBuffer = newAudioBuffer;
                    padData.originalFileName = sourceName;
                    padData.dbKey = dbKey;
                    padData.status = 'loaded';
                    
                    const midiNote = Constants.DRUM_MIDI_START_NOTE + padIndex;
                    const noteName = Tone.Midi(midiNote).toNote();
                    track.instrument.add(noteName, newAudioBuffer);
                    localAppServices.updateTrackUI?.(track.id, 'drumPadLoaded', padIndex);
                }
            } else if (trackTypeHint === 'InstrumentSampler') {
                track.instrumentSamplerSettings.audioBuffer?.dispose();
                track.instrumentSamplerSettings.audioBuffer = newAudioBuffer;
                track.instrumentSamplerSettings.originalFileName = sourceName;
                track.instrumentSamplerSettings.dbKey = dbKey;
                track.instrumentSamplerSettings.status = 'loaded';
                
                const rootNote = track.instrumentSamplerSettings.rootNote || 'C4';
                track.instrument.add(rootNote, newAudioBuffer);

                localAppServices.updateTrackUI?.(track.id, 'instrumentSamplerLoaded');
            }
        }
        
    } catch (error) {
        console.error(`Error loading sample "${sourceName}":`, error);
        localAppServices.showNotification?.(`Error loading sample: ${error.message}`, 4000);
    } finally {
        if (objectURLForTone) URL.revokeObjectURL(objectURLForTone);
    }
}

export async function loadSampleFile(event, trackId, trackTypeHint) {
    const file = event.target.files[0];
    if (!file) return;
    const track = localAppServices.getTrackById?.(trackId);
    if (!track) return;
    await commonLoadSampleLogic(file, file.name, track, trackTypeHint);
}

export async function loadDrumSamplerPadFile(event, trackId, padIndex) {
    const file = event.target.files[0];
    if (!file) return;
    const track = localAppServices.getTrackById?.(trackId);
    if (!track) return;
    await commonLoadSampleLogic(file, file.name, track, 'DrumSampler', padIndex);
}

export async function loadSoundFromBrowserToTarget(soundData, targetTrackId, targetType, targetIndex) {
    const track = localAppServices.getTrackById?.(targetTrackId);
    if (!track) return;

    try {
        const fileBlob = await localAppServices.getAudioBlobFromSoundBrowserItem(soundData); // Use localAppServices
        if (!fileBlob) throw new Error("Could not retrieve sample from library.");

        const finalMimeType = getMimeTypeFromFilename(soundData.fileName);
        const blobToLoad = new File([fileBlob], soundData.fileName, { type: finalMimeType });
        await commonLoadSampleLogic(blobToLoad, soundData.fileName, track, track.type, targetIndex);
    } catch (error) {
        console.error("Error loading from sound browser:", error);
        localAppServices.showNotification?.(`Error loading ${soundData.fileName}: ${error.message}`, 4000);
        localAppServices.updateTrackUI?.(track.id, 'sampleLoadError', targetIndex);
    }
}

export async function getAudioBlobFromSoundBrowserItem(soundData) {
    if (!soundData || !soundData.libraryName || !soundData.fullPath) {
        console.error("[getAudioBlobFromSoundBrowserItem] Invalid soundData provided.", soundData);
        return null;
    }

    try {
        if (soundData.libraryName === 'Imports') {
            return await localAppServices.dbGetAudio(soundData.fullPath);
        } else {
            const loadedZips = getLoadedZipFilesGlobal?.(); // Use global state
            const zipInstance = loadedZips?.[soundData.libraryName]?.zip;
            if (!zipInstance) {
                throw new Error(`Library "${soundData.libraryName}" is not loaded.`);
            }
            
            const zipEntry = zipInstance.file(soundData.fullPath);
            if (!zipEntry) {
                throw new Error(`File "${soundData.fullPath}" not found in library.`);
            }

            return await zipEntry.async("blob");
        }
    } catch (error) {
        console.error(`[getAudioBlob] Error getting blob for ${soundData.fileName}:`, error);
        localAppServices.showNotification?.(`Error loading data for ${soundData.fileName}.`, 3000);
        return null;
    }
}

export async function fetchSoundLibrary(libraryName, zipUrl) {
    // Check if the library is already loaded or actively loading to prevent redundant fetches
    const loadedZips = getLoadedZipFilesGlobal?.(); // Use global state
    if (loadedZips[libraryName]?.status === 'loaded' || loadedZips[libraryName]?.status === 'loading') {
        console.log(`[sampleManager.js] Library "${libraryName}" already loaded or loading.`);
        return; 
    }

    try {
        // Set the status to 'loading'
        setLoadedZipFilesGlobal?.(libraryName, null, "loading"); // Use global state
        console.log(`[sampleManager.js] Attempting to fetch library: "${zipUrl}"`);

        const response = await fetch(zipUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} for ${zipUrl}`);
        }
        const zipData = await response.arrayBuffer();
        
        console.log(`[sampleManager.js] Downloaded zip data for "${libraryName}". Loading with JSZip...`);
        const jszip = new JSZip();
        const loadedZipInstance = await jszip.loadAsync(zipData);
        
        // Set the status to 'loaded' and store the JSZip instance
        setLoadedZipFilesGlobal?.(libraryName, loadedZipInstance, 'loaded'); // Use global state
        console.log(`[sampleManager.js] Library "${libraryName}" loaded successfully.`);

        const fileTree = {};
        let filesCount = 0; // Debugging: count files processed
        loadedZipInstance.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir) return; // Skip directories
            // Filter for common audio file extensions
            if (!relativePath.match(/\.(wav|mp3|ogg|flac|aac|m4a)$/i)) return; 

            filesCount++; // Debugging: increment count

            let currentLevel = fileTree;
            const pathParts = relativePath.split('/');
            pathParts.forEach((part, index, arr) => {
                if (index === arr.length - 1) {
                    // This is the file itself
                    currentLevel[part] = { type: 'file', fullPath: relativePath, fileName: part };
                } else {
                    // This is a folder
                    currentLevel[part] = currentLevel[part] || { type: 'folder', children: {} };
                    currentLevel = currentLevel[part].children;
                }
            });
        });
        setSoundLibraryFileTreesGlobal?.(libraryName, fileTree); // Use global state
        console.log(`[sampleManager.js] File tree for "${libraryName}" constructed. Found ${filesCount} audio files.`);

    } catch (error) {
        console.error(`[sampleManager.js] Error loading library "${libraryName}" from "${zipUrl}":`, error);
        setLoadedZipFilesGlobal?.(libraryName, null, 'error'); // Use global state
        localAppServices.showNotification?.(`Failed to load library "${libraryName}". Check console for details.`, 5000);
    }
}

export function autoSliceSample(trackId, numSlices) {
    const track = localAppServices.getTrackById?.(trackId);
    if (!track || track.type !== 'Sampler' || !track.audioBuffer?.loaded) return;
    const duration = track.audioBuffer.duration;
    if (duration <= 0) return;

    track.slices = [];
    const sliceDuration = duration / numSlices;
    for (let i = 0; i < numSlices; i++) {
        track.slices.push({
            offset: i * sliceDuration,
            duration: sliceDuration,
            volume: 0.7,
            pitchShift: 0,
        });
    }
    track.selectedSliceForEdit = 0;
    localAppServices.updateTrackUI?.(track.id, 'sampleSliced');
}
