# viam-svelte-sdk

A Svelte 5 library providing components and hooks for building apps with Viam-powered machines. Wraps the `@viamrobotics/sdk` TypeScript SDK with Svelte-native patterns: reactive hooks, TanStack Query integration, and provider components.

## Tech stack

| Layer           | Technology            |
| --------------- | --------------------- |
| Frontend        | Svelte 5 (runes)      |
| Styling         | TailwindCSS           |
| Async state     | TanStack Svelte Query |
| Package manager | pnpm                  |
| Testing         | Vitest + Playwright   |

## Commands

```
pnpm dev           # start dev server
pnpm build         # build for production
pnpm check         # svelte-check
pnpm lint          # prettier + eslint + knip
pnpm format        # prettier --write
pnpm test          # vitest unit tests
pnpm test:e2e      # Playwright E2E
```

## Generated code — never hand-edit

- Any files included in `.gitignore` should not be edited

## Code organization

Organize code by feature with **one focused unit per file**. File names should describe what the code does. Avoid generic bucket files (`utils`, `helpers`, `constants`).

Public exports live in `src/lib/index.ts`. Hooks go in `src/lib/hooks/`, components in `src/lib/components/`.

## Topic-specific rules

Detailed guidance lives in `.claude/rules/`. Path-scoped rules load when Claude reads matching files; rules without `paths` load every session.

<!-- claude-config:rules-table start -->

| Rule                    | Loads when                                          |
| ----------------------- | --------------------------------------------------- |
| `svelte.md`             | editing `.svelte`, `.svelte.ts`, `.svelte.js`       |
| `typescript.md`         | editing `.ts`                                       |
| `testing-frontend.md`   | editing test files (`**/*.spec.ts`)                 |
| `pr-description.md`     | editing files under `.changeset/`                   |
| `changesets.md`         | editing files under `.changeset/` or `CHANGELOG.md` |
| `code-comments.md`      | editing any code file                               |
| `editing-discipline.md` | every session (edit from current state, in scope)   |
| `verification.md`       | every session (verify before reporting done)        |
| `design-system.md`      | every session (design system context)               |

<!-- claude-config:rules-table end -->

Repo-local (unmanaged) rules also live in `.claude/rules/`: `svelte-local.md` (Viam SDK data-fetching hooks) and `pr-description-local.md` (this repo's `src/lib` PR layer table) load via their `paths` frontmatter; `viam-context.md` (verifying against Viam docs and SDK sources) loads every session.
