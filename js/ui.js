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
    if (!localAppServices.effectsRegistryAccess.synthEngineControlDefinitions) {
        localAppServices.effectsRegistryAccess.synthEngineControlDefinitions = {};
    }
}


// --- START OF ADDED/CORRECTED IMPLEMENTATION ---

// --- Specific Inspector DOM Builders ---
function buildSynthSpecificInspectorDOM(track) {
    let controlsHTML = `
        <div class="panel">
            <div class="control-group">
                <label>Synth Engine</label>
                <select id="synthEngineSelect-${track.id}" class="w-full p-1.5 border rounded">
                    <option value="MonoSynth" ${track.synthEngineType === 'MonoSynth' ? 'selected' : ''}>MonoSynth</option>
                    </select>
            </div>
            <div id="synth-engine-controls-${track.id}" class="grid grid-cols-3 gap-2 mt-2">
                </div>
        </div>
    `;
    return controlsHTML;
}

function buildSamplerSpecificInspectorDOM(track) {
    const dropZoneId = `sampler-drop-zone-${track.id}`;
    const fileInputId = `sampler-file-input-${track.id}`;
    const dropZoneHTML = createDropZoneHTML(track.id, fileInputId, 'sampler', null, track.samplerAudioData);

    return `
        <div class="panel">
            <h4 class="text-xs font-bold uppercase mb-1">Sample</h4>
            ${dropZoneHTML}
            <div id="sampler-waveform-placeholder-${track.id}" class="mt-2">
                 <canvas id="sampler-waveform-canvas-${track.id}" class="waveform-canvas"></canvas>
            </div>
        </div>
        <div class="panel mt-2">
            <h4 class="text-xs font-bold uppercase mb-1">Slicer</h4>
             <div class="control-group">
                <label for="polyphonicToggle-${track.id}">Polyphonic</label>
                <input type="checkbox" id="polyphonicToggle-${track.id}" ${track.slicerIsPolyphonic ? 'checked' : ''}>
            </div>
            <div class="grid grid-cols-4 gap-2 mt-2" id="sampler-pads-container-${track.id}">
                </div>
            <div id="slice-editor-container-${track.id}" class="mt-2">
                 </div>
        </div>
    `;
}

function buildDrumSamplerSpecificInspectorDOM(track) {
    return `
        <div class="panel">
             <div class="grid grid-cols-4 gap-2" id="drum-sampler-pads-container-${track.id}">
                </div>
        </div>
        <div id="drum-pad-editor-container-${track.id}" class="panel mt-2">
             </div>
    `;
}

function buildInstrumentSamplerSpecificInspectorDOM(track) {
    const dropZoneId = `inst-sampler-drop-zone-${track.id}`;
    const fileInputId = `inst-sampler-file-input-${track.id}`;
    const dropZoneHTML = createDropZoneHTML(track.id, fileInputId, 'instrumentsampler', null, track.instrumentSamplerSettings);

    return `
        <div class="panel">
            ${dropZoneHTML}
            <div id="inst-sampler-waveform-placeholder-${track.id}" class="mt-2">
                 <canvas id="inst-sampler-waveform-canvas-${track.id}" class="waveform-canvas"></canvas>
            </div>
             <div class="control-group mt-2">
                <label for="polyphonicToggle-${track.id}">Polyphonic</label>
                <input type="checkbox" id="polyphonicToggle-${track.id}" ${track.instrumentSamplerIsPolyphonic ? 'checked' : ''}>
            </div>
        </div>
        <div id="inst-sampler-controls-container-${track.id}" class="panel mt-2">
            </div>
    `;
}

// --- Specific Inspector Control Initializers ---
function buildSynthEngineControls(track, container, engineType) {
    container.innerHTML = '';
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions[engineType];
    if (!definitions) {
        container.innerHTML = `<p class="text-xs text-gray-500 col-span-3">No controls defined for ${engineType}.</p>`;
        return;
    }

    definitions.forEach(def => {
        const placeholder = document.createElement('div');
        placeholder.id = `${def.idPrefix}-placeholder-${track.id}`;
        container.appendChild(placeholder);
    });
}

