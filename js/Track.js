// js/Track.js - Track Class Module

import { STEPS_PER_BAR, defaultStepsPerBar, synthPitches, numSlices, numDrumSamplerPads, samplerMIDINoteStart, defaultVelocity } from './constants.js';
import { createEffectInstance, getEffectDefaultParams, AVAILABLE_EFFECTS } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js'; // For IndexedDB

export class Track {
    constructor(id, type, initialData = null) {
        this.id = initialData?.id || id;
        this.type = type;

        this.name = initialData?.name || `${type} Track ${this.id}`;
        if (type === 'DrumSampler') {
            this.name = initialData?.name || `Sampler (Pads) ${this.id}`;
        } else if (type === 'Synth') {
            this.name = initialData?.name || `MonoSynth ${this.id}`;
        }

        this.isMuted = initialData?.isMuted || false;
        this.isSoloed = (typeof window.getSoloedTrackId === 'function' && window.getSoloedTrackId() === this.id);
        this.previousVolumeBeforeMute = initialData?.volume ?? 0.7;


        if (this.type === 'Synth') {
            this.synthEngineType = initialData?.synthEngineType || 'MonoSynth';
            this.synthParams = initialData?.synthParams ? JSON.parse(JSON.stringify(initialData.synthParams)) : this.getDefaultSynthParams();
        } else {
            this.synthEngineType = null;
            this.synthParams = {};
        }

        this.samplerAudioData = initialData?.samplerAudioData || {
            fileName: null, audioBufferDataURL: null, dbKey: null, status: 'empty'
        };
        this.audioBuffer = null;
        this.slices = initialData?.slices || Array(numSlices).fill(null).map(() => ({
            offset: 0, duration: 0, userDefined: false, volume: 1.0, pitchShift: 0,
            loop: false, reverse: false,
            envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 }
        }));
        this.selectedSliceForEdit = initialData?.selectedSliceForEdit || 0;
        this.waveformZoom = initialData?.waveformZoom || 1;
        this.waveformScrollOffset = initialData?.waveformScrollOffset || 0;
        this.slicerIsPolyphonic = initialData?.slicerIsPolyphonic !== undefined ? initialData.slicerIsPolyphonic : true;
        this.slicerMonoPlayer = null;
        this.slicerMonoEnvelope = null;
        this.slicerMonoGain = null;

