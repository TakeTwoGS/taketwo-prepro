import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Copy, Printer } from 'lucide-react'
import { useProject } from './ProjectLayout.jsx'
import CallSheetPrint from '../components/CallSheetPrint.jsx'
import Hint from '../components/Hint.jsx'
import { useToast } from '../components/Toast.jsx'
import { buildCallSheet, callSheetText } from '../lib/callsheet.js'
import { daysUntil, fmtDate, fmtTime } from '../lib/dates.js'

function SectionHead({ title, k, model, onToggle, hint, children }) {
  return (
    <div className="cs-sec-head">
      <h3>
        {title} {hint && <Hint text={hint} />}
      </h3>
      {children}
      <label className="check small">
        <input type="checkbox" checked={model.show[k]} onChange={(e) => onToggle(k, e.target.checked)} />
        <span>Include when printing</span>
      </label>
    </div>
  )
}

export default function CallSheetPage() {
  const { project, analysis, sceneInfo, shots, shotLabels, characters, locations, people, days, uses, gear, prodError } = useProject()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const dayList = days.rows
  const wanted = params.get('day')
  const day = dayList.find((d) => d.id === wanted) || dayList.find((d) => d.date && daysUntil(d.date) >= 0) || dayList[0] || null
  const index = day ? dayList.findIndex((d) => d.id === day.id) : -1
  const base = `/project/${project.id}`

  const model = useMemo(
    () =>
      day
        ? buildCallSheet({
            project,
            day,
            dayIndex: index,
            dayCount: dayList.length,
            scenes: analysis.scenes,
            sceneInfo,
            shots: shots.rows,
            characters: characters.rows,
            locations: locations.rows,
            people: people.rows,
            uses: uses.rows,
            items: gear.rows,
            shotLabels,
          })
        : null,
    [project, day, index, dayList.length, analysis.scenes, sceneInfo, shots.rows, characters.rows, locations.rows, people.rows, uses.rows, gear.rows, shotLabels]
  )

  if (dayList.length === 0)
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Call sheets</h1>
            <p className="muted-text">One page that tells everyone where to be and when.</p>
          </div>
        </div>
        {prodError && <div className="notice error">The schedule tables are not set up yet. Run the updated SQL file in Supabase, then refresh. ({prodError})</div>}
        <div className="empty">
          <h2>Add a shoot day first</h2>
          <p>A call sheet is built from a shoot day: its date, scenes, cast, crew, and gear. Add a day on the Schedule tab and drag scenes onto it.</p>
          <Link className="btn btn-primary" to={`${base}/schedule`}>
            Open the schedule
          </Link>
        </div>
      </div>
    )

  const cs = day.call_sheet || {}
  const patch = (p) => days.update(day.id, { call_sheet: { ...cs, ...p } })
  const setCall = (key, v) => patch({ calls: { ...(cs.calls || {}), [key]: v } })
  const toggleSection = (key, show) => patch({ hide: { ...(cs.hide || {}), [key]: !show } })
  const toggleCrew = (id, on) => {
    const off = new Set(cs.crew_off || [])
    on ? off.delete(id) : off.add(id)
    patch({ crew_off: [...off] })
  }
  const toggleGear = (id, checked) => days.update(day.id, { equip_checked: { ...(day.equip_checked || {}), [id]: checked } })

  async function copyText() {
    try {
      await navigator.clipboard.writeText(callSheetText(model))
      toast('Call sheet copied. Paste it into a text or email.')
    } catch {
      toast('Your browser would not let us copy. Try Print instead.', 'error')
    }
  }

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Call sheets</h1>
          <p className="muted-text">
            Check it, change anything you like, then print it or save it as a PDF.{' '}
            <Hint text="A call sheet is a one-page plan for a shoot day. It lists where to go, what time to arrive (the call time), who is needed, and what is being filmed." />
          </p>
        </div>
        <div className="head-actions">
          <button className="btn btn-ghost" onClick={copyText}>
            <Copy size={16} /> Copy as text
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={16} /> Print or save as PDF
          </button>
        </div>
      </div>

      <div className="toolbar-row">
        <select className="input compact" value={day.id} onChange={(e) => setParams({ day: e.target.value }, { replace: true })} aria-label="Shoot day">
          {dayList.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
              {d.date ? ` (${fmtDate(d.date, { weekday: false })})` : ''}
            </option>
          ))}
        </select>
        <span className="meta-text">In the print window, choose Save as PDF as the printer, and turn off Headers and footers for the cleanest page.</span>
      </div>

      <article className="cs-sheet card">
        <header className="cs-head">
          <div>
            <h2 className="cs-title">{model.title}</h2>
            <div className="cs-kind">
              Call sheet, {model.dayLabel}
              {model.dayCount > 1 && <span className="meta-text"> (day {model.dayNumber} of {model.dayCount})</span>}
            </div>
          </div>
          <div className="cs-when">
            <div className="cs-date">{model.dateText}</div>
            {!day.date && (
              <Link className="text-link" to={`${base}/schedule`}>
                Set the date on the Schedule tab
              </Link>
            )}
          </div>
        </header>

        <div className="cs-times">
          <label>
            <span className="meta-text">General call time</span>
            <input className="input compact" type="time" value={day.call_time || ''} onChange={(e) => days.update(day.id, { call_time: e.target.value })} />
          </label>
          <div>
            <span className="meta-text">Estimated wrap</span>
            <div className="cs-wrap">{fmtTime(model.wrap)}</div>
          </div>
        </div>

        <div className="cs-grid">
          <div>
            <h3>{model.places.length > 1 ? 'Locations' : 'Location'}</h3>
            {model.places.length === 0 ? (
              <p className="muted-text">Add scenes to this day to see where you are filming.</p>
            ) : (
              <ul className="cs-places">
                {model.places.map((p) => (
                  <li key={p.name}>
                    <strong>{p.name}</strong>
                    <div className="meta-text">{p.address || 'No address yet'}</div>
                    {p.parking && <div className="meta-text">Parking: {p.parking}</div>}
                    {p.contact && <div className="meta-text">Contact: {p.contact}</div>}
                  </li>
                ))}
              </ul>
            )}
            <Link className="text-link" to={`${base}/locations`}>
              Edit location details
            </Link>
          </div>
          <div>
            <label className="label" htmlFor="cs-parking">
              Parking and directions
            </label>
            <textarea id="cs-parking" className="textarea" rows={2} value={cs.parking || ''} onChange={(e) => patch({ parking: e.target.value })} placeholder="Park in the back lot, enter through the side door" />
            <label className="label" htmlFor="cs-hosp">
              Nearest hospital
            </label>
            <input id="cs-hosp" className="input" value={cs.hospital || ''} onChange={(e) => patch({ hospital: e.target.value })} placeholder="Name and address" />
          </div>
        </div>

        <section className={'cs-sec' + (model.show.schedule ? '' : ' off')}>
          <SectionHead title="Schedule" k="schedule" model={model} onToggle={toggleSection} />
          {model.schedule.length === 0 ? (
            <p className="muted-text">
              No scenes on this day yet.{' '}
              <Link className="text-link" to={`${base}/schedule`}>
                Open the schedule
              </Link>
            </p>
          ) : (
            <div className="cs-table-wrap">
              <table className="cs-t">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Scene</th>
                    <th>What happens</th>
                    <th>Cast</th>
                  </tr>
                </thead>
                <tbody>
                  {model.schedule.map((s) => (
                    <tr key={s.id}>
                      <td data-label="Time">
                        {fmtTime(s.start)}
                        {s.guessed ? ' *' : ''}
                      </td>
                      <td data-label="Scene">{s.number}</td>
                      <td data-label="What happens">
                        <strong>{s.heading}</strong>
                        {s.description && <div className="meta-text">{s.description}</div>}
                      </td>
                      <td data-label="Cast">{s.cast.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="field-note">
                Times are estimates built from your scene time estimates.
                {model.schedule.some((s) => s.guessed) && ' A * means no estimate was set, so 1 hour is assumed.'}
              </p>
            </div>
          )}
        </section>

        <section className={'cs-sec' + (model.show.cast ? '' : ' off')}>
          <SectionHead title="Cast" k="cast" model={model} onToggle={toggleSection} />
          {model.cast.length === 0 ? (
            <p className="muted-text">No speaking characters in this day's scenes.</p>
          ) : (
            <div className="cs-table-wrap">
              <table className="cs-t">
                <thead>
                  <tr>
                    <th>Character</th>
                    <th>Actor</th>
                    <th>Contact</th>
                    <th>Scenes</th>
                    <th>Call</th>
                  </tr>
                </thead>
                <tbody>
                  {model.cast.map((c) => (
                    <tr key={c.key}>
                      <td data-label="Character">{c.character}</td>
                      <td data-label="Actor">
                        {c.actor || <span className="muted-text">Not cast yet</span>}
                        {c.unavailable && <span className="badge danger"> Unavailable</span>}
                      </td>
                      <td data-label="Contact">{c.contact}</td>
                      <td data-label="Scenes">{c.scenes.join(', ')}</td>
                      <td data-label="Call">
                        <input className="input compact" type="time" value={c.call} onChange={(e) => setCall(c.key, e.target.value)} aria-label={`Call time for ${c.character}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Link className="text-link" to={`${base}/crew`}>
            Edit cast and contact details
          </Link>
        </section>

        <section className={'cs-sec' + (model.show.crew ? '' : ' off')}>
          <SectionHead title="Crew" k="crew" model={model} onToggle={toggleSection} hint="Untick anyone who is not working this day." />
          {model.crew.length === 0 ? (
            <p className="muted-text">
              No crew added yet.{' '}
              <Link className="text-link" to={`${base}/crew`}>
                Add your crew
              </Link>
            </p>
          ) : (
            <div className="cs-table-wrap">
              <table className="cs-t">
                <thead>
                  <tr>
                    <th>Working</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Contact</th>
                    <th>Call</th>
                  </tr>
                </thead>
                <tbody>
                  {model.crew.map((c) => (
                    <tr key={c.id} className={c.on ? '' : 'dim'}>
                      <td data-label="Working">
                        <input type="checkbox" checked={c.on} disabled={c.unavailable} onChange={(e) => toggleCrew(c.id, e.target.checked)} aria-label={`${c.name} is working`} />
                      </td>
                      <td data-label="Name">
                        {c.name}
                        {c.unavailable && <span className="badge danger"> Unavailable</span>}
                      </td>
                      <td data-label="Role">{c.role}</td>
                      <td data-label="Contact">{c.contact}</td>
                      <td data-label="Call">
                        <input className="input compact" type="time" value={c.call} onChange={(e) => setCall(c.id, e.target.value)} aria-label={`Call time for ${c.name}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={'cs-sec' + (model.show.equipment ? '' : ' off')}>
          <SectionHead title="Equipment" k="equipment" model={model} onToggle={toggleSection} />
          {model.equipment.length === 0 ? (
            <p className="muted-text">
              No gear is assigned yet.{' '}
              <Link className="text-link" to={`${base}/equipment`}>
                Open Equipment
              </Link>
            </p>
          ) : (
            <ul className="check-list simple">
              {model.equipment.map((e) => (
                <li key={e.id} className={e.checked ? 'done' : ''}>
                  <label className="check">
                    <input type="checkbox" checked={e.checked} onChange={(ev) => toggleGear(e.id, ev.target.checked)} />
                    <span>{e.name}</span>
                  </label>
                  <span className="chip small">{e.category}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className={'cs-sec' + (model.show.notes ? '' : ' off')}>
          <SectionHead title="Notes" k="notes" model={model} onToggle={toggleSection} />
          <label className="label" htmlFor="cs-notes">
            General notes
          </label>
          <textarea id="cs-notes" className="textarea" rows={3} value={cs.notes || ''} onChange={(e) => patch({ notes: e.target.value })} placeholder="Bring a jacket. Lunch is provided at 1:00 PM." />
          <label className="label" htmlFor="cs-safety">
            Safety
          </label>
          <textarea id="cs-safety" className="textarea" rows={2} value={cs.safety || ''} onChange={(e) => patch({ safety: e.target.value })} placeholder="Fire extinguisher on set. Wet floors in the kitchen." />
        </section>
      </article>

      <CallSheetPrint model={model} />
    </div>
  )
}

