// js/ui/effectsRackUI.js

let localAppServices = {};

export function initializeEffectsRackUI(appServices) {
    localAppServices = appServices;
}

function buildModularEffectsRackDOM(owner, ownerType = 'track') {
    const ownerId = (ownerType === 'track' && owner) ? owner.id : 'master';
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus';
    return `<div id="effectsRackContent-${ownerId}" class="p-2 space-y-2 overflow-y-auto h-full">
        <h3 class="text-sm font-semibold dark:text-slate-200">Effects Rack: ${ownerName}</h3>
        <div id="effectsList-${ownerId}" class="space-y-1 min-h-[50px] border rounded p-1 bg-gray-100 dark:bg-slate-700 dark:border-slate-600"></div>
        <button id="addEffectBtn-${ownerId}" class="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700">Add Effect</button>
        <div id="effectControlsContainer-${ownerId}" class="mt-2 space-y-2"></div>
    </div>`;
}

export function openTrackEffectsRackWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById(trackId);
    if (!track) return null;
    const windowId = `effectsRack-${trackId}`;
    if (localAppServices.getOpenWindows().has(windowId) && !savedState) {
        localAppServices.getOpenWindows().get(windowId).restore();
        return;
    }
    const contentDOM = buildModularEffectsRackDOM(track, 'track');
    const rackWindow = localAppServices.createWindow(windowId, `Effects: ${track.name}`, contentDOM, {
        width: 350, height: 400, minWidth: 300, minHeight: 250, initialContentKey: windowId
    });
    if (rackWindow?.element) {
        const listDiv = rackWindow.element.querySelector(`#effectsList-${trackId}`);
        const controlsContainer = rackWindow.element.querySelector(`#effectControlsContainer-${trackId}`);
        renderEffectsList(track, 'track', listDiv, controlsContainer);
        rackWindow.element.querySelector(`#addEffectBtn-${track.id}`)?.addEventListener('click', () => showAddEffectModal(track, 'track'));
    }
    return rackWindow;
}

export function openMasterEffectsRackWindow(savedState = null) {
    const windowId = 'masterEffectsRack';
    if (localAppServices.getOpenWindows().has(windowId) && !savedState) {
        localAppServices.getOpenWindows().get(windowId).restore();
        return;
    }
    const contentDOM = buildModularEffectsRackDOM(null, 'master');
    const rackWindow = localAppServices.createWindow(windowId, 'Master Effects Rack', contentDOM, {
        width: 350, height: 400, minWidth: 300, minHeight: 250, initialContentKey: windowId
    });
    if (rackWindow?.element) {
        const listDiv = rackWindow.element.querySelector('#effectsList-master');
        const controlsContainer = rackWindow.element.querySelector('#effectControlsContainer-master');
        renderEffectsList(null, 'master', listDiv, controlsContainer);
        rackWindow.element.querySelector('#addEffectBtn-master')?.addEventListener('click', () => showAddEffectModal(null, 'master'));
    }
    return rackWindow;
}

export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    if (!listDiv) return;
    listDiv.innerHTML = '';
    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : localAppServices.getMasterEffects();
    if (!effectsArray || effectsArray.length === 0) {
        listDiv.innerHTML = '<p class="text-xs text-gray-500 dark:text-slate-400 italic">No effects added.</p>';
        if (controlsContainer) controlsContainer.innerHTML = '';
        return;
    }
    const AVAILABLE_EFFECTS = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
    effectsArray.forEach((effect, index) => {
        const displayName = AVAILABLE_EFFECTS[effect.type]?.displayName || effect.type;
        const item = document.createElement('div');
        item.className = 'effect-item flex justify-between items-center p-1 border-b bg-white dark:bg-slate-800 dark:border-slate-700 rounded-sm shadow-xs text-xs';
        item.innerHTML = `
            <span class="effect-name flex-grow cursor-pointer hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400" title="Edit ${displayName}">${displayName}</span>
            <div class="effect-actions">
                <button class="remove-btn text-xs px-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" title="Remove Effect">✕</button>
            </div>`;
        item.querySelector('.effect-name').addEventListener('click', () => {
            renderEffectControls(owner, ownerType, effect.id, controlsContainer);
            listDiv.querySelectorAll('.bg-blue-100,.dark\\:bg-blue-700').forEach(el => el.classList.remove('bg-blue-100', 'dark:bg-blue-700', 'border-blue-300', 'dark:border-blue-500'));
            item.classList.add('bg-blue-100', 'dark:bg-blue-700', 'border-blue-300', 'dark:border-blue-500');
        });
        item.querySelector('.remove-btn').addEventListener('click', () => {
            if (ownerType === 'track') owner.removeEffect(effect.id);
            else localAppServices.removeMasterEffect(effect.id);
        });
        listDiv.appendChild(item);
    });
}

