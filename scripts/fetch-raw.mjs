/**
 * Downloads NSE Indices daily closes and daily P/E, P/B, dividend yield into
 * data/score_raw_data.json, keeping one row per month (its last trading day).
 *
 * Two undocumented-but-public endpoints on niftyindices.com, both POSTed by the
 * site's own Historical Data page:
 *   /BackPage/getHistoricaldatatabletoString   -> OHLC per day
 *   /BackPage/getpepbHistoricaldataDBtoString  -> P/E, P/B, DivYield per day
 *
 * Gotchas baked in here:
 *   - Dates must be `dd-Mon-yyyy` ("01-Oct-2026"). `01-10-2026` gets a 500.
 *   - The payload's `name` is the *trading* index name from
 *     https://liveindexsa.niftyindices.com/assets/json/IndexMapping.json,
 *     which is not always the display name: Smallcap 100 is "NIFTY SMLCAP 100".
 *   - The P/E-P/B database has gaps: it starts in 1999 for the large caps, 2005
 *     for Midcap 100, 2011 for Smallcap 100, 2016 for Midcap 150 / Smallcap 250.
 *     Months before that keep their close and stay unscoreable, by design.
 *
 * Usage:
 *   node scripts/fetch-raw.mjs           # refresh the last few months, merge
 *   node scripts/fetch-raw.mjs --full    # rebuild every index from 1990
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const RAW = path.join(ROOT, 'data', 'score_raw_data.json')
const BASE = 'https://www.niftyindices.com'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36'

const INDICES = [
  { key: 'nifty50', label: 'Nifty 50', family: 'Large cap', nse: 'Nifty 50' },
  { key: 'next50', label: 'Nifty Next 50', family: 'Large cap', nse: 'Nifty Next 50' },
  { key: 'mid100', label: 'Nifty Midcap 100', family: 'Mid cap', nse: 'NIFTY MIDCAP 100' },
  { key: 'mid150', label: 'Nifty Midcap 150', family: 'Mid cap', nse: 'NIFTY MIDCAP 150' },
  { key: 'sml100', label: 'Nifty Smallcap 100', family: 'Small cap', nse: 'NIFTY SMLCAP 100' },
  { key: 'sml250', label: 'Nifty Smallcap 250', family: 'Small cap', nse: 'NIFTY SMLCAP 250' },
]

const FULL = process.argv.includes('--full')
const REQUEST_GAP_MS = 700
const RETRIES = 3

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** "01-Oct-2026" */
const nseDate = (iso) => {
  const [y, m, d] = iso.split('-')
  return `${d}-${MONTHS[+m - 1]}-${y}`
}

