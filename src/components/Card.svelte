<script lang="ts">
  import type { Card } from '../lib/types';
  import { RANK_LABEL, SUIT_GLYPH } from '../lib/deck';
  export let card: Card;
  export let isStatic = false;
  $: red = card.suit === 'h' || card.suit === 'd';
  $: label = RANK_LABEL[card.rank];
  $: glyph = SUIT_GLYPH[card.suit];
</script>

<div class="card" class:red class:static={isStatic} data-card-id={card.id}>
  <div class="corner top">
    <span class="rank">{label}</span>
    <span class="suit">{glyph}</span>
  </div>
  <div class="center">{glyph}</div>
  <div class="corner bottom">
    <span class="rank">{label}</span>
    <span class="suit">{glyph}</span>
  </div>
</div>

<style>
  .card {
    width: var(--card-w, 56px);
    height: var(--card-h, 78px);
    /* Typography scales with card width via em — keeps mini and full-size
       cards visually consistent. Don't reintroduce vw/clamp font sizing here
       or the mini-cards will blow up again. */
    font-size: calc(var(--card-w, 56px) * 0.26);
    background: var(--card-bg);
    color: var(--black);
    border-radius: calc(var(--card-w, 56px) * 0.1);
    border: 1px solid rgba(0, 0, 0, 0.35);
    box-shadow: 0 1px 2px rgba(0,0,0,0.3), 0 4px 8px rgba(0,0,0,0.18);
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 0.3em 0.45em;
    font-weight: 700;
    line-height: 1;
    cursor: grab;
    touch-action: none;
    /* No transform transition by default — interactjs needs every move to land
       instantly. The snap-back animation on drag-end is applied via inline
       style in Board.svelte. */
    transition: box-shadow 0.12s ease;
    will-change: transform;
  }
  .card.static {
    cursor: default;
    touch-action: auto;
    will-change: auto;
  }
  .card.red { color: var(--red); }
  :global(.card.dragging) {
    cursor: grabbing;
    box-shadow: 0 6px 18px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.3);
    z-index: 1000;
    transition: none;
  }
  .corner {
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1;
    /* corner inherits .card font-size (1em) */
  }
  .corner.bottom { transform: rotate(180deg); }
  .corner .rank { letter-spacing: -0.05em; }
  .corner .suit { font-size: 0.85em; line-height: 1; }
  .center {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5em;
    pointer-events: none;
    opacity: 0.88;
  }
</style>
