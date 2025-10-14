import { fromStore, toStore } from 'svelte/store';
import { useRobotClients } from './robot-clients.svelte';
import {
  createQueries,
  queryOptions,
  type QueryObserverResult,
} from '@tanstack/svelte-query';
import { getContext, setContext } from 'svelte';
import type { PartID } from '$lib/part';
import type { PlainMessage, robotApi } from '@viamrobotics/sdk';
import { usePolling } from './use-polling.svelte';
import { useQueryLogger } from '$lib/query-logger';
import { useEnabledQueries } from './use-enabled-queries.svelte';

const key = Symbol('machine-status-context');

type MachineStatus = PlainMessage<robotApi.GetMachineStatusResponse>;
type Query = QueryObserverResult<MachineStatus, Error>;

// TODO: move to ts-sdk
export type ResourceStatus = PlainMessage<robotApi.ResourceStatus>;

interface Context {
  current: Record<PartID, Query | undefined>;
}

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

export const provideMachineStatusContext = (refetchInterval: () => number) => {
  const clients = useRobotClients();
  const debug = useQueryLogger();
  const enabledQueries = useEnabledQueries();

  const options = $derived(
    Object.entries(clients.current).map(([partID, client]) => {
      return queryOptions({
        enabled: client !== undefined && enabledQueries.machineStatus,
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
            return sortResourceStatuses(response);
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
      usePolling(() => option.queryKey, refetchInterval);
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
  const pending = $derived(query?.isPending ?? true);

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
    get pending() {
      return pending;
    },
    refetch() {
      return query?.refetch() ?? Promise.resolve();
    },
  };
};
