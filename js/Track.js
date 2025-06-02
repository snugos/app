// js/Track.js - Track Class Module

import * as Constants from './constants.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry, AVAILABLE_EFFECTS } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';


export class Track {
    constructor(id, type, initialData = null, appServices = {}) {
        this.id = initialData?.id || id;
        this.type = type;
        this.appServices = appServices || {}; // Ensure appServices is at least an empty object

        this.name = initialData?.name || `${type} Track ${this.id}`;
        if (type === 'DrumSampler') {
            this.name = initialData?.name || `Sampler (Pads) ${this.id}`;
        } else if (type === 'Synth') {
            this.name = initialData?.name || `MonoSynth ${this.id}`;
        } else if (type === 'Audio') {
            this.name = initialData?.name || `Audio ${this.id}`;
        }
        console.log(`[Track ${this.id} Constructor] Initializing track "${this.name}" of type "${this.type}". InitialData present: ${!!initialData}`);

        this.isMuted = initialData?.isMuted || false;
        this.isMonitoringEnabled = initialData?.isMonitoringEnabled !== undefined ? initialData.isMonitoringEnabled : (this.type === 'Audio');

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
        this.samplerAudioData = {
            fileName: initialData?.samplerAudioData?.fileName || null,
            audioBufferDataURL: initialData?.samplerAudioData?.audioBufferDataURL || null,
            dbKey: initialData?.samplerAudioData?.dbKey || null,
            status: initialData?.samplerAudioData?.status || (initialData?.samplerAudioData?.dbKey || initialData?.samplerAudioData?.audioBufferDataURL ? 'missing' : 'empty')
        };
        this.audioBuffer = null;
        this.slices = initialData?.slices && initialData.slices.length > 0 ?
            JSON.parse(JSON.stringify(initialData.slices)) :
            Array(Constants.numSlices).fill(null).map(() => ({
                offset: 0, duration: 0, userDefined: false, volume: 0.7, pitchShift: 0,
                loop: false, reverse: false,
                envelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 0.2 }
            }));
        this.selectedSliceForEdit = initialData?.selectedSliceForEdit || 0;
        this.waveformZoom = initialData?.waveformZoom || 1;
        this.waveformScrollOffset = initialData?.waveformScrollOffset || 0;
        this.slicerIsPolyphonic = initialData?.slicerIsPolyphonic !== undefined ? initialData.slicerIsPolyphonic : true;
        this.slicerMonoPlayer = null;
        this.slicerMonoEnvelope = null;
        this.slicerMonoGain = null;

        // Instrument Sampler specific
        this.instrumentSamplerSettings = {
            sampleUrl: initialData?.instrumentSamplerSettings?.sampleUrl || null,
            audioBuffer: null,
            audioBufferDataURL: initialData?.instrumentSamplerSettings?.audioBufferDataURL || null,
            originalFileName: initialData?.instrumentSamplerSettings?.originalFileName || null,
            dbKey: initialData?.instrumentSamplerSettings?.dbKey || null,
            rootNote: initialData?.instrumentSamplerSettings?.rootNote || 'C4',
            loop: initialData?.instrumentSamplerSettings?.loop || false,
            loopStart: initialData?.instrumentSamplerSettings?.loopStart || 0,
            loopEnd: initialData?.instrumentSamplerSettings?.loopEnd || 0,
            envelope: initialData?.instrumentSamplerSettings?.envelope ? JSON.parse(JSON.stringify(initialData.instrumentSamplerSettings.envelope)) : { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 },
            status: initialData?.instrumentSamplerSettings?.status || (initialData?.instrumentSamplerSettings?.dbKey || initialData?.instrumentSamplerSettings?.audioBufferDataURL ? 'missing' : 'empty')
        };
        this.instrumentSamplerIsPolyphonic = initialData?.instrumentSamplerIsPolyphonic !== undefined ? initialData.instrumentSamplerIsPolyphonic : true;
        this.toneSampler = null;

        // Drum Sampler specific
        this.drumSamplerPads = Array(Constants.numDrumSamplerPads).fill(null).map((_, padIdx) => {
            const initialPadData = initialData?.drumSamplerPads?.[padIdx];
            return {
                sampleUrl: initialPadData?.sampleUrl || null,
                audioBuffer: null,
                audioBufferDataURL: initialPadData?.audioBufferDataURL || null,
                originalFileName: initialPadData?.originalFileName || null,
                dbKey: initialPadData?.dbKey || null,
                volume: initialPadData?.volume ?? 0.7,
                pitchShift: initialPadData?.pitchShift ?? 0,
                envelope: initialPadData?.envelope ? JSON.parse(JSON.stringify(initialPadData.envelope)) : { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 },
                status: initialPadData?.status || (initialPadData?.dbKey || initialPadData?.audioBufferDataURL ? 'missing' : 'empty')
            };
        });
        this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
        this.drumPadPlayers = Array(Constants.numDrumSamplerPads).fill(null);

