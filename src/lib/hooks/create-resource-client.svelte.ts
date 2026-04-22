import {
  type Resource,
  type RobotClient,
  MachineConnectionEvent,
} from '@viamrobotics/sdk';

import { useRobotConnection } from './robot-clients.svelte';

type Client<T> = new (part: RobotClient, name: string) => T;

export const createResourceClient = <T extends Resource>(
  client: Client<T>,
  partID: () => string,
  resourceName: () => string
): { current: T | undefined } => {
  const robotConnection = useRobotConnection(partID);

  const resourceClient = $derived.by<T | undefined>(() => {
    if (!robotConnection.current) {
      return;
    }

    if (robotConnection.connectionStatus !== MachineConnectionEvent.CONNECTED) {
      return;
    }

    const nextClient = new client(robotConnection.current, resourceName());

    // PartIDs are used to invalidate queries for this client
    (nextClient as T & { partID: string }).partID = partID();

    return nextClient;
  });

  return {
    get current() {
      return resourceClient;
    },
  };
};
