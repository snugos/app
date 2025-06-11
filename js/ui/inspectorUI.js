// js/ui/inspectorUI.js

import { createDropZoneHTML, setupGenericDropZoneListeners, drawWaveform } from '../utils.js';
import * as Constants from '../constants.js';

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

    for (let i = 0; i < Constants.numSlices; i++) {
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
            label: 'Pitch', min: -24, max: 24, step: 1, initialValue: slice.pitchShift || 0,
            onValueChange: (val) => { slice.pitchShift = val; }
        }, localAppServices);
        pitchKnobEl.appendChild(knob.element);
    }
}

export function renderDrumSamplerPads(track, container) {
    if (!container) return;
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-4 gap-2';

    for (let i = 0; i < Constants.numDrumSamplerPads; i++) {
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
            renderDrumSamplerPads(track, container); // Re-render to update selection
        });

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
    const volKnob = localAppServices.createKnob({
        label: 'Volume', min: 0, max: 1.2, step: 0.01, initialValue: padData.volume || 0.7,
        onValueChange: (val) => { padData.volume = val; }
    }, localAppServices);
    volContainer.appendChild(volKnob.element);
    
    const pitchContainer = controlsGrid.querySelector(`#pitchKnob-drumpad-${padIndex}-placeholder`);
    const pitchKnob = localAppServices.createKnob({
        label: 'Pitch', min: -24, max: 24, step: 1, initialValue: padData.pitchShift || 0,
        onValueChange: (val) => { padData.pitchShift = val; }
    }, localAppServices);
    pitchContainer.appendChild(pitchKnob.element);

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
    
    // Check if the window is already open
    const existingWindow = localAppServices.getOpenWindows().get(windowId);

    if (existingWindow) {
        // If savedState is NOT provided, it means this call is from a menu click (e.g., "Open Inspector")
        // and the window is already open, so just restore/focus it.
        if (!savedState) {
            existingWindow.restore();
            return existingWindow;
        } else {
            // If savedState *IS* provided, it means we are trying to re-render an existing window
            // (e.g., from handleTrackUIUpdate). We must close the old one first to avoid duplicates
            // and ensure fresh elements/listeners, then proceed to create the new one with saved state.
            existingWindow.close(true); // Close silently
        }
    }

    const contentDOM = buildTrackInspectorContentDOM(track);
    // Apply savedState if provided, which will include x, y, width, height, etc.
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
    // --- DEBUG: Verifying button elements are found ---
    console.log(`[inspectorUI.js] Initializing common controls for track: ${track.id}`);

    const muteBtn = element.querySelector(`#muteBtn-${track.id}`);
    if (muteBtn) { // Added null check
        console.log(`[inspectorUI.js] Found muteBtn-${track.id}`);
        muteBtn.addEventListener('click', () => {
            console.log(`[inspectorUI.js] Click event fired for muteBtn-${track.id}`);
            localAppServices.handleTrackMute(track.id);
        });
    } else {
        console.warn(`[inspectorUI.js] Mute button with ID muteBtn-${track.id} not found.`);
    }

    const soloBtn = element.querySelector(`#soloBtn-${track.id}`);
    if (soloBtn) { // Added null check
        console.log(`[inspectorUI.js] Found soloBtn-${track.id}`);
        soloBtn.addEventListener('click', () => {
            console.log(`[inspectorUI.js] Click event fired for soloBtn-${track.id}`);
            localAppServices.handleTrackSolo(track.id);
        });
    } else {
        console.warn(`[inspectorUI.js] Solo button with ID soloBtn-${track.id} not found.`);
    }

    const armBtn = element.querySelector(`#armInputBtn-${track.id}`);
    if (armBtn) { // Added null check
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

    // REMOVED THE FOLLOWING LINES TO PREVENT INFINITE LOOP:
    // localAppServices.updateTrackUI(track.id, 'soloChanged'); 
    // localAppServices.updateTrackUI(track.id, 'muteChanged'); 
    // localAppServices.updateTrackUI(track.id, 'armChanged'); 
}

