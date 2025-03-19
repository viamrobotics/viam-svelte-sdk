<script lang="ts">
import { createRobotQuery, useRobotClient } from '$lib';

let { partID } = $props();

const client = useRobotClient(() => partID);
const query = createRobotQuery(client, 'getVersion');
</script>

{#if query.current.error}
  Error fetching version: {query.current.error.message}
{:else if query.current.data}
  <p>Platform: {query.current.data.platform}</p>
  <p>API version: {query.current.data.apiVersion}</p>
  <p>Version: {query.current.data.version}</p>
{/if}
