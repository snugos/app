// js/daw/SequenceManager.js

// NOTE: Constants, Tone, Konva, JSZip are loaded globally via script tags in snaw.html.
// Functions from utils.js, auth.js, db.js, effectsRegistry.js are typically accessed via appServices or are also global.

import * as Constants from '../constants.js'; // Assuming constants.js is now a module or will be. If global, remove this.
import { showNotification } from '../utils.js'; // Corrected path
import { captureStateForUndo, getClipboardData, setClipboardData } from './state/projectState.js'; // Corrected path
import { getWindowById } from './state/windowState.js'; // Corrected path

class SequenceManager { // Removed export
    constructor(track, appServices) {
        this.track = track;
        this.appServices = appServices;
        this.sequences = [];
        this.activeSequenceId = null;
        this._sequenceEventId = null;
    }

    initialize(sequences = [], activeSequenceId = null) {
        this.sequences = sequences;
        this.activeSequenceId = activeSequenceId || (this.sequences.length > 0 ? this.sequences[0].id : null);
    }

    getActiveSequence() {
        if (!this.activeSequenceId && this.sequences.length > 0) this.activeSequenceId = this.sequences[0].id;
        return this.sequences.find(s => s.id === this.activeSequenceId);
    }

    createNewSequence(name, length, skipUndo) {
        if (this.track.type === 'Audio') return null;
        const newSeqId = `seq_${this.track.id}_${Date.now()}`;
        const newSequence = {
            id: newSeqId,
            data: Array(Constants.SYNTH_PITCHES.length).fill(null).map(() => Array(length).fill(null)), // Constants is global
            length
        };
        this.sequences.push(newSequence);
        this.activeSequenceId = newSeqId;
        if (!skipUndo) captureStateForUndo?.(`Create Sequence "${name}" on ${this.track.name}`); // Corrected function name
        return newSequence;
    }

    addNoteToSequence(sequenceId, pitchIndex, timeStep, noteData = { velocity: 0.75, duration: 1 }) {
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (sequence && sequence.data[pitchIndex] !== undefined && timeStep < sequence.length) {
            sequence.data[pitchIndex][timeStep] = noteData;
            captureStateForUndo?.(`Add note to ${this.track.name}`); // Corrected function name
            this.recreateToneSequence();
        }
    }

    removeNoteFromSequence(sequenceId, pitchIndex, timeStep) {
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (sequence?.data[pitchIndex]?.[timeStep]) {
            sequence.data[pitchIndex][timeStep] = null;
            captureStateForUndo?.(`Remove note from ${this.track.name}`); // Corrected function name
            this.recreateToneSequence();
        }
    }

    removeNotesFromSequence(sequenceId, notesToRemove) {
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (!sequence || !notesToRemove?.size) return;
        notesToRemove.forEach(noteId => {
            const [pitchIndex, timeStep] = noteId.split('-').map(Number);
            if (sequence.data[pitchIndex]?.[timeStep]) {
                sequence.data[pitchIndex][timeStep] = null;
            }
        });
        captureStateForUndo?.(`Delete ${notesToRemove.size} notes from ${this.track.name}`); // Corrected function name
        this.recreateToneSequence();
    }

    setSequenceLength(sequenceId, newLength) {
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (!sequence) return;
        const validatedLength = Math.max(1, Math.floor(newLength));
        const oldLength = sequence.length;
        sequence.length = validatedLength;
        sequence.data.forEach(pitchRow => {
            pitchRow.length = validatedLength;
            if (validatedLength > oldLength) {
                pitchRow.fill(null, oldLength);
            }
        });
        this.recreateToneSequence();
    }
    
    // Additional methods that were in Track.js
    moveSelectedNotes(sequenceId, selectedNotes, pitchOffset = 0, timeOffset = 0) {
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (!sequence || !selectedNotes?.size) return null;
        const notesToMove = [];
        const newPositions = [];
        const newSelectedNoteIds = new Set();
        for (const noteId of selectedNotes) {
            const [pitchIndex, timeStep] = noteId.split('-').map(Number);
            const newPitchIndex = pitchIndex + pitchOffset;
            const newTimeStep = timeStep + timeOffset;
            if (newPitchIndex < 0 || newPitchIndex >= sequence.data.length || newTimeStep < 0 || newTimeStep >= sequence.length) {
                showNotification?.('Cannot move notes outside the sequence bounds.', 2000); // Corrected function name
                return null;
            }
            notesToMove.push({ oldPitch: pitchIndex, oldTime: timeStep, data: sequence.data[pitchIndex][timeStep] });
            newPositions.push({ newPitch: newPitchIndex, newTime: newTimeStep, data: sequence.data[pitchIndex][timeStep] });
        }
        notesToMove.forEach(note => {
            sequence.data[note.oldPitch][note.oldTime] = null;
        });
        newPositions.forEach(note => {
            sequence.data[note.newPitch][note.newTime] = note.data;
            newSelectedNoteIds.add(`${note.newPitch}-${note.newTime}`);
        });
        captureStateForUndo?.('Move notes'); // Corrected function name
        this.recreateToneSequence();
        return newSelectedNoteIds;
    }

