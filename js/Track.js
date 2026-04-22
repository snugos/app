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

        // Pan control (-1 left to +1 right)
        this.pan = initialData?.pan !== undefined ? initialData.pan : 0;
    }

    /**
     * Creates a deep copy of this track with a new ID.
     * Used for duplicating tracks in the DAW.
     * @param {number} [newId] - Optional specific ID for the new track. If not provided, a new ID will be generated.
     * @returns {Track} A new Track instance that is a copy of this track.
     */
    duplicateTrack(newId = null) {
        // Capture undo state before duplicating
        this._captureUndoState(`Duplicate Track "${this.name}"`);

        // Create a deep copy of the initial data from this track
        // We need to serialize what would be needed to reconstruct this track
        const trackDataForCopy = {
            name: `${this.name} (Copy)`,
            color: this.color,
            isMuted: this.isMuted,
            volume: this.previousVolumeBeforeMute,
            pan: this.pan,
            isMonitoringEnabled: this.isMonitoringEnabled,
            automation: this.automation ? JSON.parse(JSON.stringify(this.automation)) : { volume: [] },
            activeEffects: (this.activeEffects || []).map(effect => ({
                id: effect.id,
                type: effect.type,
                params: effect.params ? JSON.parse(JSON.stringify(effect.params)) : {}
            })),
        };

        // Type-specific data copies
        if (this.type === 'Synth') {
            trackDataForCopy.synthEngineType = this.synthEngineType;
            trackDataForCopy.synthParams = this.synthParams ? JSON.parse(JSON.stringify(this.synthParams)) : {};
        } else if (this.type === 'Sampler') {
            trackDataForCopy.samplerAudioData = {
                fileName: this.samplerAudioData?.fileName,
                audioBufferDataURL: this.samplerAudioData?.audioBufferDataURL,
                dbKey: this.samplerAudioData?.dbKey,
                status: this.samplerAudioData?.status
            };
            trackDataForCopy.slices = this.slices ? JSON.parse(JSON.stringify(this.slices)) : [];
            trackDataForCopy.selectedSliceForEdit = this.selectedSliceForEdit;
            trackDataForCopy.slicerIsPolyphonic = this.slicerIsPolyphonic;
            trackDataForCopy.waveformZoom = this.waveformZoom;
            trackDataForCopy.waveformScrollOffset = this.waveformScrollOffset;
        } else if (this.type === 'DrumSampler') {
            trackDataForCopy.drumSamplerPads = (this.drumSamplerPads || []).map(pad => ({
                sampleUrl: pad.sampleUrl,
                audioBufferDataURL: pad.audioBufferDataURL,
                originalFileName: pad.originalFileName,
                dbKey: pad.dbKey,
                volume: pad.volume,
                pitchShift: pad.pitchShift,
                envelope: pad.envelope ? JSON.parse(JSON.stringify(pad.envelope)) : {},
                status: pad.status
            }));
            trackDataForCopy.selectedDrumPadForEdit = this.selectedDrumPadForEdit;
        } else if (this.type === 'InstrumentSampler') {
            trackDataForCopy.instrumentSamplerSettings = {
                sampleUrl: this.instrumentSamplerSettings?.sampleUrl,
                audioBufferDataURL: this.instrumentSamplerSettings?.audioBufferDataURL,
                originalFileName: this.instrumentSamplerSettings?.originalFileName,
                dbKey: this.instrumentSamplerSettings?.dbKey,
                rootNote: this.instrumentSamplerSettings?.rootNote,
                loop: this.instrumentSamplerSettings?.loop,
                loopStart: this.instrumentSamplerSettings?.loopStart,
                loopEnd: this.instrumentSamplerSettings?.loopEnd,
                envelope: this.instrumentSamplerSettings?.envelope ? JSON.parse(JSON.stringify(this.instrumentSamplerSettings.envelope)) : {},
                status: this.instrumentSamplerSettings?.status
            };
            trackDataForCopy.instrumentSamplerIsPolyphonic = this.instrumentSamplerIsPolyphonic;
        }

        // Copy sequences (for non-Audio tracks)
        if (this.type !== 'Audio' && this.sequences) {
            trackDataForCopy.sequences = JSON.parse(JSON.stringify(this.sequences));
            trackDataForCopy.activeSequenceId = this.activeSequenceId;
        }

        // Copy timeline clips
        if (this.timelineClips) {
            trackDataForCopy.timelineClips = JSON.parse(JSON.stringify(this.timelineClips));
        }

        // Assign new ID if not provided
        const finalId = newId !== null ? newId : (this.id + 1000); // Use offset to avoid ID conflicts

        // Create new track instance with the copied data
        const newTrack = new Track(finalId, this.type, trackDataForCopy, this.appServices);

        return newTrack;
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
                if (this.pan !== undefined && this.pan !== 0) {
                    this.inputChannel.pan.setValueAtTime(this.pan, Tone.now());
                }
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

    setPan(value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set pan on ${this.name}`);
        this.pan = Math.max(-1, Math.min(parseFloat(value) || 0, 1));
        if (this.inputChannel && !this.inputChannel.disposed) {
            try {
                this.inputChannel.pan.setValueAtTime(this.pan, Tone.now());
            } catch (e) { console.error(`[Track ${this.id}] Error setting pan:`, e); }
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
    }

    getPan() {
        return this.pan;
    }

    // --- Automation Lane Methods ---
    // Get automation lane data for a parameter
    getAutomationLane(parameter) {
        if (!this.automation) this.automation = { volume: [] };
        if (!this.automation[parameter]) this.automation[parameter] = [];
        return this.automation[parameter];
    }

    // Set automation point at a specific step
    setAutomationPoint(parameter, step, value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set automation ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const existingIndex = lane.findIndex(p => p.step === step);
        if (existingIndex >= 0) {
            lane[existingIndex].value = value;
        } else {
            lane.push({ step, value });
            lane.sort((a, b) => a.step - b.step);
        }
        return true;
    }

    // Get automation value at a step (with interpolation)
    getAutomationValue(parameter, step) {
        const lane = this.getAutomationLane(parameter);
        if (lane.length === 0) return Constants.AUTOMATION_LANE_DEFAULT;
        
        // Find surrounding points for interpolation
        let before = null, after = null;
        for (const point of lane) {
            if (point.step <= step) before = point;
            if (point.step > step && !after) after = point;
        }
        
        if (!before && !after) return Constants.AUTOMATION_LANE_DEFAULT;
        if (!before) return after.value;
        if (!after) return before.value;
        
        // Linear interpolation
        const t = (step - before.step) / (after.step - before.step);
        return before.value + t * (after.value - before.value);
    }

    // Clear automation lane for a parameter
    clearAutomationLane(parameter, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Clear automation lane ${parameter}`);
        if (this.automation && this.automation[parameter]) {
            this.automation[parameter] = [];
        }
    }

    // Remove single automation point
    removeAutomationPoint(parameter, step, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Remove automation point ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const index = lane.findIndex(p => p.step === step);
        if (index >= 0) {
            lane.splice(index, 1);
            return true;
        }
        return false;
    }

    // Get automation lane count (number of points)
    getAutomationLaneCount(parameter) {
        return this.getAutomationLane(parameter).length;
    }

    // Check if track has any automation data
    hasAutomation() {
        if (!this.automation) return false;
        return Object.keys(this.automation).some(key => this.automation[key].length > 0);
    }

    setTrackName(newName) {
        if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
            if (this.appServices.showNotification) {
                this.appServices.showNotification('Track name cannot be empty.', 2000);
            }
            return false;
        }
        this._captureUndoState(`Rename track to "${newName}"`);
        this.name = newName.trim();
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'nameChanged');
        }
        if (this.appServices.renderTimeline) {
            this.appServices.renderTimeline();
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
        return true;
    }

    getTrackName() {
        return this.name;
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
                        
                        this.instrument.triggerAttackRelease(pitchName, noteDuration, time, step.velocity * Constants.defaultVelocity);
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

    setPan(value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set pan on ${this.name}`);
        this.pan = Math.max(-1, Math.min(parseFloat(value) || 0, 1));
        if (this.inputChannel && !this.inputChannel.disposed) {
            try {
                this.inputChannel.pan.setValueAtTime(this.pan, Tone.now());
            } catch (e) { console.error(`[Track ${this.id}] Error setting pan:`, e); }
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
    }

    getPan() {
        return this.pan;
    }

    // --- Automation Lane Methods ---
    // Get automation lane data for a parameter
    getAutomationLane(parameter) {
        if (!this.automation) this.automation = { volume: [] };
        if (!this.automation[parameter]) this.automation[parameter] = [];
        return this.automation[parameter];
    }

    // Set automation point at a specific step
    setAutomationPoint(parameter, step, value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set automation ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const existingIndex = lane.findIndex(p => p.step === step);
        if (existingIndex >= 0) {
            lane[existingIndex].value = value;
        } else {
            lane.push({ step, value });
            lane.sort((a, b) => a.step - b.step);
        }
        return true;
    }

    // Get automation value at a step (with interpolation)
    getAutomationValue(parameter, step) {
        const lane = this.getAutomationLane(parameter);
        if (lane.length === 0) return Constants.AUTOMATION_LANE_DEFAULT;
        
        // Find surrounding points for interpolation
        let before = null, after = null;
        for (const point of lane) {
            if (point.step <= step) before = point;
            if (point.step > step && !after) after = point;
        }
        
        if (!before && !after) return Constants.AUTOMATION_LANE_DEFAULT;
        if (!before) return after.value;
        if (!after) return before.value;
        
        // Linear interpolation
        const t = (step - before.step) / (after.step - before.step);
        return before.value + t * (after.value - before.value);
    }

    // Clear automation lane for a parameter
    clearAutomationLane(parameter, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Clear automation lane ${parameter}`);
        if (this.automation && this.automation[parameter]) {
            this.automation[parameter] = [];
        }
    }

    // Remove single automation point
    removeAutomationPoint(parameter, step, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Remove automation point ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const index = lane.findIndex(p => p.step === step);
        if (index >= 0) {
            lane.splice(index, 1);
            return true;
        }
        return false;
    }

    // Get automation lane count (number of points)
    getAutomationLaneCount(parameter) {
        return this.getAutomationLane(parameter).length;
    }

    // Check if track has any automation data
    hasAutomation() {
        if (!this.automation) return false;
        return Object.keys(this.automation).some(key => this.automation[key].length > 0);
    }

    setTrackName(newName) {
        if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
            if (this.appServices.showNotification) {
                this.appServices.showNotification('Track name cannot be empty.', 2000);
            }
            return false;
        }
        this._captureUndoState(`Rename track to "${newName}"`);
        this.name = newName.trim();
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'nameChanged');
        }
        if (this.appServices.renderTimeline) {
            this.appServices.renderTimeline();
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
        return true;
    }

    getTrackName() {
        return this.name;
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
                        
                        this.instrument.triggerAttackRelease(pitchName, noteDuration, time, step.velocity * Constants.defaultVelocity);
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

    setPan(value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set pan on ${this.name}`);
        this.pan = Math.max(-1, Math.min(parseFloat(value) || 0, 1));
        if (this.inputChannel && !this.inputChannel.disposed) {
            try {
                this.inputChannel.pan.setValueAtTime(this.pan, Tone.now());
            } catch (e) { console.error(`[Track ${this.id}] Error setting pan:`, e); }
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
    }

    getPan() {
        return this.pan;
    }

    // --- Automation Lane Methods ---
    // Get automation lane data for a parameter
    getAutomationLane(parameter) {
        if (!this.automation) this.automation = { volume: [] };
        if (!this.automation[parameter]) this.automation[parameter] = [];
        return this.automation[parameter];
    }

    // Set automation point at a specific step
    setAutomationPoint(parameter, step, value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set automation ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const existingIndex = lane.findIndex(p => p.step === step);
        if (existingIndex >= 0) {
            lane[existingIndex].value = value;
        } else {
            lane.push({ step, value });
            lane.sort((a, b) => a.step - b.step);
        }
        return true;
    }

    // Get automation value at a step (with interpolation)
    getAutomationValue(parameter, step) {
        const lane = this.getAutomationLane(parameter);
        if (lane.length === 0) return Constants.AUTOMATION_LANE_DEFAULT;
        
        // Find surrounding points for interpolation
        let before = null, after = null;
        for (const point of lane) {
            if (point.step <= step) before = point;
            if (point.step > step && !after) after = point;
        }
        
        if (!before && !after) return Constants.AUTOMATION_LANE_DEFAULT;
        if (!before) return after.value;
        if (!after) return before.value;
        
        // Linear interpolation
        const t = (step - before.step) / (after.step - before.step);
        return before.value + t * (after.value - before.value);
    }

    // Clear automation lane for a parameter
    clearAutomationLane(parameter, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Clear automation lane ${parameter}`);
        if (this.automation && this.automation[parameter]) {
            this.automation[parameter] = [];
        }
    }

    // Remove single automation point
    removeAutomationPoint(parameter, step, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Remove automation point ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const index = lane.findIndex(p => p.step === step);
        if (index >= 0) {
            lane.splice(index, 1);
            return true;
        }
        return false;
    }

    // Get automation lane count (number of points)
    getAutomationLaneCount(parameter) {
        return this.getAutomationLane(parameter).length;
    }

    // Check if track has any automation data
    hasAutomation() {
        if (!this.automation) return false;
        return Object.keys(this.automation).some(key => this.automation[key].length > 0);
    }

    setTrackName(newName) {
        if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
            if (this.appServices.showNotification) {
                this.appServices.showNotification('Track name cannot be empty.', 2000);
            }
            return false;
        }
        this._captureUndoState(`Rename track to "${newName}"`);
        this.name = newName.trim();
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'nameChanged');
        }
        if (this.appServices.renderTimeline) {
            this.appServices.renderTimeline();
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
        return true;
    }

    getTrackName() {
        return this.name;
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
                        
                        this.instrument.triggerAttackRelease(pitchName, noteDuration, time, step.velocity * Constants.defaultVelocity);
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

    setPan(value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set pan on ${this.name}`);
        this.pan = Math.max(-1, Math.min(parseFloat(value) || 0, 1));
        if (this.inputChannel && !this.inputChannel.disposed) {
            try {
                this.inputChannel.pan.setValueAtTime(this.pan, Tone.now());
            } catch (e) { console.error(`[Track ${this.id}] Error setting pan:`, e); }
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
    }

    getPan() {
        return this.pan;
    }

    // --- Automation Lane Methods ---
    // Get automation lane data for a parameter
    getAutomationLane(parameter) {
        if (!this.automation) this.automation = { volume: [] };
        if (!this.automation[parameter]) this.automation[parameter] = [];
        return this.automation[parameter];
    }

    // Set automation point at a specific step
    setAutomationPoint(parameter, step, value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set automation ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const existingIndex = lane.findIndex(p => p.step === step);
        if (existingIndex >= 0) {
            lane[existingIndex].value = value;
        } else {
            lane.push({ step, value });
            lane.sort((a, b) => a.step - b.step);
        }
        return true;
    }

    // Get automation value at a step (with interpolation)
    getAutomationValue(parameter, step) {
        const lane = this.getAutomationLane(parameter);
        if (lane.length === 0) return Constants.AUTOMATION_LANE_DEFAULT;
        
        // Find surrounding points for interpolation
        let before = null, after = null;
        for (const point of lane) {
            if (point.step <= step) before = point;
            if (point.step > step && !after) after = point;
        }
        
        if (!before && !after) return Constants.AUTOMATION_LANE_DEFAULT;
        if (!before) return after.value;
        if (!after) return before.value;
        
        // Linear interpolation
        const t = (step - before.step) / (after.step - before.step);
        return before.value + t * (after.value - before.value);
    }

    // Clear automation lane for a parameter
    clearAutomationLane(parameter, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Clear automation lane ${parameter}`);
        if (this.automation && this.automation[parameter]) {
            this.automation[parameter] = [];
        }
    }

    // Remove single automation point
    removeAutomationPoint(parameter, step, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Remove automation point ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const index = lane.findIndex(p => p.step === step);
        if (index >= 0) {
            lane.splice(index, 1);
            return true;
        }
        return false;
    }

    // Get automation lane count (number of points)
    getAutomationLaneCount(parameter) {
        return this.getAutomationLane(parameter).length;
    }

    // Check if track has any automation data
    hasAutomation() {
        if (!this.automation) return false;
        return Object.keys(this.automation).some(key => this.automation[key].length > 0);
    }

    setTrackName(newName) {
        if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
            if (this.appServices.showNotification) {
                this.appServices.showNotification('Track name cannot be empty.', 2000);
            }
            return false;
        }
        this._captureUndoState(`Rename track to "${newName}"`);
        this.name = newName.trim();
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'nameChanged');
        }
        if (this.appServices.renderTimeline) {
            this.appServices.renderTimeline();
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
        return true;
    }

    getTrackName() {
        return this.name;
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
                        
                        this.instrument.triggerAttackRelease(pitchName, noteDuration, time, step.velocity * Constants.defaultVelocity);
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

    setPan(value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set pan on ${this.name}`);
        this.pan = Math.max(-1, Math.min(parseFloat(value) || 0, 1));
        if (this.inputChannel && !this.inputChannel.disposed) {
            try {
                this.inputChannel.pan.setValueAtTime(this.pan, Tone.now());
            } catch (e) { console.error(`[Track ${this.id}] Error setting pan:`, e); }
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
    }

    getPan() {
        return this.pan;
    }

    // --- Automation Lane Methods ---
    // Get automation lane data for a parameter
    getAutomationLane(parameter) {
        if (!this.automation) this.automation = { volume: [] };
        if (!this.automation[parameter]) this.automation[parameter] = [];
        return this.automation[parameter];
    }

    // Set automation point at a specific step
    setAutomationPoint(parameter, step, value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set automation ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const existingIndex = lane.findIndex(p => p.step === step);
        if (existingIndex >= 0) {
            lane[existingIndex].value = value;
        } else {
            lane.push({ step, value });
            lane.sort((a, b) => a.step - b.step);
        }
        return true;
    }

    // Get automation value at a step (with interpolation)
    getAutomationValue(parameter, step) {
        const lane = this.getAutomationLane(parameter);
        if (lane.length === 0) return Constants.AUTOMATION_LANE_DEFAULT;
        
        // Find surrounding points for interpolation
        let before = null, after = null;
        for (const point of lane) {
            if (point.step <= step) before = point;
            if (point.step > step && !after) after = point;
        }
        
        if (!before && !after) return Constants.AUTOMATION_LANE_DEFAULT;
        if (!before) return after.value;
        if (!after) return before.value;
        
        // Linear interpolation
        const t = (step - before.step) / (after.step - before.step);
        return before.value + t * (after.value - before.value);
    }

    // Clear automation lane for a parameter
    clearAutomationLane(parameter, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Clear automation lane ${parameter}`);
        if (this.automation && this.automation[parameter]) {
            this.automation[parameter] = [];
        }
    }

    // Remove single automation point
    removeAutomationPoint(parameter, step, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Remove automation point ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const index = lane.findIndex(p => p.step === step);
        if (index >= 0) {
            lane.splice(index, 1);
            return true;
        }
        return false;
    }

    // Get automation lane count (number of points)
    getAutomationLaneCount(parameter) {
        return this.getAutomationLane(parameter).length;
    }

    // Check if track has any automation data
    hasAutomation() {
        if (!this.automation) return false;
        return Object.keys(this.automation).some(key => this.automation[key].length > 0);
    }

    setTrackName(newName) {
        if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
            if (this.appServices.showNotification) {
                this.appServices.showNotification('Track name cannot be empty.', 2000);
            }
            return false;
        }
        this._captureUndoState(`Rename track to "${newName}"`);
        this.name = newName.trim();
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'nameChanged');
        }
        if (this.appServices.renderTimeline) {
            this.appServices.renderTimeline();
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
        return true;
    }

    getTrackName() {
        return this.name;
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
                        
                        this.instrument.triggerAttackRelease(pitchName, noteDuration, time, step.velocity * Constants.defaultVelocity);
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

    setPan(value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set pan on ${this.name}`);
        this.pan = Math.max(-1, Math.min(parseFloat(value) || 0, 1));
        if (this.inputChannel && !this.inputChannel.disposed) {
            try {
                this.inputChannel.pan.setValueAtTime(this.pan, Tone.now());
            } catch (e) { console.error(`[Track ${this.id}] Error setting pan:`, e); }
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
    }

    getPan() {
        return this.pan;
    }

    // --- Automation Lane Methods ---
    // Get automation lane data for a parameter
    getAutomationLane(parameter) {
        if (!this.automation) this.automation = { volume: [] };
        if (!this.automation[parameter]) this.automation[parameter] = [];
        return this.automation[parameter];
    }

    // Set automation point at a specific step
    setAutomationPoint(parameter, step, value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set automation ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const existingIndex = lane.findIndex(p => p.step === step);
        if (existingIndex >= 0) {
            lane[existingIndex].value = value;
        } else {
            lane.push({ step, value });
            lane.sort((a, b) => a.step - b.step);
        }
        return true;
    }

    // Get automation value at a step (with interpolation)
    getAutomationValue(parameter, step) {
        const lane = this.getAutomationLane(parameter);
        if (lane.length === 0) return Constants.AUTOMATION_LANE_DEFAULT;
        
        // Find surrounding points for interpolation
        let before = null, after = null;
        for (const point of lane) {
            if (point.step <= step) before = point;
            if (point.step > step && !after) after = point;
        }
        
        if (!before && !after) return Constants.AUTOMATION_LANE_DEFAULT;
        if (!before) return after.value;
        if (!after) return before.value;
        
        // Linear interpolation
        const t = (step - before.step) / (after.step - before.step);
        return before.value + t * (after.value - before.value);
    }

    // Clear automation lane for a parameter
    clearAutomationLane(parameter, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Clear automation lane ${parameter}`);
        if (this.automation && this.automation[parameter]) {
            this.automation[parameter] = [];
        }
    }

    // Remove single automation point
    removeAutomationPoint(parameter, step, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Remove automation point ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const index = lane.findIndex(p => p.step === step);
        if (index >= 0) {
            lane.splice(index, 1);
            return true;
        }
        return false;
    }

    // Get automation lane count (number of points)
    getAutomationLaneCount(parameter) {
        return this.getAutomationLane(parameter).length;
    }

    // Check if track has any automation data
    hasAutomation() {
        if (!this.automation) return false;
        return Object.keys(this.automation).some(key => this.automation[key].length > 0);
    }

    setTrackName(newName) {
        if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
            if (this.appServices.showNotification) {
                this.appServices.showNotification('Track name cannot be empty.', 2000);
            }
            return false;
        }
        this._captureUndoState(`Rename track to "${newName}"`);
        this.name = newName.trim();
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'nameChanged');
        }
        if (this.appServices.renderTimeline) {
            this.appServices.renderTimeline();
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
        return true;
    }

    getTrackName() {
        return this.name;
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
                        
                        this.instrument.triggerAttackRelease(pitchName, noteDuration, time, step.velocity * Constants.defaultVelocity);
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

    setPan(value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set pan on ${this.name}`);
        this.pan = Math.max(-1, Math.min(parseFloat(value) || 0, 1));
        if (this.inputChannel && !this.inputChannel.disposed) {
            try {
                this.inputChannel.pan.setValueAtTime(this.pan, Tone.now());
            } catch (e) { console.error(`[Track ${this.id}] Error setting pan:`, e); }
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
    }

    getPan() {
        return this.pan;
    }

    // --- Automation Lane Methods ---
    // Get automation lane data for a parameter
    getAutomationLane(parameter) {
        if (!this.automation) this.automation = { volume: [] };
        if (!this.automation[parameter]) this.automation[parameter] = [];
        return this.automation[parameter];
    }

    // Set automation point at a specific step
    setAutomationPoint(parameter, step, value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set automation ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const existingIndex = lane.findIndex(p => p.step === step);
        if (existingIndex >= 0) {
            lane[existingIndex].value = value;
        } else {
            lane.push({ step, value });
            lane.sort((a, b) => a.step - b.step);
        }
        return true;
    }

    // Get automation value at a step (with interpolation)
    getAutomationValue(parameter, step) {
        const lane = this.getAutomationLane(parameter);
        if (lane.length === 0) return Constants.AUTOMATION_LANE_DEFAULT;
        
        // Find surrounding points for interpolation
        let before = null, after = null;
        for (const point of lane) {
            if (point.step <= step) before = point;
            if (point.step > step && !after) after = point;
        }
        
        if (!before && !after) return Constants.AUTOMATION_LANE_DEFAULT;
        if (!before) return after.value;
        if (!after) return before.value;
        
        // Linear interpolation
        const t = (step - before.step) / (after.step - before.step);
        return before.value + t * (after.value - before.value);
    }

    // Clear automation lane for a parameter
    clearAutomationLane(parameter, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Clear automation lane ${parameter}`);
        if (this.automation && this.automation[parameter]) {
            this.automation[parameter] = [];
        }
    }

    // Remove single automation point
    removeAutomationPoint(parameter, step, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Remove automation point ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const index = lane.findIndex(p => p.step === step);
        if (index >= 0) {
            lane.splice(index, 1);
            return true;
        }
        return false;
    }

    // Get automation lane count (number of points)
    getAutomationLaneCount(parameter) {
        return this.getAutomationLane(parameter).length;
    }

    // Check if track has any automation data
    hasAutomation() {
        if (!this.automation) return false;
        return Object.keys(this.automation).some(key => this.automation[key].length > 0);
    }

    setTrackName(newName) {
        if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
            if (this.appServices.showNotification) {
                this.appServices.showNotification('Track name cannot be empty.', 2000);
            }
            return false;
        }
        this._captureUndoState(`Rename track to "${newName}"`);
        this.name = newName.trim();
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'nameChanged');
        }
        if (this.appServices.renderTimeline) {
            this.appServices.renderTimeline();
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
        return true;
    }

    getTrackName() {
        return this.name;
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
                        
                        this.instrument.triggerAttackRelease(pitchName, noteDuration, time, step.velocity * Constants.defaultVelocity);
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

    setPan(value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set pan on ${this.name}`);
        this.pan = Math.max(-1, Math.min(parseFloat(value) || 0, 1));
        if (this.inputChannel && !this.inputChannel.disposed) {
            try {
                this.inputChannel.pan.setValueAtTime(this.pan, Tone.now());
            } catch (e) { console.error(`[Track ${this.id}] Error setting pan:`, e); }
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
    }

    getPan() {
        return this.pan;
    }

    // --- Automation Lane Methods ---
    // Get automation lane data for a parameter
    getAutomationLane(parameter) {
        if (!this.automation) this.automation = { volume: [] };
        if (!this.automation[parameter]) this.automation[parameter] = [];
        return this.automation[parameter];
    }

    // Set automation point at a specific step
    setAutomationPoint(parameter, step, value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set automation ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const existingIndex = lane.findIndex(p => p.step === step);
        if (existingIndex >= 0) {
            lane[existingIndex].value = value;
        } else {
            lane.push({ step, value });
            lane.sort((a, b) => a.step - b.step);
        }
        return true;
    }

    // Get automation value at a step (with interpolation)
    getAutomationValue(parameter, step) {
        const lane = this.getAutomationLane(parameter);
        if (lane.length === 0) return Constants.AUTOMATION_LANE_DEFAULT;
        
        // Find surrounding points for interpolation
        let before = null, after = null;
        for (const point of lane) {
            if (point.step <= step) before = point;
            if (point.step > step && !after) after = point;
        }
        
        if (!before && !after) return Constants.AUTOMATION_LANE_DEFAULT;
        if (!before) return after.value;
        if (!after) return before.value;
        
        // Linear interpolation
        const t = (step - before.step) / (after.step - before.step);
        return before.value + t * (after.value - before.value);
    }

    // Clear automation lane for a parameter
    clearAutomationLane(parameter, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Clear automation lane ${parameter}`);
        if (this.automation && this.automation[parameter]) {
            this.automation[parameter] = [];
        }
    }

    // Remove single automation point
    removeAutomationPoint(parameter, step, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Remove automation point ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const index = lane.findIndex(p => p.step === step);
        if (index >= 0) {
            lane.splice(index, 1);
            return true;
        }
        return false;
    }

    // Get automation lane count (number of points)
    getAutomationLaneCount(parameter) {
        return this.getAutomationLane(parameter).length;
    }

    // Check if track has any automation data
    hasAutomation() {
        if (!this.automation) return false;
        return Object.keys(this.automation).some(key => this.automation[key].length > 0);
    }

    setTrackName(newName) {
        if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
            if (this.appServices.showNotification) {
                this.appServices.showNotification('Track name cannot be empty.', 2000);
            }
            return false;
        }
        this._captureUndoState(`Rename track to "${newName}"`);
        this.name = newName.trim();
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'nameChanged');
        }
        if (this.appServices.renderTimeline) {
            this.appServices.renderTimeline();
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
        return true;
    }

    getTrackName() {
        return this.name;
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
                        
                        this.instrument.triggerAttackRelease(pitchName, noteDuration, time, step.velocity * Constants.defaultVelocity);
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

    setPan(value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set pan on ${this.name}`);
        this.pan = Math.max(-1, Math.min(parseFloat(value) || 0, 1));
        if (this.inputChannel && !this.inputChannel.disposed) {
            try {
                this.inputChannel.pan.setValueAtTime(this.pan, Tone.now());
            } catch (e) { console.error(`[Track ${this.id}] Error setting pan:`, e); }
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
    }

    getPan() {
        return this.pan;
    }

    // --- Automation Lane Methods ---
    // Get automation lane data for a parameter
    getAutomationLane(parameter) {
        if (!this.automation) this.automation = { volume: [] };
        if (!this.automation[parameter]) this.automation[parameter] = [];
        return this.automation[parameter];
    }

    // Set automation point at a specific step
    setAutomationPoint(parameter, step, value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set automation ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const existingIndex = lane.findIndex(p => p.step === step);
        if (existingIndex >= 0) {
            lane[existingIndex].value = value;
        } else {
            lane.push({ step, value });
            lane.sort((a, b) => a.step - b.step);
        }
        return true;
    }

    // Get automation value at a step (with interpolation)
    getAutomationValue(parameter, step) {
        const lane = this.getAutomationLane(parameter);
        if (lane.length === 0) return Constants.AUTOMATION_LANE_DEFAULT;
        
        // Find surrounding points for interpolation
        let before = null, after = null;
        for (const point of lane) {
            if (point.step <= step) before = point;
            if (point.step > step && !after) after = point;
        }
        
        if (!before && !after) return Constants.AUTOMATION_LANE_DEFAULT;
        if (!before) return after.value;
        if (!after) return before.value;
        
        // Linear interpolation
        const t = (step - before.step) / (after.step - before.step);
        return before.value + t * (after.value - before.value);
    }

    // Clear automation lane for a parameter
    clearAutomationLane(parameter, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Clear automation lane ${parameter}`);
        if (this.automation && this.automation[parameter]) {
            this.automation[parameter] = [];
        }
    }

    // Remove single automation point
    removeAutomationPoint(parameter, step, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Remove automation point ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const index = lane.findIndex(p => p.step === step);
        if (index >= 0) {
            lane.splice(index, 1);
            return true;
        }
        return false;
    }

    // Get automation lane count (number of points)
    getAutomationLaneCount(parameter) {
        return this.getAutomationLane(parameter).length;
    }

    // Check if track has any automation data
    hasAutomation() {
        if (!this.automation) return false;
        return Object.keys(this.automation).some(key => this.automation[key].length > 0);
    }

    setTrackName(newName) {
        if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
            if (this.appServices.showNotification) {
                this.appServices.showNotification('Track name cannot be empty.', 2000);
            }
            return false;
        }
        this._captureUndoState(`Rename track to "${newName}"`);
        this.name = newName.trim();
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'nameChanged');
        }
        if (this.appServices.renderTimeline) {
            this.appServices.renderTimeline();
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
        return true;
    }

    getTrackName() {
        return this.name;
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
                        
                        this.instrument.triggerAttackRelease(pitchName, noteDuration, time, step.velocity * Constants.defaultVelocity);
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

    setPan(value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set pan on ${this.name}`);
        this.pan = Math.max(-1, Math.min(parseFloat(value) || 0, 1));
        if (this.inputChannel && !this.inputChannel.disposed) {
            try {
                this.inputChannel.pan.setValueAtTime(this.pan, Tone.now());
            } catch (e) { console.error(`[Track ${this.id}] Error setting pan:`, e); }
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
    }

    getPan() {
        return this.pan;
    }

    // --- Automation Lane Methods ---
    // Get automation lane data for a parameter
    getAutomationLane(parameter) {
        if (!this.automation) this.automation = { volume: [] };
        if (!this.automation[parameter]) this.automation[parameter] = [];
        return this.automation[parameter];
    }

    // Set automation point at a specific step
    setAutomationPoint(parameter, step, value, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Set automation ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const existingIndex = lane.findIndex(p => p.step === step);
        if (existingIndex >= 0) {
            lane[existingIndex].value = value;
        } else {
            lane.push({ step, value });
            lane.sort((a, b) => a.step - b.step);
        }
        return true;
    }

    // Get automation value at a step (with interpolation)
    getAutomationValue(parameter, step) {
        const lane = this.getAutomationLane(parameter);
        if (lane.length === 0) return Constants.AUTOMATION_LANE_DEFAULT;
        
        // Find surrounding points for interpolation
        let before = null, after = null;
        for (const point of lane) {
            if (point.step <= step) before = point;
            if (point.step > step && !after) after = point;
        }
        
        if (!before && !after) return Constants.AUTOMATION_LANE_DEFAULT;
        if (!before) return after.value;
        if (!after) return before.value;
        
        // Linear interpolation
        const t = (step - before.step) / (after.step - before.step);
        return before.value + t * (after.value - before.value);
    }

    // Clear automation lane for a parameter
    clearAutomationLane(parameter, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Clear automation lane ${parameter}`);
        if (this.automation && this.automation[parameter]) {
            this.automation[parameter] = [];
        }
    }

    // Remove single automation point
    removeAutomationPoint(parameter, step, fromInteraction = false) {
        if (!fromInteraction) this._captureUndoState(`Remove automation point ${parameter} at step ${step}`);
        const lane = this.getAutomationLane(parameter);
        const index = lane.findIndex(p => p.step === step);
        if (index >= 0) {
            lane.splice(index, 1);
            return true;
        }
        return false;
    }

    // Get automation lane count (number of points)
    getAutomationLaneCount(parameter) {
        return this.getAutomationLane(parameter).length;
    }

    // Check if track has any automation data
    hasAutomation() {
        if (!this.automation) return false;
        return Object.keys(this.automation).some(key => this.automation[key].length > 0);
    }

    setTrackName(newName) {
        if (!newName || typeof newName !== 'string' || newName.trim().length === 0) {
            if (this.appServices.showNotification) {
                this.appServices.showNotification('Track name cannot be empty.', 2000);
            }
            return false;
        }
        this._captureUndoState(`Rename track to "${newName}"`);
        this.name = newName.trim();
        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'nameChanged');
        }
        if (this.appServices.renderTimeline) {
            this.appServices.renderTimeline();
        }
        if (this.appServices.updateMixerWindow) {
            this.appServices.updateMixerWindow();
        }
        return true;
    }

    getTrackName() {
        return this.name;
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
                        
                        this.instrument.triggerAttackRelease(pitchName, noteDuration, time, step.velocity * Constants.defaultVelocity);
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
    // --- Audio Clip Management ---
    // Get audio clip by ID from timelineClips
    _getAudioClip(clipId) {
        return this.timelineClips.find(c => c.id === clipId);
    }

    // Set audio clip name with undo capture
    setAudioClipName(clipId, name) {
        const clip = this._getAudioClip(clipId);
        if (!clip) return false;
        const oldName = clip.name;
        if (oldName === name) return false;
        this._captureUndoState(`Rename clip "${oldName}" on ${this.name}`);
        clip.name = name;
        return true;
    }

    // Get audio clip name
    getAudioClipName(clipId) {
        const clip = this._getAudioClip(clipId);
        return clip ? clip.name : '';
    }

    // Set audio clip color with undo capture
    setAudioClipColor(clipId, color) {
        const clip = this._getAudioClip(clipId);
        if (!clip) return false;
        if (clip.color === color) return false;
        this._captureUndoState(`Set color on clip "${clip.name}"`);
        clip.color = color;
        return true;
    }

    // Get audio clip color
    getAudioClipColor(clipId) {
        const clip = this._getAudioClip(clipId);
        if (!clip) return null;
        if (clip.color) return clip.color;
        return clip.type === 'audio' ? Constants.DEFAULT_CLIP_COLOR : Constants.DEFAULT_CLIP_COLOR;
    }

    // Set audio clip gain with undo capture
    setAudioClipGain(clipId, gain) {
        const clip = this._getAudioClip(clipId);
        if (!clip) return false;
        const clamped = Math.max(Constants.MIN_AUDIO_CLIP_GAIN, Math.min(Constants.MAX_AUDIO_CLIP_GAIN, gain));
        if (clip.gain === clamped) return false;
        this._captureUndoState(`Set gain on clip "${clip.name}"`);
        clip.gain = clamped;
        return true;
    }

    // Get audio clip gain
    getAudioClipGain(clipId) {
        const clip = this._getAudioClip(clipId);
        return clip ? (clip.gain !== undefined ? clip.gain : Constants.DEFAULT_AUDIO_CLIP_GAIN) : Constants.DEFAULT_AUDIO_CLIP_GAIN;
    }

    // Set audio clip playback rate with undo capture
    setAudioClipPlaybackRate(clipId, rate) {
        const clip = this._getAudioClip(clipId);
        if (!clip) return false;
        const clamped = Math.max(Constants.MIN_AUDIO_CLIP_PLAYBACK_RATE, Math.min(Constants.MAX_AUDIO_CLIP_PLAYBACK_RATE, rate));
        if (clip.playbackRate === clamped) return false;
        this._captureUndoState(`Set playback rate on clip "${clip.name}"`);
        clip.playbackRate = clamped;
        return true;
    }

    // Get audio clip playback rate
    getAudioClipPlaybackRate(clipId) {
        const clip = this._getAudioClip(clipId);
        return clip ? (clip.playbackRate !== undefined ? clip.playbackRate : Constants.DEFAULT_AUDIO_CLIP_PLAYBACK_RATE) : Constants.DEFAULT_AUDIO_CLIP_PLAYBACK_RATE;
    }

    // Set audio clip start offset with undo capture
    setAudioClipStartOffset(clipId, startOffset) {
        const clip = this._getAudioClip(clipId);
        if (!clip) return false;
        const clamped = Math.max(Constants.MIN_AUDIO_CLIP_START_OFFSET, startOffset);
        if (clip.startOffset === clamped) return false;
        this._captureUndoState(`Set start offset on clip "${clip.name}"`);
        clip.startOffset = clamped;
        return true;
    }

    // Get audio clip start offset
    getAudioClipStartOffset(clipId) {
        const clip = this._getAudioClip(clipId);
        return clip ? (clip.startOffset !== undefined ? clip.startOffset : Constants.DEFAULT_AUDIO_CLIP_START_OFFSET) : Constants.DEFAULT_AUDIO_CLIP_START_OFFSET;
    }

    // Set audio clip end offset with undo capture (-1 = use full audio)
    setAudioClipEndOffset(clipId, endOffset) {
        const clip = this._getAudioClip(clipId);
        if (!clip) return false;
        if (clip.endOffset === endOffset) return false;
        this._captureUndoState(`Set end offset on clip "${clip.name}"`);
        clip.endOffset = endOffset;
        return true;
    }

    // Get audio clip end offset
    getAudioClipEndOffset(clipId) {
        const clip = this._getAudioClip(clipId);
        return clip ? (clip.endOffset !== undefined ? clip.endOffset : Constants.DEFAULT_AUDIO_CLIP_END_OFFSET) : Constants.DEFAULT_AUDIO_CLIP_END_OFFSET;
    }

    // Set audio clip crossfade with undo capture
    setAudioClipCrossfade(clipId, crossfade) {
        const clip = this._getAudioClip(clipId);
        if (!clip) return false;
        const clamped = Math.max(0, Math.min(1, crossfade));
        if (clip.crossfade === clamped) return false;
        this._captureUndoState(`Set crossfade on clip "${clip.name}"`);
        clip.crossfade = clamped;
        return true;
    }

    // Get audio clip crossfade
    getAudioClipCrossfade(clipId) {
        const clip = this._getAudioClip(clipId);
        return clip ? (clip.crossfade !== undefined ? clip.crossfade : 0) : 0;
    }

    // Set audio clip fade in time with undo capture
    setAudioClipFadeIn(clipId, fadeIn) {
        const clip = this._getAudioClip(clipId);
        if (!clip) return false;
        const clamped = Math.max(Constants.MIN_AUDIO_CLIP_FADE || 0, Math.min(Constants.MAX_AUDIO_CLIP_FADE || 10, fadeIn));
        if (clip.fadeIn === clamped) return false;
        this._captureUndoState(`Set fade in on clip "${clip.name}"`);
        clip.fadeIn = clamped;
        return true;
    }

    // Get audio clip fade in time
    getAudioClipFadeIn(clipId) {
        const clip = this._getAudioClip(clipId);
        return clip ? (clip.fadeIn !== undefined ? clip.fadeIn : Constants.DEFAULT_AUDIO_CLIP_FADE_IN) : Constants.DEFAULT_AUDIO_CLIP_FADE_IN;
    }
    // Set audio clip fade out time with undo capture
    setAudioClipFadeOut(clipId, fadeOut) {
        const clip = this._getAudioClip(clipId);
        if (!clip) return false;
        const clamped = Math.max(Constants.MIN_AUDIO_CLIP_FADE || 0, Math.min(Constants.MAX_AUDIO_CLIP_FADE || 10, fadeOut));
        if (clip.fadeOut === clamped) return false;
        this._captureUndoState(`Set fade out on clip "${clip.name}"`);
        clip.fadeOut = clamped;
        return true;
    }

    // Get audio clip fade out time
    getAudioClipFadeOut(clipId) {
        const clip = this._getAudioClip(clipId);
        return clip ? (clip.fadeOut !== undefined ? clip.fadeOut : Constants.DEFAULT_AUDIO_CLIP_FADE_OUT) : Constants.DEFAULT_AUDIO_CLIP_FADE_OUT;
    }

    // Set audio clip fade in curve with undo capture
    setAudioClipFadeInCurve(clipId, curve) {
        const clip = this._getAudioClip(clipId);
        if (!clip) return false;
        const validCurve = Constants.FADE_CURVES.includes(curve) ? curve : Constants.DEFAULT_FADE_IN_CURVE;
        if (clip.fadeInCurve === validCurve) return false;
        this._captureUndoState(`Set fade in curve on clip "${clip.name}"`);
        clip.fadeInCurve = validCurve;
        return true;
    }

    // Get audio clip fade in curve
    getAudioClipFadeInCurve(clipId) {
        const clip = this._getAudioClip(clipId);
        return clip ? (clip.fadeInCurve !== undefined ? clip.fadeInCurve : Constants.DEFAULT_FADE_IN_CURVE) : Constants.DEFAULT_FADE_IN_CURVE;
    }


    // Set audio clip fade out curve with undo capture
    setAudioClipFadeOutCurve(clipId, curve) {
        const clip = this._getAudioClip(clipId);
        if (!clip) return false;
        const validCurve = Constants.FADE_CURVES.includes(curve) ? curve : Constants.DEFAULT_FADE_OUT_CURVE;
        if (clip.fadeOutCurve === validCurve) return false;
        this._captureUndoState(`Set fade out curve on clip "${clip.name}"`);
        clip.fadeOutCurve = validCurve;
        return true;
    }
    // Get audio clip fade out curve
    getAudioClipFadeOutCurve(clipId) {
        const clip = this._getAudioClip(clipId);
        return clip ? (clip.fadeOutCurve !== undefined ? clip.fadeOutCurve : Constants.DEFAULT_FADE_OUT_CURVE) : Constants.DEFAULT_FADE_OUT_CURVE;
    }



    // Set audio clip reverse with undo capture
    setAudioClipReverse(clipId, reverse) {
        const clip = this._getAudioClip(clipId);
        if (!clip) return false;
        if (clip.reverse === reverse) return false;
        this._captureUndoState(`Set reverse on clip "${clip.name}"`);
        clip.reverse = reverse;
        return true;
    }
    // Get audio clip reverse
    getAudioClipReverse(clipId) {
        const clip = this._getAudioClip(clipId);
        return clip ? (clip.reverse !== undefined ? clip.reverse : false) : false;
    }
    // Delete a timeline clip with undo capture
    deleteTimelineClip(clipId) {
        const clip = this._getAudioClip(clipId);
        if (!clip) return false;
        const clipName = clip.name || clipId;
        this._captureUndoState(`Delete clip "${clipName}" from ${this.name}`);
        this.timelineClips = this.timelineClips.filter(c => c.id !== clipId);
        return true;
    }

    // Split an audio clip at a specific time
    splitAudioClip(clipId, splitTime) {
        const clip = this._getAudioClip(clipId);
        if (!clip || clip.type !== 'audio') return null;
        const clipEnd = clip.startTime + clip.duration;
        if (splitTime <= clip.startTime || splitTime >= clipEnd) return null;
        this._captureUndoState(`Split clip "${clip.name}" at ${splitTime.toFixed(2)}s`);
        const originalDuration = clip.duration;
        clip.duration = splitTime - clip.startTime;
        const newClip = {
            id: `audioclip_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            type: 'audio',
            sourceId: clip.sourceId,
            startTime: splitTime,
            duration: clipEnd - splitTime,
            name: `${clip.name || 'Clip'} (2)`,
            color: clip.color,
            gain: clip.gain,
            playbackRate: clip.playbackRate,
            startOffset: clip.startOffset !== undefined ? clip.startOffset + clip.duration : clip.duration,
            endOffset: clip.endOffset,
            crossfade: clip.crossfade
        };
        this.timelineClips.push(newClip);
        return newClip;
    }

    // Duplicate a timeline clip
    duplicateTimelineClip(clipId) {
        const clip = this._getAudioClip(clipId);
        if (!clip) return null;
        this._captureUndoState(`Duplicate clip "${clip.name}" on ${this.name}`);
        const newClip = JSON.parse(JSON.stringify(clip));
        newClip.id = `audioclip_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        newClip.name = `${clip.name || 'Clip'} (copy)`;
        newClip.startTime = clip.startTime + clip.duration;
        this.timelineClips.push(newClip);
        return newClip;
    }

    // Add an audio clip from recorded blob to timeline
    async addAudioClip(blob, startTime) {
        if (!blob || blob.size === 0) {
            console.warn("[Track addAudioClip] Invalid blob provided");
            return null;
        }
        try {
            const dbKey = `rec_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
            await storeAudio(dbKey, blob);
            
            this._captureUndoState(`Add recorded clip on ${this.name}`);
            
            const clipId = `audioclip_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
            const clipName = `Rec ${this.timelineClips.filter(c => c.type === 'audio').length + 1}`;
            
            const newClip = {
                id: clipId,
                type: 'audio',
                sourceId: dbKey,
                startTime: startTime || 0,
                duration: 0,
                name: clipName,
                color: Constants.DEFAULT_CLIP_COLOR,
                gain: Constants.DEFAULT_AUDIO_CLIP_GAIN,
                playbackRate: Constants.DEFAULT_AUDIO_CLIP_PLAYBACK_RATE,
                startOffset: Constants.DEFAULT_AUDIO_CLIP_START_OFFSET,
                endOffset: Constants.DEFAULT_AUDIO_CLIP_END_OFFSET,
                crossfade: Constants.DEFAULT_AUDIO_CLIP_CROSSFADE,
                fadeIn: Constants.DEFAULT_AUDIO_CLIP_FADE_IN,
                fadeOut: Constants.DEFAULT_AUDIO_CLIP_FADE_OUT,
                fadeInCurve: Constants.DEFAULT_FADE_IN_CURVE,
                fadeOutCurve: Constants.DEFAULT_FADE_OUT_CURVE,
                reverse: Constants.DEFAULT_AUDIO_CLIP_REVERSE
            };
            
            this.timelineClips.push(newClip);
            
            if (this.appServices.updateTrackUI) {
                this.appServices.updateTrackUI(this.id, 'audioClipAdded', clipId);
            }
            if (this.appServices.renderTimeline) {
                this.appServices.renderTimeline();
            }
            
            return newClip;
        } catch (error) {
            console.error("[Track addAudioClip] Error:", error);
            return null;
        }
    }
}
