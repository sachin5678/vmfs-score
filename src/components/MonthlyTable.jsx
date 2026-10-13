import { useMemo, useState } from 'react'
import { COL, monthLabel, num, pct, signedPct, toCsv, yearOf } from '../lib/data.js'

const COLUMNS = [
  { key: 'month', label: 'Month', align: 'left' },
  { key: 'close', label: 'Close', align: 'right' },
  { key: 'pe', label: 'P/E', align: 'right' },
  { key: 'pb', label: 'P/B', align: 'right' },
  { key: 'dy', label: 'Yld', align: 'right' },
  { key: 'r1', label: 'Trail 1y', align: 'right' },
  { key: 'r3', label: 'Trail 3y', align: 'right' },
  { key: 'r5', label: 'Trail 5y', align: 'right' },
  { key: 'r10', label: 'Trail 10y', align: 'right' },
  { key: 'score', label: 'Score', align: 'right' },
  { key: 'zone', label: 'Zone', align: 'left' },
  { key: 'f1', label: 'Fwd 1y', align: 'right' },
  { key: 'f3', label: 'Fwd 3y', align: 'right' },
  { key: 'f5', label: 'Fwd 5y', align: 'right' },
  { key: 'f10', label: 'Fwd 10y', align: 'right' },
]

function cell(row, key) {
  switch (key) {
    case 'month':
      return monthLabel(row[COL.month])
    case 'close':
      return num(row[COL.close], 0)
    case 'pe':
      return num(row[COL.pe])
    case 'pb':
      return num(row[COL.pb])
    case 'dy':
      return pct(row[COL.dy])
    case 'score':
      return row[COL.score]
    case 'zone':
      return null
    default:
      return signedPct(row[COL[key]])
  }
}

export default function MonthlyTable({ data, activeKey }) {
  const [zoneKey, setZoneKey] = useState('all')
  const [done, setDone] = useState(false)
  const rows = data.rows[activeKey] ?? []
  const active = data.indices.find((i) => i.key === activeKey)

  const filtered = useMemo(() => {
    if (zoneKey === 'all') return rows
    return rows.filter((row) => data.zones[row[COL.zone]]?.key === zoneKey)
  }, [rows, zoneKey, data.zones])

  const download = () => {
    const { csv, name } = toCsv(active.label, filtered, data.zones)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = name
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setDone(true)
    window.setTimeout(() => setDone(false), 2500)
  }

  const emptyZone = zoneKey !== 'all' && filtered.length === 0

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <label className="flex items-center gap-2 text-[13px] text-ink-soft">
          Zone
          <select
            value={zoneKey}
            onChange={(e) => setZoneKey(e.target.value)}
            className="rounded-[4px] border border-line bg-panel px-2 py-1.5 text-[13px] text-ink"
          >
            <option value="all">All zones</option>
            {data.zones.map((z) => (
              <option key={z.key} value={z.key}>
                {z.short}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={download}
          disabled={!filtered.length}
          aria-live="polite"
          className="rounded-[4px] border border-line px-3 py-1.5 text-[13px] transition-colors duration-150 hover:bg-raise disabled:cursor-not-allowed disabled:opacity-50"
        >
          {done ? 'Downloaded' : 'Download CSV'}
        </button>

        <p className="text-[13px] text-muted tnum">
          Showing {filtered.length} of {rows.length} months
          {rows.length
            ? ` (${monthLabel(rows[0][COL.month])} to ${monthLabel(rows[rows.length - 1][COL.month])})`
            : ''}
        </p>
      </div>

      <p className="mt-3 max-w-[72ch] text-[13px] text-ink-soft">
        Trailing returns look back from that month, forward returns look ahead from it. Filled
        cells show the latest published month, which is still partial.
      </p>

      {emptyZone ? (
        <div className="mt-5 rounded-[8px] border border-line bg-panel px-5 py-8 text-center">
          <p className="text-[14px]">
            No month of {active.label} has landed in this zone yet.
          </p>
          <p className="mt-1 text-[13px] text-muted">
            The score only starts where P/E, P/B, dividend yield and at least one trailing return
            all exist.
          </p>
          <button
            type="button"
            onClick={() => setZoneKey('all')}
            className="mt-4 rounded-[4px] border border-line px-3 py-1.5 text-[13px] transition-colors duration-150 hover:bg-raise"
          >
            Show all months
          </button>
        </div>
      ) : (
        <div
          className="mt-5 max-h-[70vh] overflow-auto rounded-[8px] border border-line bg-panel"
          tabIndex={0}
          aria-label={`Monthly score table for ${active.label}, scrollable`}
        >
          <table className="w-full min-w-[980px] border-collapse text-[13px]">
            <caption className="sr-only">
              Month-end inputs, score, zone and forward returns for {active.label}
            </caption>
            <thead className="sticky top-0 z-10 bg-panel">
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    scope="col"
                    className={`border-b border-line px-3 py-2.5 font-medium text-[12px] text-muted whitespace-nowrap ${
                      col.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, i) => {
                const newYear = i === 0 || yearOf(row[COL.month]) !== yearOf(filtered[i - 1][COL.month])
                const isLatest = i === filtered.length - 1 && zoneKey === 'all'
                const zone = data.zones[row[COL.zone]]
                return (
                  <tr
                    key={row[COL.month]}
                    className={`border-line transition-colors duration-150 hover:bg-raise ${
                      newYear && i > 0 ? 'border-t-2' : 'border-t'
                    } ${isLatest ? 'bg-raise/60' : ''}`}
                  >
                    {COLUMNS.map((col) => {
                      if (col.key === 'zone') {
                        return (
                          <td key={col.key} className="px-3 py-1.5 whitespace-nowrap">
                            <span className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                                style={{ background: zone.hue }}
                                aria-hidden="true"
                              />
                              {zone.short}
                            </span>
                          </td>
                        )
                      }
                      const value = cell(row, col.key)
                      const muted = value === '–'
                      return (
                        <td
                          key={col.key}
                          className={`px-3 py-1.5 tnum whitespace-nowrap ${
                            col.align === 'right' ? 'text-right' : 'text-left'
                          } ${muted ? 'text-muted' : ''} ${
                            col.key === 'score' ? 'font-medium' : ''
                          }`}
                        >
                          {value}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
              {!filtered.length && (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-6 text-center text-muted">
                    No months match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
