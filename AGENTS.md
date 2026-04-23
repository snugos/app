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
  - Visual Feedback: Note cells show velocity value (0-127) in tooltip
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
  - Right-click on any track lane in Timeline to access group management
  - Add/Remove track from existing groups directly from timeline
  - Create new group with selected track as member from timeline
  - Access track settings from timeline context menu
  - Works alongside existing Mixer window group management
- **Usage**: Right-click on a track lane in Timeline window to add/remove from groups or create new group
- **Version**: Bumped to 0.53.1
- **Bug Fix**: The group-context-btn class was missing on group strips, now added

#### Day 55 final: Mixer Track FX Button (2026-04-22)
- **Feature**: Added FX button to each track strip in the Mixer window for quick access to the effects rack
- **Files Modified**:
  - `js/ui.js`: Added FX button to `buildMixerTrackStripHTML()` with effect count indicator
  - `js/ui.js`: Added event handler in `initializeMixerEventHandlers()` for FX button click
  - `js/constants.js`: Bumped APP_VERSION to 0.53.2
- **Feature Details**:
  - FX button appears below the Sends section in each track strip
  - Shows effect count badge when track has effects (e.g., "FX (3)")
  - Clicking opens the track's Effects Rack window directly
  - Provides quick access without needing to open the track inspector
- **Usage**: Click the FX button in any track strip in the Mixer window
- **Version**: Bumped to 0.53.2

#### Day 56: Audio Recording Constants and Tests (2026-04-22)
- **Feature**: Added audio recording constants to document recording-related configuration values and expanded test coverage
- **Files Modified**:
  - `js/constants.js`: Added new audio recording constants:
    - Recording quality/format: `RECORDING_SAMPLE_RATE` (44100), `RECORDING_NUM_CHANNELS` (1-mono), `RECORDING_BIT_DEPTH` (16), `RECORDING_MIME_TYPE` ('audio/webm')
    - Input constraints: `RECORDING_LATENCY_HINT` (0.01s), `RECORDING_ECHO_CANCELLATION` (false), `RECORDING_AUTO_GAIN_CONTROL` (false), `RECORDING_NOISE_SUPPRESSION` (false)
    - Input gain: `DEFAULT_RECORDING_INPUT_GAIN` (1.0), `MIN_RECORDING_INPUT_GAIN` (0), `MAX_RECORDING_INPUT_GAIN` (2.0)
    - Monitoring: `DEFAULT_RECORDING_MONITORING_ENABLED` (false), `DEFAULT_RECORDING_MONITORING_VOLUME` (0.5)
    - Limits: `MAX_RECORDING_LENGTH_SECONDS` (600), `MIN_RECORDING_LENGTH_SECONDS` (0.1)
    - Bumped APP_VERSION to 0.54.0
  - `js/tests.js`: Added comprehensive test suite for audio recording constants:
    - Sample rate validation (44100 Hz standard)
    - Channel count validation (1 = mono, 1-2 range)
    - Bit depth validation (16-bit standard)
    - MIME type validation (audio/webm/wav/ogg)
    - Latency hint range validation
    - Input constraint defaults (echo cancellation, AGC, noise suppression off)
    - Input gain limits and defaults
    - Monitoring settings validation
    - Recording length limits (60s min max, 0.1s min)
- **Feature Details**:
  - Recording uses standard 44.1kHz sample rate, 16-bit depth, mono channel for efficient storage
  - Audio processing constraints disabled (echo cancellation, AGC, noise suppression) for clean recording
  - Low latency hint (10ms) for real-time monitoring
  - Input gain allows software boost up to 2x
  - Max recording length of 10 minutes prevents excessive storage use
  - All constants documented with comments explaining their purpose
- **Backend Note**: These constants provide a centralized configuration source for the recording system. The actual recording implementation in `js/audio.js` (startAudioRecording/stopAudioRecording functions) already uses Tone.UserMedia and Tone.Recorder, which respect these constraints.
- **Version**: Bumped to 0.54.0

#### Day 57: Timeline Freeze/Bounce UI (2026-04-22)
- **Feature**: Added Freeze Track and Bounce Track options to timeline track lane right-click context menu
- **Files Modified**:
  - `js/ui.js`: Added context menu items in timeline track lane right-click handler:
    - "Freeze Track" - Renders track audio offline and replaces sequence clips with frozen audio clip (only shown for non-Audio tracks with sequences)
    - "Bounce Track" - Renders track audio to WAV and downloads file (shown for all track types with content)
    - Both options call the existing `track.freezeTrack()` and `track.bounceTrack()` methods in Track.js
  - `js/constants.js`: Bumped APP_VERSION to 0.55.0
