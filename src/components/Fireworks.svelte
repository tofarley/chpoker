<script lang="ts">
  /*
   * Brief canvas fireworks overlay. Mounts → fires 4 staggered bursts → dispatches 'done'
   * when all particles have decayed. Pointer-events disabled so it never blocks UI.
   */
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{ done: void }>();

  let canvas: HTMLCanvasElement;
  let raf = 0;

  type Particle = {
    x: number; y: number;
    vx: number; vy: number;
    color: string;
    size: number;
    life: number;
  };
  const particles: Particle[] = [];
  const COLORS = ['#ffd700', '#ff6b6b', '#5fd084', '#6db4ff', '#ff9c5f', '#c899ff', '#ffffff'];

  function spawnBurst(cx: number, cy: number, count = 60) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 1.5 + Math.random() * 2.2,
        life: 1
      });
    }
  }

  function loop() {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.12;       // gravity
      p.vx *= 0.985;      // air drag
      p.vy *= 0.985;
      p.life -= 0.012;
      if (p.life <= 0) continue;
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    // Compact the array — drop dead particles
    for (let i = particles.length - 1; i >= 0; i--) {
      if (particles[i].life <= 0) particles.splice(i, 1);
    }
    if (particles.length > 0) {
      raf = requestAnimationFrame(loop);
    } else {
      dispatch('done');
    }
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  onMount(() => {
    resize();
    window.addEventListener('resize', resize);
    const w = canvas.width;
    const h = canvas.height;
    spawnBurst(w * 0.5, h * 0.45);
    setTimeout(() => spawnBurst(w * 0.28, h * 0.38), 220);
    setTimeout(() => spawnBurst(w * 0.72, h * 0.42), 420);
    setTimeout(() => spawnBurst(w * 0.5, h * 0.55, 80), 660);
    raf = requestAnimationFrame(loop);
  });

  onDestroy(() => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
  });
</script>

<canvas bind:this={canvas} aria-hidden="true"></canvas>

<style>
  canvas {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1000;
  }
</style>
