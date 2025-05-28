// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Audio Status, Relink & Debugging Version (Corrected Exports & Upload Click Fix)');

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


// --- Sampler Inspector Specifics (Updated for Audio Status) ---
function buildSamplerSpecificInspectorDOM(track) {
    const panel = document.createElement('div'); panel.className = 'panel sampler-panel';
    const dzContainer = document.createElement('div');
    dzContainer.id = `dropZoneContainer-${track.id}-sampler`;
    // Call createDropZoneHTML with track.samplerAudioData (which includes status)
    // The second argument (trackTypeHint) for createDropZoneHTML is enough to construct part of the ID.
    // The padOrSliceIndex is null for a general sampler track.
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

// --- Drum Sampler Inspector Specifics (Updated for Audio Status) ---
function buildDrumSamplerSpecificInspectorDOM(track) {
    const panel = document.createElement('div'); panel.className = 'panel drum-sampler-panel';
    const title = document.createElement('h4'); title.className = 'text-sm font-semibold mb-1'; title.innerHTML = `Sampler Pads (Selected: <span id="selectedDrumPadLabel-${track.id}">${track.selectedDrumPadForEdit + 1}</span>)`; panel.appendChild(title);
    const padsContainer = document.createElement('div'); padsContainer.id = `drumSamplerPadsContainer-${track.id}`; padsContainer.className = 'pads-container mb-2'; panel.appendChild(padsContainer);

    const controlsContainer = document.createElement('div'); controlsContainer.id = `drumPadControlsContainer-${track.id}`; controlsContainer.className = 'border-t pt-2';
    const loadContainer = document.createElement('div'); loadContainer.id = `drumPadLoadContainer-${track.id}`; loadContainer.className = 'mb-2';
    controlsContainer.appendChild(loadContainer);

    const volPitchGroup = document.createElement('div'); volPitchGroup.className = 'control-group'; const volPlaceholder = document.createElement('div'); volPlaceholder.id = `drumPadVolumeSlider-${track.id}`; volPitchGroup.appendChild(volPlaceholder); const pitchPlaceholder = document.createElement('div'); pitchPlaceholder.id = `drumPadPitchKnob-${track.id}`; volPitchGroup.appendChild(pitchPlaceholder); controlsContainer.appendChild(volPitchGroup);
    const details = document.createElement('details'); details.className = 'mt-1'; const summary = document.createElement('summary'); summary.className = 'text-xs font-semibold'; summary.textContent = 'Pad Envelope (AR)'; details.appendChild(summary); const padEnvGroup = document.createElement('div'); padEnvGroup.className = 'control-group'; ['drumPadEnvAttackSlider', 'drumPadEnvReleaseSlider'].forEach(id => { const knobPlaceholder = document.createElement('div'); knobPlaceholder.id = `${id}-${track.id}`; padEnvGroup.appendChild(knobPlaceholder); }); details.appendChild(padEnvGroup); controlsContainer.appendChild(details);
    panel.appendChild(controlsContainer);

    const selectedPadData = track.drumSamplerPads[track.selectedDrumPadForEdit];
    if (selectedPadData?.status !== 'loaded') {
        controlsContainer.querySelectorAll('input, button, select, details').forEach(el => {
             if (!el.closest('.drop-zone-relink-container') && !el.classList.contains('drop-zone-relink-button') && el.id !== `drumPadLoadContainer-${track.id}`) {
                el.disabled = true;
             }
        });
        controlsContainer.style.opacity = '0.5';
    }
    return panel;
}

// --- Instrument Sampler Inspector Specifics (Updated for Audio Status) ---
function buildInstrumentSamplerSpecificInspectorDOM(track) {
    const panel = document.createElement('div'); panel.className = 'panel instrument-sampler-panel';
    const dropZoneContainer = document.createElement('div'); dropZoneContainer.id = `dropZoneContainer-${track.id}-instrumentsampler`;
    dropZoneContainer.innerHTML = createDropZoneHTML(track.id, 'InstrumentSampler', null, track.instrumentSamplerSettings);
    panel.appendChild(dropZoneContainer);

    const canvas = document.createElement('canvas'); canvas.id = `instrumentWaveformCanvas-${track.id}`; canvas.className = 'waveform-canvas w-full mb-1'; canvas.width = 380; canvas.height = 70; panel.appendChild(canvas);
    const controlsContainer = document.createElement('div'); controlsContainer.id = `instrumentSamplerControls-${track.id}`;
    const rootLoopGroup = document.createElement('div'); rootLoopGroup.className = 'control-group mb-2 items-center';
    const rootNoteDiv = document.createElement('div'); rootNoteDiv.innerHTML = `<label class="knob-label text-xs">Root Note</label><input type="text" id="instrumentRootNote-${track.id}" value="${track.instrumentSamplerSettings.rootNote}" class="bg-white text-black w-12 p-0.5 text-xs text-center border">`; rootLoopGroup.appendChild(rootNoteDiv);
    const loopToggleDiv = document.createElement('div'); loopToggleDiv.innerHTML = `<label class="knob-label text-xs">Loop</label><button id="instrumentLoopToggle-${track.id}" class="slice-toggle-button text-xs p-1">${track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF'}</button>`; rootLoopGroup.appendChild(loopToggleDiv);
    const loopStartDiv = document.createElement('div'); loopStartDiv.innerHTML = `<label class="knob-label text-xs">Start</label><input type="number" id="instrumentLoopStart-${track.id}" value="${track.instrumentSamplerSettings.loopStart.toFixed(3)}" step="0.001" class="bg-white text-black w-16 p-0.5 text-xs text-center border">`; rootLoopGroup.appendChild(loopStartDiv);
    const loopEndDiv = document.createElement('div'); loopEndDiv.innerHTML = `<label class="knob-label text-xs">End</label><input type="number" id="instrumentLoopEnd-${track.id}" value="${track.instrumentSamplerSettings.loopEnd.toFixed(3)}" step="0.001" class="bg-white text-black w-16 p-0.5 text-xs text-center border">`; rootLoopGroup.appendChild(loopEndDiv); controlsContainer.appendChild(rootLoopGroup);
    const polyBtn = document.createElement('button'); polyBtn.id = `instrumentSamplerPolyphonyToggle-${track.id}`; polyBtn.className = 'slice-toggle-button text-xs p-1 mb-2 w-full'; polyBtn.textContent = 'Mode: Poly'; controlsContainer.appendChild(polyBtn);
    const envTitle = document.createElement('h4'); envTitle.className = 'text-sm font-semibold'; envTitle.textContent = 'Envelope (ADSR)'; controlsContainer.appendChild(envTitle);
    const envGroup = document.createElement('div'); envGroup.className = 'control-group'; ['instrumentEnvAttackSlider', 'instrumentEnvDecaySlider', 'instrumentEnvSustainSlider', 'instrumentEnvReleaseSlider'].forEach(id => { const knobPlaceholder = document.createElement('div'); knobPlaceholder.id = `${id}-${track.id}`; envGroup.appendChild(knobPlaceholder); }); controlsContainer.appendChild(envGroup);
    panel.appendChild(controlsContainer);

    const sampleStatus = track.instrumentSamplerSettings?.status;
    if (sampleStatus !== 'loaded') {
        controlsContainer.querySelectorAll('input, button, select').forEach(el => {
            if (!el.closest('.drop-zone-relink-container') && !el.classList.contains('drop-zone-relink-button')) {
                el.disabled = true;
            }
        });
        controlsContainer.style.opacity = '0.5';
    }
    return panel;
}

// --- Track Inspector Window & Controls Initialization ---
function buildTrackInspectorContentDOM(track) {
    const contentDiv = document.createElement('div'); contentDiv.className = 'track-inspector-content p-2 space-y-1';
    const headerDiv = document.createElement('div'); headerDiv.className = 'flex items-center justify-between mb-1';
    const nameInput = document.createElement('input'); nameInput.type = 'text'; nameInput.id = `trackNameDisplay-${track.id}`; nameInput.value = track.name; nameInput.className = 'text-md font-bold bg-transparent border-b w-full focus:ring-0 focus:border-blue-500'; headerDiv.appendChild(nameInput);
    const meterContainer = document.createElement('div'); meterContainer.id = `trackMeterContainer-${track.id}`; meterContainer.className = 'track-meter-container meter-bar-container w-1/3 ml-2 h-4';
    const meterBar = document.createElement('div'); meterBar.id = `trackMeterBar-${track.id}`; meterBar.className = 'meter-bar'; meterContainer.appendChild(meterBar); headerDiv.appendChild(meterContainer); contentDiv.appendChild(headerDiv);
    const actionsDiv = document.createElement('div'); actionsDiv.className = 'flex items-center gap-1 mb-1';
    const muteBtn = document.createElement('button'); muteBtn.id = `muteBtn-${track.id}`; muteBtn.className = `mute-button text-xs p-1 ${track.isMuted ? 'muted' : ''}`; muteBtn.textContent = 'M'; muteBtn.addEventListener('click', () => handleTrackMute(track.id)); actionsDiv.appendChild(muteBtn);
    const soloBtn = document.createElement('button'); soloBtn.id = `soloBtn-${track.id}`; const currentSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null; soloBtn.className = `solo-button text-xs p-1 ${currentSoloId === track.id ? 'soloed' : ''}`; soloBtn.textContent = 'S'; soloBtn.addEventListener('click', () => handleTrackSolo(track.id)); actionsDiv.appendChild(soloBtn);
    const armBtn = document.createElement('button'); armBtn.id = `armInputBtn-${track.id}`; const currentArmedId = typeof window.getArmedTrackId === 'function' ? window.getArmedTrackId() : null; armBtn.className = `arm-input-button text-xs p-1 ${currentArmedId === track.id ? 'armed' : ''}`; armBtn.textContent = 'Arm'; armBtn.addEventListener('click', () => handleTrackArm(track.id)); actionsDiv.appendChild(armBtn);
    const removeBtn = document.createElement('button'); removeBtn.id = `removeTrackBtn-${track.id}`; removeBtn.className = 'bg-red-500 hover:bg-red-600 text-white text-xs py-0.5 px-1.5 rounded ml-auto'; removeBtn.textContent = 'Del'; removeBtn.addEventListener('click', () => handleRemoveTrack(track.id)); actionsDiv.appendChild(removeBtn); contentDiv.appendChild(actionsDiv);
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
    doubleSeqButton.addEventListener('click', async () => { if (track && typeof track.doubleSequence === 'function') { const result = await track.doubleSequence(); if (result && typeof showNotification === 'function') showNotification(result.message, result.success ? 2000 : 3000); if (result && result.success && track.inspectorWindow?.element) { const inspEl = track.inspectorWindow.element; const barsIn = inspEl.querySelector(`#sequenceLengthBars-${track.id}`); const dispSpan = inspEl.querySelector(`#sequenceLengthDisplay-${track.id}`); const newNBars = track.sequenceLength / Constants.STEPS_PER_BAR; if (barsIn) barsIn.value = newNBars; if (dispSpan) dispSpan.textContent = `${newNBars} bars (${track.sequenceLength} steps)`; } } else { console.error("doubleSequence method not found for track ID:", track.id); if (typeof showNotification === 'function') showNotification("Error: Could not double sequence.", 3000); } });
    seqLengthContainer.appendChild(doubleSeqButton); controlGroup.appendChild(seqLengthContainer); trackControlsPanel.appendChild(controlGroup); contentDiv.appendChild(trackControlsPanel);
    let specificContentElement;
    if (track.type === 'Synth') specificContentElement = buildSynthSpecificInspectorDOM(track);
    else if (track.type === 'Sampler') specificContentElement = buildSamplerSpecificInspectorDOM(track);
    else if (track.type === 'DrumSampler') specificContentElement = buildDrumSamplerSpecificInspectorDOM(track);
    else if (track.type === 'InstrumentSampler') specificContentElement = buildInstrumentSamplerSpecificInspectorDOM(track);
    if (specificContentElement) contentDiv.appendChild(specificContentElement);
    const effectsButton = document.createElement('button'); effectsButton.className = 'effects-rack-button text-xs py-1 px-2 rounded mt-2 w-full bg-gray-300 hover:bg-gray-400 border border-gray-500'; effectsButton.textContent = 'Track Effects Rack'; effectsButton.addEventListener('click', () => handleOpenEffectsRack(track.id)); contentDiv.appendChild(effectsButton);
    const sequencerButton = document.createElement('button'); sequencerButton.className = 'bg-indigo-500 hover:bg-indigo-600 text-white text-xs py-1 px-2 rounded mt-1 w-full'; sequencerButton.textContent = 'Sequencer'; sequencerButton.addEventListener('click', () => handleOpenSequencer(track.id)); contentDiv.appendChild(sequencerButton);
    return contentDiv;
}
function openTrackInspectorWindow(trackId, savedState = null) {
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null; if (!track) { showNotification(`Track ID ${trackId} not found.`, 3000); return null; }
    const inspectorId = `trackInspector-${track.id}`;
    if (window.openWindows[inspectorId] && !savedState) { window.openWindows[inspectorId].restore(); return window.openWindows[inspectorId]; }
    if (window.openWindows[inspectorId] && savedState) window.openWindows[inspectorId].close();
    track.inspectorControls = {};
    const inspectorContentElement = buildTrackInspectorContentDOM(track);
    if (!inspectorContentElement) { showNotification(`Failed to build Inspector content (Track ${track.id}).`, 4000); return null; }
    let windowHeight = 450; if (track.type === 'Synth') windowHeight = 620; else if (track.type === 'Sampler') windowHeight = 620; else if (track.type === 'DrumSampler') windowHeight = 580; else if (track.type === 'InstrumentSampler') windowHeight = 620;
    const winOptions = { width: Math.min(500, window.innerWidth - 40), height: Math.min(windowHeight, window.innerHeight - 80), initialContentKey: `trackInspector-${track.id}` }; if (savedState) Object.assign(winOptions, savedState);
    let inspectorWin = null; try { inspectorWin = new SnugWindow(inspectorId, `Track: ${track.name}`, inspectorContentElement, winOptions); } catch (e) { console.error(`CRITICAL ERROR \`new SnugWindow()\` for inspector ${inspectorId}:`, e); showNotification("CRITICAL: Error creating inspector window.", 6000); return null; }
    if (!inspectorWin || !inspectorWin.element) { showNotification(`Failed to create Inspector window for track ${track.id}.`, 5000); return null; }
    track.inspectorWindow = inspectorWin;
    initializeCommonInspectorControls(track, inspectorWin.element);
    initializeTypeSpecificInspectorControls(track, inspectorWin.element);
    setTimeout(() => { Object.values(track.inspectorControls).forEach(control => { if (control?.type === 'knob' && typeof control.refreshVisuals === 'function') control.refreshVisuals(); }); }, 50);
    return inspectorWin;
}
function initializeCommonInspectorControls(track, winEl) {
    winEl.querySelector(`#trackNameDisplay-${track.id}`)?.addEventListener('change', (e) => { const oldName = track.name; const newName = e.target.value; if (oldName !== newName && typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Rename Track "${oldName}" to "${newName}"`); track.name = newName; if (track.inspectorWindow?.titleBar) track.inspectorWindow.titleBar.querySelector('span').textContent = `Track: ${track.name}`; if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow(); });
    const volSliderContainer = winEl.querySelector(`#volumeSliderContainer-${track.id}`); if (volSliderContainer) { const volKnob = createKnob({ label: 'Volume', min: 0, max: 1, step: 0.01, initialValue: track.previousVolumeBeforeMute, decimals: 2, sensitivity: 0.8, trackRef: track, onValueChange: (val, oldVal, fromInteraction) => { track.setVolume(val, fromInteraction); if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow(); } }); volSliderContainer.innerHTML = ''; volSliderContainer.appendChild(volKnob.element); track.inspectorControls.volume = volKnob; }
    const seqLenBarsInput = winEl.querySelector(`#sequenceLengthBars-${track.id}`); const seqLenDisplaySpan = winEl.querySelector(`#sequenceLengthDisplay-${track.id}`); if(seqLenBarsInput && seqLenDisplaySpan) { seqLenBarsInput.addEventListener('change', (e) => { let numBars = parseInt(e.target.value); if(isNaN(numBars) || numBars < 1) numBars = 1; if(numBars > 256) numBars = 256; e.target.value = numBars; const numSteps = numBars * Constants.STEPS_PER_BAR; if (track.sequenceLength !== numSteps) { track.setSequenceLength(numSteps, false); seqLenDisplaySpan.textContent = `${numBars} bars (${numSteps} steps)`; } }); }
}

function initializeTypeSpecificInspectorControls(track, winEl) {
    if (track.type === 'Synth') initializeSynthSpecificControls(track, winEl);
    else if (track.type === 'Sampler') initializeSamplerSpecificControls(track, winEl);
    else if (track.type === 'DrumSampler') initializeDrumSamplerSpecificControls(track, winEl);
    else if (track.type === 'InstrumentSampler') initializeInstrumentSamplerSpecificControls(track, winEl);
}

function initializeSynthSpecificControls(track, winEl) {
    const c = winEl.querySelector(`#synthEngineControls-${track.id}`); if (c) { setTimeout(() => { (synthEngineControlDefinitions['MonoSynth']||[]).forEach(def => { if (def.type === 'knob' && track.inspectorControls?.[def.idPrefix]) track.inspectorControls[def.idPrefix].refreshVisuals(); }); }, 50); }
}

function initializeSamplerSpecificControls(track, winEl) {
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-sampler`);
    const fileInputId = `fileInput-${track.id}-Sampler-null`; // Consistent ID
    const fileInputEl = dzContainerEl?.querySelector(`#${fileInputId}`);

    if (dzContainerEl && fileInputEl) {
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        if (dzEl) utilSetupDropZoneListeners(dzEl, track.id, 'Sampler', null, window.loadSoundFromBrowserToTarget, window.loadSampleFile);
        fileInputEl.onchange = (e) => {
            console.log(`[UI] Sampler fileInputEl changed for track ${track.id}`);
            window.loadSampleFile(e, track.id, 'Sampler');
        };
        console.log(`[UI] Attached change listener to Sampler fileInput: #${fileInputId}`);

        const relinkButtonId = `relinkFileBtn-${track.id}-Sampler-null`;
        const relinkButton = dzContainerEl.querySelector(`#${relinkButtonId}`);
        if (relinkButton) {
            relinkButton.onclick = () => {
                console.log(`[UI] Relink button clicked for Sampler track ${track.id}, triggering click on #${fileInputId}`);
                fileInputEl.click();
            };
        }
    } else {
        console.warn(`[UI] Sampler dzContainerEl or fileInputEl not found for track ${track.id}. Input ID searched: #${fileInputId}`);
    }

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
    const polyToggleBtn = winEl.querySelector(`#slicerPolyphonyToggle-${track.id}`); if (polyToggleBtn) { polyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`; polyToggleBtn.classList.toggle('active', !track.slicerIsPolyphonic); polyToggleBtn.addEventListener('click', () => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Slicer Polyphony for ${track.name} to ${!track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`); track.slicerIsPolyphonic = !track.slicerIsPolyphonic; polyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`; polyToggleBtn.classList.toggle('active', !track.slicerIsPolyphonic); if (!track.slicerIsPolyphonic) { track.setupSlicerMonoNodes(); if(track.slicerMonoPlayer && track.audioBuffer?.loaded) track.slicerMonoPlayer.buffer = track.audioBuffer; showNotification(`${track.name} slicer mode: Mono`, 2000); } else { track.disposeSlicerMonoNodes(); showNotification(`${track.name} slicer mode: Poly`, 2000); } }); }

    const sampleStatus = track.samplerAudioData?.status;
    const sliceControlsContainer = winEl.querySelector(`#sliceControlsContainer-${track.id}`);
    if (sliceControlsContainer) {
        const controlsToToggle = sliceControlsContainer.querySelectorAll('input, button, select, details');
        const disable = sampleStatus !== 'loaded';
        controlsToToggle.forEach(el => {
             if (!el.closest('.drop-zone-relink-container') && !el.classList.contains('drop-zone-relink-button')) {
                el.disabled = disable;
            }
        });
        sliceControlsContainer.style.opacity = disable ? '0.5' : '1';
    }
}

function initializeDrumSamplerSpecificControls(track, winEl) {
    if (typeof renderDrumSamplerPads === 'function') renderDrumSamplerPads(track);
    if (typeof updateDrumPadControlsUI === 'function') updateDrumPadControlsUI(track);

    const pVolK = createKnob({ label: 'Pad Vol', min:0, max:1, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadVolume(track.selectedDrumPadForEdit, val)}); const volPh = winEl.querySelector(`#drumPadVolumeSlider-${track.id}`); if(volPh) { volPh.innerHTML = ''; volPh.appendChild(pVolK.element); } track.inspectorControls.drumPadVolume = pVolK;
    const pPitK = createKnob({ label: 'Pad Pitch', min:-24, max:24, step:1, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setDrumSamplerPadPitch(track.selectedDrumPadForEdit, val)}); const pitPh = winEl.querySelector(`#drumPadPitchKnob-${track.id}`); if(pitPh) { pitPh.innerHTML = ''; pitPh.appendChild(pPitK.element); } track.inspectorControls.drumPadPitch = pPitK;
    const pEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.attack || 0.005, decimals:3, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'attack', val)}); const attPh = winEl.querySelector(`#drumPadEnvAttackSlider-${track.id}`); if(attPh) { attPh.innerHTML = ''; attPh.appendChild(pEAK.element); } track.inspectorControls.drumPadEnvAttack = pEAK;
    const pERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'release', val)}); const relPh = winEl.querySelector(`#drumPadEnvReleaseSlider-${track.id}`); if(relPh) { relPh.innerHTML = ''; relPh.appendChild(pERK.element); } track.inspectorControls.drumPadEnvRelease = pERK;
}

