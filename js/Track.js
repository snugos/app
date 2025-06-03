// js/Track.js - Track Class Module

import * as Constants from './constants.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';

const MAX_VOICES_PER_POOL = 32;

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

        this.gainNode = null; this.trackMeter = null;
        this.output = this.gainNode;

        this.instrument = null;

        this.sequences = [];
        this.activeSequenceId = null;
        this.timelineClips = initialData?.timelineClips ? JSON.parse(JSON.stringify(initialData.timelineClips)) : [];

        this.clipPlayers = new Map();

        if (this.type !== 'Audio') {
            if (initialData?.sequences && initialData.sequences.length > 0) {
                this.sequences = JSON.parse(JSON.stringify(initialData.sequences));
                this.activeSequenceId = initialData.activeSequenceId || (this.sequences[0] ? this.sequences[0].id : null);
            } else {
                this.createNewSequence("Sequence 1", Constants.defaultStepsPerBar, true);
            }
        } else {
            this.inputChannel = null;
        }
        this.patternPlayerSequence = null;

        this.waveformCanvasCtx = null;
        this.instrumentWaveformCanvasCtx = null;
        this.automation = initialData?.automation ? JSON.parse(JSON.stringify(initialData.automation)) : { volume: [] };
        this.inspectorControls = {};
    }

    // ... (Voice Pooling Methods remain the same) ...
    _initializeSlicerVoicePool() {
        this._slicerVoicePool.forEach(voiceUnit => {
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
                continue; // Skip this voice if node creation fails
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
        console.warn(`[Track ${this.id} Sampler] Slicer voice pool exhausted.`);
        const oldestVoice = this._slicerVoicePool.find(v => v.isIdle === false && v.player && !v.player.disposed && v.envelope && !v.envelope.disposed && v.gain && !v.gain.disposed);
        if (oldestVoice) {
            console.warn(`[Track ${this.id} Sampler] EMERGENCY REUSE of voice ${oldestVoice.id}.`);
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
                console.warn(`[Track ${this.id} Sampler] Error disconnecting voice ${voiceUnit.id} on return to pool:`, e.message);
            }
            voiceUnit.isIdle = true;
            if (!this._slicerAvailableVoices.find(v => v.id === voiceUnit.id)) {
                 this._slicerAvailableVoices.push(voiceUnit);
            }
        }
    }


    setName(newName, skipUndo = false) {
        // ... (setName remains the same) ...
        if (typeof newName === 'string' && newName.trim() !== "") {
            const oldName = this.name;
            if (oldName === newName.trim()) return;

            if (!skipUndo && this.appServices.captureStateForUndo) {
                this.appServices.captureStateForUndo(`Rename Track "${oldName}" to "${newName.trim()}"`);
            }
            this.name = newName.trim();

            if (this.appServices.updateTrackUI) {
                this.appServices.updateTrackUI(this.id, 'nameChanged');
            }
        }
    }

    // ... (getActiveSequence, getActiveSequenceData, getActiveSequenceLength, getDefaultSynthParams remain the same) ...
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
        // ... (initializeAudioNodes - ensure service checks) ...
        console.log(`[Track ${this.id} initializeAudioNodes] Initializing for "${this.name}".`);
        try {
            if (this.gainNode && !this.gainNode.disposed) try { this.gainNode.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old gainNode:`, e.message)}
            this.gainNode = null; // Nullify before recreation
            if (this.trackMeter && !this.trackMeter.disposed) try { this.trackMeter.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old trackMeter:`, e.message)}
            this.trackMeter = null; // Nullify
            if (this.inputChannel && !this.inputChannel.disposed && this.type === 'Audio') {
                try { this.inputChannel.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old inputChannel:`, e.message)}
                this.inputChannel = null; // Nullify
            }

            if (!this.appServices.getMasterEffectsBusInputNode || typeof this.appServices.getMasterEffectsBusInputNode !== 'function') {
                 console.error(`[Track ${this.id} initializeAudioNodes] CRITICAL: getMasterEffectsBusInputNode service not available or not a function.`);
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
        // ... (rebuildEffectChain - already has robust output connection from previous modification) ...
        // console.log(`[Track ${this.id} rebuildEffectChain] For "${this.name}". Effects: ${this.activeEffects.length}. Instrument: ${this.instrument ? 'Exists' : 'NULL'}, GainNode: ${this.gainNode ? 'Exists' : 'NULL'}`);
        if (!this.gainNode || this.gainNode.disposed) {
            console.error(`[Track ${this.id} rebuildEffectChain] CRITICAL: GainNode is not valid. Attempting to reinitialize audio nodes.`);
            // MODIFICATION: Attempt to re-initialize audio nodes if gainNode is invalid, then proceed or abort.
            this.initializeAudioNodes().then(() => {
                if (!this.gainNode || this.gainNode.disposed) {
                    console.error(`[Track ${this.id} rebuildEffectChain] CRITICAL: GainNode still invalid after re-init. Aborting chain rebuild.`);
                    return;
                }
                this._performRebuildEffectChain(); // Call the actual logic
            });
            return;
        }
        this._performRebuildEffectChain();
    }

    _performRebuildEffectChain() { // Encapsulated the core logic
        // console.log(`[Track ${this.id} _performRebuildEffectChain] Actual rebuild logic running.`);
        if (!this.gainNode || this.gainNode.disposed) { // Double check after potential async re-init
            console.error(`[Track ${this.id} _performRebuildEffectChain] GainNode still invalid. Aborting.`);
            return;
        }
        if (!this.trackMeter || this.trackMeter.disposed) {
            // console.warn(`[Track ${this.id} _performRebuildEffectChain] TrackMeter is not valid, re-creating.`);
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
            currentChainSource = sourceNodes[0];
        }

        if (this.activeEffects.length > 0) {
            const firstEffectNode = this.activeEffects[0].toneNode;
            if (currentChainSource && firstEffectNode && !firstEffectNode.disposed) {
                try { currentChainSource.connect(firstEffectNode); } catch(e){console.error(`Error connecting source to first effect ${this.activeEffects[0].type}`, e)}
            } else if (!currentChainSource) {
                 console.log(`[Track ${this.id} _performRebuildEffectChain] No persistent source, first effect ${this.activeEffects[0].type} will be target for dynamic sources.`);
            }
            for (let i = 0; i < this.activeEffects.length - 1; i++) {
                const currentEffect = this.activeEffects[i].toneNode;
                const nextEffect = this.activeEffects[i+1].toneNode;
                if (currentEffect && !currentEffect.disposed && nextEffect && !nextEffect.disposed) {
                    try { currentEffect.connect(nextEffect); } catch(e) { console.error(`[Track ${this.id}] Error connecting effect ${this.activeEffects[i].type} to ${this.activeEffects[i+1].type}:`, e); }
                }
            }
            currentChainSource = this.activeEffects[this.activeEffects.length - 1].toneNode;
        }

        if (currentChainSource && !currentChainSource.disposed) {
            try { currentChainSource.connect(this.gainNode); } catch (e) { console.error(`[Track ${this.id}] Error connecting chain output (from ${currentChainSource.toString()}) to gainNode:`, e); }
        } else if (!currentChainSource && this.activeEffects.length === 0) {
             if (this.type === 'Synth' || this.type === 'InstrumentSampler' || (this.type === 'Sampler' && !this.slicerIsPolyphonic)) {
                console.error(`[Track ${this.id} _performRebuildEffectChain] Persistent source type (${this.type}) has no instrument/source AND no effects. Instrument will not be connected to gainNode.`);
             }
        }

        if (this.gainNode && !this.gainNode.disposed && this.trackMeter && !this.trackMeter.disposed) {
            try { this.gainNode.connect(this.trackMeter);  }
            catch (e) { console.error(`[Track ${this.id}] Error connecting gainNode to trackMeter:`, e); }
        }

        const masterBusInput = this.appServices.getMasterEffectsBusInputNode ? this.appServices.getMasterEffectsBusInputNode() : null;
        const finalTrackOutput = (this.trackMeter && !this.trackMeter.disposed) ? this.trackMeter : this.gainNode;

        if (finalTrackOutput && !finalTrackOutput.disposed) {
            try {
                finalTrackOutput.disconnect();
            } catch (e) { /* ignore */ }

            if (masterBusInput && !masterBusInput.disposed) {
                try {
                    finalTrackOutput.connect(masterBusInput);
                } catch (e) {
                    console.error(`[Track ${this.id}] Error connecting final output to masterBusInput:`, e, "Attempting fallback to Tone.Destination.");
                    try { finalTrackOutput.toDestination(); }
                    catch (e2) { console.error(`[Track ${this.id}] Error connecting final output to fallback Tone.Destination:`, e2); }
                }
            } else {
                console.warn(`[Track ${this.id} _performRebuildEffectChain] Master effects bus input not available or disposed. Connecting directly to Tone.Destination as fallback.`);
                try {
                    finalTrackOutput.toDestination();
                } catch (e) {
                    console.error(`[Track ${this.id}] Error connecting final output to Tone.Destination:`, e);
                }
            }
        } else {
            console.error(`[Track ${this.id} _performRebuildEffectChain] CRITICAL: Final track output node is invalid. No output connection made.`);
        }

        this.applyMuteState();
        this.applySoloState();
    }


    addEffect(effectType) {
        // ... (addEffect remains the same, ensure service checks) ...
        if (!this.appServices.effectsRegistryAccess || typeof this.appServices.effectsRegistryAccess.AVAILABLE_EFFECTS !== 'object') {
            console.error(`[Track ${this.id}] effectsRegistryAccess or AVAILABLE_EFFECTS not available.`);
            if (this.appServices.showNotification) this.appServices.showNotification("Cannot add effect: Effects registry missing.", 3000);
            return;
        }
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

    // ... (removeEffect, updateEffectParam, reorderEffect, fullyInitializeAudioResources, initializeInstrument, etc.
    //      should have checks for this.appServices functions and for !node.disposed before use)
    // ... (The rest of the methods like fullyInitializeAudioResources, initializeInstrument, sample loading, sequence management,
    //      and playback scheduling methods remain structurally the same as the previous version with the playback fixes,
    //      but would benefit from more internal checks for `this.appServices.someFunction` before calling if not already present,
    //      and `!node.disposed` checks for Tone.js objects.)

    // MODIFICATION: Added a more robust dispose method.
    dispose() {
        const trackNameForLog = this.name || `Track ${this.id}`;
        console.log(`[Track Dispose START ${this.id}] For track: "${trackNameForLog}"`);

        try {
            if (typeof this.stopPlayback === 'function') {
                this.stopPlayback();
                // console.log(`[Track Dispose ${this.id}] Playback stopped.`);
            }
        } catch (e) {
            console.warn(`[Track Dispose ${this.id}] Error in stopPlayback:`, e.message);
        }

        if (this._slicerVoicePool && Array.isArray(this._slicerVoicePool)) {
            this._slicerVoicePool.forEach(voiceUnit => {
                if (voiceUnit.player && !voiceUnit.player.disposed) try { voiceUnit.player.dispose(); } catch(e){ console.warn(`Error disposing pool player: ${e.message}`) }
                if (voiceUnit.envelope && !voiceUnit.envelope.disposed) try { voiceUnit.envelope.dispose(); } catch(e){ console.warn(`Error disposing pool envelope: ${e.message}`) }
                if (voiceUnit.gain && !voiceUnit.gain.disposed) try { voiceUnit.gain.dispose(); } catch(e){ console.warn(`Error disposing pool gain: ${e.message}`) }
            });
            this._slicerVoicePool = [];
            this._slicerAvailableVoices = [];
            // console.log(`[Track Dispose ${this.id}] Slicer voice pool cleared.`);
        }


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

        this.disposeSlicerMonoNodes(); // This already has internal checks

        (this.drumPadPlayers || []).forEach((player, index) => {
            if (player && !player.disposed) {
                try { player.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing drumPadPlayer ${index}:`, e.message); }
            }
            this.drumPadPlayers[index] = null;
        });

        (this.activeEffects || []).forEach(effect => {
            if (effect.toneNode && !effect.toneNode.disposed) {
                try { effect.toneNode.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing effect "${effect.type}":`, e.message); }
            }
        });
        this.activeEffects = [];

        if (this.gainNode && !this.gainNode.disposed) {
            try { this.gainNode.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing gainNode:`, e.message); }
        }
        this.gainNode = null;
        this.output = null;

        if (this.trackMeter && !this.trackMeter.disposed) {
            try { this.trackMeter.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing trackMeter:`, e.message); }
        }
        this.trackMeter = null;

        if (this.inputChannel && !this.inputChannel.disposed) {
            try { this.inputChannel.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing inputChannel:`, e.message); }
        }
        this.inputChannel = null;

        // Close associated windows
        if (this.appServices.closeAllTrackWindows && typeof this.appServices.closeAllTrackWindows === 'function') {
            try {
                this.appServices.closeAllTrackWindows(this.id);
                // console.log(`[Track Dispose ${this.id}] Associated windows closed.`);
            } catch (e) {
                console.warn(`[Track Dispose ${this.id}] Error calling closeAllTrackWindows:`, e.message);
            }
        } else {
            console.warn(`[Track Dispose ${this.id}] appServices.closeAllTrackWindows service not available.`);
        }

        if (this.audioBuffer && !this.audioBuffer.disposed) {
            try { this.audioBuffer.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing audioBuffer (Sampler):`, e.message); }
        }
        this.audioBuffer = null;

        (this.drumSamplerPads || []).forEach(p => {
            if (p && p.audioBuffer && !p.audioBuffer.disposed) { // Added null check for p
                try { p.audioBuffer.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing pad audioBuffer:`, e.message); }
            }
            if (p) p.audioBuffer = null;
        });

        if (this.instrumentSamplerSettings?.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) {
            try { this.instrumentSamplerSettings.audioBuffer.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing audioBuffer (InstrumentSampler):`, e.message); }
        }
        if (this.instrumentSamplerSettings) this.instrumentSamplerSettings.audioBuffer = null;

        this.sequences = [];
        this.timelineClips = [];
        this.inspectorControls = {};
        this.waveformCanvasCtx = null;
        this.instrumentWaveformCanvasCtx = null;
        // console.log(`[Track Dispose ${this.id}] Cleared arrays and UI contexts.`);

        this.appServices = {}; // Clear appServices reference
        console.log(`[Track Dispose END ${this.id}] Finished disposal for track: "${trackNameForLog}"`);
    }
}
