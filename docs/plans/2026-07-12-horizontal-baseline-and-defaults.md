# Horizontal Baseline and Defaults Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make horizontal vertical position control a fixed spectrum baseline and apply the user-approved horizontal defaults.

**Architecture:** Keep the local Canvas centered with CSS transforms, but derive its screen-space center from the configured baseline and the direction-specific baseline offset inside the Canvas. Canvas height may grow with amplitude while the baseline remains fixed. Continue using the existing offscreen spectrum and glow buffers.

**Tech Stack:** Wallpaper Engine Web Wallpaper API, Canvas 2D, vanilla JavaScript, JSON user properties.

---

### Task 1: Anchor horizontal position to the baseline

**Files:**
- Modify: `wallpaper-engine/wallpaper.js`

**Steps:**
1. Store the direction-specific baseline coordinate in horizontal geometry.
2. Convert the configured vertical percentage into a screen-space baseline.
3. Offset the Canvas center so its internal baseline lands on that screen-space coordinate.
4. Make the horizontal renderer use the geometry baseline.

### Task 2: Apply approved defaults

**Files:**
- Modify: `wallpaper-engine/wallpaper.js`
- Modify: `wallpaper-engine/project.json`

**Steps:**
1. Default to horizontal mode, 240 FPS, and 100% render quality.
2. Set sensitivity / attack / release to 210 / 70 / 47.
3. Set horizontal X / Y / width / amplitude to 50 / 90 / 67 / 14.
4. Keep 64 bars, width 7, gap 5, upward direction, opacity 92, glow 67, four colors, and gradient speed 31.

### Task 3: Verify behavior

**Files:**
- Test: `wallpaper-engine/index.html`
- Test: `wallpaper-engine/project.json`

**Steps:**
1. Validate JavaScript and JSON syntax.
2. Compare global baseline pixels at amplitudes 1, 14, and 30.
3. Capture and inspect the new default horizontal preview.
4. Run `git diff --check`.
