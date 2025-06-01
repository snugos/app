// js/Track.js - Track Class Module

import * as Constants from './constants.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry, AVAILABLE_EFFECTS } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';


export class Track {
    constructor(id, type, initialData = null, appServices = {}) {
        this.id = initialData?.id || id;
        this.type = type;
        this.appServices = appServices;

        this.name = initialData?.name || `${type} Track ${this.id}`;
        if (type === 'DrumSampler') {
            this.name = initialData?.name || `Sampler (Pads) ${this.id}`;
        } else if (type === 'Synth') {
            this.name = initialData?.name || `MonoSynth ${this.id}`;
        } else if (type === 'Audio') {
            this.name = initialData?.name || `Audio ${this.id}`;
        }

        this.isMuted = initialData?.isMuted || false;
        this.isMonitoringEnabled = initialData?.isMonitoringEnabled !== undefined ? initialData.isMonitoringEnabled : true;

        const currentSoloedId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
        this.isSoloed = currentSoloedId === this.id;
        this.previousVolumeBeforeMute = initialData?.volume ?? 0.7;

        // Synth specific
        if (this.type === 'Synth') {
            this.synthEngineType = initialData?.synthEngineType || 'MonoSynth';
            this.synthParams = initialData?.synthParams ? JSON.parse(JSON.stringify(initialData.synthParams)) : this.getDefaultSynthParams();
        } else {
            this.synthEngineType = null;
            this.synthParams = {};
        }

        // Sampler (Slicer) specific
        this.samplerAudioData = initialData?.samplerAudioData || {
            fileName: null, audioBufferDataURL: null, dbKey: null, status: 'empty'
        };
        this.audioBuffer = null; // Will be a Tone.Buffer
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

        // Instrument Sampler specific
        this.instrumentSamplerSettings = initialData?.instrumentSamplerSettings || {
            sampleUrl: null, audioBuffer: null, /* Will be a Tone.Buffer */ audioBufferDataURL: null, originalFileName: null, dbKey: null,
            rootNote: 'C4', loop: false, loopStart: 0, loopEnd: 0,
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 }, status: 'empty'
        };
        this.instrumentSamplerIsPolyphonic = initialData?.instrumentSamplerIsPolyphonic !== undefined ? initialData.instrumentSamplerIsPolyphonic : true;
        this.toneSampler = null;

        // Drum Sampler specific
        this.drumSamplerPads = initialData?.drumSamplerPads || Array(Constants.numDrumSamplerPads).fill(null).map(() => ({
            sampleUrl: null, audioBuffer: null, /* Will be a Tone.Buffer */ audioBufferDataURL: null, originalFileName: null, dbKey: null,
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
        this.drumPadPlayers = Array(Constants.numDrumSamplerPads).fill(null);

        // Effects
        this.activeEffects = [];
        if (initialData && initialData.activeEffects && Array.isArray(initialData.activeEffects)) {
            initialData.activeEffects.forEach(effectData => {
                const getDefaults = this.appServices.effectsRegistryAccess?.getEffectDefaultParams || getEffectDefaultParamsFromRegistry;
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

        // Audio Nodes
        this.gainNode = null; this.trackMeter = null; this.outputNode = null;
        this.instrument = null; // For Synth type

        this.sequences = [];
        this.activeSequenceId = null;
        this.timelineClips = initialData?.timelineClips || [];

        if (this.type !== 'Audio') {
            if (initialData?.sequences && initialData.sequences.length > 0) {
                this.sequences = JSON.parse(JSON.stringify(initialData.sequences));
                this.activeSequenceId = initialData.activeSequenceId || (this.sequences[0] ? this.sequences[0].id : null);
            } else {
                const defaultSeqId = `seq_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
                let numRowsForGrid;
                if (this.type === 'Synth' || this.type === 'InstrumentSampler') {
                    numRowsForGrid = Constants.synthPitches.length;
                } else if (this.type === 'Sampler') {
                    numRowsForGrid = this.slices.length > 0 ? this.slices.length : Constants.numSlices;
                    if (numRowsForGrid === 0) numRowsForGrid = Constants.numSlices;
                } else if (this.type === 'DrumSampler') {
                    numRowsForGrid = Constants.numDrumSamplerPads;
                } else {
                    numRowsForGrid = 1;
                    console.warn(`[Track ${this.id} Constructor] Unknown track type for sequence rows: ${this.type}. Defaulting to 1 row.`);
                }
                if (numRowsForGrid === 0 && (this.type === 'Synth' || this.type === 'InstrumentSampler' || this.type === 'Sampler' || this.type === 'DrumSampler')) {
                     console.warn(`[Track ${this.id} Constructor] numRowsForGrid was 0 for type ${this.type}, defaulting to 1 to avoid empty sequence data.`);
                     numRowsForGrid = 1;
                }

                const defaultSequenceData = Array(numRowsForGrid).fill(null).map(() => Array(Constants.defaultStepsPerBar).fill(null));

                this.sequences.push({
                    id: defaultSeqId,
                    name: "Sequence 1",
                    data: defaultSequenceData,
                    length: Constants.defaultStepsPerBar
                });
                this.activeSequenceId = defaultSeqId;
            }
            delete this.sequenceData; // Ensure old properties are not carried over if initialData had them
            delete this.sequenceLength;
        } else { // Audio Track
            delete this.sequenceData;
            delete this.sequenceLength;
            delete this.sequences; // Audio tracks don't use this.sequences array
            delete this.activeSequenceId;

            // Migrate old audioClips structure if present from initialData (for project loading)
            if (initialData?.audioClips && Array.isArray(initialData.audioClips)) {
                 initialData.audioClips.forEach(ac => {
                    // Check if a similar clip (based on sourceId) already exists from timelineClips
                    const existingClip = this.timelineClips.find(tc => tc.sourceId === ac.dbKey && tc.type === 'audio');
                    if (!existingClip) {
                        this.timelineClips.push({
                            id: ac.id || `audioclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
                            type: 'audio',
                            sourceId: ac.dbKey, // This is the important link to the audio data
                            startTime: ac.startTime,
                            duration: ac.duration,
                            name: ac.name || `Rec Clip ${this.timelineClips.filter(c => c.type === 'audio').length + 1}`
                        });
                    }
                });
           }
        }
        this.patternPlayerSequence = null; // For sequencer mode playback

        // UI related
        this.waveformCanvasCtx = null;
        this.instrumentWaveformCanvasCtx = null;
        this.automation = initialData?.automation || { volume: [] }; // Example structure
        this.inspectorControls = {}; // To store references to UI controls like knobs

        // Audio Track specific (input channel and live players for timeline)
        this.inputChannel = null; // For live input on Audio tracks
        this.clipPlayers = new Map(); // For playing back timeline audio clips
    }

    // --- Sequence Management ---
    getActiveSequence() {
        if (this.type === 'Audio' || !this.activeSequenceId || !this.sequences) return null;
        return this.sequences.find(s => s.id === this.activeSequenceId);
    }

    getActiveSequenceData() {
        const activeSeq = this.getActiveSequence();
        return activeSeq ? activeSeq.data : [];
    }

    getActiveSequenceLength() {
        const activeSeq = this.getActiveSequence();
        return activeSeq ? activeSeq.length : Constants.defaultStepsPerBar;
    }

