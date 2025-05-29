// js/ui.js
// ... (other imports and code at the top of ui.js remain the same) ...

// --- MODIFIED openTrackSequencerWindow ---
 function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) {
    const track = typeof window.getTrackById === 'function' ? window.getTrackById(trackId) : null;
    if (!track) {
        console.error(`[UI] Track ${trackId} not found for sequencer.`);
        return null;
    }

    const windowId = `sequencerWin-${trackId}`;

    if (forceRedraw && window.openWindows[windowId]) {
        console.log(`[UI - SeqWindow] forceRedraw true for existing window ${windowId}. Closing it first to ensure content refresh.`);
        try {
            window.openWindows[windowId].close(true); 
        } catch (e) {
            console.warn(`[UI - SeqWindow] Error closing existing window during forceRedraw for ${windowId}:`, e);
        }
    }

    if (window.openWindows[windowId] && !forceRedraw && !savedState) {
        window.openWindows[windowId].restore();
        if (typeof window.setActiveSequencerTrackId === 'function') window.setActiveSequencerTrackId(trackId);
        return window.openWindows[windowId];
    }

    let rows, rowLabels;
    const numBars = Math.max(1, track.sequenceLength / Constants.STEPS_PER_BAR);

    if (track.type === 'Synth' || track.type === 'InstrumentSampler') {
        rows = Constants.synthPitches.length;
        rowLabels = Constants.synthPitches;
    } else if (track.type === 'Sampler') {
        rows = track.slices.length > 0 ? track.slices.length : Constants.numSlices;
        rowLabels = Array.from({ length: rows }, (_, i) => `Slice ${i + 1}`);
    } else if (track.type === 'DrumSampler') {
        rows = Constants.numDrumSamplerPads;
        rowLabels = Array.from({ length: rows }, (_, i) => `Pad ${i + 1}`);
    } else {
        rows = 0;
        rowLabels = [];
    }

    const contentDOM = buildSequencerContentDOM(track, rows, rowLabels, numBars);
    const seqOptions = {
        width: Math.min(900, (document.getElementById('desktop')?.offsetWidth || 900) - 40),
        height: 400,
        minWidth: 400,
        minHeight: 250,
        initialContentKey: windowId,
        onCloseCallback: () => {
            if (track) track.sequencerWindow = null;
            if (typeof window.getActiveSequencerTrackId === 'function' && window.getActiveSequencerTrackId() === trackId && typeof window.setActiveSequencerTrackId === 'function') {
                window.setActiveSequencerTrackId(null);
            }
        }
    };

    if (savedState) {
        seqOptions.x = parseInt(savedState.left);
        seqOptions.y = parseInt(savedState.top);
        seqOptions.width = parseInt(savedState.width);
        seqOptions.height = parseInt(savedState.height);
        seqOptions.zIndex = savedState.zIndex;
        if (savedState.isMinimized) seqOptions.isMinimized = true;
    }

    const sequencerWindow = window.createWindow(windowId, `Sequencer: ${track.name}`, contentDOM, seqOptions);

    if (sequencerWindow && sequencerWindow.element) {
        track.sequencerWindow = sequencerWindow;
        if (typeof window.setActiveSequencerTrackId === 'function') window.setActiveSequencerTrackId(trackId);

        const grid = sequencerWindow.element.querySelector('.sequencer-grid-layout'); 
        const controlsDiv = sequencerWindow.element.querySelector('.sequencer-container .controls'); 

        const sequencerContextMenuHandler = (event) => {
            event.preventDefault();
            event.stopPropagation();
        
            const currentTrackForMenu = typeof window.getTrackById === 'function' ? window.getTrackById(track.id) : null;
            if (!currentTrackForMenu) {
                console.error("[UI - Sequencer Context] Could not get current track for menu.");
                return;
            }
        
            const menuItems = [
                {
                    label: "Copy Sequence",
                    action: () => {
                        if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Copy Sequence from ${currentTrackForMenu.name}`);
                        const sequenceDataCopy = currentTrackForMenu.sequenceData ? JSON.parse(JSON.stringify(currentTrackForMenu.sequenceData)) : [];
                        
                        window.clipboardData = {
                            type: 'sequence', 
                            sourceTrackType: currentTrackForMenu.type,
                            data: sequenceDataCopy, 
                            sequenceLength: currentTrackForMenu.sequenceLength,
                        };
                        showNotification(`Sequence for "${currentTrackForMenu.name}" copied.`, 2000);
                        console.log('[UI - Sequencer Context] Copied sequence:', window.clipboardData);
                    }
                },
                {
                    label: "Paste Sequence",
                    action: () => {
                        if (!window.clipboardData || window.clipboardData.type !== 'sequence' || !window.clipboardData.data) {
                            showNotification("Clipboard is empty or does not contain full sequence data.", 2000);
                            return;
                        }
                        if (window.clipboardData.sourceTrackType !== currentTrackForMenu.type) {
                            showNotification(`Cannot paste sequence: Track types do not match (Source: ${window.clipboardData.sourceTrackType}, Target: ${currentTrackForMenu.type}).`, 3000);
                            return;
                        }
        
                        if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Paste Sequence into ${currentTrackForMenu.name}`);
                        
                        currentTrackForMenu.sequenceData = JSON.parse(JSON.stringify(window.clipboardData.data));
                        currentTrackForMenu.sequenceLength = window.clipboardData.sequenceLength;
        
                        currentTrackForMenu.setSequenceLength(currentTrackForMenu.sequenceLength, true); 
                        
                        if(typeof window.openTrackSequencerWindow === 'function'){
                            console.log(`[UI - Sequencer Context] Forcing redraw of sequencer for track ${currentTrackForMenu.id} after paste.`);
                            window.openTrackSequencerWindow(currentTrackForMenu.id, true, null); 
                        }
                        showNotification(`Sequence pasted into "${currentTrackForMenu.name}".`, 2000);
                    },
                    disabled: (!window.clipboardData || window.clipboardData.type !== 'sequence' || !window.clipboardData.data || (window.clipboardData.sourceTrackType && currentTrackForMenu && window.clipboardData.sourceTrackType !== currentTrackForMenu.type))
                },
                { separator: true },
                {
                    label: "Erase Sequence",
                    action: () => {
                        if (!currentTrackForMenu) return;
                        if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Erase Sequence for ${currentTrackForMenu.name}`);
                        
                        let numRowsForErase = 0;
                        if (currentTrackForMenu.type === 'Synth' || currentTrackForMenu.type === 'InstrumentSampler') {
                            numRowsForErase = Constants.synthPitches.length;
                        } else if (currentTrackForMenu.type === 'Sampler') {
                            numRowsForErase = currentTrackForMenu.slices.length > 0 ? currentTrackForMenu.slices.length : Constants.numSlices;
                        } else if (currentTrackForMenu.type === 'DrumSampler') {
                            numRowsForErase = Constants.numDrumSamplerPads;
                        }
                        
                        currentTrackForMenu.sequenceData = Array(numRowsForErase).fill(null).map(() => Array(currentTrackForMenu.sequenceLength).fill(null));
                        
                        // This call is crucial to update the Tone.Sequence with the empty data.
                        currentTrackForMenu.setSequenceLength(currentTrackForMenu.sequenceLength, true); 

                        if(typeof window.openTrackSequencerWindow === 'function'){
                            console.log(`[UI - Sequencer Context] Forcing redraw of sequencer for track ${currentTrackForMenu.id} after erase.`);
                            window.openTrackSequencerWindow(currentTrackForMenu.id, true, null);
                        }
                        showNotification(`Sequence erased for "${currentTrackForMenu.name}".`, 2000);
                        console.log('[UI - Sequencer Context] Erased sequence for track:', currentTrackForMenu.id);
                    }
                }
            ];
            
            if (typeof createContextMenu === 'function') {
                createContextMenu(event, menuItems);
            } else {
                console.error("[UI - Sequencer Context] createContextMenu function is not available.");
            }
        };

        if (grid) {
            grid.addEventListener('contextmenu', sequencerContextMenuHandler);
        } else {
            console.error(`[UI - openTrackSequencerWindow] Sequencer grid layout element not found for track ${track.id} to attach context menu.`);
        }
        if (controlsDiv) { 
            controlsDiv.addEventListener('contextmenu', sequencerContextMenuHandler);
        }  else {
            console.error(`[UI - openTrackSequencerWindow] Sequencer controls div element not found for track ${track.id} to attach context menu.`);
        }


        if (grid) { 
            grid.addEventListener('click', (e) => {
                const targetCell = e.target.closest('.sequencer-step-cell');
                if (targetCell) {
                    const row = parseInt(targetCell.dataset.row);
                    const col = parseInt(targetCell.dataset.col);

                    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) { 
                        if (!track.sequenceData[row]) track.sequenceData[row] = Array(track.sequenceLength).fill(null);
                        const currentStepData = track.sequenceData[row][col];
                        const isActive = !(currentStepData && currentStepData.active);

                        if (typeof window.captureStateForUndo === 'function') window.captureStateForUndo(`Toggle Step (${row + 1},${col + 1}) on ${track.name}`);
                        track.sequenceData[row][col] = isActive ? { active: true, velocity: Constants.defaultVelocity } : null;

                        if(typeof window.updateSequencerCellUI === 'function') {
                            window.updateSequencerCellUI(targetCell, track.type, isActive);
                        }
                    }
                }
            });
        }
        const lengthInput = sequencerWindow.element.querySelector(`#seqLengthInput-${track.id}`);
        if (lengthInput) {
            lengthInput.addEventListener('change', (e) => {
                const newNumBarsInput = parseInt(e.target.value);
                if (!isNaN(newNumBarsInput) && newNumBarsInput >= 1 && newNumBarsInput <= (Constants.MAX_BARS || 16)) { 
                    track.setSequenceLength(newNumBarsInput * Constants.STEPS_PER_BAR);
                } else {
                    e.target.value = track.sequenceLength / Constants.STEPS_PER_BAR; 
                }
            });
        }

    } else {
        if (track) track.sequencerWindow = null;
        return null;
    }
    return sequencerWindow;
}
// --- END MODIFIED openTrackSequencerWindow ---

// ... (rest of ui.js, including drawWaveform, drawInstrumentWaveform, and all other functions) ...
// Ensure all previously defined functions like buildTrackInspectorContentDOM, openMixerWindow, etc., are still present below here.
// For brevity, I'm not re-listing them all, but they should be in your file.

// --- Waveform Drawing Functions ---
function drawWaveform(track) { 
    if (!track || !track.waveformCanvasCtx || !track.audioBuffer || !track.audioBuffer.loaded) {
        if (track && track.waveformCanvasCtx) { 
            const canvas = track.waveformCanvasCtx.canvas;
            track.waveformCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
             track.waveformCanvasCtx.fillStyle = track.waveformCanvasCtx.canvas.classList.contains('dark') ? '#334155' : '#e0e0e0'; 
             track.waveformCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
             track.waveformCanvasCtx.fillStyle = track.waveformCanvasCtx.canvas.classList.contains('dark') ? '#94a3b8' : '#a0a0a0'; 
             track.waveformCanvasCtx.textAlign = 'center';
             track.waveformCanvasCtx.fillText('No audio loaded or processed', canvas.width / 2, canvas.height / 2);
        }
        return;
    }
    const canvas = track.waveformCanvasCtx.canvas;
    const ctx = track.waveformCanvasCtx;
    const buffer = track.audioBuffer.get(); 
    const data = buffer.getChannelData(0); 
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;

    ctx.fillStyle = ctx.canvas.classList.contains('dark') ? '#1e293b' : '#f0f0f0'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = ctx.canvas.classList.contains('dark') ? '#60a5fa' : '#3b82f6'; 

    ctx.beginPath();
    ctx.moveTo(0, amp);
    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0; let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.lineTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp); 
    }
    ctx.lineTo(canvas.width, amp);
    ctx.stroke();

    track.slices.forEach((slice, index) => {
        if (slice.duration <= 0) return;
        const startX = (slice.offset / buffer.duration) * canvas.width;
        const endX = ((slice.offset + slice.duration) / buffer.duration) * canvas.width;
        ctx.fillStyle = index === track.selectedSliceForEdit ? 'rgba(255, 0, 0, 0.3)' : (ctx.canvas.classList.contains('dark') ? 'rgba(59, 130, 246, 0.2)' : 'rgba(0, 0, 255, 0.15)');
        ctx.fillRect(startX, 0, endX - startX, canvas.height);
        ctx.strokeStyle = index === track.selectedSliceForEdit ? 'rgba(255,0,0,0.7)' : (ctx.canvas.classList.contains('dark') ? 'rgba(96, 165, 250, 0.5)' : 'rgba(0,0,255,0.4)');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(startX, 0); ctx.lineTo(startX, canvas.height);
        ctx.moveTo(endX, 0); ctx.lineTo(endX, canvas.height);
        ctx.stroke();
        ctx.fillStyle = index === track.selectedSliceForEdit ? '#cc0000' : (ctx.canvas.classList.contains('dark') ? '#93c5fd' : '#0000cc');
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`S${index + 1}`, startX + 2, 10);
    });
}

