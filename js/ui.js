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

// Import from new UI sub-modules
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


// Module-level state for appServices, to be set by main.js
let localAppServices = {};

export function initializeUIModule(appServicesFromMain) {
    localAppServices = { ...localAppServices, ...appServicesFromMain };

    // Initialize all sub-UI modules
    if (typeof initializeTimelineUI === 'function') initializeTimelineUI(localAppServices);
    if (typeof initializeSoundBrowserUI === 'function') initializeSoundBrowserUI(localAppServices);
    if (typeof initializePianoRollUI === 'function') initializePianoRollUI(localAppServices);
    if (typeof initializeYouTubeImporterUI === 'function') initializeYouTubeImporterUI(localAppServices);
    
    if (localAppServices && !localAppServices.createKnob) {
        localAppServices.createKnob = (options) => importedCreateKnob(options, localAppServices);
    }

    if (!localAppServices.effectsRegistryAccess) {
        console.warn("[UI Module] effectsRegistryAccess not found in appServices. Effect-related UI might be limited.");
        localAppServices.effectsRegistryAccess = {
            AVAILABLE_EFFECTS: {},
            getEffectParamDefinitions: () => [],
            getEffectDefaultParams: () => ({}),
            synthEngineControlDefinitions: {}
        };
    }
}


// --- START OF FULLY RESTORED IMPLEMENTATION ---

// --- Specific Inspector DOM Builders ---
function buildSynthSpecificInspectorDOM(track) {
    const engineType = track.synthEngineType || 'MonoSynth';
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
    let controlsHTML = `<div id="synth-engine-controls-${track.id}" class="grid grid-cols-3 gap-2 p-1">`;
    definitions.forEach(def => {
        controlsHTML += `<div id="${def.idPrefix}-placeholder-${track.id}"></div>`;
    });
    controlsHTML += `</div>`;
    return controlsHTML;
}

function buildSamplerSpecificInspectorDOM(track) {
    const dropZoneHTML = createDropZoneHTML(track.id, `sampler-file-input-${track.id}`, 'sampler', null, track.samplerAudioData);
    return `<div class="p-1 space-y-2">
        <div class="panel">${dropZoneHTML}
            <div id="sampler-waveform-placeholder-${track.id}" class="mt-2"><canvas id="waveformCanvas-${track.id}" class="waveform-canvas"></canvas></div>
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

        let initialValue;
        const pathParts = def.path.split('.');
        let currentValObj = track.synthParams;
        for (const key of pathParts) {
            if (currentValObj && typeof currentValObj === 'object' && key in currentValObj) {
                currentValObj = currentValObj[key];
            } else { currentValObj = undefined; break; }
        }
        initialValue = (currentValObj !== undefined) ? currentValObj : def.defaultValue;

        if (def.type === 'knob') {
            const knob = importedCreateKnob({ 
                label: def.label, min: def.min, max: def.max, step: def.step, 
                initialValue, decimals: def.decimals, displaySuffix: def.displaySuffix, 
                trackRef: track, onValueChange: (val) => track.setSynthParam(def.path, val) 
            }, localAppServices);
            placeholder.innerHTML = ''; 
            placeholder.appendChild(knob.element); 
            track.inspectorControls[def.idPrefix] = knob;
        } else if (def.type === 'select') {
            const selectEl = document.createElement('select');
            selectEl.className = 'w-full p-1 border rounded text-xs dark:bg-slate-700 dark:border-slate-600';
            def.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt; option.textContent = opt;
                selectEl.appendChild(option);
            });
            selectEl.value = initialValue;
            selectEl.addEventListener('change', (e) => track.setSynthParam(def.path, e.target.value));
            const labelEl = document.createElement('label');
            labelEl.textContent = def.label;
            labelEl.className = 'knob-label';
            placeholder.appendChild(labelEl);
            placeholder.appendChild(selectEl);
            track.inspectorControls[def.idPrefix] = selectEl;
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
        const fileInput = winEl.querySelector(`#sampler-file-input-${track.id}`);
        fileInput?.addEventListener('change', (e) => localAppServices.loadSampleFile(e, track.id, 'sampler'));
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
        const fileInput = winEl.querySelector(`#inst-sampler-file-input-${track.id}`);
        fileInput?.addEventListener('change', (e) => localAppServices.loadSampleFile(e, track.id, 'InstrumentSampler'));
    }

    const canvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`);
    if (canvas) {
        track.instrumentWaveformCanvasCtx = canvas.getContext('2d');
        if(track.instrumentSamplerSettings.audioBuffer?.loaded) drawInstrumentWaveform(track);
    }

    const controlsContainer = winEl.querySelector(`#inst-sampler-controls-container-${track.id}`);
    if(controlsContainer) {
        const env = track.instrumentSamplerSettings.envelope || { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 };
        const knobsHTML = `
            <div class="grid grid-cols-4 gap-2">
                <div id="instr-attack-placeholder"></div>
                <div id="instr-decay-placeholder"></div>
                <div id="instr-sustain-placeholder"></div>
                <div id="instr-release-placeholder"></div>
            </div>`;
        controlsContainer.innerHTML = knobsHTML;
        
        const createKnob = (id, options) => {
            const placeholder = controlsContainer.querySelector(`#${id}`);
            if(placeholder) {
                const knob = importedCreateKnob(options, localAppServices);
                placeholder.appendChild(knob.element);
            }
        }
        createKnob('instr-attack-placeholder', { label: 'Attack', min: 0.001, max: 2, step: 0.001, initialValue: env.attack, decimals: 3, onValueChange: val => track.setInstrumentSamplerEnv('attack', val) });
        createKnob('instr-decay-placeholder', { label: 'Decay', min: 0.01, max: 2, step: 0.01, initialValue: env.decay, decimals: 2, onValueChange: val => track.setInstrumentSamplerEnv('decay', val) });
        createKnob('instr-sustain-placeholder', { label: 'Sustain', min: 0, max: 1, step: 0.01, initialValue: env.sustain, decimals: 2, onValueChange: val => track.setInstrumentSamplerEnv('sustain', val) });
        createKnob('instr-release-placeholder', { label: 'Release', min: 0.01, max: 5, step: 0.01, initialValue: env.release, decimals: 2, onValueChange: val => track.setInstrumentSamplerEnv('release', val) });
    }
}


