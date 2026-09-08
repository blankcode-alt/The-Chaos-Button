/**
 * ChaosEngine: the narrative chaos engine.
 * Tracks clicks, evolves through 4 phases, and selects 1-3 behaviors
 * per click from a pool of 29. Handles the 42 easter egg, the phase 4
 * enlightenment celebration and the smooth reset back to phase 1.
 * Extras: Hall of Records stat wiring, Konami code, idle nagging,
 * a cycle progress meter, click streak combos, chaotic document
 * titles, a shareable brag line, a phase 4 sparkle cursor trail,
 * four themes, a time-aware greeting, a census field dossier with
 * per-behavior suppress and mute switches, a press-and-hold overcharge,
 * a double-tap timeline fork, records backup export/import, a chaos
 * seismograph drum with replay, and a session flight recorder.
 */

import { DramaticAudio } from "./audio";
import { ConfettiSystem } from "./confetti";
import { QuoteGenerator } from "./quotes";
import { VisualEffectsController } from "./effects";
import { AchievementSystem } from "./achievements";
import { SettingsStore, ThemeName } from "./settings";
import { SeismoGraph, SeismoSample } from "./seismo";

type Phase = 1 | 2 | 3 | 4;

interface Behavior {
  id: string;
  minPhase: Phase;
  /** Behaviors in the same group never run in the same round. */
  group?: "move" | "modal";
  /** Intrusive behaviors fire at most once per cycle (until reset). */
  oncePerCycle?: boolean;
  run: (e: ChaosEngine) => void;
}

const PHASE_LABELS: Record<Phase, string> = {
  1: "Press Me",
  2: "Stop That",
  3: "WHY",
  4: "Thank You",
};

const MOODS: Record<Phase, string[]> = {
  1: ["Suspiciously serene", "Politely curious", "Mildly off", "Harmless (pending review)"],
  2: ["Passive-aggressive", "Quietly resentful", "Doing great (a lie)", "Evasive"],
  3: ["Unhinged", "Beyond reason", "Mostly regret", "Catastrophic"],
  4: ["Transcendent"],
};

const STATUS_TEXTS: Record<Phase, string[]> = {
  1: [
    "Innocently awaiting your touch",
    "Hello there",
    "Ready when you are",
    "Nothing yet. Suspiciously nothing",
    "A button, doing button things",
    "You found the only interactive element. Congratulations",
  ],
  2: [
    "Getting annoyed...",
    "Please stop",
    "Your persistence is noted... and irritating",
    "This is a button, not a career",
    "I am going to count to ten. Slowly",
    "Have you tried pressing nothing instead",
    "We can still pretend this never happened",
  ],
  3: [
    "UNHINGED",
    "WHY ARE YOU STILL HERE",
    "SYSTEM FAILURE IMMINENT",
    "REALITY IS OPTIONAL NOW",
    "THE BUTTON PRESSES BACK",
    "HELP. I HAVE BECOME SELF-AWARE. KIDDING. NO. MAYBE",
  ],
  4: ["Something vast approaches", "The noise quiets", "Almost there"],
};

const PASSIVE_LINES: Record<Phase, string[]> = {
  1: [
    "Oh, we are doing this now?",
    "Interesting choice",
    "Noted, with mild concern",
    "The button appreciates the attention. Probably",
  ],
  2: [
    "Sure, click again. It is fine. Everything is fine",
    "That is twice now. Whatever",
    "I am a button, not a toy. Wait",
    "Your persistence is being logged, by the way",
  ],
  3: [
    "AGAIN? SERIOUSLY?",
    "My lawyer has been contacted",
    "This is a cry for help. Mine",
    "You made me like this",
  ],
  4: ["Peace. Finally", "We are beyond taunts now"],
};

const GASLIGHT_LINES = [
  "You did not click me",
  "There is no button",
  "That never happened",
  "You are remembering it wrong",
  "I felt nothing",
];

const TRANSLATIONS = [
  "Le Bouton (Francais)",
  "Der Knopf (Deutsch)",
  "El Boton (Espanol)",
  "Il Bottone (Italiano)",
  "Knopka (Russian)",
  "An Niu (Chinese)",
  "Botan (Japanese)",
  "ᚦᛖ ᛒᚢᛏᛏᛟᚾ (Runic)",
  "01010100 01101000 01100101 (Binary)",
  "-- .-.. .- ... (Morse)",
];

const LOADING_TEXTS = [
  "Initializing useless experiments...",
  "Calibrating disappointment...",
  "Warming up the chaos engine...",
  "Consulting the manual nobody wrote...",
  "Almost reasonably ready...",
];

const IDLE_NAGS = [
  "Still here. Not pressing. Bold strategy",
  "The button can wait. The button has nothing but time",
  "Silence detected. The button refuses to fill it",
  "Take your time. It is not like the button has feelings. (It does)",
  "Idle for a suspiciously long time. The button has started narrating your absence",
  "The button was going to do something incredible. It forgot",
];

const FORTUNES = [
  "A button pressed today saves no work tomorrow either",
  "The person who reads fortunes in cookies is unemployed now. You did this",
  "Help is on the way. The slow way. The extremely slow way",
  "You will soon press a button. It will accomplish nothing. This is that fortune",
  "Great things take time. This took neither",
  "Your future is bright. Your future is also a screen. Adjust brightness accordingly",
  "The cookie you did not eat contained the secret of happiness. This one contains this",
  "Beware of what you click for. You will only get clicked with",
  "An old friend will contact you. They will want something",
  "The chaos you seek is already within you. The button merely supervises",
  "Success is 10% inspiration and 90% pretending the other 90% exists",
  "You are not lost. You are merely at an extremely low zoom level",
  "A wise person once said nothing. The button encourages continuing that tradition",
  "Today is the first day of the rest of your clicking",
];

const KONAMI_SEQUENCE = [
  "arrowup", "arrowup", "arrowdown", "arrowdown",
  "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a",
];

const CYCLE_GOAL = 26;

/** Browser tab titles, one per mood. The chaos leaves the viewport. */
const PHASE_TITLES: Record<Phase, string> = {
  1: "The Chaos Button",
  2: "The Chaos Button (regrettably)",
  3: "THE BUTTON REQUIRES YOUR IMMEDIATE ATTENTION",
  4: "Enlightenment: Achieved",
};

const THERAPY_LINES = [
  "And how did pressing me make you feel?",
  "Tell me about your relationship with buttons. Take your time",
  "I sense a need for control. I am, however, just a button",
  "Let us revisit the moment of impact. What were you hoping for?",
  "Your finger keeps returning here. Fascinating. Please, continue",
  "There are no wrong answers. Only clicks",
  "Have you considered that you are the chaos in this relationship?",
  "Every press is a confession. I am taking notes. Mentally",
];

/** Combo escalation tiers. Level drives the chip color (see CSS). */
const STREAK_TIERS: Array<{ at: number; level: string; label: string }> = [
  { at: 3, level: "1", label: "Combo" },
  { at: 5, level: "2", label: "Rapid Fire" },
  { at: 8, level: "3", label: "Machine Gun" },
  { at: 12, level: "4", label: "Finger of Doom" },
  { at: 16, level: "5", label: "Beyond Salvation" },
  { at: 22, level: "6", label: "Unprecedented" },
];

/** Milestone streaks earn confetti, a pop and a personal comment. */
const STREAK_STATUS: Record<number, string> = {
  5: "Five in a row. The button has noticed. The button is afraid",
  10: "Ten presses, one breath. Somewhere a mouse is jealous",
  15: "Fifteen. This stopped being clicking and became percussion",
  20: "Twenty. The button is drafting your intervention as we speak",
  25: "Twenty-five. Honestly? Impressed. Deeply concerned, but impressed",
};

/** Fast clicking within this window keeps the streak alive. */
const STREAK_WINDOW_MS = 750;

/** Two presses inside this window count as a double-tap. Causality objects. */
const DOUBLE_TAP_WINDOW_MS = 260;

const DOUBLE_TROUBLE_LINES = [
  "DOUBLE TAP. The timeline forked. Both versions are equally disappointed",
  "Double trouble. The button briefly existed in two places and regrets both",
  "Two taps, one echo. The physicists have been asked to leave the building",
  "DOUBLE TAP DETECTED. Reality stuttered, then blamed the intern",
  "Twice in one breath. The ledger is now written in two columns",
];

const IMPORT_BAD_LINES = [
  "That file is not a chaos backup. Bold choice though",
  "The archive sniffed that file and walked away. Import cancelled",
  "Unreadable backup. The records department is filing a complaint",
];

const THERAPY_HOLD_MS = 5200;
const CAM_RECORD_MS = 4200;
const HYPNO_HOLD_MS = 3600;

const DAILY_FORTUNE_KEY = "chaos-button-daily-v1";

const BOSS_OPEN_LINES = [
  "BOSS SCREEN DEPLOYED. You are now indisputably looking at quarterly figures",
  "Instant productivity. Your manager would be so proud of this spreadsheet",
  "Panic cover engaged. Nothing to see here but revenue projections",
];

const BOSS_CLOSE_LINES = [
  "Crisis averted. The button saw nothing and will tell no one",
  "Back to the button. The spreadsheet has served its purpose",
  "Cover lifted. That was close. It was also extremely convincing",
];

/** Lifetime press ranks. Purely honorary. Entirely earned. */
const RANKS: Array<{ at: number; name: string }> = [
  { at: 0, name: "Bystander" },
  { at: 1, name: "The Curious" },
  { at: 10, name: "Enthusiast" },
  { at: 25, name: "Chaos Apprentice" },
  { at: 50, name: "Button Sommelier" },
  { at: 100, name: "Doomsday Intern" },
  { at: 200, name: "Chaos Adept" },
  { at: 350, name: "Chronic Presser" },
  { at: 500, name: "Professor of Pressing" },
  { at: 750, name: "The Unemployable" },
  { at: 1000, name: "Legend of the Lab" },
];

function rankIndexFor(summons: number): number {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (summons >= RANKS[i].at) index = i;
  }
  return index;
}

/**
 * Every method answers silence. For muted behaviors the show goes on,
 * just in respectful pantomime.
 */
function silentAudioProxy(): DramaticAudio {
  return new Proxy({} as DramaticAudio, {
    get: () => () => undefined,
  });
}

/** Witty feedback for every Control Room switch. */
const SETTING_LINES: Record<"flashes" | "motion" | "tabTitles", { on: string; off: string }> = {
  flashes: {
    on: "Camera flashes restored. The paparazzi files back in",
    off: "Camera flashes disabled. The paparazzi has been escorted out",
  },
  motion: {
    on: "Full motion restored. Shake responsibly",
    off: "Motion tamed. The laboratory now stands perfectly, eerily still",
  },
  tabTitles: {
    on: "Tab title chaos re-armed. Your tab will misbehave again shortly",
    off: "Tab titles tamed. Your browser tab is now boring, professionally",
  },
};

/** One line per laboratory theme, because ambience deserves commentary. */
const THEME_LINES: Record<ThemeName, string> = {
  dark: "Midnight restored. The laboratory settles back into its natural gloom",
  light: "Daylight engaged. The laboratory now resembles a place where work happens",
  sepia: "Sepia engaged. The laboratory is now a 1920s inventor's workshop, apparently",
  sodium: "Sodium engaged. Maximum contrast, minimum mercy. Mind the hazard stripes",
  auto: "Auto engaged. The laboratory now syncs its gloom to your device's opinions about time of day",
};

/** Status lines for the Chaos Dial, sorted by how much trouble was requested. */
function dialLine(v: number): string {
  if (v < 90) return "Chaos dial lowered. The button will behave. Briefly, and with resentment";
  if (v > 110) return "Chaos dial raised. The button has been waiting its whole life for this";
  return "Chaos dial centered. Standard-grade disorder restored";
}

/** Time-aware greetings, because the button keeps hours. */
function greetingForHour(hour: number): string {
  if (hour < 5) return "Summoning buttons in the small hours. The button respects the dedication and worries slightly";
  if (hour < 12) return "Good morning. The button has been useless all night, professionally";
  if (hour < 18) return "Good afternoon. The chaos is freshly reheated";
  return "Good evening. The button saved you a seat";
}

/** How long one Konami-fueled party lasts. */
const PARTY_MS = 30000;

/* ------------------------------------------------------------------
   overcharge: hold the button to charge it, release to detonate
   ------------------------------------------------------------------ */

/** Hold at least this long before charging begins, so taps stay taps. */
const CHARGE_GRACE_MS = 380;
/** Hold this long to reach 100%. */
const CHARGE_RAMP_MS = 1500;
/** Releases below this charge fizzle without ceremony. */
const CHARGE_RELEASE_MIN = 0.5;

const CHARGE_GRACE_LINES = [
  "Charging. This is either a great idea or a warranty event",
  "The button is holding its breath. So should you",
  "Charging: the capacitors are making confident noises",
  "Hold it. Hold it. The button respects the commitment",
];

const CHARGE_FULL_LINES = [
  "Charged to maximum. Release whenever you are ready to regret nothing",
  "100%. The button is vibrating at a frequency only dogs respect",
  "Fully charged. The lab insurance policy has been quietly reviewed",
];

const CHARGE_RELEASE_LINES = [
  "OVERCHARGE. That one is going in the lab's incident log",
  "Released. The button saw colors that do not exist yet",
  "Detonation complete. Nothing was accomplished, spectacularly",
  "The capacitors are spent. Deeply, thoroughly worth it",
];

const CHARGE_CANCEL_LINE = "Cancelled. The charge dissipated as mild embarrassment";

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Chaos Button: missing #${id}`);
  return node as T;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}

export class ChaosEngine {
  // elements (public so behavior methods can reach them)
  root!: HTMLElement;
  stage!: HTMLElement;
  button!: HTMLButtonElement;
  label!: HTMLElement;
  quoteText!: HTMLElement;
  quoteAuthor!: HTMLElement;
  quoteKicker!: HTMLElement;
  quoteBox!: HTMLElement;
  fakeLoading!: HTMLElement;
  fakeBarFill!: HTMLElement;
  fakePct!: HTMLElement;
  fakeNote!: HTMLElement;
  bureauBackdrop!: HTMLElement;
  bureauForm!: HTMLFormElement;
  bureauResult!: HTMLElement;
  bureauSubmit!: HTMLButtonElement;
  enlightenCard!: HTMLElement;
  enlightenQuote!: HTMLElement;
  easterEgg!: HTMLElement;
  statusText!: HTMLElement;
  moodText!: HTMLElement;
  clickCount!: HTMLElement;
  fortuneCard!: HTMLElement;
  fortuneText!: HTMLElement;
  fortuneNumbers!: HTMLElement;
  cycleMeterFill!: HTMLElement;
  comboChip!: HTMLElement;
  comboX!: HTMLElement;
  comboTier!: HTMLElement;
  therapistBubble!: HTMLElement;
  therapistText!: HTMLElement;
  recChip!: HTMLElement;
  recTime!: HTMLElement;
  bossScreen!: HTMLElement;
  bossSheet!: HTMLElement;
  bossTitle!: HTMLElement;
  partyChip!: HTMLElement;
  partyTime!: HTMLElement;

