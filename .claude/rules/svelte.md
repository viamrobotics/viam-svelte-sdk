---
paths:
  - '**/*.svelte'
  - '**/*.svelte.ts'
  - '**/*.svelte.js'
---

# Svelte 5 Best Practices

We use Svelte 5 with runes. See the [Svelte 5 Documentation](https://svelte.dev/docs/svelte) and [Runes Guide](https://svelte.dev/docs/svelte/what-are-runes).

## Component Structure

```svelte
<script lang="ts">
import type { HTMLButtonAttributes } from 'svelte/elements';

interface Props extends HTMLButtonAttributes {
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'danger';
}

let {
  variant = 'primary',
  disabled = false,
  children,
  ...restProps
}: Props = $props();
const classes = $derived(['btn', `btn-${variant}`, disabled && 'btn-disabled']);
</script>

<button
  {...restProps}
  aria-disabled={disabled || undefined}
  class={classes}
>
  {@render children?.()}
</button>
```

**Key patterns:** typed `Props` interface extending HTML attributes; `$props()` with defaults and rest spread; `$derived` for computed values; `{@render children?.()}` for slot-like composition.

## Runes Quick Reference

| Old Syntax              | Svelte 5                | Purpose                   |
| ----------------------- | ----------------------- | ------------------------- |
| `export let prop`       | `$props()`              | Component props           |
| `$: derived = x + y`    | `$derived(x + y)`       | Computed values           |
| `$: { complex }`        | `$derived.by(() => {})` | Complex computations      |
| `let count = 0`         | `$state(0)`             | Deeply reactive state     |
| (no equivalent)         | `$state.raw(value)`     | Non-deeply reactive state |
| `export let` (bindable) | `$bindable()`           | Two-way binding           |
| `onMount`               | `$effect(() => {})`     | Side effects / lifecycle  |

Use `$state.raw` for values where you don't need deep reactivity (large arrays replaced wholesale, class instances). Use `untrack(() => value)` to read reactive state without registering a dependency.

## Snippets — Svelte 5 Replacement for Slots

**ALWAYS** use snippets instead of `<slot>` in Svelte 5:

```svelte
<!-- Parent: define a typed snippet prop -->
<script lang="ts">
import type { Snippet } from 'svelte';

interface Props {
  header: Snippet;
  children: Snippet<[{ item: string }]>;
}
let { header, children }: Props = $props();
</script>

{@render header()}
{#each items as item}
  {@render children({ item })}
{/each}
```

```svelte
<!-- Consumer: pass snippets inline -->
<MyList>
  {#snippet header()}
    <h2>My List</h2>
  {/snippet}
  {#snippet children({ item })}
    <li>{item}</li>
  {/snippet}
</MyList>
```

## `$derived` vs `$effect` — The Critical Distinction

**`$derived`** — pure computation only, no side effects:

```typescript
const fullName = $derived(`${firstName} ${lastName}`);
const sorted = $derived.by(() =>
  [...items].sort((a, b) => a.name.localeCompare(b.name))
);
```

**`$effect`** — side effects only (DOM mutations, subscriptions, cleanup):

```typescript
$effect(() => {
  document.title = `${count} items`;
  return () => cleanup();
});
```

**NEVER** use `$effect` to derive state:

```typescript
// BAD
let doubled = $state(0);
$effect(() => {
  doubled = count * 2;
}); // creates a loop, hard to reason about

// GOOD
const doubled = $derived(count * 2);
```

## State Management with TanStack Svelte Query

This library wraps `@tanstack/svelte-query` to provide reactive async state for Viam robot and app clients. The `create*` hooks in `src/lib/hooks/` are the primary pattern.

- **`createRobotQuery`** / **`createRobotMutation`** — query/mutate the connected robot client.
- **`createResourceQuery`** / **`createResourceMutation`** / **`createResourceStream`** — query/mutate/stream a specific resource (arm, camera, sensor, etc.).
- **`createAppQuery`** / **`createAppMutation`** / **`createDataQuery`** / **`createDataMutation`** — query/mutate the Viam app/data APIs.

All hooks accept a `$derived`-compatible options object so reactive args automatically re-trigger queries.

Default to local component state (`$state`, `$derived`) for UI-only values. Use the `create*` hooks for any async interaction with the Viam SDK.

## Context Providers

Use `.svelte.ts` files with `getContext`/`setContext` for reactive shared state. **ALWAYS** use `Symbol` keys.

```typescript
// theme-context.svelte.ts
import { getContext, setContext } from 'svelte';

const key = Symbol('theme');

interface ThemeContext {
  readonly current: 'light' | 'dark';
  toggle: () => void;
}

export const provideTheme = () => {
  let theme = $state<'light' | 'dark'>('light');
  const context: ThemeContext = {
    get current() {
      return theme;
    },
    toggle: () => {
      theme = theme === 'light' ? 'dark' : 'light';
    },
  };
  setContext(key, context);
  return context;
};

export const useTheme = (): ThemeContext => getContext(key);
```

**Key conventions:**

- `.svelte.ts` extension for files using runes outside `.svelte` components
- `Symbol()` for context keys — prevents accidental collisions
- Return objects with **getters**, not plain properties, to preserve reactivity
- Naming: `provide*` to inject into context, `use*` or `create*` to consume

## Accessibility

- Use semantic elements and correct ARIA roles; label all interactive elements.
- Hide decorative icons with `aria-hidden="true"`.
- Use `aria-disabled` instead of `disabled` when the element must remain focusable.

## Styling

Use array/object syntax for conditional classes:

```svelte
<button class={[
  'inline-flex items-center font-medium rounded',
  { 'bg-blue-600': variant === 'primary', 'bg-red-600': variant === 'danger' },
  disabled && 'opacity-50 cursor-not-allowed',
]}>
```

## Verify Your Work

```
pnpm check    # svelte-check
pnpm lint     # prettier + eslint + knip
```
