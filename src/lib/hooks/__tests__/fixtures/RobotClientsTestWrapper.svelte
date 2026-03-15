<script lang="ts">
import type { DialConf } from '@viamrobotics/sdk';
import type { PartID } from '../../../part';
import { provideRobotClientsContext } from '../../robot-clients.svelte';

interface Props {
  dialConfigs: () => Record<PartID, DialConf>;
}

let { dialConfigs }: Props = $props();

provideRobotClientsContext(dialConfigs);
</script>

<div data-testid="wrapper">mounted</div>
