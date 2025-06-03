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

    // Tailwind: main container, controls styling
    let html = `<div class="sequencer-container p-1 text-xs overflow-auto h-full bg-gray-800 dark:bg-slate-900 text-slate-300 dark:text-slate-300">
        <div class="controls mb-1 flex justify-between items-center sticky top-0 left-0 bg-gray-700 dark:bg-slate-800 p-1.5 z-30 border-b border-gray-600 dark:border-slate-700 rounded-t-md">
            <span class="font-semibold text-sm text-slate-100 dark:text-slate-100">${track.name} - ${numBars} Bar${numBars > 1 ? 's' : ''} (${totalSteps} steps)</span>
            <div class="flex items-center space-x-2">
                <label for="seqLengthInput-${track.id}" class="text-xs text-slate-300 dark:text-slate-400">Bars:</label>
                <input type="number" id="seqLengthInput-${track.id}" value="${numBars}" min="1" max="${Constants.MAX_BARS || 16}" 
                       class="w-16 p-1 border border-gray-500 dark:border-slate-600 rounded text-xs bg-gray-600 dark:bg-slate-700 text-slate-100 dark:text-slate-200 focus:ring-blue-500 focus:border-blue-500">
            </div>
        </div>`;
    
    // Tailwind: grid layout, sticky headers/labels, borders, backgrounds
    html += `<div class="sequencer-grid-layout" style="display: grid; grid-template-columns: 60px repeat(${totalSteps}, 22px); grid-auto-rows: 22px; gap: 1px; width: fit-content; position: relative; background-color: #2d3748; /* bg-slate-800 */">
        <div class="sequencer-header-cell sticky top-0 left-0 z-20 bg-gray-700 dark:bg-slate-800 border-r border-b border-gray-600 dark:border-slate-700"></div>`; // Top-left empty cell
    
    for (let i = 0; i < totalSteps; i++) {
        // Header cells for step numbers/bar markers
        html += `<div class="sequencer-header-cell sticky top-0 z-10 bg-gray-700 dark:bg-slate-800 border-r border-b border-gray-600 dark:border-slate-700 flex items-center justify-center text-[10px] text-gray-400 dark:text-slate-400">
                    ${(i % stepsPerBar === 0) ? (Math.floor(i / stepsPerBar) + 1) : ((i % (stepsPerBar / 4) === 0) ? '&#x2022;' : '')}
                 </div>`;
    }

    const activeSequence = track.getActiveSequence();
    const sequenceData = activeSequence ? activeSequence.data : [];

    for (let i = 0; i < rows; i++) {
        let labelText = rowLabels[i] || `R${i + 1}`;
        if (labelText.length > 7) labelText = labelText.substring(0, 6) + ".."; // Truncate long labels
        // Row label cells
        html += `<div class="sequencer-label-cell sticky left-0 z-10 bg-gray-700 dark:bg-slate-800 border-r border-b border-gray-600 dark:border-slate-700 flex items-center justify-end pr-1.5 text-[10px] text-slate-300 dark:text-slate-300" title="${rowLabels[i] || ''}">${labelText}</div>`;
        
        for (let j = 0; j < totalSteps; j++) {
            const stepData = sequenceData[i]?.[j];
            let activeClass = '';
            if (stepData?.active) {
                if (track.type === 'Synth') activeClass = 'bg-sky-500 dark:bg-sky-500';
                else if (track.type === 'Sampler') activeClass = 'bg-teal-500 dark:bg-teal-500';
                else if (track.type === 'DrumSampler') activeClass = 'bg-emerald-500 dark:bg-emerald-500';
                else if (track.type === 'InstrumentSampler') activeClass = 'bg-cyan-500 dark:bg-cyan-500';
            }
            // Alternating backgrounds for 4-step blocks, bar lines
            let beatBlockClass = (Math.floor(j / 4) % 2 === 0) ? 'bg-gray-600 dark:bg-slate-700/80' : 'bg-gray-500 dark:bg-slate-700/60';
            if (j % stepsPerBar === 0 && j > 0) beatBlockClass += ' border-l-2 border-l-gray-500 dark:border-l-slate-500'; // Bar line
            else if (j > 0 && j % (stepsPerBar / 2) === 0) beatBlockClass += ' border-l-gray-500 dark:border-l-slate-600'; // Half-bar line
            else if (j > 0 && j % (stepsPerBar / 4) === 0) beatBlockClass += ' border-l-gray-600 dark:border-l-slate-650'; // Beat line
            
            html += `<div class="sequencer-step-cell ${activeClass} ${beatBlockClass} border-r border-b border-gray-600 dark:border-slate-700 hover:bg-blue-400 dark:hover:bg-blue-600 cursor-pointer transition-colors duration-75" 
                         data-row="${i}" data-col="${j}" title="R${i+1},S${j+1}"></div>`;
        }
    }
    html += `</div></div>`; // Close grid-layout and sequencer-container
    return html;
}

