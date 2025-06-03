// js/Track.js - Track Class Module

import * as Constants from './constants.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';

const MAX_VOICES_PER_POOL = 32;

export class Track {
    // ... (Constructor and other methods from response #19 remain the same)
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
        if (this.type !== 'Audio' && (!this.sequences || this.sequences.length === 0)) {
            if (typeof this.createNewSequence === 'function') {
                this.createNewSequence("Sequence 1", Constants.defaultStepsPerBar, true);
            } else {
                console.error(`[Track ${this.id}] CRITICAL ERROR in initializeDefaultSequence: this.createNewSequence is NOT a function!`);
                if (this.appServices.showNotification && typeof this.appServices.showNotification === 'function') {
                    this.appServices.showNotification(`Error initializing track ${this.name}: Cannot create default sequence.`, 5000);
                }
            }
        }
    }

    _initializeSlicerVoicePool() { /* ... same as previous ... */ }
    _getVoiceFromSlicerPool() { /* ... same as previous ... */ }
    _returnVoiceToSlicerPool(voiceUnit) { /* ... same as previous ... */ }
    setName(newName, skipUndo = false) { /* ... same as previous ... */ }
    getActiveSequence() { /* ... same as previous ... */ }
    getActiveSequenceData() { /* ... same as previous ... */ }
    getActiveSequenceLength() { /* ... same as previous ... */ }
    getDefaultSynthParams() { /* ... same as previous ... */ }
    async initializeAudioNodes() { /* ... same as previous ... */ }
    rebuildEffectChain() { /* ... same as previous ... */ }
    _performRebuildEffectChain() { /* ... same as previous ... */ }
    addEffect(effectType) { /* ... same as previous ... */ }
    removeEffect(effectId) { /* ... same as previous ... */ }
    updateEffectParam(effectId, paramPath, value) { /* ... same as previous ... */ }
    reorderEffect(effectId, newIndex) { /* ... same as previous ... */ }
    async fullyInitializeAudioResources() { /* ... same as previous ... */ }
    async initializeInstrument() { /* ... same as previous ... */ }
    setupSlicerMonoNodes() { /* ... same as previous ... */ }
    disposeSlicerMonoNodes() { /* ... same as previous ... */ }
    setupToneSampler() { /* ... same as previous ... */ }
    setVolume(volume, fromInteraction = false) { /* ... same as previous ... */ }
    applyMuteState() { /* ... same as previous ... */ }
    applySoloState() { /* ... same as previous ... */ }
    setSynthParam(paramPath, value) { /* ... same as previous ... */ }
    setSliceVolume(sliceIndex, volume) { /* ... same as previous ... */ }
    setSlicePitchShift(sliceIndex, semitones) { /* ... same as previous ... */ }
    setSliceLoop(sliceIndex, loop) { /* ... same as previous ... */ }
    setSliceReverse(sliceIndex, reverse) { /* ... same as previous ... */ }
    setSliceEnvelopeParam(sliceIndex, param, value) { /* ... same as previous ... */ }
    setDrumSamplerPadVolume(padIndex, volume) { /* ... same as previous ... */ }
    setDrumSamplerPadPitch(padIndex, pitch) { /* ... same as previous ... */ }
    setDrumSamplerPadEnv(padIndex, param, value) { /* ... same as previous ... */ }
    setDrumSamplerPadAutoStretch(padIndex, enabled) { /* ... same as previous ... */ }
    setDrumSamplerPadStretchOriginalBPM(padIndex, bpm) { /* ... same as previous ... */ }
    setDrumSamplerPadStretchBeats(padIndex, beats) { /* ... same as previous ... */ }
    setInstrumentSamplerRootNote(noteName) { /* ... same as previous ... */ }
    setInstrumentSamplerLoop(loop) { /* ... same as previous ... */ }
    setInstrumentSamplerLoopStart(time) { /* ... same as previous ... */ }
    setInstrumentSamplerLoopEnd(time) { /* ... same as previous ... */ }
    setInstrumentSamplerEnv(param, value) { /* ... same as previous ... */ }
    _captureUndoState(description) { /* ... same as previous ... */ }
    createNewSequence(name = `Sequence ${this.sequences.length + 1}`, initialLengthSteps = Constants.defaultStepsPerBar, skipUndo = false) { /* ... same as previous ... */ }
    deleteSequence(sequenceId) { /* ... same as previous ... */ }
    renameSequence(sequenceId, newName) { /* ... same as previous ... */ }
    duplicateSequence(sequenceId) { /* ... same as previous ... */ }
    setActiveSequence(sequenceId) { /* ... same as previous ... */ }
    doubleSequence() { /* ... same as previous ... */ }
    setSequenceLength(newLengthInSteps, skipUndoCapture = false) { /* ... same as previous ... */ }

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

        if (currentPlaybackMode !== 'sequencer') {
            return;
        }

        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data || !Array.isArray(activeSeq.data) || activeSeq.data.length === 0 || !activeSeq.length) {
            console.warn(`[Track ${this.id} recreateToneSequence] No valid active sequence or sequence data for "${this.name}".`);
            return;
        }

        const sequenceDataForTone = activeSeq.data;
        const sequenceLengthForTone = activeSeq.length;

        try {
            this.patternPlayerSequence = new Tone.Sequence((time, col) => {
                console.log(`[Track ${this.id} SeqCallback] Time: ${time.toFixed(3)}, Col: ${col}, Track: ${this.name}, Type: ${this.type}`); // MODIFIED: Added log

                const playbackModeCheck = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
                if (playbackModeCheck !== 'sequencer') {
                    if (this.patternPlayerSequence && this.patternPlayerSequence.state === 'started' && !this.patternPlayerSequence.disposed) this.patternPlayerSequence.stop();
                    return;
                }

                const currentGlobalSoloId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
                const isEffectivelyMuted = this.isMuted || (currentGlobalSoloId !== null && currentGlobalSoloId !== this.id);

                if (this.appServices.highlightPlayingStep && typeof this.appServices.highlightPlayingStep === 'function') {
                    // console.log(`[Track ${this.id} SeqCallback] Calling highlightPlayingStep for col: ${col}`); // MODIFIED: Uncomment for verbose logging
                    this.appServices.highlightPlayingStep(this.id, col);
                } else {
                    console.warn(`[Track ${this.id} SeqCallback] highlightPlayingStep service not available.`);
                }

                if (!this.gainNode || this.gainNode.disposed || isEffectivelyMuted) {
                    console.log(`[Track ${this.id} SeqCallback] Aborting note trigger: GainNode invalid (${!!this.gainNode}, disposed: ${this.gainNode?.disposed}) or track muted (Muted: ${isEffectivelyMuted})`);
                    return;
                }

                if (this.type === 'Synth') {
                    if (this.instrument && !this.instrument.disposed) {
                        let notePlayedThisStep = false;
                        for (let rowIndex = 0; rowIndex < Constants.synthPitches.length; rowIndex++) {
                            const pitchName = Constants.synthPitches[rowIndex];
                            const step = sequenceDataForTone[rowIndex]?.[col];
                            if (step?.active && !notePlayedThisStep) {
                                console.log(`[Track ${this.id} SeqCallback] Synth Trigger: ${pitchName}, Vel: ${step.velocity}, Time: ${time.toFixed(3)}`); // MODIFIED: Added log
                                this.instrument.triggerAttackRelease(pitchName, "16n", time, step.velocity * Constants.defaultVelocity);
                                notePlayedThisStep = true;
                            }
                        }
                    } else {
                        console.warn(`[Track ${this.id} SeqCallback] Synth instrument missing or disposed.`);
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
                                console.log(`[Track ${this.id} SeqCallback] InstrumentSampler Trigger: ${pitchName}, Vel: ${step.velocity}, Time: ${time.toFixed(3)}`); // MODIFIED: Added log
                                this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "16n", time, step.velocity * Constants.defaultVelocity);
                            }
                        });
                    } else {
                        console.warn(`[Track ${this.id} SeqCallback] InstrumentSampler (toneSampler) missing, disposed, or not loaded.`);
                    }
                }
                // ... (Sampler and DrumSampler logic would also need similar logging if problems persist there) ...

            }, Array.from(Array(sequenceLengthForTone).keys()), "16n");

            this.patternPlayerSequence.loop = true;
            // console.log(`[Track ${this.id} recreateToneSequence] Tone.Sequence for "${activeSeq.name}" prepared. Loop: true.`);
        } catch (error) {
            console.error(`[Track ${this.id} recreateToneSequence] Error creating Tone.Sequence for "${activeSeq.name}":`, error);
            this.patternPlayerSequence = null;
        }

        if (this.appServices.updateTrackUI && typeof this.appServices.updateTrackUI === 'function') {
            this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        }
    }

    async schedulePlayback(transportStartTime, transportStopTime) {
        const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        console.log(`[Track ${this.id} "${this.name}"] schedulePlayback. Mode: ${playbackMode}. Transport Range: ${transportStartTime.toFixed(2)}s to ${transportStopTime.toFixed(2)}s`);

        if (typeof this.stopPlayback === 'function') {
            this.stopPlayback();
        } else {
            console.warn(`[Track ${this.id}] stopPlayback method not found.`);
        }

        if (playbackMode === 'timeline') {
            // ... (timeline scheduling logic as in response #17, with robust player creation/disposal)
        } else { // Sequencer Mode
            if (!this.patternPlayerSequence || this.patternPlayerSequence.disposed) {
                console.log(`[Track ${this.id} schedulePlayback] Sequencer mode: patternPlayerSequence is invalid, calling recreateToneSequence.`);
                if (typeof this.recreateToneSequence === 'function') {
                    this.recreateToneSequence(true, transportStartTime);
                } else {
                    console.error(`[Track ${this.id} schedulePlayback] recreateToneSequence method not found.`);
                }
            }
            if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
                if (this.patternPlayerSequence.state === 'started') {
                    try {this.patternPlayerSequence.stop(Tone.Transport.now());} catch(e){console.warn("Err stopping seq player during schedule", e)}
                }
                console.log(`[Track ${this.id}] Sequencer mode: Attempting to start patternPlayerSequence at transport offset: ${transportStartTime.toFixed(2)}s. Sequence state: ${this.patternPlayerSequence.state}`); // MODIFIED: Added log
                try {
                    this.patternPlayerSequence.start(transportStartTime);
                    console.log(`[Track ${this.id}] patternPlayerSequence.start() called. New state: ${this.patternPlayerSequence.state}`); // MODIFIED: Added log
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

    stopPlayback() { /* ... same as previous ... */ }
    async addAudioClip(blob, startTime) { /* ... same as previous ... */ }
    async addExternalAudioFileAsClip(audioFileBlob, startTime, clipName = null) { /* ... same as previous ... */ }
    addSequenceClipToTimeline(sourceSequenceId, startTime, clipName = null) { /* ... same as previous ... */ }
    async _reschedulePlaybackIfNeeded(clipStartTime, modeHint) { /* ... same as previous ... */ }
    async getBlobDuration(blob) { /* ... same as previous ... */ }
    async updateAudioClipPosition(clipId, newStartTime) { /* ... same as previous ... */ }
    dispose() { /* ... same robust version from response #17 ... */ }
}
