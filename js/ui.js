// js/ui.js - UI Module (v2025.02)
// Last updated: Timeline ruler with zoom control via scroll wheel
import { SnugWindow } from './SnugWindow.js';
// Added showConfirmationDialog to the import statement
import { showNotification, createDropZoneHTML, setupGenericDropZoneListeners, showCustomModal, createContextMenu, showConfirmationDialog } from './utils.js';
import * as Constants from './constants.js';
// Event handlers are now mostly called via appServices from main.js,
// but direct calls might still exist or be transitioned.
import {
    getMidiCCMappings, getMidiCCLearnActive,
    clearMidiCCMappings, removeMidiCCMapping, setMidiCCMapping, getMidiCCMapping,
    startMidiCCLearn, cancelMidiCCLearn
} from './eventHandlers.js';
import { getTracksState, getProjectNotesState, setProjectNotesState } from './state.js';


// Module-level state for appServices, to be set by main.js
let localAppServices = {};
let selectedSoundForPreviewData = null; // Holds data for the sound selected for preview
let soundBrowserSearchQuery = ''; // Search/filter query for the sound browser
let timelineZoomLevel = 1.0; // Timeline zoom: 1.0 = default, higher = zoomed in
let timelineScrollX = 0; // Horizontal scroll offset for timeline

// Sound Browser tab state: 'browse' | 'favorites' | 'recent'
    let soundBrowserActiveTab = 'browse';
    let soundBrowserRenderedCount = 0; // How many items currently rendered (lazy-load)
    let soundBrowserTotalItems = 0; // Total items in current view
    const BROWSE_PER_PAGE = 50; // Items to render per load-more batch

// Sequencer view mode: 'step' (default) or 'piano' (piano roll)
let sequencerViewMode = 'step';
// Module-level clipboard for velocity copy/paste (used in sequencer click handler)
let clipboard = null;

export function toggleSequencerViewMode() {
    sequencerViewMode = sequencerViewMode === 'step' ? 'piano' : 'step';
    // Refresh the active sequencer window if one is open
    const armed = localAppServices.getArmedTrackId ? localAppServices.getArmedTrackId() : null;
    if (armed && localAppServices.openTrackSequencerWindow) {
        localAppServices.openTrackSequencerWindow(armed, true);
    } else {
        // Fallback: find any open sequencer window and refresh it
        const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
        for (const [id, win] of openWindows) {
            if (id.startsWith('sequencerWin-') && typeof win.close === 'function') {
                const trackId = id.replace('sequencerWin-', '');
                try { win.close(true); } catch(e) {}
                if (localAppServices.openTrackSequencerWindow) {
                    localAppServices.openTrackSequencerWindow(trackId, false);
                }
                break;
            }
        }
    }
}

export function initializeUIModule(appServicesFromMain) {
    localAppServices = { ...localAppServices, ...appServicesFromMain };

    // Selected sound for preview now uses central state-backed appServices
    // No local fallback needed - appServices provides getSelectedSoundForPreview and setSelectedSoundForPreview

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

// --- Knob UI ---
// Global registry for MIDI CC learn to find knobs
let _knobTargetIdCounter = 0;

export function createKnob(options) {
    const container = document.createElement('div');
    container.className = 'knob-container';
    container.dataset.targetType = 'knob';

    // Generate unique targetId for MIDI CC mapping
    const targetId = options.targetId || (`knob_${++_knobTargetIdCounter}_${Date.now()}`);
    container.dataset.midiTargetId = targetId;

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
    const maxDegrees = options.maxDegrees || 270;
    const BASE_PIXELS_PER_FULL_RANGE_MOUSE = 300;
    const BASE_PIXELS_PER_FULL_RANGE_TOUCH = 450;
    let initialValueBeforeInteraction = currentValue;

    // MIDI CC learn state for this knob
    let isLearning = false;

    function updateKnobVisual() {
        const percentage = range === 0 ? 0 : (currentValue - min) / range;
        const rotation = (percentage * maxDegrees) - (maxDegrees / 2);
        handleEl.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        
        // Display as dB if requested (Ableton-style)
        if (options.displayAsDb) {
            if (currentValue <= 0.0001) {
                valueEl.textContent = '-∞';
            } else {
                const dbValue = 20 * Math.log10(currentValue);
                valueEl.textContent = dbValue.toFixed(1);
            }
        } else {
            valueEl.textContent = typeof currentValue === 'number' ? currentValue.toFixed(options.decimals !== undefined ? options.decimals : (step < 1 && step !== 0 ? 2 : 0)) : currentValue;
            if (options.displaySuffix) valueEl.textContent += options.displaySuffix;
        }
    }

    function setValue(newValue, triggerCallback = true, fromInteraction = false) {
        const numValue = parseFloat(newValue);
        if (isNaN(numValue)) return;
        let boundedValue = Math.min(max, Math.max(min, numValue));
        if (step !== 0) boundedValue = Math.round(boundedValue / step) * step;
        boundedValue = Math.min(max, Math.max(min, boundedValue));
        const oldValue = currentValue;
        currentValue = boundedValue;
        updateKnobVisual();
        if (triggerCallback && options.onValueChange && (oldValue !== currentValue || fromInteraction) ) {
            options.onValueChange(currentValue, oldValue, fromInteraction);
        }
    }

    function handleInteraction(e, isTouch = false) {
        e.preventDefault();
        initialValueBeforeInteraction = currentValue;
        const startY = isTouch ? e.touches[0].clientY : e.clientY;
        const startValue = currentValue;
        const pixelsForFullRange = isTouch ? BASE_PIXELS_PER_FULL_RANGE_TOUCH : BASE_PIXELS_PER_FULL_RANGE_MOUSE;
        const currentSensitivity = options.sensitivity === undefined ? 1 : options.sensitivity;

        function onMove(moveEvent) {
            if (isTouch && moveEvent.touches.length === 0) return;
            const currentY = isTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
            const deltaY = startY - currentY;
            let valueChange = (deltaY / pixelsForFullRange) * range * currentSensitivity;
            let newValue = startValue + valueChange;
            setValue(newValue, true, true);
        }

        function onEnd() {
            document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove);
            document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
            if (currentValue !== initialValueBeforeInteraction && localAppServices.captureStateForUndo) {
                let description = `Change ${options.label || 'knob'} to ${valueEl.textContent}`;
                if (options.trackRef && options.trackRef.name) {
                    description = `Change ${options.label || 'knob'} for ${options.trackRef.name} to ${valueEl.textContent}`;
                }
                localAppServices.captureStateForUndo(description);
            }
        }
        document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove, { passive: !isTouch });
        document.addEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
    }

    knobEl.addEventListener('mousedown', (e) => handleInteraction(e, false));
    knobEl.addEventListener('touchstart', (e) => handleInteraction(e, true), { passive: false });

    // Right-click context menu for MIDI CC Learn
    knobEl.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showKnobContextMenu(e, container, targetId);
    });

    // Register this knob with appServices if available
    function registerKnob() {
        if (localAppServices && localAppServices.registerKnobForMidiCC) {
            const ownerType = options.trackRef ? 'track' : (options.ownerType || 'master');
            const ownerId = options.trackRef ? options.trackRef.id : (options.ownerId || 'master');
            const paramPath = options.paramPath || options.label || 'unknown';
            localAppServices.registerKnobForMidiCC(targetId, { setValue, getValue: () => currentValue, element: container }, ownerType, ownerId, paramPath);
        }
    }

    // Unregister on cleanup (returned object's cleanup method)
    function unregisterKnob() {
        if (localAppServices && localAppServices.unregisterKnobForMidiCC) {
            localAppServices.unregisterKnobForMidiCC(targetId);
        }
    }

    setValue(currentValue, false); // Initialize visual

    // Register knob once localAppServices is available (via initializeUIModule)
    if (localAppServices && localAppServices.registerKnobForMidiCC) {
        registerKnob();
    } else {
        // Defer registration until localAppServices is ready
        const checkAndRegister = setInterval(() => {
            if (localAppServices && localAppServices.registerKnobForMidiCC) {
                registerKnob();
                clearInterval(checkAndRegister);
            }
        }, 100);
        // Clean up interval when knob is destroyed (via returned cleanup function)
        setTimeout(() => clearInterval(checkAndRegister), 5000);
    }

    return {
        element: container,
        setValue,
        getValue: () => currentValue,
        type: 'knob',
        refreshVisuals: updateKnobVisual,
        targetId,
        unregister: unregisterKnob,
        // Method to trigger MIDI learn visual state
        setLearningMode: (learning) => {
            isLearning = learning;
            container.classList.toggle('midi-cc-learn-active', learning);
        },
        isLearning: () => isLearning
    };
}

// Context menu for knob MIDI CC learn
function showKnobContextMenu(event, knobContainer, targetId) {
    // Remove any existing context menu
    const existing = document.querySelector('#knob-midi-cc-menu');
    if (existing) existing.remove();

    const mapping = (typeof getMidiCCMapping === 'function') ? getMidiCCMapping(targetId) : null;

    const menuItems = [
        { label: `MIDI Learn`, separator: true },
        { label: mapping ? `CC ${mapping.cc} (ch ${mapping.channel + 1}) — Click to re-learn` : 'Assign MIDI CC...', action: () => {
            if (typeof startMidiCCLearn === 'function') {
                const ownerType = knobContainer.dataset.ownerType || 'unknown';
                const ownerId = knobContainer.dataset.ownerId || 'unknown';
                const paramPath = knobContainer.dataset.paramPath || knobContainer.querySelector('.knob-label')?.textContent || 'unknown';
                startMidiCCLearn(targetId, paramPath, ownerId, 0, 1);
                knobContainer.classList.add('midi-cc-learn-pending');
            }
        }},
        mapping ? { label: 'Clear CC Mapping', action: () => {
            if (typeof removeMidiCCMapping === 'function') {
                removeMidiCCMapping(targetId);
                showNotification(`MIDI CC mapping cleared for this knob.`, 2000);
            }
        }} : null,
        { separator: true },
        { label: 'Value', disabled: true }
    ].filter(Boolean);

    if (typeof createContextMenu === 'function') {
        createContextMenu(event, menuItems, localAppServices);
    }
}

// --- Specific Inspector DOM Builders ---
function buildSynthSpecificInspectorDOM(track) {
    const engineType = track.synthEngineType || 'MonoSynth';
    const definitions = ((localAppServices.effectsRegistryAccess) && (localAppServices.effectsRegistryAccess).synthEngineControlDefinitions)?.[engineType] || [];
    let controlsHTML = `<div id="synthEngineControls-${track.id}" class="grid grid-cols-2 md:grid-cols-3 gap-2 p-1">`;
    definitions.forEach(def => { controlsHTML += `<div id="${def.idPrefix}-${track.id}-placeholder"></div>`; });
    controlsHTML += `</div>`;
    // Preset controls
    controlsHTML += `<div class="synth-preset-controls border-t dark:border-slate-600 pt-1 mt-1">
        <div class="flex items-center gap-1 mb-1">
            <select id="synthPresetSelect-${track.id}" class="flex-1 p-1 border rounded text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200">
                <option value="">— Load Preset —</option>
            </select>
            <button id="synthPresetLoadBtn-${track.id}" title="Load Selected Preset" class="px-2 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Load</button>
        </div>
        <div class="flex items-center gap-1">
            <input type="text" id="synthPresetName-${track.id}" placeholder="Preset name" class="flex-1 p-1 border rounded text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 dark:placeholder-slate-400">
            <button id="synthPresetSaveBtn-${track.id}" title="Save Preset" class="px-2 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">Save</button>
            <button id="synthPresetDeleteBtn-${track.id}" title="Delete Preset" class="px-2 py-0.5 text-xs border rounded dark:border-slate-500 text-red-400 dark:hover:bg-slate-600">×</button>
        </div>
    </div>`;
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
                    <select id="instrumentRootNote-${track.id}" class="w-full p-1 border rounded text-xs bg-gray-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-600"></select>
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

function buildAudioTrackInspectorDOM(track) {
    return `<div class="audio-track-controls p-1 space-y-2">
        <div class="audio-input-section p-2 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1">
            <h4 class="text-xs font-semibold dark:text-slate-200">Audio Input</h4>
            <div class="mb-1">
                <label for="audioInputDevice-${track.id}" class="block text-xs font-medium dark:text-slate-300 mb-0.5">Input Device:</label>
                <select id="audioInputDevice-${track.id}" class="w-full p-1 border rounded text-xs bg-gray-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-600">
                    <option value="">Default Input</option>
                </select>
            </div>
            <div id="inputGain-${track.id}-placeholder" class="my-1"></div>
        </div>
        <div class="monitoring-section p-2 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1">
            <div class="flex items-center justify-between">
                <span class="text-xs font-medium dark:text-slate-300">Input Monitoring</span>
                <span id="monitoringVolumeLabel-${track.id}" class="text-xs dark:text-slate-400">50%</span>
            </div>
            <input type="range" id="monitoringVolume-${track.id}" min="0" max="100" value="50" class="w-full h-2 bg-gray-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer">
            <input type="hidden" id="recordingStatus-${track.id}" value="Ready">
        </div>
    </div>`;
}

function getNormalizedDrumSamplerPadIndex(track, fallback = 0) {
    const parsedIndex = Number.parseInt(track?.selectedDrumPadForEdit, 10);
    if (Number.isInteger(parsedIndex) && parsedIndex >= 0) {
        return parsedIndex;
    }
    return fallback;
}

export function getDrumSamplerPadExistingAudioData(track, padIndex) {
    const padData = track && track.drumSamplerPads && track.drumSamplerPads[padIndex] ? track.drumSamplerPads[padIndex] : null;
    if (!padData) {
        return { originalFileName: null, status: 'empty' };
    }
    return {
        originalFileName: padData.originalFileName || padData.sampleName || null,
        status: padData.status || ((padData.dbKey || padData.audioBufferDataURL) ? 'missing' : 'empty')
    };
}

function buildDrumSamplerSpecificInspectorDOM(track) {
    const selectedPadIndex = getNormalizedDrumSamplerPadIndex(track);
    return `<div class="drum-sampler-controls p-1 space-y-2">
        <div class="selected-pad-controls p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 space-y-1">
            <h4 class="text-xs font-semibold dark:text-slate-200">Edit Pad: <span id="selectedDrumPadInfo-${track.id}">1</span></h4>
            <div id="drumPadDropZoneContainer-${track.id}-${selectedPadIndex}" class="mb-1 text-xs"></div>
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
         </div>
        <div id="drumPadsGridContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>
    </div>`;
}

export function renderDrumPadEditorControls(track) {
    if (!track || track.type !== 'DrumSampler') return null;

    const selectedPadIndex = getNormalizedDrumSamplerPadIndex(track);
    const inspectorWindow = document.getElementById(`window-trackInspector-${track.id}`);
    if (!inspectorWindow) return null;

    const controlsWrapper = inspectorWindow.querySelector('.selected-pad-controls');
    if (!controlsWrapper) return null;

    const containerId = `drumPadDropZoneContainer-${track.id}-${selectedPadIndex}`;
    let container = controlsWrapper.querySelector(`#${containerId}`);
    if (!container) {
        const existingContainer = controlsWrapper.querySelector('[id^="drumPadDropZoneContainer-"]');
        if (existingContainer) {
            existingContainer.id = containerId;
            container = existingContainer;
        } else {
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'mb-1 text-xs';
            const volumePlaceholder = controlsWrapper.querySelector(`#drumPadVolumeKnob-${track.id}-placeholder`);
            if (volumePlaceholder && volumePlaceholder.parentElement) {
                volumePlaceholder.parentElement.insertBefore(container, volumePlaceholder.parentElement.firstChild);
            } else {
                controlsWrapper.insertBefore(container, controlsWrapper.firstChild);
            }
        }
    }

    const existingAudioData = getDrumSamplerPadExistingAudioData(track, selectedPadIndex);
    const inputId = `drumPadFileInput-${track.id}-${selectedPadIndex}`;

    container.innerHTML = createDropZoneHTML(track.id, inputId, 'DrumSampler', selectedPadIndex, existingAudioData);

    const dropZone = container.querySelector('.drop-zone');
    const fileInput = container.querySelector(`#${inputId}`);
    if (dropZone) {
        setupGenericDropZoneListeners(
            dropZone,
            track.id,
            'DrumSampler',
            selectedPadIndex,
            localAppServices.loadSoundFromBrowserToTarget,
            localAppServices.loadDrumSamplerPadFile,
            localAppServices.getTrackById
        );
    }
    if (fileInput && localAppServices.loadDrumSamplerPadFile) {
        fileInput.onchange = (e) => localAppServices.loadDrumSamplerPadFile(e, track.id, selectedPadIndex);
    }

    return container;
}

// --- Specific Inspector Control Initializers ---
function buildSynthEngineControls(track, container, engineType) {
    const definitions = ((localAppServices.effectsRegistryAccess) && (localAppServices.effectsRegistryAccess).synthEngineControlDefinitions)?.[engineType] || [];
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
        if (def.path.endsWith('.value') && ((track.instrument) && (track.instrument).get)) { // For Tone.Signal parameters
            const signalPath = def.path.substring(0, def.path.lastIndexOf('.value'));
            const signalValue = track.instrument.get(signalPath)?.value;
            if (signalValue !== undefined) initialValue = signalValue;
        }

        if (def.type === 'knob') {
            const knob = createKnob({ label: def.label, min: def.min, max: def.max, step: def.step, initialValue, decimals: def.decimals, displaySuffix: def.displaySuffix, trackRef: track, onValueChange: (val) => track.setSynthParam(def.path, val) });
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
    // Wire synth preset controls
    const selectEl = winEl.querySelector(`#synthPresetSelect-${track.id}`);
    const loadBtn = winEl.querySelector(`#synthPresetLoadBtn-${track.id}`);
    const saveBtn = winEl.querySelector(`#synthPresetSaveBtn-${track.id}`);
    const deleteBtn = winEl.querySelector(`#synthPresetDeleteBtn-${track.id}`);
    const nameInput = winEl.querySelector(`#synthPresetName-${track.id}`);
    if (selectEl) {
        const allPresets = localAppServices.getSynthPresets ? localAppServices.getSynthPresets() : {};
        selectEl.innerHTML = '<option value="">— Load Preset —</option>';
        Object.keys(allPresets).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            selectEl.appendChild(opt);
        });
        selectEl.addEventListener('change', () => {
            if (nameInput) nameInput.value = selectEl.value;
        });
    }
    if (loadBtn) {
        loadBtn.addEventListener('click', async () => {
            const selectedName = selectEl.value;
            if (!selectedName) { showNotification('Select a preset to load.', 2000); return; }
            const allPresets = localAppServices.getSynthPresets ? localAppServices.getSynthPresets() : {};
            const presetData = allPresets[selectedName];
            if (!presetData) { showNotification(`Preset "${selectedName}" not found.`, 2000); return; }
            if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Load Preset "${selectedName}" on ${track.name}`);
            await track.applySynthPreset(presetData);
            // Rebuild engine controls for new engine type
            if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'inspectorUpdated');
            showNotification(`Preset "${selectedName}" loaded.`, 2000);
        });
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const name = nameInput && nameInput.value.trim();
            if (!name) { showNotification('Enter a preset name to save.', 2000); return; }
            const presetData = {
                synthEngineType: track.synthEngineType || 'MonoSynth',
                synthParams: JSON.parse(JSON.stringify(track.synthParams || {}))
            };
            if (localAppServices.saveSynthPreset) localAppServices.saveSynthPreset(name, presetData);
            if (selectEl) {
                const opt = document.createElement('option');
                opt.value = name; opt.textContent = name;
                selectEl.appendChild(opt);
                selectEl.value = name;
            }
            if (nameInput) nameInput.value = '';
            showNotification(`Preset "${name}" saved.`, 2000);
        });
    }
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            const selectedName = selectEl.value || (nameInput && nameInput.value.trim());
            if (!selectedName) { showNotification('Select a preset to delete.', 2000); return; }
            if (localAppServices.deleteSynthPreset) localAppServices.deleteSynthPreset(selectedName);
            if (selectEl) {
                for (let i = selectEl.options.length - 1; i >= 0; i--) {
                    if (selectEl.options[i].value === selectedName) selectEl.remove(i);
                }
                selectEl.value = '';
            }
            if (nameInput) nameInput.value = '';
            showNotification(`Preset "${selectedName}" deleted.`, 2000);
        });
    }
}

function initializeSamplerSpecificControls(track, winEl) {
    console.log(`[UI] initializeSamplerSpecificControls called for track ${track.id}, type: ${track.type}`);
    
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-sampler`);
    if (dzContainerEl) {
        const existingAudioData = { originalFileName: track.samplerAudioData.fileName, status: track.samplerAudioData.status || (track.samplerAudioData.fileName ? 'missing' : 'empty') };
        dzContainerEl.innerHTML = createDropZoneHTML(track.id, `fileInput-${track.id}`, 'Sampler', null, existingAudioData);
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        const fileInputEl = dzContainerEl.querySelector(`#fileInput-${track.id}`);
        if (dzEl) setupGenericDropZoneListeners(dzEl, track.id, 'Sampler', null, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadSampleFile);
        if (fileInputEl) fileInputEl.onchange = (e) => { localAppServices.loadSampleFile(e, track.id, 'Sampler'); };
    }
    
    console.log(`[UI] About to call renderSamplePads for track ${track.id}`);
    renderSamplePads(track);
    
    const canvas = winEl.querySelector(`#waveformCanvas-${track.id}`);
    if (canvas) {
        track.waveformCanvasCtx = canvas.getContext('2d');
        if(((track.audioBuffer) && (track.audioBuffer).loaded)) drawWaveform(track);
    }
    updateSliceEditorUI(track);

    const createAndPlaceKnob = (placeholderId, options) => {
        const placeholder = winEl.querySelector(`#${placeholderId}`);
        if (placeholder) {
            const knob = createKnob(options);
            placeholder.innerHTML = ''; placeholder.appendChild(knob.element); return knob;
        }
        return null;
    };
    const selectedSlice = track.slices[track.selectedSliceForEdit] || track.slices[0] || { volume: 0.7, pitchShift: 0, envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 } };
    track.inspectorControls.sliceVolume = createAndPlaceKnob(`sliceVolumeSlider-${track.id}-placeholder`, { label: 'Vol', min:0, max:1, step:0.01, initialValue: selectedSlice.volume, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceVolume(track.selectedSliceForEdit, val)});
    track.inspectorControls.slicePitch = createAndPlaceKnob(`slicePitchKnob-${track.id}-placeholder`, { label: 'Pitch', min:-24, max:24, step:1, initialValue: selectedSlice.pitchShift, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setSlicePitchShift(track.selectedSliceForEdit, val)});
    track.inspectorControls.sliceEnvAttack = createAndPlaceKnob(`sliceEnvAttackSlider-${track.id}-placeholder`, { label: 'Attack', min:0.001, max:1, step:0.001, initialValue: selectedSlice.envelope.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'attack', val)});
    track.inspectorControls.sliceEnvDecay = createAndPlaceKnob(`sliceEnvDecaySlider-${track.id}-placeholder`, { label: 'Decay', min:0.01, max:1, step:0.01, initialValue: selectedSlice.envelope.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'decay', val)});
    track.inspectorControls.sliceEnvSustain = createAndPlaceKnob(`sliceEnvSustainSlider-${track.id}-placeholder`, { label: 'Sustain', min:0, max:1, step:0.01, initialValue: selectedSlice.envelope.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'sustain', val)});
    track.inspectorControls.sliceEnvRelease = createAndPlaceKnob(`sliceEnvReleaseSlider-${track.id}-placeholder`, { label: 'Release', min:0.01, max:2, step:0.01, initialValue: selectedSlice.envelope.release, decimals:2, trackRef: track, onValueChange: (val) => track.setSliceEnvelopeParam(track.selectedSliceForEdit, 'release', val)});

    const loopToggleBtn = winEl.querySelector(`#sliceLoopToggle-${track.id}`);
    if (loopToggleBtn) {
        loopToggleBtn.textContent = selectedSlice.loop ? 'Loop: ON' : 'Loop: OFF';
        loopToggleBtn.classList.toggle('active', selectedSlice.loop);
        loopToggleBtn.addEventListener('click', (e) => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Loop for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`);
            const currentSlice = track.slices[track.selectedSliceForEdit];
            track.setSliceLoop(track.selectedSliceForEdit, !currentSlice.loop);
            e.target.textContent = currentSlice.loop ? 'Loop: ON' : 'Loop: OFF';
            e.target.classList.toggle('active', currentSlice.loop);
        });
    }
    const reverseToggleBtn = winEl.querySelector(`#sliceReverseToggle-${track.id}`);
    if(reverseToggleBtn){
        reverseToggleBtn.textContent = selectedSlice.reverse ? 'Rev: ON' : 'Rev: OFF';
        reverseToggleBtn.classList.toggle('active', selectedSlice.reverse);
        reverseToggleBtn.addEventListener('click', (e) => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Reverse for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`);
            const currentSlice = track.slices[track.selectedSliceForEdit];
            track.setSliceReverse(track.selectedSliceForEdit, !currentSlice.reverse);
            e.target.textContent = currentSlice.reverse ? 'Rev: ON' : 'Rev: OFF';
            e.target.classList.toggle('active', currentSlice.reverse);
        });
    }
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

function initializeInstrumentSamplerSpecificControls(track, winEl) {
    if (!track || !winEl) return;
    // Set up drop zone for instrument sampler sample upload
    const dropZoneContainer = winEl.querySelector(`#dropZoneContainer-${track.id}-instrumentsampler`);
    if (dropZoneContainer) {
        dropZoneContainer.innerHTML = createDropZoneHTML(track.id, `instrumentSamplerFileInput-${track.id}`, 'InstrumentSampler', null, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadSampleFile);
        const dropZoneEl = dropZoneContainer.querySelector('.drop-zone');
        const fileInputEl = dropZoneContainer.querySelector(`#instrumentSamplerFileInput-${track.id}`);
        if (dropZoneEl) {
            setupGenericDropZoneListeners(dropZoneEl, track.id, 'InstrumentSampler', null, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadSampleFile);
        }
        if (fileInputEl) {
            fileInputEl.onchange = (e) => {
                if (localAppServices.loadSampleFile) {
                    localAppServices.loadSampleFile(e, track.id, 'InstrumentSampler', null);
                }
            };
        }
    }
    // Set up root note selector
    const rootNoteSelect = winEl.querySelector(`#instrumentRootNote-${track.id}`);
    if (rootNoteSelect) {
        const pitches = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        rootNoteSelect.innerHTML = pitches.map(p => `<option value="${p}">${p}</option>`).join('');
        if (track.instrumentRootNote) rootNoteSelect.value = track.instrumentRootNote;
    }
    // Envelope knobs
    const envParams = ['attack', 'decay', 'sustain', 'release'];
    envParams.forEach(param => {
        const placeholder = winEl.querySelector(`#instrumentEnv${param.charAt(0).toUpperCase() + param.slice(1)}-${track.id}-placeholder`);
        if (placeholder) {
            const knob = createKnob({
                label: param.charAt(0).toUpperCase() + param.slice(1),
                min: 0, max: 10, step: 0.01, initialValue: track[`instrumentEnv${param.charAt(0).toUpperCase() + param.slice(1)}`] || 0.1,
                trackRef: track,
                onValueChange: (val) => {
                    track[`instrumentEnv${param.charAt(0).toUpperCase() + param.slice(1)}`] = val;
                    if (track.updateInstrumentEnvelope) track.updateInstrumentEnvelope(param, val);
                }
            });
            placeholder.innerHTML = '';
            placeholder.appendChild(knob);
        }
    });
    // Waveform canvas
    const waveformCanvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`);
    if (waveformCanvas && localAppServices.drawInstrumentWaveform) {
        localAppServices.drawInstrumentWaveform(track, waveformCanvas);
    }
}

function buildTrackInspectorContentDOM(track) {
    if (!track) return '<div>Error: Track data not found.</div>';
    let specificControlsHTML = '';
    if (track.type === 'Synth') specificControlsHTML = buildSynthSpecificInspectorDOM(track);
    else if (track.type === 'Sampler') specificControlsHTML = buildSamplerSpecificInspectorDOM(track);
    else if (track.type === 'DrumSampler') specificControlsHTML = buildDrumSamplerSpecificInspectorDOM(track);
    else if (track.type === 'InstrumentSampler') specificControlsHTML = buildInstrumentSamplerSpecificInspectorDOM(track);
    else if (track.type === 'Audio') specificControlsHTML = buildAudioTrackInspectorDOM(track);

    const armedTrackId = localAppServices.getArmedTrackId ? localAppServices.getArmedTrackId() : null;
    const sequencerButtonHTML = `<button id="openSequencerBtn-${track.id}" class="px-1 py-0.5 border rounded bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:border-slate-500">Sequencer</button>`;
    const monitorButtonHTML = `<button id="monitorBtn-${track.id}" title="Toggle Input Monitoring" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 ${track.isMonitoringEnabled ? 'active' : ''}">Monitor</button>`;
    return `
        <div class="track-inspector-content p-1 space-y-1 text-xs text-gray-700 dark:text-slate-300 overflow-y-auto h-full">
            <div class="common-controls grid ${track.type === 'Audio' ? 'grid-cols-5' : 'grid-cols-4'} gap-1 mb-1">
                <button id="muteBtn-${track.id}" title="Mute Track" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 ${track.isMuted ? 'muted' : ''}">${track.isMuted ? 'Unmute' : 'Mute'}</button>
                <button id="muteAutomationBtn-${track.id}" title="Record Mute Automation" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 text-[10px]">M</button>
                <button id="soloBtn-${track.id}" title="Solo Track" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 ${track.isSoloed ? 'soloed' : ''}">${track.isSoloed ? 'Unsolo' : 'Solo'}</button>
                <button id="soloAutomationBtn-${track.id}" title="Record Solo Automation" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 text-[10px]">S</button>
                ${monitorButtonHTML}
                <button id="armInputBtn-${track.id}" title="Arm for MIDI/Keyboard Input or Audio Recording" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 ${armedTrackId === track.id ? 'armed' : ''}">Arm</button>
                <button id="automationArmBtn-${track.id}" title="Arm for Automation Recording" class="px-1 py-0.5 border rounded dark:border-slate-500 dark:hover:bg-slate-600 ${track.automationArmed ? 'automation-armed' : ''}">A</button>
            </div>
            <div id="volumeKnob-${track.id}-placeholder" class="mb-1"></div>
            <div id="trackMeterContainer-${track.id}" class="h-3 w-full bg-gray-200 dark:bg-slate-600 rounded border border-gray-300 dark:border-slate-500 overflow-hidden my-1">
                <div id="trackMeterBar-${track.id}" class="h-full bg-pink-400 transition-all duration-50 ease-linear" style="width: 0%; background-color:${track.trackColor || '#6366f1'}"></div>
            </div>
            <div class="type-specific-controls mt-1 border-t dark:border-slate-600 pt-1">${specificControlsHTML}</div>
            <div class="inspector-nav grid ${track.type === 'Audio' ? 'grid-cols-2' : 'grid-cols-3'} gap-1 mt-2">
                <button id="openEffectsBtn-${track.id}" class="px-1 py-0.5 border rounded bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:border-slate-500">Effects</button>
                ${sequencerButtonHTML}
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
        openWindows.get(windowId).restore(); return openWindows.get(windowId);
    }

    const contentDOM = buildTrackInspectorContentDOM(track);
    // Larger window for DrumSampler to show pads
    const baseHeight = track.type === 'DrumSampler' ? 580 : 450;
    const inspectorOptions = { width: 320, height: baseHeight, minWidth: 280, minHeight: 350, initialContentKey: windowId, onCloseCallback: () => { /* main.js can clear track.inspectorWindow if needed */ } };
    if (savedState) { Object.assign(inspectorOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized }); }

    const inspectorWindow = localAppServices.createWindow(windowId, `Inspector: ${track.name}`, contentDOM, inspectorOptions);

    if (((inspectorWindow) && (inspectorWindow).element)) {
        initializeCommonInspectorControls(track, inspectorWindow.element);
        initializeTypeSpecificInspectorControls(track, inspectorWindow.element);
    }
    return inspectorWindow;
}

export function openAudioClipEditorWindow(trackId, clipId, savedState = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) { console.error(`[UI] Track ${trackId} not found for clip editor.`); return null; }
    const clip = track.timelineClips ? track.timelineClips.find(c => c.id === clipId) : null;
    if (!clip) { console.error(`[UI] Clip ${clipId} not found in track ${trackId}.`); return null; }

    const windowId = `audioClipEditor-${clipId}`;
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        openWindows.get(windowId).restore();
        return openWindows.get(windowId);
    }

    const clipName = clip.name || clipId;
    const contentHTML = `
        <div style="padding:15px;font-family:sans-serif;font-size:13px;color:#e0e0e0;height:100%;display:flex;flex-direction:column;gap:10px;overflow-y:auto;">
            <h3 style="margin:0;color:#fff;">Edit Clip: ${clipName}</h3>
            <div class="border border-slate-600 rounded p-3 bg-slate-800 space-y-3">
                <div>
                    <label class="text-xs text-slate-400">Clip Name</label>
                    <input type="text" id="clipNameInput" value="${clipName}" class="w-full p-1 border border-slate-600 rounded bg-slate-700 text-slate-200 text-sm" />
                </div>
                <div>
                    <label class="text-xs text-slate-400">Color</label>
                    <input type="color" id="clipColorInput" value="${clip.color || '#6366f1'}" class="w-full h-8 rounded cursor-pointer" />
                </div>
                <div>
                    <label class="text-xs text-slate-400">Gain (0-4)</label>
                    <input type="range" id="clipGainInput" min="0" max="400" value="${Math.round((clip.gain !== undefined ? clip.gain : 1) * 100)}" class="w-full" />
                    <span id="clipGainLabel" class="text-xs text-slate-400">${clip.gain !== undefined ? clip.gain.toFixed(2) : '1.00'}</span>
                </div>
                <div>
                    <label class="text-xs text-slate-400">Playback Rate (0.25-4x)</label>
                    <input type="range" id="clipRateInput" min="25" max="400" value="${Math.round((clip.playbackRate !== undefined ? clip.playbackRate : 1) * 100)}" class="w-full" />
                    <span id="clipRateLabel" class="text-xs text-slate-400">${clip.playbackRate !== undefined ? clip.playbackRate.toFixed(2) : '1.00'}x</span>
                </div>
                <div>
                    <label class="text-xs text-slate-400">Fade In (seconds)</label>
                    <input type="number" id="clipFadeInInput" min="0" step="0.1" value="${clip.fadeIn !== undefined ? clip.fadeIn : 0}" class="w-full p-1 border border-slate-600 rounded bg-slate-700 text-slate-200 text-sm" />
                </div>
                <div>
                    <label class="text-xs text-slate-400">Fade Out (seconds)</label>
                    <input type="number" id="clipFadeOutInput" min="0" step="0.1" value="${clip.fadeOut !== undefined ? clip.fadeOut : 0}" class="w-full p-1 border border-slate-600 rounded bg-slate-700 text-slate-200 text-sm" />
                </div>
                <div>
                    <label class="text-xs text-slate-400">Start Offset (seconds)</label>
                    <input type="number" id="clipStartOffsetInput" min="0" step="0.01" value="${clip.startOffset || 0}" class="w-full p-1 border border-slate-600 rounded bg-slate-700 text-slate-200 text-sm" />
                </div>
                <div>
                    <label class="text-xs text-slate-400">End Offset (seconds)</label>
                    <input type="number" id="clipEndOffsetInput" min="0" step="0.01" value="${clip.endOffset || 0}" class="w-full p-1 border border-slate-600 rounded bg-slate-700 text-slate-200 text-sm" />
                </div>
            </div>
            <div class="flex justify-end gap-2 mt-auto">
                <button id="clipEditorCloseBtn" class="px-4  py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded">Cancel</button>
                <button id="clipEditorSaveBtn" class="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded">Save</button>
            </div>
        </div>`;

    const options = {
        width: 360,
        height: 480,
        minWidth: 280,
        minHeight: 350,
        initialContentKey: windowId
    };
    if (savedState) { Object.assign(options, { x: parseInt(savedState.left, 10), y: parseInt(savedState.top, 10), width: parseInt(savedState.width, 10), height: parseInt(savedState.height, 10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized }); }

    const win = localAppServices.createWindow(windowId, `Clip: ${clipName}`, contentHTML, options);

    if (win && win.element) {
        const gainSlider = win.element.querySelector('#clipGainInput');
        const gainLabel = win.element.querySelector('#clipGainLabel');
        gainSlider?.addEventListener('input', () => {
            const val = parseInt(gainSlider.value, 10) / 100;
            gainLabel.textContent = val.toFixed(2);
        });

        const rateSlider = win.element.querySelector('#clipRateInput');
        const rateLabel = win.element.querySelector('#clipRateLabel');
        rateSlider?.addEventListener('input', () => {
            const val = parseInt(rateSlider.value, 10) / 100;
            rateLabel.textContent = val.toFixed(2) + 'x';
        });

        win.element.querySelector('#clipEditorCloseBtn')?.addEventListener('click', () => {
            try { win.close(true); } catch (e) {}
        });

        win.element.querySelector('#clipEditorSaveBtn')?.addEventListener('click', () => {
            const nameInput = win.element.querySelector('#clipNameInput')?.value?.trim();
            const colorInput = win.element.querySelector('#clipColorInput')?.value;
            const gainVal = parseInt(gainSlider?.value || '100', 10) / 100;
            const rateVal = parseInt(rateSlider?.value || '100', 10) / 100;
            const fadeInVal = parseFloat(win.element.querySelector('#clipFadeInInput')?.value || '0');
            const fadeOutVal = parseFloat(win.element.querySelector('#clipFadeOutInput')?.value || '0');
            const startOffsetVal = parseFloat(win.element.querySelector('#clipStartOffsetInput')?.value || '0');
            const endOffsetVal = parseFloat(win.element.querySelector('#clipEndOffsetInput')?.value || '0');

            if (nameInput && track.setAudioClipName) track.setAudioClipName(clipId, nameInput);
            if (colorInput && track.setAudioClipColor) track.setAudioClipColor(clipId, colorInput);
            if (track.setAudioClipGain) track.setAudioClipGain(clipId, gainVal);
            if (track.setAudioClipPlaybackRate) track.setAudioClipPlaybackRate(clipId, rateVal);
            if (track.setAudioClipFadeIn) track.setAudioClipFadeIn(clipId, fadeInVal);
            if (track.setAudioClipFadeOut) track.setAudioClipFadeOut(clipId, fadeOutVal);
            if (track.setAudioClipStartOffset) track.setAudioClipStartOffset(clipId, startOffsetVal);
            if (track.setAudioClipEndOffset) track.setAudioClipEndOffset(clipId, endOffsetVal);

            if (localAppServices.renderTimeline) localAppServices.renderTimeline();
            const { showNotification } = localAppServices;
            if (showNotification) showNotification(`Clip "${nameInput || clipName}" saved.`, 1500);
            try { win.close(true); } catch (e) {}
        });
    }

    return win;
}

function initializeCommonInspectorControls(track, winEl) {
    winEl.querySelector(`#muteBtn-${track.id}`)?.addEventListener('click', () => localAppServices.handleTrackMute(track.id));
    winEl.querySelector(`#soloBtn-${track.id}`)?.addEventListener('click', () => localAppServices.handleTrackSolo(track.id));
    winEl.querySelector(`#armInputBtn-${track.id}`)?.addEventListener('click', () => localAppServices.handleTrackArm(track.id));

    // Automation arm button
    const automationArmBtn = winEl.querySelector(`#automationArmBtn-${track.id}`);
    if (automationArmBtn) {
        automationArmBtn.addEventListener('click', () => {
            track.automationArmed = !track.automationArmed;
            automationArmBtn.classList.toggle('automation-armed', track.automationArmed);
            const label = track.automationArmed ? 'A' : 'A';
            automationArmBtn.textContent = label;
            showNotification(`Automation recording ${track.automationArmed ? 'ARMED' : 'DISARMED'} for ${track.name}`, 1500);
            if (localAppServices.captureStateForUndo) {
                localAppServices.captureStateForUndo(`Toggle Automation Arm for ${track.name} to ${track.automationArmed}`);
            }
        });
    }

    const monitorBtn = winEl.querySelector(`#monitorBtn-${track.id}`);
    if (monitorBtn) {
        monitorBtn.addEventListener('click', () => {
            track.isMonitoringEnabled = !track.isMonitoringEnabled;
            monitorBtn.classList.toggle('active', track.isMonitoringEnabled);
            showNotification(`Input monitoring ${track.isMonitoringEnabled ? 'enabled' : 'disabled'} for ${track.name}`, 1500);
            if (localAppServices.setTrackMonitoring) localAppServices.setTrackMonitoring(track.id, track.isMonitoringEnabled);
        });
    }

    // Mute automation record button
    const muteAutomationBtn = winEl.querySelector(`#muteAutomationBtn-${track.id}`);
    if (muteAutomationBtn) {
        muteAutomationBtn.addEventListener('click', () => {
            if (track.toggleMuteAutomationNow) {
                track.toggleMuteAutomationNow();
            } else {
                showNotification('Automation recording not available for this track', 1500);
            }
        });
    }

    // Solo automation record button
    const soloAutomationBtn = winEl.querySelector(`#soloAutomationBtn-${track.id}`);
    if (soloAutomationBtn) {
        soloAutomationBtn.addEventListener('click', () => {
            if (track.toggleSoloAutomationNow) {
                track.toggleSoloAutomationNow();
            } else {
                showNotification('Automation recording not available for this track', 1500);
            }
        });
    }
}

function initializeTypeSpecificInspectorControls(track, winEl) {
    if (track.type === 'Synth') initializeSynthSpecificControls(track, winEl);
    else if (track.type === 'Sampler') initializeSamplerSpecificControls(track, winEl);
    else if (track.type === 'DrumSampler') {
        // Set up drop zone for drum pad sample upload
        const selectedPadIndex = getNormalizedDrumSamplerPadIndex(track);
        const dzContainerEl = winEl.querySelector(`#drumPadDropZoneContainer-${track.id}-${selectedPadIndex}`);
        if (dzContainerEl) {
            const existingAudioData = getDrumSamplerPadExistingAudioData(track, selectedPadIndex);
            dzContainerEl.innerHTML = createDropZoneHTML(track.id, `drumPadFileInput-${track.id}-${selectedPadIndex}`, 'DrumSampler', selectedPadIndex, existingAudioData);
            const dzEl = dzContainerEl.querySelector('.drop-zone');
            const fileInputEl = dzContainerEl.querySelector(`#drumPadFileInput-${track.id}-${selectedPadIndex}`);
            if (dzEl) setupGenericDropZoneListeners(dzEl, track.id, 'DrumSampler', selectedPadIndex, localAppServices.loadSoundFromBrowserToTarget, localAppServices.loadDrumSamplerPadFile);
            if (fileInputEl) fileInputEl.onchange = (e) => { localAppServices.loadDrumSamplerPadFile(e, track.id, selectedPadIndex); };
        }
        renderDrumPadEditorControls(track);
        renderDrumSamplerPads(track);
        updateDrumPadControlsUI(track);
    }
    else if (track.type === 'InstrumentSampler') initializeInstrumentSamplerSpecificControls(track, winEl);
    else if (track.type === 'Audio') initializeAudioTrackInspectorControls(track, winEl);
}

// --- Audio Track Inspector Controls Initialization ---
function initializeAudioTrackInspectorControls(track, winEl) {
    if (!track || !winEl) return;

    // Create input gain knob
    const gainPlaceholder = winEl.querySelector(`#inputGain-${track.id}-placeholder`);
    if (gainPlaceholder) {
        const defaultGain = Constants.DEFAULT_RECORDING_INPUT_GAIN;
        const currentGain = track.recordingInputGainValue || defaultGain;
        const gainKnob = createKnob({
            label: 'Input Gain',
            min: Constants.MIN_RECORDING_INPUT_GAIN,
            max: Constants.MAX_RECORDING_INPUT_GAIN,
            step: 0.01,
            initialValue: currentGain,
            decimals: 2,
            trackRef: track,
            onValueChange: (val) => {
                if (localAppServices.setRecordingInputGain) {
                    localAppServices.setRecordingInputGain(val);
                }
            }
        });
        gainPlaceholder.innerHTML = '';
        gainPlaceholder.appendChild(gainKnob.element);
    }

    // Set up monitoring volume slider
    const monitorSlider = winEl.querySelector(`#monitoringVolume-${track.id}`);
    const monitorLabel = winEl.querySelector(`#monitoringVolumeLabel-${track.id}`);
    if (monitorSlider) {
        const initialVol = track.monitoringVolume !== undefined ? track.monitoringVolume : 0.5;
        monitorSlider.value = Math.round(initialVol * 100);
        if (monitorLabel) monitorLabel.textContent = Math.round(initialVol * 100) + '%';

        monitorSlider.addEventListener('input', () => {
            const val = parseInt(monitorSlider.value, 10) / 100;
            track.monitoringVolume = val;
            if (monitorLabel) monitorLabel.textContent = Math.round(val * 100) + '%';
        });
    }

    // Enumerate audio input devices and populate select
    const deviceSelect = winEl.querySelector(`#audioInputDevice-${track.id}`);
    if (deviceSelect && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        navigator.mediaDevices.enumerateDevices()
            .then(devices => {
                const audioInputs = devices.filter(d => d.kind === 'audioinput');
                deviceSelect.innerHTML = '<option value="">Default Input</option>';
                audioInputs.forEach((device, idx) => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `Microphone ${idx + 1}`;
                    deviceSelect.appendChild(option);
                });
            })
            .catch(err => {
                console.warn('[UI initializeAudioTrackInspectorControls] enumerateDevices error:', err.message);
            });
    }
}

// --- Modular Effects Rack UI ---
function showTrackColorPicker(track) {
    const colors = Constants.TRACK_COLORS || ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#a855f7'];
    let swatchesHTML = '';
    colors.forEach(color => {
        const isSelected = track.trackColor === color;
        swatchesHTML += `<div class="track-color-swatch ${isSelected ? 'selected' : ''}" 
            style="background-color:${color}" 
            data-color="${color}"
            title="${color}"></div>`;
    });

    const modal = showCustomModal(`Color for ${track.name}`, 
        `<div class="track-color-picker">${swatchesHTML}</div>`,
        [{ label: 'Done', action: () => modal.overlay.remove() }]
    );

    if (((modal) && (modal).contentDiv)) {
        modal.contentDiv.querySelectorAll('.track-color-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                const newColor = swatch.dataset.color;
                if (localAppServices.captureStateForUndo) {
                    localAppServices.captureStateForUndo(`Change track color on ${track.name}`);
                }
                track.setTrackColor(newColor);
                modal.overlay.remove();
                // Re-render mixer to update color dots
                const mixerWindowEl = localAppServices.getWindowById ? localAppServices.getWindowById('mixer')?.element : null;
                if (mixerWindowEl) {
                    const container = mixerWindowEl.querySelector('#mixerContent');
                    if (container) renderMixer(container);
                }
            });
        });
    }
}

