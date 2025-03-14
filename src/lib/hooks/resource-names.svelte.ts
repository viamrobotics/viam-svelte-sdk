import { createQueries, type QueryObserverResult } from '@tanstack/svelte-query';
import type { ResourceName } from '@viamrobotics/sdk';
import { getContext, setContext } from 'svelte';
import { fromStore, toStore } from 'svelte/store';
import { useRobotClients } from '$lib/robot-clients.svelte';
import type { PartID } from '../part';

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

export const provideResourceNamesContext = () => {
  const clients = useRobotClients();

  const options = $derived(
    Object.entries(clients.current).map(([partID, client]) => {
      return {
        queryKey: [partID, 'resources'],
        queryFn: async () => {
          if (!client) return [];
          return client.resourceNames();
        },
      };
    })
  );

  const current = fromStore(
    createQueries({
      queries: toStore(() => options),
      combine: (results) => {
        const partIDs = Object.keys(clients.current);
        return Object.fromEntries(results.map((result, index) => [partIDs[index], result]));
      },
    })
  );

  setContext<Context>(key, {
    get current() {
      return current.current;
    },
  });
};

export const useResourceNames = (partID: () => PartID, subtype?: () => string): QueryContext => {
  const context = getContext<Context>(key);
  const query = $derived(context.current[partID()]);
  const data = $derived(query?.data ?? []);
  const filtered = $derived(subtype ? data.filter((value) => value.subtype === subtype()) : data);
  const error = $derived(query?.error ?? undefined);
  const fetching = $derived(query?.isFetching ?? true);

  return {
    get current() {
      return filtered;
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
