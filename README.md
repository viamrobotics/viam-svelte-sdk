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

{#if version.error}
  Error fetching version: {version.error.message}
{:else if version.data}
  <p>Platform: {version.data.platform}</p>
  <p>API version: {version.data.apiVersion}</p>
  <p>Version: {version.data.version}</p>
{/if}

<button onclick={() => stopAll.mutate([])}> Stop All </button>
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

Is moving: {isMoving.data ?? false}

<button onclick={() => moveStraight.mutate([100, 10])}> Move </button>
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
$inspect(machineStatus.query.error);
$inspect(machineStatus.query.fetching);
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
$inspect(resources.query.error);
$inspect(resources.query.fetching);
</script>
```

## Components

### `<CameraImage>`

Fetches a camera image at a constant interval and displays it in an `<img>` tag.

```svelte
<script lang="ts">
import { CameraImage } from '@viamrobotics/svelte-sdk';

interface Props {
  partID: string;
  name: string;
}

let { partID, name }: Props = $props();
</script>

<CameraImage
  {partID}
  {name}
  refetchInterval={2000}
/>
```

### `<CameraStream>`

Opens a camera stream and renders it in `<video>` tag.

```svelte
<script lang="ts">
import { CameraStream } from '@viamrobotics/svelte-sdk';

interface Props {
  partID: string;
  name: string;
}

let { partID, name }: Props = $props();
</script>

<CameraStream
  {partID}
  {name}
/>
```

## Debugging

### Logger

The SDK uses a built-in logger that writes all messages (including query/mutation request, response, and error events) to the browser console and an in-memory buffer.

By default the console output is enabled at the `info` level. Use `setSDKLogLevel` to change the level or silence the console entirely. The log buffer always captures all levels regardless of the console setting.

**Available log levels** (from `SDKLogLevel`): `trace`, `debug`, `info`, `warn`, `error`, `fatal`.

#### In your application code

```ts
import { setSDKLogLevel, SDKLogLevel } from '@viamrobotics/svelte-sdk';

// Show debug-level logs and above (includes query/mutation traces)
setSDKLogLevel(SDKLogLevel.debug);

// Silence the console (logs still accumulate in the buffer)
setSDKLogLevel(false);
```

#### From the browser console

```js
// Change the log level
window.setSDKLogLevel('debug');
window.setSDKLogLevel('info');

// Silence the console
window.setSDKLogLevel(false);

// Retrieve all buffered log entries (up to 1000)
window.getSDKLogs();

// Clear the log buffer
window.clearSDKLogs();
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
