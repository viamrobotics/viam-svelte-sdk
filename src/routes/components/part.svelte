<script>
import { useResourceNames } from '$lib';
import Base from './base.svelte';
import Switch from './switch.svelte';

let { partID } = $props();

const bases = useResourceNames(() => partID, 'base');
const switches = useResourceNames(() => partID, 'switch');
</script>

{#each bases.current as base (base.name)}
  <Base
    name={base.name}
    {partID}
  />
{/each}

{#each switches.current as s (s.name)}
  <Switch
    name={s.name}
    {partID}
  />
{/each}
