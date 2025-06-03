// js/Track.js - Track Class Module

import * as Constants from './constants.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';

const MAX_VOICES_PER_POOL = 32;

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
        // console.log(`[Track ${this.id} Constructor] Initializing track "${this.name}" of type "${this.type}". InitialData present: ${!!initialData}`);

        this.isMuted = initialData?.isMuted || false;
        this.isMonitoringEnabled = initialData?.isMonitoringEnabled !== undefined ? initialData.isMonitoringEnabled : (this.type === 'Audio');

        const currentSoloedId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
        this.isSoloed = currentSoloedId === this.id;
        this.previousVolumeBeforeMute = initialData?.volume ?? 0.7;

        this._slicerVoicePool = [];
        this._slicerAvailableVoices = [];
        if (this.type === 'Sampler') {
            this._initializeSlicerVoicePool();
        }

        if (this.type === 'Synth') {
            this.synthEngineType = initialData?.synthEngineType || 'MonoSynth';
            this.synthParams = initialData?.synthParams ? JSON.parse(JSON.stringify(initialData.synthParams)) : this.getDefaultSynthParams();
        } else {
            this.synthEngineType = null;
            this.synthParams = {};
        }

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
                status: initialPadData?.status || (initialPadData?.dbKey || initialPadData?.audioBufferDataURL ? 'missing' : 'empty'),
                autoStretchEnabled: initialPadData?.autoStretchEnabled || false,
                stretchOriginalBPM: initialPadData?.stretchOriginalBPM || 120,
                stretchBeats: initialPadData?.stretchBeats || 1,
            };
        });
        this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
        this.drumPadPlayers = Array(Constants.numDrumSamplerPads).fill(null);

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

        this.gainNode = null;
        this.trackMeter = null;
        this.output = null;

        this.instrument = null;

        this.sequences = [];
        this.activeSequenceId = null;
        this.timelineClips = initialData?.timelineClips ? JSON.parse(JSON.stringify(initialData.timelineClips)) : [];

        this.clipPlayers = new Map();

        if (this.type !== 'Audio') {
            if (initialData?.sequences && initialData.sequences.length > 0) {
                this.sequences = JSON.parse(JSON.stringify(initialData.sequences));
                this.activeSequenceId = initialData.activeSequenceId || (this.sequences[0] ? this.sequences[0].id : null);
            }
            // Default sequence creation is deferred to initializeDefaultSequence()
        } else {
            this.inputChannel = null;
        }
        this.patternPlayerSequence = null;

        this.waveformCanvasCtx = null;
        this.instrumentWaveformCanvasCtx = null;
        this.automation = initialData?.automation ? JSON.parse(JSON.stringify(initialData.automation)) : { volume: [] };
        this.inspectorControls = {};
    }

    initializeDefaultSequence() {
        // console.log(`[Track ${this.id} initializeDefaultSequence] Called for "${this.name}". Current sequences count: ${this.sequences.length}`);
        if (this.type !== 'Audio' && (!this.sequences || this.sequences.length === 0)) {
            // console.log(`[Track ${this.id}] No initial sequences found or sequences array empty, creating default.`);
            if (typeof this.createNewSequence === 'function') {
                this.createNewSequence("Sequence 1", Constants.defaultStepsPerBar, true); // true for skipUndo
            } else {
                console.error(`[Track ${this.id}] CRITICAL ERROR in initializeDefaultSequence: this.createNewSequence is NOT a function! Track type: ${this.type}`);
                if (this.appServices.showNotification && typeof this.appServices.showNotification === 'function') {
                    this.appServices.showNotification(`Error initializing track ${this.name}: Cannot create default sequence. Method missing.`, 5000);
                }
            }
        }
    }

    _initializeSlicerVoicePool() {
        (this._slicerVoicePool || []).forEach(voiceUnit => {
            if (voiceUnit.player && !voiceUnit.player.disposed) try { voiceUnit.player.dispose(); } catch(e){console.warn(`Error disposing slicer pool player: ${e.message}`)}
            if (voiceUnit.envelope && !voiceUnit.envelope.disposed) try { voiceUnit.envelope.dispose(); } catch(e){console.warn(`Error disposing slicer pool envelope: ${e.message}`)}
            if (voiceUnit.gain && !voiceUnit.gain.disposed) try { voiceUnit.gain.dispose(); } catch(e){console.warn(`Error disposing slicer pool gain: ${e.message}`)}
        });

        this._slicerVoicePool = [];
        this._slicerAvailableVoices = [];
        const numVoicesToCreate = this.slicerIsPolyphonic ? MAX_VOICES_PER_POOL : 1;

        for (let i = 0; i < numVoicesToCreate; i++) {
            let player, envelope, gain;
            try {
                player = new Tone.Player();
                envelope = new Tone.AmplitudeEnvelope();
                gain = new Tone.Gain();
            } catch (toneError) {
                console.error(`[Track ${this.id} Sampler] Error creating Tone.js nodes for voice pool:`, toneError);
                continue;
            }
            const voiceUnit = { player, envelope, gain, isIdle: true, id: `slicerVoice_${this.id}_${i}` };
            this._slicerVoicePool.push(voiceUnit);
            this._slicerAvailableVoices.push(voiceUnit);
        }
    }

    _getVoiceFromSlicerPool() {
        if (this._slicerAvailableVoices.length > 0) {
            const voice = this._slicerAvailableVoices.pop();
            voice.isIdle = false;
            return voice;
        }
        // console.warn(`[Track ${this.id} Sampler] Slicer voice pool exhausted.`);
        const oldestVoice = this._slicerVoicePool.find(v => v.isIdle === false && v.player && !v.player.disposed && v.envelope && !v.envelope.disposed && v.gain && !v.gain.disposed);
        if (oldestVoice) {
            // console.warn(`[Track ${this.id} Sampler] EMERGENCY REUSE of voice ${oldestVoice.id}.`);
            try {
                if (oldestVoice.player.state === "started") oldestVoice.player.stop(Tone.now());
                oldestVoice.player.disconnect();
                if (oldestVoice.envelope && oldestVoice.envelope.getValueAtTime(Tone.now()) > 0) oldestVoice.envelope.triggerRelease(Tone.now());
                if (oldestVoice.envelope) oldestVoice.envelope.disconnect();
                if (oldestVoice.gain) oldestVoice.gain.disconnect();
            } catch (e) { console.warn("Error stopping/disconnecting emergency reused voice", e); }
            oldestVoice.isIdle = false;
            return oldestVoice;
        }
        return null;
    }

    _returnVoiceToSlicerPool(voiceUnit) {
        if (voiceUnit && voiceUnit.player) {
            try {
                if (voiceUnit.player.state === "started" && !voiceUnit.player.disposed) {
                    voiceUnit.player.stop(Tone.now() + 0.01);
                }
                if (!voiceUnit.player.disposed) voiceUnit.player.disconnect();
                if (voiceUnit.envelope && !voiceUnit.envelope.disposed) voiceUnit.envelope.disconnect();
                if (voiceUnit.gain && !voiceUnit.gain.disposed) voiceUnit.gain.disconnect();
            } catch (e) {
                // console.warn(`[Track ${this.id} Sampler] Error disconnecting voice ${voiceUnit.id} on return to pool:`, e.message);
            }
            voiceUnit.isIdle = true;
            if (!this._slicerAvailableVoices.find(v => v.id === voiceUnit.id)) {
                 this._slicerAvailableVoices.push(voiceUnit);
            }
        }
    }

    setName(newName, skipUndo = false) {
        if (typeof newName === 'string' && newName.trim() !== "") {
            const oldName = this.name;
            if (oldName === newName.trim()) return;

            if (!skipUndo && this.appServices.captureStateForUndo && typeof this.appServices.captureStateForUndo === 'function') {
                this.appServices.captureStateForUndo(`Rename Track "${oldName}" to "${newName.trim()}"`);
            }
            this.name = newName.trim();

            if (this.appServices.updateTrackUI && typeof this.appServices.updateTrackUI === 'function') {
                this.appServices.updateTrackUI(this.id, 'nameChanged');
            }
        }
    }

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

    getDefaultSynthParams() {
        return {
            portamento: 0.01,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 2, sustain: 0, release: 1 },
            filter: { type: 'lowpass', rolloff: -12, Q: 1, frequency: 1000 },
            filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 2, baseFrequency: 200, octaves: 7, exponent: 2 }
        };
    }

    async initializeAudioNodes() {
        // console.log(`[Track ${this.id} initializeAudioNodes] Initializing for "${this.name}".`);
        try {
            if (this.gainNode && !this.gainNode.disposed) try { this.gainNode.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old gainNode:`, e.message)}
            this.gainNode = null;
            if (this.trackMeter && !this.trackMeter.disposed) try { this.trackMeter.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old trackMeter:`, e.message)}
            this.trackMeter = null;
            if (this.inputChannel && !this.inputChannel.disposed && this.type === 'Audio') {
                try { this.inputChannel.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old inputChannel:`, e.message)}
                this.inputChannel = null;
            }

            if (!this.appServices.getMasterEffectsBusInputNode || typeof this.appServices.getMasterEffectsBusInputNode !== 'function') {
                 console.error(`[Track ${this.id} initializeAudioNodes] CRITICAL: getMasterEffectsBusInputNode service not available.`);
                 return;
            }

            this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
            this.output = this.gainNode;
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });

            if (this.type === 'Audio') {
                this.inputChannel = new Tone.Channel();
            }

            this.rebuildEffectChain();
        } catch (error) {
            console.error(`[Track ${this.id} initializeAudioNodes] Error during initialization:`, error);
            if (this.appServices.showNotification && typeof this.appServices.showNotification === 'function') {
                this.appServices.showNotification(`Error initializing audio for track ${this.name}: ${error.message}`, 4000);
            }
        }
    }

    rebuildEffectChain() {
        // console.log(`[Track ${this.id} rebuildEffectChain] For "${this.name}". Effects: ${this.activeEffects.length}. Instrument: ${this.instrument ? 'Exists' : 'NULL'}, GainNode: ${this.gainNode ? 'Exists' : 'NULL'}`);
        if (!this.gainNode || this.gainNode.disposed) {
            console.error(`[Track ${this.id} rebuildEffectChain] CRITICAL: GainNode is not valid. Attempting to reinitialize audio nodes.`);
            this.initializeAudioNodes().then(() => { // This is async, _performRebuildEffectChain might run before it fully resolves
                if (!this.gainNode || this.gainNode.disposed) {
                    console.error(`[Track ${this.id} rebuildEffectChain] CRITICAL: GainNode still invalid after re-init. Aborting chain rebuild.`);
                    return;
                }
                this._performRebuildEffectChain();
            }).catch(err => {
                console.error(`[Track ${this.id} rebuildEffectChain] Error during re-initialization of audio nodes:`, err);
            });
            return; // Return here to wait for async re-init or prevent immediate execution
        }
        this._performRebuildEffectChain();
    }

    _performRebuildEffectChain() {
        // console.log(`[Track ${this.id} _performRebuildEffectChain] Actual rebuild logic running for "${this.name}".`);
        if (!this.gainNode || this.gainNode.disposed) {
            console.error(`[Track ${this.id} _performRebuildEffectChain] GainNode still invalid. Aborting.`);
            return;
        }
        if (!this.trackMeter || this.trackMeter.disposed) {
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        }

        let sourceNodes = [];
        if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
            sourceNodes.push(this.instrument);
        } else if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed) {
            sourceNodes.push(this.toneSampler);
        } else if (this.type === 'Sampler' && !this.slicerIsPolyphonic && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
            sourceNodes.push(this.slicerMonoGain);
        } else if (this.type === 'Audio' && this.inputChannel && !this.inputChannel.disposed) {
            sourceNodes.push(this.inputChannel);
        }

        const allManagedPersistentNodes = [
            ...sourceNodes,
            ...this.activeEffects.map(e => e.toneNode),
            this.gainNode,
            this.trackMeter
        ].filter(node => node && !node.disposed);

        allManagedPersistentNodes.forEach(node => {
            try { node.disconnect(); } catch(e) { /* ignore */ }
        });

        if (this.type === 'Sampler' && !this.slicerIsPolyphonic && this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed &&
            this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed &&
            this.slicerMonoGain && !this.slicerMonoGain.disposed) {
            try {
                this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
            } catch (e) { console.error(`[Track ${this.id} _performRebuildEffectChain] Error chaining mono slicer components:`, e); }
        }

        let currentChainSource = null;
        if (sourceNodes.length > 0) {
            currentChainSource = sourceNodes[0]; // Assuming single primary persistent source for now
            // console.log(`[Track ${this.id} _performRebuildEffectChain] Initial currentChainSource (persistent):`, currentChainSource?.name || currentChainSource?.toString());
        }


        if (this.activeEffects.length > 0) {
            const firstEffectNode = this.activeEffects[0].toneNode;
            if (currentChainSource && firstEffectNode && !firstEffectNode.disposed) {
                try { currentChainSource.connect(firstEffectNode); /* console.log(`[Track ${this.id}] Connected source to first effect: ${this.activeEffects[0].type}`); */ }
                catch(e){console.error(`Error connecting source to first effect ${this.activeEffects[0].type}`, e)}
            } else if (!currentChainSource) {
                // console.log(`[Track ${this.id} _performRebuildEffectChain] No persistent source, first effect ${this.activeEffects[0].type} becomes target for dynamic sources.`);
            }
            for (let i = 0; i < this.activeEffects.length - 1; i++) {
                const currentEffect = this.activeEffects[i].toneNode;
                const nextEffect = this.activeEffects[i+1].toneNode;
                if (currentEffect && !currentEffect.disposed && nextEffect && !nextEffect.disposed) {
                    try { currentEffect.connect(nextEffect); /* console.log(`[Track ${this.id}] Connected ${this.activeEffects[i].type} to ${this.activeEffects[i+1].type}`); */ }
                    catch(e) { console.error(`[Track ${this.id}] Error connecting effect ${this.activeEffects[i].type} to ${this.activeEffects[i+1].type}:`, e); }
                }
            }
            currentChainSource = this.activeEffects[this.activeEffects.length - 1].toneNode; // Last effect is now the source for gainNode
            // console.log(`[Track ${this.id} _performRebuildEffectChain] currentChainSource after effects loop:`, currentChainSource?.name || currentChainSource?.toString());
        }

        if (currentChainSource && !currentChainSource.disposed && this.gainNode && !this.gainNode.disposed) {
            try { currentChainSource.connect(this.gainNode); /* console.log(`[Track ${this.id}] Connected chain output to gainNode.`); */ }
            catch (e) { console.error(`[Track ${this.id}] Error connecting chain output (${currentChainSource.toString()}) to gainNode:`, e); }
        } else if (!currentChainSource && this.activeEffects.length === 0) {
             if (this.type === 'Synth' && (!this.instrument || this.instrument.disposed)) {
                console.error(`[Track ${this.id} _performRebuildEffectChain] Synth type: Instrument is not ready or disposed, and no effects. Cannot connect instrument to gainNode.`);
             } else if ((this.type === 'InstrumentSampler' && (!this.toneSampler || this.toneSampler.disposed)) ||
                        (this.type === 'Sampler' && this.slicerIsPolyphonic && (!this.audioBuffer || !this.audioBuffer.loaded))
             ) {
                 // console.warn(`[Track ${this.id} _performRebuildEffectChain] Sampler/InstrumentSampler type has no persistent source node ready and no effects.`);
             }
             // For polyphonic samplers/drum samplers, their voices/players connect directly to gainNode if no effects.
        }


        if (this.gainNode && !this.gainNode.disposed && this.trackMeter && !this.trackMeter.disposed) {
            try { this.gainNode.connect(this.trackMeter);  /* console.log(`[Track ${this.id}] Connected gainNode to trackMeter.`); */ }
            catch (e) { console.error(`[Track ${this.id}] Error connecting gainNode to trackMeter:`, e); }
        }

        const masterBusInput = (this.appServices.getMasterEffectsBusInputNode && typeof this.appServices.getMasterEffectsBusInputNode === 'function')
            ? this.appServices.getMasterEffectsBusInputNode() : null;
        const finalTrackOutput = (this.trackMeter && !this.trackMeter.disposed) ? this.trackMeter : this.gainNode;

        if (finalTrackOutput && !finalTrackOutput.disposed) {
            try {
                finalTrackOutput.disconnect();
            } catch (e) { /* ignore if not connected */ }

            if (masterBusInput && !masterBusInput.disposed) {
                try {
                    finalTrackOutput.connect(masterBusInput);
                    // console.log(`[Track ${this.id} _performRebuildEffectChain] Connected final track output to masterBusInput.`);
                } catch (e) {
                    console.error(`[Track ${this.id}] Error connecting final output to masterBusInput:`, e, "Attempting fallback to Tone.Destination.");
                    try { finalTrackOutput.toDestination(); }
                    catch (e2) { console.error(`[Track ${this.id}] Error connecting final output to fallback Tone.Destination:`, e2); }
                }
            } else {
                console.warn(`[Track ${this.id} _performRebuildEffectChain] Master bus input not available/disposed. Connecting directly to Tone.Destination.`);
                try { finalTrackOutput.toDestination(); }
                catch (e) { console.error(`[Track ${this.id}] Error connecting final output to Tone.Destination:`, e); }
            }
        } else {
            console.error(`[Track ${this.id} _performRebuildEffectChain] CRITICAL: Final track output node is invalid. No output connection made.`);
        }

        this.applyMuteState();
        this.applySoloState();
        // console.log(`[Track ${this.id} _performRebuildEffectChain] Mute/Solo states applied. Chain rebuild finished for "${this.name}".`);
    }


    addEffect(effectType) {
        if (!this.appServices.effectsRegistryAccess || typeof this.appServices.effectsRegistryAccess.AVAILABLE_EFFECTS !== 'object') {
            console.error(`[Track ${this.id}] effectsRegistryAccess or AVAILABLE_EFFECTS not available.`);
            if (this.appServices.showNotification && typeof this.appServices.showNotification === 'function') this.appServices.showNotification("Cannot add effect: Effects registry missing.", 3000);
            return;
        }
        // ... (rest of addEffect logic remains the same)
        const AVAILABLE_EFFECTS_LOCAL = this.appServices.effectsRegistryAccess.AVAILABLE_EFFECTS;
        const getEffectDefaultParamsLocal = this.appServices.effectsRegistryAccess.getEffectDefaultParams;

        if (!AVAILABLE_EFFECTS_LOCAL[effectType]) {
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
            if (this.appServices.updateTrackUI && typeof this.appServices.updateTrackUI === 'function') {
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
            // console.log(`[Track ${this.id}] Removing effect "${effectToRemove.type}" (ID: ${effectId})`);
            if (effectToRemove.toneNode && !effectToRemove.toneNode.disposed) {
                try {
                    effectToRemove.toneNode.dispose();
                } catch (e) {
                    console.warn(`[Track ${this.id}] Error disposing effect node during removal:`, e.message);
                }
            }
            this.activeEffects.splice(effectIndex, 1);
            this.rebuildEffectChain();
            if (this.appServices.updateTrackUI && typeof this.appServices.updateTrackUI === 'function') {
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

        try { // Update stored params in track.activeEffects[...].params
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

        try { // Update actual Tone.js node parameter
            const keys = paramPath.split('.');
            let targetObject = effectWrapper.toneNode;
            for (let i = 0; i < keys.length - 1; i++) {
                if (targetObject && typeof targetObject[keys[i]] !== 'undefined') {
                    targetObject = targetObject[keys[i]];
                } else {
                    throw new Error(`Path part "${keys.slice(0, i + 1).join('.')}" not found on Tone node for effect "${effectWrapper.type}".`);
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
                 console.warn(`[Track ${this.id}] Could not set parameter "${paramPath}" on effect "${effectWrapper.type}". Target:`, targetObject);
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

        const [effectToMove] = this.activeEffects.splice(oldIndex, 1);
        this.activeEffects.splice(newIndex, 0, effectToMove);
        this.rebuildEffectChain();

        if (this.appServices.updateTrackUI && typeof this.appServices.updateTrackUI === 'function') {
            this.appServices.updateTrackUI(this.id, 'effectsListChanged');
        }
    }

    async fullyInitializeAudioResources() { /* ... same robust version ... */ }
    async initializeInstrument() { /* ... same robust version ... */ }
    setupSlicerMonoNodes() { /* ... same ... */ }
    disposeSlicerMonoNodes() { /* ... same ... */ }
    setupToneSampler() { /* ... same ... */ }
    setVolume(volume, fromInteraction = false) { /* ... same ... */ }
    applyMuteState() { /* ... same robust version ... */ }
    applySoloState() { /* ... same ... */ }
    setSynthParam(paramPath, value) { /* ... same robust version ... */ }
    setSliceVolume(sliceIndex, volume) { /* ... same ... */ }
    setSlicePitchShift(sliceIndex, semitones) { /* ... same ... */ }
    setSliceLoop(sliceIndex, loop) { /* ... same ... */ }
    setSliceReverse(sliceIndex, reverse) { if (this.slices && this.slices[sliceIndex]) this.slices[sliceIndex].reverse = !!reverse; }
    setSliceEnvelopeParam(sliceIndex, param, value) { /* ... same ... */ }
    setDrumSamplerPadVolume(padIndex, volume) { /* ... same ... */ }
    setDrumSamplerPadPitch(padIndex, pitch) { /* ... same ... */ }
    setDrumSamplerPadEnv(padIndex, param, value) { /* ... same ... */ }
    setDrumSamplerPadAutoStretch(padIndex, enabled) { /* ... same ... */ }
    setDrumSamplerPadStretchOriginalBPM(padIndex, bpm) { /* ... same ... */ }
    setDrumSamplerPadStretchBeats(padIndex, beats) { /* ... same ... */ }
    setInstrumentSamplerRootNote(noteName) { /* ... same ... */ }
    setInstrumentSamplerLoop(loop) { /* ... same ... */ }
    setInstrumentSamplerLoopStart(time) { /* ... same ... */ }
    setInstrumentSamplerLoopEnd(time) { /* ... same ... */ }
    setInstrumentSamplerEnv(param, value) { /* ... same ... */ }
    _captureUndoState(description) { /* ... same ... */ }

    createNewSequence(name = `Sequence ${this.sequences.length + 1}`, initialLengthSteps = Constants.defaultStepsPerBar, skipUndo = false) {
        if (this.type === 'Audio') return null;
        const newSeqId = `seq_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        let numRowsForGrid;

        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRowsForGrid = Constants.synthPitches.length;
        else if (this.type === 'Sampler') numRowsForGrid = (this.slices && this.slices.length > 0) ? this.slices.length : Constants.numSlices;
        else if (this.type === 'DrumSampler') numRowsForGrid = Constants.numDrumSamplerPads;
        else numRowsForGrid = 1;

        if (numRowsForGrid <= 0) {
             console.warn(`[Track ${this.id} createNewSequence] numRowsForGrid was <= 0 for type ${this.type}, defaulting to 1.`);
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

        if (typeof this.recreateToneSequence === 'function') {
            this.recreateToneSequence(true);
        } else {
            console.error(`[Track ${this.id}] createNewSequence: recreateToneSequence is not a function!`);
        }
        if (this.appServices.updateTrackUI && typeof this.appServices.updateTrackUI === 'function') this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        if (!skipUndo && typeof this._captureUndoState === 'function') this._captureUndoState(`Create Sequence "${name}" on ${this.name}`);

        const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        if (typeof Tone !== 'undefined' && Tone.Transport.state === 'started' && playbackMode === 'sequencer') {
            // console.log(`[Track ${this.id}] Transport running in sequencer mode. Scheduling new sequence "${name}".`);
            const transportLoopEnd = Tone.Transport.loopEnd || (Tone.Transport.seconds + 300);
            if (typeof this.schedulePlayback === 'function') {
                this.schedulePlayback(Tone.Transport.seconds, transportLoopEnd);
            } else {
                 console.error(`[Track ${this.id}] createNewSequence: schedulePlayback is not a function!`);
            }
        }
        return newSequence;
    }

    deleteSequence(sequenceId) { /* ... same robust version ... */ }
    renameSequence(sequenceId, newName) { /* ... same robust version ... */ }
    duplicateSequence(sequenceId) { /* ... same robust version ... */ }
    setActiveSequence(sequenceId) { /* ... same robust version ... */ }
    doubleSequence() { /* ... same robust version ... */ }
    setSequenceLength(newLengthInSteps, skipUndoCapture = false) { /* ... same robust version ... */ }

    recreateToneSequence(forceRestart = false, startTimeOffset = 0) {
        if (this.type === 'Audio') return;
        const currentPlaybackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        // console.log(`[Track ${this.id} recreateToneSequence] For "${this.name}". ActiveSeqID: ${this.activeSequenceId}. Mode: ${currentPlaybackMode}`);

        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            try {
                this.patternPlayerSequence.stop();
                this.patternPlayerSequence.clear();
                this.patternPlayerSequence.dispose();
            } catch (e) { console.warn(`[Track ${this.id}] Error disposing old Tone.Sequence:`, e.message); }
        }
        this.patternPlayerSequence = null;

        if (currentPlaybackMode !== 'sequencer') { return; }

        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data || !Array.isArray(activeSeq.data) || activeSeq.data.length === 0 || !activeSeq.length) {
            console.warn(`[Track ${this.id} recreateToneSequence] No valid active sequence or data for "${this.name}".`);
            return;
        }

        const sequenceDataForTone = activeSeq.data;
        const sequenceLengthForTone = activeSeq.length;

        try {
            this.patternPlayerSequence = new Tone.Sequence((time, col) => {
                // console.log(`[Track ${this.id} SeqCallback] Time: ${time.toFixed(3)}, Col: ${col}, Track: ${this.name}`);
                const playbackModeCheck = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
                if (playbackModeCheck !== 'sequencer') {
                    if (this.patternPlayerSequence && this.patternPlayerSequence.state === 'started' && !this.patternPlayerSequence.disposed) this.patternPlayerSequence.stop();
                    return;
                }
                const currentGlobalSoloId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
                const isEffectivelyMuted = this.isMuted || (currentGlobalSoloId !== null && currentGlobalSoloId !== this.id);

                if (this.appServices.highlightPlayingStep && typeof this.appServices.highlightPlayingStep === 'function') {
                    this.appServices.highlightPlayingStep(this.id, col);
                }
                if (!this.gainNode || this.gainNode.disposed || isEffectivelyMuted) {
                    // console.log(`[Track ${this.id} SeqCallback] Aborting note: GainNode invalid or track muted. Muted: ${isEffectivelyMuted}`);
                    return;
                }

                if (this.type === 'Synth') {
                    if (this.instrument && !this.instrument.disposed) {
                        let notePlayedThisStep = false;
                        for (let rowIndex = 0; rowIndex < Constants.synthPitches.length; rowIndex++) {
                            const pitchName = Constants.synthPitches[rowIndex];
                            const step = sequenceDataForTone[rowIndex]?.[col];
                            if (step?.active && !notePlayedThisStep) {
                                // console.log(`[Track ${this.id} SeqCallback] Synth Trigger: ${pitchName}`);
                                this.instrument.triggerAttackRelease(pitchName, "16n", time, step.velocity * Constants.defaultVelocity);
                                notePlayedThisStep = true;
                            }
                        }
                    }
                } else if (this.type === 'InstrumentSampler') {
                    if (this.toneSampler && !this.toneSampler.disposed && this.toneSampler.loaded) {
                        let notePlayedThisStep = false;
                        Constants.synthPitches.forEach((pitchName, rowIndex) => {
                            const step = sequenceDataForTone[rowIndex]?.[col];
                            if (step?.active) {
                                if (!this.instrumentSamplerIsPolyphonic && !notePlayedThisStep) {
                                    this.toneSampler.releaseAll(time);
                                    notePlayedThisStep = true;
                                }
                                // console.log(`[Track ${this.id} SeqCallback] InstrumentSampler Trigger: ${pitchName}`);
                                this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "16n", time, step.velocity * Constants.defaultVelocity);
                            }
                        });
                    }
                }
                // Sampler and DrumSampler logic for sequencer playback remains here
                else if (this.type === 'Sampler') { /* ... existing robust sampler playback logic ... */ }
                else if (this.type === 'DrumSampler') { /* ... existing robust drum sampler playback logic ... */ }

            }, Array.from(Array(sequenceLengthForTone).keys()), "16n");

            this.patternPlayerSequence.loop = true;
        } catch (error) {
            console.error(`[Track ${this.id} recreateToneSequence] Error creating Tone.Sequence for "${activeSeq.name}":`, error);
            this.patternPlayerSequence = null;
        }

        if (this.appServices.updateTrackUI && typeof this.appServices.updateTrackUI === 'function') {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
    }

    async addAudioClip(blob, startTime) { /* ... same robust version ... */ }
    async addExternalAudioFileAsClip(audioFileBlob, startTime, clipName = null) { /* ... same robust version ... */ }
    addSequenceClipToTimeline(sourceSequenceId, startTime, clipName = null) { /* ... same robust version ... */ }
    async _reschedulePlaybackIfNeeded(clipStartTime, modeHint) { /* ... same robust version ... */ }
    async getBlobDuration(blob) { /* ... same ... */ }
    async schedulePlayback(transportStartTime, transportStopTime) { /* ... same robust version ... */ }
    stopPlayback() { /* ... same robust version ... */ }
    async updateAudioClipPosition(clipId, newStartTime) { /* ... same robust version ... */ }
    dispose() { /* ... same robust version ... */ }
}
