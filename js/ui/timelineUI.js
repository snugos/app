// js/ui/timelineUI.js - Timeline UI Management
import { SnugWindow } from '../SnugWindow.js'; // Adjust path if SnugWindow is not in ../
import { showNotification, createContextMenu } from '../utils.js'; // Adjust path
import * as Constants from '../constants.js'; // Adjust path

let localAppServices = {};

export function initializeTimelineUI(appServicesFromMain) {
    localAppServices = appServicesFromMain;
}

export function openTimelineWindow(savedState = null) {
    const windowId = 'timeline';
    const openWindows = localAppServices.getOpenWindows ? localAppServices.getOpenWindows() : new Map();

    if (openWindows.has(windowId) && !savedState) {
        const winInstance = openWindows.get(windowId);
        if (winInstance && typeof winInstance.restore === 'function') {
            winInstance.restore();
        }
        return winInstance;
    }

    const contentHTML = `
        <div id="timeline-container" class="h-full w-full overflow-hidden relative">
            <div id="timeline-header" class="h-5 bg-gray-200 dark:bg-slate-700 border-b border-gray-300 dark:border-slate-600 relative overflow-hidden">
                <div id="timeline-ruler" style="width: 4000px; height: 100%;"></div>
                <div id="timeline-playhead" class="absolute top-0 w-0.5 h-full bg-cyan-400 z-10 pointer-events-none" style="left: var(--timeline-track-name-width, 120px);"></div>
            </div>
            <div id="timeline-tracks-container" class="flex-grow overflow-auto">
                <div id="timeline-tracks-area" style="width: 4000px; position: relative;">
                    <!-- Track lanes will be rendered here by renderTimeline() -->
                </div>
            </div>
        </div>
    `;

    const desktopEl = localAppServices.uiElementsCache?.desktop || document.getElementById('desktop');
    const safeDesktopWidth = (desktopEl && typeof desktopEl.offsetWidth === 'number' && desktopEl.offsetWidth > 0) ? desktopEl.offsetWidth : 1024;
    const timelineOptions = {
        width: Math.max(600, Math.min(1200, safeDesktopWidth - 60)), // Adjusted width
        height: 250,
        x: 30, // Default position
        y: 50, // Default position
        minWidth: 400,
        minHeight: 150,
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
        const contentArea = timelineWindow.element.querySelector('.window-content'); // Main scrollable area for tracks
        const tracksContainer = timelineWindow.element.querySelector('#timeline-tracks-container'); // Specifically for track lanes scroll
        const ruler = timelineWindow.element.querySelector('#timeline-ruler');
        const playhead = timelineWindow.element.querySelector('#timeline-playhead');
        const trackNameWidth = getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim() || '120px';


        if (tracksContainer && ruler) {
            tracksContainer.addEventListener('scroll', () => {
                // Sync ruler and playhead horizontal position with tracksContainer scroll
                const scrollLeft = tracksContainer.scrollLeft;
                ruler.style.transform = `translateX(-${scrollLeft}px)`;
                if(playhead) {
                    const playheadOffset = parseFloat(trackNameWidth);
                    playhead.style.transform = `translateX(-${scrollLeft}px)`;
                }
                 // Also adjust the main contentArea scroll if needed, or ensure it doesn't interfere
                if(contentArea && contentArea.scrollLeft !== scrollLeft) {
                    contentArea.scrollLeft = scrollLeft;
                }
            });
        }
        // Initial render
        if(localAppServices.renderTimeline) localAppServices.renderTimeline(); // Call global renderTimeline which should now use this module's logic
    }
    return timelineWindow;
}

