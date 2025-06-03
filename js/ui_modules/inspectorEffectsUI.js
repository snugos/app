// js/ui_modules/inspectorEffectsUI.js (MODIFIED)
import { SnugWindow } from '../SnugWindow.js';
import {
    showNotification as utilShowNotification,
    createDropZoneHTML,
    setupGenericDropZoneListeners,
    showCustomModal,
    createContextMenu,
    showConfirmationDialog
} from '../utils.js';
import * as Constants from '../constants.js';
// Event handlers might be called via appServices if they are general,
// or directly if they are very specific to this UI module's components.
// For now, assume appServices will provide access to necessary event handlers.

let localAppServices = {};

export function initializeInspectorEffectsUI(appServicesFromMain) {
    localAppServices = appServicesFromMain;
    if (!localAppServices.effectsRegistryAccess) {
        console.warn("[InspectorEffectsUI Module] effectsRegistryAccess not found in appServices. Effect-related UI might be limited.");
        localAppServices.effectsRegistryAccess = { // Basic fallback
            AVAILABLE_EFFECTS: {},
            getEffectParamDefinitions: () => [],
            getEffectDefaultParams: () => ({}),
            synthEngineControlDefinitions: {}
        };
    }
     if (!localAppServices.effectsRegistryAccess.synthEngineControlDefinitions) { // Ensure this sub-property also exists
        localAppServices.effectsRegistryAccess.synthEngineControlDefinitions = {};
    }
}

// --- Knob UI ---
export function createKnob(options) {
    const id = `${options.idPrefix}-${options.trackId || 'global'}-${options.paramKey.replace(/\./g, '_')}`;
    const container = document.createElement('div');
    container.className = 'knob-container flex flex-col items-center mx-1 my-1 min-w-[60px]';

    const labelEl = document.createElement('label');
    labelEl.htmlFor = id;
    labelEl.className = 'knob-label text-xs text-slate-400 dark:text-slate-400 mb-0.5';
    labelEl.textContent = options.label;

    const knobEl = document.createElement('div');
    knobEl.id = id;
    knobEl.className = 'knob w-8 h-8 bg-slate-300 dark:bg-slate-700 rounded-full relative border border-slate-400 dark:border-slate-600 shadow-sm';
    knobEl.title = `${options.label}: ${options.currentValue}`;

    const handleEl = document.createElement('div');
    handleEl.className = 'knob-handle w-1 h-2.5 bg-slate-600 dark:bg-slate-300 absolute rounded-sm';
    handleEl.style.left = '50%';
    handleEl.style.top = '4px'; // Adjust for handle position
    handleEl.style.transformOrigin = '50% 100%'; // Rotate around bottom-center for typical knob feel
    knobEl.appendChild(handleEl);

    const valueDisplayEl = document.createElement('div');
    valueDisplayEl.className = 'knob-value-display text-xs text-slate-500 dark:text-slate-400 mt-0.5 min-h-[1em]';
    valueDisplayEl.textContent = parseFloat(options.currentValue).toFixed(options.decimals || 2) + (options.displaySuffix || '');


    const min = options.min || 0;
    const max = options.max || 100;
    const range = max - min;
    // Calculate rotation: 270 degrees total range (-135 to +135)
    const rotation = Math.max(-135, Math.min(135, ((options.currentValue - min) / range) * 270 - 135));
    handleEl.style.transform = `translateX(-50%) rotate(${rotation}deg)`;

    let isDragging = false;
    let initialY, initialValue;

    knobEl.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        isDragging = true;
        initialY = e.clientY;
        initialValue = options.currentValue;
        knobEl.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';

        const onPointerMove = (moveEvent) => {
            if (!isDragging) return;
            const dy = initialY - moveEvent.clientY; // Inverted for natural feel (drag up = increase)
            const sensitivity = (options.max - options.min) / 150; // Adjust sensitivity
            let newValue = initialValue + dy * sensitivity;
            newValue = Math.max(options.min, Math.min(options.max, newValue));
            if (options.step) {
                newValue = Math.round(newValue / options.step) * options.step;
            }
            options.currentValue = newValue; // Update internal state

            const displayVal = parseFloat(newValue).toFixed(options.decimals || 2);
            valueDisplayEl.textContent = displayVal + (options.displaySuffix || '');
            knobEl.title = `${options.label}: ${displayVal}`;
            const newRotation = Math.max(-135, Math.min(135, ((newValue - min) / range) * 270 - 135));
            handleEl.style.transform = `translateX(-50%) rotate(${newRotation}deg)`;

            if (options.onChange && typeof options.onChange === 'function') {
                options.onChange(newValue);
            }
        };

        const onPointerUp = () => {
            if (!isDragging) return;
            isDragging = false;
            knobEl.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            if (options.onRelease && typeof options.onRelease === 'function') {
                options.onRelease(options.currentValue);
            }
        };

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
    });
    knobEl.addEventListener('dblclick', () => {
        if (options.defaultValue !== undefined) {
            options.currentValue = options.defaultValue;
            const displayVal = parseFloat(options.defaultValue).toFixed(options.decimals || 2);
            valueDisplayEl.textContent = displayVal + (options.displaySuffix || '');
            knobEl.title = `${options.label}: ${displayVal}`;
            const newRotation = Math.max(-135, Math.min(135, ((options.defaultValue - min) / range) * 270 - 135));
            handleEl.style.transform = `translateX(-50%) rotate(${newRotation}deg)`;
            if (options.onChange) options.onChange(options.defaultValue);
            if (options.onRelease) options.onRelease(options.defaultValue);
        }
    });

    container.appendChild(labelEl);
    container.appendChild(knobEl);
    container.appendChild(valueDisplayEl);
    return container;
}

