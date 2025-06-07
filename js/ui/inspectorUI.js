// js/ui/inspectorUI.js

import { createDropZoneHTML, setupGenericDropZoneListeners } from '../utils.js';
import * as Constants from '../constants.js';
import { handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack, handleOpenEffectsRack, handleOpenPianoRoll as handleOpenSequencer } from '../eventHandlers.js';

let localAppServices = {};

export function initializeInspectorUI(appServices) {
    localAppServices = appServices;
}

// --- Start of Corrected Code ---

/**
 * Helper function to safely retrieve a nested property from an object.
 * @param {object} obj The object to search.
 * @param {string} path The path to the property (e.g., 'oscillator.type').
 * @returns {*} The value of the property, or undefined if not found.
 */
function getNestedParam(obj, path) {
    if (!path || !obj) return undefined;
    const keys = path.split('.');
    let result = obj;
    for (const key of keys) {
        if (result === undefined || result === null) return undefined;
        result = result[key];
    }
    return result;
}

/**
 * Dynamically builds the UI controls for a synthesizer's engine.
 * @param {Track} track The synth track instance.
 * @param {HTMLElement} container The DOM element to append the controls to.
 * @param {string} engineType The type of synth engine (e.g., 'MonoSynth').
 */
function buildSynthEngineControls(track, container, engineType) {
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
    if (!container || definitions.length === 0) return;

    definitions.forEach(def => {
        const placeholder = container.querySelector(`#${def.idPrefix}-${track.id}-placeholder`);
        if (!placeholder) return;

        let control;
        const initialValue = getNestedParam(track.synthParams, def.path);

        if (def.type === 'knob') {
            control = localAppServices.createKnob({
                label: def.label,
                min: def.min,
                max: def.max,
                step: def.step,
                initialValue: initialValue,
                decimals: def.decimals,
                displaySuffix: def.displaySuffix || '',
                onValueChange: (val) => track.setSynthParam(def.path, val)
            }, localAppServices);
            placeholder.appendChild(control.element);
        } else if (def.type === 'select') {
            const wrapper = document.createElement('div');
            wrapper.className = 'flex flex-col items-center';
            const label = document.createElement('div');
            label.textContent = def.label;
            label.className = 'knob-label';
            
            const select = document.createElement('select');
            select.className = 'w-full p-1 text-xs border rounded bg-white dark:bg-slate-700 dark:border-slate-600';
            def.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                select.appendChild(option);
            });
            select.value = initialValue;
            select.addEventListener('change', (e) => track.setSynthParam(def.path, e.target.value));
            
            wrapper.appendChild(label);
            wrapper.appendChild(select);
            placeholder.appendChild(wrapper);
            control = select;
        }
        
        if (control) {
            track.inspectorControls[def.idPrefix] = control;
        }
    });
}
// --- End of Corrected Code ---


function buildSynthSpecificInspectorDOM(track) {
    const engineType = track.synthEngineType || 'MonoSynth';
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
    let controlsHTML = `<div id="synthEngineControls-${track.id}" class="grid grid-cols-2 md:grid-cols-3 gap-2 p-1">`;
    definitions.forEach(def => {
        controlsHTML += `<div id="${def.idPrefix}-${track.id}-placeholder"></div>`;
    });
    controlsHTML += `</div>`;
    return controlsHTML;
}

function buildSamplerSpecificInspectorDOM(track) {
    const dropZoneHTML = createDropZoneHTML(track.id, `sampler-file-input-${track.id}`, 'sampler', null, track.samplerAudioData);
    return `<div class="sampler-controls p-1 space-y-2">
        <div id="dropZoneContainer-${track.id}-sampler" class="mb-2">${dropZoneHTML}</div>
        <div class="waveform-section border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600">
            <canvas id="waveformCanvas-${track.id}" class="w-full h-24 bg-white dark:bg-slate-800 rounded shadow-inner"></canvas>
        </div>
        <div class="slice-editor-controls mt-2 p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1" id="slice-editor-container-${track.id}">
            </div>
        <div id="samplePadsContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>
    </div>`;
}