function initializeSynthSpecificControls(track, winEl) {
    const controlsContainer = winEl.querySelector(`#synth-engine-controls-${track.id}`);
    if (controlsContainer) {
        buildSynthEngineControls(track, controlsContainer, track.synthEngineType);

        const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions[track.synthEngineType] || [];
        definitions.forEach(def => {
            const placeholder = winEl.querySelector(`#${def.idPrefix}-placeholder-${track.id}`);
            if (!placeholder) return;

            const currentVal = def.path.split('.').reduce((o, i) => o?.[i], track.synthParams) ?? def.defaultValue;

            if (def.type === 'knob') {
                const knob = importedCreateKnob({
                    label: def.label,
                    min: def.min,
                    max: def.max,
                    step: def.step,
                    initialValue: currentVal,
                    decimals: def.decimals,
                    displaySuffix: def.displaySuffix,
                    trackRef: track,
                    onValueChange: (val) => track.setSynthParam(def.path, val)
                }, localAppServices);
                placeholder.appendChild(knob.element);
                track.inspectorControls[def.path] = knob;
            } else if (def.type === 'select') {
                const selectEl = document.createElement('select');
                selectEl.className = 'w-full p-1 text-xs border rounded bg-white dark:bg-slate-700 dark:border-slate-600';
                selectEl.innerHTML = def.options.map(opt => `<option value="${opt}" ${opt === currentVal ? 'selected' : ''}>${opt}</option>`).join('');
                selectEl.addEventListener('change', (e) => track.setSynthParam(def.path, e.target.value));
                const labelEl = document.createElement('div');
                labelEl.className = 'knob-label';
                labelEl.textContent = def.label;
                placeholder.appendChild(labelEl);
                placeholder.appendChild(selectEl);
                track.inspectorControls[def.path] = { element: selectEl, type: 'select' };
            }
        });
    }

    const engineSelect = winEl.querySelector(`#synthEngineSelect-${track.id}`);
    engineSelect?.addEventListener('change', (e) => {
        // This would re-initialize the synth engine on the track and re-render controls
        console.log(`Synth engine changed to: ${e.target.value}. Re-rendering controls is needed.`);
        // track.setSynthEngine(e.target.value); // Future implementation
    });
}

