// js/ui.js
console.log('[ui.js] TOP OF FILE PARSING - Final Debug Attempt for GCW and Pads');

import { SnugWindow } from './SnugWindow.js';
import { showNotification, createDropZoneHTML, setupDropZoneListeners as utilSetupDropZoneListeners, showCustomModal } from './utils.js';
import * as Constants from './constants.js';
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
} from './eventHandlers.js';
import { AVAILABLE_EFFECTS, getEffectParamDefinitions } from './effectsRegistry.js';
import { getMimeTypeFromFilename } from './audio.js';

// --- Knob UI ---
function createKnob(options) {
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
    const maxDegrees = options.maxDegrees || 270;
    const BASE_PIXELS_PER_FULL_RANGE_MOUSE = 300;
    const BASE_PIXELS_PER_FULL_RANGE_TOUCH = 450;
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
        if (step !== 0) {
            boundedValue = Math.round(boundedValue / step) * step;
        }
        const oldValue = currentValue;
        currentValue = Math.min(max, Math.max(min, boundedValue));
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
            const currentY = isTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
            const deltaY = startY - currentY;
            let valueChange = (deltaY / pixelsForFullRange) * range * currentSensitivity;
            let newValue = startValue + valueChange;
            setValue(newValue, true, true);
        }
        function onEnd() {
            document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove);
            document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
            if (currentValue !== initialValueBeforeInteraction && typeof window.captureStateForUndo === 'function') {
                let description = `Change ${options.label || 'knob'} to ${valueEl.textContent}`;
                if (options.trackRef && options.trackRef.name) {
                    description = `Change ${options.label || 'knob'} for ${options.trackRef.name} to ${valueEl.textContent}`;
                }
                window.captureStateForUndo(description);
            }
        }
        document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove, { passive: !isTouch });
        document.addEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
    }
    knobEl.addEventListener('mousedown', (e) => handleInteraction(e, false));
    knobEl.addEventListener('touchstart', (e) => handleInteraction(e, true), { passive: false });
    setValue(currentValue, false);
    return { element: container, setValue, getValue: () => currentValue, type: 'knob', refreshVisuals: updateKnobVisual };
}


// --- Synth Inspector Specifics ---
const synthEngineControlDefinitions = { /* ... (same content as in ui_js_inspector_build_debug_may28_v3) ... */ };
function buildSynthSpecificInspectorDOM(track) { /* ... (same content as in ui_js_inspector_build_debug_may28_v3) ... */ }
function buildSynthEngineControls(track, container, engineType) { /* ... (same content as in ui_js_inspector_build_debug_may28_v3) ... */ }

// --- Sampler Inspector Specifics ---
function buildSamplerSpecificInspectorDOM(track) { /* ... (same content as in ui_js_inspector_build_debug_may28_v3) ... */ }

// --- Drum Sampler Inspector Specifics ---
function buildDrumSamplerSpecificInspectorDOM(track) { /* ... (same content as in ui_js_inspector_build_debug_may28_v3) ... */ }

// --- Instrument Sampler Inspector Specifics ---
function buildInstrumentSamplerSpecificInspectorDOM(track) { /* ... (same content as in ui_js_inspector_build_debug_may28_v3) ... */ }


