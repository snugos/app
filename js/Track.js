// js/Track.js - Track Class Module

import * as Constants from './constants.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';

const MAX_VOICES_PER_POOL = 32;

export class Track {
    constructor(id, type, initialData = null, appServices = {}) {
        // ... (Constructor from response #28 - confirmed working)
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
        // console.log(`[Track ${this.id} Constructor] START for "${this.name}", Type: "${this.type}". Initial sequences count: ${initialData?.sequences?.length}, Active ID: ${initialData?.activeSequenceId}`);

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

        this.samplerAudioData = { /* ... as before ... */ };
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
        this.slicerMonoPlayer = null; this.slicerMonoEnvelope = null; this.slicerMonoGain = null;
        this.instrumentSamplerSettings = { /* ... as before ... */ };
        this.instrumentSamplerIsPolyphonic = initialData?.instrumentSamplerIsPolyphonic !== undefined ? initialData.instrumentSamplerIsPolyphonic : true;
        this.toneSampler = null;
        this.drumSamplerPads = Array(Constants.numDrumSamplerPads).fill(null).map((_, padIdx) => {
            const initialPadData = initialData?.drumSamplerPads?.[padIdx];
            return { /* ... as before ... */ };
        });
        this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
        this.drumPadPlayers = Array(Constants.numDrumSamplerPads).fill(null);
        this.activeEffects = [];
        if (initialData && initialData.activeEffects && Array.isArray(initialData.activeEffects)) { /* ... as before ... */ }
        this.gainNode = null; this.trackMeter = null; this.output = null;
        this.instrument = null;
        this.sequences = []; this.activeSequenceId = null;
        this.timelineClips = initialData?.timelineClips ? JSON.parse(JSON.stringify(initialData.timelineClips)) : [];
        this.clipPlayers = new Map();

        if (this.type !== 'Audio') {
            if (initialData?.sequences && initialData.sequences.length > 0) {
                this.sequences = JSON.parse(JSON.stringify(initialData.sequences));
                this.activeSequenceId = initialData.activeSequenceId || (this.sequences[0] ? this.sequences[0].id : null);
            }
        } else { this.inputChannel = null; }
        this.patternPlayerSequence = null;
        this.waveformCanvasCtx = null; this.instrumentWaveformCanvasCtx = null;
        this.automation = initialData?.automation ? JSON.parse(JSON.stringify(initialData.automation)) : { volume: [] };
        this.inspectorControls = {};
        // console.log(`[Track ${this.id} Constructor] END for "${this.name}". Initial sequences count: ${this.sequences?.length}, Active ID: ${this.activeSequenceId}`);
    }

    initializeDefaultSequence() {
        // console.log(`[Track ${this.id} initializeDefaultSequence] Called for "${this.name}". Current sequences:`, JSON.parse(JSON.stringify(this.sequences)), `ActiveSeqID before: ${this.activeSequenceId}`);
        if (this.type !== 'Audio' && (!this.sequences || this.sequences.length === 0)) {
            // console.log(`[Track ${this.id}] No initial sequences, creating default.`);
            if (typeof this.createNewSequence === 'function') {
                const newSeq = this.createNewSequence("Sequence 1", Constants.defaultStepsPerBar, true);
                if (newSeq) {
                    // console.log(`[Track ${this.id} initializeDefaultSequence] Default sequence CREATED. New ActiveSeqID: ${this.activeSequenceId}, Sequences count: ${this.sequences?.length}`);
                } else { /* ... error log ... */ }
            } else { /* ... error log ... */ }
        } else if (this.type !== 'Audio' && this.sequences && this.sequences.length > 0 && !this.activeSequenceId) {
            this.activeSequenceId = this.sequences[0]?.id || null;
            // console.log(`[Track ${this.id} initializeDefaultSequence] Sequences existed, set activeSequenceId to: ${this.activeSequenceId}`);
        } else {
            // console.log(`[Track ${this.id} initializeDefaultSequence] Conditions for default sequence not met or activeId already set.`);
        }
    }