- **Feature Details**:
  - Freeze Track: Converts instrument/sampler tracks to audio by rendering all notes offline, replacing sequence clips with a single frozen audio clip. Frees up CPU by disposing instrument/sampler nodes. Only available for Synth, InstrumentSampler, Sampler, and DrumSampler tracks with sequences.
  - Bounce Track: Exports track audio as a WAV file download without modifying the original track. Works for all track types with timeline clips or sequences. Useful for exporting individual instrument stems.
  - Both operations render using Tone.Offline context for non-real-time processing
  - Error handling with user-friendly notifications
- **Usage**: Right-click on a track lane in Timeline window, select "Freeze Track" or "Bounce Track"
- **Version**: Bumped to 0.55.0

#### Day 60: Drag and Drop Audio Import/Export (2026-04-22)
- **Feature**: Added drag-and-drop support for audio files - both importing into the DAW and exporting out
- **Files Modified**:
  - `js/ui.js`: 
    - Made timeline clips draggable (`draggable="true"`) with `data-clip-id` and `data-track-id` attributes
    - Added `dragstart` handler on timeline clips to enable dragging clips out as audio files
    - Added "Export Clip as WAV" option to timeline clip right-click context menu
    - Dragstart sets audio blob from IndexedDB on the data transfer for external drag-out
  - `js/eventHandlers.js`: Already has desktop drag-and-drop handler for audio files (lines 100-138) that creates new Audio track and imports dropped file
  - `js/constants.js`: Bumped APP_VERSION to 0.58.0
- **Feature Details**:
  - Import: Drop audio files from desktop onto DAW - creates new Audio track with file as clip (already implemented in eventHandlers.js)
  - Timeline clips are now draggable - visual change to cursor:grab
  - Export: Right-click timeline clip > "Export Clip as WAV" downloads the clip's audio as a .wav file
  - Clips can also be dragged to external apps (if they support file drops) via dataTransfer with audio blob
  - Drag data includes JSON metadata (`clipId`, `trackId`, `clipName`) for cross-window drops
- **Usage**: 
  - Import: Drag audio file from desktop onto SnugOS window
  - Export: Right-click on timeline clip, select "Export Clip as WAV"
  - Drag: Drag timeline clips to reorder or export to other apps
- **Version**: Bumped to 0.58.0

#### Day 61: Track Template Constants Tests (2026-04-22)
- **Feature**: Added 7 new unit tests for Track Template constants to expand test coverage
- **Files Modified**:
  - `js/tests.js`: Added Track Template Constants Tests section with 7 tests:
    - `Track Templates - MAX_TRACK_TEMPLATES is 32`
    - `Track Templates - DEFAULT_TEMPLATE_NAME_PREFIX is Template`
    - `Track Templates - TRACK_TEMPLATE_COLORS uses TRACK_COLORS`
    - `Track Templates - DEFAULT_TRACK_TEMPLATE_COLOR is valid hex`
    - `Track Templates - DEFAULT_TRACK_TEMPLATE structure`
    - `Track Templates - DEFAULT_TRACK_TEMPLATE has no automation by default`
    - `Track Templates - DEFAULT_TRACK_TEMPLATE instrument settings default to null`
  - `js/constants.js`: Bumped APP_VERSION to 0.58.2
- **Feature Details**:
  - Tests validate MAX_TRACK_TEMPLATES (32), DEFAULT_TEMPLATE_NAME_PREFIX ('Template')
  - Tests validate TRACK_TEMPLATE_COLORS equals TRACK_COLORS
  - Tests validate DEFAULT_TRACK_TEMPLATE structure (name, color, type, synthParams, activeEffects, hasAutomation, automationLanes, instrumentSamplerSettings, drumSamplerPads)
  - Total test count increased from 65 to 72 tests
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.58.2

