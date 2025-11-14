<script lang="ts">
import { usePolling } from '../use-polling.svelte';

interface Props {
  queryKey: unknown[];
  interval: number | false;
}

let { queryKey, interval }: Props = $props();

usePolling(
  () => queryKey,
  () => interval
);
</script>
