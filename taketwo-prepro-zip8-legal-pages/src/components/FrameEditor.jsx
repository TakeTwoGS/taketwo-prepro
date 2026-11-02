import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight, Copy, Eraser, FlipHorizontal2, ImagePlus, Pencil, PersonStanding, Trash2, Undo2 } from 'lucide-react'
import { Modal, ConfirmModal } from './Modal.jsx'
import FrameImage from './FrameImage.jsx'
import FigureLayer from './FigureLayer.jsx'
import { FigureThumb } from './Figures.jsx'
import Hint from './Hint.jsx'
import { AreaField, SelectField, TextField, sceneOptions } from './Fields.jsx'
import { useProject } from '../pages/ProjectLayout.jsx'
import { useAuth } from '../lib/auth.jsx'
import { useShotActions } from '../lib/shotActions.js'
import { ANGLES, MOVEMENTS, SIZES, hintFor, ratioOf } from '../lib/shots.js'
import { POSES, newFigure, poseByKey } from '../lib/figures.js'

const COLORS = ['#ffffff', '#f472ff', '#ffc247']
const clamp = (v) => Math.min(1, Math.max(0, v))
const round = (v) => Math.round(v * 10000) / 10000

// The big "edit this frame" window: picture, drawing tools, and all the details
export default function FrameEditor({ shotId, ids = [], onNavigate, onClose }) {
  const { shots } = useProject()
  const shot = shots.rows.find((s) => s.id === shotId)
  if (!shot) return null
  return <Editor shot={shot} ids={ids} onNavigate={onNavigate} onClose={onClose} />
}