        this.instrumentSamplerSettings = initialData?.instrumentSamplerSettings || {
            sampleUrl: null, audioBuffer: null, audioBufferDataURL: null, originalFileName: null, dbKey: null,
            rootNote: 'C4', loop: false, loopStart: 0, loopEnd: 0,
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 }, status: 'empty'
        };
        this.instrumentSamplerIsPolyphonic = initialData?.instrumentSamplerIsPolyphonic !== undefined ? initialData.instrumentSamplerIsPolyphonic : true;
        this.toneSampler = null;

        this.drumSamplerPads = initialData?.drumSamplerPads || Array(numDrumSamplerPads).fill(null).map(() => ({
            sampleUrl: null, audioBuffer: null, audioBufferDataURL: null, originalFileName: null, dbKey: null,
            volume: 0.7, pitchShift: 0,
            envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 }, status: 'empty'
        }));
        if (initialData?.drumSamplerPads) {
            initialData.drumSamplerPads.forEach((padData, index) => {
                if (this.drumSamplerPads[index]) {
                    this.drumSamplerPads[index].audioBufferDataURL = padData.audioBufferDataURL || null;
                    this.drumSamplerPads[index].originalFileName = padData.originalFileName || null;
                    this.drumSamplerPads[index].dbKey = padData.dbKey || null;
                    this.drumSamplerPads[index].volume = padData.volume ?? 0.7;
                    this.drumSamplerPads[index].pitchShift = padData.pitchShift ?? 0;
                    this.drumSamplerPads[index].envelope = padData.envelope ? JSON.parse(JSON.stringify(padData.envelope)) : { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 };
                    this.drumSamplerPads[index].status = padData.status || (padData.audioBufferDataURL || padData.dbKey ? 'missing' : 'empty');
                }
            });
        }
        this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
        this.drumPadPlayers = Array(numDrumSamplerPads).fill(null);

        this.activeEffects = [];
        if (initialData && initialData.activeEffects && Array.isArray(initialData.activeEffects)) {
            initialData.activeEffects.forEach(effectData => {
                const paramsForInstance = effectData.params ? JSON.parse(JSON.stringify(effectData.params)) : {};
                const toneNode = createEffectInstance(effectData.type, paramsForInstance);
                if (toneNode) {
                    this.activeEffects.push({
                        id: effectData.id || `effect-${this.id}-${effectData.type}-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
                        type: effectData.type, toneNode: toneNode, params: paramsForInstance
                    });
                }
            });
        }

        this.gainNode = null; this.trackMeter = null; this.outputNode = null;
        this.instrument = null;
        this.sequenceLength = initialData?.sequenceLength || defaultStepsPerBar;
        let numRowsForGrid;
        if (type === 'Synth' || type === 'InstrumentSampler') numRowsForGrid = synthPitches.length;
        else if (type === 'Sampler') numRowsForGrid = this.slices.length > 0 ? this.slices.length : numSlices;
        else if (type === 'DrumSampler') numRowsForGrid = numDrumSamplerPads;
        else numRowsForGrid = 0;

        const loadedSequenceData = initialData?.sequenceData;
        this.sequenceData = Array(numRowsForGrid).fill(null).map((_, rIndex) => {
            const row = Array(this.sequenceLength).fill(null);
            if (loadedSequenceData && loadedSequenceData[rIndex]) {
                for (let c = 0; c < Math.min(this.sequenceLength, loadedSequenceData[rIndex].length); c++) {
                    row[c] = loadedSequenceData[rIndex][c];
                }
            }
            return row;
        });
        this.sequence = null;
        this.inspectorWindow = null; this.effectsRackWindow = null; this.sequencerWindow = null;
        this.waveformCanvasCtx = null; this.instrumentWaveformCanvasCtx = null;
        this.automation = initialData?.automation || { volume: [] };
        this.inspectorControls = {};
    }

    getDefaultSynthParams() {
        return {
            portamento: 0.01,
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 1 },
            filter: { type: 'lowpass', rolloff: -12, Q: 1 },
            filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 2, baseFrequency: 200, octaves: 7, exponent: 2 }
        };
    }

    async initializeAudioNodes() {
        console.log(`[Track ${this.id}] Initializing core audio nodes (Gain, Meter)...`);
        if (this.gainNode && !this.gainNode.disposed) { try { this.gainNode.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old gainNode:`, e.message)} }
        if (this.trackMeter && !this.trackMeter.disposed) { try { this.trackMeter.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old trackMeter:`, e.message)} }

        this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
        this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        this.outputNode = this.gainNode;

        this.rebuildEffectChain();
    }

    rebuildEffectChain() {
        console.log(`[Track ${this.id} - rebuildEffectChain V2] Rebuilding. PolySlicer: ${this.slicerIsPolyphonic}`);

        if (!this.gainNode || this.gainNode.disposed) {
            this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
        }
        if (!this.trackMeter || this.trackMeter.disposed) {
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        }

        // Disconnect everything upstream of the gain node first to avoid multiple paths
        const sourcesToDisconnect = [];
        if (this.instrument && !this.instrument.disposed) sourcesToDisconnect.push(this.instrument);
        if (this.toneSampler && !this.toneSampler.disposed) sourcesToDisconnect.push(this.toneSampler);
        if (this.type === 'Sampler' && !this.slicerIsPolyphonic && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
            // The output of the mono slicer chain is slicerMonoGain
            sourcesToDisconnect.push(this.slicerMonoGain);
            // Also ensure internal mono chain is clean
            if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) this.slicerMonoPlayer.disconnect();
            if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) this.slicerMonoEnvelope.disconnect();
        }
        if (this.type === 'DrumSampler') {
            this.drumPadPlayers.forEach(player => {
                if (player && !player.disposed) sourcesToDisconnect.push(player);
            });
        }
        this.activeEffects.forEach(effect => {
            if (effect.toneNode && !effect.toneNode.disposed) sourcesToDisconnect.push(effect.toneNode);
        });

        sourcesToDisconnect.forEach(node => { try { node.disconnect(); } catch(e) {/* ignore */} });
        try { this.gainNode.disconnect(); } catch(e) {/* ignore */} // Disconnect gain node from its previous outputs

        // --- Determine the main sound source output for the effects chain ---
        let mainSourceOutputForEffects = null;
        if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
            mainSourceOutputForEffects = this.instrument;
        } else if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed) {
            mainSourceOutputForEffects = this.toneSampler;
        } else if (this.type === 'Sampler' && !this.slicerIsPolyphonic) {
            if (this.slicerMonoPlayer && this.slicerMonoEnvelope && this.slicerMonoGain) {
                if(this.slicerMonoPlayer.disposed || this.slicerMonoEnvelope.disposed || this.slicerMonoGain.disposed) {
                    console.warn(`[Track ${this.id}] Mono slicer nodes disposed, attempting to re-setup.`);
                    this.setupSlicerMonoNodes(); // This will re-create and chain them
                } else { // Ensure they are chained correctly if not disposed
                     try { this.slicerMonoPlayer.disconnect(); this.slicerMonoEnvelope.disconnect(); } catch(e){}
                     this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
                }
                mainSourceOutputForEffects = this.slicerMonoGain; // The output of the mono chain
            }
        }
        // For Polyphonic Sampler, players are temporary and connect directly in sequence callback.
        // For Drum Sampler, each player connects individually to the start of the effects chain.

        console.log(`[Track ${this.id}] Main source output for effects: ${mainSourceOutputForEffects ? mainSourceOutputForEffects.constructor.name : 'N/A (Drum/PolySampler)'}`);

        // --- Define the start and end of the connectable effects chain ---
        let effectsChainEntryPoint = this.gainNode; // If no effects, sources connect directly to gain
        let effectsChainOutputPoint = this.gainNode; // If no effects, this remains gainNode

        if (this.activeEffects.length > 0) {
            effectsChainEntryPoint = this.activeEffects[0].toneNode;
            effectsChainOutputPoint = this.activeEffects[this.activeEffects.length - 1].toneNode;

            // Chain effects together
            for (let i = 0; i < this.activeEffects.length - 1; i++) {
                const currentEffect = this.activeEffects[i].toneNode;
                const nextEffect = this.activeEffects[i + 1].toneNode;
                if (currentEffect && !currentEffect.disposed && nextEffect && !nextEffect.disposed) {
                    currentEffect.connect(nextEffect);
                    console.log(`[Track ${this.id}] Chained effect ${this.activeEffects[i].type} to ${this.activeEffects[i+1].type}`);
                }
            }
            // Connect the last effect to the gain node
            if (effectsChainOutputPoint && !effectsChainOutputPoint.disposed && this.gainNode && !this.gainNode.disposed) {
                effectsChainOutputPoint.connect(this.gainNode);
                console.log(`[Track ${this.id}] Connected last effect (${this.activeEffects[this.activeEffects.length - 1].type}) to GainNode.`);
            }
        }

        // --- Connect sources to the effects chain (or gain node) ---
        if (mainSourceOutputForEffects && !mainSourceOutputForEffects.disposed) {
            if (effectsChainEntryPoint && !effectsChainEntryPoint.disposed) {
                mainSourceOutputForEffects.connect(effectsChainEntryPoint);
                console.log(`[Track ${this.id}] Connected ${mainSourceOutputForEffects.constructor.name} to ${effectsChainEntryPoint.constructor.name}`);
            } else {
                console.warn(`[Track ${this.id}] No valid effectsChainEntryPoint for single source, source will be silent.`);
            }
        }

        if (this.type === 'DrumSampler') {
            this.drumPadPlayers.forEach((player, idx) => {
                if (player && !player.disposed) {
                    if (effectsChainEntryPoint && !effectsChainEntryPoint.disposed) {
                        player.connect(effectsChainEntryPoint);
                        console.log(`[Track ${this.id}] Connected Drum Pad ${idx} to ${effectsChainEntryPoint.constructor.name}`);
                    } else {
                         console.warn(`[Track ${this.id}] No valid effectsChainEntryPoint for Drum Pad ${idx}.`);
                    }
                }
            });
        }
        // Polyphonic Sampler connections are handled dynamically in the sequence callback.

        // --- Final output connections ---
        if (this.gainNode && !this.gainNode.disposed) {
            this.outputNode = this.gainNode;
            if (this.trackMeter && !this.trackMeter.disposed) {
                this.gainNode.connect(this.trackMeter);
            }
            const finalDestination = (window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed)
                                     ? window.masterEffectsBusInput
                                     : Tone.getDestination();
            this.gainNode.connect(finalDestination);
            console.log(`[Track ${this.id}] GainNode connected to Meter and ${finalDestination === window.masterEffectsBusInput ? 'Master Bus Input' : 'Tone Destination'}.`);
        } else {
            this.outputNode = null; // Should not happen if gainNode is re-initialized
            console.error(`[Track ${this.id}] GainNode is invalid at end of rebuild. Output will be silent.`);
        }
        console.log(`[Track ${this.id}] Effect chain rebuild fully finished. Output node: ${this.outputNode?.constructor.name}`);
    }


    addEffect(effectType) {
        if (typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Add ${effectType} to ${this.name}`);
        }
        const defaultParams = getEffectDefaultParams(effectType);
        const toneNode = createEffectInstance(effectType, defaultParams);

        if (toneNode) {
            const effectId = `effect_${this.id}_${effectType}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            this.activeEffects.push({
                id: effectId,
                type: effectType,
                toneNode: toneNode,
                params: JSON.parse(JSON.stringify(defaultParams))
            });
            this.rebuildEffectChain();
            return effectId;
        }
        console.warn(`[Track ${this.id}] Failed to create effect instance for ${effectType}`);
        return null;
    }

    removeEffect(effectId) {
        const effectIndex = this.activeEffects.findIndex(e => e.id === effectId);
        if (effectIndex > -1) {
            const effectToRemove = this.activeEffects[effectIndex];
            if (typeof window.captureStateForUndo === 'function') {
                window.captureStateForUndo(`Remove ${effectToRemove.type} from ${this.name}`);
            }
            if (effectToRemove.toneNode && !effectToRemove.toneNode.disposed) {
                effectToRemove.toneNode.dispose();
            }
            this.activeEffects.splice(effectIndex, 1);
            this.rebuildEffectChain();
        }
    }

    updateEffectParam(effectId, paramPath, value) {
        const effectWrapper = this.activeEffects.find(e => e.id === effectId);
        if (!effectWrapper || !effectWrapper.toneNode || effectWrapper.toneNode.disposed) {
            console.warn(`[Track ${this.id}] Effect node not found or disposed for ID: ${effectId} while trying to update ${paramPath}.`);
            return;
        }

        const keys = paramPath.split('.');
        let currentStoredParamLevel = effectWrapper.params;
        for (let i = 0; i < keys.length - 1; i++) {
            currentStoredParamLevel[keys[i]] = currentStoredParamLevel[keys[i]] || {}; 
            currentStoredParamLevel = currentStoredParamLevel[keys[i]];
        }
        currentStoredParamLevel[keys[keys.length - 1]] = value;

        try {
            let targetObject = effectWrapper.toneNode;
            for (let i = 0; i < keys.length - 1; i++) {
                targetObject = targetObject[keys[i]];
                if (typeof targetObject === 'undefined') { 
                    console.error(`[Track ${this.id}] Nested property "${keys.slice(0, i + 1).join('.')}" not found on Tone node for effect ${effectWrapper.type}. Cannot set parameter.`);
                    return; 
                }
            }

            const finalParamKey = keys[keys.length - 1]; 
            const paramInstance = targetObject[finalParamKey]; 

            if (typeof paramInstance !== 'undefined') {
                if (paramInstance && typeof paramInstance.value !== 'undefined') {
                    if (typeof paramInstance.rampTo === 'function') {
                        paramInstance.rampTo(value, 0.02); 
                    } else {
                        paramInstance.value = value; 
                    }
                } else {
                    targetObject[finalParamKey] = value;
                }
            } else if (typeof effectWrapper.toneNode.set === 'function' && keys.length > 0) {
                const setObj = {};
                let currentLevelForSet = setObj;
                for(let i = 0; i < keys.length - 1; i++){
                    currentLevelForSet[keys[i]] = {}; 
                    currentLevelForSet = currentLevelForSet[keys[i]];
                }
                currentLevelForSet[finalParamKey] = value;
                effectWrapper.toneNode.set(setObj);
            } else {
                console.warn(`[Track ${this.id}] Cannot set param "${paramPath}" on ${effectWrapper.type}. Property or .set() method not available. Target object:`, targetObject, "Final Key:", finalParamKey);
            }
        } catch (err) {
            console.error(`[Track ${this.id}] Error updating param ${paramPath} for ${effectWrapper.type}:`, err, "Value:", value, "Effect Node:", effectWrapper.toneNode);
        }
    }


    reorderEffect(effectId, newIndex) {
        const oldIndex = this.activeEffects.findIndex(e => e.id === effectId);
        if (oldIndex === -1) {
            console.warn(`[Track ${this.id}] Effect ID ${effectId} not found for reordering.`);
            return;
        }
        const clampedNewIndex = Math.max(0, Math.min(newIndex, this.activeEffects.length));

        if (oldIndex === clampedNewIndex || (oldIndex === clampedNewIndex -1 && newIndex === this.activeEffects.length) ) { 
            return;
        }
        
        if (typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Reorder effect on ${this.name}`);
        }
        const [effectToMove] = this.activeEffects.splice(oldIndex, 1);
        this.activeEffects.splice(clampedNewIndex > oldIndex ? clampedNewIndex -1 : clampedNewIndex, 0, effectToMove);
        
        console.log(`[Track ${this.id}] Reordered effect. Old: ${oldIndex}, New (requested): ${newIndex}, Actual Splice Index: ${clampedNewIndex > oldIndex ? clampedNewIndex -1 : clampedNewIndex}. New order:`, this.activeEffects.map(e=>e.type));
        this.rebuildEffectChain();
    }

    async fullyInitializeAudioResources() {
        console.log(`[Track ${this.id}] fullyInitializeAudioResources called for type: ${this.type}`);
        try {
            if (this.type === 'Synth') {
                await this.initializeInstrument();
            } else if (this.type === 'Sampler') {
                if (this.samplerAudioData.dbKey && (!this.audioBuffer || !this.audioBuffer.loaded)) {
                    const blob = await getAudio(this.samplerAudioData.dbKey);
                    if (blob) {
                        const objectURL = URL.createObjectURL(blob);
                        this.audioBuffer = await new Tone.Buffer().load(objectURL);
                        URL.revokeObjectURL(objectURL);
                        this.samplerAudioData.status = this.audioBuffer.loaded ? 'loaded' : 'error';
                        if(this.audioBuffer.loaded && !this.samplerAudioData.audioBufferDataURL) { 
                             const reader = new FileReader();
                             reader.onloadend = () => { this.samplerAudioData.audioBufferDataURL = reader.result; };
                             reader.readAsDataURL(blob);
                        }
                    } else { this.samplerAudioData.status = 'missing_db'; }
                } else if (this.samplerAudioData.audioBufferDataURL && (!this.audioBuffer || !this.audioBuffer.loaded)) {
                    this.audioBuffer = await new Tone.Buffer().load(this.samplerAudioData.audioBufferDataURL);
                    this.samplerAudioData.status = this.audioBuffer.loaded ? 'loaded' : 'error';
                } else if (!this.samplerAudioData.dbKey && !this.samplerAudioData.audioBufferDataURL) {
                    this.samplerAudioData.status = 'empty';
                }
                if (!this.slicerIsPolyphonic && this.audioBuffer?.loaded) {
                    this.setupSlicerMonoNodes();
                }
            } else if (this.type === 'DrumSampler') {
                for (let i = 0; i < this.drumSamplerPads.length; i++) {
                    const pad = this.drumSamplerPads[i];
                    if (pad.dbKey && (!pad.audioBuffer || !pad.audioBuffer.loaded)) {
                        const blob = await getAudio(pad.dbKey);
                        if (blob) {
                            const objectURL = URL.createObjectURL(blob);
                            pad.audioBuffer = await new Tone.Buffer().load(objectURL);
                            URL.revokeObjectURL(objectURL);
                            pad.status = pad.audioBuffer.loaded ? 'loaded' : 'error';
                            if(pad.audioBuffer.loaded && !pad.audioBufferDataURL) {
                                 const reader = new FileReader();
                                 reader.onloadend = () => { pad.audioBufferDataURL = reader.result; };
                                 reader.readAsDataURL(blob);
                            }
                        } else { pad.status = 'missing_db'; }
                    } else if (pad.audioBufferDataURL && (!pad.audioBuffer || !pad.audioBuffer.loaded)) {
                        pad.audioBuffer = await new Tone.Buffer().load(pad.audioBufferDataURL);
                        pad.status = pad.audioBuffer.loaded ? 'loaded' : 'error';
                    } else if (!pad.dbKey && !pad.audioBufferDataURL) {
                        pad.status = 'empty';
                    }
                    if (pad.audioBuffer && pad.audioBuffer.loaded) {
                        if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) {
                            this.drumPadPlayers[i].dispose();
                        }
                        this.drumPadPlayers[i] = new Tone.Player(pad.audioBuffer);
                    }
                }
            } else if (this.type === 'InstrumentSampler') {
                 if (this.instrumentSamplerSettings.dbKey && (!this.instrumentSamplerSettings.audioBuffer || !this.instrumentSamplerSettings.audioBuffer.loaded)) {
                    const blob = await getAudio(this.instrumentSamplerSettings.dbKey);
                    if (blob) {
                        const objectURL = URL.createObjectURL(blob);
                        this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(objectURL);
                        URL.revokeObjectURL(objectURL);
                        this.instrumentSamplerSettings.status = this.instrumentSamplerSettings.audioBuffer.loaded ? 'loaded' : 'error';
                        if(this.instrumentSamplerSettings.audioBuffer.loaded && !this.instrumentSamplerSettings.audioBufferDataURL) {
                             const reader = new FileReader();
                             reader.onloadend = () => { this.instrumentSamplerSettings.audioBufferDataURL = reader.result; };
                             reader.readAsDataURL(blob);
                        }
                    } else { this.instrumentSamplerSettings.status = 'missing_db'; }
                } else if (this.instrumentSamplerSettings.audioBufferDataURL && (!this.instrumentSamplerSettings.audioBuffer || !this.instrumentSamplerSettings.audioBuffer.loaded)) {
                    this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(this.instrumentSamplerSettings.audioBufferDataURL);
                    this.instrumentSamplerSettings.status = this.instrumentSamplerSettings.audioBuffer.loaded ? 'loaded' : 'error';
                } else if (!this.instrumentSamplerSettings.dbKey && !this.instrumentSamplerSettings.audioBufferDataURL) {
                    this.instrumentSamplerSettings.status = 'empty';
                }
                this.setupToneSampler();
            }
            this.rebuildEffectChain();
            this.setSequenceLength(this.sequenceLength, true);
            console.log(`[Track ${this.id}] fullyInitializeAudioResources completed.`);
        } catch (error) {
            console.error(`[Track ${this.id}] Error in fullyInitializeAudioResources:`, error);
            if (this.type === 'Sampler') this.samplerAudioData.status = 'error';
            else if (this.type === 'DrumSampler') this.drumSamplerPads.forEach(p => { if ((p.audioBufferDataURL || p.dbKey) && !p.audioBuffer) p.status = 'error'; });
            else if (this.type === 'InstrumentSampler') this.instrumentSamplerSettings.status = 'error';
        }
    }

    async initializeInstrument() {
        console.log(`[Track ${this.id} - initializeInstrument] Initializing ${this.synthEngineType} instrument...`);
        console.log(`[Track ${this.id} - initializeInstrument] Current this.instrument:`, this.instrument);
        console.log(`[Track ${this.id} - initializeInstrument] Current this.synthParams:`, JSON.parse(JSON.stringify(this.synthParams)));

        if (this.instrument && typeof this.instrument.dispose === 'function' && !this.instrument.disposed) {
            console.log(`[Track ${this.id} - initializeInstrument] Disposing existing instrument.`);
            this.instrument.dispose();
        }
        if (!this.synthParams || Object.keys(this.synthParams).length === 0) {
            console.log(`[Track ${this.id} - initializeInstrument] synthParams empty or null, getting defaults.`);
            this.synthParams = this.getDefaultSynthParams();
        }
        try {
            const paramsForSynth = {
                portamento: this.synthParams.portamento,
                oscillator: this.synthParams.oscillator,
                envelope: this.synthParams.envelope,
                filter: this.synthParams.filter,
                filterEnvelope: this.synthParams.filterEnvelope
            };
            console.log(`[Track ${this.id} - initializeInstrument] Params for new MonoSynth:`, JSON.parse(JSON.stringify(paramsForSynth)));
            this.instrument = new Tone.MonoSynth(paramsForSynth);
            console.log(`[Track ${this.id} - initializeInstrument] NEW MonoSynth instrument CREATED:`, this.instrument);
        } catch (error) {
            console.error(`[Track ${this.id} - initializeInstrument] Error creating MonoSynth instrument:`, error);
            console.log(`[Track ${this.id} - initializeInstrument] Falling back to Tone.Synth() due to error.`);
            this.instrument = new Tone.Synth(); // Basic fallback
        }
    }

    setupSlicerMonoNodes() {
        if (!this.slicerIsPolyphonic) {
            this.disposeSlicerMonoNodes();
            this.slicerMonoPlayer = new Tone.Player();
            this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
            this.slicerMonoGain = new Tone.Gain();
            this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
            console.log(`[Track ${this.id}] Slicer mono nodes set up and chained internally.`);
        }
    }
    disposeSlicerMonoNodes() {
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) this.slicerMonoPlayer.dispose();
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) this.slicerMonoEnvelope.dispose();
        if (this.slicerMonoGain && !this.slicerMonoGain.disposed) this.slicerMonoGain.dispose();
        this.slicerMonoPlayer = null; this.slicerMonoEnvelope = null; this.slicerMonoGain = null;
        console.log(`[Track ${this.id}] Slicer mono nodes disposed.`);
    }

    setupToneSampler() {
        if (this.toneSampler && !this.toneSampler.disposed) {
            this.toneSampler.dispose();
        }
        if (this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
            const urls = {};
            urls[this.instrumentSamplerSettings.rootNote] = this.instrumentSamplerSettings.audioBuffer;
            const samplerOptions = {
                urls: urls,
                attack: this.instrumentSamplerSettings.envelope.attack,
                release: this.instrumentSamplerSettings.envelope.release,
                loop: this.instrumentSamplerSettings.loop, // Pass loop option
                loopStart: this.instrumentSamplerSettings.loopStart,
                loopEnd: this.instrumentSamplerSettings.loopEnd,
                onload: () => console.log(`[Track ${this.id}] Tone.Sampler loaded for InstrumentSampler.`),
                onerror: (e) => console.error(`[Track ${this.id}] Error loading Tone.Sampler:`, e)
            };
            this.toneSampler = new Tone.Sampler(samplerOptions);
             // For Tone.Sampler, loop points are usually handled per-sample definition if more complex.
            // If the sampler has a simple way to set global loop points (less common), it would be here.
            // The constructor options are the primary way for Tone.Sampler.
        } else {
            console.warn(`[Track ${this.id}] InstrumentSampler audioBuffer not loaded, cannot setup Tone.Sampler.`);
        }
    }

    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = Math.max(0, Math.min(1, parseFloat(volume) || 0));
        if (this.gainNode && !this.gainNode.disposed && !this.isMuted) {
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
        }
    }

    applyMuteState() {
        if (!this.gainNode || this.gainNode.disposed) { console.warn(`[Track ${this.id}] applyMuteState: gainNode is null/disposed.`); return; }
        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
        if (this.isMuted) {
            this.gainNode.gain.rampTo(0, 0.01);
        } else {
            if (currentGlobalSoloId && currentGlobalSoloId !== this.id) {
                this.gainNode.gain.rampTo(0, 0.01);
            } else {
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
            }
        }
    }

    applySoloState() {
        if (!this.gainNode || this.gainNode.disposed) { console.warn(`[Track ${this.id}] applySoloState: gainNode is null/disposed.`); return; }
        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;

        if (this.isMuted) {
            this.gainNode.gain.rampTo(0, 0.01);
            return;
        }

        if (currentGlobalSoloId) {
            this.gainNode.gain.rampTo(this.id === currentGlobalSoloId ? this.previousVolumeBeforeMute : 0, 0.01);
        } else {
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
        }
    }

    setSynthParam(paramPath, value) {
        console.log(`[Track ${this.id} - setSynthParam] Called. Path: '${paramPath}', Value:`, value, `Type: ${this.type}`);
        if (this.type !== 'Synth') {
            console.warn(`[Track ${this.id} - setSynthParam] Not a Synth track. Returning.`); return;
        }
        if (!this.instrument) {
            console.error(`[Track ${this.id} - setSynthParam] this.instrument is NULL. Synth type: ${this.synthEngineType}. Returning.`); return;
        }
        if (this.instrument.disposed) {
            console.error(`[Track ${this.id} - setSynthParam] this.instrument is DISPOSED. Returning.`); return;
        }
        if (!this.synthParams) {
            console.log(`[Track ${this.id} - setSynthParam] Initializing this.synthParams as it was missing.`);
            this.synthParams = this.getDefaultSynthParams();
        }
        
        const keys = paramPath.split('.');
        let currentParamLevel = this.synthParams;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!currentParamLevel[keys[i]]) currentParamLevel[keys[i]] = {};
            currentParamLevel = currentParamLevel[keys[i]];
        }
        currentParamLevel[keys[keys.length - 1]] = value;
        console.log(`[Track ${this.id} - setSynthParam] Updated local this.synthParams.${paramPath} to`, value);
        console.log(`[Track ${this.id} - setSynthParam] Full local synthParams now:`, JSON.parse(JSON.stringify(this.synthParams)));

        try {
            let targetObject = this.instrument;
            for (let i = 0; i < keys.length - 1; i++) {
                targetObject = targetObject[keys[i]];
                if (!targetObject) {
                    console.error(`[Track ${this.id} - setSynthParam] Intermediate object for path "${keys.slice(0,i+1).join('.')}" NOT FOUND on actual instrument. Path: ${paramPath}`);
                    console.warn(`[Track ${this.id} - setSynthParam] Trying this.instrument.set({ '${paramPath}': ${value} }) as fallback.`);
                    this.instrument.set({ [paramPath]: value });
                    console.log(`[Track ${this.id} - setSynthParam] Fallback this.instrument.set() for ${paramPath} completed.`);
                    return;
                }
            }
            
            const finalKey = keys[keys.length - 1];
            if (targetObject && typeof targetObject[finalKey] !== 'undefined') {
                if (targetObject[finalKey] && typeof targetObject[finalKey].value !== 'undefined' && typeof value === 'number') {
                    console.log(`[Track ${this.id} - setSynthParam] Setting AudioParam/Signal: ${paramPath}.value = ${value}`);
                    targetObject[finalKey].value = value;
                } else {
                    console.log(`[Track ${this.id} - setSynthParam] Setting direct property: ${paramPath} = ${value}`);
                    targetObject[finalKey] = value;
                }
                console.log(`[Track ${this.id} - setSynthParam] Successfully set synth param ${paramPath} on Tone.js object.`);
            } else {
                console.warn(`[Track ${this.id} - setSynthParam] Property ${paramPath} (finalKey: ${finalKey}) not directly found on target object, attempting this.instrument.set(). Target object:`, targetObject);
                this.instrument.set({ [paramPath]: value });
                console.log(`[Track ${this.id} - setSynthParam] Fallback this.instrument.set() for ${paramPath} completed.`);
            }
        } catch (e) { 
            console.error(`[Track ${this.id} - setSynthParam] Error setting synth param '${paramPath}' to '${value}':`, e); 
        }
    }

    setSliceVolume(sliceIndex, volume) { if (this.slices[sliceIndex]) this.slices[sliceIndex].volume = parseFloat(volume); }
    setSlicePitchShift(sliceIndex, semitones) { if (this.slices[sliceIndex]) this.slices[sliceIndex].pitchShift = parseInt(semitones); }
    setSliceLoop(sliceIndex, loop) { if (this.slices[sliceIndex]) this.slices[sliceIndex].loop = !!loop; }
    setSliceReverse(sliceIndex, reverse) { if (this.slices[sliceIndex]) this.slices[sliceIndex].reverse = !!reverse; }
    setSliceEnvelopeParam(sliceIndex, param, value) { if (this.slices[sliceIndex]?.envelope) this.slices[sliceIndex].envelope[param] = parseFloat(value); }
    setDrumSamplerPadVolume(padIndex, volume) { if (this.drumSamplerPads[padIndex]) this.drumSamplerPads[padIndex].volume = parseFloat(volume); }
    setDrumSamplerPadPitch(padIndex, pitch) { if (this.drumSamplerPads[padIndex]) this.drumSamplerPads[padIndex].pitchShift = parseInt(pitch); }
    setDrumSamplerPadEnv(padIndex, param, value) { if (this.drumSamplerPads[padIndex]?.envelope) this.drumSamplerPads[padIndex].envelope[param] = parseFloat(value); }
    setInstrumentSamplerRootNote(noteName) { if (Tone.Frequency(noteName).toMidi() > 0) { this.instrumentSamplerSettings.rootNote = noteName; this.setupToneSampler(); this.rebuildEffectChain(); }}
    setInstrumentSamplerLoop(loop) { this.instrumentSamplerSettings.loop = !!loop; this.setupToneSampler(); this.rebuildEffectChain(); }
    setInstrumentSamplerLoopStart(time) { this.instrumentSamplerSettings.loopStart = Math.max(0, parseFloat(time)); this.setupToneSampler(); this.rebuildEffectChain(); }
    setInstrumentSamplerLoopEnd(time) { this.instrumentSamplerSettings.loopEnd = Math.max(this.instrumentSamplerSettings.loopStart, parseFloat(time)); this.setupToneSampler(); this.rebuildEffectChain(); }
    setInstrumentSamplerEnv(param, value) { if (this.instrumentSamplerSettings.envelope) { this.instrumentSamplerSettings.envelope[param] = parseFloat(value); if (this.toneSampler && !this.toneSampler.disposed) { if (param === 'attack' && this.toneSampler.attack !== undefined) this.toneSampler.attack = parseFloat(value); if (param === 'release' && this.toneSampler.release !== undefined) this.toneSampler.release = parseFloat(value); } } }

    async doubleSequence() {
        if (typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Double Sequence for ${this.name}`);
        }
        const oldLength = this.sequenceLength;
        const newLength = oldLength * 2;
        if (newLength > 1024) {
            return { success: false, message: "Maximum sequence length reached." };
        }
        this.sequenceData = this.sequenceData.map(row => {
            const newRow = Array(newLength).fill(null);
            if (row) {
                for (let i = 0; i < oldLength; i++) { newRow[i] = row[i]; newRow[i + oldLength] = row[i]; }
            }
            return newRow;
        });
        this.setSequenceLength(newLength, true);
        return { success: true, message: `${this.name} sequence doubled.` };
    }

    setSequenceLength(newLengthInSteps, skipUndoCapture = false) {
        const oldActualLength = this.sequenceLength;
        newLengthInSteps = Math.max(STEPS_PER_BAR, parseInt(newLengthInSteps) || defaultStepsPerBar);
        newLengthInSteps = Math.ceil(newLengthInSteps / STEPS_PER_BAR) * STEPS_PER_BAR; 
        if (!skipUndoCapture && oldActualLength !== newLengthInSteps && typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Set Seq Length for ${this.name} to ${newLengthInSteps / STEPS_PER_BAR} bars`);
        }
        this.sequenceLength = newLengthInSteps;
        let numRows;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRows = synthPitches.length;
        else if (this.type === 'Sampler') numRows = this.slices.length > 0 ? this.slices.length : numSlices;
        else if (this.type === 'DrumSampler') numRows = numDrumSamplerPads;
        else numRows = (this.sequenceData && this.sequenceData.length > 0) ? this.sequenceData.length : 0;
        const currentSequenceData = this.sequenceData || [];
        this.sequenceData = Array(numRows).fill(null).map((_, rIndex) => {
            const currentRow = currentSequenceData[rIndex] || [];
            const newRow = Array(this.sequenceLength).fill(null);
            for (let c = 0; c < Math.min(currentRow.length, this.sequenceLength); c++) newRow[c] = currentRow[c];
            return newRow;
        });
        if (this.sequence && !this.sequence.disposed) { this.sequence.stop(); this.sequence.clear(); this.sequence.dispose(); this.sequence = null; }

        this.sequence = new Tone.Sequence((time, col) => {
            const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
            const isSoloedOut = currentGlobalSoloId && currentGlobalSoloId !== this.id;
            if (this.sequencerWindow && !this.sequencerWindow.isMinimized && typeof window.highlightPlayingStep === 'function') {
                window.highlightPlayingStep(col, this.type, this.sequencerWindow.element?.querySelector('.sequencer-grid'));
            }
            if (!this.gainNode || this.gainNode.disposed || this.isMuted || isSoloedOut) return;

            const effectsChainStartPoint = this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed
                ? this.activeEffects[0].toneNode
                : (this.gainNode && !this.gainNode.disposed ? this.gainNode : (window.masterEffectsBusInput || Tone.getDestination()));


            if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
                 synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active) this.instrument.triggerAttackRelease(pitchName, "8n", time, step.velocity);
                });
            } else if (this.type === 'Sampler') {
                this.slices.forEach((sliceData, sliceIndex) => {
                    const step = this.sequenceData[sliceIndex]?.[col];
                    if (step?.active && sliceData?.duration > 0 && this.audioBuffer?.loaded) {
                        const playbackRate = Math.pow(2, (sliceData.pitchShift || 0) / 12);
                        let playDuration = sliceData.duration / playbackRate;
                        if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds();
                        if (this.slicerIsPolyphonic) {
                            const tempPlayer = new Tone.Player(this.audioBuffer);
                            const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                            const tempGain = new Tone.Gain(step.velocity * sliceData.volume);
                            tempPlayer.chain(tempEnv, tempGain, effectsChainStartPoint); // Connect to start of effects or gain
                            tempPlayer.playbackRate = playbackRate; tempPlayer.reverse = sliceData.reverse; tempPlayer.loop = sliceData.loop;
                            tempPlayer.loopStart = sliceData.offset; tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
                            tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            tempEnv.triggerAttack(time);
                            if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95);
                            Tone.Transport.scheduleOnce(() => { if(tempPlayer && !tempPlayer.disposed) tempPlayer.dispose(); if(tempEnv && !tempEnv.disposed) tempEnv.dispose(); if(tempGain && !tempGain.disposed) tempGain.dispose(); }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);
                        } else if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                            if (this.slicerMonoPlayer.state === 'started') this.slicerMonoPlayer.stop(time);
                            if (this.slicerMonoEnvelope.getValueAtTime(time) > 0.001) this.slicerMonoEnvelope.triggerRelease(time);
                            this.slicerMonoPlayer.buffer = this.audioBuffer; this.slicerMonoEnvelope.set(sliceData.envelope);
                            this.slicerMonoGain.gain.value = step.velocity * sliceData.volume;
                            // The mono chain (player->env->gain) is already connected to effectsChainStartPoint via rebuildEffectChain
                            this.slicerMonoPlayer.playbackRate = playbackRate; this.slicerMonoPlayer.reverse = sliceData.reverse; this.slicerMonoPlayer.loop = sliceData.loop;
                            this.slicerMonoPlayer.loopStart = sliceData.offset; this.slicerMonoPlayer.loopEnd = sliceData.offset + sliceData.duration;
                            this.slicerMonoPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            this.slicerMonoEnvelope.triggerAttack(time);
                            if (!sliceData.loop) this.slicerMonoEnvelope.triggerRelease(Math.max(time, time + playDuration - (sliceData.envelope.release || 0.1)));
                        }
                    }
                });
            } else if (this.type === 'DrumSampler') {
                Array.from({ length: numDrumSamplerPads }).forEach((_, padIndex) => {
                    const step = this.sequenceData[padIndex]?.[col];
                    const padData = this.drumSamplerPads[padIndex];
                    if (step?.active && padData && this.drumPadPlayers[padIndex]?.loaded) {
                        const player = this.drumPadPlayers[padIndex];
                        player.volume.value = Tone.gainToDb(padData.volume * step.velocity);
                        player.playbackRate = Math.pow(2, (padData.pitchShift || 0) / 12);
                        player.start(time);
                    }
                });
            } else if (this.type === 'InstrumentSampler' && this.toneSampler?.loaded) {
                 if (!this.instrumentSamplerIsPolyphonic && Tone.Transport.state === 'started') { // Check flag
                     this.toneSampler.releaseAll(time); // Release previous notes for mono behavior
                 }
                synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active) this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "8n", time, step.velocity);
                });
            }
        }, Array.from(Array(this.sequenceLength).keys()), "16n").start(0);
        if (this.sequencerWindow && !this.sequencerWindow.isMinimized && window.openWindows[`sequencerWin-${this.id}`] && typeof window.openTrackSequencerWindow === 'function') {
             window.openTrackSequencerWindow(this.id, true);
        }
    }

    dispose() {
        console.log(`[Track ${this.id}] Disposing track ${this.name} (${this.type})`);
        try { if (this.sequence && !this.sequence.disposed) { this.sequence.stop(); this.sequence.clear(); this.sequence.dispose(); } } catch(e){ console.warn("Error disposing sequence", e.message); }
        try { if (this.instrument && !this.instrument.disposed) { console.log(`[Track ${this.id} - Dispose] Disposing instrument.`); this.instrument.dispose(); } } catch(e){ console.warn("Error disposing instrument", e.message); }
        try { if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose(); } catch(e){ console.warn("Error disposing audioBuffer", e.message); }
        this.disposeSlicerMonoNodes();
        try { if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.dispose(); } catch(e){ console.warn("Error disposing toneSampler", e.message); }
        try { if (this.instrumentSamplerSettings?.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose(); } catch(e){ console.warn("Error disposing instrumentSamplerSettings.audioBuffer", e.message); }
        this.drumSamplerPads.forEach(pad => { if (pad.audioBuffer && !pad.audioBuffer.disposed) try {pad.audioBuffer.dispose();} catch(e){} });
        this.drumPadPlayers.forEach(player => { if (player && !player.disposed) try {player.dispose();} catch(e){} });
        this.activeEffects.forEach(effect => { if (effect.toneNode && !effect.toneNode.disposed) try {effect.toneNode.dispose();} catch(e){} });
        this.activeEffects = [];
        try { if (this.gainNode && !this.gainNode.disposed) this.gainNode.dispose(); } catch(e){ console.warn("Error disposing gainNode", e.message); }
        try { if (this.trackMeter && !this.trackMeter.disposed) this.trackMeter.dispose(); } catch(e){ console.warn("Error disposing trackMeter", e.message); }
        if (this.inspectorWindow?.close) try {this.inspectorWindow.close(true);} catch(e){}
        if (this.effectsRackWindow?.close) try {this.effectsRackWindow.close(true);} catch(e){}
        if (this.sequencerWindow?.close) try {this.sequencerWindow.close(true);} catch(e){}
        Object.keys(this).forEach(key => { if (key !== 'id' && key !== 'name' && key !== 'type') this[key] = null; });
        console.log(`[Track ${this.id}] Finished disposing track.`);
    }
}