// --- Track Inspector Window (Entry Point) ---
function buildTrackInspectorContentDOM(track) {
    if (!track) return '<div>Error: Track data not found.</div>';
    let specificControlsHTML = '';
    if (track.type === 'Synth') specificControlsHTML = buildSynthSpecificInspectorDOM(track);
    else if (track.type === 'Sampler') specificControlsHTML = buildSamplerSpecificInspectorDOM(track);
    else if (track.type === 'DrumSampler') specificControlsHTML = buildDrumSamplerSpecificInspectorDOM(track);
    else if (track.type === 'InstrumentSampler') specificControlsHTML = buildInstrumentSamplerSpecificInspectorDOM(track);

    const armedTrackId = localAppServices.getArmedTrackId ? localAppServices.getArmedTrackId() : null;
    let pianoRollButtonHTML = ''; 
    if (track.type !== 'Audio') {
        pianoRollButtonHTML = `<button id="openPianoRollBtn-${track.id}" class="px-1 py-0.5 border rounded bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:border-slate-500">Piano Roll</button>`;
    }

    let monitorButtonHTML = '';
    if (track.type === 'Audio') {
        monitorButtonHTML = `<button id="monitorBtn-${track.id}" title="Toggle Input Monitoring" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 ${track.isMonitoringEnabled ? 'active' : ''}">Monitor</button>`;
    }

    return `
        <div class="track-inspector-content p-1 space-y-1 text-lg text-gray-700 dark:text-slate-300 overflow-y-auto h-full">
            <div class="common-controls grid ${track.type === 'Audio' ? 'grid-cols-4' : 'grid-cols-3'} gap-1 mb-1">
                <button id="muteBtn-${track.id}" title="Mute Track" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 ${track.isMuted ? 'muted' : ''}">${track.isMuted ? 'Unmute' : 'Mute'}</button>
                <button id="soloBtn-${track.id}" title="Solo Track" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 ${track.isSoloed ? 'soloed' : ''}">${track.isSoloed ? 'Unsolo' : 'Solo'}</button>
                ${monitorButtonHTML}
                <button id="armInputBtn-${track.id}" title="Arm for MIDI/Keyboard Input or Audio Recording" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 ${armedTrackId === track.id ? 'armed' : ''}">Arm</button>
            </div>
            <div id="volumeKnob-${track.id}-placeholder" class="mb-1"></div>
            <div id="trackMeterContainer-${track.id}" class="h-3 w-full bg-gray-200 dark:bg-slate-600 rounded border border-gray-300 dark:border-slate-500 overflow-hidden my-1">
                <div id="trackMeterBar-${track.id}" class="h-full bg-green-500 transition-all duration-50 ease-linear" style="width: 0%;"></div>
            </div>
            <div class="type-specific-controls mt-1 border-t dark:border-slate-600 pt-1">${specificControlsHTML}</div>
            <div class="inspector-nav grid ${track.type === 'Audio' ? 'grid-cols-2' : 'grid-cols-3'} gap-1 mt-2">
                <button id="openEffectsBtn-${track.id}" class="px-1 py-0.5 border rounded bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:border-slate-500">Effects</button>
                ${pianoRollButtonHTML}
                <button id="removeTrackBtn-${track.id}" class="px-1 py-0.5 border rounded bg-red-400 hover:bg-red-500 text-white dark:bg-red-600 dark:hover:bg-red-700 dark:border-red-500">Remove</button>
            </div>
        </div>`;
}