export function renderEffectControls(owner, ownerType, effectId, controlsContainer) {
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';
    const effectsArray = (ownerType === 'track' && owner) ? owner.activeEffects : localAppServices.getMasterEffects();
    const effectWrapper = effectsArray.find(e => e.id === effectId);
    if (!effectWrapper) {
        controlsContainer.innerHTML = '<p class="text-xs text-gray-500 dark:text-slate-400 italic">Select an effect to see its controls.</p>';
        return;
    }
    const effectDef = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS[effectWrapper.type];
    if (!effectDef) {
        controlsContainer.innerHTML = `<p class="text-xs text-red-500">Error: Definition for "${effectWrapper.type}" not found.</p>`;
        return;
    }
    const titleEl = document.createElement('h4');
    titleEl.className = 'text-xs font-semibold mb-1 dark:text-slate-200';
    titleEl.textContent = `Controls: ${effectDef.displayName}`;
    controlsContainer.appendChild(titleEl);
    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-1 sm:grid-cols-2 gap-2 p-1 border rounded bg-gray-50 dark:bg-slate-700 dark:border-slate-600 text-xs';
    if (!effectDef.params || effectDef.params.length === 0) {
        gridContainer.innerHTML = '<p class="text-xs text-gray-500 dark:text-slate-400 italic col-span-full">No adjustable parameters.</p>';
    } else {
        effectDef.params.forEach(paramDef => {
            const controlWrapper = document.createElement('div');
            let currentValue = effectWrapper.params[paramDef.key];
            if (paramDef.type === 'knob') {
                const knob = localAppServices.createKnob({
                    label: paramDef.label,
                    min: paramDef.min,
                    max: paramDef.max,
                    step: paramDef.step,
                    initialValue: currentValue,
                    onValueChange: (val) => {
                        if (ownerType === 'track') owner.updateEffectParam(effectId, paramDef.key, val);
                        else localAppServices.updateMasterEffectParam(effectId, paramDef.key, val);
                    }
                }, localAppServices);
                controlWrapper.appendChild(knob.element);
            }
            gridContainer.appendChild(controlWrapper);
        });
    }
    controlsContainer.appendChild(gridContainer);
}

function showAddEffectModal(owner, ownerType) {
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master';
    let content = '<ul class="list-none p-0 m-0">';
    const AVAILABLE_EFFECTS = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {};
    for (const key in AVAILABLE_EFFECTS) {
        content += `<li class="p-2 hover:bg-blue-600 cursor-pointer" data-effect="${key}">${AVAILABLE_EFFECTS[key].displayName}</li>`;
    }
    content += '</ul>';
    
    const modal = localAppServices.showCustomModal(`Add Effect to ${ownerName}`, content, []);
    modal.contentDiv.querySelectorAll('li').forEach(li => {
        li.addEventListener('click', () => {
            const effectType = li.dataset.effect;
            if (ownerType === 'track') owner.addEffect(effectType);
            else localAppServices.addMasterEffect(effectType);
            modal.overlay.remove();
        });
    });
}
