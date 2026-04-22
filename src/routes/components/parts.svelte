<script lang="ts">
import { PersistedState } from 'runed';
import { useResourceNames, CameraImage, CameraStream } from '$lib';
import { dialConfigs } from '../configs';
import Part from './part.svelte';
import Version from './version.svelte';
import { useRobotConnection } from '$lib/hooks/robot-clients.svelte';

const partIDs = Object.keys(dialConfigs);
let partID = new PersistedState('selected-partID', partIDs[0] ?? '');

const robotConnection = useRobotConnection(() => partID.current);
const resources = useResourceNames(() => partID.current);
const cameras = useResourceNames(() => partID.current, 'camera');

const reconnect = () => {
  robotConnection.connect(dialConfigs[partID.current]!);
};

let streaming = true;
</script>

<section class="p-4">
  <div class="flex items-center gap-2">
    {#each partIDs as id, index (id)}
      <button
        class="border p-2"
        class:bg-blue-100={partID.current === id}
        onclick={() => {
          partID.current = id;
        }}
      >
        part {index + 1}
      </button>

      <button
        class="border border-red-300 bg-red-100 p-2 text-red-800"
        onclick={robotConnection.disconnect}>Disconnect</button
      >
      <button
        class="border border-yellow-300 bg-yellow-100 p-2 text-yellow-800"
        onclick={reconnect}>Reconnect</button
      >

      {#if id === partID.current}
        <Version partID={id} />

        <Part partID={id} />
      {/if}
    {/each}

    {robotConnection.connectionStatus}
  </div>

  <h2 class="py-2">Resources</h2>
  {#if resources.query?.error}
    Error fetching: {resources.query.error.message}
  {:else if resources.query?.isPending}
    <ul class="text-xs">Fetching...</ul>
  {:else if !resources.query?.isPending && resources.current.length === 0}
    No resources
  {:else}
    <ul class="text-xs">
      {#each resources.current as resource (resource.name)}
        <li>{resource.name}: {resource.subtype}</li>
      {/each}
    </ul>
  {/if}

  {#each cameras.current as { name } (name)}
    {#if streaming}
      <CameraStream
        {name}
        partID={partID.current}
      />
    {:else}
      <CameraImage
        {name}
        partID={partID.current}
      />
    {/if}
  {/each}
</section>