function Editor({ shot, ids, onNavigate, onClose }) {
  const { shots, shotLabels, analysis, boardRatio } = useProject()
  const actions = useShotActions()
  const { beginner } = useAuth()
  const ratio = ratioOf(boardRatio)
  const label = shotLabels.get(shot.id) || '—'
  const patch = (p) => shots.update(shot.id, p)

  const [tool, setTool] = useState('none') // none | pen | arrow | fig
  const [selId, setSelId] = useState(null) // the person who is selected
  const [live, setLive] = useState(null) // marks while a person is being dragged
  const [joints, setJoints] = useState(false)
  const [color, setColor] = useState(COLORS[0])
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const stageRef = useRef(null)
  const draft = useRef(null)
  const [, redraw] = useState(0)
  const fileInput = useRef(null)

  const index = ids.indexOf(shot.id)
  const prevId = index > 0 ? ids[index - 1] : null
  const nextId = index >= 0 && index < ids.length - 1 ? ids[index + 1] : null

  async function upload(file) {
    setUploading(true)
    await actions.setImage(shot.id, file)
    setUploading(false)
  }

  // Paste a picture straight in
  useEffect(() => {
    const onPaste = (e) => {
      const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'))
      if (f) {
        e.preventDefault()
        upload(f)
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shot.id])

  // ----- people (posable figures) -----
  const marks = live || shot.marks || []
  const selected = marks.find((m) => m.id === selId && m.t === 'fig') || null
  const updateFig = (id, change) => patch({ marks: (shot.marks || []).map((m) => (m.id === id ? { ...m, ...change } : m)) })
  function addFigure(key, x = 0.5, y = 0.62) {
    const m = newFigure(key, { x, y, color })
    patch({ marks: [...(shot.marks || []), m] })
    setSelId(m.id)
  }
  const removeFigure = (id) => {
    patch({ marks: (shot.marks || []).filter((m) => m.id !== id) })
    setSelId(null)
  }
  function copyFigure(m) {
    const c = { ...newFigure('stand', { x: Math.min(0.95, m.x + 0.07), y: Math.min(0.95, m.y + 0.04), s: m.s, color: m.c }), r: m.r, f: m.f, p: { ...m.p } }
    patch({ marks: [...(shot.marks || []), c] })
    setSelId(c.id)
  }
  const poseKey = selected ? POSES.find((po) => JSON.stringify(po.pose) === JSON.stringify(selected.p))?.key || 'custom' : ''

  useEffect(() => {
    if (tool !== 'fig') {
      setSelId(null)
      setLive(null)
    }
  }, [tool])

  // Delete removes the selected person
  useEffect(() => {
    const onKey = (e) => {
      if (tool !== 'fig' || !selId || !(e.key === 'Delete' || e.key === 'Backspace')) return
      if (/input|textarea|select/i.test(e.target.tagName)) return
      e.preventDefault()
      removeFigure(selId)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, selId, shot.marks])

  // ----- drawing -----
  const point = (e) => {
    const r = stageRef.current.getBoundingClientRect()
    return [round(clamp((e.clientX - r.left) / r.width)), round(clamp((e.clientY - r.top) / r.height))]
  }
  function down(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const p = point(e)
    draft.current = tool === 'pen' ? { t: 'pen', c: color, p: [p] } : { t: 'arrow', c: color, a: p, b: p }
    redraw((n) => n + 1)
  }
  function move(e) {
    const d = draft.current
    if (!d) return
    const p = point(e)
    if (d.t === 'pen') {
      const last = d.p[d.p.length - 1]
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 0.004) return
      d.p.push(p)
    } else d.b = p
    redraw((n) => n + 1)
  }
  function up() {
    const d = draft.current
    draft.current = null
    if (!d) return
    const tiny = d.t === 'arrow' && Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]) < 0.02
    if (!tiny) patch({ marks: [...(shot.marks || []), d] })
    redraw((n) => n + 1)
  }

  const marksCount = (shot.marks || []).length

  return (
    <Modal title={`Frame ${label}`} xl onClose={onClose}>
      <div className="fe">
        <div className="fe-left">
          <div
            className="fe-stagewrap"
            onDragOver={(e) => {
              const t = [...e.dataTransfer.types]
              if (t.includes('Files') || t.includes('application/x-figure')) e.preventDefault()
            }}
            onDrop={(e) => {
              const key = e.dataTransfer.getData('application/x-figure')
              if (key && stageRef.current) {
                e.preventDefault()
                const r = stageRef.current.getBoundingClientRect()
                addFigure(key, round(clamp((e.clientX - r.left) / r.width)), round(clamp((e.clientY - r.top) / r.height)))
                setTool('fig')
                return
              }
              const f = [...e.dataTransfer.files].find((x) => x.type.startsWith('image/'))
              if (f) {
                e.preventDefault()
                upload(f)
              }
            }}
          >
            <FrameImage
              ref={stageRef}
              path={shot.image_path}
              marks={marks}
              ratio={ratio}
              draft={draft.current}
              blankText="Blank frame. Draw on it, or add a picture."
              className="fe-stage"
            >
              {(tool === 'pen' || tool === 'arrow') && (
                <div className={'fe-capture ' + tool} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
              )}
              {tool === 'fig' && (
                <FigureLayer
                  marks={marks}
                  ratio={ratio}
                  selectedId={selId}
                  setSelectedId={setSelId}
                  joints={joints}
                  stageRef={stageRef}
                  onLive={setLive}
                  onCommit={(next) => {
                    patch({ marks: next })
                    setLive(null)
                  }}
                />
              )}
            </FrameImage>
          </div>

          <div className="fe-tools">
            <button type="button" className={'tool-btn' + (tool === 'pen' ? ' on' : '')} onClick={() => setTool(tool === 'pen' ? 'none' : 'pen')}>
              <Pencil size={15} /> Draw
            </button>
            <button type="button" className={'tool-btn' + (tool === 'arrow' ? ' on' : '')} onClick={() => setTool(tool === 'arrow' ? 'none' : 'arrow')}>
              <ArrowUpRight size={15} /> Arrow
            </button>
            <button type="button" className={'tool-btn' + (tool === 'fig' ? ' on' : '')} onClick={() => setTool(tool === 'fig' ? 'none' : 'fig')}>
              <PersonStanding size={15} /> People
            </button>
            <span className="swatches" role="group" aria-label="Drawing color">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={'swatch' + (color === c ? ' on' : '')}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </span>
            <button type="button" className="tool-btn" disabled={!marksCount} onClick={() => patch({ marks: shot.marks.slice(0, -1) })}>
              <Undo2 size={15} /> Undo
            </button>
            <button type="button" className="tool-btn" disabled={!marksCount} onClick={() => patch({ marks: [] })}>
              <Eraser size={15} /> Clear
            </button>
            <span className="tb-spacer" />
            <button type="button" className="tool-btn" onClick={() => fileInput.current?.click()} disabled={uploading}>
              <ImagePlus size={15} /> {uploading ? 'Uploading…' : shot.image_path ? 'Replace picture' : 'Add picture'}
            </button>
            {shot.image_path && (
              <button type="button" className="tool-btn" onClick={() => actions.clearImage(shot.id)}>
                Remove picture
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files[0]
                e.target.value = ''
                if (f) upload(f)
              }}
            />
          </div>
          {tool === 'fig' && (
            <div className="fig-panel">
              <div className="fig-lib">
                <div className="fig-lib-head">
                  Add a person <Hint text="Click a pose to add it, or drag it onto the frame. Then drag the person to move them, use the round handle above to turn them, and the square handle to resize." />
                </div>
                <div className="fig-grid">
                  {POSES.map((po) => (
                    <button
                      key={po.key}
                      type="button"
                      className="fig-pick"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/x-figure', po.key)
                        e.dataTransfer.effectAllowed = 'copy'
                      }}
                      onClick={() => addFigure(po.key)}
                      title={`Add: ${po.name}`}
                    >
                      <FigureThumb pose={po.pose} rotate={po.r || 0} />
                      <span>{po.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="fig-edit">
                {selected ? (
                  <>
                    <div className="fig-edit-title">Selected person</div>
                    <label className="fig-row">
                      <span>Pose</span>
                      <select
                        className="input compact"
                        value={poseKey}
                        onChange={(e) => {
                          if (e.target.value === 'custom') return
                          const po = poseByKey(e.target.value)
                          updateFig(selected.id, { p: { ...po.pose }, ...(po.r != null ? { r: po.r } : {}) })
                        }}
                        aria-label="Pose"
                      >
                        {poseKey === 'custom' && <option value="custom">Custom pose</option>}
                        {POSES.map((po) => (
                          <option key={po.key} value={po.key}>
                            {po.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="fig-row">
                      <span>Size</span>
                      <input type="range" min="0.1" max="1.8" step="0.01" value={selected.s} onChange={(e) => updateFig(selected.id, { s: Number(e.target.value) })} aria-label="Size" />
                    </label>
                    <label className="fig-row">
                      <span>Turn</span>
                      <input type="range" min="-180" max="180" step="1" value={selected.r || 0} onChange={(e) => updateFig(selected.id, { r: Number(e.target.value) })} aria-label="Turn" />
                    </label>
                    <div className="fig-actions">
                      <button type="button" className={'tool-btn' + (joints ? ' on' : '')} onClick={() => setJoints((j) => !j)} aria-pressed={joints}>
                        Move joints
                      </button>
                      <button type="button" className="tool-btn" onClick={() => updateFig(selected.id, { f: !selected.f })}>
                        <FlipHorizontal2 size={15} /> Flip
                      </button>
                      <button type="button" className="tool-btn" onClick={() => copyFigure(selected)}>
                        <Copy size={15} /> Copy
                      </button>
                      <button type="button" className="tool-btn danger-text" onClick={() => removeFigure(selected.id)}>
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>
                    <div className="swatches" role="group" aria-label="Person color">
                      {COLORS.map((c) => (
                        <button key={c} type="button" className={'swatch' + (selected.c === c ? ' on' : '')} style={{ background: c }} onClick={() => updateFig(selected.id, { c })} aria-label={`Color ${c}`} />
                      ))}
                    </div>
                    {joints && <p className="field-note">Drag the round dots on the body to bend elbows, knees, the head, and the back.</p>}
                  </>
                ) : (
                  <p className="field-note">Click a person on the frame to move, turn, resize, or pose them. Turn on Move joints to bend arms and legs.</p>
                )}
              </div>
            </div>
          )}
          <p className="field-note">
            {tool === 'none'
              ? 'Tip: drag a picture onto the frame, or paste one. Use Draw and Arrow to show where people or the camera move. The picture is cropped to the frame shape.'
              : tool === 'fig'
              ? 'People tool on. Click People again when you are done.'
              : tool === 'pen'
              ? 'Drawing on. Click and drag on the frame. Click Draw again when you are done.'
              : 'Arrow on. Click and drag to point from where to where. Click Arrow again when you are done.'}
          </p>
        </div>

        <div className="fe-form">
          <SelectField
            id="fe-scene"
            label="Scene"
            value={shot.scene_id || ''}
            onChange={(v) => patch({ scene_id: v || null })}
            options={sceneOptions(analysis.scenes)}
            empty="No scene yet"
            hint="The scene from your script this shot belongs to. Shot numbers like 4B come from this."
          />
          <div className="two-fields">
            <SelectField
              id="fe-size"
              label="Shot size"
              value={shot.size}
              onChange={(v) => patch({ size: v })}
              options={SIZES.map((s) => s.name)}
              hint="How much of the person or place fits in the frame."
            />
            <SelectField
              id="fe-angle"
              label="Camera angle"
              value={shot.angle}
              onChange={(v) => patch({ angle: v })}
              options={ANGLES.map((s) => s.name)}
              hint="Where the camera sits compared to the subject."
            />
          </div>
          {beginner && (shot.size || shot.angle) && (
            <p className="field-note beginner-note">
              {[hintFor(SIZES, shot.size), hintFor(ANGLES, shot.angle)].filter(Boolean).join(' ')}
            </p>
          )}
          <SelectField
            id="fe-move"
            label="Camera movement"
            value={shot.movement}
            onChange={(v) => patch({ movement: v })}
            options={MOVEMENTS.map((s) => s.name)}
            hint="Whether the camera stays still or moves during the shot."
            note={beginner ? hintFor(MOVEMENTS, shot.movement) : ''}
          />
          <AreaField id="fe-desc" label="Description" value={shot.description} onChange={(v) => patch({ description: v })} rows={3} placeholder="What do we see in this shot?" />
          <AreaField id="fe-dia" label="Dialogue" value={shot.dialogue} onChange={(v) => patch({ dialogue: v })} rows={2} placeholder="Any lines spoken during this shot" />
          <div className="two-fields">
            <TextField
              id="fe-dur"
              label="Estimated duration (seconds)"
              type="number"
              min="0"
              step="0.5"
              inputMode="decimal"
              value={shot.duration ?? ''}
              onChange={(v) => patch({ duration: v === '' ? null : Number(v) })}
            />
          </div>
          <AreaField id="fe-notes" label="Notes" value={shot.notes} onChange={(v) => patch({ notes: v })} rows={2} />

          <div className="check-row stack">
            <label className="check">
              <input type="checkbox" checked={shot.on_board} onChange={(e) => patch({ on_board: e.target.checked })} />
              <span>Show on the storyboard</span>
            </label>
            <label className="check">
              <input type="checkbox" checked={shot.in_list} onChange={(e) => patch({ in_list: e.target.checked })} />
              <span>
                In the shot list <Hint text="A shot list is the checklist of every shot you plan to film. Turn this on to add this frame to it." />
              </span>
            </label>
          </div>

          <div className="fe-actions">
            <button className="btn btn-ghost btn-sm" disabled={!prevId} onClick={() => onNavigate(prevId)}>
              <ChevronLeft size={15} /> Previous
            </button>
            <button className="btn btn-ghost btn-sm" disabled={!nextId} onClick={() => onNavigate(nextId)}>
              Next <ChevronRight size={15} />
            </button>
            <span className="tb-spacer" />
            <button
              className="btn btn-ghost btn-sm"
              onClick={async () => {
                const copy = await actions.duplicate(shot)
                if (copy) onNavigate(copy.id)
              }}
            >
              <Copy size={15} /> Duplicate
            </button>
            <button className="btn btn-ghost btn-sm danger-text" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={15} /> Delete
            </button>
          </div>
        </div>
      </div>
      {confirmDelete && (
        <ConfirmModal
          title="Delete this frame?"
          danger
          confirmLabel="Delete"
          message="This removes it from the storyboard and the shot list."
          onClose={() => setConfirmDelete(false)}
          onConfirm={async () => {
            setConfirmDelete(false)
            onClose()
            await actions.deleteShot(shot)
          }}
        />
      )}
    </Modal>
  )
}
