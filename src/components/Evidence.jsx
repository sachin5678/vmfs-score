import { claimStats, signedPct, zoneStats } from '../lib/data.js'

const HORIZONS = [
  ['1 year', 'f1'],
  ['3 years', 'f3'],
  ['5 years', 'f5'],
  ['10 years', 'f10'],
]

function Backtest({ data, activeKey }) {
  const rows = data.rows[activeKey] ?? []
  const stats = zoneStats(rows, data.zones)

  return (
    <div className="min-w-0 lg:col-span-7">
      <h2 className="headline text-[19px]">What did the months in each zone deliver afterwards?</h2>
      <p className="mt-1 max-w-[62ch] text-[13.5px] text-ink-soft">
        Median forward return from every month this index spent in each zone, measured as
        annualised growth. More months in a zone means the reading was held for longer.
      </p>

      {stats.length === 0 ? (
        <p className="mt-5 rounded-[4px] border border-line bg-panel px-4 py-6 text-[13.5px] text-ink-soft">
          No scored months yet for this index, so there is nothing to backtest.
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-[8px] border border-line bg-panel">
          <table className="w-full min-w-[540px] border-collapse text-[13.5px]">
            <caption className="sr-only">
              Median forward return after each month spent in each valuation zone
            </caption>
            <thead>
              <tr className="border-b border-line text-[12px] text-muted">
                <th scope="col" className="px-4 py-2.5 text-left font-medium">
                  Zone
                </th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">
                  Months
                </th>
                {HORIZONS.map(([label]) => (
                  <th key={label} scope="col" className="px-3 py-2.5 text-right font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map((stat) => (
                <tr key={stat.zone.key} className="border-b border-line last:border-0">
                  <th scope="row" className="px-4 py-2.5 text-left font-normal">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-[2px]"
                        style={{ background: stat.zone.hue }}
                        aria-hidden="true"
                      />
                      {stat.zone.short}
                    </span>
                  </th>
                  <td className="px-3 py-2.5 text-right tnum text-ink-soft">{stat.months}</td>
                  {HORIZONS.map(([label, key]) => (
                    <td key={label} className="px-3 py-2.5 text-right tnum">
                      {signedPct(stat[key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Claim({ data, activeKey }) {
  const rows = data.rows[activeKey] ?? []
  const claim = claimStats(rows)
  const active = data.indices.find((i) => i.key === activeKey)

  return (
    <div className="mt-8 min-w-0 rounded-[8px] border border-line bg-panel p-5 lg:col-span-5 lg:mt-0">
      <h3 className="headline text-[17px]">The rule from the video, re-tested here</h3>
      <p className="mt-2 text-[13.5px] text-ink-soft">
        The claim: when a month has P/E under 20 and a score under 200 at the same time,
        forward returns stay in double digits. On{' '}
        <span className="text-ink">{active ? active.label : 'this index'}</span> that
        condition held in <span className="tnum text-ink">{claim.months}</span> month
        {claim.months === 1 ? '' : 's'}
        {claim.months ? ` (${claim.first} to ${claim.last})` : ''}.
      </p>

      {claim.months === 0 ? (
        <p className="mt-4 rounded-[4px] border border-line px-3 py-4 text-[13px] text-muted">
          No month here has met both conditions at once, so the claim cannot be tested on this
          index. Try Nifty 50 or Nifty Next 50.
        </p>
      ) : (
        <table className="mt-4 w-full border-collapse text-[13.5px]">
          <caption className="sr-only">
            Worst and median forward returns after months with P/E under 20 and score under 200
          </caption>
          <thead>
            <tr className="border-b border-line text-[12px] text-muted">
              <th scope="col" className="py-2 text-left font-medium">
                Horizon
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Worst
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Median
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Best
              </th>
            </tr>
          </thead>
          <tbody>
            {HORIZONS.map(([label, key]) => {
              const stat = claim[key]
              return (
                <tr key={label} className="border-b border-line last:border-0">
                  <th scope="row" className="py-2 text-left font-normal">
                    {label}
                  </th>
                  <td className="py-2 text-right tnum">
                    {stat ? signedPct(stat.worst) : '–'}
                  </td>
                  <td className="py-2 text-right tnum">{stat ? signedPct(stat.median) : '–'}</td>
                  <td className="py-2 text-right tnum">{stat ? signedPct(stat.best) : '–'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {claim.f5 && claim.f5.n < 6 ? (
        <p className="mt-3 text-[12.5px] text-muted">
          Only {claim.f5.n} of those months have a full 5-year forward window yet, so the
          long-horizon figures rest on thin evidence.
        </p>
      ) : null}

      {claim.months > 0 && claim.f5 && claim.f10 ? (
        <p className="mt-3 border-t border-line pt-3 text-[13px] text-ink-soft">
          Verdict on this index:{' '}
          {claim.f5.worst >= 10 && claim.f10.worst >= 10 ? (
            <>
              the claim holds at 5 and 10 years, with worst outcomes of{' '}
              <span className="tnum text-ink">{signedPct(claim.f5.worst)}</span> and{' '}
              <span className="tnum text-ink">{signedPct(claim.f10.worst)}</span>. At 1 year it
              still drops to <span className="tnum text-ink">{signedPct(claim.f1.worst)}</span>,
              so this is a long-horizon claim, not a one-year one.
            </>
          ) : (
            <>
              the claim fails here. The worst 5-year outcome after such a month was{' '}
              <span className="tnum text-ink">{signedPct(claim.f5.worst)}</span> and the worst
              10-year outcome was{' '}
              <span className="tnum text-ink">{signedPct(claim.f10.worst)}</span>.
            </>
          )}
        </p>
      ) : null}
    </div>
  )
}

export default function Evidence({ data, activeKey }) {
  return (
    <div className="grid gap-y-8 lg:grid-cols-12 lg:gap-x-8">
      <Backtest data={data} activeKey={activeKey} />
      <Claim data={data} activeKey={activeKey} />
    </div>
  )
}
