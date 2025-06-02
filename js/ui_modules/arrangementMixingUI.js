// js/ui_modules/arrangementMixingUI.js
import { SnugWindow } from '../SnugWindow.js';
import { showNotification, createContextMenu, showConfirmationDialog } from '../utils.js';
import * as Constants from '../constants.js';
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
} from '../eventHandlers.js';
import { getTracksState } from '../state.js';

let localAppServices = {};

export function initializeArrangementMixingUI(appServicesFromMain) {
    localAppServices = appServicesFromMain;
}

// --- Sequencer Window ---
export function buildSequencerContentDOM(track, rows, rowLabels, numBars) {
    const stepsPerBar = Constants.STEPS_PER_BAR;
    const totalSteps = Number.isFinite(numBars) && numBars > 0 ? numBars * stepsPerBar : Constants.defaultStepsPerBar;

    let html = `<div class="sequencer-container p-1 text-xs overflow-auto h-full dark:bg-slate-900 dark:text-slate-300"> <div class="controls sequencer-controls mb-1 flex justify-between items-center sticky top-0 left-0 bg-gray-200 dark:bg-slate-800 p-1 z-30 border-b dark:border-slate-700"> <span class="font-semibold">${track.name} - ${numBars} Bar${numBars > 1 ? 's' : ''} (${totalSteps} steps)</span> <div> <label for="seqLengthInput-${track.id}">Bars: </label> <input type="number" id="seqLengthInput-${track.id}" value="${numBars}" min="1" max="${Constants.MAX_BARS || 16}" class="w-12 p-0.5 border rounded text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"> </div> </div>`;
    html += `<div class="sequencer-grid-layout" style="display: grid; grid-template-columns: 50px repeat(${totalSteps}, 20px); grid-auto-rows: 20px; gap: 0px; width: fit-content; position: relative; top: 0; left: 0;"> <div class="sequencer-header-cell sticky top-0 left-0 z-20 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700"></div>`;
    for (let i = 0; i < totalSteps; i++) { html += `<div class="sequencer-header-cell sticky top-0 z-10 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700 flex items-center justify-center text-[10px] text-gray-500 dark:text-slate-400">${(i % stepsPerBar === 0) ? (Math.floor(i / stepsPerBar) + 1) : ((i % 4 === 0) ? '&#x2022;' : '')}</div>`; }

    const activeSequence = track.getActiveSequence();
    const sequenceData = activeSequence ? activeSequence.data : [];

    for (let i = 0; i < rows; i++) {
        let labelText = rowLabels[i] || `R${i + 1}`; if (labelText.length > 6) labelText = labelText.substring(0,5) + "..";
        html += `<div class="sequencer-label-cell sticky left-0 z-10 bg-gray-200 dark:bg-slate-800 border-r border-b dark:border-slate-700 flex items-center justify-end pr-1 text-[10px]" title="${rowLabels[i] || ''}">${labelText}</div>`;
        for (let j = 0; j < totalSteps; j++) {
            const stepData = sequenceData[i]?.[j];
            let activeClass = '';
            if (stepData?.active) { if (track.type === 'Synth') activeClass = 'active-synth'; else if (track.type === 'Sampler') activeClass = 'active-sampler'; else if (track.type === 'DrumSampler') activeClass = 'active-drum-sampler'; else if (track.type === 'InstrumentSampler') activeClass = 'active-instrument-sampler'; }
            let beatBlockClass = (Math.floor((j % stepsPerBar) / 4) % 2 === 0) ? 'bg-gray-50 dark:bg-slate-700' : 'bg-white dark:bg-slate-750';
            if (j % stepsPerBar === 0 && j > 0) beatBlockClass += ' border-l-2 border-l-gray-400 dark:border-l-slate-600';
            else if (j > 0 && j % (stepsPerBar / 2) === 0) beatBlockClass += ' border-l-gray-300 dark:border-l-slate-650';
            else if (j > 0 && j % (stepsPerBar / 4) === 0) beatBlockClass += ' border-l-gray-200 dark:border-l-slate-675';
            html += `<div class="sequencer-step-cell ${activeClass} ${beatBlockClass} border-r border-b border-gray-200 dark:border-slate-600" data-row="${i}" data-col="${j}" title="R${i+1},S${j+1}"></div>`;
        }
    }
    html += `</div></div>`; return html;
}

