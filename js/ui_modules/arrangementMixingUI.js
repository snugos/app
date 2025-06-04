// js/ui_modules/arrangementMixingUI.js

import { SnugWindow } from '../SnugWindow.js';
import { showNotification, createContextMenu, showConfirmationDialog, snapTimeToGrid } from '../utils.js';
import * as Constants from '../constants.js';

// This will be the single appServices instance from main.js
let localAppServices = {};

export function initializeArrangementMixingUI(appServicesFromMain) {
    localAppServices = appServicesFromMain;
    // console.log("[ArrangementMixingUI] Module initialized, localAppServices keys:", Object.keys(localAppServices).join(', '));
}

// --- Sequencer Window ---
export function openSequencerWindow(trackId, savedState = null) {
    if (!localAppServices || typeof localAppServices.getTrackById !== 'function' || typeof localAppServices.createWindow !== 'function') {
        console.error("[ArrangementMixingUI openSequencerWindow] CRITICAL: localAppServices or required methods missing.");
        if (localAppServices && localAppServices.showNotification) {
            localAppServices.showNotification("Cannot open Sequencer: critical services missing.", "error");
        } else {
            alert("Cannot open Sequencer: critical services missing.");
        }
        return null;
    }

    const track = localAppServices.getTrackById(trackId);
    if (!track || !['Synth', 'Sampler', 'DrumSampler', 'InstrumentSampler'].includes(track.type)) {
        if (localAppServices.showNotification) localAppServices.showNotification("Sequencer can only be opened for compatible track types.", "warning");
        return null;
    }

    const windowId = `sequencer-${trackId}`;
    if (!savedState && localAppServices.getWindowByIdState && localAppServices.getWindowByIdState(windowId)?.element) {
        localAppServices.getWindowByIdState(windowId).focus();
        return localAppServices.getWindowByIdState(windowId);
    }

    const activeSequence = track.getActiveSequence ? track.getActiveSequence() : null;
    const numBars = activeSequence ? activeSequence.bars : 1;
    const rows = track.type === 'Synth' || track.type === 'InstrumentSampler' ? Constants.synthPitches.length :
                 track.type === 'Sampler' ? Constants.numSlices : Constants.numDrumSamplerPads;
    const rowLabels = track.type === 'Synth' || track.type === 'InstrumentSampler' ? Constants.synthPitches :
                      [...Array(rows).keys()].map(i => `${track.type === 'Sampler' ? 'Slice' : 'Pad'} ${i + 1}`);

    const contentHTML = buildSequencerContentDOM(track, rows, rowLabels, numBars);
    const options = { width: 700, height: 450, minWidth:400, minHeight:300, initialContentKey: windowId };
    if (savedState) Object.assign(options, {
        x: parseInt(savedState.left,10), y: parseInt(savedState.top,10),
        width: parseInt(savedState.width,10), height: parseInt(savedState.height,10),
        zIndex: savedState.zIndex, isMinimized: savedState.isMinimized
    });

    const sequencerWindow = localAppServices.createWindow(windowId, `Sequencer: ${track.name}`, contentHTML, options);

    if (sequencerWindow?.element) {
        const gridContainer = sequencerWindow.element.querySelector('.sequencer-grid-layout');
        const barsInput = sequencerWindow.element.querySelector(`#sequencerBarsInput-${track.id}`);
        const sequenceSelect = sequencerWindow.element.querySelector(`#sequenceSelect-${track.id}`);

        populateSequenceSelect(track, sequenceSelect);
        renderSequencerGrid(track, gridContainer, rows, rowLabels, numBars);

        barsInput.value = numBars;
        barsInput.addEventListener('change', (e) => {
            const newNumBars = parseInt(e.target.value);
            if (newNumBars > 0 && newNumBars <= Constants.MAX_BARS) {
                if (track.updateActiveSequenceBars) track.updateActiveSequenceBars(newNumBars); // Assuming this method exists on track
                renderSequencerGrid(track, gridContainer, rows, rowLabels, newNumBars);
            } else {
                if (localAppServices.showNotification) localAppServices.showNotification(`Invalid number of bars (1-${Constants.MAX_BARS}).`, "warning");
                const currentActiveSeq = track.getActiveSequence ? track.getActiveSequence() : null;
                e.target.value = currentActiveSeq?.bars || 1;
            }
        });

        sequenceSelect.addEventListener('change', (e) => {
            if (track.setActiveSequence) track.setActiveSequence(e.target.value);
            const newActiveSeq = track.getActiveSequence ? track.getActiveSequence() : null;
            if (newActiveSeq) {
                barsInput.value = newActiveSeq.bars;
                renderSequencerGrid(track, gridContainer, rows, rowLabels, newActiveSeq.bars);
            }
        });

        sequencerWindow.element.querySelector(`#addSequenceBtn-${track.id}`)?.addEventListener('click', () => {
            if (!track.addNewSequence || !track.setActiveSequence) return;
            const newSeqId = track.addNewSequence(); // This should handle undo internally if needed
            track.setActiveSequence(newSeqId);
            populateSequenceSelect(track, sequenceSelect);
            const newActiveSeq = track.getActiveSequence ? track.getActiveSequence() : null;
            if (newActiveSeq) {
                barsInput.value = newActiveSeq.bars;
                renderSequencerGrid(track, gridContainer, rows, rowLabels, newActiveSeq.bars);
            }
        });
         sequencerWindow.element.querySelector(`#removeSequenceBtn-${track.id}`)?.addEventListener('click', () => {
            if (!track.sequences || !track.removeSequence || !track.getActiveSequence) return; // Removed getSequenceById, rely on getActiveSequence
            const currentSeq = track.getActiveSequence();
            if (track.sequences.length > 1 && currentSeq) {
                if (localAppServices.showConfirmationDialog) {
                    localAppServices.showConfirmationDialog(`Delete sequence "${currentSeq.name || currentSeq.id.slice(-4)}"?`, () => {
                        track.removeSequence(currentSeq.id); // This should handle undo internally if needed
                        populateSequenceSelect(track, sequenceSelect);
                        const newActiveSeq = track.getActiveSequence();
                        if (newActiveSeq) {
                            barsInput.value = newActiveSeq.bars;
                            renderSequencerGrid(track, gridContainer, rows, rowLabels, newActiveSeq.bars);
                        } else { // No sequences left or active one couldn't be determined
                            gridContainer.innerHTML = '<p class="text-center text-slate-400 p-4">No active sequence.</p>';
                            barsInput.value = 1;
                        }
                    });
                }
            } else {
                if (localAppServices.showNotification) localAppServices.showNotification("Cannot delete the last sequence.", "warning");
            }
        });
    }
    return sequencerWindow;
}

