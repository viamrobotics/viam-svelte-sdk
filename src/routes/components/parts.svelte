<script lang="ts">
import { PersistedState } from 'runed';
import { useResourceNames, CameraImage, CameraStream } from '$lib';
import {
  dialConfigs as configsStore,
  isEnvConfig,
  removeUserConfig,
} from '../configs.svelte';
import Part from './part.svelte';
import Version from './version.svelte';
import ConnectionConfigForm from './connection-config-form.svelte';
import { useRobotConnection } from '$lib/hooks/robot-clients.svelte';

const dialConfigs = $derived(configsStore.current);
const partIDs = $derived(Object.keys(dialConfigs));

let partID = new PersistedState('selected-partID', '');

$effect(() => {
  if (!partID.current && partIDs.length > 0) {
    partID.current = partIDs[0]!;
  }
});

const robotConnection = useRobotConnection(() => partID.current);
const resources = useResourceNames(() => partID.current);
const cameras = useResourceNames(() => partID.current, 'camera');

const reconnect = () => {
  const config = dialConfigs[partID.current];
  if (config) {
    robotConnection.connect(config);
  }
};

let streaming = true;
</script>

<section class="flex flex-col gap-4 p-4">
  <ConnectionConfigForm
    onadd={(id) => {
      partID.current = id;
    }}
  />

  {#if partIDs.length === 0}
    <p class="text-sm text-gray-600">
      No machine configs yet. Add one above or set <code>VITE_CONFIGS</code> in
      your <code>.env</code>.
    </p>
  {:else}
    <div class="flex flex-wrap items-center gap-2">
      {#each partIDs as id, index (id)}
        <button
          class="border p-2"
          class:bg-blue-100={partID.current === id}
          onclick={() => {
            partID.current = id;
          }}
        >
          part {index + 1} ({id})
        </button>

        {#if !isEnvConfig(id)}
          <button
            class="border border-gray-300 p-2 text-xs text-gray-700 hover:bg-gray-100"
            onclick={() => {
              removeUserConfig(id);
              if (partID.current === id) {
                partID.current = partIDs.find((p) => p !== id) ?? '';
              }
            }}>Remove</button
          >
        {/if}
      {/each}

      <button
        class="border border-red-300 bg-red-100 p-2 text-red-800"
        onclick={robotConnection.disconnect}>Disconnect</button
      >
      <button
        class="border border-yellow-300 bg-yellow-100 p-2 text-yellow-800"
        onclick={reconnect}>Reconnect</button
      >

      <span class="text-sm">{robotConnection.connectionStatus}</span>
    </div>

    {#if partID.current}
      <Version partID={partID.current} />
      <Part partID={partID.current} />
    {/if}

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
  {/if}
</section>
