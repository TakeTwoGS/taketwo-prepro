import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, CalendarPlus, GripVertical, Info, Lightbulb } from 'lucide-react'
import { useProject } from './ProjectLayout.jsx'
import Menu from '../components/Menu.jsx'
import Hint from '../components/Hint.jsx'
import { ConfirmModal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { titleCase } from '../lib/breakdown.js'
import { fmtDate, fmtDuration } from '../lib/dates.js'
import { dayEquipment, equipmentStatus } from '../lib/equipment.js'
import { dayScenes, dayStats, dayWarnings, groupScenes, scheduledIds, sceneMinutes } from '../lib/schedule.js'

function SceneCard({ scene, minutes, castText, dragging, over, handlers, menuItems }) {
  const tone = scene.tod === 'night' ? 'blue' : scene.tod === 'day' ? 'amber' : 'violet'
  return (
    <div className={'sc-card tone-' + tone + (dragging ? ' dragging' : '') + (over ? ' over' : '')} draggable {...handlers}>
      <span className="grip" aria-hidden="true">
        <GripVertical size={16} />
      </span>
      <span className="sc-num">{scene.number}</span>
      <div className="sc-body">
        <strong>{scene.heading || 'Untitled scene'}</strong>
        <div className="sc-meta">
          {scene.intExt && <span className="chip small">{scene.intExt}</span>}
          {scene.time && <span className="chip small">{scene.time}</span>}
          <span className="meta-text">{minutes ? fmtDuration(minutes) : 'no time estimate'}</span>
          <span className="meta-text">{scene.pages.toFixed(1)} pages</span>
        </div>
        {castText && <span className="meta-text sc-cast">{castText}</span>}
      </div>
      <Menu label={`Options for scene ${scene.number}`} items={menuItems} />
    </div>
  )
}

const ICONS = { warn: AlertTriangle, tip: Lightbulb, info: Info }

export default function SchedulePage() {
  const { project, analysis, sceneInfo, shots, shotLabels, characters, people, days, uses, gear, prodError } = useProject()
  const toast = useToast()
  const nav = useNavigate()
  const scenes = analysis.scenes
  const scenesById = useMemo(() => new Map(scenes.map((s) => [s.id, s])), [scenes])
  const sceneNumbers = useMemo(() => new Map(scenes.map((s) => [s.id, s.number])), [scenes])
  const dayList = days.rows

  const [group, setGroup] = useState('script')
  const [castFilter, setCastFilter] = useState('all')
  const [dragId, setDragId] = useState(null)
  const [overTarget, setOverTarget] = useState(null) // 'pool' | 'day:ID' | 'scene:ID'
  const [confirm, setConfirm] = useState(null)

  const scheduled = scheduledIds(dayList)
  const unscheduled = scenes.filter((s) => !scheduled.has(s.id))
  const visible = castFilter === 'all' ? unscheduled : unscheduled.filter((s) => s.characters.includes(castFilter))
  const groups = groupScenes(visible, group)

  const minutesOf = (s) => sceneMinutes(s, sceneInfo, shots.rows)
  const castText = (s) => s.characters.map(titleCase).join(', ')

  // For every day: what is scheduled, how heavy it is, and what to watch out for
  const info = useMemo(
    () =>
      dayList.map((day) => {
        const mine = dayScenes(day, scenesById)
        const stats = dayStats(mine, sceneInfo, shots.rows)
        const equipList = dayEquipment({ day, sceneList: mine, uses: uses.rows, items: gear.rows, shots: shots.rows, labels: shotLabels, sceneNumbers })
        const equipment = equipmentStatus(equipList, day)
        const warnings = dayWarnings({
          day,
          days: dayList,
          scenes,
          sceneInfo,
          shots: shots.rows,
          characters: characters.rows,
          people: people.rows,
          equipment,
          mine,
          stats,
        })
        return { day, mine, stats, warnings }
      }),
    [dayList, scenesById, sceneInfo, shots.rows, uses.rows, gear.rows, shotLabels, sceneNumbers, scenes, characters.rows, people.rows]
  )

  async function addDay() {
    try {
      await days.add({ label: `Day ${dayList.length + 1}`, date: null, call_time: '08:00', scene_ids: [], equip_checked: {}, call_sheet: {}, notes: '' })
    } catch (e) {
      toast(e.message || 'Could not add a shoot day.', 'error')
    }
  }

  // Moves a scene to a day (before another scene if given), or back to "not scheduled"
  function moveScene(sceneId, toDayId, beforeId = null) {
    const current = days.rowsRef.current
    for (const d of current) {
      if (d.id !== toDayId && (d.scene_ids || []).includes(sceneId)) {
        days.update(d.id, { scene_ids: d.scene_ids.filter((x) => x !== sceneId) })
      }
    }
    if (toDayId) {
      const day = current.find((d) => d.id === toDayId)
      if (!day) return
      const base = (day.scene_ids || []).filter((x) => x !== sceneId)
      const at = beforeId ? base.indexOf(beforeId) : -1
      days.update(toDayId, { scene_ids: at >= 0 ? [...base.slice(0, at), sceneId, ...base.slice(at)] : [...base, sceneId] })
    }
  }

  const hasFiles = (e) => [...e.dataTransfer.types].includes('Files')
  const dragHandlers = (scene) => ({
    onDragStart: (e) => {
      setDragId(scene.id)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', scene.id)
    },
    onDragEnd: () => {
      setDragId(null)
      setOverTarget(null)
    },
  })
  const moveItems = (scene) => [
    ...dayList.map((d) => ({ label: `Move to ${d.label}`, onClick: () => moveScene(scene.id, d.id) })),
    scheduled.has(scene.id) && { label: 'Back to not scheduled', onClick: () => moveScene(scene.id, null) },
    dayList.length === 0 && { label: 'Add a shoot day first', onClick: addDay },
  ]

  if (scenes.length === 0)
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Schedule</h1>
            <p className="muted-text">Plan which scenes you will film on which day.</p>
          </div>
        </div>
        <div className="empty">
          <h2>No scenes to schedule yet</h2>
          <p>Write your script first. Every scene heading becomes a scene you can drop onto a shoot day.</p>
          <Link className="btn btn-primary" to={`/project/${project.id}/script`}>
            Open the script editor
          </Link>
        </div>
      </div>
    )

  const undated = dayList.filter((d) => !d.date).length

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Schedule</h1>
          <p className="muted-text">
            Drag scenes onto shoot days.{' '}
            <Hint text="A shooting schedule says which scenes you will film on which day. Movies are almost never filmed in script order. Scenes are grouped by location or cast to save time." />
          </p>
        </div>
        <button className="btn btn-primary" onClick={addDay}>
          <CalendarPlus size={16} /> Add shoot day
        </button>
      </div>

      {prodError && (
        <div className="notice error">The schedule tables are not set up yet. Run the updated SQL file in Supabase, then refresh. ({prodError})</div>
      )}

      <div className="notice info sched-summary">
        {unscheduled.length === 0
          ? 'Every scene is scheduled.'
          : `${unscheduled.length} of ${scenes.length} ${scenes.length === 1 ? 'scene is' : 'scenes are'} not scheduled yet.`}
        {undated > 0 && ` ${undated} shoot ${undated === 1 ? 'day has' : 'days have'} no date, so availability cannot be checked.`} These are suggestions only. Nothing moves unless you move it.
      </div>

      <div className="sched-layout">
        <aside
          className={'sched-pool card' + (overTarget === 'pool' ? ' drop' : '')}
          onDragOver={(e) => {
            if (dragId && !hasFiles(e)) {
              e.preventDefault()
              setOverTarget('pool')
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setOverTarget((t) => (t === 'pool' ? null : t))
          }}
          onDrop={(e) => {
            e.preventDefault()
            if (dragId) moveScene(dragId, null)
            setDragId(null)
            setOverTarget(null)
          }}
        >
          <div className="pool-head">
            <h2>Not scheduled</h2>
            <span className="bd-count">{unscheduled.length}</span>
          </div>
          <div className="pool-controls">
            <label className="inline-select">
              <span className="meta-text">Group by</span>
              <select className="input compact" value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="script">Script order</option>
                <option value="location">Location</option>
                <option value="time">Time of day</option>
                <option value="intext">Interior or exterior</option>
              </select>
            </label>
            {analysis.characters.length > 0 && (
              <label className="inline-select">
                <span className="meta-text">Cast</span>
                <select className="input compact" value={castFilter} onChange={(e) => setCastFilter(e.target.value)}>
                  <option value="all">Everyone</option>
                  {analysis.characters.map((n) => (
                    <option key={n} value={n}>
                      {titleCase(n)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {visible.length === 0 ? (
            <p className="muted-text pool-empty">
              {unscheduled.length === 0 ? 'Nice. Every scene has a day.' : 'No unscheduled scenes match that.'}
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.key} className="pool-group">
                {g.label && (
                  <div className="pool-group-title">
                    {g.label} <span className="meta-text">{g.scenes.length}</span>
                  </div>
                )}
                {g.scenes.map((s) => (
                  <SceneCard
                    key={s.id}
                    scene={s}
                    minutes={minutesOf(s)}
                    castText={castText(s)}
                    dragging={dragId === s.id}
                    handlers={dragHandlers(s)}
                    menuItems={moveItems(s)}
                  />
                ))}
              </div>
            ))
          )}
        </aside>

        <div className="sched-days">
          {dayList.length === 0 && (
            <div className="empty">
              <h2>Add your first shoot day</h2>
              <p>A shoot day is one day of filming. Add one, then drag scenes onto it.</p>
              <button className="btn btn-primary" onClick={addDay}>
                <CalendarPlus size={16} /> Add shoot day
              </button>
            </div>
          )}
          {info.map(({ day, mine, stats, warnings }) => (
            <section
              key={day.id}
              className={'day-card card' + (overTarget === 'day:' + day.id ? ' drop' : '')}
              onDragOver={(e) => {
                if (dragId && !hasFiles(e)) {
                  e.preventDefault()
                  setOverTarget((t) => (t && t.startsWith('scene:') ? t : 'day:' + day.id))
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setOverTarget(null)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragId) {
                  const before = overTarget && overTarget.startsWith('scene:') ? overTarget.slice(6) : null
                  moveScene(dragId, day.id, before === dragId ? null : before)
                }
                setDragId(null)
                setOverTarget(null)
              }}
            >
              <div className="day-head">
                <input
                  className="day-label"
                  value={day.label}
                  onChange={(e) => days.update(day.id, { label: e.target.value })}
                  aria-label="Shoot day name"
                />
                <Menu
                  label={`Options for ${day.label}`}
                  items={[
                    { label: 'Open call sheet', onClick: () => nav(`/project/${project.id}/callsheets?day=${day.id}`) },
                    { divider: true },
                    { label: 'Delete shoot day', danger: true, onClick: () => setConfirm(day) },
                  ]}
                />
              </div>
              <div className="day-fields">
                <label>
                  <span className="meta-text">Date</span>
                  <input
                    className="input compact"
                    type="date"
                    value={day.date || ''}
                    onChange={(e) => days.update(day.id, { date: e.target.value || null })}
                    aria-label={`Date for ${day.label}`}
                  />
                </label>
                <label>
                  <span className="meta-text">Call time</span>
                  <input
                    className="input compact"
                    type="time"
                    value={day.call_time || ''}
                    onChange={(e) => days.update(day.id, { call_time: e.target.value })}
                    aria-label={`Call time for ${day.label}`}
                  />
                </label>
              </div>
              {day.date && <div className="meta-text day-date">{fmtDate(day.date)}</div>}

              <div className="day-scenes">
                {mine.length === 0 && <div className="day-drop-hint">Drop scenes here</div>}
                {mine.map((s) => (
                  <div
                    key={s.id}
                    onDragOver={(e) => {
                      if (dragId && dragId !== s.id && !hasFiles(e)) {
                        e.preventDefault()
                        e.stopPropagation()
                        setOverTarget('scene:' + s.id)
                      }
                    }}
                  >
                    <SceneCard
                      scene={s}
                      minutes={minutesOf(s)}
                      castText={castText(s)}
                      dragging={dragId === s.id}
                      over={overTarget === 'scene:' + s.id}
                      handlers={dragHandlers(s)}
                      menuItems={moveItems(s)}
                    />
                  </div>
                ))}
              </div>

              <div className="day-stats">
                <span>
                  <strong>{stats.count}</strong> {stats.count === 1 ? 'scene' : 'scenes'}
                </span>
                <span>
                  <strong>{stats.pages.toFixed(1)}</strong> pages
                </span>
                <span>
                  About <strong>{fmtDuration(stats.minutes)}</strong>
                  {stats.unknown > 0 && <span className="meta-text"> (+{stats.unknown} with no estimate)</span>}
                </span>
              </div>

              {warnings.length > 0 && (
                <ul className="warnings">
                  {warnings.map((w, i) => {
                    const Icon = ICONS[w.level]
                    return (
                      <li key={i} className={'warning ' + w.level}>
                        <Icon size={16} />
                        <div>
                          <span>{w.text}</span>
                          {w.actions && (
                            <div className="warning-actions">
                              {w.actions.map((a) => (
                                <button key={a.sceneId} className="btn btn-ghost btn-sm" onClick={() => moveScene(a.sceneId, day.id)}>
                                  {a.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>

      {confirm && (
        <ConfirmModal
          title={`Delete ${confirm.label}?`}
          danger
          confirmLabel="Delete shoot day"
          message={
            (confirm.scene_ids || []).length
              ? 'Its scenes go back to "Not scheduled". Its call sheet notes and gear checklist for this day are deleted.'
              : 'This shoot day will be deleted.'
          }
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            const d = confirm
            setConfirm(null)
            try {
              await days.remove(d.id)
              const stale = uses.rows.filter((u) => u.scope === 'day' && u.target_id === d.id).map((u) => u.id)
              if (stale.length) await uses.removeMany(stale)
            } catch (e) {
              toast(e.message || 'Could not delete that day.', 'error')
            }
          }}
        />
      )}
    </div>
  )
}
