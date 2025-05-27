// js/audio.js - Audio Engine, Tone.js interactions, Sample Loading
import * as Constants from './constants.js';
import { showNotification } from './utils.js';
import { createEffectInstance, getEffectDefaultParams } from './effectsRegistry.js'; // NEW

let audioContextInitialized = false;
window.masterEffectsBusInput = null; // Input to the master chain
window.masterEffectsChain = []; // Array of {id, type, toneNode, params} for master
let masterGainNode = null; // Final gain before Tone.getDestination()

export async function initAudioContextAndMasterMeter(isUserInitiated = false) {
    if (audioContextInitialized && Tone.context.state === 'running') {
        // Ensure master bus is set up if context is already running
        if (!window.masterEffectsBusInput) setupMasterBus();
        return true;
    }
    // ... (rest of the function mostly as before) ...
    try {
        await Tone.start();
        if (Tone.context.state === 'running') {
            setupMasterBus(); // Setup master bus after Tone.start()

            if (!window.masterMeter && masterGainNode) { // Meter from masterGainNode
                window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
                masterGainNode.connect(window.masterMeter);
                // Master meter does not connect to destination, it's just for visuals.
            }
            audioContextInitialized = true;
            return true;
        } else { /* ... error handling ... */
            if (isUserInitiated) {
                showNotification("AudioContext could not be started even with user interaction. Please check browser permissions or try another interaction.", 5000);
            } else {
                showNotification("Audio system needs a user interaction (like clicking Play) to start.", 4000);
            }
            audioContextInitialized = false;
            return false;
        }
    } catch (error) { /* ... error handling ... */
        console.error("[Audio] Error during Tone.start() or meter setup:", error);
        showNotification("Error initializing audio. Please check permissions and refresh.", 4000);
        audioContextInitialized = false;
        return false;
    }
}

function setupMasterBus() {
    if (window.masterEffectsBusInput && !window.masterEffectsBusInput.disposed) {
        // Already setup
        return;
    }
    console.log("[Audio] Setting up Master Bus.");
    // Create a gain node to act as the input point for all tracks feeding into the master effects
    window.masterEffectsBusInput = new Tone.Gain();
    masterGainNode = new Tone.Gain(); // This is the final gain before Destination

    // Initialize masterEffectsChain from saved state if available (e.g., during project load)
    // For now, assume it's empty or populated by state.js reconstructDAW
    rebuildMasterEffectChain(); // Connects masterEffectsBusInput -> effects -> masterGainNode -> Destination
}

export function rebuildMasterEffectChain() {
    if (!window.masterEffectsBusInput || !masterGainNode) {
        console.warn("[Audio] Master bus input or master gain node not initialized. Cannot rebuild chain.");
        return;
    }
    console.log("[Audio] Rebuilding Master Effect Chain.");

    // Disconnect masterEffectsBusInput from the current chain start
    window.masterEffectsBusInput.disconnect();

    let currentSource = window.masterEffectsBusInput;
    window.masterEffectsChain.forEach(effect => {
        if (effect.toneNode && !effect.toneNode.disposed) {
            currentSource.connect(effect.toneNode);
            currentSource = effect.toneNode;
        }
    });

    // Connect the last effect (or masterEffectsBusInput if no effects) to masterGainNode
    currentSource.connect(masterGainNode);
    masterGainNode.connect(Tone.getDestination()); // Final output

    // Reconnect meter if it exists
    if (window.masterMeter && masterGainNode && !window.masterMeter.disposed) {
        masterGainNode.disconnect(window.masterMeter); // Disconnect old
        masterGainNode.connect(window.masterMeter);   // Reconnect new
    } else if (!window.masterMeter && masterGainNode) {
        window.masterMeter = new Tone.Meter({ smoothing: 0.8 });
        masterGainNode.connect(window.masterMeter);
    }

    console.log(`[Audio] Master chain rebuilt. ${window.masterEffectsChain.length} effects. Final output to Destination.`);
}

