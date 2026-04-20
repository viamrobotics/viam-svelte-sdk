<script lang="ts">
import type { Snippet } from 'svelte';
import type { DialConf } from '@viamrobotics/sdk';
import { provideRobotClientsContext } from '$lib/hooks/robot-clients.svelte';
import type { PartID } from '$lib/part';

interface Props {
  dialConfigs: Record<PartID, DialConf>;
  children: Snippet;
}

let { dialConfigs, children }: Props = $props();

provideRobotClientsContext(() => dialConfigs);
</script>

{@render children()}
