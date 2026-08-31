import type { robotApi } from '@viamrobotics/sdk';

import { usePolledMachineStatus } from './polled-machine-status.svelte';
import type { PartID } from '../part';

/**
 * @todo(mp) Expose `ResourceStatus_State` in the ts-sdk and remove.
 * Mirrors `viam.robot.v1.ResourceStatus.State`.
 */
const STATE_UNCONFIGURED = 1;
const STATE_CONFIGURING = 2;
const STATE_REMOVING = 4;

/**
 * States the resource leaves on its own, either by becoming ready or by going
 * away. `STATE_UNHEALTHY` is deliberately absent: an unhealthy resource cannot
 * serve a request either, since `GraphNode.Resource` returns its error instead
 * of the instance, but it can stay that way indefinitely. Holding a query for
 * it would report loading forever, where letting it run surfaces the server's
 * actual error.
 */
const TRANSIENT_STATES = new Set([
  STATE_UNCONFIGURED,
  STATE_CONFIGURING,
  STATE_REMOVING,
]);

export interface ResourceGenerationContext {
  /**
   * Identifies the server-side instance currently behind a resource name, and
   * changes whenever that instance is replaced.
   *
   * Derived from each matching resource's `lastUpdated` state-transition timestamp.
   *
   * Empty while no status has been observed for the name.
   */
  readonly current: string;

  /**
   * Whether a request to the resource is worth making.
   *
   * False only while a matching resource sits in a state it leaves on its own:
   * unconfigured, configuring, or being removed. A rebuild passes through
   * `CONFIGURING`, which moves the generation before the resource can answer,
   * so a caller that fetches on a generation change needs this to avoid a
   * request that is guaranteed to fail.
   *
   * True when unhealthy, which the resource can stay indefinitely. The server
   * returns a real error for it, and that beats reporting loading forever.
   *
   * True while no status has been observed, so a caller gating on this does
   * not wait a `getMachineStatus` round trip before its first fetch.
   */
  readonly canQuery: boolean;
}

/**
 * Folds every status matching a name into one comparable token, so a change to
 * any of them registers. The addressed name can resolve to more than one
 * resource when subtypes collide, and the caller holds only the name.
 */
const foldGeneration = (statuses: robotApi.ResourceStatus[]): string =>
  statuses
    .map(({ name, lastUpdated }) => {
      const seconds = lastUpdated?.seconds ?? 0n;
      const nanos = lastUpdated?.nanos ?? 0;
      return `${name?.subtype ?? ''}:${seconds}.${nanos}`;
    })
    .toSorted()
    .join('|');

/**
 * Tracks the server-side instance behind a resource name, so a caller can
 * re-key a cache or re-subscribe a stream when that instance is replaced.
 *
 * @param partID The part the resource lives on.
 * @param resourceName The resource's short name, as passed to `createResourceClient`.
 */
export const useResourceGeneration = (
  partID: () => PartID,
  resourceName: () => string
): ResourceGenerationContext => {
  const machineStatus = usePolledMachineStatus(partID);

  const matching = $derived(
    machineStatus.data?.resources.filter(
      (status) => status.name?.name === resourceName()
    ) ?? []
  );

  const current = $derived(matching.length > 0 ? foldGeneration(matching) : '');
  const canQuery = $derived(
    !matching.some((status) => TRANSIENT_STATES.has(status.state))
  );

  return {
    get current() {
      return current;
    },
    get canQuery() {
      return canQuery;
    },
  };
};
