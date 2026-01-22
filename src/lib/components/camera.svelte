<script lang="ts">
import { createResourceClient, createResourceQuery } from '$lib';
import { CameraClient } from '@viamrobotics/sdk';
import type { HTMLImgAttributes } from 'svelte/elements';

interface Props extends HTMLImgAttributes {
  partID: string;
  name: string;
  refetchInterval?: number;
  mimeType?: string;
}

let {
  partID,
  name,
  refetchInterval = 1000,
  width = '200',
  mimeType = 'image/png',
  ...rest
}: Props = $props();

const cameraClient = createResourceClient(
  CameraClient,
  () => partID,
  () => name
);

const query = createResourceQuery(cameraClient, 'getImages', () => ({
  refetchInterval,
}));

const src = $derived.by(() => {
  if (!query.data) {
    return undefined;
  }

  if (query.data.images.length === 0) {
    return undefined;
  }

  const [image] = query.data.images;
  if (!image) {
    return undefined;
  }

  return URL.createObjectURL(
    new Blob([image.image as Uint8Array<ArrayBuffer>], {
      type: image.mimeType,
    })
  );
});
</script>

{#if query.error}
  {query.error.message}
{:else}
  <img
    {src}
    {width}
    {...rest}
  />
{/if}
