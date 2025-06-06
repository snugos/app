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
        let initialValue = def.path.split('.').reduce((o, i) => o?.[i], track.synthParams) ?? def.defaultValue;

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
        const knobsHTML = `<div class="grid grid-cols-4 gap-2">
            <div id="instr-attack-placeholder"></div><div id="instr-decay-placeholder"></div>
            <div id="instr-sustain-placeholder"></div><div id="instr-release-placeholder"></div>
        </div>`;
        controlsContainer.innerHTML = knobsHTML;
        const createKnob = (id, options) => {
            const placeholder = controlsContainer.querySelector(`#${id}`);
            if(placeholder) placeholder.appendChild(importedCreateKnob(options, localAppServices).element);
        };
        createKnob('instr-attack-placeholder', { label: 'Attack', min: 0.001, max: 2, step: 0.001, initialValue: env.attack, onValueChange: val => track.setInstrumentSamplerEnv('attack', val) });
        createKnob('instr-decay-placeholder', { label: 'Decay', min: 0.01, max: 2, step: 0.01, initialValue: env.decay, onValueChange: val => track.setInstrumentSamplerEnv('decay', val) });
        createKnob('instr-sustain-placeholder', { label: 'Sustain', min: 0, max: 1, step: 0.01, initialValue: env.sustain, onValueChange: val => track.setInstrumentSamplerEnv('sustain', val) });
        createKnob('instr-release-placeholder', { label: 'Release', min: 0.01, max: 5, step: 0.01, initialValue: env.release, onValueChange: val => track.setInstrumentSamplerEnv('release', val) });
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
        if (winInstance?.restore) winInstance.restore();
        return winInstance;
    }

    const contentDOM = buildTrackInspectorContentDOM(track);
    const inspectorOptions = { width: 320, height: 450, minWidth: 280, minHeight: 350, initialContentKey: windowId };
    if (savedState) Object.assign(inspectorOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });

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

// --- Modular Effects Rack UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') {
    const ownerId = (ownerType === 'track' && owner) ? owner.id : 'master';
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus';
    return `<div id="effectsRackContent-${ownerId}" class="p-2 space-y-2 overflow-y-auto h-full">
        <h3 class="text-sm font-semibold dark:text-slate-200">Effects Rack: ${ownerName}</h3>
        <div id="effectsList-${ownerId}" class="space-y-1 min-h-[50px] border rounded p-1 dark:bg-slate-700 dark:border-slate-600"></div>
        <button id="addEffectBtn-${ownerId}" class="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Add Effect</button>
        <div id="effectControlsContainer-${ownerId}" class="mt-2 space-y-2"></div>
    </div>`;
}

export function openTrackEffectsRackWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById?.(trackId);
    if (!track) return null;
    const windowId = `effectsRack-${trackId}`;
    const openWindows = localAppServices.getOpenWindows?.() || new Map();
    if (openWindows.has(windowId) && !savedState) { openWindows.get(windowId).restore(); return openWindows.get(windowId); }
    
    const contentDOM = buildModularEffectsRackDOM(track, 'track');
    const rackOptions = { width: 350, height: 400, minWidth: 300, minHeight: 250, initialContentKey: windowId };
    if (savedState) Object.assign(rackOptions, { /* state assignment */ });
    
    const rackWindow = localAppServices.createWindow(windowId, `Effects: ${track.name}`, contentDOM, rackOptions);
    if (rackWindow?.element) {
        renderEffectsList(track, 'track', rackWindow.element.querySelector(`#effectsList-${track.id}`), rackWindow.element.querySelector(`#effectControlsContainer-${track.id}`));
        rackWindow.element.querySelector(`#addEffectBtn-${track.id}`)?.addEventListener('click', () => showAddEffectModal(track, 'track'));
    }
    return rackWindow;
}

