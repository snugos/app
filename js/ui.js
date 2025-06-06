// js/ui.js
import { SnugWindow } from './SnugWindow.js';
import { showNotification, createDropZoneHTML, setupGenericDropZoneListeners, showCustomModal, createContextMenu, showConfirmationDialog } from './utils.js';
import * as Constants from './constants.js';
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenPianoRoll as handleOpenSequencer
} from './eventHandlers.js';

let localAppServices = {};

export function initializeUIModule(appServicesFromMain) {
    localAppServices = { ...localAppServices, ...appServicesFromMain };
    if (!localAppServices.effectsRegistryAccess) {
        console.warn("[UI Module] effectsRegistryAccess not found. UI may be limited.");
        localAppServices.effectsRegistryAccess = {
            AVAILABLE_EFFECTS: {},
            getEffectParamDefinitions: () => [],
            getEffectDefaultParams: () => ({}),
            synthEngineControlDefinitions: {}
        };
    }
}

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
    const maxDegrees = 270;
    let initialValueBeforeInteraction = currentValue;
    function updateKnobVisual(disabled = false) {
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
        if (step !== 0) boundedValue = Math.round(boundedValue / step) * step;
        currentValue = Math.min(max, Math.max(min, boundedValue));
        updateKnobVisual(options.disabled);
        if (triggerCallback && options.onValueChange) {
            options.onValueChange(currentValue, null, fromInteraction);
        }
    }
    knobEl.addEventListener('mousedown', (e) => {
        e.preventDefault();
        initialValueBeforeInteraction = currentValue;
        const startY = e.clientY;
        const startValue = currentValue;
        function onMove(moveEvent) {
            const deltaY = startY - moveEvent.clientY;
            let valueChange = (deltaY / 300) * range;
            setValue(startValue + valueChange, true, true);
        }
        function onEnd() {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onEnd);
            if (currentValue !== initialValueBeforeInteraction && localAppServices.captureStateForUndo) {
                localAppServices.captureStateForUndo(`Change ${options.label} to ${valueEl.textContent}`);
            }
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onEnd);
    });
    setValue(currentValue, false);
    return { element: container, setValue, getValue: () => currentValue, type: 'knob' };
}

function buildSynthSpecificInspectorDOM(track) {
    const engineType = track.synthEngineType || 'MonoSynth';
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
    let controlsHTML = `<div id="synthEngineControls-${track.id}" class="grid grid-cols-2 md:grid-cols-3 gap-2 p-1">`;
    definitions.forEach(def => { controlsHTML += `<div id="${def.idPrefix}-${track.id}-placeholder"></div>`; });
    controlsHTML += `</div>`;
    return controlsHTML;
}

function buildSamplerSpecificInspectorDOM(track) {
    return `<div class="sampler-controls p-1 space-y-2">
        <div id="dropZoneContainer-${track.id}-sampler" class="mb-2"></div>
        <div class="waveform-section border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600">
            <canvas id="waveformCanvas-${track.id}" class="w-full h-24 bg-white dark:bg-slate-800 rounded shadow-inner"></canvas>
        </div>
        <div class="slice-editor-controls mt-2 p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1">
            <h4 class="text-xs font-semibold dark:text-slate-200">Slice Editor (Selected: <span id="selectedSliceInfo-${track.id}">1</span>)</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1 items-center text-xs">
                <div id="sliceVolumeSlider-${track.id}-placeholder"></div>
                <div id="slicePitchKnob-${track.id}-placeholder"></div>
                <button id="sliceLoopToggle-${track.id}" class="px-1.5 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Loop: OFF</button>
                <button id="sliceReverseToggle-${track.id}" class="px-1.5 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Rev: OFF</button>
            </div>
            <div class="text-xs font-medium mt-1 dark:text-slate-300">Envelope:</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 items-center text-xs">
                <div id="sliceEnvAttackSlider-${track.id}-placeholder"></div>
                <div id="sliceEnvDecaySlider-${track.id}-placeholder"></div>
                <div id="sliceEnvSustainSlider-${track.id}-placeholder"></div>
                <div id="sliceEnvReleaseSlider-${track.id}-placeholder"></div>
            </div>
            </div>
        <div id="samplePadsContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>
        <div><button id="slicerPolyphonyToggle-${track.id}" class="text-xs px-2 py-1 border rounded mt-1 dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Mode: Poly</button></div>
    </div>`;
}

