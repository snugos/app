// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Modular Effects Version 8');

import { SnugWindow } from './SnugWindow.js';
import { showNotification, createDropZoneHTML, setupDropZoneListeners as utilSetupDropZoneListeners, showCustomModal } from './utils.js';
import * as Constants from './constants.js';
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
} from './eventHandlers.js';
import { AVAILABLE_EFFECTS, getEffectParamDefinitions } from './effectsRegistry.js';

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
            selectEl.addEventListener('change', (e) => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Set ${track.name} ${controlDef.label} to ${e.target.value}`); track.setSynthParam(controlDef.paramPath, e.target.value); });
            selectContainer.appendChild(selectEl); controlGroup.appendChild(selectContainer);
        } else if (controlDef.type === 'knob') {
            const knob = createKnob({ label: controlDef.label, min: controlDef.min, max: controlDef.max, step: controlDef.step, initialValue: initialValue, decimals: controlDef.decimals, displaySuffix: controlDef.displaySuffix, trackRef: track, onValueChange: (val) => track.setSynthParam(controlDef.paramPath, val) });
            controlGroup.appendChild(knob.element); if (!track.inspectorControls) track.inspectorControls = {}; track.inspectorControls[controlDef.idPrefix] = knob;
        }
    });
    container.appendChild(controlGroup);
}

// --- Sampler Inspector Specifics ---
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

// --- Track Inspector Window & Controls Initialization ---
export function openTrackInspectorWindow(trackId, savedState = null) {
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
export function initializeCommonInspectorControls(track, winEl) {
    winEl.querySelector(`#trackNameDisplay-${track.id}`)?.addEventListener('change', (e) => { const oldName = track.name; const newName = e.target.value; if (oldName !== newName && typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Rename Track "${oldName}" to "${newName}"`); track.name = newName; if (track.inspectorWindow?.titleBar) track.inspectorWindow.titleBar.querySelector('span').textContent = `Track: ${track.name}`; if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow(); });
    const volSliderContainer = winEl.querySelector(`#volumeSliderContainer-${track.id}`); if (volSliderContainer) { const volKnob = createKnob({ label: 'Volume', min: 0, max: 1, step: 0.01, initialValue: track.previousVolumeBeforeMute, decimals: 2, sensitivity: 0.8, trackRef: track, onValueChange: (val, oldVal, fromInteraction) => { track.setVolume(val, fromInteraction); if (typeof window.updateMixerWindow === 'function') window.updateMixerWindow(); } }); volSliderContainer.innerHTML = ''; volSliderContainer.appendChild(volKnob.element); track.inspectorControls.volume = volKnob; }
    const seqLenBarsInput = winEl.querySelector(`#sequenceLengthBars-${track.id}`); const seqLenDisplaySpan = winEl.querySelector(`#sequenceLengthDisplay-${track.id}`); if(seqLenBarsInput && seqLenDisplaySpan) { seqLenBarsInput.addEventListener('change', (e) => { let numBars = parseInt(e.target.value); if(isNaN(numBars) || numBars < 1) numBars = 1; if(numBars > 256) numBars = 256; e.target.value = numBars; const numSteps = numBars * Constants.STEPS_PER_BAR; if (track.sequenceLength !== numSteps) { track.setSequenceLength(numSteps, false); seqLenDisplaySpan.textContent = `${numBars} bars (${numSteps} steps)`; } }); }
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
    const polyToggleBtn = winEl.querySelector(`#slicerPolyphonyToggle-${track.id}`); if (polyToggleBtn) { polyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`; polyToggleBtn.classList.toggle('active', !track.slicerIsPolyphonic); polyToggleBtn.addEventListener('click', () => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Slicer Polyphony for ${track.name} to ${!track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`); track.slicerIsPolyphonic = !track.slicerIsPolyphonic; polyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`; polyToggleBtn.classList.toggle('active', !track.slicerIsPolyphonic); if (!track.slicerIsPolyphonic) { track.setupSlicerMonoNodes(); if(track.slicerMonoPlayer && track.audioBuffer?.loaded) track.slicerMonoPlayer.buffer = track.audioBuffer; showNotification(`${track.name} slicer mode: Mono`, 2000); } else { track.disposeSlicerMonoNodes(); showNotification(`${track.name} slicer mode: Poly`, 2000); } }); }
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
    const instPolyToggleBtn = winEl.querySelector(`#instrumentSamplerPolyphonyToggle-${track.id}`); if (instPolyToggleBtn) { instPolyToggleBtn.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`; instPolyToggleBtn.classList.toggle('active', !track.instrumentSamplerIsPolyphonic); instPolyToggleBtn.addEventListener('click', () => { if(typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Instrument Sampler Polyphony for ${track.name} to ${!track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`); track.instrumentSamplerIsPolyphonic = !track.instrumentSamplerIsPolyphonic; instPolyToggleBtn.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`; instPolyToggleBtn.classList.toggle('active', !track.instrumentSamplerIsPolyphonic); showNotification(`${track.name} Instrument Sampler mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'} (for live input)`, 2000); }); }
    const iEAK = createKnob({ label: 'Attack', min:0.005, max:2, step:0.001, initialValue: track.instrumentSamplerSettings.envelope.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('attack',val) }); const iAttPh = winEl.querySelector(`#instrumentEnvAttackSlider-${track.id}`); if(iAttPh) { iAttPh.innerHTML = ''; iAttPh.appendChild(iEAK.element); } track.inspectorControls.instEnvAttack = iEAK;
    const iEDK = createKnob({ label: 'Decay', min:0.01, max:2, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('decay',val) }); const iDecPh = winEl.querySelector(`#instrumentEnvDecaySlider-${track.id}`); if(iDecPh) { iDecPh.innerHTML = ''; iDecPh.appendChild(iEDK.element); } track.inspectorControls.instEnvDecay = iEDK;
    const iESK = createKnob({ label: 'Sustain', min:0, max:1, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('sustain',val) }); const iSusPh = winEl.querySelector(`#instrumentEnvSustainSlider-${track.id}`); if(iSusPh) { iSusPh.innerHTML = ''; iSusPh.appendChild(iESK.element); } track.inspectorControls.instEnvSustain = iESK;
    const iERK = createKnob({ label: 'Release', min:0.01, max:5, step:0.01, initialValue: track.instrumentSamplerSettings.envelope.release, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('release',val) }); const iRelPh = winEl.querySelector(`#instrumentEnvReleaseSlider-${track.id}`); if(iRelPh) { iRelPh.innerHTML = ''; iRelPh.appendChild(iERK.element); } track.inspectorControls.instEnvRelease = iERK;
}

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

        let newVisualIndex;
        if (targetElement && targetElement.dataset.index && targetElement !== listDiv.querySelector(`[data-effect-id="${droppedEffectId}"]`)) {
            const targetVisualIndex = parseInt(targetElement.dataset.index);
            const rect = targetElement.getBoundingClientRect();
            const isDropInUpperHalf = e.clientY < rect.top + rect.height / 2;
            newVisualIndex = isDropInUpperHalf ? targetVisualIndex : targetVisualIndex + 1;
        } else {
            if (effectsCurrentArray.length > 0 && listDiv.firstChild && e.clientY < listDiv.firstChild.getBoundingClientRect().top + listDiv.firstChild.getBoundingClientRect().height / 2) {
                newVisualIndex = 0;
            } else {
                newVisualIndex = effectsCurrentArray.length;
            }
        }
        
        let finalSpliceIndex = newVisualIndex;
        if (oldEffectIndex < newVisualIndex) { // If moving an item downwards in the list
            finalSpliceIndex--; 
        }
        // Clamp to valid array indices for insertion. For splice, this can be up to array.length.
        finalSpliceIndex = Math.max(0, Math.min(finalSpliceIndex, effectsCurrentArray.length));


        console.log(`[UI Drop] ID: ${droppedEffectId}, OldIdx: ${oldEffectIndex}, TargetElement: ${targetElement?.dataset.effectId}, VisualNewIdx: ${newVisualIndex}, FinalSpliceIdx for reorderEffect: ${finalSpliceIndex}`);

        if (oldEffectIndex !== finalSpliceIndex || (oldEffectIndex === finalSpliceIndex && newVisualIndex === effectsCurrentArray.length && oldEffectIndex !== effectsCurrentArray.length) ) {
             if (ownerType === 'track') owner.reorderEffect(droppedEffectId, finalSpliceIndex);
             else window.reorderMasterEffect(droppedEffectId, finalSpliceIndex);
        }
        
        const currentControlsContainer = document.getElementById(`${ownerType}-${owner?.id || 'master'}-effect-controls`);
        renderEffectsList(owner, ownerType, listDiv, currentControlsContainer); // Re-render to reflect new order
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

