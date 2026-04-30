// js/eventHandlers.js - Global Event Listeners and Input Handling Module
import * as Constants from './constants.js';
import { showNotification, showConfirmationDialog, createContextMenu } from './utils.js';
import {
    getTracksState as getTracks,
    getTrackByIdState as getTrackById,
    captureStateForUndoInternal as captureStateForUndo,
    setSoloedTrackIdState as setSoloedTrackId,
    getSoloedTrackIdState as getSoloedTrackId,
    setArmedTrackIdState as setArmedTrackId,
    getArmedTrackIdState as getArmedTrackId,
    setActiveSequencerTrackIdState as setActiveSequencerTrackId,
    setIsRecordingState as setIsRecording,
    isTrackRecordingState as isTrackRecording,
    setRecordingTrackIdState as setRecordingTrackId,
    getRecordingTrackIdState as getRecordingTrackId,
    setRecordingStartTimeState as setRecordingStartTime,
    removeTrackFromStateInternal as coreRemoveTrackFromState,
    getPlaybackModeState,
    setPlaybackModeState,
    getMidiAccessState, 
    getActiveMIDIInputState,
    // MIDI Learn state functions
    getMidiLearnModeState,
    setMidiLearnModeState,
    getMidiLearnMappingsState,
    addMidiLearnMapping,
    setMidiLearnPendingParamState,
    getMidiLearnPendingParamState,
    getMidiLearnMappingByIndex,
    updateMidiLearnMapping,
    removeMidiLearnMapping,
    clearMidiLearnMappings,
    getMasterGainValueState,
    setMasterGainValueState,
    getMetronomeVolumeState,
    setMetronomeVolumeState
} from './state.js';

let localAppServices = {};
let transportKeepAliveBufferSource = null;
let silentKeepAliveBuffer = null;

export function initializeEventHandlersModule(appServicesFromMain) {
    localAppServices = appServicesFromMain || {}; 
    if (!localAppServices.setPlaybackMode && setPlaybackModeState) {
        localAppServices.setPlaybackMode = setPlaybackModeState;
    }
    if (!localAppServices.getPlaybackMode && getPlaybackModeState) {
        localAppServices.getPlaybackMode = getPlaybackModeState;
    }
}

export let currentlyPressedComputerKeys = {};
let currentOctaveShift = 0;
const MIN_OCTAVE_SHIFT = -2;
const MAX_OCTAVE_SHIFT = 2;

