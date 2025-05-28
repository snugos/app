// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Poly/Mono Fix Attempt v6');

import { SnugWindow } from './SnugWindow.js';
import { showNotification, createDropZoneHTML, setupDropZoneListeners as utilSetupDropZoneListeners, showCustomModal } from './utils.js';
import * as Constants from './constants.js';
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
} from './eventHandlers.js';
import { AVAILABLE_EFFECTS, getEffectParamDefinitions } from './effectsRegistry.js';
import { getMimeTypeFromFilename } from './audio.js';

// --- Knob UI ---
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
    let currentValue = options.initialValue === undefined ? (options.min !== undefined ? options.min : 0) : options.initialValue;
    const min = options.min === undefined ? 0 : options.min;
    const max = options.max === undefined ? 100 : options.max;
    const step = options.step === undefined ? 1 : options.step;
    const range = max - min;
    const maxDegrees = options.maxDegrees || 270;
    const BASE_PIXELS_PER_FULL_RANGE_MOUSE = 300;
    const BASE_PIXELS_PER_FULL_RANGE_TOUCH = 450;
    let initialValueBeforeInteraction = currentValue;

    function updateKnobVisual() {
        const percentage = range === 0 ? 0 : (currentValue - min) / range;
        const rotation = (percentage * maxDegrees) - (maxDegrees / 2);
        handleEl.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        valueEl.textContent = typeof currentValue === 'number' ? currentValue.toFixed(options.decimals !== undefined ? options.decimals : (step < 1 && step !== 0 ? 2 : 0)) : currentValue;
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
        if (triggerCallback && options.onValueChange && (oldValue !== currentValue || fromInteraction) ) {
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

// --- Synth Inspector Specifics ---
// ... (buildSynthSpecificInspectorDOM and buildSynthEngineControls remain the same)
const synthEngineControlDefinitions = {
    'MonoSynth': [
        { idPrefix: 'msOscType', type: 'select', label: 'Osc Type', options: ['sine', 'square', 'sawtooth', 'triangle', 'pwm', 'pulse'], paramPath: 'oscillator.type' },
        { idPrefix: 'msPortamento', type: 'knob', label: 'Portamento', min: 0, max: 0.5, step: 0.001, paramPath: 'portamento', decimals: 3, displaySuffix: 's' },
        { idPrefix: 'msEnvAttack', type: 'knob', label: 'Amp Attack', min: 0.005, max: 2, step: 0.001, paramPath: 'envelope.attack', decimals: 3, displaySuffix: 's' },
        { idPrefix: 'msEnvDecay', type: 'knob', label: 'Amp Decay', min: 0.01, max: 2, step: 0.01, paramPath: 'envelope.decay', decimals: 2, displaySuffix: 's' },
        { idPrefix: 'msEnvSustain', type: 'knob', label: 'Amp Sustain', min: 0, max: 1, step: 0.01, paramPath: 'envelope.sustain', decimals: 2 },
        { idPrefix: 'msEnvRelease', type: 'knob', label: 'Amp Release', min: 0.01, max: 5, step: 0.01, paramPath: 'envelope.release', decimals: 2, displaySuffix: 's' },
        { idPrefix: 'msFiltType', type: 'select', label: 'Filt Type', options: ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'notch', 'allpass', 'peaking'], paramPath: 'filter.type' },
        { idPrefix: 'msFiltRolloff', type: 'select', label: 'Filt Rolloff', options: ['-12', '-24', '-48', '-96'], paramPath: 'filter.rolloff' },
        { idPrefix: 'msFiltQ', type: 'knob', label: 'Filt Q', min: 0.1, max: 20, step: 0.1, paramPath: 'filter.Q', decimals: 1 },
        { idPrefix: 'msFiltEnvAttack', type: 'knob', label: 'Filt Attack', min: 0.001, max: 2, step: 0.001, paramPath: 'filterEnvelope.attack', decimals: 3, displaySuffix: 's' },
        { idPrefix: 'msFiltEnvDecay', type: 'knob', label: 'Filt Decay', min: 0.01, max: 2, step: 0.01, paramPath: 'filterEnvelope.decay', decimals: 2, displaySuffix: 's' },
        { idPrefix: 'msFiltEnvSustain', type: 'knob', label: 'Filt Sustain', min: 0, max: 1, step: 0.01, paramPath: 'filterEnvelope.sustain', decimals: 2 },
        { idPrefix: 'msFiltEnvRelease', type: 'knob', label: 'Filt Release', min: 0.01, max: 5, step: 0.01, paramPath: 'filterEnvelope.release', decimals: 2, displaySuffix: 's' },
        { idPrefix: 'msFiltEnvBaseFreq', type: 'knob', label: 'Filt Base Freq', min: 20, max: 10000, step: 1, paramPath: 'filterEnvelope.baseFrequency', decimals: 0, displaySuffix: 'Hz' },
        { idPrefix: 'msFiltEnvOctaves', type: 'knob', label: 'Filt Octaves', min: 0, max: 10, step: 0.1, paramPath: 'filterEnvelope.octaves', decimals: 1 },
        { idPrefix: 'msFiltEnvExponent', type: 'knob', label: 'Filt Exp', min: 0.1, max: 4, step: 0.1, paramPath: 'filterEnvelope.exponent', decimals: 1 },
    ]
};
function buildSynthSpecificInspectorDOM(track) {
    const panel = document.createElement('div'); panel.className = 'panel synth-panel';
    const engineTitle = document.createElement('h4'); engineTitle.className = 'text-sm font-semibold mb-1'; engineTitle.textContent = 'MonoSynth Controls'; panel.appendChild(engineTitle);
    const engineControlsContainer = document.createElement('div'); engineControlsContainer.id = `synthEngineControls-${track.id}`; engineControlsContainer.className = 'synth-engine-controls-container mt-2'; panel.appendChild(engineControlsContainer);
    buildSynthEngineControls(track, engineControlsContainer, 'MonoSynth');
    return panel;
}
function buildSynthEngineControls(track, container, engineType) {
    container.innerHTML = ''; const controls = synthEngineControlDefinitions[engineType];
    if (!controls) { container.textContent = `Controls for ${engineType} not defined.`; console.error(`No control definitions for ${engineType}`); return; }
    const controlGroup = document.createElement('div'); controlGroup.className = 'control-group';
    controls.forEach(controlDef => {
        const controlId = `${controlDef.idPrefix}-${track.id}`;
        let currentEngineParams = track.synthParams;
        if (!currentEngineParams || Object.keys(currentEngineParams).length === 0) { currentEngineParams = track.getDefaultSynthParams(); track.synthParams = currentEngineParams; }
        const getNestedValue = (obj, path) => { if (!obj || !path) return undefined; const keys = path.split('.'); let current = obj; for (const key of keys) { if (current && typeof current === 'object' && key in current) current = current[key]; else return undefined; } return current; };
        let initialValue = getNestedValue(currentEngineParams, controlDef.paramPath);
        if (initialValue === undefined) { const defaultParams = track.getDefaultSynthParams(); initialValue = getNestedValue(defaultParams, controlDef.paramPath); if(initialValue === undefined && controlDef.type === 'knob') initialValue = controlDef.min; if(initialValue === undefined && controlDef.type === 'select') initialValue = controlDef.options[0]; }
        if (controlDef.type === 'select') {
            const selectContainer = document.createElement('div'); selectContainer.className = 'mb-2 flex flex-col items-start'; const labelEl = document.createElement('label'); labelEl.htmlFor = controlId; labelEl.className = 'knob-label text-xs mb-0.5'; labelEl.textContent = controlDef.label; selectContainer.appendChild(labelEl);
            const selectEl = document.createElement('select'); selectEl.id = controlId; selectEl.className = 'text-xs p-1 border w-full bg-white text-black rounded-sm focus:ring-blue-500 focus:border-blue-500'; controlDef.options.forEach(opt => selectEl.add(new Option(opt, opt))); selectEl.value = initialValue;
            selectEl.addEventListener('change', (e) => {
                if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set ${track.name} ${controlDef.label} to ${e.target.value}`);
                track.setSynthParam(controlDef.paramPath, e.target.value);
            });
            selectContainer.appendChild(selectEl); controlGroup.appendChild(selectContainer);
        } else if (controlDef.type === 'knob') {
            const knob = createKnob({
                label: controlDef.label,
                min: controlDef.min, max: controlDef.max, step: controlDef.step,
                initialValue: initialValue, decimals: controlDef.decimals,
                displaySuffix: controlDef.displaySuffix, trackRef: track,
                onValueChange: (val) => {
                    track.setSynthParam(controlDef.paramPath, val);
                }
            });
            controlGroup.appendChild(knob.element); if (!track.inspectorControls) track.inspectorControls = {}; track.inspectorControls[controlDef.idPrefix] = knob;
        }
    });
    container.appendChild(controlGroup);
}


// --- Sampler Inspector Specifics ---
// ... (buildSamplerSpecificInspectorDOM remains largely the same, only control init changes)
function buildSamplerSpecificInspectorDOM(track) {
    const panel = document.createElement('div'); panel.className = 'panel sampler-panel';
    const dzContainer = document.createElement('div');
    dzContainer.id = `dropZoneContainer-${track.id}-sampler`;
    dzContainer.innerHTML = createDropZoneHTML(track.id, `fileInput-${track.id}`, 'Sampler', null, track.samplerAudioData);
    panel.appendChild(dzContainer);
    const editorPanel = document.createElement('div'); editorPanel.className = 'sampler-editor-panel mt-1 flex flex-wrap md:flex-nowrap gap-3';
    const leftSide = document.createElement('div'); leftSide.className = 'flex-grow w-full md:w-3/5';
    const canvas = document.createElement('canvas'); canvas.id = `waveformCanvas-${track.id}`; canvas.className = 'waveform-canvas w-full'; canvas.width = 380; canvas.height = 70; leftSide.appendChild(canvas);
    const padsContainer = document.createElement('div'); padsContainer.id = `samplePadsContainer-${track.id}`; padsContainer.className = 'pads-container mt-2'; leftSide.appendChild(padsContainer); editorPanel.appendChild(leftSide);
    const rightSide = document.createElement('div'); rightSide.id = `sliceControlsContainer-${track.id}`; rightSide.className = 'slice-edit-group w-full md:w-2/5 space-y-1';
    const sliceTitle = document.createElement('h4'); sliceTitle.className = 'text-sm font-semibold'; sliceTitle.innerHTML = `Slice: <span id="selectedSliceLabel-${track.id}">${track.selectedSliceForEdit + 1}</span>`; rightSide.appendChild(sliceTitle);
    ['Start', 'End'].forEach(label => { const div = document.createElement('div'); div.className='flex gap-1 items-center text-xs'; const lbl = document.createElement('label'); lbl.textContent=`${label}:`; div.appendChild(lbl); const input = document.createElement('input'); input.type='number'; input.id=`slice${label}-${track.id}`; input.className='flex-grow p-0.5 text-xs bg-white text-black border'; div.appendChild(input); rightSide.appendChild(div); });
    const applyBtn = document.createElement('button'); applyBtn.id=`applySliceEditsBtn-${track.id}`; applyBtn.className='bg-blue-500 text-white text-xs py-0.5 px-1.5 rounded mt-1 hover:bg-blue-600'; applyBtn.textContent='Apply S/E'; rightSide.appendChild(applyBtn);
    const vpGroup = document.createElement('div'); vpGroup.className='control-group mt-1'; const vp1=document.createElement('div'); vp1.id=`sliceVolumeSlider-${track.id}`; vpGroup.appendChild(vp1); const vp2=document.createElement('div'); vp2.id=`slicePitchKnob-${track.id}`; vpGroup.appendChild(vp2); rightSide.appendChild(vpGroup);
    const lrGroup = document.createElement('div'); lrGroup.className='flex gap-2 mt-1'; const lBtn=document.createElement('button'); lBtn.id=`sliceLoopToggle-${track.id}`; lBtn.className='slice-toggle-button text-xs p-1'; lBtn.textContent='Loop'; lrGroup.appendChild(lBtn); const rBtn=document.createElement('button'); rBtn.id=`sliceReverseToggle-${track.id}`; rBtn.className='slice-toggle-button text-xs p-1'; rBtn.textContent='Reverse'; lrGroup.appendChild(rBtn); rightSide.appendChild(lrGroup);
    const polyBtn = document.createElement('button'); polyBtn.id=`slicerPolyphonyToggle-${track.id}`; polyBtn.className='slice-toggle-button text-xs p-1 mt-1 w-full'; polyBtn.textContent='Mode: Poly'; rightSide.appendChild(polyBtn);
    const details=document.createElement('details'); details.className='mt-1'; const summary=document.createElement('summary'); summary.className='text-xs font-semibold'; summary.textContent='Slice Env'; details.appendChild(summary); const seGroup=document.createElement('div'); seGroup.className='control-group'; ['sliceEnvAttackSlider','sliceEnvDecaySlider','sliceEnvSustainSlider','sliceEnvReleaseSlider'].forEach(id=>{const ph=document.createElement('div'); ph.id=`${id}-${track.id}`; seGroup.appendChild(ph);}); details.appendChild(seGroup); rightSide.appendChild(details);
    const sampleStatus = track.samplerAudioData?.status;
    if (sampleStatus !== 'loaded') {
        rightSide.querySelectorAll('input, button, select, details').forEach(el => {
            if (!el.closest('.drop-zone-relink-container') && !el.classList.contains('drop-zone-relink-button')) {
                 el.disabled = true;
            }
        });
        rightSide.style.opacity = '0.5';
    }
    editorPanel.appendChild(rightSide); panel.appendChild(editorPanel); return panel;
}

// --- Drum Sampler Inspector Specifics ---
// ... (buildDrumSamplerSpecificInspectorDOM remains the same)
function buildDrumSamplerSpecificInspectorDOM(track) {
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] START for track ${track.id}`);
    const panel = document.createElement('div');
    panel.className = 'panel drum-sampler-panel';
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] Panel created:`, panel);

    const title = document.createElement('h4');
    title.className = 'text-sm font-semibold mb-1';
    title.innerHTML = `Sampler Pads (Selected: <span id="selectedDrumPadLabel-${track.id}">${track.selectedDrumPadForEdit + 1}</span>)`;
    panel.appendChild(title);
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] Title appended:`, title);

    const padsContainer = document.createElement('div');
    padsContainer.id = `drumSamplerPadsContainer-${track.id}`;
    padsContainer.className = 'pads-container mb-2';
    panel.appendChild(padsContainer);
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] PadsContainer appended:`, padsContainer);

    const controlsContainer = document.createElement('div');
    controlsContainer.id = `drumPadControlsContainer-${track.id}`;
    controlsContainer.className = 'border-t pt-2';
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] ControlsContainer created:`, controlsContainer);

    const loadContainer = document.createElement('div');
    loadContainer.id = `drumPadLoadContainer-${track.id}`;
    loadContainer.className = 'mb-2';
    controlsContainer.appendChild(loadContainer);
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] LoadContainer appended to ControlsContainer:`, loadContainer);

    const volPitchGroup = document.createElement('div');
    volPitchGroup.className = 'control-group';
    const volPlaceholder = document.createElement('div');
    volPlaceholder.id = `drumPadVolumeSlider-${track.id}`;
    volPitchGroup.appendChild(volPlaceholder);
    const pitchPlaceholder = document.createElement('div');
    pitchPlaceholder.id = `drumPadPitchKnob-${track.id}`;
    volPitchGroup.appendChild(pitchPlaceholder);
    controlsContainer.appendChild(volPitchGroup);
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] VolPitchGroup appended:`, volPitchGroup);

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
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] Envelope details appended:`, details);

    panel.appendChild(controlsContainer);
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] ControlsContainer appended to Panel.`);

    const selectedPadData = track.drumSamplerPads[track.selectedDrumPadForEdit];
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] Selected pad data (for status check):`, selectedPadData);
    if (selectedPadData?.status !== 'loaded') {
        console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] Selected pad status is NOT 'loaded' (it's '${selectedPadData?.status}'). Disabling controls.`);
        controlsContainer.querySelectorAll('input, button, select, details').forEach(el => {
             if (!el.closest('.drop-zone-relink-container') && !el.classList.contains('drop-zone-relink-button') && el.id !== `drumPadLoadContainer-${track.id}`) {
                el.disabled = true;
             }
        });
        controlsContainer.style.opacity = '0.5';
    } else {
        console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] Selected pad status IS 'loaded'. Controls should be enabled.`);
    }
    console.log(`[UI - buildDrumSamplerSpecificInspectorDOM] FINISHED. Returning panel:`, panel);
    return panel;
}

// --- Instrument Sampler Inspector Specifics ---
// ... (buildInstrumentSamplerSpecificInspectorDOM remains the same)
function buildInstrumentSamplerSpecificInspectorDOM(track) {
    const panel = document.createElement('div');
    panel.className = 'panel instrument-sampler-panel';

    const dzContainer = document.createElement('div');
    dzContainer.id = `dropZoneContainer-${track.id}-instrumentsampler`;
    dzContainer.innerHTML = createDropZoneHTML(track.id, `instrumentFileInput-${track.id}`, 'InstrumentSampler', null, track.instrumentSamplerSettings);
    panel.appendChild(dzContainer);

    const editorPanel = document.createElement('div');
    editorPanel.className = 'instrument-sampler-editor-panel mt-1 flex flex-wrap md:flex-nowrap gap-3';

    const leftSide = document.createElement('div');
    leftSide.className = 'flex-grow w-full md:w-3/5';
    const canvas = document.createElement('canvas');
    canvas.id = `instrumentWaveformCanvas-${track.id}`;
    canvas.className = 'waveform-canvas w-full';
    canvas.width = 380;
    canvas.height = 70;
    leftSide.appendChild(canvas);
    editorPanel.appendChild(leftSide);

    const rightSide = document.createElement('div');
    rightSide.id = `instrumentSamplerControlsContainer-${track.id}`;
    rightSide.className = 'instrument-sampler-controls w-full md:w-2/5 space-y-1';

    const rootNoteGroup = document.createElement('div');
    rootNoteGroup.className = 'flex flex-col items-start text-xs';
    const rootNoteLabel = document.createElement('label');
    rootNoteLabel.htmlFor = `instrumentRootNote-${track.id}`;
    rootNoteLabel.className = 'knob-label';
    rootNoteLabel.textContent = 'Root Note:';
    rootNoteGroup.appendChild(rootNoteLabel);
    const rootNoteInput = document.createElement('input');
    rootNoteInput.type = 'text';
    rootNoteInput.id = `instrumentRootNote-${track.id}`;
    rootNoteInput.value = track.instrumentSamplerSettings.rootNote || 'C4';
    rootNoteInput.className = 'p-1 text-xs bg-white text-black border w-full rounded-sm';
    rootNoteInput.title = 'Enter a MIDI note name (e.g., C4, F#3)';
    rootNoteGroup.appendChild(rootNoteInput);
    rightSide.appendChild(rootNoteGroup);

    const loopToggleBtn = document.createElement('button');
    loopToggleBtn.id = `instrumentLoopToggle-${track.id}`;
    loopToggleBtn.className = 'slice-toggle-button text-xs p-1 mt-1 w-full';
    loopToggleBtn.textContent = track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF';
    rightSide.appendChild(loopToggleBtn);

    const loopPointsGroup = document.createElement('div');
    loopPointsGroup.id = `instrumentLoopPointsGroup-${track.id}`;
    loopPointsGroup.className = 'space-y-1 mt-1' + (track.instrumentSamplerSettings.loop ? '' : ' hidden');
    ['Loop Start', 'Loop End'].forEach(label => {
        const div = document.createElement('div');
        div.className = 'flex gap-1 items-center text-xs';
        const lbl = document.createElement('label');
        lbl.textContent = `${label}:`;
        div.appendChild(lbl);
        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.001';
        input.min = '0';
        input.id = `instrument${label.replace(/\s+/g, '')}-${track.id}`;
        input.className = 'flex-grow p-0.5 text-xs bg-white text-black border';
        div.appendChild(input);
        loopPointsGroup.appendChild(div);
    });
    rightSide.appendChild(loopPointsGroup);


    const polyBtn = document.createElement('button');
    polyBtn.id = `instrumentSamplerPolyphonyToggle-${track.id}`;
    polyBtn.className = 'slice-toggle-button text-xs p-1 mt-1 w-full';
    polyBtn.textContent = track.instrumentSamplerIsPolyphonic ? 'Mode: Poly' : 'Mode: Mono';
    rightSide.appendChild(polyBtn);


    const details = document.createElement('details');
    details.className = 'mt-1';
    const summary = document.createElement('summary');
    summary.className = 'text-xs font-semibold';
    summary.textContent = 'Instrument Envelope';
    details.appendChild(summary);
    const envGroup = document.createElement('div');
    envGroup.className = 'control-group';
    ['instrumentEnvAttackSlider', 'instrumentEnvDecaySlider', 'instrumentEnvSustainSlider', 'instrumentEnvReleaseSlider'].forEach(idPrefix => {
        const placeholder = document.createElement('div');
        placeholder.id = `${idPrefix}-${track.id}`;
        envGroup.appendChild(placeholder);
    });
    details.appendChild(envGroup);
    rightSide.appendChild(details);

    const sampleStatus = track.instrumentSamplerSettings?.status;
    if (sampleStatus !== 'loaded') {
        rightSide.querySelectorAll('input, button, select, details').forEach(el => {
            if (!el.closest('.drop-zone-relink-container') && !el.classList.contains('drop-zone-relink-button')) {
                 el.disabled = true;
            }
        });
        rightSide.style.opacity = '0.5';
    }

    editorPanel.appendChild(rightSide);
    panel.appendChild(editorPanel);
    return panel;
}


// --- Track Inspector Window & Controls Initialization ---
// ... (buildTrackInspectorContentDOM remains the same)
export function buildTrackInspectorContentDOM(track) {
    console.log(`[UI - buildTrackInspectorContentDOM V3.1] Building content for track ${track?.id} (${track?.name}), type: ${track?.type}`);
    if (!track || !track.id || !track.type || !track.name) {
        console.error(`[UI - buildTrackInspectorContentDOM V3.1] Invalid track object received:`, track);
        const errorDiv = document.createElement('div');
        errorDiv.textContent = "Error: Invalid track data for inspector.";
        errorDiv.className = 'p-2 text-red-500 text-lg font-bold';
        return errorDiv;
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'track-inspector-content p-2 space-y-1';

    try {
        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex items-center justify-between mb-1';
        const nameInput = document.createElement('input');
        nameInput.type = 'text'; nameInput.id = `trackNameDisplay-${track.id}`; nameInput.value = track.name;
        nameInput.className = 'text-md font-bold bg-transparent border-b w-full focus:ring-0 focus:border-blue-500';
        headerDiv.appendChild(nameInput);
        const meterContainer = document.createElement('div');
        meterContainer.id = `trackMeterContainer-${track.id}`;
        meterContainer.className = 'track-meter-container meter-bar-container w-1/3 ml-2 h-4';
        const meterBar = document.createElement('div'); meterBar.id = `trackMeterBar-${track.id}`; meterBar.className = 'meter-bar';
        meterContainer.appendChild(meterBar);
        headerDiv.appendChild(meterContainer);
        contentDiv.appendChild(headerDiv);
        console.log(`[UI - buildTrackInspectorContentDOM V3.1] Header built for track ${track.id}`);

        const actionsDiv = document.createElement('div'); actionsDiv.className = 'flex items-center gap-1 mb-1';
        const muteBtn = document.createElement('button'); muteBtn.id = `muteBtn-${track.id}`; muteBtn.className = `mute-button text-xs p-1 ${track.isMuted ? 'muted' : ''}`; muteBtn.textContent = 'M'; muteBtn.addEventListener('click', () => handleTrackMute(track.id)); actionsDiv.appendChild(muteBtn);
        const soloBtn = document.createElement('button'); soloBtn.id = `soloBtn-${track.id}`; const currentSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null; soloBtn.className = `solo-button text-xs p-1 ${currentSoloId === track.id ? 'soloed' : ''}`; soloBtn.textContent = 'S'; soloBtn.addEventListener('click', () => handleTrackSolo(track.id)); actionsDiv.appendChild(soloBtn);
        const armBtn = document.createElement('button'); armBtn.id = `armInputBtn-${track.id}`; const currentArmedId = typeof window.getArmedTrackId === 'function' ? window.getArmedTrackId() : null; armBtn.className = `arm-input-button text-xs p-1 ${currentArmedId === track.id ? 'armed' : ''}`; armBtn.textContent = 'Arm'; armBtn.addEventListener('click', () => handleTrackArm(track.id)); actionsDiv.appendChild(armBtn);
        const removeBtn = document.createElement('button'); removeBtn.id = `removeTrackBtn-${track.id}`; removeBtn.className = 'bg-red-500 hover:bg-red-600 text-white text-xs py-0.5 px-1.5 rounded ml-auto'; removeBtn.textContent = 'Del'; removeBtn.addEventListener('click', () => handleRemoveTrack(track.id)); actionsDiv.appendChild(removeBtn);
        contentDiv.appendChild(actionsDiv);
        console.log(`[UI - buildTrackInspectorContentDOM V3.1] Actions built for track ${track.id}`);

        const trackControlsPanel = document.createElement('div'); trackControlsPanel.className = 'panel';
        const panelTitle = document.createElement('h4'); panelTitle.className = 'text-sm font-semibold mb-1'; panelTitle.textContent = 'Track Controls'; trackControlsPanel.appendChild(panelTitle);
        const controlGroup = document.createElement('div'); controlGroup.className = 'control-group';
        const volumeContainer = document.createElement('div'); volumeContainer.id = `volumeSliderContainer-${track.id}`; controlGroup.appendChild(volumeContainer);
        const seqLengthContainer = document.createElement('div'); seqLengthContainer.className = 'flex flex-col items-center space-y-1';
        const currentBars = track.sequenceLength / Constants.STEPS_PER_BAR;
        const seqLabel = document.createElement('label'); seqLabel.htmlFor = `sequenceLengthBars-${track.id}`; seqLabel.className = 'knob-label'; seqLabel.textContent = 'Seq Len (Bars)'; seqLengthContainer.appendChild(seqLabel);
        const seqInput = document.createElement('input'); seqInput.type = 'number'; seqInput.id = `sequenceLengthBars-${track.id}`; seqInput.value = currentBars; seqInput.min = "1"; seqInput.max = "256"; seqInput.step = "1"; seqInput.className = 'bg-white text-black w-16 p-1 rounded-sm text-center text-xs border border-gray-500'; seqLengthContainer.appendChild(seqInput);
        const seqDisplay = document.createElement('span'); seqDisplay.id = `sequenceLengthDisplay-${track.id}`; seqDisplay.className = 'knob-value'; seqDisplay.textContent = `${currentBars} bars (${track.sequenceLength} steps)`; seqLengthContainer.appendChild(seqDisplay);
        const doubleSeqButton = document.createElement('button'); doubleSeqButton.id = `doubleSeqBtn-${track.id}`; doubleSeqButton.className = 'bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded w-full mt-1'; doubleSeqButton.title = 'Double sequence length and content'; doubleSeqButton.textContent = 'Double';
        doubleSeqButton.addEventListener('click', async () => {
            if (!track) return;
            if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Double sequence for ${track.name}`);
            await track.doubleSequence();
            if (track.sequencerWindow && !track.sequencerWindow.isMinimized && typeof window.openTrackSequencerWindow === 'function') {
                window.openTrackSequencerWindow(track.id, true); // Force redraw
            }
             const newBars = track.sequenceLength / Constants.STEPS_PER_BAR;
            if(seqInput) seqInput.value = newBars;
            if(seqDisplay) seqDisplay.textContent = `${newBars} bars (${track.sequenceLength} steps)`;

            showNotification(`Sequence for ${track.name} doubled to ${newBars} bars.`, 2000);
        });
        seqLengthContainer.appendChild(doubleSeqButton); controlGroup.appendChild(seqLengthContainer); trackControlsPanel.appendChild(controlGroup);
        contentDiv.appendChild(trackControlsPanel);
        console.log(`[UI - buildTrackInspectorContentDOM V3.1] Track controls panel built for track ${track.id}`);

        let specificContentElement = null;
        console.log(`[UI - buildTrackInspectorContentDOM V3.1] About to call specific DOM builder for type: ${track.type}`);
        try {
            if (track.type === 'Synth') specificContentElement = buildSynthSpecificInspectorDOM(track);
            else if (track.type === 'Sampler') specificContentElement = buildSamplerSpecificInspectorDOM(track);
            else if (track.type === 'DrumSampler') specificContentElement = buildDrumSamplerSpecificInspectorDOM(track);
            else if (track.type === 'InstrumentSampler') specificContentElement = buildInstrumentSamplerSpecificInspectorDOM(track);
            else console.warn(`[UI - buildTrackInspectorContentDOM V3.1] Unknown track type for specific content: ${track.type}`);
            console.log(`[UI - buildTrackInspectorContentDOM V3.1] specificContentElement after build call:`, specificContentElement);
        } catch (specificBuildError) {
            console.error(`[UI - buildTrackInspectorContentDOM V3.1] Error in specific DOM builder for type ${track.type}:`, specificBuildError);
            const errorMsg = document.createElement('p');
            errorMsg.textContent = `Error building UI for ${track.type}: ${specificBuildError.message}. Check console.`;
            errorMsg.className = 'text-red-500 text-xs';
            contentDiv.appendChild(errorMsg);
        }

        if (specificContentElement) {
            contentDiv.appendChild(specificContentElement);
            console.log(`[UI - buildTrackInspectorContentDOM V3.1] Appended specific content for ${track.type}`);
        } else if (track.type === 'Synth' || track.type === 'Sampler' || track.type === 'DrumSampler' || track.type === 'InstrumentSampler') {
            console.warn(`[UI - buildTrackInspectorContentDOM V3.1] specificContentElement for track type ${track.type} was null or undefined (and no error caught in its builder). This will likely result in missing UI parts.`);
        }

        const effectsButton = document.createElement('button'); effectsButton.className = 'effects-rack-button text-xs py-1 px-2 rounded mt-2 w-full bg-gray-300 hover:bg-gray-400 border border-gray-500'; effectsButton.textContent = 'Track Effects Rack'; effectsButton.addEventListener('click', () => handleOpenEffectsRack(track.id));
        contentDiv.appendChild(effectsButton);

        const sequencerButton = document.createElement('button'); sequencerButton.className = 'bg-indigo-500 hover:bg-indigo-600 text-white text-xs py-1 px-2 rounded mt-1 w-full'; sequencerButton.textContent = 'Sequencer'; sequencerButton.addEventListener('click', () => handleOpenSequencer(track.id));
        contentDiv.appendChild(sequencerButton);

        console.log(`[UI - buildTrackInspectorContentDOM V3.1] Successfully built contentDiv for track ${track.id}:`, contentDiv);
        return contentDiv;

    } catch (error) {
        console.error(`[UI - buildTrackInspectorContentDOM V3.1] MAJOR ERROR building inspector for track ${track.id}:`, error);
        showNotification(`Critical error building inspector for ${track.name}.`, 5000);
        const errorDiv = document.createElement('div');
        errorDiv.textContent = "Error building inspector content. See console.";
        errorDiv.className = 'p-2 text-red-500 text-lg font-bold';
        return errorDiv;
    }
}
// ... (openTrackInspectorWindow remains mostly the same)
export function openTrackInspectorWindow(trackId, savedState = null) {
    console.log(`[UI - openTrackInspectorWindow] Called for trackId: ${trackId}`);
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null;
    if (!track) {
        showNotification(`Track ID ${trackId} not found. Cannot open inspector.`, 3000);
        console.error(`[UI - openTrackInspectorWindow] Track object not found for ID: ${trackId}`);
        return null;
    }
    console.log(`[UI - openTrackInspectorWindow] Track found: ${track.name}, Type: ${track.type}`);

    const inspectorId = `trackInspector-${track.id}`;
    if (window.openWindows[inspectorId] && !savedState) {
        window.openWindows[inspectorId].restore();
        return window.openWindows[inspectorId];
    }
    if (window.openWindows[inspectorId] && savedState) { // If restoring from saved state, close existing first
        try { window.openWindows[inspectorId].close(true); } catch(e) {/* ignore */}
    }


    track.inspectorControls = {}; // Reset inspector controls specific to this track instance
    console.log(`[UI - openTrackInspectorWindow] Building content DOM for track ${track.id}`);
    const inspectorContentElement = buildTrackInspectorContentDOM(track);

    if (!inspectorContentElement || !(inspectorContentElement instanceof HTMLElement)) {
        showNotification(`Failed to build Inspector content for Track ${track.id}. See console.`, 4000);
        console.error(`[UI - openTrackInspectorWindow] buildTrackInspectorContentDOM returned null or not an HTMLElement for track ${track.id}. CANNOT CREATE WINDOW. Received:`, inspectorContentElement);
        return null;
    }
    console.log(`[UI - openTrackInspectorWindow] inspectorContentElement received from build (is it an HTMLElement?):`, inspectorContentElement instanceof HTMLElement, inspectorContentElement);

    let windowHeight = 450;
    if (track.type === 'Synth') windowHeight = 620;
    else if (track.type === 'Sampler') windowHeight = 620;
    else if (track.type === 'DrumSampler') windowHeight = 580;
    else if (track.type === 'InstrumentSampler') windowHeight = 620;

    const desktopEl = document.getElementById('desktop');
    let defaultWidth = 500;
    if (desktopEl) {
        defaultWidth = Math.min(500, desktopEl.offsetWidth - 40);
        windowHeight = Math.min(windowHeight, desktopEl.offsetHeight - 80);
    }


    const winOptions = {
        width: defaultWidth,
        height: windowHeight,
        initialContentKey: `trackInspector-${track.id}`
    };
    if (savedState) {
        Object.assign(winOptions, savedState);
         console.log(`[UI - openTrackInspectorWindow] Applying saved state: `, savedState);
    }


    console.log(`[UI - openTrackInspectorWindow] Creating SnugWindow for inspector ${inspectorId}`);
    let inspectorWin = null;
    try {
        inspectorWin = new SnugWindow(inspectorId, `Track: ${track.name}`, inspectorContentElement, winOptions);
    } catch (e) {
        console.error(`[UI - openTrackInspectorWindow] CRITICAL ERROR during \`new SnugWindow()\` for inspector ${inspectorId}:`, e);
        showNotification("CRITICAL: Error creating inspector window.", 6000);
        return null;
    }

    if (!inspectorWin || !inspectorWin.element) {
        showNotification(`Failed to create Inspector window for track ${track.id}.`, 5000);
         console.error(`[UI - openTrackInspectorWindow] SnugWindow instance or its element is null for inspector ${inspectorId}. Instance:`, inspectorWin);
        return null;
    }
    track.inspectorWindow = inspectorWin;
    console.log(`[UI - openTrackInspectorWindow] Inspector window created for ${track.id}. Element:`, inspectorWin.element);

    console.log(`[UI - openTrackInspectorWindow] Calling initializeCommonInspectorControls for track ${track.id}`);
    initializeCommonInspectorControls(track, inspectorWin.element);

    console.log(`[UI - openTrackInspectorWindow] Calling initializeTypeSpecificInspectorControls for track ${track.id} of type ${track.type}`);
    initializeTypeSpecificInspectorControls(track, inspectorWin.element);

    console.log(`[UI - openTrackInspectorWindow] Scheduling knob refresh for track ${track.id}`);
    setTimeout(() => {
        Object.values(track.inspectorControls).forEach(control => {
            if (control?.type === 'knob' && typeof control.refreshVisuals === 'function') {
                control.refreshVisuals();
            }
        });
    }, 50);

    console.log(`[UI - openTrackInspectorWindow] Finished for track ${track.id}`);
    return inspectorWin;
}