function buildDrumSamplerSpecificInspectorDOM(track) {
    return `<div class="drum-sampler-controls p-1 space-y-2">
        <div class="selected-pad-controls p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1">
            <h4 class="text-xs font-semibold dark:text-slate-200">Edit Pad: <span id="selectedDrumPadInfo-${track.id}">1</span></h4>
            <div id="drumPadDropZoneContainer-${track.id}-${track.selectedDrumPadForEdit}" class="mb-1 text-xs"></div>
            <div class="grid grid-cols-2 gap-x-2 gap-y-1 items-center text-xs">
                <div id="drumPadVolumeKnob-${track.id}-placeholder"></div>
                <div id="drumPadPitchKnob-${track.id}-placeholder"></div>
            </div>
            <div class="text-xs font-medium mt-1 dark:text-slate-300">Envelope:</div>
             <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 items-center text-xs">
                <div id="drumPadEnvAttack-${track.id}-placeholder"></div>
                <div id="drumPadEnvDecay-${track.id}-placeholder"></div>
                <div id="drumPadEnvSustain-${track.id}-placeholder"></div>
                <div id="drumPadEnvRelease-${track.id}-placeholder"></div>
            </div>
            <div class="text-xs font-medium mt-2 pt-1 border-t dark:border-slate-600 dark:text-slate-300">Auto-Stretch:</div>
            <div class="grid grid-cols-2 gap-x-2 gap-y-1 items-center text-xs">
                <button id="drumPadAutoStretchToggle-${track.id}" class="px-1.5 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Stretch: OFF</button>
            </div>
         </div>
        <div id="drumPadsGridContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>
    </div>`;
}

