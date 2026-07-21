import type { DialConf } from '@viamrobotics/sdk';
import { PersistedState } from 'runed';

const parseEnvConfigs = (): Record<string, DialConf> => {
  const raw = import.meta.env.VITE_CONFIGS;
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw) as Record<string, DialConf>;
  } catch (error) {
    console.error('Failed to parse VITE_CONFIGS', error);
    return {};
  }
};

const envConfigs = parseEnvConfigs();

const userConfigs = new PersistedState<Record<string, DialConf>>(
  'viam-svelte-sdk-user-configs',
  {}
);

export const dialConfigs = {
  get current(): Record<string, DialConf> {
    return { ...envConfigs, ...userConfigs.current };
  },
};

export const isEnvConfig = (partID: string): boolean => partID in envConfigs;

export const addUserConfig = (partID: string, config: DialConf) => {
  userConfigs.current = { ...userConfigs.current, [partID]: config };
};

export const removeUserConfig = (partID: string) => {
  const next = { ...userConfigs.current };
  delete next[partID];
  userConfigs.current = next;
};
