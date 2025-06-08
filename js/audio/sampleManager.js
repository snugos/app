// js/audio/sampleManager.js

import { storeAudio } from '../db.js';
import * as Constants from '../constants.js';

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
    const isReconstructing = localAppServices.getIsReconstructingDAW?.();
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

        if (trackTypeHint === 'Sampler') {
            track.audioBuffer?.dispose();
            track.audioBuffer = newAudioBuffer;
            track.samplerAudioData = { fileName: sourceName, dbKey: dbKey, status: 'loaded' };
            if (track.audioBuffer.loaded && (!track.slices || track.slices.every(s => s.duration === 0))) {
                autoSliceSample(track.id, Constants.numSlices);
            }
            localAppServices.updateTrackUI?.(track.id, 'samplerLoaded');
        } else if (trackTypeHint === 'DrumSampler' && padIndex !== null) {
            const padData = track.drumSamplerPads[padIndex];
            if (padData) {
                padData.audioBuffer?.dispose();
                track.drumPadPlayers[padIndex]?.dispose();
                padData.audioBuffer = newAudioBuffer;
                padData.originalFileName = sourceName;
                padData.dbKey = dbKey;
                padData.status = 'loaded';
                track.drumPadPlayers[padIndex] = new Tone.Player(newAudioBuffer);
            }
            localAppServices.updateTrackUI?.(track.id, 'drumPadLoaded', padIndex);
        }
        track.rebuildEffectChain();
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
        const fileBlob = await getAudioBlobFromSoundBrowserItem(soundData);
        if (!fileBlob) throw new Error("Could not retrieve sample from library.");
        const fileObject = new File([fileBlob], soundData.fileName, { type: getMimeTypeFromFilename(soundData.fileName) });
        await commonLoadSampleLogic(fileObject, fileObject.name, track, track.type, targetIndex);
    } catch (error) {
        console.error("Error loading from sound browser:", error);
        localAppServices.showNotification?.(`Error loading ${soundData.fileName}: ${error.message}`, 4000);
    }
}

export async function getAudioBlobFromSoundBrowserItem(soundData) {
    const loadedZips = localAppServices.getLoadedZipFiles?.() || {};
    const { libraryName, fullPath } = soundData;
    if (!loadedZips[libraryName] || loadedZips[libraryName].status !== 'loaded') {
        throw new Error(`Library "${libraryName}" is not ready.`);
    }
    const zipFile = loadedZips[libraryName].zip;
    const zipEntry = zipFile.file(fullPath);
    if (!zipEntry) {
        throw new Error(`File "${fullPath}" not found in library "${libraryName}".`);
    }
    return await zipEntry.async("blob");
}

export async function fetchSoundLibrary(libraryName, zipUrl) {
    const loadedZips = localAppServices.getLoadedZipFiles?.();
    if (loadedZips[libraryName]?.status === 'loaded' || loadedZips[libraryName]?.status === 'loading') return;

    try {
        localAppServices.setLoadedZipFiles?.(libraryName, null, "loading");
        const response = await fetch(zipUrl);
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        const zipData = await response.arrayBuffer();
        const jszip = new JSZip();
        const loadedZipInstance = await jszip.loadAsync(zipData);
        localAppServices.setLoadedZipFiles?.(libraryName, loadedZipInstance, 'loaded');

        const fileTree = {};
        loadedZipInstance.forEach((relativePath, zipEntry) => {
            if (zipEntry.dir || !relativePath.match(/\.(wav|mp3|ogg|flac|aac|m4a)$/i)) return;
            let currentLevel = fileTree;
            relativePath.split('/').forEach((part, index, arr) => {
                if (index === arr.length - 1) {
                    currentLevel[part] = { type: 'file', entry: zipEntry, fullPath: relativePath };
                } else {
                    currentLevel[part] = currentLevel[part] || { type: 'folder', children: {} };
                    currentLevel = currentLevel[part].children;
                }
            });
        });
        localAppServices.setSoundLibraryFileTrees?.(libraryName, fileTree);
    } catch (error) {
        console.error(`Error loading library ${libraryName}:`, error);
        localAppServices.setLoadedZipFiles?.(libraryName, null, 'error');
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
