/**
 * SettingsStore: the Control Room's persistent state.
 * Volume, chaos dial, camera flashes, motion, tab title chaos and the
 * laboratory theme, all saved in localStorage. Unlike the button, every
 * setting here actually works.
 */

export type ThemeName = "dark" | "light" | "sepia" | "sodium" | "auto";

export interface ChaosSettings {
  /** 0 to 100, master drama volume. */
  volume: number;
  /** 50 to 200 percent, how hard the button commits to each bit. */
  intensity: number;
  /** Camera flash / strobe / alarm overlays. */
  flashes: boolean;
  /** Full body motion (shakes, rotation, gravity). Off means polite tilts. */
  motion: boolean;
  /** Chaotic document titles per phase. */
  tabTitles: boolean;
  /** Laboratory palette. Auto follows the device's opinion about time of day. */
  theme: ThemeName;
}

const STORAGE_KEY = "chaos-button-settings-v1";
const THEMES: ThemeName[] = ["dark", "light", "sepia", "sodium", "auto"];

const DEFAULTS: ChaosSettings = {
  volume: 80,
  intensity: 100,
  flashes: true,
  motion: true,
  tabTitles: true,
  theme: "dark",
};

function load(): ChaosSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<ChaosSettings> & { daylight?: boolean };
    // Migration: rounds 1-5 stored a daylight boolean. It maps to the
    // light theme; sepia, sodium and auto never existed as booleans, so
    // nobody loses their palette.
    const theme: ThemeName =
      parsed.theme && THEMES.includes(parsed.theme)
        ? parsed.theme
        : parsed.daylight === true
          ? "light"
          : DEFAULTS.theme;
    return {
      volume: clamp(typeof parsed.volume === "number" ? parsed.volume : DEFAULTS.volume),
      intensity: clampIntensity(
        typeof parsed.intensity === "number" ? parsed.intensity : DEFAULTS.intensity,
      ),
      flashes: typeof parsed.flashes === "boolean" ? parsed.flashes : DEFAULTS.flashes,
      motion: typeof parsed.motion === "boolean" ? parsed.motion : DEFAULTS.motion,
      tabTitles: typeof parsed.tabTitles === "boolean" ? parsed.tabTitles : DEFAULTS.tabTitles,
      theme,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function clamp(v: number): number {
  if (Number.isNaN(v)) return DEFAULTS.volume;
  return Math.min(100, Math.max(0, Math.round(v)));
}

function clampIntensity(v: number): number {
  if (Number.isNaN(v)) return DEFAULTS.intensity;
  return Math.min(200, Math.max(50, Math.round(v / 10) * 10));
}

export class SettingsStore {
  private values: ChaosSettings;

  constructor() {
    this.values = load();
  }

  get all(): ChaosSettings {
    return { ...this.values };
  }

  set<K extends keyof ChaosSettings>(key: K, value: ChaosSettings[K]): void {
    this.values[key] = value;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
    } catch {
      /* private browsing keeps your secrets and your settings */
    }
  }
}
