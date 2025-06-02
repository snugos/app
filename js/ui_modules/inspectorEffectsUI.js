// js/ui_modules/inspectorEffectsUI.js
import { SnugWindow } from '../SnugWindow.js'; 
import { showNotification, createDropZoneHTML, setupGenericDropZoneListeners, showCustomModal, createContextMenu, showConfirmationDialog } from '../utils.js';
import * as Constants from '../constants.js';
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
} from '../eventHandlers.js'; 

let localAppServices = {};

export function initializeInspectorEffectsUI(appServicesFromMain) {
    localAppServices = appServicesFromMain;
    if (!localAppServices.effectsRegistryAccess) {
        console.warn("[InspectorEffectsUI Module] effectsRegistryAccess not found in appServices. Effect-related UI might be limited.");
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
export function createKnob(options) {
    const container = document.createElement('div');
    // Tailwind: flex column, items-center, margin, min-width for consistent sizing
    container.className = 'knob-container flex flex-col items-center mx-1 my-1 min-w-[60px]';

    const labelEl = document.createElement('div');
    // Tailwind: text size, color, margin, whitespace handling for labels
    labelEl.className = 'knob-label text-xs text-gray-400 dark:text-slate-400 mb-0.5 whitespace-nowrap overflow-hidden text-ellipsis max-w-full text-center';
    labelEl.textContent = options.label || '';
    labelEl.title = options.label || ''; // Keep title for full text on hover
    container.appendChild(labelEl);

    const knobEl = document.createElement('div');
    // Tailwind: dimensions, background, border, shadow, rounded, position relative for handle
    knobEl.className = 'knob w-9 h-9 bg-gray-700 dark:bg-slate-600 rounded-full relative border border-gray-900 dark:border-slate-800 shadow-md';
    const handleEl = document.createElement('div');
    // Tailwind: dimensions, background, position absolute, transform origin for rotation
    handleEl.className = 'knob-handle w-1 h-2.5 bg-gray-400 dark:bg-slate-300 absolute top-0.5 left-1/2 rounded-sm'; // Adjusted for centering
    handleEl.style.transformOrigin = '50% 100%'; // Rotate around bottom-center
    knobEl.appendChild(handleEl);
    container.appendChild(knobEl);

    const valueEl = document.createElement('div');
    // Tailwind: text size, color, margin, min-height for stability
    valueEl.className = 'knob-value text-xs text-gray-500 dark:text-slate-400 mt-0.5 min-h-[1em] text-center';
    container.appendChild(valueEl);

    let currentValue = options.initialValue === undefined ? (options.min !== undefined ? options.min : 0) : options.initialValue;
    const min = options.min === undefined ? 0 : options.min;
    const max = options.max === undefined ? 100 : options.max;
    const step = options.step === undefined ? 1 : options.step;
    const range = max - min;
    const maxDegrees = options.maxDegrees || 270; // Total rotation range (e.g., -135 to +135)
    const BASE_PIXELS_PER_FULL_RANGE_MOUSE = 300; // Pixels of mouse drag for full knob range
    const BASE_PIXELS_PER_FULL_RANGE_TOUCH = 450; // Pixels of touch drag for full knob range
    let initialValueBeforeInteraction = currentValue;

    let mouseDownListener = null;
    let touchStartListener = null;

    function updateKnobVisual(disabled = false) {
        const percentage = range === 0 ? 0 : (currentValue - min) / range;
        // Calculate rotation: 0% = -maxDegrees/2, 50% = 0, 100% = +maxDegrees/2
        const rotation = (percentage * maxDegrees) - (maxDegrees / 2);
        handleEl.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        valueEl.textContent = typeof currentValue === 'number' ? currentValue.toFixed(options.decimals !== undefined ? options.decimals : (step < 1 && step !== 0 ? 2 : 0)) : currentValue;
        if (options.displaySuffix) valueEl.textContent += options.displaySuffix;
        
        knobEl.style.cursor = disabled ? 'not-allowed' : 'ns-resize'; // North-south resize cursor indicates vertical drag
        knobEl.style.opacity = disabled ? '0.5' : '1';

        // Remove old listeners before adding new ones to prevent duplicates
        if (mouseDownListener) knobEl.removeEventListener('mousedown', mouseDownListener);
        if (touchStartListener) knobEl.removeEventListener('touchstart', touchStartListener);

        if (!disabled) {
            mouseDownListener = (e) => handleInteraction(e, false);
            touchStartListener = (e) => handleInteraction(e, true);
            knobEl.addEventListener('mousedown', mouseDownListener);
            knobEl.addEventListener('touchstart', touchStartListener, { passive: false }); // passive: false to allow preventDefault
        } else {
            mouseDownListener = null; // Clear references
            touchStartListener = null;
        }
    }

    function setValue(newValue, triggerCallback = true, fromInteraction = false) {
        const numValue = parseFloat(newValue);
        if (isNaN(numValue)) return;

        let boundedValue = Math.min(max, Math.max(min, numValue));
        if (step !== 0) { // Ensure stepping works correctly
            boundedValue = Math.round(boundedValue / step) * step;
        }
        // Final clamp after stepping
        boundedValue = Math.min(max, Math.max(min, boundedValue));

        const oldValue = currentValue;
        currentValue = boundedValue;
        updateKnobVisual(options.disabled); // Update visual based on current disabled state
        if (triggerCallback && options.onValueChange && (oldValue !== currentValue || fromInteraction) ) {
            options.onValueChange(currentValue, oldValue, fromInteraction);
        }
    }

    function handleInteraction(e, isTouch = false) {
        e.preventDefault(); // Prevent page scroll on touch, or text selection on mouse drag
        e.stopPropagation(); // Prevent triggering other listeners (e.g., window drag)
        initialValueBeforeInteraction = currentValue;

        const startY = isTouch ? e.touches[0].clientY : e.clientY;
        const startValue = currentValue;
        const pixelsForFullRange = isTouch ? BASE_PIXELS_PER_FULL_RANGE_TOUCH : BASE_PIXELS_PER_FULL_RANGE_MOUSE;
        const currentSensitivity = options.sensitivity === undefined ? 1 : options.sensitivity; // Allow sensitivity adjustment

        function onMove(moveEvent) {
            if (isTouch && moveEvent.touches.length === 0) return; // No active touch
            const currentY = isTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
            const deltaY = startY - currentY; // Inverted: moving mouse up increases value
            
            let valueChange = (deltaY / pixelsForFullRange) * range * currentSensitivity;
            let newValue = startValue + valueChange;
            setValue(newValue, true, true); // Update value, trigger callback, indicate it's from interaction
        }

        function onEnd() {
            document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove);
            document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
            // Capture undo state only if the value actually changed
            if (currentValue !== initialValueBeforeInteraction && localAppServices.captureStateForUndo) {
                let description = `Change ${options.label || 'knob'} to ${valueEl.textContent}`;
                if (options.trackRef && options.trackRef.name) {
                    description = `Change ${options.label || 'knob'} for ${options.trackRef.name} to ${valueEl.textContent}`;
                }
                localAppServices.captureStateForUndo(description);
            }
        }
        document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove, { passive: !isTouch }); // passive false for touchmove to allow preventDefault if needed inside onMove
        document.addEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
    }
    
    options.disabled = !!options.disabled; // Ensure it's a boolean
    setValue(currentValue, false); // Initial visual update

    return {
        element: container,
        setValue,
        getValue: () => currentValue,
        type: 'knob', // For identification if needed
        refreshVisuals: (disabledState) => { // Method to externally update disabled state and visuals
            options.disabled = !!disabledState;
            updateKnobVisual(options.disabled);
        }
    };
}

// --- Specific Inspector DOM Builders ---
function buildSynthSpecificInspectorDOM(track) {
    const engineType = track.synthEngineType || 'MonoSynth';
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
    // Tailwind: grid layout, gap, padding
    let controlsHTML = `<div id="synthEngineControls-${track.id}" class="grid grid-cols-2 md:grid-cols-3 gap-x-2 gap-y-1 p-1">`;
    definitions.forEach(def => {
        // Placeholder div will be filled by createKnob or select element
        controlsHTML += `<div id="${def.idPrefix}-${track.id}-placeholder" class="min-h-[60px]"></div>`;
    });
    controlsHTML += `</div>`;
    return controlsHTML;
}