// --- Track Inspector Window & Controls Initialization ---
function buildTrackInspectorContentDOM(track) {
    console.log(`[UI - buildTrackInspectorContentDOM V3.1] Building content for track ${track?.id} (${track?.name}), type: ${track?.type}`);
    if (!track || !track.id || !track.type || !track.name) {
        console.error(`[UI - buildTrackInspectorContentDOM V3.1] Invalid track object received:`, track);
        const errorDiv = document.createElement('div');
        errorDiv.textContent = "Error: Invalid track data for inspector.";
        errorDiv.className = 'p-2 text-red-500 text-lg font-bold';
        return errorDiv;
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'track-inspector-content p-2 space-y-1';

    try {
        const headerDiv = document.createElement('div');
        headerDiv.className = 'flex items-center justify-between mb-1';
        const nameInput = document.createElement('input');
        nameInput.type = 'text'; nameInput.id = `trackNameDisplay-${track.id}`; nameInput.value = track.name;
        nameInput.className = 'text-md font-bold bg-transparent border-b w-full focus:ring-0 focus:border-blue-500';
        headerDiv.appendChild(nameInput);
        const meterContainer = document.createElement('div');
        meterContainer.id = `trackMeterContainer-${track.id}`;
        meterContainer.className = 'track-meter-container meter-bar-container w-1/3 ml-2 h-4';
        const meterBar = document.createElement('div'); meterBar.id = `trackMeterBar-${track.id}`; meterBar.className = 'meter-bar';
        meterContainer.appendChild(meterBar);
        headerDiv.appendChild(meterContainer);
        contentDiv.appendChild(headerDiv);
        console.log(`[UI - buildTrackInspectorContentDOM V3.1] Header built for track ${track.id}`);

        const actionsDiv = document.createElement('div'); actionsDiv.className = 'flex items-center gap-1 mb-1';
        const muteBtn = document.createElement('button'); muteBtn.id = `muteBtn-${track.id}`; muteBtn.className = `mute-button text-xs p-1 ${track.isMuted ? 'muted' : ''}`; muteBtn.textContent = 'M'; muteBtn.addEventListener('click', () => handleTrackMute(track.id)); actionsDiv.appendChild(muteBtn);
        const soloBtn = document.createElement('button'); soloBtn.id = `soloBtn-${track.id}`; const currentSoloId = typeof window.getSoloedTrackId === 'function' ? window.getSoloedTrackId() : null; soloBtn.className = `solo-button text-xs p-1 ${currentSoloId === track.id ? 'soloed' : ''}`; soloBtn.textContent = 'S'; soloBtn.addEventListener('click', () => handleTrackSolo(track.id)); actionsDiv.appendChild(soloBtn);
        const armBtn = document.createElement('button'); armBtn.id = `armInputBtn-${track.id}`; const currentArmedId = typeof window.getArmedTrackId === 'function' ? window.getArmedTrackId() : null; armBtn.className = `arm-input-button text-xs p-1 ${currentArmedId === track.id ? 'armed' : ''}`; armBtn.textContent = 'Arm'; armBtn.addEventListener('click', () => handleTrackArm(track.id)); actionsDiv.appendChild(armBtn);
        const removeBtn = document.createElement('button'); removeBtn.id = `removeTrackBtn-${track.id}`; removeBtn.className = 'bg-red-500 hover:bg-red-600 text-white text-xs py-0.5 px-1.5 rounded ml-auto'; removeBtn.textContent = 'Del'; removeBtn.addEventListener('click', () => handleRemoveTrack(track.id)); actionsDiv.appendChild(removeBtn);
        contentDiv.appendChild(actionsDiv);
        console.log(`[UI - buildTrackInspectorContentDOM V3.1] Actions built for track ${track.id}`);

        const trackControlsPanel = document.createElement('div'); trackControlsPanel.className = 'panel';
        const panelTitle = document.createElement('h4'); panelTitle.className = 'text-sm font-semibold mb-1'; panelTitle.textContent = 'Track Controls'; trackControlsPanel.appendChild(panelTitle);
        const controlGroup = document.createElement('div'); controlGroup.className = 'control-group';
        const volumeContainer = document.createElement('div'); volumeContainer.id = `volumeSliderContainer-${track.id}`; controlGroup.appendChild(volumeContainer);
        const seqLengthContainer = document.createElement('div'); seqLengthContainer.className = 'flex flex-col items-center space-y-1';
        const currentBars = track.sequenceLength / Constants.STEPS_PER_BAR;
        const seqLabel = document.createElement('label'); seqLabel.htmlFor = `sequenceLengthBars-${track.id}`; seqLabel.className = 'knob-label'; seqLabel.textContent = 'Seq Len (Bars)'; seqLengthContainer.appendChild(seqLabel);
        const seqInput = document.createElement('input'); seqInput.type = 'number'; seqInput.id = `sequenceLengthBars-${track.id}`; seqInput.value = currentBars; seqInput.min = "1"; seqInput.max = "256"; seqInput.step = "1"; seqInput.className = 'bg-white text-black w-16 p-1 rounded-sm text-center text-xs border border-gray-500'; seqLengthContainer.appendChild(seqInput);
        const seqDisplay = document.createElement('span'); seqDisplay.id = `sequenceLengthDisplay-${track.id}`; seqDisplay.className = 'knob-value'; seqDisplay.textContent = `${currentBars} bars (${track.sequenceLength} steps)`; seqLengthContainer.appendChild(seqDisplay);
        const doubleSeqButton = document.createElement('button'); doubleSeqButton.id = `doubleSeqBtn-${track.id}`; doubleSeqButton.className = 'bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 px-2 rounded w-full mt-1'; doubleSeqButton.title = 'Double sequence length and content'; doubleSeqButton.textContent = 'Double';
        doubleSeqButton.addEventListener('click', async () => { /* ... */ });
        seqLengthContainer.appendChild(doubleSeqButton); controlGroup.appendChild(seqLengthContainer); trackControlsPanel.appendChild(controlGroup);
        contentDiv.appendChild(trackControlsPanel);
        console.log(`[UI - buildTrackInspectorContentDOM V3.1] Track controls panel built for track ${track.id}`);

        let specificContentElement = null;
        console.log(`[UI - buildTrackInspectorContentDOM V3.1] About to call specific DOM builder for type: ${track.type}`);
        try {
            if (track.type === 'Synth') specificContentElement = buildSynthSpecificInspectorDOM(track);
            else if (track.type === 'Sampler') specificContentElement = buildSamplerSpecificInspectorDOM(track);
            else if (track.type === 'DrumSampler') specificContentElement = buildDrumSamplerSpecificInspectorDOM(track);
            else if (track.type === 'InstrumentSampler') specificContentElement = buildInstrumentSamplerSpecificInspectorDOM(track);
            else console.warn(`[UI - buildTrackInspectorContentDOM V3.1] Unknown track type for specific content: ${track.type}`);
            console.log(`[UI - buildTrackInspectorContentDOM V3.1] specificContentElement after build call:`, specificContentElement);
        } catch (specificBuildError) {
            console.error(`[UI - buildTrackInspectorContentDOM V3.1] Error in specific DOM builder for type ${track.type}:`, specificBuildError);
            const errorMsg = document.createElement('p');
            errorMsg.textContent = `Error building UI for ${track.type}: ${specificBuildError.message}. Check console.`;
            errorMsg.className = 'text-red-500 text-xs';
            contentDiv.appendChild(errorMsg);
        }

        if (specificContentElement) {
            contentDiv.appendChild(specificContentElement);
            console.log(`[UI - buildTrackInspectorContentDOM V3.1] Appended specific content for ${track.type}`);
        } else if (track.type === 'Synth' || track.type === 'Sampler' || track.type === 'DrumSampler' || track.type === 'InstrumentSampler') {
            console.warn(`[UI - buildTrackInspectorContentDOM V3.1] specificContentElement for track type ${track.type} was null or undefined (and no error caught in its builder).`);
        }

        const effectsButton = document.createElement('button'); effectsButton.className = 'effects-rack-button text-xs py-1 px-2 rounded mt-2 w-full bg-gray-300 hover:bg-gray-400 border border-gray-500'; effectsButton.textContent = 'Track Effects Rack'; effectsButton.addEventListener('click', () => handleOpenEffectsRack(track.id));
        contentDiv.appendChild(effectsButton);

        const sequencerButton = document.createElement('button'); sequencerButton.className = 'bg-indigo-500 hover:bg-indigo-600 text-white text-xs py-1 px-2 rounded mt-1 w-full'; sequencerButton.textContent = 'Sequencer'; sequencerButton.addEventListener('click', () => handleOpenSequencer(track.id));
        contentDiv.appendChild(sequencerButton);

        console.log(`[UI - buildTrackInspectorContentDOM V3.1] Successfully built contentDiv for track ${track.id}:`, contentDiv);
        return contentDiv;

    } catch (error) {
        console.error(`[UI - buildTrackInspectorContentDOM V3.1] MAJOR ERROR building inspector for track ${track.id}:`, error);
        showNotification(`Critical error building inspector for ${track.name}.`, 5000);
        const errorDiv = document.createElement('div');
        errorDiv.textContent = "Error building inspector content. See console.";
        errorDiv.className = 'p-2 text-red-500 text-lg font-bold';
        return errorDiv;
    }
}

function openTrackInspectorWindow(trackId, savedState = null) {
    console.log(`[UI - openTrackInspectorWindow] Called for trackId: ${trackId}`);
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null;
    if (!track) {
        showNotification(`Track ID ${trackId} not found. Cannot open inspector.`, 3000);
        console.error(`[UI - openTrackInspectorWindow] Track object not found for ID: ${trackId}`);
        return null;
    }
    console.log(`[UI - openTrackInspectorWindow] Track found: ${track.name}, Type: ${track.type}`);

    const inspectorId = `trackInspector-${track.id}`;
    if (window.openWindows[inspectorId] && !savedState) {
        window.openWindows[inspectorId].restore();
        return window.openWindows[inspectorId];
    }
    if (window.openWindows[inspectorId] && savedState) {
        window.openWindows[inspectorId].close();
    }

    track.inspectorControls = {};
    console.log(`[UI - openTrackInspectorWindow] Building content DOM for track ${track.id}`);
    const inspectorContentElement = buildTrackInspectorContentDOM(track);
    
    if (!inspectorContentElement) {
        showNotification(`Failed to build Inspector content for Track ${track.id}. See console.`, 4000);
        console.error(`[UI - openTrackInspectorWindow] buildTrackInspectorContentDOM returned null for track ${track.id}. Cannot create window.`);
        return null; 
    }
    console.log(`[UI - openTrackInspectorWindow] inspectorContentElement received from build:`, inspectorContentElement);

    let windowHeight = 450;
    if (track.type === 'Synth') windowHeight = 620;
    else if (track.type === 'Sampler') windowHeight = 620;
    else if (track.type === 'DrumSampler') windowHeight = 580;
    else if (track.type === 'InstrumentSampler') windowHeight = 620;

    const winOptions = { width: Math.min(500, window.innerWidth - 40), height: Math.min(windowHeight, window.innerHeight - 80), initialContentKey: `trackInspector-${track.id}` };
    if (savedState) Object.assign(winOptions, savedState);

    console.log(`[UI - openTrackInspectorWindow] Creating SnugWindow for inspector ${inspectorId}`);
    let inspectorWin = null;
    try {
        inspectorWin = new SnugWindow(inspectorId, `Track: ${track.name}`, inspectorContentElement, winOptions);
    } catch (e) {
        console.error(`[UI - openTrackInspectorWindow] CRITICAL ERROR during \`new SnugWindow()\` for inspector ${inspectorId}:`, e);
        showNotification("CRITICAL: Error creating inspector window.", 6000);
        return null;
    }

    if (!inspectorWin || !inspectorWin.element) {
        showNotification(`Failed to create Inspector window for track ${track.id}.`, 5000);
         console.error(`[UI - openTrackInspectorWindow] SnugWindow instance or its element is null for inspector ${inspectorId}`);
        return null;
    }
    track.inspectorWindow = inspectorWin;
    console.log(`[UI - openTrackInspectorWindow] Inspector window created for ${track.id}. Element:`, inspectorWin.element);

    console.log(`[UI - openTrackInspectorWindow] Calling initializeCommonInspectorControls for track ${track.id}`);
    initializeCommonInspectorControls(track, inspectorWin.element);

    console.log(`[UI - openTrackInspectorWindow] Calling initializeTypeSpecificInspectorControls for track ${track.id} of type ${track.type}`);
    initializeTypeSpecificInspectorControls(track, inspectorWin.element);
    
    console.log(`[UI - openTrackInspectorWindow] Scheduling knob refresh for track ${track.id}`);
    setTimeout(() => {
        Object.values(track.inspectorControls).forEach(control => {
            if (control?.type === 'knob' && typeof control.refreshVisuals === 'function') {
                control.refreshVisuals();
            }
        });
    }, 50);
    
    console.log(`[UI - openTrackInspectorWindow] Finished for track ${track.id}`);
    return inspectorWin;
}

function initializeCommonInspectorControls(track, winEl) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }
function initializeTypeSpecificInspectorControls(track, winEl) { /* ... (as in ui_js_super_trycatch_gcw, with detailed logs) ... */ }
function initializeSynthSpecificControls(track, winEl) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }
function initializeSamplerSpecificControls(track, winEl) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }
function initializeDrumSamplerSpecificControls(track, winEl) { /* ... (as in ui_js_super_trycatch_gcw, with detailed logs) ... */ }
function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }

