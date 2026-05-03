<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher, tick } from 'svelte';
  import interact from 'interactjs';
  import type { Card, Arrangement, RowName } from '../lib/types';
  import { playSwap } from '../lib/sound';
  import HandRow from './HandRow.svelte';

  export let arrangement: Arrangement;
  export let backName = '';
  export let middleName = '';
  export let frontName = '';

  const dispatch = createEventDispatcher<{ change: Arrangement }>();

  let boardEl: HTMLDivElement;
  let interactInstance: ReturnType<typeof interact> | null = null;

  let pendingSwap = false;

  const ANIM_MS = 320;
  const ANIM_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

  function slotOf(cardEl: HTMLElement): HTMLElement {
    return (cardEl.closest('.card-slot') as HTMLElement) ?? cardEl;
  }

  // FLIP animation: snapshot card positions before the state change, then
  // after Svelte commits the new DOM, invert each moved card's transform and
  // animate to identity. The state change itself causes no visible layout
  // disruption — rows don't "expand to make room" because the animation only
  // applies a transform, which doesn't affect flex layout.
  function captureCardPositions(): Map<string, DOMRect> {
    const map = new Map<string, DOMRect>();
    if (!boardEl) return map;
    boardEl.querySelectorAll<HTMLElement>('.card').forEach(el => {
      const id = el.dataset.cardId;
      if (id) map.set(id, el.getBoundingClientRect());
    });
    return map;
  }

  async function animateChange(applyChange: () => void) {
    const before = captureCardPositions();
    applyChange();
    await tick();

    const moved: HTMLElement[] = [];
    boardEl.querySelectorAll<HTMLElement>('.card').forEach(el => {
      const id = el.dataset.cardId;
      if (!id) return;
      const oldRect = before.get(id);
      if (!oldRect) return;
      const newRect = el.getBoundingClientRect();
      const dx = oldRect.left - newRect.left;
      const dy = oldRect.top - newRect.top;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      // Invert: place the card back at its old position with no animation
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      moved.push(el);
    });

    if (moved.length === 0) return;

    // Force the inverted styles to commit, then play to identity.
    requestAnimationFrame(() => {
      for (const el of moved) {
        el.style.transition = `transform ${ANIM_MS}ms ${ANIM_EASING}`;
        el.style.transform = '';
      }
      setTimeout(() => {
        for (const el of moved) {
          el.style.transition = '';
        }
      }, ANIM_MS + 30);
    });
  }

  function rowOfCard(id: string): RowName | null {
    if (arrangement.front.some(c => c.id === id)) return 'front';
    if (arrangement.middle.some(c => c.id === id)) return 'middle';
    if (arrangement.back.some(c => c.id === id)) return 'back';
    return null;
  }

  function findCard(id: string): Card | null {
    return [...arrangement.front, ...arrangement.middle, ...arrangement.back]
      .find(c => c.id === id) ?? null;
  }

  function rowArr(a: Arrangement, name: RowName): Card[] {
    return name === 'front' ? a.front : name === 'middle' ? a.middle : a.back;
  }

  function withRow(a: Arrangement, name: RowName, cards: Card[]): Arrangement {
    if (name === 'front') return { ...a, front: cards };
    if (name === 'middle') return { ...a, middle: cards };
    return { ...a, back: cards };
  }

  function rowTarget(name: RowName): number {
    return name === 'front' ? 3 : 5;
  }

  function moveCard(cardId: string, targetRow: RowName, dropX: number) {
    const sourceRow = rowOfCard(cardId);
    if (!sourceRow) return false;
    if (sourceRow === targetRow) return false;
    const card = findCard(cardId);
    if (!card) return false;

    const targetCards = rowArr(arrangement, targetRow);
    const sourceCards = rowArr(arrangement, sourceRow).filter(c => c.id !== cardId);

    let next: Arrangement;
    if (targetCards.length < rowTarget(targetRow)) {
      next = withRow(arrangement, targetRow, [...targetCards, card]);
      next = withRow(next, sourceRow, sourceCards);
    } else {
      const swapIdx = nearestCardIndex(targetRow, dropX);
      const swapCard = targetCards[swapIdx];
      const newTarget = targetCards.slice();
      newTarget[swapIdx] = card;
      next = withRow(arrangement, targetRow, newTarget);
      next = withRow(next, sourceRow, [...sourceCards, swapCard]);
    }
    void animateChange(() => dispatch('change', next));
    return true;
  }

  function swapCards(idA: string, idB: string) {
    if (idA === idB) return false;
    const ra = rowOfCard(idA);
    const rb = rowOfCard(idB);
    if (!ra || !rb) return false;
    if (ra === rb) {
      const arr = rowArr(arrangement, ra).slice();
      const ia = arr.findIndex(c => c.id === idA);
      const ib = arr.findIndex(c => c.id === idB);
      [arr[ia], arr[ib]] = [arr[ib], arr[ia]];
      void animateChange(() => dispatch('change', withRow(arrangement, ra, arr)));
      return true;
    }
    const ca = findCard(idA)!;
    const cb = findCard(idB)!;
    const arrA = rowArr(arrangement, ra).map(c => c.id === idA ? cb : c);
    const arrB = rowArr(arrangement, rb).map(c => c.id === idB ? ca : c);
    let next = withRow(arrangement, ra, arrA);
    next = withRow(next, rb, arrB);
    void animateChange(() => dispatch('change', next));
    return true;
  }

  function nearestCardIndex(row: RowName, x: number): number {
    const rowEl = boardEl.querySelector<HTMLElement>(`[data-row-target][data-row-name="${row}"]`);
    if (!rowEl) return 0;
    const cardEls = rowEl.querySelectorAll<HTMLElement>('.card');
    let best = 0;
    let bestDist = Infinity;
    cardEls.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const d = Math.abs(cx - x);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  }

  onMount(() => {
    interactInstance = interact('.card', { context: boardEl })
      .draggable({
        inertia: false,
        autoScroll: false,
        listeners: {
          start(event) {
            const slot = slotOf(event.target as HTMLElement);
            event.target.classList.add('dragging');
            slot.style.zIndex = '1000';
            slot.style.position = 'relative';
            pendingSwap = false;
          },
          move(event) {
            const slot = slotOf(event.target as HTMLElement);
            const x = (parseFloat(slot.getAttribute('data-x') || '0')) + event.dx;
            const y = (parseFloat(slot.getAttribute('data-y') || '0')) + event.dy;
            slot.style.transform = `translate(${x}px, ${y}px)`;
            slot.setAttribute('data-x', String(x));
            slot.setAttribute('data-y', String(y));
          },
          end(event) {
            const t = event.target as HTMLElement;
            const slot = slotOf(t);
            t.classList.remove('dragging');
            if (pendingSwap) {
              // The drop fired animateChange already, which captured this
              // card's current (dragged) position before destroying the slot.
              pendingSwap = false;
              return;
            }
            // No drop — snap the slot back smoothly.
            slot.style.transition = 'transform 0.18s ease';
            slot.style.transform = '';
            slot.setAttribute('data-x', '0');
            slot.setAttribute('data-y', '0');
            setTimeout(() => {
              slot.style.transition = '';
              slot.style.zIndex = '';
              slot.style.position = '';
            }, 200);
          }
        }
      });

    interact('.card', { context: boardEl }).dropzone({
      accept: '.card',
      overlap: 0.5,
      ondropactivate(event) {
        (event.target as HTMLElement).classList.add('drop-active');
      },
      ondragenter(event) {
        (event.target as HTMLElement).classList.add('drop-target');
      },
      ondragleave(event) {
        (event.target as HTMLElement).classList.remove('drop-target');
      },
      ondrop(event) {
        const targetEl = event.target as HTMLElement;
        const draggedEl = event.relatedTarget as HTMLElement;
        targetEl.classList.remove('drop-target');
        const a = draggedEl.dataset.cardId!;
        const b = targetEl.dataset.cardId!;
        const did = swapCards(a, b);
        if (did) {
          pendingSwap = true;
          playSwap();
        }
      },
      ondropdeactivate(event) {
        (event.target as HTMLElement).classList.remove('drop-active');
        (event.target as HTMLElement).classList.remove('drop-target');
      }
    });

    interact('.row', { context: boardEl }).dropzone({
      accept: '.card',
      overlap: 'pointer',
      ondragenter(event) {
        (event.target as HTMLElement).classList.add('row-target');
      },
      ondragleave(event) {
        (event.target as HTMLElement).classList.remove('row-target');
      },
      ondrop(event) {
        const rowEl = event.target as HTMLElement;
        const draggedEl = event.relatedTarget as HTMLElement;
        rowEl.classList.remove('row-target');
        const cardId = draggedEl.dataset.cardId!;
        const rowName = rowEl.dataset.rowName as RowName;
        const ev = event.dragEvent;
        const dropX = ev.client?.x ?? ev.pageX ?? 0;
        const did = moveCard(cardId, rowName, dropX);
        if (did) {
          pendingSwap = true;
          playSwap();
        }
      },
      ondropdeactivate(event) {
        (event.target as HTMLElement).classList.remove('row-target');
      }
    });
  });

  onDestroy(() => {
    if (interactInstance) interactInstance.unset();
  });
</script>

<div class="board" bind:this={boardEl}>
  <HandRow label="Front" rowName="front" cards={arrangement.front} target={3} subtitle={frontName} />
  <HandRow label="Middle" rowName="middle" cards={arrangement.middle} target={5} subtitle={middleName} />
  <HandRow label="Back" rowName="back" cards={arrangement.back} target={5} subtitle={backName} />
</div>

<style>
  .board {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  :global(.card.drop-target) {
    outline: 2px solid var(--gold);
    outline-offset: 2px;
  }
  :global(.row.row-target) {
    background: rgba(212, 175, 55, 0.12);
    border-color: var(--gold);
  }
</style>
