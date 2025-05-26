// js/ui.js - UI Creation and Management Module

import { SnugWindow } from './SnugWindow.js';
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

    // Engine Type Selector
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
        option.textContent = engine.replace('Poly', '').replace('Synth', ' Synth'); // Friendlier names
        engineSelect.appendChild(option);
    });
    engineSelect.value = track.synthEngineType;
    panel.appendChild(engineSelect);

    // Container for dynamic engine controls
    const engineControlsContainer = document.createElement('div');
    engineControlsContainer.id = `synthEngineControls-${track.id}`;
    engineControlsContainer.className = 'synth-engine-controls-container mt-2';
    panel.appendChild(engineControlsContainer);

    // Initial population of controls
    buildSynthEngineControls(track, engineControlsContainer, track.synthEngineType);

    return panel;
}

function buildSynthEngineControls(track, container, engineType) {
    container.innerHTML = ''; // Clear previous controls
    const controls = synthEngineControlDefinitions[engineType];
    if (!controls) {
        container.textContent = `Controls for ${engineType} not defined.`;
        return;
    }

    const controlGroup = document.createElement('div');
    controlGroup.className = 'control-group'; // Use existing styling for knobs

    controls.forEach(controlDef => {
        const controlId = `${controlDef.idPrefix}-${track.id}`;
        let currentParams = track.synthParams[engineType.toLowerCase()] || track.synthParams.basicPoly; // Get params for current engine
        if (engineType === 'BasicPoly' && !currentParams) currentParams = track.synthParams.basicPoly; // Fallback for BasicPoly
        else if (engineType === 'AMSynth' && !currentParams) currentParams = track.synthParams.amSynth;
        else if (engineType === 'FMSynth' && !currentParams) currentParams = track.synthParams.fmSynth;


        let initialValue;
        // Helper to get nested initial value
        const getNestedValue = (obj, path) => {
            if (!path) return undefined;
            const keys = path.split('.');
            let current = obj;
            for (const key of keys) {
                if (current && typeof current === 'object' && key in current) {
                    current = current[key];
                } else {
                    return undefined; // Path doesn't exist
                }
            }
            return current;
        };
        
        initialValue = getNestedValue(currentParams, controlDef.paramPath);
        if (initialValue === undefined) { // Fallback to default if not found in current params
            const defaultEngineParams = track.getDefaultSynthParams(engineType);
            initialValue = getNestedValue(defaultEngineParams, controlDef.paramPath);
        }


        if (controlDef.type === 'select') {
            const selectContainer = document.createElement('div');
            selectContainer.className = 'mb-2';
            const labelEl = document.createElement('label');
            labelEl.htmlFor = controlId;
            labelEl.className = 'knob-label text-xs'; // Use knob-label style for consistency
            labelEl.textContent = controlDef.label;
            selectContainer.appendChild(labelEl);

            const selectEl = document.createElement('select');
            selectEl.id = controlId;
            selectEl.className = 'text-xs p-1 border w-full bg-white text-black rounded-sm';
            controlDef.options.forEach(opt => selectEl.add(new Option(opt, opt)));
            selectEl.value = initialValue !== undefined ? initialValue : controlDef.options[0];
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
                initialValue: initialValue !== undefined ? initialValue : controlDef.min, // Default to min if undefined
                decimals: controlDef.decimals, displaySuffix: controlDef.displaySuffix,
                trackRef: track,
                onValueChange: (val) => {
                    track.setSynthParam(controlDef.paramPath, val);
                }
            });
            controlGroup.appendChild(knob.element);
            if (!track.inspectorControls) track.inspectorControls = {};
            track.inspectorControls[controlDef.idPrefix] = knob; // Store for potential refresh
        }
    });
    container.appendChild(controlGroup);
}


function buildSamplerSpecificInspectorDOM(track) { /* ... (remains the same) ... */ }
function buildDrumSamplerSpecificInspectorDOM(track) { /* ... (remains the same) ... */ }
function buildInstrumentSamplerSpecificInspectorDOM(track) { /* ... (remains the same) ... */ }

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
            // Ensure params for the new engine type exist or are defaulted
            if (!track.synthParams[newEngineType.toLowerCase()]) {
                 track.synthParams[newEngineType.toLowerCase()] = track.getDefaultSynthParams(newEngineType);
            }

            // Re-initialize the instrument with the new engine type
            // This will also apply the default/existing parameters for that engine
            if (typeof track.initializeInstrument === 'function') {
                await track.initializeInstrument();
            }

            // Rebuild the UI controls for the new engine type
            buildSynthEngineControls(track, controlsContainer, newEngineType);
            // Refresh visuals for any newly created knobs
            setTimeout(() => {
                Object.values(track.inspectorControls).forEach(control => {
                    if (control && control.type === 'knob' && typeof control.refreshVisuals === 'function') {
                        control.refreshVisuals();
                    }
                });
            }, 0);
        });
        // Initial population is handled by buildSynthSpecificInspectorDOM calling buildSynthEngineControls
    }
}


function initializeSamplerSpecificControls(track, winEl) { /* ... (remains the same) ... */ }
function initializeDrumSamplerSpecificControls(track, winEl) { /* ... (remains the same) ... */ }
function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... (remains the same) ... */ }

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

