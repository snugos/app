// js/ui_modules/arrangementMixingUI.js (MODIFIED - Added and exported updateSequencerCellUI)
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
                track.updateActiveSequenceBars(newNumBars);
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
                    populateSequenceSelect(track, sequenceSelect); 
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
        option.textContent = seq.name || `Sequence ${seq.id.slice(-4)}`; // Shorten ID for display
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
                track.toggleStep(rowLabels[row], step, activeSequence.id);
                // updateSequencerCellUI(track.id, rowLabels[row], step, !!track.getActiveSequence().steps.some(s => s.time === step && s.pitchOrPad === rowLabels[row]));
                 // Directly update the class here after toggling state for immediate feedback
                const isNowActive = track.getActiveSequence().steps.some(s => s.time === step && s.pitchOrPad === rowLabels[row]);
                cell.classList.toggle(trackTypeClass, isNowActive);
                if (isNowActive) {
                    const updatedNoteData = track.getActiveSequence().steps.find(s => s.time === step && s.pitchOrPad === rowLabels[row]);
                    cell.dataset.velocity = updatedNoteData.velocity;
                } else {
                    delete cell.dataset.velocity;
                }
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
        renderTimeline(); 
        const tracksContainer = timelineWindow.element.querySelector('#timeline-tracks-container');
        const ruler = timelineWindow.element.querySelector('#timeline-ruler');
        tracksContainer.addEventListener('scroll', () => {
            ruler.style.transform = `translateX(-${tracksContainer.scrollLeft}px)`;
            updatePlayheadPosition(); 
        });
        setupTimelineDropHandling(tracksContainer);
        setupClipInteractions(tracksContainer);
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
        if (!tracksArea) return;

        const dropDataString = event.dataTransfer.getData('application/json');
        const files = event.dataTransfer.files;

        const pixelsPerSecond = parseFloat(tracksArea.dataset.pixelsPerSecond || 30); 
        const trackNameWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim()) || Constants.TIMELINE_TRACK_NAME_WIDTH || 120;
        
        const tracksAreaRect = tracksArea.getBoundingClientRect(); // Get rect relative to viewport
        // Mouse position relative to viewport, then add scroll offsets for tracksContainer
        const dropXInTracksContainer = event.clientX - tracksAreaRect.left + tracksContainer.scrollLeft;
        const dropYInTracksContainer = event.clientY - tracksAreaRect.top + tracksContainer.scrollTop;

        const dropXRelativeToGrid = dropXInTracksContainer - trackNameWidth;
        const startTime = Math.max(0, dropXRelativeToGrid / pixelsPerSecond);
        const snappedStartTime = snapTimeToGrid(startTime, Tone.Transport.bpm.value, pixelsPerSecond);


        const trackElements = Array.from(tracksArea.querySelectorAll('.timeline-track-lane'));
        let targetTrackId = null;
        for (const trackEl of trackElements) {
            // dropYInTracksContainer is already relative to the scrolled content of tracksContainer
            if (dropYInTracksContainer >= trackEl.offsetTop && dropYInTracksContainer < trackEl.offsetTop + trackEl.offsetHeight) {
                targetTrackId = trackEl.dataset.trackId;
                break;
            }
        }
        
        if (targetTrackId && localAppServices.handleTimelineLaneDrop) {
            // Pass the original event.dataTransfer if files are involved, or parsed data
            const dataToPass = dropDataString ? JSON.parse(dropDataString) : (files && files.length > 0 ? files : null);
            if(dataToPass) {
                localAppServices.handleTimelineLaneDrop(dataToPass, targetTrackId, snappedStartTime);
            } else {
                 showNotification("No valid data dropped.", "warning");
            }
        } else if (!targetTrackId) {
            showNotification("Could not determine target track for drop.", "warning");
        }
    });
}

