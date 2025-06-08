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

export function openPianoRollWindow(trackId, sequenceId = null, savedState = null) {
    const track = localAppServices.getTrackById?.(trackId);
    if (!track || track.type === 'Audio') return;

    const windowId = `pianoRollWin-${trackId}`;
    if (localAppServices.getOpenWindows?.().has(windowId) && !savedState) {
        localAppServices.getOpenWindows().get(windowId).restore();
        return;
    }

    let activeSequence = sequenceId ? track.sequences.find(s => s.id === sequenceId) : track.getActiveSequence();
    if (!activeSequence) {
        activeSequence = track.sequences[0];
        if (!activeSequence) {
            localAppServices.showNotification?.(`Track "${track.name}" has no sequences.`, 3500);
            return;
        }
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
    // ... (This function remains the same as before)
}

function drawPianoKeys(stage, stageHeight, track, colors) {
    // ... (This function remains the same as before)
}

function drawGrid(stage, stageWidth, stageHeight, numSteps, colors) {
    // ... (This function remains the same as before)
}

function redrawNotes(noteLayer, track, colors, selectedNotes) {
    const activeSequence = track.getActiveSequence();
    if (!activeSequence) return;

    noteLayer.destroyChildren(); 
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
                    draggable: false, // We handle drag logic manually
                });
                
                // --- NEW: Add event listeners for resizing ---
                noteRect.on('mouseenter', () => {
                    const stage = noteRect.getStage();
                    if (stage) stage.container().style.cursor = 'ew-resize';
                });
                noteRect.on('mouseleave', () => {
                    const stage = noteRect.getStage();
                    if (stage) stage.container().style.cursor = 'default';
                });

                noteRect.on('mousedown', (e) => {
                    e.cancelBubble = true; // Prevent stage's click/selection events
                    const stage = e.target.getStage();
                    const originalWidth = e.target.width();
                    const startX = stage.getPointerPosition().x;
                    const originalDuration = note.duration || 1;

                    function onMouseMove() {
                        const currentX = stage.getPointerPosition().x;
                        const dx = currentX - startX;
                        const newWidth = originalWidth + dx;
                        const newDuration = Math.max(1, Math.round(newWidth / noteWidth));
                        
                        // Update visual width in real-time
                        e.target.width((newDuration * noteWidth) - 2);
                    }

                    function onMouseUp() {
                        document.removeEventListener('mousemove', onMouseMove);
                        document.removeEventListener('mouseup', onMouseUp);
                        stage.container().style.cursor = 'default';
                        
                        // Finalize the duration change in the track's state
                        const finalDuration = Math.max(1, Math.round(e.target.width() / noteWidth));
                        if (finalDuration !== originalDuration) {
                            track.setNoteDuration(activeSequence.id, pitchIndex, timeStep, finalDuration);
                            // No full redraw needed, just update this note's data
                        }
                    }
                    
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);
                });


                noteLayer.add(noteRect);
            }
        });
    });
    noteLayer.batchDraw();
}

function createPianoRollStage(containerElement, velocityPane, track) {
    // This function's core structure remains the same, but the redrawNotes
    // function it calls now contains the new logic. All other event handlers
    // from our previous changes (selection, context menu, etc.) are still here.
    
    if (typeof Konva === 'undefined' || !containerElement || !containerElement.parentElement || containerElement.parentElement.offsetWidth <= 0) {
        setTimeout(() => createPianoRollStage(containerElement, velocityPane, track), 100);
        return;
    }
    const activeSequence = track.getActiveSequence();
    if (!activeSequence) return;
    const colors = getThemeColors();
    const numSteps = activeSequence.length;
    const totalGridWidth = Constants.PIANO_ROLL_SIXTEENTH_NOTE_WIDTH * numSteps;
    const totalGridHeight = Constants.PIANO_ROLL_NOTE_HEIGHT * Constants.SYNTH_PITCHES.length;
    const stageWidth = totalGridWidth + Constants.PIANO_ROLL_KEY_WIDTH;
    const stageHeight = totalGridHeight;
    containerElement.innerHTML = '';
    const stage = new Konva.Stage({ container: containerElement, width: stageWidth, height: stageHeight });
    const gridLayer = drawGrid(stage, stageWidth, stageHeight, numSteps, colors);
    stage.add(gridLayer);
    const selectedNotes = new Set();
    const noteLayer = new Konva.Layer();
    stage.add(noteLayer);
    redrawNotes(noteLayer, track, colors, selectedNotes);
    const playheadLayer = new Konva.Layer();
    const playhead = new Konva.Line({ points: [0, 0, 0, stageHeight], stroke: colors.playhead, strokeWidth: 1.5, listening: false });
    playheadLayer.add(playhead);
    stage.add(playheadLayer);
    const keyLayer = drawPianoKeys(stage, stageHeight, track, colors);
    stage.add(keyLayer);
    keyLayer.moveToTop();
    playheadLayer.moveToTop();
    openPianoRolls.set(track.id, { stage, noteLayer, track, selectedNotes, velocityPane });
    const selectionLayer = new Konva.Layer();
    stage.add(selectionLayer);
    const selectionRect = new Konva.Rect({ fill: 'rgba(0, 100, 255, 0.3)', visible: false });
    selectionLayer.add(selectionRect);

    // ... (selection and context menu event handlers remain here, unchanged)
    
    const lengthInput = document.getElementById(`sequenceLengthInput-${track.id}`);
    if (lengthInput) {
        lengthInput.addEventListener('change', (e) => {
            const barValue = parseFloat(e.target.value);
            const maxBars = Constants.MAX_BARS;
            if (isNaN(barValue) || barValue <= 0 || barValue > maxBars) {
                localAppServices.showNotification?.(`Length must be a number between 0 and ${maxBars}.`, 3000);
                e.target.value = (activeSequence.length / Constants.STEPS_PER_BAR).toFixed(2);
                return;
            }
            const newLengthInSteps = Math.round(barValue * Constants.STEPS_PER_BAR);
            track.setSequenceLength(activeSequence.id, newLengthInSteps);
            createPianoRollStage(containerElement, velocityPane, track);
        });
    }
    renderVelocityPane(velocityPane, track);
}
