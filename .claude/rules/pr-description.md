---
paths:
  - '.changeset/**'
---

# PR Description Format

Follow the structure and tone used in this repository. PR descriptions are technical documents aimed at reviewers who already know the codebase — be precise, not verbose. Do not use em dashes. Use American English.

## Opening Paragraph

One to two sentences summarizing **what** the PR adds or changes and **why** it matters. Mention the user-facing capability, not implementation details.

```
Adds explicit connect and disconnect functions to ViamProvider so consumers
can programmatically control the robot connection lifecycle.
```

## Layer-by-Layer Breakdown

Break changes into sections that match the architecture layers they touch. Use the exact heading names below. Omit any section with no changes.

| Heading        | What it covers                                                           |
| -------------- | ------------------------------------------------------------------------ |
| **Components** | Changes in `src/lib/components/` (Svelte provider or UI components)      |
| **Hooks**      | Changes in `src/lib/hooks/` (reactive hooks and query/mutation wrappers) |
| **Types**      | New or changed exported types in `src/lib/index.ts` or hook files        |
| **Tests**      | New or changed test files                                                |

Within each section:

- Use a bulleted list.
- Each bullet starts with the symbol being changed (function, component, hook, type) in backticks or bold, then describes **what** changed.
- Be specific: name the new hook, the new export, the changed prop — don't just say "updated the provider".
- Keep bullets to one or two sentences.

```markdown
### Hooks

- `createResourceStream` now retries automatically when the stream times out.
- `usePolling` no longer stops when reactive deps change mid-fetch.
```

## Why?

Include a **Why?** section when the PR involves non-obvious design decisions. Format each decision as a bold question followed by a paragraph answer.

```markdown
### Why?

**Why expose connect/disconnect instead of auto-connecting?**

Some consumers need to defer connection until the user explicitly acts. ...
```

Skip this section for straightforward PRs where the "what" is self-explanatory.

## Testing

End with a **Testing** section listing which test suites were run and any new tests added.

```markdown
### Testing

Ran `pnpm test` and `pnpm test:e2e`. Added a new spec for the polling retry behavior.
```

Name the specific test commands — don't just say "tests pass".

## Style Rules

- Use `###` (h3) for each section heading.
- Use GitHub-flavoured Markdown — backtick-fenced code, bullet lists, bold.
- Do **not** add a `## Summary` or `## Description` wrapper heading; the opening paragraph stands on its own.
- Do **not** include auto-generated changelogs, file lists, or diff stats — reviewers can see those in the Files tab.
- Keep the tone direct and technical. Write in first person when explaining rationale ("I tested this with..."). Use present tense for describing behaviour ("`createResourceStream` retries...").
- When renaming or deprecating something, call out both the old and new names explicitly.
- If the PR depends on or stacks on another PR, note the base branch and link the parent PR in the opening paragraph.
