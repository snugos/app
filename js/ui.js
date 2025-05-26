// js/ui.js - UI Creation and Management Module

import { SnugWindow } from './SnugWindow.js';
console.log('[ui.js] SnugWindow imported as:', SnugWindow); // Keep this
import { showNotification, createDropZoneHTML, setupDropZoneListeners as utilSetupDropZoneListeners } from './utils.js';
import * as Constants from './constants.js';
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
} from './eventHandlers.js';

// ... (createKnob, synthEngineControlDefinitions, buildTrackInspectorContentDOM, etc. remain the same as daw_ui_js_sampler_debug_v1)

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

    let currentValue = options.initialValue || 0;
    const min = options.min === undefined ? 0 : options.min;
    const max = options.max === undefined ? 100 : options.max;
    const step = options.step || 1;
    const range = max - min;
    const maxDegrees = options.maxDegrees || 270;
    const BASE_PIXELS_PER_FULL_RANGE_MOUSE = 300;
    const BASE_PIXELS_PER_FULL_RANGE_TOUCH = 450;
    let initialValueBeforeInteraction = currentValue;

    function updateKnobVisual() {
        const percentage = range === 0 ? 0 : (currentValue - min) / range;
        const rotation = (percentage * maxDegrees) - (maxDegrees / 2);
        handleEl.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        valueEl.textContent = typeof currentValue === 'number' ? currentValue.toFixed(options.decimals !== undefined ? options.decimals : (step < 1 ? 2 : 0)) : currentValue;
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
        if (triggerCallback && options.onValueChange) {
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

const synthEngineControlDefinitions = { /* ... same as daw_ui_js_sampler_debug_v1 ... */ };
export function buildTrackInspectorContentDOM(track) { /* ... same as daw_ui_js_sampler_debug_v1 ... */ }
function buildSynthSpecificInspectorDOM(track) { /* ... same as daw_ui_js_sampler_debug_v1 ... */ }
function buildSynthEngineControls(track, container, engineType) { /* ... same as daw_ui_js_sampler_debug_v1 ... */ }
function buildSamplerSpecificInspectorDOM(track) { /* ... same as daw_ui_js_sampler_debug_v1 ... */ }
function buildDrumSamplerSpecificInspectorDOM(track) { /* ... same as daw_ui_js_sampler_debug_v1 ... */ }
function buildInstrumentSamplerSpecificInspectorDOM(track) { /* ... same as daw_ui_js_sampler_debug_v1 ... */ }
export function initializeCommonInspectorControls(track, winEl) { /* ... same as daw_ui_js_sampler_debug_v1 ... */ }
export function initializeTypeSpecificInspectorControls(track, winEl) { /* ... same as daw_ui_js_sampler_debug_v1 ... */ }
function initializeSynthSpecificControls(track, winEl) { /* ... same as daw_ui_js_sampler_debug_v1 ... */ }
function initializeSamplerSpecificControls(track, winEl) { /* ... same as daw_ui_js_sampler_debug_v1 ... */ }
function initializeDrumSamplerSpecificControls(track, winEl) { /* ... same as daw_ui_js_sampler_debug_v1 ... */ }
function initializeInstrumentSamplerSpecificControls(track, winEl) { /* ... same as daw_ui_js_sampler_debug_v1 ... */ }


export function openGlobalControlsWindow(savedState = null) {
    console.log("[ui.js] openGlobalControlsWindow STARTING..."); // <-- NEW LOG
    const windowId = 'globalControls';

    if (typeof SnugWindow !== 'function') {
        console.error("[ui.js] SnugWindow is NOT a function in openGlobalControlsWindow!");
        return null;
    }

    if (window.openWindows && window.openWindows[windowId] && !savedState) {
        console.log("[ui.js] Restoring existing Global Controls window.");
        window.openWindows[windowId].restore(); 
        return window.openWindows[windowId];
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'global-controls-window p-2 space-y-3';
    try {
        // Simplified content, temporarily removing Tone.Transport.bpm.value access
        contentDiv.innerHTML = ` 
            <div class="flex items-center gap-2">
                <button id="playBtnGlobal">Play</button>
                <button id="recordBtnGlobal">Record</button>
            </div>
            <div>Tempo: <span id="tempoDisplayValue">120.0</span> BPM</div>
            <div>MIDI In: <select id="midiInputSelectGlobal"></select></div>
        `;
        // Set tempo display after DOM creation if Tone is ready
        if (typeof Tone !== 'undefined' && Tone.Transport) {
            const tempoDisplay = contentDiv.querySelector('#tempoDisplayValue');
            if (tempoDisplay) tempoDisplay.textContent = Tone.Transport.bpm.value.toFixed(1);
        }

    } catch (e) {
        console.error("[ui.js] Error setting innerHTML for globalControls contentDiv:", e);
        showNotification("Error creating global controls content.", 5000);
        return null;
    }
    
    const winOptions = { width: 280, height: 200, x: 20, y: 20, initialContentKey: 'globalControls' }; // Reduced height
    if (savedState) Object.assign(winOptions, savedState);

    console.log(`[ui.js] About to call 'new SnugWindow' for globalControls. SnugWindow class is:`, SnugWindow);
    let globalControlsWin = null;
    try {
        globalControlsWin = new SnugWindow(windowId, 'Global Controls', contentDiv, winOptions);
        console.log('[ui.js] SnugWindow instance for globalControls created (or attempted):', globalControlsWin);
    } catch (e) {
        console.error('[ui.js] CRITICAL ERROR during `new SnugWindow()` instantiation for globalControls:', e);
        showNotification("CRITICAL: Error creating window object. Check console.", 6000);
        return null; 
    }
    
    console.log('[ui.js] DETAILED CHECK for globalControlsWin:');
    const isInstanceValid = globalControlsWin instanceof SnugWindow;
    const hasElementProp = globalControlsWin && globalControlsWin.hasOwnProperty('element');
    const elementValue = globalControlsWin ? globalControlsWin.element : undefined;
    const isElementTruthy = !!elementValue;

    console.log(`[ui.js] typeof globalControlsWin: ${typeof globalControlsWin}`);
    console.log(`[ui.js] globalControlsWin instanceof SnugWindow: ${isInstanceValid}`);
    console.log(`[ui.js] globalControlsWin.hasOwnProperty('element'): ${hasElementProp}`);
    console.log(`[ui.js] globalControlsWin.element value:`, elementValue);
    console.log(`[ui.js] globalControlsWin.element is TRUTHY: ${isElementTruthy}`);
    
    if (!globalControlsWin || !elementValue) { 
        console.error("[ui.js] CRITICAL CHECK FAILED (the main one): globalControlsWin is falsy OR globalControlsWin.element is falsy.");
        console.error(`[ui.js] Values for check: !globalControlsWin = ${!globalControlsWin}, !elementValue = ${!elementValue}`);
        showNotification("Failed to create Global Controls window (ui.js check).", 5000); 
        return null;
    }

    // Assign to window globals only if element is valid
    window.playBtn = globalControlsWin.element.querySelector('#playBtnGlobal');
    window.recordBtn = globalControlsWin.element.querySelector('#recordBtnGlobal');
    // Note: tempoInput is no longer an input field in this simplified version
    // window.tempoInput = globalControlsWin.element.querySelector('#tempoGlobalInput'); 
    window.masterMeterBar = globalControlsWin.element.querySelector('#masterMeterBarGlobal'); // This ID is not in simplified HTML
    window.midiInputSelectGlobal = globalControlsWin.element.querySelector('#midiInputSelectGlobal');
    window.midiIndicatorGlobalEl = globalControlsWin.element.querySelector('#midiIndicatorGlobal'); // Not in simplified HTML
    window.keyboardIndicatorGlobalEl = globalControlsWin.element.querySelector('#keyboardIndicatorGlobal'); // Not in simplified HTML

    if (typeof window.attachGlobalControlEvents === 'function' && globalControlsWin.element) {
        window.attachGlobalControlEvents(globalControlsWin.element);
    } else {
        console.warn("attachGlobalControlEvents not found or window element missing. Global controls might not work.");
    }
    console.log("[ui.js] openGlobalControlsWindow FINISHED SUCCESSFULLY."); // <-- NEW LOG
    return globalControlsWin;
}

export function openTrackInspectorWindow(trackId, savedState = null) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
const effectControlDefinitions = { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ };
export function buildEffectsRackContentDOM(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function openTrackEffectsRackWindow(trackId, savedState = null) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function buildSequencerContentDOM(track, rows, rowLabels, numBars) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function highlightPlayingStep(col, trackType, gridElement) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function openMixerWindow(savedState = null) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function updateMixerWindow() { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function renderMixer(container) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function updateSoundBrowserDisplayForLibrary(libraryName) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function openSoundBrowserWindow(savedState = null) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function renderSoundBrowserDirectory(pathArray, treeNode) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function renderSamplePads(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function updateSliceEditorUI(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function applySliceEdits(trackId) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function drawWaveform(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function drawInstrumentWaveform(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function updateDrumPadControlsUI(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
export function renderDrumSamplerPads(track) { /* ... (same as daw_ui_js_sampler_debug_v1) ... */ }
