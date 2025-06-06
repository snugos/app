// js/Track.js - Track Class Module

import * as Constants from './constants.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';


export class Track {
    constructor(id, type, initialData = null, appServices = {}) {
        this.id = initialData?.id || id;
        this.type = type;
        this.appServices = appServices || {}; // Ensure appServices is an object

        this.name = initialData?.name || `${type} Track ${this.id}`;
        if (type === 'DrumSampler') {
            this.name = initialData?.name || `Sampler (Pads) ${this.id}`;
        } else if (type === 'Synth') {
            this.name = initialData?.name || `MonoSynth ${this.id}`;
        } else if (type === 'Audio') {
            this.name = initialData?.name || `Audio ${this.id}`;
        }
        
        this.isMuted = initialData?.isMuted || false;
        this.isMonitoringEnabled = initialData?.isMonitoringEnabled !== undefined ? initialData.isMonitoringEnabled : (this.type === 'Audio');

        const currentSoloedId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
        this.isSoloed = currentSoloedId === this.id;
        this.previousVolumeBeforeMute = initialData?.volume ?? 0.7;

        this.inspectorControls = {};

        // --- Type Specific Initializations ---
        if (this.type === 'Synth') {
            this.synthEngineType = initialData?.synthEngineType || 'MonoSynth';
            this.synthParams = initialData?.synthParams ? JSON.parse(JSON.stringify(initialData.synthParams)) : this.getDefaultSynthParams();
        }
        
        this.samplerAudioData = { 
            fileName: initialData?.samplerAudioData?.fileName || null,
            dbKey: initialData?.samplerAudioData?.dbKey || null,
            status: initialData?.samplerAudioData?.status || 'empty'
        };
        this.audioBuffer = null;
        this.slices = initialData?.slices?.length ? JSON.parse(JSON.stringify(initialData.slices)) : Array(Constants.numSlices || 16).fill(null).map(() => ({ offset: 0, duration: 0, userDefined: false, volume: 0.7, pitchShift: 0, loop: false, reverse: false, envelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 0.2 } }));
        this.selectedSliceForEdit = initialData?.selectedSliceForEdit || 0;
        
        this.instrumentSamplerSettings = { ...initialData?.instrumentSamplerSettings, audioBuffer: null, status: initialData?.instrumentSamplerSettings?.status || 'empty' };
        
        this.drumSamplerPads = Array(Constants.numDrumSamplerPads || 16).fill(null).map((_, i) => ({ ...initialData?.drumSamplerPads?.[i], audioBuffer: null, status: initialData?.drumSamplerPads?.[i]?.status || 'empty' }));
        this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
        this.drumPadPlayers = Array(Constants.numDrumSamplerPads || 16).fill(null);
        
        this.activeEffects = [];
        if (initialData?.activeEffects) {
            initialData.activeEffects.forEach(effectData => {
                if (!effectData?.type) return;
                const params = effectData.params || this.appServices.effectsRegistryAccess?.getEffectDefaultParams(effectData.type) || {};
                const toneNode = createEffectInstance(effectData.type, params);
                if (toneNode) this.activeEffects.push({ id: effectData.id || `effect-${Date.now()}`, type: effectData.type, toneNode, params });
            });
        }
        
        this.sequences = [];
        this.activeSequenceId = null;
        this.timelineClips = initialData?.timelineClips ? JSON.parse(JSON.stringify(initialData.timelineClips)) : [];

        if (this.type !== 'Audio') {
            if (initialData?.sequences?.length) {
                this.sequences = JSON.parse(JSON.stringify(initialData.sequences));
                this.activeSequenceId = initialData.activeSequenceId && this.sequences.find(s => s.id === initialData.activeSequenceId) ? initialData.activeSequenceId : this.sequences[0].id;
            }
            if (this.sequences.length === 0) this.createNewSequence("Sequence 1", Constants.DEFAULT_STEPS_PER_BAR, true);
        }
    }

    addEffect(effectType) {
        const defaultParams = this.appServices.effectsRegistryAccess?.getEffectDefaultParams(effectType) || {};
        const toneNode = createEffectInstance(effectType, defaultParams);
        if (toneNode) {
            const effectData = {
                id: `effect-${this.id}-${effectType}-${Date.now()}`,
                type: effectType,
                toneNode,
                params: JSON.parse(JSON.stringify(defaultParams))
            };
            this.activeEffects.push(effectData);
            this.rebuildEffectChain();
            // This line tells the UI to update the effects rack for this track
            this.appServices.updateTrackUI?.(this.id, 'effectsChanged');
            this.appServices.captureStateForUndo?.(`Add ${effectType} to ${this.name}`);
        } else {
            this.appServices.showNotification?.(`Failed to create effect: ${effectType}`, 3000);
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
            // This line tells the UI to update the effects rack for this track
            this.appServices.updateTrackUI?.(this.id, 'effectsChanged');
            this.appServices.captureStateForUndo?.(`Remove ${removedEffect.type} from ${this.name}`);
        }
    }

    rebuildEffectChain() {
        // Full implementation...
    }

    // All other methods below this point are unchanged
    // ...
    // ...
}
