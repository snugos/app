// js/Track.js - Track Class Module

import { STEPS_PER_BAR, defaultStepsPerBar, synthPitches, numSlices, numDrumSamplerPads, samplerMIDINoteStart, defaultVelocity } from './constants.js';
import { createEffectInstance, getEffectDefaultParams } from './effectsRegistry.js';

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

        this.originalFileName = initialData?.samplerAudioData?.fileName || null;
        this.audioBuffer = null;
        this.audioBufferDataURL = initialData?.samplerAudioData?.audioBufferDataURL || null;
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
            sampleUrl: null,
            audioBuffer: null,
            audioBufferDataURL: initialData?.instrumentSamplerSettings?.audioBufferDataURL || null,
            originalFileName: initialData?.instrumentSamplerSettings?.originalFileName || null,
            rootNote: initialData?.instrumentSamplerSettings?.rootNote || 'C4',
            loop: initialData?.instrumentSamplerSettings?.loop || false,
            loopStart: initialData?.instrumentSamplerSettings?.loopStart || 0,
            loopEnd: initialData?.instrumentSamplerSettings?.loopEnd || 0,
            envelope: initialData?.instrumentSamplerSettings?.envelope || { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 },
        };
        this.instrumentSamplerIsPolyphonic = initialData?.instrumentSamplerIsPolyphonic !== undefined ? initialData.instrumentSamplerIsPolyphonic : true;
        this.toneSampler = null;

        this.drumSamplerPads = initialData?.drumSamplerPads || Array(numDrumSamplerPads).fill(null).map(() => ({
            sampleUrl: null, audioBuffer: null, audioBufferDataURL: null, originalFileName: null,
            volume: 0.7, pitchShift: 0,
            envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 }
        }));
        if (initialData?.drumSamplerPads) {
            initialData.drumSamplerPads.forEach((padData, index) => {
                if (this.drumSamplerPads[index]) {
                    this.drumSamplerPads[index].audioBufferDataURL = padData.audioBufferDataURL || null;
                    this.drumSamplerPads[index].originalFileName = padData.originalFileName || null;
                    this.drumSamplerPads[index].volume = padData.volume ?? 0.7;
                    this.drumSamplerPads[index].pitchShift = padData.pitchShift ?? 0;
                    this.drumSamplerPads[index].envelope = padData.envelope ? JSON.parse(JSON.stringify(padData.envelope)) : { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 };
                }
            });
        }
        this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
        this.drumPadPlayers = Array(numDrumSamplerPads).fill(null);

        this.activeEffects = [];
        if (initialData && initialData.activeEffects) {
            initialData.activeEffects.forEach(effectData => {
                const toneNode = createEffectInstance(effectData.type, effectData.params);
                if (toneNode) {
                    this.activeEffects.push({
                        id: effectData.id || `effect-${Date.now()}-${Math.random()}`,
                        type: effectData.type,
                        toneNode: toneNode,
                        params: { ...effectData.params }
                    });
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
        if (this.gainNode && !this.gainNode.disposed) this.gainNode.dispose();
        if (this.trackMeter && !this.trackMeter.disposed) this.trackMeter.dispose();

        this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
        this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        // this.outputNode will be set by rebuildEffectChain

        this.rebuildEffectChain();
    }

    rebuildEffectChain() {
        console.log(`[Track ${this.id}] Rebuilding effect chain.`);

        const sourceNode = this.instrument || this.toneSampler || this.slicerMonoPlayer;

        // 1. Disconnect the main source (synth, main sampler player)
        if (sourceNode && !sourceNode.disposed) {
            try { sourceNode.disconnect(); } catch(e) { console.warn(`[Track ${this.id}] Minor error disconnecting sourceNode:`, e); }
        }
        // Disconnect drum pad players
        if (this.type === 'DrumSampler') {
            this.drumPadPlayers.forEach(player => {
                if (player && !player.disposed) {
                    try { player.disconnect(); } catch(e) { console.warn(`[Track ${this.id}] Minor error disconnecting drum player:`, e); }
                }
            });
        }

        // 2. Disconnect internal chain effects from gainNode and gainNode from its previous outputs
        if (this.activeEffects.length > 0) {
            const lastEffect = this.activeEffects[this.activeEffects.length - 1].toneNode;
            if (lastEffect && !lastEffect.disposed && this.gainNode && !this.gainNode.disposed) {
                try { lastEffect.disconnect(this.gainNode); } catch(e) { console.warn(`[Track ${this.id}] Minor error disconnecting last effect from gainNode:`, e); }
            }
        }
        if (this.gainNode && !this.gainNode.disposed) {
            try { this.gainNode.disconnect(); } catch(e) { console.warn(`[Track ${this.id}] Minor error disconnecting gainNode:`, e); }
        }

        // 3. Construct the new chain: Source -> Effects -> GainNode
        let currentConnectableOutput = sourceNode;

        if (this.type === 'DrumSampler') {
            currentConnectableOutput = null; // For drums, players connect individually
        }

        const effectNodesInOrder = this.activeEffects
            .map(e => e.toneNode)
            .filter(n => n && !n.disposed);

        // The full chain for a single source, or the effects part for multi-source (drums)
        const chainToGainNode = [...effectNodesInOrder];
        if (this.gainNode && !this.gainNode.disposed) {
            chainToGainNode.push(this.gainNode);
        } else {
            console.error(`[Track ${this.id}] GainNode is invalid. Cannot complete chain.`);
            // Potentially connect to Tone.getDestination() directly if gainNode is missing and effects exist
            if (effectNodesInOrder.length > 0) {
                 if(currentConnectableOutput) currentConnectableOutput.chain(...effectNodesInOrder, window.masterEffectsBusInput || Tone.getDestination());
                 this.outputNode = effectNodesInOrder[effectNodesInOrder.length -1];
            } else if (currentConnectableOutput) {
                 currentConnectableOutput.connect(window.masterEffectsBusInput || Tone.getDestination());
                 this.outputNode = currentConnectableOutput;
            }
            return; // Cannot proceed with gainNode-dependent connections
        }


        if (currentConnectableOutput) { // For Synth, Slicer (mono), InstrumentSampler
            if (chainToGainNode.length > 0) {
                 try { currentConnectableOutput.chain(...chainToGainNode); } catch(e) { console.error(`[Track ${this.id}] Error chaining single source: `, e); }
            }
        } else if (this.type === 'DrumSampler') {
            this.drumPadPlayers.forEach(player => {
                if (player && !player.disposed) {
                    if (chainToGainNode.length > 0) {
                         try { player.chain(...chainToGainNode); } catch(e) { console.error(`[Track ${this.id}] Error chaining drum player: `, e); }
                    }
                }
            });
        }
        // At this point, all sources are chained through effects (if any) and end at this.gainNode.

        // 4. Connect GainNode outputs
        if (this.gainNode && !this.gainNode.disposed && this.trackMeter && !this.trackMeter.disposed) {
            try {
                this.gainNode.connect(this.trackMeter);

                const finalDestination = window.masterEffectsBusInput || Tone.getDestination();
                this.gainNode.connect(finalDestination);
                this.outputNode = this.gainNode;
                console.log(`[Track ${this.id}] GainNode connected to Meter and ${finalDestination === window.masterEffectsBusInput ? 'Master Bus Input' : 'Tone Destination'}.`);
            } catch (e) {
                 console.error(`[Track ${this.id}] Error connecting GainNode outputs: `, e);
                 this.outputNode = null; // Or some other fallback
            }
        } else {
            console.warn(`[Track ${this.id}] GainNode or TrackMeter is null/disposed in rebuildEffectChain. Output connections skipped.`);
            this.outputNode = effectNodesInOrder.length > 0 ? effectNodesInOrder[effectNodesInOrder.length -1] : (sourceNode || null);
            if (this.outputNode && (window.masterEffectsBusInput || Tone.getDestination())) { // Try to connect last known node if gain fails
                try { this.outputNode.connect(window.masterEffectsBusInput || Tone.getDestination()); }
                catch(e) { console.error("Error connecting fallback output node:", e); }
            }
        }
        console.log(`[Track ${this.id}] Effect chain rebuilt.`);
    }


    addEffect(effectType) {
        if (typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Add ${effectType} to ${this.name}`);
        }
        const defaultParams = getEffectDefaultParams(effectType);
        const toneNode = createEffectInstance(effectType, defaultParams);

        if (toneNode) {
            const effectId = `effect_${this.id}_${effectType}_${Date.now()}`;
            this.activeEffects.push({
                id: effectId,
                type: effectType,
                toneNode: toneNode,
                params: { ...defaultParams }
            });
            this.rebuildEffectChain();
            return effectId;
        }
        return null;
    }

    removeEffect(effectId) {
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
        const effect = this.activeEffects.find(e => e.id === effectId);
        if (effect && effect.toneNode) {
            // Update stored params, handling nesting
            const keys = paramPath.split('.');
            let currentStoredParamLevel = effect.params;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!currentStoredParamLevel[keys[i]]) currentStoredParamLevel[keys[i]] = {};
                currentStoredParamLevel = currentStoredParamLevel[keys[i]];
            }
            currentStoredParamLevel[keys[keys.length - 1]] = value;

            // Update Tone.js node
            try {
                let targetNodeProperty = effect.toneNode;
                for (let i = 0; i < keys.length - 1; i++) {
                    targetNodeProperty = targetNodeProperty[keys[i]];
                    if (!targetNodeProperty) throw new Error(`Nested property ${keys.slice(0,i+1).join('.')} not found on Tone node.`);
                }
                const finalKey = keys[keys.length - 1];

                if (targetNodeProperty && typeof targetNodeProperty[finalKey] !== 'undefined') {
                    if (targetNodeProperty[finalKey] && typeof targetNodeProperty[finalKey].value !== 'undefined' && typeof targetNodeProperty[finalKey].rampTo === 'function') {
                        targetNodeProperty[finalKey].rampTo(value, 0.05);
                    } else if (targetNodeProperty[finalKey] && typeof targetNodeProperty[finalKey].value !== 'undefined') {
                        targetNodeProperty[finalKey].value = value;
                    } else {
                        targetNodeProperty[finalKey] = value;
                    }
                } else if (typeof effect.toneNode.set === 'function') { // Fallback to .set() for complex/nested objects
                    const updateObj = {};
                    let currentLevelForSet = updateObj;
                    for(let i=0; i < keys.length -1; i++){
                        currentLevelForSet[keys[i]] = {};
                        currentLevelForSet = currentLevelForSet[keys[i]];
                    }
                    currentLevelForSet[keys[keys.length -1]] = value;
                    effect.toneNode.set(updateObj);
                } else {
                     console.warn(`[Track ${this.id}] Could not set param ${paramPath} on ${effect.type} node directly or via .set().`);
                }
            } catch (err) {
                console.error(`[Track ${this.id}] Error updating param ${paramPath} for ${effect.type}:`, err);
            }
        }
    }


    reorderEffect(effectId, newIndex) {
        const oldIndex = this.activeEffects.findIndex(e => e.id === effectId);
        if (oldIndex === -1 || oldIndex === newIndex || newIndex < 0 || newIndex >= this.activeEffects.length) {
            return;
        }
        if (typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Reorder effect on ${this.name}`);
        }
        const [effectToMove] = this.activeEffects.splice(oldIndex, 1);
        this.activeEffects.splice(newIndex, 0, effectToMove);
        this.rebuildEffectChain();
    }

    async fullyInitializeAudioResources() {
        console.log(`[Track ${this.id}] fullyInitializeAudioResources called for type: ${this.type}`);
        try {
            if (this.type === 'Synth') {
                await this.initializeInstrument();
            } else if (this.type === 'Sampler') {
                if (this.audioBufferDataURL && (!this.audioBuffer || !this.audioBuffer.loaded)) {
                    this.audioBuffer = await new Tone.Buffer().load(this.audioBufferDataURL);
                }
                if (!this.slicerIsPolyphonic && this.audioBuffer?.loaded) {
                    this.setupSlicerMonoNodes();
                }
            } else if (this.type === 'DrumSampler') {
                for (let i = 0; i < this.drumSamplerPads.length; i++) {
                    const pad = this.drumSamplerPads[i];
                    if (pad.audioBufferDataURL && (!pad.audioBuffer || !pad.audioBuffer.loaded)) {
                        pad.audioBuffer = await new Tone.Buffer().load(pad.audioBufferDataURL);
                    }
                    if (pad.audioBuffer && pad.audioBuffer.loaded) {
                        if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) {
                            this.drumPadPlayers[i].dispose();
                        }
                        this.drumPadPlayers[i] = new Tone.Player(pad.audioBuffer);
                    }
                }
            } else if (this.type === 'InstrumentSampler') {
                if (this.instrumentSamplerSettings.audioBufferDataURL && (!this.instrumentSamplerSettings.audioBuffer || !this.instrumentSamplerSettings.audioBuffer.loaded)) {
                    this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(this.instrumentSamplerSettings.audioBufferDataURL);
                }
                this.setupToneSampler();
            }
            this.rebuildEffectChain(); // Crucial: Rebuild chain after all resources are potentially set up
            this.setSequenceLength(this.sequenceLength, true);
            console.log(`[Track ${this.id}] fullyInitializeAudioResources completed.`);
        } catch (error) {
            console.error(`[Track ${this.id}] Error in fullyInitializeAudioResources:`, error);
        }
    }

    async initializeInstrument() { // For MonoSynth
        console.log(`[Track ${this.id}] Initializing MonoSynth instrument...`);
        if (this.instrument && typeof this.instrument.dispose === 'function' && !this.instrument.disposed) {
            this.instrument.dispose();
        }
        if (!this.synthParams || Object.keys(this.synthParams).length === 0) {
            this.synthParams = this.getDefaultSynthParams();
        }
        try {
            this.instrument = new Tone.MonoSynth(this.synthParams);
        } catch (error) {
            console.error(`[Track ${this.id}] Error creating MonoSynth instrument:`, error);
            this.instrument = new Tone.Synth();
        }
        // Connection to effect chain is handled by rebuildEffectChain, which is called after this in fullyInitializeAudioResources
        // or directly if this is called standalone (though it shouldn't be currently)
        // For safety, if called standalone, ensure chain is rebuilt:
        // this.rebuildEffectChain(); // Commented out as fullyInitializeAudioResources handles it
    }

    setupSlicerMonoNodes() {
        if (!this.slicerIsPolyphonic) {
            this.disposeSlicerMonoNodes();
            this.slicerMonoPlayer = new Tone.Player();
            this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
            this.slicerMonoGain = new Tone.Gain();
            // Rebuild chain will connect slicerMonoPlayer to effects
            console.log(`[Track ${this.id}] Slicer mono nodes set up.`);
            // this.rebuildEffectChain(); // Called by fullyInitializeAudioResources
        }
    }
    disposeSlicerMonoNodes() {
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) this.slicerMonoPlayer.dispose();
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) this.slicerMonoEnvelope.dispose();
        if (this.slicerMonoGain && !this.slicerMonoGain.disposed) this.slicerMonoGain.dispose();
        this.slicerMonoPlayer = null; this.slicerMonoEnvelope = null; this.slicerMonoGain = null;
    }

    setupToneSampler() {
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
                onload: () => console.log(`[Track ${this.id}] Tone.Sampler loaded for InstrumentSampler.`),
                onerror: (e) => console.error(`[Track ${this.id}] Error loading Tone.Sampler:`, e)
            };
            this.toneSampler = new Tone.Sampler(samplerOptions);
        } else {
            console.warn(`[Track ${this.id}] InstrumentSampler audioBuffer not loaded, cannot setup Tone.Sampler.`);
        }
        // this.rebuildEffectChain(); // Called by fullyInitializeAudioResources
    }

    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = Math.max(0, Math.min(1, parseFloat(volume) || 0));
        if (this.gainNode && !this.gainNode.disposed && !this.isMuted) {
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
        }
    }

    applyMuteState() {
        if (!this.gainNode || this.gainNode.disposed) { console.warn(`[Track ${this.id}] applyMuteState: gainNode is null/disposed.`); return; }
        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
        if (this.isMuted) {
            this.gainNode.gain.rampTo(0, 0.01);
        } else {
            if (currentGlobalSoloId && currentGlobalSoloId !== this.id) {
                this.gainNode.gain.rampTo(0, 0.01);
            } else {
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
            }
        }
    }

    applySoloState() {
        if (!this.gainNode || this.gainNode.disposed) { console.warn(`[Track ${this.id}] applySoloState: gainNode is null/disposed.`); return; }
        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
        if (this.isMuted) { this.gainNode.gain.rampTo(0, 0.01); return; }
        if (currentGlobalSoloId) {
            this.gainNode.gain.rampTo(this.id === currentGlobalSoloId ? this.previousVolumeBeforeMute : 0, 0.01);
        } else {
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
        }
    }

    setSynthParam(paramPath, value) {
        if (this.type !== 'Synth' || !this.instrument || this.instrument.disposed) { return; }
        if (!this.synthParams) this.synthParams = this.getDefaultSynthParams();
        const keys = paramPath.split('.');
        let currentParamLevel = this.synthParams;
        for (let i = 0; i < keys.length - 1; i++) {
            if (!currentParamLevel[keys[i]]) currentParamLevel[keys[i]] = {};
            currentParamLevel = currentParamLevel[keys[i]];
        }
        currentParamLevel[keys[keys.length - 1]] = value;
        try { this.instrument.set({ [paramPath]: value }); }
        catch (e) { console.error(`Error setting synth param ${paramPath}:`, e); }
    }

    setSliceVolume(sliceIndex, volume) { if (this.slices[sliceIndex]) this.slices[sliceIndex].volume = parseFloat(volume); }
    setSlicePitchShift(sliceIndex, semitones) { if (this.slices[sliceIndex]) this.slices[sliceIndex].pitchShift = parseInt(semitones); }
    setSliceLoop(sliceIndex, loop) { if (this.slices[sliceIndex]) this.slices[sliceIndex].loop = !!loop; }
    setSliceReverse(sliceIndex, reverse) { if (this.slices[sliceIndex]) this.slices[sliceIndex].reverse = !!reverse; }
    setSliceEnvelopeParam(sliceIndex, param, value) { if (this.slices[sliceIndex]?.envelope) this.slices[sliceIndex].envelope[param] = parseFloat(value); }
    setDrumSamplerPadVolume(padIndex, volume) { if (this.drumSamplerPads[padIndex]) this.drumSamplerPads[padIndex].volume = parseFloat(volume); }
    setDrumSamplerPadPitch(padIndex, pitch) { if (this.drumSamplerPads[padIndex]) this.drumSamplerPads[padIndex].pitchShift = parseInt(pitch); }
    setDrumSamplerPadEnv(padIndex, param, value) { if (this.drumSamplerPads[padIndex]?.envelope) this.drumSamplerPads[padIndex].envelope[param] = parseFloat(value); }
    setInstrumentSamplerRootNote(noteName) { if (Tone.Frequency(noteName).toMidi() > 0) { this.instrumentSamplerSettings.rootNote = noteName; this.setupToneSampler(); this.rebuildEffectChain(); }}
    setInstrumentSamplerLoop(loop) { this.instrumentSamplerSettings.loop = !!loop; this.setupToneSampler(); this.rebuildEffectChain(); }
    setInstrumentSamplerLoopStart(time) { this.instrumentSamplerSettings.loopStart = Math.max(0, parseFloat(time)); this.setupToneSampler(); this.rebuildEffectChain(); }
    setInstrumentSamplerLoopEnd(time) { this.instrumentSamplerSettings.loopEnd = Math.max(this.instrumentSamplerSettings.loopStart, parseFloat(time)); this.setupToneSampler(); this.rebuildEffectChain(); }
    setInstrumentSamplerEnv(param, value) { if (this.instrumentSamplerSettings.envelope) { this.instrumentSamplerSettings.envelope[param] = parseFloat(value); if (this.toneSampler && !this.toneSampler.disposed) { if (param === 'attack' && this.toneSampler.attack !== undefined) this.toneSampler.attack = parseFloat(value); if (param === 'release' && this.toneSampler.release !== undefined) this.toneSampler.release = parseFloat(value); } } }


    setSequenceLength(newLengthInSteps, skipUndoCapture = false) {
        const oldActualLength = this.sequenceLength;
        newLengthInSteps = Math.max(STEPS_PER_BAR, parseInt(newLengthInSteps) || defaultStepsPerBar);
        newLengthInSteps = Math.ceil(newLengthInSteps / STEPS_PER_BAR) * STEPS_PER_BAR;
        if (!skipUndoCapture && oldActualLength !== newLengthInSteps && typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Set Seq Length for ${this.name} to ${newLengthInSteps / STEPS_PER_BAR} bars`);
        }
        this.sequenceLength = newLengthInSteps;
        let numRows;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRows = synthPitches.length;
        else if (this.type === 'Sampler') numRows = this.slices.length > 0 ? this.slices.length : numSlices;
        else if (this.type === 'DrumSampler') numRows = numDrumSamplerPads;
        else numRows = (this.sequenceData && this.sequenceData.length > 0) ? this.sequenceData.length : 0;
        const currentSequenceData = this.sequenceData || [];
        this.sequenceData = Array(numRows).fill(null).map((_, rIndex) => {
            const currentRow = currentSequenceData[rIndex] || [];
            const newRow = Array(this.sequenceLength).fill(null);
            for (let c = 0; c < Math.min(currentRow.length, this.sequenceLength); c++) newRow[c] = currentRow[c];
            return newRow;
        });
        if (this.sequence && !this.sequence.disposed) { this.sequence.stop(); this.sequence.clear(); this.sequence.dispose(); this.sequence = null; }

        this.sequence = new Tone.Sequence((time, col) => {
            const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
            const isSoloedOut = currentGlobalSoloId && currentGlobalSoloId !== this.id;
            if (this.sequencerWindow && !this.sequencerWindow.isMinimized && typeof window.highlightPlayingStep === 'function') {
                window.highlightPlayingStep(col, this.type, this.sequencerWindow.element?.querySelector('.sequencer-grid'));
            }
            if (!this.gainNode || this.gainNode.disposed || this.isMuted || isSoloedOut) return;

            const firstNodeInOutChain = this.activeEffects.length > 0 ? this.activeEffects[0].toneNode : this.gainNode;

            if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
                 synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active) this.instrument.triggerAttackRelease(pitchName, "8n", time, step.velocity);
                });
            } else if (this.type === 'Sampler') {
                this.slices.forEach((sliceData, sliceIndex) => {
                    const step = this.sequenceData[sliceIndex]?.[col];
                    if (step?.active && sliceData?.duration > 0 && this.audioBuffer?.loaded) {
                        const playbackRate = Math.pow(2, (sliceData.pitchShift || 0) / 12);
                        let playDuration = sliceData.duration / playbackRate;
                        if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds();
                        if (this.slicerIsPolyphonic) {
                            const tempPlayer = new Tone.Player(this.audioBuffer);
                            const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                            const tempGain = new Tone.Gain(step.velocity * sliceData.volume);
                            const dest = firstNodeInOutChain || (window.masterEffectsBusInput || Tone.getDestination());
                            tempPlayer.chain(tempEnv, tempGain, dest);
                            tempPlayer.playbackRate = playbackRate; tempPlayer.reverse = sliceData.reverse; tempPlayer.loop = sliceData.loop;
                            tempPlayer.loopStart = sliceData.offset; tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
                            tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            tempEnv.triggerAttack(time);
                            if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95);
                            Tone.Transport.scheduleOnce(() => { if(!tempPlayer.disposed) tempPlayer.dispose(); if(!tempEnv.disposed) tempEnv.dispose(); if(!tempGain.disposed) tempGain.dispose(); }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);
                        } else if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) {
                            if (this.slicerMonoPlayer.state === 'started') this.slicerMonoPlayer.stop(time);
                            if (this.slicerMonoEnvelope.getValueAtTime(time) > 0.001) this.slicerMonoEnvelope.triggerRelease(time);
                            this.slicerMonoPlayer.buffer = this.audioBuffer; this.slicerMonoEnvelope.set(sliceData.envelope);
                            this.slicerMonoGain.gain.value = step.velocity * sliceData.volume;
                            this.slicerMonoPlayer.playbackRate = playbackRate; this.slicerMonoPlayer.reverse = sliceData.reverse; this.slicerMonoPlayer.loop = sliceData.loop;
                            this.slicerMonoPlayer.loopStart = sliceData.offset; this.slicerMonoPlayer.loopEnd = sliceData.offset + sliceData.duration;
                            this.slicerMonoPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            this.slicerMonoEnvelope.triggerAttack(time);
                            if (!sliceData.loop) this.slicerMonoEnvelope.triggerRelease(Math.max(time, time + playDuration - (sliceData.envelope.release || 0.1)));
                        }
                    }
                });
            } else if (this.type === 'DrumSampler') {
                Array.from({ length: numDrumSamplerPads }).forEach((_, padIndex) => {
                    const step = this.sequenceData[padIndex]?.[col];
                    const padData = this.drumSamplerPads[padIndex];
                    if (step?.active && padData && this.drumPadPlayers[padIndex]?.loaded) {
                        const player = this.drumPadPlayers[padIndex];
                        player.volume.value = Tone.gainToDb(padData.volume * step.velocity);
                        player.playbackRate = Math.pow(2, (padData.pitchShift || 0) / 12);
                        player.start(time);
                    }
                });
            } else if (this.type === 'InstrumentSampler' && this.toneSampler?.loaded) {
                synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active) this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "8n", time, step.velocity);
                });
            }
        }, Array.from(Array(this.sequenceLength).keys()), "16n").start(0);
        if (this.sequencerWindow && !this.sequencerWindow.isMinimized && window.openWindows[`sequencerWin-${this.id}`] && typeof window.openTrackSequencerWindow === 'function') {
             window.openTrackSequencerWindow(this.id, true);
        }
    }

    dispose() {
        console.log(`[Track ${this.id}] Disposing track ${this.name} (${this.type})`);
        if (this.sequence && !this.sequence.disposed) { this.sequence.stop(); this.sequence.clear(); this.sequence.dispose(); }
        if (this.instrument && !this.instrument.disposed) this.instrument.dispose();
        if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose();
        this.disposeSlicerMonoNodes();
        if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.dispose();
        if (this.instrumentSamplerSettings.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose();
        this.drumSamplerPads.forEach(pad => { if (pad.audioBuffer && !pad.audioBuffer.disposed) pad.audioBuffer.dispose(); });
        this.drumPadPlayers.forEach(player => { if (player && !player.disposed) player.dispose(); });
        this.activeEffects.forEach(effect => { if (effect.toneNode && !effect.toneNode.disposed) effect.toneNode.dispose(); });
        this.activeEffects = [];
        if (this.gainNode && !this.gainNode.disposed) this.gainNode.dispose();
        if (this.trackMeter && !this.trackMeter.disposed) this.trackMeter.dispose();
        if (this.inspectorWindow?.close) this.inspectorWindow.close();
        if (this.effectsRackWindow?.close) this.effectsRackWindow.close();
        if (this.sequencerWindow?.close) this.sequencerWindow.close();
        // Nullify references
        Object.keys(this).forEach(key => { if (key !== 'id' && key !== 'name' /* keep some identifiers for logging if needed */ ) this[key] = null; });
        console.log(`[Track ${this.id}] Finished disposing track.`);
    }
}
