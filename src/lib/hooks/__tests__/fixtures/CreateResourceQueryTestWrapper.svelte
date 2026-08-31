<script lang="ts">
import type { ArmClient } from '@viamrobotics/sdk';

import { createResourceQuery } from '../../create-resource-query.svelte';

interface Props {
  /** Stands in for the resource client, which a disconnect sets to undefined. */
  current: ArmClient | undefined;
  partID: string;
  resourceName: string;
  /** Omitted to stand in for a context that opts out of instance tracking. */
  generation?: string;
  canQuery?: boolean;
}

let { current, partID, resourceName, generation, canQuery }: Props = $props();

const client = {
  get current() {
    return current;
  },
  get partID() {
    return partID;
  },
  get name() {
    return resourceName;
  },
  get generation() {
    return generation;
  },
  get canQuery() {
    return canQuery;
  },
};

const query = createResourceQuery(client, 'getEndPosition');

// The `@tanstack/svelte-query` mock hands back the options thunk it was given,
// so the readiness gate is observable without a real query cache.
const options = $derived(
  (query as unknown as { options: () => { enabled: boolean } }).options()
);
</script>

<div data-testid="query-key">{JSON.stringify(query.queryKey)}</div>
<div data-testid="enabled">{String(options.enabled)}</div>
