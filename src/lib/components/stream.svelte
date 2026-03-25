<script lang="ts">
import { createStreamClient } from '$lib';
import type { HTMLVideoAttributes } from 'svelte/elements';

interface Props extends HTMLVideoAttributes {
  partID: string;
  name: string;
}

let { partID, name, ...rest }: Props = $props();

let element = $state.raw<HTMLVideoElement>();

const client = createStreamClient(
  () => partID,
  () => name
);

$effect(() => {
  if (element) {
    element.srcObject = client.mediaStream;
  }
});

$effect(() => {
  const [firstResolution] = client.resolutions ?? [];

  if (firstResolution) {
    client.setResolution(firstResolution);
  }
});
</script>

<video
  muted
  autoplay
  controls={false}
  playsinline
  bind:this={element}
  {...rest}
></video>
