# Circular Audio Visualizer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a highly configurable circular audio visualizer whose center artwork reacts only to distinct bass drum peaks with a fast, physical spring response.

**Architecture:** Keep the existing Wallpaper Engine audio listener and full-screen Canvas, replacing the horizontal spectrum drawing with polar-coordinate bars. Render the center artwork as a separate DOM layer so image selection and bass scale animation remain independent from Canvas frequency smoothing. Detect beats with a slowly adapting bass floor, a relative peak threshold, an absolute gate, hysteresis, and a short cooldown.

**Tech Stack:** Wallpaper Engine Web Wallpaper API, HTML5 Canvas 2D, CSS transforms, vanilla JavaScript, JSON user properties.

---

### Task 1: Add visualizer artwork and layers

**Files:**
- Create: `wallpaper-engine/assets/visualizer/miku-singer.png`
- Create: `wallpaper-engine/assets/visualizer/miku-record.png`
- Modify: `wallpaper-engine/index.html`
- Modify: `wallpaper-engine/styles.css`

**Steps:**
1. Copy the two user-provided source images without changing the originals.
2. Add a center-disc DOM layer behind the Canvas bars and above the wallpaper scenes.
3. Clip the artwork to a circle and add restrained cyan glass rim and glow layers.
4. Verify the two images load and the center disc is transparent outside its circular mask.

### Task 2: Implement polar spectrum rendering

**Files:**
- Modify: `wallpaper-engine/wallpaper.js`

**Steps:**
1. Replace horizontal bar geometry with polar-coordinate placement.
2. Resample the 64 stereo frequency bands to the configured bar count.
3. Interpolate multiple user-selected colors around the circumference.
4. Apply configurable radius, bar width, amplitude, gap, rotation angle, and rotation speed.
5. Verify JavaScript syntax and inspect a simulated-audio browser preview.

### Task 3: Implement gated bass impact

**Files:**
- Modify: `wallpaper-engine/wallpaper.js`
- Modify: `wallpaper-engine/styles.css`

**Steps:**
1. Maintain a slowly adapting bass baseline and recent peak envelope.
2. Trigger only when bass exceeds both absolute and baseline-relative thresholds.
3. Add hysteresis and a cooldown so one drum hit produces one impact.
4. Drive the center image with a fast attack, spring velocity, damping, and bounded overshoot.
5. Verify quiet audio does not trigger and synthetic bass peaks produce discrete impacts.

### Task 4: Add Wallpaper Engine controls

**Files:**
- Modify: `wallpaper-engine/project.json`
- Modify: `wallpaper-engine/wallpaper.js`

**Steps:**
1. Add Chinese controls for enable, position, size, radius, bar count, bar width, amplitude, sensitivity, opacity, glow, angle, and speed.
2. Add four color controls and a gradient rotation control.
3. Add built-in artwork selection and a custom image file property with fallback.
4. Add beat threshold, bass frequency range, impact strength, damping, and cooldown controls.
5. Validate JSON and property-update handling.

### Task 5: End-to-end verification

**Files:**
- Test: `wallpaper-engine/index.html`
- Test: `wallpaper-engine/project.json`
- Test: `wallpaper-engine/wallpaper.js`

**Steps:**
1. Run `node --check wallpaper-engine/wallpaper.js`.
2. Parse `project.json` and verify required property keys and ordering.
3. Run the local preview and capture a synthetic-audio screenshot.
4. Inspect the screenshot for clipping, overlap, contrast, and background compatibility.
5. Run `git diff --check` and report any remaining runtime-only verification needs.
