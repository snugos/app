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
        
        let paramsKey; 
        if (engineType === 'BasicPoly') paramsKey = 'basicPoly';
        else if (engineType === 'AMSynth') paramsKey = 'amSynth';
        else if (engineType === 'FMSynth') paramsKey = 'fmSynth';
        else paramsKey = engineType.toLowerCase(); 

        let currentEngineParams = track.synthParams[paramsKey];
        if (!currentEngineParams) { 
            console.warn(`[ui.js] Params for engine ${engineType} (key: ${paramsKey}) not found in track.synthParams. Using defaults. track.synthParams:`, JSON.parse(JSON.stringify(track.synthParams)));
            currentEngineParams = track.getDefaultSynthParams(engineType); // Make sure track.getDefaultSynthParams exists and is correct
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

function buildSamplerSpecificInspectorDOM(track) {
    console.log(`[ui.js] buildSamplerSpecificInspectorDOM called for track ${track.id}`); 
    const panel = document.createElement('div');
    panel.className = 'panel sampler-panel';
    
    const dropZoneContainer = document.createElement('div');
    dropZoneContainer.id = `dropZoneContainer-${track.id}-sampler`; 
    const dropZoneHTML = createDropZoneHTML(track.id, `fileInput-${track.id}`, 'Sampler');
    dropZoneContainer.innerHTML = dropZoneHTML;
    const actualDropZoneElement = dropZoneContainer.querySelector('.drop-zone');

    if (actualDropZoneElement) {
        panel.appendChild(dropZoneContainer); 
         console.log(`[ui.js] Sampler drop zone container created and appended for track ${track.id}`); 
    } else {
        console.error(`[UI] buildSamplerSpecific: Failed to create/find drop-zone element from HTML for track ${track.id}.`);
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
    console.log(`[ui.js] Sampler padsContainer created for track ${track.id}:`, padsContainer); 
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

function buildDrumSamplerSpecificInspectorDOM(track) {
    console.log(`[ui.js] buildDrumSamplerSpecificInspectorDOM called for track ${track.id}`); 
    const panel = document.createElement('div');
    panel.className = 'panel drum-sampler-panel';
    const title = document.createElement('h4');
    title.className = 'text-sm font-semibold mb-1';
    title.innerHTML = `Drum Pads (Selected: <span id="selectedDrumPadLabel-${track.id}">${track.selectedDrumPadForEdit + 1}</span>)`;
    panel.appendChild(title);
    const padsContainer = document.createElement('div');
    padsContainer.id = `drumSamplerPadsContainer-${track.id}`;
    padsContainer.className = 'pads-container mb-2';
    console.log(`[ui.js] Drum Sampler padsContainer created for track ${track.id}:`, padsContainer); 
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
    console.log(`[ui.js] buildDrumSamplerSpecificInspectorDOM returning panel for track ${track.id}:`, panel); 
    return panel;
}

function buildInstrumentSamplerSpecificInspectorDOM(track) {
    console.log(`[ui.js] buildInstrumentSamplerSpecificInspectorDOM called for track ${track.id}`); 
    const panel = document.createElement('div');
    panel.className = 'panel instrument-sampler-panel';
    const dropZoneContainer = document.createElement('div');
    dropZoneContainer.id = `dropZoneContainer-${track.id}-instrumentsampler`;
    const dropZoneHTML = createDropZoneHTML(track.id, `instrumentFileInput-${track.id}`, 'InstrumentSampler');
    dropZoneContainer.innerHTML = dropZoneHTML;
    const actualDropZoneElement = dropZoneContainer.querySelector('.drop-zone');

    if (actualDropZoneElement) {
        panel.appendChild(dropZoneContainer);
         console.log(`[ui.js] Instrument Sampler drop zone container created for track ${track.id}`);
    } else {
        console.error(`[UI] buildInstrumentSampler: Failed to create/find drop-zone element for track ${track.id}.`);
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
        volSliderContainer.innerHTML = ''; // Clear placeholder before appending
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
    } else if (track.type === 'Sampler') {
        initializeSamplerSpecificControls(track, winEl);
    } else if (track.type === 'DrumSampler') {
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
                 track.synthParams[paramsKey] = track.getDefaultSynthParams(newEngineType);
            }

            if (typeof track.initializeInstrument === 'function') {
                await track.initializeInstrument(); 
            }

            buildSynthEngineControls(track, controlsContainer, newEngineType);
            
            setTimeout(() => {
                const currentControls = synthEngineControlDefinitions[newEngineType] || [];
                currentControls.forEach(controlDef => {
                    if (controlDef.type === 'knob' && track.inspectorControls[controlDef.idPrefix]) {
                        track.inspectorControls[controlDef.idPrefix].refreshVisuals();
                    }
                });
            }, 50);
        });
    } else {
        console.error(`[ui.js] Synth engine select or controls container not found for track ${track.id}`);
    }
}

