// js/ui.js - Main UI Orchestration and Window Management
import { SnugWindow } from './SnugWindow.js';
import { showNotification, createDropZoneHTML, setupGenericDropZoneListeners, showCustomModal, createContextMenu, showConfirmationDialog } from './utils.js';
import * as Constants from './constants.js';
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, 
    handleOpenPianoRoll 
} from './eventHandlers.js';
import { getTracksState } from './state.js';

import { createKnob as importedCreateKnob } from './ui/knobUI.js';
import { 
    initializeTimelineUI, 
    openTimelineWindow as importedOpenTimelineWindow, 
    renderTimeline as importedRenderTimeline, 
    updatePlayheadPosition as importedUpdatePlayheadPosition 
} from './ui/timelineUI.js';
import { 
    initializeSoundBrowserUI, 
    openSoundBrowserWindow as importedOpenSoundBrowserWindow, 
    updateSoundBrowserDisplayForLibrary as importedUpdateSoundBrowserDisplayForLibrary, 
    renderSoundBrowserDirectory as importedRenderSoundBrowserDirectory 
} from './ui/soundBrowserUI.js';
import { 
    initializePianoRollUI,
    createPianoRollStage 
} from './ui/pianoRollUI.js';
import { 
    initializeYouTubeImporterUI,
    openYouTubeImporterWindow as importedOpenYouTubeImporterWindow 
} from './ui/youtubeImporterUI.js';

let localAppServices = {};

export function initializeUIModule(appServicesFromMain) {
    localAppServices = { ...localAppServices, ...appServicesFromMain };
    initializeTimelineUI(localAppServices);
    initializeSoundBrowserUI(localAppServices);
    initializePianoRollUI(localAppServices);
    initializeYouTubeImporterUI(localAppServices);
    
    if (localAppServices && !localAppServices.createKnob) {
        localAppServices.createKnob = (options) => importedCreateKnob(options, localAppServices);
    }
}

// --- Specific Inspector DOM Builders ---
function buildSynthSpecificInspectorDOM(track) {
    const engineType = track.synthEngineType || 'MonoSynth';
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
    let controlsHTML = `<div id="synth-engine-controls-${track.id}" class="grid grid-cols-3 gap-2 p-1">`;
    definitions.forEach(def => { controlsHTML += `<div id="${def.idPrefix}-placeholder-${track.id}"></div>`; });
    controlsHTML += `</div>`;
    return controlsHTML;
}

function buildSamplerSpecificInspectorDOM(track) {
    const dropZoneHTML = createDropZoneHTML(track.id, `sampler-file-input-${track.id}`, 'sampler', null, track.samplerAudioData);
    return `<div class="p-1 space-y-2">
        <div class="panel">${dropZoneHTML}
            <div class="mt-2"><canvas id="waveformCanvas-${track.id}" class="waveform-canvas"></canvas></div>
        </div>
        <div class="panel mt-2"><h4 class="text-xs font-bold uppercase mb-1">Slicer</h4>
            <div id="samplePadsContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>
        </div>
        <div id="slice-editor-container-${track.id}" class="panel mt-2"></div>
    </div>`;
}

function buildDrumSamplerSpecificInspectorDOM(track) {
    return `<div class="p-1 space-y-2">
        <div class="panel"><div id="drumPadsGridContainer-${track.id}" class="grid grid-cols-4 gap-1"></div></div>
        <div id="drum-pad-editor-container-${track.id}" class="panel mt-2"></div>
    </div>`;
}

function buildInstrumentSamplerSpecificInspectorDOM(track) {
    const dropZoneHTML = createDropZoneHTML(track.id, `inst-sampler-file-input-${track.id}`, 'instrumentsampler', null, track.instrumentSamplerSettings);
    return `<div class="p-1 space-y-2">
        <div class="panel">${dropZoneHTML}
            <div class="mt-2"><canvas id="instrumentWaveformCanvas-${track.id}" class="waveform-canvas"></canvas></div>
        </div>
        <div id="inst-sampler-controls-container-${track.id}" class="panel mt-2"></div>
    </div>`;
}

