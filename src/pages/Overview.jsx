import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clapperboard, Clock, FileText, MapPin, Moon, Printer, Rocket, Sun, Users } from 'lucide-react'
import { useProject } from './ProjectLayout.jsx'
import Hint from '../components/Hint.jsx'
import StartPreProModal from '../components/StartPreProModal.jsx'
import { fmtPages } from '../lib/screenplay.js'
import { planPrePro } from '../lib/people.js'
import { daysUntil, fmtDate, fmtTime, whenText } from '../lib/dates.js'
import { dayEquipment, equipmentStatus } from '../lib/equipment.js'
import { dayScenes } from '../lib/schedule.js'

function Stat({ label, value, note, hint, icon: Icon, tone }) {
  return (
    <div className={'card stat tone-' + tone}>
      <span className="tile">
        <Icon size={18} />
      </span>
      <div className="stat-value">{value}</div>
      <div className="stat-label">
        {label} {hint && <Hint text={hint} />}
      </div>
      {note && <div className="stat-note">{note}</div>}
    </div>
  )
}

function Bar({ label, value, total, tone = 'violet' }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return (
    <div className={'bar-row tone-' + tone}>
      <span className="bar-label">{label}</span>
      <span className="bar-track" aria-hidden="true">
        <span className="bar-fill" style={{ width: pct + '%' }} />
      </span>
      <span className="bar-value">{value}</span>
    </div>
  )
}