function buildInstrumentSamplerSpecificInspectorDOM(track) {
     return `<div class="instrument-sampler-controls p-1 space-y-2">
        <div id="dropZoneContainer-${track.id}-instrumentsampler" class="mb-2"></div>
        <div class="waveform-section border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600">
           <canvas id="instrumentWaveformCanvas-${track.id}" class="w-full h-24 bg-white dark:bg-slate-800 rounded shadow-inner"></canvas>
        </div>
        <div class="instrument-params-controls mt-2 p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1 text-xs">
             <div class="text-xs font-medium mt-1 dark:text-slate-300">Envelope:</div>
             <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 items-center text-xs">
                <div id="instrumentEnvAttack-${track.id}-placeholder"></div>
                <div id="instrumentEnvDecay-${track.id}-placeholder"></div>
                <div id="instrumentEnvSustain-${track.id}-placeholder"></div>
                <div id="instrumentEnvRelease-${track.id}-placeholder"></div>
            </div>
            <div><button id="instrumentPolyphonyToggle-${track.id}" class="text-xs px-2 py-1 border rounded mt-1 dark:border-slate-500">Mode: Poly</button></div>
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

    const armedTrackId = localAppServices.getArmedTrackId ? localAppServices.getArmedTrackId() : null;
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
            <div id="trackMeterContainer-${track.id}"><div id="trackMeterBar-${track.id}"></div></div>
            <div class="type-specific-controls mt-1 border-t pt-1">${specificControlsHTML}</div>
            <div class="inspector-nav grid grid-cols-3 gap-1 mt-2">
                <button id="openEffectsBtn-${track.id}">Effects</button>
                ${sequencerButtonHTML}
                <button id="removeTrackBtn-${track.id}">Remove</button>
            </div>
        </div>`;
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
        dzContainerEl.innerHTML = createDropZoneHTML(track.id, `fileInput-${track.id}`, 'Sampler', null, { originalFileName: track.samplerAudioData.fileName, status: track.samplerAudioData.status || (track.samplerAudioData.fileName ? 'missing' : 'empty') });
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        const fileInputEl = dzContainerEl.querySelector(`#fileInput-${track.id}`);
        if (dzEl) setupGenericDropZoneListeners(dzEl, track.id, 'Sampler', null, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadSampleFile);
        if (fileInputEl) fileInputEl.onchange = (e) => localAppServices.loadSampleFile(e, track.id, 'Sampler');
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
    if(dzContainerEl) {
        dzContainerEl.innerHTML = createDropZoneHTML(track.id, `instrumentFileInput-${track.id}`, 'InstrumentSampler', null, { originalFileName: track.instrumentSamplerSettings.originalFileName, status: track.instrumentSamplerSettings.status || (track.instrumentSamplerSettings.originalFileName ? 'missing' : 'empty') });
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        const fileInputEl = dzContainerEl.querySelector(`#instrumentFileInput-${track.id}`);
        if(dzEl) setupGenericDropZoneListeners(dzEl, track.id, 'InstrumentSampler', null, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadSampleFile);
        if(fileInputEl) fileInputEl.onchange = (e) => { localAppServices.loadSampleFile(e, track.id, 'InstrumentSampler'); };
    }
    const canvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`);
    if (canvas) {
        track.instrumentWaveformCanvasCtx = canvas.getContext('2d');
        if(track.instrumentSamplerSettings.audioBuffer?.loaded) drawInstrumentWaveform(track);
    }
}

export function openTrackInspectorWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById(trackId);
    if (!track) return null;
    const windowId = `trackInspector-${trackId}`;
    if (localAppServices.getOpenWindows().has(windowId) && !savedState) {
        localAppServices.getOpenWindows().get(windowId).restore();
        return localAppServices.getOpenWindows().get(windowId);
    }
    const contentDOM = buildTrackInspectorContentDOM(track);
    const inspectorOptions = { width: 320, height: 450, minWidth: 280, minHeight: 350, initialContentKey: windowId };
    if (savedState) Object.assign(inspectorOptions, savedState);
    const inspectorWindow = localAppServices.createWindow(windowId, `Inspector: ${track.name}`, contentDOM, inspectorOptions);
    if (inspectorWindow?.element) {
        initializeCommonInspectorControls(track, inspectorWindow.element);
        initializeTypeSpecificInspectorControls(track, inspectorWindow.element);
    }
    return inspectorWindow;
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
        const knob = createKnob({ label: 'Volume', min: 0, max: 1.2, step: 0.01, initialValue: track.previousVolumeBeforeMute, onValueChange: (val, o, fromInteraction) => track.setVolume(val, fromInteraction) });
        volumeKnobPlaceholder.appendChild(knob.element);
        track.inspectorControls.volume = knob;
    }
}

export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    if (!listDiv) return;
    listDiv.innerHTML = '';
    const effectsArray = (ownerType === 'track') ? owner.activeEffects : localAppServices.getMasterEffects();
    if (!effectsArray || effectsArray.length === 0) {
        listDiv.innerHTML = '<p class="text-xs text-gray-500 italic">No effects added.</p>';
        if (controlsContainer) controlsContainer.innerHTML = '';
        return;
    }
    effectsArray.forEach(effect => {
        const displayName = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS[effect.type]?.displayName || effect.type;
        const item = document.createElement('div');
        item.innerHTML = `<span>${displayName}</span><button class="remove-btn">X</button>`;
        item.querySelector('.remove-btn').addEventListener('click', () => {
            if (ownerType === 'track') owner.removeEffect(effect.id);
            else localAppServices.removeMasterEffect(effect.id);
        });
        item.addEventListener('click', () => renderEffectControls(owner, ownerType, effect.id, controlsContainer));
        listDiv.appendChild(item);
    });
}

export function renderEffectControls(owner, ownerType, effectId, controlsContainer) {
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    const effect = ((ownerType === 'track') ? owner.activeEffects : localAppServices.getMasterEffects()).find(e => e.id === effectId);
    if (!effect) return;
    const effectDef = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS[effect.type];
    if (!effectDef) return;
    const grid = document.createElement('div');
    effectDef.params.forEach(paramDef => {
        if (paramDef.type === 'knob') {
            const knob = createKnob({ label: paramDef.label, min: paramDef.min, max: paramDef.max, step: paramDef.step, initialValue: effect.params[paramDef.key], onValueChange: val => {
                if (ownerType === 'track') owner.updateEffectParam(effect.id, paramDef.key, val);
                else localAppServices.updateMasterEffectParam(effect.id, paramDef.key, val);
            }});
            grid.appendChild(knob.element);
        }
    });
    controlsContainer.appendChild(grid);
}

function showAddEffectModal(owner, ownerType) {
    let content = '<ul>';
    for (const key in localAppServices.effectsRegistryAccess.AVAILABLE_EFFECTS) {
        content += `<li data-effect="${key}">${localAppServices.effectsRegistryAccess.AVAILABLE_EFFECTS[key].displayName}</li>`;
    }
    content += '</ul>';
    const modal = showCustomModal('Add Effect', content, []);
    modal.contentDiv.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => {
            if (ownerType === 'track') owner.addEffect(li.dataset.effect);
            else localAppServices.addMasterEffect(li.dataset.effect);
            modal.overlay.remove();
        });
    });
}

export function openTrackEffectsRackWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById(trackId);
    if (!track) return null;
    const windowId = `effectsRack-${trackId}`;
    if (localAppServices.getOpenWindows().has(windowId) && !savedState) {
        localAppServices.getOpenWindows().get(windowId).restore(); return;
    }
    const contentDOM = buildModularEffectsRackDOM(track, 'track');
    const rackWindow = localAppServices.createWindow(windowId, `Effects: ${track.name}`, contentDOM, {});
    if (rackWindow?.element) {
        renderEffectsList(track, 'track', rackWindow.element.querySelector(`#effectsList-${trackId}`), rackWindow.element.querySelector(`#effectControlsContainer-${trackId}`));
        rackWindow.element.querySelector(`#addEffectBtn-${trackId}`)?.addEventListener('click', () => showAddEffectModal(track, 'track'));
    }
}