// --- Specific Inspector Control Initializers ---
function initializeSynthSpecificControls(track, winEl) {
    const engineType = track.synthEngineType || 'MonoSynth';
    const container = winEl.querySelector(`#synth-engine-controls-${track.id}`);
    if (!container) return;
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
    definitions.forEach(def => {
        const placeholder = container.querySelector(`#${def.idPrefix}-placeholder-${track.id}`);
        if (!placeholder) return;
        const initialValue = def.path.split('.').reduce((o, i) => o?.[i], track.synthParams) ?? def.defaultValue;
        if (def.type === 'knob') {
            const knob = importedCreateKnob({ label: def.label, min: def.min, max: def.max, step: def.step, initialValue, decimals: def.decimals, displaySuffix: def.displaySuffix, trackRef: track, onValueChange: (val) => track.setSynthParam(def.path, val) }, localAppServices);
            placeholder.innerHTML = ''; placeholder.appendChild(knob.element); track.inspectorControls[def.idPrefix] = knob;
        } else if (def.type === 'select') {
            const selectEl = document.createElement('select');
            selectEl.className = 'w-full p-1 border rounded text-xs dark:bg-slate-700 dark:border-slate-600';
            def.options.forEach(opt => { const option = document.createElement('option'); option.value = opt; option.textContent = opt; selectEl.appendChild(option); });
            selectEl.value = initialValue;
            selectEl.addEventListener('change', (e) => track.setSynthParam(def.path, e.target.value));
            const labelEl = document.createElement('label'); labelEl.textContent = def.label; labelEl.className = 'knob-label';
            placeholder.appendChild(labelEl); placeholder.appendChild(selectEl); track.inspectorControls[def.idPrefix] = selectEl;
        }
    });
}

function initializeSamplerSpecificControls(track, winEl) {
    const dzEl = winEl.querySelector(`.drop-zone[data-track-id="${track.id}"]`);
    if (dzEl) {
        setupGenericDropZoneListeners(dzEl, track.id, 'sampler', null, 
            (soundData, trackId) => localAppServices.loadSoundFromBrowserToTarget(soundData, trackId, 'sampler', null),
            (event, trackId) => localAppServices.loadSampleFile(event, trackId, 'sampler')
        );
        winEl.querySelector(`#sampler-file-input-${track.id}`)?.addEventListener('change', (e) => localAppServices.loadSampleFile(e, track.id, 'sampler'));
    }
    renderSamplePads(track);
    const canvas = winEl.querySelector(`#waveformCanvas-${track.id}`);
    if (canvas) {
        track.waveformCanvasCtx = canvas.getContext('2d');
        if (track.audioBuffer?.loaded) drawWaveform(track);
    }
    updateSliceEditorUI(track);
}

function initializeDrumSamplerSpecificControls(track, winEl) {
    renderDrumSamplerPads(track);
    updateDrumPadControlsUI(track);
}

function initializeInstrumentSamplerSpecificControls(track, winEl) {
    const dzEl = winEl.querySelector(`.drop-zone[data-track-id="${track.id}"]`);
    if (dzEl) {
        setupGenericDropZoneListeners(dzEl, track.id, 'instrumentsampler', null, 
            (soundData, trackId) => localAppServices.loadSoundFromBrowserToTarget(soundData, trackId, 'InstrumentSampler', null),
            (event, trackId) => localAppServices.loadSampleFile(event, trackId, 'InstrumentSampler')
        );
    }
    const canvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`);
    if (canvas) {
        track.instrumentWaveformCanvasCtx = canvas.getContext('2d');
        if(track.instrumentSamplerSettings.audioBuffer?.loaded) drawInstrumentWaveform(track);
    }
    const controlsContainer = winEl.querySelector(`#inst-sampler-controls-container-${track.id}`);
    if(controlsContainer) {
        const env = track.instrumentSamplerSettings.envelope || { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 };
        controlsContainer.innerHTML = `<div class="grid grid-cols-4 gap-2">
            <div id="instr-attack-placeholder"></div> <div id="instr-decay-placeholder"></div>
            <div id="instr-sustain-placeholder"></div> <div id="instr-release-placeholder"></div></div>`;
        const create = (id, opts) => { const p = controlsContainer.querySelector(id); if(p) p.appendChild(importedCreateKnob(opts, localAppServices).element); };
        create('#instr-attack-placeholder', { label: 'Attack', min: 0.001, max: 2, step: 0.001, initialValue: env.attack, onValueChange: val => track.setInstrumentSamplerEnv('attack', val) });
        create('#instr-decay-placeholder', { label: 'Decay', min: 0.01, max: 2, step: 0.01, initialValue: env.decay, onValueChange: val => track.setInstrumentSamplerEnv('decay', val) });
        create('#instr-sustain-placeholder', { label: 'Sustain', min: 0, max: 1, step: 0.01, initialValue: env.sustain, onValueChange: val => track.setInstrumentSamplerEnv('sustain', val) });
        create('#instr-release-placeholder', { label: 'Release', min: 0.01, max: 5, step: 0.01, initialValue: env.release, onValueChange: val => track.setInstrumentSamplerEnv('release', val) });
    }
}

