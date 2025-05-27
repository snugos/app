// js/ui.js - UI Creation and Management Module

import { SnugWindow } from './SnugWindow.js';
console.log('[ui.js] SnugWindow imported as:', SnugWindow);
import { showNotification, createDropZoneHTML, setupDropZoneListeners as utilSetupDropZoneListeners } from './utils.js';
import * as Constants from './constants.js';
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
} from './eventHandlers.js';

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
                window.captureStateForUndo(description);
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


// Synth Engine Control Definitions
const synthEngineControlDefinitions = {
    'BasicPoly': [
        { idPrefix: 'basicOscType', type: 'select', label: 'Osc Type', options: ['sine', 'square', 'sawtooth', 'triangle', 'pwm', 'pulse'], paramPath: 'oscillator.type' },
        { idPrefix: 'basicEnvAttack', type: 'knob', label: 'Attack', min: 0.005, max: 2, step: 0.001, paramPath: 'envelope.attack', decimals: 3 },
        { idPrefix: 'basicEnvDecay', type: 'knob', label: 'Decay', min: 0.01, max: 2, step: 0.01, paramPath: 'envelope.decay', decimals: 2 },
        { idPrefix: 'basicEnvSustain', type: 'knob', label: 'Sustain', min: 0, max: 1, step: 0.01, paramPath: 'envelope.sustain', decimals: 2 },
        { idPrefix: 'basicEnvRelease', type: 'knob', label: 'Release', min: 0.01, max: 5, step: 0.01, paramPath: 'envelope.release', decimals: 2 }
    ],
    'AMSynth': [
        { idPrefix: 'amHarmonicity', type: 'knob', label: 'Harmonicity', min: 0.1, max: 20, step: 0.1, paramPath: 'harmonicity', decimals: 1 },
        { idPrefix: 'amDetune', type: 'knob', label: 'Detune', min: -1200, max: 1200, step: 1, paramPath: 'detune', decimals: 0, displaySuffix: 'c' },
        { idPrefix: 'amOscType', type: 'select', label: 'Carrier Type', options: ['sine', 'square', 'sawtooth', 'triangle'], paramPath: 'oscillator.type' },
        { idPrefix: 'amEnvAttack', type: 'knob', label: 'Carr. Attack', min: 0.005, max: 2, step: 0.001, paramPath: 'envelope.attack', decimals: 3 },
        { idPrefix: 'amEnvDecay', type: 'knob', label: 'Carr. Decay', min: 0.01, max: 2, step: 0.01, paramPath: 'envelope.decay', decimals: 2 },
        { idPrefix: 'amEnvSustain', type: 'knob', label: 'Carr. Sustain', min: 0, max: 1, step: 0.01, paramPath: 'envelope.sustain', decimals: 2 },
        { idPrefix: 'amEnvRelease', type: 'knob', label: 'Carr. Release', min: 0.01, max: 5, step: 0.01, paramPath: 'envelope.release', decimals: 2 },
        { idPrefix: 'amModType', type: 'select', label: 'Mod Type', options: ['sine', 'square', 'sawtooth', 'triangle'], paramPath: 'modulation.type' },
        { idPrefix: 'amModEnvAttack', type: 'knob', label: 'Mod Attack', min: 0.005, max: 2, step: 0.001, paramPath: 'modulationEnvelope.attack', decimals: 3 },
        { idPrefix: 'amModEnvDecay', type: 'knob', label: 'Mod Decay', min: 0.01, max: 2, step: 0.01, paramPath: 'modulationEnvelope.decay', decimals: 2 },
        { idPrefix: 'amModEnvSustain', type: 'knob', label: 'Mod Sustain', min: 0, max: 1, step: 0.01, paramPath: 'modulationEnvelope.sustain', decimals: 2 },
        { idPrefix: 'amModEnvRelease', type: 'knob', label: 'Mod Release', min: 0.01, max: 5, step: 0.01, paramPath: 'modulationEnvelope.release', decimals: 2 }
    ],
    'FMSynth': [
        { idPrefix: 'fmHarmonicity', type: 'knob', label: 'Harmonicity', min: 0.1, max: 20, step: 0.1, paramPath: 'harmonicity', decimals: 1 },
        { idPrefix: 'fmModIndex', type: 'knob', label: 'Mod Index', min: 0.1, max: 100, step: 0.1, paramPath: 'modulationIndex', decimals: 1 },
        { idPrefix: 'fmDetune', type: 'knob', label: 'Detune', min: -1200, max: 1200, step: 1, paramPath: 'detune', decimals: 0, displaySuffix: 'c' },
        { idPrefix: 'fmOscType', type: 'select', label: 'Carrier Type', options: ['sine', 'square', 'sawtooth', 'triangle', 'pwm', 'pulse'], paramPath: 'oscillator.type' },
        { idPrefix: 'fmEnvAttack', type: 'knob', label: 'Carr. Attack', min: 0.005, max: 2, step: 0.001, paramPath: 'envelope.attack', decimals: 3 },
        { idPrefix: 'fmEnvDecay', type: 'knob', label: 'Carr. Decay', min: 0.01, max: 2, step: 0.01, paramPath: 'envelope.decay', decimals: 2 },
        { idPrefix: 'fmEnvSustain', type: 'knob', label: 'Carr. Sustain', min: 0, max: 1, step: 0.01, paramPath: 'envelope.sustain', decimals: 2 },
        { idPrefix: 'fmEnvRelease', type: 'knob', label: 'Carr. Release', min: 0.01, max: 5, step: 0.01, paramPath: 'envelope.release', decimals: 2 },
        { idPrefix: 'fmModType', type: 'select', label: 'Mod Type', options: ['sine', 'square', 'sawtooth', 'triangle'], paramPath: 'modulation.type' },
        { idPrefix: 'fmModEnvAttack', type: 'knob', label: 'Mod Attack', min: 0.005, max: 2, step: 0.001, paramPath: 'modulationEnvelope.attack', decimals: 3 },
        { idPrefix: 'fmModEnvDecay', type: 'knob', label: 'Mod Decay', min: 0.01, max: 2, step: 0.01, paramPath: 'modulationEnvelope.decay', decimals: 2 },
        { idPrefix: 'fmModEnvSustain', type: 'knob', label: 'Mod Sustain', min: 0, max: 1, step: 0.01, paramPath: 'modulationEnvelope.sustain', decimals: 2 },
        { idPrefix: 'fmModEnvRelease', type: 'knob', label: 'Mod Release', min: 0.01, max: 5, step: 0.01, paramPath: 'modulationEnvelope.release', decimals: 2 }
    ]
};


