import { ShotFrame } from '../components/Diagrams.jsx'
import { SIZES } from '../lib/shots.js'

const KINDS = ['ews', 'ws', 'mws', 'ms', 'mcu', 'cu', 'ecu', 'ots', 'pov', 'two', 'ins']
const USE = {
  'Extreme Wide Shot': 'To show where we are, or how small a person is in a big place.',
  'Wide Shot': 'To show a whole person and their surroundings. Great for action and entrances.',
  'Medium Wide': 'To follow a person moving through a space while still seeing where they are.',
  'Medium Shot': 'For conversations and everyday moments. It is the "normal" shot.',
  'Medium Close-Up': 'To get a bit closer to someone without losing their body language.',
  'Close-Up': 'To show what a character is feeling. Use it for important moments.',
  'Extreme Close-Up': 'To make a tiny detail feel huge, like a trembling hand or a ticking clock.',
  'Over the Shoulder': 'For conversations. It connects the two people and keeps us in the scene.',
  POV: 'To put the audience in a character\'s shoes, so they see exactly what that person sees.',
  'Two Shot': 'To show how two people relate, like a couple sitting together.',
  Insert: 'To show an important object clearly, like a text message or a letter.',
}

export default function ShotSizeGuide() {
  return (
    <div className="tool">
      <p className="muted-text tool-intro">
        A shot size is how much of a person or place fits in the frame. Closer shots feel personal and emotional. Wider shots feel open and give context.
      </p>
      <div className="guide-grid">
        {SIZES.map((s, i) => (
          <article key={s.name} className="guide-card card">
            <div className="guide-pic">
              <ShotFrame kind={KINDS[i]} uid="guide" />
            </div>
            <div className="guide-body">
              <h3>
                {s.name} <span className="badge">{s.abbr}</span>
              </h3>
              <p>{s.hint}</p>
              <p className="guide-use">
                <strong>Use it:</strong> {USE[s.name]}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
