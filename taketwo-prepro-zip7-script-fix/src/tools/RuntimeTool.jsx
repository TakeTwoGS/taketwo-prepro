import { useState } from 'react'
import { pagesFromRuntime, runtimeFromPages, fmtMinutes } from '../lib/calc.js'
import { scriptOf, useProjectList } from '../lib/projects.js'
import Hint from '../components/Hint.jsx'

export default function RuntimeTool() {
  const { projects } = useProjectList()
  const [mode, setMode] = useState('pages') // pages -> minutes, or minutes -> pages
  const [value, setValue] = useState(90)

  const mine = (projects || []).filter((p) => p.status === 'active' && scriptOf(p)?.stats?.pages)
  const out = mode === 'pages' ? runtimeFromPages(value) : pagesFromRuntime(value)

  return (
    <div className="tool">
      <p className="muted-text tool-intro">
        A screenplay page is about one minute of film. Use this to guess how long your film will run, or how many pages you need for a target length.{' '}
        <Hint text="This rule works because of how screenplays are formatted. Dialogue-heavy scenes can run a little shorter, and action scenes a little longer, so treat it as a rough guide." />
      </p>

      <div className="tool-grid">
        <section className="card pad tool-form">
          <div className="seg" role="group" aria-label="What do you know?">
            <button className={mode === 'pages' ? 'on' : ''} onClick={() => setMode('pages')}>
              I know the pages
            </button>
            <button className={mode === 'minutes' ? 'on' : ''} onClick={() => setMode('minutes')}>
              I know the length
            </button>
          </div>
          <div className="field">
            <label className="label" htmlFor="rt-value">
              {mode === 'pages' ? 'Script pages' : 'Film length in minutes'}
            </label>
            <input id="rt-value" className="input" type="number" min="0" step="0.5" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          {mode === 'pages' && mine.length > 0 && (
            <div className="field">
              <label className="label" htmlFor="rt-mine">
                Or use one of your scripts
              </label>
              <select id="rt-mine" className="input" value="" onChange={(e) => e.target.value && setValue(e.target.value)}>
                <option value="">Choose a script…</option>
                {mine.map((p) => (
                  <option key={p.id} value={scriptOf(p).stats.pages}>
                    {p.title} ({scriptOf(p).stats.pages} pages)
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        <section className="card pad tool-result" aria-live="polite">
          {out ? (
            mode === 'pages' ? (
              <>
                <p className="result-sentence">
                  About <strong>{fmtMinutes(out.minutes)}</strong> of film.
                </p>
                <p className="muted-text">
                  It could land anywhere from {fmtMinutes(out.low)} to {fmtMinutes(out.high)}, depending on pacing.
                </p>
              </>
            ) : (
              <>
                <p className="result-sentence">
                  You need about <strong>{Math.round(out.pages * 10) / 10} pages</strong>.
                </p>
                <p className="muted-text">
                  Somewhere between {Math.round(out.low)} and {Math.round(out.high)} pages would work, depending on pacing.
                </p>
              </>
            )
          ) : (
            <p className="muted-text">Enter a number to see the result.</p>
          )}
          <ul className="tips">
            <li>A 5 minute short is about 5 pages. A 10 minute short is about 10.</li>
            <li>Most festivals love short films under 15 minutes. Shorter is easier to finish.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