function buildDrumSamplerSpecificInspectorDOM(track) {
    return `<div class="drum-sampler-controls p-1 space-y-2">
        <div class="selected-pad-controls p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1" id="drum-pad-editor-container-${track.id}">
            </div>
        <div id="drumPadsGridContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>
    </div>`;
}

function buildInstrumentSamplerSpecificInspectorDOM(track) {
     const dropZoneHTML = createDropZoneHTML(track.id, `inst-sampler-file-input-${track.id}`, 'instrumentsampler', null, track.instrumentSamplerSettings);
     return `<div class="instrument-sampler-controls p-1 space-y-2">
        <div id="dropZoneContainer-${track.id}-instrumentsampler" class="mb-2">${dropZoneHTML}</div>
        <div class="waveform-section border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600">
           <canvas id="instrumentWaveformCanvas-${track.id}" class="w-full h-24 bg-white dark:bg-slate-800 rounded shadow-inner"></canvas>
        </div>
        <div class="instrument-params-controls mt-2 p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1 text-xs" id="inst-sampler-controls-container-${track.id}">
            </div>
    </div>`;
}

function buildTrackInspectorContentDOM(track) {
    if (!track) return '<div>Error: Track data not found.</div>';
    let specificControlsHTML = '';
    if (track.type === 'Synth') specificControlsHTML = buildSynthSpecificInspectorDOM(track);
    else if (track.type === 'Sampler') specificControlsHTML = buildSamplerSpecificInspectorDOM(track);
    else if (track.type === 'DrumSampler') specificControlsHTML = buildDrumSamplerSpecificInspectorDOM(track);
    else if (track.type === 'InstrumentSampler') specificControlsHTML = buildInstrumentSamplerSpecificInspectorDOM(track);

    const armedTrackId = localAppServices.getArmedTrackId();
    let sequencerButtonHTML = '';
    if (track.type !== 'Audio') {
        sequencerButtonHTML = `<button id="openSequencerBtn-${track.id}" class="px-1 py-0.5 border rounded">Sequencer</button>`;
    }

    return `
        <div class="track-inspector-content p-1 space-y-1 text-xs">
            <div class="common-controls grid grid-cols-3 gap-1 mb-1">
                <button id="muteBtn-${track.id}" class="${track.isMuted ? 'muted' : ''}">${track.isMuted ? 'Unmute' : 'Mute'}</button>
                <button id="soloBtn-${track.id}" class="${track.isSoloed ? 'soloed' : ''}">${track.isSoloed ? 'Unsolo' : 'Solo'}</button>
                <button id="armInputBtn-${track.id}" class="${armedTrackId === track.id ? 'armed' : ''}">Arm</button>
            </div>
            <div id="volumeKnob-${track.id}-placeholder" class="mb-1"></div>
            <div class="type-specific-controls mt-1 border-t pt-1">${specificControlsHTML}</div>
            <div class="inspector-nav grid grid-cols-3 gap-1 mt-2">
                <button id="openEffectsBtn-${track.id}">Effects</button>
                ${sequencerButtonHTML}
                <button id="removeTrackBtn-${track.id}">Remove</button>
            </div>
        </div>`;
}

function initializeCommonInspectorControls(track, winEl) {
    winEl.querySelector(`#muteBtn-${track.id}`)?.addEventListener('click', () => handleTrackMute(track.id));
    winEl.querySelector(`#soloBtn-${track.id}`)?.addEventListener('click', () => handleTrackSolo(track.id));
    winEl.querySelector(`#armInputBtn-${track.id}`)?.addEventListener('click', () => handleTrackArm(track.id));
    winEl.querySelector(`#removeTrackBtn-${track.id}`)?.addEventListener('click', () => handleRemoveTrack(track.id));
    winEl.querySelector(`#openEffectsBtn-${track.id}`)?.addEventListener('click', () => handleOpenEffectsRack(track.id));
    winEl.querySelector(`#openSequencerBtn-${track.id}`)?.addEventListener('click', () => handleOpenSequencer(track.id));

    const volumeKnobPlaceholder = winEl.querySelector(`#volumeKnob-${track.id}-placeholder`);
    if (volumeKnobPlaceholder) {
        const knob = localAppServices.createKnob({
            label: 'Volume', min: 0, max: 1.2, step: 0.01,
            initialValue: track.previousVolumeBeforeMute,
            onValueChange: (val, o, fromInteraction) => track.setVolume(val, fromInteraction)
        }, localAppServices);
        volumeKnobPlaceholder.appendChild(knob.element);
        track.inspectorControls.volume = knob;
    }
}

