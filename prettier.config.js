import url from 'node:url';

import baseConfig from '@viamrobotics/prettier-config-svelte';

// Resolve plugins from this package's context so the locally-installed versions
// (compatible with prettier@3.7+) are used rather than the versions bundled
// with @viamrobotics/prettier-config-svelte.
const sveltePlugin = url.fileURLToPath(
  import.meta.resolve('prettier-plugin-svelte')
);
const tailwindPlugin = url.fileURLToPath(
  import.meta.resolve('prettier-plugin-tailwindcss')
);

/** @satisfies {import('prettier').Config} */
const config = {
  ...baseConfig,
  plugins: [sveltePlugin, tailwindPlugin],
};

export default config;