// --- Track Inspector Window (Entry Point) ---
export function openTrackInspectorWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById?.(trackId);
    if (!track) { console.error(`[UI] Track ${trackId} not found for inspector.`); return null; }
    const windowId = `trackInspector-${trackId}`;
    if (localAppServices.getOpenWindows?.().has(windowId) && !savedState) {
        localAppServices.getOpenWindows().get(windowId).restore(); return;
    }
    const contentDOM = buildTrackInspectorContentDOM(track);
    const inspectorOptions = { width: 320, height: 450, minWidth: 280, minHeight: 350, initialContentKey: windowId };
    if (savedState) Object.assign(inspectorOptions, { /* state assignment */ });
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
    winEl.querySelector(`#openPianoRollBtn-${track.id}`)?.addEventListener('click', () => handleOpenPianoRoll(track.id)); 
    const volumeKnobPlaceholder = winEl.querySelector(`#volumeKnob-${track.id}-placeholder`);
    if (volumeKnobPlaceholder) {
        const knob = importedCreateKnob({ label: 'Volume', min: 0, max: 1.2, step: 0.01, initialValue: track.previousVolumeBeforeMute, onValueChange: (val, o, fromInteraction) => track.setVolume(val, fromInteraction) }, localAppServices);
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

// --- Modular Effects Rack UI ---
export function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... implementation from old file ... */ }
export function openMasterEffectsRackWindow(savedState = null) { /* ... implementation from old file ... */ }
export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) { /* ... implementation from old file ... */ }
export function renderEffectControls(owner, ownerType, effectId, controlsContainer) { /* ... implementation from old file ... */ }
function showAddEffectModal(owner, ownerType) { /* ... implementation from old file ... */ }

// --- Mixer Window ---
export function openMixerWindow(savedState = null) { /* ... implementation from old file ... */ }
export function updateMixerWindow() { /* ... implementation from old file ... */ }
export function renderMixer(container) { /* ... implementation from old file ... */ }

// --- Piano Roll Window ---
export function openPianoRollWindow(trackId, forceRedraw = false, savedState = null) { /* ... implementation from last correct version ... */ }

// --- UI Update & Drawing Functions ---
export function drawWaveform(track) {
    if (!track?.waveformCanvasCtx || !track.audioBuffer?.loaded) return;
    const canvas = track.waveformCanvasCtx.canvas; const ctx = track.waveformCanvasCtx; const buffer = track.audioBuffer.get(); const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width); const amp = canvas.height / 2;
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('background-color'); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.lineWidth = 1; ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('color'); ctx.beginPath();
    for (let i = 0; i < canvas.width; i++) { let min = 1.0; let max = -1.0; for (let j = 0; j < step; j++) { const datum = data[(i * step) + j]; if (datum < min) min = datum; if (datum > max) max = datum; } ctx.moveTo(i, (1 + min) * amp); ctx.lineTo(i, (1 + max) * amp); }
    ctx.stroke();
}
export function drawInstrumentWaveform(track) { /* ... */ }
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
        editorContainer.innerHTML = `<h4 class="text-xs font-semibold dark:text-slate-200">Slice Editor (Selected: <span id="selectedSliceInfo-${track.id}">${track.selectedSliceForEdit + 1}</span>)</h4><div class="grid grid-cols-3 gap-x-2">...</div>`; // simplified
        const create = (id, opts) => importedCreateKnob(opts, localAppServices);
        track.inspectorControls.sliceVolume = create(/*...args...*/); //... etc
    }
    track.inspectorControls.sliceVolume.setValue(slice.volume);
    track.inspectorControls.slicePitch.setValue(slice.pitchShift);
    //... update other controls
}
export function renderDrumSamplerPads(track) { /* ... */ }
export function updateDrumPadControlsUI(track) { /* ... */ }
export function updateSequencerCellUI(sequencerWindowElement, trackType, row, col, isActive) {}
export function highlightPlayingStep(trackId, col) {}

// Re-export functions from sub-modules
export {
    importedCreateKnob as createKnob,
    importedOpenTimelineWindow as openTimelineWindow,
    importedRenderTimeline as renderTimeline,
    importedUpdatePlayheadPosition as updatePlayheadPosition,
    importedOpenSoundBrowserWindow as openSoundBrowserWindow,
    importedUpdateSoundBrowserDisplayForLibrary as updateSoundBrowserDisplayForLibrary,
    importedRenderSoundBrowserDirectory as renderSoundBrowserDirectory,
    importedOpenYouTubeImporterWindow as openYouTubeImporterWindow
};