export function openMasterEffectsRackWindow(savedState = null) {
    const windowId = 'masterEffectsRack';
    if (localAppServices.getOpenWindows().has(windowId) && !savedState) {
        localAppServices.getOpenWindows().get(windowId).restore(); return;
    }
    const contentDOM = buildModularEffectsRackDOM(null, 'master');
    const rackWindow = localAppServices.createWindow(windowId, 'Master Effects Rack', contentDOM, {});
    if (rackWindow?.element) {
        renderEffectsList(null, 'master', rackWindow.element.querySelector('#effectsList-master'), rackWindow.element.querySelector('#effectControlsContainer-master'));
        rackWindow.element.querySelector('#addEffectBtn-master')?.addEventListener('click', () => showAddEffectModal(null, 'master'));
    }
}

export function openMixerWindow(savedState = null) {
    const windowId = 'mixer';
    if (localAppServices.getOpenWindows().has(windowId) && !savedState) {
        localAppServices.getOpenWindows().get(windowId).restore(); return;
    }
    const content = document.createElement('div');
    content.id = 'mixerContentContainer';
    const mixerWindow = localAppServices.createWindow(windowId, 'Mixer', content, {});
    if (mixerWindow?.element) updateMixerWindow();
}

export function updateMixerWindow() {
    const mixerWindow = localAppServices.getWindowById('mixer');
    if (!mixerWindow?.element || mixerWindow.isMinimized) return;
    renderMixer(mixerWindow.element.querySelector('#mixerContentContainer'));
}

export function renderMixer(container) {
    if (!container) return;
    container.innerHTML = '';
    getTracksState().forEach(track => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'mixer-track';
        trackDiv.innerHTML = `<div class="track-name">${track.name}</div>`;
        container.appendChild(trackDiv);
    });
}

export function drawWaveform(track) {
    if (!track?.waveformCanvasCtx || !track.audioBuffer?.loaded) return;
    const canvas = track.waveformCanvasCtx.canvas; const ctx = track.waveformCanvasCtx;
    const buffer = track.audioBuffer.get(); const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width); const amp = canvas.height / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.beginPath();
    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0; let max = -1.0;
        for (let j = 0; j < step; j++) { const datum = data[(i * step) + j]; if (datum < min) min = datum; if (datum > max) max = datum; }
        ctx.moveTo(i, (1 + min) * amp); ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();
}

export function drawInstrumentWaveform(track) {
    if (!track?.instrumentWaveformCanvasCtx || !track.instrumentSamplerSettings.audioBuffer?.loaded) return;
    const canvas = track.instrumentWaveformCanvasCtx.canvas; const ctx = track.instrumentWaveformCanvasCtx;
    const buffer = track.instrumentSamplerSettings.audioBuffer.get(); const data = buffer.getChannelData(0);
    // ... drawing logic
}

