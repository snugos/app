// js/globalControlsUI.js - UI for Global Controls Window (MODIFIED - Ensured appServices reference)

import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';

// This will be the single appServices instance from main.js
let localAppServices = {}; 

export function initializeGlobalControlsUIModule(appServicesFromMain) {
    localAppServices = appServicesFromMain; // Use the direct reference
    // console.log("[GlobalControlsUI] Module initialized.");
}

export function openGlobalControlsWindow(onReadyCallback, savedState = null) {
    const windowId = 'globalControls';
    
    // Access appServices directly from the module-scoped localAppServices
    // which should be the instance from main.js
    const getOpenWindows = localAppServices.getOpenWindowsState; // Changed from getOpenWindows
    const removeWindowFromStore = localAppServices.removeWindowFromStoreState; // Changed from removeWindowFromStore
    const createWindow = localAppServices.createWindow;

    if (!createWindow || !getOpenWindows) {
        console.error("[GlobalControlsUI openGlobalControlsWindow] CRITICAL: Core appServices (createWindow, getOpenWindowsState) not available via localAppServices!");
        if (localAppServices.showNotification) {
            localAppServices.showNotification("Error: Cannot open Global Controls window (internal services missing).", "error");
        } else {
            alert("Error: Cannot open Global Controls window (internal services missing).");
        }
        return null;
    }

    const openWindows = getOpenWindows();

    if (openWindows.has(windowId) && !savedState) {
        const win = openWindows.get(windowId);
        if (win && !win.element) { // Window instance exists but DOM element is gone
            if (removeWindowFromStore) {
                removeWindowFromStore(windowId);
            }
            // Proceed to create new window
        } else if (win && win.focus && typeof win.focus === 'function') {
            win.focus();
            return win;
        }
    }

    const contentHTML = `
        <div class="p-2 space-y-2 text-sm">
            <div class="grid grid-cols-3 gap-2 text-center">
                <button id="playBtnGlobal" class="p-2 bg-slate-700 hover:bg-green-600 rounded-md" title="Play/Pause"><i class="fas fa-play"></i></button>
                <button id="stopBtnGlobal" class="p-2 bg-slate-700 hover:bg-slate-600 rounded-md" title="Stop"><i class="fas fa-stop"></i></button>
                <button id="recordBtnGlobal" class="p-2 bg-slate-700 hover:bg-red-600 rounded-md text-red-500" title="Record"><i class="fas fa-circle"></i></button>
            </div>
            <div class="flex items-center space-x-2">
                <label for="tempoGlobalInput" class="text-xs">BPM:</label>
                <input type="number" id="tempoGlobalInput" min="${Constants.MIN_TEMPO}" max="${Constants.MAX_TEMPO}" value="${(typeof Tone !== 'undefined' && Tone.Transport) ? Tone.Transport.bpm.value.toFixed(1) : '120.0'}" class="w-20 bg-slate-900 text-white p-1 rounded-md text-center text-xs">
            </div>
             <div class="flex items-center space-x-2">
                <label for="playbackModeToggleBtnGlobal" class="text-xs">Mode:</label>
                <button id="playbackModeToggleBtnGlobal" class="flex-grow p-1 bg-slate-700 hover:bg-blue-600 rounded-md text-xs">Sequencer</button>
            </div>
            <hr class="border-slate-600 my-2">
            <div class="flex items-center space-x-2">
                 <label for="midiInputSelectGlobal" class="text-xs">MIDI In:</label>
                 <select id="midiInputSelectGlobal" class="flex-grow bg-slate-900 text-white p-1 rounded-md text-xs">
                    <option value="none">None</option>
                    </select>
            </div>
             <div class="flex items-center space-x-2 text-xs">
                <span>Indicators:</span>
                <div id="midiIndicatorGlobal" title="MIDI Input" class="w-4 h-4 bg-slate-600 rounded-full"></div>
                <div id="keyboardIndicatorGlobal" title="Keyboard Input" class="w-4 h-4 bg-slate-600 rounded-full"></div>
            </div>
            <hr class="border-slate-600 my-2">
             <div>
                <span class="text-xs">Master Volume</span>
                 <div id="masterMeterContainerGlobal" class="w-full h-4 bg-slate-900 rounded-md overflow-hidden relative border border-slate-600">
                    <div id="masterMeterBarGlobal" class="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" style="width: 0%;"></div>
                </div>
            </div>
        </div>
    `;

    const options = { 
        width: 250, minWidth: 230, 
        height: 340, minHeight: 320, 
        closable: true, minimizable: true, resizable: true, 
        initialContentKey: windowId 
    };
    if (savedState) {
        Object.assign(options, { 
            x: parseInt(savedState.left,10), 
            y: parseInt(savedState.top,10), 
            width: parseInt(savedState.width,10), 
            height: parseInt(savedState.height,10), 
            zIndex: savedState.zIndex, 
            isMinimized: savedState.isMinimized 
        });
    }
    
    const newWindow = createWindow(windowId, 'Global Controls', contentHTML, options);

    if (newWindow?.element && typeof onReadyCallback === 'function') {
        // Pass the actual DOM elements to the callback in main.js,
        // which will then pass them to eventHandlers.attachGlobalControlEvents
        onReadyCallback({
            playBtnGlobal: newWindow.element.querySelector('#playBtnGlobal'),
            recordBtnGlobal: newWindow.element.querySelector('#recordBtnGlobal'),
            stopBtnGlobal: newWindow.element.querySelector('#stopBtnGlobal'),
            tempoGlobalInput: newWindow.element.querySelector('#tempoGlobalInput'),
            midiInputSelectGlobal: newWindow.element.querySelector('#midiInputSelectGlobal'),
            masterMeterContainerGlobal: newWindow.element.querySelector('#masterMeterContainerGlobal'),
            masterMeterBarGlobal: newWindow.element.querySelector('#masterMeterBarGlobal'),
            midiIndicatorGlobal: newWindow.element.querySelector('#midiIndicatorGlobal'),
            keyboardIndicatorGlobal: newWindow.element.querySelector('#keyboardIndicatorGlobal'),
            playbackModeToggleBtnGlobal: newWindow.element.querySelector('#playbackModeToggleBtnGlobal')
        });
    } else if (!newWindow?.element) {
        console.error(`[GlobalControlsUI] Failed to create window element for "${windowId}".`);
    }
    return newWindow;
}
