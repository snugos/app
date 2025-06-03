// js/ui_modules/arrangementMixingUI.js (MODIFIED)
import { SnugWindow } from '../SnugWindow.js';
import { showNotification, createContextMenu, showConfirmationDialog, snapTimeToGrid } from '../utils.js';
import * as Constants from '../constants.js';
// Event handlers for track controls are typically in eventHandlers.js and accessed via appServices

let localAppServices = {};

export function initializeArrangementMixingUI(appServicesFromMain) {
    localAppServices = appServicesFromMain;
    // console.log("[ArrangementMixingUI] Module initialized.");
}

// --- Sequencer Window ---
export function openSequencerWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById(trackId);
    if (!track || !['Synth', 'Sampler', 'DrumSampler', 'InstrumentSampler'].includes(track.type)) {
        showNotification("Sequencer can only be opened for compatible track types.", "warning");
        return;
    }

    const windowId = `sequencer-${trackId}`;
    if (!savedState && localAppServices.getWindowByIdState(windowId)?.element) {
        localAppServices.getWindowByIdState(windowId).focus();
        return localAppServices.getWindowByIdState(windowId);
    }
    
    const activeSequence = track.getActiveSequence();
    const numBars = activeSequence ? activeSequence.bars : 1;
    const rows = track.type === 'Synth' || track.type === 'InstrumentSampler' ? Constants.synthPitches.length :
                 track.type === 'Sampler' ? Constants.numSlices : Constants.numDrumSamplerPads;
    const rowLabels = track.type === 'Synth' || track.type === 'InstrumentSampler' ? Constants.synthPitches :
                      [...Array(rows).keys()].map(i => `${track.type === 'Sampler' ? 'Slice' : 'Pad'} ${i + 1}`);


    const contentHTML = buildSequencerContentDOM(track, rows, rowLabels, numBars);
    const options = { width: 700, height: 450, minWidth:400, minHeight:300, initialContentKey: windowId };
    if (savedState) Object.assign(options, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });

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
                track.updateActiveSequenceBars(newNumBars); // This should also save undo state
                renderSequencerGrid(track, gridContainer, rows, rowLabels, newNumBars);
            } else {
                showNotification(`Invalid number of bars (1-${Constants.MAX_BARS}).`, "warning");
                e.target.value = track.getActiveSequence()?.bars || 1;
            }
        });
        
        sequenceSelect.addEventListener('change', (e) => {
            track.setActiveSequence(e.target.value);
            const newActiveSeq = track.getActiveSequence();
            barsInput.value = newActiveSeq.bars;
            renderSequencerGrid(track, gridContainer, rows, rowLabels, newActiveSeq.bars);
        });

        sequencerWindow.element.querySelector(`#addSequenceBtn-${track.id}`)?.addEventListener('click', () => {
            const newSeqId = track.addNewSequence();
            track.setActiveSequence(newSeqId);
            populateSequenceSelect(track, sequenceSelect);
            const newActiveSeq = track.getActiveSequence();
            barsInput.value = newActiveSeq.bars;
            renderSequencerGrid(track, gridContainer, rows, rowLabels, newActiveSeq.bars);
        });
         sequencerWindow.element.querySelector(`#removeSequenceBtn-${track.id}`)?.addEventListener('click', () => {
            const currentSeqId = track.activeSequenceId;
            if (track.sequences.length > 1) {
                 showConfirmationDialog(`Delete sequence "${track.getSequenceById(currentSeqId)?.name || currentSeqId}"?`, () => {
                    track.removeSequence(currentSeqId);
                    populateSequenceSelect(track, sequenceSelect); // Refreshes and sets to new active
                    const newActiveSeq = track.getActiveSequence();
                    barsInput.value = newActiveSeq.bars;
                    renderSequencerGrid(track, gridContainer, rows, rowLabels, newActiveSeq.bars);
                });
            } else {
                showNotification("Cannot delete the last sequence.", "warning");
            }
        });
    }
    return sequencerWindow;
}

function populateSequenceSelect(track, selectElement) {
    if (!selectElement) return;
    selectElement.innerHTML = '';
    track.sequences.forEach(seq => {
        const option = document.createElement('option');
        option.value = seq.id;
        option.textContent = seq.name || `Sequence ${seq.id}`;
        if (seq.id === track.activeSequenceId) option.selected = true;
        selectElement.appendChild(option);
    });
}


