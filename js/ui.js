// js/ui.js
// ... (imports as before)
import { AVAILABLE_EFFECTS, getEffectParamDefinitions } from './effectsRegistry.js'; // NEW

// ... (createKnob, buildTrackInspectorContentDOM, synth/sampler specific inspectors as before, but they will NOT build the old effects rack button directly)
// buildTrackInspectorContentDOM: Remove the old "Effects Rack" button. The inspector might link to a new modular rack.
// OR, the modular rack is a separate window. Let's assume a separate window for now.

// --- NEW: Modular Effects Rack UI ---

function buildModularEffectsRackDOM(owner, ownerType = 'track') { // owner can be a track object or 'master'
    const rackContainer = document.createElement('div');
    rackContainer.className = 'modular-effects-rack p-2 space-y-2';

    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-2';
    const title = document.createElement('h3');
    title.className = 'text-lg font-semibold';
    title.textContent = ownerType === 'track' ? `Effects: ${owner.name}` : 'Master Effects';
    header.appendChild(title);

    const addEffectButton = document.createElement('button');
    addEffectButton.className = 'bg-blue-500 hover:bg-blue-600 text-white py-1 px-2 rounded text-xs';
    addEffectButton.textContent = '+ Add Effect';
    addEffectButton.onclick = () => showAddEffectModal(owner, ownerType);
    header.appendChild(addEffectButton);
    rackContainer.appendChild(header);

    const effectsListDiv = document.createElement('div');
    effectsListDiv.id = `${ownerType}-${owner?.id || 'master'}-effects-list`;
    effectsListDiv.className = 'effects-list-container space-y-1 min-h-[100px] border p-1 bg-gray-100';
    rackContainer.appendChild(effectsListDiv);

    const effectControlsContainer = document.createElement('div');
    effectControlsContainer.id = `${ownerType}-${owner?.id || 'master'}-effect-controls`;
    effectControlsContainer.className = 'effect-controls-panel mt-2 border-t pt-2';
    rackContainer.appendChild(effectControlsContainer);
    
    renderEffectsList(owner, ownerType, effectsListDiv, effectControlsContainer);

    return rackContainer;
}

function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    listDiv.innerHTML = ''; // Clear old list
    controlsContainer.innerHTML = ''; // Clear old controls
    const effectsArray = ownerType === 'track' ? owner.activeEffects : window.masterEffectsChain;

    if (!effectsArray || effectsArray.length === 0) {
        listDiv.textContent = 'No effects added.';
        return;
    }

    effectsArray.forEach((effect, index) => {
        const effectItem = document.createElement('div');
        effectItem.className = 'effect-item flex justify-between items-center p-1.5 bg-gray-200 rounded border border-gray-300 cursor-grab';
        effectItem.draggable = true;
        effectItem.dataset.effectId = effect.id;
        effectItem.dataset.index = index;

        const effectName = document.createElement('span');
        effectName.textContent = `${AVAILABLE_EFFECTS[effect.type]?.displayName || effect.type}`;
        effectItem.appendChild(effectName);
        
        const effectItemButtons = document.createElement('div');
        effectItemButtons.className = 'flex items-center';

        const editButton = document.createElement('button');
        editButton.innerHTML = '⚙️'; // Gear icon
        editButton.title = 'Edit Effect Parameters';
        editButton.className = 'text-xs p-0.5 hover:bg-gray-300 rounded mx-1';
        editButton.onclick = (e) => {
            e.stopPropagation();
            renderEffectControls(owner, ownerType, effect.id, controlsContainer);
            // Highlight selected effect
            listDiv.querySelectorAll('.effect-item').forEach(item => item.classList.remove('border-blue-500', 'border-2'));
            effectItem.classList.add('border-blue-500', 'border-2');
        };
        effectItemButtons.appendChild(editButton);

        const removeButton = document.createElement('button');
        removeButton.innerHTML = '🗑️'; // Trash icon
        removeButton.title = 'Remove Effect';
        removeButton.className = 'text-xs p-0.5 text-red-500 hover:text-red-700 rounded';
        removeButton.onclick = (e) => {
            e.stopPropagation();
            if (ownerType === 'track') {
                owner.removeEffect(effect.id);
            } else { // master
                window.removeMasterEffect(effect.id);
            }
            renderEffectsList(owner, ownerType, listDiv, controlsContainer); // Re-render list and clear controls
        };
        effectItemButtons.appendChild(removeButton);
        effectItem.appendChild(effectItemButtons);

        // Drag and Drop for reordering
        effectItem.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', effect.id);
            e.dataTransfer.effectAllowed = 'move';
            // e.target.style.opacity = '0.5';
        });
        // effectItem.addEventListener('dragend', (e) => e.target.style.opacity = '1');

        listDiv.appendChild(effectItem);
    });

    // Drag and Drop event listeners for the container
    listDiv.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    });

    listDiv.addEventListener('drop', (e) => {
        e.preventDefault();
        const droppedEffectId = e.dataTransfer.getData('text/plain');
        const targetElement = e.target.closest('.effect-item');
        let newIndex = effectsArray.length -1; // Default to last if not dropping on an item

        if (targetElement) {
            newIndex = parseInt(targetElement.dataset.index);
        }
        
        if (ownerType === 'track') {
            owner.reorderEffect(droppedEffectId, newIndex);
        } else { // master
            window.reorderMasterEffect(droppedEffectId, newIndex);
        }
        renderEffectsList(owner, ownerType, listDiv, controlsContainer);
    });
}


