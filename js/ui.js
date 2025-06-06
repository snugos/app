// js/ui.js - All UI functions
import { SnugWindow } from './SnugWindow.js';
import { showNotification, createDropZoneHTML, setupGenericDropZoneListeners, showCustomModal, createContextMenu } from './utils.js';
import * as Constants from './constants.js';
import { handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack, handleOpenTrackInspector, handleOpenEffectsRack, handleOpenPianoRoll as handleOpenSequencer } from './eventHandlers.js';
import { getTracksState } from './state.js';

let localAppServices = {};

export function initializeUIModule(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
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
        if (step !== 0) boundedValue = Math.round(boundedValue / step) * step;
        const oldValue = currentValue;
        currentValue = Math.min(max, Math.max(min, boundedValue));
        updateKnobVisual();
        if (triggerCallback && options.onValueChange && (oldValue !== currentValue || fromInteraction) ) {
            options.onValueChange(currentValue, oldValue, fromInteraction);
        }
    }

    function handleInteraction(e) {
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
    }
    
    knobEl.addEventListener('mousedown', handleInteraction);
    setValue(currentValue, false);

    return { element: container, setValue, getValue: () => currentValue };
}

function buildSynthEngineControls(track, container, engineType) {
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
    definitions.forEach(def => {
        const placeholder = container.querySelector(`#${def.idPrefix}-placeholder-${track.id}`);
        if (!placeholder) return;
        let initialValue = def.path.split('.').reduce((o, i) => o?.[i], track.synthParams) ?? def.defaultValue;
        const knob = createKnob({ label: def.label, min: def.min, max: def.max, step: def.step, initialValue, onValueChange: val => track.setSynthParam(def.path, val) });
        placeholder.appendChild(knob.element);
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
    // ... logic for sampler controls
}

function initializeTypeSpecificInspectorControls(track, winEl) {
    if (track.type === 'Synth') {
        initializeSynthSpecificControls(track, winEl);
    } else if (track.type === 'Sampler' || track.type === 'DrumSampler' || track.type === 'InstrumentSampler') {
        initializeSamplerSpecificControls(track, winEl);
    }
}

function buildTrackInspectorContentDOM(track) {
    // ... logic to build inspector HTML
}

export function openTrackInspectorWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById(trackId);
    if (!track) return null;
    const windowId = `trackInspector-${trackId}`;
    if (localAppServices.getOpenWindows().has(windowId)) {
        localAppServices.getOpenWindows().get(windowId).restore(); return;
    }
    const contentDOM = buildTrackInspectorContentDOM(track);
    const inspectorWindow = localAppServices.createWindow(windowId, `Inspector: ${track.name}`, contentDOM, { width: 320, height: 450 });
    if (inspectorWindow?.element) {
        initializeCommonInspectorControls(track, inspectorWindow.element);
        initializeTypeSpecificInspectorControls(track, inspectorWindow.element);
    }
}

function initializeCommonInspectorControls(track, winEl) {
    // ... logic to attach common listeners
}

export function openTrackEffectsRackWindow(trackId, savedState = null) {
    // ... logic to open effects rack
}
export function renderEffectsList() {}
export function renderEffectControls() {}
export function openMasterEffectsRackWindow() {}
export function openMixerWindow() {}
export function updateMixerWindow() {}
export function renderMixer() {}
export function openPianoRollWindow() {}
export function openTimelineWindow() {}
export function renderTimeline() {}
export function updatePlayheadPosition() {}
export function openSoundBrowserWindow() {}
export function updateSoundBrowserDisplayForLibrary() {}
export function renderSoundBrowserDirectory() {}
export function openYouTubeImporterWindow() {}
export function drawWaveform() {}
export function drawInstrumentWaveform() {}
export function renderSamplePads() {}
export function updateSliceEditorUI() {}
export function renderDrumSamplerPads() {}
export function updateDrumPadControlsUI() {}
export function updateSequencerCellUI() {}
export function highlightPlayingStep() {}
