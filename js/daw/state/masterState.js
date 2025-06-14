// js/daw/state/masterState.js

// Corrected import path for effectsRegistry
import { getEffectDefaultParams as getEffectDefaultParamsFromRegistry } from '../effectsRegistry.js'; //

let masterEffectsChain = []; //
let masterGainValue = 1.0; // Default gain, not dB

let localAppServices = {}; //

export function initializeMasterState(appServices) { //
    localAppServices = appServices; //
}

export function getMasterEffects() { //
    return masterEffectsChain; //
}

export function setMasterEffects(effects) { //
    masterEffectsChain = effects; //
}

export function addMasterEffect(effectType) { //
    const defaultParams = getEffectDefaultParamsFromRegistry(effectType); //
    const effect = { id: `master-effect-${Date.now()}`, type: effectType, params: defaultParams }; //
    masterEffectsChain.push(effect); //
    localAppServices.addMasterEffectToAudio?.(effect); //
    localAppServices.updateMasterEffectsUI?.(); //
}

export function removeMasterEffect(effectId) { //
    const index = masterEffectsChain.findIndex(e => e.id === effectId); //
    if (index > -1) { //
        masterEffectsChain.splice(index, 1); //
        localAppServices.removeMasterEffectFromAudio?.(effectId); //
        localAppServices.updateMasterEffectsUI?.(); //
    }
}

export function updateMasterEffectParam(effectId, paramPath, value) { //
    const effect = masterEffectsChain.find(e => e.id === effectId); //
    if (effect) { //
        // This helper function safely sets nested properties
        const keys = paramPath.split('.'); //
        let currentLevel = effect.params; //
        keys.forEach((key, index) => { //
            if (index === keys.length - 1) { //
                currentLevel[key] = value; //
            } else {
                currentLevel[key] = currentLevel[key] || {}; //
                currentLevel = currentLevel[key]; //
            }
        });
        localAppServices.updateMasterEffectParamInAudio?.(effectId, paramPath, value); //
    }
}

export function reorderMasterEffect(oldIndex, newIndex) { //
    const [moved] = masterEffectsChain.splice(oldIndex, 1); //
    masterEffectsChain.splice(newIndex, 0, moved); //
    localAppServices.reorderMasterEffectInAudio?.(); //
    localAppServices.updateMasterEffectsUI?.(); //
}

export function getMasterGainValue() { //
    return masterGainValue; //
}

export function setMasterGainValue(gain) { //
    masterGainValue = gain; //
    localAppServices.setActualMasterVolume?.(gain); //
}
