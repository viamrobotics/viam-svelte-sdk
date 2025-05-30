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

const query = createResourceQuery(cameraClient, 'getImage', () => ({
  refetchInterval,
}));

const src = $derived(
  query.current.data
    ? URL.createObjectURL(new Blob([query.current.data], { type: mimeType }))
    : undefined
);
</script>

{#if query.current.error}
  {query.current.error.message}
{:else}
  <img
    {src}
    {width}
    {...rest}
  />
{/if}