export function addMasterEffect(effectType) {
    // ... (similar to track.addEffect, but for window.masterEffectsChain and calls rebuildMasterEffectChain)
    if (typeof window.captureStateForUndo === 'function') {
        window.captureStateForUndo(`Add ${effectType} to Master`);
    }
    const defaultParams = getEffectDefaultParams(effectType);
    const toneNode = createEffectInstance(effectType, defaultParams);

    if (toneNode) {
        const effectId = `mastereffect_${effectType}_${Date.now()}`;
        window.masterEffectsChain.push({
            id: effectId,
            type: effectType,
            toneNode: toneNode,
            params: { ...defaultParams }
        });
        rebuildMasterEffectChain();
        return effectId;
    }
    return null;
}
export function removeMasterEffect(effectId) {
    // ... (similar to track.removeEffect)
    const effectIndex = window.masterEffectsChain.findIndex(e => e.id === effectId);
    if (effectIndex > -1) {
        const effectToRemove = window.masterEffectsChain[effectIndex];
        if (typeof window.captureStateForUndo === 'function') {
            window.captureStateForUndo(`Remove ${effectToRemove.type} from Master`);
        }
        if (effectToRemove.toneNode && !effectToRemove.toneNode.disposed) {
            effectToRemove.toneNode.dispose();
        }
        window.masterEffectsChain.splice(effectIndex, 1);
        rebuildMasterEffectChain();
    }
}
export function updateMasterEffectParam(effectId, paramName, value) {
    // ... (similar to track.updateEffectParam)
     const effect = window.masterEffectsChain.find(e => e.id === effectId);
    if (effect && effect.toneNode) {
        effect.params[paramName] = value;
        try {
            let targetParam = effect.toneNode[paramName];
            if (targetParam && typeof targetParam.value !== 'undefined') {
                if (typeof targetParam.rampTo === 'function') targetParam.rampTo(value, 0.05);
                else targetParam.value = value;
            } else if (typeof effect.toneNode[paramName] !== 'undefined') {
                effect.toneNode[paramName] = value;
            } else {
                const Hparam = {}; Hparam[paramName] = value; effect.toneNode.set(Hparam);
            }
        } catch (err) { console.error(`[Audio] Error updating param ${paramName} for master effect ${effect.type}:`, err); }
    }
}
export function reorderMasterEffect(effectId, newIndex) {
    // ... (similar to track.reorderEffect)
    const oldIndex = window.masterEffectsChain.findIndex(e => e.id === effectId);
    if (oldIndex === -1 || oldIndex === newIndex || newIndex < 0 || newIndex >= window.masterEffectsChain.length) {
        return;
    }
    if (typeof window.captureStateForUndo === 'function') {
        window.captureStateForUndo(`Reorder Master effect`);
    }
    const [effectToMove] = window.masterEffectsChain.splice(oldIndex, 1);
    window.masterEffectsChain.splice(newIndex, 0, effectToMove);
    rebuildMasterEffectChain();
}


// Update Metering Logic in updateMeters
export function updateMeters(masterMeterVisualElement, masterMeterBarVisualElement, mixerMasterMeterVisualElement, tracks) { // masterMeter (Tone.Meter) is now global or passed if needed
    if (Tone.context.state !== 'running' || !audioContextInitialized) {
        return;
    }

    // Master Meter (Main UI and Mixer UI)
    if (window.masterMeter && typeof window.masterMeter.getValue === 'function') {
        const masterLevelValue = window.masterMeter.getValue();
        const level = Tone.dbToGain(masterLevelValue);
        const isClipping = masterLevelValue > -0.1;

        if (masterMeterBarVisualElement) {
            masterMeterBarVisualElement.style.width = `${Math.min(100, level * 100)}%`;
            masterMeterBarVisualElement.classList.toggle('clipping', isClipping);
        }

        const mixerWindow = window.openWindows ? window.openWindows['mixer'] : null;
        if (mixerMasterMeterVisualElement && mixerWindow && mixerWindow.element && !mixerWindow.isMinimized) {
            mixerMasterMeterVisualElement.style.width = `${Math.min(100, level * 100)}%`;
            mixerMasterMeterVisualElement.classList.toggle('clipping', isClipping);
        }
    }


    // Track Meters (Inspector and Mixer)
    (tracks || []).forEach(track => {
        if (track && track.trackMeter && typeof track.trackMeter.getValue === 'function') {
            const meterValue = track.trackMeter.getValue();
            const level = Tone.dbToGain(meterValue);
            const isClipping = meterValue > -0.1;

            if (track.inspectorWindow && track.inspectorWindow.element && !track.inspectorWindow.isMinimized) {
                const inspectorMeterBar = track.inspectorWindow.element.querySelector(`#trackMeterBar-${track.id}`);
                if (inspectorMeterBar) {
                    inspectorMeterBar.style.width = `${Math.min(100, level * 100)}%`;
                    inspectorMeterBar.classList.toggle('clipping', isClipping);
                }
            }

            const mixerWindow = window.openWindows ? window.openWindows['mixer'] : null;
            if (mixerWindow && mixerWindow.element && !mixerWindow.isMinimized) {
                const mixerMeterBar = mixerWindow.element.querySelector(`#mixerTrackMeterBar-${track.id}`);
                 if (mixerMeterBar) {
                    mixerMeterBar.style.width = `${Math.min(100, level * 100)}%`;
                    mixerMeterBar.classList.toggle('clipping', isClipping);
                }
            }
        }
    });
}


