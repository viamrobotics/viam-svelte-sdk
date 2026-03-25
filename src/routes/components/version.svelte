<script lang="ts">
import { createRobotMutation, createRobotQuery, useRobotClient } from '$lib';

let { partID } = $props();

const client = useRobotClient(() => partID);
const version = createRobotQuery(client, 'getVersion');
const stopAll = createRobotMutation(client, 'stopAll');
</script>

{#if version.error}
  Error fetching version: {version.error.message}
{:else if version.data}
  <p>Platform: {version.data.platform}</p>
  <p>API version: {version.data.apiVersion}</p>
  <p>Version: {version.data.version}</p>
{/if}

<button onclick={() => stopAll.mutate([])}> Stop All </button>