// --- Modular Effects Rack UI ---
function buildModularEffectsRackDOM(owner, ownerType = 'track') { /* ... (as in ui_js_super_trycatch_gcw) ... */ }
function renderEffectsList(owner, ownerType, listDiv, controlsContainer) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }
function renderEffectControls(owner, ownerType, effectId, controlsContainer) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }
function showAddEffectModal(owner, ownerType) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }

// --- Window Opening Functions (with Debugging & GCW try...catch from ui_js_super_trycatch_gcw) ---
function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }
function openMasterEffectsRackWindow(savedState = null) { /* ... (as in ui_js_super_trycatch_gcw) ... */ }

function openGlobalControlsWindow(savedState = null) {
    console.log(`[UI - openGlobalControlsWindow] Called. savedState:`, savedState);
    const windowId = 'globalControls';

    try { // SUPER TRY-CATCH starts here
        if (typeof SnugWindow !== 'function') {
            console.error("[UI - openGlobalControlsWindow] SnugWindow is NOT a function!");
            return null;
        }
        if (window.openWindows && window.openWindows[windowId] && !savedState) {
            window.openWindows[windowId].restore();
            console.log("[UI - openGlobalControlsWindow] Restored existing window and returning.");
            return window.openWindows[windowId];
        }

        const contentDiv = document.createElement('div');
        contentDiv.className = 'global-controls-window p-2 space-y-3';
        try {
            let tempoValue = 120.0;
            if (typeof Tone !== 'undefined' && Tone.Transport) {
                tempoValue = Tone.Transport.bpm.value.toFixed(1);
            }
            contentDiv.innerHTML = `
                <div class="flex items-center gap-2"><button id="playBtnGlobal" class="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-3 rounded-sm shadow">Play</button><button id="recordBtnGlobal" class="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-1 px-3 rounded-sm shadow">Record</button></div>
                <div class="flex items-center gap-2"><label for="tempoGlobalInput" class="control-label text-xs">Tempo:</label><input type="number" id="tempoGlobalInput" value="${tempoValue}" min="40" max="240" step="0.1" class="bg-white text-black w-16 p-1 rounded-sm text-center text-xs border border-gray-500"><span class="text-xs"> BPM</span></div>
                <div class="flex items-center gap-2 mt-2"><label for="midiInputSelectGlobal" class="text-xs">MIDI In:</label><select id="midiInputSelectGlobal" class="bg-white text-black p-1 rounded-sm text-xs border border-gray-500 flex-grow"></select><span id="midiIndicatorGlobal" title="MIDI Activity" class="border border-black w-3 h-3 inline-block rounded-full bg-gray-400"></span><span id="keyboardIndicatorGlobal" title="Keyboard Input Activity" class="border border-black w-3 h-3 inline-block rounded-full bg-gray-400"></span></div>
                <div id="masterMeterContainerGlobal" class="meter-bar-container mt-2" title="Master Output Level" style="height:15px;"><div id="masterMeterBarGlobal" class="meter-bar" style="width: 0%;"></div></div>
            `;
        } catch (e) {
            console.error("[UI - openGlobalControlsWindow] Error setting innerHTML for globalControls:", e);
            showNotification("Error creating global controls content.", 5000);
            return null;
        }

        const winOptions = { width: 280, height: 250, x: 20, y: 20, initialContentKey: 'globalControls' };
        if (savedState) Object.assign(winOptions, savedState);

        console.log("[UI - openGlobalControlsWindow] Attempting to create SnugWindow for globalControls...");
        let globalControlsWin = new SnugWindow(windowId, 'Global Controls', contentDiv, winOptions);
        console.log("[UI - openGlobalControlsWindow] SnugWindow instance for globalControls (initial):", globalControlsWin);

        if (!globalControlsWin || !globalControlsWin.element) {
            console.error("[UI - openGlobalControlsWindow] CRITICAL CHECK FAILED IMMEDIATELY: globalControlsWin or element is falsy after SnugWindow construction.");
            showNotification("Failed to create Global Controls window (instance/element invalid).", 5000);
            return null;
        }

        console.log(`[UI - openGlobalControlsWindow] SnugWindow for ${windowId} seems valid, proceeding to assign elements.`);
        window.playBtn = globalControlsWin.element.querySelector('#playBtnGlobal');
        window.recordBtn = globalControlsWin.element.querySelector('#recordBtnGlobal');
        window.tempoInput = globalControlsWin.element.querySelector('#tempoGlobalInput');
        window.masterMeterBar = globalControlsWin.element.querySelector('#masterMeterBarGlobal');
        window.midiInputSelectGlobal = globalControlsWin.element.querySelector('#midiInputSelectGlobal');
        window.midiIndicatorGlobalEl = globalControlsWin.element.querySelector('#midiIndicatorGlobal');
        window.keyboardIndicatorGlobalEl = globalControlsWin.element.querySelector('#keyboardIndicatorGlobal');
        console.log("[UI - openGlobalControlsWindow] Global element references assigned.");

        // Call to attachGlobalControlEvents is ACTIVE
        if (typeof window.attachGlobalControlEvents === 'function' && globalControlsWin.element) {
            console.log("[UI - openGlobalControlsWindow] Attaching global control events...");
            window.attachGlobalControlEvents(globalControlsWin.element); 
            console.log("[UI - openGlobalControlsWindow] Global control events attached (or attempted).");
        } else {
            console.warn("[UI - openGlobalControlsWindow] attachGlobalControlEvents not found or window element missing for globalControlsWin.");
        }
        
        console.log("[UI - openGlobalControlsWindow] Successfully returning globalControlsWin:", globalControlsWin);
        console.log("[UI - openGlobalControlsWindow] globalControlsWin.element before return:", globalControlsWin?.element);
        return globalControlsWin;

    } catch (error) {
        console.error("[UI - openGlobalControlsWindow] UNHANDLED EXCEPTION in openGlobalControlsWindow:", error);
        showNotification("Major error creating Global Controls. App may be unstable.", 6000);
        return null;
    }
}

