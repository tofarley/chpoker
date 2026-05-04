<script lang="ts">
  import type { Arrangement, ArrangementNames } from '../lib/types';
  import Card from './Card.svelte';
  export let arrangement: Arrangement;
  export let names: ArrangementNames;
</script>

<div class="mini-arrangement">
  <div class="mini-row">
    <div class="mini-label">
      <span class="mini-row-name">Front</span>
      <span class="mini-hand">{names.front}</span>
    </div>
    <div class="mini-cards">
      {#each arrangement.front as card (card.id)}
        <Card {card} isStatic={true} />
      {/each}
    </div>
  </div>
  <div class="mini-row">
    <div class="mini-label">
      <span class="mini-row-name">Middle</span>
      <span class="mini-hand">{names.middle}</span>
    </div>
    <div class="mini-cards">
      {#each arrangement.middle as card (card.id)}
        <Card {card} isStatic={true} />
      {/each}
    </div>
  </div>
  <div class="mini-row">
    <div class="mini-label">
      <span class="mini-row-name">Back</span>
      <span class="mini-hand">{names.back}</span>
    </div>
    <div class="mini-cards">
      {#each arrangement.back as card (card.id)}
        <Card {card} isStatic={true} />
      {/each}
    </div>
  </div>
</div>

<style>
  .mini-arrangement {
    /* Match panel has more padding (opp block + main), so we go a touch
       smaller than the main board. At 15vw: 320px=48, 375px=56, 390px=58,
       430px=64. Caps at 60px on tablet+. */
    --card-w: clamp(44px, 15vw, 60px);
    --card-h: calc(var(--card-w) * 1.4);
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
  }
  /* Mini cards: a touch larger center glyph at full visibility. */
  .mini-arrangement :global(.card .center) {
    font-size: 1.7em;
    opacity: 0.88;
  }
  .mini-row {
    display: flex;
    flex-direction: column;
    gap: 0.18rem;
  }
  .mini-label {
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
    font-size: 0.78rem;
  }
  .mini-row-name {
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.6;
    width: 4.5em;
  }
  .mini-hand {
    opacity: 0.95;
    font-weight: 500;
  }
  .mini-cards {
    display: flex;
    gap: 3px;
    align-items: center;
    justify-content: flex-start;
  }
</style>
