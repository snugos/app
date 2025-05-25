// js/Track.js - Track Class Module

import { STEPS_PER_BAR, defaultStepsPerBar, synthPitches, numSlices, numDrumSamplerPads } from './constants.js';
import { showNotification } from './utils.js';

export class Track {
    constructor(id, type, initialData = null) {
        this.id = initialData?.id || id;
        this.type = type;
        this.name = initialData?.name || `${type} Track ${this.id}`;
        this.isMuted = initialData?.isMuted || false;
        // Solo state is managed by state.js; track.isSoloed reflects if THIS track is the one soloed.
        this.isSoloed = (typeof window.getSoloedTrackId === 'function' && window.getSoloedTrackId() === this.id); 
        this.previousVolumeBeforeMute = initialData?.volume ?? 0.7;

        console.log(`[Track ${this.id}] CONSTRUCTOR - Type: ${this.type}, Name: ${this.name}, Muted: ${this.isMuted}, Soloed: ${this.isSoloed}, InitialVol: ${this.previousVolumeBeforeMute}`);

        this.synthParams = {
            oscillator: initialData?.synthParams?.oscillator || { type: 'triangle8' },
            envelope: initialData?.synthParams?.envelope || { attack: 0.02, decay: 0.1, sustain: 0.3, release: 0.5 }
        };

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

        this.distortionNode = new Tone.Distortion(this.effects.distortion.amount);
        this.filterNode = new Tone.Filter({
            frequency: this.effects.filter.frequency, type: this.effects.filter.type,
            rolloff: this.effects.filter.rolloff, Q: this.effects.filter.Q
        });
        this.chorusNode = new Tone.Chorus(this.effects.chorus.frequency, this.effects.chorus.delayTime, this.effects.chorus.depth);
        this.chorusNode.wet.value = this.effects.chorus.wet;
        this.saturationNode = new Tone.Chebyshev(Math.max(1, Math.floor(this.effects.saturation.amount) * 2 + 1));
        this.saturationNode.wet.value = this.effects.saturation.wet;
        this.eq3Node = new Tone.EQ3(this.effects.eq3);
        this.compressorNode = new Tone.Compressor(this.effects.compressor);
        this.delayNode = new Tone.FeedbackDelay(this.effects.delay.time, this.effects.delay.feedback);
        this.delayNode.wet.value = this.effects.delay.wet;
        this.reverbNode = new Tone.Reverb(this.effects.reverb);
        this.gainNode = new Tone.Gain(this.isMuted ? 0 : this.previousVolumeBeforeMute);
        this.trackMeter = new Tone.Meter({ smoothing: 0.8 });

        console.log(`[Track ${this.id}] Initial GainNode value: ${this.gainNode.gain.value}`);
        this.distortionNode.chain(this.filterNode, this.chorusNode, this.saturationNode, this.eq3Node, this.compressorNode, this.delayNode, this.reverbNode, this.gainNode, this.trackMeter, Tone.getDestination());
        console.log(`[Track ${this.id}] Audio chain connected.`);

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

    async fullyInitializeAudioResources() {
        console.log(`[Track ${this.id}] Starting fullyInitializeAudioResources. Type: ${this.type}`);
        await this.initializeInstrumentFromInitialData();
        this.setSequenceLength(this.sequenceLength, true);
        console.log(`[Track ${this.id}] fullyInitializeAudioResources completed. Current gain: ${this.gainNode.gain.value}`);
        
        if (this.waveformCanvasCtx && this.type === 'Sampler' && this.audioBuffer && this.audioBuffer.loaded) {
            if (typeof window.drawWaveform === 'function') window.drawWaveform(this);
        }
         if (this.instrumentWaveformCanvasCtx && this.type === 'InstrumentSampler' && this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
            if (typeof window.drawInstrumentWaveform === 'function') window.drawInstrumentWaveform(this);
        }
        // After all resources are loaded, re-apply mute/solo to ensure gain is correct
        this.applyMuteState();
        this.applySoloState();
    }

    async initializeInstrumentFromInitialData() {
        console.log(`[Track ${this.id}] initializeInstrumentFromInitialData. Type: ${this.type}`);
        if (this.type === 'Synth') {
            if (this.instrument && !this.instrument.disposed) this.instrument.dispose();
            this.instrument = new Tone.PolySynth(Tone.Synth, {
                oscillator: this.synthParams.oscillator, envelope: this.synthParams.envelope
            }).connect(this.distortionNode);
            console.log(`[Track ${this.id}] Synth instrument (re)created.`);
        } else if (this.type === 'Sampler') {
            if (this.audioBufferDataURL) {
                console.log(`[Track ${this.id}] Sampler loading from DataURL...`);
                try {
                    if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose();
                    this.audioBuffer = await new Tone.Buffer().load(this.audioBufferDataURL);
                    console.log(`[Track ${this.id}] Sampler audio buffer loaded. Duration: ${this.audioBuffer.duration}`);
                    if (!this.slicerIsPolyphonic && this.audioBuffer.loaded) {
                        this.setupSlicerMonoNodes();
                    }
                } catch (e) {
                    console.error(`[Track ${this.id}] Error loading Slicer audio buffer:`, e);
                    showNotification(`Error loading sample for Slicer ${this.name}.`, 3000);
                    this.audioBufferDataURL = null; this.audioBuffer = null;
                }
            } else {
                console.log(`[Track ${this.id}] Sampler: No audioBufferDataURL to load.`);
                 if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose();
                 this.audioBuffer = null;
            }
        } else if (this.type === 'InstrumentSampler') {
            if (this.instrumentSamplerSettings.audioBufferDataURL) {
                console.log(`[Track ${this.id}] InstrumentSampler loading from DataURL...`);
                try {
                    if (this.instrumentSamplerSettings.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose();
                    this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(this.instrumentSamplerSettings.audioBufferDataURL);
                    console.log(`[Track ${this.id}] InstrumentSampler audio buffer loaded. Duration: ${this.instrumentSamplerSettings.audioBuffer.duration}`);
                    this.setupToneSampler();
                } catch (e) {
                    console.error(`[Track ${this.id}] Error loading InstrumentSampler audio buffer:`, e);
                    showNotification(`Error loading sample for Instrument Sampler ${this.name}.`, 3000);
                    this.instrumentSamplerSettings.audioBufferDataURL = null; this.instrumentSamplerSettings.audioBuffer = null;
                }
            } else {
                console.log(`[Track ${this.id}] InstrumentSampler: No audioBufferDataURL. Setting up empty sampler.`);
                 if (this.instrumentSamplerSettings.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose();
                 this.instrumentSamplerSettings.audioBuffer = null;
                this.setupToneSampler();
            }
        } else if (this.type === 'DrumSampler') {
            console.log(`[Track ${this.id}] Initializing DrumSampler pads audio.`);
            const padPromises = this.drumSamplerPads.map(async (padData, i) => {
                if (padData.audioBufferDataURL) {
                    console.log(`[Track ${this.id}] Drum pad ${i} loading from DataURL...`);
                    try {
                        if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
                        padData.audioBuffer = await new Tone.Buffer().load(padData.audioBufferDataURL);
                        console.log(`[Track ${this.id}] Drum pad ${i} audio buffer loaded. Duration: ${padData.audioBuffer.duration}`);
                        if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) this.drumPadPlayers[i].dispose();
                        this.drumPadPlayers[i] = new Tone.Player(padData.audioBuffer).connect(this.distortionNode);
                    } catch (e) {
                        console.error(`[Track ${this.id}] Error loading DrumSampler pad ${i} audio:`, e);
                        showNotification(`Error loading sample for Drum Sampler ${this.name}, Pad ${i+1}.`, 3000);
                        padData.audioBufferDataURL = null; padData.audioBuffer = null;
                    }
                } else {
                    if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
                    padData.audioBuffer = null;
                    if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) this.drumPadPlayers[i].dispose();
                    this.drumPadPlayers[i] = null;
                    console.log(`[Track ${this.id}] Drum pad ${i}: No audioBufferDataURL.`);
                }
            });
            await Promise.all(padPromises);
            console.log(`[Track ${this.id}] All DrumSampler pad audio initializations attempted.`);
        }
    }

    setupSlicerMonoNodes() {
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
        if (this.toneSampler && !this.toneSampler.disposed) this.toneSampler.dispose();
        const urls = {};
        if (this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
            urls[this.instrumentSamplerSettings.rootNote] = this.instrumentSamplerSettings.audioBuffer;
            console.log(`[Track ${this.id}] Setting up Tone.Sampler with buffer for root note ${this.instrumentSamplerSettings.rootNote}`);
        } else {
            console.log(`[Track ${this.id}] Setting up Tone.Sampler, but no audio buffer loaded for root note ${this.instrumentSamplerSettings.rootNote}.`);
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
        
        if (Object.keys(urls).length > 0 && !this.toneSampler.loaded) {
            console.warn(`[Track ${this.id}] InstrumentSampler created with URLs but not immediately loaded. Sample: ${this.instrumentSamplerSettings.originalFileName || 'Unknown'}`);
        } else if (this.toneSampler.loaded) {
             console.log(`[Track ${this.id}] InstrumentSampler loaded immediately. Sample: ${this.instrumentSamplerSettings.originalFileName || 'Unknown'}`);
        } else if (Object.keys(urls).length === 0) {
             console.log(`[Track ${this.id}] InstrumentSampler set up without any samples initially.`);
        }
    }

    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = parseFloat(volume);
        if (!this.isMuted) { this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05); }
        console.log(`[Track ${this.id}] Volume set to ${this.previousVolumeBeforeMute}. Muted: ${this.isMuted}. Actual gain: ${this.gainNode.gain.value}`);
    }

