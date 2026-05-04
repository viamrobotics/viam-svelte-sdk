import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import starlightThemeNova from 'starlight-theme-nova';

const base = process.env.DOCS_BASE ?? '/viam-svelte-sdk/';
const site = process.env.DOCS_SITE ?? 'https://viamrobotics.github.io';

export default defineConfig({
  site,
  base,
  integrations: [
    starlight({
      plugins: [starlightThemeNova()],
      title: 'Viam Svelte SDK',
      description: 'Reactive Svelte 5 hooks and components for building Viam-powered apps.',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/viamrobotics/viam-svelte-sdk',
        },
      ],
      customCss: [
        '@fontsource-variable/roboto-mono',
        '@fontsource-variable/public-sans',
        './src/tailwind.css',
      ],
      sidebar: [
        { label: 'Introduction', link: '/' },
        { label: 'Getting started', link: '/guides/getting-started/' },
        {
          label: 'Hooks',
          items: [
            { label: 'useRobotConnection', link: '/hooks/use-robot-connection/' },
            {
              label: 'useRobotClient',
              link: '/hooks/use-robot-client/',
              badge: { text: 'legacy', variant: 'caution' },
            },
            {
              label: 'createRobotQuery / Mutation',
              link: '/hooks/robot-query-mutation/',
            },
            {
              label: 'createResource* hooks',
              link: '/hooks/resource-query-mutation/',
            },
            { label: 'createStreamClient', link: '/hooks/stream-client/' },
            { label: 'useMachineStatus', link: '/hooks/machine-status/' },
            { label: 'useResourceNames', link: '/hooks/resource-names/' },
            { label: 'App hooks', link: '/hooks/app/' },
          ],
        },
        {
          label: 'Components',
          items: [
            { label: '<CameraImage>', link: '/components/camera-image/' },
            { label: '<CameraStream>', link: '/components/camera-stream/' },
          ],
        },
        { label: 'Debugging', link: '/guides/debugging/' },
        { label: 'Contributing', link: '/guides/contributing/' },
        { label: 'Playground', link: '/playground/' },
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
