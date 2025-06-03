// js/globalControlsUI.js - UI for Global Controls Window

import { SnugWindow } from './SnugWindow.js';
import * as Constants from './constants.js';

let localAppServices = {};

export function initializeGlobalControlsUIModule(appServicesFromMain) {
    localAppServices = appServicesFromMain;
}

export function openGlobalControlsWindow(onReadyCallback, savedState = null) {
    const windowId = 'globalControls';
    const getOpenWindows = localAppServices.getOpenWindowsState || (() => new Map());
    const removeWindowFromStore = localAppServices.removeWindowFromStoreState;
    const createWindow = (id, title, content, options) => new SnugWindow(id, title, content, options, localAppServices);

    const openWindows = getOpenWindows();

    if (openWindows.has(windowId) && !savedState) {
        const win = openWindows.get(windowId);
        if (win && !win.element) {
            if (removeWindowFromStore) {
                removeWindowFromStore(windowId);
            }
        } else if (win) {
            win.focus();
            return win;
        }
    }

    const contentHTML = `
        <div class="p-2 space-y-2">
            <div class="grid grid-cols-3 gap-2 text-center">
                <button id="playBtnGlobal" class="p-2 bg-slate-700 hover:bg-green-600 rounded-md"><i class="fas fa-play"></i></button>
                <button id="stopBtnGlobal" class="p-2 bg-slate-700 hover:bg-slate-600 rounded-md"><i class="fas fa-stop"></i></button>
                <button id="recordBtnGlobal" class="p-2 bg-slate-700 hover:bg-red-600 rounded-md text-red-500"><i class="fas fa-circle"></i></button>
            </div>
            <div class="flex items-center space-x-2">
                <label for="tempoGlobalInput" class="text-sm">BPM:</label>
                <input type="number" id="tempoGlobalInput" min="${Constants.MIN_TEMPO}" max="${Constants.MAX_TEMPO}" value="120" class="w-20 bg-slate-900 text-white p-1 rounded-md text-center">
            </div>
             <div class="flex items-center space-x-2">
                <label for="playbackModeToggleBtnGlobal" class="text-sm">Mode:</label>
                <button id="playbackModeToggleBtnGlobal" class="flex-grow p-1 bg-slate-700 hover:bg-blue-600 rounded-md text-sm">Sequencer</button>
            </div>
            <hr class="border-slate-600 my-2">
            <div class="flex items-center space-x-2">
                 <label for="midiInputSelectGlobal" class="text-sm">MIDI In:</label>
                 <select id="midiInputSelectGlobal" class="flex-grow bg-slate-900 text-white p-1 rounded-md text-sm">
                    <option value="none">None</option>
                 </select>
            </div>
             <div class="flex items-center space-x-2 text-sm">
                <span>Indicators:</span>
                <div id="midiIndicatorGlobal" title="MIDI Input" class="w-5 h-5 bg-slate-600 rounded-full"></div>
                <div id="keyboardIndicatorGlobal" title="Keyboard Input" class="w-5 h-5 bg-slate-600 rounded-full"></div>
            </div>
            <hr class="border-slate-600 my-2">
             <div>
                <span class="text-sm">Master Volume</span>
                 <div id="masterMeterContainerGlobal" class="w-full h-5 bg-slate-900 rounded-md overflow-hidden relative border border-slate-600">
                    <div id="masterMeterBarGlobal" class="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-red-500" style="width: 0%;"></div>
                </div>
            </div>
        </div>
    `;

    const options = { width: 250, minWidth: 220, height: 340, minHeight: 340, closable: true, minimizable: true, resizable: true, initialContentKey: windowId };
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
