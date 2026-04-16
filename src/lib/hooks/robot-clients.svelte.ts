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

const clientKey = Symbol('clients-context');

export type RobbotConnection = {
  client: Client | undefined;
  connectionStatus: MachineConnectionEvent;
  dialConfig: DialConf;
}

interface RobotClientsContext {
  current: Record<PartID, RobbotConnection | undefined>;
  errors: Record<PartID, Error | undefined>;
  connect: (partID: PartID, config: DialConf) => Promise<void>;
  disconnect: (partID: PartID) => Promise<void>;
}

interface RobotClientContext {
  current: RobbotConnection | undefined;
  error: Error | undefined;
  disconnect: () => Promise<void>;
}

export const provideRobotClientsContext = () => {
  const queryClient = useQueryClient();
  const robotClients = $state<Record<PartID, RobbotConnection | undefined>>({});
  const errors = $state<Record<PartID, Error | undefined>>({});

  const disconnect = async (partID: PartID) => {
    const robotClient = robotClients[partID];

    if (!robotClient) {
      return;
    }

    logger.withMetadata({ partID }).info('disconnecting');
    robotClient.connectionStatus = MachineConnectionEvent.DISCONNECTING;

    await Promise.all([
      robotClient.client?.disconnect(),
      queryClient.cancelQueries({
        queryKey: ['viam-svelte-sdk', 'partID', partID],
      }),
    ]);

    robotClient.client?.listeners['connectionstatechange']?.clear();
    
    robotClient.client = undefined;
    robotClient.connectionStatus = MachineConnectionEvent.DISCONNECTED;
    logger.withMetadata({ partID }).info('disconnected');
  };

  const connect = async (partID: PartID, config: DialConf) => {
    await disconnect(partID);

    try {
      const client = new RobotClient();
      (client as RobotClient & { partID: string }).partID = partID;

      logger.withMetadata({ partID }).info('connecting');
      const robotClient: RobbotConnection = {
        client,
        connectionStatus: MachineConnectionEvent.CONNECTING,
        dialConfig: config
      };
      robotClients[partID] = robotClient;

      

      client.on('connectionstatechange', async (event) => {
        const newStatus = (event as { eventType: MachineConnectionEvent })
          .eventType;
        robotClient.connectionStatus = newStatus;

        logger
          .withMetadata({ partID, status: newStatus })
          .info('connection state changed');

        if (robotClient.connectionStatus === MachineConnectionEvent.DISCONNECTED) {
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

      robotClient.connectionStatus = MachineConnectionEvent.CONNECTED;
      logger.withMetadata({ partID }).info('connected');
    } catch (error) {
      logger
        .withMetadata({ partID })
        .withError(error)
        .error('connection failed');
      errors[partID] = error as Error;
      const robotClient = robotClients[partID];
      if (!robotClient) {
        return;
      }
      robotClient.connectionStatus = MachineConnectionEvent.DISCONNECTED;
    }
  };

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
  const client = $derived(context.current[partID()]);
  const error = $derived(context.errors[partID()]);
  return {
    get current() {
      return client;
    },
    get error() {
      return error;
    },
    disconnect: () => context.disconnect(partID()),
  };
};