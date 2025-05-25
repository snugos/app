// js/Track.js - Track Class Module

import { STEPS_PER_BAR, defaultStepsPerBar, synthPitches, numSlices, numDrumSamplerPads } from './constants.js';
// showNotification is a UI concern, typically not called directly from a data model class.
// The UI handler that calls doubleSequence will be responsible for notifications.

export class Track {
    constructor(id, type, initialData = null) {
        this.id = initialData?.id || id;
        this.type = type;
        this.name = initialData?.name || `${type} Track ${this.id}`;
        this.isMuted = initialData?.isMuted || false;
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

        this.distortionNode.chain(this.filterNode, this.chorusNode, this.saturationNode, this.eq3Node, this.compressorNode, this.delayNode, this.reverbNode, this.gainNode, this.trackMeter, Tone.getDestination());

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
        this.setSequenceLength(this.sequenceLength, true); // true to skip undo, also ensures sequence is created
        console.log(`[Track ${this.id}] fullyInitializeAudioResources completed. Current gain: ${this.gainNode.gain.value}`);

        if (this.waveformCanvasCtx && this.type === 'Sampler' && this.audioBuffer && this.audioBuffer.loaded) {
            if (typeof window.drawWaveform === 'function') window.drawWaveform(this);
        }
         if (this.instrumentWaveformCanvasCtx && this.type === 'InstrumentSampler' && this.instrumentSamplerSettings.audioBuffer && this.instrumentSamplerSettings.audioBuffer.loaded) {
            if (typeof window.drawInstrumentWaveform === 'function') window.drawInstrumentWaveform(this);
        }
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
        } else if (this.type === 'Sampler') {
            if (this.audioBufferDataURL) {
                try {
                    if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose();
                    this.audioBuffer = await new Tone.Buffer().load(this.audioBufferDataURL);
                    if (!this.slicerIsPolyphonic && this.audioBuffer.loaded) {
                        this.setupSlicerMonoNodes();
                    }
                } catch (e) {
                    console.error(`[Track ${this.id}] Error loading Slicer audio buffer:`, e);
                    // No showNotification here, as this is a data class
                    this.audioBufferDataURL = null; this.audioBuffer = null;
                }
            } else {
                 if (this.audioBuffer && !this.audioBuffer.disposed) this.audioBuffer.dispose();
                 this.audioBuffer = null;
            }
        } else if (this.type === 'InstrumentSampler') {
            if (this.instrumentSamplerSettings.audioBufferDataURL) {
                try {
                    if (this.instrumentSamplerSettings.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose();
                    this.instrumentSamplerSettings.audioBuffer = await new Tone.Buffer().load(this.instrumentSamplerSettings.audioBufferDataURL);
                    this.setupToneSampler();
                } catch (e) {
                    console.error(`[Track ${this.id}] Error loading InstrumentSampler audio buffer:`, e);
                    this.instrumentSamplerSettings.audioBufferDataURL = null; this.instrumentSamplerSettings.audioBuffer = null;
                }
            } else {
                 if (this.instrumentSamplerSettings.audioBuffer && !this.instrumentSamplerSettings.audioBuffer.disposed) this.instrumentSamplerSettings.audioBuffer.dispose();
                 this.instrumentSamplerSettings.audioBuffer = null;
                this.setupToneSampler(); // Setup with no buffer initially
            }
        } else if (this.type === 'DrumSampler') {
            const padPromises = this.drumSamplerPads.map(async (padData, i) => {
                if (padData.audioBufferDataURL) {
                    try {
                        if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
                        padData.audioBuffer = await new Tone.Buffer().load(padData.audioBufferDataURL);
                        if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) this.drumPadPlayers[i].dispose();
                        this.drumPadPlayers[i] = new Tone.Player(padData.audioBuffer).connect(this.distortionNode);
                    } catch (e) {
                        console.error(`[Track ${this.id}] Error loading DrumSampler pad ${i} audio:`, e);
                        padData.audioBufferDataURL = null; padData.audioBuffer = null;
                    }
                } else {
                    if (padData.audioBuffer && !padData.audioBuffer.disposed) padData.audioBuffer.dispose();
                    padData.audioBuffer = null;
                    if (this.drumPadPlayers[i] && !this.drumPadPlayers[i].disposed) this.drumPadPlayers[i].dispose();
                    this.drumPadPlayers[i] = null;
                }
            });
            await Promise.all(padPromises);
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
        if (!this.isMuted) { this.gainNode.gain.rampTo(this.previousVolumeBeforeMute, 0.05); }
    }

