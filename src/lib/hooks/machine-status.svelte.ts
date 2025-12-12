import { useRobotClient } from './robot-clients.svelte';
import type { PartID } from '$lib/part';
import type { PlainMessage, robotApi } from '@viamrobotics/sdk';
import {
  createRobotQuery,
  type QueryOptions,
} from './create-robot-query.svelte';

type MachineStatus = PlainMessage<robotApi.GetMachineStatusResponse>;

// TODO: move to ts-sdk
export type ResourceStatus = PlainMessage<robotApi.ResourceStatus>;

/**
 * sorts machine status resources by local/remote -> type -> name (alphabetical)
 * to produce a list like:
 *
 * component a
 * component z
 * service   b
 * component remote:c
 * service   remote:b
 * @param machineStatus
 */
const sortResourceStatuses = (machineStatus: MachineStatus) => {
  const resources = machineStatus.resources.toSorted(
    ({ name }, { name: otherName }) => {
      if (name === undefined && otherName === undefined) {
        return 0;
      }

      if (name === undefined) {
        return -1;
      }

      if (otherName === undefined) {
        return 1;
      }

      const { name: aName, type: aType, subtype: aSubtype } = name;
      const { name: bName, type: bType, subtype: bSubtype } = otherName;

      // sort all non-remote resources before remote resources
      if (aName.includes(':') !== bName.includes(':')) {
        return aName.includes(':') ? 1 : -1;
      }

      if (aName === bName && aType === bType) {
        return aSubtype.localeCompare(bSubtype);
      }

      if (aName === bName) {
        return aType.localeCompare(bType);
      }

      // sort alphabetically within type
      // sort components before services
      return aType === bType
        ? aName.localeCompare(bName)
        : aType.localeCompare(bType);
    }
  );

  return {
    ...machineStatus,
    resources,
  };
};

export const useMachineStatus = (
  partID: () => PartID,
  options?: (() => QueryOptions) | QueryOptions
) => {
  const client = useRobotClient(partID);
  const query = createRobotQuery(client, 'getMachineStatus', options);

  const current = $derived(
    query.data ? sortResourceStatuses(query.data) : undefined
  );

  return {
    get current() {
      return current;
    },
    query,
  };
};
