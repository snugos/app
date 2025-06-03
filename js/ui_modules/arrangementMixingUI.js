// js/ui_modules/arrangementMixingUI.js (MODIFIED - Ensured appServices reference)
import { SnugWindow } from '../SnugWindow.js';
import { showNotification, createContextMenu, showConfirmationDialog, snapTimeToGrid } from '../utils.js';
import * as Constants from '../constants.js';

// This will be the single appServices instance from main.js
let localAppServices = {}; 

export function initializeArrangementMixingUI(appServicesFromMain) {
    localAppServices = appServicesFromMain; // Use the direct reference
    // console.log("[ArrangementMixingUI] Module initialized.");
}

// --- Sequencer Window ---
export function openSequencerWindow(trackId, savedState = null) {
    const track = localAppServices.getTrackById ? localAppServices.getTrackById(trackId) : null;
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

    if (!localAppServices.createWindow) {
        console.error("[ArrangementMixingUI openSequencerWindow] localAppServices.createWindow is not a function!");
        return null;
    }
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
                if (track.updateActiveSequenceBars) track.updateActiveSequenceBars(newNumBars);
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
            const newSeqId = track.addNewSequence();
            track.setActiveSequence(newSeqId);
            populateSequenceSelect(track, sequenceSelect);
            const newActiveSeq = track.getActiveSequence ? track.getActiveSequence() : null;
            if (newActiveSeq) {
                barsInput.value = newActiveSeq.bars;
                renderSequencerGrid(track, gridContainer, rows, rowLabels, newActiveSeq.bars);
            }
        });
         sequencerWindow.element.querySelector(`#removeSequenceBtn-${track.id}`)?.addEventListener('click', () => {
            if (!track.sequences || !track.removeSequence || !track.getSequenceById || !track.getActiveSequence) return;
            const currentSeqId = track.activeSequenceId;
            if (track.sequences.length > 1) {
                const seqToRemove = track.getSequenceById(currentSeqId);
                if (localAppServices.showConfirmationDialog) {
                    localAppServices.showConfirmationDialog(`Delete sequence "${seqToRemove?.name || currentSeqId}"?`, () => {
                        track.removeSequence(currentSeqId);
                        populateSequenceSelect(track, sequenceSelect); 
                        const newActiveSeq = track.getActiveSequence();
                        if (newActiveSeq) {
                            barsInput.value = newActiveSeq.bars;
                            renderSequencerGrid(track, gridContainer, rows, rowLabels, newActiveSeq.bars);
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
    if(!gridContainer || !track || !track.getActiveSequence) return;
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

    gridContainer.appendChild(Object.assign(document.createElement('div'), { className: 'sequencer-header-cell sequencer-label-cell bg-slate-700' }));
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

    for (let row = 0; row < rows; row++) {
        const labelCell = document.createElement('div');
        labelCell.className = 'sequencer-label-cell text-xxs flex items-center justify-end pr-1 bg-slate-700';
        labelCell.textContent = rowLabels[row];
        gridContainer.appendChild(labelCell);

        for (let step = 0; step < totalSteps; step++) {
            const cell = document.createElement('div');
            cell.className = `sequencer-step-cell ${(step % (stepsPerBar/4) < (stepsPerBar/8)) ? 'bg-slate-800' : 'bg-slate-850'} hover:bg-blue-700`;
            if (step % stepsPerBar === 0) cell.classList.add('border-l-2', 'border-slate-500');
            
            const noteData = activeSequence.steps.find(s => s.time === step && s.pitchOrPad === rowLabels[row]);
            const trackTypeClass = `active-${track.type.toLowerCase()}`;
            if (noteData) {
                cell.classList.add(trackTypeClass);
                cell.dataset.velocity = noteData.velocity;
            }

            cell.addEventListener('click', () => {
                if (!track.toggleStep) return;
                track.toggleStep(rowLabels[row], step, activeSequence.id);
                const currentActiveSequence = track.getActiveSequence(); // Re-fetch after toggle
                const isNowActive = currentActiveSequence.steps.some(s => s.time === step && s.pitchOrPad === rowLabels[row]);
                cell.classList.toggle(trackTypeClass, isNowActive);
                if (isNowActive) {
                    const updatedNoteData = currentActiveSequence.steps.find(s => s.time === step && s.pitchOrPad === rowLabels[row]);
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
    // CRITICAL CHECK: Ensure localAppServices and its methods are available
    if (!localAppServices || typeof localAppServices.getWindowByIdState !== 'function' || typeof localAppServices.createWindow !== 'function') {
        console.error("[ArrangementMixingUI openArrangementWindow] CRITICAL: localAppServices or required methods (getWindowByIdState, createWindow) are not available!", localAppServices);
        if(localAppServices && typeof localAppServices.showNotification === 'function') {
            localAppServices.showNotification("Error opening Timeline: Core services missing.", "error");
        } else {
            alert("Error opening Timeline: Core services missing. Check console.");
        }
        return null;
    }

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
    if (savedState) Object.assign(timelineOptions, { 
        x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), 
        width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), 
        zIndex: savedState.zIndex, isMinimized: savedState.isMinimized 
    });
    
    const timelineWindow = localAppServices.createWindow(windowId, 'Arrangement', contentHTML, timelineOptions);

    if (timelineWindow?.element) {
        renderTimeline(); 
        const tracksContainer = timelineWindow.element.querySelector('#timeline-tracks-container');
        const ruler = timelineWindow.element.querySelector('#timeline-ruler');
        if (tracksContainer && ruler) {
            tracksContainer.addEventListener('scroll', () => {
                ruler.style.transform = `translateX(-${tracksContainer.scrollLeft}px)`;
                updatePlayheadPosition(); 
            });
            setupTimelineDropHandling(tracksContainer);
            setupClipInteractions(tracksContainer);
        }
         if (typeof onReadyCallback === 'function') {
            onReadyCallback(timelineWindow);
        }
    }
    return timelineWindow;
}

function setupTimelineDropHandling(tracksContainer) {
    // ... (same as response #58, ensure localAppServices calls are valid) ...
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
        
        const pixelsPerSecond = parseFloat(tracksArea.dataset.pixelsPerSecond || 30); 
        const trackNameWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim()) || Constants.TIMELINE_TRACK_NAME_WIDTH || 120;
        
        const tracksAreaRect = tracksArea.getBoundingClientRect();
        const dropXInTracksContainer = event.clientX - tracksAreaRect.left + tracksContainer.scrollLeft;
        const dropYInTracksContainer = event.clientY - tracksAreaRect.top + tracksContainer.scrollTop;
        const dropXRelativeToGrid = dropXInTracksContainer - trackNameWidth;
        const startTime = Math.max(0, dropXRelativeToGrid / pixelsPerSecond);
        const bpmForSnap = (typeof Tone !== 'undefined' && Tone.Transport) ? Tone.Transport.bpm.value : 120;
        const snappedStartTime = snapTimeToGrid(startTime, bpmForSnap, pixelsPerSecond);

        const trackElements = Array.from(tracksArea.querySelectorAll('.timeline-track-lane'));
        let targetTrackId = null;
        for (const trackEl of trackElements) {
            if (dropYInTracksContainer >= trackEl.offsetTop && dropYInTracksContainer < trackEl.offsetTop + trackEl.offsetHeight) {
                targetTrackId = trackEl.dataset.trackId;
                break;
            }
        }
        
        if (targetTrackId) {
            const dataToPass = dropDataString ? JSON.parse(dropDataString) : (files && files.length > 0 ? files : null);
            if(dataToPass) {
                localAppServices.handleTimelineLaneDrop(dataToPass, targetTrackId, snappedStartTime);
            } else {
                 if(localAppServices.showNotification) localAppServices.showNotification("No valid data dropped.", "warning");
            }
        } else if (localAppServices.showNotification) {
            localAppServices.showNotification("Could not determine target track for drop.", "warning");
        }
    });
}

export function renderTimeline() {
    // ... (same as response #58, ensure localAppServices calls are valid) ...
    if (!localAppServices.getWindowByIdState || !localAppServices.getTracksState) return;
    const timelineWindow = localAppServices.getWindowByIdState('timeline');
    if (!timelineWindow || !timelineWindow.element) return;

    const tracksArea = timelineWindow.element.querySelector('#timeline-tracks-area');
    const ruler = timelineWindow.element.querySelector('#timeline-ruler');
    if (!tracksArea || !ruler) return;

    tracksArea.innerHTML = ''; 
    ruler.innerHTML = '';    

    const tracks = localAppServices.getTracksState();
    const bpm = (typeof Tone !== 'undefined' && Tone.Transport) ? Tone.Transport.bpm.value : 120;
    const totalDurationSeconds = Constants.MAX_BARS * (60 / bpm) * 4; 
    const pixelsPerSecond = parseFloat(tracksArea.dataset.pixelsPerSecond || 30); 
    tracksArea.style.width = `${totalDurationSeconds * pixelsPerSecond}px`;
    ruler.style.width = `${totalDurationSeconds * pixelsPerSecond}px`;

    for (let sec = 0; sec < totalDurationSeconds; sec++) {
        const secondsPerBar = (60 / bpm) * 4;
        const bar = Math.floor(sec / secondsPerBar) + 1;
        const isBarStart = sec % secondsPerBar < (1 / pixelsPerSecond); // More tolerant check

        const majorMark = document.createElement('div');
        majorMark.className = 'absolute top-0 h-full border-l border-slate-600';
        majorMark.style.left = `${sec * pixelsPerSecond}px`;
        if (isBarStart) { 
            majorMark.classList.add('border-slate-400', 'w-0.5'); 
            const label = document.createElement('span');
            label.className = 'absolute top-0.5 left-1 text-xxs text-slate-400';
            label.textContent = `${bar}`;
            majorMark.appendChild(label);
        } else if (sec % Math.max(1, Math.floor(secondsPerBar/4)) < (1/pixelsPerSecond)) { // Beat marker attempt
             majorMark.classList.add('border-slate-500');
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
        ['M', 'S', 'R'].forEach(label => {
            const btn = document.createElement('button');
            btn.className = `p-0.5 w-5 h-5 text-xxs rounded-sm ${
                (label === 'M' && track.isMuted) ? 'bg-yellow-500 text-black' :
                (label === 'S' && track.isSoloed) ? 'bg-orange-500 text-black' :
                (label === 'R' && track.isArmedForRec) ? 'bg-red-500 text-white' :
                'bg-slate-700 hover:bg-slate-600'
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
        trackLane.appendChild(nameArea);

        track.timelineClips.forEach(clip => {
            const clipEl = document.createElement('div');
            clipEl.className = `absolute h-4/5 top-[10%] rounded overflow-hidden text-white text-xxs p-1 cursor-grab shadow-md ${clip.type === 'audio' ? 'bg-teal-600 border border-teal-500 audio-clip' : 'bg-sky-600 border border-sky-500 sequence-clip'}`;
            clipEl.style.left = `${clip.startTime * pixelsPerSecond}px`;
            clipEl.style.width = `${Math.max(1, clip.duration * pixelsPerSecond)}px`; // Ensure min width of 1px
            clipEl.textContent = clip.name || (clip.type === 'audio' ? 'Audio Clip' : 'Sequence');
            clipEl.dataset.clipId = clip.id;
            clipEl.dataset.trackId = track.id; 
            trackLane.appendChild(clipEl);
        });
        tracksArea.appendChild(trackLane);
    });
    updatePlayheadPosition();
}

export function updatePlayheadPosition() {
    // ... (same as response #58, ensure localAppServices calls are valid and Tone is checked) ...
    if (!localAppServices.getWindowByIdState || typeof Tone === 'undefined') return;
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

    const pixelsPerSecond = parseFloat(tracksArea.dataset.pixelsPerSecond || 30);
    const trackNameWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim()) || Constants.TIMELINE_TRACK_NAME_WIDTH || 120;
    const scrollLeft = tracksContainer.scrollLeft;
    const rawNewPosition = Tone.Transport.seconds * pixelsPerSecond;
    playhead.style.left = `${trackNameWidth + rawNewPosition - scrollLeft}px`;
}

export function highlightPlayingStep(trackId, step, pitchOrPad) {
    // ... (same as response #58, ensure localAppServices calls are valid) ...
    if(!localAppServices.getWindowByIdState || !localAppServices.getTrackById) return;
    const sequencerWindow = localAppServices.getWindowByIdState(`sequencer-${trackId}`);
    if (!sequencerWindow || !sequencerWindow.element) return;

    const gridContainer = sequencerWindow.element.querySelector('.sequencer-grid-layout');
    if (!gridContainer) return;

    gridContainer.querySelectorAll('.playing').forEach(cell => cell.classList.remove('playing', 'scale-110', 'z-10'));
    
    const track = localAppServices.getTrackById(trackId);
    if (!track || !track.getActiveSequence) return;

    const rowLabels = track.type === 'Synth' || track.type === 'InstrumentSampler' ? Constants.synthPitches :
                      [...Array(track.type === 'Sampler' ? Constants.numSlices : Constants.numDrumSamplerPads).keys()].map(i => `${track.type === 'Sampler' ? 'Slice' : 'Pad'} ${i + 1}`);
    const rowIndex = rowLabels.indexOf(pitchOrPad);

    if (rowIndex !== -1 && step !== undefined && step !== null) {
        const activeSequence = track.getActiveSequence();
        if (!activeSequence) return;
        const totalSteps = activeSequence.bars * Constants.STEPS_PER_BAR;
        const domCellIndex = (totalSteps + 1) + (rowIndex * (totalSteps + 1)) + 1 + step;
        
        const targetCell = gridContainer.children[domCellIndex];
        if (targetCell && targetCell.classList.contains('sequencer-step-cell')) {
            targetCell.classList.add('playing', 'scale-110', 'z-10');
        }
    }
}

export function openMixerWindow(savedState = null) {
    // ... (same as response #58, ensure localAppServices calls are valid) ...
    if(!localAppServices.getWindowByIdState || !localAppServices.createWindow) return null;
    const windowId = 'mixer';
    if (!savedState && localAppServices.getWindowByIdState(windowId)?.element) {
        localAppServices.getWindowByIdState(windowId).focus();
        return localAppServices.getWindowByIdState(windowId);
    }
    const contentHTML = `<div id="mixer-strips-container" class="p-2 flex space-x-2 overflow-x-auto h-full bg-slate-800"></div>`;
    const options = { width: 600, height: 350, minWidth:300, minHeight:200, initialContentKey: windowId };
    if (savedState) Object.assign(options, { /* ... */ });
    const mixerWindow = localAppServices.createWindow(windowId, 'Mixer', contentHTML, options);
    if (mixerWindow?.element) {
        updateMixerWindow(); 
    }
    return mixerWindow;
}

export function updateMixerWindow() {
    // ... (same as response #58, ensure localAppServices calls are valid) ...
    if(!localAppServices.getWindowByIdState || !localAppServices.getTracksState) return;
    const mixerWindow = localAppServices.getWindowByIdState('mixer');
    if (!mixerWindow || !mixerWindow.element) return;

    const container = mixerWindow.element.querySelector('#mixer-strips-container');
    container.innerHTML = ''; 

    const tracks = localAppServices.getTracksState();
    tracks.forEach(track => {
        const strip = document.createElement('div');
        strip.className = 'mixer-strip flex flex-col items-center p-1.5 border border-slate-700 rounded bg-slate-750 w-20 text-xs flex-shrink-0';
        strip.innerHTML = `
            <div class="track-name truncate w-full text-center mb-1 text-slate-300 font-medium" title="${track.name}">${track.name}</div>
            <div class="pan-control mb-1 w-full">
                <input type="range" id="mixerPan-${track.id}" min="-1" max="1" step="0.01" value="${track.channel?.pan?.value !== undefined ? track.channel.pan.value : 0}" class="w-full h-1.5 accent-purple-500 bg-slate-600 rounded-lg appearance-none cursor-pointer" title="Pan">
            </div>
            <div class="volume-fader-container relative flex-grow w-6 bg-slate-600 rounded overflow-hidden my-1">
                <input type="range" id="mixerVolume-${track.id}" min="-60" max="6" step="0.1" value="${track.channel?.volume?.value !== undefined ? track.channel.volume.value : 0}" class="mixer-fader accent-blue-500 appearance-none bg-transparent w-20 h-2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[270deg]" title="Volume">
                <div class="meter-bar-container track-meter-container mixer-meter-container absolute bottom-1 left-0 right-0 mx-auto w-4/5 h-2 bg-slate-800 border border-slate-900 rounded-sm overflow-hidden">
                    <div id="mixerMeter-${track.id}" class="meter-bar h-full bg-green-500" style="width: 0%;"></div>
                </div>
            </div>
            <div class="buttons-row mt-1.5 flex space-x-1 w-full justify-around">
                <button class="mixer-mute-btn p-1 w-6 h-6 rounded ${track.isMuted ? 'bg-yellow-500 text-slate-900' : 'bg-slate-600 hover:bg-yellow-700'} " title="Mute">M</button>
                <button class="mixer-solo-btn p-1 w-6 h-6 rounded ${track.isSoloed ? 'bg-orange-500 text-slate-900' : 'bg-slate-600 hover:bg-orange-600'}" title="Solo">S</button>
                ${track.canBeArmed ? `<button class="mixer-arm-btn p-1 w-6 h-6 rounded ${track.isArmedForRec ? 'bg-red-500 text-white' : 'bg-slate-600 hover:bg-red-700'}" title="Arm">R</button>` : '<div class="w-6 h-6"></div>'}
            </div>`;
        container.appendChild(strip);

        strip.querySelector(`#mixerVolume-${track.id}`).addEventListener('input', (e) => { if(track.setVolumeDb) track.setVolumeDb(parseFloat(e.target.value)); });
        strip.querySelector(`#mixerPan-${track.id}`).addEventListener('input', (e) => { if(track.setPan) track.setPan(parseFloat(e.target.value)); });
        strip.querySelector('.mixer-mute-btn').addEventListener('click', () => { if(localAppServices.handleTrackMute) localAppServices.handleTrackMute(track.id); });
        strip.querySelector('.mixer-solo-btn').addEventListener('click', () => { if(localAppServices.handleTrackSolo) localAppServices.handleTrackSolo(track.id); });
        const armBtn = strip.querySelector('.mixer-arm-btn');
        if (armBtn) armBtn.addEventListener('click', () => { if(localAppServices.handleTrackArm) localAppServices.handleTrackArm(track.id); });
    });
}

function setupClipInteractions(tracksContainer) {
    // ... (same as response #58, ensure localAppServices and Tone calls are guarded) ...
    let dragInfo = null; 
    let resizeInfo = null; 

    const onDragStart = (event) => { /* ... */ };
    const onDrag = (event) => { /* ... */ };
    const onDragEnd = (event) => { /* ... */ };
    tracksContainer.addEventListener('mousedown', onDragStart); 

    const startResize = (event) => { /* ... */ };
    const onResize = (event) => { /* ... */ };
    const onResizeEnd = (event) => { /* ... */ };
    tracksContainer.addEventListener('mousedown', startResize);
}

export function updateSequencerCellUI(trackId, pitchOrPad, timeStep, isActive) {
    // ... (same as response #58, ensure localAppServices calls are valid) ...
    if (!localAppServices.getTrackById || !localAppServices.getWindowByIdState) return;
    const track = localAppServices.getTrackById(trackId);
    if (!track || !track.getActiveSequence) return;

    const sequencerWindow = localAppServices.getWindowByIdState(`sequencer-${trackId}`);
    if (!sequencerWindow || !sequencerWindow.element) return;

    const gridContainer = sequencerWindow.element.querySelector('.sequencer-grid-layout');
    if (!gridContainer) return;

    const rowLabels = track.type === 'Synth' || track.type === 'InstrumentSampler' ? Constants.synthPitches :
                      [...Array(track.type === 'Sampler' ? Constants.numSlices : Constants.numDrumSamplerPads).keys()].map(i => `${track.type === 'Sampler' ? 'Slice' : 'Pad'} ${i + 1}`);
    const rowIndex = rowLabels.indexOf(pitchOrPad);

    if (rowIndex === -1) return;
    
    const activeSequence = track.getActiveSequence();
    if (!activeSequence) return;
    const totalSteps = activeSequence.bars * Constants.STEPS_PER_BAR;
    const domCellIndex = (totalSteps + 1) + (rowIndex * (totalSteps + 1)) + 1 + timeStep;
    const cell = gridContainer.children[domCellIndex];

    if (cell && cell.classList.contains('sequencer-step-cell')) {
        const trackTypeClass = `active-${track.type.toLowerCase()}`;
        cell.classList.toggle(trackTypeClass, isActive);
        if(isActive){
            const noteData = activeSequence.steps.find(s => s.time === timeStep && s.pitchOrPad === pitchOrPad);
            if(noteData) cell.dataset.velocity = noteData.velocity;
        } else {
            delete cell.dataset.velocity;
        }
    }
}