export function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) {
    console.log(`[UI openTrackSequencerWindow] Called for track ${trackId}. Force redraw: ${forceRedraw}, SavedState:`, savedState);
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track || track.type === 'Audio') {
        console.warn(`[UI openTrackSequencerWindow] Track ${trackId} not found or is Audio type. Aborting.`);
        return null;
    }
    const windowId = `sequencerWin-${trackId}`;
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();

    if (forceRedraw && openWindows.has(windowId)) {
        const existingWindow = openWindows.get(windowId);
        if (existingWindow && typeof existingWindow.close === 'function') {
            try {
                console.log(`[UI openTrackSequencerWindow] Force redraw: Closing existing window ${windowId}`);
                existingWindow.close(true);
            } catch (e) {console.warn(`[UI openTrackSequencerWindow] Error closing existing sequencer window for redraw for track ${trackId}:`, e)}
        } else {
            console.log(`[UI openTrackSequencerWindow] Force redraw: Window ${windowId} found in map but no close method or not an instance, or map is missing.`);
        }
    }
    if (openWindows.has(windowId) && !forceRedraw && !savedState) {
        const win = openWindows.get(windowId);
        if (win && typeof win.restore === 'function') {
            console.log(`[UI openTrackSequencerWindow] Restoring existing window ${windowId}`);
            win.restore();
            if (localAppServices.setActiveSequencerTrackId) localAppServices.setActiveSequencerTrackId(trackId);
            return win;
        } else {
            console.warn(`[UI openTrackSequencerWindow] Window ${windowId} in map but cannot be restored.`);
        }
    }

    const activeSequence = track.getActiveSequence();
    if (!activeSequence) {
        console.error(`[UI openTrackSequencerWindow] Track ${trackId} has no active sequence. Cannot open sequencer.`);
        return null;
    }

    let rows, rowLabels;
    const numBars = activeSequence.length > 0 ? Math.max(1, activeSequence.length / Constants.STEPS_PER_BAR) : 1;

    if (track.type === 'Synth' || track.type === 'InstrumentSampler') { rows = Constants.synthPitches.length; rowLabels = Constants.synthPitches; }
    else if (track.type === 'Sampler') { rows = track.slices.length > 0 ? track.slices.length : Constants.numSlices; rowLabels = Array.from({ length: rows }, (_, i) => `Slice ${i + 1}`); }
    else if (track.type === 'DrumSampler') { rows = Constants.numDrumSamplerPads; rowLabels = Array.from({ length: rows }, (_, i) => `Pad ${i + 1}`); }
    else { rows = 0; rowLabels = []; }

    const contentDOM = buildSequencerContentDOM(track, rows, rowLabels, numBars);

    const desktopEl = localAppServices.uiElementsCache?.desktop || document.getElementById('desktop');
    const safeDesktopWidth = (desktopEl && typeof desktopEl.offsetWidth === 'number' && desktopEl.offsetWidth > 0)
                           ? desktopEl.offsetWidth
                           : 1024;
    console.log(`[UI openTrackSequencerWindow] For track ${trackId}: Desktop element: ${desktopEl ? 'found' : 'NOT found'}, offsetWidth: ${desktopEl?.offsetWidth}, safeDesktopWidth: ${safeDesktopWidth}, NumBars: ${numBars}`);


    let calculatedWidth = Math.max(400, Math.min(900, safeDesktopWidth - 40));
    let calculatedHeight = 400;

    if (!Number.isFinite(calculatedWidth) || calculatedWidth <= 0) {
        console.warn(`[UI openTrackSequencerWindow] Invalid calculatedWidth (${calculatedWidth}) for track ${trackId}, defaulting to 600.`);
        calculatedWidth = 600;
    }
    if (!Number.isFinite(calculatedHeight) || calculatedHeight <= 0) {
        console.warn(`[UI openTrackSequencerWindow] Invalid calculatedHeight (${calculatedHeight}) for track ${trackId}, defaulting to 400.`);
        calculatedHeight = 400;
    }

    const seqOptions = {
        width: calculatedWidth,
        height: calculatedHeight,
        minWidth: 400,
        minHeight: 250,
        initialContentKey: windowId,
        onCloseCallback: () => { if (localAppServices.getActiveSequencerTrackId && localAppServices.getActiveSequencerTrackId() === trackId && localAppServices.setActiveSequencerTrackId) localAppServices.setActiveSequencerTrackId(null); }
    };
    if (savedState) {
        if (Number.isFinite(parseInt(savedState.left,10))) seqOptions.x = parseInt(savedState.left,10);
        if (Number.isFinite(parseInt(savedState.top,10))) seqOptions.y = parseInt(savedState.top,10);
        if (Number.isFinite(parseInt(savedState.width,10)) && parseInt(savedState.width,10) >= seqOptions.minWidth) seqOptions.width = parseInt(savedState.width,10);
        if (Number.isFinite(parseInt(savedState.height,10)) && parseInt(savedState.height,10) >= seqOptions.minHeight) seqOptions.height = parseInt(savedState.height,10);
        if (Number.isFinite(parseInt(savedState.zIndex))) seqOptions.zIndex = parseInt(savedState.zIndex);
        seqOptions.isMinimized = savedState.isMinimized;
    }

    console.log(`[UI openTrackSequencerWindow] For track ${trackId}: Creating window with options:`, JSON.stringify(seqOptions));
    const sequencerWindow = localAppServices.createWindow(windowId, `Sequencer: ${track.name} - ${activeSequence.name}`, contentDOM, seqOptions);

    if (sequencerWindow?.element) {
        const allCells = Array.from(sequencerWindow.element.querySelectorAll('.sequencer-step-cell'));
        sequencerWindow.stepCellsGrid = [];
        const currentSequenceLength = activeSequence.length || Constants.defaultStepsPerBar;
        for (let i = 0; i < rows; i++) {
            sequencerWindow.stepCellsGrid[i] = allCells.slice(i * currentSequenceLength, (i + 1) * currentSequenceLength);
        }
        sequencerWindow.lastPlayedCol = -1;


        if (localAppServices.setActiveSequencerTrackId) localAppServices.setActiveSequencerTrackId(trackId);
        const grid = sequencerWindow.element.querySelector('.sequencer-grid-layout');
        const controlsDiv = sequencerWindow.element.querySelector('.sequencer-container .controls');

        if (controlsDiv) {
            controlsDiv.classList.add('sequencer-controls'); 
            console.log('[UI openTrackSequencerWindow] Added "sequencer-controls" class to:', controlsDiv, 'Current classes:', controlsDiv.className); 
        }

        if (controlsDiv && window.interact) { 
            interact(controlsDiv).unset(); 
            interact(controlsDiv)
                .draggable({
                    inertia: false,
                    listeners: {
                        start: (event) => {
                            const currentActiveSeq = track.getActiveSequence();
                            if (currentActiveSeq) {
                                const dragData = {
                                    type: 'sequence-timeline-drag',
                                    sourceSequenceId: currentActiveSeq.id,
                                    sourceTrackId: track.id,
                                    clipName: currentActiveSeq.name
                                };
                                if (event.interaction.element) {
                                    event.interaction.element.dataset.dragType = 'sequence-timeline-drag';
                                    event.interaction.element.dataset.jsonData = JSON.stringify(dragData);
                                } else {
                                     console.warn("[UI Sequencer DragStart] event.interaction.element not found for controlsDiv.");
                                }
                                console.log(`[UI Sequencer DragStart via Interact.js] Dragging sequence: ${currentActiveSeq.name}`);
                            } else {
                                event.interaction.stop(); 
                                console.warn(`[UI Sequencer DragStart] No active sequence to drag for track ${track.name}`);
                            }
                        },
                    }
                })
                .styleCursor(false); 
             controlsDiv.style.cursor = 'grab';
        }


        const sequencerContextMenuHandler = (event) => {
            event.preventDefault(); event.stopPropagation();
            const currentTrackForMenu = localAppServices.getTrackById ? localAppServices.getTrackById(track.id) : null; if (!currentTrackForMenu) return;
            const currentActiveSeq = currentTrackForMenu.getActiveSequence(); if(!currentActiveSeq) return;
            const clipboard = localAppServices.getClipboardData ? localAppServices.getClipboardData() : {};
            const menuItems = [
                { label: `Copy "${currentActiveSeq.name}"`, action: () => { if (localAppServices.setClipboardData) { localAppServices.setClipboardData({ type: 'sequence', sourceTrackType: currentTrackForMenu.type, data: JSON.parse(JSON.stringify(currentActiveSeq.data || [])), sequenceLength: currentActiveSeq.length }); showNotification(`Sequence "${currentActiveSeq.name}" copied.`, 2000); } } },
                { label: `Paste into "${currentActiveSeq.name}"`, action: () => { if (!clipboard || clipboard.type !== 'sequence' || !clipboard.data) { showNotification("Clipboard empty or no sequence data.", 2000); return; } if (clipboard.sourceTrackType !== currentTrackForMenu.type) { showNotification(`Track types mismatch. Can't paste ${clipboard.sourceTrackType} sequence into ${currentTrackForMenu.type} track.`, 3000); return; } if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Paste Sequence into ${currentActiveSeq.name} on ${currentTrackForMenu.name}`); currentActiveSeq.data = JSON.parse(JSON.stringify(clipboard.data)); currentActiveSeq.length = clipboard.sequenceLength; currentTrackForMenu.recreateToneSequence(true); showNotification(`Sequence pasted into "${currentActiveSeq.name}".`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); }, disabled: (!clipboard || clipboard.type !== 'sequence' || !clipboard.data || (clipboard.sourceTrackType && currentTrackForMenu && clipboard.sourceTrackType !== currentTrackForMenu.type)) },
                { separator: true },
                { label: `Erase "${currentActiveSeq.name}"`, action: () => { showConfirmationDialog(`Erase Sequence "${currentActiveSeq.name}" for ${currentTrackForMenu.name}?`, "This will clear all notes. This can be undone.", () => { if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Erase Sequence ${currentActiveSeq.name} for ${currentTrackForMenu.name}`); let numRowsErase = currentActiveSeq.data.length; currentActiveSeq.data = Array(numRowsErase).fill(null).map(() => Array(currentActiveSeq.length).fill(null)); currentTrackForMenu.recreateToneSequence(true); showNotification(`Sequence "${currentActiveSeq.name}" erased.`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); }); } },
                { label: `Double Length of "${currentActiveSeq.name}"`, action: () => { const currentNumBars = currentActiveSeq.length / Constants.STEPS_PER_BAR; if (currentNumBars * 2 > (Constants.MAX_BARS || 16)) { showNotification(`Exceeds max of ${Constants.MAX_BARS || 16} bars.`, 3000); return; } currentTrackForMenu.doubleSequence(); showNotification(`Sequence length doubled for "${currentActiveSeq.name}".`, 2000); } }
            ];
            createContextMenu(event, menuItems, localAppServices);
        };
        if (grid) grid.addEventListener('contextmenu', sequencerContextMenuHandler);
        if (controlsDiv) controlsDiv.addEventListener('contextmenu', sequencerContextMenuHandler);

        if (grid) grid.addEventListener('click', (e) => {
            const targetCell = e.target.closest('.sequencer-step-cell');
            if (targetCell) {
                const row = parseInt(targetCell.dataset.row, 10); const col = parseInt(targetCell.dataset.col, 10);
                const currentActiveSeq = track.getActiveSequence();
                if (!currentActiveSeq || !currentActiveSeq.data) return;

                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    if (!currentActiveSeq.data[row]) currentActiveSeq.data[row] = Array(currentActiveSeq.length).fill(null);
                    const currentStepData = currentActiveSeq.data[row][col];
                    const isActive = !(currentStepData?.active);
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Step (${row + 1},${col + 1}) on ${track.name} (${currentActiveSeq.name})`);
                    currentActiveSeq.data[row][col] = isActive ? { active: true, velocity: Constants.defaultVelocity } : null;
                    updateSequencerCellUI(sequencerWindow.element, track.type, row, col, isActive);
                }
            }
        });
        const lengthInput = sequencerWindow.element.querySelector(`#seqLengthInput-${track.id}`);
        if (lengthInput) {
            lengthInput.value = numBars;
            lengthInput.addEventListener('change', (e) => {
                const newNumBars = parseInt(e.target.value, 10);
                const activeSeqForLengthChange = track.getActiveSequence();
                if (activeSeqForLengthChange && !isNaN(newNumBars) && newNumBars >= 1 && newNumBars <= (Constants.MAX_BARS || 16)) {
                    track.setSequenceLength(newNumBars * Constants.STEPS_PER_BAR);
                } else if (activeSeqForLengthChange) {
                    e.target.value = activeSeqForLengthChange.length / Constants.STEPS_PER_BAR;
                }
            });
        }
    }
    return sequencerWindow;
}

export function updateSequencerCellUI(sequencerWindowElement, trackType, row, col, isActive) {
    if (!sequencerWindowElement) return;
    const cell = sequencerWindowElement.querySelector(`.sequencer-step-cell[data-row="${row}"][data-col="${col}"]`);
    if (!cell) return;

    cell.classList.remove('active-synth', 'active-sampler', 'active-drum-sampler', 'active-instrument-sampler');
    if (isActive) {
        let activeClass = '';
        if (trackType === 'Synth') activeClass = 'active-synth';
        else if (trackType === 'Sampler') activeClass = 'active-sampler';
        else if (trackType === 'DrumSampler') activeClass = 'active-drum-sampler';
        else if (trackType === 'InstrumentSampler') activeClass = 'active-instrument-sampler';
        if (activeClass) cell.classList.add(activeClass);
    }
}

export function highlightPlayingStep(trackId, col) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track || track.type === 'Audio') return;

    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    const seqWindow = openWindows.get(`sequencerWin-${trackId}`);

    if (seqWindow && seqWindow.element && !seqWindow.isMinimized && seqWindow.stepCellsGrid) {
        const activeSeq = track.getActiveSequence();
        const currentSeqLength = activeSeq ? activeSeq.length : Constants.defaultStepsPerBar;

        if (seqWindow.lastPlayedCol !== -1 && seqWindow.lastPlayedCol < currentSeqLength) {
            for (let i = 0; i < seqWindow.stepCellsGrid.length; i++) {
                const cell = seqWindow.stepCellsGrid[i]?.[seqWindow.lastPlayedCol];
                if (cell) {
                    cell.classList.remove('playing');
                }
            }
        }

        if (col < currentSeqLength) {
            for (let i = 0; i < seqWindow.stepCellsGrid.length; i++) {
                const cell = seqWindow.stepCellsGrid[i]?.[col];
                if (cell) {
                    cell.classList.add('playing');
                }
            }
        }
        seqWindow.lastPlayedCol = col;
    }
}


