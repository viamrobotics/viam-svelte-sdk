<script lang="ts">
import { useResourceGeneration } from '../../resource-generation.svelte';

interface Props {
  resourceName: string;
}

let { resourceName }: Props = $props();

const generation = useResourceGeneration(
  () => 'part-1',
  () => resourceName
);
</script>

<div data-testid="generation">{generation.current}</div>
<div data-testid="can-query">{String(generation.canQuery)}</div>
