<script lang="ts">
import type { Snippet } from 'svelte';
import { QueryClientProvider, QueryClient } from '@tanstack/svelte-query';
import type { DialConf } from '@viamrobotics/sdk';
import InternalProvider from './internal-provider.svelte';
import { enableDebug, disableDebug } from '../debug';

interface Props {
  dialConfigs: Record<string, DialConf>;
  client?: QueryClient;
  machineStatusRefetchInterval?: number;
  debug?: boolean;
  children: Snippet;
}

let {
  dialConfigs,
  client = new QueryClient(),
  machineStatusRefetchInterval,
  debug = false,
  children,
}: Props = $props();

$effect(() => (debug ? enableDebug() : disableDebug()));
</script>

<QueryClientProvider {client}>
  <InternalProvider
    {dialConfigs}
    {machineStatusRefetchInterval}
  >
    {@render children()}
  </InternalProvider>
</QueryClientProvider>