        // Effects
        this.activeEffects = [];
        if (initialData && initialData.activeEffects && Array.isArray(initialData.activeEffects)) {
            initialData.activeEffects.forEach(effectData => {
                if (!effectData || !effectData.type) {
                    console.warn(`[Track ${this.id} Constructor] Skipping invalid effectData:`, effectData);
                    return;
                }
                const getDefaults = this.appServices.effectsRegistryAccess?.getEffectDefaultParams || getEffectDefaultParamsFromRegistry;
                const paramsForInstance = effectData.params ? JSON.parse(JSON.stringify(effectData.params)) : (getDefaults ? getDefaults(effectData.type) : {});
                const toneNode = createEffectInstance(effectData.type, paramsForInstance);
                if (toneNode) {
                    this.activeEffects.push({
                        id: effectData.id || `effect-${this.id}-${effectData.type}-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
                        type: effectData.type, toneNode: toneNode, params: paramsForInstance
                    });
                } else {
                    console.warn(`[Track ${this.id} Constructor] Failed to create Tone.js instance for effect type "${effectData.type}".`);
                }
            });
        }

        // Audio Nodes
        this.gainNode = null; this.trackMeter = null; this.outputNode = null;
        this.instrument = null;

        this.sequences = [];
        this.activeSequenceId = null;
        this.timelineClips = initialData?.timelineClips ? JSON.parse(JSON.stringify(initialData.timelineClips)) : [];


        if (this.type !== 'Audio') {
            if (initialData?.sequences && initialData.sequences.length > 0) {
                this.sequences = JSON.parse(JSON.stringify(initialData.sequences));
                this.activeSequenceId = initialData.activeSequenceId || (this.sequences[0] ? this.sequences[0].id : null);
            } else {
                this.createNewSequence("Sequence 1", Constants.defaultStepsPerBar, true);
            }
            delete this.sequenceData; // Old property, remove if exists
            delete this.sequenceLength; // Old property, remove if exists
        } else { // Audio Track specific
            delete this.sequenceData;
            delete this.sequenceLength;
            delete this.sequences;
            delete this.activeSequenceId;

            // Migrate old audioClips structure to timelineClips if necessary
            if (initialData?.audioClips && Array.isArray(initialData.audioClips)) {
                 initialData.audioClips.forEach(ac => {
                    if (!ac || !ac.dbKey) return; // Skip if no dbKey (essential for audio clips)
                    // Check if a similar clip already exists in timelineClips to avoid duplicates during migration
                    const existingClip = this.timelineClips.find(tc => tc.sourceId === ac.dbKey && tc.type === 'audio');
                    if (!existingClip) {
                        this.timelineClips.push({
                            id: ac.id || `audioclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
                            type: 'audio',
                            sourceId: ac.dbKey, // dbKey becomes sourceId
                            startTime: ac.startTime || 0,
                            duration: ac.duration || 0, // Ensure duration is present
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
        this.automation = initialData?.automation ? JSON.parse(JSON.stringify(initialData.automation)) : { volume: [] };
        this.inspectorControls = {}; // To store references to UI controls like knobs

        // Audio Track specific
        this.inputChannel = null; // For direct audio input (e.g., microphone)
        this.clipPlayers = new Map(); // For playing timeline audio clips
    }

    // --- Track Name Management ---
    setName(newName, skipUndo = false) {
        if (typeof newName === 'string' && newName.trim() !== "") {
            const oldName = this.name;
            if (oldName === newName.trim()) return;

            if (!skipUndo && this.appServices.captureStateForUndo) {
                this.appServices.captureStateForUndo(`Rename Track "${oldName}" to "${newName.trim()}"`);
            }
            this.name = newName.trim();
            console.log(`[Track ${this.id}] Renamed from "${oldName}" to "${this.name}"`);

            if (this.appServices.updateTrackUI) {
                this.appServices.updateTrackUI(this.id, 'nameChanged');
            }
        }
    }


    // --- Sequence Management ---
    getActiveSequence() {
        if (this.type === 'Audio' || !this.activeSequenceId || !this.sequences || this.sequences.length === 0) return null;
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
        // MODIFICATION: Change default oscillator type, decay, and sustain
        return {
            portamento: 0.01,
            oscillator: { type: 'sine' },
            envelope: {
                attack: 0.005,
                decay: 2, // Decay "all the way up"
                sustain: 0, // Sustain "all the way down"
                release: 1
            },
            filter: { type: 'lowpass', rolloff: -12, Q: 1, frequency: 1000 },
            filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 2, baseFrequency: 200, octaves: 7, exponent: 2 }
        };
        // END MODIFICATION
    }

    // --- Audio Node Initialization and Chaining ---
    async initializeAudioNodes() {
        console.log(`[Track ${this.id} initializeAudioNodes] Initializing audio nodes for "${this.name}".`);
        try {
            // Dispose existing nodes safely
            if (this.gainNode && !this.gainNode.disposed) try { this.gainNode.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old gainNode:`, e.message)}
            if (this.trackMeter && !this.trackMeter.disposed) try { this.trackMeter.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old trackMeter:`, e.message)}
            if (this.inputChannel && !this.inputChannel.disposed && this.type === 'Audio') { // Specific to Audio tracks
                try { this.inputChannel.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old inputChannel:`, e.message)}
            }

            // Ensure master bus input is available via appServices
            if (!this.appServices.getMasterEffectsBusInputNode) {
                 console.error(`[Track ${this.id} initializeAudioNodes] CRITICAL: getMasterEffectsBusInputNode service not available.`);
                 return; // Cannot proceed without master bus
            }

            this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
            this.outputNode = this.gainNode; // Default output is the gainNode

            if (this.type === 'Audio') {
                this.inputChannel = new Tone.Channel(); // For microphone or line input
                console.log(`[Track ${this.id} initializeAudioNodes] Created inputChannel for Audio track.`);
            }

            this.rebuildEffectChain(); // Connect instruments/sources, effects, and output
            console.log(`[Track ${this.id} initializeAudioNodes] Audio nodes initialized and effect chain rebuilt.`);
        } catch (error) {
            console.error(`[Track ${this.id} initializeAudioNodes] Error during initialization:`, error);
            if (this.appServices.showNotification) {
                this.appServices.showNotification(`Error initializing audio for track ${this.name}: ${error.message}`, 4000);
            }
        }
    }

    rebuildEffectChain() {
        console.log(`[Track ${this.id} rebuildEffectChain] Rebuilding effect chain for "${this.name}". Effects: ${this.activeEffects.length}`);
        if (!this.gainNode || this.gainNode.disposed) {
            console.error(`[Track ${this.id} rebuildEffectChain] CRITICAL: GainNode is not valid. Aborting chain rebuild.`);
            return;
        }
        if (!this.trackMeter || this.trackMeter.disposed) {
            console.warn(`[Track ${this.id} rebuildEffectChain] TrackMeter is not valid, re-creating.`);
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        }

        // Identify primary source nodes for this track type
        let sourceNodes = [];
        if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) sourceNodes.push(this.instrument);
        else if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed) sourceNodes.push(this.toneSampler);
        else if (this.type === 'DrumSampler') {
            this.drumPadPlayers.forEach(player => { if (player && !player.disposed) sourceNodes.push(player); });
        } else if (this.type === 'Sampler' && !this.slicerIsPolyphonic && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
            // For mono slicer, the slicerMonoGain is the output of its internal chain
            sourceNodes.push(this.slicerMonoGain);
        } else if (this.type === 'Audio' && this.inputChannel && !this.inputChannel.disposed) {
            // For Audio tracks, the inputChannel is a primary source (for live input/monitoring)
            // Timeline clips are handled separately during playback scheduling
            sourceNodes.push(this.inputChannel);
        }
        console.log(`[Track ${this.id} rebuildEffectChain] Identified ${sourceNodes.length} primary source nodes.`);

        // Disconnect all managed nodes before rebuilding
        const allManagedNodes = [
            ...sourceNodes,
            ...this.activeEffects.map(e => e.toneNode),
            this.gainNode,
            this.trackMeter
        ].filter(node => node && !node.disposed);

        allManagedNodes.forEach(node => {
            try { node.disconnect(); } catch(e) { console.warn(`[Track ${this.id} rebuildEffectChain] Error during disconnect of node:`, node?.toString(), e.message); }
        });
        console.log(`[Track ${this.id} rebuildEffectChain] All managed nodes disconnected.`);

        // Special handling for mono slicer internal chain
        if (this.type === 'Sampler' && !this.slicerIsPolyphonic && this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed &&
            this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed &&
            this.slicerMonoGain && !this.slicerMonoGain.disposed) {
            try {
                this.slicerMonoPlayer.disconnect(); // Ensure it's clean
                this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
                console.log(`[Track ${this.id} rebuildEffectChain] Chained mono slicer player -> envelope -> gain.`);
            } catch (e) { console.error(`[Track ${this.id} rebuildEffectChain] Error chaining mono slicer components:`, e); }
        }

        // Determine the starting point of the audio chain for effects
        let currentOutputTarget = sourceNodes.length > 0 ? (sourceNodes.length === 1 ? sourceNodes[0] : sourceNodes) : null;

        // For polyphonic Sampler or Audio tracks with clips, effects are connected to gainNode directly
        // or to the first effect if sources (like players) are created dynamically during playback.
        // The rebuildEffectChain sets up the *potential* path. Dynamic sources connect to this path.
        if ((this.type === 'Sampler' && this.slicerIsPolyphonic) || (this.type === 'Audio' && sourceNodes.length === 0 && this.timelineClips.length > 0)) {
            // No persistent source node to connect from initially for polyphonic samplers or clip-based audio tracks.
            // Effects will be connected starting from the track's gainNode or the first effect in the chain.
            // The actual players for slices/clips will connect to the start of this chain.
            currentOutputTarget = null; // Signifies that effects should start a new chain segment if any
            console.log(`[Track ${this.id} rebuildEffectChain] Set currentOutputTarget to null (poly sampler/audio clips). Effects will connect to gainNode or start new chain.`);
        }


        // Connect active effects in order
        this.activeEffects.forEach((effectWrapper, index) => {
            if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
                console.log(`[Track ${this.id} rebuildEffectChain] Processing effect ${index}: ${effectWrapper.type}`);
                if (currentOutputTarget) {
                    if (Array.isArray(currentOutputTarget)) { // Multiple sources (e.g., drum pads)
                        currentOutputTarget.forEach(outNode => {
                            if (outNode && !outNode.disposed) try { outNode.connect(effectWrapper.toneNode); } catch(e){ console.error(`[Track ${this.id}] Error connecting array source to effect ${effectWrapper.type}:`, e); }
                        });
                    } else { // Single source
                        try { currentOutputTarget.connect(effectWrapper.toneNode); } catch(e){ console.error(`[Track ${this.id}] Error connecting single source to effect ${effectWrapper.type}:`, e); }
                    }
                } else {
                    // This effect becomes the start of a new chain segment (e.g. for poly sampler)
                    // The actual players will connect to this effect's input.
                    console.log(`[Track ${this.id} rebuildEffectChain] Effect ${effectWrapper.type} is the new start of a chain segment.`);
                }
                currentOutputTarget = effectWrapper.toneNode; // Update target for next connection
            } else {
                console.warn(`[Track ${this.id} rebuildEffectChain] Effect ${effectWrapper.type} (ID: ${effectWrapper.id}) node is invalid or disposed.`);
            }
        });

        // Connect the end of the effect chain (or source if no effects) to the track's gainNode
        if (currentOutputTarget) {
            if (Array.isArray(currentOutputTarget)) { // Multiple sources (drum pads) after effects
                currentOutputTarget.forEach(outNode => {
                    if (outNode && !outNode.disposed) try { outNode.connect(this.gainNode); } catch (e) { console.error(`[Track ${this.id}] Error connecting array effect output to gainNode:`, e); }
                });
            } else { // Single source after effects
                try { currentOutputTarget.connect(this.gainNode); } catch (e) { console.error(`[Track ${this.id}] Error connecting single effect output to gainNode:`, e); }
            }
            console.log(`[Track ${this.id} rebuildEffectChain] Connected effect chain output to gainNode.`);
        } else {
            // No currentOutputTarget means either no source nodes or polyphonic sampler/audio track with no effects yet.
            // For Audio tracks, the inputChannel (if it exists and is a sourceNode) should connect directly if no effects.
            if (this.type === 'Audio' && this.inputChannel && !this.inputChannel.disposed) {
                try { this.inputChannel.connect(this.gainNode); console.log(`[Track ${this.id} rebuildEffectChain] Audio inputChannel connected directly to gainNode.`); }
                catch(e) { console.error(`[Track ${this.id}] Error connecting inputChannel to gainNode:`, e); }
            } else {
                console.log(`[Track ${this.id} rebuildEffectChain] No persistent currentOutputTarget for gainNode (e.g., poly sampler without effects, or empty audio track). Dynamic sources will connect appropriately.`);
            }
        }

        // Connect gainNode to trackMeter
        if (this.gainNode && !this.gainNode.disposed && this.trackMeter && !this.trackMeter.disposed) {
            try { this.gainNode.connect(this.trackMeter); console.log(`[Track ${this.id} rebuildEffectChain] Connected gainNode to trackMeter.`); }
            catch (e) { console.error(`[Track ${this.id}] Error connecting gainNode to trackMeter:`, e); }
        }

        // Connect the final output of the track (meter or gainNode) to the master bus input
        const masterBusInput = this.appServices.getMasterEffectsBusInputNode ? this.appServices.getMasterEffectsBusInputNode() : null;
        const finalTrackOutput = (this.trackMeter && !this.trackMeter.disposed) ? this.trackMeter : this.gainNode; // Prefer meter if available

        if (finalTrackOutput && !finalTrackOutput.disposed && masterBusInput && !masterBusInput.disposed) {
            try { finalTrackOutput.connect(masterBusInput); console.log(`[Track ${this.id} rebuildEffectChain] Connected final track output to masterBusInput.`); }
            catch (e) { console.error(`[Track ${this.id}] Error connecting final output to masterBusInput:`, e); }
        } else if (finalTrackOutput && !finalTrackOutput.disposed) {
            // Fallback if master bus input is somehow not available
            console.warn(`[Track ${this.id} rebuildEffectChain] Master effects bus input not available. Connecting directly to destination as fallback.`);
            try { finalTrackOutput.toDestination(); } catch (e) { console.error(`[Track ${this.id}] Error connecting final output to destination:`, e); }
        } else {
            console.error(`[Track ${this.id} rebuildEffectChain] CRITICAL: Final track output node is invalid or master bus is unavailable. No output connection made.`);
        }

        this.applyMuteState(); // Ensure mute/solo states are correctly applied
        this.applySoloState();
        console.log(`[Track ${this.id} rebuildEffectChain] Mute/Solo states applied. Chain rebuild finished for "${this.name}".`);
    }


    addEffect(effectType) {
        if (!this.appServices.effectsRegistryAccess) {
            console.error(`[Track ${this.id}] effectsRegistryAccess not available via appServices.`);
            if (this.appServices.showNotification) this.appServices.showNotification("Cannot add effect: Effects registry missing.", 3000);
            return;
        }
        const AVAILABLE_EFFECTS_LOCAL = this.appServices.effectsRegistryAccess.AVAILABLE_EFFECTS;
        const getEffectDefaultParamsLocal = this.appServices.effectsRegistryAccess.getEffectDefaultParams;

        if (!AVAILABLE_EFFECTS_LOCAL || !AVAILABLE_EFFECTS_LOCAL[effectType]) {
            console.warn(`[Track ${this.id}] Effect type "${effectType}" not found in registry.`);
            if (this.appServices.showNotification) this.appServices.showNotification(`Effect type "${effectType}" not found.`, 3000);
            return;
        }
        const defaultParams = getEffectDefaultParamsLocal ? getEffectDefaultParamsLocal(effectType) : getEffectDefaultParamsFromRegistry(effectType); // Fallback if service method not there
        const toneNode = createEffectInstance(effectType, defaultParams);

        if (toneNode) {
            const effectId = `effect-${this.id}-${effectType}-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
            this.activeEffects.push({
                id: effectId, type: effectType, toneNode: toneNode, params: JSON.parse(JSON.stringify(defaultParams))
            });
            this.rebuildEffectChain();
            if (this.appServices.updateTrackUI) {
                this.appServices.updateTrackUI(this.id, 'effectsListChanged');
            }
            console.log(`[Track ${this.id}] Added effect "${effectType}".`);
        } else {
            console.warn(`[Track ${this.id}] Could not create Tone.js instance for effect ${effectType}`);
            if (this.appServices.showNotification) this.appServices.showNotification(`Could not create effect: ${effectType}`, 3000);
        }
    }

    removeEffect(effectId) {
        const effectIndex = this.activeEffects.findIndex(e => e.id === effectId);
        if (effectIndex > -1) {
            const effectToRemove = this.activeEffects[effectIndex];
            console.log(`[Track ${this.id}] Removing effect "${effectToRemove.type}" (ID: ${effectId})`);
            if (effectToRemove.toneNode && !effectToRemove.toneNode.disposed) {
                try {
                    effectToRemove.toneNode.dispose();
                } catch (e) {
                    console.warn(`[Track ${this.id}] Error disposing effect node during removal:`, e.message);
                }
            }
            this.activeEffects.splice(effectIndex, 1);
            this.rebuildEffectChain();
            if (this.appServices.updateTrackUI) {
                this.appServices.updateTrackUI(this.id, 'effectsListChanged');
            }
        } else {
            console.warn(`[Track ${this.id}] Effect with ID ${effectId} not found for removal.`);
        }
    }

    updateEffectParam(effectId, paramPath, value) {
        const effectWrapper = this.activeEffects.find(e => e.id === effectId);
        if (!effectWrapper) {
            console.warn(`[Track ${this.id}] Effect ${effectId} not found for param update.`);
            return;
        }
        if (!effectWrapper.toneNode || effectWrapper.toneNode.disposed) {
            console.warn(`[Track ${this.id}] ToneNode for effect ${effectId} ("${effectWrapper.type}") is invalid or disposed.`);
            return;
        }

        // Update the stored parameters in the track's state
        try {
            const keys = paramPath.split('.');
            let currentStoredParamLevel = effectWrapper.params;
            for (let i = 0; i < keys.length - 1; i++) {
                currentStoredParamLevel[keys[i]] = currentStoredParamLevel[keys[i]] || {};
                currentStoredParamLevel = currentStoredParamLevel[keys[i]];
            }
            currentStoredParamLevel[keys[keys.length - 1]] = value;
        } catch (e) {
            console.error(`[Track ${this.id}] Error updating stored param "${paramPath}" for effect "${effectWrapper.type}":`, e);
        }

        // Update the actual Tone.js node parameter
        try {
            const keys = paramPath.split('.');
            let targetObject = effectWrapper.toneNode;
            for (let i = 0; i < keys.length - 1; i++) {
                if (targetObject && typeof targetObject[keys[i]] !== 'undefined') {
                    targetObject = targetObject[keys[i]];
                } else {
                    throw new Error(`Nested object for path "${keys.slice(0, i + 1).join('.')}" not found on Tone node for effect "${effectWrapper.type}".`);
                }
            }
            const finalParamKey = keys[keys.length - 1];
            const paramInstance = targetObject[finalParamKey];

            if (typeof paramInstance !== 'undefined') {
                if (paramInstance && typeof paramInstance.value !== 'undefined' && typeof paramInstance.rampTo === 'function') { // It's a Tone.Param or Signal
                    paramInstance.rampTo(value, 0.02); // Smooth ramp
                } else if (paramInstance && typeof paramInstance.value !== 'undefined') { // Direct value assignment for Tone.Param without rampTo or basic Signal
                     paramInstance.value = value;
                } else { // Direct property like 'type' or 'oversample'
                    targetObject[finalParamKey] = value;
                }
            } else if (typeof targetObject.set === 'function' && keys.length > 0) { // Fallback for objects that use .set() like some oscillators
                const setObj = {};
                let currentLevelForSet = setObj;
                keys.forEach((k, idx) => {
                    if (idx === keys.length -1) currentLevelForSet[k] = value;
                    else { currentLevelForSet[k] = {}; currentLevelForSet = currentLevelForSet[k];}
                });
                targetObject.set(setObj);
            } else {
                 console.warn(`[Track ${this.id}] Could not set parameter "${paramPath}" on effect "${effectWrapper.type}". Parameter instance or .set() method not found on target:`, targetObject);
            }
        } catch (err) {
            console.error(`[Track ${this.id}] Error updating Tone param "${paramPath}" for effect "${effectWrapper.type}":`, err, "Value:", value);
        }
    }

    reorderEffect(effectId, newIndex) {
        const oldIndex = this.activeEffects.findIndex(e => e.id === effectId);
        if (oldIndex === -1) {
            console.warn(`[Track ${this.id}] Effect ID ${effectId} not found for reordering.`);
            return;
        }

        newIndex = Math.max(0, Math.min(newIndex, this.activeEffects.length - 1));
        if (oldIndex === newIndex) return; // No change

        console.log(`[Track ${this.id}] Reordering effect ${effectId} from index ${oldIndex} to ${newIndex}.`);
        const [effectToMove] = this.activeEffects.splice(oldIndex, 1);
        this.activeEffects.splice(newIndex, 0, effectToMove);
        this.rebuildEffectChain();

        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'effectsListChanged');
        }
    }

    // --- Audio Resource Initialization (Samples, Instruments) ---
    async fullyInitializeAudioResources() {
        console.log(`[Track ${this.id} fullyInitializeAudioResources] Initializing audio resources for "${this.name}" (type: ${this.type})`);
        if (!this.gainNode || this.gainNode.disposed) {
            console.warn(`[Track ${this.id} fullyInitializeAudioResources] GainNode missing or disposed. Attempting to re-initialize audio nodes first.`);
            await this.initializeAudioNodes(); // Ensure base audio path is ready
            if (!this.gainNode || this.gainNode.disposed) { // Check again
                console.error(`[Track ${this.id} fullyInitializeAudioResources] CRITICAL: GainNode still invalid after re-initialization. Aborting resource load.`);
                return;
            }
        }

        try {
            if (this.type === 'Synth') {
                await this.initializeInstrument(); // Initializes Tone.MonoSynth
            } else if (this.type === 'Sampler') {
                if (this.samplerAudioData && (this.samplerAudioData.dbKey || this.samplerAudioData.audioBufferDataURL)) {
                    console.log(`[Track ${this.id} Sampler] Attempting to load sample: ${this.samplerAudioData.fileName || this.samplerAudioData.dbKey}`);
                    let audioFileBlob;
                    if (this.samplerAudioData.dbKey) {
                        try {
                            audioFileBlob = await getAudio(this.samplerAudioData.dbKey);
                            if (!audioFileBlob) {
                                console.warn(`[Track ${this.id} Sampler] Sample not found in DB for key: ${this.samplerAudioData.dbKey}. Filename: ${this.samplerAudioData.fileName}`);
                                this.samplerAudioData.status = 'missing_db';
                            }
                        } catch (err) {
                            console.error(`[Track ${this.id} Sampler] Error getting audio from DB for key ${this.samplerAudioData.dbKey}:`, err);
                            this.samplerAudioData.status = 'error';
                            if (this.appServices.showNotification) this.appServices.showNotification(`Error loading sample ${this.samplerAudioData.fileName || 'from database'}.`, 3000);
                        }
                    } else if (this.samplerAudioData.audioBufferDataURL) { // Fallback for older projects or direct loads
                        try {
                            const response = await fetch(this.samplerAudioData.audioBufferDataURL);
                            if (!response.ok) throw new Error(`Failed to fetch data URL for ${this.samplerAudioData.fileName}`);
                            audioFileBlob = await response.blob();
                        } catch (fetchErr) {
                            console.error(`[Track ${this.id} Sampler] Error fetching audio from data URL for ${this.samplerAudioData.fileName}:`, fetchErr);
                            this.samplerAudioData.status = 'error';
                            if (this.appServices.showNotification) this.appServices.showNotification(`Error loading sample ${this.samplerAudioData.fileName || 'from data URL'}.`, 3000);
                        }
                    }

                    if (audioFileBlob) {
                        const objectURL = URL.createObjectURL(audioFileBlob);
                        try {
                            if (this.audioBuffer && !this.audioBuffer.disposed) try {this.audioBuffer.dispose();} catch(e){console.warn("Err disposing old audioBuffer",e)}
                            this.disposeSlicerMonoNodes(); // Clean up mono nodes before setting new buffer
                            this.audioBuffer = await new Tone.Buffer().load(objectURL);
                            this.samplerAudioData.status = 'loaded';
                            console.log(`[Track ${this.id} Sampler] Sample "${this.samplerAudioData.fileName}" loaded into Tone.Buffer. Duration: ${this.audioBuffer.duration}`);
                            if (!this.slicerIsPolyphonic) this.setupSlicerMonoNodes(); // Re-setup if in mono mode
                            // Auto-slice if needed
                            if (this.appServices.autoSliceSample && this.audioBuffer.loaded && this.slices.every(s => s.duration === 0)) {
                                this.appServices.autoSliceSample(this.id);
                            }
                        } catch (toneLoadErr) {
                            console.error(`[Track ${this.id} Sampler] Tone.Buffer load error for ${this.samplerAudioData.fileName}:`, toneLoadErr);
                            this.samplerAudioData.status = 'error';
                            if (this.appServices.showNotification) this.appServices.showNotification(`Error processing sample ${this.samplerAudioData.fileName}. It might be corrupted or an unsupported format.`, 4000);
                        } finally {
                            URL.revokeObjectURL(objectURL);
                        }
                    } else if (this.samplerAudioData.status !== 'error' && this.samplerAudioData.status !== 'missing_db') {
                        // If no blob and not already an error, mark as missing or empty
                        this.samplerAudioData.status = (this.samplerAudioData.dbKey || this.samplerAudioData.audioBufferDataURL) ? 'missing' : 'empty';
                        console.warn(`[Track ${this.id} Sampler] Audio file blob was null for ${this.samplerAudioData.fileName}, status set to ${this.samplerAudioData.status}`);
                    }
                }
            } else if (this.type === 'DrumSampler') {
                for (let i = 0; i < this.drumSamplerPads.length; i++) {
                    const pad = this.drumSamplerPads[i];
                    if (!pad) continue; // Should not happen with current initialization
                    if (pad.dbKey || pad.audioBufferDataURL) {
                        console.log(`[Track ${this.id} DrumSampler] Pad ${i}: Attempting to load sample: ${pad.originalFileName || pad.dbKey}`);
                        let audioFileBlob;
                        try {
                            if (pad.dbKey) {
                                audioFileBlob = await getAudio(pad.dbKey).catch(err => {
                                    console.error(`[Track ${this.id} DrumSampler] Pad ${i}: Error getting from DB (key ${pad.dbKey}):`, err);
                                    pad.status = 'error'; return null;
                                });
                                if (!audioFileBlob) pad.status = 'missing_db';
                            } else if (pad.audioBufferDataURL) {
                                const response = await fetch(pad.audioBufferDataURL).catch(err => {pad.status = 'error'; throw err;});
                                if (!response.ok) throw new Error(`Fetch failed for pad ${i}`);
                                audioFileBlob = await response.blob();
                            }

                            if (audioFileBlob) {
                                const objectURL = URL.createObjectURL(audioFileBlob);
                                try {
                                    if (pad.audioBuffer && !pad.audioBuffer.disposed) try {pad.audioBuffer.dispose();} catch(e){console.warn("Err disposing old pad audioBuffer",e)}
                                    pad.audioBuffer = await new Tone.Buffer().load(objectURL);
                                    if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) try {this.drumPadPlayers[i].dispose();}catch(e){console.warn("Err disposing old player",e)}
                                    this.drumPadPlayers[i] = new Tone.Player(pad.audioBuffer);
                                    pad.status = 'loaded';
                                    console.log(`[Track ${this.id} DrumSampler] Pad ${i}: Sample "${pad.originalFileName}" loaded. Duration: ${pad.audioBuffer.duration}`);
                                } catch (toneLoadErr) {
                                    console.error(`[Track ${this.id} DrumSampler] Pad ${i}: Tone.Buffer error (${pad.originalFileName}):`, toneLoadErr);
                                    pad.status = 'error';
                                } finally {
                                    URL.revokeObjectURL(objectURL);
                                }
                            } else if (pad.status !== 'error' && pad.status !== 'missing_db') {
                                pad.status = (pad.dbKey || pad.audioBufferDataURL) ? 'missing' : 'empty';
                            }
                        } catch (loadErr) {
                             console.error(`[Track ${this.id} DrumSampler] Pad ${i}: General load error (${pad.originalFileName}):`, loadErr);
                             pad.status = 'error'; // Ensure status is error on any catch
                        }
                    }
                }
            } else if (this.type === 'InstrumentSampler') {
                if (this.instrumentSamplerSettings.dbKey || this.instrumentSamplerSettings.audioBufferDataURL) {
                    console.log(`[Track ${this.id} InstrumentSampler] Attempting to load sample: ${this.instrumentSamplerSettings.originalFileName || this.instrumentSamplerSettings.dbKey}`);
                    let audioFileBlob;
                    try {
                        if (this.instrumentSamplerSettings.dbKey) {
                           audioFileBlob = await getAudio(this.instrumentSamplerSettings.dbKey).catch(err => {
                                console.error(`[Track ${this.id} InstrumentSampler] Error getting from DB (key ${this.instrumentSamplerSettings.dbKey}):`, err);
                                this.instrumentSamplerSettings.status = 'error'; return null;
                           });
                           if (!audioFileBlob) this.instrumentSamplerSettings.status = 'missing_db';
                        } else if (this.instrumentSamplerSettings.audioBufferDataURL) {
                            const response = await fetch(this.instrumentSamplerSettings.audioBufferDataURL).catch(err => {this.instrumentSamplerSettings.status = 'error'; throw err;});
                            if (!response.ok) throw new Error(`Fetch failed for instrument sampler`);
                            audioFileBlob = await response.blob();
                        }
                        if (audioFileBlob) {
                            const objectURL = URL.createObjectURL(audioFileBlob);
                            try {
                                if (this.instrumentSamplerSettings.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) try {this.instrumentSamplerSettings.audioBuffer.dispose();}catch(e){console.warn("Err disposing old IS audioBuffer",e)}
                                this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(objectURL);
                                this.instrumentSamplerSettings.status = 'loaded';
                                console.log(`[Track ${this.id} InstrumentSampler] Sample loaded. Duration: ${this.instrumentSamplerSettings.audioBuffer.duration}`);
                            } catch (toneLoadErr) {
                                console.error(`[Track ${this.id} InstrumentSampler] Tone.Buffer load error:`, toneLoadErr);
                                this.instrumentSamplerSettings.status = 'error';
                            } finally {
                                URL.revokeObjectURL(objectURL);
                            }
                        } else if(this.instrumentSamplerSettings.status !== 'error' && this.instrumentSamplerSettings.status !== 'missing_db') {
                            this.instrumentSamplerSettings.status = (this.instrumentSamplerSettings.dbKey || this.instrumentSamplerSettings.audioBufferDataURL) ? 'missing' : 'empty';
                        }
                    } catch (loadErr) {
                        console.error(`[Track ${this.id} InstrumentSampler] General load error:`, loadErr);
                        this.instrumentSamplerSettings.status = 'error';
                    }
                }
                this.setupToneSampler(); // Re-initialize Tone.Sampler with the new buffer (or lack thereof)
            }

            // For Audio tracks, verify clips and get durations if needed
            if (this.type === 'Audio') {
                 if ((!this.inputChannel || this.inputChannel.disposed)) { // Ensure inputChannel is ready if it got disposed
                    console.log(`[Track ${this.id} fullyInitializeAudioResources] Re-initializing audio nodes for Audio track as inputChannel was invalid.`);
                    await this.initializeAudioNodes();
                 }
                 for (const clip of this.timelineClips) {
                     if (clip.type === 'audio' && clip.sourceId && (!clip.audioBuffer || clip.audioBuffer.disposed)) { // audioBuffer on clip is for metadata, not Tone.Buffer
                         try {
                             const audioBlob = await getAudio(clip.sourceId);
                             if (audioBlob) {
                                 const url = URL.createObjectURL(audioBlob); // Create URL to get duration
                                 console.log(`[Track ${this.id} Audio] Verified audio clip source ${clip.sourceId} (${clip.name}) from DB.`);
                                 URL.revokeObjectURL(url); // Clean up immediately, not needed for playback here
                                 // If duration was 0 (e.g., from old project format or initial recording), try to get it
                                 if (clip.duration === 0) { 
                                     clip.duration = await this.getBlobDuration(audioBlob);
                                 }
                             } else {
                                 console.warn(`[Track ${this.id} Audio] Audio data for clip ${clip.id} (source: ${clip.sourceId}) not found in DB.`);
                                 if (this.appServices.showNotification) this.appServices.showNotification(`Audio for clip "${clip.name}" is missing.`, 3000);
                             }
                         } catch (err) {
                             console.error(`[Track ${this.id} Audio] Error loading audio for clip ${clip.id} (source: ${clip.sourceId}):`, err);
                         }
                     }
                 }
            }

        } catch (error) {
            console.error(`[Track ${this.id} fullyInitializeAudioResources] Overall error for "${this.name}" (type ${this.type}):`, error);
            if (this.appServices.showNotification) this.appServices.showNotification(`Major error loading audio resources for ${this.name}. Check console.`, 4000);
            if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sampleLoadError'); // Generic error update
        }

        // Recreate Tone.Sequence if applicable (not for Audio tracks)
        if (this.type !== 'Audio') {
            this.recreateToneSequence(true); // forceRestart = true
        }
        this.rebuildEffectChain(); // Ensure chain is up-to-date after all resources are potentially loaded
        console.log(`[Track ${this.id} fullyInitializeAudioResources] Finished for "${this.name}".`);
    }


    async initializeInstrument() { // Specific to Synth type
        if (this.type === 'Synth') {
            console.log(`[Track ${this.id} initializeInstrument] Initializing synth instrument (type: ${this.synthEngineType}).`);
            if (this.instrument && !this.instrument.disposed) {
                try { this.instrument.dispose(); } catch(e) { console.warn(`[Track ${this.id}] Error disposing old synth instrument:`, e.message); }
            }
            try {
                // Assuming MonoSynth is the primary type for now, could be extended for PolySynth etc.
                this.instrument = new Tone.MonoSynth(this.synthParams);
                console.log(`[Track ${this.id} initializeInstrument] MonoSynth initialized with params:`, JSON.parse(JSON.stringify(this.synthParams)));
            } catch (error) {
                console.error(`[Track ${this.id} initializeInstrument] Error creating MonoSynth:`, error);
                if (this.appServices.showNotification) this.appServices.showNotification(`Error creating synth for track ${this.name}.`, 3000);
                this.instrument = null; // Ensure instrument is null on failure
            }
        }
    }

    // --- Sampler Specific (Slicer) ---
    setupSlicerMonoNodes() {
        this.disposeSlicerMonoNodes(); // Clear existing before setup
        if (this.type === 'Sampler' && !this.slicerIsPolyphonic) {
            try {
                this.slicerMonoPlayer = new Tone.Player();
                this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
                this.slicerMonoGain = new Tone.Gain();
                // Chain them: Player -> Envelope -> Gain
                this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
                // Assign buffer if loaded
                if (this.audioBuffer && this.audioBuffer.loaded) {
                    this.slicerMonoPlayer.buffer = this.audioBuffer;
                }
                console.log(`[Track ${this.id} setupSlicerMonoNodes] Mono slicer nodes created.`);
            } catch (error) {
                console.error(`[Track ${this.id} setupSlicerMonoNodes] Error creating mono slicer nodes:`, error);
            }
        }
    }
    disposeSlicerMonoNodes() {
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) { try { this.slicerMonoPlayer.dispose(); } catch(e){console.warn("Err disposing slicerMonoPlayer", e)} }
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) { try { this.slicerMonoEnvelope.dispose(); } catch(e){console.warn("Err disposing slicerMonoEnvelope", e)} }
        if (this.slicerMonoGain && !this.slicerMonoGain.disposed) { try { this.slicerMonoGain.dispose(); } catch(e){console.warn("Err disposing slicerMonoGain", e)} }
        this.slicerMonoPlayer = null; this.slicerMonoEnvelope = null; this.slicerMonoGain = null;
    }

