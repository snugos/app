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
        console.log(`[Track ${this.id} Constructor] Initializing track "${this.name}" of type "${this.type}". InitialData present: ${!!initialData}`);

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
        // this.outputNode was defined but not consistently used as the main output point;
        // connections are made from gainNode or trackMeter directly.
        // For clarity, ensure this.output in ToneAudioNode terms is this.gainNode.
        this.output = this.gainNode; // Explicitly for ToneAudioNode compatibility if used.

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

    _initializeSlicerVoicePool() {
        this._slicerVoicePool.forEach(voiceUnit => {
            if (voiceUnit.player && !voiceUnit.player.disposed) try { voiceUnit.player.dispose(); } catch(e){}
            if (voiceUnit.envelope && !voiceUnit.envelope.disposed) try { voiceUnit.envelope.dispose(); } catch(e){}
            if (voiceUnit.gain && !voiceUnit.gain.disposed) try { voiceUnit.gain.dispose(); } catch(e){}
        });

        this._slicerVoicePool = [];
        this._slicerAvailableVoices = [];
        const numVoicesToCreate = this.slicerIsPolyphonic ? MAX_VOICES_PER_POOL : 1;

        for (let i = 0; i < numVoicesToCreate; i++) {
            const player = new Tone.Player();
            const envelope = new Tone.AmplitudeEnvelope();
            const gain = new Tone.Gain();
            const voiceUnit = { player, envelope, gain, isIdle: true, id: `slicerVoice_${this.id}_${i}` };
            this._slicerVoicePool.push(voiceUnit);
            this._slicerAvailableVoices.push(voiceUnit);
        }
        // console.log(`[Track ${this.id} Sampler] Initialized slicer voice pool with ${numVoicesToCreate} voices. Polyphonic: ${this.slicerIsPolyphonic}`);
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
        if (typeof newName === 'string' && newName.trim() !== "") {
            const oldName = this.name;
            if (oldName === newName.trim()) return;

            if (!skipUndo && this.appServices.captureStateForUndo) {
                this.appServices.captureStateForUndo(`Rename Track "${oldName}" to "${newName.trim()}"`);
            }
            this.name = newName.trim();
            // console.log(`[Track ${this.id}] Renamed from "${oldName}" to "${this.name}"`); // MODIFICATION: Optional log

            if (this.appServices.updateTrackUI) {
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
            this.output = this.gainNode; // For ToneAudioNode compatibility
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });

            if (this.type === 'Audio') {
                this.inputChannel = new Tone.Channel();
                // console.log(`[Track ${this.id} initializeAudioNodes] Created inputChannel for Audio track.`); // MODIFICATION: Optional log
            }

            this.rebuildEffectChain();
            // console.log(`[Track ${this.id} initializeAudioNodes] Audio nodes initialized and effect chain rebuilt.`); // MODIFICATION: Optional log
        } catch (error) {
            console.error(`[Track ${this.id} initializeAudioNodes] Error during initialization:`, error);
            if (this.appServices.showNotification) {
                this.appServices.showNotification(`Error initializing audio for track ${this.name}: ${error.message}`, 4000);
            }
        }
    }

    rebuildEffectChain() {
        console.log(`[Track ${this.id} rebuildEffectChain] For "${this.name}". Effects: ${this.activeEffects.length}. Instrument: ${this.instrument ? 'Exists' : 'NULL'}, GainNode: ${this.gainNode ? 'Exists' : 'NULL'}`);
        if (!this.gainNode || this.gainNode.disposed) {
            console.error(`[Track ${this.id} rebuildEffectChain] CRITICAL: GainNode is not valid. Aborting chain rebuild.`);
            return;
        }
        if (!this.trackMeter || this.trackMeter.disposed) {
            console.warn(`[Track ${this.id} rebuildEffectChain] TrackMeter is not valid, re-creating.`);
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
        // console.log(`[Track ${this.id} rebuildEffectChain] Identified ${sourceNodes.length} persistent source nodes.`); // MODIFICATION: Optional log

        const allManagedPersistentNodes = [
            ...sourceNodes,
            ...this.activeEffects.map(e => e.toneNode),
            this.gainNode,
            this.trackMeter
        ].filter(node => node && !node.disposed);

        allManagedPersistentNodes.forEach(node => {
            try { node.disconnect(); } catch(e) { /* console.warn(`[Track ${this.id} rebuildEffectChain] Error during disconnect of node:`, node?.toString(), e.message); */ } // MODIFICATION: Optional log
        });
        // console.log(`[Track ${this.id} rebuildEffectChain] All managed persistent nodes disconnected.`); // MODIFICATION: Optional log

        if (this.type === 'Sampler' && !this.slicerIsPolyphonic && this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed &&
            this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed &&
            this.slicerMonoGain && !this.slicerMonoGain.disposed) {
            try {
                this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
                // console.log(`[Track ${this.id} rebuildEffectChain] Chained mono slicer player -> envelope -> gain.`); // MODIFICATION: Optional log
            } catch (e) { console.error(`[Track ${this.id} rebuildEffectChain] Error chaining mono slicer components:`, e); }
        }

        let currentChainSource = null;
        if (sourceNodes.length > 0) {
            currentChainSource = sourceNodes[0]; // Assuming single primary source for now.
        }


        if (this.activeEffects.length > 0) {
            const firstEffectNode = this.activeEffects[0].toneNode;
            if (currentChainSource && firstEffectNode && !firstEffectNode.disposed) {
                try { currentChainSource.connect(firstEffectNode); } catch(e){console.error(`Error connecting source to first effect ${this.activeEffects[0].type}`, e)}
            } else if (!currentChainSource) {
                 // If no primary source (e.g. polyphonic sampler, drum sampler), effects input comes from dynamic sources
                 // This means individual players/voices will need to connect to this.activeEffects[0].toneNode
                 console.log(`[Track ${this.id} rebuildEffectChain] No persistent source, first effect ${this.activeEffects[0].type} will be target for dynamic sources.`);
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
             // console.log(`[Track ${this.id} rebuildEffectChain] Connected chain/source output to gainNode.`); // MODIFICATION: Optional log
        } else if (!currentChainSource && this.activeEffects.length === 0) {
             // No persistent source, no effects. Dynamic sources (clips, sampler voices) connect directly to gainNode.
             if (this.type === 'Synth' || this.type === 'InstrumentSampler' || (this.type === 'Sampler' && !this.slicerIsPolyphonic)) {
                console.error(`[Track ${this.id} rebuildEffectChain] Persistent source type (${this.type}) has no instrument/source AND no effects. Instrument will not be connected to gainNode.`);
             } else {
                // console.log(`[Track ${this.id} rebuildEffectChain] No persistent source and no effects. Dynamic sources will connect to gainNode.`); // MODIFICATION: Optional log
             }
        }


        if (this.gainNode && !this.gainNode.disposed && this.trackMeter && !this.trackMeter.disposed) {
            try { this.gainNode.connect(this.trackMeter); /* console.log(`[Track ${this.id} rebuildEffectChain] Connected gainNode to trackMeter.`); */ } // MODIFICATION: Optional log
            catch (e) { console.error(`[Track ${this.id}] Error connecting gainNode to trackMeter:`, e); }
        }

        // MODIFICATION START: More robust connection to master bus
        const masterBusInput = this.appServices.getMasterEffectsBusInputNode ? this.appServices.getMasterEffectsBusInputNode() : null;
        const finalTrackOutput = (this.trackMeter && !this.trackMeter.disposed) ? this.trackMeter : this.gainNode;

        if (finalTrackOutput && !finalTrackOutput.disposed) {
            try { // Always disconnect finalTrackOutput before attempting new connections
                finalTrackOutput.disconnect();
            } catch (e) { /* ignore if not connected, or already disconnected */ }

            if (masterBusInput && !masterBusInput.disposed) {
                try {
                    finalTrackOutput.connect(masterBusInput);
                    // console.log(`[Track ${this.id} rebuildEffectChain] Connected final track output to masterBusInput.`); // MODIFICATION: Optional log
                } catch (e) {
                    console.error(`[Track ${this.id}] Error connecting final output to masterBusInput:`, e, "Attempting fallback to Tone.Destination.");
                    try { finalTrackOutput.toDestination(); }
                    catch (e2) { console.error(`[Track ${this.id}] Error connecting final output to fallback Tone.Destination:`, e2); }
                }
            } else {
                console.warn(`[Track ${this.id} rebuildEffectChain] Master effects bus input not available or disposed. Connecting directly to Tone.Destination as fallback.`);
                try {
                    finalTrackOutput.toDestination();
                } catch (e) {
                    console.error(`[Track ${this.id}] Error connecting final output to Tone.Destination:`, e);
                }
            }
        } else {
            console.error(`[Track ${this.id} rebuildEffectChain] CRITICAL: Final track output node (gainNode or trackMeter) is invalid. No output connection made.`);
        }
        // MODIFICATION END

        this.applyMuteState();
        this.applySoloState();
        // console.log(`[Track ${this.id} rebuildEffectChain] Mute/Solo states applied. Chain rebuild finished for "${this.name}".`); // MODIFICATION: Optional log
    }


    addEffect(effectType) {
        // ... (no changes, but ensure it calls rebuildEffectChain)
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
            this.rebuildEffectChain(); // This should fix the audio path if it was broken
            if (this.appServices.updateTrackUI) {
                this.appServices.updateTrackUI(this.id, 'effectsListChanged');
            }
            // console.log(`[Track ${this.id}] Added effect "${effectType}".`); // MODIFICATION: Optional log
        } else {
            console.warn(`[Track ${this.id}] Could not create Tone.js instance for effect ${effectType}`);
            if (this.appServices.showNotification) this.appServices.showNotification(`Could not create effect: ${effectType}`, 3000);
        }
    }
    // ... (removeEffect, updateEffectParam, reorderEffect remain largely the same but rely on rebuildEffectChain)
    removeEffect(effectId) {
        const effectIndex = this.activeEffects.findIndex(e => e.id === effectId);
        if (effectIndex > -1) {
            const effectToRemove = this.activeEffects[effectIndex];
            // console.log(`[Track ${this.id}] Removing effect "${effectToRemove.type}" (ID: ${effectId})`); // MODIFICATION: Optional log
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

        // console.log(`[Track ${this.id}] Reordering effect ${effectId} from index ${oldIndex} to ${newIndex}.`); // MODIFICATION: Optional log
        const [effectToMove] = this.activeEffects.splice(oldIndex, 1);
        this.activeEffects.splice(newIndex, 0, effectToMove);
        this.rebuildEffectChain();

        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'effectsListChanged');
        }
    }


    async fullyInitializeAudioResources() {
        console.log(`[Track ${this.id} fullyInitializeAudioResources] For "${this.name}" (type: ${this.type})`);
        if (!this.gainNode || this.gainNode.disposed) {
            console.warn(`[Track ${this.id} fullyInitializeAudioResources] GainNode missing. Re-initializing audio nodes.`);
            await this.initializeAudioNodes();
            if (!this.gainNode || this.gainNode.disposed) {
                console.error(`[Track ${this.id} fullyInitializeAudioResources] CRITICAL: GainNode still invalid. Aborting.`);
                return;
            }
        }

        try {
            if (this.type === 'Synth') {
                await this.initializeInstrument();
            } else if (this.type === 'Sampler') {
                // ... (sampler loading logic - no change here for now beyond what's already there) ...
                 if (this._slicerVoicePool.length === 0 ||
                    (this.slicerIsPolyphonic && this._slicerVoicePool.length < MAX_VOICES_PER_POOL) ||
                    (!this.slicerIsPolyphonic && this._slicerVoicePool.length > 1 && this._slicerVoicePool.some(v => v.player === this.slicerMonoPlayer))
                    ) {
                    // console.log(`[Track ${this.id} Sampler] Re-initializing slicer voice pool.`); // MODIFICATION: Optional log
                    this._initializeSlicerVoicePool();
                }
                if (this.samplerAudioData && (this.samplerAudioData.dbKey || this.samplerAudioData.audioBufferDataURL)) {
                    // console.log(`[Track ${this.id} Sampler] Attempting to load sample: ${this.samplerAudioData.fileName || this.samplerAudioData.dbKey}`); // MODIFICATION: Optional log
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
                         // Data URL logic is complex, assuming it works if present
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
                            this.disposeSlicerMonoNodes();
                            this.audioBuffer = await new Tone.Buffer().load(objectURL);
                            this.samplerAudioData.status = 'loaded';
                            // console.log(`[Track ${this.id} Sampler] Sample "${this.samplerAudioData.fileName}" loaded. Duration: ${this.audioBuffer.duration}`); // MODIFICATION: Optional log

                            if (this.slicerIsPolyphonic) {
                                this._slicerVoicePool.forEach(voice => {
                                    if (voice.player && !voice.player.disposed) {
                                        voice.player.buffer = this.audioBuffer;
                                    }
                                });
                            } else {
                                this.setupSlicerMonoNodes();
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
                // ... (drum sampler loading - no change here for now) ...
                 for (let i = 0; i < this.drumSamplerPads.length; i++) {
                    const pad = this.drumSamplerPads[i];
                    if (!pad) continue;
                    if (pad.dbKey || pad.audioBufferDataURL) {
                        // console.log(`[Track ${this.id} DrumSampler] Pad ${i}: Attempting to load sample: ${pad.originalFileName || pad.dbKey}`); // MODIFICATION: Optional log
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
                                    // console.log(`[Track ${this.id} DrumSampler] Pad ${i}: Sample "${pad.originalFileName}" loaded. Duration: ${pad.audioBuffer.duration}`); // MODIFICATION: Optional log
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
                // ... (instrument sampler loading - no change here for now) ...
                 if (this.instrumentSamplerSettings.dbKey || this.instrumentSamplerSettings.audioBufferDataURL) {
                    // console.log(`[Track ${this.id} InstrumentSampler] Attempting to load sample: ${this.instrumentSamplerSettings.originalFileName || this.instrumentSamplerSettings.dbKey}`); // MODIFICATION: Optional log
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
                                // console.log(`[Track ${this.id} InstrumentSampler] Sample loaded. Duration: ${this.instrumentSamplerSettings.audioBuffer.duration}`); // MODIFICATION: Optional log
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
                    // console.log(`[Track ${this.id} fullyInitializeAudioResources] Re-initializing audio nodes for Audio track as inputChannel was invalid.`); // MODIFICATION: Optional log
                    await this.initializeAudioNodes();
                 }
                 for (const clip of this.timelineClips) {
                     if (clip.type === 'audio' && clip.sourceId ) {
                         try {
                             const audioBlob = await getAudio(clip.sourceId);
                             if (audioBlob) {
                                 const url = URL.createObjectURL(audioBlob);
                                 // console.log(`[Track ${this.id} Audio] Verified audio clip source ${clip.sourceId} (${clip.name}) from DB.`); // MODIFICATION: Optional log
                                 if (clip.duration === 0) {
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
        this.rebuildEffectChain(); // Crucial: ensure this connects the instrument if it was just created
        // console.log(`[Track ${this.id} fullyInitializeAudioResources] Finished for "${this.name}".`); // MODIFICATION: Optional log
    }


    async initializeInstrument() {
        if (this.type === 'Synth') {
            // console.log(`[Track ${this.id} initializeInstrument] Initializing synth instrument (type: ${this.synthEngineType}).`); // MODIFICATION: Optional log
            if (this.instrument && !this.instrument.disposed) {
                try { this.instrument.dispose(); } catch(e) { console.warn(`[Track ${this.id}] Error disposing old synth instrument:`, e.message); }
            }
            try {
                const paramsForSynth = {
                    ...this.synthParams,
                    oscillator: this.synthParams.oscillator || { type: 'sine' },
                    envelope: this.synthParams.envelope || { attack: 0.005, decay:0.1, sustain:0.3, release:1 },
                    filterEnvelope: this.synthParams.filterEnvelope || { attack:0.06, decay:0.2, sustain:0.5, release:2, baseFrequency:200, octaves:7 },
                    filter: this.synthParams.filter || { type:'lowpass', Q:1, frequency: 1000, rolloff: -12}
                };
                this.instrument = new Tone.MonoSynth(paramsForSynth);
                // console.log(`[Track ${this.id} initializeInstrument] MonoSynth initialized with params:`, JSON.parse(JSON.stringify(paramsForSynth))); // MODIFICATION: Optional log
            } catch (error) {
                console.error(`[Track ${this.id} initializeInstrument] Error creating MonoSynth:`, error);
                if (this.appServices.showNotification) this.appServices.showNotification(`Error creating synth for track ${this.name}.`, 3000);
                this.instrument = null;
            }
        }
        // MODIFICATION: After instrument initialization, a rebuild might be beneficial if it wasn't connected.
        // However, fullyInitializeAudioResources already calls rebuildEffectChain at its end.
    }
    // ... (other methods like setupSlicerMonoNodes, setVolume, etc., remain the same for now unless specifically targeted)
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
                // console.log(`[Track ${this.id} setupSlicerMonoNodes] Mono slicer nodes created.`); // MODIFICATION: Optional log
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
            // console.log(`[Track ${this.id} setupToneSampler] Setting up Tone.Sampler.`); // MODIFICATION: Optional log
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
                        onload: () => {
                            if (this.toneSampler && !this.toneSampler.disposed) {
                                this.toneSampler.loop = this.instrumentSamplerSettings.loop;
                                this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart;
                                this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd;
                                // console.log(`[Track ${this.id} setupToneSampler] Tone.Sampler loaded and configured. Root: ${rootNote}, Loop: ${this.toneSampler.loop}`); // MODIFICATION: Optional log
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
        this.previousVolumeBeforeMute = Math.max(0, Math.min(parseFloat(volume) || 0, 1.5));
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
                this.gainNode.gain.rampTo(targetVolume, 0.01);
            } catch (e) { console.error(`[Track ${this.id}] Error applying mute state to gainNode:`, e); }
        } else {
            // console.warn(`[Track ${this.id} applyMuteState] GainNode not available or disposed.`); // MODIFICATION: Optional log
        }
    }

    applySoloState() {
        this.applyMuteState();
    }
    setSynthParam(paramPath, value) {
        if (this.type !== 'Synth') return;
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

    setSliceVolume(sliceIndex, volume) { if (this.slices && this.slices[sliceIndex]) this.slices[sliceIndex].volume = parseFloat(volume); }
    setSlicePitchShift(sliceIndex, semitones) { if (this.slices && this.slices[sliceIndex]) this.slices[sliceIndex].pitchShift = parseInt(semitones); }
    setSliceLoop(sliceIndex, loop) { if (this.slices && this.slices[sliceIndex]) this.slices[sliceIndex].loop = !!loop; }
    setSliceReverse(sliceIndex, reverse) { if (this.slices && this.slices[sliceIndex]) this.slices[sliceIndex].reverse = !!loop; }
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
    setInstrumentSamplerEnv(param, value) { if (this.instrumentSamplerSettings && this.instrumentSamplerSettings.envelope) { this.instrumentSamplerSettings.envelope[param] = parseFloat(value); if (this.toneSampler && !this.toneSampler.disposed) { if (param === 'attack' && typeof this.toneSampler.attack !== 'undefined') this.toneSampler.attack = value; if (param === 'release' && typeof this.toneSampler.release !== 'undefined') this.toneSampler.release = value; } } }


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
        // console.log(`[Track ${this.id}] Created new sequence: "${name}" (ID: ${newSeqId}), Rows: ${numRowsForGrid}, Length: ${actualLength}`); // MODIFICATION: Optional log

        // MODIFICATION START: Auto-play new sequence if in sequencer mode and transport is running
        const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        if (typeof Tone !== 'undefined' && Tone.Transport.state === 'started' && playbackMode === 'sequencer') {
            console.log(`[Track ${this.id}] Transport running in sequencer mode. Scheduling new sequence "${name}".`);
            const transportLoopEnd = Tone.Transport.loopEnd || (Tone.Transport.seconds + 300); // Default lookahead
            this.schedulePlayback(Tone.Transport.seconds, transportLoopEnd);
        }
        // MODIFICATION END
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
            // console.log(`[Track ${this.id}] Deleted sequence: ${deletedSeqName} (ID: ${sequenceId})`); // MODIFICATION: Optional log
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
            // console.log(`[Track ${this.id}] Renamed sequence ID ${sequenceId} from "${oldName}" to: "${newName.trim()}"`); // MODIFICATION: Optional log
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
        // console.log(`[Track ${this.id}] Duplicated sequence: "${originalSequence.name}" to "${newSequence.name}" (ID: ${newSeqId})`); // MODIFICATION: Optional log
        return newSequence;
    }


    setActiveSequence(sequenceId) {
        if (this.type === 'Audio') return;
        const seq = this.sequences ? this.sequences.find(s => s.id === sequenceId) : null;
        if (seq && this.activeSequenceId !== sequenceId) {
            // console.log(`[Track ${this.id}] Setting active sequence to: "${seq.name}" (ID: ${sequenceId})`); // MODIFICATION: Optional log
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
        // console.log(`[Track ${this.id}] Doubled length of sequence "${activeSeq.name}" to ${newLength} steps.`); // MODIFICATION: Optional log
    }

    setSequenceLength(newLengthInSteps, skipUndoCapture = false) {
        if (this.type === 'Audio') return;
        const activeSeq = this.getActiveSequence();
        if (!activeSeq) {
            console.warn(`[Track ${this.id} setSequenceLength] No active sequence to set length for.`);
            return;
        }

        const oldActualLength = activeSeq.length || 0;
        let validatedNewLength = Math.max(Constants.STEPS_PER_BAR, parseInt(newLengthInSteps) || Constants.defaultStepsPerBar);
        validatedNewLength = Math.ceil(validatedNewLength / Constants.STEPS_PER_BAR) * Constants.STEPS_PER_BAR;
        validatedNewLength = Math.min(validatedNewLength, Constants.MAX_BARS * Constants.STEPS_PER_BAR);

        if (oldActualLength === validatedNewLength && activeSeq.length === validatedNewLength) return;

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
            const newRow = Array(activeSeq.length).fill(null);
            for (let c = 0; c < Math.min(currentRow.length, activeSeq.length); c++) {
                newRow[c] = currentRow[c];
            }
            return newRow;
        });

        this.recreateToneSequence(true);
        if (this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        // console.log(`[Track ${this.id}] Set sequence "${activeSeq.name}" length to ${activeSeq.length} steps, ${numRows} rows.`); // MODIFICATION: Optional log
    }

    recreateToneSequence(forceRestart = false, startTimeOffset = 0) {
        // ... (method body largely unchanged, ensure it correctly uses playbackMode from appServices)
        if (this.type === 'Audio') return;
        const currentPlaybackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        // console.log(`[Track ${this.id} recreateToneSequence] For "${this.name}". ActiveSeqID: ${this.activeSequenceId}. Mode: ${currentPlaybackMode}`); // MODIFICATION: Optional log

        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            try {
                this.patternPlayerSequence.stop();
                this.patternPlayerSequence.clear();
                this.patternPlayerSequence.dispose();
            } catch(e) { console.warn(`[Track ${this.id}] Error disposing old Tone.Sequence:`, e.message); }
        }
        this.patternPlayerSequence = null;

        if (currentPlaybackMode !== 'sequencer') {
            // console.log(`[Track ${this.id} recreateToneSequence] Not in 'sequencer' mode. Sequence player not created.`); // MODIFICATION: Optional log
            return;
        }
        // ... rest of the method
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
        // console.log(`[Track ${this.id} recreateToneSequence] Creating Tone.Sequence for "${activeSeq.name}" (${sequenceLengthForTone} steps, ${sequenceDataForTone.length} rows).`); // MODIFICATION: Optional log

        try {
            this.patternPlayerSequence = new Tone.Sequence((time, col) => {
                const playbackModeCheck = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
                if (playbackModeCheck !== 'sequencer') {
                    if (this.patternPlayerSequence && this.patternPlayerSequence.state === 'started' && !this.patternPlayerSequence.disposed) this.patternPlayerSequence.stop();
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

                if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
                    let notePlayedThisStep = false;
                    for (let rowIndex = 0; rowIndex < Constants.synthPitches.length; rowIndex++) {
                        const pitchName = Constants.synthPitches[rowIndex];
                        const step = sequenceDataForTone[rowIndex]?.[col];
                        if (step?.active && !notePlayedThisStep) {
                            this.instrument.triggerAttackRelease(pitchName, "16n", time, step.velocity * Constants.defaultVelocity);
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
                            if (sliceData.loop) playDuration = Tone.Time("16n").toSeconds();

                            if (this.slicerIsPolyphonic) {
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

                                    player.chain(envelope, gain, effectsChainStartPoint);

                                    player.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                                    envelope.triggerAttack(time);
                                    if (!sliceData.loop) envelope.triggerRelease(time + playDuration * 0.95);

                                    const releaseDuration = sliceData.envelope?.release || 0.2;
                                    const totalSoundDuration = playDuration + releaseDuration + 0.3;
                                    Tone.Transport.scheduleOnce(() => {
                                        this._returnVoiceToSlicerPool(voiceUnit);
                                    }, time + totalSoundDuration);
                                }
                            } else if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                                if (this.slicerMonoPlayer.state === 'started') this.slicerMonoPlayer.stop(time);
                                this.slicerMonoEnvelope.triggerRelease(time);

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
                            const player = this.drumPadPlayers[padIndex];
                            try { player.disconnect(); player.connect(effectsChainStartPoint); } catch(e) { /* ignore */ }
                            player.volume.value = Tone.gainToDb(padData.volume * step.velocity * 0.7);

                            if (padData.autoStretchEnabled && padData.stretchOriginalBPM > 0 && padData.stretchBeats > 0 && player.buffer) {
                                const currentProjectTempo = Tone.Transport.bpm.value;
                                const sampleBufferDuration = player.buffer.duration;
                                const targetDurationAtCurrentTempo = (60 / currentProjectTempo) * padData.stretchBeats;
                                if (targetDurationAtCurrentTempo > 1e-6 && sampleBufferDuration > 1e-6) {
                                     player.playbackRate.value = sampleBufferDuration / targetDurationAtCurrentTempo; // Ensure .value for AudioParam
                                } else { player.playbackRate.value = 1; }
                            } else {
                                player.playbackRate.value = Math.pow(2, (padData.pitchShift || 0) / 12);
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
                                this.toneSampler.releaseAll(time);
                                notePlayedThisStep = true;
                            }
                            this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "16n", time, step.velocity * Constants.defaultVelocity);
                        }
                    });
                }
            }, Array.from(Array(sequenceLengthForTone).keys()), "16n");

            this.patternPlayerSequence.loop = true;
            // console.log(`[Track ${this.id} recreateToneSequence] Tone.Sequence for "${activeSeq.name}" prepared. Loop: true.`); // MODIFICATION: Optional log
        } catch (error) {
            console.error(`[Track ${this.id} recreateToneSequence] Error creating Tone.Sequence for "${activeSeq.name}":`, error);
            this.patternPlayerSequence = null;
        }

        if (this.appServices.updateTrackUI) {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
    }

    async addAudioClip(blob, startTime) {
        // ... (method body mostly unchanged)
        if (this.type !== 'Audio') {
            console.warn(`[Track ${this.id}] addAudioClip called on non-Audio track type: ${this.type}`);
            return;
        }
        const clipId = `audioclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
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
            // console.log(`[Track ${this.id}] Added audio clip to timeline:`, newClip); // MODIFICATION: Optional log
            this._captureUndoState(`Add Recorded Clip to ${this.name}`);

            // MODIFICATION START: Reschedule playback if necessary
            await this._reschedulePlaybackIfNeeded(startTime, "timeline");
            // MODIFICATION END
        } catch (error) {
            console.error(`[Track ${this.id} addAudioClip] Error:`, error);
            if (this.appServices.showNotification) this.appServices.showNotification("Failed to save recorded audio clip.", 3000);
        }
    }

    async addExternalAudioFileAsClip(audioFileBlob, startTime, clipName = null) {
        // ... (method body mostly unchanged)
        if (this.type !== 'Audio') {
            console.warn(`[Track ${this.id}] addExternalAudioFileAsClip called on non-Audio track type: ${this.type}`);
            if (this.appServices.showNotification) this.appServices.showNotification("Audio files can only be added to Audio Tracks.", 3000);
            return null;
        }
        const clipId = `audioclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
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
            // console.log(`[Track ${this.id}] Added external audio file as clip to timeline:`, newClip); // MODIFICATION: Optional log
            this._captureUndoState(`Add Audio File Clip "${newClip.name}" to ${this.name}`);

            // MODIFICATION START: Reschedule playback if necessary
            await this._reschedulePlaybackIfNeeded(startTime, "timeline");
            // MODIFICATION END
            return newClip;
        } catch (error) {
            console.error(`[Track ${this.id} addExternalAudioFileAsClip] Error:`, error);
            if (this.appServices.showNotification) this.appServices.showNotification("Failed to save and add audio file clip.", 3000);
            return null;
        }
    }

    addSequenceClipToTimeline(sourceSequenceId, startTime, clipName = null) {
        // ... (method body mostly unchanged)
        if (this.type === 'Audio') {
            console.warn(`[Track ${this.id}] addSequenceClipToTimeline called on Audio track.`);
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
            sourceSequenceId: sourceSequenceId,
            startTime: Math.max(0, startTime),
            duration: duration,
            name: clipName || sourceSequence.name || `Seq Clip ${this.timelineClips.filter(c => c.type === 'sequence').length + 1}`
        };

        this.timelineClips.push(newClip);
        // console.log(`[Track ${this.id}] Added sequence clip to timeline:`, newClip); // MODIFICATION: Optional log
        this._captureUndoState(`Add Sequence Clip "${newClip.name}" to ${this.name}`);

        // MODIFICATION START: Reschedule playback if necessary
        this._reschedulePlaybackIfNeeded(startTime, "timeline").catch(err => console.error("Error in _reschedulePlaybackIfNeeded after adding sequence clip:", err));
        // MODIFICATION END
        return newClip;
    }

    // MODIFICATION: Helper method to handle rescheduling
    async _reschedulePlaybackIfNeeded(clipStartTime, modeHint) {
        if (this.appServices.renderTimeline) this.appServices.renderTimeline();

        const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        if (typeof Tone !== 'undefined' && Tone.Transport.state === 'started' && playbackMode === modeHint) {
            console.log(`[Track ${this.id}] Rescheduling playback after clip/sequence action. Transport running in ${modeHint} mode.`);

            const currentTime = Tone.Transport.seconds;
            Tone.Transport.pause(); // Pause instead of full stop to maintain position more smoothly if possible
            await new Promise(resolve => setTimeout(resolve, 50)); // Short delay for events to clear

            Tone.Transport.cancel(0); // Clear all scheduled events

            const allTracks = this.appServices.getTracks ? this.appServices.getTracks() : [];
            try {
                await Promise.all(allTracks.map(async (t) => {
                    if (t && typeof t.stopPlayback === 'function') t.stopPlayback(); // Ensure old players are stopped
                    if (t && typeof t.schedulePlayback === 'function') {
                        const transportLoopEnd = Tone.Transport.loopEnd || (currentTime + 300);
                        await t.schedulePlayback(currentTime, transportLoopEnd); // Reschedule from current time
                    }
                }));
                Tone.Transport.start(Tone.now() + 0.05, currentTime); // Restart from the paused position
            } catch (err) {
                console.error("Error rescheduling tracks:", err);
                // Attempt to restart transport anyway, or provide error feedback
                if (this.appServices.showNotification) this.appServices.showNotification("Error updating playback after clip/sequence change.", 3000);
                Tone.Transport.start(Tone.now() + 0.05, currentTime); // Fallback start
            }
        } else if (this.appServices.renderTimeline) { // If not rescheduling, still ensure timeline UI is up to date
             this.appServices.renderTimeline();
        }
    }


    async getBlobDuration(blob) {
        // ... (method body unchanged)
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
        // ... (method body largely unchanged, ensure playbackMode check is robust)
        const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        // console.log(`[Track ${this.id} "${this.name}"] schedulePlayback. Mode: ${playbackMode}. Transport Range: ${transportStartTime.toFixed(2)}s to ${transportStopTime.toFixed(2)}s`); // MODIFICATION: Optional log

        this.stopPlayback();

        if (playbackMode === 'timeline') {
            // ... (timeline scheduling logic unchanged for now, but relies on robust player creation and disposal)
             for (const clip of this.timelineClips) {
                if (!clip || typeof clip.startTime !== 'number' || typeof clip.duration !== 'number') {
                    console.warn(`[Track ${this.id}] Skipping invalid clip:`, clip);
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
                    // console.log(`[Track ${this.id}] Timeline: Scheduling AUDIO clip "${clip.name}" (ID: ${clip.id}) at ${effectivePlayStart.toFixed(2)}s for ${playDurationInWindow.toFixed(2)}s (offset ${offsetIntoSource.toFixed(2)}s)`); // MODIFICATION: Optional log

                    const player = new Tone.Player();
                    this.clipPlayers.set(clip.id, player);

                    try {
                        const audioBlob = await getAudio(clip.sourceId);
                        if (audioBlob) {
                            const url = URL.createObjectURL(audioBlob);
                            player.onload = () => {
                                URL.revokeObjectURL(url);
                                const destNode = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
                                    ? this.activeEffects[0].toneNode
                                    : (this.gainNode && !this.gainNode.disposed ? this.gainNode : null);

                                if (destNode) player.connect(destNode); else player.toDestination();
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
                    // ... (sequence clip scheduling for timeline mode - unchanged for now) ...
                    const sourceSequence = this.sequences ? this.sequences.find(s => s.id === clip.sourceSequenceId) : null;
                    if (sourceSequence?.data?.length > 0 && sourceSequence.length > 0) {
                        // console.log(`[Track ${this.id}] Timeline: Scheduling SEQUENCE clip "${clip.name}" (Source: "${sourceSequence.name}") from ${effectivePlayStart.toFixed(2)}s for ${playDurationInWindow.toFixed(2)}s using Tone.Part`); // MODIFICATION: Optional log

                        const events = [];
                        const sixteenthTime = Tone.Time("16n").toSeconds();

                        for (let stepIdx = 0; stepIdx < sourceSequence.length; stepIdx++) {
                            const timeWithinSeq = stepIdx * sixteenthTime;
                            const absoluteStepTime = clipActualStart + timeWithinSeq;

                            if (absoluteStepTime >= effectivePlayStart && absoluteStepTime < effectivePlayEnd) {
                                const eventTimeInPart = absoluteStepTime - effectivePlayStart;

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
                                                 player.playbackRate.value = sampleBufferDuration / targetDurationAtCurrentTempo;
                                            } else { player.playbackRate.value = 1; }
                                        } else {
                                            player.playbackRate.value = Math.pow(2, (padData.pitchShift || 0) / 12);
                                        }
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
                // console.log(`[Track ${this.id} schedulePlayback] Sequencer mode: patternPlayerSequence is invalid, calling recreateToneSequence.`); // MODIFICATION: Optional log
                this.recreateToneSequence(true, transportStartTime);
            }
            if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
                if (this.patternPlayerSequence.state === 'started') {
                    try {this.patternPlayerSequence.stop(Tone.Transport.now());} catch(e){console.warn("Err stopping seq player during schedule", e)}
                }
                // console.log(`[Track ${this.id}] Sequencer mode: Starting patternPlayerSequence at transport offset: ${transportStartTime.toFixed(2)}s. Loop: ${this.patternPlayerSequence.loop}`); // MODIFICATION: Optional log
                try {
                    this.patternPlayerSequence.start(transportStartTime);
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
        // ... (method body unchanged, ensure robust disposal of players/parts)
        const clipPlayersSize = this.clipPlayers ? this.clipPlayers.size : 0;
        // console.log(`[Track ${this.id} "${this.name}"] stopPlayback called. Timeline clip players/parts: ${clipPlayersSize}`); // MODIFICATION: Optional log

        if (this.clipPlayers && this.clipPlayers.size > 0) {
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
        }

        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            try {
                this.patternPlayerSequence.stop();
                this.patternPlayerSequence.clear();
                this.patternPlayerSequence.dispose();
                // console.log(`[Track ${this.id}] Stopped, cleared, and disposed patternPlayerSequence.`); // MODIFICATION: Optional log
            }
            catch (e) { console.warn(`[Track ${this.id}] Error stopping/disposing patternPlayerSequence:`, e.message); }
        }
        this.patternPlayerSequence = null;
    }

    async updateAudioClipPosition(clipId, newStartTime) {
        // ... (method body mostly unchanged)
        const clip = this.timelineClips.find(c => c.id === clipId);
        if (clip) {
            const oldStartTime = clip.startTime;
            clip.startTime = Math.max(0, parseFloat(newStartTime) || 0);
            // console.log(`[Track ${this.id}] Updated ${clip.type} clip ${clipId} startTime from ${oldStartTime.toFixed(2)} to ${clip.startTime.toFixed(2)}`); // MODIFICATION: Optional log
            this._captureUndoState(`Move Clip "${clip.name || clip.id.slice(-4)}" on ${this.name}`);

            // MODIFICATION: Use the helper for rescheduling
            await this._reschedulePlaybackIfNeeded(Tone.Transport.seconds, "timeline");

        } else {
            console.warn(`[Track ${this.id}] Could not find clip ${clipId} to update its position.`);
        }
    }

    dispose() {
        // ... (method body unchanged, ensure all Tone.js objects created by the track are disposed)
        const trackNameForLog = this.name || `Track ${this.id}`;
        console.log(`[Track Dispose START ${this.id}] Starting disposal for track: "${trackNameForLog}"`);

        try { this.stopPlayback(); } catch (e) { console.warn(`[Track Dispose ${this.id}] Error in stopPlayback during dispose:`, e.message); }

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
        this.output = null; // Clear reference

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

        // console.log(`[Track Dispose END ${this.id}] Finished disposal for track: "${trackNameForLog}"`); // MODIFICATION: Optional log
    }
}
