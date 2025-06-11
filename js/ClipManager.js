// js/ClipManager.js
import * as Constants from './constants.js';

export class ClipManager {
    constructor(track, appServices) {
        this.track = track;
        this.appServices = appServices;
        this.timelineClips = [];
    }

    initialize(clips = []) {
        // Ensure clips is an array before assigning/iterating
        if (Array.isArray(clips)) {
            this.timelineClips = clips;
        } else {
            console.warn(`[ClipManager.js] initialize received non-array clips data for track ${this.track.id}:`, clips);
            this.timelineClips = []; // Default to empty array if invalid data
        }
    }

    addClip(clipData) {
        if (!clipData.type || !clipData.id) {
            console.warn("[ClipManager.js] Attempted to add clip without type or ID:", clipData);
            return;
        }
        this.timelineClips.push(clipData);
        this.appServices.renderTimeline?.();
        this.appServices.captureStateForUndo?.(`Add clip ${clipData.name}`);
    }

    addMidiClip(sequence, startTime) {
        if (!sequence) {
            console.warn("[ClipManager.js] Attempted to add MIDI clip with no sequence data.");
            return;
        }
        const beatsPerStep = 1 / (Constants.STEPS_PER_BAR / 4);
        const totalBeats = sequence.length * beatsPerStep;
        const clipDuration = totalBeats * (60 / Tone.Transport.bpm.value);
        const newClip = {
            id: `clip-${this.track.id}-${Date.now()}`,
            type: 'midi',
            name: sequence.name,
            startTime: startTime,
            duration: clipDuration,
            sequenceData: JSON.parse(JSON.stringify(sequence.data))
        };
        this.addClip(newClip);
    }

    async addAudioClip(audioBlob, startTime, clipName) {
        if (this.track.type !== 'Audio') {
            this.appServices.showNotification?.('Cannot add audio clip to a non-audio track.', 3000);
            return;
        }
        try {
            const dbKey = `clip-${this.track.id}-${Date.now()}-${clipName}`;
            await this.appServices.dbStoreAudio(dbKey, audioBlob);
            const audioBuffer = await Tone.context.decodeAudioData(await audioBlob.arrayBuffer());
            const newClip = {
                id: `clip-${this.track.id}-${Date.now()}`,
                type: 'audio',
                name: clipName,
                dbKey,
                startTime,
                duration: audioBuffer.duration,
                audioBuffer,
            };
            this.addClip(newClip);
        } catch (error) {
            console.error("[ClipManager.js] Error adding audio clip:", error);
            this.appServices.showNotification?.('Failed to process and add audio clip.', 3000);
        }
    }
    
    deleteClip(clipId) {
        const index = this.timelineClips.findIndex(c => c.id === clipId);
        if (index > -1) {
            const clipName = this.timelineClips[index].name;
            // Dispose of audio buffer if it's an audio clip to free memory
            if (this.timelineClips[index].type === 'audio' && this.timelineClips[index].audioBuffer) {
                this.timelineClips[index].audioBuffer.dispose();
                // Optionally, also delete from IndexedDB if dbKey exists
                if (this.timelineClips[index].dbKey) {
                    this.appServices.dbDeleteAudio?.(this.timelineClips[index].dbKey);
                }
            }
            this.timelineClips.splice(index, 1);
            this.appServices.renderTimeline?.();
            this.appServices.captureStateForUndo?.(`Delete clip ${clipName}`);
        } else {
            console.warn(`[ClipManager.js] Clip with ID ${clipId} not found for deletion.`);
        }
    }
    
    serialize() {
        // Only serialize properties that are primitives or can be reconstructed
        return this.timelineClips.map(clip => ({
            id: clip.id,
            type: clip.type,
            name: clip.name,
            startTime: clip.startTime,
            duration: clip.duration,
            // For audio clips, store only the dbKey, not the Tone.Buffer object
            dbKey: clip.dbKey || undefined,
            // For MIDI clips, store sequenceData
            sequenceData: clip.sequenceData ? JSON.parse(JSON.stringify(clip.sequenceData)) : undefined
            // Do NOT serialize Tone.Buffer or Tone.Sequence objects directly
        }));
    }
}
