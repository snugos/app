// js/Track.js - Track Class Module

import * as Constants from './constants.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';

const MAX_VOICES_PER_POOL = 32; // Maximum voices for object pooling, adjust as needed

export class Track {
    constructor(id, type, initialData = null, appServices = {}) {
        this.id = initialData?.id || id;
        this.type = type;
        this.appServices = appServices || {};

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

        // --- Voice Pooling for Sampler (Slicer) ---
        this._slicerVoicePool = []; // Stores all voice objects { player, envelope, gain, isIdle }
        this._slicerAvailableVoices = []; // Stores currently idle voice objects
        if (this.type === 'Sampler') {
            this._initializeSlicerVoicePool();
        }
        // --- End Voice Pooling ---

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
        this.audioBuffer = null; // This will hold the Tone.Buffer for the main sample
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
            audioBuffer: null, // This will hold the Tone.Buffer
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
        this.toneSampler = null; // This will be the Tone.Sampler instance

        // Drum Sampler specific
        this.drumSamplerPads = Array(Constants.numDrumSamplerPads).fill(null).map((_, padIdx) => {
            const initialPadData = initialData?.drumSamplerPads?.[padIdx];
            return {
                sampleUrl: initialPadData?.sampleUrl || null,
                audioBuffer: null, // This will hold the Tone.Buffer for the pad
                audioBufferDataURL: initialPadData?.audioBufferDataURL || null,
                originalFileName: initialPadData?.originalFileName || null,
                dbKey: initialPadData?.dbKey || null,
                volume: initialPadData?.volume ?? 0.7,
                pitchShift: initialPadData?.pitchShift ?? 0,
                envelope: initialPadData?.envelope ? JSON.parse(JSON.stringify(initialPadData.envelope)) : { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 },
                status: initialPadData?.status || (initialPadData?.dbKey || initialPadData?.audioBufferDataURL ? 'missing' : 'empty'),
                autoStretchEnabled: initialPadData?.autoStretchEnabled || false,
                stretchOriginalBPM: initialPadData?.stretchOriginalBPM || 120,
                stretchBeats: initialPadData?.stretchBeats || 1,
            };
        });
        this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
        // Drum pad players are Tone.Player instances, one per pad, reused.
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
        this.instrument = null; // For Synth type

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
        } else { // Audio track specific
            this.inputChannel = null; // For direct audio input
            this.clipPlayers = new Map(); // For playing timeline audio clips
        }
        this.patternPlayerSequence = null; // For Tone.Sequence in sequencer mode

