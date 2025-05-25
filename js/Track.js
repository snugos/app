// js/Track.js - Track Class Module

import { STEPS_PER_BAR, defaultStepsPerBar, synthPitches, numSlices, numDrumSamplerPads } from './constants.js';
import { showNotification } from './utils.js';

export class Track {
    constructor(id, type, initialData = null) {
        this.id = initialData?.id || id; // Use loaded ID if available
        this.type = type;
        this.name = initialData?.name || `${type} Track ${this.id}`;
        this.isMuted = initialData?.isMuted || false;
        this.isSoloed = false; // Solo state managed globally by state.js
        this.previousVolumeBeforeMute = initialData?.volume ?? 0.7;

        console.log(`Track Constructor: Creating track ${this.id} (${this.name}), type: ${this.type}`);
        if(initialData) console.log(`Track Constructor: Initial data for track ${this.id}:`, JSON.parse(JSON.stringify(initialData)));


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
            sampleUrl: null, // Not used for saving/loading via DataURL
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
                if (this.drumSamplerPads[index] && padData.audioBufferDataURL) {
                    this.drumSamplerPads[index].audioBufferDataURL = padData.audioBufferDataURL;
                    this.drumSamplerPads[index].originalFileName = padData.originalFileName;
                    // Volume, pitch, envelope are already part of the map default or loaded initialData
                    this.drumSamplerPads[index].volume = padData.volume ?? this.drumSamplerPads[index].volume;
                    this.drumSamplerPads[index].pitchShift = padData.pitchShift ?? this.drumSamplerPads[index].pitchShift;
                    this.drumSamplerPads[index].envelope = padData.envelope ?? this.drumSamplerPads[index].envelope;
                }
            });
        }
        this.selectedDrumPadForEdit = initialData?.selectedDrumPadForEdit || 0;
        this.drumPadPlayers = Array(numDrumSamplerPads).fill(null);

        this.effects = {
            reverb: initialData?.effects?.reverb || { wet: 0, decay: 2.5, preDelay: 0.02 },
            delay: initialData?.effects?.delay || { wet: 0, time: 0.5, feedback: 0.3 },
            filter: initialData?.effects?.filter || { frequency: 20000, type: "lowpass", Q: 1, rolloff: -12 },
            compressor: initialData?.effects?.compressor || { threshold: -24, ratio: 12, attack: 0.003, release: 0.25, knee: 30 },
            eq3: initialData?.effects?.eq3 || { low: 0, mid: 0, high: 0 },
            distortion: initialData?.effects?.distortion || { amount: 0 },
            chorus: initialData?.effects?.chorus || { wet: 0, frequency: 1.5, delayTime: 3.5, depth: 0.7 },
            saturation: initialData?.effects?.saturation || { wet: 0, amount: 2 }
        };

        this.distortionNode = new Tone.Distortion(this.effects.distortion.amount);
        this.filterNode = new Tone.Filter({
            frequency: this.effects.filter.frequency, type: this.effects.filter.type,
            rolloff: this.effects.filter.rolloff, Q: this.effects.filter.Q
        });
        this.chorusNode = new Tone.Chorus(this.effects.chorus.frequency, this.effects.chorus.delayTime, this.effects.chorus.depth);
        this.chorusNode.wet.value = this.effects.chorus.wet;
        this.saturationNode = new Tone.Chebyshev(Math.max(1, Math.floor(this.effects.saturation.amount) * 2 + 1)); // Ensure order is at least 1
        this.saturationNode.wet.value = this.effects.saturation.wet;
        this.eq3Node = new Tone.EQ3(this.effects.eq3);
        this.compressorNode = new Tone.Compressor(this.effects.compressor);
        this.delayNode = new Tone.FeedbackDelay(this.effects.delay.time, this.effects.delay.feedback);
        this.delayNode.wet.value = this.effects.delay.wet;
        this.reverbNode = new Tone.Reverb(this.effects.reverb);
        this.gainNode = new Tone.Gain(this.isMuted ? 0 : (initialData?.volume ?? 0.7));
        this.trackMeter = new Tone.Meter({ smoothing: 0.8 });

        this.distortionNode.chain(this.filterNode, this.chorusNode, this.saturationNode, this.eq3Node, this.compressorNode, this.delayNode, this.reverbNode, this.gainNode, this.trackMeter, Tone.getDestination());

        this.instrument = null;
        this.sequenceLength = initialData?.sequenceLength || defaultStepsPerBar;
        
        let numRowsForGrid;
        if (type === 'Synth' || type === 'InstrumentSampler') numRowsForGrid = synthPitches.length;
        else if (type === 'Sampler') numRowsForGrid = this.slices.length > 0 ? this.slices.length : numSlices;
        else if (type === 'DrumSampler') numRowsForGrid = numDrumSamplerPads;
        else numRowsForGrid = 0;
        
        // Ensure sequenceData matches the number of rows and sequenceLength
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
        this.inspectorControls = {}; // Will be populated by UI functions

        // IMPORTANT: initializeInstrumentFromInitialData is async, so the constructor itself cannot be async.
        // We call it, but be mindful that audio buffers might not be ready immediately.
        this.initializeInstrumentFromInitialData(initialData)
            .then(() => {
                console.log(`Track ${this.id} (${this.name}) instruments initialized after async operations.`);
                // Potentially trigger UI updates that depend on loaded buffers here, if necessary
                // For example, if a waveform needs to be drawn immediately after buffer load.
                if (typeof window.drawWaveform === 'function' && (this.type === 'Sampler' || this.type === 'InstrumentSampler')) {
                    window.drawWaveform(this);
                }
            })
            .catch(err => console.error(`Error in async instrument initialization for track ${this.id}:`, err));

        this.setSequenceLength(this.sequenceLength, true); // true to skipUndoCapture
    }

    async initializeInstrumentFromInitialData(initialData) {
        console.log(`Track ${this.id}: Initializing instrument from data. Type: ${this.type}`);
        if (this.type === 'Synth') {
            this.instrument = new Tone.PolySynth(Tone.Synth, {
                oscillator: this.synthParams.oscillator, envelope: this.synthParams.envelope
            }).connect(this.distortionNode);
            console.log(`Track ${this.id}: Synth instrument created.`);
        } else if (this.type === 'Sampler') {
            if (this.audioBufferDataURL) {
                console.log(`Track ${this.id}: Sampler has audioBufferDataURL, attempting to load.`);
                try {
                    this.audioBuffer = await new Tone.Buffer().load(this.audioBufferDataURL);
                    console.log(`Track ${this.id}: Sampler audio buffer loaded successfully. Duration: ${this.audioBuffer.duration}`);
                    if (!this.slicerIsPolyphonic && this.audioBuffer.loaded) {
                        this.setupSlicerMonoNodes();
                    }
                } catch (e) {
                    console.error(`Error loading Slicer audio buffer from DataURL for track ${this.id}:`, e);
                    showNotification(`Error loading sample for Slicer ${this.name} from project.`, 3000);
                    this.audioBufferDataURL = null;
                }
            } else {
                console.log(`Track ${this.id}: Sampler has no audioBufferDataURL.`);
            }
        } else if (this.type === 'InstrumentSampler') {
            if (this.instrumentSamplerSettings.audioBufferDataURL) {
                console.log(`Track ${this.id}: InstrumentSampler has audioBufferDataURL, attempting to load.`);
                try {
                    this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(this.instrumentSamplerSettings.audioBufferDataURL);
                    console.log(`Track ${this.id}: InstrumentSampler audio buffer loaded. Duration: ${this.instrumentSamplerSettings.audioBuffer.duration}`);
                    this.setupToneSampler();
                } catch (e) {
                    console.error(`Error loading InstrumentSampler audio buffer from DataURL for track ${this.id}:`, e);
                    showNotification(`Error loading sample for Instrument Sampler ${this.name} from project.`, 3000);
                    this.instrumentSamplerSettings.audioBufferDataURL = null;
                }
            } else {
                console.log(`Track ${this.id}: InstrumentSampler has no audioBufferDataURL, setting up empty sampler.`);
                this.setupToneSampler(); // Setup sampler even if no initial buffer
            }
        } else if (this.type === 'DrumSampler') {
            console.log(`Track ${this.id}: Initializing DrumSampler pads.`);
            for (let i = 0; i < this.drumSamplerPads.length; i++) {
                const padData = this.drumSamplerPads[i];
                if (padData.audioBufferDataURL) {
                    console.log(`Track ${this.id}: Drum pad ${i} has audioBufferDataURL, attempting to load.`);
                    try {
                        padData.audioBuffer = await new Tone.Buffer().load(padData.audioBufferDataURL);
                        console.log(`Track ${this.id}: Drum pad ${i} audio buffer loaded. Duration: ${padData.audioBuffer.duration}`);
                        if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) this.drumPadPlayers[i].dispose();
                        this.drumPadPlayers[i] = new Tone.Player(padData.audioBuffer).connect(this.distortionNode);
                    } catch (e) {
                        console.error(`Error loading DrumSampler pad ${i} audio buffer for track ${this.id}:`, e);
                        showNotification(`Error loading sample for Drum Sampler ${this.name}, Pad ${i+1} from project.`, 3000);
                        padData.audioBufferDataURL = null; // Clear if loading failed
                    }
                } else {
                     console.log(`Track ${this.id}: Drum pad ${i} has no audioBufferDataURL.`);
                }
            }
        }
    }

    // ... (rest of the Track class methods: setupSlicerMonoNodes, disposeSlicerMonoNodes, setupToneSampler, setVolume, applyMuteState, applySoloState, effect setters, sequence setters, dispose)
    // Ensure these methods correctly reference `this` and Tone.js objects.
    // The setSequenceLength method needs to be robust if called during reconstruction.
    // ... (The rest of the Track class methods from your uploaded file)
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
        } else {
            console.log(`Track ${this.id} InstrumentSampler: No buffer loaded for root note ${this.instrumentSamplerSettings.rootNote} during setupToneSampler.`);
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
        if (!this.toneSampler.loaded && Object.keys(urls).length > 0) {
             console.warn(`InstrumentSampler for track ${this.id} was set up with URLs but is not immediately loaded. This might be an issue if used synchronously.`);
        } else if (Object.keys(urls).length === 0) {
            console.log(`InstrumentSampler for track ${this.id} set up without any samples initially.`);
        }
    }

    setVolume(volume, fromInteraction = false) {
        this.previousVolumeBeforeMute = parseFloat(volume);
        if (!this.isMuted) { this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05); }
    }

    applyMuteState() {
        const currentSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : window.soloedTrackId;
        if (this.isMuted) {
            this.gainNode.gain.rampTo(0, 0.01);
        } else {
            if (currentSoloId && currentSoloId !== this.id) {
                this.gainNode.gain.rampTo(0, 0.01);
            } else {
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
            }
        }
    }

    applySoloState() {
        const currentSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : window.soloedTrackId;
        if (this.isMuted) return;
        if (currentSoloId) {
            if (this.id === currentSoloId) {
                this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
            } else {
                this.gainNode.gain.rampTo(0, 0.01);
            }
        } else {
            this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05);
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
        newLengthInSteps = Math.max(STEPS_PER_BAR, parseInt(newLengthInSteps) || defaultStepsPerBar);
        newLengthInSteps = Math.ceil(newLengthInSteps / STEPS_PER_BAR) * STEPS_PER_BAR;
        this.sequenceLength = newLengthInSteps;

        let numRows;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRows = synthPitches.length;
        else if (this.type === 'Sampler') numRows = this.slices.length > 0 ? this.slices.length : numSlices;
        else if (this.type === 'DrumSampler') numRows = numDrumSamplerPads;
        else numRows = 0;

        const newGridData = Array(numRows).fill(null).map(() => Array(this.sequenceLength).fill(null));
        if (Array.isArray(this.sequenceData) && Array.isArray(this.sequenceData[0])) {
            for (let r = 0; r < Math.min(this.sequenceData.length, numRows); r++) {
                for (let c = 0; c < Math.min(this.sequenceData[r]?.length || 0, this.sequenceLength); c++) {
                    newGridData[r][c] = this.sequenceData[r][c];
                }
            }
        }
        this.sequenceData = newGridData;

        if (this.sequence) this.sequence.dispose();
        
        this.sequence = new Tone.Sequence((time, col) => {
            const currentSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : window.soloedTrackId;
            if (this.isMuted || (currentSoloId && currentSoloId !== this.id)) return;

            if (this.type === 'Synth') {
                synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step && step.active && this.instrument) {
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
                        const midiNote = Tone.Frequency(pitchName).toMidi();
                        const shiftedNote = Tone.Frequency(midiNote, "midi").toNote();
                        this.toneSampler.triggerAttackRelease(shiftedNote, "8n", time, step.velocity);
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

        if (this.sequencerWindow && !this.sequencerWindow.isMinimized && window.openWindows[`sequencerWin-${this.id}`]) {
             if (typeof window.openTrackSequencerWindow === 'function') {
                window.openTrackSequencerWindow(this.id, true);
             }
        }
    }

    dispose() {
        console.log(`Disposing Track ${this.id} (${this.name})`);
        if (this.instrument && !this.instrument.disposed) this.instrument.dispose();
        if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose();
        this.drumSamplerPads.forEach(pad => { if (pad.audioBuffer?.dispose && !pad.audioBuffer.disposed) pad.audioBuffer.dispose(); });
        this.drumPadPlayers.forEach(player => { if (player?.dispose && !player.disposed) player.dispose(); });
        if (this.instrumentSamplerSettings.audioBuffer?.dispose && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose();
        if (this.toneSampler?.dispose && !this.toneSampler.disposed) this.toneSampler.dispose();
        
        this.disposeSlicerMonoNodes();

        const nodesToDispose = [
            this.gainNode, this.reverbNode, this.delayNode,
            this.compressorNode, this.eq3Node, this.filterNode,
            this.distortionNode, this.chorusNode, this.saturationNode, this.trackMeter
        ];
        nodesToDispose.forEach(node => { if (node && !node.disposed) node.dispose(); });

        if (this.sequence && !this.sequence.disposed) {
            this.sequence.stop(); this.sequence.clear(); this.sequence.dispose();
        }

        if (this.inspectorWindow?.close) this.inspectorWindow.close(); // Check if close method exists
        if (this.effectsRackWindow?.close) this.effectsRackWindow.close();
        if (this.sequencerWindow?.close) this.sequencerWindow.close();
        
        console.log(`Track ${this.id} (${this.name}) disposed.`);
    }
}
