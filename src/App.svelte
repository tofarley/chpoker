<script lang="ts">
  import { fly } from 'svelte/transition';
  import { dealRound, type Round } from './lib/deck';
  import { checkArrangement, solve } from './lib/solver';
  import { nameHand3, nameHand5 } from './lib/evaluator';
  import { playMatch } from './lib/match';
  import { soundEnabled, playWin } from './lib/sound';
  import type { Arrangement, MatchResult, SolveResult } from './lib/types';
  import Board from './components/Board.svelte';
  import MiniArrangement from './components/MiniArrangement.svelte';
  import MatchPanel from './components/MatchPanel.svelte';
  import Fireworks from './components/Fireworks.svelte';

  let round: Round = dealRound();
  let arrangement: Arrangement = freshDeal();
  let solveResult: SolveResult | null = null;
  let matchResult: MatchResult | null = null;
  let showSolve = false;
  let showMatch = false;
  let showCelebration = false;
  let celebrationMessage = '';

  // Send initial deal's target to the vite dev server.
  sendDebugTarget(arrangement);

  function freshDeal(): Arrangement {
    const cards = round.player;
    return {
      back: cards.slice(0, 5),
      middle: cards.slice(5, 10),
      front: cards.slice(10, 13)
    };
  }

  function deal() {
    round = dealRound();
    arrangement = freshDeal();
    solveResult = null;
    matchResult = null;
    showSolve = false;
    showMatch = false;
    showCelebration = false;
    sendDebugTarget(arrangement);
  }

  function runPlay() {
    matchResult = playMatch(arrangement, round.opponents);
    showMatch = true;
    showSolve = false;

    // Celebrate if our total >= the best individual opponent's score.
    // opp.points is OUR score against that opponent (positive = we beat them),
    // so the opponent's score from their POV is -opp.points.
    if (matchResult.opponents.length > 0) {
      const bestOpponent = Math.max(...matchResult.opponents.map(o => -o.points));
      if (matchResult.total >= bestOpponent) {
        celebrationMessage = '🎉 You beat the field!';
        showCelebration = true;
        playWin();
      }
    }
  }

  // Send the per-hand target to the vite dev-server terminal via the HMR
  // socket. Dev-only — `import.meta.hot` is undefined in the production
  // bundle, so this is a no-op once deployed.
  function sendDebugTarget(a: Arrangement) {
    if (!import.meta.hot) return;
    const all = [...a.back, ...a.middle, ...a.front];
    const r = solve(all);
    const fmt = (cards: { rank: number; suit: string }[]) =>
      cards.map(c => `${c.rank}${c.suit}`).join(' ');
    import.meta.hot.send('chpoker:target', {
      target: {
        bestFront: r.optimumNames.front,
        bestFrontCards: fmt(r.optimum.front),
        bestMiddle: r.optimumNames.middle,
        bestMiddleCards: fmt(r.optimum.middle),
        bestBack: r.optimumNames.back,
        bestBackCards: fmt(r.optimum.back),
        strongestBack: r.strongestBackNames.back,
        strongestMiddle: r.strongestMiddleNames.middle,
        strongestFront: r.strongestFrontNames.front
      }
    });
  }

  function runSolve() {
    const all = [...arrangement.back, ...arrangement.middle, ...arrangement.front];
    solveResult = solve(all, arrangement);
    showSolve = true;
    showMatch = false;

    // Spirit match: same hand-name on every row as the balanced optimum
    // (kickers / suits may differ). If yes, celebrate.
    const userBack = nameHand5(arrangement.back);
    const userMiddle = nameHand5(arrangement.middle);
    const userFront = nameHand3(arrangement.front);
    const opt = solveResult.optimumNames;
    const matched = userFront === opt.front && userMiddle === opt.middle && userBack === opt.back;

    if (solveResult.userIsLegal && matched) {
      celebrationMessage = '🎉 You found the best play!';
      showCelebration = true;
      playWin();
    }

    if (import.meta.hot) {
      import.meta.hot.send('chpoker:solve', {
        user: { front: userFront, middle: userMiddle, back: userBack },
        target: { front: opt.front, middle: opt.middle, back: opt.back },
        matched,
        legal: solveResult.userIsLegal,
        foulReason: solveResult.userFoulReason ?? ''
      });
    }
  }

  function applyArrangement(a: Arrangement) {
    arrangement = a;
    showSolve = false;
  }

  function arrangementKey(a: Arrangement): string {
    return [a.front, a.middle, a.back]
      .map(row => row.map(c => c.id).sort().join(','))
      .join('|');
  }

  $: check = checkArrangement(arrangement);
  $: countsOk = arrangement.back.length === 5 && arrangement.middle.length === 5 && arrangement.front.length === 3;
  $: status = !countsOk
    ? `Counts: ${arrangement.front.length}/3 · ${arrangement.middle.length}/5 · ${arrangement.back.length}/5`
    : check.legal
      ? '✓ Legal arrangement'
      : `✗ Foul: ${check.reason}`;
  $: liveBack = arrangement.back.length === 5 ? nameHand5(arrangement.back) : '';
  $: liveMiddle = arrangement.middle.length === 5 ? nameHand5(arrangement.middle) : '';
  $: liveFront = arrangement.front.length === 3 ? nameHand3(arrangement.front) : '';

  function onChange(ev: CustomEvent<Arrangement>) {
    arrangement = ev.detail;
  }
