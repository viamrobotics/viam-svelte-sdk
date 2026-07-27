---
paths:
  - '.changeset/**'
---

# PR Description Layers (repo-specific)

Repo-specific layer breakdown for `@viamrobotics/svelte-sdk` PR descriptions.
The general PR-description format (tone, opening paragraph, Why?, Testing, style
rules) lives in the shared `pr-description.md` rule. This single-package repo
organizes code under `src/lib`, so use the layer headings below in place of the
generic package-oriented ones.

## Layer-by-Layer Breakdown

Break changes into sections that match the architecture layers they touch. Use
the exact heading names below. Omit any section with no changes.

| Heading        | What it covers                                                           |
| -------------- | ------------------------------------------------------------------------ |
| **Components** | Changes in `src/lib/components/` (Svelte provider or UI components)      |
| **Hooks**      | Changes in `src/lib/hooks/` (reactive hooks and query/mutation wrappers) |
| **Types**      | New or changed exported types in `src/lib/index.ts` or hook files        |
| **Tests**      | New or changed test files                                                |
