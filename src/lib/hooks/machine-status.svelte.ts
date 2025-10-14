import { fromStore, toStore } from 'svelte/store';
import { useRobotClients } from './robot-clients.svelte';
import {
  createQueries,
  queryOptions,
  type QueryObserverResult,
} from '@tanstack/svelte-query';
import { getContext, setContext } from 'svelte';
import type { PartID } from '$lib/part';
import type { RobotClient } from '@viamrobotics/sdk';
import { usePolling } from './use-polling.svelte';
import { useQueryLogger } from '$lib/query-logger';

const key = Symbol('machine-status-context');

type MachineStatus = Awaited<ReturnType<RobotClient['getMachineStatus']>>;
type Query = QueryObserverResult<MachineStatus, Error>;

interface Context {
  current: Record<PartID, Query | undefined>;
}

export const provideMachineStatusContext = (refetchInterval: () => number) => {
  const clients = useRobotClients();
  const debug = useQueryLogger();

  const options = $derived(
    Object.entries(clients.current).map(([partID, client]) => {
      return queryOptions({
        enabled: client !== undefined,
        queryKey: [
          'viam-svelte-sdk',
          'partID',
          partID,
          'robotClient',
          'getMachineStatus',
        ],
        refetchInterval: false,
        queryFn: async (): Promise<MachineStatus> => {
          if (!client) {
            throw new Error('No client');
          }

          const logger = debug.createLogger();
          logger('REQ', 'robot', 'getMachineStatus');

          try {
            const response = await client.getMachineStatus();
            logger('RES', 'robot', 'getMachineStatus', response);
            return response;
          } catch (error) {
            logger('ERR', 'robot', 'getMachineStatus', error);
            throw error;
          }
        },
      });
    })
  );

  const queries = fromStore(
    createQueries({
      queries: toStore(() => options),
      combine: (results) => {
        const partIDs = Object.keys(clients.current);
        return Object.fromEntries(
          results.map((result, index) => [partIDs[index], result])
        );
      },
    })
  );

  $effect(() => {
    for (const option of options) {
      usePolling(
        () => option.queryKey,
        () => (option.enabled ? refetchInterval() : false)
      );
    }
  });

  setContext(key, {
    get current() {
      return queries.current;
    },
  });
};

export const useMachineStatuses = (): Context => {
  const context = getContext<Context>(key);
  return context;
};

export const useMachineStatus = (partID: () => PartID) => {
  const context = useMachineStatuses();
  const query = $derived(context.current[partID()]);
  const data = $derived(query?.data);
  const error = $derived(query?.error);
  const fetching = $derived(query?.isFetching);
  const loading = $derived(query?.isLoading);

  return {
    get current() {
      return data;
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
  };
};
