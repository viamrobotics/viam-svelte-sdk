<script>
import { useResourceNames } from '$lib';
import Base from './base.svelte';

let { partID } = $props();

const bases = useResourceNames(() => partID, 'base');
</script>

{#each bases.current as base (base.name)}
  <Base
    name={base.name}
    {partID}
  />
{/each}
