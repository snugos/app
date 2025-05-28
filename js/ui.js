// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Fully Corrected with All Debugging Logic (May 28)');

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
function createKnob(options) {
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
    dzContainer.innerHTML = createDropZoneHTML(track.id, 'Sampler', null, track.samplerAudioData);
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
function buildInstrumentSamplerSpecificInspectorDOM(track) { /* ... (same as in ui_js_super_trycatch_gcw) ... */ }

// --- Track Inspector Window & Controls Initialization ---
function buildTrackInspectorContentDOM(track) {
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
        doubleSeqButton.addEventListener('click', async () => { /* ... */ });
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

function openTrackInspectorWindow(trackId, savedState = null) {
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
    if (window.openWindows[inspectorId] && savedState) {
        window.openWindows[inspectorId].close();
    }

    track.inspectorControls = {};
    console.log(`[UI - openTrackInspectorWindow] Building content DOM for track ${track.id}`);
    const inspectorContentElement = buildTrackInspectorContentDOM(track); 
    
    if (!inspectorContentElement) {
        showNotification(`Failed to build Inspector content for Track ${track.id}. See console.`, 4000);
        console.error(`[UI - openTrackInspectorWindow] buildTrackInspectorContentDOM returned null for track ${track.id}. CANNOT CREATE WINDOW.`);
        return null; 
    }
    console.log(`[UI - openTrackInspectorWindow] inspectorContentElement received from build (is it an HTMLElement?):`, inspectorContentElement instanceof HTMLElement, inspectorContentElement);

    let windowHeight = 450;
    if (track.type === 'Synth') windowHeight = 620;
    else if (track.type === 'Sampler') windowHeight = 620;
    else if (track.type === 'DrumSampler') windowHeight = 580;
    else if (track.type === 'InstrumentSampler') windowHeight = 620;

    const winOptions = { width: Math.min(500, window.innerWidth - 40), height: Math.min(windowHeight, window.innerHeight - 80), initialContentKey: `trackInspector-${track.id}` };
    if (savedState) Object.assign(winOptions, savedState);

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
         console.error(`[UI - openTrackInspectorWindow] SnugWindow instance or its element is null for inspector ${inspectorId}`);
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


function initializeCommonInspectorControls(track, winEl) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function initializeTypeSpecificInspectorControls(track, winEl) { /* ... (same content as in ui_js_super_trycatch_gcw, with detailed logs) ... */ }
function initializeSynthSpecificControls(track, winEl) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function initializeSamplerSpecificControls(track, winEl) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function initializeDrumSamplerSpecificControls(track, winEl) { /* ... (same content as in ui_js_super_trycatch_gcw, with detailed logs) ... */ }
function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }

// --- Modular Effects Rack UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function renderEffectsList(owner, ownerType, listDiv, controlsContainer) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function renderEffectControls(owner, ownerType, effectId, controlsContainer) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function showAddEffectModal(owner, ownerType) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }

// --- Window Opening Functions (with Debugging & GCW try...catch) ---
function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function openMasterEffectsRackWindow(savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function openGlobalControlsWindow(savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw, with attachGlobalControlEvents call ACTIVE) ... */ }
function openSoundBrowserWindow(savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function updateSoundBrowserDisplayForLibrary(libraryName) { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function renderSoundBrowserDirectory(pathArray, treeNode) { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function openMixerWindow(savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function updateMixerWindow() { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function renderMixer(container) { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function buildSequencerContentDOM(track, rows, rowLabels, numBars) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }

// --- Utility UI functions for samplers (Updated for Audio Status & Debugging) ---
function renderSamplePads(track) { /* ... (same content as in ui_js_super_trycatch_gcw, with detailed logs) ... */ }
function updateSliceEditorUI(track) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function applySliceEdits(trackId) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function drawWaveform(track) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function drawInstrumentWaveform(track) { drawWaveform(track); }
function updateDrumPadControlsUI(track) { /* ... (same content as in ui_js_super_trycatch_gcw, with detailed logs) ... */ }
function renderDrumSamplerPads(track) { /* ... (same content as in ui_js_super_trycatch_gcw, with detailed logs) ... */ }
function highlightPlayingStep(col, trackType, gridElement) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }

export {
    createKnob,
    buildTrackInspectorContentDOM,
    openTrackInspectorWindow,
    initializeCommonInspectorControls,
    initializeTypeSpecificInspectorControls,
    applySliceEdits,
    drawWaveform,
    drawInstrumentWaveform,
    renderEffectsList,
    renderEffectControls,
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
    updateDrumPadControlsUI,
    renderDrumSamplerPads,
    highlightPlayingStep
};