// --- Track Inspector Window ---
export function openTrackInspectorWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById(trackId);
    if (!track) {
        utilShowNotification(`Error: Track ID ${trackId} not found. Cannot open inspector.`, "error");
        return;
    }

    const windowId = `trackInspector-${trackId}`;
    if (!savedState && localAppServices.getWindowByIdState(windowId)?.element) {
        localAppServices.getWindowByIdState(windowId).focus();
        return localAppServices.getWindowByIdState(windowId);
    }
    
    let contentHTML = `
        <div class="p-2 space-y-3 text-sm">
            <div class="flex items-center space-x-2">
                <label for="inspectorTrackName-${trackId}" class="font-semibold">Name:</label>
                <input type="text" id="inspectorTrackName-${trackId}" value="${track.name}" class="flex-grow bg-slate-700 p-1 rounded text-xs">
            </div>
            <div class="grid grid-cols-2 gap-x-4 gap-y-2 items-center">
                <div><label for="inspectorTrackVolume-${trackId}" class="text-xs">Volume:</label></div>
                <input type="range" id="inspectorTrackVolume-${trackId}" min="-60" max="6" step="0.1" value="${track.getVolumeDb()}" class="w-full h-2 accent-blue-500">
                <div><label for="inspectorTrackPan-${trackId}" class="text-xs">Pan:</label></div>
                <input type="range" id="inspectorTrackPan-${trackId}" min="-1" max="1" step="0.01" value="${track.pan.value}" class="w-full h-2 accent-blue-500">
            </div>
             ${track.type === 'Audio' ? `
                <div class="flex items-center space-x-2">
                    <input type="checkbox" id="inspectorTrackMonitor-${trackId}" ${track.isMonitoringEnabled ? 'checked' : ''} class="form-checkbox h-4 w-4 text-blue-500 rounded bg-slate-700 border-slate-600 focus:ring-blue-400">
                    <label for="inspectorTrackMonitor-${trackId}" class="text-xs">Monitor Input</label>
                </div>
            ` : ''}
            <hr class="border-slate-600">
            <div id="trackSpecificControls-${trackId}" class="space-y-2">
                </div>
        </div>`;

    const options = { width: 280, minWidth: 250, height: 450, minHeight:300, initialContentKey: windowId,
        onCloseCallback: () => { /* console.log(`Inspector for ${track.name} closed.`); */ }
    };
    if (savedState) Object.assign(options, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });

    const inspectorWindow = localAppServices.createWindow(windowId, `Inspector: ${track.name}`, contentHTML, options);

    if (inspectorWindow?.element) {
        const nameInput = inspectorWindow.element.querySelector(`#inspectorTrackName-${trackId}`);
        const volumeSlider = inspectorWindow.element.querySelector(`#inspectorTrackVolume-${trackId}`);
        const panSlider = inspectorWindow.element.querySelector(`#inspectorTrackPan-${trackId}`);
        const monitorCheckbox = inspectorWindow.element.querySelector(`#inspectorTrackMonitor-${trackId}`);

        nameInput.addEventListener('change', (e) => track.setName(e.target.value));
        volumeSlider.addEventListener('input', (e) => track.setVolumeDb(parseFloat(e.target.value)));
        panSlider.addEventListener('input', (e) => track.setPan(parseFloat(e.target.value)));
        if (monitorCheckbox) {
            monitorCheckbox.addEventListener('change', (e) => track.setMonitoring(e.target.checked));
        }
        
        // Inject track-type specific controls
        const specificControlsContainer = inspectorWindow.element.querySelector(`#trackSpecificControls-${trackId}`);
        _injectTrackSpecificControls(track, specificControlsContainer);
    }
    return inspectorWindow;
}

