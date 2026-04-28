---
paths:
  - '.changeset/**'
  - 'CHANGELOG.md'
---

# Changesets

Every PR that changes runtime behavior needs a changeset in `.changeset/`. The single package is `@viamrobotics/svelte-sdk`; see [CHANGELOG.md](../../CHANGELOG.md) for voice and existing `.changeset/*.md` files for format.

## Creating a Changeset

Run `pnpm changeset` — it prompts for a bump and writes `.changeset/<random-name>.md` with the right frontmatter.

## Bump Types

Bump types follow semver:

- `major` — breaking public API changes (rare; coordinate before merging).
- `minor` — additive features, new capabilities (new hooks, components, or exports).
- `patch` — bug fixes, perf, security, dependency bumps, internal refactors.

## Summary Voice

Summary is one imperative phrase matching the changelog voice. Examples:

- `Fix usePolling stopping after deps change while a fetch is in-flight`
- `Add createDataQuery hook for querying the Viam data API`
- `sec: update tar dependency`
- `Make robot connection provider expose explicit connect and disconnect functions`

## When to Skip

Skip a changeset only for changes that don't affect consumers of the package: CI config, test-only edits, docs-only edits, internal tooling.
