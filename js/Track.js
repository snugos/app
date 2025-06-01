// js/Track.js - Track Class Module

import * as Constants from './constants.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry, AVAILABLE_EFFECTS } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';


export class Track {
    constructor(id, type, initialData = null, appServices = {}) {
        this.id = initialData?.id || id;
        this.type = type;
        this.appServices = appServices; // Store appServices for later use

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

        // Get soloed state from appServices if available
        const currentSoloedId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
        this.isSoloed = currentSoloedId === this.id;
        this.previousVolumeBeforeMute = initialData?.volume ?? 0.7; // Default to 0.7 if not provided

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
            fileName: null, audioBufferDataURL: null, dbKey: null, status: 'empty' // Added status
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
            sampleUrl: null, audioBuffer: null, audioBufferDataURL: null, originalFileName: null, dbKey: null,
            rootNote: 'C4', loop: false, loopStart: 0, loopEnd: 0,
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 }, status: 'empty' // Added status
        };
        this.instrumentSamplerIsPolyphonic = initialData?.instrumentSamplerIsPolyphonic !== undefined ? initialData.instrumentSamplerIsPolyphonic : true;
        this.toneSampler = null; // Will be a Tone.Sampler

        // Drum Sampler specific
        this.drumSamplerPads = initialData?.drumSamplerPads || Array(Constants.numDrumSamplerPads).fill(null).map(() => ({
            sampleUrl: null, audioBuffer: null, audioBufferDataURL: null, originalFileName: null, dbKey: null,
            volume: 0.7, pitchShift: 0,
            envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 }, status: 'empty' // Added status
        }));
        if (initialData?.drumSamplerPads) { // Ensure deep copy and defaults for pads
            initialData.drumSamplerPads.forEach((padData, index) => {
                if (this.drumSamplerPads[index]) { // Check if pad exists at this index
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
        this.drumPadPlayers = Array(Constants.numDrumSamplerPads).fill(null); // Will hold Tone.Player instances

        // Effects
        this.activeEffects = [];
        if (initialData && initialData.activeEffects && Array.isArray(initialData.activeEffects)) {
            initialData.activeEffects.forEach(effectData => {
                // Use appServices for registry access if available, otherwise fallback
                const getDefaults = this.appServices.effectsRegistryAccess?.getEffectDefaultParams || getEffectDefaultParamsFromRegistry;
                const paramsForInstance = effectData.params ? JSON.parse(JSON.stringify(effectData.params)) : getDefaults(effectData.type);
                const toneNode = createEffectInstance(effectData.type, paramsForInstance);
                if (toneNode) {
                    this.activeEffects.push({
                        id: effectData.id || `effect-${this.id}-${effectData.type}-${Date.now()}-${Math.random().toString(36).substr(2,5)}`, // Ensure unique ID
                        type: effectData.type, toneNode: toneNode, params: paramsForInstance
                    });
                }
            });
        }

        // Audio Nodes
        this.gainNode = null; this.trackMeter = null; this.outputNode = null;
        this.instrument = null; // For Synth type

        // Sequences and Timeline Clips
        this.sequences = []; // Array of sequence objects { id, name, data, length }
        this.activeSequenceId = null;
        this.timelineClips = initialData?.timelineClips || []; // Clips for timeline playback

        if (this.type !== 'Audio') {
            if (initialData?.sequences && initialData.sequences.length > 0) {
                this.sequences = JSON.parse(JSON.stringify(initialData.sequences));
                this.activeSequenceId = initialData.activeSequenceId || (this.sequences[0] ? this.sequences[0].id : null);
            } else {
                // Create a default sequence if none are provided
                const defaultSeqId = `seq_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
                let numRowsForGrid;
                if (this.type === 'Synth' || this.type === 'InstrumentSampler') {
                    numRowsForGrid = Constants.synthPitches.length;
                } else if (this.type === 'Sampler') {
                    numRowsForGrid = this.slices.length > 0 ? this.slices.length : Constants.numSlices;
                    if (numRowsForGrid === 0) numRowsForGrid = Constants.numSlices; // Fallback if slices is empty
                } else if (this.type === 'DrumSampler') {
                    numRowsForGrid = Constants.numDrumSamplerPads;
                } else {
                    numRowsForGrid = 1; // Fallback for unknown types, though should not happen
                    console.warn(`[Track ${this.id} Constructor] Unknown track type for sequence rows: ${this.type}. Defaulting to 1 row.`);
                }
                // Ensure numRowsForGrid is not 0 for relevant types to avoid empty sequence data
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
            // Remove legacy properties if they were on initialData (they are now part of the sequences array)
            delete this.sequenceData;
            delete this.sequenceLength;
        } else { // Audio track
            // Ensure audio tracks don't have sequencer properties
            delete this.sequenceData;
            delete this.sequenceLength;
            delete this.sequences; // Should be an empty array anyway
            delete this.activeSequenceId;

            // Convert old audioClips format to new timelineClips if necessary (for backward compatibility)
            if (initialData?.audioClips && Array.isArray(initialData.audioClips)) {
                 initialData.audioClips.forEach(ac => {
                    // Avoid duplicates if timelineClips were also provided
                    const existingClip = this.timelineClips.find(tc => tc.sourceId === ac.dbKey && tc.type === 'audio');
                    if (!existingClip) {
                        this.timelineClips.push({
                            id: ac.id || `audioclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
                            type: 'audio', // Explicitly type it
                            sourceId: ac.dbKey, // Assuming dbKey is the identifier for the audio data
                            startTime: ac.startTime,
                            duration: ac.duration,
                            name: ac.name || `Rec Clip ${this.timelineClips.filter(c => c.type === 'audio').length + 1}`
                        });
                    }
                });
           }
        }
        this.patternPlayerSequence = null; // Tone.Sequence for pattern/sequencer mode

        // UI related
        this.waveformCanvasCtx = null;
        this.instrumentWaveformCanvasCtx = null;
        this.automation = initialData?.automation || { volume: [] }; // Example: { volume: [{time: 0, value: 0.7}, ...] }
        this.inspectorControls = {}; // To store references to UI controls like knobs

        // Audio Track specific (input channel and live players)
        this.inputChannel = null; // For live audio input
        this.clipPlayers = new Map(); // Map of clipId to Tone.Player for timeline audio clips
    }

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


    getDefaultSynthParams() {
        return {
            portamento: 0.01,
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 1 },
            filter: { type: 'lowpass', rolloff: -12, Q: 1 }, // Default Q, frequency will be set by filterEnvelope
            filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 2, baseFrequency: 200, octaves: 7, exponent: 2 }
        };
    }

    // Initializes essential Tone.js nodes for the track
    async initializeAudioNodes() {
        console.log(`[Track ${this.id} initializeAudioNodes] Initializing audio nodes.`);
        // Dispose existing nodes if they exist to prevent duplicates
        if (this.gainNode && !this.gainNode.disposed) { try { this.gainNode.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old gainNode:`, e.message)} }
        if (this.trackMeter && !this.trackMeter.disposed) { try { this.trackMeter.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old trackMeter:`, e.message)} }
        if (this.inputChannel && !this.inputChannel.disposed && this.type === 'Audio') { // Specific to Audio tracks
            try { this.inputChannel.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old inputChannel:`, e.message)}
        }
        // Create new nodes
        this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
        this.trackMeter = new Tone.Meter({ smoothing: 0.8 }); // For UI feedback
        this.outputNode = this.gainNode; // Default output is the gain node
        if (this.type === 'Audio') {
            this.inputChannel = new Tone.Channel(); // For routing live input or recorded audio
            console.log(`[Track ${this.id} initializeAudioNodes] Created inputChannel for Audio track.`);
        }
        this.rebuildEffectChain(); // Connect effects and output
        console.log(`[Track ${this.id} initializeAudioNodes] Audio nodes initialized and effect chain rebuilt.`);
    }

    // Rebuilds the audio signal chain for the track (instrument -> effects -> gain -> meter -> master)
    rebuildEffectChain() {
        console.log(`[Track ${this.id} rebuildEffectChain] Rebuilding effect chain. Effects count: ${this.activeEffects.length}`);
        if (!this.gainNode || this.gainNode.disposed) {
            console.error(`[Track ${this.id} rebuildEffectChain] GainNode is invalid. Aborting chain rebuild.`);
            return;
        }
        if (!this.trackMeter || this.trackMeter.disposed) {
            // Recreate meter if disposed, as it's essential for UI and final output path
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
            console.log(`[Track ${this.id} rebuildEffectChain] Recreated trackMeter.`);
        }

        // Identify all source nodes for this track
        let sourceNodes = [];
        if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) sourceNodes.push(this.instrument);
        else if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed) sourceNodes.push(this.toneSampler);
        else if (this.type === 'DrumSampler') sourceNodes = this.drumPadPlayers.filter(p => p && !p.disposed); // Array of players
        else if (this.type === 'Sampler') {
            // For mono slicer, the slicerMonoGain is the primary output before effects
            if (!this.slicerIsPolyphonic && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                sourceNodes.push(this.slicerMonoGain);
            }
            // Polyphonic slicer players are created on-the-fly and connect directly to the effects chain start or gainNode
        } else if (this.type === 'Audio') {
            // For Audio tracks, the inputChannel is a primary source (for live input/monitoring)
            // Timeline clip players for Audio tracks will be connected separately in schedulePlayback
            if (this.inputChannel && !this.inputChannel.disposed) {
                 sourceNodes.push(this.inputChannel);
                 console.log(`[Track ${this.id} rebuildEffectChain] Using inputChannel as a source for Audio track.`);
            }
        }
        console.log(`[Track ${this.id} rebuildEffectChain] Identified ${sourceNodes.length} primary source nodes.`);

        // Disconnect all managed nodes before rebuilding to prevent duplicate connections
        const allManagedNodes = [
            ...sourceNodes,
            ...this.activeEffects.map(e => e.toneNode),
            this.gainNode,
            this.trackMeter
        ].filter(node => node && !node.disposed); // Filter out null or disposed nodes

        allManagedNodes.forEach(node => {
            try { node.disconnect(); } catch(e) { /* ignore errors if already disconnected */ }
        });
        console.log(`[Track ${this.id} rebuildEffectChain] All managed nodes disconnected.`);

        // Special handling for mono slicer internal chain
        if (this.type === 'Sampler' && !this.slicerIsPolyphonic && this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed &&
            this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed &&
            this.slicerMonoGain && !this.slicerMonoGain.disposed) {
            try { this.slicerMonoPlayer.disconnect(); } catch(e) {/*ignore*/} // Ensure it's clean
            this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
            console.log(`[Track ${this.id} rebuildEffectChain] Rebuilt internal chain for mono slicer.`);
        }

        // Determine the starting point of the audio chain for effects
        let currentOutput = sourceNodes.length > 0 ? (sourceNodes.length === 1 ? sourceNodes[0] : sourceNodes) : null;

        // If it's a polyphonic slicer, effects are applied to on-the-fly players, so currentOutput might be null here.
        // The players will connect to the start of the effects chain or gainNode directly.
        if (this.type === 'Sampler' && this.slicerIsPolyphonic) {
            currentOutput = null; // Effects will be connected from temp players
            console.log(`[Track ${this.id} rebuildEffectChain] Polyphonic slicer: currentOutput set to null for main chain build.`);
        }
        // For Audio tracks, if inputChannel is not used as a source (e.g. only playing back clips), currentOutput might be null.
        // Timeline audio clip players will connect to the start of the effects chain or gainNode.
        if (this.type === 'Audio' && !sourceNodes.includes(this.inputChannel)) {
            currentOutput = null;
             console.log(`[Track ${this.id} rebuildEffectChain] Audio track without live inputChannel as source: currentOutput set to null.`);
        }


        // Chain through active effects
        this.activeEffects.forEach(effectWrapper => {
            if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
                if (currentOutput) { // If there's an existing chain end
                    if (Array.isArray(currentOutput)) { // Multiple sources (e.g., drum pads)
                        currentOutput.forEach(outNode => {
                            if (outNode && !outNode.disposed) outNode.connect(effectWrapper.toneNode);
                        });
                    } else if (currentOutput && !currentOutput.disposed) { // Single source
                        currentOutput.connect(effectWrapper.toneNode);
                    }
                }
                currentOutput = effectWrapper.toneNode; // The current end of the chain is now this effect
                console.log(`[Track ${this.id} rebuildEffectChain] Connected to effect: ${effectWrapper.type}`);
            }
        });

        // Connect the end of the effect chain (or the source if no effects) to the gainNode
        if (currentOutput) {
            if (Array.isArray(currentOutput)) {
                currentOutput.forEach(outNode => {
                    if (outNode && !outNode.disposed) outNode.connect(this.gainNode);
                });
            } else if (currentOutput && !currentOutput.disposed) {
                currentOutput.connect(this.gainNode);
            }
            console.log(`[Track ${this.id} rebuildEffectChain] Connected effect chain output (or source) to gainNode.`);
        } else if ((this.type === 'Sampler' && this.slicerIsPolyphonic) || (this.type === 'Audio')) {
            // For polyphonic slicer or audio tracks, if currentOutput is null, it means
            // temp players (slicer) or clip players (audio) will connect directly.
            // The inputChannel for Audio tracks, if it was a source, would have been part of currentOutput.
            // If no effects, they will connect to this.gainNode.
            console.log(`[Track ${this.id} rebuildEffectChain] ${this.type} track: currentOutput is null. Dynamic players will connect to effects start or gainNode.`);
        }


        // Connect gainNode to trackMeter
        if (this.gainNode && !this.gainNode.disposed && this.trackMeter && !this.trackMeter.disposed) {
            this.gainNode.connect(this.trackMeter);
            console.log(`[Track ${this.id} rebuildEffectChain] Connected gainNode to trackMeter.`);
        }

        // Connect trackMeter to the master effects bus input (or directly to destination if bus not available)
        const masterBusInput = this.appServices.getMasterEffectsBusInputNode ? this.appServices.getMasterEffectsBusInputNode() : null;
        const finalTrackOutput = (this.trackMeter && !this.trackMeter.disposed) ? this.trackMeter : this.gainNode; // Fallback to gainNode if meter is somehow invalid

        if (finalTrackOutput && !finalTrackOutput.disposed && masterBusInput && !masterBusInput.disposed) {
            finalTrackOutput.connect(masterBusInput);
            console.log(`[Track ${this.id} rebuildEffectChain] Connected final track output to masterBusInput.`);
        } else if (finalTrackOutput && !finalTrackOutput.disposed) {
            console.warn(`[Track ${this.id} rebuildEffectChain] Master effects bus input not available. Connecting directly to Tone.Destination.`);
            finalTrackOutput.toDestination();
        } else {
            console.error(`[Track ${this.id} rebuildEffectChain] Final track output node is invalid. Cannot connect to master.`);
        }

        // Apply current mute and solo states
        this.applyMuteState();
        this.applySoloState();
        console.log(`[Track ${this.id} rebuildEffectChain] Mute/Solo states applied. Chain rebuild complete.`);
    }


    addEffect(effectType) {
        // Use appServices for registry access if available
        const AVAILABLE_EFFECTS_LOCAL = this.appServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
        const getEffectDefaultParamsLocal = this.appServices.effectsRegistryAccess?.getEffectDefaultParams || getEffectDefaultParamsFromRegistry;

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
            if (this.appServices.updateTrackUI) { // Notify UI to update
                this.appServices.updateTrackUI(this.id, 'effectsListChanged');
            }
            console.log(`[Track ${this.id}] Added effect: ${effectType}`);
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
            if (this.appServices.updateTrackUI) { // Notify UI
                this.appServices.updateTrackUI(this.id, 'effectsListChanged');
            }
            console.log(`[Track ${this.id}] Removed effect ID: ${effectId}`);
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
                if (paramInstance && typeof paramInstance.value !== 'undefined' && typeof paramInstance.rampTo === 'function') { // It's a Tone.Param or Signal
                    paramInstance.rampTo(value, 0.02); // Short ramp for smoothness
                } else if (paramInstance && typeof paramInstance.value !== 'undefined') { // Direct value property (less common for Tone signals)
                    paramInstance.value = value;
                } else { // Direct property assignment (e.g., filter type)
                    targetObject[finalParamKey] = value;
                }
            } else if (typeof effectWrapper.toneNode.set === 'function' && keys.length > 0) {
                // Fallback for nodes that use .set() for nested params
                const setObj = {};
                let currentLevelForSet = setObj;
                for(let i = 0; i < keys.length - 1; i++){
                    currentLevelForSet[keys[i]] = {};
                    currentLevelForSet = currentLevelForSet[keys[i]];
                }
                currentLevelForSet[finalParamKey] = value;
                effectWrapper.toneNode.set(setObj);
            } else {
                console.warn(`[Track ${this.id}] Could not set parameter ${paramPath} on effect ${effectWrapper.type}. Target or property not found.`);
            }
        } catch (err) {
            console.error(`[Track ${this.id}] Error updating param ${paramPath} for effect ${effectWrapper.type}:`, err, "Value:", value);
        }
    }

    reorderEffect(effectId, newIndex) {
        const oldIndex = this.activeEffects.findIndex(e => e.id === effectId);
        if (oldIndex === -1) return; // Effect not found

        newIndex = Math.max(0, Math.min(newIndex, this.activeEffects.length - 1)); // Clamp newIndex
        if (oldIndex === newIndex) return; // No change

        const [effectToMove] = this.activeEffects.splice(oldIndex, 1);
        this.activeEffects.splice(newIndex, 0, effectToMove);
        this.rebuildEffectChain(); // Rebuild chain with new order

        if (this.appServices.updateTrackUI) { // Notify UI
            this.appServices.updateTrackUI(this.id, 'effectsListChanged');
        }
        console.log(`[Track ${this.id}] Reordered effect ID: ${effectId} to index ${newIndex}`);
    }

    // Initializes audio resources like samples. Called after track creation or project load.
    async fullyInitializeAudioResources() {
        console.log(`[Track ${this.id} fullyInitializeAudioResources] Initializing audio resources for type: ${this.type}`);
        if (!this.gainNode || this.gainNode.disposed) { // Ensure basic nodes are there
            await this.initializeAudioNodes();
        }

        try {
            if (this.type === 'Synth') {
                await this.initializeInstrument(); // Creates the Tone.MonoSynth instance
            } else if (this.type === 'Sampler') {
                if (this.samplerAudioData && (this.samplerAudioData.dbKey || this.samplerAudioData.audioBufferDataURL)) {
                    let audioFile; // This will be a Blob
                    if (this.samplerAudioData.dbKey) {
                        audioFile = await getAudio(this.samplerAudioData.dbKey).catch(err => {
                            console.error(`[Track ${this.id}] Error getting audio from DB for key ${this.samplerAudioData.dbKey}:`, err);
                            this.samplerAudioData.status = 'error';
                            if (this.appServices.showNotification) this.appServices.showNotification(`Error loading sample ${this.samplerAudioData.fileName || 'from database'}.`, 3000);
                            return null;
                        });
                    } else if (this.samplerAudioData.audioBufferDataURL) { // Fallback to data URL if no dbKey
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
                            this.audioBuffer = await new Tone.Buffer().load(objectURL);
                            this.samplerAudioData.status = 'loaded';
                            if (!this.slicerIsPolyphonic) this.setupSlicerMonoNodes(); // Setup mono player if needed
                            // Auto-slice if buffer loaded and no slices defined yet
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
                        this.samplerAudioData.status = this.samplerAudioData.dbKey ? 'missing_db' : 'error'; // Mark as missing or error
                    }
                }
            } else if (this.type === 'DrumSampler') {
                for (let i = 0; i < this.drumSamplerPads.length; i++) {
                    const pad = this.drumSamplerPads[i];
                    if (pad.dbKey || pad.audioBufferDataURL) { // If there's a key or data URL to load from
                        let audioFile; // Blob
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
                                    pad.audioBuffer = await new Tone.Buffer().load(objectURL); // Store Tone.Buffer on pad
                                    // Dispose old player if exists, create new one
                                    if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) this.drumPadPlayers[i].dispose();
                                    this.drumPadPlayers[i] = new Tone.Player(pad.audioBuffer);
                                    pad.status = 'loaded';
                                } catch (toneLoadErr) {
                                    console.error(`[Track ${this.id}] Tone.Buffer load error for drum pad ${i} (${pad.originalFileName}):`, toneLoadErr);
                                    pad.status = 'error';
                                } finally {
                                    URL.revokeObjectURL(objectURL);
                                }
                            } else if (pad.status !== 'error') {
                                pad.status = pad.dbKey ? 'missing_db' : 'error';
                            }
                        } catch (loadErr) {
                             console.error(`[Track ${this.id}] Error loading resource for drum pad ${i} (${pad.originalFileName}):`, loadErr);
                             pad.status = 'error'; // Mark pad as error on any other load issue
                        }
                    }
                }
            } else if (this.type === 'InstrumentSampler') {
                 if (this.instrumentSamplerSettings.dbKey || this.instrumentSamplerSettings.audioBufferDataURL) {
                    let audioFile; // Blob
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
                                this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(objectURL);
                                this.instrumentSamplerSettings.status = 'loaded';
                            } catch (toneLoadErr) {
                                console.error(`[Track ${this.id}] Tone.Buffer load error for instrument sampler:`, toneLoadErr);
                                this.instrumentSamplerSettings.status = 'error';
                            } finally {
                                URL.revokeObjectURL(objectURL);
                            }
                        } else if(this.instrumentSamplerSettings.status !== 'error') {
                            this.instrumentSamplerSettings.status = this.instrumentSamplerSettings.dbKey ? 'missing_db' : 'error';
                        }
                    } catch (loadErr) {
                        console.error(`[Track ${this.id}] Error loading resource for instrument sampler:`, loadErr);
                        this.instrumentSamplerSettings.status = 'error';
                    }
                }
                this.setupToneSampler(); // Create/update the Tone.Sampler instance
            }
            // Ensure inputChannel is ready for Audio tracks (even if not actively monitoring, it's part of the chain)
            if (this.type === 'Audio' && (!this.inputChannel || this.inputChannel.disposed)) {
                await this.initializeAudioNodes(); // This will create it
            }

        } catch (error) {
            console.error(`[Track ${this.id}] Overall error in fullyInitializeAudioResources for ${this.type}:`, error);
            if (this.appServices.showNotification) this.appServices.showNotification(`Major error loading audio for ${this.name}.`, 4000);
            if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sampleLoadError'); // Generic error update
        }

        // Recreate Tone.Sequence if it's a sequence-based track, ensuring it uses fresh resources
        if (this.type !== 'Audio') {
            this.recreateToneSequence(true); // forceRestart true
        }
        this.rebuildEffectChain(); // Final chain rebuild
        console.log(`[Track ${this.id} fullyInitializeAudioResources] Finished audio resource initialization.`);
    }

    // Initializes the instrument for Synth tracks
    async initializeInstrument() {
        if (this.type === 'Synth') {
            if (this.instrument && !this.instrument.disposed) {
                this.instrument.dispose();
            }
            this.instrument = new Tone.MonoSynth(this.synthParams);
            console.log(`[Track ${this.id} initializeInstrument] MonoSynth initialized with params:`, this.synthParams);
        }
    }

    // Sets up nodes for mono slicer playback
    setupSlicerMonoNodes() {
        this.disposeSlicerMonoNodes(); // Clean up existing
        if (!this.slicerIsPolyphonic) {
            this.slicerMonoPlayer = new Tone.Player();
            this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
            this.slicerMonoGain = new Tone.Gain();
            // Internal chain: Player -> Envelope -> Gain
            this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
            // The slicerMonoGain will then be connected into the main effect chain by rebuildEffectChain

            if (this.audioBuffer && this.audioBuffer.loaded) { // If buffer is ready, assign it
                this.slicerMonoPlayer.buffer = this.audioBuffer;
            }
            console.log(`[Track ${this.id} setupSlicerMonoNodes] Mono slicer nodes created.`);
        }
    }
    // Disposes mono slicer nodes
    disposeSlicerMonoNodes() {
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) { this.slicerMonoPlayer.dispose(); }
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) { this.slicerMonoEnvelope.dispose(); }
        if (this.slicerMonoGain && !this.slicerMonoGain.disposed) { this.slicerMonoGain.dispose(); }
        this.slicerMonoPlayer = null; this.slicerMonoEnvelope = null; this.slicerMonoGain = null;
    }

    // Sets up or updates the Tone.Sampler for InstrumentSampler tracks
    setupToneSampler() {
        if (this.type === 'InstrumentSampler') {
            if (this.toneSampler && !this.toneSampler.disposed) {
                this.toneSampler.dispose(); // Dispose old one first
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
                            // Apply loop settings after load, as Sampler might override them during construction
                            if (this.toneSampler && !this.toneSampler.disposed) {
                                this.toneSampler.loop = this.instrumentSamplerSettings.loop;
                                this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart;
                                this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd;
                            }
                            console.log(`[Track ${this.id} setupToneSampler] Tone.Sampler loaded and configured.`);
                        }
                    });
                } catch (e) {
                    console.error(`[Track ${this.id} setupToneSampler] Error creating Tone.Sampler:`, e);
                    if (this.appServices.showNotification) this.appServices.showNotification(`Error creating instrument sampler for ${this.name}.`, 3000);
                    this.toneSampler = null; // Ensure it's null on error
                }
            } else {
                 this.toneSampler = null; // No buffer, no sampler
                 console.log(`[Track ${this.id} setupToneSampler] No audio buffer loaded for InstrumentSampler, toneSampler set to null.`);
            }
        }
    }

    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = volume;
        if (this.gainNode && !this.gainNode.disposed && !this.isMuted) {
            this.gainNode.gain.setValueAtTime(volume, Tone.now());
        }
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
        // Soloing one track effectively mutes others (unless they are also soloed, though typical DAWs allow only one solo)
        // This logic is handled by applyMuteState based on the global soloedTrackId
        this.applyMuteState();
    }

    setSynthParam(paramPath, value) {
        if (this.type !== 'Synth' || !this.instrument || this.instrument.disposed) return;
        try {
            const keys = paramPath.split('.');
            let target = this.instrument;
            let paramsTarget = this.synthParams; // Update internal state as well

            for (let i = 0; i < keys.length - 1; i++) {
                target = target[keys[i]];
                paramsTarget[keys[i]] = paramsTarget[keys[i]] || {}; // Ensure path exists in internal state
                paramsTarget = paramsTarget[keys[i]];
            }
            const finalKey = keys[keys.length - 1];
            paramsTarget[finalKey] = value; // Update internal state

            // Update Tone.js object
            if (target && target[finalKey] && typeof target[finalKey].setValueAtTime === 'function') { // Tone.Param or Signal
                target[finalKey].setValueAtTime(value, Tone.now());
            } else if (target && typeof target[finalKey] !== 'undefined' && typeof target[finalKey].value !== 'undefined') { // Direct .value property
                 target[finalKey].value = value;
            }
            else if (target && typeof target[finalKey] !== 'undefined') { // Other direct properties (e.g., oscillator type)
                target[finalKey] = value;
            } else if (typeof target.set === 'function') { // Fallback to .set for complex objects
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

    // --- Slice specific setters ---
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

    // --- Drum Sampler Pad specific setters ---
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

    // --- Instrument Sampler specific setters ---
    setInstrumentSamplerRootNote(noteName) {
        this.instrumentSamplerSettings.rootNote = noteName;
        this.setupToneSampler(); // Re-setup sampler with new root note
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
        if (this.toneSampler && !this.toneSampler.disposed) { // Apply to Tone.Sampler if it exists
            if (param === 'attack' && typeof this.toneSampler.attack !== 'undefined') this.toneSampler.attack = value;
            if (param === 'release' && typeof this.toneSampler.release !== 'undefined') this.toneSampler.release = value;
            // Note: Tone.Sampler doesn't directly expose decay/sustain on the top level.
            // For more complex envelopes, one might wrap Tone.Sampler in an AmplitudeEnvelope.
        }
    }

    _captureUndoState(description) {
        if (this.appServices.captureStateForUndo) {
            this.appServices.captureStateForUndo(description);
        }
    }

    // --- Sequence Management ---
    createNewSequence(name = `Sequence ${this.sequences.length + 1}`) {
        if (this.type === 'Audio') return null; // Audio tracks don't use these sequences
        const newSeqId = `seq_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        let numRowsForGrid;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRowsForGrid = Constants.synthPitches.length;
        else if (this.type === 'Sampler') numRowsForGrid = this.slices.length > 0 ? this.slices.length : Constants.numSlices;
        else if (this.type === 'DrumSampler') numRowsForGrid = Constants.numDrumSamplerPads;
        else numRowsForGrid = 1; // Fallback

        if (numRowsForGrid === 0 && (this.type === 'Synth' || this.type === 'InstrumentSampler' || this.type === 'Sampler' || this.type === 'DrumSampler')) {
             console.warn(`[Track ${this.id} createNewSequence] numRowsForGrid was 0 for type ${this.type}, defaulting to 1.`);
             numRowsForGrid = 1;
        }

        const newSequence = {
            id: newSeqId,
            name: name,
            data: Array(numRowsForGrid).fill(null).map(() => Array(Constants.defaultStepsPerBar).fill(null)),
            length: Constants.defaultStepsPerBar
        };
        this.sequences.push(newSequence);
        this.activeSequenceId = newSeqId; // Set new sequence as active
        this.recreateToneSequence(true); // Rebuild Tone.Sequence for the new active one
        if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        console.log(`[Track ${this.id}] Created new sequence: ${name} (ID: ${newSeqId})`);
        return newSequence;
    }

    deleteSequence(sequenceId) {
        if (this.type === 'Audio' || this.sequences.length <= 1) { // Can't delete the last sequence
            if(this.appServices.showNotification) this.appServices.showNotification("Cannot delete the last sequence.", 2000);
            return;
        }
        const index = this.sequences.findIndex(s => s.id === sequenceId);
        if (index > -1) {
            const deletedSeqName = this.sequences[index].name;
            this._captureUndoState(`Delete sequence "${deletedSeqName}" from ${this.name}`);
            this.sequences.splice(index, 1);
            if (this.activeSequenceId === sequenceId) { // If active was deleted, set new active
                this.activeSequenceId = this.sequences[0]?.id || null;
            }
            this.recreateToneSequence(true);
            // Remove any timeline clips associated with this deleted sequence
            this.timelineClips = this.timelineClips.filter(clip => clip.type !== 'sequence' || clip.sourceSequenceId !== sequenceId);
            if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
            if (this.appServices.renderTimeline) this.appServices.renderTimeline(); // Update timeline view
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
            // Update names in timeline clips if they reference this sequence
            this.timelineClips.forEach(clip => {
                if (clip.type === 'sequence' && clip.sourceSequenceId === sequenceId) {
                    // clip.name = sequence.name; // Or some other naming convention
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

    doubleSequence() {
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
            if(row) { // Ensure row exists
               const copyOfOriginal = row.slice(0, oldLength); // Copy existing steps
               row.length = newLength; // Extend row
               // Fill new part with nulls initially
               for(let i = oldLength; i < newLength; i++) {
                   row[i] = null;
               }
               // Copy original steps to the new extended part
               for(let i = 0; i < oldLength; i++) {
                   if (copyOfOriginal[i]) { // If there was a step, deep copy it
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

        const oldActualLength = activeSeq.length;
        // Ensure new length is valid and a multiple of STEPS_PER_BAR
        newLengthInSteps = Math.max(Constants.STEPS_PER_BAR, parseInt(newLengthInSteps) || Constants.defaultStepsPerBar);
        newLengthInSteps = Math.ceil(newLengthInSteps / Constants.STEPS_PER_BAR) * Constants.STEPS_PER_BAR; // Snap to bar
        newLengthInSteps = Math.min(newLengthInSteps, Constants.MAX_BARS * Constants.STEPS_PER_BAR); // Cap at max bars

        if (!skipUndoCapture && oldActualLength !== newLengthInSteps) {
            this._captureUndoState(`Set Seq Length for ${activeSeq.name} on ${this.name} to ${newLengthInSteps / Constants.STEPS_PER_BAR} bars`);
        }
        activeSeq.length = newLengthInSteps;

        // Adjust data array for each row to match new length
        let numRows; // Determine number of rows based on track type
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRows = Constants.synthPitches.length;
        else if (this.type === 'Sampler') numRows = this.slices.length > 0 ? this.slices.length : Constants.numSlices;
        else if (this.type === 'DrumSampler') numRows = Constants.numDrumSamplerPads;
        else numRows = (activeSeq.data && activeSeq.data.length > 0) ? activeSeq.data.length : 1; // Fallback

        const currentSequenceData = activeSeq.data || []; // Ensure data array exists
        activeSeq.data = Array(numRows).fill(null).map((_, rIndex) => {
            const currentRow = currentSequenceData[rIndex] || []; // Get existing row or empty array
            const newRow = Array(activeSeq.length).fill(null); // Create new row with new length
            // Copy existing steps up to the shorter of old/new length
            for (let c = 0; c < Math.min(currentRow.length, activeSeq.length); c++) newRow[c] = currentRow[c];
            return newRow;
        });

        this.recreateToneSequence(true); // Rebuild Tone.Sequence
        if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
    }

    // MODIFIED: `recreateToneSequence` now prepares the sequence but doesn't auto-start it.
    // The actual start is handled by `schedulePlayback`.
    recreateToneSequence(forceRestart = false, startTimeOffsetForImmediateStart = 0) {
        if (this.type === 'Audio') return; // Audio tracks don't use Tone.Sequence this way

        // Get current playback mode from appServices
        const currentPlaybackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        console.log(`[Track ${this.id} recreateToneSequence] Called. ActiveSeqID: ${this.activeSequenceId}. Current Playback Mode: ${currentPlaybackMode}`);

        // Dispose existing sequence if it exists
        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            console.log(`[Track ${this.id} recreateToneSequence] Disposing existing Tone.Sequence.`);
            this.patternPlayerSequence.stop();
            this.patternPlayerSequence.clear();
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
            activeSeq.length = Constants.defaultStepsPerBar;
        }

        const sequenceDataForTone = activeSeq.data;
        const sequenceLengthForTone = activeSeq.length;
        console.log(`[Track ${this.id} recreateToneSequence] Creating Tone.Sequence for '${activeSeq.name}' with ${sequenceLengthForTone} steps and ${sequenceDataForTone.length} rows for SEQUENCER mode. Data snapshot:`, JSON.stringify(sequenceDataForTone.slice(0, 2).map(row => row ? row.slice(0,4) : null)));

        if(sequenceDataForTone.length === 0 && sequenceLengthForTone > 0){
            console.warn(`[Track ${this.id} recreateToneSequence] Sequence data has 0 rows, but length is ${sequenceLengthForTone}. This might lead to issues or an empty sequence.`);
        }
        if (sequenceLengthForTone === 0) {
            console.warn(`[Track ${this.id} recreateToneSequence] sequenceLengthForTone is 0. Tone.Sequence will likely not fire events.`);
        }


        this.patternPlayerSequence = new Tone.Sequence((time, col) => {
            // console.log(`[Track ${this.id} SEQUENCER PLAYING] Time: ${time}, Column: ${col}, Type: ${this.type}`); // Can be too verbose

            // Double check playback mode inside the callback as well, in case it changes mid-sequence
            const playbackModeCheck = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
            if (playbackModeCheck !== 'sequencer') {
                if (this.patternPlayerSequence && this.patternPlayerSequence.state === 'started') {
                    this.patternPlayerSequence.stop(); // Stop if mode changed
                }
                return;
            }

            const currentGlobalSoloId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
            const isEffectivelyMuted = this.isMuted || (currentGlobalSoloId !== null && currentGlobalSoloId !== this.id);

            if (this.appServices.highlightPlayingStep) {
                 this.appServices.highlightPlayingStep(this.id, col);
            }

            if (!this.gainNode || this.gainNode.disposed || isEffectivelyMuted) {
                return; // Don't play if muted or no gain node
            }

            // Determine where to connect the temporary players/instruments
            const effectsChainStartPoint = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                ? this.activeEffects[0].toneNode
                : this.gainNode; // Connect to gainNode if no effects


            if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
                 let notePlayedThisStep = false; // MonoSynth behavior: only one note per step
                 for (let rowIndex = 0; rowIndex < Constants.synthPitches.length; rowIndex++) {
                    if (!sequenceDataForTone[rowIndex]) continue; // Skip if row doesn't exist
                    const pitchName = Constants.synthPitches[rowIndex];
                    const step = sequenceDataForTone[rowIndex]?.[col];
                    if (step?.active && !notePlayedThisStep) {
                        this.instrument.triggerAttackRelease(pitchName, "8n", time, step.velocity * Constants.defaultVelocity);
                        notePlayedThisStep = true; // Play only the first active note in the column for MonoSynth
                    }
                }
            } else if (this.type === 'Sampler') {
                this.slices.forEach((sliceData, sliceIndex) => {
                    if (!sequenceDataForTone[sliceIndex]) return; // Skip if row for this slice doesn't exist
                    const step = sequenceDataForTone[sliceIndex]?.[col];
                    if (step?.active && sliceData?.duration > 0 && this.audioBuffer?.loaded) {
                        const playbackRate = Math.pow(2, (sliceData.pitchShift || 0) / 12);
                        let playDuration = sliceData.duration / playbackRate;
                        if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds(); // Or some other sensible loop duration for sequencer

                        if (this.slicerIsPolyphonic) {
                            const tempPlayer = new Tone.Player(this.audioBuffer);
                            const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                            const tempGain = new Tone.Gain(step.velocity * sliceData.volume); // Apply step velocity and slice volume
                            tempPlayer.chain(tempEnv, tempGain, effectsChainStartPoint); // Connect to effects or gain
                            tempPlayer.playbackRate = playbackRate; tempPlayer.reverse = sliceData.reverse; tempPlayer.loop = sliceData.loop;
                            tempPlayer.loopStart = sliceData.offset; tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
                            tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            tempEnv.triggerAttack(time);
                            if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95); // Slightly before player stops
                            // Schedule disposal of temporary nodes
                            Tone.Transport.scheduleOnce(() => { if(tempPlayer && !tempPlayer.disposed) tempPlayer.dispose(); if(tempEnv && !tempEnv.disposed) tempEnv.dispose(); if(tempGain && !tempGain.disposed) tempGain.dispose(); }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);
                        } else if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                            // Ensure mono player is connected to the correct point in the chain
                            if (this.slicerMonoGain.numberOfOutputs === 0 || !this.slicerMonoGain.connectedTo(effectsChainStartPoint)) {
                                try { this.slicerMonoGain.disconnect(); } catch(e) {/*ignore*/}
                                this.slicerMonoGain.connect(effectsChainStartPoint);
                            }
                            if (this.slicerMonoPlayer.state === 'started') this.slicerMonoPlayer.stop(time); // Stop previous note
                            this.slicerMonoEnvelope.triggerRelease(time); // Release previous envelope

                            this.slicerMonoPlayer.buffer = this.audioBuffer; // Ensure buffer is current
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
                                const releaseTime = time + playDuration - (sliceData.envelope.release * 0.05); // Adjust release timing
                                this.slicerMonoEnvelope.triggerRelease(Math.max(time, releaseTime));
                            }
                        }
                    }
                });
            } else if (this.type === 'DrumSampler') {
                Array.from({ length: Constants.numDrumSamplerPads }).forEach((_, padIndex) => {
                    if (!sequenceDataForTone[padIndex]) return; // Skip if row for this pad doesn't exist
                    const step = sequenceDataForTone[padIndex]?.[col];
                    const padData = this.drumSamplerPads[padIndex];
                    if (step?.active && padData && this.drumPadPlayers[padIndex]?.loaded) {
                        const player = this.drumPadPlayers[padIndex];
                        // Ensure player is connected correctly
                        if (player.numberOfOutputs === 0 || !player.connectedTo(effectsChainStartPoint)) {
                            try { player.disconnect(); } catch(e) {/*ignore*/}
                            player.connect(effectsChainStartPoint);
                        }
                        player.volume.value = Tone.dbToGain(padData.volume * step.velocity); // Apply velocity
                        player.playbackRate = Math.pow(2, (padData.pitchShift || 0) / 12);
                        player.start(time);
                    }
                });
            } else if (this.type === 'InstrumentSampler' && this.toneSampler?.loaded) {
                 let notePlayedThisStepInColumn = false;
                 Constants.synthPitches.forEach((pitchName, rowIndex) => {
                    if (!sequenceDataForTone[rowIndex]) return; // Skip if row doesn't exist
                    const step = sequenceDataForTone[rowIndex]?.[col];
                    if (step?.active) {
                        if (!this.instrumentSamplerIsPolyphonic && !notePlayedThisStepInColumn) {
                            this.toneSampler.releaseAll(time); // Release previous note for mono behavior
                            notePlayedThisStepInColumn = true;
                        }
                        this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "8n", time, step.velocity * Constants.defaultVelocity);
                    }
                });
            }
        }, Array.from(Array(sequenceLengthForTone).keys()), "16n"); // Events are 16th notes

        this.patternPlayerSequence.loop = true;
        // MODIFIED: Do not start the sequence here. Let schedulePlayback handle it.
        // if (forceRestart) {
        //     this.patternPlayerSequence.start(startTimeOffsetForImmediateStart);
        // }
        console.log(`[Track ${this.id} recreateToneSequence] Tone.Sequence for '${activeSeq.name}' prepared. Loop: ${this.patternPlayerSequence.loop}. It will be started by schedulePlayback.`);


        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
    }


    async addAudioClip(blob, startTime) {
        if (this.type !== 'Audio') return;
        const clipId = `audioclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        const dbKey = `clip_${this.id}_${Date.now()}.wav`; // Or use a more robust naming/hashing

        try {
            await storeAudio(dbKey, blob); // Store in IndexedDB
            const duration = await this.getBlobDuration(blob); // Helper to get duration

            const newClip = {
                id: clipId,
                type: 'audio', // Differentiate from sequence clips
                sourceId: dbKey, // This will be used to retrieve from DB
                startTime: startTime,
                duration: duration,
                name: `Rec ${new Date().toLocaleTimeString()}` // Or some other default name
            };

            this.timelineClips.push(newClip);
            console.log(`[Track ${this.id}] Added audio clip to timelineClips:`, newClip);


            // If the timeline window is open, re-render it
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

    // Helper to get duration of a blob
    async getBlobDuration(blob) {
        const tempUrl = URL.createObjectURL(blob);
        const audioContext = Tone.context.rawContext; // Get the native AudioContext
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

    // MODIFIED: `schedulePlayback` now consistently starts the `patternPlayerSequence` for sequencer mode.
    async schedulePlayback(transportStartTime, transportStopTime) {
        // Get current playback mode from appServices
        const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        console.log(`[Track ${this.id} (${this.type})] schedulePlayback. Mode: ${playbackMode}. Transport Start: ${transportStartTime}, Stop: ${transportStopTime}`);

        this.stopPlayback(); // Clear previous players/sequences for this track

        if (playbackMode === 'timeline') {
            console.log(`[Track ${this.id}] In TIMELINE mode. Scheduling ${this.timelineClips.length} timeline clips.`);
            if (this.patternPlayerSequence && this.patternPlayerSequence.state === 'started') {
                console.log(`[Track ${this.id}] Timeline mode: Stopping active patternPlayerSequence.`);
                this.patternPlayerSequence.stop(); // Ensure pattern sequence is stopped
            }
            for (const clip of this.timelineClips) {
                const clipActualStartOnTransport = clip.startTime;
                const clipActualEndOnTransport = clip.startTime + clip.duration;

                // Determine if the clip is within the current playback window [transportStartTime, transportStopTime]
                const effectivePlayStartOnTransport = Math.max(clipActualStartOnTransport, transportStartTime);
                const effectivePlayEndOnTransport = Math.min(clipActualEndOnTransport, transportStopTime);

                let playDurationInWindow = effectivePlayEndOnTransport - effectivePlayStartOnTransport;

                if (playDurationInWindow <= 1e-3) { // If duration is negligible or negative, skip
                    // console.log(`[Track ${this.id}] Clip ${clip.id} (${clip.type}) outside/negligible in window. Skipping.`);
                    continue;
                }

                const offsetIntoSource = Math.max(0, effectivePlayStartOnTransport - clipActualStartOnTransport);

                if (clip.type === 'audio') {
                    console.log(`[Track ${this.id}] Scheduling AUDIO clip ${clip.id} ('${clip.name}') at transport time ${effectivePlayStartOnTransport} for ${playDurationInWindow}s (offset into source ${offsetIntoSource}s)`);
                    const player = new Tone.Player(); // Create a new player for each scheduling instance
                    this.clipPlayers.set(clip.id, player); // Store it for potential stop/cleanup
                    try {
                        const audioBlob = await getAudio(clip.sourceId);
                        if (audioBlob) {
                            const url = URL.createObjectURL(audioBlob);
                            player.onload = () => {
                                URL.revokeObjectURL(url); // Revoke URL after buffer is loaded
                                // Determine connection point: start of effects or gainNode
                                const destinationNode = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                                    ? this.activeEffects[0].toneNode
                                    : (this.gainNode && !this.gainNode.disposed ? this.gainNode : null);

                                if (destinationNode) player.connect(destinationNode); else player.toDestination(); // Fallback to master

                                player.start(effectivePlayStartOnTransport, offsetIntoSource, playDurationInWindow);
                                console.log(`[Track ${this.id}] AUDIO clip ${clip.id} player started at ${effectivePlayStartOnTransport}, offset ${offsetIntoSource}, duration ${playDurationInWindow}`);
                            };
                            player.onerror = (error) => { console.error(`[Track ${this.id}] Error loading audio for clip ${clip.id}:`, error); URL.revokeObjectURL(url); if (this.clipPlayers.has(clip.id)) { if(!player.disposed) player.dispose(); this.clipPlayers.delete(clip.id); }};
                            await player.load(url); // Load the audio
                        } else {
                            console.warn(`[Track ${this.id}] Audio blob not found for clip ${clip.id} (sourceId: ${clip.sourceId})`);
                            if (!player.disposed) player.dispose(); this.clipPlayers.delete(clip.id);
                        }
                    } catch (error) { console.error(`[Track ${this.id}] Error in schedulePlayback for audio clip ${clip.id}:`, error); if (this.clipPlayers.has(clip.id)) { const p = this.clipPlayers.get(clip.id); if(p && !p.disposed) p.dispose(); this.clipPlayers.delete(clip.id); }}
                } else if (clip.type === 'sequence') {
                    const sourceSequence = this.sequences.find(s => s.id === clip.sourceSequenceId);
                    if (sourceSequence && sourceSequence.data && sourceSequence.data.length > 0 && sourceSequence.length > 0) {
                        console.log(`[Track ${this.id}] Timeline: Scheduling SEQUENCE clip '${clip.name}' (Source: ${sourceSequence.name}) from ${effectivePlayStartOnTransport} for ${playDurationInWindow}s`);

                        const sixteenthTime = Tone.Time("16n").toSeconds(); // Duration of one 16th note
                        const totalEventsInSourceSeq = sourceSequence.length;

                        for(let stepIndex = 0; stepIndex < totalEventsInSourceSeq; stepIndex++) {
                            const timeWithinSourceSeq = stepIndex * sixteenthTime; // Time of this step *within its own sequence*
                            const actualTransportTimeForStep = clipActualStartOnTransport + timeWithinSourceSeq; // Absolute transport time

                            // Only schedule if this step falls within the current playback window
                            if (actualTransportTimeForStep >= effectivePlayStartOnTransport && actualTransportTimeForStep < effectivePlayEndOnTransport) {
                                // Iterate over rows (pitches/pads/slices) for this step
                                for (let rowIndex = 0; rowIndex < sourceSequence.data.length; rowIndex++) {
                                    const stepData = sourceSequence.data[rowIndex]?.[stepIndex];
                                    if (stepData?.active) { // If the step is active
                                        Tone.Transport.scheduleOnce((time) => { // time here is actualTransportTimeForStep
                                            // Check mute/solo status at the moment of playback
                                            const currentGlobalSoloId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
                                            const isEffectivelyMuted = this.isMuted || (currentGlobalSoloId !== null && currentGlobalSoloId !== this.id);
                                            if (!this.gainNode || this.gainNode.disposed || isEffectivelyMuted) return;

                                            const effectsChainStartPoint = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                                                ? this.activeEffects[0].toneNode
                                                : this.gainNode;

                                            // Instrument-specific triggering logic (same as in recreateToneSequence callback)
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
                                                    tempPlayer.loop = false; // Timeline sequence clips usually don't loop individual steps
                                                    tempPlayer.start(time, sliceData.offset, playDuration);
                                                    tempEnv.triggerAttack(time);
                                                    tempEnv.triggerRelease(time + playDuration * 0.95);
                                                    Tone.Transport.scheduleOnce(() => { if(tempPlayer && !tempPlayer.disposed) tempPlayer.dispose(); if(tempEnv && !tempEnv.disposed) tempEnv.dispose(); if(tempGain && !tempGain.disposed) tempGain.dispose(); }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);
                                                }
                                            } else if (this.type === 'DrumSampler' && this.drumPadPlayers[rowIndex]?.loaded) {
                                                const player = this.drumPadPlayers[rowIndex];
                                                const padData = this.drumSamplerPads[rowIndex];
                                                // Ensure player is connected
                                                if (player.numberOfOutputs === 0 || !player.connectedTo(effectsChainStartPoint)) {
                                                    try {player.disconnect();} catch(e){} player.connect(effectsChainStartPoint);
                                                }
                                                player.volume.value = Tone.dbToGain(padData.volume * stepData.velocity);
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
        } else { // 'sequencer' mode
            // Ensure the Tone.Sequence is ready
            if (!this.patternPlayerSequence || this.patternPlayerSequence.disposed) {
                console.log(`[Track ${this.id}] Sequencer mode: patternPlayerSequence is null or disposed. Recreating.`);
                this.recreateToneSequence(true); // Recreate it (it won't auto-start)
            }

            // Now, consistently start it with the transportStartTime
            if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
                if (this.patternPlayerSequence.state === 'started') {
                    // If it's already started (e.g., from a previous play command without stopping transport),
                    // stop it first to ensure it reschedules correctly with the new transportStartTime.
                    this.patternPlayerSequence.stop(Tone.Transport.now()); // Stop immediately in transport time
                    console.log(`[Track ${this.id}] Sequencer mode: Stopped existing patternPlayerSequence before restarting.`);
                }
                console.log(`[Track ${this.id}] Sequencer mode: Starting/Restarting patternPlayerSequence at transport offset: ${transportStartTime}. Sequence loop: ${this.patternPlayerSequence.loop}`);
                this.patternPlayerSequence.start(transportStartTime);
            } else {
                console.warn(`[Track ${this.id}] Sequencer mode: patternPlayerSequence still not valid after recreation attempt. Cannot start.`);
            }
        }
    }

    stopPlayback() {
        console.log(`[Track ${this.id}] stopPlayback called. Current timeline clip players: ${this.clipPlayers.size}`);
        // Stop and dispose timeline audio clip players
        const playersToStop = Array.from(this.clipPlayers.values());
        playersToStop.forEach(player => {
            if (player && !player.disposed) {
                try {
                    player.unsync(); // Unsync from transport if synced
                    player.stop(Tone.Transport.now()); // Stop immediately
                    player.dispose();
                } catch (e) {
                    console.warn(`[Track ${this.id}] Error stopping/disposing a timeline clip player:`, e);
                }
            }
        });
        this.clipPlayers.clear();
        console.log(`[Track ${this.id}] Timeline clip players cleared.`);

        // Stop the pattern player sequence if it's running
        if (this.patternPlayerSequence && this.patternPlayerSequence.state === 'started') {
            this.patternPlayerSequence.stop(Tone.Transport.now()); // Stop immediately
            console.log(`[Track ${this.id}] Stopped patternPlayerSequence.`);
        }
    }


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

            // If transport is running in timeline mode, we need to re-schedule
            const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
            if (Tone.Transport.state === 'started' && playbackMode === 'timeline') {
                const currentPlayheadPosition = Tone.Transport.seconds;
                console.log(`[Track ${this.id}] Transport is running at ${currentPlayheadPosition}s. Handling clip move in timeline mode.`);

                // Pause transport, clear all scheduled events for all tracks, then reschedule and resume
                Tone.Transport.pause(); // Pause instead of stop to preserve current position for resume
                console.log(`[Track ${this.id}] Transport paused for rescheduling.`);

                const allTracks = this.appServices.getTracks ? this.appServices.getTracks() : [];
                allTracks.forEach(t => {
                    if (typeof t.stopPlayback === 'function') {
                        t.stopPlayback(); // Clear individual track's players/sequences
                    }
                });

                Tone.Transport.cancel(0); // Clear all transport events
                console.log(`[Track ${this.id}] Called Tone.Transport.cancel(0) globally.`);

                // Determine the new scheduling window, e.g., from current playhead to loop end or a fixed lookahead
                const lookaheadDuration = 300; // seconds, for how far ahead to reschedule
                const transportStopTime = Tone.Transport.loop && Tone.Transport.loopEnd > 0 ?
                                          Tone.Transport.loopEnd :
                                          (currentPlayheadPosition + lookaheadDuration);

                console.log(`[Track ${this.id}] Re-scheduling ALL tracks from ${currentPlayheadPosition} to ${transportStopTime}.`);
                for (const t of allTracks) {
                    if (typeof t.schedulePlayback === 'function') {
                        await t.schedulePlayback(currentPlayheadPosition, transportStopTime);
                    }
                }

                Tone.Transport.start(Tone.Transport.now() + 0.1, currentPlayheadPosition); // Resume from paused position
                console.log(`[Track ${this.id}] Restarted transport from ${currentPlayheadPosition}s after rescheduling.`);
            }
        } else {
            console.warn(`[Track ${this.id}] Could not find clip ${clipId} to update its position.`);
        }
    }

    dispose() {
        console.log(`[Track ${this.id} Dispose] Starting disposal for track: ${this.name}`);
        // Dispose Tone.Sequence for pattern playback
        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) { this.patternPlayerSequence.stop(); this.patternPlayerSequence.clear(); this.patternPlayerSequence.dispose(); }
        // Dispose instruments
        if (this.instrument && !this.instrument.disposed) { this.instrument.dispose(); }
        if (this.toneSampler && !this.toneSampler.disposed) { this.toneSampler.dispose(); }
        this.disposeSlicerMonoNodes(); // Dispose specific slicer nodes
        this.drumPadPlayers.forEach(player => { if (player && !player.disposed) player.dispose(); });
        // Dispose effects
        this.activeEffects.forEach(effect => { if (effect.toneNode && !effect.toneNode.disposed) effect.toneNode.dispose(); });
        // Dispose core audio nodes
        if (this.gainNode && !this.gainNode.disposed) { this.gainNode.dispose(); }
        if (this.trackMeter && !this.trackMeter.disposed) { this.trackMeter.dispose(); }
        if (this.inputChannel && !this.inputChannel.disposed) { this.inputChannel.dispose(); } // For Audio tracks
        // Stop any active playback related to this track
        this.stopPlayback();

        // Close associated windows
        if (this.appServices.closeAllTrackWindows) {
            console.log(`[Track ${this.id} Dispose] Calling appServices.closeAllTrackWindows for track ID: ${this.id}`);
            this.appServices.closeAllTrackWindows(this.id);
        } else {
            console.warn(`[Track ${this.id} Dispose] appServices.closeAllTrackWindows NOT FOUND.`);
        }

        // Nullify buffer references (Tone.Buffer instances are managed by Tone.js or manually)
        this.audioBuffer = null;
        this.drumSamplerPads.forEach(p => p.audioBuffer = null);
        if (this.instrumentSamplerSettings) this.instrumentSamplerSettings.audioBuffer = null;
        console.log(`[Track ${this.id} Dispose] Finished disposal for track: ${this.name}`);
    }
}