export function initializePrimaryEventListeners(appContext) {
    const services = appContext || localAppServices;
    const uiCache = services.uiElementsCache || {};

    try {
        if (uiCache.startButton) {
            uiCache.startButton.addEventListener('click', (e) => {
                e.stopPropagation();
                if (uiCache.startMenu) {
                    uiCache.startMenu.classList.toggle('hidden');
                } else {
                    console.error('[EventHandlers] Start Menu (uiCache.startMenu) not found when Start Button clicked!');
                }
            });
        } else {
            console.warn('[EventHandlers initializePrimaryEventListeners] Start Button (uiCache.startButton) NOT found in uiCache!');
        }

        if (uiCache.desktop) {
            uiCache.desktop.addEventListener('click', () => {
                if (uiCache.startMenu && !uiCache.startMenu.classList.contains('hidden')) {
                    uiCache.startMenu.classList.add('hidden');
                }
                const activeContextMenu = document.querySelector('.context-menu#snug-context-menu');
                if (activeContextMenu) {
                    activeContextMenu.remove();
                }
            });

            uiCache.desktop.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const menuItems = [
                    { label: "Add Synth Track", action: () => { if(services.addTrack) services.addTrack('Synth', {_isUserActionPlaceholder: true}); } },
                    { label: "Add Slicer Sampler Track", action: () => { if(services.addTrack) services.addTrack('Sampler', {_isUserActionPlaceholder: true}); } },
                    { label: "Add Sampler (Pads)", action: () => { if(services.addTrack) services.addTrack('DrumSampler', {_isUserActionPlaceholder: true}); } },
                    { label: "Add Instrument Sampler Track", action: () => { if(services.addTrack) services.addTrack('InstrumentSampler', {_isUserActionPlaceholder: true}); } },
                    { label: "Add Audio Track", action: () => { if(services.addTrack) services.addTrack('Audio', {_isUserActionPlaceholder: true}); } },
                    { separator: true },
                    { label: "Open Sound Browser", action: () => { if(services.openSoundBrowserWindow) services.openSoundBrowserWindow(); } },
                    { label: "Open Timeline", action: () => { if(services.openTimelineWindow) services.openTimelineWindow(); } },
                    { label: "Open Global Controls", action: () => { if(services.openGlobalControlsWindow) services.openGlobalControlsWindow(); } },
                    { label: "Open Mixer", action: () => { if(services.openMixerWindow) services.openMixerWindow(); } },
                    { label: "Open Master Effects", action: () => { if(services.openMasterEffectsRackWindow) services.openMasterEffectsRackWindow(); } },
                    { separator: true },
                    { label: "Upload Custom Background (Image/Video)", action: () => { if(services.triggerCustomBackgroundUpload) services.triggerCustomBackgroundUpload(); } },
                    { label: "Remove Custom Background", action: () => { if(services.removeCustomDesktopBackground) services.removeCustomDesktopBackground(); } },
                    { separator: true },
                    { label: "Toggle Full Screen", action: toggleFullScreen }
                ];
                if (typeof createContextMenu === 'function') {
                    createContextMenu(e, menuItems, services);
                } else {
                    console.error("[EventHandlers] createContextMenu function not available.");
                }
            });

            // Desktop dragover handler for audio files
            uiCache.desktop.addEventListener('dragover', (e) => {
                const hasAudioFiles = e.dataTransfer.types.includes('Files') || 
                    e.dataTransfer.types.includes('application/json');
                if (hasAudioFiles) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                }
            });

            // Desktop drop handler for audio files
            uiCache.desktop.addEventListener('drop', async (e) => {
                const files = e.dataTransfer.files;
                if (!files || files.length === 0) return;
                
                const file = files[0];
                if (!file.type.startsWith('audio/')) return;
                
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    showNotification(`Importing "${file.name}"...`, 2000);
                    // Create a new Audio track and add the file as a clip
                    if (services.addTrack) {
                        const newTrack = await services.addTrack('Audio', { name: file.name.replace(/\.[^/.]+$/, "") });
                        if (newTrack && typeof newTrack.addExternalAudioFileAsClip === 'function') {
                            await newTrack.addExternalAudioFileAsClip(file, 0, file.name);
                            showNotification(`Audio file "${file.name}" imported successfully.`, 3000);
                        }
                    }
                } catch (error) {
                    console.error("[EventHandlers DesktopDrop] Error:", error);
                    showNotification("Failed to import audio file.", 3000);
                }
            });
        } else {
             console.warn('[EventHandlers initializePrimaryEventListeners] Desktop element (uiCache.desktop) NOT found in uiCache!');
        }

        const menuActions = {
            menuAddSynthTrack: () => {
                try {
                    services.addTrack?.('Synth', {_isUserActionPlaceholder: true});
                } catch(e) { console.error('[Menu] Add Synth Track error:', e); }
            },
            menuAddSamplerTrack: () => {
                try {
                    services.addTrack?.('Sampler', {_isUserActionPlaceholder: true});
                } catch(e) { console.error('[Menu] Add Sampler error:', e); }
            },
            menuAddDrumSamplerTrack: () => {
                try {
                    services.addTrack?.('DrumSampler', {_isUserActionPlaceholder: true});
                } catch(e) { console.error('[Menu] Drum Sampler error:', e); }
            },
            menuAddInstrumentSamplerTrack: () => {
                try {
                    services.addTrack?.('InstrumentSampler', {_isUserActionPlaceholder: true});
                } catch(e) { console.error('[Menu] Instrument Sampler error:', e); }
            },
            menuAddAudioTrack: () => {
                try {
                    services.addTrack?.('Audio', {_isUserActionPlaceholder: true});
                } catch(e) { console.error('[Menu] Audio Track error:', e); }
            },
            menuOpenSoundBrowser: () => {
                try {
                    services.openSoundBrowserWindow?.();
                } catch(e) { console.error('[Menu] Sound Browser error:', e); }
            },
            menuImportAudioFile: () => {
                try {
                    const importInput = document.getElementById('importAudioFileInput');
                    if (importInput) {
                        importInput.click();
                    } else {
                        console.error('[Menu] Import Audio File input not found');
                    }
                } catch(e) { console.error('[Menu] Import Audio File error:', e); }
            },
            menuOpenMixer: () => {
                try {
                    services.openMixerWindow?.();
                } catch(e) { console.error('[Menu] Mixer error:', e); }
            },
            menuOpenMasterEffects: () => {
                try {
                    services.openMasterEffectsRackWindow?.();
                } catch(e) { console.error('[Menu] Master Effects error:', e); }
            },
            menuTetris: () => window.open("https://snugos.github.io/app/tetris.html", "_blank"),
            menuSaveProject: () => {
                try {
                    services.saveProject?.();
                } catch(e) { console.error('[Menu] Save Project error:', e); }
            },
            menuLoadProject: () => {
                try {
                    services.loadProject?.();
                } catch(e) { console.error('[Menu] Load Project error:', e); }
            },
            menuExportWav: () => {
                try {
                    services.exportToWav?.();
                } catch(e) { console.error('[Menu] Export WAV error:', e); }
            },
            menuExportMidi: () => {
                try {
                    services.exportToMidi?.();
                } catch(e) { console.error('[Menu] Export MIDI error:', e); }
            },
            menuImportMidi: () => {
                try {
                    services.importFromMidi?.();
                } catch(e) { console.error('[Menu] Import MIDI error:', e); }
            },
            menuKeyboardShortcuts: () => {
                try {
                    services.showKeyboardShortcutsHelp?.();
                } catch(e) { console.error('[Menu] Keyboard Shortcuts error:', e); }
            },
            menuUndo: () => {
                try {
                    services.undoLastAction?.();
                } catch(e) { console.error('[Menu] Undo error:', e); }
            },
            menuRedo: () => {
                try {
                    services.redoLastAction?.();
                } catch(e) { console.error('[Menu] Redo error:', e); }
            },
            menuToggleFullScreen: () => {
                try {
                    toggleFullScreen();
                } catch(e) { console.error('[Menu] Toggle Full Screen error:', e); }
            },
            menuSaveTrackAsTemplate: () => {
                try {
                    // Get the currently selected/active track to save as template
                    const tracks = services.getTracksState ? services.getTracksState() : [];
                    if (tracks.length === 0) {
                        services.showNotification?.('No track selected to save as template.', 2000);
                        return;
                    }
                    // Use the last interacted track or first track
                    const trackToSave = services.getActiveTrackForInteraction ? services.getActiveTrackForInteraction() : tracks[0];
                    if (!trackToSave) {
                        services.showNotification?.('No track available to save as template.', 2000);
                        return;
                    }
                    
                    // Prompt for template name
                    const templateName = prompt('Enter name for this template:', `${trackToSave.name} Template`);
                    if (!templateName) return; // User cancelled
                    
                    // Build template data from track
                    const templateData = {
                        name: templateName,
                        color: trackToSave.color || Constants.DEFAULT_TRACK_TEMPLATE_COLOR,
                        type: trackToSave.type,
                        synthParams: trackToSave.synthParams ? JSON.parse(JSON.stringify(trackToSave.synthParams)) : {},
                        instrumentSamplerSettings: trackToSave.instrumentSamplerSettings ? JSON.parse(JSON.stringify(trackToSave.instrumentSamplerSettings)) : null,
                        drumSamplerPads: trackToSave.drumSamplerPads ? trackToSave.drumSamplerPads.map(p => ({
                            volume: p.volume,
                            pitchShift: p.pitchShift,
                            envelope: p.envelope ? JSON.parse(JSON.stringify(p.envelope)) : { attack: 0.005, decay: 0.2, sustain: 0, release: 0.1 }
                        })) : null,
                        activeEffects: (trackToSave.activeEffects || []).map(e => ({
                            type: e.type,
                            params: e.params ? JSON.parse(JSON.stringify(e.params)) : {}
                        })),
                        hasAutomation: !!(trackToSave.automation && Object.keys(trackToSave.automation).length > 0),
                        automationLanes: trackToSave.automation ? JSON.parse(JSON.stringify(trackToSave.automation)) : []
                    };
                    
                    const result = services.addTrackTemplateState?.(templateData);
                    if (result) {
                        services.showNotification?.(`Template "${templateName}" saved successfully.`, 2000);
                    } else {
                        services.showNotification?.('Failed to save template. Maximum templates reached?', 3000);
                    }
                } catch(e) { console.error('[Menu] Save Track as Template error:', e); }
            },
            menuOpenTrackTemplates: () => {
                try {
                    if (services.openTrackTemplatesWindow) {
                        services.openTrackTemplatesWindow();
                    } else {
                        // Fallback: show template browser in a modal-like window
                        services.showNotification?.('Opening Track Templates...', 1500); return;
                        const templates = services.getTrackTemplatesState ? services.getTrackTemplatesState() : [];
                        showTrackTemplatesModal(services, templates);
                    }
                } catch(e) { console.error('[Menu] Open Track Templates error:', e); }
            }
        };

        for (const menuItemId in menuActions) {
            if (uiCache[menuItemId]) {
                uiCache[menuItemId].addEventListener('click', (e) => {
                    e.stopPropagation();
                    menuActions[menuItemId]();
                    if (uiCache.startMenu) uiCache.startMenu.classList.add('hidden');
                });
            } else {
                console.warn(`[Menu] NOT FOUND: ${menuItemId}`);
            }
        }

        if (uiCache.loadProjectInput) {
            uiCache.loadProjectInput.addEventListener('change', (e) => {
                if (services.handleProjectFileLoad) {
                    services.handleProjectFileLoad(e);
                } else {
                    console.error("[EventHandlers] handleProjectFileLoad service not available.");
                }
            });
        } else {
            console.warn("[EventHandlers] Load project input (uiCache.loadProjectInput) not found.");
        }

        // Import Audio File input handler
        const importAudioFileInput = document.getElementById('importAudioFileInput');
        if (importAudioFileInput) {
            importAudioFileInput.addEventListener('change', async (e) => {
                try {
                    if (!e.target.files || e.target.files.length === 0) return;
                    const file = e.target.files[0];
                    
                    if (!file.type.startsWith('audio/')) {
                        showNotification("Please select a valid audio file.", 3000);
                        return;
                    }
                    
                    // Create a new Audio track and add the file as a clip
                    if (services.addTrack) {
                        showNotification(`Importing "${file.name}"...`, 2000);
                        const newTrack = await services.addTrack('Audio', { name: file.name.replace(/\.[^/.]+$/, "") });
                        if (newTrack && typeof newTrack.addExternalAudioFileAsClip === 'function') {
                            await newTrack.addExternalAudioFileAsClip(file, 0, file.name);
                            showNotification(`Audio file "${file.name}" imported successfully.`, 3000);
                        }
                    }
                } catch (error) {
                    console.error("[EventHandlers ImportAudioFile] Error:", error);
                    showNotification("Failed to import audio file.", 3000);
                }
                e.target.value = ''; // Reset input
            });
        }

    } catch (error) {
        console.error("[EventHandlers initializePrimaryEventListeners] Error during initialization:", error);
        showNotification("Error setting up primary interactions. Some UI might not work.", 5000);
    }
}

