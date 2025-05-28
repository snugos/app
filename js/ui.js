// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Modular Effects Version 2');

import { SnugWindow } from './SnugWindow.js';
import { showNotification, createDropZoneHTML, setupDropZoneListeners as utilSetupDropZoneListeners, showCustomModal } from './utils.js';
import * as Constants from './constants.js';
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
} from './eventHandlers.js'; // Assuming these are correctly defined and exported
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
    const step = options.step === undefined ? 1 : options.step; // Ensure step has a default
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
        if (step !== 0) { // Check step is not zero to avoid division by zero
            boundedValue = Math.round(boundedValue / step) * step;
        }
        const oldValue = currentValue;
        currentValue = Math.min(max, Math.max(min, boundedValue)); // Ensure bounded again
        updateKnobVisual();
        if (triggerCallback && options.onValueChange && (oldValue !== currentValue || fromInteraction)) {
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
    setValue(currentValue, false); // Initial visual update
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
function buildSynthSpecificInspectorDOM(track) { /* ... same as before ... */ return panel; }
function buildSynthEngineControls(track, container, engineType) { /* ... same as before ... */ }
function buildSamplerSpecificInspectorDOM(track) { /* ... same as before ... */ return panel; }
function buildDrumSamplerSpecificInspectorDOM(track) { /* ... same as before ... */ return panel; }
function buildInstrumentSamplerSpecificInspectorDOM(track) { /* ... same as before ... */ return panel; }
export function initializeCommonInspectorControls(track, winEl) { /* ... same as before ... */ }
export function initializeTypeSpecificInspectorControls(track, winEl) { /* ... same as before ... */ }
function initializeSynthSpecificControls(track, winEl) { /* ... same as before ... */ }
function initializeSamplerSpecificControls(track, winEl) { /* ... same as before ... */ }
function initializeDrumSamplerSpecificControls(track, winEl) { /* ... same as before ... */ }
function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... same as before ... */ }