  // systems + chrome
  audio = new DramaticAudio();
  quotes = new QuoteGenerator();
  confetti!: ConfettiSystem;
  fx!: VisualEffectsController;
  records!: AchievementSystem;
  private recordsToggle!: HTMLButtonElement;
  private recordsPanel!: HTMLElement;
  private recordsReset!: HTMLButtonElement;
  private recordsExport!: HTMLButtonElement;
  private recordsImport!: HTMLButtonElement;
  private recordsImportFile!: HTMLInputElement;

  // state
  phase: Phase = 1;
  osReduced = false;
  locked = false;
  destroyed = false;
  private media: MediaQueryList | null = null;
  private settings = new SettingsStore();
  private totalClicks = 0;
  private cycleClicks = 0;
  private lastBehaviorId: string | null = null;
  private usedOncePerCycle = new Set<string>();
  private easterEggFired = false;
  private lastStatusIndex = -1;
  private labelToken = 0;
  private statusToken = 0;
  private timers = new Set<number>();
  private cleanups: Array<() => void> = [];
  private loadingTextTimer = 0;
  private idleTimer = 0;
  /** Generation token for the ceremony sparkle chain. Bumped on reset so the
   * chain dies with its ceremony instead of sparkling forever after. */
  private sparkleRun = 0;
  private konamiIndex = 0;
  private clingyRaf = 0;
  private clingyTarget = { x: 0, y: 0 };
  private clingyCurrent = { x: 0, y: 0 };
  private soundToggle!: HTMLButtonElement;
  private shareToggle!: HTMLButtonElement;
  private settingsToggle!: HTMLButtonElement;
  private settingsPanel!: HTMLElement;
  private volumeSlider!: HTMLInputElement;
  private volumeValue!: HTMLElement;
  private flashSwitch!: HTMLButtonElement;
  private motionSwitch!: HTMLButtonElement;
  private titleSwitch!: HTMLButtonElement;
  private themeRadios: HTMLButtonElement[] = [];
  private rankLine!: HTMLElement;
  private sessionRankIndex = 0;
  private streak = 0;
  private lastClickAt = 0;
  private streakHideTimer = 0;
  private lastSparkleAt = 0;
  private sparkleTrail: ((ev: PointerEvent) => void) | null = null;
  private originalTitle = "";
  private titleLocked = false;
  private bossOpen = false;
  private partyUntil = 0;
  private partyTickTimer = 0;
  private chargeGraceTimer = 0;
  private chargeRaf = 0;
  private chargeHeld = false;
  private chargeActive = false;
  private chargeStartAt = 0;
  private chargeLabelToken = 0;
  private chargeStatusMilestone = -1;
  private chargeRing: HTMLElement | null = null;
  private chargeChip: HTMLElement | null = null;
  private chargePct: HTMLElement | null = null;
  private lastTapAt = 0;
  private lastTapConsumed = false;
  private quietSelf: ChaosEngine | null = null;
  private schemeMedia: MediaQueryList | null = null;
  private recordsDuel!: HTMLButtonElement;
  private intensitySlider!: HTMLInputElement;
  private intensityValue!: HTMLElement;
  private duelModal!: HTMLElement;
  private duelSummary!: HTMLElement;
  private pendingDuel: unknown = null;
  private seismoCanvas!: HTMLCanvasElement;
  private seismo!: SeismoGraph;
  private flightLog!: HTMLElement;
  private seismoSamples: SeismoSample[] = [];
  private sessionLog: Array<{ t: number; text: string; cat: string }> = [];
  private seismoRenderQueued = false;

