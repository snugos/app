// js/ui.js - UI Creation and Management Module

import { SnugWindow } from './SnugWindow.js';
import { showNotification, createDropZoneHTML, setupDropZoneListeners } from './utils.js';
import * as Constants from './constants.js';
// Import functions that might be called from UI event handlers, or pass them as callbacks
// For now, some direct calls to window.captureStateForUndo or window.playSlicePreview might remain,
// to be refactored later.
// import { captureStateForUndo } from './state.js';
// import { playSlicePreview, playDrumSamplerPadPreview, loadSampleFile, loadDrumSamplerPadFile, autoSliceSample } from './audio.js';


export function createKnob(options) {
    const container = document.createElement('div');
    container.className = 'knob-container';
    const labelEl = document.createElement('div');
    labelEl.className = 'knob-label';
    labelEl.textContent = options.label || '';
    labelEl.title = options.label || '';
    container.appendChild(labelEl);
    const knobEl = document.createElement('div');
    knobEl.className = 'knob';
    const handleEl = document.createElement('div');
    handleEl.className = 'knob-handle';
    knobEl.appendChild(handleEl);
    container.appendChild(knobEl);
    const valueEl = document.createElement('div');
    valueEl.className = 'knob-value';
    container.appendChild(valueEl);

    let currentValue = options.initialValue || 0;
    const min = options.min === undefined ? 0 : options.min;
    const max = options.max === undefined ? 100 : options.max;
    const step = options.step || 1;
    const range = max - min;
    const maxDegrees = options.maxDegrees || 270;
    const BASE_PIXELS_PER_FULL_RANGE_MOUSE = 300;
    const BASE_PIXELS_PER_FULL_RANGE_TOUCH = 450;
    let initialValueBeforeInteraction = currentValue;

    function updateKnobVisual() {
        const percentage = range === 0 ? 0 : (currentValue - min) / range;
        const rotation = (percentage * maxDegrees) - (maxDegrees / 2);
        handleEl.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        valueEl.textContent = typeof currentValue === 'number' ? currentValue.toFixed(options.decimals !== undefined ? options.decimals : (step < 1 ? 2 : 0)) : currentValue;
        if (options.displaySuffix) valueEl.textContent += options.displaySuffix;
    }

    function setValue(newValue, triggerCallback = true, fromInteraction = false) {
        const numValue = parseFloat(newValue);
        if (isNaN(numValue)) return;
        let boundedValue = Math.min(max, Math.max(min, numValue));
        if (step !== 0) {
            boundedValue = Math.round(boundedValue / step) * step;
        }
        const oldValue = currentValue;
        currentValue = Math.min(max, Math.max(min, boundedValue));
        updateKnobVisual();
        if (triggerCallback && options.onValueChange) {
            options.onValueChange(currentValue, oldValue, fromInteraction);
        }
    }

    function handleInteraction(e, isTouch = false) {
        e.preventDefault();
        initialValueBeforeInteraction = currentValue;
        const startY = isTouch ? e.touches[0].clientY : e.clientY;
        const startValue = currentValue;
        const pixelsForFullRange = isTouch ? BASE_PIXELS_PER_FULL_RANGE_TOUCH : BASE_PIXELS_PER_FULL_RANGE_MOUSE;
        const currentSensitivity = options.sensitivity === undefined ? 1 : options.sensitivity;

        function onMove(moveEvent) {
            const currentY = isTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
            const deltaY = startY - currentY;
            let valueChange = (deltaY / pixelsForFullRange) * range * currentSensitivity;
            let newValue = startValue + valueChange;
            setValue(newValue, true, true);
        }

        function onEnd() {
            document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove);
            document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
            if (currentValue !== initialValueBeforeInteraction && typeof window.captureStateForUndo === 'function') {
                let description = `Change ${options.label || 'knob'} to ${valueEl.textContent}`;
                if (options.trackRef && options.trackRef.name) {
                    description = `Change ${options.label || 'knob'} for ${options.trackRef.name} to ${valueEl.textContent}`;
                }
                window.captureStateForUndo(description); // Assumes captureStateForUndo is globally available
            }
        }
        document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove, { passive: !isTouch });
        document.addEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
    }

    knobEl.addEventListener('mousedown', (e) => handleInteraction(e, false));
    knobEl.addEventListener('touchstart', (e) => handleInteraction(e, true), { passive: false });
    setValue(currentValue, false);
    return { element: container, setValue, getValue: () => currentValue, type: 'knob', refreshVisuals: updateKnobVisual };
}


// --- Track Inspector DOM Builder Functions ---
export function buildTrackInspectorContentDOM(track) {
    const contentDiv = document.createElement('div');
    contentDiv.className = 'track-inspector-content p-2 space-y-1';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'flex items-center justify-between mb-1';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = `trackNameDisplay-${track.id}`;
    nameInput.value = track.name;
    nameInput.className = 'text-md font-bold bg-transparent border-b w-full focus:ring-0 focus:border-blue-500';
    headerDiv.appendChild(nameInput);
    const meterContainer = document.createElement('div');
    meterContainer.id = `trackMeterContainer-${track.id}`;
    meterContainer.className = 'track-meter-container meter-bar-container w-1/3 ml-2 h-4';
    const meterBar = document.createElement('div');
    meterBar.id = `trackMeterBar-${track.id}`;
    meterBar.className = 'meter-bar';
    meterContainer.appendChild(meterBar);
    headerDiv.appendChild(meterContainer);
    contentDiv.appendChild(headerDiv);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'flex items-center gap-1 mb-1';
    const muteBtn = document.createElement('button');
    muteBtn.id = `muteBtn-${track.id}`;
    muteBtn.className = `mute-button text-xs p-1 ${track.isMuted ? 'muted' : ''}`;
    muteBtn.textContent = 'M';
    actionsDiv.appendChild(muteBtn);
    const soloBtn = document.createElement('button');
    soloBtn.id = `soloBtn-${track.id}`;
    soloBtn.className = `solo-button text-xs p-1 ${track.isSoloed ? 'soloed' : ''}`; // isSoloed needs to be checked against global soloedTrackId
    soloBtn.textContent = 'S';
    actionsDiv.appendChild(soloBtn);
    const armBtn = document.createElement('button');
    armBtn.id = `armInputBtn-${track.id}`;
    armBtn.className = `arm-input-button text-xs p-1 ${window.armedTrackId === track.id ? 'armed' : ''}`; // Check global armedTrackId
    armBtn.textContent = 'Arm';
    actionsDiv.appendChild(armBtn);
    const removeBtn = document.createElement('button');
    removeBtn.id = `removeTrackBtn-${track.id}`;
    removeBtn.className = 'bg-red-500 hover:bg-red-600 text-white text-xs py-0.5 px-1.5 rounded ml-auto';
    removeBtn.textContent = 'Del';
    actionsDiv.appendChild(removeBtn);
    contentDiv.appendChild(actionsDiv);

    const trackControlsPanel = document.createElement('div');
    trackControlsPanel.className = 'panel';
    const panelTitle = document.createElement('h4');
    panelTitle.className = 'text-sm font-semibold mb-1';
    panelTitle.textContent = 'Track Controls';
    trackControlsPanel.appendChild(panelTitle);
    const controlGroup = document.createElement('div');
    controlGroup.className = 'control-group';
    const volumeContainer = document.createElement('div');
    volumeContainer.id = `volumeSliderContainer-${track.id}`;
    controlGroup.appendChild(volumeContainer);
    const seqLengthContainer = document.createElement('div');
    seqLengthContainer.className = 'flex flex-col items-center';
    const currentBars = track.sequenceLength / Constants.STEPS_PER_BAR;
    const seqLabel = document.createElement('label');
    seqLabel.htmlFor = `sequenceLengthBars-${track.id}`;
    seqLabel.className = 'knob-label';
    seqLabel.textContent = 'Seq Len (Bars)';
    seqLengthContainer.appendChild(seqLabel);
    const seqInput = document.createElement('input');
    seqInput.type = 'number';
    seqInput.id = `sequenceLengthBars-${track.id}`;
    seqInput.value = currentBars;
    seqInput.min = "1"; seqInput.max = "256"; seqInput.step = "1";
    seqInput.className = 'bg-white text-black w-16 p-1 rounded-sm text-center text-xs border border-gray-500';
    seqLengthContainer.appendChild(seqInput);
    const seqDisplay = document.createElement('span');
    seqDisplay.id = `sequenceLengthDisplay-${track.id}`;
    seqDisplay.className = 'knob-value';
    seqDisplay.textContent = `${currentBars} bars (${track.sequenceLength} steps)`;
    seqLengthContainer.appendChild(seqDisplay);
    controlGroup.appendChild(seqLengthContainer);
    trackControlsPanel.appendChild(controlGroup);
    contentDiv.appendChild(trackControlsPanel);

    let specificContentElement;
    if (track.type === 'Synth') {
        specificContentElement = buildSynthSpecificInspectorDOM(track);
    } else if (track.type === 'Sampler') {
        specificContentElement = buildSamplerSpecificInspectorDOM(track);
    } else if (track.type === 'DrumSampler') {
        specificContentElement = buildDrumSamplerSpecificInspectorDOM(track);
    } else if (track.type === 'InstrumentSampler') {
        specificContentElement = buildInstrumentSamplerSpecificInspectorDOM(track);
    }
    if (specificContentElement) {
        contentDiv.appendChild(specificContentElement);
    }

    const effectsButton = document.createElement('button');
    effectsButton.className = 'effects-rack-button text-xs py-1 px-2 rounded mt-2 w-full hover:bg-gray-300';
    effectsButton.textContent = 'Effects Rack';
    // This onclick relies on openTrackEffectsRackWindow being globally available or imported and attached.
    effectsButton.onclick = () => window.openTrackEffectsRackWindow(track.id);
    contentDiv.appendChild(effectsButton);

    const sequencerButton = document.createElement('button');
    sequencerButton.className = 'bg-indigo-500 hover:bg-indigo-600 text-white text-xs py-1 px-2 rounded mt-1 w-full';
    sequencerButton.textContent = 'Sequencer';
    sequencerButton.onclick = () => window.openTrackSequencerWindow(track.id);
    contentDiv.appendChild(sequencerButton);

    return contentDiv;
}

