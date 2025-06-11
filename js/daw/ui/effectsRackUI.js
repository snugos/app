// js/daw/ui/effectsRackUI.js

// Removed import { createKnob } from '../../knobUI.js'; as createKnob is global
// Removed import { AVAILABLE_EFFECTS, getEffectDefaultParams } from '../../effectsRegistry.js'; as they are global
// Removed specific imports for getMasterEffects from state.js as they are global

let localAppServices = {}; //
let selectedEffectId = {}; // Keyed by ownerId //

// Removed export
function initializeEffectsRackUI(appServices) {
    localAppServices = appServices; //
}

function refreshEffectsRack(windowInstance) {
    if (!windowInstance?.element) return; //
    const ownerId = windowInstance.id.includes('master') ? 'master' : windowInstance.id.split('-')[1]; //
    const ownerType = ownerId === 'master' ? 'master' : 'track'; //
    
    let owner; //
    if (ownerType === 'track') { //
        // getTrackByIdState is global
        owner = localAppServices.getTrackById(parseInt(ownerId)); //
    } else {
        // getMasterEffectsState is global
        owner = { effects: { activeEffects: getMasterEffectsState() } }; // Create a dummy owner object for consistency
    }

    if (!owner) return; //
    
    const listDiv = windowInstance.element.querySelector(`#effectsList-${ownerId}`); //
    const controlsContainer = windowInstance.element.querySelector(`#effectControlsContainer-${ownerId}`); //
    renderEffectsList(owner, ownerType, listDiv, controlsContainer); //
}

function buildModularEffectsRackDOM(owner, ownerType = 'track') {
    const ownerId = (ownerType === 'track' && owner) ? owner.id : 'master'; //
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master Bus'; //
    return `<div id="effectsRackContent-${ownerId}" class="p-2 space-y-2 overflow-y-auto h-full text-black dark:text-white">
        <h3 class="text-sm font-semibold">${ownerName}</h3>
        <div id="effectsList-${ownerId}" class="space-y-1 min-h-[50px] border rounded p-1 bg-white dark:bg-black border-black dark:border-white"></div>
        <button id="addEffectBtn-${ownerId}" class="w-full text-xs px-2 py-1 border rounded bg-black text-white border-black hover:bg-white hover:text-black dark:bg-white dark:text-black dark:border-white dark:hover:bg-black dark:hover:text-white">+ Add Effect</button>
        <div id="effectControlsContainer-${ownerId}" class="mt-2 space-y-2 border-t border-black dark:border-white pt-2"></div>
    </div>`; //
}

// Removed export
function openTrackEffectsRackWindow(trackId, savedState = null) {
    // getTrackByIdState is global
    const track = localAppServices.getTrackById(trackId); //
    if (!track) return null; //
    const windowId = `effectsRack-${trackId}`; //
    // getOpenWindowsState is global
    if (getOpenWindowsState().has(windowId) && !savedState) { //
        // getWindowByIdState is global
        getWindowByIdState(windowId).restore(); //
        return; //
    }
    const content = buildModularEffectsRackDOM(track, 'track'); //
    
    const rackOptions = {  //
        width: 350, height: 400, minWidth: 300, minHeight: 250,
        onRefresh: refreshEffectsRack 
    };
    if (savedState) Object.assign(rackOptions, savedState); //

    // SnugWindow is global
    const rackWindow = localAppServices.createWindow(windowId, `Effects: ${track.name}`, content, rackOptions); //
    attachEffectsRackListeners(track, 'track', rackWindow.element); //
}

// Removed export
function openMasterEffectsRackWindow(savedState = null) {
    const windowId = 'masterEffectsRack'; //
    // getOpenWindowsState is global
    if (getOpenWindowsState().has(windowId) && !savedState) { //
        // getWindowByIdState is global
        getWindowByIdState(windowId).restore(); //
        return; //
    }
    // getMasterEffectsState is global
    const masterOwner = { effects: { activeEffects: getMasterEffectsState() } }; //
    const content = buildModularEffectsRackDOM(masterOwner, 'master'); //
    
    const rackOptions = {  //
        width: 350, height: 400, minWidth: 300, minHeight: 250,
        onRefresh: refreshEffectsRack
    };
    if (savedState) Object.assign(rackOptions, savedState); //

    // SnugWindow is global
    const rackWindow = localAppServices.createWindow(windowId, 'Master Effects Rack', content, rackOptions); //
    attachEffectsRackListeners(masterOwner, 'master', rackWindow.element); //
}

function attachEffectsRackListeners(owner, ownerType, rackEl) {
    if (!rackEl) return; //
    const ownerId = (ownerType === 'track') ? owner.id : 'master'; //
    const addEffectBtn = rackEl.querySelector(`#addEffectBtn-${ownerId}`); //
    addEffectBtn?.addEventListener('click', () => showAddEffectModal(owner, ownerType)); //
    const listDiv = rackEl.querySelector(`#effectsList-${ownerId}`); //
    const controlsContainer = rackEl.querySelector(`#effectControlsContainer-${ownerId}`); //
    renderEffectsList(owner, ownerType, listDiv, controlsContainer); //
}

