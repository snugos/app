// js/ui/timelineUI.js - Timeline UI Management
import { SnugWindow } from '../SnugWindow.js'; // Adjust path if SnugWindow is not in ../js/
import { showNotification, createContextMenu } from '../utils.js'; // Adjust path if utils.js is not in ../js/
import * as Constants from '../constants.js'; // Adjust path if constants.js is not in ../js/

let localAppServices = {};

export function initializeTimelineUI(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
    console.log("[TimelineUI] Initialized with appServices keys:", Object.keys(localAppServices));
}

export function openTimelineWindow(savedState = null) {
    const windowId = 'timeline';
    // Ensure getOpenWindows service is available and correctly referenced
    const getOpenWindows = localAppServices.getOpenWindows || localAppServices.getOpenWindowsState || (() => new Map());
    const openWindows = getOpenWindows();

    if (openWindows.has(windowId) && !savedState) {
        const winInstance = openWindows.get(windowId);
        if (winInstance && typeof winInstance.restore === 'function') {
            winInstance.restore();
        }
        return winInstance;
    }

    const contentHTML = `
        <div id="timeline-container" class="h-full w-full overflow-hidden relative flex flex-col">
            <div id="timeline-header" class="h-5 bg-gray-200 dark:bg-slate-700 border-b border-gray-300 dark:border-slate-600 relative overflow-hidden flex-shrink-0">
                <div id="timeline-ruler" style="position: absolute; left: 0; top: 0; width: 4000px; height: 100%;"></div>
            </div>
            <div id="timeline-tracks-and-playhead-container" class="flex-grow relative overflow-x-auto">
                 <div id="timeline-playhead" class="absolute top-0 w-0.5 h-full bg-cyan-400 z-20 pointer-events-none" style="left: var(--timeline-track-name-width, 120px);"></div>
                 <div id="timeline-tracks-area" style="position: relative; width: 4000px; height:100%; overflow-y: auto; ">
                    </div>
            </div>
        </div>
    `;

    const desktopEl = localAppServices.uiElementsCache?.desktop || document.getElementById('desktop');
    const safeDesktopWidth = (desktopEl && typeof desktopEl.offsetWidth === 'number' && desktopEl.offsetWidth > 0) ? desktopEl.offsetWidth : 1024;
    const timelineOptions = {
        width: Math.max(600, Math.min(1200, safeDesktopWidth - 60)),
        height: 250,
        x: 30,
        y: 50,
        minWidth: 400,
        minHeight: 150,
        initialContentKey: windowId,
        onCloseCallback: () => {}
    };

     if (savedState) {
        Object.assign(timelineOptions, {
            x: Number.isFinite(parseInt(savedState.left, 10)) ? parseInt(savedState.left, 10) : timelineOptions.x,
            y: Number.isFinite(parseInt(savedState.top, 10)) ? parseInt(savedState.top, 10) : timelineOptions.y,
            width: Number.isFinite(parseInt(savedState.width, 10)) && parseInt(savedState.width, 10) >= timelineOptions.minWidth ? parseInt(savedState.width, 10) : timelineOptions.width,
            height: Number.isFinite(parseInt(savedState.height, 10)) && parseInt(savedState.height, 10) >= timelineOptions.minHeight ? parseInt(savedState.height, 10) : timelineOptions.height,
            zIndex: savedState.zIndex,
            isMinimized: savedState.isMinimized
        });
    }

    const timelineWindow = localAppServices.createWindow(windowId, 'Timeline', contentHTML, timelineOptions);

    if (timelineWindow?.element) {
        const tracksAndPlayheadContainer = timelineWindow.element.querySelector('#timeline-tracks-and-playhead-container');
        const ruler = timelineWindow.element.querySelector('#timeline-ruler');
        
        if (tracksAndPlayheadContainer && ruler) {
            // --- Start of Corrected Code ---
            tracksAndPlayheadContainer.addEventListener('scroll', () => {
                const scrollLeft = tracksAndPlayheadContainer.scrollLeft;
                // The ruler is transformed by the scroll amount.
                ruler.style.transform = `translateX(-${scrollLeft}px)`;
                // The playhead position is now handled entirely by the updatePlayheadPosition function
                // to ensure it is always correct relative to the audio playback time and scroll position.
            });
            // --- End of Corrected Code ---
        }
        
        if(localAppServices.renderTimeline) localAppServices.renderTimeline();
    }
    return timelineWindow;
}

