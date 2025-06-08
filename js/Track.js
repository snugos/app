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
        this.timelineClips = initialData?.timelineClips || [];

        // --- Start of Corrected Code ---
        // Restore initialization for Sampler and DrumSampler properties
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

        if (this.type !== 'Audio' && (!initialData?.sequences || initialData.sequences.length === 0)) {
            // Slicers and Drum Samplers don't use this type of sequence by default
            if (this.type === 'Synth' || this.type === 'InstrumentSampler') {
                 this.createNewSequence("Sequence 1", 64, true);
            }
        }
        // --- End of Corrected Code ---
    }

    async initializeInstrument() {
        if (this.instrument) {
            this.instrument.dispose();
        }
        // --- Start of Corrected Code ---
        if (this.type === 'Synth') {
            this.instrument = new Tone.MonoSynth(this.synthParams);
        } else if (this.type === 'Sampler' || this.type === 'DrumSampler' || this.type === 'InstrumentSampler') {
            this.instrument = new Tone.Sampler();
        } else {
            this.instrument = null;
        }
        // --- End of Corrected Code ---
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
    
    // ... (rest of the functions are unchanged until recreateToneSequence)

    recreateToneSequence() {
        this.toneSequence?.dispose();
        this.toneSequence = null;

        const activeSequence = this.getActiveSequence();
        // --- Start of Corrected Code ---
        // Samplers don't use this master sequence, so exit early.
        if (!this.instrument || !activeSequence || this.type === 'Sampler' || this.type === 'DrumSampler') {
            return;
        }
        // --- End of Corrected Code ---
        
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
    
    // ... (rest of the file is correct and unchanged)
}
