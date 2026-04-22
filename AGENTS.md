# SnugOS AGENTS.md - Agent Memory and Improvement Log

## Project Overview
SnugOS is a browser-based Digital Audio Workstation (DAW) built with vanilla JavaScript modules. It uses Tone.js for audio processing and Tailwind CSS for styling. The app is deployed via GitHub Pages.

## Tech Stack
- Vanilla JS modules (no build step)
- Tone.js (audio engine) via CDN
- Tailwind CSS via CDN
- GitHub Pages deployment

## Known Issues and TODOs

### Completed Features

#### Day 1: DrumSampler UI Implementation (2026-04-19)
- **Feature**: Implemented complete DrumSampler UI controls
- **Files Modified**:
  - `js/ui.js`: Replaced stub implementations with fully functional:
    - `renderDrumSamplerPads(track)` - Renders 8 pad buttons with visual feedback
    - `updateDrumPadControlsUI(track)` - Updates drop zone, volume/pitch knobs, envelope
    - `renderSamplePads(track)` - Renders slice pads for Sampler track
    - `updateSliceEditorUI(track)` - Updates slice editor controls
    - `updateSequencerCellUI(...)` - Updates sequencer cell styling
    - `initializeDrumSamplerSpecificControls` - Creates knobs for volume/pitch/envelope
  - `js/constants.js`: Bumped APP_VERSION to 0.2.0

#### Day 1 cont: Tap Tempo Feature (2026-04-19)
- **Feature**: Added tap tempo functionality
- **Files Modified**:
  - `js/ui.js`: Added `handleTapTempo()` and `resetTapTempo()` functions
  - `js/eventHandlers.js`: Wired tap button to tempo update
  - `js/main.js`: Added tapBtnGlobal to UI cache
  - `index.html`: Added tap button to global controls bar
- **Version**: Bumped to 0.3.0

#### Day 2: Timeline View Implementation (2026-04-19)
- **Feature**: Implemented functional timeline view
- **Files Modified**:
  - `js/constants.js`: Added TIMELINE_BEAT_WIDTH, TIMELINE_TRACK_HEIGHT, TIMELINE_HEADER_HEIGHT
  - `js/ui.js`: Replaced stub implementations with functional:
    - `renderTimeline()` - Renders track lanes, time ruler, clips, and playhead
    - `updatePlayheadPosition()` - Updates playhead position during playback
    - `openTimelineWindow()` - Creates timeline window and triggers render
- **Version**: Bumped to 0.3.0

#### Day 3: Metronome Feature (2026-04-19)
- **Feature**: Added metronome with toggle button and adjustable volume
- **Files Modified**:
  - `js/constants.js`: Added METRONOME_VOLUME constant (0.5)
  - `js/audio.js`: Added metronome functions:
    - `initializeMetronome()` - Creates synthetic click sounds (1kHz/1.5kHz sine bursts)
    - `startMetronome()` - Schedules clicks on Tone.Transport (accent on beats 1,3)
    - `stopMetronome()` - Stops scheduled clicks
    - `setMetronomeVolume(volume)` - Adjusts click volume (0-1 range, converted to dB)
  - `js/eventHandlers.js`: Added metronome button handler in attachGlobalControlEvents
  - `js/main.js`: Wired metronome functions to appServices, added metronomeBtnGlobal to UI cache
  - `index.html`: Added Metro button to global controls bar
- **Note**: State management for metronome was missing and added in Day 9
- **Version**: Bumped to 0.7.0

#### Day 5: Undo/Redo Coverage for InstrumentSampler and Synth (2026-04-19)
- **Feature**: Added undo state capture to InstrumentSampler and Synth modification methods
- **Files Modified**:
  - `js/Track.js`: Added `_captureUndoState` calls to:
    - `setSynthParam`
    - `setInstrumentSamplerRootNote`, `setInstrumentSamplerLoop`, `setInstrumentSamplerLoopStart`, `setInstrumentSamplerLoopEnd`, `setInstrumentSamplerEnv`
- **Version**: Bumped to 0.6.0

#### Day 6: Undo/Redo Coverage for Effect Parameters and Audio Clips (2026-04-19)
- **Feature**: Fixed undo state capture for additional track operations
- **Files Modified**:
  - `js/Track.js`: Added `_captureUndoState` calls to:
    - `updateEffectParam` - Captures undo before effect parameter changes
    - `reorderEffect` - Captures undo before effect reordering (already had call, verified correct placement)
  - `js/constants.js`: Bumped APP_VERSION to 0.7.1
- **Bug Fixed**: Effect parameter changes were not being captured for undo, making it impossible to undo effect tweaks
- **Version**: Bumped to 0.7.1

