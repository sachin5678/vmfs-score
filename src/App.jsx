import { useEffect, useMemo, useState } from 'react'
import TopBar from './components/TopBar.jsx'
import Focal from './components/Focal.jsx'
import ScoreHistory from './components/ScoreHistory.jsx'
import Evidence from './components/Evidence.jsx'
import MonthlyTable from './components/MonthlyTable.jsx'
import Method from './components/Method.jsx'
import { COL } from './lib/data.js'

function Status({ error, onReload }) {
  return (
    <div className="mx-auto max-w-[680px] px-4 py-20 sm:px-6">
      <h1 className="headline text-[26px]">
        {error ? 'Score data could not be loaded' : 'Loading monthly score data'}
      </h1>
      <p className="mt-2 text-[14px] text-ink-soft">
        {error
          ? 'The data chunk failed to load, usually after a partial download. Reload the page, or rebuild locally with npm run data && npm run build.'
          : 'Reading the bundled dataset: six indices, month by month since 2004.'}
      </p>
      {error && (
        <button
          type="button"
          onClick={onReload}
          className="mt-5 rounded-[4px] border border-line px-3 py-1.5 text-[13px] transition-colors duration-150 hover:bg-raise"
        >
          Reload
        </button>
      )}
    </div>
  )
}

function Section({ id, children, divider = true }) {
  return (
    <section id={id} className={divider ? 'border-t border-line' : ''}>
      <div className="mx-auto max-w-[1280px] px-4 py-9 sm:px-6">{children}</div>
    </section>
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('vmfs-theme') ?? 'dark'
    } catch {
      return 'dark'
    }
  })
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem('vmfs-theme', theme)
    } catch {
      /* storage blocked: theme still applies for this session */
    }
  }, [theme])

  useEffect(() => {
    let alive = true
    import('./data/scores.json')
      .then((mod) => alive && setData(mod.default))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [])

  const [activeKey, setActiveKey] = useState('nifty50')

  const yMax = useMemo(() => {
    if (!data) return 2000
    let max = 0
    for (const rows of Object.values(data.rows)) {
      for (const row of rows) if (row[COL.score] > max) max = row[COL.score]
    }
    return Math.max(1600, Math.ceil(max / 200) * 200)
  }, [data])

  const xRange = useMemo(() => {
    if (!data) return ['2004-01', '2026-12']
    let min = '9999-99'
    let max = '0000-00'
    for (const rows of Object.values(data.rows)) {
      if (rows.length && rows[0][COL.month] < min) min = rows[0][COL.month]
      if (rows.length && rows[rows.length - 1][COL.month] > max) max = rows[rows.length - 1][COL.month]
    }
    return [min, max]
  }, [data])

  return (
    <div id="top" className="min-h-screen bg-page text-ink">
      <TopBar theme={theme} onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} />

      <main>
        {!data ? (
          <Status error={failed} onReload={() => window.location.reload()} />
        ) : (
          <>
            <Focal data={data} activeKey={activeKey} onSelect={setActiveKey} yMax={yMax} />

            <Section id="history" divider={false}>
              <ScoreHistory data={data} activeKey={activeKey} yMax={yMax} xRange={xRange} />
            </Section>

            <Section id="backtest">
              <Evidence data={data} activeKey={activeKey} />
            </Section>

            <Section id="monthly">
              <h2 className="headline text-[19px]">Month by month</h2>
              <p className="mt-1 max-w-[72ch] text-[13.5px] text-ink-soft">
                Every input and the score for {data.indices.find((i) => i.key === activeKey)?.label},
                in the order it was published.
              </p>
              <div className="mt-5">
                <MonthlyTable data={data} activeKey={activeKey} />
              </div>
            </Section>

            <Section id="method">
              <Method data={data} />
            </Section>
          </>
        )}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-[12.5px] text-muted sm:px-6">
          <span>
            Data: NSE indices (niftyindices.com), month-end. Rules from the VMFS valuation score
            video. Not investment advice.
          </span>
          <span className="tnum">{data ? `Dataset generated ${data.generated}` : ''}</span>
        </div>
      </footer>
    </div>
  )
}