export function attachGlobalControlEvents(elements) {
    if (!elements) {
        console.error("[EventHandlers attachGlobalControlEvents] Elements object is null or undefined.");
        return;
    }
    const { playBtnGlobal, recordBtnGlobal, stopBtnGlobal, tempoGlobalInput, midiInputSelectGlobal, playbackModeToggleBtnGlobal, tapBtnGlobal, metronomeBtnGlobal } = elements;

    // Helper function to toggle play/pause icons
    function setPlayButtonState(isPlaying) {
        if (!playBtnGlobal) return;
        const playIcon = playBtnGlobal.querySelector('.play-icon');
        const pauseIcon = playBtnGlobal.querySelector('.pause-icon');
        if (isPlaying) {
            playBtnGlobal.classList.add('playing');
            if (playIcon) playIcon.classList.add('hidden');
            if (pauseIcon) pauseIcon.classList.remove('hidden');
        } else {
            playBtnGlobal.classList.remove('playing');
            if (playIcon) playIcon.classList.remove('hidden');
            if (pauseIcon) pauseIcon.classList.add('hidden');
        }
    }

    // Initialize to stopped state
    setPlayButtonState(false);

    // Metronome button handler
    if (metronomeBtnGlobal) {
        let metronomeEnabled = false;
        const { startMetronome, stopMetronome, setMetronomeVolume, initializeMetronome } = localAppServices;
        
        metronomeBtnGlobal.addEventListener('click', async () => {
            try {
                const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
                if (!audioReady) {
                    showNotification("Audio context not ready.", 3000);
                    return;
                }
                
                metronomeEnabled = !metronomeEnabled;
                
                if (metronomeEnabled) {
                    if (initializeMetronome) initializeMetronome();
                    if (startMetronome) startMetronome();
                    metronomeBtnGlobal.classList.add('playing');
                    showNotification("Metronome ON", 1500);
                } else {
                    if (stopMetronome) stopMetronome();
                    metronomeBtnGlobal.classList.remove('playing');
                    showNotification("Metronome OFF", 1500);
                }
            } catch (error) {
                console.error("[EventHandlers Metronome] Error:", error);
            }
        });
    } else { console.warn("[EventHandlers] metronomeBtnGlobal not found."); }

    if (playBtnGlobal) {
        playBtnGlobal.addEventListener('click', async () => {
            try {
                if (!localAppServices.initAudioContextAndMasterMeter) {
                    console.error("initAudioContextAndMasterMeter service not available.");
                    showNotification("Audio system error.", 3000); return;
                }
                const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
                if (!audioReady) {
                    showNotification("Audio context not ready. Please interact with the page.", 3000);
                    return;
                }

                const transport = Tone.Transport;

                const tracks = getTracks();
                tracks.forEach(track => { if (typeof track.stopPlayback === 'function') track.stopPlayback(); });
                transport.cancel(0);

                if (transportKeepAliveBufferSource && !transportKeepAliveBufferSource.disposed) {
                    try { transportKeepAliveBufferSource.stop(0); transportKeepAliveBufferSource.dispose(); } catch (e) {}
                    transportKeepAliveBufferSource = null;
                }

                if (transport.state === 'stopped' || transport.state === 'paused') {
                    const wasPaused = transport.state === 'paused';
                    const startTime = wasPaused ? transport.seconds : 0;
                    if (!wasPaused) transport.position = 0;

                    
                    // Apply loop region settings before starting playback
                    if (localAppServices.updateLoopRegion) {
                        localAppServices.updateLoopRegion();
                    } else {
                        // Fallback if updateLoopRegion not available
                        transport.loop = true; 
                        transport.loopStart = 0;
                        transport.loopEnd = 3600;
                    }
                    if (!silentKeepAliveBuffer && Tone.context) {
                        try {
                            silentKeepAliveBuffer = Tone.context.createBuffer(1, 1, Tone.context.sampleRate);
                            silentKeepAliveBuffer.getChannelData(0)[0] = 0;
                        } catch (e) { console.error("Error creating silent buffer:", e); silentKeepAliveBuffer = null; }
                    }
                    if (silentKeepAliveBuffer) {
                        transportKeepAliveBufferSource = new Tone.BufferSource(silentKeepAliveBuffer).toDestination();
                        transportKeepAliveBufferSource.loop = true;
                        transportKeepAliveBufferSource.start(Tone.now() + 0.02, 0, transport.loopEnd);
                    }

                    for (const track of tracks) {
                        if (typeof track.schedulePlayback === 'function') {
                            await track.schedulePlayback(startTime, transport.loopEnd);
                        }
                    }
                    transport.start(Tone.now() + 0.05, startTime);
                    playBtnGlobal.textContent = 'Pause';
                    playBtnGlobal.classList.add('playing');
                } else { 
                    transport.pause();
                    playBtnGlobal.textContent = 'Play';
                    playBtnGlobal.classList.remove('playing');
                }
            } catch (error) {
                console.error("[EventHandlers Play/Pause] Error:", error);
                showNotification(`Error during playback: ${error.message}`, 4000);
                if (playBtnGlobal) {
                    playBtnGlobal.textContent = 'Play';
                    playBtnGlobal.classList.remove('playing');
                }
            }
        });
    } else { console.warn("[EventHandlers] playBtnGlobal not found in provided elements."); }

    if (stopBtnGlobal) {
        stopBtnGlobal.addEventListener('click', () => {
            if (localAppServices.panicStopAllAudio) {
                localAppServices.panicStopAllAudio();
            } else {
                console.error("[EventHandlers StopAll] panicStopAllAudio service not available.");
                if (typeof Tone !== 'undefined') {
                    Tone.Transport.stop();
                    Tone.Transport.cancel(0);
                }
                const playButton = localAppServices.uiElementsCache?.playBtnGlobal;
                if(playButton) {
                    playButton.textContent = 'Play';
                    playButton.classList.remove('playing');
                }
                showNotification("Emergency stop executed (minimal).", 2000);
            }
        });
    } else {
        console.warn("[EventHandlers] stopBtnGlobal not found in provided elements.");
    }

    if (recordBtnGlobal) {
        recordBtnGlobal.addEventListener('click', async () => {
            try {
                if (!localAppServices.initAudioContextAndMasterMeter) {
                    console.error("initAudioContextAndMasterMeter service not available.");
                    showNotification("Audio system error.", 3000); return;
                }
                const audioReady = await localAppServices.initAudioContextAndMasterMeter(true);
                if (!audioReady) { showNotification("Audio context not ready.", 3000); return; }

                const isCurrentlyRec = isTrackRecording();
                const trackToRecordId = getArmedTrackId();
                const trackToRecord = trackToRecordId !== null ? getTrackById(trackToRecordId) : null;

                if (!isCurrentlyRec) {
                    if (!trackToRecord) { showNotification("No track armed for recording.", 2000); return; }
                    let recordingInitialized = false;
                    if (trackToRecord.type === 'Audio') {
                        if (localAppServices.startAudioRecording) {
                            recordingInitialized = await localAppServices.startAudioRecording(trackToRecord, trackToRecord.isMonitoringEnabled);
                        } else { console.error("[EventHandlers] startAudioRecording service not available."); showNotification("Recording service unavailable.", 3000); }
                    } else { recordingInitialized = true; } 

                    if (recordingInitialized) {
                        setIsRecording(true);
                        setRecordingTrackId(trackToRecord.id);
                        if (Tone.Transport.state !== 'started') { Tone.Transport.cancel(0); Tone.Transport.position = 0; }
                        setRecordingStartTime(Tone.Transport.seconds);
                        if (Tone.Transport.state !== 'started') Tone.Transport.start(); 
                        if (localAppServices.updateRecordButtonUI) localAppServices.updateRecordButtonUI(true);
                        showNotification(`Recording started for ${trackToRecord.name}.`, 2000);
                    } else { showNotification(`Failed to initialize recording for ${trackToRecord.name}.`, 3000); }
                } else { 
                    if (localAppServices.stopAudioRecording && getRecordingTrackId() !== null && getTrackById(getRecordingTrackId())?.type === 'Audio') {
                        await localAppServices.stopAudioRecording();
                    } 
                    setIsRecording(false);
                    const previouslyRecordingTrackId = getRecordingTrackId();
                    setRecordingTrackId(null);
                    if (localAppServices.updateRecordButtonUI) localAppServices.updateRecordButtonUI(false);
                    const prevTrack = previouslyRecordingTrackId !== null ? getTrackById(previouslyRecordingTrackId) : null;
                    showNotification(`Recording stopped${prevTrack ? ` for ${prevTrack.name}` : ''}.`, 2000);
                }
            } catch (error) {
                console.error("[EventHandlers Record] Error:", error);
                showNotification(`Error during recording: ${error.message}`, 4000);
                if (localAppServices.updateRecordButtonUI) localAppServices.updateRecordButtonUI(false); 
                setIsRecording(false); setRecordingTrackId(null); 
            }
        });
    } else { console.warn("[EventHandlers] recordBtnGlobal not found."); }

    if (tempoGlobalInput) {
        tempoGlobalInput.addEventListener('input', (e) => {
            try {
                const newTempo = parseFloat(e.target.value);
                if (!isNaN(newTempo) && newTempo >= Constants.MIN_TEMPO && newTempo <= Constants.MAX_TEMPO) {
                    Tone.Transport.bpm.value = newTempo;
                    if (localAppServices.updateTaskbarTempoDisplay) localAppServices.updateTaskbarTempoDisplay(newTempo);
                }
            } catch (error) { console.error("[EventHandlers Tempo Input] Error:", error); }
        });
        tempoGlobalInput.addEventListener('change', () => { 
            if (localAppServices.captureStateForUndo) {
                localAppServices.captureStateForUndo(`Set Tempo to ${Tone.Transport.bpm.value.toFixed(1)}`);
            }
        });
    } else { console.warn("[EventHandlers] tempoGlobalInput not found."); }

    // Tap Tempo button handler
    if (tapBtnGlobal) {
        tapBtnGlobal.addEventListener('click', async () => {
            try {
                // Import handleTapTempo dynamically to avoid circular dependency
                const { handleTapTempo } = await import('./ui.js');
                const tappedBpm = handleTapTempo();
                if (tappedBpm !== null) {
                    Tone.Transport.bpm.value = tappedBpm;
                    if (tempoGlobalInput) {
                        tempoGlobalInput.value = tappedBpm.toFixed(1);
                    }
                    if (localAppServices.updateTaskbarTempoDisplay) {
                        localAppServices.updateTaskbarTempoDisplay(tappedBpm);
                    }
                    // Show brief feedback
                    tapBtnGlobal.style.backgroundColor = '#3a3a3a';
                    setTimeout(() => { tapBtnGlobal.style.backgroundColor = ''; }, 100);
                }
            } catch (error) {
                console.error("[EventHandlers TapTempo] Error:", error);
            }
        });
    } else { console.warn("[EventHandlers] tapBtnGlobal not found."); }

    if (midiInputSelectGlobal) {
        midiInputSelectGlobal.addEventListener('change', (e) => {
            if (localAppServices.selectMIDIInput) localAppServices.selectMIDIInput(e.target.value);
            else console.error("[EventHandlers] selectMIDIInput service not available.");
        });
    } else { console.warn("[EventHandlers] midiInputSelectGlobal not found."); }

    if (playbackModeToggleBtnGlobal) {
        playbackModeToggleBtnGlobal.addEventListener('click', () => {
            try {
                const currentGetMode = localAppServices.getPlaybackMode || getPlaybackModeState;
                const currentSetMode = localAppServices.setPlaybackMode || setPlaybackModeState;
                if (currentGetMode && currentSetMode) {
                    const currentMode = currentGetMode();
                    const newMode = currentMode === 'sequencer' ? 'timeline' : 'sequencer';
                    currentSetMode(newMode); 
                } else {
                    console.warn("[EventHandlers PlaybackModeToggle] getPlaybackMode or setPlaybackMode service not available.");
                }
            } catch (error) { console.error("[EventHandlers PlaybackModeToggle] Error:", error); }
        });
    } else { console.warn("[EventHandlers] playbackModeToggleBtnGlobal not found."); }

    // MIDI Learn button handler
    const midiLearnBtnGlobal = elements.midiLearnBtnGlobal;
    const midiLearnMappingsListGlobal = elements.midiLearnMappingsListGlobal;
    const midiLearnClearBtnGlobal = elements.midiLearnClearBtnGlobal;
    const midiLearnStatusGlobal = elements.midiLearnStatusGlobal;

    if (midiLearnBtnGlobal) {
        midiLearnBtnGlobal.addEventListener('click', () => {
            try {
                const currentMode = getMidiLearnModeState();
                const newMode = !currentMode;
                setMidiLearnModeState(newMode);
                midiLearnBtnGlobal.textContent = newMode ? 'Learn: On' : 'Learn: Off';
                midiLearnBtnGlobal.classList.toggle('bg-green-400', newMode);
                midiLearnBtnGlobal.classList.toggle('hover:bg-green-500', newMode);
                midiLearnBtnGlobal.classList.toggle('dark:bg-green-500', newMode);
                midiLearnBtnGlobal.classList.toggle('text-white', newMode);
                if (midiLearnStatusGlobal) {
                    if (newMode) {
                        midiLearnStatusGlobal.textContent = 'Click a param to learn...';
                        midiLearnStatusGlobal.classList.remove('hidden');
                    } else {
                        midiLearnStatusGlobal.classList.add('hidden');
                        setMidiLearnPendingParamState(null);
                    }
                }
                if (newMode && localAppServices.showNotification) {
                    localAppServices.showNotification('MIDI Learn: Move a control on your MIDI device', 3000);
                }
            } catch (error) { console.error("[EventHandlers MIDI Learn Toggle] Error:", error); }
        });
    } else { console.warn("[EventHandlers] midiLearnBtnGlobal not found."); }

    // MIDI Learn Clear All button handler
    if (midiLearnClearBtnGlobal) {
        midiLearnClearBtnGlobal.addEventListener('click', () => {
            try {
                clearMidiLearnMappings();
                updateMidiLearnMappingsListUI();
                if (localAppServices.showNotification) {
                    localAppServices.showNotification('All MIDI Learn mappings cleared', 2000);
                }
            } catch (error) { console.error("[EventHandlers MIDI Learn Clear] Error:", error); }
        });
    } else { console.warn("[EventHandlers] midiLearnClearBtnGlobal not found."); }

    // Helper function to update MIDI Learn mappings list UI
    function updateMidiLearnMappingsListUI() {
        if (!midiLearnMappingsListGlobal) return;
        const mappings = getMidiLearnMappingsState();
        if (!mappings || mappings.length === 0) {
            midiLearnMappingsListGlobal.innerHTML = '<div class="text-gray-400 dark:text-slate-500 italic">No mappings</div>';
            return;
        }
        let html = '';
        mappings.forEach((mapping, index) => {
            const paramStr = mapping.paramType || 'unknown';
            const trackStr = mapping.trackId ? ` (Track)` : '';
            html += `<div class="flex justify-between items-center p-1 bg-slate-100 dark:bg-slate-700 rounded">
                <span class="truncate">Ch${mapping.channel + 1} CC${mapping.cc} → ${paramStr}${trackStr}</span>
                <button class="midiLearnRemoveBtn text-red-500 hover:text-red-700 ml-1" data-index="${index}" title="Remove mapping">×</button>
            </div>`;
        });
        midiLearnMappingsListGlobal.innerHTML = html;
        // Attach remove handlers
        midiLearnMappingsListGlobal.querySelectorAll('.midiLearnRemoveBtn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.index, 10);
                removeMidiLearnMapping(idx);
                updateMidiLearnMappingsListUI();
                if (localAppServices.showNotification) {
                    localAppServices.showNotification('MIDI Learn mapping removed', 2000);
                }
            });
        });
    }

    // Initial update of MIDI Learn mappings list
    updateMidiLearnMappingsListUI();

    // Expose update function for external calls
    if (localAppServices.updateMidiLearnMappingsList !== undefined) {
        localAppServices.updateMidiLearnMappingsList = updateMidiLearnMappingsListUI;
    } else {
        // Fallback: if updateMidiLearnMappingsList doesn't exist yet in appServices, create it
        Object.defineProperty(localAppServices, 'updateMidiLearnMappingsList', {
            get: () => updateMidiLearnMappingsListUI,
            configurable: true
        });
    }
}