export function buildTrackInspectorContentDOM(track) {
    const contentDiv = document.createElement('div');
    contentDiv.className = 'track-inspector-content p-2 space-y-1';

    const headerDiv = document.createElement('div');
    headerDiv.className = 'flex items-center justify-between mb-1';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = `trackNameDisplay-${track.id}`;
    nameInput.value = track.name; // Will reflect "Sampler (Pads) X" if type is DrumSampler
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
    muteBtn.addEventListener('click', () => handleTrackMute(track.id));
    actionsDiv.appendChild(muteBtn);

    const soloBtn = document.createElement('button');
    soloBtn.id = `soloBtn-${track.id}`;
    const currentSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
    soloBtn.className = `solo-button text-xs p-1 ${currentSoloId === track.id ? 'soloed' : ''}`;
    soloBtn.textContent = 'S';
    soloBtn.addEventListener('click', () => handleTrackSolo(track.id));
    actionsDiv.appendChild(soloBtn);

    const armBtn = document.createElement('button');
    armBtn.id = `armInputBtn-${track.id}`;
    const currentArmedId = typeof window.getArmedTrackId === 'function' ? window.getArmedTrackId() : null;
    armBtn.className = `arm-input-button text-xs p-1 ${currentArmedId === track.id ? 'armed' : ''}`;
    armBtn.textContent = 'Arm';
    armBtn.addEventListener('click', () => handleTrackArm(track.id));
    actionsDiv.appendChild(armBtn);

    const removeBtn = document.createElement('button');
    removeBtn.id = `removeTrackBtn-${track.id}`;
    removeBtn.className = 'bg-red-500 hover:bg-red-600 text-white text-xs py-0.5 px-1.5 rounded ml-auto';
    removeBtn.textContent = 'Del';
    removeBtn.addEventListener('click', () => handleRemoveTrack(track.id));
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
    seqLengthContainer.className = 'flex flex-col items-center space-y-1';
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

    const doubleSeqButton = document.createElement('button');
    doubleSeqButton.id = `doubleSeqBtn-${track.id}`;
    doubleSeqButton.className = 'bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded w-full mt-1';
    doubleSeqButton.textContent = 'Double Steps (x2)';
    doubleSeqButton.title = 'Double sequence length and content';
    doubleSeqButton.addEventListener('click', async () => {
        if (track && typeof track.doubleSequence === 'function') {
            const result = await track.doubleSequence();
            if (result && typeof showNotification === 'function') {
                showNotification(result.message, result.success ? 2000 : 3000);
            }
        } else {
            console.error("Could not find track or doubleSequence method for track ID:", track.id);
            if (typeof showNotification === 'function') {
                showNotification("Error: Could not double sequence.", 3000);
            }
        }
    });
    seqLengthContainer.appendChild(doubleSeqButton);

    controlGroup.appendChild(seqLengthContainer);
    trackControlsPanel.appendChild(controlGroup);
    contentDiv.appendChild(trackControlsPanel);

    let specificContentElement;
    if (track.type === 'Synth') {
        specificContentElement = buildSynthSpecificInspectorDOM(track);
    } else if (track.type === 'Sampler') { // This is the Slicer Sampler
        specificContentElement = buildSamplerSpecificInspectorDOM(track);
    } else if (track.type === 'DrumSampler') { // This is our Pad Sampler
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
    effectsButton.addEventListener('click', () => handleOpenEffectsRack(track.id));
    contentDiv.appendChild(effectsButton);

    const sequencerButton = document.createElement('button');
    sequencerButton.className = 'bg-indigo-500 hover:bg-indigo-600 text-white text-xs py-1 px-2 rounded mt-1 w-full';
    sequencerButton.textContent = 'Sequencer';
    sequencerButton.addEventListener('click', () => handleOpenSequencer(track.id));
    contentDiv.appendChild(sequencerButton);

    return contentDiv;
}

function buildSynthSpecificInspectorDOM(track) {
    const panel = document.createElement('div');
    panel.className = 'panel synth-panel';

    const engineSelectLabel = document.createElement('label');
    engineSelectLabel.htmlFor = `synthEngineType-${track.id}`;
    engineSelectLabel.className = 'text-sm font-semibold block mb-1';
    engineSelectLabel.textContent = 'Synth Engine:';
    panel.appendChild(engineSelectLabel);

    const engineSelect = document.createElement('select');
    engineSelect.id = `synthEngineType-${track.id}`;
    engineSelect.className = 'text-xs p-1 border w-full mb-2 bg-white text-black rounded-sm';
    ['BasicPoly', 'AMSynth', 'FMSynth'].forEach(engine => {
        const option = document.createElement('option');
        option.value = engine;
        let friendlyName = engine;
        if (engine === 'BasicPoly') friendlyName = 'Basic Poly';
        else if (engine === 'AMSynth') friendlyName = 'AM Synth';
        else if (engine === 'FMSynth') friendlyName = 'FM Synth';
        option.textContent = friendlyName;
        engineSelect.appendChild(option);
    });
    engineSelect.value = track.synthEngineType;
    panel.appendChild(engineSelect);

    const engineControlsContainer = document.createElement('div');
    engineControlsContainer.id = `synthEngineControls-${track.id}`;
    engineControlsContainer.className = 'synth-engine-controls-container mt-2';
    panel.appendChild(engineControlsContainer);

    buildSynthEngineControls(track, engineControlsContainer, track.synthEngineType);

    return panel;
}

function buildSynthEngineControls(track, container, engineType) {
    container.innerHTML = '';
    const controls = synthEngineControlDefinitions[engineType];
    if (!controls) {
        container.textContent = `Controls for ${engineType} not defined.`;
        return;
    }

    const controlGroup = document.createElement('div');
    controlGroup.className = 'control-group';

    controls.forEach(controlDef => {
        const controlId = `${controlDef.idPrefix}-${track.id}`;

        let paramsKey;
        if (engineType === 'BasicPoly') paramsKey = 'basicPoly';
        else if (engineType === 'AMSynth') paramsKey = 'amSynth';
        else if (engineType === 'FMSynth') paramsKey = 'fmSynth';
        else paramsKey = engineType.toLowerCase();

        let currentEngineParams = track.synthParams[paramsKey];
        if (!currentEngineParams) {
            console.warn(`[ui.js] Params for engine ${engineType} (key: ${paramsKey}) not found in track.synthParams. Using defaults. track.synthParams:`, JSON.parse(JSON.stringify(track.synthParams)));
            currentEngineParams = track.getDefaultSynthParams(engineType);
            track.synthParams[paramsKey] = currentEngineParams;
        }

        const getNestedValue = (obj, path) => {
            if (!obj || !path) return undefined;
            const keys = path.split('.');
            let current = obj;
            for (const key of keys) {
                if (current && typeof current === 'object' && key in current) {
                    current = current[key];
                } else { return undefined; }
            }
            return current;
        };

        let initialValue = getNestedValue(currentEngineParams, controlDef.paramPath);

        if (initialValue === undefined) {
            console.warn(`[ui.js] Initial value for ${controlDef.paramPath} not found in currentEngineParams for ${engineType}. Trying defaults. currentEngineParams:`, JSON.parse(JSON.stringify(currentEngineParams)));
            const defaultEngineParams = track.getDefaultSynthParams(engineType);
            initialValue = getNestedValue(defaultEngineParams, controlDef.paramPath);
            if(initialValue === undefined && controlDef.type === 'knob') initialValue = controlDef.min;
            if(initialValue === undefined && controlDef.type === 'select') initialValue = controlDef.options[0];
            console.log(`[ui.js] Fallback initialValue for ${controlDef.paramPath}:`, initialValue);
        }

        if (controlDef.type === 'select') {
            const selectContainer = document.createElement('div');
            selectContainer.className = 'mb-2 flex flex-col items-start';
            const labelEl = document.createElement('label');
            labelEl.htmlFor = controlId;
            labelEl.className = 'knob-label text-xs mb-0.5';
            labelEl.textContent = controlDef.label;
            selectContainer.appendChild(labelEl);

            const selectEl = document.createElement('select');
            selectEl.id = controlId;
            selectEl.className = 'text-xs p-1 border w-full bg-white text-black rounded-sm';
            controlDef.options.forEach(opt => selectEl.add(new Option(opt, opt)));
            selectEl.value = initialValue;
            selectEl.addEventListener('change', (e) => {
                if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set ${track.name} ${controlDef.label} to ${e.target.value}`);
                track.setSynthParam(controlDef.paramPath, e.target.value);
            });
            selectContainer.appendChild(selectEl);
            controlGroup.appendChild(selectContainer);
        } else if (controlDef.type === 'knob') {
            const knob = createKnob({
                label: controlDef.label,
                min: controlDef.min, max: controlDef.max, step: controlDef.step,
                initialValue: initialValue,
                decimals: controlDef.decimals, displaySuffix: controlDef.displaySuffix,
                trackRef: track,
                onValueChange: (val) => {
                    track.setSynthParam(controlDef.paramPath, val);
                }
            });
            controlGroup.appendChild(knob.element);
            if (!track.inspectorControls) track.inspectorControls = {};
            track.inspectorControls[controlDef.idPrefix] = knob;
        }
    });
    container.appendChild(controlGroup);
}

function buildSamplerSpecificInspectorDOM(track) { // This is for the Slicer Sampler
    console.log(`[ui.js] buildSamplerSpecificInspectorDOM called for track ${track.id}`);
    const panel = document.createElement('div');
    panel.className = 'panel sampler-panel'; // Keep class for styling if any

    const dropZoneContainer = document.createElement('div');
    dropZoneContainer.id = `dropZoneContainer-${track.id}-sampler`;
    // For Slicer Sampler, padOrSliceIndex is null for the main dropzone
    const dropZoneHTML = createDropZoneHTML(track.id, `fileInput-${track.id}`, 'Sampler', null);
    dropZoneContainer.innerHTML = dropZoneHTML;
    panel.appendChild(dropZoneContainer);
    console.log(`[ui.js] Slicer Sampler drop zone container created and appended for track ${track.id}`);

    const editorPanel = document.createElement('div');
    editorPanel.className = 'sampler-editor-panel mt-1 flex flex-wrap md:flex-nowrap gap-3';
    const leftSide = document.createElement('div');
    leftSide.className = 'flex-grow w-full md:w-3/5';
    const canvas = document.createElement('canvas');
    canvas.id = `waveformCanvas-${track.id}`;
    canvas.className = 'waveform-canvas w-full';
    canvas.width = 380; canvas.height = 70;
    leftSide.appendChild(canvas);
    const padsContainer = document.createElement('div'); // This is for slice buttons
    padsContainer.id = `samplePadsContainer-${track.id}`; // For Slicer, these are slice selectors
    padsContainer.className = 'pads-container mt-2';
    console.log(`[ui.js] Slicer Sampler slice selector padsContainer created for track ${track.id}:`, padsContainer);
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
    polyBtn.textContent = 'Mode: Poly';
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
    console.log(`[ui.js] buildSamplerSpecificInspectorDOM returning panel for track ${track.id}:`, panel);
    return panel;
}

function buildDrumSamplerSpecificInspectorDOM(track) { // This is for the Pad Sampler
    console.log(`[ui.js] buildDrumSamplerSpecificInspectorDOM called for track ${track.id}`);
    const panel = document.createElement('div');
    panel.className = 'panel drum-sampler-panel'; // Keep internal class if styles depend on it
    const title = document.createElement('h4');
    title.className = 'text-sm font-semibold mb-1';
    // MODIFIED UI TEXT
    title.innerHTML = `Sampler Pads (Selected: <span id="selectedDrumPadLabel-${track.id}">${track.selectedDrumPadForEdit + 1}</span>)`;
    panel.appendChild(title);
    const padsContainer = document.createElement('div');
    padsContainer.id = `drumSamplerPadsContainer-${track.id}`; // This is for the actual pad buttons
    padsContainer.className = 'pads-container mb-2'; // Ensure this class allows for grid/flex display
    console.log(`[ui.js] Sampler (Pads) padsContainer created for track ${track.id}:`, padsContainer);
    panel.appendChild(padsContainer);

    // Controls for the currently selected pad
    const controlsContainer = document.createElement('div');
    controlsContainer.id = `drumPadControlsContainer-${track.id}`;
    controlsContainer.className = 'border-t pt-2';

    // Dropzone and file name display for the selected pad's sample
    const loadContainer = document.createElement('div');
    loadContainer.id = `drumPadLoadContainer-${track.id}`; // This is specifically for loading to selected pad
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
    console.log(`[ui.js] buildDrumSamplerSpecificInspectorDOM returning panel for track ${track.id}:`, panel);
    return panel;
}

function buildInstrumentSamplerSpecificInspectorDOM(track) {
    console.log(`[ui.js] buildInstrumentSamplerSpecificInspectorDOM called for track ${track.id}`);
    const panel = document.createElement('div');
    panel.className = 'panel instrument-sampler-panel';
    const dropZoneContainer = document.createElement('div');
    dropZoneContainer.id = `dropZoneContainer-${track.id}-instrumentsampler`;
    const dropZoneHTML = createDropZoneHTML(track.id, `instrumentFileInput-${track.id}`, 'InstrumentSampler', null);
    dropZoneContainer.innerHTML = dropZoneHTML;
    panel.appendChild(dropZoneContainer);
    console.log(`[ui.js] Instrument Sampler drop zone container created for track ${track.id}`);

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
    polyBtn.textContent = 'Mode: Poly';
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
    console.log(`[ui.js] buildInstrumentSamplerSpecificInspectorDOM returning panel for track ${track.id}:`, panel);
    return panel;
}

export function initializeCommonInspectorControls(track, winEl) {
    winEl.querySelector(`#trackNameDisplay-${track.id}`)?.addEventListener('change', (e) => {
        const oldName = track.name;
        const newName = e.target.value;
        if (oldName !== newName && typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Rename Track "${oldName}" to "${newName}"`);
        }
        track.name = newName;
        if (track.inspectorWindow?.titleBar) {
            track.inspectorWindow.titleBar.querySelector('span').textContent = `Track: ${track.name}`;
        }
        if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
    });

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
        volSliderContainer.innerHTML = '';
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
                track.setSequenceLength(numSteps, false);
                seqLenDisplaySpan.textContent = `${numBars} bars (${numSteps} steps)`;
            }
        });
    }
}

export function initializeTypeSpecificInspectorControls(track, winEl) {
    console.log(`[ui.js] initializeTypeSpecificInspectorControls for track ${track.id}, type: ${track.type}`);
    if (track.type === 'Synth') {
        initializeSynthSpecificControls(track, winEl);
    } else if (track.type === 'Sampler') { // Slicer
        initializeSamplerSpecificControls(track, winEl);
    } else if (track.type === 'DrumSampler') { // Pad Sampler
        initializeDrumSamplerSpecificControls(track, winEl);
    } else if (track.type === 'InstrumentSampler') {
        initializeInstrumentSamplerSpecificControls(track, winEl);
    }
}

function initializeSynthSpecificControls(track, winEl) {
    console.log(`[ui.js] initializeSynthSpecificControls for track ${track.id}`);
    const engineSelect = winEl.querySelector(`#synthEngineType-${track.id}`);
    const controlsContainer = winEl.querySelector(`#synthEngineControls-${track.id}`);

    if (engineSelect && controlsContainer) {
        engineSelect.addEventListener('change', async (e) => {
            const newEngineType = e.target.value;
            console.log(`[ui.js] Synth engine changed for track ${track.id} to: ${newEngineType}`);
            if (typeof window.captureStateForUndo === 'function') {
                window.captureStateForUndo(`Change ${track.name} Synth Engine to ${newEngineType}`);
            }
            track.synthEngineType = newEngineType;

            let paramsKey;
            if (newEngineType === 'BasicPoly') paramsKey = 'basicPoly';
            else if (newEngineType === 'AMSynth') paramsKey = 'amSynth';
            else if (newEngineType === 'FMSynth') paramsKey = 'fmSynth';
            else paramsKey = newEngineType.toLowerCase();

            if (paramsKey && !track.synthParams[paramsKey]) {
                 console.log(`[ui.js] Synth params for ${newEngineType} (key: ${paramsKey}) not found, initializing with defaults.`);
                 track.synthParams[paramsKey] = track.getDefaultSynthParams(newEngineType);
            } else if (!paramsKey) {
                console.warn(`[ui.js] Unknown paramsKey derived for engineType ${newEngineType}`);
            }


            if (typeof track.initializeInstrument === 'function') {
                console.log(`[ui.js] Calling track.initializeInstrument() for engine ${newEngineType}`);
                await track.initializeInstrument();
            } else {
                console.error(`[ui.js] track.initializeInstrument is not a function for track ${track.id}`);
            }

            buildSynthEngineControls(track, controlsContainer, newEngineType);

            setTimeout(() => {
                const currentControls = synthEngineControlDefinitions[newEngineType] || [];
                currentControls.forEach(controlDef => {
                    if (controlDef.type === 'knob' && track.inspectorControls && track.inspectorControls[controlDef.idPrefix]) {
                        track.inspectorControls[controlDef.idPrefix].refreshVisuals();
                    }
                });
            }, 50);
        });
    } else {
        console.error(`[ui.js] Synth engine select or controls container not found for track ${track.id}`);
    }
}

function initializeSamplerSpecificControls(track, winEl) { // Slicer Sampler
    console.log(`[ui.js] initializeSamplerSpecificControls for track ${track.id} (Slicer Sampler). winEl:`, winEl);
    const dropZoneContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-sampler`);
    const fileInputEl = winEl.querySelector(`#fileInput-${track.id}`);

    if (dropZoneContainerEl && fileInputEl) {
        const dropZoneEl = dropZoneContainerEl.querySelector('.drop-zone');
        if (dropZoneEl) {
            console.log(`[ui.js] Slicer Sampler drop zone FOUND via container for track ${track.id}. Setting up listeners.`);
            // For the main dropzone of a Slicer, padIndexOrSliceId is null
            utilSetupDropZoneListeners(dropZoneEl, track.id, 'Sampler', null, window.loadSoundFromBrowserToTarget, window.loadSampleFile);
        } else {
            console.warn(`[ui.js] Slicer Sampler (Track ID: ${track.id}): .drop-zone element NOT FOUND within its container.`);
        }
        fileInputEl.onchange = (e) => {
            window.loadSampleFile(e, track.id, 'Sampler'); // Correct type hint
        };
    } else {
        console.warn(`[ui.js] Slicer Sampler (Track ID: ${track.id}): Drop zone container or file input NOT FOUND. Container: ${dropZoneContainerEl}, FileInput: ${fileInputEl}`);
    }

    if (typeof renderSamplePads === 'function') { // This renders slice selector buttons for Slicer
        console.log(`[ui.js] Calling renderSamplePads (slice selectors) for Slicer track ${track.id}`);
        renderSamplePads(track);
    } else {
        console.error(`[ui.js] renderSamplePads function not found!`);
    }

    winEl.querySelector(`#applySliceEditsBtn-${track.id}`)?.addEventListener('click', () => {
        if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Apply Slice Edits for ${track.name}`);
        applySliceEdits(track.id);
    });

    const canvas = winEl.querySelector(`#waveformCanvas-${track.id}`);
    if (canvas) {
        track.waveformCanvasCtx = canvas.getContext('2d');
        console.log(`[ui.js] Waveform canvas context set for Slicer track ${track.id}`);
        if(typeof window.drawWaveform === 'function') window.drawWaveform(track);
    } else {
        console.warn(`[ui.js] Waveform canvas not found for Slicer track ${track.id}`);
    }

    if (typeof updateSliceEditorUI === 'function') {
        console.log(`[ui.js] Calling updateSliceEditorUI for Slicer track ${track.id}`);
        updateSliceEditorUI(track);
    } else {
         console.error(`[ui.js] updateSliceEditorUI function not found!`);
    }

    const sVolK = createKnob({ label: 'Vol', min:0, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceVolume(track.selectedSliceForEdit, val)});
    const volPlaceholder = winEl.querySelector(`#sliceVolumeSlider-${track.id}`);
    if(volPlaceholder) { volPlaceholder.innerHTML = ''; volPlaceholder.appendChild(sVolK.element); } else console.warn(`[ui.js] Placeholder #sliceVolumeSlider-${track.id} not found.`);
    track.inspectorControls.sliceVolume = sVolK;

    const sPitK = createKnob({ label: 'Pitch', min:-24, max:24, step:1, initialValue: track.slices[track.selectedSliceForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setSlicePitchShift(track.selectedSliceForEdit, val)});
    const pitchPlaceholder = winEl.querySelector(`#slicePitchKnob-${track.id}`);
    if(pitchPlaceholder) { pitchPlaceholder.innerHTML = ''; pitchPlaceholder.appendChild(sPitK.element); } else console.warn(`[ui.js] Placeholder #slicePitchKnob-${track.id} not found.`);
    track.inspectorControls.slicePitch = sPitK;

    const sEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.attack || 0.01, decimals:3, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'attack', val)});
    const attackEnvPlaceholder = winEl.querySelector(`#sliceEnvAttackSlider-${track.id}`);
    if(attackEnvPlaceholder) { attackEnvPlaceholder.innerHTML = ''; attackEnvPlaceholder.appendChild(sEAK.element); } else console.warn(`[ui.js] Placeholder #sliceEnvAttackSlider-${track.id} not found.`);
    track.inspectorControls.sliceEnvAttack = sEAK;

    const sEDK = createKnob({ label: 'Decay', min:0.01, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.decay || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'decay', val)});
    const decayEnvPlaceholder = winEl.querySelector(`#sliceEnvDecaySlider-${track.id}`);
    if(decayEnvPlaceholder) { decayEnvPlaceholder.innerHTML = ''; decayEnvPlaceholder.appendChild(sEDK.element); } else console.warn(`[ui.js] Placeholder #sliceEnvDecaySlider-${track.id} not found.`);
    track.inspectorControls.sliceEnvDecay = sEDK;

    const sESK = createKnob({ label: 'Sustain', min:0, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.sustain || 1.0, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'sustain', val)});
    const sustainEnvPlaceholder = winEl.querySelector(`#sliceEnvSustainSlider-${track.id}`);
    if(sustainEnvPlaceholder) { sustainEnvPlaceholder.innerHTML = ''; sustainEnvPlaceholder.appendChild(sESK.element); } else console.warn(`[ui.js] Placeholder #sliceEnvSustainSlider-${track.id} not found.`);
    track.inspectorControls.sliceEnvSustain = sESK;

    const sERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'release', val)});
    const releaseEnvPlaceholder = winEl.querySelector(`#sliceEnvReleaseSlider-${track.id}`);
    if(releaseEnvPlaceholder) { releaseEnvPlaceholder.innerHTML = ''; releaseEnvPlaceholder.appendChild(sERK.element); } else console.warn(`[ui.js] Placeholder #sliceEnvReleaseSlider-${track.id} not found.`);
    track.inspectorControls.sliceEnvRelease = sERK;

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

function initializeDrumSamplerSpecificControls(track, winEl) { // Pad Sampler
    console.log(`[ui.js] initializeDrumSamplerSpecificControls for track ${track.id}. winEl:`, winEl);

    // The load container for the *selected* pad's sample
    const padLoadContainerToUse = winEl.querySelector(`#drumPadLoadContainer-${track.id}`);
    if (padLoadContainerToUse && typeof updateDrumPadControlsUI === 'function') {
        updateDrumPadControlsUI(track); // Sets up dropzone for the selected pad's load area
    } else if (!padLoadContainerToUse) {
        console.warn(`[ui.js] Sampler (Pads) (Track ID: ${track.id}): #drumPadLoadContainer-${track.id} NOT FOUND.`);
    } else {
        console.error(`[ui.js] updateDrumPadControlsUI function not found!`);
    }

    // Render the actual pad buttons (which are now also drop targets)
    if (typeof renderDrumSamplerPads === 'function') {
        console.log(`[ui.js] Calling renderDrumSamplerPads for track ${track.id}`);
        renderDrumSamplerPads(track); // This will make each pad a drop target
    } else {
         console.error(`[ui.js] renderDrumSamplerPads function not found!`);
    }

    const pVolK = createKnob({ label: 'Pad Vol', min:0, max:1, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadVolume(track.selectedDrumPadForEdit, val)});
    const volPlaceholder = winEl.querySelector(`#drumPadVolumeSlider-${track.id}`);
    if(volPlaceholder) { volPlaceholder.innerHTML = ''; volPlaceholder.appendChild(pVolK.element); } else console.warn(`[ui.js] Placeholder #drumPadVolumeSlider-${track.id} not found.`);
    track.inspectorControls.drumPadVolume = pVolK;

    const pPitK = createKnob({ label: 'Pad Pitch', min:-24, max:24, step:1, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setDrumSamplerPadPitch(track.selectedDrumPadForEdit, val)});
    const pitchPlaceholder = winEl.querySelector(`#drumPadPitchKnob-${track.id}`);
    if(pitchPlaceholder) { pitchPlaceholder.innerHTML = ''; pitchPlaceholder.appendChild(pPitK.element); } else console.warn(`[ui.js] Placeholder #drumPadPitchKnob-${track.id} not found.`);
    track.inspectorControls.drumPadPitch = pPitK;

    const pEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.attack || 0.005, decimals:3, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'attack', val)});
    const attackPlaceholder = winEl.querySelector(`#drumPadEnvAttackSlider-${track.id}`);
    if(attackPlaceholder) { attackPlaceholder.innerHTML = ''; attackPlaceholder.appendChild(pEAK.element); } else console.warn(`[ui.js] Placeholder #drumPadEnvAttackSlider-${track.id} not found.`);
    track.inspectorControls.drumPadEnvAttack = pEAK;

    const pERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'release', val)});
    const releasePlaceholder = winEl.querySelector(`#drumPadEnvReleaseSlider-${track.id}`);
    if(releasePlaceholder) { releasePlaceholder.innerHTML = ''; releasePlaceholder.appendChild(pERK.element); } else console.warn(`[ui.js] Placeholder #drumPadEnvReleaseSlider-${track.id} not found.`);
    track.inspectorControls.drumPadEnvRelease = pERK;
}

