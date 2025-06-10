// js/ClipManager.js
import * as Constants from './constants.js';

export class ClipManager {
    constructor(track, appServices) {
        this.track = track; //
        this.appServices = appServices; //
        this.timelineClips = []; //
    }

    initialize(clips = []) {
        this.timelineClips = clips; //
    }

    addClip(clipData) {
        if (!clipData.type || !clipData.id) return; //
        this.timelineClips.push(clipData); //
        this.appServices.renderTimeline?.(); //
        this.appServices.captureStateForUndo?.(`Add clip ${clipData.name}`); //
    }

    addMidiClip(sequence, startTime) {
        if (!sequence) return; //
        const beatsPerStep = 1 / (Constants.STEPS_PER_BAR / 4); //
        const totalBeats = sequence.length * beatsPerStep; //
        const clipDuration = totalBeats * (60 / Tone.Transport.bpm.value); //
        const newClip = { //
            id: `clip-${this.track.id}-${Date.now()}`,
            type: 'midi',
            name: sequence.name,
            startTime: startTime,
            duration: clipDuration,
            sequenceData: JSON.parse(JSON.stringify(sequence.data))
        };
        this.addClip(newClip); //
    }

    async addAudioClip(audioBlob, startTime, clipName) {
        if (this.track.type !== 'Audio') return; //
        try { //
            const dbKey = `clip-${this.track.id}-${Date.now()}-${clipName}`; //
            await this.appServices.dbStoreAudio(dbKey, audioBlob); //
            const audioBuffer = await Tone.context.decodeAudioData(await audioBlob.arrayBuffer()); //
            const newClip = { //
                id: `clip-${this.track.id}-${Date.now()}`,
                type: 'audio',
                name: clipName,
                dbKey,
                startTime,
                duration: audioBuffer.duration,
                audioBuffer,
            };
            this.addClip(newClip); //
        } catch (error) {
            console.error("Error adding audio clip:", error); //
            this.appServices.showNotification?.('Failed to process and add audio clip.', 3000); //
        }
    }
    
    deleteClip(clipId) {
        const index = this.timelineClips.findIndex(c => c.id === clipId); //
        if (index > -1) { //
            const clipName = this.timelineClips[index].name; //
            this.timelineClips.splice(index, 1); //
            this.appServices.renderTimeline?.(); //
            this.appServices.captureStateForUndo?.(`Delete clip ${clipName}`); //
        }
    }
    
    serialize() {
        return this.timelineClips; //
    }
}