export function setupMIDI() {
    if (navigator.requestMIDIAccess) {
        navigator.requestMIDIAccess()
            .then(onMIDISuccess, onMIDIFailure)
            .catch(onMIDIFailure); 
    } else {
        console.warn("WebMIDI is not supported in this browser.");
        showNotification("WebMIDI not supported. Cannot use MIDI devices.", 3000);
    }
}

function onMIDISuccess(midiAccess) {
    if (localAppServices.setMidiAccess) {
        localAppServices.setMidiAccess(midiAccess);
    } else {
        console.error("[EventHandlers onMIDISuccess] setMidiAccess service not available.");
    }

    const inputs = midiAccess.inputs.values();
    const selectElement = localAppServices.uiElementsCache?.midiInputSelectGlobal;

    if (!selectElement) {
        console.warn("[EventHandlers onMIDISuccess] MIDI input select element not found in UI cache.");
        return;
    }

    selectElement.innerHTML = '<option value="">No MIDI Input</option>'; 
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
        if (input.value) {
            const option = document.createElement('option');
            option.value = input.value.id;
            option.textContent = input.value.name || `Unknown MIDI Device ${input.value.id.slice(-4)}`;
            selectElement.appendChild(option);
        }
    }

    const activeMIDIId = getActiveMIDIInputState()?.id; 
    if (activeMIDIId) {
        selectElement.value = activeMIDIId;
    }

    midiAccess.onstatechange = (event) => {
        setupMIDI(); 
        if (localAppServices.showNotification) {
            localAppServices.showNotification(`MIDI device ${event.port.name} ${event.port.state}.`, 2500);
        }
    };
}