// loadSoundFromBrowserToTarget: Ensure Player instances in DrumSampler/Sampler connect to the track's effect chain start.
// This is mostly handled by track.rebuildEffectChain when samples are loaded or track resources are initialized.
// The critical part is that track.fullyInitializeAudioResources() should call rebuildEffectChain().

// playSlicePreview / playDrumSamplerPadPreview
// For polyphonic slice previews, the temporary player should connect to the start of the *track's* effect chain,
// not directly to Tone.getDestination().
export async function playSlicePreview(trackId, sliceIndex, velocity = 0.7, additionalPitchShiftInSemitones = 0) {
    // ... (initial checks as before) ...
    const audioReady = await initAudioContextAndMasterMeter(true);
    if (!audioReady) { showNotification("Audio not ready for preview.", 2000); return; }

    const tracksArray = typeof window.getTracks === 'function' ? window.getTracks() : window.tracks;
    const track = tracksArray.find(t => t.id === trackId);

    if (!track || track.type !== 'Sampler' || !track.audioBuffer || !track.audioBuffer.loaded || !track.slices[sliceIndex]) {
        console.warn(`[Audio] playSlicePreview: Conditions not met for track ${trackId}, slice ${sliceIndex}.`);
        return;
    }
    const sliceData = track.slices[sliceIndex];
    if (sliceData.duration <= 0) { /* ... */ return; }
    const time = Tone.now();
    const totalPitchShift = (sliceData.pitchShift || 0) + additionalPitchShiftInSemitones;
    const playbackRate = Math.pow(2, totalPitchShift / 12);
    let playDuration = sliceData.duration / playbackRate;
    if (sliceData.loop) playDuration = Math.min(playDuration, 2);

    const firstEffectNodeInTrack = track.activeEffects.length > 0 ? track.activeEffects[0].toneNode : track.gainNode;
    const actualDestination = firstEffectNodeInTrack || (window.masterEffectsBusInput || Tone.getDestination());


    if (!track.slicerIsPolyphonic) {
        // ... (mono logic as before, but ensure slicerMonoPlayer's output ultimately goes through track's chain)
        // This is handled if setupSlicerMonoNodes connects to the dynamic chain start correctly.
        // Check Track.js -> setupSlicerMonoNodes -> rebuildEffectChain path.
        // The current setup in Track.js for slicerMonoPlayer seems to chain it correctly before the track's main gainNode.
        // So its output will go through the track's effects if it's connected to the start of the dynamic effect chain.
        // For preview, the slicerMonoGain connects to `actualDestination` if we want it to bypass the main track effects for preview,
        // or it connects to the start of the track's effect chain if we want preview WITH effects.
        // Let's assume preview WITH effects for consistency with polyphonic.
        // The Track.js `setupSlicerMonoNodes` connects the mono player chain to the first effect node OR track gain node.
        // So it should already be correct.
        if (!track.slicerMonoPlayer || track.slicerMonoPlayer.disposed) {
            track.setupSlicerMonoNodes(); // This calls rebuildEffectChain
            if(!track.slicerMonoPlayer) { console.warn("[Audio] Mono player not set up for preview after setupSlicerMonoNodes."); return; }
             if(track.audioBuffer && track.audioBuffer.loaded) track.slicerMonoPlayer.buffer = track.audioBuffer; // Ensure buffer is set after setup
        }
        const player = track.slicerMonoPlayer;
        const env = track.slicerMonoEnvelope;
        const gain = track.slicerMonoGain;
        // ... (rest of mono player setup and start/stop)
        if (player.state === 'started') player.stop(time);
        if (env.getValueAtTime(time) > 0.001) env.triggerRelease(time);

        player.buffer = track.audioBuffer; // ensure buffer
        env.set(sliceData.envelope);
        gain.gain.value = Tone.dbToGain(-6) * sliceData.volume * velocity;
        player.playbackRate = playbackRate;
        player.reverse = sliceData.reverse;
        player.loop = sliceData.loop;
        player.loopStart = sliceData.offset;
        player.loopEnd = sliceData.offset + sliceData.duration;

        player.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
        env.triggerAttack(time);
        if (!sliceData.loop) {
            const releaseTime = time + playDuration - (sliceData.envelope.release || 0.1);
            env.triggerRelease(Math.max(time, releaseTime));
        }

    } else { // Polyphonic
        const tempPlayer = new Tone.Player(track.audioBuffer);
        const tempEnv = new Tone.AmplitudeEnvelope(sliceData.envelope);
        const tempGain = new Tone.Gain(Tone.dbToGain(-6) * sliceData.volume * velocity);

        tempPlayer.chain(tempEnv, tempGain, actualDestination); // Connect to track's effect chain start
        // ... (rest of tempPlayer setup and start/stop)
        tempPlayer.playbackRate = playbackRate;
        tempPlayer.reverse = sliceData.reverse;
        tempPlayer.loop = sliceData.loop;
        tempPlayer.loopStart = sliceData.offset;
        tempPlayer.loopEnd = sliceData.offset + sliceData.duration;

        tempPlayer.start(time, sliceData.offset, sliceData.loop ? undefined : playDuration);
        tempEnv.triggerAttack(time);
        if (!sliceData.loop) tempEnv.triggerRelease(time + playDuration * 0.95);

        Tone.Transport.scheduleOnce(() => {
            if (tempPlayer && !tempPlayer.disposed) { tempPlayer.stop(); tempPlayer.dispose(); }
            if (tempEnv && !tempEnv.disposed) tempEnv.dispose();
            if (tempGain && !tempGain.disposed) tempGain.dispose();
        }, time + playDuration + (sliceData.envelope.release || 0.1) + 0.2);
    }
}

