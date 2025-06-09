// js/ui/timelineUI.js - Timeline UI Management
import { SnugWindow } from '../SnugWindow.js';
import { showNotification, createContextMenu } from '../utils.js';
import * as Constants from '../constants.js';

let localAppServices = {};

// ADD the 'export' keyword to this function
export function initializeTimelineUI(appServicesFromMain) {
    localAppServices = appServicesFromMain || {};
    console.log("[TimelineUI] Initialized with appServices keys:", Object.keys(localAppServices));
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
                <div id="timeline-playhead" class="absolute top-0 w-0.5 h-full bg-red-500 z-20 pointer-events-none"></div>
                <div id="timeline-tracks-area" class="relative h-full"></div>
            </div>
        </div>
    `;
    
    const timelineOptions = { 
        width: Math.min(1200, (document.getElementById('desktop')?.offsetWidth || 1200) - 40), 
        height: 250, 
        minWidth: 400, 
        minHeight: 150 
    };
    if (savedState) Object.assign(timelineOptions, savedState);

    const timelineWindow = localAppServices.createWindow(windowId, 'Timeline', contentHTML, timelineOptions);
    
    if (timelineWindow?.element) {
        renderTimeline();
    }
}

export function renderTimeline() {
    const timelineWindow = localAppServices.getWindowById?.('timeline');
    if (!timelineWindow || !timelineWindow.element || timelineWindow.isMinimized) return;

    const tracksArea = timelineWindow.element.querySelector('#timeline-tracks-area');
    if (!tracksArea) return;

    tracksArea.innerHTML = '';
    const tracks = localAppServices.getTracks?.() || [];

    tracks.forEach(track => {
        const trackLane = document.createElement('div');
        trackLane.className = 'timeline-track-lane flex';
        trackLane.setAttribute('data-track-id', track.id);
        
        const trackNameWidth = getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width');
        
        trackLane.innerHTML = `
            <div class="timeline-track-lane-name" style="width: ${trackNameWidth};">${track.name}</div>
            <div class="timeline-clips-area flex-grow h-full relative"></div>
        `;
        
        const clipsArea = trackLane.querySelector('.timeline-clips-area');
        if (clipsArea) {
            track.timelineClips.forEach(clip => {
                const clipDiv = document.createElement('div');
                clipDiv.className = clip.type === 'audio' ? 'audio-clip' : 'midi-clip'; // Style midi-clip later
                clipDiv.textContent = clip.name;

                const pixelsPerSecond = (Tone.Transport.bpm.value / 60) * 4 * 30;
                clipDiv.style.left = `${clip.startTime * pixelsPerSecond}px`;
                clipDiv.style.width = `${clip.duration * pixelsPerSecond}px`;

                clipsArea.appendChild(clipDiv);
            });
        }
        
        tracksArea.appendChild(trackLane);
    });
}


export function updatePlayheadPosition(transportTime) {
    const timelineWindow = localAppServices.getWindowById?.('timeline');
    if (!timelineWindow?.element || timelineWindow.isMinimized) return;

    const playhead = timelineWindow.element.querySelector('#timeline-playhead');
    const tracksAndPlayheadContainer = timelineWindow.element.querySelector('#timeline-tracks-and-playhead-container');

    if (!playhead || !tracksAndPlayheadContainer) return;

    const pixelsPerSecond = (Tone.Transport.bpm.value / 60) * 4 * 30;
    const trackNameWidthValue = getComputedStyle(document.documentElement).getPropertyValue('--timeline-track-name-width');
    const trackNameWidth = parseInt(trackNameWidthValue, 10) || 120;
    
    const playheadAbsoluteLeft = (transportTime * pixelsPerSecond);
    playhead.style.transform = `translateX(${playheadAbsoluteLeft}px)`;

    if (typeof Tone !== 'undefined' && Tone.Transport.state === 'started') {
        const containerScrollLeft = tracksAndPlayheadContainer.scrollLeft;
        const containerWidth = tracksAndPlayheadContainer.clientWidth;
        
        const playheadVisibleStart = containerScrollLeft;
        const playheadVisibleEnd = containerScrollLeft + containerWidth;
        const scrollBuffer = 50; 

        if (playhead.offsetLeft > playheadVisibleEnd - scrollBuffer) {
            tracksAndPlayheadContainer.scrollLeft = playhead.offsetLeft - containerWidth + scrollBuffer;
        }
        else if (playhead.offsetLeft < playheadVisibleStart + scrollBuffer) {
             tracksAndPlayheadContainer.scrollLeft = Math.max(0, playhead.offsetLeft - scrollBuffer);
        }
    }
}
