import { defineConfig, type PluginOption } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Listens for `chpoker:target` HMR-socket messages from the client and
// pretty-prints the solver target to the dev-server terminal so we can
// see what the win condition should be without opening browser DevTools.
// Dev-only; the production bundle never hits this.
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const green  = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red    = (s: string) => `\x1b[31m${s}\x1b[0m`;
const dim    = (s: string) => `\x1b[2m${s}\x1b[0m`;

const debugLogPlugin: PluginOption = {
  name: 'chpoker-debug-log',
  configureServer(server) {
    server.ws.on('chpoker:target', (data: { target: TargetPayload }) => {
      const t = data.target;
      // eslint-disable-next-line no-console
      console.log([
        '',
        yellow('🎯 chpoker target  ') + dim('(triggers fireworks if user matches by name)'),
        `  Front : ${t.bestFront}  ${dim('— ' + t.bestFrontCards)}`,
        `  Middle: ${t.bestMiddle} ${dim('— ' + t.bestMiddleCards)}`,
        `  Back  : ${t.bestBack}   ${dim('— ' + t.bestBackCards)}`,
        dim(`  alt: strongest back=${t.strongestBack}, middle=${t.strongestMiddle}, front=${t.strongestFront}`),
        ''
      ].join('\n'));
    });

    server.ws.on('chpoker:solve', (data: SolvePayload) => {
      const mark = (ok: boolean) => ok ? green('✓ MATCH') : red('✗ DIFFER');
      const fOk = data.user.front  === data.target.front;
      const mOk = data.user.middle === data.target.middle;
      const bOk = data.user.back   === data.target.back;
      const legal = data.legal ? green('legal') : red('FOUL: ' + data.foulReason);
      const won = data.matched && data.legal;
      // eslint-disable-next-line no-console
      console.log([
        '',
        yellow('🟢 SOLVE clicked  ') + (won ? green('→ celebration fires') : dim('→ no celebration')),
        `  ${legal}`,
        `  Front : you=${data.user.front.padEnd(22)} target=${data.target.front.padEnd(22)} ${mark(fOk)}`,
        `  Middle: you=${data.user.middle.padEnd(22)} target=${data.target.middle.padEnd(22)} ${mark(mOk)}`,
        `  Back  : you=${data.user.back.padEnd(22)} target=${data.target.back.padEnd(22)} ${mark(bOk)}`,
        ''
      ].join('\n'));
    });
  }
};

interface TargetPayload {
  bestFront: string; bestFrontCards: string;
  bestMiddle: string; bestMiddleCards: string;
  bestBack: string; bestBackCards: string;
  strongestBack: string; strongestMiddle: string; strongestFront: string;
}
interface SolvePayload {
  user:   { front: string; middle: string; back: string };
  target: { front: string; middle: string; back: string };
  matched: boolean;
  legal: boolean;
  foulReason: string;
}

// On `vite build`, prefix asset URLs with /chpoker/ so they resolve at the
// GitHub Pages project subpath (https://tofarley.github.io/chpoker/). On
// `vite dev`, leave it as / so local dev works.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/chpoker/' : '/',
  plugins: [svelte(), debugLogPlugin],
  server: { host: true }
}));
