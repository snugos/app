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

        this.isMuted = initialData?.isMuted || false;
        this.isMonitoringEnabled = initialData?.isMonitoringEnabled !== undefined ? initialData.isMonitoringEnabled : (this.type === 'Audio'); 

        const currentSoloedId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
        this.isSoloed = currentSoloedId === this.id;
        this.previousVolumeBeforeMute = initialData?.volume ?? 0.7;

        // Track color for visual identification
        if (initialData?.color !== undefined) {
            this.color = initialData.color;
        } else {
            const trackCount = this.appServices.getTracks ? this.appServices.getTracks().length : 0;
            this.color = Constants.TRACK_COLORS[trackCount % Constants.TRACK_COLORS.length];
        }

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
            delete this.sequenceData;
            delete this.sequenceLength;
        } else { 
            delete this.sequenceData;
            delete this.sequenceLength;
            delete this.sequences;
            delete this.activeSequenceId;

            if (initialData?.audioClips && Array.isArray(initialData.audioClips)) {
                 initialData.audioClips.forEach(ac => {
                    if (!ac || !ac.dbKey) return; 
                    const existingClip = this.timelineClips.find(tc => tc.sourceId === ac.dbKey && tc.type === 'audio');
                    if (!existingClip) {
                        this.timelineClips.push({
                            id: ac.id || `audioclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
                            type: 'audio',
                            sourceId: ac.dbKey,
                            startTime: ac.startTime || 0,
                            duration: ac.duration || 0, 
                            name: ac.name || `Rec Clip ${this.timelineClips.filter(c => c.type === 'audio').length + 1}`
                        });
                    }
                });
           }
        }
        this.patternPlayerSequence = null; 

        // UI related
        this.waveformCanvasCtx = null;
        this.instrumentWaveformCanvasCtx = null;
        this.automation = initialData?.automation ? JSON.parse(JSON.stringify(initialData.automation)) : { volume: [] };
        this.inspectorControls = {};

        // Audio Track specific
        this.inputChannel = null;
        this.clipPlayers = new Map(); 
    }
/**
     * Loads a sample to a specific drum pad and saves it to IndexedDB.
     * @param {number} padIndex The index of the pad (0-15).
     * @param {Object} sampleSource Data source (file object or sound browser metadata).
     */
    async loadSampleToPad(padIndex, sampleSource) {
        this._captureUndoState(`Load sample to pad ${padIndex + 1} on ${this.name}`);
        try {
            let audioData;
            let fileName = sampleSource.fileName;

            // 1. Convert the source into an ArrayBuffer
            if (sampleSource.file) {
                // User dragged a file from their computer
                audioData = await sampleSource.file.arrayBuffer();
            } else if (sampleSource.filePath) {
                // User dragged a sound from the internal Sound Browser
                if (this.appServices.loadAudioBufferSource) {
                    audioData = await this.appServices.loadAudioBufferSource(sampleSource);
                }
            }

            if (audioData) {
                // 2. Save to IndexedDB so the sample persists on reload
                const dbKey = `track_${this.id}_pad_${padIndex}`;
                await storeAudio(dbKey, audioData);

                // 3. Create a Tone.js Buffer for immediate playback
                const buffer = new Tone.ToneAudioBuffer();
                await buffer.fromArrayBuffer(audioData);

                // 4. Update the specific pad in this track
                if (this.drumSamplerPads[padIndex]) {
                    // Dispose of the old buffer if it exists to save memory
                    if (this.drumSamplerPads[padIndex].audioBuffer && !this.drumSamplerPads[padIndex].audioBuffer.disposed) {
                        this.drumSamplerPads[padIndex].audioBuffer.dispose();
                    }

                    this.drumSamplerPads[padIndex].audioBuffer = buffer;
                    this.drumSamplerPads[padIndex].sampleName = fileName;
                    this.drumSamplerPads[padIndex].dbKey = dbKey;
                    this.drumSamplerPads[padIndex].status = 'loaded';
                }

                return true;
            }
        } catch (e) {
            console.error("[Track loadSampleToPad] Error:", e);
            if (this.appServices.showNotification) {
                this.appServices.showNotification("Error loading sample to pad.");
            }
        }
        return false;
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
        return {
            portamento: 0.01,
            oscillator: { type: 'sine' }, 
            envelope: { 
                attack: 0.005, 
                decay: 2,
                sustain: 0,
                release: 1 
            },
            filter: { type: 'lowpass', rolloff: -12, Q: 1, frequency: 1000 }, 
            filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 2, baseFrequency: 200, octaves: 7, exponent: 2 }
        };
    }

    // --- Audio Node Initialization and Chaining ---
    async initializeAudioNodes() {
        try {
            if (this.gainNode && !this.gainNode.disposed) try { this.gainNode.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old gainNode:`, e.message)}
            if (this.trackMeter && !this.trackMeter.disposed) try { this.trackMeter.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old trackMeter:`, e.message)}
            if (this.inputChannel && !this.inputChannel.disposed && this.type === 'Audio') {
                try { this.inputChannel.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old inputChannel:`, e.message)}
            }

            if (!this.appServices.getMasterEffectsBusInputNode) {
                 console.error(`[Track ${this.id} initializeAudioNodes] CRITICAL: getMasterEffectsBusInputNode service not available.`);
                 return;
            }

            this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
            this.outputNode = this.gainNode; 

            if (this.type === 'Audio') {
                this.inputChannel = new Tone.Channel(); 
            }

            this.rebuildEffectChain();
        } catch (error) {
            console.error(`[Track ${this.id} initializeAudioNodes] Error during initialization:`, error);
            if (this.appServices.showNotification) {
                this.appServices.showNotification(`Error initializing audio for track ${this.name}: ${error.message}`, 4000);
            }
        }
    }

    rebuildEffectChain() {
        if (!this.gainNode || this.gainNode.disposed) {
            console.error(`[Track ${this.id} rebuildEffectChain] CRITICAL: GainNode is not valid. Aborting chain rebuild.`);
            return;
        }
        if (!this.trackMeter || this.trackMeter.disposed) {
            console.warn(`[Track ${this.id} rebuildEffectChain] TrackMeter is not valid, re-creating.`);
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        }

        let sourceNodes = [];
        if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) sourceNodes.push(this.instrument);
        else if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed) sourceNodes.push(this.toneSampler);
        else if (this.type === 'DrumSampler') {
            this.drumPadPlayers.forEach(player => { if (player && !player.disposed) sourceNodes.push(player); });
        } else if (this.type === 'Sampler' && !this.slicerIsPolyphonic && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
            sourceNodes.push(this.slicerMonoGain);
        } else if (this.type === 'Audio' && this.inputChannel && !this.inputChannel.disposed) {
            sourceNodes.push(this.inputChannel);
        }

        const allManagedNodes = [
            ...sourceNodes,
            ...this.activeEffects.map(e => e.toneNode),
            this.gainNode,
            this.trackMeter
        ].filter(node => node && !node.disposed);

        allManagedNodes.forEach(node => {
            try { node.disconnect(); } catch(e) { console.warn(`[Track ${this.id} rebuildEffectChain] Error during disconnect of node:`, node?.toString(), e.message); }
        });

        if (this.type === 'Sampler' && !this.slicerIsPolyphonic && this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed &&
            this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed &&
            this.slicerMonoGain && !this.slicerMonoGain.disposed) {
            try {
                this.slicerMonoPlayer.disconnect();
                this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
            } catch (e) { console.error(`[Track ${this.id} rebuildEffectChain] Error chaining mono slicer components:`, e); }
        }

        let currentOutputTarget = sourceNodes.length > 0 ? (sourceNodes.length === 1 ? sourceNodes[0] : sourceNodes) : null;

        if ((this.type === 'Sampler' && this.slicerIsPolyphonic) || (this.type === 'Audio' && sourceNodes.length === 0 && this.timelineClips.length > 0)) {
            currentOutputTarget = null;
        }


        this.activeEffects.forEach((effectWrapper, index) => {
            if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
                if (currentOutputTarget) {
                    if (Array.isArray(currentOutputTarget)) {
                        currentOutputTarget.forEach(outNode => {
                            if (outNode && !outNode.disposed) try { outNode.connect(effectWrapper.toneNode); } catch(e){ console.error(`[Track ${this.id}] Error connecting array source to effect ${effectWrapper.type}:`, e); }
                        });
                    } else { 
                        try { currentOutputTarget.connect(effectWrapper.toneNode); } catch(e){ console.error(`[Track ${this.id}] Error connecting single source to effect ${effectWrapper.type}:`, e); }
                    }
                } else {
                }
                currentOutputTarget = effectWrapper.toneNode;
            } else {
                console.warn(`[Track ${this.id} rebuildEffectChain] Effect ${effectWrapper.type} (ID: ${effectWrapper.id}) node is invalid or disposed.`);
            }
        });

        if (currentOutputTarget) {
            if (Array.isArray(currentOutputTarget)) {
                currentOutputTarget.forEach(outNode => {
                    if (outNode && !outNode.disposed) try { outNode.connect(this.gainNode); } catch (e) { console.error(`[Track ${this.id}] Error connecting array effect output to gainNode:`, e); }
                });
            } else {
                try { currentOutputTarget.connect(this.gainNode); } catch (e) { console.error(`[Track ${this.id}] Error connecting single effect output to gainNode:`, e); }
            }
        } else {
            if (this.type === 'Audio' && this.inputChannel && !this.inputChannel.disposed) {
                try { this.inputChannel.connect(this.gainNode); } catch(e) { console.error(`[Track ${this.id}] Error connecting inputChannel to gainNode:`, e); }
            } else {
            }
        }

        if (this.gainNode && !this.gainNode.disposed && this.trackMeter && !this.trackMeter.disposed) {
            try { this.gainNode.connect(this.trackMeter); } catch (e) { console.error(`[Track ${this.id}] Error connecting gainNode to trackMeter:`, e); }
        }

        const masterBusInput = this.appServices.getMasterEffectsBusInputNode ? this.appServices.getMasterEffectsBusInputNode() : null;
        const finalTrackOutput = (this.trackMeter && !this.trackMeter.disposed) ? this.trackMeter : this.gainNode;

        if (finalTrackOutput && !finalTrackOutput.disposed && masterBusInput && !masterBusInput.disposed) {
            try { finalTrackOutput.connect(masterBusInput); } catch (e) { console.error(`[Track ${this.id}] Error connecting final output to masterBusInput:`, e); }
        } else if (finalTrackOutput && !finalTrackOutput.disposed) {
            console.warn(`[Track ${this.id} rebuildEffectChain] Master effects bus input not available. Connecting directly to destination as fallback.`);
            try { finalTrackOutput.toDestination(); } catch (e) { console.error(`[Track ${this.id}] Error connecting final output to destination:`, e); }
        } else {
            console.error(`[Track ${this.id} rebuildEffectChain] CRITICAL: Final track output node is invalid or master bus is unavailable. No output connection made.`);
        }

        // --- Connect to Send Buses (Aux Routing) ---
        // Connect track output to each send bus so that send levels control the amount sent
        const sendTracks = this.appServices.getSendTracks ? this.appServices.getSendTracks() : [];
        sendTracks.forEach(sendTrack => {
            if (this.appServices.connectTrackToSendBus && this.appServices.getSendBusNodes) {
                const sendBusNodes = this.appServices.getSendBusNodes();
                if (sendBusNodes && sendBusNodes.has(sendTrack.id)) {
                    const sendGainNode = this.appServices.connectTrackToSendBus(this.id, sendTrack.id);
                    if (sendGainNode && finalTrackOutput && !finalTrackOutput.disposed) {
                        try { finalTrackOutput.connect(sendGainNode); } catch (e) { /* Ignore if already connected or connection fails */ }
                    }
                }
            }
        });

        this.applyMuteState();
        this.applySoloState();
    }


    addEffect(effectType) {
        this._captureUndoState(`Add ${effectType} to ${this.name}`);
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
        const defaultParams = getEffectDefaultParamsLocal ? getEffectDefaultParamsLocal(effectType) : getEffectDefaultParamsFromRegistry(effectType); 
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
        } else {
            console.warn(`[Track ${this.id}] Could not create Tone.js instance for effect ${effectType}`);
            if (this.appServices.showNotification) this.appServices.showNotification(`Could not create effect: ${effectType}`, 3000);
        }
    }

    removeEffect(effectId) {
        const effectIndex = this.activeEffects.findIndex(e => e.id === effectId);
        this._captureUndoState(`Remove effect from ${this.name}`);
        if (effectIndex > -1) {
            const effectToRemove = this.activeEffects[effectIndex];
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
        this._captureUndoState(`Set ${paramPath} on ${effectWrapper.type} effect on ${this.name}`);

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
                if (paramInstance && typeof paramInstance.value !== 'undefined' && typeof paramInstance.rampTo === 'function') {
                    paramInstance.rampTo(value, 0.02);
                } else if (paramInstance && typeof paramInstance.value !== 'undefined') {
                    paramInstance.value = value;
                } else {
                    targetObject[finalParamKey] = value;
                }
            } else if (typeof targetObject.set === 'function' && keys.length > 0) {
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
        if (oldIndex === newIndex) return;

        this._captureUndoState(`Reorder ${this.activeEffects[oldIndex].type} effect on ${this.name}`);

        const [effectToMove] = this.activeEffects.splice(oldIndex, 1);
        this.activeEffects.splice(newIndex, 0, effectToMove);
        this.rebuildEffectChain();

        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'effectsListChanged');
        }
    }

    async fullyInitializeAudioResources() {
        if (!this.gainNode || this.gainNode.disposed) {
            console.warn(`[Track ${this.id} fullyInitializeAudioResources] GainNode missing or disposed. Attempting to re-initialize audio nodes first.`);
            await this.initializeAudioNodes();
            if (!this.gainNode || this.gainNode.disposed) { 
                console.error(`[Track ${this.id} fullyInitializeAudioResources] CRITICAL: GainNode still invalid after re-initialization. Aborting resource load.`);
                return;
            }
        }

        try {
            if (this.type === 'Synth') {
                await this.initializeInstrument();
            } else if (this.type === 'DrumSampler') {
                for (let i = 0; i < this.drumSamplerPads.length; i++) {
                    const pad = this.drumSamplerPads[i];
                    if (!pad) continue; 
                    if (pad.dbKey || pad.audioBufferDataURL) {
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
                             pad.status = 'error';
                        }
                    }
                }
            } else if (this.type === 'InstrumentSampler') {
                if (this.instrumentSamplerSettings.dbKey || this.instrumentSamplerSettings.audioBufferDataURL) {
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
                this.setupToneSampler();
            }

            if (this.type === 'Audio') {
                 if ((!this.inputChannel || this.inputChannel.disposed)) {
                    await this.initializeAudioNodes();
                 }
                 for (const clip of this.timelineClips) {
                     if (clip.type === 'audio' && clip.sourceId && (!clip.audioBuffer || clip.audioBuffer.disposed)) {
                         try {
                             const audioBlob = await getAudio(clip.sourceId);
                             if (audioBlob) {
                                 const url = URL.createObjectURL(audioBlob);
                                 URL.revokeObjectURL(url); 
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
            if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sampleLoadError');
        }

        if (this.type !== 'Audio') {
            this.recreateToneSequence(true);
        }
        this.rebuildEffectChain();
    }


    async initializeInstrument() { 
        if (this.type === 'Synth') {
            if (this.instrument && !this.instrument.disposed) {
                try { this.instrument.dispose(); } catch(e) { console.warn(`[Track ${this.id}] Error disposing old synth instrument:`, e.message); }
            }
            try {
                this.instrument = new Tone.MonoSynth(this.synthParams);
            } catch (error) {
                console.error(`[Track ${this.id} initializeInstrument] Error creating MonoSynth:`, error);
                if (this.appServices.showNotification) this.appServices.showNotification(`Error creating synth for track ${this.name}.`, 3000);
                this.instrument = null; 
            }
        }
    }

    setupSlicerMonoNodes() {
        this.disposeSlicerMonoNodes();
        if (this.type === 'Sampler' && !this.slicerIsPolyphonic) {
            try {
                this.slicerMonoPlayer = new Tone.Player();
                this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
                this.slicerMonoGain = new Tone.Gain();
                this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
                if (this.audioBuffer && this.audioBuffer.loaded) {
                    this.slicerMonoPlayer.buffer = this.audioBuffer;
                }
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

    setupToneSampler() { 
        if (this.type === 'InstrumentSampler') {
            if (this.toneSampler && !this.toneSampler.disposed) {
                try { this.toneSampler.dispose(); } catch(e){ console.warn(`[Track ${this.id}] Error disposing old Tone.Sampler:`, e.message); }
            }
            this.toneSampler = null; 

            if (this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
                const urls = {};
                const rootNote = this.instrumentSamplerSettings.rootNote || 'C4';
                urls[rootNote] = this.instrumentSamplerSettings.audioBuffer;
                try {
                    this.toneSampler = new Tone.Sampler({
                        urls: urls,
                        attack: this.instrumentSamplerSettings.envelope.attack,
                        release: this.instrumentSamplerSettings.envelope.release,
                        baseUrl: '', 
                        onload: () => {
                            if (this.toneSampler && !this.toneSampler.disposed) {
                                this.toneSampler.loop = this.instrumentSamplerSettings.loop;
                                this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart;
                                this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd;
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

    setVolume(volume, fromInteraction = false) { 
        if (!fromInteraction) this._captureUndoState(`Set volume on ${this.name}`);
        this.previousVolumeBeforeMute = Math.max(0, Math.min(parseFloat(volume) || 0, 1.5)); 
        if (this.gainNode && !this.gainNode.disposed && !this.isMuted) {
            try {
                this.gainNode.gain.setValueAtTime(this.previousVolumeBeforeMute, Tone.now());
            } catch (e) { console.error(`[Track ${this.id}] Error setting gainNode volume:`, e); }
        }
    }

    setTrackColor(color) {
        this._captureUndoState(`Set color on ${this.name}`);
        this.color = color;
        if (this.appServices.renderTimeline) {
            this.appServices.renderTimeline();
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
    }

    getTrackColor() {
        return this.color;
    }

    applyMuteState() {
        if (this.gainNode && !this.gainNode.disposed) {
            const currentSoloedId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
            const isEffectivelyMuted = this.isMuted || (currentSoloedId !== null && currentSoloedId !== this.id);
            const targetVolume = isEffectivelyMuted ? 0 : this.previousVolumeBeforeMute;
            try {
                this.gainNode.gain.cancelScheduledValues(Tone.now());
                this.gainNode.gain.rampTo(targetVolume, 0.01); 
            } catch (e) { console.error(`[Track ${this.id}] Error applying mute state to gainNode:`, e); }
        } else {
            console.warn(`[Track ${this.id} applyMuteState] GainNode not available or disposed.`);
        }
    }

    applySoloState() {
        this.applyMuteState(); 
    }

    setSynthParam(paramPath, value) {
        this._captureUndoState(`Set ${paramPath} on ${this.name}`);
        if (!this.instrument || this.instrument.disposed) {
            console.warn(`[Track ${this.id} setSynthParam] Synth instrument not available or disposed for param "${paramPath}".`);
            return;
        }
        try {
            const keys = paramPath.split('.');
            let target = this.instrument;
            let paramsTarget = this.synthParams;

            for (let i = 0; i < keys.length - 1; i++) {
                if (target && typeof target[keys[i]] !== 'undefined') {
                    target = target[keys[i]];
                } else {
                    console.warn(`[Track ${this.id} setSynthParam] Path part "${keys[i]}" not found on Tone instrument for "${paramPath}".`);
                    return; 
                }
                paramsTarget[keys[i]] = paramsTarget[keys[i]] || {};
                paramsTarget = paramsTarget[keys[i]];
            }
            const finalKey = keys[keys.length - 1];

            paramsTarget[finalKey] = value; 

            if (target && typeof target[finalKey] !== 'undefined') {
                if (target[finalKey] && typeof target[finalKey].setValueAtTime === 'function') {
                    target[finalKey].setValueAtTime(value, Tone.now());
                } else if (target[finalKey] && typeof target[finalKey].value !== 'undefined') {
                     target[finalKey].value = value;
                } else {
                    target[finalKey] = value;
                }
            } else if (target && typeof target.set === 'function') {
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
        this._captureUndoState(`Set slice ${sliceIndex+1} volume on ${this.name}`);
        if (this.slices && this.slices[sliceIndex]) this.slices[sliceIndex].volume = parseFloat(volume);
    }
    setSlicePitchShift(sliceIndex, semitones) {
        this._captureUndoState(`Set slice ${sliceIndex+1} pitch on ${this.name}`);
        if (this.slices && this.slices[sliceIndex]) this.slices[sliceIndex].pitchShift = parseInt(semitones);
    }
    setSliceLoop(sliceIndex, loop) {
        this._captureUndoState(`Set slice ${sliceIndex+1} loop on ${this.name}`);
        if (this.slices && this.slices[sliceIndex]) this.slices[sliceIndex].loop = !!loop;
    }
    setSliceReverse(sliceIndex, reverse) {
        this._captureUndoState(`Set slice ${sliceIndex+1} reverse on ${this.name}`);
        if (this.slices && this.slices[sliceIndex]) this.slices[sliceIndex].reverse = !!reverse;
    }
    setSliceEnvelopeParam(sliceIndex, param, value) {
        this._captureUndoState(`Set slice ${sliceIndex+1} envelope on ${this.name}`);
        if (this.slices && this.slices[sliceIndex] && this.slices[sliceIndex].envelope) {
            this.slices[sliceIndex].envelope[param] = parseFloat(value);
        }
    }

    setDrumSamplerPadVolume(padIndex, volume) {
        this._captureUndoState(`Set pad ${padIndex+1} volume on ${this.name}`);
        if (this.drumSamplerPads && this.drumSamplerPads[padIndex]) this.drumSamplerPads[padIndex].volume = parseFloat(volume);
    }
    setDrumSamplerPadPitch(padIndex, pitch) {
        this._captureUndoState(`Set pad ${padIndex+1} pitch on ${this.name}`);
        if (this.drumSamplerPads && this.drumSamplerPads[padIndex]) this.drumSamplerPads[padIndex].pitchShift = parseInt(pitch);
    }
    setDrumSamplerPadEnv(padIndex, param, value) {
        this._captureUndoState(`Set pad ${padIndex+1} envelope on ${this.name}`);
        if (this.drumSamplerPads && this.drumSamplerPads[padIndex] && this.drumSamplerPads[padIndex].envelope) {
            this.drumSamplerPads[padIndex].envelope[param] = parseFloat(value);
        }
    }

    setInstrumentSamplerRootNote(noteName) {
        this._captureUndoState(`Set root note on ${this.name}`);
        if (this.instrumentSamplerSettings) {
            this.instrumentSamplerSettings.rootNote = noteName;
            this.setupToneSampler();
        }
    }
    setInstrumentSamplerLoop(loop) {
        this._captureUndoState(`Toggle loop on ${this.name}`);
        if (this.instrumentSamplerSettings) {
            this.instrumentSamplerSettings.loop = !!loop;
            if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.loop = this.instrumentSamplerSettings.loop;
        }
    }
    setInstrumentSamplerLoopStart(time) {
        this._captureUndoState(`Set loop start on ${this.name}`);
        if (this.instrumentSamplerSettings) {
            this.instrumentSamplerSettings.loopStart = parseFloat(time) || 0;
            if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart;
        }
    }
    setInstrumentSamplerLoopEnd(time) {
        this._captureUndoState(`Set loop end on ${this.name}`);
        if (this.instrumentSamplerSettings) {
            this.instrumentSamplerSettings.loopEnd = parseFloat(time) || 0;
            if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd;
        }
    }
    setInstrumentSamplerEnv(param, value) {
        this._captureUndoState(`Set ${param} envelope on ${this.name}`);
        if (this.instrumentSamplerSettings && this.instrumentSamplerSettings.envelope) {
            this.instrumentSamplerSettings.envelope[param] = parseFloat(value);
            if (this.toneSampler && !this.toneSampler.disposed) {
                if (param === 'attack' && typeof this.toneSampler.attack !== 'undefined') this.toneSampler.attack = value;
                if (param === 'release' && typeof this.toneSampler.release !== 'undefined') this.toneSampler.release = value;
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

    createNewSequence(name = `Sequence ${this.sequences.length + 1}`, initialLengthSteps = Constants.defaultStepsPerBar, skipUndo = false) {
        if (this.type === 'Audio') return null;
        const newSeqId = `seq_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        let numRowsForGrid;

        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRowsForGrid = Constants.synthPitches.length;
        else if (this.type === 'Sampler') numRowsForGrid = (this.slices && this.slices.length > 0) ? this.slices.length : Constants.numSlices;
        else if (this.type === 'DrumSampler') numRowsForGrid = Constants.numDrumSamplerPads;
        else numRowsForGrid = 1;

        if (numRowsForGrid <= 0) {
             console.warn(`[Track ${this.id} createNewSequence] numRowsForGrid was <= 0 for type ${this.type} (calculated ${numRowsForGrid}), defaulting to 1.`);
             numRowsForGrid = 1;
        }
        const actualLength = Math.max(Constants.STEPS_PER_BAR, initialLengthSteps);

        const newSequence = {
            id: newSeqId,
            name: name,
            data: Array(numRowsForGrid).fill(null).map(() => Array(actualLength).fill(null)),
            length: actualLength
        };
        this.sequences.push(newSequence);
        this.activeSequenceId = newSeqId;
        this.recreateToneSequence(true);
        if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        if (!skipUndo) this._captureUndoState(`Create Sequence "${name}" on ${this.name}`);
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
                this.activeSequenceId = this.sequences[0]?.id || null;
            }
            this.recreateToneSequence(true);
            this.timelineClips = this.timelineClips.filter(clip => clip.type !== 'sequence' || clip.sourceSequenceId !== sequenceId);
            if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
            if (this.appServices.renderTimeline) this.appServices.renderTimeline();
        } else {
            console.warn(`[Track ${this.id}] Sequence ID ${sequenceId} not found for deletion.`);
        }
    }

    renameSequence(sequenceId, newName) {
        if (this.type === 'Audio') return;
        const sequence = this.sequences ? this.sequences.find(s => s.id === sequenceId) : null;
        if (sequence && typeof newName === 'string' && newName.trim() !== "") {
            const oldName = sequence.name;
            if (oldName === newName.trim()) return; 
            this._captureUndoState(`Rename sequence "${oldName}" to "${newName.trim()}" on ${this.name}`);
            sequence.name = newName.trim();
            if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
            if (this.appServices.renderTimeline) this.appServices.renderTimeline();
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
            data: JSON.parse(JSON.stringify(originalSequence.data || [])),
            length: originalSequence.length
        };
        this.sequences.push(newSequence);
        this._captureUndoState(`Duplicate sequence "${originalSequence.name}" on ${this.name}`);
        if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        return newSequence;
    }


    setActiveSequence(sequenceId) {
        this._captureUndoState(`Switch sequence on ${this.name}`);
        if (this.type === 'Audio') return;
        const seq = this.sequences ? this.sequences.find(s => s.id === sequenceId) : null;
        if (seq && this.activeSequenceId !== sequenceId) {
            this.activeSequenceId = sequenceId;
            this.recreateToneSequence(true);
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

        activeSeq.data = activeSeq.data || []; 
        activeSeq.data.forEach(row => {
            if (row && Array.isArray(row)) {
               const copyOfOriginal = row.slice(0, oldLength);
               row.length = newLength;
               for(let i = oldLength; i < newLength; i++) row[i] = null; 
               for(let i = 0; i < oldLength; i++) { 
                   if (copyOfOriginal[i]) row[oldLength + i] = JSON.parse(JSON.stringify(copyOfOriginal[i]));
               }
            }
        });
        activeSeq.length = newLength;
        this.recreateToneSequence(true);
        if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
    }

    shiftSequenceNotes(semitones) {
        if (this.type === 'Audio') return 0;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data) {
            console.warn(`[Track ${this.id} shiftSequenceNotes] No active sequence found.`);
            return 0;
        }

        let shiftedCount = 0;
        const numRows = activeSeq.data.length;
        const totalSteps = activeSeq.length;

        // Determine row shift based on track type
        let rowShift = 0;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') {
            rowShift = -semitones; // Higher pitch = lower row index
        } else {
            // For Sampler/DrumSampler, just return 0 (can't meaningfully shift pads)
            return 0;
        }

        if (rowShift === 0) return 0;

        const newData = activeSeq.data.map((row, rowIndex) => {
            const newRow = Array(totalSteps).fill(null);
            for (let col = 0; col < totalSteps; col++) {
                const stepData = row && row[col];
                if (stepData && stepData.active) {
                    const sourceRow = rowIndex + rowShift;
                    if (sourceRow >= 0 && sourceRow < numRows) {
                        newRow[col] = { ...stepData };
                        shiftedCount++;
                    }
                }
            }
            return newRow;
        });

        activeSeq.data = newData;
        this._captureUndoState(`Shift Notes ${semitones > 0 ? 'Down' : 'Up'} on ${activeSeq.name}`);
        return shiftedCount;
    }

    humanizeVelocity(amount = 0.15) {
        if (this.type === 'Audio') return 0;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data) {
            console.warn(`[Track ${this.id} humanizeVelocity] No active sequence found.`);
            return 0;
        }

        let humanizedCount = 0;
        const totalSteps = activeSeq.length;

        activeSeq.data.forEach(row => {
            if (!row) return;
            for (let col = 0; col < totalSteps; col++) {
                const stepData = row[col];
                if (stepData && stepData.active && stepData.velocity !== undefined) {
                    const variation = (Math.random() * 2 - 1) * amount; // -amount to +amount
                    const newVelocity = Math.max(0.05, Math.min(1.0, stepData.velocity + variation));
                    row[col].velocity = Math.round(newVelocity * 100) / 100; // Round to 2 decimal places
                    humanizedCount++;
                }
            }
        });

        return humanizedCount;
    }

    /**
     * Arpeggiate the pattern - creates an arpeggio from existing notes.
     * @param {string} mode - Arpeggio mode: 'up', 'down', 'updown', 'downup', 'random', 'converge', 'diverge'
     * @param {number} rate - Note rate: 8 (1/8), 16 (1/16), 32 (1/32)
     * @param {number} octaves - Number of octaves to span (1-4)
     * @returns {number} Number of notes created in the arpeggio
     */
    arpeggiatePattern(mode = 'up', rate = 16, octaves = 1) {
        if (this.type === 'Audio') return 0;
        if (this.type !== 'Synth' && this.type !== 'InstrumentSampler') {
            if (this.appServices.showNotification) {
                this.appServices.showNotification('Arpeggiator only works on Synth and InstrumentSampler tracks.', 3000);
            }
            return 0;
        }
        
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data) {
            console.warn(`[Track ${this.id} arpeggiatePattern] No active sequence found.`);
            return 0;
        }

        this._captureUndoState(`Arpeggiate pattern on ${activeSeq.name}`);
        
        const totalSteps = activeSeq.length;
        const numRows = activeSeq.data.length;
        
        // Find all active notes to build the chord
        const activeNotes = [];
        for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
            const row = activeSeq.data[rowIndex];
            if (!row) continue;
            
            for (let col = 0; col < totalSteps; col++) {
                const cell = row[col];
                if (cell && cell.active) {
                    // Check if this is the start of a note (not a continuation of a longer note)
                    // A note starts at column C if there's no active note at column C-1, or if the note at column C-1 has a length that doesn't reach column C
                    const prevStep = col > 0 ? sequenceDataForTone[rowIndex]?.[col - 1] : null;
                    const isNoteStart = !prevStep?.active || (prevStep.length !== undefined && prevStep.length <= 1);
                    
                    if (isNoteStart) {
                        // Calculate duration based on note length (in 16th note steps)
                        const noteLength = step.length || 1;
                        const sixteenthNoteDuration = Tone.Time("16n").toSeconds();
                        const noteDuration = noteLength * sixteenthNoteDuration;
                        
                        this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), noteDuration, time, step.velocity * Constants.defaultVelocity);
                    }
                    notePlayedThisStep = true;
                }
            }
        }
    }

    // Set the length (in steps) of a note at a specific row/col
    setNoteLength(row, col, lengthInSteps) {
        if (this.type === 'Audio') return false;
        if (this.type === 'DrumSampler') return false;
        
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data) return false;
        
        const stepData = activeSeq.data[row]?.[col];
        if (!stepData || !stepData.active) return false;
        
        const clamped = Math.max(1, Math.min(lengthInSteps, activeSeq.length - col));
        if (stepData.length === clamped) return false; // No change
        
        this._captureUndoState(`Set note length on ${this.name}`);
        
        stepData.length = clamped;
        
        this.recreateToneSequence(true);
        
        if (this.appServices.showNotification) {
            this.appServices.showNotification(`Note length set to ${clamped} step${clamped > 1 ? 's' : ''}.`, 1500);
        }
        
        return true;
    }

    // Get the length (in steps) of a note at a specific row/col
    getNoteLength(row, col) {
        if (this.type === 'Audio') return 1;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data) return 1;
        const stepData = activeSeq.data[row]?.[col];
        if (!stepData || !stepData.active) return 0;
        return stepData.length || 1;
    }

    // Set the probability of a note at a specific row/col (0.0 to 1.0)
    setNoteProbability(row, col, probability) {
        if (this.type === 'Audio') return false;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data) return false;
        
        const stepData = activeSeq.data[row]?.[col];
        if (!stepData || !stepData.active) return false;
        
        const clamped = Math.max(0, Math.min(1, probability));
        if (stepData.probability === clamped) return false; // No change
        
        this._captureUndoState(`Set note probability on ${this.name}`);
        stepData.probability = clamped;
        
        this.recreateToneSequence(true);
        return true;
    }

    // Get the probability of a note at a specific row/col
    getNoteProbability(row, col) {
        if (this.type === 'Audio') return 1.0;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data) return 1.0;
        const stepData = activeSeq.data[row]?.[col];
        if (!stepData || !stepData.active) return 1.0;
        return stepData.probability !== undefined ? stepData.probability : 1.0;
    }

    quantizeSequence(quantizeTo = 16) {
        if (this.type === 'Audio') return 0;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data) {
            console.warn(`[Track ${this.id} quantizeSequence] No active sequence found.`);
            return 0;
        }

        this._captureUndoState(`Quantize Sequence ${activeSeq.name}`);
        
        let quantizedCount = 0;
        const totalSteps = activeSeq.length;

        // For each step, find the nearest quantizeTo grid point and move the note there
        // If a note is at column C and quantizeTo=N, the snapped column is Math.round(C/N)*N
        activeSeq.data.forEach(row => {
            if (!row) return;
            for (let col = 0; col < totalSteps; col++) {
                const stepData = row[col];
                if (stepData && stepData.active) {
                    const sourceRow = row;
                    const sourceCol = col;
                    const snappedCol = Math.round(col / quantizeTo) * quantizeTo;
                    if (snappedCol !== col) {
                        row[sourceCol] = null; 
                        row[snappedCol] = { ...stepData };
                        quantizedCount++;
                    }
                }
            }
        });

        // Simpler approach: for each note, snap its column in place
        let snappedCount = 0;
        const notesToMove = []; // Collect {row, oldCol, data} to move after iteration
        activeSeq.data.forEach((row, rowIndex) => {
            if (!row) return;
            for (let col = 0; col < totalSteps; col++) {
                const stepData = row[col];
                if (stepData && stepData.active) {
                    // Check if this is the start of a note
                    const prevStep = col > 0 ? sequenceDataForTone[rowIndex]?.[col - 1] : null;
                    const isNoteStart = !prevStep?.active || (prevStep.length !== undefined && prevStep.length <= 1);
                    
                    if (isNoteStart) {
                        // Calculate duration based on note length
                        const noteLength = step.length || 1;
                        const sixteenthNoteDuration = Tone.Time("16n").toSeconds();
                        const noteDuration = noteLength * sixteenthNoteDuration;
                        
                        this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), noteDuration, time, step.velocity * Constants.defaultVelocity);
                    }
                    notePlayedThisStep = true;
                }
            }
        });

        // Clear original positions
        notesToMove.forEach(({ rowIndex, fromCol }) => {
            if (activeSeq.data[rowIndex]) {
                activeSeq.data[rowIndex][fromCol] = null;
            }
        });

        // Place at snapped positions (if collisions, first note wins)
        notesToMove.forEach(({ toCol, data, rowIndex }) => {
            if (activeSeq.data[rowIndex] && !activeSeq.data[rowIndex][toCol]) {
                activeSeq.data[rowIndex][toCol] = data;
                snappedCount++;
            } else {
                // Find nearest free slot
                let placed = false;
                for (let delta = 1; delta < quantizeTo; delta++) {
                    const down = toCol - delta;
                    const up = toCol + delta;
                    if (down >= 0 && activeSeq.data[rowIndex] && !activeSeq.data[rowIndex][down]) {
                        activeSeq.data[rowIndex][down] = data;
                        placed = true;
                        snappedCount++;
                        break;
                    }
                    if (up < totalSteps && activeSeq.data[rowIndex] && !activeSeq.data[rowIndex][up]) {
                        activeSeq.data[rowIndex][up] = data;
                        placed = true;
                        snappedCount++;
                        break;
                    }
                }
            }
        });

        return snappedCount;
    }

    copySequenceSection(startCol, endCol) {
        if (this.type === 'Audio') return null;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data) {
            console.warn(`[Track ${this.id} copySequenceSection] No active sequence found.`);
            return null;
        }

        const sectionData = [];
        for (let rowIndex = 0; rowIndex < activeSeq.data.length; rowIndex++) {
            const row = activeSeq.data[rowIndex];
            if (!row) continue;
            const newRow = [];
            for (let col = startCol; col <= endCol; col++) {
                if (col >= 0 && col < row.length) {
                    newRow.push(row[col]);
                } else {
                    newRow.push(null);
                }
            }
            sectionData.push(newRow);
        }

        return sectionData;
    }

    cutSequenceSection(startCol, endCol) {
        if (this.type === 'Audio') return null;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data) {
            console.warn(`[Track ${this.id} cutSequenceSection] No active sequence found.`);
            return null;
        }

        const sectionData = [];
        for (let rowIndex = 0; rowIndex < activeSeq.data.length; rowIndex++) {
            const row = activeSeq.data[rowIndex];
            if (!row) continue;
            const newRow = [];
            for (let col = startCol; col <= endCol; col++) {
                if (col >= 0 && col < row.length) {
                    newRow.push(row[col]);
                    row[col] = null;
                } else {
                    newRow.push(null);
                }
            }
            sectionData.push(newRow);
        }

        return sectionData;
    }

    pasteSequenceSection(sectionData, targetCol, skipUndo = false) {
        if (this.type === 'Audio') return 0;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data || !sectionData) {
            console.warn(`[Track ${this.id} pasteSequenceSection] No active sequence or no section data.`);
            return 0;
        }

        let pastedCount = 0;
        const sectionNumRows = sectionData.length;
        const sectionLength = sectionData[0]?.length || 0;

        for (let rowIndex = 0; rowIndex < activeSeq.data.length; rowIndex++) {
            const targetRow = activeSeq.data[rowIndex];
            if (!targetRow) continue;

            const sourceRowIndex = rowIndex < sectionNumRows ? rowIndex : (sectionNumRows > 1 ? sectionNumRows - 1 : 0);
            const sourceRow = sectionData[sourceRowIndex];
            if (!sourceRow) continue;

            for (let colIndex = 0; colIndex < sectionLength; colIndex++) {
                const targetColIndex = targetCol + colIndex;
                if (targetColIndex < 0 || targetColIndex >= targetRow.length) continue;
                const noteData = sourceRow[colIndex];
                if (noteData && noteData.active) {
                    if (!targetRow[targetColIndex] || !targetRow[targetColIndex].active) {
                        pastedCount++;
                    }
                    targetRow[targetColIndex] = JSON.parse(JSON.stringify(noteData));
                } else {
                    if (targetColIndex >= 0 && targetColIndex < targetRow.length) {
                        targetRow[targetColIndex] = null;
                    }
                }
            }
        }

        return pastedCount;
    }

    // --- Pattern Operations ---
    
    /**
     * Randomize the pattern by randomly activating notes with a given density.
     * @param {number} density - Probability of each note being active (0 to 1)
     * @returns {number} Number of notes activated
     */
    randomizePattern(density = 0.3) {
        if (this.type === 'Audio') return 0;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data) {
            console.warn(`[Track ${this.id} randomizePattern] No active sequence found.`);
            return 0;
        }

        this._captureUndoState(`Randomize pattern on ${activeSeq.name}`);
        
        let activatedCount = 0;
        const totalSteps = activeSeq.length;
        const numRows = activeSeq.data.length;
        const clampedDensity = Math.max(0, Math.min(1, density));

        for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
            const row = activeSeq.data[rowIndex];
            if (!row) continue;
            
            for (let col = 0; col < totalSteps; col++) {
                if (Math.random() < clampedDensity) {
                    // Create a note
                    row[col] = {
                        active: true,
                        velocity: Constants.defaultVelocity + (Math.random() * 0.2 - 0.1), // Slight velocity variation
                        length: 1
                    };
                    activatedCount++;
                } else {
                    row[col] = null;
                }
            }
        }

        this.recreateToneSequence(true);
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
        return activatedCount;
    }

    /**
     * Shift all notes one step to the left. Notes at column 0 are removed.
     * @returns {number} Number of notes shifted
     */
    shiftPatternLeft() {
        if (this.type === 'Audio') return 0;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data) {
            console.warn(`[Track ${this.id} shiftPatternLeft] No active sequence found.`);
            return 0;
        }

        this._captureUndoState(`Shift pattern left on ${activeSeq.name}`);
        
        let shiftedCount = 0;
        const totalSteps = activeSeq.length;
        const numRows = activeSeq.data.length;

        for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
            const row = activeSeq.data[rowIndex];
            if (!row) continue;
            
            // Count notes that will be lost at column 0
            let lostCount = 0;
            if (row[0] && row[0].active) lostCount++;
            
            // Shift all notes left by one
            for (let col = 0; col < totalSteps - 1; col++) {
                row[col] = row[col + 1];
                if (row[col] && row[col].active) shiftedCount++;
            }
            row[totalSteps - 1] = null; // Clear the last column
        }

        this.recreateToneSequence(true);
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
        return shiftedCount;
    }

    /**
     * Shift all notes one step to the right. Notes at the last column are removed.
     * @returns {number} Number of notes shifted
     */
    shiftPatternRight() {
        if (this.type === 'Audio') return 0;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data) {
            console.warn(`[Track ${this.id} shiftPatternRight] No active sequence found.`);
            return 0;
        }

        this._captureUndoState(`Shift pattern right on ${activeSeq.name}`);
        
        let shiftedCount = 0;
        const totalSteps = activeSeq.length;
        const numRows = activeSeq.data.length;

        for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
            const row = activeSeq.data[rowIndex];
            if (!row) continue;
            
            // Shift all notes right by one (iterate from end to start)
            for (let col = totalSteps - 1; col > 0; col--) {
                row[col] = row[col - 1];
                if (row[col] && row[col].active) shiftedCount++;
            }
            row[0] = null; // Clear the first column
        }

        this.recreateToneSequence(true);
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
        return shiftedCount;
    }

    /**
     * Mirror the pattern horizontally (reverse the order of columns).
     * @returns {boolean} Success
     */
    mirrorPatternHorizontal() {
        if (this.type === 'Audio') return false;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data) {
            console.warn(`[Track ${this.id} mirrorPatternHorizontal] No active sequence found.`);
            return false;
        }

        this._captureUndoState(`Mirror pattern horizontally on ${activeSeq.name}`);
        
        const numRows = activeSeq.data.length;
        const totalSteps = activeSeq.length;

        for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
            const row = activeSeq.data[rowIndex];
            if (!row) continue;
            
            // Reverse the row
            const reversed = row.slice().reverse();
            // Copy back
            for (let col = 0; col < totalSteps; col++) {
                row[col] = reversed[col];
            }
        }

        this.recreateToneSequence(true);
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
        return true;
    }

    /**
     * Mirror the pattern vertically (reverse the order of rows).
     * Only meaningful for Synth and InstrumentSampler tracks where rows represent pitch.
     * @returns {boolean} Success
     */
    mirrorPatternVertical() {
        if (this.type === 'Audio') return false;
        if (this.type !== 'Synth' && this.type !== 'InstrumentSampler') {
            if (this.appServices.showNotification) {
                this.appServices.showNotification('Vertical mirror only works on Synth tracks.', 2000);
            }
            return false;
        }
        
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data) {
            console.warn(`[Track ${this.id} mirrorPatternVertical] No active sequence found.`);
            return false;
        }

        this._captureUndoState(`Mirror pattern vertically on ${activeSeq.name}`);
        
        // Reverse the entire data array (rows)
        const numRows = activeSeq.data.length;
        const reversedData = activeSeq.data.slice().reverse();
        
        for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
            activeSeq.data[rowIndex] = reversedData[rowIndex];
        }

        this.recreateToneSequence(true);
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
        return true;
    }

    /**
     * Humanize the pattern by adding slight random variations to velocity.
     * Makes patterns sound less robotic and more natural.
     * @param {number} intensity - How much variation to apply (0-1)
     * @returns {number} Number of notes humanized
     */
    humanizePattern(intensity = 0.3) {
        if (this.type === 'Audio') return 0;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data) {
            console.warn(`[Track ${this.id} humanizePattern] No active sequence found.`);
            return 0;
        }

        this._captureUndoState(`Humanize pattern on ${activeSeq.name}`);
        
        let humanizedCount = 0;
        const totalSteps = activeSeq.length;
        const numRows = activeSeq.data.length;
        const clampedIntensity = Math.max(0, Math.min(1, intensity));
        const velocityRange = clampedIntensity * 0.3; // Max 0.3 variation at full intensity

        for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
            const row = activeSeq.data[rowIndex];
            if (!row) continue;
            
            for (let col = 0; col < totalSteps; col++) {
                const cell = row[col];
                if (cell && cell.active) {
                    // Calculate beat position (0-15 within a bar for 16ths)
                    const beatPosition = col % Constants.STEPS_PER_BAR;
                    const isDownbeat = beatPosition === 0;
                    const isStrongBeat = beatPosition % 4 === 0;
                    
                    // Apply random velocity variation
                    let velocityDelta = (Math.random() * 2 - 1) * velocityRange;
                    
                    // Apply the variation
                    const baseVelocity = cell.velocity !== undefined ? cell.velocity : Constants.defaultVelocity;
                    let newVelocity = baseVelocity + velocityDelta;
                    
                    // Clamp velocity to valid range (0.1 to 1.0)
                    newVelocity = Math.max(0.1, Math.min(1.0, newVelocity));
                    
                    cell.velocity = newVelocity;
                    humanizedCount++;
                }
            }
        }

        this.recreateToneSequence(true);
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
        return humanizedCount;
    }

    // Note Repeat / Roll - Creates a roll by repeating a note at a specific position across multiple consecutive steps with optional velocity fade (decrescendo). This is useful for creating drum rolls or rapid note repetitions
    noteRepeat(row, startCol, count, fadeAmount = 0) {
        if (this.type === 'Audio') return 0;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data) {
            console.warn(`[Track ${this.id} noteRepeat] No active sequence found.`);
            return 0;
        }

        // Validate parameters
        const numRows = activeSeq.data.length;
        const totalSteps = activeSeq.length;
        
        // Clamp row to valid range
        const validRow = Math.max(0, Math.min(row, numRows - 1));
        // Clamp startCol to valid range
        const validStartCol = Math.max(0, Math.min(startCol, totalSteps - 1));
        // Clamp count to remaining steps
        const validCount = Math.max(1, Math.min(count, totalSteps - validStartCol));
        // Clamp fadeAmount to 0-1
        const validFade = Math.max(0, Math.min(1, fadeAmount));

        // Check if there's a note at the specified position
        const sourceNote = activeSeq.data[validRow]?.[validStartCol];
        if (!sourceNote || !sourceNote.active) {
            // If no note at the position, create a new note with default velocity
            this._captureUndoState(`Note Repeat on ${activeSeq.name}`);
            
            const baseVelocity = Constants.defaultVelocity;
            
            for (let i = 0; i < validCount; i++) {
                const col = validStartCol + i;
                if (col >= totalSteps) break;
                
                // Calculate velocity with optional fade
                let velocity = baseVelocity;
                if (validFade > 0 && i > 0) {
                    const fadeProgress = i / (validCount - 1 || 1);
                    velocity = baseVelocity * (1 - validFade * fadeProgress);
                }
                
                // Ensure the row exists
                if (!activeSeq.data[validRow]) {
                    activeSeq.data[validRow] = Array(totalSteps).fill(null);
                }
                
                activeSeq.data[validRow][col] = {
                    active: true,
                    velocity: Math.max(0.1, velocity)
                };
            }
        } else {
            // Repeat an existing note
            this._captureUndoState(`Note Repeat on ${activeSeq.name}`);
            
            const baseVelocity = sourceNote.velocity !== undefined ? sourceNote.velocity : Constants.defaultVelocity;
            
            for (let i = 0; i < validCount; i++) {
                const col = validStartCol + i;
                if (col >= totalSteps) break;
                
                // Calculate velocity with optional fade
                let velocity = baseVelocity;
                if (validFade > 0 && i > 0) {
                    const fadeProgress = i / (validCount - 1 || 1);
                    velocity = baseVelocity * (1 - validFade * fadeProgress);
                }
                
                // Ensure the row exists
                if (!activeSeq.data[validRow]) {
                    activeSeq.data[validRow] = Array(totalSteps).fill(null);
                }
                
                activeSeq.data[validRow][col] = {
                    active: true,
                    velocity: Math.max(0.1, velocity)
                };
            }
        }

        this.recreateToneSequence(true);
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
        return validCount;
    }

    setSequenceLength(newLengthInSteps, skipUndoCapture = false) {
        if (this.type === 'Audio') return;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq) {
            console.warn(`[Track ${this.id} setSequenceLength] No active sequence to set length for.`);
            return;
        }

        let validatedNewLength = Math.max(Constants.STEPS_PER_BAR, parseInt(newLengthInSteps) || Constants.defaultStepsPerBar);
        validatedNewLength = Math.ceil(validatedNewLength / Constants.STEPS_PER_BAR) * Constants.STEPS_PER_BAR;
        validatedNewLength = Math.min(validatedNewLength, Constants.MAX_BARS * Constants.STEPS_PER_BAR);

        if (activeSeq.length === validatedNewLength) return; 

        if (!skipUndoCapture) {
            this._captureUndoState(`Set Seq Length for "${activeSeq.name}" on ${this.name} to ${validatedNewLength / Constants.STEPS_PER_BAR} bars`);
        }
        activeSeq.length = validatedNewLength;

        let numRows;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRows = Constants.synthPitches.length;
        else if (this.type === 'Sampler') numRows = (this.slices && this.slices.length > 0) ? this.slices.length : Constants.numSlices;
        else if (this.type === 'DrumSampler') numRows = Constants.numDrumSamplerPads;
        else numRows = (activeSeq.data && activeSeq.data.length > 0) ? activeSeq.data.length : 1;

        if (numRows <= 0) numRows = 1; 

        const currentSequenceData = activeSeq.data || [];
        activeSeq.data = Array(numRows).fill(null).map((_, rIndex) => {
            const currentRow = currentSequenceData[rIndex] || [];
            const newRow = Array(activeSeq.length || Constants.defaultStepsPerBar).fill(null);
            for (let c = 0; c < Math.min(currentRow.length, activeSeq.length); c++) newRow[c] = currentRow[c];
            return newRow;
        });

        this.recreateToneSequence(true);
        if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
    }


    recreateToneSequence(forceRestart = false, startTimeOffset = 0) {
        if (this.type === 'Audio') return;
        const currentPlaybackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';

        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            try {
                this.patternPlayerSequence.stop();
                this.patternPlayerSequence.clear();
                this.patternPlayerSequence.dispose();
            } catch(e) { console.warn(`[Track ${this.id}] Error disposing old Tone.Sequence:`, e.message); }
        }
        this.patternPlayerSequence = null; 

        if (currentPlaybackMode !== 'sequencer') {
            return;
        }

        const activeSeq = this.getActiveSequence();
        if (!activeSeq) {
            console.warn(`[Track ${this.id} recreateToneSequence] No active sequence (ID: ${this.activeSequenceId}). Aborting.`);
            return;
        }
        if (!activeSeq.data || !Array.isArray(activeSeq.data) || activeSeq.data.length === 0) {
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
            activeSeq.length = Constants.defaultStepsPerBar;
            console.warn(`[Track ${this.id} recreateToneSequence] Active sequence "${activeSeq.name}" had invalid length. Reset to ${activeSeq.length}.`);
            activeSeq.data.forEach(row => { if(row) row.length = activeSeq.length; });
        }

        const sequenceDataForTone = activeSeq.data;
        const sequenceLengthForTone = activeSeq.length;

        try {
            this.patternPlayerSequence = new Tone.Sequence((time, col) => {
                const playbackModeCheck = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
                if (playbackModeCheck !== 'sequencer') {
                    if (this.patternPlayerSequence && this.patternPlayerSequence.state === 'started') this.patternPlayerSequence.stop();
                    return;
                }

                const currentGlobalSoloId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
                const isEffectivelyMuted = this.isMuted || (currentGlobalSoloId !== null && currentGlobalSoloId !== this.id);

                if (this.appServices.highlightPlayingStep) this.appServices.highlightPlayingStep(this.id, col);
                if (!this.gainNode || this.gainNode.disposed || isEffectivelyMuted) return;

                const effectsChainStartPoint = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                    ? this.activeEffects[0].toneNode
                    : (this.gainNode && !this.gainNode.disposed ? this.gainNode : null);
                if (!effectsChainStartPoint) return;

                // Apply swing to off-beat notes (odd columns in 16th note grid)
                let swingTime = time;
                const swingEnabled = this.appServices.getSwingEnabledState ? this.appServices.getSwingEnabledState() : false;
                const swingAmount = this.appServices.getSwingAmountState ? this.appServices.getSwingAmountState() : 0;
                
                if (swingEnabled && swingAmount > 0) {
                    // Swing affects odd-numbered 16th notes (off-beats)
                    // In a 16th note grid: columns 1, 3, 5, 7, 9, 11, 13, 15 are off-beats
                    if (col % 2 === 1) {
                        // Calculate swing delay: swingAmount is 0-100
                        // At 100%, off-beats are delayed by half a 16th note (making it triplet feel)
                        const sixteenthNoteDuration = Tone.Time("16n").toSeconds();
                        const swingDelay = (swingAmount / 100) * (sixteenthNoteDuration / 2);
                        swingTime = time + swingDelay;
                    }
                }

                if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
                    let notePlayedThisStep = false;
                    for (let rowIndex = 0; rowIndex < Constants.synthPitches.length; rowIndex++) {
                        const pitchName = Constants.synthPitches[rowIndex];
                        const step = sequenceDataForTone[rowIndex]?.[col];
                        if (step && step.active) {
                            // Check if this is the start of a note (not a continuation of a longer note)
                            // A note starts at column C if there's no active note at column C-1, or if the note at column C-1 has a length that doesn't reach column C
                            const prevStep = col > 0 ? sequenceDataForTone[rowIndex]?.[col - 1] : null;
                            const isNoteStart = !prevStep?.active || (prevStep.length !== undefined && prevStep.length <= 1);
                            
                            if (isNoteStart) {
                                // Calculate duration based on note length (in 16th note steps)
                                const noteLength = step.length || 1;
                                const sixteenthNoteDuration = Tone.Time("16n").toSeconds();
                                const noteDuration = noteLength * sixteenthNoteDuration;
                                const durationNotation = `${noteLength}n`; // e.g., "1n" for 16th, "2n" for 8th, "4n" for quarter
                                
                                this.instrument.triggerAttackRelease(pitchName, noteDuration, swingTime, step.velocity * Constants.defaultVelocity);
                            }
                            notePlayedThisStep = true;
                        }
                    }
                } else if (this.type === 'Sampler') {
                     (this.slices || []).forEach((sliceData, sliceIndex) => {
                        const step = sequenceDataForTone[sliceIndex]?.[col];
                        if (step?.active && sliceData?.duration > 0 && this.audioBuffer?.loaded) {
                            // Check probability for Sampler
                            const noteProbability = step.probability !== undefined ? step.probability : Constants.DEFAULT_NOTE_PROBABILITY;
                            if (noteProbability < 1.0 && Math.random() > noteProbability) return;
                            
                            const targetVolumeLinear = sliceData.volume * step.velocity;
                            const playbackRate = Math.pow(2, (sliceData.pitchShift || 0) / 12);
                            let playDuration = sliceData.duration / playbackRate;
                            if (sliceData.loop) playDuration = Tone.Time("16n").toSeconds();

                            if (this.slicerIsPolyphonic) {
                                const tempPlayer = new Tone.Player(this.audioBuffer);
                                const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                                const tempGain = new Tone.Gain(targetVolumeLinear);
                                tempPlayer.chain(tempEnv, tempGain);
                                tempPlayer.playbackRate = playbackRate; tempPlayer.reverse = sliceData.reverse || false; tempPlayer.loop = sliceData.loop || false;
                                tempPlayer.loopStart = sliceData.offset; tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
                                tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                                tempEnv.triggerAttack(time);
                                if (!sliceData.loop) {
                                    const releaseTime = time + playDuration - (sliceData.envelope.release * 0.05);
                                    tempEnv.triggerRelease(Math.max(time, releaseTime));
                                }
                                Tone.Transport.scheduleOnce(() => {
                                    try { if(tempPlayer && !tempPlayer.disposed) tempPlayer.dispose(); } catch(e){}
                                    try { if(tempEnv && !tempEnv.disposed) tempEnv.dispose(); } catch(e){}
                                }, time + playDuration + (sliceData.envelope?.release || 0.3));
                            } else if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                                if (this.slicerMonoPlayer.state === 'started') this.slicerMonoPlayer.stop(time);
                                this.slicerMonoEnvelope.triggerRelease(time);
                                this.slicerMonoPlayer.buffer = this.audioBuffer;
                                this.slicerMonoEnvelope.set(sliceData.envelope);
                                this.slicerMonoGain.gain.value = targetVolumeLinear;
                                this.slicerMonoPlayer.playbackRate = playbackRate; this.slicerMonoPlayer.reverse = sliceData.reverse || false;
                                this.slicerMonoPlayer.loop = sliceData.loop || false; this.slicerMonoPlayer.loopStart = sliceData.offset; this.slicerMonoPlayer.loopEnd = sliceData.offset + sliceData.duration;
                                this.slicerMonoPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                                this.slicerMonoEnvelope.triggerAttack(time);
                                if (!sliceData.loop) {
                                    const releaseTime = time + playDuration - (sliceData.envelope.release * 0.05);
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
                            // Check probability for DrumSampler
                            const noteProbability = step.probability !== undefined ? step.probability : Constants.DEFAULT_NOTE_PROBABILITY;
                            if (noteProbability < 1.0 && Math.random() > noteProbability) return;
                            
                            const player = this.drumPadPlayers[padIndex];
                            player.volume.value = Tone.gainToDb(padData.volume * step.velocity * 0.7);
                            player.playbackRate = Math.pow(2, (padData.pitchShift || 0) / 12);
                            player.start(time);
                        }
                    });
                } else if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed && this.toneSampler.loaded) {
                    let notePlayedThisStep = false;
                    Constants.synthPitches.forEach((pitchName, rowIndex) => {
                        const step = sequenceDataForTone[rowIndex]?.[col];
                        if (step && step.active) {
                            // Check if this is the start of a note
                            const prevStep = col > 0 ? sequenceDataForTone[rowIndex]?.[col - 1] : null;
                            const isNoteStart = !prevStep?.active || (prevStep.length !== undefined && prevStep.length <= 1);
                            
                            if (isNoteStart) {
                                // Calculate duration based on note length
                                const noteLength = step.length || 1;
                                const sixteenthNoteDuration = Tone.Time("16n").toSeconds();
                                const noteDuration = noteLength * sixteenthNoteDuration;
                                
                                this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), noteDuration, time, step.velocity * Constants.defaultVelocity);
                            }
                            notePlayedThisStep = true;
                        }
                    });
                }
            }, Array.from(Array(sequenceLengthForTone).keys()), "16n");

            this.patternPlayerSequence.loop = true;
        } catch (error) {
            console.error(`[Track ${this.id} recreateToneSequence] Error creating Tone.Sequence for "${activeSeq.name}":`, error);
            this.patternPlayerSequence = null;
        }

        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
    }

    async addAudioClip(blob, startTime) {
        if (this.type !== 'Audio') {
            console.warn(`[Track ${this.id}] addAudioClip called on non-Audio track type: ${this.type}`);
            return;
        }
        
        this._captureUndoState(`Add Recorded Clip to ${this.name}`);
        
        const clipId = `seqclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        const dbKey = `clip_${this.id}_${Date.now()}_${blob.size}.wav`; 

        try {
            await storeAudio(dbKey, blob);
            let duration = 0;
            try {
                 duration = await this.getBlobDuration(blob);
            } catch(durationError) {
                console.warn(`[Track ${this.id}] Could not determine duration for new audio clip ${clipId}, defaulting to 0. Error:`, durationError);
            }

            const newClip = {
                id: clipId, type: 'audio', sourceId: dbKey,
                startTime: Math.max(0, startTime), 
                duration: duration,
                name: `Rec ${new Date().toLocaleTimeString().substring(0,8)}`
            };

            this.timelineClips.push(newClip);
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
        
        this._captureUndoState(`Add Audio File Clip "${clipName || audioFileBlob.name || 'Audio Clip'}" to ${this.name}`);
        
        const clipId = `seqclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
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

        const sourceSequence = this.sequences ? this.sequences.find(s => s.id === sourceSequenceId) : null;
        if (!sourceSequence) {
            console.warn(`[Track ${this.id}] Source sequence with ID ${sourceSequenceId} not found.`);
            if (this.appServices.showNotification) this.appServices.showNotification("Source sequence not found.", 3000);
            return null;
        }

        this._captureUndoState(`Add Sequence Clip "${clipName || sourceSequence.name || 'Seq Clip'}" to ${this.name}`);
        
        const clipId = `seqclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        const sixteenthNoteTime = Tone.Time("16n").toSeconds(); 
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
        if (this.appServices.renderTimeline) this.appServices.renderTimeline();
        return newClip;
    }


    async getBlobDuration(blob) {
        if (!blob || blob.size === 0) return 0;
        const tempUrl = URL.createObjectURL(blob);
        const audioContext = Tone.context?.rawContext;
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
            return 0;
        } finally {
            URL.revokeObjectURL(tempUrl);
        }
    }

    async schedulePlayback(transportStartTime, transportStopTime) {
        const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';

        this.stopPlayback(); 

        if (playbackMode === 'timeline') {
            for (const clip of this.timelineClips) {
                if (!clip || typeof clip.startTime !== 'number' || typeof clip.duration !== 'number') {
                    console.warn(`[Track ${this.id} schedulePlayback] Skipping invalid clip:`, clip);
                    continue;
                }
                const clipActualStart = clip.startTime;
                const clipActualEnd = clip.startTime + clip.duration;

                const effectivePlayStart = Math.max(clipActualStart, transportStartTime);
                const effectivePlayEnd = Math.min(clipActualEnd, transportStopTime);
                let playDurationInWindow = effectivePlayEnd - effectivePlayStart;

                if (playDurationInWindow <= 1e-3) continue; 

                const offsetIntoSource = Math.max(0, effectivePlayStart - clipActualStart);

                if (clip.type === 'audio') {
                    if (!clip.sourceId) { console.warn(`[Track ${this.id}] Audio clip ${clip.id} has no sourceId.`); continue; }
                    const player = new Tone.Player();
                    // Create a gain node for fade in/out
                    const fadeGain = new Tone.Gain(1).connect(
                        (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                            ? this.activeEffects[0].toneNode
                            : (this.gainNode || null)
                    );
                    this.clipPlayers.set(clip.id, player);
                    this.clipPlayers.set(`${clip.id}_gain`, fadeGain);
                    try {
                        const audioBlob = await getAudio(clip.sourceId);
                        if (audioBlob) {
                            const url = URL.createObjectURL(audioBlob);
                            player.onload = () => {
                                URL.revokeObjectURL(url);
                                // Connect player to fade gain instead of directly to destination
                                player.connect(fadeGain);
                                
                                // Set reverse if needed
                                player.reverse = clip.reverse || false;
                                
                                // Calculate actual fade times based on clip playback window
                                const clipStartInWindow = effectivePlayStart - clipActualStart;
                                const clipEndInWindow = effectivePlayStart + clip.duration;
                                const fadeIn = clip.fadeIn || 0;
                                const fadeOut = clip.fadeOut || 0;
                                
                                // Start at volume 0 for fade in effect
                                const clipGain = clip.gain !== undefined ? clip.gain : Constants.DEFAULT_AUDIO_CLIP_GAIN;
                                fadeGain.gain.setValueAtTime(0, effectivePlayStart);
                                
                                // Apply fade in (ramp to 1 over fadeIn duration)
                                if (fadeIn > 0 && clipStartInWindow < fadeIn) {
                                    const actualFadeIn = Math.min(fadeIn, playDurationInWindow);
                                    fadeGain.gain.linearRampToValueAtTime(clipGain, effectivePlayStart + actualFadeIn);
                                } else {
                                    fadeGain.gain.setValueAtTime(clipGain, effectivePlayStart);
                                }
                                
                                // Apply fade out (ramp to 0 near end)
                                if (fadeOut > 0) {
                                    const fadeOutStart = effectivePlayStart + playDurationInWindow - fadeOut;
                                    if (fadeOutStart > effectivePlayStart) {
                                        fadeGain.gain.setValueAtTime(clipGain, fadeOutStart);
                                        fadeGain.gain.linearRampToValueAtTime(0, effectivePlayStart + playDurationInWindow);
                                    }
                                }
                                
                                player.start(effectivePlayStart, offsetIntoSource, playDurationInWindow);
                            };
                            player.onerror = (err) => { console.error(`[Track ${this.id}] Player error for clip ${clip.id}:`, err); URL.revokeObjectURL(url); if(this.clipPlayers.has(clip.id)){try{if(!player.disposed)player.dispose()}catch(e){}this.clipPlayers.delete(clip.id);} if(this.clipPlayers.has(`${clip.id}_gain`)){try{if(!fadeGain.disposed)fadeGain.dispose()}catch(e){}this.clipPlayers.delete(`${clip.id}_gain`);}}
                            await player.load(url);
                        } else {
                            console.warn(`[Track ${this.id}] Blob not found for audio clip ${clip.id} (source ${clip.sourceId})`);
                            if(!player.disposed) player.dispose(); this.clipPlayers.delete(clip.id);
                            if(!fadeGain.disposed) fadeGain.dispose(); this.clipPlayers.delete(`${clip.id}_gain`);
                        }
                    } catch (err) { console.error(`[Track ${this.id}] Error loading/scheduling audio clip ${clip.id}:`, err); if(this.clipPlayers.has(clip.id)){const p = this.clipPlayers.get(clip.id); if(p && !p.disposed) try{p.dispose()}catch(e){}this.clipPlayers.delete(clip.id);} if(this.clipPlayers.has(`${clip.id}_gain`)){const g = this.clipPlayers.get(`${clip.id}_gain`); if(g && !g.disposed) try{g.dispose()}catch(e){}this.clipPlayers.delete(`${clip.id}_gain`);}}
                } else if (clip.type === 'sequence') {
                    const sourceSequence = this.sequences ? this.sequences.find(s => s.id === clip.sourceSequenceId) : null;
                    if (sourceSequence?.data?.length > 0 && sourceSequence.length > 0) {

                        const events = [];
                        const sixteenthTime = Tone.Time("16n").toSeconds();

                        for (let stepIdx = 0; stepIdx < sourceSequence.length; stepIdx++) {
                            const timeWithinSeq = stepIdx * sixteenthTime;
                            if (clipActualStart + timeWithinSeq >= effectivePlayStart && clipActualStart + timeWithinSeq < effectivePlayEnd) {
                                const eventTimeInPart = (clipActualStart + timeWithinSeq) - effectivePlayStart;
                                for (let rowIdx = 0; rowIdx < sourceSequence.data.length; rowIdx++) {
                                    const stepData = sourceSequence.data[rowIdx]?.[stepIdx];
                                    if (stepData?.active) {
                                        let noteValue;
                                        let noteDuration = "16n"; 
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
                            const part = new Tone.Part((time, value) => { 
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
                                    let notePlayed = false; 
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
                                        }, time + playDurationPart + (sliceData.envelope?.release || 0.1) + 0.3);
                                    } else if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                                        if (this.slicerMonoPlayer.state === 'started') this.slicerMonoPlayer.stop(time);
                                        this.slicerMonoEnvelope.triggerRelease(time); 
                                        this.slicerMonoPlayer.buffer = this.audioBuffer;
                                        this.slicerMonoEnvelope.set(sliceData.envelope);
                                        this.slicerMonoGain.gain.value = targetVolumeLinear;
                                        this.slicerMonoPlayer.playbackRate = playbackRate; this.slicerMonoPlayer.reverse = sliceData.reverse || false;
                                        this.slicerMonoPlayer.loop = sliceData.loop || false; this.slicerMonoPlayer.loopStart = sliceData.offset; this.slicerMonoPlayer.loopEnd = sliceData.offset + sliceData.duration;
                                        this.slicerMonoPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDurationPart);
                                        this.slicerMonoEnvelope.triggerAttack(time);
                                        if (!sliceData.loop) {
                                            const releaseTime = time + playDurationPart - (sliceData.envelope.release * 0.05); 
                                            this.slicerMonoEnvelope.triggerRelease(Math.max(time, releaseTime));
                                        }
                                    }
                                } else if (this.type === 'DrumSampler' && value.note.type === 'drum') {
                                    const padData = value.note.data;
                                    const player = this.drumPadPlayers[value.note.index];
                                    if (player && !player.disposed && player.loaded) {
                                        player.volume.value = Tone.gainToDb(padData.volume * value.velocity * 0.7);
                                        player.playbackRate = Math.pow(2, (padData.pitchShift || 0) / 12);
                                        player.start(time);
                                    }
                                }
                            }, events);
                            part.loop = false; 
                            part.start(effectivePlayStart); 
                            if (playDurationInWindow > 0 && playDurationInWindow !== Infinity) {
                                part.stop(effectivePlayStart + playDurationInWindow);
                            }
                            this.clipPlayers.set(`${clip.id}_part`, part);
                        }
                    }
                }
            }
        } else { // Sequencer Mode
            if (!this.patternPlayerSequence || this.patternPlayerSequence.disposed) {
                this.recreateToneSequence(true, transportStartTime);
            }
            if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
                if (this.patternPlayerSequence.state === 'started') {
                    try {this.patternPlayerSequence.stop(Tone.Transport.now());} catch(e){console.warn("Err stopping seq player during schedule", e)}
                }
                try {
                    this.patternPlayerSequence.start(transportStartTime); 
                } catch(e) {
                    console.error(`[Track ${this.id}] Error starting patternPlayerSequence:`, e.message, e); 
                    try { if(!this.patternPlayerSequence.disposed) this.patternPlayerSequence.dispose(); } catch (disposeErr) {}
                    this.patternPlayerSequence = null;
                }
            } else {
                 console.warn(`[Track ${this.id} schedulePlayback] Sequencer mode: patternPlayerSequence still not valid after recreation for "${this.name}".`);
            }
        }
    }


    stopPlayback() {
        const playersAndPartsToStop = Array.from(this.clipPlayers.values());
        playersAndPartsToStop.forEach(item => { 
            if (item && !item.disposed) {
                try {
                    if (typeof item.unsync === 'function') item.unsync(); 
                    item.stop(Tone.Transport.now()); 
                    item.dispose();
                }
                catch (e) { console.warn(`[Track ${this.id}] Error stopping/disposing a timeline clip player/part:`, e.message); }
            }
        });
        this.clipPlayers.clear();

        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            try {
                this.patternPlayerSequence.stop(); 
                this.patternPlayerSequence.clear(); 
                this.patternPlayerSequence.dispose(); 
            }
            catch (e) { console.warn(`[Track ${this.id}] Error stopping/disposing patternPlayerSequence:`, e.message); }
        }
        this.patternPlayerSequence = null; 
        
        // FIX: Release all notes from instruments (synth, sampler, etc.)
        // This ensures audio stops even when notes were triggered via MIDI/keyboard
        if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
            try {
                if (typeof this.instrument.releaseAll === 'function') {
                    this.instrument.releaseAll(Tone.now());
                }
            } catch (e) { 
                console.warn(`[Track ${this.id}] Error releasing MonoSynth notes:`, e.message); 
            }
        }
        
        if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed) {
            try {
                if (typeof this.toneSampler.releaseAll === 'function') {
                    this.toneSampler.releaseAll(Tone.now());
                }
            } catch (e) { 
                console.warn(`[Track ${this.id}] Error releasing InstrumentSampler notes:`, e.message); 
            }
        }
        
        // Stop any drum pad players that might be playing
        if (this.type === 'DrumSampler') {
            this.drumPadPlayers.forEach((player, index) => {
                if (player && !player.disposed && player.state === 'started') {
                    try {
                        player.stop(Tone.now());
                    } catch (e) {
                        console.warn(`[Track ${this.id}] Error stopping drum pad player ${index}:`, e.message);
                    }
                }
            });
        }
        
        // Stop slicer mono player if active
        if (this.type === 'Sampler' && this.slicerIsPolyphonic && this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) {
            try {
                if (this.slicerMonoPlayer.state === 'started') {
                    this.slicerMonoPlayer.stop(Tone.now());
                }
                if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) {
                    this.slicerMonoEnvelope.triggerRelease(Tone.now());
                }
            } catch (e) {
                console.warn(`[Track ${this.id}] Error stopping slicer mono player:`, e.message);
            }
        }
    }

    async updateAudioClipPosition(clipId, newStartTime) {
        const clip = this.timelineClips.find(c => c.id === clipId);
        if (clip) {
            this._captureUndoState(`Move Clip "${clip.name || clip.id.slice(-4)}" on ${this.name}`);
            const oldStartTime = clip.startTime;
            clip.startTime = Math.max(0, parseFloat(newStartTime) || 0);

            if (this.appServices.renderTimeline) this.appServices.renderTimeline();

            const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
            if (Tone.Transport.state === 'started' && playbackMode === 'timeline') {
                Tone.Transport.pause();
                const allTracks = this.appServices.getTracks ? this.appServices.getTracks() : [];
                allTracks.forEach(t => { if (typeof t.stopPlayback === 'function') t.stopPlayback(); });
                Tone.Transport.cancel(0);
                const currentPlayheadPosition = Tone.Transport.seconds; 
                const scheduleEndTime = currentPlayheadPosition + 300; 
                for (const t of allTracks) {
                    if (typeof t.schedulePlayback === 'function') await t.schedulePlayback(currentPlayheadPosition, scheduleEndTime);
                }
                Tone.Transport.start(Tone.Transport.now() + 0.05, currentPlayheadPosition); 
            }
        } else {
            console.warn(`[Track ${this.id}] Could not find clip ${clipId} to update its position.`);
        }
    }

    setAudioClipFadeIn(clipId, fadeTime) {
        const clip = this.timelineClips.find(c => c.id === clipId);
        if (clip) {
            this._captureUndoState(`Set Fade In on "${clip.name || clip.id.slice(-4)}" in ${this.name}`);
            // Clamp fade time to valid range (0 to clip duration, max 10s)
            const maxFade = Math.min(clip.duration, Constants.MAX_AUDIO_CLIP_FADE);
            clip.fadeIn = Math.max(0, Math.min(parseFloat(fadeTime) || 0, maxFade));
            if (this.appServices.renderTimeline) this.appServices.renderTimeline();
            return true;
        }
        return false;
    }

    setAudioClipFadeOut(clipId, fadeTime) {
        const clip = this.timelineClips.find(c => c.id === clipId);
        if (clip) {
            this._captureUndoState(`Set Fade Out on "${clip.name || clip.id.slice(-4)}" in ${this.name}`);
            // Clamp fade time to valid range (0 to clip duration, max 10s)
            const maxFade = Math.min(clip.duration, Constants.MAX_AUDIO_CLIP_FADE);
            clip.fadeOut = Math.max(0, Math.min(parseFloat(fadeTime) || 0, maxFade));
            if (this.appServices.renderTimeline) this.appServices.renderTimeline();
            return true;
        }
        return false;
    }

    getAudioClipFadeIn(clipId) {
        const clip = this.timelineClips.find(c => c.id === clipId);
        return clip ? (clip.fadeIn || 0) : 0;
    }

    getAudioClipFadeOut(clipId) {
        const clip = this.timelineClips.find(c => c.id === clipId);
        return clip ? (clip.fadeOut || 0) : 0;
    }

    deleteTimelineClip(clipId) {
        const clipIndex = this.timelineClips.findIndex(c => c.id === clipId);
        if (clipIndex === -1) {
            if (this.appServices.showNotification) this.appServices.showNotification('Clip not found', 1500);
            return false;
        }
        const clip = this.timelineClips[clipIndex];
        this._captureUndoState(`Delete "${clip.name || 'Clip'}" from ${this.name}`);
        this.timelineClips.splice(clipIndex, 1);
        // Stop playback for this clip if it's playing
        if (this.clipPlayers && this.clipPlayers.has(clipId)) {
            const player = this.clipPlayers.get(clipId);
            if (player && !player.disposed) {
                try { player.stop(); player.dispose(); } catch(e) {}
            }
            this.clipPlayers.delete(clipId);
        }
        if (this.clipPlayers.has(`${clipId}_gain`)) {
            const gain = this.clipPlayers.get(`${clipId}_gain`);
            if (gain && !gain.disposed) {
                try { gain.dispose(); } catch(e) {}
            }
            this.clipPlayers.delete(`${clipId}_gain`);
        }
        if (this.appServices.renderTimeline) this.appServices.renderTimeline();
        return true;
    }

    setAudioClipGain(clipId, gain) {
        const clip = this.timelineClips.find(c => c.id === clipId);
        if (clip) {
            this._captureUndoState(`Set Gain on "${clip.name || clip.id.slice(-4)}" in ${this.name}`);
            clip.gain = Math.max(Constants.MIN_AUDIO_CLIP_GAIN, Math.min(parseFloat(gain) || Constants.DEFAULT_AUDIO_CLIP_GAIN, Constants.MAX_AUDIO_CLIP_GAIN));
            if (this.appServices.renderTimeline) this.appServices.renderTimeline();
            return true;
        }
        return false;
    }

    getAudioClipGain(clipId) {
        const clip = this.timelineClips.find(c => c.id === clipId);
        if (!clip) return Constants.DEFAULT_AUDIO_CLIP_GAIN;
        if (clip.color && Constants.CLIP_COLORS.includes(clip.color)) {
            return clip.color;
        }
        // For sequence clips, return purple; for audio clips, return blue
        return (clip.type === 'audio') ? '#4a9eff' : '#9f4aff';
    }

    async normalizeAudioClip(clipId) {
        const clip = this.timelineClips.find(c => c.id === clipId);
        if (!clip || !clip.sourceId) return false;
        this._captureUndoState(`Normalize "${clip.name || clip.id.slice(-4)}" in ${this.name}`);
        try {
            const audioBlob = await getAudio(clip.sourceId);
            if (!audioBlob) return false;
            const arrayBuffer = await audioBlob.arrayBuffer();
            const audioContext = Tone.context?.rawContext;
            if (!audioContext) return false;
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const peaks = audioBuffer.getChannelData(0);
            let maxSample = 0;
            for (let i = 0; i < peaks.length; i++) {
                const abs = Math.abs(peaks[i]);
                if (abs > maxSample) maxSample = abs;
            }
            if (maxSample > 0) {
                clip.gain = Constants.GAIN_NORMALIZE_TARGET / maxSample;
            } else {
                clip.gain = Constants.DEFAULT_AUDIO_CLIP_GAIN;
            }
            if (this.appServices.renderTimeline) this.appServices.renderTimeline();
            if (this.appServices.showNotification) this.appServices.showNotification(`Normalized to ${(20 * Math.log10(clip.gain)).toFixed(1)} dB`, 2000);
            return true;
        } catch (e) {
            console.error(`[Track ${this.id} normalizeAudioClip] Error:`, e);
            return false;
        }
    }

    dispose() {
        const trackNameForLog = this.name || `Track ${this.id}`; 

        try { this.stopPlayback(); } catch (e) { console.warn(`[Track Dispose ${this.id}] Error in stopPlayback during dispose:`, e.message); }

        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            try { this.patternPlayerSequence.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing patternPlayerSequence:`, e.message); }
        }
        this.patternPlayerSequence = null;

        if (this.instrument && !this.instrument.disposed) { 
            try { this.instrument.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing instrument:`, e.message); }
        }
        this.instrument = null;

        if (this.toneSampler && !this.toneSampler.disposed) { 
            try { this.toneSampler.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing toneSampler:`, e.message); }
        }
        this.toneSampler = null;

        this.disposeSlicerMonoNodes(); 

        this.drumPadPlayers.forEach((player, index) => { 
            if (player && !player.disposed) {
                try { player.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing drumPadPlayer ${index}:`, e.message); }
            }
            this.drumPadPlayers[index] = null;
        });

        this.activeEffects.forEach(effect => { 
            if (effect.toneNode && !effect.toneNode.disposed) {
                try { effect.toneNode.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing effect "${effect.type}":`, e.message); }
            }
        });
        this.activeEffects = [];

        if (this.gainNode && !this.gainNode.disposed) {
            try { this.gainNode.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing gainNode:`, e.message); }
        }
        this.gainNode = null;

        if (this.trackMeter && !this.trackMeter.disposed) {
            try { this.trackMeter.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing trackMeter:`, e.message); }
        }
        this.trackMeter = null;

        if (this.inputChannel && !this.inputChannel.disposed) { 
            try { this.inputChannel.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing inputChannel:`, e.message); }
        }
        this.inputChannel = null;

        if (this.appServices.closeAllTrackWindows) {
            this.appServices.closeAllTrackWindows(this.id);
        }

        if (this.audioBuffer && !this.audioBuffer.disposed) { 
            try { this.audioBuffer.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing audioBuffer (Sampler):`, e.message); }
        }
        this.audioBuffer = null;

        (this.drumSamplerPads || []).forEach(p => { 
            if (p.audioBuffer && !p.audioBuffer.disposed) {
                try { p.audioBuffer.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing pad audioBuffer:`, e.message); }
            }
            p.audioBuffer = null;
        });

        if (this.instrumentSamplerSettings?.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) { 
            try { this.instrumentSamplerSettings.audioBuffer.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing audioBuffer (InstrumentSampler):`, e.message); }
        }
        if (this.instrumentSamplerSettings) this.instrumentSamplerSettings.audioBuffer = null;

        this.sequences = [];
        this.timelineClips = [];
        this.appServices = {};
        this.inspectorControls = {};
        this.waveformCanvasCtx = null;
        this.instrumentWaveformCanvasCtx = null;

    }
}