    // --- Synth Specific ---
    getDefaultSynthParams() {
        // Return default parameters for the current synthEngineType
        // This might involve checking this.synthEngineType and returning appropriate defaults
        // For now, returning MonoSynth defaults as an example
        return {
            portamento: 0.01,
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 1 },
            filter: { type: 'lowpass', rolloff: -12, Q: 1 }, // Default filter params
            filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 2, baseFrequency: 200, octaves: 7, exponent: 2 }
        };
    }

    // --- Audio Node Initialization and Chaining ---
    async initializeAudioNodes() {
        console.log(`[Track ${this.id} initializeAudioNodes] Initializing audio nodes.`);
        // Dispose existing nodes if they exist
        if (this.gainNode && !this.gainNode.disposed) { try { this.gainNode.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old gainNode:`, e.message)} }
        if (this.trackMeter && !this.trackMeter.disposed) { try { this.trackMeter.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old trackMeter:`, e.message)} }
        if (this.inputChannel && !this.inputChannel.disposed && this.type === 'Audio') {
            try { this.inputChannel.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old inputChannel:`, e.message)}
        }
        // Create new nodes
        this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
        this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        this.outputNode = this.gainNode; // Default output is the gainNode
        if (this.type === 'Audio') {
            this.inputChannel = new Tone.Channel(); // For live input / recording
        }
        this.rebuildEffectChain(); // Connect instruments/effects to these nodes
        console.log(`[Track ${this.id} initializeAudioNodes] Audio nodes initialized and effect chain rebuilt.`);
    }

    rebuildEffectChain() {
        console.log(`[Track ${this.id} rebuildEffectChain] Rebuilding effect chain. Effects count: ${this.activeEffects.length}`);
        if (!this.gainNode || this.gainNode.disposed) {
            console.error(`Track ${this.id} has no valid gainNode. Aborting chain rebuild.`);
            return;
        }
        if (!this.trackMeter || this.trackMeter.disposed) {
            // Recreate if disposed, common if project is reloaded or track re-initialized
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        }

        // Identify primary source nodes for this track type
        let sourceNodes = [];
        if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) sourceNodes.push(this.instrument);
        else if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed) sourceNodes.push(this.toneSampler);
        else if (this.type === 'DrumSampler') {
            this.drumPadPlayers.forEach(player => {
                if (player && !player.disposed) {
                    sourceNodes.push(player);
                }
            });
        } else if (this.type === 'Sampler') {
            // For mono slicer, the source is the slicerMonoGain
            if (!this.slicerIsPolyphonic && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                sourceNodes.push(this.slicerMonoGain);
            }
            // For polyphonic slicer, players are created on-the-fly and connect directly.
        } else if (this.type === 'Audio') {
            // For Audio tracks, the inputChannel is a source for live input/monitoring.
            // Timeline clips will connect their players directly.
            if (this.inputChannel && !this.inputChannel.disposed) {
                 sourceNodes.push(this.inputChannel); // For live monitoring
            }
        }
        console.log(`[Track ${this.id} rebuildEffectChain] Identified ${sourceNodes.length} primary source nodes for initial connection point.`);


        // Disconnect all managed nodes before rebuilding
        const allManagedNodes = [
            ...sourceNodes, // Primary instrument/player nodes
            ...this.activeEffects.map(e => e.toneNode),
            this.gainNode,
            this.trackMeter
        ].filter(node => node && !node.disposed); // Filter out null or already disposed nodes

        allManagedNodes.forEach(node => {
            try { node.disconnect(); } catch(e) { /* ignore, might already be disconnected */ }
        });
        console.log(`[Track ${this.id} rebuildEffectChain] All managed nodes disconnected.`);

        // Specific pre-effect chain setup for mono slicer
        if (this.type === 'Sampler' && !this.slicerIsPolyphonic && this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed &&
            this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed &&
            this.slicerMonoGain && !this.slicerMonoGain.disposed) {
            try { this.slicerMonoPlayer.disconnect(); } catch(e) {/*ignore*/} // ensure it's clean
            this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
            // sourceNodes should already include slicerMonoGain if this path is taken
        }


        // Chain through effects
        let currentOutput = sourceNodes.length > 0 ? (sourceNodes.length === 1 ? sourceNodes[0] : sourceNodes) : null;
        console.log(`[Track ${this.id} rebuildEffectChain] Initial currentOutput (before effects):`, currentOutput ? (Array.isArray(currentOutput) ? `${currentOutput.length} nodes` : currentOutput.toString()) : 'null');

        // Special handling for types where primary source might not be in sourceNodes for effects
        // e.g., Polyphonic Sampler where players are transient
        if (this.type === 'Sampler' && this.slicerIsPolyphonic) {
            // For polyphonic sampler, players connect directly to the start of the effects chain or gainNode.
            // So, currentOutput for the *track's persistent chain* might be null if no effects.
            currentOutput = null; // Reset, as players will connect to first effect or gainNode
        }
        if (this.type === 'Audio' && !this.inputChannel) { // If no live input, timeline players connect directly
            currentOutput = null;
        }


        this.activeEffects.forEach((effectWrapper, index) => {
            if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
                console.log(`[Track ${this.id} rebuildEffectChain] Connecting to effect ${index}: ${effectWrapper.type}`);
                if (currentOutput) { // If there's a preceding node in the persistent chain
                    if (Array.isArray(currentOutput)) {
                        currentOutput.forEach(outNode => {
                            if (outNode && !outNode.disposed) {
                                console.log(`[Track ${this.id} rebuildEffectChain] ... ${outNode.toString()} -> ${effectWrapper.type}`);
                                outNode.connect(effectWrapper.toneNode);
                            }
                        });
                    } else if (currentOutput && !currentOutput.disposed) { // Single preceding node
                        console.log(`[Track ${this.id} rebuildEffectChain] ... ${currentOutput.toString()} -> ${effectWrapper.type}`);
                        currentOutput.connect(effectWrapper.toneNode);
                    }
                }
                currentOutput = effectWrapper.toneNode; // This effect becomes the new end of the chain
            }
        });

        // Connect the end of the effect chain (or the source if no effects) to the gainNode
        if (currentOutput) { // If currentOutput is an effect or a direct source
            if (Array.isArray(currentOutput)) {
                currentOutput.forEach(outNode => {
                    if (outNode && !outNode.disposed) {
                        console.log(`[Track ${this.id} rebuildEffectChain] ... ${outNode.toString()} -> gainNode`);
                        outNode.connect(this.gainNode);
                    }
                });
            } else if (currentOutput && !currentOutput.disposed) {
                console.log(`[Track ${this.id} rebuildEffectChain] ... ${currentOutput.toString()} -> gainNode`);
                currentOutput.connect(this.gainNode);
            }
        } else if (this.type === 'Audio' && this.inputChannel && !this.inputChannel.disposed && this.activeEffects.length === 0) {
            // Audio track with live input and no effects: inputChannel -> gainNode
            this.inputChannel.connect(this.gainNode);
            console.log(`[Track ${this.id} rebuildEffectChain] Connected Audio inputChannel directly to gainNode (no effects).`);
        } else if (this.type === 'DrumSampler' && sourceNodes.length > 0 && this.activeEffects.length === 0) {
            // DrumSampler with no effects: each player -> gainNode (already done if sourceNodes includes them)
            // This ensures if sourceNodes was just the players, they connect to gainNode
            sourceNodes.forEach(playerNode => {
                if (playerNode && !playerNode.disposed) {
                     console.log(`[Track ${this.id} DrumSampler rebuildEffectChain] ... ${playerNode.toString()} (Player for pad) -> gainNode (no effects)`);
                    playerNode.connect(this.gainNode); // This might be redundant if already connected, but ensures it
                }
            });
        }
         else {
            // This case implies no persistent source node and no effects (e.g., polyphonic sampler with no effects)
            // Transient players will connect directly to this.gainNode.
            console.log(`[Track ${this.id} rebuildEffectChain] No primary currentOutput to connect to gainNode (e.g., polyphonic sampler with no effects, or audio track relying on direct player connections to effects/gain).`);
        }


        // Connect gainNode to trackMeter
        if (this.gainNode && !this.gainNode.disposed && this.trackMeter && !this.trackMeter.disposed) {
            this.gainNode.connect(this.trackMeter);
            console.log(`[Track ${this.id} rebuildEffectChain] Connected gainNode to trackMeter.`);
        }

        // Connect trackMeter (or gainNode if meter fails) to master bus
        const masterBusInput = this.appServices.getMasterEffectsBusInputNode ? this.appServices.getMasterEffectsBusInputNode() : null;
        const finalTrackOutput = (this.trackMeter && !this.trackMeter.disposed) ? this.trackMeter : this.gainNode; // Fallback to gainNode

        if (finalTrackOutput && !finalTrackOutput.disposed && masterBusInput && !masterBusInput.disposed) {
            finalTrackOutput.connect(masterBusInput);
            console.log(`[Track ${this.id} rebuildEffectChain] Connected final track output to masterBusInput.`);
        } else if (finalTrackOutput && !finalTrackOutput.disposed) {
            // Fallback if master bus isn't available (shouldn't happen in normal operation)
            console.warn(`[Track ${this.id}] Master effects bus input not available. Connecting directly to destination.`);
            finalTrackOutput.toDestination();
        }

        this.applyMuteState();
        this.applySoloState();
        console.log(`[Track ${this.id} rebuildEffectChain] Mute/Solo states applied. Chain rebuild complete.`);
    }

    // --- Effect Management ---
    addEffect(effectType) {
        const AVAILABLE_EFFECTS_LOCAL = this.appServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
        const getEffectDefaultParamsLocal = this.appServices.effectsRegistryAccess?.getEffectDefaultParams || getEffectDefaultParamsFromRegistry;

        if (!AVAILABLE_EFFECTS_LOCAL[effectType]) {
            console.warn(`[Track ${this.id}] Effect type "${effectType}" not found in registry.`);
            if (this.appServices.showNotification) this.appServices.showNotification(`Effect type "${effectType}" not found.`, 3000);
            return;
        }
        const defaultParams = getEffectDefaultParamsLocal(effectType);
        const toneNode = createEffectInstance(effectType, defaultParams);

        if (toneNode) {
            const effectId = `effect-${this.id}-${effectType}-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
            this.activeEffects.push({
                id: effectId, type: effectType, toneNode: toneNode, params: JSON.parse(JSON.stringify(defaultParams))
            });
            this.rebuildEffectChain(); // Rebuild chain with the new effect
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
            this.rebuildEffectChain(); // Rebuild chain without the removed effect
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
                if (paramInstance && typeof paramInstance.value !== 'undefined' && typeof paramInstance.rampTo === 'function') { // Is a Tone.Signal or similar
                    paramInstance.rampTo(value, 0.02); // Short ramp for smoothness
                } else if (paramInstance && typeof paramInstance.value !== 'undefined') { // Direct value property on a Signal-like object
                    paramInstance.value = value;
                } else { // Direct property assignment
                    targetObject[finalParamKey] = value;
                }
            } else if (typeof effectWrapper.toneNode.set === 'function' && keys.length > 0) {
                // Fallback for complex objects that use a .set() method (like some Tone.js instruments)
                const setObj = {};
                let currentLevelForSet = setObj;
                for(let i = 0; i < keys.length - 1; i++){
                    currentLevelForSet[keys[i]] = {};
                    currentLevelForSet = currentLevelForSet[keys[i]];
                }
                currentLevelForSet[finalParamKey] = value;
                effectWrapper.toneNode.set(setObj);
            } else {
                console.warn(`[Track ${this.id}] Could not set parameter ${paramPath} on effect ${effectWrapper.type}. Parameter instance or .set() method not found.`);
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
        this.rebuildEffectChain(); // Rebuild chain with new order

        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'effectsListChanged');
        }
    }

    // --- Audio Resource Initialization (Samples, Instruments) ---
    async fullyInitializeAudioResources() {
        console.log(`[Track ${this.id} fullyInitializeAudioResources] Initializing audio resources for type: ${this.type}`);
        if (!this.gainNode || this.gainNode.disposed) { // Ensure basic audio nodes are up
            await this.initializeAudioNodes();
        }

        try {
            if (this.type === 'Synth') {
                await this.initializeInstrument(); // Sets up Tone.MonoSynth or other synth engine
            } else if (this.type === 'Sampler') {
                if (this.samplerAudioData && (this.samplerAudioData.dbKey || this.samplerAudioData.audioBufferDataURL)) {
                    let audioFile;
                    if (this.samplerAudioData.dbKey) {
                        audioFile = await getAudio(this.samplerAudioData.dbKey).catch(err => {
                            console.error(`[Track ${this.id}] Error getting audio from DB for key ${this.samplerAudioData.dbKey}:`, err);
                            this.samplerAudioData.status = 'error';
                            if (this.appServices.showNotification) this.appServices.showNotification(`Error loading sample ${this.samplerAudioData.fileName || 'from database'}.`, 3000);
                            return null;
                        });
                    } else if (this.samplerAudioData.audioBufferDataURL) { // From direct file load (not yet stored in DB or re-hydrating)
                        try {
                            const response = await fetch(this.samplerAudioData.audioBufferDataURL);
                            if (!response.ok) throw new Error(`Failed to fetch data URL for ${this.samplerAudioData.fileName}`);
                            audioFile = await response.blob();
                        } catch (fetchErr) {
                            console.error(`[Track ${this.id}] Error fetching audio from data URL for ${this.samplerAudioData.fileName}:`, fetchErr);
                            this.samplerAudioData.status = 'error';
                             if (this.appServices.showNotification) this.appServices.showNotification(`Error loading sample ${this.samplerAudioData.fileName || 'from data URL'}.`, 3000);
                            audioFile = null;
                        }
                    }

                    if (audioFile) {
                        const objectURL = URL.createObjectURL(audioFile);
                        try {
                            // Dispose old buffer if it exists
                            if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose();
                            this.audioBuffer = await new Tone.Buffer().load(objectURL);
                            this.samplerAudioData.status = 'loaded';
                            if (!this.slicerIsPolyphonic) this.setupSlicerMonoNodes(); // Setup mono player if needed
                            // Auto-slice if no slices defined yet
                            if (this.appServices.autoSliceSample && this.audioBuffer.loaded && this.slices.every(s => s.duration === 0)) {
                                this.appServices.autoSliceSample(this.id);
                            }
                        } catch (toneLoadErr) {
                            console.error(`[Track ${this.id}] Tone.Buffer load error for ${this.samplerAudioData.fileName}:`, toneLoadErr);
                            this.samplerAudioData.status = 'error';
                            if (this.appServices.showNotification) this.appServices.showNotification(`Error processing sample ${this.samplerAudioData.fileName}.`, 3000);
                        } finally {
                            URL.revokeObjectURL(objectURL);
                        }
                    } else if (this.samplerAudioData.status !== 'error') { // If audioFile is null but not due to a caught error above
                        this.samplerAudioData.status = this.samplerAudioData.dbKey ? 'missing_db' : 'error'; // Or 'missing' if from URL that failed silently
                    }
                }
            } else if (this.type === 'DrumSampler') {
                for (let i = 0; i < this.drumSamplerPads.length; i++) {
                    const pad = this.drumSamplerPads[i];
                    if (pad.dbKey || pad.audioBufferDataURL) { // If there's a source to load
                        let audioFile;
                        try {
                            if (pad.dbKey) {
                                audioFile = await getAudio(pad.dbKey).catch(err => {
                                    console.error(`[Track ${this.id}] Error getting audio for drum pad ${i} from DB (key ${pad.dbKey}):`, err);
                                    pad.status = 'error'; return null;
                                });
                            } else if (pad.audioBufferDataURL) {
                                const response = await fetch(pad.audioBufferDataURL);
                                if (!response.ok) throw new Error(`Failed to fetch data URL for drum pad ${i}`);
                                audioFile = await response.blob();
                            }

                            if (audioFile) {
                                const objectURL = URL.createObjectURL(audioFile);
                                try {
                                    if (pad.audioBuffer && !pad.audioBuffer.disposed) pad.audioBuffer.dispose();
                                    pad.audioBuffer = await new Tone.Buffer().load(objectURL);
                                    // Dispose old player and create new
                                    if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) this.drumPadPlayers[i].dispose();
                                    this.drumPadPlayers[i] = new Tone.Player(pad.audioBuffer);
                                    pad.status = 'loaded';
                                } catch (toneLoadErr) {
                                    console.error(`[Track ${this.id}] Tone.Buffer load error for drum pad ${i} (${pad.originalFileName}):`, toneLoadErr);
                                    pad.status = 'error';
                                } finally {
                                    URL.revokeObjectURL(objectURL);
                                }
                            } else if (pad.status !== 'error'){ // If audioFile is null but not due to a caught error
                                pad.status = pad.dbKey ? 'missing_db' : 'error';
                            }
                        } catch (loadErr) { // Catch errors from fetch or getAudio if they throw directly
                             console.error(`[Track ${this.id}] Error loading resource for drum pad ${i} (${pad.originalFileName}):`, loadErr);
                             pad.status = 'error';
                        }
                    }
                }
            } else if (this.type === 'InstrumentSampler') {
                 if (this.instrumentSamplerSettings.dbKey || this.instrumentSamplerSettings.audioBufferDataURL) {
                    let audioFile;
                    try {
                        if (this.instrumentSamplerSettings.dbKey) {
                           audioFile = await getAudio(this.instrumentSamplerSettings.dbKey).catch(err => {
                                console.error(`[Track ${this.id}] Error getting audio for instrument sampler from DB (key ${this.instrumentSamplerSettings.dbKey}):`, err);
                                this.instrumentSamplerSettings.status = 'error'; return null;
                           });
                        } else if (this.instrumentSamplerSettings.audioBufferDataURL) {
                            const response = await fetch(this.instrumentSamplerSettings.audioBufferDataURL);
                            if (!response.ok) throw new Error(`Failed to fetch data URL for instrument sampler`);
                            audioFile = await response.blob();
                        }
                        if (audioFile) {
                            const objectURL = URL.createObjectURL(audioFile);
                            try {
                                if (this.instrumentSamplerSettings.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose();
                                this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(objectURL);
                                this.instrumentSamplerSettings.status = 'loaded';
                            } catch (toneLoadErr) {
                                console.error(`[Track ${this.id}] Tone.Buffer load error for instrument sampler:`, toneLoadErr);
                                this.instrumentSamplerSettings.status = 'error';
                            } finally {
                                URL.revokeObjectURL(objectURL);
                            }
                        } else if(this.instrumentSamplerSettings.status !== 'error') { // If audioFile is null but not due to a caught error
                            this.instrumentSamplerSettings.status = this.instrumentSamplerSettings.dbKey ? 'missing_db' : 'error';
                        }
                    } catch (loadErr) {
                        console.error(`[Track ${this.id}] Error loading resource for instrument sampler:`, loadErr);
                        this.instrumentSamplerSettings.status = 'error';
                    }
                }
                this.setupToneSampler(); // Re-create Tone.Sampler with the new buffer
            }
            // Ensure Audio track input channel is ready if it's an audio track
            if (this.type === 'Audio' && (!this.inputChannel || this.inputChannel.disposed)) {
                await this.initializeAudioNodes(); // This will create inputChannel
            }

        } catch (error) {
            console.error(`[Track ${this.id}] Overall error in fullyInitializeAudioResources for ${this.type}:`, error);
            if (this.appServices.showNotification) this.appServices.showNotification(`Major error loading audio for ${this.name}.`, 4000);
            if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sampleLoadError'); // Generic error update
        }

        // Recreate Tone.Sequence if track type uses it and not an Audio track
        if (this.type !== 'Audio') {
            this.recreateToneSequence(true); // true to force restart if playing
        }
        this.rebuildEffectChain(); // Always rebuild effect chain after resource changes
        console.log(`[Track ${this.id} fullyInitializeAudioResources] Finished audio resource initialization.`);
    }


    async initializeInstrument() { // For Synth type
        if (this.type === 'Synth') {
            if (this.instrument && !this.instrument.disposed) {
                this.instrument.dispose();
            }
            // TODO: Implement logic to create different synth engines based on this.synthEngineType
            // For now, defaulting to MonoSynth
            this.instrument = new Tone.MonoSynth(this.synthParams);
            console.log(`[Track ${this.id} initializeInstrument] MonoSynth initialized with params:`, this.synthParams);
        }
    }

    setupSlicerMonoNodes() {
        this.disposeSlicerMonoNodes(); // Clean up existing
        if (!this.slicerIsPolyphonic) {
            this.slicerMonoPlayer = new Tone.Player();
            this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
            this.slicerMonoGain = new Tone.Gain();
            // Chain them: Player -> Envelope -> Gain
            this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
            // If buffer is already loaded, assign it
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

    setupToneSampler() { // For InstrumentSampler type
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
                            // Additional settings after load if needed
                            if (this.toneSampler && !this.toneSampler.disposed) {
                                this.toneSampler.loop = this.instrumentSamplerSettings.loop;
                                this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart;
                                this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd;
                            }
                        }
                    });
                } catch (e) {
                    console.error(`[Track ${this.id}] Error creating Tone.Sampler:`, e);
                    if (this.appServices.showNotification) this.appServices.showNotification(`Error creating instrument sampler for ${this.name}.`, 3000);
                    this.toneSampler = null;
                }
            } else {
                 this.toneSampler = null; // No buffer, no sampler
            }
        }
    }

    // --- Volume and Mute/Solo ---
    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = volume;
        if (this.gainNode && !this.gainNode.disposed && !this.isMuted) {
            this.gainNode.gain.setValueAtTime(volume, Tone.now());
        }
        // if (fromInteraction && this.appServices.captureStateForUndo) {
        //     this.appServices.captureStateForUndo(`Set Volume for ${this.name} to ${volume.toFixed(2)}`);
        // }
    }

    applyMuteState() {
        if (this.gainNode && !this.gainNode.disposed) {
            const currentSoloedId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
            const isEffectivelyMuted = this.isMuted || (currentSoloedId !== null && currentSoloedId !== this.id);
            this.gainNode.gain.cancelScheduledValues(Tone.now());
            this.gainNode.gain.rampTo(isEffectivelyMuted ? 0 : this.previousVolumeBeforeMute, 0.01);
        }
    }

    applySoloState() {
        // Soloing logic is handled by applyMuteState based on global solo state
        this.applyMuteState();
    }

    // --- Parameter Setting for Different Track Types ---
    setSynthParam(paramPath, value) {
        if (this.type !== 'Synth' || !this.instrument || this.instrument.disposed) return;
        try {
            const keys = paramPath.split('.');
            let target = this.instrument; // Target the Tone.js instrument instance
            let paramsTarget = this.synthParams; // Target the stored plain JS object for params

            // Traverse to the correct nested object for both the Tone.js instrument and the stored params
            for (let i = 0; i < keys.length - 1; i++) {
                target = target[keys[i]];
                paramsTarget[keys[i]] = paramsTarget[keys[i]] || {}; // Ensure path exists in stored params
                paramsTarget = paramsTarget[keys[i]];
            }
            const finalKey = keys[keys.length - 1];

            // Update the stored plain JS object
            paramsTarget[finalKey] = value;

            // Update the Tone.js instrument instance
            if (target && target[finalKey] && typeof target[finalKey].setValueAtTime === 'function') {
                // If it's a Tone.Param or Signal, use setValueAtTime or rampTo
                target[finalKey].setValueAtTime(value, Tone.now()); // Or rampTo for smoother changes
            } else if (target && typeof target[finalKey] !== 'undefined' && typeof target[finalKey].value !== 'undefined') {
                 // Handles cases like filter.frequency.value where frequency is a Signal
                 target[finalKey].value = value;
            }
            else if (target && typeof target[finalKey] !== 'undefined') {
                // Direct property assignment (e.g., oscillator.type)
                target[finalKey] = value;
            } else if (typeof target.set === 'function') {
                // For complex objects that use a .set() method (like Tone.OmniOscillator or Instrument)
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
        this.setupToneSampler(); // Re-initialize Tone.Sampler with new root note
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
        // Update Tone.Sampler envelope params if applicable
        if (this.toneSampler && !this.toneSampler.disposed) {
            if (param === 'attack' && typeof this.toneSampler.attack !== 'undefined') this.toneSampler.attack = value;
            if (param === 'release' && typeof this.toneSampler.release !== 'undefined') this.toneSampler.release = value;
            // Note: Tone.Sampler doesn't directly expose decay/sustain in the same way as AmplitudeEnvelope
        }
    }

    // --- Undo/Redo Helper ---
    _captureUndoState(description) {
        if (this.appServices.captureStateForUndo) {
            this.appServices.captureStateForUndo(description);
        }
    }

    // --- Sequence Management (for non-Audio tracks) ---
    createNewSequence(name = `Sequence ${this.sequences.length + 1}`) {
        if (this.type === 'Audio') return null; // Audio tracks don't use these sequences
        const newSeqId = `seq_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        let numRowsForGrid;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRowsForGrid = Constants.synthPitches.length;
        else if (this.type === 'Sampler') numRowsForGrid = this.slices.length > 0 ? this.slices.length : Constants.numSlices;
        else if (this.type === 'DrumSampler') numRowsForGrid = Constants.numDrumSamplerPads;
        else numRowsForGrid = 1; // Fallback, should not happen for valid types

        if (numRowsForGrid === 0 && (this.type === 'Synth' || this.type === 'InstrumentSampler' || this.type === 'Sampler' || this.type === 'DrumSampler')) {
             console.warn(`[Track ${this.id} createNewSequence] numRowsForGrid was 0 for type ${this.type}, defaulting to 1.`);
             numRowsForGrid = 1; // Ensure at least one row
        }

        const newSequence = {
            id: newSeqId,
            name: name,
            data: Array(numRowsForGrid).fill(null).map(() => Array(Constants.defaultStepsPerBar).fill(null)),
            length: Constants.defaultStepsPerBar
        };
        this.sequences.push(newSequence);
        this.activeSequenceId = newSeqId; // Set the new sequence as active
        this.recreateToneSequence(true); // Rebuild Tone.Sequence for the new active one
        if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        console.log(`[Track ${this.id}] Created new sequence: ${name} (ID: ${newSeqId})`);
        return newSequence;
    }

    deleteSequence(sequenceId) {
        if (this.type === 'Audio' || this.sequences.length <= 1) {
            if(this.appServices.showNotification) this.appServices.showNotification("Cannot delete the last sequence.", 2000);
            return;
        }
        const index = this.sequences.findIndex(s => s.id === sequenceId);
        if (index > -1) {
            const deletedSeqName = this.sequences[index].name;
            this._captureUndoState(`Delete sequence "${deletedSeqName}" from ${this.name}`);
            this.sequences.splice(index, 1);
            if (this.activeSequenceId === sequenceId) {
                this.activeSequenceId = this.sequences[0]?.id || null; // Set to first or null
            }
            this.recreateToneSequence(true);
            // Remove any timeline clips that were using this sequence
            this.timelineClips = this.timelineClips.filter(clip => clip.type !== 'sequence' || clip.sourceSequenceId !== sequenceId);
            if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
            if (this.appServices.renderTimeline) this.appServices.renderTimeline();
            console.log(`[Track ${this.id}] Deleted sequence: ${deletedSeqName} (ID: ${sequenceId})`);
        }
    }

    renameSequence(sequenceId, newName) {
        if (this.type === 'Audio') return;
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (sequence && newName.trim() !== "") {
            const oldName = sequence.name;
            this._captureUndoState(`Rename sequence "${oldName}" to "${newName}" on ${this.name}`);
            sequence.name = newName.trim();
            if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
            // Update names in timeline clips if they exist
            this.timelineClips.forEach(clip => {
                if (clip.type === 'sequence' && clip.sourceSequenceId === sequenceId) {
                    // clip.name = newName; // Or derive from sequence name if desired
                }
            });
            if (this.appServices.renderTimeline) this.appServices.renderTimeline();
            console.log(`[Track ${this.id}] Renamed sequence ID ${sequenceId} to: ${newName}`);
        }
    }

    duplicateSequence(sequenceId) {
        if (this.type === 'Audio') return null;
        const originalSequence = this.sequences.find(s => s.id === sequenceId);
        if (!originalSequence) return null;

        const newSeqId = `seq_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        const newSequence = {
            id: newSeqId,
            name: `${originalSequence.name} Copy`,
            data: JSON.parse(JSON.stringify(originalSequence.data)), // Deep copy data
            length: originalSequence.length
        };
        this.sequences.push(newSequence);
        this._captureUndoState(`Duplicate sequence "${originalSequence.name}" on ${this.name}`);
        if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        console.log(`[Track ${this.id}] Duplicated sequence: ${originalSequence.name} to ${newSequence.name} (ID: ${newSeqId})`);
        return newSequence;
    }


    setActiveSequence(sequenceId) {
        if (this.type === 'Audio') return;
        const seq = this.sequences.find(s => s.id === sequenceId);
        if (seq && this.activeSequenceId !== sequenceId) {
            console.log(`[Track ${this.id}] Setting active sequence to: ${seq.name} (ID: ${sequenceId})`);
            this.activeSequenceId = sequenceId;
            this.recreateToneSequence(true); // Rebuild Tone.Sequence for the new active one
            if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
    }

    doubleSequence() { // Doubles the length of the active sequence
        if (this.type === 'Audio') return;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq) return;

        this._captureUndoState(`Double Sequence Length for ${activeSeq.name} on ${this.name}`);

        const oldLength = activeSeq.length;
        const newLength = oldLength * 2;
        if (newLength > (Constants.MAX_BARS * Constants.STEPS_PER_BAR)) {
            if(this.appServices.showNotification) this.appServices.showNotification(`Cannot double length, exceeds maximum of ${Constants.MAX_BARS} bars.`, 3000);
            return;
        }

        activeSeq.data.forEach(row => {
            if(row) { // If row exists
               const copyOfOriginal = row.slice(0, oldLength); // Copy what was there
               row.length = newLength; // Extend the row
               // Fill new part with nulls first
               for(let i = oldLength; i < newLength; i++) {
                   row[i] = null;
               }
               // Copy original data to the second half
               for(let i = 0; i < oldLength; i++) {
                   if (copyOfOriginal[i]) { // Only copy if there was data
                       row[oldLength + i] = JSON.parse(JSON.stringify(copyOfOriginal[i]));
                   }
               }
            }
        });
        activeSeq.length = newLength;
        this.recreateToneSequence(true);
        if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
    }

    setSequenceLength(newLengthInSteps, skipUndoCapture = false) {
        if (this.type === 'Audio') return;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq) {
            console.warn(`[Track ${this.id} setSequenceLength] No active sequence to set length for.`);
            return;
        }

        const oldActualLength = activeSeq.length; // The actual current length of the sequence data
        newLengthInSteps = Math.max(Constants.STEPS_PER_BAR, parseInt(newLengthInSteps) || Constants.defaultStepsPerBar);
        newLengthInSteps = Math.ceil(newLengthInSteps / Constants.STEPS_PER_BAR) * Constants.STEPS_PER_BAR; // Ensure it's a multiple of STEPS_PER_BAR
        newLengthInSteps = Math.min(newLengthInSteps, Constants.MAX_BARS * Constants.STEPS_PER_BAR); // Clamp to max bars

        if (!skipUndoCapture && oldActualLength !== newLengthInSteps) {
            this._captureUndoState(`Set Seq Length for ${activeSeq.name} on ${this.name} to ${newLengthInSteps / Constants.STEPS_PER_BAR} bars`);
        }
        activeSeq.length = newLengthInSteps; // Update the sequence's length property

        // Adjust the data array for each row
        let numRows;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRows = Constants.synthPitches.length;
        else if (this.type === 'Sampler') numRows = this.slices.length > 0 ? this.slices.length : Constants.numSlices;
        else if (this.type === 'DrumSampler') numRows = Constants.numDrumSamplerPads;
        else numRows = (activeSeq.data && activeSeq.data.length > 0) ? activeSeq.data.length : 1; // Fallback

        const currentSequenceData = activeSeq.data || []; // Ensure data array exists
        activeSeq.data = Array(numRows).fill(null).map((_, rIndex) => {
            const currentRow = currentSequenceData[rIndex] || []; // Get existing row or empty
            const newRow = Array(activeSeq.length).fill(null); // Create new row with target length
            for (let c = 0; c < Math.min(currentRow.length, activeSeq.length); c++) newRow[c] = currentRow[c]; // Copy existing data
            return newRow;
        });

        this.recreateToneSequence(true); // Rebuild Tone.Sequence with new length
        if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
    }

    // --- Tone.Sequence Playback (for Sequencer Mode) ---
    recreateToneSequence(forceRestart = false, startTimeOffset = 0) {
        if (this.type === 'Audio') return; // Audio tracks use timeline playback primarily
        const currentPlaybackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        console.log(`[Track ${this.id} recreateToneSequence] Called. ActiveSeqID: ${this.activeSequenceId}. Current Playback Mode: ${currentPlaybackMode}`);

        // Dispose existing Tone.Sequence if it exists
        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            console.log(`[Track ${this.id} recreateToneSequence] Disposing existing Tone.Sequence.`);
            this.patternPlayerSequence.stop();
            this.patternPlayerSequence.clear(); // Remove all events
            this.patternPlayerSequence.dispose();
            this.patternPlayerSequence = null;
        }

        // Only create a new Tone.Sequence if in 'sequencer' mode
        if (currentPlaybackMode !== 'sequencer') {
            console.log(`[Track ${this.id} recreateToneSequence] Playback mode is '${currentPlaybackMode}'. Not creating sequencer player sequence.`);
            return;
        }

        const activeSeq = this.getActiveSequence();
        if (!activeSeq) {
            console.warn(`[Track ${this.id} recreateToneSequence] No active sequence found (ID: ${this.activeSequenceId}). Aborting.`);
            return;
        }
        if (!activeSeq.data || !Array.isArray(activeSeq.data)) {
            console.warn(`[Track ${this.id} recreateToneSequence] Active sequence '${activeSeq.name}' has invalid or no data. Aborting. Data:`, activeSeq.data);
            return;
        }
        if (activeSeq.length === 0 || activeSeq.length === undefined || !Number.isFinite(activeSeq.length) || activeSeq.length < Constants.STEPS_PER_BAR) {
            console.warn(`[Track ${this.id} recreateToneSequence] Active sequence '${activeSeq.name}' has invalid length: ${activeSeq.length}. Defaulting to ${Constants.defaultStepsPerBar}.`);
            activeSeq.length = Constants.defaultStepsPerBar; // Correct the length if invalid
            // Potentially re-initialize data array structure here if length was bad
        }

        const sequenceDataForTone = activeSeq.data;
        const sequenceLengthForTone = activeSeq.length;
        console.log(`[Track ${this.id} recreateToneSequence] Creating Tone.Sequence for '${activeSeq.name}' with ${sequenceLengthForTone} steps and ${sequenceDataForTone.length} rows for SEQUENCER mode. Data snapshot:`, JSON.stringify(sequenceDataForTone.slice(0, 2)));

        if(sequenceDataForTone.length === 0 && sequenceLengthForTone > 0){
            console.warn(`[Track ${this.id} recreateToneSequence] Sequence data has 0 rows, but length is ${sequenceLengthForTone}. This might lead to issues or an empty sequence.`);
            // Potentially initialize data with empty rows if this is an issue
        }
        if (sequenceLengthForTone === 0) {
            console.warn(`[Track ${this.id} recreateToneSequence] sequenceLengthForTone is 0. Tone.Sequence will likely not fire events.`);
            // Potentially set to a default length if 0 is problematic
        }


        this.patternPlayerSequence = new Tone.Sequence((time, col) => {
            // Log current gain for debugging mute/solo issues
            const currentTrackGain = this.gainNode && !this.gainNode.disposed ? this.gainNode.gain.value : 'N/A (GainNode issue)';
            console.log(`[Track ${this.id} Sequencer Event] Time: ${time.toFixed(3)}, Col: ${col}, Type: ${this.type}, TrackGain: ${currentTrackGain.toFixed ? currentTrackGain.toFixed(2) : currentTrackGain}`);


            // Double-check playback mode inside the callback, as it might change mid-sequence
            const playbackModeCheck = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
            if (playbackModeCheck !== 'sequencer') {
                if (this.patternPlayerSequence && this.patternPlayerSequence.state === 'started') {
                    this.patternPlayerSequence.stop(); // Stop if mode changed
                }
                console.log(`[Track ${this.id} Sequencer Event] Mode changed mid-sequence. Stopping.`);
                return;
            }

            const currentGlobalSoloId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
            const isEffectivelyMuted = this.isMuted || (currentGlobalSoloId !== null && currentGlobalSoloId !== this.id);

            if (this.appServices.highlightPlayingStep) {
                 this.appServices.highlightPlayingStep(this.id, col);
            }

            if (!this.gainNode || this.gainNode.disposed || isEffectivelyMuted) {
                console.log(`[Track ${this.id} Sequencer Event] Muted or no gainNode. Skipping playback for col ${col}. Muted: ${this.isMuted}, Soloed: ${this.isSoloed}, EffectiveMute: ${isEffectivelyMuted}, GainNode Valid: ${!!(this.gainNode && !this.gainNode.disposed)}`);
                return;
            }

            // Determine where the instrument/player should connect (start of effects or directly to gain)
            const effectsChainStartPoint = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                ? this.activeEffects[0].toneNode
                : (this.gainNode && !this.gainNode.disposed ? this.gainNode : null); // Fallback to gainNode

            if (!effectsChainStartPoint) {
                console.warn(`[Track ${this.id} Sequencer Event] No valid output (effectsChainStartPoint is null) for instrument/player at col ${col}. GainNode: ${this.gainNode ? this.gainNode.toString() : 'null'}`);
                return; // Cannot play if no valid output path
            }

            // Type-specific playback logic
            if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
                 let notePlayedThisStep = false; // MonoSynth behavior: only one note per step
                 for (let rowIndex = 0; rowIndex < Constants.synthPitches.length; rowIndex++) {
                    if (!sequenceDataForTone[rowIndex]) continue; // Skip if row doesn't exist (e.g. after length change)
                    const pitchName = Constants.synthPitches[rowIndex];
                    const step = sequenceDataForTone[rowIndex]?.[col]; // Safely access step data
                    if (step?.active && !notePlayedThisStep) { // Check if step is active
                        const synthVol = this.instrument.volume.value; // For logging
                        console.log(`[Track ${this.id} Synth] Playing ${pitchName} at col ${col}, time ${time.toFixed(3)}. SynthVol(dB): ${synthVol.toFixed(2)}, StepVel: ${step.velocity.toFixed(2)}, Target: ${effectsChainStartPoint.toString()}`);
                        this.instrument.triggerAttackRelease(pitchName, "8n", time, step.velocity * Constants.defaultVelocity);
                        notePlayedThisStep = true; // Prevent multiple notes for MonoSynth
                    }
                }
            } else if (this.type === 'Sampler') {
                this.slices.forEach((sliceData, sliceIndex) => {
                    if (!sequenceDataForTone[sliceIndex]) return;
                    const step = sequenceDataForTone[sliceIndex]?.[col];
                    if (step?.active && sliceData?.duration > 0 && this.audioBuffer?.loaded) {
                        const targetVolumeLinear = sliceData.volume * step.velocity; // Apply step velocity to slice volume
                        console.log(`[Track ${this.id} Sampler] Playing slice ${sliceIndex} at col ${col}, time ${time.toFixed(3)}. SliceVolLin: ${sliceData.volume.toFixed(2)}, StepVel: ${step.velocity.toFixed(2)}, FinalLinVol: ${targetVolumeLinear.toFixed(2)}, Target: ${effectsChainStartPoint.toString()}`);
                        const playbackRate = Math.pow(2, (sliceData.pitchShift || 0) / 12);
                        let playDuration = sliceData.duration / playbackRate;
                        if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds(); // Or a configurable loop duration

                        if (this.slicerIsPolyphonic) {
                            const tempPlayer = new Tone.Player(this.audioBuffer);
                            const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                            const tempGain = new Tone.Gain(targetVolumeLinear); // Use calculated volume
                            tempPlayer.chain(tempEnv, tempGain, effectsChainStartPoint); // Connect to effects chain
                            tempPlayer.playbackRate = playbackRate; tempPlayer.reverse = sliceData.reverse; tempPlayer.loop = sliceData.loop;
                            tempPlayer.loopStart = sliceData.offset; tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
                            tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            tempEnv.triggerAttack(time);
                            if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95); // Slightly before player stops
                            // Schedule disposal of transient nodes
                            Tone.Transport.scheduleOnce(() => { if(tempPlayer && !tempPlayer.disposed) tempPlayer.dispose(); if(tempEnv && !tempEnv.disposed) tempEnv.dispose(); if(tempGain && !tempGain.disposed) tempGain.dispose(); }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);
                        } else if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                            // Stop previous note if playing
                            if (this.slicerMonoPlayer.state === 'started') this.slicerMonoPlayer.stop(time);
                            this.slicerMonoEnvelope.triggerRelease(time); // Ensure envelope is released before retriggering

                            this.slicerMonoPlayer.buffer = this.audioBuffer; // Ensure buffer is current
                            this.slicerMonoEnvelope.set(sliceData.envelope);
                            this.slicerMonoGain.gain.value = targetVolumeLinear;
                            this.slicerMonoPlayer.playbackRate = playbackRate;
                            this.slicerMonoPlayer.reverse = sliceData.reverse;
                            this.slicerMonoPlayer.loop = sliceData.loop;
                            this.slicerMonoPlayer.loopStart = sliceData.offset;
                            this.slicerMonoPlayer.loopEnd = sliceData.offset + sliceData.duration;

                            this.slicerMonoPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            this.slicerMonoEnvelope.triggerAttack(time);
                            if (!sliceData.loop) {
                                const releaseTime = time + playDuration - (sliceData.envelope.release * 0.05); // Small adjustment for release tail
                                this.slicerMonoEnvelope.triggerRelease(Math.max(time, releaseTime));
                            }
                        }
                    }
                });
            } else if (this.type === 'DrumSampler') {
                Array.from({ length: Constants.numDrumSamplerPads }).forEach((_, padIndex) => {
                    if (!sequenceDataForTone[padIndex]) {
                        // console.warn(`[Track ${this.id} DrumSampler] Pad ${padIndex}, Col ${col}: Row data undefined.`);
                        return;
                    }
                    const step = sequenceDataForTone[padIndex]?.[col];
                    const padData = this.drumSamplerPads[padIndex];

                    if (!step?.active) {
                        // console.log(`[Track ${this.id} DrumSampler] Pad ${padIndex}, Col ${col}: Step not active.`);
                        return;
                    }
                    if (!padData) {
                        console.warn(`[Track ${this.id} DrumSampler] Pad ${padIndex}, Col ${col}: No padData found.`);
                        return;
                    }
                    if (!this.drumPadPlayers[padIndex]) {
                         console.warn(`[Track ${this.id} DrumSampler] Pad ${padIndex}, Col ${col}: Player not initialized (drumPadPlayers[${padIndex}] is null).`);
                        return;
                    }
                    if (this.drumPadPlayers[padIndex].disposed) {
                         console.warn(`[Track ${this.id} DrumSampler] Pad ${padIndex}, Col ${col}: Player is disposed.`);
                        return;
                    }
                    if (!this.drumPadPlayers[padIndex].loaded) {
                        console.warn(`[Track ${this.id} DrumSampler] Pad ${padIndex}, Col ${col}: Player buffer not loaded. Pad status: ${padData.status}`);
                        return;
                    }


                    const player = this.drumPadPlayers[padIndex];
                    const targetVolumeLinear = padData.volume * step.velocity * 0.8; // 0.8 factor for headroom
                    const targetVolumeDb = Tone.gainToDb(targetVolumeLinear); // Player volume is in dB
                    console.log(`[Track ${this.id} DrumSampler] Playing pad ${padIndex} at col ${col}, time ${time.toFixed(3)}. PadVolLin: ${padData.volume.toFixed(2)}, StepVel: ${step.velocity.toFixed(2)}, TargetVolLin: ${targetVolumeLinear.toFixed(2)}, TargetVolDb: ${targetVolumeDb.toFixed(2)}, TargetNode: ${effectsChainStartPoint.toString()}`);
                    player.volume.value = targetVolumeDb;
                    player.playbackRate = Math.pow(2, (padData.pitchShift || 0) / 12);
                    // Ensure player is connected to the current effects chain start point
                    // This might be redundant if rebuildEffectChain handles it, but good for safety.
                    // player.disconnect(); // Disconnect from previous if any (safer)
                    // player.connect(effectsChainStartPoint); // Connect to current chain
                    player.start(time); // Play the sample

                });
            } else if (this.type === 'InstrumentSampler' && this.toneSampler?.loaded) {
                 let notePlayedThisStepInColumn = false; // For mono behavior if instrumentSamplerIsPolyphonic is false
                 Constants.synthPitches.forEach((pitchName, rowIndex) => {
                    if (!sequenceDataForTone[rowIndex]) return;
                    const step = sequenceDataForTone[rowIndex]?.[col];
                    if (step?.active) {
                        if (!this.instrumentSamplerIsPolyphonic && !notePlayedThisStepInColumn) {
                            this.toneSampler.releaseAll(time); // Stop previous note for mono
                            notePlayedThisStepInColumn = true;
                        }
                        const samplerVolume = this.toneSampler.volume.value; // For logging
                        console.log(`[Track ${this.id} InstrumentSampler] Playing ${pitchName} at col ${col}, time ${time.toFixed(3)}. SamplerVol(dB): ${samplerVolume.toFixed(2)}, StepVel: ${step.velocity.toFixed(2)}, Target: ${effectsChainStartPoint.toString()}`);
                        this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "8n", time, step.velocity * Constants.defaultVelocity);
                    }
                });
            }
        }, Array.from(Array(sequenceLengthForTone).keys()), "16n"); // Events for each 16th note step

        this.patternPlayerSequence.loop = true; // Default to loop
        console.log(`[Track ${this.id} recreateToneSequence] Tone.Sequence for '${activeSeq.name}' prepared. Loop: ${this.patternPlayerSequence.loop}. It will be started by schedulePlayback.`);


        // Update UI if a sequencer window is open for this track
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
    }

    // --- Timeline Playback (for Audio Tracks and Sequence Clips) ---
    async addAudioClip(blob, startTime) { // For Audio Tracks when recording
        if (this.type !== 'Audio') return;
        const clipId = `audioclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        const dbKey = `clip_${this.id}_${Date.now()}.wav`; // Unique key for IndexedDB

        try {
            await storeAudio(dbKey, blob); // Store the audio blob
            const duration = await this.getBlobDuration(blob); // Get duration for the clip

            const newClip = {
                id: clipId,
                type: 'audio', // Explicitly audio
                sourceId: dbKey, // Link to the stored audio data
                startTime: startTime,
                duration: duration,
                name: `Rec ${new Date().toLocaleTimeString()}` // Default name
            };

            this.timelineClips.push(newClip);
            console.log(`[Track ${this.id}] Added audio clip to timelineClips:`, newClip);

            // Update the timeline UI
            if (this.appServices.renderTimeline) {
                this.appServices.renderTimeline();
            }

        } catch (error) {
            console.error("Error adding audio clip:", error);
            if (this.appServices.showNotification) {
                this.appServices.showNotification("Failed to save recorded clip.", 3000);
            }
        }
    }

    async getBlobDuration(blob) {
        const tempUrl = URL.createObjectURL(blob);
        const audioContext = Tone.context.rawContext; // Get the underlying AudioContext
        try {
            const arrayBuffer = await fetch(tempUrl).then(res => res.arrayBuffer());
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            return audioBuffer.duration;
        } catch (e) {
            console.error("Error getting blob duration:", e);
            return 0; // Fallback duration
        } finally {
            URL.revokeObjectURL(tempUrl);
        }
    }

    async schedulePlayback(transportStartTime, transportStopTime) {
        const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        console.log(`[Track ${this.id} (${this.type})] schedulePlayback. Mode: ${playbackMode}. Transport Start: ${transportStartTime}, Stop: ${transportStopTime}`);

        this.stopPlayback(); // Clear any existing players or scheduled events for this track

        if (playbackMode === 'timeline') {
            console.log(`[Track ${this.id}] In TIMELINE mode. Scheduling ${this.timelineClips.length} timeline clips.`);
            // Stop sequencer pattern if it was running
            if (this.patternPlayerSequence && this.patternPlayerSequence.state === 'started') {
                console.log(`[Track ${this.id}] Timeline mode: Stopping active patternPlayerSequence.`);
                this.patternPlayerSequence.stop();
            }
            for (const clip of this.timelineClips) {
                const clipActualStartOnTransport = clip.startTime;
                const clipActualEndOnTransport = clip.startTime + clip.duration;

                // Determine if and how much of the clip falls within the transport's current play window
                const effectivePlayStartOnTransport = Math.max(clipActualStartOnTransport, transportStartTime);
                const effectivePlayEndOnTransport = Math.min(clipActualEndOnTransport, transportStopTime);

                let playDurationInWindow = effectivePlayEndOnTransport - effectivePlayStartOnTransport;

                if (playDurationInWindow <= 1e-3) { // If duration is negligible, skip
                    continue;
                }

                const offsetIntoSource = Math.max(0, effectivePlayStartOnTransport - clipActualStartOnTransport);

                if (clip.type === 'audio') {
                    console.log(`[Track ${this.id}] Scheduling AUDIO clip ${clip.id} ('${clip.name}') at ${effectivePlayStartOnTransport} for ${playDurationInWindow}s (offset ${offsetIntoSource}s)`);
                    const player = new Tone.Player(); // Create a new player for each clip instance
                    this.clipPlayers.set(clip.id, player); // Store it for potential stop/dispose later
                    try {
                        const audioBlob = await getAudio(clip.sourceId); // Fetch blob from DB
                        if (audioBlob) {
                            const url = URL.createObjectURL(audioBlob);
                            player.onload = () => {
                                URL.revokeObjectURL(url); // Clean up object URL after load
                                // Connect player to the start of this track's effect chain or gain node
                                const destinationNode = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                                    ? this.activeEffects[0].toneNode
                                    : (this.gainNode && !this.gainNode.disposed ? this.gainNode : null);

                                if (destinationNode) player.connect(destinationNode); else player.toDestination(); // Fallback

                                player.start(effectivePlayStartOnTransport, offsetIntoSource, playDurationInWindow);
                            };
                            player.onerror = (error) => { console.error(`[Track ${this.id}] Error loading audio for clip ${clip.id}:`, error); URL.revokeObjectURL(url); if (this.clipPlayers.has(clip.id)) { if(!player.disposed) player.dispose(); this.clipPlayers.delete(clip.id); }};
                            await player.load(url);
                        } else { if (!player.disposed) player.dispose(); this.clipPlayers.delete(clip.id); } // No blob found
                    } catch (error) { console.error(`[Track ${this.id}] Error in schedulePlayback for audio clip ${clip.id}:`, error); if (this.clipPlayers.has(clip.id)) { const p = this.clipPlayers.get(clip.id); if(p && !p.disposed) p.dispose(); this.clipPlayers.delete(clip.id); }}
                } else if (clip.type === 'sequence') {
                    const sourceSequence = this.sequences.find(s => s.id === clip.sourceSequenceId);
                    if (sourceSequence && sourceSequence.data && sourceSequence.data.length > 0 && sourceSequence.length > 0) {
                        console.log(`[Track ${this.id}] Timeline: Scheduling SEQUENCE clip '${clip.name}' (Source: ${sourceSequence.name}) from ${effectivePlayStartOnTransport} for ${playDurationInWindow}s`);

                        const sixteenthTime = Tone.Time("16n").toSeconds(); // Duration of one 16th note step
                        const totalEventsInSourceSeq = sourceSequence.length;

                        for(let stepIndex = 0; stepIndex < totalEventsInSourceSeq; stepIndex++) {
                            const timeWithinSourceSeq = stepIndex * sixteenthTime; // Time of this step relative to sequence start
                            const actualTransportTimeForStep = clipActualStartOnTransport + timeWithinSourceSeq;

                            // Only schedule events that fall within the current transport play window
                            if (actualTransportTimeForStep >= effectivePlayStartOnTransport && actualTransportTimeForStep < effectivePlayEndOnTransport) {
                                // Iterate over rows (pitches/pads) for this step
                                for (let rowIndex = 0; rowIndex < sourceSequence.data.length; rowIndex++) {
                                    const stepData = sourceSequence.data[rowIndex]?.[stepIndex];
                                    if (stepData?.active) {
                                        // Schedule the note/event using Tone.Transport.scheduleOnce
                                        Tone.Transport.scheduleOnce((time) => { // `time` here is the precise scheduled audio context time
                                            const currentGlobalSoloId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
                                            const isEffectivelyMuted = this.isMuted || (currentGlobalSoloId !== null && currentGlobalSoloId !== this.id);
                                            if (!this.gainNode || this.gainNode.disposed || isEffectivelyMuted) return;

                                            const effectsChainStartPoint = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                                                ? this.activeEffects[0].toneNode
                                                : (this.gainNode && !this.gainNode.disposed ? this.gainNode : null);
                                            if (!effectsChainStartPoint) return;

                                            // Type-specific playback logic (similar to recreateToneSequence callback)
                                            if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
                                                const pitchName = Constants.synthPitches[rowIndex];
                                                if (pitchName) this.instrument.triggerAttackRelease(pitchName, "16n", time, stepData.velocity * Constants.defaultVelocity);
                                            } else if (this.type === 'Sampler' && this.audioBuffer?.loaded) {
                                                const sliceData = this.slices[rowIndex];
                                                if (sliceData?.duration > 0) {
                                                    const tempPlayer = new Tone.Player(this.audioBuffer);
                                                    const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                                                    const tempGain = new Tone.Gain(stepData.velocity * sliceData.volume);
                                                    tempPlayer.chain(tempEnv, tempGain, effectsChainStartPoint);
                                                    const playbackRate = Math.pow(2, (sliceData.pitchShift || 0) / 12);
                                                    let playDuration = sliceData.duration / playbackRate;
                                                    tempPlayer.playbackRate = playbackRate; tempPlayer.reverse = sliceData.reverse;
                                                    tempPlayer.loop = false; // Sequence clips typically don't loop individual notes unless intended
                                                    tempPlayer.start(time, sliceData.offset, playDuration);
                                                    tempEnv.triggerAttack(time);
                                                    tempEnv.triggerRelease(time + playDuration * 0.95);
                                                    Tone.Transport.scheduleOnce(() => { if(tempPlayer && !tempPlayer.disposed) tempPlayer.dispose(); if(tempEnv && !tempEnv.disposed) tempEnv.dispose(); if(tempGain && !tempGain.disposed) tempGain.dispose(); }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);
                                                }
                                            } else if (this.type === 'DrumSampler' && this.drumPadPlayers[rowIndex]?.loaded) {
                                                const player = this.drumPadPlayers[rowIndex];
                                                const padData = this.drumSamplerPads[rowIndex];
                                                player.volume.value = Tone.gainToDb(padData.volume * stepData.velocity * 0.7);
                                                player.playbackRate = Math.pow(2, (padData.pitchShift || 0) / 12);
                                                player.start(time);
                                            } else if (this.type === 'InstrumentSampler' && this.toneSampler?.loaded) {
                                                const pitchName = Constants.synthPitches[rowIndex];
                                                if (pitchName) this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "16n", time, stepData.velocity * Constants.defaultVelocity);
                                            }
                                        }, actualTransportTimeForStep);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else { // Sequencer Mode
            if (!this.patternPlayerSequence || this.patternPlayerSequence.disposed) {
                console.log(`[Track ${this.id}] Sequencer mode: patternPlayerSequence is null or disposed. Attempting to recreate.`);
                this.recreateToneSequence(true, transportStartTime); // Pass transportStartTime as offset
            }
            if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
                if (this.patternPlayerSequence.state === 'started') {
                    this.patternPlayerSequence.stop(Tone.Transport.now()); // Stop if already running before restarting
                }
                console.log(`[Track ${this.id}] Sequencer mode: Starting/Restarting patternPlayerSequence at transport offset: ${transportStartTime}. Sequence loop: ${this.patternPlayerSequence.loop}`);
                this.patternPlayerSequence.start(transportStartTime); // Start sequence at the given transport time
            } else {
                 console.warn(`[Track ${this.id}] Sequencer mode: patternPlayerSequence still not valid after recreation attempt.`);
            }
        }
    }

    stopPlayback() {
        console.log(`[Track ${this.id}] stopPlayback called. Current timeline clip players: ${this.clipPlayers.size}`);
        // Stop and dispose timeline clip players
        const playersToStop = Array.from(this.clipPlayers.values());

        playersToStop.forEach(player => {
            if (player && !player.disposed) {
                try {
                    player.unsync(); // Unsync if it was synced (though likely not for direct start)
                    player.stop(Tone.Transport.now()); // Stop immediately
                    player.dispose();
                } catch (e) {
                    console.warn(`[Track ${this.id}] Error stopping/disposing a timeline clip player:`, e);
                }
            }
        });
        this.clipPlayers.clear(); // Clear the map

        // Stop sequencer pattern player if it's running
        if (this.patternPlayerSequence && this.patternPlayerSequence.state === 'started') {
            this.patternPlayerSequence.stop(); // Stop sequencer pattern
            console.log(`[Track ${this.id}] Stopped patternPlayerSequence.`);
        }
        // Note: Do not dispose patternPlayerSequence here, as it's reused. It's disposed in recreateToneSequence or track.dispose.
    }


    // --- Timeline Clip Management (for Audio Tracks) ---
    async updateAudioClipPosition(clipId, newStartTime) {
        const clip = this.timelineClips.find(c => c.id === clipId);
        if (clip) {
            const oldStartTime = clip.startTime;
            clip.startTime = Math.max(0, newStartTime); // Ensure start time is not negative
            console.log(`[Track ${this.id}] Updated ${clip.type} clip ${clipId} startTime from ${oldStartTime} to ${clip.startTime}`);

            // Re-render timeline UI
            if (this.appServices.renderTimeline) {
                this.appServices.renderTimeline();
            }

            // If transport is running in timeline mode, we might need to reschedule
            const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
            if (Tone.Transport.state === 'started' && playbackMode === 'timeline') {
                const currentPlayheadPosition = Tone.Transport.seconds;
                console.log(`[Track ${this.id}] Transport is running at ${currentPlayheadPosition}s. Handling clip move in timeline mode.`);

                // Pause, clear all scheduled events for all tracks, reschedule, and resume
                // This is a heavy operation but ensures correct playback after a move.
                Tone.Transport.pause();
                console.log(`[Track ${this.id}] Transport paused for rescheduling.`);

                const allTracks = this.appServices.getTracks ? this.appServices.getTracks() : [];
                allTracks.forEach(t => {
                    if (typeof t.stopPlayback === 'function') {
                        t.stopPlayback(); // Clear players/sequences for each track
                    }
                });

                Tone.Transport.cancel(0); // Clear all Tone.Transport scheduled events globally
                console.log(`[Track ${this.id}] Called Tone.Transport.cancel(0) globally.`);

                // Determine new scheduling window (e.g., from current playhead to a reasonable lookahead or loop end)
                const lookaheadDuration = 300; // seconds, adjust as needed
                const transportStopTime = Tone.Transport.loop && Tone.Transport.loopEnd > 0 ?
                                          Tone.Transport.loopEnd :
                                          (currentPlayheadPosition + lookaheadDuration);

                console.log(`[Track ${this.id}] Re-scheduling ALL tracks from ${currentPlayheadPosition} to ${transportStopTime}.`);
                for (const t of allTracks) {
                    if (typeof t.schedulePlayback === 'function') {
                        await t.schedulePlayback(currentPlayheadPosition, transportStopTime);
                    }
                }

                Tone.Transport.start(Tone.Transport.now() + 0.1, currentPlayheadPosition); // Restart from current position with a slight delay
                console.log(`[Track ${this.id}] Restarted transport from ${currentPlayheadPosition}s after rescheduling.`);
            }
        } else {
            console.warn(`[Track ${this.id}] Could not find clip ${clipId} to update its position.`);
        }
    }

    // --- Disposal ---
    dispose() {
        console.log(`[Track ${this.id} Dispose] Starting disposal for track: ${this.name}`);

        // Dispose Tone.Sequence for pattern playback
        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            this.patternPlayerSequence.stop();
            this.patternPlayerSequence.clear();
            this.patternPlayerSequence.dispose();
            this.patternPlayerSequence = null;
        }

        // Dispose main instrument/sampler nodes
        if (this.instrument && !this.instrument.disposed) { // For Synth
            this.instrument.dispose();
            this.instrument = null;
        }
        if (this.toneSampler && !this.toneSampler.disposed) { // For InstrumentSampler
            this.toneSampler.dispose();
            this.toneSampler = null;
        }

        // Dispose Slicer specific mono nodes
        this.disposeSlicerMonoNodes();

        // Dispose DrumSampler players
        this.drumPadPlayers.forEach((player, index) => {
            if (player && !player.disposed) {
                player.dispose();
            }
            this.drumPadPlayers[index] = null;
        });

        // Dispose active effects
        this.activeEffects.forEach(effect => {
            if (effect.toneNode && !effect.toneNode.disposed) {
                effect.toneNode.dispose();
            }
        });
        this.activeEffects = [];

        // Dispose core track audio nodes
        if (this.gainNode && !this.gainNode.disposed) {
            this.gainNode.dispose();
            this.gainNode = null;
        }
        if (this.trackMeter && !this.trackMeter.disposed) {
            this.trackMeter.dispose();
            this.trackMeter = null;
        }
        if (this.inputChannel && !this.inputChannel.disposed) { // Specific to Audio tracks
            this.inputChannel.dispose();
            this.inputChannel = null;
        }

        // Stop and dispose any timeline clip players
        this.stopPlayback(); // This method handles disposal of clipPlayers

        // Close associated windows
        if (this.appServices.closeAllTrackWindows) {
            console.log(`[Track ${this.id} Dispose] Calling appServices.closeAllTrackWindows for track ID: ${this.id}`);
            this.appServices.closeAllTrackWindows(this.id);
        } else {
            console.warn(`[Track ${this.id} Dispose] appServices.closeAllTrackWindows NOT FOUND.`);
        }

        // Dispose Tone.Buffer instances
        if (this.audioBuffer && !this.audioBuffer.disposed) { // For Sampler
            this.audioBuffer.dispose();
        }
        this.audioBuffer = null;

        this.drumSamplerPads.forEach(p => { // For DrumSampler pads
            if (p.audioBuffer && !p.audioBuffer.disposed) {
                p.audioBuffer.dispose();
            }
            p.audioBuffer = null;
        });

        if (this.instrumentSamplerSettings && this.instrumentSamplerSettings.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) { // For InstrumentSampler
            this.instrumentSamplerSettings.audioBuffer.dispose();
        }
        if (this.instrumentSamplerSettings) {
            this.instrumentSamplerSettings.audioBuffer = null;
        }

        // Nullify other references to help GC and prevent stale references
        this.sequences = [];
        this.timelineClips = [];
        this.appServices = {}; // Break potential circular references if any
        this.inspectorControls = {};
        this.waveformCanvasCtx = null;
        this.instrumentWaveformCanvasCtx = null;

        console.log(`[Track ${this.id} Dispose] Finished disposal for track: ${this.name}`);
    }
}