// --- MODULAR EFFECTS RACK UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') {
    console.log(`[UI] buildModularEffectsRackDOM for ${ownerType}, owner:`, owner);
    const rackContainer = document.createElement('div'); rackContainer.className = 'modular-effects-rack p-2 space-y-2 bg-gray-50';
    const header = document.createElement('div'); header.className = 'flex justify-between items-center mb-2';
    const title = document.createElement('h3'); title.className = 'text-lg font-semibold text-gray-700'; title.textContent = ownerType === 'track' ? `Effects: ${owner.name}` : 'Master Effects'; header.appendChild(title);
    const addEffectButton = document.createElement('button'); addEffectButton.className = 'bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded text-xs shadow-sm'; addEffectButton.textContent = '+ Add Effect'; addEffectButton.onclick = () => showAddEffectModal(owner, ownerType); header.appendChild(addEffectButton); rackContainer.appendChild(header);
    const effectsListDiv = document.createElement('div'); effectsListDiv.id = `${ownerType}-${owner?.id || 'master'}-effects-list`; effectsListDiv.className = 'effects-list-container space-y-1 min-h-[120px] border p-1.5 bg-gray-100 rounded shadow-inner'; rackContainer.appendChild(effectsListDiv);
    const effectControlsContainer = document.createElement('div'); effectControlsContainer.id = `${ownerType}-${owner?.id || 'master'}-effect-controls`; effectControlsContainer.className = 'effect-controls-panel mt-2 border-t border-gray-300 pt-2 min-h-[150px]'; rackContainer.appendChild(effectControlsContainer);
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
        const effectsCurrentArray = ownerType === 'track' ? owner.activeEffects : (window.masterEffectsChain || []); // Get current array for length
        let newDropIndex = effectsCurrentArray.length; // Default to end

        if (targetElement && targetElement.dataset.index) {
            const targetIndex = parseInt(targetElement.dataset.index);
            const rect = targetElement.getBoundingClientRect();
            const isDropInUpperHalf = e.clientY < rect.top + rect.height / 2;
            newDropIndex = isDropInUpperHalf ? targetIndex : targetIndex + 1;
        } else { // Dropping in empty area or between items
            const listRect = listDiv.getBoundingClientRect();
            if (effectsCurrentArray.length > 0 && e.clientY < listRect.top + listRect.height / 2) {
                newDropIndex = 0;
            } else {
                newDropIndex = effectsCurrentArray.length;
            }
        }
        
        console.log(`[UI Drop] Dropped ID: ${droppedEffectId}, Target Element: ${targetElement?.dataset.effectId}, Calculated Drop Index: ${newDropIndex}`);

        if (ownerType === 'track') owner.reorderEffect(droppedEffectId, newDropIndex);
        else window.reorderMasterEffect(droppedEffectId, newDropIndex);
        
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
    console.log("[UI] Attempting to open Master Effects Rack Window. Saved state:", savedState);
    const windowId = 'masterEffectsRack';
    if (window.openWindows[windowId] && !savedState) { window.openWindows[windowId].restore(); return window.openWindows[windowId]; }
    if (window.openWindows[windowId] && savedState) window.openWindows[windowId].close();
    const masterEffectsContentElement = buildModularEffectsRackDOM(null, 'master');
    console.log("[UI] Master Effects Rack DOM built:", masterEffectsContentElement);
    const winOptions = { width: 450, height: 550, initialContentKey: 'masterEffectsRack' }; if (savedState) Object.assign(winOptions, savedState);
    const masterEffectsWin = new SnugWindow(windowId, 'Master Effects Rack', masterEffectsContentElement, winOptions);
    if (!masterEffectsWin || !masterEffectsWin.element) { showNotification("Failed to create Master Effects Rack.", 5000); console.error("[UI] Failed to create SnugWindow for Master Effects Rack."); return null; }
    console.log("[UI] Master Effects Rack Window created and should be visible:", masterEffectsWin);
    return masterEffectsWin;
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
    console.log(`[UI SoundBrowser] Rendering directory. Path: /${pathArray.join('/')}, Library: ${window.currentLibraryName}, TreeNode keys:`, treeNode ? Object.keys(treeNode) : 'null');
    if (!soundBrowserList || !pathDisplay ) { console.warn("[ui.js] renderSoundBrowserDirectory: DOM elements missing."); return; }
    if (!treeNode && window.currentLibraryName && window.loadedZipFiles && window.loadedZipFiles[window.currentLibraryName] !== "loading") { soundBrowserList.innerHTML = `<div class="p-2 text-xs text-gray-500">Content for ${window.currentLibraryName || 'selected library'} is unavailable or empty.</div>`; pathDisplay.textContent = `Path: /${pathArray.join('/')} (${window.currentLibraryName || 'No Lib'})`; return; }
    if (!treeNode && window.loadedZipFiles && window.loadedZipFiles[window.currentLibraryName] === "loading") return;
    if (!treeNode) { soundBrowserList.innerHTML = `<div class="p-2 text-xs text-gray-500">Select a library.</div>`; pathDisplay.textContent = `Path: /`; return; }
    soundBrowserList.innerHTML = ''; pathDisplay.textContent = `Path: /${pathArray.join('/')} (${window.currentLibraryName || 'No Lib'})`;
    if (pathArray.length > 0) { const backButton = document.createElement('div'); backButton.className = 'sound-browser-item font-semibold hover:bg-gray-100 cursor-pointer p-1 text-sm'; backButton.textContent = '⬆️ .. (Up)'; backButton.addEventListener('click', () => { window.currentSoundBrowserPath.pop(); let newTreeNode = window.soundLibraryFileTrees[window.currentLibraryName]; if (!newTreeNode) { window.currentSoundBrowserPath = []; renderSoundBrowserDirectory([], null); return; } for (const segment of window.currentSoundBrowserPath) { if (newTreeNode[segment]?.type === 'folder') newTreeNode = newTreeNode[segment].children; else { window.currentSoundBrowserPath = []; newTreeNode = window.soundLibraryFileTrees[window.currentLibraryName]; break; } } window.currentSoundFileTree = newTreeNode; renderSoundBrowserDirectory(window.currentSoundBrowserPath, newTreeNode); }); soundBrowserList.appendChild(backButton); }
    if (Object.keys(treeNode).length === 0 && pathArray.length > 0) { soundBrowserList.innerHTML += '<div class="p-2 text-xs text-gray-500">Folder is empty.</div>'; }
    else if (Object.keys(treeNode).length === 0 && pathArray.length === 0) { soundBrowserList.innerHTML += '<div class="p-2 text-xs text-gray-500">Library is empty or structure not recognized.</div>'; }

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
                if (window.previewPlayer && !window.previewPlayer.disposed) { window.previewPlayer.stop(); window.previewPlayer.dispose(); window.previewPlayer = null;}
                try {
                    if (!window.loadedZipFiles[window.currentLibraryName] || window.loadedZipFiles[window.currentLibraryName] === "loading") throw new Error(`ZIP library "${window.currentLibraryName}" not loaded.`);
                    const zipEntry = window.loadedZipFiles[window.currentLibraryName].file(item.fullPath); if (!zipEntry) throw new Error(`File ${item.fullPath} not in ${window.currentLibraryName}.`);
                    const fileBlob = await zipEntry.async("blob"); const objectURL = URL.createObjectURL(fileBlob);
                    const buffer = await new Tone.Buffer().load(objectURL);
                    window.previewPlayer = new Tone.Player(buffer).toDestination(); window.previewPlayer.autostart = true;
                    window.previewPlayer.onstop = () => { if (window.previewPlayer && !window.previewPlayer.disposed) window.previewPlayer.dispose(); window.previewPlayer = null; URL.revokeObjectURL(objectURL); };
                } catch (error) { console.error(`Error previewing sound ${name}:`, error); showNotification(`Error previewing ${name}: ${error.message}`, 3000); }
            });
        }
        soundBrowserList.appendChild(div);
    });
}

// --- Other UI functions (openGlobalControlsWindow, Mixer, Sequencer, specific inspectors) ---
// These functions are assumed to be largely the same as your last provided ui.js,
// but ensure they correctly use global functions and track properties.
// The dummy exports are removed as they should be defined above or imported if from elsewhere.

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
export function buildSequencerContentDOM(track, rows, rowLabels, numBars) { /* ... same as before ... */ return mainContentDiv; }
export function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... same as before ... */ return seqWin; }
export function openMixerWindow(savedState = null) { /* ... same as before ... */ return mixerWin; }
export function updateMixerWindow() { /* ... same as before ... */ }
export function renderMixer(container) { /* ... same as before ... */ }
export function renderSamplePads(track) { /* ... same as before ... */ }
export function updateSliceEditorUI(track) { /* ... same as before ... */ }
export function applySliceEdits(trackId) { /* ... same as before ... */ }
export function drawWaveform(track) { /* ... same as before ... */ }
export function drawInstrumentWaveform(track) { drawWaveform(track); }
export function updateDrumPadControlsUI(track) { /* ... same as before ... */ }
export function renderDrumSamplerPads(track) { /* ... same as before ... */ }
export function highlightPlayingStep(col, trackType, gridElement) { /* ... same as before ... */ }

// Ensure all specific inspector DOM builders and initializers are present
// (These were assumed to be complete in the previous version you sent)

