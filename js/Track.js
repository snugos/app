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
        this.previousVolumeBeforeMute = initialData?.volume ?? 0.7; // Store volume before mute


        if (this.type === 'Synth') {
            this.synthEngineType = initialData?.synthEngineType || 'MonoSynth'; // e.g., 'MonoSynth', 'FMSynth'
            this.synthParams = initialData?.synthParams ? JSON.parse(JSON.stringify(initialData.synthParams)) : this.getDefaultSynthParams();
            console.log(`[Track ${this.id} CONSTRUCTOR - Synth] Initial synthParams:`, JSON.parse(JSON.stringify(this.synthParams))); // DEBUG
        } else {
            this.synthEngineType = null;
            this.synthParams = {};
        }

        // Sampler (Slicer) specific
        this.samplerAudioData = initialData?.samplerAudioData || {
            fileName: null,
            audioBufferDataURL: null, // Store the Data URL for reconstruction
            status: 'empty' // 'empty', 'loading', 'loaded', 'error', 'missing' (after project load if not found)
        };
        this.audioBuffer = null; // This will hold the actual Tone.Buffer or AudioBuffer object at runtime
        // this.audioBufferDataURL = initialData?.samplerAudioData?.audioBufferDataURL || null; // Moved into samplerAudioData
        this.slices = initialData?.slices || Array(numSlices).fill(null).map(() => ({
            offset: 0, duration: 0, userDefined: false, volume: 1.0, pitchShift: 0,
            loop: false, reverse: false,
            envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 }
        }));
        this.selectedSliceForEdit = initialData?.selectedSliceForEdit || 0;
        this.waveformZoom = initialData?.waveformZoom || 1;
        this.waveformScrollOffset = initialData?.waveformScrollOffset || 0;
        this.slicerIsPolyphonic = initialData?.slicerIsPolyphonic !== undefined ? initialData.slicerIsPolyphonic : true;
        this.slicerMonoPlayer = null; // For mono mode
        this.slicerMonoEnvelope = null;
        this.slicerMonoGain = null;

        // Instrument Sampler specific
        this.instrumentSamplerSettings = initialData?.instrumentSamplerSettings || {
            sampleUrl: null, // Not directly used if audioBufferDataURL is present
            audioBuffer: null, // Runtime Tone.Buffer
            audioBufferDataURL: null,
            originalFileName: null,
            rootNote: 'C4',
            loop: false,
            loopStart: 0,
            loopEnd: 0,
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 },
            status: 'empty'
        };
        this.instrumentSamplerIsPolyphonic = initialData?.instrumentSamplerIsPolyphonic !== undefined ? initialData.instrumentSamplerIsPolyphonic : true;
        this.toneSampler = null; // Tone.Sampler instance

        // Drum Sampler (Pads) specific
        this.drumSamplerPads = initialData?.drumSamplerPads || Array(numDrumSamplerPads).fill(null).map(() => ({
            sampleUrl: null, // Not directly used if audioBufferDataURL is present
            audioBuffer: null, // Runtime Tone.Buffer
            audioBufferDataURL: null,
            originalFileName: null,
            volume: 0.7, pitchShift: 0,
            envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 }, // Simpler AR envelope
            status: 'empty'
        }));
        if (initialData?.drumSamplerPads) {
            initialData.drumSamplerPads.forEach((padData, index) => {
                if (this.drumSamplerPads[index]) { // Ensure target pad exists
                    this.drumSamplerPads[index].audioBufferDataURL = padData.audioBufferDataURL || null;
                    this.drumSamplerPads[index].originalFileName = padData.originalFileName || null;
                    this.drumSamplerPads[index].volume = padData.volume ?? 0.7;
                    this.drumSamplerPads[index].pitchShift = padData.pitchShift ?? 0;
                    this.drumSamplerPads[index].envelope = padData.envelope ? JSON.parse(JSON.stringify(padData.envelope)) : { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 };
                    this.drumSamplerPads[index].status = padData.status || (padData.audioBufferDataURL ? 'missing' : 'empty');
                }
            });
        }
        this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
        this.drumPadPlayers = Array(numDrumSamplerPads).fill(null); // Array of Tone.Player instances

        // Modular Effects
        this.activeEffects = [];
        if (initialData && initialData.activeEffects && Array.isArray(initialData.activeEffects)) {
            initialData.activeEffects.forEach(effectData => {
                const paramsForInstance = effectData.params ? JSON.parse(JSON.stringify(effectData.params)) : {};
                const toneNode = createEffectInstance(effectData.type, paramsForInstance);
                if (toneNode) {
                    this.activeEffects.push({
                        id: effectData.id || `effect-${this.id}-${effectData.type}-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
                        type: effectData.type,
                        toneNode: toneNode, // Runtime Tone.js object
                        params: paramsForInstance // Stored parameters
                    });
                } else {
                    console.warn(`[Track ${this.id}] Could not create effect instance for type: ${effectData.type} during construction.`);
                }
            });
        }

        this.gainNode = null;
        this.trackMeter = null;
        this.outputNode = null; // The final node in this track's chain before connecting to master/bus

        this.instrument = null; // For Synth tracks
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
        this.sequence = null; // Tone.Sequence instance
        this.inspectorWindow = null; this.effectsRackWindow = null; this.sequencerWindow = null;
        this.waveformCanvasCtx = null; this.instrumentWaveformCanvasCtx = null;
        this.automation = initialData?.automation || { volume: [] }; // Example
        this.inspectorControls = {}; // To store references to UI controls like knobs
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
        this.outputNode = this.gainNode; // Default output is the gain node

        this.rebuildEffectChain(); // Connect effects and then to master
    }

    rebuildEffectChain() {
        console.log(`[Track ${this.id}] Rebuilding effect chain. Active effects: ${this.activeEffects.length}`);
        const mainSourceNode = this.instrument || this.toneSampler || this.slicerMonoPlayer;

        // 1. Disconnect existing chain from the source/players
        if (mainSourceNode && !mainSourceNode.disposed) {
            try { mainSourceNode.disconnect(); console.log(`[Track ${this.id}] Disconnected mainSourceNode.`); }
            catch (e) { console.warn(`[Track ${this.id}] Minor error disconnecting mainSourceNode: ${e.message}`); }
        }
        if (this.type === 'DrumSampler') {
            this.drumPadPlayers.forEach((player, idx) => {
                if (player && !player.disposed) {
                    try { player.disconnect(); console.log(`[Track ${this.id}] Disconnected drum player ${idx}.`); }
                    catch (e) { console.warn(`[Track ${this.id}] Minor error disconnecting drum player ${idx}: ${e.message}`); }
                }
            });
        }

        // 2. Disconnect all effects from each other and from the gain node
        this.activeEffects.forEach(effectWrapper => {
            if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
                try { effectWrapper.toneNode.disconnect(); console.log(`[Track ${this.id}] Disconnected effect ${effectWrapper.type}.`); }
                catch (e) { console.warn(`[Track ${this.id}] Minor error disconnecting effect ${effectWrapper.type}: ${e.message}`); }
            }
        });

        // 3. Disconnect gain node from its previous destinations
        if (this.gainNode && !this.gainNode.disposed) {
            try { this.gainNode.disconnect(); console.log(`[Track ${this.id}] Disconnected gainNode.`); }
            catch (e) { console.warn(`[Track ${this.id}] Minor error disconnecting gainNode: ${e.message}`); }
        } else if (!this.gainNode || this.gainNode.disposed) { // Re-initialize if broken
            console.warn(`[Track ${this.id}] GainNode was null or disposed. Re-initializing.`);
            this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
        }
        if (!this.trackMeter || this.trackMeter.disposed) {
            console.warn(`[Track ${this.id}] TrackMeter was null or disposed. Re-initializing.`);
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        }

        // 4. Rebuild the chain
        let currentAudioPathEnd = null;

        if (mainSourceNode && !mainSourceNode.disposed) {
            currentAudioPathEnd = mainSourceNode;
            console.log(`[Track ${this.id}] Chain starts with mainSourceNode (${mainSourceNode.constructor.name}).`);
        }

        // Connect effects in order
        this.activeEffects.forEach((effectWrapper, index) => {
            if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
                if (currentAudioPathEnd) { // If there's a previous node to connect from
                    try {
                        console.log(`[Track ${this.id}] Connecting ${currentAudioPathEnd.constructor.name} to ${effectWrapper.type}`);
                        currentAudioPathEnd.connect(effectWrapper.toneNode);
                    } catch (e) { console.error(`[Track ${this.id}] Error connecting ${currentAudioPathEnd.constructor.name} to ${effectWrapper.type}:`, e); }
                }
                currentAudioPathEnd = effectWrapper.toneNode; // This effect is now the end of the chain
            }
        });

        // Connect the end of the effects chain (or the source if no effects) to the gainNode
        if (this.gainNode && !this.gainNode.disposed) {
            if (currentAudioPathEnd) { // If there was a source or effects
                try {
                    console.log(`[Track ${this.id}] Connecting ${currentAudioPathEnd.constructor.name} to GainNode.`);
                    currentAudioPathEnd.connect(this.gainNode);
                } catch (e) { console.error(`[Track ${this.id}] Error connecting ${currentAudioPathEnd.constructor.name} to GainNode:`, e); }
            } else if (this.type !== 'DrumSampler' && !mainSourceNode) {
                 // For tracks like Synth/Sampler/InstrumentSampler that might not have an instrument yet (e.g., during init)
                 // but still need their gainNode in the master path.
                 // This case might be rare if initializeAudioNodes is called after instrument setup.
                 console.log(`[Track ${this.id}] No source or effects, gainNode is effectively the start for now.`);
            }
            this.outputNode = this.gainNode; // GainNode is always part of the output path
        } else {
            console.error(`[Track ${this.id}] GainNode is invalid after re-init. Cannot connect effects chain to it.`);
            this.outputNode = currentAudioPathEnd; // Fallback if gainNode is broken
        }

        // Special handling for DrumSampler: connect each player to the START of the effects chain (or gainNode if no effects)
        if (this.type === 'DrumSampler') {
            const firstNodeInEffectsChain = this.activeEffects.length > 0 ? this.activeEffects[0].toneNode : this.gainNode;
            this.drumPadPlayers.forEach((player, idx) => {
                if (player && !player.disposed) {
                    if (firstNodeInEffectsChain && !firstNodeInEffectsChain.disposed) {
                        try {
                            console.log(`[Track ${this.id}] Connecting drum player ${idx} to ${firstNodeInEffectsChain.constructor.name}`);
                            player.connect(firstNodeInEffectsChain);
                        } catch (e) { console.error(`[Track ${this.id}] Error connecting drum player ${idx} to chain start:`, e); }
                    } else {
                        console.warn(`[Track ${this.id}] No valid first node in chain for drum player ${idx} connection.`);
                    }
                }
            });
        }

        // Connect GainNode to Meter and then to Master Bus Input (or directly to Destination if master bus isn't ready)
        if (this.gainNode && !this.gainNode.disposed && this.trackMeter && !this.trackMeter.disposed) {
            try {
                this.gainNode.connect(this.trackMeter);
                const finalDestination = (window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed) 
                                         ? window.masterEffectsBusInput 
                                         : Tone.getDestination();
                this.gainNode.connect(finalDestination);
                console.log(`[Track ${this.id}] GainNode connected to Meter and ${finalDestination === window.masterEffectsBusInput ? 'Master Bus Input' : 'Tone Destination'}. Master bus input valid: ${!!(window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed)}`); // DEBUG
            } catch (e) {
                 console.error(`[Track ${this.id}] Error connecting GainNode final outputs: `, e);
            }
        } else {
            console.warn(`[Track ${this.id}] GainNode or TrackMeter is null/disposed. Final output connections might be incomplete.`);
            // As a fallback, if outputNode is set (e.g., last effect) and gainNode is bad, try connecting outputNode to destination
            if (this.outputNode && !this.outputNode.disposed && this.outputNode !== this.gainNode) {
                const fallbackDest = (window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed) 
                                     ? window.masterEffectsBusInput 
                                     : Tone.getDestination();
                try { 
                    this.outputNode.connect(fallbackDest); 
                    console.log(`[Track ${this.id}] Fallback outputNode connected to ${fallbackDest === window.masterEffectsBusInput ? 'Master Bus Input' : 'Tone Destination'}.`);
                } catch(e) { console.error(`[Track ${this.id}] Error connecting fallback output node:`, e.message); }
            }
        }
        console.log(`[Track ${this.id}] Effect chain rebuilt. Final output node: ${this.outputNode ? this.outputNode.constructor.name : 'None'}`);
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
                params: JSON.parse(JSON.stringify(defaultParams)) // Store a copy of params
            });
            this.rebuildEffectChain();
            return effectId; // Return the ID so UI can reference it
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

        // Update stored params
        const keys = paramPath.split('.');
        let currentStoredParamLevel = effectWrapper.params;
        for (let i = 0; i < keys.length - 1; i++) {
            currentStoredParamLevel[keys[i]] = currentStoredParamLevel[keys[i]] || {}; // Create nested objects if they don't exist
            currentStoredParamLevel = currentStoredParamLevel[keys[i]];
        }
        currentStoredParamLevel[keys[keys.length - 1]] = value;

        // Update Tone.js node
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
            const paramInstance = targetObject[finalParamKey]; // This could be a Signal, AudioParam, or a direct property

            if (typeof paramInstance !== 'undefined') {
                if (paramInstance && typeof paramInstance.value !== 'undefined') { // It's a Signal or AudioParam
                    if (typeof paramInstance.rampTo === 'function') {
                        paramInstance.rampTo(value, 0.02); // Smooth ramp for signals/params
                    } else {
                        paramInstance.value = value; // Direct set for AudioParam-like objects without rampTo
                    }
                } else {
                    // Direct property assignment (e.g., filter.type, phaser.stages)
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
        // Clamp newIndex to valid range (0 to length of array)
        // If newIndex is length, it means move to end.
        const clampedNewIndex = Math.max(0, Math.min(newIndex, this.activeEffects.length));

        if (oldIndex === clampedNewIndex || (oldIndex === clampedNewIndex -1 && newIndex === this.activeEffects.length) ) { // No change or trying to move last item to same "end" position
            return;
        }
        
        if (typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Reorder effect on ${this.name}`);
        }
        const [effectToMove] = this.activeEffects.splice(oldIndex, 1);
        // If moving to a higher index, the target index effectively shifts down by one after splice.
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
                if (this.samplerAudioData.audioBufferDataURL && (!this.audioBuffer || !this.audioBuffer.loaded)) {
                    this.audioBuffer = await new Tone.Buffer().load(this.samplerAudioData.audioBufferDataURL);
                    this.samplerAudioData.status = this.audioBuffer.loaded ? 'loaded' : 'error';
                } else if (!this.samplerAudioData.audioBufferDataURL) {
                    this.samplerAudioData.status = 'empty';
                }
                if (!this.slicerIsPolyphonic && this.audioBuffer?.loaded) {
                    this.setupSlicerMonoNodes();
                }
            } else if (this.type === 'DrumSampler') {
                for (let i = 0; i < this.drumSamplerPads.length; i++) {
                    const pad = this.drumSamplerPads[i];
                    if (pad.audioBufferDataURL && (!pad.audioBuffer || !pad.audioBuffer.loaded)) {
                        pad.audioBuffer = await new Tone.Buffer().load(pad.audioBufferDataURL);
                        pad.status = pad.audioBuffer.loaded ? 'loaded' : 'error';
                    } else if (!pad.audioBufferDataURL) {
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
                if (this.instrumentSamplerSettings.audioBufferDataURL && (!this.instrumentSamplerSettings.audioBuffer || !this.instrumentSamplerSettings.audioBuffer.loaded)) {
                    this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(this.instrumentSamplerSettings.audioBufferDataURL);
                    this.instrumentSamplerSettings.status = this.instrumentSamplerSettings.audioBuffer.loaded ? 'loaded' : 'error';
                } else if (!this.instrumentSamplerSettings.audioBufferDataURL) {
                    this.instrumentSamplerSettings.status = 'empty';
                }
                this.setupToneSampler();
            }
            this.rebuildEffectChain(); // Ensures connection to master bus AFTER resources are loaded
            this.setSequenceLength(this.sequenceLength, true); // Re-initialize sequence with correct length
            console.log(`[Track ${this.id}] fullyInitializeAudioResources completed.`);
        } catch (error) {
            console.error(`[Track ${this.id}] Error in fullyInitializeAudioResources:`, error);
            if (this.type === 'Sampler') this.samplerAudioData.status = 'error';
            else if (this.type === 'DrumSampler') this.drumSamplerPads.forEach(p => { if (p.audioBufferDataURL && !p.audioBuffer) p.status = 'error'; });
            else if (this.type === 'InstrumentSampler') this.instrumentSamplerSettings.status = 'error';
        }
    }

    async initializeInstrument() {
        console.log(`[Track ${this.id} - initializeInstrument] Initializing ${this.synthEngineType} instrument...`); // DEBUG
        console.log(`[Track ${this.id} - initializeInstrument] Current this.instrument:`, this.instrument); // DEBUG
        console.log(`[Track ${this.id} - initializeInstrument] Current this.synthParams:`, JSON.parse(JSON.stringify(this.synthParams))); // DEBUG

        if (this.instrument && typeof this.instrument.dispose === 'function' && !this.instrument.disposed) {
            console.log(`[Track ${this.id} - initializeInstrument] Disposing existing instrument.`); // DEBUG
            this.instrument.dispose();
        }
        if (!this.synthParams || Object.keys(this.synthParams).length === 0) {
            console.log(`[Track ${this.id} - initializeInstrument] synthParams empty or null, getting defaults.`); // DEBUG
            this.synthParams = this.getDefaultSynthParams();
        }
        try {
            // Ensure synthParams are correctly structured for Tone.MonoSynth
            const paramsForSynth = {
                portamento: this.synthParams.portamento,
                oscillator: this.synthParams.oscillator, // Should be { type: 'sine', ... }
                envelope: this.synthParams.envelope,     // Should be { attack: 0.005, ... }
                filter: this.synthParams.filter,         // Should be { type: 'lowpass', ... }
                filterEnvelope: this.synthParams.filterEnvelope // Should be { attack: 0.06, ... }
            };
            console.log(`[Track ${this.id} - initializeInstrument] Params for new MonoSynth:`, JSON.parse(JSON.stringify(paramsForSynth))); // DEBUG
            this.instrument = new Tone.MonoSynth(paramsForSynth);
            console.log(`[Track ${this.id} - initializeInstrument] NEW MonoSynth instrument CREATED:`, this.instrument); // DEBUG
        } catch (error) {
            console.error(`[Track ${this.id} - initializeInstrument] Error creating MonoSynth instrument:`, error); // DEBUG
            console.log(`[Track ${this.id} - initializeInstrument] Falling back to Tone.Synth() due to error.`); // DEBUG
            this.instrument = new Tone.Synth(); // Basic fallback
        }
    }

    setupSlicerMonoNodes() {
        if (!this.slicerIsPolyphonic) {
            this.disposeSlicerMonoNodes(); // Clean up if they exist
            this.slicerMonoPlayer = new Tone.Player();
            this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
            this.slicerMonoGain = new Tone.Gain();
            // Chain them up, but don't connect to final destination yet (rebuildEffectChain handles that)
            this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
            console.log(`[Track ${this.id}] Slicer mono nodes set up.`);
        }
    }
    disposeSlicerMonoNodes() {
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) this.slicerMonoPlayer.dispose();
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) this.slicerMonoEnvelope.dispose();
        if (this.slicerMonoGain && !this.slicerMonoGain.disposed) this.slicerMonoGain.dispose();
        this.slicerMonoPlayer = null; this.slicerMonoEnvelope = null; this.slicerMonoGain = null;
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
                onload: () => console.log(`[Track ${this.id}] Tone.Sampler loaded for InstrumentSampler.`),
                onerror: (e) => console.error(`[Track ${this.id}] Error loading Tone.Sampler:`, e)
            };
            this.toneSampler = new Tone.Sampler(samplerOptions);
            // Loop settings need to be applied to the underlying Player(s) if Tone.Sampler exposes them
            // Tone.Sampler itself doesn't have a direct .loop property. This might require custom handling
            // or checking if Tone.js has updated its Sampler API. For now, this is a placeholder.
            if (this.instrumentSamplerSettings.loop) {
                console.warn(`[Track ${this.id}] Loop settings for Tone.Sampler might need specific handling if not directly supported.`);
            }
        } else {
            console.warn(`[Track ${this.id}] InstrumentSampler audioBuffer not loaded, cannot setup Tone.Sampler.`);
        }
    }

    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = Math.max(0, Math.min(1, parseFloat(volume) || 0)); // Ensure volume is between 0 and 1
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
                // If another track is soloed, this one should be silent (unless it's the soloed one)
                this.gainNode.gain.rampTo(0, 0.01);
            } else {
                // Not muted and no other track is soloed (or this IS the soloed track)
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
            }
        }
    }

    applySoloState() {
        if (!this.gainNode || this.gainNode.disposed) { console.warn(`[Track ${this.id}] applySoloState: gainNode is null/disposed.`); return; }
        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;

        if (this.isMuted) { // Muted tracks are always silent
            this.gainNode.gain.rampTo(0, 0.01);
            return;
        }

        if (currentGlobalSoloId) { // If any track is soloed
            this.gainNode.gain.rampTo(this.id === currentGlobalSoloId ? this.previousVolumeBeforeMute : 0, 0.01);
        } else { // No tracks are soloed
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
        }
    }

    setSynthParam(paramPath, value) {
        console.log(`[Track ${this.id} - setSynthParam] Called. Path: '${paramPath}', Value:`, value, `Type: ${this.type}`); // DEBUG
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
        
        // Update local synthParams state
        const keys = paramPath.split('.');
        let currentParamLevel = this.synthParams;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!currentParamLevel[keys[i]]) currentParamLevel[keys[i]] = {}; // Create intermediate objects if they don't exist
            currentParamLevel = currentParamLevel[keys[i]];
        }
        currentParamLevel[keys[keys.length - 1]] = value;
        console.log(`[Track ${this.id} - setSynthParam] Updated local this.synthParams.${paramPath} to`, value);
        console.log(`[Track ${this.id} - setSynthParam] Full local synthParams now:`, JSON.parse(JSON.stringify(this.synthParams)));

        try {
            // Attempt to set on the Tone.js instrument instance
            let targetObject = this.instrument;
            for (let i = 0; i < keys.length - 1; i++) {
                targetObject = targetObject[keys[i]];
                if (!targetObject) {
                    console.error(`[Track ${this.id} - setSynthParam] Intermediate object for path "${keys.slice(0,i+1).join('.')}" NOT FOUND on actual instrument. Path: ${paramPath}`);
                    // Attempt fallback using instrument.set() if intermediate object not found for direct assignment
                    console.warn(`[Track ${this.id} - setSynthParam] Trying this.instrument.set({ '${paramPath}': ${value} }) as fallback.`);
                    this.instrument.set({ [paramPath]: value });
                    console.log(`[Track ${this.id} - setSynthParam] Fallback this.instrument.set() for ${paramPath} completed.`);
                    return; // Exit after fallback attempt
                }
            }
            
            const finalKey = keys[keys.length - 1];
            if (targetObject && typeof targetObject[finalKey] !== 'undefined') {
                // Check if it's an AudioParam or Tone.Signal (has a .value property)
                if (targetObject[finalKey] && typeof targetObject[finalKey].value !== 'undefined' && typeof value === 'number') {
                    console.log(`[Track ${this.id} - setSynthParam] Setting AudioParam/Signal: ${paramPath}.value = ${value}`);
                    targetObject[finalKey].value = value;
                } else {
                    // Direct property assignment (e.g., oscillator.type, filter.type)
                    console.log(`[Track ${this.id} - setSynthParam] Setting direct property: ${paramPath} = ${value}`);
                    targetObject[finalKey] = value;
                }
                console.log(`[Track ${this.id} - setSynthParam] Successfully set synth param ${paramPath} on Tone.js object.`);
            } else {
                // Fallback to instrument.set() if the direct path resolved to an undefined property
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
        if (newLength > 1024) { // Example max length
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
        newLengthInSteps = Math.ceil(newLengthInSteps / STEPS_PER_BAR) * STEPS_PER_BAR; // Ensure it's a multiple of STEPS_PER_BAR
        if (!skipUndoCapture && oldActualLength !== newLengthInSteps && typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Set Seq Length for ${this.name} to ${newLengthInSteps / STEPS_PER_BAR} bars`);
        }
        this.sequenceLength = newLengthInSteps;
        let numRows;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRows = synthPitches.length;
        else if (this.type === 'Sampler') numRows = this.slices.length > 0 ? this.slices.length : numSlices;
        else if (this.type === 'DrumSampler') numRows = numDrumSamplerPads;
        else numRows = (this.sequenceData && this.sequenceData.length > 0) ? this.sequenceData.length : 0; // Fallback for unknown or empty
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

            const firstNodeInOutChain = this.activeEffects.length > 0 ? this.activeEffects[0].toneNode : this.gainNode;

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
                        if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds(); // Arbitrary loop duration for sequence step
                        if (this.slicerIsPolyphonic) {
                            const tempPlayer = new Tone.Player(this.audioBuffer);
                            const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                            const tempGain = new Tone.Gain(step.velocity * sliceData.volume);
                            const dest = (firstNodeInOutChain && !firstNodeInOutChain.disposed) ? firstNodeInOutChain : (window.masterEffectsBusInput || Tone.getDestination());
                            tempPlayer.chain(tempEnv, tempGain, dest);
                            tempPlayer.playbackRate = playbackRate; tempPlayer.reverse = sliceData.reverse; tempPlayer.loop = sliceData.loop;
                            tempPlayer.loopStart = sliceData.offset; tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
                            tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            tempEnv.triggerAttack(time);
                            if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95); // Slightly before actual end
                            Tone.Transport.scheduleOnce(() => { if(tempPlayer && !tempPlayer.disposed) tempPlayer.dispose(); if(tempEnv && !tempEnv.disposed) tempEnv.dispose(); if(tempGain && !tempGain.disposed) tempGain.dispose(); }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);
                        } else if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                            if (this.slicerMonoPlayer.state === 'started') this.slicerMonoPlayer.stop(time);
                            if (this.slicerMonoEnvelope.getValueAtTime(time) > 0.001) this.slicerMonoEnvelope.triggerRelease(time);
                            this.slicerMonoPlayer.buffer = this.audioBuffer; this.slicerMonoEnvelope.set(sliceData.envelope);
                            this.slicerMonoGain.gain.value = step.velocity * sliceData.volume;
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
                synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active) this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "8n", time, step.velocity);
                });
            }
        }, Array.from(Array(this.sequenceLength).keys()), "16n").start(0);
        if (this.sequencerWindow && !this.sequencerWindow.isMinimized && window.openWindows[`sequencerWin-${this.id}`] && typeof window.openTrackSequencerWindow === 'function') {
             window.openTrackSequencerWindow(this.id, true); // forceRedraw
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
        if (this.inspectorWindow?.close) try {this.inspectorWindow.close();} catch(e){}
        if (this.effectsRackWindow?.close) try {this.effectsRackWindow.close();} catch(e){}
        if (this.sequencerWindow?.close) try {this.sequencerWindow.close();} catch(e){}
        Object.keys(this).forEach(key => { if (key !== 'id' && key !== 'name' && key !== 'type') this[key] = null; });
        console.log(`[Track ${this.id}] Finished disposing track.`);
    }
}