    // --- Instrument Sampler Specific ---
    setupToneSampler() { // Specific to InstrumentSampler type
        if (this.type === 'InstrumentSampler') {
            console.log(`[Track ${this.id} setupToneSampler] Setting up Tone.Sampler.`);
            if (this.toneSampler && !this.toneSampler.disposed) {
                try { this.toneSampler.dispose(); } catch(e){ console.warn(`[Track ${this.id}] Error disposing old Tone.Sampler:`, e.message); }
            }
            this.toneSampler = null; // Clear previous instance

            if (this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
                const urls = {};
                const rootNote = this.instrumentSamplerSettings.rootNote || 'C4';
                urls[rootNote] = this.instrumentSamplerSettings.audioBuffer; // Use the loaded Tone.Buffer directly
                try {
                    this.toneSampler = new Tone.Sampler({
                        urls: urls,
                        attack: this.instrumentSamplerSettings.envelope.attack,
                        release: this.instrumentSamplerSettings.envelope.release,
                        baseUrl: '', // Not needed as we provide Tone.Buffer
                        onload: () => {
                            if (this.toneSampler && !this.toneSampler.disposed) { // Check again after onload
                                this.toneSampler.loop = this.instrumentSamplerSettings.loop;
                                this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart;
                                this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd;
                                console.log(`[Track ${this.id} setupToneSampler] Tone.Sampler loaded and configured. Root: ${rootNote}, Loop: ${this.toneSampler.loop}`);
                            }
                        },
                        onerror: (err) => {
                             console.error(`[Track ${this.id} setupToneSampler] Tone.Sampler onerror:`, err);
                             if (this.appServices.showNotification) this.appServices.showNotification(`Error in instrument sampler for ${this.name}.`, 3000);
                        }
                    });
                } catch (e) {
                    console.error(`[Track ${this.id} setupToneSampler] Error creating Tone.Sampler:`, e);
                    if (this.appServices.showNotification) this.appServices.showNotification(`Error creating instrument sampler for ${this.name}.`, 3000);
                }
            } else {
                 console.warn(`[Track ${this.id} setupToneSampler] AudioBuffer for instrument sampler not loaded. Tone.Sampler not created.`);
            }
        }
    }