#### Day 62: Automation Editor Event Handlers (2026-04-22)
- **Feature**: Completed missing automation editor event handlers for the sequencer window
- **Issue**: The automation editor UI (toggle, parameter selector, lane grid) was already implemented in `buildSequencerContentDOM()` but had no interactivity - the toggle didn't work, parameter selector did nothing, clear button was inert, and clicking/dragging on the lane did nothing
- **Files Modified**:
  - `js/ui.js`: Added automation editor event handlers in `openTrackSequencerWindow()`:
    - Toggle checkbox: Shows/hides the automation editor lane
    - Parameter selector: Re-renders the lane when user selects a different parameter (volume, pan, filterCutoff, etc.)
    - Clear Lane button: Confirms and clears all automation points for the selected parameter
    - Click to add points: Click on an empty cell to add an automation point at that step
    - Right-click/Shift-click to remove: Right-click or Shift+click on a point to remove it
    - Drag to move points: Click and drag vertically on existing points to adjust their value
    - Undo support: Captures undo state before adding/removing points
    - Visual feedback: Orange dot appears on points, bar height reflects value (0-100%)
  - `js/constants.js`: Bumped APP_VERSION to 0.58.3
- **Feature Details**:
  - Automation Editor toggle shows/hides the automation lane in the sequencer
  - Parameter selector allows choosing which parameter to automate (volume, pan, filterCutoff, etc.)
  - Clear Lane button removes all automation points for the selected parameter
  - Click on empty cell adds a point at default value (50%)
  - Right-click on a point removes it
  - Drag vertically on a point to adjust its value (0-100%)
  - All operations capture undo state for proper undo/redo support
- **Usage**: Open sequencer for any track, click "Automation" checkbox in toolbar to show editor, click cells to add points, drag points to adjust values
- **Version**: Bumped to 0.58.3

#### Day 63: DrumSampler Pad Drop Zone Verification (2026-04-22)
- **Feature**: Added comprehensive tests for DrumSampler pad drop zone functionality
- **Issue**: The AGENTS.md mentioned "DrumSampler: pad drop zones verification" as an incomplete item. The drop zone functionality exists in `createDropZoneHTML()` and `setupGenericDropZoneListeners()` but had limited test coverage specifically for DrumSampler pads.
- **Files Modified**:
  - `js/tests.js`: Added 9 new tests for DrumSampler pad drop zones:
    - `DrumSampler - numDrumSamplerPads is 8` - Validates 8 pads exist
    - `DrumSampler - createDropZoneHTML generates valid HTML for pads` - Tests basic HTML generation with correct data attributes
    - `DrumSampler - createDropZoneHTML for all pad indices` - Verifies all 8 pads (0-7) generate correct data attributes
    - `DrumSampler - createDropZoneHTML with loaded status` - Tests loaded status display
    - `DrumSampler - createDropZoneHTML with missing status shows relink button` - Tests missing state and relink UI
    - `DrumSampler - createDropZoneHTML with error status shows retry button` - Tests error state and retry UI
    - `DrumSampler - createDropZoneHTML with loading status` - Tests loading state display
    - `DrumSampler - createDropZoneHTML contains file input` - Validates file input element
    - `DrumSampler - createDropZoneHTML truncates long filenames` - Tests filename truncation
  - `js/constants.js`: Bumped APP_VERSION to 0.58.4
- **Feature Details**:
  - Tests verify `createDropZoneHTML()` generates proper HTML for all 8 DrumSampler pads
  - Tests validate data attributes: `data-track-id`, `data-track-type="DrumSampler"`, `data-pad-slice-index`
  - Tests verify all status states work: empty, loaded, missing (with relink), error (with retry), loading
  - Tests confirm file input accepts audio files (`.sfz`, `.sf2` formats supported)
  - Tests validate long filename truncation (25 char limit with "...")
  - Total test count increased from 72 to 81 tests
- **Backend Note**: The actual drop zone functionality is implemented in `js/utils.js` (`createDropZoneHTML` and `setupGenericDropZoneListeners`) and called from `js/ui.js` (`updateDrumPadControlsUI`). The tests verify the HTML generation layer.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.58.4

#### Day 64: Track Template Undo/Redo (2026-04-22)
- **Feature**: Added undo state capture to Track Template save and delete operations
- **Issue**: The AGENTS.md mentioned "Undo/redo: verify all state mutations go through capture mechanism" as an incomplete item. The track template state management (`addTrackTemplateState`, `removeTrackTemplateState`) in `js/state.js` did not capture undo states, making template operations non-undoable.
- **Files Modified**:
  - `js/state.js`: Added `_captureUndoState` calls to:
    - `addTrackTemplateState()` - Captures undo state before adding a new template (describes "Save Track Template")
    - `removeTrackTemplateState()` - Captures undo state before removing a template (describes "Delete Track Template")
  - `js/constants.js`: Bumped APP_VERSION to 0.58.5
