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
        // console.log(`[Track ${this.id} Constructor] Initializing track "${this.name}" of type "${this.type}". InitialData present: ${!!initialData}`);

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
            return { /* ... pad data ... */ }; // Same as previous
        });
        this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
        this.drumPadPlayers = Array(Constants.numDrumSamplerPads).fill(null);

        this.activeEffects = [];
        if (initialData && initialData.activeEffects && Array.isArray(initialData.activeEffects)) {
            // ... (effect loading logic remains same)
        }

        this.gainNode = null; this.trackMeter = null;
        this.output = this.gainNode; // This will be set in initializeAudioNodes

        this.instrument = null;

        this.sequences = [];
        this.activeSequenceId = null;
        this.timelineClips = initialData?.timelineClips ? JSON.parse(JSON.stringify(initialData.timelineClips)) : [];

        this.clipPlayers = new Map();

        // MODIFICATION: Moved initial sequence creation out of constructor to a new method
        if (this.type !== 'Audio') {
            if (initialData?.sequences && initialData.sequences.length > 0) {
                this.sequences = JSON.parse(JSON.stringify(initialData.sequences));
                this.activeSequenceId = initialData.activeSequenceId || (this.sequences[0] ? this.sequences[0].id : null);
            }
            // Default sequence will be created by initializeDefaultSequence() if needed
        } else {
            this.inputChannel = null;
        }
        this.patternPlayerSequence = null;

        this.waveformCanvasCtx = null;
        this.instrumentWaveformCanvasCtx = null;
        this.automation = initialData?.automation ? JSON.parse(JSON.stringify(initialData.automation)) : { volume: [] };
        this.inspectorControls = {};
    }

    // MODIFICATION: New method to initialize default sequence after construction
    initializeDefaultSequence() {
        if (this.type !== 'Audio' && (!this.sequences || this.sequences.length === 0)) {
            // console.log(`[Track ${this.id}] No initial sequences found, creating default.`);
            if (typeof this.createNewSequence === 'function') {
                this.createNewSequence("Sequence 1", Constants.defaultStepsPerBar, true); // true for skipUndo
            } else {
                // This state indicates a fundamental problem with the Track class or its instantiation.
                console.error(`[Track ${this.id}] CRITICAL ERROR: createNewSequence method is not defined on this Track instance. Cannot create default sequence.`);
                if (this.appServices.showNotification) {
                    this.appServices.showNotification(`Error initializing track ${this.name}: Cannot create default sequence.`, 5000);
                }
            }
        }
    }


    _initializeSlicerVoicePool() { /* ... same ... */ }
    _getVoiceFromSlicerPool() { /* ... same ... */ }
    _returnVoiceToSlicerPool(voiceUnit) { /* ... same ... */ }
    setName(newName, skipUndo = false) { /* ... same ... */ }
    getActiveSequence() { /* ... same ... */ }
    getActiveSequenceData() { /* ... same ... */ }
    getActiveSequenceLength() { /* ... same ... */ }
    getDefaultSynthParams() { /* ... same ... */ }
    async initializeAudioNodes() { /* ... same as last provided, ensure service checks ... */ }
    rebuildEffectChain() { /* ... same as last provided with _performRebuildEffectChain ... */ }
    _performRebuildEffectChain() { /* ... same as last provided ... */ }
    addEffect(effectType) { /* ... same, ensure service checks ... */ }
    removeEffect(effectId) { /* ... same ... */ }
    updateEffectParam(effectId, paramPath, value) { /* ... same ... */ }
    reorderEffect(effectId, newIndex) { /* ... same ... */ }
    async fullyInitializeAudioResources() { /* ... same as last provided, ensure service checks ... */ }
    async initializeInstrument() { /* ... same ... */ }
    setupSlicerMonoNodes() { /* ... same ... */ }
    disposeSlicerMonoNodes() { /* ... same ... */ }
    setupToneSampler() { /* ... same ... */ }
    setVolume(volume, fromInteraction = false) { /* ... same ... */ }
    applyMuteState() { /* ... same, ensure service checks ... */ }
    applySoloState() { /* ... same ... */ }
    setSynthParam(paramPath, value) { /* ... same ... */ }
    setSliceVolume(sliceIndex, volume) { /* ... same ... */ }
    setSlicePitchShift(sliceIndex, semitones) { /* ... same ... */ }
    setSliceLoop(sliceIndex, loop) { /* ... same ... */ }
    setSliceReverse(sliceIndex, reverse) { /* ... same ... */ }
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
        // ... (This method remains the same as your last provided version, including playback fix)
        if (this.type === 'Audio') return null;
        const newSeqId = `seq_${this.id}_${Date.now()}_${Math.random().toString(36).substr(2,5)}`;
        let numRowsForGrid;

        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRowsForGrid = Constants.synthPitches.length;
        else if (this.type === 'Sampler') numRowsForGrid = (this.slices && this.slices.length > 0) ? this.slices.length : Constants.numSlices;
        else if (this.type === 'DrumSampler') numRowsForGrid = Constants.numDrumSamplerPads;
        else numRowsForGrid = 1;

        if (numRowsForGrid <= 0) {
             console.warn(`[Track ${this.id} createNewSequence] numRowsForGrid was <= 0 for type ${this.type} (calculated ${numRowsForGrid}), defaulting to 1.`);
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
        if (typeof this.recreateToneSequence === 'function') {
            this.recreateToneSequence(true);
        } else {
            console.error(`[Track ${this.id}] createNewSequence: recreateToneSequence is not a function!`);
        }
        if (this.appServices.updateTrackUI && typeof this.appServices.updateTrackUI === 'function') this.appServices.updateTrackUI(this.id, 'sequencerContentChanged');
        if (!skipUndo) this._captureUndoState(`Create Sequence "${name}" on ${this.name}`);

        const playbackMode = this.appServices.getPlaybackMode ? this.appServices.getPlaybackMode() : 'sequencer';
        if (typeof Tone !== 'undefined' && Tone.Transport.state === 'started' && playbackMode === 'sequencer') {
            // console.log(`[Track ${this.id}] Transport running in sequencer mode. Scheduling new sequence "${name}".`);
            const transportLoopEnd = Tone.Transport.loopEnd || (Tone.Transport.seconds + 300);
            if (typeof this.schedulePlayback === 'function') {
                this.schedulePlayback(Tone.Transport.seconds, transportLoopEnd);
            } else {
                 console.error(`[Track ${this.id}] createNewSequence: schedulePlayback is not a function!`);
            }
        }
        return newSequence;
    }
    // ... (deleteSequence, renameSequence, duplicateSequence, setActiveSequence, doubleSequence, setSequenceLength, recreateToneSequence
    //      addAudioClip, addExternalAudioFileAsClip, addSequenceClipToTimeline, _reschedulePlaybackIfNeeded, getBlobDuration,
    //      schedulePlayback, stopPlayback, updateAudioClipPosition
    //      all remain the same as the previous version with playback fixes and robustness checks.)

    // MODIFICATION: Enhanced dispose method with more detailed, sequential, and try-caught disposal
    dispose() {
        const trackNameForLog = this.name || `Track ${this.id}`;
        console.log(`[Track Dispose START ${this.id}] For track: "${trackNameForLog}" of type ${this.type}`);

        // 1. Stop any ongoing playback for this track
        try {
            if (typeof this.stopPlayback === 'function') {
                this.stopPlayback();
                console.log(`[Track Dispose ${this.id}] Playback stopped.`);
            }
        } catch (e) {
            console.warn(`[Track Dispose ${this.id}] Error in stopPlayback:`, e.message);
        }

        // 2. Dispose Tone.js objects owned by the track
        // Synth/InstrumentSampler instrument
        if (this.instrument && typeof this.instrument.dispose === 'function' && !this.instrument.disposed) {
            try { this.instrument.dispose(); console.log(`[Track Dispose ${this.id}] Synth instrument disposed.`); }
            catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing instrument:`, e.message); }
        }
        this.instrument = null;

        // Tone.Sampler for InstrumentSampler
        if (this.toneSampler && typeof this.toneSampler.dispose === 'function' && !this.toneSampler.disposed) {
            try { this.toneSampler.dispose(); console.log(`[Track Dispose ${this.id}] Tone.Sampler (for InstrumentSampler) disposed.`); }
            catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing toneSampler:`, e.message); }
        }
        this.toneSampler = null;

        // Sampler (Slicer) specific nodes and pool
        if (this.type === 'Sampler') {
            this.disposeSlicerMonoNodes(); // Handles slicerMonoPlayer, slicerMonoEnvelope, slicerMonoGain
            if (this._slicerVoicePool && Array.isArray(this._slicerVoicePool)) {
                this._slicerVoicePool.forEach(voiceUnit => {
                    if (voiceUnit.player && !voiceUnit.player.disposed) try { voiceUnit.player.dispose(); } catch(e){}
                    if (voiceUnit.envelope && !voiceUnit.envelope.disposed) try { voiceUnit.envelope.dispose(); } catch(e){}
                    if (voiceUnit.gain && !voiceUnit.gain.disposed) try { voiceUnit.gain.dispose(); } catch(e){}
                });
            }
            this._slicerVoicePool = [];
            this._slicerAvailableVoices = [];
            console.log(`[Track Dispose ${this.id}] Slicer voice pool resources cleared.`);
        }


        // Drum Sampler players
        (this.drumPadPlayers || []).forEach((player, index) => {
            if (player && typeof player.dispose === 'function' && !player.disposed) {
                try { player.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing drumPadPlayer ${index}:`, e.message); }
            }
            this.drumPadPlayers[index] = null;
        });
        // console.log(`[Track Dispose ${this.id}] Drum pad players disposed.`);

        // Effects
        (this.activeEffects || []).forEach(effect => {
            if (effect.toneNode && typeof effect.toneNode.dispose === 'function' && !effect.toneNode.disposed) {
                try { effect.toneNode.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing effect "${effect.type}":`, e.message); }
            }
        });
        this.activeEffects = [];
        // console.log(`[Track Dispose ${this.id}] Active effects disposed.`);

        // Main audio nodes for the track
        if (this.gainNode && typeof this.gainNode.dispose === 'function' && !this.gainNode.disposed) {
            try { this.gainNode.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing gainNode:`, e.message); }
        }
        this.gainNode = null;
        this.output = null; // Typically same as gainNode

        if (this.trackMeter && typeof this.trackMeter.dispose === 'function' && !this.trackMeter.disposed) {
            try { this.trackMeter.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing trackMeter:`, e.message); }
        }
        this.trackMeter = null;

        if (this.inputChannel && typeof this.inputChannel.dispose === 'function' && !this.inputChannel.disposed) {
            try { this.inputChannel.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing inputChannel:`, e.message); }
        }
        this.inputChannel = null;
        // console.log(`[Track Dispose ${this.id}] Main audio nodes (gain, meter, inputChannel) disposed.`);

        // Tone.Buffers (careful with shared buffers if any, but here they are per track instance)
        if (this.audioBuffer && typeof this.audioBuffer.dispose === 'function' && !this.audioBuffer.disposed) {
            try { this.audioBuffer.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing Sampler audioBuffer:`, e.message); }
        }
        this.audioBuffer = null;

        (this.drumSamplerPads || []).forEach(p => {
            if (p && p.audioBuffer && typeof p.audioBuffer.dispose === 'function' && !p.audioBuffer.disposed) {
                try { p.audioBuffer.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing DrumSampler pad audioBuffer:`, e.message); }
            }
            if (p) p.audioBuffer = null;
        });

        if (this.instrumentSamplerSettings?.audioBuffer && typeof this.instrumentSamplerSettings.audioBuffer.dispose === 'function' && !this.instrumentSamplerSettings.audioBuffer.disposed) {
            try { this.instrumentSamplerSettings.audioBuffer.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing InstrumentSampler audioBuffer:`, e.message); }
        }
        if (this.instrumentSamplerSettings) this.instrumentSamplerSettings.audioBuffer = null;
        // console.log(`[Track Dispose ${this.id}] Audio buffers disposed.`);

        // Tone.Sequence for pattern player
        if (this.patternPlayerSequence && typeof this.patternPlayerSequence.dispose === 'function' && !this.patternPlayerSequence.disposed) {
            try { this.patternPlayerSequence.dispose(); } catch(e){ console.warn(`[Track Dispose ${this.id}] Error disposing patternPlayerSequence:`, e.message); }
        }
        this.patternPlayerSequence = null;

        // 3. Close associated windows
        if (this.appServices.closeAllTrackWindows && typeof this.appServices.closeAllTrackWindows === 'function') {
            try {
                this.appServices.closeAllTrackWindows(this.id);
                // console.log(`[Track Dispose ${this.id}] Associated windows closed command issued.`);
            } catch (e) {
                console.warn(`[Track Dispose ${this.id}] Error calling closeAllTrackWindows:`, e.message);
            }
        } else {
            console.warn(`[Track Dispose ${this.id}] appServices.closeAllTrackWindows service not available.`);
        }

        // 4. Clear internal arrays and references
        this.sequences = [];
        this.timelineClips = [];
        if (this.clipPlayers) this.clipPlayers.clear();
        this.inspectorControls = {};
        this.waveformCanvasCtx = null;
        this.instrumentWaveformCanvasCtx = null;
        this.appServices = {}; // Break potential circular references
        // console.log(`[Track Dispose ${this.id}] Internal arrays and references cleared.`);

        console.log(`[Track Dispose END ${this.id}] Finished disposal for track: "${trackNameForLog}"`);
    }
}
