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

function getPixelsPerSecond() {
    return (Tone.Transport.bpm.value / 60) * Constants.STEPS_PER_BAR / 4 * 30;
}

function snapToTime(timeInSeconds) {
    const secondsPer16thNote = (60 / Tone.Transport.bpm.value) / 4;
    return Math.round(timeInSeconds / secondsPer16thNote) * secondsPer16thNote;
}

export function renderTimeline() {
    const timelineWindow = localAppServices.getWindowById?.('timeline');
    if (!timelineWindow?.element || timelineWindow.isMinimized) return;
    
    const tracksArea = timelineWindow.element.querySelector('#timeline-tracks-area');
    if (!tracksArea) return;
    
    tracksArea.innerHTML = '';
    const tracks = localAppServices.getTracks?.() || [];
    const pixelsPerSecond = getPixelsPerSecond();

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

        track.timelineClips?.forEach(clip => {
            const clipDiv = document.createElement('div');
            clipDiv.className = clip.type === 'audio' ? 'audio-clip' : 'midi-clip';
            clipDiv.textContent = clip.name;
            clipDiv.dataset.clipId = clip.id;
            
            clipDiv.style.left = `${clip.startTime * pixelsPerSecond}px`;
            clipDiv.style.width = `${clip.duration * pixelsPerSecond}px`;

            // *** NEW: Add waveform canvas for audio clips ***
            if (clip.type === 'audio' && clip.audioBuffer) {
                const canvas = document.createElement('canvas');
                canvas.className = 'w-full h-full absolute top-0 left-0';
                clipDiv.appendChild(canvas);
                // The actual drawing needs a small delay to ensure the canvas is in the DOM
                setTimeout(() => {
                    const canvasEl = clipsArea.querySelector(`[data-clip-id="${clip.id}"] canvas`);
                    if (canvasEl) {
                        canvasEl.width = canvasEl.offsetWidth;
                        canvasEl.height = canvasEl.offsetHeight;
                        localAppServices.drawWaveform(canvasEl, clip.audioBuffer);
                    }
                }, 0);
            }

            clipsArea.appendChild(clipDiv);
            attachClipEventListeners(clipDiv, track, clip);
        });

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
            
            const dropX = e.clientX - e.currentTarget.getBoundingClientRect().left - 120 + e.currentTarget.scrollLeft;
            const droppedTime = Math.max(0, dropX / pixelsPerSecond);
            const startTime = snapToTime(droppedTime);
            
            localAppServices.handleTimelineLaneDrop(e, track.id, startTime);
        });
        
        tracksArea.appendChild(trackLane);
    });
}

function attachClipEventListeners(clipDiv, track, clip) {
    clipDiv.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || e.target.classList.contains('resize-handle')) return;
        e.stopPropagation();

        const pixelsPerSecond = getPixelsPerSecond();
        const startMouseX = e.clientX;
        const startLeft = parseFloat(clipDiv.style.left) || 0;

        function onMouseMove(moveEvent) {
            const dx = moveEvent.clientX - startMouseX;
            clipDiv.style.left = `${startLeft + dx}px`;
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            const finalLeft = parseFloat(clipDiv.style.left) || 0;
            const newStartTime = snapToTime(finalLeft / pixelsPerSecond);
            
            if (clip.startTime !== newStartTime) {
                clip.startTime = newStartTime;
                localAppServices.captureStateForUndo?.(`Move clip ${clip.name}`);
            }
            renderTimeline();
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    // *** NEW FEATURE: Add resize handles and their logic ***
    const leftHandle = document.createElement('div');
    leftHandle.className = 'resize-handle left';
    clipDiv.appendChild(leftHandle);

    const rightHandle = document.createElement('div');
    rightHandle.className = 'resize-handle right';
    clipDiv.appendChild(rightHandle);

    rightHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const pixelsPerSecond = getPixelsPerSecond();
        const startMouseX = e.clientX;
        const startWidth = parseFloat(clipDiv.style.width) || 0;
        const startDuration = clip.duration;

        function onMouseMove(moveEvent) {
            const dx = moveEvent.clientX - startMouseX;
            clipDiv.style.width = `${Math.max(10, startWidth + dx)}px`;
        }
        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            const finalWidth = parseFloat(clipDiv.style.width);
            const newDuration = snapToTime(finalWidth / pixelsPerSecond);
            if (clip.duration !== newDuration) {
                clip.duration = newDuration;
                localAppServices.captureStateForUndo?.(`Resize clip ${clip.name}`);
            }
            renderTimeline();
        }
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
    
    // ... (context menu and dblclick listeners remain the same)
}

export function updatePlayheadPosition(transportTime) {
    // ... (this function remains the same)
}