function buildSequencerContentDOM(track, rows, rowLabels, numBars) {
    const stepsPerBar = Constants.STEPS_PER_BAR;
    const totalSteps = numBars * stepsPerBar;

    let html = `
        <div class="sequencer-container p-1 text-xs overflow-auto h-full bg-gray-800 dark:bg-slate-900 text-slate-300 dark:text-slate-300 rounded-b-md">
            <div class="controls mb-1 flex justify-between items-center sticky top-0 left-0 bg-gray-700 dark:bg-slate-800 p-1.5 z-10 border-b border-slate-600">
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
    gridContainer.innerHTML = ''; // Clear previous grid
    const stepsPerBar = Constants.STEPS_PER_BAR;
    const totalSteps = numBars * stepsPerBar;
    const activeSequence = track.getActiveSequence();
    if (!activeSequence) {
        gridContainer.innerHTML = '<p class="text-center text-slate-400 p-4">No active sequence.</p>';
        return;
    }

    gridContainer.style.gridTemplateColumns = `60px repeat(${totalSteps}, minmax(25px, 1fr))`;
    gridContainer.style.gridTemplateRows = `20px repeat(${rows}, 30px)`;

    // Header Row (Time)
    gridContainer.appendChild(Object.assign(document.createElement('div'), { className: 'sequencer-header-cell sequencer-label-cell bg-slate-700' })); // Top-left empty
    for (let step = 0; step < totalSteps; step++) {
        const bar = Math.floor(step / stepsPerBar) + 1;
        const beat = Math.floor((step % stepsPerBar) / (stepsPerBar / 4)) + 1;
        const subStep = (step % (stepsPerBar / 4)) + 1;
        const cell = document.createElement('div');
        cell.className = 'sequencer-header-cell text-xxs flex items-center justify-center bg-slate-700';
        cell.textContent = `${bar}.${beat}.${subStep}`;
        if (step % stepsPerBar === 0) cell.classList.add('border-l-2', 'border-slate-500');
        gridContainer.appendChild(cell);
    }

    // Note Rows
    for (let row = 0; row < rows; row++) {
        const labelCell = document.createElement('div');
        labelCell.className = 'sequencer-label-cell text-xxs flex items-center justify-end pr-1 bg-slate-700';
        labelCell.textContent = rowLabels[row];
        gridContainer.appendChild(labelCell);

        for (let step = 0; step < totalSteps; step++) {
            const cell = document.createElement('div');
            cell.className = `sequencer-step-cell ${(step % (stepsPerBar/4) < (stepsPerBar/8)) ? 'bg-slate-800' : 'bg-slate-850'} hover:bg-blue-700`; // Alternate shading
            if (step % stepsPerBar === 0) cell.classList.add('border-l-2', 'border-slate-500');
            
            const noteData = activeSequence.steps.find(s => s.time === step && s.pitchOrPad === rowLabels[row]);
            if (noteData) {
                cell.classList.add(`active-${track.type.toLowerCase()}`); // e.g., active-synth
                cell.dataset.velocity = noteData.velocity;
            }

            cell.addEventListener('click', () => {
                track.toggleStep(rowLabels[row], step, activeSequence.id); // This should handle undo
                // Re-render only the affected cell for performance instead of full grid
                cell.classList.toggle(`active-${track.type.toLowerCase()}`, track.getActiveSequence().steps.some(s => s.time === step && s.pitchOrPad === rowLabels[row]));
            });
            gridContainer.appendChild(cell);
        }
    }
}


// --- Timeline / Arrangement View ---
export function openArrangementWindow(onReadyCallback, savedState = null) {
    const windowId = 'timeline';
    if (!savedState && localAppServices.getWindowByIdState(windowId)?.element) {
        localAppServices.getWindowByIdState(windowId).focus();
        return localAppServices.getWindowByIdState(windowId);
    }

    const contentHTML = `
        <div id="timeline-container" class="w-full h-full flex flex-col bg-slate-800 text-slate-300 text-xs">
            <div id="timeline-header" class="h-6 flex-shrink-0 bg-slate-700 border-b border-slate-600 relative overflow-hidden">
                <div id="timeline-ruler-labels" class="absolute top-0 left-0 h-full flex items-center z-10" style="width: ${Constants.TIMELINE_TRACK_NAME_WIDTH || 120}px; background-color: var(--timeline-track-name-bg, #2a2a2a);"></div>
                <div id="timeline-ruler" class="absolute top-0 h-full bg-slate-700" style="left: ${Constants.TIMELINE_TRACK_NAME_WIDTH || 120}px;">
                    </div>
            </div>
            <div id="timeline-tracks-container" class="flex-grow overflow-auto relative">
                <div id="timeline-tracks-area" class="relative min-h-full">
                    </div>
                <div id="timeline-playhead" class="absolute top-0 w-0.5 h-full bg-red-500 z-20 pointer-events-none" style="left: ${Constants.TIMELINE_TRACK_NAME_WIDTH || 120}px;"></div>
            </div>
        </div>`;
    
    const desktopEl = localAppServices.uiElementsCache?.desktop || document.getElementById('desktop');
    const safeDesktopWidth = (desktopEl && typeof desktopEl.offsetWidth === 'number' && desktopEl.offsetWidth > 0) ? desktopEl.offsetWidth : 1024;
    const timelineOptions = {
        width: Math.max(600, Math.min(1200, safeDesktopWidth - 60)),
        height: 350, x: 30, y: 50, minWidth: 400, minHeight: 200,
        initialContentKey: windowId
    };
    if (savedState) Object.assign(timelineOptions, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });
    
    const timelineWindow = localAppServices.createWindow(windowId, 'Arrangement', contentHTML, timelineOptions);

    if (timelineWindow?.element) {
        renderTimeline(); // Initial render
        const tracksContainer = timelineWindow.element.querySelector('#timeline-tracks-container');
        const ruler = timelineWindow.element.querySelector('#timeline-ruler');
        tracksContainer.addEventListener('scroll', () => {
            ruler.style.transform = `translateX(-${tracksContainer.scrollLeft}px)`;
            updatePlayheadPosition(); // Keep playhead aligned during scroll
        });
        // Setup drag and drop for timeline tracks area
        setupTimelineDropHandling(tracksContainer);
        // Setup clip dragging and resizing
        setupClipInteractions(tracksContainer);
    }
    return timelineWindow;
}

function setupTimelineDropHandling(tracksContainer) {
    tracksContainer.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy'; // Or 'move' if applicable
        // Optional: Add visual feedback for dragover, like highlighting the target track lane
    });

    tracksContainer.addEventListener('drop', (event) => {
        event.preventDefault();
        const tracksArea = tracksContainer.querySelector('#timeline-tracks-area');
        if (!tracksArea) return;

        const dropDataString = event.dataTransfer.getData('application/json');
        if (!dropDataString) {
            // Handle file drop from OS
            const files = event.dataTransfer.files;
            if (files && files.length > 0 && files[0].type.startsWith('audio/')) {
                // Determine target track and time
                const targetTrackElement = event.target.closest('.timeline-track-lane');
                if (targetTrackElement && targetTrackElement.dataset.trackId) {
                    const trackId = targetTrackElement.dataset.trackId;
                    const track = localAppServices.getTrackById(trackId);
                    if (track && track.type === 'Audio') {
                        const rect = targetTrackElement.getBoundingClientRect();
                        const x = event.clientX - rect.left;
                        const pixelsPerSecond = parseFloat(tracksArea.dataset.pixelsPerSecond || 30);
                        const startTime = x / pixelsPerSecond;
                        localAppServices.loadSampleFile(files[0], trackId, 'Audio', startTime); // Assuming loadSampleFile can handle this
                        showNotification(`Dropped ${files[0].name} onto ${track.name}.`, "info");
                    } else {
                        showNotification("Can only drop audio files onto Audio tracks.", "warning");
                    }
                }
            }
            return;
        }

        try {
            const droppedItemData = JSON.parse(dropDataString);
            const pixelsPerSecond = parseFloat(tracksArea.dataset.pixelsPerSecond || 30); // Get current resolution
            const trackNameWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim()) || 120;

            // Calculate drop position relative to the tracksArea
            const tracksAreaRect = tracksArea.getBoundingClientRect();
            const dropX = event.clientX - tracksAreaRect.left + tracksContainer.scrollLeft - trackNameWidth;
            const dropY = event.clientY - tracksAreaRect.top + tracksContainer.scrollTop;
            
            const startTime = Math.max(0, dropX / pixelsPerSecond);

            // Find target track based on Y position
            const trackElements = Array.from(tracksArea.querySelectorAll('.timeline-track-lane'));
            let targetTrackId = null;
            for (const trackEl of trackElements) {
                if (dropY >= trackEl.offsetTop && dropY < trackEl.offsetTop + trackEl.offsetHeight) {
                    targetTrackId = trackEl.dataset.trackId;
                    break;
                }
            }

            if (targetTrackId) {
                if (localAppServices.handleTimelineLaneDrop) {
                    localAppServices.handleTimelineLaneDrop(droppedItemData, targetTrackId, startTime);
                } else {
                    console.warn("handleTimelineLaneDrop service not available.");
                }
            } else {
                showNotification("Could not determine target track for drop.", "warning");
            }

        } catch (e) {
            console.error("Error processing timeline drop:", e);
            showNotification("Error processing dropped item on timeline.", "error");
        }
    });
}


export function renderTimeline() {
    const timelineWindow = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState('timeline') : null;
    if (!timelineWindow || !timelineWindow.element) return;

    const tracksArea = timelineWindow.element.querySelector('#timeline-tracks-area');
    const ruler = timelineWindow.element.querySelector('#timeline-ruler');
    if (!tracksArea || !ruler) return;

    tracksArea.innerHTML = ''; // Clear existing tracks
    ruler.innerHTML = '';    // Clear existing ruler markings

    const tracks = localAppServices.getTracksState();
    const totalDurationSeconds = 240; // Example: 4 minutes total timeline length for ruler
    const pixelsPerSecond = parseFloat(tracksArea.dataset.pixelsPerSecond || 30); // Default 30px per second
    tracksArea.style.width = `${totalDurationSeconds * pixelsPerSecond}px`;
    ruler.style.width = `${totalDurationSeconds * pixelsPerSecond}px`;

    // Render Ruler Markings
    for (let sec = 0; sec < totalDurationSeconds; sec++) {
        const majorMark = document.createElement('div');
        majorMark.className = 'absolute top-0 h-full border-l border-slate-600';
        majorMark.style.left = `${sec * pixelsPerSecond}px`;
        if (sec % 5 === 0) { // Label every 5 seconds
            majorMark.classList.add('border-slate-500'); // Stronger line
            const label = document.createElement('span');
            label.className = 'absolute top-0.5 left-1 text-xxs text-slate-400';
            label.textContent = `${sec}s`;
            majorMark.appendChild(label);
        }
        ruler.appendChild(majorMark);
    }


    tracks.forEach(track => {
        const trackLane = document.createElement('div');
        trackLane.className = 'timeline-track-lane h-16 border-b border-slate-600 relative flex items-center';
        trackLane.dataset.trackId = track.id;
        if (tracks.indexOf(track) % 2 === 0) trackLane.classList.add('bg-slate-750'); else trackLane.classList.add('bg-slate-700');

        const nameArea = document.createElement('div');
        nameArea.className = 'timeline-track-lane-name-area sticky left-0 z-10 bg-slate-800 p-2 h-full flex flex-col justify-center border-r border-slate-600';
        nameArea.style.minWidth = `${Constants.TIMELINE_TRACK_NAME_WIDTH || 120}px`;
        nameArea.style.maxWidth = `${Constants.TIMELINE_TRACK_NAME_WIDTH || 120}px`;
        
        const nameText = document.createElement('div');
        nameText.className = 'timeline-track-name-text text-xs font-medium truncate';
        nameText.textContent = track.name;
        nameArea.appendChild(nameText);

        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'timeline-sequence-buttons flex space-x-1 mt-1';
        // Simplified buttons for timeline track header
        ['M', 'S', 'R'].forEach(label => {
            const btn = document.createElement('button');
            btn.className = 'p-0.5 w-5 h-5 text-xxs rounded-sm bg-slate-700 hover:bg-slate-600';
            btn.textContent = label;
             if (label === 'M') btn.onclick = () => { if(localAppServices.handleTrackMute) localAppServices.handleTrackMute(track.id); renderTimeline(); };
             if (label === 'S') btn.onclick = () => { if(localAppServices.handleTrackSolo) localAppServices.handleTrackSolo(track.id); renderTimeline(); };
             if (label === 'R') btn.onclick = () => { if(localAppServices.handleTrackArm) localAppServices.handleTrackArm(track.id); renderTimeline(); };
             if (label==='M' && track.isMuted) btn.classList.add('bg-yellow-600');
             if (label==='S' && track.isSoloed) btn.classList.add('bg-orange-600');
             if (label==='R' && track.isArmedForRec) btn.classList.add('bg-red-600');
            buttonsDiv.appendChild(btn);
        });
        nameArea.appendChild(buttonsDiv);
        trackLane.appendChild(nameArea);

        // Render clips for this track
        track.timelineClips.forEach(clip => {
            const clipEl = document.createElement('div');
            clipEl.className = `absolute h-4/5 top-[10%] rounded overflow-hidden text-white text-xxs p-1 cursor-grab shadow-md ${clip.type === 'audio' ? 'bg-teal-600 border border-teal-500 audio-clip' : 'bg-sky-600 border border-sky-500 sequence-clip'}`;
            clipEl.style.left = `${clip.startTime * pixelsPerSecond}px`;
            clipEl.style.width = `${clip.duration * pixelsPerSecond}px`;
            clipEl.textContent = clip.name || (clip.type === 'audio' ? 'Audio Clip' : 'Sequence');
            clipEl.dataset.clipId = clip.id;
            clipEl.dataset.trackId = track.id; // For easier access during interactions
            trackLane.appendChild(clipEl);
        });
        tracksArea.appendChild(trackLane);
    });
    updatePlayheadPosition();
}

export function updatePlayheadPosition() {
    const timelineWindow = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState('timeline') : null;
    if (!timelineWindow || !timelineWindow.element || Tone.Transport.state !== 'started') {
        if(timelineWindow?.element.querySelector('#timeline-playhead')) timelineWindow.element.querySelector('#timeline-playhead').style.display = 'none';
        return;
    }
    
    const playhead = timelineWindow.element.querySelector('#timeline-playhead');
    const tracksContainer = timelineWindow.element.querySelector('#timeline-tracks-container');
    const tracksArea = timelineWindow.element.querySelector('#timeline-tracks-area');

    if (!playhead || !tracksContainer || !tracksArea) return;
    playhead.style.display = 'block';

    const pixelsPerSecond = parseFloat(tracksArea.dataset.pixelsPerSecond || 30);
    const trackNameWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim()) || 120;
    const scrollLeft = tracksContainer.scrollLeft;
    const rawNewPosition = Tone.Transport.seconds * pixelsPerSecond;
    playhead.style.left = `${trackNameWidth + rawNewPosition - scrollLeft}px`;
}

export function highlightPlayingStep(trackId, step, pitchOrPad) {
    // This function is more tied to the Sequencer UI.
    const sequencerWindow = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState(`sequencer-${trackId}`) : null;
    if (!sequencerWindow || !sequencerWindow.element) return;

    const gridContainer = sequencerWindow.element.querySelector('.sequencer-grid-layout');
    if (!gridContainer) return;

    // Remove previous highlight
    gridContainer.querySelectorAll('.playing').forEach(cell => cell.classList.remove('playing', 'scale-110', 'z-10'));
    
    const track = localAppServices.getTrackById(trackId);
    if (!track) return;

    const rowLabels = track.type === 'Synth' || track.type === 'InstrumentSampler' ? Constants.synthPitches :
                      [...Array(track.type === 'Sampler' ? Constants.numSlices : Constants.numDrumSamplerPads).keys()].map(i => `${track.type === 'Sampler' ? 'Slice' : 'Pad'} ${i + 1}`);
    const rowIndex = rowLabels.indexOf(pitchOrPad);

    if (rowIndex !== -1 && step !== undefined && step !== null) {
        // Calculate cell index: (rowIndex * totalStepsInRow) + stepIndex + (rowIndex + 1 for label cells) + (1 for header row * totalStepsInRow)
        const totalSteps = (track.getActiveSequence()?.bars || 1) * Constants.STEPS_PER_BAR;
        const headerCellsOffset = totalSteps + 1; // 1 for top-left empty, + totalSteps for header step numbers
        const cellIndexInGrid = headerCellsOffset + (rowIndex * (totalSteps + 1)) + step +1; // +1 because grid-item indices are 1-based in some contexts, also for row label cell
        
        const targetCell = gridContainer.children[cellIndexInGrid];
        if (targetCell && targetCell.classList.contains('sequencer-step-cell')) {
            targetCell.classList.add('playing', 'scale-110', 'z-10');
        } else {
            // console.warn(`[highlightPlayingStep] Cell not found or not a step cell. Index: ${cellIndexInGrid}, Step: ${step}, Pitch: ${pitchOrPad}`);
        }
    }
}

// --- Mixer Window ---
export function openMixerWindow(savedState = null) {
    const windowId = 'mixer';
    if (!savedState && localAppServices.getWindowByIdState(windowId)?.element) {
        localAppServices.getWindowByIdState(windowId).focus();
        return localAppServices.getWindowByIdState(windowId);
    }
    const contentHTML = `<div id="mixer-strips-container" class="p-2 flex space-x-2 overflow-x-auto h-full bg-slate-800"></div>`;
    const options = { width: 600, height: 350, minWidth:300, minHeight:200, initialContentKey: windowId };
    if (savedState) Object.assign(options, { x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), zIndex: savedState.zIndex, isMinimized: savedState.isMinimized });

    const mixerWindow = localAppServices.createWindow(windowId, 'Mixer', contentHTML, options);
    if (mixerWindow?.element) {
        updateMixerWindow(); // Initial render
    }
    return mixerWindow;
}

export function updateMixerWindow() {
    const mixerWindow = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState('mixer') : null;
    if (!mixerWindow || !mixerWindow.element) return;

    const container = mixerWindow.element.querySelector('#mixer-strips-container');
    container.innerHTML = ''; // Clear existing

    const tracks = localAppServices.getTracksState();
    tracks.forEach(track => {
        const strip = document.createElement('div');
        strip.className = 'mixer-strip flex flex-col items-center p-1.5 border border-slate-700 rounded bg-slate-750 w-20 text-xs flex-shrink-0';
        strip.innerHTML = `
            <div class="track-name truncate w-full text-center mb-1 text-slate-300 font-medium" title="${track.name}">${track.name}</div>
            <div class="pan-control mb-1 w-full">
                <input type="range" id="mixerPan-${track.id}" min="-1" max="1" step="0.01" value="${track.pan.value}" class="w-full h-1.5 accent-purple-500 bg-slate-600 rounded-lg appearance-none cursor-pointer" title="Pan">
            </div>
            <div class="volume-fader-container relative flex-grow w-6 bg-slate-600 rounded overflow-hidden my-1">
                <input type="range" id="mixerVolume-${track.id}" min="-60" max="6" step="0.1" value="${track.getVolumeDb()}" class="mixer-fader accent-blue-500 appearance-none bg-transparent w-20 h-2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[270deg]" title="Volume">
                <div class="meter-bar-container track-meter-container mixer-meter-container absolute bottom-1 left-0 right-0 mx-auto w-4/5 h-2 bg-slate-800 border border-slate-900 rounded-sm overflow-hidden">
                    <div id="mixerMeter-${track.id}" class="meter-bar h-full bg-green-500" style="width: 0%;"></div>
                </div>
            </div>
            <div class="buttons- नीचे mt-1.5 flex space-x-1 w-full justify-around">
                <button class="mixer-mute-btn p-1 w-6 h-6 rounded ${track.isMuted ? 'bg-yellow-600 text-slate-900' : 'bg-slate-600 hover:bg-yellow-700'} " title="Mute">M</button>
                <button class="mixer-solo-btn p-1 w-6 h-6 rounded ${track.isSoloed ? 'bg-orange-500 text-slate-900' : 'bg-slate-600 hover:bg-orange-600'}" title="Solo">S</button>
                ${track.type === 'Audio' || track.canBeArmed ? `<button class="mixer-arm-btn p-1 w-6 h-6 rounded ${track.isArmedForRec ? 'bg-red-600 text-white' : 'bg-slate-600 hover:bg-red-700'}" title="Arm">R</button>` : '<div class="w-6 h-6"></div>'}
            </div>`;
        container.appendChild(strip);

        strip.querySelector(`#mixerVolume-${track.id}`).addEventListener('input', (e) => track.setVolumeDb(parseFloat(e.target.value)));
        strip.querySelector(`#mixerPan-${track.id}`).addEventListener('input', (e) => track.setPan(parseFloat(e.target.value)));
        strip.querySelector('.mixer-mute-btn').addEventListener('click', () => localAppServices.handleTrackMute(track.id));
        strip.querySelector('.mixer-solo-btn').addEventListener('click', () => localAppServices.handleTrackSolo(track.id));
        const armBtn = strip.querySelector('.mixer-arm-btn');
        if (armBtn) armBtn.addEventListener('click', () => localAppServices.handleTrackArm(track.id));
    });
     // Optionally, add a master fader strip here
}

