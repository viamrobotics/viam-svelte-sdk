<script lang="ts">
import { PersistedState } from 'runed';
import {
  useConnectionStatus,
  useResourceNames,
  CameraImage,
  CameraStream,
} from '$lib';
import { dialConfigs } from '../configs';
import Base from './base.svelte';
import Version from './version.svelte';

const partIDs = Object.keys(dialConfigs);

let partID = new PersistedState('selected-partID', partIDs[0] ?? '');

const status = useConnectionStatus(() => partID.current);
const resources = useResourceNames(() => partID.current);
const cameras = useResourceNames(() => partID.current, 'camera');
const bases = useResourceNames(() => partID.current, 'base');

let streaming = true;
</script>

<section class="p-4">
  <div class="flex items-center gap-2">
    {#each partIDs as id, index (id)}
      <button
        class="border p-2"
        class:bg-blue-100={partID.current === id}
        onclick={() => (partID.current = id)}
      >
        part {index + 1}
      </button>
    {/each}

    {status.current}
  </div>

  <Version {partID} />

  <h2 class="py-2">Resources</h2>
  {#if resources.error}
    Error fetching: {resources.error.message}
  {:else if resources.pending}
    <ul class="text-xs">Fetching...</ul>
  {:else if !resources.pending && resources.current.length === 0}
    No resources
  {:else}
    <ul class="text-xs">
      {#each resources.current as resource (resource.name)}
        <li>{resource.name}</li>
      {/each}
    </ul>
  {/if}

  {#each bases.current as { name } (name)}
    <Base
      {name}
      partID={partID.current}
    />
  {/each}

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
