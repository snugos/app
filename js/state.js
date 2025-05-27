// js/state.js - Application State Management
// ... (imports as before)
import { createEffectInstance, getEffectDefaultParams } from './effectsRegistry.js'; // NEW
import { rebuildMasterEffectChain, addMasterEffect } from './audio.js'; // NEW for master effects

// ... (getTracks, getTrackById, etc., as before) ...

export function gatherProjectData() {
    const projectData = {
        version: "5.6.0", // Incremented for modular effects
        globalSettings: {
            tempo: Tone.Transport.bpm.value,
            // Master Volume is now part of masterGainNode in audio.js, or could be a separate global param
            masterVolume: window.masterGainNode ? window.masterGainNode.gain.value : Tone.dbToGain(0), // Default to 0dB if node not ready
            activeMIDIInputId: window.activeMIDIInput ? window.activeMIDIInput.id : null,
            soloedTrackId: soloedTrackId,
            armedTrackId: armedTrackId,
            highestZIndex: window.highestZIndex,
        },
        // --- NEW: Master Effects ---
        masterEffects: window.masterEffectsChain.map(effect => ({
            id: effect.id,
            type: effect.type,
            params: JSON.parse(JSON.stringify(effect.params)) // Deep copy params
        })),
        // --- END NEW ---
        tracks: tracks.map(track => {
            const trackData = {
                // ... (id, type, name, mute, volume, sequence, sampler specific data as before)
                id: track.id, type: track.type, name: track.name,
                isMuted: track.isMuted,
                volume: track.previousVolumeBeforeMute, // This is track.gainNode.value essentially when not muted
                // OLD effects: JSON.parse(JSON.stringify(track.effects)),
                // --- NEW: Modular Effects ---
                activeEffects: track.activeEffects.map(effect => ({
                    id: effect.id,
                    type: effect.type,
                    params: JSON.parse(JSON.stringify(effect.params)) // Deep copy params
                })),
                // --- END NEW ---
                sequenceLength: track.sequenceLength,
                sequenceData: JSON.parse(JSON.stringify(track.sequenceData)),
                automation: JSON.parse(JSON.stringify(track.automation)),
                selectedSliceForEdit: track.selectedSliceForEdit,
                // ... other track specific props
                 waveformZoom: track.waveformZoom,
                waveformScrollOffset: track.waveformScrollOffset,
                slicerIsPolyphonic: track.slicerIsPolyphonic,
                selectedDrumPadForEdit: track.selectedDrumPadForEdit,
                instrumentSamplerIsPolyphonic: track.instrumentSamplerIsPolyphonic,
            };
             if (track.type === 'Synth') {
                trackData.synthEngineType = 'MonoSynth';
                trackData.synthParams = JSON.parse(JSON.stringify(track.synthParams));
            } else if (track.type === 'Sampler') {
                trackData.samplerAudioData = { /* ... */ fileName: track.originalFileName, audioBufferDataURL: track.audioBufferDataURL };
                trackData.slices = JSON.parse(JSON.stringify(track.slices));
            } else if (track.type === 'DrumSampler') {
                trackData.drumSamplerPads = track.drumSamplerPads.map(p => ({ /* ... */
                    originalFileName: p.originalFileName,
                    audioBufferDataURL: p.audioBufferDataURL,
                    volume: p.volume,
                    pitchShift: p.pitchShift,
                    envelope: JSON.parse(JSON.stringify(p.envelope))
                }));
            } else if (track.type === 'InstrumentSampler') {
                trackData.instrumentSamplerSettings = { /* ... */
                    originalFileName: track.instrumentSamplerSettings.originalFileName,
                    audioBufferDataURL: track.instrumentSamplerSettings.audioBufferDataURL,
                    rootNote: track.instrumentSamplerSettings.rootNote,
                    loop: track.instrumentSamplerSettings.loop,
                    loopStart: track.instrumentSamplerSettings.loopStart,
                    loopEnd: track.instrumentSamplerSettings.loopEnd,
                    envelope: JSON.parse(JSON.stringify(track.instrumentSamplerSettings.envelope)),
                };
            }
            return trackData;
        }),
        windowStates: Object.values(window.openWindows).map(win => { /* ... as before ... */
             if (!win || !win.element) return null;
            return {
                id: win.id, title: win.title,
                left: win.element.style.left, top: win.element.style.top,
                width: win.element.style.width, height: win.element.style.height,
                zIndex: parseInt(win.element.style.zIndex),
                isMinimized: win.isMinimized,
                initialContentKey: win.initialContentKey
            };
        }).filter(ws => ws !== null)
    };
    return projectData;
}

