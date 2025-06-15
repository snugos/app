// js/daw/ui/inspectorUI.js

// Corrected imports for state modules and utils
import { getTrackById } from '../state/trackState.js';
import { getOpenWindows, getWindowById } from '../state/windowState.js';
import { getIsReconstructingDAW } from '../state/projectState.js';
import { setupGenericDropZoneListeners, createDropZoneHTML } from '../utils.js';
import * as effectsRegistry from '../effectsRegistry.js'; 
import * as Constants from '../constants.js'; // Fix: Added Constants import

let localAppServices = {};

export function initializeInspectorUI(appServices) {
    localAppServices = appServices;
}

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

function buildSynthEngineControls(track, container, engineType) {
    const definitions = effectsRegistry.synthEngineControlDefinitions?.[engineType] || []; 
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
            }, localAppServices.captureStateForUndo); 
            placeholder.appendChild(control.element);
        } else if (def.type === 'select') {
            const selectEl = document.createElement('select');
            selectEl.className = "w-full p-1 border rounded bg-white dark:bg-black border-black dark:border-white";
            def.options.forEach(opt => {
                const optionEl = document.createElement('option');
                optionEl.value = opt;
                optionEl.textContent = opt;
                if (opt === initialValue) {
                    optionEl.selected = true;
                }
                selectEl.appendChild(optionEl);
            });
            selectEl.addEventListener('change', (e) => track.setSynthParam(def.path, e.target.value));
            placeholder.appendChild(selectEl);
        }
    });
}

export function renderSamplePads(track, container) {
    if (!container) return;
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-4 gap-2';

    for (let i = 0; i < Constants.numSlices; i++) { // Fix: Using Constants from import
        const pad = document.createElement('button');
        pad.className = 'pad-button';
        pad.textContent = `Slice ${i + 1}`;
        pad.dataset.sliceIndex = i;

        pad.addEventListener('click', () => {
            localAppServices.playSlicePreview?.(track.id, i);
            track.selectedSliceForEdit = i;
            updateSliceEditorUI(track, container.closest('.window-content'));
        });
        grid.appendChild(pad);
    }
    container.appendChild(grid);
}

export function updateSliceEditorUI(track, container) {
    if (!container) return;
    const slice = track.slices[track.selectedSliceForEdit];
    if (!slice) return;

    const pitchKnobEl = container.querySelector('#slice-pitch-knob-placeholder');
    if (pitchKnobEl) {
        pitchKnobEl.innerHTML = '';
        const knob = localAppServices.createKnob({
            label: 'Pitch',
            min: -24,
            max: 24,
            step: 1,
            initialValue: slice.pitchShift || 0,
            onValueChange: (val) => { slice.pitchShift = val; }
        }, localAppServices.captureStateForUndo); 
        pitchKnobEl.appendChild(knob.element);
    }
}

export function renderDrumSamplerPads(track, container) {
    if (!container) return;
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-4 gap-2';

    for (let i = 0; i < Constants.numDrumSamplerPads; i++) { // Fix: Using Constants from import
        const pad = document.createElement('button');
        pad.className = 'pad-button';
        pad.dataset.padIndex = i;

        const padLabel = document.createElement('span');
        padLabel.className = 'pad-label';
        const padData = track.drumSamplerPads[i];
        padLabel.textContent = padData?.originalFileName || `Pad ${i + 1}`;
        pad.appendChild(padLabel);

        if (track.selectedDrumPadForEdit === i) {
            pad.classList.add('selected-for-edit');
        }

        pad.addEventListener('click', () => {
            localAppServices.playDrumSamplerPadPreview?.(track.id, i);
            track.selectedDrumPadForEdit = i;
            updateDrumPadControlsUI(track, container.closest('.window-content'));
            renderDrumSamplerPads(track, container);
        });

        // setupGenericDropZoneListeners imported from utils.js
        setupGenericDropZoneListeners(
            pad,
            track.id,
            'DrumSampler',
            i,
            localAppServices.loadSoundFromBrowserToTarget,
            localAppServices.loadDrumSamplerPadFile
        );

        grid.appendChild(pad);
    }
    container.appendChild(grid);
}

