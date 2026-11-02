import { useEffect, useState } from 'react'
import { ImagePlus, RotateCcw } from 'lucide-react'
import { ASPECTS } from '../lib/calc.js'
import { World, Figure } from '../components/Diagrams.jsx'

function Picture({ url, uid }) {
  if (url) return <img src={url} alt="Your picture" draggable={false} />
  return (
    <svg viewBox="-350 -100 900 506" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Sample scene: a person on a hill at sunset">
      <World id={`ar-${uid}`} />
      <Figure />
    </svg>
  )
}

// Shows how a picture is cropped when you change the shape of the frame
export default function AspectRatioTool() {
  const [pick, setPick] = useState('2.39:1')
  const [url, setUrl] = useState(null)
  useEffect(() => () => url && URL.revokeObjectURL(url), [url])

  const a = ASPECTS.find((x) => x.value === pick)
  const base = 16 / 9
  // bars that cover what the chosen shape would cut off from a 16:9 picture
  const letter = a.r > base ? (1 - base / a.r) / 2 : 0
  const pillar = a.r < base ? (1 - a.r / base) / 2 : 0

  return (
    <div className="tool">
      <p className="muted-text tool-intro">
        The aspect ratio is the shape of your picture. Pick one below to see how it frames the same scene. The dark bars show what gets cut off.
      </p>

      <div className="chips ar-picks" role="group" aria-label="Aspect ratio">
        {ASPECTS.map((x) => (
          <button key={x.value} className={'chip btn-chip' + (pick === x.value ? ' on' : '')} aria-pressed={pick === x.value} onClick={() => setPick(x.value)}>
            {x.name}
          </button>
        ))}
      </div>

      <div className="ar-stage">
        <div className="ar-canvas">
          <Picture url={url} uid="main" />
          <span className="ar-bar" style={{ top: 0, left: 0, right: 0, height: letter * 100 + '%' }} />
          <span className="ar-bar" style={{ bottom: 0, left: 0, right: 0, height: letter * 100 + '%' }} />
          <span className="ar-bar" style={{ top: 0, bottom: 0, left: 0, width: pillar * 100 + '%' }} />
          <span className="ar-bar" style={{ top: 0, bottom: 0, right: 0, width: pillar * 100 + '%' }} />
        </div>
        <div className="ar-side">
          <h2 className="card-title">{a.name}</h2>
          <p>{a.note}</p>
          <div className="ar-actions">
            <label className="btn btn-ghost btn-sm">
              <ImagePlus size={15} /> Try my own picture
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files[0]
                  e.target.value = ''
                  if (f) setUrl(URL.createObjectURL(f))
                }}
              />
            </label>
            {url && (
              <button className="btn btn-ghost btn-sm" onClick={() => setUrl(null)}>
                <RotateCcw size={15} /> Use the sample
              </button>
            )}
          </div>
          <p className="field-note">Your picture stays on your device. It is not uploaded.</p>
        </div>
      </div>

      <h3 className="tool-h">Side by side</h3>
      <div className="ar-row">
        {ASPECTS.map((x) => (
          <figure key={x.value} className={'ar-item' + (pick === x.value ? ' on' : '')}>
            <div className="ar-frame" style={{ aspectRatio: x.r }}>
              <Picture url={url} uid={x.value} />
            </div>
            <figcaption>{x.name}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
