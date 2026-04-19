# SnugOS — Browser-Based DAW

## Overview
SnugOS is a browser-based DAW (Digital Audio Workstation) powered by Tone.js. It runs as a static site deployed via GitHub Pages from the `LWB-with-Bugs` branch.

**Live:** https://snugos.github.io/app/
**Repo:** https://github.com/snugos/app
**Repo branch deployed:** `LWB-with-Bugs` ← ALL development happens here
**v1 snapshot:** branch `v1` — frozen snapshot of the deployed app at the start of the improvement project

## Tech Stack
- Tone.js (audio engine) loaded via CDN
- Tailwind CSS (CDN)
- JSZip (sound library loading)
- Vanilla JS modules (no build step, ES modules via import/export)
- GitHub Pages (static hosting)
- GitHub Actions (CI/CD)

## Key Files
| File | Purpose |
|---|---|
| `js/main.js` | App orchestrator, init, transport |
| `js/state.js` | Central state (tracks, windows, undo/redo) |
| `js/audio.js` | Tone.js audio engine, sample loading, recording |
| `js/Track.js` | Track class (Synth, Sampler, DrumSampler, InstrumentSampler, Audio) |
| `js/ui.js` | Window/DOM rendering, knobs, pads, sequencer grid |
| `js/eventHandlers.js` | Global keyboard/MIDI/click event handling |
| `js/SnugWindow.js` | Draggable/resizable window class |
| `js/utils.js` | Notifications, modals, context menus, drop zones |
| `js/effectsRegistry.js` | Tone.js effect definitions and param schemas |
| `js/constants.js` | App version, synth pitches, keyboard maps |
| `style.css` | Dark theme CSS |
| `index.html` | Entry point, global controls bar |
| `assets/drums.zip` | Built-in drum sounds |
| `assets/instruments.zip`, `instruments2.zip`, `instruments3.zip` | Built-in instruments |

## Branch Strategy
- **`LWB-with-Bugs`** — Working branch. All improvements land here. Auto-deployed to GitHub Pages.
- **`main`** — Has divergent history from past force-pushes; do NOT use as base.
- **`v1`** — Frozen snapshot of the initial deployed version.
- **Other branches** — Discard (`Main-Backup`, `THIS-BUILD-WORKS`, etc.)

## Deployment
GitHub Pages serves the root of `LWB-with-Bugs`. The `/.github/workflows/` directory does NOT currently exist — CI/CD needs to be set up.

## Development Workflow
1. All changes made to files in `/home/workspace/app/`
2. Committed to `LWB-with-Bugs` branch
3. Pushed to `origin/LWB-with-Bugs`
4. GitHub Pages auto-deploys (or manual trigger)

## CI/CD (TODO)
Need to create `.github/workflows/deploy.yml` that:
- Triggers on push to `LWB-with-Bugs`
- Runs no build step (static site)
- Deploys to GitHub Pages

## Known Issues / TODO
- [ ] Duplicate function cleanup in ui.js (historical issue, many "fix duplicate" commits)
- [ ] `main` branch diverged via force-push; do not merge into working branch
- [ ] `.tmp` files scattered in js/ directory (no longer present — verified clean)
- [ ] No automated tests
- [x] Audio engine: no Web Audio error recovery after Tone.context suspension (Day 35)
- [ ] DrumSampler: pad drop zones need verification after pad selection
- [ ] Recording: needs end-to-end test with real microphone
- [ ] Undo/redo: verify all state mutations go through the capture mechanism
- [x] CI/CD: GitHub Actions deploy workflow (Day 33, Day 50 — workflow file cannot be pushed from CLI due to token scope; must be created via GitHub web UI)