function populateSequenceSelect(track, selectElement) {
    if (!selectElement || !track || !track.sequences) return;
    selectElement.innerHTML = '';
    track.sequences.forEach(seq => {
        const option = document.createElement('option');
        option.value = seq.id;
        option.textContent = seq.name || `Sequence ${seq.id.slice(-4)}`;
        if (seq.id === track.activeSequenceId) option.selected = true;
        selectElement.appendChild(option);
    });
}

function buildSequencerContentDOM(track, rows, rowLabels, numBars) {
    const stepsPerBar = Constants.STEPS_PER_BAR;
    const totalSteps = Number.isFinite(numBars) && numBars > 0 ? numBars * stepsPerBar : Constants.defaultStepsPerBar;

    let html = `
        <div class="sequencer-container p-1 text-xs overflow-auto h-full bg-gray-800 dark:bg-slate-900 text-slate-300 dark:text-slate-300 rounded-b-md">
            <div class="controls mb-1 flex justify-between items-center sticky top-0 left-0 bg-gray-700 dark:bg-slate-800 p-1.5 z-30 border-b border-slate-600">
                <div class="flex items-center space-x-2">
                    <label for="sequenceSelect-${track.id}" class="text-xxs">Sequence:</label>
                    <select id="sequenceSelect-${track.id}" class="bg-slate-900 p-0.5 rounded text-xxs"></select>
                    <button id="addSequenceBtn-${track.id}" class="p-0.5 text-xxs bg-green-600 hover:bg-green-500 rounded" title="Add New Sequence"><i class="fas fa-plus"></i></button>
                    <button id="removeSequenceBtn-${track.id}" class="p-0.5 text-xxs bg-red-600 hover:bg-red-500 rounded" title="Remove Current Sequence"><i class="fas fa-trash"></i></button>
                </div>
                <div class="flex items-center space-x-2">
                    <label for="sequencerBarsInput-${track.id}" class="text-xxs">Bars:</label>
                    <input type="number" id="sequencerBarsInput-${track.id}" value="${numBars}" min="1" max="${Constants.MAX_BARS}" class="w-12 bg-slate-900 p-0.5 rounded text-xxs text-center">
                </div>
            </div>
            <div class="sequencer-grid-layout overflow-auto relative" style="display: grid; grid-template-columns: 60px repeat(${totalSteps}, minmax(25px, 1fr)); grid-template-rows: 20px repeat(${rows}, 30px); gap: 1px;">
            </div>
        </div>`;
    return html;
}

