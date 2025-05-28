// js/Track.js - Track Class Module

import { STEPS_PER_BAR, defaultStepsPerBar, synthPitches, numSlices, numDrumSamplerPads, samplerMIDINoteStart, defaultVelocity } from './constants.js';
import { createEffectInstance, getEffectDefaultParams, AVAILABLE_EFFECTS } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';

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
        this.outputNode = this.gainNode; // Initially, output is just the gainNode

        // This will connect the gainNode to the meter and then to the master bus
        // and also set up the instrument/players and connect them through effects to the gainNode.
        this.rebuildEffectChain();
    }

    rebuildEffectChain() {
        console.log(`[Track ${this.id} - rebuildEffectChain V6 PolyFix] Rebuilding. SlicerPoly: ${this.slicerIsPolyphonic}, Type: ${this.type}`);

        // Ensure core nodes exist
        if (!this.gainNode || this.gainNode.disposed) {
            console.warn(`[Track ${this.id}] GainNode was invalid, recreating.`);
            this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
        }
        if (!this.trackMeter || this.trackMeter.disposed) {
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        }

        // Disconnect all relevant internal nodes from their previous connections
        const nodesToDisconnect = [
            this.instrument, this.toneSampler,
            this.slicerMonoPlayer, // This is the player part of the mono chain
            // this.slicerMonoEnvelope, // Internal to mono chain, P->E->G
            this.slicerMonoGain,     // This is the output of the mono chain
            ...this.drumPadPlayers,
            ...this.activeEffects.map(e => e.toneNode),
            this.gainNode // Also disconnect gainNode from whatever it was previously connected to
        ].filter(node => node && !node.disposed);

        nodesToDisconnect.forEach(node => {
            try {
                node.disconnect();
                // console.log(`[Track ${this.id}] Disconnected ${node.constructor.name || 'node'}`);
            } catch (e) { /* ignore errors, node might not have been connected */ }
        });
        console.log(`[Track ${this.id}] Disconnected relevant nodes.`);


        // Determine the primary source output(s) for this track
        let sourceOutputs = [];
        if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
            sourceOutputs.push(this.instrument);
        } else if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed) {
            sourceOutputs.push(this.toneSampler);
        } else if (this.type === 'Sampler' && !this.slicerIsPolyphonic) {
            // For mono slicer, ensure the internal chain is correct and get the output gain
            if (!this.slicerMonoPlayer || this.slicerMonoPlayer.disposed ||
                !this.slicerMonoEnvelope || this.slicerMonoEnvelope.disposed ||
                !this.slicerMonoGain || this.slicerMonoGain.disposed) {
                console.log(`[Track ${this.id}] Mono slicer nodes invalid/missing, re-setting up.`);
                this.setupSlicerMonoNodes(); // Recreates and chains P->E->G internally
            } else { // Ensure internal chain P->E->G is correct if nodes exist
                try { this.slicerMonoPlayer.disconnect(); } catch(e){}
                this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
                 console.log(`[Track ${this.id}] Mono slicer nodes existed, re-chained P->E->G.`);
            }
            if (this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                sourceOutputs.push(this.slicerMonoGain);
                 console.log(`[Track ${this.id}] Mono Slicer: sourceOutput is slicerMonoGain.`);
            } else {
                console.warn(`[Track ${this.id}] Mono slicer output (slicerMonoGain) is invalid after setup attempt.`);
            }
        } else if (this.type === 'DrumSampler') {
            this.drumPadPlayers.forEach((player, idx) => {
                if (player && !player.disposed) {
                    sourceOutputs.push(player);
                }
            });
        }
        // Polyphonic Sampler players are connected dynamically within the sequence callback. They don't have a persistent sourceOutput here.

        // Define the input point of the effects chain (or track's gain node if no effects)
        let effectsChainStartNode = this.gainNode; // Default to gainNode if no effects
        if (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed) {
            effectsChainStartNode = this.activeEffects[0].toneNode;
        }

        // Connect sourceOutputs to the start of the effects chain (or gainNode if no effects)
        sourceOutputs.forEach(source => {
            if (source && !source.disposed && effectsChainStartNode && !effectsChainStartNode.disposed) {
                try {
                    source.connect(effectsChainStartNode);
                    console.log(`[Track ${this.id}] Connected source (${source.constructor.name}) to effects/gain start (${effectsChainStartNode.constructor.name})`);
                } catch (e) {
                    console.error(`[Track ${this.id}] Error connecting source ${source.constructor.name} to ${effectsChainStartNode.constructor.name}:`, e);
                }
            }
        });

        // Chain active effects together
        let currentConnectionPoint = effectsChainStartNode; // Start from where sources were connected
        for (let i = 0; i < this.activeEffects.length; i++) {
            const effectWrapper = this.activeEffects[i];
            if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
                if (i === 0) { // The first effect in the chain is already `effectsChainStartNode` (if effects exist)
                    // If sources connected directly to it, we don't need to re-connect currentConnectionPoint to itself.
                    // If there were no sources but there are effects, currentConnectionPoint might still be gainNode.
                    // This logic needs to ensure the first effect *becomes* the currentConnectionPoint.
                    currentConnectionPoint = effectWrapper.toneNode;
                } else {
                    // For subsequent effects, connect the previous one to the current one
                    const previousEffectNode = this.activeEffects[i-1].toneNode;
                    if (previousEffectNode && !previousEffectNode.disposed) {
                         try {
                            previousEffectNode.connect(effectWrapper.toneNode);
                            console.log(`[Track ${this.id}] Chained effect ${this.activeEffects[i-1].type} to ${effectWrapper.type}`);
                            currentConnectionPoint = effectWrapper.toneNode; // Update connection point
                        } catch(e) {
                            console.error(`[Track ${this.id}] Error chaining ${this.activeEffects[i-1].type} to ${effectWrapper.type}:`, e);
                        }
                    }
                }
            }
        }


        // Connect the output of the effects chain (which is currentConnectionPoint if effects existed)
        // or the original effectsChainStartNode (if no effects, this is gainNode) to the gainNode
        // This step is tricky: if effectsChainStartNode was gainNode, and currentConnectionPoint is also gainNode (no effects), do nothing.
        // If there were effects, currentConnectionPoint is the last effect. Connect it to gainNode.
        if (this.activeEffects.length > 0) {
            const lastEffectNode = this.activeEffects[this.activeEffects.length - 1].toneNode;
            if (lastEffectNode && !lastEffectNode.disposed && this.gainNode && !this.gainNode.disposed) {
                if (lastEffectNode !== this.gainNode) { // Avoid connecting gainNode to itself if it was the only thing
                     try {
                        lastEffectNode.connect(this.gainNode);
                        console.log(`[Track ${this.id}] Connected last effect (${lastEffectNode.constructor.name}) to GainNode.`);
                    } catch (e) {
                        console.error(`[Track ${this.id}] Error connecting last effect to GainNode:`, e);
                    }
                }
            }
        }
        // If no effects, sourceOutputs were connected directly to gainNode (as effectsChainStartNode was gainNode).

        // Final connections for the track's gain node
        if (this.gainNode && !this.gainNode.disposed) {
            this.outputNode = this.gainNode; // Track's final output point before master
            if (this.trackMeter && !this.trackMeter.disposed) {
                try {
                    this.gainNode.connect(this.trackMeter);
                    console.log(`[Track ${this.id}] GainNode connected to TrackMeter.`);
                } catch(e){ console.error(`[Track ${this.id}] Error connecting GainNode to TrackMeter:`, e); }
            }

            const finalDestination = (window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed)
                                     ? window.masterEffectsBusInput
                                     : Tone.getDestination();
            try {
                this.gainNode.connect(finalDestination);
                console.log(`[Track ${this.id}] GainNode connected to ${finalDestination === window.masterEffectsBusInput ? 'Master Bus Input' : 'Tone Destination'}.`);
            } catch(e){ console.error(`[Track ${this.id}] Error connecting GainNode to final destination:`, e); }
        } else {
            this.outputNode = null;
            console.error(`[Track ${this.id}] GainNode is invalid at end of rebuild. Output will be silent.`);
        }
        this.applyMuteState(); // Re-apply mute state as gain might have been recreated
        this.applySoloState(); // Re-apply solo state
        console.log(`[Track ${this.id}] rebuildEffectChain finished. Output node: ${this.outputNode?.constructor.name}.`);
    }


    addEffect(effectType) {
        if (!AVAILABLE_EFFECTS[effectType]) {
            console.warn(`[Track ${this.id}] Effect type "${effectType}" not found in registry.`);
            return;
        }
        const defaultParams = getEffectDefaultParams(effectType);
        const toneNode = createEffectInstance(effectType, defaultParams);

        if (toneNode) {
            const effectId = `effect-${this.id}-${effectType}-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
            this.activeEffects.push({
                id: effectId, type: effectType, toneNode: toneNode, params: JSON.parse(JSON.stringify(defaultParams))
            });
            this.rebuildEffectChain();
            if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
            // If effects rack window is open, update it
            if (this.effectsRackWindow && this.effectsRackWindow.element && typeof window.renderEffectsList === 'function') {
                const listDiv = this.effectsRackWindow.element.querySelector(`#effectsList-${this.id}`);
                const controlsContainer = this.effectsRackWindow.element.querySelector(`#effectControlsContainer-${this.id}`);
                window.renderEffectsList(this, 'track', listDiv, controlsContainer);
            }
        } else {
            console.warn(`[Track ${this.id}] Could not create Tone.js instance for effect ${effectType}`);
        }
    }

    removeEffect(effectId) {
        const effectIndex = this.activeEffects.findIndex(e => e.id === effectId);
        if (effectIndex > -1) {
            const effectToRemove = this.activeEffects[effectIndex];
            if (effectToRemove.toneNode && !effectToRemove.toneNode.disposed) {
                effectToRemove.toneNode.dispose();
            }
            this.activeEffects.splice(effectIndex, 1);
            this.rebuildEffectChain();
            if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
            // If effects rack window is open, update it
            if (this.effectsRackWindow && this.effectsRackWindow.element && typeof window.renderEffectsList === 'function') {
                const listDiv = this.effectsRackWindow.element.querySelector(`#effectsList-${this.id}`);
                const controlsContainer = this.effectsRackWindow.element.querySelector(`#effectControlsContainer-${this.id}`);
                window.renderEffectsList(this, 'track', listDiv, controlsContainer);
                controlsContainer.innerHTML = ''; // Clear controls for removed effect
            }
        }
    }

    updateEffectParam(effectId, paramPath, value) {
        const effectWrapper = this.activeEffects.find(e => e.id === effectId);
        if (!effectWrapper || !effectWrapper.toneNode || effectWrapper.toneNode.disposed) {
            console.warn(`[Track ${this.id}] Effect node not found or disposed for ID: ${effectId}`);
            return;
        }

        // Store the raw value in params
        const keys = paramPath.split('.');
        let currentStoredParamLevel = effectWrapper.params;
        for (let i = 0; i < keys.length - 1; i++) {
            currentStoredParamLevel[keys[i]] = currentStoredParamLevel[keys[i]] || {};
            currentStoredParamLevel = currentStoredParamLevel[keys[i]];
        }
        currentStoredParamLevel[keys[keys.length - 1]] = value;

        // Apply to Tone.js node
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
                if (paramInstance && typeof paramInstance.value !== 'undefined' && typeof paramInstance.rampTo === 'function') { // For Tone.Param or Tone.Signal instances
                    paramInstance.rampTo(value, 0.02); // Smooth ramp
                } else if (paramInstance && typeof paramInstance.value !== 'undefined') {
                    paramInstance.value = value;
                }
                 else { // Direct property assignment
                    targetObject[finalParamKey] = value;
                }
            } else if (typeof effectWrapper.toneNode.set === 'function') {
                // Fallback to using .set() if the direct path wasn't a settable property (e.g. top-level options)
                const setObj = {};
                let currentLevelForSet = setObj;
                for(let i = 0; i < keys.length - 1; i++){
                    currentLevelForSet[keys[i]] = {};
                    currentLevelForSet = currentLevelForSet[keys[i]];
                }
                currentLevelForSet[finalParamKey] = value;
                effectWrapper.toneNode.set(setObj);
            } else {
                console.warn(`[Track ${this.id}] Cannot set param "${paramPath}" on effect ${effectWrapper.type}. Property or .set() not available.`);
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

        if (this.effectsRackWindow && this.effectsRackWindow.element && typeof window.renderEffectsList === 'function') {
            const listDiv = this.effectsRackWindow.element.querySelector(`#effectsList-${this.id}`);
            const controlsContainer = this.effectsRackWindow.element.querySelector(`#effectControlsContainer-${this.id}`);
            window.renderEffectsList(this, 'track', listDiv, controlsContainer);
        }
    }

    async fullyInitializeAudioResources() {
        console.log(`[Track ${this.id}] fullyInitializeAudioResources called for type: ${this.type}`);
        if (!this.gainNode || this.gainNode.disposed) { // Ensure gainNode exists before anything else
            await this.initializeAudioNodes(); // This also calls rebuildEffectChain
        }

        if (this.type === 'Synth') {
            await this.initializeInstrument();
        } else if (this.type === 'Sampler') {
            if (this.samplerAudioData && this.samplerAudioData.dbKey) {
                try {
                    const file = await getAudio(this.samplerAudioData.dbKey);
                    if (file) {
                        const objectURL = URL.createObjectURL(file);
                        this.audioBuffer = await new Tone.Buffer().load(objectURL);
                        URL.revokeObjectURL(objectURL);
                        this.samplerAudioData.status = 'loaded';
                        console.log(`[Track ${this.id}] Sampler audio loaded from DB: ${this.samplerAudioData.fileName}`);
                        if (!this.slicerIsPolyphonic) this.setupSlicerMonoNodes(); // Setup mono player with buffer
                    } else { this.samplerAudioData.status = 'missing_db'; }
                } catch (e) {
                    console.error(`[Track ${this.id}] Error loading sampler audio from DB:`, e);
                    this.samplerAudioData.status = 'error';
                }
            } else if (this.samplerAudioData && this.samplerAudioData.audioBufferDataURL) { // Fallback to DataURL
                 try {
                    this.audioBuffer = await new Tone.Buffer().load(this.samplerAudioData.audioBufferDataURL);
                    this.samplerAudioData.status = 'loaded';
                     console.log(`[Track ${this.id}] Sampler audio loaded from DataURL: ${this.samplerAudioData.fileName}`);
                    if (!this.slicerIsPolyphonic) this.setupSlicerMonoNodes();
                 } catch (e) {
                     console.error(`[Track ${this.id}] Error loading sampler audio from DataURL:`,e);
                     this.samplerAudioData.status = 'error';
                 }
            }
             if (typeof window.autoSliceSample === 'function' && this.audioBuffer && this.audioBuffer.loaded && this.slices.every(s => s.duration === 0)) {
                window.autoSliceSample(this.id);
            }
        } else if (this.type === 'DrumSampler') {
            for (let i = 0; i < this.drumSamplerPads.length; i++) {
                const pad = this.drumSamplerPads[i];
                if (pad.dbKey) {
                    try {
                        const file = await getAudio(pad.dbKey);
                        if (file) {
                            const objectURL = URL.createObjectURL(file);
                            pad.audioBuffer = await new Tone.Buffer().load(objectURL);
                            URL.revokeObjectURL(objectURL);
                            if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) this.drumPadPlayers[i].dispose();
                            this.drumPadPlayers[i] = new Tone.Player(pad.audioBuffer);
                            pad.status = 'loaded';
                             console.log(`[Track ${this.id}] Drum pad ${i} audio loaded from DB: ${pad.originalFileName}`);
                        } else { pad.status = 'missing_db'; }
                    } catch (e) {
                        console.error(`[Track ${this.id}] Error loading drum pad ${i} audio from DB:`, e);
                        pad.status = 'error';
                    }
                } else if (pad.audioBufferDataURL) { // Fallback
                    try {
                        pad.audioBuffer = await new Tone.Buffer().load(pad.audioBufferDataURL);
                        if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) this.drumPadPlayers[i].dispose();
                        this.drumPadPlayers[i] = new Tone.Player(pad.audioBuffer);
                        pad.status = 'loaded';
                         console.log(`[Track ${this.id}] Drum pad ${i} audio loaded from DataURL: ${pad.originalFileName}`);
                    } catch (e) {
                        console.error(`[Track ${this.id}] Error loading drum pad ${i} audio from DataURL:`, e);
                        pad.status = 'error';
                    }
                }
            }
        } else if (this.type === 'InstrumentSampler') {
            if (this.instrumentSamplerSettings.dbKey) {
                 try {
                    const file = await getAudio(this.instrumentSamplerSettings.dbKey);
                    if (file) {
                        const objectURL = URL.createObjectURL(file);
                        this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(objectURL);
                        URL.revokeObjectURL(objectURL);
                        this.instrumentSamplerSettings.status = 'loaded';
                         console.log(`[Track ${this.id}] InstrumentSampler audio loaded from DB: ${this.instrumentSamplerSettings.originalFileName}`);
                    } else { this.instrumentSamplerSettings.status = 'missing_db';}
                 } catch (e) {
                     console.error(`[Track ${this.id}] Error loading InstrumentSampler audio from DB:`, e);
                     this.instrumentSamplerSettings.status = 'error';
                 }
            } else if (this.instrumentSamplerSettings.audioBufferDataURL) { // Fallback
                try {
                    this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(this.instrumentSamplerSettings.audioBufferDataURL);
                    this.instrumentSamplerSettings.status = 'loaded';
                     console.log(`[Track ${this.id}] InstrumentSampler audio loaded from DataURL: ${this.instrumentSamplerSettings.originalFileName}`);
                } catch (e) {
                    console.error(`[Track ${this.id}] Error loading InstrumentSampler audio from DataURL:`, e);
                    this.instrumentSamplerSettings.status = 'error';
                }
            }
            this.setupToneSampler();
        }

        this.setSequenceLength(this.sequenceLength, true); // Re-initialize sequence with potentially new audio data
        this.rebuildEffectChain(); // Crucial: ensure all new/loaded players are connected
        console.log(`[Track ${this.id}] fullyInitializeAudioResources finished.`);
    }

    async initializeInstrument() {
        if (this.type === 'Synth') {
            if (this.instrument && !this.instrument.disposed) {
                this.instrument.dispose();
            }
            // For now, hardcode to MonoSynth or a default. Future: use this.synthEngineType
            this.instrument = new Tone.MonoSynth(this.synthParams);
            console.log(`[Track ${this.id}] MonoSynth instrument initialized with params:`, this.synthParams);
            this.rebuildEffectChain(); // Reconnect instrument
        }
    }

    setupSlicerMonoNodes() {
        this.disposeSlicerMonoNodes(); // Always clear previous
        if (!this.slicerIsPolyphonic) {
            console.log(`[Track ${this.id}] Setting up Slicer mono nodes.`);
            this.slicerMonoPlayer = new Tone.Player();
            this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope(); // Default envelope, will be set per slice
            this.slicerMonoGain = new Tone.Gain(); // Default gain, will be set per slice
            this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);

            if (this.audioBuffer && this.audioBuffer.loaded) {
                this.slicerMonoPlayer.buffer = this.audioBuffer;
                console.log(`[Track ${this.id}] Slicer mono player buffer set.`);
            } else {
                console.log(`[Track ${this.id}] Slicer mono nodes set up, but no audioBuffer to assign yet.`);
            }
        }
    }
    disposeSlicerMonoNodes() {
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) { this.slicerMonoPlayer.dispose(); console.log(`[Track ${this.id}] Disposed slicerMonoPlayer.`); }
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) { this.slicerMonoEnvelope.dispose(); console.log(`[Track ${this.id}] Disposed slicerMonoEnvelope.`); }
        if (this.slicerMonoGain && !this.slicerMonoGain.disposed) { this.slicerMonoGain.dispose(); console.log(`[Track ${this.id}] Disposed slicerMonoGain.`); }
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
                this.toneSampler = new Tone.Sampler({
                    urls: urls,
                    attack: this.instrumentSamplerSettings.envelope.attack,
                    release: this.instrumentSamplerSettings.envelope.release,
                    onload: () => {
                        console.log(`[Track ${this.id}] Tone.Sampler loaded for InstrumentSampler.`);
                        this.toneSampler.loop = this.instrumentSamplerSettings.loop;
                        this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart;
                        this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd;
                        // Envelope beyond attack/release needs to be handled by connecting to an AmplitudeEnvelope if needed,
                        // as Tone.Sampler's constructor mainly takes attack/release for its internal envelope.
                        // For full ADSR, you might chain: sampler -> AmplitudeEnvelope(settings.envelope) -> gainNode
                    }
                });
                 // For full ADSR, we would chain to an AmplitudeEnvelope here if Tone.Sampler doesn't suffice.
                // For now, we assume attack/release in constructor is primary.
                this.rebuildEffectChain(); // Reconnect sampler
            } else {
                console.log(`[Track ${this.id}] InstrumentSampler audioBuffer not ready, cannot setup Tone.Sampler.`);
                 this.toneSampler = new Tone.Sampler(); // Create a disposed one to avoid errors? Or null.
            }
        }
    }

    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = volume;
        if (this.gainNode && !this.gainNode.disposed && !this.isMuted) {
            this.gainNode.gain.setValueAtTime(volume, Tone.now());
        }
        // If a mixer window is open, update its knob visually
        const mixerWindow = window.openWindows['mixer'];
        if (mixerWindow && !mixerWindow.isMinimized) {
            const mixerKnob = mixerWindow.element.querySelector(`#volumeKnob-mixer-${this.id}-placeholder knob-value`); // This selector might need adjustment if knob isn't direct child
            if (mixerKnob && mixerKnob.parentElement.knobInstance && typeof mixerKnob.parentElement.knobInstance.setValue === 'function') {
                 // TODO: This direct DOM manipulation for another window's knob isn't ideal.
                 // Better to have a centralized update mechanism or events.
                 // For now, this is a placeholder for how one *might* try to sync it.
            }
        }
    }

    applyMuteState() {
        if (this.gainNode && !this.gainNode.disposed) {
            const isEffectivelyMuted = this.isMuted || (typeof window.getSoloedTrackId === 'function' && window.getSoloedTrackId() !== null && !this.isSoloed);
            this.gainNode.gain.cancelScheduledValues(Tone.now());
            this.gainNode.gain.rampTo(isEffectivelyMuted ? 0 : this.previousVolumeBeforeMute, 0.01);
            console.log(`[Track ${this.id}] Applied mute. Effective mute: ${isEffectivelyMuted}. Gain set to: ${isEffectivelyMuted ? 0 : this.previousVolumeBeforeMute}`);
        }
    }

    applySoloState() { // Called when global solo state changes
        this.applyMuteState(); // Mute state depends on solo state
    }

    setSynthParam(paramPath, value) {
        if (this.type !== 'Synth' || !this.instrument || this.instrument.disposed) return;
        try {
            const keys = paramPath.split('.');
            let target = this.instrument;
            let paramsTarget = this.synthParams;

            for (let i = 0; i < keys.length - 1; i++) {
                target = target[keys[i]];
                paramsTarget[keys[i]] = paramsTarget[keys[i]] || {}; // Ensure path exists in synthParams
                paramsTarget = paramsTarget[keys[i]];
            }
            const finalKey = keys[keys.length - 1];

            // Update stored synthParams
            paramsTarget[finalKey] = value;

            // Apply to Tone.js instrument
            if (target[finalKey] && typeof target[finalKey].setValueAtTime === 'function') { // For Signal or Param objects
                target[finalKey].setValueAtTime(value, Tone.now());
            } else if (target[finalKey] && typeof target[finalKey].value !== 'undefined') { // Direct .value property
                 target[finalKey].value = value;
            }
            else { // Direct assignment
                target[finalKey] = value;
            }
            // Special handling for filter type, as it might require recreating the filter or using .set()
            if (paramPath === 'filter.type' && typeof this.instrument.set === 'function') {
                 this.instrument.set({ filter: { type: value } });
            } else if (paramPath === 'oscillator.type' && typeof this.instrument.set === 'function') {
                this.instrument.set({ oscillator: { type: value } });
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
        this.setupToneSampler(); // Re-initialize sampler with new root note mapping
    }
    setInstrumentSamplerLoop(loop) {
        this.instrumentSamplerSettings.loop = !!loop;
        if (this.toneSampler) this.toneSampler.loop = this.instrumentSamplerSettings.loop;
    }
    setInstrumentSamplerLoopStart(time) {
        this.instrumentSamplerSettings.loopStart = parseFloat(time);
        if (this.toneSampler) this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart;
    }
    setInstrumentSamplerLoopEnd(time) {
        this.instrumentSamplerSettings.loopEnd = parseFloat(time);
        if (this.toneSampler) this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd;
    }
    setInstrumentSamplerEnv(param, value) {
        this.instrumentSamplerSettings.envelope[param] = parseFloat(value);
        if (this.toneSampler) { // Tone.Sampler directly uses attack/release
            if (param === 'attack') this.toneSampler.attack = value;
            if (param === 'release') this.toneSampler.release = value;
            // For full ADSR, would need an external AmplitudeEnvelope if not handled by Tone.Sampler internally
        }
    }

    async doubleSequence() {
        if (typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Double Sequence Length for ${this.name}`);
        }
        const oldLength = this.sequenceLength;
        const newLength = oldLength * 2;
        const oldSequenceData = JSON.parse(JSON.stringify(this.sequenceData)); // Deep copy

        this.setSequenceLength(newLength, true); // true to skip internal undo capture for this part

        // Copy old data into the first half of the new sequence
        for (let r = 0; r < oldSequenceData.length; r++) {
            if (!this.sequenceData[r]) this.sequenceData[r] = Array(newLength).fill(null);
            for (let c = 0; c < oldLength; c++) {
                this.sequenceData[r][c] = oldSequenceData[r][c];
                 // Optionally copy to the second half too:
                 // this.sequenceData[r][c + oldLength] = oldSequenceData[r][c];
            }
        }
        // If the sequencer window is open, it will be redrawn by setSequenceLength
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
                const gridElement = this.sequencerWindow.element?.querySelector('.sequencer-grid');
                if (gridElement) window.highlightPlayingStep(col, this.type, gridElement);
            }

            // CORRECTED CONDITION HERE:
            if (!this.gainNode || this.gainNode.disposed || this.isMuted || isSoloedOut) {
                return;
            }

            // Determine the point where audio from this sequence step should enter the track's chain
            // This is either the first effect, or the track's main gain node if no effects.
            const effectsChainStartPoint = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                ? this.activeEffects[0].toneNode
                : (this.gainNode && !this.gainNode.disposed ? this.gainNode : (window.masterEffectsBusInput || Tone.getDestination()));


            if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
                 synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active) this.instrument.triggerAttackRelease(pitchName, "8n", time, step.velocity * defaultVelocity); // Multiply by defaultVelocity if step.velocity is just a multiplier
                });
            } else if (this.type === 'Sampler') {
                this.slices.forEach((sliceData, sliceIndex) => {
                    const step = this.sequenceData[sliceIndex]?.[col];
                    if (step?.active && sliceData?.duration > 0 && this.audioBuffer?.loaded) {
                        const playbackRate = Math.pow(2, (sliceData.pitchShift || 0) / 12);
                        let playDuration = sliceData.duration / playbackRate;
                        if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds(); // Or adjust as needed for loops

                        if (this.slicerIsPolyphonic) {
                            const tempPlayer = new Tone.Player(this.audioBuffer);
                            const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                            const tempGain = new Tone.Gain(step.velocity * sliceData.volume); // Apply velocity and slice volume
                            tempPlayer.chain(tempEnv, tempGain, effectsChainStartPoint); // Connect to the correct start of chain
                            tempPlayer.playbackRate = playbackRate; tempPlayer.reverse = sliceData.reverse; tempPlayer.loop = sliceData.loop;
                            tempPlayer.loopStart = sliceData.offset; tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
                            tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            tempEnv.triggerAttack(time);
                            if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95);
                            Tone.Transport.scheduleOnce(() => { if(tempPlayer && !tempPlayer.disposed) tempPlayer.dispose(); if(tempEnv && !tempEnv.disposed) tempEnv.dispose(); if(tempGain && !tempGain.disposed) tempGain.dispose(); }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);
                        } else if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                            // For mono, the player is already connected through rebuildEffectChain. Just trigger it.
                            if (this.slicerMonoPlayer.state === 'started') this.slicerMonoPlayer.stop(time); // Stop previous note
                            this.slicerMonoEnvelope.triggerRelease(time); // Ensure previous envelope is released

                            this.slicerMonoPlayer.buffer = this.audioBuffer; // Ensure buffer is set (might be redundant if always set)
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
                                this.slicerMonoEnvelope.triggerRelease(time + playDuration - (sliceData.envelope.release * 0.05));
                            }
                        }
                    }
                });
            } else if (this.type === 'DrumSampler') {
                Array.from({ length: numDrumSamplerPads }).forEach((_, padIndex) => {
                    const step = this.sequenceData[padIndex]?.[col];
                    const padData = this.drumSamplerPads[padIndex];
                    if (step?.active && padData && this.drumPadPlayers[padIndex]?.loaded) {
                        const player = this.drumPadPlayers[padIndex]; // This player is connected via rebuildEffectChain
                        player.volume.value = Tone.gainToDb(padData.volume * step.velocity);
                        player.playbackRate = Math.pow(2, (padData.pitchShift || 0) / 12);
                        player.start(time);
                    }
                });
            } else if (this.type === 'InstrumentSampler' && this.toneSampler?.loaded) {
                 let notePlayedThisStepInColumn = false;
                 synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active) {
                        if (!this.instrumentSamplerIsPolyphonic && !notePlayedThisStepInColumn) {
                            this.toneSampler.releaseAll(time);
                            notePlayedThisStepInColumn = true;
                        }
                        this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "8n", time, step.velocity * defaultVelocity);
                    }
                });
            }
        }, Array.from(Array(this.sequenceLength).keys()), "16n").start(0);

        // If sequencer window is open, refresh it
        if (this.sequencerWindow && this.sequencerWindow.element && !this.sequencerWindow.isMinimized && window.openWindows[`sequencerWin-${this.id}`] && typeof window.openTrackSequencerWindow === 'function') {
             window.openTrackSequencerWindow(this.id, true); // true for forceRedraw
        }
    }

    dispose() {
        console.log(`[Track ${this.id}] Disposing track: ${this.name}`);
        if (this.sequence && !this.sequence.disposed) { this.sequence.stop(); this.sequence.clear(); this.sequence.dispose(); }
        if (this.instrument && !this.instrument.disposed) { this.instrument.dispose(); }
        if (this.toneSampler && !this.toneSampler.disposed) { this.toneSampler.dispose(); }
        this.disposeSlicerMonoNodes();
        this.drumPadPlayers.forEach(player => { if (player && !player.disposed) player.dispose(); });
        this.activeEffects.forEach(effect => { if (effect.toneNode && !effect.toneNode.disposed) effect.toneNode.dispose(); });
        if (this.gainNode && !this.gainNode.disposed) { this.gainNode.dispose(); }
        if (this.trackMeter && !this.trackMeter.disposed) { this.trackMeter.dispose(); }

        // Close associated windows
        if (this.inspectorWindow && typeof this.inspectorWindow.close === 'function') { this.inspectorWindow.close(true); this.inspectorWindow = null; }
        if (this.effectsRackWindow && typeof this.effectsRackWindow.close === 'function') { this.effectsRackWindow.close(true); this.effectsRackWindow = null; }
        if (this.sequencerWindow && typeof this.sequencerWindow.close === 'function') { this.sequencerWindow.close(true); this.sequencerWindow = null; }

        this.audioBuffer = null; // Buffer itself is owned by Tone.js, just release reference
        this.drumSamplerPads.forEach(p => p.audioBuffer = null);
        if (this.instrumentSamplerSettings) this.instrumentSamplerSettings.audioBuffer = null;
        console.log(`[Track ${this.id}] Finished disposing track: ${this.name}`);
    }
}
```

Next, I will send the `js/ui.js` file with the sequencer coloring chang
