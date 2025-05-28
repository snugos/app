// js/Track.js - Track Class Module

import { STEPS_PER_BAR, defaultStepsPerBar, synthPitches, numSlices, numDrumSamplerPads, samplerMIDINoteStart, defaultVelocity } from './constants.js';
import { createEffectInstance, getEffectDefaultParams, AVAILABLE_EFFECTS } from './effectsRegistry.js';
// import { getAudio, deleteAudio } from './db.js'; // Potentially needed if Track.js directly handles DB loading

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
            console.log(`[Track ${this.id} CONSTRUCTOR - Synth] Initial synthParams:`, JSON.parse(JSON.stringify(this.synthParams)));
        } else {
            this.synthEngineType = null;
            this.synthParams = {};
        }

        // Sampler Track: Stores reference to audio in IndexedDB
        this.samplerAudioData = {
            fileName: initialData?.samplerAudioData?.fileName || null,
            audioDbKey: initialData?.samplerAudioData?.audioDbKey || null // Stores key for IndexedDB
        };
        this.originalFileName = initialData?.samplerAudioData?.fileName || null; // Convenience for display
        this.audioBuffer = null; // Tone.Buffer, loaded from IndexedDB via audio.js or state.js

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

        // InstrumentSampler Track: Stores reference to audio in IndexedDB
        this.instrumentSamplerSettings = {
            audioDbKey: initialData?.instrumentSamplerSettings?.audioDbKey || null, // Stores key for IndexedDB
            originalFileName: initialData?.instrumentSamplerSettings?.originalFileName || null, // Convenience
            audioBuffer: null, // Tone.Buffer, loaded from IndexedDB
            rootNote: initialData?.instrumentSamplerSettings?.rootNote || 'C4',
            loop: initialData?.instrumentSamplerSettings?.loop || false,
            loopStart: initialData?.instrumentSamplerSettings?.loopStart || 0,
            loopEnd: initialData?.instrumentSamplerSettings?.loopEnd || 0,
            envelope: initialData?.instrumentSamplerSettings?.envelope || { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 },
        };
        this.instrumentSamplerIsPolyphonic = initialData?.instrumentSamplerIsPolyphonic !== undefined ? initialData.instrumentSamplerIsPolyphonic : true;
        this.toneSampler = null;

        // DrumSampler Track: Each pad stores reference to its audio in IndexedDB
        this.drumSamplerPads = initialData?.drumSamplerPads || Array(numDrumSamplerPads).fill(null).map(() => ({
            audioDbKey: null, // Stores key for IndexedDB
            originalFileName: null, // Convenience
            audioBuffer: null, // Tone.Buffer, loaded from IndexedDB
            volume: 0.7, pitchShift: 0,
            envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 }
        }));
        if (initialData?.drumSamplerPads) {
            initialData.drumSamplerPads.forEach((padData, index) => {
                if (this.drumSamplerPads[index]) {
                    this.drumSamplerPads[index].audioDbKey = padData.audioDbKey || null;
                    this.drumSamplerPads[index].originalFileName = padData.originalFileName || null;
                    this.drumSamplerPads[index].volume = padData.volume ?? 0.7;
                    this.drumSamplerPads[index].pitchShift = padData.pitchShift ?? 0;
                    this.drumSamplerPads[index].envelope = padData.envelope ? JSON.parse(JSON.stringify(padData.envelope)) : { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 };
                }
            });
        }
        this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
        this.drumPadPlayers = Array(numDrumSamplerPads).fill(null); // Array of Tone.Player instances

        // Active effects chain for the track
        this.activeEffects = [];
        if (initialData && initialData.activeEffects && Array.isArray(initialData.activeEffects)) {
            initialData.activeEffects.forEach(effectData => {
                const paramsForInstance = effectData.params ? JSON.parse(JSON.stringify(effectData.params)) : {};
                const toneNode = createEffectInstance(effectData.type, paramsForInstance);
                if (toneNode) {
                    this.activeEffects.push({
                        id: effectData.id || `effect-${this.id}-${effectData.type}-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
                        type: effectData.type,
                        toneNode: toneNode,
                        params: paramsForInstance
                    });
                } else {
                    console.warn(`[Track ${this.id}] Could not create effect instance for type: ${effectData.type} during construction.`);
                }
            });
        }

        this.gainNode = null; // Track's main gain node
        this.trackMeter = null; // Track's audio meter
        this.outputNode = null; // The final node in the track's chain before connecting to master bus

        this.instrument = null; // For Synth type
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
        this.sequence = null; // Tone.Sequence object
        this.inspectorWindow = null; this.effectsRackWindow = null; this.sequencerWindow = null;
        this.waveformCanvasCtx = null; this.instrumentWaveformCanvasCtx = null;
        this.automation = initialData?.automation || { volume: [] }; // Placeholder for automation data
        this.inspectorControls = {}; // To hold references to UI controls like knobs
    }

    /**
     * Gets default parameters for the synth engine.
     * @returns {object} Default synth parameters.
     */
    getDefaultSynthParams() {
        return {
            portamento: 0.01,
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 1 },
            filter: { type: 'lowpass', rolloff: -12, Q: 1 },
            filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 2, baseFrequency: 200, octaves: 7, exponent: 2 }
        };
    }

    /**
     * Initializes core audio nodes for the track (Gain, Meter).
     * This is typically called when the track is first created or reconstructed.
     */
    async initializeAudioNodes() {
        console.log(`[Track ${this.id}] Initializing core audio nodes (Gain, Meter)...`);
        if (this.gainNode && !this.gainNode.disposed) { try { this.gainNode.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old gainNode:`, e.message)} }
        if (this.trackMeter && !this.trackMeter.disposed) { try { this.trackMeter.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old trackMeter:`, e.message)} }

        this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
        this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        this.outputNode = this.gainNode; // Initially, output is the gain node

        this.rebuildEffectChain(); // Connect effects and final output
    }

    /**
     * Rebuilds the track's internal audio effect chain and connects it to the master bus.
     * This is called when effects are added/removed/reordered, or when the track is initialized.
     */
    rebuildEffectChain() {
        console.log(`[Track ${this.id}] Rebuilding effect chain. Active effects: ${this.activeEffects.length}`);
        const mainSourceNode = this.instrument || this.toneSampler || this.slicerMonoPlayer; // Synth, InstrumentSampler, or Mono Slicer

        // Disconnect existing connections to allow fresh routing
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

        this.activeEffects.forEach(effectWrapper => {
            if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
                try { effectWrapper.toneNode.disconnect(); console.log(`[Track ${this.id}] Disconnected effect ${effectWrapper.type}.`); }
                catch (e) { console.warn(`[Track ${this.id}] Minor error disconnecting effect ${effectWrapper.type}: ${e.message}`); }
            }
        });

        if (this.gainNode && !this.gainNode.disposed) {
            try { this.gainNode.disconnect(); console.log(`[Track ${this.id}] Disconnected gainNode.`); }
            catch (e) { console.warn(`[Track ${this.id}] Minor error disconnecting gainNode: ${e.message}`); }
        } else if (!this.gainNode || this.gainNode.disposed) {
            console.warn(`[Track ${this.id}] GainNode was null or disposed. Re-initializing.`);
            this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
        }
        if (!this.trackMeter || this.trackMeter.disposed) {
            console.warn(`[Track ${this.id}] TrackMeter was null or disposed. Re-initializing.`);
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        }

        let currentAudioPathEnd = null;

        // Start with the main instrument/sampler source if available
        if (mainSourceNode && !mainSourceNode.disposed) {
            currentAudioPathEnd = mainSourceNode;
            console.log(`[Track ${this.id}] Chain starts with mainSourceNode (${mainSourceNode.constructor.name}).`);
        }

        // Chain active effects
        this.activeEffects.forEach(effectWrapper => {
            if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
                if (currentAudioPathEnd) {
                    try {
                        console.log(`[Track ${this.id}] Connecting ${currentAudioPathEnd.constructor.name} to ${effectWrapper.type}`);
                        currentAudioPathEnd.connect(effectWrapper.toneNode);
                    } catch (e) { console.error(`[Track ${this.id}] Error connecting ${currentAudioPathEnd.constructor.name} to ${effectWrapper.type}:`, e); }
                }
                currentAudioPathEnd = effectWrapper.toneNode;
            }
        });

        // Connect to the track's gain node
        if (this.gainNode && !this.gainNode.disposed) {
            if (currentAudioPathEnd) {
                try {
                    console.log(`[Track ${this.id}] Connecting ${currentAudioPathEnd.constructor.name} to GainNode.`);
                    currentAudioPathEnd.connect(this.gainNode);
                } catch (e) { console.error(`[Track ${this.id}] Error connecting ${currentAudioPathEnd.constructor.name} to GainNode:`, e); }
            } else if (this.type !== 'DrumSampler' && !mainSourceNode) {
                 // If no source and not a drum sampler, the gain node itself is the start of what goes to master
                 console.log(`[Track ${this.id}] No source or effects, gainNode is effectively the start for now.`);
            }
            this.outputNode = this.gainNode; // The gain node is now the output of the track's internal chain
        } else {
            console.error(`[Track ${this.id}] GainNode is invalid after re-init. Cannot connect effects chain to it.`);
            this.outputNode = currentAudioPathEnd; // Fallback: output is the last effect if gain node failed
        }

        // Special handling for DrumSampler: connect individual pad players to the start of the effect chain (or gain node)
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

        // Final connections: Track Meter and Master Bus
        if (this.gainNode && !this.gainNode.disposed && this.trackMeter && !this.trackMeter.disposed) {
            try {
                this.gainNode.connect(this.trackMeter); // Connect gain to its meter
                const finalDestination = (window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed)
                                         ? window.masterEffectsBusInput
                                         : Tone.getDestination(); // Fallback to main Tone destination
                this.gainNode.connect(finalDestination);
                console.log(`[Track ${this.id}] GainNode connected to Meter and ${finalDestination === window.masterEffectsBusInput ? 'Master Bus Input' : 'Tone Destination'}. Master bus input valid: ${!!(window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed)}`);
            } catch (e) {
                 console.error(`[Track ${this.id}] Error connecting GainNode final outputs: `, e);
            }
        } else {
            console.warn(`[Track ${this.id}] GainNode or TrackMeter is null/disposed. Final output connections might be incomplete.`);
            // Fallback if gainNode is bad, try to connect the last valid node in chain to master
            if (this.outputNode && !this.outputNode.disposed && this.outputNode !== this.gainNode) {
                const fallbackDest = (window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed)
                                     ? window.masterEffectsBusInput
                                     : Tone.getDestination();
                try {
                    this.outputNode.connect(fallbackDest);
                    console.log(`[Track ${this.id}] Fallback outputNode (${this.outputNode.constructor.name}) connected to ${fallbackDest === window.masterEffectsBusInput ? 'Master Bus Input' : 'Tone Destination'}.`);
                } catch(e) { console.error(`[Track ${this.id}] Error connecting fallback output node:`, e.message); }
            }
        }
        console.log(`[Track ${this.id}] Effect chain rebuilt. Final output node before master bus: ${this.outputNode ? this.outputNode.constructor.name : 'None'}`);
    }

    /**
     * Adds an effect to the track's effect chain.
     * @param {string} effectType - The type of effect to add (key from AVAILABLE_EFFECTS).
     * @returns {string|null} The ID of the added effect, or null if failed.
     */
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
            return effectId;
        }
        console.warn(`[Track ${this.id}] Failed to create effect instance for ${effectType}`);
        return null;
    }

    /**
     * Removes an effect from the track's effect chain by its ID.
     * @param {string} effectId - The ID of the effect to remove.
     */
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

    /**
     * Updates a parameter of a specific effect on the track.
     * @param {string} effectId - The ID of the effect to update.
     * @param {string} paramPath - The path to the parameter (e.g., "frequency", "filter.Q").
     * @param {*} value - The new value for the parameter.
     */
    updateEffectParam(effectId, paramPath, value) {
        const effectWrapper = this.activeEffects.find(e => e.id === effectId);
        if (!effectWrapper || !effectWrapper.toneNode || effectWrapper.toneNode.disposed) {
            console.warn(`[Track ${this.id}] Effect node not found or disposed for ID: ${effectId} while trying to update ${paramPath}.`);
            return;
        }

        // Update the stored params on the track object
        const keys = paramPath.split('.');
        let currentStoredParamLevel = effectWrapper.params;
        for (let i = 0; i < keys.length - 1; i++) {
            currentStoredParamLevel[keys[i]] = currentStoredParamLevel[keys[i]] || {};
            currentStoredParamLevel = currentStoredParamLevel[keys[i]];
        }
        currentStoredParamLevel[keys[keys.length - 1]] = value;

        // Update the actual Tone.js node
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
                if (paramInstance && typeof paramInstance.value !== 'undefined') { // It's a Signal or AudioParam
                    if (typeof paramInstance.rampTo === 'function') {
                        paramInstance.rampTo(value, 0.02); // Smoothly ramp if possible
                    } else {
                        paramInstance.value = value; // Direct set for .value
                    }
                } else { // Direct property
                    targetObject[finalParamKey] = value;
                }
            } else if (typeof effectWrapper.toneNode.set === 'function' && keys.length > 0) { // Fallback to .set if property not directly found
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

    /**
     * Reorders an effect in the track's effect chain.
     * @param {string} effectId - The ID of the effect to move.
     * @param {number} newIndex - The new index for the effect in the chain.
     */
    reorderEffect(effectId, newIndex) {
        const oldIndex = this.activeEffects.findIndex(e => e.id === effectId);
        if (oldIndex === -1) {
            console.warn(`[Track ${this.id}] Effect ID ${effectId} not found for reordering.`);
            return;
        }
        // newIndex is the target position in the array after removal of old,
        // so if moving down, the splice index is newIndex, if moving up, it's also newIndex.
        // The visual index might be different from splice index if an item is moved past its current position.
        const clampedNewIndex = Math.max(0, Math.min(newIndex, this.activeEffects.length -1)); // Clamp to valid array indices after removal

        if (oldIndex === clampedNewIndex ) {
            return; // No change if dropped in the same logical spot
        }

        if (typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Reorder effect on ${this.name}`);
        }
        const [effectToMove] = this.activeEffects.splice(oldIndex, 1);
        this.activeEffects.splice(clampedNewIndex, 0, effectToMove);

        console.log(`[Track ${this.id}] Reordered effect. Old: ${oldIndex}, New Splice Index: ${clampedNewIndex}. New order:`, this.activeEffects.map(e=>e.type));
        this.rebuildEffectChain();
    }

    /**
     * Fully initializes audio resources for the track.
     * This includes loading audio buffers from IndexedDB (via audio.js or state.js)
     * and setting up Tone.js instruments/players.
     */
    async fullyInitializeAudioResources() {
        console.log(`[Track ${this.id}] fullyInitializeAudioResources called for type: ${this.type}`);
        // Assumes that `this.audioBuffer` (for Sampler/InstrumentSampler)
        // and `pad.audioBuffer` (for DrumSampler pads) have been populated
        // by audio.js or state.js (reconstructDAW) if loading from DB.
        try {
            if (this.type === 'Synth') {
                await this.initializeInstrument();
            } else if (this.type === 'Sampler') {
                // If audioBuffer is loaded (from DB or new file), setup mono nodes if needed
                if (this.audioBuffer?.loaded && !this.slicerIsPolyphonic) {
                    this.setupSlicerMonoNodes();
                }
            } else if (this.type === 'DrumSampler') {
                for (let i = 0; i < this.drumSamplerPads.length; i++) {
                    const pad = this.drumSamplerPads[i];
                    if (pad.audioBuffer && pad.audioBuffer.loaded) {
                        if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) {
                            this.drumPadPlayers[i].dispose();
                        }
                        this.drumPadPlayers[i] = new Tone.Player(pad.audioBuffer);
                        // Connection of drumPadPlayers happens in rebuildEffectChain
                    }
                }
            } else if (this.type === 'InstrumentSampler') {
                // If instrumentSamplerSettings.audioBuffer is loaded, setup Tone.Sampler
                if (this.instrumentSamplerSettings.audioBuffer?.loaded) {
                    this.setupToneSampler();
                }
            }
            this.rebuildEffectChain(); // Ensures connection to master bus AFTER resources are potentially set up
            this.setSequenceLength(this.sequenceLength, true); // Re-initialize sequence with correct rows/length
            console.log(`[Track ${this.id}] fullyInitializeAudioResources completed.`);
        } catch (error) {
            console.error(`[Track ${this.id}] Error in fullyInitializeAudioResources:`, error);
        }
    }

    /**
     * Initializes the synth instrument for 'Synth' type tracks.
     */
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
            const paramsForSynth = { // Ensure correct structure for Tone.MonoSynth
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

    /**
     * Sets up mono-phonic player nodes for the 'Sampler' track if slicerIsPolyphonic is false.
     */
    setupSlicerMonoNodes() {
        if (!this.slicerIsPolyphonic) {
            this.disposeSlicerMonoNodes(); // Dispose any existing ones first
            this.slicerMonoPlayer = new Tone.Player();
            this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
            this.slicerMonoGain = new Tone.Gain();
            // Connection to the effect chain happens in rebuildEffectChain
            console.log(`[Track ${this.id}] Slicer mono nodes set up.`);
        }
    }

    /**
     * Disposes of mono-phonic player nodes for the 'Sampler' track.
     */
    disposeSlicerMonoNodes() {
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) this.slicerMonoPlayer.dispose();
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) this.slicerMonoEnvelope.dispose();
        if (this.slicerMonoGain && !this.slicerMonoGain.disposed) this.slicerMonoGain.dispose();
        this.slicerMonoPlayer = null; this.slicerMonoEnvelope = null; this.slicerMonoGain = null;
    }

    /**
     * Sets up the Tone.Sampler for 'InstrumentSampler' type tracks.
     */
    setupToneSampler() {
        if (this.toneSampler && !this.toneSampler.disposed) {
            this.toneSampler.dispose();
        }
        if (this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
            const urls = {};
            // Tone.Sampler expects URLs, but can also take an AudioBuffer directly for a single note
            urls[this.instrumentSamplerSettings.rootNote] = this.instrumentSamplerSettings.audioBuffer;

            const samplerOptions = {
                urls: urls,
                attack: this.instrumentSamplerSettings.envelope.attack,
                release: this.instrumentSamplerSettings.envelope.release,
                baseUrl: "", // Important if not actually using URLs from a server
                onload: () => console.log(`[Track ${this.id}] Tone.Sampler loaded for InstrumentSampler.`),
                onerror: (e) => console.error(`[Track ${this.id}] Error loading Tone.Sampler:`, e)
            };
            this.toneSampler = new Tone.Sampler(samplerOptions);
            // Loop settings for Tone.Sampler are handled differently (per-note or globally if supported by underlying Player)
            // For a single buffer, loop settings on the Player within Sampler might be needed if advanced looping is required.
            // For now, basic attack/release are set.
        } else {
            console.warn(`[Track ${this.id}] InstrumentSampler audioBuffer not loaded, cannot setup Tone.Sampler.`);
        }
    }

    /**
     * Sets the track volume.
     * @param {number} volume - The new volume (0-1).
     * @param {boolean} [fromInteraction=false] - Whether the change was from direct user interaction (e.g., knob).
     */
    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = Math.max(0, Math.min(1, parseFloat(volume) || 0));
        if (this.gainNode && !this.gainNode.disposed && !this.isMuted) {
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
        }
    }

    /**
     * Applies the current mute state to the track's gain node.
     */
    applyMuteState() {
        if (!this.gainNode || this.gainNode.disposed) { console.warn(`[Track ${this.id}] applyMuteState: gainNode is null/disposed.`); return; }
        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
        if (this.isMuted) {
            this.gainNode.gain.rampTo(0, 0.01);
        } else {
            // If another track is soloed, this track should be silent (unless it's the soloed one)
            if (currentGlobalSoloId && currentGlobalSoloId !== this.id) {
                this.gainNode.gain.rampTo(0, 0.01);
            } else {
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
            }
        }
    }

    /**
     * Applies the current solo state to the track's gain node, considering global solo state.
     */
    applySoloState() {
        if (!this.gainNode || this.gainNode.disposed) { console.warn(`[Track ${this.id}] applySoloState: gainNode is null/disposed.`); return; }
        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;

        if (this.isMuted) { // Muted tracks are always silent
            this.gainNode.gain.rampTo(0, 0.01);
            return;
        }

        if (currentGlobalSoloId) { // If any track is soloed
            // This track plays if it IS the soloed track, otherwise it's silent
            this.gainNode.gain.rampTo(this.id === currentGlobalSoloId ? this.previousVolumeBeforeMute : 0, 0.01);
        } else { // No track is soloed, play at normal volume
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
        }
    }

    /**
     * Sets a parameter for the synth instrument.
     * @param {string} paramPath - The path to the parameter (e.g., "oscillator.type").
     * @param {*} value - The new value for the parameter.
     */
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

        // Update local synthParams state
        const keys = paramPath.split('.');
        let currentParamLevel = this.synthParams;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!currentParamLevel[keys[i]]) currentParamLevel[keys[i]] = {};
            currentParamLevel = currentParamLevel[keys[i]];
        }
        currentParamLevel[keys[keys.length - 1]] = value;
        console.log(`[Track ${this.id} - setSynthParam] Updated local this.synthParams.${paramPath} to`, value);
        console.log(`[Track ${this.id} - setSynthParam] Full local synthParams now:`, JSON.parse(JSON.stringify(this.synthParams)));

        // Attempt to set on the Tone.js instrument instance
        try {
            let targetObject = this.instrument;
            for (let i = 0; i < keys.length - 1; i++) {
                targetObject = targetObject[keys[i]];
                if (!targetObject) {
                    console.warn(`[Track ${this.id} - setSynthParam] Intermediate object for path "${keys.slice(0,i+1).join('.')}" NOT FOUND on actual instrument. Path: ${paramPath}. Trying instrument.set() as fallback.`);
                    this.instrument.set({ [paramPath]: value }); // Use bracket notation for computed property name
                    console.log(`[Track ${this.id} - setSynthParam] Fallback this.instrument.set() for ${paramPath} completed.`);
                    return;
                }
            }

            const finalKey = keys[keys.length - 1];
            if (targetObject && typeof targetObject[finalKey] !== 'undefined') {
                if (targetObject[finalKey] && typeof targetObject[finalKey].value !== 'undefined' && typeof value === 'number') {
                    console.log(`[Track ${this.id} - setSynthParam] Setting AudioParam/Signal: ${paramPath}.value = ${value}`);
                    targetObject[finalKey].value = value; // For AudioParams or Signals
                } else {
                    console.log(`[Track ${this.id} - setSynthParam] Setting direct property: ${paramPath} = ${value}`);
                    targetObject[finalKey] = value; // For direct properties like oscillator.type
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

    // --- Setter methods for Sampler slices, Drum Sampler pads, and Instrument Sampler ---
    setSliceVolume(sliceIndex, volume) { if (this.slices[sliceIndex]) this.slices[sliceIndex].volume = parseFloat(volume); }
    setSlicePitchShift(sliceIndex, semitones) { if (this.slices[sliceIndex]) this.slices[sliceIndex].pitchShift = parseInt(semitones); }
    setSliceLoop(sliceIndex, loop) { if (this.slices[sliceIndex]) this.slices[sliceIndex].loop = !!loop; }
    setSliceReverse(sliceIndex, reverse) { if (this.slices[sliceIndex]) this.slices[sliceIndex].reverse = !!reverse; }
    setSliceEnvelopeParam(sliceIndex, param, value) { if (this.slices[sliceIndex]?.envelope) this.slices[sliceIndex].envelope[param] = parseFloat(value); }

    setDrumSamplerPadVolume(padIndex, volume) { if (this.drumSamplerPads[padIndex]) this.drumSamplerPads[padIndex].volume = parseFloat(volume); }
    setDrumSamplerPadPitch(padIndex, pitch) { if (this.drumSamplerPads[padIndex]) this.drumSamplerPads[padIndex].pitchShift = parseInt(pitch); }
    setDrumSamplerPadEnv(padIndex, param, value) { if (this.drumSamplerPads[padIndex]?.envelope) this.drumSamplerPads[padIndex].envelope[param] = parseFloat(value); }

    setInstrumentSamplerRootNote(noteName) { if (Tone.Frequency(noteName).toMidi() > 0) { this.instrumentSamplerSettings.rootNote = noteName; this.setupToneSampler(); this.rebuildEffectChain(); }}
    setInstrumentSamplerLoop(loop) { this.instrumentSamplerSettings.loop = !!loop; this.setupToneSampler(); this.rebuildEffectChain(); } // Re-setup sampler if loop changes
    setInstrumentSamplerLoopStart(time) { this.instrumentSamplerSettings.loopStart = Math.max(0, parseFloat(time)); this.setupToneSampler(); this.rebuildEffectChain(); }
    setInstrumentSamplerLoopEnd(time) { this.instrumentSamplerSettings.loopEnd = Math.max(this.instrumentSamplerSettings.loopStart, parseFloat(time)); this.setupToneSampler(); this.rebuildEffectChain(); }
    setInstrumentSamplerEnv(param, value) {
        if (this.instrumentSamplerSettings.envelope) {
            this.instrumentSamplerSettings.envelope[param] = parseFloat(value);
            if (this.toneSampler && !this.toneSampler.disposed) { // Update Tone.Sampler directly if possible
                if (param === 'attack' && this.toneSampler.attack !== undefined) this.toneSampler.attack = parseFloat(value);
                if (param === 'release' && this.toneSampler.release !== undefined) this.toneSampler.release = parseFloat(value);
                // Note: Tone.Sampler doesn't directly expose decay/sustain on the top level.
                // These would need to be handled if using a more complex ADSR envelope within Tone.Sampler,
                // or by re-instantiating the sampler with new envelope params.
            }
        }
    }

    /**
     * Doubles the length of the sequence and duplicates its content.
     * @returns {Promise<object>} Object with success status and message.
     */
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
        this.setSequenceLength(newLength, true); // Update sequence object, skip undo as it's part of this action
        return { success: true, message: `${this.name} sequence doubled.` };
    }

    /**
     * Sets the length of the sequence and reinitializes the Tone.Sequence object.
     * @param {number} newLengthInSteps - The new length of the sequence in steps.
     * @param {boolean} [skipUndoCapture=false] - Whether to skip capturing this action for undo.
     */
    setSequenceLength(newLengthInSteps, skipUndoCapture = false) {
        const oldActualLength = this.sequenceLength;
        newLengthInSteps = Math.max(STEPS_PER_BAR, parseInt(newLengthInSteps) || defaultStepsPerBar);
        newLengthInSteps = Math.ceil(newLengthInSteps / STEPS_PER_BAR) * STEPS_PER_BAR; // Ensure it's a multiple of STEPS_PER_BAR
        if (!skipUndoCapture && oldActualLength !== newLengthInSteps && typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Set Seq Length for ${this.name} to ${newLengthInSteps / STEPS_PER_BAR} bars`);
        }
        this.sequenceLength = newLengthInSteps;

        // Determine number of rows based on track type
        let numRows;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRows = synthPitches.length;
        else if (this.type === 'Sampler') numRows = this.slices.length > 0 ? this.slices.length : numSlices; // Use actual slice count if available
        else if (this.type === 'DrumSampler') numRows = numDrumSamplerPads;
        else numRows = (this.sequenceData && this.sequenceData.length > 0) ? this.sequenceData.length : 0; // Fallback for unknown types

        // Resize sequenceData array
        const currentSequenceData = this.sequenceData || [];
        this.sequenceData = Array(numRows).fill(null).map((_, rIndex) => {
            const currentRow = currentSequenceData[rIndex] || [];
            const newRow = Array(this.sequenceLength).fill(null);
            for (let c = 0; c < Math.min(currentRow.length, this.sequenceLength); c++) newRow[c] = currentRow[c];
            return newRow;
        });

        // Recreate Tone.Sequence
        if (this.sequence && !this.sequence.disposed) { this.sequence.stop(); this.sequence.clear(); this.sequence.dispose(); this.sequence = null; }

        this.sequence = new Tone.Sequence((time, col) => {
            const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
            const isEffectivelyMuted = this.isMuted || (currentGlobalSoloId && currentGlobalSoloId !== this.id);

            if (this.sequencerWindow && !this.sequencerWindow.isMinimized && typeof window.highlightPlayingStep === 'function') {
                window.highlightPlayingStep(col, this.type, this.sequencerWindow.element?.querySelector('.sequencer-grid'));
            }
            if (!this.gainNode || this.gainNode.disposed || isEffectivelyMuted) return;

            const firstNodeInOutChain = this.activeEffects.length > 0 ? this.activeEffects[0].toneNode : this.gainNode;
            const actualDestinationForPlayback = (firstNodeInOutChain && !firstNodeInOutChain.disposed) ? firstNodeInOutChain : (window.masterEffectsBusInput || Tone.getDestination());


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
                        if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds(); // Example fixed duration for looped sequence steps

                        if (this.slicerIsPolyphonic) {
                            const tempPlayer = new Tone.Player(this.audioBuffer);
                            const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                            const tempGain = new Tone.Gain(step.velocity * sliceData.volume);

                            tempPlayer.chain(tempEnv, tempGain, actualDestinationForPlayback);
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
                        // Ensure player is connected; rebuildEffectChain should handle this.
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

        // If sequencer window is open, refresh it
        if (this.sequencerWindow && !this.sequencerWindow.isMinimized && window.openWindows[`sequencerWin-${this.id}`] && typeof window.openTrackSequencerWindow === 'function') {
             window.openTrackSequencerWindow(this.id, true); // Force redraw
        }
    }

    /**
     * Disposes of all resources used by the track.
     */
    dispose() {
        console.log(`[Track ${this.id}] Disposing track ${this.name} (${this.type})`);
        try { if (this.sequence && !this.sequence.disposed) { this.sequence.stop(); this.sequence.clear(); this.sequence.dispose(); } } catch(e){ console.warn("Error disposing sequence", e.message); }
        try { if (this.instrument && !this.instrument.disposed) { console.log(`[Track ${this.id} - Dispose] Disposing instrument.`); this.instrument.dispose(); } } catch(e){ console.warn("Error disposing instrument", e.message); }

        // Dispose audio buffers
        try { if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose(); } catch(e){ console.warn("Error disposing sampler audioBuffer", e.message); }
        // if (this.samplerAudioData?.audioDbKey) {
        //     deleteAudio(this.samplerAudioData.audioDbKey).catch(e => console.warn(`Error deleting sampler audio from DB (key: ${this.samplerAudioData.audioDbKey})`, e));
        // }

        this.disposeSlicerMonoNodes();
        try { if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.dispose(); } catch(e){ console.warn("Error disposing toneSampler", e.message); }
        try { if (this.instrumentSamplerSettings?.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose(); } catch(e){ console.warn("Error disposing instrumentSamplerSettings.audioBuffer", e.message); }
        // if (this.instrumentSamplerSettings?.audioDbKey) {
        //    deleteAudio(this.instrumentSamplerSettings.audioDbKey).catch(e => console.warn(`Error deleting instrument sampler audio from DB (key: ${this.instrumentSamplerSettings.audioDbKey})`, e));
        // }

        this.drumSamplerPads.forEach((pad, index) => {
            if (pad.audioBuffer && !pad.audioBuffer.disposed) try {pad.audioBuffer.dispose();} catch(e){}
            // if (pad.audioDbKey) {
            //     deleteAudio(pad.audioDbKey).catch(e => console.warn(`Error deleting drum pad ${index} audio from DB (key: ${pad.audioDbKey})`, e));
            // }
        });
        this.drumPadPlayers.forEach(player => { if (player && !player.disposed) try {player.dispose();} catch(e){} });

        // Dispose effects
        this.activeEffects.forEach(effect => { if (effect.toneNode && !effect.toneNode.disposed) try {effect.toneNode.dispose();} catch(e){} });
        this.activeEffects = [];

        // Dispose core nodes
        try { if (this.gainNode && !this.gainNode.disposed) this.gainNode.dispose(); } catch(e){ console.warn("Error disposing gainNode", e.message); }
        try { if (this.trackMeter && !this.trackMeter.disposed) this.trackMeter.dispose(); } catch(e){ console.warn("Error disposing trackMeter", e.message); }

        // Close associated windows
        if (this.inspectorWindow?.close) try {this.inspectorWindow.close();} catch(e){}
        if (this.effectsRackWindow?.close) try {this.effectsRackWindow.close();} catch(e){}
        if (this.sequencerWindow?.close) try {this.sequencerWindow.close();} catch(e){}

        // Nullify properties
        Object.keys(this).forEach(key => {
            if (key !== 'id' && key !== 'name' && key !== 'type') { // Keep basic identifiers
                this[key] = null;
            }
        });
        console.log(`[Track ${this.id}] Finished disposing track.`);
    }
}
