import type { robotApi } from '@viamrobotics/sdk';

/**
 * Stands in for the polled `getMachineStatus` query so a spec can push
 * successive polls at the watcher. Rune-backed, so the watcher's `$derived`
 * actually re-runs, which a plain object would not do.
 */
let data = $state.raw<
  | {
      resources: robotApi.ResourceStatus[];
      config?: { revision: string };
    }
  | undefined
>(undefined);

export const machineStatusStub = {
  get data() {
    return data;
  },
  /**
   * @param configRevision Omit to poll a status carrying no config at all,
   *   which is what a spec about resources alone wants.
   */
  poll: (resources: robotApi.ResourceStatus[], configRevision?: string) => {
    data =
      configRevision === undefined
        ? { resources }
        : { resources, config: { revision: configRevision } };
  },
  reset: () => {
    data = undefined;
  },
};
