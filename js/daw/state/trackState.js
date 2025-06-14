// js/daw/state/trackState.js

// Corrected import path for Track.js
import { Track } from '../Track.js'; // Corrected path

let tracks = [];
let trackIdCounter = 0;
let soloedTrackId = null;
let armedTrackId = null;
let isRecordingGlobal = false;
let recordingTrackIdGlobal = null;
let recordingStartTimeGlobal = 0;

let localAppServices = {};

export function initializeTrackState(appServices) {
    localAppServices = appServices;
}

export function getTracks() { return tracks; }

export function getTrackById(id) { return tracks.find(t => t.id === id); }

export function getSoloedTrackId() { return soloedTrackId; }

export function setSoloedTrackId(id) { soloedTrackId = id; }

export function getArmedTrackId() { return armedTrackId; }

export function setArmedTrackId(id) { armedTrackId = id; }

export function isRecording() { return isRecordingGlobal; }

export function setIsRecording(isRecording) { isRecordingGlobal = isRecording; }

export function getRecordingTrackId() { return recordingTrackIdGlobal; }

export function setRecordingTrackId(id) { recordingTrackIdGlobal = id; }

export function getRecordingStartTime() { return recordingStartTimeGlobal; }

export function setRecordingStartTime(time) { recordingStartTimeGlobal = time; }

export async function addTrack(type) {
    const newTrackId = trackIdCounter++;
    const track = new Track(newTrackId, type, null, localAppServices);
    tracks.push(track);
    await track.initializeInstrument();
    
    localAppServices.updateMixerWindow?.();
    localAppServices.renderTimeline?.();
    localAppServices.captureStateForUndo?.(`Add ${type} Track`);
    return track;
}

export function removeTrack(trackId) {
    const index = tracks.findIndex(t => t.id === trackId);
    if (index > -1) {
        const trackName = tracks[index].name;
        localAppServices.captureStateForUndo?.(`Remove Track: ${trackName}`);
        tracks[index].dispose();
        tracks.splice(index, 1);
        localAppServices.updateMixerWindow?.();
        localAppServices.renderTimeline?.();
    }
}

export function setTracks(newTracks) {
    tracks = newTracks;
}

export function setTrackIdCounter(count) {
    trackIdCounter = count;
}
