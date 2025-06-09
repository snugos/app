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
    openPianoRolls.forEach(({ playhead, playheadLayer }) => {
        if (playhead && playheadLayer) {
            playhead.x(newX);
            playheadLayer.batchDraw();
        }
    });
}

function renderVelocityPane(velocityPane, track) {
    // ... (This function remains the same as before)
}

function drawPianoKeys(layer, stageHeight, track, colors) {
    // ... (This function remains the same as before)
}

function drawGrid(layer, stageWidth, stageHeight, numSteps, colors) {
    // ... (This function remains the same as before)
}

function redrawNotes(noteLayer, track, colors, selectedNotes) {
    noteLayer.destroyChildren(); 
    const activeSequence = track.getActiveSequence();
    if (!activeSequence) {
        noteLayer.batchDraw();
        return;
    }
    const sequenceData = activeSequence.data;
    const keyWidth = Constants.PIANO_ROLL_KEY_WIDTH;
    const noteHeight = Constants.PIANO_ROLL_NOTE_HEIGHT;
    const noteWidth = Constants.PIANO_ROLL_SIXTEENTH_NOTE_WIDTH;
    sequenceData.forEach((pitchRow, pitchIndex) => {
        pitchRow.forEach((note, timeStep) => {
            if (note) {
                const noteId = `${pitchIndex}-${timeStep}`;
                const isSelected = selectedNotes.has(noteId);
                const noteRect = new Konva.Rect({
                    x: timeStep * noteWidth + keyWidth + 1,
                    y: pitchIndex * noteHeight + 1,
                    width: noteWidth * (note.duration || 1) - 2,
                    height: noteHeight - 2,
                    fill: colors.noteFill,
                    stroke: isSelected ? 'yellow' : colors.noteStroke,
                    strokeWidth: isSelected ? 2.5 : 1,
                    opacity: note.velocity ? (0.5 + note.velocity * 0.5) : 1,
                    cornerRadius: 2,
                    id: noteId,
                    draggable: false, 
                });
                
                noteRect.on('mouseenter', (e) => {
                    const stage = e.target.getStage();
                    const mousePos = stage.getPointerPosition();
                    const noteEdge = e.target.x() + e.target.width() - 5;
                    if(mousePos.x > noteEdge) {
                        if(stage) stage.container().style.cursor = 'ew-resize';
                    } else {
                        if(stage) stage.container().style.cursor = 'pointer';
                    }
                });
                noteRect.on('mouseleave', (e) => {
                    const stage = e.target.getStage();
                    if(stage) stage.container().style.cursor = 'default';
                });
                noteRect.on('mousedown', (e) => {
                    if (e.evt.button !== 0) return; 
                    const stage = e.target.getStage();
                    const mousePos = stage.getPointerPosition();
                    const noteEdge = e.target.x() + e.target.width() - 5;
                    if (mousePos.x > noteEdge) {
                        e.cancelBubble = true;
                        const originalWidth = e.target.width();
                        const startX = mousePos.x;
                        const originalDuration = note.duration || 1;
                        function onMouseMove() {
                            const currentX = stage.getPointerPosition().x;
                            const dx = currentX - startX;
                            const newWidth = originalWidth + dx;
                            const newDuration = Math.max(1, Math.round(newWidth / noteWidth));
                            e.target.width((newDuration * noteWidth) - 2);
                            noteLayer.batchDraw();
                        }
                        function onMouseUp() {
                            document.removeEventListener('mousemove', onMouseMove);
                            document.removeEventListener('mouseup', onMouseUp);
                            stage.container().style.cursor = 'default';
                            const finalDuration = Math.max(1, Math.round(e.target.width() / noteWidth));
                            if (finalDuration !== originalDuration) {
                                track.setNoteDuration(activeSequence.id, pitchIndex, timeStep, finalDuration);
                                localAppServices.captureStateForUndo?.(`Set note duration on ${track.name}`);
                            }
                        }
                        document.addEventListener('mousemove', onMouseMove);
                        document.addEventListener('mouseup', onMouseUp);
                    }
                });
                noteLayer.add(noteRect);
            }
        });
    });
    noteLayer.batchDraw();
}

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

    drawGrid(gridLayer, stageWidth, stageHeight, numSteps, colors);
    drawPianoKeys(keyLayer, stageHeight, track, colors);
    redrawNotes(noteLayer, track, colors, selectedNotes);
    
    const playhead = new Konva.Line({ points: [0, 0, 0, stageHeight], stroke: colors.playhead, strokeWidth: 1.5, listening: false });
    playheadLayer.add(playhead);
    pianoRoll.playhead = playhead;
    
    keyLayer.moveToTop();
    playheadLayer.moveToTop();
    
    renderVelocityPane(velocityPane, track);
    stage.batchDraw();

    attachPianoRollListeners(pianoRoll);

    const dragHandle = document.getElementById(`piano-roll-drag-handle-${track.id}`);
    if (dragHandle) {
        dragHandle.addEventListener('dragstart', (e) => {
            const dragData = {
                type: 'piano-roll-sequence',
                trackId: track.id,
                sequenceId: activeSequence.id,
                name: activeSequence.name,
                durationInSteps: activeSequence.length,
            };
            e.dataTransfer.setData('application/json', JSON.stringify(dragData));
            e.dataTransfer.effectAllowed = 'copy';
        });
    }
}

