// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Poly/Mono Fix Attempt v5');

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
export function initializeTypeSpecificInspectorControls(track, winEl) { if (track.type === 'Synth') initializeSynthSpecificControls(track, winEl); else if (track.type === 'Sampler') initializeSamplerSpecificControls(track, winEl); else if (track.type === 'DrumSampler') initializeDrumSamplerSpecificControls(track, winEl); else if (track.type === 'InstrumentSampler') initializeInstrumentSamplerSpecificControls(track, winEl); }
function initializeSynthSpecificControls(track, winEl) { const c = winEl.querySelector(`#synthEngineControls-${track.id}`); if (c) { setTimeout(() => { (synthEngineControlDefinitions['MonoSynth']||[]).forEach(def => { if (def.type === 'knob' && track.inspectorControls?.[def.idPrefix]) track.inspectorControls[def.idPrefix].refreshVisuals(); }); }, 50); } }
function initializeSamplerSpecificControls(track, winEl) {
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
        polyToggleBtn.classList.toggle('active', track.slicerIsPolyphonic);
        polyToggleBtn.addEventListener('click', () => {
            if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Slicer Polyphony for ${track.name} to ${!track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`);
            track.slicerIsPolyphonic = !track.slicerIsPolyphonic;
            polyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
            polyToggleBtn.classList.toggle('active', track.slicerIsPolyphonic);
            if (!track.slicerIsPolyphonic) {
                track.setupSlicerMonoNodes();
                if(track.slicerMonoPlayer && track.audioBuffer?.loaded) track.slicerMonoPlayer.buffer = track.audioBuffer;
            } else {
                track.disposeSlicerMonoNodes();
            }
            // Crucially, rebuild the effect chain to reflect the new mono/poly source
            if (track && typeof track.rebuildEffectChain === 'function') {
                track.rebuildEffectChain();
            }
            showNotification(`${track.name} slicer mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`, 2000);
        });
    }
}
function initializeDrumSamplerSpecificControls(track, winEl) {
    const loadContainer = winEl.querySelector(`#drumPadLoadContainer-${track.id}`); if (loadContainer && typeof updateDrumPadControlsUI === 'function') updateDrumPadControlsUI(track);
    if (typeof renderDrumSamplerPads === 'function') renderDrumSamplerPads(track);
    const pVolK = createKnob({ label: 'Pad Vol', min:0, max:1, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadVolume(track.selectedDrumPadForEdit, val)}); const volPh = winEl.querySelector(`#drumPadVolumeSlider-${track.id}`); if(volPh) { volPh.innerHTML = ''; volPh.appendChild(pVolK.element); } track.inspectorControls.drumPadVolume = pVolK;
    const pPitK = createKnob({ label: 'Pad Pitch', min:-24, max:24, step:1, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setDrumSamplerPadPitch(track.selectedDrumPadForEdit, val)}); const pitPh = winEl.querySelector(`#drumPadPitchKnob-${track.id}`); if(pitPh) { pitPh.innerHTML = ''; pitPh.appendChild(pPitK.element); } track.inspectorControls.drumPadPitch = pPitK;
    const pEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.attack || 0.005, decimals:3, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'attack', val)}); const attPh = winEl.querySelector(`#drumPadEnvAttackSlider-${track.id}`); if(attPh) { attPh.innerHTML = ''; attPh.appendChild(pEAK.element); } track.inspectorControls.drumPadEnvAttack = pEAK;
    const pERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'release', val)}); const relPh = winEl.querySelector(`#drumPadEnvReleaseSlider-${track.id}`); if(relPh) { relPh.innerHTML = ''; relPh.appendChild(pERK.element); } track.inspectorControls.drumPadEnvRelease = pERK;
}
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
            // No need to rebuild chain or dispose/setup nodes here for InstrumentSampler,
            // as Tone.Sampler handles polyphony internally. The flag is used by our custom logic.
            showNotification(`${track.name} Instrument Sampler mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'} (for live input & sequence)`, 2000);
        });
    }
    const iEAK = createKnob({ label: 'Attack', min:0.005, max:2, step:0.001, initialValue: track.instrumentSamplerSettings.envelope.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('attack',val) }); const iAttPh = winEl.querySelector(`#instrumentEnvAttackSlider-${track.id}`); if(iAttPh) { iAttPh.innerHTML = ''; iAttPh.appendChild(iEAK.element); } track.inspectorControls.instEnvAttack = iEAK;
    const iEDK = createKnob({ label: 'Decay', min:0.01, max:2, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('decay',val) }); const iDecPh = winEl.querySelector(`#instrumentEnvDecaySlider-${track.id}`); if(iDecPh) { iDecPh.innerHTML = ''; iDecPh.appendChild(iEDK.element); } track.inspectorControls.instEnvDecay = iEDK;
    const iESK = createKnob({ label: 'Sustain', min:0, max:1, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('sustain',val) }); const iSusPh = winEl.querySelector(`#instrumentEnvSustainSlider-${track.id}`); if(iSusPh) { iSusPh.innerHTML = ''; iSusPh.appendChild(iESK.element); } track.inspectorControls.instEnvSustain = iESK;
    const iERK = createKnob({ label: 'Release', min:0.01, max:5, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.release, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('release',val) }); const iRelPh = winEl.querySelector(`#instrumentEnvReleaseSlider-${track.id}`); if(iRelPh) { iRelPh.innerHTML = ''; iRelPh.appendChild(iERK.element); } track.inspectorControls.instEnvRelease = iERK;
}

// --- MODULAR EFFECTS RACK UI ---
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
export function openTrackEffectsRackWindow(trackId, savedState = null) {
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null; if (!track) return null;
    const windowId = `effectsRack-${track.id}`;
    if (window.openWindows[windowId] && !savedState) { window.openWindows[windowId].restore(); return window.openWindows[windowId]; }
    if (window.openWindows[windowId] && savedState) window.openWindows[windowId].close(true);
    const effectsRackContentElement = buildModularEffectsRackDOM(track, 'track');
    const winOptions = { width: 450, height: 550, initialContentKey: `effectsRack-${track.id}` }; if (savedState) Object.assign(winOptions, savedState);
    const effectsWin = new SnugWindow(windowId, `Effects: ${track.name}`, effectsRackContentElement, winOptions);
    if (!effectsWin || !effectsWin.element) { showNotification("Failed to create Track Effects Rack.", 5000); return null; }
    track.effectsRackWindow = effectsWin; return effectsWin;
}

