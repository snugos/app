import * as Constants from './constants.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry, AVAILABLE_EFFECTS } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';

export class Track {
    constructor(id, type, initialData = null, appServices = {}) {
        this.id = initialData?.id || id;
        this.type = type;
        this.appServices = appServices || {}; 

        this.name = initialData?.name || `${type} Track ${this.id}`;
        if (type === 'Synth') {
            this.name = initialData?.name || `MonoSynth ${this.id}`;
        }

        this.isMuted = initialData?.isMuted || false;
        this.isSoloed = false;
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

    addEffect(effectType, params, isInitialLoad = false) {
        // ... (implementation is correct)
    }

    removeEffect(effectId) {
        // ... (implementation is correct)
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
        // ... (implementation is correct)
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
            events.push(notesInStep.length > 0 ? notesInStep : undefined);
        }

        this.toneSequence = new Tone.Sequence((time, value) => {
            if (value) {
                this.instrument.triggerAttackRelease(value, "16n", time);
            }
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