export function renderTimeline() {
    const timelineWindow = localAppServices.getWindowById ? localAppServices.getWindowById('timeline') : null;
    if (!timelineWindow || !timelineWindow.element || timelineWindow.isMinimized) {
        return;
    }

    const tracksArea = timelineWindow.element.querySelector('#timeline-tracks-area');
    if (!tracksArea) {
        console.error("[TimelineUI renderTimeline] #timeline-tracks-area not found.");
        return;
    }

    tracksArea.innerHTML = ''; // Clear previous track lanes
    const tracks = localAppServices.getTracks ? localAppServices.getTracks() : [];
    const trackNameWidthValue = getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim() || '120px';
    const trackNameWidth = parseFloat(trackNameWidthValue); // Use parsed float value for calculations

    if (tracks.length === 0) {
        tracksArea.innerHTML = '<div class="p-4 text-center text-sm text-gray-500 dark:text-slate-400">No tracks yet. Add a track from the Start menu.</div>';
    }

    tracks.forEach((track) => {
        const lane = document.createElement('div');
        lane.className = 'timeline-track-lane relative border-b dark:border-slate-700 flex'; // Use flex for name and clips area
        lane.dataset.trackId = track.id;
        lane.style.height = '50px';

        const nameEl = document.createElement('div');
        nameEl.className = 'timeline-track-lane-name sticky left-0 top-0 h-full flex items-center px-2 border-r dark:border-slate-600 bg-gray-100 dark:bg-slate-700 z-10 flex-shrink-0';
        nameEl.style.width = trackNameWidthValue; // Use the CSS variable value
        nameEl.textContent = track.name;
        nameEl.title = track.name;
        lane.appendChild(nameEl);

        const clipsContainer = document.createElement('div');
        clipsContainer.className = 'timeline-clips-area relative h-full flex-grow'; // flex-grow to take remaining space
        clipsContainer.style.minWidth = '3000px'; // Ensure it's wide enough to scroll within its parent if tracksArea is wider

        if (track.timelineClips && Array.isArray(track.timelineClips)) {
            track.timelineClips.forEach(clip => {
                if (!clip || typeof clip.startTime !== 'number' || typeof clip.duration !== 'number') return;

                const pixelsPerSecond = 60; // This should ideally be a dynamic or configurable value
                const clipEl = document.createElement('div');
                clipEl.className = `audio-clip absolute rounded text-white text-[10px] p-1 overflow-hidden whitespace-nowrap ${clip.type === 'audio' ? 'bg-teal-600 border-teal-700' : 'bg-sky-600 border-sky-700'} hover:opacity-80 cursor-grab`;
                clipEl.style.left = `${clip.startTime * pixelsPerSecond}px`;
                clipEl.style.width = `${Math.max(10, clip.duration * pixelsPerSecond)}px`; // Minimum width for visibility
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
                clipEl.addEventListener('dragend', (e) => { e.target.style.opacity = '1'; });

                clipEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (localAppServices.setSelectedTimelineClipInfo) {
                        localAppServices.setSelectedTimelineClipInfo(track.id, clip.id);
                    }
                    timelineWindow.element.querySelectorAll('.audio-clip.selected').forEach(c => c.classList.remove('selected', 'ring-2', 'ring-yellow-400', 'dark:ring-yellow-500'));
                    clipEl.classList.add('selected', 'ring-2', 'ring-yellow-400', 'dark:ring-yellow-500');
                });
                clipsContainer.appendChild(clipEl);
            });
        }
        lane.appendChild(clipsContainer);

        lane.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy'; // Or 'move' if dragging existing clips
            lane.classList.add('dragover-timeline-lane', 'bg-blue-100', 'dark:bg-blue-900');
        });
        lane.addEventListener('dragleave', (e) => { lane.classList.remove('dragover-timeline-lane', 'bg-blue-100', 'dark:bg-blue-900'); });
        lane.addEventListener('drop', (e) => {
            e.preventDefault();
            lane.classList.remove('dragover-timeline-lane', 'bg-blue-100', 'dark:bg-blue-900');
            const pixelsPerSecond = 60;
            const laneRect = clipsContainer.getBoundingClientRect(); // Relative to viewport
            const tracksAndPlayheadContainer = timelineWindow.element.querySelector('#timeline-tracks-and-playhead-container');
            const containerScrollLeft = tracksAndPlayheadContainer ? tracksAndPlayheadContainer.scrollLeft : 0;

            // Calculate dropX relative to the start of the clipsContainer content (not viewport)
            const dropX = e.clientX - laneRect.left + containerScrollLeft;
            const dropTime = Math.max(0, dropX / pixelsPerSecond);

            console.log(`[TimelineUI Drop] Lane Drop on track ${track.id}. ClientX: ${e.clientX}, LaneLeft: ${laneRect.left}, ScrollLeft: ${containerScrollLeft}, DropX: ${dropX.toFixed(1)}, DropTime: ${dropTime.toFixed(2)}s`);

            const droppedDataString = e.dataTransfer.getData('application/json');
            if (droppedDataString) {
                try {
                    const droppedData = JSON.parse(droppedDataString);
                    if (droppedData.type === 'timeline-clip-drag') {
                        if (localAppServices.getTrackById && localAppServices.captureStateForUndo && typeof track.moveClipToTrack === 'function') {
                            const sourceTrack = localAppServices.getTrackById(droppedData.sourceTrackId);
                            const targetTrack = localAppServices.getTrackById(track.id);
                            if (sourceTrack && targetTrack) {
                                // Check if clip types are compatible or if it's an audio clip moving to an audio track
                                const canDrop = (targetTrack.type === 'Audio' && droppedData.clipType === 'audio') ||
                                                (targetTrack.type !== 'Audio' && droppedData.clipType === 'sequence');

                                if (canDrop || (droppedData.clipType === 'audio' && targetTrack.type === 'Audio') || (droppedData.clipType === 'sequence' && targetTrack.type !== 'Audio') ) {
                                     if (droppedData.sourceTrackId === targetTrack.id) { // Moving within the same track
                                        localAppServices.captureStateForUndo(`Move Clip on ${targetTrack.name}`);
                                        sourceTrack.updateAudioClipPosition(droppedData.clipId, dropTime); // Use existing method for same-track moves
                                     } else { // Moving to a different (compatible) track
                                        localAppServices.captureStateForUndo(`Move Clip to ${targetTrack.name}`);
                                        sourceTrack.moveClipToTrack(droppedData.clipId, targetTrack, dropTime);
                                     }
                                } else {
                                     showNotification(`Cannot move ${droppedData.clipType} clip to a ${targetTrack.type} track.`, 3000);
                                }
                            }
                        }
                    } else if (localAppServices.handleTimelineLaneDrop) {
                        localAppServices.handleTimelineLaneDrop(e, track.id, dropTime);
                    }
                } catch (parseError) {
                     console.warn("[TimelineUI Drop] Could not parse dropped JSON data:", parseError);
                     if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && localAppServices.handleTimelineLaneDrop) {
                        localAppServices.handleTimelineLaneDrop(e, track.id, dropTime);
                    }
                }
            } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && localAppServices.handleTimelineLaneDrop) {
                 localAppServices.handleTimelineLaneDrop(e, track.id, dropTime);
            }
        });
        tracksArea.appendChild(lane);
    });
    updatePlayheadPosition(); // Update playhead position after rendering tracks
}

