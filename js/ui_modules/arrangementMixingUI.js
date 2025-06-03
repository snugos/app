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

    let html = `<div class="sequencer-container p-1 text-xs overflow-auto h-full bg-gray-800 dark:bg-slate-900 text-slate-300 dark:text-slate-300 rounded-b-md">\
        <div class="controls mb-1 flex justify-between items-center sticky top-0 left-0 bg-gray-700 dark:bg-slate-800 p-1.5 z-10">\
            <div class="flex items-center space-x-2">\
                <label for="seq-active-pattern-${track.id}">Pattern:</label>\
                <select id="seq-active-pattern-${track.id}" class="bg-slate-600 text-white border-slate-500 rounded-md text-xs px-2 py-1">\
                    \
                </select>\
                <button id="seq-add-pattern-${track.id}" class="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded-md text-xs">New</button>\
            </div>\
            <div class="flex items-center space-x-2">\
                <label for="seq-bars-${track.id}">Bars:</label>\
                <input type="number" id="seq-bars-${track.id}" min="1" max="${Constants.MAX_BARS}" value="${numBars}" class="bg-slate-600 text-white border-slate-500 rounded-md w-16 text-xs px-2 py-1">\
            </div>\
        </div>\
        <div class="sequencer-grid-wrapper relative" style="min-width: ${totalSteps * 20}px;">\
            <div class="sequencer-grid grid" style="grid-template-columns: repeat(${totalSteps}, 1fr); grid-template-rows: repeat(${rows}, 1fr);">`;

    for (let row = 0; row < rows; row++) {
        for (let step = 0; step < totalSteps; step++) {
            const bar = Math.floor(step / stepsPerBar);
            const isBeat = step % (stepsPerBar / 4) === 0;
            const beatInBar = step % stepsPerBar;
            const isBarStart = step % stepsPerBar === 0;
            let bgClass = 'bg-slate-700/50 hover:bg-slate-600/70';
            if (isBarStart) bgClass = 'bg-slate-600/60 hover:bg-slate-500/80 border-l-2 border-slate-500/50';
            else if (isBeat) bgClass = 'bg-slate-600/40 hover:bg-slate-500/60';
            
            const noteData = track.getNoteAt(track.activeSequenceId, rowLabels[row], step);
            const activeClass = noteData ? 'bg-blue-500' : '';

            html += `<div class="step ${bgClass} ${activeClass}" data-step="${step}" data-note="${rowLabels[row]}" style="grid-row: ${row + 1}; grid-column: ${step + 1};"></div>`;
        }
    }

    html += `</div><div id="sequencer-playhead-${track.id}" class="sequencer-playhead absolute top-0 bg-red-500/70" style="width: 2px; height: 100%; left: 0; display: none;"></div></div></div>`;
    return html;
}
export function openSequencerWindow(trackId, savedState = null) { /* ... same as response #29 ... */ }
export function updateSequencerView(track) { /* ... same as response #29 ... */ }
export function setupSequencerEventListeners(track, container) { /* ... same as response #29 ... */ }