function buildSynthSpecificInspectorDOM(track) {
    const panel = document.createElement('div');
    panel.className = 'panel synth-panel';
    const oscTitle = document.createElement('h4');
    oscTitle.className = 'text-sm font-semibold';
    oscTitle.textContent = 'Oscillator';
    panel.appendChild(oscTitle);
    const oscSelect = document.createElement('select');
    oscSelect.id = `oscType-${track.id}`;
    oscSelect.className = 'text-xs p-1 border w-full mb-2 bg-white text-black';
    panel.appendChild(oscSelect);
    const envTitle = document.createElement('h4');
    envTitle.className = 'text-sm font-semibold';
    envTitle.textContent = 'Envelope (ADSR)';
    panel.appendChild(envTitle);
    const envGroup = document.createElement('div');
    envGroup.className = 'control-group';
    ['envAttackSlider', 'envDecaySlider', 'envSustainSlider', 'envReleaseSlider'].forEach(id => {
        const knobPlaceholder = document.createElement('div');
        knobPlaceholder.id = `${id}-${track.id}`;
        envGroup.appendChild(knobPlaceholder);
    });
    panel.appendChild(envGroup);
    return panel;
}

function buildSamplerSpecificInspectorDOM(track) {
    const panel = document.createElement('div');
    panel.className = 'panel sampler-panel';

    const dropZoneContainer = document.createElement('div');
    dropZoneContainer.innerHTML = createDropZoneHTML(track.id, `fileInput-${track.id}`, 'Sampler');
    panel.appendChild(dropZoneContainer.firstChild); // append the .drop-zone div itself

    const editorPanel = document.createElement('div');
    editorPanel.className = 'sampler-editor-panel mt-1 flex flex-wrap md:flex-nowrap gap-3';

    const leftSide = document.createElement('div');
    leftSide.className = 'flex-grow w-full md:w-3/5';
    const canvas = document.createElement('canvas');
    canvas.id = `waveformCanvas-${track.id}`;
    canvas.className = 'waveform-canvas w-full';
    canvas.width = 380; canvas.height = 70; // Default, can be adjusted
    leftSide.appendChild(canvas);
    const padsContainer = document.createElement('div');
    padsContainer.id = `samplePadsContainer-${track.id}`;
    padsContainer.className = 'pads-container mt-2';
    leftSide.appendChild(padsContainer);
    editorPanel.appendChild(leftSide);

    const rightSide = document.createElement('div');
    rightSide.id = `sliceControlsContainer-${track.id}`;
    rightSide.className = 'slice-edit-group w-full md:w-2/5 space-y-1';
    const sliceTitle = document.createElement('h4');
    sliceTitle.className = 'text-sm font-semibold';
    sliceTitle.innerHTML = `Slice: <span id="selectedSliceLabel-${track.id}">${track.selectedSliceForEdit + 1}</span>`;
    rightSide.appendChild(sliceTitle);

    ['Start', 'End'].forEach(label => {
        const div = document.createElement('div');
        div.className = 'flex gap-1 items-center text-xs';
        const lbl = document.createElement('label');
        lbl.textContent = `${label}:`;
        div.appendChild(lbl);
        const input = document.createElement('input');
        input.type = 'number';
        input.id = `slice${label}-${track.id}`;
        input.className = 'flex-grow p-0.5 text-xs bg-white text-black border';
        div.appendChild(input);
        rightSide.appendChild(div);
    });

    const applyBtn = document.createElement('button');
    applyBtn.id = `applySliceEditsBtn-${track.id}`;
    applyBtn.className = 'bg-blue-500 text-white text-xs py-0.5 px-1.5 rounded mt-1 hover:bg-blue-600';
    applyBtn.textContent = 'Apply S/E';
    rightSide.appendChild(applyBtn);

    const volPitchGroup = document.createElement('div');
    volPitchGroup.className = 'control-group mt-1';
    const volPlaceholder = document.createElement('div');
    volPlaceholder.id = `sliceVolumeSlider-${track.id}`;
    volPitchGroup.appendChild(volPlaceholder);
    const pitchPlaceholder = document.createElement('div');
    pitchPlaceholder.id = `slicePitchKnob-${track.id}`;
    volPitchGroup.appendChild(pitchPlaceholder);
    rightSide.appendChild(volPitchGroup);

    const loopReverseGroup = document.createElement('div');
    loopReverseGroup.className = 'flex gap-2 mt-1';
    const loopBtn = document.createElement('button');
    loopBtn.id = `sliceLoopToggle-${track.id}`;
    loopBtn.className = 'slice-toggle-button text-xs p-1';
    loopBtn.textContent = 'Loop';
    loopReverseGroup.appendChild(loopBtn);
    const reverseBtn = document.createElement('button');
    reverseBtn.id = `sliceReverseToggle-${track.id}`;
    reverseBtn.className = 'slice-toggle-button text-xs p-1';
    reverseBtn.textContent = 'Reverse';
    loopReverseGroup.appendChild(reverseBtn);
    rightSide.appendChild(loopReverseGroup);
    
    const polyBtn = document.createElement('button');
    polyBtn.id = `slicerPolyphonyToggle-${track.id}`;
    polyBtn.className = 'slice-toggle-button text-xs p-1 mt-1 w-full';
    polyBtn.textContent = 'Mode: Poly'; // Default, will be updated
    rightSide.appendChild(polyBtn);

    const details = document.createElement('details');
    details.className = 'mt-1';
    const summary = document.createElement('summary');
    summary.className = 'text-xs font-semibold';
    summary.textContent = 'Slice Env';
    details.appendChild(summary);
    const sliceEnvGroup = document.createElement('div');
    sliceEnvGroup.className = 'control-group';
    ['sliceEnvAttackSlider', 'sliceEnvDecaySlider', 'sliceEnvSustainSlider', 'sliceEnvReleaseSlider'].forEach(id => {
        const knobPlaceholder = document.createElement('div');
        knobPlaceholder.id = `${id}-${track.id}`;
        sliceEnvGroup.appendChild(knobPlaceholder);
    });
    details.appendChild(sliceEnvGroup);
    rightSide.appendChild(details);

    editorPanel.appendChild(rightSide);
    panel.appendChild(editorPanel);
    return panel;
}

function buildDrumSamplerSpecificInspectorDOM(track) {
    const panel = document.createElement('div');
    panel.className = 'panel drum-sampler-panel';
    const title = document.createElement('h4');
    title.className = 'text-sm font-semibold mb-1';
    title.innerHTML = `Drum Pads (Selected: <span id="selectedDrumPadLabel-${track.id}">${track.selectedDrumPadForEdit + 1}</span>)`;
    panel.appendChild(title);
    const padsContainer = document.createElement('div');
    padsContainer.id = `drumSamplerPadsContainer-${track.id}`;
    padsContainer.className = 'pads-container mb-2';
    panel.appendChild(padsContainer);
    const controlsContainer = document.createElement('div');
    controlsContainer.id = `drumPadControlsContainer-${track.id}`;
    controlsContainer.className = 'border-t pt-2';
    const loadContainer = document.createElement('div');
    loadContainer.id = `drumPadLoadContainer-${track.id}`; // For dropzone and file name
    loadContainer.className = 'mb-2';
    controlsContainer.appendChild(loadContainer);
    const volPitchGroup = document.createElement('div');
    volPitchGroup.className = 'control-group';
    const volPlaceholder = document.createElement('div');
    volPlaceholder.id = `drumPadVolumeSlider-${track.id}`;
    volPitchGroup.appendChild(volPlaceholder);
    const pitchPlaceholder = document.createElement('div');
    pitchPlaceholder.id = `drumPadPitchKnob-${track.id}`;
    volPitchGroup.appendChild(pitchPlaceholder);
    controlsContainer.appendChild(volPitchGroup);
    const details = document.createElement('details');
    details.className = 'mt-1';
    const summary = document.createElement('summary');
    summary.className = 'text-xs font-semibold';
    summary.textContent = 'Pad Envelope (AR)';
    details.appendChild(summary);
    const padEnvGroup = document.createElement('div');
    padEnvGroup.className = 'control-group';
    ['drumPadEnvAttackSlider', 'drumPadEnvReleaseSlider'].forEach(id => {
        const knobPlaceholder = document.createElement('div');
        knobPlaceholder.id = `${id}-${track.id}`;
        padEnvGroup.appendChild(knobPlaceholder);
    });
    details.appendChild(padEnvGroup);
    controlsContainer.appendChild(details);
    panel.appendChild(controlsContainer);
    return panel;
}