function initializeInstrumentSamplerSpecificControls(track, winEl) {
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-instrumentsampler`);
    const fileInputId = `fileInput-${track.id}-InstrumentSampler-null`;
    const fileInputEl = dzContainerEl?.querySelector(`#${fileInputId}`);

    if (dzContainerEl && fileInputEl) {
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        if (dzEl) utilSetupDropZoneListeners(dzEl, track.id, 'InstrumentSampler', null, window.loadSoundFromBrowserToTarget, window.loadSampleFile);
        fileInputEl.onchange = (e) => {
            console.log(`[UI] InstrumentSampler fileInputEl changed for track ${track.id}`);
            window.loadSampleFile(e, track.id, 'InstrumentSampler');
        };
         console.log(`[UI] Attached change listener to InstrumentSampler fileInput: #${fileInputId}`);

        const relinkButtonId = `relinkFileBtn-${track.id}-InstrumentSampler-null`;
        const relinkButton = dzContainerEl.querySelector(`#${relinkButtonId}`);
        if (relinkButton) {
            relinkButton.onclick = () => {
                console.log(`[UI] Relink button clicked for InstrumentSampler track ${track.id}, triggering click on #${fileInputId}`);
                fileInputEl.click();
            };
        }
    } else {
         console.warn(`[UI] InstrumentSampler dzContainerEl or fileInputEl not found for track ${track.id}. Input ID searched: #${fileInputId}`);
    }


    const iCanvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`); if(iCanvas) { track.instrumentWaveformCanvasCtx = iCanvas.getContext('2d'); if(typeof window.drawInstrumentWaveform === 'function') window.drawInstrumentWaveform(track); }

    winEl.querySelector(`#instrumentRootNote-${track.id}`)?.addEventListener('change', (e) => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set Root Note for ${track.name} to ${e.target.value}`); track.setInstrumentSamplerRootNote(e.target.value); });
    winEl.querySelector(`#instrumentLoopStart-${track.id}`)?.addEventListener('change', (e) => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set Loop Start for ${track.name} to ${e.target.value}`); track.setInstrumentSamplerLoopStart(parseFloat(e.target.value)); });
    winEl.querySelector(`#instrumentLoopEnd-${track.id}`)?.addEventListener('change', (e) => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set Loop End for ${track.name} to ${e.target.value}`); track.setInstrumentSamplerLoopEnd(parseFloat(e.target.value)); });
    winEl.querySelector(`#instrumentLoopToggle-${track.id}`)?.addEventListener('click', (e) => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Loop for ${track.name}`); track.setInstrumentSamplerLoop(!track.instrumentSamplerSettings.loop); e.target.textContent = track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF'; e.target.classList.toggle('active', track.instrumentSamplerSettings.loop);});
    const instPolyToggleBtn = winEl.querySelector(`#instrumentSamplerPolyphonyToggle-${track.id}`); if (instPolyToggleBtn) { instPolyToggleBtn.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`; instPolyToggleBtn.classList.toggle('active', !track.instrumentSamplerIsPolyphonic); instPolyToggleBtn.addEventListener('click', () => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Instrument Sampler Polyphony for ${track.name} to ${!track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`); track.instrumentSamplerIsPolyphonic = !track.instrumentSamplerIsPolyphonic; instPolyToggleBtn.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`; instPolyToggleBtn.classList.toggle('active', !track.instrumentSamplerIsPolyphonic); showNotification(`${track.name} Instrument Sampler mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'} (for live input)`, 2000); }); }

    const iEAK = createKnob({ label: 'Attack', min:0.005, max:2, step:0.001, initialValue: track.instrumentSamplerSettings.envelope.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('attack',val) }); const iAttPh = winEl.querySelector(`#instrumentEnvAttackSlider-${track.id}`); if(iAttPh) { iAttPh.innerHTML = ''; iAttPh.appendChild(iEAK.element); } track.inspectorControls.instEnvAttack = iEAK;
    const iEDK = createKnob({ label: 'Decay', min:0.01, max:2, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('decay',val) }); const iDecPh = winEl.querySelector(`#instrumentEnvDecaySlider-${track.id}`); if(iDecPh) { iDecPh.innerHTML = ''; iDecPh.appendChild(iEDK.element); } track.inspectorControls.instEnvDecay = iEDK;
    const iESK = createKnob({ label: 'Sustain', min:0, max:1, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('sustain',val) }); const iSusPh = winEl.querySelector(`#instrumentEnvSustainSlider-${track.id}`); if(iSusPh) { iSusPh.innerHTML = ''; iSusPh.appendChild(iESK.element); } track.inspectorControls.instEnvSustain = iESK;
    const iERK = createKnob({ label: 'Release', min:0.01, max:5, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.release, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('release',val) }); const iRelPh = winEl.querySelector(`#instrumentEnvReleaseSlider-${track.id}`); if(iRelPh) { iRelPh.innerHTML = ''; iRelPh.appendChild(iERK.element); } track.inspectorControls.instEnvRelease = iERK;

    const sampleStatus = track.instrumentSamplerSettings?.status;
    const controlsContainer = winEl.querySelector(`#instrumentSamplerControls-${track.id}`);
    if (controlsContainer) {
        const controlsToToggle = controlsContainer.querySelectorAll('input, button, select');
        const disable = sampleStatus !== 'loaded';
        controlsToToggle.forEach(el => {
            if (!el.closest('.drop-zone-relink-container') && !el.classList.contains('drop-zone-relink-button')) {
                el.disabled = disable;
            }
        });
        controlsContainer.style.opacity = disable ? '0.5' : '1';
    }
}


// --- Modular Effects Rack UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') { /* ... (no changes) ... */ }
function renderEffectsList(owner, ownerType, listDiv, controlsContainer) { /* ... (no changes) ... */ }
function renderEffectControls(owner, ownerType, effectId, controlsContainer) { /* ... (no changes) ... */ }
function showAddEffectModal(owner, ownerType) { /* ... (no changes) ... */ }


// --- Window Opening Functions (with Debugging) ---
function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... (no changes) ... */ }
function openMasterEffectsRackWindow(savedState = null) { /* ... (no changes) ... */ }
function openGlobalControlsWindow(savedState = null) { /* ... (no changes) ... */ }
function openSoundBrowserWindow(savedState = null) {
    console.log("[UI - openSoundBrowserWindow] Called. SavedState:", savedState);
    const windowId = 'soundBrowser';
    if (window.openWindows[windowId] && !savedState) {
        console.log("[UI - openSoundBrowserWindow] Restoring existing window.");
        window.openWindows[windowId].restore();
        if (window.currentLibraryName && typeof updateSoundBrowserDisplayForLibrary === 'function') {
            console.log("[UI - openSoundBrowserWindow] Updating display for current library:", window.currentLibraryName);
            updateSoundBrowserDisplayForLibrary(window.currentLibraryName);
        }
        return window.openWindows[windowId];
    }
    if (window.openWindows[windowId] && savedState) {
        console.log("[UI - openSoundBrowserWindow] Closing existing window before recreating from saved state.");
        window.openWindows[windowId].close();
    }

    let selectOptionsHTML = '';
    if (Constants.soundLibraries && Object.keys(Constants.soundLibraries).length > 0) {
        for (const libName in Constants.soundLibraries) {
            selectOptionsHTML += `<option value="${libName}">${libName}</option>`;
        }
    } else {
        selectOptionsHTML = '<option value="">No Libraries Configured</option>';
        console.warn("[UI - openSoundBrowserWindow] No sound libraries configured in Constants.js");
    }
    const contentHTML = `<div class="sound-browser-content p-2"><select id="soundBrowserLibrarySelect" class="w-full mb-2 p-1 border border-gray-500 rounded-sm text-xs bg-white text-black focus:ring-blue-500 focus:border-blue-500">${selectOptionsHTML}</select><div id="soundBrowserPathDisplay" class="text-xs p-1 bg-gray-200 border-b border-gray-400 mb-1">Path: /</div><div id="soundBrowserList" class="sound-browser-list h-64 overflow-y-auto border border-gray-300 p-1 bg-white">Select a library to load sounds.</div></div>`;
    const winOptions = { width: 350, height: 400, initialContentKey: 'soundBrowser' }; if (savedState) Object.assign(winOptions, savedState);

    let soundBrowserWin = null;
    try {
        soundBrowserWin = new SnugWindow(windowId, 'Sound Browser', contentHTML, winOptions);
    } catch(e) {
        console.error('[UI - openSoundBrowserWindow] CRITICAL ERROR during `new SnugWindow()` for Sound Browser:', e);
        showNotification("CRITICAL: Error creating Sound Browser window object.", 6000); return null;
    }
    if (!soundBrowserWin || !soundBrowserWin.element) {
        console.error("[UI - openSoundBrowserWindow] Failed to create Sound Browser window instance OR its element is null.");
        showNotification("Failed to create Sound Browser window.", 5000); return null;
    }

    const librarySelect = soundBrowserWin.element.querySelector('#soundBrowserLibrarySelect');
    if (librarySelect) {
        librarySelect.onchange = () => {
            const selectedLibraryName = librarySelect.value;
            console.log(`[UI - openSoundBrowserWindow] Library selected: ${selectedLibraryName}`);
            if (typeof updateSoundBrowserDisplayForLibrary === 'function') {
                updateSoundBrowserDisplayForLibrary(selectedLibraryName);
            } else {
                console.error("[UI - openSoundBrowserWindow] updateSoundBrowserDisplayForLibrary function not found.");
            }
        };
        if (Constants.soundLibraries && Object.keys(Constants.soundLibraries).length > 0) {
            const firstLibraryName = Object.keys(Constants.soundLibraries)[0];
            const currentSelectedValue = librarySelect.value;
            let targetLibrary = Array.from(librarySelect.options).find(opt => opt.value === currentSelectedValue) ? currentSelectedValue : firstLibraryName;
            if (!Array.from(librarySelect.options).find(opt => opt.value === targetLibrary) && librarySelect.options.length > 0) {
                targetLibrary = librarySelect.options[0].value;
            }
            librarySelect.value = targetLibrary;
            console.log(`[UI - openSoundBrowserWindow] Initial library target: ${targetLibrary}`);
            if (typeof updateSoundBrowserDisplayForLibrary === 'function' && targetLibrary) {
                updateSoundBrowserDisplayForLibrary(targetLibrary);
            }
        } else {
            soundBrowserWin.element.querySelector('#soundBrowserList').innerHTML = "No sound libraries configured.";
        }
    } else {
        console.error("[UI - openSoundBrowserWindow] #soundBrowserLibrarySelect element not found.");
    }
    console.log("[UI - openSoundBrowserWindow] Sound Browser window created and initialized."); return soundBrowserWin;
}
function updateSoundBrowserDisplayForLibrary(libraryName) {
    console.log(`[UI - updateSoundBrowserDisplayForLibrary] Updating for library: ${libraryName}`);
    const soundBrowserList = document.getElementById('soundBrowserList');
    const pathDisplay = document.getElementById('soundBrowserPathDisplay');
    if (!soundBrowserList || !pathDisplay ) {
        console.warn("[UI - updateSoundBrowserDisplayForLibrary] Sound Browser DOM elements missing (soundBrowserList or pathDisplay).");
        return;
    }
    window.currentLibraryName = libraryName;
    console.log(`[UI - updateSoundBrowserDisplayForLibrary] Checking window.soundLibraryFileTrees:`, window.soundLibraryFileTrees);
    console.log(`[UI - updateSoundBrowserDisplayForLibrary] Checking window.loadedZipFiles:`, window.loadedZipFiles);

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
function renderSoundBrowserDirectory(pathArray, treeNode) { /* ... (no changes) ... */ }
function openMixerWindow(savedState = null) {
    console.log(`[UI - openMixerWindow] Called. savedState:`, savedState);
    const windowId = 'mixer';
    if (window.openWindows[windowId] && !savedState) {
        console.log("[UI - openMixerWindow] Restoring existing mixer window.");
        window.openWindows[windowId].restore();
        return window.openWindows[windowId];
    }
    if (window.openWindows[windowId] && savedState) {
        console.log("[UI - openMixerWindow] Closing existing mixer before recreating from saved state.");
        window.openWindows[windowId].close();
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'mixer-window-content p-2 overflow-x-auto flex flex-row gap-2';
    const winOptions = { width: Math.max(500, Math.min(800, window.innerWidth - 60)), height: 350, initialContentKey: 'mixer' };
    if (savedState) Object.assign(winOptions, savedState);

    let mixerWin = null;
    try {
        mixerWin = new SnugWindow(windowId, 'Mixer', contentDiv, winOptions);
    } catch (e) {
        console.error('[UI - openMixerWindow] CRITICAL ERROR `new SnugWindow()` for Mixer:', e);
        showNotification("CRITICAL: Error creating Mixer window.", 6000);
        return null;
    }

    if (!mixerWin || !mixerWin.element) {
        showNotification("Failed to create Mixer window.", 5000);
        console.error("[UI - openMixerWindow] SnugWindow instance or its element is null for Mixer.");
        return null;
    }
    console.log("[UI - openMixerWindow] Mixer SnugWindow created. Calling renderMixer.");
    renderMixer(contentDiv);
    return mixerWin;
}
function updateMixerWindow() {
    console.log("[UI - updateMixerWindow] Called.");
    const mixerWin = window.openWindows ? window.openWindows['mixer'] : null;
    if (mixerWin && mixerWin.element && !mixerWin.isMinimized) {
        const mixerContentArea = mixerWin.element.querySelector('.mixer-window-content');
        if (mixerContentArea) {
            console.log("[UI - updateMixerWindow] Mixer content area found. Calling renderMixer.");
            renderMixer(mixerContentArea);
        } else {
            console.warn("[UI - updateMixerWindow] Mixer content area (.mixer-window-content) not found in mixer window element.");
        }
    } else {
        console.log("[UI - updateMixerWindow] Mixer window not open or minimized. No update performed.");
    }
}
function renderMixer(container) {
    if (!container) {
        console.error("[UI - renderMixer] Mixer container not provided for rendering.");
        return;
    }
    console.log("[UI - renderMixer] Rendering mixer content into container:", container);
    container.innerHTML = '';
    const currentTracks = typeof window.getTracks === 'function' ? window.getTracks() : [];
    console.log(`[UI - renderMixer] Number of tracks to render: ${currentTracks.length}`);

    currentTracks.forEach(track => {
        console.log(`[UI - renderMixer] Creating strip for track: ${track.id} - ${track.name}`);
        const strip = document.createElement('div'); strip.className = 'channel-strip flex flex-col items-center p-2 border border-gray-400 bg-gray-200 rounded-md min-w-[100px]'; const trackNameDiv = document.createElement('div'); trackNameDiv.className = 'track-name text-xs font-semibold mb-1 truncate w-full text-center'; trackNameDiv.title = track.name; trackNameDiv.textContent = track.name.substring(0,10) + (track.name.length > 10 ? '...' : ''); trackNameDiv.addEventListener('click', () => handleOpenTrackInspector(track.id)); strip.appendChild(trackNameDiv); const faderContainer = document.createElement('div'); faderContainer.className = 'fader-container w-full flex justify-center my-1'; faderContainer.id = `mixerVolumeSliderContainer-${track.id}`; strip.appendChild(faderContainer); const buttonsDiv = document.createElement('div'); buttonsDiv.className = 'mixer-buttons flex gap-1 mb-1 justify-center'; const muteBtn = document.createElement('button'); muteBtn.id = `mixerMuteBtn-${track.id}`; muteBtn.className = `mute-button text-xs p-1 w-6 h-6 flex items-center justify-center rounded ${track.isMuted ? 'muted' : ''}`; muteBtn.textContent = 'M'; muteBtn.addEventListener('click', () => handleTrackMute(track.id)); buttonsDiv.appendChild(muteBtn); const soloBtn = document.createElement('button'); soloBtn.id = `mixerSoloBtn-${track.id}`; const currentSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null; soloBtn.className = `solo-button text-xs p-1 w-6 h-6 flex items-center justify-center rounded ${currentSoloId === track.id ? 'soloed' : ''}`; soloBtn.textContent = 'S'; soloBtn.addEventListener('click', () => handleTrackSolo(track.id)); buttonsDiv.appendChild(soloBtn); strip.appendChild(buttonsDiv); const meterDiv = document.createElement('div'); meterDiv.id = `mixerTrackMeterContainer-${track.id}`; meterDiv.className = 'mixer-meter-container meter-bar-container w-full h-3 bg-gray-300 rounded overflow-hidden'; meterDiv.innerHTML = `<div id="mixerTrackMeterBar-${track.id}" class="meter-bar h-full bg-green-500 transition-all duration-50 ease-linear"></div>`; strip.appendChild(meterDiv); container.appendChild(strip); const volKnobContainer = strip.querySelector(`#mixerVolumeSliderContainer-${track.id}`); if(volKnobContainer) { const volKnob = createKnob({ label: '', min:0, max:1, step:0.01, initialValue: track.previousVolumeBeforeMute, decimals:2, sensitivity: 0.8, trackRef: track, onValueChange: (val, oldVal, fromInteraction) => { track.setVolume(val, fromInteraction); if (track.inspectorControls?.volume?.type === 'knob') track.inspectorControls.volume.setValue(val, false); } }); volKnobContainer.innerHTML = ''; volKnobContainer.appendChild(volKnob.element); if (!track.inspectorControls) track.inspectorControls = {}; track.inspectorControls[`mixerVolume-${track.id}`] = volKnob; } });
    const masterStrip = document.createElement('div'); masterStrip.className = 'channel-strip flex flex-col items-center p-2 border border-gray-500 bg-gray-300 rounded-md min-w-[100px]'; masterStrip.innerHTML = `<div class="track-name text-xs font-bold mb-1">Master</div><div class="fader-container w-full flex justify-center my-1" id="mixerMasterVolumeSliderContainer"></div><div id="mixerMasterMeterContainer" class="mixer-meter-container meter-bar-container w-full h-3 bg-gray-400 rounded overflow-hidden mt-auto"><div id="mixerMasterMeterBar" class="meter-bar h-full bg-green-500 transition-all duration-50 ease-linear"></div></div>`; container.appendChild(masterStrip);
    const masterVolSliderCont = masterStrip.querySelector('#mixerMasterVolumeSliderContainer'); if(masterVolSliderCont){ let currentMasterVol = 0; if (window.masterGainNode?.gain) currentMasterVol = window.masterGainNode.gain.value; else if (Tone.getDestination()?.volume) currentMasterVol = Tone.getDestination().volume.value; const masterVolKnob = createKnob({ label: '', min:0, max:1.5, step:0.01, initialValue: currentMasterVol, displaySuffix: '', decimals:2, sensitivity: 0.8, onValueChange: (val) => { if (window.masterGainNode?.gain) window.masterGainNode.gain.value = val; else if (Tone.getDestination()?.volume) Tone.getDestination().volume.value = val; } }); masterVolSliderCont.innerHTML = ''; masterVolSliderCont.appendChild(masterVolKnob.element); }
    setTimeout(() => { currentTracks.forEach(track => { track.inspectorControls[`mixerVolume-${track.id}`]?.refreshVisuals?.(); }); }, 50);
    console.log("[UI - renderMixer] Mixer rendering complete.");
}
function buildSequencerContentDOM(track, rows, rowLabels, numBars) { /* ... (no changes) ... */ }
function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... (no changes) ... */ }


// --- Utility UI functions for samplers (Updated for Audio Status) ---
function renderSamplePads(track) {
    if (!track || !track.inspectorWindow?.element) return;
    const padsContainer = track.inspectorWindow.element.querySelector(`#samplePadsContainer-${track.id}`);
    if (!padsContainer) return;
    padsContainer.innerHTML = '';

    const sampleStatus = track.samplerAudioData?.status;
    if (sampleStatus !== 'loaded') {
        let statusMessage = 'No sample loaded.';
        if (sampleStatus === 'missing') statusMessage = `Sample "${track.samplerAudioData.fileName || 'unknown'}" missing. Relink/Upload.`;
        else if (sampleStatus === 'pending') statusMessage = `Loading "${track.samplerAudioData.fileName || 'sample'}"...`;
        padsContainer.innerHTML = `<p class="text-xs text-gray-500 p-1">${statusMessage}</p>`;
        return;
    }

    if (!track.slices || track.slices.length === 0) { padsContainer.textContent = 'No slices defined. Auto-slice or load sample.'; return; }
    track.slices.forEach((slice, index) => {
        const pad = document.createElement('button'); pad.className = `pad-button ${index === track.selectedSliceForEdit ? 'selected-for-edit' : ''}`; pad.textContent = `Slice ${index + 1}`; pad.title = `Select Slice ${index + 1}. Click to preview.`; pad.dataset.trackId = track.id; pad.dataset.trackType = "Sampler"; pad.dataset.padSliceIndex = index.toString();
        pad.addEventListener('click', async () => { track.selectedSliceForEdit = index; if(typeof window.playSlicePreview === 'function') await window.playSlicePreview(track.id, index); renderSamplePads(track); updateSliceEditorUI(track); });
        padsContainer.appendChild(pad);
    });
}

function updateSliceEditorUI(track) {
    if (!track || track.type !== 'Sampler' || !track.inspectorWindow?.element) return;
    const inspectorEl = track.inspectorWindow.element;
    const sampleStatus = track.samplerAudioData?.status;
    const selectedSlice = track.slices[track.selectedSliceForEdit];

    const selectedSliceLabel = inspectorEl.querySelector(`#selectedSliceLabel-${track.id}`);
    if(selectedSliceLabel) selectedSliceLabel.textContent = (track.selectedSliceForEdit + 1).toString();

    const controlsContainer = inspectorEl.querySelector(`#sliceControlsContainer-${track.id}`);
    const disableControls = sampleStatus !== 'loaded' || !selectedSlice;

    if (controlsContainer) {
        controlsContainer.querySelectorAll('input, button, select, details').forEach(el => {
             if (!el.closest('.drop-zone-relink-container') && !el.classList.contains('drop-zone-relink-button')) el.disabled = disableControls;
        });
        controlsContainer.style.opacity = disableControls ? '0.5' : '1';
    }

    if (disableControls || !selectedSlice) {
        const startInput = inspectorEl.querySelector(`#sliceStart-${track.id}`); if(startInput) startInput.value = '0.000';
        const endInput = inspectorEl.querySelector(`#sliceEnd-${track.id}`); if(endInput) endInput.value = '0.000';
        track.inspectorControls.sliceVolume?.setValue(0.7, false);
        track.inspectorControls.slicePitch?.setValue(0, false);
        track.inspectorControls.sliceEnvAttack?.setValue(0.01,false);
        track.inspectorControls.sliceEnvDecay?.setValue(0.1,false);
        track.inspectorControls.sliceEnvSustain?.setValue(1.0,false);
        track.inspectorControls.sliceEnvRelease?.setValue(0.1,false);
        const loopToggle = inspectorEl.querySelector(`#sliceLoopToggle-${track.id}`); if (loopToggle) { loopToggle.textContent = 'Loop: OFF'; loopToggle.classList.remove('active'); }
        const reverseToggle = inspectorEl.querySelector(`#sliceReverseToggle-${track.id}`); if (reverseToggle) { reverseToggle.textContent = 'Rev: OFF'; reverseToggle.classList.remove('active'); }
        return;
    }

    const startInput = inspectorEl.querySelector(`#sliceStart-${track.id}`); if (startInput) startInput.value = selectedSlice.offset.toFixed(3);
    const endInput = inspectorEl.querySelector(`#sliceEnd-${track.id}`); if (endInput) endInput.value = (selectedSlice.offset + selectedSlice.duration).toFixed(3);
    track.inspectorControls.sliceVolume?.setValue(selectedSlice.volume, false); track.inspectorControls.slicePitch?.setValue(selectedSlice.pitchShift, false); track.inspectorControls.sliceEnvAttack?.setValue(selectedSlice.envelope.attack, false); track.inspectorControls.sliceEnvDecay?.setValue(selectedSlice.envelope.decay, false); track.inspectorControls.sliceEnvSustain?.setValue(selectedSlice.envelope.sustain, false); track.inspectorControls.sliceEnvRelease?.setValue(selectedSlice.envelope.release, false);
    const loopToggle = inspectorEl.querySelector(`#sliceLoopToggle-${track.id}`); if (loopToggle) { loopToggle.textContent = selectedSlice.loop ? 'Loop: ON' : 'Loop: OFF'; loopToggle.classList.toggle('active', selectedSlice.loop); }
    const reverseToggle = inspectorEl.querySelector(`#sliceReverseToggle-${track.id}`); if (reverseToggle) { reverseToggle.textContent = selectedSlice.reverse ? 'Rev: ON' : 'Rev: OFF'; reverseToggle.classList.toggle('active', selectedSlice.reverse); }
}

function applySliceEdits(trackId) {
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null; if (!track || track.type !== 'Sampler' || !track.inspectorWindow?.element) return;
    if (track.samplerAudioData?.status !== 'loaded' || !track.audioBuffer) {
        showNotification("Cannot apply slice edits: Sample not loaded.", 2000);
        return;
    }
    const inspectorEl = track.inspectorWindow.element; const slice = track.slices[track.selectedSliceForEdit]; if (!slice) return;
    const newStart = parseFloat(inspectorEl.querySelector(`#sliceStart-${track.id}`)?.value); const newEnd = parseFloat(inspectorEl.querySelector(`#sliceEnd-${track.id}`)?.value);
    if (!isNaN(newStart) && !isNaN(newEnd) && newEnd > newStart && track.audioBuffer) { slice.offset = Math.max(0, Math.min(newStart, track.audioBuffer.duration)); slice.duration = Math.max(0.001, Math.min(newEnd - slice.offset, track.audioBuffer.duration - slice.offset)); slice.userDefined = true; if(typeof window.drawWaveform === 'function') window.drawWaveform(track); showNotification(`Slice ${track.selectedSliceForEdit + 1} updated.`, 1500); } else { showNotification("Invalid slice start/end times.", 2000); updateSliceEditorUI(track); }
}

function drawWaveform(track) {
    if (!track || (track.type !== 'Sampler' && track.type !== 'InstrumentSampler') ) return;
    const isSamplerTrack = track.type === 'Sampler';
    const audioDataSource = isSamplerTrack ? track.samplerAudioData : track.instrumentSamplerSettings;
    const audioBufferToDraw = isSamplerTrack ? track.audioBuffer : track.instrumentSamplerSettings.audioBuffer;
    const ctx = isSamplerTrack ? track.waveformCanvasCtx : track.instrumentWaveformCanvasCtx;

    if (!ctx) return;
    const canvas = ctx.canvas; const width = canvas.width; const height = canvas.height;
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#e0e0e0'; ctx.fillRect(0, 0, width, height);

    let statusMessage = '';
    if (audioDataSource?.status === 'missing') statusMessage = `File: ${audioDataSource.fileName || 'Unknown'} MISSING`;
    else if (audioDataSource?.status === 'pending') statusMessage = `Loading: ${audioDataSource.fileName || 'sample'}...`;
    else if (audioDataSource?.status === 'empty' || !audioBufferToDraw || !audioBufferToDraw.loaded) statusMessage = isSamplerTrack ? 'No Sample Loaded' : 'No Instrument Sample';

    if (statusMessage) {
        ctx.fillStyle = '#888'; ctx.textAlign = 'center'; ctx.font = '10px Inter';
        ctx.fillText(statusMessage, width / 2, height / 2);
        return;
    }

    const channelData = audioBufferToDraw.getChannelData(0);
    ctx.lineWidth = 1; ctx.strokeStyle = '#333'; ctx.beginPath();
    const sliceWidth = width / channelData.length;
    for (let i = 0; i < channelData.length; i++) {
        const x = i * sliceWidth; const y = (0.5 + channelData[i] * 0.5) * height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();

    if (track.type === 'Sampler') {
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; ctx.lineWidth = 1;
        track.slices.forEach((slice, index) => {
            if (slice.duration > 0) {
                const startX = (slice.offset / audioBufferToDraw.duration) * width;
                const endX = ((slice.offset + slice.duration) / audioBufferToDraw.duration) * width;
                ctx.beginPath(); ctx.moveTo(startX, 0); ctx.lineTo(startX, height); ctx.stroke();
                if (index === track.selectedSliceForEdit) {
                    ctx.fillStyle = 'rgba(0, 0, 255, 0.2)'; ctx.fillRect(startX, 0, endX - startX, height);
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
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)'; ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, height);
    }
}
function drawInstrumentWaveform(track) { drawWaveform(track); }

function updateDrumPadControlsUI(track) {
    if (!track || track.type !== 'DrumSampler' || !track.inspectorWindow?.element) return;
    const inspectorEl = track.inspectorWindow.element;
    const selectedPadData = track.drumSamplerPads[track.selectedDrumPadForEdit];
    if (!selectedPadData) return;

    const loadContainer = inspectorEl.querySelector(`#drumPadLoadContainer-${track.id}`);
    const padIndex = track.selectedDrumPadForEdit;
    if (loadContainer) {
        loadContainer.innerHTML = createDropZoneHTML(track.id, 'DrumSampler', padIndex, selectedPadData);
        const fileInputId = `fileInput-${track.id}-DrumSampler-${padIndex}`;
        const fileInputEl = loadContainer.querySelector(`#${fileInputId}`);
        const dropZoneEl = loadContainer.querySelector(`#dropZone-${track.id}-drumsampler-${padIndex}`); // This ID is from createDropZoneHTML
        const relinkButtonId = `relinkFileBtn-${track.id}-DrumSampler-${padIndex}`;
        const relinkButton = loadContainer.querySelector(`#${relinkButtonId}`);

        if (fileInputEl) {
            console.log(`[UI - updateDrumPadControlsUI] Setting up fileInputEl for pad ${padIndex}:`, fileInputEl);
            fileInputEl.onchange = (e) => { // Use onchange to avoid multiple listeners if this func is called repeatedly
                console.log(`[UI - updateDrumPadControlsUI] File input changed for pad ${padIndex}`);
                window.loadDrumSamplerPadFile(e, track.id, padIndex);
            };
        } else {
            console.warn(`[UI - updateDrumPadControlsUI] fileInputEl NOT found for pad ${padIndex} with ID ${fileInputId}`);
        }

        if (dropZoneEl && typeof utilSetupDropZoneListeners === 'function') {
            utilSetupDropZoneListeners(dropZoneEl, track.id, "DrumSampler", padIndex, window.loadSoundFromBrowserToTarget, window.loadDrumSamplerPadFile);
        }
        if (relinkButton && fileInputEl) {
            relinkButton.onclick = () => {
                console.log(`[UI - updateDrumPadControlsUI] Relink button clicked for pad ${padIndex}, triggering click on #${fileInputId}`);
                fileInputEl.click();
            };
        } else if (relinkButton && !fileInputEl) {
            console.warn(`[UI - updateDrumPadControlsUI] Relink button found for pad ${padIndex}, but fileInputEl (ID: ${fileInputId}) was NOT found!`);
        }
    }

    track.inspectorControls.drumPadVolume?.setValue(selectedPadData.volume, false);
    track.inspectorControls.drumPadPitch?.setValue(selectedPadData.pitchShift, false);
    track.inspectorControls.drumPadEnvAttack?.setValue(selectedPadData.envelope.attack, false);
    track.inspectorControls.drumPadEnvRelease?.setValue(selectedPadData.envelope.release, false);

    const controlsContainer = inspectorEl.querySelector(`#drumPadControlsContainer-${track.id}`);
    const padSpecificControls = controlsContainer?.querySelectorAll('input, button, select, details');
    const disable = selectedPadData.status !== 'loaded';
    if (padSpecificControls) {
        padSpecificControls.forEach(el => {
            if (!el.closest('.drop-zone-relink-container') && !el.classList.contains('drop-zone-relink-button') && el.id !== `drumPadLoadContainer-${track.id}`) {
                 el.disabled = disable;
            }
        });
        if (controlsContainer) controlsContainer.style.opacity = disable ? '0.5' : '1';
    }
}

function renderDrumSamplerPads(track) {
    if (!track || track.type !== 'DrumSampler' || !track.inspectorWindow?.element) return;
    const padsContainer = track.inspectorWindow.element.querySelector(`#drumSamplerPadsContainer-${track.id}`); if (!padsContainer) return;
    padsContainer.innerHTML = ''; if (!track.drumSamplerPads || track.drumSamplerPads.length === 0) { padsContainer.textContent = 'No pads.'; return; }

    track.drumSamplerPads.forEach((padData, index) => {
        const padEl = document.createElement('button');
        padEl.className = `pad-button ${index === track.selectedDrumPadForEdit ? 'selected-for-edit' : ''} drop-zone-pad`;

        let fileNameDisplay = padData.originalFileName ? padData.originalFileName.substring(0, 10) + (padData.originalFileName.length > 10 ? '...' : '') : 'Empty';
        let titleInfo = `Sample: ${padData.originalFileName || 'Empty'}`;
        padEl.style.borderColor = '';

        if (padData.status === 'missing') {
            fileNameDisplay = `MISSING!`;
            padEl.style.borderColor = 'red';
            titleInfo = `MISSING: ${padData.originalFileName || 'Unknown'}. Click to re-link or drag file here.`;
        } else if (padData.status === 'pending') {
            fileNameDisplay = `Loading...`;
            titleInfo = `Loading: ${padData.originalFileName}`;
        } else if (padData.status === 'empty') {
             titleInfo = 'Empty. Click to load or drag file here.';
        }

        padEl.innerHTML = `Pad ${index + 1} <span class="pad-label block truncate" style="max-width: 60px;" title="${padData.originalFileName || 'Empty'}">${fileNameDisplay}</span>`;
        padEl.title = `Select Pad ${index + 1}. ${titleInfo}`;
        padEl.dataset.trackId = track.id.toString(); padEl.dataset.trackType = "DrumSampler"; padEl.dataset.padSliceIndex = index.toString();

        padEl.addEventListener('click', async () => {
            track.selectedDrumPadForEdit = index;
            if (padData.status === 'loaded' && typeof window.playDrumSamplerPadPreview === 'function') {
                await window.playDrumSamplerPadPreview(track.id, index);
            } else if (padData.status === 'missing' || padData.status === 'empty') {
                // updateDrumPadControlsUI will be called, making the correct relink button primary
                console.log(`[UI] Clicked on ${padData.status} pad ${index}. Controls will update.`);
            }
            renderDrumSamplerPads(track);
            updateDrumPadControlsUI(track);
        });
        if (typeof utilSetupDropZoneListeners === 'function') utilSetupDropZoneListeners(padEl, track.id, "DrumSampler", index, window.loadSoundFromBrowserToTarget, window.loadDrumSamplerPadFile);
        padsContainer.appendChild(padEl);
    });
}

function highlightPlayingStep(col, trackType, gridElement) {
    if (!gridElement) return; const lastPlayingCol = gridElement._lastPlayingCol;
    if (lastPlayingCol !== undefined && lastPlayingCol !== col) { const prevCells = gridElement.querySelectorAll(`.sequencer-step-cell[data-col="${lastPlayingCol}"]`); prevCells.forEach(cell => cell.classList.remove('playing')); }
    if (lastPlayingCol !== col) { const currentCells = gridElement.querySelectorAll(`.sequencer-step-cell[data-col="${col}"]`); currentCells.forEach(cell => cell.classList.add('playing')); }
    gridElement._lastPlayingCol = col;
}

export {
    createKnob,
    buildTrackInspectorContentDOM,
    openTrackInspectorWindow,
    initializeCommonInspectorControls,
    initializeTypeSpecificInspectorControls,
    // Internal building blocks, not typically exported unless specifically needed by another module
    // buildSynthSpecificInspectorDOM,
    // buildSamplerSpecificInspectorDOM,
    // buildDrumSamplerSpecificInspectorDOM,
    // buildInstrumentSamplerSpecificInspectorDOM,
    // initializeSynthSpecificControls,
    // initializeSamplerSpecificControls,
    // initializeDrumSamplerSpecificControls,
    // initializeInstrumentSamplerSpecificControls,

    // Effect Rack UI (mostly internal to its window, but renderEffectsList might be useful if rack is refreshed externally)
    // buildModularEffectsRackDOM, // Called by open...Window
    renderEffectsList,
    renderEffectControls,
    // showAddEffectModal, // Called internally

    // Main Window Openers
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

    // Sampler/Pad UI Updaters & Utilities
    renderSamplePads,
    updateSliceEditorUI,
    applySliceEdits,
    drawWaveform,
    drawInstrumentWaveform, // Alias for drawWaveform
    updateDrumPadControlsUI,
    renderDrumSamplerPads,

    highlightPlayingStep
};