    // --- Volume, Mute, Solo ---
    setVolume(volume, fromInteraction = false) { // fromInteraction for undo state
        this.previousVolumeBeforeMute = Math.max(0, Math.min(parseFloat(volume) || 0, 1.5)); // Allow some boost
        if (this.gainNode && !this.gainNode.disposed && !this.isMuted) {
            try {
                this.gainNode.gain.setValueAtTime(this.previousVolumeBeforeMute, Tone.now());
            } catch (e) { console.error(`[Track ${this.id}] Error setting gainNode volume:`, e); }
        }
    }

    applyMuteState() {
        if (this.gainNode && !this.gainNode.disposed) {
            const currentSoloedId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
            const isEffectivelyMuted = this.isMuted || (currentSoloedId !== null && currentSoloedId !== this.id);
            const targetVolume = isEffectivelyMuted ? 0 : this.previousVolumeBeforeMute;
            try {
                this.gainNode.gain.cancelScheduledValues(Tone.now());
                this.gainNode.gain.rampTo(targetVolume, 0.01); // Quick ramp to avoid clicks
            } catch (e) { console.error(`[Track ${this.id}] Error applying mute state to gainNode:`, e); }
        } else {
            console.warn(`[Track ${this.id} applyMuteState] GainNode not available or disposed.`);
        }
    }

    applySoloState() {
        // Solo logic primarily affects mute state of other tracks, handled globally.
        // This ensures this track's volume is correct based on its own mute and global solo state.
        this.applyMuteState();
    }

    // --- Parameter Setting ---
    setSynthParam(paramPath, value) {
        if (this.type !== 'Synth') return;
        if (!this.instrument || this.instrument.disposed) {
            console.warn(`[Track ${this.id} setSynthParam] Synth instrument not available or disposed for param "${paramPath}".`);
            return;
        }
        try {
            const keys = paramPath.split('.');
            let target = this.instrument;
            let paramsTarget = this.synthParams; // For storing the new value

            // Traverse to the target object and params object
            for (let i = 0; i < keys.length - 1; i++) {
                if (target && typeof target[keys[i]] !== 'undefined') {
                    target = target[keys[i]];
                } else {
                    console.warn(`[Track ${this.id} setSynthParam] Path part "${keys[i]}" not found on Tone instrument for "${paramPath}".`);
                    return; // Path does not exist on Tone object
                }
                paramsTarget[keys[i]] = paramsTarget[keys[i]] || {}; // Ensure nested objects exist in synthParams
                paramsTarget = paramsTarget[keys[i]];
            }
            const finalKey = keys[keys.length - 1];

            // Store the new value
            paramsTarget[finalKey] = value;

            // Apply to Tone.js object
            if (target && typeof target[finalKey] !== 'undefined') {
                if (target[finalKey] && typeof target[finalKey].setValueAtTime === 'function') { // It's a Tone.Param
                    target[finalKey].setValueAtTime(value, Tone.now());
                } else if (target[finalKey] && typeof target[finalKey].value !== 'undefined') { // It's a Signal or similar
                     target[finalKey].value = value;
                } else { // Direct property
                    target[finalKey] = value;
                }
            } else if (target && typeof target.set === 'function') { // Fallback for objects like oscillator.type
                const setObj = {};
                let currentLevel = setObj;
                keys.forEach((k, idx) => {
                    if (idx === keys.length -1) currentLevel[k] = value;
                    else { currentLevel[k] = {}; currentLevel = currentLevel[k];}
                });
                target.set(setObj);
            } else {
                 console.warn(`[Track ${this.id} setSynthParam] Could not set param "${finalKey}" on Tone instrument target for path "${paramPath}". Target:`, target);
            }
        } catch (e) {
            console.error(`[Track ${this.id} setSynthParam] Error setting synth param "${paramPath}" to ${value}:`, e);
        }
    }