function buildInstrumentSamplerSpecificInspectorDOM(track) {
    const panel = document.createElement('div');
    panel.className = 'panel instrument-sampler-panel';
    const dropZoneContainer = document.createElement('div');
    dropZoneContainer.innerHTML = createDropZoneHTML(track.id, `instrumentFileInput-${track.id}`, 'InstrumentSampler');
    panel.appendChild(dropZoneContainer.firstChild);
    const canvas = document.createElement('canvas');
    canvas.id = `instrumentWaveformCanvas-${track.id}`;
    canvas.className = 'waveform-canvas w-full mb-1';
    canvas.width = 380; canvas.height = 70;
    panel.appendChild(canvas);
    const controlsContainer = document.createElement('div');
    const rootLoopGroup = document.createElement('div');
    rootLoopGroup.className = 'control-group mb-2 items-center';
    const rootNoteDiv = document.createElement('div');
    rootNoteDiv.innerHTML = `<label class="knob-label text-xs">Root Note</label><input type="text" id="instrumentRootNote-${track.id}" value="${track.instrumentSamplerSettings.rootNote}" class="bg-white text-black w-12 p-0.5 text-xs text-center border">`;
    rootLoopGroup.appendChild(rootNoteDiv);
    const loopToggleDiv = document.createElement('div');
    loopToggleDiv.innerHTML = `<label class="knob-label text-xs">Loop</label><button id="instrumentLoopToggle-${track.id}" class="slice-toggle-button text-xs p-1">${track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF'}</button>`;
    rootLoopGroup.appendChild(loopToggleDiv);
    const loopStartDiv = document.createElement('div');
    loopStartDiv.innerHTML = `<label class="knob-label text-xs">Start</label><input type="number" id="instrumentLoopStart-${track.id}" value="${track.instrumentSamplerSettings.loopStart.toFixed(3)}" step="0.001" class="bg-white text-black w-16 p-0.5 text-xs text-center border">`;
    rootLoopGroup.appendChild(loopStartDiv);
    const loopEndDiv = document.createElement('div');
    loopEndDiv.innerHTML = `<label class="knob-label text-xs">End</label><input type="number" id="instrumentLoopEnd-${track.id}" value="${track.instrumentSamplerSettings.loopEnd.toFixed(3)}" step="0.001" class="bg-white text-black w-16 p-0.5 text-xs text-center border">`;
    rootLoopGroup.appendChild(loopEndDiv);
    controlsContainer.appendChild(rootLoopGroup);
    const polyBtn = document.createElement('button');
    polyBtn.id = `instrumentSamplerPolyphonyToggle-${track.id}`;
    polyBtn.className = 'slice-toggle-button text-xs p-1 mb-2 w-full';
    polyBtn.textContent = 'Mode: Poly'; // Default, will be updated
    controlsContainer.appendChild(polyBtn);
    const envTitle = document.createElement('h4');
    envTitle.className = 'text-sm font-semibold';
    envTitle.textContent = 'Envelope (ADSR)';
    controlsContainer.appendChild(envTitle);
    const envGroup = document.createElement('div');
    envGroup.className = 'control-group';
    ['instrumentEnvAttackSlider', 'instrumentEnvDecaySlider', 'instrumentEnvSustainSlider', 'instrumentEnvReleaseSlider'].forEach(id => {
        const knobPlaceholder = document.createElement('div');
        knobPlaceholder.id = `${id}-${track.id}`;
        envGroup.appendChild(knobPlaceholder);
    });
    controlsContainer.appendChild(envGroup);
    panel.appendChild(controlsContainer);
    return panel;
}