function buildSamplerSpecificInspectorDOM(track) {
    // Tailwind classes for layout, borders, backgrounds, text, etc.
    return `<div class="sampler-controls p-1 space-y-2">
        <div id="dropZoneContainer-${track.id}-sampler" class="mb-2"></div>
        <div class="waveform-section border border-gray-300 dark:border-slate-600 rounded p-1 bg-gray-100 dark:bg-slate-700">
            <canvas id="waveformCanvas-${track.id}" class="w-full h-24 bg-white dark:bg-slate-800 rounded shadow-inner"></canvas>
        </div>
        <div class="slice-editor-controls mt-2 p-1 border border-gray-300 dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-700 space-y-1">
            <h4 class="text-xs font-semibold text-gray-700 dark:text-slate-200">Slice Editor (Selected: <span id="selectedSliceInfo-${track.id}">1</span>)</h4>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-1 items-center text-xs">
                <div id="sliceVolumeSlider-${track.id}-placeholder"></div>
                <div id="slicePitchKnob-${track.id}-placeholder"></div>
                <button id="sliceLoopToggle-${track.id}" class="px-1.5 py-0.5 text-xs border border-gray-300 dark:border-slate-500 rounded text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600">Loop: OFF</button>
                <button id="sliceReverseToggle-${track.id}" class="px-1.5 py-0.5 text-xs border border-gray-300 dark:border-slate-500 rounded text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600">Rev: OFF</button>
            </div>
            <div class="text-xs font-medium mt-1 text-gray-600 dark:text-slate-300">Envelope:</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 items-center text-xs">
                <div id="sliceEnvAttackSlider-${track.id}-placeholder"></div>
                <div id="sliceEnvDecaySlider-${track.id}-placeholder"></div>
                <div id="sliceEnvSustainSlider-${track.id}-placeholder"></div>
                <div id="sliceEnvReleaseSlider-${track.id}-placeholder"></div>
            </div>
            </div>
        <div id="samplePadsContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>
        <div><button id="slicerPolyphonyToggle-${track.id}" class="text-xs px-2 py-1 border border-gray-300 dark:border-slate-500 rounded mt-1 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600">Mode: Poly</button></div>
    </div>`;
}

function buildDrumSamplerSpecificInspectorDOM(track) {
    // Tailwind classes for layout and styling
    return `<div class="drum-sampler-controls p-1 space-y-2">
        <div class="selected-pad-controls p-1 border border-gray-300 dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-700 space-y-1">
            <h4 class="text-xs font-semibold text-gray-700 dark:text-slate-200">Edit Pad: <span id="selectedDrumPadInfo-${track.id}">1</span></h4>
            <div id="drumPadDropZoneContainer-${track.id}-${track.selectedDrumPadForEdit}" class="mb-1 text-xs"></div>
            <div class="grid grid-cols-2 gap-x-2 gap-y-1 items-center text-xs">
                <div id="drumPadVolumeKnob-${track.id}-placeholder"></div>
                <div id="drumPadPitchKnob-${track.id}-placeholder"></div>
            </div>
            <div class="text-xs font-medium mt-1 text-gray-600 dark:text-slate-300">Envelope:</div>
             <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 items-center text-xs">
                <div id="drumPadEnvAttack-${track.id}-placeholder"></div>
                <div id="drumPadEnvDecay-${track.id}-placeholder"></div>
                <div id="drumPadEnvSustain-${track.id}-placeholder"></div>
                <div id="drumPadEnvRelease-${track.id}-placeholder"></div>
            </div>
            <div class="text-xs font-medium mt-2 pt-1 border-t border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300">Auto-Stretch:</div>
            <div class="grid grid-cols-2 gap-x-2 gap-y-1 items-center text-xs">
                <button id="drumPadAutoStretchToggle-${track.id}" class="px-1.5 py-0.5 text-xs border border-gray-300 dark:border-slate-500 rounded text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600">Stretch: OFF</button>
                <div>
                    <label for="drumPadStretchBPM-${track.id}" class="block text-[10px] font-medium text-gray-500 dark:text-slate-400">Orig. BPM:</label>
                    <input type="number" id="drumPadStretchBPM-${track.id}" step="0.1" class="w-full p-0.5 border border-gray-300 dark:border-slate-500 rounded text-[10px] bg-white dark:bg-slate-600 text-gray-800 dark:text-slate-200">
                </div>
                <div>
                    <label for="drumPadStretchBeats-${track.id}" class="block text-[10px] font-medium text-gray-500 dark:text-slate-400">Beats:</label>
                    <input type="number" id="drumPadStretchBeats-${track.id}" step="0.01" class="w-full p-0.5 border border-gray-300 dark:border-slate-500 rounded text-[10px] bg-white dark:bg-slate-600 text-gray-800 dark:text-slate-200">
                </div>
            </div>
         </div>
        <div id="drumPadsGridContainer-${track.id}" class="grid grid-cols-4 gap-1 mt-2"></div>
    </div>`;
}

function buildInstrumentSamplerSpecificInspectorDOM(track) {
    // Tailwind classes for layout and styling
    return `<div class="instrument-sampler-controls p-1 space-y-2">
        <div id="dropZoneContainer-${track.id}-instrumentsampler" class="mb-2"></div>
        <div class="waveform-section border border-gray-300 dark:border-slate-600 rounded p-1 bg-gray-100 dark:bg-slate-700">
           <canvas id="instrumentWaveformCanvas-${track.id}" class="w-full h-24 bg-white dark:bg-slate-800 rounded shadow-inner"></canvas>
        </div>
        <div class="instrument-params-controls mt-2 p-1 border border-gray-300 dark:border-slate-600 rounded bg-gray-50 dark:bg-slate-700 space-y-1 text-xs">
            <div class="grid grid-cols-2 gap-2 items-center">
                <div>
                    <label for="instrumentRootNote-${track.id}" class="block text-xs font-medium text-gray-600 dark:text-slate-300">Root Note:</label>
                    <select id="instrumentRootNote-${track.id}" class="w-full p-1 border border-gray-300 dark:border-slate-500 rounded text-xs bg-gray-50 dark:bg-slate-600 text-gray-800 dark:text-slate-200"></select>
                </div>
                <div>
                    <label for="instrumentLoopToggle-${track.id}" class="block text-xs font-medium text-gray-600 dark:text-slate-300">Loop:</label>
                    <button id="instrumentLoopToggle-${track.id}" class="px-2 py-1 text-xs border border-gray-300 dark:border-slate-500 rounded w-full text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600">Loop: OFF</button>
                </div>
                <div>
                    <label for="instrumentLoopStart-${track.id}" class="block text-xs font-medium text-gray-600 dark:text-slate-300">Loop Start (s):</label>
                    <input type="number" id="instrumentLoopStart-${track.id}" step="0.001" class="w-full p-1 border border-gray-300 dark:border-slate-500 rounded text-xs bg-white dark:bg-slate-600 text-gray-800 dark:text-slate-200">
                </div>
                <div>
                    <label for="instrumentLoopEnd-${track.id}" class="block text-xs font-medium text-gray-600 dark:text-slate-300">Loop End (s):</label>
                    <input type="number" id="instrumentLoopEnd-${track.id}" step="0.001" class="w-full p-1 border border-gray-300 dark:border-slate-500 rounded text-xs bg-white dark:bg-slate-600 text-gray-800 dark:text-slate-200">
                </div>
            </div>
             <div class="text-xs font-medium mt-1 text-gray-600 dark:text-slate-300">Envelope:</div>
             <div class="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1 items-center text-xs">
                <div id="instrumentEnvAttack-${track.id}-placeholder"></div>
                <div id="instrumentEnvDecay-${track.id}-placeholder"></div>
                <div id="instrumentEnvSustain-${track.id}-placeholder"></div>
                <div id="instrumentEnvRelease-${track.id}-placeholder"></div>
            </div>
            <div><button id="instrumentPolyphonyToggle-${track.id}" class="text-xs px-2 py-1 border border-gray-300 dark:border-slate-500 rounded mt-1 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600">Mode: Poly</button></div>
        </div>
    </div>`;
}

