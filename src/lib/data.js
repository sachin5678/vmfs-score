/** Column map for a score row (see scripts/build-data.mjs). */
export const COL = {
  month: 0,
  close: 1,
  pe: 2,
  pb: 3,
  dy: 4,
  r1: 5,
  r3: 6,
  r5: 7,
  r10: 8,
  score: 9,
  zone: 10,
  f1: 11,
  f3: 12,
  f5: 13,
  f10: 14,
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

export const monthLabel = (m) => `${MONTHS[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`
export const monthLong = (m) => `${MONTHS_LONG[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`
export const yearOf = (m) => +m.slice(0, 4)

export function num(v, digits = 2) {
  if (!isNum(v)) return '–'
  return v.toLocaleString('en-IN', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function signedPct(v, digits = 1) {
  if (!isNum(v)) return '–'
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}%`
}

export function pct(v, digits = 2) {
  if (!isNum(v)) return '–'
  return `${v.toFixed(digits)}%`
}

export function median(values) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** Forward-return medians for every month spent in each zone. */
export function zoneStats(rows, zones) {
  const groups = new Map()
  for (const row of rows) {
    const zi = row[COL.zone]
    if (zi == null) continue
    if (!groups.has(zi)) groups.set(zi, [])
    groups.get(zi).push(row)
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([zi, rs]) => ({
      zone: zones[zi],
      months: rs.length,
      f1: median(rs.map((r) => r[COL.f1]).filter(isNum)),
      f3: median(rs.map((r) => r[COL.f3]).filter(isNum)),
      f5: median(rs.map((r) => r[COL.f5]).filter(isNum)),
      f10: median(rs.map((r) => r[COL.f10]).filter(isNum)),
    }))
}

/** The video's rule re-tested on this index: P/E under 20 and score under 200. */
export function claimStats(rows) {
  const hit = rows.filter(
    (r) => isNum(r[COL.pe]) && r[COL.pe] < 20 && isNum(r[COL.score]) && r[COL.score] < 200,
  )
  const stat = (col) => {
    const v = hit.map((r) => r[col]).filter(isNum)
    if (!v.length) return null
    return { n: v.length, worst: Math.min(...v), median: median(v), best: Math.max(...v) }
  }
  return {
    months: hit.length,
    first: hit.length ? monthLabel(hit[0][COL.month]) : null,
    last: hit.length ? monthLabel(hit[hit.length - 1][COL.month]) : null,
    f1: stat(COL.f1),
    f3: stat(COL.f3),
    f5: stat(COL.f5),
    f10: stat(COL.f10),
  }
}

/** How many months in history this score is cheaper than. */
export function cheaperThan(rows, score) {
  const scores = rows.map((r) => r[COL.score]).filter(isNum)
  if (!scores.length || !isNum(score)) return null
  return scores.filter((s) => s > score).length / scores.length
}

export function toCsv(indexLabel, rows, zones) {
  const header = [
    'Month', 'Close', 'P/E', 'P/B', 'Dividend yield %',
    'Trailing 1y %', 'Trailing 3y %', 'Trailing 5y %', 'Trailing 10y %',
    'Score', 'Zone', 'Forward 1y %', 'Forward 3y %', 'Forward 5y %', 'Forward 10y %',
  ]
  const cell = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const round = (v, digits) => (isNum(v) ? Number(v.toFixed(digits)) : v)
  const lines = [header.join(',')]
  for (const r of rows) {
    lines.push([
      r[COL.month], round(r[COL.close], 2), round(r[COL.pe], 2), round(r[COL.pb], 2), round(r[COL.dy], 2),
      round(r[COL.r1], 2), round(r[COL.r3], 2), round(r[COL.r5], 2), round(r[COL.r10], 2),
      r[COL.score], zones[r[COL.zone]]?.short ?? '',
      round(r[COL.f1], 2), round(r[COL.f3], 2), round(r[COL.f5], 2), round(r[COL.f10], 2),
    ].map(cell).join(','))
  }
  return { csv: lines.join('\n'), name: `vmfs-score-${indexLabel.toLowerCase().replace(/\s+/g, '-')}.csv` }
}
