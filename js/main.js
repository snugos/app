// js/main.js - Main Application Logic Orchestrator

// ... (other imports and code remain the same) ...

// --- AppServices Object (Centralized DI Container) ---
const appServices = {
    // ... (all other appServices properties remain the same) ...
    updateTrackUI: handleTrackUIUpdate, // Centralized track UI update handler
    // ... (other appServices properties) ...
};

// --- Centralized UI Update Handler ---
function handleTrackUIUpdate(trackId, reason, detail) {
    if (!getTrackByIdState) { console.warn("[Main UI Update] getTrackByIdState service not available."); return; }
    const track = getTrackByIdState(trackId);
    if (!track) {
        console.warn(`[Main UI Update] Track ${trackId} not found for reason: ${reason}`);
        return;
    }

    const getOpenWindowElement = (winId) => {
        if (!getWindowByIdState) return null;
        const win = getWindowByIdState(winId);
        return (win?.element && !win.isMinimized) ? win.element : null;
    };

    const inspectorElement = getOpenWindowElement(`trackInspector-${trackId}`);
    const effectsRackElement = getOpenWindowElement(`effectsRack-${trackId}`);
    const sequencerElement = getOpenWindowElement(`sequencerWin-${trackId}`); // Check if it's open
    const mixerElement = getOpenWindowElement('mixer');

    try {
        switch(reason) {
            case 'nameChanged':
                if (inspectorElement) {
                    const inspectorWindowInstance = getWindowByIdState(`trackInspector-${trackId}`);
                    if (inspectorWindowInstance) {
                        inspectorWindowInstance.title = `Inspector: ${track.name}`;
                        const titleSpan = inspectorElement.querySelector('.window-title-bar span');
                        if (titleSpan) titleSpan.textContent = `Inspector: ${track.name}`;
                        if (inspectorWindowInstance.taskbarButton) {
                             inspectorWindowInstance.taskbarButton.textContent = `Inspector: ${track.name}`.substring(0, 20) + (`Inspector: ${track.name}`.length > 20 ? '...' : '');
                             inspectorWindowInstance.taskbarButton.title = `Inspector: ${track.name}`;
                        }
                    }
                }
                if (effectsRackElement) {
                     const effectsRackWindowInstance = getWindowByIdState(`effectsRack-${trackId}`);
                    if (effectsRackWindowInstance) {
                        effectsRackWindowInstance.title = `Effects: ${track.name}`;
                        const titleSpan = effectsRackElement.querySelector('.window-title-bar span');
                        if (titleSpan) titleSpan.textContent = `Effects: ${track.name}`;
                         if (effectsRackWindowInstance.taskbarButton) {
                             effectsRackWindowInstance.taskbarButton.textContent = `Effects: ${track.name}`.substring(0, 20) + (`Effects: ${track.name}`.length > 20 ? '...' : '');
                             effectsRackWindowInstance.taskbarButton.title = `Effects: ${track.name}`;
                        }
                        const rackTitle = effectsRackElement.querySelector(`#effectsRackContent-${track.id} h3`);
                        if (rackTitle) rackTitle.textContent = `Effects Rack: ${track.name}`;
                    }
                }
                if (sequencerElement) { // Check if sequencer window element exists
                    const sequencerWindowInstance = getWindowByIdState(`sequencerWin-${trackId}`);
                    const activeSequence = track.getActiveSequence();
                    const seqTitleText = activeSequence ? `${track.name} - ${activeSequence.name}` : track.name;
                    if (sequencerWindowInstance) {
                        sequencerWindowInstance.title = `Sequencer: ${seqTitleText}`;
                        const titleSpan = sequencerElement.querySelector('.window-title-bar span');
                        if (titleSpan) titleSpan.textContent = `Sequencer: ${seqTitleText}`;
                        if (sequencerWindowInstance.taskbarButton) {
                             sequencerWindowInstance.taskbarButton.textContent = `Sequencer: ${seqTitleText}`.substring(0, 20) + (`Sequencer: ${seqTitleText}`.length > 20 ? '...' : '');
                             sequencerWindowInstance.taskbarButton.title = `Sequencer: ${seqTitleText}`;
                        }
                        const seqControlsTitle = sequencerElement.querySelector(`.sequencer-container .controls span`);
                        if (seqControlsTitle) {
                             const numBars = activeSequence ? (activeSequence.length > 0 ? Math.max(1, activeSequence.length / Constants.STEPS_PER_BAR) : 1) : 1;
                             const totalSteps = activeSequence ? (activeSequence.length > 0 ? activeSequence.length : Constants.defaultStepsPerBar) : Constants.defaultStepsPerBar;
                             seqControlsTitle.textContent = `${track.name} - ${numBars} Bar${numBars > 1 ? 's' : ''} (${totalSteps} steps)`;
                        }
                    }
                }
                if (mixerElement && typeof updateMixerWindow === 'function') {
                    updateMixerWindow();
                }
                if (typeof renderTimeline === 'function') {
                    renderTimeline();
                }
                break;
            // ... (other cases remain the same)
            case 'sequencerContentChanged':
                const seqWinInstance = getWindowByIdState(`sequencerWin-${trackId}`);
                if (seqWinInstance && seqWinInstance.element && typeof openTrackSequencerWindow === 'function') { // Ensure instance and element exist
                    // Construct a current state object for re-opening to preserve position/size
                    const currentStateForRedraw = {
                        id: seqWinInstance.id,
                        title: seqWinInstance.title, // Use current title
                        left: seqWinInstance.element.style.left,
                        top: seqWinInstance.element.style.top,
                        width: seqWinInstance.element.style.width,
                        height: seqWinInstance.element.style.height,
                        zIndex: parseInt(seqWinInstance.element.style.zIndex, 10) || seqWinInstance.options.zIndex, // Use current or initial
                        isMinimized: seqWinInstance.isMinimized,
                        isMaximized: seqWinInstance.isMaximized,
                        restoreState: seqWinInstance.isMaximized ? JSON.parse(JSON.stringify(seqWinInstance.restoreState)) : {},
                        initialContentKey: seqWinInstance.initialContentKey || seqWinInstance.id
                    };
                    // Force redraw of sequencer window by closing and reopening with its current state
                    openTrackSequencerWindow(trackId, true, currentStateForRedraw); // true for forceRedraw
                } else if (seqWinInstance && !seqWinInstance.element && typeof openTrackSequencerWindow === 'function') {
                    // Window instance exists in map but element is gone (shouldn't typically happen if it was just open)
                    console.warn(`[Main UI Update] Sequencer window instance for ${trackId} found but element missing. Reopening fresh.`);
                    openTrackSequencerWindow(trackId, true, null); // Open with default positioning
                } else if (typeof openTrackSequencerWindow === 'function' && getActiveSequencerTrackIdState() === trackId) {
                    // If this track's sequencer is active but the window isn't open,
                    // a 'sequencerContentChanged' event might still need to trigger its creation if it becomes visible
                    // For now, if the element wasn't found (implying window was closed), we don't auto-reopen unless explicitly called.
                    // However, if it *should* be open due to being the active sequencer, this could be a point to reopen.
                    // For now, the logic is: if a visible sequencerElement was found (cached above), it will be handled.
                    // If not, this means it was closed, and 'sequencerContentChanged' won't reopen it unless explicitly designed to.
                }

                if (appServices.renderTimeline && typeof appServices.renderTimeline === 'function') {
                    appServices.renderTimeline();
                }
                break;
            // ... (other cases: muteChanged, soloChanged, armChanged, effectsListChanged, etc.) ...
            // (These other cases remain unchanged from the previous version you have)
            case 'muteChanged':
            case 'soloChanged':
            case 'armChanged':
                if (inspectorElement) {
                    const muteBtn = inspectorElement.querySelector(`#muteBtn-${track.id}`);
                    if (muteBtn) muteBtn.classList.toggle('muted', track.isMuted);
                    const soloBtn = inspectorElement.querySelector(`#soloBtn-${track.id}`);
                    if (soloBtn) soloBtn.classList.toggle('soloed', getSoloedTrackIdState() === track.id);
                    const armBtn = inspectorElement.querySelector(`#armInputBtn-${track.id}`);
                    if (armBtn) armBtn.classList.toggle('armed', getArmedTrackIdState() === track.id);
                }
                if (mixerElement && typeof updateMixerWindow === 'function') updateMixerWindow();
                break;
            case 'effectsListChanged':
                 if (effectsRackElement && typeof renderEffectsList === 'function') {
                    const listDiv = effectsRackElement.querySelector(`#effectsList-${track.id}`);
                    const controlsContainer = effectsRackElement.querySelector(`#effectControlsContainer-${track.id}`);
                    if (listDiv && controlsContainer) renderEffectsList(track, 'track', listDiv, controlsContainer);
                 }
                break;
            case 'samplerLoaded':
            case 'instrumentSamplerLoaded':
                if (inspectorElement) {
                    if (track.type === 'Sampler' && typeof drawWaveform === 'function' && typeof renderSamplePads === 'function' && typeof updateSliceEditorUI === 'function') {
                        drawWaveform(track); renderSamplePads(track); updateSliceEditorUI(track);
                    } else if (track.type === 'InstrumentSampler' && typeof drawInstrumentWaveform === 'function') {
                        drawInstrumentWaveform(track);
                    }
                    const dzContainerId = track.type === 'Sampler' ? `#dropZoneContainer-${track.id}-sampler` : `#dropZoneContainer-${track.id}-instrumentsampler`;
                    const dzContainer = inspectorElement.querySelector(dzContainerId);
                    if(dzContainer) {
                        const audioData = track.type === 'Sampler' ? track.samplerAudioData : track.instrumentSamplerSettings;
                        const inputId = track.type === 'Sampler' ? `fileInput-${track.id}` : `instrumentFileInput-${track.id}`;
                        dzContainer.innerHTML = createDropZoneHTML(track.id, inputId, track.type, null, {originalFileName: audioData?.fileName || audioData?.originalFileName, status: 'loaded'});
                        const fileInputEl = dzContainer.querySelector(`#${inputId}`);
                        const loadFn = appServices.loadSampleFile; 
                        if (fileInputEl && loadFn) fileInputEl.onchange = (e) => loadFn(e, track.id, track.type);
                        const newDropZoneDiv = dzContainer.querySelector('.drop-zone');
                        if (newDropZoneDiv && typeof setupGenericDropZoneListeners === 'function') {
                           setupGenericDropZoneListeners(newDropZoneDiv, track.id, track.type, null, appServices.loadSoundFromBrowserToTarget, appServices.loadSampleFile, appServices.getTrackById);
                        }
                    }
                }
                break;
            case 'drumPadLoaded':
                 if (inspectorElement && typeof updateDrumPadControlsUI === 'function' && typeof renderDrumSamplerPads === 'function') {
                    updateDrumPadControlsUI(track); renderDrumSamplerPads(track); 
                 }
                break;
            case 'sampleLoadError':
                if (inspectorElement) {
                    console.warn(`[Main UI Update] sampleLoadError for track ${trackId}, detail: ${detail}. Inspector UI update for dropzone needed.`);
                    if (track.type === 'DrumSampler' && typeof detail === 'number' && typeof updateDrumPadControlsUI === 'function') {
                        updateDrumPadControlsUI(track); 
                    } else if ((track.type === 'Sampler' || track.type === 'InstrumentSampler')) {
                        const dzKey = track.type === 'Sampler' ? 'sampler' : 'instrumentsampler';
                        const dzContainer = inspectorElement.querySelector(`#dropZoneContainer-${track.id}-${dzKey}`);
                        const audioDataSource = track.type === 'Sampler' ? track.samplerAudioData : track.instrumentSamplerSettings;
                        const inputIdForError = track.type === 'Sampler' ? `fileInput-${track.id}` : `instrumentFileInput-${track.id}`;

                        if(dzContainer && audioDataSource) {
                            dzContainer.innerHTML = createDropZoneHTML(track.id, inputIdForError, track.type, null, {originalFileName: audioDataSource.fileName || audioDataSource.originalFileName, status: 'error'});
                            const fileInputEl = dzContainer.querySelector(`#${inputIdForError}`);
                            const loadFn = appServices.loadSampleFile;
                            if (fileInputEl && loadFn) fileInputEl.onchange = (e) => loadFn(e, track.id, track.type);
                            const newDropZoneDiv = dzContainer.querySelector('.drop-zone');
                            if (newDropZoneDiv && typeof setupGenericDropZoneListeners === 'function') {
                               setupGenericDropZoneListeners(newDropZoneDiv, track.id, track.type, null, appServices.loadSoundFromBrowserToTarget, loadFn, appServices.getTrackById);
                            }
                        }
                    }
                }
                break;
            default:
                console.warn(`[Main UI Update] Unhandled reason: ${reason} for track ${trackId}`);
        }
    } catch (error) {
        console.error(`[Main handleTrackUIUpdate] Error updating UI for track ${trackId}, reason ${reason}:`, error);
    }
}