// playDrumSamplerPadPreview: Player is already part of the track's chain.
// Ensure it's connected to the start of the effect chain in Track.js.
// This is handled by `track.rebuildEffectChain()` which is called by `fullyInitializeAudioResources`.

// ... (loadSampleFile, loadDrumSamplerPadFile, autoSliceSample, fetchSoundLibrary remain largely the same regarding their core logic)
// The key is that when new audio buffers are loaded and players are created/updated in Track.js,
// Track.rebuildEffectChain() should be called or implicitly run through fullyInitializeAudioResources.
// In Track.js, `loadDrumSamplerPadFile` creates a new Player and connects it to `destinationNode` which is
// `track.distortionNode` (old system) or `Tone.getDestination()`. This needs to be updated to connect to the
// start of the dynamic effect chain.
// This is now handled: `drumPadPlayers` in `Track.js` are reconnected in `rebuildEffectChain`.

// loadDrumSamplerPadFile from audio.js needs a slight modification in Track.js:
// When a new player is created for a drum pad, it should not connect directly to destination.
// Instead, its connection is managed by `rebuildEffectChain`.
// The `loadDrumSamplerPadFile` in `audio.js` calls `track.drumPadPlayers[padIndex] = new Tone.Player(...)`
// This player instance is then used by `track.rebuildEffectChain()`.
// The explicit `.connect(destinationNode)` in `loadDrumSamplerPadFile` within `audio.js` for `track.drumPadPlayers[padIndex]`
// should be removed, as `rebuildEffectChain` will handle its connection.
// However, `track.fullyInitializeAudioResources` calls `rebuildEffectChain` after pad players are set up,
// so the connection made inside `loadDrumSamplerPadFile` will be overridden by `rebuildEffectChain`.
// This is acceptable.

// The rest of audio.js (fetchSoundLibrary, loadSampleFile, autoSliceSample, getMimeTypeFromFilename)
// should not need major changes for the effect rack, as they deal with loading audio data,
// and the connection of that audio to the new effect chain is handled within Track.js.
