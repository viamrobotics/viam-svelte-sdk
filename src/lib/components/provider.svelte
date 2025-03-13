<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { DialConf } from '@viamrobotics/sdk';
  import { provideRobotClientsContext } from '$lib/robot-clients.svelte';
  import { provideResourceNamesContext } from '$lib/hooks/resource-names.svelte';

  interface Props {
    dialConfigs: Record<string, DialConf>;
    children: Snippet;
  }

  let { dialConfigs, children }: Props = $props();

  provideRobotClientsContext(() => dialConfigs);
  provideResourceNamesContext();
</script>

{@render children()}
