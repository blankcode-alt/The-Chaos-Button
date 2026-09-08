/**
 * VisualEffectsController: screen-level theatrics.
 * Shake, rotation, zoom, strobe, flash, background shifts, mirror mode
 * and a small physics engine for the gravity behavior.
 */

type Schedule = (fn: () => void, ms: number) => void;

export class VisualEffectsController {
  private stage: HTMLElement;
  private root: HTMLElement;
  private flashEl: HTMLElement;
  private strobeEl: HTMLElement;
  private alarmEl: HTMLElement;
  private reduced: boolean;
  private flashesOn = true;
  private schedule: Schedule;
  private rafIds: number[] = [];

  constructor(parts: {
    stage: HTMLElement;
    root: HTMLElement;
    flash: HTMLElement;
    strobe: HTMLElement;
    alarm: HTMLElement;
    reduced: boolean;
    schedule: Schedule;
  }) {
    this.stage = parts.stage;
    this.root = parts.root;
    this.flashEl = parts.flash;
    this.strobeEl = parts.strobe;
    this.alarmEl = parts.alarm;
    this.reduced = parts.reduced;
    this.schedule = parts.schedule;
  }

  private trackRaf(id: number): number {
    this.rafIds.push(id);
    return id;
  }

  stopAllRafs(): void {
    this.rafIds.forEach((id) => cancelAnimationFrame(id));
    this.rafIds = [];
  }

  /** Live update: OS reduced motion or the Control Room toggle. */
  setReduced(reduced: boolean): void {
    this.reduced = reduced;
  }

  /** Live update: camera flash overlays on or off (Control Room). */
  setFlashes(on: boolean): void {
    this.flashesOn = on;
  }

  /** Screen shake. Falls back to a polite tilt when motion is reduced. */
  shake(): void {
    if (this.reduced) return this.tilt();
    this.retrigger("fx-shake");
  }

  /** 5 degree oscillation. Reduced motion: tiny tilt instead. */
  rotate(): void {
    if (this.reduced) return this.tilt();
    this.retrigger("fx-rotate");
  }

  zoom(): void {
    if (this.reduced) return;
    this.retrigger("fx-zoom");
  }

  tilt(): void {
    this.retrigger("fx-tilt");
  }

  private retrigger(cls: string): void {
    this.stage.classList.remove(cls);
    void this.stage.offsetWidth; // reflow to restart the animation
    this.stage.classList.add(cls);
    this.schedule(() => this.stage.classList.remove(cls), 1900);
  }

  flash(): void {
    if (this.reduced || !this.flashesOn) return;
    this.flashEl.classList.remove("on");
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add("on");
    this.schedule(() => this.flashEl.classList.remove("on"), 600);
  }

  strobe(): void {
    if (this.reduced || !this.flashesOn) return this.tilt();
    this.strobeEl.classList.remove("on");
    void this.strobeEl.offsetWidth;
    this.strobeEl.classList.add("on");
    this.schedule(() => this.strobeEl.classList.remove("on"), 900);
  }

  alarm(): void {
    if (this.reduced || !this.flashesOn) return;
    this.alarmEl.classList.remove("on");
    void this.alarmEl.offsetWidth;
    this.alarmEl.classList.add("on");
    this.schedule(() => this.alarmEl.classList.remove("on"), 2300);
  }

  /** Background color shift to a random hue, then ease back. */
  bgShift(): void {
    const hue = Math.floor(Math.random() * 360);
    const sat = 14 + Math.floor(Math.random() * 26);
    const light0 = 3 + Math.floor(Math.random() * 4);
    const light1 = 8 + Math.floor(Math.random() * 9);
    this.root.style.setProperty("--bg-shift-0", `hsl(${hue} ${sat}% ${light0}%)`);
    this.root.style.setProperty("--bg-shift-1", `hsl(${(hue + 40) % 360} ${sat + 10}% ${light1}%)`);
    this.root.style.setProperty("--bg-shift-glow", `hsla(${hue}, 60%, 60%, 0.16)`);
    this.root.classList.add("bg-shifted");
    this.schedule(() => this.root.classList.remove("bg-shifted"), 3000);
  }

  mirror(on: boolean): void {
    this.stage.classList.toggle("fx-mirror", on);
  }

  /**
   * Gravity: captured elements fall, bounce and rest at the bottom of the
   * viewport. Restores the DOM after `duration` ms. Returns a cleanup fn.
   */
  gravity(elements: HTMLElement[], duration = 4500): () => void {
    if (this.reduced || elements.length === 0) return () => undefined;

    const bodies = elements
      .map((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0) return null;
        const fixed = el as HTMLElement;
        fixed.classList.add("grav-captured");
        fixed.style.left = `${rect.left}px`;
        fixed.style.top = `${rect.top}px`;
        fixed.style.width = `${rect.width}px`;
        fixed.style.height = `${rect.height}px`;
        let vy = 0;
        let y = rect.top;
        const floor = window.innerHeight - rect.height - 8;
        return { el: fixed, vy, y, floor, rot: 0, vr: (Math.random() - 0.5) * 0.06 };
      })
      .filter((b): b is NonNullable<typeof b> => b !== null);

    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(32, now - last) / 16.67;
      last = now;
      for (const b of bodies) {
        b.vy += 0.55 * dt;
        b.y += b.vy * dt;
        if (b.y >= b.floor) {
          b.y = b.floor;
          b.vy *= -0.38;
          if (Math.abs(b.vy) < 1.2) b.vy = 0;
        }
        b.rot += b.vy === 0 ? 0 : b.vr * dt;
        b.el.style.transform = `translateY(${b.y - parseFloat(b.el.style.top)}px) rotate(${b.rot}rad)`;
      }
      id = requestAnimationFrame(step);
      this.trackRaf(id);
    };
    let id = requestAnimationFrame(step);
    this.trackRaf(id);

    return () => {
      cancelAnimationFrame(id);
      this.rafIds = this.rafIds.filter((r) => r !== id);
      for (const b of bodies) {
        b.el.classList.remove("grav-captured");
        b.el.style.left = "";
        b.el.style.top = "";
        b.el.style.width = "";
        b.el.style.height = "";
        b.el.style.transform = "";
      }
    };
  }
}