export function openMasterEffectsRackWindow(savedState = null) {
    console.log("[UI - openMasterEffectsRackWindow] Function CALLED. SavedState:", savedState);
    const windowId = 'masterEffectsRack';
    if (window.openWindows[windowId] && !savedState) { 
        console.log("[UI - openMasterEffectsRackWindow] Restoring existing master effects rack."); 
        window.openWindows[windowId].restore(); 
        return window.openWindows[windowId]; 
    }
    if (window.openWindows[windowId] && savedState) { 
        console.log("[UI - openMasterEffectsRackWindow] Closing existing master effects rack before recreating from saved state."); 
        window.openWindows[windowId].close(true); 
    }
    
    console.log("[UI - openMasterEffectsRackWindow] Calling buildModularEffectsRackDOM for master.");
    const masterEffectsContentElement = buildModularEffectsRackDOM(null, 'master');
    console.log("[UI - openMasterEffectsRackWindow] Master Effects Rack DOM built. Is it valid?", !!masterEffectsContentElement);
    if (!masterEffectsContentElement) { 
        showNotification("Failed to build Master Effects Rack content. Check console.", 5000); 
        console.error("[UI - openMasterEffectsRackWindow] buildModularEffectsRackDOM returned null or undefined for master.");
        return null; 
    }
    
    const winOptions = { width: 450, height: 550, initialContentKey: 'masterEffectsRack' }; 
    if (savedState) Object.assign(winOptions, savedState);
    console.log("[UI - openMasterEffectsRackWindow] Window options for SnugWindow:", winOptions);
    
    let masterEffectsWin = null;
    try {
        console.log("[UI - openMasterEffectsRackWindow] Attempting to create SnugWindow for masterEffectsRack...");
        masterEffectsWin = new SnugWindow(windowId, 'Master Effects Rack', masterEffectsContentElement, winOptions);
        console.log("[UI - openMasterEffectsRackWindow] SnugWindow creation attempted. Result:", masterEffectsWin);
    } catch(e) {
        console.error("[UI - openMasterEffectsRackWindow] CRITICAL ERROR during `new SnugWindow()` for Master Effects Rack:", e);
        showNotification("CRITICAL: Error creating Master Effects Rack window object. Check console.", 6000);
        return null;
    }

    if (!masterEffectsWin || !masterEffectsWin.element) { 
        showNotification("Failed to create Master Effects Rack window instance. Check console.", 5000); 
        console.error("[UI - openMasterEffectsRackWindow] SnugWindow instance or its element is null/undefined for Master Effects Rack."); 
        return null; 
    }
    console.log("[UI - openMasterEffectsRackWindow] Master Effects Rack Window CREATED SUCCESSFULLY and should be visible:", masterEffectsWin);
    return masterEffectsWin;
}

export function openGlobalControlsWindow(savedState = null) {
    console.log("[ui.js - openGlobalControlsWindow V5 PolyFix] Called. SavedState:", savedState);
    const windowId = 'globalControls';

    if (typeof SnugWindow !== 'function') {
        console.error("[ui.js - openGlobalControlsWindow V5 PolyFix] SnugWindow is NOT a function! Cannot create window.");
        return null;
    }

    if (window.openWindows && window.openWindows[windowId] && !window.openWindows[windowId].isMinimized && !savedState) {
        console.log(`[ui.js - openGlobalControlsWindow V5 PolyFix] Window ${windowId} already exists and is not minimized. Restoring.`);
        try { window.openWindows[windowId].restore(); } catch (e) {
            console.warn(`[ui.js - openGlobalControlsWindow V5 PolyFix] Error restoring existing window ${windowId}:`, e);
            try { if (window.openWindows[windowId]) window.openWindows[windowId].close(true); } catch (delErr) { /* ignore */ }
            delete window.openWindows[windowId];
        }
        if (window.openWindows && window.openWindows[windowId] && window.openWindows[windowId].element) {
            return window.openWindows[windowId];
        }
        console.log(`[ui.js - openGlobalControlsWindow V5 PolyFix] Window ${windowId} was problematic or removed after restore attempt, will recreate.`);
    }
    
    if (window.openWindows && window.openWindows[windowId]) {
        try {
            console.log(`[ui.js - openGlobalControlsWindow V5 PolyFix] Closing pre-existing window ${windowId} before creating new one.`);
            window.openWindows[windowId].close(true);
        } catch (e) { console.warn(`[ui.js - openGlobalControlsWindow V5 PolyFix] Error closing pre-existing window ${windowId}:`, e); }
        delete window.openWindows[windowId];
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'global-controls-window p-2 space-y-3';
    let tempoValueStr = "120.0";
    try {
        if (typeof Tone !== 'undefined' && Tone.Transport && typeof Tone.Transport.bpm.value === 'number') {
            tempoValueStr = Tone.Transport.bpm.value.toFixed(1);
        } else { console.warn("[ui.js - openGlobalControlsWindow V5 PolyFix] Tone.Transport.bpm.value not available/number."); }
    } catch (e) { console.error("[ui.js - openGlobalControlsWindow V5 PolyFix] Error accessing Tone.Transport.bpm.value:", e); }
    console.log(`[ui.js - openGlobalControlsWindow V5 PolyFix] Tempo for HTML: ${tempoValueStr}`);

    try {
        contentDiv.innerHTML = `
            <div class="flex items-center gap-2">
                <button id="playBtnGlobal" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-3 rounded-sm shadow">Play</button>
                <button id="recordBtnGlobal" class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-sm shadow">Record</button>
            </div>
            <div class="flex items-center gap-2">
                <label for="tempoGlobalInput" class="control-label text-xs">Tempo:</label>
                <input type="number" id="tempoGlobalInput" value="${tempoValueStr}" min="40" max="240" step="0.1" class="bg-white text-black w-16 p-1 rounded-sm text-center text-xs border border-gray-500">
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
        console.error("[ui.js - openGlobalControlsWindow V5 PolyFix] Error setting innerHTML for globalControls:", e);
        showNotification("Error creating global controls window content.", 5000);
        return null;
    }

    const desktopEl = document.getElementById('desktop');
    let defaultWidth = 280; let defaultHeight = 250;
    if (desktopEl) { defaultWidth = Math.min(280, desktopEl.offsetWidth - 40); defaultHeight = Math.min(250, desktopEl.offsetHeight - 80); }

    const winOptions = {
        width: defaultWidth, height: defaultHeight, x: 20, y: 20,
        resizable: false, initialContentKey: 'globalControls',
        onCloseCallback: () => {
            window.playBtn = null; window.recordBtn = null; window.tempoInput = null;
            window.masterMeterBar = null; window.midiInputSelectGlobal = null;
            window.midiIndicatorGlobalEl = null; window.keyboardIndicatorGlobalEl = null;
            console.log("[ui.js - openGlobalControlsWindow V5 PolyFix] Global controls window closed, DOM refs cleared.");
        }
    };
    if (savedState) Object.assign(winOptions, savedState);

    console.log(`[ui.js - openGlobalControlsWindow V5 PolyFix] Creating SnugWindow with ID: ${windowId}`);
    let gcwInstance = null;
    try {
        gcwInstance = new SnugWindow(windowId, 'Global Controls', contentDiv, winOptions);
        console.log(`[ui.js - openGlobalControlsWindow V5 PolyFix] SnugWindow instance CREATED:`, gcwInstance);
    } catch (e) {
        console.error(`[ui.js - openGlobalControlsWindow V5 PolyFix] CRITICAL ERROR during \`new SnugWindow('${windowId}')\`:`, e);
        showCustomModal("Critical Error", `Could not create Global Controls window: ${e.message}. App may be unstable.`, [{ text: "OK" }]);
        return null;
    }

    if (!gcwInstance || !gcwInstance.element) {
        console.error(`[ui.js - openGlobalControlsWindow V5 PolyFix] FAILED to create/initialize SnugWindow. Instance or element is null. Instance:`, gcwInstance);
        showNotification("CRITICAL: Global Controls window element not found after creation. App will be limited.", 6000);
        return gcwInstance;
    }
    console.log(`[ui.js - openGlobalControlsWindow V5 PolyFix] SnugWindow element IS present:`, gcwInstance.element);

    if (gcwInstance.element) {
        window.playBtn = gcwInstance.element.querySelector('#playBtnGlobal');
        window.recordBtn = gcwInstance.element.querySelector('#recordBtnGlobal');
        window.tempoInput = gcwInstance.element.querySelector('#tempoGlobalInput');
        window.masterMeterBar = gcwInstance.element.querySelector('#masterMeterBarGlobal');
        window.midiInputSelectGlobal = gcwInstance.element.querySelector('#midiInputSelectGlobal');
        window.midiIndicatorGlobalEl = gcwInstance.element.querySelector('#midiIndicatorGlobal');
        window.keyboardIndicatorGlobalEl = gcwInstance.element.querySelector('#keyboardIndicatorGlobal');
        console.log("[ui.js - openGlobalControlsWindow V5 PolyFix] Global DOM elements assigned. MIDI Select:", window.midiInputSelectGlobal);
    } else { console.error("[ui.js - openGlobalControlsWindow V5 PolyFix] gcwInstance.element is null, cannot query for controls."); }

    if (gcwInstance.element) {
        if (typeof window.attachGlobalControlEvents === 'function') {
            console.log("[ui.js - openGlobalControlsWindow V5 PolyFix] Calling window.attachGlobalControlEvents.");
            window.attachGlobalControlEvents(gcwInstance.element);
        } else { console.error("[ui.js - openGlobalControlsWindow V5 PolyFix] window.attachGlobalControlEvents function is not defined!"); showNotification("Error: Global control event handlers cannot be attached.", 5000); }
    } else { console.warn("[ui.js - openGlobalControlsWindow V5 PolyFix] Cannot attach global control events as window element is missing."); }

    console.log(`[ui.js - openGlobalControlsWindow V5 PolyFix] FINISHED successfully. Returning gcwInstance:`, gcwInstance);
    return gcwInstance;
}