// --- Arrangement/Timeline Window ---
export function openArrangementWindow(savedState = null) {
    const windowId = 'timeline';
    if (localAppServices.getWindowById(windowId)) {
        const win = localAppServices.getWindowById(windowId);
        win.focus();
        return;
    }

    const content = `
        <div class="h-full flex flex-col bg-slate-900 text-sm timeline-container">
            <div id="timeline-ruler-container" class="relative h-8 bg-slate-800 border-b border-slate-700 z-10">
                <div id="timeline-ruler" class="absolute top-0 left-0 w-full h-full"></div>
                <div id="timeline-playhead" class="absolute top-0 w-0.5 bg-red-500 h-full z-20 pointer-events-none"></div>
            </div>
            <div class="flex-grow flex overflow-hidden">
                <div id="timeline-track-headers" class="w-[var(--timeline-track-name-width)] bg-slate-800 border-r border-slate-700 overflow-y-scroll">
                    </div>
                <div id="timeline-tracks-container" class="flex-grow overflow-auto">
                    </div>
            </div>
        </div>
    `;

    const timelineWindow = new SnugWindow(windowId, 'Arrangement', content, {
        width: 1000,
        height: 400,
        x: 40,
        y: 40,
        isMaximized: true
    }, localAppServices);

    if (timelineWindow.element) {
        const tracksContainer = timelineWindow.element.querySelector('#timeline-tracks-container');
        const trackHeadersContainer = timelineWindow.element.querySelector('#timeline-track-headers');

        const syncScroll = (e) => {
            trackHeadersContainer.scrollTop = tracksContainer.scrollTop;
            scrollSyncHandler();
        };
        
        const scrollSyncHandler = () => {
            const ruler = timelineWindow.element.querySelector('#timeline-ruler');
            const playhead = timelineWindow.element.querySelector('#timeline-playhead');
            const trackNameWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim()) || 120;

            if (ruler && tracksContainer) {
                ruler.style.paddingLeft = `${trackNameWidth}px`;
                ruler.style.transform = `translateX(-${tracksContainer.scrollLeft + trackNameWidth}px)`;
            }

            if (playhead) {
                 const pixelsPerSecondConst = 30;
                 const rawNewPosition = Tone.Transport.seconds * pixelsPerSecondConst;
                 playhead.style.left = `${trackNameWidth + rawNewPosition - tracksContainer.scrollLeft}px`;
            }
        };

        if (tracksContainer) {
            tracksContainer.addEventListener('scroll', syncScroll);
        }

        renderTimeline();
        setupTimelineInteraction(timelineWindow.element);
        setTimeout(scrollSyncHandler, 0);
    }
    return timelineWindow;
}
function renderTimeline() {
    const tracks = localAppServices.getTracksState ? localAppServices.getTracksState() : [];
    const headersContainer = document.getElementById('timeline-track-headers');
    const lanesContainer = document.getElementById('timeline-tracks-container');
    const rulerContainer = document.getElementById('timeline-ruler');
    
    if (!headersContainer || !lanesContainer || !rulerContainer) return;

    headersContainer.innerHTML = '';
    lanesContainer.innerHTML = '';
    rulerContainer.innerHTML = '';

    // Render Ruler
    const pixelsPerSecond = 30;
    const totalDurationSeconds = 300; // e.g., 5 minutes
    rulerContainer.style.width = `${totalDurationSeconds * pixelsPerSecond}px`;
    for (let i = 0; i < totalDurationSeconds; i++) {
        const mark = document.createElement('div');
        mark.className = 'absolute top-0 h-full border-l border-slate-600';
        mark.style.left = `${i * pixelsPerSecond}px`;
        if (i % 5 === 0) { // Every 5 seconds
            mark.style.height = '100%';
            mark.innerHTML = `<span class="absolute top-0 left-1 text-xs text-slate-400">${i}s</span>`;
        } else {
            mark.style.height = '50%';
        }
        rulerContainer.appendChild(mark);
    }

    // Render Tracks
    tracks.forEach(track => {
        // Render Header
        const header = document.createElement('div');
        header.className = 'track-header h-24 p-2 border-b border-slate-700 flex flex-col justify-between';
        header.innerHTML = `
            <div>
                <p class="font-bold text-sm truncate">${track.name}</p>
                <p class="text-xs text-slate-400">${track.type}</p>
            </div>
            <div class="flex space-x-1">
                <button data-action="inspector" title="Open Inspector" class="flex-1 text-xs py-1 bg-slate-700 hover:bg-slate-600 rounded">Insp</button>
                <button data-action="effects" title="Open Effects Rack" class="flex-1 text-xs py-1 bg-slate-700 hover:bg-slate-600 rounded">FX</button>
                ${track.type !== 'Audio' ? `<button data-action="sequencer" title="Open Sequencer" class="flex-1 text-xs py-1 bg-slate-700 hover:bg-slate-600 rounded">Seq</button>` : ''}
            </div>
        `;
        header.querySelector('[data-action="inspector"]').addEventListener('click', () => handleOpenTrackInspector(track.id));
        header.querySelector('[data-action="effects"]').addEventListener('click', () => handleOpenEffectsRack(track.id));
        if (track.type !== 'Audio') {
            header.querySelector('[data-action="sequencer"]').addEventListener('click', () => handleOpenSequencer(track.id));
        }
        headersContainer.appendChild(header);

        // Render Lane
        const lane = document.createElement('div');
        lane.className = 'track-lane h-24 border-b border-slate-700 relative bg-slate-800/50';
        lane.dataset.trackId = track.id;
        
        // Render Clips
        track.clips.forEach(clip => {
            const clipEl = document.createElement('div');
            clipEl.className = `absolute top-2 h-20 p-2 rounded-md shadow-lg overflow-hidden ${clip.type === 'audio' ? 'bg-orange-600' : 'bg-indigo-600'} audio-clip`;
            clipEl.style.left = `${clip.startTime * pixelsPerSecond}px`;
            clipEl.style.width = `${clip.duration * pixelsPerSecond}px`;
            clipEl.dataset.clipId = clip.id;
            clipEl.dataset.trackId = track.id;

            clipEl.innerHTML = `
                <div class="clip-name text-xs font-semibold truncate">${clip.name}</div>
                <div class="resize-handle resize-handle-left"></div>
                <div class="resize-handle resize-handle-right"></div>
            `;
            
            lane.appendChild(clipEl);
        });
        
        lanesContainer.appendChild(lane);
    });
}

