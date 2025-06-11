// js/daw/ui/mixerUI.js

// Removed import { createKnob } from '../../knobUI.js'; as createKnob is global
// Removed imports for state functions as they are global

let localAppServices = {};

// Removed export
function initializeMixerUI(appServices) {
    localAppServices = appServices;
}

// Removed export
function openMixerWindow(savedState = null) {
    const windowId = 'mixer';
    // getOpenWindowsState is global
    const openWindows = getOpenWindowsState();
    if (openWindows.has(windowId) && !savedState) {
        // getWindowByIdState is global
        getWindowByIdState(windowId).restore();
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
    
    // SnugWindow is global
    const mixerWindow = localAppServices.createWindow(windowId, 'Mixer', contentContainer, mixerOptions);
    if (mixerWindow?.element) {
        updateMixerWindow();
    }
}

// Removed export
function updateMixerWindow() {
    // --- DEBUGGING LOG ---
    console.log('[mixerUI.js] updateMixerWindow called.');
    const container = document.getElementById('mixerContentContainer');
    if (container) {
        renderMixerTracks(container);
    }
}

function renderMixerTracks(container) {
    // getTracksState is global
    const tracks = getTracksState?.() || [];
    // --- DEBUGGING LOG ---
    console.log(`%c[mixerUI.js] renderMixerTracks called with ${tracks.length} tracks.`, 'color: #f39c12; font-weight: bold;');

    container.innerHTML = '';
    
    const masterTrackDiv = document.createElement('div');
    masterTrackDiv.className = 'mixer-track master-track inline-block align-top p-1.5 border border-black dark:border-white bg-white dark:bg-black shadow w-24 mr-2 text-xs';
    masterTrackDiv.innerHTML = `<div class="track-name font-semibold truncate mb-1 text-black dark:text-white" title="Master">Master</div>
        <div id="volumeKnob-mixer-master-placeholder" class="h-16 mx-auto mb-1"></div>
        <div id="mixerTrackMeterContainer-master" class="h-3 w-full bg-white dark:bg-black rounded border border-black dark:border-white overflow-hidden mt-0.5">
            <div id="mixerTrackMeterBar-master" class="h-full bg-black dark:bg-white transition-all duration-50 ease-linear" style="width: 0%;"></div>
        </div>`;
    container.appendChild(masterTrackDiv);

    const masterVolKnobPlaceholder = masterTrackDiv.querySelector('#volumeKnob-mixer-master-placeholder');
    if (masterVolKnobPlaceholder) {
        // createKnob is global
        const masterVolKnob = createKnob({
            label: 'Master', min: 0, max: 1, step: 0.01,
            // getMasterGainValueState is global
            initialValue: getMasterGainValueState(),
            // setMasterGainValueState is global
            onValueChange: (val) => setMasterGainValueState(val)
        });
        masterVolKnobPlaceholder.appendChild(masterVolKnob.element);
    }

    tracks.forEach(track => {
        // --- DEBUGGING LOG ---
        console.log(`[mixerUI.js] Rendering track: ${track.name}`);

        const trackDiv = document.createElement('div');
        trackDiv.className = 'mixer-track inline-block align-top p-1.5 border border-black dark:border-white bg-white dark:bg-black shadow w-24 mr-2 text-xs';
        trackDiv.dataset.trackId = track.id; // Added data-track-id
        trackDiv.innerHTML = `<div class="track-name font-semibold truncate mb-1 text-black dark:text-white" title="${track.name}">${track.name}</div>
            <div id="volumeKnob-mixer-${track.id}-placeholder" class="h-16 mx-auto mb-1"></div>
            <div id="mixerTrackMeterContainer-${track.id}" class="h-3 w-full bg-white dark:bg-black rounded border border-black dark:border-white overflow-hidden mt-0.5">
                <div id="mixerTrackMeterBar-${track.id}" class="h-full bg-black dark:bg-white transition-all duration-50 ease-linear" style="width: 0%;\\"></div>
            </div>
            <div class="flex justify-around mt-1">
                <button id="mixerMuteBtn-${track.id}" class="px-2 py-0.5 border rounded text-xs">${track.isMuted ? 'Unmute' : 'Mute'}</button>
                <button id="mixerSoloBtn-${track.id}" class="px-2 py-0.5 border rounded text-xs">${track.isSoloed ? 'Unsolo' : 'Solo'}</button>
            </div>
            `; // Added mute and solo buttons HTML
        container.appendChild(trackDiv);

        const volKnobPlaceholder = trackDiv.querySelector(`#volumeKnob-mixer-${track.id}-placeholder`);
        if (volKnobPlaceholder) {
            // createKnob is global
            const volKnob = createKnob({
                label: `Vol ${track.id}`, min: 0, max: 1.2, step: 0.01,
                initialValue: track.previousVolumeBeforeMute,
                onValueChange: (val, o, fromInteraction) => track.setVolume(val, fromInteraction)
            });
            volKnobPlaceholder.appendChild(volKnob.element);
        }

        // Attach listeners for the mixer buttons
        const mixerMuteBtn = trackDiv.querySelector(`#mixerMuteBtn-${track.id}`);
        if (mixerMuteBtn) {
            mixerMuteBtn.addEventListener('click', () => localAppServices.handleTrackMute(track.id));
            // Update initial state for mute button style
            // getSoloedTrackIdState is global
            const soloedTrackId = getSoloedTrackIdState?.();
            mixerMuteBtn.classList.toggle('muted', track.isMuted || (soloedTrackId !== null && soloedTrackId !== track.id));
        }

        const mixerSoloBtn = trackDiv.querySelector(`#mixerSoloBtn-${track.id}`);
        if (mixerSoloBtn) {
            mixerSoloBtn.addEventListener('click', () => localAppServices.handleTrackSolo(track.id));
            // Update initial state for solo button style
            mixerSoloBtn.classList.toggle('soloed', track.isSoloed);
        }
    });
}
