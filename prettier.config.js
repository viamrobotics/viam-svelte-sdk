import path from 'node:path';

import baseConfig from '@viamrobotics/prettier-config-svelte';

/** @satisfies {import('prettier').Config} */
const config = {
  ...baseConfig,
  tailwindConfig: path.join(import.meta.dirname, 'tailwind.config.ts'),
};

export default config;
