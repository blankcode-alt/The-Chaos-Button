/**
 * AchievementSystem: the Hall of Records.
 * Tracks lifetime stats, achievements and the per-behavior census
 * in localStorage, renders unlock toasts and the records panel.
 * All data stays on the device. There is no cloud. There was never a cloud.
 */

export interface ChaosStats {
  summons: number;
  cycles: number;
  quotes: number;
  cookies: number;
  catches: number;
  forms: number;
  abandons: number;
  pets: number;
  answers: number;
  panics: number;
  mutes: number;
  observations: number;
  shys: number;
  konami: number;
  bestStreak: number;
  therapy: number;
  incidents: number;
  shares: number;
  tinkers: number;
  bossEscapes: number;
  parties: number;
  visits: number;
  overcharges: number;
  censors: number;
  pardons: number;
  exports: number;
  imports: number;
  silences: number;
  doubleTaps: number;
  duels: number;
  duelsAccepted: number;
  dialTurns: number;
  replays: number;
}

export type StatKey = keyof ChaosStats;

interface Achievement {
  id: string;
  name: string;
  desc: string;
  test: (s: ChaosStats, seen: Record<string, number>) => boolean;
}

const STORAGE_KEY = "chaos-button-records-v1";

const EMPTY_STATS: ChaosStats = {
  summons: 0,
  cycles: 0,
  quotes: 0,
  cookies: 0,
  catches: 0,
  forms: 0,
  abandons: 0,
  pets: 0,
  answers: 0,
  panics: 0,
  mutes: 0,
  observations: 0,
  shys: 0,
  konami: 0,
  bestStreak: 0,
  therapy: 0,
  incidents: 0,
  shares: 0,
  tinkers: 0,
  bossEscapes: 0,
  parties: 0,
  visits: 0,
  overcharges: 0,
  censors: 0,
  pardons: 0,
  exports: 0,
  imports: 0,
  silences: 0,
  doubleTaps: 0,
  duels: 0,
  duelsAccepted: 0,
  dialTurns: 0,
  replays: 0,
};

/** Display names for every behavior id, powering the Behavior Census. */
export const BEHAVIOR_NAMES: Record<string, string> = {
  confetti: "Confetti burst",
  quote: "Philosophy hour",
  "bg-shift": "Background shift",
  zoom: "Zoom pulse",
  translate: "Translation",
  passive: "Passive aggression",
  schrodinger: "Schrödinger's cat",
  shy: "Shy button",
  polite: "Polite exit",
  fortune: "Fortune cookie",
  therapist: "Therapy session",
  hypnotize: "Hypnosis spiral",
  shake: "Screen shake",
  gaslight: "Gaslighting",
  "fake-load": "Fake loading",
  "shape-shift": "Shape-shifting",
  echo: "Echo chamber",
  mirror: "Mirror mode",
  "do-not-press": "Do Not Press",
  bureaucrat: "Form 27B/6",
  runaway: "Runaway button",
  "security-cam": "Security camera",
  gravity: "Gravity event",
  heavy: "Heavy button",
  clingy: "Clingy button",
  strobe: "Strobe burst",
  rotation: "Screen rotation",
  onomatopoeia: "Comic outburst",
  abduction: "Alien abduction",
};

