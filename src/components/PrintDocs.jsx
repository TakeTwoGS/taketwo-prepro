import { useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import CallSheetPrint from './CallSheetPrint.jsx'
import FrameImage from './FrameImage.jsx'
import { buildCallSheet } from '../lib/callsheet.js'
import { resolveTags, summarize } from '../lib/breakdown.js'
import { fmtDate, fmtDuration, fmtTime } from '../lib/dates.js'
import { dayEquipment } from '../lib/equipment.js'
import { shotCast, shotLocation, ratioOf, sizeAbbr } from '../lib/shots.js'
import { dayScenes, dayStats, sceneMinutes } from '../lib/schedule.js'
import { GEAR_CATEGORIES } from '../lib/equipment.js'
import { titleCase } from '../lib/breakdown.js'

const today = () => new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })

function Doc({ orient = 'portrait', title, name, children }) {
  return createPortal(
    <div id="print-root" className="doc-print" data-orient={orient}>
      <header className="dp-head">
        <div>
          <div className="dp-title">{title}</div>
          <div className="dp-sub">{name}</div>
        </div>
        <div className="dp-date">Printed {today()}</div>
      </header>
      {children}
    </div>,
    document.body
  )
}

function Storyboard({ ctx }) {
  const { project, shots, shotLabels, analysis, boardRatio } = ctx
  const ratio = ratioOf(boardRatio)
  const sceneById = new Map(analysis.scenes.map((s) => [s.id, s]))
  const frames = shots.rows.filter((s) => s.on_board)
  return (
    <Doc title={project.title} name="Storyboard">
      {frames.length === 0 && <p>No storyboard frames yet.</p>}
      <div className="dp-frames">
        {frames.map((f) => (
          <figure key={f.id} className="dp-frame">
            <FrameImage path={f.image_path} marks={f.marks} ratio={ratio} blankText="" />
            <figcaption>
              <div className="dp-frame-top">
                <strong>Shot {shotLabels.get(f.id) || '—'}</strong>
                <span>
                  {[sceneById.get(f.scene_id) ? `Scene ${sceneById.get(f.scene_id).number}` : '', sizeAbbr(f.size) || f.size, f.angle, f.movement].filter(Boolean).join(', ')}
                </span>
              </div>
              {f.description && <div>{f.description}</div>}
              {f.dialogue && <div className="dp-dia">“{f.dialogue}”</div>}
              {f.duration ? <div className="dp-small">{f.duration} seconds</div> : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </Doc>
  )
}

function ShotList({ ctx }) {
  const { project, shots, shotLabels, analysis } = ctx
  const sceneById = new Map(analysis.scenes.map((s) => [s.id, s]))
  const rows = shots.rows.filter((s) => s.in_list)
  return (
    <Doc orient="landscape" title={project.title} name="Shot list">
      {rows.length === 0 ? (
        <p>No shots in the shot list yet.</p>
      ) : (
        <table className="dp-table small">
          <thead>
            <tr>
              <th>Shot</th>
              <th>Scene</th>
              <th>Description</th>
              <th>Size</th>
              <th>Angle</th>
              <th>Move</th>
              <th>Lens</th>
              <th>FPS</th>
              <th>Camera</th>
              <th>Audio</th>
              <th>Equipment</th>
              <th>Cast</th>
              <th>Location</th>
              <th>Setup</th>
              <th>Shoot</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const scene = sceneById.get(s.scene_id)
              return (
                <tr key={s.id}>
                  <td>
                    <strong>{shotLabels.get(s.id) || '—'}</strong>
                  </td>
                  <td>{scene ? scene.number : ''}</td>
                  <td>{s.description}</td>
                  <td>{sizeAbbr(s.size) || s.size}</td>
                  <td>{s.angle}</td>
                  <td>{s.movement}</td>
                  <td>{s.lens}</td>
                  <td>{s.fps}</td>
                  <td>{s.camera}</td>
                  <td>{s.audio}</td>
                  <td>{s.equipment}</td>
                  <td>{shotCast(s, scene)}</td>
                  <td>{titleCase(shotLocation(s, scene))}</td>
                  <td>{s.setup_min ?? ''}</td>
                  <td>{s.shoot_min ?? ''}</td>
                  <td>{s.priority}</td>
                  <td>{s.status}</td>
                  <td>{s.notes}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Doc>
  )
}

function Schedule({ ctx }) {
  const { project, days, analysis, sceneInfo, shots } = ctx
  const byId = new Map(analysis.scenes.map((s) => [s.id, s]))
  const scheduled = new Set(days.rows.flatMap((d) => d.scene_ids || []))
  const left = analysis.scenes.filter((s) => !scheduled.has(s.id))
  const row = (s) => {
    const m = sceneMinutes(s, sceneInfo, shots.rows)
    return (
      <tr key={s.id}>
        <td>{s.number}</td>
        <td>
          <strong>{s.heading || 'Untitled scene'}</strong>
        </td>
        <td>{s.intExt}</td>
        <td>{s.time}</td>
        <td>{s.characters.map(titleCase).join(', ')}</td>
        <td>{s.pages.toFixed(1)}</td>
        <td>{m ? fmtDuration(m) : ''}</td>
      </tr>
    )
  }
  const head = (
    <thead>
      <tr>
        <th>Sc</th>
        <th>Scene</th>
        <th>I/E</th>
        <th>Time</th>
        <th>Cast</th>
        <th>Pages</th>
        <th>Est.</th>
      </tr>
    </thead>
  )
  return (
    <Doc title={project.title} name="Production schedule">
      {days.rows.length === 0 && <p>No shoot days yet.</p>}
      {days.rows.map((d) => {
        const mine = dayScenes(d, byId)
        const st = dayStats(mine, sceneInfo, shots.rows)
        return (
          <section key={d.id} className="dp-sec">
            <h3>
              {d.label}
              {d.date ? `, ${fmtDate(d.date)}` : ', date to be announced'}
              {d.call_time ? `, call ${fmtTime(d.call_time)}` : ''}
            </h3>
            {mine.length === 0 ? (
              <p className="dp-small">No scenes yet.</p>
            ) : (
              <table className="dp-table">
                {head}
                <tbody>{mine.map(row)}</tbody>
              </table>
            )}
            <p className="dp-small">
              {st.count} {st.count === 1 ? 'scene' : 'scenes'}, {st.pages.toFixed(1)} pages{st.minutes ? `, about ${fmtDuration(st.minutes)}` : ''}
            </p>
          </section>
        )
      })}
      {left.length > 0 && (
        <section className="dp-sec">
          <h3>Not scheduled yet</h3>
          <table className="dp-table">
            {head}
            <tbody>{left.map(row)}</tbody>
          </table>
        </section>
      )}
    </Doc>
  )
}

function Checklist({ ctx, opts }) {
  const { project, days, analysis, uses, gear, shots, shotLabels } = ctx
  const byId = new Map(analysis.scenes.map((s) => [s.id, s]))
  const sceneNumbers = new Map(analysis.scenes.map((s) => [s.id, s.number]))
  const list = opts.dayId && opts.dayId !== 'all' ? days.rows.filter((d) => d.id === opts.dayId) : days.rows
  return (
    <Doc title={project.title} name="Equipment checklist">
      {list.length === 0 && <p>No shoot days yet.</p>}
      {list.map((d) => {
        const items = dayEquipment({ day: d, sceneList: dayScenes(d, byId), uses: uses.rows, items: gear.rows, shots: shots.rows, labels: shotLabels, sceneNumbers })
        return (
          <section key={d.id} className="dp-sec">
            <h3>
              {d.label}
              {d.date ? `, ${fmtDate(d.date)}` : ''}
            </h3>
            {items.length === 0 ? (
              <p className="dp-small">No gear assigned.</p>
            ) : (
              GEAR_CATEGORIES.map((c) => {
                const inCat = items.filter((e) => e.item.category === c)
                if (!inCat.length) return null
                return (
                  <div key={c} className="dp-cat">
                    <div className="dp-cat-title">{c}</div>
                    <ul className="dp-checks">
                      {inCat.map((e) => (
                        <li key={e.item.id}>
                          <span className="dp-box">{d.equip_checked?.[e.item.id] ? '✓' : ''}</span>
                          {e.item.name}
                          {e.item.quantity > 1 ? ` x${e.item.quantity}` : ''}
                          <span className="dp-small"> ({e.why.join(', ')})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })
            )}
          </section>
        )
      })}
    </Doc>
  )
}

function Breakdown({ ctx }) {
  const { project, blocks, analysis, tags } = ctx
  const summary = useMemo(() => summarize(resolveTags(blocks, tags.rows, analysis.scenes), tags.rows, analysis), [blocks, tags.rows, analysis])
  return (
    <Doc title={project.title} name="Script breakdown">
      {summary.scenes.length === 0 && <p>No scenes yet.</p>}
      {summary.scenes.map(({ scene, groups }) => (
        <section key={scene.id} className="dp-sec">
          <h3>
            {scene.number}. {scene.heading || 'Untitled scene'}
          </h3>
          {groups.length === 0 ? (
            <p className="dp-small">Nothing tagged in this scene.</p>
          ) : (
            <table className="dp-table small">
              <tbody>
                {groups.map((g) => (
                  <tr key={g.key}>
                    <td className="dp-cat-cell">{g.key}</td>
                    <td>{g.items.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </Doc>
  )
}

// Opens the browser's print window for one of the project documents, once any pictures have loaded
export default function PrintDocs({ job, ctx, onDone }) {
  const day = job.kind === 'callsheet' ? ctx.days.rows.find((d) => d.id === job.opts.dayId) || ctx.days.rows[0] : null
  const model = useMemo(() => {
    if (!day) return null
    return buildCallSheet({
      project: ctx.project,
      day,
      dayIndex: ctx.days.rows.findIndex((d) => d.id === day.id),
      dayCount: ctx.days.rows.length,
      scenes: ctx.analysis.scenes,
      sceneInfo: ctx.sceneInfo,
      shots: ctx.shots.rows,
      characters: ctx.characters.rows,
      locations: ctx.locations.rows,
      people: ctx.people.rows,
      uses: ctx.uses.rows,
      items: ctx.gear.rows,
      shotLabels: ctx.shotLabels,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day?.id])

  useEffect(() => {
    let finished = false
    const finish = () => {
      if (!finished) {
        finished = true
        onDone()
      }
    }
    const waitForPictures = async () => {
      for (let i = 0; i < 30; i++) {
        const root = document.getElementById('print-root')
        const loading = root ? [...root.querySelectorAll('.frame-blank span')].some((s) => s.textContent === 'Loading…') : false
        const pending = root ? [...root.querySelectorAll('img')].some((img) => !img.complete) : false
        if (!loading && !pending) break
        await new Promise((r) => setTimeout(r, 200))
      }
    }
    const t = setTimeout(async () => {
      await waitForPictures()
      window.print()
    }, 150)
    window.addEventListener('afterprint', finish)
    const fallback = setTimeout(finish, 180000)
    return () => {
      clearTimeout(t)
      clearTimeout(fallback)
      window.removeEventListener('afterprint', finish)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.body.classList.add('has-print')
    return () => document.body.classList.remove('has-print')
  }, [])

  if (job.kind === 'storyboard') return <Storyboard ctx={ctx} />
  if (job.kind === 'shotlist') return <ShotList ctx={ctx} />
  if (job.kind === 'schedule') return <Schedule ctx={ctx} />
  if (job.kind === 'checklist') return <Checklist ctx={ctx} opts={job.opts} />
  if (job.kind === 'breakdown') return <Breakdown ctx={ctx} />
  if (job.kind === 'callsheet' && model) return <CallSheetPrint model={model} />
  return null
}
