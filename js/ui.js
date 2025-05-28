// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Latest Debugging for Pads & Upload Click (May 28 v2)');

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
const synthEngineControlDefinitions = { /* ... (same as before) ... */ };
function buildSynthSpecificInspectorDOM(track) { /* ... (same as before) ... */ }
function buildSynthEngineControls(track, container, engineType) { /* ... (same as before) ... */ }


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

// --- Instrument Sampler Inspector Specifics ---
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
function buildTrackInspectorContentDOM(track) { /* ... (same as before) ... */ }
function openTrackInspectorWindow(trackId, savedState = null) { /* ... (same as before) ... */ }
function initializeCommonInspectorControls(track, winEl) { /* ... (same as before) ... */ }

function initializeTypeSpecificInspectorControls(track, winEl) {
    console.log(`[UI - initializeTypeSpecificInspectorControls] Called for track ${track.id}, type ${track.type}`); // ADDED LOG
    if (track.type === 'Synth') initializeSynthSpecificControls(track, winEl);
    else if (track.type === 'Sampler') initializeSamplerSpecificControls(track, winEl);
    else if (track.type === 'DrumSampler') initializeDrumSamplerSpecificControls(track, winEl);
    else if (track.type === 'InstrumentSampler') initializeInstrumentSamplerSpecificControls(track, winEl);
}

function initializeSynthSpecificControls(track, winEl) { /* ... (same as before) ... */ }
function initializeSamplerSpecificControls(track, winEl) { /* ... (same as before, with corrected ID logic) ... */ }

function initializeDrumSamplerSpecificControls(track, winEl) {
    console.log(`[UI - initializeDrumSamplerSpecificControls] Called for track ${track.id}`); // ADDED LOG
    if (typeof renderDrumSamplerPads === 'function') renderDrumSamplerPads(track);
    if (typeof updateDrumPadControlsUI === 'function') updateDrumPadControlsUI(track);

    const pVolK = createKnob({ label: 'Pad Vol', min:0, max:1, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadVolume(track.selectedDrumPadForEdit, val)}); const volPh = winEl.querySelector(`#drumPadVolumeSlider-${track.id}`); if(volPh) { volPh.innerHTML = ''; volPh.appendChild(pVolK.element); } track.inspectorControls.drumPadVolume = pVolK;
    const pPitK = createKnob({ label: 'Pad Pitch', min:-24, max:24, step:1, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setDrumSamplerPadPitch(track.selectedDrumPadForEdit, val)}); const pitPh = winEl.querySelector(`#drumPadPitchKnob-${track.id}`); if(pitPh) { pitPh.innerHTML = ''; pitPh.appendChild(pPitK.element); } track.inspectorControls.drumPadPitch = pPitK;
    const pEAK = createKnob({ label: 'Attack', min:0.001, max:1, step:0.001, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.attack || 0.005, decimals:3, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'attack', val)}); const attPh = winEl.querySelector(`#drumPadEnvAttackSlider-${track.id}`); if(attPh) { attPh.innerHTML = ''; attPh.appendChild(pEAK.element); } track.inspectorControls.drumPadEnvAttack = pEAK;
    const pERK = createKnob({ label: 'Release', min:0.01, max:2, step:0.01, initialValue: track.drumSamplerPads[track.selectedDrumPadForEdit]?.envelope.release || 0.1, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(track.selectedDrumPadForEdit, 'release', val)}); const relPh = winEl.querySelector(`#drumPadEnvReleaseSlider-${track.id}`); if(relPh) { relPh.innerHTML = ''; relPh.appendChild(pERK.element); } track.inspectorControls.drumPadEnvRelease = pERK;
}

function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... (same as before, with corrected ID logic) ... */ }

// --- Modular Effects Rack UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') { /* ... (same as before) ... */ }
function renderEffectsList(owner, ownerType, listDiv, controlsContainer) { /* ... (same as before) ... */ }
function renderEffectControls(owner, ownerType, effectId, controlsContainer) { /* ... (same as before) ... */ }
function showAddEffectModal(owner, ownerType) { /* ... (same as before) ... */ }


// --- Window Opening Functions (with Debugging & GCW try...catch) ---
function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... (same as before) ... */ }
function openMasterEffectsRackWindow(savedState = null) { /* ... (same as before) ... */ }
function openGlobalControlsWindow(savedState = null) { /* ... (same as before, with try...catch and return logging) ... */ }
function openSoundBrowserWindow(savedState = null) { /* ... (same as before, with debug logs) ... */ }
function updateSoundBrowserDisplayForLibrary(libraryName) { /* ... (same as before, with debug logs) ... */ }
function renderSoundBrowserDirectory(pathArray, treeNode) { /* ... (same as before, with debug logs) ... */ }
function openMixerWindow(savedState = null) { /* ... (same as before, with debug logs) ... */ }
function updateMixerWindow() { /* ... (same as before, with debug logs) ... */ }
function renderMixer(container) { /* ... (same as before, with debug logs) ... */ }
function buildSequencerContentDOM(track, rows, rowLabels, numBars) { /* ... (same as before) ... */ }
function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... (same as before) ... */ }


