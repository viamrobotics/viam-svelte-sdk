import { type QueryObserverResult } from '@tanstack/svelte-query';
import type { ResourceName } from '@viamrobotics/sdk';
import { useRobotClient } from './robot-clients.svelte';
import type { PartID } from '../part';
import { useDebounce } from 'runed';
import { useEnabledQueries } from './use-enabled-queries.svelte';
import { createRobotQuery } from './create-robot-query.svelte';

type Query = QueryObserverResult<ResourceName[], Error>;

/** @todo(mp) Expose in the ts-sdk and remove */
const MachineState = {
  Unspecified: 0,
  Initializing: 1,
  Running: 2,
};

interface QueryContext {
  current: ResourceName[];
  query: Query | undefined;
}

const revisions = new Map<string, string>();

const areResourceNamesEqual = (
  a: ResourceName[],
  b: ResourceName[]
): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) {
      return false;
    }
  }

  return true;
};

/**
 * sorts resource names by local/remote -> type -> name (alphabetical)
 * to produce a list like:
 *
 * component a
 * component z
 * service   b
 * component remote:c
 * service   remote:b
 * @param resourceNames
 */
const sortResourceNames = (resourceNames: ResourceName[]) => {
  resourceNames.sort(({ type, name }, { type: otherType, name: otherName }) => {
    // sort all non-remote resources before remote resources
    if (name.includes(':') !== otherName.includes(':')) {
      return name.includes(':') ? 1 : -1;
    }

    // sort alphabetically within type
    // sort components before services
    return type === otherType
      ? name.localeCompare(otherName)
      : type.localeCompare(otherType);
  });

  return resourceNames;
};

export const useResourceNames = (
  partID: () => PartID,
  resourceSubtype?: string | (() => string)
): QueryContext => {
  const enabledQueries = useEnabledQueries();
  const client = useRobotClient(partID);
  const machineStatus = createRobotQuery(client, 'getMachineStatus');

  const query = createRobotQuery(client, 'resourceNames', () => ({
    enabled:
      client !== undefined &&
      machineStatus?.data?.state === MachineState.Running &&
      enabledQueries.resourceNames,
    refetchOnMount: false,
    staleTime: Infinity,
  }));

  const debouncedRefetch = useDebounce(() => query.refetch(), 500);

  $effect(() => {
    const revision = machineStatus?.data?.config?.revision ?? '';
    const lastRevision = revisions.get(partID());

    revisions.set(partID(), revision);

    if (lastRevision && revision !== lastRevision) {
      debouncedRefetch();
    }
  });

  const data = $derived(sortResourceNames(query.data ?? []));

  const subtype = $derived(
    typeof resourceSubtype === 'function' ? resourceSubtype() : resourceSubtype
  );
  const filtered = $derived(
    subtype ? data.filter((value) => value.subtype === subtype) : data
  );

  let last: ResourceName[] = filtered;

  const current = $derived.by(() => {
    if (areResourceNamesEqual(last, filtered)) {
      return last;
    }

    last = filtered;
    return filtered;
  });

  return {
    get current() {
      return current;
    },
    query,
  };
};