function onMIDIFailure(msg) {
    console.error(`[MIDI] Failed to get MIDI access - ${msg}`);
    showNotification(`Failed to access MIDI devices: ${msg.toString()}`, 4000);
}

export function selectMIDIInput(deviceId, silent = false) {
    try {
        const midi = getMidiAccessState(); 
        const currentActiveInput = getActiveMIDIInputState(); 

        if (currentActiveInput && typeof currentActiveInput.close === 'function') {
            currentActiveInput.onmidimessage = null; 
            try {
                currentActiveInput.close();
            } catch (e) {
                console.warn(`[MIDI] Error closing previously active input "${currentActiveInput.name}":`, e.message);
            }
        }

        if (deviceId && midi && midi.inputs) {
            const input = midi.inputs.get(deviceId);
            if (input) {
                input.open().then((port) => {
                    port.onmidimessage = handleMIDIMessage;
                    if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(port);
                    if (!silent && localAppServices.showNotification) localAppServices.showNotification(`MIDI Input: ${port.name} selected.`, 2000);
                }).catch(err => {
                    console.error(`[MIDI] Error opening port ${input.name}:`, err);
                    if (!silent && localAppServices.showNotification) localAppServices.showNotification(`Error opening MIDI port: ${input.name}`, 3000);
                    if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(null); 
                });
            } else {
                if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(null);
                if (!silent && deviceId !== "" && localAppServices.showNotification) showNotification("Selected MIDI input not found.", 2000);
                console.warn(`[MIDI] Input with ID ${deviceId} not found.`);
            }
        } else {
            if (localAppServices.setActiveMIDIInput) localAppServices.setActiveMIDIInput(null);
            if (!silent && deviceId !== "" && localAppServices.showNotification) showNotification("MIDI input disconnected.", 2000);
        }
    } catch (error) {
        console.error("[EventHandlers selectMIDIInput] Error:", error);
        if (!silent && localAppServices.showNotification) localAppServices.showNotification("Error selecting MIDI input.", 3000);
    }
}

function handleMIDIMessage(message) {
    try {
        const [command, note, velocity] = message.data;
        const armedTrackId = getArmedTrackId();
        const armedTrack = armedTrackId !== null ? getTrackById(armedTrackId) : null;
        const midiIndicator = localAppServices.uiElementsCache?.midiIndicatorGlobal;

        if (midiIndicator) {
            midiIndicator.classList.add('active');
            setTimeout(() => midiIndicator.classList.remove('active'), 100);
        }

        // Handle MIDI Learn mode - capture CC messages
        const midiLearnMode = getMidiLearnModeState();
        if (midiLearnMode && command >= 176 && command <= 191) {
            // CC message (command 176-191 = channels 1-16)
            const channel = command - 176;
            const cc = note;
            const value = velocity / 127; // Normalize to 0-1
            
            const pendingParam = getMidiLearnPendingParamState();
            if (pendingParam) {
                // Create new mapping with pending parameter
                const newMapping = {
                    channel: channel,
                    cc: cc,
                    trackId: pendingParam.trackId,
                    paramType: pendingParam.paramType,
                    paramPath: pendingParam.paramPath,
                    min: pendingParam.min || 0,
                    max: pendingParam.max || 1
                };
                addMidiLearnMapping(newMapping);
                setMidiLearnModeState(false);
                setMidiLearnPendingParamState(null);
                if (localAppServices.showNotification) {
                    localAppServices.showNotification(`MIDI Learn: Mapped CC ${cc} on Ch ${channel + 1} to ${pendingParam.paramType}`, 3000);
                }
                // Exit MIDI Learn mode
                if (localAppServices.updateMidiLearnIndicator) {
                    localAppServices.updateMidiLearnIndicator(false);
                }
            }
            // Don't return - continue to process CC for existing mappings
            const mappingIndex = findMidiLearnMapping(channel, cc);
            if (mappingIndex !== -1) {
                const mapping = getMidiLearnMappingByIndex(mappingIndex);
                if (mapping) {
                    applyMidiLearnMapping(mapping, value);
                }
            }
            return; // Don't process note messages in MIDI Learn mode
        }

        if (!armedTrack) return;

        const isNoteOn = command === 144 && velocity > 0;
        const isNoteOff = command === 128 || (command === 144 && velocity === 0);

        // Handle different track types
        if (armedTrack.type === 'DrumSampler') {
            // DrumSampler: MIDI notes 36-43 map to pads 0-7
            const padIndex = note - Constants.samplerMIDINoteStart;
            if (padIndex >= 0 && padIndex < Constants.numDrumSamplerPads) {
                const player = armedTrack.drumPadPlayers[padIndex];
                const padData = armedTrack.drumSamplerPads[padIndex];
                if (player && !player.disposed && player.loaded && padData) {
                    if (isNoteOn) {
                        player.volume.value = Tone.gainToDb((padData.volume || 0.7) * (velocity / 127) * 0.7);
                        player.playbackRate = Math.pow(2, (padData.pitchShift || 0) / 12);
                        player.start(Tone.now());
                    }
                }
            }
        } else if (armedTrack.type === 'InstrumentSampler') {
            // InstrumentSampler: uses toneSampler with chromatic mapping
            if (armedTrack.toneSampler && !armedTrack.toneSampler.disposed && armedTrack.toneSampler.loaded) {
                const freq = Tone.Frequency(note, "midi").toNote();
                if (isNoteOn) {
                    armedTrack.toneSampler.triggerAttack(freq, Tone.now(), velocity / 127);
                } else if (isNoteOff) {
                    armedTrack.toneSampler.triggerRelease(freq, Tone.now() + 0.05);
                }
            }
        } else if (armedTrack.type === 'Synth') {
            // Synth: uses instrument.triggerAttack/triggerRelease
            if (armedTrack.instrument && !armedTrack.instrument.disposed) {
                const freq = Tone.Frequency(note, "midi").toNote();
                if (isNoteOn) {
                    if (typeof armedTrack.instrument.triggerAttack === 'function') {
                        armedTrack.instrument.triggerAttack(freq, Tone.now(), velocity / 127);
                    }
                } else if (isNoteOff) {
                    if (typeof armedTrack.instrument.triggerRelease === 'function') {
                        armedTrack.instrument.triggerRelease(freq, Tone.now() + 0.05);
                    }
                }
            }
        }
    } catch (error) {
        console.error("[EventHandlers handleMIDIMessage] Error:", error, "Message Data:", message.data);
    }
}