export async function reconstructDAW(projectData, isUndoRedo = false) {
    window.isReconstructingDAW = true;
    console.log("[State] Reconstructing DAW. Is Undo/Redo:", isUndoRedo, "Project Version:", projectData.version);
    if (Tone.Transport.state === 'started') Tone.Transport.stop();
    Tone.Transport.cancel();

    tracks.forEach(track => track.dispose());
    tracks = [];
    trackIdCounter = 0;

    // Dispose existing master effects before reconstructing
    if (window.masterEffectsChain) {
        window.masterEffectsChain.forEach(effect => {
            if (effect.toneNode && !effect.toneNode.disposed) effect.toneNode.dispose();
        });
    }
    window.masterEffectsChain = [];


    Object.values(window.openWindows).forEach(win => { /* ... close windows ... */
        if (win && typeof win.close === 'function') {
            win.close();
        } else if (win && win.element && win.element.remove) {
            win.element.remove();
        }
    });
    window.openWindows = {};
    window.highestZIndex = 100;


    armedTrackId = null; soloedTrackId = null; activeSequencerTrackId = null;
    isRecording = false; recordingTrackId = null;
    if (window.recordBtn) { window.recordBtn.classList.remove('recording'); window.recordBtn.textContent = 'Record';}


    const gs = projectData.globalSettings;
    if (gs) {
        Tone.Transport.bpm.value = gs.tempo || 120;
        // Master volume is now handled by masterGainNode in audio.js
        if (window.masterGainNode) window.masterGainNode.gain.value = gs.masterVolume !== undefined ? gs.masterVolume : Tone.dbToGain(0);
        else if (Tone.getDestination()?.volume) Tone.getDestination().volume.value = gs.masterVolume !== undefined ? gs.masterVolume : 0; // Fallback if masterGainNode not ready
        if (typeof window.updateTaskbarTempoDisplay === 'function') window.updateTaskbarTempoDisplay(Tone.Transport.bpm.value);
        window.highestZIndex = gs.highestZIndex || 100;
    }

    // --- NEW: Reconstruct Master Effects ---
    if (projectData.masterEffects && Array.isArray(projectData.masterEffects)) {
        projectData.masterEffects.forEach(effectData => {
            addMasterEffect(effectData.type, effectData.params); // addMasterEffect from audio.js
        });
        rebuildMasterEffectChain(); // Ensure master chain is correctly connected
    }
    // --- END NEW ---

    const trackInitPromises = [];
    if (projectData.tracks && Array.isArray(projectData.tracks)) {
        for (const trackData of projectData.tracks) {
            if (trackData.type === 'Synth') {
                trackData.synthEngineType = 'MonoSynth';
            }
            // The Track constructor now handles reconstructing activeEffects if present in trackData
            trackInitPromises.push(addTrackToState(trackData.type, trackData, false));
        }
    }
    
    await Promise.all(trackInitPromises);

    // After tracks are added (which calls initializeAudioNodes),
    // fullyInitializeAudioResources loads samples and then calls rebuildEffectChain for each track.
    const finalResourcePromises = tracks.map(track => {
        if (typeof track.fullyInitializeAudioResources === 'function') {
            return track.fullyInitializeAudioResources(); // This now also calls rebuildEffectChain
        }
        return Promise.resolve();
    });
    try {
        await Promise.all(finalResourcePromises);
        console.log("[State] All track audio resources finalized during reconstruct.");
    } catch (error) {
        console.error("[State] Error finalizing track audio resources (reconstruct):", error);
    }

    // ... (rest of reconstructDAW: solo/arm states, MIDI input, window states) ...
    // Ensure that after tracks are created and their effects are potentially set up by the Track constructor,
    // their effect chains are properly rebuilt. This should be handled by `fullyInitializeAudioResources`
    // calling `rebuildEffectChain`.
    if (gs) {
        soloedTrackId = gs.soloedTrackId || null;
        armedTrackId = gs.armedTrackId || null;
        tracks.forEach(t => {
            t.isSoloed = (t.id === soloedTrackId);
            t.applyMuteState(); // applyMuteState will also consider solo state
            t.applySoloState(); // Redundant if applyMuteState is comprehensive, but safe
        });
         if (gs.activeMIDIInputId && window.midiAccess && window.midiInputSelectGlobal) {
            const inputExists = Array.from(window.midiInputSelectGlobal.options).some(opt => opt.value === gs.activeMIDIInputId);
            if (inputExists) window.midiInputSelectGlobal.value = gs.activeMIDIInputId;
            else window.midiInputSelectGlobal.value = "";
            if(typeof window.selectMIDIInput === 'function') window.selectMIDIInput(true);
        } else if (window.midiInputSelectGlobal && typeof window.selectMIDIInput === 'function') {
            window.midiInputSelectGlobal.value = "";
            window.selectMIDIInput(true);
        }
    }

    if (projectData.windowStates && Array.isArray(projectData.windowStates)) {
        const sortedWindowStates = projectData.windowStates.sort((a, b) => a.zIndex - b.zIndex);
        for (const winState of sortedWindowStates) {
            // ... (window reconstruction logic as before)
             if (!winState || !winState.id) continue;
            const key = winState.initialContentKey || winState.id;
            try {
                let trackForWindow = null;
                if (key && (key.startsWith('trackInspector-') || key.startsWith('effectsRack-') || key.startsWith('sequencerWin-'))) {
                    const trackIdForWinStr = key.split('-')[1];
                    if (trackIdForWinStr) {
                        const trackIdForWin = parseInt(trackIdForWinStr);
                        trackForWindow = getTrackById(trackIdForWin);
                        if (!trackForWindow && key !== 'masterEffectsRack') { // Allow master rack even if track not found
                            console.warn(`[State] Track ID ${trackIdForWin} for window ${key} not found. Skipping window.`);
                            continue;
                        }
                    } else if (key !== 'masterEffectsRack') { // Allow master rack
                        console.warn(`[State] Could not parse track ID from window key ${key}. Skipping window.`);
                        continue;
                    }
                }

                if (key === 'globalControls' && typeof window.openGlobalControlsWindow === 'function') window.openGlobalControlsWindow(winState);
                else if (key === 'mixer' && typeof window.openMixerWindow === 'function') window.openMixerWindow(winState);
                else if (key === 'soundBrowser' && typeof window.openSoundBrowserWindow === 'function') window.openSoundBrowserWindow(winState);
                else if (key === 'masterEffectsRack' && typeof window.openMasterEffectsRackWindow === 'function') window.openMasterEffectsRackWindow(winState); // NEW
                else if (trackForWindow && key.startsWith('trackInspector-') && typeof window.openTrackInspectorWindow === 'function') window.openTrackInspectorWindow(trackForWindow.id, winState);
                else if (trackForWindow && key.startsWith('effectsRack-') && typeof window.openTrackEffectsRackWindow === 'function') window.openTrackEffectsRackWindow(trackForWindow.id, winState);
                else if (trackForWindow && key.startsWith('sequencerWin-') && typeof window.openTrackSequencerWindow === 'function') window.openTrackSequencerWindow(trackForWindow.id, true, winState);

            } catch (e) { console.error(`[State] Error reconstructing window ${winState.id} (Key: ${key}):`, e); }
        }
    }


    if(typeof window.updateMixerWindow === 'function') window.updateMixerWindow();
    tracks.forEach(track => { /* ... update inspector UI states ... */
        if (track.inspectorWindow && track.inspectorWindow.element) {
            const inspectorArmBtn = track.inspectorWindow.element.querySelector(`#armInputBtn-${track.id}`);
            if (inspectorArmBtn) inspectorArmBtn.classList.toggle('armed', armedTrackId === track.id);
            const inspectorSoloBtn = track.inspectorWindow.element.querySelector(`#soloBtn-${track.id}`);
            if (inspectorSoloBtn) inspectorSoloBtn.classList.toggle('soloed', track.isSoloed);
            const inspectorMuteBtn = track.inspectorWindow.element.querySelector(`#muteBtn-${track.id}`);
            if (inspectorMuteBtn) inspectorMuteBtn.classList.toggle('muted', track.isMuted);
        }
        if(typeof window.drawWaveform === 'function' && (track.type === 'Sampler') && track.audioBuffer && track.audioBuffer.loaded) window.drawWaveform(track);
        if(typeof window.drawInstrumentWaveform === 'function' && (track.type === 'InstrumentSampler') && track.instrumentSamplerSettings.audioBuffer && track.instrumentSamplerSettings.audioBuffer.loaded) window.drawInstrumentWaveform(track);
    });
    updateUndoRedoButtons();


    window.isReconstructingDAW = false;
    if (!isUndoRedo) showNotification(`Project loaded successfully.`, 3500);
    console.log("[State] DAW Reconstructed successfully.");
}