    applyMuteState() {
        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null; // Get global solo state
        if (this.isMuted) {
            this.gainNode.gain.rampTo(0, 0.01);
            console.log(`[Track ${this.id}] APPLY MUTED. Gain set to 0.`);
        } else { // Not muted
            if (currentGlobalSoloId && currentGlobalSoloId !== this.id) { // Another track is soloed
                this.gainNode.gain.rampTo(0, 0.01);
                console.log(`[Track ${this.id}] APPLY UNMUTED, but another track (ID: ${currentGlobalSoloId}) is soloed. Gain set to 0.`);
            } else { // Not muted AND (either this track is soloed OR no track is soloed)
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
                console.log(`[Track ${this.id}] APPLY UNMUTED (or is soloed/no solo). Gain set to ${this.previousVolumeBeforeMute}.`);
            }
        }
    }

    applySoloState() {
        const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null; // Get global solo state
        console.log(`[Track ${this.id}] APPLY SOLO STATE. Current Global Solo ID: ${currentGlobalSoloId}, This Track Muted: ${this.isMuted}, This Track isSoloed (local): ${this.isSoloed}`);
        
        if (this.isMuted) {
            this.gainNode.gain.rampTo(0, 0.01); // If track is muted, it stays silent regardless of solo.
            console.log(`[Track ${this.id}] ApplySoloState: Track is muted, gain remains 0.`);
            return;
        }

        if (currentGlobalSoloId) { // A track is soloed globally
            if (this.id === currentGlobalSoloId) { // This track IS the globally soloed track
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
                console.log(`[Track ${this.id}] ApplySoloState: IS THE SOLOED track. Gain set to ${this.previousVolumeBeforeMute}.`);
            } else { // This track is NOT the globally soloed track
                this.gainNode.gain.rampTo(0, 0.01);
                console.log(`[Track ${this.id}] ApplySoloState: Is NOT the soloed track. Gain set to 0.`);
            }
        } else { // No track is soloed globally
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
            console.log(`[Track ${this.id}] ApplySoloState: No track globally soloed. Gain set to ${this.previousVolumeBeforeMute}.`);
        }
    }

