import { cheaperThan, monthLabel, monthLong, num, pct, signedPct } from '../lib/data.js'

function Ladder({ data, activeKey, onSelect, yMax }) {
  const sorted = [...data.indices]
    .filter((i) => i.latest)
    .sort((a, b) => b.latest.score - a.latest.score)
  const ticks = [0, 200, 400, 600, 800, yMax].filter(
    (v, i, arr) => v <= yMax && arr.indexOf(v) === i,
  )

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="headline text-[19px]">Six indices on one scale</h2>
        <p className="text-[12.5px] text-muted">
          sorted rich to cheap · month end {sorted[0] ? monthLabel(sorted[0].latest.month) : ''}
        </p>
      </div>

      <div className="relative mt-5">
        <div className="pointer-events-none absolute inset-x-3 top-0 bottom-0" aria-hidden="true">
          {ticks.map((t) => (
            <span
              key={t}
              className={`absolute inset-y-0 w-px ${t === 400 ? 'bg-line-strong' : 'bg-line'}`}
              style={{ left: `${(t / yMax) * 100}%` }}
            />
          ))}
        </div>

        <div className="relative h-4 text-[11px] text-muted" aria-hidden="true">
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute top-0 tnum"
              style={{
                left: `${(t / yMax) * 100}%`,
                transform: t === 0 ? 'none' : t === yMax ? 'translateX(-100%)' : 'translateX(-50%)',
              }}
            >
              {t}
            </span>
          ))}
        </div>

        <ul className="relative mt-1">
          {sorted.map((idx) => {
            const zone = data.zones[idx.latest.zone]
            const isActive = idx.key === activeKey
            return (
              <li key={idx.key}>
                <button
                  type="button"
                  onClick={() => onSelect(idx.key)}
                  aria-pressed={isActive}
                  className={`w-full rounded-[4px] border px-3 py-2 text-left transition-colors duration-150 ${
                    isActive
                      ? 'border-line-strong bg-raise'
                      : 'border-transparent hover:bg-raise'
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span
                      className={`text-[14px] ${isActive ? 'font-medium text-ink' : 'text-ink-soft'}`}
                    >
                      {idx.label}
                      <span className="ml-2 text-[11.5px] text-ink-soft">{idx.family}</span>
                    </span>
                    <span className="headline tnum text-[19px] leading-none">
                      {idx.latest.score}
                    </span>
                  </span>
                  <span className="relative mt-2 block h-[6px] overflow-hidden rounded-[2px] bg-raise">
                    <span
                      className="absolute inset-y-0 left-0 block"
                      style={{
                        width: `${Math.max(1, Math.min(100, (idx.latest.score / yMax) * 100))}%`,
                        background: zone.hue,
                      }}
                    />
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="mt-3 text-[12px] text-muted">
        Bar length is the score, colour is the zone. The hairline at 400 is the fairly valued
        boundary from the video.
      </p>
    </div>
  )
}

export default function Focal({ data, activeKey, onSelect, yMax }) {
  const active = data.indices.find((i) => i.key === activeKey) ?? data.indices[0]
  const rows = data.rows[active.key] ?? []
  const latest = active.latest

  if (!latest) {
    return (
      <section className="border-b border-line">
        <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
          <p className="text-[14px] text-ink-soft">
            {active.label} has no scored months yet. A month is scored only once P/E, P/B,
            dividend yield and at least one trailing return exist for it.
          </p>
        </div>
      </section>
    )
  }

  const zone = data.zones[latest.zone]
  const cheaper = cheaperThan(rows, latest.score)
  const valuation = [
    ['Close', num(latest.close)],
    ['P/E', num(latest.pe)],
    ['P/B', num(latest.pb)],
    ['Div yield', pct(latest.dy)],
  ]
  const returns = [
    ['1 year', signedPct(latest.r1)],
    ['3 years', signedPct(latest.r3)],
    ['5 years', signedPct(latest.r5)],
    ['10 years', signedPct(latest.r10)],
  ]

  return (
    <section className="border-b border-line">
      <div className="mx-auto grid max-w-[1280px] lg:grid-cols-12">
        <div className="border-b border-line px-4 py-8 sm:px-6 lg:col-span-5 lg:border-r lg:border-b-0">
          <p className="text-[13px] text-muted">
            {active.label} · {active.family} · {monthLong(latest.month)}
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-x-5 gap-y-3">
            <span className="headline tnum text-[clamp(4rem,13vw,7rem)] leading-[0.82]">
              {latest.score}
            </span>
            <span className="pb-1.5">
              <span className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-[2px]"
                  style={{ background: zone.hue }}
                  aria-hidden="true"
                />
                <span className="headline text-[21px] leading-none">{zone.short}</span>
              </span>
              <span className="mt-1 block text-[13.5px] text-ink-soft">{zone.action}</span>
            </span>
          </div>

          <p className="mt-4 max-w-[46ch] text-[13.5px] text-ink-soft">
            This score is cheaper than{' '}
            <span className="tnum text-ink">
              {cheaper == null ? '–' : `${Math.round(cheaper * 100)}%`}
            </span>{' '}
            of the {active.months} months scored since {monthLabel(active.since)} for this index.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-line pt-4 sm:grid-cols-4">
            {valuation.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11.5px] text-muted">{label}</dt>
                <dd className="tnum text-[15.5px]">{value}</dd>
              </div>
            ))}
          </dl>

          <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-line pt-4 sm:grid-cols-4">
            {returns.map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11.5px] text-muted">Trailing {label}</dt>
                <dd className="tnum text-[15.5px]">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="px-4 py-8 sm:px-6 lg:col-span-7">
          <Ladder data={data} activeKey={active.key} onSelect={onSelect} yMax={yMax} />
        </div>
      </div>
    </section>
  )
}