function buildModularEffectsRackDOM(owner, ownerType = 'track') {
    const ownerId = (ownerType === 'track' && owner) ? owner.id : 'master';
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus';
    const isMaster = ownerType === 'master';
    const masterAutomationHTML = isMaster ? `
        <div class="flex items-center justify-between p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600">
            <span class="text-xs font-medium dark:text-slate-300">Record Master Vol Automation</span>
            <button id="masterAutomationArmBtn" class="text-xs px-2 py-0.5 border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">M</button>
        </div>
    ` : '';
    return `<div id="effectsRackContent-${ownerId}" class="p-2 space-y-2 overflow-y-auto h-full dark:bg-slate-900 dark:text-slate-300">
        <h3 class="text-sm font-semibold dark:text-slate-200">Effects Rack: ${ownerName}</h3>
        ${masterAutomationHTML}
        <div id="effectsList-${ownerId}" class="space-y-1 min-h-[50px] border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600"></div>
        <button id="addEffectBtn-${ownerId}" class="text-xs px-2 py-1 bg-purple-400 text-white rounded hover:bg-purple-500 dark:bg-purple-500 dark:hover:bg-purple-600">Add Effect</button>
        <div id="effectControlsContainer-${ownerId}" class="mt-2 space-y-2"></div>
    </div>`;
}

export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    if (!listDiv) return;
    listDiv.innerHTML = '';
    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : (localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : []);

    if (!effectsArray || effectsArray.length === 0) {
        listDiv.innerHTML = '<p class="text-gray-500 dark:text-slate-400 italic">No effects added.</p>';
        if (controlsContainer) controlsContainer.innerHTML = ''; return;
    }

    const AVAILABLE_EFFECTS_LOCAL = ((localAppServices.effectsRegistryAccess) && (localAppServices.effectsRegistryAccess).AVAILABLE_EFFECTS) || {};

    effectsArray.forEach((effect, index) => {
        const effectDef = AVAILABLE_EFFECTS_LOCAL[effect.type];
        const displayName = effectDef ? effectDef.displayName : effect.type;
        const bypassed = ((localAppServices.effectsRegistryAccess) && (localAppServices.effectsRegistryAccess).getEffectBypassState) ? localAppServices.effectsRegistryAccess.getEffectBypassState(effect.id) : false;
        const item = document.createElement('div');
        item.className = `effect-item flex justify-between items-center p-1 border-b bg-white dark:bg-slate-800 dark:border-slate-700 rounded-sm shadow-xs text-xs ${bypassed ? 'opacity-50' : ''}`;
        item.innerHTML = `<span class="effect-name flex-grow cursor-pointer hover:text-purple-500 dark:text-slate-300 dark:hover:text-purple-300 ${bypassed ? 'line-through' : ''}" title="Edit ${displayName}">${displayName}</span>
            <div class="effect-actions flex items-center gap-1">
                <button class="bypass-btn text-xs px-1 ${bypassed ? 'text-yellow-500 dark:text-yellow-400' : 'text-gray-400 dark:text-slate-500'} hover:text-yellow-600 dark:hover:text-yellow-300" title="${bypassed ? 'Enable Effect' : 'Bypass Effect'}">${bypassed ? '↩' : '⏸'}</button>
                <button class="up-btn text-xs px-0.5 ${index === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:text-pink-500 dark:hover:text-pink-300'} dark:text-slate-400" ${index === 0 ? 'disabled' : ''} title="Move Up">▲</button>
                <button class="down-btn text-xs px-0.5 ${index === effectsArray.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:text-pink-500 dark:hover:text-pink-300'} dark:text-slate-400" ${index === effectsArray.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
                <button class="remove-btn text-xs px-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remove Effect">✕</button>
            </div>`;
        item.querySelector('.bypass-btn').addEventListener('click', () => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Bypass effect ${displayName}`);
            const newBypassState = !((localAppServices.effectsRegistryAccess && localAppServices.effectsRegistryAccess.getEffectBypassState) ? localAppServices.effectsRegistryAccess.getEffectBypassState(effect.id) : false);
            if (localAppServices.effectsRegistryAccess && localAppServices.effectsRegistryAccess.setEffectBypassState) {
                localAppServices.effectsRegistryAccess.setEffectBypassState(effect.id, newBypassState);
            }
            if (owner && owner.setEffectBypass) {
                owner.setEffectBypass(effect.id, newBypassState);
            }
            if (localAppServices.showNotification) {
                localAppServices.showNotification(newBypassState ? `Bypassed ${displayName}` : `Enabled ${displayName}`, 1500);
            }
            renderEffectsList(owner, ownerType, listDiv, controlsContainer);
        });
        item.querySelector('.effect-name').addEventListener('click', () => {
            renderEffectControls(owner, ownerType, effect.id, controlsContainer);
            listDiv.querySelectorAll('.bg-blue-100,.dark\\:bg-purple-600').forEach(el => el.classList.remove('bg-blue-100', 'dark:bg-purple-600', 'border-purple-400', 'dark:border-purple-600'));
            item.classList.add('bg-blue-100', 'dark:bg-purple-600', 'border-purple-400', 'dark:border-purple-600');
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

    const AVAILABLE_EFFECTS_LOCAL = ((localAppServices.effectsRegistryAccess) && (localAppServices.effectsRegistryAccess).AVAILABLE_EFFECTS) || {};
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
            let initialValue;
            const pathKeys = paramDef.key.split('.');
            let currentValObj = effectWrapper.params;
            for (const key of pathKeys) {
                if (currentValObj && typeof currentValObj === 'object' && key in currentValObj) {
                    currentValObj = currentValObj[key];
                } else {
                    currentValObj = undefined;
                    break;
                }
            }
            initialValue = (currentValObj !== undefined) ? currentValObj : paramDef.defaultValue;

            if (paramDef.type === 'knob') {
                const knob = createKnob({ label: paramDef.label, min: paramDef.min, max: paramDef.max, step: paramDef.step, initialValue: initialValue, decimals: paramDef.decimals, displaySuffix: paramDef.displaySuffix, trackRef: (ownerType === 'track' ? owner : null), onValueChange: (val) => { if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, val); else if (localAppServices.updateMasterEffectParam) localAppServices.updateMasterEffectParam(effectId, paramDef.key, val); } });
                controlWrapper.appendChild(knob.element);
            } else if (paramDef.type === 'select') {
                const label = document.createElement('label');
                label.className = 'block text-xs font-medium mb-0.5 dark:text-slate-300';
                label.textContent = paramDef.label + ':';
                const selectEl = document.createElement('select');
                selectEl.id = `${paramDef.idPrefix}-${effectId}`;
                selectEl.className = 'w-full p-1 border rounded text-xs bg-gray-50 dark:bg-slate-600 dark:text-slate-200 dark:border-slate-600';
                paramDef.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = typeof opt === 'object' ? opt.value : opt; option.textContent = typeof opt === 'object' ? opt.text : opt;
                    selectEl.appendChild(option);
                });
                selectEl.value = initialValue;
                selectEl.addEventListener('change', (e) => {
                    const newValue = e.target.value;
                    const finalValue = (typeof paramDef.defaultValue === 'number' && !isNaN(parseFloat(newValue))) ? parseFloat(newValue) : newValue;
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Change ${paramDef.label} for ${effectWrapper.type} on ${ownerType === 'track' ? owner.name : 'Master'}`);
                    if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, finalValue);
                    else if (localAppServices.updateMasterEffectParam) localAppServices.updateMasterEffectParam(effectId, paramDef.key, finalValue);
                });
                controlWrapper.appendChild(label);
                controlWrapper.appendChild(selectEl);
            } else if (paramDef.type === 'toggle') {
                const button = document.createElement('button');
                button.className = `w-full p-1 border rounded text-xs dark:border-slate-500 dark:text-slate-300 ${initialValue ? 'bg-purple-400 text-white dark:bg-purple-500' : 'bg-gray-200 dark:bg-slate-600'}`;
                button.textContent = `${paramDef.label}: ${initialValue ? 'ON' : 'OFF'}`;
                button.addEventListener('click', () => {
                    const newValue = !initialValue;
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle ${paramDef.label} for ${effectWrapper.type} on ${ownerType === 'track' ? owner.name : 'Master'}`);
                    if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, newValue);
                    else if (localAppServices.updateMasterEffectParam) localAppServices.updateMasterEffectParam(effectId, paramDef.key, newValue);
                });
                controlWrapper.appendChild(button);
            }
            gridContainer.appendChild(controlWrapper);
        });
    }
    controlsContainer.appendChild(gridContainer);
}

function showAddEffectModal(owner, ownerType) {
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus';
    let modalContentHTML = `<div class="max-h-60 overflow-y-auto"><ul class="list-none p-0 m-0">`;
    const AVAILABLE_EFFECTS_LOCAL = ((localAppServices.effectsRegistryAccess) && (localAppServices.effectsRegistryAccess).AVAILABLE_EFFECTS) || {};
    
    
    for (const effectKey in AVAILABLE_EFFECTS_LOCAL) { modalContentHTML += `<li class="p-1.5 hover:bg-purple-200 dark:hover:bg-purple-600 cursor-pointer border-b dark:border-slate-600 text-sm dark:text-slate-200" data-effect-type="${effectKey}">${AVAILABLE_EFFECTS_LOCAL[effectKey].displayName}</li>`; }
    modalContentHTML += `</ul></div>`;
    const modal = showCustomModal(`Add Effect to ${ownerName}`, modalContentHTML, [], 'add-effect-modal');
    if (((modal) && (modal).contentDiv)) {
        modal.contentDiv.querySelectorAll('li[data-effect-type]').forEach(item => {
            item.addEventListener('click', () => {
                const effectType = item.dataset.effectType;
                if (ownerType === 'track' && owner) {
                    owner.addEffect(effectType);
                } else if (ownerType === 'master' && localAppServices.addMasterEffect) {
                    localAppServices.addMasterEffect(effectType);
                }
                modal.overlay.remove();
            });
        });
    }
}

// --- Window Opening Functions ---
export function openTrackEffectsRackWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) return null;
    const windowId = `effectsRack-${trackId}`;
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) { openWindows.get(windowId).restore(); return openWindows.get(windowId); }

    const contentDOM = buildModularEffectsRackDOM(track, 'track');
    const rackOptions = { width: 350, height: 400, minWidth: 300, minHeight: 250, initialContentKey: windowId };
    if (savedState) Object.assign(rackOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    const rackWindow = localAppServices.createWindow(windowId, `Effects: ${track.name}`, contentDOM, rackOptions);
    if (((rackWindow) && (rackWindow).element)) {
        renderEffectsList(track, 'track', rackWindow.element.querySelector(`#effectsList-${track.id}`), rackWindow.element.querySelector(`#effectControlsContainer-${track.id}`));
        rackWindow.element.querySelector(`#addEffectBtn-${track.id}`)?.addEventListener('click', () => showAddEffectModal(track, 'track'));
    }
    return rackWindow;
}

export function openMasterEffectsRackWindow(savedState = null) {
    const windowId = 'masterEffectsRack';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) { openWindows.get(windowId).restore(); return openWindows.get(windowId); }

    const contentDOM = buildModularEffectsRackDOM(null, 'master');
    const rackOptions = { width: 350, height: 400, minWidth: 300, minHeight: 250, initialContentKey: windowId };
    if (savedState) Object.assign(rackOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    const rackWindow = localAppServices.createWindow(windowId, 'Master Effects Rack', contentDOM, rackOptions);
    if (((rackWindow) && (rackWindow).element)) {
        renderEffectsList(null, 'master', rackWindow.element.querySelector(`#effectsList-master`), rackWindow.element.querySelector(`#effectControlsContainer-master`));
        rackWindow.element.querySelector(`#addEffectBtn-master`)?.addEventListener('click', () => showAddEffectModal(null, 'master'));
        // Wire up master automation arm button
        const masterAutoBtn = rackWindow.element.querySelector('#masterAutomationArmBtn');
        if (masterAutoBtn) {
            masterAutoBtn.addEventListener('click', () => {
                const current = localAppServices.masterAutomationArmed ? localAppServices.masterAutomationArmed() : false;
                if (typeof localAppServices.setMasterAutomationArmed === 'function') {
                    localAppServices.setMasterAutomationArmed(!current);
                }
                masterAutoBtn.classList.toggle('automation-armed', !current);
                if (localAppServices.showNotification) {
                    localAppServices.showNotification(!current ? 'Master automation ARMED' : 'Master automation DISARMED', 1500);
                }
            });
            // Set initial visual state
            const initialState = localAppServices.masterAutomationArmed ? localAppServices.masterAutomationArmed() : false;
            masterAutoBtn.classList.toggle('automation-armed', initialState);
        }
    }
    return rackWindow;
}

export function openGlobalControlsWindow(onReadyCallback, savedState = null) {
    const windowId = 'globalControls';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        const win = openWindows.get(windowId);
        win.restore();
        if (typeof onReadyCallback === 'function' && win.element) {
            onReadyCallback({
                playBtnGlobal: win.element.querySelector('#playBtnGlobal'),
                recordBtnGlobal: win.element.querySelector('#recordBtnGlobal'),
                stopBtnGlobal: win.element.querySelector('#stopBtnGlobal'), // MODIFICATION: Include stop button
                tempoGlobalInput: win.element.querySelector('#tempoGlobalInput'),
                midiInputSelectGlobal: win.element.querySelector('#midiInputSelectGlobal'),
                masterMeterContainerGlobal: win.element.querySelector('#masterMeterContainerGlobal'),
                masterMeterBarGlobal: win.element.querySelector('#masterMeterBarGlobal'),
                midiIndicatorGlobal: win.element.querySelector('#midiIndicatorGlobal'),
                keyboardIndicatorGlobal: win.element.querySelector('#keyboardIndicatorGlobal'),
                playbackModeToggleBtnGlobal: win.element.querySelector('#playbackModeToggleBtnGlobal')
            });
        }
        return win;
    }

    // MODIFICATION: Added stop button to the HTML and adjusted grid layout
    const contentHTML = `<div id="global-controls-content" class="p-2.5 space-y-3 text-sm text-gray-700 dark:text-slate-300">
        <div class="grid grid-cols-3 gap-2 items-center">
            <button id="playBtnGlobal" title="Play/Pause (Spacebar)" class="bg-pink-400 hover:bg-pink-500 text-white font-semibold py-1.5 px-3 rounded shadow transition-colors duration-150 dark:bg-pink-500 dark:hover:bg-pink-600">Play</button>
            <button id="stopBtnGlobal" title="Stop All Audio (Panic)" class="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1.5 px-3 rounded shadow transition-colors duration-150 dark:bg-yellow-600 dark:hover:bg-yellow-700">Stop</button>
            <button id="recordBtnGlobal" title="Record Arm/Disarm" class="bg-red-500 hover:bg-red-600 text-white font-semibold py-1.5 px-3 rounded shadow transition-colors duration-150 dark:bg-red-600 dark:hover:bg-red-700">Record</button>
        </div>
        <div> <label for="tempoGlobalInput" class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-0.5">Tempo (BPM):</label> <input type="number" id="tempoGlobalInput" value="120" min="30" max="300" step="0.1" class="w-full p-1.5 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-purple-600 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"> </div>
        <div> <label for="midiInputSelectGlobal" class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-0.5">MIDI Input:</label> <select id="midiInputSelectGlobal" class="w-full p-1.5 border border-gray-300 rounded shadow-sm focus:ring-blue-500 focus:border-purple-600 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"> <option value="">No MIDI Input</option> </select> </div>
        <div class="pt-1"> <label class="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-0.5">Master Level:</label> <div id="masterMeterContainerGlobal" class="h-5 w-full bg-gray-200 dark:bg-slate-600 rounded border border-gray-300 dark:border-slate-500 overflow-hidden shadow-sm"> <div id="masterMeterBarGlobal" class="h-full bg-purple-400 transition-all duration-50 ease-linear" style="width: 0%;"></div> </div> </div>
        <div class="flex justify-between items-center text-xs mt-1.5"> <span id="midiIndicatorGlobal" title="MIDI Activity" class="px-2 py-1 rounded-full bg-gray-300 text-gray-600 font-medium transition-colors duration-150 dark:bg-slate-600 dark:text-slate-300">MIDI</span> <span id="keyboardIndicatorGlobal" title="Computer Keyboard Activity" class="px-2 py-1 rounded-full bg-gray-300 text-gray-600 font-medium transition-colors duration-150 dark:bg-slate-600 dark:text-slate-300">KBD</span> </div>
        <div class="mt-2"> <button id="playbackModeToggleBtnGlobal" title="Toggle Playback Mode (Sequencer/Timeline)" class="w-full bg-violet-400 hover:bg-violet-500 text-white font-semibold py-1.5 px-3 rounded shadow transition-colors duration-150 dark:bg-violet-500 dark:hover:bg-violet-600">Mode: Sequencer</button> </div>
        <div class="mt-2 pt-2 border-t border-gray-300 dark:border-slate-600 space-y-1">
            <div class="flex items-center justify-between">
                <span class="text-xs text-gray-600 dark:text-slate-400">Mic Test:</span>
                <button id="micTestBtnGlobal" title="Run microphone recording test" class="px-2 py-1 text-xs border rounded bg-blue-400 hover:bg-blue-500 text-white dark:bg-blue-500 dark:hover:bg-blue-600 dark:border-blue-600 disabled:opacity-40">Test Mic</button>
            </div>
            <div id="micTestStatusGlobal" data-state="idle" title="Mic test status" class="text-xs text-center text-gray-400 dark:text-slate-500">—</div>
        </div>
    </div>`;
    const options = { width: 280, height: 360, minWidth: 250, minHeight: 340, closable: true, minimizable: true, resizable: true, initialContentKey: windowId }; // Adjusted height slightly
    if (savedState) Object.assign(options, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    const newWindow = localAppServices.createWindow(windowId, 'Global Controls', contentHTML, options);
    if (((newWindow) && (newWindow).element) && typeof onReadyCallback === 'function') {
        onReadyCallback({
            playBtnGlobal: newWindow.element.querySelector('#playBtnGlobal'),
            recordBtnGlobal: newWindow.element.querySelector('#recordBtnGlobal'),
            stopBtnGlobal: newWindow.element.querySelector('#stopBtnGlobal'), // MODIFICATION: Include stop button
            micTestBtnGlobal: newWindow.element.querySelector('#micTestBtnGlobal'),
            micTestStatusGlobal: newWindow.element.querySelector('#micTestStatusGlobal'),
            tempoGlobalInput: newWindow.element.querySelector('#tempoGlobalInput'),
            midiInputSelectGlobal: newWindow.element.querySelector('#midiInputSelectGlobal'),
            masterMeterContainerGlobal: newWindow.element.querySelector('#masterMeterContainerGlobal'),
            masterMeterBarGlobal: newWindow.element.querySelector('#masterMeterBarGlobal'),
            midiIndicatorGlobal: newWindow.element.querySelector('#midiIndicatorGlobal'),
            keyboardIndicatorGlobal: newWindow.element.querySelector('#keyboardIndicatorGlobal'),
            playbackModeToggleBtnGlobal: newWindow.element.querySelector('#playbackModeToggleBtnGlobal')
        });
    }
    return newWindow;
}

export function openSoundBrowserWindow(savedState = null) {
    const windowId = 'soundBrowser';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        openWindows.get(windowId).restore();
        const currentLibNameFromState = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
        if (currentLibNameFromState && localAppServices.updateSoundBrowserDisplayForLibrary) {
            console.log(`[UI SoundBrowser Re-Open/Restore] Updating display for already selected library: ${currentLibNameFromState}`);
            localAppServices.updateSoundBrowserDisplayForLibrary(currentLibNameFromState);
        }
        return openWindows.get(windowId);
    }

    const contentHTML = `<div id="soundBrowserContent" class="p-2 space-y-2 text-xs overflow-y-auto h-full dark:text-slate-300"> <div id="soundBrowserTabs" class="flex border-b border-gray-300 dark:border-slate-600 mb-1"> <button id="tabBrowse" class="tab-btn flex-1 py-1 text-xs font-semibold border-b-2 border-purple-500 text-purple-600 dark:text-purple-400">Browse</button> <button id="tabFavorites" class="tab-btn flex-1 py-1 text-xs text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400">⭐ Favorites</button> <button id="tabRecent" class="tab-btn flex-1 py-1 text-xs text-gray-500 dark:text-slate-400 hover:text-purple-600 dark:hover:text-purple-400">🕐 Recent</button> </div> <div id="browseControls" class="space-y-1"> <div class="flex space-x-1"> <select id="librarySelect" class="flex-grow p-1 border rounded text-xs bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"> <option value="">Select Library...</option> </select> <button id="upDirectoryBtn" class="px-2 py-1 border rounded bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 dark:border-slate-500" title="Up Directory">↑</button> </div> <div id="currentPathDisplay" class="text-xs text-gray-600 dark:text-slate-400 truncate">/</div> <div id="soundBrowserSearchContainer"> <input type="text" id="soundBrowserSearchInput" placeholder="🔍 Search sounds..." class="w-full p-1 border rounded text-xs bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-400"> </div> </div> <div id="soundBrowserList" class="min-h-[100px] border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600 overflow-y-auto"> <p class="text-gray-500 dark:text-slate-400 italic">Select a library to browse sounds.</p> </div> <div id="soundPreviewControls" class="mt-1 text-center"> <button id="previewSoundBtn" class="px-2 py-1 text-xs border rounded bg-purple-400 text-white hover:bg-purple-500 disabled:opacity-50 dark:bg-purple-500 dark:hover:bg-purple-600 dark:disabled:bg-slate-500" disabled>Preview</button> </div> </div>`;
    const browserOptions = { width: 380, height: 450, minWidth: 300, minHeight: 300, initialContentKey: windowId };
    if (savedState) Object.assign(browserOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });

    const browserWindow = localAppServices.createWindow(windowId, 'Sound Browser', contentHTML, browserOptions);

    if (((browserWindow) && (browserWindow).element)) {
        const libSelect = browserWindow.element.querySelector('#librarySelect');
        if (Constants.soundLibraries) {
            Object.keys(Constants.soundLibraries).forEach(libName => {
                const opt = document.createElement('option');
                opt.value = libName;
                opt.textContent = libName;
                libSelect.appendChild(opt);
            });
        }

        // FIX Bug #5: Disable preview button during library loading
        const previewBtn = browserWindow.element.querySelector('#previewSoundBtn');
        function setPreviewButtonState(enabled) {
            if (previewBtn) {
                previewBtn.disabled = !enabled;
                previewBtn.title = enabled ? "Preview selected sound" : "Loading library...";
            }
        }
        
        // Initial state - disabled until library loads
        setPreviewButtonState(false);

        libSelect.addEventListener('change', (e) => {
            const lib = e.target.value;
            console.log(`[UI SoundBrowser] Library selected via dropdown: ${lib}`);
            
            // FIX Bug #5: Disable preview while loading
            if (lib) {
                setPreviewButtonState(false);
            }
            
            if (lib && localAppServices.fetchSoundLibrary) {
                localAppServices.fetchSoundLibrary(lib, Constants.soundLibraries[lib]);
            } else if (!lib && localAppServices.updateSoundBrowserDisplayForLibrary) {
                localAppServices.updateSoundBrowserDisplayForLibrary(null);
            }
        });

        browserWindow.element.querySelector('#upDirectoryBtn').addEventListener('click', () => {
            const currentPath = localAppServices.getCurrentSoundBrowserPath ? localAppServices.getCurrentSoundBrowserPath() : [];
            if (currentPath.length > 0) {
                const newPath = [...currentPath]; newPath.pop();
                if (localAppServices.setCurrentSoundBrowserPath) localAppServices.setCurrentSoundBrowserPath(newPath);
                if (localAppServices.renderSoundBrowserDirectory) localAppServices.renderSoundBrowserDirectory(newPath, localAppServices.getCurrentSoundFileTree ? localAppServices.getCurrentSoundFileTree() : null);
            }
        });

        // Tab click handlers
        const tabBrowse = browserWindow.element.querySelector('#tabBrowse');
        const tabFavorites = browserWindow.element.querySelector('#tabFavorites');
        const tabRecent = browserWindow.element.querySelector('#tabRecent');
        const browseControls = browserWindow.element.querySelector('#browseControls');
        const listDiv = browserWindow.element.querySelector('#soundBrowserList');
        const pathDisplay = browserWindow.element.querySelector('#currentPathDisplay');
        const previewBtn2 = browserWindow.element.querySelector('#previewSoundBtn');
        const searchInput = browserWindow.element.querySelector('#soundBrowserSearchInput');
        const searchContainer = browserWindow.element.querySelector('#soundBrowserSearchContainer');

        function updateTabStyles() {
            [tabBrowse, tabFavorites, tabRecent].forEach(btn => {
                if (btn) {
                    btn.classList.remove('border-b-2', 'border-purple-500', 'text-purple-600', 'dark:text-purple-400', 'font-semibold');
                    btn.classList.add('text-gray-500', 'dark:text-slate-400');
                }
            });
            const activeBtn = soundBrowserActiveTab === 'browse' ? tabBrowse : soundBrowserActiveTab === 'favorites' ? tabFavorites : tabRecent;
            if (activeBtn) {
                activeBtn.classList.add('border-b-2', 'border-purple-500', 'text-purple-600', 'dark:text-purple-400', 'font-semibold');
                activeBtn.classList.remove('text-gray-500', 'dark:text-slate-400');
            }
        }

        function showBrowseTab() {
            soundBrowserActiveTab = 'browse';
            browseControls.style.display = '';
            if (searchContainer) searchContainer.style.display = '';
            if (pathDisplay) pathDisplay.style.display = '';
            updateTabStyles();
            // Restore browse view
            const currentPath = localAppServices.getCurrentSoundBrowserPath ? localAppServices.getCurrentSoundBrowserPath() : [];
            const tree = localAppServices.getCurrentSoundFileTree ? localAppServices.getCurrentSoundFileTree() : null;
            if (tree) renderSoundBrowserDirectoryFiltered(currentPath, tree, soundBrowserSearchQuery);
            else listDiv.innerHTML = '<p class="text-gray-500 dark:text-slate-400 italic">Select a library to browse sounds.</p>';
        }

        function showFavoritesTab() {
            soundBrowserActiveTab = 'favorites';
            browseControls.style.display = 'none';
            if (searchContainer) searchContainer.style.display = 'none';
            if (pathDisplay) pathDisplay.style.display = 'none';
            updateTabStyles();
            renderSoundBrowserFavorites(listDiv, previewBtn);
        }

        function showRecentTab() {
            soundBrowserActiveTab = 'recent';
            browseControls.style.display = 'none';
            if (searchContainer) searchContainer.style.display = 'none';
            if (pathDisplay) pathDisplay.style.display = 'none';
            updateTabStyles();
            renderSoundBrowserRecent(listDiv, previewBtn);
        }

        ((tabBrowse) && (tabBrowse).addEventListener)('click', showBrowseTab);
        ((tabFavorites) && (tabFavorites).addEventListener)('click', showFavoritesTab);
        ((tabRecent) && (tabRecent).addEventListener)('click', showRecentTab);
        updateTabStyles();

        // Search/filter input for sound browser
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                soundBrowserSearchQuery = e.target.value.toLowerCase().trim();
                console.log(`[UI SoundBrowser] Search query: "${soundBrowserSearchQuery}"`);
                // Re-render the current directory with filtering
                const currentPath = localAppServices.getCurrentSoundBrowserPath ? localAppServices.getCurrentSoundBrowserPath() : [];
                const tree = localAppServices.getCurrentSoundFileTree ? localAppServices.getCurrentSoundFileTree() : null;
                if (tree) {
                    renderSoundBrowserDirectoryFiltered(currentPath, tree, soundBrowserSearchQuery);
                }
            });
        }

        // FIX Bug #3: Better preview player disposal and #5: Check if library is ready before previewing
        browserWindow.element.querySelector('#previewSoundBtn').addEventListener('click', () => {
            const selectedSound = localAppServices.getSelectedSoundForPreview ? localAppServices.getSelectedSoundForPreview() : null;
            console.log('[UI PreviewButton] Clicked. Selected Sound:', JSON.stringify(selectedSound));

            if (selectedSound && typeof Tone !== 'undefined') {
                const { fullPath, libraryName } = selectedSound;
                
                // Add to recently played
                if (localAppServices.addToRecentlyPlayed) {
                    localAppServices.addToRecentlyPlayed(selectedSound);
                }
                
                // FIX Bug #5: Check if library is loaded before trying to play
                const loadedZips = localAppServices.getLoadedZipFiles ? localAppServices.getLoadedZipFiles() : {};
                if (!loadedZips[libraryName] || loadedZips[libraryName] === "loading") {
                    console.warn(`[UI PreviewButton] Library ${libraryName} is not ready for preview.`);
                    showNotification("Please wait for the library to finish loading.", 2000);
                    setPreviewButtonState(false);
                    return;
                }
                
                // FIX Bug #3: More robust preview player disposal
                let previewPlayer = localAppServices.getPreviewPlayer ? localAppServices.getPreviewPlayer() : null;
                if (previewPlayer) {
                    console.log('[UI PreviewButton] Disposing existing preview player.');
                    try {
                        if (!previewPlayer.disposed) {
                            previewPlayer.stop();
                            previewPlayer.dispose();
                        }
                    } catch (e) {
                        console.warn('[UI PreviewButton] Error disposing old preview player:', e.message);
                    }
                    previewPlayer = null;
                    if (localAppServices.setPreviewPlayer) localAppServices.setPreviewPlayer(null);
                }

                console.log(`[UI PreviewButton] Attempting to preview: ${fullPath} from ${libraryName}`);

                if (loadedZips && loadedZips[libraryName] && loadedZips[libraryName] !== "loading") {
                    const zipEntry = loadedZips[libraryName].file(fullPath);
                    if (zipEntry) {
                        console.log(`[UI PreviewButton] Found zipEntry for ${fullPath}. Converting to blob.`);
                        zipEntry.async("blob").then(blob => {
                            console.log(`[UI PreviewButton] Blob created for ${fullPath}, size: ${blob.size}. Creating Object URL.`);
                            const url = URL.createObjectURL(blob);
                            console.log(`[UI PreviewButton] Object URL: ${url}. Creating Tone.Player.`);
                            previewPlayer = new Tone.Player(url, () => {
                                console.log(`[UI PreviewButton] Tone.Player loaded for ${url}. Starting playback.`);
                                previewPlayer.start();
                                URL.revokeObjectURL(url);
                                console.log(`[UI PreviewButton] Object URL revoked for ${url}.`);
                            });
                            // Route preview through the master effects bus instead of direct toDestination
                            // so that master volume and effects apply to preview as well
                            const masterBus = localAppServices.getMasterEffectsBus ? localAppServices.getMasterEffectsBus() : null;
                            if (masterBus && !masterBus.disposed) {
                                previewPlayer.connect(masterBus);
                            } else {
                                previewPlayer.toDestination();
                            }
                            previewPlayer.onerror = (err) => {
                                console.error(`[UI PreviewButton] Tone.Player error for ${url}:`, err);
                                showNotification("Error playing preview: " + err.message, 3000);
                                URL.revokeObjectURL(url);
                            };
                            if (localAppServices.setPreviewPlayer) localAppServices.setPreviewPlayer(previewPlayer);
                        }).catch(err => {
                            console.error(`[UI PreviewButton] Error converting zipEntry to blob for ${fullPath}:`, err);
                            showNotification("Error loading preview data: " + err.message, 2000);
                        });
                    } else {
                        console.warn(`[UI PreviewButton] ZipEntry not found for ${fullPath} in ${libraryName}.`);
                        showNotification("Preview error: Sound file not found in library.", 2000);
                    }
                } else {
                    console.warn(`[UI PreviewButton] Library ${libraryName} not loaded or is loading. Loaded zips:`, loadedZips);
                    showNotification("Preview error: Library not ready.", 2000);
                }
            } else if (!selectedSound) {
                console.warn('[UI PreviewButton] No sound selected for preview.');
            } else if (typeof Tone === 'undefined') {
                console.error('[UI PreviewButton] Tone is undefined!');
            }
        });

        if (!savedState) {
            const currentLibNameFromState = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
            const soundTrees = localAppServices.getSoundLibraryFileTrees ? localAppServices.getSoundLibraryFileTrees() : {};


            if (currentLibNameFromState && soundTrees && soundTrees[currentLibNameFromState] && libSelect) {
                console.log(`[UI SoundBrowser Open] State has current library '${currentLibNameFromState}' with loaded data. Setting dropdown and updating UI.`);
                libSelect.value = currentLibNameFromState;
                if (localAppServices.updateSoundBrowserDisplayForLibrary) {
                    localAppServices.updateSoundBrowserDisplayForLibrary(currentLibNameFromState);
                }
            } else {
                console.log(`[UI SoundBrowser Open] No specific library active and loaded in state (or soundTrees issue). Defaulting to "Select Library..." view.`);
                if (libSelect) libSelect.value = "";
                if (localAppServices.updateSoundBrowserDisplayForLibrary) {
                    localAppServices.updateSoundBrowserDisplayForLibrary(null);
                }
            }
        } else if (savedState && localAppServices.getCurrentLibraryName && localAppServices.updateSoundBrowserDisplayForLibrary) {
            const currentLibNameFromState = localAppServices.getCurrentLibraryName();
            console.log(`[UI SoundBrowser Open] Restoring from savedState. Current lib in state: ${currentLibNameFromState}`);
             if (currentLibNameFromState && libSelect) {
                libSelect.value = currentLibNameFromState;
                localAppServices.updateSoundBrowserDisplayForLibrary(currentLibNameFromState);
            } else if (libSelect) {
                libSelect.value = "";
                localAppServices.updateSoundBrowserDisplayForLibrary(null);
            }
        }
    }
    return browserWindow;
}

