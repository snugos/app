// js/Track.js - Track Class Module

import { STEPS_PER_BAR, defaultStepsPerBar, synthPitches, numSlices, numDrumSamplerPads, samplerMIDINoteStart, defaultVelocity } from './constants.js';

export class Track {
    constructor(id, type, initialData = null) {
        this.id = initialData?.id || id;
        this.type = type;

        if (type === 'DrumSampler') {
            this.name = initialData?.name || `Sampler (Pads) ${this.id}`;
        } else if (type === 'Synth') {
            this.name = initialData?.name || `MonoSynth ${this.id}`; // Changed default name
        }
        else {
            this.name = initialData?.name || `${type} Track ${this.id}`;
        }

        this.isMuted = initialData?.isMuted || false;
        this.isSoloed = (typeof window.getSoloedTrackId === 'function' && window.getSoloedTrackId() === this.id);
        this.previousVolumeBeforeMute = initialData?.volume ?? 0.7;

        if (this.type === 'Synth') {
            this.synthEngineType = initialData?.synthEngineType || 'MonoSynth'; // Default to MonoSynth
            this.synthParams = initialData?.synthParams ? JSON.parse(JSON.stringify(initialData.synthParams)) : this.getDefaultSynthParams();
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

        this.instrument = null; // For Synths
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

    getDefaultSynthParams() { // Removed engineType argument
        // Parameters for Tone.MonoSynth
        return {
            portamento: 0.01,
            oscillator: { type: 'sawtooth' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0.9, release: 1 },
            filter: { type: 'lowpass', rolloff: -12, Q: 1 }, // frequency is controlled by filterEnvelope
            filterEnvelope: { attack: 0.06, decay: 0.2, sustain: 0.5, release: 2, baseFrequency: 200, octaves: 7, exponent: 2 }
        };
    }


    async initializeAudioNodes() {
        console.log(`[Track ${this.id}] Initializing audio nodes for type: ${this.type}...`);
        try {
            this.distortionNode = new Tone.Distortion(this.effects.distortion.amount);
            this.filterNode = new Tone.Filter(this.effects.filter); // This is the main channel filter, not synth's internal filter
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

            // For Synth tracks, the instrument connects to distortionNode. For others, they connect here too.
            const effectChainNodes = [ this.distortionNode, this.filterNode, this.chorusNode, this.saturationNode, this.phaserNode ];
            if (this.autoWahNode) effectChainNodes.push(this.autoWahNode);
            effectChainNodes.push( this.eq3Node, this.compressorNode, this.delayNode, this.reverbNode, this.gainNode );

            if (this.gainNode && this.trackMeter) {
                Tone.connectSeries(...effectChainNodes); // Connects them sequentially
                this.gainNode.connect(this.trackMeter);
                this.trackMeter.connect(Tone.getDestination());
            } else {
                 console.error(`[Track ${this.id}] GainNode or TrackMeter is null. Cannot complete audio chain properly.`);
                 // Fallback connection if gain/meter failed, though this might not be ideal.
                 Tone.connectSeries(...effectChainNodes, Tone.getDestination());
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
                await this.initializeInstrument(); // This will now init MonoSynth
            } else if (this.type === 'Sampler') {
                if (this.audioBufferDataURL && (!this.audioBuffer || !this.audioBuffer.loaded)) {
                    this.audioBuffer = await new Tone.Buffer().load(this.audioBufferDataURL);
                }
                if (!this.slicerIsPolyphonic && this.audioBuffer?.loaded) {
                    this.setupSlicerMonoNodes();
                }
            } else if (this.type === 'DrumSampler') {
                for (let i = 0; i < this.drumSamplerPads.length; i++) {
                    const pad = this.drumSamplerPads[i];
                    if (pad.audioBufferDataURL && (!pad.audioBuffer || !pad.audioBuffer.loaded)) {
                        pad.audioBuffer = await new Tone.Buffer().load(pad.audioBufferDataURL);
                    }
                    if (pad.audioBuffer && pad.audioBuffer.loaded) {
                        if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) {
                            this.drumPadPlayers[i].dispose();
                        }
                        // Drum pad players connect to the start of the track's effect chain (distortionNode)
                        const destinationNode = (this.distortionNode && !this.distortionNode.disposed) ? this.distortionNode : Tone.getDestination();
                        this.drumPadPlayers[i] = new Tone.Player(pad.audioBuffer).connect(destinationNode);
                    }
                }
            } else if (this.type === 'InstrumentSampler') {
                if (this.instrumentSamplerSettings.audioBufferDataURL && (!this.instrumentSamplerSettings.audioBuffer || !this.instrumentSamplerSettings.audioBuffer.loaded)) {
                    this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(this.instrumentSamplerSettings.audioBufferDataURL);
                }
                this.setupToneSampler(); // Connects to distortionNode internally
            }
            this.setSequenceLength(this.sequenceLength, true); // true to skipUndo and re-evaluate rows
            console.log(`[Track ${this.id}] fullyInitializeAudioResources completed.`);
        } catch (error) {
            console.error(`[Track ${this.id}] Error in fullyInitializeAudioResources:`, error);
            if (typeof window.showNotification === 'function') {
                window.showNotification(`Error initializing resources for ${this.name}. Check console.`, 4000);
            }
        }
    }

    async initializeInstrument() { // Now specifically for MonoSynth
        console.log(`[Track ${this.id}] Initializing MonoSynth instrument...`);
        if (this.instrument && typeof this.instrument.dispose === 'function' && !this.instrument.disposed) {
            this.instrument.dispose();
        }

        // Ensure synthParams exists, if not, use defaults
        if (!this.synthParams || Object.keys(this.synthParams).length === 0) {
            console.warn(`[Track ${this.id}] synthParams is empty or missing. Using default MonoSynth params.`);
            this.synthParams = this.getDefaultSynthParams();
        }

        try {
            this.instrument = new Tone.MonoSynth(this.synthParams);

            // Connect the synth's output to the first effect in the chain (distortionNode)
            // or directly to GainNode if distortionNode is not available (should be, but defensive)
            const destinationNode = (this.distortionNode && !this.distortionNode.disposed) ? this.distortionNode :
                                    (this.gainNode && !this.gainNode.disposed) ? this.gainNode : Tone.getDestination();

            if (this.instrument) {
                this.instrument.connect(destinationNode);
            }

            console.log(`[Track ${this.id}] MonoSynth instrument created and connected to:`, destinationNode.toString());
        } catch (error) {
            console.error(`[Track ${this.id}] Error creating MonoSynth instrument:`, error);
            // Fallback to a simple synth if MonoSynth fails for some reason.
            this.instrument = new Tone.Synth(); // Basic Tone.Synth as a last resort
            const destinationNode = (this.distortionNode && !this.distortionNode.disposed) ? this.distortionNode : Tone.getDestination();
            if (this.instrument) this.instrument.connect(destinationNode);
            console.warn(`[Track ${this.id}] Fell back to basic Tone.Synth due to MonoSynth error.`);
        }
    }

    setupSlicerMonoNodes() {
        if (!this.slicerIsPolyphonic) {
            this.disposeSlicerMonoNodes();
            this.slicerMonoPlayer = new Tone.Player();
            this.slicerMonoEnvelope = new Tone.AmplitudeEnvelope();
            this.slicerMonoGain = new Tone.Gain();
            // Slicer mono nodes also connect to the start of the track's effect chain
            const destinationNode = (this.distortionNode && !this.distortionNode.disposed) ? this.distortionNode : Tone.getDestination();
            this.slicerMonoPlayer.chain(this.slicerMonoEnvelope, this.slicerMonoGain, destinationNode);
            console.log(`[Track ${this.id}] Slicer mono nodes set up and connected to:`, destinationNode.toString());
        }
    }
    disposeSlicerMonoNodes() {
        if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed) this.slicerMonoPlayer.dispose();
        if (this.slicerMonoEnvelope && !this.slicerMonoEnvelope.disposed) this.slicerMonoEnvelope.dispose();
        if (this.slicerMonoGain && !this.slicerMonoGain.disposed) this.slicerMonoGain.dispose();
        this.slicerMonoPlayer = null; this.slicerMonoEnvelope = null; this.slicerMonoGain = null;
    }

