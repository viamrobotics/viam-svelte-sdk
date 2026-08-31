import type { robotApi } from '@viamrobotics/sdk';

/**
 * Stands in for the polled `getMachineStatus` query so a spec can push
 * successive polls at the watcher. Rune-backed, so the watcher's `$derived`
 * actually re-runs, which a plain object would not do.
 */
let data = $state.raw<{ resources: robotApi.ResourceStatus[] } | undefined>(
  undefined
);

export const machineStatusStub = {
  get data() {
    return data;
  },
  poll: (resources: robotApi.ResourceStatus[]) => {
    data = { resources };
  },
  reset: () => {
    data = undefined;
  },
};
