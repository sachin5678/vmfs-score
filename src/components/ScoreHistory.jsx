import { useEffect, useRef, useState } from 'react'
import { COL, monthLabel, num } from '../lib/data.js'

function useWidth() {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.getBoundingClientRect().width)
    const observer = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, width]
}

export default function ScoreHistory({ data, activeKey, yMax, xRange }) {
  const rows = data.rows[activeKey] ?? []
  const active = data.indices.find((i) => i.key === activeKey)
  const [wrapRef, width] = useWidth()
  const svgRef = useRef(null)
  const [cursor, setCursor] = useState(null)

  const narrow = width > 0 && width < 640
  const pad = { t: 16, r: 16, b: 26, l: 44 }
  const height = narrow ? 240 : 340
  const innerW = Math.max(10, width - pad.l - pad.r)
  const innerH = height - pad.t - pad.b
  const t0 = Date.parse(`${xRange[0]}-01`)
  const t1 = Date.parse(`${xRange[1]}-01`)

  const x = (month) => pad.l + ((Date.parse(`${month}-01`) - t0) / (t1 - t0)) * innerW
  const y = (score) => pad.t + innerH - (Math.max(0, Math.min(yMax, score)) / yMax) * innerH

  const bounds = data.zones.map((z) => z.min ?? 0)
  const bands = data.zones.map((z, i) => ({
    key: z.key,
    hue: z.hue,
    from: bounds[i],
    to: i + 1 < bounds.length ? bounds[i + 1] : yMax,
  }))

  const yStep = narrow ? 400 : 200
  const yTicks = []
  for (let v = 0; v <= yMax; v += yStep) yTicks.push(v)

  const xStep = narrow ? 5 : 2
  const xTicks = []
  for (let year = Math.ceil(+xRange[0].slice(0, 4) / xStep) * xStep; year <= +xRange[1].slice(0, 4); year += xStep) {
    const month = `${year}-01`
    if (month >= xRange[0] && month <= xRange[1]) xTicks.push(month)
  }

  const path = rows.length
    ? rows.map((r, i) => `${i ? 'L' : 'M'}${x(r[COL.month]).toFixed(1)},${y(r[COL.score]).toFixed(1)}`).join('')
    : ''
  const last = rows.length ? rows[rows.length - 1] : null

  const pickIndex = (clientX) => {
    const svg = svgRef.current
    if (!svg || !rows.length) return
    const rect = svg.getBoundingClientRect()
    const px = clientX - rect.left
    const time = t0 + ((px - pad.l) / innerW) * (t1 - t0)
    let best = 0
    let bestDistance = Infinity
    rows.forEach((row, i) => {
      const d = Math.abs(Date.parse(`${row[COL.month]}-01`) - time)
      if (d < bestDistance) {
        bestDistance = d
        best = i
      }
    })
    setCursor(best)
  }

  const onKeyDown = (event) => {
    if (!rows.length) return
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape']
    if (!keys.includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Escape') return setCursor(null)
    if (event.key === 'Home') return setCursor(0)
    if (event.key === 'End') return setCursor(rows.length - 1)
    const step = event.key === 'ArrowRight' ? 1 : -1
    setCursor((prev) => {
      const base = prev == null ? rows.length - 1 : prev
      return Math.max(0, Math.min(rows.length - 1, base + step))
    })
  }

  const cursorRow = cursor != null ? rows[cursor] : null
  const cursorX = cursorRow ? x(cursorRow[COL.month]) : 0
  const cursorY = cursorRow ? y(cursorRow[COL.score]) : 0

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="headline text-[19px]">
          Where has {active ? active.label : 'this index'} sat on the valuation scale?
        </h2>
        <p className="text-[12.5px] text-muted">
          {rows.length ? `${monthLabel(rows[0][COL.month])} to ${monthLabel(last[COL.month])}` : ''}
          <span className="ml-2 hidden sm:inline">hover or focus the line, then use arrow keys</span>
        </p>
      </div>

      <div ref={wrapRef} className="relative mt-4">
        {width > 0 && (
          <svg
            ref={svgRef}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            tabIndex={0}
            aria-label={`${active ? active.label : 'Index'} valuation score history from ${rows.length ? monthLabel(rows[0][COL.month]) : ''} to ${rows.length ? monthLabel(last[COL.month]) : ''}`}
            className="block cursor-crosshair rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-ink"
            onPointerMove={(e) => pickIndex(e.clientX)}
            onPointerLeave={() => setCursor(null)}
            onFocus={() => setCursor((c) => (c == null && rows.length ? rows.length - 1 : c))}
            onBlur={() => setCursor(null)}
            onKeyDown={onKeyDown}
          >
            {bands
              .filter((b) => b.from < yMax && b.to > b.from)
              .map((b) => (
                <rect
                  key={b.key}
                  x={pad.l}
                  y={y(Math.min(b.to, yMax))}
                  width={innerW}
                  height={Math.max(0, y(Math.max(b.from, 0)) - y(Math.min(b.to, yMax)))}
                  fill={b.hue}
                  opacity={0.17}
                />
              ))}

            {yTicks.map((v) => (
              <g key={v}>
                <line
                  x1={pad.l}
                  x2={width - pad.r}
                  y1={y(v)}
                  y2={y(v)}
                  stroke="currentColor"
                  className="text-line"
                  strokeWidth={v === 400 ? 1.4 : 1}
                  strokeDasharray={v === 400 ? '5 4' : undefined}
                />
                <text x={pad.l - 8} y={y(v) + 3.5} textAnchor="end" fontSize={11} className="fill-muted">
                  {v}
                </text>
              </g>
            ))}

            {xTicks.map((m) => (
              <text
                key={m}
                x={x(m)}
                y={height - 8}
                textAnchor="middle"
                fontSize={11}
                className="fill-muted"
              >
                {m.slice(0, 4)}
              </text>
            ))}

            <path d={path} fill="none" stroke="currentColor" className="text-ink" strokeWidth={1.8} strokeLinejoin="round" />

            {cursorRow && (
              <g>
                <line
                  x1={cursorX}
                  x2={cursorX}
                  y1={pad.t}
                  y2={height - pad.b}
                  stroke="currentColor"
                  className="text-line-strong"
                  strokeWidth={1}
                />
                <circle cx={cursorX} cy={cursorY} r={4} className="fill-ink" />
              </g>
            )}

            {last && (
              <g>
                <circle cx={x(last[COL.month])} cy={y(last[COL.score])} r={4} className="fill-ink" />
                <text
                  x={x(last[COL.month]) - 8}
                  y={y(last[COL.score]) - 8}
                  textAnchor="end"
                  fontSize={12}
                  fontWeight={600}
                  className="fill-ink"
                >
                  {last[COL.score]}
                </text>
              </g>
            )}

            <rect
              x={pad.l}
              y={pad.t}
              width={innerW}
              height={innerH}
              fill="none"
              stroke="currentColor"
              className="text-line"
            />
          </svg>
        )}

        {cursorRow && (
          <div
            className="pointer-events-none absolute z-10 w-[168px] rounded-[4px] border border-line bg-panel px-2.5 py-2 text-[12px] shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
            style={{
              left: Math.min(Math.max(cursorX - 84, 0), Math.max(0, width - 168)),
              top: Math.max(0, cursorY - 12),
              transform: 'translateY(-100%)',
            }}
          >
            <div className="text-muted">{monthLabel(cursorRow[COL.month])}</div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="headline tnum text-[18px] leading-tight">{cursorRow[COL.score]}</span>
              <span
                className="text-[11.5px]"
                style={{ color: data.zones[cursorRow[COL.zone]].hue }}
              >
                {data.zones[cursorRow[COL.zone]].short}
              </span>
            </div>
            <div className="mt-1 flex justify-between text-ink-soft tnum">
              <span>P/E</span>
              <span>{num(cursorRow[COL.pe])}</span>
            </div>
            <div className="flex justify-between text-ink-soft tnum">
              <span>Div yield</span>
              <span>{cursorRow[COL.dy] == null ? '–' : `${cursorRow[COL.dy].toFixed(2)}%`}</span>
            </div>
          </div>
        )}
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-soft">
        {data.zones.map((z, i) => (
          <li key={z.key} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[2px]" style={{ background: z.hue }} aria-hidden="true" />
            {z.short}
            <span className="tnum text-muted">{z.min == null ? '<100' : `${z.min}+`}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