function renderSequencerGrid(track, gridContainer, rows, rowLabels, numBars) {
    if(!gridContainer || !track || !track.getActiveSequence) {
        if (gridContainer) gridContainer.innerHTML = '<p class="text-center text-slate-400 p-4">Error: Track or active sequence not found.</p>';
        return;
    }
    gridContainer.innerHTML = '';
    const stepsPerBar = Constants.STEPS_PER_BAR;
    const totalSteps = numBars * stepsPerBar;
    const activeSequence = track.getActiveSequence();
    if (!activeSequence) {
        gridContainer.innerHTML = '<p class="text-center text-slate-400 p-4">No active sequence.</p>';
        return;
    }

    gridContainer.style.gridTemplateColumns = `60px repeat(${totalSteps}, minmax(25px, 1fr))`;
    gridContainer.style.gridTemplateRows = `20px repeat(${rows}, 30px)`;

    // Header Corner
    gridContainer.appendChild(Object.assign(document.createElement('div'), {
        className: 'sequencer-header-cell sequencer-label-cell bg-slate-700 dark:bg-slate-850 sticky top-0 left-0 z-20'
    }));

    // Time Headers
    for (let step = 0; step < totalSteps; step++) {
        const bar = Math.floor(step / stepsPerBar) + 1;
        const beat = Math.floor((step % stepsPerBar) / (stepsPerBar / 4)) + 1;
        const subStep = (step % (stepsPerBar / 4)) + 1;
        const cell = document.createElement('div');
        cell.className = 'sequencer-header-cell text-xxs flex items-center justify-center bg-slate-700 dark:bg-slate-850 sticky top-0 z-10';
        cell.textContent = `${bar}.${beat}.${subStep}`;
        if (step % (stepsPerBar / 4) === 0) cell.classList.add('border-l', 'border-slate-500 dark:border-slate-700'); // Beat marker
        if (step % stepsPerBar === 0) cell.classList.add('!border-l-2', '!border-slate-400 dark:!border-slate-600'); // Bar marker
        gridContainer.appendChild(cell);
    }

    // Row Labels and Step Cells
    for (let row = 0; row < rows; row++) {
        const labelCell = document.createElement('div');
        labelCell.className = 'sequencer-label-cell text-xxs flex items-center justify-end pr-1 bg-slate-700 dark:bg-slate-850 sticky left-0 z-10';
        labelCell.textContent = rowLabels[row];
        gridContainer.appendChild(labelCell);

        for (let step = 0; step < totalSteps; step++) {
            const cell = document.createElement('div');
            let bgClass = (Math.floor(step / (stepsPerBar / 4)) % 2 === 0) ? 'bg-slate-800 dark:bg-slate-900' : 'bg-slate-850 dark:bg-gray-800';
            cell.className = `sequencer-step-cell ${bgClass} hover:bg-blue-700`;
            if (step % (stepsPerBar / 4) === 0) cell.classList.add('border-l', 'border-slate-600 dark:border-slate-750'); // Beat marker
            if (step % stepsPerBar === 0) cell.classList.add('!border-l-2', '!border-slate-500 dark:!border-slate-650'); // Bar marker

            const noteData = activeSequence.steps.find(s => s.time === step && s.pitchOrPad === rowLabels[row]);
            let trackTypeClass = '';
            if (track.type === 'Synth') trackTypeClass = 'active-synth';
            else if (track.type === 'Sampler') trackTypeClass = 'active-sampler';
            else if (track.type === 'DrumSampler') trackTypeClass = 'active-drum-sampler';
            else if (track.type === 'InstrumentSampler') trackTypeClass = 'active-instrument-sampler';


            if (noteData) {
                cell.classList.add(trackTypeClass);
                cell.dataset.velocity = noteData.velocity;
            }

            cell.addEventListener('click', () => {
                if (!track.toggleStepInSequence) return; // Assuming a method on Track class
                const currentSeqId = track.activeSequenceId; // Get current sequence ID before toggle
                if (!currentSeqId) return;

                track.toggleStepInSequence(rowLabels[row], step, currentSeqId); // Track method handles undo
                // Update UI based on new state from track.getActiveSequence()
                const updatedActiveSequence = track.getActiveSequence();
                if (!updatedActiveSequence) return; // Should not happen if toggleStep is successful
                const isNowActive = updatedActiveSequence.steps.some(s => s.time === step && s.pitchOrPad === rowLabels[row]);

                cell.classList.toggle(trackTypeClass, isNowActive);
                if (isNowActive) {
                    const updatedNoteData = updatedActiveSequence.steps.find(s => s.time === step && s.pitchOrPad === rowLabels[row]);
                    if (updatedNoteData) cell.dataset.velocity = updatedNoteData.velocity;
                } else {
                    delete cell.dataset.velocity;
                }
            });
            gridContainer.appendChild(cell);
        }
    }
}


