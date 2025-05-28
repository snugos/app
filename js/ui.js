// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Modular Effects Version 4');

import { SnugWindow } from './SnugWindow.js';
import { showNotification, createDropZoneHTML, setupDropZoneListeners as utilSetupDropZoneListeners, showCustomModal } from './utils.js';
import * as Constants from './constants.js';
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
} from './eventHandlers.js';
import { AVAILABLE_EFFECTS, getEffectParamDefinitions } from './effectsRegistry.js';

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

export function buildTrackInspectorContentDOM(track) {
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
            selectEl.addEventListener('change', (e) => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set ${track.name} ${controlDef.label} to ${e.target.value}`); track.setSynthParam(controlDef.paramPath, e.target.value); });
            selectContainer.appendChild(selectEl); controlGroup.appendChild(selectContainer);
        } else if (controlDef.type === 'knob') {
            const knob = createKnob({ label: controlDef.label, min: controlDef.min, max: controlDef.max, step: controlDef.step, initialValue: initialValue, decimals: controlDef.decimals, displaySuffix: controlDef.displaySuffix, trackRef: track, onValueChange: (val) => track.setSynthParam(controlDef.paramPath, val) });
            controlGroup.appendChild(knob.element); if (!track.inspectorControls) track.inspectorControls = {}; track.inspectorControls[controlDef.idPrefix] = knob;
        }
    });
    container.appendChild(controlGroup);
}
function buildSamplerSpecificInspectorDOM(track) {
    const panel = document.createElement('div'); panel.className = 'panel sampler-panel';
    const dzContainer = document.createElement('div'); dzContainer.id = `dropZoneContainer-${track.id}-sampler`; dzContainer.innerHTML = createDropZoneHTML(track.id, `fileInput-${track.id}`, 'Sampler', null); panel.appendChild(dzContainer);
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
    editorPanel.appendChild(rightSide); panel.appendChild(editorPanel); return panel;
}
function buildDrumSamplerSpecificInspectorDOM(track) {
    const panel = document.createElement('div'); panel.className = 'panel drum-sampler-panel';
    const title = document.createElement('h4'); title.className = 'text-sm font-semibold mb-1'; title.innerHTML = `Sampler Pads (Selected: <span id="selectedDrumPadLabel-${track.id}">${track.selectedDrumPadForEdit + 1}</span>)`; panel.appendChild(title);
    const padsContainer = document.createElement('div'); padsContainer.id = `drumSamplerPadsContainer-${track.id}`; padsContainer.className = 'pads-container mb-2'; panel.appendChild(padsContainer);
    const controlsContainer = document.createElement('div'); controlsContainer.id = `drumPadControlsContainer-${track.id}`; controlsContainer.className = 'border-t pt-2';
    const loadContainer = document.createElement('div'); loadContainer.id = `drumPadLoadContainer-${track.id}`; loadContainer.className = 'mb-2'; controlsContainer.appendChild(loadContainer);
    const volPitchGroup = document.createElement('div'); volPitchGroup.className = 'control-group'; const volPlaceholder = document.createElement('div'); volPlaceholder.id = `drumPadVolumeSlider-${track.id}`; volPitchGroup.appendChild(volPlaceholder); const pitchPlaceholder = document.createElement('div'); pitchPlaceholder.id = `drumPadPitchKnob-${track.id}`; volPitchGroup.appendChild(pitchPlaceholder); controlsContainer.appendChild(volPitchGroup);
    const details = document.createElement('details'); details.className = 'mt-1'; const summary = document.createElement('summary'); summary.className = 'text-xs font-semibold'; summary.textContent = 'Pad Envelope (AR)'; details.appendChild(summary); const padEnvGroup = document.createElement('div'); padEnvGroup.className = 'control-group'; ['drumPadEnvAttackSlider', 'drumPadEnvReleaseSlider'].forEach(id => { const knobPlaceholder = document.createElement('div'); knobPlaceholder.id = `${id}-${track.id}`; padEnvGroup.appendChild(knobPlaceholder); }); details.appendChild(padEnvGroup); controlsContainer.appendChild(details);
    panel.appendChild(controlsContainer); return panel;
}
function buildInstrumentSamplerSpecificInspectorDOM(track) {
    const panel = document.createElement('div'); panel.className = 'panel instrument-sampler-panel';
    const dropZoneContainer = document.createElement('div'); dropZoneContainer.id = `dropZoneContainer-${track.id}-instrumentsampler`; dropZoneContainer.innerHTML = createDropZoneHTML(track.id, `instrumentFileInput-${track.id}`, 'InstrumentSampler', null); panel.appendChild(dropZoneContainer);
    const canvas = document.createElement('canvas'); canvas.id = `instrumentWaveformCanvas-${track.id}`; canvas.className = 'waveform-canvas w-full mb-1'; canvas.width = 380; canvas.height = 70; panel.appendChild(canvas);
    const controlsContainer = document.createElement('div'); const rootLoopGroup = document.createElement('div'); rootLoopGroup.className = 'control-group mb-2 items-center';
    const rootNoteDiv = document.createElement('div'); rootNoteDiv.innerHTML = `<label class="knob-label text-xs">Root Note</label><input type="text" id="instrumentRootNote-${track.id}" value="${track.instrumentSamplerSettings.rootNote}" class="bg-white text-black w-12 p-0.5 text-xs text-center border">`; rootLoopGroup.appendChild(rootNoteDiv);
    const loopToggleDiv = document.createElement('div'); loopToggleDiv.innerHTML = `<label class="knob-label text-xs">Loop</label><button id="instrumentLoopToggle-${track.id}" class="slice-toggle-button text-xs p-1">${track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF'}</button>`; rootLoopGroup.appendChild(loopToggleDiv);
    const loopStartDiv = document.createElement('div'); loopStartDiv.innerHTML = `<label class="knob-label text-xs">Start</label><input type="number" id="instrumentLoopStart-${track.id}" value="${track.instrumentSamplerSettings.loopStart.toFixed(3)}" step="0.001" class="bg-white text-black w-16 p-0.5 text-xs text-center border">`; rootLoopGroup.appendChild(loopStartDiv);
    const loopEndDiv = document.createElement('div'); loopEndDiv.innerHTML = `<label class="knob-label text-xs">End</label><input type="number" id="instrumentLoopEnd-${track.id}" value="${track.instrumentSamplerSettings.loopEnd.toFixed(3)}" step="0.001" class="bg-white text-black w-16 p-0.5 text-xs text-center border">`; rootLoopGroup.appendChild(loopEndDiv); controlsContainer.appendChild(rootLoopGroup);
    const polyBtn = document.createElement('button'); polyBtn.id = `instrumentSamplerPolyphonyToggle-${track.id}`; polyBtn.className = 'slice-toggle-button text-xs p-1 mb-2 w-full'; polyBtn.textContent = 'Mode: Poly'; controlsContainer.appendChild(polyBtn);
    const envTitle = document.createElement('h4'); envTitle.className = 'text-sm font-semibold'; envTitle.textContent = 'Envelope (ADSR)'; controlsContainer.appendChild(envTitle);
    const envGroup = document.createElement('div'); envGroup.className = 'control-group'; ['instrumentEnvAttackSlider', 'instrumentEnvDecaySlider', 'instrumentEnvSustainSlider', 'instrumentEnvReleaseSlider'].forEach(id => { const knobPlaceholder = document.createElement('div'); knobPlaceholder.id = `${id}-${track.id}`; envGroup.appendChild(knobPlaceholder); }); controlsContainer.appendChild(envGroup);
    panel.appendChild(controlsContainer); return panel;
}
export function initializeCommonInspectorControls(track, winEl) {
    winEl.querySelector(`#trackNameDisplay-${track.id}`)?.addEventListener('change', (e) => { const oldName = track.name; const newName = e.target.value; if (oldName !== newName && typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Rename Track "${oldName}" to "${newName}"`); track.name = newName; if (track.inspectorWindow?.titleBar) track.inspectorWindow.titleBar.querySelector('span').textContent = `Track: ${track.name}`; if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow(); });
    const volSliderContainer = winEl.querySelector(`#volumeSliderContainer-${track.id}`); if (volSliderContainer) { const volKnob = createKnob({ label: 'Volume', min: 0, max: 1, step: 0.01, initialValue: track.previousVolumeBeforeMute, decimals: 2, sensitivity: 0.8, trackRef: track, onValueChange: (val, oldVal, fromInteraction) => { track.setVolume(val, fromInteraction); if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow(); } }); volSliderContainer.innerHTML = ''; volSliderContainer.appendChild(volKnob.element); track.inspectorControls.volume = volKnob; }
    const seqLenBarsInput = winEl.querySelector(`#sequenceLengthBars-${track.id}`); const seqLenDisplaySpan = winEl.querySelector(`#sequenceLengthDisplay-${track.id}`); if(seqLenBarsInput && seqLenDisplaySpan) { seqLenBarsInput.addEventListener('change', (e) => { let numBars = parseInt(e.target.value); if(isNaN(numBars) || numBars < 1) numBars = 1; if(numBars > 256) numBars = 256; e.target.value = numBars; const numSteps = numBars * Constants.STEPS_PER_BAR; if (track.sequenceLength !== numSteps) { track.setSequenceLength(numSteps, false); seqLenDisplaySpan.textContent = `${numBars} bars (${numSteps} steps)`; } }); }
}
export function initializeTypeSpecificInspectorControls(track, winEl) { if (track.type === 'Synth') initializeSynthSpecificControls(track, winEl); else if (track.type === 'Sampler') initializeSamplerSpecificControls(track, winEl); else if (track.type === 'DrumSampler') initializeDrumSamplerSpecificControls(track, winEl); else if (track.type === 'InstrumentSampler') initializeInstrumentSamplerSpecificControls(track, winEl); }
function initializeSynthSpecificControls(track, winEl) { const c = winEl.querySelector(`#synthEngineControls-${track.id}`); if (c) { setTimeout(() => { (synthEngineControlDefinitions['MonoSynth']||[]).forEach(def => { if (def.type === 'knob' && track.inspectorControls?.[def.idPrefix]) track.inspectorControls[def.idPrefix].refreshVisuals(); }); }, 50); } }
function initializeSamplerSpecificControls(track, winEl) { /* ... same as before ... */ }
function initializeDrumSamplerSpecificControls(track, winEl) { /* ... same as before ... */ }
function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... same as before ... */ }

// --- MODULAR EFFECTS RACK UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') {
    console.log(`[UI] buildModularEffectsRackDOM for ${ownerType}, owner:`, owner);
    const rackContainer = document.createElement('div'); rackContainer.className = 'modular-effects-rack p-2 space-y-2 bg-gray-50 h-full flex flex-col';
    const header = document.createElement('div'); header.className = 'flex justify-between items-center mb-2 flex-shrink-0';
    const title = document.createElement('h3'); title.className = 'text-lg font-semibold text-gray-700'; title.textContent = ownerType === 'track' ? `Effects: ${owner.name}` : 'Master Effects'; header.appendChild(title);
    const addEffectButton = document.createElement('button'); addEffectButton.className = 'bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded text-xs shadow-sm'; addEffectButton.textContent = '+ Add Effect'; addEffectButton.onclick = () => showAddEffectModal(owner, ownerType); header.appendChild(addEffectButton); rackContainer.appendChild(header);
    const effectsListDiv = document.createElement('div'); effectsListDiv.id = `${ownerType}-${owner?.id || 'master'}-effects-list`; effectsListDiv.className = 'effects-list-container space-y-1 min-h-[100px] border p-1.5 bg-gray-100 rounded shadow-inner overflow-y-auto flex-grow'; rackContainer.appendChild(effectsListDiv);
    const effectControlsContainer = document.createElement('div'); effectControlsContainer.id = `${ownerType}-${owner?.id || 'master'}-effect-controls`; effectControlsContainer.className = 'effect-controls-panel mt-2 border-t border-gray-300 pt-2 min-h-[150px] overflow-y-auto flex-shrink-0 max-h-[40%]'; rackContainer.appendChild(effectControlsContainer);
    renderEffectsList(owner, ownerType, effectsListDiv, effectControlsContainer);
    return rackContainer;
}

function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    listDiv.innerHTML = ''; controlsContainer.innerHTML = '';
    const effectsArray = ownerType === 'track' ? owner.activeEffects : (window.masterEffectsChain || []);
    if (!effectsArray || effectsArray.length === 0) { listDiv.innerHTML = '<p class="text-xs text-gray-500 p-2">No effects added.</p>'; return; }

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

        let newVisualIndex; // Where it visually appears to be dropped
        if (targetElement && targetElement.dataset.index && targetElement !== listDiv.querySelector(`[data-effect-id="${droppedEffectId}"]`)) { // Ensure not dropping on itself
            const targetVisualIndex = parseInt(targetElement.dataset.index);
            const rect = targetElement.getBoundingClientRect();
            const isDropInUpperHalf = e.clientY < rect.top + rect.height / 2;
            newVisualIndex = isDropInUpperHalf ? targetVisualIndex : targetVisualIndex + 1;
        } else { // Dropping in empty area or on itself (treat as end or no change)
            // Determine if dropping at the very start of the list (above all items)
            if (effectsCurrentArray.length > 0 && listDiv.firstChild && e.clientY < listDiv.firstChild.getBoundingClientRect().top + listDiv.firstChild.getBoundingClientRect().height / 2) {
                newVisualIndex = 0;
            } else {
                newVisualIndex = effectsCurrentArray.length; // Default to end
            }
        }
        
        // Calculate the actual index for splice.
        // If the item is moved downwards, its target index in the modified array (after removal) is one less.
        let finalSpliceIndex = newVisualIndex;
        if (oldEffectIndex < newVisualIndex) {
            finalSpliceIndex = newVisualIndex - 1;
        }
        // Clamp to valid array indices for insertion (0 to length-1 if array is not empty)
        finalSpliceIndex = Math.max(0, Math.min(finalSpliceIndex, effectsCurrentArray.length > 0 ? effectsCurrentArray.length -1 : 0));

        console.log(`[UI Drop] Dropped ID: ${droppedEffectId} (old index ${oldEffectIndex}). Target Element: ${targetElement?.dataset.effectId}. Visual Drop Index: ${newVisualIndex}. Final Splice Index: ${finalSpliceIndex}`);

        if (oldEffectIndex !== finalSpliceIndex || (oldEffectIndex === finalSpliceIndex && newVisualIndex === effectsCurrentArray.length && oldEffectIndex === effectsCurrentArray.length -1) ) { // Only reorder if the index actually changes OR it's the specific case of dragging last to last
            if (ownerType === 'track') owner.reorderEffect(droppedEffectId, finalSpliceIndex);
            else window.reorderMasterEffect(droppedEffectId, finalSpliceIndex);
        }
        
        const currentControlsContainer = document.getElementById(`${ownerType}-${owner?.id || 'master'}-effect-controls`);
        renderEffectsList(owner, ownerType, listDiv, currentControlsContainer);
    });
}