    setNoteDuration(sequenceId, pitchIndex, timeStep, newDuration) {
        const sequence = this.sequences.find(s => s.id === sequenceId);
        const note = sequence?.data?.[pitchIndex]?.[timeStep];
        if (note) {
            note.duration = Math.max(1, Math.floor(newDuration));
        }
    }

    updateNoteVelocity(sequenceId, pitchIndex, timeStep, newVelocity) {
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (sequence?.data[pitchIndex]?.[timeStep]) {
            sequence.data[pitchIndex][timeStep].velocity = Math.max(0.01, Math.min(1, newVelocity));
        }
    }

    clearSequence(sequenceId) {
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (!sequence) return;
        sequence.data = Array(Constants.SYNTH_PITCHES.length).fill(null).map(() => Array(sequence.length).fill(null)); // Constants is global
        this.recreateToneSequence();
        captureStateForUndo?.(`Clear sequence on ${this.track.name}`); // Corrected function name
    }

    duplicateSequence(sequenceId) {
        const originalSequence = this.sequences.find(s => s.id === sequenceId);
        if (!originalSequence) return;
        const newName = `${originalSequence.name} (copy)`;
        const newSequence = this.createNewSequence(newName, originalSequence.length, true);
        newSequence.data = JSON.parse(JSON.stringify(originalSequence.data));
        this.recreateToneSequence();
        captureStateForUndo?.(`Duplicate sequence on ${this.track.name}`); // Corrected function name
        return newSequence;
    }
    
    copyNotesToClipboard(sequenceId, notesToCopy) {
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (!sequence || !notesToCopy?.size) return;

        let minPitchIndex = Infinity, minTimeStep = Infinity;
        const noteDataObjects = [];

        notesToCopy.forEach(noteId => {
            const [pitchIndex, timeStep] = noteId.split('-').map(Number);
            minPitchIndex = Math.min(minPitchIndex, pitchIndex);
            minTimeStep = Math.min(minTimeStep, timeStep);
            noteDataObjects.push({ pitchIndex, timeStep, data: sequence.data[pitchIndex][timeStep] });
        });

        const relativeNotes = noteDataObjects.map(n => ({
            pitchOffset: n.pitchIndex - minPitchIndex,
            timeOffset: n.timeStep - minTimeStep,
            noteData: n.data
        }));

        setClipboardData?.({ type: 'piano-roll-notes', notes: relativeNotes }); // Corrected function name
        showNotification?.(`${relativeNotes.length} note(s) copied.`); // Corrected function name
    }

    pasteNotesFromClipboard(sequenceId, pastePitchIndex, pasteTimeStep) {
        const clipboard = getClipboardData?.(); // Corrected function name
        if (clipboard?.type !== 'piano-roll-notes' || !clipboard.notes?.length) return;

        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (!sequence) return;

        clipboard.notes.forEach(noteToPaste => {
            const newPitchIndex = pastePitchIndex + noteToPaste.pitchOffset;
            const newTimeStep = pasteTimeStep + noteToPaste.timeOffset;

            if (newPitchIndex >= 0 && newPitchIndex < sequence.data.length && newTimeStep >= 0 && newTimeStep < sequence.length) {
                sequence.data[newPitchIndex][newTimeStep] = JSON.parse(JSON.stringify(noteToPaste.noteData));
            }
        });

        this.recreateToneSequence();
        captureStateForUndo?.(`Paste ${clipboard.notes.length} notes`); // Corrected function name
    }

    recreateToneSequence() {
        this.stopSequence();
        const activeSequence = this.getActiveSequence();
        if (!activeSequence) return;
        const callback = (time) => {
            const ticks = Tone.Transport.getTicksAtTime(time);
            const ticksPerStep = Tone.Transport.PPQ / 4;
            const currentStep = Math.floor(ticks / ticksPerStep);
            const loopStep = currentStep % activeSequence.length;
            for (let pitchIndex = 0; pitchIndex < activeSequence.data.length; pitchIndex++) {
                const note = activeSequence.data[pitchIndex][loopStep];
                if (note) {
                    const notePitch = Constants.SYNTH_PITCHES[pitchIndex]; // Constants is global
                    const noteDuration = `${note.duration || 1}*16n`;
                    const noteVelocity = note.velocity || 0.75;
                    if (this.track.instrument) {
                        this.track.instrument.triggerAttackRelease(notePitch, noteDuration, time, noteVelocity);
                    }
                }
            }
        };
        this._sequenceEventId = Tone.Transport.scheduleRepeat(callback, '16n');
    }

    startSequence() {
        this.recreateToneSequence();
    }

    stopSequence() {
        if (this._sequenceEventId) {
            Tone.Transport.clear(this._sequenceEventId);
            this._sequenceEventId = -1;
        }
    }

    dispose() {
        this.stopSequence();
    }

    serialize() {
        return {
            sequences: this.sequences,
            activeSequenceId: this.activeSequenceId
        };
    }
}