// --- Specific Inspector Control Initializers ---
function buildSynthEngineControls(track, container, engineType) {
    const definitions = localAppServices.effectsRegistryAccess?.synthEngineControlDefinitions?.[engineType] || [];
    definitions.forEach(def => {
        const selector = `#${def.idPrefix}-${track.id}-placeholder`;
        const placeholder = container.querySelector(selector);
        if (!placeholder) {
            console.warn(`[InspectorEffectsUI buildSynthEngineControls] Placeholder not found for: ${selector} in container:`, container);
            return;
        }
        let initialValue;
        const pathParts = def.path.split('.');
        let currentValObj = track.synthParams;
        for (const key of pathParts) {
            if (currentValObj && typeof currentValObj === 'object' && key in currentValObj) {
                currentValObj = currentValObj[key];
            } else { currentValObj = undefined; break; }
        }
        initialValue = (currentValObj !== undefined) ? currentValObj : def.defaultValue;
        
        // If the path points to a signal's value (e.g., 'filter.frequency.value')
        // and the instrument exists, try to get the current signal value directly from the Tone.js object.
        if (def.path.endsWith('.value') && track.instrument?.get) { 
            const signalPath = def.path.substring(0, def.path.lastIndexOf('.value'));
            try {
                const signal = track.instrument.get(signalPath); // Tone.js 'get' method
                if (signal && typeof signal.value !== 'undefined') {
                    initialValue = signal.value;
                }
            } catch (e) {
                // It's okay if 'get' fails (e.g., path doesn't exist on the instrument instance yet)
                // console.warn(`Error getting signal value for path ${signalPath} on track ${track.id}: ${e.message}`);
            }
        }


        if (def.type === 'knob') {
            const knob = createKnob({ 
                label: def.label, 
                min: def.min, max: def.max, step: def.step, 
                initialValue, 
                decimals: def.decimals, 
                displaySuffix: def.displaySuffix, 
                trackRef: track, // Pass track for context in undo description
                onValueChange: (val, oldVal, fromInteraction) => {
                    track.setSynthParam(def.path, val);
                    // Undo capture is handled by the knob itself on interaction end
                }
            });
            placeholder.innerHTML = ''; placeholder.appendChild(knob.element);
            track.inspectorControls[def.idPrefix] = knob; // Store knob instance
        } else if (def.type === 'select') {
            const selectEl = document.createElement('select');
            selectEl.id = `${def.idPrefix}-${track.id}`;
            // Tailwind: base select styling
            selectEl.className = 'synth-param-select w-full p-1.5 border border-gray-300 dark:border-slate-600 rounded shadow-sm focus:ring-blue-500 focus:border-blue-500 text-xs bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200';
            def.options.forEach(opt => {
                const option = document.createElement('option');
                option.value = typeof opt === 'object' ? opt.value : opt;
                option.textContent = typeof opt === 'object' ? opt.text : opt;
                selectEl.appendChild(option);
            });
            selectEl.value = initialValue;
            selectEl.addEventListener('change', (e) => {
                if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Change ${def.label} for ${track.name} to ${e.target.value}`);
                track.setSynthParam(def.path, e.target.value);
            });
            const labelEl = document.createElement('label');
            labelEl.htmlFor = selectEl.id;
            labelEl.textContent = def.label + ':';
            // Tailwind: label styling
            labelEl.className = 'text-xs block mb-0.5 text-gray-600 dark:text-slate-300';
            const wrapperDiv = document.createElement('div');
            // Tailwind: flex container for label and select
            wrapperDiv.className = 'flex flex-col items-start w-full';
            wrapperDiv.appendChild(labelEl);
            wrapperDiv.appendChild(selectEl);
            placeholder.innerHTML = ''; // Clear placeholder
            placeholder.appendChild(wrapperDiv);
            track.inspectorControls[def.idPrefix] = selectEl; // Store select instance
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

// --- Shared Dropzone Setup for Samplers using Interact.js ---
function setupSamplerInteractDropzone(dropZoneElement, trackId, targetType, padIndex = null) {
    if (!window.interact || !dropZoneElement) {
        console.warn(`[InspectorEffectsUI setupSamplerInteractDropzone] Interact.js not loaded or dropZoneElement missing for track ${trackId}, type ${targetType}`);
        return;
    }

    interact(dropZoneElement).unset(); // Clear previous interactable if any
    interact(dropZoneElement)
        .dropzone({
            accept: '.dragging-sound-item', // Only accept items with this class (set on drag start)
            ondropactivate: function (event) {
                event.target.classList.add('border-blue-500', 'dark:border-blue-400'); // Tailwind: active drop target
            },
            ondragenter: function (event) {
                event.target.classList.add('bg-blue-100', 'dark:bg-slate-600'); // Tailwind: hover over drop target
                if (event.relatedTarget) event.relatedTarget.classList.add('can-drop'); // Optional: style draggable
            },
            ondragleave: function (event) {
                event.target.classList.remove('bg-blue-100', 'dark:bg-slate-600');
                if (event.relatedTarget) event.relatedTarget.classList.remove('can-drop');
            },
            ondrop: function (event) {
                const droppedElement = event.relatedTarget; // The element that was dragged
                const dropzone = event.target; // The dropzone element
                console.log(`[SamplerDropzone] Item dropped on ${targetType} (TrackID: ${trackId}, Pad: ${padIndex})`);

                const jsonDataString = droppedElement.dataset.jsonData;
                if (jsonDataString) {
                    try {
                        const droppedItemData = JSON.parse(jsonDataString);
                        if (droppedItemData.type === 'sound-browser-item') {
                            if (localAppServices.loadSoundFromBrowserToTarget) {
                                localAppServices.loadSoundFromBrowserToTarget(droppedItemData, trackId, targetType, padIndex);
                            } else {
                                console.error("loadSoundFromBrowserToTarget service not available for sampler drop.");
                                showNotification("Error processing dropped sound.", 3000);
                            }
                        } else {
                            console.warn("Dropped item is not a sound-browser-item type:", droppedItemData.type);
                            showNotification("Can only drop sound files here.", 3000);
                        }
                    } catch (e) {
                        console.error("Error parsing jsonData from dropped sampler item:", e);
                        showNotification("Error processing dropped item data.", 3000);
                    }
                } else {
                    console.warn("No jsonData found on dropped sampler item.");
                }
                // Reset dropzone styles
                dropzone.classList.remove('bg-blue-100', 'dark:bg-slate-600');
                if (droppedElement) droppedElement.classList.remove('can-drop');
            },
            ondropdeactivate: function (event) {
                event.target.classList.remove('border-blue-500', 'dark:border-blue-400', 'bg-blue-100', 'dark:bg-slate-600');
            }
        });
    console.log(`[InspectorEffectsUI] Interact.js dropzone setup for ${targetType}, track ${trackId}, pad ${padIndex}`);
}


function initializeSamplerSpecificControls(track, winEl) {
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-sampler`);
    if (dzContainerEl) {
        const existingAudioData = { originalFileName: track.samplerAudioData.fileName, status: track.samplerAudioData.status || (track.samplerAudioData.fileName ? 'missing' : 'empty') };
        dzContainerEl.innerHTML = createDropZoneHTML(track.id, `fileInput-${track.id}`, 'Sampler', null, existingAudioData);
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        const fileInputEl = dzContainerEl.querySelector(`#fileInput-${track.id}`);
        
        if (fileInputEl && localAppServices.loadSampleFile) {
             fileInputEl.onchange = (e) => { localAppServices.loadSampleFile(e, track.id, 'Sampler'); };
        }
        if(dzEl) {
            // Use the shared Interact.js dropzone setup
            setupSamplerInteractDropzone(dzEl, track.id, 'Sampler');
        }
    }
    renderSamplePads(track); // Renders the S1, S2, ... buttons
    const canvas = winEl.querySelector(`#waveformCanvas-${track.id}`);
    if (canvas) {
        track.waveformCanvasCtx = canvas.getContext('2d');
        if(track.audioBuffer?.loaded) drawWaveform(track); // Draw initial waveform if buffer already loaded
    }
    updateSliceEditorUI(track); // Populate slice editor controls

    // Helper to create and place knobs
    const createAndPlaceKnob = (placeholderId, options) => {
        const placeholder = winEl.querySelector(`#${placeholderId}`);
        if (placeholder) {
            const knob = createKnob(options);
            placeholder.innerHTML = ''; // Clear placeholder
            placeholder.appendChild(knob.element);
            return knob;
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

    // Slice Loop and Reverse Toggles
    const loopToggleBtn = winEl.querySelector(`#sliceLoopToggle-${track.id}`);
    if (loopToggleBtn) {
        loopToggleBtn.textContent = selectedSlice.loop ? 'Loop: ON' : 'Loop: OFF';
        loopToggleBtn.classList.toggle('bg-blue-500', selectedSlice.loop); // Tailwind for active state
        loopToggleBtn.classList.toggle('text-white', selectedSlice.loop);
        loopToggleBtn.addEventListener('click', (e) => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Loop for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`);
            const currentSlice = track.slices[track.selectedSliceForEdit];
            track.setSliceLoop(track.selectedSliceForEdit, !currentSlice.loop);
            e.target.textContent = currentSlice.loop ? 'Loop: ON' : 'Loop: OFF';
            e.target.classList.toggle('bg-blue-500', currentSlice.loop);
            e.target.classList.toggle('text-white', currentSlice.loop);
        });
    }
    const reverseToggleBtn = winEl.querySelector(`#sliceReverseToggle-${track.id}`);
    if(reverseToggleBtn){
        reverseToggleBtn.textContent = selectedSlice.reverse ? 'Rev: ON' : 'Rev: OFF';
        reverseToggleBtn.classList.toggle('bg-blue-500', selectedSlice.reverse);
        reverseToggleBtn.classList.toggle('text-white', selectedSlice.reverse);
        reverseToggleBtn.addEventListener('click', (e) => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Reverse for Slice ${track.selectedSliceForEdit + 1} on ${track.name}`);
            const currentSlice = track.slices[track.selectedSliceForEdit];
            track.setSliceReverse(track.selectedSliceForEdit, !currentSlice.reverse);
            e.target.textContent = currentSlice.reverse ? 'Rev: ON' : 'Rev: OFF';
            e.target.classList.toggle('bg-blue-500', currentSlice.reverse);
            e.target.classList.toggle('text-white', currentSlice.reverse);
        });
    }
    const polyToggleBtn = winEl.querySelector(`#slicerPolyphonyToggle-${track.id}`);
    if (polyToggleBtn) {
        polyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
        polyToggleBtn.classList.toggle('bg-blue-500', track.slicerIsPolyphonic);
        polyToggleBtn.classList.toggle('text-white', track.slicerIsPolyphonic);
        polyToggleBtn.addEventListener('click', () => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Slicer Polyphony for ${track.name}`);
            track.slicerIsPolyphonic = !track.slicerIsPolyphonic;
            polyToggleBtn.textContent = `Mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`;
            polyToggleBtn.classList.toggle('bg-blue-500', track.slicerIsPolyphonic);
            polyToggleBtn.classList.toggle('text-white', track.slicerIsPolyphonic);
            if (!track.slicerIsPolyphonic) track.setupSlicerMonoNodes(); else track.disposeSlicerMonoNodes();
            track.rebuildEffectChain(); // Rebuild chain as source might change
            showNotification(`${track.name} slicer mode: ${track.slicerIsPolyphonic ? 'Poly' : 'Mono'}`, 2000);
        });
    }
}

function initializeDrumSamplerSpecificControls(track, winEl) {
    updateDrumPadControlsUI(track); // This will create/update the dropzone and knobs for the selected pad
    renderDrumSamplerPads(track); // This will render the grid of pad buttons
}

function initializeInstrumentSamplerSpecificControls(track, winEl) {
    const dzContainerEl = winEl.querySelector(`#dropZoneContainer-${track.id}-instrumentsampler`);
    if (dzContainerEl) {
        const existingAudioData = { originalFileName: track.instrumentSamplerSettings.originalFileName, status: track.instrumentSamplerSettings.status || (track.instrumentSamplerSettings.originalFileName ? 'missing' : 'empty') };
        dzContainerEl.innerHTML = createDropZoneHTML(track.id, `instrumentFileInput-${track.id}`, 'InstrumentSampler', null, existingAudioData);
        const dzEl = dzContainerEl.querySelector('.drop-zone');
        const fileInputEl = dzContainerEl.querySelector(`#instrumentFileInput-${track.id}`);

        if (fileInputEl && localAppServices.loadSampleFile) {
             fileInputEl.onchange = (e) => { localAppServices.loadSampleFile(e, track.id, 'InstrumentSampler'); };
        }
        if (dzEl) {
            setupSamplerInteractDropzone(dzEl, track.id, 'InstrumentSampler');
        }
    }

    const canvas = winEl.querySelector(`#instrumentWaveformCanvas-${track.id}`);
    if (canvas) {
        track.instrumentWaveformCanvasCtx = canvas.getContext('2d');
        if(track.instrumentSamplerSettings.audioBuffer?.loaded) drawInstrumentWaveform(track);
    }

    const rootNoteSelect = winEl.querySelector(`#instrumentRootNote-${track.id}`);
    if (rootNoteSelect) {
        // Populate with MIDI note names (e.g., C4, C#4)
        Constants.synthPitches.slice().reverse().forEach(pitch => { // Use existing synthPitches for consistency
            const option = document.createElement('option');
            option.value = pitch;
            option.textContent = pitch;
            rootNoteSelect.appendChild(option);
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
        loopToggleBtn.classList.toggle('bg-blue-500', track.instrumentSamplerSettings.loop); // Tailwind active
        loopToggleBtn.classList.toggle('text-white', track.instrumentSamplerSettings.loop);
        loopToggleBtn.addEventListener('click', (e) => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Loop for ${track.name}`);
            track.setInstrumentSamplerLoop(!track.instrumentSamplerSettings.loop);
            e.target.textContent = track.instrumentSamplerSettings.loop ? 'Loop: ON' : 'Loop: OFF';
            e.target.classList.toggle('bg-blue-500', track.instrumentSamplerSettings.loop);
            e.target.classList.toggle('text-white', track.instrumentSamplerSettings.loop);
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

    // Helper to create and place knobs
    const createAndPlaceKnob = (placeholderId, options) => {
        const placeholder = winEl.querySelector(`#${placeholderId}`);
        if (placeholder) {
            const knob = createKnob(options);
            placeholder.innerHTML = ''; // Clear placeholder
            placeholder.appendChild(knob.element);
            return knob;
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
        polyToggleBtnInst.classList.toggle('bg-blue-500', track.instrumentSamplerIsPolyphonic);
        polyToggleBtnInst.classList.toggle('text-white', track.instrumentSamplerIsPolyphonic);
        polyToggleBtnInst.addEventListener('click', () => {
            if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Instrument Sampler Polyphony for ${track.name}`);
            track.instrumentSamplerIsPolyphonic = !track.instrumentSamplerIsPolyphonic;
            polyToggleBtnInst.textContent = `Mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`;
            polyToggleBtnInst.classList.toggle('bg-blue-500', track.instrumentSamplerIsPolyphonic);
            polyToggleBtnInst.classList.toggle('text-white', track.instrumentSamplerIsPolyphonic);
            showNotification(`${track.name} instrument sampler mode: ${track.instrumentSamplerIsPolyphonic ? 'Poly' : 'Mono'}`, 2000);
        });
    }
}


// --- Track Inspector Window (Entry Point) ---
function buildTrackInspectorContentDOM(track) {
    if (!track) return '<div class="p-2 text-red-500">Error: Track data not found.</div>'; // Tailwind for error
    let specificControlsHTML = '';
    if (track.type === 'Synth') specificControlsHTML = buildSynthSpecificInspectorDOM(track);
    else if (track.type === 'Sampler') specificControlsHTML = buildSamplerSpecificInspectorDOM(track);
    else if (track.type === 'DrumSampler') specificControlsHTML = buildDrumSamplerSpecificInspectorDOM(track);
    else if (track.type === 'InstrumentSampler') specificControlsHTML = buildInstrumentSamplerSpecificInspectorDOM(track);
    // For Audio tracks, specificControlsHTML will be empty, which is fine.

    const armedTrackId = localAppServices.getArmedTrackId ? localAppServices.getArmedTrackId() : null;
    let sequencerButtonHTML = '';
    if (track.type !== 'Audio') {
        // Tailwind: base button styling
        sequencerButtonHTML = `<button id="openSequencerBtn-${track.id}" class="px-2 py-1 border border-gray-300 dark:border-slate-500 rounded bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-gray-700 dark:text-slate-200">Sequencer</button>`;
    }

    let monitorButtonHTML = '';
    if (track.type === 'Audio') {
        // Tailwind: base button styling, conditional active class
        monitorButtonHTML = `<button id="monitorBtn-${track.id}" title="Toggle Input Monitoring" class="px-2 py-1 border border-gray-300 dark:border-slate-500 rounded text-gray-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-600 ${track.isMonitoringEnabled ? 'bg-blue-500 text-white dark:bg-blue-600' : 'bg-gray-200 dark:bg-slate-600'}">Monitor</button>`;
    }

    // Tailwind classes for main layout, common controls, specific controls, and navigation
    return `
        <div class="track-inspector-content p-2 space-y-2 text-xs text-gray-700 dark:text-slate-300 overflow-y-auto h-full">
            <div class="common-controls grid ${track.type === 'Audio' ? 'grid-cols-4' : 'grid-cols-3'} gap-2 mb-2">
                <button id="muteBtn-${track.id}" title="Mute Track" class="px-2 py-1 border border-gray-300 dark:border-slate-500 rounded text-gray-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-600 ${track.isMuted ? 'bg-yellow-500 text-white dark:bg-yellow-600' : 'bg-gray-200 dark:bg-slate-600'}">${track.isMuted ? 'Unmute' : 'Mute'}</button>
                <button id="soloBtn-${track.id}" title="Solo Track" class="px-2 py-1 border border-gray-300 dark:border-slate-500 rounded text-gray-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-600 ${track.isSoloed ? 'bg-orange-500 text-white dark:bg-orange-600' : 'bg-gray-200 dark:bg-slate-600'}">${track.isSoloed ? 'Unsolo' : 'Solo'}</button>
                ${monitorButtonHTML}
                <button id="armInputBtn-${track.id}" title="Arm for MIDI/Keyboard Input or Audio Recording" class="px-2 py-1 border border-gray-300 dark:border-slate-500 rounded text-gray-700 dark:text-slate-200 hover:bg-gray-300 dark:hover:bg-slate-600 ${armedTrackId === track.id ? 'bg-red-500 text-white dark:bg-red-600' : 'bg-gray-200 dark:bg-slate-600'}">Arm</button>
            </div>
            <div id="volumeKnob-${track.id}-placeholder" class="mb-2 flex justify-center"></div>
            <div id="trackMeterContainer-${track.id}" class="h-4 w-full bg-gray-300 dark:bg-slate-600 rounded border border-gray-400 dark:border-slate-500 overflow-hidden my-1 shadow-inner">
                <div id="trackMeterBar-${track.id}" class="h-full bg-green-500 dark:bg-green-400 transition-all duration-50 ease-linear" style="width: 0%;"></div>
            </div>
            <div class="type-specific-controls mt-2 border-t border-gray-200 dark:border-slate-600 pt-2">${specificControlsHTML}</div>
            <div class="inspector-nav grid ${track.type === 'Audio' ? 'grid-cols-2' : 'grid-cols-3'} gap-2 mt-3">
                <button id="openEffectsBtn-${track.id}" class="px-2 py-1 border border-gray-300 dark:border-slate-500 rounded bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-gray-700 dark:text-slate-200">Effects</button>
                ${sequencerButtonHTML}
                <button id="removeTrackBtn-${track.id}" class="px-2 py-1 border border-red-400 dark:border-red-500 rounded bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-700">Remove</button>
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
    const inspectorOptions = { 
        width: 320, height: 480, // Adjusted height for more content
        minWidth: 280, minHeight: 400, // Adjusted minHeight
        initialContentKey: windowId, 
        onCloseCallback: () => { /* main.js can clear track.inspectorWindow if needed */ } 
    };
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
    if (monitorBtn) {
        monitorBtn.addEventListener('click', () => {
            if (track.type === 'Audio') {
                track.isMonitoringEnabled = !track.isMonitoringEnabled;
                monitorBtn.classList.toggle('bg-blue-500', track.isMonitoringEnabled); // Tailwind active
                monitorBtn.classList.toggle('text-white', track.isMonitoringEnabled);
                monitorBtn.classList.toggle('dark:bg-blue-600', track.isMonitoringEnabled);
                monitorBtn.classList.toggle('bg-gray-200', !track.isMonitoringEnabled);
                monitorBtn.classList.toggle('dark:bg-slate-600', !track.isMonitoringEnabled);
                showNotification(`Input Monitoring ${track.isMonitoringEnabled ? 'ON' : 'OFF'} for ${track.name}`, 2000);
                if (localAppServices.captureStateForUndo) {
                    localAppServices.captureStateForUndo(`Toggle Monitoring for ${track.name} to ${track.isMonitoringEnabled ? 'ON' : 'OFF'}`);
                }
            }
        });
    }

    winEl.querySelector(`#removeTrackBtn-${track.id}`)?.addEventListener('click', () => handleRemoveTrack(track.id));
    winEl.querySelector(`#openEffectsBtn-${track.id}`)?.addEventListener('click', () => handleOpenEffectsRack(track.id));

    const sequencerBtn = winEl.querySelector(`#openSequencerBtn-${track.id}`);
    if (sequencerBtn) {
        sequencerBtn.addEventListener('click', () => handleOpenSequencer(track.id));
    }


    const volumeKnobPlaceholder = winEl.querySelector(`#volumeKnob-${track.id}-placeholder`);
    if (volumeKnobPlaceholder) {
        const volumeKnob = createKnob({ 
            label: 'Volume', 
            min: 0, max: 1.2, step: 0.01, 
            initialValue: track.previousVolumeBeforeMute, 
            decimals: 2, 
            trackRef: track, // For undo context
            onValueChange: (val, oldVal, fromInteraction) => {
                track.setVolume(val, fromInteraction);
                // Undo is handled by the knob itself on interaction end
            } 
        });
        volumeKnobPlaceholder.innerHTML = ''; // Clear placeholder
        volumeKnobPlaceholder.appendChild(volumeKnob.element);
        track.inspectorControls.volume = volumeKnob; // Store knob instance
    }
}

function initializeTypeSpecificInspectorControls(track, winEl) {
    if (track.type === 'Synth') initializeSynthSpecificControls(track, winEl);
    else if (track.type === 'Sampler') initializeSamplerSpecificControls(track, winEl);
    else if (track.type === 'DrumSampler') initializeDrumSamplerSpecificControls(track, winEl);
    else if (track.type === 'InstrumentSampler') initializeInstrumentSamplerSpecificControls(track, winEl);
}

// --- Modular Effects Rack UI ---
export function buildModularEffectsRackDOM(owner, ownerType = 'track') {
    const ownerId = (ownerType === 'track' && owner) ? owner.id : 'master';
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus';
    // Tailwind for layout, text, buttons
    return `<div id="effectsRackContent-${ownerId}" class="p-3 space-y-3 overflow-y-auto h-full bg-gray-800 text-slate-200 dark:bg-slate-800 dark:text-slate-200">
        <h3 class="text-base font-semibold text-slate-100 dark:text-slate-100">Effects Rack: ${ownerName}</h3>
        <div id="effectsList-${ownerId}" class="space-y-1 min-h-[60px] border border-gray-700 dark:border-slate-600 rounded p-2 bg-gray-700 dark:bg-slate-700/50"></div>
        <button id="addEffectBtn-${ownerId}" class="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-150 w-full">Add Effect</button>
        <div id="effectControlsContainer-${ownerId}" class="mt-3 space-y-3"></div>
    </div>`;
}

export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    if (!listDiv) return;
    listDiv.innerHTML = ''; // Clear previous list
    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : (localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : []);

    if (!effectsArray || effectsArray.length === 0) {
        listDiv.innerHTML = '<p class="text-xs text-gray-400 dark:text-slate-400 italic">No effects added.</p>';
        if (controlsContainer) controlsContainer.innerHTML = ''; // Clear controls if no effects
        return;
    }

    const AVAILABLE_EFFECTS_LOCAL = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};

    effectsArray.forEach((effect, index) => {
        const effectDef = AVAILABLE_EFFECTS_LOCAL[effect.type];
        const displayName = effectDef ? effectDef.displayName : effect.type;
        const item = document.createElement('div');
        // Tailwind for item styling: flex, padding, border, background, text
        item.className = 'effect-item flex justify-between items-center p-2 border-b border-gray-700 dark:border-slate-600 bg-gray-750 dark:bg-slate-700 rounded-sm shadow-sm text-xs';
        item.innerHTML = `<span class="effect-name flex-grow cursor-pointer hover:text-blue-400 dark:hover:text-blue-300 text-slate-200 dark:text-slate-200" title="Edit ${displayName}">${displayName}</span>
            <div class="effect-actions space-x-1">
                <button class="up-btn text-xs px-1 py-0.5 rounded ${index === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600 dark:hover:bg-slate-500'} text-slate-400 dark:text-slate-400" ${index === 0 ? 'disabled' : ''} title="Move Up">▲</button>
                <button class="down-btn text-xs px-1 py-0.5 rounded ${index === effectsArray.length - 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-600 dark:hover:bg-slate-500'} text-slate-400 dark:text-slate-400" ${index === effectsArray.length - 1 ? 'disabled' : ''} title="Move Down">▼</button>
                <button class="remove-btn text-xs px-1.5 py-0.5 rounded text-red-400 hover:text-red-300 hover:bg-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remove Effect">✕</button>
            </div>`;
        item.querySelector('.effect-name').addEventListener('click', () => {
            renderEffectControls(owner, ownerType, effect.id, controlsContainer);
            // Highlight selected effect
            listDiv.querySelectorAll('.bg-blue-600,.dark\\:bg-blue-600').forEach(el => el.classList.remove('bg-blue-600', 'dark:bg-blue-600'));
            item.classList.add('bg-blue-600', 'dark:bg-blue-600');
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
    controlsContainer.innerHTML = ''; // Clear previous controls
    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : (localAppServices.getMasterEffects ? localAppServices.getMasterEffects() : []);
    const effectWrapper = effectsArray.find(e => e.id === effectId);

    if (!effectWrapper) { controlsContainer.innerHTML = '<p class="text-xs text-gray-400 dark:text-slate-400 italic">Select an effect to see its controls.</p>'; return; }

    const AVAILABLE_EFFECTS_LOCAL = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
    const effectDef = AVAILABLE_EFFECTS_LOCAL[effectWrapper.type];

    if (!effectDef) { controlsContainer.innerHTML = `<p class="text-xs text-red-500 dark:text-red-400">Error: Definition for "${effectWrapper.type}" not found.</p>`; return; }

    const titleEl = document.createElement('h4');
    // Tailwind: title styling
    titleEl.className = 'text-sm font-semibold mb-2 text-slate-100 dark:text-slate-100'; titleEl.textContent = `Controls: ${effectDef.displayName}`;
    controlsContainer.appendChild(titleEl);
    const gridContainer = document.createElement('div');
    // Tailwind: grid layout for controls
    gridContainer.className = 'grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 p-2 border border-gray-700 dark:border-slate-600 rounded bg-gray-750 dark:bg-slate-700 text-xs';

    if (!effectDef.params || effectDef.params.length === 0) {
        gridContainer.innerHTML = '<p class="text-xs text-gray-400 dark:text-slate-400 italic col-span-full">No adjustable parameters for this effect.</p>';
    } else {
        effectDef.params.forEach(paramDef => {
            const controlWrapper = document.createElement('div'); // Wrapper for each control (label + input)
            controlWrapper.className = 'flex flex-col space-y-1'; // Tailwind: flex column for label above input

            let currentValue; const pathKeys = paramDef.key.split('.'); let tempVal = effectWrapper.params;
            for (const key of pathKeys) { if (tempVal && typeof tempVal === 'object' && key in tempVal) tempVal = tempVal[key]; else { tempVal = undefined; break; } }
            currentValue = (tempVal !== undefined) ? tempVal : paramDef.defaultValue;

            if (paramDef.type === 'knob') {
                const knob = createKnob({ 
                    label: paramDef.label, 
                    min: paramDef.min, max: paramDef.max, step: paramDef.step, 
                    initialValue: currentValue, 
                    decimals: paramDef.decimals, 
                    displaySuffix: paramDef.displaySuffix, 
                    trackRef: (ownerType === 'track' ? owner : null), // For undo context
                    onValueChange: (val) => { 
                        if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, val); 
                        else if (localAppServices.updateMasterEffectParam) localAppServices.updateMasterEffectParam(effectId, paramDef.key, val); 
                    } 
                });
                controlWrapper.appendChild(knob.element);
            } else if (paramDef.type === 'select') {
                const label = document.createElement('label'); 
                // Tailwind: label styling
                label.className = 'block text-xs font-medium text-gray-300 dark:text-slate-300'; 
                label.textContent = paramDef.label + ':';
                const select = document.createElement('select'); 
                // Tailwind: select styling
                select.className = 'w-full p-1.5 border border-gray-600 dark:border-slate-500 rounded text-xs bg-gray-700 dark:bg-slate-600 text-slate-200 dark:text-slate-200 focus:ring-blue-500 focus:border-blue-500';
                paramDef.options.forEach(opt => { 
                    const option = document.createElement('option'); 
                    option.value = typeof opt === 'object' ? opt.value : opt; 
                    option.textContent = typeof opt === 'object' ? opt.text : opt; 
                    select.appendChild(option); 
                });
                select.value = currentValue;
                select.addEventListener('change', (e) => {
                    const newValue = e.target.value; 
                    // Attempt to parse as number if original default was a number (for things like rolloff)
                    const finalValue = (typeof paramDef.defaultValue === 'number' && !isNaN(parseFloat(newValue))) ? parseFloat(newValue) : newValue;
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Change ${paramDef.label} for ${effectWrapper.type} on ${ownerType === 'track' ? owner.name : 'Master'}`);
                    if (ownerType === 'track' && owner) owner.updateEffectParam(effectId, paramDef.key, finalValue); 
                    else if (localAppServices.updateMasterEffectParam) localAppServices.updateMasterEffectParam(effectId, paramDef.key, finalValue);
                });
                controlWrapper.appendChild(label); 
                controlWrapper.appendChild(select);
            } else if (paramDef.type === 'toggle') { // Example for a toggle button
                const button = document.createElement('button');
                // Tailwind: toggle button styling
                button.className = `w-full p-1.5 border border-gray-600 dark:border-slate-500 rounded text-xs transition-colors duration-150 ${currentValue ? 'bg-blue-600 text-white' : 'bg-gray-600 dark:bg-slate-500 text-slate-300 dark:text-slate-300 hover:bg-gray-500 dark:hover:bg-slate-400'}`;
                button.textContent = `${paramDef.label}: ${currentValue ? 'ON' : 'OFF'}`;
                button.addEventListener('click', () => {
                    const newValue = !currentValue; // Toggle the value
                    currentValue = newValue; // Update local state for UI
                    button.textContent = `${paramDef.label}: ${newValue ? 'ON' : 'OFF'}`;
                    button.classList.toggle('bg-blue-600', newValue);
                    button.classList.toggle('text-white', newValue);
                    button.classList.toggle('bg-gray-600', !newValue);
                    button.classList.toggle('dark:bg-slate-500', !newValue);
                    button.classList.toggle('text-slate-300', !newValue);
                    button.classList.toggle('dark:text-slate-300', !newValue);

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

export function openTrackEffectsRackWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track) return null;
    const windowId = `effectsRack-${trackId}`;
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) { openWindows.get(windowId).restore(); return openWindows.get(windowId); }

    const contentDOM = buildModularEffectsRackDOM(track, 'track');
    const rackOptions = { width: 380, height: 450, minWidth: 320, minHeight: 300, initialContentKey: windowId }; // Adjusted default size
    if (savedState) Object.assign(rackOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    const rackWindow = localAppServices.createWindow(windowId, `Effects: ${track.name}`, contentDOM, rackOptions);
    if (rackWindow?.element) {
        renderEffectsList(track, 'track', rackWindow.element.querySelector(`#effectsList-${track.id}`), rackWindow.element.querySelector(`#effectControlsContainer-${track.id}`));
        rackWindow.element.querySelector(`#addEffectBtn-${track.id}`)?.addEventListener('click', () => {
            if (localAppServices.showAddEffectModal) localAppServices.showAddEffectModal(track, 'track');
            else console.warn("showAddEffectModal service not available from inspectorEffectsUI (when trying to call for track effects).");
        });
    }
    return rackWindow;
}

export function openMasterEffectsRackWindow(savedState = null) {
    const windowId = 'masterEffectsRack';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) { openWindows.get(windowId).restore(); return openWindows.get(windowId); }

    const contentDOM = buildModularEffectsRackDOM(null, 'master');
    const rackOptions = { width: 380, height: 450, minWidth: 320, minHeight: 300, initialContentKey: windowId };
    if (savedState) Object.assign(rackOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    const rackWindow = localAppServices.createWindow(windowId, 'Master Effects Rack', contentDOM, rackOptions);
    if (rackWindow?.element) {
        renderEffectsList(null, 'master', rackWindow.element.querySelector(`#effectsList-master`), rackWindow.element.querySelector(`#effectControlsContainer-master`));
        rackWindow.element.querySelector(`#addEffectBtn-master`)?.addEventListener('click', () => {
            if (localAppServices.showAddEffectModal) localAppServices.showAddEffectModal(null, 'master');
            else console.warn("showAddEffectModal service not available from inspectorEffectsUI (when trying to call for master effects).");
        });
    }
    return rackWindow;
}


// --- Waveform & Pad Rendering (typically part of inspectors) ---
export function drawWaveform(track) {
    if (!track?.waveformCanvasCtx || !track.audioBuffer?.loaded) {
        if (track?.waveformCanvasCtx) {
            const canvas = track.waveformCanvasCtx.canvas;
            track.waveformCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            // Tailwind-like colors for placeholder
            track.waveformCanvasCtx.fillStyle = canvas.classList.contains('dark') ? '#374151' : '#e5e7eb'; // bg-gray-700 or bg-gray-200
            track.waveformCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            track.waveformCanvasCtx.fillStyle = canvas.classList.contains('dark') ? '#9ca3af' : '#6b7280'; // text-gray-400 or text-gray-500
            track.waveformCanvasCtx.textAlign = 'center';
            track.waveformCanvasCtx.font = '12px Inter, sans-serif';
            track.waveformCanvasCtx.fillText('No audio loaded', canvas.width / 2, canvas.height / 2);
        }
        return;
    }
    const canvas = track.waveformCanvasCtx.canvas; const ctx = track.waveformCanvasCtx;
    const buffer = track.audioBuffer.get(); const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width); const amp = canvas.height / 2;
    // Tailwind-like colors for waveform
    ctx.fillStyle = canvas.classList.contains('dark') ? '#1f2937' : '#f3f4f6'; // bg-gray-800 or bg-gray-100
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1; 
    ctx.strokeStyle = canvas.classList.contains('dark') ? '#60a5fa' : '#3b82f6'; // stroke-blue-400 or stroke-blue-500
    ctx.beginPath(); ctx.moveTo(0, amp);
    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0; let max = -1.0;
        for (let j = 0; j < step; j++) { const datum = data[(i * step) + j]; if (datum < min) min = datum; if (datum > max) max = datum; }
        ctx.lineTo(i, (1 + min) * amp); ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.lineTo(canvas.width, amp); ctx.stroke();
    // Draw slices
    track.slices.forEach((slice, index) => {
        if (slice.duration <= 0) return;
        const startX = (slice.offset / buffer.duration) * canvas.width;
        const endX = ((slice.offset + slice.duration) / buffer.duration) * canvas.width;
        // Tailwind-like colors for slices
        ctx.fillStyle = index === track.selectedSliceForEdit ? 'rgba(239, 68, 68, 0.4)' : (canvas.classList.contains('dark') ? 'rgba(59, 130, 246, 0.3)' : 'rgba(96, 165, 250, 0.25)'); // bg-red-500/40 or bg-blue-500/30
        ctx.fillRect(startX, 0, endX - startX, canvas.height);
        ctx.strokeStyle = index === track.selectedSliceForEdit ? 'rgba(220, 38, 38, 0.7)' : (canvas.classList.contains('dark') ? 'rgba(96, 165, 250, 0.6)' : 'rgba(59, 130, 246, 0.5)'); // border-red-600/70 or border-blue-500/60
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(startX, 0); ctx.lineTo(startX, canvas.height); ctx.moveTo(endX, 0); ctx.lineTo(endX, canvas.height); ctx.stroke();
        ctx.fillStyle = index === track.selectedSliceForEdit ? '#ef4444' : (canvas.classList.contains('dark') ? '#93c5fd' : '#2563eb'); // text-red-500 or text-blue-300/text-blue-600
        ctx.font = '10px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`S${index + 1}`, startX + 3, 12);
    });
}

export function drawInstrumentWaveform(track) {
    if (!track?.instrumentWaveformCanvasCtx || !track.instrumentSamplerSettings.audioBuffer?.loaded) {
        // Draw 'No audio' message if canvas context exists but buffer not loaded
        if (track?.instrumentWaveformCanvasCtx) { 
            const canvas = track.instrumentWaveformCanvasCtx.canvas;
            track.instrumentWaveformCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
            track.instrumentWaveformCanvasCtx.fillStyle = canvas.classList.contains('dark') ? '#374151' : '#e5e7eb';
            track.instrumentWaveformCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
            track.instrumentWaveformCanvasCtx.fillStyle = canvas.classList.contains('dark') ? '#9ca3af' : '#6b7280';
            track.instrumentWaveformCanvasCtx.textAlign = 'center';
            track.instrumentWaveformCanvasCtx.font = '12px Inter, sans-serif';
            track.instrumentWaveformCanvasCtx.fillText('No audio loaded', canvas.width / 2, canvas.height / 2);
        } 
        return;
    }
    const canvas = track.instrumentWaveformCanvasCtx.canvas; const ctx = track.instrumentWaveformCanvasCtx;
    const buffer = track.instrumentSamplerSettings.audioBuffer.get(); const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width); const amp = canvas.height / 2;
    // Tailwind-like colors
    ctx.fillStyle = canvas.classList.contains('dark') ? '#1f2937' : '#f3f4f6'; // bg-gray-800 or bg-gray-100
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1; 
    ctx.strokeStyle = canvas.classList.contains('dark') ? '#34d399' : '#10b981'; // stroke-emerald-400 or stroke-emerald-500
    ctx.beginPath(); ctx.moveTo(0, amp);
    for (let i = 0; i < canvas.width; i++) { let min = 1.0; let max = -1.0; for (let j = 0; j < step; j++) { const datum = data[(i * step) + j]; if (datum < min) min = datum; if (datum > max) max = datum; } ctx.lineTo(i, (1 + min) * amp); ctx.lineTo(i, (1 + max) * amp); }
    ctx.lineTo(canvas.width, amp); ctx.stroke();
    // Draw loop regions if active
    if (track.instrumentSamplerSettings.loop) {
        const loopStartX = (track.instrumentSamplerSettings.loopStart / buffer.duration) * canvas.width;
        const loopEndX = (track.instrumentSamplerSettings.loopEnd / buffer.duration) * canvas.width;
        // Tailwind-like colors for loop region
        ctx.fillStyle = canvas.classList.contains('dark') ? 'rgba(16, 185, 129, 0.25)' : 'rgba(52, 211, 153, 0.2)'; // bg-emerald-500/25 or bg-emerald-500/20
        ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, canvas.height);
        ctx.strokeStyle = canvas.classList.contains('dark') ? 'rgba(52, 211, 153, 0.7)' : 'rgba(16, 185, 129, 0.6)'; // border-emerald-400/70 or border-emerald-500/60
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(loopStartX, 0); ctx.lineTo(loopStartX, canvas.height); ctx.moveTo(loopEndX, 0); ctx.lineTo(loopEndX, canvas.height); ctx.stroke();
    }
}

export function renderSamplePads(track) {
    const inspectorWindow = localAppServices.getWindowById ? localAppServices.getWindowById(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow?.element || track.type !== 'Sampler') return;
    const padsContainer = inspectorWindow.element.querySelector(`#samplePadsContainer-${track.id}`);
    if (!padsContainer) return;
    padsContainer.innerHTML = ''; // Clear previous pads
    track.slices.forEach((slice, index) => {
        const pad = document.createElement('button');
        // Tailwind: base pad styling, conditional active/disabled styling
        pad.className = `sample-pad p-2 border border-gray-300 dark:border-slate-500 rounded text-xs h-12 flex items-center justify-center transition-colors duration-150 
                         ${track.selectedSliceForEdit === index ? 'bg-blue-500 text-white dark:bg-blue-600 border-blue-500 dark:border-blue-400' : 'bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-gray-700 dark:text-slate-300'} 
                         ${(!track.audioBuffer?.loaded || slice.duration <= 0) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;
        pad.textContent = `S${index + 1}`; pad.title = `Slice ${index + 1}`;
        if (!track.audioBuffer?.loaded || slice.duration <= 0) pad.disabled = true;
        pad.addEventListener('click', () => { 
            track.selectedSliceForEdit = index; 
            if (localAppServices.playSlicePreview && track.audioBuffer?.loaded && slice.duration > 0) {
                localAppServices.playSlicePreview(track.id, index); 
            }
            renderSamplePads(track); // Re-render to update selection style
            updateSliceEditorUI(track); // Update editor controls for the new selection
        });
        padsContainer.appendChild(pad);
    });
}

export function updateSliceEditorUI(track) {
    const inspectorWindow = localAppServices.getWindowById ? localAppServices.getWindowById(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow?.element || track.type !== 'Sampler' || !track.slices?.length) return;
    const selectedInfo = inspectorWindow.element.querySelector(`#selectedSliceInfo-${track.id}`);
    if (selectedInfo) selectedInfo.textContent = track.selectedSliceForEdit + 1;
    
    const slice = track.slices[track.selectedSliceForEdit]; 
    if (!slice) {
        console.warn(`[UI updateSliceEditorUI] No slice data for index ${track.selectedSliceForEdit} on track ${track.id}`);
        // Optionally disable or clear controls here
        return;
    }

    // Update knob values if they exist
    if (track.inspectorControls.sliceVolume) track.inspectorControls.sliceVolume.setValue(slice.volume || 0.7, false);
    if (track.inspectorControls.slicePitch) track.inspectorControls.slicePitch.setValue(slice.pitchShift || 0, false);
    
    const loopToggleBtn = inspectorWindow.element.querySelector(`#sliceLoopToggle-${track.id}`);
    if (loopToggleBtn) { 
        loopToggleBtn.textContent = slice.loop ? 'Loop: ON' : 'Loop: OFF'; 
        loopToggleBtn.classList.toggle('bg-blue-500', slice.loop); // Tailwind active
        loopToggleBtn.classList.toggle('text-white', slice.loop);
    }
    const reverseToggleBtn = inspectorWindow.element.querySelector(`#sliceReverseToggle-${track.id}`);
    if (reverseToggleBtn) { 
        reverseToggleBtn.textContent = slice.reverse ? 'Rev: ON' : 'Rev: OFF'; 
        reverseToggleBtn.classList.toggle('bg-blue-500', slice.reverse); // Tailwind active
        reverseToggleBtn.classList.toggle('text-white', slice.reverse);
    }
    
    const env = slice.envelope || { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 };
    if (track.inspectorControls.sliceEnvAttack) track.inspectorControls.sliceEnvAttack.setValue(env.attack, false);
    if (track.inspectorControls.sliceEnvDecay) track.inspectorControls.sliceEnvDecay.setValue(env.decay, false);
    if (track.inspectorControls.sliceEnvSustain) track.inspectorControls.sliceEnvSustain.setValue(env.sustain, false);
    if (track.inspectorControls.sliceEnvRelease) track.inspectorControls.sliceEnvRelease.setValue(env.release, false);
}

export function renderDrumSamplerPads(track) {
    const inspectorWindow = localAppServices.getWindowById ? localAppServices.getWindowById(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow?.element || track.type !== 'DrumSampler') return;
    const padsContainer = inspectorWindow.element.querySelector(`#drumPadsGridContainer-${track.id}`);
    if (!padsContainer) return;
    padsContainer.innerHTML = ''; // Clear previous pads
    track.drumSamplerPads.forEach((padData, index) => {
        const padEl = document.createElement('button');
        // Tailwind: base pad styling, conditional active/disabled/status styling
        let statusColorClass = '';
        if (padData.status === 'missing' || padData.status === 'missing_db') statusColorClass = 'border-yellow-500 dark:border-yellow-400';
        else if (padData.status === 'error') statusColorClass = 'border-red-500 dark:border-red-400';

        padEl.className = `drum-pad p-2 border border-gray-300 dark:border-slate-500 rounded text-xs h-12 flex items-center justify-center transition-colors duration-150 
                         ${track.selectedDrumPadForEdit === index ? 'bg-blue-500 text-white dark:bg-blue-600 border-blue-500 dark:border-blue-400' : 'bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500 text-gray-700 dark:text-slate-300'} 
                         ${(!padData.dbKey && !padData.originalFileName && padData.status !== 'loaded') ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                         ${statusColorClass}`;
        padEl.textContent = `Pad ${index + 1}`; 
        padEl.title = padData.originalFileName || `Pad ${index + 1}${padData.status && padData.status !== 'loaded' ? ` (${padData.status})` : ''}`;
        
        if (padData.status !== 'loaded' && padData.status !== 'empty') { // Disable if not loaded or empty
             padEl.disabled = true;
        }

        padEl.addEventListener('click', () => { 
            track.selectedDrumPadForEdit = index; 
            if (localAppServices.playDrumSamplerPadPreview && padData.status === 'loaded') {
                localAppServices.playDrumSamplerPadPreview(track.id, index); 
            } else if (padData.status !== 'loaded' && padData.status !== 'empty') { // Only show notification if there's an issue
                showNotification(`Sample for Pad ${index+1} is ${padData.status || 'not loaded'}.`, 2000);
            }
            renderDrumSamplerPads(track); // Re-render to update selection style
            updateDrumPadControlsUI(track); // Update editor controls for the new selection
        });
        padsContainer.appendChild(padEl);
    });
}

export function updateDrumPadControlsUI(track) {
    const inspectorWindow = localAppServices.getWindowById ? localAppServices.getWindowById(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow || !inspectorWindow.element || track.type !== 'DrumSampler' || !track.drumSamplerPads) return;
    const inspector = inspectorWindow.element;

    const selectedPadIndex = track.selectedDrumPadForEdit;
    const padData = track.drumSamplerPads[selectedPadIndex];
    if (!padData) {
        console.warn(`[UI updateDrumPadControlsUI] No pad data for index ${selectedPadIndex} on track ${track.id}`);
        return; // Should not happen if selectedDrumPadForEdit is always valid
    }

    const selectedInfo = inspector.querySelector(`#selectedDrumPadInfo-${track.id}`);
    if (selectedInfo) selectedInfo.textContent = selectedPadIndex + 1;

    // Dynamically create or update the dropzone for the selected pad
    const padSpecificDropZoneContainerId = `drumPadDropZoneContainer-${track.id}-${selectedPadIndex}`;
    const controlsArea = inspector.querySelector('.selected-pad-controls'); // The div containing pad-specific controls
    let dzContainer = inspector.querySelector(`#${padSpecificDropZoneContainerId}`);

    if (controlsArea) {
        // Remove any old dropzones for other pads
        const existingDropZones = controlsArea.querySelectorAll(`div[id^="drumPadDropZoneContainer-${track.id}-"]`);
        existingDropZones.forEach(oldDz => {
            if (oldDz.id !== padSpecificDropZoneContainerId) oldDz.remove();
        });

        // Create new dropzone if it doesn't exist for the current pad
        dzContainer = controlsArea.querySelector(`#${padSpecificDropZoneContainerId}`);
        if (!dzContainer) {
            dzContainer = document.createElement('div');
            dzContainer.id = padSpecificDropZoneContainerId;
            dzContainer.className = 'mb-1 text-xs'; // Tailwind: margin bottom
            // Insert before the first grid of knobs, or as the first child if no grid yet
            const knobGridOrFirstChild = controlsArea.querySelector('.grid') || controlsArea.firstChild;
            if (knobGridOrFirstChild) controlsArea.insertBefore(dzContainer, knobGridOrFirstChild);
            else controlsArea.appendChild(dzContainer);
        }
    }

    if (dzContainer) {
        const existingAudioData = {
            originalFileName: padData.originalFileName,
            status: padData.status || (padData.originalFileName ? 'missing' : 'empty')
        };
        dzContainer.innerHTML = createDropZoneHTML(track.id, `drumPadFileInput-${track.id}-${selectedPadIndex}`, 'DrumSampler', selectedPadIndex, existingAudioData);
        const dzEl = dzContainer.querySelector('.drop-zone');
        const fileInputEl = dzContainer.querySelector(`#drumPadFileInput-${track.id}-${selectedPadIndex}`);
        
        if (fileInputEl && localAppServices.loadDrumSamplerPadFile) {
            fileInputEl.onchange = (e) => { localAppServices.loadDrumSamplerPadFile(e, track.id, selectedPadIndex); };
        }
        if(dzEl) { 
            setupSamplerInteractDropzone(dzEl, track.id, 'DrumSampler', selectedPadIndex);
        }
    }

    // Helper to create or update knobs
    const createOrUpdateKnob = (controlName, placeholderId, options) => {
        let knobInstance = track.inspectorControls[controlName];
        const placeholder = inspector.querySelector(`#${placeholderId}`);
        if (!placeholder) return null;

        if (knobInstance && knobInstance.element.parentElement === placeholder) {
            // Knob exists, just update its value and disabled state
            knobInstance.setValue(options.initialValue, false); // false = don't trigger onValueChange
            knobInstance.refreshVisuals(options.disabled); // Update visual based on disabled state
        } else {
            // Knob doesn't exist or needs to be re-created in the placeholder
            knobInstance = createKnob(options);
            placeholder.innerHTML = ''; // Clear placeholder
            placeholder.appendChild(knobInstance.element);
            track.inspectorControls[controlName] = knobInstance; // Store new instance
        }
        return knobInstance;
    };

    const env = padData.envelope || { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 };
    createOrUpdateKnob('drumPadVolume', `drumPadVolumeKnob-${track.id}-placeholder`, { label: 'Vol', min:0, max:1, step:0.01, initialValue: padData.volume || 0.7, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadVolume(selectedPadIndex, val)});
    
    const pitchKnobOptions = { label: 'Pitch', min:-24, max:24, step:1, initialValue: padData.pitchShift || 0, decimals:0, displaySuffix:'st', trackRef: track, onValueChange: (val) => track.setDrumSamplerPadPitch(selectedPadIndex, val), disabled: padData.autoStretchEnabled };
    createOrUpdateKnob('drumPadPitch', `drumPadPitchKnob-${track.id}-placeholder`, pitchKnobOptions);


    // Auto-Stretch Controls
    const autoStretchToggle = inspector.querySelector(`#drumPadAutoStretchToggle-${track.id}`);
    const stretchBPMInput = inspector.querySelector(`#drumPadStretchBPM-${track.id}`);
    const stretchBeatsInput = inspector.querySelector(`#drumPadStretchBeats-${track.id}`);

    if (autoStretchToggle && stretchBPMInput && stretchBeatsInput) {
        autoStretchToggle.textContent = padData.autoStretchEnabled ? 'Stretch: ON' : 'Stretch: OFF';
        autoStretchToggle.classList.toggle('bg-blue-500', padData.autoStretchEnabled); // Tailwind active
        autoStretchToggle.classList.toggle('text-white', padData.autoStretchEnabled);
        
        stretchBPMInput.disabled = !padData.autoStretchEnabled;
        stretchBeatsInput.disabled = !padData.autoStretchEnabled;
        stretchBPMInput.style.opacity = padData.autoStretchEnabled ? '1' : '0.6'; // Tailwind-like opacity
        stretchBeatsInput.style.opacity = padData.autoStretchEnabled ? '1' : '0.6';
        
        stretchBPMInput.value = padData.stretchOriginalBPM || 120;
        stretchBeatsInput.value = padData.stretchBeats || 1;

        // Ensure event listeners are attached only once
        if (!autoStretchToggle.hasAttribute('listener-attached')) {
            autoStretchToggle.addEventListener('click', () => {
                const currentPadData = track.drumSamplerPads[track.selectedDrumPadForEdit]; // Get fresh data
                const newState = !currentPadData.autoStretchEnabled;
                if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Auto-Stretch for Pad ${track.selectedDrumPadForEdit + 1} on ${track.name}`);
                track.setDrumSamplerPadAutoStretch(track.selectedDrumPadForEdit, newState);
                updateDrumPadControlsUI(track); // Re-render controls to reflect change (especially disabled state of pitch)
            });
            autoStretchToggle.setAttribute('listener-attached', 'true');
        }
        if (!stretchBPMInput.hasAttribute('listener-attached')) {
            stretchBPMInput.addEventListener('change', (e) => {
                if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Stretch BPM for Pad ${track.selectedDrumPadForEdit + 1} on ${track.name}`);
                track.setDrumSamplerPadStretchOriginalBPM(track.selectedDrumPadForEdit, parseFloat(e.target.value));
            });
            stretchBPMInput.setAttribute('listener-attached', 'true');
        }
        if (!stretchBeatsInput.hasAttribute('listener-attached')) {
             stretchBeatsInput.addEventListener('change', (e) => {
                if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Stretch Beats for Pad ${track.selectedDrumPadForEdit + 1} on ${track.name}`);
                track.setDrumSamplerPadStretchBeats(track.selectedDrumPadForEdit, parseFloat(e.target.value));
            });
            stretchBeatsInput.setAttribute('listener-attached', 'true');
        }
    }


    createOrUpdateKnob('drumPadEnvAttack', `drumPadEnvAttack-${track.id}-placeholder`, { label: 'Attack', min:0.001, max:1, step:0.001, initialValue: env.attack, decimals:3, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'attack', val)});
    createOrUpdateKnob('drumPadEnvDecay', `drumPadEnvDecay-${track.id}-placeholder`, { label: 'Decay', min:0.01, max:1, step:0.01, initialValue: env.decay, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'decay', val)});
    createOrUpdateKnob('drumPadEnvSustain', `drumPadEnvSustain-${track.id}-placeholder`, { label: 'Sustain', min:0, max:1, step:0.01, initialValue: env.sustain, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'sustain', val)});
    createOrUpdateKnob('drumPadEnvRelease', `drumPadEnvRelease-${track.id}-placeholder`, { label: 'Release', min:0.01, max:2, step:0.01, initialValue: env.release, decimals:2, trackRef: track, onValueChange: (val) => track.setDrumSamplerPadEnv(selectedPadIndex, 'release', val)});
}
