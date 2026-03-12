<script lang="ts">
import { SwitchClient } from '@viamrobotics/sdk';
import { createResourceClient, createResourceQuery } from '$lib';
import { createResourceMutation } from '$lib/hooks/create-resource-mutation.svelte';

interface Props {
  partID: string;
  name: string;
}

const { partID, name }: Props = $props();

const client = createResourceClient(
  SwitchClient,
  () => partID,
  () => name
);

const positionQuery = createResourceQuery(client, 'getPosition', {
  refetchInterval: 500,
});

const numPositionsQuery = createResourceQuery(client, 'getNumberOfPositions', {
  refetchInterval: 500,
});

const setPositionMutation = createResourceMutation(
  client,
  'setPosition',
  () => positionQuery.queryKey
);

const onSelect = async (position: number) => {
  console.warn('selecting position', position);
  await setPositionMutation.mutateAsync([position]);
  console.warn('position query data', positionQuery.data);
  console.warn('refetching position query...');
  await positionQuery.refetch();
};
</script>

{#if positionQuery.data !== undefined && numPositionsQuery.data !== undefined}
  <div
    class="rounded-lg border border-neutral-200 bg-neutral-50 p-4 shadow-sm dark:border-neutral-700 dark:bg-neutral-800/50"
  >
    <p class="mb-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
      Current position: <span
        class="font-semibold text-neutral-900 dark:text-white"
        >{numPositionsQuery.data[1][positionQuery.data]}</span
      >
    </p>
    <div class="flex flex-wrap gap-2">
      {#each numPositionsQuery.data[1] as label, index (index)}
        <button
          class="rounded-md border px-3 py-2 text-sm font-medium transition-colors focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 focus:outline-none dark:focus:ring-neutral-500 dark:focus:ring-offset-neutral-900 {positionQuery.data ===
          index
            ? 'border-neutral-400 bg-neutral-200 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-600 dark:text-white'
            : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600'}"
          onclick={() => onSelect(index)}
        >
          {label}
        </button>
      {/each}
    </div>
  </div>
{/if}
