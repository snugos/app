// js/ui/pianoRollUI.js - Piano Roll UI Management with Konva.js
import * as Constants from '../constants.js';

let localAppServices = {};
export const openPianoRolls = new Map();
export let lastActivePianoRollTrackId = null; 

function getThemeColors() {
    const rootStyle = getComputedStyle(document.documentElement);
    return {
        gridBgLight: rootStyle.getPropertyValue('--bg-sequencer-step-odd').trim() || '#FFFFFF',
        gridBgDark: rootStyle.getPropertyValue('--bg-sequencer-step-even').trim() || '#EEEEEE',
        gridLine: rootStyle.getPropertyValue('--border-sequencer').trim() || '#BBBBBB',
        gridLineBold: rootStyle.getPropertyValue('--border-primary').trim() || '#555555',
        noteFill: rootStyle.getPropertyValue('--accent-sequencer-step').trim() || '#00BFFF',
        noteStroke: rootStyle.getPropertyValue('--accent-sequencer-step-border').trim() || '#0000FF',
        playhead: rootStyle.getPropertyValue('--accent-playhead').trim() || '#FF0000',
        whiteKeyBg: rootStyle.getPropertyValue('--bg-primary').trim(),
        blackKeyBg: rootStyle.getPropertyValue('--text-primary').trim(),
        whiteKeyText: rootStyle.getPropertyValue('--text-primary').trim(),
        blackKeyText: rootStyle.getPropertyValue('--bg-primary').trim(),
        keyBorder: rootStyle.getPropertyValue('--border-secondary').trim(),
    };
}


export function initializePianoRollUI(appServicesFromMain) {
    localAppServices = appServicesFromMain;
}

export function openPianoRollWindow(trackId, sequenceIdToEdit = null, savedState = null) {
    const track = localAppServices.getTrackById?.(trackId);
    if (!track || track.type === 'Audio') return;

    const windowId = `pianoRollWin-${trackId}`;
    if (localAppServices.getOpenWindows?.().has(windowId) && !savedState) {
        localAppServices.getOpenWindows().get(windowId).restore();
        return;
    }

    const sequenceId = sequenceIdToEdit || track.getActiveSequence()?.id;
    const activeSequence = track.sequences.find(s => s.id === sequenceId);

    if (!activeSequence) {
        localAppServices.showNotification?.(`Track "${track.name}" has no valid sequence to edit.`, 3500);
        return;
    }
    track.activeSequenceId = activeSequence.id;
    
    const lengthInBars = (activeSequence.length / Constants.STEPS_PER_BAR).toFixed(2);

    const contentContainer = document.createElement('div');
    contentContainer.className = 'w-full h-full flex flex-col bg-white dark:bg-black text-black dark:text-white';
    contentContainer.innerHTML = `
        <div class="flex-shrink-0 p-1 border-b border-gray-400 dark:border-gray-600 flex items-center justify-between text-xs">
            <div class="flex items-center space-x-2">
                <label for="sequenceLengthInput-${trackId}">Length (bars):</label>
                <input type="text" id="sequenceLengthInput-${trackId}" value="${lengthInBars}" class="w-20 p-0.5 border rounded bg-white dark:bg-black border-black dark:border-white text-black dark:text-white">
            </div>
            <div id="piano-roll-drag-handle-${trackId}" class="cursor-grab" title="Drag to create a clip on the timeline" draggable="true">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </div>
        </div>
        <div id="pianoRollKonvaContainer-${trackId}" class="flex-grow w-full h-full overflow-auto"></div>
        <div id="velocityPaneContainer-${trackId}" class="flex-shrink-0 w-full h-1/5 bg-gray-200 dark:bg-gray-800 border-t-2 border-gray-400 dark:border-gray-600 overflow-x-auto overflow-y-hidden"></div>
    `;

    const pianoRollWindow = localAppServices.createWindow(windowId, `Piano Roll: ${track.name}`, contentContainer, { 
        width: 800, height: 500, minWidth: 500, minHeight: 300, initialContentKey: windowId,
        onCloseCallback: () => {
            openPianoRolls.delete(trackId);
            if (lastActivePianoRollTrackId === trackId) {
                lastActivePianoRollTrackId = null;
            }
        }
    });

    if (pianoRollWindow && pianoRollWindow.element) {
        const konvaContainer = pianoRollWindow.element.querySelector(`#pianoRollKonvaContainer-${trackId}`);
        const velocityPane = pianoRollWindow.element.querySelector(`#velocityPaneContainer-${trackId}`);
        setTimeout(() => createPianoRollStage(konvaContainer, velocityPane, track), 50);
    }
}

