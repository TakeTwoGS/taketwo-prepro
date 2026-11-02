import { useMemo, useState } from 'react'
import { CARDS, CODECS, FRAME_RATES, RESOLUTIONS, bitrate, fmtMinutes, fmtSize, minutesOnCard, storage } from '../lib/calc.js'
import Hint from '../components/Hint.jsx'

export default function StorageTool() {
  const [resolution, setResolution] = useState('uhd')
  const [codec, setCodec] = useState('h264')
  const [fps, setFps] = useState(24)
  const [custom, setCustom] = useState(100)
  const [hours, setHours] = useState(2)
  const [minutes, setMinutes] = useState(0)
  const [copies, setCopies] = useState(2)

  const mbps = useMemo(() => bitrate({ codec, resolution, fps, customMbps: custom }), [codec, resolution, fps, custom])
  const s = useMemo(() => storage({ mbps, hours, minutes, copies }), [mbps, hours, minutes, copies])

  return (
    <div className="tool">
      <p className="muted-text tool-intro">
        Video files get big fast. Work out how much storage you need for a shoot, so you do not run out of space halfway through.{' '}
        <Hint text="Bitrate is how much data the camera records each second. Higher quality settings use a higher bitrate, so files are bigger." />
      </p>

      <div className="tool-grid">
        <section className="card pad tool-form">
          <div className="two-fields">
            <div className="field">
              <label className="label" htmlFor="st-res">
                Resolution
              </label>
              <select id="st-res" className="input" value={resolution} onChange={(e) => setResolution(e.target.value)}>
                {RESOLUTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="st-fps">
                Frame rate
              </label>
              <select id="st-fps" className="input" value={fps} onChange={(e) => setFps(Number(e.target.value))}>
                {FRAME_RATES.map((f) => (
                  <option key={f} value={f}>
                    {f} fps
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="st-codec">
              Recording format (codec) <Hint text="The codec is how the camera squeezes video into a file. H.264 makes small files. ProRes makes bigger files that are easier to edit and keep more quality." />
            </label>
            <select id="st-codec" className="input" value={codec} onChange={(e) => setCodec(e.target.value)}>
              {CODECS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {codec === 'custom' && (
            <div className="field">
              <label className="label" htmlFor="st-custom">
                Bitrate in megabits per second (Mbps)
              </label>
              <input id="st-custom" className="input" type="number" min="1" value={custom} onChange={(e) => setCustom(e.target.value)} />
              <p className="field-note">Look in your camera's menu or manual for the bitrate of the setting you use.</p>
            </div>
          )}
          <div className="field">
            <div className="label">How much will you record in total?</div>
            <div className="two-fields">
              <div className="input-suffix">
                <input className="input" type="number" min="0" aria-label="Hours" value={hours} onChange={(e) => setHours(e.target.value)} />
                <span>hours</span>
              </div>
              <div className="input-suffix">
                <input className="input" type="number" min="0" aria-label="Minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
                <span>minutes</span>
              </div>
            </div>
          </div>
          <div className="field">
            <label className="label" htmlFor="st-copies">
              Backup copies <Hint text="Footage is hard to replace. Most filmmakers keep at least two copies on different drives, and three for important shoots." />
            </label>
            <select id="st-copies" className="input" value={copies} onChange={(e) => setCopies(Number(e.target.value))}>
              <option value={1}>1 (no backup)</option>
              <option value={2}>2 copies</option>
              <option value={3}>3 copies</option>
            </select>
          </div>
        </section>

        <section className="card pad tool-result" aria-live="polite">
          <p className="result-sentence">
            You will need about <strong>{fmtSize(s.totalGb)}</strong> for the footage, and <strong>{fmtSize(s.withCopiesGb)}</strong> to keep {copies === 1 ? 'it' : `${copies} copies`} safe.
          </p>
          <dl className="result-grid">
            <div>
              <dt>Data rate</dt>
              <dd>{Math.round(mbps)} Mbps</dd>
            </div>
            <div>
              <dt>Per minute</dt>
              <dd>{fmtSize(s.gbPerMinute)}</dd>
            </div>
            <div>
              <dt>Per hour</dt>
              <dd>{fmtSize(s.gbPerHour)}</dd>
            </div>
            <div>
              <dt>Total recording</dt>
              <dd>{fmtMinutes(s.totalMinutes)}</dd>
            </div>
          </dl>
          <h3 className="tool-h">How long one card lasts</h3>
          <ul className="card-times">
            {CARDS.map((c) => (
              <li key={c}>
                <span>{c >= 1000 ? '1 TB' : `${c} GB`} card</span>
                <strong>{fmtMinutes(minutesOnCard(c, s.gbPerMinute))}</strong>
              </li>
            ))}
          </ul>
          <p className="field-note">
            These are estimates. Cameras vary, so use the bitrate from your camera's menu if you can (choose "My camera says"). Cards also hold a little less than the number on the label.
          </p>
        </section>
      </div>
    </div>
  )
}
