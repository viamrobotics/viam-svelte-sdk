import {
  createQueries,
  queryOptions,
  type QueryObserverResult,
} from '@tanstack/svelte-query';
import { ResourceName } from '@viamrobotics/sdk';
import { getContext, setContext } from 'svelte';
import { fromStore, toStore } from 'svelte/store';
import { useRobotClients } from './robot-clients.svelte';
import type { PartID } from '../part';
import { useMachineStatuses } from './machine-status.svelte';

const key = Symbol('resources-context');

type Query = QueryObserverResult<ResourceName[], Error>;

interface QueryContext {
  current: ResourceName[];
  error: Error | undefined;
  fetching: boolean;
  refetch: () => Promise<Query> | Promise<void>;
}

interface Context {
  current: Record<PartID, Query | undefined>;
}

const revisions = new Map<string, string>();

const deepEqualResourceNames = (
  a: ResourceName[],
  b: ResourceName[]
): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((item, i) => JSON.stringify(item) === JSON.stringify(b[i]));
};

export const provideResourceNamesContext = () => {
  const machineStatuses = useMachineStatuses();
  const clients = useRobotClients();

  const options = $derived(
    Object.entries(clients.current).map(([partID, client]) => {
      return queryOptions({
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

          return client.resourceNames();
        },
      });
    })
  );

  const queries = fromStore(
    createQueries({
      queries: toStore(() => options),
    })
  );

  $effect(() => {
    let index = 0;

    for (const [partID] of Object.entries(clients.current)) {
      const revision =
        machineStatuses.current[partID]?.data?.config?.revision ?? '';
      const lastRevision = revisions.get(partID);
      revisions.set(partID, revision);

      if (!lastRevision) continue;

      if (revision !== lastRevision) {
        queries.current[index]?.refetch();
      }

      index += 1;
    }
  });

  const partIDs = $derived(Object.keys(clients.current));
  const current = $derived(
    Object.fromEntries(
      queries.current.map((result, index) => [partIDs[index], result])
    )
  );

  setContext<Context>(key, {
    get current() {
      return current;
    },
  });
};

export const useResourceNames = (
  partID: () => PartID,
  subtype?: string | (() => string)
): QueryContext => {
  const context = getContext<Context>(key);
  const query = $derived(context.current[partID()]);
  const data = $derived(query?.data ?? []);
  const resourceSubtype = $derived(
    typeof subtype === 'function' ? subtype() : subtype
  );
  const error = $derived(query?.error ?? undefined);
  const fetching = $derived(query?.isFetching ?? true);

  const filtered = $derived(
    subtype ? data.filter((value) => value.subtype === resourceSubtype) : data
  );

  let current = $state.raw<ResourceName[]>([]);
  let last: ResourceName[] = [];

  $effect.pre(() => {
    if (!deepEqualResourceNames(last, filtered)) {
      last = current;
      current = filtered;
    }
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
    refetch() {
      return query?.refetch() ?? Promise.resolve();
    },
  };
};
