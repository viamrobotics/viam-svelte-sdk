# viam-svelte-sdk

`pnpm i --save @viamrobotics/svelte-sdk @viamrobotics/sdk @tanstack/svelte-query`

## Getting started

The Viam Svelte SDK provides a reactive layer over `@viamrobotics/sdk`.

To get started, Include the `ViamProvider` component. Any child component will have access to the SDK hooks.

A map of `PartID`s to `DialConf`s must also be provided to connect to your machine(s).

```svelte
<script lang="ts">
import { ViamProvider } from '@viamrobotics/svelte-sdk';
import type { DialConf } from '@viamrobotics/sdk';

let { children } = $props();

const dialConfigs: Record<string, DialConf> = {
  'my-part-id': {
    host: 'my-host',
    credentials: {
      type: 'api-key',
      authEntity: 'my-api-key-id',
      payload: 'my-api-key-value',
    },
    signalingAddress: 'https://app.viam.com:443',
    disableSessions: false,
  },
};
</script>

<ViamProvider {dialConfigs}>
  {@render children()}
</ViamProvider>
```

### useRobotClient / useConnectionStatus

In any child component, you can access the `RobotClient` and `MachineConnectionStatus` of any connected machine with the `useRobotClient` and `useConnectionStatus` hooks.

```svelte
<script lang="ts">
import { useConnectionStatus, useRobotClient } from '@viamrobotics/svelte-sdk';

interface Props {
  partID: string;
}

let { partID }: Props = $props();

const status = useConnectionStatus(() => partID);
const client = useRobotClient(() => partID);

$inspect(status.current);
$inspect(client.current);
</script>
```

### createRobotQuery / createRobotMutation

To execute queries / mutations directly on the robot client, use the following convenience hooks.

```svelte
<script lang="ts">
import {
  createRobotMutation,
  createRobotQuery,
  useRobotClient,
} from '@viamrobotics/svelte-sdk';

let { partID } = $props();

const client = useRobotClient(() => partID);
const version = createRobotQuery(client, 'getVersion');
const stopAll = createRobotMutation(client, 'stopAll');
</script>

{#if version.current.error}
  Error fetching version: {version.current.error.message}
{:else if version.current.data}
  <p>Platform: {version.current.data.platform}</p>
  <p>API version: {version.current.data.apiVersion}</p>
  <p>Version: {version.current.data.version}</p>
{/if}

<button onclick={() => stopAll.current.mutate([])}> Stop All </button>
```

### createResourceClient / createResourceQuery / createResourceMutation

To create and execute queries / mutations on resource (component / service) clients, use the following convenience hooks.

```svelte
<script lang="ts">
import { BaseClient } from '@viamrobotics/sdk';
import {
  createResourceClient,
  createResourceQuery,
  createResourceMutation,
} from '@viamrobotics/svelte-sdk';

interface Props {
  partID: string;
  name: string;
}

let { partID, name }: Props = $props();

const client = createResourceClient(
  BaseClient,
  () => partID,
  () => name
);

const isMoving = createResourceQuery(client, 'isMoving');
const moveStraight = createResourceMutation(client, 'moveStraight');
</script>

Is moving: {isMoving.current.data ?? false}

<button onclick={() => moveStraight.current.mutate([100, 10])}> Move </button>
```

### createStreamClient

A hook for more easily dealing with StreamClient.

```svelte
<script lang="ts">
import { createStreamClient } from '@viamrobotics/svelte-sdk';

interface Props {
  partID: string;
  name: string;
}

let { partID, name }: Props = $props();

let element: HTMLVideoElement;

const client = createStreamClient(
  () => partID,
  () => name
);

$effect(() => {
  element.srcObject = client.mediaStream;
});

$effect(() => {
  const [firstResolution] = client.resolutions ?? [];

  console.log(firstResolution);

  if (firstResolution) {
    client.setResolution(firstResolution);
  }
});
</script>

<video
  muted
  autoplay
  controls={false}
  playsinline
  bind:this={element}
></video>
```

### useMachineStatus

Wraps `robotClient.getMachineStatus()` in a reactive query at the ViamProvider level.

```svelte
<script lang="ts">
import { useMachineStatus } from '@viamrobotics/svelte-sdk';

interface Props {
  partID: string;
}

let { partID }: Props = $props();

const machineStatus = useMachineStatus(() => partID);

$inspect(machineStatus.current);
$inspect(machineStatus.error);
$inspect(machineStatus.fetching);
</script>
```

### useResourceNames

Wraps `robotClient.resourceNames()` in a reactive query at the ViamProvider level. Supports optional filtering by resource subtype.

```svelte
<script lang="ts">
import { useResourceNames } from '@viamrobotics/svelte-sdk';

interface Props {
  partID: string;
}

let { partID }: Props = $props();

const resources = useResourceNames(() => partID);
const arms = useResourceNames(
  () => partID,
  () => 'arm'
);

$inspect(resources.current);
$inspect(resources.error);
$inspect(resources.fetching);
</script>
```

## Developing

First install dependencies with `pnpm install`, then start a development server:

```bash
pnpm dev

# or start the server and open the app in a new browser tab
pnpm dev -- --open
```

## Building and Publishing

To build the library:

```bash
pnpm package
```

To publish a new version of the library, run the changeset CLI:

```bash
npx @changesets/cli
```

This will trigger the github changeset bot to prepare a new version in CI.