export function updatePlayheadPosition() {
    const timelineWindow = localAppServices.getWindowById ? localAppServices.getWindowById('timeline') : null;
    if (!timelineWindow || !timelineWindow.element || timelineWindow.isMinimized || document.hidden) {
        return;
    }

    const playhead = timelineWindow.element.querySelector('#timeline-playhead');
    const tracksAndPlayheadContainer = timelineWindow.element.querySelector('#timeline-tracks-and-playhead-container');
    if (!playhead || !tracksAndPlayheadContainer) return;

    // --- Start of Corrected Code ---

    const pixelsPerSecond = 60;
    const transportTime = typeof Tone !== 'undefined' ? Tone.Transport.seconds : 0;
    const trackNameWidthValue = getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width').trim() || '120px';
    const trackNameWidth = parseFloat(trackNameWidthValue);

    // The playhead's `left` position is its absolute position within the 4000px wide timeline-tracks-area.
    // This value grows as playback continues. The browser's native scrolling handles visibility.
    const playheadAbsoluteLeft = (transportTime * pixelsPerSecond) + trackNameWidth;
    playhead.style.left = `${playheadAbsoluteLeft}px`;
    
    // Auto-scroll logic to keep the playhead in view during playback
    if (typeof Tone !== 'undefined' && Tone.Transport.state === 'started') {
        const containerScrollLeft = tracksAndPlayheadContainer.scrollLeft;
        const containerWidth = tracksAndPlayheadContainer.clientWidth;
        
        const playheadVisibleStart = containerScrollLeft;
        const playheadVisibleEnd = containerScrollLeft + containerWidth;
        const scrollBuffer = 50; // pixels

        // If playhead is approaching the right edge of the visible area
        if (playheadAbsoluteLeft > playheadVisibleEnd - scrollBuffer) {
            // Scroll to keep the playhead on the screen
            tracksAndPlayheadContainer.scrollLeft = playheadAbsoluteLeft - containerWidth + scrollBuffer;
        }
        // If playhead is approaching the left edge (e.g., during reverse playback or seeking)
        else if (playheadAbsoluteLeft < playheadVisibleStart + scrollBuffer) {
             tracksAndPlayheadContainer.scrollLeft = Math.max(0, playheadAbsoluteLeft - scrollBuffer);
        }
    }
    // --- End of Corrected Code ---
}