// Helper function to apply MIDI Learn mapping
function applyMidiLearnMapping(mapping, normalizedValue) {
    try {
        const { setMasterGainValueState, getTracksState } = require('./state.js');
        const scaledValue = mapping.min + (normalizedValue * (mapping.max - mapping.min));
        
        switch (mapping.paramType) {
            case 'masterVolume':
                setMasterGainValueState(scaledValue);
                if (localAppServices.setActualMasterVolume) {
                    localAppServices.setActualMasterVolume(scaledValue);
                }
                break;
            case 'metronomeVolume':
                if (localAppServices.setMetronomeVolume) {
                    localAppServices.setMetronomeVolume(scaledValue);
                }
                break;
            case 'tempo':
                if (typeof Tone !== 'undefined' && Tone.Transport) {
                    const newTempo = Math.max(Constants.MIN_TEMPO, Math.min(Constants.MAX_TEMPO, scaledValue));
                    Tone.Transport.bpm.value = newTempo;
                    if (localAppServices.updateTaskbarTempoDisplay) {
                        localAppServices.updateTaskbarTempoDisplay(newTempo);
                    }
                }
                break;
            case 'trackVolume':
            case 'trackPan':
            case 'trackMute':
            case 'trackSolo':
                if (mapping.trackId) {
                    const tracks = getTracks();
                    const track = tracks.find(t => t.id === mapping.trackId);
                    if (track) {
                        if (mapping.paramType === 'trackVolume' && track.gainNode) {
                            track.gainNode.gain.value = scaledValue;
                        } else if (mapping.paramType === 'trackPan' && track.panNode) {
                            track.panNode.pan.value = scaledValue * 2 - 1; // Convert 0-1 to -1 to 1
                        }
                    }
                }
                break;
            case 'effectParam':
                // Effect parameters use paramPath to navigate nested objects
                if (mapping.trackId && mapping.paramPath) {
                    const tracks = getTracks();
                    const track = tracks.find(t => t.id === mapping.trackId);
                    if (track && track.effects) {
                        const pathParts = mapping.paramPath.split('.');
                        let target = track;
                        for (let i = 0; i < pathParts.length - 1; i++) {
                            target = target[pathParts[i]];
                        }
                        const paramName = pathParts[pathParts.length - 1];
                        if (target && typeof target[paramName] !== 'undefined') {
                            target[paramName] = scaledValue;
                        }
                    }
                }
                break;
        }
    } catch (error) {
        console.error("[EventHandlers applyMidiLearnMapping] Error:", error);
    }
}

// Helper to find MIDI Learn mapping index
function findMidiLearnMapping(channel, cc) {
    const mappings = getMidiLearnMappingsState();
    return mappings.findIndex(m => m.channel === channel && m.cc === cc);
}

const keyToMIDIMap = Constants.computerKeySynthMap || { 
    'a': 48, 'w': 49, 's': 50, 'e': 51, 'd': 52, 'f': 53, 't': 54, 'g': 55, 'y': 56, 'h': 57, 'u': 58, 'j': 59, 'k': 60
};


