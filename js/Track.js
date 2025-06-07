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
        this.isSoloed = false; // This will be set by the solo manager
        this.isMonitoringEnabled = initialData?.isMonitoringEnabled !== undefined ? initialData.isMonitoringEnabled : (this.type === 'Audio');
        this.previousVolumeBeforeMute = initialData?.volume ?? 0.7;
        
        // --- Audio Nodes ---
        this.input = new Tone.Gain(); // Entry point for the track's internal chain
        this.gainNode = new Tone.Gain(this.previousVolumeBeforeMute).toDestination();
        this.trackMeter = new Tone.Meter();
        this.gainNode.connect(this.trackMeter);
        this.outputNode = this.gainNode; // Final output of the track
        
        this.instrument = null; // The Tone.js instrument

        // --- Effects ---
        this.activeEffects = [];
        if (initialData?.activeEffects) {
            initialData.activeEffects.forEach(effectData => this.addEffect(effectData.type, effectData.params, true));
        }

        // --- Type-Specific Properties ---
        this.sequences = [];
        this.activeSequenceId = null;
        this.timelineClips = initialData?.timelineClips || [];

        if (this.type === 'Synth') {
            this.synthEngineType = initialData?.synthEngineType || 'MonoSynth';
            this.synthParams = initialData?.synthParams ? JSON.parse(JSON.stringify(initialData.synthParams)) : this.getDefaultSynthParams();
        } else if (this.type === 'Sampler') {
            // Sampler (Slicer) specific properties...
        } else if (this.type === 'DrumSampler') {
            this.drumSamplerPads = Array(Constants.numDrumSamplerPads || 16).fill(null).map((_, i) => initialData?.drumSamplerPads?.[i] || { volume: 0.7, pitchShift: 0 });
            this.drumPadPlayers = Array(Constants.numDrumSamplerPads || 16).fill(null);
            this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
        } else if (this.type === 'InstrumentSampler') {
            // Instrument Sampler specific properties...
        }

        if (this.type !== 'Audio' && (!initialData?.sequences || initialData.sequences.length === 0)) {
            this.createNewSequence("Sequence 1", Constants.DEFAULT_STEPS_PER_BAR || 16, true);
        }

        this.inspectorControls = {};
        this.inputChannel = (this.type === 'Audio') ? new Tone.Gain().connect(this.input) : null;
    }

    // --- Core Methods ---
    async initializeInstrument() {
        if (this.instrument) {
            this.instrument.dispose();
            this.instrument = null;
        }

        if (this.type === 'Synth') {
            this.instrument = new Tone.MonoSynth(this.synthParams);
        } else if (this.type === 'InstrumentSampler') {
            // Placeholder for instrument sampler initialization
            this.instrument = new Tone.Sampler();
        } else if (this.type === 'DrumSampler') {
            const urls = {};
            this.drumSamplerPads.forEach((pad, i) => {
                if (pad.dbKey) {
                    urls[Constants.DRUM_MIDI_START_NOTE + i] = `/path/to/db/${pad.dbKey}`; // This needs a real path or blob URL
                }
            });
            this.instrument = new Tone.Sampler({ urls });
        } else {
            this.instrument = null; // Sampler and Audio tracks don't use a single MIDI instrument
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
                currentNode.connect(effect.toneNode);
                currentNode = effect.toneNode;
            }
        });

        if (currentNode) {
            currentNode.connect(this.outputNode);
        }
    }
    
    // --- State & UI Methods ---
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
            this.appServices.updateTrackUI(this.id, 'muteChanged');
        }
    }
    
    setSynthParam(paramPath, value) {
        if (!this.instrument || this.type !== 'Synth') return;
        
        let param = this.instrument;
        const keys = paramPath.split('.');
        const finalKey = keys.pop();
        
        for (const key of keys) {
            if (param[key]) {
                param = param[key];
            }
        }
        
        if (param && param[finalKey]) {
            if (param[finalKey].value !== undefined) {
                param[finalKey].value = value;
            } else {
                param[finalKey] = value;
            }
        }
        this.synthParams = this.instrument.get();
    }
    
    // --- Other Methods ---
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
            if (!isInitialLoad && this.appServices.updateTrackUI) {
                this.appServices.updateTrackUI(this.id, 'effectsChanged');
            }
        }
    }
    
    createNewSequence(name, length, skipUndo = false) {
        // Implementation for creating a new sequence...
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
        this.input.dispose();
        this.outputNode.dispose();
        this.trackMeter.dispose();
        this.activeEffects.forEach(e => e.toneNode.dispose());
    }
}
