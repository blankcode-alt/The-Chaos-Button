/**
 * SeismoGraph: the chaos seismograph.
 * Draws the session's presses onto a canvas drum, one needle per press,
 * colored by the phase it happened in, taller for louder events.
 * Tapping the drum replays the session: a playhead sweeps across and
 * every needle it crosses fires a tick. Purely an instrument. No clouds.
 */

export interface SeismoSample {
  /** Epoch ms of the press. */
  t: number;
  /** Phase the button was in when it happened. */
  phase: 1 | 2 | 3 | 4;
  /** Relative loudness. 1 = ordinary tap, up to 3 = full ceremony. */
  mag: number;
  kind: "tap" | "double" | "overcharge" | "ceremony" | "egg";
}

interface RenderOpts {
  reduced: boolean;
  /** Called by replay for every needle the playhead crosses. */
  onTick?: (sample: SeismoSample) => void;
  onReplayDone?: () => void;
}

const CAPACITY = 140;
const MIN_SLOTS = 40;
const NEEDLE_BASE = 10;
const NEEDLE_SPAN = 34;

export class SeismoGraph {
  private canvas: HTMLCanvasElement;
  private raf = 0;
  private playing = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  get isReplaying(): boolean {
    return this.playing;
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.playing = false;
  }

  /** Slot width shared by render and replay so the playhead stays in sync. */
  private slotFor(w: number, count: number): number {
    const padX = 8;
    const spanX = Math.max(1, w - padX * 2);
    // young sessions spread wider so the drum breathes; past 40 needles
    // it packs down toward the full 140-slot density, left to right
    const slots = Math.min(Math.max(count, MIN_SLOTS), CAPACITY);
    return spanX / (slots - 1);
  }

  /** Phase needle colors, read live from CSS so every theme paints its own drum. */
  private phaseColors(): string[] {
    const cs = getComputedStyle(this.canvas);
    const rootCs = getComputedStyle(this.canvas.closest("#chaos-root") ?? this.canvas);
    const read = (v: string, fb: string) => cs.getPropertyValue(v).trim() || rootCs.getPropertyValue(v).trim() || fb;
    return [
      read("--seismo-p1", "#a78bfa"),
      read("--seismo-p2", "#8a80a8"),
      read("--seismo-p3", "#d84a6a"),
      read("--seismo-p4", "#e9c46a"),
    ];
  }

  private ink(): { line: string; label: string; grid: string } {
    const rootCs = getComputedStyle(this.canvas.closest("#chaos-root") ?? this.canvas);
    return {
      line: rootCs.getPropertyValue("--c-text-faint").trim() || "rgba(236,234,246,0.28)",
      label: rootCs.getPropertyValue("--c-text-dim").trim() || "rgba(236,234,246,0.55)",
      grid: rootCs.getPropertyValue("--c-text-faint").trim() || "rgba(236,234,246,0.28)",
    };
  }

  /** Static render of the whole session. Cheap enough to run on every press. */
  render(samples: SeismoSample[], opts?: { pulse?: number }): void {
    const cv = this.canvas;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = cv.clientWidth || 300;
    const h = cv.clientHeight || 96;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const ink = this.ink();

    // paper rules: three faint horizontal guide lines plus the baseline
    ctx.strokeStyle = ink.grid;
    ctx.lineWidth = 1;
    for (const frac of [0.18, 0.5, 0.82]) {
      ctx.globalAlpha = frac === 0.5 ? 0.5 : 0.22;
      ctx.beginPath();
      ctx.moveTo(0, h * frac + 0.5);
      ctx.lineTo(w, h * frac + 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // the baseline: a needle rests here when nothing is happening
    ctx.strokeStyle = ink.line;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(0, h - 14.5);
    ctx.lineTo(w, h - 14.5);
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (samples.length === 0) {
      ctx.fillStyle = ink.label;
      ctx.font = "10px ui-monospace, monospace";
      ctx.fillText("THE DRUM IS BLANK", 10, 18);
      return;
    }

    const colors = this.phaseColors();
    const baseline = h - 14;
    const padX = 8;
    const slot = this.slotFor(w, samples.length);
    const startIdx = Math.max(0, samples.length - CAPACITY);

    samples.forEach((s, i) => {
      const x = padX + i * slot;
      const idx = i - startIdx;
      if (idx < 0) return;
      const isLast = i === samples.length - 1;
      const pulse = opts?.pulse === i ? 1 : 0;
      const needleH = NEEDLE_BASE + Math.min(1, s.mag / 3) * NEEDLE_SPAN + (isLast || pulse ? 4 : 0);
      ctx.strokeStyle = colors[s.phase - 1];
      ctx.lineWidth = s.kind === "tap" ? 1.6 : 2.4;
      ctx.globalAlpha = isLast || pulse ? 1 : 0.82;

      // the needle: a vertical stroke with a small foot, seismograph style
      ctx.beginPath();
      ctx.moveTo(x, baseline - needleH);
      ctx.lineTo(x, baseline);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, baseline, 1.4 + (pulse ? 1.2 : 0), 0, Math.PI * 2);
      ctx.fillStyle = colors[s.phase - 1];
      ctx.fill();

      // ceremonies and eggs get a tiny flag on top, because they earned it
      if (s.kind === "ceremony" || s.kind === "egg") {
        ctx.globalAlpha = isLast || pulse ? 1 : 0.9;
        ctx.beginPath();
        ctx.moveTo(x, baseline - needleH - 7);
        ctx.lineTo(x + 5, baseline - needleH - 3.5);
        ctx.lineTo(x, baseline - needleH);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
  }

  /**
   * Replay: a playhead sweeps left to right, needles pulse as it crosses
   * them and onTick fires per sample. Reduced motion skips the sweep and
   * just pulses everything once, politely.
   */
  replay(samples: SeismoSample[], opts: RenderOpts): void {
    if (samples.length === 0 || this.playing) return;
    const reduced = opts.reduced;
    if (reduced) {
      samples.forEach((s) => opts.onTick?.(s));
      this.render(samples);
      opts.onReplayDone?.();
      return;
    }
    this.playing = true;
    const cv = this.canvas;
    const w = cv.clientWidth || 300;
    const padX = 8;
    const slot = this.slotFor(w, samples.length);
    const start = performance.now();
    const total = Math.min(2600, Math.max(900, samples.length * 42));
    const dur = 220; // how long each needle stays lit after the head passes
    const startIdx = Math.max(0, samples.length - CAPACITY);

    const step = (now: number) => {
      const t = (now - start) / total;
      if (t >= 1) {
        this.playing = false;
        this.render(samples);
        opts.onReplayDone?.();
        return;
      }
      const headX = t * w;
      // find the most recently crossed needle for the pulse highlight
      const headIdxFloat = (headX - padX) / slot + startIdx;
      const crossed = Math.min(samples.length - 1, Math.max(-1, Math.floor(headIdxFloat)));
      this.render(samples, { pulse: crossed });
      // fire ticks for needles the head has just reached
      for (let i = Math.max(0, crossed - 1); i <= crossed; i++) {
        const x = padX + (i - startIdx) * slot;
        if (x <= headX && x > headX - slot * 1.5 && i >= startIdx) {
          opts.onTick?.(samples[i]);
        }
      }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
}