export function updateDrumPadControlsUI(track, container) {
    if (!container) return;
    const padIndex = track.selectedDrumPadForEdit;
    const padData = track.drumSamplerPads[padIndex];
    if (!padData) return;

    let controlsGrid = container.querySelector('#drum-pad-controls-grid');
    if (!controlsGrid) {
        controlsGrid = document.createElement('div');
        controlsGrid.id = 'drum-pad-controls-grid';
        controlsGrid.className = 'grid grid-cols-2 gap-2 mt-4 p-2 border-t border-gray-400 dark:border-gray-600';
        container.appendChild(controlsGrid);
    }
    controlsGrid.innerHTML = `
        <div id="dropZoneContainer-${track.id}-drumpad-${padIndex}">
            ${createDropZoneHTML(`pad-file-input-${padIndex}`, `Load for Pad ${padIndex + 1}`)}
        </div>
        <div id="volumeKnob-drumpad-${padIndex}-placeholder"></div>
        <div id="pitchKnob-drumpad-${padIndex}-placeholder"></div>
    `;

    const volContainer = controlsGrid.querySelector(`#volumeKnob-drumpad-${padIndex}-placeholder`);
    if (volContainer) {
        const volKnob = localAppServices.createKnob({
            label: 'Volume',
            min: 0,
            max: 1.2,
            step: 0.01,
            initialValue: padData.volume || 0.7,
            onValueChange: (val) => { padData.volume = val; }
        }, localAppServices.captureStateForUndo); 
        volContainer.appendChild(volKnob.element);
    }
    
    const pitchContainer = controlsGrid.querySelector(`#pitchKnob-drumpad-${padIndex}-placeholder`);
    if (pitchContainer) {
        const pitchKnob = localAppServices.createKnob({
            label: 'Pitch',
            min: -24,
            max: 24,
            step: 1,
            initialValue: padData.pitchShift || 0,
            onValueChange: (val) => { padData.pitchShift = val; }
        }, localAppServices.captureStateForUndo); 
        pitchContainer.appendChild(pitchKnob.element); // Fix: Append the element property of the knob object
    }

    container.appendChild(controlsGrid);
    
    const dzContainerEl = container.querySelector(`#dropZoneContainer-${track.id}-drumpad-${padIndex}`);
    if(dzContainerEl) {
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        if(dzEl) setupGenericDropZoneListeners(dzEl, track.id, 'DrumSampler', padIndex, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadDrumSamplerPadFile);
        const fileInputEl = dzContainerEl.querySelector(`#drum-pad-file-input-${padIndex}`);
        if(fileInputEl) fileInputEl.onchange = (e) => { localAppServices.loadDrumSamplerPadFile(e, track.id, padIndex); };
    }
}

export function openTrackInspectorWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById(trackId);
    if (!track) return null;
    const windowId = `trackInspector-${trackId}`;
    
    const existingWindow = localAppServices.getOpenWindows().get(windowId);

    if (existingWindow) {
        if (!savedState) {
            existingWindow.restore();
            return existingWindow;
        } else {
            existingWindow.close(true);
        }
    }

    const contentDOM = buildTrackInspectorContentDOM(track);
    const inspectorWindow = localAppServices.createWindow(windowId, `Inspector: ${track.name}`, contentDOM, { width: 320, height: 450, ...savedState });
    if (inspectorWindow?.element) {
        console.log(`[inspectorUI.js] Calling initializeCommonInspectorControls for track ${track.id}`);
        initializeCommonInspectorControls(track, inspectorWindow.element);
    }
    return inspectorWindow;
}