if (typeof document !== 'undefined') {
document.addEventListener('keydown', (event) => {
    try {
        if (event.repeat) return;
        const key = event.key.toLowerCase();
        const kbdIndicator = localAppServices.uiElementsCache?.keyboardIndicatorGlobal;

        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
            if (key === 'escape') activeEl.blur();
            return; 
        }
        if (event.metaKey || event.ctrlKey) {
            if (!( (event.ctrlKey || event.metaKey) && (key === 'z' || key === 'y' || key === 's' || key === 'o'))) { 
                 return;
            }
        }

        if (key === 'z' && (event.ctrlKey || event.metaKey)) {
            if (localAppServices.undoLastAction) localAppServices.undoLastAction();
            return;
        }
        if (key === 'y' && (event.ctrlKey || event.metaKey)) {
             if (localAppServices.redoLastAction) localAppServices.redoLastAction();
            return;
        }
        if (key === 'z' && (event.ctrlKey || event.metaKey) && event.shiftKey) {
            // Ctrl+Shift+Z as alternative for Redo
            if (localAppServices.redoLastAction) localAppServices.redoLastAction();
            return;
        }
        if (key === 's' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            if (localAppServices.saveProject) localAppServices.saveProject();
            return;
        }
        if (key === 'o' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            if (localAppServices.loadProject) localAppServices.loadProject();
            return;
        }
        if (key === 'e' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            if (localAppServices.exportToMidi) localAppServices.exportToMidi();
            return;
        }
        if (key === 'x' && !(event.ctrlKey || event.metaKey)) {
            currentOctaveShift = Math.min(MAX_OCTAVE_SHIFT, currentOctaveShift + 1);
            if (localAppServices.showNotification) localAppServices.showNotification(`Octave: ${currentOctaveShift}`, 1000);
            return;
        }
        if (key === ' ' && !(activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA'))) { 
            event.preventDefault(); 
            const playBtn = localAppServices.uiElementsCache?.playBtnGlobal;
            if (playBtn) playBtn.click();
            return;
        }
        if (key === 'Enter' && !(activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA'))) { 
            event.preventDefault(); 
            const recordBtn = localAppServices.uiElementsCache?.recordBtnGlobal;
            if (recordBtn) recordBtn.click();
            return;
        }
        if (key === 'Escape' || key === 'esc') {
            const allWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : [];
            allWindows.forEach(w => { if (w.close) w.close(); });
            if (localAppServices.showNotification) localAppServices.showNotification('Closed all windows', 800);
            return;
        }
        if (key === 'm' && !(event.ctrlKey || event.metaKey)) {
            if (localAppServices.toggleMute) localAppServices.toggleMute(-1);
            return;
        }
        if (key === 's' && !(event.ctrlKey || event.metaKey)) {
            if (localAppServices.toggleSolo) localAppServices.toggleSolo(-1);
            return;
        }
        if (key === 'r' && !(event.ctrlKey || event.metaKey)) {
            if (localAppServices.toggleRecordArm) localAppServices.toggleRecordArm(-1);
            return;
        }
        if (key === 't' && !(event.ctrlKey || event.metaKey)) {
            // Toggle Metronome
            const metronomeBtn = localAppServices.uiElementsCache?.metronomeBtnGlobal;
            if (metronomeBtn) metronomeBtn.click();
            return;
        }
        if (key === '`' && !(event.ctrlKey || event.metaKey)) {
            // Tap Tempo
            const tapBtn = localAppServices.uiElementsCache?.tapBtnGlobal;
            if (tapBtn) tapBtn.click();
            return;
        }
        if (key === 'q' && !(event.ctrlKey || event.metaKey)) {
            // Toggle Scale Mode
            if (localAppServices.getScaleModeEnabled && localAppServices.setScaleModeEnabled) {
                const currentEnabled = localAppServices.getScaleModeEnabled();
                localAppServices.setScaleModeEnabled(!currentEnabled);
                if (localAppServices.showNotification) {
                    localAppServices.showNotification(`Scale Mode: ${!currentEnabled ? 'ON' : 'OFF'}`, 1000);
                }
            }
            return;
        }
        if (key === 'c' && !(event.ctrlKey || event.metaKey) && !event.altKey) {
            // Toggle Chord Mode
            if (localAppServices.getChordModeEnabledState && localAppServices.setChordModeEnabledState) {
                const currentEnabled = localAppServices.getChordModeEnabledState();
                localAppServices.setChordModeEnabledState(!currentEnabled);
                if (localAppServices.showNotification) {
                    localAppServices.showNotification(`Chord Mode: ${!currentEnabled ? 'ON' : 'OFF'}`, 1000);
                }
            }
            return;
        }
        if (key === 'l' && !(event.ctrlKey || event.metaKey)) {
            // Toggle Loop Region
            if (localAppServices.getLoopRegionEnabled && localAppServices.setLoopRegionEnabled) {
                const currentEnabled = localAppServices.getLoopRegionEnabled();
                localAppServices.setLoopRegionEnabled(!currentEnabled);
                if (localAppServices.captureStateForUndo) {
                    localAppServices.captureStateForUndo(`Toggle Loop Region ${!currentEnabled ? 'ON' : 'OFF'}`);
                }
                if (localAppServices.showNotification) {
                    localAppServices.showNotification(`Loop Region: ${!currentEnabled ? 'ON' : 'OFF'}`, 1000);
                }
                // Update Tone.Transport loop settings
                if (localAppServices.updateLoopRegion) {
                    localAppServices.updateLoopRegion();
                }
            }
            return;
        }
        if (key === 'k' && !(event.ctrlKey || event.metaKey)) {
            // Toggle MIDI Learn Mode
            if (localAppServices.getMidiLearnModeState && localAppServices.setMidiLearnModeState) {
                const currentMode = localAppServices.getMidiLearnModeState();
                const newMode = !currentMode;
                localAppServices.setMidiLearnModeState(newMode);
                if (localAppServices.captureStateForUndo) {
                    localAppServices.captureStateForUndo(`Toggle MIDI Learn ${newMode ? 'ON' : 'OFF'}`);
                }
                if (localAppServices.showNotification) {
                    localAppServices.showNotification(`MIDI Learn: ${newMode ? 'ON - Move a control on your MIDI device' : 'OFF'}`, 2000);
                }
            }
            return;
        }
        
        const midNote = keyToMIDIMap[key];
        if (midNote !== undefined) {
            if (localAppServices.uiElementsCache?.keyboardIndicatorGlobal) {
                localAppServices.uiElementsCache.keyboardIndicatorGlobal.textContent = key.toUpperCase();
                localAppServices.uiElementsCache.keyboardIndicatorGlobal.style.fill = 'var(--theme-keyboard-key-active, #00ff88)';
                setTimeout(() => {
                    if (localAppServices.uiElementsCache?.keyboardIndicatorGlobal) {
                        localAppServices.uiElementsCache.keyboardIndicatorGlobal.textContent = key.toUpperCase();
                        localAppServices.uiElementsCache.keyboardIndicatorGlobal.style.fill = ''; 
                    }
                }, 100);
            }
            if (localAppServices.handleComputerKeyOn) localAppServices.handleComputerKeyOn(midNote + (currentOctaveShift * 12));
            return;
        }
    } catch (error) {
        console.error("[EventHandlers keydown] Error:", error);
    }
});
}

if (typeof document !== 'undefined') {
document.addEventListener('keyup', (event) => {
    let armedTrack = null; 
    let midiNote = undefined;
    let freq = ''; 

    try {
        const key = event.key.toLowerCase();
        const kbdIndicator = localAppServices.uiElementsCache?.keyboardIndicatorGlobal;
        if (kbdIndicator) kbdIndicator.classList.remove('active');

        const armedTrackId = getArmedTrackId();
        armedTrack = armedTrackId !== null ? getTrackById(armedTrackId) : null; 

        if (!armedTrack || !armedTrack.instrument || typeof armedTrack.instrument.triggerRelease !== 'function' || armedTrack.instrument.disposed) {
            Object.keys(currentlyPressedComputerKeys).forEach(noteKey => delete currentlyPressedComputerKeys[noteKey]);
            return;
        }

        midiNote = keyToMIDIMap[event.key]; 
        if (midiNote === undefined && keyToMIDIMap[key]) midiNote = keyToMIDIMap[key]; 

        if (midiNote !== undefined && currentlyPressedComputerKeys[midiNote]) {
            const finalNote = midiNote + (currentOctaveShift * 12);
             if (finalNote >=0 && finalNote <= 127) { 
                freq = Tone.Frequency(finalNote, "midi").toNote(); 
                armedTrack.instrument.triggerRelease(freq, Tone.now()); 
            }
            delete currentlyPressedComputerKeys[midiNote];
        }
    } catch (error) {
        console.error("[EventHandlers Keyup] Error during specific note release:", error, 
            "Key:", event.key, 
            "Armed Track ID:", armedTrack ? armedTrack.id : 'N/A',
            "Instrument Type:", armedTrack && armedTrack.instrument ? armedTrack.instrument.name : 'N/A', 
            "Target Frequency:", freq,
            "Calculated MIDI Note:", midiNote
        );
        
        if (armedTrack && armedTrack.instrument && typeof armedTrack.instrument.releaseAll === 'function' && !armedTrack.instrument.disposed) {
            try {
                console.warn(`[EventHandlers Keyup] Forcing releaseAll on ${armedTrack.name} (instrument: ${armedTrack.instrument.name}) due to error on keyup for note ${freq || 'unknown'}.`);
                armedTrack.instrument.releaseAll(Tone.now());
            } catch (releaseAllError) {
                console.error("[EventHandlers Keyup] Error during emergency releaseAll:", releaseAllError);
            }
        }

        if (midiNote !== undefined && currentlyPressedComputerKeys[midiNote]) {
            delete currentlyPressedComputerKeys[midiNote];
        }
    }
});
}


// --- Track Control Handlers ---
export function handleTrackMute(trackId) {
    try {
        const track = getTrackById(trackId);
        if (!track) { console.warn(`[EventHandlers] Mute: Track ${trackId} not found.`); return; }
        captureStateForUndo(`Toggle Mute for ${track.name}`);
        track.isMuted = !track.isMuted;
        track.applyMuteState();
        if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(trackId, 'muteChanged');
    } catch (error) { console.error(`[EventHandlers handleTrackMute] Error for track ${trackId}:`, error); }
}

export function handleTrackSolo(trackId) {
    try {
        const track = getTrackById(trackId);
        if (!track) { console.warn(`[EventHandlers] Solo: Track ${trackId} not found.`); return; }
        const currentSoloed = getSoloedTrackId();
        captureStateForUndo(`Toggle Solo for ${track.name}`);
        setSoloedTrackId(currentSoloed === trackId ? null : trackId);

        const tracks = getTracks();
        if (tracks && Array.isArray(tracks)) {
            tracks.forEach(t => {
                if (t) {
                    t.isSoloed = (t.id === getSoloedTrackId());
                    t.applySoloState();
                    if (localAppServices.updateTrackUI) localAppServices.updateTrackUI(t.id, 'soloChanged');
                }
            });
        }
    } catch (error) { console.error(`[EventHandlers handleTrackSolo] Error for track ${trackId}:`, error); }
}

export function handleTrackArm(trackId) {
    try {
        const track = getTrackById(trackId);
        if (!track) { console.warn(`[EventHandlers] Arm: Track ${trackId} not found.`); return; }
        const currentArmedId = getArmedTrackId();
        const isCurrentlyArmed = currentArmedId === track.id;
        captureStateForUndo(`${isCurrentlyArmed ? "Disarm" : "Arm"} Track "${track.name}" for Input`);
        setArmedTrackId(isCurrentlyArmed ? null : track.id);

        const newArmedTrack = getTrackById(getArmedTrackId()); 
        const notificationMessage = newArmedTrack ? `${newArmedTrack.name} armed for input.` : "All tracks disarmed.";
        if (localAppServices.showNotification) localAppServices.showNotification(notificationMessage, 1500);
        else showNotification(notificationMessage, 1500); 

        const tracks = getTracks();
        if (tracks && Array.isArray(tracks)) {
            tracks.forEach(t => {
                if (t && localAppServices.updateTrackUI) localAppServices.updateTrackUI(t.id, 'armChanged');
            });
        }
    } catch (error) { console.error(`[EventHandlers handleTrackArm] Error for track ${trackId}:`, error); }
}

export function handleRemoveTrack(trackId) {
    try {
        const track = getTrackById(trackId);
        if (!track) { console.warn(`[EventHandlers] Remove: Track ${trackId} not found.`); return; }
        if (typeof showConfirmationDialog !== 'function') {
            console.error("[EventHandlers] showConfirmationDialog function not available.");
            if (confirm(`Are you sure you want to remove track "${track.name}"? This can be undone.`)) {
                if (localAppServices.removeTrack) localAppServices.removeTrack(trackId);
                else coreRemoveTrackFromState(trackId); 
            }
            return;
        }
        showConfirmationDialog(
            'Confirm Delete Track',
            `Are you sure you want to remove track "${track.name}"? This can be undone.`,
            () => {
                if (localAppServices.removeTrack) {
                    localAppServices.removeTrack(trackId);
                } else {
                    console.warn("[EventHandlers] removeTrack service not available, calling coreRemoveTrackFromState.");
                    coreRemoveTrackFromState(trackId);
                }
            }
        );
    } catch (error) { console.error(`[EventHandlers handleRemoveTrack] Error for track ${trackId}:`, error); }
}

export function handleOpenTrackInspector(trackId) {
    if (localAppServices.openTrackInspectorWindow) {
        localAppServices.openTrackInspectorWindow(trackId);
    } else { console.error("[EventHandlers] openTrackInspectorWindow service not available."); }
}
export function handleOpenEffectsRack(trackId) {
    if (localAppServices.openTrackEffectsRackWindow) {
        localAppServices.openTrackEffectsRackWindow(trackId);
    } else { console.error("[EventHandlers] openTrackEffectsRackWindow service not available."); }
}
export function handleOpenSequencer(trackId) {
    if (localAppServices.openTrackSequencerWindow) {
        localAppServices.openTrackSequencerWindow(trackId);
    } else { console.error("[EventHandlers] openTrackSequencerWindow service not available."); }
}

function toggleFullScreen() {
    try {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                const message = `Error attempting to enable full-screen mode: ${err.message} (${err.name})`;
                if (localAppServices.showNotification) localAppServices.showNotification(message, 3000);
                else showNotification(message, 3000);
                console.error(message, err);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    } catch (error) {
        console.error("[EventHandlers toggleFullScreen] Error:", error);
        if (localAppServices.showNotification) localAppServices.showNotification("Fullscreen toggle error.", 3000);
    }
}

export async function handleTimelineLaneDrop(event, targetTrackId, startTime, appServicesPassed) {
    const services = appServicesPassed || localAppServices;

    if (!services || !services.getTrackById || !services.showNotification || !services.captureStateForUndo || !services.renderTimeline) {
        console.error("Required appServices not available in handleTimelineLaneDrop");
        showNotification("Internal error handling timeline drop.", 3000); 
        return;
    }

    const targetTrack = services.getTrackById(targetTrackId);
    if (!targetTrack) {
        services.showNotification("Target track not found for drop.", 3000);
        return;
    }

    const jsonDataString = event.dataTransfer.getData('application/json');
    const files = event.dataTransfer.files;

    try {
        if (jsonDataString) {
            const droppedData = JSON.parse(jsonDataString);
            if (droppedData.type === 'sequence-timeline-drag') {
                if (targetTrack.type === 'Audio') {
                    services.showNotification("Cannot place sequence clips on Audio tracks.", 3000);
                    return;
                }
                if (typeof targetTrack.addSequenceClipToTimeline === 'function') {
                    targetTrack.addSequenceClipToTimeline(droppedData.sourceSequenceId, startTime, droppedData.clipName);
                } else {
                    services.showNotification("Error: Track cannot accept sequence clips.", 3000);
                }
            } else if (droppedData.type === 'sound-browser-item') {
                if (targetTrack.type !== 'Audio') {
                    services.showNotification("Sound browser audio files can only be dropped onto Audio Track timeline lanes.", 3000);
                    return;
                }
                if (services.getAudioBlobFromSoundBrowserItem && typeof targetTrack.addExternalAudioFileAsClip === 'function') {
                    const audioBlob = await services.getAudioBlobFromSoundBrowserItem(droppedData);
                    if (audioBlob) {
                        targetTrack.addExternalAudioFileAsClip(audioBlob, startTime, droppedData.fileName);
                    } else {
                        services.showNotification(`Could not load audio for "${droppedData.fileName}".`, 3000);
                    }
                } else {
                     services.showNotification("Error: Cannot process sound browser item for timeline.", 3000);
                }
            } else {
                services.showNotification("Unrecognized item dropped on timeline.", 2000);
            }
        } else if (files && files.length > 0) {
            const file = files[0];
            if (targetTrack.type !== 'Audio') {
                services.showNotification("Audio files can only be dropped onto Audio Track timeline lanes.", 3000);
                return;
            }
            if (file.type.startsWith('audio/')) {
                if (typeof targetTrack.addExternalAudioFileAsClip === 'function') {
                    targetTrack.addExternalAudioFileAsClip(file, startTime, file.name);
                } else {
                    services.showNotification("Error: Track cannot accept audio file clips.", 3000);
                }
            } else {
                services.showNotification("Invalid file type. Please drop an audio file.", 3000);
            }
        } else {
        }
    } catch (e) {
        console.error("[EventHandlers handleTimelineLaneDrop] Error processing dropped data:", e);
        services.showNotification("Error processing dropped item.", 3000);
    }
}
