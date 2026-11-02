import { MoveDemo } from '../components/Diagrams.jsx'
import { MOVEMENTS } from '../lib/shots.js'

const TRY = {
  Static: 'Try it when you want the audience to focus on the people, or for a calm, steady feeling.',
  Pan: 'Try it to follow someone walking across the frame, or to reveal what is beside the character.',
  Tilt: 'Try it to show how tall something is, like looking up a building, or to reveal a person from their feet to their face.',
  Dolly: 'Try it to slowly pull us into an intense moment, or to move away from someone after bad news.',
  Truck: 'Try it to glide alongside a character or reveal a long row of things.',
  Pedestal: 'Try it for a rising or sinking feeling, like a character looking over a wall.',
  Zoom: 'Try it for a quick, dramatic punch-in. Used carefully, it feels retro or documentary-style.',
  Handheld: 'Try it for a raw, in-the-moment feeling, like an argument or a chase.',
  Tracking: 'Try it to follow someone through a space, like walking and talking down a hallway.',
  Crane: 'Try it for big, sweeping moments, like starting close on a person and rising to show the whole place.',
  Gimbal: 'Try it for smooth, floating shots that follow people without needing a track.',
}

export default function MovementGuide() {
  return (
    <div className="tool">
      <p className="muted-text tool-intro">
        Camera movement guides the audience's eye and adds feeling. Each example below moves the way the real camera would. Notice how things nearby move more than things far away.
      </p>
      <div className="guide-grid">
        {MOVEMENTS.map((m) => (
          <article key={m.name} className="guide-card card">
            <MoveDemo kind={m.name} />
            <div className="guide-body">
              <h3>{m.name}</h3>
              <p>{m.hint}</p>
              <p className="guide-use">{TRY[m.name]}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
