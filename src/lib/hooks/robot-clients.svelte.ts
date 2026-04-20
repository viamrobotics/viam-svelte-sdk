import {
  type Client,
  type DialConf,
  MachineConnectionEvent,
  RobotClient,
} from '@viamrobotics/sdk';
import { getContext, setContext } from 'svelte';
import { useQueryClient } from '@tanstack/svelte-query';
import type { PartID } from '../part';
import { logger } from '$lib/logger';
import { untrack } from 'svelte';

const clientKey = Symbol('clients-context');

export type RobotConnection = {
  client: Client | undefined;
  connectionStatus: MachineConnectionEvent;
  dialConfig: DialConf;
}


interface RobotClientsContext {
  current: Record<PartID, RobotConnection | undefined>;
  errors: Record<PartID, Error | undefined>;
  connect: (partID: PartID, config: DialConf) => Promise<void>;
  disconnect: (partID: PartID) => Promise<void>;
}

interface RobotClientContext {
  current: RobotClient | undefined;
  error: Error | undefined;
  connectionStatus: MachineConnectionEvent;
  disconnect: () => Promise<void>;
}

export const provideRobotClientsContext = (dialConfigs: () => Record<string, DialConf>) => {
  const queryClient = useQueryClient();
  const robotClients = $state<Record<PartID, RobotConnection | undefined>>({});
  const errors = $state<Record<PartID, Error | undefined>>({});

  const disconnect = async (partID: PartID) => {

    console.log(`MATTHEW: disconnecting from ${partID} robotClient`, robotClients[partID]);
    if (!robotClients[partID]) {
      return;
    }

    logger.withMetadata({ partID }).info('disconnecting');
    robotClients[partID].connectionStatus = MachineConnectionEvent.DISCONNECTING;

    await Promise.all([
      robotClients[partID].client?.disconnect(),
      queryClient.cancelQueries({
        queryKey: ['viam-svelte-sdk', 'partID', partID],
      }),
    ]);

    robotClients[partID].client?.listeners['connectionstatechange']?.clear();
    
    robotClients[partID].client = undefined;
    robotClients[partID].connectionStatus = MachineConnectionEvent.DISCONNECTED;
    logger.withMetadata({ partID }).info('disconnected');
  };

  const connect = async (partID: PartID, config: DialConf) => {
    await disconnect(partID);

    try {
      const client = new RobotClient();
      (client as RobotClient & { partID: string }).partID = partID;

      logger.withMetadata({ partID }).info('connecting');
      const robotClient: RobotConnection = {
        client,
        connectionStatus: MachineConnectionEvent.CONNECTING,
        dialConfig: config
      };
      robotClients[partID] = robotClient;

      client.on('connectionstatechange', async (event) => {
        if (!robotClients[partID]) {
          return;
        }
        const newStatus = (event as { eventType: MachineConnectionEvent })
          .eventType;
        robotClients[partID].connectionStatus = newStatus;

        logger
          .withMetadata({ partID, status: newStatus })
          .info('connection state changed');

        if (robotClients[partID].connectionStatus === MachineConnectionEvent.DISCONNECTED) {
          await queryClient.cancelQueries({
            queryKey: ['viam-svelte-sdk', 'partID', partID],
          });

          await queryClient.resetQueries({
            queryKey: ['viam-svelte-sdk', 'partID', partID],
          });
        }
      });

      await client.dial(config);
      errors[partID] = undefined;

      robotClients[partID].connectionStatus = MachineConnectionEvent.CONNECTED;
      logger.withMetadata({ partID }).info('connected');
    } catch (error) {
      logger
        .withMetadata({ partID })
        .withError(error)
        .error('connection failed');
      errors[partID] = error as Error;

      if (!robotClients[partID]) {
        return;
      }
      robotClients[partID].connectionStatus = MachineConnectionEvent.DISCONNECTED;
    }
  };

  $effect(() => {
    const configs = dialConfigs();
    untrack(() => {
      for (const [partID, config] of Object.entries(configs)) {
        connect(partID, config);
      }
    });
  });

  setContext<RobotClientsContext>(clientKey, {
    get current() {
      return robotClients;
    },
    get errors() {
      return errors;
    },
    connect,
    disconnect,
  });
};

export const useRobotClients = (): RobotClientsContext => {
  const context = getContext<RobotClientsContext>(clientKey);
  return {
    get current() {
      return context.current;
    },
    get errors() {
      return context.errors;
    },
    connect: context.connect,
    disconnect: context.disconnect,
  };
};

export const useRobotClient = (partID: () => PartID): RobotClientContext => {
  const context = getContext<RobotClientsContext>(clientKey);
  const client = $derived(context.current[partID()]?.client);
  const error = $derived(context.errors[partID()]);
  return {
    get current() {
      return client;
    },
    get error() {
      return error;
    },
    get connectionStatus() {
      return context.current[partID()]?.connectionStatus ?? MachineConnectionEvent.DISCONNECTED;
    },
    disconnect: () => context.disconnect(partID()),
  };
};