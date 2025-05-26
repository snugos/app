// js/Track.js - Track Class Module

import { STEPS_PER_BAR, defaultStepsPerBar, synthPitches, numSlices, numDrumSamplerPads } from './constants.js';

export class Track {
    constructor(id, type, initialData = null) {
        this.id = initialData?.id || id;
        this.type = type;
        this.name = initialData?.name || `${type} Track ${this.id}`;
        this.isMuted = initialData?.isMuted || false;
        this.isSoloed = (typeof window.getSoloedTrackId === 'function' && window.getSoloedTrackId() === this.id);
        this.previousVolumeBeforeMute = initialData?.volume ?? 0.7;

        if (this.type === 'Synth') {
            this.synthEngineType = initialData?.synthEngineType || 'BasicPoly';
            this.synthParams = initialData?.synthParams ? JSON.parse(JSON.stringify(initialData.synthParams)) : this.getDefaultSynthParams(this.synthEngineType);
        } else {
            this.synthEngineType = null;
            this.synthParams = {}; // Not a synth track
        }

        this.originalFileName = initialData?.samplerAudioData?.fileName || null;
        this.audioBuffer = null;
        this.audioBufferDataURL = initialData?.samplerAudioData?.audioBufferDataURL || null;
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
            sampleUrl: null,
            audioBuffer: null,
            audioBufferDataURL: initialData?.instrumentSamplerSettings?.audioBufferDataURL || null,
            originalFileName: initialData?.instrumentSamplerSettings?.originalFileName || null,
            rootNote: initialData?.instrumentSamplerSettings?.rootNote || 'C4',
            loop: initialData?.instrumentSamplerSettings?.loop || false,
            loopStart: initialData?.instrumentSamplerSettings?.loopStart || 0,
            loopEnd: initialData?.instrumentSamplerSettings?.loopEnd || 0,
            envelope: initialData?.instrumentSamplerSettings?.envelope || { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 },
        };
        this.instrumentSamplerIsPolyphonic = initialData?.instrumentSamplerIsPolyphonic !== undefined ? initialData.instrumentSamplerIsPolyphonic : true;
        this.toneSampler = null;

        this.drumSamplerPads = initialData?.drumSamplerPads || Array(numDrumSamplerPads).fill(null).map(() => ({
            sampleUrl: null, audioBuffer: null, audioBufferDataURL: null, originalFileName: null,
            volume: 0.7, pitchShift: 0,
            envelope: { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 }
        }));
        if (initialData?.drumSamplerPads) {
            initialData.drumSamplerPads.forEach((padData, index) => {
                if (this.drumSamplerPads[index]) {
                    this.drumSamplerPads[index].audioBufferDataURL = padData.audioBufferDataURL || null;
                    this.drumSamplerPads[index].originalFileName = padData.originalFileName || null;
                    this.drumSamplerPads[index].volume = padData.volume ?? 0.7;
                    this.drumSamplerPads[index].pitchShift = padData.pitchShift ?? 0;
                    this.drumSamplerPads[index].envelope = padData.envelope ? JSON.parse(JSON.stringify(padData.envelope)) : { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 };
                }
            });
        }
        this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
        this.drumPadPlayers = Array(numDrumSamplerPads).fill(null);

        this.effects = initialData?.effects ? JSON.parse(JSON.stringify(initialData.effects)) : {};
        this.effects.reverb = this.effects.reverb || { wet: 0, decay: 2.5, preDelay: 0.02 };
        this.effects.delay = this.effects.delay || { wet: 0, time: 0.5, feedback: 0.3 };
        this.effects.filter = this.effects.filter || { frequency: 20000, type: "lowpass", Q: 1, rolloff: -12 };
        this.effects.compressor = this.effects.compressor || { threshold: -24, ratio: 12, attack: 0.003, release: 0.25, knee: 30 };
        this.effects.eq3 = this.effects.eq3 || { low: 0, mid: 0, high: 0 };
        this.effects.distortion = this.effects.distortion || { amount: 0 };
        this.effects.chorus = this.effects.chorus || { wet: 0, frequency: 1.5, delayTime: 3.5, depth: 0.7 };
        this.effects.saturation = this.effects.saturation || { wet: 0, amount: 2 };
        this.effects.phaser = this.effects.phaser || { frequency: 0.5, octaves: 3, baseFrequency: 350, Q: 1, wet: 0 };
        this.effects.autoWah = this.effects.autoWah || {
            wet: 0, baseFrequency: 100, octaves: 6, sensitivity: 0, Q: 2, gain: 2, follower: 0.1
        };

