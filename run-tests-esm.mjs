import { build } from 'esbuild';
import fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const mockTone = {
    context: { rawContext: { decodeAudioData: () => Promise.resolve({}) }, state: 'running', resume: () => Promise.resolve(), currentTime: 0 },
    Transport: { position: '0:0:0', seconds: 0, bpm: { value: 120 }, stop: () => {}, cancel: () => {}, scheduleOnce: (fn, time) => 1, clear: (id) => {} },
    dbToGain: (db) => Math.pow(10, db / 20),
    gainToDb: (gain) => 20 * Math.log10(gain),
    start: () => Promise.resolve(), loaded: true,
    Player: class Player { constructor() { this.loaded = true; this.volume = { value: 0 }; this.playbackRate = 1; } toDestination() { return this; } connect() { return this; } load() { return Promise.resolve(this); } start() {} stop() {} disconnect() {} dispose() {} },
    Sampler: class Sampler { constructor() { this.loaded = true; this.volume = { value: 0 }; } toDestination() { return this; } connect() { return this; } add() { return this; } releaseAll() {} dispose() {} },
    MembraneSynth: class {}, NoiseSynth: class {}, Synth: class {}, PolySynth: class {}, FMSynth: class {}, AMSynth: class {}, MonoSynth: class {},
    PitchShift: class {}, Reverb: class {}, Delay: class {}, Chorus: class {}, Phaser: class {}, Tremolo: class {}, EQ3: class {}, Compressor: class {}, Limiter: class {}, Gate: class {},
    Filter: class {}, Autopanner: class {}, BitCrusher: class {}, Chebyshev: class {}, Distortion: class {}, FeedbackDelay: class {}, Freeverb: class {}, JCReverb: class {},
    PingPongDelay: class {}, Select: class {}, Signal: class {}, Spectrum: class {}, Waveform: class {},
    Meter: class { getValue() { return -60; } toDestination() { return this; } connect() { return this; } dispose() {} },
    Gain: class { constructor(val) { this.gain = { value: val || 1, rampTo: () => {} }; } connect() { return this; } toDestination() { return this; } dispose() {} },
    UserMedia: class { open() { return Promise.resolve(this); } close() { return Promise.resolve(); } connect() { return this; } }
};
globalThis.Tone = mockTone;
globalThis.window = { AudioContext: class {}, prompt: () => null, confirm: () => true, addEventListener: () => {}, removeEventListener: () => {} };
globalThis.document = { addEventListener: () => {}, removeEventListener: () => {}, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ addEventListener: () => {}, appendChild: () => {} }), body: { appendChild: () => {} } };
Object.defineProperty(globalThis, 'navigator', { value: { mediaDevices: { getUserMedia: () => Promise.resolve({}) }, userAgent: 'Node.js Test' }, writable: true, configurable: true });
globalThis.console = console;
globalThis.require = require;
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} };
globalThis.fetch = () => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) });
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 16);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

const constantsContent = fs.readFileSync('./js/constants.js', 'utf8');
const versionMatch = constantsContent.match(/export\s+const\s+APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
globalThis.APP_VERSION = versionMatch ? versionMatch[1] : '2.262.0';

const result = await build({
    entryPoints: ['./js/tests.js'],
    bundle: true,
    format: 'iife',
    platform: 'node',
    target: 'es2022',
    write: false
});

const ESM_URL = new URL(import.meta.url).href;
const code = result.outputFiles[0].text;
const patchedCode = code.replaceAll('import.meta.url', JSON.stringify(ESM_URL));
const fn = new Function('globalThis', patchedCode);
fn(globalThis);

if (globalThis.TestRunner) {
    const results = await globalThis.TestRunner.runAll();
    console.log(`\nTest Results: ${results.passed} passed, ${results.failed} failed`);
    process.exit(results.failed > 0 ? 1 : 0);
} else {
    console.error('[TestRunner] No TestRunner instance found');
    process.exit(1);
}
