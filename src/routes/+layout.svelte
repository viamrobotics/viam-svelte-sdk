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

let dialConfigs = $state(configs);

$effect(() => {
  const id = setInterval(() => (dialConfigs = { ...dialConfigs }), 3000);
  return () => clearInterval(id);
});

let { children }: Props = $props();
</script>

<ViamProvider {dialConfigs}>
  <Parts />
  {@render children()}
  <SvelteQueryDevtools />
</ViamProvider>