export function updateSoundBrowserDisplayForLibrary(libraryName, isLoading = false, hasError = false) {
    console.log(`[UI updateSoundBrowserDisplayForLibrary] START - Called for: '${libraryName}', isLoading: ${isLoading}, hasError: ${hasError}`);
    const browserWindowEl = localAppServices.getWindowById ? localAppServices.getWindowById('soundBrowser')?.element : null;

    if (!browserWindowEl) {
        console.log(`[UI updateSoundBrowserDisplayForLibrary] Sound Browser window element NOT FOUND. Aborting DOM updates.`);
        if (libraryName && !isLoading && !hasError) {
            const currentGlobalLib = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
            if (!currentGlobalLib && localAppServices.setCurrentLibraryName) {
                localAppServices.setCurrentLibraryName(libraryName);
                console.log(`[UI updateSoundBrowserDisplayForLibrary] Window NOT visible. Library '${libraryName}' loaded. Set as current in global state.`);
            }
        }
        return;
    }

    const listDiv = browserWindowEl.querySelector('#soundBrowserList');
    const libSelect = browserWindowEl.querySelector('#librarySelect');
    const pathDisplay = browserWindowEl.querySelector('#currentPathDisplay');
    const previewBtn = browserWindowEl.querySelector('#previewSoundBtn');
    const isWindowVisible = !browserWindowEl.closest('.window.minimized');
    const currentDropdownSelection = libSelect ? libSelect.value : null;
    
    // FIX Bug #5: Update preview button state based on loading status
    if (isLoading) {
        if (previewBtn) {
            previewBtn.disabled = true;
            previewBtn.title = "Loading library...";
        }
    } else if (hasError) {
        if (previewBtn) {
            previewBtn.disabled = true;
            previewBtn.title = "Library failed to load";
        }
    } else if (libraryName && libraryName === currentDropdownSelection) {
        // Library loaded successfully - enable preview button
        if (previewBtn) {
            previewBtn.disabled = false;
            previewBtn.title = "Preview selected sound";
        }
    }

    console.log(`[UI updateSoundBrowserDisplayForLibrary] Window visible: ${isWindowVisible}, Current dropdown: '${currentDropdownSelection}', Target library: '${libraryName}'`);

    let performFullUIUpdate = false;

    if (!isWindowVisible) {
        console.log(`[UI updateSoundBrowserDisplayForLibrary] Window NOT visible. No DOM update.`);
        if (libraryName && !isLoading && !hasError) {
            const currentGlobalLib = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : null;
            if (!currentGlobalLib && localAppServices.setCurrentLibraryName) {
                localAppServices.setCurrentLibraryName(libraryName);
                console.log(`[UI updateSoundBrowserDisplayForLibrary] Window NOT visible. Library '${libraryName}' loaded. Set as current in global state (as no global lib was active).`);
            }
        }
        return;
    }

    if (libraryName === currentDropdownSelection) {
        performFullUIUpdate = true;
        console.log(`[UI updateSoundBrowserDisplayForLibrary] Decision: Update current view for '${libraryName}'.`);
    } else if (currentDropdownSelection === "" && libraryName && !isLoading && !hasError) {
        performFullUIUpdate = true;
        console.log(`[UI updateSoundBrowserDisplayForLibrary] Decision: Set initial view to '${libraryName}' from 'Select Library...'.`);
    } else if (libraryName && !isLoading && !hasError) {
        // Dropdown doesn't match - user switched libraries already
        // Only show error if the tree actually doesn't exist or is empty
        const soundTrees = localAppServices.getSoundLibraryFileTrees ? localAppServices.getSoundLibraryFileTrees() : {};
        const treeForLib = soundTrees[libraryName];
        if (!treeForLib || Object.keys(treeForLib).length === 0) {
            listDiv.innerHTML = `<p class="text-red-500">Error: Library "${libraryName}" failed to load or is empty.</p>`;
        }
        // If treeForLib exists, user already switched to another library - skip silently
    }

    if (performFullUIUpdate) {
        const soundTrees = localAppServices.getSoundLibraryFileTrees ? localAppServices.getSoundLibraryFileTrees() : {};
        const treeForLib = soundTrees[libraryName];
        if (treeForLib && Object.keys(treeForLib).length > 0) {
            // Update the current library state and re-render the directory
            if (localAppServices.setCurrentLibraryName) localAppServices.setCurrentLibraryName(libraryName);
            if (localAppServices.setCurrentSoundBrowserPath) localAppServices.setCurrentSoundBrowserPath([]);
            if (localAppServices.renderSoundBrowserDirectory) {
                localAppServices.renderSoundBrowserDirectory([], treeForLib);
            }
        }
    }

    if (pathDisplay) pathDisplay.textContent = `/${libraryName || ''}/`;
}

function filterTreeBySearch(treeNode, query) {
    if (!query) return treeNode;
    const result = {};
    for (const name in treeNode) {
        if (treeNode[name]?.type === 'folder') {
            const filteredChildren = filterTreeBySearch(treeNode[name].children, query);
            if (Object.keys(filteredChildren).length > 0) {
                result[name] = { ...treeNode[name], children: filteredChildren };
            }
        } else if (treeNode[name]?.type === 'file') {
            if (name.toLowerCase().includes(query)) {
                result[name] = treeNode[name];
            }
        }
    }
    return result;
}

export function renderSoundBrowserDirectoryFiltered(pathArray, treeNode, searchQuery = '') {
    const browserWindowEl = localAppServices.getWindowById ? localAppServices.getWindowById('soundBrowser')?.element : null;
    if (!browserWindowEl || !treeNode) return;
    const listDiv = browserWindowEl.querySelector('#soundBrowserList');
    const libSelect = browserWindowEl.querySelector('#librarySelect');
    const pathDisplay = browserWindowEl.querySelector('#currentPathDisplay');
    const previewBtn = browserWindowEl.querySelector('#previewSoundBtn');
    listDiv.innerHTML = '';
    const currentLibName = localAppServices.getCurrentLibraryName ? localAppServices.getCurrentLibraryName() : '';
    pathDisplay.textContent = `/${currentLibName}${pathArray.length > 0 ? '/' : ''}${pathArray.join('/')}`;

    if (localAppServices.setSelectedSoundForPreview) {
        localAppServices.setSelectedSoundForPreview(null);
    }
    if(previewBtn) previewBtn.disabled = true;

    // Apply search filter if query exists
    const filteredTree = searchQuery ? filterTreeBySearch(treeNode, searchQuery) : treeNode;

    const items = [];
    for (const name in filteredTree) { if (filteredTree[name]?.type) items.push({ name, nodeData: filteredTree[name] }); }
    items.sort((a, b) => { if (a.type === 'folder' && b.type !== 'folder') return -1; if (a.type !== 'folder' && b.type === 'folder') return 1; return a.name.localeCompare(b.name); });
    if (items.length === 0) { 
        if (searchQuery) {
            listDiv.innerHTML = `<p class="text-gray-500 dark:text-slate-400 italic">No sounds match "${searchQuery}"</p>`;
        } else {
            listDiv.innerHTML = '<p class="text-gray-500 dark:text-slate-400 italic">Empty folder.</p>';
        }
        return; 
    }

    // Lazy-load: reset render count and track total items
    soundBrowserTotalItems = items.length;
    soundBrowserRenderedCount = 0;
    // Store current items for load-more append
    window._soundBrowserCurrentItems = items;
    window._soundBrowserCurrentPath = pathArray;
    window._soundBrowserCurrentTree = treeNode;

    const renderBatch = () => {
        const start = soundBrowserRenderedCount;
        const end = Math.min(start + BROWSE_PER_PAGE, soundBrowserTotalItems);
        for (let i = start; i < end; i++) {
            const itemObj = items[i];
            const {name, nodeData} = itemObj; const listItem = document.createElement('div');
            listItem.className = 'p-1 hover:bg-purple-200 dark:hover:bg-purple-600 cursor-pointer border-b dark:border-slate-600 text-xs flex items-center';
            listItem.draggable = nodeData.type === 'file';
            const icon = document.createElement('span'); icon.className = 'mr-1.5'; icon.textContent = nodeData.type === 'folder' ? '📁' : '🎵'; listItem.appendChild(icon);
            const text = document.createElement('span'); text.textContent = name; listItem.appendChild(text);
            if (nodeData.type === 'folder') {
                listItem.addEventListener('click', () => {
                    const newPath = [...pathArray, name];
                    if (localAppServices.setCurrentSoundBrowserPath) localAppServices.setCurrentSoundBrowserPath(newPath);
                    renderSoundBrowserDirectory(newPath, nodeData.children);
                });
            }
            else { // File
                const soundToSelect = { fileName: name, fullPath: nodeData.fullPath, libraryName: currentLibName };
                const isFav = localAppServices.isFavorite ? localAppServices.isFavorite(soundToSelect) : false;
                const star = document.createElement('span');
                star.className = 'mr-0.5 cursor-pointer ' + (isFav ? 'text-yellow-400' : 'text-gray-300 dark:text-slate-600 hover:text-yellow-300');
                star.textContent = isFav ? '⭐' : '☆';
                star.title = isFav ? 'Remove from favorites' : 'Add to favorites';
                star.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (localAppServices.toggleFavorite) localAppServices.toggleFavorite(soundToSelect);
                    renderSoundBrowserDirectoryFiltered(pathArray, treeNode, soundBrowserSearchQuery);
                });
                listItem.appendChild(star);
                listItem.innerHTML += `<span class="ml-1 text-[9px] text-gray-400 dark:text-slate-500">${nodeData.libraryName}</span>`;
                listItem.addEventListener('click', () => {
                    listDiv.querySelectorAll('.bg-blue-200,.dark\\\\:\\:bg-purple-500').forEach(el => el.classList.remove('bg-blue-200', 'dark:bg-purple-500'));
                    listItem.classList.add('bg-blue-200', 'dark:bg-purple-500');
                    if(previewBtn) previewBtn.disabled = false;
                });
                listItem.addEventListener('dragstart', (e) => { e.dataTransfer.setData("application/json", JSON.stringify({ fileName: name, fullPath: nodeData.fullPath, libraryName: currentLibName, type: 'sound-browser-item' })); e.dataTransfer.effectAllowed = "copy"; });
            }
            listDiv.appendChild(listItem);
            soundBrowserRenderedCount++;
        }
        // If more items remain, add a "Load More" button at the bottom
        if (soundBrowserRenderedCount < soundBrowserTotalItems) {
            const loadMoreDiv = document.createElement('div');
            loadMoreDiv.id = 'soundBrowserLoadMore';
            loadMoreDiv.className = 'p-2 text-center cursor-pointer text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-slate-700';
            loadMoreDiv.textContent = `Show more (${soundBrowserRenderedCount}/${soundBrowserTotalItems})`;
            loadMoreDiv.addEventListener('click', () => {
                loadMoreDiv.remove();
                renderBatch();
            });
            listDiv.appendChild(loadMoreDiv);
        }
    };
    renderBatch();
}

export function renderSoundBrowserDirectory(pathArray, treeNode) {
    renderSoundBrowserDirectoryFiltered(pathArray, treeNode, '');
}

export function renderSoundBrowserFavorites(listDiv, previewBtn) {
    listDiv.innerHTML = '';
    if (!localAppServices.getFavoriteSounds) {
        listDiv.innerHTML = '<p class="text-gray-500 dark:text-slate-400 italic">Favorites not available.</p>';
        return;
    }
    const favorites = localAppServices.getFavoriteSounds();
    if (favorites.length === 0) {
        listDiv.innerHTML = '<p class="text-gray-500 dark:text-slate-400 italic">No favorites yet. Click ⭐ on any sound to add it.</p>';
        return;
    }
    favorites.forEach(sound => {
        const item = document.createElement('div');
        item.className = 'p-1 hover:bg-purple-200 dark:hover:bg-purple-600 cursor-pointer border-b dark:border-slate-600 text-xs flex items-center';
        item.draggable = true;
        const isFav = localAppServices.isFavorite ? localAppServices.isFavorite(sound) : false;
        const star = document.createElement('span');
        star.className = 'mr-1 cursor-pointer hover:text-yellow-300 ' + (isFav ? 'text-yellow-400' : 'text-gray-300 dark:text-slate-600');
        star.textContent = isFav ? '⭐' : '☆';
        star.title = isFav ? 'Remove from favorites' : 'Add to favorites';
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            if (localAppServices.toggleFavorite) localAppServices.toggleFavorite(sound);
            renderSoundBrowserFavorites(listDiv, previewBtn);
        });
        item.appendChild(star);
        const icon = document.createElement('span');
        icon.className = 'mr-1.5';
        icon.textContent = '🎵';
        item.appendChild(icon);
        const text = document.createElement('span');
        text.className = 'flex-grow truncate';
        text.textContent = sound.fileName;
        item.appendChild(text);
        const libTag = document.createElement('span');
        libTag.className = 'text-[9px] ml-1 text-gray-400 dark:text-slate-500';
        libTag.textContent = sound.libraryName;
        item.appendChild(libTag);
        item.addEventListener('click', () => {
            listDiv.querySelectorAll('.bg-blue-200,.dark\\:\\:bg-purple-500').forEach(el => el.classList.remove('bg-blue-200', 'dark:bg-purple-500'));
            item.classList.add('bg-blue-200', 'dark:bg-purple-500');
            if (localAppServices.setSelectedSoundForPreview) localAppServices.setSelectedSoundForPreview(sound);
            if (previewBtn) previewBtn.disabled = false;
        });
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({ fileName: sound.fileName, fullPath: sound.fullPath, libraryName: sound.libraryName, type: 'sound-browser-item' }));
            e.dataTransfer.effectAllowed = 'copy';
        });
        listDiv.appendChild(item);
    });
}

export function renderSoundBrowserRecent(listDiv, previewBtn) {
    listDiv.innerHTML = '';
    if (!localAppServices.getRecentlyPlayedSounds) {
        listDiv.innerHTML = '<p class="text-gray-500 dark:text-slate-400 italic">Recently played not available.</p>';
        return;
    }
    const recent = localAppServices.getRecentlyPlayedSounds();
    if (recent.length === 0) {
        listDiv.innerHTML = '<p class="text-gray-500 dark:text-slate-400 italic">No recently played sounds. Preview a sound to see it here.</p>';
        return;
    }
    recent.forEach(sound => {
        const item = document.createElement('div');
        item.className = 'p-1 hover:bg-purple-200 dark:hover:bg-purple-600 cursor-pointer border-b dark:border-slate-600 text-xs flex items-center';
        item.draggable = true;
        const isFav = localAppServices.isFavorite ? localAppServices.isFavorite(sound) : false;
        const star = document.createElement('span');
        star.className = 'mr-1 cursor-pointer hover:text-yellow-300 ' + (isFav ? 'text-yellow-400' : 'text-gray-300 dark:text-slate-600');
        star.textContent = isFav ? '⭐' : '☆';
        star.title = isFav ? 'Remove from favorites' : 'Add to favorites';
        star.addEventListener('click', (e) => {
            e.stopPropagation();
            if (localAppServices.toggleFavorite) localAppServices.toggleFavorite(sound);
            renderSoundBrowserRecent(listDiv, previewBtn);
        });
        item.appendChild(star);
        const icon = document.createElement('span');
        icon.className = 'mr-1.5';
        icon.textContent = '🎵';
        item.appendChild(icon);
        const text = document.createElement('span');
        text.className = 'flex-grow truncate';
        text.textContent = sound.fileName;
        item.appendChild(text);
        const libTag = document.createElement('span');
        libTag.className = 'text-[9px] ml-1 text-gray-400 dark:text-slate-500';
        libTag.textContent = sound.libraryName;
        item.appendChild(libTag);
        item.addEventListener('click', () => {
            listDiv.querySelectorAll('.bg-blue-200,.dark\\:\\:bg-purple-500').forEach(el => el.classList.remove('bg-blue-200', 'dark:bg-purple-500'));
            item.classList.add('bg-blue-200', 'dark:bg-purple-500');
            if (localAppServices.setSelectedSoundForPreview) localAppServices.setSelectedSoundForPreview(sound);
            if (previewBtn) previewBtn.disabled = false;
        });
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({ fileName: sound.fileName, fullPath: sound.fullPath, libraryName: sound.libraryName, type: 'sound-browser-item' }));
            e.dataTransfer.effectAllowed = 'copy';
        });
        listDiv.appendChild(item);
    });
}

// --- Mixer Window ---
export function openMixerWindow(savedState = null) {
    const windowId = 'mixer';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) { openWindows.get(windowId).restore(); return openWindows.get(windowId); }

    const contentContainer = document.createElement('div'); contentContainer.id = 'mixerContentContainer';
    contentContainer.className = 'p-2 overflow-x-auto whitespace-nowrap h-full bg-gray-100 dark:bg-slate-800';
    const desktopEl = ((localAppServices.uiElementsCache) && (localAppServices.uiElementsCache).desktop) || document.getElementById('desktop');
    const mixerOptions = { width: Math.min(800, (((desktopEl) && (desktopEl).offsetWidth) || 800) - 40), height: 300, minWidth: 300, minHeight: 200, initialContentKey: windowId };
    if (savedState) Object.assign(mixerOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    const mixerWindow = localAppServices.createWindow(windowId, 'Mixer', contentContainer, mixerOptions);
    if (((mixerWindow) && (mixerWindow).element) || mixerWindow.isMinimized) updateMixerWindow();
    return mixerWindow;
}

export function updateMixerWindow() {
    const mixerWindow = localAppServices.getWindowById ? localAppServices.getWindowById('mixer') : null;
    if (!((mixerWindow) && (mixerWindow).element) || mixerWindow.isMinimized) return;
    const container = mixerWindow.element.querySelector('#mixerContentContainer');
    if (container) renderMixer(container);
}

export function renderMixer(container) {
    const tracks = localAppServices.getTracks ? localAppServices.getTracks() : [];
    container.innerHTML = '';
    const masterTrackDiv = document.createElement('div');
    masterTrackDiv.className = 'mixer-track master-track inline-block align-top p-1.5 border rounded bg-gray-200 dark:bg-slate-700 dark:border-slate-600 shadow w-24 mr-2 text-xs';
    masterTrackDiv.innerHTML = `<div class="track-name font-semibold truncate mb-1 dark:text-slate-200" title="Master">Master</div> <div id="masterVolumeKnob-mixer-placeholder" class="h-16 mx-auto mb-1"></div> <div id="mixerMasterMeterContainer" class="h-3 w-full bg-gray-200 dark:bg-slate-600 rounded border border-gray-300 dark:border-slate-500 overflow-hidden my-1"> <div id="mixerMasterMeterBar" class="h-full bg-purple-400 transition-all duration-50 ease-linear" style="width: 0%;"></div> </div>`;
    container.appendChild(masterTrackDiv);
    const masterVolKnobPlaceholder = masterTrackDiv.querySelector('#masterVolumeKnob-mixer-placeholder');
    if (masterVolKnobPlaceholder) {
        const masterGainNode = localAppServices.getMasterGainValue ? localAppServices.getMasterGainValue() : Tone.dbToGain(0);
        const masterVolume = masterGainNode;
        const masterVolKnob = createKnob({ label: 'Master Vol', min: 0, max: 1.2, step: 0.01, initialValue: masterVolume, decimals: 2, onValueChange: (val, o, fromInteraction) => {
            if (localAppServices.setActualMasterVolume) localAppServices.setActualMasterVolume(val, fromInteraction);
            if (localAppServices.setMasterGainValueState) localAppServices.setMasterGainValueState(val);
            if (fromInteraction && localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Master Volume to ${val.toFixed(2)}`);
         } });
        masterVolKnobPlaceholder.innerHTML = ''; masterVolKnobPlaceholder.appendChild(masterVolKnob.element);
    }

    tracks.forEach(track => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'mixer-track inline-block align-top p-1.5 border rounded bg-white dark:bg-slate-700 dark:border-slate-600 shadow w-28 mr-2 text-xs';
        const effectCount = track.activeEffects ? track.activeEffects.length : 0;
        trackDiv.innerHTML = `<div class="track-name font-semibold truncate mb-1 dark:text-slate-200 flex items-center" title="${track.name}"><span class="track-color-dot" style="background-color:${track.trackColor || '#6366f1'}" title="Track color"></span>${track.name}</div> <div id="volumeKnob-mixer-${track.id}-placeholder" class="h-12 mx-auto mb-0.5"></div> <div id="panKnob-mixer-${track.id}-placeholder" class="h-12 mx-auto mb-0.5"></div> <div id="mixerFxSlots-${track.id}" class="mixer-fx-slots flex flex-wrap gap-0.5 mb-0.5 justify-center min-h-[18px]"></div> <div class="flex justify-center mb-0.5"> <button id="fxBtn-mixer-${track.id}" title="Effects Rack" class="px-1 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600">FX</button> </div> <div class="grid grid-cols-3 gap-x-1 gap-y-1 items-center text-xs">
                <button id="mixerMuteBtn-${track.id}" title="Mute" class="px-1 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600 ${track.isMuted ? 'muted' : ''}">M</button>
                <button id="mixerSoloBtn-${track.id}" title="Solo" class="px-1 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600 ${track.isSoloed ? 'soloed' : ''}">S</button>
                <button id="mixerArmBtn-${track.id}" title="Arm" class="px-1 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600 ${(localAppServices.getArmedTrackId && localAppServices.getArmedTrackId() === track.id) ? 'armed' : ''}">R</button>
            </div> ${track.type === 'Audio' ? `<div class="flex justify-center mb-0.5"><button id="mixerMonitorBtn-${track.id}" title="Toggle Input Monitoring" class="px-1 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600 ${track.isMonitoringEnabled ? 'bg-green-600 text-white border-green-500' : ''}">Mon</button></div>` : ''} <div id="mixerTrackMeterContainer-${track.id}" class="h-3 w-full bg-gray-200 dark:bg-slate-600 rounded border border-gray-300 dark:border-slate-500 overflow-hidden mt-0.5"> <div id="mixerTrackMeterBar-${track.id}" class="h-full bg-pink-400 transition-all duration-50 ease-linear" style="width: 0%; background-color:${track.trackColor || '#6366f1'}"></div> </div>`;
        trackDiv.addEventListener('contextmenu', (e) => { e.preventDefault(); createContextMenu(e, [
            {label: "Open Inspector", action: () => localAppServices.handleOpenTrackInspector(track.id)},
            {label: "Open Effects Rack", action: () => localAppServices.handleOpenEffectsRack(track.id)},
            {label: "Open Sequencer", action: () => localAppServices.handleOpenSequencer(track.id)},
            {separator: true},
            {label: `Change Color...`, action: () => showTrackColorPicker(track)},
            {label: track.isMuted ? "Unmute" : "Mute", action: () => localAppServices.handleTrackMute(track.id)},
            {label: track.isSoloed ? "Unsolo" : "Solo", action: () => localAppServices.handleTrackSolo(track.id)},
            {label: (localAppServices.getArmedTrackId && localAppServices.getArmedTrackId() === track.id) ? "Disarm Input" : "Arm for Input", action: () => localAppServices.handleTrackArm(track.id)},
            {separator: true},
            {label: "Record Mute Automation", action: () => { if (track.toggleMuteAutomationNow) track.toggleMuteAutomationNow(); else showNotification('Arm automation first', 1500); }},
            {label: "Record Solo Automation", action: () => { if (track.toggleSoloAutomationNow) track.toggleSoloAutomationNow(); else showNotification('Arm automation first', 1500); }},
            {separator: true},
            {label: "Save Track as Template", action: () => { const templateName = track.name || 'Track Template'; const templateData = { name: templateName, color: track.trackColor || '#54a0ff', type: track.type, synthParams: track.synthParams || {}, activeEffects: (track.activeEffects || []).map(e => ({ type: e.type, params: e.params || {} })) }; if (localAppServices.addTrackTemplate) { const t = localAppServices.addTrackTemplate(templateData); if (t) showNotification(`Template "${t.name}" saved`, 2000); else showNotification('Failed to save template', 2000); } else { showNotification('Template API not available', 2000); } }},
            {separator: true},
            {label: "Add to Track Group", submenu: () => {
                const groups = localAppServices.getTrackGroups ? localAppServices.getTrackGroups() : [];
                if (groups.length === 0) return [{label: "No groups yet", enabled: false}];
                return groups.map(g => ({
                    label: `◆ ${g.name} (${g.trackIds ? g.trackIds.length : 0})`,
                    action: () => {
                        if (localAppServices.addTrackToGroup) {
                            localAppServices.addTrackToGroup(g.id, track.id);
                            showNotification(`Added ${track.name} to "${g.name}"`, 1500);
                        }
                    }
                }));
            }},
            {label: "Remove from Track Group", action: () => {
                const groups = localAppServices.getTrackGroups ? localAppServices.getTrackGroups() : [];
                const memberOf = groups.filter(g => g.trackIds && g.trackIds.includes(track.id));
                if (memberOf.length === 0) { showNotification(`${track.name} is not in any group`, 1500); return; }
                memberOf.forEach(g => {
                    if (localAppServices.removeTrackFromGroup) localAppServices.removeTrackFromGroup(g.id, track.id);
                });
                showNotification(`Removed ${track.name} from ${memberOf.length} group(s)`, 1500);
            }},
            {label: "Create Track Group from this Track", action: () => {
                const groupName = `${track.name} Group`;
                if (localAppServices.addTrackGroup) {
                    const newGroup = localAppServices.addTrackGroup(groupName);
                    if (newGroup && localAppServices.addTrackToGroup) {
                        localAppServices.addTrackToGroup(newGroup.id, track.id);
                        showNotification(`Created group "${groupName}" with ${track.name}`, 1500);
                    }
                } else {
                    showNotification('Track Group API not available', 1500);
                }
            }},
            {label: "Manage Track Groups...", action: () => {
                if (localAppServices.openTrackGroupsWindow) {
                    localAppServices.openTrackGroupsWindow();
                } else {
                    showNotification('Track Groups window not available', 1500);
                }
            }},
            {separator: true},
            {label: "Duplicate Track", action: async () => {
                if (track.duplicateTrack) {
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Duplicate Track "${track.name}"`);
                    const newTrack = await track.duplicateTrack();
                    if (newTrack) {
                        if (localAppServices.showNotification) localAppServices.showNotification(`Duplicated "${track.name}"`, 2000);
                    } else {
                        if (localAppServices.showNotification) localAppServices.showNotification(`Failed to duplicate "${track.name}"`, 2000);
                    }
                } else {
                    if (localAppServices.showNotification) localAppServices.showNotification('Duplicate not available', 1500);
                }
            }},
            {separator: true},
            {label: "Remove Track", action: () => localAppServices.handleRemoveTrack(track.id)}
        ], localAppServices); });
        container.appendChild(trackDiv);
        const volKnobPlaceholder = trackDiv.querySelector(`#volumeKnob-mixer-${track.id}-placeholder`);
        if (volKnobPlaceholder) { const volKnob = createKnob({ label: `Vol ${track.id}`, min: 0, max: 1.2, step: 0.01, initialValue: track.previousVolumeBeforeMute, decimals: 2, trackRef: track, onValueChange: (val, o, fromInteraction) => track.setVolume(val, fromInteraction) }); volKnobPlaceholder.innerHTML = ''; volKnobPlaceholder.appendChild(volKnob.element); }
        const panKnobPlaceholder = trackDiv.querySelector(`#panKnob-mixer-${track.id}-placeholder`);
        if (panKnobPlaceholder) { const panKnob = createKnob({ label: `Pan ${track.id}`, min: -1, max: 1, step: 0.01, initialValue: (track.panValue !== undefined) ? track.panValue : 0, decimals: 2, trackRef: track, onValueChange: (val, o, fromInteraction) => { if (track.setPan) track.setPan(val, fromInteraction); } }); panKnobPlaceholder.innerHTML = ''; panKnobPlaceholder.appendChild(panKnob.element); }
        trackDiv.querySelector(`#mixerMuteBtn-${track.id}`).addEventListener('click', () => localAppServices.handleTrackMute(track.id));
        trackDiv.querySelector(`#mixerSoloBtn-${track.id}`).addEventListener('click', () => localAppServices.handleTrackSolo(track.id));
        trackDiv.querySelector(`#mixerArmBtn-${track.id}`).addEventListener('click', () => localAppServices.handleTrackArm(track.id));
        trackDiv.querySelector(`#fxBtn-mixer-${track.id}`).addEventListener('click', () => localAppServices.handleOpenEffectsRack(track.id));

        // Populate mixer FX slots with effect tags
        const fxSlotsContainer = trackDiv.querySelector(`#mixerFxSlots-${track.id}`);
        if (fxSlotsContainer && track.activeEffects && track.activeEffects.length > 0) {
            const AVAILABLE_EFFECTS_LOCAL = ((localAppServices.effectsRegistryAccess) && (localAppServices.effectsRegistryAccess).AVAILABLE_EFFECTS) || {};
            track.activeEffects.forEach(effect => {
                const effectDef = AVAILABLE_EFFECTS_LOCAL[effect.type];
                const displayName = effectDef ? effectDef.displayName : effect.type;
                const slot = document.createElement('button');
                slot.className = 'mixer-fx-slot-btn text-[9px] px-1 py-0 border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600 hover:bg-slate-300 dark:bg-slate-800 truncate max-w-[50px]';
                slot.title = `Open ${displayName} for ${track.name}`;
                slot.textContent = displayName;
                slot.style.borderColor = track.trackColor || '#6366f1';
                slot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    localAppServices.handleOpenEffectsRack(track.id);
                    // Highlight the specific effect after a short delay
                    setTimeout(() => {
                        const rackWindow = localAppServices.getWindowById ? localAppServices.getWindowById(`effectsRack-${track.id}`) : null;
                        if (rackWindow && rackWindow.element) {
                            const effectItems = rackWindow.element.querySelectorAll('.effect-item');
                            effectItems.forEach(item => {
                                const nameSpan = item.querySelector('.effect-name');
                                if (nameSpan && nameSpan.textContent.trim() === displayName) {
                                    item.click();
                                }
                            });
                        }
                    }, 100);
                });
                fxSlotsContainer.appendChild(slot);
            });
        }

        // Wire monitoring toggle for audio tracks
        const monitorBtn = trackDiv.querySelector(`#mixerMonitorBtn-${track.id}`);
        if (monitorBtn) {
            monitorBtn.addEventListener('click', () => {
                track.isMonitoringEnabled = !track.isMonitoringEnabled;
                monitorBtn.classList.toggle('bg-green-600', track.isMonitoringEnabled);
                monitorBtn.classList.toggle('text-white', track.isMonitoringEnabled);
                monitorBtn.classList.toggle('border-green-500', track.isMonitoringEnabled);
                showNotification(`Input monitoring ${track.isMonitoringEnabled ? 'enabled' : 'disabled'} for ${track.name}`, 1500);
                if (localAppServices.setTrackMonitoring) localAppServices.setTrackMonitoring(track.id, track.isMonitoringEnabled);
            });
        }
    });

    // Render send bus strips in the mixer
    const sendTracks = localAppServices.getSendTracks ? localAppServices.getSendTracks() : [];
    sendTracks.forEach(sendTrack => {
        const sendDiv = document.createElement('div');
        sendDiv.className = 'mixer-send-track inline-block align-top p-1.5 border rounded bg-purple-100 dark:bg-slate-700 dark:border-slate-600 shadow w-28 mr-2 text-xs';
        sendDiv.innerHTML = `<div class="track-name font-semibold truncate mb-1 dark:text-slate-200 flex items-center" title="${sendTrack.name}"><span class="track-color-dot w-2 h-2 rounded-full mr-1" style="background-color:${sendTrack.color || '#a855f7'}"></span>${sendTrack.name}</div> <div id="sendVolumeKnob-${sendTrack.id}-placeholder" class="h-12 mx-auto mb-0.5"></div> <div id="sendFxSlots-${sendTrack.id}" class="send-fx-slots flex flex-wrap gap-0.5 mb-0.5 justify-center min-h-[18px]"></div> <div class="flex justify-center mb-0.5"> <button id="sendFxBtn-${sendTrack.id}" title="Send Effects Rack" class="px-1 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600 bg-purple-200 dark:bg-slate-600">FX</button> </div>`;
        sendDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            createContextMenu(e, [
                {label: "Open Send Effects Rack", action: () => localAppServices.openSendEffectsWindow ? localAppServices.openSendEffectsWindow(sendTrack.id) : showNotification('Send Effects not available', 1500)},
                {separator: true},
                {label: `Mute`, action: () => { if (localAppServices.setSendTrackMuted) localAppServices.setSendTrackMuted(sendTrack.id, !sendTrack.muted); if (localAppServices.updateMixerWindow) localAppServices.updateMixerWindow(); }},
                {label: "Remove Send Bus", action: () => { if (localAppServices.removeSendTrack) localAppServices.removeSendTrack(sendTrack.id); if (localAppServices.updateMixerWindow) localAppServices.updateMixerWindow(); }}
            ], localAppServices);
        });
        container.appendChild(sendDiv);

        // Volume knob for send bus
        const volKnobPlaceholder = sendDiv.querySelector(`#sendVolumeKnob-${sendTrack.id}-placeholder`);
        if (volKnobPlaceholder) {
            const volKnob = createKnob({
                label: `Send ${sendTrack.id}`,
                min: 0,
                max: 1,
                step: 0.01,
                initialValue: sendTrack.level !== undefined ? sendTrack.level : 1,
                decimals: 2,
                onValueChange: (val, o, fromInteraction) => {
                    if (localAppServices.setSendTrackLevel) localAppServices.setSendTrackLevel(sendTrack.id, val);
                    if (localAppServices.setSendBusLevel) localAppServices.setSendBusLevel(sendTrack.id, val);
                    if (fromInteraction && localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Send Bus ${sendTrack.name} level to ${val.toFixed(2)}`);
                }
            });
            volKnobPlaceholder.innerHTML = '';
            volKnobPlaceholder.appendChild(volKnob.element);
        }

        // FX slots for send bus
        const fxSlotsContainer = sendDiv.querySelector(`#sendFxSlots-${sendTrack.id}`);
        if (fxSlotsContainer && sendTrack.effects && sendTrack.effects.length > 0) {
            const AVAILABLE_EFFECTS_LOCAL = ((localAppServices.effectsRegistryAccess) && (localAppServices.effectsRegistryAccess).AVAILABLE_EFFECTS) || {};
            sendTrack.effects.forEach(effect => {
                const effectDef = AVAILABLE_EFFECTS_LOCAL[effect.type];
                const displayName = effectDef ? effectDef.displayName : effect.type;
                const slot = document.createElement('button');
                slot.className = 'mixer-fx-slot-btn text-[9px] px-1 py-0 border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600 hover:bg-slate-300 dark:bg-slate-800 truncate max-w-[50px]';
                slot.title = `Open ${displayName} for ${sendTrack.name}`;
                slot.textContent = displayName;
                slot.style.borderColor = sendTrack.color || '#a855f7';
                slot.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (localAppServices.openSendEffectsWindow) localAppServices.openSendEffectsWindow(sendTrack.id);
                });
                fxSlotsContainer.appendChild(slot);
            });
        }

        // Wire FX button for send bus
        sendDiv.querySelector(`#sendFxBtn-${sendTrack.id}`)?.addEventListener('click', () => {
            if (localAppServices.openSendEffectsWindow) localAppServices.openSendEffectsWindow(sendTrack.id);
        });
    });

    // Add a "+" button to add a new send bus
    const addSendBtn = document.createElement('button');
    addSendBtn.className = 'inline-block align-top p-1.5 border-2 border-dashed border-purple-400 rounded w-28 mr-2 text-xs text-purple-400 hover:bg-purple-900/20 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-slate-400';
    addSendBtn.innerHTML = '+ Send Bus';
    addSendBtn.title = 'Add a new send bus';
    addSendBtn.addEventListener('click', () => {
        if (localAppServices.addSendTrack) {
            const newSend = localAppServices.addSendTrack({ name: `Send ${(localAppServices.getSendTracks ? localAppServices.getSendTracks().length + 1 : '1')}`, color: '#a855f7' });
            if (newSend && localAppServices.createSendBusInAudio) localAppServices.createSendBusInAudio(newSend.id);
            if (localAppServices.updateMixerWindow) localAppServices.updateMixerWindow();
            if (newSend && localAppServices.showNotification) localAppServices.showNotification(`Send bus "${newSend.name}" created`, 2000);
        } else {
            showNotification('Add Send Bus not available', 1500);
        }
    });
    container.appendChild(addSendBtn);
}

