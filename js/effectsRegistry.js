// js/effectsRegistry.js - Definitions for modular effects

export const AVAILABLE_EFFECTS = {
    // EffectID (as used in Tone.js constructor if simple, or custom key)
    //  - displayName: User-friendly name
    //  - toneClass: The Tone.js class name (string, e.g., "Distortion")
    //  - params: Array of param definitions
    //      - key: Property key in Tone.js object (can be nested like 'filter.type')
    //      - label: UI Label
    //      - type: 'knob', 'select', 'toggle'
    //      - options (for select): [{value: 'val', text: 'Val'}] or array of strings
    //      - min, max, step, decimals, displaySuffix (for knob)
    //      - defaultValue: The initial value for the parameter

    AutoFilter: {
        displayName: 'Auto Filter',
        toneClass: 'AutoFilter',
        params: [
            { key: 'frequency', label: 'Speed', type: 'knob', min: 0.1, max: 10, step: 0.1, defaultValue: 2, decimals: 1, displaySuffix: 'Hz' },
            { key: 'baseFrequency', label: 'Base Freq', type: 'knob', min: 20, max: 2000, step: 10, defaultValue: 200, decimals: 0, displaySuffix: 'Hz' },
            { key: 'octaves', label: 'Octaves', type: 'knob', min: 1, max: 8, step: 0.1, defaultValue: 2.6, decimals: 1 },
            { key: 'depth', label: 'Depth', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 },
            { key: 'filter.type', label: 'Filt Type', type: 'select', options: ['lowpass', 'highpass', 'bandpass'], defaultValue: 'lowpass' },
        ]
    },
    AutoPanner: {
        displayName: 'Auto Panner',
        toneClass: 'AutoPanner',
        params: [
            { key: 'frequency', label: 'Speed', type: 'knob', min: 0.1, max: 10, step: 0.1, defaultValue: 2, decimals: 1, displaySuffix: 'Hz' },
            { key: 'depth', label: 'Depth', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 },
            { key: 'type', label: 'Waveform', type: 'select', options: ['sine', 'square', 'sawtooth', 'triangle'], defaultValue: 'sine' },
        ]
    },
    AutoWah: {
        displayName: 'Auto Wah',
        toneClass: 'AutoWah',
        params: [
            { key: 'baseFrequency', label: 'Base Freq', type: 'knob', min: 50, max: 1000, step: 10, defaultValue: 100, decimals: 0, displaySuffix: 'Hz' },
            { key: 'octaves', label: 'Octaves', type: 'knob', min: 1, max: 6, step: 0.1, defaultValue: 6, decimals: 1 },
            { key: 'sensitivity', label: 'Sensitivity', type: 'knob', min: -40, max: 0, step: 1, defaultValue: 0, decimals: 0, displaySuffix: 'dB' },
            { key: 'Q', label: 'Q', type: 'knob', min: 0.1, max: 10, step: 0.1, defaultValue: 2, decimals: 1 },
            { key: 'gain', label: 'Gain', type: 'knob', min: 1, max: 10, step: 0.1, defaultValue: 2, decimals: 1, displaySuffix: 'dB' }, // Tone.AutoWah gain is dB
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 },
            // Follower params might be too advanced for initial UI: follower: { attack: 0.01, release: 0.1 }
        ]
    },
    BitCrusher: {
        displayName: 'Bit Crusher',
        toneClass: 'BitCrusher',
        params: [
            { key: 'bits', label: 'Bits', type: 'knob', min: 1, max: 16, step: 1, defaultValue: 4, decimals: 0 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 },
        ]
    },
    Chebyshev: {
        displayName: 'Chebyshev',
        toneClass: 'Chebyshev',
        params: [
            { key: 'order', label: 'Order', type: 'knob', min: 1, max: 100, step: 1, defaultValue: 50, decimals: 0 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 },
            // oversample: "none" | "2x" | "4x"
        ]
    },
    Chorus: {
        displayName: 'Chorus',
        toneClass: 'Chorus',
        params: [
            { key: 'frequency', label: 'Speed', type: 'knob', min: 0.1, max: 10, step: 0.1, defaultValue: 1.5, decimals: 1, displaySuffix: 'Hz' },
            { key: 'delayTime', label: 'Delay', type: 'knob', min: 1, max: 20, step: 0.1, defaultValue: 3.5, decimals: 1, displaySuffix: 'ms' },
            { key: 'depth', label: 'Depth', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.7, decimals: 2 },
            { key: 'feedback', label: 'Feedback', type: 'knob', min: 0, max: 0.9, step: 0.01, defaultValue: 0.1, decimals: 2 },
            { key: 'spread', label: 'Spread', type: 'knob', min: 0, max: 180, step: 1, defaultValue: 180, decimals: 0, displaySuffix: '°' },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.5, decimals: 2 },
            { key: 'type', label: 'Waveform', type: 'select', options: ['sine', 'square', 'sawtooth', 'triangle'], defaultValue: 'sine' },
        ]
    },
    Distortion: {
        displayName: 'Distortion',
        toneClass: 'Distortion',
        params: [
            { key: 'distortion', label: 'Amount', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.4, decimals: 2 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 },
            // oversample: "none" | "2x" | "4x"
        ]
    },
    FeedbackDelay: {
        displayName: 'Feedback Delay',
        toneClass: 'FeedbackDelay',
        params: [
            { key: 'delayTime', label: 'Time', type: 'knob', min: 0.01, max: 1, step: 0.01, defaultValue: 0.25, decimals: 2, displaySuffix: 's' },
            { key: 'feedback', label: 'Feedback', type: 'knob', min: 0, max: 0.99, step: 0.01, defaultValue: 0.5, decimals: 2 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.5, decimals: 2 },
        ]
    },
    Freeverb: {
        displayName: 'Freeverb',
        toneClass: 'Freeverb',
        params: [
            { key: 'roomSize', label: 'Room Size', type: 'knob', min: 0.1, max: 0.9, step: 0.01, defaultValue: 0.7, decimals: 2 },
            { key: 'dampening', label: 'Dampening', type: 'knob', min: 100, max: 10000, step: 100, defaultValue: 3000, decimals: 0, displaySuffix: 'Hz' },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.5, decimals: 2 },
        ]
    },
    FrequencyShifter: {
        displayName: 'Freq Shifter',
        toneClass: 'FrequencyShifter',
        params: [
            { key: 'frequency', label: 'Shift Amt', type: 'knob', min: -200, max: 200, step: 1, defaultValue: 0, decimals: 0, displaySuffix: 'Hz' },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 },
        ]
    },
    JCReverb: { // Simpler reverb
        displayName: 'JC Reverb',
        toneClass: 'JCReverb',
        params: [
            { key: 'roomSize', label: 'Room Size', type: 'knob', min: 0.1, max: 0.9, step: 0.01, defaultValue: 0.5, decimals: 2 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.5, decimals: 2 },
        ]
    },
    Phaser: {
        displayName: 'Phaser',
        toneClass: 'Phaser',
        params: [
            { key: 'frequency', label: 'Speed', type: 'knob', min: 0.1, max: 10, step: 0.1, defaultValue: 0.5, decimals: 1, displaySuffix: 'Hz' },
            { key: 'octaves', label: 'Octaves', type: 'knob', min: 1, max: 8, step: 0.1, defaultValue: 3, decimals: 1 },
            { key: 'stages', label: 'Stages', type: 'knob', min: 1, max: 12, step: 1, defaultValue: 10, decimals: 0 },
            { key: 'Q', label: 'Q', type: 'knob', min: 0.1, max: 20, step: 0.1, defaultValue: 10, decimals: 1 },
            { key: 'baseFrequency', label: 'Base Freq', type: 'knob', min: 100, max: 1500, step: 10, defaultValue: 350, decimals: 0, displaySuffix: 'Hz' },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.5, decimals: 2 },
        ]
    },
    PingPongDelay: {
        displayName: 'Ping Pong Delay',
        toneClass: 'PingPongDelay',
        params: [
            { key: 'delayTime', label: 'Time', type: 'knob', min: 0.01, max: 1, step: 0.01, defaultValue: 0.25, decimals: 2, displaySuffix: 's' },
            { key: 'feedback', label: 'Feedback', type: 'knob', min: 0, max: 0.99, step: 0.01, defaultValue: 0.2, decimals: 2 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.5, decimals: 2 },
        ]
    },
    PitchShift: {
        displayName: 'Pitch Shift',
        toneClass: 'PitchShift',
        params: [
            { key: 'pitch', label: 'Pitch', type: 'knob', min: -24, max: 24, step: 1, defaultValue: 0, decimals: 0, displaySuffix: 'st' },
            { key: 'windowSize', label: 'Window', type: 'knob', min: 0.03, max: 0.1, step: 0.001, defaultValue: 0.1, decimals: 3, displaySuffix: 's' },
            { key: 'feedback', label: 'Feedback', type: 'knob', min: 0, max: 0.9, step: 0.01, defaultValue: 0, decimals: 2 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 },
        ]
    },
    Reverb: { // This is Tone.Reverb which is an alias for Freeverb, using different param names in docs.
        displayName: 'Reverb (Algorithmic)',
        toneClass: 'Reverb', // Tone.Reverb in library, uses Freeverb internally.
        params: [
            { key: 'decay', label: 'Decay', type: 'knob', min: 0.1, max: 10, step: 0.1, defaultValue: 1.5, decimals: 1, displaySuffix: 's' },
            { key: 'preDelay', label: 'PreDelay', type: 'knob', min: 0, max: 0.1, step: 0.001, defaultValue: 0.01, decimals: 3, displaySuffix: 's' },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.5, decimals: 2 },
        ]
    },
    StereoWidener: {
        displayName: 'Stereo Widener',
        toneClass: 'StereoWidener',
        params: [
            { key: 'width', label: 'Width', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.5, decimals: 2 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 },
        ]
    },
    Tremolo: {
        displayName: 'Tremolo',
        toneClass: 'Tremolo',
        params: [
            { key: 'frequency', label: 'Speed', type: 'knob', min: 0.1, max: 20, step: 0.1, defaultValue: 10, decimals: 1, displaySuffix: 'Hz' },
            { key: 'depth', label: 'Depth', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.5, decimals: 2 },
            { key: 'spread', label: 'Spread', type: 'knob', min: 0, max: 180, step: 1, defaultValue: 180, decimals: 0, displaySuffix: '°' },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 },
            { key: 'type', label: 'Waveform', type: 'select', options: ['sine', 'square', 'sawtooth', 'triangle'], defaultValue: 'sine' },
        ]
    },
    Vibrato: {
        displayName: 'Vibrato',
        toneClass: 'Vibrato',
        params: [
            { key: 'maxDelay', label: 'Max Delay', type: 'knob', min: 0.001, max: 0.01, step: 0.0005, defaultValue: 0.005, decimals: 4, displaySuffix: 's' },
            { key: 'frequency', label: 'Speed', type: 'knob', min: 0.1, max: 20, step: 0.1, defaultValue: 5, decimals: 1, displaySuffix: 'Hz' },
            { key: 'depth', label: 'Depth', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 0.1, decimals: 2 },
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 },
            { key: 'type', label: 'Waveform', type: 'select', options: ['sine', 'square', 'sawtooth', 'triangle'], defaultValue: 'sine' },
        ]
    },
    // Dynamics
    Compressor: {
        displayName: 'Compressor',
        toneClass: 'Compressor',
        params: [
            { key: 'threshold', label: 'Threshold', type: 'knob', min: -60, max: 0, step: 1, defaultValue: -24, decimals: 0, displaySuffix: 'dB' },
            { key: 'ratio', label: 'Ratio', type: 'knob', min: 1, max: 20, step: 0.1, defaultValue: 12, decimals: 1 },
            { key: 'knee', label: 'Knee', type: 'knob', min: 0, max: 40, step: 1, defaultValue: 30, decimals: 0, displaySuffix: 'dB' },
            { key: 'attack', label: 'Attack', type: 'knob', min: 0.001, max: 0.2, step: 0.001, defaultValue: 0.003, decimals: 3, displaySuffix: 's' },
            { key: 'release', label: 'Release', type: 'knob', min: 0.01, max: 0.5, step: 0.001, defaultValue: 0.25, decimals: 3, displaySuffix: 's' },
        ]
    },
    EQ3: {
        displayName: '3-Band EQ',
        toneClass: 'EQ3',
        params: [
            { key: 'low', label: 'Low Gain', type: 'knob', min: -24, max: 12, step: 0.5, defaultValue: 0, decimals: 1, displaySuffix: 'dB' },
            { key: 'mid', label: 'Mid Gain', type: 'knob', min: -24, max: 12, step: 0.5, defaultValue: 0, decimals: 1, displaySuffix: 'dB' },
            { key: 'high', label: 'High Gain', type: 'knob', min: -24, max: 12, step: 0.5, defaultValue: 0, decimals: 1, displaySuffix: 'dB' },
            { key: 'lowFrequency', label: 'Low Freq', type: 'knob', min: 50, max: 800, step: 10, defaultValue: 400, decimals: 0, displaySuffix: 'Hz' },
            { key: 'highFrequency', label: 'High Freq', type: 'knob', min: 800, max: 10000, step: 100, defaultValue: 2500, decimals: 0, displaySuffix: 'Hz' },
        ]
    },
    Filter: {
        displayName: 'Filter',
        toneClass: 'Filter',
        params: [
            { key: 'type', label: 'Type', type: 'select', options: ['lowpass', 'highpass', 'bandpass', 'lowshelf', 'highshelf', 'notch', 'allpass', 'peaking'], defaultValue: 'lowpass' },
            { key: 'frequency', label: 'Frequency', type: 'knob', min: 20, max: 20000, step: 10, defaultValue: 1000, decimals: 0, displaySuffix: 'Hz' }, // Log scale would be better if possible
            { key: 'rolloff', label: 'Rolloff', type: 'select', options: [-12, -24, -48, -96], defaultValue: -12 },
            { key: 'Q', label: 'Q', type: 'knob', min: 0.1, max: 20, step: 0.1, defaultValue: 1, decimals: 1 },
            { key: 'gain', label: 'Gain (Shelf/Peak)', type: 'knob', min: -24, max: 24, step: 0.5, defaultValue: 0, decimals: 1, displaySuffix: 'dB' },
        ]
    },
    Gate: {
        displayName: 'Gate',
        toneClass: 'Gate', // Note: Tone.Gate is a simple noise gate
        params: [
            { key: 'threshold', label: 'Threshold', type: 'knob', min: -70, max: 0, step: 1, defaultValue: -40, decimals: 0, displaySuffix: 'dBFS' },
            { key: 'smoothing', label: 'Smoothing', type: 'knob', min: 0, max: 0.9, step: 0.01, defaultValue: 0.1, decimals: 2 },
            // Attack/Release for Gate are part of the envelope follower, not direct params like Compressor
        ]
    },
    Limiter: {
        displayName: 'Limiter',
        toneClass: 'Limiter',
        params: [
            { key: 'threshold', label: 'Threshold', type: 'knob', min: -60, max: 0, step: 1, defaultValue: -12, decimals: 0, displaySuffix: 'dB' },
        ]
    },
    Mono: { // Utility, no params to control typically, but can be added to chain
        displayName: 'Mono',
        toneClass: 'Mono',
        params: []
    },
    // MidSideCompressor and MultibandCompressor are very complex.
    // For now, let's skip UI for them or provide only a wet/dry or enable/disable.
    // Placeholder for if you want to tackle them later:
    /*
    MidSideCompressor: {
        displayName: 'Mid/Side Compressor',
        toneClass: 'MidSideCompressor',
        params: [ // Highly simplified
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 },
        ]
    },
    MultibandCompressor: {
        displayName: 'Multiband Compressor',
        toneClass: 'MultibandCompressor',
        params: [ // Highly simplified
            { key: 'wet', label: 'Wet', type: 'knob', min: 0, max: 1, step: 0.01, defaultValue: 1, decimals: 2 },
        ]
    }
    */
};

