// js/Track.js - Track Class Module

import { STEPS_PER_BAR, defaultStepsPerBar, synthPitches, numSlices, numDrumSamplerPads, samplerMIDINoteStart, defaultVelocity } from './constants.js'; // Added samplerMIDINoteStart, defaultVelocity

export class Track {
    constructor(id, type, initialData = null) {
        this.id = initialData?.id || id;
        this.type = type;

        if (type === 'DrumSampler') {
            this.name = initialData?.name || `Sampler (Pads) ${this.id}`;
        } else {
            this.name = initialData?.name || `${type} Track ${this.id}`;
        }

        this.isMuted = initialData?.isMuted || false;
        this.isSoloed = (typeof window.getSoloedTrackId === 'function' && window.getSoloedTrackId() === this.id);
        this.previousVolumeBeforeMute = initialData?.volume ?? 0.7;

        if (this.type === 'Synth') {
            this.synthEngineType = initialData?.synthEngineType || 'BasicPoly';
            this.synthParams = initialData?.synthParams ? JSON.parse(JSON.stringify(initialData.synthParams)) : this.getDefaultSynthParams(this.synthEngineType);
        } else {
            this.synthEngineType = null;
            this.synthParams = {};
        }

        this.originalFileName = initialData?.samplerAudioData?.fileName || null; // For Slicer
        this.audioBuffer = null; // For Slicer Sampler
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

        // Corrected: Use directly imported numDrumSamplerPads
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
        // Corrected: Use directly imported numDrumSamplerPads
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

        this.instrument = null; // For Synths
        this.sequenceLength = initialData?.sequenceLength || defaultStepsPerBar;

        let numRowsForGrid;
        // Corrected: Use directly imported constants
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
        // Basic Poly Default Parameters
        if (engineType === 'BasicPoly') {
            return {
                oscillator: { type: 'pwm', modulationFrequency: 0.2 }, // Example: pwm needs modulationFrequency
                envelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 1 },
                // Add other specific params for BasicPoly if any, e.g., portamento
            };
        }
        // AM Synth Default Parameters
        else if (engineType === 'AMSynth') {
            return {
                harmonicity: 3,
                detune: 0,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
                modulation: { type: 'square' },
                modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 },
            };
        }
        // FM Synth Default Parameters
        else if (engineType === 'FMSynth') {
            return {
                harmonicity: 3,
                modulationIndex: 10,
                detune: 0,
                oscillator: { type: 'sine' },
                envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
                modulation: { type: 'square' },
                modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 },
            };
        }
        // Fallback for unknown engine types (or if you add more later)
        console.warn(`[Track ${this.id}] getDefaultSynthParams: Unknown engineType "${engineType}". Returning empty object.`);
        return {};
    }


    async initializeAudioNodes() {
        console.log(`[Track ${this.id}] Initializing audio nodes for type: ${this.type}...`);
        try {
            this.distortionNode = new Tone.Distortion(this.effects.distortion.amount);
            this.filterNode = new Tone.Filter(this.effects.filter);
            this.chorusNode = new Tone.Chorus(this.effects.chorus.frequency, this.effects.chorus.delayTime, this.effects.chorus.depth).set({wet: this.effects.chorus.wet});
            this.saturationNode = new Tone.Chebyshev(Math.max(1, Math.floor(this.effects.saturation.amount) * 2 + 1)).set({wet: this.effects.saturation.wet});
            this.phaserNode = new Tone.Phaser(this.effects.phaser);
            if (typeof Tone !== 'undefined' && typeof Tone.AutoWah === 'function') {
                this.autoWahNode = new Tone.AutoWah(this.effects.autoWah);
            } else { this.autoWahNode = null; console.error(`[Track ${this.id}] Tone.AutoWah not available.`); }
            this.eq3Node = new Tone.EQ3(this.effects.eq3);
            this.compressorNode = new Tone.Compressor(this.effects.compressor);
            this.delayNode = new Tone.FeedbackDelay(this.effects.delay.time, this.effects.delay.feedback).set({wet: this.effects.delay.wet});
            this.reverbNode = new Tone.Reverb(this.effects.reverb.decay).set({ preDelay: this.effects.reverb.preDelay, wet: this.effects.reverb.wet });
            this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);

            this.trackMeter = new Tone.Meter({ smoothing: 0.8 });
            console.log(`[Track ${this.id}] TrackMeter created:`, this.trackMeter);

            const effectChainNodes = [ this.distortionNode, this.filterNode, this.chorusNode, this.saturationNode, this.phaserNode ];
            if (this.autoWahNode) effectChainNodes.push(this.autoWahNode);
            effectChainNodes.push( this.eq3Node, this.compressorNode, this.delayNode, this.reverbNode, this.gainNode );

            if (this.gainNode && this.trackMeter) {
                Tone.connectSeries(...effectChainNodes); // Connect all effects up to gainNode
                this.gainNode.connect(this.trackMeter); // Then gainNode to trackMeter
                console.log(`[Track ${this.id}] GainNode connected to TrackMeter.`);
                this.trackMeter.connect(Tone.getDestination()); // Then trackMeter to Destination
                console.log(`[Track ${this.id}] TrackMeter connected to Destination.`);
            } else {
                 console.error(`[Track ${this.id}] GainNode or TrackMeter is null. Cannot complete audio chain properly.`);
                 Tone.connectSeries(...effectChainNodes, Tone.getDestination()); // Fallback: connect chain directly to destination
            }
            console.log(`[Track ${this.id}] Audio nodes initialized and chained.`);
        } catch (error) {
            console.error(`[Track ${this.id}] Critical error during audio node initialization:`, error);
        }
    }

    async fullyInitializeAudioResources() {
        console.log(`[Track ${this.id}] fullyInitializeAudioResources called for type: ${this.type}`);
        try {
            if (this.type === 'Synth') {
                await this.initializeInstrument();
            } else if (this.type === 'Sampler') { // Slicer Sampler
                if (this.audioBufferDataURL && (!this.audioBuffer || !this.audioBuffer.loaded)) {
                    this.audioBuffer = await new Tone.Buffer().load(this.audioBufferDataURL);
                    console.log(`[Track ${this.id}] Slicer audioBuffer loaded from DataURL. Duration: ${this.audioBuffer.duration}`);
                }
                if (!this.slicerIsPolyphonic && this.audioBuffer?.loaded) {
                    this.setupSlicerMonoNodes();
                }
            } else if (this.type === 'DrumSampler') { // Pad Sampler
                for (let i = 0; i < this.drumSamplerPads.length; i++) {
                    const pad = this.drumSamplerPads[i];
                    if (pad.audioBufferDataURL && (!pad.audioBuffer || !pad.audioBuffer.loaded)) {
                        pad.audioBuffer = await new Tone.Buffer().load(pad.audioBufferDataURL);
                        console.log(`[Track ${this.id}] Drum pad ${i} audioBuffer loaded. Duration: ${pad.audioBuffer.duration}`);
                    }
                    if (pad.audioBuffer && pad.audioBuffer.loaded) {
                        if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) {
                            this.drumPadPlayers[i].dispose();
                        }
                        if (this.distortionNode && !this.distortionNode.disposed) {
                            this.drumPadPlayers[i] = new Tone.Player(pad.audioBuffer).connect(this.distortionNode);
                        } else {
                             console.warn(`[Track ${this.id}] Distortion node not available for drum pad player ${i}. Connecting to destination.`);
                             this.drumPadPlayers[i] = new Tone.Player(pad.audioBuffer).toDestination();
                        }
                        console.log(`[Track ${this.id}] Drum pad ${i} player initialized and connected.`);
                    }
                }
            } else if (this.type === 'InstrumentSampler') {
                if (this.instrumentSamplerSettings.audioBufferDataURL && (!this.instrumentSamplerSettings.audioBuffer || !this.instrumentSamplerSettings.audioBuffer.loaded)) {
                    this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(this.instrumentSamplerSettings.audioBufferDataURL);
                     console.log(`[Track ${this.id}] InstrumentSampler audioBuffer loaded. Duration: ${this.instrumentSamplerSettings.audioBuffer.duration}`);
                }
                this.setupToneSampler();
            }

            // Initialize sequence after all other audio resources are potentially loaded
            this.setSequenceLength(this.sequenceLength, true); // true to skip undo capture during init
            console.log(`[Track ${this.id}] fullyInitializeAudioResources completed. Sequence set up.`);

        } catch (error) {
            console.error(`[Track ${this.id}] Error in fullyInitializeAudioResources:`, error);
            if (typeof window.showNotification === 'function') {
                window.showNotification(`Error initializing resources for ${this.name}. Check console.`, 4000);
            }
        }
    }

    async initializeInstrument() {
        console.log(`[Track ${this.id}] Initializing instrument for synth type: ${this.synthEngineType}`);
        if (this.instrument && typeof this.instrument.dispose === 'function' && !this.instrument.disposed) {
            this.instrument.dispose();
        }

        let paramsToUse = {};
        let engineKey;

        if (this.synthEngineType === 'BasicPoly') engineKey = 'basicPoly';
        else if (this.synthEngineType === 'AMSynth') engineKey = 'amSynth';
        else if (this.synthEngineType === 'FMSynth') engineKey = 'fmSynth';

        if (engineKey && this.synthParams && this.synthParams[engineKey]) {
            paramsToUse = this.synthParams[engineKey];
        } else {
            paramsToUse = this.getDefaultSynthParams(this.synthEngineType);
            // Ensure this default is stored if it wasn't there
            if (engineKey && this.synthParams) {
                this.synthParams[engineKey] = paramsToUse;
            }
        }


        try {
            if (this.synthEngineType === 'BasicPoly') {
                this.instrument = new Tone.PolySynth(Tone.Synth, paramsToUse);
            } else if (this.synthEngineType === 'AMSynth') {
                this.instrument = new Tone.PolySynth(Tone.AMSynth, paramsToUse);
            } else if (this.synthEngineType === 'FMSynth') {
                this.instrument = new Tone.PolySynth(Tone.FMSynth, paramsToUse);
            } else {
                console.warn(`[Track ${this.id}] Unknown synth engine type: ${this.synthEngineType}. Defaulting to BasicPoly.`);
                this.instrument = new Tone.PolySynth(Tone.Synth, this.getDefaultSynthParams('BasicPoly'));
                this.synthEngineType = 'BasicPoly'; // Correct the type
                if(this.synthParams) this.synthParams['basicPoly'] = this.getDefaultSynthParams('BasicPoly');
            }

            if (this.instrument && this.distortionNode && !this.distortionNode.disposed) {
                this.instrument.connect(this.distortionNode);
                console.log(`[Track ${this.id}] Synth instrument (${this.synthEngineType}) created and connected to distortionNode.`);
            } else if (this.instrument) {
                 console.warn(`[Track ${this.id}] DistortionNode not available for synth. Connecting to destination.`);
                 this.instrument.toDestination();
            }
        } catch (error) {
            console.error(`[Track ${this.id}] Error creating synth instrument (${this.synthEngineType}):`, error);
            // Fallback to a basic synth if specific one fails
            this.instrument = new Tone.PolySynth(Tone.Synth);
            if (this.distortionNode && !this.distortionNode.disposed) this.instrument.connect(this.distortionNode);
            else this.instrument.toDestination();
            console.warn(`[Track ${this.id}] Fell back to basic Tone.Synth due to error.`);
        }
    }

    setupSlicerMonoNodes() {
        if (!this.slicerIsPolyphonic) {
            this.disposeSlicerMonoNodes(); // Clear previous if any
            this.slicerMonoPlayer = new Tone.Player();
            this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
            this.slicerMonoGain = new Tone.Gain();

            if (this.distortionNode && !this.distortionNode.disposed) {
                this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain, this.distortionNode);
            } else {
                console.warn(`[Track ${this.id}] DistortionNode not available for slicer mono player. Connecting to destination.`);
                this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain, Tone.getDestination());
            }
            console.log(`[Track ${this.id}] Slicer mono nodes set up.`);
        }
    }
    disposeSlicerMonoNodes() {
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) this.slicerMonoPlayer.dispose();
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) this.slicerMonoEnvelope.dispose();
        if (this.slicerMonoGain && !this.slicerMonoGain.disposed) this.slicerMonoGain.dispose();
        this.slicerMonoPlayer = null; this.slicerMonoEnvelope = null; this.slicerMonoGain = null;
        console.log(`[Track ${this.id}] Slicer mono nodes disposed.`);
    }

    setupToneSampler() {
        if (this.toneSampler && !this.toneSampler.disposed) {
            this.toneSampler.dispose();
        }
        if (this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
            const urls = {};
            urls[this.instrumentSamplerSettings.rootNote] = this.instrumentSamplerSettings.audioBuffer;
            const samplerOptions = {
                urls: urls,
                attack: this.instrumentSamplerSettings.envelope.attack,
                release: this.instrumentSamplerSettings.envelope.release,
                onload: () => console.log(`[Track ${this.id}] Tone.Sampler loaded for InstrumentSampler.`),
                onerror: (e) => console.error(`[Track ${this.id}] Error loading Tone.Sampler for InstrumentSampler:`, e)
            };
            this.toneSampler = new Tone.Sampler(samplerOptions);
            this.toneSampler.set({ // Ensure all envelope parameters are set
                attack: this.instrumentSamplerSettings.envelope.attack,
                decay: this.instrumentSamplerSettings.envelope.decay,
                sustain: this.instrumentSamplerSettings.envelope.sustain,
                release: this.instrumentSamplerSettings.envelope.release,
                curve: "exponential" // or "linear" or an explicit curve array
            });
            if (this.distortionNode && !this.distortionNode.disposed) {
                this.toneSampler.connect(this.distortionNode);
            } else {
                console.warn(`[Track ${this.id}] DistortionNode not available for InstrumentSampler. Connecting to destination.`);
                this.toneSampler.toDestination();
            }
        } else {
            console.warn(`[Track ${this.id}] InstrumentSampler audioBuffer not loaded, cannot setup Tone.Sampler.`);
        }
    }

    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = Math.max(0, Math.min(1, parseFloat(volume) || 0));
        if (this.gainNode && !this.isMuted) {
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
        } else if (this.gainNode && this.isMuted) {
            // Volume is stored, but gainNode remains at 0 due to mute
        }
        // Undo capture is handled by the knob/slider itself if fromInteraction is true
    }

    applyMuteState() {
        console.log(`[Track ${this.id}] applyMuteState called. isMuted: ${this.isMuted}`);
        if (!this.gainNode) { console.warn(`[Track ${this.id}] applyMuteState: gainNode is null.`); return; }
        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
        if (this.isMuted) {
            this.gainNode.gain.rampTo(0, 0.01);
        } else {
            if (currentGlobalSoloId && currentGlobalSoloId !== this.id) {
                this.gainNode.gain.rampTo(0, 0.01); // Remain silent if another track is soloed
            } else {
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
            }
        }
    }

    applySoloState() {
        console.log(`[Track ${this.id}] applySoloState called. isSoloed: ${this.isSoloed}, globalSoloId: ${typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : 'N/A'}`);
        if (!this.gainNode) { console.warn(`[Track ${this.id}] applySoloState: gainNode is null.`); return; }
        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;

        if (this.isMuted) { // If track is muted, it stays silent regardless of solo state
            this.gainNode.gain.rampTo(0, 0.01);
            return;
        }

        if (currentGlobalSoloId) { // A track is soloed
            if (this.id === currentGlobalSoloId) { // This track is the one soloed
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
            } else { // Another track is soloed, so this one should be silent
                this.gainNode.gain.rampTo(0, 0.01);
            }
        } else { // No track is soloed, all unmuted tracks play
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
        }
    }

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
    setSaturationAmount(value) { this.effects.saturation.amount = parseFloat(value) || 0; if(this.saturationNode) this.saturationNode.order = Math.max(1, Math.floor(this.effects.saturation.amount) * 2 + 1); }
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
    setAutoWahFollower(value) { this.effects.autoWah.follower = parseFloat(value); if(this.autoWahNode && this.autoWahNode.follower) this.autoWahNode.follower.value = this.effects.autoWah.follower; }

    setSynthParam(paramPath, value) {
        if (!this.synthParams) { // Check synthParams existence first
            console.warn(`[Track ${this.id}] synthParams object not found.`);
            return;
        }

        let engineKey;
        if (this.synthEngineType === 'BasicPoly') engineKey = 'basicPoly';
        else if (this.synthEngineType === 'AMSynth') engineKey = 'amSynth';
        else if (this.synthEngineType === 'FMSynth') engineKey = 'fmSynth';
        else {
            console.warn(`[Track ${this.id}] Unknown synth engine type for setSynthParam: ${this.synthEngineType}`);
            return;
        }

        // Ensure the specific engine's parameter object exists
        if (!this.synthParams[engineKey]) {
            console.warn(`[Track ${this.id}] Synth params for engine ${engineKey} not initialized. Initializing with defaults.`);
            this.synthParams[engineKey] = this.getDefaultSynthParams(this.synthEngineType);
        }

        const keys = paramPath.split('.');
        let currentParamLevel = this.synthParams[engineKey];

        // Traverse and update the internal synthParams object
        for (let i = 0; i < keys.length - 1; i++) {
            if (!currentParamLevel[keys[i]]) {
                currentParamLevel[keys[i]] = {};
            }
            currentParamLevel = currentParamLevel[keys[i]];
        }
        currentParamLevel[keys[keys.length - 1]] = value;

        // For updating the Tone.js instrument:
        // Construct the nested object that PolySynth.set() expects
        if (this.instrument && typeof this.instrument.set === 'function') {
            const updateObject = {};
            let currentLevelForUpdate = updateObject;
            for (let i = 0; i < keys.length - 1; i++) {
                currentLevelForUpdate[keys[i]] = {};
                currentLevelForUpdate = currentLevelForUpdate[keys[i]];
            }
            currentLevelForUpdate[keys[keys.length - 1]] = value;
            this.instrument.set(updateObject);
        } else {
            // This case is fine if the instrument isn't initialized yet; params will be applied then.
            // console.warn(`[Track ${this.id}] Instrument not available or .set is not a function for ${paramPath}. Params will be applied on next instrument init.`);
        }
    }

    setSliceVolume(sliceIndex, volume) { if (this.slices[sliceIndex]) this.slices[sliceIndex].volume = parseFloat(volume); }
    setSlicePitchShift(sliceIndex, semitones) { if (this.slices[sliceIndex]) this.slices[sliceIndex].pitchShift = parseInt(semitones); }
    setSliceLoop(sliceIndex, loop) { if (this.slices[sliceIndex]) this.slices[sliceIndex].loop = !!loop; }
    setSliceReverse(sliceIndex, reverse) { if (this.slices[sliceIndex]) this.slices[sliceIndex].reverse = !!reverse; }
    setSliceEnvelopeParam(sliceIndex, param, value) { if (this.slices[sliceIndex] && this.slices[sliceIndex].envelope) this.slices[sliceIndex].envelope[param] = parseFloat(value); }
    setDrumSamplerPadVolume(padIndex, volume) { if (this.drumSamplerPads[padIndex]) this.drumSamplerPads[padIndex].volume = parseFloat(volume); }
    setDrumSamplerPadPitch(padIndex, pitch) { if (this.drumSamplerPads[padIndex]) this.drumSamplerPads[padIndex].pitchShift = parseInt(pitch); }
    setDrumSamplerPadEnv(padIndex, param, value) { if (this.drumSamplerPads[padIndex] && this.drumSamplerPads[padIndex].envelope) this.drumSamplerPads[padIndex].envelope[param] = parseFloat(value); }

    setInstrumentSamplerRootNote(noteName) {
        if (Tone.Frequency(noteName).toMidi() > 0) { // Basic validation
            this.instrumentSamplerSettings.rootNote = noteName;
            this.setupToneSampler(); // Re-initialize sampler with new root note
        } else {
            console.warn(`[Track ${this.id}] Invalid root note: ${noteName}`);
        }
    }
    setInstrumentSamplerLoop(loop) { this.instrumentSamplerSettings.loop = !!loop; this.setupToneSampler(); }
    setInstrumentSamplerLoopStart(time) { this.instrumentSamplerSettings.loopStart = Math.max(0, parseFloat(time)); this.setupToneSampler(); }
    setInstrumentSamplerLoopEnd(time) { this.instrumentSamplerSettings.loopEnd = Math.max(this.instrumentSamplerSettings.loopStart, parseFloat(time)); this.setupToneSampler(); }
    setInstrumentSamplerEnv(param, value) {
        if (this.instrumentSamplerSettings.envelope) {
            this.instrumentSamplerSettings.envelope[param] = parseFloat(value);
            this.setupToneSampler(); // Re-initialize to apply envelope changes
        }
    }

    async doubleSequence() {
        if (typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Double Sequence for ${this.name}`);
        }
        const oldLength = this.sequenceLength;
        const newLength = oldLength * 2;
        if (newLength > 1024) { // Max length cap, e.g., 64 bars of 16 steps
            return { success: false, message: "Maximum sequence length reached." };
        }

        const newSequenceData = this.sequenceData.map(row => {
            const newRow = Array(newLength).fill(null);
            if (row) {
                for (let i = 0; i < oldLength; i++) {
                    newRow[i] = row[i]; // Copy first half
                    newRow[i + oldLength] = row[i]; // Copy to second half
                }
            }
            return newRow;
        });
        this.sequenceData = newSequenceData;
        this.setSequenceLength(newLength, true); // true to skip another undo capture

        return { success: true, message: `${this.name} sequence doubled to ${newLength / STEPS_PER_BAR} bars.` };
    }


    setSequenceLength(newLengthInSteps, skipUndoCapture = false) {
        console.log(`[Track ${this.id}] setSequenceLength called. New length: ${newLengthInSteps} steps.`);
        const oldActualLength = this.sequenceLength;
        // Corrected: Use directly imported constants
        newLengthInSteps = Math.max(STEPS_PER_BAR, parseInt(newLengthInSteps) || defaultStepsPerBar);
        newLengthInSteps = Math.ceil(newLengthInSteps / STEPS_PER_BAR) * STEPS_PER_BAR;

        if (!skipUndoCapture && oldActualLength !== newLengthInSteps && typeof window.captureStateForUndo === 'function') {
            // Corrected: Use directly imported STEPS_PER_BAR
            window.captureStateForUndo(`Set Seq Length for ${this.name} to ${newLengthInSteps / STEPS_PER_BAR} bars`);
        }
        this.sequenceLength = newLengthInSteps;

        let numRows;
        // Corrected: Use directly imported constants
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
            console.log(`[Track ${this.id}] Disposing old Tone.Sequence.`);
            this.sequence.stop();
            this.sequence.clear();
            this.sequence.dispose();
            this.sequence = null;
        }

        console.log(`[Track ${this.id}] Creating new Tone.Sequence with length ${this.sequenceLength}.`);
        this.sequence = new Tone.Sequence((time, col) => {
            // console.log(`[Track ${this.id} Sequencer Tick] col: ${col}, time: ${time.toFixed(4)}, transport state: ${Tone.Transport.state}`);

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
                // Corrected: Use directly imported synthPitches
                synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step && step.active && this.instrument && typeof this.instrument.triggerAttackRelease === 'function') {
                        // console.log(`[Track ${this.id} Sequencer] Playing Synth note: ${pitchName} at time ${time.toFixed(4)}, col ${col}, velocity: ${step.velocity}`);
                        this.instrument.triggerAttackRelease(pitchName, "8n", time, step.velocity);
                    }
                });
            } else if (this.type === 'Sampler') { // Slicer
                this.slices.forEach((sliceData, sliceIndex) => {
                    const step = this.sequenceData[sliceIndex]?.[col];
                    if (step?.active && sliceData?.duration > 0 && this.audioBuffer?.loaded) {
                        // console.log(`[Track ${this.id} Sequencer] Playing Slicer slice: ${sliceIndex + 1} at time ${time.toFixed(4)}, col ${col}`);
                        const totalPitchShift = sliceData.pitchShift;
                        const playbackRate = Math.pow(2, totalPitchShift / 12);
                        let playDuration = sliceData.duration / playbackRate;
                        if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds();

                        if (this.slicerIsPolyphonic) {
                            const tempPlayer = new Tone.Player(this.audioBuffer);
                            const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                            const tempGain = new Tone.Gain(step.velocity * sliceData.volume);
                            if(this.distortionNode && !this.distortionNode.disposed) {
                                tempPlayer.chain(tempEnv, tempGain, this.distortionNode);
                            } else {
                                tempPlayer.chain(tempEnv, tempGain, Tone.getDestination());
                            }
                            tempPlayer.playbackRate = playbackRate;
                            tempPlayer.reverse = sliceData.reverse;
                            tempPlayer.loop = sliceData.loop;
                            tempPlayer.loopStart = sliceData.offset;
                            tempPlayer.loopEnd = sliceData.offset + sliceData.duration;
                            tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            tempEnv.triggerAttack(time);
                            if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95); // Release slightly before end
                            Tone.Transport.scheduleOnce(() => {
                                if (tempPlayer && !tempPlayer.disposed) { tempPlayer.stop(); tempPlayer.dispose(); }
                                if (tempEnv && !tempEnv.disposed) tempEnv.dispose();
                                if (tempGain && !tempGain.disposed) tempGain.dispose();
                            }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);
                        } else { // Mono Slicer
                            if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && this.slicerMonoGain) {
                                if (this.slicerMonoPlayer.state === 'started') this.slicerMonoPlayer.stop(time);
                                if (this.slicerMonoEnvelope.getValueAtTime(time) > 0.001) this.slicerMonoEnvelope.triggerRelease(time);

                                this.slicerMonoPlayer.buffer = this.audioBuffer; // Ensure buffer is current
                                this.slicerMonoEnvelope.set(sliceData.envelope);
                                this.slicerMonoGain.gain.value = step.velocity * sliceData.volume;
                                this.slicerMonoPlayer.playbackRate = playbackRate;
                                this.slicerMonoPlayer.reverse = sliceData.reverse;
                                this.slicerMonoPlayer.loop = sliceData.loop;
                                this.slicerMonoPlayer.loopStart = sliceData.offset;
                                this.slicerMonoPlayer.loopEnd = sliceData.offset + sliceData.duration;

                                this.slicerMonoPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                                this.slicerMonoEnvelope.triggerAttack(time);
                                if (!sliceData.loop) {
                                    const releaseTime = time + playDuration - (sliceData.envelope.release || 0.1);
                                    this.slicerMonoEnvelope.triggerRelease(Math.max(time, releaseTime));
                                }
                            }
                        }
                    }
                });
            }
            else if (this.type === 'DrumSampler') { // Pad Sampler
                // Corrected: Iterate numDrumSamplerPads times
                Array.from({ length: numDrumSamplerPads }).forEach((_, padIndex) => {
                    const step = this.sequenceData[padIndex]?.[col];
                    const padData = this.drumSamplerPads[padIndex];
                    if (step?.active && padData && this.drumPadPlayers[padIndex] && this.drumPadPlayers[padIndex].loaded) {
                        // console.log(`[Track ${this.id} Sequencer] Playing Pad ${padIndex + 1} at time ${time.toFixed(4)}, col ${col}`);
                        const player = this.drumPadPlayers[padIndex];
                        player.volume.value = Tone.gainToDb(padData.volume * step.velocity);
                        player.playbackRate = Math.pow(2, (padData.pitchShift) / 12);
                        player.start(time);
                    }
                });
            }
            else if (this.type === 'InstrumentSampler') {
                // Corrected: Use directly imported synthPitches
                synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active && this.toneSampler && this.toneSampler.loaded) {
                        // console.log(`[Track ${this.id} Sequencer] Playing InstrumentSampler note: ${pitchName} at time ${time.toFixed(4)}, col ${col}`);
                        this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "8n", time, step.velocity);
                    }
                });
            }
        }, Array.from(Array(this.sequenceLength).keys()), "16n").start(0);
        console.log(`[Track ${this.id}] Tone.Sequence created and started. State: ${this.sequence?.state}`);

        if (this.sequencerWindow && !this.sequencerWindow.isMinimized && window.openWindows[`sequencerWin-${this.id}`]) {
             if (typeof window.openTrackSequencerWindow === 'function') {
                window.openTrackSequencerWindow(this.id, true); // forceRedraw
             }
        }
    }

    dispose() {
        console.log(`[Track ${this.id}] Disposing track ${this.name} (${this.type})`);
        if (this.sequence && !this.sequence.disposed) { this.sequence.stop(); this.sequence.clear(); this.sequence.dispose(); }
        if (this.instrument && !this.instrument.disposed) this.instrument.dispose();
        if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose();
        this.disposeSlicerMonoNodes();
        if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.dispose();
        if (this.instrumentSamplerSettings.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose();

        this.drumSamplerPads.forEach(pad => { if (pad.audioBuffer && !pad.audioBuffer.disposed) pad.audioBuffer.dispose(); });
        this.drumPadPlayers.forEach(player => { if (player && !player.disposed) player.dispose(); });

        // Dispose effect nodes
        const effectsToDispose = [
            this.distortionNode, this.filterNode, this.chorusNode, this.saturationNode,
            this.phaserNode, this.autoWahNode, this.eq3Node, this.compressorNode,
            this.delayNode, this.reverbNode, this.gainNode, this.trackMeter
        ];
        effectsToDispose.forEach(node => {
            if (node && typeof node.dispose === 'function' && !node.disposed) {
                node.dispose();
            }
        });

        // Close associated windows
        if (this.inspectorWindow && typeof this.inspectorWindow.close === 'function') this.inspectorWindow.close();
        if (this.effectsRackWindow && typeof this.effectsRackWindow.close === 'function') this.effectsRackWindow.close();
        if (this.sequencerWindow && typeof this.sequencerWindow.close === 'function') this.sequencerWindow.close();

        this.sequence = null; this.instrument = null; this.audioBuffer = null;
        this.slicerMonoPlayer = null; this.slicerMonoEnvelope = null; this.slicerMonoGain = null;
        this.toneSampler = null;
        this.drumSamplerPads = []; this.drumPadPlayers = [];
        this.distortionNode = null; this.filterNode = null; /* ... all other effect nodes ... */ this.gainNode = null; this.trackMeter = null;
        this.inspectorWindow = null; this.effectsRackWindow = null; this.sequencerWindow = null;
        console.log(`[Track ${this.id}] Finished disposing track ${this.name}`);
    }
}
