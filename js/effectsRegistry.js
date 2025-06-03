// js/effectsRegistry.js - Definitions for modular effects (MODIFIED)

// Definitions for synthesizer parameters exposed in UI (e.g., Track Inspector)
export const synthEngineControlDefinitions = {
    MonoSynth: [
        { idPrefix: 'portamento', label: 'Porta', type: 'knob', min: 0, max: 0.5, step: 0.001, defaultValue: 0.0, decimals: 3, path: 'portamento' },
        { idPrefix: 'oscType', label: 'Osc Type', type: 'select', options: ['sine', 'square', 'sawtooth', 'triangle', 'pulse', 'pwm'], defaultValue: 'sawtooth', path: 'oscillator.type' },
        { idPrefix: 'oscWidth', label: 'Pulse Width', type: 'knob', min: 0.01, max: 0.99, step: 0.01, defaultValue: 0.5, decimals: 2, path: 'oscillator.width' }, // For 'pulse' or 'pwm'
        { idPrefix: 'envAttack', label: 'Attack', type: 'knob', min: 0.001, max: 2, step: 0.001, defaultValue: 0.005, decimals: 3, path: 'envelope.attack' },
        { idPrefix: 'envDecay', label: 'Decay', type: 'knob', min: 0.01, max: 2, step: 0.01, defaultValue: 0.1, decimals: 2, path: 'envelope.decay' },
        { idPrefix: 'envSustain', label: 'Sustain', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.9, decimals: 2, path: 'envelope.sustain' },
        { idPrefix: 'envRelease', label: 'Release', type: 'knob', min: 0.01, max: 5, step: 0.01, defaultValue: 1, decimals: 2, path: 'envelope.release' },
        { idPrefix: 'filterCutoff', label: 'Cutoff', type: 'knob', min: 20, max: 20000, step: 1, defaultValue: 15000, decimals: 0, log: true, path: 'filter.frequency' },
        { idPrefix: 'filterResonance', label: 'Resonance', type: 'knob', min: 0, max: 20, step: 0.1, defaultValue: 1, decimals: 1, path: 'filter.Q' },
        { idPrefix: 'filterType', label: 'Flt Type', type: 'select', options: ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'notch', 'allpass'], defaultValue: 'lowpass', path: 'filter.type'},
        { idPrefix: 'filterRolloff', label: 'Rolloff', type: 'select', options: [-12, -24, -48, -96], defaultValue: -12, path: 'filter.rolloff'},
        { idPrefix: 'filterEnvAttack', label: 'F.Att', type: 'knob', min: 0.001, max: 2, step: 0.001, defaultValue: 0.005, decimals: 3, path: 'filterEnvelope.attack' },
        { idPrefix: 'filterEnvDecay', label: 'F.Dec', type: 'knob', min: 0.01, max: 2, step: 0.01, defaultValue: 0.1, decimals: 2, path: 'filterEnvelope.decay' },
        { idPrefix: 'filterEnvSustain', label: 'F.Sus', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.5, decimals: 2, path: 'filterEnvelope.sustain' },
        { idPrefix: 'filterEnvRelease', label: 'F.Rel', type: 'knob', min: 0.01, max: 5, step: 0.01, defaultValue: 1, decimals: 2, path: 'filterEnvelope.release' },
        { idPrefix: 'filterEnvBaseFreq', label: 'Base Freq', type: 'knob', min: 20, max: 10000, step: 1, defaultValue: 200, log: true, decimals: 0, path: 'filterEnvelope.baseFrequency' },
        { idPrefix: 'filterEnvOctaves', label: 'Octaves', type: 'knob', min: 0, max: 10, step: 0.1, defaultValue: 3, decimals: 1, path: 'filterEnvelope.octaves' },
    ],
    // Add other synth types here if needed
};