function initializeInstrumentSamplerSpecificControls(track, winEl) {
    console.log(`[ui.js] initializeInstrumentSamplerSpecificControls for track ${track.id}`);
    const dropZoneContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-instrumentsampler`);
    const fileInputEl = winEl.querySelector(`#instrumentFileInput-${track.id}`);

    if (dropZoneContainerEl && fileInputEl) {
        const dropZoneEl = dropZoneContainerEl.querySelector('.drop-zone');
        if (dropZoneEl) {
            console.log(`[ui.js] Instrument Sampler drop zone FOUND via container for track ${track.id}.`);
            utilSetupDropZoneListeners(dropZoneEl, track.id, 'InstrumentSampler', null, window.loadSoundFromBrowserToTarget, window.loadSampleFile);
        } else {
             console.warn(`[ui.js] Instrument Sampler .drop-zone NOT FOUND in container for track ${track.id}.`);
        }
        fileInputEl.onchange = (e) => {
            window.loadSampleFile(e, track.id, 'InstrumentSampler');
        };
    } else {
        console.warn(`[ui.js] Instrument Sampler (Track ID: ${track.id}): Drop zone container or file input NOT FOUND. Container: ${dropZoneContainerEl}, FileInput: ${fileInputEl}`);
    }

    const iCanvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`);
    if(iCanvas) {
        track.instrumentWaveformCanvasCtx = iCanvas.getContext('2d');
        console.log(`[ui.js] Instrument waveform canvas context set for track ${track.id}`);
        if(typeof window.drawInstrumentWaveform === 'function') window.drawInstrumentWaveform(track);
    } else {
        console.warn(`[ui.js] Instrument waveform canvas not found for track ${track.id}`);
    }

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
    const iAttackPlaceholder = winEl.querySelector(`#instrumentEnvAttackSlider-${track.id}`);
    if(iAttackPlaceholder) { iAttackPlaceholder.innerHTML = ''; iAttackPlaceholder.appendChild(iEAK.element); } else console.warn(`[ui.js] Placeholder #instrumentEnvAttackSlider-${track.id} not found.`);
    track.inspectorControls.instEnvAttack = iEAK;

    const iEDK = createKnob({ label: 'Decay', min:0.01, max:2, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('decay',val) });
    const iDecayPlaceholder = winEl.querySelector(`#instrumentEnvDecaySlider-${track.id}`);
    if(iDecayPlaceholder) { iDecayPlaceholder.innerHTML = ''; iDecayPlaceholder.appendChild(iEDK.element); } else console.warn(`[ui.js] Placeholder #instrumentEnvDecaySlider-${track.id} not found.`);
    track.inspectorControls.instEnvDecay = iEDK;

    const iESK = createKnob({ label: 'Sustain', min:0, max:1, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('sustain',val) });
    const iSustainPlaceholder = winEl.querySelector(`#instrumentEnvSustainSlider-${track.id}`);
    if(iSustainPlaceholder) { iSustainPlaceholder.innerHTML = ''; iSustainPlaceholder.appendChild(iESK.element); } else console.warn(`[ui.js] Placeholder #instrumentEnvSustainSlider-${track.id} not found.`);
    track.inspectorControls.instEnvSustain = iESK;

    const iERK = createKnob({ label: 'Release', min:0.01, max:5, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.release, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('release',val) });
    const iReleasePlaceholder = winEl.querySelector(`#instrumentEnvReleaseSlider-${track.id}`);
    if(iReleasePlaceholder) { iReleasePlaceholder.innerHTML = ''; iReleasePlaceholder.appendChild(iERK.element); } else console.warn(`[ui.js] Placeholder #instrumentEnvReleaseSlider-${track.id} not found.`);
    track.inspectorControls.instEnvRelease = iERK;
}