function initializeSamplerSpecificControls(track, winEl) {
    console.log(`[ui.js] initializeSamplerSpecificControls for track ${track.id} (Slicer Sampler). winEl:`, winEl);
    const dropZoneContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-sampler`); 
    const fileInputEl = winEl.querySelector(`#fileInput-${track.id}`); // This ID is from createDropZoneHTML

    if (dropZoneContainerEl && fileInputEl) { 
        const dropZoneEl = dropZoneContainerEl.querySelector('.drop-zone'); // The actual drop zone
        if (dropZoneEl) {
            console.log(`[ui.js] Sampler drop zone FOUND via container for track ${track.id}. Setting up listeners.`);
            utilSetupDropZoneListeners(dropZoneEl, track.id, 'Sampler', null, window.loadSoundFromBrowserToTarget, window.loadSampleFile);
        } else {
            console.warn(`[ui.js] Slicer Sampler (Track ID: ${track.id}): .drop-zone element NOT FOUND within its container.`);
        }
        fileInputEl.onchange = (e) => {
            window.loadSampleFile(e, track.id, 'Sampler');
        };
    } else {
        console.warn(`[ui.js] Slicer Sampler (Track ID: ${track.id}): Drop zone container or file input NOT FOUND. Container: ${dropZoneContainerEl}, FileInput: ${fileInputEl}`);
    }

    if (typeof renderSamplePads === 'function') {
        console.log(`[ui.js] Calling renderSamplePads for track ${track.id}`);
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
        console.log(`[ui.js] Waveform canvas context set for track ${track.id}`);
        if(typeof window.drawWaveform === 'function') window.drawWaveform(track); 
    } else {
        console.warn(`[ui.js] Waveform canvas not found for track ${track.id}`);
    }
    
    if (typeof updateSliceEditorUI === 'function') {
        console.log(`[ui.js] Calling updateSliceEditorUI for track ${track.id}`);
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

function initializeDrumSamplerSpecificControls(track, winEl) {
    console.log(`[ui.js] initializeDrumSamplerSpecificControls for track ${track.id}. winEl:`, winEl);

    const targetId = `drumPadLoadContainer-${track.id}`;
    const padLoadContainerById = document.getElementById(targetId); 
    const padLoadContainerByQuery = winEl.querySelector(`#${targetId}`); 

    console.log(`[ui.js] DrumSampler - Target ID for load container: #${targetId}`);
    console.log(`[ui.js] DrumSampler - document.getElementById result:`, padLoadContainerById);
    console.log(`[ui.js] DrumSampler - winEl.querySelector result:`, padLoadContainerByQuery);

    let padLoadContainerToUse = padLoadContainerByQuery; 
    if (!padLoadContainerToUse && padLoadContainerById) {
        console.warn(`[ui.js] DrumSampler - Querying within winEl failed for ${targetId}, but found globally. Using global result. This might indicate a DOM structure issue or timing.`);
        padLoadContainerToUse = padLoadContainerById;
    }
    
    if (padLoadContainerToUse && typeof updateDrumPadControlsUI === 'function') {
        console.log(`[ui.js] Calling updateDrumPadControlsUI for drum track ${track.id} using found container:`, padLoadContainerToUse);
        updateDrumPadControlsUI(track); 
    } else if (!padLoadContainerToUse) {
        console.warn(`[ui.js] Drum pad load container ('${targetId}') not found for track ${track.id} using either querySelector or getElementById.`);
    } else {
        console.error(`[ui.js] updateDrumPadControlsUI function not found!`);
    }

    if (typeof renderDrumSamplerPads === 'function') {
        console.log(`[ui.js] Calling renderDrumSamplerPads for track ${track.id}`);
        renderDrumSamplerPads(track);
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
    else if (track.type === 'Sampler') windowHeight = 620;
    else if (track.type === 'DrumSampler') windowHeight = 580;
    else if (track.type === 'InstrumentSampler') windowHeight = 620;

    const winOptions = {
        width: Math.min(500, window.innerWidth - 40),
        height: Math.min(windowHeight, window.innerHeight - 80),
        initialContentKey: `trackInspector-${track.id}`
    };
    if (savedState) Object.assign(winOptions, savedState);

    console.log(`[ui.js] About to create SnugWindow for inspector: ${inspectorId}. SnugWindow class is:`, SnugWindow);
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

const effectControlDefinitions = {
    distortion: { title: 'Distortion', controls: [ { idPrefix: 'distAmount', type: 'knob', label: 'Amount', min:0, max:1, step:0.01, paramKey: 'amount', decimals:2, setter: 'setDistortionAmount' } ]},
    saturation: { title: 'Saturation', controls: [ { idPrefix: 'satWet', type: 'knob', label: 'Sat Wet', min:0, max:1, step:0.01, paramKey: 'wet', decimals:2, setter: 'setSaturationWet' }, { idPrefix: 'satAmount', type: 'knob', label: 'Sat Amt', min:0, max:20, step:1, paramKey: 'amount', decimals:0, setter: 'setSaturationAmount' } ]},
    phaser: {
        title: 'Phaser',
        controls: [
            { idPrefix: 'phaserFreq', type: 'knob', label: 'Freq', min: 0.1, max: 10, step: 0.1, paramKey: 'frequency', decimals:1, displaySuffix:'Hz', setter: 'setPhaserFrequency' },
            { idPrefix: 'phaserOct', type: 'knob', label: 'Octaves', min: 1, max: 8, step: 1, paramKey: 'octaves', decimals:0, setter: 'setPhaserOctaves' },
            { idPrefix: 'phaserBaseFreq', type: 'knob', label: 'Base Freq', min: 100, max: 1500, step: 10, paramKey: 'baseFrequency', decimals:0, displaySuffix:'Hz', setter: 'setPhaserBaseFrequency' },
            { idPrefix: 'phaserQ', type: 'knob', label: 'Q', min: 0.1, max: 10, step: 0.1, paramKey: 'Q', decimals:1, setter: 'setPhaserQ' },
            { idPrefix: 'phaserWet', type: 'knob', label: 'Wet', min:0, max:1, step:0.01, paramKey: 'wet', decimals:2, setter: 'setPhaserWet' }
        ]
    },
    autoWah: { 
        title: 'AutoWah',
        controls: [
            { idPrefix: 'awWet', type: 'knob', label: 'Wet', min:0, max:1, step:0.01, paramKey: 'wet', decimals:2, setter: 'setAutoWahWet' },
            { idPrefix: 'awBaseFreq', type: 'knob', label: 'Base Freq', min: 20, max: 1500, step: 1, paramKey: 'baseFrequency', decimals:0, displaySuffix:'Hz', setter: 'setAutoWahBaseFrequency' },
            { idPrefix: 'awOctaves', type: 'knob', label: 'Octaves', min: 1, max: 8, step: 0.1, paramKey: 'octaves', decimals:1, setter: 'setAutoWahOctaves' },
            { idPrefix: 'awSens', type: 'knob', label: 'Sensitivity', min: -40, max: 0, step: 1, paramKey: 'sensitivity', decimals:0, displaySuffix:'dB', setter: 'setAutoWahSensitivity' },
            { idPrefix: 'awQ', type: 'knob', label: 'Q', min: 0.1, max: 20, step: 0.1, paramKey: 'Q', decimals:1, setter: 'setAutoWahQ' },
            { idPrefix: 'awGain', type: 'knob', label: 'Gain', min: -24, max: 24, step: 1, paramKey: 'gain', decimals:0, displaySuffix:'dB', setter: 'setAutoWahGain' },
            { idPrefix: 'awFollower', type: 'knob', label: 'Follower', min: 0.01, max: 1, step: 0.01, paramKey: 'follower', decimals:2, displaySuffix:'s', setter: 'setAutoWahFollower' }
        ]
    },
    filter: { title: 'Filter', controls: [ { idPrefix: 'filterType', type: 'select', options: ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'notch', 'allpass', 'peaking'], paramKey: 'type', setter: 'setFilterType' }, { idPrefix: 'filterFreq', type: 'knob', label: 'Freq', min:20, max:20000, step:1, paramKey: 'frequency', decimals:0, displaySuffix:'Hz', setter: 'setFilterFrequency' }, { idPrefix: 'filterQ', type: 'knob', label: 'Q', min:0.1, max:20, step:0.1, paramKey: 'Q', decimals:1, customSetter: (track, val) => { track.effects.filter.Q = parseFloat(val); if(track.filterNode) track.filterNode.Q.value = parseFloat(val); } } ]},
    chorus: { title: 'Chorus', controls: [ { idPrefix: 'chorusWet', type: 'knob', label: 'Chorus Wet', min:0, max:1, step:0.01, paramKey: 'wet', decimals:2, setter: 'setChorusWet' }, { idPrefix: 'chorusFreq', type: 'knob', label: 'Chorus Freq', min:0.1, max:20, step:0.1, paramKey: 'frequency', decimals:1, displaySuffix:'Hz', setter: 'setChorusFrequency' }, { idPrefix: 'chorusDelayTime', type: 'knob', label: 'Chorus Delay', min:1, max:20, step:0.1, paramKey: 'delayTime', decimals:1, displaySuffix:'ms', setter: 'setChorusDelayTime' }, { idPrefix: 'chorusDepth', type: 'knob', label: 'Chorus Depth', min:0, max:1, step:0.01, paramKey: 'depth', decimals:2, setter: 'setChorusDepth' } ]},
    eq3: { title: 'EQ3', controls: [ { idPrefix: 'eqLow', type: 'knob', label: 'Low', min:-24, max:24, step:1, paramKey: 'low', decimals:0, displaySuffix:'dB', setter: 'setEQ3Low' }, { idPrefix: 'eqMid', type: 'knob', label: 'Mid', min:-24, max:24, step:1, paramKey: 'mid', decimals:0, displaySuffix:'dB', setter: 'setEQ3Mid' }, { idPrefix: 'eqHigh', type: 'knob', label: 'High', min:-24, max:24, step:1, paramKey: 'high', decimals:0, displaySuffix:'dB', setter: 'setEQ3High' } ]},
    compressor: { title: 'Compressor', controls: [ { idPrefix: 'compThresh', type: 'knob', label: 'Thresh', min:-60, max:0, step:1, paramKey: 'threshold', decimals:0, displaySuffix:'dB', setter: 'setCompressorThreshold' }, { idPrefix: 'compRatio', type: 'knob', label: 'Ratio', min:1, max:20, step:1, paramKey: 'ratio', decimals:0, setter: 'setCompressorRatio' }, { idPrefix: 'compAttack', type: 'knob', label: 'Attack', min:0.001, max:0.1, step:0.001, paramKey: 'attack', decimals:3, displaySuffix:'s', setter: 'setCompressorAttack' }, { idPrefix: 'compRelease', type: 'knob', label: 'Release', min:0.01, max:1, step:0.01, paramKey: 'release', decimals:2, displaySuffix:'s', setter: 'setCompressorRelease' }, { idPrefix: 'compKnee', type: 'knob', label: 'Knee', min:0, max:40, step:1, paramKey: 'knee', decimals:0, displaySuffix:'dB', setter: 'setCompressorKnee' } ]},
    delay: { title: 'Delay', controls: [ { idPrefix: 'delayWet', type: 'knob', label: 'Wet', min:0, max:1, step:0.01, paramKey: 'wet', decimals:2, setter: 'setDelayWet' }, { idPrefix: 'delayTime', type: 'knob', label: 'Time', min:0, max:1, step:0.01, paramKey: 'time', decimals:2, displaySuffix:'s', setter: 'setDelayTime' }, { idPrefix: 'delayFeedback', type: 'knob', label: 'Feedback', min:0, max:0.99, step:0.01, paramKey: 'feedback', decimals:2, setter: 'setDelayFeedback' } ]},
    reverb: { title: 'Reverb', controls: [ { idPrefix: 'reverbWet', type: 'knob', label: 'Wet', min:0, max:1, step:0.01, paramKey: 'wet', decimals:2, setter: 'setReverbWet' }, { idPrefix: 'reverbDecay', type: 'knob', label: 'Decay', min:0.1, max:10, step:0.1, paramKey: 'decay', decimals:1, displaySuffix:'s', customSetter: (track, val) => { track.effects.reverb.decay = parseFloat(val); if(track.reverbNode) track.reverbNode.decay = parseFloat(val);} }, { idPrefix: 'reverbPreDelay', type: 'knob', label: 'PreDelay', min:0, max:0.1, step:0.001, paramKey: 'preDelay', decimals:3, displaySuffix:'s', customSetter: (track, val) => { track.effects.reverb.preDelay = parseFloat(val); if(track.reverbNode) track.reverbNode.preDelay = parseFloat(val);} } ]}
};

export function buildEffectsRackContentDOM(track) {
    const mainContentDiv = document.createElement('div');
    mainContentDiv.className = 'effects-rack-window p-2 space-y-3';
    for (const effectKey in effectControlDefinitions) {
        const effectDef = effectControlDefinitions[effectKey];
        const effectGroupDiv = document.createElement('div');
        effectGroupDiv.className = 'effect-group';
        const titleEl = document.createElement('h4');
        titleEl.className = 'text-sm font-semibold'; titleEl.textContent = effectDef.title;
        effectGroupDiv.appendChild(titleEl);
        const controlsContainer = document.createElement('div');
        if (effectDef.controls.length > 1 || ['distortion', 'saturation', 'phaser', 'autoWah'].includes(effectKey) || effectDef.controls.some(c => c.type === 'knob')) {
             controlsContainer.className = 'control-group';
        } else {
            controlsContainer.className = 'single-control-container';
        }

        effectDef.controls.forEach(controlDef => {
            if (controlDef.type === 'select') {
                const selectContainer = document.createElement('div');
                if(controlsContainer.className !== 'control-group') selectContainer.className = 'mb-1';
                const selectEl = document.createElement('select');
                selectEl.id = `${controlDef.idPrefix}-${track.id}`;
                selectEl.className = 'text-xs p-1 border w-full bg-white text-black rounded-sm';
                selectContainer.appendChild(selectEl)
                controlsContainer.appendChild(selectContainer);
            } else if (controlDef.type === 'knob') {
                const knobPlaceholder = document.createElement('div');
                knobPlaceholder.id = `${controlDef.idPrefix}Knob-${track.id}`;
                controlsContainer.appendChild(knobPlaceholder);
            }
        });
        effectGroupDiv.appendChild(controlsContainer);
        mainContentDiv.appendChild(effectGroupDiv);
    }
    return mainContentDiv;
}

export function openTrackEffectsRackWindow(trackId, savedState = null) {
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null;
    if (!track) return null;
    const windowId = `effectsRack-${track.id}`;

    if (window.openWindows[windowId] && !savedState) {
        window.openWindows[windowId].restore(); return window.openWindows[windowId];
    }
    if (window.openWindows[windowId] && savedState) {
        window.openWindows[windowId].close();
    }

    track.inspectorControls = track.inspectorControls || {}; // Ensure it exists
    const effectsRackContentElement = buildEffectsRackContentDOM(track);
    const winOptions = { width: 450, height: 600, initialContentKey: `effectsRack-${track.id}` }; 
    if (savedState) Object.assign(winOptions, savedState);

    const effectsWin = new SnugWindow(windowId, `Effects: ${track.name}`, effectsRackContentElement, winOptions);
    if (!effectsWin || !effectsWin.element) {
        showNotification("Failed to create Effects Rack.", 5000); return null;
    }
    track.effectsRackWindow = effectsWin;
    const winEl = effectsWin.element;

    for (const effectKey in effectControlDefinitions) {
        const effectDef = effectControlDefinitions[effectKey];
        effectDef.controls.forEach(controlDef => {
            const controlIdBase = `${controlDef.idPrefix}-${track.id}`;
            const initialValue = (track.effects[effectKey] && track.effects[effectKey][controlDef.paramKey] !== undefined)
                                 ? track.effects[effectKey][controlDef.paramKey]
                                 : (controlDef.min !== undefined ? controlDef.min : (controlDef.options ? controlDef.options[0] : 0));

            if (controlDef.type === 'select') {
                const selectEl = winEl.querySelector(`#${controlIdBase}`);
                if (selectEl) {
                    controlDef.options.forEach(opt => selectEl.add(new Option(opt, opt)));
                    selectEl.value = initialValue;
                    selectEl.addEventListener('change', (e) => {
                        if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set ${effectDef.title} ${controlDef.paramKey} for ${track.name} to ${e.target.value}`);
                        if (track[controlDef.setter]) track[controlDef.setter](e.target.value);
                        else if (controlDef.customSetter) controlDef.customSetter(track, e.target.value);
                        else if (track.effects[effectKey]) track.effects[effectKey][controlDef.paramKey] = e.target.value;
                    });
                }
            } else if (controlDef.type === 'knob') {
                const knobPlaceholder = winEl.querySelector(`#${controlDef.idPrefix}Knob-${track.id}`);
                if (knobPlaceholder) {
                    const knob = createKnob({
                        label: controlDef.label, min: controlDef.min, max: controlDef.max, step: controlDef.step,
                        initialValue: initialValue, decimals: controlDef.decimals, displaySuffix: controlDef.displaySuffix,
                        trackRef: track,
                        onValueChange: (val) => {
                            if (controlDef.customSetter) controlDef.customSetter(track, val);
                            else if (track[controlDef.setter]) track[controlDef.setter](val);
                            else if (track.effects[effectKey] && track.effects[effectKey][controlDef.paramKey] !== undefined) {
                                track.effects[effectKey][controlDef.paramKey] = val;
                            }
                        }
                    });
                    knobPlaceholder.innerHTML = ''; // Clear placeholder
                    knobPlaceholder.appendChild(knob.element);
                    track.inspectorControls[`effect_${controlDef.idPrefix}`] = knob;
                }
            }
        });
    }
     setTimeout(() => {
        for (const effectKey in effectControlDefinitions) {
            effectControlDefinitions[effectKey].controls.forEach(controlDef => {
                if (controlDef.type === 'knob' && track.inspectorControls[`effect_${controlDef.idPrefix}`]) {
                    track.inspectorControls[`effect_${controlDef.idPrefix}`].refreshVisuals();
                }
            });
        }
    }, 50);
    return effectsWin;
}

export function buildSequencerContentDOM(track, rows, rowLabels, numBars) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function highlightPlayingStep(col, trackType, gridElement) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }

export function openMixerWindow(savedState = null) {
    console.log("[ui.js] openMixerWindow called.");
    const windowId = 'mixer';
    if (window.openWindows[windowId] && !savedState) { 
        console.log("[ui.js] Restoring existing Mixer window.");
        window.openWindows[windowId].restore(); 
        return window.openWindows[windowId]; 
    }
    if (window.openWindows[windowId] && savedState) {
        window.openWindows[windowId].close();
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'mixer-window-content p-2 overflow-x-auto flex flex-row gap-2'; // Added flex for horizontal layout

    const winOptions = {
        width: Math.max(500, Math.min(800, window.innerWidth - 60)), height: 350,
        initialContentKey: 'mixer'
    };
    if (savedState) Object.assign(winOptions, savedState);

    console.log(`[ui.js] About to create SnugWindow for Mixer. SnugWindow class is:`, SnugWindow);
    let mixerWin = null;
    try {
        mixerWin = new SnugWindow(windowId, 'Mixer', contentDiv, winOptions);
        console.log('[ui.js] SnugWindow instance for Mixer created (or attempted):', mixerWin);
    } catch (e) {
        console.error('[ui.js] CRITICAL ERROR during `new SnugWindow()` for Mixer:', e);
        showNotification("CRITICAL: Error creating Mixer window object. Check console.", 6000);
        return null;
    }

    if (!mixerWin || !mixerWin.element) {
        console.error("[ui.js] Failed to create Mixer window instance OR its element is null.");
        showNotification("Failed to create Mixer window.", 5000); 
        return null;
    }
    
    renderMixer(contentDiv); // Populate with channel strips
    console.log("[ui.js] Mixer window created and rendered.");
    return mixerWin;
}

export function updateMixerWindow() {
    const mixerWin = window.openWindows['mixer'];
    if (mixerWin && mixerWin.element && !mixerWin.isMinimized) {
        const mixerContentArea = mixerWin.element.querySelector('.mixer-window-content');
        if (mixerContentArea) {
            console.log("[ui.js] Updating Mixer window content.");
            renderMixer(mixerContentArea);
        }
    }
}

export function renderMixer(container) {
    if (!container) { console.error("[ui.js] Mixer container not found for rendering."); return; }
    container.innerHTML = ''; // Clear existing strips
    const currentTracks = typeof window.getTracks === 'function' ? window.getTracks() : [];

    currentTracks.forEach(track => {
        const strip = document.createElement('div');
        strip.className = 'channel-strip flex flex-col items-center p-2 border border-gray-400 bg-gray-200 rounded-md min-w-[100px]';
        const trackNameDiv = document.createElement('div');
        trackNameDiv.className = 'track-name text-xs font-semibold mb-1 truncate w-full text-center';
        trackNameDiv.title = track.name;
        trackNameDiv.textContent = track.name.substring(0,10) + (track.name.length > 10 ? '...' : '');
        trackNameDiv.addEventListener('click', () => handleOpenTrackInspector(track.id));
        strip.appendChild(trackNameDiv);

        const faderContainer = document.createElement('div');
        faderContainer.className = 'fader-container w-full flex justify-center my-1'; // Centered knob
        faderContainer.id = `mixerVolumeSliderContainer-${track.id}`;
        strip.appendChild(faderContainer);

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'mixer-buttons flex gap-1 mb-1 justify-center';
        const muteBtn = document.createElement('button');
        muteBtn.id = `mixerMuteBtn-${track.id}`;
        muteBtn.className = `mute-button text-xs p-1 w-6 h-6 flex items-center justify-center rounded ${track.isMuted ? 'muted' : ''}`;
        muteBtn.textContent = 'M';
        muteBtn.addEventListener('click', () => handleTrackMute(track.id));
        buttonsDiv.appendChild(muteBtn);

        const soloBtn = document.createElement('button');
        soloBtn.id = `mixerSoloBtn-${track.id}`;
        const currentSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null;
        soloBtn.className = `solo-button text-xs p-1 w-6 h-6 flex items-center justify-center rounded ${currentSoloId === track.id ? 'soloed' : ''}`;
        soloBtn.textContent = 'S';
        soloBtn.addEventListener('click', () => handleTrackSolo(track.id));
        buttonsDiv.appendChild(soloBtn);
        strip.appendChild(buttonsDiv);

        const meterDiv = document.createElement('div');
        meterDiv.id = `mixerTrackMeterContainer-${track.id}`;
        meterDiv.className = 'mixer-meter-container meter-bar-container w-full h-3 bg-gray-300 rounded overflow-hidden';
        meterDiv.innerHTML = `<div id="mixerTrackMeterBar-${track.id}" class="meter-bar h-full bg-green-500 transition-all duration-50 ease-linear"></div>`;
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
            if (!track.inspectorControls) track.inspectorControls = {};
            track.inspectorControls[`mixerVolume-${track.id}`] = volKnob;
        }
    });

    const masterStrip = document.createElement('div');
    masterStrip.className = 'channel-strip flex flex-col items-center p-2 border border-gray-500 bg-gray-300 rounded-md min-w-[100px]';
    masterStrip.innerHTML = `<div class="track-name text-xs font-bold mb-1">Master</div>
                             <div class="fader-container w-full flex justify-center my-1" id="mixerMasterVolumeSliderContainer"></div>
                             <div id="mixerMasterMeterContainer" class="mixer-meter-container meter-bar-container w-full h-3 bg-gray-400 rounded overflow-hidden mt-auto">
                                <div id="mixerMasterMeterBar" class="meter-bar h-full bg-green-500 transition-all duration-50 ease-linear"></div>
                             </div>`;
    container.appendChild(masterStrip);

    const masterVolSliderCont = masterStrip.querySelector('#mixerMasterVolumeSliderContainer');
    if(masterVolSliderCont){
        const masterVolKnob = createKnob({
            label: '', min:-60, max:6, step:1, initialValue: Tone.getDestination().volume.value,
            displaySuffix: 'dB', decimals:0, sensitivity: 0.3,
            onValueChange: (val) => { if (Tone.getDestination()) Tone.getDestination().volume.value = val; }
        });
        masterVolSliderCont.innerHTML = '';
        masterVolSliderCont.appendChild(masterVolKnob.element);
    }
    setTimeout(() => {
        currentTracks.forEach(track => {
            track.inspectorControls[`mixerVolume-${track.id}`]?.refreshVisuals?.();
        });
    }, 50);
}

export function updateSoundBrowserDisplayForLibrary(libraryName) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }

export function openSoundBrowserWindow(savedState = null) {
    console.log("[ui.js] openSoundBrowserWindow called.");
    const windowId = 'soundBrowser';
    if (window.openWindows[windowId] && !savedState) {
        console.log("[ui.js] Restoring existing Sound Browser window.");
        window.openWindows[windowId].restore();
        if (window.currentLibraryName && typeof updateSoundBrowserDisplayForLibrary === 'function') {
            updateSoundBrowserDisplayForLibrary(window.currentLibraryName);
        }
        return window.openWindows[windowId];
    }
     if (window.openWindows[windowId] && savedState) {
        window.openWindows[windowId].close();
    }

    let selectOptionsHTML = '';
    if (Constants.soundLibraries) {
        for (const libName in Constants.soundLibraries) {
            selectOptionsHTML += `<option value="${libName}">${libName}</option>`;
        }
    }

    const contentHTML = `
        <div class="sound-browser-content p-2">
            <select id="soundBrowserLibrarySelect" class="w-full mb-2 p-1 border border-gray-500 rounded-sm text-xs bg-white text-black">
                ${selectOptionsHTML || '<option>No Libraries Configured</option>'}
            </select>
            <div id="soundBrowserPathDisplay" class="text-xs p-1 bg-gray-200 border-b border-gray-400 mb-1">Path: /</div>
            <div id="soundBrowserList" class="sound-browser-list h-64 overflow-y-auto border border-gray-300 p-1 bg-white">Select a library to load sounds.</div>
        </div>
    `;
    const winOptions = { width: 350, height: 400, initialContentKey: 'soundBrowser' };
    if (savedState) Object.assign(winOptions, savedState);

    console.log(`[ui.js] About to create SnugWindow for Sound Browser. SnugWindow class is:`, SnugWindow);
    let soundBrowserWin = null;
    try {
        soundBrowserWin = new SnugWindow(windowId, 'Sound Browser', contentHTML, winOptions);
        console.log('[ui.js] SnugWindow instance for Sound Browser created (or attempted):', soundBrowserWin);
    } catch(e) {
        console.error('[ui.js] CRITICAL ERROR during `new SnugWindow()` for Sound Browser:', e);
        showNotification("CRITICAL: Error creating Sound Browser window object. Check console.", 6000);
        return null;
    }
    

    if (!soundBrowserWin || !soundBrowserWin.element) {
        console.error("[ui.js] Failed to create Sound Browser window instance OR its element is null.");
        showNotification("Failed to create Sound Browser window.", 5000);
        return null;
    }

    const librarySelect = soundBrowserWin.element.querySelector('#soundBrowserLibrarySelect');
    if (librarySelect) {
        librarySelect.onchange = () => {
            const selectedLibraryName = librarySelect.value;
            if (typeof updateSoundBrowserDisplayForLibrary === 'function') {
                updateSoundBrowserDisplayForLibrary(selectedLibraryName);
            }
        };

        if (Constants.soundLibraries && Object.keys(Constants.soundLibraries).length > 0) {
            const firstLibraryName = Object.keys(Constants.soundLibraries)[0];
            if (librarySelect.options.length > 0) {
                const firstOptionValue = librarySelect.options[0].value;
                const targetLibrary = Array.from(librarySelect.options).find(opt => opt.value === firstLibraryName) ? firstLibraryName : firstOptionValue;
                librarySelect.value = targetLibrary;
                 if (typeof updateSoundBrowserDisplayForLibrary === 'function') {
                    updateSoundBrowserDisplayForLibrary(targetLibrary); // Initial load
                }
            }
        } else {
             soundBrowserWin.element.querySelector('#soundBrowserList').innerHTML = "No sound libraries configured.";
        }
    }
    console.log("[ui.js] Sound Browser window created and initialized.");
    return soundBrowserWin;
}

export function renderSoundBrowserDirectory(pathArray, treeNode) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function renderSamplePads(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function updateSliceEditorUI(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function applySliceEdits(trackId) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function drawWaveform(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function drawInstrumentWaveform(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function updateDrumPadControlsUI(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function renderDrumSamplerPads(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
