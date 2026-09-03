import type { PartID } from '../part';

/**
 * Prefix shared by every query against the robot client itself.
 *
 * A config revision change invalidates by this prefix, so it has to stay in
 * step with the keys `createRobotQuery` builds from it.
 */
export const robotQueryKeyPrefix = (partID: PartID) => [
  'viam-svelte-sdk',
  'partID',
  partID,
  'robotClient',
];

/**
 * Key for a query against the robot client itself rather than one resource.
 *
 * A late-registering resource invalidates by this key, so it has to stay in
 * step with the keys `createRobotQuery` builds from it.
 */
export const robotQueryKey = (partID: PartID, methodName: string) => [
  ...robotQueryKeyPrefix(partID),
  methodName,
];