// ... (initializeCommonInspectorControls remains the same)
export function initializeCommonInspectorControls(track, winEl) {
    console.log(`[UI - initializeCommonInspectorControls] Initializing for track ${track.id}, winEl:`, winEl);
    if (!winEl) {
        console.error(`[UI - initializeCommonInspectorControls] Window element is null for track ${track.id}. Cannot initialize controls.`);
        return;
    }

    const nameInput = winEl.querySelector(`#trackNameDisplay-${track.id}`);
    if (nameInput) {
        nameInput.addEventListener('change', (e) => {
            const oldName = track.name;
            track.name = e.target.value;
            if (track.inspectorWindow && track.inspectorWindow.titleBar) {
                track.inspectorWindow.titleBar.querySelector('span').textContent = `Track: ${track.name}`;
            }
            if (track.sequencerWindow && track.sequencerWindow.titleBar) {
                track.sequencerWindow.titleBar.querySelector('span').textContent = `Sequencer: ${track.name}`;
            }
            if (track.effectsRackWindow && track.effectsRackWindow.titleBar) {
                track.effectsRackWindow.titleBar.querySelector('span').textContent = `Effects: ${track.name}`;
            }
            if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
            if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Rename track "${oldName}" to "${track.name}"`);
        });
    } else { console.warn(`[UI - initializeCommonInspectorControls] Track name input not found for ${track.id}`); }

    const volumeContainer = winEl.querySelector(`#volumeSliderContainer-${track.id}`);
    if (volumeContainer) {
        const volKnob = createKnob({
            label: 'Volume', min: -60, max: 6, step: 0.1,
            initialValue: Tone.gainToDb(track.gainNode.gain.value),
            decimals: 1, displaySuffix: 'dB', trackRef: track,
            onValueChange: (val) => {
                track.setVolume(Tone.dbToGain(val), true);
                if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
            }
        });
        volumeContainer.appendChild(volKnob.element); track.inspectorControls.volume = volKnob;
    } else { console.warn(`[UI - initializeCommonInspectorControls] Volume container not found for ${track.id}`); }

    const seqLenInput = winEl.querySelector(`#sequenceLengthBars-${track.id}`);
    const seqLenDisplay = winEl.querySelector(`#sequenceLengthDisplay-${track.id}`);
    if (seqLenInput && seqLenDisplay) {
        const currentBars = track.sequenceLength / Constants.STEPS_PER_BAR;
        seqLenInput.value = currentBars;
        seqLenDisplay.textContent = `${currentBars} bars (${track.sequenceLength} steps)`;
        seqLenInput.addEventListener('change', (e) => {
            let newBarLength = parseInt(e.target.value);
            if (isNaN(newBarLength) || newBarLength < 1) newBarLength = 1;
            if (newBarLength > 256) newBarLength = 256; // Max limit
            e.target.value = newBarLength; // Update input with sanitized value
            const newStepLength = newBarLength * Constants.STEPS_PER_BAR;
            if (track.sequenceLength !== newStepLength) {
                track.setSequenceLength(newStepLength, false); // false to allow undo capture
                seqLenDisplay.textContent = `${newBarLength} bars (${newStepLength} steps)`;
            }
        });
    } else {
        console.warn(`[UI - initializeCommonInspectorControls] Sequence length input or display not found for ${track.id}`);
    }
}


export function initializeTypeSpecificInspectorControls(track, winEl) {
    if (track.type === 'Synth') initializeSynthSpecificControls(track, winEl);
    else if (track.type === 'Sampler') initializeSamplerSpecificControls(track, winEl);
    else if (track.type === 'DrumSampler') initializeDrumSamplerSpecificControls(track, winEl);
    else if (track.type === 'InstrumentSampler') initializeInstrumentSamplerSpecificControls(track, winEl);
}

function initializeSynthSpecificControls(track, winEl) { /* ... (remains the same) ... */ }

function initializeSamplerSpecificControls(track, winEl) {
    // ... (other sampler controls remain the same)
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-sampler`); const fileInputEl = winEl.querySelector(`#fileInput-${track.id}`);
    if (dzContainerEl && fileInputEl) { const dzEl = dzContainerEl.querySelector('.drop-zone'); if (dzEl) utilSetupDropZoneListeners(dzEl, track.id, 'Sampler', null, window.loadSoundFromBrowserToTarget, window.loadSampleFile); fileInputEl.onchange = (e) => { window.loadSampleFile(e, track.id, 'Sampler'); }; }
    if (typeof renderSamplePads === 'function') renderSamplePads(track);
    winEl.querySelector(`#applySliceEditsBtn-${track.id}`)?.addEventListener('click', () => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Apply Slice Edits for ${track.name}`); applySliceEdits(track.id); });
    const canvas = winEl.querySelector(`#waveformCanvas-${track.id}`); if (canvas) { track.waveformCanvasCtx = canvas.getContext('2d'); if(typeof window.drawWaveform === 'function') window.drawWaveform(track); }
    if (typeof updateSliceEditorUI === 'function') updateSliceEditorUI(track);
    const sVolK = createKnob({ label: 'Vol', min:0, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceVolume(track.selectedSliceForEdit, val)}); const volPh = winEl.querySelector(`#sliceVolumeSlider-${track.id}`); if(volPh) { volPh.innerHTML = ''; volPh.appendChild(sVolK.element); } track.inspectorControls.sliceVolume = sVolK;
    const sPitK = createKnob({ label: 'Pitch', min:-24, max:24, step:1, initialValue: track.slices[track.selectedSliceForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setSlicePitchShift(track.selectedSliceForEdit, val)}); const pitPh = winEl.querySelector(`#slicePitchKnob-${track.id}`); if(pitPh) { pitPh.innerHTML = ''; pitPh.appendChild(sPitK.element); } track.inspectorControls.slicePitch = sPitK;
    const sEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.attack || 0.01, decimals:3, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'attack', val)}); const attPh = winEl.querySelector(`#sliceEnvAttackSlider-${track.id}`); if(attPh) { attPh.innerHTML = ''; attPh.appendChild(sEAK.element); } track.inspectorControls.sliceEnvAttack = sEAK;
    const sEDK = createKnob({ label: 'Decay', min:0.01, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.decay || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'decay', val)}); const decPh = winEl.querySelector(`#sliceEnvDecaySlider-${track.id}`); if(decPh) { decPh.innerHTML = ''; decPh.appendChild(sEDK.element); } track.inspectorControls.sliceEnvDecay = sEDK;
    const sESK = createKnob({ label: 'Sustain', min:0, max:1, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.sustain || 1.0, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'sustain', val)}); const susPh = winEl.querySelector(`#sliceEnvSustainSlider-${track.id}`); if(susPh) { susPh.innerHTML = ''; susPh.appendChild(sESK.element); } track.inspectorControls.sliceEnvSustain = sESK;
    const sERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.slices[track.selectedSliceForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'release', val)}); const relPh = winEl.querySelector(`#sliceEnvReleaseSlider-${track.id}`); if(relPh) { relPh.innerHTML = ''; relPh.appendChild(sERK.element); } track.inspectorControls.sliceEnvRelease = sERK;
    winEl.querySelector(`#sliceLoopToggle-${track.id}`)?.addEventListener('click', (e) => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Loop for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`); track.setSliceLoop(track.selectedSliceForEdit, !track.slices[track.selectedSliceForEdit].loop); e.target.textContent = track.slices[track.selectedSliceForEdit].loop ? 'Loop: ON' : 'Loop: OFF'; e.target.classList.toggle('active', track.slices[track.selectedSliceForEdit].loop); });
    winEl.querySelector(`#sliceReverseToggle-${track.id}`)?.addEventListener('click', (e) => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Reverse for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`); track.setSliceReverse(track.selectedSliceForEdit, !track.slices[track.selectedSliceForEdit].reverse); e.target.textContent = track.slices[track.selectedSliceForEdit].reverse ? 'Rev: ON' : 'Rev: OFF'; e.target.classList.toggle('active', track.slices[track.selectedSliceForEdit].reverse);});

    const polyToggleBtn = winEl.querySelector(`#slicerPolyphonyToggle-${track.id}`);
    if (polyToggleBtn) {
        polyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
        polyToggleBtn.classList.toggle('active', track.slicerIsPolyphonic); // Assuming 'active' means Poly
        polyToggleBtn.addEventListener('click', () => {
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Slicer Polyphony for ${track.name} to ${!track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`);
            track.slicerIsPolyphonic = !track.slicerIsPolyphonic;
            polyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
            polyToggleBtn.classList.toggle('active', track.slicerIsPolyphonic);
            if (!track.slicerIsPolyphonic) {
                track.setupSlicerMonoNodes();
                if(track.slicerMonoPlayer && track.audioBuffer?.loaded) track.slicerMonoPlayer.buffer = track.audioBuffer; // Ensure buffer is set
            } else {
                track.disposeSlicerMonoNodes();
            }
            // **** ADDED THIS LINE ****
            if (track && typeof track.rebuildEffectChain === 'function') {
                console.log(`[UI - SlicerPolyToggle] Rebuilding effect chain for track ${track.id} after polyphony change.`);
                track.rebuildEffectChain();
            }
            // **** END OF ADDED LINE ****
            showNotification(`${track.name} slicer mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`, 2000);
        });
    }
}

// ... (initializeDrumSamplerSpecificControls remains the same)
function initializeDrumSamplerSpecificControls(track, winEl) {
    const loadContainer = winEl.querySelector(`#drumPadLoadContainer-${track.id}`); if (loadContainer && typeof updateDrumPadControlsUI === 'function') updateDrumPadControlsUI(track);
    if (typeof renderDrumSamplerPads === 'function') renderDrumSamplerPads(track);
    const pVolK = createKnob({ label: 'Pad Vol', min:0, max:1, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadVolume(track.selectedDrumPadForEdit, val)}); const volPh = winEl.querySelector(`#drumPadVolumeSlider-${track.id}`); if(volPh) { volPh.innerHTML = ''; volPh.appendChild(pVolK.element); } track.inspectorControls.drumPadVolume = pVolK;
    const pPitK = createKnob({ label: 'Pad Pitch', min:-24, max:24, step:1, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setDrumSamplerPadPitch(track.selectedDrumPadForEdit, val)}); const pitPh = winEl.querySelector(`#drumPadPitchKnob-${track.id}`); if(pitPh) { pitPh.innerHTML = ''; pitPh.appendChild(pPitK.element); } track.inspectorControls.drumPadPitch = pPitK;
    const pEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.attack || 0.005, decimals:3, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'attack', val)}); const attPh = winEl.querySelector(`#drumPadEnvAttackSlider-${track.id}`); if(attPh) { attPh.innerHTML = ''; attPh.appendChild(pEAK.element); } track.inspectorControls.drumPadEnvAttack = pEAK;
    const pERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'release', val)}); const relPh = winEl.querySelector(`#drumPadEnvReleaseSlider-${track.id}`); if(relPh) { relPh.innerHTML = ''; relPh.appendChild(pERK.element); } track.inspectorControls.drumPadEnvRelease = pERK;
}

