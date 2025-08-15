<script lang="ts">
import type { Snippet } from 'svelte';
import { QueryClientProvider, QueryClient } from '@tanstack/svelte-query';
import type { DialConf } from '@viamrobotics/sdk';
import InternalProvider from './internal-provider.svelte';
import {
  enableQueryLogging,
  disableQueryLogging,
  enableVerboseQueryLogging,
  disableVerboseQueryLogging,
} from '../query-logger';

interface Props {
  dialConfigs: Record<string, DialConf>;
  client?: QueryClient;
  machineStatusRefetchInterval?: number;
  logQueries?:
    | boolean
    | {
        enabled: boolean;
        verbose?: boolean;
      };
  children: Snippet;
}

let {
  dialConfigs,
  client = new QueryClient(),
  machineStatusRefetchInterval,
  logQueries,
  children,
}: Props = $props();

$effect(() => {
  if (typeof logQueries === 'boolean') {
    logQueries = { enabled: logQueries };
  }

  if (logQueries?.enabled) {
    enableQueryLogging();
  } else {
    disableQueryLogging();
  }
});

$effect(() => {
  if (typeof logQueries === 'boolean') {
    return;
  }

  if (logQueries?.verbose) {
    enableVerboseQueryLogging();
  } else {
    disableVerboseQueryLogging();
  }
});
</script>

<QueryClientProvider {client}>
  <InternalProvider
    {dialConfigs}
    {machineStatusRefetchInterval}
  >
    {@render children()}
  </InternalProvider>
</QueryClientProvider>
