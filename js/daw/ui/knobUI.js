// js/daw/ui/knobUI.js - Knob UI Component

export function createKnob(options, captureStateForUndoCallback = () => {}) { // Fix: Provide a default empty function for the callback
    const container = document.createElement('div'); //
    container.className = 'knob-container'; //

    const labelEl = document.createElement('div'); //
    labelEl.className = 'knob-label'; //
    labelEl.textContent = options.label || ''; //
    labelEl.title = options.label || ''; //
    container.appendChild(labelEl); //

    const knobEl = document.createElement('div'); //
    knobEl.className = 'knob'; //
    const handleEl = document.createElement('div'); //
    handleEl.className = 'knob-handle'; //
    knobEl.appendChild(handleEl); //
    container.appendChild(knobEl); //

    const valueEl = document.createElement('div'); //
    valueEl.className = 'knob-value'; //
    container.appendChild(valueEl); //

    let currentValue = options.initialValue === undefined ? (options.min !== undefined ? options.min : 0) : options.initialValue; //
    const min = options.min === undefined ? 0 : options.min; //
    const max = options.max === undefined ? 100 : options.max; //
    const step = options.step === undefined ? 1 : options.step; //
    const range = max - min; //
    const maxDegrees = 270; //
    let initialValueBeforeInteraction = currentValue; //

    function setValue(newValue, fromInteraction = false) { //
        // Clamp and step value
        newValue = Math.max(min, Math.min(max, newValue)); //
        newValue = Math.round(newValue / step) * step; //

        if (newValue !== currentValue) { //
            currentValue = newValue; //
            const percentage = (currentValue - min) / range; //
            const degrees = percentage * maxDegrees - (maxDegrees / 2); //
            handleEl.style.transform = `translateX(-50%) rotate(${degrees}deg)`; //
            valueEl.textContent = `${options.displayPrefix || ''}${options.decimals !== undefined ? currentValue.toFixed(options.decimals) : currentValue}${options.displaySuffix || ''}`; //
            
            // Only call onValueChange if it's explicitly provided in options
            if (options.onValueChange) { //
                options.onValueChange(currentValue, initialValueBeforeInteraction, fromInteraction); //
            }
        }
    }

    knobEl.addEventListener('mousedown', onMouseDown); //
    knobEl.addEventListener('touchstart', onTouchStart, { passive: false }); //

    function onMouseDown(e) { //
        if (options.disabled) return; //
        e.preventDefault(); //
        initialValueBeforeInteraction = currentValue; //
        const startY = e.clientY; //
        const startValue = currentValue; //
        const pixelsForFullRange = 300; // Pixels to move mouse for full range

        function onMouseMove(moveEvent) { //
            const deltaY = startY - moveEvent.clientY; //
            let valueChange = (deltaY / pixelsForFullRange) * range; //
            setValue(startValue + valueChange, true); //
        }

        function onMouseUp() { //
            document.removeEventListener('mousemove', onMouseMove); //
            document.removeEventListener('mouseup', onMouseUp); //
            // Only capture state if value changed and callback is provided
            if (currentValue !== initialValueBeforeInteraction && captureStateForUndoCallback) { //
                captureStateForUndoCallback(`Change ${options.label} to ${valueEl.textContent}`); //
            }
        }

        document.addEventListener('mousemove', onMouseMove); //
        document.addEventListener('mouseup', onMouseUp); //
    }

    function onTouchStart(e) { //
        if (options.disabled) return; //
        e.preventDefault(); // Prevent scrolling
        initialValueBeforeInteraction = currentValue; //
        const startY = e.touches[0].clientY; //
        const startValue = currentValue; //
        const pixelsForFullRange = 450; // More pixels for touch

        function onTouchMove(moveEvent) { //
            const deltaY = startY - moveEvent.touches[0].clientY; //
            let valueChange = (deltaY / pixelsForFullRange) * range; //
            setValue(startValue + valueChange, true); //
        }

        function onTouchEnd() { //
            document.removeEventListener('touchmove', onTouchMove); //
            document.removeEventListener('touchend', onTouchEnd); //
            // Only capture state if value changed and callback is provided
            if (currentValue !== initialValueBeforeInteraction && captureStateForUndoCallback) { //
                captureStateForUndoCallback(`Change ${options.label} to ${valueEl.textContent}`); //
            }
        }

        document.addEventListener('touchmove', onTouchMove, { passive: false }); //
        document.addEventListener('touchend', onTouchEnd); //
    }

    // Set initial value
    options.disabled = !!options.disabled; //
    setValue(currentValue, false); //

    // Refresh visuals for disabled state
    function refreshVisuals(disabledState) { //
        options.disabled = !!disabledState; //
        knobEl.style.opacity = options.disabled ? '0.5' : '1'; //
        knobEl.style.cursor = options.disabled ? 'default' : 'ns-resize'; //
    }

    refreshVisuals(options.disabled); //

    return { //
        element: container, //
        setValue, //
        getValue: () => currentValue, //
        type: 'knob', //
        refreshVisuals, //
    };
}