<script lang="ts">
import '../app.css';

import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
import { ViamProvider } from '$lib';
import type { Snippet } from 'svelte';

import { dialConfigs } from './configs';
import Parts from './parts.svelte';

interface Props {
  children: Snippet;
}

let { children }: Props = $props();
</script>

<QueryClientProvider client={new QueryClient()}>
  <ViamProvider {dialConfigs}>
    <Parts />
    {@render children()}
  </ViamProvider>
  <SvelteQueryDevtools />
</QueryClientProvider>
