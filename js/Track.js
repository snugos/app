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

        this.drumSamplerPads = initialData?.drumSamplerPads || Array(Constants.numDrumSamplerPads).fill(null).map(() => ({ // Use Constant
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
        this.drumPadPlayers = Array(Constants.numDrumSamplerPads).fill(null); // Use Constant

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
        if (type === 'Synth' || type === 'InstrumentSampler') numRowsForGrid = Constants.synthPitches.length; // Use Constant
        else if (type === 'Sampler') numRowsForGrid = this.slices.length > 0 ? this.slices.length : Constants.numSlices; // Use Constant
        else if (type === 'DrumSampler') numRowsForGrid = Constants.numDrumSamplerPads; // Use Constant
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

    getDefaultSynthParams(engineType) { /* ... (as previously provided) ... */ }

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

    async fullyInitializeAudioResources() { /* ... (as previously provided) ... */ }
    async initializeInstrument() { /* ... (as previously provided) ... */ }
    setupSlicerMonoNodes() { /* ... (as previously provided) ... */ }
    disposeSlicerMonoNodes() { /* ... (as previously provided) ... */ }
    setupToneSampler() { /* ... (as previously provided) ... */ }
    setVolume(volume, fromInteraction = false) { /* ... (as previously provided) ... */ }

    applyMuteState() {
        console.log(`[Track ${this.id}] applyMuteState called. isMuted: ${this.isMuted}`);
        if (!this.gainNode) { console.warn(`[Track ${this.id}] applyMuteState: gainNode is null.`); return; }
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
        console.log(`[Track ${this.id}] applySoloState called. isSoloed: ${this.isSoloed}, globalSoloId: ${typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : 'N/A'}`);
        if (!this.gainNode) { console.warn(`[Track ${this.id}] applySoloState: gainNode is null.`); return; }
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

    // Effect Setters (as previously provided)
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
    setAutoWahFollower(value) { /* ... (as previously provided) ... */ }
    setSynthParam(paramPath, value) { /* ... (as previously provided) ... */ }
    setSliceVolume(sliceIndex, volume) { /* ... (as previously provided) ... */ }
    setSlicePitchShift(sliceIndex, semitones) { /* ... (as previously provided) ... */ }
    setSliceLoop(sliceIndex, loop) { /* ... (as previously provided) ... */ }
    setSliceReverse(sliceIndex, reverse) { /* ... (as previously provided) ... */ }
    setSliceEnvelopeParam(sliceIndex, param, value) { /* ... (as previously provided) ... */ }
    setDrumSamplerPadVolume(padIndex, volume) { /* ... (as previously provided) ... */ }
    setDrumSamplerPadPitch(padIndex, pitch) { /* ... (as previously provided) ... */ }
    setDrumSamplerPadEnv(padIndex, param, value) { /* ... (as previously provided) ... */ }
    setInstrumentSamplerRootNote(noteName) { /* ... (as previously provided, including validation) ... */ }
    setInstrumentSamplerLoop(loop) { /* ... (as previously provided) ... */ }
    setInstrumentSamplerLoopStart(time) { /* ... (as previously provided) ... */ }
    setInstrumentSamplerLoopEnd(time) { /* ... (as previously provided) ... */ }
    setInstrumentSamplerEnv(param, value) { /* ... (as previously provided) ... */ }

    async doubleSequence() { /* ... (as previously provided) ... */ }

    setSequenceLength(newLengthInSteps, skipUndoCapture = false) {
        console.log(`[Track ${this.id}] setSequenceLength called. New length: ${newLengthInSteps} steps.`); // DEBUG
        const oldActualLength = this.sequenceLength;
        newLengthInSteps = Math.max(Constants.STEPS_PER_BAR, parseInt(newLengthInSteps) || Constants.defaultStepsPerBar);
        newLengthInSteps = Math.ceil(newLengthInSteps / Constants.STEPS_PER_BAR) * Constants.STEPS_PER_BAR;

        if (!skipUndoCapture && oldActualLength !== newLengthInSteps && typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Set Seq Length for ${this.name} to ${newLengthInSteps / Constants.STEPS_PER_BAR} bars`);
        }
        this.sequenceLength = newLengthInSteps;

        let numRows;
        if (this.type === 'Synth' || this.type === 'InstrumentSampler') numRows = Constants.synthPitches.length;
        else if (this.type === 'Sampler') numRows = this.slices.length > 0 ? this.slices.length : Constants.numSlices;
        else if (this.type === 'DrumSampler') numRows = Constants.numDrumSamplerPads;
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
            console.log(`[Track ${this.id}] Disposing old Tone.Sequence.`); // DEBUG
            this.sequence.stop();
            this.sequence.clear();
            this.sequence.dispose();
            this.sequence = null;
        }

        console.log(`[Track ${this.id}] Creating new Tone.Sequence with length ${this.sequenceLength}.`); // DEBUG
        this.sequence = new Tone.Sequence((time, col) => {
            // ADDED MORE DETAILED LOGGING INSIDE CALLBACK
            console.log(`[Track ${this.id} Sequencer Tick] col: ${col}, time: ${time.toFixed(4)}, transport state: ${Tone.Transport.state}`);

            const currentGlobalSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
            const isSoloedOut = currentGlobalSoloId && currentGlobalSoloId !== this.id;

            if (this.sequencerWindow && !this.sequencerWindow.isMinimized) {
                const grid = this.sequencerWindow.element?.querySelector('.sequencer-grid');
                if (grid && typeof window.highlightPlayingStep === 'function') {
                    // console.log(`[Track ${this.id} Sequencer Tick] Highlighting step: col ${col}`); // Can be too verbose
                    window.highlightPlayingStep(col, this.type, grid);
                }
            }

            if (!this.gainNode || this.isMuted || isSoloedOut) {
                // console.log(`[Track ${this.id} Sequencer Tick] Note skipped due to mute/solo/no gainNode. Col: ${col}`); // Can be verbose
                return;
            }

            if (this.type === 'Synth') {
                Constants.synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step && step.active && this.instrument && typeof this.instrument.triggerAttackRelease === 'function') {
                        console.log(`[Track ${this.id} Sequencer] Playing Synth note: ${pitchName} at time ${time.toFixed(4)}, col ${col}, velocity: ${step.velocity}`);
                        this.instrument.triggerAttackRelease(pitchName, "8n", time, step.velocity);
                    }
                });
            } else if (this.type === 'Sampler') { // Slicer
                this.slices.forEach((sliceData, sliceIndex) => {
                    const step = this.sequenceData[sliceIndex]?.[col];
                    if (step?.active && sliceData?.duration > 0 && this.audioBuffer?.loaded) {
                        console.log(`[Track ${this.id} Sequencer] Playing Slicer slice: ${sliceIndex + 1} at time ${time.toFixed(4)}, col ${col}`);
                        const totalPitchShift = sliceData.pitchShift;
                        const playbackRate = Math.pow(2, totalPitchShift / 12);
                        let playDuration = sliceData.duration / playbackRate;
                        if (sliceData.loop) playDuration = Tone.Time("8n").toSeconds();

                        if (this.slicerIsPolyphonic) { /* ... as before ... */ }
                        else { /* ... as before ... */ }
                    }
                });
            }
            else if (this.type === 'DrumSampler') { // Pad Sampler
                Constants.drumSamplerPads.forEach((_, padIndex) => { // Iterate up to numDrumSamplerPads
                    const step = this.sequenceData[padIndex]?.[col];
                    const padData = this.drumSamplerPads[padIndex]; // Get padData using padIndex
                    if (step?.active && padData && this.drumPadPlayers[padIndex] && this.drumPadPlayers[padIndex].loaded) {
                        console.log(`[Track ${this.id} Sequencer] Playing Pad ${padIndex + 1} at time ${time.toFixed(4)}, col ${col}`);
                        const player = this.drumPadPlayers[padIndex];
                        player.volume.value = Tone.gainToDb(padData.volume * step.velocity);
                        player.playbackRate = Math.pow(2, (padData.pitchShift) / 12);
                        player.start(time);
                    }
                });
            }
            else if (this.type === 'InstrumentSampler') {
                Constants.synthPitches.forEach((pitchName, rowIndex) => {
                    const step = this.sequenceData[rowIndex]?.[col];
                    if (step?.active && this.toneSampler && this.toneSampler.loaded) {
                        console.log(`[Track ${this.id} Sequencer] Playing InstrumentSampler note: ${pitchName} at time ${time.toFixed(4)}, col ${col}`);
                        this.toneSampler.triggerAttackRelease(Tone.Frequency(pitchName).toNote(), "8n", time, step.velocity);
                    }
                });
            }
        }, Array.from(Array(this.sequenceLength).keys()), "16n").start(0);
        console.log(`[Track ${this.id}] Tone.Sequence created and started. State: ${this.sequence?.state}`); // DEBUG

        if (this.sequencerWindow && !this.sequencerWindow.isMinimized && window.openWindows[`sequencerWin-${this.id}`]) {
             if (typeof window.openTrackSequencerWindow === 'function') {
                window.openTrackSequencerWindow(this.id, true); // forceRedraw
             }
        }
    }
    dispose() { /* ... (as previously provided) ... */ }
}