export function updatePianoRollPlayhead(transportTime) {
    if (openPianoRolls.size === 0) return;
    const pixelsPerSecond = (Tone.Transport.bpm.value / 60) * 4 * Constants.PIANO_ROLL_SIXTEENTH_NOTE_WIDTH;
    const keyWidth = Constants.PIANO_ROLL_KEY_WIDTH;
    const newX = transportTime * pixelsPerSecond + keyWidth;
    openPianoRolls.forEach(({ playhead, layer }) => {
        if (playhead && layer) {
            playhead.x(newX);
            layer.batchDraw();
        }
    });
}

function renderVelocityPane(velocityPane, track) {
    // ... (This function remains the same)
}

function drawPianoKeys(stage, stageHeight, track, colors) {
    // ... (This function remains the same)
}

function drawGrid(stage, stageWidth, stageHeight, numSteps, colors) {
    // ... (This function remains the same)
}

function redrawNotes(noteLayer, track, colors, selectedNotes) {
    // ... (This function remains the same)
}

// REWRITTEN to be more robust
function createPianoRollStage(containerElement, velocityPane, track) {
    if (typeof Konva === 'undefined' || !containerElement.parentElement) {
        setTimeout(() => createPianoRollStage(containerElement, velocityPane, track), 100);
        return;
    }

    const activeSequence = track.getActiveSequence();
    if (!activeSequence) return;
    
    const colors = getThemeColors();
    const numSteps = activeSequence.length;
    const stageWidth = (Constants.PIANO_ROLL_SIXTEENTH_NOTE_WIDTH * numSteps) + Constants.PIANO_ROLL_KEY_WIDTH;
    const stageHeight = Constants.PIANO_ROLL_NOTE_HEIGHT * Constants.SYNTH_PITCHES.length;
    
    containerElement.innerHTML = '';
    const stage = new Konva.Stage({ container: containerElement, width: stageWidth, height: stageHeight });

    const gridLayer = new Konva.Layer();
    stage.add(gridLayer);

    const noteLayer = new Konva.Layer();
    stage.add(noteLayer);

    const selectionLayer = new Konva.Layer();
    stage.add(selectionLayer);

    const playheadLayer = new Konva.Layer();
    stage.add(playheadLayer);

    const keyLayer = new Konva.Layer();
    stage.add(keyLayer);

    const selectedNotes = new Set();
    const pianoRoll = { stage, gridLayer, noteLayer, keyLayer, playheadLayer, track, selectedNotes, velocityPane, colors };
    openPianoRolls.set(track.id, pianoRoll);

    // Initial Draw
    drawGrid(gridLayer, stageWidth, stageHeight, numSteps, colors);
    drawPianoKeys(keyLayer, stageHeight, track, colors);
    redrawNotes(noteLayer, track, colors, selectedNotes);
    
    const playhead = new Konva.Line({ points: [0, 0, 0, stageHeight], stroke: colors.playhead, strokeWidth: 1.5, listening: false });
    playheadLayer.add(playhead);
    
    keyLayer.moveToTop();
    playheadLayer.moveToTop();
    
    renderVelocityPane(velocityPane, track);
    stage.batchDraw();

    // Attach all event listeners
    attachPianoRollListeners(pianoRoll);
}

