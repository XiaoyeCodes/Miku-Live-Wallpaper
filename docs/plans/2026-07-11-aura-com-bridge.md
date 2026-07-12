# Aura COM Bridge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Control ASUS Aura hardware from the wallpaper through the installed Aura SDK v3.1 COM interface rather than the unavailable GameSDK REST service.

**Architecture:** A local Python process uses `aura.sdk.1` to acquire Aura control, enumerate devices, set light colors, and apply the result. The wallpaper sends only normalized bass and energy values to a loopback-only HTTP endpoint.

**Tech Stack:** Python 3.13 x64, pywin32, Aura SDK v3.1 COM, vanilla JavaScript.

---

### Task 1: Create the secure loopback bridge

**Files:**
- Create: `wallpaper-engine/aura_bridge.py`
- Create: `wallpaper-engine/start-aura-bridge.bat`

**Step 1:** Bind an HTTP server only to `127.0.0.1:27340`.

**Step 2:** Accept bounded bass and energy values at `/frame`, throttle device writes to 80 ms, and expose only a minimal `/health` endpoint.

**Step 3:** Use `aura.sdk.1`, `SwitchMode`, `Enumerate(0)`, per-light color updates, and `Apply` as documented by ASUS.

**Step 4:** Release control on `/release` and process shutdown.

### Task 2: Connect the wallpaper to the bridge

**Files:**
- Modify: `wallpaper-engine/aura-sync.js`

**Step 1:** Replace the GameSDK REST protocol with the loopback bridge protocol.

**Step 2:** Preserve retry, silence release, and 80 ms update behavior.

**Step 3:** Do not expose device enumeration or arbitrary device commands to the wallpaper.

### Task 3: Validate and run

**Files:**
- Test: `wallpaper-engine/aura_bridge.py`
- Test: `wallpaper-engine/aura-sync.js`

**Step 1:** Compile-check Python and JavaScript.

**Step 2:** Start the bridge, verify `/health`, and verify the loopback listener.

**Step 3:** Inspect the diff for whitespace errors and report any Aura device enumeration failure without leaving control acquired.
