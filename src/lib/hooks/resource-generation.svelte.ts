import type { robotApi } from '@viamrobotics/sdk';

import { usePolledMachineStatus } from './polled-machine-status.svelte';
import type { PartID } from '../part';

/**
 * @todo(mp) Expose `ResourceStatus_State` in the ts-sdk and remove.
 * Mirrors `viam.robot.v1.ResourceStatus.State.STATE_READY`.
 */
const STATE_READY = 3;

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
   * Whether the server reports every resource matching the name as ready.
   * False while one is being configured, removed, or is unhealthy.
   *
   * True while no status has been observed, so a caller gating on this does
   * not wait a `getMachineStatus` round trip before its first fetch.
   */
  readonly isReady: boolean;
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
  const isReady = $derived(
    matching.every((status) => status.state === STATE_READY)
  );

  return {
    get current() {
      return current;
    },
    get isReady() {
      return isReady;
    },
  };
};