function attachPianoRollListeners(pianoRoll) {
    const { stage, gridLayer, noteLayer, keyLayer, track, selectedNotes, velocityPane, colors } = pianoRoll;
    const activeSequence = track.getActiveSequence();
    const selectionRect = new Konva.Rect({ fill: 'rgba(0, 100, 255, 0.3)', visible: false });
    stage.getLayers().find(l => l !== gridLayer && l !== noteLayer && l !== keyLayer).add(selectionRect);

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
        selectedNotes.clear();
        const box = selectionRect.getClientRect();
        noteLayer.children.forEach(noteShape => {
            if (Konva.Util.haveIntersection(box, noteShape.getClientRect())) {
                selectedNotes.add(noteShape.id());
            }
        });
        redrawNotes(noteLayer, track, colors, selectedNotes);
    });

    stage.on('contextmenu', (e) => {
        e.evt.preventDefault();
        lastActivePianoRollTrackId = track.id;
        const clickedOnNote = e.target.getParent() === noteLayer;
        const menuItems = [];

        if (clickedOnNote) {
            const noteId = e.target.id();
            const [pitchIndex, timeStep] = noteId.split('-').map(Number);
            track.removeNoteFromSequence(activeSequence.id, pitchIndex, timeStep);
            selectedNotes.delete(noteId);
            redrawNotes(noteLayer, track, colors, selectedNotes);
            renderVelocityPane(velocityPane, track);
        } else {
            if (selectedNotes.size > 0) {
                menuItems.push({
                    label: `Copy ${selectedNotes.size} Note(s)`,
                    action: () => track.copyNotesToClipboard(activeSequence.id, selectedNotes)
                });
            }
            const clipboard = localAppServices.getClipboardData?.();
            if (clipboard?.type === 'piano-roll-notes') {
                menuItems.push({
                    label: `Paste ${clipboard.notes.length} Note(s)`,
                    action: () => {
                        const pos = stage.getPointerPosition();
                        const pasteTimeStep = Math.floor((pos.x - Constants.PIANO_ROLL_KEY_WIDTH) / Constants.PIANO_ROLL_SIXTEENTH_NOTE_WIDTH);
                        const pastePitchIndex = Math.floor(pos.y / Constants.PIANO_ROLL_NOTE_HEIGHT);
                        track.pasteNotesFromClipboard(activeSequence.id, pastePitchIndex, pasteTimeStep);
                        redrawNotes(noteLayer, track, colors, selectedNotes);
                        renderVelocityPane(velocityPane, track);
                    }
                });
            }
            if (menuItems.length > 0) menuItems.push({ separator: true });
            menuItems.push({ label: 'Duplicate Sequence', action: () => track.duplicateSequence(activeSequence.id) });
            menuItems.push({ label: 'Clear All Notes', action: () => track.clearSequence(activeSequence.id) });
            
            if (menuItems.length > 0) {
                localAppServices.createContextMenu(e.evt, menuItems, localAppServices);
            }
        }
    });

    stage.on('click tap', function (e) {
        if (e.evt.button !== 0) return; 

        lastActivePianoRollTrackId = track.id;
        const pos = stage.getPointerPosition();
        const clickedOnNote = e.target.getParent() === noteLayer;
        const keyWidth = Constants.PIANO_ROLL_KEY_WIDTH;

        if (pos.x < keyWidth) return;

        const timeStep = Math.floor((pos.x - keyWidth) / Constants.PIANO_ROLL_SIXTEENTH_NOTE_WIDTH);
        const pitchIndex = Math.floor(pos.y / Constants.PIANO_ROLL_NOTE_HEIGHT);
        
        const currentActiveSequence = track.getActiveSequence();
        if (!currentActiveSequence || !currentActiveSequence.data[pitchIndex] || timeStep >= currentActiveSequence.length) return;
        
        const noteExists = currentActiveSequence.data[pitchIndex][timeStep];

        if (noteExists) {
            track.removeNoteFromSequence(currentActiveSequence.id, pitchIndex, timeStep);
        } else {
            track.addNoteToSequence(currentActiveSequence.id, pitchIndex, timeStep);
        }

        selectedNotes.clear();
        redrawNotes(noteLayer, track, colors, selectedNotes);
        renderVelocityPane(velocityPane, track);
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
        createPianoRollStage(containerElement, velocityPane, track);
    });
}