function _injectTrackSpecificControls(track, container) {
    container.innerHTML = ''; // Clear previous controls
    const effectsRegistry = localAppServices.effectsRegistryAccess;

    if (track.type === 'Synth' && effectsRegistry?.synthEngineControlDefinitions?.[track.synthType || 'MonoSynth']) {
        const controlsHtml = effectsRegistry.synthEngineControlDefinitions[track.synthType || 'MonoSynth']
            .map(def => {
                const controlId = `synthParam-${track.id}-${def.idPrefix}`;
                let currentVal = track.getSynthParam(def.path);
                if (currentVal === undefined) currentVal = def.defaultValue;

                if (def.type === 'knob') {
                    // Placeholder for knob, will be rendered by createKnob
                    return `<div class="synth-control-placeholder" data-control-type="knob" data-id-prefix="${def.idPrefix}" data-param-key="${def.path}" data-label="${def.label}" data-min="${def.min}" data-max="${def.max}" data-step="${def.step}" data-default-value="${def.defaultValue}" data-decimals="${def.decimals || 2}" data-current-value="${currentVal}" data-suffix="${def.displaySuffix || ''}"></div>`;
                } else if (def.type === 'select') {
                    const optionsHtml = def.options.map(opt => `<option value="${opt}" ${opt === currentVal ? 'selected' : ''}>${opt}</option>`).join('');
                    return `<div class="flex flex-col mb-1"><label class="text-xs text-slate-400" for="${controlId}">${def.label}:</label><select id="${controlId}" data-path="${def.path}" class="bg-slate-700 p-1 rounded text-xs">${optionsHtml}</select></div>`;
                }
                return '';
            }).join('');
        container.innerHTML = `<h4 class="text-xs font-semibold text-slate-300 border-b border-slate-600 pb-1 mb-2">${track.synthType || 'MonoSynth'} Controls</h4><div class="grid grid-cols-2 gap-x-1 gap-y-0 items-start">${controlsHtml}</div>`;
        
        // Render knobs and attach listeners for selects
        container.querySelectorAll('.synth-control-placeholder[data-control-type="knob"]').forEach(ph => {
            const knobContainer = createKnob({
                trackId: track.id,
                idPrefix: ph.dataset.idPrefix,
                paramKey: ph.dataset.paramKey,
                label: ph.dataset.label,
                min: parseFloat(ph.dataset.min),
                max: parseFloat(ph.dataset.max),
                step: parseFloat(ph.dataset.step),
                currentValue: parseFloat(ph.dataset.currentValue),
                defaultValue: parseFloat(ph.dataset.defaultValue),
                decimals: parseInt(ph.dataset.decimals),
                displaySuffix: ph.dataset.suffix,
                onChange: (val) => track.setSynthParam(ph.dataset.paramKey, val),
                onRelease: () => localAppServices.captureStateForUndoInternal(`Change ${track.name} ${ph.dataset.label}`)
            });
            ph.replaceWith(knobContainer);
        });

        container.querySelectorAll('select[data-path]').forEach(select => {
            select.addEventListener('change', (e) => {
                track.setSynthParam(e.target.dataset.path, e.target.value);
                localAppServices.captureStateForUndoInternal(`Change ${track.name} ${select.previousElementSibling.textContent}`);
            });
        });

    } else if (track.type === 'Sampler') {
        container.innerHTML = `
            <h4 class="text-xs font-semibold text-slate-300 border-b border-slate-600 pb-1 mb-2">Sampler Controls</h4>
            ${createDropZoneHTML(`samplerDropZone-${track.id}`, 'Drop Audio File or Click to Load Sample')}
            <canvas id="samplerWaveform-${track.id}" class="w-full h-16 bg-slate-800 border border-slate-600 rounded my-1 waveform-canvas"></canvas>
            <div class="grid grid-cols-4 gap-1 my-1" id="samplerPadsContainer-${track.id}"></div>
             <div id="sliceEditorContainer-${track.id}" class="mt-2 p-1.5 border border-slate-600 rounded bg-slate-750 space-y-1">
                <h5 class="text-xs text-slate-300">Edit Slice <span id="selectedSliceNum-${track.id}">1</span>:</h5>
                <div class="grid grid-cols-2 gap-1 text-xs">
                    ${['Volume', 'Pitch', 'Loop', 'Reverse'].map(param => `<div><label for="slice${param}-${track.id}">${param}:</label></div><div></div>`).join('')}
                </div>
            </div>
            <button id="autoSliceBtn-${track.id}" class="w-full p-1 bg-blue-600 hover:bg-blue-500 rounded text-xs mt-1">Auto-Slice (${Constants.numSlices} Slices)</button>
        `;
        setupGenericDropZoneListeners(container.querySelector(`#samplerDropZone-${track.id}`), (file) => {
            localAppServices.loadSampleFile(file, track.id, 'Sampler');
        }, `#sampleFileInput-${track.id}`); // Need unique file input ID if multiple
        
        drawWaveform(track);
        renderSamplePads(track);
        updateSliceEditorUI(track);

        container.querySelector(`#autoSliceBtn-${track.id}`).addEventListener('click', () => {
            localAppServices.autoSliceSample(track.id, Constants.numSlices);
        });


    } else if (track.type === 'DrumSampler') {
         container.innerHTML = `
            <h4 class="text-xs font-semibold text-slate-300 border-b border-slate-600 pb-1 mb-2">Drum Sampler Controls</h4>
            <div class="grid grid-cols-4 gap-2 my-2" id="drumPadsDisplayContainer-${track.id}">
                ${Array(Constants.numDrumSamplerPads).fill(0).map((_, i) => `
                    <div id="drumPadDropZone-${track.id}-${i}" class="pad-button aspect-square flex flex-col justify-center items-center bg-slate-700 hover:bg-slate-600 border-slate-500 rounded" data-pad-index="${i}">
                        <span class="text-xs text-slate-400 pad-label">Pad ${i + 1}</span>
                        <span class="text-xxs text-slate-500 pad-filename" id="drumPadFilename-${track.id}-${i}">Empty</span>
                    </div>
                `).join('')}
            </div>
            <div id="drumPadEditContainer-${track.id}" class="mt-2 p-1.5 border border-slate-600 rounded bg-slate-750 space-y-1">
                 <h5 class="text-xs text-slate-300">Edit Pad <span id="selectedDrumPadNum-${track.id}">1</span>:</h5>
                 <div class="grid grid-cols-2 gap-1 text-xs">
                    ${['Volume', 'Pitch', 'Auto-Stretch', 'Beats (Stretch)'].map(param => `<div><label for="drumPad${param.replace(/\s|\(|\)/g, '')}-${track.id}">${param}:</label></div><div></div>`).join('')}
                 </div>
            </div>`;
        renderDrumSamplerPads(track); // Renders pads and attaches listeners
        updateDrumPadControlsUI(track, track.selectedDrumPadForEdit);


    } else if (track.type === 'InstrumentSampler') {
        container.innerHTML = `
            <h4 class="text-xs font-semibold text-slate-300 border-b border-slate-600 pb-1 mb-2">Instrument Sampler</h4>
            ${createDropZoneHTML(`instrumentSamplerDropZone-${track.id}`, 'Drop Audio File or Click to Load Sample')}
            <canvas id="instrumentSamplerWaveform-${track.id}" class="w-full h-16 bg-slate-800 border border-slate-600 rounded my-1 waveform-canvas"></canvas>
            <div class="grid grid-cols-2 gap-x-2 gap-y-1 text-xs mt-1">
                <div><label for="instSamplerLoopStart-${track.id}">Loop Start:</label></div><input type="number" id="instSamplerLoopStart-${track.id}" class="bg-slate-700 p-0.5 rounded text-xs w-full" value="0" step="0.001">
                <div><label for="instSamplerLoopEnd-${track.id}">Loop End:</label></div><input type="number" id="instSamplerLoopEnd-${track.id}" class="bg-slate-700 p-0.5 rounded text-xs w-full" value="0" step="0.001">
                <div><label for="instSamplerLoopToggle-${track.id}">Loop:</label></div><input type="checkbox" id="instSamplerLoopToggle-${track.id}" class="form-checkbox h-3.5 w-3.5">
                <div><label for="instSamplerRelease-${track.id}">Release (s):</label></div><input type="number" id="instSamplerRelease-${track.id}" class="bg-slate-700 p-0.5 rounded text-xs w-full" value="0.1" step="0.01" min="0">
            </div>`;
        setupGenericDropZoneListeners(container.querySelector(`#instrumentSamplerDropZone-${track.id}`), (file) => {
            localAppServices.loadSampleFile(file, track.id, 'InstrumentSampler');
        }, `sampleFileInput-${track.id}-inst`);
        drawInstrumentWaveform(track); // Initial draw if sample exists

        const loopStartInput = container.querySelector(`#instSamplerLoopStart-${track.id}`);
        const loopEndInput = container.querySelector(`#instSamplerLoopEnd-${track.id}`);
        const loopToggle = container.querySelector(`#instSamplerLoopToggle-${track.id}`);
        const releaseInput = container.querySelector(`#instSamplerRelease-${track.id}`);

        if(track.instrumentSamplerSettings) {
            loopStartInput.value = track.instrumentSamplerSettings.loopStart?.toFixed(3) || 0;
            loopEndInput.value = track.instrumentSamplerSettings.loopEnd?.toFixed(3) || 0;
            loopToggle.checked = track.instrumentSamplerSettings.loop || false;
            releaseInput.value = track.instrumentSamplerSettings.releaseTime?.toFixed(2) || 0.1;
        }
        const updateInstSamplerParams = () => {
            track.updateInstrumentSamplerParams({
                loopStart: parseFloat(loopStartInput.value),
                loopEnd: parseFloat(loopEndInput.value),
                loop: loopToggle.checked,
                releaseTime: parseFloat(releaseInput.value),
            });
             localAppServices.captureStateForUndoInternal(`Update ${track.name} Inst. Sampler`);
        };
        loopStartInput.addEventListener('change', updateInstSamplerParams);
        loopEndInput.addEventListener('change', updateInstSamplerParams);
        loopToggle.addEventListener('change', updateInstSamplerParams);
        releaseInput.addEventListener('change', updateInstSamplerParams);


    } else if (track.type === 'Audio') {
        // Primarily waveform display and clip management, handled by timeline.
        // Could add input selection if multiple inputs are supported.
         container.innerHTML = `<div class="text-xs text-slate-400">Audio track controls (e.g., input selection if supported) would appear here. Waveform is on timeline.</div>`;
    }
}