  constructor() {
    this.osReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /** Effective motion policy: the OS setting or the Control Room toggle. */
  get reduced(): boolean {
    return this.osReduced || !this.settings.all.motion;
  }

  // ------------------------------------------------------------------
  // lifecycle
  // ------------------------------------------------------------------

  init(): void {
    this.root = el("chaos-root");
    this.stage = el("stage");
    this.button = el<HTMLButtonElement>("chaos-button");
    this.label = el("button-label");
    this.statusText = el("status-text");
    this.moodText = el("mood-text");
    this.clickCount = el("click-count");
    this.fakeLoading = el("fake-loading");
    this.fakeBarFill = el("fake-bar-fill");
    this.fakePct = el("fake-loading-pct");
    this.fakeNote = el("fake-loading-note");
    this.quoteBox = el("quote-box");
    this.quoteText = el("quote-text");
    this.quoteAuthor = el("quote-author");
    this.quoteKicker = el("quote-kicker");
    this.bureauBackdrop = el("bureau-backdrop");
    this.bureauForm = el<HTMLFormElement>("bureau-form");
    this.bureauResult = el("bureau-result");
    this.bureauSubmit = el<HTMLButtonElement>("bureau-submit");
    this.enlightenCard = el("enlighten-card");
    this.enlightenQuote = el("enlighten-quote");
    this.easterEgg = el("easter-egg");
    this.fortuneCard = el("fortune-card");
    this.fortuneText = el("fortune-text");
    this.fortuneNumbers = el("fortune-numbers");
    this.cycleMeterFill = el("cycle-meter-fill");
    this.comboChip = el("combo-chip");
    this.comboX = el("combo-x");
    this.comboTier = el("combo-tier");
    this.therapistBubble = el("therapist-bubble");
    this.therapistText = el("therapist-text");
    this.recChip = el("rec-chip");
    this.recTime = el("rec-time");
    this.bossScreen = el("boss-screen");
    this.bossSheet = el("boss-sheet");
    this.bossTitle = el("boss-title");
    this.partyChip = el("party-chip");
    this.partyTime = el("party-time");
    this.soundToggle = el<HTMLButtonElement>("sound-toggle");
    this.shareToggle = el<HTMLButtonElement>("share-toggle");
    this.settingsToggle = el<HTMLButtonElement>("settings-toggle");
    this.settingsPanel = el("settings-panel");
    this.volumeSlider = el<HTMLInputElement>("setting-volume");
    this.volumeValue = el("setting-volume-value");
    this.flashSwitch = el<HTMLButtonElement>("setting-flashes");
    this.motionSwitch = el<HTMLButtonElement>("setting-motion");
    this.titleSwitch = el<HTMLButtonElement>("setting-titles");
    this.themeRadios = ["theme-dark", "theme-light", "theme-sepia", "theme-sodium", "theme-auto"].map((id) =>
      el<HTMLButtonElement>(id),
    );
    this.rankLine = el("rank-line");
    this.recordsToggle = el<HTMLButtonElement>("records-toggle");
    this.recordsPanel = el("records-panel");
    this.recordsReset = el<HTMLButtonElement>("records-reset");
    this.recordsDuel = el<HTMLButtonElement>("records-duel");
    this.intensitySlider = el<HTMLInputElement>("setting-intensity");
    this.intensityValue = el("setting-intensity-value");
    this.duelModal = el("duel-backdrop");
    this.duelSummary = el("duel-summary");
    this.seismoCanvas = el<HTMLCanvasElement>("seismo-canvas");
    this.seismo = new SeismoGraph(this.seismoCanvas);
    this.flightLog = el("flight-log");

    const canvas = el<HTMLCanvasElement>("fx-canvas");
    this.confetti = new ConfettiSystem(canvas, this.reduced);
    this.fx = new VisualEffectsController({
      stage: this.stage,
      root: this.root,
      flash: el("flash-overlay"),
      strobe: el("strobe-overlay"),
      alarm: el("alarm-overlay"),
      reduced: this.reduced,
      schedule: this.schedule,
    });
    this.records = new AchievementSystem({
      toastStack: el("toast-stack"),
      panel: this.recordsPanel,
      statsList: el("records-stats"),
      achGrid: el("records-ach-grid"),
      censusList: el("records-census"),
      badge: el("records-badge"),
      reduced: this.reduced,
      schedule: this.schedule,
    });
    // the flight recorder subscribes to record unlocks
    this.records.onUnlock = (name) => this.logEvent(`Record unlocked: ${name}`, "record");
    this.seismoCanvas.addEventListener("click", this.handleSeismoClick);

    // apply persisted Control Room settings to every subsystem
    this.syncReduced();
    this.audio.setVolume(this.settings.all.volume / 100);
    this.fx.setFlashes(this.settings.all.flashes);
    this.applyTheme();
    this.initSettingsUI();

    this.media = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.media.addEventListener("change", this.handleMediaChange);

    this.sessionRankIndex = rankIndexFor(this.records.snapshot.summons);
    this.updateRankLine();

    // one visit per boot, then a greeting based on the local hour
    this.records.stat("visits");
    this.schedule(() => {
      if (this.destroyed || this.locked) return;
      const visits = this.records.snapshot.visits;
      const base = greetingForHour(new Date().getHours());
      this.setStatus(visits > 1 ? `${base} (Visit ${visits}: the button keeps a list)` : base);
    }, 2500);

    this.root.classList.add("phase-1");
    this.clickCount.textContent = "0";
    this.moodText.textContent = MOODS[1][0];
    this.label.textContent = PHASE_LABELS[1];
    this.statusText.textContent = "The button is charging its personality";

    this.originalTitle = document.title;
    this.applyTitle();
    // Next.js dev hydration applies <title> metadata after effects run,
    // so re-assert the phase title once hydration has settled.
    this.schedule(() => this.applyTitle(), 600);
    this.schedule(() => this.applyTitle(), 1600);

    this.button.addEventListener("click", this.handleClick);
    this.soundToggle.addEventListener("click", this.handleSoundToggle);
    this.shareToggle.addEventListener("click", this.handleShare);
    this.recordsToggle.addEventListener("click", this.handleRecordsToggle);
    el("records-close").addEventListener("click", this.handleRecordsToggle);
    this.recordsReset.addEventListener("click", this.handleRecordsReset);
    this.recordsExport = el<HTMLButtonElement>("records-export");
    this.recordsImport = el<HTMLButtonElement>("records-import");
    this.recordsImportFile = el<HTMLInputElement>("records-import-file");
    this.recordsExport.addEventListener("click", this.handleExport);
    this.recordsImport.addEventListener("click", this.handleImportClick);
    this.recordsImportFile.addEventListener("change", this.handleImportFile);
    this.recordsDuel.addEventListener("click", this.handleDuelCopy);
    this.intensitySlider.addEventListener("input", this.handleIntensityInput);
    this.intensitySlider.addEventListener("change", this.handleIntensityChange);
    el("duel-accept").addEventListener("click", this.absorbDuel);
    el("duel-decline").addEventListener("click", this.declineDuel);
    window.addEventListener("keydown", this.handleDuelKey);
    // auto theme follows the device's color scheme while it changes live
    this.schemeMedia = window.matchMedia("(prefers-color-scheme: light)");
    this.schemeMedia.addEventListener("change", this.handleSchemeChange);
    window.addEventListener("keydown", this.handleKonami);
    window.addEventListener("keydown", this.handlePanicKey);
    this.initOvercharge();
    this.initAmbientDust();
    this.runLoadingScreen();
    this.armIdleNag();
    // once per day: a free date-seeded fortune, no clicking required
    this.schedule(() => this.maybeShowDailyFortune(), 4600);
    // a duel link rides in through the URL hash, after the loading curtain
    this.schedule(() => this.checkDuelHash(), 3400);
    // the drum and the recorder start from the top: laboratory online
    this.logEvent("Laboratory online. Safety features: decorative", "system");
    // dev-only debug hook for automated QA
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as Record<string, unknown>).__chaos = this;
    }
  }

  destroy(): void {
    this.destroyed = true;
    if (this.originalTitle) document.title = this.originalTitle;
    this.detachSparkleTrail();
    this.deinitOvercharge();
    this.deinitAmbientDust();
    this.records?.destroy();
    window.clearTimeout(this.streakHideTimer);
    this.button?.removeEventListener("click", this.handleClick);
    this.soundToggle?.removeEventListener("click", this.handleSoundToggle);
    this.shareToggle?.removeEventListener("click", this.handleShare);
    this.recordsToggle?.removeEventListener("click", this.handleRecordsToggle);
    el("records-close")?.removeEventListener("click", this.handleRecordsToggle);
    this.recordsReset?.removeEventListener("click", this.handleRecordsReset);
    this.recordsExport?.removeEventListener("click", this.handleExport);
    this.recordsImport?.removeEventListener("click", this.handleImportClick);
    this.recordsImportFile?.removeEventListener("change", this.handleImportFile);
    this.recordsDuel?.removeEventListener("click", this.handleDuelCopy);
    this.seismoCanvas?.removeEventListener("click", this.handleSeismoClick);
    this.seismo?.stop();
    this.intensitySlider?.removeEventListener("input", this.handleIntensityInput);
    this.intensitySlider?.removeEventListener("change", this.handleIntensityChange);
    document.getElementById("duel-accept")?.removeEventListener("click", this.absorbDuel);
    document.getElementById("duel-decline")?.removeEventListener("click", this.declineDuel);
    window.removeEventListener("keydown", this.handleDuelKey);
    this.schemeMedia?.removeEventListener("change", this.handleSchemeChange);
    window.removeEventListener("keydown", this.handleKonami);
    window.removeEventListener("keydown", this.handlePanicKey);
    window.clearInterval(this.partyTickTimer);
    this.deinitSettingsUI();
    this.media?.removeEventListener("change", this.handleMediaChange);
    this.settingsPanel?.classList.remove("on");
    this.settingsToggle?.setAttribute("aria-expanded", "false");
    window.clearTimeout(this.idleTimer);
    if (this.button) this.cleanupActives();
    this.timers.forEach((t) => window.clearTimeout(t));
    this.timers.clear();
    window.clearInterval(this.loadingTextTimer);
    cancelAnimationFrame(this.clingyRaf);
    this.fx?.stopAllRafs();
    this.confetti?.destroy();
  }

  /** Tracked setTimeout. Everything goes through here so destroy() is total. */
  schedule = (fn: () => void, ms: number): number => {
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      if (!this.destroyed) fn();
    }, ms);
    this.timers.add(id);
    return id;
  };

  addCleanup(fn: () => void): void {
    this.cleanups.push(fn);
  }

  // ------------------------------------------------------------------
  // loading screen
  // ------------------------------------------------------------------

  private runLoadingScreen(): void {
    const screen = el("loading-screen");
    const text = el("loading-text");
    const fill = el("loading-bar-fill");

    let i = 0;
    text.textContent = LOADING_TEXTS[0];
    this.loadingTextTimer = window.setInterval(() => {
      i = (i + 1) % LOADING_TEXTS.length;
      text.textContent = LOADING_TEXTS[i];
    }, 620);

    const start = performance.now();
    const total = 1900;
    const step = (now: number) => {
      if (this.destroyed) return;
      const p = Math.min(1, (now - start) / total);
      fill.style.width = `${Math.floor(p * 100)}%`;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);

    this.schedule(() => {
      screen.classList.add("is-hidden");
      window.clearInterval(this.loadingTextTimer);
    }, 2100);

    // belt and braces fail-safe
    this.schedule(() => screen.classList.add("is-hidden"), 3000);
  }

  // ------------------------------------------------------------------
  // click pipeline
  // ------------------------------------------------------------------

  private handleClick = (ev?: MouseEvent): void => {
    if (this.locked || this.destroyed) return;
    this.audio.unlock();
    this.cleanupActives();
    this.spawnRipple(ev);

    this.totalClicks++;
    this.cycleClicks++;
    this.clickCount.textContent = String(this.totalClicks);
    this.clickCount.classList.remove("bump");
    void this.clickCount.offsetWidth; // retrigger the odometer pop
    this.clickCount.classList.add("bump");
    this.records.stat("summons");
    this.checkRank();

    // Click streak: rapid presses chain into a combo. Pure glory, no effect.
    const now = performance.now();
    if (now - this.lastClickAt <= STREAK_WINDOW_MS) this.streak++;
    else this.streak = 1;
    this.lastClickAt = now;
    this.updateStreak();

    // Double-tap: two presses inside a tight window fork the timeline.
    const isDouble = now - this.lastTapAt <= DOUBLE_TAP_WINDOW_MS && !this.lastTapConsumed;
    this.lastTapConsumed = isDouble;
    this.lastTapAt = now;

    // Easter egg overrides everything: exactly 42 summons.
    if (!this.easterEggFired && this.totalClicks === 42) {
      this.recordSample("egg", 3);
      this.triggerEasterEgg();
      return;
    }

    // Phase 4 is the triumphant celebration at exactly 26 cycle clicks.
    if (this.cycleClicks >= 26) {
      this.recordSample("ceremony", 2.5);
      this.celebrate();
      return;
    }

    const nextPhase: Phase = this.cycleClicks <= 5 ? 1 : this.cycleClicks <= 15 ? 2 : 3;
    if (nextPhase !== this.phase) {
      const prev = this.phase;
      this.phase = nextPhase;
      this.applyPhaseClass();
      this.logEvent(
        `Phase ${["I", "II", "III", "IV"][nextPhase - 1]} entered (from ${["I", "II", "III", "IV"][prev - 1]}). The room noticed`,
        "phase",
      );
    }

    this.audio.blip(this.phase);
    this.rotateStatus();
    this.recordSample("tap", 1);
    if (isDouble) {
      this.triggerDoubleTrouble();
    } else {
      this.pickAndRunBehaviors();
    }
    this.updateCycleMeter();
    this.armIdleNag();
  };

  /** The double-tap payoff: split ghosts, a timeline stutter, a double bill. */
  private triggerDoubleTrouble(): void {
    this.records.stat("doubleTaps");
    this.audio.doubleTrouble();
    this.spawnDoubleTroubleGhosts();
    this.recordSample("double", 2);
    if (!this.reduced) {
      this.root.classList.add("double-trouble");
      this.schedule(() => this.root.classList.remove("double-trouble"), 700);
    }
    // the forked timeline books a second show, then the headline lands last
    // so behavior chatter cannot bury the announcement
    this.pickAndRunBehaviors(2);
    this.setStatus(DOUBLE_TROUBLE_LINES[Math.floor(Math.random() * DOUBLE_TROUBLE_LINES.length)]);
  }

  /** Two half-transparent copies of the button peel off in opposite directions. */
  private spawnDoubleTroubleGhosts(): void {
    if (this.reduced || this.destroyed) return;
    const zone = document.getElementById("button-zone");
    if (!zone) return;
    const rect = this.button.getBoundingClientRect();
    const zrect = zone.getBoundingClientRect();
    const text = this.label?.textContent ?? "PRESS ME";
    for (const dir of [-1, 1]) {
      const ghost = document.createElement("span");
      ghost.className = "dt-ghost";
      ghost.dataset.dir = dir > 0 ? "right" : "left";
      ghost.textContent = text;
      ghost.setAttribute("aria-hidden", "true");
      ghost.style.left = `${rect.left - zrect.left + rect.width / 2}px`;
      ghost.style.top = `${rect.top - zrect.top + rect.height / 2}px`;
      ghost.style.width = `${rect.width}px`;
      ghost.style.height = `${rect.height}px`;
      zone.appendChild(ghost);
      this.schedule(() => ghost.remove(), 950);
    }
  }

  private handleSoundToggle = (): void => {
    this.audio.unlock();
    const muted = !this.audio.muted;
    this.audio.setMuted(muted);
    if (muted) this.records.stat("mutes");
    this.soundToggle.setAttribute("aria-pressed", String(!muted));
    this.soundToggle.setAttribute(
      "aria-label",
      muted ? "Unmute dramatic sounds" : "Mute dramatic sounds",
    );
  };

  private handleRecordsToggle = (): void => {
    const open = !this.recordsPanel.classList.contains("on");
    if (open) this.closeSettings();
    this.recordsPanel.classList.toggle("on", open);
    this.recordsToggle.setAttribute("aria-expanded", String(open));
    if (open) {
      this.records.renderPanel(true);
      // the drum and the recorder refresh every time the hall opens
      this.renderSeismo();
      this.renderFlightLog();
    }
  };

  // ------------------------------------------------------------------
  // chaos seismograph + flight recorder: session instruments
  // ------------------------------------------------------------------

  /** One needle on the drum. Session-only; the drum is wiped by refreshes. */
  private recordSample(kind: SeismoSample["kind"], mag: number): void {
    this.seismoSamples.push({ t: Date.now(), phase: this.phase, mag, kind });
    if (this.seismoSamples.length > 200) this.seismoSamples.splice(0, this.seismoSamples.length - 200);
    // coalesce redraws: a burst of rapid presses would otherwise paint per click
    if (this.recordsPanel.classList.contains("on") && !this.seismoRenderQueued) {
      this.seismoRenderQueued = true;
      requestAnimationFrame(() => {
        this.seismoRenderQueued = false;
        if (!this.destroyed) this.renderSeismo();
      });
    }
  }

  /** An entry in the flight recorder. Session-only, capped, never synced. */
  logEvent(text: string, cat: string): void {
    this.sessionLog.push({ t: Date.now(), text, cat });
    if (this.sessionLog.length > 40) this.sessionLog.splice(0, this.sessionLog.length - 40);
    if (this.recordsPanel?.classList.contains("on")) this.renderFlightLog();
  }

  private renderSeismo(): void {
    this.seismo?.render(this.seismoSamples);
    const total = document.getElementById("seismo-total");
    if (total) total.textContent = `${this.seismoSamples.length} event${this.seismoSamples.length === 1 ? "" : "s"}`;
  }

  private renderFlightLog(): void {
    if (!this.flightLog || this.destroyed) return;
    if (this.sessionLog.length === 0) {
      this.flightLog.innerHTML = '<p class="flight-empty">No incidents logged. Suspiciously clean</p>';
      return;
    }
    const time = (t: number) => {
      const d = new Date(t);
      const p = (n: number) => String(n).padStart(2, "0");
      return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    };
    // newest first, newest also highlighted so the log reads like a feed
    const rows = [...this.sessionLog]
      .reverse()
      .slice(0, 8)
      .map(
        (e, i) =>
          `<p class="flight-row ${i === 0 ? "fresh" : ""}"><span class="flight-time">${time(e.t)}</span><span class="flight-text cat-${e.cat}">${e.text}</span></p>`,
      )
      .join("");
    this.flightLog.innerHTML = rows;
  }

  /** Tapping the drum replays the session: sweep, pulse, tick per needle. */
  private handleSeismoClick = (): void => {
    if (this.destroyed) return;
    if (this.seismoSamples.length === 0) {
      this.setStatus("The drum is blank. Press the button. Make some history first");
      return;
    }
    if (this.seismo.isReplaying) return;
    this.records.stat("replays");
    this.audio.unlock();
    this.setStatus("Replaying the session. Every needle, every phase, every regret");
    let lastTickAt = 0;
    this.seismo.replay(this.seismoSamples, {
      reduced: this.reduced,
      onTick: (s) => {
        const now = performance.now();
        if (now - lastTickAt < 55) return;
        lastTickAt = now;
        this.audio.tick();
        // louder occasions deserve a louder tick; ceremonies get the chime
        if (s.kind === "ceremony" || s.kind === "egg") this.audio.chime();
      },
    });
  };

  private handleRecordsReset = (): void => {
    if (this.recordsReset.dataset.confirm === "1") {
      this.records.forgetEverything();
      this.sessionRankIndex = 0;
      this.updateRankLine();
      this.recordsReset.textContent = "Forget Everything";
      this.recordsReset.dataset.confirm = "";
      this.setStatus("Records forgotten. Legally, this never happened");
    } else {
      this.recordsReset.dataset.confirm = "1";
      this.recordsReset.textContent = "Click again to confirm amnesia";
      this.schedule(() => {
        this.recordsReset.textContent = "Forget Everything";
        this.recordsReset.dataset.confirm = "";
      }, 6000);
    }
  };

  /** Download the whole ledger as a JSON file. Nonsense, but portable. */
  private handleExport = (): void => {
    try {
      const payload = {
        app: "chaos-button",
        version: 1,
        exportedAt: new Date().toISOString(),
        records: this.records.exportPayload(),
        settings: this.settings.all,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const stamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chaos-button-backup-${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      this.schedule(() => URL.revokeObjectURL(url), 4000);
      this.records.stat("exports");
      this.audio.pop();
      this.setStatus("Backup exported. Your nonsense is now fully portable");
      this.logEvent("Backup exported. The nonsense is now portable", "system");
    } catch {
      this.setStatus("Export failed. The archive refuses to acknowledge the archive");
    }
  };

  private handleImportClick = (): void => {
    this.recordsImportFile.click();
  };

  /** Merge a backup file into the living records. Keeps the better numbers. */
  private handleImportFile = (): void => {
    const file = this.recordsImportFile.files?.[0];
    this.recordsImportFile.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (this.destroyed) return;
      try {
        const data = JSON.parse(String(reader.result)) as {
          records?: unknown;
          settings?: Record<string, unknown>;
        };
        const improved = this.records.importPayload(data.records);
        if (improved < 0) {
          this.audio.deny();
          this.setStatus(IMPORT_BAD_LINES[Math.floor(Math.random() * IMPORT_BAD_LINES.length)]);
          return;
        }
        // settings restore: only known keys, validated, never trusted blind
        if (data.settings && typeof data.settings === "object") {
          const s = data.settings;
          if (typeof s.volume === "number" && Number.isFinite(s.volume)) {
            this.settings.set("volume", Math.min(100, Math.max(0, Math.round(s.volume))));
          }
          for (const key of ["flashes", "motion", "tabTitles"] as const) {
            if (typeof s[key] === "boolean") this.settings.set(key, s[key]);
          }
          if (typeof s.theme === "string" && ["dark", "light", "sepia", "sodium", "auto"].includes(s.theme)) {
            this.settings.set("theme", s.theme as ThemeName);
          }
          if (typeof s.intensity === "number" && Number.isFinite(s.intensity)) {
            this.settings.set("intensity", Math.min(200, Math.max(50, Math.round(s.intensity / 10) * 10)));
          }
          this.applyTheme();
          this.syncSettingsUI();
          this.audio.setVolume(this.settings.all.volume / 100);
        }
        this.records.stat("imports");
        this.checkRank();
        this.audio.chime();
        this.records.customToast(
          "Time heist",
          "Backup restored",
          "We kept the better numbers. The past is back on the books",
        );
        this.logEvent(`Backup restored: ${improved} record${improved === 1 ? "" : "s"} improved`, "system");
        this.setStatus(
          `Backup restored. ${improved} record${improved === 1 ? "" : "s"} improved. The ledger forgives nothing`,
        );
      } catch {
        this.audio.deny();
        this.setStatus(IMPORT_BAD_LINES[Math.floor(Math.random() * IMPORT_BAD_LINES.length)]);
      }
    };
    reader.readAsText(file);
  };

  // ------------------------------------------------------------------
  // the control room (settings that, unlike the button, work)
  // ------------------------------------------------------------------

  private initSettingsUI(): void {
    this.paintVolume();
    this.volumeSlider.addEventListener("input", this.handleVolumeInput);
    this.volumeSlider.addEventListener("change", this.handleVolumeChange);
    this.flashSwitch.addEventListener("click", this.handleFlashSwitch);
    this.motionSwitch.addEventListener("click", this.handleMotionSwitch);
    this.titleSwitch.addEventListener("click", this.handleTitleSwitch);
    this.themeRadios.forEach((radio) => radio.addEventListener("click", this.handleThemePick));
    this.settingsToggle.addEventListener("click", this.handleSettingsToggle);
    el("settings-close").addEventListener("click", this.closeSettings);
    this.syncSettingsUI();
  }

  private deinitSettingsUI(): void {
    this.volumeSlider?.removeEventListener("input", this.handleVolumeInput);
    this.volumeSlider?.removeEventListener("change", this.handleVolumeChange);
    this.flashSwitch?.removeEventListener("click", this.handleFlashSwitch);
    this.motionSwitch?.removeEventListener("click", this.handleMotionSwitch);
    this.titleSwitch?.removeEventListener("click", this.handleTitleSwitch);
    this.themeRadios?.forEach((radio) => radio.removeEventListener("click", this.handleThemePick));
    this.settingsToggle?.removeEventListener("click", this.handleSettingsToggle);
    document.getElementById("settings-close")?.removeEventListener("click", this.closeSettings);
  }

  private handleSettingsToggle = (): void => {
    const open = !this.settingsPanel.classList.contains("on");
    if (open) {
      // the two drawers never share the stage
      if (this.recordsPanel.classList.contains("on")) {
        this.recordsPanel.classList.remove("on");
        this.recordsToggle.setAttribute("aria-expanded", "false");
      }
      this.audio.unlock();
    }
    this.settingsPanel.classList.toggle("on", open);
    this.settingsToggle.setAttribute("aria-expanded", String(open));
    if (open) this.syncSettingsUI();
  };

  private closeSettings = (): void => {
    this.settingsPanel?.classList.remove("on");
    this.settingsToggle?.setAttribute("aria-expanded", "false");
  };

  private handleVolumeInput = (): void => {
    const v = Number(this.volumeSlider.value);
    this.settings.set("volume", v);
    this.audio.setVolume(v / 100);
    this.paintVolume();
  };

  private handleVolumeChange = (): void => {
    this.records.stat("tinkers");
    this.setStatus("Volume calibrated. The drama is now at your exact preferred intensity");
  };

  private handleFlashSwitch = (): void => {
    this.toggleSetting("flashes");
  };

  private handleMotionSwitch = (): void => {
    this.toggleSetting("motion");
  };

  private handleTitleSwitch = (): void => {
    this.toggleSetting("tabTitles");
  };

  private handleThemePick = (ev: MouseEvent): void => {
    const value = (ev.currentTarget as HTMLElement).dataset.themeValue as ThemeName | undefined;
    if (!value || value === this.settings.all.theme) return;
    this.settings.set("theme", value);
    this.applyTheme();
    this.syncSettingsUI();
    this.records.stat("tinkers");
    this.audio.unlock();
    this.audio.blip(this.phase);
    this.setStatus(THEME_LINES[value]);
  };

  private toggleSetting(key: "flashes" | "motion" | "tabTitles"): void {
    const next = !this.settings.all[key];
    this.settings.set(key, next);
    this.applySettingSideEffects(key);
    this.syncSettingsUI();
    this.records.stat("tinkers");
    this.audio.blip(this.phase);
    this.setStatus(SETTING_LINES[key][next ? "on" : "off"]);
  }

  private applySettingSideEffects(key: "flashes" | "motion" | "tabTitles"): void {
    switch (key) {
      case "flashes":
        this.fx.setFlashes(this.settings.all.flashes);
        break;
      case "motion":
        this.syncReduced();
        break;
      case "tabTitles":
        this.applyTitle();
        break;
    }
  }

  /** Flips the whole palette via one attribute. CSS does the rest. */
  private applyTheme(): void {
    const pref = this.settings.all.theme;
    const resolved = pref === "auto" ? this.resolveAutoTheme() : pref;
    this.root?.setAttribute("data-theme", resolved);
    document.documentElement.setAttribute("data-theme", resolved);
    // the preference rides along so CSS can react to "auto" without JS
    this.root?.setAttribute("data-theme-pref", pref);
    document.documentElement.setAttribute("data-theme-pref", pref);
    // the drum reads its ink from CSS custom properties, so it must redraw
    if (this.recordsPanel?.classList.contains("on")) this.renderSeismo();
  }

  private resolveAutoTheme(): "light" | "dark" {
    return this.schemeMedia?.matches ? "light" : "dark";
  }

  /** The OS flipped its color scheme mid-session; auto themes must follow. */
  private handleSchemeChange = (): void => {
    if (this.settings.all.theme === "auto") this.applyTheme();
  };

  /** Pushes the effective motion policy into every subsystem. */
  private syncReduced(): void {
    const reduced = this.reduced;
    this.fx?.setReduced(reduced);
    this.confetti?.setReduced(reduced);
    if (this.records) this.records.reduced = reduced;
  }

  private handleMediaChange = (ev: MediaQueryListEvent): void => {
    this.osReduced = ev.matches;
    this.syncReduced();
  };

  private syncSettingsUI(): void {
    const s = this.settings.all;
    this.paintVolume();
    this.paintIntensity();
    this.flashSwitch.setAttribute("aria-checked", String(s.flashes));
    this.motionSwitch.setAttribute("aria-checked", String(s.motion));
    this.titleSwitch.setAttribute("aria-checked", String(s.tabTitles));
    this.themeRadios.forEach((radio) => {
      radio.setAttribute("aria-checked", String(radio.dataset.themeValue === s.theme));
    });
  }

  private paintVolume(): void {
    const v = this.settings.all.volume;
    this.volumeSlider.value = String(v);
    this.volumeValue.textContent = String(v);
    const pct = Math.min(100, Math.max(0, v));
    this.volumeSlider.style.background =
      `linear-gradient(90deg, var(--c-accent-3) 0%, var(--c-accent-2) ${pct}%, rgba(255,255,255,0.09) ${pct}%)`;
  }

  // ------------------------------------------------------------------
  // the chaos dial: 50 to 200 percent commitment
  // ------------------------------------------------------------------

  private handleIntensityInput = (): void => {
    const v = Number(this.intensitySlider.value);
    this.settings.set("intensity", v);
    this.paintIntensity();
  };

  private handleIntensityChange = (): void => {
    this.records.stat("dialTurns");
    this.audio.blip(this.phase);
    this.setStatus(dialLine(this.settings.all.intensity));
  };

  private paintIntensity(): void {
    const v = this.settings.all.intensity;
    this.intensitySlider.value = String(v);
    this.intensityValue.textContent = String(v);
    const pct = Math.min(100, Math.max(0, ((v - 50) / 150) * 100));
    this.intensitySlider.style.background =
      `linear-gradient(90deg, var(--c-accent-2) 0%, var(--c-accent-3) ${pct}%, rgba(255,255,255,0.09) ${pct}%)`;
  }

  // ------------------------------------------------------------------
  // press ranks
  // ------------------------------------------------------------------

  private checkRank(): void {
    const index = rankIndexFor(this.records.snapshot.summons);
    this.updateRankLine();
    if (index <= this.sessionRankIndex) return;
    const previous = this.sessionRankIndex;
    this.sessionRankIndex = index;
    for (let i = previous + 1; i <= index; i++) {
      this.records.customToast(
        "Promotion",
        `Rank up: ${RANKS[i].name}`,
        "Official recognition for repeatedly pressing one button. Frame it. Or do not",
      );
    }
    const center = this.buttonCenter();
    this.confetti.burst(center.x, center.y, this.reduced ? 20 : 55);
    this.audio.pop();
  }

  private updateRankLine(): void {
    if (!this.rankLine) return;
    const summons = this.records.snapshot.summons;
    const index = rankIndexFor(summons);
    const rank = RANKS[index];
    const next = RANKS[index + 1];
    this.rankLine.textContent = next
      ? `Rank: ${rank.name} : ${next.at - summons} presses to ${next.name}`
      : `Rank: ${rank.name} : maxed out. Seek help`;
  }

  // ------------------------------------------------------------------
  // daily fortune: one date-seeded cookie per day, free of charge
  // ------------------------------------------------------------------

  private maybeShowDailyFortune(): void {
    if (this.destroyed || this.locked) return;
    const now = new Date();
    const today = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    let last: string | null = null;
    try {
      last = localStorage.getItem(DAILY_FORTUNE_KEY);
      if (last !== today) localStorage.setItem(DAILY_FORTUNE_KEY, today);
    } catch {
      /* no storage, no daily fortune, no tragedy */
    }
    if (last === today) return;

    // mulberry-ish LCG seeded by the date: everyone gets the same fortune per day
    let state = (now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()) % 2147483647;
    if (state <= 0) state += 2147483646;
    const rng = () => {
      state = (state * 16807) % 2147483647;
      return (state - 1) / 2147483646;
    };

    const kicker = document.getElementById("fortune-kicker");
    if (kicker) kicker.textContent = "Daily Fortune";
    this.fortuneText.textContent = FORTUNES[Math.floor(rng() * FORTUNES.length)];
    const nums = new Set<number>();
    while (nums.size < 4) nums.add(1 + Math.floor(rng() * 99));
    this.fortuneNumbers.textContent = [...nums].join(" , ");
    this.fortuneCard.classList.remove("on");
    void this.fortuneCard.offsetWidth;
    this.fortuneCard.classList.add("on");
    this.setStatus("A complimentary daily fortune. The cookie is on the house. So is the vagueness");
    this.schedule(() => {
      this.fortuneCard.classList.remove("on");
      if (kicker) kicker.textContent = "Fortune Cookie";
    }, 5200);
  }

  // ------------------------------------------------------------------
  // share the brag
  // ------------------------------------------------------------------

  private handleShare = async (): Promise<void> => {
    if (this.destroyed) return;
    this.audio.unlock();
    const s = this.records.snapshot;
    const u = this.records.unlockedCount;
    const t = this.records.total;
    const rank = RANKS[rankIndexFor(s.summons)].name;
    const text =
      `I summoned The Chaos Button ${s.summons} times, earned the rank of ${rank}, ` +
      `reached enlightenment ${s.cycles} times, chained a best streak of ${s.bestStreak} presses ` +
      `and unlocked ${u}/${t} records. Zero work was accomplished. ${location.origin}`;

    let ok = false;
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (typeof nav.share === "function") {
      try {
        await nav.share({ title: "The Chaos Button", text });
        ok = true;
      } catch {
        ok = false; // user closed the sheet, or the API sulked
      }
    }
    if (!ok) ok = await this.copyText(text);

    if (ok) {
      this.records.stat("shares");
      const center = this.buttonCenter();
      this.confetti.burst(center.x, center.y, this.reduced ? 24 : 70);
      this.audio.pop();
      this.tempLabel("SPREAD THE WORD", 2200);
      this.setStatus("Brag dispatched. Someone, somewhere, does not care. Yet");
    } else {
      this.setStatus("The brag refused to leave. Your privacy is preserved, tragically");
    }
  };

  private async copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        area.setSelectionRange(0, text.length);
        const succeeded = document.execCommand("copy");
        area.remove();
        return succeeded;
      } catch {
        return false;
      }
    }
  }

  // ------------------------------------------------------------------
  // duel links: hurl your records through a URL, absorb theirs
  // ------------------------------------------------------------------

  private handleDuelCopy = async (): Promise<void> => {
    if (this.destroyed) return;
    this.audio.unlock();
    try {
      const payload = { app: "chaos-button-duel", v: 1, records: this.records.exportPayload() };
      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) {
        bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      const encoded = btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const ok = await this.copyText(`${location.origin}${location.pathname}#duel=${encoded}`);
      if (!ok) throw new Error("clipboard sulked");
      this.records.stat("duels");
      const center = this.buttonCenter();
      this.confetti.burst(center.x, center.y, this.reduced ? 20 : 60);
      this.audio.pop();
      this.tempLabel("DUEL ME", 2200);
      this.setStatus("Duel link copied. Your records are now a hostage with excellent numbers");
      this.logEvent("Duel link copied. Records in transit, slightly offended", "duel");
    } catch {
      this.setStatus("The duel link disintegrated. The universe is protecting your stats");
    }
  };

  /** Decodes a #duel= hash back into a records payload. Null means not ours. */
  private decodeDuel(hash: string): unknown {
    const prefix = "#duel=";
    if (!hash || !hash.startsWith(prefix)) return null;
    try {
      let b64 = hash.slice(prefix.length).replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const data = JSON.parse(new TextDecoder().decode(bytes)) as {
        app?: string;
        records?: unknown;
      };
      return data.app === "chaos-button-duel" ? data.records : null;
    } catch {
      return null;
    }
  }

  /** Someone arrived carrying a rival timeline in the URL hash. */
  private checkDuelHash(): void {
    if (this.destroyed || this.locked) return;
    const records = this.decodeDuel(location.hash);
    if (!records) return;
    const d = records as {
      stats?: Record<string, number>;
      unlocked?: string[];
      counts?: Record<string, number>;
    };
    const summons = Number(d.stats?.summons ?? 0);
    const recordsUnlocked = Array.isArray(d.unlocked) ? d.unlocked.length : 0;
    const witnessed = d.counts ? Object.keys(d.counts).filter((k) => Number(d.counts?.[k]) > 0).length : 0;
    this.duelSummary.textContent =
      `It carries ${summons} lifetime summons, ${recordsUnlocked} unlocked records and ${witnessed} witnessed behaviors. The better numbers survive the merger. Always`;
    this.renderDuelLedger(d);
    this.pendingDuel = records;
    this.duelModal.classList.add("on");
    // focus once the backdrop's visibility transition has actually begun;
    // at progress zero it still computes hidden and swallows the focus call.
    // preventScroll: without it, focusing the tall ledger panel scrolls the
    // header and the RIVAL stamp out of view
    this.schedule(() => {
      (document.getElementById("duel-accept") as HTMLButtonElement | null)?.focus({ preventScroll: true });
    }, 80);
  }

  /**
   * The ledger preview: you versus the rival, five rows, delta pills.
   * Green means your timeline is ahead. The multiverse is not subtle.
   */
  private renderDuelLedger(rival: { stats?: Record<string, number>; unlocked?: string[]; counts?: Record<string, number> }): void {
    const ledger = document.getElementById("duel-ledger");
    if (!ledger) return;
    const mine = this.records.snapshot;
    const rStats = rival.stats ?? {};
    const witnessedMine = Object.keys(this.records.behaviorCounts).filter((k) => this.records.behaviorCounts[k] > 0).length;
    const witnessedRival = rival.counts ? Object.keys(rival.counts).filter((k) => Number(rival.counts?.[k]) > 0).length : 0;
    const rows: Array<{ label: string; mine: number; theirs: number }> = [
      { label: "Summons", mine: mine.summons, theirs: Number(rStats.summons ?? 0) },
      { label: "Records", mine: this.records.unlockedCount, theirs: Array.isArray(rival.unlocked) ? rival.unlocked.length : 0 },
      { label: "Behaviors seen", mine: witnessedMine, theirs: witnessedRival },
      { label: "Best combo", mine: mine.bestStreak, theirs: Number(rStats.bestStreak ?? 0) },
      { label: "Cycles", mine: mine.cycles, theirs: Number(rStats.cycles ?? 0) },
    ];
    const pill = (a: number, b: number) => {
      if (a > b) return '<span class="ledger-pill up">ahead</span>';
      if (a < b) return '<span class="ledger-pill down">behind</span>';
      return '<span class="ledger-pill tie">tie</span>';
    };
    ledger.innerHTML = `
      <div class="ledger-head" aria-hidden="true"><span></span><span>you</span><span>rival</span><span></span></div>
      ${rows
        .map(
          (r) =>
            `<div class="ledger-row"><span class="ledger-label">${r.label}</span><b class="ledger-num ${r.mine >= r.theirs ? "winning" : "losing"}">${r.mine}</b><b class="ledger-num ${r.theirs > r.mine ? "winning" : "losing"}">${r.theirs}</b>${pill(r.mine, r.theirs)}</div>`,
        )
        .join("")}`;
  }

  private absorbDuel = (): void => {
    if (!this.pendingDuel) return;
    const improved = this.records.importPayload(this.pendingDuel);
    this.closeDuel();
    if (improved < 0) {
      this.audio.deny();
      this.setStatus("The rival timeline was corrupted beyond recognition. It has been incinerated, politely");
      return;
    }
    this.records.stat("duelsAccepted");
    this.checkRank();
    this.audio.chime();
    this.records.customToast(
      "Multiverse merger",
      "Timeline absorbed",
      "Their numbers were better. Now they are yours. Legally distinct from theft",
    );
    this.logEvent(`Rival timeline absorbed: ${improved} record${improved === 1 ? "" : "s"} improved`, "duel");
    const center = this.buttonCenter();
    this.confetti.burst(center.x, center.y, this.reduced ? 30 : 90);
    this.setStatus(
      `Rival timeline absorbed. ${improved} record${improved === 1 ? "" : "s"} improved. The multiverse felt that`,
    );
  };

  private declineDuel = (): void => {
    const had = this.pendingDuel !== null;
    this.closeDuel();
    if (!had) return;
    this.audio.deny();
    this.setStatus("Duel declined. The rival timeline was returned to sender, unopened and slightly insulted");
    this.logEvent("Rival timeline declined. Returned to sender, postage due", "duel");
  };

  private closeDuel(): void {
    this.pendingDuel = null;
    this.duelModal.classList.remove("on");
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  }

  private handleDuelKey = (ev: KeyboardEvent): void => {
    if (!this.duelModal?.classList.contains("on")) return;
    if (ev.key === "Escape") {
      ev.preventDefault();
      // registered before the panic key handler, so this also stops the
      // boss screen from hijacking the same keystroke
      ev.stopImmediatePropagation();
      this.declineDuel();
    }
  };

  // ------------------------------------------------------------------
  // click streak combo
  // ------------------------------------------------------------------

  private updateStreak(): void {
    const s = this.streak;
    this.records.maxStat("bestStreak", s);
    window.clearTimeout(this.streakHideTimer);

    if (s < 3) {
      this.comboChip.classList.remove("on");
      return;
    }

    const tier = STREAK_TIERS.filter((t) => s >= t.at).pop() ?? STREAK_TIERS[0];
    this.comboChip.dataset.tier = tier.level;
    this.comboX.textContent = `x${s}`;
    this.comboTier.textContent = tier.label;
    // restart the pop animation on every increment
    this.comboChip.classList.remove("on");
    void this.comboChip.offsetWidth;
    this.comboChip.classList.add("on");

    const milestone = STREAK_STATUS[s];
    if (milestone) {
      const center = this.buttonCenter();
      this.confetti.burst(center.x, center.y, this.reduced ? 24 : 60);
      this.audio.pop();
      this.setStatus(milestone);
    }

    this.streakHideTimer = window.setTimeout(() => {
      this.comboChip.classList.remove("on");
      if (this.streak >= 3 && !this.locked) {
        this.setStatus("Combo lost. The moment has passed. It will not be back");
      }
      this.streak = 0;
    }, 1400);
  }

  // ------------------------------------------------------------------
  // tab title chaos + phase 4 sparkle cursor trail
  // ------------------------------------------------------------------

  private applyTitle(): void {
    if (this.titleLocked) return;
    // the Control Room can declare the tab title off-limits
    if (!this.settings.all.tabTitles) {
      document.title = this.originalTitle;
      return;
    }
    document.title = PHASE_TITLES[this.phase];
  }

  private attachSparkleTrail(): void {
    if (this.reduced || this.sparkleTrail) return;
    this.sparkleTrail = (ev: PointerEvent) => {
      if (this.destroyed) return;
      const now = performance.now();
      if (now - this.lastSparkleAt < 55) return;
      this.lastSparkleAt = now;
      this.confetti.sparkles(ev.clientX, ev.clientY, 2);
    };
    window.addEventListener("pointermove", this.sparkleTrail, { passive: true });
  }

  private detachSparkleTrail(): void {
    if (this.sparkleTrail) {
      window.removeEventListener("pointermove", this.sparkleTrail);
      this.sparkleTrail = null;
    }
  }

  private handleKonami = (ev: KeyboardEvent): void => {
    if (ev.repeat || this.destroyed) return;
    const key = ev.key.toLowerCase();
    if (key === KONAMI_SEQUENCE[this.konamiIndex]) {
      this.konamiIndex++;
      if (this.konamiIndex === KONAMI_SEQUENCE.length) {
        this.konamiIndex = 0;
        this.triggerKonami();
      }
    } else {
      this.konamiIndex = key === KONAMI_SEQUENCE[0] ? 1 : 0;
    }
  };

  private triggerKonami(): void {
    if (this.locked) return;
    this.audio.unlock();
    this.records.stat("konami");
    this.audio.chime();
    const w = window.innerWidth;
    const h = window.innerHeight;
    const rounds = this.reduced ? 2 : 5;
    for (let i = 0; i < rounds; i++) {
      this.schedule(() => {
        this.confetti.burst(w * (0.2 + Math.random() * 0.6), h * (0.25 + Math.random() * 0.4), 80);
        this.audio.pop();
      }, i * 220);
    }
    this.tempLabel("CHEAT ACCEPTED", 3000);
    this.startParty();
    this.setStatus("The ancient sequence. The button is now doing too much, on purpose");
  }

  // ------------------------------------------------------------------
  // party mode: the ancient code makes the button overachieve for 30s
  // ------------------------------------------------------------------

  private startParty(): void {
    this.records.stat("parties");
    const extend = Date.now() < this.partyUntil;
    this.partyUntil = Date.now() + PARTY_MS;
    this.root.classList.add("party-mode");
    this.partyChip.classList.add("on");
    window.clearInterval(this.partyTickTimer);
    this.paintParty();
    this.partyTickTimer = window.setInterval(() => {
      if (this.destroyed) return;
      if (Date.now() >= this.partyUntil) {
        this.endParty();
        return;
      }
      this.paintParty();
    }, 1000);
    this.schedule(() => this.endParty(), PARTY_MS + 50);
    if (!extend) {
      this.confetti.burst(window.innerWidth / 2, window.innerHeight * 0.3, 120);
      this.logEvent("Party Mode engaged. The ancient code demands celebration", "party");
    }
  }

  private endParty(): void {
    if (Date.now() < this.partyUntil) return;
    window.clearInterval(this.partyTickTimer);
    this.root.classList.remove("party-mode");
    this.partyChip.classList.remove("on");
  }

  private paintParty(): void {
    const secs = Math.max(0, Math.ceil((this.partyUntil - Date.now()) / 1000));
    this.partyTime.textContent = `${secs}s`;
  }

  /** Extra firepower while the party lasts. */
  private get partyActive(): boolean {
    return Date.now() < this.partyUntil;
  }

  // ------------------------------------------------------------------
  // overcharge: press and hold to charge, release to make a point
  // ------------------------------------------------------------------

  private initOvercharge(): void {
    const zone = document.getElementById("button-zone");
    if (!zone) return;

    // a previous engine instance (React StrictMode remounts) may have left
    // its charge chrome behind: claim the zone for this one
    zone.querySelectorAll(":scope > #charge-ring, :scope > #charge-chip").forEach((n) => n.remove());

    this.chargeRing = document.createElement("span");
    this.chargeRing.id = "charge-ring";
    this.chargeRing.setAttribute("aria-hidden", "true");
    zone.appendChild(this.chargeRing);

    this.chargeChip = document.createElement("span");
    this.chargeChip.id = "charge-chip";
    this.chargeChip.setAttribute("aria-hidden", "true");
    this.chargePct = document.createElement("b");
    this.chargePct.id = "charge-pct";
    this.chargePct.textContent = "0%";
    this.chargeChip.append("CHARGING ", this.chargePct);
    zone.appendChild(this.chargeChip);

    this.button.addEventListener("pointerdown", this.handleChargeDown);
    this.button.addEventListener("pointerup", this.handleChargeUp);
    this.button.addEventListener("pointercancel", this.handleChargeUp);
    this.button.addEventListener("pointerleave", this.handleChargeUp);
    this.button.addEventListener("keydown", this.handleChargeKeyDown);
    this.button.addEventListener("keyup", this.handleChargeKeyUp);
    // a long-press on touch must never summon the context menu mid-charge
    this.button.addEventListener("contextmenu", this.handleChargeContext);
  }

  private deinitOvercharge(): void {
    this.button?.removeEventListener("pointerdown", this.handleChargeDown);
    this.button?.removeEventListener("pointerup", this.handleChargeUp);
    this.button?.removeEventListener("pointercancel", this.handleChargeUp);
    this.button?.removeEventListener("pointerleave", this.handleChargeUp);
    this.button?.removeEventListener("keydown", this.handleChargeKeyDown);
    this.button?.removeEventListener("keyup", this.handleChargeKeyUp);
    this.button?.removeEventListener("contextmenu", this.handleChargeContext);
    window.clearTimeout(this.chargeGraceTimer);
    cancelAnimationFrame(this.chargeRaf);
    this.chargeRing?.remove();
    this.chargeChip?.remove();
    this.chargeRing = null;
    this.chargeChip = null;
    this.chargePct = null;
  }

  private handleChargeContext = (ev: Event): void => {
    ev.preventDefault();
  };

  private handleChargeDown = (ev: PointerEvent): void => {
    if (!ev.isPrimary || this.chargeHeld) return;
    this.chargeHeld = true;
    window.clearTimeout(this.chargeGraceTimer);
    this.chargeGraceTimer = window.setTimeout(this.beginCharge, CHARGE_GRACE_MS);
  };

  private handleChargeUp = (): void => {
    if (!this.chargeHeld && !this.chargeActive) return;
    this.chargeHeld = false;
    window.clearTimeout(this.chargeGraceTimer);
    this.endCharge();
  };

  private handleChargeKeyDown = (ev: KeyboardEvent): void => {
    if (ev.repeat || (ev.key !== " " && ev.key !== "Enter")) return;
    if (this.chargeHeld) return;
    this.chargeHeld = true;
    window.clearTimeout(this.chargeGraceTimer);
    this.chargeGraceTimer = window.setTimeout(this.beginCharge, CHARGE_GRACE_MS);
  };

  private handleChargeKeyUp = (ev: KeyboardEvent): void => {
    if (ev.key !== " " && ev.key !== "Enter") return;
    this.handleChargeUp();
  };

  private beginCharge = (): void => {
    if (!this.chargeHeld || this.locked || this.destroyed || this.chargeActive) return;
    this.chargeActive = true;
    this.chargeStartAt = performance.now();
    this.chargeStatusMilestone = -1;
    this.root.classList.add("is-charging");
    this.chargeLabelToken++;
    this.label.textContent = "CHARGING";
    this.audio.unlock();
    this.audio.chargeStart();
    this.setStatus(CHARGE_GRACE_LINES[Math.floor(Math.random() * CHARGE_GRACE_LINES.length)]);
    this.chargeChip?.classList.add("on");

    const step = () => {
      if (!this.chargeActive || this.destroyed) return;
      if (this.locked) {
        // a modal or celebration stole the stage mid-charge: bail out politely
        this.endCharge();
        return;
      }
      // performance.now(), not the rAF timestamp: frame timestamps can lag
      // real time on slow displays, which would under-read the charge
      const t = Math.min(1, Math.max(0, (performance.now() - this.chargeStartAt) / CHARGE_RAMP_MS));
      this.root.style.setProperty("--charge", t.toFixed(3));
      this.audio.chargeTick(t);
      if (this.chargePct) this.chargePct.textContent = `${Math.round(t * 100)}%`;
      const milestone = Math.floor(t * 4);
      if (milestone > this.chargeStatusMilestone) {
        this.chargeStatusMilestone = milestone;
        if (t >= 1) {
          this.setStatus(CHARGE_FULL_LINES[Math.floor(Math.random() * CHARGE_FULL_LINES.length)]);
        }
      }
      this.chargeRaf = requestAnimationFrame(step);
    };
    this.chargeRaf = requestAnimationFrame(step);
  };

  private endCharge(): void {
    if (!this.chargeActive) {
      // grace period tap: nothing to dismantle
      this.root.classList.remove("is-charging");
      this.root.style.removeProperty("--charge");
      this.chargeChip?.classList.remove("on");
      return;
    }
    const t = Math.min(1, (performance.now() - this.chargeStartAt) / CHARGE_RAMP_MS);
    this.chargeActive = false;
    cancelAnimationFrame(this.chargeRaf);
    this.root.classList.remove("is-charging");
    this.root.style.removeProperty("--charge");
    this.chargeChip?.classList.remove("on");
    this.audio.chargeStop();
    this.label.textContent = PHASE_LABELS[this.phase];
    if (this.destroyed) return;
    if (t >= CHARGE_RELEASE_MIN) {
      // land just after the click pipeline so the detonation reads as the finale
      this.schedule(() => this.releaseOvercharge(t), 40);
    } else {
      this.setStatus(CHARGE_CANCEL_LINE);
    }
  }

  private releaseOvercharge(t: number): void {
    if (this.destroyed) return;
    const center = this.buttonCenter();
    const zone = document.getElementById("button-zone");
    if (zone && !this.reduced) {
      for (let i = 0; i < 3; i++) {
        this.schedule(() => {
          const ring = document.createElement("span");
          ring.className = "shockwave";
          ring.style.animationDelay = `${i * 0.12}s`;
          zone.appendChild(ring);
          this.schedule(() => ring.remove(), 1100);
        }, i * 110);
      }
    }
    const vol = this.reduced ? 30 : Math.round(60 + t * 110);
    for (let i = 0; i < 3; i++) {
      this.schedule(() => {
        this.confetti.burst(
          center.x + (Math.random() - 0.5) * 130,
          center.y + (Math.random() - 0.5) * 110,
          vol,
        );
      }, i * 130);
    }
    this.fx.shake();
    this.audio.overcharge();
    this.records.stat("overcharges");
    this.tempLabel("OVERCHARGE", 1700);
    this.recordSample("overcharge", 1.5 + t * 1.5);
    this.logEvent(`Overcharge released at ${Math.round(t * 100)}%. The floor is confetti now`, "boom");
    this.setStatus(CHARGE_RELEASE_LINES[Math.floor(Math.random() * CHARGE_RELEASE_LINES.length)]);
  }

  /**
   * Ambient dressing: drifting dust motes plus the slow diagonal sheen
   * that polishes the button when it is feeling innocent.
   */
  private initAmbientDust(): void {
    if (!document.getElementById("dust")) {
      const dust = document.createElement("div");
      dust.id = "dust";
      dust.setAttribute("aria-hidden", "true");
      this.root.appendChild(dust);
    }
    if (!this.button.querySelector(":scope > .btn-sheen")) {
      const sheen = document.createElement("span");
      sheen.className = "btn-sheen";
      sheen.setAttribute("aria-hidden", "true");
      this.button.appendChild(sheen);
    }
  }

  private deinitAmbientDust(): void {
    document.getElementById("dust")?.remove();
    this.button?.querySelector(":scope > .btn-sheen")?.remove();
  }

  /** If the human wanders off, the button comments on the silence. */
  private armIdleNag(): void {
    window.clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => {
      if (this.destroyed || this.locked || this.totalClicks === 0) return;
      this.setStatus(IDLE_NAGS[Math.floor(Math.random() * IDLE_NAGS.length)]);
      this.audio.blip(this.phase);
      this.armIdleNag();
    }, 40000);
  }

  // ------------------------------------------------------------------
  // the boss screen: Escape summons instant, plausible productivity
  // ------------------------------------------------------------------

  private handlePanicKey = (ev: KeyboardEvent): void => {
    if (ev.repeat || this.destroyed || this.locked) return;
    if (ev.key === "Escape") {
      // the duel modal owns Escape while it is on stage
      if (this.duelModal?.classList.contains("on")) return;
      if (this.bossOpen) this.dismissBossScreen();
      else this.deployBossScreen();
      return;
    }
    // any other key also dismisses: muscle memory says "type my way out"
    if (this.bossOpen && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
      this.dismissBossScreen();
    }
  };

  private deployBossScreen(): void {
    if (this.bossOpen || this.destroyed) return;
    this.bossOpen = true;
    this.buildSheet();
    this.bossScreen.classList.add("on");
    this.bossScreen.setAttribute("aria-hidden", "false");
    this.bossScreen.focus();
    this.audio.pop();
    this.records.stat("bossEscapes");
    this.tempLabel("PRODUCTIVE", 2400);
    this.setStatus(BOSS_OPEN_LINES[Math.floor(Math.random() * BOSS_OPEN_LINES.length)]);
    this.logEvent("Boss screen deployed. Productivity: simulated to perfection", "system");
    window.clearTimeout(this.idleTimer);
    // the disguise must hold in the browser tab too, chaos settings or not
    this.titleLocked = true;
    document.title = this.bossTitle.textContent || "Budget.xlsx";
  }

  private dismissBossScreen(): void {
    if (!this.bossOpen) return;
    this.bossOpen = false;
    this.bossScreen.classList.remove("on");
    this.bossScreen.setAttribute("aria-hidden", "true");
    this.titleLocked = false;
    this.applyTitle();
    this.setStatus(BOSS_CLOSE_LINES[Math.floor(Math.random() * BOSS_CLOSE_LINES.length)]);
    this.armIdleNag();
    this.button.focus();
  }

  /** One fresh, deeply convincing grid of quarterly numbers per deployment. */
  private buildSheet(): void {
    const cols = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const depts = ["Revenue", "Ops", "Marketing", "Platform", "Legal", "Misc"];
    const quarter = Math.floor(Date.now() / 31557600000) % 4;
    const year = new Date().getFullYear();
    this.bossTitle.textContent = `Q${quarter + 1}_${year}_BUDGET_FINAL_v2(3).xlsx - Excel`;

    let rowsHtml = "";
    for (let r = 1; r <= 18; r++) {
      let cellsHtml = `<span class="bs-rownum">${r}</span>`;
      for (let c = 0; c < 8; c++) {
        const roll = Math.random();
        let content = "";
        if (c === 0 && r > 1 && r <= 7) content = depts[r - 2];
        else if (roll > 0.45) {
          const n = Math.floor(roll * 90000 + 1200);
          content = roll > 0.85 ? `${(n / 100).toFixed(2)}%` : `$${n.toLocaleString("en-US")}`;
        }
        const sel = r === 9 && c === 3 ? " bs-sel" : "";
        cellsHtml += `<span class="bs-cell${sel}">${content}</span>`;
      }
      rowsHtml += `<div class="bs-row">${cellsHtml}</div>`;
    }
    const header = `<div class="bs-row bs-headrow"><span class="bs-rownum">#</span>${cols
      .map((c) => `<span class="bs-cell">${c}</span>`)
      .join("")}</div>`;
    this.bossSheet.innerHTML = header + rowsHtml;
  }

  private updateCycleMeter(): void {
    if (!this.cycleMeterFill) return;
    const pct = Math.min(100, (this.cycleClicks / CYCLE_GOAL) * 100);
    this.cycleMeterFill.style.width = `${pct}%`;
  }

  /** Spawns the tactile ripple under the pointer inside the button. */
  private spawnRipple(ev?: MouseEvent): void {
    if (this.reduced || this.destroyed) return;
    const rect = this.button.getBoundingClientRect();
    const x = ev ? ev.clientX - rect.left : rect.width / 2;
    const y = ev ? ev.clientY - rect.top : rect.height / 2;
    const span = document.createElement("span");
    span.className = "click-ripple";
    span.style.left = `${x}px`;
    span.style.top = `${y}px`;
    this.button.appendChild(span);
    this.schedule(() => span.remove(), 750);
  }

  private rotateStatus(): void {
    const pool = STATUS_TEXTS[this.phase];
    let index = Math.floor(Math.random() * pool.length);
    if (pool.length > 1) {
      while (index === this.lastStatusIndex) index = Math.floor(Math.random() * pool.length);
    }
    this.lastStatusIndex = index;
    this.setStatus(pool[index]);

    const moods = MOODS[this.phase];
    this.moodText.textContent = moods[Math.floor(Math.random() * moods.length)];
  }

  setStatus(text: string): void {
    const token = ++this.statusToken;
    this.statusText.classList.add("swap");
    this.schedule(() => {
      if (this.destroyed || this.statusToken !== token) return;
      this.statusText.textContent = text;
      this.statusText.classList.remove("swap");
    }, 170);
  }

  /** Types a status out character by character, with tiny mechanical ticks. */
  typewriteStatus(text: string): void {
    const token = ++this.statusToken;
    this.statusText.classList.remove("swap");
    this.statusText.textContent = "";
    const type = (i: number) => {
      if (this.destroyed || this.statusToken !== token) return;
      this.statusText.textContent = text.slice(0, i);
      if (i % 3 === 0) this.audio.tick();
      if (i < text.length) this.schedule(() => type(i + 1), 26);
    };
    type(1);
  }

  private applyPhaseClass(): void {
    this.root.classList.remove("phase-1", "phase-2", "phase-3", "phase-4");
    this.root.classList.add(`phase-${this.phase}`);
    this.labelToken++;
    this.label.textContent = PHASE_LABELS[this.phase];
    this.applyTitle();
    this.spawnPhasePulse();
  }

  /** One expanding ring from the button, marking a phase transition. */
  private spawnPhasePulse(): void {
    if (this.reduced || this.destroyed) return;
    const zone = document.getElementById("button-zone");
    if (!zone) return;
    const ring = document.createElement("span");
    ring.className = "phase-pulse";
    zone.appendChild(ring);
    this.schedule(() => ring.remove(), 1000);
  }

  // ------------------------------------------------------------------
  // behavior selection
  // ------------------------------------------------------------------

  private pickAndRunBehaviors(forced?: number): void {
    const banned = new Set(this.records.suppressedIds);
    const commonFilters = (b: Behavior) =>
      b.minPhase <= this.phase &&
      b.id !== this.lastBehaviorId &&
      !(b.oncePerCycle && this.usedOncePerCycle.has(b.id));
    const allowed = BEHAVIOR_TABLE.filter((b) => commonFilters(b) && !banned.has(b.id));
    // if the visitor suppressed literally everything available, the button
    // improvises: the show must go on, legally distinct from the request
    const available = allowed.length > 0 ? allowed : BEHAVIOR_TABLE.filter(commonFilters);

    let count = forced ?? 1;
    if (forced === undefined) {
      // the Chaos Dial (50 to 200%) bends the odds, never the rules
      const chaos = this.settings.all.intensity / 100;
      if (this.phase === 1) count = Math.random() < Math.max(0, 0.3 * (chaos - 1)) ? 2 : 1;
      if (this.phase === 2) count = Math.random() < Math.min(0.9, 0.55 * chaos) ? 2 : 1;
      if (this.phase === 3) count = Math.random() < Math.min(0.95, 0.6 * chaos) ? 3 : 2;
      // party mode: the ancient code cranks the dial for a while
      if (this.partyActive) count += 2;
    } else if (this.partyActive) {
      count += 1; // even forked timelines respect party law
    }
    count = Math.min(count, available.length);

    const chosen: Behavior[] = [];
    const usedGroups = new Set<string>();
    const pool = [...available];

    while (chosen.length < count && pool.length > 0) {
      const index = Math.floor(Math.random() * pool.length);
      const behavior = pool[index];
      if (behavior.group && usedGroups.has(behavior.group)) {
        pool.splice(index, 1);
        continue;
      }
      if (behavior.group) usedGroups.add(behavior.group);
      chosen.push(behavior);
      pool.splice(index, 1);
    }

    this.lastBehaviorId = chosen[0]?.id ?? null;
    for (const behavior of chosen) {
      if (behavior.oncePerCycle) this.usedOncePerCycle.add(behavior.id);
    }
    for (const behavior of chosen) {
      try {
        this.records.bumpBehavior(behavior.id);
        // muted behaviors still perform, just with a silent soundtrack
        behavior.run(this.records.isMuted(behavior.id) ? this.quietEngineProxy() : this);
      } catch {
        /* a behavior failing is still content */
      }
    }
  }

  /** A lookalike engine whose audio property answers only silence. */
  private quietEngineProxy(): ChaosEngine {
    if (!this.quietSelf) {
      const silent = silentAudioProxy();
      this.quietSelf = new Proxy(this, {
        get(target, prop) {
          if (prop === "audio") return silent;
          const value = Reflect.get(target, prop) as unknown;
          return typeof value === "function"
            ? (value as (...args: unknown[]) => unknown).bind(target)
            : value;
        },
      }) as unknown as ChaosEngine;
    }
    return this.quietSelf;
  }

  // ------------------------------------------------------------------
  // state cleanup
  // ------------------------------------------------------------------

  /** Clears every persistent state before the next round of behaviors. */
  cleanupActives(): void {
    const fns = this.cleanups;
    this.cleanups = [];
    for (const fn of fns) {
      try {
        fn();
      } catch {
        /* cleanup failures must never ruin the chaos */
      }
    }
    this.restoreButton();
    this.fx?.mirror(false);
    this.quoteBox?.classList.remove("on");
    this.fakeLoading?.classList.remove("on");
    this.fortuneCard?.classList.remove("on");
    this.bureauBackdrop?.classList.remove("on");
    this.therapistBubble?.classList.remove("on");
    this.recChip?.classList.remove("on", "stopping");
    this.comboChip?.classList.remove("on");
    this.labelToken++;
    if (this.label) this.label.textContent = PHASE_LABELS[this.phase];
  }

  private restoreButton(): void {
    this.button.classList.remove(
      "runaway-live",
      "clingy-live",
      "is-possessed",
      "is-shy",
      "shifting",
      "is-polite-leaving",
      "is-polite-returning",
    );
    this.button.style.left = "";
    this.button.style.top = "";
    this.button.style.width = "";
    this.button.style.height = "";
    this.button.style.borderRadius = "";
    this.button.style.filter = "";
    this.button.style.background = "";
    this.button.style.transform = "";
  }

  // ------------------------------------------------------------------
  // shared helpers for behaviors
  // ------------------------------------------------------------------

  /** Temporarily replace the button label, then restore the phase label. */
  tempLabel(text: string, ms: number): void {
    const token = ++this.labelToken;
    this.label.textContent = text;
    this.schedule(() => {
      if (!this.destroyed && this.labelToken === token) {
        this.label.textContent = PHASE_LABELS[this.phase];
      }
    }, ms);
  }

  /** Cycles the label through a list, then restores the phase label. */
  cycleLabel(texts: string[], intervalMs: number): void {
    const token = ++this.labelToken;
    texts.forEach((text, i) => {
      this.schedule(() => {
        if (this.destroyed || this.labelToken !== token) return;
        this.label.textContent = text;
        if (i === texts.length - 1) {
          this.schedule(() => {
            if (this.labelToken === token) this.label.textContent = PHASE_LABELS[this.phase];
          }, intervalMs);
        }
      }, i * intervalMs);
    });
  }

  buttonCenter(): { x: number; y: number } {
    const rect = this.button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  // ------------------------------------------------------------------
  // phase 4 celebration + easter egg + reset
  // ------------------------------------------------------------------

  private celebrate(): void {
    this.locked = true;
    this.phase = 4;
    this.streak = 0;
    this.root.classList.remove("bg-shifted");
    this.applyPhaseClass();
    this.comboChip.classList.remove("on");
    this.moodText.textContent = MOODS[4][0];
    this.setStatus("You actually did it. 26 presses. The button has no choice but to respect that");

    this.audio.swell();
    const center = this.buttonCenter();
    this.confetti.burst(center.x, center.y, this.reduced ? 60 : 170);
    this.audio.pop();
    if (this.cycleMeterFill) this.cycleMeterFill.style.width = "100%";

    const runToken = ++this.sparkleRun;
    const sparkleStep = () => {
      // the chain only lives while THIS ceremony does. Round 14: used to
      // reschedule forever, stacking one perpetual gold-blizzard chain per
      // 26 clicks until long sessions drowned in ambient sparkles
      if (this.destroyed || this.sparkleRun !== runToken) return;
      this.confetti.sparkles(
        center.x + (Math.random() - 0.5) * 260,
        center.y + (Math.random() - 0.5) * 220,
        10,
      );
      this.schedule(sparkleStep, 260);
    };
    this.schedule(() => {
      this.confetti.cannons();
      sparkleStep();
      this.attachSparkleTrail(); // golden cursor trail for the enlightened era
    }, 400);

    const quote = this.quotes.transcendent();
    this.enlightenQuote.textContent = `"${quote.text}" : ${quote.author}`;
    this.enlightenCard.classList.add("on");
    this.logEvent("Enlightenment reached at 26 presses. The cycle is complete", "ceremony");

    this.schedule(() => {
      this.enlightenCard.classList.remove("on");
      this.resetCycle();
    }, 5200);
  }

  private triggerEasterEgg(): void {
    this.locked = true;
    this.easterEggFired = true;
    this.streak = 0;
    this.root.classList.remove("bg-shifted");
    this.comboChip.classList.remove("on");
    this.titleLocked = true;
    document.title = "42";
    this.audio.chime();
    this.fx.flash();
    this.easterEgg.classList.add("on");
    this.records.stat("answers");
    this.setStatus("The answer to the ultimate question of life, the universe, and everything");
    this.logEvent("42 delivered. Don't Panic. The whale and petunias did not make it", "ceremony");
    this.schedule(() => {
      this.easterEgg.classList.remove("on");
      this.resetCycle();
    }, 5200);
  }

  /** Smooth, clean reset back to phase 1. */
  private resetCycle(): void {
    this.stage.classList.add("is-fading");
    this.sparkleRun++; // any live ceremony sparkle chain ends with the cycle
    this.schedule(() => {
      this.cleanupActives();
      this.detachSparkleTrail();
      this.cycleClicks = 0;
      this.phase = 1;
      this.titleLocked = false;
      this.applyPhaseClass();
      this.lastBehaviorId = null;
      this.usedOncePerCycle.clear();
      this.moodText.textContent = MOODS[1][0];
      this.setStatus("And so it begins again. The button remembers nothing. Legally");
      this.audio.blip(1);
      this.stage.classList.remove("is-fading");
      this.locked = false;
      this.records.stat("cycles");
      this.updateCycleMeter();
      this.armIdleNag();
      this.logEvent("Reset complete. Phase I again. The button remembers nothing. Legally", "phase");
    }, 620);
  }

  // ==================================================================
  // THE 29 BEHAVIORS
  // ==================================================================

  confettiBurst(e: ChaosEngine): void {
    const center = e.buttonCenter();
    e.confetti.burst(center.x, center.y, (e.reduced ? 40 : 90) + e.phase * 30);
    e.audio.pop();
  }

  screenShake(e: ChaosEngine): void {
    e.fx.shake();
  }

  strobe(e: ChaosEngine): void {
    e.fx.strobe();
    e.audio.glitch();
  }

  screenRotation(e: ChaosEngine): void {
    e.fx.rotate();
  }

  zoomPulse(e: ChaosEngine): void {
    e.fx.zoom();
  }

  backgroundShift(e: ChaosEngine): void {
    e.fx.bgShift();
  }

  philosophicalQuote(e: ChaosEngine): void {
    const quote = e.quotes.random();
    // rotating department names, because the wisdom desk has a branding team
    const kickers = [
      "Unsolicited Wisdom",
      "The Button, Philosopher",
      "Deep Thoughts, Zero Value",
      "Free Advice, Worth It",
      "Press Notes",
    ];
    e.quoteKicker.textContent = kickers[Math.floor(Math.random() * kickers.length)];
    e.quoteText.textContent = `"${quote.text}"`;
    e.quoteAuthor.textContent = quote.author;
    e.quoteBox.classList.add("on");
    e.records.stat("quotes");
    // top banner no longer blocks the stage, so it lingers a touch longer
    e.schedule(() => e.quoteBox.classList.remove("on"), 5600);
  }

  runaway(e: ChaosEngine): void {
    const btn = e.button;
    const rect = btn.getBoundingClientRect();
    btn.classList.add("runaway-live", "is-possessed");
    btn.style.left = `${rect.left}px`;
    btn.style.top = `${rect.top}px`;
    btn.style.width = `${rect.width}px`;
    btn.style.height = `${rect.height}px`;

    let dodges = 0;
    let done = false;

    const finish = (caught: boolean) => {
      if (done) return;
      done = true;
      document.removeEventListener("pointermove", onMove);
      btn.removeEventListener("pointerdown", onDown);
      if (btn.classList.contains("runaway-live")) {
        btn.classList.remove("runaway-live", "is-possessed");
        btn.style.left = "";
        btn.style.top = "";
        btn.style.width = "";
        btn.style.height = "";
      }
      if (caught) {
        e.records.stat("catches");
        e.setStatus("Fine. Catch. I never wanted to escape anyway");
      }
    };

    const dodge = () => {
      if (done || e.destroyed) return;
      const w = parseFloat(btn.style.width) || rect.width;
      const h = parseFloat(btn.style.height) || rect.height;
      const pad = 16;
      const maxX = window.innerWidth - w - pad;
      const maxY = window.innerHeight - h - pad - 60;
      btn.style.left = `${pad + Math.random() * Math.max(1, maxX - pad)}px`;
      btn.style.top = `${pad + Math.random() * Math.max(1, maxY - pad)}px`;
      dodges++;
      e.audio.boing();
      e.setStatus(
        dodges === 1
          ? "The button now has trust issues"
          : dodges >= 6
            ? "One more catch and it gives up, probably"
            : ["Missed", "Too slow", "It is getting faster", "Not even close", "Embarrassing"][dodges % 5],
      );
      if (dodges >= 7) finish(true);
    };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerType !== "mouse" || done) return;
      const left = parseFloat(btn.style.left) || 0;
      const top = parseFloat(btn.style.top) || 0;
      const cx = left + rect.width / 2;
      const cy = top + rect.height / 2;
      if (Math.hypot(ev.clientX - cx, ev.clientY - cy) < 120) dodge();
    };

    const onDown = (ev: PointerEvent) => {
      if (done) return;
      if (dodges >= 6) {
        finish(true); // mercy: let the next tap land
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      dodge();
    };

    document.addEventListener("pointermove", onMove);
    btn.addEventListener("pointerdown", onDown);
    e.addCleanup(() => finish(false));
    e.schedule(() => finish(false), 9000);
    e.setStatus("Catch it if you can");
  }

  gaslight(e: ChaosEngine): void {
    const line = GASLIGHT_LINES[Math.floor(Math.random() * GASLIGHT_LINES.length)];
    e.tempLabel(line, 2600);
    e.setStatus("That did not happen");
  }

  fakeLoad(e: ChaosEngine): void {
    e.fakeLoading.classList.add("on");
    e.fakeNote.textContent = "Loading...";
    let pct = 0;
    let stalled = false;

    const notes = ["Still loading...", "Definitely loading...", "Loading harder..."];
    let noteIndex = 0;
    const noteTimer = window.setInterval(() => {
      noteIndex = (noteIndex + 1) % notes.length;
      e.fakeNote.textContent = notes[noteIndex];
    }, 700);

    const iv = window.setInterval(() => {
      if (e.destroyed) {
        window.clearInterval(iv);
        window.clearInterval(noteTimer);
        return;
      }
      if (!stalled) {
        pct += 4 + Math.random() * 6;
        if (pct >= 99) {
          pct = 99;
          stalled = true;
          e.fakeNote.textContent = "99%. Almost there. Trust me";
        }
      } else {
        pct = 98 + Math.random() * 1.4; // nervous jitter at 99
      }
      e.fakeBarFill.style.width = `${Math.min(99, pct)}%`;
      e.fakePct.textContent = `${Math.floor(Math.min(99, pct))}%`;
    }, 90);

    const stop = () => {
      window.clearInterval(iv);
      window.clearInterval(noteTimer);
      e.fakeLoading.classList.remove("on");
      e.fakeBarFill.style.width = "0%";
    };

    e.schedule(() => {
      window.clearInterval(iv);
      window.clearInterval(noteTimer);
      e.fakeBarFill.style.width = "100%";
      e.fakePct.textContent = "100%";
      e.fakeNote.textContent = "Done. Nothing was loaded";
      e.schedule(stop, 900);
    }, 3400);

    e.addCleanup(stop);
    e.setStatus("Operation failed successfully");
  }

  shapeShift(e: ChaosEngine): void {
    const btn = e.button;
    btn.classList.add("shifting");
    const rect = btn.getBoundingClientRect();
    const scale = 0.72 + Math.random() * 0.55;
    btn.style.width = `${rect.width * scale}px`;
    btn.style.height = `${rect.height * scale}px`;
    const r = () => 20 + Math.floor(Math.random() * 80);
    btn.style.borderRadius = `${r()}% ${r()}% ${r()}% ${r()}% / ${r()}% ${r()}% ${r()}% ${r()}%`;
    btn.style.filter = `hue-rotate(${Math.floor(Math.random() * 360)}deg) saturate(1.3)`;
    const revert = () => {
      btn.classList.remove("shifting");
    };
    e.addCleanup(revert);
    e.schedule(revert, 3200);
    e.setStatus("The button is exploring its identity");
  }

  passiveAggressive(e: ChaosEngine): void {
    const pool = PASSIVE_LINES[e.phase];
    const stack = document.getElementById("pa-stack");
    const lines = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < lines; i++) {
      e.schedule(() => {
        const line = pool[Math.floor(Math.random() * pool.length)];
        const node = document.createElement("div");
        node.className = "pa-line";
        node.textContent = line;
        stack?.appendChild(node);
        e.schedule(() => node.remove(), 4000);
      }, i * 600);
    }
  }

  echo(e: ChaosEngine): void {
    const layer = document.getElementById("echo-layer");
    if (!layer) return;
    const text = e.label.textContent || "The Button";
    const ghosts = e.reduced ? 5 : 9 + Math.floor(Math.random() * 5);
    for (let i = 0; i < ghosts; i++) {
      const ghost = document.createElement("span");
      ghost.className = "echo-ghost";
      ghost.textContent = text;
      ghost.style.left = `${5 + Math.random() * 80}vw`;
      ghost.style.top = `${8 + Math.random() * 74}vh`;
      ghost.style.fontSize = `${0.8 + Math.random() * 2.4}rem`;
      ghost.style.setProperty("--echo-rot", `${(Math.random() - 0.5) * 24}deg`);
      layer.appendChild(ghost);
      e.schedule(() => ghost.remove(), 1700);
    }
    if (e.phase >= 2) e.audio.glitch();
    e.setStatus("The label is multiplying. This is normal. It is not");
  }

  shy(e: ChaosEngine): void {
    const btn = e.button;
    let peekTimer = 0;
    let counted = false;
    const onEnter = () => {
      btn.classList.add("is-shy");
      if (!counted) {
        counted = true;
        e.records.stat("shys");
      }
      window.clearTimeout(peekTimer);
      peekTimer = window.setTimeout(() => btn.classList.remove("is-shy"), 1400);
    };
    btn.addEventListener("pointerenter", onEnter);
    const stop = () => {
      btn.removeEventListener("pointerenter", onEnter);
      window.clearTimeout(peekTimer);
      btn.classList.remove("is-shy");
    };
    e.addCleanup(stop);
    e.schedule(stop, 7000);
    e.setStatus("Do not stare. It gets nervous");
  }

  gravity(e: ChaosEngine): void {
    const targets = [
      document.getElementById("masthead"),
      document.getElementById("status"),
      document.getElementById("button-zone"),
      document.getElementById("chaos-footer"),
    ].filter((n): n is HTMLElement => Boolean(n));
    const restore = e.fx.gravity(targets);
    e.audio.glitch();
    e.addCleanup(restore);
    e.schedule(restore, 4800);
    e.setStatus("Gravity: enabled. Furniture: not secured");
  }

  mirror(e: ChaosEngine): void {
    e.fx.mirror(true);
    e.schedule(() => e.fx.mirror(false), 3000);
    e.setStatus("Mirror mode engaged. Everything is fine (in reverse)");
  }

  schrodinger(e: ChaosEngine): void {
    if (Math.random() < 0.5) {
      const center = e.buttonCenter();
      e.confetti.burst(center.x, center.y, e.reduced ? 24 : 70);
      e.audio.pop();
      e.records.stat("observations");
      e.setStatus("The cat was observed: alive. Also, confetti");
    } else {
      e.setStatus("Nothing happened. Or did it? (It did not)");
    }
  }

  heavy(e: ChaosEngine): void {
    e.root.classList.add("is-heavy");
    e.locked = true;
    e.setStatus("The button has accepted its fate. It is very heavy now. Refresh if you want, it will not help");
    e.schedule(() => {
      e.root.classList.remove("is-heavy");
      e.locked = false;
      e.setStatus("It lives again. Refreshing would have ruined a perfectly good tragedy");
    }, 3600);
    e.addCleanup(() => {
      e.root.classList.remove("is-heavy");
      e.locked = false;
    });
  }

  translate(e: ChaosEngine): void {
    const steps = TRANSLATIONS.slice(0, 5 + Math.floor(Math.random() * 4));
    e.cycleLabel(steps, 620);
    e.setStatus("Localization in progress. Please hold");
  }

  fortuneCookie(e: ChaosEngine): void {
    const kicker = document.getElementById("fortune-kicker");
    if (kicker) kicker.textContent = "Fortune Cookie"; // the daily fortune may have borrowed it
    e.fortuneText.textContent = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
    const nums = new Set<number>();
    while (nums.size < 4) nums.add(1 + Math.floor(Math.random() * 99));
    e.fortuneNumbers.textContent = [...nums].join(" , ");
    e.fortuneCard.classList.remove("on");
    void e.fortuneCard.offsetWidth; // restart the crack animation
    e.fortuneCard.classList.add("on");
    e.records.stat("cookies");
    e.audio.pop();
    e.setStatus("Fortune cracked. The cookie was all surface, no crust");
    e.schedule(() => e.fortuneCard.classList.remove("on"), 4600);
  }

  therapist(e: ChaosEngine): void {
    e.therapistText.textContent =
      THERAPY_LINES[Math.floor(Math.random() * THERAPY_LINES.length)];
    e.therapistBubble.classList.remove("on");
    void e.therapistBubble.offsetWidth; // restart the entrance animation
    e.therapistBubble.classList.add("on");
    e.records.stat("therapy");
    e.audio.blip(1);
    e.setStatus("Unlicensed therapy in progress. Please lie down, or do not");
    e.schedule(() => e.therapistBubble.classList.remove("on"), THERAPY_HOLD_MS);
  }

  hypnotize(e: ChaosEngine): void {
    const zone = document.getElementById("button-zone");
    if (!zone) return;
    e.root.classList.add("is-hypnotic");
    const rings: HTMLSpanElement[] = [];
    for (let i = 0; i < 3; i++) {
      const ring = document.createElement("span");
      ring.className = "hypno-ring";
      ring.style.animationDelay = `${i * 0.45}s`;
      zone.appendChild(ring);
      rings.push(ring);
    }
    e.audio.hypno();
    const stop = () => {
      e.root.classList.remove("is-hypnotic");
      rings.forEach((ring) => ring.remove());
    };
    e.addCleanup(stop);
    e.schedule(stop, HYPNO_HOLD_MS);
    e.setStatus("You are getting very sleepy. The button remains entirely useless");
  }

  onomatopoeia(e: ChaosEngine): void {
    const words = ["POW!", "BAM!", "WHAM!", "ZAP!", "KRAK!", "BOING!", "THWIP!", "KAPOW!"];
    const rect = e.button.getBoundingClientRect();
    const count = 3 + Math.floor(Math.random() * 3);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (let i = 0; i < count; i++) {
      e.schedule(() => {
        const span = document.createElement("span");
        span.className = "pow-word";
        span.textContent = words[Math.floor(Math.random() * words.length)];
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.9;
        const radius = 120 + Math.random() * 95;
        const x = rect.left + rect.width / 2 + Math.cos(angle) * radius;
        const y = rect.top + rect.height / 2 + Math.sin(angle) * radius * 0.7;
        span.style.left = `${Math.min(vw - 120, Math.max(8, x))}px`;
        span.style.top = `${Math.min(vh - 90, Math.max(8, y))}px`;
        span.style.setProperty("--pow-rot", `${(Math.random() - 0.5) * 36}deg`);
        span.style.setProperty("--pow-hue", `${Math.floor(Math.random() * 360)}deg`);
        document.getElementById("chaos-root")?.appendChild(span);
        e.audio.pop();
        e.schedule(() => span.remove(), 1500);
      }, i * 140);
    }
    e.setStatus("KAPOW. The sound effects are doing the heavy lifting today");
  }

  abduction(e: ChaosEngine): void {
    const btn = e.button;
    const rect = btn.getBoundingClientRect();
    const beam = document.createElement("span");
    beam.className = "abduct-beam";
    beam.style.left = `${rect.left + rect.width / 2}px`;
    beam.style.height = `${rect.top + rect.height / 2 + 24}px`;
    const saucer = document.createElement("span");
    saucer.className = "abduct-saucer";
    saucer.style.left = `${rect.left + rect.width / 2}px`;
    document.getElementById("chaos-root")?.append(beam, saucer);

    // saucer descends from above and parks itself over the button
    e.schedule(() => {
      saucer.style.transform = `translate(-50%, ${rect.top - 42}px)`;
    }, 30);
    e.audio.beam();

    // the button is recalled for a mandatory performance review
    e.schedule(() => {
      btn.style.transition = "transform 1.5s cubic-bezier(.35,.75,.35,1), filter 1.1s ease";
      btn.style.transform = "translateY(-44vh) rotate(7deg) scale(0.88)";
      btn.style.filter = "brightness(1.6) saturate(1.5) drop-shadow(0 0 34px var(--c-accent-glow))";
      e.setStatus("The button is being recalled for a mandatory performance review");
    }, 950);

    // reviewed. found useless. returned to the field, with prejudice
    e.schedule(() => {
      beam.classList.add("fade");
      saucer.style.transition = "transform 0.7s cubic-bezier(.5,0,.8,.4), opacity 0.7s ease";
      saucer.style.transform = "translate(-50%, -60vh)";
      saucer.style.opacity = "0";
      btn.style.transition = "transform 0.55s cubic-bezier(.34,1.56,.5,1), filter 0.5s ease";
      btn.style.transform = "translateY(0) scale(1.05)";
      btn.style.filter = "";
      e.audio.saucerDrop();
      e.fx.shake();
      e.setStatus("The button was returned. It remembers nothing and will confirm nothing");
    }, 3300);

    const stop = () => {
      beam.remove();
      saucer.remove();
      btn.style.transition = "";
      btn.style.transform = "";
      btn.style.filter = "";
    };
    e.addCleanup(stop);
    e.schedule(stop, 4300);
  }

  securityCam(e: ChaosEngine): void {
    const chip = e.recChip;
    chip.classList.remove("stopping");
    chip.classList.add("on");
    e.recTime.textContent = "REC 00:00";
    e.records.stat("incidents");
    e.audio.glitch();

    let secs = 0;
    const ticker = window.setInterval(() => {
      if (e.destroyed) {
        window.clearInterval(ticker);
        return;
      }
      secs++;
      e.recTime.textContent = `REC 00:${String(secs).padStart(2, "0")}`;
    }, 1000);

    const stop = () => {
      window.clearInterval(ticker);
      chip.classList.add("stopping");
      e.recTime.textContent = `SAVED 00:${String(secs).padStart(2, "0")}`;
      e.schedule(() => chip.classList.remove("on", "stopping"), 1200);
    };

    e.schedule(stop, CAM_RECORD_MS);
    e.addCleanup(() => {
      window.clearInterval(ticker);
      chip.classList.remove("on", "stopping");
    });
    e.setStatus(
      "This incident is being recorded for quality assurance and light blackmail",
    );
  }

  doNotPress(e: ChaosEngine): void {
    e.fx.alarm();
    e.audio.alarm();
    e.tempLabel("I SAID NO", 2400);
    e.records.stat("panics");
    e.setStatus("You had one job. The layout is unchanged. The dignity is not");
  }

  bureaucrat(e: ChaosEngine): void {
    const backdrop = e.bureauBackdrop;
    const form = e.bureauForm;
    const result = e.bureauResult;
    const submitBtn = e.bureauSubmit;
    result.textContent = "";
    result.className = "";
    submitBtn.textContent = "Submit for Review";
    submitBtn.dataset.mode = "submit";
    backdrop.classList.add("on");
    e.locked = true;

    const firstInput = form.querySelector<HTMLInputElement>("#bureau-name");
    e.schedule(() => firstInput?.focus(), 90);

    const onSubmit = (ev: Event) => {
      ev.preventDefault();
      if (submitBtn.dataset.mode === "ack") {
        close("Nothing happened. You are free to go");
        return;
      }
      const name = (form.querySelector<HTMLInputElement>("#bureau-name")?.value ?? "").trim();
      const ack = form.querySelector<HTMLInputElement>("#bureau-ack")?.checked ?? false;
      if (!name || !ack) {
        e.audio.deny();
        result.className = "denied";
        result.innerHTML =
          '<span class="stamp">Rejected</span>Incomplete paperwork. The ministry cannot legally accomplish nothing for you until every box is ticked';
        return;
      }
      e.audio.stamp();
      if (Math.random() < 0.5) {
        e.records.stat("forms");
        result.className = "approved";
        result.innerHTML = `<span class="stamp">Approved</span>Thank you, ${escapeHtml(name)}. Your application to do nothing has been processed. Nothing will now happen, formally, in triplicate`;
      } else {
        e.audio.deny();
        result.className = "denied";
        result.innerHTML =
          '<span class="stamp">Denied</span>The form was filled in correctly, which is deeply suspicious. Request to do nothing: denied';
      }
      submitBtn.textContent = "Acknowledge";
      submitBtn.dataset.mode = "ack";
    };

    const onCancel = () => {
      e.records.stat("abandons");
      close("Form abandoned. The bureaucracy understands, it just never forgets");
    };

    const onCancelClick = (ev: Event) => {
      ev.preventDefault();
      onCancel();
    };
    const onBackdropClick = (ev: Event) => {
      if (ev.target === backdrop) onCancel();
    };

    // closing always detaches: a stale listener must never act on a dead modal
    const detach = () => {
      form.removeEventListener("submit", onSubmit);
      form.querySelector("#bureau-cancel")?.removeEventListener("click", onCancelClick);
      backdrop.removeEventListener("click", onBackdropClick);
    };

    const close = (statusLine: string) => {
      detach();
      backdrop.classList.remove("on");
      e.locked = false;
      form.reset();
      result.textContent = "";
      result.className = "";
      e.setStatus(statusLine);
    };

    form.addEventListener("submit", onSubmit);
    form.querySelector("#bureau-cancel")?.addEventListener("click", onCancelClick);
    backdrop.addEventListener("click", onBackdropClick);

    e.addCleanup(() => {
      detach();
      backdrop.classList.remove("on");
      e.locked = false;
    });
  }

  polite(e: ChaosEngine): void {
    const btn = e.button;
    btn.classList.add("is-polite-leaving");
    e.setStatus("Oh. Sorry. Excuse me. So sorry. This is embarrassing");
    e.schedule(() => {
      btn.classList.remove("is-polite-leaving");
      btn.classList.add("is-polite-returning");
      e.setStatus("I am back. Again, terribly sorry about earlier");
      e.schedule(() => btn.classList.remove("is-polite-returning"), 900);
    }, 2100);
    e.addCleanup(() => {
      btn.classList.remove("is-polite-leaving", "is-polite-returning");
    });
  }

  clingy(e: ChaosEngine): void {
    const btn = e.button;
    const rect = btn.getBoundingClientRect();
    btn.classList.add("clingy-live", "is-possessed");
    btn.style.left = `${rect.left}px`;
    btn.style.top = `${rect.top}px`;
    btn.style.width = `${rect.width}px`;
    btn.style.height = `${rect.height}px`;

    e.clingyTarget = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    e.clingyCurrent = { ...e.clingyTarget };

    const onPointer = (ev: PointerEvent) => {
      e.clingyTarget = { x: ev.clientX, y: ev.clientY };
    };
    document.addEventListener("pointermove", onPointer, { passive: true });

    let attached = true;
    const loop = () => {
      if (!attached || e.destroyed) return;
      e.clingyCurrent.x += (e.clingyTarget.x - e.clingyCurrent.x) * 0.12;
      e.clingyCurrent.y += (e.clingyTarget.y - e.clingyCurrent.y) * 0.12;
      btn.style.left = `${e.clingyCurrent.x - rect.width / 2}px`;
      btn.style.top = `${e.clingyCurrent.y - rect.height / 2}px`;
      e.clingyRaf = requestAnimationFrame(loop);
    };
    e.clingyRaf = requestAnimationFrame(loop);

    const stop = (petted: boolean) => {
      if (!attached) return;
      attached = false;
      cancelAnimationFrame(e.clingyRaf);
      document.removeEventListener("pointermove", onPointer);
      btn.removeEventListener("pointerdown", onBtnDown);
      btn.classList.remove("clingy-live", "is-possessed");
      btn.style.left = "";
      btn.style.top = "";
      btn.style.width = "";
      btn.style.height = "";
      if (petted) {
        e.records.stat("pets");
        e.setStatus("You petted it. It will remember this forever");
      }
    };

    const onBtnDown = () => stop(true);
    btn.addEventListener("pointerdown", onBtnDown);

    e.addCleanup(() => stop(false));
    e.schedule(() => stop(false), 12000);
    e.setStatus("The button has developed attachment issues. This is fine");
  }
}