// ... (rest of main.js, including initializeSnugOS, updateMetersLoop, applyDesktopBackground, global event listeners, remains the same) ...
// (Make sure the full content of main.js from the previous turn is included here, with only the handleTrackUIUpdate modification)

// --- Application Initialization ---
async function initializeSnugOS() {
    console.log("[Main initializeSnugOS] Initializing SnugOS...");

    try {
        Object.keys(uiElementsCache).forEach(key => {
            const element = document.getElementById(key);
            if (element) {
                 uiElementsCache[key] = element;
            } else {
                if (['desktop', 'taskbar', 'notification-area', 'modalContainer'].includes(key)) {
                    console.warn(`[Main initializeSnugOS] Critical UI Element ID "${key}" not found in DOM.`);
                }
            }
        });

        try {
            const effectsRegistry = await import('./effectsRegistry.js');
            if (appServices.effectsRegistryAccess) {
                appServices.effectsRegistryAccess.AVAILABLE_EFFECTS = effectsRegistry.AVAILABLE_EFFECTS || {};
                appServices.effectsRegistryAccess.getEffectParamDefinitions = effectsRegistry.getEffectParamDefinitions || (() => []);
                appServices.effectsRegistryAccess.getEffectDefaultParams = effectsRegistry.getEffectDefaultParams || (() => ({}));
                appServices.effectsRegistryAccess.synthEngineControlDefinitions = effectsRegistry.synthEngineControlDefinitions || {};
                console.log("[Main initializeSnugOS] Effects registry dynamically imported and assigned.");
            } else {
                console.error("[Main initializeSnugOS] appServices.effectsRegistryAccess is not defined before assigning registry.");
            }
        } catch (registryError) {
            console.error("[Main initializeSnugOS] Failed to import effectsRegistry.js:", registryError);
            showSafeNotification("Critical error: Failed to load audio effects definitions.", 5000);
        }

        if (uiElementsCache.customBgInput) {
            uiElementsCache.customBgInput.addEventListener('change', handleCustomBackgroundUpload);
        }
        applyDesktopBackground(localStorage.getItem(DESKTOP_BACKGROUND_KEY));

        if (typeof initializeStateModule === 'function') initializeStateModule(appServices); else console.error("initializeStateModule is not a function");
        if (typeof initializeUIModule === 'function') initializeUIModule(appServices); else console.error("initializeUIModule is not a function");
        if (typeof initializeAudioModule === 'function') initializeAudioModule(appServices); else console.error("initializeAudioModule is not a function");
        if (typeof initializeEventHandlersModule === 'function') initializeEventHandlersModule(appServices); else console.error("initializeEventHandlersModule is not a function");

        if (typeof initializePrimaryEventListeners === 'function') {
             initializePrimaryEventListeners(appServices);
        } else { console.error("initializePrimaryEventListeners is not a function");}

        if (typeof openGlobalControlsWindow === 'function') {
            openGlobalControlsWindow((elements) => {
                if (elements) {
                    uiElementsCache.playBtnGlobal = elements.playBtnGlobal;
                    uiElementsCache.recordBtnGlobal = elements.recordBtnGlobal;
                    uiElementsCache.stopBtnGlobal = elements.stopBtnGlobal; 
                    uiElementsCache.tempoGlobalInput = elements.tempoGlobalInput;
                    uiElementsCache.midiInputSelectGlobal = elements.midiInputSelectGlobal;
                    uiElementsCache.masterMeterContainerGlobal = elements.masterMeterContainerGlobal;
                    uiElementsCache.masterMeterBarGlobal = elements.masterMeterBarGlobal;
                    uiElementsCache.midiIndicatorGlobal = elements.midiIndicatorGlobal;
                    uiElementsCache.keyboardIndicatorGlobal = elements.keyboardIndicatorGlobal;
                    uiElementsCache.playbackModeToggleBtnGlobal = elements.playbackModeToggleBtnGlobal;

                    if (typeof attachGlobalControlEvents === 'function') attachGlobalControlEvents(elements); else console.error("attachGlobalControlEvents is not a function");
                    if (typeof setupMIDI === 'function') setupMIDI(); else console.error("setupMIDI is not a function");
                } else { console.warn("Global controls elements not received in onReadyCallback.");}
            }, null);
        } else { console.error("openGlobalControlsWindow is not a function");}

        if (Constants.soundLibraries && typeof fetchSoundLibrary === 'function') {
            Object.entries(Constants.soundLibraries).forEach(([name, url]) => fetchSoundLibrary(name, url, true)); 
        }

        if (appServices.openTimelineWindow && typeof appServices.openTimelineWindow === 'function') {
            appServices.openTimelineWindow();
        } else { console.warn("appServices.openTimelineWindow not available to open by default."); }

        requestAnimationFrame(updateMetersLoop);
        if (appServices.updateUndoRedoButtonsUI) appServices.updateUndoRedoButtonsUI(null, null);
        if (appServices.onPlaybackModeChange && typeof getPlaybackModeState === 'function') {
            appServices.onPlaybackModeChange(getPlaybackModeState());
        }

        showSafeNotification(`Welcome to SnugOS ${Constants.APP_VERSION}!`, 2500);
        console.log(`[Main initializeSnugOS] SnugOS Version ${Constants.APP_VERSION} Initialized.`);

    } catch (initError) {
        console.error("CRITICAL ERROR during SnugOS Initialization:", initError);
        showSafeNotification("A critical error occurred during application startup. Please refresh.", 7000);
        const body = document.body;
        if (body) {
            body.innerHTML = `<div style="padding: 20px; text-align: center; font-family: sans-serif; color: #ccc; background-color: #101010; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;"><h1>Initialization Error</h1><p>SnugOS could not start due to a critical error. Please check the console for details and try refreshing the page.</p><p style="font-size: 0.8em; margin-top: 20px;">Error: ${initError.message}</p></div>`;
        }
    }
}