// --- Effects Rack Window ---
export function openTrackEffectsRackWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById(trackId);
    if (!track) {
        utilShowNotification(`Error: Track ID ${trackId} not found. Cannot open effects rack.`, "error");
        return;
    }
    const windowId = `effectsRack-${trackId}`;
     if (!savedState && localAppServices.getWindowByIdState(windowId)?.element) {
        localAppServices.getWindowByIdState(windowId).focus();
        return localAppServices.getWindowByIdState(windowId);
    }

    const content = `
        <div class="effects-rack-content p-2 flex flex-col h-full text-sm">
            <div class="flex justify-between items-center mb-2">
                <h4 class="text-xs font-semibold text-slate-300">Effects Chain</h4>
                <button id="addEffectBtn-${trackId}" class="p-1 text-xs bg-blue-600 hover:bg-blue-500 rounded-sm"><i class="fas fa-plus mr-1"></i>Add Effect</button>
            </div>
            <div id="effectsList-${trackId}" class="effects-list-container flex-grow space-y-1.5 overflow-y-auto border border-slate-700 p-1 rounded bg-slate-800 min-h-[80px]">
                </div>
            <div id="effectControlsContainer-${trackId}" class="effect-controls-panel mt-2 p-1 border-t border-slate-700 overflow-y-auto max-h-[200px]">
                </div>
        </div>`;

    const options = { width: 350, height: 400, minWidth:300, minHeight:250, initialContentKey: windowId };
    if (savedState) Object.assign(options, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });

    const rackWindow = localAppServices.createWindow(windowId, `Effects: ${track.name}`, content, options);

    if (rackWindow?.element) {
        rackWindow.element.querySelector(`#addEffectBtn-${trackId}`).addEventListener('click', () => {
            localAppServices.showAddEffectModal(track, 'track');
        });
        const listDiv = rackWindow.element.querySelector(`#effectsList-${trackId}`);
        const controlsContainer = rackWindow.element.querySelector(`#effectControlsContainer-${trackId}`);
        renderEffectsList(track, 'track', listDiv, controlsContainer); // Initial render
    }
    return rackWindow;
}

export function openMasterEffectsRackWindow(savedState = null) {
    const windowId = 'masterEffectsRack';
     if (!savedState && localAppServices.getWindowByIdState(windowId)?.element) {
        localAppServices.getWindowByIdState(windowId).focus();
        return localAppServices.getWindowByIdState(windowId);
    }
    const content = `
        <div class="effects-rack-content p-2 flex flex-col h-full text-sm">
            <div class="flex justify-between items-center mb-2">
                <h4 class="text-xs font-semibold text-slate-300">Master Effects Chain</h4>
                <button id="addMasterEffectBtn" class="p-1 text-xs bg-blue-600 hover:bg-blue-500 rounded-sm"><i class="fas fa-plus mr-1"></i>Add Effect</button>
            </div>
            <div id="effectsList-master" class="effects-list-container flex-grow space-y-1.5 overflow-y-auto border border-slate-700 p-1 rounded bg-slate-800 min-h-[80px]">
            </div>
            <div id="effectControlsContainer-master" class="effect-controls-panel mt-2 p-1 border-t border-slate-700 overflow-y-auto max-h-[200px]">
            </div>
        </div>`;
    const options = { width: 350, height: 400, minWidth:300, minHeight:250, initialContentKey: windowId };
    if (savedState) Object.assign(options, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    
    const rackWindow = localAppServices.createWindow(windowId, 'Master Effects', content, options);
    if (rackWindow?.element) {
        rackWindow.element.querySelector('#addMasterEffectBtn').addEventListener('click', () => {
            localAppServices.showAddEffectModal(null, 'master');
        });
        const listDiv = rackWindow.element.querySelector('#effectsList-master');
        const controlsContainer = rackWindow.element.querySelector('#effectControlsContainer-master');
        renderEffectsList(null, 'master', listDiv, controlsContainer); // Initial render
    }
    return rackWindow;
}


// --- UI Rendering Functions (Effects, Sampler, etc.) ---
export function drawWaveform(track) {
    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded) return;
    const inspectorWindow = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow || !inspectorWindow.element) return;

    const canvas = inspectorWindow.element.querySelector(`#samplerWaveform-${track.id}`);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const data = track.audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;
    ctx.beginPath();
    ctx.moveTo(0, amp);
    ctx.strokeStyle = Constants.THEME_DARK.accentInfo || '#06b6d4'; // Fallback
    ctx.lineWidth = 1;

    for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.lineTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp); // Draw both min and max to fill area
    }
    ctx.lineTo(width, amp); // Ensure line closes path if fill is used
    ctx.stroke();
}