export default function Overview() {
  const { project, analysis, blocks, openExport, shots, shotLabels, characters: charsApi, locations: locsApi, tags, people, days, uses, tasks, gear } = useProject()
  const [starting, setStarting] = useState(false)
  const { stats, scenes, locations, characters } = analysis
  const hasText = blocks.some((b) => (b.text || '').trim())
  const base = `/project/${project.id}`
  const plan = useMemo(() => planPrePro(analysis, charsApi.rows, locsApi.rows, shots.rows), [analysis, charsApi.rows, locsApi.rows, shots.rows])
  const toCreate = plan.newCharacters.length + plan.newLocations.length + plan.scenesWithoutShots.length
  const frames = shots.rows.filter((s) => s.on_board).length
  const listed = shots.rows.filter((s) => s.in_list)
  const done = listed.filter((s) => s.status === 'Completed').length
  const scenesById = useMemo(() => new Map(analysis.scenes.map((x) => [x.id, x])), [analysis.scenes])
  const sceneNumbers = useMemo(() => new Map(analysis.scenes.map((x) => [x.id, x.number])), [analysis.scenes])
  const nextDay = days.rows.find((d) => d.date && daysUntil(d.date) >= 0) || null
  const nextEquip = nextDay
    ? equipmentStatus(
        dayEquipment({ day: nextDay, sceneList: dayScenes(nextDay, scenesById), uses: uses.rows, items: gear.rows, shots: shots.rows, labels: shotLabels, sceneNumbers }),
        nextDay
      )
    : null
  const castCount = people.rows.filter((p) => p.kind === 'cast').length
  const crewCount = people.rows.length - castCount
  const tasksLeft = tasks.rows.filter((t) => t.status !== 'Done').length
  const charsAdded = analysis.characters.length - plan.newCharacters.length
  const locsAdded = analysis.locations.length - plan.newLocations.length

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>{project.title}</h1>
          <p className="muted-text">Your script at a glance.</p>
        </div>
        <div className="head-actions">
          {hasText && (
            <button className="btn btn-ghost" onClick={openExport}>
              <Printer size={16} /> Export script
            </button>
          )}
          <Link className="btn btn-primary" to={`${base}/script`}>
            {hasText ? 'Continue writing' : 'Start writing'}
          </Link>
        </div>
      </div>

      {project.is_demo && (
        <div className="notice info">
          This is a sample project so you can see how things fit together. Try editing the script, then open the Scenes tab.
          You can delete it any time from the menu in the top right.
        </div>
      )}

      {!hasText ? (
        <div className="empty">
          <h2>Your script is empty</h2>
          <p>Open the script editor and type a scene heading like INT. KITCHEN - NIGHT. We build the scene list for you as you write.</p>
          <Link className="btn btn-primary" to={`${base}/script`}>
            Open the script editor
          </Link>
        </div>
      ) : (
        <>
          <section className="card pad onset-cta">
            <div>
              <h2 className="card-title">Filming day</h2>
              <p className="muted-text">
                On-Set Mode walks you through your shots one at a time with big buttons, made for a phone or tablet. The digital slate keeps up with it.
              </p>
            </div>
            <div className="head-actions">
              <Link className="btn btn-primary btn-lg" to={`${base}/onset`}>
                ENTER ON-SET MODE
              </Link>
              <Link className="btn btn-ghost btn-lg" to={`${base}/slate`}>
                Digital slate
              </Link>
            </div>
          </section>

          <section className="card pad prepro">
            <div className="prepro-head">
              <div>
                <h2 className="card-title">Pre-production</h2>
                <p className="muted-text">
                  {toCreate > 0
                    ? 'Turn your script into a starting point: characters, locations, and a first shot for every scene. Nothing you already made is changed.'
                    : 'Your characters, locations, and scenes all have a starting point. Keep building from the tabs above.'}
                </p>
              </div>
              {toCreate > 0 && (
                <button className="btn btn-primary" onClick={() => setStarting(true)}>
                  <Rocket size={16} /> Start pre-production
                </button>
              )}
            </div>
            <ul className="prepro-list">
              <li>
                <Link to={`${base}/breakdown`}>Script breakdown</Link>
                <span>{tags.rows.length} {tags.rows.length === 1 ? 'item' : 'items'} tagged</span>
              </li>
              <li>
                <Link to={`${base}/characters`}>Characters</Link>
                <span>{charsAdded} of {analysis.characters.length} in the database</span>
              </li>
              <li>
                <Link to={`${base}/locations`}>Locations</Link>
                <span>{locsAdded} of {analysis.locations.length} in the database</span>
              </li>
              <li>
                <Link to={`${base}/storyboard`}>Storyboard</Link>
                <span>{frames} {frames === 1 ? 'frame' : 'frames'}</span>
              </li>
              <li>
                <Link to={`${base}/shots`}>Shot list</Link>
                <span>{done} of {listed.length} shots completed</span>
              </li>
            </ul>
          </section>

          <section className="card pad prepro">
            <h2 className="card-title">Production</h2>
            <ul className="prepro-list">
              <li>
                <Link to={`${base}/schedule`}>Next shoot</Link>
                <span>
                  {nextDay ? `${fmtDate(nextDay.date)}, ${fmtTime(nextDay.call_time)} (${whenText(nextDay.date)})` : days.rows.length ? 'No upcoming dates set' : 'No shoot days yet'}
                </span>
              </li>
              <li>
                <Link to={`${base}/schedule`}>Shoot days</Link>
                <span>{days.rows.length}</span>
              </li>
              <li>
                <Link to={`${base}/crew`}>Cast &amp; crew</Link>
                <span>{castCount} cast, {crewCount} crew</span>
              </li>
              <li>
                <Link to={`${base}/equipment`}>Equipment checklist</Link>
                <span>{nextEquip && nextEquip.total ? `${nextEquip.checked} of ${nextEquip.total} ready` : 'Nothing assigned to the next shoot'}</span>
              </li>
              <li>
                <Link to={`${base}/tasks`}>Tasks remaining</Link>
                <span>{tasksLeft}</span>
              </li>
            </ul>
          </section>

          <div className="stat-grid">
            <Stat
              icon={FileText}
              tone="pink"
              label="Pages"
              value={fmtPages(stats.pages)}
              hint="A screenplay page is a fixed size, so page count is a handy way to measure length."
            />
            <Stat
              icon={Clock}
              tone="violet"
              label="Estimated runtime"
              value={`${stats.runtime} min`}
              note="About one page per minute. This is only an estimate."
              hint="Screenplays run roughly one page per minute on screen. Action scenes and quiet scenes can run faster or slower."
            />
            <Stat icon={Clapperboard} tone="amber" label="Scenes" value={stats.scenes} />
            <Stat icon={MapPin} tone="teal" label="Locations" value={stats.locations} />
            <Stat icon={Users} tone="blue" label="Speaking characters" value={stats.characters} />
          </div>

          <div className="two-col">
            <section className="card pad">
              <h2 className="card-title">Scene breakdown</h2>
              <Bar label="Interior" value={stats.interior} total={stats.scenes} tone="violet" />
              <Bar label="Exterior" value={stats.exterior} total={stats.scenes} tone="pink" />
              {stats.intExt > 0 && <Bar label="Interior and exterior" value={stats.intExt} total={stats.scenes} tone="teal" />}
              <div className="bar-gap" />
              <Bar label="Day" value={stats.day} total={stats.scenes} tone="amber" />
              <Bar label="Night" value={stats.night} total={stats.scenes} tone="blue" />
              {stats.otherTime > 0 && <Bar label="Other or not set" value={stats.otherTime} total={stats.scenes} tone="rose" />}
            </section>

            <section className="card pad">
              <h2 className="card-title">Locations</h2>
              {locations.length === 0 && <p className="muted-text">Locations appear here once your scene headings have a place in them.</p>}
              <ul className="plain-list">
                {locations.map((l) => (
                  <li key={l.name}>
                    <span>{l.name}</span>
                    <span className="muted-text">
                      {l.scenes.length === 1 ? 'Scene ' : 'Scenes '}
                      {l.scenes.join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="two-col">
            <section className="card pad">
              <h2 className="card-title">Characters</h2>
              {characters.length === 0 && <p className="muted-text">Characters appear here once they speak in your script.</p>}
              <div className="chips">
                {characters.map((c) => (
                  <span key={c} className="chip">
                    {c}
                  </span>
                ))}
              </div>
            </section>
            <section className="card pad">
              <h2 className="card-title">Scenes</h2>
              <ul className="plain-list">
                {scenes.slice(0, 8).map((s) => (
                  <li key={s.id}>
                    <Link to={`${base}/script?scene=${s.id}`} className="text-link">
                      {s.number}. {s.heading || 'Untitled scene'}
                    </Link>
                  </li>
                ))}
              </ul>
              {scenes.length > 8 && (
                <Link to={`${base}/scenes`} className="text-link">
                  See all {scenes.length} scenes
                </Link>
              )}
              {scenes.length === 0 && <p className="muted-text">Add a scene heading to create your first scene.</p>}
            </section>
          </div>
        </>
      )}
      {starting && <StartPreProModal plan={plan} onClose={() => setStarting(false)} />}
    </div>
  )
}
