import { defineMiddleware } from 'astro:middleware';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// In dev, Starlight's `[...slug]` catch-all matches playground URLs and 404s
// before Vite's static-file middleware gets a chance to resolve them. Read the
// matching file ourselves so the SvelteKit app build under `public/playground/`
// is served at the bare URL.
//
// Production is unaffected — GitHub Pages serves the static files directly,
// without Astro routing involved.
//
// SvelteKit emits relative asset paths (e.g. `./_app/...`) in its index.html,
// which only resolve correctly when the document URL ends at the right
// "directory" — `/playground/` (with trailing slash). The off-canonical form
// without a trailing slash is redirected so stale links keep working.
const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const playgroundDir = path.join(projectRoot, 'public', 'playground');
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

const playgroundPath = `${base}/playground/`;
const playgroundRedirect = `${base}/playground`;

export const onRequest = defineMiddleware(async (context, next) => {
  if (context.url.pathname === playgroundRedirect) {
    return Response.redirect(new URL(playgroundPath, context.url), 307);
  }

  if (context.url.pathname === playgroundPath) {
    const html = await readFile(path.join(playgroundDir, 'index.html'), 'utf8');
    return new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  return next();
});
