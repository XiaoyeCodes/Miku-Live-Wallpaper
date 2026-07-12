# Audio Controls and Clock Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Wallpaper Engine controls for a centered horizontal audio spectrum and an adaptive, configurable digital clock.

**Architecture:** Keep the canvas full-screen but draw a centered spectrum group whose width and vertical position come from Wallpaper Engine properties. Add a semantic clock overlay and update its time and day/night theme from the existing local-time loop. Define the controls in `project.json` so they appear in Wallpaper Engine.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Wallpaper Engine Web property listener.

---

### Task 1: Add the clock overlay and visual design

**Files:**
- Modify: `wallpaper-engine/index.html`
- Modify: `wallpaper-engine/styles.css`

**Step 1:** Add a centered clock landmark with separate time and date elements.

**Step 2:** Style it as a high-contrast glass panel with blur, cyan and magenta edge lighting, and day/night variants.

**Step 3:** Verify the local preview loads without layout overflow.

### Task 2: Make the spectrum and clock configurable

**Files:**
- Modify: `wallpaper-engine/wallpaper.js`

**Step 1:** Replace the fixed 48-bar canvas state with a resettable bar buffer.

**Step 2:** Draw a horizontally centered spectrum group using configurable count, width, sensitivity, and vertical position.

**Step 3:** Add a Wallpaper Engine property listener for spectrum and clock controls.

**Step 4:** Update the clock once per second and apply an appropriate day/night class from the existing scene clock.

**Step 5:** Run `node --check wallpaper-engine/wallpaper.js`.

### Task 3: Expose Wallpaper Engine properties

**Files:**
- Create: `wallpaper-engine/project.json`

**Step 1:** Define sliders for spectrum bar count, group width, sensitivity, and vertical position.

**Step 2:** Define controls for clock visibility, size, vertical position, date, and seconds.

**Step 3:** Validate JSON with `Get-Content -Raw wallpaper-engine/project.json | ConvertFrom-Json`.

### Task 4: Verify and hand off

**Files:**
- Test: `wallpaper-engine/index.html`

**Step 1:** Run JavaScript and JSON validation.

**Step 2:** Request the local preview and confirm HTTP 200.

**Step 3:** Inspect the Git diff for whitespace errors and open the refreshed preview.

### Task 5: Upgrade the clock to an inertial digit display

**Files:**
- Modify: `wallpaper-engine/styles.css`
- Modify: `wallpaper-engine/wallpaper.js`

**Step 1:** Replace plain clock text with reusable digit slots so each numeral can animate independently.

**Step 2:** Animate new numerals upward from below and old numerals upward out of frame with an overshooting cubic-bezier curve.

**Step 3:** Increase glass transparency while preserving adaptive border, blur, and glow contrast.

**Step 4:** Run `node --check wallpaper-engine/wallpaper.js`, capture a headless preview, and inspect the clock layout.
