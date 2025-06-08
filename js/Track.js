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
        this.gainNode = new Tone.Gain(this.previousVolumeBeforeMute);
        this.trackMeter = new Tone.Meter();
        this.outputNode = this.gainNode;
        this.gainNode.connect(this.trackMeter);
        
        this.instrument = null;
        this.activeEffects = [];
        if (initialData?.activeEffects) {
            initialData.activeEffects.forEach(effectData => this.addEffect(effectData.type, effectData.params, true));
        }

        this.synthEngineType = null;
        this.synthParams = {};
        this.samplerAudioData = {};
        this.audioBuffer = null;
        this.slices = [];
        this.selectedSliceForEdit = 0;
        this.drumSamplerPads = [];
        this.drumPadPlayers = [];
        this.selectedDrumPadForEdit = 0;
        this.instrumentSamplerSettings = {};
        this.toneSampler = null;
        this.sequences = [];
        this.activeSequenceId = null;
        this.timelineClips = initialData?.timelineClips || [];
        this.inspectorControls = {};
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

        if (this.type !== 'Audio' && (!initialData?.sequences || initialData.sequences.length === 0)) {
            this.createNewSequence("Sequence 1", Constants.DEFAULT_STEPS_PER_BAR || 16, true);
        }
    }

    async initializeInstrument() {
        if (this.instrument) {
            this.instrument.dispose();
        }
        if (this.type === 'Synth') {
            this.instrument = new Tone.MonoSynth(this.synthParams);
        } else if (this.type === 'DrumSampler' || this.type === 'InstrumentSampler') {
            this.instrument = new Tone.Sampler();
        } else {
            this.instrument = null;
        }
        this.rebuildEffectChain();
    }

    rebuildEffectChain() {
        this.input.disconnect();
        this.instrument?.disconnect();

        let sourceNode = this.instrument || this.input;
        let currentNode = sourceNode;

        this.activeEffects.forEach(effect => {
            if (currentNode && effect.toneNode) {
                try {
                    currentNode.connect(effect.toneNode);
                    currentNode = effect.toneNode;
                } catch (e) {
                    console.error(`Failed to connect effect ${effect.type}`, e);
                }
            }
        });

        if (currentNode) {
            // Connect the end of the track's chain to the master bus input
            const masterBusInput = this.appServices.getMasterBusInputNode?.();
            if (masterBusInput) {
                currentNode.connect(this.outputNode); // Connect to the track's final gain/output node
                this.outputNode.connect(masterBusInput); // Then connect the track's output to the master bus
            } else {
                console.error(`[Track ${this.id}] Could not get master bus input node. Connecting directly to destination as a fallback.`);
                currentNode.connect(this.outputNode);
                this.outputNode.toDestination();
            }
        }
    }
    
    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = volume;
        if (!this.isMuted) {
            this.gainNode.gain.rampTo(volume, 0.02);
        }
        if (fromInteraction) {
            this.appServices.captureStateForUndo?.(`Set Volume for ${this.name} to ${volume.toFixed(2)}`);
        }
    }

    applyMuteState() {
        if (!this.gainNode) return;
        if (this.isMuted) {
            this.gainNode.gain.rampTo(0, 0.02);
        } else {
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.02);
        }
    }

    applySoloState(isAnotherTrackSoloed) {
        if (!this.gainNode) return;
        if (isAnotherTrackSoloed) {
            this.gainNode.gain.rampTo(0, 0.02);
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
            let target = this.instrument;
            const keys = paramPath.split('.');
            const finalKey = keys.pop();
            
            for (const key of keys) {
                if (target[key] === undefined) return;
                target = target[key];
            }
            
            if (target && typeof target[finalKey] !== 'undefined') {
                if (target[finalKey]?.value !== undefined) {
                    target[finalKey].value = value;
                } else {
                    target[finalKey] = value;
                }
                this.synthParams = this.instrument.get();
            }
        } catch (e) {
            console.error(`Could not set synth param: ${paramPath}`, e);
        }
    }
    
    setSliceVolume(index, value) { if(this.slices[index]) this.slices[index].volume = value; }
    setSlicePitchShift(index, value) { if(this.slices[index]) this.slices[index].pitchShift = value; }
    setDrumSamplerPadVolume(index, value) { if(this.drumSamplerPads[index]) this.drumSamplerPads[index].volume = value; }
    setDrumSamplerPadPitch(index, value) { if(this.drumSamplerPads[index]) this.drumSamplerPads[index].pitchShift = value; }

    addEffect(effectType, params, isInitialLoad = false) {
        const effectDef = this.appServices.effectsRegistryAccess?.AVAILABLE_EFFECTS[effectType];
        if (!effectDef) {
            console.error(`Effect definition for "${effectType}" not found.`);
            return;
        }

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
            if (removedEffect.toneNode) {
                removedEffect.toneNode.dispose();
            }
            this.rebuildEffectChain();
            this.appServices.updateTrackUI?.(this.id, 'effectsChanged');
            this.appServices.captureStateForUndo?.(`Remove ${removedEffect.type} from ${this.name}`);
        }
    }
    
    updateEffectParam(effectId, paramPath, value) {
        const effect = this.activeEffects.find(e => e.id === effectId);
        if (!effect?.toneNode) return;
    
        try {
            let target = effect.toneNode;
            const keys = paramPath.split('.');
            const finalKey = keys.pop();
    
            for (const key of keys) {
                if (target[key] === undefined) return;
                target = target[key];
            }
    
            if (target && typeof target[finalKey] !== 'undefined') {
                if (target[finalKey]?.value !== undefined) {
                    target[finalKey].value = value;
                } else {
                    target[finalKey] = value;
                }
                
                let paramState = effect.params;
                 for (const key of keys) {
                    paramState[key] = paramState[key] || {};
                    paramState = paramState[key];
                }
                paramState[finalKey] = value;
            }
        } catch (e) {
            console.error(`Could not update effect param: ${paramPath}`, e);
        }
    }

    addNoteToSequence(sequenceId, pitchIndex, timeStep, noteData = { velocity: 0.75, duration: 1 }) {
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (sequence && sequence.data[pitchIndex] !== undefined) {
            sequence.data[pitchIndex][timeStep] = noteData;
            this.appServices.captureStateForUndo?.(`Add note to ${this.name}`);
        }
    }

    removeNoteFromSequence(sequenceId, pitchIndex, timeStep) {
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (sequence && sequence.data[pitchIndex] !== undefined) {
            sequence.data[pitchIndex][timeStep] = null;
            this.appServices.captureStateForUndo?.(`Remove note from ${this.name}`);
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
        // Implementation for creating a Tone.Part or Tone.Sequence from data
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
        this.instrument?.dispose();
        this.input?.dispose();
        this.outputNode?.dispose();
        this.trackMeter?.dispose();
        this.activeEffects.forEach(e => e.toneNode.dispose());
    }
}
