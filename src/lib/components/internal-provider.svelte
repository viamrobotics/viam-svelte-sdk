<script lang="ts">
import type { Snippet } from 'svelte';
import type { DialConf } from '@viamrobotics/sdk';
import {
  provideRobotClientsContext,
  usePartIDs,
  type RobotClientsOptions,
} from '$lib/hooks/robot-clients.svelte';
import { provideResourceGenerations } from '$lib/hooks/resource-generation.svelte';
import MachineWatcher from './machine-watcher.svelte';

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
provideResourceGenerations();

const partIDs = usePartIDs();
</script>

{#each partIDs.current as partID (partID)}
  <MachineWatcher {partID} />
{/each}

{@render children()}