export function openMasterEffectsRackWindow(savedState = null) {
    const windowId = 'masterEffectsRack';
    const openWindows = localAppServices.getOpenWindows?.() || new Map();
    if (openWindows.has(windowId) && !savedState) { openWindows.get(windowId).restore(); return openWindows.get(windowId); }
    
    const contentDOM = buildModularEffectsRackDOM(null, 'master');
    const rackOptions = { width: 350, height: 400, minWidth: 300, minHeight: 250, initialContentKey: windowId };
    if (savedState) Object.assign(rackOptions, { /* state assignment */ });

    const rackWindow = localAppServices.createWindow(windowId, 'Master Effects Rack', contentDOM, rackOptions);
    if (rackWindow?.element) {
        renderEffectsList(null, 'master', rackWindow.element.querySelector('#effectsList-master'), rackWindow.element.querySelector(`#effectControlsContainer-master`));
        rackWindow.element.querySelector(`#addEffectBtn-master`)?.addEventListener('click', () => showAddEffectModal(null, 'master'));
    }
    return rackWindow;
}

export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    if (!listDiv) return;
    listDiv.innerHTML = '';
    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : (localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : []);
    if (!effectsArray || effectsArray.length === 0) {
        listDiv.innerHTML = '<p class="text-xs text-slate-400 italic">No effects added.</p>';
        if (controlsContainer) controlsContainer.innerHTML = ''; return;
    }
    const AVAILABLE_EFFECTS = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
    effectsArray.forEach((effect, index) => {
        const displayName = AVAILABLE_EFFECTS[effect.type]?.displayName || effect.type;
        const item = document.createElement('div');
        item.className = 'effect-item flex items-center justify-between p-1 border-b dark:border-slate-600';
        item.innerHTML = `<span class="effect-name cursor-pointer hover:text-blue-400">${displayName}</span><div><button class="remove-btn text-red-500 hover:text-red-300">✕</button></div>`;
        item.querySelector('.effect-name').addEventListener('click', () => renderEffectControls(owner, ownerType, effect.id, controlsContainer));
        item.querySelector('.remove-btn').addEventListener('click', () => {
            if (ownerType === 'track') owner.removeEffect(effect.id);
            else localAppServices.removeMasterEffect?.(effect.id);
        });
        listDiv.appendChild(item);
    });
}

export function renderEffectControls(owner, ownerType, effectId, controlsContainer) {
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : (localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : []);
    const effect = effectsArray.find(e => e.id === effectId);
    if (!effect) return;

    const effectDef = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS[effect.type];
    if (!effectDef) return;

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-2 gap-2';
    effectDef.params.forEach(paramDef => {
        const placeholder = document.createElement('div');
        let initialValue = effect.params[paramDef.key]; // Simplified
        if (paramDef.type === 'knob') {
            const knob = importedCreateKnob({
                label: paramDef.label, min: paramDef.min, max: paramDef.max, step: paramDef.step,
                initialValue, onValueChange: (val) => {
                    if (ownerType === 'track') owner.updateEffectParam(effect.id, paramDef.key, val);
                    else localAppServices.updateMasterEffectParam?.(effect.id, paramDef.key, val);
                }
            }, localAppServices);
            placeholder.appendChild(knob.element);
        }
        grid.appendChild(placeholder);
    });
    controlsContainer.appendChild(grid);
}

function showAddEffectModal(owner, ownerType) {
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master';
    let content = '<ul class="list-none p-0 m-0">';
    const AVAILABLE_EFFECTS = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
    for (const key in AVAILABLE_EFFECTS) {
        content += `<li class="p-2 hover:bg-blue-600 cursor-pointer" data-effect="${key}">${AVAILABLE_EFFECTS[key].displayName}</li>`;
    }
    content += '</ul>';
    
    const modal = showCustomModal(`Add Effect to ${ownerName}`, content, []);
    modal.contentDiv.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => {
            const effectType = li.dataset.effect;
            if (ownerType === 'track') owner.addEffect(effectType);
            else localAppServices.addMasterEffect?.(effectType);
            modal.overlay.remove();
        });
    });
}