// --- Sequencer Window ---
// Piano Roll View Mode: shows piano-style note labels and piano-key visual for each row
function buildPianoRollContentDOM(track, rows, rowLabels, numBars) {
    const stepsPerBar = Constants.STEPS_PER_BAR;
    const totalSteps = Number.isFinite(numBars) && numBars > 0 ? numBars * stepsPerBar : Constants.defaultStepsPerBar;
    const snapValue = window.SEQUENCER_SNAP_VALUE || 16;
    const snapLabel = snapValue === 0 ? 'Off' : (snapValue === 4 ? '1/4' : (snapValue === 8 ? '1/8' : '1/16'));
    let html = `<div class="sequencer-container p-1 text-xs overflow-auto h-full dark:bg-slate-900 dark:text-slate-300"> <div class="controls mb-1 flex justify-between items-center sticky top-0 left-0 bg-gray-200 dark:bg-slate-800 p-1 z-30 border-b dark:border-slate-700"> <div class="flex items-center gap-2"> <span class="font-semibold">${track.name} - ${numBars} Bar${numBars > 1 ? 's' : ''} (${totalSteps} steps)</span> <button id="seqViewToggle-${track.id}" class="px-2 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600" title="Toggle step/velocity view (V key)">Step</button> </div> <div class="flex items-center gap-2"> <label for="seqLengthInput-${track.id}" class="text-xs">Bars:</label> <input type="number" id="seqLengthInput-${track.id}" value="${numBars}" min="1" max="${Constants.MAX_BARS || 16}" class="w-12 p-0.5 border rounded text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"> <button id="seqSnapToggle-${track.id}" class="px-2 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600" title="Toggle snap-to-grid (S key)">Snap: ${snapLabel}</button> </div> </div>`;
    html += `<div class="sequencer-grid-layout" style="display: grid; grid-template-columns: 70px repeat(${totalSteps}, 20px); grid-auto-rows: 20px; gap: 0px; width: fit-content; position: relative; top: 0; left: 0;"> <div class="sequencer-header-cell sticky top-0 left-0 z-20 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700"></div>`;
    for (let i = 0; i < totalSteps; i++) { const beatsPerBar = 4; const barNum = Math.floor(i / beatsPerBar) + 1; const beatInBar = (i % beatsPerBar) + 1; const label = beatInBar === 1 ? String(barNum) : `${barNum}.${beatInBar}`; const isSnapPoint = snapValue === 0 || i % snapValue === 0; const snapClass = isSnapPoint ? 'snap-point' : 'non-snap-point'; html += `<div class="sequencer-header-cell ${snapClass} sticky top-0 z-10 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700 flex items-center justify-center pr-1 text-[10px] text-gray-500 dark:text-slate-400">${label}</div>`; }

    const activeSequence = track.getActiveSequence();
    const sequenceData = activeSequence ? activeSequence.data : [];

    let dotClassPrefix = 'piano-note-synth';
    if (track.type === 'Sampler') dotClassPrefix = 'piano-note-sampler';
    else if (track.type === 'DrumSampler') dotClassPrefix = 'piano-note-drum';
    else if (track.type === 'InstrumentSampler') dotClassPrefix = 'piano-note-instrument';

    // Track which cells are covered by longer notes (so we skip rendering them)
    const coveredCells = new Set();
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < totalSteps; j++) {
            const stepData = sequenceData[i]?.[j];
            if (stepData && stepData.active) {
                const noteLen = Math.max(1, stepData.length || 1);
                for (let k = 1; k < noteLen; k++) {
                    if (j + k < totalSteps) coveredCells.add(`${i},${j + k}`);
                }
            }
        }
    }

    for (let i = 0; i < rows; i++) {
        const noteLabel = rowLabels[i] || `R${i + 1}`;
        const isBlackKey = noteLabel.includes('#');
        html += `<div class="piano-key-cell ${isBlackKey ? 'piano-black-key' : 'piano-white-key'} sticky left-0 z-10 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700" style="width:70px;height:20px;display:flex;align-items:center;justify-content:flex-end;padding-right:5px;gap:4px;" title="${rowLabels[i] || ''}">
            <span style="font-size:10px;font-family:monospace;font-weight:600;color:${isBlackKey ? '#e2e8f0' : '#1e293b'};">${noteLabel}</span>
            <div class="key-indicator"></div>
        </div>`;
        for (let j = 0; j < totalSteps; j++) {
            const isCovered = coveredCells.has(`${i},${j}`);
            const stepData = sequenceData[i]?.[j];
            const isNoteStart = stepData && stepData.active;

            if (isCovered) {
                // Cell covered by a longer note — render empty placeholder (note body)
                html += `<div class="sequencer-step-cell sequencer-note-body bg-transparent border-r border-b border-gray-200 dark:border-slate-600" data-row="${i}" data-col="${j}" data-note="${noteLabel}" style="cursor:default;"></div>`;
            } else if (isNoteStart) {
                const vel = stepData.velocity || 0.7;
                const velPercent = Math.round(vel * 100);
                const noteLen = Math.max(1, stepData.length || 1);
                const velClass = velPercent >= 80 ? 'vel-100' : (velPercent >= 60 ? 'vel-80' : (velPercent >= 40 ? 'vel-60' : 'vel-40'));
                const noteWidth = noteLen * 20 - 1;
                const noteTitle = `${noteLabel} | Vel: ${velPercent}% | Len: ${noteLen} step${noteLen > 1 ? 's' : ''} | Right-click for length`;
                html += `<div class="sequencer-step-cell ${velClass} border-r border-b border-gray-200 dark:border-slate-600" data-row="${i}" data-col="${j}" data-note="${noteLabel}" data-length="${noteLen}" style="display:flex;align-items:center;padding:0;overflow:visible;" title="${noteTitle}">
                    <div class="piano-note-bar ${dotClassPrefix}" style="width:${noteWidth}px;height:14px;border-radius:2px;"></div>
                </div>`;
            } else {
                let beatBlockClass = (Math.floor((j % stepsPerBar) / 4) % 2 === 0) ? 'bg-gray-50 dark:bg-slate-700' : 'bg-white dark:bg-slate-750';
                if (j % stepsPerBar === 0 && j > 0) beatBlockClass += ' border-l-2 border-l-gray-400 dark:border-l-slate-600';
                else if (j % (stepsPerBar / 2) === 0) beatBlockClass += ' border-l-gray-300 dark:border-l-slate-650';
                else if (j % (stepsPerBar / 4) === 0) beatBlockClass += ' border-l-gray-200 dark:border-l-slate-675';
                html += `<div class="sequencer-step-cell ${beatBlockClass} border-r border-b border-gray-200 dark:border-slate-600" data-row="${i}" data-col="${j}" data-note="${noteLabel}"></div>`;
            }
        }
    }
    html += `</div></div>`; return html;
}

// Step/velocity view (default sequencer view)
function buildSequencerContentDOM(track, rows, rowLabels, numBars) {
    const stepsPerBar = Constants.STEPS_PER_BAR;
    const totalSteps = Number.isFinite(numBars) && numBars > 0 ? numBars * stepsPerBar : Constants.defaultStepsPerBar;
    // Snap-to-grid settings: 0=off, 4=1/4, 8=1/8, 16=1/16
    const snapValue = window.SEQUENCER_SNAP_VALUE || 16;
    const snapLabel = snapValue === 0 ? 'Off' : (snapValue === 4 ? '1/4' : (snapValue === 8 ? '1/8' : '1/16'));
    let html = `<div class="sequencer-container p-1 text-xs overflow-auto h-full dark:bg-slate-900 dark:text-slate-300"> <div class="controls mb-1 flex justify-between items-center sticky top-0 left-0 bg-gray-200 dark:bg-slate-800 p-1 z-30 border-b dark:border-slate-700"> <div class="flex items-center gap-2"> <span class="font-semibold">${track.name} - ${numBars} Bar${numBars > 1 ? 's' : ''} (${totalSteps} steps)</span> <button id="seqViewToggle-${track.id}" class="px-2 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600" title="Toggle piano roll view (V key)">Piano</button> </div> <div class="flex items-center gap-2"> <label for="seqLengthInput-${track.id}" class="text-xs">Bars:</label> <input type="number" id="seqLengthInput-${track.id}" value="${numBars}" min="1" max="${Constants.MAX_BARS || 16}" class="w-12 p-0.5 border rounded text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"> <button id="seqSnapToggle-${track.id}" class="px-2 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600" title="Toggle snap-to-grid (S key)">Snap: ${snapLabel}</button> </div> </div>`;
    html += `<div class="sequencer-grid-layout" style="display: grid; grid-template-columns: 50px repeat(${totalSteps}, 20px); grid-auto-rows: 20px; gap: 0px; width: fit-content; position: relative; top: 0; left: 0;"> <div class="sequencer-header-cell sticky top-0 left-0 z-20 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700"></div>`;
    for (let i = 0; i < totalSteps; i++) { const beatsPerBar = 4; const barNum = Math.floor(i / beatsPerBar) + 1; const beatInBar = (i % beatsPerBar) + 1; const label = beatInBar === 1 ? String(barNum) : `${barNum}.${beatInBar}`; const isSnapPoint = snapValue === 0 || i % snapValue === 0; const snapClass = isSnapPoint ? 'snap-point' : 'non-snap-point'; html += `<div class="sequencer-header-cell ${snapClass} sticky top-0 z-10 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700 flex items-center justify-center pr-1 text-[10px] text-gray-500 dark:text-slate-400">${label}</div>`; }

    const activeSequence = track.getActiveSequence();
    const sequenceData = activeSequence ? activeSequence.data : [];

    for (let i = 0; i < rows; i++) {
        let labelText = rowLabels[i] || `R${i + 1}`; if (labelText.length > 6) labelText = labelText.substring(0,5) + "..";
        html += `<div class="sequencer-label-cell sticky left-0 z-10 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700 flex items-center justify-end pr-1 text-[10px]" title="${rowLabels[i] || ''}">${labelText}</div>`;
        for (let j = 0; j < totalSteps; j++) {
            const stepData = sequenceData[i]?.[j];
            let activeClass = '';
            if (((stepData) && (stepData).active)) { if (track.type === 'Synth') activeClass = 'active-synth'; else if (track.type === 'Sampler') activeClass = 'active-sampler'; else if (track.type === 'DrumSampler') activeClass = 'active-drum-sampler'; else if (track.type === 'InstrumentSampler') activeClass = 'active-instrument-sampler'; }
            let beatBlockClass = (Math.floor((j % stepsPerBar) / 4) % 2 === 0) ? 'bg-gray-50 dark:bg-slate-700' : 'bg-white dark:bg-slate-750';
            if (j % stepsPerBar === 0 && j > 0) beatBlockClass += ' border-l-2 border-l-gray-400 dark:border-l-slate-600';
            else if (j % (stepsPerBar / 2) === 0) beatBlockClass += ' border-l-gray-300 dark:border-l-slate-650';
            else if (j % (stepsPerBar / 4) === 0) beatBlockClass += ' border-l-gray-200 dark:border-l-slate-675';
            // Apply velocity-based brightness class during initial render
            let velClass = '';
            if (((stepData) && (stepData).active)) {
                const vel = ((stepData) && (stepData).velocity) || 0.7;
                const velPercent = Math.round(vel * 100);
                if (velPercent >= 100) velClass = 'vel-100';
                else if (velPercent >= 90) velClass = 'vel-90';
                else if (velPercent >= 80) velClass = 'vel-80';
                else if (velPercent >= 70) velClass = 'vel-70';
                else if (velPercent >= 60) velClass = 'vel-60';
                else if (velPercent >= 50) velClass = 'vel-50';
                else if (velPercent >= 40) velClass = 'vel-40';
                else if (velPercent >= 30) velClass = 'vel-30';
                else if (velPercent >= 20) velClass = 'vel-20';
                else velClass = 'vel-10';
            }
            html += `<div class="sequencer-step-cell ${activeClass} ${velClass} ${beatBlockClass} border-r border-b border-gray-200 dark:border-slate-600" data-row="${i}" data-col="${j}" title="R${i+1},S${j+1}"></div>`;
        }
    }
    html += `</div></div>`; return html;
}