// NEW: All event logic is now in its own function for clarity
function attachPianoRollListeners(pianoRoll) {
    const { stage, gridLayer, noteLayer, track, selectedNotes, velocityPane, colors } = pianoRoll;
    const activeSequence = track.getActiveSequence();
    const selectionRect = new Konva.Rect({ fill: 'rgba(0, 100, 255, 0.3)', visible: false });
    stage.getLayers().find(l => l !== gridLayer && l !== noteLayer).add(selectionRect);

    let x1, y1;
    stage.on('mousedown.selection', (e) => {
        if (e.target.getParent() === noteLayer || e.target.getParent() === keyLayer) return;
        lastActivePianoRollTrackId = track.id;
        x1 = stage.getPointerPosition().x;
        y1 = stage.getPointerPosition().y;
        selectionRect.visible(true).width(0).height(0);
    });

    stage.on('mousemove.selection', () => {
        if (!selectionRect.visible()) return;
        const { x: x2, y: y2 } = stage.getPointerPosition();
        selectionRect.setAttrs({ x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) });
    });

    stage.on('mouseup.selection', (e) => {
        if (!selectionRect.visible()) return;
        selectionRect.visible(false);
        if (!e.evt.shiftKey) selectedNotes.clear();
        const box = selectionRect.getClientRect();
        noteLayer.children.forEach(noteShape => {
            if (Konva.Util.haveIntersection(box, noteShape.getClientRect())) {
                const noteId = noteShape.id();
                if (selectedNotes.has(noteId) && e.evt.shiftKey) selectedNotes.delete(noteId);
                else selectedNotes.add(noteId);
            }
        });
        redrawNotes(noteLayer, track, colors, selectedNotes);
    });

    stage.on('contextmenu', (e) => {
        e.evt.preventDefault();
        lastActivePianoRollTrackId = track.id;
        const clickedOnNote = e.target.getParent() === noteLayer;

        if (clickedOnNote) {
            const noteId = e.target.id();
            localAppServices.createContextMenu(e.evt, [{
                label: `Delete Note`,
                action: () => {
                    track.removeNotesFromSequence(activeSequence.id, new Set([noteId]));
                    selectedNotes.delete(noteId);
                    redrawNotes(noteLayer, track, colors, selectedNotes);
                    renderVelocityPane(velocityPane, track);
                }
            }], localAppServices);
        }
    });

    stage.on('click tap', (e) => {
        lastActivePianoRollTrackId = track.id;
        const clickedOnNote = e.target.getParent() === noteLayer;

        if (clickedOnNote) {
            const noteId = e.target.id();
            if (!e.evt.shiftKey) {
                selectedNotes.clear();
                selectedNotes.add(noteId);
            } else {
                selectedNotes.has(noteId) ? selectedNotes.delete(noteId) : selectedNotes.add(noteId);
            }
        } else {
            selectedNotes.clear();
            if (e.target.getParent() !== keyLayer) {
                const pos = stage.getPointerPosition();
                const keyWidth = Constants.PIANO_ROLL_KEY_WIDTH;
                if (pos.x < keyWidth) return;
                const timeStep = Math.floor((pos.x - keyWidth) / Constants.PIANO_ROLL_SIXTEENTH_NOTE_WIDTH);
                const pitchIndex = Math.floor(pos.y / Constants.PIANO_ROLL_NOTE_HEIGHT);
                track.addNoteToSequence(activeSequence.id, pitchIndex, timeStep);
                renderVelocityPane(velocityPane, track);
            }
        }
        redrawNotes(noteLayer, track, colors, selectedNotes);
    });
    
    const lengthInput = document.getElementById(`sequenceLengthInput-${track.id}`);
    lengthInput?.addEventListener('change', (e) => {
        const barValue = parseFloat(e.target.value);
        if (isNaN(barValue) || barValue <= 0 || barValue > Constants.MAX_BARS) {
            e.target.value = (activeSequence.length / Constants.STEPS_PER_BAR).toFixed(2);
            return;
        }
        const newLengthInSteps = Math.round(barValue * Constants.STEPS_PER_BAR);
        track.setSequenceLength(activeSequence.id, newLengthInSteps);
        
        const win = localAppServices.getWindowById(`pianoRollWin-${track.id}`);
        if(win) {
            win.close(true);
            localAppServices.openPianoRollWindow(track.id);
        }
    });
}
