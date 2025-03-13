<script lang="ts">
  import { useConnectionStatus, useResourceNames, useRobotClient } from '$lib';
  import { partID1, partID2 } from './configs';

  let partID = $state(partID1);

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
  <button
    class="border p-2"
    class:bg-blue-100={partID === partID1}
    onclick={() => (partID = partID1)}
  >
    fleet 1
  </button>
  <button
    class="border p-2"
    class:bg-blue-100={partID === partID2}
    onclick={() => (partID = partID2)}
  >
    fleet 2
  </button>

  {status.current}

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
