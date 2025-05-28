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
            status: initialData?.samplerAudioData?.status || (initialData?.samplerAudioData?.audioDbKey ? 'pending' : 'empty')
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
            status: initialData?.instrumentSamplerSettings?.status || (initialData?.instrumentSamplerSettings?.audioDbKey ? 'pending' : 'empty'),
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
            status: 'empty',
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
                } else if (this.type !== 'DrumSampler') {
                    currentAudioPathEnd = effectWrapper.toneNode;
                }
                if (currentAudioPathEnd === mainSourceNode || this.type !== 'DrumSampler') {
                    currentAudioPathEnd = effectWrapper.toneNode;
                }
            }
        });

        if (this.gainNode && !this.gainNode.disposed) {
            if (currentAudioPathEnd) {
                try {
                    currentAudioPathEnd.connect(this.gainNode);
                } catch (e) { console.error(`[Track ${this.id}] Error connecting ${currentAudioPathEnd.constructor.name} to GainNode:`, e); }
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
                            console.log(`[Track ${this.id}] Connecting drum player ${idx} (${player.buffer?.duration}s) to ${firstNodeInChainForDrums.constructor.name}`);
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

    addEffect(effectType) { /* ... (no changes needed here for now) ... */
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
    removeEffect(effectId) { /* ... (no changes needed here for now) ... */
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
    updateEffectParam(effectId, paramPath, value) { /* ... (no changes needed here for now) ... */
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
    reorderEffect(effectId, newIndex) { /* ... (no changes needed here for now) ... */
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
        try {
            if (this.type === 'Synth') {
                await this.initializeInstrument();
            } else if (this.type === 'Sampler') {
                if (this.audioBuffer?.loaded) {
                    this.samplerAudioData.status = 'loaded';
                    console.log(`[Track ${this.id}] Sampler buffer is loaded. Status: ${this.samplerAudioData.status}`);
                    if (!this.slicerIsPolyphonic) {
                        this.setupSlicerMonoNodes();
                        if (this.slicerMonoPlayer) this.slicerMonoPlayer.buffer = this.audioBuffer;
                    }
                } else if (this.samplerAudioData.audioDbKey && this.samplerAudioData.status !== 'missing') {
                    this.samplerAudioData.status = 'pending';
                    console.warn(`[Track ${this.id}] Sampler audioBuffer NOT LOADED for key ${this.samplerAudioData.audioDbKey}. Status set to: ${this.samplerAudioData.status}`);
                } else if (!this.samplerAudioData.audioDbKey) {
                    this.samplerAudioData.status = 'empty';
                     console.log(`[Track ${this.id}] Sampler has no audioDbKey. Status set to: ${this.samplerAudioData.status}`);
                }
            } else if (this.type === 'DrumSampler') {
                for (let i = 0; i < this.drumSamplerPads.length; i++) {
                    const pad = this.drumSamplerPads[i];
                    if (pad.audioBuffer && pad.audioBuffer.loaded) {
                        pad.status = 'loaded';
                        console.log(`[Track ${this.id}] DrumPad ${i} buffer is loaded. Status: ${pad.status}`);
                        if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) {
                            this.drumPadPlayers[i].dispose();
                        }
                        this.drumPadPlayers[i] = new Tone.Player(pad.audioBuffer);
                    } else if (pad.audioDbKey && pad.status !== 'missing') {
                        pad.status = 'pending';
                         console.warn(`[Track ${this.id}] DrumPad ${i} audioBuffer NOT LOADED for key ${pad.audioDbKey}. Status set to: ${pad.status}`);
                    } else if (!pad.audioDbKey) {
                        pad.status = 'empty';
                        console.log(`[Track ${this.id}] DrumPad ${i} has no audioDbKey. Status set to: ${pad.status}`);
                    }
                }
            } else if (this.type === 'InstrumentSampler') {
                if (this.instrumentSamplerSettings.audioBuffer?.loaded) {
                    this.instrumentSamplerSettings.status = 'loaded';
                    console.log(`[Track ${this.id}] InstrumentSampler buffer is loaded. Status: ${this.instrumentSamplerSettings.status}`);
                    this.setupToneSampler();
                } else if (this.instrumentSamplerSettings.audioDbKey && this.instrumentSamplerSettings.status !== 'missing') {
                     this.instrumentSamplerSettings.status = 'pending';
                     console.warn(`[Track ${this.id}] InstrumentSampler audioBuffer NOT LOADED for key ${this.instrumentSamplerSettings.audioDbKey}. Status set to: ${this.instrumentSamplerSettings.status}`);
                } else if (!this.instrumentSamplerSettings.audioDbKey) {
                    this.instrumentSamplerSettings.status = 'empty';
                    console.log(`[Track ${this.id}] InstrumentSampler has no audioDbKey. Status set to: ${this.instrumentSamplerSettings.status}`);
                }
            }
            this.rebuildEffectChain();
            this.setSequenceLength(this.sequenceLength, true);
            console.log(`[Track ${this.id}] fullyInitializeAudioResources completed.`);
        } catch (error) {
            console.error(`[Track ${this.id}] Error in fullyInitializeAudioResources:`, error);
        }
    }

    async initializeInstrument() { /* ... (no changes) ... */ }
    setupSlicerMonoNodes() { /* ... (no changes) ... */ }
    disposeSlicerMonoNodes() { /* ... (no changes) ... */ }
    setupToneSampler() { /* ... (no changes) ... */ }
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
    setInstrumentSamplerRootNote(noteName) { /* ... (no changes) ... */ }
    setInstrumentSamplerLoop(loop) { /* ... (no changes) ... */ }
    setInstrumentSamplerLoopStart(time) { /* ... (no changes) ... */ }
    setInstrumentSamplerLoopEnd(time) { /* ... (no changes) ... */ }
    setInstrumentSamplerEnv(param, value) { /* ... (no changes) ... */ }
    async doubleSequence() { /* ... (no changes) ... */ }

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
                if (this.samplerAudioData.status !== 'loaded' || !this.audioBuffer || !this.audioBuffer.loaded) {
                    if(this.sequenceData.some(row => row?.[col]?.active)) console.warn(`[Track ${this.id} SeqCB] Sampler audio not loaded (status: ${this.samplerAudioData.status}), skipping playback for col ${col}`);
                    return;
                }
                this.slices.forEach((sliceData, sliceIndex) => {
                    const step = this.sequenceData[sliceIndex]?.[col];
                    if (step?.active && sliceData?.duration > 0) { // Removed this.audioBuffer.loaded check as it's done above
                        // ... rest of sampler playback logic as before ...
                        const playbackRate = Math.pow(2, (sliceData.pitchShift || 0) / 12);
                        let playDuration = sliceData.duration / playbackRate;
                        if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds();

                        if (this.slicerIsPolyphonic) {
                            const tempPlayer = new Tone.Player(this.audioBuffer);
                            const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                            const tempGain = new Tone.Gain(step.velocity * sliceData.volume);
                            tempPlayer.chain(tempEnv, tempGain, actualDestinationForPlayback);
                            tempPlayer.playbackRate = playbackRate; tempPlayer.reverse = sliceData.reverse; tempPlayer.loop = sliceData.loop;
                            tempPlayer.loopStart = sliceData.offset; tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
                            tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            tempEnv.triggerAttack(time);
                            if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95);
                            Tone.Transport.scheduleOnce(() => { if(tempPlayer && !tempPlayer.disposed) tempPlayer.dispose(); if(tempEnv && !tempEnv.disposed) tempEnv.dispose(); if(tempGain && !tempGain.disposed) tempGain.dispose(); }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);
                        } else if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed && this.slicerMonoGain && !this.slicerMonoGain.disposed) {
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
                    if (step?.active && padData && padData.status === 'loaded' && this.drumPadPlayers[padIndex]?.loaded) {
                        const player = this.drumPadPlayers[padIndex];
                         console.log(`%c[Track ${this.id} SeqCB] DrumPad ${padIndex}: Triggering. Player state: ${player.state}, Buffer loaded: ${player.buffer.loaded}, Volume: ${Tone.dbToGain(padData.volume * step.velocity).toFixed(2)}, Rate: ${Math.pow(2, (padData.pitchShift || 0) / 12).toFixed(2)}`, "color: magenta; font-weight:bold;");
                        player.volume.value = Tone.gainToDb(padData.volume * step.velocity);
                        player.playbackRate = Math.pow(2, (padData.pitchShift || 0) / 12);
                        player.start(time);
                    } else if (step?.active) {
                        console.warn(`%c[Track ${this.id} SeqCB] DrumPad ${padIndex}: SKIPPING playback. Step Active. PadData: ${!!padData}, Status: ${padData?.status}, Player: ${!!this.drumPadPlayers[padIndex]}, Player Loaded: ${this.drumPadPlayers[padIndex]?.loaded}`, "color: orange;");
                    }
                });
            } else if (this.type === 'InstrumentSampler') {
                if (this.instrumentSamplerSettings.status !== 'loaded' || !this.toneSampler?.loaded) {
                     if(this.sequenceData.some(row => row?.[col]?.active)) console.warn(`[Track ${this.id} SeqCB] InstrumentSampler audio not loaded (status: ${this.instrumentSamplerSettings.status}), skipping playback for col ${col}`);
                    return;
                }
                synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active) {
                        console.log(`%c[Track ${this.id} SeqCB] InstrumentSampler: Triggering ${pitchName}. Sampler loaded: ${this.toneSampler.loaded}`, "color: magenta; font-weight:bold;");
                        this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "8n", time, step.velocity);
                    }
                });
            }
        }, Array.from(Array(this.sequenceLength).keys()), "16n").start(0);

        if (this.sequencerWindow && !this.sequencerWindow.isMinimized && window.openWindows[`sequencerWin-${this.id}`] && typeof window.openTrackSequencerWindow === 'function') {
             window.openTrackSequencerWindow(this.id, true);
        }
    }

    dispose() { /* ... (no changes needed to the dispose logic itself for now, DB deletion is handled elsewhere or needs specific strategy) ... */
        console.log(`[Track ${this.id}] Disposing track ${this.name} (${this.type})`);
        try { if (this.sequence && !this.sequence.disposed) { this.sequence.stop(); this.sequence.clear(); this.sequence.dispose(); } } catch(e){ console.warn("Error disposing sequence", e.message); }
        try { if (this.instrument && !this.instrument.disposed) { this.instrument.dispose(); } } catch(e){ console.warn("Error disposing instrument", e.message); }

        try { if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose(); } catch(e){ console.warn("Error disposing sampler audioBuffer", e.message); }

        this.disposeSlicerMonoNodes();
        try { if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.dispose(); } catch(e){ console.warn("Error disposing toneSampler", e.message); }
        try { if (this.instrumentSamplerSettings?.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose(); } catch(e){ console.warn("Error disposing instrumentSamplerSettings.audioBuffer", e.message); }

        this.drumSamplerPads.forEach((pad) => {
            if (pad.audioBuffer && !pad.audioBuffer.disposed) try {pad.audioBuffer.dispose();} catch(e){}
        });
        this.drumPadPlayers.forEach(player => { if (player && !player.disposed) try {player.dispose();} catch(e){} });

        this.activeEffects.forEach(effect => { if (effect.toneNode && !effect.toneNode.disposed) try {effect.toneNode.dispose();} catch(e){} });
        this.activeEffects = [];

        try { if (this.gainNode && !this.gainNode.disposed) this.gainNode.dispose(); } catch(e){ console.warn("Error disposing gainNode", e.message); }
        try { if (this.trackMeter && !this.trackMeter.disposed) this.trackMeter.dispose(); } catch(e){ console.warn("Error disposing trackMeter", e.message); }

        if (this.inspectorWindow?.close) try {this.inspectorWindow.close(true);} catch(e){}
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
