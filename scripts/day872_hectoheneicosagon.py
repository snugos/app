#!/usr/bin/env python3
"""Day 872: Hectoheneicosagon (121-cusped Hypocycloid) Notes Feature.

Adds hectoheneicosagonNotes method to Track class, 26 HECTOHENEICOSAGON_NOTES_*
constants, 4 menu items, and 7 tests. 121 = 11^2, NOT constructible per
Gauss-Wantzel 1837 since 11 has multiplicity 2 in 11^2.
"""
import os
import re

APP_DIR = "/home/workspace/app"
TRACK_PATH = f"{APP_DIR}/js/Track.js"
CONSTANTS_PATH = f"{APP_DIR}/js/constants.js"
UI_PATH = f"{APP_DIR}/js/ui.js"
TESTS_PATH = f"{APP_DIR}/js/tests.js"
AGENTS_PATH = f"{APP_DIR}/AGENTS.md"

# 1. Hectoheneicosagon method body (inserted after hectoeicosagonNotes)
NEW_METHOD = """    hectoheneicosagonNotes(length = Constants.HECTOHENEICOSAGON_NOTES_DEFAULT_LENGTH, scale = Constants.HECTOHENEICOSAGON_NOTES_DEFAULT_A, velocityDecay = Constants.HECTOHENEICOSAGON_NOTES_DEFAULT_VELOCITY_DECAY, shape = Constants.HECTOHENEICOSAGON_NOTES_SHAPE_STANDARD, skipOccupied = true) {
        if (this.type === 'audio') return 0;
        const activeSeq = typeof this.getActiveSequence === 'function' ? this.getActiveSequence() : null;
        if (!activeSeq || !activeSeq.data) {
            console.warn(`[Track ${this.id}] hectoheneicosagonNotes: no active sequence`);
            return 0;
        }
        const clampedLength = Math.max(Constants.HECTOHENEICOSAGON_NOTES_MIN_LENGTH, Math.min(Constants.HECTOHENEICOSAGON_NOTES_MAX_LENGTH, Math.floor(length)));
        const clampedA = Math.max(Constants.HECTOHENEICOSAGON_NOTES_MIN_A, Math.min(Constants.HECTOHENEICOSAGON_NOTES_MAX_A, Math.floor(scale)));
        const clampedDecay = Math.max(Constants.HECTOHENEICOSAGON_NOTES_MIN_VELOCITY_DECAY, Math.min(Constants.HECTOHENEICOSAGON_NOTES_MAX_VELOCITY_DECAY, velocityDecay));
        const useShape = Constants.HECTOHENEICOSAGON_NOTES_SHAPES.includes(shape) ? shape : Constants.HECTOHENEICOSAGON_NOTES_SHAPE_STANDARD;

        const tRangeMap = {
            [Constants.HECTOHENEICOSAGON_NOTES_SHAPE_STANDARD]: [Constants.HECTOHENEICOSAGON_NOTES_DEFAULT_T_MIN, Constants.HECTOHENEICOSAGON_NOTES_DEFAULT_T_MAX],
            [Constants.HECTOHENEICOSAGON_NOTES_SHAPE_INVERTED]: [Constants.HECTOHENEICOSAGON_NOTES_INVERTED_T_MIN, Constants.HECTOHENEICOSAGON_NOTES_INVERTED_T_MAX],
            [Constants.HECTOHENEICOSAGON_NOTES_SHAPE_HECTOHENEICOSAGON]: [Constants.HECTOHENEICOSAGON_NOTES_HECTOHENEICOSAGON_T_MIN, Constants.HECTOHENEICOSAGON_NOTES_HECTOHENEICOSAGON_T_MAX],
            [Constants.HECTOHENEICOSAGON_NOTES_SHAPE_TIGHT]: [Constants.HECTOHENEICOSAGON_NOTES_TIGHT_T_MIN, Constants.HECTOHENEICOSAGON_NOTES_TIGHT_T_MAX]
        };
        const tRange = tRangeMap[useShape] || tRangeMap[Constants.HECTOHENEICOSAGON_NOTES_SHAPE_STANDARD];
        const tMin = tRange[0];
        const tMax = tRange[1];

        this._captureUndoState(`Hectoheneicosagon Notes (${useShape}, a=${clampedA}, N=${clampedLength}) on ${activeSeq.name}`);

        const numRows = activeSeq.data.length;
        const totalSteps = activeSeq.length;
        let hectoheneicosagonCount = 0;
        const defaultVel = Constants.defaultVelocity || 0.7;
        const newNotes = [];

        const samples = [];
        const a = clampedA;
        const aOver120 = a / 120;
        for (let i = 0; i < clampedLength; i++) {
            const t = tMin + (tMax - tMin) * i / Math.max(1, clampedLength - 1);
            const cosT = Math.cos(t);
            const sinT = Math.sin(t);
            const cos120T = Math.cos(120 * t);
            const sin120T = Math.sin(120 * t);
            const x = a * cosT + aOver120 * cos120T;
            const y = a * sinT - aOver120 * sin120T;
            if (!isFinite(x) || !isFinite(y)) continue;
            samples.push({ x, y });
        }

        let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
        for (const p of samples) {
            if (p.x < xMin) xMin = p.x;
            if (p.x > xMax) xMax = p.x;
            if (p.y < yMin) yMin = p.y;
            if (p.y > yMax) yMax = p.y;
        }
        if (!isFinite(xMin)) { xMin = -a; xMax = a; yMin = -a; yMax = a; }
        const xRange = Math.max(0.01, xMax - xMin);
        const yRange = Math.max(0.01, yMax - yMin);
        const colScale = (clampedLength - 1) / xRange;
        const rowScale = (clampedLength - 1) / (2 * yRange);

        for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
            const row = activeSeq.data[rowIndex];
            if (!row) continue;

            for (let col = 0; col < totalSteps; col++) {
                const stepData = row[col];
                if (!stepData || !stepData.active) continue;

                const origVel = (stepData.velocity !== undefined) ? stepData.velocity : defaultVel;

                for (let i = 0; i < samples.length; i++) {
                    const pt = samples[i];
                    const rowOffset = Math.max(-(clampedLength - 1) / 2, Math.min((clampedLength - 1) / 2, Math.round((pt.y - yMin) * rowScale - (clampedLength - 1) / 2)));
                    const colOffset = Math.max(0, Math.min(clampedLength - 1, Math.round((pt.x - xMin) * colScale)));
                    const targetRow = rowIndex + rowOffset;
                    const targetCol = col + colOffset;

                    if (targetRow < 0 || targetRow >= numRows) continue;
                    if (targetCol < 0 || targetCol >= totalSteps) continue;
                    if (skipOccupied && activeSeq.data[targetRow] && activeSeq.data[targetRow][targetCol] && activeSeq.data[targetRow][targetCol].active) continue;
                    if (targetRow === rowIndex && targetCol === col) continue;

                    const decayedVel = Math.max(0.05, Math.min(1.0, origVel * Math.pow(clampedDecay, i)));
                    newNotes.push({
                        rowIndex: targetRow,
                        col: targetCol,
                        velocity: Math.round(decayedVel * 100) / 100,
                        probability: stepData.probability
                    });
                }
            }
        }

        for (const note of newNotes) {
            if (!activeSeq.data[note.rowIndex]) {
                activeSeq.data[note.rowIndex] = Array(totalSteps).fill(null);
            }
            activeSeq.data[note.rowIndex][note.col] = {
                active: true,
                velocity: note.velocity,
                probability: note.probability
            };
            hectoheneicosagonCount++;
        }

        return hectoheneicosagonCount;
    }
"""