export function renderTimeline() {
    const timelineWindow = localAppServices.getWindowById ? localAppServices.getWindowById('timeline') : null;
    if (!timelineWindow || !timelineWindow.element || timelineWindow.isMinimized) {
        // console.log("[TimelineUI renderTimeline] Timeline window not found or not visible.");
        return;
    }

    const tracksArea = timelineWindow.element.querySelector('#timeline-tracks-area');
    if (!tracksArea) {
        console.error("[TimelineUI renderTimeline] #timeline-tracks-area not found.");
        return;
    }

    tracksArea.innerHTML = ''; // Clear previous track lanes
    const tracks = localAppServices.getTracks ? localAppServices.getTracks() : [];
    const trackNameWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim()) || 120;


    tracks.forEach((track, index) => {
        const lane = document.createElement('div');
        lane.className = 'timeline-track-lane relative border-b dark:border-slate-700';
        lane.dataset.trackId = track.id;
        lane.style.height = '50px'; // Fixed height for lanes for now

        const nameEl = document.createElement('div');
        nameEl.className = 'timeline-track-lane-name absolute left-0 top-0 h-full flex items-center px-2 border-r dark:border-slate-600 bg-gray-100 dark:bg-slate-700';
        nameEl.style.width = `${trackNameWidth}px`;
        nameEl.textContent = track.name;
        nameEl.title = track.name;
        lane.appendChild(nameEl);

        const clipsContainer = document.createElement('div');
        clipsContainer.className = 'timeline-clips-area absolute top-0 h-full bg-gray-50 dark:bg-slate-800';
        clipsContainer.style.left = `${trackNameWidth}px`;
        clipsContainer.style.width = `calc(100% - ${trackNameWidth}px)`; // Fill remaining space
        clipsContainer.style.overflow = 'hidden'; // Clips should not overflow this container


        if (track.timelineClips && Array.isArray(track.timelineClips)) {
            track.timelineClips.forEach(clip => {
                if (!clip || typeof clip.startTime !== 'number' || typeof clip.duration !== 'number') return;

                const pixelsPerSecond = 60; // Example: 60px per second of audio/sequence
                const clipEl = document.createElement('div');
                clipEl.className = `audio-clip absolute rounded text-white text-[10px] p-1 overflow-hidden whitespace-nowrap ${clip.type === 'audio' ? 'bg-teal-600 border-teal-700' : 'bg-sky-600 border-sky-700'} hover:opacity-80`;
                clipEl.style.left = `${clip.startTime * pixelsPerSecond}px`;
                clipEl.style.width = `${clip.duration * pixelsPerSecond}px`;
                clipEl.style.height = '80%';
                clipEl.style.top = '10%';
                clipEl.textContent = clip.name || (clip.type === 'audio' ? 'Audio Clip' : 'Sequence');
                clipEl.title = `${clip.name || (clip.type === 'audio' ? 'Audio Clip' : 'Sequence')} (Start: ${clip.startTime.toFixed(2)}s, Dur: ${clip.duration.toFixed(2)}s)`;
                clipEl.dataset.clipId = clip.id;
                clipEl.dataset.trackId = track.id;
                clipEl.draggable = true;

                clipEl.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({
                        type: 'timeline-clip-drag',
                        clipId: clip.id,
                        sourceTrackId: track.id,
                        originalStartTime: clip.startTime,
                        clipDuration: clip.duration,
                        clipType: clip.type,
                        sourceSequenceId: clip.type === 'sequence' ? clip.sourceSequenceId : null
                    }));
                    e.dataTransfer.effectAllowed = 'move';
                    e.target.style.opacity = '0.5';
                });
                clipEl.addEventListener('dragend', (e) => {
                    e.target.style.opacity = '1';
                });
                clipEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (localAppServices.setSelectedTimelineClipInfo) {
                        localAppServices.setSelectedTimelineClipInfo(track.id, clip.id);
                    }
                    // Highlight selected clip
                    timelineWindow.element.querySelectorAll('.audio-clip.selected').forEach(c => c.classList.remove('selected', 'ring-2', 'ring-yellow-400'));
                    clipEl.classList.add('selected', 'ring-2', 'ring-yellow-400');
                });
                clipsContainer.appendChild(clipEl);
            });
        }
        lane.appendChild(clipsContainer);

        // Drop zone behavior for the lane (for audio files or sequences from browser/other tracks)
        lane.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            lane.classList.add('dragover-timeline-lane', 'bg-blue-100', 'dark:bg-blue-900');
        });
        lane.addEventListener('dragleave', (e) => {
            lane.classList.remove('dragover-timeline-lane', 'bg-blue-100', 'dark:bg-blue-900');
        });
        lane.addEventListener('drop', (e) => {
            e.preventDefault();
            lane.classList.remove('dragover-timeline-lane', 'bg-blue-100', 'dark:bg-blue-900');

            const pixelsPerSecond = 60; // Must match rendering
            const trackLaneRect = clipsContainer.getBoundingClientRect(); // Use clipsContainer for offset calculation
            const dropX = e.clientX - trackLaneRect.left + tracksArea.parentElement.scrollLeft; // Consider scroll of the tracks container
            const dropTime = Math.max(0, dropX / pixelsPerSecond);

            console.log(`[TimelineUI Drop] Lane Drop on track ${track.id}. DropX: ${dropX.toFixed(1)}, DropTime: ${dropTime.toFixed(2)}s`);

            const droppedDataString = e.dataTransfer.getData('application/json');
            if (droppedDataString) {
                try {
                    const droppedData = JSON.parse(droppedDataString);
                    if (droppedData.type === 'timeline-clip-drag') { // Moving an existing clip
                        if (localAppServices.getTrackById && localAppServices.captureStateForUndo) {
                            const sourceTrack = localAppServices.getTrackById(droppedData.sourceTrackId);
                            const targetTrack = localAppServices.getTrackById(track.id); // Current lane's track
                            if (sourceTrack && targetTrack) {
                                localAppServices.captureStateForUndo(`Move Clip to ${targetTrack.name}`);
                                sourceTrack.moveClipToTrack(droppedData.clipId, targetTrack, dropTime);
                            }
                        }
                    } else if (localAppServices.handleTimelineLaneDrop) { // Dropping new item (from sound browser etc)
                        localAppServices.handleTimelineLaneDrop(e, track.id, dropTime);
                    }
                } catch (parseError) {
                     console.warn("[TimelineUI Drop] Could not parse dropped JSON data:", parseError);
                     // Try to handle as file drop if JSON parse fails but files exist
                     if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && localAppServices.handleTimelineLaneDrop) {
                        localAppServices.handleTimelineLaneDrop(e, track.id, dropTime);
                    }
                }
            } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && localAppServices.handleTimelineLaneDrop) {
                 localAppServices.handleTimelineLaneDrop(e, track.id, dropTime); // Handle direct file drop
            }
        });
        tracksArea.appendChild(lane);
    });
    updatePlayheadPosition();
}

