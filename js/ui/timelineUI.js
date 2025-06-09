// js/ui/timelineUI.js - Timeline UI Management
import { SnugWindow } from '../SnugWindow.js';
import { showNotification, createContextMenu } from '../utils.js';
import * as Constants from '../constants.js';

let localAppServices = {};

export function initializeTimelineUI(appServicesFromMain) {
    localAppServices = appServicesFromMain;
}

export function openTimelineWindow(savedState = null) {
    const windowId = 'timeline';
    const getOpenWindows = localAppServices.getOpenWindows || (() => new Map());
    const openWindows = getOpenWindows();

    if (openWindows.has(windowId) && !savedState) {
        const winInstance = openWindows.get(windowId);
        if (winInstance && typeof winInstance.restore === 'function') {
            winInstance.restore();
        }
        return winInstance;
    }

    const contentHTML = `
        <div id="timeline-container" class="h-full w-full overflow-hidden relative flex flex-col bg-white dark:bg-black">
            <div id="timeline-header" class="h-5 bg-white dark:bg-black border-b border-black dark:border-white relative overflow-hidden flex-shrink-0">
                <div id="timeline-ruler" class="absolute top-0 left-0 h-full" style="width: 4000px;"></div>
            </div>
            <div id="timeline-tracks-and-playhead-container" class="flex-grow relative overflow-auto">
                <div id="timeline-playhead" class="absolute top-0 w-0.5 h-full bg-red-500 z-20 pointer-events-none" style="left: 120px;"></div>
                <div id="timeline-tracks-area" class="relative h-full"></div>
            </div>
        </div>
    `;

    const timelineWindow = localAppServices.createWindow(windowId, 'Timeline', contentHTML, {
        width: 800, height: 250, minWidth: 400, minHeight: 150,
        ...savedState
    });
    
    if (timelineWindow?.element) {
        renderTimeline();
    }
}

export function renderTimeline() {
    const timelineWindow = localAppServices.getWindowById?.('timeline');
    if (!timelineWindow?.element || timelineWindow.isMinimized) return;
    
    const tracksArea = timelineWindow.element.querySelector('#timeline-tracks-area');
    if (!tracksArea) return;
    
    tracksArea.innerHTML = '';
    const tracks = localAppServices.getTracks?.() || [];

    tracks.forEach(track => {
        const trackLane = document.createElement('div');
        trackLane.className = 'timeline-track-lane';
        trackLane.dataset.trackId = track.id;
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'timeline-track-lane-name';
        nameDiv.textContent = track.name;
        trackLane.appendChild(nameDiv);

        const clipsArea = document.createElement('div');
        clipsArea.className = 'timeline-clips-area';
        trackLane.appendChild(clipsArea);

        // *** NEW FEATURE: Render Clips ***
        track.timelineClips?.forEach(clip => {
            const clipDiv = document.createElement('div');
            clipDiv.className = `midi-clip`; // Add classes for audio-clip later
            clipDiv.textContent = clip.name;
            clipDiv.dataset.clipId = clip.id;
            
            const pixelsPerSecond = (Tone.Transport.bpm.value / 60) * 4 * 30;
            clipDiv.style.left = `${clip.startTime * pixelsPerSecond}px`;
            clipDiv.style.width = `${clip.duration * pixelsPerSecond}px`;

            clipsArea.appendChild(clipDiv);
            
            // *** NEW FEATURE: Move Clips ***
            attachClipDragListeners(clipDiv, track, clip);
        });

        // *** NEW FEATURE: Handle Drag and Drop to Create Clips ***
        trackLane.addEventListener('dragover', (e) => {
            e.preventDefault();
            trackLane.classList.add('dragover-timeline-lane');
        });
        trackLane.addEventListener('dragleave', (e) => {
            trackLane.classList.remove('dragover-timeline-lane');
        });
        trackLane.addEventListener('drop', (e) => {
            e.preventDefault();
            trackLane.classList.remove('dragover-timeline-lane');
            handleTimelineDrop(e, track.id);
        });
        
        tracksArea.appendChild(trackLane);
    });
}

function handleTimelineDrop(event, targetTrackId) {
    const targetTrack = localAppServices.getTrackById?.(targetTrackId);
    if (!targetTrack) return;

    const dragData = event.dataTransfer.getData('application/json');
    if (!dragData) return;

    const { type, sourceTrackId, sequenceId } = JSON.parse(dragData);

    if (type === 'piano-roll-sequence') {
        const sourceTrack = localAppServices.getTrackById?.(sourceTrackId);
        const sequence = sourceTrack?.sequences.find(s => s.id === sequenceId);
        if (sequence) {
            const pixelsPerSecond = (Tone.Transport.bpm.value / 60) * 4 * 30;
            const dropTimeInSeconds = (event.clientX - event.currentTarget.getBoundingClientRect().left - 120 + event.currentTarget.scrollLeft) / pixelsPerSecond;
            
            targetTrack.addMidiClip(sequence, dropTimeInSeconds);
        }
    }
}

function attachClipDragListeners(clipDiv, track, clip) {
    clipDiv.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();

        const pixelsPerSecond = (Tone.Transport.bpm.value / 60) * 4 * 30;
        const startMouseX = e.clientX;
        const startLeft = parseFloat(clipDiv.style.left) || 0;

        function onMouseMove(moveEvent) {
            const dx = moveEvent.clientX - startMouseX;
            clipDiv.style.left = `${startLeft + dx}px`;
        }

        function onMouseUp(upEvent) {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            const finalLeft = parseFloat(clipDiv.style.left) || 0;
            const newStartTime = Math.max(0, finalLeft / pixelsPerSecond);
            
            // Update the actual clip data
            clip.startTime = newStartTime;

            // Re-render to snap to grid and persist state
            renderTimeline();
            localAppServices.captureStateForUndo?.(`Move clip ${clip.name}`);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
}

export function updatePlayheadPosition(transportTime) {
    const timelineWindow = localAppServices.getWindowById?.('timeline');
    if (!timelineWindow?.element || timelineWindow.isMinimized) return;

    const playhead = timelineWindow.element.querySelector('#timeline-playhead');
    if (!playhead) return;
    
    const pixelsPerSecond = (Tone.Transport.bpm.value / 60) * 4 * 30;
    const playheadAbsoluteLeft = (transportTime * pixelsPerSecond);
    playhead.style.transform = `translateX(${playheadAbsoluteLeft}px)`;
}
