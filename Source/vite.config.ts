import { defineConfig, loadEnv, type Plugin } from 'vite';

/** Fills %SITE_URL% in index.html from VITE_SITE_URL (e.g. https://poise.example), so share cards get absolute URLs. */
const siteUrl = (url: string): Plugin => ({
  name: 'site-url',
  transformIndexHtml: html => html.replaceAll('%SITE_URL%', url.replace(/\/$/, '')),
  buildStart() { if (!url && process.env.NODE_ENV === 'production') console.warn('\n[poise] VITE_SITE_URL is not set: share cards (og:image) and the canonical link will be relative. Set it to your public URL before deploying.\n') },
});

export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [siteUrl(loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL ?? '')],
  server: { port: 5173, strictPort: true },
  build: { target: 'es2020', sourcemap: true },
}));