export function openArrangementWindow(onReadyCallback, savedState = null) {
    const windowId = 'timeline';

    // --- DETAILED CRITICAL CHECK ---
    if (!localAppServices) {
        console.error("[ArrangementMixingUI openArrangementWindow] CRITICAL: localAppServices object itself is not available!");
        alert("Timeline Error: Core services missing (1).");
        return null;
    }
    if (typeof localAppServices.getWindowByIdState !== 'function') {
        console.error("[ArrangementMixingUI openArrangementWindow] CRITICAL: localAppServices.getWindowByIdState is NOT A FUNCTION. Type:", typeof localAppServices.getWindowByIdState, "Value:", localAppServices.getWindowByIdState);
        console.log("Full localAppServices at this point:", JSON.parse(JSON.stringify(localAppServices)));
        alert("Timeline Error: Core services missing (2).");
        return null;
    }
    if (typeof localAppServices.createWindow !== 'function') {
        console.error("[ArrangementMixingUI openArrangementWindow] CRITICAL: localAppServices.createWindow is NOT A FUNCTION. Type:", typeof localAppServices.createWindow, "Value:", localAppServices.createWindow);
        console.log("Full localAppServices at this point:", JSON.parse(JSON.stringify(localAppServices)));
        alert("Timeline Error: Core services missing (3).");
        return null;
    }
    // --- END DETAILED CRITICAL CHECK ---


    if (!savedState && localAppServices.getWindowByIdState(windowId)?.element) {
        localAppServices.getWindowByIdState(windowId).focus();
        return localAppServices.getWindowByIdState(windowId);
    }

    const contentHTML = `
        <div id="timeline-container" class="w-full h-full flex flex-col bg-slate-800 text-slate-300 text-xs">
            <div id="timeline-header" class="h-6 flex-shrink-0 bg-slate-700 dark:bg-slate-850 border-b border-slate-600 dark:border-slate-700 relative overflow-hidden">
                <div id="timeline-ruler-labels" class="absolute top-0 left-0 h-full flex items-center z-10" style="width: ${Constants.TIMELINE_TRACK_NAME_WIDTH || 120}px; background-color: var(--timeline-track-name-bg, #2a2a2a);">
                    </div>
                <div id="timeline-ruler" class="absolute top-0 h-full bg-slate-700 dark:bg-slate-850" style="left: ${Constants.TIMELINE_TRACK_NAME_WIDTH || 120}px;">
                    </div>
            </div>
            <div id="timeline-tracks-container" class="flex-grow overflow-auto relative">
                <div id="timeline-tracks-area" class="relative min-h-full">
                    </div>
                <div id="timeline-playhead" class="absolute top-0 w-0.5 h-full bg-red-500 z-20 pointer-events-none" style="left: ${Constants.TIMELINE_TRACK_NAME_WIDTH || 120}px; display: none;"></div>
            </div>
        </div>`;

    const desktopEl = localAppServices.uiElementsCache?.desktop || document.getElementById('desktop');
    const safeDesktopWidth = (desktopEl && typeof desktopEl.offsetWidth === 'number' && desktopEl.offsetWidth > 0) ? desktopEl.offsetWidth : 1024;
    const timelineOptions = {
        width: Math.max(600, Math.min(1200, safeDesktopWidth - 60)),
        height: 350, x: 30, y: 50, minWidth: 400, minHeight: 200,
        initialContentKey: windowId
    };
    if (savedState) Object.assign(timelineOptions, {
        x: parseInt(savedState.left,10), y: parseInt(savedState.top,10),
        width: parseInt(savedState.width,10), height: parseInt(savedState.height,10),
        zIndex: savedState.zIndex, isMinimized: savedState.isMinimized
    });

    const timelineWindow = localAppServices.createWindow(windowId, 'Arrangement', contentHTML, timelineOptions);

    if (timelineWindow?.element) {
        renderTimeline(); // Initial render
        const tracksContainer = timelineWindow.element.querySelector('#timeline-tracks-container');
        const ruler = timelineWindow.element.querySelector('#timeline-ruler');
        const rulerLabels = timelineWindow.element.querySelector('#timeline-ruler-labels'); // For vertical scroll sync

        if (tracksContainer && ruler && rulerLabels) {
            tracksContainer.addEventListener('scroll', () => {
                ruler.style.transform = `translateX(-${tracksContainer.scrollLeft}px)`;
                rulerLabels.style.transform = `translateY(-${tracksContainer.scrollTop}px)`; // Sync vertical scroll of name area
                updatePlayheadPosition(); // Update playhead based on new scroll position
            });
            setupTimelineDropHandling(tracksContainer);
            setupClipInteractions(tracksContainer); // Setup drag/resize for clips
        }
         if (typeof onReadyCallback === 'function') {
            onReadyCallback(timelineWindow);
        }
    }
    return timelineWindow;
}

function setupTimelineDropHandling(tracksContainer) {
    tracksContainer.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    });

    tracksContainer.addEventListener('drop', (event) => {
        event.preventDefault();
        const tracksArea = tracksContainer.querySelector('#timeline-tracks-area');
        if (!tracksArea || !localAppServices.handleTimelineLaneDrop) return;

        const dropDataString = event.dataTransfer.getData('application/json');
        const files = event.dataTransfer.files;

        const pixelsPerSecond = parseFloat(tracksArea.dataset.pixelsPerSecond || "30"); // Default if not set
        const trackNameWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').replace('px', '')) || Constants.TIMELINE_TRACK_NAME_WIDTH || 120;

        const tracksContainerRect = tracksContainer.getBoundingClientRect(); // Use container rect for clientX/Y reference
        const dropXInTracksContainer = event.clientX - tracksContainerRect.left + tracksContainer.scrollLeft;
        const dropYInTracksContainer = event.clientY - tracksContainerRect.top + tracksContainer.scrollTop;
        const dropXRelativeToGrid = dropXInTracksContainer - trackNameWidth; // Adjust for name area width
        const timeAtDrop = Math.max(0, dropXRelativeToGrid / pixelsPerSecond);

        const bpmForSnap = (typeof Tone !== 'undefined' && Tone.Transport) ? Tone.Transport.bpm.value : 120;
        const snappedStartTime = snapTimeToGrid(timeAtDrop, bpmForSnap, pixelsPerSecond, false, '16n'); // Snap to 16th note

        const trackElements = Array.from(tracksArea.querySelectorAll('.timeline-track-lane'));
        let targetTrackId = null;
        for (const trackEl of trackElements) {
            // Compare dropY against trackEl.offsetTop relative to tracksArea, not tracksContainer
            if (dropYInTracksContainer >= trackEl.offsetTop && dropYInTracksContainer < trackEl.offsetTop + trackEl.offsetHeight) {
                targetTrackId = trackEl.dataset.trackId;
                break;
            }
        }

        if (targetTrackId) {
            const dataToPass = dropDataString ? JSON.parse(dropDataString) : (files && files.length > 0 ? files : null);
            if(dataToPass) {
                // Pass 'services' which is localAppServices
                localAppServices.handleTimelineLaneDrop(dataToPass, targetTrackId, snappedStartTime, localAppServices);
            } else {
                 if(localAppServices.showNotification) localAppServices.showNotification("No valid data dropped.", "warning");
            }
        } else if (localAppServices.showNotification) {
            localAppServices.showNotification("Could not determine target track for drop.", "warning");
        }
    });
}

