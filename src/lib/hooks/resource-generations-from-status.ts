import type { robotApi } from '@viamrobotics/sdk';

import type { ResourceGeneration } from './resource-generation.svelte';
import {
  STATE_CONFIGURING,
  STATE_REMOVING,
  STATE_UNCONFIGURED,
} from './resource-status-state';

/**
 * States the resource leaves on its own, either by becoming ready or by going
 * away. `STATE_UNHEALTHY` is deliberately absent. An unhealthy resource cannot
 * serve a request either, but it can stay that way indefinitely, and the
 * server's error beats reporting loading forever.
 */
const TRANSIENT_STATES = new Set([
  STATE_UNCONFIGURED,
  STATE_CONFIGURING,
  STATE_REMOVING,
]);

const generationToken = (status: robotApi.ResourceStatus): string => {
  const seconds = status.lastUpdated?.seconds ?? 0n;
  const nanos = status.lastUpdated?.nanos ?? 0;
  return `${status.name?.subtype ?? ''}:${seconds}.${nanos}`;
};

/**
 * Reduces a machine status to one entry per resource name.
 *
 * A name can address more than one resource when subtypes collide, and a caller
 * holds only the name, so every match folds into a single token and a change to
 * any of them moves it. The fold is order-independent, since the server does not
 * promise a stable resource order.
 */
export const resourceGenerationsFromStatus = (
  resources: robotApi.ResourceStatus[]
): Record<string, ResourceGeneration> => {
  const tokens: Record<string, string[]> = {};
  const transitioning = new Set<string>();

  for (const status of resources) {
    const name = status.name?.name;

    if (name === undefined) {
      continue;
    }

    tokens[name] = [...(tokens[name] ?? []), generationToken(status)];

    if (TRANSIENT_STATES.has(status.state)) {
      transitioning.add(name);
    }
  }

  return Object.fromEntries(
    Object.entries(tokens).map(([name, names]) => [
      name,
      {
        generation: names.toSorted().join('|'),
        canQuery: !transitioning.has(name),
      },
    ])
  );
};
