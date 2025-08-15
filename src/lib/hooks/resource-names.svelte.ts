import {
  createQueries,
  queryOptions,
  type QueryObserverResult,
} from '@tanstack/svelte-query';
import { MachineConnectionEvent, type ResourceName } from '@viamrobotics/sdk';
import { getContext, setContext } from 'svelte';
import { fromStore, toStore } from 'svelte/store';
import { useConnectionStatuses, useRobotClients } from './robot-clients.svelte';
import type { PartID } from '../part';
import { useMachineStatuses } from './machine-status.svelte';

const key = Symbol('resources-context');

type Query = QueryObserverResult<ResourceName[], Error>;

interface QueryContext {
  current: ResourceName[];
  error: Error | undefined;
  fetching: boolean;
  loading: boolean;
  refetch: () => Promise<Query> | Promise<void>;
}

interface Context {
  current: Record<PartID, Query | undefined>;
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
};

export const provideResourceNamesContext = () => {
  const connectionStatuses = useConnectionStatuses();
  const machineStatuses = useMachineStatuses();
  const clients = useRobotClients();

  const partIDs = $derived(Object.keys(clients.current));
  const options = $derived.by(() => {
    const results = [];

    for (const partID of partIDs) {
      const client = clients.current[partID];
      const options = queryOptions({
        enabled: client !== undefined,
        queryKey: [
          'viam-svelte-sdk',
          'partID',
          partID,
          'robotClient',
          'resourceNames',
        ],
        staleTime: Infinity,
        queryFn: async () => {
          if (!client) {
            throw new Error('No client');
          }

          const resourceNames = await client.resourceNames();
          sortResourceNames(resourceNames);
          return resourceNames;
        },
      });

      results.push(options);
    }

    return results;
  });

  const queries = fromStore(
    createQueries({
      queries: toStore(() => options),
      combine: (results): Record<PartID, Query | undefined> => {
        return Object.fromEntries(
          results.map((result, index) => [partIDs[index], result])
        );
      },
    })
  );

  /**
   * ResourceNames are not guaranteed on first fetch, refetch until they're populated
   */
  $effect(() => {
    for (const partID of partIDs) {
      const status = connectionStatuses.current[partID];
      const query = queries.current[partID];
      const connected = status === MachineConnectionEvent.CONNECTED;
      if (
        connected &&
        query?.isFetched &&
        !query.isLoading &&
        query.data?.length === 0
      ) {
        query.refetch();
      }
    }
  });

  /**
   * Individually refetch part resource names based on revision
   */
  $effect(() => {
    for (const partID of partIDs) {
      const revision =
        machineStatuses.current[partID]?.data?.config?.revision ?? '';
      const lastRevision = revisions.get(partID);
      revisions.set(partID, revision);

      if (!lastRevision) continue;

      if (revision !== lastRevision) {
        queries.current[partID]?.refetch();
      }
    }
  });

  setContext<Context>(key, queries);
};

export const useResourceNames = (
  partID: () => PartID,
  resourceSubtype?: string | (() => string)
): QueryContext => {
  const queries = getContext<Context>(key);
  const query = $derived(queries.current[partID()]);
  const data = $derived(query?.data ?? []);
  const error = $derived(query?.error ?? undefined);
  const fetching = $derived(query?.isFetching ?? true);
  const loading = $derived(query?.isLoading ?? true);

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
    get error() {
      return error;
    },
    get fetching() {
      return fetching;
    },
    get loading() {
      return loading;
    },
    refetch() {
      return query?.refetch() ?? Promise.resolve();
    },
  };
};
