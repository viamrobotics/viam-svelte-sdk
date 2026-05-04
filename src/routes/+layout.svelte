<script lang="ts">
import '../app.css';
import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
import { ViamProvider } from '$lib';
import type { Snippet } from 'svelte';
import { dialConfigs as configsStore } from './configs';
import { SDKLogLevel } from '$lib/logger';

interface Props {
  children: Snippet;
}

let { children }: Props = $props();

const dialConfigs = $derived(configsStore.current);
</script>

<ViamProvider
  {dialConfigs}
  logLevel={SDKLogLevel.debug}
>
  {@render children()}
  <SvelteQueryDevtools />
</ViamProvider>
