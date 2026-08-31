<script lang="ts">
import { useQueryClient } from '@tanstack/svelte-query';

import { useMachineStatus } from '$lib/hooks/machine-status.svelte';
import { useResourceGenerationsPublisher } from '$lib/hooks/resource-generation.svelte';
import { resourceGenerationsFromStatus } from '$lib/hooks/resource-generations-from-status';
import { resourceQueryKeyPrefix } from '$lib/hooks/resource-query-key';
import { refreshSharedStream } from '$lib/hooks/create-stream-client.svelte';

interface Props {
  partID: string;
}

let { partID }: Props = $props();

// A resource rebuild is only visible on the next poll, so this is the worst-case
// delay before a query notices that its resource was replaced.
const POLL_INTERVAL_MS = 1000;

const queryClient = useQueryClient();
const publisher = useResourceGenerationsPublisher();

const { query } = useMachineStatus(() => partID, {
  refetchInterval: POLL_INTERVAL_MS,
});

const generations = $derived(
  resourceGenerationsFromStatus(query.data?.resources ?? [])
);

$effect(() => {
  publisher?.publish(partID, generations);
});

$effect(() => {
  const watched = partID;
  return () => publisher?.withdraw(watched);
});

const invalidated = new Map<string, string>();

$effect(() => {
  for (const [name, { generation, canQuery }] of Object.entries(generations)) {
    if (!generation || !canQuery) {
      continue;
    }

    const previous = invalidated.get(name);
    invalidated.set(name, generation);

    if (previous === undefined || previous === generation) {
      continue;
    }

    // Invalidating rather than refetching marks entries with no live observer
    // stale too, so a query mounted after the rebuild cannot serve the previous
    // instance's response even under `staleTime: Infinity`.
    queryClient.invalidateQueries({
      queryKey: resourceQueryKeyPrefix(partID, name),
    });

    // A camera's track is held outside the query cache, so invalidation cannot
    // reach it.
    void refreshSharedStream(partID, name, generation);
  }
});
</script>
