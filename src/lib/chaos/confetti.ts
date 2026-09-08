/**
 * ConfettiSystem: physics-based particles on a single full-screen canvas.
 * Handles confetti bursts and golden enlightenment sparkles.
 * Reduced motion: fewer particles, no spin, shorter lives.
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  drag: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  shape: "rect" | "circle" | "tri" | "spark";
  life: number;
  maxLife: number;
}

const CONFETTI_COLORS = [
  "#a78bfa", "#c4b5fd", "#f0abfc", "#fda4af", "#fcd34d",
  "#86efac", "#fdba74", "#e9d5ff", "#ffffff", "#8b5cf6",
];

const GOLD_COLORS = ["#ffd77a", "#ffe9b3", "#f6c05c", "#fff3d6", "#e0a83c", "#ffffff"];

/** Hard ceiling. Slow-refresh displays make particles live longer in wall
 * time, so spawners must never be trusted to self-balance. */
const MAX_PARTICLES = 1600;

export class ConfettiSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private rafId = 0;
  private running = false;
  private dpr: number;
  private reduced: boolean;
  private onResize = () => this.resize();

  constructor(canvas: HTMLCanvasElement, reducedMotion: boolean) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    this.reduced = reducedMotion;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.resize();
    window.addEventListener("resize", this.onResize);
  }

  /** Live update from the Control Room motion toggle. */
  setReduced(reducedMotion: boolean): void {
    this.reduced = reducedMotion;
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(window.innerWidth * this.dpr);
    this.canvas.height = Math.floor(window.innerHeight * this.dpr);
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private spawn(
    x: number,
    y: number,
    count: number,
    opts: { spread: number; power: number; up: number; colors: string[]; shapes: Particle["shape"][]; gravity: number; life: number },
  ): void {
    // drop the oldest particles first when the ceiling is hit
    if (this.particles.length + count > MAX_PARTICLES) {
      const keep = Math.max(0, MAX_PARTICLES - count);
      this.particles.splice(0, this.particles.length - keep);
    }
    for (let i = 0; i < count; i++) {
      const angle = (-Math.PI / 2) + (Math.random() - 0.5) * opts.spread;
      const speed = opts.power * (0.35 + Math.random() * 0.65);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
        vy: Math.sin(angle) * speed - opts.up * Math.random(),
        g: opts.gravity,
        drag: 0.985 + Math.random() * 0.01,
        size: 4 + Math.random() * 7,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * (this.reduced ? 0.02 : 0.3),
        color: opts.colors[Math.floor(Math.random() * opts.colors.length)],
        shape: opts.shapes[Math.floor(Math.random() * opts.shapes.length)],
        life: 0,
        maxLife: opts.life * (0.6 + Math.random() * 0.7),
      });
    }
    this.start();
  }

  /** Classic celebration burst from a point (defaults to viewport center). */
  burst(x?: number, y?: number, count?: number): void {
    const scale = this.reduced ? 0.35 : 1;
    this.spawn(
      x ?? window.innerWidth / 2,
      y ?? window.innerHeight / 2,
      Math.round((count ?? 140) * scale),
      {
        spread: Math.PI * 1.1,
        power: 11 * scale + 3,
        up: 6 * scale,
        colors: CONFETTI_COLORS,
        shapes: this.reduced ? ["circle"] : ["rect", "circle", "tri"],
        gravity: 0.22,
        life: 110,
      },
    );
  }

  /** Side cannons, used by the enlightenment celebration. */
  cannons(): void {
    const scale = this.reduced ? 0.35 : 1;
    this.spawn(-10, window.innerHeight * 0.72, Math.round(70 * scale), {
      spread: 0.9,
      power: 15 * scale + 4,
      up: 3,
      colors: GOLD_COLORS,
      shapes: ["rect", "circle", "tri"],
      gravity: 0.2,
      life: 130,
    });
    this.spawn(window.innerWidth + 10, window.innerHeight * 0.72, Math.round(70 * scale), {
      spread: 0.9,
      power: 15 * scale + 4,
      up: 3,
      colors: GOLD_COLORS,
      shapes: ["rect", "circle", "tri"],
      gravity: 0.2,
      life: 130,
    });
  }

  /** Ambient golden sparkle trail for phase 4. */
  sparkles(x: number, y: number, count = 14): void {
    const scale = this.reduced ? 0.4 : 1;
    this.spawn(x, y, Math.round(count * scale), {
      spread: Math.PI * 2,
      power: 2.4,
      up: 1.4,
      colors: GOLD_COLORS,
      shapes: ["spark"],
      gravity: -0.015,
      life: 80,
    });
  }

  private start(): void {
    if (this.running) return;
    this.running = true;
    this.rafId = requestAnimationFrame(this.tick);
  }

  private tick = (): void => {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);

    this.particles = this.particles.filter((p) => {
      p.life++;
      p.vy += p.g;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;

      const fadeStart = p.maxLife * 0.65;
      const alpha = p.life > fadeStart ? Math.max(0, 1 - (p.life - fadeStart) / (p.maxLife - fadeStart)) : 1;
      if (alpha <= 0 || p.y > window.innerHeight + 40) return false;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      const s = p.size;
      switch (p.shape) {
        case "rect":
          ctx.fillRect(-s / 2, -s * 0.35, s, s * 0.7);
          break;
        case "circle":
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.45, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "tri":
          ctx.beginPath();
          ctx.moveTo(0, -s * 0.55);
          ctx.lineTo(s * 0.5, s * 0.4);
          ctx.lineTo(-s * 0.5, s * 0.4);
          ctx.closePath();
          ctx.fill();
          break;
        case "spark": {
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(0.8, s * 0.18), 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
      ctx.restore();
      return true;
    });

    if (this.particles.length > 0) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.running = false;
      ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
    }
  };

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.running = false;
    this.particles = [];
    window.removeEventListener("resize", this.onResize);
  }
}