function openSoundBrowserWindow(savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function updateSoundBrowserDisplayForLibrary(libraryName) { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function renderSoundBrowserDirectory(pathArray, treeNode) { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function openMixerWindow(savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function updateMixerWindow() { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function renderMixer(container) { /* ... (same content as in ui_js_super_trycatch_gcw, with debug logs) ... */ }
function buildSequencerContentDOM(track, rows, rowLabels, numBars) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }

// --- Utility UI functions for samplers (Updated for Audio Status & Debugging) ---
function renderSamplePads(track) { /* ... (same content as in ui_js_super_trycatch_gcw, with detailed logs) ... */ }
function updateSliceEditorUI(track) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function applySliceEdits(trackId) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function drawWaveform(track) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }
function drawInstrumentWaveform(track) { drawWaveform(track); }
function updateDrumPadControlsUI(track) { /* ... (same content as in ui_js_super_trycatch_gcw, with detailed logs) ... */ }
function renderDrumSamplerPads(track) { /* ... (same content as in ui_js_super_trycatch_gcw, with detailed logs) ... */ }
function highlightPlayingStep(col, trackType, gridElement) { /* ... (same content as in ui_js_super_trycatch_gcw) ... */ }

export {
    createKnob,
    buildTrackInspectorContentDOM,
    openTrackInspectorWindow,
    initializeCommonInspectorControls,
    initializeTypeSpecificInspectorControls,
    applySliceEdits,
    drawWaveform,
    drawInstrumentWaveform,
    renderEffectsList,
    renderEffectControls,
    openTrackEffectsRackWindow,
    openMasterEffectsRackWindow,
    openGlobalControlsWindow,
    openSoundBrowserWindow,
    updateSoundBrowserDisplayForLibrary,
    renderSoundBrowserDirectory,
    openMixerWindow,
    updateMixerWindow,
    renderMixer,
    buildSequencerContentDOM,
    openTrackSequencerWindow,
    renderSamplePads,
    updateSliceEditorUI,
    updateDrumPadControlsUI,
    renderDrumSamplerPads,
    highlightPlayingStep
};
