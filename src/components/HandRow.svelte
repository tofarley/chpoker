<script lang="ts">
  import type { Card as CardT, RowName } from '../lib/types';
  import Card from './Card.svelte';
  export let label: string;
  export let cards: CardT[];
  export let target: number;
  export let rowName: RowName;
  export let subtitle = '';
</script>

<div class="row" data-row-target={target} data-row-name={rowName}>
  <div class="row-label">
    <span class="name">{label}</span>
    <span class="count">{cards.length}/{target}</span>
    {#if subtitle}<span class="subtitle">{subtitle}</span>{/if}
  </div>
  <div class="cards">
    {#each cards as card (card.id)}
      <div class="card-slot">
        <Card {card} />
      </div>
    {/each}
    {#if cards.length === 0}
      <div class="empty">empty</div>
    {/if}
  </div>
</div>

<style>
  .row {
    background: var(--row-bg);
    border: 1px solid var(--row-border);
    border-radius: 12px;
    padding: 0.5rem 0.75rem 0.6rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    min-height: calc(var(--card-h, 78px) + 2.2rem);
  }
  .row-label {
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.85;
  }
  .row-label .name { font-weight: 700; }
  .row-label .count {
    opacity: 0.6;
    font-variant-numeric: tabular-nums;
  }
  .row-label .subtitle {
    margin-left: auto;
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.85rem;
    opacity: 0.95;
    font-weight: 500;
  }
  .cards {
    display: flex;
    flex-wrap: nowrap;
    gap: 4px;
    align-items: center;
    justify-content: center;
    min-height: var(--card-h, 78px);
  }
  .card-slot {
    flex: 0 0 auto;
  }
  .empty {
    color: rgba(255,255,255,0.35);
    font-style: italic;
    font-size: 0.8rem;
    padding-left: 0.4rem;
  }
</style>
