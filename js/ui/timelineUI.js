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
                <div id="timeline-playhead" class="absolute top-0 w-0.5 h-full bg-red-500 z-20 pointer-events:none" style="left: 120px;"></div>
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
    return timelineWindow; // Ensure window is returned
}

function getPixelsPerSecond() {
    return (Tone.Transport.bpm.value / 60) * Constants.STEPS_PER_BAR / 4 * 30; //
}

function snapToTime(timeInSeconds) {
    const secondsPer16thNote = (60 / Tone.Transport.bpm.value) / 4; //
    return Math.round(timeInSeconds / secondsPer16thNote) * secondsPer16thNote; //
}

export function renderTimeline() {
    console.log("[timelineUI.js] renderTimeline called."); // Debug log
    const timelineWindow = localAppServices.getWindowById?.('timeline'); //
    if (!timelineWindow?.element || timelineWindow.isMinimized) { //
        console.log("[timelineUI.js] Timeline window not found or minimized, skipping render."); // Debug log
        return;
    }
    
    const tracksArea = timelineWindow.element.querySelector('#timeline-tracks-area'); //
    if (!tracksArea) { //
        console.error("[timelineUI.js] #timeline-tracks-area not found."); // Debug log
        return;
    }
    
    tracksArea.innerHTML = ''; //
    const tracks = localAppServices.getTracks?.() || []; //
    console.log(`[timelineUI.js] Found ${tracks.length} tracks to render.`); // Debug log
    const pixelsPerSecond = getPixelsPerSecond(); //

    tracks.forEach(track => {
        console.log(`[timelineUI.js] Rendering track: ${track.name} (ID: ${track.id})`); // Debug log
        const trackLane = document.createElement('div'); //
        trackLane.className = 'timeline-track-lane'; //
        trackLane.dataset.trackId = track.id; //
        
        const nameDiv = document.createElement('div'); //
        nameDiv.className = 'timeline-track-lane-name'; //
        nameDiv.textContent = track.name; //
        trackLane.appendChild(nameDiv); //

        const clipsArea = document.createElement('div'); //
        clipsArea.className = 'timeline-clips-area'; //
        trackLane.appendChild(clipsArea); //

        // Ensure timelineClips is an array, even if empty
        const clipsToRender = Array.isArray(track.timelineClips) ? track.timelineClips : [];

        clipsToRender.forEach(clip => {
            console.log(`[timelineUI.js] Rendering clip: ${clip.name} (ID: ${clip.id}) for track ${track.id}`); // Debug log
            const clipDiv = document.createElement('div'); //
            clipDiv.className = clip.type === 'audio' ? 'audio-clip' : 'midi-clip'; //
            clipDiv.textContent = clip.name; //
            clipDiv.dataset.clipId = clip.id; //
            
            clipDiv.style.left = `${clip.startTime * pixelsPerSecond}px`; //
            clipDiv.style.width = `${clip.duration * pixelsPerSecond}px`; //

            // *** NEW: Add waveform canvas for audio clips ***
            if (clip.type === 'audio' && clip.audioBuffer) { //
                const canvas = document.createElement('canvas'); //
                canvas.className = 'w-full h-full absolute top-0 left-0'; //
                clipDiv.appendChild(canvas); //
                // The actual drawing needs a small delay to ensure the canvas is in the DOM
                setTimeout(() => {
                    const canvasEl = clipsArea.querySelector(`[data-clip-id="${clip.id}"] canvas`); //
                    if (canvasEl) { //
                        canvasEl.width = canvasEl.offsetWidth; //
                        canvasEl.height = canvasEl.offsetHeight; //
                        localAppServices.drawWaveform(canvasEl, clip.audioBuffer); //
                    }
                }, 0);
            }

            clipsArea.appendChild(clipDiv); //
            attachClipEventListeners(clipDiv, track, clip); //
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
        
        tracksArea.appendChild(trackLane); //
    });
}

function attachClipEventListeners(clipDiv, track, clip) {
    clipDiv.addEventListener('mousedown', (e) => {
        // Only drag if left mouse button and not on a resize handle
        if (e.button !== 0 || e.target.classList.contains('resize-handle')) return;
        e.stopPropagation(); // Prevents dragging the window

        const pixelsPerSecond = getPixelsPerSecond(); //
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
            const newStartTime = snapToTime(finalLeft / pixelsPerSecond); //
            
            if (clip.startTime !== newStartTime) {
                clip.startTime = newStartTime;
                localAppServices.captureStateForUndo?.(`Move clip ${clip.name}`); //
            }
            renderTimeline(); //
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    // *** NEW FEATURE: Add resize handles and their logic ***
    const leftHandle = document.createElement('div'); //
    leftHandle.className = 'resize-handle left'; //
    clipDiv.appendChild(leftHandle); //

    const rightHandle = document.createElement('div'); //
    rightHandle.className = 'resize-handle right'; //
    clipDiv.appendChild(rightHandle); //

    rightHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation(); //
        const pixelsPerSecond = getPixelsPerSecond(); //
        const startMouseX = e.clientX;
        const startWidth = parseFloat(clipDiv.style.width) || 0;
        const startDuration = clip.duration; // Store original duration

        function onMouseMove(moveEvent) {
            const dx = moveEvent.clientX - startMouseX;
            // Ensure minimum width to avoid negative duration
            clipDiv.style.width = `${Math.max(10, startWidth + dx)}px`; //
        }
        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove); //
            document.removeEventListener('mouseup', onMouseUp); //
            const finalWidth = parseFloat(clipDiv.style.width); //
            const newDuration = snapToTime(finalWidth / pixelsPerSecond); //
            if (clip.duration !== newDuration) {
                clip.duration = newDuration; //
                localAppServices.captureStateForUndo?.(`Resize clip ${clip.name}`); //
            }
            renderTimeline(); //
        }
        document.addEventListener('mousemove', onMouseMove); //
        document.addEventListener('mouseup', onMouseUp); //
    });

    leftHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        const pixelsPerSecond = getPixelsPerSecond();
        const startMouseX = e.clientX;
        const startLeft = parseFloat(clipDiv.style.left) || 0;
        const startWidth = parseFloat(clipDiv.style.width) || 0;
        const originalClipStartTime = clip.startTime;
        const originalClipDuration = clip.duration;

        function onMouseMove(moveEvent) {
            const dx = moveEvent.clientX - startMouseX;
            const newLeft = startLeft + dx;
            const newWidth = startWidth - dx;

            // Prevent negative width or moving past the right edge
            if (newWidth > 10 && (newLeft / pixelsPerSecond) < (originalClipStartTime + originalClipDuration)) {
                clipDiv.style.left = `${newLeft}px`;
                clipDiv.style.width = `${newWidth}px`;
            }
        }

        function onMouseUp() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            const finalLeft = parseFloat(clipDiv.style.left) || 0;
            const finalWidth = parseFloat(clipDiv.style.width) || 0;

            const newStartTime = snapToTime(finalLeft / pixelsPerSecond);
            const newDuration = snapToTime(finalWidth / pixelsPerSecond);

            if (clip.startTime !== newStartTime || clip.duration !== newDuration) {
                clip.startTime = newStartTime;
                clip.duration = newDuration;
                localAppServices.captureStateForUndo?.(`Resize/Move clip ${clip.name}`);
            }
            renderTimeline();
        }
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    // Right-click context menu for clips
    clipDiv.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent document context menu from opening

        localAppServices.setSelectedTimelineClipInfo?.({
            clipId: clip.id,
            trackId: track.id,
            originalLeft: parseFloat(clipDiv.style.left) || 0,
            originalStart: clip.startTime,
            pixelsPerSecond: pixelsPerSecond,
        });

        const menuItems = [
            { label: 'Edit MIDI Clip', action: () => {
                if (clip.type === 'midi') {
                    localAppServices.openPianoRollForClip?.(track.id, clip.id);
                } else {
                    showNotification("Only MIDI clips can be edited in the Piano Roll.", 2000);
                }
            }, disabled: clip.type !== 'midi' },
            { label: 'Duplicate Clip', action: () => {
                // To implement: duplicate logic
                showNotification("Duplicate clip not yet implemented.", 1500);
            }, disabled: true },
            { label: 'Delete Clip', action: () => {
                track.clips.deleteClip(clip.id);
                localAppServices.renderTimeline();
            } },
            { separator: true },
            { label: 'Copy Clip', action: () => {
                // To implement: copy logic
                showNotification("Copy clip not yet implemented.", 1500);
            }, disabled: true },
            { label: 'Cut Clip', action: () => {
                // To implement: cut logic
                showNotification("Cut clip not yet implemented.", 1500);
            }, disabled: true },
            { label: 'Paste Clip', action: () => {
                // To implement: paste logic
                showNotification("Paste clip not yet implemented.", 1500);
            }, disabled: true }
        ];

        createContextMenu(e.evt, menuItems, localAppServices);
    });

    clipDiv.addEventListener('dblclick', (e) => {
        if (clip.type === 'midi') {
            localAppServices.openPianoRollForClip?.(track.id, clip.id);
        } else {
            showNotification("Only MIDI clips can be edited in the Piano Roll.", 2000);
        }
    });

}