function renderEffectControls(owner, ownerType, effectId, controlsContainer) {
    controlsContainer.innerHTML = ''; // Clear previous
    const effectsArray = ownerType === 'track' ? owner.activeEffects : window.masterEffectsChain;
    const effect = effectsArray.find(e => e.id === effectId);

    if (!effect) {
        controlsContainer.textContent = 'Select an effect to see its controls.';
        return;
    }

    const effectDef = AVAILABLE_EFFECTS[effect.type];
    if (!effectDef || !effectDef.params || effectDef.params.length === 0) {
        controlsContainer.textContent = `No configurable parameters for ${effectDef?.displayName || effect.type}.`;
        return;
    }

    const title = document.createElement('h4');
    title.className = 'text-md font-semibold mb-2';
    title.textContent = `Parameters: ${effectDef.displayName}`;
    controlsContainer.appendChild(title);

    const controlGroup = document.createElement('div');
    controlGroup.className = 'control-group'; // For consistent knob layout

    effectDef.params.forEach(paramDef => {
        const controlId = `${ownerType}-${owner?.id || 'master'}-effect-${effect.id}-param-${paramDef.key.replace('.', '_')}`;
        let currentValue = effect.params[paramDef.key];
        if (currentValue === undefined) currentValue = paramDef.defaultValue;

        if (paramDef.type === 'knob') {
            const knob = createKnob({
                label: paramDef.label,
                min: paramDef.min, max: paramDef.max, step: paramDef.step,
                initialValue: currentValue,
                decimals: paramDef.decimals, displaySuffix: paramDef.displaySuffix,
                trackRef: ownerType === 'track' ? owner : null, // For undo description context
                onValueChange: (val, oldVal, fromInteraction) => {
                    if (ownerType === 'track') {
                        owner.updateEffectParam(effect.id, paramDef.key, val);
                    } else { // master
                        window.updateMasterEffectParam(effect.id, paramDef.key, val);
                    }
                     if (fromInteraction && typeof window.captureStateForUndo === 'function') {
                        const ownerName = ownerType === 'track' ? owner.name : 'Master';
                        window.captureStateForUndo(`Set ${ownerName} ${effectDef.displayName} ${paramDef.label} to ${val.toFixed(paramDef.decimals || 0)}`);
                    }
                }
            });
            controlGroup.appendChild(knob.element);
        } else if (paramDef.type === 'select') {
            const selectContainer = document.createElement('div');
            selectContainer.className = 'mb-2 flex flex-col items-start';
            const labelEl = document.createElement('label');
            labelEl.htmlFor = controlId;
            labelEl.className = 'knob-label text-xs mb-0.5';
            labelEl.textContent = paramDef.label;
            selectContainer.appendChild(labelEl);

            const selectEl = document.createElement('select');
            selectEl.id = controlId;
            selectEl.className = 'text-xs p-1 border w-full bg-white text-black rounded-sm';
            (paramDef.options || []).forEach(opt => {
                if (typeof opt === 'string' || typeof opt === 'number') {
                    selectEl.add(new Option(opt, opt));
                } else { // {value: 'val', text: 'Text'}
                    selectEl.add(new Option(opt.text, opt.value));
                }
            });
            selectEl.value = currentValue;
            selectEl.addEventListener('change', (e) => {
                const newValue = e.target.value;
                // Attempt to parse if original defaultValue was number (e.g. for Rolloff)
                const originalType = typeof paramDef.defaultValue;
                const valToStore = (originalType === 'number' && !isNaN(parseFloat(newValue))) ? parseFloat(newValue) : newValue;

                if (ownerType === 'track') {
                    owner.updateEffectParam(effect.id, paramDef.key, valToStore);
                } else { // master
                    window.updateMasterEffectParam(effect.id, paramDef.key, valToStore);
                }
                 if (typeof window.captureStateForUndo === 'function') {
                    const ownerName = ownerType === 'track' ? owner.name : 'Master';
                    window.captureStateForUndo(`Set ${ownerName} ${effectDef.displayName} ${paramDef.label} to ${newValue}`);
                }
            });
            selectContainer.appendChild(selectEl);
            controlGroup.appendChild(selectContainer);
        }
        // Add 'toggle' type if needed
    });
    controlsContainer.appendChild(controlGroup);
}