function setupTimelineInteraction(timelineElement) {
    const rulerContainer = timelineElement.querySelector('#timeline-ruler-container');
    const tracksContainer = timelineElement.querySelector('#timeline-tracks-container');
    const playhead = timelineElement.querySelector('#timeline-playhead');
    const pixelsPerSecond = 30;
    const trackNameWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim()) || 120;

    // --- Playhead Dragging ---
    const startPlayheadDrag = (e) => {
        e.preventDefault();
        const timelineRect = rulerContainer.getBoundingClientRect();

        const updatePlayheadPosition = (moveEvent) => {
            const mouseX = moveEvent.clientX - timelineRect.left - trackNameWidth + tracksContainer.scrollLeft;
            const time = Math.max(0, mouseX / pixelsPerSecond);
            Tone.Transport.seconds = time;
            
            const rawNewPosition = time * pixelsPerSecond;
            playhead.style.left = `${trackNameWidth + rawNewPosition - tracksContainer.scrollLeft}px`;
        };

        updatePlayheadPosition(e);

        const onMouseMove = (moveEvent) => {
            updatePlayheadPosition(moveEvent);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
    rulerContainer.addEventListener('mousedown', startPlayheadDrag);

    // --- Clip Selection and Deletion ---
    tracksContainer.addEventListener('click', (e) => {
        const clickedClip = e.target.closest('.audio-clip');

        // Deselect all clips first
        tracksContainer.querySelectorAll('.audio-clip.selected').forEach(c => c.classList.remove('selected'));
        if (localAppServices.setSelectedTimelineClip) localAppServices.setSelectedTimelineClip(null, null);

        if (clickedClip) {
            clickedClip.classList.add('selected');
            if (localAppServices.setSelectedTimelineClip) {
                localAppServices.setSelectedTimelineClip(clickedClip.dataset.trackId, clickedClip.dataset.clipId);
            }
        }
    });

    // --- Clip Resizing ---
    let resizeInfo = null;

    const startResize = (e) => {
        if (!e.target.matches('.resize-handle')) return;
        e.preventDefault();
        e.stopPropagation();

        const handle = e.target;
        const clipEl = handle.closest('.audio-clip');
        const clipId = clipEl.dataset.clipId;
        const trackId = clipEl.dataset.trackId;
        const track = localAppServices.getTrackByIdState(trackId);
        const clip = track.clips.find(c => c.id === clipId);

        resizeInfo = {
            clipEl,
            clip,
            track,
            handle,
            isLeftHandle: handle.classList.contains('resize-handle-left'),
            startX: e.clientX,
            originalLeft: clipEl.offsetLeft,
            originalWidth: clipEl.offsetWidth,
            originalStartTime: clip.startTime,
            originalDuration: clip.duration
        };

        document.addEventListener('mousemove', onResize);
        document.addEventListener('mouseup', onResizeEnd);
    };
    
    const onResize = (e) => {
        if (!resizeInfo) return;
        const dx = e.clientX - resizeInfo.startX;
        const dTime = dx / pixelsPerSecond;
        
        let newStartTime = resizeInfo.originalStartTime;
        let newDuration = resizeInfo.originalDuration;

        if (resizeInfo.isLeftHandle) {
            newStartTime = Math.max(0, resizeInfo.originalStartTime + dTime);
            newDuration = resizeInfo.originalDuration - (newStartTime - resizeInfo.originalStartTime);
        } else {
            newDuration = Math.max(0.1, resizeInfo.originalDuration + dTime);
        }

        if (newDuration < 0.1) return; // Minimum clip size

        // Update UI temporarily
        resizeInfo.clipEl.style.left = `${newStartTime * pixelsPerSecond}px`;
        resizeInfo.clipEl.style.width = `${newDuration * pixelsPerSecond}px`;

        // Store temp values for final update
        resizeInfo.newStartTime = newStartTime;
        resizeInfo.newDuration = newDuration;
    };

    const onResizeEnd = () => {
        if (!resizeInfo) return;
        
        // Finalize the changes
        if (resizeInfo.newStartTime !== undefined && resizeInfo.newDuration !== undefined) {
             resizeInfo.track.updateClipProperties(resizeInfo.clip.id, {
                startTime: resizeInfo.newStartTime,
                duration: resizeInfo.newDuration
            });
        }

        document.removeEventListener('mousemove', onResize);
        document.removeEventListener('mouseup', onResizeEnd);
        resizeInfo = null;
        // No full re-render needed, just let the state update
    };

    tracksContainer.addEventListener('mousedown', startResize);
}