/** Field notes for the census dossier: one per behavior, plus a threat rating. */
export const BEHAVIOR_DOSSIER: Record<string, { note: string; threat: string }> = {
  confetti: { note: "Releases a burst of celebratory paper. Accomplishes nothing, festively", threat: "BENIGN" },
  quote: { note: "Subjects the witness to unsolicited philosophy. No refunds", threat: "BENIGN" },
  "bg-shift": { note: "Recolors the room without asking. Interior designers hate this", threat: "BENIGN" },
  zoom: { note: "The button lunges toward your face, then plays it off", threat: "BENIGN" },
  translate: { note: "Renames itself in several languages and one dead script", threat: "BENIGN" },
  passive: { note: "Leaks passive-aggression into the ambient air. Ventilation recommended", threat: "LOW" },
  schrodinger: { note: "Opens a box. The contents refuse to be measured. Confetti may occur", threat: "BENIGN" },
  shy: { note: "The button hides from eye contact. Prolonged staring makes it worse", threat: "BENIGN" },
  polite: { note: "Excuses itself from the viewport, then returns. Sorry about earlier", threat: "BENIGN" },
  fortune: { note: "Cracks a cookie for a vague prophecy and four completely unverifiable numbers", threat: "BENIGN" },
  therapist: { note: "Offers unlicensed therapy with a straight face. Notes are kept. Mentally", threat: "LOW" },
  hypnotize: { note: "Projects spirals and drowsy tones. You are getting very interested in nothing", threat: "LOW" },
  shake: { note: "Shakes the entire laboratory like a snow globe. Contents unsettled", threat: "ELEVATED" },
  gaslight: { note: "Denies events that literally just occurred. Trust at an all-time low", threat: "ELEVATED" },
  "fake-load": { note: "Fakes a progress bar, then stalls at 99% on purpose. Trust exercises included", threat: "ELEVATED" },
  "shape-shift": { note: "Mutates size, shape and color mid-conversation. Identity under review", threat: "ELEVATED" },
  echo: { note: "The label multiplies without authorization. containment: none", threat: "ELEVATED" },
  mirror: { note: "Flips the entire laboratory horizontally. Everything is fine, in reverse", threat: "ELEVATED" },
  "do-not-press": { note: "Sets off full alarms over a press it itself invited. Entrapment, arguably", threat: "HIGH" },
  bureaucrat: { note: "Halts all pressing until Form 27B/6 is filed. Triplicate not required, but respected", threat: "HIGH" },
  runaway: { note: "Physically evades capture. Catchable with sufficient spite and one mercy tap", threat: "HIGH" },
  "security-cam": { note: "Records the incident for quality assurance and light blackmail. The tape is permanent", threat: "LOW" },
  gravity: { note: "Temporarily reprograms gravity. Furniture is not secured. Firmware is not liable", threat: "SEVERE" },
  heavy: { note: "Becomes impossibly heavy and locks the stage. Refreshing would have ruined the tragedy", threat: "SEVERE" },
  clingy: { note: "Follows your cursor everywhere. Petting calms it. It remembers forever", threat: "SEVERE" },
  strobe: { note: "Full strobe burst. Photosensitive chaos. Sanity briefly optional", threat: "SEVERE" },
  rotation: { note: "Rotates the laboratory. Orientation is now a suggestion", threat: "SEVERE" },
  onomatopoeia: { note: "Erupts in comic book sound effects. Reading is required. Plot is not provided", threat: "LOW" },
  abduction: { note: "A saucer beams the button up, examines it, and drops it back. No refunds, no memories", threat: "CRITICAL" },
};

