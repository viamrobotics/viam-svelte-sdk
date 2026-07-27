---
paths:
  - '**/*.svelte'
  - '**/*.svelte.ts'
  - '**/*.svelte.js'
---

# Svelte + Viam SDK (repo-specific)

Repo-specific Svelte guidance for `@viamrobotics/svelte-sdk`. General Svelte 5
conventions live in the shared `svelte.md` rule; this file covers only what is
specific to this SDK's data-fetching layer.

## State Management with TanStack Svelte Query

This library wraps `@tanstack/svelte-query` to provide reactive async state for
Viam robot and app clients. The `create*` hooks in `src/lib/hooks/` are the
primary pattern.

- **`createRobotQuery`** / **`createRobotMutation`** — query/mutate the connected robot client.
- **`createResourceQuery`** / **`createResourceMutation`** / **`createResourceStream`** — query/mutate/stream a specific resource (arm, camera, sensor, etc.).
- **`createAppQuery`** / **`createAppMutation`** / **`createDataQuery`** / **`createDataMutation`** — query/mutate the Viam app/data APIs.

All hooks accept a `$derived`-compatible options object so reactive args
automatically re-trigger queries.

Default to local component state (`$state`, `$derived`) for UI-only values. Use
the `create*` hooks for any async interaction with the Viam SDK.
