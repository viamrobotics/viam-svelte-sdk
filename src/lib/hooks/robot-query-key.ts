import type { PartID } from '../part';

/**
 * Key for a query against the robot client itself rather than one resource.
 *
 * A late-registering resource invalidates by this key, so it has to stay in
 * step with the keys `createRobotQuery` builds from it.
 */
export const robotQueryKey = (partID: PartID, methodName: string) => [
  'viam-svelte-sdk',
  'partID',
  partID,
  'robotClient',
  methodName,
];
