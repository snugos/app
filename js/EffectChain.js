// js/EffectChain.js

import { createEffectInstance } from './effectsRegistry.js';

export class EffectChain {
    constructor(track, appServices) {
        this.track = track;
        this.appServices = appServices;
        this.activeEffects = [];
    }

    initialize(effects = []) {
        effects.forEach(effectData => this.addEffect(effectData.type, effectData.params, true));
    }

    addEffect(effectType, params, isInitialLoad = false) {
        const effectDef = this.appServices.effectsRegistryAccess?.AVAILABLE_EFFECTS[effectType]; //
        if (!effectDef) return; //
        const initialParams = params || this.appServices.effectsRegistryAccess.getEffectDefaultParams(effectType); //
        const toneNode = createEffectInstance(effectType, initialParams); //
        if (toneNode) { //
            const effectData = { id: `effect-${this.track.id}-${Date.now()}`, type: effectType, toneNode, params: JSON.parse(JSON.stringify(initialParams)) }; //
            this.activeEffects.push(effectData); //
            this.rebuildEffectChain(); //
            if (!isInitialLoad) { //
                this.appServices.updateTrackUI?.(this.track.id, 'effectsChanged'); //
                this.appServices.captureStateForUndo?.(`Add ${effectDef.displayName} to ${this.track.name}`); //
            }
        }
    }

    removeEffect(effectId) {
        const index = this.activeEffects.findIndex(e => e.id === effectId); //
        if (index > -1) { //
            const removedEffect = this.activeEffects.splice(index, 1)[0]; //
            removedEffect.toneNode?.dispose(); //
            this.rebuildEffectChain(); //
            this.appServices.updateTrackUI?.(this.track.id, 'effectsChanged'); //
            this.appServices.captureStateForUndo?.(`Remove ${removedEffect.type} from ${this.track.name}`); //
        }
    }

    updateEffectParam(effectId, paramPath, value) {
        const effect = this.activeEffects.find(e => e.id === effectId); //
        if (effect?.toneNode) { //
            let paramState = effect.params; //
            const keys = paramPath.split('.'); //
            const finalKey = keys.pop(); //
            for (const key of keys) { //
               paramState = paramState[key] = paramState[key] || {}; //
            }
            paramState[finalKey] = value; //
            try {
                effect.toneNode.set({ [paramPath]: value }); //
            } catch (e) {
                console.warn(`Could not set param ${paramPath} on effect ${effect.type}`, e); //
            }
        }
    }

    rebuildEffectChain() {
        this.track.input.disconnect(); //
        let currentNode = this.track.input; //

        this.activeEffects.forEach(effect => { //
            if (effect.toneNode) { //
                currentNode.connect(effect.toneNode); //
                currentNode = effect.toneNode; //
            }
        });

        currentNode.connect(this.track.outputNode); //
    }

    serialize() {
        return this.activeEffects.map(e => ({ type: e.type, params: e.params })); //
    }

    dispose() {
        this.activeEffects.forEach(e => e.toneNode.dispose()); //
    }
}