// --- Utility UI functions for samplers (Updated for Audio Status & Debugging) ---
function renderSamplePads(track) { /* ... (same as before, with status display) ... */ }
function updateSliceEditorUI(track) { /* ... (same as before, with status display & control disabling) ... */ }
function applySliceEdits(trackId) { /* ... (same as before) ... */ }
function drawWaveform(track) { /* ... (same as before, with status display on canvas) ... */ }
function drawInstrumentWaveform(track) { drawWaveform(track); }
function updateDrumPadControlsUI(track) { /* ... (same as before, with corrected ID logic and console logs) ... */ }

function renderDrumSamplerPads(track) {
    console.log(`[UI - renderDrumSamplerPads] Called for track ${track.id}`);
    if (!track || track.type !== 'DrumSampler' || !track.inspectorWindow?.element) {
        console.warn(`[UI - renderDrumSamplerPads] Pre-conditions not met. Track: ${!!track}, Type: ${track?.type}, Inspector: ${!!track?.inspectorWindow?.element}`);
        return;
    }
    const padsContainer = track.inspectorWindow.element.querySelector(`#drumSamplerPadsContainer-${track.id}`);
    if (!padsContainer) {
        console.error(`[UI - renderDrumSamplerPads] padsContainer (ID: #drumSamplerPadsContainer-${track.id}) not found! Cannot render pads.`);
        return;
    }
    padsContainer.innerHTML = '';

    if (!track.drumSamplerPads || track.drumSamplerPads.length === 0) {
        padsContainer.textContent = 'No pads defined for this track.';
        console.warn(`[UI - renderDrumSamplerPads] Track ${track.id} has no drumSamplerPads array or it's empty.`);
        return;
    }
    console.log(`[UI - renderDrumSamplerPads] Rendering ${track.drumSamplerPads.length} pads for track ${track.id}.`);

    track.drumSamplerPads.forEach((padData, index) => {
        const padEl = document.createElement('button');
        padEl.className = `pad-button ${index === track.selectedDrumPadForEdit ? 'selected-for-edit' : ''} drop-zone-pad`;

        let fileNameDisplay = padData.originalFileName ? padData.originalFileName.substring(0, 10) + (padData.originalFileName.length > 10 ? '...' : '') : 'Empty';
        let titleInfo = `Sample: ${padData.originalFileName || 'Empty'}`;
        padEl.style.borderColor = '';

        if (padData.status === 'missing') {
            fileNameDisplay = `MISSING!`;
            padEl.style.borderColor = 'red';
            titleInfo = `MISSING: ${padData.originalFileName || 'Unknown'}. Click to select this pad and then use 'Relink/Upload' in the controls below, or drag a file here.`;
        } else if (padData.status === 'pending') {
            fileNameDisplay = `Loading...`;
            titleInfo = `Loading: ${padData.originalFileName}`;
        } else if (padData.status === 'empty') {
             titleInfo = 'Empty. Click to select this pad and load a sample via the controls below, or drag a file here.';
        }

        padEl.innerHTML = `Pad ${index + 1} <span class="pad-label block truncate" style="max-width: 60px;" title="${padData.originalFileName || 'Empty'}">${fileNameDisplay}</span>`;
        padEl.title = `Select Pad ${index + 1}. ${titleInfo}`;
        padEl.dataset.trackId = track.id.toString(); padEl.dataset.trackType = "DrumSampler"; padEl.dataset.padSliceIndex = index.toString();
        console.log(`[UI - renderDrumSamplerPads] Creating pad button ${index + 1} for track ${track.id}. Status: ${padData.status}, FileName: ${padData.originalFileName}`);

        padEl.addEventListener('click', async () => {
            console.log(`[UI - renderDrumSamplerPads] Pad ${index + 1} clicked. Current status: ${padData.status}`);
            track.selectedDrumPadForEdit = index;
            if (padData.status === 'loaded' && typeof window.playDrumSamplerPadPreview === 'function') {
                await window.playDrumSamplerPadPreview(track.id, index);
            } else if (padData.status === 'missing' || padData.status === 'empty') {
                console.log(`[UI - renderDrumSamplerPads] Clicked on ${padData.status} pad ${index}. updateDrumPadControlsUI will make its dropzone/relink primary.`);
            }
            renderDrumSamplerPads(track); // Re-render to update 'selected-for-edit' class on pads
            updateDrumPadControlsUI(track); // Update controls section for the newly selected pad
        });
        if (typeof utilSetupDropZoneListeners === 'function') {
            utilSetupDropZoneListeners(padEl, track.id, "DrumSampler", index, window.loadSoundFromBrowserToTarget, window.loadDrumSamplerPadFile);
        } else {
            console.warn("[UI - renderDrumSamplerPads] utilSetupDropZoneListeners is not defined.");
        }
        padsContainer.appendChild(padEl);
    });
    console.log(`[UI - renderDrumSamplerPads] Finished rendering pads for track ${track.id}. Pad count in DOM: ${padsContainer.children.length}`);
}

function highlightPlayingStep(col, trackType, gridElement) { /* ... (no changes) ... */ }

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