export function openSoundBrowserWindow(savedState = null) {
    console.log("[ui.js - openSoundBrowserWindow] Called."); 
    const windowId = 'soundBrowser';
    if (window.openWindows[windowId] && !savedState) { window.openWindows[windowId].restore(); if (window.currentLibraryName && typeof updateSoundBrowserDisplayForLibrary === 'function') updateSoundBrowserDisplayForLibrary(window.currentLibraryName); return window.openWindows[windowId]; }
    if (window.openWindows[windowId] && savedState) window.openWindows[windowId].close(true);
    let selectOptionsHTML = '';
    if (Constants.soundLibraries && Object.keys(Constants.soundLibraries).length > 0) { for (const libName in Constants.soundLibraries) selectOptionsHTML += `<option value="${libName}">${libName}</option>`; } else { selectOptionsHTML = '<option value="">No Libraries Configured</option>'; }
    const contentHTML = `<div class="sound-browser-content p-2"><select id="soundBrowserLibrarySelect" class="w-full mb-2 p-1 border border-gray-500 rounded-sm text-xs bg-white text-black focus:ring-blue-500 focus:border-blue-500">${selectOptionsHTML}</select><div id="soundBrowserPathDisplay" class="text-xs p-1 bg-gray-200 border-b border-gray-400 mb-1">Path: /</div><div id="soundBrowserList" class="sound-browser-list h-64 overflow-y-auto border border-gray-300 p-1 bg-white">Select a library to load sounds.</div></div>`;
    const winOptions = { width: 350, height: 400, initialContentKey: 'soundBrowser' }; if (savedState) Object.assign(winOptions, savedState);
    let soundBrowserWin = null;
    try { soundBrowserWin = new SnugWindow(windowId, 'Sound Browser', contentHTML, winOptions); } catch(e) { console.error('[ui.js] CRITICAL ERROR during `new SnugWindow()` for Sound Browser:', e); showNotification("CRITICAL: Error creating Sound Browser window object.", 6000); return null; }
    if (!soundBrowserWin || !soundBrowserWin.element) { console.error("[ui.js] Failed to create Sound Browser window instance OR its element is null."); showNotification("Failed to create Sound Browser window.", 5000); return null; }
    const librarySelect = soundBrowserWin.element.querySelector('#soundBrowserLibrarySelect');
    if (librarySelect) {
        librarySelect.onchange = () => { const selectedLibraryName = librarySelect.value; if (typeof updateSoundBrowserDisplayForLibrary === 'function') updateSoundBrowserDisplayForLibrary(selectedLibraryName); };
        if (Constants.soundLibraries && Object.keys(Constants.soundLibraries).length > 0) { const firstLibraryName = Object.keys(Constants.soundLibraries)[0]; const currentSelectedValue = librarySelect.value; let targetLibrary = Array.from(librarySelect.options).find(opt => opt.value === currentSelectedValue) ? currentSelectedValue : firstLibraryName; if (!Array.from(librarySelect.options).find(opt => opt.value === targetLibrary) && librarySelect.options.length > 0) targetLibrary = librarySelect.options[0].value; librarySelect.value = targetLibrary; if (typeof updateSoundBrowserDisplayForLibrary === 'function' && targetLibrary) updateSoundBrowserDisplayForLibrary(targetLibrary); } else { soundBrowserWin.element.querySelector('#soundBrowserList').innerHTML = "No sound libraries configured."; }
    }
    console.log("[ui.js - openSoundBrowserWindow] Sound Browser window created and initialized."); return soundBrowserWin;
}
export function updateSoundBrowserDisplayForLibrary(libraryName) {
    console.log(`[UI - updateSoundBrowserDisplayForLibrary] Updating for library: ${libraryName}`); 
    const soundBrowserList = document.getElementById('soundBrowserList'); const pathDisplay = document.getElementById('soundBrowserPathDisplay');
    if (!soundBrowserList || !pathDisplay ) { console.warn("[ui.js - updateSoundBrowserDisplayForLibrary] Sound Browser DOM elements missing."); return; }
    window.currentLibraryName = libraryName;
    if (window.soundLibraryFileTrees && window.soundLibraryFileTrees[libraryName]) { 
        console.log(`[UI - updateSoundBrowserDisplayForLibrary] Found pre-existing file tree for ${libraryName}.`); 
        window.currentSoundFileTree = window.soundLibraryFileTrees[libraryName]; 
        window.currentSoundBrowserPath = []; 
        renderSoundBrowserDirectory(window.currentSoundBrowserPath, window.currentSoundFileTree); 
    } else if (window.loadedZipFiles && window.loadedZipFiles[libraryName] === "loading") { 
        soundBrowserList.innerHTML = `<div class="p-2 text-xs text-gray-500">Loading ${libraryName} sounds...</div>`; 
        pathDisplay.textContent = `Path: / (${libraryName} - Loading...)`; 
        console.log(`[UI - updateSoundBrowserDisplayForLibrary] Library ${libraryName} is currently loading.`); 
    } else { 
        const zipUrl = Constants.soundLibraries[libraryName]; 
        console.log(`[UI - updateSoundBrowserDisplayForLibrary] Library ${libraryName} not loaded. Zip URL: ${zipUrl}`); 
        if (zipUrl && typeof window.fetchSoundLibrary === 'function') {
            console.log(`[UI - updateSoundBrowserDisplayForLibrary] Calling fetchSoundLibrary for ${libraryName}.`); 
            window.fetchSoundLibrary(libraryName, zipUrl, false); 
        } else { 
            soundBrowserList.innerHTML = `<div class="p-2 text-xs text-red-500">Library ${libraryName} config not found or fetch function missing.</div>`; 
            pathDisplay.textContent = `Path: / (Error - ${libraryName})`; 
            console.error(`[UI - updateSoundBrowserDisplayForLibrary] Config/function missing for ${libraryName}.`); 
        } 
    }
}
export function renderSoundBrowserDirectory(pathArray, treeNode) {
    const soundBrowserList = document.getElementById('soundBrowserList'); const pathDisplay = document.getElementById('soundBrowserPathDisplay');
    console.log(`[UI - renderSoundBrowserDirectory] Rendering. Path: /${pathArray.join('/')}, Lib: ${window.currentLibraryName}, TreeNode valid: ${!!treeNode}`); 
    if (!soundBrowserList || !pathDisplay ) { console.warn("[ui.js - renderSoundBrowserDirectory]: DOM elements missing."); return; }
    if (!treeNode && window.currentLibraryName && window.loadedZipFiles && window.loadedZipFiles[window.currentLibraryName] !== "loading") { 
        soundBrowserList.innerHTML = `<div class="p-2 text-xs text-gray-500">Content for ${window.currentLibraryName || 'selected library'} is unavailable or empty.</div>`; 
        pathDisplay.textContent = `Path: /${pathArray.join('/')} (${window.currentLibraryName || 'No Lib'})`; 
        console.log(`[UI - renderSoundBrowserDirectory] Tree node is null, library ${window.currentLibraryName} not 'loading'. Displaying empty/unavailable.`); 
        return; 
    }
    if (!treeNode && window.loadedZipFiles && window.loadedZipFiles[window.currentLibraryName] === "loading") {
        console.log(`[UI - renderSoundBrowserDirectory] Tree node is null, but library ${window.currentLibraryName} is 'loading'. Aborting render for now.`); 
        return;
    }
    if (!treeNode) { 
        soundBrowserList.innerHTML = `<div class="p-2 text-xs text-gray-500">Select a library or library content is missing.</div>`; 
        pathDisplay.textContent = `Path: /`; 
        console.log(`[UI - renderSoundBrowserDirectory] Tree node is null, no library context or library missing. Displaying select message.`); 
        return; 
    }
    soundBrowserList.innerHTML = ''; pathDisplay.textContent = `Path: /${pathArray.join('/')} (${window.currentLibraryName || 'No Lib'})`;
    if (pathArray.length > 0) { const backButton = document.createElement('div'); backButton.className = 'sound-browser-item font-semibold hover:bg-gray-100 cursor-pointer p-1 text-sm border-b border-gray-200'; backButton.textContent = '⬆️ .. (Up)'; backButton.addEventListener('click', () => { window.currentSoundBrowserPath.pop(); let newTreeNode = window.soundLibraryFileTrees[window.currentLibraryName]; if (!newTreeNode) { window.currentSoundBrowserPath = []; renderSoundBrowserDirectory([], null); return; } for (const segment of window.currentSoundBrowserPath) { if (newTreeNode[segment]?.type === 'folder') newTreeNode = newTreeNode[segment].children; else { window.currentSoundBrowserPath = []; newTreeNode = window.soundLibraryFileTrees[window.currentLibraryName]; break; } } window.currentSoundFileTree = newTreeNode; renderSoundBrowserDirectory(window.currentSoundBrowserPath, newTreeNode); }); soundBrowserList.appendChild(backButton); }
    
    if (Object.keys(treeNode).length === 0) {
        if (pathArray.length > 0) {
            soundBrowserList.innerHTML += '<div class="p-2 text-xs text-gray-500">Folder is empty.</div>';
        } else if (window.currentLibraryName) {
            soundBrowserList.innerHTML += `<div class="p-2 text-xs text-gray-500">Library "${window.currentLibraryName}" appears empty or no audio files matched filters.</div>`;
            console.log(`[UI - renderSoundBrowserDirectory] Library ${window.currentLibraryName} root is empty.`); 
        }
    }

    const sortedEntries = Object.entries(treeNode).sort(([nameA, itemA], [nameB, itemB]) => { if (itemA.type === 'folder' && itemB.type === 'file') return -1; if (itemA.type === 'file' && itemB.type === 'folder') return 1; return nameA.localeCompare(nameB); });
    sortedEntries.forEach(([name, item]) => {
        const div = document.createElement('div'); div.className = 'sound-browser-item hover:bg-gray-100 cursor-pointer p-1 text-xs border-b border-gray-200 last:border-b-0';
        if (item.type === 'folder') { 
            div.textContent = `📁 ${name}`; 
            div.addEventListener('click', () => { 
                console.log(`[UI - renderSoundBrowserDirectory] Navigating into folder: ${name}`); 
                window.currentSoundBrowserPath.push(name); 
                window.currentSoundFileTree = item.children; 
                renderSoundBrowserDirectory(window.currentSoundBrowserPath, item.children); 
            }); 
        } else if (item.type === 'file') {
            div.textContent = `🎵 ${name}`; 
            div.title = `Click to play. Drag to load: ${name} (Path: ${item.fullPath})`; 
            div.draggable = true; 
            div.addEventListener('dragstart', (event) => { const soundData = { fullPath: item.fullPath, libraryName: window.currentLibraryName, fileName: name }; event.dataTransfer.setData("application/json", JSON.stringify(soundData)); event.dataTransfer.effectAllowed = "copy"; div.style.opacity = '0.5'; });
            div.addEventListener('dragend', () => { div.style.opacity = '1'; });
            div.addEventListener('click', async (event) => {
                if (event.detail === 0) return; 
                console.log(`[UI - Preview] Preview clicked for: ${name}, Path: ${item.fullPath}, Lib: ${window.currentLibraryName}`);
                if(typeof window.initAudioContextAndMasterMeter === 'function') await window.initAudioContextAndMasterMeter(true);
                if (window.previewPlayer && !window.previewPlayer.disposed) { try { window.previewPlayer.stop(); window.previewPlayer.dispose(); } catch(e) {console.warn("Error disposing old preview player", e)} window.previewPlayer = null;}
                
                let objectURL = null; 
                try {
                    if (!window.loadedZipFiles || !window.loadedZipFiles[window.currentLibraryName] || window.loadedZipFiles[window.currentLibraryName] === "loading") {
                        console.error(`[UI - Preview] ZIP library "${window.currentLibraryName}" not fully loaded.`); 
                        throw new Error(`ZIP library "${window.currentLibraryName}" not loaded.`);
                    }
                    const zipEntry = window.loadedZipFiles[window.currentLibraryName].file(item.fullPath); 
                    if (!zipEntry) {
                        console.error(`[UI - Preview] File ${item.fullPath} not found in ZIP library "${window.currentLibraryName}". Available files:`, Object.keys(window.loadedZipFiles[window.currentLibraryName].files)); 
                        throw new Error(`File ${item.fullPath} not found in ${window.currentLibraryName}.`);
                    }
                    console.log(`[UI - Preview] Found zipEntry for ${item.fullPath}. Getting blob...`); 
                    const fileBlobFromZip = await zipEntry.async("blob");
                    console.log(`[UI - Preview] Got blob for ${name} from zip, type: '${fileBlobFromZip.type}', size: ${fileBlobFromZip.size}.`);
                    
                    const inferredMimeType = getMimeTypeFromFilename(name); 
                    const finalMimeType = fileBlobFromZip.type || inferredMimeType || 'application/octet-stream';
                    const typedFileObject = new File([fileBlobFromZip], name, { type: finalMimeType });
                    console.log(`[UI - Preview] Created File object for Tone.Buffer. Name: "${typedFileObject.name}", Type: "${typedFileObject.type}"`);

                    objectURL = URL.createObjectURL(typedFileObject); 
                    console.log(`[UI - Preview] Object URL: ${objectURL} (from typed File). Loading into Tone.Buffer...`);
                    
                    const buffer = new Tone.Buffer();
                    await buffer.load(objectURL); 
                    console.log(`[UI - Preview] Tone.Buffer loaded for ${name}. Duration: ${buffer.duration}`);

                    window.previewPlayer = new Tone.Player(buffer).toDestination(); 
                    window.previewPlayer.autostart = true;
                    window.previewPlayer.onstop = () => { 
                        if (window.previewPlayer && !window.previewPlayer.disposed) try{window.previewPlayer.dispose();} catch(e){} 
                        window.previewPlayer = null; 
                        if (objectURL) URL.revokeObjectURL(objectURL); 
                        console.log(`[UI - Preview] Player stopped and resources for ${name} released.`);
                    };
                } catch (error) { 
                    console.error(`[UI - Preview] Error previewing sound ${name} (Path: ${item.fullPath}):`, error); 
                    showNotification(`Error previewing ${name}: ${error.message || 'Unknown error'}`, 4000); 
                    if (objectURL) URL.revokeObjectURL(objectURL); 
                }
            });
        }
        soundBrowserList.appendChild(div);
    });
}