export function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) {
    console.log(`[UI openTrackSequencerWindow] Called for track ${trackId}. Force redraw: ${forceRedraw}, SavedState:`, savedState);
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track || track.type === 'Audio') {
        console.warn(`[UI openTrackSequencerWindow] Track ${trackId} not found or is Audio type. Aborting.`);
        return null;
    }
    const windowId = `sequencerWin-${trackId}`;
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();

    if (forceRedraw && openWindows.has(windowId)) {
        const existingWindow = openWindows.get(windowId);
        if (existingWindow && typeof existingWindow.close === 'function') {
            try {
                console.log(`[UI openTrackSequencerWindow] Force redraw: Closing existing window ${windowId}`);
                existingWindow.close(true);
            } catch (e) {console.warn(`[UI openTrackSequencerWindow] Error closing existing sequencer window for redraw for track ${trackId}:`, e)}
        } else {
            console.log(`[UI openTrackSequencerWindow] Force redraw: Window ${windowId} found in map but no close method or not instance, or map is missing.`);
        }
    }
    if (openWindows.has(windowId) && !forceRedraw && !savedState) {
        const win = openWindows.get(windowId);
        win.restore();
        if (localAppServices.setActiveSequencerTrackId) localAppServices.setActiveSequencerTrackId(trackId);
        return win;
    }

    const activeSequence = track.getActiveSequence();
    if (!activeSequence) {
        console.error(`[UI openTrackSequencerWindow] Track ${trackId} has no active sequence. Cannot open sequencer.`);
        return null;
    }

    let rows, rowLabels;
    const numBars = activeSequence.length > 0 ? Math.max(1, activeSequence.length / Constants.STEPS_PER_BAR) : 1;

    if (track.type === 'Synth' || track.type === 'InstrumentSampler') { rows = Constants.synthPitches.length; rowLabels = Constants.synthPitches; }
    else if (track.type === 'Sampler') { rows = track.slices.length > 0 ? track.slices.length : Constants.numSlices; rowLabels = Array.from({ length: rows }, (_, i) => `Slice ${i + 1}`); }
    else if (track.type === 'DrumSampler') { rows = Constants.numDrumSamplerPads; rowLabels = Array.from({ length: rows }, (_, i) => `Pad ${i + 1}`); }
    else { rows = 0; rowLabels = []; }

    const contentDOM = sequencerViewMode === 'piano' 
        ? buildPianoRollContentDOM(track, rows, rowLabels, numBars)
        : buildSequencerContentDOM(track, rows, rowLabels, numBars);

    const desktopEl = ((localAppServices.uiElementsCache) && (localAppServices.uiElementsCache).desktop) || document.getElementById('desktop');
    const safeDesktopWidth = (desktopEl && typeof desktopEl.offsetWidth === 'number' && desktopEl.offsetWidth > 0)
                           ? desktopEl.offsetWidth
                           : 1024; // More robust fallback
    console.log(`[UI openTrackSequencerWindow] For track ${trackId}: Desktop element: ${desktopEl ? 'found' : 'NOT found'}, offsetWidth: ${((desktopEl) && (desktopEl).offsetWidth)}, safeDesktopWidth: ${safeDesktopWidth}, NumBars: ${numBars}`);


    let calculatedWidth = Math.max(400, Math.min(900, safeDesktopWidth - 40));
    let calculatedHeight = 400;

    if (!Number.isFinite(calculatedWidth) || calculatedWidth <= 0) {
        console.warn(`[UI openTrackSequencerWindow] Invalid calculatedWidth (${calculatedWidth}) for track ${trackId}, defaulting to 600.`);
        calculatedWidth = 600;
    }
    if (!Number.isFinite(calculatedHeight) || calculatedHeight <= 0) {
        console.warn(`[UI openTrackSequencerWindow] Invalid calculatedHeight (${calculatedHeight}) for track ${trackId}, defaulting to 400.`);
        calculatedHeight = 400;
    }

    const seqOptions = {
        width: calculatedWidth,
        height: calculatedHeight,
        minWidth: 400,
        minHeight: 250,
        initialContentKey: windowId,
        onCloseCallback: () => { if (localAppServices.getActiveSequencerTrackId && localAppServices.getActiveSequencerTrackId() === trackId && localAppServices.setActiveSequencerTrackId) localAppServices.setActiveSequencerTrackId(null); }
    };
    if (savedState) {
        if (Number.isFinite(parseInt(savedState.left,10))) seqOptions.x = parseInt(savedState.left,10);
        if (Number.isFinite(parseInt(savedState.top,10))) seqOptions.y = parseInt(savedState.top,10);
        if (Number.isFinite(parseInt(savedState.width,10)) && parseInt(savedState.width,10) >= seqOptions.minWidth) seqOptions.width = parseInt(savedState.width,10);
        if (Number.isFinite(parseInt(savedState.height,10)) && parseInt(savedState.height,10) >= seqOptions.minHeight) seqOptions.height = parseInt(savedState.height,10);
        if (Number.isFinite(parseInt(savedState.zIndex))) seqOptions.zIndex = parseInt(savedState.zIndex);
        seqOptions.isMinimized = savedState.isMinimized;
    }

    console.log(`[UI openTrackSequencerWindow] For track ${trackId}: Creating window with options:`, JSON.stringify(seqOptions));
    const sequencerWindow = localAppServices.createWindow(windowId, `Sequencer: ${track.name} - ${activeSequence.name}`, contentDOM, seqOptions);

    if (((sequencerWindow) && (sequencerWindow).element)) {
        const allCells = Array.from(sequencerWindow.element.querySelectorAll('.sequencer-step-cell'));
        sequencerWindow.stepCellsGrid = [];
        const currentSequenceLength = activeSequence ? activeSequence.length : Constants.defaultStepsPerBar;
        for (let i = 0; i < rows; i++) {
            sequencerWindow.stepCellsGrid[i] = allCells.slice(i * currentSequenceLength, (i + 1) * currentSequenceLength);
        }
        sequencerWindow.lastPlayedCol = -1;


        if (localAppServices.setActiveSequencerTrackId) localAppServices.setActiveSequencerTrackId(trackId);
        const grid = sequencerWindow.element.querySelector('.sequencer-grid-layout');
        const controlsDiv = sequencerWindow.element.querySelector('.sequencer-container .controls');

        if (controlsDiv) {
            controlsDiv.draggable = true;
            controlsDiv.addEventListener('dragstart', (e) => {
                const currentActiveSeq = track.getActiveSequence();
                if (currentActiveSeq) {
                    const dragData = {
                        type: 'sequence-timeline-drag',
                        sourceSequenceId: currentActiveSeq.id,
                        sourceTrackId: track.id,
                        clipName: currentActiveSeq.name
                    };
                    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
                    e.dataTransfer.effectAllowed = 'copy';
                    console.log(`[UI Sequencer DragStart] Dragging sequence: ${currentActiveSeq.name}`);
                } else {
                    e.preventDefault();
                    console.warn(`[UI Sequencer DragStart] No active sequence to drag for track ${track.name}`);
                }
            });
        }


        // Track selection state for copy/paste sections
        let selectionStartCell = null;
        let selectionEndCell = null;
        let isSelecting = false;

        function clearSelection() {
            if (sequencerWindow.element) {
                sequencerWindow.element.querySelectorAll('.sequencer-step-cell.selected').forEach(cell => {
                    cell.classList.remove('selected');
                });
            }
            selectionStartCell = null;
            selectionEndCell = null;
            isSelecting = false;
        }

        function updateSelectionUI() {
            if (!selectionStartCell || !selectionEndCell || !sequencerWindow.element) return;
            const r1 = Math.min(selectionStartCell.row, selectionEndCell.row);
            const r2 = Math.max(selectionStartCell.row, selectionEndCell.row);
            const c1 = Math.min(selectionStartCell.col, selectionEndCell.col);
            const c2 = Math.max(selectionStartCell.col, selectionEndCell.col);

            sequencerWindow.element.querySelectorAll('.sequencer-step-cell.selected').forEach(cell => {
                cell.classList.remove('selected');
            });
            for (let r = r1; r <= r2; r++) {
                for (let c = c1; c <= c2; c++) {
                    const cell = sequencerWindow.element.querySelector(`.sequencer-step-cell[data-row="${r}"][data-col="${c}"]`);
                    if (cell) cell.classList.add('selected');
                }
            }
        }

        const sequencerContextMenuHandler = (event) => {
            event.preventDefault(); event.stopPropagation();
            const currentTrackForMenu = localAppServices.getTrackById ? localAppServices.getTrackById(track.id) : null; if (!currentTrackForMenu) return;
            const currentActiveSeq = currentTrackForMenu.getActiveSequence(); if(!currentActiveSeq) return;
            const clipboard = localAppServices.getClipboardData ? localAppServices.getClipboardData() : {};
            const menuItems = [
                { label: `Copy Full Sequence`, action: () => { if (localAppServices.setClipboardData) { localAppServices.setClipboardData({ type: 'sequence', sourceTrackType: currentTrackForMenu.type, data: JSON.parse(JSON.stringify(currentActiveSeq.data || [])), sequenceLength: currentActiveSeq.length }); showNotification(`Sequence "${currentActiveSeq.name}" copied.`, 2000); } } },
                { label: `Copy Selection`, action: () => { if (!selectionStartCell || !selectionEndCell) { showNotification("Drag to select a region first.", 2000); return; } if (localAppServices.setClipboardData) { const r1 = Math.min(selectionStartCell.row, selectionEndCell.row); const r2 = Math.max(selectionStartCell.row, selectionEndCell.row); const c1 = Math.min(selectionStartCell.col, selectionEndCell.col); const c2 = Math.max(selectionStartCell.col, selectionEndCell.col); const selData = []; for (let r = r1; r <= r2; r++) { const row = []; for (let c = c1; c <= c2; c++) { row.push(currentActiveSeq.data && currentActiveSeq.data[r] ? (currentActiveSeq.data[r][c] || null) : null); } selData.push(row); } localAppServices.setClipboardData({ type: 'selection', sourceTrackType: currentTrackForMenu.type, data: selData, selectionRows: r2 - r1 + 1, selectionCols: c2 - c1 + 1, originalRow: r1, originalCol: c1 }); showNotification(`Selection (${r2-r1+1}x${c2-c1+1}) copied.`, 2000); } } },
                { label: `Paste Selection`, action: () => { const cb = clipboard; if (!cb || cb.type !== 'selection' || !cb.data) { showNotification("Use Copy Selection first.", 2000); return; } if (cb.sourceTrackType !== currentTrackForMenu.type) { showNotification(`Track types mismatch.`, 3000); return; } const r1 = selectionStartCell ? Math.min(selectionStartCell.row, selectionEndCell.row) : 0; const c1 = selectionStartCell ? Math.min(selectionStartCell.col, selectionEndCell.col) : 0; if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Paste Selection on ${currentTrackForMenu.name}`); const rows = cb.data.length; const cols = cb.data[0] ? cb.data[0].length : 0; for (let r = 0; r < rows; r++) { if (!currentActiveSeq.data[r + r1]) currentActiveSeq.data[r + r1] = Array(currentActiveSeq.length).fill(null); for (let c = 0; c < cols; c++) { if (cb.data[r] && cb.data[r][c]) { currentActiveSeq.data[r + r1][c + c1] = JSON.parse(JSON.stringify(cb.data[r][c])); } } } currentTrackForMenu.recreateToneSequence(true); showNotification(`Selection pasted at (${r1+1}, ${c1+1}).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } } },
                { label: `Copy Section`, action: () => { if (!selectionStartCell || !selectionEndCell) { showNotification("Drag to select a region first.", 2000); return; } const c1 = Math.min(selectionStartCell.col, selectionEndCell.col); const c2 = Math.max(selectionStartCell.col, selectionEndCell.col); const sectionData = currentTrackForMenu.copySequenceSection(c1, c2); if (sectionData) { if (localAppServices.setClipboardData) { localAppServices.setClipboardData({ type: 'section', sourceTrackType: currentTrackForMenu.type, data: sectionData, sectionLength: c2 - c1 + 1, startCol: c1 }); showNotification(`Section (${currentActiveSeq.data.length}x${c2-c1+1}) copied.`, 2000); } } else { showNotification("Failed to copy section.", 2000); } } },
                { label: `Paste Section`, action: () => { const cb = clipboard; if (!cb || cb.type !== 'section' || !cb.data) { showNotification("Use Copy Section first.", 2000); return; } if (cb.sourceTrackType !== currentTrackForMenu.type) { showNotification(`Track types mismatch.`, 3000); return; } const targetCol = cb.startCol !== undefined ? cb.startCol : 0; const result = currentTrackForMenu.pasteSequenceSection(cb.data, targetCol); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Pasted ${result} note(s) at column ${targetCol+1}.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to paste.", 2000); } } },
                { label: `Paste Full Sequence`, action: () => { if (!clipboard || clipboard.type !== 'sequence' || !clipboard.data) { showNotification("Clipboard empty.", 2000); return; } if (clipboard.sourceTrackType !== currentTrackForMenu.type) { showNotification(`Track types mismatch.`, 3000); return; } if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Paste Sequence into ${currentActiveSeq.name} on ${currentTrackForMenu.name}`); currentActiveSeq.data = JSON.parse(JSON.stringify(clipboard.data)); currentActiveSeq.length = clipboard.sequenceLength; currentTrackForMenu.recreateToneSequence(true); showNotification(`Sequence pasted into "${currentActiveSeq.name}".`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } } },
                { separator: true },
                { label: `Duplicate Sequence`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Duplicate Sequence on ${currentTrackForMenu.name}`); const newSeq = currentTrackForMenu.duplicateSequence(currentActiveSeq.id); if (newSeq) { showNotification(`Duplicated "${currentActiveSeq.name}" -> "${newSeq.name}".`, 2000); } else { showNotification("Cannot duplicate sequence.", 2000); } } },
                { label: `Rename Sequence...`, action: () => { const currentName = currentActiveSeq.name || ''; const newName = window.prompt(`Rename Sequence "${currentName}":`, currentName); if (newName !== null && newName.trim() !== '' && newName.trim() !== currentName) { currentTrackForMenu.renameSequence(currentActiveSeq.id, newName.trim()); showNotification(`Renamed to "${newName.trim()}".`, 2000); } } },
                { label: `Clear Selection`, action: () => { if (!selectionStartCell || !selectionEndCell) { showNotification("Drag to select a region first.", 2000); return; } const r1 = Math.min(selectionStartCell.row, selectionEndCell.row); const r2 = Math.max(selectionStartCell.row, selectionEndCell.row); const c1 = Math.min(selectionStartCell.col, selectionEndCell.col); const c2 = Math.max(selectionStartCell.col, selectionEndCell.col); if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Clear Selection on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); for (let r = r1; r <= r2; r++) { for (let c = c1; c <= c2; c++) { if (currentActiveSeq.data[r] && currentActiveSeq.data[r][c]) { currentActiveSeq.data[r][c] = null; } } } currentTrackForMenu.recreateToneSequence(true); showNotification(`Cleared selection (${r2-r1+2}x${c2-c1+2}).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } } },
                { label: `Invert Selection`, action: () => { if (!selectionStartCell || !selectionEndCell) { showNotification("Drag to select a region first.", 2000); return; } const r1 = Math.min(selectionStartCell.row, selectionEndCell.row); const r2 = Math.max(selectionStartCell.row, selectionEndCell.row); const c1 = Math.min(selectionStartCell.col, selectionEndCell.col); const c2 = Math.max(selectionStartCell.col, selectionEndCell.col); if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Invert Selection on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); let count = 0; for (let r = r1; r <= r2; r++) { for (let c = c1; c <= c2; c++) { if (currentActiveSeq.data[r] && currentActiveSeq.data[r][c] && currentActiveSeq.data[r][c].active) { currentActiveSeq.data[r][c] = null; count++; } else if (currentActiveSeq.data[r]) { const defaultVel = Constants.defaultVelocity || 0.7; currentActiveSeq.data[r][c] = { active: true, velocity: defaultVel }; count++; } } } currentTrackForMenu.recreateToneSequence(true); showNotification(`Inverted ${count} cell(s) in selection.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } } },
                { label: `Select All Notes`, action: () => { const seqWinId = `sequencerWin-${track.id}`; const seqWinInstance = localAppServices.getWindowById ? localAppServices.getWindowById(seqWinId) : null; if (seqWinInstance && seqWinInstance.element) { const allCells = Array.from(seqWinInstance.element.querySelectorAll('.sequencer-step-cell')); allCells.forEach(cell => cell.classList.add('selected-cell')); showNotification(`Selected all notes in "${currentActiveSeq.name}"`, 1500); } else { showNotification("Cannot select all notes.", 1500); } } },
                { label: `Deselect All Notes`, action: () => { const seqWinId = `sequencerWin-${track.id}`; const seqWinInstance = localAppServices.getWindowById ? localAppServices.getWindowById(seqWinId) : null; if (seqWinInstance && seqWinInstance.element) { const selectedCells = Array.from(seqWinInstance.element.querySelectorAll('.sequencer-step-cell.selected-cell')); selectedCells.forEach(cell => cell.classList.remove('selected-cell')); showNotification(`Deselected all notes in "${currentActiveSeq.name}"`, 1500); } else { showNotification("Cannot deselect notes.", 1500); } } },
                { label: `Sort Column Notes (Velocity Hi→Lo)`, action: () => { const result = currentTrackForMenu.sortColumnNotes('velocity-desc'); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Sorted ${result} note(s) by velocity (high to low).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No column notes to sort.", 2000); } } },
                { label: `Sort Column Notes (Velocity Lo→Hi)`, action: () => { const result = currentTrackForMenu.sortColumnNotes('velocity-asc'); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Sorted ${result} note(s) by velocity (low to high).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No column notes to sort.", 2000); } } },
                { label: `Sort Column Notes (Pitch Hi→Lo)`, action: () => { const result = currentTrackForMenu.sortColumnNotes('pitch-desc'); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Sorted ${result} note(s) by pitch (high to low).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No column notes to sort.", 2000); } } },
                { label: `Sort Column Notes (Pitch Lo→Hi)`, action: () => { const result = currentTrackForMenu.sortColumnNotes('pitch-asc'); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Sorted ${result} note(s) by pitch (low to high).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No column notes to sort.", 2000); } } },
                { separator: true },
                { label: `Stop All Audio`, action: () => { if (localAppServices.panicStopAllAudio) { localAppServices.panicStopAllAudio(); showNotification('All audio stopped.', 1000); } else { showNotification('Stop not available.', 1500); } } },
                { label: `Shift Notes Up`, action: () => { const result = currentTrackForMenu.shiftSequenceNotes(1); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Shifted ${result} note(s) up.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to shift up.", 2000); } } },
                { label: `Shift Notes Down`, action: () => { const result = currentTrackForMenu.shiftSequenceNotes(-1); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Shifted ${result} note(s) down.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to shift down.", 2000); } } },
                { label: `Shift Notes Octave Up`, action: () => { const result = currentTrackForMenu.shiftSequenceNotes(12); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Shifted ${result} note(s) up an octave.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to shift up.", 2000); } } },
                { label: `Shift Notes Octave Down`, action: () => { const result = currentTrackForMenu.shiftSequenceNotes(-12); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Shifted ${result} note(s) down an octave.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to shift down.", 2000); } } },
                { label: `Shift Notes Left`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Shift Notes Left on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); let shiftedCount = 0; for (let r = 0; r < (currentActiveSeq.data.length || 0); r++) { if (!currentActiveSeq.data[r]) continue; for (let c = 1; c < currentActiveSeq.length; c++) { if (currentActiveSeq.data[r][c] && currentActiveSeq.data[r][c].active) { if (!currentActiveSeq.data[r][c - 1]) { currentActiveSeq.data[r][c - 1] = { ...currentActiveSeq.data[r][c] }; currentActiveSeq.data[r][c] = null; shiftedCount++; } } } } if (shiftedCount > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Shifted ${shiftedCount} note(s) left.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to shift left.", 2000); } } },
                { label: `Shift Notes Right`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Shift Notes Right on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); let shiftedCount = 0; for (let r = 0; r < (currentActiveSeq.data.length || 0); r++) { if (!currentActiveSeq.data[r]) continue; for (let c = currentActiveSeq.length - 2; c >= 0; c--) { if (currentActiveSeq.data[r][c] && currentActiveSeq.data[r][c].active) { if (!currentActiveSeq.data[r][c + 1]) { currentActiveSeq.data[r][c + 1] = { ...currentActiveSeq.data[r][c] }; currentActiveSeq.data[r][c] = null; shiftedCount++; } } } } if (shiftedCount > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Shifted ${shiftedCount} note(s) right.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to shift right.", 2000); } } },
                { separator: true },
                { label: `Humanize Velocities (+/- 15%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Humanize Velocities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.humanizeVelocity(0.15); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Humanized ${result} velocity value(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to humanize.", 2000); } } },
                { label: `Humanize Velocities (+/- 25%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Humanize Velocities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.humanizeVelocity(0.25); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Humanized ${result} velocity value(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to humanize.", 2000); } } },
                { label: `Humanize Velocities (+/- 35%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Humanize Velocities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.humanizeVelocity(0.35); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Humanized ${result} velocity value(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to humanize.", 2000); } } },
                { label: `Humanize Timing (Small)`, action: () => { const result = currentTrackForMenu.humanizeTiming(2); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Humanized timing for ${result} note(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to humanize.", 2000); } } },
                { label: `Humanize Timing (Medium)`, action: () => { const result = currentTrackForMenu.humanizeTiming(4); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Humanized timing for ${result} note(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to humanize.", 2000); } } },
                { label: `Humanize Timing (Large)`, action: () => { const result = currentTrackForMenu.humanizeTiming(6); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Humanized timing for ${result} note(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to humanize.", 2000); } } },
                { label: `Humanize Probabilities (+/- 10%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Humanize Probabilities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.humanizeProbabilities(0.1); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Humanized ${result} probability value(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to humanize.", 2000); } } },
                { label: `Humanize Probabilities (+/- 20%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Humanize Probabilities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.humanizeProbabilities(0.2); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Humanized ${result} probability value(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to humanize.", 2000); } } },
                { label: `Humanize Probabilities (+/- 30%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Humanize Probabilities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.humanizeProbabilities(0.3); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Humanized ${result} probability value(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to humanize.", 2000); } } },
                { separator: true },
                { label: `Scale Velocities (50%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Scale Velocities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.scaleVelocities(0.5); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Scaled ${result} velocity value(s) to 50%.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to scale.", 2000); } } },
                { label: `Scale Velocities (75%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Scale Velocities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.scaleVelocities(0.75); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Scaled ${result} velocity value(s) to 75%.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to scale.", 2000); } } },
                { label: `Scale Velocities (100%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Scale Velocities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.scaleVelocities(1.0); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Scaled ${result} velocity value(s) to 100%.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to scale.", 2000); } } },
                { label: `Scale Velocities (125%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Scale Velocities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.scaleVelocities(1.25); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Scaled ${result} velocity value(s) to 125%.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to scale.", 2000); } } },
                { label: `Ramp Velocities (Crescendo)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ramp Velocities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.rampVelocities(0.3, 1.0); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ramped ${result} velocity value(s) with crescendo.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ramp.", 2000); } } },
                { label: `Ramp Velocities (Diminuendo)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ramp Velocities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.rampVelocities(1.0, 0.3); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ramped ${result} velocity value(s) with diminuendo.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ramp.", 2000); } } },
                { label: `Ramp Velocities (Piano to Forte)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ramp Velocities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.rampVelocities(0.2, 0.9); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ramped ${result} velocity value(s) from piano to forte.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ramp.", 2000); } } },
                { label: `Ramp Velocities (Forte to Piano)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ramp Velocities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.rampVelocities(0.9, 0.2); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ramped ${result} velocity value(s) from forte to piano.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ramp.", 2000); } } },
                { label: `Invert Velocities`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Invert Velocities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.invertVelocities(); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Inverted ${result} velocity value(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No velocities to invert.", 2000); } } },
                { label: `Invert Probabilities`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Invert Probabilities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.invertProbabilities(); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Inverted ${result} probability value(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No probabilities to invert.", 2000); } } },
                { label: `Ramp Probabilities (Sparse Start)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ramp Probabilities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.rampProbabilities(0.2, 1.0); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ramped ${result} probability value(s) from sparse to dense.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ramp.", 2000); } } },
                { label: `Ramp Probabilities (Dense Start)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ramp Probabilities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.rampProbabilities(1.0, 0.2); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ramped ${result} probability value(s) from dense to sparse.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ramp.", 2000); } } },
                { label: `Ramp Probabilities (Escalate)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ramp Probabilities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.rampProbabilities(0.3, 0.9); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ramped ${result} probability value(s) with escalating effect.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ramp.", 2000); } } },
                { label: `Ramp Probabilities (De-escalate)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ramp Probabilities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.rampProbabilities(0.9, 0.3); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ramped ${result} probability value(s) with de-escalating effect.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ramp.", 2000); } } },
                { label: `Scale Probabilities (25%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Scale Probabilities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.scaleProbabilities(0.25); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Scaled ${result} probability value(s) to 25%.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to scale.", 2000); } } },
                { label: `Scale Probabilities (50%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Scale Probabilities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.scaleProbabilities(0.5); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Scaled ${result} probability value(s) to 50%.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to scale.", 2000); } } },
                { label: `Scale Probabilities (75%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Scale Probabilities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.scaleProbabilities(0.75); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Scaled ${result} probability value(s) to 75%.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to scale.", 2000); } } },
                { label: `Scale Probabilities (100%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Scale Probabilities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.scaleProbabilities(1.0); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Scaled ${result} probability value(s) to 100%.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to scale.", 2000); } } },
                { label: `Scale Probabilities (125%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Scale Probabilities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.scaleProbabilities(1.25); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Scaled ${result} probability value(s) to 125%.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to scale.", 2000); } } },
                { label: `Scale Probabilities (150%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Scale Probabilities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.scaleProbabilities(1.5); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Scaled ${result} probability value(s) to 150%.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to scale.", 2000); } } },
                { label: `Scale Probabilities (200%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Scale Probabilities on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.scaleProbabilities(2.0); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Scaled ${result} probability value(s) to 200%.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to scale.", 2000); } } },
                { separator: true },
                { label: `Ricochet Notes (Small ±1)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ricochet Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.ricochetNotes(1, 0.0, 0.95); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Bounced ${result} note(s) (small ±1).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to bounce.", 2000); } } },
                { label: `Ricochet Notes (Medium ±4)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ricochet Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.ricochetNotes(4, 0.0, 0.9); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Bounced ${result} note(s) (medium ±4).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to bounce.", 2000); } } },
                { label: `Ricochet Notes (Large ±8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ricochet Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.ricochetNotes(8, 0.0, 0.85); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Bounced ${result} note(s) (large ±8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to bounce.", 2000); } } },
                { label: `Ricochet Notes (Subtle ±2, 30% skip)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ricochet Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.ricochetNotes(2, 0.3, 0.95); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Bounced ${result} note(s) (subtle ±2, 30% skip).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to bounce.", 2000); } } },
                { label: `Ricochet Notes (Wild ±6, 10% skip)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ricochet Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.ricochetNotes(6, 0.1, 0.8); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Bounced ${result} note(s) (wild ±6, 10% skip).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to bounce.", 2000); } } },
                { label: `Shuffle Notes (Tight ±1)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Shuffle Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.shuffleNotes(1, 0.0, 1.0); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Shuffled ${result} note(s) (tight ±1).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to shuffle.", 2000); } } },
                { label: `Shuffle Notes (Medium ±2)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Shuffle Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.shuffleNotes(2, 0.0, 1.0); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Shuffled ${result} note(s) (medium ±2).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to shuffle.", 2000); } } },
                { label: `Shuffle Notes (Wide ±4)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Shuffle Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.shuffleNotes(4, 0.0, 1.0); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Shuffled ${result} note(s) (wide ±4).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to shuffle.", 2000); } } },
                { label: `Shuffle Notes (Loose ±8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Shuffle Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.shuffleNotes(8, 0.0, 1.0); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Shuffled ${result} note(s) (loose ±8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to shuffle.", 2000); } } },
                { label: `Shuffle Notes (±3, 25% skip)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Shuffle Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.shuffleNotes(3, 0.25, 0.95); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Shuffled ${result} note(s) (±3, 25% skip).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to shuffle.", 2000); } } },
                { separator: true },
                { label: `Accent Notes (Downbeats)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Accent Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.accentNotes(0.95, 4, 'downbeats', null); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Accented ${result} note(s) on downbeats.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to accent.", 2000); } } },
                { label: `Accent Notes (Onbeats)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Accent Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.accentNotes(0.95, 4, 'onbeats', null); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Accented ${result} note(s) on onbeats.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to accent.", 2000); } } },
                { label: `Accent Notes (Offbeats)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Accent Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.accentNotes(0.95, 4, 'offbeats', null); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Accented ${result} note(s) on offbeats.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to accent.", 2000); } } },
                { label: `Accent Notes (Eighths)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Accent Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.accentNotes(0.95, 4, 'eighths', null); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Accented ${result} note(s) on eighths.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to accent.", 2000); } } },
                { label: `Accent Notes (All)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Accent Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.accentNotes(0.95, 4, 'every-step', null); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Accented ${result} note(s) (all).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to accent.", 2000); } } },
                { separator: true },
                { label: `Ghost Notes (Light)`, action: () => { const result = currentTrackForMenu.ghostNotes(0.6, true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ghosted ${result} note(s) with light effect.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ghost.", 2000); } } },
                { label: `Ghost Notes (Medium)`, action: () => { const result = currentTrackForMenu.ghostNotes(0.3, true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ghosted ${result} note(s) with medium effect.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ghost.", 2000); } } },
                { label: `Ghost Notes (Heavy)`, action: () => { const result = currentTrackForMenu.ghostNotes(0.15, true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ghosted ${result} note(s) with heavy effect.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ghost.", 2000); } } },
                { label: `Ghost Notes - Even Cols (Light)`, action: () => { const result = currentTrackForMenu.ghostNotes(0.6, false); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ghosted ${result} note(s) with light effect.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ghost.", 2000); } } },
                { label: `Ghost Notes - Even Cols (Medium)`, action: () => { const result = currentTrackForMenu.ghostNotes(0.3, false); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ghosted ${result} note(s) with medium effect.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ghost.", 2000); } } },
                { label: `Ghost Notes - Even Cols (Heavy)`, action: () => { const result = currentTrackForMenu.ghostNotes(0.15, false); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ghosted ${result} note(s) with heavy effect.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ghost.", 2000); } } },
                { separator: true },
                { label: `Quantize to 1/16`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Quantize to 1/16 on ${currentTrackForMenu.name}`); const result = currentTrackForMenu.quantizeSequence(16); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Quantized ${result} note(s) to 1/16.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to quantize.", 2000); } } },
                { label: `Quantize to 1/8`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Quantize to 1/8 on ${currentTrackForMenu.name}`); const result = currentTrackForMenu.quantizeSequence(8); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Quantized ${result} note(s) to 1/8.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to quantize.", 2000); } } },
                { label: `Quantize to 1/4`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Quantize to 1/4 on ${currentTrackForMenu.name}`); const result = currentTrackForMenu.quantizeSequence(4); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Quantized ${result} note(s) to 1/4.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to quantize.", 2000); } } },
                { label: `Reverse Sequence`, action: () => { const result = currentTrackForMenu.reverseSequence(); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Reversed ${result} note(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to reverse.", 2000); } } },
                { label: `Flip Sequence`, action: () => { const result = currentTrackForMenu.flipSequence(); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Flipped ${result} note(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to flip.", 2000); } } },
                { label: `Invert Sequence`, action: () => { const result = currentTrackForMenu.invertSequence(); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Inverted ${result} note(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to invert.", 2000); } } },
                { label: `Randomize Sequence (25%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Randomize Sequence on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.randomizeSequence(0.25); currentTrackForMenu.recreateToneSequence(true); showNotification(`Randomized ${result} note(s) at 25% density.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } },
                { label: `Randomize Sequence (50%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Randomize Sequence on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.randomizeSequence(0.5); currentTrackForMenu.recreateToneSequence(true); showNotification(`Randomized ${result} note(s) at 50% density.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } },
                { label: `Randomize Sequence (75%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Randomize Sequence on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.randomizeSequence(0.75); currentTrackForMenu.recreateToneSequence(true); showNotification(`Randomized ${result} note(s) at 75% density.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } },
                { label: `Euclidean Rhythm (E3,8)`, action: () => { const result = currentTrackForMenu.euclideanRhythm(3, 8); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Euclidean rhythm (E3,8) placed ${result} note(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No active sequence for Euclidean rhythm.", 2000); } } },
                { label: `Euclidean Rhythm (E4,16)`, action: () => { const result = currentTrackForMenu.euclideanRhythm(4, 16); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Euclidean rhythm (E4,16) placed ${result} note(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No active sequence for Euclidean rhythm.", 2000); } } },
                { label: `Euclidean Rhythm (E5,8)`, action: () => { const result = currentTrackForMenu.euclideanRhythm(5, 8); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Euclidean rhythm (E5,8) placed ${result} note(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No active sequence for Euclidean rhythm.", 2000); } } },
                { label: `Euclidean Rhythm (E7,12)`, action: () => { const result = currentTrackForMenu.euclideanRhythm(7, 12); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Euclidean rhythm (E7,12) placed ${result} note(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No active sequence for Euclidean rhythm.", 2000); } } },
                { label: `Stutter Notes (2x)`, action: () => { const result = currentTrackForMenu.stutterNotes(2, 1.0); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Stuttered ${result} note(s) at 2x.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to stutter.", 2000); } } },
                { label: `Stutter Notes (3x)`, action: () => { const result = currentTrackForMenu.stutterNotes(3, 0.85); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Stuttered ${result} note(s) at 3x.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to stutter.", 2000); } } },
                { label: `Stutter Notes (4x)`, action: () => { const result = currentTrackForMenu.stutterNotes(4, 0.7); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Stuttered ${result} note(s) at 4x.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to stutter.", 2000); } } },
                { label: `Stutter Notes (6x)`, action: () => { const result = currentTrackForMenu.stutterNotes(6, 0.6); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Stuttered ${result} note(s) at 6x.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to stutter.", 2000); } } },
                { label: `Stutter Notes (8x)`, action: () => { const result = currentTrackForMenu.stutterNotes(8, 0.5); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Stuttered ${result} note(s) at 8x.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to stutter.", 2000); } } },
                { label: `Arpeggiate Notes (Up, 2x)`, action: () => { const result = currentTrackForMenu.arpeggiateNotes(80, 2, 0.85, 'up', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Arpeggiated ${result} note(s) (up, 2 cycles).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to arpeggiate.", 2000); } } },
                { label: `Arpeggiate Notes (Up, 4x)`, action: () => { const result = currentTrackForMenu.arpeggiateNotes(80, 4, 0.85, 'up', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Arpeggiated ${result} note(s) (up, 4 cycles).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to arpeggiate.", 2000); } } },
                { label: `Arpeggiate Notes (Up, 8x)`, action: () => { const result = currentTrackForMenu.arpeggiateNotes(80, 8, 0.85, 'up', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Arpeggiated ${result} note(s) (up, 8 cycles).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to arpeggiate.", 2000); } } },
                { label: `Arpeggiate Notes (Down, 4x)`, action: () => { const result = currentTrackForMenu.arpeggiateNotes(80, 4, 0.85, 'down', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Arpeggiated ${result} note(s) (down, 4 cycles).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to arpeggiate.", 2000); } } },
                { label: `Arpeggiate Notes (Random, 4x)`, action: () => { const result = currentTrackForMenu.arpeggiateNotes(80, 4, 0.85, 'random', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Arpeggiated ${result} note(s) (random, 4 cycles).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to arpeggiate.", 2000); } } },
                { label: `Arpeggiate Notes (Slow 200ms, 4x)`, action: () => { const result = currentTrackForMenu.arpeggiateNotes(200, 4, 0.85, 'up', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Arpeggiated ${result} note(s) (slow 200ms, 4 cycles).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to arpeggiate.", 2000); } } },
                { label: `Burst Notes (2x, Flat)`, action: () => { const result = currentTrackForMenu.burstNotes(2, 'flat', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Burst ${result} note(s) at 2x (flat).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to burst.", 2000); } } },
                { label: `Burst Notes (4x, Flat)`, action: () => { const result = currentTrackForMenu.burstNotes(4, 'flat', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Burst ${result} note(s) at 4x (flat).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to burst.", 2000); } } },
                { label: `Burst Notes (8x, Flat)`, action: () => { const result = currentTrackForMenu.burstNotes(8, 'flat', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Burst ${result} note(s) at 8x (flat).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to burst.", 2000); } } },
                { label: `Burst Notes (4x, Decay)`, action: () => { const result = currentTrackForMenu.burstNotes(4, 'decay', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Burst ${result} note(s) at 4x (decay).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to burst.", 2000); } } },
                { label: `Burst Notes (4x, Attack)`, action: () => { const result = currentTrackForMenu.burstNotes(4, 'attack', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Burst ${result} note(s) at 4x (attack).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to burst.", 2000); } } },
                { label: `Burst Notes (4x, Pyramid)`, action: () => { const result = currentTrackForMenu.burstNotes(4, 'pyramid', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Burst ${result} note(s) at 4x (pyramid).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to burst.", 2000); } } },
                { label: `Chord Harmonize (Major, Closed)`, action: () => { const result = currentTrackForMenu.harmonizeNotes(0.7, 'closed', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Harmonized ${result} note(s) with major (closed) chord.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to harmonize.", 2000); } } },
                { label: `Chord Harmonize (Minor, Closed)`, action: () => { const result = currentTrackForMenu.harmonizeNotes(0.7, 'closed', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Harmonized ${result} note(s) with minor (closed) chord.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to harmonize.", 2000); } } },
                { label: `Chord Harmonize (Major7, Closed)`, action: () => { const result = currentTrackForMenu.harmonizeNotes(0.7, 'closed', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Harmonized ${result} note(s) with major7 (closed) chord.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to harmonize.", 2000); } } },
                { label: `Chord Harmonize (Minor7, Closed)`, action: () => { const result = currentTrackForMenu.harmonizeNotes(0.7, 'closed', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Harmonized ${result} note(s) with minor7 (closed) chord.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to harmonize.", 2000); } } },
                { label: `Chord Harmonize (Dominant7, Closed)`, action: () => { const result = currentTrackForMenu.harmonizeNotes(0.7, 'closed', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Harmonized ${result} note(s) with dominant7 (closed) chord.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to harmonize.", 2000); } } },
                { label: `Chord Harmonize (Major, Wide)`, action: () => { const result = currentTrackForMenu.harmonizeNotes(0.7, 'wide', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Harmonized ${result} note(s) with major (wide) chord.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to harmonize.", 2000); } } },
                { separator: true },
                { label: `Echo Notes (3x, 1 step)`, action: () => { const result = currentTrackForMenu.echoNotes(3, 1, 0.6, true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Echoed ${result} note(s) (3x @ 1 step, decay 0.6).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to echo.", 2000); } } },
                { label: `Echo Notes (4x, 2 steps)`, action: () => { const result = currentTrackForMenu.echoNotes(4, 2, 0.6, true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Echoed ${result} note(s) (4x @ 2 steps, decay 0.6).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to echo.", 2000); } } },
                { label: `Echo Notes (6x, 2 steps)`, action: () => { const result = currentTrackForMenu.echoNotes(6, 2, 0.6, true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Echoed ${result} note(s) (6x @ 2 steps, decay 0.6).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to echo.", 2000); } } },
                { label: `Echo Notes (4x, 4 steps)`, action: () => { const result = currentTrackForMenu.echoNotes(4, 4, 0.7, true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Echoed ${result} note(s) (4x @ 4 steps, decay 0.7).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to echo.", 2000); } } },
                { label: `Echo Notes (Slapback)`, action: () => { const result = currentTrackForMenu.echoNotes(2, 1, 0.5, true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Echoed ${result} note(s) (slapback 2x @ 1 step, decay 0.5).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to echo.", 2000); } } },
                { label: `Echo Notes (Long Trail)`, action: () => { const result = currentTrackForMenu.echoNotes(8, 4, 0.8, true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Echoed ${result} note(s) (long trail 8x @ 4 steps, decay 0.8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to echo.", 2000); } } },
                { separator: true },
                { label: `Thin Out Notes (25%)`, action: () => { const result = currentTrackForMenu.thinOutNotes(0.25); currentTrackForMenu.recreateToneSequence(true); showNotification(`Removed ${result} note(s) at 25% probability.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } },
                { label: `Thin Out Notes (50%)`, action: () => { const result = currentTrackForMenu.thinOutNotes(0.5); currentTrackForMenu.recreateToneSequence(true); showNotification(`Removed ${result} note(s) at 50% probability.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } },
                { label: `Thin Out Notes (75%)`, action: () => { const result = currentTrackForMenu.thinOutNotes(0.75); currentTrackForMenu.recreateToneSequence(true); showNotification(`Removed ${result} note(s) at 75% probability.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } },
                { label: `Fill Gaps (25%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Fill Gaps on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.fillGaps(0.25); currentTrackForMenu.recreateToneSequence(true); showNotification(`Filled ${result} note(s) at 25% probability.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } },
                { label: `Fill Gaps (50%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Fill Gaps on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.fillGaps(0.5); currentTrackForMenu.recreateToneSequence(true); showNotification(`Filled ${result} note(s) at 50% probability.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } },
                { label: `Fill Gaps (100%)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Fill Gaps on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.fillGaps(1.0); currentTrackForMenu.recreateToneSequence(true); showNotification(`Filled ${result} note(s) at 100% probability.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } },
                { label: `Prune Redundancy (Keep First 4)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Prune Redundancy on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.pruneRedundancy(4, 'remove-all-but-first'); currentTrackForMenu.recreateToneSequence(true); showNotification(`Pruned ${result} note(s), keeping first 4 repeats.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } },
                { label: `Prune Redundancy (Thin Out)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Prune Redundancy on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.pruneRedundancy(4, 'thin-out'); currentTrackForMenu.recreateToneSequence(true); showNotification(`Pruned ${result} note(s) by thinning repeats.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } },
                { label: `Prune Redundancy (Decrement Velocity)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Prune Redundancy on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.pruneRedundancy(4, 'decrement-velocity'); currentTrackForMenu.recreateToneSequence(true); showNotification(`Pruned ${result} note(s) by decrementing velocity.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } },
                { separator: true },
                { label: `Strum Notes (Small)`, action: () => { const result = currentTrackForMenu.strumNotes(1); currentTrackForMenu.recreateToneSequence(true); showNotification(`Strummed ${result} note(s) with small offset.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } },
                { label: `Strum Notes (Medium)`, action: () => { const result = currentTrackForMenu.strumNotes(2); currentTrackForMenu.recreateToneSequence(true); showNotification(`Strummed ${result} note(s) with medium offset.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } },
                { label: `Strum Notes (Large)`, action: () => { const result = currentTrackForMenu.strumNotes(3); currentTrackForMenu.recreateToneSequence(true); showNotification(`Strummed ${result} note(s) with large offset.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } },
                { label: `Stagger Notes (Up)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Stagger Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.staggerNotes(2, 0.95, 'up', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Staggered ${result} note(s) (up).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to stagger.", 2000); } } },
                { label: `Stagger Notes (Down)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Stagger Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.staggerNotes(2, 0.95, 'down', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Staggered ${result} note(s) (down).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to stagger.", 2000); } } },
                { label: `Stagger Notes (Outward)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Stagger Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.staggerNotes(2, 0.95, 'outward', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Staggered ${result} note(s) (outward).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to stagger.", 2000); } } },
                { label: `Stagger Notes (Inward)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Stagger Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.staggerNotes(2, 0.95, 'inward', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Staggered ${result} note(s) (inward).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to stagger.", 2000); } } },
                { label: `Crescent Notes (Arc)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Crescent Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.crescentNotes(2, 2, 0.85, 'arc', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Crescented ${result} note(s) (arc).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to crescent.", 2000); } } },
                { label: `Crescent Notes (Ascend)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Crescent Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.crescentNotes(2, 2, 0.85, 'ascend', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Crescented ${result} note(s) (ascend).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to crescent.", 2000); } } },
                { label: `Crescent Notes (Descend)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Crescent Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.crescentNotes(2, 2, 0.85, 'descend', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Crescented ${result} note(s) (descend).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to crescent.", 2000); } } },
                { label: `Crescent Notes (Wide Arc)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Crescent Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.crescentNotes(4, 4, 0.7, 'arc', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Crescented ${result} note(s) (wide arc).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to crescent.", 2000); } } },
                { label: `Crescent Notes (Subtle)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Crescent Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.crescentNotes(2, 1, 0.95, 'arc', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Crescented ${result} note(s) (subtle).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to crescent.", 2000); } } },
                { separator: true },
                { label: `Trill Notes (Up, 2-semi, 4 taps)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Trill Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.trillNotes(4, 2, 0.95, 'up', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Trilled ${result} note(s) (up, 4 taps @ 2-semi).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to trill (only Synth/InstrumentSampler tracks support trill).", 2000); } } },
                { label: `Trill Notes (Down, 2-semi, 4 taps)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Trill Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.trillNotes(4, 2, 0.95, 'down', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Trilled ${result} note(s) (down, 4 taps @ 2-semi).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to trill (only Synth/InstrumentSampler tracks support trill).", 2000); } } },
                { label: `Trill Notes (Both, 2-semi, 6 taps)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Trill Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.trillNotes(6, 2, 0.95, 'both', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Trilled ${result} note(s) (both, 6 taps @ 2-semi).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to trill (only Synth/InstrumentSampler tracks support trill).", 2000); } } },
                { label: `Trill Notes (Up, Half-step, 8 taps)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Trill Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.trillNotes(8, 1, 0.95, 'up', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Trilled ${result} note(s) (up, 8 taps @ 1-semi).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to trill (only Synth/InstrumentSampler tracks support trill).", 2000); } } },
                { label: `Trill Notes (Both, 4-semi, 10 taps)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Trill Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.trillNotes(10, 4, 0.9, 'both', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Trilled ${result} note(s) (both, 10 taps @ 4-semi).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to trill (only Synth/InstrumentSampler tracks support trill).", 2000); } } },
                { label: `Trill Notes (Up, Octave, 4 taps)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Trill Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.trillNotes(4, 12, 0.95, 'up', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Trilled ${result} note(s) (up, 4 taps @ 12-semi).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to trill (only Synth/InstrumentSampler tracks support trill).", 2000); } } },
                { separator: true },
                { label: `Drift Notes (Linear Up ±4)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Drift Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.driftNotes(4, 0.0, 0.95, 'linear-up', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Drifted ${result} note(s) (linear-up, max ±4).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to drift.", 2000); } } },
                { label: `Drift Notes (Linear Down ±4)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Drift Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.driftNotes(4, 0.0, 0.95, 'linear-down', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Drifted ${result} note(s) (linear-down, max ±4).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to drift.", 2000); } } },
                { label: `Drift Notes (Linear Center ±4)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Drift Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.driftNotes(4, 0.0, 0.95, 'linear-center', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Drifted ${result} note(s) (linear-center, max ±4).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to drift.", 2000); } } },
                { label: `Drift Notes (Random Per-Note ±4)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Drift Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.driftNotes(4, 0.0, 0.95, 'random-per-note', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Drifted ${result} note(s) (random-per-note, max ±4).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to drift.", 2000); } } },
                { label: `Drift Notes (Mirror ±4)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Drift Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.driftNotes(4, 0.0, 0.95, 'mirror', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Drifted ${result} note(s) (mirror, max ±4).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to drift.", 2000); } } },
                { label: `Drift Notes (Linear Up ±8, 30% skip)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Drift Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.driftNotes(8, 0.3, 0.9, 'linear-up', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Drifted ${result} note(s) (linear-up ±8, 30% skip).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to drift.", 2000); } } },
                { separator: true },
                { label: `Cascade Notes (Down 4, 0 delay)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cascade Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cascadeNotes(4, 0, 0.75, 'down', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cascaded ${result} note(s) (down 4 steps, 0 delay).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cascade.", 2000); } } },
                { label: `Cascade Notes (Down 4, 1/8 delay)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cascade Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cascadeNotes(4, 2, 0.75, 'down', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cascaded ${result} note(s) (down 4 steps, 1/8 delay).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cascade.", 2000); } } },
                { label: `Cascade Notes (Up 4, 1/8 delay)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cascade Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cascadeNotes(4, 2, 0.75, 'up', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cascaded ${result} note(s) (up 4 steps, 1/8 delay).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cascade.", 2000); } } },
                { label: `Cascade Notes (Long 8, 1/4 delay)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cascade Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cascadeNotes(8, 4, 0.85, 'down', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cascaded ${result} note(s) (down 8 steps, 1/4 delay).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cascade.", 2000); } } },
                { label: `Cascade Notes (Subtle 2, slow decay)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cascade Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cascadeNotes(2, 4, 0.95, 'down', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cascaded ${result} note(s) (down 2 steps, slow decay).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cascade.", 2000); } } },
                { label: `Spiral Notes (CW, 4 nodes)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Spiral Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.spiralNotes(4, 1, 1, 0.88, 'cw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Spiraled ${result} note(s) (cw, 4 nodes).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to spiral.", 2000); } } },
                { label: `Spiral Notes (CW, 8 nodes)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Spiral Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.spiralNotes(8, 1, 1, 0.85, 'cw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Spiraled ${result} note(s) (cw, 8 nodes).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to spiral.", 2000); } } },
                { label: `Spiral Notes (CW, 8 wide)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Spiral Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.spiralNotes(8, 2, 1, 0.85, 'cw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Spiraled ${result} note(s) (cw, 8 wide).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to spiral.", 2000); } } },
                { label: `Spiral Notes (CCW, 8 nodes)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Spiral Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.spiralNotes(8, 1, 1, 0.85, 'ccw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Spiraled ${result} note(s) (ccw, 8 nodes).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to spiral.", 2000); } } },
                { label: `Spiral Notes (Column-only, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Spiral Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.spiralNotes(8, 0, 1, 0.85, 'cw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Spiraled ${result} note(s) (column-only, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to spiral.", 2000); } } },
                { label: `Radial Notes (Out, 4 spokes)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Radial Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.radialNotes(4, 3, 1, 0.85, 'out', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Radialed ${result} note(s) (out, 4 spokes).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to radial.", 2000); } } },
                { label: `Radial Notes (Out, 8 spokes)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Radial Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.radialNotes(8, 3, 1, 0.85, 'out', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Radialed ${result} note(s) (out, 8 spokes).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to radial.", 2000); } } },
                { label: `Radial Notes (Out, 16 spokes)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Radial Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.radialNotes(16, 4, 1, 0.9, 'out', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Radialed ${result} note(s) (out, 16 spokes).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to radial.", 2000); } } },
                { label: `Radial Notes (In, 8 spokes)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Radial Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.radialNotes(8, 3, 1, 0.85, 'in', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Radialed ${result} note(s) (in, 8 spokes).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to radial.", 2000); } } },
                { label: `Radial Notes (Column-only, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Radial Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.radialNotes(8, 0, 1, 0.85, 'out', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Radialed ${result} note(s) (column-only, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to radial.", 2000); } } },
                { label: `Ripple Notes (Square, 4 rings)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ripple Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.rippleNotes(4, 1, 1, 0.8, 'square', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Rippled ${result} note(s) (square, 4 rings).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ripple.", 2000); } } },
                { label: `Ripple Notes (Square, 6 rings, spaced)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ripple Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.rippleNotes(6, 2, 1, 0.85, 'square', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Rippled ${result} note(s) (square, 6 rings spaced).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ripple.", 2000); } } },
                { label: `Ripple Notes (Cross, 4 rings)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ripple Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.rippleNotes(4, 1, 1, 0.8, 'cross', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Rippled ${result} note(s) (cross, 4 rings).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ripple.", 2000); } } },
                { label: `Ripple Notes (Diagonal, 4 rings)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ripple Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.rippleNotes(4, 1, 1, 0.8, 'diagonal', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Rippled ${result} note(s) (diagonal, 4 rings).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ripple.", 2000); } } },
                { label: `Ripple Notes (Column-only, 4)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ripple Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.rippleNotes(4, 1, 0, 0.8, 'cross', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Rippled ${result} note(s) (column-only, 4).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ripple.", 2000); } } },
                { label: `Glider Notes (Forward, 6)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Glider Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.gliderNotes(6, 1, 1, 0.88, 'forward', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Glided ${result} note(s) (forward, 6).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to glide.", 2000); } } },
                { label: `Glider Notes (Backward, 6)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Glider Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.gliderNotes(6, 1, 1, 0.88, 'backward', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Glided ${result} note(s) (backward, 6).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to glide.", 2000); } } },
                { label: `Glider Notes (V, 6)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Glider Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.gliderNotes(6, 1, 1, 0.88, 'v', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Glided ${result} note(s) (V, 6).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to glide.", 2000); } } },
                { label: `Glider Notes (Inverted V, 6)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Glider Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.gliderNotes(6, 1, 1, 0.88, 'inv-v', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Glided ${result} note(s) (inv-v, 6).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to glide.", 2000); } } },
                { label: `Glider Notes (X, 4)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Glider Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.gliderNotes(4, 1, 1, 0.88, 'x', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Glided ${result} note(s) (X, 4).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to glide.", 2000); } } },
                { label: `Glider Notes (Zigzag, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Glider Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.gliderNotes(8, 1, 1, 0.92, 'zigzag', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Glided ${result} note(s) (zigzag, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to glide.", 2000); } } },
                { label: `Splatter Notes (Uniform, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Splatter Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.splatterNotes(8, 3, 4, 0.25, 'uniform', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Splattered ${result} note(s) (uniform, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to splatter.", 2000); } } },
                { label: `Splatter Notes (Gaussian, 12)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Splatter Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.splatterNotes(12, 4, 4, 0.2, 'gaussian', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Splattered ${result} note(s) (gaussian, 12).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to splatter.", 2000); } } },
                { label: `Splatter Notes (Shell, 16)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Splatter Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.splatterNotes(16, 6, 6, 0.3, 'shell', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Splattered ${result} note(s) (shell, 16).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to splatter.", 2000); } } },
                { label: `Splatter Notes (Top-heavy, 10)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Splatter Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.splatterNotes(10, 4, 4, 0.25, 'weighted-top', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Splattered ${result} note(s) (top-heavy, 10).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to splatter.", 2000); } } },
                { label: `Splatter Notes (Bottom-heavy, 10)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Splatter Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.splatterNotes(10, 4, 4, 0.25, 'weighted-bottom', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Splattered ${result} note(s) (bottom-heavy, 10).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to splatter.", 2000); } } },
                { label: `Fan Notes (Down, 4)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Fan Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.fanNotes(4, 3, 1, 0.95, 'down', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Fanned ${result} note(s) (down, 4).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to fan.", 2000); } } },
                { label: `Fan Notes (Up, 4)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Fan Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.fanNotes(4, 3, 1, 0.95, 'up', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Fanned ${result} note(s) (up, 4).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to fan.", 2000); } } },
                { label: `Fan Notes (Inward, 4)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Fan Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.fanNotes(4, 3, 1, 0.95, 'inward', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Fanned ${result} note(s) (inward, 4).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to fan.", 2000); } } },
                { label: `Fan Notes (Outward, 4)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Fan Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.fanNotes(4, 3, 1, 0.95, 'outward', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Fanned ${result} note(s) (outward, 4).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to fan.", 2000); } } },
                { label: `Fan Notes (Random, 6)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Fan Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.fanNotes(6, 5, 1, 0.92, 'random', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Fanned ${result} note(s) (random, 6).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to fan.", 2000); } } },
                { label: `Mosaic Notes (Solid 3x3)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Mosaic Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.mosaicNotes(3, 3, 1, 1, 0.85, 'solid', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Mosaicked ${result} note(s) (solid 3x3).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to mosaic.", 2000); } } },
                { label: `Mosaic Notes (Checker 4x4)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Mosaic Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.mosaicNotes(4, 4, 1, 1, 0.9, 'checker', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Mosaicked ${result} note(s) (checker 4x4).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to mosaic.", 2000); } } },
                { label: `Mosaic Notes (Brick 4x4)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Mosaic Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.mosaicNotes(4, 4, 1, 1, 0.9, 'brick', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Mosaicked ${result} note(s) (brick 4x4).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to mosaic.", 2000); } } },
                { label: `Mosaic Notes (Diamond 5x5)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Mosaic Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.mosaicNotes(5, 5, 1, 1, 0.85, 'diamond', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Mosaicked ${result} note(s) (diamond 5x5).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to mosaic.", 2000); } } },
                { label: `Mosaic Notes (Cross 5x5)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Mosaic Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.mosaicNotes(5, 5, 1, 1, 0.85, 'cross', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Mosaicked ${result} note(s) (cross 5x5).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to mosaic.", 2000); } } },
                { label: `Mosaic Notes (Ring 5x5)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Mosaic Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.mosaicNotes(5, 5, 1, 1, 0.85, 'ring', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Mosaicked ${result} note(s) (ring 5x5).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to mosaic.", 2000); } } },
                { label: `Wave Notes (Sine, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Wave Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.waveNotes(8, 3, 1, 0, 0.9, 'sine', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Waved ${result} note(s) (sine, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to wave.", 2000); } } },
                { label: `Wave Notes (Cosine, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Wave Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.waveNotes(8, 3, 1, 0, 0.9, 'cosine', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Waved ${result} note(s) (cosine, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to wave.", 2000); } } },
                { label: `Wave Notes (Triangle, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Wave Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.waveNotes(8, 3, 1, 0, 0.9, 'triangle', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Waved ${result} note(s) (triangle, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to wave.", 2000); } } },
                { label: `Wave Notes (Sawtooth, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Wave Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.waveNotes(8, 3, 1, 0, 0.9, 'sawtooth', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Waved ${result} note(s) (sawtooth, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to wave.", 2000); } } },
                { label: `Wave Notes (Square, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Wave Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.waveNotes(8, 3, 1, 0, 0.9, 'square', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Waved ${result} note(s) (square, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to wave.", 2000); } } },
                { label: `Wave Notes (Sine 2-cycle, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Wave Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.waveNotes(8, 3, 2, 0, 0.9, 'sine', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Waved ${result} note(s) (sine 2-cycle, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to wave.", 2000); } } },
                { label: `Ricochet Notes (Both, 12)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ricochet Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.ricochetNotes(12, 2, 1, 0.85, 0, 0.97, 'both', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ricocheted ${result} note(s) (both, 12).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ricochet.", 2000); } } },
                { label: `Ricochet Notes (Row-only, 10)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ricochet Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.ricochetNotes(10, 3, 0, 0.9, 0, 0.96, 'row-only', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ricocheted ${result} note(s) (row-only, 10).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ricochet.", 2000); } } },
                { label: `Ricochet Notes (Col-only, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ricochet Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.ricochetNotes(8, 0, 2, 0.8, 0, 0.95, 'col-only', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ricocheted ${result} note(s) (col-only, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ricochet.", 2000); } } },
                { label: `Ricochet Notes (Gravity, 16)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ricochet Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.ricochetNotes(16, -1, 1, 0.7, 1, 0.95, 'both', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ricocheted ${result} note(s) (gravity, 16).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ricochet.", 2000); } } },
                { label: `Ricochet Notes (High-bounce, 12)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Ricochet Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.ricochetNotes(12, 2, 1, 1.0, 0, 1.0, 'both', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Ricocheted ${result} note(s) (high-bounce, 12).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to ricochet.", 2000); } } },
                { label: `Phyllotaxis Notes (Sunflower, 16)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Phyllotaxis Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.phyllotaxisNotes(16, 2, 137, 1, 0.95, 'cw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Phyllotaxised ${result} note(s) (sunflower, 16).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to phyllotaxis.", 2000); } } },
                { label: `Phyllotaxis Notes (Pinecone, 24)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Phyllotaxis Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.phyllotaxisNotes(24, 3, 137, 1, 0.92, 'cw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Phyllotaxised ${result} note(s) (pinecone, 24).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to phyllotaxis.", 2000); } } },
                { label: `Phyllotaxis Notes (Tight Spiral, 12)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Phyllotaxis Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.phyllotaxisNotes(12, 1, 90, 1, 0.94, 'cw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Phyllotaxised ${result} note(s) (tight spiral, 12).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to phyllotaxis.", 2000); } } },
                { label: `Phyllotaxis Notes (Wide Spiral, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Phyllotaxis Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.phyllotaxisNotes(32, 4, 137, 1, 0.96, 'cw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Phyllotaxised ${result} note(s) (wide spiral, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to phyllotaxis.", 2000); } } },
                { label: `Phyllotaxis Notes (CCW Sunflower, 16)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Phyllotaxis Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.phyllotaxisNotes(16, 2, 137, 1, 0.95, 'ccw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Phyllotaxised ${result} note(s) (ccw sunflower, 16).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to phyllotaxis.", 2000); } } },
                { label: `Stair Notes (Up, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Stair Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.stairNotes(8, 1, 1, 0.9, 'up', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Staired ${result} note(s) (up, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to stair.", 2000); } } },
                { label: `Stair Notes (Down, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Stair Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.stairNotes(8, 1, 1, 0.9, 'down', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Staired ${result} note(s) (down, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to stair.", 2000); } } },
                { label: `Stair Notes (Up-Down, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Stair Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.stairNotes(8, 1, 1, 0.9, 'up-down', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Staired ${result} note(s) (up-down, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to stair.", 2000); } } },
                { label: `Stair Notes (Down-Up, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Stair Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.stairNotes(8, 1, 1, 0.9, 'down-up', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Staired ${result} note(s) (down-up, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to stair.", 2000); } } },
                { label: `Stair Notes (Random, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Stair Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.stairNotes(8, 1, 1, 0.9, 'random', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Staired ${result} note(s) (random, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to stair.", 2000); } } },
                { label: `Stair Notes (Steep Up, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Stair Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.stairNotes(8, 2, 1, 0.9, 'up', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Staired ${result} note(s) (steep up, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to stair.", 2000); } } },

                { label: `Bezier Notes (Arc, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Bezier Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.bezierNotes(8, 3, 0.9, 'arc', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Beziered ${result} note(s) (arc, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to bezier.", 2000); } } },
                { label: `Bezier Notes (S-Curve, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Bezier Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.bezierNotes(8, 3, 0.9, 's-curve', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Beziered ${result} note(s) (s-curve, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to bezier.", 2000); } } },
                { label: `Bezier Notes (Loop, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Bezier Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.bezierNotes(8, 3, 0.9, 'loop', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Beziered ${result} note(s) (loop, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to bezier.", 2000); } } },
                { label: `Bezier Notes (Wave, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Bezier Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.bezierNotes(8, 3, 0.9, 'wave', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Beziered ${result} note(s) (wave, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to bezier.", 2000); } } },
                { label: `Bezier Notes (Linear, 8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Bezier Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.bezierNotes(8, 3, 0.9, 'linear', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Beziered ${result} note(s) (linear, 8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to bezier.", 2000); } } },

                { label: `Lissajous Notes (Circle, 24)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Lissajous Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.lissajousNotes(24, 3, Math.PI / 2, 0.94, 'circle', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Lissajoussed ${result} note(s) (circle, 24).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to lissajous.", 2000); } } },
                { label: `Lissajous Notes (Figure-8, 24)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Lissajous Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.lissajousNotes(24, 3, Math.PI / 2, 0.94, 'figure-8', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Lissajoussed ${result} note(s) (figure-8, 24).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to lissajous.", 2000); } } },
                { label: `Lissajous Notes (Three-Lobe, 24)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Lissajous Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.lissajousNotes(24, 3, Math.PI / 2, 0.94, 'three-lobe', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Lissajoussed ${result} note(s) (three-lobe, 24).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to lissajous.", 2000); } } },
                { label: `Lissajous Notes (Rosette 3:4, 24)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Lissajous Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.lissajousNotes(24, 3, Math.PI / 2, 0.94, 'rosette-34', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Lissajoussed ${result} note(s) (rosette-34, 24).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to lissajous.", 2000); } } },
                { label: `Lissajous Notes (Rosette 3:5, 24)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Lissajous Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.lissajousNotes(24, 3, Math.PI / 2, 0.94, 'rosette-35', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Lissajoussed ${result} note(s) (rosette-35, 24).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to lissajous.", 2000); } } },
                { label: `Lissajous Notes (Rosette 4:5, 24)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Lissajous Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.lissajousNotes(24, 3, Math.PI / 2, 0.94, 'rosette-45', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Lissajoussed ${result} note(s) (rosette-45, 24).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to lissajous.", 2000); } } },

                { label: `Euclidean Notes (E(3,8) Tresillo)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Euclidean Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.euclideanNotes(3, 8, 0, 0, 1.0, 'forward', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Euclidean'd ${result} note(s) (E(3,8) tresillo).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to euclidean.", 2000); } } },
                { label: `Euclidean Notes (E(5,8) Cinquillo)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Euclidean Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.euclideanNotes(5, 8, 0, 0, 1.0, 'forward', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Euclidean'd ${result} note(s) (E(5,8) cinquillo).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to euclidean.", 2000); } } },
                { label: `Euclidean Notes (E(5,16) Cuban)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Euclidean Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.euclideanNotes(5, 16, 0, 0, 1.0, 'forward', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Euclidean'd ${result} note(s) (E(5,16) cuban).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to euclidean.", 2000); } } },
                { label: `Euclidean Notes (E(7,12) +octave)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Euclidean Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.euclideanNotes(7, 12, -2, 0, 1.0, 'forward', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Euclidean'd ${result} note(s) (E(7,12) -2 oct).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to euclidean.", 2000); } } },
                { label: `Euclidean Notes (E(3,8) Reverse)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Euclidean Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.euclideanNotes(3, 8, 0, 0, 1.0, 'reverse', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Euclidean'd ${result} note(s) (E(3,8) reverse).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to euclidean.", 2000); } } },
                { label: `Euclidean Notes (E(5,8) Pendulum)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Euclidean Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.euclideanNotes(5, 8, 0, 0, 1.0, 'pendulum', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Euclidean'd ${result} note(s) (E(5,8) pendulum).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to euclidean.", 2000); } } },

                { label: `Hypotrochoid Notes (Rose, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Hypotrochoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.hypotrochoidNotes(32, 5, 3, 5, 0.95, 'rose', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Hypotrochoid'd ${result} note(s) (rose, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to hypotrochoid.", 2000); } } },
                { label: `Hypotrochoid Notes (Star, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Hypotrochoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.hypotrochoidNotes(32, 7, 3, 5, 0.95, 'star', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Hypotrochoid'd ${result} note(s) (star, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to hypotrochoid.", 2000); } } },
                { label: `Hypotrochoid Notes (Astroid, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Hypotrochoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.hypotrochoidNotes(32, 4, 1, 4, 0.95, 'astroid', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Hypotrochoid'd ${result} note(s) (astroid, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to hypotrochoid.", 2000); } } },
                { label: `Hypotrochoid Notes (Trefoil, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Hypotrochoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.hypotrochoidNotes(32, 3, 1, 3, 0.95, 'trefoil', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Hypotrochoid'd ${result} note(s) (trefoil, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to hypotrochoid.", 2000); } } },
                { label: `Hypotrochoid Notes (Cardioid, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Hypotrochoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.hypotrochoidNotes(32, 2, 1, 2, 0.95, 'cardioid', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Hypotrochoid'd ${result} note(s) (cardioid, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to hypotrochoid.", 2000); } } },
                { label: `Hilbert Notes (Order 2, Forward, 4x4)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Hilbert Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.hilbertNotes(2, 4, 4, 0.95, 'forward', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Hilbert'd ${result} note(s) (order 2, forward, 4x4).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to hilbert.", 2000); } } },
                { label: `Hilbert Notes (Order 3, Reverse, 8x8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Hilbert Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.hilbertNotes(3, 8, 8, 0.95, 'reverse', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Hilbert'd ${result} note(s) (order 3, reverse, 8x8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to hilbert.", 2000); } } },
                { label: `Hilbert Notes (Order 4, Inverse, 16x16)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Hilbert Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.hilbertNotes(4, 16, 16, 0.95, 'inverse', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Hilbert'd ${result} note(s) (order 4, inverse, 16x16).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to hilbert.", 2000); } } },
                { label: `Hilbert Notes (Order 5, Transpose, 32x32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Hilbert Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.hilbertNotes(5, 32, 32, 0.95, 'transpose', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Hilbert'd ${result} note(s) (order 5, transpose, 32x32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to hilbert.", 2000); } } },
                { label: `Tractrix Notes (Standard, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Tractrix Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.tractrixNotes(32, 4, 3, 0.95, 'standard', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Tractrix'd ${result} note(s) (standard, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to tractrix.", 2000); } } },
                { label: `Tractrix Notes (Forward, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Tractrix Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.tractrixNotes(32, 4, 3, 0.95, 'forward', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Tractrix'd ${result} note(s) (forward, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to tractrix.", 2000); } } },
                { label: `Tractrix Notes (Backward, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Tractrix Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.tractrixNotes(32, 4, 3, 0.95, 'backward', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Tractrix'd ${result} note(s) (backward, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to tractrix.", 2000); } } },
                { label: `Tractrix Notes (Tight, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Tractrix Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.tractrixNotes(32, 4, 3, 0.95, 'tight', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Tractrix'd ${result} note(s) (tight, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to tractrix.", 2000); } } },
                { label: `Catenary Notes (Standard, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Catenary Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.catenaryNotes(32, 2, 4, 0.95, 'standard', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Catenary'd ${result} note(s) (standard, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to catenary.", 2000); } } },
                { label: `Catenary Notes (Arch, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Catenary Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.catenaryNotes(32, 2, 4, 0.95, 'arch', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Catenary'd ${result} note(s) (arch, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to catenary.", 2000); } } },
                { label: `Catenary Notes (Half, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Catenary Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.catenaryNotes(32, 2, 4, 0.95, 'half', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Catenary'd ${result} note(s) (half, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to catenary.", 2000); } } },
                { label: `Catenary Notes (Tight, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Catenary Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.catenaryNotes(32, 2, 4, 0.95, 'tight', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Catenary'd ${result} note(s) (tight, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to catenary.", 2000); } } },
                { label: `Sierpinski Notes (Depth 1, Classic, 8x8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Sierpinski Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.sierpinskiNotes(1, 8, 8, 0.95, 'classic', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Sierpinski'd ${result} note(s) (depth 1, classic, 8x8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to sierpinski.", 2000); } } },
                { label: `Sierpinski Notes (Depth 2, Inverted, 8x8)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Sierpinski Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.sierpinskiNotes(2, 8, 8, 0.95, 'inverted', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Sierpinski'd ${result} note(s) (depth 2, inverted, 8x8).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to sierpinski.", 2000); } } },
                { label: `Sierpinski Notes (Depth 3, Left, 16x16)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Sierpinski Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.sierpinskiNotes(3, 16, 16, 0.95, 'left', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Sierpinski'd ${result} note(s) (depth 3, left, 16x16).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to sierpinski.", 2000); } } },
                { label: `Sierpinski Notes (Depth 4, Right, 16x16)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Sierpinski Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.sierpinskiNotes(4, 16, 16, 0.95, 'right', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Sierpinski'd ${result} note(s) (depth 4, right, 16x16).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to sierpinski.", 2000); } } },
                { label: `Clothoid Notes (Standard, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Clothoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.clothoidNotes(32, 3, 0.95, 'standard', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Clothoid'd ${result} note(s) (standard, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to clothoid.", 2000); } } },
                { label: `Clothoid Notes (Forward, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Clothoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.clothoidNotes(32, 3, 0.95, 'forward', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Clothoid'd ${result} note(s) (forward, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to clothoid.", 2000); } } },
                { label: `Clothoid Notes (Backward, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Clothoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.clothoidNotes(32, 3, 0.95, 'backward', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Clothoid'd ${result} note(s) (backward, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to clothoid.", 2000); } } },
                { label: `Clothoid Notes (Tight, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Clothoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.clothoidNotes(32, 3, 0.95, 'tight', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Clothoid'd ${result} note(s) (tight, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to clothoid.", 2000); } } },
                { label: `Archimedean Notes (CW, 3 turns, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Archimedean Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.archimedeanNotes(32, 3, 1, 0.5, 0.95, 'cw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Archimedean'd ${result} note(s) (cw, 3 turns, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to archimedean.", 2000); } } },
                { label: `Archimedean Notes (CW, 5 turns, 48)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Archimedean Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.archimedeanNotes(48, 5, 1, 0.4, 0.95, 'cw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Archimedean'd ${result} note(s) (cw, 5 turns, 48).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to archimedean.", 2000); } } },
                { label: `Archimedean Notes (CCW, 2 turns, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Archimedean Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.archimedeanNotes(32, 2, 1, 0.6, 0.95, 'ccw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Archimedean'd ${result} note(s) (ccw, 2 turns, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to archimedean.", 2000); } } },
                { label: `Archimedean Notes (CW, 4 turns, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Archimedean Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.archimedeanNotes(32, 4, 2, 1.0, 0.95, 'cw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Archimedean'd ${result} note(s) (cw, 4 turns, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to archimedean.", 2000); } } },
                { label: `Logarithmic Notes (CW, 3 turns, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Logarithmic Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.logarithmicNotes(32, 3, 1, 0.15, 0.95, 'cw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Logarithmic'd ${result} note(s) (cw, 3 turns, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to logarithmic.", 2000); } } },
                { label: `Logarithmic Notes (CW, 4 turns, 48)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Logarithmic Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.logarithmicNotes(48, 4, 1, 0.12, 0.95, 'cw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Logarithmic'd ${result} note(s) (cw, 4 turns, 48).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to logarithmic.", 2000); } } },
                { label: `Logarithmic Notes (CCW, 3 turns, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Logarithmic Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.logarithmicNotes(32, 3, 1, 0.2, 0.95, 'ccw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Logarithmic'd ${result} note(s) (ccw, 3 turns, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to logarithmic.", 2000); } } },
                { label: `Logarithmic Notes (CW, 5 turns, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Logarithmic Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.logarithmicNotes(32, 5, 1, 0.08, 0.95, 'cw', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Logarithmic'd ${result} note(s) (cw, 5 turns, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to logarithmic.", 2000); } } },

                { label: `Superellipse Notes (Rounded, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Superellipse Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.superellipseNotes(32, 4, 4, 2.5, 0.95, 'rounded', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Superellipsed ${result} note(s) (rounded, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to superellipse.", 2000); } } },
                { label: `Superellipse Notes (Ellipse, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Superellipse Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.superellipseNotes(32, 4, 4, 2.0, 0.95, 'ellipse', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Superellipsed ${result} note(s) (ellipse, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to superellipse.", 2000); } } },
                { label: `Superellipse Notes (Diamond, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Superellipse Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.superellipseNotes(32, 4, 4, 1.0, 0.95, 'diamond', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Superellipsed ${result} note(s) (diamond, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to superellipse.", 2000); } } },
                { label: `Superellipse Notes (Square, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Superellipse Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.superellipseNotes(32, 4, 4, 8.0, 0.95, 'square', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Superellipsed ${result} note(s) (square, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to superellipse.", 2000); } } },

                { label: `Cardioid Notes (Up, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cardioid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cardioidNotes(32, 4, 0.95, 'up', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cardioid'd ${result} note(s) (up, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cardioid.", 2000); } } },
                { label: `Cardioid Notes (Down, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cardioid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cardioidNotes(32, 4, 0.95, 'down', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cardioid'd ${result} note(s) (down, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cardioid.", 2000); } } },
                { label: `Cardioid Notes (Left, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cardioid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cardioidNotes(32, 4, 0.95, 'left', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cardioid'd ${result} note(s) (left, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cardioid.", 2000); } } },
                { label: `Cardioid Notes (Right, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cardioid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cardioidNotes(32, 4, 0.95, 'right', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cardioid'd ${result} note(s) (right, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cardioid.", 2000); } } },

                { label: `Epicycloid Notes (Cardioid, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Epicycloid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.epicycloidNotes(32, 3, 1, 3, 0.95, 'cardioid', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Epicycloid'd ${result} note(s) (cardioid, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to epicycloid.", 2000); } } },
                { label: `Epicycloid Notes (Nephroid, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Epicycloid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.epicycloidNotes(32, 4, 1, 4, 0.95, 'nephroid', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Epicycloid'd ${result} note(s) (nephroid, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to epicycloid.", 2000); } } },
                { label: `Epicycloid Notes (3-Cusp, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Epicycloid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.epicycloidNotes(32, 6, 1, 6, 0.95, '3-cusp', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Epicycloid'd ${result} note(s) (3-cusp, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to epicycloid.", 2000); } } },
                { label: `Epicycloid Notes (4-Cusp, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Epicycloid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.epicycloidNotes(32, 6, 1, 6, 0.95, '4-cusp', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Epicycloid'd ${result} note(s) (4-cusp, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to epicycloid.", 2000); } } },
                { label: `Epicycloid Notes (5-Cusp, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Epicycloid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.epicycloidNotes(32, 8, 1, 8, 0.95, '5-cusp', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Epicycloid'd ${result} note(s) (5-cusp, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to epicycloid.", 2000); } } },
                { label: `Epicycloid Notes (6-Cusp, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Epicycloid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.epicycloidNotes(32, 10, 1, 10, 0.95, '6-cusp', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Epicycloid'd ${result} note(s) (6-cusp, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to epicycloid.", 2000); } } },
                { label: `Cycloid Notes (Standard, 2 arches)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cycloid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cycloidNotes(32, 3, 3, 2, 0.95, 'standard', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cycloid'd ${result} note(s) (standard, 2 arches).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cycloid.", 2000); } } },
                { label: `Cycloid Notes (Prolate, 2 arches)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cycloid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cycloidNotes(32, 3, 3, 2, 0.95, 'prolate', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cycloid'd ${result} note(s) (prolate, 2 arches).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cycloid.", 2000); } } },
                { label: `Cycloid Notes (Curtate, 3 arches)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cycloid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cycloidNotes(32, 4, 2, 3, 0.95, 'curtate', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cycloid'd ${result} note(s) (curtate, 3 arches).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cycloid.", 2000); } } },
                { label: `Cycloid Notes (Trochoid Custom, 2 arches)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cycloid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cycloidNotes(32, 3, 5, 2, 0.95, 'trochoid-custom', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cycloid'd ${result} note(s) (trochoid custom, 2 arches).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cycloid.", 2000); } } },
                { label: `Involute Notes (Standard, 1 turn)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Involute Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.involuteNotes(32, 3, 1, 0.95, 'standard', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Involuted ${result} note(s) (standard, 1 turn).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to involute.", 2000); } } },
                { label: `Involute Notes (Half, 1 turn)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Involute Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.involuteNotes(32, 3, 1, 0.95, 'half', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Involuted ${result} note(s) (half, 1 turn).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to involute.", 2000); } } },
                { label: `Involute Notes (Two-Arm, 1 turn)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Involute Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.involuteNotes(32, 3, 1, 0.95, 'two-arm', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Involuted ${result} note(s) (two-arm, 1 turn).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to involute.", 2000); } } },
                { label: `Involute Notes (Reverse, 2 turns)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Involute Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.involuteNotes(32, 3, 2, 0.95, 'reverse', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Involuted ${result} note(s) (reverse, 2 turns).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to involute.", 2000); } } },
                { label: `Lemniscate Notes (Horizontal, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Lemniscate Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.lemniscateNotes(32, 4, 0.95, 'horizontal', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Lemniscated ${result} note(s) (horizontal, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to lemniscate.", 2000); } } },
                { label: `Lemniscate Notes (Vertical, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Lemniscate Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.lemniscateNotes(32, 4, 0.95, 'vertical', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Lemniscated ${result} note(s) (vertical, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to lemniscate.", 2000); } } },
                { label: `Lemniscate Notes (Right Lobe, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Lemniscate Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.lemniscateNotes(32, 4, 0.95, 'right-lobe', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Lemniscated ${result} note(s) (right lobe, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to lemniscate.", 2000); } } },
                { label: `Lemniscate Notes (Left Lobe, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Lemniscate Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.lemniscateNotes(32, 4, 0.95, 'left-lobe', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Lemniscated ${result} note(s) (left lobe, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to lemniscate.", 2000); } } },
                { label: `Rose Notes (Standard, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Rose Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.roseNotes(32, 4, 0.95, 'standard', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Rosed ${result} note(s) (standard, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to rose.", 2000); } } },
                { label: `Rose Notes (Double, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Rose Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.roseNotes(32, 4, 0.95, 'double', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Rosed ${result} note(s) (double, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to rose.", 2000); } } },
                { label: `Rose Notes (Half, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Rose Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.roseNotes(32, 4, 0.95, 'half', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Rosed ${result} note(s) (half, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to rose.", 2000); } } },
                { label: `Rose Notes (Quarter, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Rose Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.roseNotes(32, 4, 0.95, 'quarter', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Rosed ${result} note(s) (quarter, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to rose.", 2000); } } },
                { label: `Cassini Notes (Oval, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cassini Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cassiniNotes(32, 3, 4, 0.95, 'oval', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cassini'd ${result} note(s) (oval, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cassini.", 2000); } } },
                { label: `Cassini Notes (Lemniscate, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cassini Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cassiniNotes(32, 3, 3, 0.95, 'lemniscate', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cassini'd ${result} note(s) (lemniscate, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cassini.", 2000); } } },
                { label: `Cassini Notes (Peanut, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cassini Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cassiniNotes(32, 4, 3, 0.95, 'peanut', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cassini'd ${result} note(s) (peanut, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cassini.", 2000); } } },
                { label: `Cassini Notes (Double, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cassini Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cassiniNotes(32, 3, 2, 0.95, 'double', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cassini'd ${result} note(s) (double, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cassini.", 2000); } } },
                { label: `Limaçon Notes (Convex, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Limaçon Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.limaçonNotes(32, 3, 1, 0.95, 'convex', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Limaçon'd ${result} note(s) (convex, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to limaçon.", 2000); } } },
                { label: `Limaçon Notes (Cardioid, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Limaçon Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.limaçonNotes(32, 3, 3, 0.95, 'cardioid', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Limaçon'd ${result} note(s) (cardioid, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to limaçon.", 2000); } } },
                { label: `Limaçon Notes (Dimpled, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Limaçon Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.limaçonNotes(32, 3, 5, 0.95, 'dimpled', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Limaçon'd ${result} note(s) (dimpled, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to limaçon.", 2000); } } },
                { label: `Limaçon Notes (Cuspid, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Limaçon Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.limaçonNotes(32, 3, 6, 0.95, 'cuspid', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Limaçon'd ${result} note(s) (cuspid, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to limaçon.", 2000); } } },
                { label: `Limaçon Notes (Looped, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Limaçon Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.limaçonNotes(32, 3, 9, 0.95, 'looped', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Limaçon'd ${result} note(s) (looped, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to limaçon.", 2000); } } },

                { label: `Conchoid Notes (Standard, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Conchoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.conchoidNotes(32, 3, 1, 0.95, 'standard', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Conchoid'd ${result} note(s) (standard, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to conchoid.", 2000); } } },
                { label: `Conchoid Notes (Cuspidal, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Conchoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.conchoidNotes(32, 3, 3, 0.95, 'cuspidal', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Conchoid'd ${result} note(s) (cuspidal, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to conchoid.", 2000); } } },
                { label: `Conchoid Notes (Looped, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Conchoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.conchoidNotes(32, 3, 6, 0.95, 'looped', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Conchoid'd ${result} note(s) (looped, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to conchoid.", 2000); } } },
                { label: `Conchoid Notes (Asymptotic, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Conchoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.conchoidNotes(32, 8, 1, 0.95, 'asymptotic', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Conchoid'd ${result} note(s) (node, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to conchoid.", 2000); } } },
                { label: `Strophoid Notes (Standard, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Strophoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.strophoidNotes(32, 3, 0.95, 'standard', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Strophoid'd ${result} note(s) (standard, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to strophoid.", 2000); } } },
                { label: `Strophoid Notes (Right, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Strophoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.strophoidNotes(32, 3, 0.95, 'right', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Strophoid'd ${result} note(s) (right, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to strophoid.", 2000); } } },
                { label: `Strophoid Notes (Left, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Strophoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.strophoidNotes(32, 3, 0.95, 'left', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Strophoid'd ${result} note(s) (left, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to strophoid.", 2000); } } },
                { label: `Strophoid Notes (Node, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Strophoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.strophoidNotes(32, 4, 0.95, 'node', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Strophoid'd ${result} note(s) (node, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to strophoid.", 2000); } } },
                { label: `Witch of Agnesi Notes (Standard, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Witch Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.witchNotes(32, 4, 0.95, 'standard', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Witched ${result} note(s) (standard, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to witch.", 2000); } } },
                { label: `Witch of Agnesi Notes (Inverted, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Witch Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.witchNotes(32, 4, 0.95, 'inverted', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Witched ${result} note(s) (inverted, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to witch.", 2000); } } },
                { label: `Witch of Agnesi Notes (Upper, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Witch Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.witchNotes(32, 4, 0.95, 'upper', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Witched ${result} note(s) (upper, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to witch.", 2000); } } },
                { label: `Witch of Agnesi Notes (Right, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Witch Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.witchNotes(32, 4, 0.95, 'right', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Witched ${result} note(s) (right, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to witch.", 2000); } } },
                { label: `Folium of Descartes Notes (Standard, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Folium Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.foliumNotes(32, 4, 0.95, 'standard', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Folium'd ${result} note(s) (standard, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to folium.", 2000); } } },
                { label: `Folium of Descartes Notes (Inverted, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Folium Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.foliumNotes(32, 4, 0.95, 'inverted', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Folium'd ${result} note(s) (inverted, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to folium.", 2000); } } },
                { label: `Folium of Descartes Notes (Right, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Folium Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.foliumNotes(32, 4, 0.95, 'right', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Folium'd ${result} note(s) (right, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to folium.", 2000); } } },
                { label: `Folium of Descartes Notes (Tight, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Folium Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.foliumNotes(32, 4, 0.95, 'tight', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Folium'd ${result} note(s) (tight, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to folium.", 2000); } } },
                { label: `Kampyle of Eudoxus Notes (Standard, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Kampyle Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.kampyleNotes(32, 2, 0.95, 'standard', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Kampyle'd ${result} note(s) (standard, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to kampyle.", 2000); } } },
                { label: `Kampyle of Eudoxus Notes (Inverted, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Kampyle Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.kampyleNotes(32, 2, 0.95, 'inverted', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Kampyle'd ${result} note(s) (inverted, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to kampyle.", 2000); } } },
                { label: `Kampyle of Eudoxus Notes (Right, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Kampyle Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.kampyleNotes(32, 2, 0.95, 'right', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Kampyle'd ${result} note(s) (right, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to kampyle.", 2000); } } },
                { label: `Kampyle of Eudoxus Notes (Upper, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Kampyle Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.kampyleNotes(32, 2, 0.95, 'upper', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Kampyle'd ${result} note(s) (upper, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to kampyle.", 2000); } } },
                { label: `Bicorn Notes (Standard, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Bicorn Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.bicornNotes(32, 4, 0.95, 'standard', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Bicorn'd ${result} note(s) (standard, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to bicorn.", 2000); } } },
                { label: `Bicorn Notes (Inverted, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Bicorn Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.bicornNotes(32, 4, 0.95, 'inverted', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Bicorn'd ${result} note(s) (inverted, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to bicorn.", 2000); } } },
                { label: `Bicorn Notes (Hat, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Bicorn Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.bicornNotes(32, 4, 0.95, 'hat', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Bicorn'd ${result} note(s) (hat, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to bicorn.", 2000); } } },
                { label: `Bicorn Notes (Tight, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Bicorn Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.bicornNotes(32, 4, 0.95, 'tight', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Bicorn'd ${result} note(s) (tight, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to bicorn.", 2000); } } },
                { label: `Trisectrix Notes (Standard, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Trisectrix Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.trisectrixNotes(32, 4, 0.95, 'standard', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Trisectrix'd ${result} note(s) (standard, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to trisectrix.", 2000); } } },
                { label: `Trisectrix Notes (Inverted, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Trisectrix Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.trisectrixNotes(32, 4, 0.95, 'inverted', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Trisectrix'd ${result} note(s) (inverted, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to trisectrix.", 2000); } } },
                { label: `Trisectrix Notes (Outer, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Trisectrix Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.trisectrixNotes(32, 4, 0.95, 'outer', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Trisectrix'd ${result} note(s) (outer, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to trisectrix.", 2000); } } },
                { label: `Trisectrix Notes (Tight, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Trisectrix Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.trisectrixNotes(32, 4, 0.95, 'tight', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Trisectrix'd ${result} note(s) (tight, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to trisectrix.", 2000); } } },
                { label: `Cissoid of Diocles Notes (Standard, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cissoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cissoidNotes(32, 4, 0.95, 'standard', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cissoid'd ${result} note(s) (standard, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cissoid.", 2000); } } },
                { label: `Cissoid of Diocles Notes (Inverted, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cissoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cissoidNotes(32, 4, 0.95, 'inverted', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cissoid'd ${result} note(s) (inverted, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cissoid.", 2000); } } },
                { label: `Cissoid of Diocles Notes (Upper, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cissoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cissoidNotes(32, 4, 0.95, 'upper', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cissoid'd ${result} note(s) (upper, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cissoid.", 2000); } } },
                { label: `Cissoid of Diocles Notes (Tight, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Cissoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.cissoidNotes(32, 4, 0.95, 'tight', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Cissoid'd ${result} note(s) (tight, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to cissoid.", 2000); } } },
                { label: `Nephroid Notes (Standard, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Nephroid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.nephroidNotes(32, 4, 0.95, 'standard', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Nephroid'd ${result} note(s) (standard, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to nephroid.", 2000); } } },
                { label: `Nephroid Notes (Inverted, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Nephroid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.nephroidNotes(32, 4, 0.95, 'inverted', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Nephroid'd ${result} note(s) (inverted, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to nephroid.", 2000); } } },
                { label: `Nephroid Notes (Upper, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Nephroid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.nephroidNotes(32, 4, 0.95, 'upper', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Nephroid'd ${result} note(s) (upper, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to nephroid.", 2000); } } },
                { label: `Nephroid Notes (Tight, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Nephroid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.nephroidNotes(32, 4, 0.95, 'tight', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Nephroid'd ${result} note(s) (tight, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to nephroid.", 2000); } } },
                { label: `Astroid Notes (Standard, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Astroid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.astroidNotes(32, 4, 0.95, 'standard', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Astroid'd ${result} note(s) (standard, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to astroid.", 2000); } } },
                { label: `Astroid Notes (Inverted, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Astroid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.astroidNotes(32, 4, 0.95, 'inverted', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Astroid'd ${result} note(s) (inverted, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to astroid.", 2000); } } },
                { label: `Astroid Notes (Upper, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Astroid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.astroidNotes(32, 4, 0.95, 'upper', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Astroid'd ${result} note(s) (upper, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to astroid.", 2000); } } },
                { label: `Astroid Notes (Tight, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Astroid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.astroidNotes(32, 4, 0.95, 'tight', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Astroid'd ${result} note(s) (tight, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to astroid.", 2000); } } },
                { label: `Deltoid Notes (Standard, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Deltoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.deltoidNotes(32, 4, 0.95, 'standard', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Deltoid'd ${result} note(s) (standard, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to deltoid.", 2000); } } },
                { label: `Deltoid Notes (Inverted, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Deltoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.deltoidNotes(32, 4, 0.95, 'inverted', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Deltoid'd ${result} note(s) (inverted, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to deltoid.", 2000); } } },
                { label: `Deltoid Notes (Upper, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Deltoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.deltoidNotes(32, 4, 0.95, 'upper', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Deltoid'd ${result} note(s) (upper, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to deltoid.", 2000); } } },
                { label: `Deltoid Notes (Tight, 32)`, action: () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Deltoid Notes on ${currentTrackForMenu.name} (${currentActiveSeq.name})`); const result = currentTrackForMenu.deltoidNotes(32, 4, 0.95, 'tight', true); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Deltoid'd ${result} note(s) (tight, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to deltoid.", 2000); } } },




                { separator: true },
                { label: `Legato Connect (Small)`, action: () => { const result = currentTrackForMenu.connectLegato(2); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Connected ${result} note pair(s) with small gap.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to connect.", 2000); } } },
                { label: `Legato Connect (Medium)`, action: () => { const result = currentTrackForMenu.connectLegato(4); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Connected ${result} note pair(s) with medium gap.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to connect.", 2000); } } },
                { label: `Legato Connect (Large)`, action: () => { const result = currentTrackForMenu.connectLegato(8); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Connected ${result} note pair(s) with large gap.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to connect.", 2000); } } },
                { label: `Rotate Sequence (Left)`, action: () => { const result = currentTrackForMenu.rotateSequence(-1); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Rotated ${result} note(s) left.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to rotate.", 2000); } } },
                { label: `Rotate Sequence (Right)`, action: () => { const result = currentTrackForMenu.rotateSequence(1); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Rotated ${result} note(s) right.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to rotate.", 2000); } } },
                { label: `Double Durations`, action: () => { const result = currentTrackForMenu.doubleDurations(2); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Extended ${result} note(s) to double length.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to extend.", 2000); } } },
                { label: `Shorten Durations`, action: () => { const result = currentTrackForMenu.shortenDurations(2); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Shortened ${result} note(s) to half length.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to shorten.", 2000); } } },
                { label: `Scale Durations (50%)`, action: () => { const result = currentTrackForMenu.scaleDurations(0.5); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Scaled ${result} note(s) to 50% duration.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to scale.", 2000); } } },
                { label: `Scale Durations (75%)`, action: () => { const result = currentTrackForMenu.scaleDurations(0.75); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Scaled ${result} note(s) to 75% duration.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to scale.", 2000); } } },
                { label: `Scale Durations (100%)`, action: () => { const result = currentTrackForMenu.scaleDurations(1.0); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Scaled ${result} note(s) to 100% duration.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to scale.", 2000); } } },
                { label: `Scale Durations (125%)`, action: () => { const result = currentTrackForMenu.scaleDurations(1.25); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Scaled ${result} note(s) to 125% duration.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to scale.", 2000); } } },
                { label: `Scale Durations (150%)`, action: () => { const result = currentTrackForMenu.scaleDurations(1.5); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Scaled ${result} note(s) to 150% duration.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No notes to scale.", 2000); } } },
                { separator: true },
                { label: `Clear Sequence`, action: () => {
                    showConfirmationDialog(`Clear Sequence "${currentActiveSeq.name}" for ${currentTrackForMenu.name}?`, "This will clear all notes. This can be undone.", () => {
                        const result = currentTrackForMenu.clearSequence();
                        currentTrackForMenu.recreateToneSequence(true);
                        showNotification(`Cleared ${result} note(s).`, 2000);
                        if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                    });
                } },
                { label: `Trim Silence`, action: () => { const result = currentTrackForMenu.trimSequenceEdges(); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Trimmed ${result} empty column(s).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No silence to trim.", 2000); } } },
                { label: `Snap to Scale`, action: () => { const result = currentTrackForMenu.snapNotesToScale(); if (result > 0) { currentTrackForMenu.recreateToneSequence(true); showNotification(`Snapped ${result} note(s) to scale.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); } else { showNotification("No off-scale notes to snap.", 2000); } } },
                { separator: true },
                { label: `Set Length...`, action: () => { const currentBars = Math.round(currentActiveSeq.length / Constants.STEPS_PER_BAR); const newBars = window.prompt(`Set sequence length (in bars):`, String(currentBars)); if (newBars === null) return; const bars = parseInt(newBars, 10); if (isNaN(bars) || bars < 1) { showNotification("Invalid bar count.", 2000); return; } const maxBars = Constants.MAX_BARS || 16; if (bars > maxBars) { showNotification(`Max ${maxBars} bars.`, 2000); return; } const newLengthInSteps = bars * Constants.STEPS_PER_BAR; currentTrackForMenu.setSequenceLength(newLengthInSteps); showNotification(`Sequence length set to ${bars} bar(s).`, 2000); } },
                { label: `Double Length of "${currentActiveSeq.name}"`, action: () => { const currentNumBars = currentActiveSeq.length / Constants.STEPS_PER_BAR; if (currentNumBars * 2 > (Constants.MAX_BARS || 16)) { showNotification(`Exceeds max of ${Constants.MAX_BARS || 16} bars.`, 3000); return; } currentTrackForMenu.doubleSequence(); showNotification(`Sequence length doubled for "${currentActiveSeq.name}".`, 2000); } } },
                { label: `Halve Length of "${currentActiveSeq.name}"`, action: () => { const currentNumBars = currentActiveSeq.length / Constants.STEPS_PER_BAR; if (currentNumBars <= 1) { showNotification(`Cannot halve: minimum is 1 bar.`, 3000); return; } currentTrackForMenu.halveSequence(); showNotification(`Sequence length halved for "${currentActiveSeq.name}".`, 2000); } }
            ];
            createContextMenu(event, menuItems, localAppServices);
        };
        if (grid) grid.addEventListener('contextmenu', sequencerContextMenuHandler);

        // Handle bars input change
        const barsInput = sequencerWindow.element.querySelector(`#seqLengthInput-${track.id}`);
        if (barsInput) {
            barsInput.addEventListener('change', (e) => {
                const newNumBars = parseInt(e.target.value, 10);
                if (!Number.isFinite(newNumBars) || newNumBars < 1 || newNumBars > (Constants.MAX_BARS || 16)) {
                    showNotification(`Invalid number of bars. Must be 1-${Constants.MAX_BARS || 16}.`, 3000);
                    return;
                }
                const newLength = newNumBars * Constants.STEPS_PER_BAR;
                if (newLength === activeSequence.length) return; // No change
                
                if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Change sequence length to ${newNumBars} bars`);
                
                // Resize the sequence data
                const numRows = activeSequence.data ? activeSequence.data.length : (rows || 1);
                const newData = [];
                for (let r = 0; r < numRows; r++) {
                    newData[r] = [];
                    for (let c = 0; c < newLength; c++) {
                        if (activeSequence.data && activeSequence.data[r] && activeSequence.data[r][c]) {
                            newData[r][c] = activeSequence.data[r][c];
                        } else {
                            newData[r][c] = null;
                        }
                    }
                }
                activeSequence.data = newData;
                activeSequence.length = newLength;
                
                // Recreate the Tone sequence
                track.recreateToneSequence(true);
                
                // Re-render the sequencer window
                openTrackSequencerWindow(trackId, true);
                showNotification(`Sequence length changed to ${newNumBars} bars.`, 2000);
            });
        }

        // Handle snap-to-grid toggle button
        const snapBtn = sequencerWindow.element.querySelector(`#seqSnapToggle-${track.id}`);
        if (snapBtn) {
            snapBtn.addEventListener('click', () => {
                const currentSnap = window.SEQUENCER_SNAP_VALUE || 16;
                // Cycle: 16 -> 8 -> 4 -> 0 -> 16
                let nextSnap = 16;
                if (currentSnap === 16) nextSnap = 8;
                else if (currentSnap === 8) nextSnap = 4;
                else if (currentSnap === 4) nextSnap = 0;
                else if (currentSnap === 0) nextSnap = 16;
                window.SEQUENCER_SNAP_VALUE = nextSnap;
                const snapLabel = nextSnap === 0 ? 'Off' : (nextSnap === 4 ? '1/4' : (nextSnap === 8 ? '1/8' : '1/16'));
                snapBtn.textContent = `Snap: ${snapLabel}`;
                showNotification(`Snap set to ${snapLabel}`, 1500);
            });
        }

        // Handle view toggle button (step view <-> piano roll view)
        const viewToggleBtn = sequencerWindow.element.querySelector(`#seqViewToggle-${track.id}`);
        if (viewToggleBtn) {
            viewToggleBtn.addEventListener('click', () => {
                sequencerViewMode = sequencerViewMode === 'step' ? 'piano' : 'step';
                // Update button label to show the mode we're switching TO
                viewToggleBtn.textContent = sequencerViewMode === 'step' ? 'Piano' : 'Step';
                showNotification(`View: ${sequencerViewMode === 'step' ? 'Step Grid' : 'Piano Roll'}`, 1500);
                // Rebuild the window content with the other view
                openTrackSequencerWindow(trackId, true);
            });
        }

        if (grid) grid.addEventListener('click', (e) => {
            const targetCell = e.target.closest('.sequencer-step-cell');
            if (targetCell) {
                let row = parseInt(targetCell.dataset.row, 10); let col = parseInt(targetCell.dataset.col, 10);
                const currentActiveSeq = track.getActiveSequence();
                if (!currentActiveSeq || !currentActiveSeq.data) return;

                // Apply snap quantization if enabled
                const snapValue = window.SEQUENCER_SNAP_VALUE || 0;
                if (snapValue > 0) {
                    // Snap the column to the nearest snap point
                    const nearestSnapCol = Math.round(col / snapValue) * snapValue;
                    if (nearestSnapCol !== col) {
                        // Find the actual cell at the snapped position
                        const snappedCell = sequencerWindow.element.querySelector(`.sequencer-step-cell[data-row="${row}"][data-col="${nearestSnapCol}"]`);
                        if (snappedCell) {
                            col = nearestSnapCol;
                        }
                    }
                }

                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    if (!currentActiveSeq.data[row]) currentActiveSeq.data[row] = Array(currentActiveSeq.length).fill(null);
                    const currentStepData = currentActiveSeq.data[row][col];
                    const isActive = !(((currentStepData) && (currentStepData).active));

                    if (e.shiftKey && (e.ctrlKey || e.metaKey)) {
                        // Shift+Ctrl/Cmd: paste velocity from clipboard
                        if (clipboard && clipboard.type === 'velocity' && clipboard.velocity !== undefined) {
                            if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Paste Velocity on ${track.name}`);
                            if (currentStepData && currentStepData.active) {
                                currentActiveSeq.data[row][col].velocity = clipboard.velocity;
                                updateSequencerCellUI(sequencerWindow.element, track.type, row, col, true, clipboard.velocity);
                                showNotification(`Velocity set to ${Math.round(clipboard.velocity * 100)}%`, 1000);
                            }
                        }
                    } else if (e.shiftKey) {
                        // Shift+Click: transpose notes up by 1 semitone
                        if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Transpose Notes Up on ${track.name}`);
                        const result = track.shiftSequenceNotes(-1); // negative row shift = higher pitch (up)
                        if (result > 0) {
                            track.recreateToneSequence(true);
                            if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged');
                            showNotification(`Shifted ${result} note(s) up`, 1500);
                        } else {
                            // No notes to shift - just toggle if inactive
                            currentActiveSeq.data[row][col] = { active: true, velocity: ((currentStepData) && (currentStepData).velocity) || Constants.defaultVelocity };
                            updateSequencerCellUI(sequencerWindow.element, track.type, row, col, true, ((currentStepData) && (currentStepData).velocity) || Constants.defaultVelocity);
                        }
                    } else if (e.ctrlKey || e.metaKey) {
                        // Ctrl/Cmd+Click: copy velocity to clipboard
                        if (currentStepData && currentStepData.active) {
                            if (localAppServices.setClipboardData) localAppServices.setClipboardData({ type: 'velocity', velocity: currentStepData.velocity || Constants.defaultVelocity });
                            showNotification(`Velocity ${Math.round((currentStepData.velocity || Constants.defaultVelocity) * 100)}% copied`, 1000);
                        }
                    } else {
                        // Normal click: toggle step
                        if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Step (${row + 1},${col + 1}) on ${track.name} (${currentActiveSeq.name})`);
                        currentActiveSeq.data[row][col] = isActive ? { active: true, velocity: ((currentStepData) && (currentStepData).velocity) || Constants.defaultVelocity } : null;
                        updateSequencerCellUI(sequencerWindow.element, track.type, row, col, isActive, ((currentStepData) && (currentStepData).velocity) || Constants.defaultVelocity);
                    }
                }
            }
        });

        // Right-click on a cell: open velocity editor
        if (grid) grid.addEventListener('contextmenu', (e) => {
            const targetCell = e.target.closest('.sequencer-step-cell');
            if (!targetCell) return;
            e.preventDefault();
            e.stopPropagation();
            
            let row = parseInt(targetCell.dataset.row, 10);
            let col = parseInt(targetCell.dataset.col, 10);
            const currentActiveSeq = track.getActiveSequence();
            if (!currentActiveSeq || !currentActiveSeq.data || !currentActiveSeq.data[row]) return;
            
            const stepData = currentActiveSeq.data[row][col];
            if (!stepData || !stepData.active) {
                showNotification("No note at this step to edit.", 1500);
                return;
            }
            
            const currentVel = stepData.velocity || Constants.defaultVelocity;
            const velPct = Math.round(currentVel * 100);
            
            const noteLen = stepData.length || 1;
            const maxLen = activeSequence.length - col;
            const currentProb = stepData.probability ?? 1;
            const probPct = Math.round(currentProb * 100);
            const noteLabel = rowLabels[row] || `R${row + 1}`;
            const menuItems = [
                { label: `Note: ${noteLabel} | Vel: ${velPct}% | Len: ${noteLen} | Prob: ${probPct}%`, action: () => {}, disabled: true },
                { separator: true },
                { label: `Velocity`, action: () => {}, disabled: true },
                { label: `  Set to 100%`, action: () => { setVelocity(row, col, 1.0); } },
                { label: `  Set to 80%`, action: () => { setVelocity(row, col, 0.8); } },
                { label: `  Set to 60%`, action: () => { setVelocity(row, col, 0.6); } },
                { label: `  Set to 40%`, action: () => { setVelocity(row, col, 0.4); } },
                { label: `  Set to 20%`, action: () => { setVelocity(row, col, 0.2); } },
                { label: `  + 10%`, action: () => { setVelocity(row, col, Math.min(1.0, currentVel + 0.1)); } },
                { label: `  - 10%`, action: () => { setVelocity(row, col, Math.max(0.05, currentVel - 0.1)); } },
                { label: `  Custom...`, action: () => { promptVelocity(row, col, currentVel); } },
                { separator: true },
                { label: `Note Length (steps)`, action: () => {}, disabled: true },
                { label: `  1 step`, action: () => { setNoteLen(row, col, 1); } },
                { label: `  2 steps`, action: () => { setNoteLen(row, col, 2); } },
                { label: `  4 steps`, action: () => { setNoteLen(row, col, 4); } },
                { label: `  8 steps`, action: () => { setNoteLen(row, col, 8); } },
                { label: `  16 steps`, action: () => { setNoteLen(row, col, 16); } },
                { label: `  + 1 step`, action: () => { setNoteLen(row, col, Math.min(maxLen, noteLen + 1)); } },
                { label: `  - 1 step`, action: () => { setNoteLen(row, col, Math.max(1, noteLen - 1)); } },
                { label: `  Custom...`, action: () => { promptNoteLen(row, col, noteLen, maxLen); } },
                { separator: true },
                { label: `Probability`, action: () => {}, disabled: true },
                { label: `  100% (always)`, action: () => { setProbability(row, col, 1.0); } },
                { label: `  75%`, action: () => { setProbability(row, col, 0.75); } },
                { label: `  50% (half)`, action: () => { setProbability(row, col, 0.5); } },
                { label: `  25%`, action: () => { setProbability(row, col, 0.25); } },
                { label: `  10% (rare)`, action: () => { setProbability(row, col, 0.1); } },
                { label: `  Custom...`, action: () => { promptProbability(row, col, currentProb); } },
            ];
            
            function setVelocity(r, c, v) {
                if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Velocity on ${track.name}`);
                track.setStepVelocity(r, c, v);
                const newVel = track.getStepVelocity(r, c);
                updateSequencerCellUI(sequencerWindow.element, track.type, r, c, true, newVel);
                showNotification(`Velocity: ${Math.round(newVel * 100)}%`, 1000);
            }
            function promptVelocity(r, c, currentVel) {
                const input = window.prompt(`Enter velocity (0-100%):`, Math.round(currentVel * 100));
                if (input === null) return;
                const val = parseFloat(input);
                if (isNaN(val) || val < 0 || val > 100) {
                    showNotification("Invalid velocity. Use 0-100.", 2000);
                    return;
                }
                setVelocity(r, c, val / 100);
            }
            function setNoteLen(r, c, len) {
                if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Note Length on ${track.name}`);
                track.setNoteLength(r, c, len);
                if (localAppServices.openTrackSequencerWindow) localAppServices.openTrackSequencerWindow(track.id, true);
                showNotification(`Note length: ${track.getNoteLength(r, c)} step(s)`, 1000);
            }
            function promptNoteLen(r, c, currentLen, maxLen) {
                const input = window.prompt(`Enter note length in steps (1-${maxLen}):`, currentLen);
                if (input === null) return;
                const val = parseInt(input, 10);
                if (isNaN(val) || val < 1) {
                    showNotification("Invalid note length. Use 1 or more steps.", 2000);
                    return;
                }
                setNoteLen(r, c, Math.min(maxLen, Math.max(1, val)));
            }
            function setProbability(r, c, prob) {
                if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Probability on ${track.name}`);
                track.setStepProbability(r, c, prob);
                if (localAppServices.openTrackSequencerWindow) localAppServices.openTrackSequencerWindow(track.id, true);
                showNotification(`Probability: ${Math.round(prob * 100)}%`, 1000);
            }
            function promptProbability(r, c, currentProb) {
                const input = window.prompt(`Enter probability (0-100%):`, Math.round(currentProb * 100));
                if (input === null) return;
                const val = parseFloat(input);
                if (isNaN(val) || val < 0 || val > 100) {
                    showNotification("Invalid probability. Use 0-100.", 2000);
                    return;
                }
                setProbability(r, c, val / 100);
            }
            
            createContextMenu(e, menuItems, localAppServices);
        });
    }
    return sequencerWindow;
}

// --- UI Update & Drawing Functions ---
export function drawWaveform(track) {
    if (!((track) && (track).waveformCanvasCtx) || !((track.audioBuffer) && (track.audioBuffer).loaded)) {
        if (((track) && (track).waveformCanvasCtx)) {
            const canvas = track.waveformCanvasCtx.canvas;
            track.waveformCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            track.waveformCanvasCtx.fillStyle = canvas.classList.contains('dark') ? '#101010' : '#e0e0e0';
            track.waveformCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            track.waveformCanvasCtx.fillStyle = canvas.classList.contains('dark') ? '#D291BC' : '#a0a0a0';
            track.waveformCanvasCtx.textAlign = 'center';
            track.waveformCanvasCtx.fillText('No audio loaded or processed', canvas.width / 2, canvas.height / 2);
        }
        return;
    }
    const canvas = track.waveformCanvasCtx.canvas; const ctx = track.waveformCanvasCtx;
    const buffer = track.audioBuffer.get(); const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width); const amp = canvas.height / 2;
    ctx.fillStyle = ctx.canvas.classList.contains('dark') ? '#101010' : '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1; ctx.strokeStyle = ctx.canvas.classList.contains('dark') ? '#957DAD' : '#957DAD';
    ctx.beginPath(); ctx.moveTo(0, amp);
    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0; let max = -1.0;
        for (let j = 0; j < step; j++) { const datum = data[(i * step) + j]; if (datum < min) min = datum; if (datum > max) max = datum; }
        ctx.lineTo(i, (1 + min) * amp); ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.lineTo(canvas.width, amp); ctx.stroke();
    track.slices.forEach((slice, index) => {
        if (slice.duration <= 0) return;
        const startX = (slice.offset / buffer.duration) * canvas.width;
        const endX = ((slice.offset + slice.duration) / buffer.duration) * canvas.width;
        ctx.fillStyle = index === track.selectedSliceForEdit ? 'rgba(255, 0, 0, 0.3)' : (ctx.canvas.classList.contains('dark') ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0, 0, 255, 0.15)');
        ctx.fillRect(startX, 0, endX - startX, canvas.height);
        ctx.strokeStyle = index === track.selectedSliceForEdit ? 'rgba(255,0,0,0.7)' : (ctx.canvas.classList.contains('dark') ? 'rgba(52, 211, 153, 0.5)' : 'rgba(0,0,255,0.4)');
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(startX, 0); ctx.lineTo(startX, canvas.height); ctx.moveTo(endX, 0); ctx.lineTo(endX, canvas.height); ctx.stroke();
        ctx.fillStyle = index === track.selectedSliceForEdit ? '#FEC8D8' : (ctx.canvas.classList.contains('dark') ? '#E0BBE4' : '#0000cc');
        ctx.font = '10px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`S${index + 1}`, startX + 2, 10);
    });
}

export function drawInstrumentWaveform(track) {
    if (!((track) && (track).instrumentWaveformCanvasCtx) || !((track.instrumentSamplerSettings.audioBuffer) && (track.instrumentSamplerSettings.audioBuffer).loaded)) {
        if (((track) && (track).instrumentWaveformCanvasCtx)) {
            const canvas = track.instrumentWaveformCanvasCtx.canvas;
            track.instrumentWaveformCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            track.instrumentWaveformCanvasCtx.fillStyle = canvas.classList.contains('dark') ? '#101010' : '#e0e0e0';
            track.instrumentWaveformCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            track.instrumentWaveformCanvasCtx.fillStyle = canvas.classList.contains('dark') ? '#D291BC' : '#a0a0a0';
            track.instrumentWaveformCanvasCtx.textAlign = 'center';
            track.instrumentWaveformCanvasCtx.fillText('No audio loaded or processed', canvas.width / 2, canvas.height / 2);
        }
        return;
    }
    const canvas = track.instrumentWaveformCanvasCtx.canvas; const ctx = track.instrumentWaveformCanvasCtx;
    const buffer = track.instrumentSamplerSettings.audioBuffer.get(); const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width); const amp = canvas.height / 2;
    ctx.fillStyle = canvas.classList.contains('dark') ? '#101010' : '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1; ctx.strokeStyle = canvas.classList.contains('dark') ? '#D291BC' : '#D291BC';
    ctx.beginPath(); ctx.moveTo(0, amp);
    for (let i = 0; i < canvas.width; i++) { let min = 1.0; let max = -1.0; for (let j = 0; j < step; j++) { const datum = data[(i * step) + j]; if (datum < min) min = datum; if (datum > max) max = datum; } ctx.lineTo(i, (1 + min) * amp); ctx.lineTo(i, (1 + max) * amp); }
    ctx.lineTo(canvas.width, amp); ctx.stroke();
    if (track.instrumentSamplerSettings.loop) {
        const loopStartX = (track.instrumentSamplerSettings.loopStart / buffer.duration) * canvas.width;
        const loopEndX = (track.instrumentSamplerSettings.loopEnd / buffer.duration) * canvas.width;
        ctx.fillStyle = canvas.classList.contains('dark') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 255, 0, 0.2)';
        ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, canvas.height);
        ctx.strokeStyle = canvas.classList.contains('dark') ? 'rgba(52, 211, 153, 0.6)' : 'rgba(0,200,0,0.6)';
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(loopStartX, 0); ctx.lineTo(loopStartX, canvas.height); ctx.moveTo(loopEndX, 0); ctx.lineTo(loopEndX, canvas.height); ctx.stroke();
    }
}



// --- Sequencer Cell UI Update ---
// Updates a single sequencer cell's visual state (active class and velocity brightness)
export function updateSequencerCellUI(windowElement, trackType, row, col, isActive, velocity = 0.7) {
    if (!windowElement) return;
    const cell = windowElement.querySelector(`.sequencer-step-cell[data-row="${row}"][data-col="${col}"]`);
    if (!cell) return;

    // Remove all velocity classes
    cell.classList.remove('vel-100', 'vel-90', 'vel-80', 'vel-70', 'vel-60', 'vel-50', 'vel-40', 'vel-30', 'vel-20', 'vel-10');
    cell.classList.remove('active', 'active-synth', 'active-sampler', 'active-drum-sampler', 'active-instrument-sampler');

    if (isActive) {
        let activeClass = 'active';
        if (trackType === 'Synth') activeClass = 'active-synth';
        else if (trackType === 'Sampler') activeClass = 'active-sampler';
        else if (trackType === 'DrumSampler') activeClass = 'active-drum-sampler';
        else if (trackType === 'InstrumentSampler') activeClass = 'active-instrument-sampler';
        cell.classList.add(activeClass);

        // Apply velocity-based brightness class
        const vel = (velocity !== undefined) ? velocity : (Constants.defaultVelocity || 0.7);
        const velPercent = vel * 100;
        let velClass = '';
        if (velPercent >= 100) velClass = 'vel-100';
        else if (velPercent >= 90) velClass = 'vel-90';
        else if (velPercent >= 80) velClass = 'vel-80';
        else if (velPercent >= 70) velClass = 'vel-70';
        else if (velPercent >= 60) velClass = 'vel-60';
        else if (velPercent >= 50) velClass = 'vel-50';
        else if (velPercent >= 40) velClass = 'vel-40';
        else if (velPercent >= 30) velClass = 'vel-30';
        else if (velPercent >= 20) velClass = 'vel-20';
        else velClass = 'vel-10';
        cell.classList.add(velClass);
    }
}

export function highlightPlayingStep(trackId, stepIndex, isPlaying) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) return;
    const sequencerWin = localAppServices.getWindowById ? localAppServices.getWindowById('sequencerWin-' + trackId) : null;
    if (!sequencerWin || !sequencerWin.element) return;
    sequencerWin.element.querySelectorAll('.sequencer-step-cell.playing').forEach(cell => cell.classList.remove('playing'));
    if (isPlaying && stepIndex >= 0) {
        const cell = sequencerWin.element.querySelector('[data-col="' + stepIndex + '"]');
        if (cell) cell.classList.add('playing');
    }
}

export function openTimelineWindow(savedState = null) {
    console.log('[UI openTimelineWindow] Creating timeline window...');
    
    // Check if timeline window already exists
    if (localAppServices.getWindowById) {
        const existingWin = localAppServices.getWindowById('timeline');
        if (existingWin) {
            existingWin.restore();
            existingWin.focus();
            return;
        }
    }

    // Create timeline content with zoom controls
    const timelineContent = `
        <div id="timeline-container">
            <div id="timeline-header">
                <div id="timeline-zoom-controls" style="display: flex; align-items: center; gap: 4px; padding: 2px 6px; background: #2a2a2a; border-right: 1px solid #3a3a3a;">
                    <button id="timeline-zoom-out" class="transport-btn" style="padding: 2px 6px; font-size: 10px;" title="Zoom out (-)">−</button>
                    <span id="timeline-zoom-level" style="font-size: 10px; color: #aaa; min-width: 32px; text-align: center;">100%</span>
                    <button id="timeline-zoom-in" class="transport-btn" style="padding: 2px 6px; font-size: 10px;" title="Zoom in (+)">+</button>
                    <button id="timeline-zoom-reset" class="transport-btn" style="padding: 2px 6px; font-size: 9px;" title="Reset zoom">1:1</button>
                </div>
                <div id="timeline-ruler-container">
                    <div id="timeline-ruler" style="height: 100%; cursor: pointer;"></div>
                </div>
            </div>
            <div id="timeline-tracks-container">
                <div id="timeline-loop-start-marker" class="timeline-region-marker loop-start-marker"></div>
                <div id="timeline-loop-end-marker" class="timeline-region-marker loop-end-marker"></div>
                <div id="timeline-punch-start-marker" class="timeline-region-marker punch-start-marker"></div>
                <div id="timeline-punch-end-marker" class="timeline-region-marker punch-end-marker"></div>
                <div id="timeline-tracks-area">
                    <!-- Tracks will be rendered here -->
                </div>
            </div>
            <div id="timeline-playhead"></div>
        </div>
    `;

    // Create the window
    if (typeof localAppServices.createWindow === 'function') {
        const timelineWindow = localAppServices.createWindow(
            'timeline',
            'Timeline',
            timelineContent,
            { width: 900, height: 400, x: 50, y: 50 },
        );
        
        // Setup zoom controls after window is created
        setupTimelineZoomControls(timelineWindow.element);
        
        // Render tracks in timeline
        renderTimeline();

        // Initial region marker update
        updateTimelineRegionMarkers();
    } else {
        console.error('createWindow service not available');
    }
}

function setupTimelineZoomControls(timelineElement) {
    // Zoom in button
    const zoomInBtn = timelineElement.querySelector('#timeline-zoom-in');
    const zoomOutBtn = timelineElement.querySelector('#timeline-zoom-out');
    const zoomResetBtn = timelineElement.querySelector('#timeline-zoom-reset');
    const zoomLevelDisplay = timelineElement.querySelector('#timeline-zoom-level');
    const ruler = timelineElement.querySelector('#timeline-ruler');
    const tracksArea = timelineElement.querySelector('#timeline-tracks-area');
    const tracksContainer = timelineElement.querySelector('#timeline-tracks-container');
    
    if (!zoomInBtn || !zoomOutBtn || !ruler || !tracksArea) {
        console.warn('[Timeline] Zoom control elements not found');
        return;
    }
    
    function applyZoom(newZoom) {
        timelineZoomLevel = Math.min(4, Math.max(0.25, newZoom));
        const zoomPercent = Math.round(timelineZoomLevel * 100);
        if (zoomLevelDisplay) zoomLevelDisplay.textContent = `${zoomPercent}%`;
        
        // Update ruler background size
        ruler.style.backgroundSize = `${120 * timelineZoomLevel}px 100%, ${30 * timelineZoomLevel}px 100%`;
        
        // Update tracks area width
        tracksArea.style.width = `${4000 * timelineZoomLevel}px`;
        
        // Update region markers when zoom changes
        updateTimelineRegionMarkers();
        
        // Sync horizontal scroll
        if (tracksContainer && ruler.parentElement) {
            tracksContainer.scrollLeft = ruler.parentElement.scrollLeft;
        }
        
        showNotification(`Zoom: ${zoomPercent}%`, 800);
    }
    
    zoomInBtn.addEventListener('click', () => applyZoom(timelineZoomLevel * 1.5));
    zoomOutBtn.addEventListener('click', () => applyZoom(timelineZoomLevel / 1.5));
    zoomResetBtn.addEventListener('click', () => applyZoom(1.0));
    
    // Scroll wheel zoom on the tracks container
    tracksContainer.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.8 : 1.25;
            applyZoom(timelineZoomLevel * delta);
        }
    }, { passive: false });
    
    // Sync scroll between ruler and tracks
    tracksContainer.addEventListener('scroll', () => {
        ruler.parentElement.scrollLeft = tracksContainer.scrollLeft;
        timelineScrollX = tracksContainer.scrollLeft;
        // Update region markers on scroll to keep them aligned
        updateTimelineRegionMarkers();
    });
    
    // Initial zoom display
    applyZoom(timelineZoomLevel);
    
    // Initial region marker update
    updateTimelineRegionMarkers();
}

export function renderTimeline() {
    console.log('[UI renderTimeline] Rendering timeline...');
    
    const tracksArea = document.getElementById('timeline-tracks-area');
    if (!tracksArea) {
        console.warn('Timeline tracks area not found');
        return;
    }

    // Render the ruler first (before tracks area content is overwritten)
    renderTimelineRuler();

    // Get tracks from state
    const tracks = typeof localAppServices.getTracks === 'function' ? localAppServices.getTracks() : [];
    
    if (!tracks || tracks.length === 0) {
        tracksArea.innerHTML = '<div style="padding: 20px; color: #888;">No tracks. Add a track to see it in the timeline.</div>';
        return;
    }

    // Pixels per second - adjust this to scale clips on the timeline
    const PIXELS_PER_SECOND = 50 * timelineZoomLevel;
    const TRACK_NAME_WIDTH = 120; // matches CSS --timeline-track-name-width
    // Render each track as a lane
    let tracksHTML = '';
    tracks.forEach(track => {
        const trackColor = track.trackColor || '#6366f1';
        
        // Generate clip HTML for this track
        let clipsHTML = '';
        const clips = track.timelineClips || [];
        clips.forEach(clip => {
            const clipLeft = TRACK_NAME_WIDTH + (clip.startTime * PIXELS_PER_SECOND);
            const clipWidth = Math.max(clip.duration * PIXELS_PER_SECOND, 20); // minimum 20px width
            const isAudioClip = clip.type === 'audio';
            const isSequenceClip = clip.type === 'sequence';
            const clipClass = isAudioClip ? 'audio-clip' : (isSequenceClip ? 'sequence-clip' : 'audio-clip');
            
            clipsHTML += `
                <div class="${clipClass}" 
                     data-clip-id="${clip.id}" 
                     data-track-id="${track.id}"
                     style="left: ${clipLeft}px; width: ${clipWidth}px;"
                     title="${clip.name || 'Untitled'}">
                    <div class="clip-resize-handle clip-resize-handle-left"></div>
                    <span class="clip-label">${clip.name || 'Untitled'}</span>
                    <div class="clip-resize-handle clip-resize-handle-right"></div>
                </div>
            `;
        });

        tracksHTML += `
            <div class="timeline-track-lane" data-track-id="${track.id}">
                <div class="timeline-track-lane-name flex items-center gap-1">
                    <span class="track-color-dot" style="background-color:${trackColor}"></span>
                    <span class="truncate">${track.name}</span>
                </div>
                <div class="timeline-track-content" style="flex: 1; position: relative; height: 100%;">
                    ${clipsHTML}
                </div>
            </div>
        `;
    });
    
    tracksArea.innerHTML = tracksHTML;
    
    // Attach click handlers for clip selection
    attachClipEventHandlers();
    
    // Update playhead position
    updatePlayheadPosition();
    
    console.log(`[UI renderTimeline] Rendered ${tracks.length} tracks with clips`);
}

function renderTimelineRuler() {
    const rulerEl = document.getElementById('timeline-ruler');
    if (!rulerEl) return;

    // Pixels per bar: 120 * timelineZoomLevel (matches CSS background-size)
    const PIXELS_PER_BAR = 120 * timelineZoomLevel;
    const PIXELS_PER_BEAT = 30 * timelineZoomLevel; // 1/4 of bar (4 beats per bar)
    const TRACK_NAME_WIDTH = 120;
    const MAX_BARS_DISPLAY = 128;

    // Get tempo for proper beat/bar rendering
    const bpm = Tone && Tone.Transport && Tone.Transport.bpm && Tone.Transport.bpm.value ? Tone.Transport.bpm.value : 120;
    const secondsPerBeat = 60 / bpm;
    const secondsPerBar = secondsPerBeat * 4; // 4/4 time
    const totalWidth = TRACK_NAME_WIDTH + (MAX_BARS_DISPLAY * PIXELS_PER_BAR);

    let rulerHTML = '';
    const markerColor = 'rgba(255,255,255,0.6)';
    const labelColor = 'rgba(255,255,255,0.8)';
    const fontSize = Math.max(9, Math.min(12, 10 * timelineZoomLevel));

    for (let bar = 1; bar <= MAX_BARS_DISPLAY; bar++) {
        const barLeft = TRACK_NAME_WIDTH + ((bar - 1) * PIXELS_PER_BAR);
        // Bar number label
        rulerHTML += `<span style="position:absolute;left:${barLeft + 2}px;top:2px;font-size:${fontSize}px;color:${labelColor};pointer-events:none;font-family:monospace;">${bar}</span>`;
        // Bar tick (tall line)
        rulerHTML += `<div style="position:absolute;left:${barLeft}px;top:0;width:1px;height:100%;background:${markerColor};"></div>`;
        // Beat ticks within this bar
        for (let beat = 1; beat < 4; beat++) {
            const beatLeft = barLeft + (beat * PIXELS_PER_BEAT);
            // Smaller tick for beat
            rulerHTML += `<div style="position:absolute;left:${beatLeft}px;top:50%;width:1px;height:50%;background:${markerColor};opacity:0.5;"></div>`;
        }
    }

    // Add marker indicators on the ruler
    if (localAppServices.getTimelineMarkers) {
        const markers = localAppServices.getTimelineMarkers();
        markers.forEach(marker => {
            const markerLeft = TRACK_NAME_WIDTH + ((marker.bar - 1) * PIXELS_PER_BAR);
            const markerColorVal = marker.color || '#ff9f43';
            rulerHTML += `<div style="position:absolute;left:${markerLeft - 4}px;top:0;width:8px;height:100%;background:${markerColorVal};opacity:0.7;border-radius:2px;" title="${marker.name || 'Marker'} (Bar ${marker.bar})"></div>`;
        });
    }

    // Playhead indicator on ruler
    const playheadBar = getPlayheadPositionInBars();
    if (playheadBar > 0) {
        const playheadLeft = TRACK_NAME_WIDTH + ((playheadBar - 1) * PIXELS_PER_BAR);
        rulerHTML += `<div id="timeline-ruler-playhead" style="position:absolute;left:${playheadLeft}px;top:0;width:2px;height:100%;background:#ff6b6b;pointer-events:none;z-index:10;"></div>`;
    }

    rulerEl.innerHTML = rulerHTML;

    // Double-click to add marker at clicked bar
    rulerEl.ondblclick = (e) => {
        const rect = rulerEl.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickedBar = Math.max(1, Math.round((clickX - TRACK_NAME_WIDTH) / PIXELS_PER_BAR) + 1);
        if (localAppServices.addTimelineMarker) {
            const newMarkerId = localAppServices.addTimelineMarker({
                name: `Marker ${Date.now() % 1000}`,
                bar: clickedBar,
                color: Constants.DEFAULT_MARKER_COLOR || '#ff9f43'
            });
            showNotification(`Marker added at bar ${clickedBar}`, 1500);
            // Refresh ruler to show new marker
            renderTimelineRuler();
            // Also refresh markers window if open
            const markersWin = localAppServices.getOpenWindows?.()?.get('timelineMarkers');
            if (markersWin && markersWin.element) {
                const listContainer = markersWin.element.querySelector('#timelineMarkersList');
                if (listContainer && typeof buildMarkersListHTML === 'function') {
                    listContainer.innerHTML = buildMarkersListHTML();
                }
            }
        }
    };
}

function getPlayheadPositionInBars() {
    // Returns current playhead position in bars (1-indexed for ruler display)
    if (typeof Tone !== 'undefined' && Tone.Transport) {
        const position = Tone.Transport.position || '0:0:0';
        const parts = position.split(':');
        if (parts.length >= 3) {
            const bars = parseInt(parts[0], 10);
            const beats = parseInt(parts[1], 10);
            const sixteenths = parseInt(parts[2], 10);
            const totalBeats = (bars * 4) + beats + (sixteenths / 4);
            return totalBeats / 4 + 1; // Convert to 1-indexed bars
        }
    }
    return 0;
}

function attachClipEventHandlers() {
    // Clip right-click context menu
    document.querySelectorAll('.audio-clip, .sequence-clip').forEach(clipEl => {
        clipEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const clipId = clipEl.dataset.clipId;
            const trackId = clipEl.dataset.trackId;
            const tracks = typeof localAppServices.getTracks === 'function' ? localAppServices.getTracks() : [];
            const track = tracks.find(t => t.id === trackId);
            if (!track) return;
            const clip = track.timelineClips ? track.timelineClips.find(c => c.id === clipId) : null;
            if (!clip) return;
            const clipName = clip.name || 'Untitled';

            const menuItems = [
                { label: `Rename Clip...`, action: () => {
                    const newName = window.prompt(`Rename "${clipName}":`, clipName);
                    if (newName !== null && newName.trim() !== '' && newName.trim() !== clipName) {
                        if (track.setAudioClipName) { track.setAudioClipName(clip.id, newName.trim()); showNotification(`Renamed to "${newName.trim()}"`, 1500); }
                    }
                }},
                { label: `Change Color...`, action: () => {
                    const colors = Constants.CLIP_COLORS || ['#4a9eff', '#ff4a4a', '#4aff4a', '#ff4aff', '#ffff4a', '#4affff', '#ff9f43', '#a855f7'];
                    const currentColor = clip.color || Constants.DEFAULT_CLIP_COLOR || '#4a9eff';
                    const colorHex = window.prompt(`Enter hex color for "${clipName}" (e.g. #ff4a4a):`, currentColor);
                    if (colorHex && /^#[0-9A-Fa-f]{6}$/.test(colorHex)) {
                        if (track.setAudioClipColor) { track.setAudioClipColor(clip.id, colorHex); clipEl.style.borderColor = colorHex; showNotification(`Color set to ${colorHex}`, 1500); }
                        else { clip.color = colorHex; clipEl.style.borderColor = colorHex; showNotification(`Color set to ${colorHex}`, 1500); }
                    } else if (colorHex !== null) { showNotification('Invalid hex color format. Use #rrggbb.', 2000); }
                }},
                { separator: true },
                { label: `Duplicate Clip`, action: () => {
                    if (track.duplicateTimelineClip) { const newClip = track.duplicateTimelineClip(clip.id); if (newClip && localAppServices.renderTimeline) { localAppServices.renderTimeline(); showNotification(`Duplicated "${clipName}"`, 1500); } else { showNotification('Failed to duplicate clip', 2000); } }
                    else { showNotification('Duplicate not available', 1500); }
                }},
                { label: `Split Clip at Playhead...`, action: () => {
                    try { const pos = Tone.Transport.position; const [bars, beats, sixteenths] = pos.split(':').map(Number); const secondsPerBeat = 60 / Tone.Transport.bpm.value; const splitTime = (bars * 4 * secondsPerBeat) + (beats * secondsPerBeat) + (sixteenths * secondsPerBeat / 4); if (splitTime <= clip.startTime || splitTime >= clip.startTime + clip.duration) { showNotification('Playhead must be within clip to split.', 2500); return; } if (track.splitAudioClip) { const newClip = track.splitAudioClip(clip.id, splitTime); if (newClip && localAppServices.renderTimeline) { localAppServices.renderTimeline(); showNotification(`Split "${clipName}" at ${bars}:${beats}:${sixteenths}`, 1500); } else { showNotification('Failed to split clip', 2000); } } else { showNotification('Split not available', 1500); } } catch (e) { showNotification('Cannot get transport position.', 2000); }
                }},
                { separator: true },
                { label: `Fade In`, submenu: () => {
                    const currentFade = clip.fadeIn || 0;
                    const currentCurve = track.getAudioClipFadeInCurve ? track.getAudioClipFadeInCurve(clip.id) : (clip.fadeInCurve || 'linear');
                    return [
                        { label: `Duration...`, action: () => {
                            const val = window.prompt(`Enter fade in duration (seconds):`, String(currentFade));
                            if (val === null) return;
                            const parsed = parseFloat(val);
                            if (isNaN(parsed) || parsed < 0) { showNotification('Enter a valid positive number (seconds)', 2000); return; }
                            if (track.setAudioClipFadeIn) { track.setAudioClipFadeIn(clip.id, parsed); showNotification(`Fade in set to ${parsed}s for "${clipName}"`, 1500); } else { showNotification('Fade not available', 1500); }
                        }},
                        { separator: true },
                        { label: `Linear${currentCurve === 'linear' ? ' ✓' : ''}`, action: () => {
                            if (track.setAudioClipFadeInCurve) { track.setAudioClipFadeInCurve(clip.id, 'linear'); showNotification(`Fade in curve set to linear for "${clipName}"`, 1500); }
                        }},
                        { label: `Exponential${currentCurve === 'exponential' ? ' ✓' : ''}`, action: () => {
                            if (track.setAudioClipFadeInCurve) { track.setAudioClipFadeInCurve(clip.id, 'exponential'); showNotification(`Fade in curve set to exponential for "${clipName}"`, 1500); }
                        }}
                    ];
                }},
                { label: `Fade Out`, submenu: () => {
                    const currentFade = clip.fadeOut || 0;
                    const currentCurve = track.getAudioClipFadeOutCurve ? track.getAudioClipFadeOutCurve(clip.id) : (clip.fadeOutCurve || 'linear');
                    return [
                        { label: `Duration...`, action: () => {
                            const val = window.prompt(`Enter fade out duration (seconds):`, String(currentFade));
                            if (val === null) return;
                            const parsed = parseFloat(val);
                            if (isNaN(parsed) || parsed < 0) { showNotification('Enter a valid positive number (seconds)', 2000); return; }
                            if (track.setAudioClipFadeOut) { track.setAudioClipFadeOut(clip.id, parsed); showNotification(`Fade out set to ${parsed}s for "${clipName}"`, 1500); } else { showNotification('Fade not available', 1500); }
                        }},
                        { separator: true },
                        { label: `Linear${currentCurve === 'linear' ? ' ✓' : ''}`, action: () => {
                            if (track.setAudioClipFadeOutCurve) { track.setAudioClipFadeOutCurve(clip.id, 'linear'); showNotification(`Fade out curve set to linear for "${clipName}"`, 1500); }
                        }},
                        { label: `Exponential${currentCurve === 'exponential' ? ' ✓' : ''}`, action: () => {
                            if (track.setAudioClipFadeOutCurve) { track.setAudioClipFadeOutCurve(clip.id, 'exponential'); showNotification(`Fade out curve set to exponential for "${clipName}"`, 1500); }
                        }}
                    ];
                }},
                { label: `Reverse`, action: () => {
                    if (track.setAudioClipReverse) { track.setAudioClipReverse(clip.id, true); showNotification(`Reversed "${clipName}"`, 1500); } else { showNotification('Reverse not available', 1500); }
                }},
                { label: `Playback Rate...`, action: () => {
                    const currentRate = (track.getAudioClipPlaybackRate ? track.getAudioClipPlaybackRate(clip.id) : (clip.playbackRate || 1));
                    const val = window.prompt(`Enter playback rate (0.25 - 4.0):`, String(currentRate));
                    if (val === null) return;
                    const parsed = parseFloat(val);
                    if (isNaN(parsed)) { showNotification('Enter a valid number', 2000); return; }
                    const clamped = Math.max(0.25, Math.min(4, parsed));
                    if (track.setAudioClipPlaybackRate) { track.setAudioClipPlaybackRate(clip.id, clamped); showNotification(`Playback rate set to ${clamped}x for "${clipName}"`, 1500); } else { showNotification('Playback rate not available', 1500); }
                }},
                { label: `Start Offset...`, action: () => {
                    const currentOffset = (track.getAudioClipStartOffset ? track.getAudioClipStartOffset(clip.id) : (clip.startOffset || 0));
                    const val = window.prompt(`Enter start offset in seconds (0 = beginning):`, String(currentOffset));
                    if (val === null) return;
                    const parsed = parseFloat(val);
                    if (isNaN(parsed) || parsed < 0) { showNotification('Enter a valid positive number (seconds)', 2000); return; }
                    if (track.setAudioClipStartOffset) { track.setAudioClipStartOffset(clip.id, parsed); showNotification(`Start offset set to ${parsed}s for "${clipName}"`, 1500); } else { showNotification('Start offset not available', 1500); }
                }},
                { label: `End Offset...`, action: () => {
                    const currentOffset = (track.getAudioClipEndOffset ? track.getAudioClipEndOffset(clip.id) : (clip.endOffset || 0));
                    const val = window.prompt(`Enter end offset in seconds (0 = end):`, String(currentOffset));
                    if (val === null) return;
                    const parsed = parseFloat(val);
                    if (isNaN(parsed) || parsed < 0) { showNotification('Enter a valid positive number (seconds)', 2000); return; }
                    if (track.setAudioClipEndOffset) { track.setAudioClipEndOffset(clip.id, parsed); showNotification(`End offset set to ${parsed}s for "${clipName}"`, 1500); } else { showNotification('End offset not available', 1500); }
                }},
                { label: `Pitch Shift...`, action: () => {
                    const currentPitch = clip.pitchShift || 0;
                    const val = window.prompt(`Enter pitch shift in semitones (-24 to +24):`, String(currentPitch));
                    if (val === null) return;
                    const parsed = parseInt(val);
                    if (isNaN(parsed)) { showNotification('Enter a valid integer', 2000); return; }
                    const clamped = Math.max(-24, Math.min(24, parsed));
                    if (track.setAudioClipPitchShift) { track.setAudioClipPitchShift(clip.id, clamped); showNotification(`Pitch shift set to ${clamped} semitones for "${clipName}"`, 1500); } else { showNotification('Pitch shift not available', 1500); }
                }},
                { label: `Gain...`, action: () => {
                    const currentGain = track.getAudioClipGain ? track.getAudioClipGain(clip.id) : (clip.gain !== undefined ? clip.gain : 1);
                    const val = window.prompt(`Enter gain (0.0 - 4.0, 1.0 = 0dB):`, String(currentGain));
                    if (val === null) return;
                    const parsed = parseFloat(val);
                    if (isNaN(parsed)) { showNotification('Enter a valid number', 2000); return; }
                    const clamped = Math.max(0, Math.min(4, parsed));
                    if (track.setAudioClipGain) { track.setAudioClipGain(clip.id, clamped); showNotification(`Gain set to ${clamped}x for "${clipName}"`, 1500); } else { showNotification('Gain not available', 1500); }
                }},
                { label: `Normalize`, action: () => {
                    if (track.normalizeAudioClip) {
                        track.normalizeAudioClip(clip.id).then(success => {
                            if (success && localAppServices.renderTimeline) localAppServices.renderTimeline();
                        });
                    } else { showNotification('Normalize not available', 1500); }
                }},
                { separator: true },
                { label: `Delete Clip`, action: () => {
                    showConfirmationDialog(`Delete Clip "${clipName}"?`, 'This will remove the clip from the timeline. This can be undone.', () => {
                        if (track.deleteTimelineClip) { track.deleteTimelineClip(clip.id); if (localAppServices.renderTimeline) localAppServices.renderTimeline(); showNotification(`Deleted "${clipName}"`, 1500); }
                        else { showNotification('Delete not available', 1500); }
                    });
                }}
            ];
            createContextMenu(e, menuItems, localAppServices);
        });
    });

    // Clip click (select)
    document.querySelectorAll('.audio-clip, .sequence-clip').forEach(clipEl => {
        clipEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('clip-resize-handle')) return;
            const clipId = clipEl.dataset.clipId;
            const trackId = clipEl.dataset.trackId;
            selectClip(trackId, clipId);
        });
    });
    
    // Clip drag (move)
    document.querySelectorAll('.audio-clip, .sequence-clip').forEach(clipEl => {
        clipEl.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('clip-resize-handle')) return;
            e.preventDefault();
            startClipDrag(e, clipEl);
        });
    });
    
    // Resize handles
    document.querySelectorAll('.clip-resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const clipEl = handle.closest('.audio-clip, .sequence-clip');
            const isLeft = handle.classList.contains('clip-resize-handle-left');
            startClipResize(e, clipEl, isLeft);
        });
    });
}

let clipDragState = null;

function startClipDrag(e, clipEl) {
    const clipId = clipEl.dataset.clipId;
    const trackId = clipEl.dataset.trackId;
    const tracks = typeof localAppServices.getTracks === 'function' ? localAppServices.getTracks() : [];
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    
    const clip = track.timelineClips.find(c => c.id === clipId);
    if (!clip) return;
    
    const PIXELS_PER_SECOND = 50 * timelineZoomLevel;
    const startX = e.clientX;
    const originalLeft = clip.startTime * PIXELS_PER_SECOND;
    const snapValue = getSnapValue();
    
    clipDragState = {
        clipEl,
        clip,
        track,
        startX,
        originalLeft,
        PIXELS_PER_SECOND,
        snapValue
    };
    
    document.addEventListener('mousemove', onClipDrag);
    document.addEventListener('mouseup', stopClipDrag);
}

function onClipDrag(e) {
    if (!clipDragState) return;
    const { clipEl, startX, originalLeft, PIXELS_PER_SECOND, clip, snapValue } = clipDragState;
    
    const deltaX = e.clientX - startX;
    let newLeft = Math.max(0, originalLeft + deltaX);
    
    // Apply snap-to-grid if enabled
    if (snapValue > 0) {
        newLeft = snapPixelToGrid(newLeft, snapValue, PIXELS_PER_SECOND);
    }
    
    const newStartTime = newLeft / PIXELS_PER_SECOND;
    
    clipEl.style.left = `${newLeft}px`;
    clip.startTime = newStartTime;
}

function stopClipDrag(e) {
    if (!clipDragState) return;
    const { clip, track, clipEl } = clipDragState;
    
    // Finalize position
    if (typeof track.updateAudioClipPosition === 'function') {
        track.updateAudioClipPosition(clip.id, clip.startTime);
    }
    
    clipDragState = null;
    document.removeEventListener('mousemove', onClipDrag);
    document.removeEventListener('mouseup', stopClipDrag);
}

let clipResizeState = null;

function startClipResize(e, clipEl, isLeft) {
    const clipId = clipEl.dataset.clipId;
    const trackId = clipEl.dataset.trackId;
    const tracks = typeof localAppServices.getTracks === 'function' ? localAppServices.getTracks() : [];
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;
    
    const clip = track.timelineClips.find(c => c.id === clipId);
    if (!clip) return;
    
    const PIXELS_PER_SECOND = 50 * timelineZoomLevel;
    const startX = e.clientX;
    const originalLeft = clip.startTime * PIXELS_PER_SECOND;
    const originalWidth = clip.duration * PIXELS_PER_SECOND;
    const snapValue = getSnapValue();
    
    clipResizeState = {
        clipEl,
        clip,
        track,
        isLeft,
        startX,
        originalLeft,
        originalWidth,
        PIXELS_PER_SECOND,
        snapValue
    };
    
    document.addEventListener('mousemove', onClipResize);
    document.addEventListener('mouseup', stopClipResize);
}

function onClipResize(e) {
    if (!clipResizeState) return;
    const { clipEl, clip, isLeft, startX, originalLeft, originalWidth, PIXELS_PER_SECOND, snapValue } = clipResizeState;
    
    const deltaX = e.clientX - startX;
    
    if (isLeft) {
        // Resize from left (change start time and width)
        let newLeft = Math.max(0, originalLeft + deltaX);
        let newWidth = originalWidth - deltaX;
        
        // Apply snap-to-grid if enabled
        if (snapValue > 0) {
            newLeft = snapPixelToGrid(newLeft, snapValue, PIXELS_PER_SECOND);
            // Recalculate width from snapped left edge to original right edge
            newWidth = (originalLeft + originalWidth) - newLeft;
        }
        
        newWidth = Math.max(20, newWidth);
        const newStartTime = newLeft / PIXELS_PER_SECOND;
        
        clipEl.style.left = `${newLeft}px`;
        clip.startTime = newStartTime;
        clip.duration = newWidth / PIXELS_PER_SECOND;
    } else {
        // Resize from right (change width only)
        let newWidth = originalWidth + deltaX;
        
        // Apply snap-to-grid if enabled - snap the new right edge
        if (snapValue > 0) {
            const newRightEdge = originalLeft + newWidth;
            const snappedRight = snapPixelToGrid(newRightEdge, snapValue, PIXELS_PER_SECOND);
            newWidth = snappedRight - originalLeft;
        }
        
        newWidth = Math.max(20, newWidth);
        clipEl.style.width = `${newWidth}px`;
        clip.duration = newWidth / PIXELS_PER_SECOND;
    }
}

function stopClipResize(e) {
    if (!clipResizeState) return;
    const { clip, track, isLeft } = clipResizeState;
    
    // Call the track's update functions to persist and handle undo
    if (typeof track.updateAudioClipDuration === 'function') {
        track.updateAudioClipDuration(clip.id, clip.duration);
    } else if (typeof track.updateAudioClipPosition === 'function') {
        // Fallback: also update position since we modified it during drag
        track.updateAudioClipPosition(clip.id, clip.startTime);
    }
    
    // When resizing from the left edge, startTime was also modified - capture it for undo too
    if (isLeft && typeof track.updateAudioClipPosition === 'function') {
        track.updateAudioClipPosition(clip.id, clip.startTime);
    }
    
    clipResizeState = null;
    document.removeEventListener('mousemove', onClipResize);
    document.removeEventListener('mouseup', stopClipResize);
}

function selectClip(trackId, clipId) {
    // Highlight selected clip
    document.querySelectorAll('.audio-clip, .sequence-clip').forEach(el => {
        el.style.outline = '';
    });
    const clipEl = document.querySelector(`.audio-clip[data-clip-id="${clipId}"], .sequence-clip[data-clip-id="${clipId}"]`);
    if (clipEl) {
        clipEl.style.outline = '2px solid #fff';
    }
    
    // Could also open an inspector or show clip details
    console.log(`Selected clip ${clipId} on track ${trackId}`);
}

export function updatePlayheadPosition(progress = undefined) {
    // Update the timeline playhead position
    const playhead = document.getElementById('timeline-playhead');
    if (!playhead) return;
    
    const tracksArea = document.getElementById('timeline-tracks-area');
    if (!tracksArea) return;
    
    if (progress === undefined) {
        // Get real transport position
        try {
            const transportPosition = Tone.Transport.position;
            const [bars, beats, sixteenths] = transportPosition.split(':').map(Number);
            const secondsPerBeat = 60 / Tone.Transport.bpm.value;
            const secondsPerBar = secondsPerBeat * 4;
            const currentSeconds = (bars * secondsPerBar) + (beats * secondsPerBeat) + (sixteenths * secondsPerBeat / 4);
            progress = currentSeconds / (16 * secondsPerBeat); // Normalize to 16 bars
        } catch (e) {
            progress = 0;
        }
    }
    
    const TRACK_NAME_WIDTH = 120;
    const PIXELS_PER_SECOND = 50 * timelineZoomLevel;
    const totalBars = 16;
    const totalSeconds = totalBars * (60 / Tone.Transport.bpm.value) * 4;
    const timelineWidth = TRACK_NAME_WIDTH + (totalSeconds * PIXELS_PER_SECOND);
    const position = TRACK_NAME_WIDTH + (progress * (timelineWidth - TRACK_NAME_WIDTH));
    
    playhead.style.left = `${position}px`;
    playhead.style.display = 'block';
}

export function renderDrumSamplerPads(track) {
    // Render the drum pad grid for DrumSampler tracks
    const container = document.getElementById(`drumPadsGridContainer-${track.id}`);
    if (!container) return;
    
    const numPads = 8; // 4x4 grid
    let html = '';
    const selectedPadIndex = getNormalizedDrumSamplerPadIndex(track, -1);
    for (let i = 0; i < numPads; i++) {
        const padData = track.drumSamplerPads && track.drumSamplerPads[i];
        const hasSample = padData && padData.audioBuffer;
        const isSelected = selectedPadIndex === i;
        html += `<div class="drum-pad pad-button ${hasSample ? 'has-sample' : ''} ${isSelected ? 'selected-for-edit' : ''}" 
            data-pad-index="${i}" data-track-id="${track.id}">
            <span class="pad-label">${i + 1}</span>
        </div>`;
    }
    container.innerHTML = html;
    
    // Add click handlers for pad selection
    container.querySelectorAll('.drum-pad').forEach(pad => {
        pad.addEventListener('click', (e) => {
            const padIndex = parseInt(e.currentTarget.dataset.padIndex, 10);
            const trackId = e.currentTarget.dataset.trackId;
            if (localAppServices.selectDrumPad) {
                localAppServices.selectDrumPad(trackId, padIndex);
            } else {
                track.selectedDrumPadForEdit = padIndex;
                updateDrumPadControlsUI(track);
            }
        });
    });

    // Add drop zone handlers for drum pads (direct drop onto pad grid pads)
    container.querySelectorAll('.drum-pad').forEach(padEl => {
        padEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            padEl.classList.add('dragover');
            e.dataTransfer.dropEffect = "copy";
        });
        padEl.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            padEl.classList.remove('dragover');
        });
        padEl.addEventListener('drop', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            padEl.classList.remove('dragover');

            const padIndex = parseInt(padEl.dataset.padIndex, 10);
            const trackId = padEl.dataset.trackId;

            const soundDataString = e.dataTransfer.getData("application/json");
            if (soundDataString) {
                try {
                    const soundData = JSON.parse(soundDataString);
                    if (soundData.type === 'sound-browser-item' && localAppServices.loadSoundFromBrowserToTarget) {
                        await localAppServices.loadSoundFromBrowserToTarget(soundData, trackId, 'DrumSampler', padIndex);
                    }
                } catch (err) {
                    console.error("[UI renderDrumSamplerPads] Error parsing dropped sound data:", err);
                }
            } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                const simulatedEvent = { target: { files: [file] } };
                if (localAppServices.loadDrumSamplerPadFile) {
                    await localAppServices.loadDrumSamplerPadFile(simulatedEvent, trackId, padIndex, file.name);
                }
            }
        });
    });
}

export function renderSamplePads(track) {
    // Render the sample pads grid for Sampler tracks
    const container = document.getElementById(`samplePadsContainer-${track.id}`);
    if (!container) {
        console.warn(`[UI] Sample pads container not found for track ${track.id}`);
        return;
    }
    
    // Get number of slices/pads from track (default to 16 if no slices yet)
    const numPads = (track.slices && track.slices.length > 0) ? Math.min(track.slices.length, 16) : 16;
    
    let html = '';
    for (let i = 0; i < numPads; i++) {
        const slice = track.slices && track.slices[i];
        const hasContent = slice && slice.duration > 0;
        html += `<div class="pad-button ${hasContent ? 'has-sample' : ''}" 
            data-pad-index="${i}" data-track-id="${track.id}">
            <span class="pad-label">S${i + 1}</span>
        </div>`;
    }
    container.innerHTML = html;
    
    // Add click handlers - select slice for editing and play preview
    container.querySelectorAll('.pad-button').forEach((pad, index) => {
        pad.addEventListener('click', async (e) => {
            e.stopPropagation();
            const padIndex = index;
            const trackId = track.id;
            
            // Select slice for editing
            if (track) {
                track.selectedSliceForEdit = padIndex;
                updateSliceEditorUI(track);
            }
            
            // Play slice preview if it has content
            const slice = track.slices && track.slices[padIndex];
            if (slice && slice.duration > 0 && localAppServices.playSlicePreview) {
                localAppServices.playSlicePreview(trackId, padIndex);
            }
        });
        
        // Add cursor style
        pad.style.cursor = 'pointer';
    });
}

export function updateSliceEditorUI(track) {
    // Update the slice editor UI with current slice info
    if (!track) return;
    
    // Get the current slice data
    const currentSliceIndex = track.selectedSliceForEdit || 0;
    const slice = track.slices && track.slices[currentSliceIndex];
    
    // Default slice data if not found
    const sliceData = slice || { volume: 0.7, pitchShift: 0, envelope: { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 } };
    
    // Update selected slice info
    const sliceInfoEl = document.getElementById(`selectedSliceInfo-${track.id}`);
    if (sliceInfoEl) {
        sliceInfoEl.textContent = currentSliceIndex + 1;
    }
    
    // Update pad selection visual
    const container = document.getElementById(`samplePadsContainer-${track.id}`);
    if (container) {
        container.querySelectorAll('.pad-button').forEach((pad, index) => {
            pad.classList.toggle('selected-for-edit', index === currentSliceIndex);
        });
    }
    
    // Update knob values to reflect the selected slice's values
    if (track.inspectorControls) {
        if (track.inspectorControls.sliceVolume && sliceData) {
            track.inspectorControls.sliceVolume.setValue(sliceData.volume !== undefined ? sliceData.volume : 0.7, false);
        }
        if (track.inspectorControls.slicePitch && sliceData) {
            track.inspectorControls.slicePitch.setValue(sliceData.pitchShift !== undefined ? sliceData.pitchShift : 0, false);
        }
        if (track.inspectorControls.sliceEnvAttack && ((sliceData) && (sliceData).envelope)) {
            track.inspectorControls.sliceEnvAttack.setValue(sliceData.envelope.attack || 0.01, false);
        }
        if (track.inspectorControls.sliceEnvDecay && ((sliceData) && (sliceData).envelope)) {
            track.inspectorControls.sliceEnvDecay.setValue(sliceData.envelope.decay || 0.1, false);
        }
        if (track.inspectorControls.sliceEnvSustain && ((sliceData) && (sliceData).envelope)) {
            track.inspectorControls.sliceEnvSustain.setValue(sliceData.envelope.sustain !== undefined ? sliceData.envelope.sustain : 1.0, false);
        }
        if (track.inspectorControls.sliceEnvRelease && ((sliceData) && (sliceData).envelope)) {
            track.inspectorControls.sliceEnvRelease.setValue(sliceData.envelope.release || 0.1, false);
        }
        
        // Update loop/reverse toggle buttons
        const loopToggleBtn = document.getElementById(`sliceLoopToggle-${track.id}`);
        if (loopToggleBtn) {
            loopToggleBtn.textContent = sliceData.loop ? 'Loop: ON' : 'Loop: OFF';
            loopToggleBtn.classList.toggle('active', sliceData.loop);
        }
        const reverseToggleBtn = document.getElementById(`sliceReverseToggle-${track.id}`);
        if (reverseToggleBtn) {
            reverseToggleBtn.textContent = sliceData.reverse ? 'Rev: ON' : 'Rev: OFF';
            reverseToggleBtn.classList.toggle('active', sliceData.reverse);
        }
    }
}

export function updateDrumPadControlsUI(track) {
    // Update the selected drum pad info display
    if (!track) return;
    
    const padInfoEl = document.getElementById(`selectedDrumPadInfo-${track.id}`);
    if (padInfoEl) {
        padInfoEl.textContent = getNormalizedDrumSamplerPadIndex(track) + 1;
    }
    
    renderDrumPadEditorControls(track);
    renderDrumSamplerPads(track);
}

// Snap-to-grid for clips: reads from global controls bar or defaults to sequence snap
function getSnapValue() {
    // First check global controls bar snap button if available
    const snapBtn = document.getElementById('snapToggleBtnGlobal');
    if (snapBtn) {
        const snapText = snapBtn.textContent || '';
        if (snapText.includes('Off')) return 0;
        if (snapText.includes('1/4')) return 4;
        if (snapText.includes('1/8')) return 8;
        if (snapText.includes('1/16')) return 16;
    }
    // Fall back to sequence snap value
    return window.SEQUENCER_SNAP_VALUE || 16;
}

// Snap a pixel position to the nearest grid line
function snapPixelToGrid(pixelPos, snapValue, pixelsPerSecond) {
    if (snapValue === 0) return pixelPos;
    const snapInSeconds = snapValue / 4 * (60 / (Tone.Transport.bpm?.value || 120));
    const snapInPixels = snapInSeconds * pixelsPerSecond;
    return Math.round(pixelPos / snapInPixels) * snapInPixels;
}

// --- Region Marker Update ---
function updateTimelineRegionMarkers() {
    const loopStartMarker = document.getElementById('timeline-loop-start-marker');
    const loopEndMarker = document.getElementById('timeline-loop-end-marker');
    const punchStartMarker = document.getElementById('timeline-punch-start-marker');
    const punchEndMarker = document.getElementById('timeline-punch-end-marker');
    const tracksArea = document.getElementById('timeline-tracks-area');
    if (!tracksArea) return;

    const TRACK_NAME_WIDTH = 120;
    const PIXELS_PER_SECOND = 50 * timelineZoomLevel;
    const totalBars = 16;
    const secondsPerBar = (60 / Tone.Transport.bpm.value) * 4;
    const totalSeconds = totalBars * secondsPerBar;
    const timelineWidth = TRACK_NAME_WIDTH + (totalSeconds * PIXELS_PER_SECOND);
    const contentWidth = timelineWidth - TRACK_NAME_WIDTH;

    // Helper to convert bars to pixels
    function barsToPixels(bars) {
        return TRACK_NAME_WIDTH + (bars / totalBars) * contentWidth;
    }

    // Get loop region from audio.js
    let loopStartBars = 0, loopEndBars = 16, loopEnabled = false;
    if (localAppServices.getLoopStartBars !== undefined) {
        loopStartBars = localAppServices.getLoopStartBars();
        loopEndBars = localAppServices.getLoopEndBars();
        loopEnabled = localAppServices.isLoopRegionEnabled ? localAppServices.isLoopRegionEnabled() : false;
    }
    if (loopEnabled && loopEndBars > loopStartBars) {
        const startX = barsToPixels(loopStartBars);
        const endX = barsToPixels(loopEndBars);
        // Loop: green vertical lines at start and end of region
        if (loopStartMarker) {
            loopStartMarker.style.left = `${startX}px`;
            loopStartMarker.style.display = 'block';
        }
        if (loopEndMarker) {
            loopEndMarker.style.left = `${endX}px`;
            loopEndMarker.style.display = 'block';
        }
    } else {
        if (loopStartMarker) loopStartMarker.style.display = 'none';
        if (loopEndMarker) loopEndMarker.style.display = 'none';
    }

    // Get punch region from audio.js
    let punchStartBars = 0, punchEndBars = 16, punchEnabled = false;
    if (localAppServices.getPunchInBars !== undefined) {
        punchStartBars = localAppServices.getPunchInBars();
        punchEndBars = localAppServices.getPunchOutBars();
        punchEnabled = localAppServices.isPunchRegionEnabled ? localAppServices.isPunchRegionEnabled() : false;
    }
    if (punchEnabled && punchEndBars > punchStartBars) {
        const startX = barsToPixels(punchStartBars);
        const endX = barsToPixels(punchEndBars);
        // Punch: orange vertical lines at start and end of region
        if (punchStartMarker) {
            punchStartMarker.style.left = `${startX}px`;
            punchStartMarker.style.display = 'block';
        }
        if (punchEndMarker) {
            punchEndMarker.style.left = `${endX}px`;
            punchEndMarker.style.display = 'block';
        }
    } else {
        if (punchStartMarker) punchStartMarker.style.display = 'none';
        if (punchEndMarker) punchEndMarker.style.display = 'none';
    }
}

// Export so main.js can call it when global controls change
export { updateTimelineRegionMarkers };
// --- Keyboard Shortcuts Help Window ---
export function showKeyboardShortcutsHelpWindow() {
    const windowId = 'keyboardShortcutsHelp';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId)) {
        openWindows.get(windowId).restore();
        return openWindows.get(windowId);
    }

    const shortcutsHTML = `
        <div style="padding: 15px; max-height: 400px; overflow-y: auto; font-family: sans-serif; font-size: 13px; color: #e0e0e0;">
            <h3 style="margin: 0 0 10px 0; color: #fff;">🎹 Keyboard Shortcuts</h3>
            
            <div style="margin-bottom: 15px;">
                <h4 style="color: #a0a0ff; margin: 5px 0;">▶️ Playback Controls</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Space</kbd></td><td>Play / Pause</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Enter</kbd></td><td>Stop</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">R</kbd></td><td>Toggle Record Arm</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+S</kbd></td><td>Save Project</td></tr>
                    <tr><td style="padding: 3px 0;"><button id="micTestBtnGlobal" title="Test Mic" class="px-2 py-1 text-xs border rounded bg-blue-400 hover:bg-blue-500 text-white dark:bg-blue-500 dark:hover:bg-blue-600 dark:border-blue-600 disabled:opacity-40">Test Mic</button></td><td>Mic Recording Test</td></tr>
                </table>
            </div>

            <div style="margin-bottom: 15px;">
                <h4 style="color: #a0a0ff; margin: 5px 0;">✂️ Edit Operations</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+Z</kbd></td><td>Undo</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+Y</kbd></td><td>Redo</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+Shift+Z</kbd></td><td>Redo (Alt)</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+C</kbd></td><td>Copy Sequencer Selection</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+Shift+C</kbd></td><td>Copy Section (Column Range)</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+X</kbd></td><td>Cut Selection</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+V</kbd></td><td>Paste</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+Shift+V</kbd></td><td>Paste Section (At Original Column)</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+A</kbd></td><td>Select All Notes</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+Shift+A</kbd></td><td>Deselect All Notes</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+D</kbd></td><td>Duplicate Sequence</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+Q</kbd></td><td>Quantize Selection</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+H</kbd></td><td>Humanize Velocities</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+E</kbd></td><td>Reverse Sequence</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+R</kbd></td><td>Flip Sequence</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+I</kbd></td><td>Invert Sequence</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Escape</kbd></td><td>Clear Selection</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Delete</kbd></td><td>Delete Selection</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+Shift+Up</kbd></td><td>Shift Notes Up</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+Shift+Down</kbd></td><td>Shift Notes Down</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+Alt+Up</kbd></td><td>Shift Notes Octave Up</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+Alt+Down</kbd></td><td>Shift Notes Octave Down</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+Shift+Left</kbd></td><td>Shift Notes Left</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+Shift+Right</kbd></td><td>Shift Notes Right</td></tr>
                </table>
            </div>

            <div style="margin-bottom: 15px;">
                <h4 style="color: #a0a0ff; margin: 5px 0;">🎵 Track Controls</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">M</kbd></td><td>Mute Track</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">S</kbd></td><td>Solo Track</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">1-8</kbd></td><td>Select Track 1-8</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Tab</kbd></td><td>Cycle to Next Track</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Shift+Tab</kbd></td><td>Cycle to Previous Track</td></tr>
                </table>
            </div>

            <div style="margin-bottom: 15px;">
                <h4 style="color: #a0a0ff; margin: 5px 0;">🎹 Piano Keys</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">A-L</kbd></td><td>Play C4-B4 (white keys)</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">W-U</kbd></td><td>Play C#4-A#4 (black keys)</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Z</kbd></td><td>Octave Down</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">X</kbd></td><td>Octave Up</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Q</kbd></td><td>Reset Octave</td></tr>
                </table>
            </div>

            <div style="margin-bottom: 15px;">
                <h4 style="color: #a0a0ff; margin: 5px 0;">🔧 Snap & Quantize</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">S</kbd></td><td>Cycle Snap (Off / 1/4 / 1/8 / 1/16)</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Ctrl+Q</kbd></td><td>Quantize Selection</td></tr>
                </table>
            </div>

            <div>
                <h4 style="color: #a0a0ff; margin: 5px 0;">📖 Other</h4>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">?</kbd></td><td>Show This Help</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">Esc</kbd></td><td>Close Window / Cancel</td></tr>
                    <tr><td style="padding: 3px 0;"><kbd style="background:#333;padding:2px 6px;border-radius:3px;">F11</kbd></td><td>Toggle Full Screen</td></tr>
                </table>
            </div>
        </div>
    `;

    const options = {
        width: Constants.KEYBOARD_SHORTCUTS_HELP_WIDTH || 600,
        height: Constants.KEYBOARD_SHORTCUTS_HELP_HEIGHT || 500,
        minWidth: 400,
        minHeight: 300,
        closable: true,
        minimizable: true,
        resizable: true,
        initialContentKey: windowId
    };

    const win = localAppServices.createWindow(windowId, Constants.KEYBOARD_SHORTCUTS_HELP_TITLE || 'Keyboard Shortcuts', shortcutsHTML, options);
    return win;
}

// --- Track Templates Window ---
export function openTrackTemplatesWindow(savedState = null) {
    const windowId = 'trackTemplates';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        openWindows.get(windowId).restore();
        return openWindows.get(windowId);
    }

    const templates = localAppServices.getTrackTemplates ? localAppServices.getTrackTemplates() : [];
    const hasTemplates = templates && templates.length > 0;

    const templatesListHTML = hasTemplates
        ? templates.map(t => `
            <div class="template-item p-2 border-b border-gray-600 dark:border-slate-600 hover:bg-purple-900/30 cursor-pointer" data-template-id="${t.id}">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="template-color w-3 h-3 rounded" style="background-color:${t.color || '#54a0ff'}"></span>
                        <span class="template-name font-medium text-slate-200">${t.name || 'Unnamed Template'}</span>
                        <span class="text-xs text-slate-400">(${t.type || 'Synth'})</span>
                    </div>
                    <div class="flex gap-1">
                        <button class="load-template-btn px-2 py-1 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded">Load</button>
                        <button class="delete-template-btn px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded">Delete</button>
                    </div>
                </div>
                ${t.activeEffects && t.activeEffects.length > 0 ? `<div class="text-xs text-slate-400 mt-1">FX: ${t.activeEffects.map(e => e.type || 'unknown').join(', ')}</div>` : ''}
            </div>
        `).join('')
        : '<p class="text-slate-400 italic text-center py-4">No templates saved yet. Use "Save Track as Template" from the track menu to save your first template.</p>';

    const contentHTML = `
        <div style="padding: 15px; font-family: sans-serif; font-size: 13px; color: #e0e0e0; height: 100%; display: flex; flex-direction: column;">
            <h3 style="margin: 0 0 10px 0; color: #fff;">📋 Track Templates</h3>
            <div id="trackTemplatesList" class="flex-grow overflow-y-auto border border-slate-600 rounded bg-slate-800 mb-2" style="min-height: 150px;">
                ${templatesListHTML}
            </div>
            <div class="text-xs text-slate-500">Click "Load" to apply a template to a selected track, or "Delete" to remove it.</div>
        </div>
    `;

    const options = {
        width: 450,
        height: 350,
        minWidth: 350,
        minHeight: 250,
        closable: true,
        minimizable: true,
        resizable: true,
        initialContentKey: windowId
    };

    const win = localAppServices.createWindow(windowId, 'Track Templates', contentHTML, options);

    // Wire up load/delete buttons
    if (hasTemplates && win && win.element) {
        const listContainer = win.element.querySelector('#trackTemplatesList');
        if (listContainer) {
            listContainer.querySelectorAll('.template-item').forEach(item => {
                const templateId = parseInt(item.dataset.templateId, 10);
                const loadBtn = item.querySelector('.load-template-btn');
                const deleteBtn = item.querySelector('.delete-template-btn');
                if (loadBtn) {
                    loadBtn.addEventListener('click', () => {
                        const tracks = localAppServices.getTracks ? localAppServices.getTracks() : [];
                        if (tracks.length === 0) { showNotification('No tracks available to apply template', 2000); return; }
                        // Prefer the currently active sequencer track (what the user is interacting with),
                        // then the ghost/selected track, and only fall back to the first track if neither is set.
                        const targetTrack = (localAppServices.getActiveTrackForInteraction && localAppServices.getActiveTrackForInteraction())
                            || tracks[0];
                        const template = localAppServices.getTrackTemplateById ? localAppServices.getTrackTemplateById(templateId) : null;
                        if (!template) { showNotification('Template not found', 2000); return; }
                        if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Apply Template "${template.name}" to ${targetTrack.name}`);
                        if (template.synthParams && targetTrack.synthParams !== undefined) {
                            Object.keys(template.synthParams).forEach(k => { if (targetTrack.setSynthParam) targetTrack.setSynthParam(k, template.synthParams[k]); });
                        }
                        if (template.activeEffects && Array.isArray(template.activeEffects)) {
                            // Clear existing effects and apply template effects
                            while (targetTrack.activeEffects && targetTrack.activeEffects.length > 0) {
                                const eff = targetTrack.activeEffects[0];
                                if (targetTrack.removeEffect) targetTrack.removeEffect(eff.id);
                            }
                            template.activeEffects.forEach(effDef => {
                                if (targetTrack.addEffect) targetTrack.addEffect(effDef.type);
                            });
                        }
                        if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(targetTrack.id, 'inspectorUpdated');
                        showNotification(`Template "${template.name}" applied to ${targetTrack.name}`, 2000);
                    });
                }
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => {
                        const template = localAppServices.getTrackTemplateById ? localAppServices.getTrackTemplateById(templateId) : null;
                        if (localAppServices.removeTrackTemplate) {
                            localAppServices.removeTrackTemplate(templateId);
                            showNotification(`Template "${template ? template.name : 'Template'}" deleted`, 2000);
                            // Refresh window
                            if (localAppServices.getOpenWindows) {
                                const wins = localAppServices.getOpenWindows();
                                const tw = wins.get(windowId);
                                if (tw && tw.close) tw.close(true);
                            }
                            openTrackTemplatesWindow();
                        }
                    });
                }
            });
        }
    }

    return win;
}

// --- Scale Mode Window ---
export function openScaleModeWindow(savedState = null) {
    const windowId = 'scaleMode';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        openWindows.get(windowId).restore();
        return openWindows.get(windowId);
    }

    function getCurrentSettings() {
        return {
            enabled: localAppServices.getScaleModeEnabled ? localAppServices.getScaleModeEnabled() : false,
            scale: localAppServices.getScaleModeScale ? localAppServices.getScaleModeScale() : 'Major',
            root: localAppServices.getScaleModeRoot ? localAppServices.getScaleModeRoot() : 'C',
            lock: localAppServices.getScaleModeLock ? localAppServices.getScaleModeLock() : false
        };
    }

    const current = getCurrentSettings();
    const scalesList = Object.keys(Constants.SCALES || {});
    const rootsList = Constants.SCALE_ROOTS || ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

    const contentHTML = `
        <div style="padding: 15px; font-family: sans-serif; font-size: 13px; color: #e0e0e0; height: 100%; display: flex; flex-direction: column; gap: 12px;">
            <h3 style="margin: 0; color: #fff;">🎹 Scale Mode</h3>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="scaleModeEnabled" ${current.enabled ? 'checked' : ''} />
                <span>Enable Scale Mode</span>
            </label>
            <div style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 4px; color: #94a3b8;">Scale</label>
                    <select id="scaleModeScale" style="width: 100%; padding: 6px; border-radius: 4px; background: #1e293b; color: #e2e8f0; border: 1px solid #475569;">
                        ${scalesList.map(s => `<option value="${s}" ${s === current.scale ? 'selected' : ''}>${s}</option>`).join('')}
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 4px; color: #94a3b8;">Root</label>
                    <select id="scaleModeRoot" style="width: 100%; padding: 6px; border-radius: 4px; background: #1e293b; color: #e2e8f0; border: 1px solid #475569;">
                        ${rootsList.map(r => `<option value="${r}" ${r === current.root ? 'selected' : ''}>${r}</option>`).join('')}
                    </select>
                </div>
            </div>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="scaleModeLock" ${current.lock ? 'checked' : ''} />
                <span>Lock (only allow notes within the scale)</span>
            </label>
            <div id="scaleModePreview" style="padding: 8px; background: #0f172a; border-radius: 4px; font-size: 12px; color: #94a3b8;">
                Notes: ${current.scale} / ${current.root}
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: auto;">
                <button id="saveScaleModeBtn" style="padding: 6px 16px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer;">Save</button>
            </div>
        </div>
    `;

    const options = {
        width: 400,
        height: 350,
        minWidth: 300,
        minHeight: 250,
        closable: true,
        minimizable: true,
        resizable: true,
        initialContentKey: windowId
    };

    const win = localAppServices.createWindow(windowId, 'Scale Mode', contentHTML, options);

    if (win && win.element) {
        const enabledCheckbox = win.element.querySelector('#scaleModeEnabled');
        const scaleSelect = win.element.querySelector('#scaleModeScale');
        const rootSelect = win.element.querySelector('#scaleModeRoot');
        const lockCheckbox = win.element.querySelector('#scaleModeLock');
        const saveBtn = win.element.querySelector('#saveScaleModeBtn');

        const updatePreview = () => {
            const scale = scaleSelect?.value || 'Major';
            const root = rootSelect?.value || 'C';
            const preview = win.element.querySelector('#scaleModePreview');
            if (preview) preview.textContent = `Notes: ${scale} / ${root}`;
        };

        scaleSelect?.addEventListener('change', updatePreview);
        rootSelect?.addEventListener('change', updatePreview);

        saveBtn?.addEventListener('click', () => {
            const enabled = enabledCheckbox?.checked || false;
            const scale = scaleSelect?.value || 'Major';
            const root = rootSelect?.value || 'C';
            const lock = lockCheckbox?.checked || false;

            if (localAppServices.setScaleModeEnabled) localAppServices.setScaleModeEnabled(enabled);
            if (localAppServices.setScaleModeScale) localAppServices.setScaleModeScale(scale);
            if (localAppServices.setScaleModeRoot) localAppServices.setScaleModeRoot(root);
            if (localAppServices.setScaleModeLock) localAppServices.setScaleModeLock(lock);

            showNotification('Scale Mode settings saved.', 1500);
        });
    }

    return win;
}

// --- MIDI CC Mappings Window ---
export function openMidiCCMappingsWindow(savedState = null) {
    const windowId = 'midiCCMappings';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        openWindows.get(windowId).restore();
        return openWindows.get(windowId);
    }

    function buildMappingsListHTML() {
        const mappings = typeof getMidiCCMappings === 'function' ? getMidiCCMappings() : {};
        const entries = Object.entries(mappings);

        if (entries.length === 0) {
            return '<p class="text-slate-400 italic text-center py-4">No MIDI CC mappings configured. Right-click any knob and select "Assign MIDI CC..." to create a mapping.</p>';
        }

        return entries.map(([targetId, mapping]) => {
            const entry = window._midiCCKnobRegistry ? window._midiCCKnobRegistry[targetId] : null;
            const ownerInfo = entry ? `${entry.ownerType || 'unknown'} / ${entry.ownerId || 'unknown'} / ${entry.paramPath || 'unknown'}` : targetId;
            return `
                <div class="mapping-item p-2 border-b border-gray-600 dark:border-slate-600 hover:bg-slate-700/50" data-target-id="${targetId}">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            <span class="cc-badge px-2 py-0.5 text-xs font-mono bg-purple-700 text-purple-200 rounded">CC ${mapping.cc}</span>
                            <span class="ch-badge text-xs text-slate-400">Ch ${(mapping.channel || 0) + 1}</span>
                            <span class="range-badge text-xs text-slate-500">${mapping.min?.toFixed(2) || 0} – ${mapping.max?.toFixed(2) || 1}</span>
                        </div>
                        <button class="remove-mapping-btn px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded" data-target-id="${targetId}">Remove</button>
                    </div>
                    <div class="text-xs text-slate-400 mt-1 truncate" title="${ownerInfo}">${ownerInfo}</div>
                </div>
            `;
        }).join('');
    }

    function renderMappingsList(listContainer) {
        if (!listContainer) return;
        listContainer.innerHTML = buildMappingsListHTML();

        listContainer.querySelectorAll('.remove-mapping-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetId = btn.dataset.targetId;
                if (typeof removeMidiCCMapping === 'function') {
                    removeMidiCCMapping(targetId);
                    showNotification(`MIDI CC mapping removed.`, 2000);
                }
                renderMappingsList(listContainer);
            });
        });
    }

    const contentHTML = `
        <div style="padding: 15px; font-family: sans-serif; font-size: 13px; color: #e0e0e0; height: 100%; display: flex; flex-direction: column;">
            <h3 style="margin: 0 0 10px 0; color: #fff;">🎹 MIDI CC Mappings</h3>
            <div id="midiMappingsList" class="flex-grow overflow-y-auto border border-slate-600 rounded bg-slate-800 mb-2" style="min-height: 150px;">
                ${buildMappingsListHTML()}
            </div>
            <div class="text-xs text-slate-500">Mappings are saved with your project. Click "Remove" to delete a mapping.</div>
        </div>
    `;

    const options = {
        width: 480,
        height: 380,
        minWidth: 350,
        minHeight: 280,
        closable: true,
        minimizable: true,
        resizable: true,
        initialContentKey: windowId
    };

    const win = localAppServices.createWindow(windowId, 'MIDI CC Mappings', contentHTML, options);

    if (win && win.element) {
        const listContainer = win.element.querySelector('#midiMappingsList');
        renderMappingsList(listContainer);
    }

    return win;
}

// --- Chord Mode Window ---
export function openChordModeWindow(savedState = null) {
    const windowId = 'chordMode';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        openWindows.get(windowId).restore();
        return openWindows.get(windowId);
    }

    function getCurrentChordSettings() {
        return {
            enabled: localAppServices.getChordModeEnabled ? localAppServices.getChordModeEnabled() : false,
            root: localAppServices.getChordModeRoot ? localAppServices.getChordModeRoot() : 0,
            type: localAppServices.getChordModeType ? localAppServices.getChordModeType() : 'major',
            lock: localAppServices.getChordModeLock ? localAppServices.getChordModeLock() : false,
            voicing: localAppServices.getChordVoicing ? localAppServices.getChordVoicing() : 'closed'
        };
    }

    const current = getCurrentChordSettings();
    const rootsList = Constants.SCALE_ROOTS || ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const typesList = Object.keys(Constants.CHORD_TYPES || {});
    const voicingList = Constants.CHORD_VOICINGS || ['closed', 'wide', 'drop2', 'rootless'];

    function getChordNotes(rootIndex, chordType) {
        const intervals = Constants.CHORD_TYPES?.[chordType] || [0, 4, 7];
        const noteNames = rootsList;
        return intervals.map(i => noteNames[(rootIndex + i) % 12]);
    }

    const chordNotes = getChordNotes(current.root, current.type);
    const previewNotes = chordNotes.join(' - ');

    const contentHTML = `
        <div style="padding: 15px; font-family: sans-serif; font-size: 13px; color: #e0e0e0; height: 100%; display: flex; flex-direction: column; gap: 12px;">
            <h3 style="margin: 0; color: #fff;">🎸 Chord Mode</h3>
            <label style="display: flex; align-items: center; gap: 8px;">
                <input type="checkbox" id="chordModeEnabled" ${current.enabled ? 'checked' : ''} />
                <span>Enable Chord Mode</span>
            </label>
            <div style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 4px; color: #94a3b8;">Root</label>
                    <select id="chordModeRoot" style="width: 100%; padding: 6px; border-radius: 4px; background: #1e293b; color: #e2e8f0; border: 1px solid #475569;">
                        ${rootsList.map((r, i) => `<option value="${i}" ${i === current.root ? 'selected' : ''}>${r}</option>`).join('')}
                    </select>
                </div>
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 4px; color: #94a3b8;">Type</label>
                    <select id="chordModeType" style="width: 100%; padding: 6px; border-radius: 4px; background: #1e293b; color: #e2e8f0; border: 1px solid #475569;">
                        ${typesList.map(t => `<option value="${t}" ${t === current.type ? 'selected' : ''}>${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div style="display: flex; gap: 10px;">
                <div style="flex: 1;">
                    <label style="display: block; margin-bottom: 4px; color: #94a3b8;">Voicing</label>
                    <select id="chordModeVoicing" style="width: 100%; padding: 6px; border-radius: 4px; background: #1e293b; color: #e2e8f0; border: 1px solid #475569;">
                        ${voicingList.map(v => `<option value="${v}" ${v === current.voicing ? 'selected' : ''}>${v.charAt(0).toUpperCase() + v.slice(1)}</option>`).join('')}
                    </select>
                </div>
                <div style="flex: 1; display: flex; align-items: flex-end;">
                    <label style="display: flex; align-items: center; gap: 8px;">
                        <input type="checkbox" id="chordModeLock" ${current.lock ? 'checked' : ''} />
                        <span>Lock</span>
                    </label>
                </div>
            </div>
            <div id="chordModePreview" style="padding: 8px; background: #0f172a; border-radius: 4px; font-size: 12px; color: #94a3b8;">
                Notes: ${previewNotes}
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: auto;">
                <button id="saveChordModeBtn" style="padding: 6px 16px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer;">Save</button>
            </div>
        </div>
    `;

    const options = {
        width: 400,
        height: 380,
        minWidth: 300,
        minHeight: 280,
        closable: true,
        minimizable: true,
        resizable: true,
        initialContentKey: windowId
    };

    if (savedState) Object.assign(options, { x: parseInt(savedState.left, 10), y: parseInt(savedState.top, 10), width: parseInt(savedState.width, 10), height: parseInt(savedState.height, 10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });

    const win = localAppServices.createWindow(windowId, 'Chord Mode', contentHTML, options);

    if (win && win.element) {
        const enabledCheckbox = win.element.querySelector('#chordModeEnabled');
        const rootSelect = win.element.querySelector('#chordModeRoot');
        const typeSelect = win.element.querySelector('#chordModeType');
        const voicingSelect = win.element.querySelector('#chordModeVoicing');
        const lockCheckbox = win.element.querySelector('#chordModeLock');
        const saveBtn = win.element.querySelector('#saveChordModeBtn');

        const updatePreview = () => {
            const root = parseInt(rootSelect?.value || '0', 10);
            const type = typeSelect?.value || 'major';
            const notes = getChordNotes(root, type);
            const preview = win.element.querySelector('#chordModePreview');
            if (preview) preview.textContent = `Notes: ${notes.join(' - ')}`;
        };

        rootSelect?.addEventListener('change', updatePreview);
        typeSelect?.addEventListener('change', updatePreview);

        saveBtn?.addEventListener('click', () => {
            const enabled = enabledCheckbox?.checked || false;
            const root = parseInt(rootSelect?.value || '0', 10);
            const type = typeSelect?.value || 'major';
            const voicing = voicingSelect?.value || 'closed';
            const lock = lockCheckbox?.checked || false;

            if (localAppServices.setChordModeEnabled) localAppServices.setChordModeEnabled(enabled);
            if (localAppServices.setChordModeRoot) localAppServices.setChordModeRoot(root