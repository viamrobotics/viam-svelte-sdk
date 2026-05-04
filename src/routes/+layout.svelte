<script lang="ts">
import '../app.css';
import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
import { ViamProvider } from '$lib';
import type { Snippet } from 'svelte';
import { dialConfigs as configsStore } from './configs';
import { SDKLogLevel } from '$lib/logger';
import { onMount } from 'svelte';

interface Props {
  children: Snippet;
}

let { children }: Props = $props();

let dialConfigs = $state(configsStore.current);

onMount(() => {
  // repro app setup by refreshing dial configs every 1 second
  const refreshDialConfigs = async () => {
    dialConfigs = configsStore.current;
  };
  const interval = setInterval(refreshDialConfigs, 1000);
  return () => clearInterval(interval);
});
</script>

<ViamProvider
  {dialConfigs}
  logLevel={SDKLogLevel.debug}
>
  {@render children()}
  <SvelteQueryDevtools />
</ViamProvider>