export function openTrackSequencerWindow(trackId, forceRedraw = false, savedState = null) {
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
                existingWindow.close(true); // true for reconstruction context
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
    
    let calculatedWidth = Math.max(450, Math.min(900, safeDesktopWidth - 40)); // Adjusted min width
    let calculatedHeight = Math.min(500, (rows * 23) + 80); // Dynamic height based on rows, capped
    calculatedHeight = Math.max(300, calculatedHeight); // Min height

    if (!Number.isFinite(calculatedWidth) || calculatedWidth <= 0) calculatedWidth = 600;
    if (!Number.isFinite(calculatedHeight) || calculatedHeight <= 0) calculatedHeight = 400;

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
            if (window.interact && interact.isSet(controlsDiv)) { 
                try { interact(controlsDiv).unset(); } 
                catch(e) { console.warn("Error unsetting interact from sequencer controls:", e.message); }
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

                if (!e.ctrlKey && !e.metaKey && !e.shiftKey) { // Simple click toggles
                    if (!currentActiveSeq.data[row]) currentActiveSeq.data[row] = Array(currentActiveSeq.length).fill(null);
                    const currentStepData = currentActiveSeq.data[row][col];
                    const isActive = !(currentStepData?.active);
                    if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Toggle Step (${row + 1},${col + 1}) on ${track.name} (${currentActiveSeq.name})`);
                    currentActiveSeq.data[row][col] = isActive ? { active: true, velocity: Constants.defaultVelocity } : null;
                    updateSequencerCellUI(sequencerWindow.element, track.type, row, col, isActive);
                    // No need to call recreateToneSequence here, it's too heavy for single step change.
                    // The Tone.Sequence should ideally pick up changes from the data array directly,
                    // or have a more lightweight update mechanism if necessary.
                    // For now, rely on the Tone.Sequence callback reading the updated data.
                }
                // Add shift+click for velocity, ctrl+click for note length later if needed
            }
        });
        const lengthInput = sequencerWindow.element.querySelector(`#seqLengthInput-${track.id}`);
        if (lengthInput) {
            lengthInput.value = numBars;
            lengthInput.addEventListener('change', (e) => {
                const newNumBars = parseInt(e.target.value, 10);
                const activeSeqForLengthChange = track.getActiveSequence();
                if (activeSeqForLengthChange && !isNaN(newNumBars) && newNumBars >= 1 && newNumBars <= (Constants.MAX_BARS || 16)) {
                    track.setSequenceLength(newNumBars * Constants.STEPS_PER_BAR); // This calls recreateToneSequence
                } else if (activeSeqForLengthChange) {
                    // Reset to current if input is invalid
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

    // Remove all potential active classes first
    cell.classList.remove('bg-sky-500', 'dark:bg-sky-500', 
                          'bg-teal-500', 'dark:bg-teal-500',
                          'bg-emerald-500', 'dark:bg-emerald-500',
                          'bg-cyan-500', 'dark:bg-cyan-500');
    if (isActive) {
        let activeClass = '';
        if (trackType === 'Synth') activeClass = 'bg-sky-500 dark:bg-sky-500';
        else if (trackType === 'Sampler') activeClass = 'bg-teal-500 dark:bg-teal-500';
        else if (trackType === 'DrumSampler') activeClass = 'bg-emerald-500 dark:bg-emerald-500';
        else if (trackType === 'InstrumentSampler') activeClass = 'bg-cyan-500 dark:bg-cyan-500';
        if (activeClass) cell.classList.add(...activeClass.split(' '));
    }
}

export function highlightPlayingStep(trackId, col) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
    if (!track || track.type === 'Audio') return;

    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    const seqWindowInstance = openWindows.get(`sequencerWin-${trackId}`);

    if (seqWindowInstance && seqWindowInstance.element && !seqWindowInstance.isMinimized && seqWindowInstance.stepCellsGrid) {
        const activeSeq = track.getActiveSequence();
        const currentSeqLength = activeSeq ? activeSeq.length : Constants.defaultStepsPerBar;

        // Remove 'playing' from the previously played column
        if (seqWindowInstance.lastPlayedCol !== -1 && seqWindowInstance.lastPlayedCol < currentSeqLength) {
            for (let i = 0; i < seqWindowInstance.stepCellsGrid.length; i++) {
                const cell = seqWindowInstance.stepCellsGrid[i]?.[seqWindowInstance.lastPlayedCol];
                if (cell) {
                    cell.classList.remove('ring-2', 'ring-offset-2', 'ring-yellow-400', 'dark:ring-yellow-300', 'dark:ring-offset-slate-900', 'z-10'); // Tailwind for highlight
                }
            }
        }

        // Add 'playing' to the current column
        if (col < currentSeqLength) {
            for (let i = 0; i < seqWindowInstance.stepCellsGrid.length; i++) {
                const cell = seqWindowInstance.stepCellsGrid[i]?.[col];
                if (cell) {
                    cell.classList.add('ring-2', 'ring-offset-2', 'ring-yellow-400', 'dark:ring-yellow-300', 'dark:ring-offset-slate-900', 'z-10'); // Tailwind for highlight
                }
            }
        }
        seqWindowInstance.lastPlayedCol = col;
    }
}


// --- Mixer Window ---
export function openMixerWindow(savedState = null) {
    const windowId = 'mixer';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();
    if (openWindows.has(windowId) && !savedState) { openWindows.get(windowId).restore(); return openWindows.get(windowId); }

    const contentContainer = document.createElement('div'); contentContainer.id = 'mixerContentContainer';
    // Tailwind: padding, overflow, flex for horizontal layout, background
    contentContainer.className = 'p-2 overflow-x-auto whitespace-nowrap h-full bg-gray-200 dark:bg-slate-800 flex space-x-2';
    
    const desktopEl = localAppServices.uiElementsCache?.desktop || document.getElementById('desktop');
    const mixerOptions = { 
        width: Math.min(800, (desktopEl?.offsetWidth || 800) - 40), 
        height: 320, // Increased height for better knob visibility
        minWidth: 300, minHeight: 250, // Adjusted minHeight
        initialContentKey: windowId 
    };
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
    container.innerHTML = ''; // Clear previous content

    // Master Track Strip
    const masterTrackDiv = document.createElement('div');
    // Tailwind: mixer track styling, specific for master
    masterTrackDiv.className = 'mixer-track master-track flex-shrink-0 p-2 border border-gray-400 dark:border-slate-600 rounded-lg bg-gray-300 dark:bg-slate-700 shadow-md w-28 text-xs flex flex-col items-center space-y-1';
    masterTrackDiv.innerHTML = `
        <div class="track-name font-bold text-sm text-gray-800 dark:text-slate-100 truncate w-full text-center" title="Master">Master</div>
        <div id="masterVolumeKnob-mixer-placeholder" class="h-20 w-full flex justify-center items-center my-1"></div>
        <div id="mixerMasterMeterContainer" class="h-4 w-full bg-gray-400 dark:bg-slate-600 rounded border border-gray-500 dark:border-slate-500 overflow-hidden mt-1 shadow-inner">
            <div id="mixerMasterMeterBar" class="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-50 ease-linear" style="width: 0%;"></div>
        </div>`;
    container.appendChild(masterTrackDiv);
    const masterVolKnobPlaceholder = masterTrackDiv.querySelector('#masterVolumeKnob-mixer-placeholder');
    if (masterVolKnobPlaceholder && localAppServices.createKnob) { 
        const masterGainValue = localAppServices.getMasterGainValue ? localAppServices.getMasterGainValue() : Tone.dbToGain(0);
        // const masterVolume = masterGainNode; // This was incorrect, masterGainNode is not a Tone.Param
        const masterVolKnob = localAppServices.createKnob({ 
            label: 'Master Vol', 
            min: 0, max: 1.2, step: 0.01, 
            initialValue: masterGainValue, // Use the gain value directly
            decimals: 2, 
            onValueChange: (val, oldVal, fromInteraction) => {
                if (localAppServices.setActualMasterVolume) localAppServices.setActualMasterVolume(val);
                if (localAppServices.setMasterGainValueState) localAppServices.setMasterGainValueState(val); // Update state
                if (fromInteraction && localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Set Master Volume to ${val.toFixed(2)}`);
             } 
        });
        masterVolKnobPlaceholder.innerHTML = ''; masterVolKnobPlaceholder.appendChild(masterVolKnob.element);
    }

    // Individual Track Strips
    tracks.forEach(track => {
        const trackDiv = document.createElement('div');
        // Tailwind: base mixer track styling
        trackDiv.className = 'mixer-track flex-shrink-0 p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 shadow-md w-28 text-xs flex flex-col items-center space-y-1';
        trackDiv.innerHTML = `
            <div class="track-name font-semibold text-gray-800 dark:text-slate-200 truncate w-full text-center" title="${track.name}">${track.name}</div>
            <div id="volumeKnob-mixer-${track.id}-placeholder" class="h-20 w-full flex justify-center items-center my-1"></div>
            <div class="grid grid-cols-2 gap-1 w-full my-1">
                <button id="mixerMuteBtn-${track.id}" title="Mute" class="px-1 py-0.5 text-xs border border-gray-300 dark:border-slate-500 rounded text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600 ${track.isMuted ? 'bg-yellow-400 dark:bg-yellow-500 text-black dark:text-white' : 'bg-gray-200 dark:bg-slate-500'}">${track.isMuted ? 'U' : 'M'}</button>
                <button id="mixerSoloBtn-${track.id}" title="Solo" class="px-1 py-0.5 text-xs border border-gray-300 dark:border-slate-500 rounded text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-600 ${track.isSoloed ? 'bg-orange-400 dark:bg-orange-500 text-black dark:text-white' : 'bg-gray-200 dark:bg-slate-500'}">${track.isSoloed ? 'U' : 'S'}</button>
            </div>
            <div id="mixerTrackMeterContainer-${track.id}" class="h-4 w-full bg-gray-200 dark:bg-slate-600 rounded border border-gray-300 dark:border-slate-500 overflow-hidden mt-0.5 shadow-inner">
                <div id="mixerTrackMeterBar-${track.id}" class="h-full bg-green-500 dark:bg-green-400 transition-all duration-50 ease-linear" style="width: 0%;"></div>
            </div>`;

        trackDiv.addEventListener('click', (e) => {
            // Prevent button clicks from triggering inspector open
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
                        // Use appService if available, otherwise direct call (less ideal but fallback)
                        if (localAppServices.renameTrack) { // Assuming a renameTrack service might exist in main
                            localAppServices.renameTrack(track.id, newName.trim());
                        } else {
                             currentTrackForMenu.setName(newName.trim()); // Direct call to track method
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
                label: `Vol ${track.id}`, // Simplified label
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
    const timelineWindow = localAppServices.getWindowById ? localAppServices.getWindowById('timeline') : null;
    if (!timelineWindow || !timelineWindow.element || timelineWindow.isMinimized) {
        return;
    }

    const tracksArea = timelineWindow.element.querySelector('#timeline-tracks-area');
    const tracks = getTracksState(); // Assuming getTracksState is available via localAppServices or imported
    if (!tracksArea || !tracks) {
        console.warn("Timeline area or tracks not found for rendering inside timeline window.");
        if (tracksArea) tracksArea.innerHTML = '<p class="p-4 text-sm text-gray-500 dark:text-slate-400">No tracks to display.</p>';
        return;
    }

    tracksArea.innerHTML = ''; // Clear previous content

    // Get the track name width from CSS variable or default
    const trackNameWidthStyle = getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim();
    const trackNameWidth = parseFloat(trackNameWidthStyle) || 120; // Default to 120px if var not found


    tracks.forEach(track => {
        const lane = document.createElement('div');
        // Tailwind: track lane styling, flex for layout
        lane.className = 'timeline-track-lane h-14 flex items-center border-b border-gray-700 dark:border-slate-700 bg-gray-800 dark:bg-slate-800/70 odd:bg-gray-750 dark:odd:bg-slate-800/50 relative overflow-hidden'; 
        lane.dataset.trackId = track.id;

        const nameArea = document.createElement('div');
        // Tailwind: sticky name area, background, border, padding, flex for content alignment
        nameArea.className = 'timeline-track-lane-name-area sticky left-0 z-20 bg-gray-700 dark:bg-slate-700/80 border-r border-gray-600 dark:border-slate-600 p-2 h-full flex flex-col items-start justify-center overflow-hidden'; 
        nameArea.style.minWidth = trackNameWidth + 'px';
        nameArea.style.maxWidth = trackNameWidth + 'px';
        
        const nameEl = document.createElement('div');
        // Tailwind: track name text styling
        nameEl.className = 'timeline-track-name-text text-xs font-medium text-slate-100 dark:text-slate-100 whitespace-nowrap overflow-hidden text-ellipsis w-full mb-0.5'; 
        nameEl.textContent = track.name;
        nameEl.title = track.name; 
        nameArea.appendChild(nameEl);
        
        // Add draggable sequence buttons if applicable
        if (track.type !== 'Audio' && track.sequences && track.sequences.length > 0) {
            const sequenceButtonsContainer = document.createElement('div');
            // Tailwind: container for sequence buttons
            sequenceButtonsContainer.className = 'timeline-sequence-buttons flex flex-wrap gap-1 mt-1 items-center'; 
            
            track.sequences.forEach(sequence => {
                const seqButton = document.createElement('div');
                // Tailwind: sequence button styling
                seqButton.className = 'sequence-timeline-button dragging-sequence-button text-[10px] px-1.5 py-0.5 border border-sky-700 dark:border-sky-600 rounded bg-sky-600 hover:bg-sky-500 text-white cursor-grab shadow';
                seqButton.textContent = "Seq"; // Keep it short
                seqButton.title = `Drag Sequence: ${sequence.name}`;
                seqButton.style.touchAction = 'none'; // Important for Interact.js

                if (window.interact) {
                    interact(seqButton).unset(); // Clear previous interactable
                    interact(seqButton).draggable({
                        inertia: true,
                        autoScroll: { container: timelineWindow.element.querySelector('.window-content') }, // Enable autoscroll on timeline content
                        listeners: {
                            start: (event) => {
                                const dragData = {
                                    type: 'sequence-timeline-drag',
                                    sourceSequenceId: sequence.id,
                                    sourceTrackId: track.id,
                                    clipName: sequence.name // Pass sequence name for the clip
                                };
                                const targetElement = event.interaction.element || event.target;
                                if (targetElement) {
                                    targetElement.dataset.dragType = 'sequence-timeline-drag'; // For dropzone to identify
                                    targetElement.dataset.jsonData = JSON.stringify(dragData);
                                    // Optional: Add a class for visual feedback during drag
                                    targetElement.classList.add('opacity-75', 'ring-2', 'ring-sky-300'); 
                                    targetElement.style.position = 'relative'; 
                                    targetElement.style.zIndex = '10001'; 
                                }
                                console.log(`[Timeline UI] DragStart sequence button: ${sequence.name}`);
                            },
                            move: (event) => { // Make the dragged element follow the cursor
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
                                    // Reset styles after drag
                                    targetElement.classList.remove('opacity-75', 'ring-2', 'ring-sky-300');
                                    targetElement.style.transform = 'none';
                                    targetElement.removeAttribute('data-x');
                                    targetElement.removeAttribute('data-y');
                                    targetElement.style.zIndex = '';
                                }
                                console.log(`[Timeline UI] DragEnd sequence button: ${sequence.name}`);
                                // Re-render timeline if drop was not successful or to clean up
                                if (localAppServices.renderTimeline && !event.dropzone) {
                                   setTimeout(() => localAppServices.renderTimeline(), 0); // Refresh to reset button position if not dropped
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
        // Tailwind: container for clips within a lane, relative for absolute positioned clips
        clipsContainer.className = 'timeline-clips-container relative flex-grow h-full'; 
        
        if (window.interact) {
            interact(clipsContainer).unset(); // Clear previous interactable
            interact(clipsContainer)
                .dropzone({
                    accept: '.audio-clip, .dragging-sound-item, .dragging-sequence-button', // Accept these types of draggables
                    overlap: 0.01, // How much overlap is needed for drop
                    ondropactivate: function (event) {
                        event.target.classList.add('bg-slate-700/50'); // Tailwind: Highlight dropzone when active
                    },
                    ondragenter: function (event) {
                        const draggableElement = event.relatedTarget;
                        const dropzoneElement = event.target; 
                        dropzoneElement.classList.add('bg-blue-600/30', 'dark:bg-blue-500/30'); // Tailwind: Highlight on drag enter
                        if (draggableElement) draggableElement.classList.add('ring-2', 'ring-green-400');  
                    },
                    ondragleave: function (event) {
                        const draggableElement = event.relatedTarget;
                        event.target.classList.remove('bg-blue-600/30', 'dark:bg-blue-500/30');
                        if (draggableElement) draggableElement.classList.remove('ring-2', 'ring-green-400');
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
                        const timelineContentArea = timelineWindowLocal.element.querySelector('.window-content');
                        if (!timelineContentArea) { console.error("Timeline content area not found during drop"); return; }
                        
                        const pixelsPerSecond = 30; // Match this with ruler/clip rendering
                        const clipsContainerRect = event.target.getBoundingClientRect(); // Rect of the clips area itself

                        // Calculate drop position relative to the clipsContainer
                        let dropXClient = 0;
                        if (event.dragEvent && typeof event.dragEvent.clientX === 'number') { 
                            dropXClient = event.dragEvent.clientX;
                        } else if (event.client && typeof event.client.x === 'number') { // For some Interact.js versions/events
                            dropXClient = event.client.x;
                        } else if (typeof event.clientX === 'number') { // General fallback
                             dropXClient = event.clientX;
                        } else {
                            console.error("[TimelineLane ClipsContainer ONDROP] Cannot determine drop clientX coordinate from event:", event);
                            event.target.classList.remove('bg-blue-600/30', 'dark:bg-blue-500/30');
                            if(droppedClipElement) droppedClipElement.classList.remove('ring-2', 'ring-green-400');
                            return; 
                        }
                        
                        // dropX is the pixel offset from the left of the clipsContainer, including its own scroll
                        let dropX = dropXClient - clipsContainerRect.left + event.target.scrollLeft; 
                        dropX = Math.max(0, dropX); // Ensure non-negative
                        const startTime = dropX / pixelsPerSecond;

                        console.log(`[UI Timeline ClipsContainer Drop] TargetTrackID: ${targetTrackId}, Calculated StartTime: ${startTime.toFixed(2)}s`);
                        
                        const clipId = droppedClipElement.dataset.clipId; // For existing clips being moved
                        const originalTrackId = parseInt(droppedClipElement.dataset.originalTrackId, 10); // For existing clips
                        const dragType = droppedClipElement.dataset.dragType; // 'sound-browser-item', 'sequence-timeline-drag', or undefined for existing clips
                        const jsonDataString = droppedClipElement.dataset.jsonData; // For new items from browser/sequence list

                        if (clipId && !isNaN(originalTrackId) && dragType !== 'sound-browser-item' && dragType !== 'sequence-timeline-drag') { 
                            // This is an existing timeline clip being moved
                            const originalTrack = localAppServices.getTrackById(originalTrackId);
                            if (!originalTrack || !originalTrack.timelineClips) { return; }
                            const clipData = originalTrack.timelineClips.find(c => c.id === clipId);

                            if (clipData) {
                                const targetTrackForDrop = localAppServices.getTrackById(targetTrackId);
                                if (targetTrackForDrop && targetTrackForDrop.type === originalTrack.type) { // Type check for compatibility
                                    if(localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Move Clip "${clipData.name}" to Track "${targetTrackForDrop.name}" at ${startTime.toFixed(2)}s`);
                                    if (originalTrackId !== targetTrackId) { 
                                        // Move to a different track
                                        originalTrack.timelineClips = originalTrack.timelineClips.filter(c => c.id !== clipId);
                                        // Create a new ID for the clip on the new track to avoid ID collisions if copied back
                                        targetTrackForDrop.timelineClips.push({...JSON.parse(JSON.stringify(clipData)), startTime: startTime, id: `clip_${targetTrackId}_${Date.now()}`});
                                    } else { 
                                        // Move within the same track
                                        const existingClip = targetTrackForDrop.timelineClips.find(c => c.id === clipId);
                                        if (existingClip) existingClip.startTime = startTime;
                                    }
                                    if(localAppServices.renderTimeline) localAppServices.renderTimeline(); 
                                } else if (targetTrackForDrop && targetTrackForDrop.type !== originalTrack.type) {
                                     showNotification(`Cannot move ${originalTrack.type} clip to ${targetTrackForDrop.type} track.`, 3000);
                                     if(localAppServices.renderTimeline) localAppServices.renderTimeline(); // Snap back by re-rendering
                                } else if (!targetTrackForDrop) {
                                    console.error("Target track for drop not found.");
                                }
                            } 
                        } else if ((dragType === 'sound-browser-item' || dragType === 'sequence-timeline-drag') && jsonDataString) {
                            // This is a new item being dropped from sound browser or sequence list
                            try {
                                const droppedItemData = JSON.parse(jsonDataString); 
                                 if (localAppServices.handleTimelineLaneDrop) { 
                                    // handleTimelineLaneDrop expects the parsed data, target track ID, and start time
                                    localAppServices.handleTimelineLaneDrop(droppedItemData, targetTrackId, startTime);
                                }
                            } catch (e) { console.error("Error parsing jsonData from dropped element:", e); }
                        }
                        // Reset dropzone styles
                        event.target.classList.remove('bg-blue-600/30', 'dark:bg-blue-500/30');
                        if(droppedClipElement) droppedClipElement.classList.remove('ring-2', 'ring-green-400');
                    },
                    ondropdeactivate: function (event) {
                        event.target.classList.remove('bg-slate-700/50','bg-blue-600/30', 'dark:bg-blue-500/30');
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
                clipEl.dataset.originalTrackId = track.id; // Store original track ID for drag logic
                
                let clipText = clip.name || `Clip ${clip.id.slice(-4)}`;
                let clipTitle = `${clip.name || (clip.type === 'audio' ? 'Audio Clip' : 'Sequence Clip')} (${clip.duration !== undefined ? clip.duration.toFixed(2) : 'N/A'}s)`;
                // Tailwind: base clip styling, conditional for type
                let typeSpecificClass = 'bg-teal-600 hover:bg-teal-500 border-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400 dark:border-teal-600'; // Default audio
                if (clip.type === 'sequence') { 
                    typeSpecificClass = 'bg-sky-600 hover:bg-sky-500 border-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400 dark:border-sky-600';
                }
                clipEl.className = `audio-clip absolute h-4/5 top-[10%] rounded border text-white text-[10px] px-1.5 py-0.5 whitespace-nowrap overflow-hidden text-ellipsis cursor-grab shadow-md ${typeSpecificClass}`;
                
                clipEl.textContent = clipText; clipEl.title = clipTitle;
                const pixelsPerSecond = 30; // Must match ruler and drop calculation
                clipEl.style.left = `${(clip.startTime || 0) * pixelsPerSecond}px`;
                clipEl.style.width = `${Math.max(15, (clip.duration || 0) * pixelsPerSecond)}px`; // Min width for visibility
                clipEl.style.touchAction = 'none'; // Crucial for Interact.js on touch devices
                
                if (window.interact) {
                    interact(clipEl).unset(); // Clear previous interactable
                    interact(clipEl)
                        .draggable({ 
                            inertia: false, // Simpler drag without inertia for clips
                            modifiers: [
                                interact.modifiers.restrictRect({
                                    restriction: 'parent', // Restrict to clipsContainer
                                    endOnly: false
                                }),
                                interact.modifiers.snap({ // Snap to a grid (e.g., 1/16th note)
                                    targets: [
                                      interact.snappers.grid({ x: pixelsPerSecond / 4, y: 0 }) // Snap to quarter of a second (adjust as needed)
                                    ],
                                    range: Infinity,
                                    relativePoints: [ { x: 0, y: 0 } ] // Snap top-left corner
                                  })
                            ],
                            listeners: {
                                start: (event) => {
                                    const target = event.target;
                                    target.dataset.startX = parseFloat(target.style.left) || 0; // Store initial X for relative move
                                    target.classList.add('opacity-75', 'ring-2', 'ring-yellow-300', 'z-10'); // Tailwind: visual feedback
                                    target.style.zIndex = 10002; // Ensure dragged clip is on top
                                },
                                move: (event) => {
                                    const target = event.target;
                                    // Update position based on drag delta, restricted by parent
                                    const currentX = (parseFloat(target.dataset.startX) || 0) + event.dx;
                                    target.style.left = `${Math.max(0, currentX)}px`; // Prevent dragging before 0
                                },
                                end: (event) => {
                                    const target = event.target;
                                    target.classList.remove('opacity-75', 'ring-2', 'ring-yellow-300', 'z-10');
                                    target.style.zIndex = ''; // Reset z-index
                                    
                                    const finalLeftPixels = parseFloat(target.style.left) || 0;
                                    const newStartTime = Math.max(0, finalLeftPixels / pixelsPerSecond);
                                    
                                    const currentClipId = target.dataset.clipId;
                                    const currentTrackId = parseInt(target.dataset.originalTrackId, 10);
                                    const currentTrack = localAppServices.getTrackById(currentTrackId);
                                    const originalClipData = currentTrack ? currentTrack.timelineClips.find(c => c.id === currentClipId) : null;

                                    // If not dropped onto a valid dropzone (i.e., moved within its own lane without crossing to another)
                                    // or if dropped but no actual change in position on the same track.
                                    if (!event.dropzone && originalClipData) {
                                        if (Math.abs(newStartTime - originalClipData.startTime) > 0.001) { // Check for actual movement
                                             if (localAppServices.captureStateForUndo) {
                                                localAppServices.captureStateForUndo(`Move clip "${originalClipData.name}" on track "${currentTrack.name}"`);
                                            }
                                            // Call the track's method to update its internal state
                                            if (currentTrack.updateAudioClipPosition) {
                                                currentTrack.updateAudioClipPosition(currentClipId, newStartTime);
                                            } else {
                                                console.error("Track.updateAudioClipPosition method not found!");
                                            }
                                        } else {
                                            // Snap back to original position if no significant move
                                            target.style.left = `${originalClipData.startTime * pixelsPerSecond}px`;
                                        }
                                    }
                                    // If dropped on a dropzone, the dropzone's ondrop handler will manage the state update.
                                    // Here, we just clean up the original element's temporary drag data if needed.
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
    if (!timelineWindow || !timelineWindow.element || timelineWindow.isMinimized) { return; }

    const playhead = timelineWindow.element.querySelector('#timeline-playhead');
    const timelineContentArea = timelineWindow.element.querySelector('.window-content'); // The scrollable area
    const timelineRuler = timelineWindow.element.querySelector('#timeline-ruler');

    if (!playhead || typeof Tone === 'undefined' || !timelineContentArea || !localAppServices.getPlaybackMode) return;

    const currentPlaybackMode = localAppServices.getPlaybackMode();
    if (currentPlaybackMode === 'sequencer' || currentPlaybackMode === 'pattern') { // Or whatever your sequencer mode is called
        playhead.style.display = 'none';
        // Ensure ruler scrolls with content even if playhead is hidden
        if (timelineRuler) {
            timelineRuler.style.transform = `translateX(-${timelineContentArea.scrollLeft}px)`;
        }
        return;
    }
    playhead.style.display = 'block';

    const pixelsPerSecond = 30; // Should match rendering logic
    const trackNameWidthStyle = getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim();
    const trackNameWidth = parseFloat(trackNameWidthStyle) || 120; // Default if CSS var not found

    if (Tone.Transport.state === 'started') {
        const rawNewPosition = Tone.Transport.seconds * pixelsPerSecond;
        // Position playhead relative to the #timeline-container, which is the parent of #timeline-header and #timeline-tracks-container
        // The playhead starts visually after the track name area.
        playhead.style.left = `${trackNameWidth + rawNewPosition}px`;

        // Auto-scroll logic
        const scrollableContent = timelineContentArea; // This is the element that actually scrolls
        const containerWidth = scrollableContent.clientWidth - trackNameWidth; // Visible width of the clips area
        const playheadVisualPositionInScrollable = rawNewPosition - scrollableContent.scrollLeft; // Playhead position relative to the visible part of scrollable area

        // If playhead is near the right edge, scroll right
        if (playheadVisualPositionInScrollable > containerWidth * 0.8) {
            scrollableContent.scrollLeft = rawNewPosition - (containerWidth * 0.8) + 20; // Scroll to keep playhead in view
        } 
        // If playhead is near the left edge (but not at the very beginning), scroll left
        else if (playheadVisualPositionInScrollable < containerWidth * 0.2 && scrollableContent.scrollLeft > 0) {
            scrollableContent.scrollLeft = Math.max(0, rawNewPosition - (containerWidth * 0.2) - 20);
        }
        // Ensure scrollLeft doesn't go negative (browsers usually handle this, but good practice)
        if (scrollableContent.scrollLeft < 0) scrollableContent.scrollLeft = 0;

    } else if (Tone.Transport.state === 'stopped') {
         // When stopped, position playhead at the beginning of the clips area (after track names)
         playhead.style.left = `${trackNameWidth}px`;
    }
    // Always sync ruler with scroll
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
        renderTimeline(); // Ensure content is up-to-date on restore
        return win;
    }

    // Tailwind: main container for timeline, flex layout
    const contentHTML = `
        <div id="timeline-container" class="flex flex-col h-full w-full bg-gray-800 dark:bg-slate-900 overflow-hidden">
            <div id="timeline-header" class="h-5 bg-gray-700 dark:bg-slate-800 border-b border-gray-600 dark:border-slate-700 flex-shrink-0 relative overflow-hidden w-full">
                <div id="timeline-ruler" class="absolute top-0 left-0 h-full bg-gray-600 dark:bg-slate-700/50 text-xs text-gray-300 dark:text-slate-400" 
                     style="width: 4000px; background-image: 
                            repeating-linear-gradient(to right, #555555AA 0 1px, transparent 1px 100%), 
                            repeating-linear-gradient(to right, #44444488 0 1px, transparent 1px 100%); 
                            background-size: 120px 100%, 30px 100%; background-position: left top;">
                    </div>
            </div>
            <div id="timeline-tracks-container" class="flex-grow overflow-auto relative w-full">
                <div id="timeline-tracks-area" class="relative" style="width: 4000px;">
                    </div>
            </div>
            <div id="timeline-playhead" class="absolute top-0 w-0.5 h-full bg-cyan-400 dark:bg-cyan-300 z-10 pointer-events-none" style="display:none;"></div>
        </div>
    `;
    
    const desktopEl = localAppServices.uiElementsCache?.desktop || document.getElementById('desktop');
    const safeDesktopWidth = (desktopEl && typeof desktopEl.offsetWidth === 'number' && desktopEl.offsetWidth > 0) ? desktopEl.offsetWidth : 1024;
    const timelineOptions = {
        width: Math.max(600, Math.min(1200, safeDesktopWidth - 60)),
        height: 280, // Slightly increased default height
        x: 30,
        y: 50,
        minWidth: 400,
        minHeight: 200, // Increased min height
        initialContentKey: windowId,
        onCloseCallback: () => {} // Placeholder
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
        const contentArea = timelineWindow.element.querySelector('.window-content'); // SnugWindow's content area
        const tracksContainer = timelineWindow.element.querySelector('#timeline-tracks-container'); // Our specific scrollable div

        // Attach scroll listener to the #timeline-tracks-container for horizontal scrolling of tracks
        // and to the .window-content for vertical scrolling of the whole timeline content (if it overflows)
        const scrollSyncHandler = () => {
            const ruler = timelineWindow.element.querySelector('#timeline-ruler');
            if (ruler && tracksContainer) { // tracksContainer is the one scrolling horizontally for tracks
                ruler.style.transform = `translateX(-${tracksContainer.scrollLeft}px)`;
            }
            updatePlayheadPosition(); // Update playhead based on overall scroll
        };

        if (tracksContainer) {
            tracksContainer.addEventListener('scroll', scrollSyncHandler);
        }
        if (contentArea && contentArea !== tracksContainer) { // If window-content is a different scroller (e.g. for vertical)
            contentArea.addEventListener('scroll', scrollSyncHandler);
        }

        // Initial render
        renderTimeline();
    }
    return timelineWindow;
}