// ... (saveProject, loadProject, handleProjectFileLoad, exportToWav functions remain largely the same,
// but ensure exportToWav uses the final output from masterGainNode if it exists)
export async function exportToWav() {
    // ... (initial setup as before)
    showNotification("Preparing export... Please wait.", 3000);
    try {
        // ... (ensure audio context ready)
        if (typeof window.initAudioContextAndMasterMeter === 'function') {
            const audioReady = await window.initAudioContextAndMasterMeter(true);
            if (!audioReady) {
                showNotification("Audio system not ready for export. Please interact with the app (e.g. click Play) and try again.", 4000);
                return;
            }
        }


        if (Tone.Transport.state === 'started') {
            Tone.Transport.stop();
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        Tone.Transport.position = 0;
        // ... (calculate maxDuration)
        let maxDuration = 0;
        tracks.forEach(track => {
            if (track.sequence && track.sequenceLength > 0) {
                const sixteenthNoteTime = Tone.Time("16n").toSeconds();
                const trackDuration = track.sequenceLength * sixteenthNoteTime;
                if (trackDuration > maxDuration) maxDuration = trackDuration;
            }
        });
        if (maxDuration === 0) maxDuration = 5;
        maxDuration += 1;


        const recorder = new Tone.Recorder();
        // Connect recorder to the output of the master bus, right before Tone.getDestination()
        const recordSource = window.masterGainNode || Tone.getDestination();
        recordSource.connect(recorder);
        
        recorder.start();
        showNotification(`Recording for export (${maxDuration.toFixed(1)}s)...`, Math.max(3000, maxDuration * 1000 + 1000));

        // ... (start transport and sequences)
        tracks.forEach(track => {
            if (track.sequence) {
                track.sequence.start(0);
                if (track.sequence instanceof Tone.Sequence) track.sequence.progress = 0;
            }
        });
        Tone.Transport.start("+0.1", 0);

        await new Promise(resolve => setTimeout(resolve, maxDuration * 1000));

        Tone.Transport.stop();
        tracks.forEach(track => {
            if (track.sequence) {
                track.sequence.stop(0);
                 if (track.sequence instanceof Tone.Sequence) track.sequence.progress = 0;
            }
        });

        const recording = await recorder.stop();
        recorder.dispose();
        recordSource.disconnect(recorder); // Disconnect recorder after use


        const url = URL.createObjectURL(recording);
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `snugos-export-${timestamp}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showNotification("Export to WAV successful!", 3000);

    } catch (error) {
        console.error("[State] Error exporting WAV:", error);
        showNotification(`Error exporting WAV: ${error.message}`, 5000);
    }
}