const ACHIEVEMENTS: Achievement[] = [
  { id: "first-contact", name: "First Contact", desc: "Press the button for the very first time. It was probably downhill from here.", test: (s) => s.summons >= 1 },
  { id: "persistent", name: "Persistent", desc: "Summon the button 50 times across your entire life. A life well spent.", test: (s) => s.summons >= 50 },
  { id: "centurion", name: "Centurion of Nothing", desc: "Reach 100 lifetime summons. Historians will not write about this.", test: (s) => s.summons >= 100 },
  { id: "obsessed", name: "Get a Hobby", desc: "Reach 500 lifetime summons. The button is starting to worry.", test: (s) => s.summons >= 500 },
  { id: "full-circle", name: "Full Circle", desc: "Guide the button through all four phases to enlightenment.", test: (s) => s.cycles >= 1 },
  { id: "groundhog", name: "Groundhog Button", desc: "Complete three full cycles. Same chaos, different day.", test: (s) => s.cycles >= 3 },
  { id: "philosopher", name: "Armchair Philosopher", desc: "Sit through 5 philosophical quotes without learning anything.", test: (s) => s.quotes >= 5 },
  { id: "bureaucrat-whisperer", name: "Bureaucrat Whisperer", desc: "Successfully complete Form 27B/6, accomplishing absolutely nothing.", test: (s) => s.forms >= 1 },
  { id: "paper-trail", name: "Paper Trail", desc: "Abandon Form 27B/6. The bureaucracy never forgets.", test: (s) => s.abandons >= 1 },
  { id: "cat-catcher", name: "Cat Catcher", desc: "Catch the runaway button. It wanted to be caught. Secretly.", test: (s) => s.catches >= 1 },
  { id: "attachment", name: "Attachment Issues", desc: "Pet the clingy button. It will remember this forever.", test: (s) => s.pets >= 1 },
  { id: "observer", name: "Quantum Observer", desc: "Open Schrodinger's button and find the cat alive. Probably.", test: (s) => s.observations >= 1 },
  { id: "dont-panic", name: "Don't Panic", desc: "Discover the answer to life, the universe, and everything.", test: (s) => s.answers >= 1 },
  { id: "alarmist", name: "Alarmist", desc: "Press the button after being told, in no uncertain terms, not to.", test: (s) => s.panics >= 1 },
  { id: "social-anxiety", name: "Social Anxiety", desc: "Make the shy button hide. It appreciates the space.", test: (s) => s.shys >= 1 },
  { id: "silencer", name: "The Silencer", desc: "Mute the dramatic audio. The orchestra feels betrayed.", test: (s) => s.mutes >= 1 },
  { id: "konami", name: "Cheat Code Honored", desc: "Enter the ancient sequence: up, up, down, down and friends. Nothing was unlocked. Something was felt.", test: (s) => s.konami >= 1 },
  { id: "speed-demon", name: "Speed Demon", desc: "Chain 10 presses into a single combo. The button now knows what a machine gun feels like.", test: (s) => s.bestStreak >= 10 },
  { id: "finger-of-legend", name: "Finger of Legend", desc: "Chain 20 presses into one combo. Songs will be written. None of them flattering.", test: (s) => s.bestStreak >= 20 },
  { id: "opening-up", name: "Opening Up", desc: "Accept an unsolicited therapy session from a button. How did that make you feel?", test: (s) => s.therapy >= 1 },
  { id: "on-camera", name: "On Camera", desc: "Get caught on the security feed pressing a button that does nothing. The tape is permanent.", test: (s) => s.incidents >= 1 },
  { id: "humble-bragger", name: "Humble Bragger", desc: "Broadcast your entirely unimpressive records to someone, anyone.", test: (s) => s.shares >= 1 },
  { id: "control-freak", name: "Control Freak", desc: "Adjust a setting in the Control Room. Unlike the button, it actually worked.", test: (s) => s.tinkers >= 1 },
  { id: "corporate-camouflage", name: "Corporate Camouflage", desc: "Deploy the Boss Screen. Somewhere, a manager felt a disturbance in the force and suspected nothing.", test: (s) => s.bossEscapes >= 1 },
  { id: "poker-face", name: "Poker Face", desc: "Deploy the Boss Screen five times. You are now legally a spreadsheet.", test: (s) => s.bossEscapes >= 5 },
  { id: "party-planner", name: "Party Planner", desc: "Activate Party Mode with the ancient code. The button is doing too much, on purpose.", test: (s) => s.parties >= 1 },
  { id: "field-researcher", name: "Field Researcher", desc: "Witness every single behavior in the census at least once. All of them. For science.", test: (_s, seen) => Object.keys(BEHAVIOR_NAMES).every((id) => (seen[id] ?? 0) > 0) },
  { id: "regular", name: "Regular", desc: "Visit the laboratory on five separate days. The button pretends not to be pleased.", test: (s) => s.visits >= 5 },
  { id: "the-fixture", name: "The Fixture", desc: "Visit the laboratory on 25 separate days. At this point the button is your roommate.", test: (s) => s.visits >= 25 },
  { id: "word-salad", name: "Word Salad", desc: "Witness 10 comic book outbursts. POW. BAM. Vocabulary.", test: (_s, seen) => (seen["onomatopoeia"] ?? 0) >= 10 },
  { id: "close-encounter", name: "Close Encounter", desc: "Witness the button being abducted, examined, and returned. The truth is in there.", test: (_s, seen) => (seen["abduction"] ?? 0) >= 1 },
  { id: "overkill", name: "Overkill", desc: "Hold the button down until it is fully charged, then let go. Responsibility sold separately.", test: (s) => s.overcharges >= 1 },
  { id: "capacitor", name: "Capacitor", desc: "Release ten full overcharges. The laboratory electrician has questions.", test: (s) => s.overcharges >= 10 },
  { id: "the-censor", name: "The Censor", desc: "Suppress a behavior from the census. The lab will pretend it never existed.", test: (s) => s.censors >= 1 },
  { id: "full-amnesty", name: "Full Amnesty", desc: "Pardon every suppressed behavior at once. The census rejoices, quietly.", test: (s) => s.pardons >= 1 },
  { id: "the-archivist", name: "The Archivist", desc: "Export a backup of your records. Your nonsense is now portable. Congratulations.", test: (s) => s.exports >= 1 },
  { id: "the-historian", name: "The Historian", desc: "Restore a backup. The past is back, and it brought numbers.", test: (s) => s.imports >= 1 },
  { id: "the-librarian", name: "The Librarian", desc: "Mute a single behavior. One voice, removed from the choir.", test: (s) => s.silences >= 1 },
  { id: "noise-complaint", name: "Noise Complaint", desc: "Mute five behaviors. The laboratory now hums with polite, pointed silence.", test: (s) => s.silences >= 5 },
  { id: "deja-vu", name: "Deja Vu", desc: "Double-tap the button fast enough to tear a small hole in causality.", test: (s) => s.doubleTaps >= 1 },
  { id: "split-personality", name: "Split Personality", desc: "Land ten double-taps. The button has started arguing with itself.", test: (s) => s.doubleTaps >= 10 },
  { id: "the-duelist", name: "The Duelist", desc: "Copy a duel link and hurl your records at an unsuspecting acquaintance.", test: (s) => s.duels >= 1 },
  { id: "timeline-thief", name: "Timeline Thief", desc: "Absorb a stranger's chaos records through a duel link. Their numbers are your numbers now.", test: (s) => s.duelsAccepted >= 1 },
  { id: "the-conductor", name: "The Conductor", desc: "Turn the Chaos Dial to a new setting. The orchestra obeys. The button merely copes.", test: (s) => s.dialTurns >= 1 },
  { id: "the-percussionist", name: "The Percussionist", desc: "Replay the seismograph drum. Watch the whole session happen again, in needle form.", test: (s) => s.replays >= 1 },
  { id: "metronome", name: "Metronome", desc: "Replay the drum ten times. The laboratory now has a house band and it is you.", test: (s) => s.replays >= 10 },
];

