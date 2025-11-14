<script lang="ts">
import {
  provideEnabledQueriesContext,
  useEnabledQueries,
} from '../use-enabled-queries.svelte';
import { onMount } from 'svelte';

interface Props {
  onReady: (queries: ReturnType<typeof useEnabledQueries>) => void;
}

let { onReady }: Props = $props();

// Provide context once
provideEnabledQueriesContext();

// Get the queries object
const queries = useEnabledQueries();

// Call the callback with the queries object
onMount(() => {
  onReady(queries);
});
</script>

<div data-testid="enabled-queries-test">Enabled Queries Test</div>