export function openTrackInspectorWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) { console.error(`[UI] Track ${trackId} not found for inspector.`); return null; }

    const windowId = `trackInspector-${trackId}`;
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        const winInstance = openWindows.get(windowId);
        if (winInstance && typeof winInstance.restore === 'function') {
            winInstance.restore();
        }
        return winInstance;
    }

    const contentDOM = buildTrackInspectorContentDOM(track);
    const inspectorOptions = { width: 320, height: 450, minWidth: 280, minHeight: 350, initialContentKey: windowId, onCloseCallback: () => {} };
    if (savedState) { Object.assign(inspectorOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized }); }

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
        const volumeKnob = importedCreateKnob({ 
            label: 'Volume', min: 0, max: 1.2, step: 0.01, 
            initialValue: track.previousVolumeBeforeMute, decimals: 2, trackRef: track, 
            onValueChange: (val, o, fromInteraction) => track.setVolume(val, fromInteraction) 
        }, localAppServices);
        volumeKnobPlaceholder.innerHTML = '';
        volumeKnobPlaceholder.appendChild(volumeKnob.element);
        track.inspectorControls.volume = volumeKnob;
    }
}

function initializeTypeSpecificInspectorControls(track, winEl) {
    if (track.type === 'Synth') {
        initializeSynthSpecificControls(track, winEl);
    } else if (track.type === 'Sampler') {
        initializeSamplerSpecificControls(track, winEl);
    } else if (track.type === 'DrumSampler') {
        initializeDrumSamplerSpecificControls(track, winEl);
    } else if (track.type === 'InstrumentSampler') {
        initializeInstrumentSamplerSpecificControls(track, winEl);
    }
}

// --- END OF FULLY RESTORED IMPLEMENTATION ---


// --- Modular Effects Rack UI ---
export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    if (!listDiv) return;
    listDiv.innerHTML = '';
    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : (localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : []);
    if (!effectsArray || effectsArray.length === 0) {
        listDiv.innerHTML = '<p class="text-xs text-gray-500 italic">No effects.</p>';
        if (controlsContainer) controlsContainer.innerHTML = ''; return;
    }
    const AVAILABLE_EFFECTS = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
    effectsArray.forEach((effect, index) => {
        const displayName = AVAILABLE_EFFECTS[effect.type]?.displayName || effect.type;
        const item = document.createElement('div');
        item.className = 'effect-item flex items-center justify-between p-1 border-b dark:border-slate-600';
        item.innerHTML = `<span class="effect-name cursor-pointer hover:text-blue-400">${displayName}</span><div>...</div>`;
        item.querySelector('.effect-name').addEventListener('click', () => renderEffectControls(owner, ownerType, effect.id, controlsContainer));
        listDiv.appendChild(item);
    });
}
export function renderEffectControls(owner, ownerType, effectId, controlsContainer) { /* ... implementation needed ... */ }
function showAddEffectModal(owner, ownerType) { /* ... implementation needed ... */ }
export function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... implementation needed ... */ }
export function openMasterEffectsRackWindow(savedState = null) { /* ... implementation needed ... */ }

