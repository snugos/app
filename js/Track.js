// js/Track.js - Track Class Module

import * as Constants from './constants.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry, AVAILABLE_EFFECTS } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';

export class Track {
    constructor(id, type, initialData = null, appServices = {}) {
        this.id = initialData?.id || id;
        this.type = type;
        this.appServices = appServices || {}; 

        this.name = initialData?.name || `${type} Track ${this.id}`;
        if (type === 'DrumSampler') {
            this.name = initialData?.name || `Sampler (Pads) ${this.id}`;
        } else if (type === 'Synth') {
            this.name = initialData?.name || `MonoSynth ${this.id}`;
        } else if (type === 'Audio') {
            this.name = initialData?.name || `Audio ${this.id}`;
        }

        this.isMuted = initialData?.isMuted || false;
        this.isSoloed = false;
        this.isMonitoringEnabled = initialData?.isMonitoringEnabled !== undefined ? initialData.isMonitoringEnabled : (this.type === 'Audio');
        this.previousVolumeBeforeMute = initialData?.volume ?? 0.7;
        
        this.input = new Tone.Gain();
        this.outputNode = new Tone.Gain(this.previousVolumeBeforeMute);
        this.trackMeter = new Tone.Meter();
        this.outputNode.connect(this.trackMeter);
        
        this.instrument = null;
        this.activeEffects = [];
        if (initialData?.activeEffects && initialData.activeEffects.length > 0) {
            initialData.activeEffects.forEach(effectData => this.addEffect(effectData.type, effectData.params, true));
        } else if (this.type !== 'Audio') {
            this.addEffect('EQ3', null, true);
        }
        
        this.toneSequence = null;
        this.synthEngineType = null;
        this.synthParams = {};
        this.sequences = initialData?.sequences || [];
        this.activeSequenceId = initialData?.activeSequenceId || null;
        this.inspectorControls = {};
        this.timelineClips = initialData?.timelineClips || [];

        this.samplerAudioData = {};
        this.audioBuffer = null;
        this.slices = [];
        this.selectedSliceForEdit = 0;
        this.drumSamplerPads = [];
        this.drumPadPlayers = [];
        this.selectedDrumPadForEdit = 0;
        this.instrumentSamplerSettings = {};
        this.toneSampler = null;
        this.inputChannel = (this.type === 'Audio') ? new Tone.Gain().connect(this.input) : null;

        if (this.type === 'Synth') {
            this.synthEngineType = initialData?.synthEngineType || 'MonoSynth';
            this.synthParams = initialData?.synthParams ? JSON.parse(JSON.stringify(initialData.synthParams)) : this.getDefaultSynthParams();
        } else if (this.type === 'Sampler') {
            this.samplerAudioData = { fileName: initialData?.samplerAudioData?.fileName || null, dbKey: initialData?.samplerAudioData?.dbKey || null, status: 'empty' };
            this.slices = initialData?.slices || Array(Constants.numSlices || 16).fill(null).map(() => ({ offset: 0, duration: 0, volume: 0.7, pitchShift: 0, loop: false, reverse: false, envelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 0.2 } }));
            this.selectedSliceForEdit = initialData?.selectedSliceForEdit || 0;
        } else if (this.type === 'DrumSampler') {
            this.drumSamplerPads = Array(Constants.numDrumSamplerPads || 16).fill(null).map((_, i) => initialData?.drumSamplerPads?.[i] || { originalFileName: null, dbKey: null, volume: 0.7, pitchShift: 0 });
            this.drumPadPlayers = Array(Constants.numDrumSamplerPads || 16).fill(null);
            this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
        } else if (this.type === 'InstrumentSampler') {
            this.instrumentSamplerSettings = initialData?.instrumentSamplerSettings || { 
                originalFileName: null, 
                dbKey: null, 
                rootNote: 'C4', 
                pitchShift: 0, 
                loop: false, 
                loopStart: 0, 
                loopEnd: 0, 
                envelope: { attack: 0.003, decay: 2.0, sustain: 1.0, release: 5.0 }, 
                status: 'empty' 
            };
        }

