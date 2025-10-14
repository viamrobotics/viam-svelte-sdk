<script>
import { useResourceNames } from '$lib';
import Base from './base.svelte';

let { partID } = $props();

const bases = useResourceNames(() => partID, 'base');
$inspect(bases);
</script>

{#each bases.current as base}
  <Base
    name={base.name}
    {partID}
  />
{/each}
