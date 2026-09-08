'use client'

import { useEffect } from 'react'
import './chaos.css'
import { createChaosEngine } from '@/lib/chaos/engine'
import GitHubStarButton from '@/components/github-star-button'

export default function Home() {
  useEffect(() => {
    const engine = createChaosEngine()
    engine.init()
    return () => engine.destroy()
  }, [])

  return (
    <div id="chaos-root">
            {/* github star button: the classic "please clap" widget the pros wear */}
      <GitHubStarButton />

      {/* dramatic loading screen (CSS fail-safe: auto-hides at 3s) */}
      <div id="loading-screen" role="status" aria-label="Loading the chaos laboratory">
        <div className="loading-spinner" aria-hidden="true" />
        <p className="loading-title">The Useless Button Laboratory</p>
        <div className="loading-bar-track" aria-hidden="true">
          <div className="loading-bar-fill" id="loading-bar-fill" />
        </div>
        <p id="loading-text">Initializing useless experiments...</p>
      </div>

      {/* particle canvas + fx overlays */}
      <canvas id="fx-canvas" aria-hidden="true" />
      <div id="grain" aria-hidden="true" />
      <div id="god-rays" aria-hidden="true" />
      <div id="vignette" aria-hidden="true" />
      <div id="flash-overlay" aria-hidden="true" />
      <div id="strobe-overlay" aria-hidden="true" />
      <div id="alarm-overlay" aria-hidden="true" />

      {/* the boss screen: Escape summons a suspiciously productive spreadsheet */}
      <div
        id="boss-screen"
        role="dialog"
        aria-label="Boss screen: quarterly budget spreadsheet camouflage"
        aria-hidden="true"
        tabIndex={-1}
      >
        <div className="bs-titlebar">
          <span className="bs-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span id="boss-title">Q1_BUDGET_FINAL_v2(3).xlsx - Excel</span>
          <span className="bs-user">last saved by you, apparently</span>
        </div>
        <div className="bs-ribbon" aria-hidden="true">
          <span className="bs-tab bs-tab-on">File</span>
          <span className="bs-tab">Home</span>
          <span className="bs-tab">Insert</span>
          <span className="bs-tab">Formulas</span>
          <span className="bs-tab">Review</span>
        </div>
        <div className="bs-formula" aria-hidden="true">
          <span className="bs-cellref">D9</span>
          <span className="bs-fx">fx</span>
          <span className="bs-formula-val">=SUM(D4:D8)*0.97</span>
        </div>
        <div id="boss-sheet" aria-hidden="true" />
        <div className="bs-statusbar" aria-hidden="true">
          <span>Ready</span>
          <span>Average: 4,213.09</span>
          <span>Sum: 84,261.80</span>
          <span className="bs-hint">Esc or any key: back to the chaos</span>
        </div>
      </div>

      {/* party mode chip: the ancient code makes the button overachieve */}
      <div id="party-chip" aria-hidden="true">
        <span className="party-dot" />
        PARTY MODE <b id="party-time">30s</b>
      </div>

      {/* security camera chip (behavior: you are being recorded, pointlessly) */}
      <div id="rec-chip" aria-hidden="true">
        <span className="rec-dot" />
        <span id="rec-time">REC 00:00</span>
      </div>

      {/* hall of records toggle + achievement toast stack */}
      <button
        id="records-toggle"
        type="button"
        aria-expanded="false"
        aria-controls="records-panel"
        aria-label="Open the Hall of Records"
        title="Hall of Records"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M8 21h8" />
          <path d="M12 17v4" />
          <path d="M7 4h10v5a5 5 0 0 1-10 0Z" />
          <path d="M17 5h3a1 1 0 0 1 1 1c0 2.5-2 4-4 4" />
          <path d="M7 5H4a1 1 0 0 0-1 1c0 2.5 2 4 4 4" />
        </svg>
        <span id="records-badge">0/0</span>
      </button>

      <div id="toast-stack" aria-live="polite" aria-label="Record unlocks" />

      {/* share toggle */}
      <button
        id="share-toggle"
        type="button"
        aria-label="Brag about your button records (copies a shareable line)"
        title="Brag about it"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" y1="2" x2="12" y2="15" />
        </svg>
      </button>

      {/* control room toggle: settings that, unlike the button, work */}
      <button
        id="settings-toggle"
        type="button"
        aria-expanded="false"
        aria-controls="settings-panel"
        aria-label="Open the Control Room settings"
        title="Control Room"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
        </svg>
      </button>

      {/* sound toggle */}
      <button
        id="sound-toggle"
        type="button"
        aria-pressed="true"
        aria-label="Mute dramatic sounds"
        title="Sound"
      >
        <svg
          className="icon-on"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
        <svg
          className="icon-off"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      </button>

      {/* the stage: one button to rule absolutely nothing */}
      <main id="stage">
        <header id="masthead">
          <p id="overline">The Useless Button Laboratory</p>
          <h1 id="title">The Chaos Button</h1>
        </header>

        <div id="button-zone">
          <button id="chaos-button" type="button" aria-label="The chaos button. Pressing it does something. Nobody knows what">
            <span id="button-label">Press Me</span>
          </button>
          <div id="combo-chip" data-tier="1" aria-hidden="true">
            <span id="combo-x">x3</span>
            <span id="combo-tier">Combo</span>
          </div>
        </div>

        <section id="status" aria-live="polite" aria-label="Button status">
          <p id="summoned">
            Times Summoned: <span id="click-count">0</span>
          </p>
          <p id="mood">
            Current Mood: <span id="mood-text">Suspiciously serene</span>
          </p>
          <p id="status-text">The button is charging its personality</p>
          <div id="cycle-meter" aria-hidden="true">
            <div id="cycle-meter-fill" />
            <span className="cycle-tick tick-1" />
            <span className="cycle-tick tick-2" />
            <span className="cycle-tick tick-3" />
          </div>
        </section>
      </main>

      {/* therapist speech bubble (behavior: the button listens, professionally) */}
      <div id="therapist-bubble" role="status" aria-label="The button is offering a therapy session">
        <p id="therapist-kicker">The Button, Therapist</p>
        <p id="therapist-text" />
      </div>

      {/* ambient chaos layers */}
      <div id="pa-stack" aria-hidden="true" />
      <div id="echo-layer" aria-hidden="true" />

      {/* fake loading panel */}
      <div id="fake-loading" role="status" aria-label="Fake loading progress">
        <p id="fake-loading-title">
          <span>Processing</span>
          <span id="fake-loading-pct">0%</span>
        </p>
        <div className="fake-bar-track" aria-hidden="true">
          <div id="fake-bar-fill" />
        </div>
        <p id="fake-loading-note" />
      </div>

      {/* philosophical quote banner: drops in from the top, out of the button's air */}
      <div id="quote-box" aria-live="polite">
        <p id="quote-kicker">Unsolicited Wisdom</p>
        <p id="quote-text" />
        <p id="quote-author" />
      </div>

      {/* bureaucrat modal: Form 27B/6 */}
      <div id="bureau-backdrop">
        <div
          className="bureau-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bureau-title"
        >
          <div className="bureau-header">
            <p className="bureau-kicker">Ministry of Nothing · Dept. of Presses</p>
            <p className="bureau-title" id="bureau-title">
              Form 27B/6: Request to Press a Button
            </p>
            <p className="bureau-sub">
              All fields are mandatory. Processing may accomplish nothing. That
              is not a bug, it is policy
            </p>
          </div>
          <form id="bureau-form">
            <div className="bureau-field">
              <label htmlFor="bureau-name">Full legal name</label>
              <input id="bureau-name" name="bureau-name" type="text" autoComplete="off" placeholder="As it appears on your pressing license" />
            </div>
            <div className="bureau-field">
              <label htmlFor="bureau-reason">Reason for pressing</label>
              <select id="bureau-reason" name="bureau-reason" defaultValue="no-reason">
                <option value="no-reason">No reason whatsoever</option>
                <option value="lonely">The button looked lonely</option>
                <option value="curiosity">Curiosity, personally funded</option>
                <option value="boredom">Sheer boredom</option>
                <option value="told-not-to">I was told not to</option>
                <option value="research">Advanced button research</option>
              </select>
            </div>
            <div className="bureau-field">
              <label className="bureau-check" htmlFor="bureau-ack">
                <input id="bureau-ack" name="bureau-ack" type="checkbox" />
                <span>Nothing will happen. I am at peace with this. My next of kin have been notified</span>
              </label>
            </div>
            <div className="bureau-actions">
              <button className="bureau-btn" id="bureau-cancel" type="button">
                Abandon Form
              </button>
              <button className="bureau-btn primary" id="bureau-submit" type="submit">
                Submit for Review
              </button>
            </div>
            <div id="bureau-result" role="status" />
            <p className="bureau-smallprint">
              Form 27B/6 · Revision 4,022 · Allow 6 to 8 weeks for nothing
            </p>
          </form>
        </div>
      </div>

      {/* phase 4 enlightenment card */}
      <div id="enlighten-card" role="status" aria-label="Enlightenment reached">
        <p id="enlighten-kicker">Press 26 of 26</p>
        <p id="enlighten-title">Enlightenment Achieved</p>
        <p id="enlighten-quote" />
        <p id="enlighten-thanks">
          Thank you for your pointless dedication. The button was never useful,
          but for 26 glorious presses, it was everything.
        </p>
      </div>

      {/* easter egg: the answer */}
      <div id="easter-egg" role="status" aria-label="Easter egg: the number 42">
        <p id="answer-42">42</p>
        <p id="dont-panic">Don&apos;t Panic</p>
        <p id="easter-sub">
          You have summoned the button exactly 42 times. The answer was inside
          you all along. So was the question, unfortunately.
        </p>
      </div>

      {/* fortune cookie behavior */}
      <div id="fortune-card" role="status" aria-label="Fortune cookie">
        <p id="fortune-kicker">Fortune Cookie</p>
        <p id="fortune-text" />
        <p id="fortune-lucky">
          Lucky numbers: <span id="fortune-numbers" />
        </p>
      </div>

      {/* hall of records: lifetime stats + achievements, all stored on-device */}
      <aside
        id="records-panel"
        role="dialog"
        aria-label="Hall of Records"
      >
        <div className="records-head">
          <div>
            <p className="records-title">Hall of Records</p>
            <p className="records-sub">Your lifelong contribution to nothing</p>
            <p id="rank-line" role="status">
              Rank: Bystander
            </p>
          </div>
          <button
            id="records-close"
            type="button"
            aria-label="Close the Hall of Records"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="records-body">
          <section aria-label="Lifetime statistics">
            <p className="records-section-label">Lifetime Statistics</p>
            <div id="records-stats" />
          </section>
          <section aria-label="Chaos seismograph">
            <p className="records-section-label">Chaos Seismograph</p>
            <div className="seismo-wrap">
              <canvas
                id="seismo-canvas"
                role="img"
                aria-label="Seismograph of every press this session, one needle per press"
              />
              <div className="seismo-legend" aria-hidden="true">
                <span className="seismo-key"><i className="k-p1" />P1</span>
                <span className="seismo-key"><i className="k-p2" />P2</span>
                <span className="seismo-key"><i className="k-p3" />P3</span>
                <span className="seismo-key"><i className="k-p4" />P4</span>
                <span className="seismo-total" id="seismo-total">0 events</span>
              </div>
            </div>
            <p className="setting-hint">
              Every press this session, drawn on the drum in phase-colored
              ink. Tap the drum to replay the whole day, with feeling
            </p>
          </section>
          <section aria-label="Flight recorder">
            <p className="records-section-label">Flight Recorder</p>
            <div id="flight-log" aria-live="polite">
              <p className="flight-empty">No incidents logged. Suspiciously clean</p>
            </div>
          </section>
          <section aria-label="Records">
            <p className="records-section-label">Records</p>
            <div id="records-ach-grid" />
          </section>
          <section aria-label="Behavior census">
            <p className="records-section-label">Behavior Census</p>
            <p className="census-sub">Every behavior, counted. Witness them all for science</p>
            <div id="records-census" />
          </section>
        </div>
        <div className="records-foot">
          <div className="records-io">
            <button
              id="records-export"
              type="button"
              title="Download your records as a JSON backup file"
            >
              Export Backup
            </button>
            <button
              id="records-import"
              type="button"
              title="Restore from a chaos backup file. The better numbers win"
            >
              Restore Backup
            </button>
            <button
              id="records-duel"
              type="button"
              title="Copy a duel link: your whole records ride inside the URL, ready to be absorbed"
            >
              Duel Link
            </button>
            <input
              id="records-import-file"
              type="file"
              accept="application/json,.json"
              className="vh-input"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
          <button id="records-reset" type="button">Forget Everything</button>
        </div>
      </aside>

      {/* control room: real settings, working toggles, actual volume */}
      <aside id="settings-panel" role="dialog" aria-label="Control Room settings">
        <div className="records-head">
          <div>
            <p className="records-title">Control Room</p>
            <p className="records-sub">Settings that, unlike the button, work</p>
          </div>
          <button
            id="settings-close"
            type="button"
            aria-label="Close the Control Room"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="records-body">
          <section aria-label="Drama volume">
            <p className="records-section-label">Drama Volume</p>
            <div className="setting-row">
              <div className="setting-slider-line">
                <input
                  id="setting-volume"
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={80}
                  aria-label="Drama volume"
                />
                <output id="setting-volume-value" htmlFor="setting-volume">
                  80
                </output>
              </div>
              <p className="setting-hint">
                From polite blip to the full enlightenment orchestra
              </p>
            </div>
          </section>
          <section aria-label="Chaos dial">
            <p className="records-section-label">Chaos Dial</p>
            <div className="setting-row">
              <div className="setting-slider-line">
                <input
                  id="setting-intensity"
                  type="range"
                  min={50}
                  max={200}
                  step={10}
                  defaultValue={100}
                  aria-label="Chaos intensity, 50 to 200 percent"
                />
                <output id="setting-intensity-value" htmlFor="setting-intensity">
                  100
                </output>
              </div>
              <div className="dial-scale" aria-hidden="true">
                <span>barely trying</span>
                <span>standard</span>
                <span>unhinged</span>
              </div>
              <p className="setting-hint">
                Bends the odds on stunts per press. Max books double bills
              </p>
            </div>
          </section>
          <section aria-label="Toggles">
            <p className="records-section-label">Toggles</p>
            <div className="setting-row">
              <div className="setting-switch-line">
                <span className="setting-name">Camera flashes</span>
                <button
                  id="setting-flashes"
                  type="button"
                  role="switch"
                  aria-checked="true"
                  aria-label="Camera flashes"
                />
              </div>
              <p className="setting-hint">
                Photo flash, strobe bursts and the alarm wash
              </p>
            </div>
            <div className="setting-row">
              <div className="setting-switch-line">
                <span className="setting-name">Full motion</span>
                <button
                  id="setting-motion"
                  type="button"
                  role="switch"
                  aria-checked="true"
                  aria-label="Full motion"
                />
              </div>
              <p className="setting-hint">
                Shakes, rotation, zooms and falling furniture
              </p>
            </div>
            <div className="setting-row">
              <div className="setting-switch-line">
                <span className="setting-name">Tab title chaos</span>
                <button
                  id="setting-titles"
                  type="button"
                  role="switch"
                  aria-checked="true"
                  aria-label="Tab title chaos"
                />
              </div>
              <p className="setting-hint">
                Lets the button rewrite your tab title as moods evolve
              </p>
            </div>
            <div className="setting-row">
              <div className="setting-switch-line">
                <span className="setting-name">Laboratory theme</span>
              </div>
              <div className="theme-picker" role="radiogroup" aria-label="Laboratory theme">
                <button
                  id="theme-dark"
                  type="button"
                  role="radio"
                  aria-checked="true"
                  data-theme-value="dark"
                  className="theme-option"
                >
                  <span className="theme-swatch swatch-dark" aria-hidden="true" />
                  Midnight
                </button>
                <button
                  id="theme-light"
                  type="button"
                  role="radio"
                  aria-checked="false"
                  data-theme-value="light"
                  className="theme-option"
                >
                  <span className="theme-swatch swatch-light" aria-hidden="true" />
                  Daylight
                </button>
                <button
                  id="theme-sepia"
                  type="button"
                  role="radio"
                  aria-checked="false"
                  data-theme-value="sepia"
                  className="theme-option"
                >
                  <span className="theme-swatch swatch-sepia" aria-hidden="true" />
                  Sepia
                </button>
                <button
                  id="theme-sodium"
                  type="button"
                  role="radio"
                  aria-checked="false"
                  data-theme-value="sodium"
                  className="theme-option"
                >
                  <span className="theme-swatch swatch-sodium" aria-hidden="true" />
                  Sodium
                </button>
                <button
                  id="theme-auto"
                  type="button"
                  role="radio"
                  aria-checked="false"
                  data-theme-value="auto"
                  className="theme-option"
                >
                  <span className="theme-swatch swatch-auto" aria-hidden="true" />
                  Auto
                </button>
              </div>
              <p className="setting-hint">
                Natural gloom to hazard stripes. Auto obeys the clock
              </p>
            </div>
          </section>
          <p className="settings-note">
            Everything saves on this device only. There was never a cloud
          </p>
        </div>
      </aside>

      {/* duel modal: a rival timeline arrived through the URL hash */}
      <div id="duel-backdrop">
        <div
          className="duel-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="duel-title"
        >
          <p className="duel-kicker">Incoming transmission</p>
          <p className="duel-title" id="duel-title">
            A Rival Timeline Approaches
          </p>
          <p className="duel-desc">
            Another chaos practitioner has hurled their records at this
            laboratory. Absorb them and the better numbers survive. Decline
            and they return to their own dimension, slightly insulted
          </p>
          <p id="duel-summary" role="status" />
          <div id="duel-ledger" />
          <div className="duel-actions">
            <button id="duel-decline" type="button" className="duel-btn">
              Decline Politely
            </button>
            <button id="duel-accept" type="button" className="duel-btn primary">
              Absorb the Timeline
            </button>
          </div>
        </div>
      </div>

      <footer id="chaos-footer">
        <p>
          Built with too much effort for something completely useless.{' '}
          <a href="https://github.com/blankcode-alt" target="_blank" rel="noopener noreferrer">
            github.com/blankcode-alt
          </a>
        </p>
      </footer>
    </div>
  )
}