// --- Mixer Window ---
export function openMixerWindow(savedState = null) {
    const windowId = 'mixer'; if (window.openWindows[windowId] && !savedState) { window.openWindows[windowId].restore(); return window.openWindows[windowId]; } if (window.openWindows[windowId] && savedState) window.openWindows[windowId].close(true);
    const contentDiv = document.createElement('div'); contentDiv.className = 'mixer-window-content p-2 overflow-x-auto flex flex-row gap-2';
    const winOptions = { width: Math.max(500, Math.min(800, window.innerWidth - 60)), height: 350, initialContentKey: 'mixer' }; if (savedState) Object.assign(winOptions, savedState);
    let mixerWin = null; try { mixerWin = new SnugWindow(windowId, 'Mixer', contentDiv, winOptions); } catch (e) { console.error('CRITICAL ERROR `new SnugWindow()` for Mixer:', e); showNotification("CRITICAL: Error creating Mixer window.", 6000); return null; }
    if (!mixerWin || !mixerWin.element) { showNotification("Failed to create Mixer window.", 5000); return null; } renderMixer(contentDiv); return mixerWin;
}
export function updateMixerWindow() { const mixerWin = window.openWindows['mixer']; if (mixerWin && mixerWin.element && !mixerWin.isMinimized) { const mixerContentArea = mixerWin.element.querySelector('.mixer-window-content'); if (mixerContentArea) renderMixer(mixerContentArea); } }
export function renderMixer(container) {
    if (!container) { console.error("[ui.js] Mixer container not found for rendering."); return; } container.innerHTML = ''; const currentTracks = typeof window.getTracks === 'function' ? window.getTracks() : [];
    currentTracks.forEach(track => { const strip = document.createElement('div'); strip.className = 'channel-strip flex flex-col items-center p-2 border border-gray-400 bg-gray-200 rounded-md min-w-[100px]'; const trackNameDiv = document.createElement('div'); trackNameDiv.className = 'track-name text-xs font-semibold mb-1 truncate w-full text-center'; trackNameDiv.title = track.name; trackNameDiv.textContent = track.name.substring(0,10) + (track.name.length > 10 ? '...' : ''); trackNameDiv.addEventListener('click', () => handleOpenTrackInspector(track.id)); strip.appendChild(trackNameDiv); const faderContainer = document.createElement('div'); faderContainer.className = 'fader-container w-full flex justify-center my-1'; faderContainer.id = `mixerVolumeSliderContainer-${track.id}`; strip.appendChild(faderContainer); const buttonsDiv = document.createElement('div'); buttonsDiv.className = 'mixer-buttons flex gap-1 mb-1 justify-center'; const muteBtn = document.createElement('button'); muteBtn.id = `mixerMuteBtn-${track.id}`; muteBtn.className = `mute-button text-xs p-1 w-6 h-6 flex items-center justify-center rounded ${track.isMuted ? 'muted' : ''}`; muteBtn.textContent = 'M'; muteBtn.addEventListener('click', () => handleTrackMute(track.id)); buttonsDiv.appendChild(muteBtn); const soloBtn = document.createElement('button'); soloBtn.id = `mixerSoloBtn-${track.id}`; const currentSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null; soloBtn.className = `solo-button text-xs p-1 w-6 h-6 flex items-center justify-center rounded ${currentSoloId === track.id ? 'soloed' : ''}`; soloBtn.textContent = 'S'; soloBtn.addEventListener('click', () => handleTrackSolo(track.id)); buttonsDiv.appendChild(soloBtn); strip.appendChild(buttonsDiv); const meterDiv = document.createElement('div'); meterDiv.id = `mixerTrackMeterContainer-${track.id}`; meterDiv.className = 'mixer-meter-container meter-bar-container w-full h-3 bg-gray-300 rounded overflow-hidden'; meterDiv.innerHTML = `<div id="mixerTrackMeterBar-${track.id}" class="meter-bar h-full bg-green-500 transition-all duration-50 ease-linear"></div>`; strip.appendChild(meterDiv); container.appendChild(strip); const volKnobContainer = strip.querySelector(`#mixerVolumeSliderContainer-${track.id}`); if(volKnobContainer) { const volKnob = createKnob({ label: '', min:0, max:1, step:0.01, initialValue: track.previousVolumeBeforeMute, decimals:2, sensitivity: 0.8, trackRef: track, onValueChange: (val, oldVal, fromInteraction) => { track.setVolume(val, fromInteraction); if (track.inspectorControls?.volume?.type === 'knob') track.inspectorControls.volume.setValue(val, false); } }); volKnobContainer.innerHTML = ''; volKnobContainer.appendChild(volKnob.element); if (!track.inspectorControls) track.inspectorControls = {}; track.inspectorControls[`mixerVolume-${track.id}`] = volKnob; } });
    const masterStrip = document.createElement('div'); masterStrip.className = 'channel-strip flex flex-col items-center p-2 border border-gray-500 bg-gray-300 rounded-md min-w-[100px]'; masterStrip.innerHTML = `<div class="track-name text-xs font-bold mb-1">Master</div><div class="fader-container w-full flex justify-center my-1" id="mixerMasterVolumeSliderContainer"></div><div id="mixerMasterMeterContainer" class="mixer-meter-container meter-bar-container w-full h-3 bg-gray-400 rounded overflow-hidden mt-auto"><div id="mixerMasterMeterBar" class="meter-bar h-full bg-green-500 transition-all duration-50 ease-linear"></div></div>`; container.appendChild(masterStrip);
    const masterVolSliderCont = masterStrip.querySelector('#mixerMasterVolumeSliderContainer'); if(masterVolSliderCont){ let currentMasterVol = 0; if (window.masterGainNode?.gain) currentMasterVol = window.masterGainNode.gain.value; else if (Tone.getDestination()?.volume) currentMasterVol = Tone.getDestination().volume.value; const masterVolKnob = createKnob({ label: '', min:0, max:1.5, step:0.01, initialValue: currentMasterVol, displaySuffix: '', decimals:2, sensitivity: 0.8, onValueChange: (val) => { if (window.masterGainNode?.gain) window.masterGainNode.gain.value = val; else if (Tone.getDestination()?.volume) Tone.getDestination().volume.value = val; } }); masterVolSliderCont.innerHTML = ''; masterVolSliderCont.appendChild(masterVolKnob.element); }
    setTimeout(() => { currentTracks.forEach(track => { track.inspectorControls[`mixerVolume-${track.id}`]?.refreshVisuals?.(); }); }, 50);
}

