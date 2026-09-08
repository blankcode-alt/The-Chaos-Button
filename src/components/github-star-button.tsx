'use client'

import { useEffect, useState } from 'react'

const REPO_URL = 'https://github.com/blankcode-alt/the-chaos-button'
const GITHUB_API = 'https://api.github.com/repos/blankcode-alt/the-chaos-button'
const SHIELDS_API =
  'https://img.shields.io/github/stars/blankcode-alt/the-chaos-button.json'
const CACHE_KEY = 'ghx-stars'
const CACHE_AT_KEY = 'ghx-stars-at'
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes

function formatStars(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k`
  }
  return String(count)
}

function readCachedStars(): number | null {
  try {
    const cached = sessionStorage.getItem(CACHE_KEY)
    const cachedAt = sessionStorage.getItem(CACHE_AT_KEY)
    const n = cached === null ? Number.NaN : Number(cached)
    if (!Number.isNaN(n) && cachedAt && Date.now() - Number(cachedAt) < CACHE_TTL) {
      return n
    }
  } catch {
    /* private browsing may block storage — just fetch fresh */
  }
  return null
}

function writeCachedStars(count: number): void {
  try {
    sessionStorage.setItem(CACHE_KEY, String(count))
    sessionStorage.setItem(CACHE_AT_KEY, String(Date.now()))
  } catch {
    /* storage full/blocked — the button still works */
  }
}

/** Ask GitHub first; if rate-limited or offline, try the shields.io mirror. */
async function fetchStarCount(): Promise<number | null> {
  try {
    const res = await fetch(GITHUB_API, {
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (res.ok) {
      const data: { stargazers_count?: number } = await res.json()
      if (typeof data?.stargazers_count === 'number') return data.stargazers_count
    }
  } catch {
    /* fall through to the mirror */
  }
  try {
    const res = await fetch(SHIELDS_API)
    if (res.ok) {
      const data: { value?: string } = await res.json()
      const n = Number(data?.value)
      if (!Number.isNaN(n)) return n
    }
  } catch {
    /* both sources are shy */
  }
  return null
}

/**
 * The classic "please clap" widget the pros wear in the corner.
 * Slots into the top-right glass-button row (after #sound-toggle).
 * Asks GitHub for the live star count; falls back to shields.io when
 * the API is rate-limited; shows no number at all if both are shy.
 * All CSS travels inside the component — zero changes needed elsewhere.
 */
export default function GitHubStarButton() {
  const [stars, setStars] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    // 1) a fresh cache hit resolves immediately (be polite to the API)
    const cached = readCachedStars()
    // 2) otherwise ask GitHub, falling back to the shields.io mirror
    const source: Promise<number | null> =
      cached !== null ? Promise.resolve(cached) : fetchStarCount()

    source.then((n) => {
      if (cancelled) return
      if (n === null) {
        // no number today — the button still stars, just without a badge
        setFailed(true)
        return
      }
      setStars(n)
      if (cached === null) writeCachedStars(n)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <a
      className="ghx-star"
      href={REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Star The Chaos Button on GitHub (opens in a new tab)"
      title="Star The Chaos Button on GitHub"
    >
      <style>{GHX_CSS}</style>

      {/* the octocat, 17px of instant credibility */}
      <svg
        className="ghx-mark"
        viewBox="0 0 16 16"
        width="17"
        height="17"
        aria-hidden="true"
        focusable="false"
      >
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
        />
      </svg>

      <span className="ghx-label">Star</span>

      {stars === null && !failed && <span className="ghx-count ghx-pending">…</span>}
      {stars !== null && (
        <>
          <span className="ghx-divider" aria-hidden="true" />
          <span className="ghx-count">{formatStars(stars)}</span>
        </>
      )}
    </a>
  )
}

const GHX_CSS = `
.ghx-star {
  position: fixed;
  top: 0.9rem;
  right: 12.9rem;
  z-index: 92;
  height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  padding: 0 0.72rem 0 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: var(--glass-bg);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  color: var(--c-text-dim);
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}
.ghx-star:hover {
  transform: scale(1.06);
  color: var(--c-text);
  border-color: var(--c-accent-glow);
  box-shadow: 0 0 14px var(--c-accent-soft);
}
.ghx-star:active { transform: scale(0.95); }
.ghx-star:focus-visible {
  outline: 2px solid var(--c-accent-2);
  outline-offset: 3px;
}
.ghx-mark { flex: none; transition: transform 0.25s var(--fx-ease, ease); }
.ghx-star:hover .ghx-mark { transform: rotate(-12deg) scale(1.12); }
.ghx-label { flex: none; }
.ghx-divider {
  flex: none;
  width: 1px;
  height: 16px;
  background: var(--glass-border);
}
.ghx-count {
  flex: none;
  min-width: 1.15rem;
  padding: 0.16rem 0.46rem;
  border-radius: 999px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  background: rgba(128, 128, 128, 0.22);
  animation: ghx-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ghx-pending { animation: none; opacity: 0.55; }
@keyframes ghx-pop {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@media (max-width: 640px) {
  .ghx-star { padding: 0 0.62rem 0 0.72rem; gap: 0.36rem; }
  .ghx-label { display: none; }
}
@media (max-width: 380px) {
  .ghx-star { width: 42px; padding: 0; justify-content: center; }
  .ghx-divider, .ghx-count { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .ghx-star, .ghx-mark, .ghx-count { transition: none; animation: none; }
  .ghx-star:hover { transform: none; }
}
