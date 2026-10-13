import { COL, monthLabel, num } from '../lib/data.js'

const REPO = 'https://github.com/sachin5678/vmfs-score'
const VIDEO = 'https://youtu.be/V2U4z-9wQ4k'
const NSE = 'https://www.niftyindices.com'

function scoreAt(rows, month) {
  const row = rows.find((r) => r[COL.month] === month)
  return row ? row[COL.score] : null
}

const STEPS = [
  'Take the official month-end P/E, P/B and dividend yield for the index, plus the month-end close.',
  'Turn each input into a percentile against that same index’s own scored history: high P/E reads expensive, high P/B reads expensive, low dividend yield reads expensive.',
  'Average the three valuation percentiles with the average of the available trailing 1/3/5/10-year return percentiles, so the four pillars carry equal weight.',
  'Map that heat number to the score with score = A + B × heat^p, where p, A and B are fixed by three reference points from the video.',
]

export default function Method({ data }) {
  const calib = data.calibration
  const nifty = data.rows.nifty50 ?? []
  const anchors = [
    { month: '2008-01', video: '1,200–1,300', note: 'the peak' },
    { month: '2009-03', video: '~160', note: 'the crisis low' },
    { month: '2020-03', video: 'under 200', note: 'the covid low' },
    { month: data.indices[0].latest?.month, video: 'under 200', note: 'the video’s current reading, held out of the fit' },
  ]

  return (
    <div className="max-w-[680px]">
      <h2 className="headline text-[19px]">How the score is built</h2>

      <ol className="mt-4 space-y-3 text-[14px] text-ink-soft">
        {STEPS.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span className="tnum shrink-0 text-ink">{i + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      <p className="mt-5 text-[14px] text-ink-soft">
        The constants are fitted once, on Nifty 50, and then reused unchanged for every other
        index:{' '}
        <span className="tnum text-ink">
          p = {calib.p}, A = {calib.A}, B = {calib.B}
        </span>
        . Anchor error on the fitted point is {calib.anchorError} points.
      </p>

      <div className="mt-5 overflow-x-auto rounded-[8px] border border-line bg-panel">
        <table className="w-full min-w-[480px] border-collapse text-[13.5px]">
          <caption className="border-b border-line px-4 py-2.5 text-left text-[12px] text-muted">
            Nifty 50 cross-check against the values quoted in the video
          </caption>
          <thead>
            <tr className="border-b border-line text-[12px] text-muted">
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                Month
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">
                Score here
              </th>
              <th scope="col" className="px-3 py-2.5 text-left font-medium">
                Video said
              </th>
              <th scope="col" className="px-4 py-2.5 text-left font-medium">
                What it was
              </th>
            </tr>
          </thead>
          <tbody>
            {anchors.map((anchor) => (
              <tr key={anchor.month} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 whitespace-nowrap">{monthLabel(anchor.month)}</td>
                <td className="px-3 py-2.5 text-right tnum">{num(scoreAt(nifty, anchor.month), 0)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap tnum">{anchor.video}</td>
                <td className="px-4 py-2.5 whitespace-nowrap text-muted">{anchor.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="headline mt-7 text-[17px]">Zone thresholds</h3>
      <p className="mt-2 text-[14px] text-ink-soft">
        Taken straight from the video, applied to every index:
      </p>
      <ul className="mt-3 space-y-1.5 text-[14px]">
        {data.zones.map((z) => (
          <li key={z.key} className="flex items-center gap-2.5">
            <span className="h-3 w-3 shrink-0 rounded-[2px]" style={{ background: z.hue }} aria-hidden="true" />
            <span className="tnum w-16 shrink-0 text-muted">
              {z.min == null ? '<100' : `${z.min}+`}
            </span>
            <span>{z.short}</span>
            <span className="text-muted">— {z.action}</span>
          </li>
        ))}
      </ul>

      <h3 className="headline mt-7 text-[17px]">What this leaves out</h3>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-[14px] text-ink-soft">
        <li>
          Market cap to GDP is the fifth input in the video’s own system and it is not here, so
          the score can drift from his numbers in periods where that input moved a lot (2022–23
          reads higher here than he quoted).
        </li>
        <li>
          P/E is blank for months where constituent earnings were negative. A month only joins
          the score once all four pillars have something to stand on.
        </li>
        <li>
          Trailing returns are CAGR, not point-to-point. Forward returns at the 5 and 10-year
          horizons only exist for older months, so recent months sit out of those columns.
        </li>
        <li>The score is a percentile read of this index against itself, not a price target.</li>
      </ul>

      <h3 className="headline mt-7 text-[17px]">Sources and refresh</h3>
      <p className="mt-2 text-[14px] text-ink-soft">
        P/E, P/B and dividend yield come from the official historical pages at{' '}
        <a href={NSE} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
          niftyindices.com
        </a>
        , along with daily close. The scoring rules come from{' '}
        <a href={VIDEO} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
          this video
        </a>
        . Dataset generated {data.generated}.
      </p>
      <pre className="mt-3 overflow-x-auto rounded-[8px] border border-line bg-panel px-4 py-3 text-[12.5px] text-ink-soft">
{`npm run fetch    # re-download raw NSE monthly data
npm run data     # recompute scores -> src/data/scores.json
npm run build    # production bundle in dist/`}
      </pre>
      <p className="mt-3 text-[13px] text-muted">
        Source code:{' '}
        <a href={REPO} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
          github.com/sachin5678/vmfs-score
        </a>
        . Nothing here is investment advice.
      </p>
    </div>
  )
}