function buildTrackInspectorContentDOM(track) {
    const content = document.createElement('div');
    content.className = 'p-2 space-y-2 overflow-y-auto h-full text-black dark:text-white';
    
    let editorButtonsHTML = '';
    if (track.type !== 'Audio') {
        editorButtonsHTML = `
            <div class="flex space-x-2 mt-2">
                <button id="openPianoRollBtn-${track.id}" class="flex-1 p-1 border rounded">Piano Roll</button>
                <button id="openEffectsRackBtn-${track.id}" class="flex-1 p-1 border rounded">Effects Rack</button>
            </div>
        `;
    }

    content.innerHTML = `
        <div class="panel">
            <h3 class="font-bold mb-2">Track Controls</h3>
            <div class="flex space-x-2">
                <button id="muteBtn-${track.id}" class="flex-1 p-1 border rounded">${track.isMuted ? 'Unmute' : 'Mute'}</button>
                <button id="soloBtn-${track.id}" class="flex-1 p-1 border rounded">${track.isSoloed ? 'Unsolo' : 'Solo'}</button>
                <button id="armInputBtn-${track.id}" class="flex-1 p-1 border rounded">Arm</button>
            </div>
            <div class="mt-2">
                <label for="trackNameInput-${track.id}" class="text-sm">Track Name:</label>
                <input type="text" id="trackNameInput-${track.id}" value="${track.name}" class="w-full p-1 border rounded bg-white dark:bg-black border-black dark:border-white">
            </div>
            ${editorButtonsHTML}
        </div>
        <div id="inspector-type-specific-controls-${track.id}"></div>
    `;

    const typeSpecificContainer = content.querySelector(`#inspector-type-specific-controls-${track.id}`);
    
    switch(track.type) {
        case 'Synth':
            buildSynthControls(track, typeSpecificContainer);
            break;
        case 'Sampler':
            buildSlicerSamplerControls(track, typeSpecificContainer);
            break;
        case 'DrumSampler':
            buildDrumSamplerControls(track, typeSpecificContainer);
            break;
        case 'InstrumentSampler':
            buildInstrumentSamplerControls(track, typeSpecificContainer);
            break;
    }

    return content;
}

function initializeCommonInspectorControls(track, element) {
    console.log(`[inspectorUI.js] Initializing common controls for track: ${track.id}`);

    const muteBtn = element.querySelector(`#muteBtn-${track.id}`);
    if (muteBtn) {
        console.log(`[inspectorUI.js] Found muteBtn-${track.id}`);
        muteBtn.addEventListener('click', () => {
            console.log(`[inspectorUI.js] Click event fired for muteBtn-${track.id}`);
            localAppServices.handleTrackMute(track.id);
        });
    } else {
        console.warn(`[inspectorUI.js] Mute button with ID muteBtn-${track.id} not found.`);
    }

    const soloBtn = element.querySelector(`#soloBtn-${track.id}`);
    if (soloBtn) {
        console.log(`[inspectorUI.js] Found soloBtn-${track.id}`);
        soloBtn.addEventListener('click', () => {
            console.log(`[inspectorUI.js] Click event fired for soloBtn-${track.id}`);
            localAppServices.handleTrackSolo(track.id);
        });
    } else {
        console.warn(`[inspectorUI.js] Solo button with ID soloBtn-${track.id} not found.`);
    }

    const armBtn = element.querySelector(`#armInputBtn-${track.id}`);
    if (armBtn) {
        console.log(`[inspectorUI.js] Found armInputBtn-${track.id}`);
        armBtn.addEventListener('click', () => {
            console.log(`[inspectorUI.js] Click event fired for armInputBtn-${track.id}`);
            localAppServices.handleTrackArm(track.id);
        });
    } else {
        console.warn(`[inspectorUI.js] Arm button with ID armInputBtn-${track.id} not found.`);
    }

    const nameInput = element.querySelector(`#trackNameInput-${track.id}`);
    nameInput?.addEventListener('change', (e) => {
        track.name = e.target.value;
        localAppServices.updateTrackUI(track.id, 'nameChanged');
    });

    const openPianoRollBtn = element.querySelector(`#openPianoRollBtn-${track.id}`);
    openPianoRollBtn?.addEventListener('click', () => {
        localAppServices.handleOpenPianoRoll?.(track.id);
    });

    const openEffectsRackBtn = element.querySelector(`#openEffectsRackBtn-${track.id}`);
    openEffectsRackBtn?.addEventListener('click', () => {
        localAppServices.handleOpenEffectsRack?.(track.id);
    });
}

