// js/Track.js - Track Class Module (MODIFIED)

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
        // More specific default names
        if (!initialData?.name) {
            if (type === 'DrumSampler') this.name = `Sampler (Pads) ${this.id}`;
            else if (type === 'Synth') this.name = `MonoSynth ${this.id}`;
            else if (type === 'Audio') this.name = `Audio ${this.id}`;
            else if (type === 'Sampler') this.name = `Sampler (Slicer) ${this.id}`;
            else if (type === 'InstrumentSampler') this.name = `Instrument Sampler ${this.id}`;
        }
        
        this.isMuted = initialData?.isMuted || false;
        this.isMonitoringEnabled = initialData?.isMonitoringEnabled !== undefined ? initialData.isMonitoringEnabled : (this.type === 'Audio');

        const currentSoloedId = this.appServices.getSoloedTrackId ? this.appServices.getSoloedTrackId() : null;
        this.isSoloed = currentSoloedId === this.id;
        this.previousMuteState = this.isMuted; // For solo functionality
        
        const currentArmedId = this.appServices.getArmedTrackId ? this.appServices.getArmedTrackId() : null;
        this.isArmedForRec = currentArmedId === this.id;

        // Audio node setup
        this.channel = new Tone.Channel({
            volume: initialData?.volume !== undefined ? initialData.volume : 0,
            pan: initialData?.pan !== undefined ? initialData.pan : 0,
            mute: this.isMuted
        }).toDestination();
        
        // If soloed, other tracks will be muted. We need to handle this logic globally.
        this.updateSoloState(currentSoloedId);

        this.inputChannel = new Tone.Channel();
        this.activeEffects = [];
        this.instrument = null;
        this.canBeArmed = ['Synth', 'Sampler', 'DrumSampler', 'InstrumentSampler', 'Audio'].includes(type);
        
        this.sequences = [];
        this.activeSequenceId = null;
        
        // Timeline specific state
        this.timelineClips = [];

        // Track-type specific initialization
        this._initializeTrackType(initialData);

        // Reconstruct effects chain if initialData exists
        if (initialData?.activeEffects) {
            this.reconstructEffects(initialData.activeEffects);
        }
        
        // Reconstruct sequences if initialData exists
        if (initialData?.sequences && initialData.sequences.length > 0) {
            this.sequences = initialData.sequences;
            this.activeSequenceId = initialData.activeSequenceId || this.sequences[0].id;
        } else if (this.type !== 'Audio') {
            // Create a default sequence if none exists for sequenceable tracks
            this.addNewSequence(false); // false = don't capture undo
        }
        
        // Reconstruct timeline clips if initialData exists
        if (initialData?.timelineClips) {
             this.timelineClips = JSON.parse(JSON.stringify(initialData.timelineClips));
        }

        this.recreateToneSequence(false); // Rebuild Tone.Sequence/Part without starting it
    }
    
    _initializeTrackType(initialData) {
        switch (this.type) {
            case 'Synth':
                this.synthType = initialData?.synthType || 'MonoSynth';
                const synthOptions = initialData?.synthSettings || { oscillator: { type: 'sawtooth' }, envelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 1 } };
                this.instrument = new Tone.PolySynth(Tone[this.synthType], synthOptions).connect(this.inputChannel);
                this.instrument.volume.value = -6; // Default volume for synth instruments
                break;
            case 'Sampler': // Slicer
                this.instrument = new Tone.Players({ urls: {} }).connect(this.inputChannel);
                this.slices = initialData?.slices || [];
                this.audioBuffer = null;
                this.selectedSliceForEdit = initialData?.selectedSliceForEdit || 0;
                 if (initialData?.audioFileId && this.appServices.dbGetItem) {
                    this.loadSampleFromDB(initialData.audioFileId);
                }
                break;
            case 'DrumSampler':
                this.instrument = new Tone.Players({ urls: {} }).connect(this.inputChannel);
                this.drumSamplerPads = initialData?.drumSamplerPads || Array(Constants.numDrumSamplerPads).fill(null).map(() => ({
                    sampleId: null, audioBuffer: null, originalFileName: '', status: 'empty',
                    volume: 1, pitchShift: 0, autoStretchEnabled: false, stretchBeats: 1
                }));
                this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
                this.drumSamplerPads.forEach((pad, index) => {
                    if (pad.sampleId && this.appServices.dbGetItem) this.loadDrumPadSampleFromDB(pad.sampleId, index);
                });
                break;
            case 'InstrumentSampler':
                 this.instrument = new Tone.Sampler({ urls: {} }).connect(this.inputChannel);
                 this.instrumentSamplerSettings = initialData?.instrumentSamplerSettings || {
                     audioFileId: null, audioBuffer: null, originalFileName: '', status: 'empty',
                     loop: false, loopStart: 0, loopEnd: 0, releaseTime: 0.1
                 };
                 if (this.instrumentSamplerSettings.audioFileId && this.appServices.dbGetItem) {
                     this.loadInstrumentSampleFromDB(this.instrumentSamplerSettings.audioFileId);
                 }
                break;
            case 'Audio':
                // Audio tracks don't have a default instrument. Their source is either live input or clips.
                break;
            default:
                console.error(`[Track Constructor] Unknown track type: ${this.type}`);
        }
    }

    // --- State Serialization & Deserialization ---
    serializeState() {
        let specificState = {};
        switch (this.type) {
            case 'Synth':
                specificState = {
                    synthType: this.synthType,
                    synthSettings: this.instrument ? this.instrument.get() : {}
                };
                break;
            case 'Sampler':
                specificState = {
                    audioFileId: this.audioFileId,
                    slices: this.slices,
                    selectedSliceForEdit: this.selectedSliceForEdit
                };
                break;
            case 'DrumSampler':
                specificState = {
                    drumSamplerPads: this.drumSamplerPads.map(p => ({ ...p, audioBuffer: null })), // Don't serialize buffer
                    selectedDrumPadForEdit: this.selectedDrumPadForEdit
                };
                break;
            case 'InstrumentSampler':
                 specificState = {
                    instrumentSamplerSettings: { ...this.instrumentSamplerSettings, audioBuffer: null }
                };
                break;
        }

        return {
            id: this.id,
            type: this.type,
            name: this.name,
            isMuted: this.isMuted,
            isSoloed: this.isSoloed,
            isArmedForRec: this.isArmedForRec,
            isMonitoringEnabled: this.isMonitoringEnabled,
            volume: this.channel.volume.value,
            pan: this.channel.pan.value,
            activeEffects: this.activeEffects.map(effect => ({
                id: effect.id, type: effect.type,
                params: effect.node.get(), // Get current params from Tone.js node
                isBypassed: effect.isBypassed
            })),
            sequences: this.sequences,
            activeSequenceId: this.activeSequenceId,
            timelineClips: this.timelineClips,
            ...specificState
        };
    }
    
    // --- Core Methods ---
    setName(newName) {
        this.appServices.captureStateForUndoInternal(`Rename Track to "${newName}"`);
        this.name = newName;
        // Notify UI to update track name everywhere
        if(this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'nameChange');
    }

    setVolumeDb(db) {
        this.channel.volume.value = db;
    }
    
    getVolumeDb() {
        return this.channel.volume.value;
    }

    setPan(panValue) {
        this.channel.pan.value = panValue;
    }

    setMute(isMuted) {
        this.isMuted = isMuted;
        this.channel.mute = this.isMuted;
        this.previousMuteState = this.isMuted;
         if(this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'muteSoloChange');
    }

    updateSoloState(soloedTrackId) {
        if (soloedTrackId === null) {
            // Unsolo: restore previous mute state
            this.channel.mute = this.isMuted;
        } else {
            // Another track is soloed: mute this one unless it's the soloed one
            this.channel.mute = (this.id !== soloedTrackId);
        }
    }
    
    setMonitoring(isEnabled) {
        this.isMonitoringEnabled = isEnabled;
        if(this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'monitorChange');
        // Audio connection logic will be in eventHandlers or audio.js based on this state
    }

    // --- Effect Management ---
    addEffect(effectType, captureUndo = true) {
        if (captureUndo) {
            this.appServices.captureStateForUndoInternal(`Add Effect to ${this.name}`);
        }
        const effectNode = createEffectInstance(effectType);
        if (effectNode) {
            const effectId = `effect-${this.id}-${Date.now()}`;
            this.activeEffects.push({
                id: effectId,
                type: effectType,
                node: effectNode,
                isBypassed: false
            });
            this._rechainEffects();
            if(this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'effectAdded');
        }
    }
    
    removeEffect(effectId) {
        this.appServices.captureStateForUndoInternal(`Remove Effect from ${this.name}`);
        const effectIndex = this.activeEffects.findIndex(e => e.id === effectId);
        if (effectIndex > -1) {
            this.activeEffects[effectIndex].node.dispose();
            this.activeEffects.splice(effectIndex, 1);
            this._rechainEffects();
            if(this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'effectRemoved');
        }
    }

    updateEffectParam(effectId, paramPath, value) {
        const effect = this.activeEffects.find(e => e.id === effectId);
        if (effect) {
            // Tone.js nodes can often take a path string for nested properties
            effect.node.set({ [paramPath]: value });
            // For undo, knob/slider on-release should capture state. Continuous changes shouldn't.
        }
    }
    
    reconstructEffects(effectsData) {
        this.activeEffects.forEach(e => e.node.dispose()); // Clean existing
        this.activeEffects = [];
        effectsData.forEach(effectData => {
            const effectNode = createEffectInstance(effectData.type, effectData.params);
            if (effectNode) {
                this.activeEffects.push({
                    id: effectData.id || `effect-${this.id}-${Date.now()}`,
                    type: effectData.type,
                    node: effectNode,
                    isBypassed: effectData.isBypassed || false
                });
            }
        });
        this._rechainEffects();
    }
    
    _rechainEffects() {
        this.inputChannel.disconnect(); // Disconnect everything downstream from input
        let lastNode = this.inputChannel;
        this.activeEffects.forEach(effect => {
            if (!effect.isBypassed) {
                lastNode.connect(effect.node);
                lastNode = effect.node;
            }
        });
        lastNode.connect(this.channel); // Connect final node in chain to track's main channel
    }

    // --- Sequence Management ---
    addNewSequence(captureUndo = true) {
        if (captureUndo) this.appServices.captureStateForUndoInternal(`Add Sequence to ${this.name}`);
        const newId = `seq-${this.id}-${Date.now()}`;
        this.sequences.push({
            id: newId,
            name: `Sequence ${this.sequences.length + 1}`,
            bars: 1,
            steps: [] // { time, pitchOrPad, duration, velocity }
        });
        this.activeSequenceId = newId;
        this.recreateToneSequence();
        return newId;
    }

    removeSequence(sequenceId) {
        if (this.sequences.length <= 1) return; // Can't remove the last one
        this.appServices.captureStateForUndoInternal(`Remove Sequence from ${this.name}`);
        this.sequences = this.sequences.filter(s => s.id !== sequenceId);
        if (this.activeSequenceId === sequenceId) {
            this.activeSequenceId = this.sequences[0].id;
        }
        this.recreateToneSequence();
    }
    
    setActiveSequence(sequenceId) {
        if (this.activeSequenceId !== sequenceId) {
            this.activeSequenceId = sequenceId;
            this.recreateToneSequence();
            if(this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'activeSequenceChanged');
        }
    }
    
    getActiveSequence() {
        return this.sequences.find(s => s.id === this.activeSequenceId);
    }
    
    toggleStep(pitchOrPad, time, sequenceId) {
        this.appServices.captureStateForUndoInternal(`Edit Sequence on ${this.name}`);
        const sequence = this.sequences.find(s => s.id === sequenceId);
        if (!sequence) return;
        
        const stepIndex = sequence.steps.findIndex(s => s.time === time && s.pitchOrPad === pitchOrPad);
        if (stepIndex > -1) {
            sequence.steps.splice(stepIndex, 1);
        } else {
            sequence.steps.push({ time, pitchOrPad, duration: '16n', velocity: 1.0 });
        }
        this.recreateToneSequence(); // Update Tone.Part with new data
    }
    
    recreateToneSequence(autoStart = true) {
        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            this.patternPlayerSequence.stop();
            this.patternPlayerSequence.clear();
            this.patternPlayerSequence.dispose();
        }

        const activeSequence = this.getActiveSequence();
        if (!this.instrument || !activeSequence || activeSequence.steps.length === 0) return;

        const events = activeSequence.steps.map(step => {
            const timeInMeasures = `${Math.floor(step.time / 16)}:${Math.floor((step.time % 16) / 4)}:${step.time % 4}`;
            
            let noteToPlay = step.pitchOrPad;
            if (this.type === 'Sampler') { // Slicer
                const slice = this.slices[parseInt(step.pitchOrPad.split(' ')[1]) - 1];
                if(slice) noteToPlay = slice.name; // Use slice name if Tone.Players is keyed by slice names
            } else if (this.type === 'DrumSampler') { // Pad Sampler
                const pad = this.drumSamplerPads[parseInt(step.pitchOrPad.split(' ')[1]) - 1];
                 if(pad) noteToPlay = pad.sampleId; // Use sampleId (which should be the buffer key)
            }
            
            return [timeInMeasures, noteToPlay];
        });

        if (events.length === 0) return;

        this.patternPlayerSequence = new Tone.Part((time, value) => {
            if (this.type === 'Synth' || this.type === 'InstrumentSampler') {
                this.instrument.triggerAttackRelease(value, '16n', time);
            } else if ((this.type === 'Sampler' || this.type === 'DrumSampler') && this.instrument.has(value)) {
                this.instrument.player(value).start(time);
            }
            // Highlight the playing step in the UI
            if(this.appServices.highlightPlayingStep) {
                const stepTime = (Tone.Transport.progress * activeSequence.bars * 16) | 0; // Simple progress mapping
                // This logic is complex; a better way is to pass the step time from the event itself.
                // For now, this is a placeholder. A more accurate way is needed.
            }
        }, events);

        this.patternPlayerSequence.loop = true;
        this.patternPlayerSequence.loopEnd = `${activeSequence.bars}m`;
        
        if (autoStart && Tone.Transport.state === "started") {
             const transportStartTime = this.appServices.getPlaybackMode() === 'timeline' ? 0 : undefined;
             this.patternPlayerSequence.start(transportStartTime);
        }
    }
    
    // --- Sample Management (for Sampler, DrumSampler, InstrumentSampler) ---
    // Combined logic for loading samples
    async loadSample(file, purpose, context = {}) { // purpose: 'Slicer', 'DrumPad', 'Instrument', 'AudioClip'
        const audioBuffer = new Tone.ToneAudioBuffer(URL.createObjectURL(file));
        await audioBuffer.load();
        
        const fileId = `${this.id}-${purpose}-${Date.now()}`;
        if(this.appServices.dbStoreItem) await this.appServices.dbStoreItem(fileId, file);
        
        switch(purpose) {
            case 'Slicer':
                this.audioFileId = fileId;
                this.audioBuffer = audioBuffer;
                this.appServices.autoSliceSample(this.id, Constants.numSlices); // Auto-slice on load
                if(this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'samplerLoaded');
                break;
            case 'DrumPad':
                const padIndex = context.padIndex;
                this.drumSamplerPads[padIndex].sampleId = fileId;
                this.drumSamplerPads[padIndex].audioBuffer = audioBuffer;
                this.drumSamplerPads[padIndex].originalFileName = file.name;
                this.instrument.add(fileId, audioBuffer);
                if(this.appServices.updateTrackUI) this.appServices.updateTrackUI(this.id, 'drumPadLoaded', {padIndex});
                break;
            // ... other cases
        }
    }

    // --- Clip Management ---
    addAudioClip(blob, startTime) {
        const duration = blob.duration; // Assume blob from recorder has duration
        const newClipId = `clip-${this.id}-${Date.now()}`;
        this.timelineClips.push({
            id: newClipId,
            type: 'audio',
            name: `Rec-${this.timelineClips.length + 1}`,
            startTime: startTime,
            duration: duration,
            sourceBlobId: newClipId // Use clipId as key for storing blob in DB
        });
        if(this.appServices.dbStoreItem) this.appServices.dbStoreItem(newClipId, blob);
        if(this.appServices.renderTimeline) this.appServices.renderTimeline();
        this.appServices.captureStateForUndoInternal(`Record Audio on ${this.name}`);
    }
    
    updateAudioClipPosition(clipId, newStartTime) {
        this.appServices.captureStateForUndoInternal(`Move Clip on ${this.name}`);
        const clip = this.timelineClips.find(c => c.id === clipId);
        if (clip) {
            clip.startTime = newStartTime;
        }
         if(this.appServices.renderTimeline) this.appServices.renderTimeline();
    }
    
     updateClipProperties(clipId, properties) {
        this.appServices.captureStateForUndoInternal(`Edit Clip on ${this.name}`);
        const clip = this.timelineClips.find(c => c.id === clipId);
        if (clip) {
            Object.assign(clip, properties);
        }
        if(this.appServices.renderTimeline) this.appServices.renderTimeline();
    }
    
    // --- Disposal ---
    dispose() {
        // Stop any playback associated with this track
        if (this.patternPlayerSequence && !this.patternPlayerSequence.disposed) {
            this.patternPlayerSequence.stop().dispose();
        }
        
        // Dispose of the instrument
        if (this.instrument && !this.instrument.disposed) {
            this.instrument.dispose();
        }
        
        // Dispose of all effects
        this.activeEffects.forEach(effect => {
            if (effect.node && !effect.node.disposed) {
                effect.node.dispose();
            }
        });
        
        // Dispose of the channel
        if (this.channel && !this.channel.disposed) {
            this.channel.dispose();
        }
        if (this.inputChannel && !this.inputChannel.disposed) {
            this.inputChannel.dispose();
        }
        
        // Clear references
        this.instrument = null;
        this.activeEffects = [];
        this.channel = null;
        this.inputChannel = null;
        this.sequences = [];
        this.timelineClips = [];
        this.appServices = {};

        console.log(`[Track Dispose] Track ${this.id} (${this.name}) disposed.`);
    }
}