        if (this.type !== 'Audio' && this.sequences.length === 0) {
            this.createNewSequence("Sequence 1", 64, true);
        }
    }

    async initializeInstrument() {
        if (this.instrument) this.instrument.dispose();
        if (this.type === 'Synth') {
            this.instrument = new Tone.PolySynth(Tone.Synth);
        } else if (this.type === 'InstrumentSampler') {
            const buffer = this.instrumentSamplerSettings.audioBuffer;
            const urls = {};
            if (buffer && buffer.loaded) {
                const rootNote = this.instrumentSamplerSettings.rootNote || 'C4';
                urls[rootNote] = buffer;
            }
            this.instrument = new Tone.Sampler({ 
                urls,
                attack: this.instrumentSamplerSettings.envelope.attack,
                decay: this.instrumentSamplerSettings.envelope.decay,
                sustain: this.instrumentSamplerSettings.envelope.sustain,
                release: this.instrumentSamplerSettings.envelope.release,
                detune: (this.instrumentSamplerSettings.pitchShift || 0) * 100
            }).connect(this.input);
        } else {
            this.instrument = null;
        }
        this.rebuildEffectChain();
        this.recreateToneSequence();
    }
    
    rebuildEffectChain() {
        this.input.disconnect();
        this.instrument?.disconnect();
        if (this.instrument) this.instrument.connect(this.input);
        let currentNode = this.input;
        this.activeEffects.forEach(effect => {
            if (effect.toneNode) {
                currentNode.connect(effect.toneNode);
                currentNode = effect.toneNode;
            }
        });
        currentNode.connect(this.outputNode);
        const masterBusInput = this.appServices.getMasterBusInputNode?.();
        if (masterBusInput) this.outputNode.connect(masterBusInput);
        else this.outputNode.toDestination();
    }
    
    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = volume;
        if (!this.isMuted) this.outputNode.gain.rampTo(volume, 0.02);
        if (fromInteraction) this.appServices.captureStateForUndo?.(`Set Volume for ${this.name} to ${volume.toFixed(2)}`);
    }

    applyMuteState() {
        if (!this.outputNode) return;
        this.outputNode.gain.rampTo(this.isMuted ? 0 : this.previousVolumeBeforeMute, 0.02);
    }

    applySoloState(isAnotherTrackSoloed) {
        if (!this.outputNode) return;
        if (isAnotherTrackSoloed) this.outputNode.gain.rampTo(0, 0.02);
        else this.applyMuteState();
    }
    
    updateSoloMuteState(soloedTrackId) {
        this.isSoloed = this.id === soloedTrackId;
        this.applySoloState(soloedTrackId !== null && !this.isSoloed);
        this.appServices.updateTrackUI?.(this.id, 'soloChanged');
    }
    
    setSynthParam(paramPath, value) {
        if (!this.instrument || this.type !== 'Synth') return;
        try {
            this.instrument.set({ [paramPath]: value });
            this.synthParams = this.instrument.get();
        } catch (e) {
            console.error(`Could not set synth param: ${paramPath}`, e);
        }
    }
    
    setInstrumentSamplerPitch(semitones) {
        if (this.type === 'InstrumentSampler' && this.instrument) {
            this.instrumentSamplerSettings.pitchShift = semitones;
            this.instrument.set({ detune: semitones * 100 });
        }
    }

    addEffect(effectType, params, isInitialLoad = false) {
        const effectDef = this.appServices.effectsRegistryAccess?.AVAILABLE_EFFECTS[effectType];
        if (!effectDef) return;
        const initialParams = params || this.appServices.effectsRegistryAccess.getEffectDefaultParams(effectType);
        const toneNode = createEffectInstance(effectType, initialParams);
        if (toneNode) {
            const effectData = { id: `effect-${this.id}-${Date.now()}`, type: effectType, toneNode, params: JSON.parse(JSON.stringify(initialParams)) };
            this.activeEffects.push(effectData);
            this.rebuildEffectChain();
            if (!isInitialLoad) {
                this.appServices.updateTrackUI?.(this.id, 'effectsChanged');
                this.appServices.captureStateForUndo?.(`Add ${effectDef.displayName} to ${this.name}`);
            }
        }
    }

    removeEffect(effectId) {
        const index = this.activeEffects.findIndex(e => e.id === effectId);
        if (index > -1) {
            const removedEffect = this.activeEffects.splice(index, 1)[0];
            removedEffect.toneNode?.dispose();
            this.rebuildEffectChain();
            this.appServices.updateTrackUI?.(this.id, 'effectsChanged');
            this.appServices.captureStateForUndo?.(`Remove ${removedEffect.type} from ${this.name}`);
        }
    }

    updateEffectParam(effectId, paramPath, value) {
        const effect = this.activeEffects.find(e => e.id === effectId);
        if (effect?.toneNode) {
            let paramState = effect.params;
            const keys = paramPath.split('.');
            const finalKey = keys.pop();
            for (const key of keys) {
                paramState = paramState[key] = paramState[key] || {};
            }
            paramState[finalKey] = value;
            try {
                effect.toneNode.set({ [paramPath]: value });
            } catch (e) {
                console.warn(`Could not set param ${paramPath} on effect ${effect.type}`, e);
            }
        }
    }

    addNoteToSequence(sequenceId, pitchIndex, timeStep, noteData = { velocity: 0.75, duration: 1 }) {
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (sequence && sequence.data[pitchIndex] !== undefined && timeStep < sequence.length) {
            sequence.data[pitchIndex][timeStep] = noteData;
            this.appServices.captureStateForUndo?.(`Add note to ${this.name}`);
            this.recreateToneSequence();
        }
    }

    removeNoteFromSequence(sequenceId, pitchIndex, timeStep) {
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (sequence?.data[pitchIndex]?.[timeStep]) {
            sequence.data[pitchIndex][timeStep] = null;
            this.appServices.captureStateForUndo?.(`Remove note from ${this.name}`);
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
        this.appServices.captureStateForUndo?.(`Delete ${notesToRemove.size} notes from ${this.name}`);
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
                this.appServices.showNotification?.('Cannot move notes outside the sequence bounds.', 2000);
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
        this.appServices.captureStateForUndo?.('Move notes');
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

    getActiveSequence() {
        if (!this.activeSequenceId && this.sequences.length > 0) this.activeSequenceId = this.sequences[0].id;
        return this.sequences.find(s => s.id === this.activeSequenceId);
    }

    createNewSequence(name, length, skipUndo) {
        if (this.type === 'Audio') return null;
        const newSeqId = `seq_${this.id}_${Date.now()}`;
        const newSequence = {
            id: newSeqId,
            name,
            data: Array(Constants.SYNTH_PITCHES.length).fill(null).map(() => Array(length).fill(null)),
            length
        };
        this.sequences.push(newSequence);
        this.activeSequenceId = newSeqId;
        if (!skipUndo) this.appServices.captureStateForUndo?.(`Create Sequence "${name}" on ${this.name}`);
        return newSequence;
    }

    clearSequence(sequenceId) {
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (!sequence) return;
        sequence.data = Array(Constants.SYNTH_PITCHES.length).fill(null).map(() => Array(sequence.length).fill(null));
        this.recreateToneSequence();
        this.appServices.captureStateForUndo?.(`Clear sequence on ${this.name}`);
    }
    
    duplicateSequence(sequenceId) {
        const originalSequence = this.sequences.find(s => s.id === sequenceId);
        if (!originalSequence) return;
        const newName = `${originalSequence.name} (copy)`;
        const newSequence = this.createNewSequence(newName, originalSequence.length, true);
        newSequence.data = JSON.parse(JSON.stringify(originalSequence.data));
        this.recreateToneSequence();
        this.appServices.captureStateForUndo?.(`Duplicate sequence on ${this.name}`);
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
    
        this.appServices.setClipboardData?.({ type: 'piano-roll-notes', notes: relativeNotes });
        this.appServices.showNotification?.(`${relativeNotes.length} note(s) copied.`);
    }
    
    pasteNotesFromClipboard(sequenceId, pastePitchIndex, pasteTimeStep) {
        const clipboard = this.appServices.getClipboardData?.();
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
        this.appServices.captureStateForUndo?.(`Paste ${clipboard.notes.length} notes`);
    }

    addClip(clipData) {
        if (!clipData.type || !clipData.id) return;
        this.timelineClips.push(clipData);
        this.appServices.captureStateForUndo?.(`Add ${clipData.name} clip`);
        this.appServices.renderTimeline?.();
    }
    
    async addAudioClip(audioBlob, startTime, clipName) {
        if (this.type !== 'Audio') return;
        try {
            const dbKey = `clip-${this.id}-${Date.now()}-${clipName}`;
            await this.appServices.dbStoreAudio(dbKey, audioBlob);
            const audioBuffer = await Tone.context.decodeAudioData(await audioBlob.arrayBuffer());
            const newClip = {
                id: `clip-${this.id}-${Date.now()}`,
                type: 'audio', name: clipName, dbKey, startTime,
                duration: audioBuffer.duration,
                audioBuffer,
            };
            this.addClip(newClip);
        } catch (error) {
            console.error("Error adding audio clip:", error);
            this.appServices.showNotification?.('Failed to process and add audio clip.', 3000);
        }
    }
    
    recreateToneSequence() {
        this.toneSequence?.dispose();
        this.toneSequence = null;
        const activeSequence = this.getActiveSequence();
        if (!activeSequence) return;
        const events = [];
        for (let row = 0; row < activeSequence.data.length; row++) {
            for (let step = 0; step < activeSequence.length; step++) {
                if (activeSequence.data[row]?.[step]) {
                    const pitch = Constants.SYNTH_PITCHES[row];
                    const noteData = activeSequence.data[row][step];
                    events.push({
                        time: `${step}*16n`,
                        note: pitch,
                        duration: `${noteData.duration || 1}*16n`,
                        velocity: noteData.velocity || 0.75
                    });
                }
            }
        }
        const partEventCallback = (time, value) => {
            if (this.instrument) {
                this.instrument.triggerAttackRelease(value.note, value.duration, time, value.velocity);
            } else if (this.type === 'Sampler' || this.type === 'DrumSampler') {
                const midi = Tone.Midi(value.note).toMidi();
                const sampleIndex = midi - Constants.SAMPLER_PIANO_ROLL_START_NOTE;
                if (sampleIndex >= 0 && sampleIndex < Constants.NUM_SAMPLER_NOTES) {
                    const playbackFn = this.type === 'Sampler' ? this.appServices.playSlicePreview : this.appServices.playDrumSamplerPadPreview;
                    playbackFn?.(this.id, sampleIndex, value.velocity, 0, time);
                }
            }
        };
        this.toneSequence = new Tone.Part(partEventCallback, events);
        this.toneSequence.loop = true;
        this.toneSequence.loopEnd = `${activeSequence.length}*16n`;
    }

    startSequence() {
        if (this.toneSequence?.state !== 'started') this.toneSequence?.start(0);
    }
    
    stopSequence() {
        if (this.toneSequence?.state === 'started') this.toneSequence.stop(0);
    }
    
    getDefaultSynthParams() {
        return {
            portamento: 0,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 2.0, sustain: 0, release: 5.0 },
            filter: { type: 'lowpass', rolloff: -12, Q: 1, frequency: 10000 },
            filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 2, baseFrequency: 200, octaves: 7 }
        };
    }

    dispose() {
        this.toneSequence?.dispose();
        this.instrument?.dispose();
        this.input?.dispose();
        this.outputNode?.dispose();
        this.trackMeter?.dispose();
        this.activeEffects.forEach(e => e.toneNode.dispose());
    }
}
