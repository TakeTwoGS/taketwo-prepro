import { AngleDiagram, ContinuityDemo, Rule180, ShotFrame, StoryboardSketch } from './Diagrams.jsx'

function ScreenplayDemo() {
  const rows = [
    ['Scene heading', 'scene', 'INT. APARTMENT - NIGHT'],
    ['Action', 'action', 'Rain taps the window. CHARLES (30s) drops his keys in a bowl.'],
    ['Character', 'char', 'CHARLES'],
    ['Parenthetical', 'paren', '(whispering)'],
    ['Dialogue', 'dia', 'Maya? Are you here?'],
    ['Transition', 'trans', 'CUT TO:'],
  ]
  return (
    <div className="fmt-demo" role="img" aria-label="An example screenplay with each kind of line labeled">
      {rows.map(([label, kind, text]) => (
        <div key={label} className={'fmt-row ' + kind}>
          <span className="fmt-tag">{label}</span>
          <span className="fmt-text">{text}</span>
        </div>
      ))}
    </div>
  )
}

function ShotListMock() {
  const rows = [
    ['1A', 'Wide', 'Charles enters the apartment', '24mm', 'A Cam'],
    ['1B', 'Medium', 'Charles drops his keys', '50mm', 'A Cam'],
    ['1C', 'Close-Up', 'The noise in the kitchen', '85mm', 'A Cam'],
    ['2A', 'Wide', 'Maya jumps out with the cake', '24mm', 'B Cam'],
  ]
  return (
    <div className="mock-wrap">
      <table className="mock-table" aria-label="An example shot list">
        <thead>
          <tr>
            <th>Shot</th>
            <th>Size</th>
            <th>What happens</th>
            <th>Lens</th>
            <th>Camera</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              {r.map((c, i) => (
                <td key={i}>{i === 0 ? <strong>{c}</strong> : c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CallSheetMock() {
  return (
    <div className="mock-sheet" role="img" aria-label="An example call sheet">
      <div className="mock-head">
        <strong>Late Night Surprise</strong>
        <span>Saturday, October 17. General call 8:00 AM</span>
      </div>
      <div className="mock-grid">
        <div>
          <b>Location</b>
          <span>Maya's apartment, 12 Oak Street</span>
          <span>Parking: back lot</span>
        </div>
        <div>
          <b>Schedule</b>
          <span>8:30 Scene 1, the apartment</span>
          <span>11:00 Scene 2, the kitchen</span>
        </div>
        <div>
          <b>Cast</b>
          <span>Charles, 8:00 AM</span>
          <span>Maya, 10:30 AM</span>
        </div>
        <div>
          <b>Crew</b>
          <span>Director, camera, sound</span>
          <span>Nearest hospital: City General</span>
        </div>
      </div>
    </div>
  )
}

function PlanTimeline() {
  const steps = ['Break down the script', 'Find locations', 'Cast and crew', 'Shot list and storyboard', 'Schedule', 'Gear checklist', 'Call sheet']
  return (
    <ol className="timeline" aria-label="Steps for planning a shoot">
      {steps.map((s, i) => (
        <li key={s}>
          <span className="tl-n">{i + 1}</span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  )
}

function CrewGrid() {
  const roles = [
    ['Director', 'Leads the story and the actors.'],
    ['Producer', 'Handles the schedule, budget, and people.'],
    ['Cinematographer', 'Decides how the film looks: camera and light.'],
    ['Camera operator', 'Runs the camera and frames the shots.'],
    ['1st AC', 'Keeps the picture in focus.'],
    ['Gaffer', 'Heads the lighting team.'],
    ['Grip', 'Moves and sets up the supports and stands.'],
    ['Sound mixer', 'Records the sound on set.'],
    ['Boom operator', 'Holds the microphone above the actors.'],
    ['Production designer', 'Creates the look of sets and props.'],
    ['Script supervisor', 'Tracks continuity and takes notes.'],
    ['Editor', 'Puts the pieces together after filming.'],
  ]
  return (
    <div className="crew-grid">
      {roles.map(([name, text]) => (
        <div key={name} className="crew-card">
          <strong>{name}</strong>
          <span>{text}</span>
        </div>
      ))}
    </div>
  )
}

function ShotStrip() {
  const items = [['ews', 'Extreme wide'], ['ws', 'Wide'], ['ms', 'Medium'], ['cu', 'Close-up'], ['ecu', 'Extreme close-up']]
  return (
    <div className="strip">
      {items.map(([k, label]) => (
        <figure key={k}>
          <div className="strip-pic">
            <ShotFrame kind={k} uid="strip" />
          </div>
          <figcaption>{label}</figcaption>
        </figure>
      ))}
    </div>
  )
}

function Angles() {
  return (
    <div className="angles">
      <AngleDiagram kind="eye" />
      <AngleDiagram kind="high" />
      <AngleDiagram kind="low" />
    </div>
  )
}

export const VISUALS = {
  screenplay: ScreenplayDemo,
  shotlist: ShotListMock,
  sketch: StoryboardSketch,
  'shot-strip': ShotStrip,
  angles: Angles,
  callsheet: CallSheetMock,
  timeline: PlanTimeline,
  crew: CrewGrid,
  continuity: ContinuityDemo,
  rule180: Rule180,
}