    setupToneSampler() { // For InstrumentSampler type
        if (this.toneSampler && !this.toneSampler.disposed) {
            this.toneSampler.dispose();
        }
        if (this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
            const urls = {};
            urls[this.instrumentSamplerSettings.rootNote] = this.instrumentSamplerSettings.audioBuffer;

            // Envelope for Tone.Sampler is set differently than MonoSynth's direct envelope object
            const samplerOptions = {
                urls: urls,
                attack: this.instrumentSamplerSettings.envelope.attack,
                release: this.instrumentSamplerSettings.envelope.release,
                onload: () => console.log(`[Track ${this.id}] Tone.Sampler loaded for InstrumentSampler.`),
                onerror: (e) => console.error(`[Track ${this.id}] Error loading Tone.Sampler for InstrumentSampler:`, e)
            };
            this.toneSampler = new Tone.Sampler(samplerOptions);
            // Note: Tone.Sampler does not have sustain and decay directly on the main object.
            // Its envelope is simpler (attack/release). For more complex envelopes with Sampler,
            // you'd typically wrap it in an AmplitudeEnvelope or use a Player with an AmplitudeEnvelope.
            // For now, we'll stick to its built-in attack/release.

            // InstrumentSampler also connects to the start of the track's effect chain
            const destinationNode = (this.distortionNode && !this.distortionNode.disposed) ? this.distortionNode : Tone.getDestination();
            this.toneSampler.connect(destinationNode);
            console.log(`[Track ${this.id}] InstrumentSampler (Tone.Sampler) connected to:`, destinationNode.toString());
        } else {
            console.warn(`[Track ${this.id}] InstrumentSampler audioBuffer not loaded, cannot setup Tone.Sampler.`);
        }
    }


    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = Math.max(0, Math.min(1, parseFloat(volume) || 0));
        if (this.gainNode && !this.isMuted) {
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
        }
    }

    applyMuteState() {
        if (!this.gainNode) { console.warn(`[Track ${this.id}] applyMuteState: gainNode is null.`); return; }
        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
        if (this.isMuted) {
            this.gainNode.gain.rampTo(0, 0.01);
        } else {
            if (currentGlobalSoloId && currentGlobalSoloId !== this.id) {
                this.gainNode.gain.rampTo(0, 0.01); // Muted because another track is soloed
            } else {
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
            }
        }
    }

    applySoloState() { // Called when any track's solo state changes or global solo changes
        if (!this.gainNode) { console.warn(`[Track ${this.id}] applySoloState: gainNode is null.`); return; }

        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;

        if (this.isMuted) { // If track is muted, it stays muted regardless of solo.
            this.gainNode.gain.rampTo(0, 0.01);
            return;
        }

        if (currentGlobalSoloId) { // If a track is soloed globally
            if (this.id === currentGlobalSoloId) { // If this IS the soloed track
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05); // Play at its volume
            } else { // If this is NOT the soloed track
                this.gainNode.gain.rampTo(0, 0.01); // Mute it
            }
        } else { // If NO track is soloed globally
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05); // Play at its volume (if not muted)
        }
    }


    setReverbWet(value) { this.effects.reverb.wet = parseFloat(value) || 0; if(this.reverbNode) this.reverbNode.wet.value = this.effects.reverb.wet; }
    setDelayWet(value) { this.effects.delay.wet = parseFloat(value) || 0; if(this.delayNode) this.delayNode.wet.value = this.effects.delay.wet; }
    setFilterFrequency(value) { this.effects.filter.frequency = parseFloat(value) || 20000; if(this.filterNode) this.filterNode.frequency.value = this.effects.filter.frequency; }
    setFilterType(value) { this.effects.filter.type = value; if(this.filterNode) this.filterNode.type = this.effects.filter.type; }
    // EQ3 setters
    setEQ3Low(value) { this.effects.eq3.low = parseFloat(value) || 0; if(this.eq3Node) this.eq3Node.low.value = this.effects.eq3.low; }
    setEQ3Mid(value) { this.effects.eq3.mid = parseFloat(value) || 0; if(this.eq3Node) this.eq3Node.mid.value = this.effects.eq3.mid; }
    setEQ3High(value) { this.effects.eq3.high = parseFloat(value) || 0; if(this.eq3Node) this.eq3Node.high.value = this.effects.eq3.high; }
    // Compressor setters
    setCompressorThreshold(value) { this.effects.compressor.threshold = parseFloat(value) || -24; if(this.compressorNode) this.compressorNode.threshold.value = this.effects.compressor.threshold; }
    setCompressorRatio(value) { this.effects.compressor.ratio = parseFloat(value) || 12; if(this.compressorNode) this.compressorNode.ratio.value = this.effects.compressor.ratio; }
    setCompressorAttack(value) { this.effects.compressor.attack = parseFloat(value) || 0.003; if(this.compressorNode) this.compressorNode.attack.value = this.effects.compressor.attack; }
    setCompressorRelease(value) { this.effects.compressor.release = parseFloat(value) || 0.25; if(this.compressorNode) this.compressorNode.release.value = this.effects.compressor.release; }
    setCompressorKnee(value) { this.effects.compressor.knee = parseFloat(value) || 30; if(this.compressorNode) this.compressorNode.knee.value = this.effects.compressor.knee; }
    // Delay setters
    setDelayTime(value) { this.effects.delay.time = parseFloat(value) || 0.5; if(this.delayNode) this.delayNode.delayTime.value = this.effects.delay.time; }
    setDelayFeedback(value) { this.effects.delay.feedback = parseFloat(value) || 0.3; if(this.delayNode) this.delayNode.feedback.value = this.effects.delay.feedback; }


    setDistortionAmount(value) { this.effects.distortion.amount = parseFloat(value) || 0; if(this.distortionNode) this.distortionNode.distortion = this.effects.distortion.amount; }
    setChorusWet(value) { this.effects.chorus.wet = parseFloat(value) || 0; if(this.chorusNode) this.chorusNode.wet.value = this.effects.chorus.wet; }
    setChorusFrequency(value) { this.effects.chorus.frequency = parseFloat(value) || 1.5; if(this.chorusNode) this.chorusNode.frequency.value = this.effects.chorus.frequency; }
    setChorusDelayTime(value) { this.effects.chorus.delayTime = parseFloat(value) || 3.5; if(this.chorusNode) this.chorusNode.delayTime = this.effects.chorus.delayTime; }
    setChorusDepth(value) { this.effects.chorus.depth = parseFloat(value) || 0.7; if(this.chorusNode) this.chorusNode.depth = this.effects.chorus.depth; }
    setSaturationWet(value) { this.effects.saturation.wet = parseFloat(value) || 0; if(this.saturationNode) this.saturationNode.wet.value = this.effects.saturation.wet; }
    setSaturationAmount(value) { this.effects.saturation.amount = parseFloat(value) || 0; if(this.saturationNode) this.saturationNode.order = Math.max(1, Math.floor(this.effects.saturation.amount) * 2 + 1); } // Chebyshev order based on amount
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


    // Updated for MonoSynth
    setSynthParam(paramPath, value) {
        if (this.type !== 'Synth' || !this.instrument) {
            console.warn(`[Track ${this.id}] Not a synth track or instrument not initialized.`);
            return;
        }
        if (!this.synthParams) { // Should have been initialized by constructor
            console.warn(`[Track ${this.id}] synthParams object not found. Initializing with defaults.`);
            this.synthParams = this.getDefaultSynthParams();
        }

        const keys = paramPath.split('.');
        let currentParamLevel = this.synthParams; // MonoSynth params are directly on this.synthParams

        for (let i = 0; i < keys.length - 1; i++) {
            if (!currentParamLevel[keys[i]]) currentParamLevel[keys[i]] = {};
            currentParamLevel = currentParamLevel[keys[i]];
        }
        currentParamLevel[keys[keys.length - 1]] = value;

        // Update the Tone.MonoSynth instance
        // MonoSynth has direct properties like .oscillator, .envelope, .filter, .filterEnvelope
        // Or use .set() for nested properties.
        if (keys.length === 1) { // e.g. "portamento"
            if (this.instrument[keys[0]] !== undefined) {
                if (typeof this.instrument[keys[0]] === 'object' && this.instrument[keys[0]].value !== undefined) {
                    this.instrument[keys[0]].value = value; // For Tone.Param objects
                } else {
                    this.instrument[keys[0]] = value;
                }
            } else {
                this.instrument.set({ [keys[0]]: value });
            }
        } else if (keys.length > 1) { // e.g. "oscillator.type" or "envelope.attack"
            const component = keys[0]; // "oscillator", "envelope", "filter", "filterEnvelope"
            const param = keys.slice(1).join('.'); // "type" or "attack"

            if (this.instrument[component]) {
                 // Special handling for filter.type, filter.Q, filter.rolloff
                if (component === 'filter' && (param === 'type' || param === 'Q' || param === 'rolloff')) {
                    if(param === 'Q' && typeof this.instrument[component][param] === 'object' && this.instrument[component][param].value !== undefined) {
                        this.instrument[component][param].value = value;
                    } else {
                        this.instrument[component][param] = value;
                    }
                }
                // For envelope objects (main and filter)
                else if (this.instrument[component][param] !== undefined) {
                     if(typeof this.instrument[component][param] === 'object' && this.instrument[component][param].value !== undefined) {
                         this.instrument[component][param].value = value; // For Tone.Param within envelopes e.g. filterEnvelope.baseFrequency
                     } else {
                         this.instrument[component][param] = value;
                     }
                } else { // Fallback to .set() for deeper or dynamic params
                    let updateObj = {};
                    let currentLevelForUpdate = updateObj;
                    for(let i=0; i<keys.length-1; i++){
                        currentLevelForUpdate[keys[i]] = {};
                        currentLevelForUpdate = currentLevelForUpdate[keys[i]];
                    }
                    currentLevelForUpdate[keys[keys.length-1]] = value;
                    this.instrument.set(updateObj);
                }
            } else { // Fallback for components not directly on instrument (should not happen for MonoSynth standard params)
                this.instrument.set({ [paramPath]: value });
            }
        }
        // console.log(`[Track ${this.id}] MonoSynth param "${paramPath}" set to`, value, "New instrument state:", this.instrument.get());
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
        if (Tone.Frequency(noteName).toMidi() > 0) {
            this.instrumentSamplerSettings.rootNote = noteName;
            this.setupToneSampler(); // Re-initializes Tone.Sampler with new root note mapping
        } else {
            console.warn(`[Track ${this.id}] Invalid root note: ${noteName}`);
        }
    }
    setInstrumentSamplerLoop(loop) { this.instrumentSamplerSettings.loop = !!loop; this.setupToneSampler(); /* Tone.Sampler doesn't have direct loop controls, this implies custom logic or Player use */ }
    setInstrumentSamplerLoopStart(time) { this.instrumentSamplerSettings.loopStart = Math.max(0, parseFloat(time)); this.setupToneSampler(); }
    setInstrumentSamplerLoopEnd(time) { this.instrumentSamplerSettings.loopEnd = Math.max(this.instrumentSamplerSettings.loopStart, parseFloat(time)); this.setupToneSampler(); }
    setInstrumentSamplerEnv(param, value) { // For InstrumentSampler's ADSR
        if (this.instrumentSamplerSettings.envelope) {
            this.instrumentSamplerSettings.envelope[param] = parseFloat(value);
            // Tone.Sampler's main envelope is Attack/Release. If using a separate AmplitudeEnvelope, update that here.
            // For now, we assume it affects parameters that might be used by Tone.Sampler's options during setupToneSampler.
            if (this.toneSampler) {
                if (param === 'attack' && this.toneSampler.attack !== undefined) this.toneSampler.attack = parseFloat(value);
                if (param === 'release' && this.toneSampler.release !== undefined) this.toneSampler.release = parseFloat(value);
                // Decay and Sustain are not direct params of Tone.Sampler's simple envelope.
                // If you need full ADSR for InstrumentSampler, you'd use a Player piped into an AmplitudeEnvelope.
                // For simplicity, we're primarily updating the stored settings and letting setupToneSampler reconfigure if needed.
            }
             // this.setupToneSampler(); // Potentially re-init, or update specific params if possible
        }
    }

    async doubleSequence() {
        if (typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Double Sequence for ${this.name}`);
        }
        const oldLength = this.sequenceLength;
        const newLength = oldLength * 2;
        if (newLength > 1024) { // Arbitrary limit for sanity
            // showNotification("Maximum sequence length (1024 steps) would be exceeded.", 3000);
            return { success: false, message: "Maximum sequence length reached." };
        }

        const newSequenceData = this.sequenceData.map(row => {
            const newRow = Array(newLength).fill(null);
            if (row) { // Check if row is not null/undefined
                for (let i = 0; i < oldLength; i++) {
                    newRow[i] = row[i];
                    newRow[i + oldLength] = row[i]; // Duplicate content
                }
            }
            return newRow;
        });
        this.sequenceData = newSequenceData;
        this.setSequenceLength(newLength, true); // true to skipUndo for this internal length change

        return { success: true, message: `${this.name} sequence doubled to ${newLength / STEPS_PER_BAR} bars.` };
    }


    setSequenceLength(newLengthInSteps, skipUndoCapture = false) {
        const oldActualLength = this.sequenceLength;
        newLengthInSteps = Math.max(STEPS_PER_BAR, parseInt(newLengthInSteps) || defaultStepsPerBar);
        newLengthInSteps = Math.ceil(newLengthInSteps / STEPS_PER_BAR) * STEPS_PER_BAR; // Ensure multiple of STEPS_PER_BAR

        // Capture undo only if length actually changes and not skipped
        if (!skipUndoCapture && oldActualLength !== newLengthInSteps && typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Set Seq Length for ${this.name} to ${newLengthInSteps / STEPS_PER_BAR} bars`);
        }
        this.sequenceLength = newLengthInSteps;

        // Determine number of rows based on track type
        let numRows;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRows = synthPitches.length;
        else if (this.type === 'Sampler') numRows = this.slices.length > 0 ? this.slices.length : numSlices; // Use actual slice count if available
        else if (this.type === 'DrumSampler') numRows = numDrumSamplerPads;
        else numRows = (this.sequenceData && this.sequenceData.length > 0) ? this.sequenceData.length : 0; // Fallback for unknown types or empty tracks

        // Resize sequenceData grid
        const currentSequenceData = this.sequenceData || [];
        const newGridDataArray = Array(numRows).fill(null).map((_, rIndex) => {
            const currentRow = currentSequenceData[rIndex] || []; // Handle potentially undefined rows
            const newRow = Array(this.sequenceLength).fill(null);
            for (let c = 0; c < Math.min(currentRow.length, this.sequenceLength); c++) {
                newRow[c] = currentRow[c]; // Copy existing data
            }
            return newRow;
        });
        this.sequenceData = newGridDataArray;

        // Dispose and recreate Tone.Sequence
        if (this.sequence && !this.sequence.disposed) {
            this.sequence.stop();
            this.sequence.clear();
            this.sequence.dispose();
            this.sequence = null;
        }

        // Create a new sequence with the potentially updated sequence length
        this.sequence = new Tone.Sequence((time, col) => {
            // Check for global solo state
            const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
            const isSoloedOut = currentGlobalSoloId && currentGlobalSoloId !== this.id;

            // Update UI for playing step if sequencer window is open
            if (this.sequencerWindow && !this.sequencerWindow.isMinimized) {
                const grid = this.sequencerWindow.element?.querySelector('.sequencer-grid');
                if (grid && typeof window.highlightPlayingStep === 'function') {
                    window.highlightPlayingStep(col, this.type, grid);
                }
            }

            if (!this.gainNode || this.isMuted || isSoloedOut) { // Check mute and solo state
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
                        const totalPitchShift = sliceData.pitchShift; // Assumes pitchShift is in semitones
                        const playbackRate = Math.pow(2, totalPitchShift / 12);
                        let playDuration = sliceData.duration / playbackRate;
                        if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds(); // Or a fixed duration for looped sequence steps

                        if (this.slicerIsPolyphonic) {
                            const tempPlayer = new Tone.Player(this.audioBuffer);
                            const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                            const tempGain = new Tone.Gain(step.velocity * sliceData.volume); // Apply step velocity and slice volume
                            const destinationNode = (this.distortionNode && !this.distortionNode.disposed) ? this.distortionNode : Tone.getDestination();

                            tempPlayer.chain(tempEnv, tempGain, destinationNode);

                            tempPlayer.playbackRate = playbackRate;
                            tempPlayer.reverse = sliceData.reverse;
                            tempPlayer.loop = sliceData.loop;
                            tempPlayer.loopStart = sliceData.offset;
                            tempPlayer.loopEnd = sliceData.offset + sliceData.duration;

                            tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
                            tempEnv.triggerAttack(time);
                            if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95); // Ensure release before end

                            // Schedule disposal
                            Tone.Transport.scheduleOnce(() => {
                                if (tempPlayer && !tempPlayer.disposed) { tempPlayer.stop(); tempPlayer.dispose(); }
                                if (tempEnv && !tempEnv.disposed) tempEnv.dispose();
                                if (tempGain && !tempGain.disposed) tempGain.dispose();
                            }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2); // Add buffer for release
                        } else { // Monophonic slicer playback
                            if (this.slicerMonoPlayer && !this.slicerMonoPlayer.disposed && this.slicerMonoEnvelope && this.slicerMonoGain) {
                                // Stop previous note if playing
                                if (this.slicerMonoPlayer.state === 'started') this.slicerMonoPlayer.stop(time);
                                if (this.slicerMonoEnvelope.getValueAtTime(time) > 0.001) this.slicerMonoEnvelope.triggerRelease(time);


                                this.slicerMonoPlayer.buffer = this.audioBuffer;
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
                                    const releaseTime = time + playDuration - (sliceData.envelope.release || 0.1); // Ensure release calculation considers envelope
                                    this.slicerMonoEnvelope.triggerRelease(Math.max(time, releaseTime));
                                }
                            }
                        }
                    }
                });
            }
            else if (this.type === 'DrumSampler') {
                Array.from({ length: numDrumSamplerPads }).forEach((_, padIndex) => {
                    const step = this.sequenceData[padIndex]?.[col];
                    const padData = this.drumSamplerPads[padIndex];
                    if (step?.active && padData && this.drumPadPlayers[padIndex] && this.drumPadPlayers[padIndex].loaded) {
                        const player = this.drumPadPlayers[padIndex];
                        player.volume.value = Tone.gainToDb(padData.volume * step.velocity); // Apply step velocity
                        player.playbackRate = Math.pow(2, (padData.pitchShift) / 12);
                        player.start(time);
                    }
                });
            }
            else if (this.type === 'InstrumentSampler') {
                 synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active && this.toneSampler && this.toneSampler.loaded) {
                        this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "8n", time, step.velocity);
                    }
                });
            }

        }, Array.from(Array(this.sequenceLength).keys()), "16n").start(0);

        // If sequencer window is open, refresh it
        if (this.sequencerWindow && !this.sequencerWindow.isMinimized && window.openWindows[`sequencerWin-${this.id}`]) { // Check if it's the current one
             if (typeof window.openTrackSequencerWindow === 'function') {
                window.openTrackSequencerWindow(this.id, true); // Force redraw
             }
        }
    }


    dispose() {
        console.log(`[Track ${this.id}] Disposing track ${this.name} (${this.type})`);
        if (this.sequence && !this.sequence.disposed) { this.sequence.stop(); this.sequence.clear(); this.sequence.dispose(); }
        if (this.instrument && !this.instrument.disposed) this.instrument.dispose(); // For Synth and potentially other future instrument types
        if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose(); // For Sampler (slicer)
        this.disposeSlicerMonoNodes(); // Clean up mono slicer nodes
        if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.dispose(); // For InstrumentSampler
        if (this.instrumentSamplerSettings.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose();


        this.drumSamplerPads.forEach(pad => { if (pad.audioBuffer && !pad.audioBuffer.disposed) pad.audioBuffer.dispose(); });
        this.drumPadPlayers.forEach(player => { if (player && !player.disposed) player.dispose(); });

        // Dispose all effect nodes and the gain node
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

        // Close any open SnugWindows associated with this track
        if (this.inspectorWindow && typeof this.inspectorWindow.close === 'function') this.inspectorWindow.close();
        if (this.effectsRackWindow && typeof this.effectsRackWindow.close === 'function') this.effectsRackWindow.close();
        if (this.sequencerWindow && typeof this.sequencerWindow.close === 'function') this.sequencerWindow.close();


        // Nullify references
        this.sequence = null; this.instrument = null; this.audioBuffer = null;
        this.slicerMonoPlayer = null; this.slicerMonoEnvelope = null; this.slicerMonoGain = null;
        this.toneSampler = null;
        this.drumSamplerPads = []; this.drumPadPlayers = []; // Clear arrays
        this.distortionNode = null; this.filterNode = null; this.chorusNode = null; this.saturationNode = null;
        this.phaserNode = null; this.autoWahNode = null; this.eq3Node = null; this.compressorNode = null;
        this.delayNode = null; this.reverbNode = null; this.gainNode = null; this.trackMeter = null;
        this.inspectorWindow = null; this.effectsRackWindow = null; this.sequencerWindow = null;
        console.log(`[Track ${this.id}] Finished disposing track ${this.name}`);
    }
}
