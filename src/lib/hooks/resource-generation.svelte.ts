import { getContext, setContext, untrack } from 'svelte';

import type { PartID } from '../part';

const key = Symbol('resource-generations-context');

export interface ResourceGeneration {
  /**
   * Identifies the server-side instance currently behind a resource name, and
   * changes whenever that instance is replaced.
   *
   * Derived from the resource's `lastUpdated` state-transition timestamp.
   */
  readonly generation: string;
  /**
   * Whether a request to the resource is worth making. False while it sits in a
   * state it leaves on its own: unconfigured, configuring, or being removed.
   */
  readonly canQuery: boolean;
}

interface ResourceGenerationsContext {
  readonly current: Record<PartID, Record<string, ResourceGeneration>>;
  publish: (
    partID: PartID,
    generations: Record<string, ResourceGeneration>
  ) => void;
  withdraw: (partID: PartID) => void;
}

export interface ResourceGenerationContext {
  /** See {@link ResourceGeneration.generation}. Empty until a status arrives. */
  readonly current: string;
  /** See {@link ResourceGeneration.canQuery}. True until a status arrives. */
  readonly canQuery: boolean;
}

export const provideResourceGenerations = () => {
  const generations = $state<
    Record<PartID, Record<string, ResourceGeneration>>
  >({});

  setContext<ResourceGenerationsContext>(key, {
    get current() {
      return generations;
    },
    // The status query hands back a fresh object every poll, so an unchanged
    // machine still republishes. Writing that through would wake every consumer
    // once a second, so unchanged entries keep the identity they already had.
    publish: (partID, next) => {
      untrack(() => {
        const existing = generations[partID];
        const merged: Record<string, ResourceGeneration> = {};

        let changed =
          existing === undefined ||
          Object.keys(existing).length !== Object.keys(next).length;

        for (const [name, value] of Object.entries(next)) {
          const prior = existing?.[name];

          if (
            prior &&
            prior.generation === value.generation &&
            prior.canQuery === value.canQuery
          ) {
            merged[name] = prior;
          } else {
            merged[name] = value;
            changed = true;
          }
        }

        if (changed) {
          generations[partID] = merged;
        }
      });
    },
    withdraw: (partID) => {
      delete generations[partID];
    },
  });
};

/**
 * Reads the machine status a part's watcher publishes, so this is a plain
 * derived lookup with no query and no effect. That keeps it callable from
 * anywhere a getter runs, including inside a `$derived`.
 */
export const useResourceGeneration = (
  partID: () => PartID,
  resourceName: () => string
): ResourceGenerationContext => {
  const context = getContext<ResourceGenerationsContext | undefined>(key);

  const entry = $derived(context?.current[partID()]?.[resourceName()]);

  return {
    get current() {
      return entry?.generation ?? '';
    },
    get canQuery() {
      return entry?.canQuery ?? true;
    },
  };
};

export const useResourceGenerationsPublisher = () =>
  getContext<ResourceGenerationsContext | undefined>(key);
