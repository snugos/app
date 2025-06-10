// js/SequenceManager.js

import * as Constants from './constants.js';

export class SequenceManager {
    constructor(track, appServices) {
        this.track = track;
        this.appServices = appServices;
        this.sequences = [];
        this.activeSequenceId = null;
        this._sequenceEventId = null;
    }

    initialize(sequences = [], activeSequenceId = null) {
        this.sequences = sequences; //
        this.activeSequenceId = activeSequenceId || (this.sequences.length > 0 ? this.sequences[0].id : null); //
    }

    addNoteToSequence(sequenceId, pitchIndex, timeStep, noteData = { velocity: 0.75, duration: 1 }) {
        const sequence = this.sequences.find(s => s.id === sequenceId); //
        if (sequence && sequence.data[pitchIndex] !== undefined && timeStep < sequence.length) { //
            sequence.data[pitchIndex][timeStep] = noteData; //
            this.appServices.captureStateForUndo?.(`Add note to ${this.track.name}`); //
            this.recreateToneSequence(); //
        }
    }

    removeNoteFromSequence(sequenceId, pitchIndex, timeStep) {
        const sequence = this.sequences.find(s => s.id === sequenceId); //
        if (sequence?.data[pitchIndex]?.[timeStep]) { //
            sequence.data[pitchIndex][timeStep] = null; //
            this.appServices.captureStateForUndo?.(`Remove note from ${this.track.name}`); //
            this.recreateToneSequence(); //
        }
    }

    removeNotesFromSequence(sequenceId, notesToRemove) {
        const sequence = this.sequences.find(s => s.id === sequenceId); //
        if (!sequence || !notesToRemove?.size) return; //
        notesToRemove.forEach(noteId => { //
            const [pitchIndex, timeStep] = noteId.split('-').map(Number); //
            if (sequence.data[pitchIndex]?.[timeStep]) { //
                sequence.data[pitchIndex][timeStep] = null; //
            }
        });
        this.appServices.captureStateForUndo?.(`Delete ${notesToRemove.size} notes from ${this.track.name}`); //
        this.recreateToneSequence(); //
    }
    
    // ... move all other sequence-related methods from Track.js here ...
    // e.g., setSequenceLength, moveSelectedNotes, setNoteDuration, updateNoteVelocity,
    // getActiveSequence, createNewSequence, clearSequence, duplicateSequence,
    // copyNotesToClipboard, pasteNotesFromClipboard

    recreateToneSequence() {
        this.stopSequence(); //
        
        const activeSequence = this.getActiveSequence(); //
        if (!activeSequence) return; //

        const callback = (time) => { //
            const ticks = Tone.Transport.getTicksAtTime(time); //
            const ticksPerStep = Tone.Transport.PPQ / 4; //
            const currentStep = Math.floor(ticks / ticksPerStep); //
            
            const loopStep = currentStep % activeSequence.length; //

            for (let pitchIndex = 0; pitchIndex < activeSequence.data.length; pitchIndex++) { //
                const note = activeSequence.data[pitchIndex][loopStep]; //
                if (note) { //
                    const notePitch = Constants.SYNTH_PITCHES[pitchIndex]; //
                    const noteDuration = `${note.duration || 1}*16n`; //
                    const noteVelocity = note.velocity || 0.75; //
                    
                    if (this.track.instrument) { //
                        this.track.instrument.triggerAttackRelease(notePitch, noteDuration, time, noteVelocity); //
                    }
                }
            }
        };
        
        this._sequenceEventId = Tone.Transport.scheduleRepeat(callback, '16n'); //
    }

    startSequence() {
        this.recreateToneSequence(); //
    }

    stopSequence() {
        if (this._sequenceEventId) { //
            Tone.Transport.clear(this._sequenceEventId); //
            this._sequenceEventId = null; //
        }
    }

    dispose() {
        this.stopSequence(); //
    }

    serialize() {
        return {
            sequences: this.sequences, //
            activeSequenceId: this.activeSequenceId //
        };
    }
}