export function renderTimeline() {
    if (!localAppServices.getWindowByIdState || !localAppServices.getTracksState || !localAppServices.getPlaybackModeState) {
        console.warn("[ArrangementMixingUI renderTimeline] Required appServices for state access are missing.");
        return;
    }
    const timelineWindow = localAppServices.getWindowByIdState('timeline');
    if (!timelineWindow || !timelineWindow.element) return;

    const tracksArea = timelineWindow.element.querySelector('#timeline-tracks-area');
    const ruler = timelineWindow.element.querySelector('#timeline-ruler');
    const rulerLabelsContainer = timelineWindow.element.querySelector('#timeline-ruler-labels'); // For fixed track name area

    if (!tracksArea || !ruler || !rulerLabelsContainer) return;

    // Clear previous content
    tracksArea.innerHTML = '';
    ruler.innerHTML = '';
    // rulerLabelsContainer.innerHTML = ''; // This one is static, just for background

    const tracks = localAppServices.getTracksState();
    const bpm = (typeof Tone !== 'undefined' && Tone.Transport) ? Tone.Transport.bpm.value : 120;
    const secondsPerBar = (60 / bpm) * 4; // Assuming 4/4 time signature
    const totalBarsToRender = Constants.MAX_BARS; // Max bars to draw ruler for
    const totalDurationSeconds = totalBarsToRender * secondsPerBar;

    // Use a dynamic pixelsPerSecond or a fixed one for now
    const pixelsPerSecond = 30; // Example: 30 pixels per second
    tracksArea.dataset.pixelsPerSecond = pixelsPerSecond; // Store for drop handling and playhead

    const timelineGridWidth = totalDurationSeconds * pixelsPerSecond;
    tracksArea.style.width = `${timelineGridWidth}px`;
    ruler.style.width = `${timelineGridWidth}px`;

    // Draw Ruler Markings
    for (let bar = 1; bar <= totalBarsToRender; bar++) {
        const barTime = (bar - 1) * secondsPerBar;
        const barX = barTime * pixelsPerSecond;

        const barMark = document.createElement('div');
        barMark.className = 'absolute top-0 h-full border-l border-slate-500 dark:border-slate-700 w-px';
        barMark.style.left = `${barX}px`;
        ruler.appendChild(barMark);

        const label = document.createElement('span');
        label.className = 'absolute top-0.5 left-1 text-xxs text-slate-400';
        label.textContent = `${bar}`;
        barMark.appendChild(label);

        // Subdivisions (beats)
        for (let beat = 1; beat < 4; beat++) { // 3 beat lines inside a bar
            const beatTime = barTime + beat * (secondsPerBar / 4);
            const beatX = beatTime * pixelsPerSecond;
            const beatMark = document.createElement('div');
            beatMark.className = 'absolute top-0 h-full border-l border-slate-600 dark:border-slate-750 w-px';
            beatMark.style.left = `${beatX}px`;
            ruler.appendChild(beatMark);
        }
    }


    tracks.forEach((track, index) => {
        const trackLane = document.createElement('div');
        trackLane.className = 'timeline-track-lane h-16 border-b border-slate-600 dark:border-slate-700 relative flex items-stretch'; // items-stretch
        trackLane.dataset.trackId = track.id;
        trackLane.style.backgroundColor = (index % 2 === 0) ? 'var(--timeline-track-bg-odd, #1e1e1e)' : 'var(--timeline-track-bg-even, #1a1a1a)';


        const nameArea = document.createElement('div');
        nameArea.className = 'timeline-track-lane-name-area sticky left-0 z-10 p-2 h-full flex flex-col justify-center border-r border-slate-600 dark:border-slate-700';
        nameArea.style.minWidth = `${Constants.TIMELINE_TRACK_NAME_WIDTH || 120}px`;
        nameArea.style.maxWidth = `${Constants.TIMELINE_TRACK_NAME_WIDTH || 120}px`;
        nameArea.style.backgroundColor = 'var(--timeline-track-name-bg, #2a2a2a)'; // Use CSS var

        const nameText = document.createElement('div');
        nameText.className = 'timeline-track-name-text text-xs font-medium truncate text-slate-300 dark:text-slate-200';
        nameText.textContent = track.name;
        nameText.title = track.name;
        nameArea.appendChild(nameText);

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'timeline-sequence-buttons flex space-x-1 mt-1';
        ['M', 'S', 'R'].forEach(label => {
            const btn = document.createElement('button');
            btn.className = `p-0.5 w-5 h-5 text-xxs rounded-sm
                ${(label === 'M' && track.isMuted) ? 'bg-yellow-500 text-black' :
                  (label === 'S' && track.isSoloed) ? 'bg-orange-500 text-black' :
                  (label === 'R' && track.isArmedForRec) ? 'bg-red-600 text-white' :
                  'bg-slate-600 hover:bg-slate-500 text-slate-200'
                }`;
            btn.textContent = label;
            btn.title = label === 'M' ? 'Mute' : label === 'S' ? 'Solo' : 'Arm Record';
             if (label === 'M') btn.onclick = () => { if(localAppServices.handleTrackMute) localAppServices.handleTrackMute(track.id); };
             if (label === 'S') btn.onclick = () => { if(localAppServices.handleTrackSolo) localAppServices.handleTrackSolo(track.id); };
             if (label === 'R' && track.canBeArmed) btn.onclick = () => { if(localAppServices.handleTrackArm) localAppServices.handleTrackArm(track.id); };
             else if (label === 'R' && !track.canBeArmed) { btn.disabled = true; btn.classList.add('opacity-50', 'cursor-not-allowed');}
            buttonsDiv.appendChild(btn);
        });
        nameArea.appendChild(buttonsDiv);
        trackLane.appendChild(nameArea); // Name area is part of the track lane, not the ruler labels container

        const clipArea = document.createElement('div'); // Create a dedicated area for clips within the lane
        clipArea.className = 'timeline-clip-area relative flex-grow h-full'; // Takes up remaining space
        trackLane.appendChild(clipArea);


        (track.timelineClips || []).forEach(clip => {
            const clipEl = document.createElement('div');
            let clipBgColor = 'bg-sky-600 border-sky-500'; // Default for sequence clips
            if (clip.type === 'audio') {
                clipBgColor = 'bg-teal-600 border-teal-500';
            }
            // Add selection highlight
            const isSelected = localAppServices.getSelectedTimelineClipInfoState &&
                               localAppServices.getSelectedTimelineClipInfoState().trackId === track.id &&
                               localAppServices.getSelectedTimelineClipInfoState().clipId === clip.id;

            clipEl.className = `absolute h-4/5 top-[10%] rounded overflow-hidden text-white text-xxs p-1 cursor-grab shadow-md ${clipBgColor} ${isSelected ? 'ring-2 ring-yellow-400' : ''}`;
            clipEl.style.left = `${clip.startTime * pixelsPerSecond}px`;
            clipEl.style.width = `${Math.max(5, clip.duration * pixelsPerSecond)}px`; // Ensure min width
            clipEl.textContent = clip.name || (clip.type === 'audio' ? `Audio (${clip.id.slice(-4)})` : `Seq (${clip.id.slice(-4)})`);
            clipEl.title = clip.name || clip.id;
            clipEl.dataset.clipId = clip.id;
            clipEl.dataset.trackId = track.id;
            clipArea.appendChild(clipEl); // Append to clipArea
        });
        tracksArea.appendChild(trackLane);
    });
    updatePlayheadPosition();
}