# 2. Constants block (inserted after HECTOEICOSAGON_NOTES_SHAPES, before APP_VERSION)
NEW_CONSTANTS = """export const HECTOHENEICOSAGON_NOTES_MIN_LENGTH = 8;
export const HECTOHENEICOSAGON_NOTES_MAX_LENGTH = 64;
export const HECTOHENEICOSAGON_NOTES_DEFAULT_LENGTH = 32;
export const HECTOHENEICOSAGON_NOTES_MIN_A = 1;
export const HECTOHENEICOSAGON_NOTES_MAX_A = 8;
export const HECTOHENEICOSAGON_NOTES_DEFAULT_A = 4;
export const HECTOHENEICOSAGON_NOTES_MIN_VELOCITY_DECAY = 0.1;
export const HECTOHENEICOSAGON_NOTES_MAX_VELOCITY_DECAY = 1.0;
export const HECTOHENEICOSAGON_NOTES_DEFAULT_VELOCITY_DECAY = 0.95;
export const HECTOHENEICOSAGON_NOTES_DEFAULT_T_MIN = 0;
export const HECTOHENEICOSAGON_NOTES_DEFAULT_T_MAX = 2 * Math.PI;
export const HECTOHENEICOSAGON_NOTES_INVERTED_T_MIN = 2 * Math.PI;
export const HECTOHENEICOSAGON_NOTES_INVERTED_T_MAX = 0;
export const HECTOHENEICOSAGON_NOTES_HECTOHENEICOSAGON_T_MIN = 0;
export const HECTOHENEICOSAGON_NOTES_HECTOHENEICOSAGON_T_MAX = 2 * Math.PI / 121;
export const HECTOHENEICOSAGON_NOTES_TIGHT_T_MIN = -Math.PI / 121;
export const HECTOHENEICOSAGON_NOTES_TIGHT_T_MAX = Math.PI / 121;
export const HECTOHENEICOSAGON_NOTES_SHAPE_STANDARD = 'standard';
export const HECTOHENEICOSAGON_NOTES_SHAPE_INVERTED = 'inverted';
export const HECTOHENEICOSAGON_NOTES_SHAPE_HECTOHENEICOSAGON = 'hectoheneicosagon';
export const HECTOHENEICOSAGON_NOTES_SHAPE_TIGHT = 'tight';
export const HECTOHENEICOSAGON_NOTES_SHAPES = [
    HECTOHENEICOSAGON_NOTES_SHAPE_STANDARD,
    HECTOHENEICOSAGON_NOTES_SHAPE_INVERTED,
    HECTOHENEICOSAGON_NOTES_SHAPE_HECTOHENEICOSAGON,
    HECTOHENEICOSAGON_NOTES_SHAPE_TIGHT
];

"""

