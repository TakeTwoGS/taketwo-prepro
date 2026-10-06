import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronLeft, ChevronRight, Copy, Eraser, ImagePlus, Pencil, Trash2, Undo2 } from 'lucide-react'
import { Modal, ConfirmModal } from './Modal.jsx'
import FrameImage from './FrameImage.jsx'
import Hint from './Hint.jsx'
import { AreaField, SelectField, TextField, sceneOptions } from './Fields.jsx'
import { useProject } from '../pages/ProjectLayout.jsx'
import { useAuth } from '../lib/auth.jsx'
import { useShotActions } from '../lib/shotActions.js'
import { ANGLES, MOVEMENTS, SIZES, hintFor, ratioOf } from '../lib/shots.js'

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

  const [tool, setTool] = useState('none') // none | pen | arrow
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
              if ([...e.dataTransfer.types].includes('Files')) e.preventDefault()
            }}
            onDrop={(e) => {
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
              marks={shot.marks}
              ratio={ratio}
              draft={draft.current}
              blankText="Blank frame. Draw on it, or add a picture."
              className="fe-stage"
            >
              {tool !== 'none' && (
                <div className={'fe-capture ' + tool} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
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
          <p className="field-note">
            {tool === 'none'
              ? 'Tip: drag a picture onto the frame, or paste one. Use Draw and Arrow to show where people or the camera move. The picture is cropped to the frame shape.'
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
