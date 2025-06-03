// js/globalControlsUI.js - UI for Global Controls Window

import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';

let localAppServices = {}; // Will be populated if this module needs to call services directly

export function initializeGlobalControlsUIModule(appServicesFromMain) {
    localAppServices = appServicesFromMain;
}

export function openGlobalControlsWindow(onReadyCallback, savedState = null) {
    const windowId = 'globalControls';
    const getOpenWindows = localAppServices.getOpenWindows || (() => new Map());
    const removeWindowFromStore = localAppServices.removeWindowFromStore;
    const createWindow = localAppServices.createWindow;

    const openWindows = getOpenWindows();

    if (openWindows.has(windowId) && !savedState) {
        const win = openWindows.get(windowId);
        if (win && !win.element) { // Window object exists but DOM element is gone (should not happen ideally)
            if (removeWindowFromStore) {
                removeWindowFromStore(windowId);
                console.log(`[GlobalControlsUI openGlobalControlsWindow] Removed ghost entry for ${windowId}. Proceeding to recreate.`);
            }
            // Fall through to create a new window
        } else if (win && win.element) {
            win.restore(); // Restore if minimized or focus if already open
            // If a callback is provided, re-call it with the existing elements
            if (typeof onReadyCallback === 'function' && win.element) {
                onReadyCallback({
                    playBtnGlobal: win.element.querySelector('#playBtnGlobal'),
                    recordBtnGlobal: win.element.querySelector('#recordBtnGlobal'),
                    stopBtnGlobal: win.element.querySelector('#stopBtnGlobal'),
                    tempoGlobalInput: win.element.querySelector('#tempoGlobalInput'),
                    midiInputSelectGlobal: win.element.querySelector('#midiInputSelectGlobal'),
                    masterMeterContainerGlobal: win.element.querySelector('#masterMeterContainerGlobal'),
                    masterMeterBarGlobal: win.element.querySelector('#masterMeterBarGlobal'),
                    midiIndicatorGlobal: win.element.querySelector('#midiIndicatorGlobal'),
                    keyboardIndicatorGlobal: win.element.querySelector('#keyboardIndicatorGlobal'),
                    playbackModeToggleBtnGlobal: win.element.querySelector('#playbackModeToggleBtnGlobal')
                });
            }
            return win;
        }
    }

    console.log(`[GlobalControlsUI openGlobalControlsWindow] Creating new window instance for ${windowId}.`);
    // Tailwind CSS classes for styling
    const contentHTML = `
        <div id="global-controls-content" class="p-3 space-y-3 text-sm bg-gray-800 dark:bg-slate-800 text-slate-200 dark:text-slate-200 h-full">
            <div class="grid grid-cols-3 gap-2 items-center">
                <button id="playBtnGlobal" title="Play/Pause (Spacebar)" class="px-3 py-1.5 rounded font-semibold shadow-md transition-colors duration-150
                                                                            bg-green-600 hover:bg-green-700 text-white 
                                                                            dark:bg-green-500 dark:hover:bg-green-600">Play</button>
                <button id="stopBtnGlobal" title="Stop All Audio (Panic)" class="px-3 py-1.5 rounded font-semibold shadow-md transition-colors duration-150
                                                                          bg-yellow-500 hover:bg-yellow-600 text-white
                                                                          dark:bg-yellow-500 dark:hover:bg-yellow-600">Stop</button>
                <button id="recordBtnGlobal" title="Record Arm/Disarm" class="px-3 py-1.5 rounded font-semibold shadow-md transition-colors duration-150
                                                                          bg-red-600 hover:bg-red-700 text-white 
                                                                          dark:bg-red-500 dark:hover:bg-red-600">Record</button>
            </div>
            <div>
                <label for="tempoGlobalInput" class="block text-xs font-medium text-gray-400 dark:text-slate-400 mb-0.5">Tempo (BPM):</label>
                <input type="number" id="tempoGlobalInput" value="120" min="${Constants.MIN_TEMPO}" max="${Constants.MAX_TEMPO}" step="0.1" 
                       class="w-full p-1.5 border border-gray-600 dark:border-slate-600 rounded shadow-sm text-sm 
                              bg-gray-700 dark:bg-slate-700 text-slate-100 dark:text-slate-200 
                              focus:ring-blue-500 focus:border-blue-500">
            </div>
            <div>
                <label for="midiInputSelectGlobal" class="block text-xs font-medium text-gray-400 dark:text-slate-400 mb-0.5">MIDI Input:</label>
                <select id="midiInputSelectGlobal" class="w-full p-1.5 border border-gray-600 dark:border-slate-600 rounded shadow-sm text-sm 
                                                       bg-gray-700 dark:bg-slate-700 text-slate-100 dark:text-slate-200 
                                                       focus:ring-blue-500 focus:border-blue-500">
                    <option value="">No MIDI Input</option>
                </select>
            </div>
            <div class="pt-1">
                <label class="block text-xs font-medium text-gray-400 dark:text-slate-400 mb-0.5">Master Level:</label>
                <div id="masterMeterContainerGlobal" class="h-5 w-full bg-gray-700 dark:bg-slate-600 rounded border border-gray-500 dark:border-slate-500 overflow-hidden shadow-inner">
                    <div id="masterMeterBarGlobal" class="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-50 ease-linear" style="width: 0%;"></div>
                </div>
            </div>
            <div class="flex justify-between items-center text-xs mt-1.5">
                <span id="midiIndicatorGlobal" title="MIDI Activity" class="px-2.5 py-1 rounded-full font-medium transition-colors duration-150
                                                                      bg-gray-600 text-gray-300 dark:bg-slate-600 dark:text-slate-300">MIDI</span>
                <span id="keyboardIndicatorGlobal" title="Computer Keyboard Activity" class="px-2.5 py-1 rounded-full font-medium transition-colors duration-150
                                                                               bg-gray-600 text-gray-300 dark:bg-slate-600 dark:text-slate-300">KBD</span>
            </div>
            <div class="mt-2">
                <button id="playbackModeToggleBtnGlobal" title="Toggle Playback Mode (Sequencer/Timeline)" 
                        class="w-full px-3 py-1.5 rounded font-semibold shadow-md transition-colors duration-150
                               bg-sky-600 hover:bg-sky-700 text-white
                               dark:bg-sky-500 dark:hover:bg-sky-600">Mode: Sequencer</button>
            </div>
        </div>`;
    
    const options = { 
        width: 280, height: 380, // Slightly taller for better spacing
        minWidth: 260, minHeight: 360, 
        closable: true, minimizable: true, resizable: true, 
        initialContentKey: windowId 
    };
    if (savedState) {
        Object.assign(options, { 
            x: parseInt(savedState.left,10), y: parseInt(savedState.top,10), 
            width: parseInt(savedState.width,10), height: parseInt(savedState.height,10), 
            zIndex: savedState.zIndex, isMinimized: savedState.isMinimized 
        });
    }
    
    const newWindow = createWindow(windowId, 'Global Controls', contentHTML, options);

    // If a callback is provided, call it with the newly created elements
    if (newWindow?.element && typeof onReadyCallback === 'function') {
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
    }
    return newWindow;
}