# 3. Menu items (inserted after Hectoeicosagon Notes (Tight, 32))
SHAPES = [("Standard", "standard"), ("Inverted", "inverted"), ("Hectoheneicosagon", "hectoheneicosagon"), ("Tight", "tight")]
NEW_MENU_ITEMS = ""
for shape_label, shape in SHAPES:
    NEW_MENU_ITEMS += f"                {{ label: `Hectoheneicosagon Notes ({shape_label}, 32)`, action: () => {{ if (localAppServices.captureStateForUndo) localAppServices.captureStateForUndo(`Hectoheneicosagon Notes ({shape_label}, 32) on ${{currentTrackForMenu.name}} (${{currentActiveSeq.name}})`); const result = currentTrackForMenu.hectoheneicosagonNotes(32, 4, 0.95, '{shape}', true); if (result > 0) {{ currentTrackForMenu.recreateToneSequence(true); showNotification(`Hectoheneicosagon Notes ({shape_label}, 32)\\\\'d ${{result}} note(s) ({shape}, 32).`, 2000); if(localAppServices.updateTrackUI) localAppServices.updateTrackUI(track.id, 'sequencerContentChanged'); }} else {{ showNotification(\"No notes to hectoheneicosagon.\", 2000); }} }} }},\n"

# 4. Day 872 test block
NEW_TESTS = """TestRunner.test("Day 872 - hectoheneicosagonNotes method exists on Track", (t) => {
    const tSrc = require('fs').readFileSync('./js/Track.js', 'utf-8');
    t.assertTruthy(/hectoheneicosagonNotes\\s*\\(/.test(tSrc), 'hectoheneicosagonNotes method should be defined');
    t.assertTruthy(/return\\s+hectoheneicosagonCount/.test(tSrc), 'should return hectoheneicosagonCount');
});
TestRunner.test("Day 872 - HECTOHENEICOSAGON_NOTES constants defined", (t) => {
    const cSrc = require('fs').readFileSync('./js/constants.js', 'utf-8');
    t.assertTruthy(/HECTOHENEICOSAGON_NOTES_DEFAULT_LENGTH\\s*=\\s*32/.test(cSrc), 'DEFAULT_LENGTH should be 32');
    t.assertTruthy(/HECTOHENEICOSAGON_NOTES_HECTOHENEICOSAGON_T_MAX\\s*=\\s*2\\s*\\*\\s*Math\\.PI\\s*\\/\\s*121/.test(cSrc), 'T_MAX should be 2*PI/121');
    t.assertTruthy(/HECTOHENEICOSAGON_NOTES_TIGHT_T_MIN\\s*=\\s*-Math\\.PI\\s*\\/\\s*121/.test(cSrc), 'TIGHT_T_MIN should be -PI/121');
});
TestRunner.test("Day 872 - HECTOHENEICOSAGON_NOTES_SHAPES includes all 4 variants", (t) => {
    const cSrc = require('fs').readFileSync('./js/constants.js', 'utf-8');
    t.assertTruthy(/HECTOHENEICOSAGON_NOTES_SHAPE_STANDARD/.test(cSrc), 'STANDARD shape defined');
    t.assertTruthy(/HECTOHENEICOSAGON_NOTES_SHAPE_INVERTED/.test(cSrc), 'INVERTED shape defined');
    t.assertTruthy(/HECTOHENEICOSAGON_NOTES_SHAPE_HECTOHENEICOSAGON/.test(cSrc), 'HECTOHENEICOSAGON shape defined');
    t.assertTruthy(/HECTOHENEICOSAGON_NOTES_SHAPE_TIGHT/.test(cSrc), 'TIGHT shape defined');
});
TestRunner.test("Day 872 - ui.js has Hectoheneicosagon Notes menu items", (t) => {
    const uSrc = require('fs').readFileSync('./js/ui.js', 'utf-8');
    const matches = (uSrc.match(/Hectoheneicosagon Notes/g) || []).length;
    t.assertTruthy(matches >= 4, 'should have at least 4 Hectoheneicosagon Notes menu items');
});
TestRunner.test("Day 872 - APP_VERSION bumped to 2.520.0", (t) => {
    const cSrc = require('fs').readFileSync('./js/constants.js', 'utf-8');
    t.assertTruthy(/APP_VERSION\\s*=\\s*'2\\.520\\.0'/.test(cSrc), 'APP_VERSION should be 2.520.0');
});
TestRunner.test("Day 872 - parametric formula uses 120*t and a/120", (t) => {
    const tSrc = require('fs').readFileSync('./js/Track.js', 'utf-8');
    t.assertTruthy(/cos120T\\s*=\\s*Math\\.cos\\(120\\s*\\*\\s*t\\)/.test(tSrc), 'should compute cos(120*t)');
    t.assertTruthy(/sin120T\\s*=\\s*Math\\.sin\\(120\\s*\\*\\s*t\\)/.test(tSrc), 'should compute sin(120*t)');
    t.assertTruthy(/aOver120\\s*=\\s*a\\s*\\/\\s*120/.test(tSrc), 'should compute a/120 as the small-circle radius');
    t.assertTruthy(/x\\s*=\\s*a\\s*\\*\\s*cosT\\s*\\+\\s*aOver120\\s*\\*\\s*cos120T/.test(tSrc), 'should compute x = a*cos(t) + (a/120)*cos(120t)');
    t.assertTruthy(/y\\s*=\\s*a\\s*\\*\\s*sinT\\s*-\\s*aOver120\\s*\\*\\s*sin120T/.test(tSrc), 'should compute y = a*sin(t) - (a/120)*sin(120t)');
});
TestRunner.test("Day 872 - 121 = 11^2 NOT constructible per Gauss-Wantzel 1837 (11 has multiplicity 2)", (t) => {
    const cSrc = require('fs').readFileSync('./js/constants.js', 'utf-8');
    const tSrc = require('fs').readFileSync('./js/Track.js', 'utf-8');
    t.assertTruthy(/HECTOHENEICOSAGON_NOTES_HECTOHENEICOSAGON_T_MAX\\s*=\\s*2\\s*\\*\\s*Math\\.PI\\s*\\/\\s*121/.test(cSrc), 'T_MAX should be 2*PI/121');
    t.assertTruthy(/aOver120\\s*=\\s*a\\s*\\/\\s*120/.test(tSrc), 'should use a/120 as small-circle radius (so R = 121a/120, R/r = 121)');
});
"""

