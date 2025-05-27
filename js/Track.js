// js/Track.js - Track Class Module

import { STEPS_PER_BAR, defaultStepsPerBar, synthPitches, numSlices, numDrumSamplerPads } from './constants.js';

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

        this.originalFileName = initialData?.samplerAudioData?.fileName || null;
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

    getDefaultSynthParams(engineType) {
        switch (engineType) {
            case 'AMSynth': return { harmonicity: 3, detune: 0, oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.1, sustain: 1, release: 0.5 }, modulation: { type: 'square' }, modulationEnvelope: { attack: 0.5, decay: 0.01, sustain: 1, release: 0.5 } };
            case 'FMSynth': return { harmonicity: 3, modulationIndex: 10, detune: 0, oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.1, sustain: 1, release: 0.5 }, modulation: { type: 'square' }, modulationEnvelope: { attack: 0.5, decay: 0.01, sustain: 1, release: 0.5 } };
            case 'BasicPoly': default: return { oscillator: { type: 'triangle8' }, envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 } };
        }
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
            console.log(`[Track ${this.id}] TrackMeter created:`, this.trackMeter); // DEBUG

            const effectChainNodes = [ this.distortionNode, this.filterNode, this.chorusNode, this.saturationNode, this.phaserNode ];
            if (this.autoWahNode) effectChainNodes.push(this.autoWahNode);
            effectChainNodes.push( this.eq3Node, this.compressorNode, this.delayNode, this.reverbNode, this.gainNode );
            
            // Connect gainNode to trackMeter, then trackMeter to Destination
            // Ensure all instruments/players connect to distortionNode (which is start of chain)
            // The chain ends at gainNode, which then goes to meter and then destination.
            if (this.gainNode && this.trackMeter) {
                this.gainNode.connect(this.trackMeter);
                console.log(`[Track ${this.id}] GainNode connected to TrackMeter.`); // DEBUG
                this.trackMeter.connect(Tone.getDestination());
                console.log(`[Track ${this.id}] TrackMeter connected to Destination.`); // DEBUG
                // The rest of the chain connects to gainNode
                Tone.connectSeries(...effectChainNodes, this.gainNode);
            } else {
                 console.error(`[Track ${this.id}] GainNode or TrackMeter is null. Cannot complete audio chain.`);
                 // Fallback: connect chain directly to destination if meter setup fails
                 Tone.connectSeries(...effectChainNodes, Tone.getDestination());
            }
            console.log(`[Track ${this.id}] Audio nodes initialized and chained.`);
        } catch (error) {
            console.error(`[Track ${this.id}] Critical error during audio node initialization:`, error);
        }
    }

    async fullyInitializeAudioResources() {
        await this.initializeInstrument();
        this.setSequenceLength(this.sequenceLength, true); // Rebuild sequence with current data
        if (this.waveformCanvasCtx && this.type === 'Sampler' && this.audioBuffer && this.audioBuffer.loaded) {
            if (typeof window.drawWaveform === 'function') window.drawWaveform(this);
        }
         if (this.instrumentWaveformCanvasCtx && this.type === 'InstrumentSampler' && this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
            if (typeof window.drawInstrumentWaveform === 'function') window.drawInstrumentWaveform(this);
        }
        this.applyMuteState(); // Apply initial mute/solo state
        this.applySoloState();
    }

    async initializeInstrument() {
        if (!this.distortionNode && (this.type === 'Synth' || this.type === 'DrumSampler' || this.type === 'InstrumentSampler')) {
             console.error(`[Track ${this.id}] Distortion node not initialized. Cannot connect instrument/player for type ${this.type}.`);
        }
        if (this.instrument && typeof this.instrument.dispose === 'function' && !this.instrument.disposed) {
            this.instrument.dispose(); this.instrument = null;
        }
        // For sampler types, players are handled differently.
        if (this.type === 'DrumSampler') { // Ensure old players are disposed if re-initializing
            this.drumPadPlayers.forEach((player, i) => { if(player && !player.disposed) player.dispose(); this.drumPadPlayers[i] = null; });
        }
        if (this.type === 'InstrumentSampler' && this.toneSampler && !this.toneSampler.disposed) {
            this.toneSampler.dispose(); this.toneSampler = null;
        }


        try {
            if (this.type === 'Synth') {
                let synthEngineConstructor; let engineParamsToSet;
                switch (this.synthEngineType) {
                    case 'AMSynth': synthEngineConstructor = Tone.AMSynth; engineParamsToSet = this.synthParams.amSynth || this.getDefaultSynthParams('AMSynth'); this.synthParams.amSynth = engineParamsToSet; break;
                    case 'FMSynth': synthEngineConstructor = Tone.FMSynth; engineParamsToSet = this.synthParams.fmSynth || this.getDefaultSynthParams('FMSynth'); this.synthParams.fmSynth = engineParamsToSet; break;
                    case 'BasicPoly': default: synthEngineConstructor = Tone.Synth; engineParamsToSet = this.synthParams.basicPoly || this.getDefaultSynthParams('BasicPoly'); this.synthParams.basicPoly = engineParamsToSet; break;
                }
                this.instrument = new Tone.PolySynth(synthEngineConstructor, { polyphony: 8, voice: synthEngineConstructor });
                this.instrument.set(engineParamsToSet);
                if (this.distortionNode) this.instrument.connect(this.distortionNode); else this.instrument.toDestination();
                console.log(`[Track ${this.id}] Initialized ${this.synthEngineType} (as PolySynth)`);
            } else if (this.type === 'Sampler') { // Slicer
                if (this.audioBufferDataURL) {
                    if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose();
                    this.audioBuffer = await new Tone.Buffer().load(this.audioBufferDataURL);
                    if (!this.slicerIsPolyphonic && this.audioBuffer.loaded) this.setupSlicerMonoNodes();
                } else { if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose(); this.audioBuffer = null; }
            } else if (this.type === 'InstrumentSampler') {
                if (this.instrumentSamplerSettings.audioBufferDataURL) {
                    if (this.instrumentSamplerSettings.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose();
                    this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(this.instrumentSamplerSettings.audioBufferDataURL);
                } else {
                    if (this.instrumentSamplerSettings.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose();
                    this.instrumentSamplerSettings.audioBuffer = null;
                }
                this.setupToneSampler(); // Call this regardless of whether new buffer was loaded, to ensure sampler is (re)created or cleared
            } else if (this.type === 'DrumSampler') { // Pad Sampler
                const padPromises = this.drumSamplerPads.map(async (padData, i) => {
                    if (padData.audioBufferDataURL) {
                        if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
                        padData.audioBuffer = await new Tone.Buffer().load(padData.audioBufferDataURL);
                        if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) this.drumPadPlayers[i].dispose();
                        if (this.distortionNode) this.drumPadPlayers[i] = new Tone.Player(padData.audioBuffer).connect(this.distortionNode);
                        else this.drumPadPlayers[i] = new Tone.Player(padData.audioBuffer).toDestination();
                    }
                });
                await Promise.all(padPromises);
            }
        } catch (error) { console.error(`[Track ${this.id}] Error initializing instrument/resources for (${this.synthEngineType || this.type}):`, error); }
    }

    setupSlicerMonoNodes() { /* ... (no changes, keep as is) ... */ }
    disposeSlicerMonoNodes() { /* ... (no changes, keep as is) ... */ }
    setupToneSampler() { /* ... (no changes, keep as is, assume logs are sufficient from previous fix) ... */ }

    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = parseFloat(volume);
        if (this.gainNode && !this.isMuted) { this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05); }
    }
    applyMuteState() {
        console.log(`[Track ${this.id}] applyMuteState called. isMuted: ${this.isMuted}`); // DEBUG
        if (!this.gainNode) { console.warn(`[Track ${this.id}] applyMuteState: gainNode is null.`); return; }
        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
        if (this.isMuted) {
            this.gainNode.gain.rampTo(0, 0.01);
        } else {
            // If another track is soloed, this track (even if unmuted) should be silent
            if (currentGlobalSoloId && currentGlobalSoloId !== this.id) {
                this.gainNode.gain.rampTo(0, 0.01);
            } else {
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
            }
        }
    }
    applySoloState() {
        console.log(`[Track ${this.id}] applySoloState called. isSoloed: ${this.isSoloed}, globalSoloId: ${typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : 'N/A'}`); // DEBUG
        if (!this.gainNode) { console.warn(`[Track ${this.id}] applySoloState: gainNode is null.`); return; }

        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;

        if (this.isMuted) { // If track is muted, it's always silent
            this.gainNode.gain.rampTo(0, 0.01);
            return;
        }

        if (currentGlobalSoloId) { // A track is soloed somewhere
            if (this.id === currentGlobalSoloId) { // This track is THE soloed track
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05); // Play at its normal (unmuted) volume
            } else { // Another track is soloed
                this.gainNode.gain.rampTo(0, 0.01); // Silence this track
            }
        } else { // No tracks are soloed
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05); // Play at its normal (unmuted) volume
        }
    }

    // ... (Effect Setters remain the same) ...
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
    setAutoWahFollower(value) {
        this.effects.autoWah.follower = parseFloat(value);
        if(this.autoWahNode && this.autoWahNode.follower) { 
             if (this.autoWahNode.follower.attack && typeof this.autoWahNode.follower.attack.value !== 'undefined') {
                this.autoWahNode.follower.attack = this.effects.autoWah.follower;
                this.autoWahNode.follower.release = this.effects.autoWah.follower; 
            } else if (typeof this.autoWahNode.follower === 'object' && 'attack' in this.autoWahNode.follower) {
                 this.autoWahNode.follower.set({ attack: this.effects.autoWah.follower, release: this.effects.autoWah.follower });
            } else {
                this.autoWahNode.follower = this.effects.autoWah.follower;
            }
        }
    }
    setSynthParam(paramPath, value) { /* ... (no changes, keep as is) ... */ }
    setSliceVolume(sliceIndex, volume) { /* ... (no changes, keep as is) ... */ }
    setSlicePitchShift(sliceIndex, semitones) { /* ... (no changes, keep as is) ... */ }
    setSliceLoop(sliceIndex, loop) { /* ... (no changes, keep as is) ... */ }
    setSliceReverse(sliceIndex, reverse) { /* ... (no changes, keep as is) ... */ }
    setSliceEnvelopeParam(sliceIndex, param, value) { /* ... (no changes, keep as is) ... */ }
    setDrumSamplerPadVolume(padIndex, volume) { /* ... (no changes, keep as is) ... */ }
    setDrumSamplerPadPitch(padIndex, pitch) { /* ... (no changes, keep as is) ... */ }
    setDrumSamplerPadEnv(padIndex, param, value) { /* ... (no changes, keep as is) ... */ }
    setInstrumentSamplerRootNote(noteName) { /* ... (no changes, keep as is, assume logs and validation are sufficient) ... */ }
    setInstrumentSamplerLoop(loop) { /* ... (no changes, keep as is) ... */ }
    setInstrumentSamplerLoopStart(time) { /* ... (no changes, keep as is) ... */ }
    setInstrumentSamplerLoopEnd(time) { /* ... (no changes, keep as is) ... */ }
    setInstrumentSamplerEnv(param, value) { /* ... (no changes, keep as is) ... */ }

    async doubleSequence() { /* ... (no changes, keep as is) ... */ }
    setSequenceLength(newLengthInSteps, skipUndoCapture = false) { /* ... (no changes, keep as is) ... */ }
    dispose() { /* ... (no changes, keep as is) ... */ }
}