const STAT_LABELS: Record<StatKey, string> = {
  summons: "Lifetime summons",
  cycles: "Cycles completed",
  quotes: "Quotes endured",
  cookies: "Fortunes cracked",
  catches: "Runaways caught",
  forms: "Forms completed",
  abandons: "Forms abandoned",
  pets: "Buttons petted",
  answers: "Answers found",
  panics: "Forbidden presses",
  mutes: "Times muted",
  observations: "Cats observed",
  shys: "Shy episodes",
  konami: "Cheat codes entered",
  bestStreak: "Best click streak",
  therapy: "Therapy sessions",
  incidents: "Incidents recorded",
  shares: "Brags shared",
  tinkers: "Settings fiddled with",
  bossEscapes: "Boss screens deployed",
  parties: "Party modes started",
  visits: "Laboratory visits",
  overcharges: "Overcharges released",
  censors: "Behaviors suppressed",
  pardons: "Amnesties granted",
  exports: "Backups exported",
  imports: "Backups restored",
  silences: "Behaviors muted",
  doubleTaps: "Double-taps landed",
  duels: "Duel links copied",
  duelsAccepted: "Timelines absorbed",
  dialTurns: "Chaos dial turns",
  replays: "Drum replays",
};

interface Persisted {
  stats: ChaosStats;
  unlocked: string[];
  counts: Record<string, number>;
  /** Epoch ms of the most recent sighting per behavior id. */
  lastSeen: Record<string, number>;
  /** Behavior ids the visitor has suppressed from the schedule. */
  banned: string[];
  /** Behavior ids whose noises the visitor has muted. */
  muted: string[];
}

interface ToastItem {
  kicker: string;
  name: string;
  desc: string;
}

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { stats: { ...EMPTY_STATS }, unlocked: [], counts: {}, lastSeen: {}, banned: [], muted: [] };
    }
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      stats: { ...EMPTY_STATS, ...(parsed.stats ?? {}) },
      unlocked: Array.isArray(parsed.unlocked) ? parsed.unlocked : [],
      counts: parsed.counts && typeof parsed.counts === "object" ? { ...parsed.counts } : {},
      lastSeen:
        parsed.lastSeen && typeof parsed.lastSeen === "object" ? { ...parsed.lastSeen } : {},
      banned: Array.isArray(parsed.banned) ? parsed.banned.filter((id): id is string => typeof id === "string") : [],
      muted: Array.isArray(parsed.muted) ? parsed.muted.filter((id): id is string => typeof id === "string") : [],
    };
  } catch {
    return { stats: { ...EMPTY_STATS }, unlocked: [], counts: {}, lastSeen: {}, banned: [], muted: [] };
  }
}

