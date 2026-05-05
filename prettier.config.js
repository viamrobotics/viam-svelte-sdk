import path from 'node:path';

import baseConfig from '@viamrobotics/prettier-config-svelte';

/** @satisfies {import('prettier').Config} */
const config = {
  ...baseConfig,
  tailwindStylesheet: path.join(import.meta.dirname, 'src/app.css'),
};

export default config;