// --- Sequencer Window ---
export function buildSequencerContentDOM(track, rows, rowLabels, numBars) {
    const mainContentDiv = document.createElement('div'); mainContentDiv.className = 'sequencer-window-content p-2';
    const titleP = document.createElement('p'); titleP.className = 'text-xs mb-2'; titleP.textContent = `${track.name} - ${track.type} Sequencer (${rows} rows x ${track.sequenceLength} steps, ${numBars} Bars)`; mainContentDiv.appendChild(titleP);
    const gridContainer = document.createElement('div'); gridContainer.className = 'sequencer-grid-container'; gridContainer.style.overflow = 'auto';
    const gridDiv = document.createElement('div'); gridDiv.className = 'sequencer-grid'; gridDiv.style.display = 'grid'; gridDiv.style.gridTemplateColumns = `50px repeat(${track.sequenceLength}, minmax(20px, 1fr))`; gridDiv.style.gridTemplateRows = `25px repeat(${rows}, 25px)`; gridDiv.style.setProperty('--steps-per-bar', Constants.STEPS_PER_BAR.toString());
    const topLeftEmptyCell = document.createElement('div'); topLeftEmptyCell.className = 'sequencer-header-cell empty-top-left'; topLeftEmptyCell.style.gridColumn = '1'; topLeftEmptyCell.style.gridRow = '1'; gridDiv.appendChild(topLeftEmptyCell);
    for (let bar = 0; bar < numBars; bar++) { const barNumCell = document.createElement('div'); barNumCell.className = 'sequencer-header-cell bar-number-header'; barNumCell.textContent = `Bar ${bar + 1}`; barNumCell.style.gridRow = '1'; const startColForBar = (bar * Constants.STEPS_PER_BAR) + 2; barNumCell.style.gridColumn = `${startColForBar} / span ${Constants.STEPS_PER_BAR}`; barNumCell.style.textAlign = 'center'; barNumCell.style.overflow = 'hidden'; gridDiv.appendChild(barNumCell); }
    for (let r = 0; r < rows; r++) { const labelCell = document.createElement('div'); labelCell.className = 'sequencer-label-cell'; labelCell.title = rowLabels[r] || `Row ${r+1}`; labelCell.textContent = rowLabels[r] || `R${r+1}`; labelCell.style.gridColumn = '1'; labelCell.style.gridRow = `${r + 2}`; labelCell.style.display = 'flex'; labelCell.style.alignItems = 'center'; labelCell.style.paddingLeft = '5px'; gridDiv.appendChild(labelCell); for (let c = 0; c < track.sequenceLength; c++) { const stepCell = document.createElement('div'); let cellClass = 'sequencer-step-cell'; const beatInBar = (c % Constants.STEPS_PER_BAR); if (Constants.STEPS_PER_BAR === 16) { if (beatInBar % 4 === 0) cellClass += ' beat-downbeat'; else cellClass += ' beat-other'; } else { if (Math.floor(beatInBar / (Constants.STEPS_PER_BAR / 4)) % 2 === 0) cellClass += ' beat-1'; else cellClass += ' beat-2'; } const stepData = track.sequenceData[r]?.[c]; if (stepData && stepData.active) { if (track.type === 'Synth') cellClass += ' active-synth'; else if (track.type === 'Sampler') cellClass += ' active-sampler'; else if (track.type === 'DrumSampler') cellClass += ' active-drum-sampler'; else if (track.type === 'InstrumentSampler') cellClass += ' active-instrument-sampler'; } stepCell.className = cellClass; stepCell.dataset.row = r; stepCell.dataset.col = c; stepCell.title = `${rowLabels[r] || ''} - Step ${c + 1}`; stepCell.style.gridColumn = `${c + 2}`; stepCell.style.gridRow = `${r + 2}`; gridDiv.appendChild(stepCell); } }
    gridContainer.appendChild(gridDiv); mainContentDiv.appendChild(gridContainer); return mainContentDiv;
}
export function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) {
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null; if (!track) return null;
    const windowId = `sequencerWin-${track.id}`; if(typeof window.setActiveSequencerTrackId === 'function') window.setActiveSequencerTrackId(track.id); else window.activeSequencerTrackId = track.id;
    if (window.openWindows[windowId] && !forceRedraw && !savedState) { window.openWindows[windowId].restore(); return window.openWindows[windowId]; }
    if (window.openWindows[windowId] && (forceRedraw || savedState)) window.openWindows[windowId].close(true);
    let rows = 0, rowLabels = []; if (track.type === 'Synth' || track.type === 'InstrumentSampler') { rows = Constants.synthPitches.length; rowLabels = Constants.synthPitches; } else if (track.type === 'Sampler') { rows = track.slices.length > 0 ? track.slices.length : Constants.numSlices; rowLabels = Array.from({length: rows}, (_, i) => `Slice ${i + 1}`); } else if (track.type === 'DrumSampler') { rows = Constants.numDrumSamplerPads; rowLabels = Array.from({length: rows}, (_, i) => `Pad ${i+1}`); }
    if (rows === 0 && track.sequenceData && track.sequenceData.length > 0) { rows = track.sequenceData.length; rowLabels = Array.from({length: rows}, (_, i) => `Row ${i + 1}`); }
    if (rows === 0) { showNotification(`Cannot determine rows for ${track.type} sequencer.`, 3000); return null; }
    const numBars = Math.ceil(track.sequenceLength / Constants.STEPS_PER_BAR); const sequencerContentElement = buildSequencerContentDOM(track, rows, rowLabels, numBars);
    const winOptions = { width: Math.min(700, window.innerWidth - 50), height: Math.min(420 + rows * 28, window.innerHeight - 100), initialContentKey: `sequencerWin-${track.id}` }; if (savedState) Object.assign(winOptions, savedState);
    const seqWin = new SnugWindow(windowId, `Sequencer: ${track.name}`, sequencerContentElement, winOptions); if (!seqWin || !seqWin.element) { showNotification("Failed to create Sequencer window.", 5000); return null; } track.sequencerWindow = seqWin;
    seqWin.element.querySelectorAll('.sequencer-step-cell').forEach(cell => { cell.addEventListener('click', () => { const r = parseInt(cell.dataset.row); const c = parseInt(cell.dataset.col); if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Sequencer Step (Track ${track.name}, ${rowLabels[r] || 'Row ' + (r+1)}, Step ${c+1})`); if (!track.sequenceData[r]) track.sequenceData[r] = Array(track.sequenceLength).fill(null); const currentlyActive = track.sequenceData[r][c] && track.sequenceData[r][c].active; if (!currentlyActive) { track.sequenceData[r][c] = { active: true, velocity: Constants.defaultVelocity }; if(typeof window.updateSequencerCellUI === 'function') window.updateSequencerCellUI(cell, track.type, true); } else { track.sequenceData[r][c].active = false; if(typeof window.updateSequencerCellUI === 'function') window.updateSequencerCellUI(cell, track.type, false); } }); });
    seqWin.onCloseCallback = () => { const currentActiveSeqId = typeof window.getActiveSequencerTrackId === 'function' ? window.getActiveSequencerTrackId() : null; if (currentActiveSeqId === track.id) { if(typeof window.setActiveSequencerTrackId === 'function') window.setActiveSequencerTrackId(null); } };
    return seqWin;
}

// --- Utility UI functions for samplers ---
export function renderSamplePads(track) {
    if (!track || !track.inspectorWindow?.element) return;
    const padsContainer = track.inspectorWindow.element.querySelector(`#samplePadsContainer-${track.id}`);
    if (!padsContainer) return;
    padsContainer.innerHTML = '';
    if (!track.slices || track.slices.length === 0) { padsContainer.textContent = 'No slices. Load sample.'; return; }
    track.slices.forEach((slice, index) => {
        const pad = document.createElement('button'); pad.className = `pad-button ${index === track.selectedSliceForEdit ? 'selected-for-edit' : ''}`; pad.textContent = `Slice ${index + 1}`; pad.title = `Select Slice ${index + 1}. Click to preview.`; pad.dataset.trackId = track.id; pad.dataset.trackType = "Sampler"; pad.dataset.padSliceIndex = index.toString();
        pad.addEventListener('click', async () => { track.selectedSliceForEdit = index; if(typeof window.playSlicePreview === 'function') await window.playSlicePreview(track.id, index); renderSamplePads(track); updateSliceEditorUI(track); });
        padsContainer.appendChild(pad);
    });
}
export function updateSliceEditorUI(track) {
    if (!track || track.type !== 'Sampler' || !track.inspectorWindow?.element) return;
    const inspectorEl = track.inspectorWindow.element; const selectedSlice = track.slices[track.selectedSliceForEdit]; if (!selectedSlice) return;
    const selectedSliceLabel = inspectorEl.querySelector(`#selectedSliceLabel-${track.id}`); if(selectedSliceLabel) selectedSliceLabel.textContent = (track.selectedSliceForEdit + 1).toString();
    const startInput = inspectorEl.querySelector(`#sliceStart-${track.id}`); const endInput = inspectorEl.querySelector(`#sliceEnd-${track.id}`);
    if (startInput) startInput.value = selectedSlice.offset.toFixed(3); if (endInput) endInput.value = (selectedSlice.offset + selectedSlice.duration).toFixed(3);
    track.inspectorControls.sliceVolume?.setValue(selectedSlice.volume, false); track.inspectorControls.slicePitch?.setValue(selectedSlice.pitchShift, false); track.inspectorControls.sliceEnvAttack?.setValue(selectedSlice.envelope.attack, false); track.inspectorControls.sliceEnvDecay?.setValue(selectedSlice.envelope.decay, false); track.inspectorControls.sliceEnvSustain?.setValue(selectedSlice.envelope.sustain, false); track.inspectorControls.sliceEnvRelease?.setValue(selectedSlice.envelope.release, false);
    const loopToggle = inspectorEl.querySelector(`#sliceLoopToggle-${track.id}`); if (loopToggle) { loopToggle.textContent = selectedSlice.loop ? 'Loop: ON' : 'Loop: OFF'; loopToggle.classList.toggle('active', selectedSlice.loop); }
    const reverseToggle = inspectorEl.querySelector(`#sliceReverseToggle-${track.id}`); if (reverseToggle) { reverseToggle.textContent = selectedSlice.reverse ? 'Rev: ON' : 'Rev: OFF'; reverseToggle.classList.toggle('active', selectedSlice.reverse); }
}
export function applySliceEdits(trackId) {
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null; if (!track || track.type !== 'Sampler' || !track.inspectorWindow?.element) return;
    const inspectorEl = track.inspectorWindow.element; const slice = track.slices[track.selectedSliceForEdit]; if (!slice) return;
    const newStart = parseFloat(inspectorEl.querySelector(`#sliceStart-${track.id}`)?.value); const newEnd = parseFloat(inspectorEl.querySelector(`#sliceEnd-${track.id}`)?.value);
    if (!isNaN(newStart) && !isNaN(newEnd) && newEnd > newStart && track.audioBuffer) { slice.offset = Math.max(0, Math.min(newStart, track.audioBuffer.duration)); slice.duration = Math.max(0.001, Math.min(newEnd - slice.offset, track.audioBuffer.duration - slice.offset)); slice.userDefined = true; if(typeof window.drawWaveform === 'function') window.drawWaveform(track); showNotification(`Slice ${track.selectedSliceForEdit + 1} updated.`, 1500); } else { showNotification("Invalid slice start/end times.", 2000); updateSliceEditorUI(track); }
}
export function drawWaveform(track) {
    if (!track || (track.type !== 'Sampler' && track.type !== 'InstrumentSampler') ) return;
    const isSampler = track.type === 'Sampler'; const audioBufferToDraw = isSampler ? track.audioBuffer : track.instrumentSamplerSettings.audioBuffer; const ctx = isSampler ? track.waveformCanvasCtx : track.instrumentWaveformCanvasCtx;
    if (!audioBufferToDraw || !audioBufferToDraw.loaded || !ctx) { if (ctx) { const canvas = ctx.canvas; ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#e0e0e0'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#888'; ctx.textAlign = 'center'; ctx.fillText(isSampler ? 'No Sample Loaded' : 'No Instrument Sample', canvas.width / 2, canvas.height / 2); } return; }
    const canvas = ctx.canvas; const width = canvas.width; const height = canvas.height; const channelData = audioBufferToDraw.getChannelData(0); ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#a0a0a0'; ctx.fillRect(0, 0, width, height); ctx.lineWidth = 1; ctx.strokeStyle = '#333'; ctx.beginPath(); const sliceWidth = width / channelData.length; for (let i = 0; i < channelData.length; i++) { const x = i * sliceWidth; const y = (0.5 + channelData[i] * 0.5) * height; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
    if (track.type === 'Sampler') { ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; ctx.lineWidth = 1; track.slices.forEach((slice, index) => { if (slice.duration > 0) { const startX = (slice.offset / audioBufferToDraw.duration) * width; const endX = ((slice.offset + slice.duration) / audioBufferToDraw.duration) * width; ctx.beginPath(); ctx.moveTo(startX, 0); ctx.lineTo(startX, height); ctx.stroke(); if (index === track.selectedSliceForEdit) { ctx.fillStyle = 'rgba(0, 0, 255, 0.2)'; ctx.fillRect(startX, 0, endX - startX, height); ctx.strokeStyle = 'rgba(0, 0, 255, 0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(startX,0); ctx.lineTo(startX,height); ctx.stroke(); ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; ctx.lineWidth = 1; } } }); }
    if (track.type === 'InstrumentSampler' && track.instrumentSamplerSettings.loop) { ctx.strokeStyle = 'rgba(0, 255, 0, 0.7)'; ctx.lineWidth = 1; const loopStartX = (track.instrumentSamplerSettings.loopStart / audioBufferToDraw.duration) * width; const loopEndX = (track.instrumentSamplerSettings.loopEnd / audioBufferToDraw.duration) * width; ctx.beginPath(); ctx.moveTo(loopStartX, 0); ctx.lineTo(loopStartX, height); ctx.stroke(); ctx.beginPath(); ctx.moveTo(loopEndX, 0); ctx.lineTo(loopEndX, height); ctx.stroke(); ctx.fillStyle = 'rgba(0, 255, 0, 0.1)'; ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, height); }
}
export function drawInstrumentWaveform(track) { drawWaveform(track); }
export function updateDrumPadControlsUI(track) {
    if (!track || track.type !== 'DrumSampler' || !track.inspectorWindow?.element) return;
    const inspectorEl = track.inspectorWindow.element; const selectedPad = track.drumSamplerPads[track.selectedDrumPadForEdit]; if (!selectedPad) return;
    const loadContainer = inspectorEl.querySelector(`#drumPadLoadContainer-${track.id}`);
    if (loadContainer) {
        const inputId = `drumPadFileInput-${track.id}-${track.selectedDrumPadForEdit}`;
        loadContainer.innerHTML = createDropZoneHTML(track.id, inputId, 'DrumSampler', track.selectedDrumPadForEdit, selectedPad) + `<span id="drumPadFileName-${track.id}-${track.selectedDrumPadForEdit}" class="text-xs ml-2 block truncate" style="max-width: 150px;" title="${selectedPad.originalFileName || 'No file'}">${selectedPad.originalFileName || 'No file'}</span>`;
        const fileInputEl = loadContainer.querySelector(`#${inputId}`); const dropZoneEl = loadContainer.querySelector(`#dropZone-${track.id}-drumsampler-${track.selectedDrumPadForEdit}`);
        if (fileInputEl) fileInputEl.addEventListener('change', (e) => { window.loadDrumSamplerPadFile(e, track.id, track.selectedDrumPadForEdit); });
        if (dropZoneEl && typeof utilSetupDropZoneListeners === 'function') utilSetupDropZoneListeners(dropZoneEl, track.id, 'DrumSampler', track.selectedDrumPadForEdit, window.loadSoundFromBrowserToTarget, window.loadDrumSamplerPadFile);
    }
    track.inspectorControls.drumPadVolume?.setValue(selectedPad.volume, false); track.inspectorControls.drumPadPitch?.setValue(selectedPad.pitchShift, false); track.inspectorControls.drumPadEnvAttack?.setValue(selectedPad.envelope.attack, false); track.inspectorControls.drumPadEnvRelease?.setValue(selectedPad.envelope.release, false);
}
export function renderDrumSamplerPads(track) {
    if (!track || track.type !== 'DrumSampler' || !track.inspectorWindow?.element) return;
    const padsContainer = track.inspectorWindow.element.querySelector(`#drumSamplerPadsContainer-${track.id}`); if (!padsContainer) return;
    padsContainer.innerHTML = ''; if (!track.drumSamplerPads || track.drumSamplerPads.length === 0) { padsContainer.textContent = 'No pads.'; return; }
    track.drumSamplerPads.forEach((padData, index) => {
        const padEl = document.createElement('button'); padEl.className = `pad-button ${index === track.selectedDrumPadForEdit ? 'selected-for-edit' : ''} drop-zone-pad`;
        const fileNameDisplay = padData.originalFileName ? padData.originalFileName.substring(0, 10) + (padData.originalFileName.length > 10 ? '...' : '') : 'Empty';
        padEl.innerHTML = `Pad ${index + 1} <span class="pad-label block truncate" style="max-width: 60px;" title="${padData.originalFileName || 'Empty'}">${fileNameDisplay}</span>`; padEl.title = `Select Pad ${index + 1}. Click to preview. Drag audio. Sample: ${padData.originalFileName || 'Empty'}`;
        padEl.dataset.trackId = track.id.toString(); padEl.dataset.trackType = "DrumSampler"; padEl.dataset.padSliceIndex = index.toString();
        padEl.addEventListener('click', async () => { track.selectedDrumPadForEdit = index; if(typeof window.playDrumSamplerPadPreview === 'function') await window.playDrumSamplerPadPreview(track.id, index); renderDrumSamplerPads(track); updateDrumPadControlsUI(track); });
        if (typeof utilSetupDropZoneListeners === 'function') utilSetupDropZoneListeners(padEl, track.id, "DrumSampler", index, window.loadSoundFromBrowserToTarget, window.loadDrumSamplerPadFile);
        padsContainer.appendChild(padEl);
    });
}
export function highlightPlayingStep(col, trackType, gridElement) {
    if (!gridElement) return; const lastPlayingCol = gridElement._lastPlayingCol;
    if (lastPlayingCol !== undefined && lastPlayingCol !== col) { const prevCells = gridElement.querySelectorAll(`.sequencer-step-cell[data-col="${lastPlayingCol}"]`); prevCells.forEach(cell => cell.classList.remove('playing')); }
    if (lastPlayingCol !== col) { const currentCells = gridElement.querySelectorAll(`.sequencer-step-cell[data-col="${col}"]`); currentCells.forEach(cell => cell.classList.add('playing')); }
    gridElement._lastPlayingCol = col;
}

