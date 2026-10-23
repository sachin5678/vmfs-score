/**
 * Builds src/data/scores.json for the React app from data/score_raw_data.json.
 *
 * Score = A + B * C^p where C is the mean of four pillar percentiles
 * (P/E, P/B, inverted dividend yield, mean of available trailing 1/3/5/10y returns).
 * (p, A, B) are calibrated on Nifty 50 so the three reference values quoted in the
 * VMFS video are reproduced: median month -> 400, Mar-2009 -> 163, Jan-2008 -> 1250.
 *
 * Refresh the raw data first with `npm run fetch`, then run `npm run data`.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const FROM = '2004-01'

const INDICES = [
  { key: 'nifty50', label: 'Nifty 50', family: 'Large cap' },
  { key: 'next50', label: 'Nifty Next 50', family: 'Large cap' },
  { key: 'mid100', label: 'Nifty Midcap 100', family: 'Mid cap' },
  { key: 'mid150', label: 'Nifty Midcap 150', family: 'Mid cap' },
  { key: 'sml100', label: 'Nifty Smallcap 100', family: 'Small cap' },
  { key: 'sml250', label: 'Nifty Smallcap 250', family: 'Small cap' },
]

// Zone thresholds are the video's. `hue` drives every coloured mark in the app.
const ZONES = [
  { min: -1e9, key: 'deep', short: 'Deep value', action: 'Maximum accumulation', hue: '#12864F' },
  { min: 100, key: 'very', short: 'Very attractive', action: 'Accumulate', hue: '#2FA360' },
  { min: 200, key: 'attract', short: 'Attractive', action: 'Continue SIP, add lumpsum', hue: '#7CB342' },
  { min: 300, key: 'fair', short: 'Reasonably valued', action: 'SIP ok, no lumpsum chase', hue: '#C7C44B' },
  { min: 400, key: 'rich', short: 'Rich', action: 'No fresh lumpsum', hue: '#E8B23A' },
  { min: 500, key: 'stop', short: 'Stop new SIPs', action: 'Pause new commitments', hue: '#E58A2E' },
  { min: 600, key: 'reduce', short: 'Reduce gradually', action: 'Book part profits', hue: '#DB5B33' },
  { min: 800, key: 'exit', short: 'Exit zone', action: 'Keep no fresh money here', hue: '#C9382C' },
]

const zoneOf = (score) => {
  let hit = ZONES[0]
  for (const zone of ZONES) if (score >= zone.min) hit = zone
  return hit
}

const percentile = (sorted, value) => {
  if (value == null) return null
  let lo = 0
  let hi = sorted.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (sorted[mid] < value) lo = mid + 1
    else hi = mid
  }
  return sorted.length === 1 ? 0.5 : lo / (sorted.length - 1)
}

const trailing = (rows, i, months) =>
  i - months < 0 || rows[i].close == null || rows[i - months].close == null
    ? null
    : (Math.pow(rows[i].close / rows[i - months].close, 12 / months) - 1) * 100

const forward = (rows, i, months) =>
  i + months >= rows.length || rows[i].close == null || rows[i + months].close == null
    ? null
    : (Math.pow(rows[i + months].close / rows[i].close, 12 / months) - 1) * 100

function buildIndex(meta, source) {
  const all = source.rows
  const start = Math.max(0, all.findIndex((r) => r.m >= FROM))
  const window = all.slice(start).map((row, k) => {
    const i = start + k
    return {
      ...row,
      r1: trailing(all, i, 12),
      r3: trailing(all, i, 36),
      r5: trailing(all, i, 60),
      r10: trailing(all, i, 120),
      f1: forward(all, i, 12),
      f3: forward(all, i, 36),
      f5: forward(all, i, 60),
      f10: forward(all, i, 120),
    }
  })

  const column = (field) =>
    window.map((r) => r[field]).filter((v) => v != null).sort((a, b) => a - b)
  const cols = Object.fromEntries(
    ['pe', 'pb', 'dy', 'r1', 'r3', 'r5', 'r10'].map((f) => [f, column(f)]),
  )

  for (const row of window) {
    row.pPe = percentile(cols.pe, row.pe)
    row.pPb = percentile(cols.pb, row.pb)
    row.pDy = row.dy == null ? null : 1 - percentile(cols.dy, row.dy) // low yield reads expensive
    const returns = ['r1', 'r3', 'r5', 'r10']
      .map((f, i) => percentile(cols[[f][0]], row[f]))
      .filter((v) => v != null)
    row.pRet = returns.length ? returns.reduce((a, b) => a + b, 0) / returns.length : null
    const parts = [row.pPe, row.pPb, row.pDy, row.pRet]
    row.heat = parts.every((v) => v != null) ? parts.reduce((a, b) => a + b, 0) / 4 : null
  }

  return {
    ...meta,
    window,
    cols,
    dates: new Map(all.map((r) => [r.m, r.date])),
  }
}

const raw = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'data', 'score_raw_data.json'), 'utf8'),
)
const built = INDICES.map((meta) => buildIndex(meta, raw[meta.key]))

/* The freshest observation across every index. The month it falls in is still
   running, so that month's score is provisional. */