/**
 * The full behavior pool. minPhase gates intensity:
 * phase 1 is mild, phase 2 adds resistance, phase 3 unlocks mayhem.
 */
const BEHAVIOR_TABLE: Behavior[] = [
  { id: "confetti", minPhase: 1, run: (e) => e["confettiBurst"](e) },
  { id: "quote", minPhase: 1, run: (e) => e["philosophicalQuote"](e) },
  { id: "bg-shift", minPhase: 1, run: (e) => e["backgroundShift"](e) },
  { id: "zoom", minPhase: 1, run: (e) => e["zoomPulse"](e) },
  { id: "translate", minPhase: 1, run: (e) => e["translate"](e) },
  { id: "passive", minPhase: 1, run: (e) => e["passiveAggressive"](e) },
  { id: "schrodinger", minPhase: 1, run: (e) => e["schrodinger"](e) },
  { id: "shy", minPhase: 1, group: "move", run: (e) => e["shy"](e) },
  { id: "polite", minPhase: 1, run: (e) => e["polite"](e) },
  { id: "fortune", minPhase: 1, run: (e) => e["fortuneCookie"](e) },
  { id: "therapist", minPhase: 1, run: (e) => e["therapist"](e) },
  { id: "hypnotize", minPhase: 1, run: (e) => e["hypnotize"](e) },
  { id: "shake", minPhase: 2, run: (e) => e["screenShake"](e) },
  { id: "gaslight", minPhase: 2, run: (e) => e["gaslight"](e) },
  { id: "fake-load", minPhase: 2, group: "modal", run: (e) => e["fakeLoad"](e) },
  { id: "shape-shift", minPhase: 2, run: (e) => e["shapeShift"](e) },
  { id: "echo", minPhase: 2, run: (e) => e["echo"](e) },
  { id: "mirror", minPhase: 2, run: (e) => e["mirror"](e) },
  { id: "do-not-press", minPhase: 2, run: (e) => e["doNotPress"](e) },
  { id: "bureaucrat", minPhase: 2, group: "modal", oncePerCycle: true, run: (e) => e["bureaucrat"](e) },
  { id: "runaway", minPhase: 2, group: "move", run: (e) => e["runaway"](e) },
  { id: "security-cam", minPhase: 2, run: (e) => e["securityCam"](e) },
  { id: "gravity", minPhase: 3, run: (e) => e["gravity"](e) },
  { id: "heavy", minPhase: 3, oncePerCycle: true, run: (e) => e["heavy"](e) },
  { id: "clingy", minPhase: 3, group: "move", oncePerCycle: true, run: (e) => e["clingy"](e) },
  { id: "strobe", minPhase: 3, run: (e) => e["strobe"](e) },
  { id: "rotation", minPhase: 3, run: (e) => e["screenRotation"](e) },
  { id: "abduction", minPhase: 3, group: "move", oncePerCycle: true, run: (e) => e["abduction"](e) },
  { id: "onomatopoeia", minPhase: 2, run: (e) => e["onomatopoeia"](e) },
];

export function createChaosEngine(): { init: () => void; destroy: () => void } {
  const engine = new ChaosEngine();
  return {
    init: () => {
      engine.init();
      // dev-only handle so QA tooling can summon individual behaviors
      if (process.env.NODE_ENV !== "production") {
        (window as unknown as { __chaosEngine?: ChaosEngine }).__chaosEngine = engine;
      }
    },
    destroy: () => engine.destroy(),
  };
}
