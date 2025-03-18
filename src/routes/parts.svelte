<script lang="ts">
import { useConnectionStatus, useResourceNames, useRobotClient } from '$lib';
import { dialConfigs } from './configs';

const partIDs = Object.keys(dialConfigs);

let partID = $state(partIDs[0] ?? '');

const status = useConnectionStatus(() => partID);
const client = useRobotClient(() => partID);
const resources = useResourceNames(() => partID);

$effect(() => {
  client.current?.robotService.frameSystemConfig({}).then((response) => {
    console.log(response);
  });
  client.current?.getMachineStatus().then((response) => {
    console.log(response);
  });
});
</script>

<section class="p-4">
  <div class="flex items-center gap-2">
    {#each partIDs as id, index}
      <button
        class="border p-2"
        class:bg-blue-100={partID === id}
        onclick={() => (partID = id)}
      >
        part {index + 1}
      </button>
    {/each}

    {status.current}
  </div>

  <h2 class="py-2">Resources</h2>
  {#if resources.error}
    Error fetching: {resources.error.message}
  {:else if resources.fetching}
    <ul class="text-xs">Fetching...</ul>
  {:else}
    <ul class="text-xs">
      {#each resources.current as resource (resource.name)}
        <li>{resource.name}</li>
      {/each}
    </ul>
  {/if}
</section>
