<script lang="ts">
import type { DialConf } from '@viamrobotics/sdk';
import { provideRobotClientsContext } from '../../robot-clients.svelte';

interface Props {
  dialConfigs: Record<string, DialConf>;
}

let { dialConfigs }: Props = $props();

provideRobotClientsContext(() => dialConfigs);
</script>

<div data-testid="content">rendered</div>
