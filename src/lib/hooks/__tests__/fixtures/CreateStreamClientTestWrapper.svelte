<script lang="ts">
import { createStreamClient } from '../../create-stream-client.svelte';

interface Props {
  partID: string;
  resourceName: string;
}

let { partID, resourceName }: Props = $props();

const stream = createStreamClient(
  () => partID,
  () => resourceName
);
</script>

<div data-testid="stream-wrapper">
  {stream.mediaStream ? 'has-stream' : 'no-stream'}
  {stream.error ? `error:${stream.error.message}` : ''}
</div>
