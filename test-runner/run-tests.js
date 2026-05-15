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
    querySelectorAll: () => []
};
global.navigator = {
    mediaDevices: {
        getUserMedia: () => Promise.resolve({})
    },
    userAgent: 'Node.js Test'
};
global.console = console;

// Run tests
async function runTests() {
    const TestRunner = {
        tests: [],
        results: { passed: 0, failed: 0, errors: [] },
        
        test(name, fn) {
            this.tests.push({ name, fn });
        },
        
        assert(condition, message = 'Assertion failed') {
            if (!condition) throw new Error(message);
        },
        
        assertEqual(actual, expected, message = '') {
            if (actual !== expected) throw new Error(`${message} Expected ${expected}, got ${actual}`);
        },
        
        assertDeepEqual(actual, expected, message = '') {
            if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${message} Objects not equal`);
        },
        
        assertTruthy(value, message = 'Expected truthy') {
            if (!value) throw new Error(message);
        },
        
        assertFalsy(value, message = 'Expected falsy') {
            if (value) throw new Error(message);
        },
        
        assertThrows(fn, message = 'Expected to throw') {
            let threw = false;
            try { fn(); } catch (e) { threw = true; }
            if (!threw) throw new Error(message);
        },
        
        async runAll() {
            this.results = { passed: 0, failed: 0, errors: [] };
            const startTime = Date.now();
            
            console.log('[TestRunner] Running tests...\n');
            
            for (const test of this.tests) {
                try {
                    await test.fn(this);
                    this.results.passed++;
                    console.log(`✓ ${test.name}`);
                } catch (e) {
                    this.results.failed++;
                    this.results.errors.push({ name: test.name, error: e.message });
                    console.error(`✗ ${test.name}: ${e.message}`);
                }
            }
            
            const duration = (Date.now() - startTime).toFixed(0);
            console.log(`\n[TestRunner] ${this.results.passed} passed, ${this.results.failed} failed (${duration}ms)`);
            
            return this.results;
        }
    };
    
    global.TestRunner = TestRunner;
    
    // Import and run tests
    try {
        const testsModule = await import('../js/tests.js');
        const results = await TestRunner.runAll();
        process.exit(results.failed > 0 ? 1 : 0);
    } catch (error) {
        console.error('[TestRunner] Error loading tests:', error.message);
        process.exit(1);
    }
}

runTests();