// --- Mixer Window ---
export function openMixerWindow(savedState = null) { /* ... implementation needed ... */ }
export function updateMixerWindow() { /* ... implementation needed ... */ }
export function renderMixer(container) { /* ... implementation needed ... */ }

// --- Piano Roll Window (Formerly Sequencer) ---
export function openPianoRollWindow(trackId, forceRedraw = false, savedState = null) {
    console.log(`[UI openPianoRollWindow START] Called for track ID: ${trackId}.`);
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) { console.error(`[UI openPianoRollWindow] Track ${trackId} not found.`); return null; }
    if (track.type === 'Audio') { if (localAppServices.showNotification) localAppServices.showNotification(`Piano Roll is not available for Audio tracks.`, 3000); return null; }
    const windowId = `pianoRollWin-${trackId}`;
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId)) { openWindows.get(windowId).restore(); return; }
    const activeSequence = track.getActiveSequence();
    if (!activeSequence) { if (localAppServices.showNotification) localAppServices.showNotification(`Track "${track.name}" has no active sequence.`, 3500); return null; }
    const konvaContainer = document.createElement('div');
    konvaContainer.id = `pianoRollKonvaContainer-${trackId}`;
    konvaContainer.className = 'w-full h-full overflow-hidden bg-slate-800 dark:bg-slate-900';
    konvaContainer.style.position = 'relative';
    const pianoRollOptions = { width: 800, height: 500, minWidth: 500, minHeight: 300, initialContentKey: windowId, onCloseCallback: () => { const win = localAppServices.getWindowById(`pianoRollWin-${trackId}`); if (win?.konvaStage) win.konvaStage.destroy(); } };
    const pianoRollWindow = localAppServices.createWindow(windowId, `Piano Roll: ${track.name} - ${activeSequence.name}`, konvaContainer, pianoRollOptions);
    if (pianoRollWindow?.element) {
        setTimeout(() => { if (konvaContainer.offsetWidth > 0 && konvaContainer.offsetHeight > 0) pianoRollWindow.konvaStage = createPianoRollStage(konvaContainer, track); }, 150);
        if (localAppServices.setActiveSequencerTrackId) localAppServices.setActiveSequencerTrackId(trackId);
    }
    return pianoRollWindow;
}

// --- UI Update & Drawing Functions ---
export function drawWaveform(track) {
    if (!track?.waveformCanvasCtx || !track.audioBuffer?.loaded) return;
    const canvas = track.waveformCanvasCtx.canvas; const ctx = track.waveformCanvasCtx;
    const buffer = track.audioBuffer.get(); const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width); const amp = canvas.height / 2;
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('background-color');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1; ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('color');
    ctx.beginPath();
    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0, max = -1.0;
        for (let j = 0; j < step; j++) { const datum = data[(i * step) + j]; if (datum < min) min = datum; if (datum > max) max = datum; }
        ctx.moveTo(i, (1 + min) * amp); ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();
}

export function drawInstrumentWaveform(track) {
    if (!track?.instrumentWaveformCanvasCtx || !track.instrumentSamplerSettings.audioBuffer?.loaded) return;
    const canvas = track.instrumentWaveformCanvasCtx.canvas; const ctx = track.instrumentWaveformCanvasCtx;
    const buffer = track.instrumentSamplerSettings.audioBuffer.get(); const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width); const amp = canvas.height / 2;
    ctx.fillStyle = getComputedStyle(canvas).getPropertyValue('background-color');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1; ctx.strokeStyle = getComputedStyle(canvas).getPropertyValue('color');
    ctx.beginPath();
    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0, max = -1.0;
        for (let j = 0; j < step; j++) { const datum = data[(i * step) + j]; if (datum < min) min = datum; if (datum > max) max = datum; }
        ctx.moveTo(i, (1 + min) * amp); ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();
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
        if (track.audioBuffer?.loaded && slice.duration > 0) { pad.disabled = false; } else { pad.disabled = true; pad.style.opacity = '0.5'; }
        pad.addEventListener('click', () => { track.selectedSliceForEdit = index; if (localAppServices.playSlicePreview) localAppServices.playSlicePreview(track.id, index); renderSamplePads(track); updateSliceEditorUI(track); });
        padsContainer.appendChild(pad);
    });
}