function initializeTypeSpecificInspectorControls(track, winEl) {
    if (track.type === 'Synth') initializeSynthSpecificControls(track, winEl);
    else if (track.type === 'Sampler') initializeSamplerSpecificControls(track, winEl);
    else if (track.type === 'DrumSampler') initializeDrumSamplerSpecificControls(track, winEl);
    else if (track.type === 'InstrumentSampler') initializeInstrumentSamplerSpecificControls(track, winEl);
}

function initializeSynthSpecificControls(track, winEl) {
    const engineType = track.synthEngineType || 'MonoSynth';
    const container = winEl.querySelector(`#synthEngineControls-${track.id}`);
    if (container) {
        buildSynthEngineControls(track, container, engineType);
    }
}

function initializeSamplerSpecificControls(track, winEl) {
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-sampler`);
    if (dzContainerEl) {
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        if (dzEl) setupGenericDropZoneListeners(dzEl, track.id, 'Sampler', null, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadSampleFile);
        const fileInputEl = dzContainerEl.querySelector(`#sampler-file-input-${track.id}`);
        if (fileInputEl) fileInputEl.onchange = (e) => { localAppServices.loadSampleFile(e, track.id, 'Sampler'); };
    }
    renderSamplePads(track);
    const canvas = winEl.querySelector(`#waveformCanvas-${track.id}`);
    if (canvas) {
        track.waveformCanvasCtx = canvas.getContext('2d');
        if(track.audioBuffer?.loaded) drawWaveform(track);
    }
    updateSliceEditorUI(track);
}

function initializeDrumSamplerSpecificControls(track, winEl) {
    renderDrumSamplerPads(track);
    updateDrumPadControlsUI(track);
}

function initializeInstrumentSamplerSpecificControls(track, winEl) {
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-instrumentsampler`);
    if (dzContainerEl) {
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        if (dzEl) setupGenericDropZoneListeners(dzEl, track.id, 'InstrumentSampler', null, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadSampleFile);
        const fileInputEl = dzContainerEl.querySelector(`#instrumentFileInput-${track.id}`);
        if (fileInputEl) fileInputEl.onchange = (e) => { localAppServices.loadSampleFile(e, track.id, 'InstrumentSampler'); };
    }
    const canvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`);
    if (canvas) {
        track.instrumentWaveformCanvasCtx = canvas.getContext('2d');
        if(track.instrumentSamplerSettings.audioBuffer?.loaded) drawInstrumentWaveform(track);
    }
}

export function drawWaveform(track) {
    // ... Full implementation from original file ...
}

export function drawInstrumentWaveform(track) {
    // ... Full implementation from original file ...
}

export function renderSamplePads(track) {
    // ... Full implementation from original file ...
}

export function updateSliceEditorUI(track) {
    // ... Full implementation from original file ...
}

export function renderDrumSamplerPads(track) {
    // ... Full implementation from original file ...
}

export function updateDrumPadControlsUI(track) {
    // ... Full implementation from original file ...
}

export function openTrackInspectorWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById(trackId);
    if (!track) return null;
    const windowId = `trackInspector-${trackId}`;
    if (localAppServices.getOpenWindows().has(windowId) && !savedState) {
        localAppServices.getOpenWindows().get(windowId).restore(); return;
    }
    const contentDOM = buildTrackInspectorContentDOM(track);
    const inspectorWindow = localAppServices.createWindow(windowId, `Inspector: ${track.name}`, contentDOM, { width: 320, height: 450 });
    if (inspectorWindow?.element) {
        initializeCommonInspectorControls(track, inspectorWindow.element);
        initializeTypeSpecificInspectorControls(track, inspectorWindow.element);
    }
}
