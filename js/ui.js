// js/ui.js - UI Creation and Management Module

import { SnugWindow } from './SnugWindow.js';
console.log('[ui.js] SnugWindow imported as:', SnugWindow); // ADDED FOR DEBUGGING
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
    setValue(currentValue, false); // Initialize visual
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
        
        let paramsKey; // Determine the correct key for track.synthParams
        if (engineType === 'BasicPoly') paramsKey = 'basicPoly';
        else if (engineType === 'AMSynth') paramsKey = 'amSynth';
        else if (engineType === 'FMSynth') paramsKey = 'fmSynth';
        else paramsKey = engineType.toLowerCase(); // Fallback, though should match defined keys

        let currentEngineParams = track.synthParams[paramsKey];
        if (!currentEngineParams) { // Ensure params object exists
            currentEngineParams = track.getDefaultSynthParams(engineType);
            track.synthParams[paramsKey] = currentEngineParams; // Store defaults if not present
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
            const defaultEngineParams = track.getDefaultSynthParams(engineType);
            initialValue = getNestedValue(defaultEngineParams, controlDef.paramPath);
            if(initialValue === undefined && controlDef.type === 'knob') initialValue = controlDef.min; // Fallback for knobs
            if(initialValue === undefined && controlDef.type === 'select') initialValue = controlDef.options[0]; // Fallback for selects
        }

        if (controlDef.type === 'select') {
            const selectContainer = document.createElement('div');
            selectContainer.className = 'mb-2 flex flex-col items-start'; // Style for label above select
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

// ... (buildSamplerSpecificInspectorDOM, buildDrumSamplerSpecificInspectorDOM, buildInstrumentSamplerSpecificInspectorDOM remain the same)
function buildSamplerSpecificInspectorDOM(track) {
    const panel = document.createElement('div');
    panel.className = 'panel sampler-panel';
    const dropZoneContainer = document.createElement('div');
    const dropZoneHTML = createDropZoneHTML(track.id, `fileInput-${track.id}`, 'Sampler');
    dropZoneContainer.innerHTML = dropZoneHTML;
    const actualDropZoneElement = dropZoneContainer.querySelector('.drop-zone');

    if (actualDropZoneElement) {
        panel.appendChild(actualDropZoneElement);
    } else {
        console.error(`[UI] buildSamplerSpecific: Failed to create/find drop-zone element from HTML for track ${track.id}. HTML was:`, dropZoneHTML);
    }

    const editorPanel = document.createElement('div');
    editorPanel.className = 'sampler-editor-panel mt-1 flex flex-wrap md:flex-nowrap gap-3';
    const leftSide = document.createElement('div');
    leftSide.className = 'flex-grow w-full md:w-3/5';
    const canvas = document.createElement('canvas');
    canvas.id = `waveformCanvas-${track.id}`;
    canvas.className = 'waveform-canvas w-full';
    canvas.width = 380; canvas.height = 70;
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
    loadContainer.id = `drumPadLoadContainer-${track.id}`;
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
    const dropZoneHTML = createDropZoneHTML(track.id, `instrumentFileInput-${track.id}`, 'InstrumentSampler');
    dropZoneContainer.innerHTML = dropZoneHTML;
    const actualDropZoneElement = dropZoneContainer.querySelector('.drop-zone');

    if (actualDropZoneElement) {
        panel.appendChild(actualDropZoneElement);
    } else {
        console.error(`[UI] buildInstrumentSampler: Failed to create/find drop-zone element from HTML for track ${track.id}. HTML was:`, dropZoneHTML);
    }

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
    return panel;
}


export function initializeCommonInspectorControls(track, winEl) { /* ... (remains the same) ... */ }

export function initializeTypeSpecificInspectorControls(track, winEl) {
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
    const engineSelect = winEl.querySelector(`#synthEngineType-${track.id}`);
    const controlsContainer = winEl.querySelector(`#synthEngineControls-${track.id}`);

    if (engineSelect && controlsContainer) {
        engineSelect.addEventListener('change', async (e) => {
            const newEngineType = e.target.value;
            if (typeof window.captureStateForUndo === 'function') {
                window.captureStateForUndo(`Change ${track.name} Synth Engine to ${newEngineType}`);
            }
            track.synthEngineType = newEngineType;
            
            let paramsKey;
            if (newEngineType === 'BasicPoly') paramsKey = 'basicPoly';
            else if (newEngineType === 'AMSynth') paramsKey = 'amSynth';
            else if (newEngineType === 'FMSynth') paramsKey = 'fmSynth';

            if (paramsKey && !track.synthParams[paramsKey]) { // Check if specific param object exists
                 track.synthParams[paramsKey] = track.getDefaultSynthParams(newEngineType);
            } else if (!paramsKey) { // Fallback for unknown engine type if any
                track.synthParams[newEngineType.toLowerCase()] = track.getDefaultSynthParams(newEngineType);
            }


            if (typeof track.initializeInstrument === 'function') {
                await track.initializeInstrument(); // This will apply the new default/existing params
            }

            buildSynthEngineControls(track, controlsContainer, newEngineType);
            // Refresh visuals for any newly created knobs
            setTimeout(() => {
                const currentControls = synthEngineControlDefinitions[newEngineType] || [];
                currentControls.forEach(controlDef => {
                    if (controlDef.type === 'knob' && track.inspectorControls[controlDef.idPrefix]) {
                        track.inspectorControls[controlDef.idPrefix].refreshVisuals();
                    }
                });
            }, 0);
        });
    }
}


// ... (rest of ui.js: initializeSamplerSpecificControls, etc. remain the same) ...
function initializeSamplerSpecificControls(track, winEl) {
    const dropZoneId = `dropZone-${track.id}-sampler`;
    const fileInputId = `fileInput-${track.id}`;

    const dropZoneEl = document.getElementById(dropZoneId);
    const fileInputEl = document.getElementById(fileInputId);

    if (!dropZoneEl) {
        console.warn(`[UI] Slicer Sampler (Track ID: ${track.id}): Drop zone element NOT FOUND using ID: ${dropZoneId}`);
    }
    if (!fileInputEl) {
        console.warn(`[UI] Slicer Sampler (Track ID: ${track.id}): File input element NOT FOUND using ID: ${fileInputId}`);
    }

    if (dropZoneEl && winEl.contains(dropZoneEl) && fileInputEl && winEl.contains(fileInputEl)) {
        utilSetupDropZoneListeners(dropZoneEl, track.id, 'Sampler', null, window.loadSoundFromBrowserToTarget, window.loadSampleFile);
        fileInputEl.onchange = (e) => {
            window.loadSampleFile(e, track.id, 'Sampler');
        };
    } else {
        if (dropZoneEl && !winEl.contains(dropZoneEl)) console.error(`[UI] Slicer Sampler (Track ID: ${track.id}): Drop zone ${dropZoneId} found globally but NOT in winEl.`);
        if (fileInputEl && !winEl.contains(fileInputEl)) console.error(`[UI] Slicer Sampler (Track ID: ${track.id}): File input ${fileInputId} found globally but NOT in winEl.`);
    }

    renderSamplePads(track);
    winEl.querySelector(`#applySliceEditsBtn-${track.id}`)?.addEventListener('click', () => {
        if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Apply Slice Edits for ${track.name}`);
        applySliceEdits(track.id);
    });

    const canvas = winEl.querySelector(`#waveformCanvas-${track.id}`);
    if (canvas) { track.waveformCanvasCtx = canvas.getContext('2d'); if(typeof window.drawWaveform === 'function') window.drawWaveform(track); }
    updateSliceEditorUI(track);

    ['sliceStart', 'sliceEnd'].forEach(idSuffix => {
        const inputEl = winEl.querySelector(`#${idSuffix}-${track.id}`);
        if (inputEl) inputEl.addEventListener('change', () => {});
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
    if (padLoadContainer) updateDrumPadControlsUI(track);
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
    const dropZoneId = `dropZone-${track.id}-instrumentsampler`;
    const fileInputId = `instrumentFileInput-${track.id}`;

    const dropZoneEl = document.getElementById(dropZoneId);
    const fileInputEl = document.getElementById(fileInputId);

    if (!dropZoneEl) {
        console.warn(`[UI] InstrumentSampler (Track ID: ${track.id}): Drop zone element NOT FOUND using ID: ${dropZoneId}`);
    }
    if (!fileInputEl) {
        console.warn(`[UI] InstrumentSampler (Track ID: ${track.id}): File input element NOT FOUND using ID: ${fileInputId}`);
    }

    if (dropZoneEl && winEl.contains(dropZoneEl) && fileInputEl && winEl.contains(fileInputEl)) {
        utilSetupDropZoneListeners(dropZoneEl, track.id, 'InstrumentSampler', null, window.loadSoundFromBrowserToTarget, window.loadSampleFile);
         fileInputEl.onchange = (e) => {
            window.loadSampleFile(e, track.id, 'InstrumentSampler');
        };
    } else {
        if (dropZoneEl && !winEl.contains(dropZoneEl)) {
            console.error(`[UI] InstrumentSampler (Track ID: ${track.id}): Drop zone ${dropZoneId} found globally but NOT in winEl.`);
        }
        if (fileInputEl && !winEl.contains(fileInputEl)) {
             console.error(`[UI] InstrumentSampler (Track ID: ${track.id}): File input ${fileInputId} found globally but NOT in winEl.`);
        }
    }

    const iCanvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`);
    if(iCanvas) { track.instrumentWaveformCanvasCtx = iCanvas.getContext('2d'); if(typeof window.drawInstrumentWaveform === 'function') window.drawInstrumentWaveform(track); }

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

export function openGlobalControlsWindow(savedState = null) { /* ... (remains the same) ... */ }
export function openTrackInspectorWindow(trackId, savedState = null) { /* ... (remains the same) ... */ }

const effectControlDefinitions = { /* ... (remains the same, includes AutoWah) ... */ };
export function buildEffectsRackContentDOM(track) { /* ... (remains the same) ... */ }
export function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... (remains the same) ... */ }

export function buildSequencerContentDOM(track, rows, rowLabels, numBars) { /* ... (remains the same) ... */ }
export function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... (remains the same) ... */ }
export function highlightPlayingStep(col, trackType, gridElement) { /* ... (remains the same) ... */ }
export function openMixerWindow(savedState = null) { /* ... (remains the same) ... */ }
export function updateMixerWindow() { /* ... (remains the same) ... */ }
export function renderMixer(container) { /* ... (remains the same) ... */ }
export function updateSoundBrowserDisplayForLibrary(libraryName) { /* ... (remains the same) ... */ }
export function openSoundBrowserWindow(savedState = null) { /* ... (remains the same) ... */ }
export function renderSoundBrowserDirectory(pathArray, treeNode) { /* ... (remains the same) ... */ }
export function renderSamplePads(track) { /* ... (remains the same) ... */ }
export function updateSliceEditorUI(track) { /* ... (remains the same) ... */ }
export function applySliceEdits(trackId) { /* ... (remains the same) ... */ }
export function drawWaveform(track) { /* ... (remains the same) ... */ }
export function drawInstrumentWaveform(track) { /* ... (remains the same) ... */ }
export function updateDrumPadControlsUI(track) { /* ... (remains the same) ... */ }
export function renderDrumSamplerPads(track) { /* ... (remains the same) ... */ }