</script>

<main>
  <header>
    <h1>Chinese Poker Puzzle</h1>
    <p class="tag">Arrange 13 cards into Front (3) · Middle (5) · Back (5). Each row must beat the row above it: Back &gt; Middle &gt; Front.</p>
  </header>

  <Board
    arrangement={arrangement}
    backName={liveBack}
    middleName={liveMiddle}
    frontName={liveFront}
    on:change={onChange} />

  <div class="status" class:bad={countsOk && !check.legal}>{status}</div>

  <div class="actions">
    <button on:click={deal}>Deal new</button>
    <button on:click={runSolve} disabled={!countsOk}>Solve</button>
    <button on:click={runPlay} disabled={!countsOk || !check.legal}>Play vs AI</button>
    <button
      class="secondary icon-btn"
      title={$soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
      aria-label={$soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
      on:click={() => soundEnabled.update(v => !v)}>
      {$soundEnabled ? '🔊' : '🔇'}
    </button>
  </div>

  {#if showMatch && matchResult}
    <MatchPanel
      result={matchResult}
      userNames={{ front: liveFront, middle: liveMiddle, back: liveBack }} />
  {/if}

  {#if showCelebration}
    <Fireworks on:done={() => showCelebration = false} />
    <div class="celebration-banner" transition:fly={{ y: -40, duration: 280 }}>
      {celebrationMessage}
      <div class="celebration-sub">Your arrangement matches the best balanced solution.</div>
    </div>
  {/if}

  {#if showSolve && solveResult}
    {@const sr = solveResult}
    {@const userKey = arrangementKey(arrangement)}
    {@const optKey = arrangementKey(sr.optimum)}
    {@const backKey = arrangementKey(sr.strongestBack)}
    {@const middleKey = arrangementKey(sr.strongestMiddle)}
    {@const frontKey = arrangementKey(sr.strongestFront)}
    <section class="solve-panel">
      <header>
        <h2>Solver</h2>
        <button class="secondary close" on:click={() => showSolve = false}>×</button>
      </header>

      <div class="solve-section">
        <div class="solve-title">
          <span>Best balanced</span>
          <span class="hint">max product of hand strengths</span>
        </div>
        <MiniArrangement arrangement={sr.optimum} names={sr.optimumNames} />
        <button class="apply" on:click={() => applyArrangement(sr.optimum)} disabled={userKey === optKey}>
          {userKey === optKey ? 'Already applied' : 'Apply this arrangement'}
        </button>
      </div>

      <div class="solve-section">
        <div class="solve-title">
          <span>Strongest possible Back</span>
          {#if backKey === optKey}<span class="hint">same as balanced</span>{/if}
        </div>
        {#if backKey !== optKey}
          <MiniArrangement arrangement={sr.strongestBack} names={sr.strongestBackNames} />
          <button class="apply" on:click={() => applyArrangement(sr.strongestBack)} disabled={userKey === backKey}>
            {userKey === backKey ? 'Already applied' : 'Apply this arrangement'}
          </button>
        {/if}
      </div>

      <div class="solve-section">
        <div class="solve-title">
          <span>Strongest possible Middle</span>
          {#if middleKey === optKey}<span class="hint">same as balanced</span>{:else if middleKey === backKey}<span class="hint">same as strongest-back</span>{/if}
        </div>
        {#if middleKey !== optKey && middleKey !== backKey}
          <MiniArrangement arrangement={sr.strongestMiddle} names={sr.strongestMiddleNames} />
          <button class="apply" on:click={() => applyArrangement(sr.strongestMiddle)} disabled={userKey === middleKey}>
            {userKey === middleKey ? 'Already applied' : 'Apply this arrangement'}
          </button>
        {/if}
      </div>

      <div class="solve-section">
        <div class="solve-title">
          <span>Strongest possible Front</span>
          {#if frontKey === optKey}<span class="hint">same as balanced</span>{:else if frontKey === backKey}<span class="hint">same as strongest-back</span>{:else if frontKey === middleKey}<span class="hint">same as strongest-middle</span>{/if}
        </div>
        {#if frontKey !== optKey && frontKey !== backKey && frontKey !== middleKey}
          <MiniArrangement arrangement={sr.strongestFront} names={sr.strongestFrontNames} />
          <button class="apply" on:click={() => applyArrangement(sr.strongestFront)} disabled={userKey === frontKey}>
            {userKey === frontKey ? 'Already applied' : 'Apply this arrangement'}
          </button>
        {/if}
      </div>

      <div class="solve-section">
        <div class="solve-title">Your arrangement</div>
        {#if sr.userIsLegal}
          <div class="hand-line ok">Legal ✓</div>
        {:else}
          <div class="hand-line foul">Foul: {sr.userFoulReason}</div>
        {/if}
      </div>
    </section>
  {/if}
</main>

<style>
  main {
    max-width: 720px;
    margin: 0 auto;
    padding: 0.8rem 0.8rem max(env(safe-area-inset-bottom), 1rem);
    --card-w: clamp(44px, 10.5vw, 70px);
    --card-h: calc(var(--card-w) * 1.4);
  }
  header { text-align: center; margin: 0.5rem 0 1rem; }
  h1 {
    font-size: clamp(1.1rem, 4vw, 1.5rem);
    margin: 0;
    letter-spacing: 0.02em;
    font-weight: 700;
  }
  .tag {
    margin: 0.2rem 0 0;
    opacity: 0.65;
    font-size: 0.82rem;
  }
  .status {
    margin-top: 0.7rem;
    text-align: center;
    font-size: 0.9rem;
    color: var(--status-good);
    font-weight: 600;
    min-height: 1.4em;
  }
  .status.bad { color: var(--status-bad); }
  .actions {
    margin-top: 0.7rem;
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  .icon-btn {
    padding: 0.6rem 0.7rem;
    font-size: 1rem;
    line-height: 1;
  }
  .celebration-banner {
    position: fixed;
    top: max(1rem, env(safe-area-inset-top));
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #d4af37, #f5d272);
    color: #1a1a1a;
    padding: 0.75rem 1.2rem;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.3);
    font-weight: 700;
    text-align: center;
    z-index: 1001;
    pointer-events: none;
    max-width: calc(100vw - 2rem);
  }
  .celebration-sub {
    font-size: 0.78rem;
    font-weight: 500;
    opacity: 0.85;
    margin-top: 0.15rem;
  }
  .solve-panel {
    margin-top: 1.2rem;
    background: rgba(0,0,0,0.32);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 0.8rem 1rem 1rem;
  }
  .solve-panel header {
    display: flex;
    align-items: center;
    text-align: left;
    margin: 0 0 0.6rem;
  }
  .solve-panel h2 {
    font-size: 1rem;
    margin: 0;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    opacity: 0.85;
  }
  .solve-panel .close {
    margin-left: auto;
    padding: 0.2rem 0.6rem;
    font-size: 1.1rem;
    line-height: 1;
  }
  .solve-section {
    margin: 0.7rem 0;
    padding-top: 0.7rem;
    border-top: 1px solid rgba(255,255,255,0.08);
  }
  .solve-section:first-of-type { border-top: none; padding-top: 0; }
  .solve-title {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.85;
    margin-bottom: 0.5rem;
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
    flex-wrap: wrap;
  }
  .solve-title .hint {
    font-size: 0.7rem;
    text-transform: none;
    letter-spacing: 0;
    opacity: 0.55;
    font-weight: 400;
  }
  .hand-line { font-size: 0.95rem; line-height: 1.5; }
  .hand-line.ok { color: var(--status-good); }
  .hand-line.foul { color: var(--status-bad); }
  .apply {
    margin-top: 0.5rem;
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
  }
</style>
