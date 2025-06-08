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
        this.sequences = [];
        this.activeSequenceId = null;
        this.inspectorControls = {};
        this.inputChannel = (this.type === 'Audio') ? new Tone.Gain().connect(this.input) : null;

        if (this.type === 'Synth') {
            this.synthEngineType = initialData?.synthEngineType || 'MonoSynth';
            this.synthParams = initialData?.synthParams ? JSON.parse(JSON.stringify(initialData.synthParams)) : this.getDefaultSynthParams();
        }

        if (this.type !== 'Audio' && (!initialData?.sequences || initialData.sequences.length === 0)) {
            this.createNewSequence("Sequence 1", 64, true);
        }
    }

    async initializeInstrument() {
        if (this.instrument) {
            this.instrument.dispose();
        }
        if (this.type === 'Synth') {
            this.instrument = new Tone.MonoSynth(this.synthParams);
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

    applyMuteState() {
        if (!this.outputNode) return;
        if (this.isMuted) {
            this.outputNode.gain.rampTo(0, 0.02);
        } else {
            this.outputNode.gain.rampTo(this.previousVolumeBeforeMute, 0.02);
        }
    }

    applySoloState(isAnotherTrackSoloed) {
        if (!this.outputNode) return;
        if (isAnotherTrackSoloed) {
            this.outputNode.gain.rampTo(0, 0.02);
        } else {
            this.applyMuteState();
        }
    }
    
    updateSoloMuteState(soloedTrackId) {
        const isThisTrackSoloed = this.id === soloedTrackId;
        const isAnotherTrackSoloed = soloedTrackId !== null && this.id !== soloedTrackId;
        this.isSoloed = isThisTrackSoloed;
        this.applySoloState(isAnotherTrackSoloed);
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

    addEffect(effectType, params, isInitialLoad = false) {
        const effectDef = this.appServices.effectsRegistryAccess?.AVAILABLE_EFFECTS[effectType];
        if (!effectDef) return;
        const initialParams = params || this.appServices.effectsRegistryAccess.getEffectDefaultParams(effectType);
        const toneNode = createEffectInstance(effectType, initialParams);

        if (toneNode) {
            const effectData = { 
                id: `effect-${this.id}-${Date.now()}`, 
                type: effectType, 
                toneNode: toneNode, 
                params: JSON.parse(JSON.stringify(initialParams)) 
            };
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
    
    recreateToneSequence() {
        this.toneSequence?.dispose();
        this.toneSequence = null;

        const activeSequence = this.getActiveSequence();
        if (!this.instrument || !activeSequence) {
            return;
        }
        
        const events = [];
        for (let i = 0; i < activeSequence.length; i++) {
            const notesInStep = [];
            for (let j = 0; j < activeSequence.data.length; j++) {
                if (activeSequence.data[j][i]) {
                    notesInStep.push(Constants.SYNTH_PITCHES[j]);
                }
            }
            // If the step is empty, push an empty array. Tone.Sequence will treat this as a rest.
            events.push(notesInStep);
        }

        this.toneSequence = new Tone.Sequence((time, value) => {
            // This callback now handles all cases correctly.
            if (Array.isArray(value)) {
                // For chords (multiple notes in one step)
                if (value.length > 0) {
                    this.instrument.triggerAttackRelease(value, "16n", time);
                }
            } else if (value) {
                // For single notes (which Tone.js passes as a string, not an array)
                this.instrument.triggerAttackRelease(value, "16n", time);
            }
            // If value is undefined or an empty array, it does nothing (a rest).
        }, events, "16n");

        this.toneSequence.loop = true;
        this.toneSequence.start(0);
    }
    
    getDefaultSynthParams() {
        return {
            portamento: 0,
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 1 },
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
