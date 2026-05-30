// test-runner/run-tests.js - Node.js test runner for SnugOS
// Runs tests without browser dependencies by mocking Tone.js

// Mock Tone.js
const mockTone = {
    context: {
        rawContext: {
            decodeAudioData: () => Promise.resolve({})
        },
        state: 'running',
        resume: () => Promise.resolve(),
        currentTime: 0
    },
    Transport: {
        position: '0:0:0',
        seconds: 0,
        bpm: { value: 120 },
        stop: () => {},
        cancel: () => {},
        scheduleOnce: (fn, time) => 1,
        clear: (id) => {}
    },
    dbToGain: (db) => Math.pow(10, db / 20),
    gainToDb: (gain) => 20 * Math.log10(gain),
    start: () => Promise.resolve(),
    loaded: true,
    Player: class Player {
        constructor() { this.loaded = true; }
        toDestination() { return this; }
        connect() { return this; }
        load() { return Promise.resolve(this); }
        start() {}
        stop() {}
        dispose() {}
    },
    Sampler: class Sampler {
        constructor() { this.loaded = true; }
        toDestination() { return this; }
        connect() { return this; }
        add() { return this; }
        releaseAll() {}
        dispose() {}
    },
    MembraneSynth: class {},
    NoiseSynth: class {},
    Synth: class {},
    PolySynth: class {},
    FMSynth: class {},
    AMSynth: class {},
    MonoSynth: class {},
    Sampler: class {},
    PitchShift: class {},
    Reverb: class {},
    Delay: class {},
    Chorus: class {},
    Phaser: class {},
    Tremolo: class {},
    EQ3: class {},
    Compressor: class {},
    Limiter: class {},
    Gate: class {},
    Filter: class {},
    Autopanner: class {},
    BitCrusher: class {},
    Chebyshev: class {},
    Distortion: class {},
    FeedbackDelay: class {},
    Freeverb: class {},
    JCReverb: class {},
    PingPongDelay: class {},
    Select: class {},
    Signal: class {},
    Spectrum: class {},
    Waveform: class {},
    Meter: class {
        getValue() { return -60; }
        toDestination() { return this; }
        connect() { return this; }
        dispose() {}
    },
    Gain: class {
        constructor(val) { this.gain = { value: val || 1, rampTo: () => {} }; }
        connect() { return this; }
        toDestination() { return this; }
        dispose() {}
    },
    UserMedia: class {
        open() { return Promise.resolve(this); }
        close() { return Promise.resolve(); }
        connect() { return this; }
        state = 'started';
    }
};

// Set up global mocks
global.Tone = mockTone;
global.window = {
    showNotification: (msg, dur) => console.log(`[Notification] ${msg}`),
    confirm: (msg) => true,
    prompt: (msg, def) => def || '',
    audioContext: mockTone.context
};
global.document = {
    getElementById: (id) => ({
        addEventListener: () => {},
        querySelector: () => null,
        classList: { add: () => {}, remove: () => {}, toggle: () => {} },
        style: {},
        textContent: '',
        value: '',
        checked: false,
        disabled: false
    }),
    createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        classList: { add: () => {}, remove: () => {}, toggle: () => {} },
        style: {},
        appendChild: () => {},
        removeChild: () => {},
        setAttribute: () => {},
        getAttribute: () => null,
        querySelector: () => null,
        querySelectorAll: () => []
    }),
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
};
global.navigator = {
    mediaDevices: {
        getUserMedia: () => Promise.resolve({})
    },
    userAgent: 'Node.js Test'
};
global.console = console;
global.require = require;
// Read APP_VERSION from constants.js (which uses ESM export)
const fs = require('fs');
const constantsContent = fs.readFileSync('./js/constants.js', 'utf8');
const versionMatch = constantsContent.match(/export\s+const\s+APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
global.APP_VERSION = versionMatch ? versionMatch[1] : '2.262.0';
global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {}
};

// Run tests - tests.js imports TestRunner from testRunner.js which handles its own test registration
async function runTests() {
    // First, import testRunner.js to get the TestRunner instance
    // Then set it on global so tests.js uses the same instance
    const { TestRunner } = await import('../js/testRunner.js');
    global.TestRunner = TestRunner;
    
    // Now import tests.js which will register tests to the shared TestRunner
    try {
        await import('../js/tests.js');
    } catch (error) {
        console.error('[TestRunner] Error loading tests:', error.message);
        process.exit(1);
    }
    
    // Run all registered tests
    const results = await TestRunner.runAll();
    process.exit(results.failed > 0 ? 1 : 0);
}

runTests();