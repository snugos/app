// js/daw/ui/effectsRackUI.js

// Corrected imports for effectsRegistry and state modules
import { getEffectDefaultParams as getEffectDefaultParamsFromRegistry, AVAILABLE_EFFECTS, getEffectParamDefinitions } from '../effectsRegistry.js'; //
import { getMasterEffects, addMasterEffect, removeMasterEffect, updateMasterEffectParam } from '../state/masterState.js'; //
import { getTrackById } from '../state/trackState.js'; //
import { getOpenWindows, getWindowById } from '../state/windowState.js'; //

let localAppServices = {}; //
let selectedEffectId = {}; // Keyed by ownerId

export function initializeEffectsRackUI(appServices) { //
    localAppServices = appServices; //
}

function refreshEffectsRack(windowInstance) { //
    if (!windowInstance?.element) return; //
    const ownerId = windowInstance.id.includes('master') ? 'master' : windowInstance.id.split('-')[1]; //
    const ownerType = ownerId === 'master' ? 'master' : 'track'; //
    
    let owner; //
    if (ownerType === 'track') { //
        owner = localAppServices.getTrackById(parseInt(ownerId)); //
    } else {
        owner = { effects: { activeEffects: getMasterEffects() } }; //
    }

    if (!owner) return; //
    
    const listDiv = windowInstance.element.querySelector(`#effectsList-${ownerId}`); //
    const controlsContainer = windowInstance.element.querySelector(`#effectControlsContainer-${ownerId}`); //
    renderEffectsList(owner, ownerType, listDiv, controlsContainer); //
}

function buildModularEffectsRackDOM(owner, ownerType = 'track') { //
    const ownerId = (ownerType === 'track' && owner) ? owner.id : 'master'; //
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus'; //
    return `<div id="effectsRackContent-${ownerId}" class="p-2 space-y-2 overflow-y-auto h-full text-black dark:text-white">
        <h3 class="text-sm font-semibold">${ownerName}</h3>
        <div id="effectsList-${ownerId}" class="space-y-1 min-h-[50px] border rounded p-1 bg-white dark:bg-black border-black dark:border-white"></div>
        <button id="addEffectBtn-${ownerId}" class="w-full text-xs px-2 py-1 border rounded bg-black text-white border-black hover:bg-white hover:text-black dark:bg-white dark:text-black dark:border-white dark:hover:bg-black dark:hover:text-white">+ Add Effect</button>
        <div id="effectControlsContainer-${ownerId}" class="mt-2 space-y-2 border-t border-black dark:border-white pt-2"></div>
    </div>`; //
}

export function openTrackEffectsRackWindow(trackId, savedState = null) { //
    const track = localAppServices.getTrackById(trackId); //
    if (!track) return null; //
    const windowId = `effectsRack-${trackId}`; //
    
    const existingWindow = getOpenWindows().get(windowId); //

    if (existingWindow) { //
        if (!savedState) { //
            existingWindow.restore(); //
            return existingWindow; //
        } else {
            existingWindow.close(true); //
        }
    }

    const content = buildModularEffectsRackDOM(track, 'track'); //
    
    const rackOptions = { //
        width: 350, height: 400, minWidth: 300, minHeight: 250, //
        onRefresh: refreshEffectsRack //
    };
    if (savedState) Object.assign(rackOptions, savedState); //

    const rackWindow = localAppServices.createWindow(windowId, `Effects: ${track.name}`, content, rackOptions); //
    attachEffectsRackListeners(track, 'track', rackWindow.element); //
}

export function openMasterEffectsRackWindow(savedState = null) { //
    const windowId = 'masterEffectsRack'; //
    if (getOpenWindows().has(windowId) && !savedState) { //
        getWindowById(windowId).restore(); //
        return; //
    }
    const masterOwner = { effects: { activeEffects: getMasterEffects() } }; //
    const content = buildModularEffectsRackDOM(masterOwner, 'master'); //
    
    const rackOptions = { //
        width: 350, height: 400, minWidth: 300, minHeight: 250, //
        onRefresh: refreshEffectsRack //
    };
    if (savedState) Object.assign(rackOptions, savedState); //

    const rackWindow = localAppServices.createWindow(windowId, 'Master Effects Rack', content, rackOptions); //
    attachEffectsRackListeners(masterOwner, 'master', rackWindow.element); //
}

function attachEffectsRackListeners(owner, ownerType, rackEl) { //
    if (!rackEl) return; //
    const ownerId = (ownerType === 'track') ? owner.id : 'master'; //
    const addEffectBtn = rackEl.querySelector(`#addEffectBtn-${ownerId}`); //
    addEffectBtn?.addEventListener('click', () => showAddEffectModal(owner, ownerType)); //
    const listDiv = rackEl.querySelector(`#effectsList-${ownerId}`); //
    const controlsContainer = rackEl.querySelector(`#effectControlsContainer-${ownerId}`); //
    renderEffectsList(owner, ownerType, listDiv, controlsContainer); //
}