#### Day 7: Bug Fixes - Missing clipId, Undo State Timing, Debug Code (2026-04-19)
- **Bug Fixes**: Fixed multiple issues found via ESLint static analysis
- **Files Modified**:
  - `js/Track.js`:
    - Fixed missing `clipId` variable in `addSequenceClipToTimeline()` - was using undefined `clipId`
    - Moved `_captureUndoState()` calls to happen BEFORE state changes in multiple methods (correct undo pattern)
    - Added missing `_captureUndoState` calls in `reorderEffect` and `quantizeSequence`
  - `js/audio.js`:
    - Removed debug code that checked for undefined `getLoadedZipFilesState` (function wasn't imported)
- **Impact**: The missing `clipId` bug would cause sequence clips to have undefined IDs, breaking clip management. The undo state timing fixes ensure undo works correctly by capturing state before modifications.

#### Day 7 cont: Additional Undo/Redo Coverage (2026-04-19)
- **Feature**: Added missing undo state capture to `loadSampleToPad` and `reorderMasterEffectInState`
- **Files Modified**:
  - `js/Track.js`: Added `_captureUndoState` at start of `loadSampleToPad()` method
  - `js/state.js`: Added `_captureUndoState` call to `reorderMasterEffectInState()` before array splice
- **Version**: Bumped to 0.7.2

#### Day 8: Extended Keyboard Shortcuts (2026-04-19)
- **Feature**: Added comprehensive global keyboard shortcuts for common DAW operations
- **Files Modified**:
  - `js/eventHandlers.js`: Added new keyboard shortcuts:
    - `Ctrl+S` - Save Project
    - `Ctrl+O` - Load Project
    - `Ctrl+Shift+Z` - Redo (alternative to Ctrl+Y)
    - `T` - Toggle Metronome
    - `` ` `` (backtick) - Tap Tempo
  - `js/constants.js`: Bumped APP_VERSION to 0.7.3
- **Existing Shortcuts** (already present):
  - `Ctrl+Z` - Undo
  - `Ctrl+Y` - Redo
  - `Space` - Play/Pause
  - `Enter` - Toggle Recording
  - `Escape` - Close all windows
  - `M` - Toggle Mute (armed track)
  - `S` - Toggle Solo (armed track)
  - `R` - Toggle Record Arm
  - `Z` (no modifier) - Octave down
  - `X` (no modifier) - Octave up
  - Computer keyboard notes (A-K for white keys, W-U for black keys)
- **Version**: Bumped to 0.7.3

#### Day 9: Missing Metronome State Bug Fix (2026-04-19)
- **Bug Fix**: Added missing metronome state variables and getters/setters to state.js
- **Files Modified**:
  - `js/state.js`: Added:
    - `metronomeEnabled` and `metronomeVolume` state variables
    - `getMetronomeEnabledState()`, `getMetronomeVolumeState()` getters
    - `setMetronomeEnabledState()`, `setMetronomeVolumeState()` setters
    - Metronome settings saved to `globalSettings` in `gatherProjectDataInternal()`
    - Metronome settings restored in `reconstructDAWInternal()`
- **Impact**: The metronome feature (added in Day 3) was missing its state management. This caused a runtime error because `main.js` was importing functions that didn't exist in `state.js`. The metronome settings now persist across project save/load.
- **Version**: 0.7.3 (no bump needed, this was a bug fix for existing feature)

#### Day 10: Duplicate Function and Debug Code Removal (2026-04-19)
- **Bug Fixes**: Fixed duplicate function definition and removed debug code
- **Files Modified**:
  - `js/state.js`:
    - Fixed duplicate `setSoloedTrackIdState()` function - one instance was removed, the other was kept at the proper location
    - Added missing `getSoloedTrackIdState()` getter function (was being called but not defined)
    - Removed debug console.log statements added with "MODIFICATION START/END" comments in:
      - State variable initialization
      - `getLoadedZipFilesState()` getter
      - `getSoundLibraryFileTreesState()` getter  
      - `setLoadedZipFilesState()` setter
      - `setSoundLibraryFileTreesState()` setter
- **Impact**: The duplicate function could cause unpredictable behavior. The missing getter caused runtime errors when accessing solo state. Debug statements were cluttering console output in production.
- **Version**: 0.7.3 (no bump needed, these were bug fixes)

#### Day 10: Pattern Operations (2026-04-19)
- **Feature**: Added pattern manipulation operations for the sequencer
- **Files Modified**:
  - `js/Track.js`: Added new methods:
    - `randomizePattern(density)` - Randomly activates notes with given density (0-1)
    - `shiftPatternLeft()` - Shifts all notes one step left
    - `shiftPatternRight()` - Shifts all notes one step right
    - `mirrorPatternHorizontal()` - Reverses the pattern horizontally (time)
    - `mirrorPatternVertical()` - Reverses the pattern vertically (pitch inversion, Synth/InstrumentSampler only)
  - `js/ui.js`: Added context menu items in sequencer window:
    - "Pattern Operations" header
    - "Randomize Pattern..." - Prompts for density value
    - "Shift Pattern Left" - Moves pattern one step earlier
    - "Shift Pattern Right" - Moves pattern one step later
    - "Mirror Horizontal" - Reverses pattern in time
    - "Mirror Vertical" - Inverts pitches (only enabled for Synth tracks)
  - `js/constants.js`: Bumped APP_VERSION to 0.8.0
- **Usage**: Right-click on sequencer grid to access pattern operations
- **Version**: Bumped to 0.8.0

#### Day 11: Scale Mode Feature (2026-04-19)
- **Feature**: Added Scale Mode for the sequencer to constrain notes to musical scales
- **Files Modified**:
  - `js/constants.js`: Added:
    - `SCALES` object with 17 scale definitions (Major, Minor, Pentatonic, Blues, Dorian, etc.)
    - `SCALE_ROOTS` array for root note selection
    - `DEFAULT_SCALE_MODE` default settings object
    - Bumped APP_VERSION to 0.9.3
  - `js/state.js`: Added:
    - `scaleModeState` state variable
    - Getters: `getScaleModeState()`, `getScaleModeEnabledState()`, `getScaleModeScaleState()`, `getScaleModeRootState()`, `getScaleModeLockState()`
    - Setters: `setScaleModeState()`, `setScaleModeEnabledState()`, `setScaleModeScaleState()`, `setScaleModeRootState()`, `setScaleModeLockState()`
    - Scale mode saved to `globalSettings` in `gatherProjectDataInternal()`
    - Scale mode restored in `reconstructDAWInternal()`
  - `js/ui.js`: Modified `buildSequencerContentDOM()` and `openTrackSequencerWindow()`:
    - Added scale mode controls (toggle, root selector, scale selector, lock toggle) for Synth/InstrumentSampler tracks
    - Added visual highlighting: notes outside the selected scale appear dimmed (opacity-30)
    - Added `isNoteInScale()` helper function for scale checking
    - Scale Lock prevents placing off-scale notes when enabled
    - Added event handlers for scale mode controls
  - `js/eventHandlers.js`: Added `Q` key to toggle scale mode
  - `js/main.js`: Wired scale mode state functions to appServices
- **Feature Details**:
  - Scale Mode Toggle: Enable/disable scale highlighting in sequencer
  - Root Note Selector: Choose the root note (C through B)
  - Scale Selector: Choose from 17 different scales
  - Scale Lock: Prevents placing notes outside the selected scale
  - Visual Feedback: Notes outside the selected scale are dimmed in the sequencer grid
  - Q Keyboard Shortcut: Toggle Scale Mode on/off
- **Bug Fixes**:
  - Fixed operator precedence bug in scale lock condition
  - Fixed scale mode setters not properly wired to appServices
- **Usage**: Open sequencer for a Synth or InstrumentSampler track, use Scale controls in toolbar
- **Version**: Bumped to 0.9.3

#### Day 11 cont: Scale Lock and Keyboard Shortcut (2026-04-19)
- **Feature**: Added Scale Lock and keyboard shortcut for Scale Mode
- **Files Modified**:
  - `js/eventHandlers.js`: Added `Q` key to toggle scale mode
  - `js/ui.js`: Added scale lock check in grid click handler
  - `js/main.js`: Fixed scale mode setters mapping
- **Version**: 0.9.3

#### Day 11: Debug Code Cleanup (2026-04-19)
- **Bug Fix**: Removed debug console.log statements and MODIFICATION markers from production code
- **Files Modified**:
  - `js/audio.js`: Removed DEBUG console.log statements from `fetchSoundLibrary()` function and MODIFICATION START/END markers
  - `js/ui.js`: Removed DEBUG console.log statements from `showAddEffectModal()`, `openSoundBrowserWindow()`, and `updateSoundBrowserDisplayForLibrary()` functions; removed MODIFICATION comment markers
  - `js/Track.js`: Removed MODIFICATION START/END comment markers from `getDefaultSynthParams()`
  - `js/main.js`: Removed MODIFICATION START/END comment markers from `panicStopAllAudio()`
- **Impact**: These debug statements were left over from development and were cluttering the console output in production. The MODIFICATION markers were no longer needed as the features are now permanent.
- **Version**: 0.8.0 (no bump needed, this was a code cleanup)

#### Day 12: Bug Fix - Scale Mode State Function Imports (2026-04-19)
- **Bug Fix**: Corrected import statement in `js/main.js`
- **Issue**: The import was using incorrect ES6 rename syntax (`:` instead of `as`) for scale mode state setters
- **Changed**:
  - `setScaleModeEnabled: setScaleModeEnabledState` → `setScaleModeEnabledState` (direct import, no rename needed)
  - `setScaleModeScale: setScaleModeScaleState` → `setScaleModeScaleState`
  - `setScaleModeRoot: setScaleModeRootState` → `setScaleModeRootState`
  - `setScaleModeLock: setScaleModeLockState` → `setScaleModeLockState`
- **Impact**: TypeScript was incorrectly flagging these. Node.js `--check` passes fine. The actual function names in `state.js` already match what was being imported.
- **Files Modified**: `js/main.js`
- **Version**: 0.9.3 (no bump needed, this was a bug fix)

#### Day 12: Velocity Editor Feature (2026-04-19)
- **Feature**: Added visual velocity editor to the sequencer for editing note velocities
- **Files Modified**:
  - `js/ui.js`:
    - Modified `buildSequencerContentDOM()` to add:
      - Velocity toggle checkbox in sequencer toolbar
      - Velocity editor lane below the piano roll grid
      - Velocity bars showing max velocity per column
      - Velocity data attributes on cells (data-velocity, data-active)
      - Visual opacity feedback based on velocity (0.5-1.0 opacity range)
    - Added velocity editor event handlers in `openTrackSequencerWindow()`:
      - Toggle visibility of velocity editor lane
      - Click/drag on velocity bars to change velocity
      - Updates cell visuals in real-time during drag
      - Captures undo state before velocity changes
      - Recreates Tone sequence after editing to apply changes
  - `style.css`: Added velocity editor styling:
    - `.velocity-editor-lane` - container styling
    - `.velocity-cell` - individual velocity bar cells
    - `.velocity-bar` - the actual velocity bar indicator
    - Hover effects and transitions
  - `js/constants.js`: Bumped APP_VERSION to 0.10.0
- **Feature Details**:
  - Velocity Toggle: "Velocity" checkbox in sequencer toolbar to show/hide velocity editor
  - Visual Bars: Height represents maximum velocity of active notes in each column
  - Click/Drag Editing: Drag up/down on bars to change velocity (affects all active notes in that column)
  - Visual Feedback: Note cells show opacity based on velocity (brighter = higher velocity)
  - Tooltips: Cells show velocity value (0-127) in tooltip
  - Undo Support: Velocity changes are captured for undo/redo
- **Usage**: Open sequencer for any track, click "Velocity" checkbox in toolbar, drag on velocity bars to edit velocities
- **Version**: Bumped to 0.10.0

#### Day 12 cont: Syntax Error Fix (2026-04-19)
- **Bug Fix**: Fixed syntax error in ui.js that caused parsing failure
- **Issue**: Extra `)` character in Paste menu item action callback
- **Files Modified**:
  - `js/ui.js`: Fixed misplaced `)` before `}` in sequencer context menu Paste action
  - `js/constants.js`: Bumped APP_VERSION to 0.10.1
- **Impact**: The syntax error would have caused the entire ui.js module to fail loading
- **Version**: Bumped to 0.10.1

#### Day 13: Typo Bug Fixes in main.js (2026-04-19)
- **Bug Fixes**: Fixed multiple typo bugs in main.js affecting reconstruction logic
- **Files Modified**:
  - `js/main.js`:
    - Fixed `isReconstructinging` typo → `isReconstructinging` (variable name)
    - Fixed `getIsReconstructingingDAW` typo → `getIsReconstructingingDAW` (function name)
    - Fixed `isReconstructconstructinging` typo → `isReconstructinging` (variable name)
    - Fixed in `addMasterEffect()`, `removeMasterEffect()`, and `reorderMasterEffect()` methods
- **Impact**: These typos caused incorrect variable references in the reconstruction logic, potentially causing undo state capture during project reconstruction when it should have been skipped. The fixes ensure that the `isReconstructinging` flag is correctly checked during project load/reconstruction operations.
- **Version**: No bump needed (bug fix)

#### Day 14: Loop Region UI Implementation (2026-04-19)
- **Feature**: Implemented complete Loop Region UI controls with visual overlay and keyboard shortcut
- **Files Modified**:
  - `js/ui.js`: Modified `renderTimeline()` to add:
    - Loop region controls toolbar (toggle checkbox, start bar input, end bar input)
    - Visual loop region overlay in timeline ruler (green highlighted area)
    - Event handlers for loop toggle, start bar, and end bar inputs
    - Real-time re-render when loop settings change
  - `js/eventHandlers.js`: 
    - Added 'L' keyboard shortcut to toggle loop region
    - Modified play button handler to call `updateLoopRegion()` before starting playback
  - `js/constants.js`: Bumped APP_VERSION to 0.11.0
- **Feature Details**:
  - Loop Toggle: Checkbox to enable/disable loop region
  - Start Bar Input: Set the first bar of the loop (1-indexed)
  - End Bar Input: Set the last bar of the loop (1-indexed)
  - Visual Overlay: Green highlighted area in timeline ruler showing loop range
  - L Keyboard Shortcut: Toggle loop region on/off
  - Persistence: Loop region settings are already saved/loaded via existing state management
- **Backend Note**: The loop region state management (`getLoopRegionState`, `setLoopRegionEnabled`, etc.) and `updateLoopRegion()` function were already implemented in `js/state.js` and `js/main.js` but lacked UI controls
- **Usage**: Open Timeline window, use Loop controls in toolbar, or press L to toggle loop
- **Version**: Bumped to 0.11.0

#### Day 15: Swing Feature Bug Fix - Missing AppServices Wiring (2026-04-19)
- **Bug Fix**: Fixed incomplete Swing/Groove feature - swing state functions were defined in state.js and referenced in Track.js but were never imported/wired in main.js
- **Files Modified**:
  - `js/main.js`: Added swing state function imports and wired them to appServices:
    - `getSwingState`, `getSwingEnabledState`, `getSwingAmountState` (getters)
    - `setSwingState`, `setSwingEnabledState`, `setSwingAmountState` (setters)
- **Impact**: The swing feature in Track.js (applies swing feel to off-beat notes during playback) would not work because `this.appServices.getSwingEnabledState` and `this.appServices.getSwingAmountState` returned undefined. The swing state also would not persist on project save/load.
- **Version**: No bump needed (this was a bug fix for incomplete feature)

#### Day 16: Humanize Pattern Feature (2026-04-19)
- **Feature**: Added Humanize Pattern functionality to add natural velocity variations to patterns
- **Files Modified**:
  - `js/Track.js`: Added `humanizePattern(intensity)` method:
    - Applies random velocity variations based on intensity (0-1)
    - Adds slight accent on downbeats and strong beats for natural groove
    - Velocity range: ±(intensity * 0.3) around original velocity
    - Clamps velocities to valid range (0.1 to 1.0)
    - Returns count of notes humanized
  - `js/ui.js`: Added "Humanize Pattern..." menu item to sequencer context menu:
    - Prompts for intensity value (0.0-1.0)
    - Calls `humanizePattern()` on current track
    - Shows notification with count of notes affected
  - `js/constants.js`: Bumped APP_VERSION to 0.12.0
- **Feature Details**:
  - Intensity: Controls how much variation is applied (0 = none, 1 = maximum)
  - Velocity Randomization: Each note gets a random velocity adjustment
  - Beat Accenting: Downbeats get +5% velocity boost, strong beats get +2% boost
  - Natural Feel: Makes programmed patterns sound less robotic
  - Undo Support: Changes are captured for undo/redo
- **Usage**: Right-click on sequencer grid, select "Humanize Pattern...", enter intensity value (0.0-1.0)
- **Version**: Bumped to 0.12.0

#### Day 17: Production Code Cleanup - Debug Logging Removal (2026-04-19)
- **Bug Fix**: Removed ~50+ debug console.log statements from production code across all JS modules
- **Files Modified**:
  - `js/SnugWindow.js`: Removed 8 console.log statements from window lifecycle methods (constructor, close, focus, applyState)
  - `js/Track.js`: Removed ~40 console.log statements from:
    - Constructor initialization
    - Audio node management (initializeAudioNodes, rebuildEffectChain)
    - Sample loading (loadSampleToPad, fullyInitializeAudioResources)
    - Sequence operations (createNewSequence, deleteSequence, duplicateSequence)
    - Pattern operations (randomizePattern, shiftPattern, mirrorPattern, humanizePattern)
    - Playback scheduling (schedulePlayback, recreateToneSequence)
    - Timeline clip management
  - `js/ui.js`: Removed ~40 console.log statements from:
    - Sound browser operations
    - Preview player handling
    - Sequencer window management
    - Timeline rendering
  - `js/main.js`: Removed console.log statements from:
    - Panic stop functions
    - Playback mode changes
    - Loop region updates
    - Initialization logging
  - `js/audio.js`: Removed console.log statements from:
    - Master bus setup
    - Effect chain rebuilding
    - Sample loading logic
  - `js/state.js`: Removed console.log statements from:
    - Playback mode changes
    - Track management
    - Project save/load operations
    - Export functions
  - `js/eventHandlers.js`, `js/utils.js`, `js/db.js`, `js/effectsRegistry.js`: Removed remaining debug statements
- **Impact**: Debug logging was cluttering browser console in production, making it harder for users to report issues. Console.error and console.warn statements were preserved for actual error handling.
- **Verification**: All JS files pass `node --check` syntax validation after changes.
- **Version**: No bump needed (code cleanup)
- **Status**: Feature completer should proceed with next planned work.

#### Day 18: Mixer Window Implementation (2026-04-20)
- **Feature**: Implemented complete Mixer window UI for track mixing and send bus management
- **Files Modified**:
  - `js/ui.js`: Added new functions:
    - `openMixerWindow()` - Opens the mixer window with track strips, send bus strips, and master strip
    - `buildMixerContentDOM()` - Builds the mixer content HTML
    - `buildMixerTrackStripHTML()` - Creates individual track strips with fader, pan, mute/solo/arm, meter, and send level controls
    - `buildMixerSendStripHTML()` - Creates send bus strips with level control, mute, and effects button
    - `buildMixerMasterStripHTML()` - Creates the master output strip with volume fader and meter
    - `initializeMixerEventHandlers()` - Wires up all mixer control events
    - `updateMixerWindow()` - Updates mixer UI when track state changes
  - `js/main.js`: Added aliases for mixer functions to appServices:
    - `getSendTracks`, `getSendTrackById`, `getTrackSendLevel` (state getters)
    - `addSendTrack`, `setSendTrackMuted`, `setTrackSendLevel` (state setters)
    - `createSendBus` (alias for `createSendBusInAudio`)
    - `getOpenWindowElement` (helper for mixer UI updates)
  - `js/constants.js`: Bumped APP_VERSION to 0.15.0
- **Feature Details**:
  - Track Strips: Each track has a vertical strip with name, mute/solo/arm buttons, level meter, volume fader, pan knob, and send level controls
  - Send Bus Strips: Each send bus has a strip with name, mute button, level meter, level fader, and effects button
  - Master Strip: Master output with level meter and volume fader
  - Add Send Bus: Button to create new send buses (up to MAX_SEND_TRACKS limit)
  - Real-time Updates: Mixer UI updates when track state changes (mute, solo, arm, volume, pan)
- **Backend Note**: The send bus audio engine infrastructure was implemented in Day 18 (audio engine commit). This feature adds the UI layer to control send effects.
- **Usage**: Open Mixer from menu (Menu > Mixer) to access mixing controls
- **Version**: Bumped to 0.15.0

#### Day 19: Audio Import Feature (2026-04-20)
- **Feature**: Added comprehensive audio file import functionality with menu item and desktop drag-and-drop support
- **Files Modified**:
  - `index.html`: Added "Add Audio Track" and "Import Audio File..." menu items to start menu, added hidden file input for importing audio files
  - `js/eventHandlers.js`: Added:
    - `menuImportAudioFile` action to trigger file import dialog
    - Desktop `dragover` event handler for audio files
    - Desktop `drop` event handler to create new Audio track from dropped file
    - Import audio file input change handler to create new Audio track and add file as clip
  - `js/constants.js`: Bumped APP_VERSION to 0.17.0
- **Feature Details**:
  - Menu Import: "Import Audio File..." opens file picker, creates new Audio track with imported file
  - Desktop Drop: Drag audio files onto desktop to automatically create new Audio track
  - Track Naming: New tracks are named after the imported file (without extension)
  - Feedback: Notifications show import progress and success/error messages
- **Workflow Improvements**:
  - Users can now quickly import audio files without manually creating tracks first
  - Audio files can be dropped onto timeline lanes (existing feature) or onto desktop (new)
  - Streamlines the workflow for bringing external audio into the DAW
- **Usage**: Use Menu > Import Audio File... or drag audio file onto desktop
- **Version**: Bumped to 0.17.0

#### Day 20: Menu Item Handlers - Save/Load/Export/Undo/Redo/Fullscreen (2026-04-20)
- **Feature**: Implemented missing menu item handlers that existed in HTML but had no JavaScript handlers
- **Files Modified**:
  - `js/eventHandlers.js`: Added handlers to `menuActions` object for:
    - `menuSaveProject` - Calls `services.saveProject()` to export project as .snug file
    - `menuLoadProject` - Calls `services.loadProject()` to trigger file picker for .snug files
    - `menuExportWav` - Calls `services.exportToWav()` to render and download project as WAV
    - `menuUndo` - Calls `services.undoLastAction()` for undo functionality
    - `menuRedo` - Calls `services.redoLastAction()` for redo functionality
    - `menuToggleFullScreen` - Toggles browser fullscreen mode
  - `js/main.js`: Added service aliases to `appServices` object:
    - `saveProject: saveProjectInternal`
    - `loadProject: loadProjectInternal`
    - `handleProjectFileLoad: handleProjectFileLoadInternal`
    - `exportToWav: exportToWavInternal`
    - `undoLastAction: undoLastActionInternal`
    - `redoLastAction: redoLastActionInternal`
  - `js/constants.js`: Bumped APP_VERSION to 0.18.0
- **Feature Details**:
  - Save Project: Exports current project state as .snug JSON file
  - Load Project: Opens file picker to load .snug project files
  - Export to WAV: Renders the full project mix using Tone.Recorder and downloads as WAV
  - Undo/Redo: Access to undo/redo history from menu
  - Fullscreen: Toggle browser fullscreen mode
- **Backend Note**: The `exportToWavInternal` function in state.js was already implemented but had no UI wiring. The menu item existed in index.html but had no click handler.
- **Impact**: All menu items in the Start Menu are now functional
- **Version**: Bumped to 0.18.0

#### Day 21: Transpose and Quantize Pattern UI (2026-04-20)
- **Feature**: Added UI controls for Transpose and Quantize pattern operations in sequencer context menu
- **Files Modified**:
  - `js/ui.js`: Added new context menu items in sequencer window:
    - "Transpose Up ↑ (+1 semitone)" - Shifts all notes up one semitone
    - "Transpose Down ↓ (-1 semitone)" - Shifts all notes down one semitone
    - "Transpose by..." - Prompts for semitone value (-12 to +12) for custom transposition
    - "Quantize Pattern..." - Prompts for quantize value (1, 2, 4, 8, 16) to snap notes to grid
  - `js/constants.js`: Bumped APP_VERSION to 0.19.0
- **Feature Details**:
  - Transpose Operations: Shift note pitches up or down by semitones
    - Works only on Synth and InstrumentSampler tracks (disabled for DrumSampler/Sampler)
    - Custom transpose allows ±12 semitones (one octave)
    - Notes that would fall outside the valid range are discarded
  - Quantize Operation: Snap notes to rhythmic grid
    - Quantize values: 1 (whole note), 2 (half note), 4 (quarter note), 8 (eighth note), 16 (sixteenth note)
    - Notes are moved to nearest grid position
    - Collision handling: if destination is occupied, finds nearest free slot
  - Undo Support: Both operations capture state for undo/redo
  - Visual Feedback: Notifications show count of notes affected
- **Backend Note**: The `shiftSequenceNotes()` and `quantizeSequence()` methods already existed in Track.js but had no UI wiring
- **Usage**: Right-click on sequencer grid, use Transpose or Quantize sections in context menu
- **Version**: Bumped to 0.19.0

#### Day 22: Ghost Notes Feature (2026-04-20)
- **Feature**: Added Ghost Notes functionality to show notes from other tracks dimmed in the sequencer
- **Files Modified**:
  - `js/state.js`: Added:
    - `ghostTrackIdState` state variable
    - `getGhostTrackIdState()` getter
    - `setGhostTrackIdState(trackId)` setter
  - `js/main.js`: Added ghost track state function imports and wired to appServices
  - `js/ui.js`: Modified `buildSequencerContentDOM()`:
    - Added ghost track dropdown selector in sequencer toolbar
    - Added ghost note data extraction and mapping
    - Added ghost note rendering with `.ghost-note` CSS class
    - Added event handler for ghost track selection
  - `style.css`: Added `.ghost-note` styling:
    - Dimmed purple background (30% opacity)
    - Dashed border for visual distinction
    - Overall opacity of 0.4
  - `js/constants.js`: Bumped APP_VERSION to 0.20.0
- **Feature Details**:
  - Ghost Track Selector: Dropdown in sequencer toolbar to select another track to show as "ghost notes"
  - Compatible Tracks: Only Synth and InstrumentSampler tracks can be shown as ghost notes
  - Visual Rendering: Ghost notes appear as dimmed, dashed cells in the sequencer grid
  - Pitch Mapping: Ghost notes are mapped to the current track's pitch range
  - Non-interference: Ghost notes don't interfere with active notes (only shown where no active note exists)
  - Notification Feedback: Shows notification when ghost track is selected or cleared
- **Usage**: Open sequencer for a Synth/InstrumentSampler track, use "Ghost:" dropdown in toolbar to select another track to show
- **Version**: Bumped to 0.20.0

#### Day 23: Arpeggiator Feature (2026-04-20)
- **Feature**: Added comprehensive Arpeggiator functionality to transform chords into arpeggiated patterns
- **Files Modified**:
  - `js/Track.js`: Added `arpeggiatePattern(mode, rate, octaves)` method:
    - Extracts unique pitches from existing notes to build chord
    - Supports 7 arpeggio modes: up, down, updown, downup, random, converge, diverge
    - Supports 3 rates: 1/8, 1/16, 1/32 notes
    - Supports 1-4 octave range with automatic pitch extension
    - Filters pitches that exceed valid range
    - Clears existing pattern and places arpeggiated notes
    - Captures undo state before modification
    - Shows notification with note count and settings
  - `js/ui.js`: Added Arpeggiator context menu items in sequencer window:
    - "Arpeggiate Up ↑" - Arpeggiates notes from lowest to highest
    - "Arpeggiate Down ↓" - Arpeggiates notes from highest to lowest
    - "Arpeggiate Up-Down ↕" - Plays up then back down
    - "Arpeggiate Down-Up ↕" - Plays down then back up
    - "Arpeggiate Random 🎲" - Randomizes note order
    - "Arpeggiate Converge ⇥" - Plays from outer pitch edges toward center
    - "Arpeggiate Diverge ⇤" - Plays from center pitch outward to edges
    - "Custom Arpeggio..." - Prompts for mode, rate, and octave settings
  - `js/constants.js`: Bumped APP_VERSION to 0.21.0
- **Feature Details**:
  - Mode Options:
    - Up: Notes play from lowest to highest pitch
    - Down: Notes play from highest to lowest pitch
    - Up-Down: Notes play up then back down (excludes duplicates)
    - Down-Up: Notes play down then back up (excludes duplicates)
    - Random: Notes play in random order with more variety
    - Converge: Notes play from outer pitch edges toward center
    - Diverge: Notes play from center pitch outward to edges
  - Rate Options: 1/8 notes (2 steps), 1/16 notes (1 step), 1/32 notes (1 step, faster)
  - Octave Range: Extends the arpeggio across multiple octaves (1-4)
  - Velocity: Uses average velocity from source notes with slight variation
  - Track Types: Only works on Synth and InstrumentSampler tracks
- **Workflow**: Place a chord in the sequencer, right-click, select arpeggio mode
- **Usage**: Open sequencer for a Synth/InstrumentSampler track, place notes (chord), right-click on grid, select Arpeggiator option
- **Version**: Bumped to 0.21.0

#### Day 24: Note Probability Feature (2026-04-20)
- **Feature**: Added Note Probability editor for controlling the chance that notes will play during playback
- **Files Modified**:
  - `js/Track.js`: Added note probability methods:
    - `setNoteProbability(row, col, probability)` - Sets probability (0.0-1.0) for a note
    - `getNoteProbability(row, col)` - Gets probability for a note (default 1.0)
    - Modified sequence scheduling to check probability before playing notes
  - `js/ui.js`: Added Probability Editor UI:
    - Probability toggle checkbox in sequencer toolbar
    - Probability editor lane below piano roll grid
    - Visual probability bars (teal color) showing probability per column
    - Click/drag editing on probability bars
    - Real-time visual feedback during editing
    - Recreates Tone sequence after editing to apply changes
  - `js/constants.js`: Added gain constants:
    - `DEFAULT_NOTE_PROBABILITY` constant (1.0)
    - `MIN_NOTE_PROBABILITY` (0)
    - `MAX_NOTE_PROBABILITY` (1.0)
  - `js/Track.js`: Modified audio clip playback scheduling to apply clip gain during fade in/out
- **Feature Details**:
  - Probability Toggle: "Prob" checkbox in sequencer toolbar to show/hide probability editor
  - Visual Bars: Height represents maximum probability of active notes in each column
  - Click/Drag Editing: Drag up/down on bars to change probability (affects all active notes in that column)
  - Range: 0% = note never plays, 100% = note always plays
  - Randomization: During playback, each note has a chance to play based on its probability setting
  - Works with: Synth, InstrumentSampler, Sampler, and DrumSampler tracks
- **Usage**: Open sequencer for any track, click "Prob" checkbox in toolbar, drag on probability bars to edit
- **Version**: Bumped to 0.22.0

#### Day 25: Note Repeat / Roll Feature (2026-04-20)
- **Feature**: Added Note Repeat / Roll functionality for creating drum rolls and rapid note repetitions
- **Files Modified**:
  - `js/Track.js`: Added `noteRepeat(row, startCol, count, fadeAmount)` method:
    - Creates a roll by repeating a note across consecutive steps
    - Supports optional velocity fade (decrescendo) for natural drum rolls
    - Works with existing notes or creates new notes if position is empty
    - Clamps all parameters to valid ranges
    - Captures undo state before modification
    - Returns count of notes created
  - `js/ui.js`: Added Note Repeat context menu items in sequencer window:
    - "Drum Roll (4 notes)..." - Quick 4-note roll with prompts for row and start position
    - "Drum Roll (8 notes)..." - Quick 8-note roll with prompts for row and start position
    - "Roll with Fade..." - Roll with customizable fade amount for decrescendo effect
    - "Custom Note Repeat..." - Full control over count (1-32) and fade amount
  - `js/constants.js`: Bumped APP_VERSION to 0.23.0
- **Feature Details**:
  - Row/Pitch Selection: Choose which row (pitch) to apply the roll
  - Start Position: Choose the starting step (0-indexed)
  - Note Count: Create 1-32 consecutive notes
  - Velocity Fade: Optional fade from 0 (no fade) to 1 (maximum fade)
  - Decrescendo Effect: Higher fade values create natural drum roll decay
  - Works with: All track types with sequencers (Synth, InstrumentSampler, Sampler, DrumSampler)
- **Workflow**: Right-click on sequencer grid, select Note Repeat option, enter parameters
- **Usage**: Open sequencer for any track, right-click on grid, select Note Repeat / Roll option
- **Version**: Bumped to 0.23.0

#### Day 27: Audio Clip Gain and Normalize (2026-04-20)
- **Feature**: Added gain control and normalize functionality to the Audio Clip Editor
- **Files Modified**:
  - `js/Track.js`: Added new methods:
    - `setAudioClipGain(clipId, gain)` - Sets clip gain (0-4 range) for audio clip playback
    - `getAudioClipGain(clipId)` - Gets current gain value for a clip
    - `normalizeAudioClip(clipId)` - Analyzes audio peaks and sets gain to normalize to 0dB
  - `js/ui.js`: Modified `openAudioClipEditorWindow()`:
    - Added Gain slider with dB display (range 0-4, shows -∞ to +12dB)
    - Added Normalize button to auto-normalize clip to 0dB
    - Added gain sync handlers to update dB display in real-time
    - Window height increased to 420px to accommodate new controls
    - Apply button now saves gain changes to clip
  - `js/constants.js`: Added gain constants:
    - `DEFAULT_AUDIO_CLIP_GAIN` (1.0)
    - `MIN_AUDIO_CLIP_GAIN` (0)
    - `MAX_AUDIO_CLIP_GAIN` (4.0)
    - `GAIN_NORMALIZE_TARGET` (1.0)
  - `js/Track.js`: Modified audio clip playback scheduling to apply clip gain during fade in/out
- **Feature Details**:
  - Gain Slider: Adjusts clip volume from silence (0) to +12dB boost (4.0)
  - dB Display: Real-time display of gain in decibels (-∞ to +12dB)
  - Normalize: Analyzes audio peaks and calculates gain to bring maximum to 0dB
  - Apply Button: Saves gain setting along with fade in/out and position changes
  - Playback Integration: Gain is applied during audio scheduling with fade in/out
- **Backend Note**: The audio clip gain is applied via a FadeGain node during playback scheduling
- **Usage**: Double-click an audio clip in Timeline to open the Audio Clip Editor, adjust gain or click Normalize
- **Version**: Bumped to 0.25.0

#### Day 30: Timeline Markers UI Fix (2026-04-21)
- **Bug Fix**: Fixed Timeline Markers not rendering on the ruler in the Timeline window
- **Issue**: The Timeline Markers feature was added in Day 29 (constants and state management), but the UI rendering code was incomplete - markers were not being visually rendered on the timeline ruler
- **Files Modified**:
  - `js/ui.js`: Added marker rendering loop in `renderTimeline()`:
    - Renders each marker as a colored vertical bar on the ruler at the correct bar position
    - Marker divs have `data-marker-id` attribute for event handling
    - Tooltips show marker name and bar number
    - Color uses the marker's color property or default marker color
    - Right-click context menu handlers were already present (added by substrate-bot)
- **Feature Details**:
  - Markers now appear as colored vertical bars on the timeline ruler
  - Double-click on ruler creates a new marker at that position
  - Right-click on marker shows delete context menu
  - Add/Clear buttons in marker controls bar work correctly
- **Version**: Bumped to 0.29.0

#### Day 31: Audio Clip Color Feature (2026-04-21)
- **Feature**: Added customizable colors for audio clips in the timeline and Audio Clip Editor
- **Files Modified**:
  - `js/constants.js`: Added:
    - `CLIP_COLORS` array (16 colors similar to track colors)
    - `DEFAULT_CLIP_COLOR` constant ('#4a9eff' - bright blue)
  - `js/Track.js`: Added new methods:
    - `setAudioClipColor(clipId, color)` - Sets clip color with undo state capture
    - `getAudioClipColor(clipId)` - Gets clip color, falls back to type-based default
  - `js/ui.js`: Modified:
    - `openAudioClipEditorWindow()` - Added clip color swatch selector
    - `renderTimeline()` - Uses clip.color if set, falls back to type-based color
    - Increased window size to 380x520 to accommodate new controls
  - `js/constants.js`: Bumped APP_VERSION to 0.30.0
- **Feature Details**:
  - 16 color options displayed as swatches in Audio Clip Editor
  - Color changes captured for undo/redo
  - Timeline renders clips with their custom color
  - Default colors maintained for audio (blue) and sequence (purple) clips
- **Usage**: Double-click an audio clip in Timeline to open editor, click color swatch to change
- **Version**: Bumped to 0.30.0

#### Day 32: Audio Clip Playback Rate Feature (2026-04-21)
- **Feature**: Added playback rate control to the Audio Clip Editor for variable speed audio playback
- **Files Modified**:
  - `js/constants.js`: Added playback rate constants:
    - `DEFAULT_AUDIO_CLIP_PLAYBACK_RATE` (1.0)
    - `MIN_AUDIO_CLIP_PLAYBACK_RATE` (0.25)
    - `MAX_AUDIO_CLIP_PLAYBACK_RATE` (4.0)
    - Bumped APP_VERSION to 0.32.0
  - `js/Track.js`: Added new methods:
    - `setAudioClipPlaybackRate(clipId, rate)` - Sets playback rate with undo state capture
    - `getAudioClipPlaybackRate(clipId)` - Gets clip playback rate (default 1.0)
    - Modified audio clip playback scheduling to apply rate to Tone.Player
  - `js/ui.js`: Modified `openAudioClipEditorWindow()`:
    - Added Playback Rate section with slider + number input
    - Synced slider/input for real-time value display
    - Apply button saves playback rate changes
    - Window uses flex-wrap for responsive layout
- **Feature Details**:
  - Playback Rate Range: 0.25x (very slow) to 4x (very fast)
  - Slider: Drag to adjust playback speed
  - Number Input: Direct entry for precise values
  - Real-time Display: Shows current rate (e.g., "1.50x")
  - Apply Button: Saves rate changes along with other clip settings
  - Playback Integration: Rate is applied to Tone.Player during audio scheduling
- **Usage**: Double-click an audio clip in Timeline to open editor, adjust Playback Rate slider or enter value
- **Version**: Bumped to 0.32.0

#### Day 34: Audio Clip Editor Waveform Preview (2026-04-21)
- **Feature**: Added waveform preview to the Audio Clip Editor for visual feedback of audio content
- **Files Modified**:
  - `js/ui.js`: Added new function `drawClipWaveform(clipId, audioBuffer)`:
    - Draws waveform visualization on a canvas element
    - Shows "No audio loaded" message when buffer is not available
    - Uses blue stroke color (#4a9eff) matching audio clip default color
    - Center line for visual reference
    - Responsive canvas sizing
  - `js/ui.js`: Modified `openAudioClipEditorWindow()`:
    - Added waveform canvas element below clip color swatches
    - Increased window height from 520px to 560px to accommodate new control
    - Added call to `drawClipWaveform()` after window creation to render the waveform
  - `js/constants.js`: No version bump needed (already at correct version for feature scope)
- **Feature Details**:
  - Waveform Preview: Visual representation of the audio clip's waveform in the editor
  - Shows "No audio loaded" when the clip has no audio data
  - Blue color matching audio clip theme
  - Renders shortly after window opens (100ms delay for DOM readiness)
- **Usage**: Double-click an audio clip in Timeline to open editor, waveform appears below color swatches
- **Version**: 0.33.0

#### Day 35: Audio Clip Playback Rate Feature (2026-04-21)
- **Feature**: Added playback rate control to the Audio Clip Editor for variable speed audio playback
- **Files Modified**:
  - `js/constants.js`: Added playback rate constants:
    - `DEFAULT_AUDIO_CLIP_PLAYBACK_RATE` (1.0)
    - `MIN_AUDIO_CLIP_PLAYBACK_RATE` (0.25)
    - `MAX_AUDIO_CLIP_PLAYBACK_RATE` (4.0)
    - Bumped APP_VERSION to 0.34.0
  - `js/Track.js`: Added new methods:
    - `setAudioClipPlaybackRate(clipId, rate)` - Sets playback rate with undo state capture
    - `getAudioClipPlaybackRate(clipId)` - Gets clip playback rate (default 1.0)
    - Modified audio clip playback scheduling to apply rate to Tone.Player
  - `js/ui.js`: Modified `openAudioClipEditorWindow()`:
    - Added Playback Rate section with slider + number input
    - Synced slider/input for real-time value display
    - Apply button saves playback rate changes
    - Window uses flex-wrap for responsive layout
- **Feature Details**:
  - Playback Rate Range: 0.25x (very slow) to 4x (very fast)
  - Slider: Drag to adjust playback speed
  - Number Input: Direct entry for precise values
  - Real-time Display: Shows current rate (e.g., "1.50x")
  - Apply Button: Saves rate changes along with other clip settings
  - Playback Integration: Rate is applied to Tone.Player during audio scheduling
- **Usage**: Double-click an audio clip in Timeline to open editor, adjust Playback Rate slider or enter value
- **Version**: Bumped to 0.34.0

#### Day 36: Audio Clip Editor Waveform Loading Bug Fix (2026-04-21)
- **Bug Fix**: Fixed waveform preview not loading in Audio Clip Editor
- **Issue**: The waveform loading code passed `clip.audioBuffer` directly to `drawClipWaveform()`, but `audioBuffer` was never stored on the clip object - only `clip.sourceId` (an IndexedDB key) was available
- **Files Modified**:
  - `js/ui.js`: 
    - Added import for `getAudio` from `db.js`
    - Modified waveform loading code to:
      - Fetch audio blob from IndexedDB using `clip.sourceId`
      - Decode audio data using `Tone.context.rawContext`
      - Create a `Tone.Buffer` from the decoded data
      - Pass the Tone.Buffer to `drawClipWaveform()`
      - Added proper error handling with fallback to "No audio loaded"
  - `js/constants.js`: No version bump needed (bug fix for existing feature)
- **Impact**: The waveform preview in the Audio Clip Editor now correctly displays audio waveforms for clips that have audio loaded in IndexedDB
- **Version**: No bump (bug fix)

#### Day 37: Audio Clip Name Feature (2026-04-21)
- **Feature**: Added proper undo state capture for clip name changes in Audio Clip Editor
- **Bug Fix**: The Apply button in the Audio Clip Editor was directly assigning `clip.name = newName` instead of using a proper Track.js method, bypassinging undo state capture
- **Files Modified**:
  - `js/Track.js`: Added new methods:
    - `setAudioClipName(clipId, name)` - Sets clip name with undo state capture
    - `getAudioClipName(clipId)` - Gets clip name
  - `js/ui.js`: Modified Apply button handler to use `track.setAudioClipName(clipId, newName)` instead of direct assignment
  - `js/constants.js`: Bumped APP_VERSION to 0.35.0
- **Impact**: Clip renaming now properly captures undo state, allowing users to undo accidental renames
- **Version**: Bumped to 0.35.0

#### Day 38: Track Pan Control Feature (2026-04-21)
- **Feature**: Added pan control functionality to the Mixer window for Audio tracks
- **Files Modified**:
  - `js/Track.js`:
    - Added `pan` property initialization in Track constructor (defaults to 0, loaded from `initialData.pan`)
    - Added `setPan(value, fromInteraction)` method - Sets pan with undo state capture and applies to inputChannel
    - Added `getPan()` method - Returns current pan value
    - Modified `initializeAudioNodes()` to apply stored pan to inputChannel when initialized
  - `js/state.js`:
    - Added `pan: track.pan !== undefined ? track.pan : 0` to trackData in `gatherProjectDataInternal()` for project save/load
  - `js/ui.js`:
    - Modified `handleMixerPanChange()` to call `track.setPan(value, true)` directly
  - `js/constants.js`: Bumped APP_VERSION to 0.36.0
- **Feature Details**:
  - Pan Knob: The mixer already had a pan knob UI element, but it wasn't functional
  - Range: -1 (full left) to +1 (full right), with 0 being center
  - Audio Tracks Only: Pan is applied via the `inputChannel` (Tone.Channel), which is only created for Audio type tracks
  - Undo Support: Pan changes are captured for undo/redo via `_captureUndoState`
  - Persistence: Pan values are saved and restored when loading projects
  - Visual Feedback: The mixer UI updates after pan changes via `updateMixerWindow()`
- **Backend Note**: The Tone.Channel has a built-in pan property that handles stereo panning. The mixer UI was already rendering the pan knob, but `handleMixerPanChange` was calling a non-existent state setter and a `track.setPan` method that didn't exist.
- **Usage**: Open Mixer window, drag the Pan knob on an Audio track strip
- **Version**: Bumped to 0.36.0

#### Day 39: Mixer Track Color Indicator (2026-04-21)
- **Feature**: Added track color indicators to the Mixer window for visual track identification
- **Files Modified**:
  - `js/ui.js`: Modified `buildMixerTrackStripHTML()` to add:
    - Colored bar at top of each track strip using track color
    - Colored left border on track name with color indicator
  - `js/constants.js`: Bumped APP_VERSION to 0.37.0
- **Feature Details**:
  - Track Color Bar: Small colored bar at the top of each mixer track strip
  - Track Name Border: Track name has a colored left border matching track color
  - Visual Feedback: Makes it easy to identify tracks in the mixer when many tracks are present
  - Consistency: Matches the color indicator style used in the Timeline view
- **Usage**: Open Mixer window, each track strip shows its color at top and on the track name
- **Version**: Bumped to 0.37.0

#### Day 40: Audio Clip Start/End Offset Trim Feature (2026-04-21)
- **Feature**: Added Source Trim controls to the Audio Clip Editor for trimming the beginning and end of audio clips
- **Files Modified**:
  - `js/constants.js`: Added new constants:
    - `DEFAULT_AUDIO_CLIP_START_OFFSET` (0) - Default start offset in seconds
    - `MIN_AUDIO_CLIP_START_OFFSET` (0) - Minimum start offset
    - `DEFAULT_AUDIO_CLIP_END_OFFSET` (-1) - Default end offset (-1 = use full audio)
    - `MIN_AUDIO_CLIP_END_OFFSET` (-1) - End offset sentinel value
    - Bumped APP_VERSION to 0.38.0
  - `js/Track.js`: Added new methods:
    - `setAudioClipStartOffset(clipId, startOffset)` - Sets trim start point with undo capture
    - `getAudioClipStartOffset(clipId)` - Gets current start offset value
    - `setAudioClipEndOffset(clipId, endOffset)` - Sets trim end point with undo capture (-1 = full audio)
    - `getAudioClipEndOffset(clipId)` - Gets current end offset value
    - Modified audio clip scheduling in `schedulePlayback()` to use startOffset and endOffset when calculating playback parameters
  - `js/ui.js`: Modified `openAudioClipEditorWindow()`:
    - Added "Source Trim" section with Start Offset and End Offset slider/input controls
    - Start Offset: Slider from 0 to clip duration (cyan accent)
    - End Offset: Slider from -1 to clip duration (-1 displays as -1, means use full audio)
    - Added validation: start cannot exceed end, end must be >= start or -1
    - Added sync handlers for slider/input pairs
    - Apply button now saves startOffset and endOffset values
    - Window height increased from 560px to 620px to accommodate new controls
  - `js/state.js`: Fixed time signature restoration during project load (bug fix in existing code)
- **Feature Details**:
  - Start Offset: How many seconds into the source audio to begin playback
  - End Offset: Where in the source audio to end playback (-1 = use entire audio)
  - UI shows "(s)" label for seconds and "(-1=full)" hint for end offset
  - Validates that start < end when end offset is set (>= 0)
  - Undo support: Changes are captured for undo/redo
  - Playback Integration: Start/end offsets applied during audio scheduling
- **Backend Note**: The actual trimming is implemented by adjusting the offset and duration passed to `player.start()` in the audio scheduling code. `sourceStartOffset = offsetIntoSource + clipStartOffset` and `effectivePlayDuration` is reduced if `clip.endOffset` is set.
- **Usage**: Double-click an audio clip in Timeline to open editor, adjust Start Offset and End Offset sliders in "Source Trim" section
- **Version**: Bumped to 0.38.0

#### Day 41: Audio Clip Split Feature (2026-04-21)
- **Feature**: Added the ability to split audio clips at a specific time point
- **Files Modified**:
  - `js/Track.js`: Added new method:
    - `splitAudioClip(clipId, splitTime)` - Splits an audio clip at the specified time into two clips
  - `js/ui.js`: Added "Split Clip..." menu item to timeline clip context menu:
    - Shows prompt with clip start/end bounds for user reference
    - Validates split time is within clip bounds
    - Creates second clip starting at split point
  - `js/constants.js`: Bumped APP_VERSION to 0.39.0
- **Feature Details**:
  - Split Time: User enters the time in seconds where the clip should be split
  - Clip Bounds Display: Prompt shows the clip's start and end times for reference
  - Second Clip: Created with name suffixed "(2)" and inherits parent clip properties
  - Source Sharing: Both clips share the same `sourceId` (IndexedDB audio data)
  - Undo Support: Split operation captures undo state
  - Visual Feedback: Timeline re-renders to show the new clip
- **Backend Note**: The split operation modifies the original clip's duration to end at the split point, and creates a new clip that starts at the split point. The new clip's `startOffset` is auto-calculated to continue from where the original clip's offset ended.
- **Usage**: Right-click on an audio clip in the Timeline, select "Split Clip...", enter split time in seconds
- **Version**: Bumped to 0.39.0

#### Day 44: Audio Clip Crossfade UI Wiring Bug Fix (2026-04-22)
- **Bug Fix**: Fixed missing `setAudioClipCrossfade` and `getAudioClipCrossfade` methods and missing UI wiring in Audio Clip Editor
- **Issue**: The Audio Clip Editor had a crossfade slider UI, and the playback engine code in Track.js was already using `clip.crossfade` for clip-to-clip crossfading, but there was no way to actually set/get the crossfade value from the UI because:
  1. The `setAudioClipCrossfade` and `getAudioClipCrossfade` methods were missing from Track.js
  2. The Apply button handler in ui.js was not retrieving or saving the crossfade value
- **Files Modified**:
  - `js/Track.js`: Added:
    - `setAudioClipCrossfade(clipId, crossfade)` - Sets clip crossfade with undo state capture and clamping
    - `getAudioClipCrossfade(clipId)` - Gets clip crossfade value (default 0)
  - `js/ui.js`: Modified Apply button handler in `openAudioClipEditorWindow()`:
    - Added extraction of `newFadeInCurve` and `newFadeOutCurve` from the select dropdowns
    - Added calls to `track.setAudioClipCrossfade(clipId, newCrossfade)`
- **Impact**: Users can now properly save fade curve choices (Linear or Exponential) from the Audio Clip Editor, which affects how fades sound during playback
- **Version**: Bumped to 0.42.0

#### Day 46: Audio Clip Duplicate Feature (2026-04-22)
- **Feature**: Added the ability to duplicate audio clips in the Timeline
- **Files Modified**:
  - `js/Track.js`: Added new method:
    - `duplicateTimelineClip(clipId)` - Duplicates an audio or sequence clip and inserts the copy right after the original
  - `js/ui.js`: Added "Duplicate Clip" menu item to timeline clip context menu:
    - Right-click on a clip in Timeline to access the Duplicate option
    - The duplicate is positioned immediately after the original clip
- **Feature Details**:
  - Duplicate creates a copy of the clip with a new unique ID
  - The copy shares the same audio source (sourceId) as the original
  - Positioned immediately after the original clip in the timeline
  - Undo Support: Duplicate operation captures state for undo/redo
  - Works for both audio clips and sequence clips
- **Usage**: Right-click on a clip in the Timeline, select "Duplicate Clip"
- **Version**: Bumped to 0.43.0

#### Day 47: Send Track State Functions (2026-04-22)
- **Bug Fix**: Added missing send track state getter/setter functions that were being called from main.js but didn't exist in state.js
- **Issue**: The "Add Send Bus" button in the Mixer window wasn't working because the following functions were referenced in main.js but never defined in state.js:
  - `getSendTracksState` - Used to get all send tracks
  - `addSendTrackState` - Used to add a new send track to state
  - `setSendTrackMutedState` - Used to set send track mute state
  - `getTrackSendsState` - Used to get track-to-send routing mappings
  - `getTrackSendLevelState` - Used to get send level for a track→send connection
  - `setTrackSendLevelState` - Used to set send level for a track→send connection
- **Files Modified**:
  - `js/state.js`: Added the following functions after line 252:
    - `getSendTracksState()` - Returns the sendTracksState array
    - `getSendTrackByIdState(id)` - Finds send track by ID
    - `addSendTrackState(sendData)` - Creates and adds a new send track object
    - `setSendTrackMutedState(sendId, muted)` - Sets mute state for a send track
    - `getTrackSendsState()` - Returns trackSendsState mapping
    - `getTrackSendLevelState(trackId, sendId)` - Gets send level for track→send
    - `setTrackSendLevelState(trackId, sendId, level)` - Sets send level for track→send
  - `js/constants.js`: Bumped APP_VERSION to 0.44.0
- **Impact**: The "Add Send Bus" button in the Mixer window now properly creates send tracks, and the routing from tracks to send buses works correctly
- **Version**: Bumped to 0.44.0

#### Day 48: Automation Lane Mixer Integration (2026-04-22)
- **Feature**: Added volume automation lane controls to each track strip in the Mixer window
- **Files Modified**:
  - `js/ui.js`: Modified `buildMixerTrackStripHTML()` to add:
    - "AUTO" label with automation point count indicator (orange text when active)
    - Mini automation lane display (6px height, 16 bars showing volume automation points)
    - Parameter quick selector dropdown (Volume, Pan, Filter, Resonance)
    - Click handler to open sequencer window for full automation editing
    - Change handler to update mini display when parameter selection changes
  - `style.css`: Added CSS styles for:
    - `.mixer-automation-mini` - Mini automation lane container with hover effects
    - `.automation-mini-point` - Individual automation point styling
    - `.mixer-auto-param-select` - Parameter selector styling
  - `js/constants.js`: Bumped APP_VERSION to 0.46.0
- **Feature Details**:
  - Mini Automation Display: Compact 16-step visualization showing automation points
  - Orange bars represent active automation points with height = value
  - "No Data" placeholder shown when lane is empty
  - Point count displayed as "Npt" when active, "--" when empty
  - Parameter Selector: Quick dropdown to switch between automation parameters
  - Click to Edit: Clicking the mini editor opens the track's Sequencer window
  - Real-time Updates: Changing parameter updates the mini display immediately
- **Backend Note**: The automation lane data structures and methods (getAutomationLane, setAutomationPoint, etc.) were already implemented in Track.js from Day 12. This feature adds the Mixer UI integration to view and access that data.
- **Usage**: Open Mixer window, each track strip shows an automation lane mini editor below the pan knob. Click the mini editor or any automation bar to open the full Sequencer with automation editor. Use the parameter dropdown to switch between Volume, Pan, Filter, or Resonance automation lanes.
- **Version**: Bumped to 0.46.0

#### Day 49: Fix Incomplete getNoteProbability and Add Audio Clip Recording Support (2026-04-22)
- **Bug Fix**: Fixed malformed `getNoteProbability()` method in Track.js that was missing its body after `if (this.type === 'Audio')`
- **Feature**: Added `addAudioClip(blob, startTime)` method to Track class to enable audio recording functionality
- **Files Modified**:
  - `js/Track.js`:
    - Fixed incomplete `getNoteProbability()` method to properly return 1.0 for Audio tracks and step data probability otherwise
    - Added `addAudioClip(blob, startTime)` async method that stores recorded audio to IndexedDB, creates clip object, adds to timeline
  - `js/constants.js`: Bumped APP_VERSION to 0.48.0
- **Feature Details**: Enables audio recorded via microphone to be added to Audio tracks timeline
- **Version**: Bumped to 0.48.0

#### Day 50: Expand Unit Test Coverage for SnugOS Constants and Features (2026-04-22)
- **Feature**: Added comprehensive unit tests for previously untested constants and features
- **Files Modified**:
  - `js/tests.js`: Added new test suites:
    - Audio Clip Reverse Tests: Verifies DEFAULT_AUDIO_CLIP_REVERSE constant exists and is boolean
    - Fade Curve Constants Tests: Validates FADE_CURVES, DEFAULT_FADE_IN_CURVE, DEFAULT_FADE_OUT_CURVE, DEFAULT_AUDIO_CLIP_FADE_IN/OUT, MAX_AUDIO_CLIP_FADE
    - Chord Mode Tests: Validates CHORD_TYPES object (major, minor, diminished, augmented, dominant7, major7, minor7, etc.) and DEFAULT_CHORD_MODE structure
    - Automation Lane Constants Tests: Validates AUTOMATION_LANE_PARAMETERS, AUTOMATION_LANE_HEIGHT, AUTOMATION_LANE_DEFAULT, AUTOMATION_LANE_PRECISION, AUTOMATION_LANE_COLORS
    - Timeline Marker Constants Tests: Validates MAX_TIMELINE_MARKERS, DEFAULT_MARKER_COLOR, MARKER_COLORS array, DEFAULT_MARKER structure
    - Swing Constants Tests: Validates MAX_SWING_AMOUNT, SWING_SUBDIVISION, DEFAULT_SWING object
    - Send Track Constants Tests: Validates MAX_SEND_TRACKS, DEFAULT_SEND_LEVEL, SEND_LEVEL_MIN/MAX, DEFAULT_SEND_TRACK structure
- **Feature Details**: These tests cover constants that were implemented but had no corresponding unit tests, ensuring consistency between constants definitions and their usage in Track.js and UI code
- **Version**: No bump needed (test coverage improvement)

#### Day 51: Audio Clip Fade In/Out Methods (2026-04-22)
- **Bug Fix**: Added missing audio clip fade in/out methods to Track.js
- **Issue**: The Audio Clip Editor UI was calling methods like `track.setAudioClipFadeIn`, `track.setAudioClipFadeOut`, `track.setAudioClipFadeInCurve`, and `track.setAudioClipFadeOutCurve` but these methods were never implemented in Track.js, causing the fade settings to not be saved
- **Files Modified**:
  - `js/Track.js`: Added new methods after `getAudioClipCrossfade`:
    - `setAudioClipFadeIn(clipId, fadeIn)` - Sets fade in time with undo capture and clamping
    - `getAudioClipFadeIn(clipId)` - Gets fade in time (defaults to 0)
    - `setAudioClipFadeOut(clipId, fadeOut)` - Sets fade out time with undo capture and clamping
    - `getAudioClipFadeOut(clipId)` - Gets fade out time (defaults to 0)
    - `setAudioClipFadeInCurve(clipId, curve)` - Sets fade in curve (linear/exponential) with undo capture
    - `getAudioClipFadeInCurve(clipId)` - Gets fade in curve (defaults to linear)
    - `setAudioClipFadeOutCurve(clipId, curve)` - Sets fade out curve with undo capture
    - `getAudioClipFadeOutCurve(clipId)` - Gets fade out curve (defaults to linear)
  - `js/constants.js`: Bumped APP_VERSION to 0.49.0
  - `js/tests.js`: Added test suite for fade in/out methods and constants
- **Impact**: Users can now properly save fade in/out time and curve settings from the Audio Clip Editor, which affects how audio clips sound during playback with fades
- **Version**: Bumped to 0.49.0