export function updatePlayheadPosition() {
    const timelineWindow = localAppServices.getWindowById ? localAppServices.getWindowById('timeline') : null;
    if (!timelineWindow || !timelineWindow.element || timelineWindow.isMinimized) return;

    const playhead = timelineWindow.element.querySelector('#timeline-playhead');
    const tracksContainer = timelineWindow.element.querySelector('#timeline-tracks-container'); // Scroll container
    if (!playhead || !tracksContainer) return;

    const pixelsPerSecond = 60; // Example, should match renderTimeline
    const transportTime = typeof Tone !== 'undefined' ? Tone.Transport.seconds : 0;
    const playheadOffsetFromContainerStart = transportTime * pixelsPerSecond;
    const trackNameWidth = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim()) || 120;


    // Position relative to the timeline-header (or a common parent if header also scrolls)
    // The playhead's 'left' is already offset by trackNameWidth in its style.
    // So, newLeft should be based on transportTime * pixelsPerSecond,
    // and its visual position relative to the viewport also needs to account for scroll.
    const newLeftRelativeToRulerStart = playheadOffsetFromContainerStart;
    playhead.style.left = `${trackNameWidth + newLeftRelativeToRulerStart}px`;

    // Ensure playhead is visible within the scrolled view
    const containerScrollLeft = tracksContainer.scrollLeft;
    const containerWidth = tracksContainer.clientWidth; // Visible width
    const playheadVisiblePosition = newLeftRelativeToRulerStart - containerScrollLeft;

    if (playheadVisiblePosition < 0 || playheadVisiblePosition > containerWidth - trackNameWidth) {
        // Scroll to make playhead visible, keeping it roughly in the middle
        // tracksContainer.scrollLeft = newLeftRelativeToRulerStart - (containerWidth / 2) + (trackNameWidth / 2) ;
    }
}