function showAddEffectModal(owner, ownerType) {
    const modalContent = document.createElement('div');
    const label = document.createElement('label');
    label.htmlFor = 'effectTypeSelect';
    label.textContent = 'Select effect to add:';
    label.className = 'block mb-2 text-sm';
    
    const select = document.createElement('select');
    select.id = 'effectTypeSelect';
    select.className = 'w-full p-2 border border-gray-300 rounded bg-white text-black';

    Object.keys(AVAILABLE_EFFECTS).sort().forEach(effectKey => {
        const option = document.createElement('option');
        option.value = effectKey;
        option.textContent = AVAILABLE_EFFECTS[effectKey].displayName;
        select.appendChild(option);
    });
    modalContent.appendChild(label);
    modalContent.appendChild(select);

    showCustomModal('Add Effect', modalContent, [
        {
            text: 'Add',
            action: () => {
                const selectedEffectType = select.value;
                if (selectedEffectType) {
                    let newEffectId;
                    if (ownerType === 'track') {
                        newEffectId = owner.addEffect(selectedEffectType);
                    } else { // master
                        newEffectId = window.addMasterEffect(selectedEffectType);
                    }
                    // Re-render the list and potentially select the new effect for editing
                    const listDiv = document.getElementById(`${ownerType}-${owner?.id || 'master'}-effects-list`);
                    const controlsContainer = document.getElementById(`${ownerType}-${owner?.id || 'master'}-effect-controls`);
                    if (listDiv && controlsContainer) {
                        renderEffectsList(owner, ownerType, listDiv, controlsContainer);
                        if (newEffectId) {
                           renderEffectControls(owner, ownerType, newEffectId, controlsContainer);
                            const newEffectItem = listDiv.querySelector(`.effect-item[data-effect-id="${newEffectId}"]`);
                            if (newEffectItem) {
                                listDiv.querySelectorAll('.effect-item').forEach(item => item.classList.remove('border-blue-500', 'border-2'));
                                newEffectItem.classList.add('border-blue-500', 'border-2');
                            }
                        }
                    }
                }
            }
        },
        { text: 'Cancel' }
    ]);
}


export function openTrackEffectsRackWindow(trackId, savedState = null) {
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null;
    if (!track) return null;
    const windowId = `effectsRack-${track.id}`;

    if (window.openWindows[windowId] && !savedState) {
        window.openWindows[windowId].restore(); return window.openWindows[windowId];
    }
    if (window.openWindows[windowId] && savedState) {
        window.openWindows[windowId].close(); // Close existing if recreating from saved state
    }

    const effectsRackContentElement = buildModularEffectsRackDOM(track, 'track');
    const winOptions = {
        width: 450,
        height: 500, // Adjust as needed
        initialContentKey: `effectsRack-${track.id}` // Used for restoring window content during project load
    };
    if (savedState) Object.assign(winOptions, savedState);

    const effectsWin = new SnugWindow(windowId, `Effects: ${track.name}`, effectsRackContentElement, winOptions);
    if (!effectsWin || !effectsWin.element) {
        showNotification("Failed to create Track Effects Rack.", 5000); return null;
    }
    track.effectsRackWindow = effectsWin;
    return effectsWin;
}

export function openMasterEffectsRackWindow(savedState = null) {
    const windowId = 'masterEffectsRack';
    if (window.openWindows[windowId] && !savedState) {
        window.openWindows[windowId].restore(); return window.openWindows[windowId];
    }
     if (window.openWindows[windowId] && savedState) {
        window.openWindows[windowId].close();
    }

    const masterEffectsContentElement = buildModularEffectsRackDOM(null, 'master'); // null owner for master
     const winOptions = {
        width: 450,
        height: 500,
        initialContentKey: 'masterEffectsRack'
    };
    if (savedState) Object.assign(winOptions, savedState);
    
    const masterEffectsWin = new SnugWindow(windowId, 'Master Effects Rack', masterEffectsContentElement, winOptions);
    if (!masterEffectsWin || !masterEffectsWin.element) {
        showNotification("Failed to create Master Effects Rack.", 5000); return null;
    }
    return masterEffectsWin;
}


// Modify buildTrackInspectorContentDOM to remove old effects button
// It's cleaner to have the effects rack as a separate, more spacious window.
// ... (ensure other UI functions like openGlobalControlsWindow, openMixerWindow, etc. are updated if they referenced the old effects system)