const isoDate = (d) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`

/** "22 Oct 2026" -> "2026-10-22" (null when the cell is empty or "-"). */
function parseNseDate(text) {
  if (!text) return null
  const m = String(text).trim().match(/^(\d{1,2})[ -]([A-Za-z]{3,})[ -](\d{4})$/)
  if (!m) return null
  const month = MONTHS.findIndex((x) => x.toLowerCase() === m[2].slice(0, 3).toLowerCase())
  if (month < 0) return null
  return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

const number = (v) => {
  if (v == null) return null
  const s = String(v).trim().replace(/,/g, '')
  if (!s || s === '-' || s === 'N/A') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

async function post(route, nseName, startIso, endIso) {
  const cinfo = `{'name':'${nseName}','startDate':'${nseDate(startIso)}','endDate':'${nseDate(endIso)}','indexName':'${nseName}'}`
  for (let attempt = 1; attempt <= RETRIES; attempt++) {
    try {
      const res = await fetch(BASE + route, {
        method: 'POST',
        headers: {
          'content-type': 'application/json; charset=utf-8',
          accept: 'application/json, text/javascript, */*; q=0.01',
          'user-agent': UA,
          origin: BASE,
          referer: `${BASE}/reports/historical-data`,
          'x-requested-with': 'XMLHttpRequest',
        },
        body: JSON.stringify({ cinfo }),
      })
      const text = await res.text()
      let json
      try {
        json = JSON.parse(text)
      } catch {
        throw new Error(`non-JSON reply (${res.status}): ${text.slice(0, 120).replace(/\s+/g, ' ')}`)
      }
      const rows = json && json.d ? JSON.parse(json.d) : json
      if (!Array.isArray(rows)) throw new Error('unexpected payload shape')
      return rows
    } catch (err) {
      if (attempt === RETRIES) throw err
      await sleep(1500 * attempt)
    }
  }
  return []
}

/** Merge OHLC and valuation rows into one record per trading day. */
function joinDays(ohlc, valuation) {
  const days = new Map()
  for (const r of ohlc) {
    const date = parseNseDate(r.HistoricalDate)
    if (!date) continue
    const close = number(r.CLOSE)
    if (close == null) continue
    days.set(date, { date, close, pe: null, pb: null, dy: null })
  }
  for (const r of valuation) {
    const date = parseNseDate(r.DATE)
    if (!date) continue
    const day = days.get(date)
    if (!day) continue
    day.pe = number(r.pe)
    day.pb = number(r.pb)
    day.dy = number(r.divYield)
  }
  return [...days.values()].sort((a, b) => (a.date < b.date ? -1 : 1))
}

/** One row per calendar month: its last trading day, with that day's valuation. */
function monthEnds(days) {
  const out = []
  for (const day of days) {
    const m = day.date.slice(0, 7)
    const prev = out[out.length - 1]
    if (prev && prev.m === m) out[out.length - 1] = { m, ...day }
    else out.push({ m, ...day })
  }
  return out
}

const readJson = (file) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return {}
  }
}

const existing = readJson(RAW)
const today = isoDate(new Date())
const output = {}
const report = []

for (const idx of INDICES) {
  const before = existing[idx.key]?.rows ?? []
  const windowStart = FULL
    ? '1990-01-01'
    : before.length
      ? before[Math.max(0, before.length - 4)].date
      : '1990-01-01'

  process.stdout.write(`${idx.label.padEnd(21)} ${FULL ? 'full' : `from ${windowStart}`} … `)

  const [ohlc, valuation] = await Promise.all([
    post('/BackPage/getHistoricaldatatabletoString', idx.nse, windowStart, today),
    post('/BackPage/getpepbHistoricaldataDBtoString', idx.nse, windowStart, today),
  ])
  await sleep(REQUEST_GAP_MS)

  const fetched = monthEnds(joinDays(ohlc, valuation))
  if (!fetched.length) throw new Error(`${idx.label}: NSE returned no rows`)

  // Keep older months this run did not ask for; replace everything inside the window.
  const cutoff = fetched[0].m
  const kept = before.filter((r) => r.m < cutoff)
  const rows = [...kept, ...fetched]
  output[idx.key] = { label: idx.label, rows }

  const last = rows[rows.length - 1]
  report.push({
    key: idx.key,
    label: idx.label,
    rows: rows.length,
    fetched: fetched.length,
    latest: last,
  })
  console.log(
    `${String(fetched.length).padStart(4)} days → ${String(rows.length).padStart(4)} months, latest ${last.m} (${last.date})`,
  )
}

fs.writeFileSync(RAW, JSON.stringify(output), 'utf8')

const asOf = report
  .map((r) => r.latest.date)
  .sort()
  .at(-1)

console.log(`\nas of ${asOf}`)
for (const r of report) {
  const pe = r.latest.pe == null ? 'no P/E' : `P/E ${r.latest.pe}`
  console.log(`  ${r.label.padEnd(21)} ${String(r.latest.close).padStart(10)}  ${pe}`)
}
console.log(`written ${path.relative(ROOT, RAW)} (${(fs.statSync(RAW).size / 1024).toFixed(0)} KB)`)
