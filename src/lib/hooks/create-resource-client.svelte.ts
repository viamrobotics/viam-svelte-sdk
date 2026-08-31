import {
  type Resource,
  type RobotClient,
  MachineConnectionEvent,
} from '@viamrobotics/sdk';

import { useConnectionStatus, useRobotClient } from './robot-clients.svelte';
import { useResourceGeneration } from './resource-generation.svelte';

type Client<T> = new (part: RobotClient, name: string) => T;

export interface ResourceClientContext<T> {
  readonly current: T | undefined;

  /**
   * The part and resource addressed, defined even while disconnected. Query keys
   * use these, so a dropped client cannot re-key a query onto an empty entry.
   */
  readonly partID: string;

  readonly name: string;
  /**
   * Identifies the server-side instance behind `name`, completing the identity
   * the pair above cannot express on its own. See {@link useResourceGeneration}.
   *
   * Optional so a hand-built context still satisfies the interface. A context
   * omitting it opts out of instance tracking, and its queries keep serving a
   * replaced instance's cached responses.
   */
  readonly generation?: string | undefined;

  /** Whether the server reports the resource as ready. Optional, as above. */
  readonly isReady?: boolean | undefined;
}

export const createResourceClient = <T extends Resource>(
  client: Client<T>,
  partID: () => string,
  resourceName: () => string
): ResourceClientContext<T> => {
  const robotClient = useRobotClient(partID);
  const connectionStatus = useConnectionStatus(partID);
  const generation = useResourceGeneration(partID, resourceName);

  const resourceClient = $derived.by<T | undefined>(() => {
    if (!robotClient.current) {
      return;
    }

    if (connectionStatus.current !== MachineConnectionEvent.CONNECTED) {
      return;
    }

    return new client(robotClient.current, resourceName());
  });

  return {
    get current() {
      return resourceClient;
    },
    get partID() {
      return partID();
    },
    get name() {
      return resourceName();
    },
    get generation() {
      return generation.current;
    },
    get isReady() {
      return generation.isReady;
    },
  };
};
