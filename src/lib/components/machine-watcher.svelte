<script lang="ts">
import { useQueryClient } from '@tanstack/svelte-query';

import { useMachineStatus } from '$lib/hooks/machine-status.svelte';
import { useResourceGenerationsPublisher } from '$lib/hooks/resource-generation.svelte';
import { resourceGenerationsFromStatus } from '$lib/hooks/resource-generations-from-status';
import { resourceQueryKeyPrefix } from '$lib/hooks/resource-query-key';
import { robotQueryKey } from '$lib/hooks/robot-query-key';
import {
  STATE_REMOVING,
  STATE_UNCONFIGURED,
} from '$lib/hooks/resource-status-state';
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

// `resourceNames` lists only what `HasResource` accepts, so an unconfigured,
// removing, or errored node is in the status but not in the list. Mirroring that
// is what lets a resource becoming ready register as a change. Full identity, so
// a new subtype under an existing name counts too.
const listedResources = $derived(
  (query.data?.resources ?? [])
    .filter(
      ({ state, error }) =>
        state !== STATE_UNCONFIGURED && state !== STATE_REMOVING && !error
    )
    .map(
      ({ name }) =>
        `${name?.namespace ?? ''}/${name?.type ?? ''}/${name?.subtype ?? ''}/${name?.name ?? ''}`
    )
    .toSorted()
    .join('|')
);

let lastListed: string | undefined;

// `resourceNames` never refetches on its own, so a remote or module that
// registers after the machine reports running would be invisible until reload.
$effect(() => {
  if (!query.data || listedResources === lastListed) {
    return;
  }

  lastListed = listedResources;

  queryClient.invalidateQueries({
    queryKey: robotQueryKey(partID, 'resourceNames'),
  });
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