    _initializeSlicerVoicePool() { /* ... same ... */ }
    _getVoiceFromSlicerPool() { /* ... same ... */ }
    _returnVoiceToSlicerPool(voiceUnit) { /* ... same ... */ }
    setName(newName, skipUndo = false) { /* ... same ... */ }
    getActiveSequence() { /* ... same with logging ... */ }
    getActiveSequenceData() { /* ... same ... */ }
    getActiveSequenceLength() { /* ... same ... */ }
    getDefaultSynthParams() { /* ... same ... */ }
    async initializeAudioNodes() { /* ... same robust version ... */ }
    rebuildEffectChain() { /* ... same robust version with _performRebuildEffectChain ... */ }
    _performRebuildEffectChain() { /* ... same robust version with detailed logging ... */ }

    addEffect(effectType) {
        console.log(`[Track ${this.id} addEffect] Attempting to add effect: ${effectType} to track "${this.name}"`);
        if (!this.appServices || typeof this.appServices.effectsRegistryAccess !== 'object' || !this.appServices.effectsRegistryAccess.AVAILABLE_EFFECTS) {
            console.error(`[Track ${this.id} addEffect] effectsRegistryAccess or AVAILABLE_EFFECTS not available via appServices.`);
            if (this.appServices.showNotification && typeof this.appServices.showNotification === 'function') {
                this.appServices.showNotification("Cannot add effect: Effects registry service missing.", 3000);
            }
            return;
        }
        const AVAILABLE_EFFECTS_LOCAL = this.appServices.effectsRegistryAccess.AVAILABLE_EFFECTS;
        const getEffectDefaultParamsLocal = this.appServices.effectsRegistryAccess.getEffectDefaultParams;

        if (!AVAILABLE_EFFECTS_LOCAL[effectType]) {
            console.warn(`[Track ${this.id} addEffect] Effect type "${effectType}" not found in local registry copy.`);
            if (this.appServices.showNotification && typeof this.appServices.showNotification === 'function') this.appServices.showNotification(`Effect type "${effectType}" not found.`, 3000);
            return;
        }

        const defaultParams = (typeof getEffectDefaultParamsLocal === 'function')
            ? getEffectDefaultParamsLocal(effectType)
            : getEffectDefaultParamsFromRegistry(effectType); // Fallback to direct import
        
        console.log(`[Track ${this.id} addEffect] Creating Tone instance for ${effectType} with params:`, JSON.parse(JSON.stringify(defaultParams)));
        const toneNode = createEffectInstance(effectType, defaultParams);

        if (toneNode) {
            const effectId = `effect-${this.id}-${effectType}-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
            this.activeEffects.push({
                id: effectId, type: effectType, toneNode: toneNode, params: JSON.parse(JSON.stringify(defaultParams))
            });
            console.log(`[Track ${this.id} addEffect] Effect "${effectType}" (ID: ${effectId}) PUSHED to activeEffects. New count: ${this.activeEffects.length}. Calling rebuildEffectChain.`);
            this.rebuildEffectChain(); // This is crucial
            if (this.appServices.updateTrackUI && typeof this.appServices.updateTrackUI === 'function') {
                this.appServices.updateTrackUI(this.id, 'effectsListChanged');
                console.log(`[Track ${this.id} addEffect] updateTrackUI called for 'effectsListChanged'.`);
            } else {
                console.warn(`[Track ${this.id} addEffect] updateTrackUI service not available after adding effect.`);
            }
        } else {
            console.error(`[Track ${this.id} addEffect] CRITICAL: Could not create Tone.js instance for effect ${effectType}`);
            if (this.appServices.showNotification && typeof this.appServices.showNotification === 'function') this.appServices.showNotification(`Could not create effect node: ${effectType}`, 3000);
        }
    }

    removeEffect(effectId) { /* ... same robust version ... */ }
    updateEffectParam(effectId, paramPath, value) { /* ... same robust version ... */ }
    reorderEffect(effectId, newIndex) { /* ... same robust version ... */ }
    async fullyInitializeAudioResources() { /* ... same robust version ... */ }
    async initializeInstrument() { /* ... same robust version ... */ }
    setupSlicerMonoNodes() { /* ... same as previous ... */ }
    disposeSlicerMonoNodes() { /* ... same as previous ... */ }
    setupToneSampler() { /* ... same as previous ... */ }
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
    createNewSequence(name = `Sequence ${this.sequences.length + 1}`, initialLengthSteps = Constants.defaultStepsPerBar, skipUndo = false) { /* ... same as response #29 with detailed logs ... */ }
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
                this.patternPlayerSequence.stop(); this.patternPlayerSequence.clear(); this.patternPlayerSequence.dispose();
            } catch (e) { console.warn(`[Track ${this.id}] Error disposing old Tone.Sequence:`, e.message); }
        }
        this.patternPlayerSequence = null;
        if (currentPlaybackMode !== 'sequencer') { return; }

        const activeSeq = this.getActiveSequence();
        if (!activeSeq || !activeSeq.data || !Array.isArray(activeSeq.data) || activeSeq.data.length === 0 || !activeSeq.length) {
            console.warn(`[Track ${this.id} recreateToneSequence] No valid active sequence for "${this.name}". Cannot create Tone.Sequence.`);
            return;
        }
        const sequenceDataForTone = activeSeq.data;
        const sequenceLengthForTone = activeSeq.length;

        console.log(`[Track ${this.id} recreateToneSequence] Creating Tone.Sequence. Length: ${sequenceLengthForTone}, Rows: ${sequenceDataForTone.length}`); // LOG ADDED

        try {
            this.patternPlayerSequence = new Tone.Sequence((time, col) => {
                // console.log(`[Track ${this.id} SeqCallback] Time: ${time.toFixed(3)}, Col: ${col}, Track: ${this.name}, Type: ${this.type}`);
                const playbackModeCheck = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
                if (playbackModeCheck !== 'sequencer') {
                    if (this.patternPlayerSequence?.state === 'started' && !this.patternPlayerSequence.disposed) this.patternPlayerSequence.stop();
                    return;
                }
                const currentGlobalSoloId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
                const isEffectivelyMuted = this.isMuted || (currentGlobalSoloId !== null && currentGlobalSoloId !== this.id);

                if (this.appServices.highlightPlayingStep && typeof this.appServices.highlightPlayingStep === 'function') {
                    // console.log(`[Track ${this.id} SeqCallback] Calling highlightPlayingStep for col: ${col}`);
                    this.appServices.highlightPlayingStep(this.id, col);
                } else { console.warn(`[Track ${this.id} SeqCallback] highlightPlayingStep service missing.`); }

                if (!this.gainNode || this.gainNode.disposed || isEffectivelyMuted) {
                    // console.log(`[Track ${this.id} SeqCallback] Aborting note: GainNode invalid or track muted.`);
                    return;
                }
                // console.log(`[Track ${this.id} SeqCallback] Passed mute/gain checks. Instrument: ${!!this.instrument}, Disposed: ${this.instrument?.disposed}`);

                if (this.type === 'Synth') {
                    if (this.instrument && !this.instrument.disposed) {
                        let notePlayed = false;
                        for (let r = 0; r < Constants.synthPitches.length; r++) {
                            if (sequenceDataForTone[r]?.[col]?.active && !notePlayed) {
                                console.log(`[Track ${this.id} SeqCallback] Synth Trigger: ${Constants.synthPitches[r]}`);
                                this.instrument.triggerAttackRelease(Constants.synthPitches[r], "16n", time, sequenceDataForTone[r][col].velocity * Constants.defaultVelocity);
                                notePlayed = true;
                            }
                        }
                    } else { /* console.warn(`[Track ${this.id} SeqCallback] Synth instrument not ready.`); */ }
                } else if (this.type === 'InstrumentSampler') {
                    if (this.toneSampler?.loaded && !this.toneSampler.disposed) {
                        let notePlayed = false;
                        Constants.synthPitches.forEach((pitch, r) => {
                            if (sequenceDataForTone[r]?.[col]?.active) {
                                if (!this.instrumentSamplerIsPolyphonic && !notePlayed) { this.toneSampler.releaseAll(time); notePlayed = true; }
                                // console.log(`[Track ${this.id} SeqCallback] InstrumentSampler Trigger: ${pitch}`);
                                this.toneSampler.triggerAttackRelease(Tone.Frequency(pitch).toNote(), "16n", time, sequenceDataForTone[r][col].velocity * Constants.defaultVelocity);
                            }
                        });
                    }
                }
                // ... other types
            }, Array.from(Array(sequenceLengthForTone).keys()), "16n");
            this.patternPlayerSequence.loop = true;
        } catch (error) {
            console.error(`[Track ${this.id} recreateToneSequence] Error creating Tone.Sequence:`, error);
            this.patternPlayerSequence = null;
        }
        if (this.appServices.updateTrackUI && typeof this.appServices.updateTrackUI === 'function') this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
    }

    async schedulePlayback(transportStartTime, transportStopTime) {
        const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        console.log(`[Track ${this.id} "${this.name}"] schedulePlayback. Mode: ${playbackMode}. Transport Start: ${transportStartTime.toFixed(2)}`);

        if (typeof this.stopPlayback === 'function') this.stopPlayback();
        else console.warn(`[Track ${this.id}] stopPlayback method missing.`);

        if (playbackMode === 'timeline') {
            // ... (Timeline playback logic as per response #21) ...
        } else { // Sequencer Mode
            if (!this.patternPlayerSequence || this.patternPlayerSequence.disposed) {
                console.log(`[Track ${this.id} schedulePlayback] Sequencer: patternPlayerSequence invalid, calling recreateToneSequence.`);
                if (typeof this.recreateToneSequence === 'function') this.recreateToneSequence(true, transportStartTime);
                else console.error(`[Track ${this.id} schedulePlayback] recreateToneSequence method missing.`);
            }

            if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
                // console.log(`[Track ${this.id} schedulePlayback] Sequencer: patternPlayerSequence exists. State: ${this.patternPlayerSequence.state}, Loop: ${this.patternPlayerSequence.loop}`);
                if (this.patternPlayerSequence.state === 'started') {
                    try {this.patternPlayerSequence.stop(Tone.Transport.now());} catch(e){console.warn("Err stopping existing seq player during schedule", e)}
                }
                console.log(`[Track ${this.id} schedulePlayback] Sequencer: Attempting to start patternPlayerSequence at transport offset: ${transportStartTime.toFixed(2)}s.`);
                try {
                    this.patternPlayerSequence.start(transportStartTime);
                    console.log(`[Track ${this.id} schedulePlayback] patternPlayerSequence.start() called. New state: ${this.patternPlayerSequence.state}`);
                } catch(e) {
                    console.error(`[Track ${this.id} schedulePlayback] Error starting patternPlayerSequence:`, e);
                    if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) try {this.patternPlayerSequence.dispose();} catch(de){}
                    this.patternPlayerSequence = null;
                }
            } else {
                 console.warn(`[Track ${this.id} schedulePlayback] Sequencer: patternPlayerSequence still invalid for "${this.name}" after recreation attempt.`);
            }
        }
    }

    stopPlayback() { /* ... same as previous robust version ... */ }
    async addAudioClip(blob, startTime) { /* ... same as previous ... */ }
    async addExternalAudioFileAsClip(audioFileBlob, startTime, clipName = null) { /* ... same as previous ... */ }
    addSequenceClipToTimeline(sourceSequenceId, startTime, clipName = null) { /* ... same as previous ... */ }
    async _reschedulePlaybackIfNeeded(clipStartTime, modeHint) { /* ... same as previous ... */ }
    async getBlobDuration(blob) { /* ... same as previous ... */ }
    async updateAudioClipPosition(clipId, newStartTime) { /* ... same as previous ... */ }
    dispose() { /* ... same robust version ... */ }
}
