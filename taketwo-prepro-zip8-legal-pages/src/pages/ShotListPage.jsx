import { memo, useState } from 'react'
import { GripVertical, Plus } from 'lucide-react'
import { useProject } from './ProjectLayout.jsx'
import FrameEditor from '../components/FrameEditor.jsx'
import Menu from '../components/Menu.jsx'
import Hint from '../components/Hint.jsx'
import { ConfirmModal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { useShotActions } from '../lib/shotActions.js'
import {
  ANGLES,
  MOVEMENTS,
  PRIORITIES,
  SIZES,
  STATUSES,
  STATUS_TONE,
  positionForMove,
  shotCast,
  shotLocation,
  sortShots,
} from '../lib/shots.js'

const num = (v) => (v === '' ? null : Number(v))

const Row = memo(function Row({ shot, label, scene, scenes, more, dragging, over, onUpdate, onGrab, onDragStart, onDragOver, onDrop, onDragEnd, menuItems, grabbed }) {
  const set = (k) => (e) => onUpdate(shot.id, { [k]: e.target.value })
  return (
    <tr
      className={(dragging ? 'dragging ' : '') + (over ? 'over ' : '')}
      draggable={grabbed}
      onDragStart={(e) => onDragStart(e, shot.id)}
      onDragOver={(e) => onDragOver(e, shot.id)}
      onDrop={(e) => onDrop(e, shot.id)}
      onDragEnd={onDragEnd}
    >
      <td className="c-grip sticky-1">
        <span
          className="grip"
          onMouseDown={() => onGrab(shot.id)}
          onMouseUp={() => onGrab(null)}
          onTouchStart={() => onGrab(null)}
          title="Drag to reorder"
          aria-hidden="true"
        >
          <GripVertical size={16} />
        </span>
      </td>
      <td className="c-label sticky-2">
        <strong className={label === '—' ? 'muted-text' : ''}>{label}</strong>
      </td>
      <td className="c-scene">
        <select className="cell" value={shot.scene_id || ''} onChange={(e) => onUpdate(shot.id, { scene_id: e.target.value || null })} aria-label={`Scene for shot ${label}`}>
          <option value="">None</option>
          {scenes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.number}. {s.heading}
            </option>
          ))}
        </select>
      </td>
      <td className="c-desc">
        <input className="cell" value={shot.description} onChange={set('description')} placeholder="What happens in this shot" aria-label={`Description for shot ${label}`} />
      </td>
      <td>
        <select className="cell" value={shot.size} onChange={set('size')} aria-label={`Shot size for ${label}`}>
          <option value="">Size</option>
          {SIZES.map((o) => (
            <option key={o.name} value={o.name}>
              {o.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select className="cell" value={shot.angle} onChange={set('angle')} aria-label={`Angle for shot ${label}`}>
          <option value="">Angle</option>
          {ANGLES.map((o) => (
            <option key={o.name} value={o.name}>
              {o.name}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select className="cell" value={shot.movement} onChange={set('movement')} aria-label={`Movement for shot ${label}`}>
          <option value="">Movement</option>
          {MOVEMENTS.map((o) => (
            <option key={o.name} value={o.name}>
              {o.name}
            </option>
          ))}
        </select>
      </td>
      <td className="c-short">
        <input className="cell" value={shot.lens} onChange={set('lens')} placeholder="50mm" aria-label={`Lens for shot ${label}`} />
      </td>
      <td className="c-short">
        <input className="cell" value={shot.camera} onChange={set('camera')} placeholder="A Cam" aria-label={`Camera for shot ${label}`} />
      </td>
      {more && (
        <>
          <td className="c-short">
            <input className="cell" value={shot.fps} onChange={set('fps')} placeholder="24" aria-label={`Frame rate for shot ${label}`} />
          </td>
          <td>
            <input className="cell" value={shot.audio} onChange={set('audio')} placeholder="Boom, lav…" aria-label={`Audio for shot ${label}`} />
          </td>
          <td>
            <input className="cell" value={shot.equipment} onChange={set('equipment')} placeholder="Tripod, slider…" aria-label={`Equipment for shot ${label}`} />
          </td>
          <td>
            <input className="cell" value={shot.cast_note} onChange={set('cast_note')} placeholder={shotCast(shot, scene) || 'From the scene'} aria-label={`Cast for shot ${label}`} />
          </td>
          <td>
            <input className="cell" value={shot.location_note} onChange={set('location_note')} placeholder={shotLocation(shot, scene) || 'From the scene'} aria-label={`Location for shot ${label}`} />
          </td>
          <td className="c-num">
            <input className="cell" type="number" min="0" inputMode="numeric" value={shot.setup_min ?? ''} onChange={(e) => onUpdate(shot.id, { setup_min: num(e.target.value) })} aria-label={`Setup minutes for shot ${label}`} />
          </td>
          <td className="c-num">
            <input className="cell" type="number" min="0" inputMode="numeric" value={shot.shoot_min ?? ''} onChange={(e) => onUpdate(shot.id, { shoot_min: num(e.target.value) })} aria-label={`Shooting minutes for shot ${label}`} />
          </td>
        </>
      )}
      <td className="c-prio">
        <select className="cell" value={shot.priority} onChange={set('priority')} aria-label={`Priority for shot ${label}`}>
          {PRIORITIES.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </td>
      <td className="c-status">
        <select className={'cell status st-' + STATUS_TONE[shot.status]} value={shot.status} onChange={set('status')} aria-label={`Status for shot ${label}`}>
          {STATUSES.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </td>
      {more && (
        <td>
          <input className="cell" value={shot.notes} onChange={set('notes')} placeholder="Notes" aria-label={`Notes for shot ${label}`} />
        </td>
      )}
      <td className="c-menu">
        <Menu label={`Options for shot ${label}`} items={menuItems} />
      </td>
    </tr>
  )
})

function minutes(total) {
  if (!total) return '0 min'
  const h = Math.floor(total / 60)
  const m = total % 60
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`
}

export default function ShotListPage() {
  const { analysis, shots, shotLabels, extrasError } = useProject()
  const actions = useShotActions()
  const toast = useToast()
  const scenes = analysis.scenes
  const sceneById = new Map(scenes.map((s) => [s.id, s]))

  const [more, setMore] = useState(() => {
    try {
      return localStorage.getItem('prepro:shotcols') === 'all'
    } catch {
      return false
    }
  })
  const [sceneFilter, setSceneFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [grab, setGrab] = useState(null)
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)

  const toggleMore = () => {
    const next = !more
    setMore(next)
    try {
      localStorage.setItem('prepro:shotcols', next ? 'all' : 'basic')
    } catch {
      /* fine */
    }
  }

  const inList = shots.rows.filter((s) => s.in_list)
  const rows = inList
    .filter((s) => (sceneFilter === 'all' ? true : sceneFilter === 'none' ? !s.scene_id : s.scene_id === sceneFilter))
    .filter((s) => statusFilter === 'all' || s.status === statusFilter)
    .filter((s) => !query.trim() || s.description.toLowerCase().includes(query.trim().toLowerCase()))
  const done = inList.filter((s) => s.status === 'Completed').length
  const pct = inList.length ? Math.round((done / inList.length) * 100) : 0
  const pullable = shots.rows.filter((s) => s.on_board && !s.in_list)
  const setupTotal = inList.reduce((n, s) => n + (s.setup_min || 0), 0)
  const shootTotal = inList.reduce((n, s) => n + (s.shoot_min || 0), 0)
  const ids = rows.map((s) => s.id)

  async function addShot() {
    const sceneId = sceneFilter !== 'all' && sceneFilter !== 'none' ? sceneFilter : rows[rows.length - 1]?.scene_id ?? null
    await actions.addShot({ scene_id: sceneId, in_list: true, on_board: false })
  }

  const update = shots.update
  const onDragStart = (e, id) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }
  const onDragOver = (e, id) => {
    if (!dragId) return
    e.preventDefault()
    setOverId(id)
  }
  const onDrop = (e, targetId) => {
    e.preventDefault()
    if (dragId && dragId !== targetId) {
      const from = rows.findIndex((r) => r.id === dragId)
      const to = rows.findIndex((r) => r.id === targetId)
      const pos = positionForMove(sortShots(shots.rowsRef.current), dragId, targetId, from < to)
      if (pos != null) update(dragId, { position: pos })
    }
    setDragId(null)
    setOverId(null)
    setGrab(null)
  }
  const onDragEnd = () => {
    setDragId(null)
    setOverId(null)
    setGrab(null)
  }

  const colCount = more ? 20 : 12

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Shot list</h1>
          <p className="muted-text">
            Every shot you plan to film, in order.{' '}
            <Hint text="A shot list is a checklist of the shots you need on shoot day. It helps you work faster and not forget anything." />
          </p>
        </div>
        <div className="head-actions">
          {pullable.length > 0 && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                pullable.forEach((s) => update(s.id, { in_list: true }))
                toast(`${pullable.length} storyboard ${pullable.length === 1 ? 'frame' : 'frames'} added`)
              }}
            >
              Add storyboard frames ({pullable.length})
            </button>
          )}
          <button className="btn btn-primary" onClick={addShot}>
            <Plus size={16} /> Add shot
          </button>
        </div>
      </div>

      {extrasError && (
        <div className="notice error">
          The shot list tables are not set up yet. Run the updated SQL file in Supabase, then refresh. ({extrasError})
        </div>
      )}

      <div className="sl-progress card pad">
        <div className="sl-progress-top">
          <strong>
            {done} of {inList.length} shots completed
          </strong>
          <span className="meta-text">
            Estimated time: {minutes(setupTotal)} setup, {minutes(shootTotal)} shooting
          </span>
        </div>
        <div className="progress" aria-hidden="true">
          <span style={{ width: pct + '%' }} />
        </div>
      </div>

      <div className="toolbar-row">
        <select className="input compact" value={sceneFilter} onChange={(e) => setSceneFilter(e.target.value)} aria-label="Filter by scene">
          <option value="all">All scenes</option>
          {scenes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.number}. {s.heading || 'Untitled scene'}
            </option>
          ))}
          <option value="none">No scene</option>
        </select>
        <select className="input compact" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="all">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input className="input compact search-in" placeholder="Search descriptions" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search descriptions" />
        <span className="tb-spacer" />
        <button className="btn btn-ghost btn-sm" onClick={toggleMore}>
          {more ? 'Show fewer columns' : 'Show all columns'}
        </button>
      </div>

      {inList.length === 0 ? (
        <div className="empty">
          <h2>Your shot list is empty</h2>
          <p>Add a shot here, or build your storyboard and send frames over with Add to shot list. Everything you type stays in sync.</p>
          <button className="btn btn-primary" onClick={addShot}>
            <Plus size={16} /> Add your first shot
          </button>
        </div>
      ) : (
        <div className="sl-wrap">
          <table className="sl-table">
            <thead>
              <tr>
                <th className="sticky-1" aria-label="Reorder" />
                <th className="sticky-2">Shot</th>
                <th>Scene</th>
                <th className="c-desc">Description</th>
                <th>
                  Size <Hint text="How much of the person or place fits in the frame, like Close-Up or Wide Shot." />
                </th>
                <th>
                  Angle <Hint text="Where the camera sits compared to the subject, like Low Angle." />
                </th>
                <th>
                  Movement <Hint text="Whether the camera stays still or moves, like Pan or Dolly." />
                </th>
                <th>
                  Lens <Hint text="The lens you plan to use, like 24mm (wide) or 85mm (close)." />
                </th>
                <th>Camera</th>
                {more && (
                  <>
                    <th>
                      Frame rate <Hint text="Frames per second. 24 is the classic movie look. 60 is good for slow motion." />
                    </th>
                    <th>Audio</th>
                    <th>Equipment</th>
                    <th>Cast</th>
                    <th>Location</th>
                    <th>Setup (min)</th>
                    <th>Shooting (min)</th>
                  </>
                )}
                <th>Priority</th>
                <th>Status</th>
                {more && <th>Notes</th>}
                <th aria-label="Options" />
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <Row
                  key={s.id}
                  shot={s}
                  label={shotLabels.get(s.id) || '—'}
                  scene={sceneById.get(s.scene_id)}
                  scenes={scenes}
                  more={more}
                  grabbed={grab === s.id}
                  dragging={dragId === s.id}
                  over={overId === s.id && dragId && dragId !== s.id}
                  onUpdate={update}
                  onGrab={setGrab}
                  onDragStart={onDragStart}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                  onDragEnd={onDragEnd}
                  menuItems={[
                    { label: 'Open frame (picture and drawing)', onClick: () => setEditing(s.id) },
                    { label: s.on_board ? 'Hide from storyboard' : 'Show on storyboard', onClick: () => update(s.id, { on_board: !s.on_board }) },
                    { label: 'Duplicate', onClick: () => actions.duplicate(s) },
                    { label: 'Remove from shot list', onClick: () => update(s.id, { in_list: false }) },
                    { divider: true },
                    { label: 'Delete', danger: true, onClick: () => setConfirm(s) },
                  ]}
                />
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={colCount} className="sl-none">
                    No shots match those filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && <FrameEditor shotId={editing} ids={ids} onNavigate={setEditing} onClose={() => setEditing(null)} />}
      {confirm && (
        <ConfirmModal
          title="Delete this shot?"
          danger
          confirmLabel="Delete"
          message={confirm.on_board ? 'It is also on your storyboard, so this removes it from both.' : 'This shot will be deleted.'}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            const s = confirm
            setConfirm(null)
            await actions.deleteShot(s)
          }}
        />
      )}
    </div>
  )
}
