// js/ui.js - Main UI Orchestration and Window Management
import { SnugWindow } from './SnugWindow.js';
import { showNotification, createDropZoneHTML, setupGenericDropZoneListeners, showCustomModal, createContextMenu, showConfirmationDialog } from './utils.js';
import * as Constants from './constants.js';
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, 
    handleOpenPianoRoll // Changed from handleOpenSequencer, will be called by eventHandlers.js
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
    initializePianoRollUI, // For initializing the piano roll module
    createPianoRollStage   // For creating the Konva stage
} from './ui/pianoRollUI.js';


// Module-level state for appServices, to be set by main.js
let localAppServices = {};

export function initializeUIModule(appServicesFromMain) {
    localAppServices = { ...localAppServices, ...appServicesFromMain };

    if (typeof initializeTimelineUI === 'function') {
        initializeTimelineUI(localAppServices);
    } else {
        console.error("[UI Init] initializeTimelineUI is not a function. Check import from ./ui/timelineUI.js");
    }

    if (typeof initializeSoundBrowserUI === 'function') {
        initializeSoundBrowserUI(localAppServices);
    } else {
        console.error("[UI Init] initializeSoundBrowserUI is not a function. Check import from ./ui/soundBrowserUI.js");
    }

    if (typeof initializePianoRollUI === 'function') {
        initializePianoRollUI(localAppServices); // Initialize the piano roll module
    } else {
        console.error("[UI Init] initializePianoRollUI is not a function. Check import from ./ui/pianoRollUI.js");
    }
    
    if (localAppServices && !localAppServices.createKnob) {
        // Pass localAppServices when assigning to appServices for broader use
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


// --- Specific Inspector DOM Builders ---
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
                <div>
                    <label for="drumPadStretchBPM-${track.id}" class="block text-[10px] font-medium dark:text-slate-400">Orig. BPM:</label>
                    <input type="number" id="drumPadStretchBPM-${track.id}" step="0.1" class="w-full p-0.5 border rounded text-[10px] dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500">
                </div>
                <div>
                    <label for="drumPadStretchBeats-${track.id}" class="block text-[10px] font-medium dark:text-slate-400">Beats:</label>
                    <input type="number" id="drumPadStretchBeats-${track.id}" step="0.01" class="w-full p-0.5 border rounded text-[10px] dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500">
                </div>
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
            <div class="grid grid-cols-2 gap-2 items-center">
                <div>
                    <label for="instrumentRootNote-${track.id}" class="block text-xs font-medium dark:text-slate-300">Root Note:</label>
                    <select id="instrumentRootNote-${track.id}" class="w-full p-1 border rounded text-xs bg-gray-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500"></select>
                </div>
                <div>
                    <label for="instrumentLoopToggle-${track.id}" class="block text-xs font-medium dark:text-slate-300">Loop:</label>
                    <button id="instrumentLoopToggle-${track.id}" class="px-2 py-1 text-xs border rounded w-full dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Loop: OFF</button>
                </div>
                <div>
                    <label for="instrumentLoopStart-${track.id}" class="block text-xs font-medium dark:text-slate-300">Loop Start (s):</label>
                    <input type="number" id="instrumentLoopStart-${track.id}" step="0.001" class="w-full p-1 border rounded text-xs dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500">
                </div>
                <div>
                    <label for="instrumentLoopEnd-${track.id}" class="block text-xs font-medium dark:text-slate-300">Loop End (s):</label>
                    <input type="number" id="instrumentLoopEnd-${track.id}" step="0.001" class="w-full p-1 border rounded text-xs dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500">
                </div>
            </div>
             <div class="text-xs font-medium mt-1 dark:text-slate-300">Envelope:</div>
             <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 items-center text-xs">
                <div id="instrumentEnvAttack-${track.id}-placeholder"></div>
                <div id="instrumentEnvDecay-${track.id}-placeholder"></div>
                <div id="instrumentEnvSustain-${track.id}-placeholder"></div>
                <div id="instrumentEnvRelease-${track.id}-placeholder"></div>
            </div>
            <div><button id="instrumentPolyphonyToggle-${track.id}" class="text-xs px-2 py-1 border rounded mt-1 dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Mode: Poly</button></div>
        </div>
    </div>`;
}

// --- Specific Inspector Control Initializers ---
function buildSynthEngineControls(track, container, engineType) {
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
    definitions.forEach(def => {
        const placeholder = container.querySelector(`#${def.idPrefix}-${track.id}-placeholder`);
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
        if (def.path.endsWith('.value') && track.instrument?.get) {
            const signalPath = def.path.substring(0, def.path.lastIndexOf('.value'));
            try {
                const signalValue = track.instrument.get(signalPath)?.value;
                if (signalValue !== undefined) initialValue = signalValue;
            } catch (e) {
                console.warn(`[UI buildSynthEngineControls] Error getting signal value for path "${signalPath}" on track ${track.id}:`, e.message);
            }
        }

        if (def.type === 'knob') {
            const knob = importedCreateKnob({ label: def.label, min: def.min, max: def.max, step: def.step, initialValue, decimals: def.decimals, displaySuffix: def.displaySuffix, trackRef: track, onValueChange: (val) => track.setSynthParam(def.path, val) }, localAppServices);
            placeholder.innerHTML = ''; placeholder.appendChild(knob.element); track.inspectorControls[def.idPrefix] = knob;
        } else if (def.type === 'select') {
            const selectEl = document.createElement('select');
            selectEl.id = `${def.idPrefix}-${track.id}`;
            selectEl.className = 'synth-param-select w-full p-1 border rounded text-xs bg-gray-50 dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600';
            def.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = typeof opt === 'object' ? opt.value : opt; option.textContent = typeof opt === 'object' ? opt.text : opt;
                selectEl.appendChild(option);
            });
            selectEl.value = initialValue;
            selectEl.addEventListener('change', (e) => {
                if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Change ${def.label} for ${track.name} to ${e.target.value}`);
                track.setSynthParam(def.path, e.target.value);
            });
            const labelEl = document.createElement('label');
            labelEl.htmlFor = selectEl.id; labelEl.textContent = def.label + ':';
            labelEl.className = 'text-xs block mb-0.5 dark:text-slate-300';
            const wrapperDiv = document.createElement('div');
            wrapperDiv.className = 'flex flex-col items-start'; wrapperDiv.appendChild(labelEl); wrapperDiv.appendChild(selectEl);
            placeholder.innerHTML = ''; placeholder.appendChild(wrapperDiv); track.inspectorControls[def.idPrefix] = selectEl;
        }
    });
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
        const existingAudioData = { originalFileName: track.samplerAudioData.fileName, status: track.samplerAudioData.status || (track.samplerAudioData.fileName ? 'missing' : 'empty') };
        dzContainerEl.innerHTML = createDropZoneHTML(track.id, `fileInput-${track.id}`, 'Sampler', null, existingAudioData);
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        const fileInputEl = dzContainerEl.querySelector(`#fileInput-${track.id}`);
        if (dzEl) setupGenericDropZoneListeners(dzEl, track.id, 'Sampler', null, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadSampleFile);
        if (fileInputEl) fileInputEl.onchange = (e) => { localAppServices.loadSampleFile(e, track.id, 'Sampler'); };
    }
    renderSamplePads(track);
    const canvas = winEl.querySelector(`#waveformCanvas-${track.id}`);
    if (canvas) {
        track.waveformCanvasCtx = canvas.getContext('2d');
        if(track.audioBuffer?.loaded) drawWaveform(track);
    }
    updateSliceEditorUI(track);

    const polyToggleBtn = winEl.querySelector(`#slicerPolyphonyToggle-${track.id}`);
    if (polyToggleBtn) {
        polyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
        polyToggleBtn.classList.toggle('active', track.slicerIsPolyphonic);
        polyToggleBtn.addEventListener('click', () => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Slicer Polyphony for ${track.name}`);
            track.slicerIsPolyphonic = !track.slicerIsPolyphonic;
            polyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
            polyToggleBtn.classList.toggle('active', track.slicerIsPolyphonic);
            if (!track.slicerIsPolyphonic) track.setupSlicerMonoNodes(); else track.disposeSlicerMonoNodes();
            track.rebuildEffectChain();
            showNotification(`${track.name} slicer mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`, 2000);
        });
    }
}

function initializeDrumSamplerSpecificControls(track, winEl) {
    renderDrumSamplerPads(track);
    updateDrumPadControlsUI(track);
}

function initializeInstrumentSamplerSpecificControls(track, winEl) {
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-instrumentsampler`);
    if (dzContainerEl) {
        const existingAudioData = { originalFileName: track.instrumentSamplerSettings.originalFileName, status: track.instrumentSamplerSettings.status || (track.instrumentSamplerSettings.originalFileName ? 'missing' : 'empty') };
        dzContainerEl.innerHTML = createDropZoneHTML(track.id, `instrumentFileInput-${track.id}`, 'InstrumentSampler', null, existingAudioData);
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        const fileInputEl = dzContainerEl.querySelector(`#instrumentFileInput-${track.id}`);
        if (dzEl) setupGenericDropZoneListeners(dzEl, track.id, 'InstrumentSampler', null, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadSampleFile);
        if (fileInputEl) fileInputEl.onchange = (e) => { localAppServices.loadSampleFile(e, track.id, 'InstrumentSampler'); };
    }

    const canvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`);
    if (canvas) {
        track.instrumentWaveformCanvasCtx = canvas.getContext('2d');
        if(track.instrumentSamplerSettings.audioBuffer?.loaded) drawInstrumentWaveform(track);
    }

    const rootNoteSelect = winEl.querySelector(`#instrumentRootNote-${track.id}`);
    if (rootNoteSelect) {
        Constants.synthPitches.slice().reverse().forEach(pitch => {
            const option = document.createElement('option'); option.value = pitch; option.textContent = pitch; rootNoteSelect.appendChild(option);
        });
        rootNoteSelect.value = track.instrumentSamplerSettings.rootNote || 'C4';
        rootNoteSelect.addEventListener('change', (e) => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Root Note for ${track.name} to ${e.target.value}`);
            track.setInstrumentSamplerRootNote(e.target.value);
        });
    }

    const loopToggleBtn = winEl.querySelector(`#instrumentLoopToggle-${track.id}`);
    if (loopToggleBtn) {
        loopToggleBtn.textContent = track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF';
        loopToggleBtn.classList.toggle('active', track.instrumentSamplerSettings.loop);
        loopToggleBtn.addEventListener('click', (e) => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Loop for ${track.name}`);
            track.setInstrumentSamplerLoop(!track.instrumentSamplerSettings.loop);
            e.target.textContent = track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF';
            e.target.classList.toggle('active', track.instrumentSamplerSettings.loop);
        });
    }
    const loopStartInput = winEl.querySelector(`#instrumentLoopStart-${track.id}`);
    if (loopStartInput) {
        loopStartInput.value = track.instrumentSamplerSettings.loopStart?.toFixed(3) || '0.000';
        loopStartInput.addEventListener('change', (e) => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Loop Start for ${track.name}`);
            track.setInstrumentSamplerLoopStart(parseFloat(e.target.value));
        });
    }
    const loopEndInput = winEl.querySelector(`#instrumentLoopEnd-${track.id}`);
    if (loopEndInput) {
        loopEndInput.value = track.instrumentSamplerSettings.loopEnd?.toFixed(3) || (track.instrumentSamplerSettings.audioBuffer?.duration.toFixed(3) || '0.000');
        loopEndInput.addEventListener('change', (e) => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Loop End for ${track.name}`);
            track.setInstrumentSamplerLoopEnd(parseFloat(e.target.value));
        });
    }

    const createAndPlaceKnob = (placeholderId, options) => {
        const placeholder = winEl.querySelector(`#${placeholderId}`);
        if (placeholder) {
            const knob = importedCreateKnob(options, localAppServices);
            placeholder.innerHTML = ''; placeholder.appendChild(knob.element); return knob;
        }
        return null;
    };
    const env = track.instrumentSamplerSettings.envelope || { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.5 };
    track.inspectorControls.instrEnvAttack = createAndPlaceKnob(`instrumentEnvAttack-${track.id}-placeholder`, { label: 'Attack', min:0.001, max:2, step:0.001, initialValue: env.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('attack', val)});
    track.inspectorControls.instrEnvDecay = createAndPlaceKnob(`instrumentEnvDecay-${track.id}-placeholder`, { label: 'Decay', min:0.01, max:2, step:0.01, initialValue: env.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('decay', val)});
    track.inspectorControls.instrEnvSustain = createAndPlaceKnob(`instrumentEnvSustain-${track.id}-placeholder`, { label: 'Sustain', min:0, max:1, step:0.01, initialValue: env.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('sustain', val)});
    track.inspectorControls.instrEnvRelease = createAndPlaceKnob(`instrumentEnvRelease-${track.id}-placeholder`, { label: 'Release', min:0.01, max:5, step:0.01, initialValue: env.release, decimals:2, trackRef: track, onValueChange: (val) => track.setInstrumentSamplerEnv('release', val)});

    const polyToggleBtnInst = winEl.querySelector(`#instrumentPolyphonyToggle-${track.id}`);
    if (polyToggleBtnInst) {
        polyToggleBtnInst.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
        polyToggleBtnInst.classList.toggle('active', track.instrumentSamplerIsPolyphonic);
        polyToggleBtnInst.addEventListener('click', () => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Instrument Sampler Polyphony for ${track.name}`);
            track.instrumentSamplerIsPolyphonic = !track.instrumentSamplerIsPolyphonic;
            polyToggleBtnInst.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
            polyToggleBtnInst.classList.toggle('active', track.instrumentSamplerIsPolyphonic);
            showNotification(`${track.name} instrument sampler mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`, 2000);
        });
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
        <div class="track-inspector-content p-1 space-y-1 text-xs text-gray-700 dark:text-slate-300 overflow-y-auto h-full">
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
        volumeKnobPlaceholder.appendChild(volumeKnob.element);
        track.inspectorControls.volume = volumeKnob;
    }
}

function initializeTypeSpecificInspectorControls(track, winEl) {
    if (track.type === 'Synth') initializeSynthSpecificControls(track, winEl);
    else if (track.type === 'Sampler') initializeSamplerSpecificControls(track, winEl);
    else if (track.type === 'DrumSampler') initializeDrumSamplerSpecificControls(track, winEl);
    else if (track.type === 'InstrumentSampler') initializeInstrumentSamplerSpecificControls(track, winEl);
}

// --- Modular Effects Rack UI ---
// ... (buildModularEffectsRackDOM, renderEffectsList, renderEffectControls, showAddEffectModal - UNCHANGED)
function buildModularEffectsRackDOM(owner, ownerType = 'track') {
    const idSuffix = ownerType === 'track' ? owner.id : 'master';
    return `<div id="effectsRackContent-${idSuffix}" class="flex flex-col h-full p-1 text-xs dark:bg-slate-800 dark:text-slate-300">
        <h3 class="text-sm font-semibold mb-1 dark:text-slate-100">${ownerType === 'track' ? `Effects Rack: ${owner.name}` : 'Master Effects Rack'}</h3>
        <div id="effectsList-${idSuffix}" class="effects-list-container flex-shrink-0 overflow-y-auto border rounded mb-1 p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600" style="min-height: 80px; max-height: 150px;">
            <!-- Effects will be rendered here -->
        </div>
        <button id="addEffectBtn-${idSuffix}" class="add-effect-btn px-2 py-1 text-xs border rounded bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 dark:border-blue-500 mb-1 self-start">Add Effect +</button>
        <div id="effectControlsContainer-${idSuffix}" class="effect-controls-panel flex-grow overflow-y-auto border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600">
            <!-- Selected effect controls will appear here -->
            <p class="text-xs text-gray-500 dark:text-slate-400 italic">Select an effect to see its controls.</p>
        </div>
    </div>`;
}
export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    if (!listDiv) return;
    listDiv.innerHTML = '';
    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : (localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : []);

    if (!effectsArray || effectsArray.length === 0) {
        listDiv.innerHTML = '<p class="text-xs text-gray-500 dark:text-slate-400 italic">No effects added.</p>';
        if (controlsContainer) controlsContainer.innerHTML = ''; return;
    }

    const AVAILABLE_EFFECTS_LOCAL = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};

    effectsArray.forEach((effect, index) => {
        const effectDef = AVAILABLE_EFFECTS_LOCAL[effect.type];
        const displayName = effectDef ? effectDef.displayName : effect.type;
        const item = document.createElement('div');
        item.className = 'effect-item flex justify-between items-center p-1 border-b bg-white dark:bg-slate-800 dark:border-slate-700 rounded-sm shadow-xs text-xs';
        item.innerHTML = `<span class="effect-name flex-grow cursor-pointer hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400" title="Edit ${displayName}">${displayName}</span>
            <div class="effect-actions">
                <button class="up-btn text-xs px-0.5 ${index === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-green-600 dark:hover:text-green-400'} dark:text-slate-400" ${index === 0 ? 'disabled' : ''} title="Move Up">▲</button>
                <button class="down-btn text-xs px-0.5 ${index === effectsArray.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:text-green-600 dark:hover:text-green-400'} dark:text-slate-400" ${index === effectsArray.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
                <button class="remove-btn text-xs px-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remove Effect">✕</button>
            </div>`;
        item.querySelector('.effect-name').addEventListener('click', () => {
            renderEffectControls(owner, ownerType, effect.id, controlsContainer);
            listDiv.querySelectorAll('.bg-blue-100,.dark\\:bg-blue-700').forEach(el => el.classList.remove('bg-blue-100', 'dark:bg-blue-700', 'border-blue-300', 'dark:border-blue-500'));
            item.classList.add('bg-blue-100', 'dark:bg-blue-700', 'border-blue-300', 'dark:border-blue-500');
        });
        item.querySelector('.up-btn').addEventListener('click', () => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Reorder effect on ${ownerType === 'track' ? owner.name : 'Master'}`);
            if (ownerType === 'track') owner.reorderEffect(effect.id, index - 1);
            else if (localAppServices.reorderMasterEffect) localAppServices.reorderMasterEffect(effect.id, index - 1);
        });
        item.querySelector('.down-btn').addEventListener('click', () => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Reorder effect on ${ownerType === 'track' ? owner.name : 'Master'}`);
            if (ownerType === 'track') owner.reorderEffect(effect.id, index + 1);
            else if (localAppServices.reorderMasterEffect) localAppServices.reorderMasterEffect(effect.id, index + 1);
        });
        item.querySelector('.remove-btn').addEventListener('click', () => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Remove ${effect.type} from ${ownerType === 'track' ? owner.name : 'Master'}`);
            if (ownerType === 'track') owner.removeEffect(effect.id);
            else if (localAppServices.removeMasterEffect) localAppServices.removeMasterEffect(effect.id);
        });
        listDiv.appendChild(item);
    });
}

export function renderEffectControls(owner, ownerType, effectId, controlsContainer) {
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : (localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : []);
    const effectWrapper = effectsArray.find(e => e.id === effectId);

    if (!effectWrapper) { controlsContainer.innerHTML = '<p class="text-xs text-gray-500 dark:text-slate-400 italic">Select an effect.</p>'; return; }

    const AVAILABLE_EFFECTS_LOCAL = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
    const effectDef = AVAILABLE_EFFECTS_LOCAL[effectWrapper.type];

    if (!effectDef) { controlsContainer.innerHTML = `<p class="text-xs text-red-500">Error: Definition for "${effectWrapper.type}" not found.</p>`; return; }

    const titleEl = document.createElement('h4');
    titleEl.className = 'text-xs font-semibold mb-1 dark:text-slate-200'; titleEl.textContent = `Controls: ${effectDef.displayName}`;
    controlsContainer.appendChild(titleEl);
    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 text-xs';

    if (!effectDef.params || effectDef.params.length === 0) {
        gridContainer.innerHTML = '<p class="text-xs text-gray-500 dark:text-slate-400 italic col-span-full">No adjustable parameters.</p>';
    } else {
        effectDef.params.forEach(paramDef => {
            const controlWrapper = document.createElement('div');
            let currentValue; const pathKeys = paramDef.key.split('.'); let tempVal = effectWrapper.params;
            for (const key of pathKeys) { if (tempVal && typeof tempVal === 'object' && key in tempVal) tempVal = tempVal[key]; else { tempVal = undefined; break; } }
            currentValue = (tempVal !== undefined) ? tempVal : paramDef.defaultValue;

            if (paramDef.type === 'knob') {
                const knob = importedCreateKnob({ label: paramDef.label, min: paramDef.min, max: paramDef.max, step: paramDef.step, initialValue: currentValue, decimals: paramDef.decimals, displaySuffix: paramDef.displaySuffix, trackRef: (ownerType === 'track' ? owner : null), onValueChange: (val) => { if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, val); else if (localAppServices.updateMasterEffectParam) localAppServices.updateMasterEffectParam(effectId, paramDef.key, val); } }, localAppServices);
                controlWrapper.appendChild(knob.element);
            } else if (paramDef.type === 'select') {
                const label = document.createElement('label'); label.className = 'block text-xs font-medium mb-0.5 dark:text-slate-300'; label.textContent = paramDef.label + ':';
                const select = document.createElement('select'); select.className = 'w-full p-1 border rounded text-xs bg-white dark:bg-slate-600 dark:text-slate-200 dark:border-slate-500';
                paramDef.options.forEach(opt => { const option = document.createElement('option'); option.value = typeof opt === 'object' ? opt.value : opt; option.textContent = typeof opt === 'object' ? opt.text : opt; select.appendChild(option); });
                select.value = currentValue;
                select.addEventListener('change', (e) => {
                    const newValue = e.target.value; const finalValue = (typeof paramDef.defaultValue === 'number' && !isNaN(parseFloat(newValue))) ? parseFloat(newValue) : newValue;
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Change ${paramDef.label} for ${effectWrapper.type} on ${ownerType === 'track' ? owner.name : 'Master'}`);
                    if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, finalValue); else if (localAppServices.updateMasterEffectParam) localAppServices.updateMasterEffectParam(effectId, paramDef.key, finalValue);
                });
                controlWrapper.appendChild(label); controlWrapper.appendChild(select);
            } else if (paramDef.type === 'toggle') {
                const button = document.createElement('button'); button.className = `w-full p-1 border rounded text-xs dark:border-slate-500 dark:text-slate-300 ${currentValue ? 'bg-blue-500 text-white dark:bg-blue-600' : 'bg-gray-200 dark:bg-slate-600'}`; button.textContent = `${paramDef.label}: ${currentValue ? 'ON' : 'OFF'}`;
                button.addEventListener('click', () => {
                    const newValue = !currentValue;
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle ${paramDef.label} for ${effectWrapper.type} on ${ownerType === 'track' ? owner.name : 'Master'}`);
                    if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, newValue); else if (localAppServices.updateMasterEffectParam) localAppServices.updateMasterEffectParam(effectId, paramDef.key, newValue);
                    currentValue = newValue;
                    button.textContent = `${paramDef.label}: ${currentValue ? 'ON' : 'OFF'}`;
                    button.classList.toggle('bg-blue-500', currentValue);
                    button.classList.toggle('text-white', currentValue);
                    button.classList.toggle('dark:bg-blue-600', currentValue);
                    button.classList.toggle('bg-gray-200', !currentValue);
                    button.classList.toggle('dark:bg-slate-600', !currentValue);
                });
                controlWrapper.appendChild(button);
            }
            gridContainer.appendChild(controlWrapper);
        });
    }
    controlsContainer.appendChild(gridContainer);
}

function showAddEffectModal(owner, ownerType) {
    const AVAILABLE_EFFECTS_LOCAL = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
    let optionsHTML = '';
    for (const type in AVAILABLE_EFFECTS_LOCAL) {
        optionsHTML += `<option value="${type}">${AVAILABLE_EFFECTS_LOCAL[type].displayName || type}</option>`;
    }
    if (!optionsHTML) { showNotification("No effects available to add.", 2000); return; }

    const modalContent = `
        <p class="text-sm mb-2 dark:text-slate-300">Select an effect to add:</p>
        <select id="addEffectSelectModal" class="w-full p-2 border rounded text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
            ${optionsHTML}
        </select>
    `;
    showCustomModal('Add Effect', modalContent, [
        { text: 'Add', action: (modalEl) => {
            const selectEl = modalEl.querySelector('#addEffectSelectModal');
            const effectType = selectEl.value;
            if (effectType) {
                if (ownerType === 'track' && owner) {
                    if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Add ${effectType} to ${owner.name}`);
                    owner.addEffect(effectType);
                } else if (ownerType === 'master' && localAppServices.addMasterEffect) {
                    localAppServices.addMasterEffect(effectType);
                }
            }
        }},
        { text: 'Cancel' }
    ]);
}

// --- Window Opening Functions (Original Track Effects & Master Effects) ---
export function openTrackEffectsRackWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) return null;
    const windowId = `effectsRack-${trackId}`;
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        const winInstance = openWindows.get(windowId);
        if (winInstance && typeof winInstance.restore === 'function') {
            winInstance.restore();
        }
        return winInstance;
    }

    const contentDOM = buildModularEffectsRackDOM(track, 'track');
    const rackOptions = { width: 350, height: 400, minWidth: 300, minHeight: 250, initialContentKey: windowId };
    if (savedState) Object.assign(rackOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    const rackWindow = localAppServices.createWindow(windowId, `Effects: ${track.name}`, contentDOM, rackOptions);
    if (rackWindow?.element) {
        renderEffectsList(track, 'track', rackWindow.element.querySelector(`#effectsList-${track.id}`), rackWindow.element.querySelector(`#effectControlsContainer-${track.id}`));
        rackWindow.element.querySelector(`#addEffectBtn-${track.id}`)?.addEventListener('click', () => showAddEffectModal(track, 'track'));
    }
    return rackWindow;
}

export function openMasterEffectsRackWindow(savedState = null) {
    const windowId = 'masterEffectsRack';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        const winInstance = openWindows.get(windowId);
        if (winInstance && typeof winInstance.restore === 'function') {
            winInstance.restore();
        }
        return winInstance;
    }
    const contentDOM = buildModularEffectsRackDOM(null, 'master');
    const rackOptions = { width: 350, height: 400, minWidth: 300, minHeight: 250, initialContentKey: windowId };
    if (savedState) Object.assign(rackOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    const rackWindow = localAppServices.createWindow(windowId, 'Master Effects Rack', contentDOM, rackOptions);
    if (rackWindow?.element) {
        renderEffectsList(null, 'master', rackWindow.element.querySelector(`#effectsList-master`), rackWindow.element.querySelector(`#effectControlsContainer-master`));
        rackWindow.element.querySelector(`#addEffectBtn-master`)?.addEventListener('click', () => showAddEffectModal(null, 'master'));
    }
    return rackWindow;
}

// --- Mixer Window ---
export function openMixerWindow(savedState = null) { /* ... (unchanged) ... */ }
export function updateMixerWindow() { /* ... (unchanged) ... */ }
export function renderMixer(container) { /* ... (unchanged) ... */ }


// --- Piano Roll Window (Formerly Sequencer) ---
export function openPianoRollWindow(trackId, forceRedraw = false, savedState = null) { // Renamed function
    console.log(`[UI openPianoRollWindow START] Called for track ID: ${trackId}. Force redraw: ${forceRedraw}, SavedState: ${!!savedState}`);
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;

    if (!track) {
        console.error(`[UI openPianoRollWindow] Track ${trackId} not found. Aborting.`);
        if (localAppServices.showNotification) localAppServices.showNotification(`Track ${trackId} not found. Cannot open Piano Roll.`, 3000);
        return null;
    }
    if (track.type === 'Audio') {
        console.warn(`[UI openPianoRollWindow] Track ${trackId} is an Audio track. Piano Roll not applicable. Aborting.`);
        if (localAppServices.showNotification) localAppServices.showNotification(`Piano Roll is not available for Audio tracks.`, 3000);
        return null;
    }
    console.log(`[UI openPianoRollWindow] Track details: Name: ${track.name}, Type: ${track.type}, ActiveSeqID: ${track.activeSequenceId}`);
    if(track.sequences) console.log(`[UI openPianoRollWindow] Track sequences (count: ${track.sequences.length}):`, JSON.parse(JSON.stringify(track.sequences)));


    const windowId = `pianoRollWin-${trackId}`; // New Window ID for clarity
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();

    if (openWindows.has(windowId) && !forceRedraw && !savedState) {
        const win = openWindows.get(windowId);
        if (win && typeof win.restore === 'function' && win.element) {
            console.log(`[UI openPianoRollWindow] Restoring existing window ${windowId}`); win.restore();
            if (localAppServices.setActiveSequencerTrackId) localAppServices.setActiveSequencerTrackId(trackId); // Keep for playback logic
            return win;
        } else if (win && (!win.element || typeof win.restore !== 'function')) {
            console.warn(`[UI openPianoRollWindow] Window ${windowId} in map but invalid/corrupt. Removing and recreating.`);
            if(localAppServices.removeWindowFromStore) localAppServices.removeWindowFromStore(windowId);
        }
    }
    
    if (forceRedraw && openWindows.has(windowId)) {
        const existingWindow = openWindows.get(windowId);
        if (existingWindow && typeof existingWindow.close === 'function' && existingWindow.element) {
            try { 
                console.log(`[UI openPianoRollWindow] Force redraw: Closing existing window ${windowId}`); 
                if (existingWindow.konvaStage && typeof existingWindow.konvaStage.destroy === 'function') {
                    existingWindow.konvaStage.destroy(); existingWindow.konvaStage = null;
                }
                if (existingWindow.konvaResizeObserver && typeof existingWindow.konvaResizeObserver.disconnect === 'function') {
                    existingWindow.konvaResizeObserver.disconnect();
                }
                existingWindow.close(true);
            } catch (e) {
                console.warn(`[UI openPianoRollWindow] Error closing existing Piano Roll window for redraw for track ${trackId}:`, e);
            }
        }
    }

    const activeSequence = track.getActiveSequence();
    if (!activeSequence) {
        console.error(`[UI openPianoRollWindow] CRITICAL: Track ${trackId} ("${track.name}") has NO active sequence object. Cannot open Piano Roll.`);
        if (localAppServices.showNotification) localAppServices.showNotification(`Track "${track.name}" has no active sequence. Please add/select a sequence.`, 3500);
        return null;
    }
    console.log(`[UI openPianoRollWindow] Active sequence for track ${track.id}:`, JSON.parse(JSON.stringify(activeSequence)));

    const konvaContainer = document.createElement('div');
    konvaContainer.id = `pianoRollKonvaContainer-${trackId}`; 
    konvaContainer.className = 'w-full h-full overflow-auto bg-slate-800 dark:bg-slate-900';
    konvaContainer.style.position = 'relative'; 

    const desktopEl = localAppServices.uiElementsCache?.desktop || document.getElementById('desktop');
    const safeDesktopWidth = (desktopEl && typeof desktopEl.offsetWidth === 'number' && desktopEl.offsetWidth > 0) ? desktopEl.offsetWidth : 1024;
    
    const pianoRollOptions = { 
        width: Math.max(600, Math.min(1000, safeDesktopWidth - 40)),
        height: 450, 
        minWidth: 500, 
        minHeight: 300, 
        initialContentKey: windowId, 
        onCloseCallback: () => { 
            if (localAppServices.getActiveSequencerTrackId && localAppServices.getActiveSequencerTrackId() === trackId && localAppServices.setActiveSequencerTrackId) {
                localAppServices.setActiveSequencerTrackId(null); 
            }
            const win = openWindows.get(windowId); // Re-fetch window instance
            if (win && win.konvaStage && typeof win.konvaStage.destroy === 'function') {
                console.log(`[UI openPianoRollWindow onCloseCallback] Destroying Konva stage for track ${trackId}`);
                win.konvaStage.destroy();
                win.konvaStage = null;
            }
            if (win && win.konvaResizeObserver && typeof win.konvaResizeObserver.disconnect === 'function') {
                win.konvaResizeObserver.disconnect();
            }
        } 
    };
    if (savedState) { Object.assign(pianoRollOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized }); }

    const pianoRollWindow = localAppServices.createWindow(windowId, `Piano Roll: ${track.name} - ${activeSequence.name}`, konvaContainer, pianoRollOptions);

    if (pianoRollWindow?.element) {
        setTimeout(() => {
            if (konvaContainer.offsetWidth > 0 && konvaContainer.offsetHeight > 0) {
                 pianoRollWindow.konvaStage = createPianoRollStage(konvaContainer, track);
                if (pianoRollWindow.konvaStage) {
                    console.log(`[UI openPianoRollWindow] Konva stage successfully created for track ${trackId}`);
                    
                    const contentArea = pianoRollWindow.element.querySelector('.window-content'); 
                    if (contentArea) {
                        const resizeObserver = new ResizeObserver(entries => {
                            for (let entry of entries) {
                                if (pianoRollWindow.konvaStage && !pianoRollWindow.konvaStage.isDestroyed()) {
                                    const { width, height } = entry.contentRect;
                                    pianoRollWindow.konvaStage.width(width);
                                    pianoRollWindow.konvaStage.height(height);
                                    const backgroundLayer = pianoRollWindow.konvaStage.findOne('Layer');
                                    if (backgroundLayer) {
                                        const bgRect = backgroundLayer.findOne('Rect');
                                        if (bgRect) {
                                            bgRect.width(width);
                                            bgRect.height(height);
                                        }
                                        const textNode = backgroundLayer.findOne('Text');
                                        if (textNode) {
                                            textNode.text(`Piano Roll for: ${track.name}\n(Konva Stage Resized - ${width}x${height})\nFuture home of notes!`);
                                        }
                                        backgroundLayer.batchDraw();
                                    }
                                    console.log(`[UI] Konva stage for ${trackId} resized to ${width}x${height}`);
                                }
                            }
                        });
                        resizeObserver.observe(contentArea); 
                        pianoRollWindow.konvaResizeObserver = resizeObserver; 
                    }

                } else {
                     console.error(`[UI openPianoRollWindow] createPianoRollStage returned null for track ${trackId}`);
                }
            } else {
                console.warn(`[UI openPianoRollWindow] Konva container for track ${trackId} has no dimensions even after timeout. Width: ${konvaContainer.offsetWidth}, Height: ${konvaContainer.offsetHeight}. Stage creation might fail or be incorrect.`);
                 if (!pianoRollWindow.konvaStage && konvaContainer.offsetWidth > 0 && konvaContainer.offsetHeight > 0) {
                     pianoRollWindow.konvaStage = createPianoRollStage(konvaContainer, track);
                 }
            }
        }, 150); 

        if (localAppServices.setActiveSequencerTrackId) localAppServices.setActiveSequencerTrackId(trackId);
        
        console.log(`[UI openPianoRollWindow END] Piano Roll window for track ${trackId} initialization process started.`);
    } else {
        console.error(`[UI openPianoRollWindow END] Failed to create Piano Roll window for track ${trackId}.`);
    }
    return pianoRollWindow;
}


// --- UI Update & Drawing Functions ---
// ... (drawWaveform, drawInstrumentWaveform, renderSamplePads, updateSliceEditorUI, renderDrumSamplerPads, updateDrumPadControlsUI - UNCHANGED)
export function drawWaveform(track) {
    if (!track.waveformCanvasCtx || !track.audioBuffer || !track.audioBuffer.loaded) return;
    const ctx = track.waveformCanvasCtx;
    const canvas = ctx.canvas;
    const buffer = track.audioBuffer.get(); // Get the AudioBuffer
    if (!buffer) return;

    const data = buffer.getChannelData(0); // Get data from channel 0
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--accent-active').trim() || '#007bff'; // Use theme variable
    ctx.lineWidth = 0.5;
    ctx.beginPath();

    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.moveTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();
}

export function drawInstrumentWaveform(track) {
    if (!track.instrumentWaveformCanvasCtx || !track.instrumentSamplerSettings.audioBuffer || !track.instrumentSamplerSettings.audioBuffer.loaded) return;
    const ctx = track.instrumentWaveformCanvasCtx;
    const canvas = ctx.canvas;
    const buffer = track.instrumentSamplerSettings.audioBuffer.get();
    if (!buffer) return;

    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--accent-active').trim() || '#007bff';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0; let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.moveTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();

    if (track.instrumentSamplerSettings.loop && track.instrumentSamplerSettings.loopEnd > track.instrumentSamplerSettings.loopStart) {
        const pixelsPerSecond = canvas.width / buffer.duration;
        const loopStartPx = track.instrumentSamplerSettings.loopStart * pixelsPerSecond;
        const loopEndPx = track.instrumentSamplerSettings.loopEnd * pixelsPerSecond;

        ctx.strokeStyle = 'rgba(255, 165, 0, 0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(loopStartPx, 0); ctx.lineTo(loopStartPx, canvas.height);
        ctx.moveTo(loopEndPx, 0); ctx.lineTo(loopEndPx, canvas.height);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 165, 0, 0.1)';
        ctx.fillRect(loopStartPx, 0, loopEndPx - loopStartPx, canvas.height);
    }
}

export function renderSamplePads(track) {
    const inspectorWindow = localAppServices.getWindowById ? localAppServices.getWindowById(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow?.element || track.type !== 'Sampler') return;
    const padsContainer = inspectorWindow.element.querySelector(`#samplePadsContainer-${track.id}`);
    if (!padsContainer) return;
    padsContainer.innerHTML = '';

    track.slices.forEach((slice, index) => {
        const padButton = document.createElement('button');
        padButton.className = `pad-button text-xs p-1 border rounded m-0.5 ${track.selectedSliceForEdit === index ? 'selected-for-edit ring-2 ring-blue-500 dark:ring-blue-400' : 'dark:border-slate-600'}`;
        padButton.textContent = `Slice ${index + 1}`;
        if (!slice || slice.duration === 0) padButton.classList.add('opacity-50', 'cursor-not-allowed');

        padButton.addEventListener('click', () => {
            if (track.audioBuffer?.loaded && slice && slice.duration > 0) {
                if (localAppServices.playSlicePreview) localAppServices.playSlicePreview(track.id, index);
            }
            track.selectedSliceForEdit = index;
            updateSliceEditorUI(track);
            renderSamplePads(track);
        });
        padsContainer.appendChild(padButton);
    });
}

export function updateSliceEditorUI(track) {
    const inspectorWindow = localAppServices.getWindowById ? localAppServices.getWindowById(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow?.element || track.type !== 'Sampler' || !track.slices?.length) return;
    const selectedInfo = inspectorWindow.element.querySelector(`#selectedSliceInfo-${track.id}`);
    if (selectedInfo) selectedInfo.textContent = track.selectedSliceForEdit + 1;
    const slice = track.slices[track.selectedSliceForEdit];
    if (!slice) {
        console.warn(`[UI updateSliceEditorUI] No slice data for selected index ${track.selectedSliceForEdit} on track ${track.id}`);
        return;
    }

    if (track.inspectorControls.sliceVolume) track.inspectorControls.sliceVolume.setValue(slice.volume || 0.7);
    if (track.inspectorControls.slicePitch) track.inspectorControls.slicePitch.setValue(slice.pitchShift || 0);

    const loopToggleBtn = inspectorWindow.element.querySelector(`#sliceLoopToggle-${track.id}`);
    if (loopToggleBtn) { loopToggleBtn.textContent = slice.loop ? 'Loop: ON' : 'Loop: OFF'; loopToggleBtn.classList.toggle('active', slice.loop); }
    const reverseToggleBtn = inspectorWindow.element.querySelector(`#sliceReverseToggle-${track.id}`);
    if (reverseToggleBtn) { reverseToggleBtn.textContent = slice.reverse ? 'Rev: ON' : 'Rev: OFF'; reverseToggleBtn.classList.toggle('active', slice.reverse); }

    const env = slice.envelope || { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 };
    if (track.inspectorControls.sliceEnvAttack) track.inspectorControls.sliceEnvAttack.setValue(env.attack);
    if (track.inspectorControls.sliceEnvDecay) track.inspectorControls.sliceEnvDecay.setValue(env.decay);
    if (track.inspectorControls.sliceEnvSustain) track.inspectorControls.sliceEnvSustain.setValue(env.sustain);
    if (track.inspectorControls.sliceEnvRelease) track.inspectorControls.sliceEnvRelease.setValue(env.release);
}

export function renderDrumSamplerPads(track) {
    const inspectorWindow = localAppServices.getWindowById ? localAppServices.getWindowById(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow?.element || track.type !== 'DrumSampler') return;
    const padsContainer = inspectorWindow.element.querySelector(`#drumPadsGridContainer-${track.id}`);
    if (!padsContainer) return;
    padsContainer.innerHTML = '';

    track.drumSamplerPads.forEach((pad, index) => {
        const padButton = document.createElement('button');
        padButton.className = `pad-button text-xs p-1 border rounded m-0.5 ${track.selectedDrumPadForEdit === index ? 'selected-for-edit ring-2 ring-blue-500 dark:ring-blue-400' : 'dark:border-slate-600'}`;
        padButton.innerHTML = `Pad ${index + 1}${pad.originalFileName ? `<span class="pad-label">${pad.originalFileName.substring(0,10)}${pad.originalFileName.length > 10 ? '...' : ''}</span>` : ''}`;
        if (!pad.originalFileName && !pad.dbKey) padButton.classList.add('opacity-60');

        padButton.addEventListener('click', () => {
            if (pad.audioBuffer?.loaded || (pad.dbKey && track.drumPadPlayers[index]?.loaded)) {
                if (localAppServices.playDrumSamplerPadPreview) localAppServices.playDrumSamplerPadPreview(track.id, index);
            }
            track.selectedDrumPadForEdit = index;
            updateDrumPadControlsUI(track);
            renderDrumSamplerPads(track);
        });
        padsContainer.appendChild(padButton);
    });
}

export function updateDrumPadControlsUI(track) {
    const inspectorWindow = localAppServices.getWindowById ? localAppServices.getWindowById(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow || !inspectorWindow.element || track.type !== 'DrumSampler' || !track.drumSamplerPads) return;
    const inspector = inspectorWindow.element;

    const selectedPadIndex = track.selectedDrumPadForEdit;
    const padData = track.drumSamplerPads[selectedPadIndex];
    if (!padData) {
        console.warn(`[UI updateDrumPadControlsUI] No pad data for selected index ${selectedPadIndex} on track ${track.id}`);
        return;
    }

    const selectedInfo = inspector.querySelector(`#selectedDrumPadInfo-${track.id}`);
    if (selectedInfo) selectedInfo.textContent = selectedPadIndex + 1;

    const padSpecificDropZoneContainerId = `drumPadDropZoneContainer-${track.id}-${selectedPadIndex}`;
    const controlsArea = inspector.querySelector('.selected-pad-controls');
    let dzContainer = inspector.querySelector(`#${padSpecificDropZoneContainerId}`);

    if (controlsArea) {
        const existingDropZones = controlsArea.querySelectorAll(`div[id^="drumPadDropZoneContainer-${track.id}-"]`);
        existingDropZones.forEach(oldDz => {
            if (oldDz.id !== padSpecificDropZoneContainerId) oldDz.remove();
        });
        dzContainer = controlsArea.querySelector(`#${padSpecificDropZoneContainerId}`);
        if (!dzContainer) {
            dzContainer = document.createElement('div');
            dzContainer.id = padSpecificDropZoneContainerId;
            dzContainer.className = 'mb-1 text-xs';
            const firstChildOfControls = controlsArea.querySelector(':scope > *:not(h4)');
            if (firstChildOfControls) {
                controlsArea.insertBefore(dzContainer, firstChildOfControls);
            } else {
                controlsArea.appendChild(dzContainer);
            }
        }
    }

    if (dzContainer) {
        const existingAudioData = { originalFileName: padData.originalFileName, status: padData.status || (padData.originalFileName || padData.dbKey ? 'missing' : 'empty') };
        dzContainer.innerHTML = createDropZoneHTML(track.id, `drumPadFileInput-${track.id}-${selectedPadIndex}`, 'DrumSampler', selectedPadIndex, existingAudioData);
        const dzEl = dzContainer.querySelector('.drop-zone');
        const fileInputEl = dzContainer.querySelector(`#drumPadFileInput-${track.id}-${selectedPadIndex}`);
        if (dzEl) setupGenericDropZoneListeners(dzEl, track.id, 'DrumSampler', selectedPadIndex, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadDrumSamplerPadFile);
        if (fileInputEl) fileInputEl.onchange = (e) => { localAppServices.loadDrumSamplerPadFile(e, track.id, selectedPadIndex); };
    }

    const createAndPlaceKnob = (placeholderId, options) => {
        const placeholder = inspector.querySelector(`#${placeholderId}`);
        if (placeholder) {
            const knob = importedCreateKnob(options, localAppServices); // Use importedCreateKnob
            placeholder.innerHTML = ''; placeholder.appendChild(knob.element);
            return knob;
        }
        return null;
    };

    const env = padData.envelope || { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 };
    track.inspectorControls.drumPadVolume = createAndPlaceKnob(`drumPadVolumeKnob-${track.id}-placeholder`, { label: 'Vol', min:0, max:1, step:0.01, initialValue: padData.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadVolume(selectedPadIndex, val)});
    
    const pitchKnobOptions = { label: 'Pitch', min:-24, max:24, step:1, initialValue: padData.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setDrumSamplerPadPitch(selectedPadIndex, val), disabled: padData.autoStretchEnabled };
    
    if (!track.inspectorControls.drumPadPitch || track.inspectorControls.drumPadPitch.placeholderId !== `drumPadPitchKnob-${track.id}-placeholder`) {
        track.inspectorControls.drumPadPitch = createAndPlaceKnob(`drumPadPitchKnob-${track.id}-placeholder`, pitchKnobOptions);
        if(track.inspectorControls.drumPadPitch) track.inspectorControls.drumPadPitch.placeholderId = `drumPadPitchKnob-${track.id}-placeholder`;
    } else {
        track.inspectorControls.drumPadPitch.setValue(padData.pitchShift || 0, false);
        track.inspectorControls.drumPadPitch.refreshVisuals(padData.autoStretchEnabled);
    }

    const autoStretchToggle = inspector.querySelector(`#drumPadAutoStretchToggle-${track.id}`);
    const stretchBPMInput = inspector.querySelector(`#drumPadStretchBPM-${track.id}`);
    const stretchBeatsInput = inspector.querySelector(`#drumPadStretchBeats-${track.id}`);

    if (autoStretchToggle && stretchBPMInput && stretchBeatsInput) {
        autoStretchToggle.textContent = padData.autoStretchEnabled ? 'Stretch: ON' : 'Stretch: OFF';
        autoStretchToggle.classList.toggle('active', padData.autoStretchEnabled);
        stretchBPMInput.disabled = !padData.autoStretchEnabled;
        stretchBeatsInput.disabled = !padData.autoStretchEnabled;
        stretchBPMInput.style.opacity = padData.autoStretchEnabled ? '1' : '0.5';
        stretchBeatsInput.style.opacity = padData.autoStretchEnabled ? '1' : '0.5';
        stretchBPMInput.value = padData.stretchOriginalBPM || 120;
        stretchBeatsInput.value = padData.stretchBeats || 1;

        if (!autoStretchToggle.hasAttribute('listener-attached')) { /* ... listener attachment ... */ }
        if (!stretchBPMInput.hasAttribute('listener-attached')) { /* ... listener attachment ... */ }
        if (!stretchBeatsInput.hasAttribute('listener-attached')) { /* ... listener attachment ... */ }
    }

    track.inspectorControls.drumPadEnvAttack = createAndPlaceKnob(`drumPadEnvAttack-${track.id}-placeholder`, { label: 'Attack', min:0.001, max:1, step:0.001, initialValue: env.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'attack', val)});
    track.inspectorControls.drumPadEnvDecay = createAndPlaceKnob(`drumPadEnvDecay-${track.id}-placeholder`, { label: 'Decay', min:0.01, max:1, step:0.01, initialValue: env.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'decay', val)});
    track.inspectorControls.drumPadEnvSustain = createAndPlaceKnob(`drumPadEnvSustain-${track.id}-placeholder`, { label: 'Sustain', min:0, max:1, step:0.01, initialValue: env.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'sustain', val)});
    track.inspectorControls.drumPadEnvRelease = createAndPlaceKnob(`drumPadEnvRelease-${track.id}-placeholder`, { label: 'Release', min:0.01, max:2, step:0.01, initialValue: env.release, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'release', val)});
}

export function updateSequencerCellUI(sequencerWindowElement, trackType, row, col, isActive) {
    console.warn("[UI updateSequencerCellUI] This function is for the old DOM-based sequencer and will be replaced by Konva updates for the Piano Roll.");
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
    importedRenderSoundBrowserDirectory as renderSoundBrowserDirectory
};
