/**
 * DramaticAudio: 100% synthesized sound via the Web Audio API.
 * No audio files, no external requests. The AudioContext is created
 * lazily on the first user gesture to satisfy autoplay policies.
 */

export class DramaticAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private _muted = false;
  private _volume = 0.8;
  private chargeOsc: OscillatorNode | null = null;
  private chargeGain: GainNode | null = null;

  get muted(): boolean {
    return this._muted;
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : this._volume, this.ctx.currentTime, 0.03);
    }
  }

  /** Master volume, 0 to 1. Applies instantly, even mid-drama. */
  setVolume(volume: number): void {
    this._volume = Math.min(1, Math.max(0, volume));
    if (this.master && this.ctx && !this._muted) {
      this.master.gain.setTargetAtTime(this._volume, this.ctx.currentTime, 0.03);
    }
  }

  /** Must be called from a user gesture. Safe to call repeatedly. */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this._muted ? 0 : this._volume;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.makeNoiseBuffer();
    } catch {
      /* audio is a luxury, not a right */
    }
  }

  private ok(): boolean {
    return Boolean(this.ctx && this.master && !this._muted);
  }

  private makeNoiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    const length = this.ctx.sampleRate * 1.2;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  private tone(opts: {
    type?: OscillatorType;
    from: number;
    to?: number;
    dur: number;
    vol?: number;
    delay?: number;
    detune?: number;
    filter?: number;
  }): void {
    if (!this.ok() || !this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(opts.from, t0);
    if (opts.to !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + opts.dur);
    }
    if (opts.detune) osc.detune.setValueAtTime(opts.detune, t0);

    const peak = opts.vol ?? 0.18;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);

    let node: AudioNode = osc;
    if (opts.filter) {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = opts.filter;
      osc.connect(lp);
      node = lp;
    }
    node.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + opts.dur + 0.05);
  }

  private noise(dur: number, vol = 0.12, filterFrom = 4000, filterTo = 200, delay = 0): void {
    if (!this.ok() || !this.ctx || !this.master || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(filterFrom, t0);
    lp.frequency.exponentialRampToValueAtTime(Math.max(40, filterTo), t0 + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(lp);
    lp.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  /** Phase-aware click blip. */
  blip(phase: 1 | 2 | 3 | 4): void {
    switch (phase) {
      case 1:
        this.tone({ type: "sine", from: 540, to: 720, dur: 0.12, vol: 0.14 });
        break;
      case 2:
        this.tone({ type: "square", from: 260, to: 190, dur: 0.09, vol: 0.07 });
        break;
      case 3:
        this.tone({ type: "sawtooth", from: 340, to: 90, dur: 0.16, vol: 0.1 });
        this.noise(0.12, 0.08, 5000, 300);
        break;
      case 4:
        this.tone({ type: "sine", from: 660, to: 990, dur: 0.22, vol: 0.12 });
        break;
    }
  }

  /** Rubber band dodge for the runaway button. */
  boing(): void {
    this.tone({ type: "triangle", from: 620, to: 180, dur: 0.18, vol: 0.1 });
  }

  /** Confetti pop. */
  pop(): void {
    this.noise(0.25, 0.2, 6000, 500);
    this.tone({ type: "triangle", from: 220, to: 640, dur: 0.14, vol: 0.1 });
  }

  /** Harsh glitch burst. */
  glitch(): void {
    this.noise(0.2, 0.14, 8000, 800);
    this.tone({ type: "square", from: 880, to: 110, dur: 0.15, vol: 0.06 });
  }

  /** Two-tone alarm, for the Do Not Press incident. */
  alarm(): void {
    for (let i = 0; i < 4; i++) {
      this.tone({ type: "square", from: 740, dur: 0.11, vol: 0.08, delay: i * 0.22 });
      this.tone({ type: "square", from: 554, dur: 0.11, vol: 0.08, delay: i * 0.22 + 0.11 });
    }
  }

  /** Hitchhiker chime: a rising major arpeggio with shimmer. */
  chime(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((f, i) => {
      this.tone({ type: "sine", from: f, dur: 0.6, vol: 0.12, delay: i * 0.12 });
      this.tone({ type: "sine", from: f * 2, dur: 0.4, vol: 0.04, delay: i * 0.12 + 0.03 });
    });
  }

  /** Triumphant orchestral swell for phase 4: I - IV - V - I, layered. */
  swell(): void {
    const chords: number[][] = [
      [261.63, 329.63, 392.0],   // C major
      [349.23, 440.0, 523.25],   // F major
      [392.0, 493.88, 587.33],   // G major
      [523.25, 659.25, 783.99],  // C major, higher
    ];
    chords.forEach((chord, ci) => {
      chord.forEach((f) => {
        this.tone({ type: "sawtooth", from: f, dur: 0.9, vol: 0.035, delay: ci * 0.42, filter: 1600, detune: -4 });
        this.tone({ type: "sawtooth", from: f, dur: 0.9, vol: 0.035, delay: ci * 0.42, filter: 1600, detune: 5 });
      });
      this.tone({ type: "sine", from: chord[0] / 2, dur: 0.85, vol: 0.05, delay: ci * 0.42 });
    });
    this.noise(1.6, 0.03, 9000, 2000, 0.1);
  }

  /** Soft negative buzz for the bureaucrat denial. */
  deny(): void {
    this.tone({ type: "square", from: 196, dur: 0.18, vol: 0.06 });
    this.tone({ type: "square", from: 185, dur: 0.22, vol: 0.06, delay: 0.2 });
  }

  /** Drowsy sine drifts for the hypnosis spiral. */
  hypno(): void {
    for (let i = 0; i < 3; i++) {
      this.tone({ type: "sine", from: 196, to: 392, dur: 0.85, vol: 0.05, delay: i * 1.7, filter: 900 });
      this.tone({ type: "sine", from: 392, to: 196, dur: 0.85, vol: 0.05, delay: i * 1.7 + 0.85, filter: 900 });
    }
  }

  /** Tiny mechanical typing tick, for typewritten status lines. */
  tick(): void {
    this.tone({ type: "square", from: 1400, to: 1200, dur: 0.03, vol: 0.03 });
  }

  /** Tiny stamp thunk. */
  stamp(): void {
    this.noise(0.09, 0.16, 900, 120);
  }

  /** Alien tractor beam: an eerie rising glide with a shimmering overtone. */
  beam(): void {
    this.tone({ type: "sine", from: 160, to: 720, dur: 1.7, vol: 0.07 });
    this.tone({ type: "sine", from: 320, to: 1440, dur: 1.7, vol: 0.035, delay: 0.05 });
    this.tone({ type: "triangle", from: 80, to: 180, dur: 1.6, vol: 0.045, filter: 600 });
    this.noise(1.6, 0.02, 3000, 9000);
  }

  /** The saucer drops the button back: descending whine plus a floor thud. */
  saucerDrop(): void {
    this.tone({ type: "sine", from: 900, to: 140, dur: 0.5, vol: 0.08 });
    this.noise(0.28, 0.22, 500, 60, 0.42);
    this.tone({ type: "sine", from: 70, to: 40, dur: 0.3, vol: 0.12, delay: 0.44 });
  }

  /**
   * Rising charge drone while the button is held down. One oscillator,
   * frequency climbed by the engine as the charge fills. Safe to call twice.
   */
  chargeStart(): void {
    if (!this.ok() || !this.ctx || !this.master || this.chargeOsc) return;
    try {
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(70, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.18);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(300, ctx.currentTime);
      lp.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 2.2);
      osc.connect(lp);
      lp.connect(gain);
      gain.connect(this.master);
      osc.start();
      this.chargeOsc = osc;
      this.chargeGain = gain;
    } catch {
      /* the drone is optional, the drama is not */
    }
  }

  /** Nudges the charge drone's pitch. t is 0..1 charge progress. */
  chargeTick(t: number): void {
    if (!this.ctx || !this.chargeOsc) return;
    const clamped = Math.min(1, Math.max(0, t));
    this.chargeOsc.frequency.setTargetAtTime(
      70 + clamped * 380,
      this.ctx.currentTime,
      0.06,
    );
  }

  /** Ends the charge drone. Released=false means fizzle out quietly. */
  chargeStop(): void {
    if (!this.ctx || !this.chargeOsc || !this.chargeGain) return;
    try {
      const t = this.ctx.currentTime;
      this.chargeGain.gain.cancelScheduledValues(t);
      this.chargeGain.gain.setTargetAtTime(0.0001, t, 0.05);
      this.chargeOsc.stop(t + 0.3);
    } catch {
      /* already silent, already fine */
    }
    this.chargeOsc = null;
    this.chargeGain = null;
  }

  /** The overcharge release: a detonation chord with a sub-bass thump. */
  overcharge(): void {
    this.noise(0.5, 0.24, 9000, 120);
    this.tone({ type: "sine", from: 120, to: 34, dur: 0.55, vol: 0.2 });
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25];
    notes.forEach((f, i) => {
      this.tone({ type: "triangle", from: f, to: f * 1.02, dur: 0.5, vol: 0.075, delay: 0.05 + i * 0.045 });
    });
    this.tone({ type: "sawtooth", from: 1046.5, to: 1568, dur: 0.4, vol: 0.04, delay: 0.1, filter: 3200 });
  }

  /** Double-tap: two quick detuned zips chasing each other's tail. */
  doubleTrouble(): void {
    if (!this.ok()) return;
    this.tone({ type: "square", from: 240, to: 720, dur: 0.11, vol: 0.07, filter: 2600 });
    this.tone({ type: "square", from: 720, to: 240, dur: 0.11, vol: 0.07, delay: 0.09, filter: 2600 });
    this.tone({ type: "sawtooth", from: 110, to: 470, dur: 0.22, vol: 0.045, delay: 0.03, filter: 1500 });
  }
}