    setSliceVolume(sliceIndex, volume) {
        if (this.slices && this.slices[sliceIndex]) this.slices[sliceIndex].volume = parseFloat(volume);
    }
    setSlicePitchShift(sliceIndex, semitones) {
        if (this.slices && this.slices[sliceIndex]) this.slices[sliceIndex].pitchShift = parseInt(semitones);
    }
    setSliceLoop(sliceIndex, loop) {
        if (this.slices && this.slices[sliceIndex]) this.slices[sliceIndex].loop = !!loop;
    }
    setSliceReverse(sliceIndex, reverse) {
        if (this.slices && this.slices[sliceIndex]) this.slices[sliceIndex].reverse = !!reverse;
    }
    setSliceEnvelopeParam(sliceIndex, param, value) {
        if (this.slices && this.slices[sliceIndex] && this.slices[sliceIndex].envelope) {
            this.slices[sliceIndex].envelope[param] = parseFloat(value);
        }
    }

    setDrumSamplerPadVolume(padIndex, volume) {
        if (this.drumSamplerPads && this.drumSamplerPads[padIndex]) this.drumSamplerPads[padIndex].volume = parseFloat(volume);
    }
    setDrumSamplerPadPitch(padIndex, pitch) {
        if (this.drumSamplerPads && this.drumSamplerPads[padIndex]) this.drumSamplerPads[padIndex].pitchShift = parseInt(pitch);
    }
    setDrumSamplerPadEnv(padIndex, param, value) {
        if (this.drumSamplerPads && this.drumSamplerPads[padIndex] && this.drumSamplerPads[padIndex].envelope) {
            this.drumSamplerPads[padIndex].envelope[param] = parseFloat(value);
        }
    }

    setInstrumentSamplerRootNote(noteName) {
        if (this.instrumentSamplerSettings) {
            this.instrumentSamplerSettings.rootNote = noteName;
            this.setupToneSampler(); // Re-initialize Tone.Sampler with new root note
        }
    }
    setInstrumentSamplerLoop(loop) {
        if (this.instrumentSamplerSettings) {
            this.instrumentSamplerSettings.loop = !!loop;
            if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.loop = this.instrumentSamplerSettings.loop;
        }
    }
    setInstrumentSamplerLoopStart(time) {
        if (this.instrumentSamplerSettings) {
            this.instrumentSamplerSettings.loopStart = parseFloat(time) || 0;
            if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart;
        }
    }
    setInstrumentSamplerLoopEnd(time) {
        if (this.instrumentSamplerSettings) {
            this.instrumentSamplerSettings.loopEnd = parseFloat(time) || 0;
            if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd;
        }
    }
    setInstrumentSamplerEnv(param, value) {
        if (this.instrumentSamplerSettings && this.instrumentSamplerSettings.envelope) {
            this.instrumentSamplerSettings.envelope[param] = parseFloat(value);
            // Update Tone.Sampler envelope params if they exist directly
            if (this.toneSampler && !this.toneSampler.disposed) {
                if (param === 'attack' && typeof this.toneSampler.attack !== 'undefined') this.toneSampler.attack = value;
                if (param === 'release' && typeof this.toneSampler.release !== 'undefined') this.toneSampler.release = value;
                // Note: Tone.Sampler doesn't have direct decay/sustain params like Tone.Envelope
            }
        }
    }

    _captureUndoState(description) {
        if (this.appServices.captureStateForUndo) {
            this.appServices.captureStateForUndo(description);
        } else {
            console.warn(`[Track ${this.id}] captureStateForUndo service not available.`);
        }
    }

    // --- Sequence and Timeline Clip Management ---
    createNewSequence(name = `Sequence ${this.sequences.length + 1}`, initialLengthSteps = Constants.defaultStepsPerBar, skipUndo = false) {
        if (this.type === 'Audio') return null; // Audio tracks don't use these sequences
        const newSeqId = `seq_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        let numRowsForGrid;

        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRowsForGrid = Constants.synthPitches.length;
        else if (this.type === 'Sampler') numRowsForGrid = (this.slices && this.slices.length > 0) ? this.slices.length : Constants.numSlices;
        else if (this.type === 'DrumSampler') numRowsForGrid = Constants.numDrumSamplerPads;
        else numRowsForGrid = 1; // Fallback, should not happen for known types

        if (numRowsForGrid <= 0) { // Safety check
             console.warn(`[Track ${this.id} createNewSequence] numRowsForGrid was <= 0 for type ${this.type} (calculated ${numRowsForGrid}), defaulting to 1.`);
             numRowsForGrid = 1;
        }
        const actualLength = Math.max(Constants.STEPS_PER_BAR, initialLengthSteps); // Ensure at least one bar

        const newSequence = {
            id: newSeqId,
            name: name,
            data: Array(numRowsForGrid).fill(null).map(() => Array(actualLength).fill(null)),
            length: actualLength
        };
        this.sequences.push(newSequence);
        this.activeSequenceId = newSeqId; // Set new sequence as active
        this.recreateToneSequence(true); // Rebuild Tone.Sequence for playback
        if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        if (!skipUndo) this._captureUndoState(`Create Sequence "${name}" on ${this.name}`);
        console.log(`[Track ${this.id}] Created new sequence: "${name}" (ID: ${newSeqId}), Rows: ${numRowsForGrid}, Length: ${actualLength}`);
        return newSequence;
    }

    deleteSequence(sequenceId) {
        if (this.type === 'Audio') return;
        if (!this.sequences || this.sequences.length <= 1) {
            if(this.appServices.showNotification) this.appServices.showNotification("Cannot delete the last sequence.", 2000);
            return;
        }
        const index = this.sequences.findIndex(s => s.id === sequenceId);
        if (index > -1) {
            const deletedSeqName = this.sequences[index].name;
            this._captureUndoState(`Delete sequence "${deletedSeqName}" from ${this.name}`);
            this.sequences.splice(index, 1);
            if (this.activeSequenceId === sequenceId) {
                this.activeSequenceId = this.sequences[0]?.id || null; // Fallback to first or null
            }
            this.recreateToneSequence(true);
            // Remove any timeline clips associated with this sequence
            this.timelineClips = this.timelineClips.filter(clip => clip.type !== 'sequence' || clip.sourceSequenceId !== sequenceId);
            if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
            if (this.appServices.renderTimeline) this.appServices.renderTimeline();
            console.log(`[Track ${this.id}] Deleted sequence: ${deletedSeqName} (ID: ${sequenceId})`);
        } else {
            console.warn(`[Track ${this.id}] Sequence ID ${sequenceId} not found for deletion.`);
        }
    }

    renameSequence(sequenceId, newName) {
        if (this.type === 'Audio') return;
        const sequence = this.sequences ? this.sequences.find(s => s.id === sequenceId) : null;
        if (sequence && typeof newName === 'string' && newName.trim() !== "") {
            const oldName = sequence.name;
            if (oldName === newName.trim()) return; // No change
            this._captureUndoState(`Rename sequence "${oldName}" to "${newName.trim()}" on ${this.name}`);
            sequence.name = newName.trim();
            if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged'); // To update sequencer window title if open
            if (this.appServices.renderTimeline) this.appServices.renderTimeline(); // Update timeline clip names
            console.log(`[Track ${this.id}] Renamed sequence ID ${sequenceId} from "${oldName}" to: "${newName.trim()}"`);
        } else if (!sequence) {
            console.warn(`[Track ${this.id}] Sequence ID ${sequenceId} not found for renaming.`);
        }
    }

    duplicateSequence(sequenceId) {
        if (this.type === 'Audio') return null;
        const originalSequence = this.sequences ? this.sequences.find(s => s.id === sequenceId) : null;
        if (!originalSequence) {
            console.warn(`[Track ${this.id}] Original sequence ID ${sequenceId} not found for duplication.`);
            return null;
        }

        const newSeqId = `seq_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        const newSequence = {
            id: newSeqId,
            name: `${originalSequence.name} Copy`,
            data: JSON.parse(JSON.stringify(originalSequence.data || [])), // Deep copy data
            length: originalSequence.length
        };
        this.sequences.push(newSequence);
        this._captureUndoState(`Duplicate sequence "${originalSequence.name}" on ${this.name}`);
        if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        console.log(`[Track ${this.id}] Duplicated sequence: "${originalSequence.name}" to "${newSequence.name}" (ID: ${newSeqId})`);
        return newSequence;
    }


    setActiveSequence(sequenceId) {
        if (this.type === 'Audio') return;
        const seq = this.sequences ? this.sequences.find(s => s.id === sequenceId) : null;
        if (seq && this.activeSequenceId !== sequenceId) {
            console.log(`[Track ${this.id}] Setting active sequence to: "${seq.name}" (ID: ${sequenceId})`);
            this.activeSequenceId = sequenceId;
            this.recreateToneSequence(true); // Rebuild Tone.Sequence for the new active one
            if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        } else if (!seq) {
            console.warn(`[Track ${this.id}] Sequence ID ${sequenceId} not found to set as active.`);
        }
    }

    doubleSequence() {
        if (this.type === 'Audio') return;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq) {
            console.warn(`[Track ${this.id} doubleSequence] No active sequence found.`);
            return;
        }

        const oldLength = activeSeq.length;
        const newLength = oldLength * 2;
        if (newLength > (Constants.MAX_BARS * Constants.STEPS_PER_BAR)) {
            if(this.appServices.showNotification) this.appServices.showNotification(`Cannot double length, exceeds maximum of ${Constants.MAX_BARS} bars.`, 3000);
            return;
        }
        this._captureUndoState(`Double Sequence Length for "${activeSeq.name}" on ${this.name}`);