export function openGlobalControlsWindow(savedState = null) {
    console.log("[ui.js] openGlobalControlsWindow STARTING...");
    const windowId = 'globalControls';

    if (typeof SnugWindow !== 'function') {
        console.error("[ui.js] SnugWindow is NOT a function in openGlobalControlsWindow!");
        return null;
    }

    if (window.openWindows && window.openWindows[windowId] && !savedState) {
        console.log("[ui.js] Restoring existing Global Controls window.");
        window.openWindows[windowId].restore();
        return window.openWindows[windowId];
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'global-controls-window p-2 space-y-3';
    try {
        let tempoValue = 120.0;
        if (typeof Tone !== 'undefined' && Tone.Transport) {
            tempoValue = Tone.Transport.bpm.value.toFixed(1);
        } else {
            console.warn("[ui.js] Tone.Transport not ready for tempo value in Global Controls innerHTML.");
        }
        contentDiv.innerHTML = `
            <div class="flex items-center gap-2">
                <button id="playBtnGlobal" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-3 rounded-sm shadow">Play</button>
                <button id="recordBtnGlobal" class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-sm shadow">Record</button>
            </div>
            <div class="flex items-center gap-2">
                <label for="tempoGlobalInput" class="control-label text-xs">Tempo:</label>
                <input type="number" id="tempoGlobalInput" value="${tempoValue}" min="40" max="240" step="0.1" class="bg-white text-black w-16 p-1 rounded-sm text-center text-xs border border-gray-500">
                <span class="text-xs"> BPM</span>
            </div>
            <div class="flex items-center gap-2 mt-2">
                <label for="midiInputSelectGlobal" class="text-xs">MIDI In:</label>
                <select id="midiInputSelectGlobal" class="bg-white text-black p-1 rounded-sm text-xs border border-gray-500 flex-grow"></select>
                <span id="midiIndicatorGlobal" title="MIDI Activity" class="border border-black w-3 h-3 inline-block rounded-full bg-gray-400"></span>
                <span id="keyboardIndicatorGlobal" title="Keyboard Input Activity" class="border border-black w-3 h-3 inline-block rounded-full bg-gray-400"></span>
            </div>
            <div id="masterMeterContainerGlobal" class="meter-bar-container mt-2" title="Master Output Level" style="height:15px;">
                <div id="masterMeterBarGlobal" class="meter-bar" style="width: 0%;"></div>
            </div>
        `;
    } catch (e) {
        console.error("[ui.js] Error setting innerHTML for globalControls contentDiv:", e);
        showNotification("Error creating global controls content.", 5000);
        return null;
    }

    const winOptions = { width: 280, height: 250, x: 20, y: 20, initialContentKey: 'globalControls' };
    if (savedState) Object.assign(winOptions, savedState);

    console.log(`[ui.js] About to call 'new SnugWindow' for globalControls. SnugWindow class is:`, SnugWindow);
    let globalControlsWin = null;
    try {
        globalControlsWin = new SnugWindow(windowId, 'Global Controls', contentDiv, winOptions);
        console.log('[ui.js] SnugWindow instance for globalControls created (or attempted):', globalControlsWin);
    } catch (e) {
        console.error('[ui.js] CRITICAL ERROR during `new SnugWindow()` instantiation for globalControls:', e);
        showNotification("CRITICAL: Error creating window object. Check console.", 6000);
        return null;
    }

    console.log('[ui.js] DETAILED CHECK for globalControlsWin:');
    const isInstanceValid = globalControlsWin instanceof SnugWindow;
    const hasElementProp = globalControlsWin && globalControlsWin.hasOwnProperty('element');
    const elementValue = globalControlsWin ? globalControlsWin.element : undefined;
    const isElementTruthy = !!elementValue;

    console.log(`[ui.js] typeof globalControlsWin: ${typeof globalControlsWin}`);
    console.log(`[ui.js] globalControlsWin instanceof SnugWindow: ${isInstanceValid}`);
    console.log(`[ui.js] globalControlsWin.hasOwnProperty('element'): ${hasElementProp}`);
    console.log(`[ui.js] globalControlsWin.element value:`, elementValue);
    console.log(`[ui.js] globalControlsWin.element is TRUTHY: ${isElementTruthy}`);

    if (!globalControlsWin || !elementValue) {
        console.error("[ui.js] CRITICAL CHECK FAILED (the main one): globalControlsWin is falsy OR globalControlsWin.element is falsy.");
        console.error(`[ui.js] Values for check: !globalControlsWin = ${!globalControlsWin}, !elementValue = ${!elementValue}`);
        showNotification("Failed to create Global Controls window (ui.js check).", 5000);
        return null;
    }

    window.playBtn = globalControlsWin.element.querySelector('#playBtnGlobal');
    window.recordBtn = globalControlsWin.element.querySelector('#recordBtnGlobal');
    window.tempoInput = globalControlsWin.element.querySelector('#tempoGlobalInput');
    window.masterMeterBar = globalControlsWin.element.querySelector('#masterMeterBarGlobal');
    window.midiInputSelectGlobal = globalControlsWin.element.querySelector('#midiInputSelectGlobal');
    window.midiIndicatorGlobalEl = globalControlsWin.element.querySelector('#midiIndicatorGlobal');
    window.keyboardIndicatorGlobalEl = globalControlsWin.element.querySelector('#keyboardIndicatorGlobal');

    if (typeof window.attachGlobalControlEvents === 'function' && globalControlsWin.element) {
        window.attachGlobalControlEvents(globalControlsWin.element);
    } else {
        console.warn("attachGlobalControlEvents not found or window element missing. Global controls might not work.");
    }
    console.log("[ui.js] openGlobalControlsWindow FINISHED SUCCESSFULLY.");
    return globalControlsWin;
}

export function openTrackInspectorWindow(trackId, savedState = null) {
    console.log(`[ui.js] openTrackInspectorWindow called for trackId: ${trackId}`);
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null;
    if (!track) {
        showNotification(`Track with ID ${trackId} not found. Cannot open inspector.`, 3000);
        console.error(`[ui.js] Track not found for ID ${trackId} in openTrackInspectorWindow.`);
        return null;
    }

    const inspectorId = `trackInspector-${track.id}`;
    if (window.openWindows[inspectorId] && !savedState) {
        console.log(`[ui.js] Restoring existing inspector window: ${inspectorId}`);
        window.openWindows[inspectorId].restore();
        return window.openWindows[inspectorId];
    }
    if (window.openWindows[inspectorId] && savedState) {
        console.log(`[ui.js] Closing existing inspector window ${inspectorId} before recreating from saved state.`);
        window.openWindows[inspectorId].close();
    }

    track.inspectorControls = {};
    console.log(`[ui.js] Building inspector content for track ${track.id} (${track.type})`);
    const inspectorContentElement = buildTrackInspectorContentDOM(track);
    if (!inspectorContentElement) {
        console.error(`[ui.js] buildTrackInspectorContentDOM returned null for track ${track.id}. Cannot create inspector.`);
        showNotification(`Failed to build content for Inspector (Track ${track.id}).`, 4000);
        return null;
    }

    let windowHeight = 450;
    if (track.type === 'Synth') windowHeight = 580;
    else if (track.type === 'Sampler') windowHeight = 620; // Slicer
    else if (track.type === 'DrumSampler') windowHeight = 580; // Pad Sampler
    else if (track.type === 'InstrumentSampler') windowHeight = 620;

    const winOptions = {
        width: Math.min(500, window.innerWidth - 40),
        height: Math.min(windowHeight, window.innerHeight - 80),
        initialContentKey: `trackInspector-${track.id}`
    };
    if (savedState) Object.assign(winOptions, savedState);

    // The title of the window will use track.name, which is now "Sampler (Pads) X" for DrumSampler type
    console.log(`[ui.js] About to create SnugWindow for inspector: ${inspectorId}. Window title: "Track: ${track.name}". SnugWindow class is:`, SnugWindow);
    let inspectorWin = null;
    try {
        inspectorWin = new SnugWindow(inspectorId, `Track: ${track.name}`, inspectorContentElement, winOptions);
        console.log(`[ui.js] SnugWindow instance for inspector ${inspectorId} created (or attempted):`, inspectorWin);
    } catch (e) {
        console.error(`[ui.js] CRITICAL ERROR during \`new SnugWindow()\` for inspector ${inspectorId}:`, e);
        showNotification("CRITICAL: Error creating inspector window object. Check console.", 6000);
        return null;
    }

    console.log(`[ui.js] DETAILED CHECK for inspectorWin (${inspectorId}):`);
    const isInspectorWinValid = inspectorWin instanceof SnugWindow;
    const inspectorHasElementProp = inspectorWin && inspectorWin.hasOwnProperty('element');
    const inspectorElementValue = inspectorWin ? inspectorWin.element : undefined;
    const isInspectorElementTruthy = !!inspectorElementValue;

    console.log(`[ui.js] typeof inspectorWin: ${typeof inspectorWin}`);
    console.log(`[ui.js] inspectorWin instanceof SnugWindow: ${isInspectorWinValid}`);
    console.log(`[ui.js] inspectorWin.hasOwnProperty('element'): ${inspectorHasElementProp}`);
    console.log(`[ui.js] inspectorWin.element value:`, inspectorElementValue);
    console.log(`[ui.js] inspectorWin.element is TRUTHY: ${isInspectorElementTruthy}`);

    if (!inspectorWin || !inspectorElementValue) {
        console.error(`[ui.js] CRITICAL CHECK FAILED for inspector ${inspectorId}: inspectorWin is falsy OR inspectorWin.element is falsy.`);
        showNotification(`Failed to create Inspector window for track ${track.id}.`, 5000);
        return null;
    }

    track.inspectorWindow = inspectorWin;
    console.log(`[ui.js] Inspector window for track ${track.id} assigned.`);

    initializeCommonInspectorControls(track, inspectorWin.element);
    initializeTypeSpecificInspectorControls(track, inspectorWin.element);

    setTimeout(() => {
        Object.values(track.inspectorControls).forEach(control => {
            if (control && control.type === 'knob' && typeof control.refreshVisuals === 'function') {
                control.refreshVisuals();
            }
        });
    }, 50);
    console.log(`[ui.js] Inspector window for track ${track.id} fully initialized and controls set up.`);
    return inspectorWin;
}

// ... (effectControlDefinitions and buildEffectsRackContentDOM remain the same) ...
// ... (openTrackEffectsRackWindow remains the same) ...
// ... (buildSequencerContentDOM, openTrackSequencerWindow, highlightPlayingStep remain the same) ...
// ... (openMixerWindow, updateMixerWindow, renderMixer remain the same) ...
// ... (Sound Browser functions remain the same) ...

export function renderSamplePads(track) { // For Slicer Sampler, renders slice selectors
    if (track.type !== 'Sampler') return; // Only for Slicer type

    console.log(`[ui.js] renderSamplePads (Slice Selectors) called for track ${track.id}. Slices count: ${track.slices?.length}`);
    if (!track || !track.inspectorWindow?.element) {
        console.warn(`[ui.js] renderSamplePads (Slices): Track ${track.id} or inspector window element not found.`);
        return;
    }
    const padsContainer = track.inspectorWindow.element.querySelector(`#samplePadsContainer-${track.id}`);
    if (!padsContainer) {
        console.warn(`[ui.js] renderSamplePads (Slices): Pads container '#samplePadsContainer-${track.id}' not found for track ${track.id}.`);
        return;
    }
    padsContainer.innerHTML = '';
    if (!track.slices || track.slices.length === 0) {
        console.warn(`[ui.js] renderSamplePads (Slices): No slices to render for track ${track.id}`);
        padsContainer.textContent = 'No slices available. Load a sample.';
        return;
    }
    track.slices.forEach((slice, index) => {
        const pad = document.createElement('button');
        pad.className = `pad-button ${index === track.selectedSliceForEdit ? 'selected-for-edit' : ''}`;
        pad.textContent = `Slice ${index + 1}`;
        pad.title = `Select Slice ${index + 1}. Click to preview.`;
        pad.dataset.trackId = track.id;
        pad.dataset.trackType = "Sampler"; // Slicer
        pad.dataset.padSliceIndex = index; // Using this for slice index
        pad.addEventListener('click', async () => {
            track.selectedSliceForEdit = index;
            console.log(`[ui.js] Slicer track ${track.id}, slice ${index + 1} selected`);
            if(typeof window.playSlicePreview === 'function') await window.playSlicePreview(track.id, index);
            renderSamplePads(track);
            updateSliceEditorUI(track);
        });
        padsContainer.appendChild(pad);
    });
    console.log(`[ui.js] renderSamplePads (Slices) finished for track ${track.id}. ${track.slices.length} slice selectors rendered into:`, padsContainer);
}

export function updateSliceEditorUI(track) { // For Slicer Sampler
    if (track.type !== 'Sampler') return;

    console.log(`[ui.js] updateSliceEditorUI called for Slicer track ${track.id}, selected slice: ${track.selectedSliceForEdit}`);
    if (!track || !track.inspectorWindow?.element) {
        console.warn(`[ui.js] updateSliceEditorUI: Pre-conditions not met for Slicer track ${track.id}`);
        return;
    }
    const inspectorEl = track.inspectorWindow.element;
    const selectedSlice = track.slices[track.selectedSliceForEdit];
    if (!selectedSlice) {
        console.warn(`[ui.js] updateSliceEditorUI: Selected slice ${track.selectedSliceForEdit} not found for Slicer track ${track.id}`);
        return;
    }
    const selectedSliceLabel = inspectorEl.querySelector(`#selectedSliceLabel-${track.id}`);
    if (selectedSliceLabel) selectedSliceLabel.textContent = (track.selectedSliceForEdit + 1).toString();
    
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
export function applySliceEdits(trackId) { // For Slicer Sampler
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null;
    if (!track || track.type !== 'Sampler' || !track.inspectorWindow?.element) return; // Ensure it's a Slicer
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
        updateSliceEditorUI(track);
    }
}
export function drawWaveform(track) { // Used by Slicer and InstrumentSampler
    if (!track || (track.type !== 'Sampler' && track.type !== 'InstrumentSampler') ) return;

    const isSlicerSampler = track.type === 'Sampler';
    const audioBufferToDraw = isSlicerSampler ? track.audioBuffer : track.instrumentSamplerSettings.audioBuffer;
    const ctx = isSlicerSampler ? track.waveformCanvasCtx : track.instrumentWaveformCanvasCtx;

    if (!audioBufferToDraw || !audioBufferToDraw.loaded || !ctx) {
        if (ctx) {
            const canvas = ctx.canvas;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#e0e0e0';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#888';
            ctx.textAlign = 'center';
            ctx.fillText(isSlicerSampler ? 'No Sample Loaded' : 'No Instrument Sample', canvas.width / 2, canvas.height / 2);
        }
        return;
    }

    const canvas = ctx.canvas; const width = canvas.width; const height = canvas.height;
    const channelData = audioBufferToDraw.getChannelData(0);
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#a0a0a0'; ctx.fillRect(0, 0, width, height);
    ctx.lineWidth = 1; ctx.strokeStyle = '#333'; ctx.beginPath();
    const sliceWidth = width / channelData.length;
    for (let i = 0; i < channelData.length; i++) {
        const x = i * sliceWidth; const y = (0.5 + channelData[i] * 0.5) * height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (track.type === 'Sampler') { // Slicer specific slice drawing
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; ctx.lineWidth = 1;
        track.slices.forEach((slice, index) => {
            if (slice.duration > 0) {
                const startX = (slice.offset / audioBufferToDraw.duration) * width;
                const endX = ((slice.offset + slice.duration) / audioBufferToDraw.duration) * width;
                ctx.beginPath(); ctx.moveTo(startX, 0); ctx.lineTo(startX, height); ctx.stroke();

                if (index === track.selectedSliceForEdit) {
                    ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
                    ctx.fillRect(startX, 0, endX - startX, height);
                    ctx.strokeStyle = 'rgba(0, 0, 255, 0.9)'; ctx.lineWidth = 2;
                    ctx.beginPath(); ctx.moveTo(startX,0); ctx.lineTo(startX,height); ctx.stroke();
                    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; ctx.lineWidth = 1;
                }
            }
        });
    }
    if (track.type === 'InstrumentSampler' && track.instrumentSamplerSettings.loop) {
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)'; ctx.lineWidth = 1;
        const loopStartX = (track.instrumentSamplerSettings.loopStart / audioBufferToDraw.duration) * width;
        const loopEndX = (track.instrumentSamplerSettings.loopEnd / audioBufferToDraw.duration) * width;
        ctx.beginPath(); ctx.moveTo(loopStartX, 0); ctx.lineTo(loopStartX, height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(loopEndX, 0); ctx.lineTo(loopEndX, height); ctx.stroke();
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, height);
    }
}
export function drawInstrumentWaveform(track) { drawWaveform(track); } // Alias

export function updateDrumPadControlsUI(track) { // For Pad Sampler (formerly DrumSampler)
    console.log(`[ui.js] updateDrumPadControlsUI for track ${track.id}, selected pad: ${track.selectedDrumPadForEdit}`);
    if (!track || track.type !== 'DrumSampler' || !track.inspectorWindow?.element) {
        console.warn(`[ui.js] updateDrumPadControlsUI: Preconditions not met for track ${track.id}`);
        return;
    }
    const inspectorEl = track.inspectorWindow.element;
    const selectedPadData = track.drumSamplerPads[track.selectedDrumPadForEdit];
    if (!selectedPadData) {
        console.warn(`[ui.js] updateDrumPadControlsUI: Selected drum pad ${track.selectedDrumPadForEdit} data not found for track ${track.id}`);
        return;
    }

    const loadContainer = inspectorEl.querySelector(`#drumPadLoadContainer-${track.id}`);
    if (loadContainer) {
        console.log(`[ui.js] Drum pad load container FOUND for track ${track.id} in updateDrumPadControlsUI.`);
        const inputId = `drumPadFileInput-${track.id}-${track.selectedDrumPadForEdit}`; // Unique ID for file input if needed
        const dropZoneId = `dropZone-selectedPad-${track.id}-${track.selectedDrumPadForEdit}`; // Unique ID for this specific drop zone

        // This createDropZoneHTML is for the *selected pad's dedicated load area*
        loadContainer.innerHTML = createDropZoneHTML(track.id, inputId, 'DrumSampler', track.selectedDrumPadForEdit) +
                                  `<span id="drumPadFileName-${track.id}-${track.selectedDrumPadForEdit}" class="text-xs ml-2 block truncate" style="max-width: 150px;" title="${selectedPadData.originalFileName || 'No file'}">${selectedPadData.originalFileName || 'No file'}</span>`;

        const fileInputEl = loadContainer.querySelector(`#${inputId}`);
        const dropZoneEl = loadContainer.querySelector(`#${dropZoneId}`); // Use the specific ID given in createDropZoneHTML

        if (fileInputEl) {
            fileInputEl.onchange = (e) => { // Use onchange to avoid multiple listeners if this function is called again
                window.loadDrumSamplerPadFile(e, track.id, track.selectedDrumPadForEdit);
            };
        } else {
            console.warn(`[ui.js] Drum pad file input #${inputId} NOT FOUND within loadContainer.`);
        }
        if (dropZoneEl && typeof window.utilSetupDropZoneListeners === 'function') {
            console.log(`[ui.js] Drum pad drop zone (selected pad area) #${dropZoneId} FOUND. Setting up listeners.`);
            window.utilSetupDropZoneListeners(dropZoneEl, track.id, 'DrumSampler', track.selectedDrumPadForEdit, window.loadSoundFromBrowserToTarget, window.loadDrumSamplerPadFile);
        } else {
            console.warn(`[ui.js] Drum pad drop zone (selected pad area) #${dropZoneId} NOT FOUND or utilSetupDropZoneListeners missing.`);
        }
    } else {
        console.warn(`[ui.js] updateDrumPadControlsUI: #drumPadLoadContainer-${track.id} NOT FOUND for track ${track.id}.`);
    }

    track.inspectorControls.drumPadVolume?.setValue(selectedPadData.volume, false);
    track.inspectorControls.drumPadPitch?.setValue(selectedPadData.pitchShift, false);
    track.inspectorControls.drumPadEnvAttack?.setValue(selectedPadData.envelope.attack, false);
    track.inspectorControls.drumPadEnvRelease?.setValue(selectedPadData.envelope.release, false);

    const selectedPadLabel = inspectorEl.querySelector(`#selectedDrumPadLabel-${track.id}`);
    if (selectedPadLabel) selectedPadLabel.textContent = track.selectedDrumPadForEdit + 1;
}

export function renderDrumSamplerPads(track) { // For Pad Sampler
    console.log(`[ui.js] renderDrumSamplerPads called for track ${track.id}. Pads count: ${track.drumSamplerPads?.length}`);
    if (!track || track.type !== 'DrumSampler' || !track.inspectorWindow?.element) {
        console.warn(`[ui.js] renderDrumSamplerPads: Preconditions not met for track ${track.id}`);
        return;
    }
    const padsContainer = track.inspectorWindow.element.querySelector(`#drumSamplerPadsContainer-${track.id}`);
    if (!padsContainer) {
        console.warn(`[ui.js] renderDrumSamplerPads: Pads container '#drumSamplerPadsContainer-${track.id}' not found for track ${track.id}.`);
        return;
    }
    padsContainer.innerHTML = ''; // Clear previous pads
    if (!track.drumSamplerPads || track.drumSamplerPads.length === 0) {
        console.warn(`[ui.js] renderDrumSamplerPads: No drum pads to render for track ${track.id}`);
        padsContainer.textContent = 'No pads available.';
        return;
    }
    track.drumSamplerPads.forEach((padData, index) => {
        const padEl = document.createElement('button');
        padEl.className = `pad-button ${index === track.selectedDrumPadForEdit ? 'selected-for-edit' : ''}`;
        padEl.classList.add('drop-zone-pad'); // Class for styling and identifying as a potential drop target

        const fileNameDisplay = padData.originalFileName ? padData.originalFileName.substring(0, 10) + (padData.originalFileName.length > 10 ? '...' : '') : 'Empty';
        padEl.innerHTML = `Pad ${index + 1} <span class="pad-label block truncate" style="max-width: 60px;" title="${padData.originalFileName || 'Empty'}">${fileNameDisplay}</span>`;
        padEl.title = `Select Pad ${index + 1}. Click to preview. Drag audio here. Sample: ${padData.originalFileName || 'Empty'}`;

        padEl.dataset.trackId = track.id.toString();
        padEl.dataset.trackType = "DrumSampler"; // Keep internal type for now
        padEl.dataset.padSliceIndex = index.toString(); // Use this for consistency, it means pad index here

        padEl.addEventListener('click', async () => {
            track.selectedDrumPadForEdit = index;
            console.log(`[ui.js] Drum pad ${index + 1} selected for track ${track.id}`);
            if(typeof window.playDrumSamplerPadPreview === 'function') await window.playDrumSamplerPadPreview(track.id, index);
            renderDrumSamplerPads(track);
            updateDrumPadControlsUI(track);
        });

        // Make each pad button a drop target
        if (typeof window.utilSetupDropZoneListeners === 'function') {
            window.utilSetupDropZoneListeners(
                padEl,
                track.id,
                "DrumSampler", // Track type hint for the drop zone
                index,         // The specific pad index (number)
                window.loadSoundFromBrowserToTarget, // Callback for Sound Browser drops
                window.loadDrumSamplerPadFile      // Callback for OS file drops (will use the 3rd arg as padIndex)
            );
        } else {
            console.warn(`[ui.js] renderDrumSamplerPads: utilSetupDropZoneListeners is not defined on window for pad ${index}.`);
        }
        padsContainer.appendChild(padEl);
    });
     console.log(`[ui.js] renderDrumSamplerPads finished for track ${track.id}. ${track.drumSamplerPads.length} pads rendered with drop zone listeners.`);
}
