import { useRobotClient } from './robot-clients.svelte';
import { createRobotQuery } from './create-robot-query.svelte';
import type { PartID } from '../part';

// A resource rebuild is only visible on the next poll, so this is the worst-case
// delay before a query stops serving the replaced instance's cached response.
const POLL_INTERVAL_MS = 1000;

/**
 * Polls `getMachineStatus` for a part.
 */
export const usePolledMachineStatus = (partID: () => PartID) => {
  const client = useRobotClient(partID);

  return createRobotQuery(client, 'getMachineStatus', {
    refetchInterval: POLL_INTERVAL_MS,
  });
};