function buildSynthControls(track, container) {
    // effectsRegistry is assumed to be globally available from js/daw/effectsRegistry.js
    const controlsHtml = `
        <div class="panel">
            <h3 class="font-bold mb-2">Synthesizer</h3>
            <div id="oscillator-controls-${track.id}" class="control-group">
                <label>Oscillator</label>
                <div id="oscType-${track.id}-placeholder"></div>
            </div>
            <div id="envelope-controls-${track.id}" class="grid grid-cols-2 gap-x-2 gap-y-1">
                <div id="envAttack-${track.id}-placeholder"></div>
                <div id="envDecay-${track.id}-placeholder"></div>
                <div id="envSustain-${track.id}-placeholder"></div>
                <div id="envRelease-${track.id}-placeholder"></div>
            </div>
        </div>
    `;
    container.innerHTML = controlsHtml;
    // effectsRegistry is assumed to be globally available from js/daw/effectsRegistry.js
    buildSynthEngineControls(track, container, 'MonoSynth');
}

function buildSlicerSamplerControls(track, container) {
    container.innerHTML = `
        <div class="panel">
            <h3 class="font-bold mb-2">Slicer Sampler</h3>
            <div id="dropZoneContainer-${track.id}">
                ${createDropZoneHTML(`slicer-file-input-${track.id}`)}
            </div>
            <canvas id="waveform-canvas-${track.id}" class="waveform-canvas mt-2"></canvas>
        </div>
        <div class="panel">
            <h3 class="font-bold mb-2">Slices</h3>
            <div id="sample-pads-container-${track.id}" class="mt-2"></div>
        </div>
    `;
    const dzContainerEl = container.querySelector(`#dropZoneContainer-${track.id}`);
    const dzEl = dzContainerEl.querySelector('.drop-zone');
    // setupGenericDropZoneListeners is imported from utils.js
    setupGenericDropZoneListeners(
        dzEl,
        track.id,
        'Sampler',
        null,
        localAppServices.loadSoundFromBrowserToTarget,
        localAppServices.loadSampleFile
    );
    
    const fileInputEl = dzContainerEl.querySelector(`#slicer-file-input-${track.id}`);
    if (fileInputEl) { // Check if element exists before attaching event
        fileInputEl.onchange = (e) => localAppServices.loadSampleFile(e, track.id, 'Sampler');
    }
    
    const canvas = container.querySelector(`#waveform-canvas-${track.id}`);
    if (canvas && track.audioBuffer) { // Check if canvas exists before drawing
        drawWaveform(canvas, track.audioBuffer);
    }

    renderSamplePads(track, container.querySelector(`#sample-pads-container-${track.id}`));
}

function buildDrumSamplerControls(track, container) {
    container.innerHTML = `
        <div class="panel">
            <h3 class="font-bold mb-2">Sampler Pads</h3>
            <div id="drum-pads-container-${track.id}" class="mt-2"></div>
            <div id="drum-pad-controls-container-${track.id}" class="mt-2"></div>
        </div>
    `;
    const padsContainer = container.querySelector(`#drum-pads-container-${track.id}`);
    const controlsContainer = container.querySelector(`#drum-pad-controls-container-${track.id}`);
    renderDrumSamplerPads(track, padsContainer);
    updateDrumPadControlsUI(track, controlsContainer);
}