    applyMuteState() {
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
    // Synth Param Setters
    setSynthOscillatorType(type) { if (this.type !== 'Synth' || !this.instrument) return; this.synthParams.oscillator.type = type; this.instrument.set({ oscillator: { type: type } }); }
    setSynthEnvelope(param, value) { if (this.type !== 'Synth' || !this.instrument) return; const val = parseFloat(value); if (isNaN(val)) return; this.synthParams.envelope[param] = val; this.instrument.set({ envelope: this.synthParams.envelope }); }
    // Sampler Slice Param Setters
    setSliceVolume(sliceIndex, volume) { if (this.type !== 'Sampler' || !this.slices[sliceIndex]) return; this.slices[sliceIndex].volume = parseFloat(volume) || 0; }
    setSlicePitchShift(sliceIndex, semitones) { if (this.type !== 'Sampler' || !this.slices[sliceIndex]) return; this.slices[sliceIndex].pitchShift = parseFloat(semitones) || 0; }
    setSliceLoop(sliceIndex, loop) { if (this.type !== 'Sampler' || !this.slices[sliceIndex]) return; this.slices[sliceIndex].loop = Boolean(loop); }
    setSliceReverse(sliceIndex, reverse) { if (this.type !== 'Sampler' || !this.slices[sliceIndex]) return; this.slices[sliceIndex].reverse = Boolean(reverse); }
    setSliceEnvelopeParam(sliceIndex, param, value) { if (this.type !== 'Sampler' || !this.slices[sliceIndex] || !this.slices[sliceIndex].envelope) return; this.slices[sliceIndex].envelope[param] = parseFloat(value) || 0; }
    // Drum Sampler Pad Param Setters
    setDrumSamplerPadVolume(padIndex, volume) { if (this.type !== 'DrumSampler' || !this.drumSamplerPads[padIndex]) return; this.drumSamplerPads[padIndex].volume = parseFloat(volume); }
    setDrumSamplerPadPitch(padIndex, pitch) { if (this.type !== 'DrumSampler' || !this.drumSamplerPads[padIndex]) return; this.drumSamplerPads[padIndex].pitchShift = parseFloat(pitch); }
    setDrumSamplerPadEnv(padIndex, param, value) { if (this.type !== 'DrumSampler' || !this.drumSamplerPads[padIndex]) return; this.drumSamplerPads[padIndex].envelope[param] = parseFloat(value); }
    // Instrument Sampler Param Setters
    setInstrumentSamplerRootNote(noteName) { if (this.type !== 'InstrumentSampler') return; this.instrumentSamplerSettings.rootNote = noteName; this.setupToneSampler(); }
    setInstrumentSamplerLoop(loop) { if (this.type !== 'InstrumentSampler') return; this.instrumentSamplerSettings.loop = Boolean(loop); if (this.toneSampler) this.toneSampler.loop = this.instrumentSamplerSettings.loop; }
    setInstrumentSamplerLoopStart(time) { if (this.type !== 'InstrumentSampler' || !this.instrumentSamplerSettings.audioBuffer) return; this.instrumentSamplerSettings.loopStart = Math.min(this.instrumentSamplerSettings.audioBuffer.duration, Math.max(0, parseFloat(time))); if (this.toneSampler) this.toneSampler.loopStart = this.instrumentSamplerSettings.loopStart; }
    setInstrumentSamplerLoopEnd(time) { if (this.type !== 'InstrumentSampler' || !this.instrumentSamplerSettings.audioBuffer) return; this.instrumentSamplerSettings.loopEnd = Math.min(this.instrumentSamplerSettings.audioBuffer.duration, Math.max(this.instrumentSamplerSettings.loopStart, parseFloat(time))); if (this.toneSampler) this.toneSampler.loopEnd = this.instrumentSamplerSettings.loopEnd; }
    setInstrumentSamplerEnv(param, value) { if (this.type !== 'InstrumentSampler') return; this.instrumentSamplerSettings.envelope[param] = parseFloat(value); if (this.toneSampler) this.toneSampler.set({ attack: this.instrumentSamplerSettings.envelope.attack, release: this.instrumentSamplerSettings.envelope.release }); }


    async doubleSequence() {
        let currentNumRows = 0;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') currentNumRows = synthPitches.length;
        else if (this.type === 'Sampler') currentNumRows = this.slices.length > 0 ? this.slices.length : numSlices;
        else if (this.type === 'DrumSampler') currentNumRows = numDrumSamplerPads;
        else currentNumRows = (this.sequenceData && this.sequenceData.length > 0) ? this.sequenceData.length : 0;


        if (currentNumRows === 0 && (!this.sequenceData || this.sequenceData.length === 0) ) {
            console.warn(`[Track ${this.id}] Sequence data is uninitialized or truly empty, cannot double effectively.`);
            return { success: false, message: "Sequence has no rows/data to double." };
        }

        const oldLength = this.sequenceLength;
        const newLength = oldLength * 2;

        const MAX_SEQUENCE_STEPS = 256 * STEPS_PER_BAR; // Example: 256 bars
        if (newLength > MAX_SEQUENCE_STEPS) {
            return {
                success: false,
                message: `Cannot double: New length (${newLength / STEPS_PER_BAR} bars) would exceed maximum (${MAX_SEQUENCE_STEPS / STEPS_PER_BAR} bars).`
            };
        }

        console.log(`[Track ${this.id}] Doubling sequence from ${oldLength} to ${newLength} steps.`);

        const newGridData = Array(currentNumRows).fill(null).map((_, rIndex) => {
            const oldRow = (this.sequenceData && this.sequenceData[rIndex]) ? this.sequenceData[rIndex] : Array(oldLength).fill(null);
            const newRow = Array(newLength).fill(null);
            for (let c = 0; c < oldLength; c++) {
                newRow[c] = oldRow[c] ? JSON.parse(JSON.stringify(oldRow[c])) : null;
                newRow[c + oldLength] = oldRow[c] ? JSON.parse(JSON.stringify(oldRow[c])) : null;
            }
            return newRow;
        });

        this.sequenceData = newGridData;
        this.setSequenceLength(newLength, true); // true to skip undo capture here

        if (this.inspectorWindow && this.inspectorWindow.element) {
            const seqLenBarsInput = this.inspectorWindow.element.querySelector(`#sequenceLengthBars-${this.id}`);
            const seqLenDisplaySpan = this.inspectorWindow.element.querySelector(`#sequenceLengthDisplay-${this.id}`);
            if (seqLenBarsInput && seqLenDisplaySpan) {
                const numBars = newLength / STEPS_PER_BAR;
                seqLenBarsInput.value = numBars;
                seqLenDisplaySpan.textContent = `${numBars} bars (${newLength} steps)`;
            }
        }

        if (typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Double sequence for "${this.name}" to ${newLength / STEPS_PER_BAR} bars`);
        }
        return {
            success: true,
            message: `Sequence for "${this.name}" doubled to ${newLength / STEPS_PER_BAR} bars.`,
            newLength: newLength
        };
    }

    setSequenceLength(newLengthInSteps, skipUndoCapture = false) {
        const oldActualLength = this.sequenceLength; // Store the actual previous length
        newLengthInSteps = Math.max(STEPS_PER_BAR, parseInt(newLengthInSteps) || defaultStepsPerBar);
        newLengthInSteps = Math.ceil(newLengthInSteps / STEPS_PER_BAR) * STEPS_PER_BAR;

        // Only capture undo if the length actually changes and skipUndoCapture is false
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
            const currentRow = currentSequenceData[rIndex] || []; // Use existing row data or an empty array
            const newRow = Array(this.sequenceLength).fill(null); // Initialize new row with new length
            // Copy data from current row up to the minimum of its length and the new sequence length
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

            if (this.isMuted || isSoloedOut) {
                return;
            }

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
                            if (!this.slicerMonoPlayer || this.slicerMonoPlayer.disposed) {
                                this.setupSlicerMonoNodes(); // Ensure mono player is ready
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

        if (this.sequencerWindow && !this.sequencerWindow.isMinimized && window.openWindows[`sequencerWin-${this.id}`]) {
             if (typeof window.openTrackSequencerWindow === 'function') {
                window.openTrackSequencerWindow(this.id, true); // Force redraw
             }
        }
    }

    dispose() {
        console.log(`[Track ${this.id}] Disposing track: ${this.name}`);
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
            this.distortionNode, this.chorusNode, this.saturationNode, this.trackMeter
        ];
        nodesToDispose.forEach(node => { if (node && !node.disposed) node.dispose(); });

        if (this.sequence && !this.sequence.disposed) {
            this.sequence.stop(); this.sequence.clear(); this.sequence.dispose();
        }

        if (this.inspectorWindow && typeof this.inspectorWindow.close === 'function' && window.openWindows[this.inspectorWindow.id]) {
             // this.inspectorWindow.close(); // Closing here can cause issues if track is part of a batch dispose (like in reconstructDAW)
        }
        if (this.effectsRackWindow && typeof this.effectsRackWindow.close === 'function' && window.openWindows[this.effectsRackWindow.id]) {
            // this.effectsRackWindow.close();
        }
        if (this.sequencerWindow && typeof this.sequencerWindow.close === 'function' && window.openWindows[this.sequencerWindow.id]) {
            // this.sequencerWindow.close();
        }
        // Nullify references to windows; their actual closing is handled by SnugWindow's close if initiated from there,
        // or by reconstructDAW's window clearing loop.
        this.inspectorWindow = null;
        this.effectsRackWindow = null;
        this.sequencerWindow = null;

        console.log(`[Track ${this.id}] Finished disposing.`);
    }
}
