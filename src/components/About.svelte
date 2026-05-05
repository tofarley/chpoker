<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher<{ back: void }>();
</script>

<main class="about">
  <header>
    <h1>About</h1>
    <button class="back" on:click={() => dispatch('back')}>← Back to puzzle</button>
  </header>

  <p class="lede">
    A single-player Chinese Poker puzzle and AI sandbox. Built openly with
    serious help from prior work — credit and links below.
  </p>

  <section>
    <h2>Sources we leaned on</h2>

    <div class="card">
      <h3><a href="https://www.primedope.com/play-online-chinese-poker/" target="_blank" rel="noopener">primedope.com — Play Chinese Poker</a></h3>
      <p>
        The original online tool this project set out to improve on. The
        underlying solver works correctly; the UI is functional but didn't
        feel modern. We rebuilt with proper drag-and-drop, animation, sound,
        and a celebration UX, but the core game design and "Play vs the AI"
        feature are direct responses to theirs.
      </p>
      <p>
        We also use their solver as our <strong>test oracle</strong>: their
        client-side <code>chinese-poker.js</code> is loaded into a Node VM
        during fixture generation, and 122 fixtures (12 hand-picked edge
        cases + 110 random) lock our solver's output against theirs.
        Strongest-back and strongest-middle agree on every fixture.
      </p>
    </div>

    <div class="card">
      <h3><a href="https://www.primedope.com/chinese-poker-rules-strategy-tips/" target="_blank" rel="noopener">primedope.com — Rules & Hand-Setting Strategy</a></h3>
      <p>
        The rules reference we worked from, and the strategy guide that
        informed every difficulty-tuning decision. The insight that "front
        pairs win disproportionately often" came directly from their
        analysis, and shaped how we evaluated different scoring functions
        for The Professor.
      </p>
    </div>

    <div class="card">
      <h3><a href="https://pkg.go.dev/github.com/paulhankin/cpoker" target="_blank" rel="noopener">paulhankin / cpoker (Go)</a></h3>
      <p>
        Paul Hankin's Go implementation of a closed-hand Chinese Poker
        AI. We mirrored:
      </p>
      <ul>
        <li>The 72,072-partition enumeration (every legal split of 13 cards into 3+5+5)</li>
        <li>The <code>MaxProdEvaluator</code> heuristic — max product of normalized hand-rank percentiles — which our "Best balanced" optimum and Solid Sam's strategy both use</li>
        <li>The mode-0 EV-aware scoring formula (scoop/scooped probability + per-row expected wins) that The Professor uses to pick arrangements</li>
      </ul>
    </div>
  </section>

  <section>
    <h2>How the AI tiers work</h2>
    <p>The three opponent slots play distinct strategies, all derived from the same 72k-partition enumeration:</p>
    <ul>
      <li><strong>The Tourist</strong> plays "lex max back" — always picks the strongest legal back hand and lets the front fend for itself. A coherent beginner's mental model that consistently leaves the front weak.</li>
      <li><strong>Solid Sam</strong> plays max-product (the cpoker MaxProdEvaluator heuristic). Balanced and solid.</li>
      <li><strong>The Professor</strong> plays the cpoker mode-0 EV-aware formula directly: <code>6·pScoop − 6·pScooped + (1 − pScoop − pScooped) · 2 · (front + middle + back − 1.5)</code>. Empirically beats max-product over 1000-hand simulations.</li>
    </ul>
  </section>

  <section>
    <h2>Tech</h2>
    <ul>
      <li>Svelte 4 + Vite 5 + TypeScript</li>
      <li>interactjs for drag-and-drop (touch + pointer)</li>
      <li>Web Audio API for sound (synthesized — no audio assets)</li>
      <li>Vitest for the test suite (~530 tests)</li>
      <li>All card faces drawn with CSS — no card images</li>
    </ul>
  </section>

  <section>
    <h2>Acknowledgments</h2>
    <p>
      This app exists because primedope's tool exists and works correctly,
      and because Paul Hankin published a clean Go implementation of the
      underlying algorithm. The math here is theirs; what's new is the
      drag/drop UX, the celebration trim, the tiered AI personalities,
      and a test harness that uses primedope's own solver to keep us
      honest.
    </p>
    <p class="thanks">Thank you to both projects.</p>
  </section>

  <footer>
    <button class="back" on:click={() => dispatch('back')}>← Back to puzzle</button>
  </footer>
</main>

<style>
  .about {
    max-width: 720px;
    margin: 0 auto;
    padding: 1.2rem 1rem max(env(safe-area-inset-bottom), 1.5rem);
    color: #f5f5f5;
    line-height: 1.55;
  }
  header {
    display: flex;
    align-items: baseline;
    gap: 1rem;
    margin-bottom: 0.6rem;
  }
  h1 {
    font-size: 1.4rem;
    margin: 0;
    letter-spacing: 0.02em;
  }
  h2 {
    font-size: 1.05rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    opacity: 0.75;
    margin: 1.6rem 0 0.6rem;
  }
  h3 {
    font-size: 1rem;
    margin: 0 0 0.4rem;
    color: var(--gold);
  }
  h3 a {
    color: inherit;
    text-decoration: none;
    border-bottom: 1px dashed rgba(212, 175, 55, 0.4);
  }
  h3 a:hover { border-bottom-color: var(--gold); }
  p { margin: 0 0 0.6rem; }
  .lede { opacity: 0.85; font-style: italic; }
  ul {
    margin: 0.3rem 0 0.6rem 1.1rem;
    padding: 0;
  }
  li { margin: 0.2rem 0; }
  code {
    background: rgba(255,255,255,0.08);
    padding: 0.05rem 0.3rem;
    border-radius: 4px;
    font-size: 0.85em;
  }
  .card {
    background: rgba(0,0,0,0.32);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 0.8rem 1rem;
    margin-bottom: 0.7rem;
  }
  .back {
    background: rgba(255,255,255,0.1);
    color: #f5f5f5;
    border: none;
    padding: 0.45rem 0.8rem;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    margin-left: auto;
  }
  .back:hover { background: rgba(255,255,255,0.18); }
  footer {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(255,255,255,0.1);
    display: flex;
    justify-content: center;
  }
  footer .back { margin-left: 0; }
  .thanks {
    text-align: center;
    margin-top: 0.6rem;
    opacity: 0.75;
    font-style: italic;
  }
</style>
