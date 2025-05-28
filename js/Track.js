// js/Track.js - Track Class Module

import { STEPS_PER_BAR, defaultStepsPerBar, synthPitches, numSlices, numDrumSamplerPads, samplerMIDINoteStart, defaultVelocity } from './constants.js';
import { createEffectInstance, getEffectDefaultParams, AVAILABLE_EFFECTS } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js'; 

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

        this.samplerAudioData = initialData?.samplerAudioData || {
            fileName: null, audioBufferDataURL: null, dbKey: null, status: 'empty'
        };
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

        this.instrumentSamplerSettings = initialData?.instrumentSamplerSettings || {
            sampleUrl: null, audioBuffer: null, audioBufferDataURL: null, originalFileName: null, dbKey: null,
            rootNote: 'C4', loop: false, loopStart: 0, loopEnd: 0,
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 }, status: 'empty'
        };
        this.instrumentSamplerIsPolyphonic = initialData?.instrumentSamplerIsPolyphonic !== undefined ? initialData.instrumentSamplerIsPolyphonic : true;
        this.toneSampler = null;

        this.drumSamplerPads = initialData?.drumSamplerPads || Array(numDrumSamplerPads).fill(null).map(() => ({
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
        this.drumPadPlayers = Array(numDrumSamplerPads).fill(null);

        this.activeEffects = [];
        if (initialData && initialData.activeEffects && Array.isArray(initialData.activeEffects)) {
            initialData.activeEffects.forEach(effectData => {
                const paramsForInstance = effectData.params ? JSON.parse(JSON.stringify(effectData.params)) : {};
                const toneNode = createEffectInstance(effectData.type, paramsForInstance);
                if (toneNode) {
                    this.activeEffects.push({
                        id: effectData.id || `effect-${this.id}-${effectData.type}-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
                        type: effectData.type, toneNode: toneNode, params: paramsForInstance
                    });
                }
            });
        }

        this.gainNode = null; this.trackMeter = null; this.outputNode = null;
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
        console.log(`[Track ${this.id} - rebuildEffectChain V6 PolyFix] Rebuilding. SlicerPoly: ${this.slicerIsPolyphonic}`);

        if (!this.gainNode || this.gainNode.disposed) {
            this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
        }
        if (!this.trackMeter || this.trackMeter.disposed) {
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
        }

        const allNodesToDisconnect = [];
        if (this.instrument && !this.instrument.disposed) allNodesToDisconnect.push(this.instrument);
        if (this.toneSampler && !this.toneSampler.disposed) allNodesToDisconnect.push(this.toneSampler);
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) allNodesToDisconnect.push(this.slicerMonoPlayer);
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) allNodesToDisconnect.push(this.slicerMonoEnvelope);
        if (this.slicerMonoGain && !this.slicerMonoGain.disposed) allNodesToDisconnect.push(this.slicerMonoGain);
        if (this.type === 'DrumSampler') {
            this.drumPadPlayers.forEach(player => { if (player && !player.disposed) allNodesToDisconnect.push(player); });
        }
        this.activeEffects.forEach(effectWrapper => { if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) allNodesToDisconnect.push(effectWrapper.toneNode); });
        allNodesToDisconnect.push(this.gainNode); // Always disconnect gain node from its previous outputs

        allNodesToDisconnect.forEach(node => { try { node.disconnect(); } catch (e) { /* ignore */ } });
        console.log(`[Track ${this.id}] Disconnected all relevant nodes.`);

        // --- Determine the primary source output for single-source tracks ---
        let singleSourceOutput = null;
        if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
            singleSourceOutput = this.instrument;
        } else if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed) {
            singleSourceOutput = this.toneSampler;
        } else if (this.type === 'Sampler' && !this.slicerIsPolyphonic) {
            if (this.slicerMonoPlayer && this.slicerMonoEnvelope && this.slicerMonoGain) {
                if (this.slicerMonoPlayer.disposed || this.slicerMonoEnvelope.disposed || this.slicerMonoGain.disposed) {
                    this.setupSlicerMonoNodes(); // Recreates and chains P->E->G
                } else { // Ensure internal chain is correct
                    this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
                }
                if (this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                    singleSourceOutput = this.slicerMonoGain;
                }
            } else { // Nodes might not exist yet if just toggled
                this.setupSlicerMonoNodes();
                if (this.slicerMonoGain && !this.slicerMonoGain.disposed) {
                     singleSourceOutput = this.slicerMonoGain;
                }
            }
             console.log(`[Track ${this.id}] Mono Slicer: sourceOutput is ${singleSourceOutput ? 'slicerMonoGain' : 'null'}`);
        }
        // Polyphonic Sampler and Drum Sampler are handled differently as they have multiple/dynamic sources

        // --- Define the input point of the effects chain (or track's gain node if no effects) ---
        let effectsChainStartNode = (this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed)
            ? this.activeEffects[0].toneNode
            : this.gainNode;

        // --- Connect single sources to the effects chain ---
        if (singleSourceOutput && !singleSourceOutput.disposed) {
            if (effectsChainStartNode && !effectsChainStartNode.disposed) {
                singleSourceOutput.connect(effectsChainStartNode);
                console.log(`[Track ${this.id}] Connected ${singleSourceOutput.constructor.name} to ${effectsChainStartNode.constructor.name} (effects/gain)`);
            } else {
                console.warn(`[Track ${this.id}] No valid effectsChainStartNode for single source.`);
            }
        }

        // --- Connect Drum Sampler players ---
        if (this.type === 'DrumSampler') {
            this.drumPadPlayers.forEach((player, idx) => {
                if (player && !player.disposed) {
                    if (effectsChainStartPoint && !effectsChainStartPoint.disposed) {
                        player.connect(effectsChainStartPoint);
                        console.log(`[Track ${this.id}] Connected Drum Pad ${idx} to ${effectsChainStartPoint.constructor.name}`);
                    }
                }
            });
        }
        // Polyphonic Sampler players are connected dynamically within the sequence callback.

        // --- Chain active effects together ---
        for (let i = 0; i < this.activeEffects.length - 1; i++) {
            const currentEffectNode = this.activeEffects[i].toneNode;
            const nextEffectNode = this.activeEffects[i + 1].toneNode;
            if (currentEffectNode && !currentEffectNode.disposed && nextEffectNode && !nextEffectNode.disposed) {
                currentEffectNode.connect(nextEffectNode);
            }
        }

        // --- Connect the output of the effects chain (if any) to the track's gain node ---
        if (this.activeEffects.length > 0) {
            const lastEffectNode = this.activeEffects[this.activeEffects.length - 1].toneNode;
            if (lastEffectNode && !lastEffectNode.disposed && this.gainNode && !this.gainNode.disposed) {
                lastEffectNode.connect(this.gainNode);
                console.log(`[Track ${this.id}] Connected last effect (${this.activeEffects[this.activeEffects.length - 1].type}) to GainNode.`);
            }
        }
        // If no effects, singleSourceOutput or Drum Sampler players are already connected to gainNode (as effectsChainStartPoint).

        // --- Final connections for the track's gain node ---
        if (this.gainNode && !this.gainNode.disposed) {
            this.outputNode = this.gainNode;
            if (this.trackMeter && !this.trackMeter.disposed) {
                this.gainNode.connect(this.trackMeter);
            }
            const finalDestination = (window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed)
                                     ? window.masterEffectsBusInput
                                     : Tone.getDestination();
            this.gainNode.connect(finalDestination);
            console.log(`[Track ${this.id}] GainNode connected to Meter and ${finalDestination === window.masterEffectsBusInput ? 'Master Bus Input' : 'Tone Destination'}.`);
        } else {
            this.outputNode = null;
            console.error(`[Track ${this.id}] GainNode is invalid at end of rebuild. Output will be silent.`);
        }
        console.log(`[Track ${this.id}] rebuildEffectChain V6 finished. Output node: ${this.outputNode?.constructor.name}.`);
    }


    addEffect(effectType) { /* ... (same as v5) ... */ }
    removeEffect(effectId) { /* ... (same as v5) ... */ }
    updateEffectParam(effectId, paramPath, value) { /* ... (same as v5) ... */ }
    reorderEffect(effectId, newIndex) { /* ... (same as v5) ... */ }
    async fullyInitializeAudioResources() { /* ... (same as v5, ensure it calls this.rebuildEffectChain) ... */ }
    async initializeInstrument() { /* ... (same as v5) ... */ }

    setupSlicerMonoNodes() {
        this.disposeSlicerMonoNodes(); // Always clear previous
        if (!this.slicerIsPolyphonic) { 
            this.slicerMonoPlayer = new Tone.Player();
            this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
            this.slicerMonoGain = new Tone.Gain();
            this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain);
            if (this.audioBuffer && this.audioBuffer.loaded) {
                this.slicerMonoPlayer.buffer = this.audioBuffer;
            }
            console.log(`[Track ${this.id}] Slicer mono nodes SET UP and chained internally.`);
        }
    }
    disposeSlicerMonoNodes() {
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) this.slicerMonoPlayer.dispose();
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) this.slicerMonoEnvelope.dispose();
        if (this.slicerMonoGain && !this.slicerMonoGain.disposed) this.slicerMonoGain.dispose();
        this.slicerMonoPlayer = null; this.slicerMonoEnvelope = null; this.slicerMonoGain = null;
        console.log(`[Track ${this.id}] Slicer mono nodes DISPOSED.`);
    }

    setupToneSampler() { /* ... (same as v5) ... */ }
    setVolume(volume, fromInteraction = false) { /* ... (same as v5) ... */ }
    applyMuteState() { /* ... (same as v5) ... */ }
    applySoloState() { /* ... (same as v5) ... */ }
    setSynthParam(paramPath, value) { /* ... (same as v5) ... */ }
    setSliceVolume(sliceIndex, volume) { /* ... (same as v5) ... */ }
    setSlicePitchShift(sliceIndex, semitones) { /* ... (same as v5) ... */ }
    setSliceLoop(sliceIndex, loop) { /* ... (same as v5) ... */ }
    setSliceReverse(sliceIndex, reverse) { /* ... (same as v5) ... */ }
    setSliceEnvelopeParam(sliceIndex, param, value) { /* ... (same as v5) ... */ }
    setDrumSamplerPadVolume(padIndex, volume) { /* ... (same as v5) ... */ }
    setDrumSamplerPadPitch(padIndex, pitch) { /* ... (same as v5) ... */ }
    setDrumSamplerPadEnv(padIndex, param, value) { /* ... (same as v5) ... */ }
    setInstrumentSamplerRootNote(noteName) { /* ... (same as v5) ... */ }
    setInstrumentSamplerLoop(loop) { /* ... (same as v5) ... */ }
    setInstrumentSamplerLoopStart(time) { /* ... (same as v5) ... */ }
    setInstrumentSamplerLoopEnd(time) { /* ... (same as v5) ... */ }
    setInstrumentSamplerEnv(param, value) { /* ... (same as v5) ... */ }
    async doubleSequence() { /* ... (same as v5) ... */ }

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

            const effectsChainStartPoint = this.activeEffects.length > 0 && this.activeEffects[0].toneNode && !this.activeEffects[0].toneNode.disposed
                ? this.activeEffects[0].toneNode
                : (this.gainNode && !this.gainNode.disposed ? this.gainNode : (window.masterEffectsBusInput || Tone.getDestination()));


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
                            this.slicerMonoGain.gain.value = step.velocity * sliceData.volume;
                            this.slicerMonoPlayer.playbackRate = playbackRate;
                            this.slicerMonoPlayer.reverse = sliceData.reverse;
                            this.slicerMonoPlayer.loop = sliceData.loop;
                            this.slicerMonoPlayer.loopStart = sliceData.offset;
                            this.slicerMonoPlayer.loopEnd = sliceData.offset + sliceData.duration;

                            this.slicerMonoPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            this.slicerMonoEnvelope.triggerAttack(time);
                            if (!sliceData.loop) {
                                this.slicerMonoEnvelope.triggerRelease(time + playDuration - (sliceData.envelope.release * 0.05)); // Try earlier release point based on env
                            }
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
                 let notePlayedThisStepInColumn = false;
                 synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active) {
                        if (!this.instrumentSamplerIsPolyphonic && !notePlayedThisStepInColumn) {
                            this.toneSampler.releaseAll(time); 
                            notePlayedThisStepInColumn = true; 
                        }
                        this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "8n", time, step.velocity);
                    }
                });
            }
        }, Array.from(Array(this.sequenceLength).keys()), "16n").start(0);
        if (this.sequencerWindow && !this.sequencerWindow.isMinimized && window.openWindows[`sequencerWin-${this.id}`] && typeof window.openTrackSequencerWindow === 'function') {
             window.openTrackSequencerWindow(this.id, true);
        }
    }

    dispose() { /* ... (same as v5) ... */ }
}

