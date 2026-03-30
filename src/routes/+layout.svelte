<script lang="ts">
import '../app.css';
import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
import { ViamProvider } from '$lib';
import type { Snippet } from 'svelte';
import { dialConfigs as envConfigs } from './configs';
import type { DialConf } from '@viamrobotics/sdk';
import { SDKLogLevel } from '$lib/logger';

interface Props {
  children: Snippet;
}

let { children }: Props = $props();

let configs = $state.raw<Record<string, DialConf>>(structuredClone(envConfigs));
let enabled = $state<Record<string, boolean>>({});

const id = setInterval(() => {
  configs = structuredClone(envConfigs);
}, 1000);

let dialConfigs = $derived(
  Object.fromEntries(Object.entries(configs).filter(([key]) => enabled[key]))
);

$effect.pre(() => {
  const partIDs = Object.keys(configs);
  const toRemove = Object.keys(enabled).filter(
    (partID) => !partIDs.includes(partID)
  );

  for (const partID of partIDs) {
    if (!(partID in enabled)) {
      enabled[partID] = true;
    }
  }

  for (const partID of toRemove) {
    delete enabled[partID];
  }

  return () => clearTimeout(id);
});
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

<ViamProvider
  {dialConfigs}
  logLevel={SDKLogLevel.debug}
>
  {@render children()}
  <SvelteQueryDevtools />
</ViamProvider>
