import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://svelte.dev/docs/kit/integrations
  // for more information about preprocessors
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(),
    paths: {
      // Set by the docs and pr-preview workflows so the static demo build
      // resolves assets under the deployed subpath (no trailing slash).
      base: process.env.BASE_PATH ?? '',
    },
  },
};

export default config;
