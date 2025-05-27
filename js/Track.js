// js/Track.js - Track Class Module

import { STEPS_PER_BAR, defaultStepsPerBar, synthPitches, numSlices, numDrumSamplerPads, samplerMIDINoteStart, defaultVelocity } from './constants.js';
import { createEffectInstance, getEffectDefaultParams } from './effectsRegistry.js'; // NEW: Central place for effect info

export class Track {
    constructor(id, type, initialData = null) {
        this.id = initialData?.id || id;
        this.type = type;

        // ... (existing name, mute, solo, volume logic) ...
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

        // ... (sampler, drum sampler, instrument sampler properties remain largely the same) ...
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

        // --- NEW: Modular Effects ---
        this.activeEffects = []; // Stores { id: string, type: string, toneNode: Tone.Effect, params: {} }
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
        // --- END NEW ---

        // Audio nodes that are always present per track (Gain, Meter)
        // Effect nodes are now dynamic.
        this.gainNode = null;
        this.trackMeter = null;
        this.outputNode = null; // Represents the last node in the track's chain before connecting to master

        this.instrument = null; // For Synths
        this.sequenceLength = initialData?.sequenceLength || defaultStepsPerBar;
        // ... (sequenceData, sequence, window references, automation, etc. as before) ...
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
        return { /* ... as before ... */
            portamento: 0.01,
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 1 },
            filter: { type: 'lowpass', rolloff: -12, Q: 1 },
            filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 2, baseFrequency: 200, octaves: 7, exponent: 2 }
        };
    }

    async initializeAudioNodes() {
        console.log(`[Track ${this.id}] Initializing core audio nodes (Gain, Meter)...`);
        this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
        this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        this.outputNode = this.gainNode; // Initially, gain node is the output

        this.rebuildEffectChain(); // Connects effects and then to master

        // Connect meter
        this.gainNode.connect(this.trackMeter);
        // The trackMeter will connect to Tone.getDestination() if no master bus,
        // OR to a special meter bus if master bus exists. For now, let's assume master bus handles overall metering.
        // Or, it could just be for this track's visual, not affecting main audio path beyond its tap.
        // For simplicity now, let's not connect trackMeter to destination here, assuming master bus will exist.
        // If there's no master bus yet, this track's output (this.outputNode) connects to destination.
        // This part will be refined when master bus is implemented in audio.js
        // This will be `this.outputNode.connect(window.masterEffectsBusInput);`
    }

    rebuildEffectChain() {
        console.log(`[Track ${this.id}] Rebuilding effect chain.`);
        // Disconnect existing chain from instrument/player output onwards
        // This is complex as the "source" node varies (synth, sampler player, drum pad players)

        // For Synths, InstrumentSampler (Tone.Sampler), Slicer (Mono Player)
        const mainSourceNode = this.instrument || this.toneSampler || this.slicerMonoPlayer;
        if (mainSourceNode && !mainSourceNode.disposed) {
            mainSourceNode.disconnect();
        }

        // For DrumSampler, each drumPadPlayer connects to the start of the effect chain.
        // We need to disconnect all of them and reconnect them to the new chain head.
        if (this.type === 'DrumSampler') {
            this.drumPadPlayers.forEach(player => {
                if (player && !player.disposed) player.disconnect();
            });
        }

        // Dispose previous effect nodes in the chain IF they are not part of activeEffects
        // For simplicity, activeEffects manages its own nodes' lifecycle (add/remove).
        // Here, we just rebuild connections.

        let chain = [];
        this.activeEffects.forEach(effect => {
            if (effect.toneNode && !effect.toneNode.disposed) {
                chain.push(effect.toneNode);
            }
        });
        chain.push(this.gainNode); // Gain node is always last in the track's controllable chain

        this.outputNode = this.gainNode; // Default output is gainNode if no effects

        if (chain.length > 1) { // More than just the gainNode
            if (mainSourceNode && !mainSourceNode.disposed) {
                mainSourceNode.chain(...chain, window.masterEffectsBusInput || Tone.getDestination());
            } else if (this.type === 'DrumSampler') {
                const firstEffectInChain = chain[0];
                this.drumPadPlayers.forEach(player => {
                    if (player && !player.disposed) {
                        player.chain(...chain, window.masterEffectsBusInput || Tone.getDestination());
                    }
                });
            } else if (this.type === 'Sampler' && this.slicerIsPolyphonic) {
                // Polyphonic sampler players are temporary, created on demand.
                // They will need to connect to chain[0] or masterEffectsBusInput if chain is empty (excluding gainNode).
                // This logic is handled in playSlicePreview / sequence playback.
            }
            this.outputNode = chain[chain.length - 1]; // The last node in this setup is the gainNode
        } else if (mainSourceNode && !mainSourceNode.disposed) { // Only gainNode in chain array
            mainSourceNode.connect(this.gainNode);
            this.gainNode.connect(window.masterEffectsBusInput || Tone.getDestination());
        } else if (this.type === 'DrumSampler') { // Only gainNode
             this.drumPadPlayers.forEach(player => {
                if (player && !player.disposed) {
                    player.connect(this.gainNode);
                }
            });
            this.gainNode.connect(window.masterEffectsBusInput || Tone.getDestination());
        }


        // Ensure GainNode always connects to the master bus (or destination if no master bus yet)
        // And connect the meter from the gainNode
        if (this.gainNode) {
            this.gainNode.disconnect(this.trackMeter); // Disconnect old meter connection if any
            this.gainNode.connect(this.trackMeter); // Meter taps from gainNode output

            // The actual output of the track (after all effects and gain) goes to the master bus
            if (window.masterEffectsBusInput) {
                 if(this.outputNode !== window.masterEffectsBusInput) this.outputNode.connect(window.masterEffectsBusInput);
            } else {
                 if(this.outputNode !== Tone.getDestination()) this.outputNode.connect(Tone.getDestination());
            }
        }
        console.log(`[Track ${this.id}] Effect chain rebuilt. Outputting to: ${window.masterEffectsBusInput ? 'Master Bus' : 'Tone Destination'}`);
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

    updateEffectParam(effectId, paramName, value) {
        const effect = this.activeEffects.find(e => e.id === effectId);
        if (effect && effect.toneNode) {
            effect.params[paramName] = value;
            try {
                // Tone.js parameters can be direct properties or Tone.Signal/Tone.Param objects with a .value
                let targetParam = effect.toneNode[paramName];
                if (targetParam && typeof targetParam.value !== 'undefined') { // It's a Tone.Param or Signal-like object
                    if (typeof targetParam.rampTo === 'function') {
                        targetParam.rampTo(value, 0.05);
                    } else {
                        targetParam.value = value;
                    }
                } else if (typeof effect.toneNode[paramName] !== 'undefined') { // Direct property
                    effect.toneNode[paramName] = value;
                } else { // Try with .set() for nested or complex params
                    const Hparam = {};
                    Hparam[paramName] = value;
                    effect.toneNode.set(Hparam);
                }
            } catch (err) {
                console.error(`[Track ${this.id}] Error updating param ${paramName} for ${effect.type}:`, err);
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
                    this.setupSlicerMonoNodes(); // Connects to the start of the effect chain internally
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
                        // Drum pad players connect to the start of the track's effect chain
                        // This connection is handled/updated in rebuildEffectChain
                    }
                }
            } else if (this.type === 'InstrumentSampler') {
                if (this.instrumentSamplerSettings.audioBufferDataURL && (!this.instrumentSamplerSettings.audioBuffer || !this.instrumentSamplerSettings.audioBuffer.loaded)) {
                    this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(this.instrumentSamplerSettings.audioBufferDataURL);
                }
                this.setupToneSampler(); // Connects to the start of the effect chain internally
            }
            this.rebuildEffectChain(); // Ensure chain is correct after resources are loaded
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
            // Connection to effect chain is handled by rebuildEffectChain
        } catch (error) {
            console.error(`[Track ${this.id}] Error creating MonoSynth instrument:`, error);
            this.instrument = new Tone.Synth(); // Fallback
        }
        this.rebuildEffectChain();
    }

    setupSlicerMonoNodes() {
        if (!this.slicerIsPolyphonic) {
            this.disposeSlicerMonoNodes();
            this.slicerMonoPlayer = new Tone.Player();
            this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
            this.slicerMonoGain = new Tone.Gain(); // This gain is part of the mono player setup, not the main track gain.
            
            // The slicerMonoPlayer itself will be the "source" for the effect chain.
            // Its chain (env, gain) is internal to its playback logic.
            // rebuildEffectChain will handle connecting slicerMonoPlayer to the effects.
            console.log(`[Track ${this.id}] Slicer mono nodes set up.`);
            this.rebuildEffectChain();
        }
    }
    // ... (disposeSlicerMonoNodes remains similar)
    disposeSlicerMonoNodes() {
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) this.slicerMonoPlayer.dispose();
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) this.slicerMonoEnvelope.dispose();
        if (this.slicerMonoGain && !this.slicerMonoGain.disposed) this.slicerMonoGain.dispose();
        this.slicerMonoPlayer = null; this.slicerMonoEnvelope = null; this.slicerMonoGain = null;
    }


    setupToneSampler() { // For InstrumentSampler type
        if (this.toneSampler && !this.toneSampler.disposed) {
            this.toneSampler.dispose();
        }
        if (this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
            const urls = {};
            urls[this.instrumentSamplerSettings.rootNote] = this.instrumentSamplerSettings.audioBuffer;
            const samplerOptions = { /* ... as before ... */
                urls: urls,
                attack: this.instrumentSamplerSettings.envelope.attack,
                release: this.instrumentSamplerSettings.envelope.release,
                onload: () => console.log(`[Track ${this.id}] Tone.Sampler loaded for InstrumentSampler.`),
                onerror: (e) => console.error(`[Track ${this.id}] Error loading Tone.Sampler for InstrumentSampler:`, e)
            };
            this.toneSampler = new Tone.Sampler(samplerOptions);
            // Connection handled by rebuildEffectChain
        } else {
            console.warn(`[Track ${this.id}] InstrumentSampler audioBuffer not loaded, cannot setup Tone.Sampler.`);
        }
        this.rebuildEffectChain();
    }

    // ... (setVolume, applyMuteState, applySoloState remain similar, ensure they use this.gainNode)
    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = Math.max(0, Math.min(1, parseFloat(volume) || 0));
        if (this.gainNode && !this.isMuted) {
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
        }
    }

    applyMuteState() {
        if (!this.gainNode) { console.warn(`[Track ${this.id}] applyMuteState: gainNode is null.`); return; }
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
        if (!this.gainNode) { console.warn(`[Track ${this.id}] applySoloState: gainNode is null.`); return; }
        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
        if (this.isMuted) {
            this.gainNode.gain.rampTo(0, 0.01);
            return;
        }
        if (currentGlobalSoloId) {
            if (this.id === currentGlobalSoloId) {
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
            } else {
                this.gainNode.gain.rampTo(0, 0.01);
            }
        } else {
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
        }
    }

    // Synth param setters, slice setters, drum pad setters, instrument sampler setters remain similar
    // ... setSynthParam, setSliceVolume, etc. ...

    // Sequence playback logic in setSequenceLength needs to be aware of the new effect chain.
    // For polyphonic sampler playback, temporary players must connect to the *start* of this track's effect chain.
    setSequenceLength(newLengthInSteps, skipUndoCapture = false) {
        // ... (length adjustment and sequenceData resizing as before) ...
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
        const newGridDataArray = Array(numRows).fill(null).map((_, rIndex) => {
            const currentRow = currentSequenceData[rIndex] || [];
            const newRow = Array(this.sequenceLength).fill(null);
            for (let c = 0; c < Math.min(currentRow.length, this.sequenceLength); c++) {
                newRow[c] = currentRow[c];
            }
            return newRow;
        });
        this.sequenceData = newGridDataArray;

        if (this.sequence && !this.sequence.disposed) {
            this.sequence.stop(); this.sequence.clear(); this.sequence.dispose(); this.sequence = null;
        }

        this.sequence = new Tone.Sequence((time, col) => {
            const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
            const isSoloedOut = currentGlobalSoloId && currentGlobalSoloId !== this.id;
            if (this.sequencerWindow && !this.sequencerWindow.isMinimized && typeof window.highlightPlayingStep === 'function') {
                window.highlightPlayingStep(col, this.type, this.sequencerWindow.element?.querySelector('.sequencer-grid'));
            }
            if (!this.gainNode || this.isMuted || isSoloedOut) return;

            // Determine the first node in the effect chain (or gainNode if no effects)
            const firstEffectNode = this.activeEffects.length > 0 ? this.activeEffects[0].toneNode : this.gainNode;

            if (this.type === 'Synth' && this.instrument) { /* ... as before, instrument already connected ... */
                 synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step && step.active && this.instrument && typeof this.instrument.triggerAttackRelease === 'function') {
                        this.instrument.triggerAttackRelease(pitchName, "8n", time, step.velocity);
                    }
                });
            } else if (this.type === 'Sampler') {
                this.slices.forEach((sliceData, sliceIndex) => {
                    const step = this.sequenceData[sliceIndex]?.[col];
                    if (step?.active && sliceData?.duration > 0 && this.audioBuffer?.loaded) {
                        const totalPitchShift = sliceData.pitchShift;
                        const playbackRate = Math.pow(2, totalPitchShift / 12);
                        let playDuration = sliceData.duration / playbackRate;
                        if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds();

                        if (this.slicerIsPolyphonic) { // Create temp player and connect to start of THIS TRACK'S effect chain
                            const tempPlayer = new Tone.Player(this.audioBuffer);
                            const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                            const tempGain = new Tone.Gain(step.velocity * sliceData.volume);
                            
                            // Connect to the first actual effect, or the track's gain node if no effects
                            const destinationForTempPlayer = firstEffectNode || (window.masterEffectsBusInput || Tone.getDestination());
                            tempPlayer.chain(tempEnv, tempGain, destinationForTempPlayer);
                            // ... rest of tempPlayer setup and start/stop ...
                            tempPlayer.playbackRate = playbackRate;
                            tempPlayer.reverse = sliceData.reverse;
                            tempPlayer.loop = sliceData.loop;
                            tempPlayer.loopStart = sliceData.offset;
                            tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
                            tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            tempEnv.triggerAttack(time);
                            if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95);
                            Tone.Transport.scheduleOnce(() => {
                                if (tempPlayer && !tempPlayer.disposed) { tempPlayer.stop(); tempPlayer.dispose(); }
                                if (tempEnv && !tempEnv.disposed) tempEnv.dispose();
                                if (tempGain && !tempGain.disposed) tempGain.dispose();
                            }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);

                        } else { // Monophonic slicer playback (slicerMonoPlayer is already connected in the chain)
                            if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && this.slicerMonoGain) {
                                if (this.slicerMonoPlayer.state === 'started') this.slicerMonoPlayer.stop(time);
                                if (this.slicerMonoEnvelope.getValueAtTime(time) > 0.001) this.slicerMonoEnvelope.triggerRelease(time);
                                this.slicerMonoPlayer.buffer = this.audioBuffer;
                                this.slicerMonoEnvelope.set(sliceData.envelope);
                                this.slicerMonoGain.gain.value = step.velocity * sliceData.volume;
                                // ... rest of mono player setup ...
                                this.slicerMonoPlayer.playbackRate = playbackRate;
                                this.slicerMonoPlayer.reverse = sliceData.reverse;
                                this.slicerMonoPlayer.loop = sliceData.loop;
                                this.slicerMonoPlayer.loopStart = sliceData.offset;
                                this.slicerMonoPlayer.loopEnd = sliceData.offset + sliceData.duration;
                                this.slicerMonoPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                                this.slicerMonoEnvelope.triggerAttack(time);
                                if (!sliceData.loop) {
                                    const releaseTime = time + playDuration - (sliceData.envelope.release || 0.1);
                                    this.slicerMonoEnvelope.triggerRelease(Math.max(time, releaseTime));
                                }
                            }
                        }
                    }
                });
            } else if (this.type === 'DrumSampler') { /* ... as before, players already connected ... */
                Array.from({ length: numDrumSamplerPads }).forEach((_, padIndex) => {
                    const step = this.sequenceData[padIndex]?.[col];
                    const padData = this.drumSamplerPads[padIndex];
                    if (step?.active && padData && this.drumPadPlayers[padIndex] && this.drumPadPlayers[padIndex].loaded) {
                        const player = this.drumPadPlayers[padIndex];
                        player.volume.value = Tone.gainToDb(padData.volume * step.velocity);
                        player.playbackRate = Math.pow(2, (padData.pitchShift) / 12);
                        player.start(time);
                    }
                });
            } else if (this.type === 'InstrumentSampler' && this.toneSampler && this.toneSampler.loaded) { /* ... as before, sampler already connected ... */
                synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active && this.toneSampler && this.toneSampler.loaded) {
                        this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "8n", time, step.velocity);
                    }
                });
            }
        }, Array.from(Array(this.sequenceLength).keys()), "16n").start(0);

        if (this.sequencerWindow && !this.sequencerWindow.isMinimized && window.openWindows[`sequencerWin-${this.id}`]) {
             if (typeof window.openTrackSequencerWindow === 'function') {
                window.openTrackSequencerWindow(this.id, true);
             }
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

        // --- NEW: Dispose active effects ---
        this.activeEffects.forEach(effect => {
            if (effect.toneNode && !effect.toneNode.disposed) {
                effect.toneNode.dispose();
            }
        });
        this.activeEffects = [];
        // --- END NEW ---

        if (this.gainNode && !this.gainNode.disposed) this.gainNode.dispose();
        if (this.trackMeter && !this.trackMeter.disposed) this.trackMeter.dispose();

        if (this.inspectorWindow && typeof this.inspectorWindow.close === 'function') this.inspectorWindow.close();
        if (this.effectsRackWindow && typeof this.effectsRackWindow.close === 'function') this.effectsRackWindow.close();
        if (this.sequencerWindow && typeof this.sequencerWindow.close === 'function') this.sequencerWindow.close();

        this.sequence = null; this.instrument = null; this.audioBuffer = null;
        this.toneSampler = null; this.drumSamplerPads = []; this.drumPadPlayers = [];
        this.gainNode = null; this.trackMeter = null; this.outputNode = null;
        this.inspectorWindow = null; this.effectsRackWindow = null; this.sequencerWindow = null;
        console.log(`[Track ${this.id}] Finished disposing track ${this.name}`);
    }
}
