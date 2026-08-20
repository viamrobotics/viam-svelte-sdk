<script lang="ts">
import type { AppClient } from '@viamrobotics/sdk';
import {
  useConnectionStatus,
  useHasViamProvider,
  useRobotClient,
  useRobotConnection,
} from '../../robot-clients.svelte';
import { createRobotQuery } from '../../create-robot-query.svelte';
import { useResourceNames } from '../../resource-names.svelte';
import { createAppQuery } from '../../app/create-app-query.svelte';

interface Props {
  onhooks: (hooks: {
    hasProvider: boolean;
    robotClient: ReturnType<typeof useRobotClient>;
    connectionStatus: ReturnType<typeof useConnectionStatus>;
    robotConnection: ReturnType<typeof useRobotConnection>;
    robotQuery: ReturnType<typeof createRobotQuery>;
    robotQueryForceEnabled: ReturnType<typeof createRobotQuery>;
    resourceNames: ReturnType<typeof useResourceNames>;
    appQuery: ReturnType<typeof createAppQuery>;
  }) => void;
}

let { onhooks }: Props = $props();

const partID = () => 'part-1';
const client = useRobotClient(partID);

// eslint-disable-next-line svelte/no-unused-svelte-ignore
// svelte-ignore state_referenced_locally - intentional, reported once at init
onhooks({
  hasProvider: useHasViamProvider(),
  robotClient: client,
  connectionStatus: useConnectionStatus(partID),
  robotConnection: useRobotConnection(partID),
  robotQuery: createRobotQuery(client, 'resourceNames'),
  robotQueryForceEnabled: createRobotQuery(client, 'resourceNames', () => ({
    enabled: true,
  })),
  resourceNames: useResourceNames(partID),
  appQuery: createAppQuery<AppClient, 'getRobotPart'>('getRobotPart'),
});
</script>

<div data-testid="provider-optional-wrapper">mounted</div>