    setReverbWet(value) { this.effects.reverb.wet = parseFloat(value) || 0; this.reverbNode.wet.value = this.effects.reverb.wet; }
    setDelayWet(value) { this.effects.delay.wet = parseFloat(value) || 0; this.delayNode.wet.value = this.effects.delay.wet; }
    setDelayTime(value) { this.effects.delay.time = parseFloat(value) || 0; this.delayNode.delayTime.value = this.effects.delay.time; }
    setDelayFeedback(value) { this.effects.delay.feedback = parseFloat(value) || 0; this.delayNode.feedback.value = this.effects.delay.feedback; }
    setFilterFrequency(value) { this.effects.filter.frequency = parseFloat(value) || 20000; this.filterNode.frequency.value = this.effects.filter.frequency; }
    setFilterType(value) { this.effects.filter.type = value; this.filterNode.type = this.effects.filter.type; }
    setCompressorThreshold(value) { this.effects.compressor.threshold = parseFloat(value) || -24; this.compressorNode.threshold.value = this.effects.compressor.threshold; }
    setCompressorRatio(value) { this.effects.compressor.ratio = parseFloat(value) || 12; this.compressorNode.ratio.value = this.effects.compressor.ratio; }
    setCompressorAttack(value) { this.effects.compressor.attack = parseFloat(value) || 0.003; this.compressorNode.attack.value = this.effects.compressor.attack; }
    setCompressorRelease(value) { this.effects.compressor.release = parseFloat(value) || 0.25; this.compressorNode.release.value = this.effects.compressor.release; }
    setCompressorKnee(value) { this.effects.compressor.knee = parseFloat(value) || 30; this.compressorNode.knee.value = this.effects.compressor.knee; }
    setEQ3Low(value) { this.effects.eq3.low = parseFloat(value) || 0; this.eq3Node.low.value = this.effects.eq3.low; }
    setEQ3Mid(value) { this.effects.eq3.mid = parseFloat(value) || 0; this.eq3Node.mid.value = this.effects.eq3.mid; }
    setEQ3High(value) { this.effects.eq3.high = parseFloat(value) || 0; this.eq3Node.high.value = this.effects.eq3.high; }
    setDistortionAmount(value) { this.effects.distortion.amount = parseFloat(value) || 0; this.distortionNode.distortion = this.effects.distortion.amount; }
    setChorusWet(value) { this.effects.chorus.wet = parseFloat(value) || 0; this.chorusNode.wet.value = this.effects.chorus.wet; }
    setChorusFrequency(value) { this.effects.chorus.frequency = parseFloat(value) || 1.5; this.chorusNode.frequency.value = this.effects.chorus.frequency; }
    setChorusDelayTime(value) { this.effects.chorus.delayTime = parseFloat(value) || 3.5; this.chorusNode.delayTime = this.effects.chorus.delayTime; }
    setChorusDepth(value) { this.effects.chorus.depth = parseFloat(value) || 0.7; this.chorusNode.depth = this.effects.chorus.depth; }
    setSaturationWet(value) { this.effects.saturation.wet = parseFloat(value) || 0; this.saturationNode.wet.value = this.effects.saturation.wet; }
    setSaturationAmount(value) {
        this.effects.saturation.amount = parseFloat(value) || 0;
        this.saturationNode.order = Math.max(1, Math.floor(this.effects.saturation.amount) * 2 + 1);
    }
    setSynthOscillatorType(type) { if (this.type !== 'Synth' || !this.instrument) return; this.synthParams.oscillator.type = type; this.instrument.set({ oscillator: { type: type } }); }
    setSynthEnvelope(param, value) { if (this.type !== 'Synth' || !this.instrument) return; const val = parseFloat(value); if (isNaN(val)) return; this.synthParams.envelope[param] = val; this.instrument.set({ envelope: this.synthParams.envelope }); }
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