export function renderTimeline() {
    const timelineWindow = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState('timeline') : null;
    if (!timelineWindow || !timelineWindow.element) return;

    const tracksArea = timelineWindow.element.querySelector('#timeline-tracks-area');
    const ruler = timelineWindow.element.querySelector('#timeline-ruler');
    if (!tracksArea || !ruler) return;

    tracksArea.innerHTML = ''; 
    ruler.innerHTML = '';    

    const tracks = localAppServices.getTracksState();
    const totalDurationSeconds = Constants.MAX_BARS * (60 / Tone.Transport.bpm.value) * 4; // Max duration based on max bars
    const pixelsPerSecond = parseFloat(tracksArea.dataset.pixelsPerSecond || 30); 
    tracksArea.style.width = `${totalDurationSeconds * pixelsPerSecond}px`;
    ruler.style.width = `${totalDurationSeconds * pixelsPerSecond}px`;

    for (let sec = 0; sec < totalDurationSeconds; sec++) {
        const bar = Math.floor(sec / ( (60/Tone.Transport.bpm.value) * 4 ) ) + 1; // Basic bar calculation
        const isBarStart = sec % ((60/Tone.Transport.bpm.value) * 4) < 1/(pixelsPerSecond * 0.5); // Tolerance for float

        const majorMark = document.createElement('div');
        majorMark.className = 'absolute top-0 h-full border-l border-slate-600';
        majorMark.style.left = `${sec * pixelsPerSecond}px`;
        if (isBarStart) { 
            majorMark.classList.add('border-slate-400', 'w-0.5'); // Stronger line for bars
            const label = document.createElement('span');
            label.className = 'absolute top-0.5 left-1 text-xxs text-slate-400';
            label.textContent = `${bar}`;
            majorMark.appendChild(label);
        } else if (sec % 5 === 0) { // Label every 5 seconds if not a bar start
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
            clipEl.style.width = `${clip.duration * pixelsPerSecond}px`;
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
    const timelineWindow = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState('timeline') : null;
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
    const sequencerWindow = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState(`sequencer-${trackId}`) : null;
    if (!sequencerWindow || !sequencerWindow.element) return;

    const gridContainer = sequencerWindow.element.querySelector('.sequencer-grid-layout');
    if (!gridContainer) return;

    gridContainer.querySelectorAll('.playing').forEach(cell => cell.classList.remove('playing', 'scale-110', 'z-10'));
    
    const track = localAppServices.getTrackById(trackId);
    if (!track) return;

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
        updateMixerWindow(); 
    }
    return mixerWindow;
}

export function updateMixerWindow() {
    const mixerWindow = localAppServices.getWindowByIdState ? localAppServices.getWindowByIdState('mixer') : null;
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
                <input type="range" id="mixerPan-${track.id}" min="-1" max="1" step="0.01" value="${track.channel.pan.value}" class="w-full h-1.5 accent-purple-500 bg-slate-600 rounded-lg appearance-none cursor-pointer" title="Pan">
            </div>
            <div class="volume-fader-container relative flex-grow w-6 bg-slate-600 rounded overflow-hidden my-1">
                <input type="range" id="mixerVolume-${track.id}" min="-60" max="6" step="0.1" value="${track.channel.volume.value}" class="mixer-fader accent-blue-500 appearance-none bg-transparent w-20 h-2 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[270deg]" title="Volume">
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

        strip.querySelector(`#mixerVolume-${track.id}`).addEventListener('input', (e) => track.setVolumeDb(parseFloat(e.target.value)));
        strip.querySelector(`#mixerPan-${track.id}`).addEventListener('input', (e) => track.setPan(parseFloat(e.target.value)));
        strip.querySelector('.mixer-mute-btn').addEventListener('click', () => localAppServices.handleTrackMute(track.id));
        strip.querySelector('.mixer-solo-btn').addEventListener('click', () => localAppServices.handleTrackSolo(track.id));
        const armBtn = strip.querySelector('.mixer-arm-btn');
        if (armBtn) armBtn.addEventListener('click', () => localAppServices.handleTrackArm(track.id));
    });
}

