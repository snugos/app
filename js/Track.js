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
        console.log(`[Track ${this.id} Constructor] START for "${this.name}", Type: "${this.type}". Initial sequences count: ${initialData?.sequences?.length}, Active ID: ${initialData?.activeSequenceId}`);

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

        this.sequences = []; // Initialize as empty array
        this.activeSequenceId = null; // Initialize as null
        this.timelineClips = initialData?.timelineClips ? JSON.parse(JSON.stringify(initialData.timelineClips)) : [];
        this.clipPlayers = new Map();

        if (this.type !== 'Audio') {
            if (initialData?.sequences && initialData.sequences.length > 0) {
                this.sequences = JSON.parse(JSON.stringify(initialData.sequences));
                this.activeSequenceId = initialData.activeSequenceId || (this.sequences[0] ? this.sequences[0].id : null);
                console.log(`[Track ${this.id} Constructor] Initialized with ${this.sequences.length} sequences from initialData. Active ID: ${this.activeSequenceId}`);
            }
            // Default sequence creation is deferred to initializeDefaultSequence()
        } else {
            this.inputChannel = null;
        }
        this.patternPlayerSequence = null;
        this.waveformCanvasCtx = null; this.instrumentWaveformCanvasCtx = null;
        this.automation = initialData?.automation ? JSON.parse(JSON.stringify(initialData.automation)) : { volume: [] };
        this.inspectorControls = {};
        console.log(`[Track ${this.id} Constructor] END for "${this.name}". Initial sequences count: ${this.sequences?.length}, Active ID: ${this.activeSequenceId}`);
    }

    initializeDefaultSequence() {
        console.log(`[Track ${this.id} initializeDefaultSequence] Called for "${this.name}". Current sequences:`, JSON.parse(JSON.stringify(this.sequences)), `ActiveSeqID before: ${this.activeSequenceId}`);
        if (this.type !== 'Audio' && (!this.sequences || this.sequences.length === 0)) {
            console.log(`[Track ${this.id}] No initial sequences found or sequences array empty, CREATING DEFAULT.`);
            if (typeof this.createNewSequence === 'function') {
                const newSeq = this.createNewSequence("Sequence 1", Constants.defaultStepsPerBar, true); // true for skipUndo
                if (newSeq) {
                    console.log(`[Track ${this.id} initializeDefaultSequence] Default sequence CREATED. New ActiveSeqID: ${this.activeSequenceId}, Sequences count: ${this.sequences?.length}`);
                } else {
                    console.error(`[Track ${this.id} initializeDefaultSequence] createNewSequence was called but returned null/undefined.`);
                }
            } else {
                console.error(`[Track ${this.id}] CRITICAL ERROR in initializeDefaultSequence: this.createNewSequence is NOT a function!`);
                if (this.appServices.showNotification && typeof this.appServices.showNotification === 'function') {
                    this.appServices.showNotification(`Error initializing track ${this.name}: Default sequence creation failed.`, 5000);
                }
            }
        } else if (this.type !== 'Audio' && this.sequences && this.sequences.length > 0 && !this.activeSequenceId) {
            this.activeSequenceId = this.sequences[0]?.id || null;
            console.log(`[Track ${this.id} initializeDefaultSequence] Sequences existed from initialData, but no activeId. Set activeSequenceId to: ${this.activeSequenceId}`);
        } else {
            console.log(`[Track ${this.id} initializeDefaultSequence] Conditions for creating default sequence not met (Type: ${this.type}, SeqCount: ${this.sequences?.length}) or activeSequenceId already set (${this.activeSequenceId}).`);
        }
    }

    _initializeSlicerVoicePool() { /* ... same ... */ }
    _getVoiceFromSlicerPool() { /* ... same ... */ }
    _returnVoiceToSlicerPool(voiceUnit) { /* ... same ... */ }
    setName(newName, skipUndo = false) { /* ... same ... */ }

    getActiveSequence() {
        if (this.type === 'Audio') return null;
        if (!this.activeSequenceId) {
            // console.warn(`[Track ${this.id} getActiveSequence] No activeSequenceId set.`);
            return null;
        }
        if (!this.sequences || this.sequences.length === 0) {
            // console.warn(`[Track ${this.id} getActiveSequence] Sequences array is empty or null.`);
            return null;
        }
        const seq = this.sequences.find(s => s.id === this.activeSequenceId);
        if (!seq) {
            // console.warn(`[Track ${this.id} getActiveSequence] Active sequence ID "${this.activeSequenceId}" NOT FOUND in sequences array:`, JSON.parse(JSON.stringify(this.sequences.map(s => s.id)) ) );
        }
        return seq;
    }

    getActiveSequenceData() { /* ... same ... */ }
    getActiveSequenceLength() { /* ... same ... */ }
    getDefaultSynthParams() { /* ... same ... */ }
    async initializeAudioNodes() { /* ... same robust version ... */ }
    rebuildEffectChain() { /* ... same robust version with _performRebuildEffectChain ... */ }
    _performRebuildEffectChain() { /* ... same robust version with detailed logging ... */ }
    addEffect(effectType) {
        console.log(`[Track ${this.id} addEffect] Attempting to add effect: ${effectType}`);
        if (!this.appServices.effectsRegistryAccess || typeof this.appServices.effectsRegistryAccess.AVAILABLE_EFFECTS !== 'object') {
            console.error(`[Track ${this.id}] effectsRegistryAccess or AVAILABLE_EFFECTS not available.`);
            if (this.appServices.showNotification && typeof this.appServices.showNotification === 'function') this.appServices.showNotification("Cannot add effect: Effects registry missing.", 3000);
            return;
        }
        const AVAILABLE_EFFECTS_LOCAL = this.appServices.effectsRegistryAccess.AVAILABLE_EFFECTS;
        const getEffectDefaultParamsLocal = this.appServices.effectsRegistryAccess.getEffectDefaultParams;

        if (!AVAILABLE_EFFECTS_LOCAL[effectType]) {
            console.warn(`[Track ${this.id}] Effect type "${effectType}" not found in registry.`);
            if (this.appServices.showNotification && typeof this.appServices.showNotification === 'function') this.appServices.showNotification(`Effect type "${effectType}" not found.`, 3000);
            return;
        }
        const defaultParams = getEffectDefaultParamsLocal ? getEffectDefaultParamsLocal(effectType) : getEffectDefaultParamsFromRegistry(effectType);
        console.log(`[Track ${this.id} addEffect] Creating Tone instance for ${effectType} with params:`, JSON.parse(JSON.stringify(defaultParams)));
        const toneNode = createEffectInstance(effectType, defaultParams);

        if (toneNode) {
            const effectId = `effect-${this.id}-${effectType}-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
            this.activeEffects.push({
                id: effectId, type: effectType, toneNode: toneNode, params: JSON.parse(JSON.stringify(defaultParams))
            });
            console.log(`[Track ${this.id} addEffect] Effect "${effectType}" (ID: ${effectId}) pushed to activeEffects. Count: ${this.activeEffects.length}. Calling rebuildEffectChain.`);
            this.rebuildEffectChain();
            if (this.appServices.updateTrackUI && typeof this.appServices.updateTrackUI === 'function') {
                this.appServices.updateTrackUI(this.id, 'effectsListChanged');
                console.log(`[Track ${this.id} addEffect] updateTrackUI called for effectsListChanged.`);
            } else {
                console.warn(`[Track ${this.id} addEffect] updateTrackUI service not available after adding effect.`);
            }
        } else {
            console.error(`[Track ${this.id} addEffect] CRITICAL: Could not create Tone.js instance for effect ${effectType}`);
            if (this.appServices.showNotification && typeof this.appServices.showNotification === 'function') this.appServices.showNotification(`Could not create effect: ${effectType}`, 3000);
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

    createNewSequence(name = `Sequence ${this.sequences.length + 1}`, initialLengthSteps = Constants.defaultStepsPerBar, skipUndo = false) {
        console.log(`[Track ${this.id} createNewSequence] Called for "${this.name}" with name: "${name}", length: ${initialLengthSteps}, skipUndo: ${skipUndo}`);
        if (this.type === 'Audio') {
            console.log(`[Track ${this.id} createNewSequence] Bailing: Track type is Audio.`);
            return null;
        }
        const newSeqId = `seq_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        let numRowsForGrid;

        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRowsForGrid = Constants.synthPitches.length;
        else if (this.type === 'Sampler') numRowsForGrid = (this.slices && this.slices.length > 0) ? this.slices.length : Constants.numSlices;
        else if (this.type === 'DrumSampler') numRowsForGrid = Constants.numDrumSamplerPads;
        else numRowsForGrid = 1;

        if (numRowsForGrid <= 0) {
             console.warn(`[Track ${this.id} createNewSequence] numRowsForGrid calculated as <= 0 for type ${this.type}, defaulting to 1.`);
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
        this.activeSequenceId = newSeqId; // This is critical
        console.log(`[Track ${this.id} createNewSequence] Sequence created. ID: ${newSeqId}, ActiveSeqID set to: ${this.activeSequenceId}. Total sequences: ${this.sequences.length}`);

        if (typeof this.recreateToneSequence === 'function') {
            this.recreateToneSequence(true);
        } else {
            console.error(`[Track ${this.id}] createNewSequence: recreateToneSequence is not a function!`);
        }
        if (this.appServices.updateTrackUI && typeof this.appServices.updateTrackUI === 'function') this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        else console.warn(`[Track ${this.id}] updateTrackUI service not available in createNewSequence.`);

        if (!skipUndo && typeof this._captureUndoState === 'function') this._captureUndoState(`Create Sequence "${name}" on ${this.name}`);

        const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        if (typeof Tone !== 'undefined' && Tone.Transport.state === 'started' && playbackMode === 'sequencer') {
            // console.log(`[Track ${this.id} createNewSequence] Transport running, scheduling new sequence "${name}".`);
            const transportLoopEnd = Tone.Transport.loopEnd || (Tone.Transport.seconds + 300);
            if (typeof this.schedulePlayback === 'function') {
                this.schedulePlayback(Tone.Transport.seconds, transportLoopEnd);
            } else {
                 console.error(`[Track ${this.id} createNewSequence] schedulePlayback is not a function!`);
            }
        }
        return newSequence;
    }

    deleteSequence(sequenceId) { /* ... same as previous ... */ }
    renameSequence(sequenceId, newName) { /* ... same as previous ... */ }
    duplicateSequence(sequenceId) { /* ... same as previous ... */ }
    setActiveSequence(sequenceId) { /* ... same as previous ... */ }
    doubleSequence() { /* ... same as previous ... */ }
    setSequenceLength(newLengthInSteps, skipUndoCapture = false) { /* ... same as previous ... */ }
    recreateToneSequence(forceRestart = false, startTimeOffset = 0) { /* ... same as previous with enhanced logging in callback ... */ }
    async addAudioClip(blob, startTime) { /* ... same as previous ... */ }
    async addExternalAudioFileAsClip(audioFileBlob, startTime, clipName = null) { /* ... same as previous ... */ }
    addSequenceClipToTimeline(sourceSequenceId, startTime, clipName = null) { /* ... same as previous ... */ }
    async _reschedulePlaybackIfNeeded(clipStartTime, modeHint) { /* ... same as previous ... */ }
    async getBlobDuration(blob) { /* ... same as previous ... */ }
    async schedulePlayback(transportStartTime, transportStopTime) { /* ... same as previous with enhanced logging ... */ }
    stopPlayback() { /* ... same as previous ... */ }
    async updateAudioClipPosition(clipId, newStartTime) { /* ... same as previous ... */ }
    dispose() { /* ... same robust version ... */ }
}