export function updatePlayheadPosition() {
    if (!localAppServices.getWindowByIdState || typeof Tone === 'undefined' || typeof Tone.Transport === 'undefined') return;
    const timelineWindow = localAppServices.getWindowByIdState('timeline');
    if (!timelineWindow || !timelineWindow.element ) { return; }

    const playhead = timelineWindow.element.querySelector('#timeline-playhead');
    const tracksContainer = timelineWindow.element.querySelector('#timeline-tracks-container');
    const tracksArea = timelineWindow.element.querySelector('#timeline-tracks-area');

    if (!playhead || !tracksContainer || !tracksArea) return;

    if(Tone.Transport.state !== 'started'){
        playhead.style.display = 'none';
        return;
    }
    playhead.style.display = 'block';

    const pixelsPerSecond = parseFloat(tracksArea.dataset.pixelsPerSecond || "30");
    // trackNameWidth should be the width of the fixed name area
    const trackNameWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').replace('px','')) || Constants.TIMELINE_TRACK_NAME_WIDTH || 120;
    const scrollLeft = tracksContainer.scrollLeft;

    const playheadPositionInGrid = Tone.Transport.seconds * pixelsPerSecond;
    // The playhead's 'left' should be relative to the tracksContainer, considering its scroll and the fixed name area.
    // So, it's its position on the grid + width of fixed name area - current scroll of the grid.
    playhead.style.left = `${trackNameWidth + playheadPositionInGrid - scrollLeft}px`;

    // Auto-scroll logic (optional, can be performance intensive)
    const containerWidth = tracksContainer.clientWidth - trackNameWidth; // Visible width of the grid area
    const playheadVisiblePos = playheadPositionInGrid - scrollLeft;

    if (playheadVisiblePos > containerWidth * 0.8) { // If playhead is past 80% of visible area
        tracksContainer.scrollLeft += containerWidth * 0.5; // Scroll half a page
    } else if (playheadVisiblePos < containerWidth * 0.1 && scrollLeft > 0) { // If playhead is near start and not at beginning
         tracksContainer.scrollLeft = Math.max(0, scrollLeft - containerWidth * 0.5);
    }
}