        activeSeq.data = activeSeq.data || []; // Ensure data array exists
        activeSeq.data.forEach(row => {
            if (row && Array.isArray(row)) {
               const copyOfOriginal = row.slice(0, oldLength); // Copy original part
               row.length = newLength; // Extend row
               for(let i = oldLength; i < newLength; i++) row[i] = null; // Fill new part with null
               // Copy original notes to the new doubled part
               for(let i = 0; i < oldLength; i++) { 
                   if (copyOfOriginal[i]) row[oldLength + i] = JSON.parse(JSON.stringify(copyOfOriginal[i]));
               }
            }
        });
        activeSeq.length = newLength;
        this.recreateToneSequence(true);
        if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        console.log(`[Track ${this.id}] Doubled length of sequence "${activeSeq.name}" to ${newLength} steps.`);
    }

    setSequenceLength(newLengthInSteps, skipUndoCapture = false) {
        if (this.type === 'Audio') return;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq) {
            console.warn(`[Track ${this.id} setSequenceLength] No active sequence to set length for.`);
            return;
        }

        const oldActualLength = activeSeq.length || 0;
        // Validate and sanitize new length
        let validatedNewLength = Math.max(Constants.STEPS_PER_BAR, parseInt(newLengthInSteps) || Constants.defaultStepsPerBar);
        validatedNewLength = Math.ceil(validatedNewLength / Constants.STEPS_PER_BAR) * Constants.STEPS_PER_BAR; // Snap to bar
        validatedNewLength = Math.min(validatedNewLength, Constants.MAX_BARS * Constants.STEPS_PER_BAR);

        if (oldActualLength === validatedNewLength && activeSeq.length === validatedNewLength) return; // No change

        if (!skipUndoCapture) {
            this._captureUndoState(`Set Seq Length for "${activeSeq.name}" on ${this.name} to ${validatedNewLength / Constants.STEPS_PER_BAR} bars`);
        }
        activeSeq.length = validatedNewLength;

        // Adjust data array dimensions
        let numRows;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRows = Constants.synthPitches.length;
        else if (this.type === 'Sampler') numRows = (this.slices && this.slices.length > 0) ? this.slices.length : Constants.numSlices;
        else if (this.type === 'DrumSampler') numRows = Constants.numDrumSamplerPads;
        else numRows = (activeSeq.data && activeSeq.data.length > 0) ? activeSeq.data.length : 1; // Fallback

        if (numRows <= 0) numRows = 1; // Safety

        const currentSequenceData = activeSeq.data || [];
        activeSeq.data = Array(numRows).fill(null).map((_, rIndex) => {
            const currentRow = currentSequenceData[rIndex] || [];
            const newRow = Array(activeSeq.length).fill(null);
            for (let c = 0; c < Math.min(currentRow.length, activeSeq.length); c++) newRow[c] = currentRow[c];
            return newRow;
        });

        this.recreateToneSequence(true);
        if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        console.log(`[Track ${this.id}] Set sequence "${activeSeq.name}" length to ${activeSeq.length} steps, ${numRows} rows.`);
    }


    // --- Playback ---
    recreateToneSequence(forceRestart = false, startTimeOffset = 0) {
        if (this.type === 'Audio') return; // Audio tracks use timeline playback, not Tone.Sequence for patterns
        const currentPlaybackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        console.log(`[Track ${this.id} recreateToneSequence] For "${this.name}". ActiveSeqID: ${this.activeSequenceId}. Mode: ${currentPlaybackMode}`);

        // Dispose existing Tone.Sequence if it exists
        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            try {
                this.patternPlayerSequence.stop();
                this.patternPlayerSequence.clear();
                this.patternPlayerSequence.dispose();
            } catch(e) { console.warn(`[Track ${this.id}] Error disposing old Tone.Sequence:`, e.message); }
        }
        this.patternPlayerSequence = null; // Clear reference

        // Only create a new Tone.Sequence if in 'sequencer' mode
        if (currentPlaybackMode !== 'sequencer') {
            console.log(`[Track ${this.id} recreateToneSequence] Not in 'sequencer' mode. Sequence player not created.`);
            return;
        }

        const activeSeq = this.getActiveSequence();
        if (!activeSeq) {
            console.warn(`[Track ${this.id} recreateToneSequence] No active sequence (ID: ${this.activeSequenceId}). Aborting.`);
            return;
        }
        // Ensure sequence data is valid
        if (!activeSeq.data || !Array.isArray(activeSeq.data) || activeSeq.data.length === 0) {
            // Attempt to initialize data if it's missing (e.g., after a slice count change)
            let numRowsForInit;
            if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRowsForInit = Constants.synthPitches.length;
            else if (this.type === 'Sampler') numRowsForInit = (this.slices && this.slices.length > 0) ? this.slices.length : Constants.numSlices;
            else if (this.type === 'DrumSampler') numRowsForInit = Constants.numDrumSamplerPads;
            else numRowsForInit = 1;
            if (numRowsForInit <= 0) numRowsForInit = 1;
            activeSeq.data = Array(numRowsForInit).fill(null).map(() => Array(activeSeq.length || Constants.defaultStepsPerBar).fill(null));
            console.warn(`[Track ${this.id} recreateToneSequence] Active sequence "${activeSeq.name}" had invalid/empty data. Initialized with ${numRowsForInit} rows.`);
        }
        if (!activeSeq.length || !Number.isFinite(activeSeq.length) || activeSeq.length < Constants.STEPS_PER_BAR) {
            activeSeq.length = Constants.defaultStepsPerBar; // Ensure valid length
            console.warn(`[Track ${this.id} recreateToneSequence] Active sequence "${activeSeq.name}" had invalid length. Reset to ${activeSeq.length}.`);
            activeSeq.data.forEach(row => { if(row) row.length = activeSeq.length; }); // Ensure row lengths match
        }

        const sequenceDataForTone = activeSeq.data;
        const sequenceLengthForTone = activeSeq.length;
        console.log(`[Track ${this.id} recreateToneSequence] Creating Tone.Sequence for "${activeSeq.name}" (${sequenceLengthForTone} steps, ${sequenceDataForTone.length} rows).`);

        try {
            this.patternPlayerSequence = new Tone.Sequence((time, col) => {
                // Check playback mode again inside the callback, as it might change during playback
                const playbackModeCheck = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
                if (playbackModeCheck !== 'sequencer') {
                    if (this.patternPlayerSequence && this.patternPlayerSequence.state === 'started') this.patternPlayerSequence.stop();
                    return;
                }

                const currentGlobalSoloId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
                const isEffectivelyMuted = this.isMuted || (currentGlobalSoloId !== null && currentGlobalSoloId !== this.id);

                if (this.appServices.highlightPlayingStep) this.appServices.highlightPlayingStep(this.id, col);
                if (!this.gainNode || this.gainNode.disposed || isEffectivelyMuted) return;

                // Determine the actual audio destination (start of effects chain or gainNode)
                const effectsChainStartPoint = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                    ? this.activeEffects[0].toneNode
                    : (this.gainNode && !this.gainNode.disposed ? this.gainNode : null);
                if (!effectsChainStartPoint) return; // No valid output path

                if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
                    let notePlayedThisStep = false; // MonoSynth behavior
                    for (let rowIndex = 0; rowIndex < Constants.synthPitches.length; rowIndex++) {
                        const pitchName = Constants.synthPitches[rowIndex];
                        const step = sequenceDataForTone[rowIndex]?.[col];
                        if (step?.active && !notePlayedThisStep) {
                            this.instrument.triggerAttackRelease(pitchName, "16n", time, step.velocity * Constants.defaultVelocity); // Default duration
                            notePlayedThisStep = true;
                        }
                    }
                } else if (this.type === 'Sampler') {
                     (this.slices || []).forEach((sliceData, sliceIndex) => {
                        const step = sequenceDataForTone[sliceIndex]?.[col];
                        if (step?.active && sliceData?.duration > 0 && this.audioBuffer?.loaded) {
                            const targetVolumeLinear = sliceData.volume * step.velocity;
                            const playbackRate = Math.pow(2, (sliceData.pitchShift || 0) / 12);
                            let playDuration = sliceData.duration / playbackRate;
                            if (sliceData.loop) playDuration = Tone.Time("16n").toSeconds(); // Limit looped preview duration for sequencer steps

                            if (this.slicerIsPolyphonic) {
                                const tempPlayer = new Tone.Player(this.audioBuffer);
                                const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                                const tempGain = new Tone.Gain(targetVolumeLinear);
                                tempPlayer.chain(tempEnv, tempGain, effectsChainStartPoint);
                                tempPlayer.playbackRate = playbackRate; tempPlayer.reverse = sliceData.reverse || false; tempPlayer.loop = sliceData.loop || false;
                                tempPlayer.loopStart = sliceData.offset; tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
                                tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                                tempEnv.triggerAttack(time);
                                if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95);
                                // Schedule disposal
                                Tone.Transport.scheduleOnce(() => {
                                    try { if(tempPlayer && !tempPlayer.disposed) tempPlayer.dispose(); } catch(e){}
                                    try { if(tempEnv && !tempEnv.disposed) tempEnv.dispose(); } catch(e){}
                                    try { if(tempGain && !tempGain.disposed) tempGain.dispose(); } catch(e){}
                                }, time + playDuration + (sliceData.envelope?.release || 0.1) + 0.3); // Generous buffer
                            } else if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                                if (this.slicerMonoPlayer.state === 'started') this.slicerMonoPlayer.stop(time); // Stop previous note
                                this.slicerMonoEnvelope.triggerRelease(time); // Ensure envelope is reset
                                this.slicerMonoPlayer.buffer = this.audioBuffer; // Ensure buffer is set
                                this.slicerMonoEnvelope.set(sliceData.envelope);
                                this.slicerMonoGain.gain.value = targetVolumeLinear;
                                this.slicerMonoPlayer.playbackRate = playbackRate; this.slicerMonoPlayer.reverse = sliceData.reverse || false;
                                this.slicerMonoPlayer.loop = sliceData.loop || false; this.slicerMonoPlayer.loopStart = sliceData.offset; this.slicerMonoPlayer.loopEnd = sliceData.offset + sliceData.duration;
                                this.slicerMonoPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                                this.slicerMonoEnvelope.triggerAttack(time);
                                if (!sliceData.loop) {
                                    const releaseTime = time + playDuration - (sliceData.envelope.release * 0.05); // Slightly anticipate release for mono
                                    this.slicerMonoEnvelope.triggerRelease(Math.max(time, releaseTime));
                                }
                            }
                        }
                    });
                } else if (this.type === 'DrumSampler') {
                    Array.from({ length: Constants.numDrumSamplerPads }).forEach((_, padIndex) => {
                        const step = sequenceDataForTone[padIndex]?.[col];
                        const padData = this.drumSamplerPads[padIndex];
                        if (step?.active && padData && this.drumPadPlayers[padIndex] && !this.drumPadPlayers[padIndex].disposed && this.drumPadPlayers[padIndex].loaded) {
                            const player = this.drumPadPlayers[padIndex];
                            // Ensure player is connected to the effects chain start point
                            try { player.disconnect(); player.connect(effectsChainStartPoint); } catch(e) { /* ignore if already connected or error */ }
                            player.volume.value = Tone.gainToDb(padData.volume * step.velocity * 0.7); // Apply some headroom
                            player.playbackRate = Math.pow(2, (padData.pitchShift || 0) / 12);
                            player.start(time);
                        }
                    });
                } else if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed && this.toneSampler.loaded) {
                    let notePlayedThisStep = false; // For mono behavior if instrumentSamplerIsPolyphonic is false
                    Constants.synthPitches.forEach((pitchName, rowIndex) => {
                        const step = sequenceDataForTone[rowIndex]?.[col];
                        if (step?.active) {
                            if (!this.instrumentSamplerIsPolyphonic && !notePlayedThisStep) {
                                this.toneSampler.releaseAll(time); // Stop previous note for mono
                                notePlayedThisStep = true;
                            }
                            this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "16n", time, step.velocity * Constants.defaultVelocity);
                        }
                    });
                }
            }, Array.from(Array(sequenceLengthForTone).keys()), "16n"); // Events for each step

            this.patternPlayerSequence.loop = true;
            console.log(`[Track ${this.id} recreateToneSequence] Tone.Sequence for "${activeSeq.name}" prepared. Loop: true.`);
        } catch (error) {
            console.error(`[Track ${this.id} recreateToneSequence] Error creating Tone.Sequence for "${activeSeq.name}":`, error);
            this.patternPlayerSequence = null; // Ensure it's null on error
        }

        // Update UI if sequencer window is open
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
    }

    // --- Audio Clip Management (for Audio Tracks) ---
    async addAudioClip(blob, startTime) {
        if (this.type !== 'Audio') {
            console.warn(`[Track ${this.id}] addAudioClip called on non-Audio track type: ${this.type}`);
            return;
        }
        const clipId = `audioclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        const dbKey = `clip_${this.id}_${Date.now()}_${blob.size}.wav`; // Unique key for IndexedDB

        try {
            await storeAudio(dbKey, blob); // Store the blob in IndexedDB
            let duration = 0;
            try {
                 duration = await this.getBlobDuration(blob);
            } catch(durationError) {
                console.warn(`[Track ${this.id}] Could not determine duration for new audio clip ${clipId}, defaulting to 0. Error:`, durationError);
            }

            const newClip = {
                id: clipId, type: 'audio', sourceId: dbKey, // sourceId now refers to dbKey
                startTime: Math.max(0, startTime), // Ensure startTime is not negative
                duration: duration,
                name: `Rec ${new Date().toLocaleTimeString().substring(0,8)}` // Default name
            };

            this.timelineClips.push(newClip);
            console.log(`[Track ${this.id}] Added audio clip to timeline:`, newClip);
            this._captureUndoState(`Add Recorded Clip to ${this.name}`);

            if (this.appServices.renderTimeline) this.appServices.renderTimeline();
        } catch (error) {
            console.error(`[Track ${this.id} addAudioClip] Error:`, error);
            if (this.appServices.showNotification) this.appServices.showNotification("Failed to save recorded audio clip.", 3000);
        }
    }

    async addExternalAudioFileAsClip(audioFileBlob, startTime, clipName = null) {
        if (this.type !== 'Audio') {
            console.warn(`[Track ${this.id}] addExternalAudioFileAsClip called on non-Audio track type: ${this.type}`);
            if (this.appServices.showNotification) this.appServices.showNotification("Audio files can only be added to Audio Tracks.", 3000);
            return null;
        }
        const clipId = `audioclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
        const dbKey = `clip_${this.id}_${audioFileBlob.name.replace(/[^a-zA-Z0-9-_.]/g, '_')}_${audioFileBlob.size}_${Date.now()}`;

        try {
            await storeAudio(dbKey, audioFileBlob);
            let duration = 0;
            try {
                duration = await this.getBlobDuration(audioFileBlob);
            } catch (durationError) {
                console.warn(`[Track ${this.id}] Could not determine duration for external audio clip ${clipId}, defaulting to 0. Error:`, durationError);
            }

            const newClip = {
                id: clipId,
                type: 'audio',
                sourceId: dbKey,
                startTime: Math.max(0, startTime),
                duration: duration,
                name: clipName || audioFileBlob.name || `Audio Clip ${this.timelineClips.filter(c => c.type === 'audio').length + 1}`
            };

            this.timelineClips.push(newClip);
            console.log(`[Track ${this.id}] Added external audio file as clip to timeline:`, newClip);
            this._captureUndoState(`Add Audio File Clip "${newClip.name}" to ${this.name}`);

            if (this.appServices.renderTimeline) this.appServices.renderTimeline();
            return newClip;
        } catch (error) {
            console.error(`[Track ${this.id} addExternalAudioFileAsClip] Error:`, error);
            if (this.appServices.showNotification) this.appServices.showNotification("Failed to save and add audio file clip.", 3000);
            return null;
        }
    }

    addSequenceClipToTimeline(sourceSequenceId, startTime, clipName = null) {
        if (this.type === 'Audio') {
            console.warn(`[Track ${this.id}] addSequenceClipToTimeline called on Audio track. Sequences are not applicable.`);
            if (this.appServices.showNotification) this.appServices.showNotification("Cannot add sequence clips to Audio Tracks.", 3000);
            return null;
        }

        const sourceSequence = this.sequences.find(s => s.id === sourceSequenceId);
        if (!sourceSequence) {
            console.warn(`[Track ${this.id}] Source sequence with ID ${sourceSequenceId} not found.`);
            if (this.appServices.showNotification) this.appServices.showNotification("Source sequence not found.", 3000);
            return null;
        }

        const clipId = `seqclip_${this.id}_${sourceSequenceId}_${Date.now()}_${Math.random().toString(36).substr(2,7)}`;
        const sixteenthNoteTime = Tone.Time("16n").toSeconds(); // Duration of one 16th note
        const duration = sourceSequence.length * sixteenthNoteTime;

        const newClip = {
            id: clipId,
            type: 'sequence',
            sourceSequenceId: sourceSequenceId,
            startTime: Math.max(0, startTime),
            duration: duration,
            name: clipName || sourceSequence.name || `Seq Clip ${this.timelineClips.filter(c => c.type === 'sequence').length + 1}`
        };

        this.timelineClips.push(newClip);
        console.log(`[Track ${this.id}] Added sequence clip to timeline:`, newClip);
        this._captureUndoState(`Add Sequence Clip "${newClip.name}" to ${this.name}`);

        if (this.appServices.renderTimeline) this.appServices.renderTimeline();
        return newClip;
    }


    async getBlobDuration(blob) {
        if (!blob || blob.size === 0) return 0;
        const tempUrl = URL.createObjectURL(blob);
        const audioContext = Tone.context?.rawContext; // Get the underlying AudioContext
        if (!audioContext) {
            console.warn(`[Track ${this.id} getBlobDuration] No raw AudioContext available from Tone.`);
            URL.revokeObjectURL(tempUrl);
            return 0;
        }
        try {
            const arrayBuffer = await fetch(tempUrl).then(res => res.arrayBuffer());
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            return audioBuffer.duration;
        } catch (e) {
            console.error(`[Track ${this.id} getBlobDuration] Error decoding audio data:`, e);
            return 0; // Fallback or throw error
        } finally {
            URL.revokeObjectURL(tempUrl);
        }
    }

    // --- Timeline Playback Scheduling ---
    async schedulePlayback(transportStartTime, transportStopTime) {
        const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        console.log(`[Track ${this.id} "${this.name}"] schedulePlayback. Mode: ${playbackMode}. Transport Range: ${transportStartTime.toFixed(2)}s to ${transportStopTime.toFixed(2)}s`);

        this.stopPlayback(); // Clear any existing players/parts for this track

        if (playbackMode === 'timeline') {
            for (const clip of this.timelineClips) {
                if (!clip || typeof clip.startTime !== 'number' || typeof clip.duration !== 'number') {
                    console.warn(`[Track ${this.id}] Skipping invalid clip:`, clip);
                    continue;
                }
                const clipActualStart = clip.startTime;
                const clipActualEnd = clip.startTime + clip.duration;

                // Determine if the clip overlaps with the transport's playback window
                const effectivePlayStart = Math.max(clipActualStart, transportStartTime);
                const effectivePlayEnd = Math.min(clipActualEnd, transportStopTime);
                let playDurationInWindow = effectivePlayEnd - effectivePlayStart;

                if (playDurationInWindow <= 1e-3) continue; // Clip is not within the current playback window or duration is too small

                const offsetIntoSource = Math.max(0, effectivePlayStart - clipActualStart);

                if (clip.type === 'audio') {
                    if (!clip.sourceId) { console.warn(`[Track ${this.id}] Audio clip ${clip.id} has no sourceId.`); continue; }
                    console.log(`[Track ${this.id}] Timeline: Scheduling AUDIO clip "${clip.name}" (ID: ${clip.id}) at ${effectivePlayStart.toFixed(2)}s for ${playDurationInWindow.toFixed(2)}s (offset ${offsetIntoSource.toFixed(2)}s)`);
                    const player = new Tone.Player(); // Create a new player for each scheduled instance
                    this.clipPlayers.set(clip.id, player); // Store it for potential stop/dispose
                    try {
                        const audioBlob = await getAudio(clip.sourceId);
                        if (audioBlob) {
                            const url = URL.createObjectURL(audioBlob);
                            player.onload = () => {
                                URL.revokeObjectURL(url); // Clean up object URL after load
                                const destNode = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                                    ? this.activeEffects[0].toneNode
                                    : (this.gainNode && !this.gainNode.disposed ? this.gainNode : null);
                                if (destNode) player.connect(destNode); else player.toDestination(); // Fallback
                                player.start(effectivePlayStart, offsetIntoSource, playDurationInWindow);
                            };
                            player.onerror = (err) => { console.error(`[Track ${this.id}] Player error for clip ${clip.id}:`, err); URL.revokeObjectURL(url); if(this.clipPlayers.has(clip.id)){try{if(!player.disposed)player.dispose()}catch(e){} this.clipPlayers.delete(clip.id);}};
                            await player.load(url);
                        } else {
                            console.warn(`[Track ${this.id}] Blob not found for audio clip ${clip.id} (source ${clip.sourceId})`);
                            if(!player.disposed) player.dispose(); this.clipPlayers.delete(clip.id);
                        }
                    } catch (err) { console.error(`[Track ${this.id}] Error loading/scheduling audio clip ${clip.id}:`, err); if(this.clipPlayers.has(clip.id)){const p = this.clipPlayers.get(clip.id); if(p && !p.disposed) try{p.dispose()}catch(e){} this.clipPlayers.delete(clip.id);}}
                } else if (clip.type === 'sequence') {
                    const sourceSequence = this.sequences ? this.sequences.find(s => s.id === clip.sourceSequenceId) : null;
                    if (sourceSequence?.data?.length > 0 && sourceSequence.length > 0) {
                        console.log(`[Track ${this.id}] Timeline: Scheduling SEQUENCE clip "${clip.name}" (Source: "${sourceSequence.name}") from ${effectivePlayStart.toFixed(2)}s for ${playDurationInWindow.toFixed(2)}s using Tone.Part`);

                        const events = [];
                        const sixteenthTime = Tone.Time("16n").toSeconds();

                        // Iterate through steps in the source sequence
                        for (let stepIdx = 0; stepIdx < sourceSequence.length; stepIdx++) {
                            const timeWithinSeq = stepIdx * sixteenthTime; // Time of this step relative to sequence start
                            // Schedule event if it falls within the effective play window of this clip instance
                            if (clipActualStart + timeWithinSeq >= effectivePlayStart && clipActualStart + timeWithinSeq < effectivePlayEnd) {
                                const eventTimeInPart = (clipActualStart + timeWithinSeq) - effectivePlayStart; // Time relative to Part start
                                for (let rowIdx = 0; rowIdx < sourceSequence.data.length; rowIdx++) {
                                    const stepData = sourceSequence.data[rowIdx]?.[stepIdx];
                                    if (stepData?.active) {
                                        let noteValue;
                                        let noteDuration = "16n"; // Default duration for sequence events
                                        if (this.type === 'Synth' || this.type === 'InstrumentSampler') {
                                            noteValue = Constants.synthPitches[rowIdx];
                                        } else if (this.type === 'Sampler') {
                                            const sliceData = this.slices[rowIdx];
                                            if (sliceData && sliceData.duration > 0 && this.audioBuffer?.loaded) {
                                               noteValue = { type: 'slice', index: rowIdx, data: sliceData };
                                            }
                                        } else if (this.type === 'DrumSampler') {
                                            const padData = this.drumSamplerPads[rowIdx];
                                            if (padData && this.drumPadPlayers[rowIdx]?.loaded) {
                                                noteValue = { type: 'drum', index: rowIdx, data: padData };
                                            }
                                        }
                                        if (noteValue) {
                                            events.push([eventTimeInPart, {
                                                note: noteValue,
                                                velocity: stepData.velocity * Constants.defaultVelocity,
                                                duration: noteDuration
                                            }]);
                                        }
                                    }
                                }
                            }
                        }

                        if (events.length > 0) {
                            const part = new Tone.Part((time, value) => { // `time` is absolute transport time
                                const soloId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
                                const muted = this.isMuted || (soloId !== null && soloId !== this.id);
                                if (!this.gainNode || this.gainNode.disposed || muted) return;

                                const dest = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                                    ? this.activeEffects[0].toneNode
                                    : (this.gainNode || null);
                                if (!dest) return;

                                if (this.type === 'Synth' && this.instrument && !this.instrument.disposed && typeof value.note === 'string') {
                                    this.instrument.triggerAttackRelease(value.note, value.duration, time, value.velocity);
                                } else if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed && this.toneSampler.loaded && typeof value.note === 'string') {
                                    let notePlayed = false; // For mono behavior
                                    if (!this.instrumentSamplerIsPolyphonic && !notePlayed) {
                                        this.toneSampler.releaseAll(time);
                                        notePlayed = true;
                                    }
                                    this.toneSampler.triggerAttackRelease(Tone.Frequency(value.note).toNote(), value.duration, time, value.velocity);
                                } else if (this.type === 'Sampler' && value.note.type === 'slice' && this.audioBuffer?.loaded) {
                                    const sliceData = value.note.data;
                                    const targetVolumeLinear = sliceData.volume * value.velocity;
                                    const playbackRate = Math.pow(2, (sliceData.pitchShift || 0) / 12);
                                    let playDurationPart = sliceData.duration / playbackRate;
                                    if (sliceData.loop) playDurationPart = Tone.Time(value.duration).toSeconds();

                                    if (this.slicerIsPolyphonic) {
                                        const tempPlayer = new Tone.Player(this.audioBuffer);
                                        const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                                        const tempGain = new Tone.Gain(targetVolumeLinear);
                                        tempPlayer.chain(tempEnv, tempGain, dest);
                                        tempPlayer.playbackRate = playbackRate; tempPlayer.reverse = sliceData.reverse || false; tempPlayer.loop = sliceData.loop || false;
                                        tempPlayer.loopStart = sliceData.offset; tempPlayer.loopEnd = sliceData.offset + sliceData.duration;

                                        tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDurationPart);
                                        tempEnv.triggerAttack(time);
                                        if (!sliceData.loop) tempEnv.triggerRelease(time + playDurationPart * 0.95);
                                        Tone.Transport.scheduleOnce(() => {
                                            try { if(tempPlayer && !tempPlayer.disposed) tempPlayer.dispose(); } catch(e){}
                                            try { if(tempEnv && !tempEnv.disposed) tempEnv.dispose(); } catch(e){}
                                            try { if(tempGain && !tempGain.disposed) tempGain.dispose(); } catch(e){}
                                        }, time + playDurationPart + (sliceData.envelope?.release || 0.1) + 0.3);
                                    } else if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                                        if (this.slicerMonoPlayer.state === 'started') this.slicerMonoPlayer.stop(time);
                                        this.slicerMonoEnvelope.triggerRelease(time); // Ensure previous envelope is released
                                        this.slicerMonoPlayer.buffer = this.audioBuffer;
                                        this.slicerMonoEnvelope.set(sliceData.envelope);
                                        this.slicerMonoGain.gain.value = targetVolumeLinear;
                                        this.slicerMonoPlayer.playbackRate = playbackRate; this.slicerMonoPlayer.reverse = sliceData.reverse || false;
                                        this.slicerMonoPlayer.loop = sliceData.loop || false; this.slicerMonoPlayer.loopStart = sliceData.offset; this.slicerMonoPlayer.loopEnd = sliceData.offset + sliceData.duration;
                                        this.slicerMonoPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDurationPart);
                                        this.slicerMonoEnvelope.triggerAttack(time);
                                        if (!sliceData.loop) {
                                            const releaseTime = time + playDurationPart - (sliceData.envelope.release * 0.05); // Slight anticipation for mono
                                            this.slicerMonoEnvelope.triggerRelease(Math.max(time, releaseTime));
                                        }
                                    }
                                } else if (this.type === 'DrumSampler' && value.note.type === 'drum') {
                                    const padData = value.note.data;
                                    const player = this.drumPadPlayers[value.note.index];
                                    if (player && !player.disposed && player.loaded) {
                                        // Ensure player is connected to the effects chain start point
                                        try { player.disconnect(); player.connect(dest); } catch(e) { /* ignore */ }
                                        player.volume.value = Tone.gainToDb(padData.volume * value.velocity * 0.7);
                                        player.playbackRate = Math.pow(2, (padData.pitchShift || 0) / 12);
                                        player.start(time);
                                    }
                                }
                            }, events);
                            part.loop = false; // Part itself doesn't loop; looping is handled by multiple clip instances
                            part.start(effectivePlayStart); // Start the Part at the clip's effective start time
                            if (playDurationInWindow > 0 && playDurationInWindow !== Infinity) {
                                part.stop(effectivePlayStart + playDurationInWindow);
                            }
                            this.clipPlayers.set(`${clip.id}_part`, part); // Store part for cleanup
                        }
                    }
                }
            }
        } else { // Sequencer Mode
            if (!this.patternPlayerSequence || this.patternPlayerSequence.disposed) {
                console.log(`[Track ${this.id} schedulePlayback] Sequencer mode: patternPlayerSequence is invalid, calling recreateToneSequence.`);
                this.recreateToneSequence(true, transportStartTime); // Pass transportStartTime for potential offset
            }
            if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
                if (this.patternPlayerSequence.state === 'started') {
                    try {this.patternPlayerSequence.stop(Tone.Transport.now());} catch(e){console.warn("Err stopping seq player during schedule", e)}
                }
                console.log(`[Track ${this.id}] Sequencer mode: Starting patternPlayerSequence at transport offset: ${transportStartTime.toFixed(2)}s. Loop: ${this.patternPlayerSequence.loop}`);
                try {
                    this.patternPlayerSequence.start(transportStartTime); // Start sequence relative to transport's start time
                } catch(e) {
                    console.error(`[Track ${this.id}] Error starting patternPlayerSequence:`, e.message, e); 
                    try { if(!this.patternPlayerSequence.disposed) this.patternPlayerSequence.dispose(); } catch (disposeErr) {}
                    this.patternPlayerSequence = null;
                }
            } else {
                 console.warn(`[Track ${this.id}] Sequencer mode: patternPlayerSequence still not valid after recreation for "${this.name}".`);
            }
        }
    }


    stopPlayback() {
        console.log(`[Track ${this.id} "${this.name}"] stopPlayback called. Timeline clip players/parts: ${this.clipPlayers.size}`);
        // Stop and dispose all dynamically created players/parts for timeline clips
        const playersAndPartsToStop = Array.from(this.clipPlayers.values());
        playersAndPartsToStop.forEach(item => { 
            if (item && !item.disposed) {
                try {
                    if (typeof item.unsync === 'function') item.unsync(); // For Tone.Part
                    item.stop(Tone.Transport.now()); // Stop immediately
                    item.dispose();
                }
                catch (e) { console.warn(`[Track ${this.id}] Error stopping/disposing a timeline clip player/part:`, e.message); }
            }
        });
        this.clipPlayers.clear();

        // Stop and dispose the patternPlayerSequence (for sequencer mode)
        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            try {
                this.patternPlayerSequence.stop(); // Stop immediately
                this.patternPlayerSequence.clear(); // Clear events
                this.patternPlayerSequence.dispose(); // Dispose the sequence object
                console.log(`[Track ${this.id}] Stopped, cleared, and disposed patternPlayerSequence.`);
            }
            catch (e) { console.warn(`[Track ${this.id}] Error stopping/disposing patternPlayerSequence:`, e.message); }
        }
        this.patternPlayerSequence = null; // Clear reference
    }

    // --- Timeline Clip Interaction ---
    async updateAudioClipPosition(clipId, newStartTime) {
        const clip = this.timelineClips.find(c => c.id === clipId);
        if (clip) {
            const oldStartTime = clip.startTime;
            clip.startTime = Math.max(0, parseFloat(newStartTime) || 0);
            console.log(`[Track ${this.id}] Updated ${clip.type} clip ${clipId} startTime from ${oldStartTime.toFixed(2)} to ${clip.startTime.toFixed(2)}`);
            this._captureUndoState(`Move Clip "${clip.name || clip.id.slice(-4)}" on ${this.name}`);

            if (this.appServices.renderTimeline) this.appServices.renderTimeline();

            // If transport is running in timeline mode, we might need to reschedule
            const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
            if (Tone.Transport.state === 'started' && playbackMode === 'timeline') {
                console.log(`[Track ${this.id} updateAudioClipPosition] Transport running in timeline. Rescheduling all tracks.`);
                // This is a complex operation: ideally, only this track or even just this clip needs rescheduling.
                // For simplicity here, we'll re-trigger a full reschedule for all tracks if transport is running.
                // A more optimized approach would involve more granular control.
                Tone.Transport.pause(); // Pause briefly
                const allTracks = this.appServices.getTracks ? this.appServices.getTracks() : [];
                allTracks.forEach(t => { if (typeof t.stopPlayback === 'function') t.stopPlayback(); });
                Tone.Transport.cancel(0); // Clear all scheduled events
                const currentPlayheadPosition = Tone.Transport.seconds; // Where it was paused
                const scheduleEndTime = currentPlayheadPosition + 300; // Reschedule for a long duration ahead
                for (const t of allTracks) {
                    if (typeof t.schedulePlayback === 'function') await t.schedulePlayback(currentPlayheadPosition, scheduleEndTime);
                }
                Tone.Transport.start(Tone.Transport.now() + 0.05, currentPlayheadPosition); // Resume from where it was
            }
        } else {
            console.warn(`[Track ${this.id}] Could not find clip ${clipId} to update its position.`);
        }
    }

    // --- Disposal ---
    dispose() {
        const trackNameForLog = this.name || `Track ${this.id}`; // Use name if available for clearer logs
        console.log(`[Track Dispose START ${this.id}] Starting disposal for track: "${trackNameForLog}"`);

        try { this.stopPlayback(); } catch (e) { console.warn(`[Track Dispose ${this.id}] Error in stopPlayback during dispose:`, e.message); }

        // Dispose Tone.Sequence for pattern playback
        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            try { this.patternPlayerSequence.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing patternPlayerSequence:`, e.message); }
        }
        this.patternPlayerSequence = null;

        // Dispose main instrument/sampler node
        if (this.instrument && !this.instrument.disposed) { // For Synth
            try { this.instrument.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing instrument:`, e.message); }
        }
        this.instrument = null;

        if (this.toneSampler && !this.toneSampler.disposed) { // For InstrumentSampler
            try { this.toneSampler.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing toneSampler:`, e.message); }
        }
        this.toneSampler = null;

        this.disposeSlicerMonoNodes(); // For Sampler (mono slicer)

        // Dispose drum pad players
        this.drumPadPlayers.forEach((player, index) => { // For DrumSampler
            if (player && !player.disposed) {
                try { player.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing drumPadPlayer ${index}:`, e.message); }
            }
            this.drumPadPlayers[index] = null;
        });

        // Dispose active effects
        this.activeEffects.forEach(effect => { // For all track types
            if (effect.toneNode && !effect.toneNode.disposed) {
                try { effect.toneNode.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing effect "${effect.type}":`, e.message); }
            }
        });
        this.activeEffects = [];

        // Dispose core audio nodes
        if (this.gainNode && !this.gainNode.disposed) {
            try { this.gainNode.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing gainNode:`, e.message); }
        }
        this.gainNode = null;

        if (this.trackMeter && !this.trackMeter.disposed) {
            try { this.trackMeter.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing trackMeter:`, e.message); }
        }
        this.trackMeter = null;

        if (this.inputChannel && !this.inputChannel.disposed) { // For Audio tracks
            try { this.inputChannel.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing inputChannel:`, e.message); }
        }
        this.inputChannel = null;

        // Close associated windows via appServices
        if (this.appServices.closeAllTrackWindows) {
            this.appServices.closeAllTrackWindows(this.id);
        }

        // Dispose Tone.Buffers held by the track
        if (this.audioBuffer && !this.audioBuffer.disposed) { // For Sampler
            try { this.audioBuffer.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing audioBuffer (Sampler):`, e.message); }
        }
        this.audioBuffer = null;

        (this.drumSamplerPads || []).forEach(p => { // For DrumSampler pads
            if (p.audioBuffer && !p.audioBuffer.disposed) {
                try { p.audioBuffer.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing pad audioBuffer:`, e.message); }
            }
            p.audioBuffer = null;
        });

        if (this.instrumentSamplerSettings?.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) { // For InstrumentSampler
            try { this.instrumentSamplerSettings.audioBuffer.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing audioBuffer (InstrumentSampler):`, e.message); }
        }
        if (this.instrumentSamplerSettings) this.instrumentSamplerSettings.audioBuffer = null;

        // Clear data arrays
        this.sequences = [];
        this.timelineClips = [];
        this.appServices = {}; // Clear appServices reference
        this.inspectorControls = {}; // Clear UI control references
        this.waveformCanvasCtx = null;
        this.instrumentWaveformCanvasCtx = null;

        console.log(`[Track Dispose END ${this.id}] Finished disposal for track: "${trackNameForLog}"`);
    }
}
