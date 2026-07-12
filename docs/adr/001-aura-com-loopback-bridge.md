# ADR 001: Use a loopback Aura COM bridge

## Status

Accepted

## Context

The wallpaper previously targeted the Aura Ready GameSDK REST endpoint on port 27339. On this machine, the endpoint responds but cannot acquire control, while `LightingService` and the Aura SDK v3.1 COM registration (`aura.sdk.1`) are present.

## Decision

Use a 64-bit local Python bridge with pywin32 to call Aura SDK v3.1 COM. Bind its HTTP server only to `127.0.0.1:27340`, accept only bounded `{ bass, energy }` frames, and expose health and release endpoints. The wallpaper never receives a device list or a general-purpose Aura command endpoint.

## Consequences

- Matches the local Aura SDK path available to applications such as Opera GX more closely than the legacy GameSDK REST path.
- Requires the bridge to remain running while Aura synchronization is desired.
- Aura control is exclusive; GX Lights or Armoury Crate effects can compete with the wallpaper.
- The bridge can release Aura control on silence, explicit release, or shutdown.