function initializeSamplerSpecificControls(track, winEl) {
    const dropZoneElement = winEl.querySelector(`.drop-zone[data-track-id="${track.id}"]`);
    if (dropZoneElement) {
        setupGenericDropZoneListeners(dropZoneElement, track.id, 'sampler', null,
            (soundData, trackId) => localAppServices.loadSoundFromBrowserToTarget(soundData, trackId, 'Sampler', null),
            (event, trackId) => localAppServices.loadSampleFile(event, trackId, 'Sampler')
        );
        const fileInput = winEl.querySelector(`#sampler-file-input-${track.id}`);
        fileInput?.addEventListener('change', (e) => localAppServices.loadSampleFile(e, track.id, 'Sampler'));
    }
    const polyToggle = winEl.querySelector(`#polyphonicToggle-${track.id}`);
    polyToggle?.addEventListener('change', (e) => {
        track.slicerIsPolyphonic = e.target.checked;
        if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Slicer Polyphonic to ${e.target.checked}`);
    });
    renderSamplePads(track);
}

function initializeDrumSamplerSpecificControls(track, winEl) {
    renderDrumSamplerPads(track);
    updateDrumPadControlsUI(track);
}

function initializeInstrumentSamplerSpecificControls(track, winEl) {
    const dropZoneElement = winEl.querySelector(`.drop-zone[data-track-id="${track.id}"]`);
     if (dropZoneElement) {
        setupGenericDropZoneListeners(dropZoneElement, track.id, 'instrumentsampler', null,
            (soundData, trackId) => localAppServices.loadSoundFromBrowserToTarget(soundData, trackId, 'InstrumentSampler', null),
            (event, trackId) => localAppServices.loadSampleFile(event, trackId, 'InstrumentSampler')
        );
        const fileInput = winEl.querySelector(`#inst-sampler-file-input-${track.id}`);
        fileInput?.addEventListener('change', (e) => localAppServices.loadSampleFile(e, track.id, 'InstrumentSampler'));
    }
    const polyToggle = winEl.querySelector(`#polyphonicToggle-${track.id}`);
    polyToggle?.addEventListener('change', (e) => {
        track.instrumentSamplerIsPolyphonic = e.target.checked;
        if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Instrument Sampler Polyphonic to ${e.target.checked}`);
    });
    drawInstrumentWaveform(track);
    // Logic to build and initialize envelope knobs etc. would go here
}

// --- END OF ADDED/CORRECTED IMPLEMENTATION ---


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

    const monitorBtn = winEl.querySelector(`#monitorBtn-${track.id}`);
    if (monitorBtn) { /* ... (unchanged) ... */ }

    winEl.querySelector(`#removeTrackBtn-${track.id}`)?.addEventListener('click', () => handleRemoveTrack(track.id));
    winEl.querySelector(`#openEffectsBtn-${track.id}`)?.addEventListener('click', () => handleOpenEffectsRack(track.id));

    const pianoRollBtn = winEl.querySelector(`#openPianoRollBtn-${track.id}`); 
    if (pianoRollBtn) {
        pianoRollBtn.addEventListener('click', () => handleOpenPianoRoll(track.id)); 
    }

    const volumeKnobPlaceholder = winEl.querySelector(`#volumeKnob-${track.id}-placeholder`);
    if (volumeKnobPlaceholder) {
        const volumeKnob = importedCreateKnob({ label: 'Volume', min: 0, max: 1.2, step: 0.01, initialValue: track.previousVolumeBeforeMute, decimals: 2, trackRef: track, onValueChange: (val, o, fromInteraction) => track.setVolume(val, fromInteraction) }, localAppServices);
        volumeKnobPlaceholder.innerHTML = '';
        volumeKnobPlaceholder.appendChild(knob.element);
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

// --- Modular Effects Rack UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') { /* ... (implementation unchanged) ... */ }
export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) { /* ... (implementation unchanged) ... */ }
export function renderEffectControls(owner, ownerType, effectId, controlsContainer) { /* ... (implementation unchanged) ... */ }
function showAddEffectModal(owner, ownerType) { /* ... (implementation unchanged) ... */ }

// --- Window Opening Functions (Original Track Effects & Master Effects) ---
export function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... (implementation unchanged) ... */ }
export function openMasterEffectsRackWindow(savedState = null) { /* ... (implementation unchanged) ... */ }

// --- Mixer Window ---
export function openMixerWindow(savedState = null) { /* ... (implementation unchanged) ... */ }
export function updateMixerWindow() { /* ... (implementation unchanged) ... */ }
export function renderMixer(container) { /* ... (implementation unchanged) ... */ }

// --- Piano Roll Window (Formerly Sequencer) ---
export function openPianoRollWindow(trackId, forceRedraw = false, savedState = null) {
    console.log(`[UI openPianoRollWindow START] Called for track ID: ${trackId}.`);
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;

    if (!track) {
        console.error(`[UI openPianoRollWindow] Track ${trackId} not found.`);
        return null;
    }
    if (track.type === 'Audio') {
        if (localAppServices.showNotification) localAppServices.showNotification(`Piano Roll is not available for Audio tracks.`, 3000);
        return null;
    }

    const windowId = `pianoRollWin-${trackId}`;
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();

    if (openWindows.has(windowId)) {
        openWindows.get(windowId).restore();
        return;
    }

    const activeSequence = track.getActiveSequence();
    if (!activeSequence) {
        if (localAppServices.showNotification) localAppServices.showNotification(`Track "${track.name}" has no active sequence.`, 3500);
        return null;
    }

    const konvaContainer = document.createElement('div');
    konvaContainer.id = `pianoRollKonvaContainer-${trackId}`;
    konvaContainer.className = 'w-full h-full overflow-hidden bg-slate-800 dark:bg-slate-900';
    konvaContainer.style.position = 'relative';

    const pianoRollOptions = { 
        width: 800, height: 500, minWidth: 500, minHeight: 300, 
        initialContentKey: windowId, 
        onCloseCallback: () => {
             const win = localAppServices.getWindowById(`pianoRollWin-${trackId}`);
             if (win && win.konvaStage) {
                 win.konvaStage.destroy();
             }
        }
    };

    const pianoRollWindow = localAppServices.createWindow(windowId, `Piano Roll: ${track.name} - ${activeSequence.name}`, konvaContainer, pianoRollOptions);

    if (pianoRollWindow?.element) {
        setTimeout(() => {
            if (konvaContainer.offsetWidth > 0 && konvaContainer.offsetHeight > 0) {
                 pianoRollWindow.konvaStage = createPianoRollStage(konvaContainer, track);
            }
        }, 150);
        if (localAppServices.setActiveSequencerTrackId) localAppServices.setActiveSequencerTrackId(trackId);
    }
    return pianoRollWindow;
}


// --- UI Update & Drawing Functions ---
export function drawWaveform(track) { /* ... (implementation unchanged) ... */ }
export function drawInstrumentWaveform(track) { /* ... (implementation unchanged) ... */ }
export function renderSamplePads(track) { /* ... (implementation unchanged) ... */ }
export function updateSliceEditorUI(track) { /* ... (implementation unchanged) ... */ }
export function renderDrumSamplerPads(track) { /* ... (implementation unchanged) ... */ }
export function updateDrumPadControlsUI(track) { /* ... (implementation unchanged) ... */ }

export function updateSequencerCellUI(sequencerWindowElement, trackType, row, col, isActive) {
    console.warn("[UI updateSequencerCellUI] This function is obsolete and should be replaced by Konva updates.");
}
export function highlightPlayingStep(trackId, col) {
    const pianoRollWindow = localAppServices.getWindowById ? localAppServices.getWindowById(`pianoRollWin-${trackId}`) : null;
    if (pianoRollWindow?.konvaStage) {
        // TODO: Implement Konva-based playhead highlighting.
    }
}

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