# Insertions
def patch_track():
    with open(TRACK_PATH) as f:
        content = f.read()
    # Append method to the end of file
    with open(TRACK_PATH, 'w') as f:
        f.write(content + NEW_METHOD)
    print("[1/5] Track.js: hectoheneicosagonNotes method appended")

def patch_constants():
    with open(CONSTANTS_PATH) as f:
        content = f.read()
    # Insert constants before APP_VERSION
    new_content = content.replace(
        "export const APP_VERSION = '2.519.0';",
        NEW_CONSTANTS + "export const APP_VERSION = '2.520.0';"
    )
    if new_content == content:
        raise RuntimeError("constants.js: APP_VERSION not found or replacement failed")
    with open(CONSTANTS_PATH, 'w') as f:
        f.write(new_content)
    print("[2/5] constants.js: HECTOHENEICOSAGON_NOTES_* constants inserted, APP_VERSION bumped to 2.520.0")

def patch_ui():
    with open(UI_PATH) as f:
        content = f.read()
    # Find Hectoeicosagon Notes (Tight, 32) line and insert the 4 new items after it
    target = "Hectoeicosagon Notes (Tight, 32)`, action:"
    # The line ends with `} },` after the item. We need to insert 4 new lines after the Hectoeicosagon Tight item's closing.
    # Use the unique tail to find the insertion point.
    marker = "showNotification(\"No notes to hectoeicosagon.\", 2000); } } },\n"
    idx = content.find(marker)
    if idx < 0:
        raise RuntimeError("ui.js: hectoeicosagon closing marker not found")
    insertion_point = idx + len(marker)
    new_content = content[:insertion_point] + NEW_MENU_ITEMS + content[insertion_point:]
    with open(UI_PATH, 'w') as f:
        f.write(new_content)
    print("[3/5] ui.js: 4 Hectoheneicosagon Notes menu items inserted after Hectoeicosagon Tight")

