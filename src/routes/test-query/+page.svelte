<script lang="ts">
import {
  createResourceClient,
  createResourceQuery,
  useResourceNames,
} from '$lib';
import { CameraClient } from '@viamrobotics/sdk';
import { dialConfigs } from '../configs';

const partIDs = Object.keys(dialConfigs);
let partID = $state(partIDs[0] ?? '');

const cameras = useResourceNames(() => partID, 'camera');
const cameraName = $derived(cameras.current[0]?.name ?? '');

const cameraClient = createResourceClient(
  CameraClient,
  () => partID,
  () => cameraName
);

let enabled = $state(true);
let refetchInterval = $state<number>(1000);
let refetchBackground = $state(false);

const query = createResourceQuery(cameraClient, 'getImages', () => ({
  refetchInterval,
  refetchIntervalInBackground: refetchBackground,
  enabled,
}));

const src = $derived.by(() => {
  if (!query.data) return undefined;
  if (query.data.images.length === 0) return undefined;
  const [image] = query.data.images;
  if (!image) return undefined;
  return URL.createObjectURL(
    new Blob([image.image as Uint8Array<ArrayBuffer>], {
      type: image.mimeType,
    })
  );
});
</script>

<div class="mx-auto max-w-xl space-y-6 p-8">
  <h1 class="text-2xl font-bold">createResourceQuery Reactivity Test</h1>

  <div class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
    <h2 class="mb-2 text-lg font-semibold">Connection</h2>
    <p>Part: <code>{partID}</code></p>
    <p>Camera: <code>{cameraName || '(none found)'}</code></p>
    <p>Enabled: <code>{enabled}</code></p>
  </div>

  <div class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
    <h2 class="mb-2 text-lg font-semibold">Query State</h2>
    <p>Status: <code>{query.status}</code></p>
    <p>Fetch status: <code>{query.fetchStatus}</code></p>
    <p>Error: <code>{query.error?.message ?? 'none'}</code></p>
    <p>Has data: <code>{!!query.data}</code></p>
    <p>In background: <code>{refetchBackground}</code></p>
  </div>

  <div class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
    <h2 class="mb-2 text-lg font-semibold">Polling Controls</h2>
    <p class="mb-3">Current interval: <code>{refetchInterval}</code></p>
    <div class="flex gap-2">
      <button
        class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
        onclick={() => {
          refetchInterval = refetchInterval === 1000 ? 2000 : 1000;
        }}
      >
        Toggle 1s/2s
      </button>
      <button
        class="rounded bg-cyan-600 px-3 py-1.5 text-sm text-white hover:bg-cyan-700"
        onclick={() => {
          refetchBackground = !refetchBackground;
        }}
      >
        Toggle Background
      </button>
      <button
        class="rounded bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
        onclick={() => {
          enabled = false;
        }}
      >
        Disable
      </button>
      <button
        class="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
        onclick={() => {
          enabled = true;
        }}
      >
        Enable
      </button>
    </div>
  </div>

  <div class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
    <h2 class="mb-2 text-lg font-semibold">Camera Image</h2>
    {#if query.error}
      <p class="text-red-600">{query.error.message}</p>
    {:else if src}
      <img
        {src}
        width="400"
        alt="camera"
      />
    {:else}
      <p class="text-neutral-400">Waiting for image data...</p>
    {/if}
  </div>
</div>