function renderEffectControls(owner, ownerType, effectId, controlsContainer) {
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
export function openTrackEffectsRackWindow(trackId, savedState = null) {
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null; if (!track) return null;
    const windowId = `effectsRack-${track.id}`;
    if (window.openWindows[windowId] && !savedState) { window.openWindows[windowId].restore(); return window.openWindows[windowId]; }
    if (window.openWindows[windowId] && savedState) window.openWindows[windowId].close();
    const effectsRackContentElement = buildModularEffectsRackDOM(track, 'track');
    const winOptions = { width: 450, height: 550, initialContentKey: `effectsRack-${track.id}` }; if (savedState) Object.assign(winOptions, savedState);
    const effectsWin = new SnugWindow(windowId, `Effects: ${track.name}`, effectsRackContentElement, winOptions);
    if (!effectsWin || !effectsWin.element) { showNotification("Failed to create Track Effects Rack.", 5000); return null; }
    track.effectsRackWindow = effectsWin; return effectsWin;
}
export function openMasterEffectsRackWindow(savedState = null) {
    console.log("[UI] openMasterEffectsRackWindow called. SavedState:", savedState);
    const windowId = 'masterEffectsRack';
    if (window.openWindows[windowId] && !savedState) { window.openWindows[windowId].restore(); return window.openWindows[windowId]; }
    if (window.openWindows[windowId] && savedState) window.openWindows[windowId].close();
    const masterEffectsContentElement = buildModularEffectsRackDOM(null, 'master');
    console.log("[UI] Master Effects Rack DOM built:", masterEffectsContentElement ? "Success" : "Failed");
    if (!masterEffectsContentElement) { showNotification("Failed to build Master Effects Rack content.", 5000); return null; }
    const winOptions = { width: 450, height: 550, initialContentKey: 'masterEffectsRack' }; if (savedState) Object.assign(winOptions, savedState);
    const masterEffectsWin = new SnugWindow(windowId, 'Master Effects Rack', masterEffectsContentElement, winOptions);
    if (!masterEffectsWin || !masterEffectsWin.element) { showNotification("Failed to create Master Effects Rack window object.", 5000); console.error("[UI] Failed to create SnugWindow for Master Effects Rack."); return null; }
    console.log("[UI] Master Effects Rack Window created and should be visible:", masterEffectsWin);
    return masterEffectsWin;
}

export function openGlobalControlsWindow(savedState = null) {
    console.log("[ui.js] openGlobalControlsWindow STARTING...");
    const windowId = 'globalControls';
    if (typeof SnugWindow !== 'function') { console.error("[ui.js] SnugWindow is NOT a function!"); return null; }
    if (window.openWindows && window.openWindows[windowId] && !savedState) { window.openWindows[windowId].restore(); return window.openWindows[windowId]; }
    const contentDiv = document.createElement('div'); contentDiv.className = 'global-controls-window p-2 space-y-3';
    try {
        let tempoValue = 120.0; if (typeof Tone !== 'undefined' && Tone.Transport) tempoValue = Tone.Transport.bpm.value.toFixed(1);
        contentDiv.innerHTML = `<div class="flex items-center gap-2"><button id="playBtnGlobal" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-3 rounded-sm shadow">Play</button><button id="recordBtnGlobal" class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-sm shadow">Record</button></div><div class="flex items-center gap-2"><label for="tempoGlobalInput" class="control-label text-xs">Tempo:</label><input type="number" id="tempoGlobalInput" value="${tempoValue}" min="40" max="240" step="0.1" class="bg-white text-black w-16 p-1 rounded-sm text-center text-xs border border-gray-500"><span class="text-xs"> BPM</span></div><div class="flex items-center gap-2 mt-2"><label for="midiInputSelectGlobal" class="text-xs">MIDI In:</label><select id="midiInputSelectGlobal" class="bg-white text-black p-1 rounded-sm text-xs border border-gray-500 flex-grow"></select><span id="midiIndicatorGlobal" title="MIDI Activity" class="border border-black w-3 h-3 inline-block rounded-full bg-gray-400"></span><span id="keyboardIndicatorGlobal" title="Keyboard Input Activity" class="border border-black w-3 h-3 inline-block rounded-full bg-gray-400"></span></div><div id="masterMeterContainerGlobal" class="meter-bar-container mt-2" title="Master Output Level" style="height:15px;"><div id="masterMeterBarGlobal" class="meter-bar" style="width: 0%;"></div></div>`;
    } catch (e) { console.error("[ui.js] Error setting innerHTML for globalControls:", e); showNotification("Error creating global controls.", 5000); return null; }
    const winOptions = { width: 280, height: 250, x: 20, y: 20, initialContentKey: 'globalControls' }; if (savedState) Object.assign(winOptions, savedState);
    let globalControlsWin = null; try { globalControlsWin = new SnugWindow(windowId, 'Global Controls', contentDiv, winOptions); } catch (e) { console.error('[ui.js] CRITICAL ERROR `new SnugWindow()` for globalControls:', e); showNotification("CRITICAL: Error creating window object.", 6000); return null; }
    if (!globalControlsWin || !globalControlsWin.element) { console.error("[ui.js] CRITICAL CHECK FAILED: globalControlsWin or element is falsy."); showNotification("Failed to create Global Controls window.", 5000); return null; }
    window.playBtn = globalControlsWin.element.querySelector('#playBtnGlobal'); window.recordBtn = globalControlsWin.element.querySelector('#recordBtnGlobal'); window.tempoInput = globalControlsWin.element.querySelector('#tempoGlobalInput'); window.masterMeterBar = globalControlsWin.element.querySelector('#masterMeterBarGlobal'); window.midiInputSelectGlobal = globalControlsWin.element.querySelector('#midiInputSelectGlobal'); window.midiIndicatorGlobalEl = globalControlsWin.element.querySelector('#midiIndicatorGlobal'); window.keyboardIndicatorGlobalEl = globalControlsWin.element.querySelector('#keyboardIndicatorGlobal');
    if (typeof window.attachGlobalControlEvents === 'function' && globalControlsWin.element) window.attachGlobalControlEvents(globalControlsWin.element); else console.warn("attachGlobalControlEvents not found or window element missing.");
    return globalControlsWin;
}
export function openTrackInspectorWindow(trackId, savedState = null) {
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null; if (!track) { showNotification(`Track ID ${trackId} not found.`, 3000); return null; }
    const inspectorId = `trackInspector-${track.id}`;
    if (window.openWindows[inspectorId] && !savedState) { window.openWindows[inspectorId].restore(); return window.openWindows[inspectorId]; }
    if (window.openWindows[inspectorId] && savedState) window.openWindows[inspectorId].close();
    track.inspectorControls = {}; const inspectorContentElement = buildTrackInspectorContentDOM(track); if (!inspectorContentElement) { showNotification(`Failed to build Inspector content (Track ${track.id}).`, 4000); return null; }
    let windowHeight = 450; if (track.type === 'Synth') windowHeight = 620; else if (track.type === 'Sampler') windowHeight = 620; else if (track.type === 'DrumSampler') windowHeight = 580; else if (track.type === 'InstrumentSampler') windowHeight = 620;
    const winOptions = { width: Math.min(500, window.innerWidth - 40), height: Math.min(windowHeight, window.innerHeight - 80), initialContentKey: `trackInspector-${track.id}` }; if (savedState) Object.assign(winOptions, savedState);
    let inspectorWin = null; try { inspectorWin = new SnugWindow(inspectorId, `Track: ${track.name}`, inspectorContentElement, winOptions); } catch (e) { console.error(`CRITICAL ERROR \`new SnugWindow()\` for inspector ${inspectorId}:`, e); showNotification("CRITICAL: Error creating inspector window.", 6000); return null; }
    if (!inspectorWin || !inspectorWin.element) { showNotification(`Failed to create Inspector window for track ${track.id}.`, 5000); return null; }
    track.inspectorWindow = inspectorWin; initializeCommonInspectorControls(track, inspectorWin.element); initializeTypeSpecificInspectorControls(track, inspectorWin.element);
    setTimeout(() => { Object.values(track.inspectorControls).forEach(control => { if (control?.type === 'knob' && typeof control.refreshVisuals === 'function') control.refreshVisuals(); }); }, 50);
    return inspectorWin;
}
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
    if (window.openWindows[windowId] && (forceRedraw || savedState)) window.openWindows[windowId].close();
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
export function openMixerWindow(savedState = null) {
    const windowId = 'mixer'; if (window.openWindows[windowId] && !savedState) { window.openWindows[windowId].restore(); return window.openWindows[windowId]; } if (window.openWindows[windowId] && savedState) window.openWindows[windowId].close();
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
export function renderSamplePads(track) { /* ... same as before ... */ }
export function updateSliceEditorUI(track) { /* ... same as before ... */ }
export function applySliceEdits(trackId) { /* ... same as before ... */ }
export function drawWaveform(track) { /* ... same as before ... */ }
export function drawInstrumentWaveform(track) { drawWaveform(track); }
export function updateDrumPadControlsUI(track) { /* ... same as before ... */ }
export function renderDrumSamplerPads(track) { /* ... same as before ... */ }
export function highlightPlayingStep(col, trackType, gridElement) { /* ... same as before ... */ }
