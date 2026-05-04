<script lang="ts">
  import type { ArrangementNames, MatchResult, RowOutcome } from '../lib/types';
  import MiniArrangement from './MiniArrangement.svelte';
  export let result: MatchResult;
  export let userNames: ArrangementNames;

  function fmtPoints(n: number): string {
    return n > 0 ? `+${n}` : `${n}`;
  }
  function outcomeMark(o: RowOutcome): string {
    return o === 'win' ? '✓' : o === 'loss' ? '✗' : '–';
  }
  function pointsClass(n: number): string {
    if (n > 0) return 'win';
    if (n < 0) return 'loss';
    return 'tie';
  }
</script>

<section class="match-panel">
  <!-- User's score: the headline answer -->
  <div class="you-card {pointsClass(result.total)}">
    <div class="you-tag">YOUR SCORE</div>
    <div class="you-points">{fmtPoints(result.total)}</div>
    <div class="you-suffix">across {result.opponents.length} opponent{result.opponents.length === 1 ? '' : 's'}</div>
    <div class="you-hand">
      <div class="you-row"><span class="you-row-label">Front</span><span class="you-row-name">{userNames.front}</span></div>
      <div class="you-row"><span class="you-row-label">Middle</span><span class="you-row-name">{userNames.middle}</span></div>
      <div class="you-row"><span class="you-row-label">Back</span><span class="you-row-name">{userNames.back}</span></div>
    </div>
  </div>

  <div class="vs-divider"><span>vs Opponents</span></div>

  {#each result.opponents as opp, i}
    <div class="opponent">
      <div class="opp-header">
        <span class="opp-name">Opponent {i + 1}</span>
        <span class="opp-points {pointsClass(opp.points)}">{fmtPoints(opp.points)}</span>
        {#if opp.scooped === 'us'}<span class="badge scoop">you scooped</span>{/if}
        {#if opp.scooped === 'them'}<span class="badge scooped">they scooped</span>{/if}
      </div>
      <div class="opp-rows">
        <div class="opp-row {opp.outcomes.front}">
          <span class="opp-row-mark">{outcomeMark(opp.outcomes.front)}</span>
          <span class="opp-row-label">FRONT</span>
          <span class="opp-row-name">{userNames.front} <span class="vs">vs</span> {opp.names.front}</span>
        </div>
        <div class="opp-row {opp.outcomes.middle}">
          <span class="opp-row-mark">{outcomeMark(opp.outcomes.middle)}</span>
          <span class="opp-row-label">MIDDLE</span>
          <span class="opp-row-name">{userNames.middle} <span class="vs">vs</span> {opp.names.middle}</span>
        </div>
        <div class="opp-row {opp.outcomes.back}">
          <span class="opp-row-mark">{outcomeMark(opp.outcomes.back)}</span>
          <span class="opp-row-label">BACK</span>
          <span class="opp-row-name">{userNames.back} <span class="vs">vs</span> {opp.names.back}</span>
        </div>
      </div>
      <MiniArrangement arrangement={opp.arrangement} names={opp.names} />
    </div>
  {/each}
</section>

<style>
  .match-panel {
    margin-top: 1.2rem;
    padding: 0;
  }

  /* === Your score: the headline === */
  .you-card {
    background: linear-gradient(135deg, rgba(212,175,55,0.16), rgba(212,175,55,0.06));
    border: 1px solid rgba(212,175,55,0.45);
    border-radius: 14px;
    padding: 0.9rem 1rem 0.8rem;
    text-align: center;
    position: relative;
  }
  .you-card.win  { border-color: var(--status-good); background: linear-gradient(135deg, rgba(95,208,132,0.18), rgba(95,208,132,0.06)); }
  .you-card.loss { border-color: var(--status-bad);  background: linear-gradient(135deg, rgba(255,107,107,0.18), rgba(255,107,107,0.06)); }
  .you-card.tie  { border-color: rgba(255,255,255,0.25); }

  .you-tag {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-weight: 700;
    opacity: 0.7;
  }
  .you-points {
    font-size: 2.6rem;
    font-weight: 800;
    line-height: 1;
    margin: 0.2rem 0 0.15rem;
    font-variant-numeric: tabular-nums;
  }
  .you-card.win  .you-points { color: var(--status-good); }
  .you-card.loss .you-points { color: var(--status-bad); }
  .you-card.tie  .you-points { color: rgba(255,255,255,0.85); }
  .you-suffix {
    font-size: 0.75rem;
    opacity: 0.55;
    margin-bottom: 0.55rem;
  }
  .you-hand {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.3rem 0.9rem;
    padding-top: 0.5rem;
    border-top: 1px dashed rgba(255,255,255,0.12);
  }
  .you-row {
    font-size: 0.82rem;
    display: flex;
    gap: 0.35rem;
    align-items: baseline;
  }
  .you-row-label {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.55;
    font-weight: 700;
  }
  .you-row-name { opacity: 0.95; }

  /* === Divider between you and the opponents === */
  .vs-divider {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 1.1rem 0 0.5rem;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: rgba(255,255,255,0.45);
    font-weight: 700;
  }
  .vs-divider::before, .vs-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: rgba(255,255,255,0.15);
  }

  /* === Per-opponent block === */
  .opponent {
    background: rgba(0,0,0,0.32);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 0.7rem 1rem 0.85rem;
    margin-top: 0.55rem;
  }
  .opponent:first-of-type { margin-top: 0; }
  .opp-header {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }
  .opp-name {
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.7;
    font-weight: 700;
  }
  .opp-points {
    font-size: 1.05rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .opp-points.win  { color: var(--status-good); }
  .opp-points.loss { color: var(--status-bad); }
  .opp-points.tie  { color: rgba(255,255,255,0.55); }

  .badge {
    margin-left: auto;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.15rem 0.45rem;
    border-radius: 6px;
    font-weight: 700;
  }
  .badge.scoop   { background: rgba(95, 208, 132, 0.18); color: var(--status-good); }
  .badge.scooped { background: rgba(255, 107, 107, 0.18); color: var(--status-bad); }

  .opp-rows {
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
    margin-bottom: 0.45rem;
  }
  .opp-row {
    display: grid;
    grid-template-columns: 1.4em 4.5em 1fr;
    gap: 0.6rem;
    align-items: baseline;
    font-size: 0.85rem;
  }
  .opp-row.win  .opp-row-mark { color: var(--status-good); }
  .opp-row.loss .opp-row-mark { color: var(--status-bad); }
  .opp-row.tie  .opp-row-mark { color: rgba(255,255,255,0.45); }
  .opp-row-mark {
    font-weight: 700;
    text-align: center;
  }
  .opp-row-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.55;
  }
  .opp-row-name {
    opacity: 0.92;
  }
  .opp-row-name .vs {
    opacity: 0.4;
    font-size: 0.78em;
    font-weight: 500;
    letter-spacing: 0.04em;
    margin: 0 0.15em;
  }
</style>
