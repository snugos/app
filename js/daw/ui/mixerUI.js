// js/daw/ui/mixerUI.js

// Corrected imports for state modules
import { getTracks, getSoloedTrackId } from '../state/trackState.js'; // Corrected path
import { getMasterGainValue, setMasterGainValue } from '../state/masterState.js'; // Corrected path
import { getOpenWindows, getWindowById } from '../state/windowState.js'; // Corrected path

let localAppServices = {};

export function initializeMixerUI(appServices) {
    localAppServices = appServices;
}

export function openMixerWindow(savedState = null) {
    const windowId = 'mixer';
    const openWindows = getOpenWindows();
    if (openWindows.has(windowId) && !savedState) {
        getWindowById(windowId).restore();
        return;
    }

    const contentContainer = document.createElement('div');
    contentContainer.id = 'mixerContentContainer';
    contentContainer.className = 'p-2 overflow-x-auto whitespace-nowrap h-full bg-white dark:bg-black';
    
    const desktopEl = localAppServices.uiElementsCache?.desktop || document.getElementById('desktop');
    const mixerOptions = { 
        width: Math.min(800, (desktopEl?.offsetWidth || 800) - 40), 
        height: 300, 
        minWidth: 300, 
        minHeight: 200, 
        initialContentKey: windowId 
    };

    if (savedState) Object.assign(mixerOptions, savedState);
    
    const mixerWindow = localAppServices.createWindow(windowId, 'Mixer', contentContainer, mixerOptions);
    if (mixerWindow?.element) {
        updateMixerWindow();
    }
}

export function updateMixerWindow() {
    console.log('[mixerUI.js] updateMixerWindow called.');
    const container = document.getElementById('mixerContentContainer');
    if (container) {
        renderMixerTracks(container);
    }
}

function renderMixerTracks(container) {
    const tracks = getTracks();
    console.log(`%c[mixerUI.js] renderMixerTracks called with ${tracks.length} tracks.`, 'color: #f39c12; font-weight: bold;');

    container.innerHTML = '';
    
    const masterTrackDiv = document.createElement('div');
    masterTrackDiv.className = 'mixer-track master-track inline-block align-top p-1.5 border border-black dark:border-white bg-white dark:bg-black shadow w-24 mr-2 text-xs';
    masterTrackDiv.innerHTML = `<div class="track-name font-semibold truncate mb-1 text-black dark:text-white" title="Master">Master</div>
        <div id="volumeKnob-mixer-master-placeholder" class="h-16 mx-auto mb-1"></div>
        <div id="mixerTrackMeterContainer-master" class="h-3 w-full bg-white dark:bg-black rounded border border-black dark:border-white overflow-hidden mt-0.5">
            <div id="mixerTrackMeterBar-master" class="h-full bg-black dark:bg-white transition-all duration-50 ease-linear" style="width: 0%;\\"></div>
        </div>`;
    container.appendChild(masterTrackDiv);

    const masterVolKnobPlaceholder = masterTrackDiv.querySelector('#volumeKnob-mixer-master-placeholder');
    if (masterVolKnobPlaceholder) {
        const masterVolKnob = localAppServices.createKnob({
            label: 'Master', min: 0, max: 1, step: 0.01,
            initialValue: getMasterGainValue(),
            onValueChange: (val) => setMasterGainValue(val)
        });
        masterVolKnobPlaceholder.appendChild(masterVolKnob.element);
    }

    tracks.forEach(track => {
        console.log(`[mixerUI.js] Rendering track: ${track.name}`);

        const trackDiv = document.createElement('div');
        trackDiv.className = 'mixer-track inline-block align-top p-1.5 border border-black dark:border-white bg-white dark:bg-black shadow w-24 mr-2 text-xs';
        trackDiv.dataset.trackId = track.id;
        trackDiv.innerHTML = `<div class="track-name font-semibold truncate mb-1 text-black dark:text-white" title="${track.name}">${track.name}</div>
            <div id="volumeKnob-mixer-${track.id}-placeholder" class="h-16 mx-auto mb-1"></div>
            <div id="mixerTrackMeterContainer-${track.id}" class="h-3 w-full bg-white dark:bg-black rounded border border-black dark:border-white overflow-hidden mt-0.5">
                <div id="mixerTrackMeterBar-${track.id}" class="h-full bg-black dark:bg-white transition-all duration-50 ease-linear" style="width: 0%;\\"></div>
            </div>
            <div class="flex justify-around mt-1">
                <button id="mixerMuteBtn-${track.id}" class="px-2 py-0.5 border rounded text-xs">${track.isMuted ? 'Unmute' : 'Mute'}</button>
                <button id="mixerSoloBtn-${track.id}" class="px-2 py-0.5 border rounded text-xs">${track.isSoloed ? 'Unsolo' : 'Solo'}</button>
            </div>
            `;
        container.appendChild(trackDiv);

        const volKnobPlaceholder = trackDiv.querySelector(`#volumeKnob-mixer-${track.id}-placeholder`);
        if (volKnobPlaceholder) {
            const volKnob = localAppServices.createKnob({
                label: `Vol ${track.id}`, min: 0, max: 1.2, step: 0.01,
                initialValue: track.previousVolumeBeforeMute,
                onValueChange: (val, o, fromInteraction) => track.setVolume(val, fromInteraction)
            });
            volKnobPlaceholder.appendChild(volKnob.element);
        }

        const mixerMuteBtn = trackDiv.querySelector(`#mixerMuteBtn-${track.id}`);
        if (mixerMuteBtn) {
            mixerMuteBtn.addEventListener('click', () => localAppServices.handleTrackMute(track.id));
            const soloedTrackId = getSoloedTrackId();
            mixerMuteBtn.classList.toggle('muted', track.isMuted || (soloedTrackId !== null && soloedTrackId !== track.id));
        }

        const mixerSoloBtn = trackDiv.querySelector(`#mixerSoloBtn-${track.id}`);
        if (mixerSoloBtn) {
            mixerSoloBtn.addEventListener('click', () => localAppServices.handleTrackSolo(track.id));
            mixerSoloBtn.classList.toggle('soloed', track.isSoloed);
        }
    });
}