// ... (initializeInstrumentSamplerSpecificControls remains the same - polyphony change doesn't need rebuildEffectChain for Tone.Sampler)
function initializeInstrumentSamplerSpecificControls(track, winEl) {
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-instrumentsampler`); const fileInputEl = winEl.querySelector(`#instrumentFileInput-${track.id}`);
    if (dzContainerEl && fileInputEl) { const dzEl = dzContainerEl.querySelector('.drop-zone'); if (dzEl) utilSetupDropZoneListeners(dzEl, track.id, 'InstrumentSampler', null, window.loadSoundFromBrowserToTarget, window.loadSampleFile); fileInputEl.onchange = (e) => { window.loadSampleFile(e, track.id, 'InstrumentSampler'); }; }
    const iCanvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`); if(iCanvas) { track.instrumentWaveformCanvasCtx = iCanvas.getContext('2d'); if(typeof window.drawInstrumentWaveform === 'function') window.drawInstrumentWaveform(track); }
    winEl.querySelector(`#instrumentRootNote-${track.id}`)?.addEventListener('change', (e) => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set Root Note for ${track.name} to ${e.target.value}`); track.setInstrumentSamplerRootNote(e.target.value); });
    winEl.querySelector(`#instrumentLoopStart-${track.id}`)?.addEventListener('change', (e) => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set Loop Start for ${track.name} to ${e.target.value}`); track.setInstrumentSamplerLoopStart(parseFloat(e.target.value)); });
    winEl.querySelector(`#instrumentLoopEnd-${track.id}`)?.addEventListener('change', (e) => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set Loop End for ${track.name} to ${e.target.value}`); track.setInstrumentSamplerLoopEnd(parseFloat(e.target.value)); });
    winEl.querySelector(`#instrumentLoopToggle-${track.id}`)?.addEventListener('click', (e) => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Loop for ${track.name}`); track.setInstrumentSamplerLoop(!track.instrumentSamplerSettings.loop); e.target.textContent = track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF'; e.target.classList.toggle('active', track.instrumentSamplerSettings.loop);});
    const instPolyToggleBtn = winEl.querySelector(`#instrumentSamplerPolyphonyToggle-${track.id}`);
    if (instPolyToggleBtn) {
        instPolyToggleBtn.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
        instPolyToggleBtn.classList.toggle('active', track.instrumentSamplerIsPolyphonic);
        instPolyToggleBtn.addEventListener('click', () => {
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Instrument Sampler Polyphony for ${track.name} to ${!track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`);
            track.instrumentSamplerIsPolyphonic = !track.instrumentSamplerIsPolyphonic;
            instPolyToggleBtn.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
            instPolyToggleBtn.classList.toggle('active', track.instrumentSamplerIsPolyphonic);
            showNotification(`${track.name} Instrument Sampler mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'} (for live input & sequence)`, 2000);
        });
    }
    const iEAK = createKnob({ label: 'Attack', min:0.005, max:2, step:0.001, initialValue: track.instrumentSamplerSettings.envelope.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('attack',val) }); const iAttPh = winEl.querySelector(`#instrumentEnvAttackSlider-${track.id}`); if(iAttPh) { iAttPh.innerHTML = ''; iAttPh.appendChild(iEAK.element); } track.inspectorControls.instEnvAttack = iEAK;
    const iEDK = createKnob({ label: 'Decay', min:0.01, max:2, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('decay',val) }); const iDecPh = winEl.querySelector(`#instrumentEnvDecaySlider-${track.id}`); if(iDecPh) { iDecPh.innerHTML = ''; iDecPh.appendChild(iEDK.element); } track.inspectorControls.instEnvDecay = iEDK;
    const iESK = createKnob({ label: 'Sustain', min:0, max:1, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('sustain',val) }); const iSusPh = winEl.querySelector(`#instrumentEnvSustainSlider-${track.id}`); if(iSusPh) { iSusPh.innerHTML = ''; iSusPh.appendChild(iESK.element); } track.inspectorControls.instEnvSustain = iESK;
    const iERK = createKnob({ label: 'Release', min:0.01, max:5, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.release, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('release',val) }); const iRelPh = winEl.querySelector(`#instrumentEnvReleaseSlider-${track.id}`); if(iRelPh) { iRelPh.innerHTML = ''; iRelPh.appendChild(iERK.element); } track.inspectorControls.instEnvRelease = iERK;
}

// --- MODULAR EFFECTS RACK UI ---
// ... (buildModularEffectsRackDOM, renderEffectsList, renderEffectControls, showAddEffectModal remain the same)
function buildModularEffectsRackDOM(owner, ownerType = 'track') {
    console.log(`[UI - buildModularEffectsRackDOM] Called for ownerType: ${ownerType}. Owner:`, owner);
    console.log(`[UI - buildModularEffectsRackDOM] Current window.masterEffectsChain (structure):`, (window.masterEffectsChain || []).map(e => ({id: e.id, type: e.type, params: e.params, toneNodeExists: !!e.toneNode})));

    const rackContainer = document.createElement('div'); rackContainer.className = 'modular-effects-rack p-2 space-y-2 bg-gray-50 h-full flex flex-col';
    const header = document.createElement('div'); header.className = 'flex justify-between items-center mb-2 flex-shrink-0';
    const title = document.createElement('h3'); title.className = 'text-lg font-semibold text-gray-700'; title.textContent = ownerType === 'track' ? `Effects: ${owner.name}` : 'Master Effects'; header.appendChild(title);
    const addEffectButton = document.createElement('button'); addEffectButton.className = 'bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded text-xs shadow-sm'; addEffectButton.textContent = '+ Add Effect'; addEffectButton.onclick = () => showAddEffectModal(owner, ownerType); header.appendChild(addEffectButton); rackContainer.appendChild(header);
    const effectsListDiv = document.createElement('div'); effectsListDiv.id = `${ownerType}-${owner?.id || 'master'}-effects-list`; effectsListDiv.className = 'effects-list-container space-y-1 min-h-[100px] border p-1.5 bg-gray-100 rounded shadow-inner overflow-y-auto flex-grow'; rackContainer.appendChild(effectsListDiv);
    const effectControlsContainer = document.createElement('div'); effectControlsContainer.id = `${ownerType}-${owner?.id || 'master'}-effect-controls`; effectControlsContainer.className = 'effect-controls-panel mt-2 border-t border-gray-300 pt-2 min-h-[150px] overflow-y-auto flex-shrink-0 max-h-[40%]'; rackContainer.appendChild(effectControlsContainer);
    
    console.log(`[UI - buildModularEffectsRackDOM] About to call renderEffectsList for ${ownerType}.`);
    renderEffectsList(owner, ownerType, effectsListDiv, effectControlsContainer);
    
    console.log(`[UI - buildModularEffectsRackDOM] Rack container DOM built for ${ownerType}:`, rackContainer);
    return rackContainer;
}

export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    console.log(`[UI - renderEffectsList] Called for ownerType: ${ownerType}. listDiv:`, listDiv, "controlsContainer:", controlsContainer);
    
    listDiv.innerHTML = ''; controlsContainer.innerHTML = '';
    const effectsArray = ownerType === 'track' ? owner.activeEffects : (window.masterEffectsChain || []);
    
    console.log(`[UI - renderEffectsList] Effects array for ${ownerType} (structure):`, (effectsArray || []).map(e => ({id: e.id, type: e.type, params: e.params, toneNodeExists: !!e.toneNode})));

    if (!effectsArray || effectsArray.length === 0) { 
        listDiv.innerHTML = '<p class="text-xs text-gray-500 p-2">No effects added.</p>'; 
        console.log(`[UI - renderEffectsList] No effects found for ${ownerType}. Displaying 'No effects added.'`);
        return; 
    }

    effectsArray.forEach((effect, index) => {
        const effectItem = document.createElement('div'); effectItem.className = 'effect-item flex justify-between items-center p-1.5 bg-gray-200 rounded border border-gray-300 cursor-grab hover:bg-gray-300 shadow-sm'; effectItem.draggable = true; effectItem.dataset.effectId = effect.id; effectItem.dataset.index = index.toString();
        const effectName = document.createElement('span'); effectName.className = 'font-medium text-xs text-gray-700'; effectName.textContent = `${index + 1}. ${AVAILABLE_EFFECTS[effect.type]?.displayName || effect.type}`; effectItem.appendChild(effectName);
        const effectItemButtons = document.createElement('div'); effectItemButtons.className = 'flex items-center';
        const editButton = document.createElement('button'); editButton.innerHTML = '⚙️'; editButton.title = 'Edit Effect Parameters'; editButton.className = 'text-xs p-0.5 hover:bg-gray-400 rounded mx-1 focus:outline-none focus:ring-1 focus:ring-blue-500';
        editButton.onclick = (e) => { e.stopPropagation(); renderEffectControls(owner, ownerType, effect.id, controlsContainer); listDiv.querySelectorAll('.effect-item').forEach(item => item.classList.remove('border-blue-500', 'border-2', 'bg-blue-100')); effectItem.classList.add('border-blue-500', 'border-2', 'bg-blue-100'); }; effectItemButtons.appendChild(editButton);
        const removeButton = document.createElement('button'); removeButton.innerHTML = '🗑️'; removeButton.title = 'Remove Effect'; removeButton.className = 'text-xs p-0.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded focus:outline-none focus:ring-1 focus:ring-red-500';
        removeButton.onclick = (e) => { e.stopPropagation(); if (ownerType === 'track') owner.removeEffect(effect.id); else window.removeMasterEffect(effect.id); renderEffectsList(owner, ownerType, listDiv, controlsContainer); }; effectItemButtons.appendChild(removeButton);
        effectItem.appendChild(effectItemButtons);
        effectItem.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', effect.id); e.dataTransfer.effectAllowed = 'move'; e.target.style.opacity = '0.5'; e.target.classList.add('dragging'); });
        effectItem.addEventListener('dragend', (e) => { e.target.style.opacity = '1'; e.target.classList.remove('dragging'); listDiv.querySelectorAll('.dragover-target').forEach(item => item.classList.remove('dragover-target')); });
        effectItem.addEventListener('dragenter', (e) => { e.preventDefault(); const target = e.target.closest('.effect-item'); if(target && !target.classList.contains('dragging')) target.classList.add('dragover-target'); });
        effectItem.addEventListener('dragleave', (e) => { const target = e.target.closest('.effect-item'); if(target) target.classList.remove('dragover-target'); });
        listDiv.appendChild(effectItem);
    });

    listDiv.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
    listDiv.addEventListener('drop', (e) => {
        e.preventDefault();
        listDiv.querySelectorAll('.dragover-target').forEach(item => item.classList.remove('dragover-target'));
        const droppedEffectId = e.dataTransfer.getData('text/plain');
        const targetElement = e.target.closest('.effect-item');
        const effectsCurrentArray = ownerType === 'track' ? owner.activeEffects : (window.masterEffectsChain || []);
        
        const oldEffectIndex = effectsCurrentArray.findIndex(eff => eff.id === droppedEffectId);
        if (oldEffectIndex === -1) {
            console.error("[UI Drop] Dropped effect ID not found in current array:", droppedEffectId);
            return;
        }

        let newVisualIndex; 
        if (targetElement && targetElement.dataset.index && targetElement !== listDiv.querySelector(`[data-effect-id="${droppedEffectId}"]`)) { 
            const targetVisualIndex = parseInt(targetElement.dataset.index);
            const rect = targetElement.getBoundingClientRect();
            const isDropInUpperHalf = e.clientY < rect.top + rect.height / 2;
            newVisualIndex = isDropInUpperHalf ? targetVisualIndex : targetVisualIndex + 1;
        } else { 
             if (targetElement && targetElement.dataset.index && targetElement === listDiv.querySelector(`[data-effect-id="${droppedEffectId}"]`)) {
                return;
            }
            if (effectsCurrentArray.length > 0 && listDiv.firstChild && e.clientY < listDiv.firstChild.getBoundingClientRect().top + listDiv.firstChild.getBoundingClientRect().height / 2) {
                newVisualIndex = 0;
            } else {
                newVisualIndex = effectsCurrentArray.length; 
            }
        }
        
        let finalSpliceIndex = newVisualIndex;
        if (oldEffectIndex < newVisualIndex) {
            finalSpliceIndex--; 
        }
        finalSpliceIndex = Math.max(0, Math.min(finalSpliceIndex, effectsCurrentArray.length -1 )); 
        
        console.log(`[UI Drop] ID: ${droppedEffectId}, OldIdx: ${oldEffectIndex}, TargetElement: ${targetElement?.dataset.effectId}, VisualNewIdx: ${newVisualIndex}, FinalSpliceIdx for reorder: ${finalSpliceIndex}`);

        if (oldEffectIndex !== finalSpliceIndex) {
             if (ownerType === 'track') owner.reorderEffect(droppedEffectId, finalSpliceIndex);
             else window.reorderMasterEffect(droppedEffectId, finalSpliceIndex);
        } else if (oldEffectIndex === finalSpliceIndex && newVisualIndex === effectsCurrentArray.length && oldEffectIndex === effectsCurrentArray.length -1 && effectsCurrentArray.length > 0) {
        } else if (oldEffectIndex !== finalSpliceIndex) { 
             if (ownerType === 'track') owner.reorderEffect(droppedEffectId, finalSpliceIndex);
             else window.reorderMasterEffect(droppedEffectId, finalSpliceIndex);
        }
        
        const currentControlsContainer = document.getElementById(`${ownerType}-${owner?.id || 'master'}-effect-controls`);
        renderEffectsList(owner, ownerType, listDiv, currentControlsContainer); 
    });
}

export function renderEffectControls(owner, ownerType, effectId, controlsContainer) {
    controlsContainer.innerHTML = '';
    const effectsArray = ownerType === 'track' ? owner.activeEffects : (window.masterEffectsChain || []);
    const effect = effectsArray.find(e => e.id === effectId);
    if (!effect) { controlsContainer.textContent = 'Select an effect to see its controls.'; return; }
    const effectDef = AVAILABLE_EFFECTS[effect.type];
    if (!effectDef || !effectDef.params || effectDef.params.length === 0) { controlsContainer.innerHTML = `<p class="text-sm text-gray-600 p-2">No configurable parameters for ${effectDef?.displayName || effect.type}.</p>`; return; }
    const title = document.createElement('h4'); title.className = 'text-md font-semibold mb-2 px-1 text-gray-700'; title.textContent = `Controls: ${effectDef.displayName}`; controlsContainer.appendChild(title);
    const controlGroup = document.createElement('div'); controlGroup.className = 'control-group';
    effectDef.params.forEach(paramDef => {
        const controlId = `${ownerType}-${owner?.id || 'master'}-effect-${effect.id}-param-${paramDef.key.replace(/[.]/g, '_')}`;
        let currentValue; const pathKeys = paramDef.key.split('.'); let tempVal = effect.params;
        pathKeys.forEach(pk => { if (tempVal && typeof tempVal === 'object' && pk in tempVal) tempVal = tempVal[pk]; else { tempVal = undefined; return; } }); currentValue = tempVal;
        if (currentValue === undefined) currentValue = paramDef.defaultValue;
        if (paramDef.type === 'knob') {
            const knob = createKnob({
                label: paramDef.label, min: paramDef.min, max: paramDef.max, step: paramDef.step, initialValue: currentValue, decimals: paramDef.decimals, displaySuffix: paramDef.displaySuffix, trackRef: ownerType === 'track' ? owner : { name: "Master" },
                onValueChange: (val, oldVal, fromInteraction) => {
                    if (ownerType === 'track') owner.updateEffectParam(effect.id, paramDef.key, val); else window.updateMasterEffectParam(effect.id, paramDef.key, val);
                    if (fromInteraction && val !== oldVal && typeof window.captureStateForUndo === 'function') { const ownerName = ownerType==='track'?owner.name:'Master'; const valStr=typeof val==='number'?val.toFixed(paramDef.decimals!==undefined?paramDef.decimals:2):val; window.captureStateForUndo(`Set ${ownerName} ${effectDef.displayName} ${paramDef.label} to ${valStr}`); }
                }
            });
            controlGroup.appendChild(knob.element);
        } else if (paramDef.type === 'select') {
            const selectContainer = document.createElement('div'); selectContainer.className = 'mb-2 flex flex-col items-start p-1 w-full sm:w-auto'; const labelEl = document.createElement('label'); labelEl.htmlFor = controlId; labelEl.className = 'knob-label text-xs mb-0.5'; labelEl.textContent = paramDef.label; selectContainer.appendChild(labelEl);
            const selectEl = document.createElement('select'); selectEl.id = controlId; selectEl.className = 'text-xs p-1 border w-full bg-white text-black rounded-sm focus:ring-blue-500 focus:border-blue-500';
            (paramDef.options || []).forEach(opt => { if (typeof opt === 'string' || typeof opt === 'number') selectEl.add(new Option(String(opt), opt)); else selectEl.add(new Option(opt.text, opt.value)); });
            selectEl.value = String(currentValue);
            selectEl.addEventListener('change', (e) => {
                const newValue = e.target.value; const originalType = typeof paramDef.defaultValue; let valToStore = (originalType === 'number' && !isNaN(parseFloat(newValue))) ? parseFloat(newValue) : newValue; if (originalType === 'boolean') valToStore = (newValue === "true");
                if (ownerType === 'track') owner.updateEffectParam(effect.id, paramDef.key, valToStore); else window.updateMasterEffectParam(effect.id, paramDef.key, valToStore);
                if (typeof window.captureStateForUndo === 'function') { const ownerName = ownerType==='track'?owner.name:'Master'; window.captureStateForUndo(`Set ${ownerName} ${effectDef.displayName} ${paramDef.label} to ${newValue}`); }
            });
            selectContainer.appendChild(selectEl); controlGroup.appendChild(selectContainer);
        }
    });
    controlsContainer.appendChild(controlGroup);
}
function showAddEffectModal(owner, ownerType) {
    const modalContent = document.createElement('div'); const label = document.createElement('label'); label.htmlFor = 'effectTypeSelect'; label.textContent = 'Select effect to add:'; label.className = 'block mb-2 text-sm';
    const select = document.createElement('select'); select.id = 'effectTypeSelect'; select.className = 'w-full p-2 border border-gray-300 rounded bg-white text-black focus:ring-blue-500 focus:border-blue-500';
    Object.keys(AVAILABLE_EFFECTS).sort((a,b) => AVAILABLE_EFFECTS[a].displayName.localeCompare(AVAILABLE_EFFECTS[b].displayName)).forEach(effectKey => { const option = document.createElement('option'); option.value = effectKey; option.textContent = AVAILABLE_EFFECTS[effectKey].displayName; select.appendChild(option); });
    modalContent.appendChild(label); modalContent.appendChild(select);
    showCustomModal('Add Effect', modalContent, [
        { text: 'Add', action: () => { const selectedEffectType = select.value; if (selectedEffectType) { let newEffectId; if (ownerType === 'track') newEffectId = owner.addEffect(selectedEffectType); else newEffectId = window.addMasterEffect(selectedEffectType); const listDiv = document.getElementById(`${ownerType}-${owner?.id || 'master'}-effects-list`); const controlsContainer = document.getElementById(`${ownerType}-${owner?.id || 'master'}-effect-controls`); if (listDiv && controlsContainer) { renderEffectsList(owner, ownerType, listDiv, controlsContainer); if (newEffectId) { renderEffectControls(owner, ownerType, newEffectId, controlsContainer); const newEffectItem = listDiv.querySelector(`.effect-item[data-effect-id="${newEffectId}"]`); if (newEffectItem) { listDiv.querySelectorAll('.effect-item').forEach(item => item.classList.remove('border-blue-500', 'border-2', 'bg-blue-100')); newEffectItem.classList.add('border-blue-500', 'border-2', 'bg-blue-100'); } } } } } },
        { text: 'Cancel' }
    ]);
}

// --- Window Opening Functions ---
// ... (openTrackEffectsRackWindow, openMasterEffectsRackWindow, openGlobalControlsWindow, openSoundBrowserWindow, etc. remain the same as v5)
// ... (updateSoundBrowserDisplayForLibrary, renderSoundBrowserDirectory remain the same)
// ... (openMixerWindow, updateMixerWindow, renderMixer remain the same)
// ... (buildSequencerContentDOM, openTrackSequencerWindow remain the same)
// ... (renderSamplePads, updateSliceEditorUI, applySliceEdits, drawWaveform, drawInstrumentWaveform)
// ... (updateDrumPadControlsUI, renderDrumSamplerPads, highlightPlayingStep remain the same)

export {
    // ... (all previous exports)
    openTrackEffectsRackWindow,
    openMasterEffectsRackWindow,
    openGlobalControlsWindow,
    openSoundBrowserWindow,
    updateSoundBrowserDisplayForLibrary,
    renderSoundBrowserDirectory,
    openMixerWindow,
    updateMixerWindow,
    renderMixer,
    buildSequencerContentDOM,
    openTrackSequencerWindow,
    renderSamplePads,
    updateSliceEditorUI,
    applySliceEdits,
    drawWaveform,
    drawInstrumentWaveform,
    updateDrumPadControlsUI,
    renderDrumSamplerPads,
    highlightPlayingStep,
    buildTrackInspectorContentDOM, // Ensure all are exported
    openTrackInspectorWindow,
    initializeCommonInspectorControls,
    initializeTypeSpecificInspectorControls,
    renderEffectsList,
    renderEffectControls
};
