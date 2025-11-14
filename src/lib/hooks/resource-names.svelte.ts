import {
  createQueries,
  queryOptions,
  type QueryObserverResult,
} from '@tanstack/svelte-query';
import type { ResourceName } from '@viamrobotics/sdk';
import { getContext, setContext } from 'svelte';
import { fromStore, toStore } from 'svelte/store';
import { useRobotClients } from './robot-clients.svelte';
import type { PartID } from '../part';
import { useMachineStatuses } from './machine-status.svelte';
import { useQueryLogger } from '$lib/query-logger';
import { useDebounce } from 'runed';
import { useEnabledQueries } from './use-enabled-queries.svelte';

const key = Symbol('resources-context');

type Query = QueryObserverResult<ResourceName[], Error>;

/** @todo(mp) Expose in the ts-sdk and remove */
const MachineState = {
  Unspecified: 0,
  Initializing: 1,
  Running: 2,
};

interface QueryContext {
  current: ResourceName[];
  error: Error | undefined;
  fetching: boolean;
  loading: boolean;
  pending: boolean;
  refetch: () => Promise<Query> | Promise<void>;
}

interface Context {
  current: Record<PartID, Query | undefined>;
}

const revisions = new Map<string, string>();

export const areResourceNamesEqual = (
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
export const sortResourceNames = (resourceNames: ResourceName[]) => {
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
  const machineStatuses = useMachineStatuses();
  const clients = useRobotClients();
  const debug = useQueryLogger();
  const enabledQueries = useEnabledQueries();
  const partIDs = $derived(Object.keys(clients.current));
  const options = $derived.by(() => {
    const results = [];

    for (const partID of partIDs) {
      const machineStatus = machineStatuses.current[partID]?.data;
      const client = clients.current[partID];
      const options = queryOptions({
        refetchOnMount: false,
        enabled:
          client !== undefined &&
          machineStatus?.state === MachineState.Running &&
          enabledQueries.resourceNames,
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

          const logger = debug.createLogger();
          logger('REQ', partID, 'resourceNames');

          try {
            const resourceNames = await client.resourceNames();
            logger('RES', partID, 'resourceNames', resourceNames);
            sortResourceNames(resourceNames);
            return resourceNames;
          } catch (error) {
            logger('ERR', partID, 'resourceNames', error);
            throw error;
          }
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

  const debouncedRefetch = $derived.by<Record<string, () => void>>(() => {
    const entries: [string, () => void][] = [];
    for (const partID of partIDs) {
      entries.push([
        partID,
        useDebounce(() => {
          queries.current[partID]?.refetch();
        }, 500),
      ]);
    }

    return Object.fromEntries(entries);
  });

  /**
   * Refetch part resource names based on revision
   */
  $effect(() => {
    for (const partID of partIDs) {
      const machineStatus = machineStatuses.current[partID]?.data;
      const revision = machineStatus?.config?.revision ?? '';
      const lastRevision = revisions.get(partID);

      revisions.set(partID, revision);

      if (lastRevision && revision !== lastRevision) {
        debouncedRefetch[partID]?.();
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
  const pending = $derived(query?.isPending ?? true);

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
    get pending() {
      return pending;
    },
    refetch() {
      return query?.refetch() ?? Promise.resolve();
    },
  };
};
