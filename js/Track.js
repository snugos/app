// js/Track.js - Track Class Module

import { STEPS_PER_BAR, defaultStepsPerBar, synthPitches, numSlices, numDrumSamplerPads, samplerMIDINoteStart, defaultVelocity, computerKeySynthMap } from './constants.js'; // Added computerKeySynthMap for completeness
import { createEffectInstance, getEffectDefaultParams, AVAILABLE_EFFECTS, synthEngineControlDefinitions } from './effectsRegistry.js';
import { storeAudio, getAudio, deleteAudio } from './db.js';

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
            this.instrument = null; // Will be initialized in fullyInitializeAudioResources
        } else {
            this.synthEngineType = null;
            this.synthParams = {};
        }
        
        this.samplerAudioData = initialData?.samplerAudioData || { fileName: null, originalId: null, dbKey: null, status: 'empty' };
        this.audioBuffer = null; // Will be Tone.ToneAudioBuffer
        this.slices = initialData?.slices && Array.isArray(initialData.slices) ? JSON.parse(JSON.stringify(initialData.slices)) : [];
        if (this.type === 'Sampler' && this.slices.length === 0) {
            this.createDefaultSlices(Constants.numSlices);
        }
        this.selectedSliceForEdit = initialData?.selectedSliceForEdit || 0;
        this.slicerIsPolyphonic = initialData?.slicerIsPolyphonic !== undefined ? initialData.slicerIsPolyphonic : true;
        this.slicerMonoPlayer = null;
        this.slicerMonoEnvelope = null;
        if (this.type === 'Sampler') { // For sampler (slicer), instrument is Tone.Players
            this.instrument = null; 
        }


        this.drumSamplerPads = initialData?.drumSamplerPads && Array.isArray(initialData.drumSamplerPads) ? 
            JSON.parse(JSON.stringify(initialData.drumSamplerPads)) : 
            Array(Constants.numDrumSamplerPads).fill(null).map(() => ({
                audioBufferDataURL: null, fileName: null, originalId: null, dbKey: null, status: 'empty',
                player: null, 
                volume: 0.7, pitchShift: 0,
                envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 }
            }));
        this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
        this.drumPadPlayers = Array(Constants.numDrumSamplerPads).fill(null);
        this.drumPadGainNode = null; 


        this.instrumentSamplerSettings = initialData?.instrumentSamplerSettings || {
            originalFileName: null, dbKey: null, status: 'empty', audioBuffer: null,
            rootNote: 'C4', loop: false, loopStart: 0, loopEnd: 0,
            envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 }
        };
        this.instrumentSamplerIsPolyphonic = initialData?.instrumentSamplerIsPolyphonic !== undefined ? initialData.instrumentSamplerIsPolyphonic : true;
        this.toneSampler = null; // Will be Tone.Sampler


        this.sequenceLength = initialData?.sequenceLength || (Constants.defaultStepsPerBar * 4); 
        this.sequenceData = initialData?.sequenceData ? JSON.parse(JSON.stringify(initialData.sequenceData)) : this.createEmptySequenceData();
        this.sequence = null; // Will be Tone.Part

        this.activeEffects = initialData?.activeEffects ? 
            initialData.activeEffects.map(effState => {
                const toneNode = createEffectInstance(effState.type, effState.params);
                // Ensure default 'wet' is 1 if not specified in params, and toneNode supports it
                const defaultWetParam = AVAILABLE_EFFECTS[effState.type]?.params.find(p => p.key === 'wet');
                const initialWetValue = effState.params?.wet !== undefined ? effState.params.wet : (defaultWetParam ? defaultWetParam.defaultValue : 1);

                return { 
                    ...effState, 
                    toneNode,
                    isBypassed: effState.isBypassed || false,
                    storedWetValue: effState.storedWetValue !== undefined ? effState.storedWetValue : initialWetValue
                };
            }) : [];

        this.inspectorWindow = null;
        this.effectsRackWindow = null;
        this.sequencerWindow = null;
        this.inspectorControls = {}; 
        
        this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute).toDestination();
        this.trackMeter = new Tone.Meter();
        this.gainNode.connect(this.trackMeter); 

        console.log(`[Track ${this.id}] Initializing core audio nodes (Gain, Meter)...`);
        this.fullyInitializeAudioResources(); // This will also call rebuildEffectChain and initializeToneSequence
    }

    getDefaultSynthParams() {
        const params = {};
        const definitions = synthEngineControlDefinitions[this.synthEngineType] || []; 
        definitions.forEach(def => {
            let target = params;
            const pathParts = def.path.split('.');
            for (let i = 0; i < pathParts.length - 1; i++) {
                target = target[pathParts[i]] = target[pathParts[i]] || {};
            }
            target[pathParts[pathParts.length - 1]] = def.defaultValue;
        });
        return params;
    }
    
    applyBypassToEffectNode(effectWrapper) {
        if (effectWrapper.toneNode && effectWrapper.toneNode.wet && typeof effectWrapper.toneNode.wet.value === 'number') {
            if (effectWrapper.isBypassed) {
                effectWrapper.toneNode.wet.value = 0;
            } else {
                const targetWet = effectWrapper.storedWetValue !== undefined ? effectWrapper.storedWetValue : 
                                  (effectWrapper.params?.wet !== undefined ? effectWrapper.params.wet : 1);
                effectWrapper.toneNode.wet.value = targetWet;
            }
        }
    }

    rebuildEffectChain() {
        console.log(`[Track ${this.id} - rebuildEffectChain] Rebuilding. Type: ${this.type}`);
        let sourceNode = this.getAudioSourceNode(); 

        if (this.gainNode && this.gainNode.disposed) { // Safety check
            this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute).toDestination();
            if(this.trackMeter && !this.trackMeter.disposed) this.gainNode.connect(this.trackMeter);
        }


        // Disconnect everything that will be reconnected from sourceNode and effects
        if (sourceNode && !sourceNode.disposed) {
            try { sourceNode.disconnect(this.gainNode); } catch(e){} 
            this.activeEffects.forEach(effectWrapper => {
                if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
                    try { sourceNode.disconnect(effectWrapper.toneNode); } catch(e){}
                }
            });
        }
        
        this.activeEffects.forEach(effectWrapper => {
            if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
                 try { effectWrapper.toneNode.disconnect(this.gainNode); } catch(e){}
                 this.activeEffects.forEach(otherEffect => { 
                     if (otherEffect.toneNode && !otherEffect.toneNode.disposed && effectWrapper.id !== otherEffect.id) {
                         try {effectWrapper.toneNode.disconnect(otherEffect.toneNode); } catch(e){}
                         try {otherEffect.toneNode.disconnect(effectWrapper.toneNode); } catch(e){}
                     }
                 });
            }
        });
        
        let currentNodeToConnect = sourceNode;

        if (!currentNodeToConnect && this.activeEffects.length > 0) {
            // If no source, but effects exist, the first effect is the start of the chain to gainNode
            currentNodeToConnect = this.activeEffects.find(ew => ew.toneNode)?.toneNode || null;
        }
        
        this.activeEffects.forEach((effectWrapper, index) => {
            if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
                this.applyBypassToEffectNode(effectWrapper);
                if (index === 0 && !sourceNode) { // This is the first effect and there was no sourceNode
                     // It becomes the new "currentNodeToConnect" if there wasn't one
                     // (Handled by currentNodeToConnect assignment above if sourceNode was null)
                } else if (currentNodeToConnect && !currentNodeToConnect.disposed) {
                    currentNodeToConnect.connect(effectWrapper.toneNode);
                }
                currentNodeToConnect = effectWrapper.toneNode; // Current effect becomes the source for the next
            }
        });

        if (currentNodeToConnect && !currentNodeToConnect.disposed) { // If there's anything in the chain (source or effects)
            currentNodeToConnect.connect(this.gainNode); 
        }
        
        this.applyMute(); 
        this.applySoloState(typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null);
        console.log(`[Track ${this.id}] rebuildEffectChain finished.`);
    }
    

    getAudioSourceNode() {
        if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) return this.instrument;
        if (this.type === 'Sampler' && this.instrument && !this.instrument.disposed) return this.instrument; 
        if (this.type === 'DrumSampler' && this.drumPadGainNode && !this.drumPadGainNode.disposed) return this.drumPadGainNode; 
        if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed) return this.toneSampler;
        return null;
    }

    addEffect(effectType) {
        const defaultParams = getEffectDefaultParams(effectType);
        const effectInstance = createEffectInstance(effectType, defaultParams);
        if (effectInstance) {
            const initialWet = (effectInstance.wet && typeof effectInstance.wet.value === 'number') ? 
                                effectInstance.wet.value : 
                                (defaultParams?.wet !== undefined ? defaultParams.wet : 1);
            const effectWrapper = {
                id: `effect-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                type: effectType,
                params: JSON.parse(JSON.stringify(defaultParams)), 
                toneNode: effectInstance,
                isBypassed: false, 
                storedWetValue: initialWet 
            };
            this.activeEffects.push(effectWrapper);
            this.rebuildEffectChain();
        }
    }

    removeEffect(effectId) {
        const effectIndex = this.activeEffects.findIndex(e => e.id === effectId);
        if (effectIndex > -1) {
            const effectWrapper = this.activeEffects[effectIndex];
            if (effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
                effectWrapper.toneNode.dispose();
            }
            this.activeEffects.splice(effectIndex, 1);
            this.rebuildEffectChain();
        }
    }
    
    updateEffectParam(effectId, paramKey, value) {
        const effectWrapper = this.activeEffects.find(e => e.id === effectId);
        if (effectWrapper && effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
            let targetParamObj = effectWrapper.params;
            const keys = paramKey.split('.');
            for (let i = 0; i < keys.length - 1; i++) {
                targetParamObj = targetParamObj[keys[i]] = targetParamObj[keys[i]] || {};
            }
            targetParamObj[keys[keys.length - 1]] = value;

            let targetNode = effectWrapper.toneNode;
            for (let i = 0; i < keys.length - 1; i++) {
                targetNode = targetNode[keys[i]];
                if (!targetNode) break;
            }

            if (targetNode && typeof targetNode[keys[keys.length - 1]] !== 'undefined') {
                const paramName = keys[keys.length - 1];
                const actualParam = targetNode[paramName];

                if (paramName === 'wet') {
                    effectWrapper.storedWetValue = value; // Always update storedWetValue when 'wet' is directly changed
                    if (!effectWrapper.isBypassed && actualParam && typeof actualParam.value !== 'undefined') {
                        actualParam.value = value;
                    } else if (!effectWrapper.isBypassed) {
                        targetNode[paramName] = value; // Fallback for non-signal wet
                    }
                    // If bypassed, live wet remains 0, applyBypassToEffectNode handles this.
                } else {
                     if (actualParam && typeof actualParam.value !== 'undefined') {
                        actualParam.value = value;
                    } else {
                        targetNode[paramName] = value;
                    }
                }
            } else {
                console.warn(`[Track ${this.id}] Parameter key "${paramKey}" not found on Tone.js node for effect "${effectWrapper.type}".`);
            }
        }
    }

    reorderEffect(effectId, newIndex) {
        const currentIndex = this.activeEffects.findIndex(e => e.id === effectId);
        if (currentIndex === -1 || newIndex < 0 || newIndex >= this.activeEffects.length) return;

        const [effectWrapper] = this.activeEffects.splice(currentIndex, 1);
        this.activeEffects.splice(newIndex, 0, effectWrapper);
        this.rebuildEffectChain();
    }

    toggleEffectBypass(effectId) {
        const effectWrapper = this.activeEffects.find(e => e.id === effectId);
        if (effectWrapper && effectWrapper.toneNode && !effectWrapper.toneNode.disposed) {
            effectWrapper.isBypassed = !effectWrapper.isBypassed;
            
            if (effectWrapper.toneNode.wet && typeof effectWrapper.toneNode.wet.value === 'number') {
                if (effectWrapper.isBypassed) {
                    // Store the current "intended" wet value if it wasn't already stored as 0 (from a previous bypass)
                    if (effectWrapper.toneNode.wet.value !== 0 && effectWrapper.storedWetValue === 0){
                         // This case might mean it was enabled with wet=0; prefer params if available.
                         effectWrapper.storedWetValue = effectWrapper.params?.wet !== undefined ? effectWrapper.params.wet : 1;
                    } else if (effectWrapper.toneNode.wet.value !== 0) {
                         effectWrapper.storedWetValue = effectWrapper.toneNode.wet.value;
                    }
                    // If storedWetValue is still undefined (e.g. fresh effect, wet was default), ensure it's set.
                    if (effectWrapper.storedWetValue === undefined) {
                        effectWrapper.storedWetValue = effectWrapper.params?.wet !== undefined ? effectWrapper.params.wet : 1;
                    }
                    effectWrapper.toneNode.wet.value = 0; 
                } else {
                    effectWrapper.toneNode.wet.value = (effectWrapper.storedWetValue !== undefined) ? effectWrapper.storedWetValue : 1;
                }
            } else {
                console.warn(`[Track ${this.id}] Effect ${effectWrapper.type} does not have a standard .wet property. Bypass handled by rebuildEffectChain.`);
                this.rebuildEffectChain(); // For non-standard effects, a full rebuild might be needed
            }
            console.log(`[Track ${this.id}] Effect ${effectWrapper.type} ${effectWrapper.isBypassed ? 'bypassed' : 'enabled'}. Live Wet: ${effectWrapper.toneNode.wet ? effectWrapper.toneNode.wet.value : 'N/A'}, Stored Wet: ${effectWrapper.storedWetValue}`);

            if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`${effectWrapper.isBypassed ? 'Bypass' : 'Enable'} effect "${effectWrapper.type}" on track "${this.name}"`);
        }
    }
    
    setVolume(value, fromInteraction = false) {
        if (typeof value !== 'number' || isNaN(value)) return;
        this.previousVolumeBeforeMute = Math.max(0, Math.min(1.2, value)); 
        if (!this.isMuted && this.gainNode && this.gainNode.gain) {
            this.gainNode.gain.value = this.previousVolumeBeforeMute;
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.applyMute();
    }

    applyMute() {
        if (this.gainNode && this.gainNode.gain) {
            if (this.isMuted || this.isEffectivelySoloMuted()) {
                this.gainNode.gain.value = 0;
            } else {
                this.gainNode.gain.value = this.previousVolumeBeforeMute;
            }
        }
        console.log(`[Track ${this.id}] Applied mute. Effective mute: ${this.isMuted || this.isEffectivelySoloMuted()}. Gain set to: ${this.gainNode ? this.gainNode.gain.value : 'N/A'}`);
    }

    applySoloState(soloedTrackIdGlobal) {
        this.isSoloed = (this.id === soloedTrackIdGlobal);
        this.applyMute(); 
    }
    
    isEffectivelySoloMuted() {
        const globalSoloId = (typeof window.getSoloedTrackId === 'function') ? window.getSoloedTrackId() : null;
        return globalSoloId !== null && globalSoloId !== this.id;
    }


    createDefaultSlices(num = Constants.numSlices) {
        this.slices = [];
        for (let i = 0; i < num; i++) {
            this.slices.push({ 
                offset: 0, 
                duration: 0, 
                userDefined: false, 
                volume: 1.0, 
                pitchShift: 0, 
                loop: false, 
                reverse: false,
                envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 }
            });
        }
    }
    
    createEmptySequenceData() {
        let rows;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') rows = Constants.synthPitches.length;
        else if (this.type === 'Sampler') rows = this.slices.length > 0 ? this.slices.length : Constants.numSlices;
        else if (this.type === 'DrumSampler') rows = Constants.numDrumSamplerPads;
        else rows = 16; 
        return Array(rows).fill(null).map(() => Array(this.sequenceLength).fill(null));
    }
    
    setSequenceLength(newLength, forceReschedule = false) {
        if (this.sequenceLength === newLength && !forceReschedule && this.sequence && !this.sequence.disposed) { // Added disposed check
            return; 
        }
        console.log(`[Track ${this.id} (${this.name})] setSequenceLength called. Old: ${this.sequenceLength}, New: ${newLength}, ForceReschedule: ${forceReschedule}`);
        const oldLength = this.sequenceLength;
        this.sequenceLength = newLength;

        let expectedRows;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') {
            expectedRows = Constants.synthPitches.length;
        } else if (this.type === 'Sampler') {
            expectedRows = this.slices.length > 0 ? this.slices.length : Constants.numSlices;
        } else if (this.type === 'DrumSampler') {
            expectedRows = Constants.numDrumSamplerPads;
        } else {
            expectedRows = this.sequenceData.length || 1; 
        }

        const currentSequenceData = this.sequenceData || []; // Ensure sequenceData exists

        const newSequenceData = Array(expectedRows).fill(null).map((_, r) => {
            const oldRow = (currentSequenceData[r] && Array.isArray(currentSequenceData[r])) ? currentSequenceData[r] : [];
            const newRow = Array(newLength).fill(null);
            for (let c = 0; c < Math.min(oldRow.length, newLength); c++) { // Use oldRow.length
                newRow[c] = oldRow[c];
            }
            return newRow;
        });
        this.sequenceData = newSequenceData;


        if (this.sequence && !this.sequence.disposed) {
            this.sequence.stop();
            this.sequence.clear(); 
            this.sequence.dispose(); 
            this.sequence = null;
            console.log(`[Track ${this.id}] Old Tone.Sequence disposed.`);
        }
        
        this.initializeToneSequence(); 
        
        if (this.sequencerWindow && typeof window.openTrackSequencerWindow === 'function') {
            console.log(`[Track ${this.id}] Forcing sequencer window redraw due to length change.`);
            window.openTrackSequencerWindow(this.id, true); 
        }
    }
    
    playNote(midiNote, velocity = 0.7) {
        if (this.type === 'Sampler' && this.slicerIsPolyphonic && this.instrument) {
            const sliceIndex = midiNote - Constants.samplerMIDINoteStart;
            if (sliceIndex >= 0 && sliceIndex < this.slices.length && this.instrument.has(`slice-${sliceIndex}`)) {
                const player = this.instrument.player(`slice-${sliceIndex}`);
                const slice = this.slices[sliceIndex];
                player.playbackRate = Tone.intervalToFrequencyRatio(slice.pitchShift || 0);
                player.reverse = slice.reverse || false;
                player.loop = slice.loop || false;
                // Slice-specific volume is applied via player.volume.value = Tone.gainToDb(slice.volume)
                // but this should ideally be managed by an envelope if we want ADSR per slice on polyphonic players
                // For now, let's assume a global ADSR if any, or just trigger with velocity.
                // The Tone.Players collection doesn't have a single ADSR.
                player.volume.value = Tone.gainToDb(slice.volume * (velocity / 0.7)); // Adjust base volume by velocity
                player.start(Tone.now(), slice.offset, slice.loop ? undefined : slice.duration);
            }
            return;
        } else if (this.type === 'Sampler' && !this.slicerIsPolyphonic && this.slicerMonoPlayer && this.slicerMonoEnvelope && this.audioBuffer && this.audioBuffer.loaded) {
            const sliceIndex = midiNote - Constants.samplerMIDINoteStart;
            if (sliceIndex >=0 && sliceIndex < this.slices.length) {
                const slice = this.slices[sliceIndex];
                this.slicerMonoPlayer.buffer = this.audioBuffer.get();
                this.slicerMonoPlayer.playbackRate = Tone.intervalToFrequencyRatio(slice.pitchShift || 0);
                this.slicerMonoPlayer.reverse = slice.reverse || false;
                this.slicerMonoPlayer.loop = slice.loop || false;
                this.slicerMonoPlayer.volume.value = Tone.gainToDb(slice.volume);

                this.slicerMonoEnvelope.attack = slice.envelope.attack;
                this.slicerMonoEnvelope.decay = slice.envelope.decay;
                this.slicerMonoEnvelope.sustain = slice.envelope.sustain;
                this.slicerMonoEnvelope.release = slice.envelope.release;
                
                this.slicerMonoEnvelope.triggerAttackRelease(slice.loop ? '1m' : slice.duration, Tone.now(), velocity); // Use '1m' or a long duration for looped sounds
                this.slicerMonoPlayer.start(Tone.now(), slice.offset, slice.loop ? undefined : slice.duration);
            }
            return;
        }


        if (!this.instrument && this.type !== 'DrumSampler' && this.type !== 'InstrumentSampler') return;
        const freq = Tone.Frequency(midiNote, "midi").toFrequency();

        try {
            if (this.type === 'Synth' && this.instrument) {
                this.instrument.triggerAttack(freq, Tone.now(), velocity);
            } else if (this.type === 'DrumSampler') {
                 const padIndex = midiNote - Constants.drumSamplerMIDINoteStart;
                 if (padIndex >=0 && padIndex < this.drumSamplerPads.length) {
                    const padPlayer = this.drumPadPlayers[padIndex];
                    const padData = this.drumSamplerPads[padIndex];
                    if (padPlayer && !padPlayer.disposed && padData.status === 'loaded') {
                        if (padData.envelope) { 
                            padPlayer.attack = padData.envelope.attack;
                            padPlayer.decay = padData.envelope.decay;
                            padPlayer.sustain = padData.envelope.sustain;
                            padPlayer.release = padData.envelope.release;
                        }
                        padPlayer.playbackRate = Tone.intervalToFrequencyRatio(padData.pitchShift || 0);
                        padPlayer.start(Tone.now(), 0, undefined, velocity * (padData.volume || 0.7));
                    }
                 }
            } else if (this.type === 'InstrumentSampler' && this.toneSampler) {
                this.toneSampler.triggerAttack(freq, Tone.now(), velocity);
            }
        } catch (e) {
            console.error(`[Track ${this.id}] Error playing note ${midiNote}:`, e);
        }
    }

    releaseNote(midiNote) {
        if (this.type === 'Sampler' && this.slicerIsPolyphonic && this.instrument) {
            // Tone.Players handles release via its envelope or by stopping the player if one-shot
            // For simplicity, we might not need explicit release if samples are short / one-shot
            // or if their envelopes are self-contained in their Tone.Player instances.
            // If using ADSR per slice on polyphonic, this would be complex.
            return;
        } else if (this.type === 'Sampler' && !this.slicerIsPolyphonic && this.slicerMonoEnvelope) {
             this.slicerMonoEnvelope.triggerRelease(Tone.now() + 0.01); // Small delay for release
            return;
        }


        if (!this.instrument && this.type !== 'DrumSampler' && this.type !== 'InstrumentSampler') return;
        const freq = Tone.Frequency(midiNote, "midi").toFrequency();
        try {
            if (this.type === 'Synth' && this.instrument && typeof this.instrument.triggerRelease === 'function') {
                 this.instrument.triggerRelease(freq, Tone.now() + 0.05); 
            } else if (this.type === 'DrumSampler') {
                // Drum samplers usually don't have explicit release like synths for individual pads
            } else if (this.type === 'InstrumentSampler' && this.toneSampler && typeof this.toneSampler.triggerRelease === 'function') {
                 this.toneSampler.triggerRelease(freq, Tone.now() + 0.05);
            }
        } catch (e) {
            console.error(`[Track ${this.id}] Error releasing note ${midiNote}:`, e);
        }
    }

     async fullyInitializeAudioResources() {
        console.log(`[Track ${this.id}] fullyInitializeAudioResources called for type: ${this.type}`);
        try {
            if (this.type === 'Synth') {
                if (this.instrument && !this.instrument.disposed) this.instrument.dispose();
                this.instrument = new Tone[this.synthEngineType](this.synthParams);
            } else if (this.type === 'Sampler') {
                await this.loadSamplerAudio(); 
                this.setupSlicerMonoNodes(); // Setup mono path if needed
            } else if (this.type === 'DrumSampler') {
                await this.initializeDrumPadPlayers();
                 if (this.drumPadGainNode && !this.drumPadGainNode.disposed) this.drumPadGainNode.dispose();
                 this.drumPadGainNode = new Tone.Gain(); // Output for all pads
                 this.drumPadPlayers.forEach(player => {
                     if (player && !player.disposed) player.connect(this.drumPadGainNode);
                 });

            } else if (this.type === 'InstrumentSampler') {
                 await this.loadInstrumentSamplerAudio();
            }

            this.rebuildEffectChain(); 
            this.initializeToneSequence();
            console.log(`[Track ${this.id}] fullyInitializeAudioResources finished.`);
        } catch(error) {
            console.error(`[Track ${this.id}] Error in fullyInitializeAudioResources:`, error);
            showNotification(`Error initializing audio for track ${this.name}. Some features may not work.`, 4000);
        }
    }
    
    initializeToneSequence() {
        if (this.sequence && !this.sequence.disposed) {
            this.sequence.stop();
            this.sequence.clear();
            this.sequence.dispose();
        }

        const events = [];
        for (let i = 0; i < this.sequenceLength; i++) {
            const stepEvents = [];
            for (let j = 0; j < this.sequenceData.length; j++) {
                if (this.sequenceData[j] && this.sequenceData[j][i] && this.sequenceData[j][i].active) {
                    let noteToPlay;
                    if (this.type === 'Synth' || this.type === 'InstrumentSampler') {
                        noteToPlay = Constants.synthPitches[j];
                    } else if (this.type === 'Sampler') {
                        noteToPlay = `slice-${j}`; 
                    } else if (this.type === 'DrumSampler') {
                        noteToPlay = `pad-${j}`; 
                    }
                    if (noteToPlay) {
                        stepEvents.push({
                            note: noteToPlay,
                            velocity: this.sequenceData[j][i].velocity,
                            row: j 
                        });
                    }
                }
            }
            if (stepEvents.length > 0) {
                events.push([`${Math.floor(i / STEPS_PER_BAR)}:${Math.floor((i % STEPS_PER_BAR) / 4)}:${i % 4}`, stepEvents]);
            }
        }
        
        this.sequence = new Tone.Part((time, value) => {
            if (Array.isArray(value)) { 
                value.forEach(eventDetail => this.triggerNotePlayback(eventDetail.note, eventDetail.velocity, time, eventDetail.row));
            } else { 
                this.triggerNotePlayback(value.note, value.velocity, time, value.row);
            }
        }, events).start(0);
        this.sequence.loop = true;
        this.sequence.loopEnd = `${Math.floor(this.sequenceLength / STEPS_PER_BAR)}:0:0`; 
    }

    triggerNotePlayback(noteIdentifier, velocity, time, rowIndex) {
        const currentStep = Tone.Transport.getTicksAtTime(time) / (Tone.Transport.PPQ / (Constants.STEPS_PER_BAR / 4));
        const stepCol = Math.floor(currentStep % this.sequenceLength);
        if (this.sequencerWindow && this.sequencerWindow.element && typeof window.highlightPlayingStep === 'function') {
            const gridElement = this.sequencerWindow.element.querySelector('.sequencer-grid-layout');
            window.highlightPlayingStep(stepCol, this.type, gridElement);
        }

        if (this.type === 'Synth' && this.instrument && !this.instrument.disposed) {
            this.instrument.triggerAttackRelease(noteIdentifier, "8n", time, velocity);
        } else if (this.type === 'Sampler') {
            if (this.slicerIsPolyphonic && this.instrument && this.instrument.has(noteIdentifier)) {
                const player = this.instrument.player(noteIdentifier);
                const sliceIndex = parseInt(noteIdentifier.split('-')[1]);
                const slice = this.slices[sliceIndex];
                if (player && slice) {
                    player.playbackRate = Tone.intervalToFrequencyRatio(slice.pitchShift || 0);
                    player.reverse = slice.reverse || false;
                    player.loop = slice.loop || false;
                    player.volume.value = Tone.gainToDb(slice.volume * (velocity / 0.7));
                    player.start(time, slice.offset, slice.loop ? undefined : slice.duration);
                }
            } else if (!this.slicerIsPolyphonic && this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed && this.audioBuffer && this.audioBuffer.loaded) {
                const sliceIndex = parseInt(noteIdentifier.split('-')[1]);
                 if (sliceIndex >=0 && sliceIndex < this.slices.length) {
                    const slice = this.slices[sliceIndex];
                    this.slicerMonoPlayer.buffer = this.audioBuffer.get();
                    this.slicerMonoPlayer.playbackRate = Tone.intervalToFrequencyRatio(slice.pitchShift || 0);
                    this.slicerMonoPlayer.reverse = slice.reverse || false;
                    this.slicerMonoPlayer.loop = slice.loop || false;
                    this.slicerMonoPlayer.volume.value = Tone.gainToDb(slice.volume);

                    this.slicerMonoEnvelope.attack = slice.envelope.attack;
                    this.slicerMonoEnvelope.decay = slice.envelope.decay;
                    this.slicerMonoEnvelope.sustain = slice.envelope.sustain;
                    this.slicerMonoEnvelope.release = slice.envelope.release;
                    
                    this.slicerMonoEnvelope.triggerAttackRelease(slice.loop ? '1m' : slice.duration, time, velocity);
                    this.slicerMonoPlayer.start(time, slice.offset, slice.loop ? undefined : slice.duration);
                }
            }
        } else if (this.type === 'DrumSampler') {
            const padIndex = parseInt(noteIdentifier.split('-')[1]);
            if (padIndex >= 0 && padIndex < this.drumSamplerPads.length) {
                const padPlayer = this.drumPadPlayers[padIndex];
                const padData = this.drumSamplerPads[padIndex];
                if (padPlayer && !padPlayer.disposed && padData.status === 'loaded') {
                     if (padData.envelope) { 
                        padPlayer.attack = padData.envelope.attack;
                        padPlayer.decay = padData.envelope.decay;
                        padPlayer.sustain = padData.envelope.sustain;
                        padPlayer.release = padData.envelope.release;
                    }
                    padPlayer.playbackRate = Tone.intervalToFrequencyRatio(padData.pitchShift || 0);
                    padPlayer.start(time, 0, undefined, velocity * (padData.volume || 0.7));
                }
            }
        } else if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed) {
            this.toneSampler.triggerAttackRelease(noteIdentifier, "8n", time, velocity);
        }
    }

    dispose() {
        console.log(`[Track ${this.id}] Disposing track "${this.name}"...`);
        if (this.sequence && !this.sequence.disposed) { this.sequence.stop(); this.sequence.clear(); this.sequence.dispose(); }
        
        if (this.instrument && !this.instrument.disposed) { 
            if (this.type === 'Sampler' && this.slicerIsPolyphonic) { // Tone.Players
                this.instrument.dispose(); // This should dispose all players within it
            } else { // Synth
                this.instrument.dispose();
            }
        }
        this.instrument = null;

        if (this.toneSampler && !this.toneSampler.disposed) { this.toneSampler.dispose(); this.toneSampler = null; }
        this.disposeSlicerMonoNodes();
        if (this.drumPadPlayers) {
            this.drumPadPlayers.forEach(player => { if (player && !player.disposed) player.dispose(); });
            this.drumPadPlayers = [];
        }
        if (this.drumPadGainNode && !this.drumPadGainNode.disposed) { this.drumPadGainNode.dispose(); this.drumPadGainNode = null; }
        
        this.activeEffects.forEach(effect => { if (effect.toneNode && !effect.toneNode.disposed) effect.toneNode.dispose(); });
        if (this.gainNode && !this.gainNode.disposed) { this.gainNode.dispose(); }
        if (this.trackMeter && !this.trackMeter.disposed) { this.trackMeter.dispose(); }

        if (this.inspectorWindow && typeof this.inspectorWindow.close === 'function') { this.inspectorWindow.close(true); this.inspectorWindow = null; }
        if (this.effectsRackWindow && typeof this.effectsRackWindow.close === 'function') { this.effectsRackWindow.close(true); this.effectsRackWindow = null; }
        if (this.sequencerWindow && typeof this.sequencerWindow.close === 'function') { this.sequencerWindow.close(true); this.sequencerWindow = null; }

        if (this.audioBuffer && !this.audioBuffer.disposed) { this.audioBuffer.dispose(); this.audioBuffer = null; }
        if (this.drumSamplerPads) this.drumSamplerPads.forEach(p => p.audioBuffer = null); // Assuming audioBuffer here isn't a Tone object needing disposal
        if (this.instrumentSamplerSettings && this.instrumentSamplerSettings.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) {
            this.instrumentSamplerSettings.audioBuffer.dispose();
            this.instrumentSamplerSettings.audioBuffer = null;
        }

        console.log(`[Track ${this.id}] Disposed track "${this.name}" successfully.`);
    }
    
    async loadSamplerAudio() {
        if (this.samplerAudioData && (this.samplerAudioData.dbKey || this.samplerAudioData.originalId)) {
            try {
                const audioData = await getAudio(this.samplerAudioData.dbKey || this.samplerAudioData.originalId);
                if (audioData && audioData.blob) {
                    const arrayBuffer = await audioData.blob.arrayBuffer();
                    const audioBufferDecoded = await Tone.context.decodeAudioData(arrayBuffer);
                    
                    if (this.instrument && typeof this.instrument.dispose === 'function' && !this.instrument.disposed) {
                        this.instrument.dispose(); 
                    }
                    this.instrument = new Tone.Players(); 
                    this.audioBuffer = new Tone.ToneAudioBuffer(audioBufferDecoded);
                    this.samplerAudioData.status = 'loaded';

                    if (this.slices.length === 0 || !this.slices.some(s => s.userDefined)) {
                        if (typeof window.autoSliceSample === 'function') window.autoSliceSample(this.id, Constants.numSlices);
                    }
                    this.slices.forEach((slice, index) => {
                        if (this.audioBuffer && this.audioBuffer.loaded) {
                            const player = this.instrument.add(`slice-${index}`, this.audioBuffer.get());
                            if (player) {
                                player.loop = slice.loop;
                                // Player params like volume and playbackRate (for pitch) are set at trigger time
                            }
                        }
                    });
                    if (typeof window.drawWaveform === 'function') window.drawWaveform(this);
                    if (typeof window.renderSamplePads === 'function') window.renderSamplePads(this);
                    if (typeof window.updateSliceEditorUI === 'function') window.updateSliceEditorUI(this);

                    showNotification(`Sample "${this.samplerAudioData.fileName}" loaded for track ${this.name}.`, 2000);
                } else {
                    this.samplerAudioData.status = 'missing_db';
                    console.warn(`[Track ${this.id}] Audio data not found in DB for key: ${this.samplerAudioData.dbKey || this.samplerAudioData.originalId}`);
                }
            } catch (error) {
                this.samplerAudioData.status = 'error';
                console.error(`[Track ${this.id}] Error loading sample from DB:`, error);
                showNotification(`Error loading sample "${this.samplerAudioData.fileName}" for track ${this.name}.`, 3000);
            }
        } else {
            this.samplerAudioData.status = 'empty';
        }
        this.rebuildEffectChain();
    }

    async initializeDrumPadPlayers() {
        if (this.drumPadGainNode && !this.drumPadGainNode.disposed) { this.drumPadGainNode.dispose(); }
        this.drumPadGainNode = new Tone.Gain(); // This will be connected to the effects chain/gainNode by rebuildEffectChain

        for (let i = 0; i < this.drumSamplerPads.length; i++) {
            const padData = this.drumSamplerPads[i];
            if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) {
                this.drumPadPlayers[i].dispose();
            }
            this.drumPadPlayers[i] = null; 

            if (padData && (padData.dbKey || padData.originalId) && padData.status !== 'empty') {
                try {
                    const audioData = await getAudio(padData.dbKey || padData.originalId);
                    if (audioData && audioData.blob) {
                        const arrayBuffer = await audioData.blob.arrayBuffer();
                        const audioBufferDecoded = await Tone.context.decodeAudioData(arrayBuffer);
                        const player = new Tone.Player(audioBufferDecoded).connect(this.drumPadGainNode);
                        player.volume.value = Tone.gainToDb(padData.volume || 0.7);
                        // Pitch is handled by playbackRate at trigger time in playNote
                        this.drumPadPlayers[i] = player;
                        padData.status = 'loaded';
                        console.log(`[Track ${this.id}] Drum pad ${i} sample "${padData.fileName}" loaded.`);
                    } else {
                        padData.status = 'missing_db';
                    }
                } catch (error) {
                    padData.status = 'error';
                    console.error(`[Track ${this.id}] Error loading sample for drum pad ${i}:`, error);
                }
            }
        }
        if (typeof window.renderDrumSamplerPads === 'function') window.renderDrumSamplerPads(this);
        if (typeof window.updateDrumPadControlsUI === 'function') window.updateDrumPadControlsUI(this);
    }
    
    async loadInstrumentSamplerAudio() {
        if (this.instrumentSamplerSettings && (this.instrumentSamplerSettings.dbKey || this.instrumentSamplerSettings.originalId)) {
            try {
                const audioData = await getAudio(this.instrumentSamplerSettings.dbKey || this.instrumentSamplerSettings.originalId);
                if (audioData && audioData.blob) {
                    const arrayBuffer = await audioData.blob.arrayBuffer();
                    const audioBufferDecoded = await Tone.context.decodeAudioData(arrayBuffer);
                    this.instrumentSamplerSettings.audioBuffer = new Tone.ToneAudioBuffer(audioBufferDecoded);
                    this.instrumentSamplerSettings.status = 'loaded';

                    if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.dispose();
                    
                    const urls = {};
                    urls[this.instrumentSamplerSettings.rootNote] = this.instrumentSamplerSettings.audioBuffer;

                    this.toneSampler = new Tone.Sampler({
                        urls: urls,
                        baseUrl: "", 
                        attack: this.instrumentSamplerSettings.envelope.attack,
                        release: this.instrumentSamplerSettings.envelope.release,
                        onload: () => {
                            console.log(`[Track ${this.id}] Instrument Sampler audio loaded: ${this.instrumentSamplerSettings.originalFileName}`);
                            showNotification(`Instrument sample "${this.instrumentSamplerSettings.originalFileName}" loaded.`, 2000);
                        }
                    }); // This will be connected by rebuildEffectChain
                    if (this.instrumentSamplerSettings.loop) {
                        this.toneSampler.player.loop = true;
                        this.toneSampler.player.loopStart = this.instrumentSamplerSettings.loopStart;
                        this.toneSampler.player.loopEnd = this.instrumentSamplerSettings.loopEnd;
                    }
                    if (typeof window.drawInstrumentWaveform === 'function') window.drawInstrumentWaveform(this);
                } else {
                    this.instrumentSamplerSettings.status = 'missing_db';
                }
            } catch (error) {
                this.instrumentSamplerSettings.status = 'error';
                console.error(`[Track ${this.id}] Error loading instrument sample:`, error);
            }
        } else {
            this.instrumentSamplerSettings.status = 'empty';
        }
        this.rebuildEffectChain();
    }
    
    setupSlicerMonoNodes() {
        if (!this.slicerIsPolyphonic) {
            this.disposeSlicerMonoNodes(); 
            this.slicerMonoPlayer = new Tone.Player(); 
            this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope({
                attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1
            }).connect(this.slicerMonoPlayer); 
            console.log(`[Track ${this.id}] Mono slicer nodes created.`);
            this.rebuildEffectChain(); 
        }
    }

    disposeSlicerMonoNodes() {
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) {
            this.slicerMonoPlayer.dispose();
            this.slicerMonoPlayer = null;
        }
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) {
            this.slicerMonoEnvelope.dispose();
            this.slicerMonoEnvelope = null;
        }
    }

    setSliceParam(sliceIndex, param, value) { 
        if (this.slices[sliceIndex]) {
            this.slices[sliceIndex][param] = value;
            if (this.instrument && this.instrument.player && this.instrument.player(`slice-${sliceIndex}`)) { // Check if player exists
                const player = this.instrument.player(`slice-${sliceIndex}`);
                if (param === 'loop') player.loop = value;
                if (param === 'reverse') player.reverse = value; 
            }
        }
    }
    setSliceVolume(sliceIndex, volume) { this.setSliceParam(sliceIndex, 'volume', volume); }
    setSlicePitchShift(sliceIndex, pitchShift) { this.setSliceParam(sliceIndex, 'pitchShift', pitchShift); }
    setSliceLoop(sliceIndex, loop) { this.setSliceParam(sliceIndex, 'loop', loop); }
    setSliceReverse(sliceIndex, reverse) { this.setSliceParam(sliceIndex, 'reverse', reverse); }
    setSliceEnvelopeParam(sliceIndex, param, value) {
        if (this.slices[sliceIndex] && this.slices[sliceIndex].envelope) {
            this.slices[sliceIndex].envelope[param] = value;
        }
    }
    
    setDrumSamplerPadVolume(padIndex, volume) {
        if (this.drumSamplerPads[padIndex]) {
            this.drumSamplerPads[padIndex].volume = volume;
            if (this.drumPadPlayers[padIndex] && this.drumPadPlayers[padIndex].volume) {
                this.drumPadPlayers[padIndex].volume.value = Tone.gainToDb(volume);
            }
        }
    }
    setDrumSamplerPadPitch(padIndex, pitch) {
        if (this.drumSamplerPads[padIndex]) {
            this.drumSamplerPads[padIndex].pitchShift = pitch;
        }
    }
    setDrumSamplerPadEnv(padIndex, param, value) {
        if (this.drumSamplerPads[padIndex] && this.drumSamplerPads[padIndex].envelope) {
            this.drumSamplerPads[padIndex].envelope[param] = value;
        }
    }

    setInstrumentSamplerRootNote(rootNote) {
        this.instrumentSamplerSettings.rootNote = rootNote;
        this.loadInstrumentSamplerAudio(); 
    }
    setInstrumentSamplerLoop(loop) {
        this.instrumentSamplerSettings.loop = loop;
        if (this.toneSampler && this.toneSampler.player) {
            this.toneSampler.player.loop = loop;
        }
    }
    setInstrumentSamplerLoopStart(start) {
        this.instrumentSamplerSettings.loopStart = start;
        if (this.toneSampler && this.toneSampler.player) {
            this.toneSampler.player.loopStart = start;
        }
    }
    setInstrumentSamplerLoopEnd(end) {
        this.instrumentSamplerSettings.loopEnd = end;
        if (this.toneSampler && this.toneSampler.player) {
            this.toneSampler.player.loopEnd = end;
        }
    }
    setInstrumentSamplerEnv(param, value) {
        this.instrumentSamplerSettings.envelope[param] = value;
        if (this.toneSampler) {
            if (this.toneSampler[param] && typeof this.toneSampler[param].value !== 'undefined') {
                this.toneSampler[param].value = value; 
            } else if (this.toneSampler.envelope && typeof this.toneSampler.envelope[param] !== 'undefined') {
                this.toneSampler.envelope[param] = value; 
            }
        }
    }
    setSynthParam(paramPath, value) {
        let target = this.synthParams;
        const parts = paramPath.split('.');
        for (let i = 0; i < parts.length - 1; i++) {
            target = target[parts[i]] = target[parts[i]] || {};
        }
        target[parts[parts.length - 1]] = value;

        if (this.instrument) {
            let toneTarget = this.instrument;
            for (let i = 0; i < parts.length - 1; i++) {
                toneTarget = toneTarget[parts[i]];
                if (!toneTarget) break;
            }
            if (toneTarget && typeof toneTarget[parts[parts.length - 1]] !== 'undefined') {
                if (toneTarget[parts[parts.length - 1]]?.value !== undefined) { 
                    toneTarget[parts[parts.length - 1]].value = value;
                } else {
                    toneTarget[parts[parts.length - 1]] = value;
                }
            } else {
                 console.warn(`[Track ${this.id}] Synth param path "${paramPath}" not directly found on Tone.js object. May require re-instantiation for some changes.`);
            }
        }
    }
}