export function drawInstrumentWaveform(track) {
    if (!track || track.type !== 'InstrumentSampler' || !track.instrumentSamplerSettings?.audioBuffer?.loaded) return;
    const inspectorWindow = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow || !inspectorWindow.element) return;

    const canvas = inspectorWindow.element.querySelector(`#instrumentSamplerWaveform-${track.id}`);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const buffer = track.instrumentSamplerSettings.audioBuffer;
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;

    ctx.fillStyle = 'rgba(100, 100, 100, 0.2)'; // Loop region background
    if (track.instrumentSamplerSettings.loop) {
        const loopStartPixel = (track.instrumentSamplerSettings.loopStart / buffer.duration) * width;
        const loopEndPixel = (track.instrumentSamplerSettings.loopEnd / buffer.duration) * width;
        ctx.fillRect(loopStartPixel, 0, loopEndPixel - loopStartPixel, height);
    }

    ctx.beginPath();
    ctx.moveTo(0, amp);
    ctx.strokeStyle = Constants.THEME_DARK.accentPrimary || '#3b82f6';
    ctx.lineWidth = 1;

    for (let i = 0; i < width; i++) {
        let min = 1.0; let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.lineTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.lineTo(width, amp);
    ctx.stroke();
}

export function renderSamplePads(track) {
    if (!track || track.type !== 'Sampler') return;
    const inspectorWindow = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow || !inspectorWindow.element) return;

    const padsContainer = inspectorWindow.element.querySelector(`#samplerPadsContainer-${track.id}`);
    if (!padsContainer) return;
    padsContainer.innerHTML = '';

    track.slices.forEach((slice, index) => {
        const pad = document.createElement('button');
        pad.className = `pad-button aspect-square text-xs ${track.selectedSliceForEdit === index ? 'selected-for-edit ring-2 ring-blue-400' : 'bg-slate-700 hover:bg-slate-600'}`;
        pad.textContent = `Slice ${index + 1}`;
        pad.addEventListener('click', () => {
            track.selectedSliceForEdit = index;
            renderSamplePads(track); // Re-render to update selection
            updateSliceEditorUI(track);
            if (localAppServices.playSlicePreview) localAppServices.playSlicePreview(track.id, index);
        });
        padsContainer.appendChild(pad);
    });
}

export function updateSliceEditorUI(track) {
    if (!track || track.type !== 'Sampler' || track.selectedSliceForEdit === null) return;
    const inspectorWindow = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow || !inspectorWindow.element) return;

    const editorContainer = inspectorWindow.element.querySelector(`#sliceEditorContainer-${track.id}`);
    const sliceNumSpan = inspectorWindow.element.querySelector(`#selectedSliceNum-${track.id}`);
    if (!editorContainer || !sliceNumSpan) return;

    const slice = track.slices[track.selectedSliceForEdit];
    if (!slice) { editorContainer.innerHTML = '<p class="text-xs text-slate-400">No slice selected or slice data missing.</p>'; return; }

    sliceNumSpan.textContent = track.selectedSliceForEdit + 1;
    // For brevity, only implementing volume control. Others would follow a similar pattern.
    editorContainer.innerHTML = `
        <h5 class="text-xs text-slate-300">Edit Slice ${track.selectedSliceForEdit + 1} (Offset: ${slice.offset.toFixed(2)}s, Dur: ${slice.duration.toFixed(2)}s):</h5>
        <div class="grid grid-cols-2 gap-1 items-center text-xs">
            <div><label for="sliceVolume-${track.id}-${track.selectedSliceForEdit}">Volume:</label></div>
            <input type="range" id="sliceVolume-${track.id}-${track.selectedSliceForEdit}" min="0" max="1" step="0.01" value="${slice.volume}" class="w-full h-1.5 accent-blue-500">
            <div><label for="slicePitch-${track.id}-${track.selectedSliceForEdit}">Pitch (st):</label></div>
            <input type="number" id="slicePitch-${track.id}-${track.selectedSliceForEdit}" min="-24" max="24" step="1" value="${slice.pitchShift || 0}" class="bg-slate-600 p-0.5 rounded text-xs w-full">
            <div><label for="sliceLoop-${track.id}-${track.selectedSliceForEdit}">Loop:</label></div>
            <input type="checkbox" id="sliceLoop-${track.id}-${track.selectedSliceForEdit}" ${slice.loop ? 'checked' : ''} class="form-checkbox h-3 w-3">
            <div><label for="sliceReverse-${track.id}-${track.selectedSliceForEdit}">Reverse:</label></div>
            <input type="checkbox" id="sliceReverse-${track.id}-${track.selectedSliceForEdit}" ${slice.reverse ? 'checked' : ''} class="form-checkbox h-3 w-3">
        </div>`;

    const volSlider = editorContainer.querySelector(`#sliceVolume-${track.id}-${track.selectedSliceForEdit}`);
    const pitchInput = editorContainer.querySelector(`#slicePitch-${track.id}-${track.selectedSliceForEdit}`);
    const loopCheck = editorContainer.querySelector(`#sliceLoop-${track.id}-${track.selectedSliceForEdit}`);
    const reverseCheck = editorContainer.querySelector(`#sliceReverse-${track.id}-${track.selectedSliceForEdit}`);

    const updateSliceParam = (param, value) => {
        track.updateSliceParam(track.selectedSliceForEdit, param, value);
        // No direct undo here; part of larger sample edit or sequence
    };
    if(volSlider) volSlider.addEventListener('input', (e) => updateSliceParam('volume', parseFloat(e.target.value)));
    if(pitchInput) pitchInput.addEventListener('change', (e) => updateSliceParam('pitchShift', parseInt(e.target.value)));
    if(loopCheck) loopCheck.addEventListener('change', (e) => updateSliceParam('loop', e.target.checked));
    if(reverseCheck) reverseCheck.addEventListener('change', (e) => updateSliceParam('reverse', e.target.checked));
}

