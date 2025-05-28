// js/Track.js - Track Class Module

import { STEPS_PER_BAR, defaultStepsPerBar, synthPitches, numSlices, numDrumSamplerPads, samplerMIDINoteStart, defaultVelocity } from './constants.js';
import { createEffectInstance, getEffectDefaultParams, AVAILABLE_EFFECTS } from './effectsRegistry.js';

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
        } else {
            this.synthEngineType = null;
            this.synthParams = {};
        }

        this.samplerAudioData = {
            fileName: initialData?.samplerAudioData?.fileName || null,
            audioDbKey: initialData?.samplerAudioData?.audioDbKey || null,
            status: initialData?.samplerAudioData?.status || (initialData?.samplerAudioData?.audioDbKey ? 'pending' : 'empty') // 'pending', 'loaded', 'missing', 'empty'
        };
        this.originalFileName = initialData?.samplerAudioData?.fileName || null;
        this.audioBuffer = null;

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

        this.instrumentSamplerSettings = {
            audioDbKey: initialData?.instrumentSamplerSettings?.audioDbKey || null,
            originalFileName: initialData?.instrumentSamplerSettings?.originalFileName || null,
            audioBuffer: null,
            status: initialData?.instrumentSamplerSettings?.status || (initialData?.instrumentSamplerSettings?.audioDbKey ? 'pending' : 'empty'), // 'pending', 'loaded', 'missing', 'empty'
            rootNote: initialData?.instrumentSamplerSettings?.rootNote || 'C4',
            loop: initialData?.instrumentSamplerSettings?.loop || false,
            loopStart: initialData?.instrumentSamplerSettings?.loopStart || 0,
            loopEnd: initialData?.instrumentSamplerSettings?.loopEnd || 0,
            envelope: initialData?.instrumentSamplerSettings?.envelope || { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 },
        };
        this.instrumentSamplerIsPolyphonic = initialData?.instrumentSamplerIsPolyphonic !== undefined ? initialData.instrumentSamplerIsPolyphonic : true;
        this.toneSampler = null;

        this.drumSamplerPads = initialData?.drumSamplerPads || Array(numDrumSamplerPads).fill(null).map(() => ({
            audioDbKey: null,
            originalFileName: null,
            audioBuffer: null,
            status: 'empty', // 'pending', 'loaded', 'missing', 'empty'
            volume: 0.7, pitchShift: 0,
            envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 }
        }));
        if (initialData?.drumSamplerPads) {
            initialData.drumSamplerPads.forEach((padData, index) => {
                if (this.drumSamplerPads[index]) {
                    this.drumSamplerPads[index].audioDbKey = padData.audioDbKey || null;
                    this.drumSamplerPads[index].originalFileName = padData.originalFileName || null;
                    this.drumSamplerPads[index].status = padData.status || (padData.audioDbKey ? 'pending' : 'empty');
                    this.drumSamplerPads[index].volume = padData.volume ?? 0.7;
                    this.drumSamplerPads[index].pitchShift = padData.pitchShift ?? 0;
                    this.drumSamplerPads[index].envelope = padData.envelope ? JSON.parse(JSON.stringify(padData.envelope)) : { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 };
                }
            });
        }
        this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
        this.drumPadPlayers = Array(numDrumSamplerPads).fill(null);

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

        this.gainNode = null;
        this.trackMeter = null;
        this.outputNode = null;

        this.instrument = null;
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
        this.sequence = null;
        this.inspectorWindow = null; this.effectsRackWindow = null; this.sequencerWindow = null;
        this.waveformCanvasCtx = null; this.instrumentWaveformCanvasCtx = null;
        this.automation = initialData?.automation || { volume: [] };
        this.inspectorControls = {};
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
        console.log(`[Track ${this.id}] Initializing core audio nodes (Gain, Meter)...`);
        if (this.gainNode && !this.gainNode.disposed) { try { this.gainNode.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old gainNode:`, e.message)} }
        if (this.trackMeter && !this.trackMeter.disposed) { try { this.trackMeter.dispose(); } catch(e) {console.warn(`[Track ${this.id}] Error disposing old trackMeter:`, e.message)} }

        this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
        this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        this.outputNode = this.gainNode;

        this.rebuildEffectChain();
    }

    rebuildEffectChain() {
        // ... (no changes to the core logic of this method) ...
        // The status property doesn't directly affect chain rebuilding,
        // but playback within the sequence callback will depend on it.
        console.log(`[Track ${this.id}] Rebuilding effect chain. Active effects: ${this.activeEffects.length}`);
        const mainSourceNode = this.instrument || this.toneSampler || this.slicerMonoPlayer;

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

        if (mainSourceNode && !mainSourceNode.disposed) {
            currentAudioPathEnd = mainSourceNode;
        }

        this.activeEffects.forEach(effectWrapper => {
            if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
                if (currentAudioPathEnd) {
                    try {
                        currentAudioPathEnd.connect(effectWrapper.toneNode);
                    } catch (e) { console.error(`[Track ${this.id}] Error connecting ${currentAudioPathEnd.constructor.name} to ${effectWrapper.type}:`, e); }
                } else if (this.type !== 'DrumSampler') { // For non-drum tracks, effect can be the start if no instrument
                    currentAudioPathEnd = effectWrapper.toneNode;
                }
                if (currentAudioPathEnd === mainSourceNode || this.type !== 'DrumSampler') { // Avoid setting currentAudioPathEnd if it was just a connection for drum sampler
                    currentAudioPathEnd = effectWrapper.toneNode;
                }
            }
        });

        if (this.gainNode && !this.gainNode.disposed) {
            if (currentAudioPathEnd) {
                try {
                    currentAudioPathEnd.connect(this.gainNode);
                } catch (e) { console.error(`[Track ${this.id}] Error connecting ${currentAudioPathEnd.constructor.name} to GainNode:`, e); }
            } else if (this.type !== 'DrumSampler' && !mainSourceNode) {
                 // For non-drum tracks with no source/effects, gainNode is effectively the start
            }
            this.outputNode = this.gainNode;
        } else {
            this.outputNode = currentAudioPathEnd;
        }

        if (this.type === 'DrumSampler') {
            const firstNodeInChainForDrums = this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed
                ? this.activeEffects[0].toneNode
                : (this.gainNode && !this.gainNode.disposed ? this.gainNode : null);

            this.drumPadPlayers.forEach((player, idx) => {
                if (player && !player.disposed) {
                    if (firstNodeInChainForDrums) {
                        try {
                            player.connect(firstNodeInChainForDrums);
                        } catch (e) { console.error(`[Track ${this.id}] Error connecting drum player ${idx} to chain start:`, e); }
                    } else {
                        console.warn(`[Track ${this.id}] No valid first node in chain for drum player ${idx} connection.`);
                    }
                }
            });
        }

        if (this.gainNode && !this.gainNode.disposed && this.trackMeter && !this.trackMeter.disposed) {
            try {
                this.gainNode.connect(this.trackMeter);
                const finalDestination = (window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed)
                                         ? window.masterEffectsBusInput
                                         : Tone.getDestination();
                this.gainNode.connect(finalDestination);
            } catch (e) {
                 console.error(`[Track ${this.id}] Error connecting GainNode final outputs: `, e);
            }
        } else {
            console.warn(`[Track ${this.id}] GainNode or TrackMeter is null/disposed. Final output connections might be incomplete.`);
            if (this.outputNode && !this.outputNode.disposed && this.outputNode !== this.gainNode) {
                const fallbackDest = (window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed)
                                     ? window.masterEffectsBusInput
                                     : Tone.getDestination();
                try {
                    this.outputNode.connect(fallbackDest);
                } catch(e) { console.error(`[Track ${this.id}] Error connecting fallback output node:`, e.message); }
            }
        }
    }


    addEffect(effectType) {
        // ... (no changes)
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
                params: JSON.parse(JSON.stringify(defaultParams))
            });
            this.rebuildEffectChain();
            return effectId;
        }
        console.warn(`[Track ${this.id}] Failed to create effect instance for ${effectType}`);
        return null;
    }

    removeEffect(effectId) {
        // ... (no changes)
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

    updateEffectParam(effectId, paramPath, value) {
        // ... (no changes)
        const effectWrapper = this.activeEffects.find(e => e.id === effectId);
        if (!effectWrapper || !effectWrapper.toneNode || effectWrapper.toneNode.disposed) {
            console.warn(`[Track ${this.id}] Effect node not found or disposed for ID: ${effectId} while trying to update ${paramPath}.`);
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
                    console.error(`[Track ${this.id}] Nested property "${keys.slice(0, i + 1).join('.')}" not found on Tone node for effect ${effectWrapper.type}. Cannot set parameter.`);
                    return;
                }
            }

            const finalParamKey = keys[keys.length - 1];
            const paramInstance = targetObject[finalParamKey];

            if (typeof paramInstance !== 'undefined') {
                if (paramInstance && typeof paramInstance.value !== 'undefined') {
                    if (typeof paramInstance.rampTo === 'function') {
                        paramInstance.rampTo(value, 0.02);
                    } else {
                        paramInstance.value = value;
                    }
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
                console.warn(`[Track ${this.id}] Cannot set param "${paramPath}" on ${effectWrapper.type}. Property or .set() method not available. Target object:`, targetObject, "Final Key:", finalParamKey);
            }
        } catch (err) {
            console.error(`[Track ${this.id}] Error updating param ${paramPath} for ${effectWrapper.type}:`, err, "Value:", value, "Effect Node:", effectWrapper.toneNode);
        }
    }


    reorderEffect(effectId, newIndex) {
        // ... (no changes)
        const oldIndex = this.activeEffects.findIndex(e => e.id === effectId);
        if (oldIndex === -1) {
            console.warn(`[Track ${this.id}] Effect ID ${effectId} not found for reordering.`);
            return;
        }
        const clampedNewIndex = Math.max(0, Math.min(newIndex, this.activeEffects.length -1 ));


        if (oldIndex === clampedNewIndex ) {
            return;
        }

        if (typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Reorder effect on ${this.name}`);
        }
        const [effectToMove] = this.activeEffects.splice(oldIndex, 1);
        this.activeEffects.splice(clampedNewIndex, 0, effectToMove);

        this.rebuildEffectChain();
    }

    async fullyInitializeAudioResources() {
        console.log(`[Track ${this.id}] fullyInitializeAudioResources called for type: ${this.type}`);
        // This method now assumes audioBuffer/pad.audioBuffer has been populated by state.js (reconstructDAW)
        // if loading from a project, or by audio.js if loading a new file.
        // Its main role is to set up the Tone.js players/samplers *using* these pre-loaded buffers.
        try {
            if (this.type === 'Synth') {
                await this.initializeInstrument();
            } else if (this.type === 'Sampler') {
                if (this.audioBuffer?.loaded) { // Check if buffer is actually loaded
                    this.samplerAudioData.status = 'loaded';
                    if (!this.slicerIsPolyphonic) {
                        this.setupSlicerMonoNodes();
                        if (this.slicerMonoPlayer) this.slicerMonoPlayer.buffer = this.audioBuffer; // Ensure buffer is set
                    }
                } else if (this.samplerAudioData.audioDbKey && this.samplerAudioData.status !== 'missing') { // If there's a key but no buffer
                    this.samplerAudioData.status = 'pending'; // Or 'missing' if getAudio failed previously
                    console.warn(`[Track ${this.id}] Sampler audioBuffer not loaded for key ${this.samplerAudioData.audioDbKey}. Status: ${this.samplerAudioData.status}`);
                }
            } else if (this.type === 'DrumSampler') {
                for (let i = 0; i < this.drumSamplerPads.length; i++) {
                    const pad = this.drumSamplerPads[i];
                    if (pad.audioBuffer && pad.audioBuffer.loaded) {
                        pad.status = 'loaded';
                        if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) {
                            this.drumPadPlayers[i].dispose();
                        }
                        this.drumPadPlayers[i] = new Tone.Player(pad.audioBuffer);
                    } else if (pad.audioDbKey && pad.status !== 'missing') {
                        pad.status = 'pending';
                         console.warn(`[Track ${this.id}] Drum pad ${i} audioBuffer not loaded for key ${pad.audioDbKey}. Status: ${pad.status}`);
                    }
                }
            } else if (this.type === 'InstrumentSampler') {
                if (this.instrumentSamplerSettings.audioBuffer?.loaded) {
                    this.instrumentSamplerSettings.status = 'loaded';
                    this.setupToneSampler();
                } else if (this.instrumentSamplerSettings.audioDbKey && this.instrumentSamplerSettings.status !== 'missing') {
                     this.instrumentSamplerSettings.status = 'pending';
                     console.warn(`[Track ${this.id}] InstrumentSampler audioBuffer not loaded for key ${this.instrumentSamplerSettings.audioDbKey}. Status: ${this.instrumentSamplerSettings.status}`);
                }
            }
            this.rebuildEffectChain();
            this.setSequenceLength(this.sequenceLength, true); // Re-initialize sequence
            console.log(`[Track ${this.id}] fullyInitializeAudioResources completed.`);
        } catch (error) {
            console.error(`[Track ${this.id}] Error in fullyInitializeAudioResources:`, error);
        }
    }

    async initializeInstrument() {
        // ... (no changes)
        console.log(`[Track ${this.id} - initializeInstrument] Initializing ${this.synthEngineType} instrument...`);
        if (this.instrument && typeof this.instrument.dispose === 'function' && !this.instrument.disposed) {
            this.instrument.dispose();
        }
        if (!this.synthParams || Object.keys(this.synthParams).length === 0) {
            this.synthParams = this.getDefaultSynthParams();
        }
        try {
            const paramsForSynth = {
                portamento: this.synthParams.portamento,
                oscillator: this.synthParams.oscillator,
                envelope: this.synthParams.envelope,
                filter: this.synthParams.filter,
                filterEnvelope: this.synthParams.filterEnvelope
            };
            this.instrument = new Tone.MonoSynth(paramsForSynth);
        } catch (error) {
            console.error(`[Track ${this.id} - initializeInstrument] Error creating MonoSynth instrument:`, error);
            this.instrument = new Tone.Synth();
        }
    }

    setupSlicerMonoNodes() {
        // ... (no changes)
        if (!this.slicerIsPolyphonic) {
            this.disposeSlicerMonoNodes();
            this.slicerMonoPlayer = new Tone.Player();
            this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
            this.slicerMonoGain = new Tone.Gain();
            console.log(`[Track ${this.id}] Slicer mono nodes set up.`);
        }
    }
    disposeSlicerMonoNodes() {
        // ... (no changes)
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) this.slicerMonoPlayer.dispose();
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) this.slicerMonoEnvelope.dispose();
        if (this.slicerMonoGain && !this.slicerMonoGain.disposed) this.slicerMonoGain.dispose();
        this.slicerMonoPlayer = null; this.slicerMonoEnvelope = null; this.slicerMonoGain = null;
    }

    setupToneSampler() {
        // ... (no changes)
        if (this.toneSampler && !this.toneSampler.disposed) {
            this.toneSampler.dispose();
        }
        if (this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
            const urls = {};
            urls[this.instrumentSamplerSettings.rootNote] = this.instrumentSamplerSettings.audioBuffer;
            const samplerOptions = {
                urls: urls,
                attack: this.instrumentSamplerSettings.envelope.attack,
                release: this.instrumentSamplerSettings.envelope.release,
                baseUrl: "", // Important for local buffer usage
                onload: () => console.log(`[Track ${this.id}] Tone.Sampler loaded for InstrumentSampler.`),
                onerror: (e) => console.error(`[Track ${this.id}] Error loading Tone.Sampler:`, e)
            };
            this.toneSampler = new Tone.Sampler(samplerOptions);
        } else {
            console.warn(`[Track ${this.id}] InstrumentSampler audioBuffer not loaded (status: ${this.instrumentSamplerSettings.status}), cannot setup Tone.Sampler.`);
        }
    }

    setVolume(volume, fromInteraction = false) { /* ... (no changes) ... */ }
    applyMuteState() { /* ... (no changes) ... */ }
    applySoloState() { /* ... (no changes) ... */ }
    setSynthParam(paramPath, value) { /* ... (no changes) ... */ }
    setSliceVolume(sliceIndex, volume) { /* ... (no changes) ... */ }
    setSlicePitchShift(sliceIndex, semitones) { /* ... (no changes) ... */ }
    setSliceLoop(sliceIndex, loop) { /* ... (no changes) ... */ }
    setSliceReverse(sliceIndex, reverse) { /* ... (no changes) ... */ }
    setSliceEnvelopeParam(sliceIndex, param, value) { /* ... (no changes) ... */ }
    setDrumSamplerPadVolume(padIndex, volume) { /* ... (no changes) ... */ }
    setDrumSamplerPadPitch(padIndex, pitch) { /* ... (no changes) ... */ }
    setDrumSamplerPadEnv(padIndex, param, value) { /* ... (no changes) ... */ }
    setInstrumentSamplerRootNote(noteName) { /* ... (no changes, ensure rebuildEffectChain is called) ... */ }
    setInstrumentSamplerLoop(loop) { /* ... (no changes, ensure rebuildEffectChain is called if sampler needs re-setup) ... */ }
    setInstrumentSamplerLoopStart(time) { /* ... (no changes) ... */ }
    setInstrumentSamplerLoopEnd(time) { /* ... (no changes) ... */ }
    setInstrumentSamplerEnv(param, value) { /* ... (no changes) ... */ }
    async doubleSequence() { /* ... (no changes) ... */ }

    setSequenceLength(newLengthInSteps, skipUndoCapture = false) {
        // ... (Sequence data resizing logic remains the same) ...

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
                // Check audioFileStatus before attempting to play
                if (this.samplerAudioData.status !== 'loaded' || !this.audioBuffer || !this.audioBuffer.loaded) {
                    // Optionally log a warning here if trying to play a missing/pending sample in sequence
                    return;
                }
                this.slices.forEach((sliceData, sliceIndex) => { /* ... (rest of sampler playback logic) ... */ });
            } else if (this.type === 'DrumSampler') {
                Array.from({ length: numDrumSamplerPads }).forEach((_, padIndex) => {
                    const step = this.sequenceData[padIndex]?.[col];
                    const padData = this.drumSamplerPads[padIndex];
                    // Check pad status and player loaded state
                    if (step?.active && padData && padData.status === 'loaded' && this.drumPadPlayers[padIndex]?.loaded) {
                        const player = this.drumPadPlayers[padIndex];
                        player.volume.value = Tone.gainToDb(padData.volume * step.velocity);
                        player.playbackRate = Math.pow(2, (padData.pitchShift || 0) / 12);
                        player.start(time);
                    }
                });
            } else if (this.type === 'InstrumentSampler') {
                // Check audioFileStatus
                if (this.instrumentSamplerSettings.status !== 'loaded' || !this.toneSampler?.loaded) {
                    return;
                }
                synthPitches.forEach((pitchName, rowIndex) => { /* ... (rest of instrument sampler playback) ... */ });
            }
        }, Array.from(Array(this.sequenceLength).keys()), "16n").start(0);
        // ... (rest of the function: refresh sequencer window if open)
    }

    dispose() {
        // ... (Existing dispose logic for sequence, instruments, effects, nodes, windows) ...
        // Note: The decision to delete audio from IndexedDB upon track disposal is
        // handled in the user's main application logic or state management,
        // possibly by calling `deleteAudio(this.samplerAudioData.audioDbKey)` etc.
        // This dispose method focuses on Tone.js objects and direct track properties.

        console.log(`[Track ${this.id}] Disposing track ${this.name} (${this.type})`);
        try { if (this.sequence && !this.sequence.disposed) { this.sequence.stop(); this.sequence.clear(); this.sequence.dispose(); } } catch(e){ console.warn("Error disposing sequence", e.message); }
        try { if (this.instrument && !this.instrument.disposed) { this.instrument.dispose(); } } catch(e){ console.warn("Error disposing instrument", e.message); }

        try { if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose(); } catch(e){ console.warn("Error disposing sampler audioBuffer", e.message); }
        // Example: Consider DB cleanup logic elsewhere or via a dedicated manager
        // if (this.samplerAudioData?.audioDbKey && typeof deleteAudio === 'function') {
        //     deleteAudio(this.samplerAudioData.audioDbKey).catch(e => console.warn(`Error deleting sampler audio from DB (key: ${this.samplerAudioData.audioDbKey})`, e));
        // }

        this.disposeSlicerMonoNodes();
        try { if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.dispose(); } catch(e){ console.warn("Error disposing toneSampler", e.message); }
        try { if (this.instrumentSamplerSettings?.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose(); } catch(e){ console.warn("Error disposing instrumentSamplerSettings.audioBuffer", e.message); }
        // if (this.instrumentSamplerSettings?.audioDbKey && typeof deleteAudio === 'function') {
        //    deleteAudio(this.instrumentSamplerSettings.audioDbKey).catch(e => console.warn(`Error deleting inst sampler audio from DB (key: ${this.instrumentSamplerSettings.audioDbKey})`, e));
        // }

        this.drumSamplerPads.forEach((pad, index) => {
            if (pad.audioBuffer && !pad.audioBuffer.disposed) try {pad.audioBuffer.dispose();} catch(e){}
            // if (pad.audioDbKey && typeof deleteAudio === 'function') {
            //     deleteAudio(pad.audioDbKey).catch(e => console.warn(`Error deleting drum pad ${index} audio from DB (key: ${pad.audioDbKey})`, e));
            // }
        });
        this.drumPadPlayers.forEach(player => { if (player && !player.disposed) try {player.dispose();} catch(e){} });

        this.activeEffects.forEach(effect => { if (effect.toneNode && !effect.toneNode.disposed) try {effect.toneNode.dispose();} catch(e){} });
        this.activeEffects = [];

        try { if (this.gainNode && !this.gainNode.disposed) this.gainNode.dispose(); } catch(e){ console.warn("Error disposing gainNode", e.message); }
        try { if (this.trackMeter && !this.trackMeter.disposed) this.trackMeter.dispose(); } catch(e){ console.warn("Error disposing trackMeter", e.message); }

        if (this.inspectorWindow?.close) try {this.inspectorWindow.close(true);} catch(e){} // Pass true to skip undo during mass dispose
        if (this.effectsRackWindow?.close) try {this.effectsRackWindow.close(true);} catch(e){}
        if (this.sequencerWindow?.close) try {this.sequencerWindow.close(true);} catch(e){}

        Object.keys(this).forEach(key => {
            if (key !== 'id' && key !== 'name' && key !== 'type') {
                this[key] = null;
            }
        });
        console.log(`[Track ${this.id}] Finished disposing track.`);
    }
}
