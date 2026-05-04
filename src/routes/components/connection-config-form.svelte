<script lang="ts">
import type { DialConf } from '@viamrobotics/sdk';
import { addUserConfig } from '../configs.svelte';

interface Props {
  onadd?: (partID: string) => void;
}

let { onadd }: Props = $props();

const defaultSignalingAddress = 'https://app.viam.com:443';

let partID = $state('');
let host = $state('');
let apiKeyId = $state('');
let apiKeyValue = $state('');
let signalingAddress = $state(defaultSignalingAddress);

const reset = () => {
  partID = '';
  host = '';
  apiKeyId = '';
  apiKeyValue = '';
  signalingAddress = defaultSignalingAddress;
};

const submit = (event: SubmitEvent) => {
  event.preventDefault();

  const trimmedPartID = partID.trim();
  if (!trimmedPartID) {
    return;
  }

  const config: DialConf = {
    host: host.trim(),
    credentials: {
      type: 'api-key',
      authEntity: apiKeyId.trim(),
      payload: apiKeyValue,
    },
    signalingAddress: signalingAddress.trim() || defaultSignalingAddress,
    disableSessions: false,
  };

  addUserConfig(trimmedPartID, config);
  onadd?.(trimmedPartID);
  reset();
};

interface PastedConfig {
  partID?: string;
  host?: string;
  signalingAddress?: string;
  credentials?: {
    authEntity?: string;
    payload?: string;
  };
}

const isPastedConfig = (value: unknown): value is PastedConfig => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if (!('host' in value) || !('credentials' in value)) {
    return false;
  }
  const credentials = (value as { credentials: unknown }).credentials;
  return Boolean(credentials) && typeof credentials === 'object';
};

const onPaste = (event: ClipboardEvent) => {
  const text = event.clipboardData?.getData('text');
  if (!text) {
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return;
  }

  if (!isPastedConfig(parsed)) {
    return;
  }

  event.preventDefault();
  partID = parsed.partID ?? partID;
  host = parsed.host ?? '';
  apiKeyId = parsed.credentials?.authEntity ?? '';
  apiKeyValue = parsed.credentials?.payload ?? '';
  signalingAddress = parsed.signalingAddress ?? defaultSignalingAddress;
};
</script>

<details class="border border-gray-300 p-2 text-sm">
  <summary class="cursor-pointer">Add machine config</summary>

  <p class="mt-2 text-xs text-gray-600">
    Stored in this browser's <code>localStorage</code>. Paste a JSON
    <code>DialConf</code> into any field to autofill.
  </p>

  <form
    onsubmit={submit}
    onpaste={onPaste}
    class="mt-2 grid grid-cols-[auto_1fr] items-center gap-2 text-xs"
  >
    <label for="partID">Part ID</label>
    <input
      id="partID"
      class="border border-gray-300 p-1"
      bind:value={partID}
      required
    />

    <label for="host">Host</label>
    <input
      id="host"
      class="border border-gray-300 p-1"
      bind:value={host}
      required
    />

    <label for="apiKeyId">API key ID</label>
    <input
      id="apiKeyId"
      class="border border-gray-300 p-1"
      bind:value={apiKeyId}
      required
    />

    <label for="apiKeyValue">API key value</label>
    <input
      id="apiKeyValue"
      type="password"
      class="border border-gray-300 p-1"
      bind:value={apiKeyValue}
      required
    />

    <label for="signalingAddress">Signaling address</label>
    <input
      id="signalingAddress"
      class="border border-gray-300 p-1"
      bind:value={signalingAddress}
    />

    <button
      type="submit"
      class="col-span-2 border border-blue-300 bg-blue-100 p-1 text-blue-800 hover:bg-blue-200"
    >
      Add config
    </button>
  </form>
</details>
