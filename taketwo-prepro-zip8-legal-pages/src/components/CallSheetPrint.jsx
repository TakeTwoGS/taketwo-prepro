import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { fmtTime } from '../lib/dates.js'

// The printable call sheet. It stays hidden on screen and is only shown by the print styles.
export default function CallSheetPrint({ model: m }) {
  useEffect(() => {
    document.body.classList.add('has-print')
    return () => document.body.classList.remove('has-print')
  }, [])

  const crewOn = m.crew.filter((c) => c.on)
  return createPortal(
    <div id="print-root" className="cs-print">
      <header className="cs-p-head">
        <div>
          <div className="cs-p-title">{m.title}</div>
          <div className="cs-p-kind">
            Call sheet, {m.dayLabel}
            {m.dayCount > 1 ? ` (day ${m.dayNumber} of ${m.dayCount})` : ''}
          </div>
        </div>
        <div className="cs-p-when">
          <div className="cs-p-date">{m.dateText}</div>
          <div>
            General call <strong>{fmtTime(m.general)}</strong>
          </div>
          <div>Estimated wrap {fmtTime(m.wrap)}</div>
        </div>
      </header>

      <section className="cs-p-grid">
        <div>
          <h3>{m.places.length > 1 ? 'Locations' : 'Location'}</h3>
          {m.places.length === 0 && <p>To be announced</p>}
          {m.places.map((p) => (
            <p key={p.name}>
              <strong>{p.name}</strong>
              {p.address && <span>, {p.address}</span>}
              {p.parking && <span className="cs-sub">Parking: {p.parking}</span>}
              {p.contact && <span className="cs-sub">Contact: {p.contact}</span>}
            </p>
          ))}
        </div>
        <div>
          {m.parkingNote && (
            <>
              <h3>Parking</h3>
              <p>{m.parkingNote}</p>
            </>
          )}
          {m.hospital && (
            <>
              <h3>Nearest hospital</h3>
              <p>{m.hospital}</p>
            </>
          )}
        </div>
      </section>

      {m.show.schedule && m.schedule.length > 0 && (
        <section>
          <h3>Schedule</h3>
          <table className="cs-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Scene</th>
                <th>What happens</th>
                <th>Cast</th>
              </tr>
            </thead>
            <tbody>
              {m.schedule.map((s) => (
                <tr key={s.id}>
                  <td>
                    {fmtTime(s.start)}
                    {s.guessed ? ' *' : ''}
                  </td>
                  <td>{s.number}</td>
                  <td>
                    <strong>{s.heading}</strong>
                    {s.description && <div className="cs-sub">{s.description}</div>}
                  </td>
                  <td>{s.cast.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="cs-foot">Times are estimates.{m.schedule.some((s) => s.guessed) ? ' * No time estimate was set, so 1 hour is assumed.' : ''}</p>
        </section>
      )}

      {m.show.cast && m.cast.length > 0 && (
        <section>
          <h3>Cast</h3>
          <table className="cs-table">
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
              {m.cast.map((c) => (
                <tr key={c.key}>
                  <td>{c.character}</td>
                  <td>{c.actor || 'To be cast'}</td>
                  <td>{c.contact}</td>
                  <td>{c.scenes.join(', ')}</td>
                  <td>{fmtTime(c.call)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {m.show.crew && crewOn.length > 0 && (
        <section>
          <h3>Crew</h3>
          <table className="cs-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Contact</th>
                <th>Call</th>
              </tr>
            </thead>
            <tbody>
              {crewOn.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.role}</td>
                  <td>{c.contact}</td>
                  <td>{fmtTime(c.call)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {m.show.equipment && m.equipment.length > 0 && (
        <section>
          <h3>Equipment</h3>
          <ul className="cs-equip">
            {m.equipment.map((e) => (
              <li key={e.id}>
                <span className="cs-box">{e.checked ? '✓' : ''}</span> {e.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {m.show.notes && (m.notes || m.safety) && (
        <section>
          {m.notes && (
            <>
              <h3>Notes</h3>
              <p className="cs-pre">{m.notes}</p>
            </>
          )}
          {m.safety && (
            <>
              <h3>Safety</h3>
              <p className="cs-pre">{m.safety}</p>
            </>
          )}
        </section>
      )}
    </div>,
    document.body
  )
}