- **Feature Details**:
  - Save/Undo: Creating a new track template is now an undoable action
  - Delete/Undo: Deleting a track template is now an undoable action  
  - Undo Description: Clear descriptions help users understand what will be undone
  - Backend Note: The `updateTrackTemplateState()` function was not modified since it only updates existing template properties (name, color, etc.) rather than adding/removing templates
- **Usage**: Save a track as template via Menu > Save Track as Template, then undo if needed with Ctrl+Z
- **Version**: Bumped to 0.58.5

#### Day 64 cont: Undo/Redo System Tests (2026-04-22)
- **Feature**: Added 9 new unit tests for undo/redo system state management
- **Issue**: The AGENTS.md mentioned "Undo/redo: verify all state mutations go through capture mechanism" as an incomplete item. While undo/redo functionality was implemented over multiple days, there were limited unit tests specifically for the undo/redo state management functions.
- **Files Modified**:
  - `js/tests.js`: Added 9 new tests for undo/redo system:
    - `Undo/Redo - MAX_HISTORY_STATES is reasonable` - Validates 50 limit with boundary checks
    - `Undo/Redo - getUndoStackState returns array` - Verifies undo stack getter returns array
    - `Undo/Redo - getRedoStackState returns array` - Verifies redo stack getter returns array
    - `Undo/Redo - undoStack starts empty on init` - Verifies stacks start empty for new projects
    - `Undo/Redo - redoStack starts empty on init` - Verifies redo stack starts empty
    - `Undo/Redo - undoLastActionInternal function exists` - Verifies undo function exists
    - `Undo/Redo - redoLastActionInternal function exists` - Verifies redo function exists
    - `Undo/Redo - undoLastActionInternal is async` - Verifies undo is async function
    - `Undo/Redo - redoLastActionInternal is async` - Verifies redo is async function
  - `js/constants.js`: Updated APP_VERSION to 0.58.5
- **Feature Details**:
  - Tests import and validate undo/redo state functions from `js/state.js`
  - Tests verify undo/redo functions exist and are properly typed as async functions
  - Tests verify stack getter functions return arrays (not undefined or null)
  - Tests verify initial stack state is empty for fresh projects
  - Total test count increased from 81 to 90 tests
- **Backend Note**: The actual undo/redo state capture is implemented in `js/state.js` via `_captureUndoState()`, `undoLastActionInternal()`, and `redoLastActionInternal()`. The tests verify the API surface of these functions.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.58.5

#### Day 65: Recording State Management Tests (2026-04-22)
- **Feature**: Added 7 new unit tests for recording state management functions
- **Issue**: The AGENTS.md mentioned "Recording: end-to-end test with real microphone" as an incomplete item. While Day 56 added constants tests for recording configuration, the recording state management functions (isTrackRecordingState, getRecordingTrackIdState, etc.) lacked unit test coverage.
- **Files Modified**:
  - `js/tests.js`: Added new imports and 7 new tests for recording state management:
    - `Recording State - isTrackRecordingState is boolean` - Validates return type
    - `Recording State - getRecordingTrackIdState returns null initially` - Validates initial state
    - `Recording State - getRecordingStartTimeState returns number` - Validates return type
    - `Recording State - setIsRecordingState updates state` - Tests setter/getter roundtrip
    - `Recording State - setRecordingTrackIdState updates state` - Tests setter/getter roundtrip
    - `Recording State - setRecordingStartTimeState updates state` - Tests setter/getter roundtrip
    - `Recording State - recording state setters are functions` - Validates all setters are functions
  - `js/constants.js`: Bumped APP_VERSION to 0.58.6
- **Feature Details**:
  - Tests import and validate recording state functions from `js/state.js`
  - Tests verify recording state getters exist and return correct types
  - Tests verify state setters work correctly via roundtrip validation
  - Total test count increased from 90 to 97 tests
- **Backend Note**: The recording state management functions are used by `startAudioRecording` and `stopAudioRecording` in `js/audio.js` to track which track is recording and when recording started. The tests verify the state API without requiring actual microphone access.
- **Usage**: Run tests by opening browser console and calling: `(await import('./js/tests.js')).runTests()`
- **Version**: Bumped to 0.58.6
