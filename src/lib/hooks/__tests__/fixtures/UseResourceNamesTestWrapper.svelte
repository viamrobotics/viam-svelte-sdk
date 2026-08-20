<script lang="ts">
import { useResourceNames } from '../../resource-names.svelte';

interface Props {
  enabled?: boolean;
}

let { enabled }: Props = $props();

useResourceNames(
  () => 'part-1',
  undefined,
  () => (enabled === undefined ? {} : { enabled })
);
</script>

<div data-testid="resource-names-wrapper">mounted</div>
