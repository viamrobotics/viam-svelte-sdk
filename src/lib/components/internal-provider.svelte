<script lang="ts">
import type { Snippet } from 'svelte';
import type { DialConf } from '@viamrobotics/sdk';
import {
  provideRobotClientsContext,
  type RobotClientsOptions,
} from '$lib/hooks/robot-clients.svelte';

interface Props {
  dialConfigs: Record<string, DialConf>;
  options?: RobotClientsOptions | undefined;
  children: Snippet;
}

let { dialConfigs, options, children }: Props = $props();

provideRobotClientsContext(
  () => dialConfigs,
  () => options
);
</script>

{@render children()}
