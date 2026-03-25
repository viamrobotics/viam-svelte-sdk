<script lang="ts">
import type { Snippet } from 'svelte';
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

interface Props {
  config?: QueryClientConfig;
  dialConfigs: Record<string, DialConf>;
  logLevel?: SDKLogLevelType;
  children: Snippet;
}

let {
  config,
  dialConfigs,
  logLevel = SDKLogLevel.info,
  children,
}: Props = $props();

export const client = new QueryClient(config);

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
  <InternalProvider {dialConfigs}>
    {@render children()}
  </InternalProvider>
</QueryClientProvider>
