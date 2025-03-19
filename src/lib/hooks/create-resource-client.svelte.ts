import type { Resource, RobotClient } from '@viamrobotics/sdk';

import { useRobotClient } from './robot-clients.svelte';

export type Client<T> = new (part: RobotClient, name: string) => T;

export const provideResourceClients = () => {};

export const createResourceClient = <T extends Resource>(
  client: Client<T>,
  partID: () => string,
  resourceName: () => string
): { current: T | undefined } => {
  const robotClient = useRobotClient(partID);

  const resourceClient = $derived.by<T | undefined>(() => {
    if (!robotClient.current) {
      return;
    }
    const nextClient = new client(robotClient.current, resourceName());
    (nextClient as T & { uuid: string }).uuid = `${partID()}-${resourceName()}`;

    return nextClient;
  });

  return {
    get current() {
      return resourceClient;
    },
  };
};