// --- Window Opening Functions ---
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

// --- Sound Browser UI ---
export function openSoundBrowserWindow(savedState = null) {
    console.log("[ui.js] openSoundBrowserWindow called.");
    const windowId = 'soundBrowser';
    if (window.openWindows[windowId] && !savedState) { window.openWindows[windowId].restore(); if (window.currentLibraryName && typeof updateSoundBrowserDisplayForLibrary === 'function') updateSoundBrowserDisplayForLibrary(window.currentLibraryName); return window.openWindows[windowId]; }
    if (window.openWindows[windowId] && savedState) window.openWindows[windowId].close();
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
    console.log("[ui.js] Sound Browser window created and initialized."); return soundBrowserWin;
}
export function updateSoundBrowserDisplayForLibrary(libraryName) {
    const soundBrowserList = document.getElementById('soundBrowserList'); const pathDisplay = document.getElementById('soundBrowserPathDisplay');
    if (!soundBrowserList || !pathDisplay ) { console.warn("[ui.js] Sound Browser DOM elements missing for updateDisplay."); return; }
    window.currentLibraryName = libraryName;
    if (window.soundLibraryFileTrees && window.soundLibraryFileTrees[libraryName]) { window.currentSoundFileTree = window.soundLibraryFileTrees[libraryName]; window.currentSoundBrowserPath = []; renderSoundBrowserDirectory(window.currentSoundBrowserPath, window.currentSoundFileTree); }
    else if (window.loadedZipFiles && window.loadedZipFiles[libraryName] === "loading") { soundBrowserList.innerHTML = `<div class="p-2 text-xs text-gray-500">Loading ${libraryName} sounds...</div>`; pathDisplay.textContent = `Path: / (${libraryName} - Loading...)`; }
    else { const zipUrl = Constants.soundLibraries[libraryName]; if (zipUrl && typeof window.fetchSoundLibrary === 'function') window.fetchSoundLibrary(libraryName, zipUrl, false); else { soundBrowserList.innerHTML = `<div class="p-2 text-xs text-red-500">Library ${libraryName} config not found.</div>`; pathDisplay.textContent = `Path: / (Error - ${libraryName})`; } }
}
export function renderSoundBrowserDirectory(pathArray, treeNode) {
    const soundBrowserList = document.getElementById('soundBrowserList'); const pathDisplay = document.getElementById('soundBrowserPathDisplay');
    console.log(`[UI SoundBrowser] Rendering directory. Path: /${pathArray.join('/')}, Library: ${window.currentLibraryName}, TreeNode type: ${typeof treeNode}, Is empty obj: ${treeNode && Object.keys(treeNode).length === 0}, Keys:`, treeNode ? Object.keys(treeNode) : 'null');
    if (!soundBrowserList || !pathDisplay ) { console.warn("[ui.js] renderSoundBrowserDirectory: DOM elements missing."); return; }
    if (!treeNode && window.currentLibraryName && window.loadedZipFiles && window.loadedZipFiles[window.currentLibraryName] !== "loading") { soundBrowserList.innerHTML = `<div class="p-2 text-xs text-gray-500">Content for ${window.currentLibraryName || 'selected library'} is unavailable or empty.</div>`; pathDisplay.textContent = `Path: /${pathArray.join('/')} (${window.currentLibraryName || 'No Lib'})`; return; }
    if (!treeNode && window.loadedZipFiles && window.loadedZipFiles[window.currentLibraryName] === "loading") return;
    if (!treeNode) { soundBrowserList.innerHTML = `<div class="p-2 text-xs text-gray-500">Select a library or library content is missing.</div>`; pathDisplay.textContent = `Path: /`; return; }
    soundBrowserList.innerHTML = ''; pathDisplay.textContent = `Path: /${pathArray.join('/')} (${window.currentLibraryName || 'No Lib'})`;
    if (pathArray.length > 0) { const backButton = document.createElement('div'); backButton.className = 'sound-browser-item font-semibold hover:bg-gray-100 cursor-pointer p-1 text-sm border-b border-gray-200'; backButton.textContent = '⬆️ .. (Up)'; backButton.addEventListener('click', () => { window.currentSoundBrowserPath.pop(); let newTreeNode = window.soundLibraryFileTrees[window.currentLibraryName]; if (!newTreeNode) { window.currentSoundBrowserPath = []; renderSoundBrowserDirectory([], null); return; } for (const segment of window.currentSoundBrowserPath) { if (newTreeNode[segment]?.type === 'folder') newTreeNode = newTreeNode[segment].children; else { window.currentSoundBrowserPath = []; newTreeNode = window.soundLibraryFileTrees[window.currentLibraryName]; break; } } window.currentSoundFileTree = newTreeNode; renderSoundBrowserDirectory(window.currentSoundBrowserPath, newTreeNode); }); soundBrowserList.appendChild(backButton); }
    if (Object.keys(treeNode).length === 0 && pathArray.length > 0) { soundBrowserList.innerHTML += '<div class="p-2 text-xs text-gray-500">Folder is empty.</div>'; }
    else if (Object.keys(treeNode).length === 0 && pathArray.length === 0 && window.currentLibraryName) { soundBrowserList.innerHTML += `<div class="p-2 text-xs text-gray-500">Library "${window.currentLibraryName}" appears empty or its structure was not recognized.</div>`; }

    const sortedEntries = Object.entries(treeNode).sort(([nameA, itemA], [nameB, itemB]) => { if (itemA.type === 'folder' && itemB.type === 'file') return -1; if (itemA.type === 'file' && itemB.type === 'folder') return 1; return nameA.localeCompare(nameB); });
    sortedEntries.forEach(([name, item]) => {
        const div = document.createElement('div'); div.className = 'sound-browser-item hover:bg-gray-100 cursor-pointer p-1 text-xs border-b border-gray-200 last:border-b-0';
        if (item.type === 'folder') { div.textContent = `📁 ${name}`; div.addEventListener('click', () => { window.currentSoundBrowserPath.push(name); window.currentSoundFileTree = item.children; renderSoundBrowserDirectory(window.currentSoundBrowserPath, item.children); }); }
        else if (item.type === 'file') {
            div.textContent = `🎵 ${name}`; div.title = `Click to play. Drag to load: ${name}`; div.draggable = true;
            div.addEventListener('dragstart', (event) => { const soundData = { fullPath: item.fullPath, libraryName: window.currentLibraryName, fileName: name }; event.dataTransfer.setData("application/json", JSON.stringify(soundData)); event.dataTransfer.effectAllowed = "copy"; div.style.opacity = '0.5'; });
            div.addEventListener('dragend', () => { div.style.opacity = '1'; });
            div.addEventListener('click', async (event) => {
                if (event.detail === 0) return;
                if(typeof window.initAudioContextAndMasterMeter === 'function') await window.initAudioContextAndMasterMeter(true);
                if (window.previewPlayer && !window.previewPlayer.disposed) { try { window.previewPlayer.stop(); window.previewPlayer.dispose(); } catch(e) {console.warn("Error disposing old preview player", e)} window.previewPlayer = null;}
                try {
                    if (!window.loadedZipFiles[window.currentLibraryName] || window.loadedZipFiles[window.currentLibraryName] === "loading") throw new Error(`ZIP library "${window.currentLibraryName}" not loaded.`);
                    const zipEntry = window.loadedZipFiles[window.currentLibraryName].file(item.fullPath); if (!zipEntry) throw new Error(`File ${item.fullPath} not in ${window.currentLibraryName}.`);
                    const fileBlob = await zipEntry.async("blob"); const objectURL = URL.createObjectURL(fileBlob);
                    const buffer = await new Tone.Buffer().load(objectURL);
                    window.previewPlayer = new Tone.Player(buffer).toDestination(); window.previewPlayer.autostart = true;
                    window.previewPlayer.onstop = () => { if (window.previewPlayer && !window.previewPlayer.disposed) try{window.previewPlayer.dispose();} catch(e){} window.previewPlayer = null; URL.revokeObjectURL(objectURL); };
                } catch (error) { console.error(`Error previewing sound ${name}:`, error); showNotification(`Error previewing ${name}: ${error.message}`, 3000); }
            });
        }
        soundBrowserList.appendChild(div);
    });
}

// --- Mixer Window ---
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

// --- Sequencer Window ---
export function buildSequencerContentDOM(track, rows, rowLabels, numBars) { /* ... */ return mainContentDiv; }
export function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... */ return seqWin; }

// --- Utility UI functions for samplers ---
export function renderSamplePads(track) { /* ... */ }
export function updateSliceEditorUI(track) { /* ... */ }
export function applySliceEdits(trackId) { /* ... */ }
export function drawWaveform(track) { /* ... */ }
export function drawInstrumentWaveform(track) { drawWaveform(track); }
export function updateDrumPadControlsUI(track) { /* ... */ }
export function renderDrumSamplerPads(track) { /* ... */ }
export function highlightPlayingStep(col, trackType, gridElement) { /* ... */ }

// NO DUMMY FUNCTIONS OR GROUPED EXPORT BLOCK AT THE END
