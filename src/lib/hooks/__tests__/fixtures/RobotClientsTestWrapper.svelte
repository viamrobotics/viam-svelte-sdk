<script lang="ts">
import type { DialConf } from '@viamrobotics/sdk';
import {
  QueryClientProvider,
  QueryClient,
} from '@tanstack/svelte-query';
import RobotClientsTestInner from './RobotClientsTestInner.svelte';

interface Props {
  dialConfigs: Record<string, DialConf>;
}

let { dialConfigs }: Props = $props();

const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
</script>

<QueryClientProvider {client}>
  <RobotClientsTestInner {dialConfigs} />
</QueryClientProvider>