        this.distortionNode = null; this.filterNode = null; this.chorusNode = null;
        this.saturationNode = null; this.phaserNode = null; this.autoWahNode = null;
        this.eq3Node = null; this.compressorNode = null; this.delayNode = null;
        this.reverbNode = null; this.gainNode = null; this.trackMeter = null;

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

    getDefaultSynthParams(engineType) {
        switch (engineType) {
            case 'AMSynth':
                return {
                    // For Tone.AMSynth directly
                    harmonicity: 3,
                    detune: 0,
                    oscillator: { type: 'sine' }, // Options for the carrier oscillator
                    envelope: { attack: 0.01, decay: 0.1, sustain: 1, release: 0.5 }, // For the carrier
                    modulation: { type: 'square' }, // Options for the modulator oscillator
                    modulationEnvelope: { attack: 0.5, decay: 0.01, sustain: 1, release: 0.5 } // For the modulator
                };
            case 'FMSynth':
                return {
                    // For Tone.FMSynth directly
                    harmonicity: 3,
                    modulationIndex: 10,
                    detune: 0,
                    oscillator: { type: 'sine' }, // Carrier oscillator options
                    envelope: { attack: 0.01, decay: 0.1, sustain: 1, release: 0.5 }, // Carrier envelope
                    modulation: { type: 'square' }, // Modulator oscillator options
                    modulationEnvelope: { attack: 0.5, decay: 0.01, sustain: 1, release: 0.5 } // Modulator envelope
                };
            case 'BasicPoly':
            default:
                return {
                    // For Tone.Synth wrapped in PolySynth
                    oscillator: { type: 'triangle8' },
                    envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 }
                    // PolySynth options like 'polyphony' are handled at PolySynth instantiation
                };
        }
    }

    async initializeAudioNodes() {
        console.log(`[Track ${this.id}] Initializing audio nodes...`);
        try {
            this.distortionNode = new Tone.Distortion(this.effects.distortion.amount);
            this.filterNode = new Tone.Filter(this.effects.filter); // Pass full options object
            this.chorusNode = new Tone.Chorus(this.effects.chorus.frequency, this.effects.chorus.delayTime, this.effects.chorus.depth).set({wet: this.effects.chorus.wet});
            this.saturationNode = new Tone.Chebyshev(Math.max(1, Math.floor(this.effects.saturation.amount) * 2 + 1)).set({wet: this.effects.saturation.wet});
            this.phaserNode = new Tone.Phaser(this.effects.phaser); // Pass full options object

            if (typeof Tone !== 'undefined' && typeof Tone.AutoWah === 'function') {
                this.autoWahNode = new Tone.AutoWah(this.effects.autoWah); // Pass full options object
                console.log(`[Track ${this.id}] AutoWah node created successfully.`);
            } else {
                console.error(`[Track ${this.id}] Tone.AutoWah is not a constructor or Tone is undefined during initializeAudioNodes.`);
                this.autoWahNode = null;
            }

            this.eq3Node = new Tone.EQ3(this.effects.eq3); // Pass full options object
            this.compressorNode = new Tone.Compressor(this.effects.compressor); // Pass full options object
            this.delayNode = new Tone.FeedbackDelay(this.effects.delay.time, this.effects.delay.feedback).set({wet: this.effects.delay.wet});
            this.reverbNode = new Tone.Reverb(this.effects.reverb.decay).set({ // Decay is main arg, others via set
                preDelay: this.effects.reverb.preDelay,
                wet: this.effects.reverb.wet
            });
            this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });

            const effectChainNodes = [
                this.distortionNode, this.filterNode, this.chorusNode,
                this.saturationNode, this.phaserNode
            ];
            if (this.autoWahNode) effectChainNodes.push(this.autoWahNode);
            effectChainNodes.push(
                this.eq3Node, this.compressorNode, this.delayNode,
                this.reverbNode, this.gainNode, this.trackMeter, Tone.getDestination()
            );
            Tone.connectSeries(...effectChainNodes);
            console.log(`[Track ${this.id}] Audio nodes initialized and chained.`);
        } catch (error) {
            console.error(`[Track ${this.id}] Critical error during audio node initialization:`, error);
        }
    }

    async fullyInitializeAudioResources() {
        await this.initializeInstrument();
        this.setSequenceLength(this.sequenceLength, true);
        if (this.waveformCanvasCtx && this.type === 'Sampler' && this.audioBuffer && this.audioBuffer.loaded) {
            if (typeof window.drawWaveform === 'function') window.drawWaveform(this);
        }
         if (this.instrumentWaveformCanvasCtx && this.type === 'InstrumentSampler' && this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
            if (typeof window.drawInstrumentWaveform === 'function') window.drawInstrumentWaveform(this);
        }
        this.applyMuteState();
        this.applySoloState();
    }

    async initializeInstrument() {
        if (!this.distortionNode && this.type !== 'Sampler' && this.type !== 'InstrumentSampler' && this.type !== 'DrumSampler') {
            console.error(`[Track ${this.id}] Distortion node not initialized. Cannot connect instrument for type ${this.type}.`);
            // For non-synth types that connect to distortionNode, this check is also important
            // For Sampler/DrumSampler/InstrumentSampler, they might connect to distortionNode or have their own handling
        }
        if (this.instrument && typeof this.instrument.dispose === 'function' && !this.instrument.disposed) {
            this.instrument.dispose();
            this.instrument = null;
        }

        try {
            if (this.type === 'Synth') {
                let synthEngineConstructor;
                let engineParamsToSet; // Params to be passed to .set() after PolySynth creation

                switch (this.synthEngineType) {
                    case 'AMSynth':
                        synthEngineConstructor = Tone.AMSynth;
                        engineParamsToSet = this.synthParams.amSynth || this.getDefaultSynthParams('AMSynth');
                        this.synthParams.amSynth = engineParamsToSet; // Ensure params are in track state
                        break;
                    case 'FMSynth':
                        synthEngineConstructor = Tone.FMSynth;
                        engineParamsToSet = this.synthParams.fmSynth || this.getDefaultSynthParams('FMSynth');
                        this.synthParams.fmSynth = engineParamsToSet;
                        break;
                    case 'BasicPoly':
                    default:
                        synthEngineConstructor = Tone.Synth;
                        engineParamsToSet = this.synthParams.basicPoly || this.getDefaultSynthParams('BasicPoly');
                        this.synthParams.basicPoly = engineParamsToSet;
                        break;
                }

                // All synth types are wrapped in PolySynth for polyphony
                this.instrument = new Tone.PolySynth(synthEngineConstructor, {
                    polyphony: 8, // Default polyphony, can be made configurable
                    // Pass parameters to the underlying synth voice
                    voice: synthEngineConstructor // This ensures PolySynth uses the correct voice type
                });
                this.instrument.set(engineParamsToSet); // Apply specific params to the voices

                if (this.distortionNode) {
                    this.instrument.connect(this.distortionNode);
                } else {
                     console.warn(`[Track ${this.id}] Distortion node not available for synth, connecting to destination.`);
                    this.instrument.toDestination(); // Fallback
                }
                console.log(`[Track ${this.id}] Initialized ${this.synthEngineType} (as PolySynth)`);

            } else if (this.type === 'Sampler') {
                if (this.audioBufferDataURL) {
                    if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose();
                    this.audioBuffer = await new Tone.Buffer().load(this.audioBufferDataURL);
                    if (!this.slicerIsPolyphonic && this.audioBuffer.loaded) this.setupSlicerMonoNodes();
                } else {
                    if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose();
                    this.audioBuffer = null;
                }
            } else if (this.type === 'InstrumentSampler') {
                if (this.instrumentSamplerSettings.audioBufferDataURL) {
                    if (this.instrumentSamplerSettings.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose();
                    this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(this.instrumentSamplerSettings.audioBufferDataURL);
                    this.setupToneSampler();
                } else {
                    if (this.instrumentSamplerSettings.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose();
                    this.instrumentSamplerSettings.audioBuffer = null;
                    this.setupToneSampler();
                }
            } else if (this.type === 'DrumSampler') {
                const padPromises = this.drumSamplerPads.map(async (padData, i) => {
                    if (padData.audioBufferDataURL) {
                        if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
                        padData.audioBuffer = await new Tone.Buffer().load(padData.audioBufferDataURL);
                        if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) this.drumPadPlayers[i].dispose();
                        if (this.distortionNode) {
                           this.drumPadPlayers[i] = new Tone.Player(padData.audioBuffer).connect(this.distortionNode);
                        } else {
                            this.drumPadPlayers[i] = new Tone.Player(padData.audioBuffer).toDestination();
                        }
                    } // else: no audio data URL, pad remains empty or player null
                });
                await Promise.all(padPromises);
            }
        } catch (error) {
            console.error(`[Track ${this.id}] Error initializing instrument/audio resources for (${this.synthEngineType || this.type}):`, error);
        }
    }

    setupSlicerMonoNodes() {
        if (!this.distortionNode) {
            console.error(`[Track ${this.id}] Distortion node not initialized for SlicerMonoNodes.`);
            return;
        }
        if (!this.slicerMonoPlayer || this.slicerMonoPlayer.disposed) {
            this.slicerMonoPlayer = new Tone.Player();
            this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
            this.slicerMonoGain = new Tone.Gain(1);
            this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain, this.distortionNode);
        }
        if (this.audioBuffer && this.audioBuffer.loaded && this.slicerMonoPlayer) {
            this.slicerMonoPlayer.buffer = this.audioBuffer;
        }
    }
    disposeSlicerMonoNodes() { 
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) this.slicerMonoPlayer.dispose();
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) this.slicerMonoEnvelope.dispose();
        if (this.slicerMonoGain && !this.slicerMonoGain.disposed) this.slicerMonoGain.dispose();
        this.slicerMonoPlayer = null; this.slicerMonoEnvelope = null; this.slicerMonoGain = null;
    }
    setupToneSampler() { 
        if (!this.distortionNode) {
            console.error(`[Track ${this.id}] Distortion node not initialized for ToneSampler.`);
            return;
        }
        if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.dispose();
        const urls = {};
        if (this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
            urls[this.instrumentSamplerSettings.rootNote] = this.instrumentSamplerSettings.audioBuffer;
        }
        this.toneSampler = new Tone.Sampler({
            urls: urls,
            attack: this.instrumentSamplerSettings.envelope.attack,
            release: this.instrumentSamplerSettings.envelope.release,
            baseUrl: "",
        }).connect(this.distortionNode);
        this.toneSampler.loop = this.instrumentSamplerSettings.loop;
        this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart;
        this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd;
    }


    setVolume(volume, fromInteraction = false) { 
        this.previousVolumeBeforeMute = parseFloat(volume);
        if (this.gainNode && !this.isMuted) { this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05); }
    }
    applyMuteState() { 
        if (!this.gainNode) return;
        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
        if (this.isMuted) {
            this.gainNode.gain.rampTo(0, 0.01);
        } else {
            if (currentGlobalSoloId && currentGlobalSoloId !== this.id) {
                this.gainNode.gain.rampTo(0, 0.01);
            } else {
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
            }
        }
    }
    applySoloState() { 
        if (!this.gainNode) return;
        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
        if (this.isMuted) {
            this.gainNode.gain.rampTo(0, 0.01);
            return;
        }
        if (currentGlobalSoloId) {
            if (this.id === currentGlobalSoloId) {
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
            } else {
                this.gainNode.gain.rampTo(0, 0.01);
            }
        } else {
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
        }
    }

    // Effect Setters
    setReverbWet(value) { this.effects.reverb.wet = parseFloat(value) || 0; if(this.reverbNode) this.reverbNode.wet.value = this.effects.reverb.wet; }
    setDelayWet(value) { this.effects.delay.wet = parseFloat(value) || 0; if(this.delayNode) this.delayNode.wet.value = this.effects.delay.wet; }
    setFilterFrequency(value) { this.effects.filter.frequency = parseFloat(value) || 20000; if(this.filterNode) this.filterNode.frequency.value = this.effects.filter.frequency; }
    setFilterType(value) { this.effects.filter.type = value; if(this.filterNode) this.filterNode.type = this.effects.filter.type; }
    setDistortionAmount(value) { this.effects.distortion.amount = parseFloat(value) || 0; if(this.distortionNode) this.distortionNode.distortion = this.effects.distortion.amount; }
    setChorusWet(value) { this.effects.chorus.wet = parseFloat(value) || 0; if(this.chorusNode) this.chorusNode.wet.value = this.effects.chorus.wet; }
    setChorusFrequency(value) { this.effects.chorus.frequency = parseFloat(value) || 1.5; if(this.chorusNode) this.chorusNode.frequency.value = this.effects.chorus.frequency; }
    setChorusDelayTime(value) { this.effects.chorus.delayTime = parseFloat(value) || 3.5; if(this.chorusNode) this.chorusNode.delayTime = this.effects.chorus.delayTime; }
    setChorusDepth(value) { this.effects.chorus.depth = parseFloat(value) || 0.7; if(this.chorusNode) this.chorusNode.depth = this.effects.chorus.depth; }
    setSaturationWet(value) { this.effects.saturation.wet = parseFloat(value) || 0; if(this.saturationNode) this.saturationNode.wet.value = this.effects.saturation.wet; }
    setSaturationAmount(value) {
        this.effects.saturation.amount = parseFloat(value) || 0;
        if(this.saturationNode) this.saturationNode.order = Math.max(1, Math.floor(this.effects.saturation.amount) * 2 + 1);
    }
    setPhaserFrequency(value) { this.effects.phaser.frequency = parseFloat(value); if(this.phaserNode) this.phaserNode.frequency.value = this.effects.phaser.frequency; }
    setPhaserOctaves(value) { this.effects.phaser.octaves = parseInt(value, 10); if(this.phaserNode) this.phaserNode.octaves = this.effects.phaser.octaves; }
    setPhaserBaseFrequency(value) { this.effects.phaser.baseFrequency = parseFloat(value); if(this.phaserNode) this.phaserNode.baseFrequency = this.effects.phaser.baseFrequency; }
    setPhaserQ(value) { this.effects.phaser.Q = parseFloat(value); if(this.phaserNode) this.phaserNode.Q.value = this.effects.phaser.Q; }
    setPhaserWet(value) { this.effects.phaser.wet = parseFloat(value); if(this.phaserNode) this.phaserNode.wet.value = this.effects.phaser.wet; }
    setAutoWahWet(value) { this.effects.autoWah.wet = parseFloat(value); if(this.autoWahNode) this.autoWahNode.wet.value = this.effects.autoWah.wet; }
    setAutoWahBaseFrequency(value) { this.effects.autoWah.baseFrequency = parseFloat(value); if(this.autoWahNode) this.autoWahNode.baseFrequency.value = this.effects.autoWah.baseFrequency; } 
    setAutoWahOctaves(value) { this.effects.autoWah.octaves = parseInt(value, 10); if(this.autoWahNode) this.autoWahNode.octaves = this.effects.autoWah.octaves; }
    setAutoWahSensitivity(value) { this.effects.autoWah.sensitivity = parseFloat(value); if(this.autoWahNode) this.autoWahNode.sensitivity = this.effects.autoWah.sensitivity; } 
    setAutoWahQ(value) { this.effects.autoWah.Q = parseFloat(value); if(this.autoWahNode) this.autoWahNode.Q.value = this.effects.autoWah.Q; }
    setAutoWahGain(value) { this.effects.autoWah.gain = parseFloat(value); if(this.autoWahNode) this.autoWahNode.gain.value = this.effects.autoWah.gain; }
    setAutoWahFollower(value) {
        this.effects.autoWah.follower = parseFloat(value);
        if(this.autoWahNode && this.autoWahNode.follower) { 
             if (this.autoWahNode.follower.attack && typeof this.autoWahNode.follower.attack.value !== 'undefined') { // Check if follower has signal-like properties
                this.autoWahNode.follower.attack = this.effects.autoWah.follower;
                this.autoWahNode.follower.release = this.effects.autoWah.follower; 
            } else if (typeof this.autoWahNode.follower === 'object' && 'attack' in this.autoWahNode.follower) { // If it's an options object
                 this.autoWahNode.follower.set({ attack: this.effects.autoWah.follower, release: this.effects.autoWah.follower });
            } else { // Fallback if follower is just a number (less likely for component)
                this.autoWahNode.follower = this.effects.autoWah.follower;
            }
        }
    }


    // Generic Synth Param Setter
    setSynthParam(paramPath, value) {
        if (this.type !== 'Synth' || !this.instrument) {
            console.warn(`[Track ${this.id}] setSynthParam called on non-synth track or uninitialized instrument.`);
            return;
        }
        
        const setNestedParam = (obj, path, val) => {
            const keys = path.split('.');
            let current = obj;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
                    current[keys[i]] = {}; 
                }
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = val;
        };

        let targetParamsObjectKey; // e.g., 'basicPoly', 'amSynth'
        let paramsForToneSet = {};

        switch (this.synthEngineType) {
            case 'BasicPoly':
                targetParamsObjectKey = 'basicPoly';
                break;
            case 'AMSynth':
                targetParamsObjectKey = 'amSynth';
                break;
            case 'FMSynth':
                targetParamsObjectKey = 'fmSynth';
                break;
            default:
                console.warn(`[Track ${this.id}] Unknown synth engine type for setSynthParam: ${this.synthEngineType}`);
                return;
        }
        
        // Ensure the specific params object exists on this.synthParams
        this.synthParams[targetParamsObjectKey] = this.synthParams[targetParamsObjectKey] || this.getDefaultSynthParams(this.synthEngineType);
        setNestedParam(this.synthParams[targetParamsObjectKey], paramPath, value);

        // Prepare the object for this.instrument.set()
        // For PolySynth, .set() applies to the options of the *voice* synth.
        // The structure of paramsForToneSet needs to match what the specific voice (Synth, AMSynth, FMSynth) expects.
        const pathParts = paramPath.split('.');
        if (pathParts.length > 1) {
            // e.g., oscillator.type -> { oscillator: { type: value } }
            let tempObj = paramsForToneSet;
            for(let i=0; i < pathParts.length -1; i++) {
                tempObj[pathParts[i]] = tempObj[pathParts[i]] || {};
                tempObj = tempObj[pathParts[i]];
            }
            tempObj[pathParts[pathParts.length -1]] = value;
        } else {
            // e.g. harmonicity -> { harmonicity: value }
            paramsForToneSet[paramPath] = value;
        }
        
        try {
            this.instrument.set(paramsForToneSet);
        } catch (e) {
            console.error(`[Track ${this.id}] Error setting synth param ${paramPath} for ${this.synthEngineType}:`, e, "Params for .set():", paramsForToneSet);
        }
    }

    setSliceVolume(sliceIndex, volume) { if (this.type !== 'Sampler' || !this.slices[sliceIndex]) return; this.slices[sliceIndex].volume = parseFloat(volume) || 0; }
    setSlicePitchShift(sliceIndex, semitones) { if (this.type !== 'Sampler' || !this.slices[sliceIndex]) return; this.slices[sliceIndex].pitchShift = parseFloat(semitones) || 0; }
    setSliceLoop(sliceIndex, loop) { if (this.type !== 'Sampler' || !this.slices[sliceIndex]) return; this.slices[sliceIndex].loop = Boolean(loop); }
    setSliceReverse(sliceIndex, reverse) { if (this.type !== 'Sampler' || !this.slices[sliceIndex]) return; this.slices[sliceIndex].reverse = Boolean(reverse); }
    setSliceEnvelopeParam(sliceIndex, param, value) { if (this.type !== 'Sampler' || !this.slices[sliceIndex] || !this.slices[sliceIndex].envelope) return; this.slices[sliceIndex].envelope[param] = parseFloat(value) || 0; }
    setDrumSamplerPadVolume(padIndex, volume) { if (this.type !== 'DrumSampler' || !this.drumSamplerPads[padIndex]) return; this.drumSamplerPads[padIndex].volume = parseFloat(volume); }
    setDrumSamplerPadPitch(padIndex, pitch) { if (this.type !== 'DrumSampler' || !this.drumSamplerPads[padIndex]) return; this.drumSamplerPads[padIndex].pitchShift = parseFloat(pitch); }
    setDrumSamplerPadEnv(padIndex, param, value) { if (this.type !== 'DrumSampler' || !this.drumSamplerPads[padIndex]) return; this.drumSamplerPads[padIndex].envelope[param] = parseFloat(value); }
    setInstrumentSamplerRootNote(noteName) { if (this.type !== 'InstrumentSampler') return; this.instrumentSamplerSettings.rootNote = noteName; this.setupToneSampler(); }
    setInstrumentSamplerLoop(loop) { if (this.type !== 'InstrumentSampler') return; this.instrumentSamplerSettings.loop = Boolean(loop); if (this.toneSampler) this.toneSampler.loop = this.instrumentSamplerSettings.loop; }
    setInstrumentSamplerLoopStart(time) { if (this.type !== 'InstrumentSampler' || !this.instrumentSamplerSettings.audioBuffer) return; this.instrumentSamplerSettings.loopStart = Math.min(this.instrumentSamplerSettings.audioBuffer.duration, Math.max(0, parseFloat(time))); if (this.toneSampler) this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart; }
    setInstrumentSamplerLoopEnd(time) { if (this.type !== 'InstrumentSampler' || !this.instrumentSamplerSettings.audioBuffer) return; this.instrumentSamplerSettings.loopEnd = Math.min(this.instrumentSamplerSettings.audioBuffer.duration, Math.max(this.instrumentSamplerSettings.loopStart, parseFloat(time))); if (this.toneSampler) this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd; }
    setInstrumentSamplerEnv(param, value) { if (this.type !== 'InstrumentSampler') return; this.instrumentSamplerSettings.envelope[param] = parseFloat(value); if (this.toneSampler) this.toneSampler.set({ attack: this.instrumentSamplerSettings.envelope.attack, release: this.instrumentSamplerSettings.envelope.release }); }

    async doubleSequence() { /* ... */ }
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
        const newGridDataArray = Array(numRows).fill(null).map((_, rIndex) => {
            const currentRow = currentSequenceData[rIndex] || [];
            const newRow = Array(this.sequenceLength).fill(null);
            for (let c = 0; c < Math.min(currentRow.length, this.sequenceLength); c++) {
                newRow[c] = currentRow[c];
            }
            return newRow;
        });
        this.sequenceData = newGridDataArray;


        if (this.sequence && !this.sequence.disposed) {
            this.sequence.stop();
            this.sequence.clear();
            this.sequence.dispose();
        }

        this.sequence = new Tone.Sequence((time, col) => {
            const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
            const isSoloedOut = currentGlobalSoloId && currentGlobalSoloId !== this.id;
            
            if (this.sequencerWindow && !this.sequencerWindow.isMinimized) {
                const grid = this.sequencerWindow.element?.querySelector('.sequencer-grid');
                if (grid && typeof window.highlightPlayingStep === 'function') {
                    window.highlightPlayingStep(col, this.type, grid);
                }
            }

            if (!this.gainNode || this.isMuted || isSoloedOut) {
                return;
            }
            
             if (this.type === 'Synth') {
                synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step && step.active && this.instrument && typeof this.instrument.triggerAttackRelease === 'function') {
                        this.instrument.triggerAttackRelease(pitchName, "8n", time, step.velocity);
                    } 
                });
            } else if (this.type === 'Sampler') { 
                this.slices.forEach((sliceData, sliceIndex) => {
                    const step = this.sequenceData[sliceIndex]?.[col];
                    if (step?.active && sliceData?.duration > 0 && this.audioBuffer?.loaded) {
                        const totalPitchShift = sliceData.pitchShift;
                        const playbackRate = Math.pow(2, totalPitchShift / 12);
                        let playDuration = sliceData.duration / playbackRate;
                        if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds();

                        if (this.slicerIsPolyphonic) {
                            const tempPlayer = new Tone.Player(this.audioBuffer);
                            const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                            const tempGain = new Tone.Gain(Tone.dbToGain(-6) * sliceData.volume * step.velocity);
                            if (this.distortionNode) tempPlayer.chain(tempEnv, tempGain, this.distortionNode);
                            else tempPlayer.chain(tempEnv, tempGain, Tone.getDestination());

                            tempPlayer.playbackRate = playbackRate;
                            tempPlayer.reverse = sliceData.reverse;
                            tempPlayer.loop = sliceData.loop;
                            tempPlayer.loopStart = sliceData.offset;
                            tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
                            tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            tempEnv.triggerAttack(time);
                            if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95);
                            Tone.Transport.scheduleOnce(() => {
                                if (tempPlayer && !tempPlayer.disposed) { tempPlayer.stop(); tempPlayer.dispose(); }
                                if (tempEnv && !tempEnv.disposed) tempEnv.dispose();
                                if (tempGain && !tempGain.disposed) tempGain.dispose();
                            }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.1);
                        } else {
                            if (!this.slicerMonoPlayer || this.slicerMonoPlayer.disposed) {
                                this.setupSlicerMonoNodes();
                                if(!this.slicerMonoPlayer) return;
                            }
                            const player = this.slicerMonoPlayer;
                            const env = this.slicerMonoEnvelope;
                            const gain = this.slicerMonoGain;
                            if (player.state === 'started') { player.stop(time); }
                            if (env.getValueAtTime(time) > 0.001) { env.triggerRelease(time); }
                            player.buffer = this.audioBuffer;
                            env.set(sliceData.envelope);
                            gain.gain.value = Tone.dbToGain(-6) * sliceData.volume * step.velocity;
                            player.playbackRate = playbackRate;
                            player.reverse = sliceData.reverse;
                            player.loop = sliceData.loop;
                            player.loopStart = sliceData.offset;
                            player.loopEnd = sliceData.offset + sliceData.duration;
                            player.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            env.triggerAttack(time);
                            if (!sliceData.loop) {
                                const effectiveDuration = playDuration;
                                const releaseTime = time + effectiveDuration - (sliceData.envelope.release || 0.1);
                                env.triggerRelease(Math.max(time, releaseTime));
                            }
                        }
                    }
                });
            }
            else if (this.type === 'DrumSampler') { 
                this.drumSamplerPads.forEach((padData, padIndex) => {
                    const step = this.sequenceData[padIndex]?.[col];
                    if (step?.active && this.drumPadPlayers[padIndex] && this.drumPadPlayers[padIndex].loaded) {
                        const player = this.drumPadPlayers[padIndex];
                        player.volume.value = Tone.gainToDb(padData.volume * step.velocity);
                        player.playbackRate = Math.pow(2, (padData.pitchShift) / 12);
                        player.start(time);
                    }
                });
            }
            else if (this.type === 'InstrumentSampler') { 
                synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active && this.toneSampler && this.toneSampler.loaded) {
                        const midiNote = Tone.Frequency(pitchName).toMidi();
                        const shiftedNote = Tone.Frequency(midiNote, "midi").toNote();
                        this.toneSampler.triggerAttackRelease(shiftedNote, "8n", time, step.velocity);
                    } 
                });
            }


        }, Array.from(Array(this.sequenceLength).keys()), "16n").start(0);

        if (this.sequencerWindow && !this.sequencerWindow.isMinimized && window.openWindows[`sequencerWin-${this.id}`]) {
             if (typeof window.openTrackSequencerWindow === 'function') {
                window.openTrackSequencerWindow(this.id, true);
             }
        }
    }
    dispose() { 
        if (this.instrument && !this.instrument.disposed) {this.instrument.dispose();}
        if (this.audioBuffer && !this.audioBuffer.disposed) {this.audioBuffer.dispose();}

        this.drumSamplerPads.forEach((pad) => {
            if (pad.audioBuffer && !pad.audioBuffer.disposed) { pad.audioBuffer.dispose(); }
        });
        this.drumPadPlayers.forEach((player) => {
            if (player && !player.disposed) { player.dispose(); }
        });

        if (this.instrumentSamplerSettings.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) {
            this.instrumentSamplerSettings.audioBuffer.dispose();
        }
        if (this.toneSampler && !this.toneSampler.disposed) {this.toneSampler.dispose();}

        this.disposeSlicerMonoNodes();

        const nodesToDispose = [
            this.gainNode, this.reverbNode, this.delayNode,
            this.compressorNode, this.eq3Node, this.filterNode,
            this.distortionNode, this.chorusNode, this.saturationNode,
            this.phaserNode, this.autoWahNode,
            this.trackMeter
        ];
        
        nodesToDispose.forEach(node => { 
            if (node && typeof node.dispose === 'function' && !node.disposed) {
                node.dispose();
            }
        });

        if (this.sequence && !this.sequence.disposed) {
            this.sequence.stop(); this.sequence.clear(); this.sequence.dispose();
        }

        this.inspectorWindow = null;
        this.effectsRackWindow = null;
        this.sequencerWindow = null;
    }
}