// --- Mixer Window ---
export function openMixerWindow(savedState = null) {
    const windowId = 'mixer';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) { openWindows.get(windowId).restore(); return openWindows.get(windowId); }

    const contentContainer = document.createElement('div'); contentContainer.id = 'mixerContentContainer';
    contentContainer.className = 'p-2 overflow-x-auto whitespace-nowrap h-full bg-gray-100 dark:bg-slate-800';
    const desktopEl = localAppServices.uiElementsCache?.desktop || document.getElementById('desktop');
    const mixerOptions = { width: Math.min(800, (desktopEl?.offsetWidth || 800) - 40), height: 300, minWidth: 300, minHeight: 200, initialContentKey: windowId };
    if (savedState) Object.assign(mixerOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    const mixerWindow = localAppServices.createWindow(windowId, 'Mixer', contentContainer, mixerOptions);
    if (mixerWindow?.element) updateMixerWindow();
    return mixerWindow;
}

export function updateMixerWindow() {
    const mixerWindow = localAppServices.getWindowById ? localAppServices.getWindowById('mixer') : null;
    if (!mixerWindow?.element || mixerWindow.isMinimized) return;
    const container = mixerWindow.element.querySelector('#mixerContentContainer');
    if (container) renderMixer(container);
}

export function renderMixer(container) {
    const tracks = localAppServices.getTracks ? localAppServices.getTracks() : [];
    container.innerHTML = '';
    const masterTrackDiv = document.createElement('div');
    masterTrackDiv.className = 'mixer-track master-track inline-block align-top p-1.5 border rounded bg-gray-200 dark:bg-slate-700 dark:border-slate-600 shadow w-24 mr-2 text-xs';
    masterTrackDiv.innerHTML = `<div class="track-name font-semibold truncate mb-1 dark:text-slate-200" title="Master">Master</div> <div id="masterVolumeKnob-mixer-placeholder" class="h-16 mx-auto mb-1"></div> <div id="mixerMasterMeterContainer" class="h-3 w-full bg-gray-300 dark:bg-slate-600 rounded border border-gray-400 dark:border-slate-500 overflow-hidden mt-1"> <div id="mixerMasterMeterBar" class="h-full bg-blue-500 transition-all duration-50 ease-linear" style="width: 0%;"></div> </div>`;
    container.appendChild(masterTrackDiv);
    const masterVolKnobPlaceholder = masterTrackDiv.querySelector('#masterVolumeKnob-mixer-placeholder');
    if (masterVolKnobPlaceholder && localAppServices.createKnob) { 
        const masterGainNode = localAppServices.getMasterGainValue ? localAppServices.getMasterGainValue() : Tone.dbToGain(0);
        const masterVolume = masterGainNode;
        const masterVolKnob = localAppServices.createKnob({ label: 'Master Vol', min: 0, max: 1.2, step: 0.01, initialValue: masterVolume, decimals: 2, onValueChange: (val, o, fromInteraction) => {
            if (localAppServices.setActualMasterVolume) localAppServices.setActualMasterVolume(val);
            if (localAppServices.setMasterGainValueState) localAppServices.setMasterGainValueState(val);
            if (fromInteraction && localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Master Volume to ${val.toFixed(2)}`);
         } });
        masterVolKnobPlaceholder.innerHTML = ''; masterVolKnobPlaceholder.appendChild(masterVolKnob.element);
    }

    tracks.forEach(track => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'mixer-track inline-block align-top p-1.5 border rounded bg-white dark:bg-slate-700 dark:border-slate-600 shadow w-24 mr-2 text-xs';
        trackDiv.innerHTML = `<div class="track-name font-semibold truncate mb-1 dark:text-slate-200" title="${track.name}">${track.name}</div> <div id="volumeKnob-mixer-${track.id}-placeholder" class="h-16 mx-auto mb-1"></div> <div class="grid grid-cols-2 gap-0.5 my-1"> <button id="mixerMuteBtn-${track.id}" title="Mute" class="px-1 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600 ${track.isMuted ? 'muted' : ''}">${track.isMuted ? 'U' : 'M'}</button> <button id="mixerSoloBtn-${track.id}" title="Solo" class="px-1 py-0.5 text-xs border rounded dark:border-slate-500 dark:text-slate-300 dark:hover:bg-slate-600 ${track.isSoloed ? 'soloed' : ''}">${track.isSoloed ? 'U' : 'S'}</button> </div> <div id="mixerTrackMeterContainer-${track.id}" class="h-3 w-full bg-gray-200 dark:bg-slate-600 rounded border border-gray-300 dark:border-slate-500 overflow-hidden mt-0.5"> <div id="mixerTrackMeterBar-${track.id}" class="h-full bg-green-500 transition-all duration-50 ease-linear" style="width: 0%;"></div> </div>`;

        trackDiv.addEventListener('click', (e) => {
            if (e.target.closest('button')) {
                return;
            }
            if (localAppServices.handleOpenTrackInspector) {
                localAppServices.handleOpenTrackInspector(track.id);
            }
        });

        trackDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const currentTrackForMenu = localAppServices.getTrackById(track.id);
            if (!currentTrackForMenu) return;

            const menuItems = [
                {label: "Open Inspector", action: () => localAppServices.handleOpenTrackInspector(track.id)},
                {label: "Rename Track", action: () => {
                    const newName = prompt(`Enter new name for "${currentTrackForMenu.name}":`, currentTrackForMenu.name);
                    if (newName !== null && newName.trim() !== "") {
                        currentTrackForMenu.setName(newName.trim());
                    }
                }},
                {label: "Open Effects Rack", action: () => localAppServices.handleOpenEffectsRack(track.id)},
                ...(currentTrackForMenu.type !== 'Audio' ? [{label: "Open Sequencer", action: () => localAppServices.handleOpenSequencer(track.id)}] : []),
                {separator: true},
                {label: currentTrackForMenu.isMuted ? "Unmute" : "Mute", action: () => localAppServices.handleTrackMute(track.id)},
                {label: currentTrackForMenu.isSoloed ? "Unsolo" : "Solo", action: () => localAppServices.handleTrackSolo(track.id)},
                {label: (localAppServices.getArmedTrackId && localAppServices.getArmedTrackId() === track.id) ? "Disarm Input" : "Arm for Input", action: () => localAppServices.handleTrackArm(track.id)},
                {separator: true},
                {label: "Remove Track", action: () => localAppServices.handleRemoveTrack(track.id)}
            ];
            createContextMenu(e, menuItems, localAppServices);
        });
        container.appendChild(trackDiv);
        const volKnobPlaceholder = trackDiv.querySelector(`#volumeKnob-mixer-${track.id}-placeholder`);
        if (volKnobPlaceholder && localAppServices.createKnob) { const volKnob = localAppServices.createKnob({ label: `Vol ${track.id}`, min: 0, max: 1.2, step: 0.01, initialValue: track.previousVolumeBeforeMute, decimals: 2, trackRef: track, onValueChange: (val, o, fromInteraction) => track.setVolume(val, fromInteraction) }); volKnobPlaceholder.innerHTML = ''; volKnobPlaceholder.appendChild(volKnob.element); }
        trackDiv.querySelector(`#mixerMuteBtn-${track.id}`).addEventListener('click', (e) => { e.stopPropagation(); localAppServices.handleTrackMute(track.id); });
        trackDiv.querySelector(`#mixerSoloBtn-${track.id}`).addEventListener('click', (e) => { e.stopPropagation(); localAppServices.handleTrackSolo(track.id); });
    });
}


// --- Timeline UI Functions ---
export function renderTimeline() {
    const timelineWindow = localAppServices.getWindowById ? localAppServices.getWindowById('timeline') : null;
    if (!timelineWindow || !timelineWindow.element || timelineWindow.isMinimized) {
        return;
    }

    const tracksArea = timelineWindow.element.querySelector('#timeline-tracks-area');
    const tracks = getTracksState();
    if (!tracksArea || !tracks) {
        console.warn("Timeline area or tracks not found for rendering inside timeline window.");
        return;
    }

    tracksArea.innerHTML = '';

    const trackNameWidthStyle = getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim();
    const trackNameWidth = parseFloat(trackNameWidthStyle) || 120;


    tracks.forEach(track => {
        const lane = document.createElement('div');
        lane.className = 'timeline-track-lane';
        lane.dataset.trackId = track.id;

        if (window.interact) {
            interact(lane).unset(); 
            
            interact(lane)
                .dropzone({
                    accept: '.audio-clip, .sequencer-controls, .dragging-sound-item', 
                    overlap: 0.25, 
                    checker: function (
                        dragEvent,        
                        event,            
                        dropped,          
                        dropzone,         
                        dropElement,      
                        draggable,        
                        draggableElement  
                    ) {
                        const acceptedBySelector = interact.matchSelector(draggableElement, dropzone.options.accept);
                        console.log('[TimelineLane DropChecker] Draggable Element:', draggableElement);
                        console.log('[TimelineLane DropChecker] Draggable Classes:', draggableElement ? draggableElement.className : 'N/A');
                        console.log('[TimelineLane DropChecker] Draggable dragType data:', draggableElement ? draggableElement.dataset.dragType : 'N/A');
                        console.log('[TimelineLane DropChecker] Does it have .sequencer-controls?', draggableElement ? draggableElement.classList.contains('sequencer-controls') : false);
                        console.log('[TimelineLane DropChecker] Dropzone options.accept:', dropzone.options.accept);
                        console.log('[TimelineLane DropChecker] Accepted by selector implicitly?', acceptedBySelector);
                        
                        return interact.dynamicDrop() || acceptedBySelector;
                    },
                    ondropactivate: function (event) {
                        event.target.classList.add('drop-active');
                    },
                    ondragenter: function (event) {
                        const draggableElement = event.relatedTarget;
                        const dropzoneElement = event.target;
                        console.log('[TimelineLane] ondragenter - Draggable:', draggableElement, 'Classes:', draggableElement ? draggableElement.className : 'N/A', 'Has class dragging-sound-item:', draggableElement ? draggableElement.classList.contains('dragging-sound-item') : false);
                        dropzoneElement.classList.add('drop-target'); 
                        if (draggableElement) draggableElement.classList.add('can-drop');  
                    },
                    ondragleave: function (event) {
                        const draggableElement = event.relatedTarget;
                        console.log('[TimelineLane] ondragleave - Draggable:', draggableElement);
                        event.target.classList.remove('drop-target');
                        if (draggableElement) draggableElement.classList.remove('can-drop');
                    },
                    ondrop: function (event) {
                        console.log('[TimelineLane] ONDROP triggered!', event);
                        const droppedClipElement = event.relatedTarget;
                        const targetLaneElement = event.target;
                        const targetTrackId = parseInt(targetLaneElement.dataset.trackId, 10);
                        
                        const timelineWindow = localAppServices.getWindowById ? localAppServices.getWindowById('timeline') : null; 
                        if (!timelineWindow || !timelineWindow.element) {
                            console.error("Timeline window not found during drop");
                            return;
                        }
                        const timelineContentArea = timelineWindow.element.querySelector('.window-content');
                        if (!timelineContentArea) {
                             console.error("Timeline content area not found during drop");
                            return;
                        }
                        const pixelsPerSecond = 30; 
                        const trackNameWidthStyle = getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim();
                        const trackNameWidth = parseFloat(trackNameWidthStyle) || 120;
                        const timelineRect = timelineContentArea.getBoundingClientRect();

                        let dropXClient = 0;
                        if (event.dragEvent && typeof event.dragEvent.clientX === 'number') { 
                            dropXClient = event.dragEvent.clientX;
                        } else if (event.client && typeof event.client.x === 'number') {
                            console.warn("[TimelineLane ONDROP] event.dragEvent not available or clientX missing, using event.client.x.");
                            dropXClient = event.client.x;
                        } else if (typeof event.clientX === 'number') {
                             console.warn("[TimelineLane ONDROP] event.dragEvent and event.client.x not available, using event.clientX.");
                             dropXClient = event.clientX;
                        } else {
                            console.error("[TimelineLane ONDROP] Cannot determine drop clientX coordinate from event:", event);
                            targetLaneElement.classList.remove('drop-target');
                            if(droppedClipElement) droppedClipElement.classList.remove('can-drop');
                            return; 
                        }
                        
                        let dropX = dropXClient - timelineRect.left - trackNameWidth + timelineContentArea.scrollLeft;
                        dropX = Math.max(0, dropX); 
                        const startTime = dropX / pixelsPerSecond;

                        console.log(`[UI Timeline Drop via Interact.js] TargetTrackID: ${targetTrackId}, Calculated StartTime: ${startTime.toFixed(2)}s, DropXClient: ${dropXClient}`);
                        
                        const clipId = droppedClipElement.dataset.clipId; 
                        const originalTrackId = parseInt(droppedClipElement.dataset.originalTrackId, 10); 
                        const dragType = droppedClipElement.dataset.dragType; 
                        const jsonDataString = droppedClipElement.dataset.jsonData;

                        if (clipId && !isNaN(originalTrackId) && dragType !== 'sound-browser-item' && dragType !== 'sequence-timeline-drag') { 
                            const originalTrack = localAppServices.getTrackById(originalTrackId);
                            if (!originalTrack || !originalTrack.timelineClips) {
                                console.error("Original track or its timelineClips not found for repositioning.");
                                if (localAppServices.renderTimeline) localAppServices.renderTimeline(); 
                                targetLaneElement.classList.remove('drop-target');
                                if(droppedClipElement) droppedClipElement.classList.remove('can-drop');
                                return;
                            }
                            const clipData = originalTrack.timelineClips.find(c => c.id === clipId);

                            if (clipData) {
                                const targetTrackForDrop = localAppServices.getTrackById(targetTrackId);
                                if (targetTrackForDrop && targetTrackForDrop.type === originalTrack.type) {
                                    if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Move Clip "${clipData.name}" to Track "${targetTrackForDrop.name}" at ${startTime.toFixed(2)}s`);
                                    
                                    if (originalTrackId !== targetTrackId) { 
                                        originalTrack.timelineClips = originalTrack.timelineClips.filter(c => c.id !== clipId);
                                        if (typeof targetTrackForDrop.addExistingClipFromOtherTrack === 'function') { 
                                            targetTrackForDrop.addExistingClipFromOtherTrack(clipData, startTime);
                                        } else { 
                                            console.warn(`Track type ${targetTrackForDrop.type} does not have addExistingClipFromOtherTrack. Manually adding.`);
                                            const newClipDataForNewTrack = {...JSON.parse(JSON.stringify(clipData)), startTime: startTime, id: `clip_${targetTrackId}_${Date.now()}`};
                                            targetTrackForDrop.timelineClips.push(newClipDataForNewTrack);
                                        }
                                    } else { 
                                        targetTrackForDrop.updateAudioClipPosition(clipId, startTime);
                                    }
                                    if(localAppServices.renderTimeline) localAppServices.renderTimeline(); 
                                } else if (targetTrackForDrop && targetTrackForDrop.type !== originalTrack.type) {
                                    if(localAppServices.showNotification) localAppServices.showNotification(`Cannot move ${originalTrack.type} clip to ${targetTrackForDrop.type} track.`, 3000);
                                    if(localAppServices.renderTimeline) localAppServices.renderTimeline(); 
                                } else if (!targetTrackForDrop) {
                                     console.error("Target track for drop not found.");
                                     if(localAppServices.renderTimeline) localAppServices.renderTimeline();
                                }
                            } else {
                                console.warn("Original clip data not found for ID:", clipId);
                                if(localAppServices.renderTimeline) localAppServices.renderTimeline();
                            }
                        } else if ((dragType === 'sound-browser-item' || dragType === 'sequence-timeline-drag') && jsonDataString) {
                            try {
                                const droppedItemData = JSON.parse(jsonDataString); 
                                 if (localAppServices.handleTimelineLaneDrop) { 
                                    localAppServices.handleTimelineLaneDrop(droppedItemData, targetTrackId, startTime);
                                }
                            } catch (e) {
                                console.error("Error parsing jsonData from dropped element:", e);
                                if(localAppServices.showNotification) localAppServices.showNotification("Error processing dropped item data.", 3000);
                            }
                        }

                        targetLaneElement.classList.remove('drop-target');
                        if(droppedClipElement) droppedClipElement.classList.remove('can-drop');
                    },
                    ondropdeactivate: function (event) {
                        event.target.classList.remove('drop-active');
                        event.target.classList.remove('drop-target');
                    }
                });
        }


        const nameEl = document.createElement('div');
        nameEl.className = 'timeline-track-lane-name';
        nameEl.textContent = track.name;
        lane.appendChild(nameEl);

        const clipsContainer = document.createElement('div');
        clipsContainer.style.position = 'relative';
        clipsContainer.style.width = `calc(100% - ${trackNameWidth}px)`;
        clipsContainer.style.height = '100%';


        if (track.timelineClips && Array.isArray(track.timelineClips)) {
            track.timelineClips.forEach(clip => {
                if (!clip || typeof clip.id === 'undefined') { 
                    console.warn("Encountered invalid clip object while rendering timeline for track:", track.name, clip);
                    return; 
                }
                const clipEl = document.createElement('div');
                clipEl.dataset.clipId = clip.id; 
                clipEl.dataset.originalTrackId = track.id; 

                let clipText = clip.name || `Clip ${clip.id.slice(-4)}`;
                let clipTitle = `${clip.name || (clip.type === 'audio' ? 'Audio Clip' : 'Sequence Clip')} (${clip.duration !== undefined ? clip.duration.toFixed(2) : 'N/A'}s)`;


                if (clip.type === 'audio') {
                    clipEl.className = 'audio-clip';
                } else if (clip.type === 'sequence') {
                    clipEl.className = 'audio-clip sequence-clip';
                    const sourceSeq = track.sequences && track.sequences.find(s => s.id === clip.sourceSequenceId);
                    if (sourceSeq) {
                        clipText = sourceSeq.name;
                        clipTitle = `Sequence: ${sourceSeq.name} (${clip.duration !== undefined ? clip.duration.toFixed(2) : 'N/A'}s)`;
                    }
                } else {
                    clipEl.className = 'audio-clip unknown-clip';
                }

                clipEl.textContent = clipText;
                clipEl.title = clipTitle;

                const pixelsPerSecond = 30;
                clipEl.style.left = `${(clip.startTime || 0) * pixelsPerSecond}px`;
                clipEl.style.width = `${Math.max(5, (clip.duration || 0) * pixelsPerSecond)}px`;
                clipEl.style.touchAction = 'none'; 

                if (window.interact) {
                    interact(clipEl).unset(); 
                    
                    interact(clipEl)
                        .draggable({
                            inertia: false,
                            modifiers: [
                                interact.modifiers.restrictRect({
                                    restriction: 'parent', 
                                    endOnly: false
                                }),
                                interact.modifiers.snap({
                                    targets: [
                                      interact.snappers.grid({ x: pixelsPerSecond / 4, y: 0 }) 
                                    ],
                                    range: Infinity,
                                    relativePoints: [ { x: 0, y: 0 } ]
                                  })
                            ],
                            listeners: {
                                start: (event) => {
                                    const target = event.target;
                                    target.dataset.startX = parseFloat(target.style.left) || 0;
                                    target.classList.add('dragging');
                                    target.style.zIndex = 10; 
                                },
                                move: (event) => {
                                    const target = event.target;
                                    const x = (parseFloat(target.dataset.startX) || 0) + event.dx;
                                    target.style.left = `${Math.max(0, x)}px`;
                                },
                                end: (event) => {
                                    const target = event.target;
                                    target.classList.remove('dragging');
                                    target.style.zIndex = ''; 
                                    const finalLeftPixels = parseFloat(target.style.left) || 0;
                                    const newStartTime = Math.max(0, finalLeftPixels / pixelsPerSecond);
                                    
                                    const currentClipId = target.dataset.clipId;
                                    const currentTrackId = parseInt(target.dataset.originalTrackId, 10);
                                    const currentTrack = localAppServices.getTrackById(currentTrackId);
                                    const originalClipData = currentTrack ? currentTrack.timelineClips.find(c => c.id === currentClipId) : null;


                                    if (!event.dropzone && originalClipData && Math.abs(newStartTime - originalClipData.startTime) > 0.01) {
                                         if (localAppServices.captureStateForUndo) {
                                            localAppServices.captureStateForUndo(`Move clip "${originalClipData.name}" on track "${currentTrack.name}"`);
                                        }
                                        if (currentTrack.updateAudioClipPosition) {
                                            currentTrack.updateAudioClipPosition(currentClipId, newStartTime);
                                        } else {
                                            console.error("Track.updateAudioClipPosition method not found!");
                                        }
                                    } else if (!event.dropzone && originalClipData) {
                                        target.style.left = `${originalClipData.startTime * pixelsPerSecond}px`;
                                    }
                                    delete target.dataset.startX;
                                }
                            }
                        });
                }
                clipsContainer.appendChild(clipEl);
            });
        }
        lane.appendChild(clipsContainer);
        tracksArea.appendChild(lane);
    });
}

export function updatePlayheadPosition() {
    const timelineWindow = localAppServices.getWindowById ? localAppServices.getWindowById('timeline') : null;

    if (!timelineWindow || !timelineWindow.element || timelineWindow.isMinimized) {
        return;
    }

    const playhead = timelineWindow.element.querySelector('#timeline-playhead');
    const timelineContentArea = timelineWindow.element.querySelector('.window-content');
    const timelineRuler = timelineWindow.element.querySelector('#timeline-ruler');


    if (!playhead || typeof Tone === 'undefined' || !timelineContentArea || !localAppServices.getPlaybackMode) return;

    const currentPlaybackMode = localAppServices.getPlaybackMode();

    if (currentPlaybackMode === 'sequencer' || currentPlaybackMode === 'pattern') {
        playhead.style.display = 'none';
        if (timelineRuler) {
             timelineRuler.style.transform = `translateX(-${timelineContentArea.scrollLeft}px)`;
        }
        return;
    }

    playhead.style.display = 'block';

    const pixelsPerSecond = 30;
    const trackNameWidthStyle = getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim();
    const trackNameWidth = parseFloat(trackNameWidthStyle) || 120;

    if (Tone.Transport.state === 'started') {
        const rawNewPosition = Tone.Transport.seconds * pixelsPerSecond;
        playhead.style.left = `${trackNameWidth + rawNewPosition}px`;

        const scrollableContent = timelineContentArea;
        const containerWidth = scrollableContent.clientWidth - trackNameWidth;
        const playheadVisualPositionInScrollable = rawNewPosition - scrollableContent.scrollLeft;

        if (playheadVisualPositionInScrollable > containerWidth * 0.8) {
            scrollableContent.scrollLeft = rawNewPosition - (containerWidth * 0.8) + 20;
        } else if (playheadVisualPositionInScrollable < containerWidth * 0.2 && scrollableContent.scrollLeft > 0) {
            scrollableContent.scrollLeft = Math.max(0, rawNewPosition - (containerWidth * 0.2) - 20);
        }
        if (scrollableContent.scrollLeft < 0) scrollableContent.scrollLeft = 0;

    } else if (Tone.Transport.state === 'stopped') {
         playhead.style.left = `${trackNameWidth}px`;
    }

    if (timelineRuler && timelineContentArea) {
        timelineRuler.style.transform = `translateX(-${timelineContentArea.scrollLeft}px)`;
    }
}


export function openTimelineWindow(savedState = null) {
    const windowId = 'timeline';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        const win = openWindows.get(windowId);
        win.restore();
        renderTimeline();
        return win;
    }

    const contentHTML = `
        <div id="timeline-container">
            <div id="timeline-header">
                <div id="timeline-ruler"></div>
            </div>
            <div id="timeline-tracks-container">
                <div id="timeline-tracks-area"></div>
            </div>
            <div id="timeline-playhead"></div>
        </div>
    `;

    const desktopEl = localAppServices.uiElementsCache?.desktop || document.getElementById('desktop');
    const safeDesktopWidth = (desktopEl && typeof desktopEl.offsetWidth === 'number' && desktopEl.offsetWidth > 0) ? desktopEl.offsetWidth : 1024;
    const timelineOptions = {
        width: Math.max(600, Math.min(1200, safeDesktopWidth - 60)),
        height: 250,
        x: 30,
        y: 50,
        minWidth: 400,
        minHeight: 150,
        initialContentKey: windowId,
        onCloseCallback: () => {}
    };

     if (savedState) {
        Object.assign(timelineOptions, {
            x: parseInt(savedState.left, 10),
            y: parseInt(savedState.top, 10),
            width: parseInt(savedState.width, 10),
            height: parseInt(savedState.height, 10),
            zIndex: savedState.zIndex,
            isMinimized: savedState.isMinimized
        });
    }

    const timelineWindow = localAppServices.createWindow(windowId, 'Timeline', contentHTML, timelineOptions);

    if (timelineWindow?.element) {
        const contentArea = timelineWindow.element.querySelector('.window-content');
        if (contentArea) {
            contentArea.addEventListener('scroll', () => {
                const ruler = timelineWindow.element.querySelector('#timeline-ruler');
                if (ruler) {
                    ruler.style.transform = `translateX(-${contentArea.scrollLeft}px)`;
                }
                updatePlayheadPosition();
            });
        }
        renderTimeline();
    }
    return timelineWindow;
}
