<script lang="ts">
import { QueryClientProvider, type QueryClient } from '@tanstack/svelte-query';

import {
  provideResourceGenerations,
  useResourceGeneration,
} from '$lib/hooks/resource-generation.svelte';
import MachineWatcher from '../../machine-watcher.svelte';

interface Props {
  client: QueryClient;
  partID: string;
  /** The resource whose published generation the spec reads back. */
  watch: string;
}

let { client, partID, watch }: Props = $props();

provideResourceGenerations();

const generation = useResourceGeneration(
  () => partID,
  () => watch
);
</script>

<QueryClientProvider {client}>
  <MachineWatcher {partID} />
</QueryClientProvider>

<div data-testid="generation">{generation.current}</div>
<div data-testid="can-query">{String(generation.canQuery)}</div>