const asOf = Object.values(raw)
  .flatMap((idx) => idx.rows.map((r) => r.date))
  .filter(Boolean)
  .sort()
  .at(-1)

/* Calibration on Nifty 50 anchors (see scripts comment above). */
const nifty = built[0].window
const heatAt = (month) => nifty.find((r) => r.m === month).heat
const heatLow = heatAt('2009-03')
const heatHigh = heatAt('2008-01')
let best = null
for (let p = 1; p <= 6; p += 0.001) {
  const u1 = Math.pow(heatLow, p)
  const u2 = Math.pow(heatHigh, p)
  const B = (1250 - 163) / (u2 - u1)
  const A = 163 - B * u1
  const err = Math.abs(A + B * Math.pow(0.5, p) - 400)
  if (!best || err < best.err) best = { p, A, B, err }
}
const { p, A, B } = best
const scoreOf = (heat) => (heat == null ? null : A + B * Math.pow(heat, p))

const rows = {}
const indices = []
for (const idx of built) {
  const scored = idx.window
    .filter((r) => r.heat != null)
    .map((r) => {
      const score = scoreOf(r.heat)
      return [
        r.m, r.close, r.pe, r.pb, r.dy,
        r.r1, r.r3, r.r5, r.r10,
        Math.round(score), ZONES.indexOf(zoneOf(score)),
        r.f1, r.f3, r.f5, r.f10,
      ]
    })
  rows[idx.key] = scored
  const last = scored.at(-1)
  const lastDate = last ? idx.dates.get(last[0]) : null
  indices.push({
    key: idx.key,
    label: idx.label,
    family: idx.family,
    since: scored[0]?.[0] ?? null,
    months: scored.length,
    latest: last
      ? { month: last[0], close: last[1], pe: last[2], pb: last[3], dy: last[4],
          r1: last[5], r3: last[6], r5: last[7], r10: last[8],
          score: last[9], zone: last[10],
          date: lastDate, partial: last[0] === asOf.slice(0, 7) }
      : null,
    best: scored.length ? Math.min(...scored.map((r) => r[9])) : null,
    worst: scored.length ? Math.max(...scored.map((r) => r[9])) : null,
    peMonths: idx.cols.pe.length,
  })
}

const payload = {
  generated: new Date().toISOString().slice(0, 10),
  asOf,
  source: 'NSE Indices (niftyindices.com) daily P/E, P/B, dividend yield and daily close',
  calibration: {
    p: Number(p.toFixed(3)),
    A: Number(A.toFixed(1)),
    B: Number(B.toFixed(1)),
    anchorError: Number(best.err.toFixed(2)),
    anchors: { medianMonth: 400, '2009-03': 163, '2008-01': 1250 },
    formula: 'score = A + B x heat^p, heat = mean of P/E, P/B, (1 - dividend yield) and trailing-return percentiles',
  },
  zones: ZONES.map(({ min, key, short, action, hue }) => ({
    min: min === -1e9 ? null : min, key, short, action, hue,
  })),
  indices,
  rows,
}

const out = path.join(ROOT, 'src', 'data', 'scores.json')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify(payload), 'utf8')

console.log(`calibration  p=${payload.calibration.p}  A=${payload.calibration.A}  B=${payload.calibration.B}  (anchor err ${payload.calibration.anchorError})`)
for (const idx of indices) {
  const z = ZONES[idx.latest.zone]
  console.log(`  ${idx.label.padEnd(21)} ${String(idx.latest.score).padStart(4)}  ${z.short.padEnd(19)} since ${idx.since}  (${idx.months} months)`)
}
console.log(`written ${out} (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`)