export function renderDrumSamplerPads(track, optPadIndexToSelect) {
    if (!track || track.type !== 'DrumSampler') return;
    const inspectorWindow = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow || !inspectorWindow.element) return;

    const padsContainer = inspectorWindow.element.querySelector(`#drumPadsDisplayContainer-${track.id}`);
    if (!padsContainer) { console.error("Drum pads container not found"); return; }

    padsContainer.innerHTML = ''; // Clear existing before re-render

    track.drumSamplerPads.forEach((padData, index) => {
        const padElement = document.createElement('div');
        padElement.id = `drumPadDropZone-${track.id}-${index}`;
        padElement.className = `pad-button aspect-square flex flex-col justify-center items-center border rounded cursor-pointer
            ${track.selectedDrumPadForEdit === index ? 'bg-blue-700 border-blue-400 ring-2 ring-blue-400' : 'bg-slate-700 hover:bg-slate-600 border-slate-500'}`;
        padElement.dataset.padIndex = index;

        const labelSpan = document.createElement('span');
        labelSpan.className = 'text-xs text-slate-400 pad-label';
        labelSpan.textContent = `Pad ${index + 1}`;

        const filenameSpan = document.createElement('span');
        filenameSpan.className = 'text-xxs text-slate-500 pad-filename truncate max-w-[90%]';
        filenameSpan.id = `drumPadFilename-${track.id}-${index}`;
        filenameSpan.textContent = padData.originalFileName ? padData.originalFileName.substring(0,10)+'...' : 'Empty';
        if (padData.status === 'loading') filenameSpan.textContent = 'Loading...';
        else if (padData.status === 'error') filenameSpan.textContent = 'Error!';


        padElement.appendChild(labelSpan);
        padElement.appendChild(filenameSpan);
        padsContainer.appendChild(padElement);

        setupGenericDropZoneListeners(padElement, (file) => {
            localAppServices.loadDrumSamplerPadFile(file, track.id, index);
        }, `drumPadFileInput-${track.id}-${index}`);

        padElement.addEventListener('click', () => {
            track.selectedDrumPadForEdit = index;
            renderDrumSamplerPads(track); // Re-render pads for selection highlight
            updateDrumPadControlsUI(track, index);
            if (padData.audioBuffer && padData.audioBuffer.loaded && localAppServices.playDrumSamplerPadPreview) {
                localAppServices.playDrumSamplerPadPreview(track.id, index);
            }
        });
    });
     if(optPadIndexToSelect !== undefined) {
        track.selectedDrumPadForEdit = optPadIndexToSelect;
        updateDrumPadControlsUI(track, optPadIndexToSelect);
    }
}

export function updateDrumPadControlsUI(track, padIndex) {
    if (!track || track.type !== 'DrumSampler' || typeof padIndex !== 'number' || !track.drumSamplerPads[padIndex]) return;
    const inspectorWindow = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState(`trackInspector-${track.id}`) : null;
    if (!inspectorWindow || !inspectorWindow.element) return;

    const editContainer = inspectorWindow.element.querySelector(`#drumPadEditContainer-${track.id}`);
    const padNumSpan = inspectorWindow.element.querySelector(`#selectedDrumPadNum-${track.id}`);
    if (!editContainer || !padNumSpan) { console.error("Drum pad edit container or num span not found"); return; }

    const padData = track.drumSamplerPads[padIndex];
    padNumSpan.textContent = padIndex + 1;

    editContainer.innerHTML = `
        <h5 class="text-xs text-slate-300">Edit Pad ${padIndex + 1}: <span class="font-mono text-blue-300 text-xxs">${padData.originalFileName || 'No sample'}</span></h5>
        <div class="grid grid-cols-2 gap-x-2 gap-y-1 items-center text-xs">
            <div><label for="drumPadVolume-${track.id}-${padIndex}">Volume:</label></div>
            <input type="range" id="drumPadVolume-${track.id}-${padIndex}" min="0" max="1" step="0.01" value="${padData.volume}" class="w-full h-1.5 accent-orange-500">

            <div><label for="drumPadPitch-${track.id}-${padIndex}">Pitch (st):</label></div>
            <input type="number" id="drumPadPitch-${track.id}-${padIndex}" min="-24" max="24" step="1" value="${padData.pitchShift || 0}" class="bg-slate-600 p-0.5 rounded text-xs w-full">

            <div><label for="drumPadAutoStretch-${track.id}-${padIndex}">Auto-Stretch:</label></div>
            <input type="checkbox" id="drumPadAutoStretch-${track.id}-${padIndex}" ${padData.autoStretchEnabled ? 'checked' : ''} class="form-checkbox h-3 w-3">
            
            <div class="${padData.autoStretchEnabled ? '' : 'opacity-50'}"><label for="drumPadStretchBeats-${track.id}-${padIndex}">Beats:</label></div>
            <input type="number" id="drumPadStretchBeats-${track.id}-${padIndex}" min="0.1" max="16" step="0.1" value="${padData.stretchBeats || 1}" class="bg-slate-600 p-0.5 rounded text-xs w-full ${padData.autoStretchEnabled ? '' : 'pointer-events-none'}">
        </div>`;

    const volSlider = editContainer.querySelector(`#drumPadVolume-${track.id}-${padIndex}`);
    const pitchInput = editContainer.querySelector(`#drumPadPitch-${track.id}-${padIndex}`);
    const stretchCheck = editContainer.querySelector(`#drumPadAutoStretch-${track.id}-${padIndex}`);
    const beatsInput = editContainer.querySelector(`#drumPadStretchBeats-${track.id}-${padIndex}`);
    
    const updateDrumPadParam = (param, value) => {
        track.updateDrumPadParam(padIndex, param, value);
        if (param === 'autoStretchEnabled') { // Re-render this section if stretch enabled changes
            updateDrumPadControlsUI(track, padIndex);
        }
        // No direct undo here, part of overall project state
    };

    if(volSlider) volSlider.addEventListener('input', (e) => updateDrumPadParam('volume', parseFloat(e.target.value)));
    if(pitchInput) pitchInput.addEventListener('change', (e) => updateDrumPadParam('pitchShift', parseInt(e.target.value)));
    if(stretchCheck) stretchCheck.addEventListener('change', (e) => updateDrumPadParam('autoStretchEnabled', e.target.checked));
    if(beatsInput) beatsInput.addEventListener('change', (e) => updateDrumPadParam('stretchBeats', parseFloat(e.target.value)));
}