export function highlightPlayingStep(trackId, stepTime, pitchOrPad) { // stepTime is absolute time in sequence
    if(!localAppServices.getWindowByIdState || !localAppServices.getTrackById) return;
    const sequencerWindow = localAppServices.getWindowByIdState(`sequencer-${trackId}`);
    if (!sequencerWindow || !sequencerWindow.element) return;

    const gridContainer = sequencerWindow.element.querySelector('.sequencer-grid-layout');
    if (!gridContainer) return;

    // Remove previous highlights
    gridContainer.querySelectorAll('.playing').forEach(cell => cell.classList.remove('playing', 'scale-110', 'z-20', 'outline', 'outline-yellow-400', 'outline-2', '-outline-offset-1')); // Clear all potential playing styles

    const track = localAppServices.getTrackById(trackId);
    if (!track || !track.getActiveSequence || !track.getActiveSequence()) return;

    const activeSequence = track.getActiveSequence();
    // The stepTime passed should be the 'time' property from the sequence step { time, pitchOrPad, ... }
    // which is the index (0 to totalSteps-1)
    const stepIndex = stepTime;


    // Determine row index (this part depends on how pitchOrPad maps to rows)
    let rowIndex = -1;
    const rowLabels = track.type === 'Synth' || track.type === 'InstrumentSampler' ? Constants.synthPitches :
                      [...Array(track.type === 'Sampler' ? Constants.numSlices : Constants.numDrumSamplerPads).keys()].map(i => `${track.type === 'Sampler' ? 'Slice' : 'Pad'} ${i + 1}`);
    rowIndex = rowLabels.indexOf(pitchOrPad);


    if (rowIndex !== -1 && stepIndex >= 0 && stepIndex < activeSequence.bars * Constants.STEPS_PER_BAR) {
        // Calculate DOM cell index: (Header Row Cells) + (Full Rows Above * Cells Per Row) + (Header Cell in Current Row) + (Step Index in Current Row)
        // Cells per row in DOM = totalSteps + 1 (for label)
        const totalGridSteps = activeSequence.bars * Constants.STEPS_PER_BAR;
        const domCellIndex = (totalGridSteps + 1) + (rowIndex * (totalGridSteps + 1)) + 1 + stepIndex;

        const targetCell = gridContainer.children[domCellIndex];
        if (targetCell && targetCell.classList.contains('sequencer-step-cell')) {
            targetCell.classList.add('playing', 'scale-110', 'z-20', 'outline', 'outline-yellow-400', 'outline-2', '-outline-offset-1'); // Add playing style
        }
    }
}

export function openMixerWindow(savedState = null) {
    if(!localAppServices.getWindowByIdState || !localAppServices.createWindow) {
        console.error("[ArrangementMixingUI openMixerWindow] CRITICAL: Core services missing.");
        return null;
    }
    const windowId = 'mixer';
    if (!savedState && localAppServices.getWindowByIdState(windowId)?.element) {
        localAppServices.getWindowByIdState(windowId).focus();
        return localAppServices.getWindowByIdState(windowId);
    }
    const contentHTML = `<div id="mixer-strips-container" class="p-2 flex space-x-2 overflow-x-auto h-full bg-slate-800 dark:bg-slate-850"></div>`;
    const options = { width: 600, height: 350, minWidth:300, minHeight:200, initialContentKey: windowId };
    if (savedState) Object.assign(options, {
        x: parseInt(savedState.left,10), y: parseInt(savedState.top,10),
        width: parseInt(savedState.width,10), height: parseInt(savedState.height,10),
        zIndex: savedState.zIndex, isMinimized: savedState.isMinimized
    });
    const mixerWindow = localAppServices.createWindow(windowId, 'Mixer', contentHTML, options);
    if (mixerWindow?.element) {
        updateMixerWindow();
    }
    return mixerWindow;
}

export function updateMixerWindow() {
    if(!localAppServices.getWindowByIdState || !localAppServices.getTracksState) {
        console.warn("[ArrangementMixingUI updateMixerWindow] Required appServices for state access are missing.");
        return;
    }
    const mixerWindow = localAppServices.getWindowByIdState('mixer');
    if (!mixerWindow || !mixerWindow.element) return;

    const container = mixerWindow.element.querySelector('#mixer-strips-container');
    container.innerHTML = ''; // Clear previous strips

    const tracks = localAppServices.getTracksState();
    tracks.forEach(track => {
        const strip = document.createElement('div');
        strip.className = 'mixer-strip flex flex-col items-center p-1.5 border border-slate-700 dark:border-slate-600 rounded bg-slate-750 dark:bg-slate-800 w-20 text-xs flex-shrink-0';
        strip.innerHTML = `
            <div class="track-name truncate w-full text-center mb-1 text-slate-300 dark:text-slate-200 font-medium" title="${track.name}">${track.name}</div>
            <div class="pan-control mb-1 w-full">
                <input type="range" id="mixerPan-${track.id}" min="-1" max="1" step="0.01" value="${track.channel?.pan?.value !== undefined ? track.channel.pan.value : 0}" class="w-full h-1.5 accent-purple-500 bg-slate-600 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer" title="Pan">
            </div>
            <div class="volume-fader-container relative flex-grow w-6 bg-slate-600 dark:bg-slate-700 rounded overflow-hidden my-1">
                <input type="range" id="mixerVolume-${track.id}" min="-60" max="6" step="0.1" value="${track.channel?.volume?.value !== undefined ? track.channel.volume.value : 0}" class="mixer-fader accent-blue-500 appearance-none bg-transparent w-20 h-2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[270deg]" title="Volume">
                <div class="meter-bar-container track-meter-container mixer-meter-container absolute bottom-1 left-0 right-0 mx-auto w-4/5 h-2 bg-slate-800 dark:bg-slate-900 border border-slate-900 dark:border-black rounded-sm overflow-hidden">
                    <div id="mixerMeter-${track.id}" class="meter-bar h-full bg-green-500" style="width: 0%;"></div>
                </div>
            </div>
            <div class="buttons-row mt-1.5 flex space-x-1 w-full justify-around">
                <button class="mixer-mute-btn p-1 w-6 h-6 rounded ${track.isMuted ? 'bg-yellow-500 text-slate-900' : 'bg-slate-600 hover:bg-yellow-700 text-slate-200'} " title="Mute">M</button>
                <button class="mixer-solo-btn p-1 w-6 h-6 rounded ${track.isSoloed ? 'bg-orange-500 text-slate-900' : 'bg-slate-600 hover:bg-orange-600 text-slate-200'}" title="Solo">S</button>
                ${track.canBeArmed ? `<button class="mixer-arm-btn p-1 w-6 h-6 rounded ${track.isArmedForRec ? 'bg-red-600 text-white' : 'bg-slate-600 hover:bg-red-700 text-slate-200'}" title="Arm">R</button>` : '<div class="w-6 h-6"></div>'}
            </div>`;
        container.appendChild(strip);

        const volumeSlider = strip.querySelector(`#mixerVolume-${track.id}`);
        const panSlider = strip.querySelector(`#mixerPan-${track.id}`);

        volumeSlider.addEventListener('input', (e) => {
            if(track.setVolumeDb) track.setVolumeDb(parseFloat(e.target.value));
        });
        volumeSlider.addEventListener('change', (e) => { // For undo capture on release
            if(localAppServices.captureStateForUndoInternal) localAppServices.captureStateForUndoInternal(`Set Volume for ${track.name}`);
        });

        panSlider.addEventListener('input', (e) => {
            if(track.setPan) track.setPan(parseFloat(e.target.value));
        });
        panSlider.addEventListener('change', (e) => { // For undo capture on release
             if(localAppServices.captureStateForUndoInternal) localAppServices.captureStateForUndoInternal(`Set Pan for ${track.name}`);
        });

        strip.querySelector('.mixer-mute-btn').addEventListener('click', () => { if(localAppServices.handleTrackMute) localAppServices.handleTrackMute(track.id); });
        strip.querySelector('.mixer-solo-btn').addEventListener('click', () => { if(localAppServices.handleTrackSolo) localAppServices.handleTrackSolo(track.id); });
        const armBtn = strip.querySelector('.mixer-arm-btn');
        if (armBtn) armBtn.addEventListener('click', () => { if(localAppServices.handleTrackArm) localAppServices.handleTrackArm(track.id); });
    });
}