export function renderEffectsList(owner, ownerType, listDiv, controlsContainer) { //
    if (!listDiv) return; //
    const ownerId = (ownerType === 'track') ? owner.id : 'master'; //
    
    const effects = owner.effects.activeEffects; //
    
    listDiv.innerHTML = ''; //

    if (effects.length === 0) { //
        listDiv.innerHTML = '<p class="text-xs text-center text-black dark:text-white italic">No effects added.</p>'; //
    } else {
        effects.forEach(effect => { //
            const effectDiv = document.createElement('div'); //
            effectDiv.className = 'effect-item p-1 border rounded cursor-pointer flex justify-between items-center bg-white dark:bg-black border-black dark:border-white'; //
            const effectName = AVAILABLE_EFFECTS[effect.type]?.displayName || effect.type; //
            effectDiv.innerHTML = `<span>${effects.indexOf(effect) + 1}. ${effectName}</span><button class="text-xs text-black dark:text-white hover:font-bold" title="Remove Effect">X</button>`; //
            
            if (selectedEffectId[ownerId] === effect.id) { //
                effectDiv.classList.add('bg-black', 'text-white', 'dark:bg-white', 'dark:text-black'); //
            }

            effectDiv.addEventListener('click', (e) => { //
                if (e.target.tagName === 'BUTTON') { //
                    if (ownerType === 'track') owner.effects.removeEffect(effect.id); //
                    else addMasterEffect(effect.id); //
                } else {
                    selectedEffectId[ownerId] = effect.id; //
                    renderEffectsList(owner, ownerType, listDiv, controlsContainer); //
                    renderEffectControls(owner, ownerType, effect.id, controlsContainer); //
                }
            });
            listDiv.appendChild(effectDiv); //
        });
    }

    if (selectedEffectId[ownerId]) { //
        renderEffectControls(owner, ownerType, selectedEffectId[ownerId], controlsContainer); //
    } else {
        controlsContainer.innerHTML = ''; //
    }
}

export function renderEffectControls(owner, ownerType, effectId, controlsContainer) { //
    if (!controlsContainer) return; //
    
    const effects = owner.effects.activeEffects; //
    const effect = effects.find(e => e.id === effectId); //
    
    if (!effect) { //
        controlsContainer.innerHTML = ''; //
        return; //
    }

    const paramDefinitions = getEffectParamDefinitions(effect.type) || []; //
    const effectName = AVAILABLE_EFFECTS[effect.type]?.displayName || effect.type; //
    controlsContainer.innerHTML = `<h4 class="text-xs font-bold border-b border-black dark:border-white mb-2 pb-1">${effectName} Controls</h4>`; //
    
    const gridContainer = document.createElement('div'); //
    gridContainer.className = 'grid grid-cols-2 md:grid-cols-3 gap-2'; //

    if (paramDefinitions.length > 0) { //
        paramDefinitions.forEach(paramDef => { //
            const controlWrapper = document.createElement('div'); //
            let currentValue = effect.params; //
            paramDef.key.split('.').forEach(k => { currentValue = currentValue?.[k]; }); //

            if (paramDef.type === 'knob') { //
                const knob = localAppServices.createKnob({ //
                    label: paramDef.label, //
                    min: paramDef.min, max: paramDef.max, step: paramDef.step, //
                    decimals: paramDef.decimals, //
                    displaySuffix: paramDef.displaySuffix || '', //
                    initialValue: currentValue, //
                    onValueChange: (val) => { //
                        if (ownerType === 'track') owner.effects.updateEffectParam(effect.id, paramDef.key, val); //
                        else updateMasterEffectParam(effect.id, paramDef.key, val); //
                    }
                }, localAppServices); //
                controlWrapper.appendChild(knob.element); //
            }
            gridContainer.appendChild(controlWrapper); //
        });
    }
    controlsContainer.appendChild(gridContainer); //
}

function showAddEffectModal(owner, ownerType) { //
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master'; //
    let content = '<ul class="list-none p-0 m-0">'; //
    const availableEffects = AVAILABLE_EFFECTS || {}; // Ensure AVAILABLE_EFFECTS is available
    for (const key in availableEffects) { //
        content += `<li class="p-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black cursor-pointer" data-effect="${key}">${availableEffects[key].displayName}</li>`; //
    }
    content += '</ul>'; //
    
    // Add a "Cancel" button to the buttonsConfig
    const buttons = [{ //
        label: 'Cancel', //
        action: () => { /* no specific action needed, modal will close by default */ } //
    }];

    const modal = localAppServices.showCustomModal(`Add Effect to ${ownerName}`, content, buttons); //

    modal.contentDiv.querySelectorAll('li').forEach(li => { //
        li.addEventListener('click', () => { //
            const effectType = li.dataset.effect; //
            if (ownerType === 'track') { //
                owner.effects.addEffect(effectType); //
            } else {
                addMasterEffect(effectType); //
            }
            modal.overlay.remove(); // This closes the modal
        });
    });
}
