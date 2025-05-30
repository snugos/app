// js/Track.js - Track Class Module

import * as Constants from './constants.js';
import { createEffectInstance, getEffectDefaultParams, AVAILABLE_EFFECTS } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';


export class Track {
    constructor(id, type, initialData = null, appServices = {}) {
        this.id = initialData?.id || id;
        this.type = type;
        this.appServices = appServices; // For functions like getSoloedTrackId, captureStateForUndo

        this.name = initialData?.name || `${type} Track ${this.id}`;
        if (type === 'DrumSampler') {
            this.name = initialData?.name || `Sampler (Pads) ${this.id}`;
        } else if (type === 'Synth') {
            this.name = initialData?.name || `MonoSynth ${this.id}`;
        }

        this.isMuted = initialData?.isMuted || false;
        const currentSoloedId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
        this.isSoloed = currentSoloedId === this.id;
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
        this.audioBuffer = null; // Tone.Buffer instance
        this.slices = initialData?.slices || Array(Constants.numSlices).fill(null).map(() => ({
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
        this.toneSampler = null; // Tone.Sampler instance

        this.drumSamplerPads = initialData?.drumSamplerPads || Array(Constants.numDrumSamplerPads).fill(null).map(() => ({
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
        this.drumPadPlayers = Array(Constants.numDrumSamplerPads).fill(null); // Array of Tone.Player instances

        this.activeEffects = [];
        if (initialData && initialData.activeEffects && Array.isArray(initialData.activeEffects)) {
            initialData.activeEffects.forEach(effectData => {
                // Use appServices to get default params if available, otherwise use local
                const getDefaults = this.appServices.effectsRegistryAccess?.getEffectDefaultParams || getEffectDefaultParams;
                const paramsForInstance = effectData.params ? JSON.parse(JSON.stringify(effectData.params)) : getDefaults(effectData.type);
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
        this.instrument = null; // For Synth type, Tone.MonoSynth instance
        this.sequenceLength = initialData?.sequenceLength || Constants.defaultStepsPerBar;
        let numRowsForGrid;
        if (type === 'Synth' || type === 'InstrumentSampler') numRowsForGrid = Constants.synthPitches.length;
        else if (type === 'Sampler') numRowsForGrid = this.slices.length > 0 ? this.slices.length : Constants.numSlices;
        else if (type === 'DrumSampler') numRowsForGrid = Constants.numDrumSamplerPads;
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
        this.sequence = null; // Tone.Sequence instance

        this.waveformCanvasCtx = null;
        this.instrumentWaveformCanvasCtx = null;

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
        if (this.gainNode && !this.gainNode.disposed) { try { this.gainNode.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old gainNode:`, e.message)} }
        if (this.trackMeter && !this.trackMeter.disposed) { try { this.trackMeter.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old trackMeter:`, e.message)} }

        this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
        this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        this.outputNode = this.gainNode; // Default output is the gainNode before effects

        this.rebuildEffectChain(); // Connects everything up
    }

    rebuildEffectChain() {
        if (!this.gainNode || this.gainNode.disposed) {
            console.error(`Track ${this.id} has no valid gainNode. Aborting chain rebuild.`);
            return;
        }
        if (!this.trackMeter || this.trackMeter.disposed) {
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        }

        // Determine the source(s) for this track
        let sourceNodes = [];
        if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) sourceNodes.push(this.instrument);
        else if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed) sourceNodes.push(this.toneSampler);
        else if (this.type === 'DrumSampler') sourceNodes = this.drumPadPlayers.filter(p => p && !p.disposed);
        else if (this.type === 'Sampler') {
            if (!this.slicerIsPolyphonic && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                sourceNodes.push(this.slicerMonoGain);
            }
            // For polyphonic sampler, sources are created on-the-fly and connect directly to effects/gain
        }

        // Disconnect all managed nodes to rebuild the chain
        const allManagedNodes = [
            ...sourceNodes,
            ...this.activeEffects.map(e => e.toneNode),
            this.gainNode,
            this.trackMeter
        ].filter(node => node && !node.disposed);

        allManagedNodes.forEach(node => {
            try { node.disconnect(); } catch(e) { /* ignore, might already be disconnected */ }
        });

        // Special handling for mono slicer chain (player -> envelope -> gain)
        if (this.type === 'Sampler' && !this.slicerIsPolyphonic && this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed &&
            this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed &&
            this.slicerMonoGain && !this.slicerMonoGain.disposed) {
            try { this.slicerMonoPlayer.disconnect(); } catch(e) {/*ignore*/}
            this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
            // sourceNodes will contain slicerMonoGain if it's the one to connect to effects
        }


        let currentOutput = sourceNodes.length > 0 ? (sourceNodes.length === 1 ? sourceNodes[0] : sourceNodes) : null;
        if (this.type === 'Sampler' && this.slicerIsPolyphonic) {
            // For polyphonic sampler, there's no single source node to chain from here.
            // Individual players created on note trigger will connect to the start of the effects chain or gain node.
            // So, the "start" of the chain for effects is effectively the gainNode if no effects,
            // or the first effect if effects exist.
            // This means effectSend needs to be robust.
            currentOutput = null; // Effects will be connected from this.gainNode if this is null
        }


        // Chain through active effects
        this.activeEffects.forEach(effectWrapper => {
            if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
                if (currentOutput) {
                    if (Array.isArray(currentOutput)) {
                        currentOutput.forEach(outNode => {
                            if (outNode && !outNode.disposed) outNode.connect(effectWrapper.toneNode);
                        });
                    } else if (currentOutput && !currentOutput.disposed) {
                        currentOutput.connect(effectWrapper.toneNode);
                    }
                }
                currentOutput = effectWrapper.toneNode;
            }
        });

        // Connect the end of the source/effects chain to the track's main gain node
        if (currentOutput) {
            if (Array.isArray(currentOutput)) {
                currentOutput.forEach(outNode => {
                    if (outNode && !outNode.disposed) outNode.connect(this.gainNode);
                });
            } else if (currentOutput && !currentOutput.disposed) {
                currentOutput.connect(this.gainNode);
            }
        } else if (sourceNodes.length === 0 && this.type !== 'Sampler' && this.type !== 'DrumSampler') {
            // If there's no source (e.g. an empty synth before instrument is created, or an empty sampler)
            // and no effects, there's nothing to connect to gainNode yet.
            // For Sampler/DrumSampler, sources are dynamic, so this is fine.
        }


        // Connect gain node to track meter
        if (this.gainNode && !this.gainNode.disposed && this.trackMeter && !this.trackMeter.disposed) {
            this.gainNode.connect(this.trackMeter);
        }

        // Connect track meter (or gainNode if no meter) to the master effects bus input
        const masterBusInput = this.appServices.getMasterEffectsBusInputNode ? this.appServices.getMasterEffectsBusInputNode() : null;
        const finalTrackOutput = (this.trackMeter && !this.trackMeter.disposed) ? this.trackMeter : this.gainNode;

        if (finalTrackOutput && !finalTrackOutput.disposed && masterBusInput && !masterBusInput.disposed) {
            finalTrackOutput.connect(masterBusInput);
        } else if (finalTrackOutput && !finalTrackOutput.disposed) {
            // Fallback to Tone.getDestination() if master bus isn't available (should ideally not happen in full setup)
            console.warn(`[Track ${this.id}] Master effects bus input not available. Connecting directly to destination.`);
            finalTrackOutput.toDestination();
        }

        this.applyMuteState();
        this.applySoloState();
    }


    addEffect(effectType) {
        const AVAILABLE_EFFECTS_LOCAL = this.appServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
        const getEffectDefaultParamsLocal = this.appServices.effectsRegistryAccess?.getEffectDefaultParams || getEffectDefaultParams;

        if (!AVAILABLE_EFFECTS_LOCAL[effectType]) {
            console.warn(`[Track ${this.id}] Effect type "${effectType}" not found in registry.`);
            if (this.appServices.showNotification) this.appServices.showNotification(`Effect type "${effectType}" not found.`, 3000);
            return;
        }
        const defaultParams = getEffectDefaultParamsLocal(effectType);
        const toneNode = createEffectInstance(effectType, defaultParams); // createEffectInstance is from effectsRegistry.js

        if (toneNode) {
            const effectId = `effect-${this.id}-${effectType}-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
            this.activeEffects.push({
                id: effectId, type: effectType, toneNode: toneNode, params: JSON.parse(JSON.stringify(defaultParams))
            });
            this.rebuildEffectChain();
            if (this.appServices.updateTrackUI) {
                this.appServices.updateTrackUI(this.id, 'effectsListChanged');
            }
        } else {
            console.warn(`[Track ${this.id}] Could not create Tone.js instance for effect ${effectType}`);
            if (this.appServices.showNotification) this.appServices.showNotification(`Could not create effect: ${effectType}`, 3000);
        }
    }

    removeEffect(effectId) {
        const effectIndex = this.activeEffects.findIndex(e => e.id === effectId);
        if (effectIndex > -1) {
            const effectToRemove = this.activeEffects[effectIndex];
            if (effectToRemove.toneNode && !effectToRemove.toneNode.disposed) {
                try {
                    effectToRemove.toneNode.dispose();
                } catch (e) {
                    console.warn(`[Track ${this.id}] Error disposing effect node:`, e);
                }
            }
            this.activeEffects.splice(effectIndex, 1);
            this.rebuildEffectChain();
            if (this.appServices.updateTrackUI) {
                this.appServices.updateTrackUI(this.id, 'effectsListChanged');
            }
        }
    }

    updateEffectParam(effectId, paramPath, value) {
        const effectWrapper = this.activeEffects.find(e => e.id === effectId);
        if (!effectWrapper || !effectWrapper.toneNode || effectWrapper.toneNode.disposed) {
            console.warn(`[Track ${this.id}] Effect ${effectId} not found or disposed for param update.`);
            return;
        }

        // Update the stored params in the track's state
        const keys = paramPath.split('.');
        let currentStoredParamLevel = effectWrapper.params;
        for (let i = 0; i < keys.length - 1; i++) {
            currentStoredParamLevel[keys[i]] = currentStoredParamLevel[keys[i]] || {};
            currentStoredParamLevel = currentStoredParamLevel[keys[i]];
        }
        currentStoredParamLevel[keys[keys.length - 1]] = value;

        // Update the actual Tone.js node parameter
        try {
            let targetObject = effectWrapper.toneNode;
            for (let i = 0; i < keys.length - 1; i++) {
                targetObject = targetObject[keys[i]];
                if (typeof targetObject === 'undefined') {
                    throw new Error(`Nested object for path "${keys.slice(0, i + 1).join('.')}" not found on Tone node.`);
                }
            }
            const finalParamKey = keys[keys.length - 1];
            const paramInstance = targetObject[finalParamKey];

            if (typeof paramInstance !== 'undefined') {
                if (paramInstance && typeof paramInstance.value !== 'undefined' && typeof paramInstance.rampTo === 'function') { // Tone.Signal or Tone.Param
                    paramInstance.rampTo(value, 0.02); // Smooth ramp
                } else if (paramInstance && typeof paramInstance.value !== 'undefined') { // Fallback for simple .value assignment
                    paramInstance.value = value;
                }
                 else { // Direct assignment for other types of parameters (e.g., filter type string)
                    targetObject[finalParamKey] = value;
                }
            } else if (typeof effectWrapper.toneNode.set === 'function' && keys.length > 0) {
                // Fallback for complex objects if .set is available and appropriate
                const setObj = {};
                let currentLevelForSet = setObj;
                for(let i = 0; i < keys.length - 1; i++){
                    currentLevelForSet[keys[i]] = {};
                    currentLevelForSet = currentLevelForSet[keys[i]];
                }
                currentLevelForSet[finalParamKey] = value;
                effectWrapper.toneNode.set(setObj);
            } else {
                console.warn(`[Track ${this.id}] Could not set parameter ${paramPath} on effect ${effectWrapper.type}. Parameter instance not found or not settable.`);
            }
        } catch (err) {
            console.error(`[Track ${this.id}] Error updating param ${paramPath} for effect ${effectWrapper.type}:`, err, "Value:", value);
        }
    }

    reorderEffect(effectId, newIndex) {
        const oldIndex = this.activeEffects.findIndex(e => e.id === effectId);
        if (oldIndex === -1) return;

        newIndex = Math.max(0, Math.min(newIndex, this.activeEffects.length - 1));
        if (oldIndex === newIndex) return;

        const [effectToMove] = this.activeEffects.splice(oldIndex, 1);
        this.activeEffects.splice(newIndex, 0, effectToMove);
        this.rebuildEffectChain();

        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'effectsListChanged');
        }
    }

    async fullyInitializeAudioResources() {
        if (!this.gainNode || this.gainNode.disposed) {
            await this.initializeAudioNodes();
        }

        try {
            if (this.type === 'Synth') {
                await this.initializeInstrument();
            } else if (this.type === 'Sampler') {
                if (this.samplerAudioData && (this.samplerAudioData.dbKey || this.samplerAudioData.audioBufferDataURL)) {
                    let audioFile;
                    if (this.samplerAudioData.dbKey) {
                        audioFile = await getAudio(this.samplerAudioData.dbKey);
                    } else if (this.samplerAudioData.audioBufferDataURL) {
                        // Convert data URL to Blob for Tone.Buffer
                        const response = await fetch(this.samplerAudioData.audioBufferDataURL);
                        audioFile = await response.blob();
                    }

                    if (audioFile) {
                        const objectURL = URL.createObjectURL(audioFile);
                        this.audioBuffer = await new Tone.Buffer().load(objectURL);
                        URL.revokeObjectURL(objectURL);
                        this.samplerAudioData.status = 'loaded';
                        if (!this.slicerIsPolyphonic) this.setupSlicerMonoNodes();
                         if (this.appServices.autoSliceSample && this.audioBuffer.loaded && this.slices.every(s => s.duration === 0)) {
                            this.appServices.autoSliceSample(this.id);
                        }
                    } else {
                        this.samplerAudioData.status = this.samplerAudioData.dbKey ? 'missing_db' : 'error';
                        throw new Error("Audio file not found in DB or data URL invalid.");
                    }
                }
            } else if (this.type === 'DrumSampler') {
                for (let i = 0; i < this.drumSamplerPads.length; i++) {
                    const pad = this.drumSamplerPads[i];
                    if (pad.dbKey || pad.audioBufferDataURL) {
                        let audioFile;
                        if (pad.dbKey) {
                            audioFile = await getAudio(pad.dbKey);
                        } else if (pad.audioBufferDataURL) {
                            const response = await fetch(pad.audioBufferDataURL);
                            audioFile = await response.blob();
                        }

                        if (audioFile) {
                            const objectURL = URL.createObjectURL(audioFile);
                            pad.audioBuffer = await new Tone.Buffer().load(objectURL);
                            URL.revokeObjectURL(objectURL);
                            if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) this.drumPadPlayers[i].dispose();
                            this.drumPadPlayers[i] = new Tone.Player(pad.audioBuffer);
                            pad.status = 'loaded';
                        } else {
                            pad.status = pad.dbKey ? 'missing_db' : 'error';
                        }
                    }
                }
            } else if (this.type === 'InstrumentSampler') {
                if (this.instrumentSamplerSettings.dbKey || this.instrumentSamplerSettings.audioBufferDataURL) {
                    let audioFile;
                     if (this.instrumentSamplerSettings.dbKey) {
                        audioFile = await getAudio(this.instrumentSamplerSettings.dbKey);
                    } else if (this.instrumentSamplerSettings.audioBufferDataURL) {
                        const response = await fetch(this.instrumentSamplerSettings.audioBufferDataURL);
                        audioFile = await response.blob();
                    }
                    if (audioFile) {
                        const objectURL = URL.createObjectURL(audioFile);
                        this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(objectURL);
                        URL.revokeObjectURL(objectURL);
                        this.instrumentSamplerSettings.status = 'loaded';
                    } else {
                        this.instrumentSamplerSettings.status = this.instrumentSamplerSettings.dbKey ? 'missing_db' : 'error';
                    }
                }
                this.setupToneSampler();
            }
        } catch (error) {
            console.error(`[Track ${this.id}] Error initializing audio resources for ${this.type}:`, error);
            if (this.appServices.showNotification) this.appServices.showNotification(`Error loading audio for ${this.name}: ${error.message}`, 4000);
            // Set appropriate status for UI update
            if (this.type === 'Sampler') this.samplerAudioData.status = 'error';
            else if (this.type === 'InstrumentSampler') this.instrumentSamplerSettings.status = 'error';
            // For DrumSampler, individual pad statuses are set within the loop
            if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sampleLoadError');
        }

        this.setSequenceLength(this.sequenceLength, true); // true to skip undo capture
        this.rebuildEffectChain();
    }

    async initializeInstrument() {
        if (this.type === 'Synth') {
            if (this.instrument && !this.instrument.disposed) {
                this.instrument.dispose();
            }
            this.instrument = new Tone.MonoSynth(this.synthParams);
            this.rebuildEffectChain(); // Connect new instrument
        }
    }

    setupSlicerMonoNodes() {
        this.disposeSlicerMonoNodes(); // Clean up existing nodes
        if (!this.slicerIsPolyphonic) {
            this.slicerMonoPlayer = new Tone.Player();
            this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
            this.slicerMonoGain = new Tone.Gain();
            // The actual connection to the effects chain or output happens in rebuildEffectChain
            // This just sets up the internal player -> envelope -> gain chain for the mono slicer.
            this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);

            if (this.audioBuffer && this.audioBuffer.loaded) {
                this.slicerMonoPlayer.buffer = this.audioBuffer;
            }
        }
    }
    disposeSlicerMonoNodes() {
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) { this.slicerMonoPlayer.dispose(); }
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) { this.slicerMonoEnvelope.dispose(); }
        if (this.slicerMonoGain && !this.slicerMonoGain.disposed) { this.slicerMonoGain.dispose(); }
        this.slicerMonoPlayer = null; this.slicerMonoEnvelope = null; this.slicerMonoGain = null;
    }

    setupToneSampler() {
        if (this.type === 'InstrumentSampler') {
            if (this.toneSampler && !this.toneSampler.disposed) {
                this.toneSampler.dispose();
            }
            if (this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
                const urls = {};
                urls[this.instrumentSamplerSettings.rootNote || 'C4'] = this.instrumentSamplerSettings.audioBuffer;
                try {
                    this.toneSampler = new Tone.Sampler({
                        urls: urls,
                        attack: this.instrumentSamplerSettings.envelope.attack,
                        release: this.instrumentSamplerSettings.envelope.release,
                        onload: () => {
                            if (this.toneSampler && !this.toneSampler.disposed) {
                                this.toneSampler.loop = this.instrumentSamplerSettings.loop;
                                this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart;
                                this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd;
                            }
                        }
                    });
                    this.rebuildEffectChain(); // Connect new sampler
                } catch (e) {
                    console.error(`[Track ${this.id}] Error creating Tone.Sampler:`, e);
                    if (this.appServices.showNotification) this.appServices.showNotification(`Error creating instrument sampler for ${this.name}.`, 3000);
                    this.toneSampler = null;
                }
            } else {
                 this.toneSampler = null;
            }
        }
    }

    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = volume;
        if (this.gainNode && !this.gainNode.disposed && !this.isMuted) {
            this.gainNode.gain.setValueAtTime(volume, Tone.now());
        }
        // if (fromInteraction && this.appServices.captureStateForUndo) {
        // this.appServices.captureStateForUndo(`Set Volume for ${this.name} to ${volume.toFixed(2)}`);
        // }
    }

    applyMuteState() {
        if (this.gainNode && !this.gainNode.disposed) {
            const currentSoloedId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
            const isEffectivelyMuted = this.isMuted || (currentSoloedId !== null && !this.isSoloed);
            this.gainNode.gain.cancelScheduledValues(Tone.now());
            this.gainNode.gain.rampTo(isEffectivelyMuted ? 0 : this.previousVolumeBeforeMute, 0.01);
        }
    }

    applySoloState() {
        // Soloing one track effectively mutes others (unless they are also soloed, though typical DAWs allow only one solo at a time or group solo)
        // This logic is handled by iterating all tracks in main.js/state.js when solo changes.
        // This function just ensures this track's mute state is correctly applied based on global solo state.
        this.applyMuteState();
    }

    setSynthParam(paramPath, value) {
        if (this.type !== 'Synth' || !this.instrument || this.instrument.disposed) return;
        try {
            const keys = paramPath.split('.');
            let target = this.instrument;
            let paramsTarget = this.synthParams; // Store in serializable params

            for (let i = 0; i < keys.length - 1; i++) {
                target = target[keys[i]];
                paramsTarget[keys[i]] = paramsTarget[keys[i]] || {};
                paramsTarget = paramsTarget[keys[i]];
            }
            const finalKey = keys[keys.length - 1];
            paramsTarget[finalKey] = value; // Update state

            // Update Tone.js object
            if (target && target[finalKey] && typeof target[finalKey].setValueAtTime === 'function') { // Tone.Param
                target[finalKey].setValueAtTime(value, Tone.now());
            } else if (target && typeof target[finalKey] !== 'undefined' && typeof target[finalKey].value !== 'undefined') { // Tone.Signal or similar
                 target[finalKey].value = value;
            }
            else if (target && typeof target[finalKey] !== 'undefined') { // Direct property (e.g. oscillator.type)
                target[finalKey] = value;
            } else if (typeof target.set === 'function') { // Fallback for complex objects
                const setObj = {};
                let currentLevel = setObj;
                keys.forEach((k, idx) => {
                    if (idx === keys.length -1) currentLevel[k] = value;
                    else { currentLevel[k] = {}; currentLevel = currentLevel[k];}
                });
                target.set(setObj);
            }

        } catch (e) {
            console.error(`[Track ${this.id}] Error setting synth param ${paramPath} to ${value}:`, e);
        }
    }

    setSliceVolume(sliceIndex, volume) {
        if (this.slices[sliceIndex]) this.slices[sliceIndex].volume = parseFloat(volume);
    }
    setSlicePitchShift(sliceIndex, semitones) {
        if (this.slices[sliceIndex]) this.slices[sliceIndex].pitchShift = parseInt(semitones);
    }
    setSliceLoop(sliceIndex, loop) {
        if (this.slices[sliceIndex]) this.slices[sliceIndex].loop = !!loop;
    }
    setSliceReverse(sliceIndex, reverse) {
        if (this.slices[sliceIndex]) this.slices[sliceIndex].reverse = !!reverse;
    }
    setSliceEnvelopeParam(sliceIndex, param, value) {
        if (this.slices[sliceIndex] && this.slices[sliceIndex].envelope) {
            this.slices[sliceIndex].envelope[param] = parseFloat(value);
        }
    }

    setDrumSamplerPadVolume(padIndex, volume) {
        if (this.drumSamplerPads[padIndex]) this.drumSamplerPads[padIndex].volume = parseFloat(volume);
    }
    setDrumSamplerPadPitch(padIndex, pitch) {
        if (this.drumSamplerPads[padIndex]) this.drumSamplerPads[padIndex].pitchShift = parseInt(pitch);
    }
    setDrumSamplerPadEnv(padIndex, param, value) {
        if (this.drumSamplerPads[padIndex] && this.drumSamplerPads[padIndex].envelope) {
            this.drumSamplerPads[padIndex].envelope[param] = parseFloat(value);
        }
    }

    setInstrumentSamplerRootNote(noteName) {
        this.instrumentSamplerSettings.rootNote = noteName;
        this.setupToneSampler(); // Re-initialize Tone.Sampler with new root note mapping
    }
    setInstrumentSamplerLoop(loop) {
        this.instrumentSamplerSettings.loop = !!loop;
        if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.loop = this.instrumentSamplerSettings.loop;
    }
    setInstrumentSamplerLoopStart(time) {
        this.instrumentSamplerSettings.loopStart = parseFloat(time);
        if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart;
    }
    setInstrumentSamplerLoopEnd(time) {
        this.instrumentSamplerSettings.loopEnd = parseFloat(time);
        if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd;
    }
    setInstrumentSamplerEnv(param, value) {
        this.instrumentSamplerSettings.envelope[param] = parseFloat(value);
        if (this.toneSampler && !this.toneSampler.disposed) {
            if (param === 'attack' && typeof this.toneSampler.attack !== 'undefined') this.toneSampler.attack = value;
            if (param === 'release' && typeof this.toneSampler.release !== 'undefined') this.toneSampler.release = value;
            // Note: Tone.Sampler's main envelope is attack/release. Sustain/Decay are not direct top-level params.
            // For more complex envelopes, one might wrap Tone.Sampler in a Tone.AmplitudeEnvelope.
        }
    }

    _captureUndoState(description) {
        if (this.appServices.captureStateForUndo) {
            this.appServices.captureStateForUndo(description);
        }
    }

    doubleSequence() {
        this._captureUndoState(`Double Sequence Length for ${this.name}`);

        const oldLength = this.sequenceLength;
        const newLength = oldLength * 2;
        if (newLength > (Constants.MAX_BARS * Constants.STEPS_PER_BAR) ) {
            if(this.appServices.showNotification) this.appServices.showNotification(`Cannot double length, exceeds maximum of ${Constants.MAX_BARS} bars.`, 3000);
            return;
        }


        this.sequenceData.forEach(row => {
            if(row) {
               const copyOfOriginal = row.slice(0, oldLength);
               row.length = newLength; // Resize the array, new elements will be undefined
               // Fill new part with nulls first
               for(let i = oldLength; i < newLength; i++) {
                   row[i] = null;
               }
               // Copy the original first half to the new second half
               for(let i = 0; i < oldLength; i++) {
                   if (copyOfOriginal[i]) { // Only copy if there's actual data
                       row[oldLength + i] = JSON.parse(JSON.stringify(copyOfOriginal[i]));
                   }
               }
            }
        });

        this.setSequenceLength(newLength, true); // skipUndoCapture = true, as we already did
         if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
    }

    setSequenceLength(newLengthInSteps, skipUndoCapture = false) {
        const oldActualLength = this.sequenceLength;
        newLengthInSteps = Math.max(Constants.STEPS_PER_BAR, parseInt(newLengthInSteps) || Constants.defaultStepsPerBar);
        newLengthInSteps = Math.ceil(newLengthInSteps / Constants.STEPS_PER_BAR) * Constants.STEPS_PER_BAR;
        newLengthInSteps = Math.min(newLengthInSteps, Constants.MAX_BARS * Constants.STEPS_PER_BAR);


        if (!skipUndoCapture && oldActualLength !== newLengthInSteps) {
            this._captureUndoState(`Set Seq Length for ${this.name} to ${newLengthInSteps / Constants.STEPS_PER_BAR} bars`);
        }
        this.sequenceLength = newLengthInSteps;
        let numRows;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRows = Constants.synthPitches.length;
        else if (this.type === 'Sampler') numRows = this.slices.length > 0 ? this.slices.length : Constants.numSlices;
        else if (this.type === 'DrumSampler') numRows = Constants.numDrumSamplerPads;
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
            const currentGlobalSoloId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
            const isEffectivelyMuted = this.isMuted || (currentGlobalSoloId !== null && currentGlobalSoloId !== this.id);

            if (this.appServices.highlightPlayingStep) {
                 this.appServices.highlightPlayingStep(this.id, col);
            }

            if (!this.gainNode || this.gainNode.disposed || isEffectivelyMuted) {
                return;
            }

            // Determine the audio destination for triggered notes/samples
            // It should be the start of this track's effects chain, or its gainNode if no effects.
            const effectsChainStartPoint = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                ? this.activeEffects[0].toneNode
                : this.gainNode;


            if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
                 Constants.synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active) this.instrument.triggerAttackRelease(pitchName, "8n", time, step.velocity * Constants.defaultVelocity);
                });
            } else if (this.type === 'Sampler') {
                this.slices.forEach((sliceData, sliceIndex) => {
                    const step = this.sequenceData[sliceIndex]?.[col];
                    if (step?.active && sliceData?.duration > 0 && this.audioBuffer?.loaded) {
                        const playbackRate = Math.pow(2, (sliceData.pitchShift || 0) / 12);
                        let playDuration = sliceData.duration / playbackRate;
                        if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds(); // Loop for the duration of a step

                        if (this.slicerIsPolyphonic) {
                            const tempPlayer = new Tone.Player(this.audioBuffer);
                            const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                            const tempGain = new Tone.Gain(step.velocity * sliceData.volume);
                            // Polyphonic players connect to the start of the track's effect chain or its gain node
                            tempPlayer.chain(tempEnv, tempGain, effectsChainStartPoint);
                            tempPlayer.playbackRate = playbackRate; tempPlayer.reverse = sliceData.reverse; tempPlayer.loop = sliceData.loop;
                            tempPlayer.loopStart = sliceData.offset; tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
                            tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            tempEnv.triggerAttack(time);
                            if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95); // Slightly early for natural decay
                            // Schedule disposal of temporary nodes
                            Tone.Transport.scheduleOnce(() => { if(tempPlayer && !tempPlayer.disposed) tempPlayer.dispose(); if(tempEnv && !tempEnv.disposed) tempEnv.dispose(); if(tempGain && !tempGain.disposed) tempGain.dispose(); }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);
                        } else if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                            // Ensure mono slicer output is connected to the track's effect chain start
                            if (this.slicerMonoGain.numberOfOutputs === 0 || !this.slicerMonoGain.connectedTo(effectsChainStartPoint)) {
                                try { this.slicerMonoGain.disconnect(); } catch(e) {/*ignore*/}
                                this.slicerMonoGain.connect(effectsChainStartPoint);
                            }

                            if (this.slicerMonoPlayer.state === 'started') this.slicerMonoPlayer.stop(time);
                            this.slicerMonoEnvelope.triggerRelease(time); // Release previous note

                            this.slicerMonoPlayer.buffer = this.audioBuffer;
                            this.slicerMonoEnvelope.set(sliceData.envelope);
                            this.slicerMonoGain.gain.value = step.velocity * sliceData.volume;
                            this.slicerMonoPlayer.playbackRate = playbackRate;
                            this.slicerMonoPlayer.reverse = sliceData.reverse;
                            this.slicerMonoPlayer.loop = sliceData.loop;
                            this.slicerMonoPlayer.loopStart = sliceData.offset;
                            this.slicerMonoPlayer.loopEnd = sliceData.offset + sliceData.duration;

                            this.slicerMonoPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            this.slicerMonoEnvelope.triggerAttack(time);
                            if (!sliceData.loop) {
                                const releaseTime = time + playDuration - (sliceData.envelope.release * 0.05); // Slightly earlier release
                                this.slicerMonoEnvelope.triggerRelease(Math.max(time, releaseTime));
                            }
                        }
                    }
                });
            } else if (this.type === 'DrumSampler') {
                Array.from({ length: Constants.numDrumSamplerPads }).forEach((_, padIndex) => {
                    const step = this.sequenceData[padIndex]?.[col];
                    const padData = this.drumSamplerPads[padIndex];
                    if (step?.active && padData && this.drumPadPlayers[padIndex]?.loaded) {
                        const player = this.drumPadPlayers[padIndex];
                        // Ensure player is connected to the track's output path
                        if (player.numberOfOutputs === 0 || !player.connectedTo(effectsChainStartPoint)) {
                            try { player.disconnect(); } catch(e) {/*ignore*/}
                            player.connect(effectsChainStartPoint);
                        }
                        player.volume.value = Tone.gainToDb(padData.volume * step.velocity);
                        player.playbackRate = Math.pow(2, (padData.pitchShift || 0) / 12);
                        player.start(time);
                    }
                });
            } else if (this.type === 'InstrumentSampler' && this.toneSampler?.loaded) {
                 let notePlayedThisStepInColumn = false;
                 Constants.synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active) {
                        if (!this.instrumentSamplerIsPolyphonic && !notePlayedThisStepInColumn) {
                            this.toneSampler.releaseAll(time);
                            notePlayedThisStepInColumn = true;
                        }
                        this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "8n", time, step.velocity * Constants.defaultVelocity);
                    }
                });
            }
        }, Array.from(Array(this.sequenceLength).keys()), "16n").start(0);

        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
    }

    dispose() {
        if (this.sequence && !this.sequence.disposed) { this.sequence.stop(); this.sequence.clear(); this.sequence.dispose(); }
        if (this.instrument && !this.instrument.disposed) { this.instrument.dispose(); }
        if (this.toneSampler && !this.toneSampler.disposed) { this.toneSampler.dispose(); }
        this.disposeSlicerMonoNodes();
        this.drumPadPlayers.forEach(player => { if (player && !player.disposed) player.dispose(); });
        this.activeEffects.forEach(effect => { if (effect.toneNode && !effect.toneNode.disposed) effect.toneNode.dispose(); });
        if (this.gainNode && !this.gainNode.disposed) { this.gainNode.dispose(); }
        if (this.trackMeter && !this.trackMeter.disposed) { this.trackMeter.dispose(); }

        if (this.appServices.closeAllTrackWindows) { // Changed from closeTrackWindows
            this.appServices.closeAllTrackWindows(this.id);
        }

        this.audioBuffer = null;
        this.drumSamplerPads.forEach(p => p.audioBuffer = null);
        if (this.instrumentSamplerSettings) this.instrumentSamplerSettings.audioBuffer = null;
    }
}
