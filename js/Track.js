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
        if (initialData?.activeEffects) {
            initialData.activeEffects.forEach(effectData => this.addEffect(effectData.type, effectData.params, true));
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
            this.instrumentSamplerSettings = initialData?.instrumentSamplerSettings || { originalFileName: null, dbKey: null, rootNote: 'C4', loop: false, loopStart: 0, loopEnd: 0, envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 }, status: 'empty' };
        }

        // --- FIX: Create a default sequence for all sequence-able track types ---
        if (this.type !== 'Audio' && this.sequences.length === 0) {
            this.createNewSequence("Sequence 1", 64, true);
        }
    }

    async initializeInstrument() {
        if (this.instrument) {
            this.instrument.dispose();
        }

        if (this.type === 'Synth' || this.type === 'InstrumentSampler') {
            this.instrument = new Tone.PolySynth(Tone.Synth);
        } else if (this.type === 'Sampler' || this.type === 'DrumSampler') {
            // Samplers don't need a default instrument for sequencing, 
            // the sequence will trigger the playback service directly.
            this.instrument = null; 
        } else {
            this.instrument = null;
        }
        
        this.rebuildEffectChain();
        this.recreateToneSequence();
    }
    
    rebuildEffectChain() {
        this.input.disconnect();
        this.instrument?.disconnect();

        if (this.instrument) {
            this.instrument.connect(this.input);
        }

        let currentNode = this.input;
        this.activeEffects.forEach(effect => {
            if (effect.toneNode) {
                currentNode.connect(effect.toneNode);
                currentNode = effect.toneNode;
            }
        });

        currentNode.connect(this.outputNode);
        
        const masterBusInput = this.appServices.getMasterBusInputNode?.();
        if (masterBusInput) {
            this.outputNode.connect(masterBusInput);
        } else {
            this.outputNode.toDestination();
        }
    }
    
    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = volume;
        if (!this.isMuted) {
            this.outputNode.gain.rampTo(volume, 0.02);
        }
        if (fromInteraction) {
            this.appServices.captureStateForUndo?.(`Set Volume for ${this.name} to ${volume.toFixed(2)}`);
        }
    }

    applyMuteState() { /* ... (no changes) ... */ }
    applySoloState(isAnotherTrackSoloed) { /* ... (no changes) ... */ }
    updateSoloMuteState(soloedTrackId) { /* ... (no changes) ... */ }
    setSynthParam(paramPath, value) { /* ... (no changes) ... */ }
    addEffect(effectType, params, isInitialLoad = false) { /* ... (no changes) ... */ }
    removeEffect(effectId) { /* ... (no changes) ... */ }

    addNoteToSequence(sequenceId, pitchIndex, timeStep, noteData = { velocity: 0.75, duration: 1 }) {
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (sequence && sequence.data[pitchIndex] !== undefined) {
            sequence.data[pitchIndex][timeStep] = noteData;
            this.appServices.captureStateForUndo?.(`Add note to ${this.name}`);
            this.recreateToneSequence();
        }
    }

    removeNoteFromSequence(sequenceId, pitchIndex, timeStep) {
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (sequence && sequence.data[pitchIndex] !== undefined) {
            sequence.data[pitchIndex][timeStep] = null;
            this.appServices.captureStateForUndo?.(`Remove note from ${this.name}`);
            this.recreateToneSequence();
        }
    }
    
    getActiveSequence() {
        if (!this.activeSequenceId && this.sequences.length > 0) {
            this.activeSequenceId = this.sequences[0].id;
        }
        return this.sequences.find(s => s.id === this.activeSequenceId);
    }

    createNewSequence(name, length, skipUndo) {
        if (this.type === 'Audio') return;
        const newSeqId = `seq_${this.id}_${Date.now()}`;
        const numRows = Constants.SYNTH_PITCHES.length;
        const newSequence = {
            id: newSeqId,
            name: name,
            data: Array(numRows).fill(null).map(() => Array(length).fill(null)),
            length: length
        };
        this.sequences.push(newSequence);
        this.activeSequenceId = newSeqId;
        if (!skipUndo) {
            this.appServices.captureStateForUndo?.(`Create Sequence "${name}" on ${this.name}`);
        }
    }
    
    async addExternalAudioFileAsClip(audioBlob, startTime, clipName) { /* ... (no changes) ... */ }
    
    // --- FIX: Major overhaul to handle all sequence-able track types ---
    recreateToneSequence() {
        this.toneSequence?.dispose();
        this.toneSequence = null;

        const activeSequence = this.getActiveSequence();
        if (!activeSequence) return;
        
        const events = [];
        // Convert the 2D grid data into a format Tone.Sequence understands
        for (let step = 0; step < activeSequence.length; step++) {
            const notesInStep = [];
            for (let row = 0; row < activeSequence.data.length; row++) {
                if (activeSequence.data[row]?.[step]) {
                    const pitch = Constants.SYNTH_PITCHES[row];
                    notesInStep.push(pitch);
                }
            }
            events.push(notesInStep);
        }

        if (this.type === 'Synth' || this.type === 'InstrumentSampler') {
            if (!this.instrument) return;
            this.toneSequence = new Tone.Sequence((time, note) => {
                this.instrument.triggerAttackRelease(note, "16n", time);
            }, events, "16n").start(0);

        } else if (this.type === 'Sampler' || this.type === 'DrumSampler') {
            const isSlicer = this.type === 'Sampler';
            
            this.toneSequence = new Tone.Sequence((time, notes) => {
                notes.forEach(note => {
                    const midi = Tone.Midi(note).toMidi();
                    const sampleIndex = midi - Constants.SAMPLER_PIANO_ROLL_START_NOTE;

                    if (sampleIndex >= 0 && sampleIndex < Constants.NUM_SAMPLER_NOTES) {
                        if (isSlicer) {
                            this.appServices.playSlicePreview?.(this.id, sampleIndex, 1.0, 0, time);
                        } else {
                            this.appServices.playDrumSamplerPadPreview?.(this.id, sampleIndex, 1.0, 0, time);
                        }
                    }
                });
            }, events, "16n").start(0);
        }

        if (this.toneSequence) {
            this.toneSequence.loop = true;
        }
    }
    
    getDefaultSynthParams() { /* ... (no changes) ... */ }
    dispose() { /* ... (no changes) ... */ }
}
