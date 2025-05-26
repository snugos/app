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
            const defaultEngineParams = track.getDefaultSynthParams(engineType);
            initialValue = getNestedValue(defaultEngineParams, controlDef.paramPath);
            if(initialValue === undefined && controlDef.type === 'knob') initialValue = controlDef.min; 
            if(initialValue === undefined && controlDef.type === 'select') initialValue = controlDef.options[0];
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
function buildInstrumentSamplerSpecificInspectorDOM(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }

export function initializeCommonInspectorControls(track, winEl) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }

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

function initializeSynthSpecificControls(track, winEl) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }

function initializeSamplerSpecificControls(track, winEl) {
    console.log(`[ui.js] initializeSamplerSpecificControls for track ${track.id} (Slicer Sampler). winEl:`, winEl);
    const dropZoneContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-sampler`); 
    const fileInputEl = winEl.querySelector(`#fileInput-${track.id}`);

    if (dropZoneContainerEl && fileInputEl) { 
        const dropZoneEl = dropZoneContainerEl.querySelector('.drop-zone');
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
    // ... (rest of sampler controls initialization like knobs, buttons)
     const sVolK = createKnob({ label: 'Vol', min:0, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceVolume(track.selectedSliceForEdit, val)});
    const volPlaceholder = winEl.querySelector(`#sliceVolumeSlider-${track.id}`);
    if(volPlaceholder) volPlaceholder.appendChild(sVolK.element); else console.warn(`[ui.js] Placeholder #sliceVolumeSlider-${track.id} not found.`);
    track.inspectorControls.sliceVolume = sVolK;
    
    const sPitK = createKnob({ label: 'Pitch', min:-24, max:24, step:1, initialValue: track.slices[track.selectedSliceForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setSlicePitchShift(track.selectedSliceForEdit, val)});
    const pitchPlaceholder = winEl.querySelector(`#slicePitchKnob-${track.id}`);
    if(pitchPlaceholder) pitchPlaceholder.appendChild(sPitK.element); else console.warn(`[ui.js] Placeholder #slicePitchKnob-${track.id} not found.`);
    track.inspectorControls.slicePitch = sPitK;

    const sEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.attack || 0.01, decimals:3, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'attack', val)});
    const attackEnvPlaceholder = winEl.querySelector(`#sliceEnvAttackSlider-${track.id}`);
    if(attackEnvPlaceholder) attackEnvPlaceholder.appendChild(sEAK.element); else console.warn(`[ui.js] Placeholder #sliceEnvAttackSlider-${track.id} not found.`);
    track.inspectorControls.sliceEnvAttack = sEAK;

    // ... continue for Decay, Sustain, Release for Slice Envelope
    // Loop, Reverse, Polyphony toggles
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
    if(volPlaceholder) volPlaceholder.appendChild(pVolK.element); else console.warn(`[ui.js] Placeholder #drumPadVolumeSlider-${track.id} not found.`);
    track.inspectorControls.drumPadVolume = pVolK;
    
    const pPitK = createKnob({ label: 'Pad Pitch', min:-24, max:24, step:1, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setDrumSamplerPadPitch(track.selectedDrumPadForEdit, val)});
    const pitchPlaceholder = winEl.querySelector(`#drumPadPitchKnob-${track.id}`);
    if(pitchPlaceholder) pitchPlaceholder.appendChild(pPitK.element); else console.warn(`[ui.js] Placeholder #drumPadPitchKnob-${track.id} not found.`);
    track.inspectorControls.drumPadPitch = pPitK;

    const pEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.attack || 0.005, decimals:3, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'attack', val)});
    const attackPlaceholder = winEl.querySelector(`#drumPadEnvAttackSlider-${track.id}`);
    if(attackPlaceholder) attackPlaceholder.appendChild(pEAK.element); else console.warn(`[ui.js] Placeholder #drumPadEnvAttackSlider-${track.id} not found.`);
    track.inspectorControls.drumPadEnvAttack = pEAK;

    const pERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'release', val)});
    const releasePlaceholder = winEl.querySelector(`#drumPadEnvReleaseSlider-${track.id}`);
    if(releasePlaceholder) releasePlaceholder.appendChild(pERK.element); else console.warn(`[ui.js] Placeholder #drumPadEnvReleaseSlider-${track.id} not found.`);
    track.inspectorControls.drumPadEnvRelease = pERK;
}
function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... (remains the same as daw_ui_js_sampler_debug_v1) ... */ }

export function openGlobalControlsWindow(savedState = null) {
    console.log("[ui.js] openGlobalControlsWindow STARTING..."); // Keep this log
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
        // Full content for Global Controls window
        let tempoValue = 120.0; // Default
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

export function openTrackInspectorWindow(trackId, savedState = null) { /* ... (same as daw_ui_js_sampler_debug_v1, with detailed SnugWindow checks) ... */ }
const effectControlDefinitions = { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ };
export function buildEffectsRackContentDOM(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function buildSequencerContentDOM(track, rows, rowLabels, numBars) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function highlightPlayingStep(col, trackType, gridElement) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function openMixerWindow(savedState = null) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function updateMixerWindow() { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function renderMixer(container) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function updateSoundBrowserDisplayForLibrary(libraryName) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function openSoundBrowserWindow(savedState = null) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function renderSoundBrowserDirectory(pathArray, treeNode) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function renderSamplePads(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function updateSliceEditorUI(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function applySliceEdits(trackId) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function drawWaveform(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function drawInstrumentWaveform(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function updateDrumPadControlsUI(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function renderDrumSamplerPads(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