export const AVAILABLE_EFFECTS = {
    Reverb: {
        toneClass: 'Reverb',
        displayName: 'Reverb',
        params: [
            { key: 'decay', label: 'Decay', type: 'knob', min: 0.01, max: 20, step: 0.01, defaultValue: 1.5, decimals: 2, displaySuffix: 's' },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.5, decimals: 2 }
        ]
    },
    Delay: {
        toneClass: 'FeedbackDelay',
        displayName: 'Delay',
        params: [
            { key: 'delayTime', label: 'Time', type: 'knob', min: 0, max: 1, step: 0.001, defaultValue: 0.25, decimals: 3, displaySuffix: 's' },
            { key: 'feedback', label: 'Feedback', type: 'knob', min: 0, max: 0.99, step: 0.01, defaultValue: 0.5, decimals: 2 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.5, decimals: 2 }
        ]
    },
    Chorus: {
        toneClass: 'Chorus',
        displayName: 'Chorus',
        params: [
            { key: 'frequency', label: 'Freq', type: 'knob', min: 0.1, max: 20, step: 0.1, defaultValue: 1.5, decimals: 1, displaySuffix: 'Hz' },
            { key: 'delayTime', label: 'Delay', type: 'knob', min: 1, max: 20, step: 0.1, defaultValue: 3.5, decimals: 1, displaySuffix: 'ms' },
            { key: 'depth', label: 'Depth', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.7, decimals: 2 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.5, decimals: 2 }
        ]
    },
    Filter: {
        toneClass: 'Filter',
        displayName: 'Filter',
        params: [
            { key: 'type', label: 'Type', type: 'select', options: ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'notch', 'allpass'], defaultValue: 'lowpass' },
            { key: 'frequency', label: 'Freq', type: 'knob', min: 20, max: 20000, step: 1, defaultValue: 350, log: true, decimals: 0, displaySuffix: 'Hz' },
            { key: 'Q', label: 'Resonance', type: 'knob', min: 0.1, max: 20, step: 0.1, defaultValue: 1, decimals: 1 },
            { key: 'gain', label: 'Gain', type: 'knob', min: -24, max: 24, step: 0.1, defaultValue: 0, decimals: 1, displaySuffix: 'dB' }, // For lowshelf/highshelf
            { key: 'rolloff', label: 'Rolloff', type: 'select', options: [-12, -24, -48, -96], defaultValue: -12 }
        ]
    },
    EQ3: {
        toneClass: 'EQ3',
        displayName: '3-Band EQ',
        params: [
            { key: 'low', label: 'Low', type: 'knob', min: -24, max: 6, step: 0.1, defaultValue: 0, decimals: 1, displaySuffix: 'dB' },
            { key: 'mid', label: 'Mid', type: 'knob', min: -24, max: 6, step: 0.1, defaultValue: 0, decimals: 1, displaySuffix: 'dB' },
            { key: 'high', label: 'High', type: 'knob', min: -24, max: 6, step: 0.1, defaultValue: 0, decimals: 1, displaySuffix: 'dB' },
            { key: 'lowFrequency', label: 'Low Freq', type: 'knob', min: 50, max: 1000, step:1, defaultValue: 250, decimals:0, displaySuffix: 'Hz'},
            { key: 'highFrequency', label: 'High Freq', type: 'knob', min: 1000, max: 15000, step:1, defaultValue: 2500, decimals:0, displaySuffix: 'Hz'}
        ]
    },
    Compressor: {
        toneClass: 'Compressor',
        displayName: 'Compressor',
        params: [
            { key: 'threshold', label: 'Thresh', type: 'knob', min: -60, max: 0, step: 0.1, defaultValue: -24, decimals: 1, displaySuffix: 'dB' },
            { key: 'ratio', label: 'Ratio', type: 'knob', min: 1, max: 20, step: 0.1, defaultValue: 4, decimals: 1 },
            { key: 'attack', label: 'Attack', type: 'knob', min: 0.001, max: 0.2, step: 0.001, defaultValue: 0.003, decimals: 3, displaySuffix: 's' },
            { key: 'release', label: 'Release', type: 'knob', min: 0.01, max: 1, step: 0.01, defaultValue: 0.25, decimals: 2, displaySuffix: 's' },
            { key: 'knee', label: 'Knee', type: 'knob', min:0, max: 40, step:1, defaultValue: 30, decimals:0, displaySuffix: 'dB'}
        ]
    },
    Distortion: {
        toneClass: 'Distortion',
        displayName: 'Distortion',
        params: [
            { key: 'distortion', label: 'Amount', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.4, decimals: 2 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 }
        ]
    },
    Phaser: {
        toneClass: 'Phaser',
        displayName: 'Phaser',
        params: [
            { key: 'frequency', label: 'Speed', type: 'knob', min: 0.1, max: 10, step: 0.1, defaultValue: 0.5, decimals: 1, displaySuffix: 'Hz' },
            { key: 'octaves', label: 'Octaves', type: 'knob', min: 1, max: 8, step: 0.1, defaultValue: 3, decimals: 1 },
            { key: 'stages', label: 'Stages', type: 'knob', min: 1, max: 12, step:1, defaultValue: 4, decimals: 0 },
            { key: 'Q', label: 'Resonance', type: 'knob', min: 0, max: 20, step: 0.1, defaultValue: 2, decimals: 1 },
            { key: 'baseFrequency', label: 'Base Freq', type: 'knob', min: 100, max: 1500, step:1, defaultValue: 350, decimals:0, displaySuffix:'Hz'},
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.5, decimals: 2 }
        ]
    },
    BitCrusher: {
        toneClass: 'BitCrusher',
        displayName: 'Bit Crusher',
        params: [
            { key: 'bits', label: 'Bits', type: 'knob', min: 1, max: 16, step: 1, defaultValue: 8, decimals: 0 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 }
        ]
    },
    PingPongDelay: {
        toneClass: 'PingPongDelay',
        displayName: 'PingPong Delay',
        params: [
            { key: 'delayTime', label: 'Time', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: "4n", decimals: 2, displaySuffix: 's' }, // Can also be time notation string
            { key: 'feedback', label: 'Feedback', type: 'knob', min: 0, max: 0.99, step: 0.01, defaultValue: 0.2, decimals: 2 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.5, decimals: 2 }
        ]
    },
    Tremolo: {
        toneClass: 'Tremolo',
        displayName: 'Tremolo',
        params: [
            { key: 'frequency', label: 'Speed', type: 'knob', min: 0.1, max: 20, step: 0.1, defaultValue: 10, decimals: 1, displaySuffix: 'Hz' },
            { key: 'depth', label: 'Depth', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.5, decimals: 2 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 }
        ]
    },
    AutoPanner: {
        toneClass: 'AutoPanner',
        displayName: 'Auto Panner',
        params: [
            { key: 'frequency', label: 'Speed', type: 'knob', min: 0.1, max: 20, step: 0.1, defaultValue: 1, decimals: 1, displaySuffix: 'Hz' },
            { key: 'depth', label: 'Depth', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 }
        ]
    },
     Gain: { // Added Gain effect
        toneClass: 'Gain',
        displayName: 'Gain',
        params: [
            { key: 'gain', label: 'Gain', type: 'knob', min: 0, max: 4, step: 0.01, defaultValue: 1, decimals: 2 } // 0 to 4x gain
        ]
    }
};