// Removed export
function renderEffectsList(owner, ownerType, listDiv, controlsContainer) {
    if (!listDiv) return; //
    const ownerId = (ownerType === 'track') ? owner.id : 'master'; //
    
    // AVAILABLE_EFFECTS is global
    const effects = owner.effects.activeEffects; // Access effects from the owner object's effects property
    
    listDiv.innerHTML = ''; //

    if (effects.length === 0) { //
        listDiv.innerHTML = '<p class="text-xs text-center text-black dark:text-white italic">No effects added.</p>'; //
    } else {
        effects.forEach(effect => { //
            const effectDiv = document.createElement('div'); //
            effectDiv.className = 'effect-item p-1 border rounded cursor-pointer flex justify-between items-center bg-white dark:bg-black border-black dark:border-white'; //
            const effectName = AVAILABLE_EFFECTS[effect.type]?.displayName || effect.type; // AVAILABLE_EFFECTS is global
            effectDiv.innerHTML = `<span>${effects.indexOf(effect) + 1}. ${effectName}</span><button class="text-xs text-black dark:text-white hover:font-bold" title="Remove Effect">X</button>`; //
            
            if (selectedEffectId[ownerId] === effect.id) { //
                effectDiv.classList.add('bg-black', 'text-white', 'dark:bg-white', 'dark:text-black'); //
            }

            effectDiv.addEventListener('click', (e) => { //
                if (e.target.tagName === 'BUTTON') { //
                    // removeMasterEffectFromState is global
                    if (ownerType === 'track') owner.effects.removeEffect(effect.id); // Correctly calls removeEffect on Track's EffectChain
                    else removeMasterEffectFromState(effect.id); // Correctly calls global master remove function
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

// Removed export
function renderEffectControls(owner, ownerType, effectId, controlsContainer) {
    if (!controlsContainer) return; //
    
    // AVAILABLE_EFFECTS is global
    const effects = owner.effects.activeEffects; // Access effects from the owner object's effects property
    const effect = effects.find(e => e.id === effectId); //
    
    if (!effect) { //
        controlsContainer.innerHTML = ''; //
        return; //
    }

    // getEffectParamDefinitions is global
    const paramDefinitions = getEffectParamDefinitions(effect.type) || []; //
    const effectName = AVAILABLE_EFFECTS[effect.type]?.displayName || effect.type; // AVAILABLE_EFFECTS is global
    controlsContainer.innerHTML = `<h4 class="text-xs font-bold border-b border-black dark:border-white mb-2 pb-1">${effectName} Controls</h4>`; //
    
    const gridContainer = document.createElement('div'); //
    gridContainer.className = 'grid grid-cols-2 md:grid-cols-3 gap-2'; //

    if (paramDefinitions.length > 0) { //
        paramDefinitions.forEach(paramDef => { //
            const controlWrapper = document.createElement('div'); //
            let currentValue = effect.params; //
            paramDef.key.split('.').forEach(k => { currentValue = currentValue?.[k]; }); //

            if (paramDef.type === 'knob') { //
                // createKnob is global
                const knob = createKnob({ //
                    label: paramDef.label,
                    min: paramDef.min, max: paramDef.max, step: paramDef.step,
                    decimals: paramDef.decimals,
                    displaySuffix: paramDef.displaySuffix || '',
                    initialValue: currentValue,
                    onValueChange: (val) => {
                        // updateMasterEffectParamInState is global
                        if (ownerType === 'track') owner.effects.updateEffectParam(effectId, paramDef.key, val); // Correctly calls updateEffectParam on Track's EffectChain
                        else updateMasterEffectParamInState(effectId, paramDef.key, val); // Correctly calls global master update function
                    }
                }, localAppServices);
                controlWrapper.appendChild(knob.element); //
            }
            gridContainer.appendChild(controlWrapper); //
        });
    }
    controlsContainer.appendChild(gridContainer); //
}

function showAddEffectModal(owner, ownerType) {
    const ownerName = (ownerType === 'track' && owner) ? owner.name : 'Master'; //
    let content = '<ul class="list-none p-0 m-0">'; //
    const AVAILABLE_EFFECTS = localAppServices.effectsRegistryAccess?.AVAILABLE_EFFECTS || {}; // AVAILABLE_EFFECTS is global
    for (const key in AVAILABLE_EFFECTS) { //
        content += `<li class="p-2 hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black cursor-pointer" data-effect="${key}">${AVAILABLE_EFFECTS[key].displayName}</li>`; //
    }
    content += '</ul>'; //
    
    // Add a "Cancel" button to the buttonsConfig
    const buttons = [{
        label: 'Cancel',
        action: () => { /* no specific action needed, modal will close by default */ }
    }]; //

    // showCustomModal is global
    const modal = showCustomModal(`Add Effect to ${ownerName}`, content, buttons); // Changed empty array to 'buttons' variable

    modal.contentDiv.querySelectorAll('li').forEach(li => { //
        li.addEventListener('click', () => { //
            const effectType = li.dataset.effect; //
            // addMasterEffectToState is global
            if (ownerType === 'track') { //
                owner.effects.addEffect(effectType); // Correctly calls addEffect on Track's EffectChain
            } else {
                addMasterEffectToState(effectType); // Correctly calls global master add function
            }
            modal.overlay.remove(); // This closes the modal
        });
    });
}
