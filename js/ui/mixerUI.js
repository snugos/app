// js/ui/mixerUI.js

let localAppServices = {};

export function initializeMixerUI(appServices) {
    localAppServices = appServices;
}

export function openMixerWindow(savedState = null) {
    const windowId = 'mixer';
    const openWindows = localAppServices.getOpenWindows();
    if (openWindows.has(windowId) && !savedState) {
        openWindows.get(windowId).restore();
        return;
    }

    const contentContainer = document.createElement('div');
    contentContainer.id = 'mixerContentContainer';
    contentContainer.className = 'p-2 overflow-x-auto whitespace-nowrap h-full bg-gray-100 dark:bg-slate-800';
    
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
    const mixerWindow = localAppServices.getWindowById('mixer');
    if (!mixerWindow?.element || mixerWindow.isMinimized) return;
    const container = mixerWindow.element.querySelector('#mixerContentContainer');
    if (container) {
        renderMixer(container);
    }
}

function renderMixer(container) {
    const tracks = localAppServices.getTracks();
    container.innerHTML = '';
    
    const masterTrackDiv = document.createElement('div');
    masterTrackDiv.className = 'mixer-track master-track inline-block align-top p-1.5 border rounded bg-gray-200 dark:bg-slate-700 dark:border-slate-600 shadow w-24 mr-2 text-xs';
    masterTrackDiv.innerHTML = `<div class="track-name font-semibold truncate mb-1 dark:text-slate-200" title="Master">Master</div>
        <div id="masterVolumeKnob-mixer-placeholder" class="h-16 mx-auto mb-1"></div>
        <div id="mixerMasterMeterContainer" class="h-3 w-full bg-gray-300 dark:bg-slate-600 rounded border border-gray-400 dark:border-slate-500 overflow-hidden mt-1">
            <div id="mixerMasterMeterBar" class="h-full bg-blue-500 transition-all duration-50 ease-linear" style="width: 0%;"></div>
        </div>`;
    container.appendChild(masterTrackDiv);

    const masterVolKnobPlaceholder = masterTrackDiv.querySelector('#masterVolumeKnob-mixer-placeholder');
    if (masterVolKnobPlaceholder) {
        const masterGain = localAppServices.getMasterGainValue();
        const masterVolKnob = localAppServices.createKnob({
            label: 'Master Vol', min: 0, max: 1.2, step: 0.01, initialValue: masterGain, decimals: 2,
            onValueChange: (val) => {
                localAppServices.setActualMasterVolume(val);
                localAppServices.setMasterGainValue(val);
            }
        }, localAppServices);
        masterVolKnobPlaceholder.appendChild(masterVolKnob.element);
    }

    tracks.forEach(track => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'mixer-track inline-block align-top p-1.5 border rounded bg-white dark:bg-slate-700 dark:border-slate-600 shadow w-24 mr-2 text-xs';
        trackDiv.innerHTML = `<div class="track-name font-semibold truncate mb-1 dark:text-slate-200" title="${track.name}">${track.name}</div>
            <div id="volumeKnob-mixer-${track.id}-placeholder" class="h-16 mx-auto mb-1"></div>
            <div id="mixerTrackMeterContainer-${track.id}" class="h-3 w-full bg-gray-200 dark:bg-slate-600 rounded border border-gray-300 dark:border-slate-500 overflow-hidden mt-0.5">
                <div id="mixerTrackMeterBar-${track.id}" class="h-full bg-green-500 transition-all duration-50 ease-linear" style="width: 0%;"></div>
            </div>`;
        container.appendChild(trackDiv);

        const volKnobPlaceholder = trackDiv.querySelector(`#volumeKnob-mixer-${track.id}-placeholder`);
        if (volKnobPlaceholder) {
            const volKnob = localAppServices.createKnob({
                label: `Vol ${track.id}`, min: 0, max: 1.2, step: 0.01,
                initialValue: track.previousVolumeBeforeMute, decimals: 2, trackRef: track,
                onValueChange: (val, o, fromInteraction) => track.setVolume(val, fromInteraction)
            }, localAppServices);
            volKnobPlaceholder.appendChild(volKnob.element);
        }
    });
}
