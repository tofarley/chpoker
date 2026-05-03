import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// On `vite build`, prefix asset URLs with /chpoker/ so they resolve at the
// GitHub Pages project subpath (https://tofarley.github.io/chpoker/). On
// `vite dev`, leave it as / so local dev works.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/chpoker/' : '/',
  plugins: [svelte()],
  server: { host: true }
}));