        // UI related
        this.waveformCanvasCtx = null;
        this.instrumentWaveformCanvasCtx = null;
        this.automation = initialData?.automation ? JSON.parse(JSON.stringify(initialData.automation)) : { volume: [] };
        this.inspectorControls = {}; // To store references to UI controls like knobs

    }

    // --- Voice Pooling Methods for Sampler (Slicer) ---
    _initializeSlicerVoicePool() {
        this._slicerVoicePool = [];
        this._slicerAvailableVoices = [];
        const numVoicesToCreate = this.slicerIsPolyphonic ? MAX_VOICES_PER_POOL : 1;

        for (let i = 0; i < numVoicesToCreate; i++) {
            const player = new Tone.Player();
            const envelope = new Tone.AmplitudeEnvelope();
            const gain = new Tone.Gain();
            // Do not chain them here, chain to effect bus dynamically
            const voiceUnit = { player, envelope, gain, isIdle: true, id: `slicerVoice_${this.id}_${i}` };
            this._slicerVoicePool.push(voiceUnit);
            this._slicerAvailableVoices.push(voiceUnit);
        }
        console.log(`[Track ${this.id} Sampler] Initialized slicer voice pool with ${numVoicesToCreate} voices.`);
    }

    _getVoiceFromSlicerPool() {
        if (this._slicerAvailableVoices.length > 0) {
            const voice = this._slicerAvailableVoices.pop();
            voice.isIdle = false;
            // console.log(`[Track ${this.id} Sampler] Got voice ${voice.id} from pool. Available: ${this._slicerAvailableVoices.length}`);
            return voice;
        }
        // Fallback: if pool is exhausted, try to find one that might have finished but wasn't returned (less ideal)
        // Or, for robust production, you might create a new one temporarily or log an error.
        // For now, we'll log a warning if the pool is empty.
        console.warn(`[Track ${this.id} Sampler] Slicer voice pool exhausted. Note might be dropped or sound cut.`);
        // Find the oldest, non-disposed player in the main pool to reuse (emergency)
        const oldestVoice = this._slicerVoicePool.find(v => v.player && !v.player.disposed && v.envelope && !v.envelope.disposed && v.gain && !v.gain.disposed);
        if (oldestVoice) {
            console.warn(`[Track ${this.id} Sampler] Reusing oldest voice ${oldestVoice.id} due to pool exhaustion.`);
            try {
                if (oldestVoice.player.state === "started") oldestVoice.player.stop(Tone.now());
                oldestVoice.player.disconnect();
                if (oldestVoice.envelope.state === "started") oldestVoice.envelope.triggerRelease(Tone.now());
                oldestVoice.envelope.disconnect();
                oldestVoice.gain.disconnect();
            } catch (e) { console.warn("Error stopping/disconnecting reused voice", e); }
            oldestVoice.isIdle = false;
            return oldestVoice;
        }
        return null;
    }

    _returnVoiceToSlicerPool(voiceUnit) {
        if (voiceUnit && voiceUnit.player) {
            // console.log(`[Track ${this.id} Sampler] Returning voice ${voiceUnit.id} to pool.`);
            try {
                if (voiceUnit.player.state === "started" && !voiceUnit.player.disposed) {
                    voiceUnit.player.stop(Tone.now() + 0.01); // Ensure it's stopped
                }
                if (!voiceUnit.player.disposed) voiceUnit.player.disconnect();
                if (voiceUnit.envelope && !voiceUnit.envelope.disposed) voiceUnit.envelope.disconnect();
                if (voiceUnit.gain && !voiceUnit.gain.disposed) voiceUnit.gain.disconnect();
            } catch (e) {
                console.warn(`[Track ${this.id} Sampler] Error disconnecting voice ${voiceUnit.id} on return to pool:`, e.message);
            }
            voiceUnit.isIdle = true;
            if (!this._slicerAvailableVoices.find(v => v.id === voiceUnit.id)) {
                 this._slicerAvailableVoices.push(voiceUnit);
            }
            // console.log(`[Track ${this.id} Sampler] Voice ${voiceUnit.id} returned. Available: ${this._slicerAvailableVoices.length}`);
        }
    }
    // --- End Voice Pooling Methods ---


    setName(newName, skipUndo = false) {
        // ... (existing code)
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

    getActiveSequence() {
        // ... (existing code)
        if (this.type === 'Audio' || !this.activeSequenceId || !this.sequences || this.sequences.length === 0) return null;
        return this.sequences.find(s => s.id === this.activeSequenceId);
    }

    getActiveSequenceData() {
        // ... (existing code)
        const activeSeq = this.getActiveSequence();
        return activeSeq ? activeSeq.data : [];
    }

    getActiveSequenceLength() {
        // ... (existing code)
        const activeSeq = this.getActiveSequence();
        return activeSeq ? activeSeq.length : Constants.defaultStepsPerBar;
    }

    getDefaultSynthParams() {
        // ... (existing code)
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

    async initializeAudioNodes() {
        // ... (existing code)
        console.log(`[Track ${this.id} initializeAudioNodes] Initializing audio nodes for "${this.name}".`);
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
            this.outputNode = this.gainNode; // Default output, effects will be inserted before this

            if (this.type === 'Audio') {
                this.inputChannel = new Tone.Channel(); // For direct audio input or monitoring
                console.log(`[Track ${this.id} initializeAudioNodes] Created inputChannel for Audio track.`);
            }

            this.rebuildEffectChain(); // This connects sources -> effects -> gainNode -> meter -> master
            console.log(`[Track ${this.id} initializeAudioNodes] Audio nodes initialized and effect chain rebuilt.`);
        } catch (error) {
            console.error(`[Track ${this.id} initializeAudioNodes] Error during initialization:`, error);
            if (this.appServices.showNotification) {
                this.appServices.showNotification(`Error initializing audio for track ${this.name}: ${error.message}`, 4000);
            }
        }
    }

    rebuildEffectChain() {
        // ... (existing code is largely okay, but ensure sources are connected correctly)
        console.log(`[Track ${this.id} rebuildEffectChain] Rebuilding effect chain for "${this.name}". Effects: ${this.activeEffects.length}`);
        if (!this.gainNode || this.gainNode.disposed) {
            console.error(`[Track ${this.id} rebuildEffectChain] CRITICAL: GainNode is not valid. Aborting chain rebuild.`);
            return;
        }
        if (!this.trackMeter || this.trackMeter.disposed) {
            console.warn(`[Track ${this.id} rebuildEffectChain] TrackMeter is not valid, re-creating.`);
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        }

        // Determine primary source nodes for this track type
        let sourceNodes = [];
        if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
            sourceNodes.push(this.instrument);
        } else if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed) {
            sourceNodes.push(this.toneSampler);
        } else if (this.type === 'DrumSampler') {
            // Drum pad players are connected individually in their play logic if effects are present,
            // or directly to gainNode if no effects. Here, we consider the gainNode as the "source" before master.
            // This part is tricky because drumPadPlayers are started on demand.
            // The effects chain should ideally be from the point where all drum pads converge.
            // For simplicity, we'll assume drum pad players connect to the start of the effect chain if effects exist,
            // or to this.gainNode if no effects.
            // This means drumPadPlayers' connect() calls in recreateToneSequence need to be aware of this.
            // For now, let's assume if effects exist, they connect to the first effect.
            // If no effects, they connect to this.gainNode.
            // So, sourceNodes here might be empty, and connections handled in play logic.
        } else if (this.type === 'Sampler' && !this.slicerIsPolyphonic && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
            sourceNodes.push(this.slicerMonoGain); // Mono slicer output
        } else if (this.type === 'Audio' && this.inputChannel && !this.inputChannel.disposed) {
            sourceNodes.push(this.inputChannel); // For direct input monitoring or recording source
        }
        // Polyphonic slicer voices and timeline clip players connect dynamically.

        console.log(`[Track ${this.id} rebuildEffectChain] Identified ${sourceNodes.length} persistent source nodes.`);

        // Disconnect all managed persistent nodes before rebuilding
        const allManagedPersistentNodes = [
            ...sourceNodes,
            ...this.activeEffects.map(e => e.toneNode),
            this.gainNode,
            this.trackMeter
        ].filter(node => node && !node.disposed);

        allManagedPersistentNodes.forEach(node => {
            try { node.disconnect(); } catch(e) { console.warn(`[Track ${this.id} rebuildEffectChain] Error during disconnect of node:`, node?.toString(), e.message); }
        });
        console.log(`[Track ${this.id} rebuildEffectChain] All managed persistent nodes disconnected.`);

        // Reconnect mono slicer internal chain if it exists
        if (this.type === 'Sampler' && !this.slicerIsPolyphonic && this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed &&
            this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed &&
            this.slicerMonoGain && !this.slicerMonoGain.disposed) {
            try {
                this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
                console.log(`[Track ${this.id} rebuildEffectChain] Chained mono slicer player -> envelope -> gain.`);
            } catch (e) { console.error(`[Track ${this.id} rebuildEffectChain] Error chaining mono slicer components:`, e); }
        }

        // Chain: Source(s) -> Effect1 -> Effect2 -> ... -> GainNode -> TrackMeter -> MasterBus
        let currentOutputTarget = sourceNodes.length > 0 ? (sourceNodes.length === 1 ? sourceNodes[0] : sourceNodes) : null;

        if (this.activeEffects.length > 0) {
            if (!currentOutputTarget) {
                // This case applies to polyphonic samplers/drum samplers where individual voices/pads connect to the first effect.
                // The first effect becomes the new "start" of the chain for dynamic sources.
                currentOutputTarget = this.activeEffects[0].toneNode;
                console.log(`[Track ${this.id} rebuildEffectChain] No persistent source. First effect ${this.activeEffects[0].type} is start of chain segment for dynamic sources.`);
                // Connect subsequent effects
                for (let i = 0; i < this.activeEffects.length - 1; i++) {
                    const currentEffect = this.activeEffects[i].toneNode;
                    const nextEffect = this.activeEffects[i+1].toneNode;
                    if (currentEffect && !currentEffect.disposed && nextEffect && !nextEffect.disposed) {
                        try { currentEffect.connect(nextEffect); } catch(e) { console.error(`[Track ${this.id}] Error connecting effect ${this.activeEffects[i].type} to ${this.activeEffects[i+1].type}:`, e); }
                    }
                }
                currentOutputTarget = this.activeEffects[this.activeEffects.length - 1].toneNode;
            } else {
                // Persistent source(s) exist, connect them to the first effect.
                const firstEffectNode = this.activeEffects[0].toneNode;
                if (firstEffectNode && !firstEffectNode.disposed) {
                    if (Array.isArray(currentOutputTarget)) {
                        currentOutputTarget.forEach(outNode => {
                            if (outNode && !outNode.disposed) try { outNode.connect(firstEffectNode); } catch(e){ console.error(`[Track ${this.id}] Error connecting array source to first effect ${this.activeEffects[0].type}:`, e); }
                        });
                    } else {
                        try { currentOutputTarget.connect(firstEffectNode); } catch(e){ console.error(`[Track ${this.id}] Error connecting single source to first effect ${this.activeEffects[0].type}:`, e); }
                    }
                    currentOutputTarget = firstEffectNode; // First effect is now the end of this segment
                     // Connect subsequent effects
                    for (let i = 0; i < this.activeEffects.length - 1; i++) {
                        const currentEffect = this.activeEffects[i].toneNode;
                        const nextEffect = this.activeEffects[i+1].toneNode;
                        if (currentEffect && !currentEffect.disposed && nextEffect && !nextEffect.disposed) {
                            try { currentEffect.connect(nextEffect); } catch(e) { console.error(`[Track ${this.id}] Error connecting effect ${this.activeEffects[i].type} to ${this.activeEffects[i+1].type}:`, e); }
                        }
                    }
                    currentOutputTarget = this.activeEffects[this.activeEffects.length - 1].toneNode; // Last effect is now the end
                } else {
                    console.warn(`[Track ${this.id} rebuildEffectChain] First effect node is invalid. Skipping effect chain for persistent source(s).`);
                }
            }
        }


        // Connect the end of the (effect chain or source) to gainNode
        if (currentOutputTarget && !currentOutputTarget.disposed) {
            if (Array.isArray(currentOutputTarget)) { // Should not happen if effects were chained correctly
                currentOutputTarget.forEach(outNode => {
                    if (outNode && !outNode.disposed) try { outNode.connect(this.gainNode); } catch (e) { console.error(`[Track ${this.id}] Error connecting array output to gainNode:`, e); }
                });
            } else {
                try { currentOutputTarget.connect(this.gainNode); } catch (e) { console.error(`[Track ${this.id}] Error connecting single output to gainNode:`, e); }
            }
            console.log(`[Track ${this.id} rebuildEffectChain] Connected chain/source output to gainNode.`);
        } else if (sourceNodes.length === 0 && this.activeEffects.length === 0) {
            // This case is for tracks like polyphonic samplers or drum samplers WITHOUT effects.
            // Their individual voices/players will connect directly to this.gainNode.
            console.log(`[Track ${this.id} rebuildEffectChain] No persistent source and no effects. Dynamic sources will connect to gainNode.`);
        } else if (sourceNodes.length > 0 && this.activeEffects.length === 0) {
            // This is for persistent sources (Synth, InstrumentSampler, Audio Input) WITHOUT effects.
            // They should have been in currentOutputTarget. This is a fallback / sanity check.
            sourceNodes.forEach(node => {
                if (node && !node.disposed) {
                    try { node.connect(this.gainNode); }
                    catch(e) { console.error(`[Track ${this.id}] Error connecting direct source ${node.toString()} to gainNode:`, e); }
                }
            });
            console.log(`[Track ${this.id} rebuildEffectChain] Connected direct persistent source(s) to gainNode (no effects).`);
        }


        // Connect gainNode to trackMeter
        if (this.gainNode && !this.gainNode.disposed && this.trackMeter && !this.trackMeter.disposed) {
            try { this.gainNode.connect(this.trackMeter); console.log(`[Track ${this.id} rebuildEffectChain] Connected gainNode to trackMeter.`); }
            catch (e) { console.error(`[Track ${this.id}] Error connecting gainNode to trackMeter:`, e); }
        }

        // Connect trackMeter to master bus input
        const masterBusInput = this.appServices.getMasterEffectsBusInputNode ? this.appServices.getMasterEffectsBusInputNode() : null;
        const finalTrackOutput = (this.trackMeter && !this.trackMeter.disposed) ? this.trackMeter : this.gainNode;

        if (finalTrackOutput && !finalTrackOutput.disposed && masterBusInput && !masterBusInput.disposed) {
            try { finalTrackOutput.connect(masterBusInput); console.log(`[Track ${this.id} rebuildEffectChain] Connected final track output to masterBusInput.`); }
            catch (e) { console.error(`[Track ${this.id}] Error connecting final output to masterBusInput:`, e); }
        } else if (finalTrackOutput && !finalTrackOutput.disposed) {
            console.warn(`[Track ${this.id} rebuildEffectChain] Master effects bus input not available. Connecting directly to destination as fallback.`);
            try { finalTrackOutput.toDestination(); } catch (e) { console.error(`[Track ${this.id}] Error connecting final output to destination:`, e); }
        } else {
            console.error(`[Track ${this.id} rebuildEffectChain] CRITICAL: Final track output node is invalid or master bus is unavailable. No output connection made.`);
        }

        this.applyMuteState();
        this.applySoloState();
        console.log(`[Track ${this.id} rebuildEffectChain] Mute/Solo states applied. Chain rebuild finished for "${this.name}".`);
    }


    addEffect(effectType) {
        // ... (existing code)
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
            console.log(`[Track ${this.id}] Added effect "${effectType}".`);
        } else {
            console.warn(`[Track ${this.id}] Could not create Tone.js instance for effect ${effectType}`);
            if (this.appServices.showNotification) this.appServices.showNotification(`Could not create effect: ${effectType}`, 3000);
        }
    }

    removeEffect(effectId) {
        // ... (existing code)
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
        // ... (existing code)
        const effectWrapper = this.activeEffects.find(e => e.id === effectId);
        if (!effectWrapper) {
            console.warn(`[Track ${this.id}] Effect ${effectId} not found for param update.`);
            return;
        }
        if (!effectWrapper.toneNode || effectWrapper.toneNode.disposed) {
            console.warn(`[Track ${this.id}] ToneNode for effect ${effectId} ("${effectWrapper.type}") is invalid or disposed.`);
            return;
        }

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
                if (paramInstance && typeof paramInstance.value !== 'undefined' && typeof paramInstance.rampTo === 'function') { // It's a Tone.Param or Signal
                    paramInstance.rampTo(value, 0.02);
                } else if (paramInstance && typeof paramInstance.value !== 'undefined') { // Fallback for signals without rampTo or if direct set is ok
                     paramInstance.value = value;
                } else { // Direct property like 'type' or 'oversample'
                    targetObject[finalParamKey] = value;
                }
            } else if (typeof targetObject.set === 'function' && keys.length > 0) { // Try .set() for complex objects
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
        // ... (existing code)
        const oldIndex = this.activeEffects.findIndex(e => e.id === effectId);
        if (oldIndex === -1) {
            console.warn(`[Track ${this.id}] Effect ID ${effectId} not found for reordering.`);
            return;
        }

        newIndex = Math.max(0, Math.min(newIndex, this.activeEffects.length - 1));
        if (oldIndex === newIndex) return;

        console.log(`[Track ${this.id}] Reordering effect ${effectId} from index ${oldIndex} to ${newIndex}.`);
        const [effectToMove] = this.activeEffects.splice(oldIndex, 1);
        this.activeEffects.splice(newIndex, 0, effectToMove);
        this.rebuildEffectChain();

        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'effectsListChanged');
        }
    }

    async fullyInitializeAudioResources() {
        // ... (existing code for Synth, DrumSampler, InstrumentSampler, Audio)
        console.log(`[Track ${this.id} fullyInitializeAudioResources] Initializing audio resources for "${this.name}" (type: ${this.type})`);
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
            } else if (this.type === 'Sampler') {
                // If slicer voice pool is not initialized or needs re-initialization (e.g. polyphony change)
                if (this._slicerVoicePool.length === 0 || 
                    (this.slicerIsPolyphonic && this._slicerVoicePool.length < MAX_VOICES_PER_POOL) ||
                    (!this.slicerIsPolyphonic && this._slicerVoicePool.length > 1)) {
                    this._initializeSlicerVoicePool();
                }
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
                    } else if (this.samplerAudioData.audioBufferDataURL) {
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
                            this.disposeSlicerMonoNodes(); // Dispose mono nodes if any
                            this.audioBuffer = await new Tone.Buffer().load(objectURL);
                            this.samplerAudioData.status = 'loaded';
                            console.log(`[Track ${this.id} Sampler] Sample "${this.samplerAudioData.fileName}" loaded into Tone.Buffer. Duration: ${this.audioBuffer.duration}`);
                            
                            // If polyphonic, assign buffer to pooled players. If mono, setup mono nodes.
                            if (this.slicerIsPolyphonic) {
                                this._slicerVoicePool.forEach(voice => {
                                    if (voice.player && !voice.player.disposed) {
                                        voice.player.buffer = this.audioBuffer;
                                    }
                                });
                            } else {
                                this.setupSlicerMonoNodes(); // This will use this.audioBuffer
                            }

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
                        this.samplerAudioData.status = (this.samplerAudioData.dbKey || this.samplerAudioData.audioBufferDataURL) ? 'missing' : 'empty';
                        console.warn(`[Track ${this.id} Sampler] Audio file blob was null for ${this.samplerAudioData.fileName}, status set to ${this.samplerAudioData.status}`);
                    }
                }
            } else if (this.type === 'DrumSampler') {
                // ... (drum sampler loading logic - seems okay as it reuses players)
                for (let i = 0; i < this.drumSamplerPads.length; i++) {
                    const pad = this.drumSamplerPads[i];
                    if (!pad) continue;
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
                                    // Drum pad players connect in rebuildEffectChain or play logic
                                    
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
                             pad.status = 'error';
                        }
                    }
                }
            } else if (this.type === 'InstrumentSampler') {
                // ... (instrument sampler loading logic - seems okay as Tone.Sampler handles internal players)
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
                this.setupToneSampler(); // This creates/recreates the Tone.Sampler instance
            }

            if (this.type === 'Audio') {
                // ... (audio track clip verification - seems okay)
                 if ((!this.inputChannel || this.inputChannel.disposed)) {
                    console.log(`[Track ${this.id} fullyInitializeAudioResources] Re-initializing audio nodes for Audio track as inputChannel was invalid.`);
                    await this.initializeAudioNodes();
                 }
                 for (const clip of this.timelineClips) {
                     if (clip.type === 'audio' && clip.sourceId && (!clip.audioBuffer || clip.audioBuffer.disposed)) { // audioBuffer on clip is conceptual, not Tone.Buffer
                         try {
                             const audioBlob = await getAudio(clip.sourceId);
                             if (audioBlob) {
                                 const url = URL.createObjectURL(audioBlob); // Temporary for duration check if needed
                                 console.log(`[Track ${this.id} Audio] Verified audio clip source ${clip.sourceId} (${clip.name}) from DB.`);
                                 if (clip.duration === 0) { // Only get duration if not already set
                                     clip.duration = await this.getBlobDuration(audioBlob);
                                 }
                                 URL.revokeObjectURL(url);
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
        console.log(`[Track ${this.id} fullyInitializeAudioResources] Finished for "${this.name}".`);
    }


    async initializeInstrument() {
        // ... (existing code)
        if (this.type === 'Synth') {
            console.log(`[Track ${this.id} initializeInstrument] Initializing synth instrument (type: ${this.synthEngineType}).`);
            if (this.instrument && !this.instrument.disposed) {
                try { this.instrument.dispose(); } catch(e) { console.warn(`[Track ${this.id}] Error disposing old synth instrument:`, e.message); }
            }
            try {
                // Ensure synthParams are correctly structured for Tone.MonoSynth
                const paramsForSynth = {
                    ...this.synthParams, // Spread existing params
                    oscillator: this.synthParams.oscillator || { type: 'sine' },
                    envelope: this.synthParams.envelope || { attack: 0.005, decay:0.1, sustain:0.3, release:1 },
                    filterEnvelope: this.synthParams.filterEnvelope || { attack:0.06, decay:0.2, sustain:0.5, release:2, baseFrequency:200, octaves:7 },
                    filter: this.synthParams.filter || { type:'lowpass', Q:1, frequency: 1000, rolloff: -12}
                };
                this.instrument = new Tone.MonoSynth(paramsForSynth);
                console.log(`[Track ${this.id} initializeInstrument] MonoSynth initialized with params:`, JSON.parse(JSON.stringify(paramsForSynth)));
            } catch (error) {
                console.error(`[Track ${this.id} initializeInstrument] Error creating MonoSynth:`, error);
                if (this.appServices.showNotification) this.appServices.showNotification(`Error creating synth for track ${this.name}.`, 3000);
                this.instrument = null;
            }
        }
    }

    setupSlicerMonoNodes() {
        // ... (existing code)
        this.disposeSlicerMonoNodes();
        if (this.type === 'Sampler' && !this.slicerIsPolyphonic) {
            try {
                this.slicerMonoPlayer = new Tone.Player();
                this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
                this.slicerMonoGain = new Tone.Gain();
                // Chain them internally. The slicerMonoGain will be connected to effects/output in rebuildEffectChain
                this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
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
        // ... (existing code)
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) { try { this.slicerMonoPlayer.dispose(); } catch(e){console.warn("Err disposing slicerMonoPlayer", e)} }
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) { try { this.slicerMonoEnvelope.dispose(); } catch(e){console.warn("Err disposing slicerMonoEnvelope", e)} }
        if (this.slicerMonoGain && !this.slicerMonoGain.disposed) { try { this.slicerMonoGain.dispose(); } catch(e){console.warn("Err disposing slicerMonoGain", e)} }
        this.slicerMonoPlayer = null; this.slicerMonoEnvelope = null; this.slicerMonoGain = null;
    }

    setupToneSampler() {
        // ... (existing code)
        if (this.type === 'InstrumentSampler') {
            console.log(`[Track ${this.id} setupToneSampler] Setting up Tone.Sampler.`);
            if (this.toneSampler && !this.toneSampler.disposed) {
                try { this.toneSampler.dispose(); } catch(e){ console.warn(`[Track ${this.id}] Error disposing old Tone.Sampler:`, e.message); }
            }
            this.toneSampler = null;

            if (this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
                const urls = {};
                const rootNote = this.instrumentSamplerSettings.rootNote || 'C4';
                urls[rootNote] = this.instrumentSamplerSettings.audioBuffer; // Pass the Tone.Buffer directly
                try {
                    this.toneSampler = new Tone.Sampler({
                        urls: urls,
                        attack: this.instrumentSamplerSettings.envelope.attack,
                        release: this.instrumentSamplerSettings.envelope.release,
                        // baseUrl: '', // Not needed if passing Tone.Buffer directly
                        onload: () => {
                            if (this.toneSampler && !this.toneSampler.disposed) {
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

    setVolume(volume, fromInteraction = false) {
        // ... (existing code)
        this.previousVolumeBeforeMute = Math.max(0, Math.min(parseFloat(volume) || 0, 1.5)); // Allow a bit of boost
        if (this.gainNode && !this.gainNode.disposed && !this.isMuted) {
            try {
                this.gainNode.gain.setValueAtTime(this.previousVolumeBeforeMute, Tone.now());
            } catch (e) { console.error(`[Track ${this.id}] Error setting gainNode volume:`, e); }
        }
    }

    applyMuteState() {
        // ... (existing code)
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
        // ... (existing code)
        this.applyMuteState(); // Soloing effectively mutes other non-soloed tracks
    }

    setSynthParam(paramPath, value) {
        // ... (existing code)
        if (this.type !== 'Synth') return;
        if (!this.instrument || this.instrument.disposed) {
            console.warn(`[Track ${this.id} setSynthParam] Synth instrument not available or disposed for param "${paramPath}".`);
            return;
        }
        try {
            const keys = paramPath.split('.');
            let target = this.instrument;
            let paramsTarget = this.synthParams; // To store the state

            for (let i = 0; i < keys.length - 1; i++) {
                if (target && typeof target[keys[i]] !== 'undefined') {
                    target = target[keys[i]];
                } else {
                    console.warn(`[Track ${this.id} setSynthParam] Path part "${keys[i]}" not found on Tone instrument for "${paramPath}".`);
                    return; // Path does not exist on instrument
                }
                paramsTarget[keys[i]] = paramsTarget[keys[i]] || {};
                paramsTarget = paramsTarget[keys[i]];
            }
            const finalKey = keys[keys.length - 1];

            // Store the new value in synthParams
            paramsTarget[finalKey] = value;

            // Apply to Tone.js instrument
            if (target && typeof target[finalKey] !== 'undefined') {
                if (target[finalKey] && typeof target[finalKey].setValueAtTime === 'function') { // It's a Tone.Param or Signal
                    target[finalKey].setValueAtTime(value, Tone.now());
                } else if (target[finalKey] && typeof target[finalKey].value !== 'undefined') { // Fallback for signals without setValueAtTime (less common)
                     target[finalKey].value = value;
                } else { // Direct property like 'type'
                    target[finalKey] = value;
                }
            } else if (target && typeof target.set === 'function') { // Try .set() for complex objects
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

    // ... (setSliceVolume, setSlicePitchShift, etc. remain the same)
    setSliceVolume(sliceIndex, volume) { if (this.slices && this.slices[sliceIndex]) this.slices[sliceIndex].volume = parseFloat(volume); }
    setSlicePitchShift(sliceIndex, semitones) { if (this.slices && this.slices[sliceIndex]) this.slices[sliceIndex].pitchShift = parseInt(semitones); }
    setSliceLoop(sliceIndex, loop) { if (this.slices && this.slices[sliceIndex]) this.slices[sliceIndex].loop = !!loop; }
    setSliceReverse(sliceIndex, reverse) { if (this.slices && this.slices[sliceIndex]) this.slices[sliceIndex].reverse = !!reverse; }
    setSliceEnvelopeParam(sliceIndex, param, value) { if (this.slices && this.slices[sliceIndex] && this.slices[sliceIndex].envelope) { this.slices[sliceIndex].envelope[param] = parseFloat(value); } }

    setDrumSamplerPadVolume(padIndex, volume) { if (this.drumSamplerPads && this.drumSamplerPads[padIndex]) this.drumSamplerPads[padIndex].volume = parseFloat(volume); }
    setDrumSamplerPadPitch(padIndex, pitch) { if (this.drumSamplerPads && this.drumSamplerPads[padIndex]) this.drumSamplerPads[padIndex].pitchShift = parseInt(pitch); }
    setDrumSamplerPadEnv(padIndex, param, value) { if (this.drumSamplerPads && this.drumSamplerPads[padIndex] && this.drumSamplerPads[padIndex].envelope) { this.drumSamplerPads[padIndex].envelope[param] = parseFloat(value); } }
    setDrumSamplerPadAutoStretch(padIndex, enabled) { if (this.drumSamplerPads && this.drumSamplerPads[padIndex]) { this.drumSamplerPads[padIndex].autoStretchEnabled = !!enabled; } }
    setDrumSamplerPadStretchOriginalBPM(padIndex, bpm) { if (this.drumSamplerPads && this.drumSamplerPads[padIndex]) { this.drumSamplerPads[padIndex].stretchOriginalBPM = parseFloat(bpm) || 120; } }
    setDrumSamplerPadStretchBeats(padIndex, beats) { if (this.drumSamplerPads && this.drumSamplerPads[padIndex]) { this.drumSamplerPads[padIndex].stretchBeats = parseFloat(beats) || 1; } }


    setInstrumentSamplerRootNote(noteName) { if (this.instrumentSamplerSettings) { this.instrumentSamplerSettings.rootNote = noteName; this.setupToneSampler(); } }
    setInstrumentSamplerLoop(loop) { if (this.instrumentSamplerSettings) { this.instrumentSamplerSettings.loop = !!loop; if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.loop = this.instrumentSamplerSettings.loop; } }
    setInstrumentSamplerLoopStart(time) { if (this.instrumentSamplerSettings) { this.instrumentSamplerSettings.loopStart = parseFloat(time) || 0; if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart; } }
    setInstrumentSamplerLoopEnd(time) { if (this.instrumentSamplerSettings) { this.instrumentSamplerSettings.loopEnd = parseFloat(time) || 0; if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd; } }
    setInstrumentSamplerEnv(param, value) { if (this.instrumentSamplerSettings && this.instrumentSamplerSettings.envelope) { this.instrumentSamplerSettings.envelope[param] = parseFloat(value); if (this.toneSampler && !this.toneSampler.disposed) { if (param === 'attack' && typeof this.toneSampler.attack !== 'undefined') this.toneSampler.attack = value; if (param === 'release' && typeof this.toneSampler.release !== 'undefined') this.toneSampler.release = value; /* Sustain/Decay not directly on Tone.Sampler, managed by envelope settings */ } } }


    _captureUndoState(description) {
        // ... (existing code)
        if (this.appServices.captureStateForUndo) {
            this.appServices.captureStateForUndo(description);
        } else {
            console.warn(`[Track ${this.id}] captureStateForUndo service not available.`);
        }
    }

    // ... (createNewSequence, deleteSequence, renameSequence, duplicateSequence, setActiveSequence, doubleSequence, setSequenceLength remain largely the same)
    // Ensure they call recreateToneSequence(true) after structural changes.
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
                this.activeSequenceId = this.sequences[0]?.id || null;
            }
            this.recreateToneSequence(true);
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
            if (oldName === newName.trim()) return;
            this._captureUndoState(`Rename sequence "${oldName}" to "${newName.trim()}" on ${this.name}`);
            sequence.name = newName.trim();
            if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
            if (this.appServices.renderTimeline) this.appServices.renderTimeline(); // Update timeline if clips use this sequence name
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
            this.recreateToneSequence(true); // Force restart of sequence player
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
               const copyOfOriginal = row.slice(0, oldLength); // Copy existing notes
               row.length = newLength; // Extend row
               for(let i = oldLength; i < newLength; i++) row[i] = null; // Fill new part with null
               // Copy notes to the new doubled section
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
        // Validate and snap to nearest bar
        let validatedNewLength = Math.max(Constants.STEPS_PER_BAR, parseInt(newLengthInSteps) || Constants.defaultStepsPerBar);
        validatedNewLength = Math.ceil(validatedNewLength / Constants.STEPS_PER_BAR) * Constants.STEPS_PER_BAR; // Snap to bar
        validatedNewLength = Math.min(validatedNewLength, Constants.MAX_BARS * Constants.STEPS_PER_BAR); // Cap at max bars

        if (oldActualLength === validatedNewLength && activeSeq.length === validatedNewLength) return; // No change

        if (!skipUndoCapture) {
            this._captureUndoState(`Set Seq Length for "${activeSeq.name}" on ${this.name} to ${validatedNewLength / Constants.STEPS_PER_BAR} bars`);
        }
        activeSeq.length = validatedNewLength;

        // Ensure data array matches new length for all rows
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
            // Copy existing notes up to the new length
            for (let c = 0; c < Math.min(currentRow.length, activeSeq.length); c++) {
                newRow[c] = currentRow[c];
            }
            return newRow;
        });

        this.recreateToneSequence(true);
        if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        console.log(`[Track ${this.id}] Set sequence "${activeSeq.name}" length to ${activeSeq.length} steps, ${numRows} rows.`);
    }


    recreateToneSequence(forceRestart = false, startTimeOffset = 0) {
        if (this.type === 'Audio') return;
        const currentPlaybackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        console.log(`[Track ${this.id} recreateToneSequence] For "${this.name}". ActiveSeqID: ${this.activeSequenceId}. Mode: ${currentPlaybackMode}`);

        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            try {
                this.patternPlayerSequence.stop();
                this.patternPlayerSequence.clear(); // Clear all events
                this.patternPlayerSequence.dispose();
            } catch(e) { console.warn(`[Track ${this.id}] Error disposing old Tone.Sequence:`, e.message); }
        }
        this.patternPlayerSequence = null;

        if (currentPlaybackMode !== 'sequencer') {
            console.log(`[Track ${this.id} recreateToneSequence] Not in 'sequencer' mode. Sequence player not created.`);
            return;
        }

        const activeSeq = this.getActiveSequence();
        if (!activeSeq) {
            console.warn(`[Track ${this.id} recreateToneSequence] No active sequence (ID: ${this.activeSequenceId}). Aborting.`);
            return;
        }
        // Ensure sequence data structure is valid
        if (!activeSeq.data || !Array.isArray(activeSeq.data) || activeSeq.data.length === 0) {
            let numRowsForInit;
            if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRowsForInit = Constants.synthPitches.length;
            else if (this.type === 'Sampler') numRowsForInit = (this.slices && this.slices.length > 0) ? this.slices.length : Constants.numSlices;
            else if (this.type === 'DrumSampler') numRowsForInit = Constants.numDrumSamplerPads;
            else numRowsForInit = 1; // Fallback for unknown types
            if (numRowsForInit <= 0) numRowsForInit = 1; // Safety check
            activeSeq.data = Array(numRowsForInit).fill(null).map(() => Array(activeSeq.length || Constants.defaultStepsPerBar).fill(null));
            console.warn(`[Track ${this.id} recreateToneSequence] Active sequence "${activeSeq.name}" had invalid/empty data. Initialized with ${numRowsForInit} rows.`);
        }
        if (!activeSeq.length || !Number.isFinite(activeSeq.length) || activeSeq.length < Constants.STEPS_PER_BAR) {
            activeSeq.length = Constants.defaultStepsPerBar; // Ensure a minimum length
            console.warn(`[Track ${this.id} recreateToneSequence] Active sequence "${activeSeq.name}" had invalid length. Reset to ${activeSeq.length}.`);
            // Ensure data rows match new length
            activeSeq.data.forEach(row => { if(row) row.length = activeSeq.length; });
        }


        const sequenceDataForTone = activeSeq.data;
        const sequenceLengthForTone = activeSeq.length;
        console.log(`[Track ${this.id} recreateToneSequence] Creating Tone.Sequence for "${activeSeq.name}" (${sequenceLengthForTone} steps, ${sequenceDataForTone.length} rows).`);

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

                // Determine where the instrument/player should connect (start of effects or directly to gain)
                const effectsChainStartPoint = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                    ? this.activeEffects[0].toneNode
                    : (this.gainNode && !this.gainNode.disposed ? this.gainNode : null);
                if (!effectsChainStartPoint) return; // No valid output path

                if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
                    let notePlayedThisStep = false; // Play only one note per step for MonoSynth
                    for (let rowIndex = 0; rowIndex < Constants.synthPitches.length; rowIndex++) {
                        const pitchName = Constants.synthPitches[rowIndex];
                        const step = sequenceDataForTone[rowIndex]?.[col];
                        if (step?.active && !notePlayedThisStep) {
                            this.instrument.triggerAttackRelease(pitchName, "16n", time, step.velocity * Constants.defaultVelocity);
                            notePlayedThisStep = true; // MonoSynth behavior
                        }
                    }
                } else if (this.type === 'Sampler') {
                     (this.slices || []).forEach((sliceData, sliceIndex) => {
                        const step = sequenceDataForTone[sliceIndex]?.[col];
                        if (step?.active && sliceData?.duration > 0 && this.audioBuffer?.loaded) {
                            const targetVolumeLinear = sliceData.volume * step.velocity;
                            const playbackRate = Math.pow(2, (sliceData.pitchShift || 0) / 12);
                            let playDuration = sliceData.duration / playbackRate;
                            if (sliceData.loop) playDuration = Tone.Time("16n").toSeconds(); // For looped slices, use step duration

                            if (this.slicerIsPolyphonic) {
                                const voiceUnit = this._getVoiceFromSlicerPool();
                                if (voiceUnit) {
                                    const { player, envelope, gain } = voiceUnit;
                                    player.buffer = this.audioBuffer; // Ensure buffer is set
                                    envelope.set(sliceData.envelope);
                                    gain.gain.value = targetVolumeLinear;
                                    player.playbackRate = playbackRate;
                                    player.reverse = sliceData.reverse || false;
                                    player.loop = sliceData.loop || false;
                                    player.loopStart = sliceData.offset;
                                    player.loopEnd = sliceData.offset + sliceData.duration;

                                    // Connect voice to effect chain start or gain node
                                    player.chain(envelope, gain, effectsChainStartPoint);

                                    player.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                                    envelope.triggerAttack(time);
                                    if (!sliceData.loop) envelope.triggerRelease(time + playDuration * 0.95); // Release slightly before player stops

                                    const releaseDuration = sliceData.envelope?.release || 0.2;
                                    const totalSoundDuration = playDuration + releaseDuration + 0.3; // Add buffer for release and scheduling
                                    Tone.Transport.scheduleOnce(() => {
                                        this._returnVoiceToSlicerPool(voiceUnit);
                                    }, time + totalSoundDuration);
                                }
                            } else if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                                // Mono slicer logic (existing logic seems fine, ensure it connects to effectsChainStartPoint if needed)
                                // The slicerMonoGain is already part of the rebuilt chain if it exists.
                                if (this.slicerMonoPlayer.state === 'started') this.slicerMonoPlayer.stop(time);
                                this.slicerMonoEnvelope.triggerRelease(time); // Release previous envelope if active

                                this.slicerMonoPlayer.buffer = this.audioBuffer;
                                this.slicerMonoEnvelope.set(sliceData.envelope);
                                this.slicerMonoGain.gain.value = targetVolumeLinear;
                                this.slicerMonoPlayer.playbackRate = playbackRate;
                                this.slicerMonoPlayer.reverse = sliceData.reverse || false;
                                this.slicerMonoPlayer.loop = sliceData.loop || false;
                                this.slicerMonoPlayer.loopStart = sliceData.offset;
                                this.slicerMonoPlayer.loopEnd = sliceData.offset + sliceData.duration;

                                this.slicerMonoPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                                this.slicerMonoEnvelope.triggerAttack(time);
                                if (!sliceData.loop) {
                                    const releaseTime = time + playDuration - (sliceData.envelope.release * 0.05); // Slightly earlier release for mono
                                    this.slicerMonoEnvelope.triggerRelease(Math.max(time, releaseTime));
                                }
                            }
                        }
                    });
                } else if (this.type === 'DrumSampler') {
                    // Drum Sampler reuses players, connect them correctly
                    Array.from({ length: Constants.numDrumSamplerPads }).forEach((_, padIndex) => {
                        const step = sequenceDataForTone[padIndex]?.[col];
                        const padData = this.drumSamplerPads[padIndex];
                        if (step?.active && padData && this.drumPadPlayers[padIndex] && !this.drumPadPlayers[padIndex].disposed && this.drumPadPlayers[padIndex].loaded) {
                            const player = this.drumPadPlayers[padIndex];
                            // Ensure player is connected to the correct point in the chain
                            try { player.disconnect(); player.connect(effectsChainStartPoint); } catch(e) { /* ignore if not previously connected or error */ }

                            player.volume.value = Tone.gainToDb(padData.volume * step.velocity * 0.7); // Apply some headroom

                            if (padData.autoStretchEnabled && padData.stretchOriginalBPM > 0 && padData.stretchBeats > 0 && player.buffer) {
                                const currentProjectTempo = Tone.Transport.bpm.value;
                                const sampleBufferDuration = player.buffer.duration;
                                const targetDurationAtCurrentTempo = (60 / currentProjectTempo) * padData.stretchBeats;
                                if (targetDurationAtCurrentTempo > 1e-6 && sampleBufferDuration > 1e-6) {
                                     player.playbackRate = sampleBufferDuration / targetDurationAtCurrentTempo;
                                } else { player.playbackRate = 1; }
                            } else {
                                player.playbackRate = Math.pow(2, (padData.pitchShift || 0) / 12);
                            }
                            player.start(time);
                        }
                    });
                } else if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed && this.toneSampler.loaded) {
                    let notePlayedThisStep = false;
                    Constants.synthPitches.forEach((pitchName, rowIndex) => {
                        const step = sequenceDataForTone[rowIndex]?.[col];
                        if (step?.active) {
                            if (!this.instrumentSamplerIsPolyphonic && !notePlayedThisStep) {
                                this.toneSampler.releaseAll(time); // Ensure mono behavior
                                notePlayedThisStep = true;
                            }
                            this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "16n", time, step.velocity * Constants.defaultVelocity);
                        }
                    });
                }
            }, Array.from(Array(sequenceLengthForTone).keys()), "16n"); // Events array, subdivision

            this.patternPlayerSequence.loop = true;
            // this.patternPlayerSequence.loopStart = 0; // Default, can be adjusted
            // this.patternPlayerSequence.loopEnd = `${sequenceLengthForTone}i`; // Loop over the entire sequence length
            console.log(`[Track ${this.id} recreateToneSequence] Tone.Sequence for "${activeSeq.name}" prepared. Loop: true.`);
        } catch (error) {
            console.error(`[Track ${this.id} recreateToneSequence] Error creating Tone.Sequence for "${activeSeq.name}":`, error);
            this.patternPlayerSequence = null;
        }

        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
    }

    async addAudioClip(blob, startTime) {
        // ... (existing code)
        if (this.type !== 'Audio') {
            console.warn(`[Track ${this.id}] addAudioClip called on non-Audio track type: ${this.type}`);
            return;
        }
        const clipId = `audioclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        const dbKey = `clip_${this.id}_${Date.now()}_${blob.size}.wav`; // Assuming WAV for now

        try {
            await storeAudio(dbKey, blob); // Store in DB
            let duration = 0;
            try {
                 duration = await this.getBlobDuration(blob);
            } catch(durationError) {
                console.warn(`[Track ${this.id}] Could not determine duration for new audio clip ${clipId}, defaulting to 0. Error:`, durationError);
            }

            const newClip = {
                id: clipId, type: 'audio', sourceId: dbKey, // Store dbKey as source
                startTime: Math.max(0, startTime), // Ensure non-negative start time
                duration: duration,
                name: `Rec ${new Date().toLocaleTimeString().substring(0,8)}` // Example name
            };

            this.timelineClips.push(newClip);
            console.log(`[Track ${this.id}] Added audio clip to timeline:`, newClip);
            this._captureUndoState(`Add Recorded Clip to ${this.name}`);

            if (this.appServices.renderTimeline) this.appServices.renderTimeline(); // Update UI
        } catch (error) {
            console.error(`[Track ${this.id} addAudioClip] Error:`, error);
            if (this.appServices.showNotification) this.appServices.showNotification("Failed to save recorded audio clip.", 3000);
        }
    }
    
    async addExternalAudioFileAsClip(audioFileBlob, startTime, clipName = null) {
        // ... (existing code)
        if (this.type !== 'Audio') {
            console.warn(`[Track ${this.id}] addExternalAudioFileAsClip called on non-Audio track type: ${this.type}`);
            if (this.appServices.showNotification) this.appServices.showNotification("Audio files can only be added to Audio Tracks.", 3000);
            return null;
        }
        const clipId = `audioclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
        // Sanitize file name for dbKey
        const safeFileName = (audioFileBlob.name || 'unknownfile').replace(/[^a-zA-Z0-9-_.]/g, '_');
        const dbKey = `clip_${this.id}_${safeFileName}_${audioFileBlob.size}_${Date.now()}`;

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
        // ... (existing code)
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
        const sixteenthNoteTime = Tone.Time("16n").toSeconds();
        const duration = sourceSequence.length * sixteenthNoteTime;

        const newClip = {
            id: clipId,
            type: 'sequence',
            sourceSequenceId: sourceSequenceId, // Link to the original sequence
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
        // ... (existing code)
        if (!blob || blob.size === 0) return 0;
        const tempUrl = URL.createObjectURL(blob);
        // Use Tone.context which should be initialized
        const audioContext = Tone.context?.rawContext; // Get the underlying AudioContext
        if (!audioContext) {
            console.warn(`[Track ${this.id} getBlobDuration] No raw AudioContext available from Tone.`);
            URL.revokeObjectURL(tempUrl);
            return 0; // Or throw an error, or attempt to create a temporary context
        }
        try {
            const arrayBuffer = await fetch(tempUrl).then(res => res.arrayBuffer());
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            return audioBuffer.duration;
        } catch (e) {
            console.error(`[Track ${this.id} getBlobDuration] Error decoding audio data:`, e);
            return 0; // Or rethrow
        } finally {
            URL.revokeObjectURL(tempUrl);
        }
    }

    async schedulePlayback(transportStartTime, transportStopTime) {
        const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        console.log(`[Track ${this.id} "${this.name}"] schedulePlayback. Mode: ${playbackMode}. Transport Range: ${transportStartTime.toFixed(2)}s to ${transportStopTime.toFixed(2)}s`);

        this.stopPlayback(); // Clear previous players/parts

        if (playbackMode === 'timeline') {
            for (const clip of this.timelineClips) {
                if (!clip || typeof clip.startTime !== 'number' || typeof clip.duration !== 'number') {
                    console.warn(`[Track ${this.id}] Skipping invalid clip:`, clip);
                    continue;
                }
                const clipActualStart = clip.startTime;
                const clipActualEnd = clip.startTime + clip.duration;

                // Determine if the clip is within the transport's current scheduling window
                const effectivePlayStart = Math.max(clipActualStart, transportStartTime);
                const effectivePlayEnd = Math.min(clipActualEnd, transportStopTime);
                let playDurationInWindow = effectivePlayEnd - effectivePlayStart;

                if (playDurationInWindow <= 1e-3) continue; // Clip is not in the current window or too short

                const offsetIntoSource = Math.max(0, effectivePlayStart - clipActualStart);

                if (clip.type === 'audio') {
                    if (!clip.sourceId) { console.warn(`[Track ${this.id}] Audio clip ${clip.id} has no sourceId.`); continue; }
                    console.log(`[Track ${this.id}] Timeline: Scheduling AUDIO clip "${clip.name}" (ID: ${clip.id}) at ${effectivePlayStart.toFixed(2)}s for ${playDurationInWindow.toFixed(2)}s (offset ${offsetIntoSource.toFixed(2)}s)`);
                    
                    // For audio clips, we'll use a temporary Tone.Player.
                    // Object pooling could be applied here too for very high performance needs,
                    // but for typical timeline playback, creating per clip might be acceptable if not too many simultaneous clips.
                    const player = new Tone.Player(); // Consider pooling if performance issues arise
                    this.clipPlayers.set(clip.id, player); // Keep track to stop/dispose later

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
                            await player.load(url); // Load the audio
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
                        const sixteenthTime = Tone.Time("16n").toSeconds(); // Duration of one 16th note

                        // Iterate through the steps of the source sequence
                        for (let stepIdx = 0; stepIdx < sourceSequence.length; stepIdx++) {
                            const timeWithinSeq = stepIdx * sixteenthTime; // Time of this step within the sequence itself
                            // Calculate the absolute time this step would play if the clip started at clipActualStart
                            const absoluteStepTime = clipActualStart + timeWithinSeq;

                            // Only schedule events that fall within the current transport window AND the clip's duration within that window
                            if (absoluteStepTime >= effectivePlayStart && absoluteStepTime < effectivePlayEnd) {
                                // Calculate the event's time relative to the start of the Tone.Part
                                // The Part itself will be started at 'effectivePlayStart'.
                                const eventTimeInPart = absoluteStepTime - effectivePlayStart;

                                for (let rowIdx = 0; rowIdx < sourceSequence.data.length; rowIdx++) {
                                    const stepData = sourceSequence.data[rowIdx]?.[stepIdx];
                                    if (stepData?.active) {
                                        let noteValue;
                                        let noteDuration = "16n"; // Default duration for sequence steps
                                        if (this.type === 'Synth' || this.type === 'InstrumentSampler') {
                                            noteValue = Constants.synthPitches[rowIdx];
                                        } else if (this.type === 'Sampler') {
                                            const sliceData = this.slices[rowIdx];
                                            if (sliceData && sliceData.duration > 0 && this.audioBuffer?.loaded) {
                                               noteValue = { type: 'slice', index: rowIdx, data: sliceData };
                                               // Duration for sampler slices might be derived from sliceData.duration
                                            }
                                        } else if (this.type === 'DrumSampler') {
                                            const padData = this.drumSamplerPads[rowIdx];
                                            if (padData && this.drumPadPlayers[rowIdx]?.loaded) {
                                                noteValue = { type: 'drum', index: rowIdx, data: padData };
                                                // Drum samples are often one-shots, duration might be implicit or short
                                            }
                                        }
                                        if (noteValue) {
                                            events.push([eventTimeInPart, { // Time is relative to the Part's start
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
                            const part = new Tone.Part((time, value) => { // `time` here is absolute transport time
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
                                    if (!this.instrumentSamplerIsPolyphonic && !notePlayed) { // Check polyphony
                                        this.toneSampler.releaseAll(time); // Mono behavior
                                        notePlayed = true;
                                    }
                                    this.toneSampler.triggerAttackRelease(Tone.Frequency(value.note).toNote(), value.duration, time, value.velocity);
                                } else if (this.type === 'Sampler' && value.note.type === 'slice' && this.audioBuffer?.loaded) {
                                    const sliceData = value.note.data;
                                    const targetVolumeLinear = sliceData.volume * value.velocity;
                                    const playbackRate = Math.pow(2, (sliceData.pitchShift || 0) / 12);
                                    let playDurationPart = sliceData.duration / playbackRate;
                                    if (sliceData.loop) playDurationPart = Tone.Time(value.duration).toSeconds();

                                    // Use the Slicer Voice Pool
                                    const voiceUnit = this._getVoiceFromSlicerPool();
                                    if (voiceUnit) {
                                        const { player, envelope, gain } = voiceUnit;
                                        player.buffer = this.audioBuffer;
                                        envelope.set(sliceData.envelope);
                                        gain.gain.value = targetVolumeLinear;
                                        player.playbackRate = playbackRate;
                                        player.reverse = sliceData.reverse || false;
                                        player.loop = sliceData.loop || false;
                                        player.loopStart = sliceData.offset;
                                        player.loopEnd = sliceData.offset + sliceData.duration;

                                        player.chain(envelope, gain, dest);

                                        player.start(time, sliceData.offset, sliceData.loop ? undefined : playDurationPart);
                                        envelope.triggerAttack(time);
                                        if (!sliceData.loop) envelope.triggerRelease(time + playDurationPart * 0.95);
                                        
                                        const releaseDuration = sliceData.envelope?.release || 0.2;
                                        const totalSoundDuration = playDurationPart + releaseDuration + 0.3;
                                        Tone.Transport.scheduleOnce(() => {
                                            this._returnVoiceToSlicerPool(voiceUnit);
                                        }, time + totalSoundDuration);
                                    }
                                } else if (this.type === 'DrumSampler' && value.note.type === 'drum') {
                                    const padData = value.note.data;
                                    const player = this.drumPadPlayers[value.note.index];
                                    if (player && !player.disposed && player.loaded) {
                                        try { player.disconnect(); player.connect(dest); } catch(e) { /* ignore */ }
                                        player.volume.value = Tone.gainToDb(padData.volume * value.velocity * 0.7);
                                        if (padData.autoStretchEnabled && padData.stretchOriginalBPM > 0 && padData.stretchBeats > 0 && player.buffer) {
                                            const currentProjectTempo = Tone.Transport.bpm.value;
                                            const sampleBufferDuration = player.buffer.duration;
                                            const targetDurationAtCurrentTempo = (60 / currentProjectTempo) * padData.stretchBeats;
                                            if (targetDurationAtCurrentTempo > 1e-6 && sampleBufferDuration > 1e-6) {
                                                 player.playbackRate = sampleBufferDuration / targetDurationAtCurrentTempo;
                                            } else { player.playbackRate = 1; }
                                        } else {
                                            player.playbackRate = Math.pow(2, (padData.pitchShift || 0) / 12);
                                        }
                                        player.start(time);
                                    }
                                }
                            }, events);
                            part.loop = false; // Part itself does not loop; looping is handled by clip placement
                            part.start(effectivePlayStart); // Start the part at the calculated effective start time
                            // Stop the part at the end of its duration within the window
                            if (playDurationInWindow > 0 && playDurationInWindow !== Infinity) {
                                part.stop(effectivePlayStart + playDurationInWindow);
                            }
                            this.clipPlayers.set(`${clip.id}_part`, part); // Store the part
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
                    // It's important to stop before restarting if already running to avoid issues
                    try {this.patternPlayerSequence.stop(Tone.Transport.now());} catch(e){console.warn("Err stopping seq player during schedule", e)}
                }
                console.log(`[Track ${this.id}] Sequencer mode: Starting patternPlayerSequence at transport offset: ${transportStartTime.toFixed(2)}s. Loop: ${this.patternPlayerSequence.loop}`);
                try {
                    // Start the sequence at the specified transportStartTime
                    this.patternPlayerSequence.start(transportStartTime);
                } catch(e) {
                    console.error(`[Track ${this.id}] Error starting patternPlayerSequence:`, e.message, e);
                    // Attempt to dispose if start failed, then nullify
                    try { if(!this.patternPlayerSequence.disposed) this.patternPlayerSequence.dispose(); } catch (disposeErr) {}
                    this.patternPlayerSequence = null;
                }
            } else {
                 console.warn(`[Track ${this.id}] Sequencer mode: patternPlayerSequence still not valid after recreation for "${this.name}".`);
            }
        }
    }


    stopPlayback() {
        // ... (existing code)
        console.log(`[Track ${this.id} "${this.name}"] stopPlayback called. Timeline clip players/parts: ${this.clipPlayers.size}`);
        // Stop and dispose of timeline players/parts
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

        // Stop and dispose of sequencer pattern player
        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            try {
                this.patternPlayerSequence.stop();
                this.patternPlayerSequence.clear();
                this.patternPlayerSequence.dispose();
                console.log(`[Track ${this.id}] Stopped, cleared, and disposed patternPlayerSequence.`);
            }
            catch (e) { console.warn(`[Track ${this.id}] Error stopping/disposing patternPlayerSequence:`, e.message); }
        }
        this.patternPlayerSequence = null;
    }

    async updateAudioClipPosition(clipId, newStartTime) {
        // ... (existing code)
        const clip = this.timelineClips.find(c => c.id === clipId);
        if (clip) {
            const oldStartTime = clip.startTime;
            clip.startTime = Math.max(0, parseFloat(newStartTime) || 0); // Ensure non-negative
            console.log(`[Track ${this.id}] Updated ${clip.type} clip ${clipId} startTime from ${oldStartTime.toFixed(2)} to ${clip.startTime.toFixed(2)}`);
            this._captureUndoState(`Move Clip "${clip.name || clip.id.slice(-4)}" on ${this.name}`);

            if (this.appServices.renderTimeline) this.appServices.renderTimeline();

            // If transport is running in timeline mode, we might need to reschedule
            const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
            if (Tone.Transport.state === 'started' && playbackMode === 'timeline') {
                console.log(`[Track ${this.id} updateAudioClipPosition] Transport running in timeline. Rescheduling all tracks.`);
                // Pause, clear, reschedule, and resume might be too disruptive for a simple move.
                // A more refined approach would be to only reschedule the affected track or even just the moved clip.
                // For now, a full reschedule is safer if complex interactions are involved.
                Tone.Transport.pause(); // Pause transport
                const allTracks = this.appServices.getTracks ? this.appServices.getTracks() : [];
                allTracks.forEach(t => { if (typeof t.stopPlayback === 'function') t.stopPlayback(); }); // Stop all current playback
                Tone.Transport.cancel(0); // Clear all scheduled events
                
                const currentPlayheadPosition = Tone.Transport.seconds; // Where it was paused
                const scheduleEndTime = currentPlayheadPosition + 300; // Reschedule for a long window from current pos

                for (const t of allTracks) {
                    if (typeof t.schedulePlayback === 'function') await t.schedulePlayback(currentPlayheadPosition, scheduleEndTime);
                }
                Tone.Transport.start(Tone.Transport.now() + 0.05, currentPlayheadPosition); // Resume from paused position
            }
        } else {
            console.warn(`[Track ${this.id}] Could not find clip ${clipId} to update its position.`);
        }
    }

    dispose() {
        // ... (existing code, plus dispose pooled voices)
        const trackNameForLog = this.name || `Track ${this.id}`;
        console.log(`[Track Dispose START ${this.id}] Starting disposal for track: "${trackNameForLog}"`);

        try { this.stopPlayback(); } catch (e) { console.warn(`[Track Dispose ${this.id}] Error in stopPlayback during dispose:`, e.message); }

        // Dispose pooled slicer voices
        if (this._slicerVoicePool) {
            this._slicerVoicePool.forEach(voiceUnit => {
                if (voiceUnit.player && !voiceUnit.player.disposed) try { voiceUnit.player.dispose(); } catch(e){}
                if (voiceUnit.envelope && !voiceUnit.envelope.disposed) try { voiceUnit.envelope.dispose(); } catch(e){}
                if (voiceUnit.gain && !voiceUnit.gain.disposed) try { voiceUnit.gain.dispose(); } catch(e){}
            });
            this._slicerVoicePool = [];
            this._slicerAvailableVoices = [];
        }


        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            try { this.patternPlayerSequence.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing patternPlayerSequence:`, e.message); }
        }
        this.patternPlayerSequence = null;

        if (this.instrument && !this.instrument.disposed) { // Synth instrument
            try { this.instrument.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing instrument:`, e.message); }
        }
        this.instrument = null;

        if (this.toneSampler && !this.toneSampler.disposed) { // InstrumentSampler's Tone.Sampler
            try { this.toneSampler.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing toneSampler:`, e.message); }
        }
        this.toneSampler = null;

        this.disposeSlicerMonoNodes(); // Sampler (mono)

        this.drumPadPlayers.forEach((player, index) => { // DrumSampler players
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

        if (this.inputChannel && !this.inputChannel.disposed) { // Audio track input
            try { this.inputChannel.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing inputChannel:`, e.message); }
        }
        this.inputChannel = null;

        if (this.appServices.closeAllTrackWindows) {
            this.appServices.closeAllTrackWindows(this.id);
        }

        // Dispose Tone.Buffers
        if (this.audioBuffer && !this.audioBuffer.disposed) { // Sampler's main buffer
            try { this.audioBuffer.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing audioBuffer (Sampler):`, e.message); }
        }
        this.audioBuffer = null;

        (this.drumSamplerPads || []).forEach(p => { // DrumSampler pad buffers
            if (p.audioBuffer && !p.audioBuffer.disposed) {
                try { p.audioBuffer.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing pad audioBuffer:`, e.message); }
            }
            p.audioBuffer = null;
        });

        if (this.instrumentSamplerSettings?.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) { // InstrumentSampler buffer
            try { this.instrumentSamplerSettings.audioBuffer.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing audioBuffer (InstrumentSampler):`, e.message); }
        }
        if (this.instrumentSamplerSettings) this.instrumentSamplerSettings.audioBuffer = null;

        this.sequences = [];
        this.timelineClips = [];
        this.appServices = {}; // Clear appServices reference
        this.inspectorControls = {};
        this.waveformCanvasCtx = null;
        this.instrumentWaveformCanvasCtx = null;

        console.log(`[Track Dispose END ${this.id}] Finished disposal for track: "${trackNameForLog}"`);
    }
}
