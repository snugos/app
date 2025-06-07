// js/Track.js - Track Class Module

import * as Constants from './constants.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from './effectsRegistry.js';
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
        
        // --- Audio Nodes ---
        this.input = new Tone.Gain();
        this.gainNode = new Tone.Gain(this.previousVolumeBeforeMute).toDestination();
        this.trackMeter = new Tone.Meter();
        this.gainNode.connect(this.trackMeter);
        this.outputNode = this.gainNode;
        
        this.instrument = null;

        // --- Effects ---
        this.activeEffects = [];
        if (initialData?.activeEffects) {
            initialData.activeEffects.forEach(effectData => this.addEffect(effectData.type, effectData.params, true));
        }

        // --- Initialize All Properties to Defaults ---
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

        // --- Apply Type-Specific Properties ---
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
            this.toneSampler = null;
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
            this.instrument = new Tone.Sampler(); // Basic sampler for MIDI triggering
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
            currentNode.connect(this.outputNode);
        }
    }
    
    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = volume;
        if (!this.isMuted) {
            this.gainNode.gain.rampTo(volume, 0.02);
        }
        if (fromInteraction && this.appServices.captureStateForUndo) {
            this.appServices.captureStateForUndo(`Set Volume for ${this.name} to ${volume.toFixed(2)}`);
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
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'soloChanged');
        }
    }
    
    setSynthParam(paramPath, value) {
        if (!this.instrument || this.type !== 'Synth') return;
        let param = this.instrument;
        try {
            const keys = paramPath.split('.');
            const finalKey = keys.pop();
            const target = keys.reduce((o, k) => o[k], param);
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
        if (!effectDef) return;
        const initialParams = params || this.appServices.effectsRegistryAccess.getEffectDefaultParams(effectType);
        const toneNode = createEffectInstance(effectType, initialParams);
        if (toneNode) {
            const effectData = { id: `effect-${this.id}-${Date.now()}`, type: effectType, toneNode, params: JSON.parse(JSON.stringify(initialParams)) };
            this.activeEffects.push(effectData);
            this.rebuildEffectChain();
            if (!isInitialLoad) this.appServices.updateTrackUI?.(this.id, 'effectsChanged');
        }
    }

    createNewSequence(name, length, skipUndo) { /* ... implementation ... */ }
    
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
