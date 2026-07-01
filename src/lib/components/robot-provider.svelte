<script lang="ts">
import { type Snippet } from 'svelte';
import {
  QueryClientProvider,
  QueryClient,
  type QueryClientConfig,
} from '@tanstack/svelte-query';
import type { DialConf } from '@viamrobotics/sdk';
import InternalProvider from './internal-provider.svelte';
import {
  setSDKLogLevel,
  SDKLogLevel,
  type SDKLogLevelType,
  getPersistedLogLevel,
} from '$lib/logger';
import type { RobotClientsOptions } from '$lib/hooks/robot-clients.svelte';

interface Props {
  config?: QueryClientConfig;
  options?: RobotClientsOptions;
  dialConfigs: Record<string, DialConf>;
  logLevel?: SDKLogLevelType;
  children: Snippet;
}

let {
  config,
  dialConfigs,
  logLevel = SDKLogLevel.info,
  options,
  children,
}: Props = $props();

const client = $derived(new QueryClient(config));

$effect(() => {
  if (logLevel !== undefined) {
    const persistedLevel = getPersistedLogLevel();
    if (persistedLevel !== null) {
      setSDKLogLevel(persistedLevel);
    } else {
      setSDKLogLevel(logLevel);
    }
  }
});
</script>

<QueryClientProvider {client}>
  <InternalProvider
    {dialConfigs}
    {options}
  >
    {@render children()}
  </InternalProvider>
</QueryClientProvider>