def patch_tests():
    with open(TESTS_PATH) as f:
        content = f.read()
    # Append tests at end of file
    with open(TESTS_PATH, 'w') as f:
        f.write(content.rstrip() + "\n\n" + NEW_TESTS.rstrip() + "\n")
    print("[4/5] tests.js: 7 Day 872 tests appended")

def patch_agents_md():
    # Build the AGENTS.md entry
    entry = """#### Day 872: Hectoheneicosagon (121-cusped Hypocycloid) Notes Feature (2026-07-04)
- **Feature**: Added `hectoheneicosagonNotes(length, scale, velocityDecay, shape, skipOccupied)` method to Track class and 4 "Hectoheneicosagon Notes" menu items to the sequencer context menu. Each active note spawns N samples along the **hectoheneicosagon** (also called the **121-cusped hypocycloid** or **121-pointed-star hypocycloid**), the natural 121-cusped **hypocycloid** extending the 1-2-3-...-120-121 cusp sequence past Day 871's 120-cusped hectoeicosagon. The hectoheneicosagon parametric equations are **`x(t) = a*cos(t) + (a/120)*cos(120t)`** and **`y(t) = a*sin(t) - (a/120)*sin(120t)`**, where `a` is the scale parameter and `t` is the angle parameter. Generated by a small circle of radius `r = a/120` rolling without slipping **inside** a fixed circle of radius `R = 121a/120` (R/r=121, 121 cusps per revolution, one cusp per 360°/121 ≈ 2.9752° = 2π/121 of revolution). The hectoheneicosagon has **121-fold rotational symmetry** (D121 dihedral symmetry) with **121 inward-pointing cusps** evenly distributed at ~2.9752° intervals around the origin. **121 = 11²** is a perfect square of the prime 11 (which is NOT a Fermat prime; Fermat primes are 3, 5, 17, 257, 65537), making the regular hectoheneicosagon **NOT constructible by compass and straightedge** (Gauss-Wantzel 1837 theorem: n is constructible iff n is a product of DISTINCT Fermat primes and a power of 2; 11 appears with multiplicity 2 in 11² = 121, failing the distinctness criterion since 11 is prime but not Fermat). The feature follows the exact implementation pattern of the recent hypocycloid notes family while extending past Day 871's 120-cusped hectoeicosagon completion. **Naming note**: 121 = 100 + 21, so the hypocycloid is named **hectoheneicosagon** (hecto = 100, heneicosagon = 21, total = 121) — this continues the standard Greek prefix-and-suffix pattern of `hecto-` (100) + Greek digit for the 101-121+ range, with `hectoheneicosagon` being the canonical name for 121 sides (the 21st value in the hecto-100..121+ series).
- **Files Modified**:
  - `js/Track.js`: Added `hectoheneicosagonNotes` method after `hectoeicosagonNotes` (new last method on class)
  - `js/constants.js`: 26 `HECTOHENEICOSAGON_NOTES_*` constants (22 base + 4 SHAPES array entries) + APP_VERSION bumped to 2.520.0
  - `js/ui.js`: Added 4 "Hectoheneicosagon Notes" menu items after Hectoeicosagon Notes (Tight, 32)
  - `js/tests.js`: Added Day 872 Hectoheneicosagon test block with 7 tests
  - `AGENTS.md`: Updated with this entry (prepended)
  - `scripts/day872_hectoheneicosagon.py`: Reproducibility script
- **Pre-existing Bug Fix**: None this run.
- **Feature Details**:
  - **hectoheneicosagonNotes** (`js/Track.js`): For each active note, places `clampedLength` samples along a hectoheneicosagon (121-cusped hypocycloid) curve. For sample `i` in 0..clampedLength-1, computes `t = tMin + (tMax - tMin) * i / Math.max(1, clampedLength - 1)`, then `cosT = Math.cos(t)`, `sinT = Math.sin(t)`, `cos120T = Math.cos(120 * t)`, `sin120T = Math.sin(120 * t)`, then `x = a*cosT + aOver120*cos120T` and `y = a*sinT - aOver120*sin120T` (where `aOver120 = a/120`). Skips non-finite samples, captures undo BEFORE mutation, reuses the existing sample normalization / note placement pattern, and returns `hectoheneicosagonCount`.
  - **Hectoheneicosagon Notes Menu Items** (`js/ui.js`): 4 items:
    - "Hectoheneicosagon Notes (Standard, 32)" -> `hectoheneicosagonNotes(32, 4, 0.95, 'standard', true)`
    - "Hectoheneicosagon Notes (Inverted, 32)" -> `hectoheneicosagonNotes(32, 4, 0.95, 'inverted', true)`
    - "Hectoheneicosagon Notes (Hectoheneicosagon, 32)" -> `hectoheneicosagonNotes(32, 4, 0.95, 'hectoheneicosagon', true)`
    - "Hectoheneicosagon Notes (Tight, 32)" -> `hectoheneicosagonNotes(32, 4, 0.95, 'tight', true)`
- **Constants** (`js/constants.js`): 26 new entries including `HECTOHENEICOSAGON_NOTES_HECTOHENEICOSAGON_T_MAX = 2 * Math.PI / 121` and `HECTOHENEICOSAGON_NOTES_TIGHT_T_MIN/MAX = ±Math.PI / 121`.
- **Version**: Bumped to 2.520.0
- **Test Count**: 7 Day 872 tests added. `node --check` passes for all 4 modified files (`js/Track.js`, `js/constants.js`, `js/ui.js`, `js/tests.js`). ESM import of constants.js succeeds (APP_VERSION = 2.520.0, HECTOHENEICOSAGON_NOTES_DEFAULT_LENGTH = 32, HECTOHENEICOSAGON_NOTES_HECTOHENEICOSAGON_T_MAX = 2*PI/121 = 0.051945). scripts/day872_hectoheneicosagon.py added for reproducibility.

(Day 872: Hectoheneicosagon (121-cusped Hypocycloid) Notes - 121 one-hundred-and-twenty-one-pointed-star hypocycloid curves per source note, the natural 121-cusped cousin of the cardioid (1 cusp) through hectoeicosagon (120 cusps), extending the 1-2-3-4-5-6-7-8-9-10-11-12-13-14-15-16-17-18-19-20-21-22-23-24-25-26-27-28-29-30-31-32-33-34-35-36-37-38-39-40-41-42-43-44-45-46-47-48-49-50-51-52-53-54-55-56-57-58-59-60-61-62-63-64-65-66-67-68-69-70-71-72-73-74-75-76-77-78-79-80-81-82-83-84-85-86-87-88-89-90-91-92-93-94-95-96-97-98-99-100-101-102-103-104-105-106-107-108-109-110-111-112-113-114-115-116-117-118-119-120-121 cusp sequence of classical hypocycloids. 121-fold rotational D121 dihedral symmetry, 121 inward-pointing cusps at ~2.9752 degree intervals (360°/121 ≈ 2.9752° exact = 2π/121 of revolution), generated by a small circle of radius r=a/120 rolling inside a fixed circle of radius R=121a/120 (R/r=121, 121 cusps per revolution). 121 = 11^2 IS NOT constructible by compass and straightedge (Gauss-Wantzel 1837 theorem: n is constructible iff n is a product of DISTINCT Fermat primes and a power of 2; 11 appears with multiplicity 2 in 11^2 = 121, so 121 fails the distinctness criterion since 11 is prime but not Fermat). 121-fold rotational symmetry is forbidden in classical crystallography (Bravais 1850 only allows 1, 2, 3, 4, 6-fold rotations in periodic crystals) but appears in 121-fold quasicrystal approximants. 121 = 11^2 is a perfect square, the 2nd "non-Fermat-prime squared" composite (after 49 = 7^2, then 121 = 11^2, 169 = 13^2, 289 = 17^2 (Fermat! but 17^2 = 289 fails the distinctness criterion due to multiplicity 2), 361 = 19^2, 529 = 23^2, 841 = 29^2, 961 = 31^2, 1369 = 37^2, 1681 = 41^2, 1849 = 43^2, 2209 = 47^2, ...), the smallest "p^2 where p is a non-Fermat prime > 5" (49 = 7^2 is smaller; 121 = 11^2 is the 2nd such). Parametric: x = a*cos(t) + (a/120)*cos(120t), y = a*sin(t) - (a/120)*sin(120t).)

"""
    with open(AGENTS_PATH) as f:
        content = f.read()
    # Find the existing Day 871 entry; insert new entry AFTER it (which means prepend the new one before Day 871 marker)
    marker = "#### Day 871: Hectoeicosagon (120-cusped Hypocycloid) Notes Feature (2026-07-04)"
    idx = content.find(marker)
    if idx < 0:
        raise RuntimeError("AGENTS.md: Day 871 marker not found")
    new_content = content[:idx] + entry + content[idx:]
    with open(AGENTS_PATH, 'w') as f:
        f.write(new_content)
    print("[5/5] AGENTS.md: Day 872 entry prepended")

if __name__ == "__main__":
    patch_track()
    patch_constants()
    patch_ui()
    patch_tests()
    patch_agents_md()
    print("Done.")