function drawInstrumentWaveform(track) { 
    if (!track || !track.instrumentWaveformCanvasCtx || !track.instrumentSamplerSettings.audioBuffer || !track.instrumentSamplerSettings.audioBuffer.loaded) {
         if (track && track.instrumentWaveformCanvasCtx) { 
            const canvas = track.instrumentWaveformCanvasCtx.canvas;
            track.instrumentWaveformCanvasCtx.clearRect(0, 0, canvas.width, canvas.height);
             track.instrumentWaveformCanvasCtx.fillStyle = canvas.classList.contains('dark') ? '#334155' : '#e0e0e0';
             track.instrumentWaveformCanvasCtx.fillRect(0, 0, canvas.width, canvas.height);
             track.instrumentWaveformCanvasCtx.fillStyle = canvas.classList.contains('dark') ? '#94a3b8' : '#a0a0a0';
             track.instrumentWaveformCanvasCtx.textAlign = 'center';
             track.instrumentWaveformCanvasCtx.fillText('No audio loaded', canvas.width / 2, canvas.height / 2);
        }
        return;
    }
    const canvas = track.instrumentWaveformCanvasCtx.canvas;
    const ctx = track.instrumentWaveformCanvasCtx;
    const buffer = track.instrumentSamplerSettings.audioBuffer.get();
    const data = buffer.getChannelData(0);
    const step = Math.ceil(data.length / canvas.width);
    const amp = canvas.height / 2;

    ctx.fillStyle = canvas.classList.contains('dark') ? '#1e293b' : '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = canvas.classList.contains('dark') ? '#34d399' : '#10b981'; 
    ctx.beginPath();
    ctx.moveTo(0, amp);
    for (let i = 0; i < canvas.width; i++) {
        let min = 1.0; let max = -1.0;
        for (let j = 0; j < step; j++) {
            const datum = data[(i * step) + j];
            if (datum < min) min = datum;
            if (datum > max) max = datum;
        }
        ctx.lineTo(i, (1 + min) * amp);
        ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.lineTo(canvas.width, amp);
    ctx.stroke();

    if (track.instrumentSamplerSettings.loop) {
        const loopStartX = (track.instrumentSamplerSettings.loopStart / buffer.duration) * canvas.width;
        const loopEndX = (track.instrumentSamplerSettings.loopEnd / buffer.duration) * canvas.width;
        ctx.fillStyle = canvas.classList.contains('dark') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(0, 255, 0, 0.2)';
        ctx.fillRect(loopStartX, 0, loopEndX - loopStartX, canvas.height);
        ctx.strokeStyle = canvas.classList.contains('dark') ? 'rgba(52, 211, 153, 0.6)' : 'rgba(0,200,0,0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(loopStartX, 0); ctx.lineTo(loopStartX, canvas.height);
        ctx.moveTo(loopEndX, 0); ctx.lineTo(loopEndX, canvas.height);
        ctx.stroke();
    }
}
// --- END Waveform Drawing Functions ---


// Ensure all other functions (renderSamplePads, updateSliceEditorUI, etc.) are here...
function renderSamplePads(track) { 
    const inspector = track.inspectorWindow?.element;
    if (!inspector || track.type !== 'Sampler') return;
    const padsContainer = inspector.querySelector(`#samplePadsContainer-${track.id}`);
    if (!padsContainer) return;
    padsContainer.innerHTML = ''; 

    track.slices.forEach((slice, index) => {
        const pad = document.createElement('button');
        pad.className = `sample-pad p-2 border rounded text-xs h-12 flex items-center justify-center dark:border-slate-500 dark:text-slate-300
                         ${track.selectedSliceForEdit === index ? 'bg-blue-200 border-blue-400 dark:bg-blue-700 dark:border-blue-500' : 'bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500'}
                         ${(!track.audioBuffer || !track.audioBuffer.loaded || slice.duration <= 0) ? 'opacity-50' : ''}`;
        pad.textContent = `S${index + 1}`;
        pad.title = `Slice ${index + 1}`;
        if (!track.audioBuffer || !track.audioBuffer.loaded || slice.duration <= 0) {
            pad.disabled = true;
        }

        pad.addEventListener('click', () => {
            track.selectedSliceForEdit = index;
            if (typeof window.playSlicePreview === 'function') window.playSlicePreview(track.id, index);
            renderSamplePads(track); 
            if (typeof updateSliceEditorUI === 'function') updateSliceEditorUI(track); 
        });
        padsContainer.appendChild(pad);
    });
}

function updateSliceEditorUI(track) { 
    const inspector = track.inspectorWindow?.element;
    if (!inspector || track.type !== 'Sampler' || !track.slices || track.slices.length === 0) return;

    const selectedInfo = inspector.querySelector(`#selectedSliceInfo-${track.id}`);
    if (selectedInfo) selectedInfo.textContent = track.selectedSliceForEdit + 1;

    const slice = track.slices[track.selectedSliceForEdit];
    if (!slice) return; 

    if (track.inspectorControls.sliceVolume) track.inspectorControls.sliceVolume.setValue(slice.volume || 0.7);
    if (track.inspectorControls.slicePitch) track.inspectorControls.slicePitch.setValue(slice.pitchShift || 0);

    const loopToggleBtn = inspector.querySelector(`#sliceLoopToggle-${track.id}`);
    if (loopToggleBtn) {
        loopToggleBtn.textContent = slice.loop ? 'Loop: ON' : 'Loop: OFF';
        loopToggleBtn.classList.toggle('active', slice.loop);
    }
    const reverseToggleBtn = inspector.querySelector(`#sliceReverseToggle-${track.id}`);
    if (reverseToggleBtn) {
        reverseToggleBtn.textContent = slice.reverse ? 'Rev: ON' : 'Rev: OFF';
        reverseToggleBtn.classList.toggle('active', slice.reverse);
    }

    const env = slice.envelope || { attack: 0.01, decay: 0.1, sustain: 1.0, release: 0.1 };
    if (track.inspectorControls.sliceEnvAttack) track.inspectorControls.sliceEnvAttack.setValue(env.attack);
    if (track.inspectorControls.sliceEnvDecay) track.inspectorControls.sliceEnvDecay.setValue(env.decay);
    if (track.inspectorControls.sliceEnvSustain) track.inspectorControls.sliceEnvSustain.setValue(env.sustain);
    if (track.inspectorControls.sliceEnvRelease) track.inspectorControls.sliceEnvRelease.setValue(env.release);
}

function renderDrumSamplerPads(track) { 
    const inspector = track.inspectorWindow?.element;
    if (!inspector || track.type !== 'DrumSampler') return;
    const padsContainer = inspector.querySelector(`#drumPadsGridContainer-${track.id}`);
    if (!padsContainer) return;
    padsContainer.innerHTML = ''; 

    track.drumSamplerPads.forEach((padData, index) => {
        const padEl = document.createElement('button');
        padEl.className = `drum-pad p-2 border rounded text-xs h-12 flex items-center justify-center dark:border-slate-500 dark:text-slate-300
                         ${track.selectedDrumPadForEdit === index ? 'bg-blue-200 border-blue-400 dark:bg-blue-700 dark:border-blue-500' : 'bg-gray-200 hover:bg-gray-300 dark:bg-slate-600 dark:hover:bg-slate-500'}
                         ${(!padData.audioBufferDataURL && !padData.dbKey && padData.status !== 'loaded') ? 'opacity-60' : ''}`; 
        padEl.textContent = `Pad ${index + 1}`;
        padEl.title = padData.originalFileName || `Pad ${index + 1}`;

        if (padData.status === 'missing' || padData.status === 'error') {
            padEl.classList.add(padData.status === 'missing' ? 'border-yellow-500' : 'border-red-500');
            padEl.classList.add('text-black', 'dark:text-white'); 
        }


        padEl.addEventListener('click', () => {
            track.selectedDrumPadForEdit = index;
            if (typeof window.playDrumSamplerPadPreview === 'function' && padData.status === 'loaded') {
                 window.playDrumSamplerPadPreview(track.id, index);
            } else if (padData.status !== 'loaded') {
                showNotification(`Sample for Pad ${index+1} not loaded. Click to load.`, 2000);
            }
            renderDrumSamplerPads(track); 
            if (typeof updateDrumPadControlsUI === 'function') updateDrumPadControlsUI(track); 
        });
        padsContainer.appendChild(padEl);
    });
}

function highlightPlayingStep(col, trackType, gridElement) { 
    if (!gridElement) return;
    const previouslyPlaying = gridElement.querySelector('.sequencer-step-cell.playing');
    if (previouslyPlaying) previouslyPlaying.classList.remove('playing');

    const currentCells = gridElement.querySelectorAll(`.sequencer-step-cell[data-col="${col}"]`);
    currentCells.forEach(cell => cell.classList.add('playing'));
}


export {
    createKnob,
    buildTrackInspectorContentDOM,
    openTrackInspectorWindow,
    initializeCommonInspectorControls,
    initializeTypeSpecificInspectorControls, 
    applySliceEdits, 
    drawWaveform, 
    drawInstrumentWaveform, 
    renderEffectsList,
    renderEffectControls, 
    openTrackEffectsRackWindow,
    openMasterEffectsRackWindow,
    openGlobalControlsWindow,
    openSoundBrowserWindow,
    updateSoundBrowserDisplayForLibrary,
    renderSoundBrowserDirectory,
    openMixerWindow,
    updateMixerWindow,
    renderMixer,
    buildSequencerContentDOM,
    openTrackSequencerWindow,
    renderSamplePads,
    updateSliceEditorUI,
    updateDrumPadControlsUI,
    renderDrumSamplerPads,
    highlightPlayingStep
};