export function updateSliceEditorUI(track) {
    const inspector = localAppServices.getWindowById(`trackInspector-${track.id}`)?.element;
    if (!inspector || track.type !== 'Sampler' || !track.slices?.length) return;
    const selectedInfo = inspector.querySelector(`#selectedSliceInfo-${track.id}`);
    if (selectedInfo) selectedInfo.textContent = track.selectedSliceForEdit + 1;
    const slice = track.slices[track.selectedSliceForEdit]; if (!slice) return;
    // Update knob values
    if (track.inspectorControls.sliceVolume) track.inspectorControls.sliceVolume.setValue(slice.volume || 0.7);
    if (track.inspectorControls.slicePitch) track.inspectorControls.slicePitch.setValue(slice.pitchShift || 0);
    if (track.inspectorControls.sliceEnvAttack) track.inspectorControls.sliceEnvAttack.setValue(slice.envelope.attack);
    if (track.inspectorControls.sliceEnvDecay) track.inspectorControls.sliceEnvDecay.setValue(slice.envelope.decay);
    if (track.inspectorControls.sliceEnvSustain) track.inspectorControls.sliceEnvSustain.setValue(slice.envelope.sustain);
    if (track.inspectorControls.sliceEnvRelease) track.inspectorControls.sliceEnvRelease.setValue(slice.envelope.release);
    // Update buttons
    const loopToggleBtn = inspector.querySelector(`#sliceLoopToggle-${track.id}`);
    if (loopToggleBtn) { loopToggleBtn.textContent = slice.loop ? 'Loop: ON' : 'Loop: OFF'; loopToggleBtn.classList.toggle('active', slice.loop); }
    const reverseToggleBtn = inspector.querySelector(`#sliceReverseToggle-${track.id}`);
    if (reverseToggleBtn) { reverseToggleBtn.textContent = slice.reverse ? 'Rev: ON' : 'Rev: OFF'; reverseToggleBtn.classList.toggle('active', slice.reverse); }
}

export function renderDrumSamplerPads(track) {
    const inspector = localAppServices.getWindowById(`trackInspector-${track.id}`)?.element;
    if (!inspector || track.type !== 'DrumSampler') return;
    const padsContainer = inspector.querySelector(`#drumPadsGridContainer-${track.id}`);
    if (!padsContainer) return; padsContainer.innerHTML = '';
    track.drumSamplerPads.forEach((padData, index) => {
        const padEl = document.createElement('button');
        padEl.className = `pad-button ${track.selectedDrumPadForEdit === index ? 'selected-for-edit' : ''}`;
        padEl.innerHTML = `<span class="pad-number">${index + 1}</span><span class="pad-label">${padData.originalFileName ? padData.originalFileName.split('.')[0] : ''}</span>`;
        padEl.title = padData.originalFileName || `Pad ${index + 1}`;
        padEl.addEventListener('click', () => { track.selectedDrumPadForEdit = index; if (localAppServices.playDrumSamplerPadPreview && padData.status === 'loaded') localAppServices.playDrumSamplerPadPreview(track.id, index); renderDrumSamplerPads(track); updateDrumPadControlsUI(track); });
        padsContainer.appendChild(padEl);
    });
}

