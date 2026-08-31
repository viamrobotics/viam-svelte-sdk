import {
  type Resource,
  type RobotClient,
  MachineConnectionEvent,
} from '@viamrobotics/sdk';

import { useConnectionStatus, useRobotClient } from './robot-clients.svelte';

type Client<T> = new (part: RobotClient, name: string) => T;

export interface ResourceClientContext<T> {
  readonly current: T | undefined;
  /**
   * The part and resource addressed, defined even while disconnected. Query keys
   * use these, so a dropped client cannot re-key a query onto an empty entry.
   */
  readonly partID: string;
  readonly name: string;
}

export const createResourceClient = <T extends Resource>(
  client: Client<T>,
  partID: () => string,
  resourceName: () => string
): ResourceClientContext<T> => {
  const robotClient = useRobotClient(partID);
  const connectionStatus = useConnectionStatus(partID);

  const resourceClient = $derived.by<T | undefined>(() => {
    if (!robotClient.current) {
      return;
    }

    if (connectionStatus.current !== MachineConnectionEvent.CONNECTED) {
      return;
    }

    const nextClient = new client(robotClient.current, resourceName());

    // PartIDs are used to invalidate queries for this client
    (nextClient as T & { partID: string }).partID = partID();

    return nextClient;
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
  };
};