export function renderSamplePads(track) {
    const inspector = localAppServices.getWindowById(`trackInspector-${track.id}`)?.element;
    if (!inspector || track.type !== 'Sampler') return;
    const padsContainer = inspector.querySelector(`#samplePadsContainer-${track.id}`);
    if (!padsContainer) return; padsContainer.innerHTML = '';
    track.slices.forEach((slice, index) => {
        const pad = document.createElement('button');
        pad.className = `pad-button ${track.selectedSliceForEdit === index ? 'selected-for-edit' : ''}`;
        pad.innerHTML = `<span class="pad-number">${index + 1}</span>`;
        pad.disabled = !track.audioBuffer?.loaded || slice.duration <= 0;
        pad.addEventListener('click', () => { track.selectedSliceForEdit = index; localAppServices.playSlicePreview?.(track.id, index); renderSamplePads(track); updateSliceEditorUI(track); });
        padsContainer.appendChild(pad);
    });
}

export function updateSliceEditorUI(track) {
    const inspector = localAppServices.getWindowById(`trackInspector-${track.id}`)?.element;
    if (!inspector || track.type !== 'Sampler' || !track.slices?.length) return;
    const editorContainer = inspector.querySelector(`#slice-editor-container-${track.id}`); if (!editorContainer) return;
    const slice = track.slices[track.selectedSliceForEdit]; if (!slice) return;
    if (!track.inspectorControls.sliceVolume) {
        editorContainer.innerHTML = `<h4 class="text-xs font-semibold">Slice Editor (Selected: <span id="selectedSliceInfo-${track.id}">${track.selectedSliceForEdit + 1}</span>)</h4><div class="grid grid-cols-2 gap-2">...</div>`; // Simplified
        const create = (id, opts) => importedCreateKnob(opts, localAppServices);
        track.inspectorControls.sliceVolume = create(/*...args...*/); //... etc for all knobs
    }
    track.inspectorControls.sliceVolume.setValue(slice.volume);
    track.inspectorControls.slicePitch.setValue(slice.pitchShift);
    track.inspectorControls.sliceEnvAttack.setValue(slice.envelope.attack);
    track.inspectorControls.sliceEnvDecay.setValue(slice.envelope.decay);
    track.inspectorControls.sliceEnvSustain.setValue(slice.envelope.sustain);
    track.inspectorControls.sliceEnvRelease.setValue(slice.envelope.release);
}

export function renderDrumSamplerPads(track) {
    const inspector = localAppServices.getWindowById(`trackInspector-${track.id}`)?.element;
    if (!inspector || track.type !== 'DrumSampler') return;
    const padsContainer = inspector.querySelector(`#drumPadsGridContainer-${track.id}`);
    if (!padsContainer) return; padsContainer.innerHTML = '';
    track.drumSamplerPads.forEach((padData, index) => {
        const padEl = document.createElement('button');
        padEl.className = `pad-button ${track.selectedDrumPadForEdit === index ? 'selected-for-edit' : ''}`;
        padEl.innerHTML = `<span class="pad-number">${index + 1}</span><span class="pad-label">${padData.originalFileName?.split('.')[0] || ''}</span>`;
        padEl.addEventListener('click', () => { track.selectedDrumPadForEdit = index; localAppServices.playDrumSamplerPadPreview?.(track.id, index); renderDrumSamplerPads(track); updateDrumPadControlsUI(track); });
        padsContainer.appendChild(padEl);
    });
}

export function updateDrumPadControlsUI(track) {
    const inspector = localAppServices.getWindowById(`trackInspector-${track.id}`)?.element;
    if (!inspector || track.type !== 'DrumSampler') return;
    const editorContainer = inspector.querySelector(`#drum-pad-editor-container-${track.id}`); if (!editorContainer) return;
    const selectedPadIndex = track.selectedDrumPadForEdit; const padData = track.drumSamplerPads[selectedPadIndex]; if (!padData) return;
    editorContainer.innerHTML = `<h4>Edit Pad: ${selectedPadIndex + 1}</h4>`;
    const dzHTML = createDropZoneHTML(track.id, `drumPadFileInput-${track.id}-${selectedPadIndex}`, 'DrumSampler', selectedPadIndex, padData);
    editorContainer.innerHTML += dzHTML;
}

export function updateSequencerCellUI() {}
export function highlightPlayingStep() {}
export function openPianoRollWindow() {}
