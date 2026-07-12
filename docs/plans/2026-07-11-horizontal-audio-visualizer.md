# Horizontal Audio Visualizer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a selectable horizontal music spectrum with independent geometry and colors while preserving the optimized circular spectrum.

**Architecture:** Reuse the existing audio data, frame scheduler, local Canvas, offscreen spectrum buffer, and cached glow buffer. Select a circle or horizontal geometry before sizing the local Canvas, then render through a dedicated draw path. Keep shared audio sensitivity and smoothing controls, but store independent bar counts, placement, sizing, and palettes for each visualizer mode.

**Tech Stack:** Wallpaper Engine Web Wallpaper API, Canvas 2D, vanilla JavaScript, JSON user properties.

---

### Task 1: Add mode-aware geometry

**Files:**
- Modify: `wallpaper-engine/wallpaper.js`
- Modify: `wallpaper-engine/styles.css`

**Steps:**
1. Add circle and horizontal mode state.
2. Calculate separate local Canvas bounds for circle and horizontal layouts.
3. Place the horizontal surface at the bottom reference position.
4. Hide the center artwork in horizontal mode.
5. Verify Canvas and artwork centers remain aligned in circle mode.

### Task 2: Render the horizontal spectrum

**Files:**
- Modify: `wallpaper-engine/wallpaper.js`

**Steps:**
1. Mirror low frequencies toward the center of the horizontal spectrum.
2. Draw round-ended bars using independent width and gap weights.
3. Support upward, bidirectional, and downward movement.
4. Interpolate one to four user colors across the bar group.
5. Reuse the 30 FPS glow cache and the selected animation FPS.

### Task 3: Add properties and defaults

**Files:**
- Modify: `wallpaper-engine/project.json`
- Modify: `wallpaper-engine/wallpaper.js`

**Steps:**
1. Add a circle/horizontal mode selector.
2. Add horizontal position, width, amplitude, count, width, gap, direction, opacity, glow, gradient speed, color count, and four colors.
3. Set horizontal defaults from the red reference box.
4. Set circle defaults to X 84%, Y 79%, size 27%, radius 46%.
5. Set general beat defaults for popular music to 7 / 20 / 145 / 14 / 76 / 90.

### Task 4: Verify both modes

**Files:**
- Test: `wallpaper-engine/index.html`
- Test: `wallpaper-engine/project.json`

**Steps:**
1. Validate JavaScript and JSON syntax.
2. Capture circle-mode and horizontal-mode simulated-audio previews.
3. Check reference placement, bar spacing, gradients, clipping, and center artwork visibility.
4. Measure local Canvas dimensions and target FPS in both modes.
5. Run `git diff --check`.