/** Human time since an epoch stamp, for census dossiers. */
function ago(epoch: number): string {
  const s = Math.floor((Date.now() - epoch) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Rolls every [data-count] number up from zero. Purely ceremonial. */
function animateCounts(scope: HTMLElement): void {
  const nodes = scope.querySelectorAll<HTMLElement>("[data-count]");
  nodes.forEach((node, i) => {
    const target = Number(node.dataset.count ?? "0");
    if (!Number.isFinite(target) || target === 0) return;
    const startAt = performance.now() + i * 16;
    const dur = 560;
    const step = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - startAt) / dur));
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

export class AchievementSystem {
  private stats: ChaosStats;
  private unlocked: Set<string>;
  private counts: Record<string, number>;
  private lastSeen: Record<string, number>;
  private banned: Set<string>;
  private muted: Set<string>;
  private toastStack: HTMLElement;
  private panel: HTMLElement;
  private statsList: HTMLElement;
  private achGrid: HTMLElement;
  private censusList: HTMLElement | null;
  private censusDetail: HTMLElement | null = null;
  private listClickHandler: ((ev: MouseEvent) => void) | null = null;
  private detailClickHandler: ((ev: MouseEvent) => void) | null = null;
  private badge: HTMLElement | null;
  private selectedBehavior: string | null = null;
  private queue: ToastItem[] = [];
  private toastsShown = 0;
  private schedule: (fn: () => void, ms: number) => void;
  /** Live-updatable: slows toast retirement when motion is reduced. */
  reduced: boolean;
  /** Optional listener for unlock toasts. The flight recorder subscribes. */
  onUnlock: ((name: string, desc: string) => void) | null = null;

  constructor(parts: {
    toastStack: HTMLElement;
    panel: HTMLElement;
    statsList: HTMLElement;
    achGrid: HTMLElement;
    censusList?: HTMLElement | null;
    badge?: HTMLElement | null;
    reduced: boolean;
    schedule: (fn: () => void, ms: number) => void;
  }) {
    const persisted = load();
    this.stats = persisted.stats;
    this.unlocked = new Set(persisted.unlocked);
    this.counts = persisted.counts;
    this.lastSeen = persisted.lastSeen;
    this.banned = new Set(persisted.banned);
    this.muted = new Set(persisted.muted);
    this.toastStack = parts.toastStack;
    this.panel = parts.panel;
    this.statsList = parts.statsList;
    this.achGrid = parts.achGrid;
    this.censusList = parts.censusList ?? null;
    this.badge = parts.badge ?? null;
    this.reduced = parts.reduced;
    this.schedule = parts.schedule;
    this.renderPanel();
    this.updateBadge(); // the badge must reflect restored records on boot, not 0/0
    this.initCensusDossier();
  }

  get unlockedCount(): number {
    return this.unlocked.size;
  }

  /** Read-only copy of the stats, for brag construction and debug tooling. */
  get snapshot(): ChaosStats {
    return { ...this.stats };
  }

  /** Read-only copy of the behavior census. */
  get behaviorCounts(): Record<string, number> {
    return { ...this.counts };
  }

  /** Ids the visitor banned from the schedule. The engine reads this every click. */
  get suppressedIds(): string[] {
    return [...this.banned];
  }

  isSuppressed(id: string): boolean {
    return this.banned.has(id);
  }

  /** Flip a behavior's suppression. Returns the new state. */
  toggleSuppress(id: string): boolean {
    const nowBanned = !this.banned.has(id);
    if (nowBanned) {
      this.banned.add(id);
      this.stat("censors");
    } else {
      this.banned.delete(id);
    }
    this.persist();
    this.renderCensus();
    return nowBanned;
  }

  /** Ids whose noises are muted. The engine swaps in a silent soundtrack. */
  get mutedIds(): string[] {
    return [...this.muted];
  }

  isMuted(id: string): boolean {
    return this.muted.has(id);
  }

  /** Flip a behavior's mute. Returns the new state. */
  toggleMute(id: string): boolean {
    const nowMuted = !this.muted.has(id);
    if (nowMuted) {
      this.muted.add(id);
      this.stat("silences");
    } else {
      this.muted.delete(id);
    }
    this.persist();
    this.renderCensus();
    return nowMuted;
  }

  /** Serializable copy of the records, for the export file. */
  exportPayload(): Persisted {
    return {
      stats: { ...this.stats },
      unlocked: [...this.unlocked],
      counts: { ...this.counts },
      lastSeen: { ...this.lastSeen },
      banned: [...this.banned],
      muted: [...this.muted],
    };
  }

  /**
   * Merge a backup into the living records. Keeps the better number:
   * max of each stat and census count, latest sighting, union of flags.
   * Returns how many stat keys were improved.
   */
  importPayload(data: unknown): number {
    const d = (data ?? {}) as Partial<Persisted>;
    if (!d.stats || typeof d.stats !== "object") return -1;
    let improved = 0;
    for (const key of Object.keys(EMPTY_STATS) as StatKey[]) {
      const incoming = Number((d.stats as unknown as Record<string, unknown>)[key] ?? 0);
      if (Number.isFinite(incoming) && incoming > this.stats[key]) {
        this.stats[key] = incoming;
        improved++;
      }
    }
    const incUnlocked = Array.isArray(d.unlocked) ? d.unlocked.filter((x): x is string => typeof x === "string") : [];
    incUnlocked.forEach((id) => this.unlocked.add(id));
    if (d.counts && typeof d.counts === "object") {
      for (const [id, n] of Object.entries(d.counts)) {
        const num = Number(n);
        if (Number.isFinite(num) && num > (this.counts[id] ?? 0)) this.counts[id] = num;
      }
    }
    if (d.lastSeen && typeof d.lastSeen === "object") {
      for (const [id, t] of Object.entries(d.lastSeen)) {
        const num = Number(t);
        if (Number.isFinite(num) && num > (this.lastSeen[id] ?? 0)) this.lastSeen[id] = num;
      }
    }
    if (Array.isArray(d.banned)) d.banned.filter((x): x is string => typeof x === "string").forEach((id) => this.banned.add(id));
    if (Array.isArray(d.muted)) d.muted.filter((x): x is string => typeof x === "string").forEach((id) => this.muted.add(id));
    this.evaluate();
    this.updateBadge();
    this.renderPanel();
    return improved;
  }

  /** Clear the whole ban list. Returns how many behaviors walked free. */
  pardonAll(): number {
    const freed = this.banned.size;
    if (freed === 0) return 0;
    this.banned.clear();
    this.stat("pardons");
    this.persist();
    this.renderCensus();
    return freed;
  }

  get total(): number {
    return ACHIEVEMENTS.length;
  }

  /** Increment a stat, persist, and evaluate every achievement. */
  stat(key: StatKey, by = 1): void {
    this.stats[key] += by;
    this.evaluate();
    if (this.panel.classList.contains("on")) this.renderPanel();
  }

  /** Keep the larger of the stored value and the incoming value. For peaks like best streak. */
  maxStat(key: StatKey, value: number): void {
    if (value <= this.stats[key]) return;
    this.stats[key] = value;
    this.evaluate();
    if (this.panel.classList.contains("on")) this.renderPanel();
  }

  /** One for the census: this behavior was witnessed in the wild. */
  bumpBehavior(id: string): void {
    this.counts[id] = (this.counts[id] ?? 0) + 1;
    this.lastSeen[id] = Date.now();
    this.evaluate();
    if (this.panel.classList.contains("on")) this.renderCensus();
  }

  /** Queue a fully custom toast (used for rank promotions). */
  customToast(kicker: string, name: string, desc: string): void {
    this.queue.push({ kicker, name, desc });
    this.pumpToasts();
  }

  forgetEverything(): void {
    this.stats = { ...EMPTY_STATS };
    this.unlocked.clear();
    this.counts = {};
    this.lastSeen = {};
    this.banned.clear();
    this.muted.clear();
    this.selectedBehavior = null;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* the void accepts all data */
    }
    this.updateBadge();
    this.renderPanel();
  }

  private evaluate(): void {
    let dirty = false;
    for (const a of ACHIEVEMENTS) {
      if (!this.unlocked.has(a.id) && a.test(this.stats, this.counts)) {
        this.unlocked.add(a.id);
        this.queueToast(a);
        dirty = true;
      }
    }
    this.persist();
    if (dirty) this.updateBadge();
  }

  private updateBadge(): void {
    if (this.badge) this.badge.textContent = `${this.unlocked.size}/${ACHIEVEMENTS.length}`;
  }

  private persist(): void {
    try {
      const data: Persisted = {
        stats: this.stats,
        unlocked: [...this.unlocked],
        counts: this.counts,
        lastSeen: this.lastSeen,
        banned: [...this.banned],
        muted: [...this.muted],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* private browsing is a lifestyle */
    }
  }

  private queueToast(a: Achievement): void {
    this.queue.push({ kicker: "Record unlocked", name: a.name, desc: a.desc });
    this.pumpToasts();
  }

  private pumpToasts(): void {
    if (this.toastsShown >= 3 || this.queue.length === 0) return;
    const item = this.queue.shift()!;
    this.toastsShown++;

    const toast = document.createElement("div");
    toast.className = "ach-toast";
    toast.setAttribute("role", "status");
    toast.innerHTML = `
      <span class="ach-toast-icon" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" />
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      </span>
      <span class="ach-toast-body">
        <span class="ach-toast-kicker">${item.kicker}</span>
        <span class="ach-toast-name">${item.name}</span>
        <span class="ach-toast-desc">${item.desc}</span>
      </span>`;

    this.onUnlock?.(item.name, item.desc);
    this.toastStack.appendChild(toast);
    // bottom-right corner toasts get a slightly longer stay; they are
    // out of the way now, so let people actually read them
    this.schedule(() => toast.classList.add("out"), 4700);
    this.schedule(() => {
      toast.remove();
      this.toastsShown--;
      this.pumpToasts();
    }, this.reduced ? 5000 : 5400);

    if (this.panel.classList.contains("on")) this.renderPanel();
  }

  /** animate=true rolls every number up from zero, for the grand opening. */
  renderPanel(animate = false): void {
    const rows = (Object.keys(STAT_LABELS) as StatKey[])
      .map(
        (key) =>
          `<div class="rec-row"><span>${STAT_LABELS[key]}</span><b data-count="${this.stats[key]}">${this.stats[key]}</b></div>`,
      )
      .join("");
    this.statsList.innerHTML = rows;

    this.achGrid.innerHTML = ACHIEVEMENTS.map((a) => {
      const got = this.unlocked.has(a.id);
      return `<div class="ach-tile ${got ? "got" : "locked"}" title="${a.desc}">
        <span class="ach-tile-name">${got ? a.name : "???"}</span>
        <span class="ach-tile-desc">${got ? a.desc : "Keep pressing to discover"}</span>
      </div>`;
    }).join("");

    this.renderCensus();
    if (animate && !this.reduced) {
      animateCounts(this.statsList);
      if (this.censusList) animateCounts(this.censusList);
    }
  }

  /** The Behavior Census: every behavior, how many times it fired for you. */
  private renderCensus(): void {
    if (!this.censusList) return;
    const ids = Object.keys(BEHAVIOR_NAMES);
    const max = Math.max(1, ...ids.map((id) => this.counts[id] ?? 0));
    const leader = max > 1 ? ids.find((id) => (this.counts[id] ?? 0) === max) : null;
    const sorted = [...ids].sort((a, b) => (this.counts[b] ?? 0) - (this.counts[a] ?? 0));
    let html = sorted
      .map((id) => {
        const count = this.counts[id] ?? 0;
        const seen = this.lastSeen[id];
        const tip = count === 0
          ? "Never witnessed. It is probably waiting for the perfect moment"
          : `Witnessed ${count} time${count === 1 ? "" : "s"}, last ${ago(seen ?? Date.now())}`;
        const pct = count === 0 ? 0 : Math.max(6, Math.round((count / max) * 100));
        const selected = this.selectedBehavior === id;
        const suppressed = this.banned.has(id);
        const silenced = this.muted.has(id);
        return `<button type="button" class="census-row ${count === 0 ? "unseen" : ""} ${selected ? "selected" : ""} ${suppressed ? "suppressed" : ""} ${silenced ? "muted" : ""} ${leader === id && count > 0 ? "leader" : ""}" data-behavior="${id}" aria-expanded="${selected}" title="${tip}${suppressed ? " (suppressed)" : ""}${silenced ? " (muted)" : ""}">
          <span class="census-name">${BEHAVIOR_NAMES[id]}</span>
          <span class="census-bar" aria-hidden="true"><span class="census-bar-fill" style="width:${pct}%"></span></span>
          <b class="census-count" data-count="${count}">${count}</b>
        </button>`;
      })
      .join("");
    if (this.banned.size > 0) {
      const n = this.banned.size;
      html += `<button type="button" class="census-pardon" data-pardon="1">Pardon all (${n} suppressed)</button>`;
    }
    this.censusList.innerHTML = html;
    if (this.selectedBehavior) {
      this.renderCensusDetail(this.selectedBehavior);
    } else if (this.censusDetail) {
      this.censusDetail.hidden = true;
      this.censusDetail.innerHTML = "";
    }
  }

  /**
   * The dossier: clicking a census row opens a field note beneath the list,
   * with the behavior's file, threat rating and sighting history.
   */
  private initCensusDossier(): void {
    if (!this.censusList) return;
    const parent = this.censusList.parentElement;
    if (!parent) return;
    this.censusDetail = document.createElement("div");
    this.censusDetail.className = "census-detail";
    this.censusDetail.hidden = true;
    this.censusDetail.setAttribute("role", "region");
    this.censusDetail.setAttribute("aria-live", "polite");
    parent.appendChild(this.censusDetail);

    this.censusList.addEventListener("click", (this.listClickHandler = (ev) => {
      const target = ev.target as HTMLElement;
      if (target.closest("[data-pardon]")) {
        const freed = this.pardonAll();
        if (freed > 0 && this.censusDetail) {
          this.censusDetail.hidden = true;
          this.censusDetail.innerHTML = "";
        }
        return;
      }
      const row = target.closest<HTMLElement>(".census-row");
      if (!row) return;
      const id = row.dataset.behavior ?? "";
      if (!BEHAVIOR_DOSSIER[id]) return;
      this.selectedBehavior = this.selectedBehavior === id ? null : id;
      this.renderCensus();
      if (this.selectedBehavior) {
        this.censusDetail?.scrollIntoView({ block: "nearest", behavior: this.reduced ? "auto" : "smooth" });
      }
    }));

    // the dossier's suppress + mute switches live outside the row list, so
    // they get their own delegated listener on the detail card
    this.censusDetail?.addEventListener("click", (this.detailClickHandler = (ev) => {
      const target = ev.target as HTMLElement;
      const quiet = target.closest<HTMLElement>("[data-quiet-id]");
      if (quiet) {
        const qid = quiet.dataset.quietId ?? "";
        if (BEHAVIOR_DOSSIER[qid]) this.toggleMute(qid);
        return;
      }
      const sw = target.closest<HTMLElement>("[data-suppress-id]");
      if (!sw) return;
      const id = sw.dataset.suppressId ?? "";
      if (!BEHAVIOR_DOSSIER[id]) return;
      this.toggleSuppress(id);
    }));
  }

  /** Removes the dossier node and its listeners. React remounts are tidy now. */
  destroy(): void {
    if (this.censusList && this.listClickHandler) {
      this.censusList.removeEventListener("click", this.listClickHandler);
    }
    if (this.censusDetail && this.detailClickHandler) {
      this.censusDetail.removeEventListener("click", this.detailClickHandler);
    }
    this.censusDetail?.remove();
    this.censusDetail = null;
    this.listClickHandler = null;
    this.detailClickHandler = null;
  }

  private renderCensusDetail(id: string): void {
    if (!this.censusDetail) return;
    const name = BEHAVIOR_NAMES[id];
    const meta = BEHAVIOR_DOSSIER[id];
    if (!name || !meta) {
      this.censusDetail.hidden = true;
      return;
    }
    const count = this.counts[id] ?? 0;
    const seen = this.lastSeen[id];
    const sighting =
      count === 0
        ? "Sightings: none. It is waiting. Probably for you"
        : `Sightings: ${count}, most recent ${ago(seen ?? Date.now())}`;
    const suppressed = this.banned.has(id);
    const silenced = this.muted.has(id);
    this.censusDetail.hidden = false;
    this.censusDetail.innerHTML = `
      <div class="dossier-head">
        <span class="dossier-file">FIELD FILE ${id.toUpperCase()}</span>
        <span class="dossier-threat t-${meta.threat.toLowerCase()}">${meta.threat}</span>
      </div>
      <p class="dossier-name">${name}</p>
      <p class="dossier-note">${meta.note}</p>
      <p class="dossier-sightings">${sighting}</p>
      <div class="dossier-suppress">
        <button type="button" role="switch" aria-checked="${suppressed}" data-suppress-id="${id}" class="dossier-switch">
          <span class="dossier-switch-track" aria-hidden="true"><span class="dossier-switch-knob"></span></span>
          <span class="dossier-switch-text">Suppress this behavior</span>
        </button>
        <p class="dossier-suppress-hint">${
          suppressed
            ? "Suppressed. The lab will never schedule it again. For cowards"
            : "Ban it from the schedule forever. The census does not judge. Much"
        }</p>
      </div>
      <div class="dossier-quiet">
        <button type="button" role="switch" aria-checked="${silenced}" data-quiet-id="${id}" class="dossier-switch quiet">
          <span class="dossier-switch-track" aria-hidden="true"><span class="dossier-switch-knob"></span></span>
          <span class="dossier-switch-text">Mute this behavior</span>
        </button>
        <p class="dossier-suppress-hint">${
          silenced
            ? "Silenced. It performs in pantomime now, with feeling"
            : "Let it perform silently. Opera glasses optional"
        }</p>
      </div>`;
  }
}
