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
        this.audioBuffer = null;
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
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 }, status: 'empty'
        };
        this.instrumentSamplerIsPolyphonic = initialData?.instrumentSamplerIsPolyphonic !== undefined ? initialData.instrumentSamplerIsPolyphonic : true;
        this.toneSampler = null;

        // Drum Sampler specific
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
        this.instrument = null;

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
            delete this.sequenceData;
            delete this.sequenceLength;
        } else {
            delete this.sequenceData;
            delete this.sequenceLength;
            delete this.sequences;
            delete this.activeSequenceId;

            if (initialData?.audioClips && Array.isArray(initialData.audioClips)) {
                 initialData.audioClips.forEach(ac => {
                    const existingClip = this.timelineClips.find(tc => tc.sourceId === ac.dbKey && tc.type === 'audio');
                    if (!existingClip) {
                        this.timelineClips.push({
                            id: ac.id || `audioclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
                            type: 'audio',
                            sourceId: ac.dbKey,
                            startTime: ac.startTime,
                            duration: ac.duration,
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
        this.automation = initialData?.automation || { volume: [] };
        this.inspectorControls = {};

        // Audio Track specific (input channel and live players)
        this.inputChannel = null;
        this.clipPlayers = new Map();
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
            filter: { type: 'lowpass', rolloff: -12, Q: 1 },
            filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 2, baseFrequency: 200, octaves: 7, exponent: 2 }
        };
    }

    async initializeAudioNodes() {
        console.log(`[Track ${this.id} initializeAudioNodes] Initializing audio nodes.`);
        if (this.gainNode && !this.gainNode.disposed) { try { this.gainNode.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old gainNode:`, e.message)} }
        if (this.trackMeter && !this.trackMeter.disposed) { try { this.trackMeter.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old trackMeter:`, e.message)} }
        if (this.inputChannel && !this.inputChannel.disposed && this.type === 'Audio') {
            try { this.inputChannel.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old inputChannel:`, e.message)}
        }
        this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
        this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        this.outputNode = this.gainNode;
        if (this.type === 'Audio') {
            this.inputChannel = new Tone.Channel();
        }
        this.rebuildEffectChain();
        console.log(`[Track ${this.id} initializeAudioNodes] Audio nodes initialized and effect chain rebuilt.`);
    }

    rebuildEffectChain() {
        console.log(`[Track ${this.id} rebuildEffectChain] Rebuilding effect chain. Effects count: ${this.activeEffects.length}`);
        if (!this.gainNode || this.gainNode.disposed) {
            console.error(`Track ${this.id} has no valid gainNode. Aborting chain rebuild.`);
            return;
        }
        if (!this.trackMeter || this.trackMeter.disposed) {
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        }

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
            if (!this.slicerIsPolyphonic && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                sourceNodes.push(this.slicerMonoGain);
            }
        } else if (this.type === 'Audio') {
            if (this.inputChannel && !this.inputChannel.disposed) {
                 sourceNodes.push(this.inputChannel);
            }
        }
        console.log(`[Track ${this.id} rebuildEffectChain] Identified ${sourceNodes.length} primary source nodes for initial connection point.`);

        const allManagedNodes = [
            ...sourceNodes,
            ...this.activeEffects.map(e => e.toneNode),
            this.gainNode,
            this.trackMeter
        ].filter(node => node && !node.disposed);

        allManagedNodes.forEach(node => {
            try { node.disconnect(); } catch(e) { /* ignore */ }
        });
        console.log(`[Track ${this.id} rebuildEffectChain] All managed nodes disconnected.`);


        if (this.type === 'Sampler' && !this.slicerIsPolyphonic && this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed &&
            this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed &&
            this.slicerMonoGain && !this.slicerMonoGain.disposed) {
            try { this.slicerMonoPlayer.disconnect(); } catch(e) {/*ignore*/}
            this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
        }

        let currentOutput = sourceNodes.length > 0 ? (sourceNodes.length === 1 ? sourceNodes[0] : sourceNodes) : null;
        console.log(`[Track ${this.id} rebuildEffectChain] Initial currentOutput (before effects):`, currentOutput ? (Array.isArray(currentOutput) ? `${currentOutput.length} nodes` : currentOutput.toString()) : 'null');


        if (this.type === 'Sampler' && this.slicerIsPolyphonic) {
            currentOutput = null;
        }
        if (this.type === 'Audio' && !this.inputChannel) {
            currentOutput = null;
        }


        this.activeEffects.forEach((effectWrapper, index) => {
            if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
                console.log(`[Track ${this.id} rebuildEffectChain] Connecting to effect ${index}: ${effectWrapper.type}`);
                if (currentOutput) {
                    if (Array.isArray(currentOutput)) {
                        currentOutput.forEach(outNode => {
                            if (outNode && !outNode.disposed) {
                                console.log(`[Track ${this.id} rebuildEffectChain] ... ${outNode.toString()} -> ${effectWrapper.type}`);
                                outNode.connect(effectWrapper.toneNode);
                            }
                        });
                    } else if (currentOutput && !currentOutput.disposed) {
                        console.log(`[Track ${this.id} rebuildEffectChain] ... ${currentOutput.toString()} -> ${effectWrapper.type}`);
                        currentOutput.connect(effectWrapper.toneNode);
                    }
                }
                currentOutput = effectWrapper.toneNode;
            }
        });

        if (currentOutput) {
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
            this.inputChannel.connect(this.gainNode);
            console.log(`[Track ${this.id} rebuildEffectChain] Connected Audio inputChannel directly to gainNode (no effects).`);
        } else if (this.type === 'DrumSampler' && sourceNodes.length > 0 && this.activeEffects.length === 0) {
            sourceNodes.forEach(playerNode => {
                if (playerNode && !playerNode.disposed) {
                     console.log(`[Track ${this.id} DrumSampler rebuildEffectChain] ... ${playerNode.toString()} (Player for pad) -> gainNode (no effects)`);
                    playerNode.connect(this.gainNode);
                }
            });
        }
         else {
            console.log(`[Track ${this.id} rebuildEffectChain] No primary currentOutput to connect to gainNode (e.g., polyphonic sampler with no effects, or audio track relying on direct player connections to effects/gain).`);
        }


        if (this.gainNode && !this.gainNode.disposed && this.trackMeter && !this.trackMeter.disposed) {
            this.gainNode.connect(this.trackMeter);
            console.log(`[Track ${this.id} rebuildEffectChain] Connected gainNode to trackMeter.`);
        }

        const masterBusInput = this.appServices.getMasterEffectsBusInputNode ? this.appServices.getMasterEffectsBusInputNode() : null;
        const finalTrackOutput = (this.trackMeter && !this.trackMeter.disposed) ? this.trackMeter : this.gainNode;

        if (finalTrackOutput && !finalTrackOutput.disposed && masterBusInput && !masterBusInput.disposed) {
            finalTrackOutput.connect(masterBusInput);
            console.log(`[Track ${this.id} rebuildEffectChain] Connected final track output to masterBusInput.`);
        } else if (finalTrackOutput && !finalTrackOutput.disposed) {
            console.warn(`[Track ${this.id}] Master effects bus input not available. Connecting directly to destination.`);
            finalTrackOutput.toDestination();
        }

        this.applyMuteState();
        this.applySoloState();
        console.log(`[Track ${this.id} rebuildEffectChain] Mute/Solo states applied. Chain rebuild complete.`);
    }


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
                    throw new Error(`Nested object for path "${keys.slice(0, i + 1).join('.')}" not found on Tone node.`);
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
                console.warn(`[Track ${this.id}] Could not set parameter ${paramPath} on effect ${effectWrapper.type}.`);
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
        console.log(`[Track ${this.id} fullyInitializeAudioResources] Initializing audio resources for type: ${this.type}`);
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
                        audioFile = await getAudio(this.samplerAudioData.dbKey).catch(err => {
                            console.error(`[Track ${this.id}] Error getting audio from DB for key ${this.samplerAudioData.dbKey}:`, err);
                            this.samplerAudioData.status = 'error';
                            if (this.appServices.showNotification) this.appServices.showNotification(`Error loading sample ${this.samplerAudioData.fileName || 'from database'}.`, 3000);
                            return null;
                        });
                    } else if (this.samplerAudioData.audioBufferDataURL) {
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
                            if (!this.slicerIsPolyphonic) this.setupSlicerMonoNodes();
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
                    } else if (this.samplerAudioData.status !== 'error') {
                        this.samplerAudioData.status = this.samplerAudioData.dbKey ? 'missing_db' : 'error';
                    }
                }
            } else if (this.type === 'DrumSampler') {
                for (let i = 0; i < this.drumSamplerPads.length; i++) {
                    const pad = this.drumSamplerPads[i];
                    if (pad.dbKey || pad.audioBufferDataURL) {
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
                                    pad.audioBuffer = await new Tone.Buffer().load(objectURL);
                                    if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) this.drumPadPlayers[i].dispose();
                                    this.drumPadPlayers[i] = new Tone.Player(pad.audioBuffer);
                                    pad.status = 'loaded';
                                } catch (toneLoadErr) {
                                    console.error(`[Track ${this.id}] Tone.Buffer load error for drum pad ${i} (${pad.originalFileName}):`, toneLoadErr);
                                    pad.status = 'error';
                                } finally {
                                    URL.revokeObjectURL(objectURL);
                                }
                            } else if (pad.status !== 'error'){
                                pad.status = pad.dbKey ? 'missing_db' : 'error';
                            }
                        } catch (loadErr) {
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
                this.setupToneSampler();
            }
            if (this.type === 'Audio' && (!this.inputChannel || this.inputChannel.disposed)) {
                await this.initializeAudioNodes();
            }

        } catch (error) {
            console.error(`[Track ${this.id}] Overall error in fullyInitializeAudioResources for ${this.type}:`, error);
            if (this.appServices.showNotification) this.appServices.showNotification(`Major error loading audio for ${this.name}.`, 4000);
            if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sampleLoadError');
        }

        if (this.type !== 'Audio') {
            this.recreateToneSequence(true);
        }
        this.rebuildEffectChain();
        console.log(`[Track ${this.id} fullyInitializeAudioResources] Finished audio resource initialization.`);
    }

    async initializeInstrument() {
        if (this.type === 'Synth') {
            if (this.instrument && !this.instrument.disposed) {
                this.instrument.dispose();
            }
            this.instrument = new Tone.MonoSynth(this.synthParams);
            console.log(`[Track ${this.id} initializeInstrument] MonoSynth initialized with params:`, this.synthParams);
        }
    }

    setupSlicerMonoNodes() {
        this.disposeSlicerMonoNodes();
        if (!this.slicerIsPolyphonic) {
            this.slicerMonoPlayer = new Tone.Player();
            this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
            this.slicerMonoGain = new Tone.Gain();
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
        this.applyMuteState();
    }

    setSynthParam(paramPath, value) {
        if (this.type !== 'Synth' || !this.instrument || this.instrument.disposed) return;
        try {
            const keys = paramPath.split('.');
            let target = this.instrument;
            let paramsTarget = this.synthParams;

            for (let i = 0; i < keys.length - 1; i++) {
                target = target[keys[i]];
                paramsTarget[keys[i]] = paramsTarget[keys[i]] || {};
                paramsTarget = paramsTarget[keys[i]];
            }
            const finalKey = keys[keys.length - 1];
            paramsTarget[finalKey] = value;

            if (target && target[finalKey] && typeof target[finalKey].setValueAtTime === 'function') {
                target[finalKey].setValueAtTime(value, Tone.now());
            } else if (target && typeof target[finalKey] !== 'undefined' && typeof target[finalKey].value !== 'undefined') {
                 target[finalKey].value = value;
            }
            else if (target && typeof target[finalKey] !== 'undefined') {
                target[finalKey] = value;
            } else if (typeof target.set === 'function') {
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
        this.setupToneSampler();
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
        }
    }

    _captureUndoState(description) {
        if (this.appServices.captureStateForUndo) {
            this.appServices.captureStateForUndo(description);
        }
    }

    createNewSequence(name = `Sequence ${this.sequences.length + 1}`) {
        if (this.type === 'Audio') return null;
        const newSeqId = `seq_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        let numRowsForGrid;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRowsForGrid = Constants.synthPitches.length;
        else if (this.type === 'Sampler') numRowsForGrid = this.slices.length > 0 ? this.slices.length : Constants.numSlices;
        else if (this.type === 'DrumSampler') numRowsForGrid = Constants.numDrumSamplerPads;
        else numRowsForGrid = 1;

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
        this.activeSequenceId = newSeqId;
        this.recreateToneSequence(true);
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
                this.activeSequenceId = this.sequences[0]?.id || null;
            }
            this.recreateToneSequence(true);
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
            this.timelineClips.forEach(clip => {
                if (clip.type === 'sequence' && clip.sourceSequenceId === sequenceId) {
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
            data: JSON.parse(JSON.stringify(originalSequence.data)),
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
            this.recreateToneSequence(true);
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
            if(row) {
               const copyOfOriginal = row.slice(0, oldLength);
               row.length = newLength;
               for(let i = oldLength; i < newLength; i++) {
                   row[i] = null;
               }
               for(let i = 0; i < oldLength; i++) {
                   if (copyOfOriginal[i]) {
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
        newLengthInSteps = Math.max(Constants.STEPS_PER_BAR, parseInt(newLengthInSteps) || Constants.defaultStepsPerBar);
        newLengthInSteps = Math.ceil(newLengthInSteps / Constants.STEPS_PER_BAR) * Constants.STEPS_PER_BAR;
        newLengthInSteps = Math.min(newLengthInSteps, Constants.MAX_BARS * Constants.STEPS_PER_BAR);

        if (!skipUndoCapture && oldActualLength !== newLengthInSteps) {
            this._captureUndoState(`Set Seq Length for ${activeSeq.name} on ${this.name} to ${newLengthInSteps / Constants.STEPS_PER_BAR} bars`);
        }
        activeSeq.length = newLengthInSteps;

        let numRows;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRows = Constants.synthPitches.length;
        else if (this.type === 'Sampler') numRows = this.slices.length > 0 ? this.slices.length : Constants.numSlices;
        else if (this.type === 'DrumSampler') numRows = Constants.numDrumSamplerPads;
        else numRows = (activeSeq.data && activeSeq.data.length > 0) ? activeSeq.data.length : 1;

        const currentSequenceData = activeSeq.data || [];
        activeSeq.data = Array(numRows).fill(null).map((_, rIndex) => {
            const currentRow = currentSequenceData[rIndex] || [];
            const newRow = Array(activeSeq.length).fill(null);
            for (let c = 0; c < Math.min(currentRow.length, activeSeq.length); c++) newRow[c] = currentRow[c];
            return newRow;
        });

        this.recreateToneSequence(true);
        if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
    }

    recreateToneSequence(forceRestart = false, startTimeOffset = 0) {
        if (this.type === 'Audio') return;
        const currentPlaybackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        console.log(`[Track ${this.id} recreateToneSequence] Called. ActiveSeqID: ${this.activeSequenceId}. Current Playback Mode: ${currentPlaybackMode}`);

        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            console.log(`[Track ${this.id} recreateToneSequence] Disposing existing Tone.Sequence.`);
            this.patternPlayerSequence.stop();
            this.patternPlayerSequence.clear();
            this.patternPlayerSequence.dispose();
            this.patternPlayerSequence = null;
        }

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
        console.log(`[Track ${this.id} recreateToneSequence] Creating Tone.Sequence for '${activeSeq.name}' with ${sequenceLengthForTone} steps and ${sequenceDataForTone.length} rows for SEQUENCER mode. Data snapshot:`, JSON.stringify(sequenceDataForTone.slice(0, 2)));

        if(sequenceDataForTone.length === 0 && sequenceLengthForTone > 0){
            console.warn(`[Track ${this.id} recreateToneSequence] Sequence data has 0 rows, but length is ${sequenceLengthForTone}. This might lead to issues or an empty sequence.`);
        }
        if (sequenceLengthForTone === 0) {
            console.warn(`[Track ${this.id} recreateToneSequence] sequenceLengthForTone is 0. Tone.Sequence will likely not fire events.`);
        }


        this.patternPlayerSequence = new Tone.Sequence((time, col) => {
            const currentTrackGain = this.gainNode && !this.gainNode.disposed ? this.gainNode.gain.value : 'N/A (GainNode issue)';
            console.log(`[Track ${this.id} Sequencer Event] Time: ${time.toFixed(3)}, Col: ${col}, Type: ${this.type}, TrackGain: ${currentTrackGain.toFixed ? currentTrackGain.toFixed(2) : currentTrackGain}`);


            const playbackModeCheck = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
            if (playbackModeCheck !== 'sequencer') {
                if (this.patternPlayerSequence && this.patternPlayerSequence.state === 'started') {
                    this.patternPlayerSequence.stop();
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

            const effectsChainStartPoint = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                ? this.activeEffects[0].toneNode
                : (this.gainNode && !this.gainNode.disposed ? this.gainNode : null);

            if (!effectsChainStartPoint) {
                console.warn(`[Track ${this.id} Sequencer Event] No valid output (effectsChainStartPoint is null) for instrument/player at col ${col}. GainNode: ${this.gainNode ? this.gainNode.toString() : 'null'}`);
                return;
            }

            if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
                 let notePlayedThisStep = false;
                 for (let rowIndex = 0; rowIndex < Constants.synthPitches.length; rowIndex++) {
                    if (!sequenceDataForTone[rowIndex]) continue;
                    const pitchName = Constants.synthPitches[rowIndex];
                    const step = sequenceDataForTone[rowIndex]?.[col];
                    if (step?.active && !notePlayedThisStep) {
                        const synthVol = this.instrument.volume.value;
                        console.log(`[Track ${this.id} Synth] Playing ${pitchName} at col ${col}, time ${time.toFixed(3)}. SynthVol(dB): ${synthVol.toFixed(2)}, StepVel: ${step.velocity.toFixed(2)}, Target: ${effectsChainStartPoint.toString()}`);
                        this.instrument.triggerAttackRelease(pitchName, "8n", time, step.velocity * Constants.defaultVelocity);
                        notePlayedThisStep = true;
                    }
                }
            } else if (this.type === 'Sampler') {
                this.slices.forEach((sliceData, sliceIndex) => {
                    if (!sequenceDataForTone[sliceIndex]) return;
                    const step = sequenceDataForTone[sliceIndex]?.[col];
                    if (step?.active && sliceData?.duration > 0 && this.audioBuffer?.loaded) {
                        const targetVolumeLinear = sliceData.volume * step.velocity;
                        console.log(`[Track ${this.id} Sampler] Playing slice ${sliceIndex} at col ${col}, time ${time.toFixed(3)}. SliceVolLin: ${sliceData.volume.toFixed(2)}, StepVel: ${step.velocity.toFixed(2)}, FinalLinVol: ${targetVolumeLinear.toFixed(2)}, Target: ${effectsChainStartPoint.toString()}`);
                        const playbackRate = Math.pow(2, (sliceData.pitchShift || 0) / 12);
                        let playDuration = sliceData.duration / playbackRate;
                        if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds();

                        if (this.slicerIsPolyphonic) {
                            const tempPlayer = new Tone.Player(this.audioBuffer);
                            const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                            const tempGain = new Tone.Gain(targetVolumeLinear); // Use linear gain for Tone.Gain
                            tempPlayer.chain(tempEnv, tempGain, effectsChainStartPoint);
                            tempPlayer.playbackRate = playbackRate; tempPlayer.reverse = sliceData.reverse; tempPlayer.loop = sliceData.loop;
                            tempPlayer.loopStart = sliceData.offset; tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
                            tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            tempEnv.triggerAttack(time);
                            if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95);
                            Tone.Transport.scheduleOnce(() => { if(tempPlayer && !tempPlayer.disposed) tempPlayer.dispose(); if(tempEnv && !tempEnv.disposed) tempEnv.dispose(); if(tempGain && !tempGain.disposed) tempGain.dispose(); }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);
                        } else if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                            if (this.slicerMonoPlayer.state === 'started') this.slicerMonoPlayer.stop(time);
                            this.slicerMonoEnvelope.triggerRelease(time);

                            this.slicerMonoPlayer.buffer = this.audioBuffer;
                            this.slicerMonoEnvelope.set(sliceData.envelope);
                            this.slicerMonoGain.gain.value = targetVolumeLinear; // Use linear gain
                            this.slicerMonoPlayer.playbackRate = playbackRate;
                            this.slicerMonoPlayer.reverse = sliceData.reverse;
                            this.slicerMonoPlayer.loop = sliceData.loop;
                            this.slicerMonoPlayer.loopStart = sliceData.offset;
                            this.slicerMonoPlayer.loopEnd = sliceData.offset + sliceData.duration;

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
                    if (!sequenceDataForTone[padIndex]) return;
                    const step = sequenceDataForTone[padIndex]?.[col];
                    const padData = this.drumSamplerPads[padIndex];
                    if (step?.active && padData && this.drumPadPlayers[padIndex]?.loaded) {
                        const player = this.drumPadPlayers[padIndex];
                        const targetVolumeLinear = padData.volume * step.velocity * 0.8;
                        const targetVolumeDb = Tone.gainToDb(targetVolumeLinear); // Player volume is in dB
                        console.log(`[Track ${this.id} DrumSampler] Playing pad ${padIndex} at col ${col}, time ${time.toFixed(3)}. PadVolLin: ${padData.volume.toFixed(2)}, StepVel: ${step.velocity.toFixed(2)}, TargetVolLin: ${targetVolumeLinear.toFixed(2)}, TargetVolDb: ${targetVolumeDb.toFixed(2)}, TargetNode: ${effectsChainStartPoint.toString()}`);
                        player.volume.value = targetVolumeDb;
                        player.playbackRate = Math.pow(2, (padData.pitchShift || 0) / 12);
                        player.start(time);
                    }
                });
            } else if (this.type === 'InstrumentSampler' && this.toneSampler?.loaded) {
                 let notePlayedThisStepInColumn = false;
                 Constants.synthPitches.forEach((pitchName, rowIndex) => {
                    if (!sequenceDataForTone[rowIndex]) return;
                    const step = sequenceDataForTone[rowIndex]?.[col];
                    if (step?.active) {
                        if (!this.instrumentSamplerIsPolyphonic && !notePlayedThisStepInColumn) {
                            this.toneSampler.releaseAll(time);
                            notePlayedThisStepInColumn = true;
                        }
                        const samplerVolume = this.toneSampler.volume.value; // Sampler volume is in dB
                        console.log(`[Track ${this.id} InstrumentSampler] Playing ${pitchName} at col ${col}, time ${time.toFixed(3)}. SamplerVol(dB): ${samplerVolume.toFixed(2)}, StepVel: ${step.velocity.toFixed(2)}, Target: ${effectsChainStartPoint.toString()}`);
                        this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "8n", time, step.velocity * Constants.defaultVelocity);
                    }
                });
            }
        }, Array.from(Array(sequenceLengthForTone).keys()), "16n");

        this.patternPlayerSequence.loop = true;
        console.log(`[Track ${this.id} recreateToneSequence] Tone.Sequence for '${activeSeq.name}' prepared. Loop: ${this.patternPlayerSequence.loop}. It will be started by schedulePlayback.`);


        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
    }


    async addAudioClip(blob, startTime) {
        if (this.type !== 'Audio') return;
        const clipId = `audioclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        const dbKey = `clip_${this.id}_${Date.now()}.wav`;

        try {
            await storeAudio(dbKey, blob);
            const duration = await this.getBlobDuration(blob);

            const newClip = {
                id: clipId,
                type: 'audio',
                sourceId: dbKey,
                startTime: startTime,
                duration: duration,
                name: `Rec ${new Date().toLocaleTimeString()}`
            };

            this.timelineClips.push(newClip);
            console.log(`[Track ${this.id}] Added audio clip to timelineClips:`, newClip);


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
        const audioContext = Tone.context.rawContext;
        try {
            const arrayBuffer = await fetch(tempUrl).then(res => res.arrayBuffer());
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            return audioBuffer.duration;
        } catch (e) {
            console.error("Error getting blob duration:", e);
            return 0;
        } finally {
            URL.revokeObjectURL(tempUrl);
        }
    }

    async schedulePlayback(transportStartTime, transportStopTime) {
        const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        console.log(`[Track ${this.id} (${this.type})] schedulePlayback. Mode: ${playbackMode}. Transport Start: ${transportStartTime}, Stop: ${transportStopTime}`);

        this.stopPlayback();

        if (playbackMode === 'timeline') {
            console.log(`[Track ${this.id}] In TIMELINE mode. Scheduling ${this.timelineClips.length} timeline clips.`);
            if (this.patternPlayerSequence && this.patternPlayerSequence.state === 'started') {
                console.log(`[Track ${this.id}] Timeline mode: Stopping active patternPlayerSequence.`);
                this.patternPlayerSequence.stop();
            }
            for (const clip of this.timelineClips) {
                const clipActualStartOnTransport = clip.startTime;
                const clipActualEndOnTransport = clip.startTime + clip.duration;
                const effectivePlayStartOnTransport = Math.max(clipActualStartOnTransport, transportStartTime);
                const effectivePlayEndOnTransport = Math.min(clipActualEndOnTransport, transportStopTime);
                let playDurationInWindow = effectivePlayEndOnTransport - effectivePlayStartOnTransport;

                if (playDurationInWindow <= 1e-3) {
                    continue;
                }

                const offsetIntoSource = Math.max(0, effectivePlayStartOnTransport - clipActualStartOnTransport);

                if (clip.type === 'audio') {
                    console.log(`[Track ${this.id}] Scheduling AUDIO clip ${clip.id} ('${clip.name}') at ${effectivePlayStartOnTransport} for ${playDurationInWindow}s (offset ${offsetIntoSource}s)`);
                    const player = new Tone.Player();
                    this.clipPlayers.set(clip.id, player);
                    try {
                        const audioBlob = await getAudio(clip.sourceId);
                        if (audioBlob) {
                            const url = URL.createObjectURL(audioBlob);
                            player.onload = () => {
                                URL.revokeObjectURL(url);
                                const destinationNode = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                                    ? this.activeEffects[0].toneNode
                                    : (this.gainNode && !this.gainNode.disposed ? this.gainNode : null);

                                if (destinationNode) player.connect(destinationNode); else player.toDestination();

                                player.start(effectivePlayStartOnTransport, offsetIntoSource, playDurationInWindow);
                            };
                            player.onerror = (error) => { console.error(`[Track ${this.id}] Error loading audio for clip ${clip.id}:`, error); URL.revokeObjectURL(url); if (this.clipPlayers.has(clip.id)) { if(!player.disposed) player.dispose(); this.clipPlayers.delete(clip.id); }};
                            await player.load(url);
                        } else { if (!player.disposed) player.dispose(); this.clipPlayers.delete(clip.id); }
                    } catch (error) { console.error(`[Track ${this.id}] Error in schedulePlayback for audio clip ${clip.id}:`, error); if (this.clipPlayers.has(clip.id)) { const p = this.clipPlayers.get(clip.id); if(p && !p.disposed) p.dispose(); this.clipPlayers.delete(clip.id); }}
                } else if (clip.type === 'sequence') {
                    const sourceSequence = this.sequences.find(s => s.id === clip.sourceSequenceId);
                    if (sourceSequence && sourceSequence.data && sourceSequence.data.length > 0 && sourceSequence.length > 0) {
                        console.log(`[Track ${this.id}] Timeline: Scheduling SEQUENCE clip '${clip.name}' (Source: ${sourceSequence.name}) from ${effectivePlayStartOnTransport} for ${playDurationInWindow}s`);

                        const sixteenthTime = Tone.Time("16n").toSeconds();
                        const totalEventsInSourceSeq = sourceSequence.length;

                        for(let stepIndex = 0; stepIndex < totalEventsInSourceSeq; stepIndex++) {
                            const timeWithinSourceSeq = stepIndex * sixteenthTime;
                            const actualTransportTimeForStep = clipActualStartOnTransport + timeWithinSourceSeq;

                            if (actualTransportTimeForStep >= effectivePlayStartOnTransport && actualTransportTimeForStep < effectivePlayEndOnTransport) {
                                for (let rowIndex = 0; rowIndex < sourceSequence.data.length; rowIndex++) {
                                    const stepData = sourceSequence.data[rowIndex]?.[stepIndex];
                                    if (stepData?.active) {
                                        Tone.Transport.scheduleOnce((time) => {
                                            const currentGlobalSoloId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
                                            const isEffectivelyMuted = this.isMuted || (currentGlobalSoloId !== null && currentGlobalSoloId !== this.id);
                                            if (!this.gainNode || this.gainNode.disposed || isEffectivelyMuted) return;

                                            const effectsChainStartPoint = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                                                ? this.activeEffects[0].toneNode
                                                : (this.gainNode && !this.gainNode.disposed ? this.gainNode : null);
                                            if (!effectsChainStartPoint) return;

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
                                                    tempPlayer.loop = false;
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
        } else {
            if (!this.patternPlayerSequence || this.patternPlayerSequence.disposed) {
                console.log(`[Track ${this.id}] Sequencer mode: patternPlayerSequence is null or disposed. Attempting to recreate.`);
                this.recreateToneSequence(true, transportStartTime);
            }
            if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
                if (this.patternPlayerSequence.state === 'started') {
                    this.patternPlayerSequence.stop(Tone.Transport.now());
                }
                console.log(`[Track ${this.id}] Sequencer mode: Starting/Restarting patternPlayerSequence at transport offset: ${transportStartTime}. Sequence loop: ${this.patternPlayerSequence.loop}`);
                this.patternPlayerSequence.start(transportStartTime);
            } else {
                 console.warn(`[Track ${this.id}] Sequencer mode: patternPlayerSequence still not valid after recreation attempt.`);
            }
        }
    }

    stopPlayback() {
        console.log(`[Track ${this.id}] stopPlayback called. Current timeline clip players: ${this.clipPlayers.size}`);
        const playersToStop = Array.from(this.clipPlayers.values());

        playersToStop.forEach(player => {
            if (player && !player.disposed) {
                try {
                    player.unsync();
                    player.stop(Tone.Transport.now());
                    player.dispose();
                } catch (e) {
                    console.warn(`[Track ${this.id}] Error stopping/disposing a timeline clip player:`, e);
                }
            }
        });
        this.clipPlayers.clear();

        if (this.patternPlayerSequence && this.patternPlayerSequence.state === 'started') {
            this.patternPlayerSequence.stop();
            console.log(`[Track ${this.id}] Stopped patternPlayerSequence.`);
        }
    }


    async updateAudioClipPosition(clipId, newStartTime) {
        const clip = this.timelineClips.find(c => c.id === clipId);
        if (clip) {
            const oldStartTime = clip.startTime;
            clip.startTime = Math.max(0, newStartTime);
            console.log(`[Track ${this.id}] Updated ${clip.type} clip ${clipId} startTime from ${oldStartTime} to ${clip.startTime}`);

            if (this.appServices.renderTimeline) {
                this.appServices.renderTimeline();
            }

            const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
            if (Tone.Transport.state === 'started' && playbackMode === 'timeline') {
                const currentPlayheadPosition = Tone.Transport.seconds;
                console.log(`[Track ${this.id}] Transport is running at ${currentPlayheadPosition}s. Handling clip move in timeline mode.`);

                Tone.Transport.pause();
                console.log(`[Track ${this.id}] Transport paused for rescheduling.`);

                const allTracks = this.appServices.getTracks ? this.appServices.getTracks() : [];
                allTracks.forEach(t => {
                    if (typeof t.stopPlayback === 'function') {
                        t.stopPlayback();
                    }
                });

                Tone.Transport.cancel(0);
                console.log(`[Track ${this.id}] Called Tone.Transport.cancel(0) globally.`);

                const lookaheadDuration = 300;
                const transportStopTime = Tone.Transport.loop && Tone.Transport.loopEnd > 0 ?
                                          Tone.Transport.loopEnd :
                                          (currentPlayheadPosition + lookaheadDuration);

                console.log(`[Track ${this.id}] Re-scheduling ALL tracks from ${currentPlayheadPosition} to ${transportStopTime}.`);
                for (const t of allTracks) {
                    if (typeof t.schedulePlayback === 'function') {
                        await t.schedulePlayback(currentPlayheadPosition, transportStopTime);
                    }
                }

                Tone.Transport.start(Tone.Transport.now() + 0.1, currentPlayheadPosition);
                console.log(`[Track ${this.id}] Restarted transport from ${currentPlayheadPosition}s after rescheduling.`);
            }
        } else {
            console.warn(`[Track ${this.id}] Could not find clip ${clipId} to update its position.`);
        }
    }

    dispose() {
        console.log(`[Track ${this.id} Dispose] Starting disposal for track: ${this.name}`);
        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) { this.patternPlayerSequence.stop(); this.patternPlayerSequence.clear(); this.patternPlayerSequence.dispose(); }
        if (this.instrument && !this.instrument.disposed) { this.instrument.dispose(); }
        if (this.toneSampler && !this.toneSampler.disposed) { this.toneSampler.dispose(); }
        this.disposeSlicerMonoNodes();
        this.drumPadPlayers.forEach(player => { if (player && !player.disposed) player.dispose(); });
        this.activeEffects.forEach(effect => { if (effect.toneNode && !effect.toneNode.disposed) effect.toneNode.dispose(); });
        if (this.gainNode && !this.gainNode.disposed) { this.gainNode.dispose(); }
        if (this.trackMeter && !this.trackMeter.disposed) { this.trackMeter.dispose(); }
        if (this.inputChannel && !this.inputChannel.disposed) { this.inputChannel.dispose(); }
        this.stopPlayback();

        if (this.appServices.closeAllTrackWindows) {
            console.log(`[Track ${this.id} Dispose] Calling appServices.closeAllTrackWindows for track ID: ${this.id}`);
            this.appServices.closeAllTrackWindows(this.id);
        } else {
            console.warn(`[Track ${this.id} Dispose] appServices.closeAllTrackWindows NOT FOUND.`);
        }

        this.audioBuffer = null;
        this.drumSamplerPads.forEach(p => p.audioBuffer = null);
        if (this.instrumentSamplerSettings) this.instrumentSamplerSettings.audioBuffer = null;
        console.log(`[Track ${this.id} Dispose] Finished disposal for track: ${this.name}`);
    }
}
