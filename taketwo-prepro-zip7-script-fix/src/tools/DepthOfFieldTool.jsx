import { useMemo, useState } from 'react'
import { APERTURES, SENSORS, depthOfField, fmtDistance, mmFrom } from '../lib/calc.js'
import Hint from '../components/Hint.jsx'

export default function DepthOfFieldTool() {
  const [sensor, setSensor] = useState('ff')
  const [focal, setFocal] = useState(50)
  const [aperture, setAperture] = useState(2.8)
  const [unit, setUnit] = useState('m')
  const [dist, setDist] = useState(3)

  const coc = SENSORS.find((s) => s.value === sensor).coc
  const r = useMemo(() => depthOfField({ focal, aperture, distance: mmFrom(Number(dist), unit), coc }), [focal, aperture, dist, unit, coc])
  const s = mmFrom(Number(dist) || 0, unit)

  // the little strip: where "sharp" begins and ends around your subject
  const span = r ? (r.far === Infinity ? s * 3 : Math.max(r.far * 1.5, s * 1.4)) : 1
  const pct = (mm) => Math.min(100, Math.max(0, (mm / span) * 100))

  return (
    <div className="tool">
      <p className="muted-text tool-intro">
        Depth of field is how much of the picture, front to back, looks sharp. Enter your camera settings to see where sharp starts and stops.{' '}
        <Hint text="A shallow depth of field blurs the background and puts focus on your subject. A deep one keeps almost everything sharp." />
      </p>

      <div className="tool-grid">
        <section className="card pad tool-form">
          <div className="field">
            <label className="label" htmlFor="dof-sensor">
              Camera or sensor size <Hint text="Bigger sensors blur backgrounds more. If you are not sure, a phone or camera's spec sheet will say." />
            </label>
            <select id="dof-sensor" className="input" value={sensor} onChange={(e) => setSensor(e.target.value)}>
              {SENSORS.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </div>
          <div className="two-fields">
            <div className="field">
              <label className="label" htmlFor="dof-focal">
                Lens (mm) <Hint text="The focal length written on the lens, like 24, 35, 50, or 85. Bigger numbers are more zoomed in." />
              </label>
              <input id="dof-focal" className="input" type="number" min="4" max="600" value={focal} onChange={(e) => setFocal(e.target.value)} />
            </div>
            <div className="field">
              <label className="label" htmlFor="dof-ap">
                Aperture (f-stop) <Hint text="A small number like f/1.8 lets in lots of light and blurs the background. A big number like f/11 keeps more in focus." />
              </label>
              <select id="dof-ap" className="input" value={aperture} onChange={(e) => setAperture(Number(e.target.value))}>
                {APERTURES.map((a) => (
                  <option key={a} value={a}>
                    f/{a}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="dof-dist">
              Distance to your subject
            </label>
            <div className="unit-row">
              <input id="dof-dist" className="input" type="number" min="0.1" step="0.1" value={dist} onChange={(e) => setDist(e.target.value)} />
              <div className="seg" role="group" aria-label="Units">
                <button className={unit === 'm' ? 'on' : ''} onClick={() => setUnit('m')}>
                  Meters
                </button>
                <button className={unit === 'ft' ? 'on' : ''} onClick={() => setUnit('ft')}>
                  Feet
                </button>
              </div>
            </div>
          </div>
          <div className="chips">
            {[24, 35, 50, 85, 135].map((f) => (
              <button key={f} className={'chip btn-chip' + (Number(focal) === f ? ' on' : '')} onClick={() => setFocal(f)}>
                {f}mm
              </button>
            ))}
          </div>
        </section>

        <section className="card pad tool-result" aria-live="polite">
          {r ? (
            <>
              <p className="result-sentence">
                {r.far === Infinity ? (
                  <>
                    Everything from <strong>{fmtDistance(r.near, unit)}</strong> all the way to the horizon will look sharp.
                  </>
                ) : (
                  <>
                    Everything from <strong>{fmtDistance(r.near, unit)}</strong> to <strong>{fmtDistance(r.far, unit)}</strong> will look sharp.
                  </>
                )}
              </p>
              <div className="dof-strip" aria-hidden="true">
                <span className="dof-zone" style={{ left: pct(r.near) + '%', width: pct(r.far === Infinity ? span : r.far) - pct(r.near) + '%' }} />
                <span className="dof-subject" style={{ left: pct(s) + '%' }} />
                <span className="dof-cam">Camera</span>
              </div>
              <dl className="result-grid">
                <div>
                  <dt>Sharp starts at</dt>
                  <dd>{fmtDistance(r.near, unit)}</dd>
                </div>
                <div>
                  <dt>Sharp ends at</dt>
                  <dd>{fmtDistance(r.far, unit)}</dd>
                </div>
                <div>
                  <dt>Total sharp zone</dt>
                  <dd>{fmtDistance(r.total, unit)}</dd>
                </div>
                <div>
                  <dt>
                    Hyperfocal distance <Hint text="Focus at this distance and everything from half of it to infinity looks acceptably sharp. Handy for landscapes." />
                  </dt>
                  <dd>{fmtDistance(r.hyperfocal, unit)}</dd>
                </div>
              </dl>
              <ul className="tips">
                <li>For a blurrier background: use a lower f-number, a longer lens, or get closer to your subject.</li>
                <li>For more in focus: use a higher f-number, a wider lens, or step back.</li>
              </ul>
              <p className="field-note">This is an estimate based on a standard formula. Real lenses vary a little, so check your shot on a monitor.</p>
            </>
          ) : (
            <p className="muted-text">Fill in all four boxes to see the result.</p>
          )}
        </section>
      </div>
    </div>
  )
}