function setupClipInteractions(tracksContainer) {
    let dragInfo = null; 
    let resizeInfo = null; 

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
        const trackNameWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim()) || Constants.TIMELINE_TRACK_NAME_WIDTH || 120;

        dragInfo = {
            clipEl, clip, track,
            offsetX: event.clientX - clipEl.getBoundingClientRect().left,
            originalStartTime: clip.startTime,
            trackLaneEl: clipEl.parentElement, 
            pixelsPerSecond,
            trackNameWidth,
            scrollLeft: tracksContainer.scrollLeft,
        };
        clipEl.classList.add('dragging', 'z-50');
        clipEl.style.pointerEvents = 'none'; 
        document.addEventListener('mousemove', onDrag);
        document.addEventListener('mouseup', onDragEnd);
    };

    const onDrag = (event) => {
        if (!dragInfo) return;
        event.preventDefault();
        
        const newX = event.clientX - dragInfo.trackLaneEl.getBoundingClientRect().left - dragInfo.offsetX + tracksContainer.scrollLeft - dragInfo.trackNameWidth;
        let newStartTime = Math.max(0, newX / dragInfo.pixelsPerSecond);
        newStartTime = snapTimeToGrid(newStartTime, Tone.Transport.bpm.value, dragInfo.pixelsPerSecond);
        
        dragInfo.clipEl.style.left = `${newStartTime * dragInfo.pixelsPerSecond}px`;
    };

    const onDragEnd = (event) => {
        if (!dragInfo) return;
        event.preventDefault();
        
        dragInfo.clipEl.classList.remove('dragging', 'z-50');
        dragInfo.clipEl.style.pointerEvents = '';

        const finalNewStartTime = parseFloat(dragInfo.clipEl.style.left) / dragInfo.pixelsPerSecond;
        
        if (Math.abs(finalNewStartTime - dragInfo.originalStartTime) > 0.001) { 
            dragInfo.track.updateAudioClipPosition(dragInfo.clip.id, finalNewStartTime); 
        }
        
        dragInfo = null;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('mouseup', onDragEnd);
    };
    tracksContainer.addEventListener('mousedown', onDragStart); 

    const startResize = (event) => {
        const target = event.target;
        const clipEl = target.closest('.audio-clip, .sequence-clip');
        if (!clipEl || event.button !== 0) return;

        const rect = clipEl.getBoundingClientRect();
        const isRightEdge = Math.abs(event.clientX - rect.right) < 10; 
        const isLeftEdge = Math.abs(event.clientX - rect.left) < 10;

        if (!isRightEdge && !isLeftEdge) return; 
        event.preventDefault();
        event.stopPropagation(); 

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
            originalWidthPixels: clipEl.offsetWidth,
            originalLeftPixels: clipEl.offsetLeft,
            originalStartTime: clip.startTime,
            originalDuration: clip.duration,
            initialMouseX: event.clientX,
            pixelsPerSecond
        };
        document.body.style.cursor = 'ew-resize';
        document.addEventListener('mousemove', onResize);
        document.addEventListener('mouseup', onResizeEnd);
    };

    const onResize = (event) => {
        if (!resizeInfo) return;
        event.preventDefault();
        const dx = event.clientX - resizeInfo.initialMouseX;
        
        let newLeftPixels = resizeInfo.originalLeftPixels;
        let newWidthPixels = resizeInfo.originalWidthPixels;

        if (resizeInfo.isLeftHandle) {
            newLeftPixels = resizeInfo.originalLeftPixels + dx;
            newWidthPixels = resizeInfo.originalWidthPixels - dx;
        } else { // Right handle
            newWidthPixels = resizeInfo.originalWidthPixels + dx;
        }
        
        // Convert to time, snap, then convert back to pixels
        let newStartTime = newLeftPixels / resizeInfo.pixelsPerSecond;
        let newDuration = newWidthPixels / resizeInfo.pixelsPerSecond;

        newStartTime = snapTimeToGrid(newStartTime, Tone.Transport.bpm.value, resizeInfo.pixelsPerSecond);
        // If left handle, adjust duration based on snapped start time
        if (resizeInfo.isLeftHandle) {
            newDuration = (resizeInfo.originalStartTime + resizeInfo.originalDuration) - newStartTime;
        }
        newDuration = snapTimeToGrid(newDuration, Tone.Transport.bpm.value, resizeInfo.pixelsPerSecond, true);
        
        if (newDuration < (0.5 / resizeInfo.pixelsPerSecond) ) { // Prevent tiny clips (e.g., less than 0.5 pixel width)
            newDuration = 0.5 / resizeInfo.pixelsPerSecond;
        }
        if (resizeInfo.isLeftHandle && (newStartTime + newDuration > resizeInfo.originalStartTime + resizeInfo.originalDuration + 0.001)) { // Prevent left handle from crossing right edge
            newStartTime = (resizeInfo.originalStartTime + resizeInfo.originalDuration) - newDuration;
        }


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
             resizeInfo.track.updateClipProperties(resizeInfo.clip.id, { 
                startTime: resizeInfo.newStartTime,
                duration: resizeInfo.newDuration
            });
        }
        resizeInfo = null;
        document.removeEventListener('mousemove', onResize);
        document.removeEventListener('mouseup', onResizeEnd);
    };
    tracksContainer.addEventListener('mousedown', startResize);
}

/**
 * ADDED: Function to update a single sequencer cell's UI.
 */
export function updateSequencerCellUI(trackId, pitchOrPad, timeStep, isActive) {
    const track = localAppServices.getTrackById(trackId);
    if (!track) return;

    const sequencerWindow = localAppServices.getWindowByIdState(`sequencer-${trackId}`);
    if (!sequencerWindow || !sequencerWindow.element) return;

    const gridContainer = sequencerWindow.element.querySelector('.sequencer-grid-layout');
    if (!gridContainer) return;

    const rowLabels = track.type === 'Synth' || track.type === 'InstrumentSampler' ? Constants.synthPitches :
                      [...Array(track.type === 'Sampler' ? Constants.numSlices : Constants.numDrumSamplerPads).keys()].map(i => `${track.type === 'Sampler' ? 'Slice' : 'Pad'} ${i + 1}`);
    const rowIndex = rowLabels.indexOf(pitchOrPad);

    if (rowIndex === -1) {
        return;
    }
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
