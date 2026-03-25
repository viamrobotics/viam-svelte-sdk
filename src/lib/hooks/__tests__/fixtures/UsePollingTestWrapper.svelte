<!--
@component
Test wrapper component for usePolling hook.
Provides reactive props to test dependency changes.
-->
<script lang="ts">
import { usePolling } from '../../use-polling.svelte';

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

<div data-testid="polling-wrapper">Polling active</div>
