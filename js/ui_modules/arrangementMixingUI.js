// js/ui_modules/arrangementMixingUI.js
import { SnugWindow } from '../SnugWindow.js';
// MODIFICATION: Import snapTimeToGrid from utils
import { showNotification, createContextMenu, showConfirmationDialog, snapTimeToGrid } from '../utils.js';
import * as Constants from '../constants.js';
import {
    handleTrackMute, handleTrackSolo, handleTrackArm, handleRemoveTrack,
    handleOpenTrackInspector, handleOpenEffectsRack, handleOpenSequencer
} from '../eventHandlers.js'; // Assuming these are correctly imported if used, or accessed via appServices
import { getTracksState } from '../state.js'; // Assuming this is correctly imported if used, or accessed via appServices


let localAppServices = {};

export function initializeArrangementMixingUI(appServicesFromMain) {
    localAppServices = appServicesFromMain;
}

// --- Sequencer Window ---
export function buildSequencerContentDOM(track, rows, rowLabels, numBars) {
    const stepsPerBar = Constants.STEPS_PER_BAR;
    const totalSteps = Number.isFinite(numBars) && numBars > 0 ? numBars * stepsPerBar : Constants.defaultStepsPerBar;

    let html = `<div class="sequencer-container p-1 text-xs overflow-auto h-full bg-gray-800 dark:bg-slate-900 text-slate-300 dark:text-slate-300 rounded-b-md">
        <div class="controls mb-1 flex justify-between items-center sticky top-0 left-0 bg-gray-700 dark:bg-slate-800 p-1.5 z-30 border-b border-gray-600 dark:border-slate-700 rounded-t-md shadow">
            <span class="font-semibold text-sm text-slate-100 dark:text-slate-100">${track.name} - ${numBars} Bar${numBars > 1 ? 's' : ''} (${totalSteps} steps)</span>
            <div class="flex items-center space-x-2">
                <label for="seqLengthInput-${track.id}" class="text-xs text-slate-300 dark:text-slate-400">Bars:</label>
                <input type="number" id="seqLengthInput-${track.id}" value="${numBars}" min="1" max="${Constants.MAX_BARS || 16}"
                       class="w-16 p-1 border border-gray-500 dark:border-slate-600 rounded text-xs bg-gray-600 dark:bg-slate-700 text-slate-100 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
            </div>
        </div>`;

    const cellSize = '24px';
    const labelWidth = '65px';
    html += `<div class="sequencer-grid-layout" style="display: grid; grid-template-columns: ${labelWidth} repeat(${totalSteps}, ${cellSize}); grid-auto-rows: ${cellSize}; gap: 1px; width: fit-content; position: relative; background-color: #1f2937; /* bg-gray-800 dark:bg-gray-900 */">
        <div class="sequencer-header-cell sticky top-0 left-0 z-20 bg-gray-700 dark:bg-slate-800 border-r border-b border-gray-600 dark:border-slate-700"></div>`;

    for (let i = 0; i < totalSteps; i++) {
        let barMarkerClass = (i % stepsPerBar === 0) ? 'font-semibold text-slate-200 dark:text-slate-200' : 'text-gray-500 dark:text-slate-400';
        html += `<div class="sequencer-header-cell sticky top-0 z-10 bg-gray-700 dark:bg-slate-800 border-r border-b border-gray-600 dark:border-slate-700 flex items-center justify-center text-[10px] ${barMarkerClass}">
                    ${(i % stepsPerBar === 0) ? (Math.floor(i / stepsPerBar) + 1) : ((i % (stepsPerBar / 4) === 0) ? '&#x2022;' : '')}
                 </div>`;
    }

    const activeSequence = track.getActiveSequence();
    const sequenceData = activeSequence ? activeSequence.data : [];

    for (let i = 0; i < rows; i++) {
        let labelText = rowLabels[i] || `R${i + 1}`;
        if (labelText.length > 8) labelText = labelText.substring(0, 7) + "...";
        html += `<div class="sequencer-label-cell sticky left-0 z-10 bg-gray-700 dark:bg-slate-800 border-r border-b border-gray-600 dark:border-slate-700 flex items-center justify-end px-1.5 text-[11px] font-medium text-slate-300 dark:text-slate-300" title="${rowLabels[i] || ''}">${labelText}</div>`;

        for (let j = 0; j < totalSteps; j++) {
            const stepData = sequenceData[i]?.[j];
            let activeClass = '';

            if (stepData?.active) {
                let baseColor = 'bg-gray-400 dark:bg-gray-500';
                if (track.type === 'Synth') baseColor = 'bg-sky-500 dark:bg-sky-500';
                else if (track.type === 'Sampler') baseColor = 'bg-teal-500 dark:bg-teal-500';
                else if (track.type === 'DrumSampler') baseColor = 'bg-emerald-500 dark:bg-emerald-500';
                else if (track.type === 'InstrumentSampler') baseColor = 'bg-cyan-500 dark:bg-cyan-500';
                activeClass = `${baseColor} ring-1 ring-inset ring-black/20 dark:ring-white/20 shadow-inner`;
            }

            let beatBlockClass = (Math.floor(j / 4) % 2 === 0) ? 'bg-gray-600/30 dark:bg-slate-700/60' : 'bg-gray-500/30 dark:bg-slate-700/40';
            if (j % stepsPerBar === 0 && j > 0) beatBlockClass += ' border-l-2 border-l-gray-500 dark:border-l-slate-500';
            else if (j > 0 && j % (stepsPerBar / 2) === 0) beatBlockClass += ' border-l border-l-gray-500/70 dark:border-l-slate-600';
            else if (j > 0 && j % (stepsPerBar / 4) === 0) beatBlockClass += ' border-l border-l-gray-600/50 dark:border-l-slate-650';

            html += `<div class="sequencer-step-cell ${beatBlockClass} border-r border-b border-gray-700/50 dark:border-slate-700/50
                                hover:bg-blue-500/60 dark:hover:bg-blue-500/60 cursor-pointer transition-colors duration-75
                                flex items-center justify-center rounded-sm ${activeClass}"
                         data-row="${i}" data-col="${j}" title="R${i+1},S${j+1}">
                         ${stepData?.active ? `<div class="w-3/5 h-3/5 rounded-full opacity-80 ${activeClass.split(' ')[0]} shadow-md"></div>` : ''}
                     </div>`;
        }
    }
    html += `</div></div>`;
    return html;
}