function buildSynthControls(track, container) {
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
    setupGenericDropZoneListeners(dzEl, track.id, 'Sampler', null, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadSampleFile);
    
    const fileInputEl = dzContainerEl.querySelector(`#slicer-file-input-${track.id}`);
    fileInputEl.onchange = (e) => localAppServices.loadSampleFile(e, track.id, 'Sampler');
    
    const canvas = container.querySelector(`#waveform-canvas-${track.id}`);
    if (track.audioBuffer) {
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
    // Add HTML structure for Instrument Sampler controls, including placeholders for knobs
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
    setupGenericDropZoneListeners(dzEl, track.id, 'InstrumentSampler', null, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadSampleFile);

    const fileInputEl = dzContainerEl.querySelector(`#instrument-file-input-${track.id}`);
    fileInputEl.onchange = (e) => localAppServices.loadSampleFile(e, track.id, 'InstrumentSampler');
    
    const canvas = container.querySelector(`#waveform-canvas-instrument-${track.id}`);
    if(track.instrumentSamplerSettings.audioBuffer) {
        drawWaveform(canvas, track.instrumentSamplerSettings.audioBuffer);
    }

    // --- NEW: Add knob creation logic for Instrument Sampler parameters ---

    // Volume Knob
    const volumeKnobPlaceholder = container.querySelector(`#instrumentSamplerVolume-${track.id}-placeholder`);
    if (volumeKnobPlaceholder) {
        const initialVolume = track.previousVolumeBeforeMute; // Use track's main volume for now
        const volumeKnob = localAppServices.createKnob({
            label: 'Volume', min: 0, max: 1.2, step: 0.01,
            initialValue: initialVolume,
            onValueChange: (val, oldVal, fromInteraction) => {
                track.setVolume(val, fromInteraction); // Update track's master volume
            }
        }, localAppServices);
        volumeKnobPlaceholder.appendChild(volumeKnob.element);
    }

    // Pitch Shift Knob
    const pitchShiftKnobPlaceholder = container.querySelector(`#instrumentSamplerPitchShift-${track.id}-placeholder`);
    if (pitchShiftKnobPlaceholder) {
        const initialPitchShift = track.instrumentSamplerSettings.pitchShift || 0;
        const pitchShiftKnob = localAppServices.createKnob({
            label: 'Pitch', min: -24, max: 24, step: 1, initialValue: initialPitchShift,
            onValueChange: (val) => {
                track.instrumentSamplerSettings.pitchShift = val;
                // If instrument is already loaded, update its pitch
                if (track.instrument && track.instrumentSamplerSettings.audioBuffer && track.instrumentSamplerSettings.audioBuffer.loaded) {
                    const rootNote = track.instrumentSamplerSettings.rootNote || 'C4';
                    const playbackRate = Math.pow(2, val / 12);
                    // Sampler's triggerAttack will apply this playbackRate based on note difference,
                    // but we can ensure the base pitch shift is applied if the sampler has a 'pitch' property
                    // Tone.js Sampler doesn't directly have a global pitch property like an oscillator.
                    // Instead, pitch shifting applies per note, so we store it and apply on trigger.
                    // For now, this knob just updates the setting. The Sampler logic needs to read this.
                }
            }
        }, localAppServices);
        pitchShiftKnobPlaceholder.appendChild(pitchShiftKnob.element);
    }

    // Envelope Knobs (Attack, Decay, Sustain, Release)
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
                                 : paramDef.defaultValue; // Use defaultValue from a common source if available

            const knob = localAppServices.createKnob({
                label: paramDef.label,
                min: paramDef.min,
                max: paramDef.max,
                step: paramDef.step,
                initialValue: initialValue,
                decimals: paramDef.decimals,
                onValueChange: (val) => {
                    // Update track's instrumentSamplerSettings
                    let current = track.instrumentSamplerSettings;
                    const keys = paramDef.path.split('.');
                    for (let i = 0; i < keys.length - 1; i++) {
                        current = current[keys[i]] = current[keys[i]] || {};
                    }
                    current[keys[keys.length - 1]] = val;

                    // Apply to the Tone.js instrument if it exists
                    if (track.instrument && track.instrument[keys[0]] && typeof track.instrument[keys[0]].set === 'function') {
                        track.instrument[keys[0]].set({ [keys.slice(1).join('.')]: val });
                    }
                }
            }, localAppServices);
            placeholder.appendChild(knob.element);
        }
    });
}