// --- Effect Rendering ---
export function renderEffectsList(track, ownerType = 'track', listContainer, controlsContainer) { // ownerType: 'track' or 'master'
    if (!listContainer) {
        console.warn(`[renderEffectsList] List container not provided for owner ${track ? track.id : 'master'}.`);
        return;
    }
    listContainer.innerHTML = ''; // Clear existing effects

    const effects = ownerType === 'track' ? track.activeEffects : (localAppServices.getMasterEffectsState ? localAppServices.getMasterEffectsState() : []);
    const effectsRegistry = localAppServices.effectsRegistryAccess;

    if (!effects || effects.length === 0) {
        listContainer.innerHTML = `<div class="text-xs text-center text-slate-500 italic py-2">No effects added.</div>`;
        if (controlsContainer) controlsContainer.innerHTML = ''; // Clear controls if no effects
        return;
    }

    effects.forEach((effect, index) => {
        const effectDef = effectsRegistry.AVAILABLE_EFFECTS[effect.type];
        const effectDiv = document.createElement('div');
        effectDiv.className = 'effect-item flex items-center justify-between p-1.5 bg-slate-700 hover:bg-slate-650 rounded text-xs cursor-pointer mb-1';
        effectDiv.dataset.effectId = effect.id;
        effectDiv.draggable = true; // For reordering

        effectDiv.innerHTML = `
            <span class="effect-name truncate flex-grow ${effect.isBypassed ? 'line-through text-slate-500' : ''}">${index + 1}. ${effectDef?.displayName || effect.type}</span>
            <div class="effect-item-buttons flex items-center">
                <button class="bypass-effect-btn p-0.5 w-5 h-5 text-slate-400 hover:text-yellow-400" title="Bypass"><i class="fas fa-power-off ${effect.isBypassed ? 'text-red-500' : ''}"></i></button>
                <button class="remove-effect-btn p-0.5 w-5 h-5 text-slate-400 hover:text-red-400" title="Remove"><i class="fas fa-times"></i></button>
            </div>`;

        effectDiv.addEventListener('click', (e) => {
            if (e.target.closest('.effect-item-buttons')) return; // Don't select if clicking buttons
            // Highlight selected effect
            listContainer.querySelectorAll('.ring-2').forEach(el => el.classList.remove('ring-2', 'ring-blue-500'));
            effectDiv.classList.add('ring-2', 'ring-blue-500');
            if (controlsContainer) renderEffectControls(track, ownerType, effect.id, controlsContainer);
        });

        effectDiv.querySelector('.bypass-effect-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (ownerType === 'track') track.toggleBypassEffect(effect.id);
            else if (ownerType === 'master' && localAppServices.toggleBypassMasterEffect) localAppServices.toggleBypassMasterEffect(effect.id);
            renderEffectsList(track, ownerType, listContainer, controlsContainer); // Re-render to show bypass state
            if (controlsContainer.dataset.currentEffectId === effect.id) { // Also re-render controls if it's the selected one
                 renderEffectControls(track, ownerType, effect.id, controlsContainer);
            }
        });
        effectDiv.querySelector('.remove-effect-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showConfirmationDialog(`Remove effect "${effectDef?.displayName || effect.type}"?`, () => {
                if (ownerType === 'track') track.removeEffect(effect.id);
                else if (ownerType === 'master' && localAppServices.removeMasterEffect) localAppServices.removeMasterEffect(effect.id);
                renderEffectsList(track, ownerType, listContainer, controlsContainer); // Re-render list
                if (controlsContainer.dataset.currentEffectId === effect.id) controlsContainer.innerHTML = ''; // Clear controls
            });
        });
        
        // Drag and Drop for reordering
        effectDiv.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({ effectId: effect.id, ownerType, trackId: ownerType === 'track' ? track.id : null }));
            e.dataTransfer.effectAllowed = 'move';
            effectDiv.classList.add('opacity-50');
        });
        effectDiv.addEventListener('dragend', (e) => effectDiv.classList.remove('opacity-50'));
        effectDiv.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; effectDiv.classList.add('border-t-2', 'border-blue-500'); });
        effectDiv.addEventListener('dragleave', (e) => effectDiv.classList.remove('border-t-2', 'border-blue-500'));
        effectDiv.addEventListener('drop', (e) => {
            e.preventDefault();
            effectDiv.classList.remove('border-t-2', 'border-blue-500');
            const droppedData = JSON.parse(e.dataTransfer.getData('text/plain'));
            if (droppedData.ownerType === ownerType && (ownerType === 'master' || droppedData.trackId === track.id)) {
                const targetIndex = Array.from(listContainer.children).indexOf(effectDiv);
                if (ownerType === 'track') track.reorderEffect(droppedData.effectId, targetIndex);
                else if (ownerType === 'master' && localAppServices.reorderMasterEffect) localAppServices.reorderMasterEffect(droppedData.effectId, targetIndex);
                renderEffectsList(track, ownerType, listContainer, controlsContainer);
            }
        });

        listContainer.appendChild(effectDiv);
    });
}

