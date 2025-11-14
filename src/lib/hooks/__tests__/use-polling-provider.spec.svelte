<script lang="ts">
import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';
import UsePollingConsumer from './use-polling-consumer.spec.svelte';

interface Props {
  queryKey: unknown[];
  interval: number | false;
  queryClient: QueryClient;
}

let { queryKey, interval, queryClient }: Props = $props();
</script>

<QueryClientProvider client={queryClient}>
  <UsePollingConsumer
    {queryKey}
    {interval}
  />
</QueryClientProvider>