export function createEffectInstance(effectType, initialParams = {}) {
    const definition = AVAILABLE_EFFECTS[effectType];
    if (!definition || !Tone[definition.toneClass]) {
        console.error(`Effect type "${effectType}" or Tone class "${definition?.toneClass}" not found.`);
        return null;
    }

    // Merge default params from definition with any provided initialParams
    const paramsForInstance = {};
    if (definition.params) {
        definition.params.forEach(pDef => {
            // Handle nested keys like 'filter.type'
            const keys = pDef.key.split('.');
            let currentLevel = paramsForInstance;
            keys.forEach((key, index) => {
                if (index === keys.length - 1) { // Last key
                    currentLevel[key] = initialParams[pDef.key] !== undefined ? initialParams[pDef.key] : pDef.defaultValue;
                } else {
                    if (!currentLevel[key]) currentLevel[key] = {};
                    currentLevel = currentLevel[key];
                }
            });
        });
    }
    
    // Some Tone.js effects take a single object, others take individual args.
    // For simplicity, we'll assume most modern ones take an object.
    // If an effect needs specific constructor args, this needs to be handled.
    // For now, we pass the merged params object.
    try {
        const instance = new Tone[definition.toneClass](paramsForInstance);
        // Apply wet separately if it's a common param and exists
        if (initialParams.wet !== undefined && typeof instance.wet !== 'undefined') {
            instance.wet.value = initialParams.wet;
        }
        return instance;
    } catch (e) {
        console.error(`Error instantiating Tone.${definition.toneClass} with params:`, paramsForInstance, e);
        // Fallback: try instantiating without params if constructor supports it
        try {
            const instance = new Tone[definition.toneClass]();
             // Manually set params if fallback instantiation worked
            for (const key in paramsForInstance) {
                if (Object.hasOwnProperty.call(paramsForInstance, key)) {
                    const value = paramsForInstance[key];
                    const keys = key.split('.');
                    let target = instance;
                    for (let i = 0; i < keys.length - 1; i++) {
                        target = target[keys[i]];
                        if (!target) break;
                    }
                    if (target && typeof target[keys[keys.length-1]] !== 'undefined') {
                         if (target[keys[keys.length-1]] && typeof target[keys[keys.length-1]].value !== 'undefined') {
                            target[keys[keys.length-1]].value = value;
                         } else {
                            target[keys[keys.length-1]] = value;
                         }
                    }
                }
            }
            if (initialParams.wet !== undefined && typeof instance.wet !== 'undefined') {
                instance.wet.value = initialParams.wet;
            }
            return instance;
        } catch (e2) {
            console.error(`Fallback instantiation for Tone.${definition.toneClass} also failed:`, e2);
            return null;
        }
    }
}

export function getEffectDefaultParams(effectType) {
    const definition = AVAILABLE_EFFECTS[effectType];
    if (!definition) return {};
    const defaults = {};
    if (definition.params) {
        definition.params.forEach(pDef => {
            defaults[pDef.key] = pDef.defaultValue;
        });
    }
    return defaults;
}

export function getEffectParamDefinitions(effectType) {
    return AVAILABLE_EFFECTS[effectType]?.params || [];
}
