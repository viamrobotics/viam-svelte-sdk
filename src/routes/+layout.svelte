<script lang="ts">
import '../app.css';
import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
import { ViamProvider } from '$lib';
import type { Snippet } from 'svelte';
import { dialConfigs as c } from './configs';
import Parts from './components/parts.svelte';
import type { DialConf } from '@viamrobotics/sdk';

interface Props {
  children: Snippet;
}

let configs = $state.raw<Record<string, DialConf>>({});

const id = setInterval(() => {
  configs = structuredClone(c);
}, 1000);

$effect.pre(() => {
  return () => clearTimeout(id);
});

let enabled = $state<Record<string, boolean>>({});
let dialConfigs = $derived(
  Object.fromEntries(Object.entries(configs).filter(([key]) => enabled[key]))
);

let { children }: Props = $props();
</script>

<div class="flex gap-4 p-4">
  {#each Object.keys(configs) as part (part)}
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
