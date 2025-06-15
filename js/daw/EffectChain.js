// js/daw/EffectChain.js

import { createEffectInstance } from './effectsRegistry.js';

export class EffectChain {
    constructor(track, appServices) {
        this.track = track;
        this.appServices = appServices;
        this.activeEffects = [];
    }

    initialize(effects = []) {
        // Ensure effects is an array before iterating
        if (Array.isArray(effects)) {
            effects.forEach(effectData => this.addEffect(effectData.type, effectData.params, true));
        } else {
            console.warn(`[EffectChain.js] initialize received non-array effects data for track ${this.track.id}:`, effects);
        }
        // After initializing all effects, rebuild the chain to ensure connections are correct.
        this.rebuildEffectChain();
    }

    addEffect(effectType, params, isInitialLoad = false) {
        const effectDef = this.appServices.effectsRegistryAccess?.AVAILABLE_EFFECTS[effectType];
        if (!effectDef) {
            console.warn(`[EffectChain.js] Effect definition for type "${effectType}" not found.`);
            return;
        }
        const initialParams = params || this.appServices.effectsRegistryAccess.getEffectDefaultParams(effectType);
        const toneNode = createEffectInstance(effectType, initialParams);
        if (toneNode) {
            const effectData = { id: `effect-${this.track.id}-${Date.now()}`, type: effectType, toneNode, params: JSON.parse(JSON.stringify(initialParams)) };
            this.activeEffects.push(effectData);
            this.rebuildEffectChain();
            if (!isInitialLoad) {
                this.appServices.updateTrackUI?.(this.track.id, 'effectsChanged');
                this.appServices.captureStateForUndo?.(`Add ${effectDef.displayName} to ${this.track.name}`);
            }
        } else {
            console.error(`[EffectChain.js] Failed to create Tone.js instance for effect type "${effectType}".`);
        }
    }

    removeEffect(effectId) {
        const index = this.activeEffects.findIndex(e => e.id === effectId);
        if (index > -1) {
            const removedEffect = this.activeEffects.splice(index, 1)[0];
            removedEffect.toneNode?.dispose();
            this.rebuildEffectChain();
            this.appServices.updateTrackUI?.(this.track.id, 'effectsChanged');
            this.appServices.captureStateForUndo?.(`Remove ${removedEffect.type} from ${this.track.name}`);
        } else {
            console.warn(`[EffectChain.js] Effect with ID ${effectId} not found in activeEffects for track ${this.track.id}.`);
        }
    }

    updateEffectParam(effectId, paramPath, value) {
        const effect = this.activeEffects.find(e => e.id === effectId);
        if (effect?.toneNode) {
            let paramState = effect.params;
            const keys = paramPath.split('.');
            const finalKey = keys.pop();
            for (const key of keys) {
               paramState = paramState[key] = paramState[key] || {};
            }
            paramState[finalKey] = value;
            try {
                effect.toneNode.set({ [paramPath]: value });
            } catch (e) {
                console.warn(`[EffectChain.js] Could not set param ${paramPath} on effect ${effect.type}`, e);
            }
        } else {
            console.warn(`[EffectChain.js] Effect with ID ${effectId} or its ToneNode not found for track ${this.track.id}.`);
        }
    }

    rebuildEffectChain() {
        this.track.input.disconnect(); // Disconnect everything from the track's input initially
        let currentNode = this.track.input;

        this.activeEffects.forEach(effect => {
            if (effect.toneNode) {
                // Disconnect each effect node first, in case its previous connection changed
                if (currentNode !== effect.toneNode) { // Avoid disconnecting self if currentNode is already the effectNode (e.g. at start of chain)
                    if (currentNode.output && typeof currentNode.output.disconnect === 'function') {
                        // This handles cases where currentNode is a ToneAudioNode with 'output'
                        currentNode.output.disconnect(effect.toneNode);
                    } else if (typeof currentNode.disconnect === 'function') {
                        // This handles cases where currentNode is a direct AudioNode
                        currentNode.disconnect(effect.toneNode);
                    }
                }
                currentNode.connect(effect.toneNode);
                currentNode = effect.toneNode;
            }
        });

        currentNode.connect(this.track.outputNode); // Connect the last effect node to the track's output
    }

    serialize() {
        return this.activeEffects.map(e => ({ type: e.type, params: e.params }));
    }

    dispose() {
        this.activeEffects.forEach(e => e.toneNode.dispose());
        this.activeEffects = [];
        // Ensure the chain is re-established to bypass disposed effects
        this.track.input.disconnect();
        this.track.input.connect(this.track.outputNode);
    }
}