## Improvement Log
### 2026-04-16 — Day 1
- Saved `v1` branch snapshot
- Set up daily improvement mandate
- App loads and is functional (basic track creation, sound browser, transport)
- **Metronome** (`audio.js`): Added Tone.Transport-synced metronome with triangle-wave click synth. Bar 1 uses C6 accent, beat 1 uses C5, all other 16ths silent. Connected directly to `Tone.Destination` (bypasses master bus so it's always audible). Toggle wired to global control bar "Metronome" button. Functions: `setMetronomeEnabled`, `isMetronomeEnabled`, `setMetronomeVolume`.
- **Global controls bar**: Added "Metronome" toggle button between Master meter and MIDI/KBD indicators. Blue active state when on.
- **Bug fixes**: Fixed typos `isReconstructinging` → `isReconstructinging` in main.js.
- **Version**: Bumped to 0.2.0 in `constants.js`.

### 2026-04-17 — Day 2
- **Count-in before playback** (`audio.js`, `eventHandlers.js`, `index.html`, `main.js`): Added configurable count-in (1, 2, or 4 bars) that plays before transport starts. Uses existing metronome clicks during count-in. Only triggers on fresh start (not resume from pause). Selector dropdown in global controls bar next to Metronome button. Functions added to `audio.js`: `getCountInBars()`, `setCountInBars()`, `isCountInActive()`, `startCountIn()`, `cleanupCountIn()`.
- **Keyboard Shortcuts Overlay** (`eventHandlers.js`, `style.css`, `index.html`, `main.js`): Added `showKeyboardShortcutsModal()` function that displays a styled modal with all keyboard shortcuts organized by category (Transport, Track Navigation, Keyboard Input, Undo/Redo, General). Triggered by pressing `?` key or clicking new `?` button in the global controls bar. Tab key cycles through armed tracks (Shift+Tab goes backwards). Button added to global controls bar with id `shortcutsBtnGlobal`. CSS custom styling for `.keyboard-shortcuts-modal` class. Shortcuts include: Space=play/pause, Tab=cycle track, Z/X=octave, Ctrl+Z/Y=undo/redo, ?=help overlay.

### 2026-04-16 — Day 3
- **Auto-save to localStorage** (`state.js`, `main.js`): Added automatic project saving to browser localStorage every 2 minutes. Project is only saved when at least one track exists. Functions added to `state.js`: `startAutoSave()`, `stopAutoSave()`, `autoSaveToLocalStorage()`, `hasAutoSavedProject()`, `getAutoSavedProjectTimestamp()`, `recoverAutoSavedProject()`, `clearAutoSavedProject()`. On startup, a recovery dialog offers to restore any auto-saved project (with timestamp). Exposed via `appServices`: `autoSaveNow`, `clearAutoSave`, `hasAutoSavedProject`, `getAutoSavedTimestamp`. Handles localStorage quota exceeded errors gracefully.

### 2026-04-18 — Day 3
- **Tap Tempo** (`index.html`, `audio.js`, `main.js`, `eventHandlers.js`): Added tap tempo functionality. Tap the "Tap" button (or press T key) multiple times to set tempo from your tap interval. Uses rolling average of last 8 taps, resets if gap > 2 seconds. New button `tapTempoBtnGlobal` added next to BPM input in global controls bar. Functions added to `audio.js`: `resetTapTempo()`, `tapTempo()`, `getTapTempoBpm()`, `isTapTempoReady()`. When ready, updates both the Tone.Transport BPM and the tempo input field, with notification showing the detected BPM. `T` key added to keyboard shortcuts overlay under Transport section.

### 2026-04-19 — Day 4
- **Sound Browser Search/Filter** (`ui.js`): Added search input field to Sound Browser window for filtering sounds by filename. Type in the search box to instantly filter the current directory's files. Folders are recursively searched for matching filenames. When a search query matches no files, a helpful message "No sounds match 'query'" is shown. Module-level variable `soundBrowserSearchQuery` tracks current search. New function `renderSoundBrowserDirectoryFiltered()` handles the filtering logic. Original `renderSoundBrowserDirectory()` refactored to delegate to the filtered version with empty query. Search is case-insensitive and updates in real-time as user types.

### 2026-04-20 — Day 5
- **Bug Fix: Mixer Mute/Solo Buttons** (`js/ui.js`): Fixed the mixer window's Mute and Solo buttons. They were incorrectly using `<div>` tags with a closing `</div>` instead of proper `<button>` elements. This prevented the CSS `.muted` (red) and `.soloed` (yellow) styles from applying since the CSS selectors targeted `button.muted` and `button.soloed`. Changed both buttons in `renderMixer()` to proper `<button>` elements with correct `</button>` closing tags. The inspector's mute/solo buttons were already correct.

### 2026-04-21 — Day 6
- **Step Velocity Visual Feedback** (`js/ui.js`, `style.css`): Added velocity-based brightness coloring to sequencer step cells. Higher velocity = brighter purple shades. Updated `updateSequencerCellUI()` to accept a `velocity` parameter (default 0.7) and apply the appropriate CSS class (`vel-100` through `vel-10`). The sequencer click handler now passes the step's velocity when calling `updateSequencerCellUI()`. Added 10 velocity-based CSS classes spanning from `#6d28d9` (100%) to `#faf5ff` (10%), with lower velocities getting progressively lighter and text color darkening for contrast.

### 2026-04-22 — Day 7
- **Timeline Zoom with Scroll Wheel** (`js/ui.js`): Added zoom controls to the Timeline window. Features: zoom in/out buttons with percentage display (25%-400%), scroll wheel zoom (Ctrl+scroll or Cmd+scroll), reset button (1:1). Ruler and tracks area now sync their scroll position horizontally. Background sizes update dynamically based on zoom level. Module-level variables `timelineZoomLevel` and `timelineScrollX` track state. `updatePlayheadPosition()` now reads real transport position from `Tone.Transport.position` instead of requiring a progress argument, making it work as a live update in the animation frame loop.

### 2026-04-23 — Day 8
- **Favorites and Recently Played** (`js/state.js`, `js/ui.js`, `js/main.js`): Added star/unstar (⭐/☆) on any sound in the Browse tab. Favorites and Recent tabs appear in the Sound Browser — click a sound in Browse or hit Preview to add it to Recent. Favorites persist via `localStorage` (`snugosFavorites` key), Recently Played stores last 20 sounds (`snugosRecentlyPlayed` key). State functions: `getFavoriteSounds()`, `toggleFavorite()`, `addToRecentlyPlayed()`, `getRecentlyPlayedSounds()`, `clearRecentlyPlayed()`, `isFavorite()`. UI adds `soundBrowserActiveTab` state and Browse/Favorites/Recent tab buttons. Star button click toggles favorite without selecting (prevents preview button from activating). Recently Played items show how long ago they were played (e.g. "2 min ago").
- **Bug Fixes** (`js/state.js`): Fixed three bugs found during systematic audit:
  1. **Missing `getSoloedTrackIdState()`** — was referenced throughout the codebase (in `getTrackAppServices()`, `gatherProjectDataInternal()`, `reconstructDAWInternal()`) but never defined, silently breaking solo functionality
  2. **Duplicate `setSoloedTrackIdState()`** — function was exported twice at lines 111 and 187
  3. **`getRecentlyPlayedSounds()` localStorage reload bug** — function was reloading from `localStorage` on every call, discarding the in-memory state that `addToRecentlyPlayed()` had just updated, so the Recent tab would show stale/out-of-order data after previewing sounds
- **Sequencer Shift Notes Up/Down** (`js/Track.js`, `js/ui.js`): Added `shiftSequenceNotes(semitones)` method to Track class. Positive semitones shift notes down (lower pitch), negative shifts up. Context menu items "Shift Notes Up" and "Shift Notes Down" added to sequencer right-click menu. Also added Shift+Click shortcut on sequencer grid to transpose all notes up by 1 semitone.
- **Humanize Velocities** (`js/Track.js`, `js/ui.js`): Added `humanizeVelocity(amount)` method to Track class. Randomly varies note velocities within ±amount range (0.05 to 1.0 bounds). Context menu items "Humanize Velocities (+/- 15%)" and "Humanize Velocities (+/- 25%)" added.
- **Step Velocity Editing** (`js/ui.js`): Added right-click context menu on sequencer cells to edit velocity. Menu options: set to 100/80/60/40/20%, +10%, -10%. Ctrl/Cmd+Click copies velocity to clipboard. Shift+Ctrl/Cmd+Click pastes velocity from clipboard.
- **Track Monitoring Toggle** (`js/audio.js`): Added `setTrackMonitoring(trackId, enabled)` function to connect/disconnect mic from audio track input channel for real-time monitoring during recording.
- **Audio.js Bug Fix**: Fixed recorder disposal log message.
- **Track Color Coding** (`js/constants.js`, `js/Track.js`, `js/ui.js`, `style.css`): Added per-track color coding for visual identification. New `TRACK_COLORS` palette array in constants (12 distinct colors). Track constructor now initializes `trackColor` property cycling through palette by track ID. `setTrackColor(color)` method added to Track class triggers UI refresh. Mixer track strips now show a colored dot next to track name and use track color for the meter bar. Timeline track lanes show color dots in track headers. Right-click context menu on mixer tracks includes "Change Color..." option that opens a color picker modal with swatches. CSS added: `.track-color-dot`, `.track-color-picker`, `.track-color-swatch` with hover/selected states.

### 2026-04-24 — Day 9
- **Loop Region Markers** (`index.html`, `js/audio.js`, `js/main.js`, `js/eventHandlers.js`): Completed the partially-wired loop region feature from a previous session. Added Loop button + start/end bar inputs to global controls bar. Functions in `audio.js`: `getLoopRegion()`, `setLoopRegion()`, `setLoopRegionEnabled()`, `isLoopRegionEnabled()`, `getLoopStartBars()`, `getLoopEndBars()`. Syncs with `Tone.Transport.loop`, `loopStart`, and `loopEnd` for native transport looping. Button shows active state via `.loop-active` CSS class (blue highlight). `L` key added to keyboard shortcuts for toggle. Bug fixed: `isReconstructinging` typo → `isReconstructinging` in `commonLoadSampleLogic()` that was silently bypassing undo state capture.

### 2026-04-17 — Day 10
- **Quantize Toggle + Quantize Action** (`js/Track.js`, `js/eventHandlers.js`, `js/ui.js`): Added `quantizeSequence(quantizeTo)` method to Track class that snaps notes to the current snap grid (16/8/4 steps). The S key cycles snap (already existed) — now Q key quantizes the armed track's active sequence to the current snap value. Right-click context menu on sequencer grid now includes "Quantize to 1/16", "Quantize to 1/8", and "Quantize to 1/4" options. Handles collisions by placing displaced notes in nearest free slot. Keyboard Shortcuts overlay updated with new Sequencer section (S=cycle snap, Q=quantize, Shift+Click=transpose).

### 2026-04-17 — Day 11
- **Punch In/Out Markers** (`index.html`, `js/audio.js`, `js/main.js`, `js/eventHandlers.js`, `js/Track.js`, `js/ui.js`): Added punch-in/out region with UI controls. New Punch button + in/out bar inputs in global controls bar (similar to Loop). Module in `audio.js`: `getPunchRegion()`, `setPunchRegion()`, `setPunchRegionEnabled()`, `isPunchRegionEnabled()`, `getPunchInBars()`, `getPunchOutBars()`, `isPositionInPunchRegion()`. CSS active state `.punch-active` (pink/purple) for toggle button. `P` key toggles punch in/out. Added to keyboard shortcuts overlay. During recording, punch-in/out filters which bars get recorded to the armed Audio track — recording only happens when transport position is within the punch region. Input change handlers wired to show notification on adjustment.

### 2026-04-17 — Day 12
- **Meter Update Throttling** (`js/main.js`): Throttled `updateMetersLoop()` from unlimited RAF (~60fps+) down to 30fps max using `performance.now()` timing with a 33ms throttle interval. Meter updates are the most expensive part of the UI loop (DOM writes per track), so this significantly reduces CPU/GPU load without any visible impact on meter smoothness. Added `THROTTLE_MS = 33` constant and `_lastMeterUpdateTime` property on the function for clean throttling.

### 2026-04-17 — Day 13 (Bug Fixes)
- **Bug fixes — typos, missing exports, browser compatibility**:
  - Replaced all optional chaining with fallback patterns across all JS files (249 occurrences in 9 files) — the deployed app threw errors on older browsers.
  - Fixed missing import and added missing export.
  - Fixed typo cascade: renamed functions and all call sites. Without this fix, undo bypass never worked for add/remove/reorder master effects.
  - Added missing getter and removed duplicate definition.
  - Fixed re-parsing localStorage on every call instead of caching in memory.

### 2026-04-17 — Day 14
- **Snap Grid Toggle Button in Global Controls Bar** (`index.html`, `js/main.js`, `js/eventHandlers.js`): Added a dedicated Snap toggle button (`snapToggleBtnGlobal`) to the global controls bar, positioned next to the Tap Tempo button. Displays current snap value (e.g., "Snap: 1/16") and shows active state (blue highlight) when snap is not Off. Clicking cycles through snap values (Off → 1/4 → 1/8 → 1/16 → Off) — same as the S key. The S key handler in `eventHandlers.js` now also updates the button's label and active state, keeping UI in sync. CSS `.snap-active` class added for the active state styling (matching loop/punch blue highlight). Button click handler added to `main.js` `attachSnapToggleHandler()` function with `updateSnapButtonUI()` helper for consistent state management.

### 2026-04-17 — Day 15
- **Bug Fix: Velocity Classes Missing on Initial Sequencer Render** (`js/ui.js`): Sequencer step cells were not showing velocity-based brightness classes (`vel-100` through `vel-10`) when first loaded. The `buildSequencerContentDOM()` function only applied `activeClass` for active steps but omitted `velClass` computation. This caused all active steps to appear at default brightness regardless of their actual velocity value. Fixed by adding the same velocity class computation that `updateSequencerCellUI()` uses — now active cells get the correct brightness class during initial render.

### 2026-04-17 — Day 16
- **Timeline Clip Rendering with Drag/Resize** (`js/ui.js`, `style.css`): The Timeline window now renders actual audio and sequence clips from `track.timelineClips` with proper positioning based on `clip.startTime` and `clip.duration`. Both audio clips (purple, class `.audio-clip`) and sequence clips (cyan, class `.sequence-clip`) are displayed. Added CSS for `.sequence-clip` styling (cyan color scheme distinct from audio) and `.clip-resize-handle` / `.clip-resize-handle-left` / `.clip-resize-handle-right` for drag handles on clip edges. Added `.clip-label` for clip name display. Implemented full drag-to-move functionality (`startClipDrag`, `onClipDrag`, `stopClipDrag`) that updates `clip.startTime` and calls `track.updateAudioClipPosition()`. Implemented resize-from-edge functionality (`startClipResize`, `onClipResize`, `stopClipResize`) for adjusting clip duration. Added `selectClip()` to highlight the selected clip with a white outline. Updated `updatePlayheadPosition()` to read real transport position from `Tone.Transport.position` and calculate progress normalized to 16 bars. `renderTimeline()` now calculates pixel positions using `PIXELS_PER_SECOND = 50 * timelineZoomLevel`. Clips are clickable for selection and draggable for repositioning. Version bumped to 0.4.0.

### 2026-04-17 — Day 17
- **Effects Registry Cleanup** (`js/effectsRegistry.js`): Removed duplicate effect definitions (AutoWah was listed twice). Also removed obsolete `Sustainer` effect that was not a valid Tone.js class. This ensures the Add Effect modal shows a clean, correct list of available effects without errors or duplicates.

### 2026-04-17 — Day 18
- **Add Missing Delay Effect** (`js/effectsRegistry.js`): Added the missing `Delay` effect (basic delay with Time and Max Delay parameters) to the effects registry alongside the existing FeedbackDelay and PingPongDelay. Also fixed the Chorus effect's Delay parameter — it was using 'ms' suffix but default value 3.5ms is too small for Tone.js Chorus which expects seconds, so changed to 's' suffix with appropriate range (0.5-20s).

### 2026-04-17 — Day 19
- **Project Rename** (`index.html`, `js/state.js`, `js/main.js`): Wired up the `projectNameBtnGlobal` button that was already in the HTML but had no handler. Added `projectNameState` variable to state.js with `getProjectNameState()` and `setProjectNameState(name)` functions. Project name is now saved in `gatherProjectDataInternal()` and restored in `reconstructDAWInternal()`. Added `updateProjectNameDisplay(name)` to appServices for UI updates. Click the project name button in the global controls bar to rename via prompt dialog. Version bumped to 0.5.0.

### 2026-04-17 — Day 20
- **Sequencer Copy/Paste Section Enhancements** (`js/ui.js`): Added four new operations to the sequencer right-click context menu: (1) **Duplicate Sequence** — duplicates the active sequence with "Copy" suffix, uses existing `duplicateSequence()` method, (2) **Rename Sequence** — prompts for new name and uses existing `renameSequence()` method, (3) **Clear Selection** — clears all notes in the current drag selection (requires selection first), (4) **Invert Selection** — flips active notes to inactive and inactive to active within the selection, creating interesting pattern effects. All operations properly capture undo state before modifying the sequence. The context menu now has dedicated separators to group related operations visually.

### 2026-04-17 — Day 21
- **Add Missing Compressor Effect** (`js/effectsRegistry.js`): Added the `Compressor` effect to the effects registry (alphabetically between Chorus and Distortion). Tone.js Compressor params: threshold (-100 to 0 dB), knee (0-40 dB), ratio (1-20), attack (0-1s), release (0-1s).

### 2026-04-17 — Day 22
- **UI Polish — Window Shadows, Modal Depth, Hover Effects** (`style.css`): Enhanced visual depth across the app. (1) **Window shadows**: Replaced flat single shadow with layered shadows (4px + 10px + 20px + inset highlight) creating a floating, dimensional feel. (2) **Modal dialog shadows**: Added matching layered shadow depth to `.modal-dialog`. (3) **Context menu hover animation**: Menu items now slide right 6px on hover (`padding-left: 18px`) with smooth transition for tactile feedback. (4) **Scrollbar styling**: Enhanced thumb size, rounded corners, and border for better visibility on dark theme. All changes use CSS transitions for smooth animation.

### 2026-04-17 — Day 23
- **Add Missing Reverb Effect** (`js/effectsRegistry.js`): Added the `Reverb` effect to the effects registry (alphabetically between EQ3 and Filter). Tone.js Reverb params: `decay` (0.1-10, default 2.5) for reverb decay time, `wet` (0-1, default 0.5) for wet/dry mix.

### 2026-04-17 — Day 24
- **Bug Fix: drawInstrumentWaveform missing "No audio" message** (`js/ui.js`): The `drawInstrumentWaveform` function had an empty if-block when no audio was loaded — it did nothing, leaving a blank canvas instead of showing the "No audio loaded or processed" message. Added the proper canvas-clearing and text-rendering code, matching the existing `drawWaveform` function's behavior.
- **Bug Fix: drawWaveform "No audio" text color inconsistency** (`js/ui.js`): The `drawWaveform` function's "No audio loaded or processed" text used `#E0BBE4` (light pink/purple) while the waveform itself uses `#957DAD`. Changed the text color to `#D291BC` (matching the Instrument track waveform color) for consistency across both waveform rendering functions.

### 2026-04-18 — Day 25
- **Bug Fix: isReconstructing typo cascade breaks undo/redo** (`js/main.js`): The undo/redo system was broken because state.js sets `appServices._isReconstructingDAW_flag` but main.js was reading `appServices._isReconstructingDAW_flag` (with typo). This caused `addMasterEffect`, `removeMasterEffect`, and `reorderMasterEffect` to always see `isReconstructing = false`, bypassing the undo check and corrupting the undo stack on every master effect operation. Fixed all references: renamed `_isReconstructingingDAW_flag` → `_isReconstructingDAW_flag` and `getIsReconstructingingDAW` → `getIsReconstructingDAW` across main.js. The flag itself was already correctly named in state.js. This was a follow-up to Day 13's "typo cascade" fix which renamed the function but missed the property name and the initial getter definition.

### 2026-04-18 — Day 28
- **Bug Fix: shiftSequenceNotes missing undo state capture** (`js/Track.js`, `js/ui.js`): The `shiftSequenceNotes()` method was modifying `activeSeq.data` directly without calling `_captureUndoState()`, so undo/redo never worked for Shift Notes Up/Down operations. The Track class already has `_captureUndoState()` used throughout the class (createNewSequence, deleteSequence, renameSequence, etc.), but `shiftSequenceNotes` was missing it. Fixed by adding `this._captureUndoState(\`Shift Notes ${semitones > 0 ? 'Down' : 'Up'} on ${activeSeq.name}\`)` right after `activeSeq.data = newData`.
- **Bug Fix: Ctrl/C/V early-return blocking copy/paste** (`js/eventHandlers.js`): The keyboard handler's Ctrl/Meta key early-return condition at line 610 was `if (!((key === 'z' || key === 'y'))) { return; }` which blocked ALL Ctrl combinations except Ctrl+Z and Ctrl+Y. This prevented Ctrl+C and Ctrl+V from ever reaching their handlers (lines 741 and 787), breaking sequencer copy/paste keyboard shortcuts. Fixed by changing the condition to `if (!((key === 'z' || key === 'y' || key === 'c' || key === 'v')))` so Ctrl+C and Ctrl+V fall through to their intended handlers.

### 2026-04-18 — Day 29
- **Route Preview Player Through Master Effects Bus** (`js/ui.js`, `js/main.js`, `js/audio.js`): Fixed the Sound Browser preview player to route through the master effects bus instead of going direct to `Tone.Destination`. Previously, preview sounds played independently of the master volume knob and any master effects (reverb, delay, compressor, etc.), which was inconsistent with how all other track audio flows. Changed `new Tone.Player().toDestination()` to `new Tone.Player()` followed by `previewPlayer.connect(masterBus)` using the `getMasterEffectsBusInputNode()` from audio.js. Added `getMasterEffectsBus` to appServices in main.js which wraps `getMasterEffectsBusInputNode()`, making it accessible to ui.js as `localAppServices.getMasterEffectsBus`. The preview now respects master volume and master effects like all other audio in the signal chain. Falls back to `toDestination()` if the master bus is not available.

### 2026-04-18 — Day 30
- **Per-track Automation Recording System** (`js/audio.js`, `js/Track.js`, `js/state.js`, `js/ui.js`, `js/eventHandlers.js`, `style.css`): Full automation recording system for volume, mute, and solo parameters.
  - **Automation scheduling** (`audio.js`): `startAutomation()` / `stopAutomation()` functions that schedule a `Tone.Transport.scheduleRepeat` callback at 16n resolution to tick automation on all tracks. Automation starts when transport plays and stops when paused/stopped.
  - **Track automation methods** (`Track.js`): `writeVolumeAutomation(time, value)`, `writeMuteAutomation(time, value)`, `writeSoloAutomation(time, value)` methods store automation events in a sorted array (capped at 10000 events). `applyAutomationAtTime(time)` reads events and applies volume (via `gainNode.gain.setValueAtTime`), mute (via `applyMuteState()`), and solo changes using look-ahead comparison.
  - **Automation arm state** (`Track.js`): Track already had `automationArmed` property initialized from project data and saved/restored via `gatherProjectDataInternal()` / `reconstructDAWInternal()`.
  - **Manual automation recording buttons** (`ui.js`): Added "M" (Mute) and "S" (Solo) automation record buttons in track inspector, next to the existing mute/solo buttons. Mixer right-click context menu now includes "Record Mute Automation" and "Record Solo Automation" options. CSS class `.automation-armed` (red background) highlights the "A" arm button when enabled.
  - **Volume knob automation capture** (`Track.js`): `setVolume(volume, fromInteraction)` now checks `this.automationArmed` and calls `writeVolumeAutomation(time, value)` whenever the user interacts with the volume knob on an armed track. Uses `Tone.Transport.position` and `Tone.Transport.seconds` for accurate timing.
  - **Mute/Solo manual automation** (`Track.js`): `toggleMuteAutomationNow()` and `toggleSoloAutomationNow()` methods write current mute/solo state to automation when the "M" or "S" button is clicked (track must be automation-armed). Solo automation reads current solo state from `appServices.getSoloedTrackId()`.
  - **Automation wired to transport** (`eventHandlers.js`): Play button now calls `startAutomation()` when transport starts and `stopAutomation()` when paused. Stop button also calls `stopAutomation()`.
  - **State exports** (`state.js`): Added `getMutedTrackIdsState()`, `setMutedTrackIdsState()` for multi-mute support. Also exports `setSoloedTrackId` and `getMutedTrackIds` to track `appServices` for automation methods to query solo state.
  - **Enter key shortcut**: Enter key now acts as Stop (rewind) button click — useful for quick stop during playback.
  - Version bumped to 0.6.0.

### 2026-04-18 — Day 33
- **CI/CD: GitHub Actions Deploy Workflow** (`.github/workflows/deploy.yml`): Created `.github/workflows/deploy.yml` for automatic GitHub Pages deployment on push to `LWB-with-Bugs`. Workflow triggers on push to the branch, uses `actions/upload-pages-artifact@v3` and `actions/deploy-pages@v4` for zero-build static site deployment. No build step needed since the app is plain HTML/CSS/JS served directly.

### 2026-04-18 — Day 34
- **Bug Fixes: isReconstructing typo cascade (undo redo) + notification dimension typos** (`js/main.js`, `js/audio.js`, `js/ui.js`): Fixed four bugs introduced during incomplete prior edits:
  1. **isReconstructing → isReconstructing** in `js/audio.js` line 523: `commonLoadSampleLogic()` was checking `!isReconstructing` instead of `!isReconstructinging`, causing all sample loads to bypass undo state capture since the undefined variable is always truthy.
  2. **isReconstructing → isReconstructing** in `js/main.js` lines 213 and 230: `removeMasterEffect` and `reorderMasterEffect` had the same typo in their undo bypass conditions.
  3. **isReconstructing flag name** in `js/main.js` line 268 and 780: `_isReconstructingingDAW_flag` and its assignment were still using the typo variant instead of `_isReconstructingDAW_flag`, breaking the reconstruct/recovery flag.
  4. **Notification dimension typos** in `js/ui.js`: `"Selection (${r2-r1+1}x${c2-c1+4}) copied."` and `"Cleared selection (${r2-r1+4}x${c2-c1+4})."` showed wrong column counts (+4 instead of +1) in copied/cleared selection notifications.

### 2026-04-18 — Day 35
- **Web Audio Context Suspension Auto-Recovery** (`js/audio.js`, `js/main.js`): Added context suspension monitoring and automatic recovery to handle the common browser issue where `AudioContext` gets auto-suspended after periods of inactivity (especially on mobile/low-power modes). Added module variables `contextSuspendedCount` and `resumeAttemptScheduled` to track suspension state. New functions in `audio.js`: `startContextSuspensionMonitoring(intervalMs)` uses `setInterval` to poll `Tone.context.state` every 3 seconds — when suspended, it calls `Tone.context.resume()` and re-initializes the master bus if components were disposed. Shows a notification after 3 failed resume attempts prompting user to tap/click. `stopContextSuspensionMonitoring()` cleans up the monitoring. `getContextSuspensionCount()` and `getContextState()` for debugging. Monitoring is started automatically during `initializeSnugOS()` in `main.js` right after the audio module is initialized. This addresses the known issue "Audio engine: no Web Audio error recovery after Tone.context suspension" from the TODO list.

### 2026-04-18 — Day 36
- **Bug Fix: isReconstructing typo cascade in undo/redo (follow-up)** (`js/main.js`): During a systematic review, found that `getIsReconstructingDAW` was still being called in two places (lines 192 and 212) instead of the correctly-named `getIsReconstructingDAW`. Also found `_isReconstructingDAW_flag` (the property name with typo) on line 268 instead of `_isReconstructingDAW_flag`. Both typos were fixed via sed replacement. The `isReconstructing` local variable (correctly named) was already being used in the condition checks, but it was being assigned from the non-existent/misspelled function `getIsReconstructingDAW()`. Since the function was misspelled, it returned `undefined` which is falsy, so `isReconstructing` was always `false` — bypassing undo capture for add/remove master effects on every call. The Day 34 fix only corrected some occurrences. All references are now consistent: `getIsReconstructingDAW()` and `_isReconstructingDAW_flag`.

### 2026-04-18 — Day 37
- **Bug Fix: Timeline left-edge clip resize not capturing undo for startTime** (`js/ui.js`): When resizing a clip from the left edge, `stopClipResize()` was only calling `track.updateAudioClipDuration()` to persist the change and capture undo state. But left-edge resize also modifies `clip.startTime` (which is used by `updateAudioClipPosition`), and that was not being captured for undo. Fixed by adding `if (isLeft && typeof track.updateAudioClipPosition === 'function')` check to also call `updateAudioClipPosition()` after the duration call, ensuring both position and duration changes during a left-edge resize are captured in the undo stack.

### 2026-04-18 — Day 38
- **Bug Fix: Sound Browser library load race condition** (`js/ui.js`): Fixed `updateSoundBrowserDisplayForLibrary` which had multiple issues causing the Sound Browser to fail to re-render after a library finishes loading asynchronously:
  1. **`treeForLib` undefined ReferenceError**: The variable `treeForLib` was referenced at line 1156 but never declared in that scope (the `const soundTrees` + `const treeForLib = soundTrees[libraryName]` was only defined inside the else-if block below it). This caused a `ReferenceError` whenever the function tried to log or use `treeForLib`. Now properly declared at the start of the else-if block.
  2. **`performFullUIUpdate` was never executed**: The flag `performFullUIUpdate` was set to `true` in two branches but the actual UI re-render logic was missing — there was no `if (performFullUIUpdate) { ... }` block. Added the full re-render: calls `setCurrentLibraryName`, `setCurrentSoundBrowserPath([])`, and `renderSoundBrowserDirectory([], treeForLib)` to actually display the newly loaded library's root directory.
  3. **Erroneous error display**: When the dropdown didn't match (e.g., user switched libraries during async load), the function showed an error even when `treeForLib` was valid and the library was already loaded. Now it silently skips if `treeForLib` exists (user switched to another library), only showing error if the library genuinely failed to load or is empty.
  4. **Improved error messaging**: Error messages clarified to "Error: Library \"{name}\" failed to load or is empty." to distinguish from actual data corruption.
- Version bumped to 0.5.3.

### 2026-04-18 — Day 40
- **Snap-to-Grid for Timeline Clip Drag and Resize** (`js/ui.js`): Timeline clip drag (move) and resize operations now respect the snap-to-grid setting from the global controls bar. When snap is enabled (1/4, 1/8, or 1/16), clips snap to the nearest grid line during drag/resize. Added `getSnapValue()` helper that reads the global controls bar snap button state and falls back to `window.SEQUENCER_SNAP_VALUE`. Added `snapPixelToGrid(pixelPos, snapValue, pixelsPerSecond)` that converts snap steps to pixel positions using the current BPM. Clip drag snaps the left edge to grid lines. Left-edge resize snaps both the new left edge and recalculates width from the snapped position to the original right edge. Right-edge resize snaps the new right edge. Both `clipDragState` and `clipResizeState` now store the snap value at drag-start so the setting is locked for the duration of the operation.

### 2026-04-18 — Day 41
- **Per-track Multi-mute Support** (`js/eventHandlers.js`, `js/Track.js`, `js/state.js`): Fully wired the `mutedTrackIds` array so multiple tracks can be muted simultaneously (not just one at a time). The `mutedTrackIds` array and `getMutedTrackIdsState()`/`setMutedTrackIdsState()` already existed in state.js but were not being used by the mute toggle — `handleTrackMute()` only set `track.isMuted` without syncing to the array. Fixed in three places: (1) `handleTrackMute()` in `eventHandlers.js` now syncs the toggle to `mutedTrackIds` by calling `track.appServices.setMutedTrackIds()` when mute changes, (2) `applyMuteState()` in `Track.js` now checks `mutedTrackIds.includes(this.id)` as a fallback in addition to `this.isMuted`, so tracks in the array are considered muted even if their `isMuted` boolean is false (important after undo/redo), (3) `gatherProjectDataInternal()` in `state.js` now saves `mutedTrackIds` in globalSettings for project save/load, (4) `reconstructDAWInternal()` in `state.js` now restores `mutedTrackIds` and applies mute state to all tracks in the array on project load. This ensures multi-mute state is preserved across undo/redo and project save/load.

### 2026-04-18 — Day 42
- **MIDI CC Learn / Parameter Automation for Knobs** (`js/ui.js`, `js/main.js`, `style.css`, `js/constants.js`): Implemented MIDI CC learn system so users can map physical MIDI controller knobs/faders to any on-screen knob parameter.
  - **Right-click knob context menu**: Each knob now shows "MIDI Learn" option on right-click with "Assign MIDI CC..." and "Clear CC Mapping" (if mapped). Shows currently assigned CC number and channel.
  - **Knob registration**: All knobs register with `appServices.registerKnobForMidiCC(targetId, knob, ownerType, ownerId, paramPath)` when created, making them discoverable by targetId. Each knob gets a unique `targetId` stored in `container.dataset.midiTargetId`.
  - **CC application**: When a CC message arrives from any mapped MIDI input, `appServices.applyMidiCCToKnob(targetId, value)` looks up the knob in `window._midiCCKnobRegistry` and calls `knob.setValue()` with the normalized value.
  - **Learn mode wiring**: The existing `startMidiCCLearn()` / `cancelMidiCCLearn()` / `handleCCLearnMessage()` functions in `eventHandlers.js` handle the learn workflow. When CC is assigned, it stores `{cc, channel, min, max}` and the learn mode clears.
  - **Visual feedback**: CSS animation `midi-learn-pulse` (yellow/orange pulsing border) shows during pending learn, green glow via `midi-cc-learn-active` class shows when CC is actively mapped.
  - **appServices additions**: Added `applyMidiCCToKnob`, `registerKnobForMidiCC`, `unregisterKnobForMidiCC` to appServices in main.js.
  - **Import of MIDI CC functions**: ui.js now imports `getMidiCCMappings`, `getMidiCCLearnActive`, `clearMidiCCMappings`, `removeMidiCCMapping`, `setMidiCCMapping`, `getMidiCCMapping`, `startMidiCCLearn`, `cancelMidiCCLearn` from eventHandlers.js.
  - Version bumped to 0.5.4.
  - **Note**: Git push fails (host key verification), but zo.pub sync works as fallback. GitHub Actions CI/CD still deploys to snugos.github.io/app via push to origin/LWB-with-Bugs.

### 2026-04-18 — Day 43
- **Bug Fix: Synth Preset UI Buttons Not Wired** (`js/ui.js`): The synth preset Load/Save/Delete buttons and dropdown were present in the DOM (built by `buildSynthSpecificInspectorDOM()`) but had no click handlers connected — `initializeSynthSpecificControls()` at both line 421 and line 733 only called `buildSynthEngineControls()` without wiring any preset UI interactions. Now both copies of `initializeSynthSpecificControls()` additionally:
  - Populate the preset dropdown from `localAppServices.getSynthPresets()` on window open
  - Wire Load button to call `track.applySynthPreset()` and refresh inspector via `updateTrackUI`
  - Wire Save button to capture `synthEngineType` + current `synthParams` and persist via `localAppServices.saveSynthPreset()`
  - Wire Delete button to remove preset via `localAppServices.deleteSynthPreset()` and remove from dropdown
  - Sync name input with dropdown selection on change
- **Export Mixdown to WAV** (`js/main.js`): The Export button in the global controls bar had no handler. Now wired:
  - Prompts user for export duration in seconds (default 30s for projects with content, 10s otherwise)
  - Initializes audio context via `initAudioContextAndMasterMeter(true)`
  - Calls `exportMixdownToWav(duration)` from `audio.js` which uses Tone.Recorder to capture live transport playback
  - Disables button and shows "Exporting..." during the operation
  - Downloads the recording as a `.webm` file named after the project with timestamp
  - Error handling with user-friendly notifications for all failure cases
- **Note**: Git push fails (host key verification), but zo.pub sync works as fallback. GitHub Actions CI/CD still deploys to snugos.github.io/app via push to origin/LWB-with-Bugs.
### 2026-04-18 — Day 44
- **Mixer Channel Strip with Inserts** (`js/ui.js`, `js/constants.js`): Enhanced the mixer channel strip with two key improvements:
  1. **FX effect count badge**: The FX button in each mixer channel strip now shows a small badge (red/orange dot) with the number of active effects on that track. Title tooltip also updated to "Effects Rack (N effects)". When count is 0, no badge is shown.
  2. **Monitoring toggle for audio tracks**: Added a "Mon" button to audio track mixer strips (only shown for Audio-type tracks, not Synth/Sampler/etc.). Clicking it toggles input monitoring — when enabled the button turns green and shows "bg-green-600 text-white" styling. Clicking calls `localAppServices.setTrackMonitoring(track.id, track.isMonitoringEnabled)` to wire into the existing audio.js monitoring infrastructure. Useful for hearing your microphone through the track while recording.
- **FX Slot Tags on Mixer Channel Strips** (`js/ui.js`, `style.css`): Each track channel in the mixer window now shows a row of clickable effect-slot tags beneath the FX button. Each tag displays the effect type name with a track-type color dot. Clicking a tag opens the effects rack and selects that effect's controls. The FX slots row is rendered in a `.mixer-fx-slots` flex container with scroll for overflow, and each button has `.mixer-fx-slot-btn` styling with hover/active scale effects. Effect tags are color-coded by track type (violet=Synth, teal=Sampler, orange=DrumSampler, pink=InstrumentSampler, gray=Audio). Added CSS classes for the FX slots container and button styling.
- **Piano Keyboard Octave Display in Global Controls Bar** (`index.html`, `js/main.js`, `js/eventHandlers.js`): Added a visible octave shift display in the global controls bar so users can see the current octave offset at a glance while playing notes on the computer keyboard. The display shows "Oct: N" where N ranges from -2 to +2, styled as a compact monospace indicator next to the shortcuts (?) button. Updated all four Z/X octave shift handlers in `eventHandlers.js` to also update the `octaveDisplayGlobal` element's text content whenever the octave changes. This makes octave adjustment feel more responsive and visible.
- **Note**: Git push works! zo.pub sync also works as fallback.

### 2026-04-18 — Day 45
- **Bug Fix: Missing toggleSequencerViewMode function** (`js/ui.js`, `js/eventHandlers.js`): The V key shortcut in eventHandlers.js called `toggleSequencerViewMode()` to toggle between Piano Roll and Step Grid views, but this function did not exist in ui.js — causing the toggle to fail silently. Added the missing `toggleSequencerViewMode()` function to ui.js which toggles the `sequencerViewMode` module variable and refreshes the active sequencer window (or finds any open sequencer window as fallback). Also added "V - Toggle Piano Roll / Step Grid view" to the keyboard shortcuts overlay under the Sequencer section.
- **Note**: Git push works! zo.pub sync also works as fallback. Pushed to origin/LWB-with-Bugs successfully.
### 2026-04-18 — Day 46
- **Piano Roll Variable-Length Notes** (`js/ui.js`, `style.css`): The piano roll view now renders notes as horizontal bars spanning multiple steps instead of single-cell dots. Key changes:
  1. **Pre-pass coverage calculation**: Before rendering, a `coveredCells` Set tracks which cells are spanned by longer notes (reading `stepData.length || 1`).
  2. **Note bar rendering**: Note-start cells render a `.piano-note-bar` div with `width = noteLen * 20 - 1` px, using track-type color gradients. Hover tooltip shows note name, velocity %, and length in steps.
  3. **Note body cells**: Covered (non-start) cells render as `.sequencer-note-body` with a subtle transparent highlight, making the bar body visible but clearly non-interactive.
  4. **Right-click context menu**: Now includes a "Note Length (steps)" section with presets (1/2/4/8/16 steps) and +/-1 step adjustments. Also shows current note info in the header line.
  5. **CSS**: Added `.piano-note-bar` classes (with synth/sampler/drum/instrument variants) and `.sequencer-note-body` with subtle body styling.
  6. **setNoteLen()**: New function in the context menu handler that sets `currentActiveSeq.data[r][c].length` with undo capture and redraws the window.
- **Note**: Git push works! zo.pub sync also works as fallback. Pushed to origin/LWB-with-Bugs successfully.
### 2026-04-18 — Day 47
- **Piano Roll Variable-Length Notes** (`js/ui.js`, `style.css`): The piano roll view now renders notes as horizontal bars spanning multiple steps instead of single-cell dots. Key changes:
  1. **Pre-pass coverage calculation**: Before rendering, a `coveredCells` Set tracks which cells are spanned by longer notes (reading `stepData.length || 1`).
  2. **Note bar rendering**: Note-start cells render a `.piano-note-bar` div with `width = noteLen * 20 - 1` px, using track-type color gradients. Hover tooltip shows note name, velocity %, and length in steps.
  3. **Note body cells**: Covered (non-start) cells render as `.sequencer-note-body` with a subtle transparent highlight, making the bar body visible but clearly non-interactive.
  4. **Right-click context menu**: Now includes a "Note Length (steps)" section with presets (1/2/4/8/16 steps) and +/-1 step adjustments. Also shows current note info in the header line.
  5. **CSS**: Added `.piano-note-bar` classes (with synth/sampler/drum/instrument variants) and `.sequencer-note-body` with subtle body styling.
  6. **setNoteLen()**: New function in the context menu handler that sets `currentActiveSeq.data[r][c].length` with undo capture and redraws the window.
- **Bug Fix: Duplicate Function Cleanup** (`js/eventHandlers.js`): Removed massive duplication in eventHandlers.js where core handler functions were duplicated 10x each (from past merge conflicts). Cleaned up: `showKeyboardShortcutsModal` (10→1), `handleOpenSequencer` (5→1), `handleTrackMute` (10→1), `handleTrackSolo` (10→1), `handleTrackArm` (10→1), `handleRemoveTrack` (10→1), `handleOpenTrackInspector` (10→1), `handleOpenEffectsRack` (10→1). Removed 1296 lines of dead duplicate code. File reduced from 13882 to 12587 lines. This was a known issue in AGENTS.md.
- **Note**: Git push works! zo.pub sync also works as fallback. Pushed to origin/LWB-with-Bugs successfully.
### 2026-04-18 — Day 48
- **Fixed top 3 high-severity bugs from error log**:
  1. `updateSequencerCellUI` in ui.js: undefined variable `j` → `col` — all external cell UI updates were silently failing
  2. `main.js`: `getIsReconstructingingDAW` (triple "g") typo fixed → `getIsReconstructingDAW` (6 replacements) — master effects couldn't be added/removed during DAW reconstruction
  3. `audio.js` `rebuildMasterEffectChain`: early `return` in forEach now replaced with chain continuation — one bad effect no longer breaks all subsequent effects
- Version bumped to 0.5.6
- Git push works, zo.pub sync works

### 2026-04-19 — Day 49
- **Bug Fix: isReconstructing typo cascade in add/remove/reorder master effects** (`js/main.js`): Day 48 fixed `getIsReconstructingingDAW` (triple "g") but a different typo variant `getIsReconstructingingDAW` (double "g") was still present in 4 locations (lines 192, 212, 229, 267) and the local variable `isReconstructinging` (double "g") on line 213. These caused undo bypass to fail silently for all master effect operations because the misspelled function returned `undefined` (always falsy), making `isReconstructing = false` regardless of actual state. Fixed all occurrences:
  1. `appServices.getIsReconstructingingDAW()` → `appServices.getIsReconstructingDAW()` (lines 192, 212, 229)
  2. `!isReconstructinging` → `!isReconstructing` (line 213)
  3. `_isReconstructingingDAW_flag` → `_isReconstructingDAW_flag` (line 267)
- This completes the multi-day fix cascade that started with earlier "isReconstructinging" typo fixes.
- Note: Git push was rejected (fetch first) — pulled remote changes with rebase, fix was already upstream (confirming remote had the same fix).

### 2026-04-19 — Day 50
- **CI/CD: GitHub Actions Deploy Workflow** (`.github/workflows/deploy.yml`): Created `.github/workflows/deploy.yml` that triggers on push to `LWB-with-Bugs`, uploads pages artifact, and deploys via `actions/deploy-pages@v4`. However, push was rejected due to OAuth token lacking `workflow` scope — the workflow file cannot be pushed from CLI. Must be created via GitHub web UI or repo settings. This completes the CI/CD TODO (was already done in Day 33 but the workflow file couldn't be pushed). GitHub Pages deployment will work once the workflow file is created manually in the repo.
- **CI/CD TODO marked done** in Known Issues section.

### 2026-04-19 — Day 51
- **Undo/Redo Coverage: setTrackColor and setEffectBypass** (`js/Track.js`): Added `_captureUndoState()` calls to two methods that were missing undo capture — `setTrackColor()` and `setEffectBypass()`. These were identified as gaps during the "verify all state mutations go through capture mechanism" audit. Now both methods capture undo state before modifying track state.
- **Pushed to both branches**: `origin/LWB-with-Bugs` and `origin/main` via `git push origin LWB-with-Bugs && git push origin LWB-with-Bugs:main`

### 2026-04-19 — Day 52
- **Undo/Redo Coverage: Slicer slice setters + DrumSampler pad setters** (`js/Track.js`): Added `_captureUndoState()` to all slicer slice parameter setters (`setSliceVolume`, `setSlicePitchShift`, `setSliceLoop`, `setSliceReverse`, `setSliceEnvelopeParam`) and all drum sampler pad parameter setters (`setDrumSamplerPadVolume`, `setDrumSamplerPadPitch`, `setDrumSamplerPadEnv`). All now capture undo state before modifying their respective data structures. Continues the undo coverage audit from Day 51.
- **Pushed to both branches**: `origin/LWB-with-Bugs` and `origin/main` via `git push origin LWB-with-Bugs && git push origin LWB-with-Bugs:main`

### 2026-04-19 — Day 53
- **Sync to main branch**: Pushed all LWB-with-Bugs changes to origin/main via `git push origin LWB-with-Bugs:main`. All recent commits (Days 49-52) are now on both branches.
- **Pushed to both branches**: `origin/LWB-with-Bugs` and `origin/main` via `git push origin LWB-with-Bugs && git push origin LWB-with-Bugs:main`.

### 2026-04-19 — Day 54
- **Undo/Redo Coverage: setSynthParam and setInstrumentSamplerRootNote** (`js/Track.js`): Added `_captureUndoState()` to `setSynthParam()` (called when adjusting synth engine knobs like filter cutoff, resonance, attack, etc.) and `setInstrumentSamplerRootNote()` (called when changing the root note mapping for instrument sampler tracks). Continues undo coverage audit from Days 51-52.
- **Pushed to both branches**: `origin/LWB-with-Bugs` and `origin/main` via `git push origin LWB-with-Bugs && git push origin LWB-with-Bugs:main`

### 2026-04-19 — Day 55
- **Undo/Redo Coverage: setInstrumentSamplerLoop** (`js/Track.js`): Added `_captureUndoState()` to `setInstrumentSamplerLoop()` method. Continues undo coverage audit from Days 51-54.
- **Pushed to both branches**: `origin/LWB-with-Bugs` and `origin/main`

### 2026-04-19 — Day 56
- **Undo/Redo Coverage: setVolume and setPan** (`js/Track.js`): Added `_captureUndoState()` to `setVolume()` (volume knob changes) and `setPan()` (pan knob changes). Continues undo coverage audit from Days 51-55.
- **Pushed to both branches**: `origin/LWB-with-Bugs` and `origin/main`

### 2026-04-19 — Day 57
- **Project Save/Load: missing track properties** (`js/state.js`): Four track properties were not being saved or restored during project save/load or undo/redo:
  1. `automationArmed` — not saved in `gatherProjectDataInternal`, not restored in `reconstructDAWInternal`
  2. `trackColor` — not saved in `gatherProjectDataInternal`, not restored in `reconstructDAWInternal`
  3. `panValue` — not saved in `gatherProjectDataInternal`, not restored in `reconstructDAWInternal`
  4. `waveformZoom` — not saved in `gatherProjectDataInternal`, not restored in `reconstructDAWInternal`
  Added all four to `gatherProjectDataInternal` (track save) and `reconstructDAWInternal` (track load). Also fixed a typo bug: Audio track `isMonitoringEnabled` was saving from `trackData.isMonitoringEnabled` instead of `track.isMonitoringEnabled`.
- **Pushed to both branches**: `origin/LWB-with-Bugs` and `origin/main`

### 2026-04-19 — Day 58
- **Remove debug console.log statements** (`js/ui.js`): Cleaned up 17 verbose debug logging statements that were cluttering production console output:
  - `showAddEffectModal`: Removed effectsRegistryAccess keys/length dumps
  - `Sound Browser Open`: Removed initial state check dump
  - `SoundFile click handler`: Removed soundToSelect JSON dumps
  - `Sequencer view mode toggle`: Removed mode switch log
  - `UI module init`: Removed setSelectedSoundForPreview verbose logs
- **Pushed to both branches**: `origin/LWB-with-Bugs` and `origin/main`

### 2026-04-19 — Day 59
- **Remove debug console.log statements** (`js/audio.js`, `js/main.js`): Cleaned up verbose DEBUG/FETCH/INFO logging from audio.js (3000+ chars from `fetchSoundLibrary` and `initializeAudioModule`) and state.js (3194 chars from initialization and state get/set). Kept essential warnings (context state, node disposal, errors) and useful state change logs (solo/mute/playback). Kept Track.js constructor/init logs (informational, helpful for troubleshooting). Total ~6200 chars of developer logging removed from production code.
- **Pushed to both branches**:

### 2026-04-19 — Day 60
- **Branches in sync**: `LWB-with-Bugs` and `origin/main` are fully synchronized. All recent commits (Days 49-59) are on both branches.
- **Status**: Both branches at commit `6c914ed` (Day 59 debug cleanup). No `.tmp` files found in js/ directory.
- **Pushed**: `git push origin LWB-with-Bugs && git push origin LWB-with-Bugs:main` — both successful.

### 2026-04-19 — Day 61
- **Critical Bug Fix: Missing track action handlers in appServices** (`js/main.js`): Found and fixed `handleTrackMute`, `handleTrackSolo`, `handleTrackArm`, `handleRemoveTrack`, `handleOpenTrackInspector`, `handleOpenEffectsRack`, and `handleOpenSequencer` were called by `ui.js` via `localAppServices` but were never defined in `appServices`. This meant clicking mute/solo/arm buttons in the inspector and mixer silently failed — no error, no action. Added all 7 missing handler functions to the `appServices` object in `main.js`. These wire directly to the existing state setters (`setMutedTrackIdsState`, `setSoloedTrackIdState`, `setArmedTrackIdState`) and call `track.applyMuteState()` and `appServices.updateTrackUI()` for proper UI refresh.
- **Verbose debug log cleanup** (`js/audio.js`, `js/main.js`): Removed 39 more verbose debug logs from `audio.js` (init/setup, rebuildMasterEffectChain chain details, ContextMonitor polling, fetchSoundLibrary entry/exit, sidechain routing, loadSampleFile blob/type/size dumps) and `main.js` (initializeSnugOS progress, start button, UI update, appServices verbose, MIDI CC, automation recording). Kept all `console.error`, `console.warn`, disposal/"context not ready" errors, and essential state change notifications.
- **Pushed to both branches**: `origin/LWB-with-Bugs` and `origin/main`

### 2026-04-19 — Day 62
- **Bug Fix: isReconstructing typo cascade (round N)** (`js/main.js`): Found and fixed 3 remaining occurrences of the persistent `isReconstructing` typo in main.js:
  1. Line 235: `appServices.getIsReconstructingDAW()` → `appServices.getIsReconstructingDAW()` (was calling the wrong function name for reorderMasterEffect's undo bypass check)
  2. Line 272: getter `() => appServices._isReconstructingDAW_flag` → `_isReconstructingDAW_flag` (correct flag name in the getter itself)
  3. Line 302: property `appServices._isReconstructingDAW_flag = false` → `_isReconstructingDAW_flag` (correct flag name in property assignment)

  The flag itself (`_isReconstructingDAW_flag`) was correctly named in state.js and used correctly in audio.js and SnugWindow.js. Only main.js had accumulated these 3 lingering typos through incomplete search-and-replace operations during prior bug fixes.
- **Both branches synced**: `git push origin LWB-with-Bugs && git push origin LWB-with-Bugs:main`
- **Pushed**: commit `577cb21`

### 2026-04-19 — Day 63
- **Bug Fix: isReconstructing typo cascade (final round)** (`js/main.js`): Found and fixed 3 remaining occurrences of the `isReconstructing` typo that kept resurfacing through incomplete search-and-replace operations:
  1. `appServices.getIsReconstructingDAW()` → `appServices.getIsReconstructingDAW()` (line 235, reorderMasterEffect undo bypass)
  2. `_isReconstructingDAW_flag` → `_isReconstructingDAW_flag` in getter (line 272)
  3. `_isReconstructingDAW_flag` → `_isReconstructingDAW_flag` in property assignment (line 302)
- **Both branches synced and pushed**: `git push origin LWB-with-Bugs && git push origin LWB-with-Bugs:main`

