<script lang="ts">
import '../app.css';
import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
import { ViamProvider } from '$lib';
import type { Snippet } from 'svelte';
import { dialConfigs as configs } from './configs';
import Parts from './components/parts.svelte';

interface Props {
  children: Snippet;
}

let enabled = $state<Record<string, boolean>>({});
let dialConfigs = $derived(
  Object.fromEntries(Object.entries(configs).filter(([key]) => enabled[key]))
);

let { children }: Props = $props();
</script>

<div class="flex gap-4 p-4">
  {#each Object.keys(configs) as part}
    <div>
      <input
        type="checkbox"
        bind:checked={enabled[part]}
      />
      {part}
    </div>
  {/each}
</div>

<ViamProvider {dialConfigs}>
  <Parts />
  {@render children()}
  <SvelteQueryDevtools />
</ViamProvider>