function updateMetersLoop() {
    try {
        if (typeof updateMeters === 'function') {
            const mixerWindow = getWindowByIdState ? getWindowByIdState('mixer') : null;
            const mixerMasterMeterBar = mixerWindow?.element && !mixerWindow.isMinimized ? mixerWindow.element.querySelector('#mixerMasterMeterBar') : null;
            const tracks = getTracksState ? getTracksState() : [];
            updateMeters(uiElementsCache.masterMeterBarGlobal, mixerMasterMeterBar, tracks);
        }
        if (typeof updatePlayheadPosition === 'function') {
            updatePlayheadPosition();
        }
    } catch (loopError) {
        console.warn("[Main updateMetersLoop] Error in UI update loop:", loopError);
    }
    requestAnimationFrame(updateMetersLoop);
}

function applyDesktopBackground(imageUrl) {
    if (uiElementsCache.desktop) {
        try {
            if (imageUrl) {
                uiElementsCache.desktop.style.backgroundImage = `url('${imageUrl}')`;
                uiElementsCache.desktop.style.backgroundSize = 'cover';
                uiElementsCache.desktop.style.backgroundPosition = 'center center';
                uiElementsCache.desktop.style.backgroundRepeat = 'no-repeat';
                uiElementsCache.desktop.style.backgroundColor = '';
            } else {
                uiElementsCache.desktop.style.backgroundImage = '';
                uiElementsCache.desktop.style.backgroundColor = Constants.defaultDesktopBg || '#101010';
            }
        } catch (e) {
            console.error("Error applying desktop background style:", e);
        }
    } else {
        console.warn("Desktop element not found in cache for applying background.");
    }
}


// --- Global Event Listeners ---
window.addEventListener('load', initializeSnugOS);
window.addEventListener('beforeunload', (e) => {
    const tracksExist = getTracksState && getTracksState().length > 0;
    const undoStackExists = getUndoStackState && getUndoStackState().length > 0;

    if (tracksExist || undoStackExists) {
        e.preventDefault(); 
        e.returnValue = ''; 
        return "You have unsaved changes. Are you sure you want to leave?"; 
    }
});

console.log(`SCRIPT EXECUTION FINISHED - SnugOS (main.js - Version ${Constants.APP_VERSION})`);
