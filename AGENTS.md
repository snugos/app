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
    - Fixed `isReconstructinging` typo → `isReconstructing` (variable name)
    - Fixed `getIsReconstructingingDAW` typo → `getIsReconstructingDAW` (function name)
    - Fixed `isReconstructconstructing` typo → `isReconstructing` (variable name)
    - Fixed in `addMasterEffect()`, `removeMasterEffect()`, and `reorderMasterEffect()` methods
- **Impact**: These typos caused incorrect variable references in the reconstruction logic, potentially causing undo state capture during project reconstruction when it should have been skipped. The fixes ensure that the `isReconstructing` flag is correctly checked during project load/reconstruction operations.
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
    - Prompts for intensity value (0.0 - 1.0)
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

## Code Style Guidelines

### Module Structure
- Each module exports functions and/or classes
- `initialize*Module(appServices)` pattern for dependency injection
- `localAppServices` holds references to shared services

### UI Components
- Use `createKnob()` for rotary controls
- Use `createDropZoneHTML()` and `setupGenericDropZoneListeners()` for file/audio drop zones
- Track-specific controls follow pattern: `initialize<TrackType>SpecificControls(track, winEl)`

### State Management
- Centralized state in `js/state.js`
- Getters: `get*State()` functions
- Setters: `set*State()` functions
- Undo/redo via `captureStateForUndoInternal(description)`

### Naming Conventions
- Track methods: `setDrumSamplerPadVolume`, `setDrumSamplerPadPitch`, `setDrumSamplerPadEnv`
- UI element IDs: `<type><controlName>-<trackId>-placeholder` for knob placeholders
- Container IDs: `<type>Container-<trackId>-<subtype>` for specific containers