export function updateDrumPadControlsUI(track) {
    const inspector = localAppServices.getWindowById(`trackInspector-${track.id}`)?.element;
    if (!inspector || track.type !== 'DrumSampler') return;
    const selectedPadIndex = track.selectedDrumPadForEdit;
    const padData = track.drumSamplerPads[selectedPadIndex];
    if (!padData) return;

    const editorContainer = inspector.querySelector(`#drum-pad-editor-container-${track.id}`);
    if (editorContainer) {
        editorContainer.innerHTML = buildDrumSamplerSpecificInspectorDOM(track); // Re-build just the editor part
        // Re-initialize controls for the newly selected pad
        const dzContainer = editorContainer.querySelector(`#drumPadDropZoneContainer-${track.id}-${selectedPadIndex}`);
        if(dzContainer) {
            const dzEl = dzContainer.querySelector('.drop-zone');
            const fileInputEl = dzContainer.querySelector(`#drumPadFileInput-${track.id}-${selectedPadIndex}`);
            if(dzEl) setupGenericDropZoneListeners(dzEl, track.id, 'DrumSampler', selectedPadIndex, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadDrumSamplerPadFile);
            if(fileInputEl) fileInputEl.onchange = (e) => localAppServices.loadDrumSamplerPadFile(e, track.id, selectedPadIndex);
        }
        
        const createKnob = (id, options) => {
            const placeholder = editorContainer.querySelector(`#${id}`);
            if(placeholder) { const knob = importedCreateKnob(options, localAppServices); placeholder.appendChild(knob.element); return knob; }
            return null;
        }

        createKnob(`drumPadVolumeKnob-${track.id}-placeholder`, { label: 'Vol', min:0, max:1, step:0.01, initialValue: padData.volume, onValueChange: val => track.setDrumSamplerPadVolume(selectedPadIndex, val) });
        createKnob(`drumPadPitchKnob-${track.id}-placeholder`, { label: 'Pitch', min:-24, max:24, step:1, initialValue: padData.pitchShift, onValueChange: val => track.setDrumSamplerPadPitch(selectedPadIndex, val), disabled: padData.autoStretchEnabled });
        
        // Envelope knobs
        const env = padData.envelope || {};
        createKnob(`drumPadEnvAttack-${track.id}-placeholder`, { label: 'Atk', min:0.001, max:1, step:0.001, initialValue: env.attack, onValueChange: val => track.setDrumSamplerPadEnv(selectedPadIndex, 'attack', val) });
        createKnob(`drumPadEnvDecay-${track.id}-placeholder`, { label: 'Dec', min:0.01, max:1, step:0.01, initialValue: env.decay, onValueChange: val => track.setDrumSamplerPadEnv(selectedPadIndex, 'decay', val) });
        createKnob(`drumPadEnvSustain-${track.id}-placeholder`, { label: 'Sus', min:0, max:1, step:0.01, initialValue: env.sustain, onValueChange: val => track.setDrumSamplerPadEnv(selectedPadIndex, 'sustain', val) });
        createKnob(`drumPadEnvRelease-${track.id}-placeholder`, { label: 'Rel', min:0.01, max:2, step:0.01, initialValue: env.release, onValueChange: val => track.setDrumSamplerPadEnv(selectedPadIndex, 'release', val) });

        // Stretch controls
        const autoStretchToggle = editorContainer.querySelector(`#drumPadAutoStretchToggle-${track.id}`);
        const stretchBPMInput = editorContainer.querySelector(`#drumPadStretchBPM-${track.id}`);
        const stretchBeatsInput = editorContainer.querySelector(`#drumPadStretchBeats-${track.id}`);

        if (autoStretchToggle && stretchBPMInput && stretchBeatsInput) {
             autoStretchToggle.textContent = padData.autoStretchEnabled ? 'Stretch: ON' : 'Stretch: OFF';
             autoStretchToggle.classList.toggle('active', padData.autoStretchEnabled);
             stretchBPMInput.disabled = !padData.autoStretchEnabled;
             stretchBeatsInput.disabled = !padData.autoStretchEnabled;
             stretchBPMInput.value = padData.stretchOriginalBPM || 120;
             stretchBeatsInput.value = padData.stretchBeats || 1;
             autoStretchToggle.addEventListener('click', () => { track.setDrumSamplerPadAutoStretch(selectedPadIndex, !padData.autoStretchEnabled); updateDrumPadControlsUI(track); });
             stretchBPMInput.addEventListener('change', e => track.setDrumSamplerPadStretchOriginalBPM(selectedPadIndex, parseFloat(e.target.value)));
             stretchBeatsInput.addEventListener('change', e => track.setDrumSamplerPadStretchBeats(selectedPadIndex, parseFloat(e.target.value)));
        }
    }
}


export function updateSequencerCellUI(sequencerWindowElement, trackType, row, col, isActive) { /* ... implementation unchanged ... */ }
export function highlightPlayingStep(trackId, col) { /* ... implementation unchanged ... */ }

// Re-export functions from sub-modules AND createKnob
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