export function createEffectInstance(effectType, initialParams = null) {
    const definition = AVAILABLE_EFFECTS[effectType];
    if (!definition) {
        console.error(`[EffectsRegistry] Unknown effect type: ${effectType}`);
        return null;
    }
    if (typeof Tone === 'undefined' || typeof Tone[definition.toneClass] !== 'function') {
        console.error(`[EffectsRegistry] Tone.js class Tone.${definition.toneClass} not found for effect type: ${effectType}. Ensure Tone.js is loaded and class name is correct.`);
        return null;
    }

    let paramsForInstance = initialParams || getEffectDefaultParams(effectType);
    
    // The new version's robust instantiation logic with fallback
    try {
        // Attempt direct instantiation if params object structure is simple
        const instance = new Tone[definition.toneClass](paramsForInstance);
        // For effects like Filter that might have complex objects (e.g. frequency as Signal), ensure `value` is set
        if (definition.params) {
            definition.params.forEach(pDef => {
                let val = paramsForInstance;
                const keys = pDef.key.split('.');
                let found = true;
                for(const k of keys) { if(val && typeof val === 'object' && k in val) val = val[k]; else {found = false; break;} }

                if(found && val !== undefined && instance[keys[0]] && typeof instance[keys[0]].value !== 'undefined' && keys.length === 1 && typeof val !== 'object'){
                     // Handle simple top-level signal parameters by setting their '.value'
                     try { instance[keys[0]].value = val; } catch (e) { /* ignore if it fails, already set or not a signal */ }
                }
            });
        }
        return instance;
    } catch (e) {
        console.warn(`[EffectsRegistry createEffectInstance] Initial instantiation for Tone.${definition.toneClass} with params object failed:`, e.message, ". Attempting parameter-by-parameter setting.");
        try {
            const instance = new Tone[definition.toneClass](); // Instantiate with defaults first
            if (definition.params) {
                definition.params.forEach(pDef => {
                    let valToSet = paramsForInstance;
                    const keys = pDef.key.split('.');
                    let found = true;
                    for(const k of keys) { if(valToSet && typeof valToSet === 'object' && k in valToSet) valToSet = valToSet[k]; else {found = false; break;} }

                    if (found && valToSet !== undefined) {
                        try {
                            // Attempt to set using Tone's .set() for path traversal if available on the instance
                            if (typeof instance.set === 'function') {
                                instance.set({ [pDef.key]: valToSet });
                            } else { // Manual path traversal if .set is not on top-level instance
                                let target = instance;
                                for (let i = 0; i < keys.length - 1; i++) {
                                    target = target[keys[i]];
                                }
                                if (target && typeof target[keys[keys.length - 1]] !== 'undefined') {
                                     if (target[keys[keys.length-1]] && typeof target[keys[keys.length-1]].value !== 'undefined' && typeof valToSet !== 'object') {
                                        target[keys[keys.length-1]].value = valToSet; // For Signal-like parameters
                                    } else {
                                        target[keys[keys.length-1]] = valToSet;
                                    }
                                }
                            }
                        } catch (setErr) {
                             console.warn(`[EffectsRegistry createEffectInstance] Failed to set param ${pDef.key} to ${valToSet} for ${definition.toneClass}: ${setErr.message}`);
                        }
                    }
                });
            }
            return instance;
        } catch (e2) {
            console.error(`[EffectsRegistry createEffectInstance] CRITICAL: Fallback instantiation for Tone.${definition.toneClass} also failed:`, e2.message, ". Params attempted:", JSON.parse(JSON.stringify(paramsForInstance)));
            return null;
        }
    }
}

export function getEffectDefaultParams(effectType) {
    const definition = AVAILABLE_EFFECTS[effectType];
    if (!definition || !definition.params || !Array.isArray(definition.params)) {
        if (!definition) console.warn(`[EffectsRegistry getEffectDefaultParams] No definition found for effect type: ${effectType}`);
        return {};
    }
    const defaults = {};
    definition.params.forEach(pDef => {
        const keys = pDef.key.split('.');
        let currentLevel = defaults;
        keys.forEach((key, index) => {
            if (index === keys.length - 1) {
                currentLevel[key] = pDef.defaultValue;
            } else {
                if (!currentLevel[key] || typeof currentLevel[key] !== 'object') {
                     currentLevel[key] = {};
                }
                currentLevel = currentLevel[key];
            }
        });
    });
    return defaults;
}

export function getEffectParamDefinitions(effectType) {
    const definition = AVAILABLE_EFFECTS[effectType];
    if (!definition) {
        console.warn(`[EffectsRegistry getEffectParamDefinitions] No definition found for effect type: ${effectType}`);
        return [];
    }
    return definition.params || [];
}
