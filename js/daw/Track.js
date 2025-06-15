// js/daw/Track.js - Track Class Module (Refactored)

// Corrected imports for ClipManager and SequenceManager (now exported classes)
import { ClipManager } from './ClipManager.js';
import { SequenceManager } from './SequenceManager.js';
import { EffectChain } from './EffectChain.js';
// Corrected import for Constants. This file now explicitly imports it.
import * as Constants from './constants.js';

export class Track { //
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
        this.isSoloed = false; // Solo state is not persisted directly on track but managed by global soloedTrackId
        this.isMonitoringEnabled = initialData?.isMonitoringEnabled !== undefined ? initialData.isMonitoringEnabled : (this.type === 'Audio');
        this.previousVolumeBeforeMute = initialData?.volume ?? 0.7;

        // --- Core Audio Nodes ---
        // Ensure Tone.js is available before creating nodes
        if (!this.appServices.Tone) {
            console.error("Tone.js not loaded. Cannot create track audio nodes.");
            return;
        }
        this.input = new this.appServices.Tone.Gain();
        this.outputNode = new this.appServices.Tone.Gain(this.previousVolumeBeforeMute);
        this.trackMeter = new this.appServices.Tone.Meter();
        
        const masterBusInput = this.appServices.getMasterBusInputNode?.();
        if (masterBusInput) {
            this.outputNode.fan(this.trackMeter, masterBusInput);
        } else {
            // Fallback if master bus is not yet initialized (shouldn't happen with correct initialization flow)
            this.outputNode.fan(this.trackMeter, this.appServices.Tone.getDestination());
        }
        this.input.connect(this.outputNode);
        
        // --- Delegate to Managers ---
        this.effects = new EffectChain(this, this.appServices);
        this.sequences = new SequenceManager(this, this.appServices);
        this.clips = new ClipManager(this, this.appServices);

        this.instrument = null;
        this.synthEngineType = null;
        this.synthParams = {};
        this.samplerAudioData = { fileName: null, dbKey: null, status: 'empty' }; // Initialize explicitly
        this.audioBuffer = null;
        this.slices = [];
        this.selectedSliceForEdit = 0;
        this.drumSamplerPads = [];
        this.instrumentSamplerSettings = {
            originalFileName: null, dbKey: null, rootNote: 'C4', pitchShift: 0, loop: false, loopStart: 0, loopEnd: 0,
            envelope: { attack: 0.003, decay: 2.0, sustain: 1.0, release: 5.0 }, status: 'empty'
        };
        this.inputChannel = (this.type === 'Audio') ? new this.appServices.Tone.Gain().connect(this.input) : null;