export function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) {
    // ... (no changes in this part of the function)
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track || track.type === 'Audio') {
        return null;
    }
    const windowId = `sequencerWin-${trackId}`;
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();

    if (forceRedraw && openWindows.has(windowId)) {
        const existingWindow = openWindows.get(windowId);
        if (existingWindow && typeof existingWindow.close === 'function') {
            try {
                existingWindow.close(true);
            } catch (e) {console.warn(`[UI openTrackSequencerWindow] Error closing existing sequencer window for redraw for track ${trackId}:`, e)}
        }
    }
    if (openWindows.has(windowId) && !forceRedraw && !savedState) {
        const win = openWindows.get(windowId);
        if (win && typeof win.restore === 'function') {
            win.restore();
            if (localAppServices.setActiveSequencerTrackId) localAppServices.setActiveSequencerTrackId(trackId);
            return win;
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

    let calculatedWidth = Math.max(450, Math.min(1000, safeDesktopWidth - 40));
    let calculatedHeight = Math.min(600, (rows * 25) + 90);
    calculatedHeight = Math.max(350, calculatedHeight);

    if (!Number.isFinite(calculatedWidth) || calculatedWidth <= 0) calculatedWidth = 600;
    if (!Number.isFinite(calculatedHeight) || calculatedHeight <= 0) calculatedHeight = 400;

    const seqOptions = {
        width: calculatedWidth,
        height: calculatedHeight,
        minWidth: 400,
        minHeight: 300,
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
            controlsDiv.style.cursor = 'default';
            if (window.interact) {
                const interactableInstance = interact(controlsDiv);
                if (interactableInstance && typeof interactableInstance.unset === 'function') {
                    try {
                        interactableInstance.unset();
                    } catch(e) {
                        console.warn("[UI openTrackSequencerWindow] Error trying to unset interactable from controlsDiv:", e.message);
                    }
                }
            }
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
    // ... (no changes to this function)
    if (!sequencerWindowElement) return;
    const cell = sequencerWindowElement.querySelector(`.sequencer-step-cell[data-row="${row}"][data-col="${col}"]`);
    if (!cell) return;

    const activeColorClasses = [
        'bg-sky-500', 'dark:bg-sky-500',
        'bg-teal-500', 'dark:bg-teal-500',
        'bg-emerald-500', 'dark:bg-emerald-500',
        'bg-cyan-500', 'dark:bg-cyan-500'
    ];
    cell.classList.remove(...activeColorClasses, 'ring-1', 'ring-inset', 'ring-black/20', 'dark:ring-white/20', 'shadow-inner');
    cell.innerHTML = '';

    if (isActive) {
        let baseColor = 'bg-gray-400 dark:bg-gray-500';
        if (trackType === 'Synth') baseColor = 'bg-sky-500 dark:bg-sky-500';
        else if (trackType === 'Sampler') baseColor = 'bg-teal-500 dark:bg-teal-500';
        else if (trackType === 'DrumSampler') baseColor = 'bg-emerald-500 dark:bg-emerald-500';
        else if (trackType === 'InstrumentSampler') baseColor = 'bg-cyan-500 dark:bg-cyan-500';

        cell.classList.add(...baseColor.split(' '), 'ring-1', 'ring-inset', 'ring-black/20', 'dark:ring-white/20', 'shadow-inner');
        cell.innerHTML = `<div class="w-3/5 h-3/5 rounded-full opacity-80 ${baseColor.split(' ')[0]} shadow-md"></div>`;
    }
}

export function highlightPlayingStep(trackId, col) {
    // ... (no changes to this function)
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track || track.type === 'Audio') return;

    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    const seqWindowInstance = openWindows.get(`sequencerWin-${trackId}`);

    if (seqWindowInstance && seqWindowInstance.element && !seqWindowInstance.isMinimized && seqWindowInstance.stepCellsGrid) {
        const activeSeq = track.getActiveSequence();
        const currentSeqLength = activeSeq ? activeSeq.length : Constants.defaultStepsPerBar;
        const highlightClasses = ['ring-2', 'ring-offset-2', 'ring-yellow-400', 'dark:ring-yellow-300', 'dark:ring-offset-slate-900', 'z-20', 'scale-105', 'shadow-lg'];

        if (seqWindowInstance.lastPlayedCol !== -1 && seqWindowInstance.lastPlayedCol < currentSeqLength) {
            for (let i = 0; i < seqWindowInstance.stepCellsGrid.length; i++) {
                const cell = seqWindowInstance.stepCellsGrid[i]?.[seqWindowInstance.lastPlayedCol];
                if (cell) {
                    cell.classList.remove(...highlightClasses);
                }
            }
        }

        if (col < currentSeqLength) {
            for (let i = 0; i < seqWindowInstance.stepCellsGrid.length; i++) {
                const cell = seqWindowInstance.stepCellsGrid[i]?.[col];
                if (cell) {
                    cell.classList.add(...highlightClasses);
                }
            }
        }
        seqWindowInstance.lastPlayedCol = col;
    }
}

// --- Mixer Window ---
export function openMixerWindow(savedState = null) {
    // ... (no changes to this function)
    const windowId = 'mixer';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) { openWindows.get(windowId).restore(); return openWindows.get(windowId); }

    const contentContainer = document.createElement('div'); contentContainer.id = 'mixerContentContainer';
    contentContainer.className = 'p-3 overflow-x-auto whitespace-nowrap h-full bg-gray-200 dark:bg-slate-800 flex space-x-3 rounded-b-md';

    const desktopEl = localAppServices.uiElementsCache?.desktop || document.getElementById('desktop');
    const mixerOptions = {
        width: Math.min(800, (desktopEl?.offsetWidth || 800) - 40),
        height: 350,
        minWidth: 300, minHeight: 280,
        initialContentKey: windowId
    };
    if (savedState) Object.assign(mixerOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    const mixerWindow = localAppServices.createWindow(windowId, 'Mixer', contentContainer, mixerOptions);
    if (mixerWindow?.element) updateMixerWindow();
    return mixerWindow;
}

export function updateMixerWindow() {
    // ... (no changes to this function)
    const mixerWindow = localAppServices.getWindowById ? localAppServices.getWindowById('mixer') : null;
    if (!mixerWindow?.element || mixerWindow.isMinimized) return;
    const container = mixerWindow.element.querySelector('#mixerContentContainer');
    if (container) renderMixer(container);
}

export function renderMixer(container) {
    // ... (no changes to this function)
    const tracks = localAppServices.getTracks ? localAppServices.getTracks() : [];
    container.innerHTML = '';

    const masterTrackDiv = document.createElement('div');
    masterTrackDiv.className = 'mixer-track master-track flex-shrink-0 p-3 border border-gray-400 dark:border-slate-600 rounded-lg bg-gray-300 dark:bg-slate-700 shadow-lg w-32 text-xs flex flex-col items-center space-y-2';
    masterTrackDiv.innerHTML = `
        <div class="track-name font-bold text-sm text-gray-800 dark:text-slate-100 truncate w-full text-center mb-1" title="Master">Master</div>
        <div id="masterVolumeKnob-mixer-placeholder" class="h-24 w-full flex justify-center items-center my-1"></div>
        <div id="mixerMasterMeterContainer" class="h-5 w-full bg-gray-400 dark:bg-slate-600 rounded border border-gray-500 dark:border-slate-500 overflow-hidden mt-1 shadow-inner">
            <div id="mixerMasterMeterBar" class="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-50 ease-linear" style="width: 0%;"></div>
        </div>`;
    container.appendChild(masterTrackDiv);
    const masterVolKnobPlaceholder = masterTrackDiv.querySelector('#masterVolumeKnob-mixer-placeholder');
    if (masterVolKnobPlaceholder && localAppServices.createKnob) {
        const masterGainValue = localAppServices.getMasterGainValue ? localAppServices.getMasterGainValue() : Tone.dbToGain(0);
        const masterVolKnob = localAppServices.createKnob({
            label: 'Master Vol',
            min: 0, max: 1.2, step: 0.01,
            initialValue: masterGainValue,
            decimals: 2,
            onValueChange: (val, oldVal, fromInteraction) => {
                if (localAppServices.setActualMasterVolume) localAppServices.setActualMasterVolume(val);
                if (localAppServices.setMasterGainValueState) localAppServices.setMasterGainValueState(val);
                if (fromInteraction && localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Master Volume to ${val.toFixed(2)}`);
             }
        });
        masterVolKnobPlaceholder.innerHTML = ''; masterVolKnobPlaceholder.appendChild(masterVolKnob.element);
    }

    tracks.forEach(track => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'mixer-track flex-shrink-0 p-3 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 shadow-lg w-32 text-xs flex flex-col items-center space-y-2';
        trackDiv.innerHTML = `
            <div class="track-name font-semibold text-gray-800 dark:text-slate-200 truncate w-full text-center mb-1" title="${track.name}">${track.name}</div>
            <div id="volumeKnob-mixer-${track.id}-placeholder" class="h-24 w-full flex justify-center items-center my-1"></div>
            <div class="grid grid-cols-2 gap-1.5 w-full my-1">
                <button id="mixerMuteBtn-${track.id}" title="Mute" class="px-1.5 py-1 text-xs border border-gray-400 dark:border-slate-500 rounded font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600 ${track.isMuted ? 'bg-yellow-400 dark:bg-yellow-500 text-black dark:text-white' : 'bg-gray-200 dark:bg-slate-500'}">${track.isMuted ? 'Unmute' : 'Mute'}</button>
                <button id="mixerSoloBtn-${track.id}" title="Solo" class="px-1.5 py-1 text-xs border border-gray-400 dark:border-slate-500 rounded font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600 ${track.isSoloed ? 'bg-orange-400 dark:bg-orange-500 text-black dark:text-white' : 'bg-gray-200 dark:bg-slate-500'}">${track.isSoloed ? 'Unsolo' : 'Solo'}</button>
            </div>
            <div id="mixerTrackMeterContainer-${track.id}" class="h-5 w-full bg-gray-200 dark:bg-slate-600 rounded border border-gray-300 dark:border-slate-500 overflow-hidden mt-0.5 shadow-inner">
                <div id="mixerTrackMeterBar-${track.id}" class="h-full bg-green-500 dark:bg-green-400 transition-all duration-50 ease-linear" style="width: 0%;"></div>
            </div>`;

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
                        if (localAppServices.renameTrack) { // Assuming a service exists for this
                            localAppServices.renameTrack(track.id, newName.trim());
                        } else {
                             currentTrackForMenu.setName(newName.trim());
                             console.warn("renameTrack service not available, track name updated directly.");
                        }
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
        if (volKnobPlaceholder && localAppServices.createKnob) {
            const volKnob = localAppServices.createKnob({
                label: ``,
                min: 0, max: 1.2, step: 0.01,
                initialValue: track.previousVolumeBeforeMute,
                decimals: 2,
                trackRef: track,
                onValueChange: (val, oldVal, fromInteraction) => track.setVolume(val, fromInteraction)
            });
            volKnobPlaceholder.innerHTML = ''; volKnobPlaceholder.appendChild(volKnob.element);
        }
        trackDiv.querySelector(`#mixerMuteBtn-${track.id}`).addEventListener('click', (e) => { e.stopPropagation(); localAppServices.handleTrackMute(track.id); });
        trackDiv.querySelector(`#mixerSoloBtn-${track.id}`).addEventListener('click', (e) => { e.stopPropagation(); localAppServices.handleTrackSolo(track.id); });
    });
}


// --- Timeline UI Functions ---
export function renderTimeline() {
    // ... (renderTimeline - part 1: setup, no changes here for now) ...
    const timelineWindow = localAppServices.getWindowById ? localAppServices.getWindowById('timeline') : null;
    if (!timelineWindow || !timelineWindow.element || timelineWindow.isMinimized) {
        return;
    }

    const tracksArea = timelineWindow.element.querySelector('#timeline-tracks-area');
    const tracks = getTracksState ? getTracksState() : [];
    if (!tracksArea || !tracks) {
        console.warn("Timeline area or tracks not found for rendering inside timeline window.");
        if (tracksArea) tracksArea.innerHTML = '<p class="p-4 text-sm text-gray-500 dark:text-slate-400">No tracks to display.</p>';
        return;
    }

    tracksArea.innerHTML = '';

    const trackNameWidthStyle = getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim();
    const trackNameWidth = parseFloat(trackNameWidthStyle) || 120;

    // MODIFICATION: Define pixelsPerSecond and snap interval for timeline interactions
    const pixelsPerSecond = 30; // Should be consistent with playhead and calculations
    const tempo = (typeof Tone !== 'undefined' && Tone.Transport?.bpm?.value) ? Tone.Transport.bpm.value : 120;
    const sixteenthNoteDuration = (60 / tempo) / 4; // Duration of a 16th note in seconds
    const snapXIntervalPixels = sixteenthNoteDuration * pixelsPerSecond;


    tracks.forEach(track => {
        // ... (track lane and name area setup - no changes here for now) ...
        const lane = document.createElement('div');
        lane.className = 'timeline-track-lane h-16 flex items-center border-b border-gray-700 dark:border-slate-700 bg-gray-800 dark:bg-slate-800/70 odd:bg-gray-750 dark:odd:bg-slate-800/50 relative overflow-hidden';
        lane.dataset.trackId = track.id;

        const nameArea = document.createElement('div');
        nameArea.className = 'timeline-track-lane-name-area sticky left-0 z-20 bg-gray-700 dark:bg-slate-700/80 border-r border-gray-600 dark:border-slate-600 p-2 h-full flex flex-col items-start justify-center overflow-hidden shadow-sm';
        nameArea.style.minWidth = trackNameWidth + 'px';
        nameArea.style.maxWidth = trackNameWidth + 'px';

        const nameEl = document.createElement('div');
        nameEl.className = 'timeline-track-name-text text-sm font-medium text-slate-100 dark:text-slate-100 whitespace-nowrap overflow-hidden text-ellipsis w-full mb-1';
        nameEl.textContent = track.name;
        nameEl.title = track.name;
        nameArea.appendChild(nameEl);

        if (track.type !== 'Audio' && track.sequences && track.sequences.length > 0) {
            const sequenceButtonsContainer = document.createElement('div');
            sequenceButtonsContainer.className = 'timeline-sequence-buttons flex flex-wrap gap-1 mt-1 items-center';

            track.sequences.forEach(sequence => {
                const seqButton = document.createElement('div');
                seqButton.className = 'sequence-timeline-button dragging-sequence-button text-xs px-2 py-1 border border-sky-700 dark:border-sky-600 rounded bg-sky-600 hover:bg-sky-500 text-white cursor-grab shadow-md';
                seqButton.textContent = "Seq";
                seqButton.title = `Drag Sequence: ${sequence.name}`;
                seqButton.style.touchAction = 'none';

                if (window.interact) {
                    interact(seqButton).unset();
                    interact(seqButton).draggable({
                        inertia: true,
                        autoScroll: { container: timelineWindow.element.querySelector('.window-content') },
                        modifiers: [ // MODIFICATION: Add snap modifier for sequence buttons
                            interact.modifiers.snap({
                                targets: [ interact.snappers.grid({ x: snapXIntervalPixels, y: 0 }) ],
                                range: Infinity,
                                relativePoints: [ { x: 0, y: 0 } ]
                            })
                        ],
                        listeners: {
                            start: (event) => {
                                const dragData = {
                                    type: 'sequence-timeline-drag',
                                    sourceSequenceId: sequence.id,
                                    sourceTrackId: track.id,
                                    clipName: sequence.name
                                };
                                const targetElement = event.interaction.element || event.target;
                                if (targetElement) {
                                    targetElement.dataset.dragType = 'sequence-timeline-drag';
                                    targetElement.dataset.jsonData = JSON.stringify(dragData);
                                    targetElement.classList.add('opacity-75', 'ring-2', 'ring-sky-300', 'shadow-xl');
                                    targetElement.style.position = 'relative';
                                    targetElement.style.zIndex = '10001';
                                }
                            },
                            move: (event) => {
                                const target = event.interaction.element || event.target;
                                if (target) {
                                    const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                                    const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;
                                    target.style.transform = `translate(${x}px, ${y}px)`;
                                    target.setAttribute('data-x', x);
                                    target.setAttribute('data-y', y);
                                }
                            },
                            end: (event) => {
                                const targetElement = event.interaction.element || event.target;
                                if (targetElement) {
                                    targetElement.classList.remove('opacity-75', 'ring-2', 'ring-sky-300', 'shadow-xl');
                                    targetElement.style.transform = 'none';
                                    targetElement.removeAttribute('data-x');
                                    targetElement.removeAttribute('data-y');
                                    targetElement.style.zIndex = '';
                                }
                                if (localAppServices.renderTimeline && !event.dropzone) {
                                   setTimeout(() => localAppServices.renderTimeline(), 0);
                                }
                            }
                        }
                    });
                }
                sequenceButtonsContainer.appendChild(seqButton);
            });
            nameArea.appendChild(sequenceButtonsContainer);
        }
        lane.appendChild(nameArea);

        const clipsContainer = document.createElement('div');
        clipsContainer.className = 'timeline-clips-container relative flex-grow h-full';

        if (window.interact) {
            interact(clipsContainer).unset();
            interact(clipsContainer)
                .dropzone({
                    accept: '.audio-clip, .dragging-sound-item, .dragging-sequence-button',
                    overlap: 0.01,
                    ondropactivate: function (event) {
                        event.target.classList.add('bg-slate-700/70', 'dark:bg-slate-600/70');
                    },
                    ondragenter: function (event) {
                        const draggableElement = event.relatedTarget;
                        const dropzoneElement = event.target;
                        dropzoneElement.classList.add('bg-blue-700/40', 'dark:bg-blue-600/40');
                        if (draggableElement) draggableElement.classList.add('ring-2', 'ring-green-300', 'dark:ring-green-400');
                    },
                    ondragleave: function (event) {
                        const draggableElement = event.relatedTarget;
                        event.target.classList.remove('bg-blue-700/40', 'dark:bg-blue-600/40');
                        if (draggableElement) draggableElement.classList.remove('ring-2', 'ring-green-300', 'dark:ring-green-400');
                    },
                    ondrop: function (event) {
                        const droppedClipElement = event.relatedTarget;
                        const targetLaneElement = event.target.closest('.timeline-track-lane');
                        if (!targetLaneElement) {
                            console.error("Could not find parent lane for dropped item on clipsContainer.");
                            return;
                        }
                        const targetTrackId = parseInt(targetLaneElement.dataset.trackId, 10);

                        const timelineWindowLocal = localAppServices.getWindowById ? localAppServices.getWindowById('timeline') : null;
                        if (!timelineWindowLocal || !timelineWindowLocal.element) { console.error("Timeline window not found during drop"); return; }

                        const clipsContainerRect = event.target.getBoundingClientRect();
                        let dropXClient = 0;
                        if (event.dragEvent && typeof event.dragEvent.clientX === 'number') dropXClient = event.dragEvent.clientX;
                        else if (event.client && typeof event.client.x === 'number') dropXClient = event.client.x;
                        else if (typeof event.clientX === 'number') dropXClient = event.clientX;
                        else {
                            console.error("[TimelineLane ClipsContainer ONDROP] Cannot determine drop clientX coordinate from event:", event);
                            event.target.classList.remove('bg-blue-700/40', 'dark:bg-blue-600/40');
                            if(droppedClipElement) droppedClipElement.classList.remove('ring-2', 'ring-green-300', 'dark:ring-green-400');
                            return;
                        }

                        let dropX = dropXClient - clipsContainerRect.left + event.target.scrollLeft;
                        dropX = Math.max(0, dropX);
                        const rawStartTime = dropX / pixelsPerSecond;
                        // MODIFICATION: Snap the calculated start time
                        const snappedStartTime = snapTimeToGrid(rawStartTime, sixteenthNoteDuration);
                        const startTime = snappedStartTime;

                        console.log(`[UI Timeline ClipsContainer Drop] TargetTrackID: ${targetTrackId}, Raw StartTime: ${rawStartTime.toFixed(3)}s, Snapped StartTime: ${startTime.toFixed(3)}s`);

                        const clipId = droppedClipElement.dataset.clipId;
                        const originalTrackId = parseInt(droppedClipElement.dataset.originalTrackId, 10);
                        const dragType = droppedClipElement.dataset.dragType;
                        const jsonDataString = droppedClipElement.dataset.jsonData;

                        if (clipId && !isNaN(originalTrackId) && dragType !== 'sound-browser-item' && dragType !== 'sequence-timeline-drag') {
                            const originalTrack = localAppServices.getTrackById(originalTrackId);
                            if (!originalTrack || !originalTrack.timelineClips) { return; }
                            const clipData = originalTrack.timelineClips.find(c => c.id === clipId);

                            if (clipData) {
                                const targetTrackForDrop = localAppServices.getTrackById(targetTrackId);
                                if (targetTrackForDrop && targetTrackForDrop.type === originalTrack.type) {
                                    if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Move Clip "${clipData.name}" to Track "${targetTrackForDrop.name}" at ${startTime.toFixed(2)}s`);
                                    if (originalTrackId !== targetTrackId) {
                                        originalTrack.timelineClips = originalTrack.timelineClips.filter(c => c.id !== clipId);
                                        targetTrackForDrop.timelineClips.push({...JSON.parse(JSON.stringify(clipData)), startTime: startTime, id: `clip_${targetTrackId}_${Date.now()}`});
                                    } else {
                                        const existingClip = targetTrackForDrop.timelineClips.find(c => c.id === clipId);
                                        if (existingClip) existingClip.startTime = startTime;
                                    }
                                    if(localAppServices.renderTimeline) localAppServices.renderTimeline();
                                } else if (targetTrackForDrop && targetTrackForDrop.type !== originalTrack.type) {
                                     showNotification(`Cannot move ${originalTrack.type} clip to ${targetTrackForDrop.type} track.`, 3000);
                                     if(localAppServices.renderTimeline) localAppServices.renderTimeline();
                                } else if (!targetTrackForDrop) {
                                    console.error("Target track for drop not found.");
                                }
                            }
                        } else if ((dragType === 'sound-browser-item' || dragType === 'sequence-timeline-drag') && jsonDataString) {
                            try {
                                const droppedItemData = JSON.parse(jsonDataString);
                                 if (localAppServices.handleTimelineLaneDrop) {
                                    localAppServices.handleTimelineLaneDrop(droppedItemData, targetTrackId, startTime); // Pass snapped startTime
                                }
                            } catch (e) { console.error("Error parsing jsonData from dropped element:", e); }
                        }
                        event.target.classList.remove('bg-blue-700/40', 'dark:bg-blue-600/40');
                        if(droppedClipElement) droppedClipElement.classList.remove('ring-2', 'ring-green-300', 'dark:ring-green-400');
                    },
                    ondropdeactivate: function (event) {
                        event.target.classList.remove('bg-slate-700/70','bg-blue-700/40', 'dark:bg-blue-600/40');
                    }
                });
        }


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
                let typeSpecificClass = 'bg-teal-600 hover:bg-teal-500 border-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400 dark:border-teal-600';
                if (clip.type === 'sequence') {
                    typeSpecificClass = 'bg-sky-600 hover:bg-sky-500 border-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 dark:border-sky-600';
                }
                clipEl.className = `audio-clip absolute h-4/5 top-[10%] rounded-md border text-white text-xs px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis cursor-grab shadow-lg transition-all duration-100 ${typeSpecificClass}`;

                clipEl.textContent = clipText; clipEl.title = clipTitle;
                clipEl.style.left = `${(clip.startTime || 0) * pixelsPerSecond}px`;
                clipEl.style.width = `${Math.max(20, (clip.duration || 0) * pixelsPerSecond)}px`;
                clipEl.style.touchAction = 'none';

                if (window.interact) {
                    interact(clipEl).unset();
                    interact(clipEl)
                        .draggable({
                            inertia: false, // MODIFICATION: Changed inertia to false for a more direct snap feel
                            modifiers: [
                                interact.modifiers.restrictRect({
                                    restriction: 'parent',
                                    endOnly: false
                                }),
                                // MODIFICATION: Added snap modifier for clips
                                interact.modifiers.snap({
                                    targets: [
                                      interact.snappers.grid({ x: snapXIntervalPixels, y: 0 })
                                    ],
                                    range: Infinity,
                                    relativePoints: [ { x: 0, y: 0 } ] // Snap top-left of the clip to grid
                                  })
                            ],
                            listeners: {
                                start: (event) => {
                                    const target = event.target;
                                    target.dataset.startX = parseFloat(target.style.left) || 0;
                                    target.classList.add('opacity-75', 'ring-2', 'ring-yellow-300', 'dark:ring-yellow-400', 'z-30', 'shadow-xl');
                                    target.style.zIndex = 10002; // Ensure dragged clip is above others
                                },
                                move: (event) => {
                                    const target = event.target;
                                    // The snap modifier should handle the visual position during move.
                                    // We still need to update data-startX if we were calculating manually,
                                    // but with snap, dx/dy might be adjusted.
                                    // For simplicity, let snap handle visuals, and ondrop handles final data.
                                    // Manual translation for visual feedback if snap doesn't cover it entirely:
                                    const x = (parseFloat(target.dataset.startXInternal) || parseFloat(target.style.left) || 0) + event.dx;
                                    target.style.left = `${Math.max(0, x)}px`;
                                    target.dataset.startXInternal = Math.max(0, x);


                                },
                                end: (event) => {
                                    const target = event.target;
                                    target.classList.remove('opacity-75', 'ring-2', 'ring-yellow-300', 'dark:ring-yellow-400', 'z-30', 'shadow-xl');
                                    target.style.zIndex = '';

                                    const finalLeftPixels = parseFloat(target.style.left) || 0;
                                    const rawNewStartTime = Math.max(0, finalLeftPixels / pixelsPerSecond);
                                    // MODIFICATION: Snap the final startTime here too
                                    const newStartTime = snapTimeToGrid(rawNewStartTime, sixteenthNoteDuration);


                                    const currentClipId = target.dataset.clipId;
                                    const currentTrackId = parseInt(target.dataset.originalTrackId, 10);
                                    const currentTrack = localAppServices.getTrackById(currentTrackId);
                                    const originalClipData = currentTrack ? currentTrack.timelineClips.find(c => c.id === currentClipId) : null;

                                    if (!event.dropzone && originalClipData) { // If not dropped onto a new lane
                                        if (Math.abs(newStartTime - originalClipData.startTime) > 0.0001) { // Use a small epsilon for float comparison
                                             if (localAppServices.captureStateForUndo) {
                                                localAppServices.captureStateForUndo(`Move clip "${originalClipData.name}" on track "${currentTrack.name}"`);
                                            }
                                            if (currentTrack.updateAudioClipPosition) {
                                                currentTrack.updateAudioClipPosition(currentClipId, newStartTime); // This will call renderTimeline
                                            } else {
                                                console.error("Track.updateAudioClipPosition method not found!");
                                                // Fallback or direct update if method is missing, then manually rerender
                                                originalClipData.startTime = newStartTime;
                                                if (localAppServices.renderTimeline) localAppServices.renderTimeline();
                                            }
                                        } else {
                                            // If no significant change, visually snap it back to original if snap caused minor visual offset
                                            target.style.left = `${originalClipData.startTime * pixelsPerSecond}px`;
                                        }
                                    } else if (!event.dropzone) { // Not dropped on a new lane, but originalClipData not found (should not happen)
                                        if (localAppServices.renderTimeline) localAppServices.renderTimeline(); // Re-render to reset
                                    }
                                    delete target.dataset.startX;
                                    delete target.dataset.startXInternal;
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
    // ... (no changes to this function)
    const timelineWindow = localAppServices.getWindowById ? localAppServices.getWindowById('timeline') : null;
    if (!timelineWindow || !timelineWindow.element || timelineWindow.isMinimized) { return; }

    const playhead = timelineWindow.element.querySelector('#timeline-playhead');
    const timelineRuler = timelineWindow.element.querySelector('#timeline-ruler');
    const tracksContainer = timelineWindow.element.querySelector('#timeline-tracks-container');

    if (!playhead || typeof Tone === 'undefined' || !tracksContainer || !localAppServices.getPlaybackMode) return;

    const currentPlaybackMode = localAppServices.getPlaybackMode();
    if (currentPlaybackMode === 'sequencer' || currentPlaybackMode === 'pattern') {
        playhead.style.display = 'none';
        if (timelineRuler) {
            timelineRuler.style.transform = `translateX(-${tracksContainer.scrollLeft}px)`;
        }
        return;
    }
    playhead.style.display = 'block';

    const pixelsPerSecond = 30;
    const trackNameWidthStyle = getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim();
    const trackNameWidth = parseFloat(trackNameWidthStyle) || 120;

    if (Tone.Transport.state === 'started') {
        const rawNewPosition = Tone.Transport.seconds * pixelsPerSecond;
        playhead.style.left = `${trackNameWidth + rawNewPosition - tracksContainer.scrollLeft}px`;

        const scrollableClipsArea = tracksContainer;
        const containerWidth = scrollableClipsArea.clientWidth;

        const playheadVisualPositionInScrollable = rawNewPosition - scrollableClipsArea.scrollLeft;

        if (playheadVisualPositionInScrollable > containerWidth * 0.7) {
            scrollableClipsArea.scrollLeft += (playheadVisualPositionInScrollable - (containerWidth * 0.7)) + 30;
        }
        else if (playheadVisualPositionInScrollable < containerWidth * 0.1 && scrollableClipsArea.scrollLeft > 0) {
            scrollableClipsArea.scrollLeft = Math.max(0, rawNewPosition - (containerWidth * 0.1) - 30);
        }
        if (scrollableClipsArea.scrollLeft < 0) scrollableClipsArea.scrollLeft = 0;

    } else if (Tone.Transport.state === 'stopped') {
         playhead.style.left = `${trackNameWidth - tracksContainer.scrollLeft}px`;
    }
    if (timelineRuler && tracksContainer) {
        timelineRuler.style.transform = `translateX(-${tracksContainer.scrollLeft}px)`;
    }
}

export function openTimelineWindow(savedState = null) {
    // ... (no changes to this function)
    const windowId = 'timeline';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) {
        const win = openWindows.get(windowId);
        win.restore();
        renderTimeline();
        return win;
    }

    const contentHTML = `
        <div id="timeline-container" class="flex flex-col h-full w-full bg-gray-800 dark:bg-slate-900 overflow-hidden rounded-b-md">
            <div id="timeline-header" class="h-6 bg-gray-700 dark:bg-slate-800 border-b border-gray-600 dark:border-slate-700 flex-shrink-0 relative overflow-hidden w-full shadow">
                <div id="timeline-ruler" class="absolute top-0 left-0 h-full bg-gray-600/50 dark:bg-slate-700/50 text-xs text-gray-300 dark:text-slate-400"
                     style="width: 4000px; background-image:
                            repeating-linear-gradient(to right, rgba(128,128,128,0.5) 0 1px, transparent 1px 100%),
                            repeating-linear-gradient(to right, rgba(100,100,100,0.3) 0 1px, transparent 1px 100%);
                            background-size: 120px 100%, 30px 100%; background-position: left top; padding-left: var(--timeline-track-name-width, 120px);">
                    </div>
            </div>
            <div id="timeline-tracks-container" class="flex-grow overflow-auto relative w-full">
                <div id="timeline-tracks-area" class="relative" style="width: 4000px;">
                    </div>
            </div>
            <div id="timeline-playhead" class="absolute top-0 w-0.5 h-full bg-cyan-400 dark:bg-cyan-300 z-30 pointer-events-none shadow-lg" style="display:none;"></div>
        </div>
    `;

    const desktopEl = localAppServices.uiElementsCache?.desktop || document.getElementById('desktop');
    const safeDesktopWidth = (desktopEl && typeof desktopEl.offsetWidth === 'number' && desktopEl.offsetWidth > 0) ? desktopEl.offsetWidth : 1024;
    const timelineOptions = {
        width: Math.max(600, Math.min(1200, safeDesktopWidth - 60)),
        height: 300,
        x: 30,
        y: 50,
        minWidth: 400,
        minHeight: 200,
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
        const tracksContainer = timelineWindow.element.querySelector('#timeline-tracks-container');

        const scrollSyncHandler = () => {
            const ruler = timelineWindow.element.querySelector('#timeline-ruler');
            const playhead = timelineWindow.element.querySelector('#timeline-playhead');
            const trackNameWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim()) || 120;

            if (ruler && tracksContainer) {
                ruler.style.paddingLeft = `${trackNameWidth}px`;
                ruler.style.transform = `translateX(-${tracksContainer.scrollLeft + trackNameWidth}px)`;
            }

            if (playhead && Tone.Transport.state !== 'stopped' && localAppServices.getPlaybackMode && localAppServices.getPlaybackMode() === 'timeline') {
                 const pixelsPerSecondConst = 30; // Use the same const as in renderTimeline
                 const rawNewPosition = Tone.Transport.seconds * pixelsPerSecondConst;
                 playhead.style.left = `${trackNameWidth + rawNewPosition - tracksContainer.scrollLeft}px`;
            } else if (playhead && Tone.Transport.state === 'stopped') {
                 playhead.style.left = `${trackNameWidth - tracksContainer.scrollLeft}px`;
            }
        };

        if (tracksContainer) {
            tracksContainer.addEventListener('scroll', scrollSyncHandler);
        }

        renderTimeline();
        setTimeout(scrollSyncHandler, 0);
    }
    return timelineWindow;
}