// --- Mixer Window ---
export function openMixerWindow(savedState = null) {
    const windowId = 'mixer';
    const openWindows = localAppServices.getOpenWindows?.() || new Map();
    if (openWindows.has(windowId) && !savedState) { openWindows.get(windowId).restore(); return openWindows.get(windowId); }

    const contentContainer = document.createElement('div');
    contentContainer.id = 'mixerContentContainer';
    contentContainer.className = 'p-2 overflow-x-auto whitespace-nowrap h-full bg-slate-800';
    
    const desktopEl = localAppServices.uiElementsCache?.desktop || document.getElementById('desktop');
    const mixerOptions = { width: Math.min(800, (desktopEl?.offsetWidth || 800) - 40), height: 300, minWidth: 300, minHeight: 200, initialContentKey: windowId };
    if (savedState) Object.assign(mixerOptions, { /* state assignment */ });
    
    const mixerWindow = localAppServices.createWindow(windowId, 'Mixer', contentContainer, mixerOptions);
    if (mixerWindow?.element) updateMixerWindow();
    return mixerWindow;
}

export function updateMixerWindow() {
    const mixerWindow = localAppServices.getWindowById?.('mixer');
    if (!mixerWindow?.element || mixerWindow.isMinimized) return;
    const container = mixerWindow.element.querySelector('#mixerContentContainer');
    if (container) renderMixer(container);
}

export function renderMixer(container) {
    container.innerHTML = '';
    const tracks = getTracksState();
    tracks.forEach(track => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'mixer-track inline-block align-top p-1.5 border rounded bg-slate-700 border-slate-600 w-24 mr-2 text-xs';
        trackDiv.innerHTML = `<div class="track-name font-semibold truncate mb-1 text-slate-200">${track.name}</div><div id="volumeKnob-mixer-${track.id}-placeholder"></div>`;
        container.appendChild(trackDiv);
        const volKnobPlaceholder = trackDiv.querySelector(`#volumeKnob-mixer-${track.id}-placeholder`);
        if (volKnobPlaceholder) {
            const volKnob = importedCreateKnob({ label: `Vol`, min: 0, max: 1.2, initialValue: track.previousVolumeBeforeMute, onValueChange: val => track.setVolume(val, true) }, localAppServices);
            volKnobPlaceholder.appendChild(volKnob.element);
        }
    });
}

// --- UI Update & Drawing Functions ---
export function drawWaveform(track) {
    // Implementation from old file...
}
export function drawInstrumentWaveform(track) {
    // Implementation from old file...
}
export function renderSamplePads(track) {
    // Implementation from old file...
}
export function updateSliceEditorUI(track) {
    // Implementation from old file...
}
export function renderDrumSamplerPads(track) {
    // Implementation from old file...
}
export function updateDrumPadControlsUI(track) {
    // Implementation from old file...
}
export function updateSequencerCellUI(sequencerWindowElement, trackType, row, col, isActive) {}
export function highlightPlayingStep(trackId, col) {}
export function openPianoRollWindow(trackId, forceRedraw = false, savedState = null) {
    const track = localAppServices.getTrackById?.(trackId);
    if (!track || track.type === 'Audio') return;
    const windowId = `pianoRollWin-${trackId}`;
    if (localAppServices.getOpenWindows?.().has(windowId)) { localAppServices.getOpenWindows().get(windowId).restore(); return; }
    const activeSequence = track.getActiveSequence();
    if (!activeSequence) { showNotification(`Track "${track.name}" has no active sequence.`); return; }
    const konvaContainer = document.createElement('div');
    konvaContainer.id = `pianoRollKonvaContainer-${trackId}`;
    konvaContainer.className = 'w-full h-full';
    const pianoRollWindow = localAppServices.createWindow(windowId, `Piano Roll: ${track.name}`, konvaContainer, { width: 800, height: 500 });
    if (pianoRollWindow?.element) {
        setTimeout(() => {
            if (konvaContainer.offsetWidth > 0) pianoRollWindow.konvaStage = createPianoRollStage(konvaContainer, track);
        }, 150);
    }
}

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