// --- Clip Interactions on Timeline ---
function setupClipInteractions(tracksContainer) {
    let dragInfo = null; // { clipEl, clip, track, offsetX, originalStartTime, trackLaneEl }
    let resizeInfo = null; // { clipEl, clip, track, handle, originalWidth, originalStartTime, originalDuration, initialMouseX, pixelsPerSecond, isLeftHandle, newStartTime, newDuration }

    const onDragStart = (event) => {
        const clipEl = event.target.closest('.audio-clip, .sequence-clip');
        if (!clipEl || event.button !== 0) return;
        event.preventDefault();

        const trackId = clipEl.dataset.trackId;
        const clipId = clipEl.dataset.clipId;
        const track = localAppServices.getTrackById(trackId);
        const clip = track?.timelineClips.find(c => c.id === clipId);
        if (!track || !clip) return;
        
        const tracksArea = tracksContainer.querySelector('#timeline-tracks-area');
        const pixelsPerSecond = parseFloat(tracksArea.dataset.pixelsPerSecond || 30);
        const trackNameWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim()) || 120;

        dragInfo = {
            clipEl, clip, track,
            offsetX: event.clientX - clipEl.getBoundingClientRect().left,
            originalStartTime: clip.startTime,
            trackLaneEl: clipEl.parentElement, // The .timeline-track-lane
            pixelsPerSecond,
            trackNameWidth,
            scrollLeft: tracksContainer.scrollLeft,
        };
        clipEl.classList.add('dragging', 'z-50');
        clipEl.style.pointerEvents = 'none'; // Avoid self-interference
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onDragEnd);
    };

    const onDrag = (event) => {
        if (!dragInfo) return;
        event.preventDefault();
        
        const newX = event.clientX - dragInfo.trackLaneEl.getBoundingClientRect().left - dragInfo.offsetX + tracksContainer.scrollLeft - dragInfo.trackNameWidth;
        let newStartTime = Math.max(0, newX / dragInfo.pixelsPerSecond);
        newStartTime = snapTimeToGrid(newStartTime, Tone.Transport.bpm.value, dragInfo.pixelsPerSecond); // Snap to grid
        
        dragInfo.clipEl.style.left = `${newStartTime * dragInfo.pixelsPerSecond}px`;
        // Visual feedback for which track it would drop onto (if implementing cross-track drag)
    };

    const onDragEnd = (event) => {
        if (!dragInfo) return;
        event.preventDefault();
        
        dragInfo.clipEl.classList.remove('dragging', 'z-50');
        dragInfo.clipEl.style.pointerEvents = '';

        const finalX = parseFloat(dragInfo.clipEl.style.left) / dragInfo.pixelsPerSecond;
        
        // Determine if track changed (for future cross-track drag)
        // For now, assume it stays on the same track.
        if (Math.abs(finalX - dragInfo.originalStartTime) > 0.01) { // Check for actual move
            dragInfo.track.updateAudioClipPosition(dragInfo.clip.id, finalX); // This should handle undo
        }
        
        dragInfo = null;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', onDragEnd);
        renderTimeline(); // Re-render to confirm changes (or could update more selectively)
    };
    tracksContainer.addEventListener('mousedown', onDragStart); // Listen on tracks container to catch events on clips

    // Basic Resize (example for right handle, more complex for left/both)
    const startResize = (event) => {
        const target = event.target;
        // For actual resize handles: if (target.classList.contains('clip-resize-handle-right'))
        // For now, let's assume clicking near edge of clip initiates resize for simplicity if no dedicated handles
        const clipEl = target.closest('.audio-clip, .sequence-clip');
        if (!clipEl || event.button !== 0) return;

        const rect = clipEl.getBoundingClientRect();
        const isRightEdge = Math.abs(event.clientX - rect.right) < 10; // 10px tolerance for edge
        const isLeftEdge = Math.abs(event.clientX - rect.left) < 10;

        if (!isRightEdge && !isLeftEdge) return; // Not a resize attempt on edge
        event.preventDefault();
        event.stopPropagation(); // Prevent drag

        const trackId = clipEl.dataset.trackId;
        const clipId = clipEl.dataset.clipId;
        const track = localAppServices.getTrackById(trackId);
        const clip = track?.timelineClips.find(c => c.id === clipId);
        if (!track || !clip) return;

        const tracksArea = tracksContainer.querySelector('#timeline-tracks-area');
        const pixelsPerSecond = parseFloat(tracksArea.dataset.pixelsPerSecond || 30);

        resizeInfo = {
            clipEl, clip, track,
            isLeftHandle: isLeftEdge,
            originalWidth: clipEl.offsetWidth,
            originalStartTime: clip.startTime,
            originalDuration: clip.duration,
            initialMouseX: event.clientX,
            pixelsPerSecond
        };
        document.body.style.cursor = isLeftEdge ? 'ew-resize' : 'ew-resize'; // Appropriate cursor
        document.addEventListener('mousemove', onResize);
        document.addEventListener('mouseup', onResizeEnd);
    };

    const onResize = (event) => {
        if (!resizeInfo) return;
        event.preventDefault();
        const dx = event.clientX - resizeInfo.initialMouseX;
        const dTime = dx / resizeInfo.pixelsPerSecond;

        let newStartTime = resizeInfo.originalStartTime;
        let newDuration = resizeInfo.originalDuration;

        if (resizeInfo.isLeftHandle) {
            newStartTime = Math.max(0, resizeInfo.originalStartTime + dTime);
            newDuration = resizeInfo.originalDuration - (newStartTime - resizeInfo.originalStartTime);
        } else { // Right handle
            newDuration = Math.max(0.1, resizeInfo.originalDuration + dTime); // Min duration 0.1s
        }
        newDuration = snapTimeToGrid(newDuration, Tone.Transport.bpm.value, resizeInfo.pixelsPerSecond, true); // Snap duration
        newStartTime = snapTimeToGrid(newStartTime, Tone.Transport.bpm.value, resizeInfo.pixelsPerSecond);


        if (newDuration < 0.1) return;

        resizeInfo.clipEl.style.left = `${newStartTime * resizeInfo.pixelsPerSecond}px`;
        resizeInfo.clipEl.style.width = `${newDuration * resizeInfo.pixelsPerSecond}px`;
        resizeInfo.newStartTime = newStartTime;
        resizeInfo.newDuration = newDuration;
    };

    const onResizeEnd = (event) => {
        if (!resizeInfo) return;
        event.preventDefault();
        document.body.style.cursor = '';
        
        if (resizeInfo.newStartTime !== undefined && resizeInfo.newDuration !== undefined) {
             resizeInfo.track.updateClipProperties(resizeInfo.clip.id, { // This should handle undo
                startTime: resizeInfo.newStartTime,
                duration: resizeInfo.newDuration
            });
        }
        resizeInfo = null;
        document.removeEventListener('mousemove', onResize);
        document.removeEventListener('mouseup', onResizeEnd);
        renderTimeline(); // Re-render to confirm
    };
    // Event delegation for resize; mousedown on tracksContainer, check if target is an edge
    // This is a simplified resize; dedicated handles would be more robust.
    tracksContainer.addEventListener('mousedown', startResize);
}
