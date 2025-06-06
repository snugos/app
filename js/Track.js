// js/Track.js - Track Class Module

import * as Constants from './constants.js';
import { createEffectInstance, getEffectDefaultParams as getEffectDefaultParamsFromRegistry, AVAILABLE_EFFECTS } from './effectsRegistry.js';
import { storeAudio, getAudio } from './db.js';


export class Track {
    constructor(id, type, initialData = null, appServices = {}) {
        this.id = initialData?.id || id;
        this.type = type;
        this.appServices = appServices || {}; // Ensure appServices is an object

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
        this.previousVolumeBeforeMute = initialData?.volume ?? 0.7; // Store the "actual" volume

        // Synth specific
        if (this.type === 'Synth') {
            this.synthEngineType = initialData?.synthEngineType || 'MonoSynth';
            this.synthParams = initialData?.synthParams ? JSON.parse(JSON.stringify(initialData.synthParams)) : this.getDefaultSynthParams();
        } else {
            this.synthEngineType = null;
            this.synthParams = {};
        }

        // Sampler (Slicer) specific
        this.samplerAudioData = { // Stores metadata, not the AudioBuffer itself
            fileName: initialData?.samplerAudioData?.fileName || null,
            audioBufferDataURL: initialData?.samplerAudioData?.audioBufferDataURL || null, // For backward compat, prefer dbKey
            dbKey: initialData?.samplerAudioData?.dbKey || null, // Key for IndexedDB
            status: initialData?.samplerAudioData?.status || (initialData?.samplerAudioData?.dbKey || initialData?.samplerAudioData?.audioBufferDataURL ? 'missing' : 'empty') // 'empty', 'loading', 'loaded', 'error', 'missing', 'missing_db'
        };
        this.audioBuffer = null; // Actual Tone.Buffer instance, loaded at runtime
        this.slices = initialData?.slices && initialData.slices.length > 0 ?
            JSON.parse(JSON.stringify(initialData.slices)) :
            Array(Constants.numSlices || 16).fill(null).map(() => ({ // Default empty slices, fallback for numSlices
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


        // Instrument Sampler specific
        this.instrumentSamplerSettings = {
            sampleUrl: initialData?.instrumentSamplerSettings?.sampleUrl || null, // Legacy, for initial load if any
            audioBuffer: null, // Actual Tone.Buffer, loaded at runtime
            audioBufferDataURL: initialData?.instrumentSamplerSettings?.audioBufferDataURL || null, // Backward compat
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
        this.toneSampler = null; // The Tone.Sampler instance

        // Drum Sampler specific
        this.drumSamplerPads = Array(Constants.numDrumSamplerPads || 16).fill(null).map((_, padIdx) => { // Fallback for numDrumSamplerPads
            const initialPadData = initialData?.drumSamplerPads?.[padIdx];
            return {
                sampleUrl: initialPadData?.sampleUrl || null,
                audioBuffer: null,
                audioBufferDataURL: initialPadData?.audioBufferDataURL || null,
                originalFileName: initialPadData?.originalFileName || null,
                dbKey: initialPadData?.dbKey || null,
                volume: initialPadData?.volume ?? 0.7,
                pitchShift: initialPadData?.pitchShift ?? 0,
                envelope: initialPadData?.envelope ? JSON.parse(JSON.stringify(initialData.envelope)) : { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 },
                status: initialPadData?.status || (initialData?.dbKey || initialData?.audioBufferDataURL ? 'missing' : 'empty'),
                autoStretchEnabled: initialPadData?.autoStretchEnabled || false,
                stretchOriginalBPM: initialPadData?.stretchOriginalBPM || 120,
                stretchBeats: initialPadData?.stretchBeats || 1,
            };
        });
        this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
        this.drumPadPlayers = Array(Constants.numDrumSamplerPads || 16).fill(null); // Fallback

        // Effects
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

        // Audio Nodes
        this.gainNode = null; this.trackMeter = null; this.outputNode = null;
        this.instrument = null;
        this.input = null; // This will be the track's effectSend GainNode

        this.sequences = [];
        this.activeSequenceId = null;
        this.timelineClips = initialData?.timelineClips ? JSON.parse(JSON.stringify(initialData.timelineClips)) : [];


        if (this.type !== 'Audio') {
            if (initialData?.sequences && Array.isArray(initialData.sequences) && initialData.sequences.length > 0) {
                this.sequences = JSON.parse(JSON.stringify(initialData.sequences));
                if (initialData.activeSequenceId && this.sequences.find(s => s.id === initialData.activeSequenceId)) {
                    this.activeSequenceId = initialData.activeSequenceId;
                } else {
                    this.activeSequenceId = this.sequences[0].id; 
                    console.warn(`[Track ${this.id} Constructor] initialData.activeSequenceId was invalid/missing. Defaulted to first sequence ID: ${this.activeSequenceId}`);
                }
            } else {
                this.sequences = []; 
            }
            if (this.sequences.length === 0 || !this.activeSequenceId) {
                console.log(`[Track ${this.id} Constructor] No valid sequences found. Creating new default sequence.`);
                this.createNewSequence("Sequence 1", Constants.DEFAULT_STEPS_PER_BAR || 16, true); 
            }
        } else { 
            this.sequences = []; 
            this.activeSequenceId = null;
            if (initialData?.audioClips && Array.isArray(initialData.audioClips)) {
                 initialData.audioClips.forEach(ac => {
                    if (!ac || !ac.dbKey) return;
                    const existingClip = this.timelineClips.find(tc => tc.sourceId === ac.dbKey && tc.type === 'audio' && tc.startTime === (ac.startTime || 0));
                    if (!existingClip) {
                        this.timelineClips.push({
                            id: ac.id || `audioclip_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`,
                            type: 'audio',
                            sourceId: ac.dbKey,
                            startTime: ac.startTime || 0,
                            duration: ac.duration || 0, 
                            name: ac.name || `Rec Clip ${this.timelineClips.filter(c => c.type === 'audio').length + 1}`
                        });
                    }
                });
           }
        }
        this.patternPlayerSequence = null;

        // UI related
        this.waveformCanvasCtx = null;
        this.instrumentWaveformCanvasCtx = null;
        this.automation = initialData?.automation ? JSON.parse(JSON.stringify(initialData.automation)) : { volume: [] };
        this.inspectorControls = {};

        // Audio Track specific
        this.inputChannel = null; // For live input (monitoring)
        this.clipPlayers = new Map(); // For timeline clip playback
    }

    setName(newName, skipUndo = false) { /* ... (implementation unchanged) ... */ }
    getActiveSequence() { /* ... (implementation unchanged) ... */ }
    getActiveSequenceData() { /* ... (implementation unchanged) ... */ }
    getActiveSequenceLength() { /* ... (implementation unchanged) ... */ }
    getDefaultSynthParams() { /* ... (implementation unchanged) ... */ }
    async initializeAudioNodes() { /* ... (implementation unchanged) ... */ }
    rebuildEffectChain() { /* ... (implementation unchanged) ... */ }
    addEffect(effectType) { /* ... (implementation unchanged) ... */ }
    removeEffect(effectId) { /* ... (implementation unchanged) ... */ }
    updateEffectParam(effectId, paramPath, value) { /* ... (implementation unchanged) ... */ }
    reorderEffect(effectId, newIndex) { /* ... (implementation unchanged) ... */ }
    async fullyInitializeAudioResources() { /* ... (implementation unchanged) ... */ }
    async initializeInstrument() { /* ... (implementation unchanged) ... */ }
    setupSlicerMonoNodes() { /* ... (implementation unchanged) ... */ }
    disposeSlicerMonoNodes() { /* ... (implementation unchanged) ... */ }
    setupToneSampler() { /* ... (implementation unchanged) ... */ }
    setVolume(volume, fromInteraction = false) { /* ... (implementation unchanged) ... */ }
    applyMuteState() { /* ... (implementation unchanged) ... */ }
    applySoloState() { /* ... (implementation unchanged) ... */ }
    setSynthParam(paramPath, value) { /* ... (implementation unchanged) ... */ }
    setSliceVolume(sliceIndex, volume) { /* ... (implementation unchanged) ... */ }
    setSlicePitchShift(sliceIndex, semitones) { /* ... (implementation unchanged) ... */ }
    setSliceLoop(sliceIndex, loop) { /* ... (implementation unchanged) ... */ }
    setSliceReverse(sliceIndex, reverse) { /* ... (implementation unchanged) ... */ }
    setSliceEnvelopeParam(sliceIndex, param, value) { /* ... (implementation unchanged) ... */ }
    setDrumSamplerPadVolume(padIndex, volume) { /* ... (implementation unchanged) ... */ }
    setDrumSamplerPadPitch(padIndex, pitch) { /* ... (implementation unchanged) ... */ }
    setDrumSamplerPadEnv(padIndex, param, value) { /* ... (implementation unchanged) ... */ }
    setDrumSamplerPadAutoStretch(padIndex, enabled) { /* ... (implementation unchanged) ... */ }
    setDrumSamplerPadStretchOriginalBPM(padIndex, bpm) { /* ... (implementation unchanged) ... */ }
    setDrumSamplerPadStretchBeats(padIndex, beats) { /* ... (implementation unchanged) ... */ }
    setInstrumentSamplerRootNote(noteName) { /* ... (implementation unchanged) ... */ }
    setInstrumentSamplerLoop(loop) { /* ... (implementation unchanged) ... */ }
    setInstrumentSamplerLoopStart(time) { /* ... (implementation unchanged) ... */ }
    setInstrumentSamplerLoopEnd(time) { /* ... (implementation unchanged) ... */ }
    setInstrumentSamplerEnv(param, value) { /* ... (implementation unchanged) ... */ }
    _captureUndoState(description) { /* ... (implementation unchanged) ... */ }

    createNewSequence(name = `Sequence ${this.sequences.length + 1}`, initialLengthSteps = Constants.DEFAULT_STEPS_PER_BAR || 16, skipUndoAndUI = false) {
        if (this.type === 'Audio') return null;
        const newSeqId = `seq_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        let numRowsForGrid;

        // Defensive checks for constants
        const synthPitchesLength = (Constants.SYNTH_PITCHES && Array.isArray(Constants.SYNTH_PITCHES)) ? Constants.SYNTH_PITCHES.length : 0;
        const numSlicesConst = (typeof Constants.numSlices === 'number' && Constants.numSlices > 0) ? Constants.numSlices : 16; 
        const numDrumPadsConst = (typeof Constants.numDrumSamplerPads === 'number' && Constants.numDrumSamplerPads > 0) ? Constants.numDrumSamplerPads : 16; 

        if (this.type === 'Synth' || this.type === 'InstrumentSampler') {
            numRowsForGrid = synthPitchesLength > 0 ? synthPitchesLength : 48; // Fallback to 48 (4 octaves) if constant is not ready
            if (synthPitchesLength === 0) console.warn(`[Track ${this.id} createNewSequence] Constants.SYNTH_PITCHES was empty or invalid, defaulting to 48 rows.`);
        } else if (this.type === 'Sampler') {
            numRowsForGrid = (this.slices && this.slices.length > 0) ? this.slices.length : numSlicesConst;
        } else if (this.type === 'DrumSampler') {
            numRowsForGrid = numDrumPadsConst;
        } else {
            numRowsForGrid = 1; 
        }

        if (numRowsForGrid <= 0) {
             console.warn(`[Track ${this.id} createNewSequence] numRowsForGrid calculated as <= 0 for type ${this.type} (calculated ${numRowsForGrid}), defaulting to 16.`);
             numRowsForGrid = 16; 
        }
        
        const actualLength = Math.max(Constants.STEPS_PER_BAR || 16, initialLengthSteps);

        const newSequence = {
            id: newSeqId,
            name: name,
            data: Array(numRowsForGrid).fill(null).map(() => Array(actualLength).fill(null)),
            length: actualLength
        };
        this.sequences.push(newSequence);
        this.activeSequenceId = newSeqId;
        this.recreateToneSequence(true); 

        if (!skipUndoAndUI) { 
            if (this.appServices.updateTrackUI) {
                this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
            }
            this._captureUndoState(`Create Sequence "${name}" on ${this.name}`);
        }
        console.log(`[Track ${this.id}] Created new sequence: "${name}" (ID: ${newSeqId}), Rows: ${numRowsForGrid}, Length: ${actualLength}. Set as active. SkipUndoAndUI: ${skipUndoAndUI}`);
        return newSequence;
    }

    deleteSequence(sequenceId) { /* ... */ }
    renameSequence(sequenceId, newName) { /* ... */ }
    duplicateSequence(sequenceId) { /* ... */ }
    setActiveSequence(sequenceId) { /* ... */ }
    doubleSequence() { /* ... */ }
    setSequenceLength(newLengthInSteps, skipUndoCapture = false) { /* ... */ }
    recreateToneSequence(forceRestart = false, startTimeOffset = 0) { /* ... */ }
    async addAudioClip(blob, startTime) { /* ... */ }
    async addExternalAudioFileAsClip(audioFileBlob, startTime, clipName = null) { /* ... */ }
    addSequenceClipToTimeline(sourceSequenceId, startTime, clipName = null) { /* ... */ }
    async getBlobDuration(blob) { /* ... */ }
    async schedulePlayback(transportStartTime, transportStopTime) { /* ... */ }
    stopPlayback() { /* ... */ }
    async updateAudioClipPosition(clipId, newStartTime) { /* ... */ }
    dispose() { /* ... */ }
}
