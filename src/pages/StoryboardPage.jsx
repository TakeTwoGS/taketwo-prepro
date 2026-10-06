import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ImagePlus, LayoutGrid, ListChecks, Pause, Play, Plus, Rows3 } from 'lucide-react'
import { useProject } from './ProjectLayout.jsx'
import FrameImage from '../components/FrameImage.jsx'
import FrameEditor from '../components/FrameEditor.jsx'
import Menu from '../components/Menu.jsx'
import Hint from '../components/Hint.jsx'
import { ConfirmModal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { useShotActions } from '../lib/shotActions.js'
import { RATIOS, positionForMove, ratioOf, sizeAbbr, sortShots } from '../lib/shots.js'

function Card({ shot, label, ratio, scene, dragging, over, fileOver, handlers, menuItems, onOpen }) {
  return (
    <article
      className={'sb-card' + (dragging ? ' dragging' : '') + (over ? ' over' : '') + (fileOver ? ' file-over' : '')}
      draggable
      {...handlers}
    >
      <button className="sb-img" onClick={onOpen} aria-label={`Open frame ${label}`}>
        <FrameImage path={shot.image_path} marks={shot.marks} ratio={ratio} blankText="Blank frame" />
        <span className="sb-label">{label}</span>
        {shot.in_list && <span className="sb-flag">In shot list</span>}
      </button>
      <div className="sb-body">
        <div className="sb-chips">
          {shot.size && <span className="chip small">{sizeAbbr(shot.size) || shot.size}</span>}
          {shot.angle && <span className="chip small">{shot.angle}</span>}
          {shot.movement && <span className="chip small">{shot.movement}</span>}
          {!shot.size && !shot.angle && !shot.movement && <span className="meta-text">No camera details yet</span>}
        </div>
        {shot.description && <p className="sb-desc">{shot.description}</p>}
        {shot.dialogue && <p className="sb-dia">“{shot.dialogue}”</p>}
        <div className="sb-foot">
          <span className="meta-text">
            {scene ? `Scene ${scene.number}` : 'No scene'}
            {shot.duration ? `, ${shot.duration}s` : ''}
          </span>
          <Menu label={`Options for frame ${label}`} items={menuItems} />
        </div>
      </div>
    </article>
  )
}

function Sequence({ frames, labels, ratio, scenes }) {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const idx = Math.min(i, Math.max(0, frames.length - 1))
  const cur = frames[idx]
  const scene = cur && scenes.find((s) => s.id === cur.scene_id)

  useEffect(() => {
    if (!playing || !cur) return
    if (idx >= frames.length - 1) {
      setPlaying(false)
      return
    }
    const t = setTimeout(() => setI(idx + 1), (cur.duration || 3) * 1000)
    return () => clearTimeout(t)
  }, [playing, idx, cur, frames.length])

  useEffect(() => {
    const onKey = (e) => {
      if (/input|textarea|select/i.test(e.target.tagName)) return
      if (e.key === 'ArrowRight') setI((n) => Math.min(frames.length - 1, n + 1))
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [frames.length])

  if (!cur) return null
  return (
    <div className="seq">
      <div className="seq-stage">
        <FrameImage path={cur.image_path} marks={cur.marks} ratio={ratio} blankText="Blank frame" />
      </div>
      <div className="seq-caption">
        <div className="seq-title">
          <strong>Shot {labels.get(cur.id)}</strong>
          <span className="meta-text">
            {scene ? `Scene ${scene.number}` : 'No scene'}
            {cur.size ? `, ${cur.size}` : ''}
            {cur.angle ? `, ${cur.angle}` : ''}
            {cur.movement ? `, ${cur.movement}` : ''}
          </span>
        </div>
        {cur.description && <p>{cur.description}</p>}
        {cur.dialogue && <p className="sb-dia">“{cur.dialogue}”</p>}
      </div>
      <div className="seq-controls">
        <button className="btn btn-ghost btn-sm" onClick={() => setI(Math.max(0, idx - 1))} disabled={idx === 0}>
          <ChevronLeft size={16} /> Back
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            if (!playing && idx >= frames.length - 1) setI(0)
            setPlaying((p) => !p)
          }}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />} {playing ? 'Pause' : 'Play'}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setI(Math.min(frames.length - 1, idx + 1))} disabled={idx >= frames.length - 1}>
          Next <ChevronRight size={16} />
        </button>
        <span className="meta-text">
          {idx + 1} of {frames.length}. Each frame plays for its estimated duration, or 3 seconds.
        </span>
      </div>
      <div className="seq-strip">
        {frames.map((f, n) => (
          <button key={f.id} className={'seq-thumb' + (n === idx ? ' on' : '')} onClick={() => setI(n)} aria-label={`Go to frame ${labels.get(f.id)}`}>
            <FrameImage path={f.image_path} marks={f.marks} ratio={ratio} blankText="" />
            <span>{labels.get(f.id)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function StoryboardPage() {
  const { project, analysis, shots, shotLabels, boardRatio, setBoardRatio, extrasError } = useProject()
  const actions = useShotActions()
  const toast = useToast()
  const scenes = analysis.scenes
  const ratio = ratioOf(boardRatio)

  const [view, setView] = useState('cards')
  const [sceneFilter, setSceneFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const [fileOverId, setFileOverId] = useState(null)
  const [pageDrop, setPageDrop] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const fileInput = useRef(null)

  const onBoard = shots.rows.filter((s) => s.on_board)
  const frames = onBoard.filter((s) =>
    sceneFilter === 'all' ? true : sceneFilter === 'none' ? !s.scene_id : s.scene_id === sceneFilter
  )
  const notInList = onBoard.filter((s) => !s.in_list)
  const sceneById = new Map(scenes.map((s) => [s.id, s]))
  const filterScene = sceneFilter !== 'all' && sceneFilter !== 'none' ? sceneFilter : null

  async function newFrame() {
    const lastScene = filterScene ?? frames[frames.length - 1]?.scene_id ?? null
    const row = await actions.addShot({ scene_id: lastScene })
    if (row) setEditing(row.id)
  }

  async function uploadMany(files) {
    setUploading(true)
    const made = await actions.addImages(files, filterScene)
    setUploading(false)
    if (made) toast(made === 1 ? '1 frame added' : `${made} frames added`)
  }

  function reorder(targetId) {
    if (!dragId || dragId === targetId) return
    const from = frames.findIndex((f) => f.id === dragId)
    const to = frames.findIndex((f) => f.id === targetId)
    const pos = positionForMove(sortShots(shots.rowsRef.current), dragId, targetId, from < to)
    if (pos != null) shots.update(dragId, { position: pos })
  }

  function moveBy(shot, dir) {
    const i = frames.findIndex((f) => f.id === shot.id)
    const target = frames[i + dir]
    if (!target) return
    const pos = positionForMove(sortShots(shots.rowsRef.current), shot.id, target.id, dir > 0)
    if (pos != null) shots.update(shot.id, { position: pos })
  }

  const hasFiles = (e) => [...e.dataTransfer.types].includes('Files')

  const pageHandlers = {
    onDragOver: (e) => {
      if (hasFiles(e)) {
        e.preventDefault()
        setPageDrop(true)
      }
    },
    onDragLeave: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setPageDrop(false)
    },
    onDrop: (e) => {
      setPageDrop(false)
      if (hasFiles(e)) {
        e.preventDefault()
        uploadMany(e.dataTransfer.files)
      }
    },
  }

  const ids = frames.map((f) => f.id)

  return (
    <div className={'page wide' + (pageDrop ? ' page-drop' : '')} {...pageHandlers}>
      <div className="page-head">
        <div>
          <h1>Storyboard</h1>
          <p className="muted-text">
            Sketch or upload a picture for each shot. No drawing skills needed.{' '}
            <Hint text="A storyboard is a series of pictures that shows how each shot will look before you film it." />
          </p>
        </div>
        <div className="head-actions">
          <button className="btn btn-ghost" onClick={() => fileInput.current?.click()} disabled={uploading}>
            <ImagePlus size={16} /> {uploading ? 'Uploading…' : 'Upload pictures'}
          </button>
          <button className="btn btn-primary" onClick={newFrame}>
            <Plus size={16} /> New frame
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              const f = [...e.target.files]
              e.target.value = ''
              if (f.length) uploadMany(f)
            }}
          />
        </div>
      </div>

      {extrasError && (
        <div className="notice error">
          The storyboard tables are not set up yet. Run the updated SQL file in Supabase, then refresh. ({extrasError})
        </div>
      )}

      <div className="toolbar-row">
        <div className="seg" role="group" aria-label="View">
          <button className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')}>
            <LayoutGrid size={14} /> Cards
          </button>
          <button className={view === 'sequence' ? 'on' : ''} onClick={() => setView('sequence')} disabled={!frames.length}>
            <Rows3 size={14} /> Full sequence
          </button>
        </div>
        <select className="input compact" value={sceneFilter} onChange={(e) => setSceneFilter(e.target.value)} aria-label="Filter by scene">
          <option value="all">All scenes</option>
          {scenes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.number}. {s.heading || 'Untitled scene'}
            </option>
          ))}
          <option value="none">No scene</option>
        </select>
        <label className="inline-select">
          <span className="meta-text">Frame shape</span>
          <select className="input compact" value={boardRatio} onChange={(e) => setBoardRatio(e.target.value)}>
            {RATIOS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
        <span className="tb-spacer" />
        <span className="meta-text">
          {onBoard.length} {onBoard.length === 1 ? 'frame' : 'frames'}, {onBoard.length - notInList.length} in the shot list
        </span>
        {notInList.length > 0 && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              notInList.forEach((s) => shots.update(s.id, { in_list: true }))
              toast(`${notInList.length} added to the shot list`)
            }}
          >
            <ListChecks size={15} /> Add all to shot list
          </button>
        )}
      </div>

      {frames.length === 0 ? (
        <div className="empty dropzone">
          <h2>{onBoard.length ? 'No frames in this scene yet' : 'Start your storyboard'}</h2>
          <p>
            Click New frame to start with a blank one you can draw on, or drag pictures here. Each picture becomes a frame.
            Photos, phone sketches, and screenshots all work.
          </p>
          <button className="btn btn-primary" onClick={newFrame}>
            <Plus size={16} /> New frame
          </button>
          {scenes.length === 0 && (
            <p className="field-note">
              Tip: write your script first and your scenes will be ready to attach frames to.{' '}
              <Link className="text-link" to={`/project/${project.id}/script`}>
                Open the script
              </Link>
            </p>
          )}
        </div>
      ) : view === 'sequence' ? (
        <Sequence frames={frames} labels={shotLabels} ratio={ratio} scenes={scenes} />
      ) : (
        <div className="sb-grid">
          {frames.map((s) => (
            <Card
              key={s.id}
              shot={s}
              label={shotLabels.get(s.id) || '—'}
              ratio={ratio}
              scene={sceneById.get(s.scene_id)}
              dragging={dragId === s.id}
              over={overId === s.id && dragId && dragId !== s.id}
              fileOver={fileOverId === s.id}
              onOpen={() => setEditing(s.id)}
              handlers={{
                onDragStart: (e) => {
                  setDragId(s.id)
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', s.id)
                },
                onDragOver: (e) => {
                  if (hasFiles(e)) {
                    e.preventDefault()
                    e.stopPropagation()
                    setFileOverId(s.id)
                  } else if (dragId) {
                    e.preventDefault()
                    setOverId(s.id)
                  }
                },
                onDragLeave: () => {
                  setOverId((o) => (o === s.id ? null : o))
                  setFileOverId((o) => (o === s.id ? null : o))
                },
                onDrop: (e) => {
                  if (hasFiles(e)) {
                    e.preventDefault()
                    e.stopPropagation()
                    setFileOverId(null)
                    const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/'))
                    if (f) actions.setImage(s.id, f).then(() => toast('Picture added to frame'))
                  } else {
                    e.preventDefault()
                    reorder(s.id)
                  }
                  setDragId(null)
                  setOverId(null)
                },
                onDragEnd: () => {
                  setDragId(null)
                  setOverId(null)
                },
              }}
              menuItems={[
                { label: 'Edit frame', onClick: () => setEditing(s.id) },
                { label: s.in_list ? 'Remove from shot list' : 'Add to shot list', onClick: () => shots.update(s.id, { in_list: !s.in_list }) },
                { label: 'Duplicate', onClick: () => actions.duplicate(s) },
                { label: 'Move earlier', onClick: () => moveBy(s, -1) },
                { label: 'Move later', onClick: () => moveBy(s, 1) },
                { divider: true },
                s.in_list && { label: 'Remove from storyboard only', onClick: () => shots.update(s.id, { on_board: false }) },
                { label: 'Delete', danger: true, onClick: () => setConfirm(s) },
              ]}
            />
          ))}
        </div>
      )}

      {editing && <FrameEditor shotId={editing} ids={ids} onNavigate={setEditing} onClose={() => setEditing(null)} />}
      {confirm && (
        <ConfirmModal
          title="Delete this frame?"
          danger
          confirmLabel="Delete"
          message={confirm.in_list ? 'It is also in your shot list, so this removes it from both.' : 'This frame will be deleted.'}
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
