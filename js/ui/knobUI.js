// js/ui/knobUI.js - Knob UI Component

// Note: `localAppServices` if needed by the knob for things like captureStateForUndo,
// would typically be passed in or the knob would emit an event that a higher-level module handles.
// For simplicity in this refactor, if direct appServices access was in the original createKnob,
// it's assumed to be handled (e.g., passed via options or an event system).
// The provided createKnob function already uses localAppServices from its original scope,
// so we need to make sure this is passed or handled appropriately.
// For this step, I'll assume localAppServices.captureStateForUndo is available.
// A cleaner way would be for the knob to emit a 'change-finalized' event with the value.

/**
 * Creates a knob UI component.
 * @param {object} options - Configuration for the knob.
 * @param {string} options.label - The label for the knob.
 * @param {number} options.min - Minimum value.
 * @param {number} options.max - Maximum value.
 * @param {number} options.step - Step increment.
 * @param {number} options.initialValue - Initial value.
 * @param {number} [options.decimals=2] - Number of decimals to display.
 * @param {string} [options.displaySuffix=''] - Suffix for the displayed value.
 * @param {function} options.onValueChange - Callback when value changes.
 * @param {boolean} [options.disabled=false] - Whether the knob is disabled.
 * @param {object} [options.trackRef] - Optional reference to the track for undo descriptions.
 * @param {object} [appServicesRef] - Reference to appServices, especially for undo.
 * @returns {object} - Knob component with element, setValue, getValue, and refreshVisuals methods.
 */
export function createKnob(options, appServicesRef) {
    const localAppServices = appServicesRef || {}; // Use passed appServices or default to empty

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

    let mouseDownListener = null;
    let touchStartListener = null;

    function updateKnobVisual(disabled = false) {
        const percentage = range === 0 ? 0 : (currentValue - min) / range;
        const rotation = (percentage * maxDegrees) - (maxDegrees / 2);
        handleEl.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        valueEl.textContent = typeof currentValue === 'number' ? currentValue.toFixed(options.decimals !== undefined ? options.decimals : (step < 1 && step !== 0 ? 2 : 0)) : currentValue;
        if (options.displaySuffix) valueEl.textContent += options.displaySuffix;
        
        knobEl.style.cursor = disabled ? 'not-allowed' : 'ns-resize';
        knobEl.style.opacity = disabled ? '0.5' : '1';

        if (mouseDownListener) knobEl.removeEventListener('mousedown', mouseDownListener);
        if (touchStartListener) knobEl.removeEventListener('touchstart', touchStartListener);

        if (!disabled) {
            mouseDownListener = (e) => handleInteraction(e, false);
            touchStartListener = (e) => handleInteraction(e, true);
            knobEl.addEventListener('mousedown', mouseDownListener);
            knobEl.addEventListener('touchstart', touchStartListener, { passive: false });
        } else {
            mouseDownListener = null;
            touchStartListener = null;
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
        updateKnobVisual(options.disabled); 
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
    
    options.disabled = !!options.disabled;
    setValue(currentValue, false);

    return {
        element: container,
        setValue,
        getValue: () => currentValue,
        type: 'knob',
        refreshVisuals: (disabledState) => {
            options.disabled = !!disabledState;
            updateKnobVisual(options.disabled);
        }
    };
}
