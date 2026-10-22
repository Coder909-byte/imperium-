# 009. Move the reusable minimum audio foundation into M8

## Context

PRD M8 required full audio while M10 owned its implementation. Neither section resolved the dependency. During the 2026-10-22 handoff, the owner explicitly moved Howler integration, Gallia ambient beds and required cues, user-gesture activation, persisted mute and scene-exit cleanup into M8, using only approved manifest-listed assets. Broader polish and expansion remain in M10.

## Decision

M8 owns a reusable, scene-scoped `AudioDirector` backed by Howler (MIT). It creates no sounds before trusted keyboard/pointer input, fades bed intensity and crossfades an optional per-beat bed, plays one-shot cues, and stops/unloads owned sounds and cancels delayed stops on exit. The player persists master mute in localStorage, with an in-memory fallback when storage is unavailable. It stops audio as soon as exit is requested, including the cloud transition. It never calls global Howler unload/mute. JSON audio IDs resolve through the same human-approved PD/CC0 manifest boundary as scene art.

## Consequences

This resolves ownership, not the absent assets. Gallia's `wind_plains` remains an explicit audio placeholder; no sound is synthesized or substituted in production. Audio tests use isolated mocks or in-memory synthetic browser fixtures, never production manifest approvals. M8 stays incomplete until approved Gallia beds/cues are integrated and heard on target browsers/devices. M10 improves the mix, transitions and catalog after this foundation; it no longer reimplements Howler integration, gesture gating, persisted mute or cleanup.