export function updatePlayheadPosition(transportTime) {
    const timelineWindow = localAppServices.getWindowById?.('timeline');
    if (!timelineWindow?.element || timelineWindow.isMinimized) return; //

    const playhead = timelineWindow.element.querySelector('#timeline-playhead'); //
    const tracksAndPlayheadContainer = timelineWindow.element.querySelector('#timeline-tracks-and-playhead-container'); //
    
    if (!playhead || !tracksAndPlayheadContainer) return; //

    const pixelsPerSecond = getPixelsPerSecond(); //
    const trackNameWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width')) || 120; //
    
    // Calculate new position based on transport time
    let newX = transportTime * pixelsPerSecond + trackNameWidth; //
    
    // Get scroll position and container width
    const scrollLeft = tracksAndPlayheadContainer.scrollLeft; //
    const containerWidth = tracksAndPlayheadContainer.offsetWidth; //

    // Adjust scroll to keep playhead in view
    if (newX < scrollLeft + trackNameWidth || newX > scrollLeft + containerWidth) {
        // If playhead is outside the visible area (excluding track name column),
        // scroll the container to center the playhead, or bring it into view.
        tracksAndPlayheadContainer.scrollLeft = newX - containerWidth / 2; //
    }
    
    playhead.style.transform = `translateX(${newX}px)`; //
}