export function renderEffectControls(track, ownerType, effectId, controlsContainer) {
    if (!controlsContainer) return;
    controlsContainer.innerHTML = ''; // Clear previous
    controlsContainer.dataset.currentEffectId = effectId; // Store which effect's controls are shown

    const effectsRegistry = localAppServices.effectsRegistryAccess;
    const effect = ownerType === 'track' ?
        track.activeEffects.find(e => e.id === effectId) :
        (localAppServices.getMasterEffectsState ? localAppServices.getMasterEffectsState().find(e => e.id === effectId) : null);

    if (!effect) {
        controlsContainer.innerHTML = '<p class="text-xs text-slate-500 italic">Select an effect to see its controls.</p>';
        return;
    }

    const effectDef = effectsRegistry.AVAILABLE_EFFECTS[effect.type];
    if (!effectDef || !effectDef.params || effectDef.params.length === 0) {
        controlsContainer.innerHTML = `<p class="text-xs text-slate-400 italic">Effect "${effectDef?.displayName || effect.type}" has no adjustable parameters.</p>`;
        return;
    }

    const controlsGrid = document.createElement('div');
    controlsGrid.className = 'grid grid-cols-2 gap-x-1 gap-y-0 items-start text-xs'; // Denser grid

    effectDef.params.forEach(paramDef => {
        let currentValue = effect.params; // Start with the params object of the effect instance
        // Navigate nested param paths
        const pathKeys = paramDef.key.split('.');
        for (const key of pathKeys) {
            if (currentValue && typeof currentValue === 'object' && key in currentValue) {
                currentValue = currentValue[key];
            } else {
                // Fallback to default if path not found in current params (e.g., new param for an old effect instance)
                console.warn(`Path ${paramDef.key} not found in effect params for ${effect.type}. Using default.`);
                currentValue = paramDef.defaultValue;
                break;
            }
        }
        if (currentValue === undefined) currentValue = paramDef.defaultValue; // Ensure a value

        const controlId = `effectParam-${effect.id}-${paramDef.key.replace(/\./g, '_')}`;

        if (paramDef.type === 'knob') {
            const knobContainer = createKnob({
                idPrefix: 'effectParam',
                trackId: ownerType === 'track' ? track.id : 'master', // Use appropriate owner identifier
                paramKey: paramDef.key, // Pass full path key
                label: paramDef.label,
                min: paramDef.min, max: paramDef.max, step: paramDef.step,
                currentValue: currentValue,
                defaultValue: paramDef.defaultValue,
                decimals: paramDef.decimals, displaySuffix: paramDef.displaySuffix,
                onChange: (val) => {
                    if (ownerType === 'track') track.updateEffectParam(effect.id, paramDef.key, val);
                    else if (ownerType === 'master' && localAppServices.updateMasterEffectParam) localAppServices.updateMasterEffectParam(effect.id, paramDef.key, val);
                },
                 onRelease: () => { // Capture undo on release
                    const undoDesc = `Change ${effectDef.displayName} ${paramDef.label}`;
                    if (ownerType === 'track') localAppServices.captureStateForUndoInternal(undoDesc);
                    else if (ownerType === 'master') localAppServices.captureStateForUndoInternal(undoDesc);
                }
            });
            controlsGrid.appendChild(knobContainer);

        } else if (paramDef.type === 'select') {
            const selectContainer = document.createElement('div');
            selectContainer.className = 'flex flex-col mb-1 col-span-2'; // Selects can span full width if needed
            const label = document.createElement('label');
            label.htmlFor = controlId;
            label.className = 'text-xxs text-slate-400 mb-0.5';
            label.textContent = paramDef.label;
            const select = document.createElement('select');
            select.id = controlId;
            select.className = 'bg-slate-700 p-1 rounded text-xs w-full';
            select.innerHTML = paramDef.options.map(opt => `<option value="${typeof opt === 'object' ? opt.value : opt}" ${currentValue === (typeof opt === 'object' ? opt.value : opt) ? 'selected' : ''}>${typeof opt === 'object' ? opt.label : opt}</option>`).join('');
            select.addEventListener('change', (e) => {
                let valToSet = e.target.value;
                // Handle numeric options for things like filter rolloff
                if(paramDef.options.every(o => typeof (typeof o === 'object' ? o.value : o) === 'number')) {
                    valToSet = parseFloat(valToSet);
                }
                if (ownerType === 'track') track.updateEffectParam(effect.id, paramDef.key, valToSet);
                else if (ownerType === 'master' && localAppServices.updateMasterEffectParam) localAppServices.updateMasterEffectParam(effect.id, paramDef.key, valToSet);

                const undoDesc = `Change ${effectDef.displayName} ${paramDef.label}`; // Undo for select
                if (ownerType === 'track') localAppServices.captureStateForUndoInternal(undoDesc);
                else if (ownerType === 'master') localAppServices.captureStateForUndoInternal(undoDesc);
            });
            selectContainer.appendChild(label);
            selectContainer.appendChild(select);
            controlsGrid.appendChild(selectContainer);
        }
    });
    controlsContainer.appendChild(controlsGrid);
}
