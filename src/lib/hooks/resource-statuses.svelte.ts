import type { PartID } from '$lib/part';
import { useMachineStatus, type ResourceStatus } from './machine-status.svelte';
import { configuredResources } from './configured-resources';

/** Compares on everything reported, so a state or error change counts. */
const areEqual = (a: ResourceStatus[], b: ResourceStatus[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((status, index) => {
    const other = b[index];

    return (
      status.name?.namespace === other?.name?.namespace &&
      status.name?.type === other?.name?.type &&
      status.name?.subtype === other?.name?.subtype &&
      status.name?.name === other?.name?.name &&
      status.state === other?.state &&
      status.error === other?.error &&
      status.revision === other?.revision
    );
  });
};

/**
 * Every configured resource on a part, with the state and error the machine
 * reports for each.
 *
 * Prefer this to `useResourceNames` for anything that renders or tracks a set of
 * resources. `resourceNames` lists only what the server can currently serve, so
 * a resource leaves it the moment it goes unhealthy and returns when it
 * recovers. Membership that tracks health makes the list unstable, and anything
 * derived from it churns. This reports a resource whatever its state, and hands
 * over that state so a caller can show it as unhealthy rather than having it
 * silently disappear.
 *
 * `useMachineStatus` is the unfiltered view. This one drops what rdk does not
 * count as a configured resource, and holds its array identity while nothing
 * changes.
 *
 * @param partID The part to list.
 * @param resourceSubtype Restricts the list to one subtype, such as `camera`.
 */
export const useResourceStatuses = (
  partID: () => PartID,
  resourceSubtype?: string | (() => string)
) => {
  const machineStatus = useMachineStatus(partID);

  const subtype = $derived(
    typeof resourceSubtype === 'function' ? resourceSubtype() : resourceSubtype
  );

  const filtered = $derived(
    configuredResources(machineStatus.current?.resources ?? [], subtype)
  );

  // The status is polled, so it hands back a fresh array every second. Holding
  // the previous one while nothing has changed keeps consumers from rebuilding
  // on every poll.
  let last: ResourceStatus[] = filtered;

  const current = $derived.by(() => {
    if (areEqual(last, filtered)) {
      return last;
    }

    last = filtered;
    return filtered;
  });

  return {
    get current() {
      return current;
    },
  };
};
