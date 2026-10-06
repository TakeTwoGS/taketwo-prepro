import { Link } from 'react-router-dom'
import { Clapperboard, Clock, FileText, MapPin, Moon, Printer, Sun, Users } from 'lucide-react'
import { useProject } from './ProjectLayout.jsx'
import Hint from '../components/Hint.jsx'
import { fmtPages } from '../lib/screenplay.js'

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
  const { project, analysis, blocks, openExport } = useProject()
  const { stats, scenes, locations, characters } = analysis
  const hasText = blocks.some((b) => (b.text || '').trim())
  const base = `/project/${project.id}`

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
    </div>
  )
}