// --- Track Inspector Control Initializer Functions ---
export function initializeCommonInspectorControls(track, winEl) {
    // This function will need access to handleTrackMute, handleTrackSolo, handleTrackArm, removeTrack
    // These will likely be imported from eventHandlers.js or main.js
    winEl.querySelector(`#trackNameDisplay-${track.id}`)?.addEventListener('change', (e) => {
        const oldName = track.name;
        const newName = e.target.value;
        if (oldName !== newName && typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Rename Track "${oldName}" to "${newName}"`);
        }
        track.name = newName;
        if (track.inspectorWindow?.titleBar) { // Check if titleBar exists
            track.inspectorWindow.titleBar.querySelector('span').textContent = `Track: ${track.name}`;
        }
        if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
    });
    winEl.querySelector(`#muteBtn-${track.id}`)?.addEventListener('click', () => window.handleTrackMute(track.id));
    winEl.querySelector(`#soloBtn-${track.id}`)?.addEventListener('click', () => window.handleTrackSolo(track.id));
    winEl.querySelector(`#armInputBtn-${track.id}`)?.addEventListener('click', () => window.handleTrackArm(track.id));
    winEl.querySelector(`#removeTrackBtn-${track.id}`)?.addEventListener('click', () => window.removeTrack(track.id));

    const volSliderContainer = winEl.querySelector(`#volumeSliderContainer-${track.id}`);
    if (volSliderContainer) {
        const volKnob = createKnob({
            label: 'Volume', min: 0, max: 1, step: 0.01, initialValue: track.previousVolumeBeforeMute, decimals: 2, sensitivity: 0.8,
            trackRef: track,
            onValueChange: (val, oldVal, fromInteraction) => {
                track.setVolume(val, fromInteraction);
                if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
            }
        });
        volSliderContainer.appendChild(volKnob.element);
        track.inspectorControls.volume = volKnob;
    }

    const seqLenBarsInput = winEl.querySelector(`#sequenceLengthBars-${track.id}`);
    const seqLenDisplaySpan = winEl.querySelector(`#sequenceLengthDisplay-${track.id}`);
    if(seqLenBarsInput && seqLenDisplaySpan) {
        seqLenBarsInput.addEventListener('change', (e) => {
            let numBars = parseInt(e.target.value);
            if(isNaN(numBars) || numBars < 1) numBars = 1;
            if(numBars > 256) numBars = 256;
            e.target.value = numBars;
            const numSteps = numBars * Constants.STEPS_PER_BAR;
            if (track.sequenceLength !== numSteps) {
                if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set Seq Length for ${track.name} to ${numBars} bars`);
                track.setSequenceLength(numSteps);
                seqLenDisplaySpan.textContent = `${numBars} bars (${numSteps} steps)`;
                if (track.sequencerWindow && !track.sequencerWindow.isMinimized && typeof window.openTrackSequencerWindow === 'function') {
                    window.openTrackSequencerWindow(track.id, true);
                }
            }
        });
    }
}

export function initializeTypeSpecificInspectorControls(track, winEl) {
    // These functions will need access to loadSampleFile, loadDrumSamplerPadFile, etc. from audio.js
    // and captureStateForUndo from state.js
    if (track.type === 'Synth') {
        initializeSynthSpecificControls(track, winEl);
    } else if (track.type === 'Sampler') {
        initializeSamplerSpecificControls(track, winEl);
    } else if (track.type === 'DrumSampler') {
        initializeDrumSamplerSpecificControls(track, winEl);
    } else if (track.type === 'InstrumentSampler') {
        initializeInstrumentSamplerSpecificControls(track, winEl);
    }
}

function initializeSynthSpecificControls(track, winEl) {
    const oscTypeSelect = winEl.querySelector(`#oscType-${track.id}`);
    if (oscTypeSelect) {
        ['sine', 'square', 'sawtooth', 'triangle', 'pwm', 'pulse'].forEach(type => oscTypeSelect.add(new Option(type, type)));
        oscTypeSelect.value = track.synthParams.oscillator.type;
        oscTypeSelect.addEventListener('change', (e) => {
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set Osc Type for ${track.name} to ${e.target.value}`);
            track.setSynthOscillatorType(e.target.value);
        });
    }
    const envAKnob = createKnob({ label: 'Attack', min: 0.005, max: 2, step: 0.001, initialValue: track.synthParams.envelope.attack, decimals: 3, trackRef: track, onValueChange: (val) => track.setSynthEnvelope('attack', val) });
    winEl.querySelector(`#envAttackSlider-${track.id}`)?.appendChild(envAKnob.element); track.inspectorControls.envAttack = envAKnob;
    const envDKnob = createKnob({ label: 'Decay', min: 0.01, max: 2, step: 0.01, initialValue: track.synthParams.envelope.decay, decimals: 2, trackRef: track, onValueChange: (val) => track.setSynthEnvelope('decay', val) });
    winEl.querySelector(`#envDecaySlider-${track.id}`)?.appendChild(envDKnob.element); track.inspectorControls.envDecay = envDKnob;
    const envSKnob = createKnob({ label: 'Sustain', min: 0, max: 1, step: 0.01, initialValue: track.synthParams.envelope.sustain, decimals: 2, trackRef: track, onValueChange: (val) => track.setSynthEnvelope('sustain', val) });
    winEl.querySelector(`#envSustainSlider-${track.id}`)?.appendChild(envSKnob.element); track.inspectorControls.envSustain = envSKnob;
    const envRKnob = createKnob({ label: 'Release', min: 0.01, max: 5, step: 0.01, initialValue: track.synthParams.envelope.release, decimals: 2, trackRef: track, onValueChange: (val) => track.setSynthEnvelope('release', val) });
    winEl.querySelector(`#envReleaseSlider-${track.id}`)?.appendChild(envRKnob.element); track.inspectorControls.envRelease = envRKnob;
}

function initializeSamplerSpecificControls(track, winEl) {
    const dropZoneEl = winEl.querySelector(`#dropZone-${track.id}-sampler`);
    const fileInputEl = winEl.querySelector(`#fileInput-${track.id}`);
    if (dropZoneEl && fileInputEl) {
        setupDropZoneListeners(dropZoneEl, track.id, 'Sampler', null, window.loadSoundFromBrowserToTarget, window.loadSampleFile);
        fileInputEl.onchange = (e) => {
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Load sample to ${track.name}`);
            window.loadSampleFile(e, track.id, 'Sampler'); // Assumes loadSampleFile is global or imported
        };
    }
    renderSamplePads(track);
    winEl.querySelector(`#applySliceEditsBtn-${track.id}`)?.addEventListener('click', () => {
        if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Apply Slice Edits for ${track.name}`);
        applySliceEdits(track.id);
    });

    const canvas = winEl.querySelector(`#waveformCanvas-${track.id}`);
    if (canvas) { track.waveformCanvasCtx = canvas.getContext('2d'); drawWaveform(track); }
    updateSliceEditorUI(track);

    ['sliceStart', 'sliceEnd'].forEach(idSuffix => {
        const inputEl = winEl.querySelector(`#${idSuffix}-${track.id}`);
        if (inputEl) inputEl.addEventListener('change', () => { /* Value picked up by applySliceEdits */ });
    });

    const sVolK = createKnob({ label: 'Vol', min:0, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceVolume(track.selectedSliceForEdit, val)});
    winEl.querySelector(`#sliceVolumeSlider-${track.id}`)?.appendChild(sVolK.element); track.inspectorControls.sliceVolume = sVolK;
    const sPitK = createKnob({ label: 'Pitch', min:-24, max:24, step:1, initialValue: track.slices[track.selectedSliceForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setSlicePitchShift(track.selectedSliceForEdit, val)});
    winEl.querySelector(`#slicePitchKnob-${track.id}`)?.appendChild(sPitK.element); track.inspectorControls.slicePitch = sPitK;
    const sEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.attack || 0.01, decimals:3, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'attack', val)});
    winEl.querySelector(`#sliceEnvAttackSlider-${track.id}`)?.appendChild(sEAK.element); track.inspectorControls.sliceEnvAttack = sEAK;
    const sEDK = createKnob({ label: 'Decay', min:0.01, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.decay || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'decay', val)});
    winEl.querySelector(`#sliceEnvDecaySlider-${track.id}`)?.appendChild(sEDK.element); track.inspectorControls.sliceEnvDecay = sEDK;
    const sESK = createKnob({ label: 'Sustain', min:0, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.sustain || 1.0, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'sustain', val)});
    winEl.querySelector(`#sliceEnvSustainSlider-${track.id}`)?.appendChild(sESK.element); track.inspectorControls.sliceEnvSustain = sESK;
    const sERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'release', val)});
    winEl.querySelector(`#sliceEnvReleaseSlider-${track.id}`)?.appendChild(sERK.element); track.inspectorControls.sliceEnvRelease = sERK;

    winEl.querySelector(`#sliceLoopToggle-${track.id}`)?.addEventListener('click', (e) => {
        if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Loop for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`);
        track.setSliceLoop(track.selectedSliceForEdit, !track.slices[track.selectedSliceForEdit].loop); e.target.textContent = track.slices[track.selectedSliceForEdit].loop ? 'Loop: ON' : 'Loop: OFF'; e.target.classList.toggle('active', track.slices[track.selectedSliceForEdit].loop); });
    winEl.querySelector(`#sliceReverseToggle-${track.id}`)?.addEventListener('click', (e) => {
        if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Reverse for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`);
        track.setSliceReverse(track.selectedSliceForEdit, !track.slices[track.selectedSliceForEdit].reverse); e.target.textContent = track.slices[track.selectedSliceForEdit].reverse ? 'Rev: ON' : 'Rev: OFF'; e.target.classList.toggle('active', track.slices[track.selectedSliceForEdit].reverse);});

    const polyphonyToggleBtn = winEl.querySelector(`#slicerPolyphonyToggle-${track.id}`);
    if (polyphonyToggleBtn) {
        polyphonyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
        polyphonyToggleBtn.classList.toggle('active', !track.slicerIsPolyphonic);
        polyphonyToggleBtn.addEventListener('click', () => {
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Slicer Polyphony for ${track.name} to ${!track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`);
            track.slicerIsPolyphonic = !track.slicerIsPolyphonic;
            polyphonyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
            polyphonyToggleBtn.classList.toggle('active', !track.slicerIsPolyphonic);
            if (!track.slicerIsPolyphonic) {
                track.setupSlicerMonoNodes();
                 if(track.slicerMonoPlayer && track.audioBuffer?.loaded) track.slicerMonoPlayer.buffer = track.audioBuffer;
                showNotification(`${track.name} slicer mode: Mono`, 2000);
            } else {
                track.disposeSlicerMonoNodes();
                showNotification(`${track.name} slicer mode: Poly`, 2000);
            }
        });
    }
}

function initializeDrumSamplerSpecificControls(track, winEl) {
    const padLoadContainer = winEl.querySelector(`#drumPadLoadContainer-${track.id}`);
    if (padLoadContainer) updateDrumPadControlsUI(track); // Initial call
    renderDrumSamplerPads(track);

    const pVolK = createKnob({ label: 'Pad Vol', min:0, max:1, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadVolume(track.selectedDrumPadForEdit, val)});
    winEl.querySelector(`#drumPadVolumeSlider-${track.id}`)?.appendChild(pVolK.element); track.inspectorControls.drumPadVolume = pVolK;
    const pPitK = createKnob({ label: 'Pad Pitch', min:-24, max:24, step:1, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setDrumSamplerPadPitch(track.selectedDrumPadForEdit, val)});
    winEl.querySelector(`#drumPadPitchKnob-${track.id}`)?.appendChild(pPitK.element); track.inspectorControls.drumPadPitch = pPitK;
    const pEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.attack || 0.005, decimals:3, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'attack', val)});
    winEl.querySelector(`#drumPadEnvAttackSlider-${track.id}`)?.appendChild(pEAK.element); track.inspectorControls.drumPadEnvAttack = pEAK;
    const pERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'release', val)});
    winEl.querySelector(`#drumPadEnvReleaseSlider-${track.id}`)?.appendChild(pERK.element); track.inspectorControls.drumPadEnvRelease = pERK;
}

function initializeInstrumentSamplerSpecificControls(track, winEl) {
    const dropZoneEl = winEl.querySelector(`#dropZone-${track.id}-instrumentsampler`);
    const fileInputEl = winEl.querySelector(`#instrumentFileInput-${track.id}`);
    if (dropZoneEl && fileInputEl) {
        setupDropZoneListeners(dropZoneEl, track.id, 'InstrumentSampler', null, window.loadSoundFromBrowserToTarget, window.loadSampleFile);
         fileInputEl.onchange = (e) => {
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Load sample to Instrument Sampler ${track.name}`);
            window.loadSampleFile(e, track.id, 'InstrumentSampler');
        };
    }

    const iCanvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`);
    if(iCanvas) { track.instrumentWaveformCanvasCtx = iCanvas.getContext('2d'); drawInstrumentWaveform(track); }

    winEl.querySelector(`#instrumentRootNote-${track.id}`)?.addEventListener('change', (e) => {
        if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set Root Note for ${track.name} to ${e.target.value}`);
        track.setInstrumentSamplerRootNote(e.target.value);
    });
    winEl.querySelector(`#instrumentLoopStart-${track.id}`)?.addEventListener('change', (e) => {
        if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set Loop Start for ${track.name} to ${e.target.value}`);
        track.setInstrumentSamplerLoopStart(parseFloat(e.target.value));
    });
    winEl.querySelector(`#instrumentLoopEnd-${track.id}`)?.addEventListener('change', (e) => {
        if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set Loop End for ${track.name} to ${e.target.value}`);
        track.setInstrumentSamplerLoopEnd(parseFloat(e.target.value));
    });
    winEl.querySelector(`#instrumentLoopToggle-${track.id}`)?.addEventListener('click', (e) => {
        if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Loop for ${track.name}`);
        track.setInstrumentSamplerLoop(!track.instrumentSamplerSettings.loop); e.target.textContent = track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF'; e.target.classList.toggle('active', track.instrumentSamplerSettings.loop);});

    const instPolyphonyToggleBtn = winEl.querySelector(`#instrumentSamplerPolyphonyToggle-${track.id}`);
    if (instPolyphonyToggleBtn) {
        instPolyphonyToggleBtn.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
        instPolyphonyToggleBtn.classList.toggle('active', !track.instrumentSamplerIsPolyphonic);
        instPolyphonyToggleBtn.addEventListener('click', () => {
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Instrument Sampler Polyphony for ${track.name} to ${!track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`);
            track.instrumentSamplerIsPolyphonic = !track.instrumentSamplerIsPolyphonic;
            instPolyphonyToggleBtn.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
            instPolyphonyToggleBtn.classList.toggle('active', !track.instrumentSamplerIsPolyphonic);
            showNotification(`${track.name} Instrument Sampler mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'} (for live input)`, 2000);
        });
    }

    const iEAK = createKnob({ label: 'Attack', min:0.005, max:2, step:0.001, initialValue: track.instrumentSamplerSettings.envelope.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('attack',val) });
    winEl.querySelector(`#instrumentEnvAttackSlider-${track.id}`)?.appendChild(iEAK.element); track.inspectorControls.instEnvAttack = iEAK;
    const iEDK = createKnob({ label: 'Decay', min:0.01, max:2, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('decay',val) });
    winEl.querySelector(`#instrumentEnvDecaySlider-${track.id}`)?.appendChild(iEDK.element); track.inspectorControls.instEnvDecay = iEDK;
    const iESK = createKnob({ label: 'Sustain', min:0, max:1, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('sustain',val) });
    winEl.querySelector(`#instrumentEnvSustainSlider-${track.id}`)?.appendChild(iESK.element); track.inspectorControls.instEnvSustain = iESK;
    const iERK = createKnob({ label: 'Release', min:0.01, max:5, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.release, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('release',val) });
    winEl.querySelector(`#instrumentEnvReleaseSlider-${track.id}`)?.appendChild(iERK.element); track.inspectorControls.instEnvRelease = iERK;
}

export function openGlobalControlsWindow(savedState = null) {
    const windowId = 'globalControls';
    if (window.openWindows[windowId] && !savedState) {
         window.openWindows[windowId].restore(); return window.openWindows[windowId];
    }
    const contentDiv = document.createElement('div');
    contentDiv.className = 'global-controls-window p-2 space-y-3';
    contentDiv.innerHTML = `
        <div class="flex items-center gap-2">
            <button id="playBtnGlobal" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-3 rounded-sm shadow">Play</button>
            <button id="recordBtnGlobal" class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-sm shadow">Record</button>
        </div>
        <div class="flex items-center gap-2">
            <label for="tempoGlobalInput" class="control-label text-xs">Tempo:</label>
            <input type="number" id="tempoGlobalInput" value="${Tone.Transport.bpm.value.toFixed(1)}" min="40" max="240" step="0.1" class="bg-white text-black w-16 p-1 rounded-sm text-center text-xs border border-gray-500">
            <span class="text-xs"> BPM</span>
        </div>
        <div class="flex items-center gap-2 mt-2">
            <label for="midiInputSelectGlobal" class="text-xs">MIDI In:</label>
            <select id="midiInputSelectGlobal" class="bg-white text-black p-1 rounded-sm text-xs border border-gray-500 flex-grow"></select>
            <span id="midiIndicatorGlobal" title="MIDI Activity"></span>
            <span id="keyboardIndicatorGlobal" title="Keyboard Input Activity"></span>
        </div>
        <div id="masterMeterContainerGlobal" class="meter-bar-container mt-2" title="Master Output Level" style="height:15px;">
            <div id="masterMeterBarGlobal" class="meter-bar" style="width: 0%;"></div>
        </div>
    `;
    const winOptions = { width: 280, height: 250, x: 20, y: 20, initialContentKey: 'globalControls' };
    if (savedState) Object.assign(winOptions, savedState);
    
    const globalControlsWin = new SnugWindow(windowId, 'Global Controls', contentDiv, winOptions);
    if (!globalControlsWin || !globalControlsWin.element) {
        showNotification("Failed to create Global Controls window.", 5000); return null;
    }
    
    // Assign to global placeholders (temporary, should be managed better by main.js or eventHandlers.js)
    window.playBtn = globalControlsWin.element.querySelector('#playBtnGlobal');
    window.recordBtn = globalControlsWin.element.querySelector('#recordBtnGlobal');
    window.tempoInput = globalControlsWin.element.querySelector('#tempoGlobalInput');
    window.masterMeterBar = globalControlsWin.element.querySelector('#masterMeterBarGlobal');
    window.midiInputSelectGlobal = globalControlsWin.element.querySelector('#midiInputSelectGlobal');
    window.midiIndicatorGlobalEl = globalControlsWin.element.querySelector('#midiIndicatorGlobal');
    window.keyboardIndicatorGlobalEl = globalControlsWin.element.querySelector('#keyboardIndicatorGlobal');

    // Event listeners for these controls should be attached in eventHandlers.js or main.js
    // For now, this function just creates the window.
    // The original app.js attached listeners after calling this. That pattern needs to be replicated.
    if (typeof window.attachGlobalControlEvents === 'function') { // Example of how event handlers might be attached
        window.attachGlobalControlEvents(globalControlsWin.element);
    }


    return globalControlsWin;
}

export function openTrackInspectorWindow(trackId, savedState = null) {
    const track = window.tracks.find(t => t.id === trackId);
    if (!track) { showNotification(`Track with ID ${trackId} not found.`, 3000); return null; }
    
    const inspectorId = `trackInspector-${track.id}`;
    if (window.openWindows[inspectorId] && !savedState) {
        window.openWindows[inspectorId].restore(); return window.openWindows[inspectorId];
    }
    if (window.openWindows[inspectorId] && savedState) { // If restoring from save, close existing first
        window.openWindows[inspectorId].close();
    }

    track.inspectorControls = {}; // Reset controls references
    const inspectorContentElement = buildTrackInspectorContentDOM(track);

    let windowHeight = 450;
    if (track.type === 'Synth') windowHeight = 520;
    else if (track.type === 'Sampler') windowHeight = 620;
    else if (track.type === 'DrumSampler') windowHeight = 580;
    else if (track.type === 'InstrumentSampler') windowHeight = 620;

    const winOptions = {
        width: Math.min(500, window.innerWidth - 40),
        height: Math.min(windowHeight, window.innerHeight - 80),
        initialContentKey: `trackInspector-${track.id}`
    };
    if (savedState) Object.assign(winOptions, savedState);

    const inspectorWin = new SnugWindow(inspectorId, `Track: ${track.name}`, inspectorContentElement, winOptions);
    if (!inspectorWin || !inspectorWin.element) {
        showNotification(`Failed to create Inspector for track ${track.id}`, 5000); return null;
    }
    track.inspectorWindow = inspectorWin;
    
    initializeCommonInspectorControls(track, inspectorWin.element);
    initializeTypeSpecificInspectorControls(track, inspectorWin.element);

    setTimeout(() => { // Ensure DOM is updated before refreshing knob visuals
        Object.values(track.inspectorControls).forEach(control => {
            if (control && control.type === 'knob' && typeof control.refreshVisuals === 'function') {
                control.refreshVisuals();
            }
        });
    }, 0);
    return inspectorWin;
}

const effectControlDefinitions = { // Keep this definition within ui.js as it's UI-specific
    distortion: {
        title: 'Distortion',
        controls: [ { idPrefix: 'distAmount', type: 'knob', label: 'Amount', min:0, max:1, step:0.01, paramKey: 'amount', decimals:2, setter: 'setDistortionAmount' } ]
    },
    saturation: {
        title: 'Saturation',
        controls: [
            { idPrefix: 'satWet', type: 'knob', label: 'Sat Wet', min:0, max:1, step:0.01, paramKey: 'wet', decimals:2, setter: 'setSaturationWet' },
            { idPrefix: 'satAmount', type: 'knob', label: 'Sat Amt', min:0, max:20, step:1, paramKey: 'amount', decimals:0, setter: 'setSaturationAmount' }
        ]
    },
    filter: {
        title: 'Filter',
        controls: [
            { idPrefix: 'filterType', type: 'select', options: ['lowpass', 'highpass'], paramKey: 'type', setter: 'setFilterType' },
            { idPrefix: 'filterFreq', type: 'knob', label: 'Freq', min:20, max:20000, step:1, paramKey: 'frequency', decimals:0, displaySuffix:'Hz', setter: 'setFilterFrequency' },
            { idPrefix: 'filterQ', type: 'knob', label: 'Q', min:0.1, max:20, step:0.1, paramKey: 'Q', decimals:1, customSetter: (track, val) => { track.effects.filter.Q = parseFloat(val); track.filterNode.Q.value = parseFloat(val); } }
        ]
    },
    chorus: {
        title: 'Chorus',
        controls: [
            { idPrefix: 'chorusWet', type: 'knob', label: 'Chorus Wet', min:0, max:1, step:0.01, paramKey: 'wet', decimals:2, setter: 'setChorusWet' },
            { idPrefix: 'chorusFreq', type: 'knob', label: 'Chorus Freq', min:0.1, max:20, step:0.1, paramKey: 'frequency', decimals:1, displaySuffix:'Hz', setter: 'setChorusFrequency' },
            { idPrefix: 'chorusDelayTime', type: 'knob', label: 'Chorus Delay', min:1, max:20, step:0.1, paramKey: 'delayTime', decimals:1, displaySuffix:'ms', setter: 'setChorusDelayTime' },
            { idPrefix: 'chorusDepth', type: 'knob', label: 'Chorus Depth', min:0, max:1, step:0.01, paramKey: 'depth', decimals:2, setter: 'setChorusDepth' }
        ]
    },
    eq3: {
        title: 'EQ3',
        controls: [
            { idPrefix: 'eqLow', type: 'knob', label: 'Low', min:-24, max:24, step:1, paramKey: 'low', decimals:0, displaySuffix:'dB', setter: 'setEQ3Low' },
            { idPrefix: 'eqMid', type: 'knob', label: 'Mid', min:-24, max:24, step:1, paramKey: 'mid', decimals:0, displaySuffix:'dB', setter: 'setEQ3Mid' },
            { idPrefix: 'eqHigh', type: 'knob', label: 'High', min:-24, max:24, step:1, paramKey: 'high', decimals:0, displaySuffix:'dB', setter: 'setEQ3High' }
        ]
    },
    compressor: {
        title: 'Compressor',
        controls: [
            { idPrefix: 'compThresh', type: 'knob', label: 'Thresh', min:-60, max:0, step:1, paramKey: 'threshold', decimals:0, displaySuffix:'dB', setter: 'setCompressorThreshold' },
            { idPrefix: 'compRatio', type: 'knob', label: 'Ratio', min:1, max:20, step:1, paramKey: 'ratio', decimals:0, setter: 'setCompressorRatio' },
            { idPrefix: 'compAttack', type: 'knob', label: 'Attack', min:0.001, max:0.1, step:0.001, paramKey: 'attack', decimals:3, displaySuffix:'s', setter: 'setCompressorAttack' },
            { idPrefix: 'compRelease', type: 'knob', label: 'Release', min:0.01, max:1, step:0.01, paramKey: 'release', decimals:2, displaySuffix:'s', setter: 'setCompressorRelease' },
            { idPrefix: 'compKnee', type: 'knob', label: 'Knee', min:0, max:40, step:1, paramKey: 'knee', decimals:0, displaySuffix:'dB', setter: 'setCompressorKnee' }
        ]
    },
    delay: {
        title: 'Delay',
        controls: [
            { idPrefix: 'delayWet', type: 'knob', label: 'Wet', min:0, max:1, step:0.01, paramKey: 'wet', decimals:2, setter: 'setDelayWet' },
            { idPrefix: 'delayTime', type: 'knob', label: 'Time', min:0, max:1, step:0.01, paramKey: 'time', decimals:2, displaySuffix:'s', setter: 'setDelayTime' },
            { idPrefix: 'delayFeedback', type: 'knob', label: 'Feedback', min:0, max:0.99, step:0.01, paramKey: 'feedback', decimals:2, setter: 'setDelayFeedback' }
        ]
    },
    reverb: {
        title: 'Reverb',
        controls: [
            { idPrefix: 'reverbWet', type: 'knob', label: 'Wet', min:0, max:1, step:0.01, paramKey: 'wet', decimals:2, setter: 'setReverbWet' },
            { idPrefix: 'reverbDecay', type: 'knob', label: 'Decay', min:0.1, max:10, step:0.1, paramKey: 'decay', decimals:1, displaySuffix:'s', customSetter: (track, val) => { track.effects.reverb.decay = parseFloat(val); track.reverbNode.decay = parseFloat(val);} },
            { idPrefix: 'reverbPreDelay', type: 'knob', label: 'PreDelay', min:0, max:0.1, step:0.001, paramKey: 'preDelay', decimals:3, displaySuffix:'s', customSetter: (track, val) => { track.effects.reverb.preDelay = parseFloat(val); track.reverbNode.preDelay = parseFloat(val);} }
        ]
    }
};

export function buildEffectsRackContentDOM(track) {
    const mainContentDiv = document.createElement('div');
    mainContentDiv.className = 'effects-rack-window p-2 space-y-3';

    for (const effectKey in effectControlDefinitions) {
        const effectDef = effectControlDefinitions[effectKey];
        const effectGroupDiv = document.createElement('div');
        effectGroupDiv.className = 'effect-group';
        const titleEl = document.createElement('h4');
        titleEl.className = 'text-sm font-semibold';
        titleEl.textContent = effectDef.title;
        effectGroupDiv.appendChild(titleEl);
        const controlsContainer = document.createElement('div');
        if (effectDef.controls.length > 1 || ['distortion', 'saturation'].includes(effectKey)) {
             controlsContainer.className = 'control-group';
        }
        effectDef.controls.forEach(controlDef => {
            if (controlDef.type === 'select') {
                const selectEl = document.createElement('select');
                selectEl.id = `${controlDef.idPrefix}-${track.id}`;
                selectEl.className = 'text-xs p-1 border w-full mb-1 bg-white text-black';
                controlsContainer.appendChild(selectEl);
            } else if (controlDef.type === 'knob') {
                const knobPlaceholder = document.createElement('div');
                knobPlaceholder.id = `${controlDef.idPrefix}Knob-${track.id}`; // Ensure ID is unique for placeholder
                controlsContainer.appendChild(knobPlaceholder);
            }
        });
        effectGroupDiv.appendChild(controlsContainer);
        mainContentDiv.appendChild(effectGroupDiv);
    }
    return mainContentDiv;
}


export function openTrackEffectsRackWindow(trackId, savedState = null) {
    const track = window.tracks.find(t => t.id === trackId);
    if (!track) return null;
    const windowId = `effectsRack-${track.id}`;

    if (window.openWindows[windowId] && !savedState) {
        window.openWindows[windowId].restore(); return window.openWindows[windowId];
    }
    if (window.openWindows[windowId] && savedState) {
        window.openWindows[windowId].close();
    }

    track.inspectorControls = track.inspectorControls || {}; // Ensure it exists for effect knobs
    const effectsRackContentElement = buildEffectsRackContentDOM(track);

    const winOptions = { width: 450, height: 600, initialContentKey: `effectsRack-${track.id}` };
    if (savedState) Object.assign(winOptions, savedState);

    const effectsWin = new SnugWindow(windowId, `Effects: ${track.name}`, effectsRackContentElement, winOptions);
    if (!effectsWin || !effectsWin.element) {
        showNotification("Failed to create Effects Rack.", 5000); return null;
    }
    track.effectsRackWindow = effectsWin;
    const winEl = effectsWin.element; // Use the main window element to query from

    for (const effectKey in effectControlDefinitions) {
        const effectDef = effectControlDefinitions[effectKey];
        effectDef.controls.forEach(controlDef => {
            const controlIdBase = `${controlDef.idPrefix}-${track.id}`;
            const initialValue = track.effects[effectKey] ? track.effects[effectKey][controlDef.paramKey] : controlDef.min;

            if (controlDef.type === 'select') {
                const selectEl = winEl.querySelector(`#${controlIdBase}`);
                if (selectEl) {
                    controlDef.options.forEach(opt => selectEl.add(new Option(opt, opt)));
                    selectEl.value = initialValue;
                    selectEl.addEventListener('change', (e) => {
                        if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set ${effectDef.title} ${controlDef.paramKey} for ${track.name} to ${e.target.value}`);
                        if (track[controlDef.setter]) {
                            track[controlDef.setter](e.target.value);
                        }
                    });
                }
            } else if (controlDef.type === 'knob') {
                const knobPlaceholder = winEl.querySelector(`#${controlDef.idPrefix}Knob-${track.id}`); // Query by placeholder ID
                if (knobPlaceholder) {
                    const knob = createKnob({
                        label: controlDef.label, min: controlDef.min, max: controlDef.max, step: controlDef.step,
                        initialValue: initialValue, decimals: controlDef.decimals, displaySuffix: controlDef.displaySuffix,
                        trackRef: track,
                        onValueChange: (val) => {
                            if (controlDef.customSetter) controlDef.customSetter(track, val);
                            else if (track[controlDef.setter]) track[controlDef.setter](val);
                        }
                    });
                    knobPlaceholder.appendChild(knob.element);
                    track.inspectorControls[controlDef.idPrefix] = knob; // Store knob reference
                }
            }
        });
    }
     setTimeout(() => { // Ensure DOM is updated before refreshing knob visuals
        for (const effectKey in effectControlDefinitions) {
            effectControlDefinitions[effectKey].controls.forEach(controlDef => {
                if (controlDef.type === 'knob' && track.inspectorControls[controlDef.idPrefix]) {
                    track.inspectorControls[controlDef.idPrefix].refreshVisuals();
                }
            });
        }
    }, 0);
    return effectsWin;
}


export function buildSequencerContentDOM(track, rows, rowLabels, numBars) {
    const mainContentDiv = document.createElement('div');
    mainContentDiv.className = 'sequencer-window-content p-2';

    const titleP = document.createElement('p');
    titleP.className = 'text-xs';
    titleP.textContent = `${track.name} - ${track.type} Sequencer (${rows} rows x ${track.sequenceLength} steps, ${numBars} Bars)`;
    mainContentDiv.appendChild(titleP);

    const gridContainer = document.createElement('div');
    gridContainer.className = 'sequencer-grid-container';

    const gridDiv = document.createElement('div');
    gridDiv.className = 'sequencer-grid';
    gridDiv.style.gridTemplateColumns = `50px repeat(${track.sequenceLength}, 1fr)`;
    gridDiv.style.gridTemplateRows = `auto repeat(${rows}, auto)`;
    gridDiv.style.setProperty('--steps-per-bar', Constants.STEPS_PER_BAR);

    const placeholderCell = document.createElement('div');
    placeholderCell.className = 'sequencer-bar-header-placeholder';
    gridDiv.appendChild(placeholderCell);

    for (let bar = 0; bar < numBars; bar++) {
        const barHeaderCell = document.createElement('div');
        barHeaderCell.className = 'sequencer-bar-header-cell';
        barHeaderCell.textContent = `Bar ${bar + 1}`;
        gridDiv.appendChild(barHeaderCell);
    }

    for (let r = 0; r < rows; r++) {
        const labelCell = document.createElement('div');
        labelCell.className = 'sequencer-label-cell';
        labelCell.title = rowLabels[r] || '';
        labelCell.textContent = rowLabels[r] || '';
        gridDiv.appendChild(labelCell);

        for (let c = 0; c < track.sequenceLength; c++) {
            const stepCell = document.createElement('div');
            let cellClass = 'sequencer-step-cell';
            const beatInBar = (c % Constants.STEPS_PER_BAR);

            if (Constants.STEPS_PER_BAR === 16) {
                if (beatInBar >= 0 && beatInBar <= 3) cellClass += ' beat-1';
                else if (beatInBar >= 4 && beatInBar <= 7) cellClass += ' beat-2';
                else if (beatInBar >= 8 && beatInBar <= 11) cellClass += ' beat-3';
                else if (beatInBar >= 12 && beatInBar <= 15) cellClass += ' beat-4';
            } else {
                if (Math.floor(beatInBar / 4) % 2 === 0) cellClass += ' beat-1';
                else cellClass += ' beat-2';
            }

            const stepData = track.sequenceData[r]?.[c];
            if (stepData && stepData.active) {
                if (track.type === 'Synth') cellClass += ' active-synth';
                else if (track.type === 'Sampler') cellClass += ' active-sampler';
                else if (track.type === 'DrumSampler') cellClass += ' active-drum-sampler';
                else if (track.type === 'InstrumentSampler') cellClass += ' active-instrument-sampler';
            }
            stepCell.className = cellClass;
            stepCell.dataset.row = r;
            stepCell.dataset.col = c;
            stepCell.title = `${rowLabels[r] || ''} - Step ${c + 1}`;
            gridDiv.appendChild(stepCell);
        }
    }
    gridContainer.appendChild(gridDiv);
    mainContentDiv.appendChild(gridContainer);
    return mainContentDiv;
}

export function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) {
    const track = window.tracks.find(t => t.id === trackId);
    if (!track) return null;
    const windowId = `sequencerWin-${track.id}`;
    window.activeSequencerTrackId = track.id;

    if (window.openWindows[windowId] && !forceRedraw && !savedState) {
        window.openWindows[windowId].restore(); return window.openWindows[windowId];
    }
    if (window.openWindows[windowId] && (forceRedraw || savedState)) {
        window.openWindows[windowId].close();
    }

    let rows = 0, rowLabels = [];
    if (track.type === 'Synth' || track.type === 'InstrumentSampler') {
        rows = Constants.synthPitches.length; rowLabels = Constants.synthPitches;
    } else if (track.type === 'Sampler') {
        rows = track.slices.length > 0 ? track.slices.length : Constants.numSlices;
        rowLabels = Array.from({length: rows}, (_, i) => `Slice ${i + 1}`);
    } else if (track.type === 'DrumSampler') {
        rows = Constants.numDrumSamplerPads; rowLabels = Array.from({length: rows}, (_, i) => `Pad ${i+1}`);
    }
    const numBars = Math.ceil(track.sequenceLength / Constants.STEPS_PER_BAR);

    const sequencerContentElement = buildSequencerContentDOM(track, rows, rowLabels, numBars);

    const winOptions = {
        width: Math.min(700, window.innerWidth - 50),
        height: Math.min(420 + rows * 22, window.innerHeight - 100),
        initialContentKey: `sequencerWin-${track.id}`
    };
    if (savedState) Object.assign(winOptions, savedState);

    const seqWin = new SnugWindow(windowId, `Sequencer: ${track.name}`, sequencerContentElement, winOptions);
    if (!seqWin || !seqWin.element) { showNotification("Failed to create Sequencer window.", 5000); return null; }
    track.sequencerWindow = seqWin;

    seqWin.element.querySelectorAll('.sequencer-step-cell').forEach(cell => {
        cell.addEventListener('click', () => {
            const r = parseInt(cell.dataset.row);
            const c = parseInt(cell.dataset.col);
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Sequencer Step (Track ${track.name}, ${rowLabels[r] || 'Row ' + (r+1)}, Step ${c+1})`);
            
            if (!track.sequenceData[r]) track.sequenceData[r] = Array(track.sequenceLength).fill(null);
            if (!track.sequenceData[r][c] || !track.sequenceData[r][c].active) {
                track.sequenceData[r][c] = { active: true, velocity: Constants.defaultVelocity };
                let activeClass = '';
                if (track.type === 'Synth') activeClass = 'active-synth';
                else if (track.type === 'Sampler') activeClass = 'active-sampler';
                else if (track.type === 'DrumSampler') activeClass = 'active-drum-sampler';
                else if (track.type === 'InstrumentSampler') activeClass = 'active-instrument-sampler';
                cell.classList.remove('active-synth', 'active-sampler', 'active-drum-sampler', 'active-instrument-sampler'); // Clear first
                if(activeClass) cell.classList.add(activeClass);
            } else {
                track.sequenceData[r][c].active = false;
                cell.className = 'sequencer-step-cell'; // Reset to base
                const beatInBar = (c % Constants.STEPS_PER_BAR);
                if (Constants.STEPS_PER_BAR === 16) {
                    if (beatInBar >=0 && beatInBar <=3) cell.classList.add('beat-1');
                    else if (beatInBar >=4 && beatInBar <=7) cell.classList.add('beat-2');
                    else if (beatInBar >=8 && beatInBar <=11) cell.classList.add('beat-3');
                    else if (beatInBar >=12 && beatInBar <=15) cell.classList.add('beat-4');
                } else {
                     if (Math.floor(beatInBar / 4) % 2 === 0) cell.classList.add('beat-1'); else cell.classList.add('beat-2');
                }
            }
        });
    });
    seqWin.onCloseCallback = () => { if (window.activeSequencerTrackId === track.id) window.activeSequencerTrackId = null; };
    return seqWin;
}

export function highlightPlayingStep(col, trackType, gridElement) {
    if (!gridElement) return;
    gridElement.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));
    gridElement.querySelectorAll(`.sequencer-step-cell[data-col="${col}"]`).forEach(cell => cell.classList.add('playing'));
}


export function openMixerWindow(savedState = null) {
    const windowId = 'mixer';
    if (window.openWindows[windowId] && !savedState) { window.openWindows[windowId].restore(); return window.openWindows[windowId]; }
    
    const contentDiv = document.createElement('div'); 
    contentDiv.className = 'mixer-window-content'; 
    
    const winOptions = { 
        width: Math.max(500, Math.min(800, window.innerWidth - 60)), height: 350,
        initialContentKey: 'mixer' 
    };
    if (savedState) Object.assign(winOptions, savedState);

    const mixerWin = new SnugWindow(windowId, 'Mixer', contentDiv, winOptions); // Pass contentDiv directly
    if (!mixerWin || !mixerWin.element) { 
        showNotification("Failed to create Mixer window.", 5000); return null; 
    }
    renderMixer(contentDiv); // Populate after creation
    return mixerWin;
}

export function updateMixerWindow() {
    const mixerWin = window.openWindows['mixer'];
    if (mixerWin && mixerWin.element && !mixerWin.isMinimized) {
        const mixerContentArea = mixerWin.element.querySelector('.mixer-window-content');
        if (mixerContentArea) renderMixer(mixerContentArea);
    }
}

export function renderMixer(container) {
    if (!container) { console.error("Mixer container not found for rendering."); return; }
    container.innerHTML = ''; // Clear existing content
    
    window.tracks.forEach(track => { // Assuming window.tracks is accessible
        const strip = document.createElement('div'); 
        strip.className = 'channel-strip';
        const trackNameDiv = document.createElement('div');
        trackNameDiv.className = 'track-name';
        trackNameDiv.title = track.name;
        trackNameDiv.textContent = track.name.substring(0,8) + (track.name.length > 8 ? '...' : '');
        trackNameDiv.onclick = () => openTrackInspectorWindow(track.id); 
        strip.appendChild(trackNameDiv);

        const faderContainer = document.createElement('div');
        faderContainer.className = 'fader-container'; 
        faderContainer.id = `mixerVolumeSliderContainer-${track.id}`; 
        strip.appendChild(faderContainer);
        
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'mixer-buttons flex gap-1 mb-1';
        buttonsDiv.innerHTML = ` 
            <button id="mixerMuteBtn-${track.id}" class="mute-button text-xs p-0.5 ${track.isMuted ? 'muted' : ''}">M</button> 
            <button id="mixerSoloBtn-${track.id}" class="solo-button text-xs p-0.5 ${track.isSoloed ? 'soloed' : ''}">S</button> 
        `; // isSoloed needs to check global soloedTrackId
        strip.appendChild(buttonsDiv);

        const meterDiv = document.createElement('div');
        meterDiv.id = `mixerTrackMeterContainer-${track.id}`;
        meterDiv.className = 'mixer-meter-container h-3';
        meterDiv.innerHTML = `<div id="mixerTrackMeterBar-${track.id}" class="meter-bar"></div>`;
        strip.appendChild(meterDiv);
        container.appendChild(strip);

        const volKnobContainer = strip.querySelector(`#mixerVolumeSliderContainer-${track.id}`);
        if(volKnobContainer) {
            const volKnob = createKnob({ 
                label: '', min:0, max:1, step:0.01, initialValue: track.previousVolumeBeforeMute, decimals:2, sensitivity: 0.8,
                trackRef: track, 
                onValueChange: (val, oldVal, fromInteraction) => { 
                    track.setVolume(val, fromInteraction); 
                    if (track.inspectorControls?.volume?.type === 'knob') { 
                        track.inspectorControls.volume.setValue(val, false); 
                    }
                }
            });
            volKnobContainer.innerHTML = ''; 
            volKnobContainer.appendChild(volKnob.element);
            track.inspectorControls[`mixerVolume-${track.id}`] = volKnob;
        }
        strip.querySelector(`#mixerMuteBtn-${track.id}`)?.addEventListener('click', () => window.handleTrackMute(track.id));
        strip.querySelector(`#mixerSoloBtn-${track.id}`)?.addEventListener('click', () => window.handleTrackSolo(track.id));
    });
    
    const masterStrip = document.createElement('div'); 
    masterStrip.className = 'channel-strip bg-gray-400';
    masterStrip.innerHTML = `<div class="track-name">Master</div>
                             <div class="fader-container" id="mixerMasterVolumeSliderContainer"></div> 
                             <div id="mixerMasterMeterContainer" class="mixer-meter-container h-3 mt-auto">
                                <div id="mixerMasterMeterBar" class="meter-bar"></div>
                             </div>`;
    container.appendChild(masterStrip);
    
    const masterVolSliderCont = masterStrip.querySelector('#mixerMasterVolumeSliderContainer');
    if(masterVolSliderCont){
        const masterVolKnob = createKnob({ 
            label: '', min:-60, max:6, step:1, initialValue: Tone.getDestination().volume.value, 
            displaySuffix: 'dB', decimals:0, sensitivity: 0.3,
            onValueChange: (val) => { Tone.getDestination().volume.value = val; }
        });
        masterVolSliderCont.innerHTML = ''; 
        masterVolSliderCont.appendChild(masterVolKnob.element);
        // Store this knob if needed, e.g., window.masterVolumeKnob = masterVolKnob;
    }
    setTimeout(() => { // Refresh visuals
        window.tracks.forEach(track => {
            track.inspectorControls[`mixerVolume-${track.id}`]?.refreshVisuals?.();
        });
        // masterVolKnob?.refreshVisuals?.(); // If stored
    }, 0);
}

export function openSoundBrowserWindow(savedState = null) {
    const windowId = 'soundBrowser';
    if (window.openWindows[windowId] && !savedState) { window.openWindows[windowId].restore(); return window.openWindows[windowId]; }

    let selectOptionsHTML = '';
    for (const libName in Constants.soundLibraries) {
        selectOptionsHTML += `<option value="${libName}">${libName}</option>`;
    }
    const contentHTML = `
        <div class="sound-browser-content">
            <select id="soundBrowserLibrarySelect" class="w-full mb-2 p-1 border border-gray-500 rounded-sm text-xs">
                ${selectOptionsHTML}
            </select>
            <div id="soundBrowserPathDisplay" class="text-xs p-1 bg-gray-200 border-b border-gray-400">Path: /</div>
            <div id="soundBrowserList" class="sound-browser-list">Select a library to load sounds.</div>
        </div>
    `;
    const winOptions = { width: 350, height: 400, initialContentKey: 'soundBrowser' };
    if (savedState) Object.assign(winOptions, savedState);
    
    const soundBrowserWin = new SnugWindow(windowId, 'Sound Browser', contentHTML, winOptions);
    if (!soundBrowserWin) return null;

    const librarySelect = soundBrowserWin.element.querySelector('#soundBrowserLibrarySelect');
    librarySelect.onchange = () => { // This event listener setup should ideally be in eventHandlers.js
        const selectedLibraryName = librarySelect.value;
        const zipUrl = Constants.soundLibraries[selectedLibraryName];
        if (zipUrl) {
            if (window.loadedZipFiles[selectedLibraryName]) { // Assuming global loadedZipFiles
                window.currentLibraryName = selectedLibraryName;
                window.currentSoundFileTree = {}; // Rebuild tree (can be optimized)
                window.loadedZipFiles[selectedLibraryName].forEach((relativePath, zipEntry) => {
                    if (zipEntry.dir) return;
                    const pathParts = relativePath.split('/').filter(p => p);
                    let currentLevel = window.currentSoundFileTree;
                    for (let i = 0; i < pathParts.length; i++) {
                        const part = pathParts[i];
                        if (i === pathParts.length - 1) {
                            if (part.endsWith('.wav') || part.endsWith('.mp3') || part.endsWith('.ogg')) {
                                currentLevel[part] = { type: 'file', entry: zipEntry, fullPath: relativePath };
                            }
                        } else {
                            if (!currentLevel[part] || currentLevel[part].type !== 'folder') {
                                currentLevel[part] = { type: 'folder', children: {} };
                            }
                            currentLevel = currentLevel[part].children;
                        }
                    }
                });
                window.currentSoundBrowserPath = [];
                if(typeof window.renderSoundBrowserDirectory === 'function') window.renderSoundBrowserDirectory(window.currentSoundBrowserPath, window.currentSoundFileTree);
            } else {
                if(typeof window.fetchSoundLibrary === 'function') window.fetchSoundLibrary(selectedLibraryName, zipUrl);
            }
        }
    };
    if (Object.keys(Constants.soundLibraries).length > 0) {
        const firstLibraryName = Object.keys(Constants.soundLibraries)[0];
        librarySelect.value = firstLibraryName;
        if(typeof window.fetchSoundLibrary === 'function') window.fetchSoundLibrary(firstLibraryName, Constants.soundLibraries[firstLibraryName]);
    }
    return soundBrowserWin;
}

export function renderSamplePads(track) {
    if (!track || !track.inspectorWindow?.element) return;
    const padsContainer = track.inspectorWindow.element.querySelector(`#samplePadsContainer-${track.id}`);
    if (!padsContainer) return;
    padsContainer.innerHTML = '';
    track.slices.forEach((slice, index) => {
        const pad = document.createElement('button');
        pad.className = `pad-button ${index === track.selectedSliceForEdit ? 'selected-for-edit' : ''}`;
        pad.textContent = `Slice ${index + 1}`;
        pad.title = `Select Slice ${index + 1}. Click to preview.`;
        pad.dataset.trackId = track.id; // For drop zone
        pad.dataset.trackType = "Sampler";
        pad.dataset.padSliceIndex = index;

        pad.addEventListener('click', async () => {
            track.selectedSliceForEdit = index;
            if(typeof window.playSlicePreview === 'function') await window.playSlicePreview(track.id, index);
            renderSamplePads(track); // Re-render to update selection
            updateSliceEditorUI(track);
        });
        // Setup drop zone for individual pads (if desired, current setupDropZoneListeners handles this)
        // setupDropZoneListeners(pad, track.id, 'Sampler', index, window.loadSoundFromBrowserToTarget, window.loadSampleFile);
        padsContainer.appendChild(pad);
    });
}

export function updateSliceEditorUI(track) {
    if (!track || track.type !== 'Sampler' || !track.inspectorWindow?.element) return;
    const inspectorEl = track.inspectorWindow.element;
    const selectedSlice = track.slices[track.selectedSliceForEdit];
    if (!selectedSlice) return;

    inspectorEl.querySelector(`#selectedSliceLabel-${track.id}`).textContent = track.selectedSliceForEdit + 1;
    const startInput = inspectorEl.querySelector(`#sliceStart-${track.id}`);
    const endInput = inspectorEl.querySelector(`#sliceEnd-${track.id}`);
    if (startInput) startInput.value = selectedSlice.offset.toFixed(3);
    if (endInput) endInput.value = (selectedSlice.offset + selectedSlice.duration).toFixed(3);

    track.inspectorControls.sliceVolume?.setValue(selectedSlice.volume, false);
    track.inspectorControls.slicePitch?.setValue(selectedSlice.pitchShift, false);
    track.inspectorControls.sliceEnvAttack?.setValue(selectedSlice.envelope.attack, false);
    track.inspectorControls.sliceEnvDecay?.setValue(selectedSlice.envelope.decay, false);
    track.inspectorControls.sliceEnvSustain?.setValue(selectedSlice.envelope.sustain, false);
    track.inspectorControls.sliceEnvRelease?.setValue(selectedSlice.envelope.release, false);

    const loopToggle = inspectorEl.querySelector(`#sliceLoopToggle-${track.id}`);
    if (loopToggle) { loopToggle.textContent = selectedSlice.loop ? 'Loop: ON' : 'Loop: OFF'; loopToggle.classList.toggle('active', selectedSlice.loop); }
    const reverseToggle = inspectorEl.querySelector(`#sliceReverseToggle-${track.id}`);
    if (reverseToggle) { reverseToggle.textContent = selectedSlice.reverse ? 'Rev: ON' : 'Rev: OFF'; reverseToggle.classList.toggle('active', selectedSlice.reverse); }
}

export function applySliceEdits(trackId) {
    const track = window.tracks.find(t => t.id === trackId);
    if (!track || track.type !== 'Sampler' || !track.inspectorWindow?.element) return;
    const inspectorEl = track.inspectorWindow.element;
    const slice = track.slices[track.selectedSliceForEdit];
    if (!slice) return;

    const newStart = parseFloat(inspectorEl.querySelector(`#sliceStart-${track.id}`)?.value);
    const newEnd = parseFloat(inspectorEl.querySelector(`#sliceEnd-${track.id}`)?.value);

    if (!isNaN(newStart) && !isNaN(newEnd) && newEnd > newStart && track.audioBuffer) {
        slice.offset = Math.max(0, Math.min(newStart, track.audioBuffer.duration));
        slice.duration = Math.max(0.001, Math.min(newEnd - slice.offset, track.audioBuffer.duration - slice.offset));
        slice.userDefined = true;
        if(typeof window.drawWaveform === 'function') window.drawWaveform(track);
        showNotification(`Slice ${track.selectedSliceForEdit + 1} updated.`, 1500);
    } else {
        showNotification("Invalid slice start/end times.", 2000);
        updateSliceEditorUI(track); // Reset UI
    }
}

export function drawWaveform(track) {
    if (!track || (track.type !== 'Sampler' && track.type !== 'InstrumentSampler') || !track.audioBuffer || !track.audioBuffer.loaded) return;
    const ctx = track.type === 'Sampler' ? track.waveformCanvasCtx : track.instrumentWaveformCanvasCtx;
    if (!ctx) return;

    const canvas = ctx.canvas;
    const width = canvas.width; const height = canvas.height;
    const channelData = track.audioBuffer.getChannelData(0);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#a0a0a0'; ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 1; ctx.strokeStyle = '#333'; ctx.beginPath();
    const sliceWidth = width / channelData.length;
    for (let i = 0; i < channelData.length; i++) {
        const x = i * sliceWidth;
        const y = (0.5 + channelData[i] * 0.5) * height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (track.type === 'Sampler') {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; ctx.lineWidth = 1;
        track.slices.forEach((slice, index) => {
            const startX = (slice.offset / track.audioBuffer.duration) * width;
            ctx.beginPath(); ctx.moveTo(startX, 0); ctx.lineTo(startX, height); ctx.stroke();
            if (index === track.selectedSliceForEdit) {
                ctx.strokeStyle = 'rgba(0, 0, 255, 0.9)'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(startX,0); ctx.lineTo(startX,height); ctx.stroke();
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; ctx.lineWidth = 1;
            }
        });
    }
    if (track.type === 'InstrumentSampler' && track.instrumentSamplerSettings.loop) {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)'; ctx.lineWidth = 1;
        const loopStartX = (track.instrumentSamplerSettings.loopStart / track.audioBuffer.duration) * width;
        const loopEndX = (track.instrumentSamplerSettings.loopEnd / track.audioBuffer.duration) * width;
        ctx.beginPath(); ctx.moveTo(loopStartX, 0); ctx.lineTo(loopStartX, height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(loopEndX, 0); ctx.lineTo(loopEndX, height); ctx.stroke();
    }
}
export function drawInstrumentWaveform(track) { drawWaveform(track); }


export function updateDrumPadControlsUI(track) {
    if (!track || track.type !== 'DrumSampler' || !track.inspectorWindow?.element) return;
    const inspectorEl = track.inspectorWindow.element;
    const selectedPad = track.drumSamplerPads[track.selectedDrumPadForEdit];
    if (!selectedPad) return;

    inspectorEl.querySelector(`#selectedDrumPadLabel-${track.id}`).textContent = track.selectedDrumPadForEdit + 1;
    const loadContainer = inspectorEl.querySelector(`#drumPadLoadContainer-${track.id}`);
    if (loadContainer) {
        const inputId = `drumPadFileInput-${track.id}-${track.selectedDrumPadForEdit}`;
        loadContainer.innerHTML = createDropZoneHTML(track.id, inputId, 'DrumSampler', track.selectedDrumPadForEdit) +
                                  `<span id="drumPadFileName-${track.id}" class="text-xs ml-2 block truncate" style="max-width: 150px;">${selectedPad.originalFileName || 'No file'}</span>`;
        const fileInputEl = loadContainer.querySelector(`#${inputId}`);
        if (fileInputEl) {
            fileInputEl.addEventListener('change', (e) => {
                if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Load sample to Drum Pad ${track.selectedDrumPadForEdit + 1} on ${track.name}`);
                window.loadDrumSamplerPadFile(e, track.id, track.selectedDrumPadForEdit); // Assumes global
            });
        }
        const dropZoneEl = loadContainer.querySelector(`#dropZone-${track.id}-drumsampler-${track.selectedDrumPadForEdit}`);
        if (dropZoneEl) setupDropZoneListeners(dropZoneEl, track.id, 'DrumSampler', track.selectedDrumPadForEdit, window.loadSoundFromBrowserToTarget, window.loadDrumSamplerPadFile);
    }
    track.inspectorControls.drumPadVolume?.setValue(selectedPad.volume, false);
    track.inspectorControls.drumPadPitch?.setValue(selectedPad.pitchShift, false);
    track.inspectorControls.drumPadEnvAttack?.setValue(selectedPad.envelope.attack, false);
    track.inspectorControls.drumPadEnvRelease?.setValue(selectedPad.envelope.release, false);
}

export function renderDrumSamplerPads(track) {
    if (!track || track.type !== 'DrumSampler' || !track.inspectorWindow?.element) return;
    const padsContainer = track.inspectorWindow.element.querySelector(`#drumSamplerPadsContainer-${track.id}`);
    if (!padsContainer) return;
    padsContainer.innerHTML = '';
    track.drumSamplerPads.forEach((padData, index) => {
        const padEl = document.createElement('button');
        padEl.className = `pad-button ${index === track.selectedDrumPadForEdit ? 'selected-for-edit' : ''}`;
        padEl.innerHTML = `Pad ${index + 1} <span class="pad-label block truncate" style="max-width: 50px;">${padData.originalFileName || 'Empty'}</span>`;
        padEl.title = `Select Pad ${index + 1}. Click to preview.`;
        padEl.dataset.trackId = track.id;
        padEl.dataset.trackType = "DrumSampler";
        padEl.dataset.padSliceIndex = index;

        padEl.addEventListener('click', async () => {
            track.selectedDrumPadForEdit = index;
            if(typeof window.playDrumSamplerPadPreview === 'function') await window.playDrumSamplerPadPreview(track.id, index);
            renderDrumSamplerPads(track);
            updateDrumPadControlsUI(track);
        });
        // setupDropZoneListeners(padEl, track.id, 'DrumSampler', index, window.loadSoundFromBrowserToTarget, window.loadDrumSamplerPadFile);
        padsContainer.appendChild(padEl);
    });
}
