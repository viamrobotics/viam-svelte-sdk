<script lang="ts">
import type { Snippet } from 'svelte';
import type { DialConf } from '@viamrobotics/sdk';
import { provideRobotClientsContext } from '$lib/hooks/robot-clients.svelte';

interface Props {
  dialConfigs: Record<string, DialConf>;
  children: Snippet;
}

let { dialConfigs, children }: Props = $props();

provideRobotClientsContext(() => dialConfigs);
</script>

{@render children()}
