# Visualizer Frame Rate Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the circular audio visualizer render smoothly at a configurable 30–240 FPS while reducing 4K GPU and compositing cost.

**Architecture:** Keep Wallpaper Engine's approximately 30 Hz audio callback as the data source, but render interpolated motion on an independent frame scheduler. Replace the full-screen Canvas with a small Canvas centered on the ring, and draw crisp bars into an offscreen buffer before compositing one blurred glow layer and one sharp layer.

**Tech Stack:** Wallpaper Engine Web Wallpaper API, Canvas 2D, requestAnimationFrame, vanilla JavaScript, JSON user properties.

---

### Task 1: Localize the Canvas surface

**Files:**
- Modify: `wallpaper-engine/styles.css`
- Modify: `wallpaper-engine/wallpaper.js`

**Steps:**
1. Track viewport dimensions separately from Canvas dimensions.
2. Calculate the maximum ring, bar, and glow bounds.
3. Position a square Canvas at the configured visualizer center.
4. Resize only when geometry, quality, or viewport dimensions change.
5. Verify the ring remains aligned with the center artwork at several positions and sizes.

### Task 2: Replace per-bar shadow rendering

**Files:**
- Modify: `wallpaper-engine/wallpaper.js`

**Steps:**
1. Create an offscreen spectrum buffer.
2. Draw bars with direct polar endpoint math and no per-bar save/rotate/shadow operations.
3. Composite the buffer once with blur for glow and once without blur for sharp detail.
4. Verify colors, opacity, line caps, and gradients remain visually equivalent.

### Task 3: Decouple audio and render frame rates

**Files:**
- Modify: `wallpaper-engine/wallpaper.js`

**Steps:**
1. Add a configurable target frame interval from 30 to 240 FPS.
2. Convert spectrum attack and release smoothing to time-correct interpolation.
3. Update rotation and bass spring physics using measured delta time.
4. Add a lightweight measured-FPS debug API for validation.
5. Verify animation speed is stable at 30, 60, 120, and 240 FPS.

### Task 4: Add user controls and verify

**Files:**
- Modify: `wallpaper-engine/project.json`
- Test: `wallpaper-engine/index.html`

**Steps:**
1. Add Chinese frame-rate and render-quality properties, defaulting to 60 FPS and balanced quality.
2. Validate JavaScript and JSON syntax.
3. Measure actual browser render FPS at multiple targets.
4. Capture and inspect the optimized visualizer preview.
5. Run `git diff --check` and report practical limits for 4K hardware.