// Placeholder - actual clip interaction logic is complex
function setupClipInteractions(tracksContainer) {
    // This function would handle mousedown on clips for dragging and resizing
    // It would need to calculate snapped positions, update clip data in state,
    // and re-render the timeline.
    // Example (very basic drag start):
    tracksContainer.addEventListener('mousedown', (event) => {
        if (event.target.classList.contains('audio-clip') || event.target.classList.contains('sequence-clip')) {
            const clipElement = event.target;
            const trackId = clipElement.dataset.trackId;
            const clipId = clipElement.dataset.clipId;

            if (localAppServices.setSelectedTimelineClip) {
                localAppServices.setSelectedTimelineClip(trackId, clipId); // Selects the clip
            }
            // Further logic for dragging/resizing would go here
            // This is a simplified placeholder
        } else {
            // Clicked outside a clip, clear selection
            if (localAppServices.setSelectedTimelineClip) {
                localAppServices.setSelectedTimelineClip(null, null);
            }
        }
    });
}

export function updateSequencerCellUI(trackId, pitchOrPad, timeStep, isActive) {
    if (!localAppServices.getTrackById || !localAppServices.getWindowByIdState) return;
    const track = localAppServices.getTrackById(trackId);
    if (!track || !track.getActiveSequence) return;

    const sequencerWindow = localAppServices.getWindowByIdState(`sequencer-${trackId}`);
    if (!sequencerWindow || !sequencerWindow.element) return;

    const gridContainer = sequencerWindow.element.querySelector('.sequencer-grid-layout');
    if (!gridContainer) return;

    let rowLabels;
    if (track.type === 'Synth' || track.type === 'InstrumentSampler') {
        rowLabels = Constants.synthPitches;
    } else if (track.type === 'Sampler') {
        rowLabels = [...Array(Constants.numSlices).keys()].map(i => `Slice ${i + 1}`);
    } else if (track.type === 'DrumSampler') {
        rowLabels = [...Array(Constants.numDrumSamplerPads).keys()].map(i => `Pad ${i + 1}`);
    } else {
        return; // Not a sequenceable track type with these labels
    }

    const rowIndex = rowLabels.indexOf(pitchOrPad);
    if (rowIndex === -1) return;

    const activeSequence = track.getActiveSequence();
    if (!activeSequence) return;

    const totalGridSteps = activeSequence.bars * Constants.STEPS_PER_BAR;
    // DOM indexing: (header cells for steps + 1 for corner) + (rowIndex * (totalGridSteps + 1 for label)) + (1 for label cell) + stepIndex
    const domCellIndex = (totalGridSteps + 1) + (rowIndex * (totalGridSteps + 1)) + 1 + timeStep;
    const cell = gridContainer.children[domCellIndex];

    if (cell && cell.classList.contains('sequencer-step-cell')) {
        let trackTypeClass = '';
        if (track.type === 'Synth') trackTypeClass = 'active-synth';
        else if (track.type === 'Sampler') trackTypeClass = 'active-sampler';
        else if (track.type === 'DrumSampler') trackTypeClass = 'active-drum-sampler';
        else if (track.type === 'InstrumentSampler') trackTypeClass = 'active-instrument-sampler';

        cell.classList.toggle(trackTypeClass, isActive);
        if(isActive){
            const noteData = activeSequence.steps.find(s => s.time === timeStep && s.pitchOrPad === pitchOrPad);
            if(noteData) cell.dataset.velocity = noteData.velocity;
        } else {
            delete cell.dataset.velocity;
        }
    }
}