    setSequenceLength(newLengthInSteps, skipUndoCapture = false) {
        console.log(`[Track ${this.id}] Setting sequence length to ${newLengthInSteps} steps.`);
        newLengthInSteps = Math.max(STEPS_PER_BAR, parseInt(newLengthInSteps) || defaultStepsPerBar);
        newLengthInSteps = Math.ceil(newLengthInSteps / STEPS_PER_BAR) * STEPS_PER_BAR;
        this.sequenceLength = newLengthInSteps;

        let numRows;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRows = synthPitches.length;
        else if (this.type === 'Sampler') numRows = this.slices.length > 0 ? this.slices.length : numSlices;
        else if (this.type === 'DrumSampler') numRows = numDrumSamplerPads;
        else numRows = 0;

        const newGridData = Array(numRows).fill(null).map(() => Array(this.sequenceLength).fill(null));
        if (Array.isArray(this.sequenceData) && this.sequenceData.length > 0 && Array.isArray(this.sequenceData[0])) {
            for (let r = 0; r < Math.min(this.sequenceData.length, numRows); r++) {
                for (let c = 0; c < Math.min(this.sequenceData[r]?.length || 0, this.sequenceLength); c++) {
                    newGridData[r][c] = this.sequenceData[r][c];
                }
            }
        }
        this.sequenceData = newGridData;

        if (this.sequence && !this.sequence.disposed) this.sequence.dispose();
        
        this.sequence = new Tone.Sequence((time, col) => {
            const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
            const isSoloedOut = currentGlobalSoloId && currentGlobalSoloId !== this.id;

            if (this.isMuted || isSoloedOut) {
                // Optional: Log only once per sequence loop or less frequently to avoid spam
                // if (col === 0) console.log(`[Track ${this.id}] Sequence: Skipped playback. Muted: ${this.isMuted}, Soloed Out: ${isSoloedOut}, Gain: ${this.gainNode.gain.value.toFixed(2)}`);
                return;
            }
            // Log only for the first step of a bar to reduce console noise
            // if (col % STEPS_PER_BAR === 0) {
            //     console.log(`[Track ${this.id}] Sequence playing bar starting at col ${col}. Gain: ${this.gainNode.gain.value.toFixed(2)}, Muted: ${this.isMuted}, Soloed: ${this.isSoloed}, GlobalSolo: ${currentGlobalSoloId}`);
            // }


            if (this.type === 'Synth') {
                synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step && step.active && this.instrument) {
                        // console.log(`[Track ${this.id}] Synth: Triggering ${pitchName} at col ${col}, vel ${step.velocity}`);
                        this.instrument.triggerAttackRelease(pitchName, "8n", time, step.velocity);
                    }
                });
            } else if (this.type === 'Sampler') {
                this.slices.forEach((sliceData, sliceIndex) => {
                    const step = this.sequenceData[sliceIndex]?.[col];
                    if (step?.active && sliceData?.duration > 0 && this.audioBuffer?.loaded) {
                        // console.log(`[Track ${this.id}] Sampler: Triggering slice ${sliceIndex} at col ${col}, vel ${step.velocity}`);
                        const totalPitchShift = sliceData.pitchShift;
                        const playbackRate = Math.pow(2, totalPitchShift / 12);
                        let playDuration = sliceData.duration / playbackRate;
                        if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds();

                        if (this.slicerIsPolyphonic) {
                            const tempPlayer = new Tone.Player(this.audioBuffer);
                            const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
                            const tempGain = new Tone.Gain(Tone.dbToGain(-6) * sliceData.volume * step.velocity);
                            tempPlayer.chain(tempEnv, tempGain, this.distortionNode);
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
                            if (!this.slicerMonoPlayer || this.slicerMonoPlayer.disposed) return;
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
            } else if (this.type === 'DrumSampler') {
                this.drumSamplerPads.forEach((padData, padIndex) => {
                    const step = this.sequenceData[padIndex]?.[col];
                    if (step?.active && this.drumPadPlayers[padIndex] && this.drumPadPlayers[padIndex].loaded) {
                        // console.log(`[Track ${this.id}] DrumSampler: Triggering pad ${padIndex} at col ${col}, vel ${step.velocity}`);
                        const player = this.drumPadPlayers[padIndex];
                        player.volume.value = Tone.gainToDb(padData.volume * step.velocity);
                        player.playbackRate = Math.pow(2, (padData.pitchShift) / 12);
                        player.start(time);
                    }
                });
            } else if (this.type === 'InstrumentSampler') {
                synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active && this.toneSampler && this.toneSampler.loaded) {
                        // console.log(`[Track ${this.id}] InstrumentSampler: Triggering ${pitchName} at col ${col}, vel ${step.velocity}`);
                        const midiNote = Tone.Frequency(pitchName).toMidi();
                        const shiftedNote = Tone.Frequency(midiNote, "midi").toNote();
                        this.toneSampler.triggerAttackRelease(shiftedNote, "8n", time, step.velocity);
                    } else if (step?.active && this.toneSampler && !this.toneSampler.loaded) {
                        console.warn(`[Track ${this.id}] InstrumentSampler: Attempted to trigger ${pitchName} but sampler not loaded. Sample: ${this.instrumentSamplerSettings.originalFileName}`);
                    }
                });
            }
            const currentActiveSequencerTrackId = typeof window.getActiveSequencerTrackId === 'function' ? window.getActiveSequencerTrackId() : window.activeSequencerTrackId;
            if (this.sequencerWindow && !this.sequencerWindow.isMinimized && currentActiveSequencerTrackId === this.id) {
                const grid = this.sequencerWindow.element?.querySelector('.sequencer-grid');
                if (grid && typeof window.highlightPlayingStep === 'function') {
                    window.highlightPlayingStep(col, this.type, grid);
                }
            }

        }, Array.from(Array(this.sequenceLength).keys()), "16n").start(0);
        console.log(`[Track ${this.id}] Sequence (re)created and started.`);


        if (this.sequencerWindow && !this.sequencerWindow.isMinimized && window.openWindows[`sequencerWin-${this.id}`]) {
             if (typeof window.openTrackSequencerWindow === 'function') {
                window.openTrackSequencerWindow(this.id, true);
             }
        }
    }

    dispose() {
        console.log(`[Track ${this.id}] Disposing track: ${this.name}`);
        if (this.instrument && !this.instrument.disposed) {this.instrument.dispose(); console.log(`[Track ${this.id}] Synth instrument disposed.`);}
        if (this.audioBuffer && !this.audioBuffer.disposed) {this.audioBuffer.dispose(); console.log(`[Track ${this.id}] Sampler audioBuffer disposed.`);}
        
        this.drumSamplerPads.forEach((pad, i) => { 
            if (pad.audioBuffer && !pad.audioBuffer.disposed) { pad.audioBuffer.dispose(); console.log(`[Track ${this.id}] Drum pad ${i} audioBuffer disposed.`);}
        });
        this.drumPadPlayers.forEach((player, i) => { 
            if (player && !player.disposed) { player.dispose(); console.log(`[Track ${this.id}] Drum pad player ${i} disposed.`);}
        });
        
        if (this.instrumentSamplerSettings.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) {
            this.instrumentSamplerSettings.audioBuffer.dispose();
            console.log(`[Track ${this.id}] InstrumentSampler audioBuffer disposed.`);
        }
        if (this.toneSampler && !this.toneSampler.disposed) {this.toneSampler.dispose(); console.log(`[Track ${this.id}] ToneSampler disposed.`);}
        
        this.disposeSlicerMonoNodes();

        const nodesToDispose = [
            this.gainNode, this.reverbNode, this.delayNode,
            this.compressorNode, this.eq3Node, this.filterNode,
            this.distortionNode, this.chorusNode, this.saturationNode, this.trackMeter
        ];
        nodesToDispose.forEach(node => { if (node && !node.disposed) node.dispose(); });
        console.log(`[Track ${this.id}] Effect nodes disposed.`);

        if (this.sequence && !this.sequence.disposed) {
            this.sequence.stop(); this.sequence.clear(); this.sequence.dispose();
            console.log(`[Track ${this.id}] Sequence disposed.`);
        }

        if (this.inspectorWindow && typeof this.inspectorWindow.close === 'function') this.inspectorWindow.close();
        if (this.effectsRackWindow && typeof this.effectsRackWindow.close === 'function') this.effectsRackWindow.close();
        if (this.sequencerWindow && typeof this.sequencerWindow.close === 'function') this.sequencerWindow.close();
        
        console.log(`[Track ${this.id}] Finished disposing.`);
    }
}