        // --- Initialize from initialData ---
        // This part will be handled by the reconstructDAW's deserializeTrack method
        // For fresh track creation, these will remain at their defaults
        if (initialData) {
            this.deserialize(initialData);
        } else {
            // Setup defaults for newly created tracks
            if (this.type === 'Synth') {
                this.synthEngineType = 'MonoSynth';
                this.synthParams = this.getDefaultSynthParams();
            } else if (this.type === 'Sampler') {
                this.slices = Array(Constants.numSlices || 16).fill(null).map(() => ({ offset: 0, duration: 0, volume: 0.7, pitchShift: 0, loop: false, reverse: false, envelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 0.2 } }));
            } else if (this.type === 'DrumSampler') {
                this.drumSamplerPads = Array.from({ length: Constants.numDrumSamplerPads || 16 }, (_, i) => ({ originalFileName: null, dbKey: null, volume: 0.7, pitchShift: 0, audioBuffer: null }));
            }
        }
        
        // Ensure a default sequence exists for non-audio tracks
        if (this.type !== 'Audio' && this.sequences.sequences.length === 0) {
            this.sequences.createNewSequence("Sequence 1", 64, true); // `true` to skip undo capture for initial creation
        }
    }

    /**
     * Reconstructs the track state from a serialized data object.
     * This method is crucial for loading projects and undo/redo functionality.
     * @param {object} data - The serialized track data.
     */
    async deserialize(data) {
        this.id = data.id;
        this.type = data.type;
        this.name = data.name;
        this.isMuted = data.isMuted;
        this.previousVolumeBeforeMute = data.volume;
        // Solo state is determined by global soloedTrackId, not deserialized directly

        // Dispose existing Tone.js nodes before re-initializing
        this.instrument?.dispose();
        this.input?.dispose();
        this.outputNode?.dispose();
        this.trackMeter?.dispose();
        this.effects.dispose(); // Dispose effects chain explicitly

        // Re-create core audio nodes (important for Tone.js graph)
        this.input = new this.appServices.Tone.Gain();
        this.outputNode = new this.appServices.Tone.Gain(this.previousVolumeBeforeMute);
        this.trackMeter = new this.appServices.Tone.Meter();
        
        const masterBusInput = this.appServices.getMasterBusInputNode?.();
        if (masterBusInput) {
            this.outputNode.fan(this.trackMeter, masterBusInput);
        } else {
            this.outputNode.fan(this.trackMeter, this.appServices.Tone.getDestination());
        }
        this.input.connect(this.outputNode);

        // Re-initialize delegated managers
        this.effects = new EffectChain(this, this.appServices);
        this.sequences = new SequenceManager(this, this.appServices);
        this.clips = new ClipManager(this, this.appServices);

        // Deserialize specific properties based on track type
        switch (this.type) {
            case 'Synth':
                this.synthEngineType = data.synthEngineType || 'MonoSynth';
                this.synthParams = data.synthParams ? JSON.parse(JSON.stringify(data.synthParams)) : this.getDefaultSynthParams();
                break;
            case 'Sampler':
                this.samplerAudioData = data.samplerAudioData ? JSON.parse(JSON.stringify(data.samplerAudioData)) : { fileName: null, dbKey: null, status: 'empty' };
                this.slices = data.slices ? JSON.parse(JSON.stringify(data.slices)) : Array(Constants.numSlices).fill(null).map(() => ({ offset: 0, duration: 0, volume: 0.7, pitchShift: 0, loop: false, reverse: false, envelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 0.2 } }));
                this.selectedSliceForEdit = 0; // Reset to default on load
                // Asynchronously load audio buffer if dbKey exists
                if (this.samplerAudioData.dbKey) {
                    const audioBlob = await this.appServices.dbGetAudio(this.samplerAudioData.dbKey);
                    if (audioBlob) {
                        try {
                            this.audioBuffer = await new this.appServices.Tone.Buffer().load(URL.createObjectURL(audioBlob));
                            this.samplerAudioData.status = 'loaded';
                        } catch (e) {
                            console.error(`Error loading audio buffer for sampler track ${this.id}:`, e);
                            this.samplerAudioData.status = 'error';
                        }
                    }
                }
                break;
            case 'DrumSampler':
                this.drumSamplerPads = data.drumSamplerPads ? JSON.parse(JSON.stringify(data.drumSamplerPads)) : Array(Constants.numDrumSamplerPads).fill(null).map((_, i) => ({ originalFileName: null, dbKey: null, volume: 0.7, pitchShift: 0, audioBuffer: null }));
                this.selectedDrumPadForEdit = 0; // Reset to default on load
                // Asynchronously load audio buffers for pads
                for (let i = 0; i < this.drumSamplerPads.length; i++) {
                    const padData = this.drumSamplerPads[i];
                    if (padData.dbKey) {
                        const audioBlob = await this.appServices.dbGetAudio(padData.dbKey);
                        if (audioBlob) {
                            try {
                                padData.audioBuffer = await new this.appServices.Tone.Buffer().load(URL.createObjectURL(audioBlob));
                                padData.status = 'loaded'; // Add status to padData if needed
                            } catch (e) {
                                console.error(`Error loading audio buffer for drum pad ${i} on track ${this.id}:`, e);
                                padData.status = 'error';
                            }
                        }
                    }
                }
                break;
            case 'InstrumentSampler':
                this.instrumentSamplerSettings = data.instrumentSamplerSettings ? JSON.parse(JSON.stringify(data.instrumentSamplerSettings)) : {
                    originalFileName: null, dbKey: null, rootNote: 'C4', pitchShift: 0, loop: false, loopStart: 0, loopEnd: 0,
                    envelope: { attack: 0.003, decay: 2.0, sustain: 1.0, release: 5.0 }, status: 'empty'
                };
                if (this.instrumentSamplerSettings.dbKey) {
                    const audioBlob = await this.appServices.dbGetAudio(this.instrumentSamplerSettings.dbKey);
                    if (audioBlob) {
                        try {
                            this.instrumentSamplerSettings.audioBuffer = await new this.appServices.Tone.Buffer().load(URL.createObjectURL(audioBlob));
                            this.instrumentSamplerSettings.status = 'loaded';
                        } catch (e) {
                            console.error(`Error loading audio buffer for instrument sampler track ${this.id}:`, e);
                            this.instrumentSamplerSettings.status = 'error';
                        }
                    }
                }
                break;
            case 'Audio':
                this.isMonitoringEnabled = data.isMonitoringEnabled;
                this.inputChannel = new this.appServices.Tone.Gain().connect(this.input);
                break;
        }
        
        // Initialize managers with their respective data
        this.effects.initialize(data.activeEffects);
        this.sequences.initialize(data.sequences, data.activeSequenceId);
        this.clips.initialize(data.timelineClips);

        // Re-initialize the Tone.js instrument
        await this.initializeInstrument();
    }

    /**
     * Initializes the Tone.js instrument for the track based on its type and parameters.
     * This method is called during track creation and deserialization.
     */
    async initializeInstrument() {
        // Dispose of existing instrument first
        if (this.instrument) {
            this.instrument.dispose();
            this.instrument = null;
        }

        if (!this.appServices.Tone) {
            console.error("Tone.js not loaded. Cannot initialize instrument.");
            return;
        }

        switch (this.type) {
            case 'Synth':
                const synthClass = this.appServices.Tone[this.synthEngineType] || this.appServices.Tone.Synth;
                this.instrument = new this.appServices.Tone.PolySynth(synthClass, {
                    polyphony: 16,
                    ...this.synthParams
                });
                break;
            case 'Sampler':
                this.instrument = new this.appServices.Tone.Sampler();
                if (this.audioBuffer && this.audioBuffer.loaded) {
                    // Populate sampler with slices
                    this.slices.forEach((slice, index) => {
                        if (slice.duration > 0) {
                            const midiNote = Constants.SAMPLER_PIANO_ROLL_START_NOTE + index;
                            const noteName = this.appServices.Tone.Midi(midiNote).toNote();
                            const sliceBuffer = new this.appServices.Tone.Buffer().fromArray(
                                this.audioBuffer.getChannelData(0).slice(
                                    slice.offset * this.audioBuffer.sampleRate,
                                    (slice.offset + slice.duration) * this.audioBuffer.sampleRate
                                )
                            );
                            this.instrument.add(noteName, sliceBuffer);
                        }
                    });
                }
                break;
            case 'DrumSampler':
                this.instrument = new this.appServices.Tone.Sampler();
                if (this.drumSamplerPads) {
                    this.drumSamplerPads.forEach((padData, index) => {
                        if (padData.audioBuffer && padData.audioBuffer.loaded) {
                            const midiNote = Constants.DRUM_MIDI_START_NOTE + index;
                            const noteName = this.appServices.Tone.Midi(midiNote).toNote();
                            this.instrument.add(noteName, padData.audioBuffer);
                        }
                    });
                }
                break;
            case 'InstrumentSampler':
                this.instrument = new this.appServices.Tone.Sampler({
                    envelope: this.instrumentSamplerSettings.envelope,
                    // The 'urls' object for Sampler needs to map pitch to buffer,
                    // but since InstrumentSampler loads a single audio file and maps it to a root note,
                    // we add the buffer explicitly after initialization.
                });
                if (this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
                    const rootNote = this.instrumentSamplerSettings.rootNote || 'C4';
                    this.instrument.add(rootNote, this.instrumentSamplerSettings.audioBuffer);
                }
                break;
            case 'Audio':
                this.instrument = null; // Audio tracks don't have an instrument
                break;
            default:
                this.instrument = null;
        }

        if (this.instrument) {
            this.instrument.connect(this.input);
        }
        
        // Recreate Tone.Sequence for playback after instrument is initialized
        if (this.type !== 'Audio') {
            this.sequences.recreateToneSequence();
        }
    }
    
    // --- Methods that stay in Track.js ---
    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = volume;
        if (!this.isMuted) this.outputNode.gain.rampTo(volume, 0.02);
        if (fromInteraction) this.appServices.captureStateForUndo?.(`Set Volume for ${this.name} to ${volume.toFixed(2)}`);
    }

    applyMuteState() {
        if (!this.outputNode) return;
        this.outputNode.gain.rampTo(this.isMuted ? 0 : this.previousVolumeBeforeMute, 0.02);
    }

    applySoloState(isAnotherTrackSoloed) {
        if (!this.outputNode) return;
        if (isAnotherTrackSoloed) this.outputNode.gain.rampTo(0, 0.02);
        else this.applyMuteState(); // Apply mute state if no other track is soloed
    }

    updateSoloMuteState(soloedTrackId) {
        this.isSoloed = this.id === soloedTrackId; // Update soloed status based on global state
        this.applySoloState(soloedTrackId !== null && !this.isSoloed);
        this.appServices.updateTrackUI?.(this.id, 'soloChanged');
    }

    setSynthParam(paramPath, value) {
        if (!this.instrument || this.type !== 'Synth') return;
        try {
            // Tone.js .set() method
            this.instrument.set({ [paramPath]: value });

            // Update local synthParams state (deeply)
            let current = this.synthParams;
            const keys = paramPath.split('.');
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]] = current[keys[i]] || {};
            }
            current[keys[keys.length - 1]] = value;

        } catch (e) {
            console.error(`Could not set synth param: ${paramPath}`, e);
        }
    }
    
    getDefaultSynthParams() {
        return {
            portamento: 0,
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 },
            filter: { type: 'lowpass', rolloff: -12, Q: 1, frequency: 10000 },
            filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 2, baseFrequency: 200, octaves: 7 }
        };
    }

    // --- Delegated Methods ---
    addEffect(effectType, params, isInitialLoad = false) { return this.effects.addEffect(effectType, params, isInitialLoad); }
    removeEffect(effectId) { return this.effects.removeEffect(effectId); }
    updateEffectParam(effectId, paramPath, value) { return this.effects.updateEffectParam(effectId, paramPath, value); }
    rebuildEffectChain() { return this.effects.rebuildEffectChain(); }

    getActiveSequence() { return this.sequences.getActiveSequence(); }
    createNewSequence(name, length, skipUndo) { return this.sequences.createNewSequence(name, length, skipUndo); }
    addNoteToSequence(sequenceId, pitchIndex, timeStep, noteData) { return this.sequences.addNoteToSequence(sequenceId, pitchIndex, timeStep, noteData); }
    removeNoteFromSequence(sequenceId, pitchIndex, timeStep) { return this.sequences.removeNoteFromSequence(sequenceId, pitchIndex, timeStep); }
    removeNotesFromSequence(sequenceId, notesToRemove) { return this.sequences.removeNotesFromSequence(sequenceId, notesToRemove); }
    setSequenceLength(sequenceId, newLength) { return this.sequences.setSequenceLength(sequenceId, newLength); }
    moveSelectedNotes(sequenceId, selectedNotes, pitchOffset, timeOffset) { return this.sequences.moveSelectedNotes(sequenceId, selectedNotes, pitchOffset, timeOffset); }
    setNoteDuration(sequenceId, pitchIndex, timeStep, newDuration) { return this.sequences.setNoteDuration(sequenceId, pitchIndex, timeStep, newDuration); }
    updateNoteVelocity(sequenceId, pitchIndex, timeStep, newVelocity) { return this.sequences.updateNoteVelocity(sequenceId, pitchIndex, timeStep, newVelocity); }
    clearSequence(sequenceId) { return this.sequences.clearSequence(sequenceId); }
    duplicateSequence(sequenceId) { return this.sequences.duplicateSequence(sequenceId); }
    copyNotesToClipboard(sequenceId, notesToCopy) { return this.sequences.copyNotesToClipboard(sequenceId, notesToCopy); }
    pasteNotesFromClipboard(sequenceId, pastePitchIndex, pasteTimeStep) { return this.sequences.pasteNotesFromClipboard(sequenceId, pastePitchIndex, pasteTimeStep); }
    recreateToneSequence() { return this.sequences.recreateToneSequence(); }
    startSequence() { return this.sequences.startSequence(); }
    stopSequence() { return this.sequences.stopSequence(); }

    addMidiClip(sequence, startTime) { return this.clips.addMidiClip(sequence, startTime); }
    addAudioClip(audioBlob, startTime, clipName) { return this.clips.addAudioClip(audioBlob, startTime, clipName); }
    deleteClip(clipId) { return this.clips.deleteClip(clipId); }

    dispose() {
        this.sequences.dispose();
        this.instrument?.dispose();
        this.input?.dispose();
        this.outputNode?.dispose();
        this.trackMeter?.dispose();
        this.effects.dispose(); // Dispose effects chain
        // Dispose audio buffers specific to sampler types
        this.audioBuffer?.dispose(); // For Sampler type
        this.drumSamplerPads.forEach(p => p.audioBuffer?.dispose()); // For DrumSampler type
        this.instrumentSamplerSettings.audioBuffer?.dispose(); // For InstrumentSampler type
        this.inputChannel?.dispose(); // For Audio track type
    }
}