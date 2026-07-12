# Aura COM Bridge

This bridge controls ASUS Aura devices through the locally registered Aura SDK v3.1 COM interface. It replaces the legacy GameSDK REST integration.

## Start

1. Close or disable Opera GX GX Lights while testing; Aura control is exclusive.
2. Double-click `start-aura-bridge.bat`.
3. Keep the console window open while the wallpaper is active.
4. Play audio in Wallpaper Engine. The bridge acquires Aura control only after audio energy is detected.

## Requirements

- 64-bit Python with `pywin32`
- ASUS `LightingService` running
- Registered `aura.sdk.1` COM interface

The bridge listens only on `127.0.0.1:27340`. It accepts only normalized bass and energy values from the wallpaper; it does not expose arbitrary Aura commands or device data over the network.

## Stop and release

Close the bridge console, switch away from the wallpaper, or stop audio for roughly 1.5 seconds. The bridge releases Aura control so Armoury Crate can resume its normal effect.
