import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Maximize2, Minus, Plus, X } from 'lucide-react'
import { useProject } from './ProjectLayout.jsx'
import { toggleFullscreen, useWakeLock } from './OnSetPage.jsx'

function Field({ label, value, onChange, big, readOnly, canEdit }) {
  return (
    <div className={'slate-cell' + (big ? ' big' : '')}>
      <span>{label}</span>
      <input value={value} onChange={(e) => onChange?.(e.target.value)} readOnly={readOnly || !canEdit || !onChange} aria-label={label} />
    </div>
  )
}

// A digital clapperboard. It follows whatever shot On-Set Mode is on, so the two always agree.
export default function SlatePage() {
  const { project, analysis, shots, shotLabels, people, slate, updateSlate, canEdit } = useProject()
  const nav = useNavigate()
  useWakeLock()
  const [flash, setFlash] = useState(false)

  const shot = shots.rows.find((s) => s.id === slate.shot_id) || null
  const scene = shot ? analysis.scenes.find((s) => s.id === shot.scene_id) : null
  const directorGuess = people.rows.find((p) => /director/i.test(p.role || ''))?.name || ''
  const director = slate.director ?? directorGuess
  const camera = slate.camera ?? (shot?.camera || 'A Cam')
  const fps = slate.fps ?? (shot?.fps || '24')
  const sceneText = shot ? (scene ? String(scene.number) : '—') : slate.scene ?? ''
  const shotText = shot ? shotLabels.get(shot.id) || '—' : slate.shotLabel ?? ''
  const take = slate.take || 1
  const date = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })

  function clap() {
    setFlash(true)
    setTimeout(() => setFlash(false), 160)
  }

  return (
    <div className={'slate' + (flash ? ' flash' : '')} role="application" aria-label="Digital slate">
      <header className="slate-top">
        <button className="onset-btn ghost" onClick={() => nav(`/project/${project.id}/onset`)}>
          <X size={20} /> On-Set Mode
        </button>
        <span className="tb-spacer" />
        <button className="onset-btn ghost" onClick={toggleFullscreen} aria-label="Full screen">
          <Maximize2 size={18} />
        </button>
      </header>

      <div className="slate-board">
        <div className="slate-stripe" aria-hidden="true" />
        <div className="slate-grid">
          <Field canEdit={canEdit} label="Production" value={project.title} readOnly />
          <Field canEdit={canEdit} label="Director" value={director} onChange={(v) => updateSlate({ director: v })} />
          <Field canEdit={canEdit} label="Camera" value={camera} onChange={(v) => updateSlate({ camera: v })} />
          <Field canEdit={canEdit} label="Scene" value={sceneText} onChange={shot ? undefined : (v) => updateSlate({ scene: v })} big />
          <Field canEdit={canEdit} label="Shot" value={shotText} onChange={shot ? undefined : (v) => updateSlate({ shotLabel: v })} big />
          <div className="slate-cell take">
            <span>Take</span>
            <div className="take-row">
              <button className="take-btn" onClick={() => updateSlate({ take: Math.max(1, take - 1) })} disabled={!canEdit || take <= 1} aria-label="Previous take number">
                <Minus size={30} />
              </button>
              <output className="take-num" aria-label="Take">
                {take}
              </output>
              <button className="take-btn" onClick={() => updateSlate({ take: take + 1 })} disabled={!canEdit} aria-label="Next take number">
                <Plus size={30} />
              </button>
            </div>
          </div>
          <Field canEdit={canEdit} label="Date" value={date} readOnly />
          <Field canEdit={canEdit} label="FPS" value={fps} onChange={(v) => updateSlate({ fps: v })} />
          <button className="clap" onClick={clap}>
            CLAP
          </button>
        </div>
      </div>
      {!shot && <p className="slate-hint">No shot is selected. Open On-Set Mode and pick a shot, and the scene, shot, and take fill in here.</p>}
    </div>
  )
}