function buildInstrumentSamplerControls(track, container) {
    container.innerHTML = `
        <div class="panel">
            <h3 class="font-bold mb-2">Instrument Sampler</h3>
            <div id="dropZoneContainer-instrument-${track.id}">
                ${createDropZoneHTML(`instrument-file-input-${track.id}`)}
            </div>
            <canvas id="waveform-canvas-instrument-${track.id}" class="waveform-canvas mt-2"></canvas>
            
            <div class="mt-4 grid grid-cols-2 gap-2">
                <div id="instrumentSamplerVolume-${track.id}-placeholder"></div>
                <div id="instrumentSamplerPitchShift-${track.id}-placeholder"></div>
            </div>

            <div class="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
                <h4 class="col-span-2 font-semibold mt-2">Envelope</h4>
                <div id="instrumentSamplerEnvAttack-${track.id}-placeholder"></div>
                <div id="instrumentSamplerEnvDecay-${track.id}-placeholder"></div>
                <div id="instrumentSamplerEnvSustain-${track.id}-placeholder"></div>
                <div id="instrumentSamplerEnvRelease-${track.id}-placeholder"></div>
            </div>
        </div>
    `;
    const dzContainerEl = container.querySelector(`#dropZoneContainer-instrument-${track.id}`);
    const dzEl = dzContainerEl.querySelector('.drop-zone');
    // setupGenericDropZoneListeners is imported from utils.js
    setupGenericDropZoneListeners(
        dzEl,
        track.id,
        'InstrumentSampler',
        null,
        localAppServices.loadSoundFromBrowserToTarget,
        localAppServices.loadSampleFile
    );

    const fileInputEl = dzContainerEl.querySelector(`#instrument-file-input-${track.id}`);
    if (fileInputEl) { // Check if element exists before attaching event
        fileInputEl.onchange = (e) => localAppServices.loadSampleFile(e, track.id, 'InstrumentSampler');
    }
    
    const canvas = container.querySelector(`#waveform-canvas-instrument-${track.id}`);
    if(canvas && track.instrumentSamplerSettings.audioBuffer) { // Check if canvas exists before drawing
        drawWaveform(canvas, track.instrumentSamplerSettings.audioBuffer);
    }

    const volumeKnobPlaceholder = container.querySelector(`#instrumentSamplerVolume-${track.id}-placeholder`);
    if (volumeKnobPlaceholder) {
        const initialVolume = track.previousVolumeBeforeMute;
        const volumeKnob = localAppServices.createKnob({
            label: 'Volume',
            min: 0,
            max: 1.2,
            step: 0.01,
            initialValue: initialVolume,
            onValueChange: (val, oldVal, fromInteraction) => {
                track.setVolume(val, fromInteraction);
            }
        }, localAppServices.captureStateForUndo);
        volumeKnobPlaceholder.appendChild(volumeKnob.element);
    }

    const pitchShiftKnobPlaceholder = container.querySelector(`#instrumentSamplerPitchShift-${track.id}-placeholder`);
    if (pitchShiftKnobPlaceholder) {
        const initialPitchShift = track.instrumentSamplerSettings.pitchShift || 0;
        const pitchKnob = localAppServices.createKnob({
            label: 'Pitch',
            min: -24,
            max: 24,
            step: 1,
            initialValue: initialPitchShift,
            onValueChange: (val) => {
                track.instrumentSamplerSettings.pitchShift = val;
            }
        }, localAppServices.captureStateForUndo);
        pitchShiftKnobPlaceholder.appendChild(pitchKnob.element); // Corrected: Append the element property of the knob object
    }

    const envelopeParams = [
        { id: 'EnvAttack', label: 'Attack', min: 0.001, max: 2, step: 0.001, decimals: 3, path: 'envelope.attack' },
        { id: 'EnvDecay', label: 'Decay', min: 0.01, max: 2, step: 0.01, decimals: 2, path: 'envelope.decay' },
        { id: 'EnvSustain', label: 'Sustain', min: 0, max: 1, step: 0.01, decimals: 2, path: 'envelope.sustain' },
        { id: 'EnvRelease', label: 'Release', min: 0.01, max: 5, step: 0.01, decimals: 2, path: 'envelope.release' },
    ];

    envelopeParams.forEach(paramDef => {
        const placeholder = container.querySelector(`#instrumentSampler${paramDef.id}-${track.id}-placeholder`);
        if (placeholder) {
            const initialValue = getNestedParam(track.instrumentSamplerSettings, paramDef.path) !== undefined
                                 ? getNestedParam(track.instrumentSamplerSettings, paramDef.path)
                                 : paramDef.defaultValue;

            const knob = localAppServices.createKnob({
                label: paramDef.label,
                min: paramDef.min,
                max: paramDef.max,
                step: paramDef.step,
                initialValue: initialValue,
                decimals: paramDef.decimals,
                onValueChange: (val) => {
                    let current = track.instrumentSamplerSettings;
                    const keys = paramDef.path.split('.');
                    for (let i = 0; i < keys.length - 1; i++) {
                        current = current[keys[i]] = current[keys[i]] || {};
                    }
                    current[keys[keys.length - 1]] = val;

                    if (track.instrument && track.instrument[keys[0]] && typeof track.instrument[keys[0]].set === 'function') {
                        track.instrument[keys[0]].set({ [keys.slice(1).join('.')]: val });
                    }
                }
            }, localAppServices.captureStateForUndo);
            placeholder.appendChild(knob.element);
        }
    });
}