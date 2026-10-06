import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUp, GripVertical, Moon, Sun } from 'lucide-react'
import { useProject } from './ProjectLayout.jsx'
import Hint from '../components/Hint.jsx'
import { fmtPages, reorderScenes } from '../lib/screenplay.js'

const FIELDS = [
  { key: 'description', label: 'Scene description', rows: 3, hint: 'A short summary of what happens in this scene.' },
  { key: 'props', label: 'Props', rows: 2, hint: 'Objects the actors touch or use, like a phone, a cup, or a backpack.' },
  { key: 'wardrobe', label: 'Wardrobe', rows: 2, hint: 'What each character wears in this scene. Also called costume.' },
  { key: 'equipment', label: 'Equipment', rows: 2, hint: 'Camera, lights, sound gear, or anything special you need for this scene.' },
  { key: 'effects', label: 'Special effects', rows: 2, hint: 'Anything that is not just filming real life, like rain, smoke, or a visual effect added later.' },
  { key: 'makeup', label: 'Makeup', rows: 2, hint: 'Makeup or hair needs, like a bruise, tired eyes, or a wig.' },
  { key: 'notes', label: 'Production notes', rows: 3, hint: 'Anything the crew should remember about this scene.' },
]

export default function ScenesPage() {
  const { project, analysis, blocksRef, commit, sceneInfo, updateSceneInfo } = useProject()
  const { scenes } = analysis
  const [selectedId, setSelectedId] = useState(null)
  const [dragFrom, setDragFrom] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const selected = scenes.find((s) => s.id === selectedId) || null
  useEffect(() => {
    if (selectedId && !scenes.some((s) => s.id === selectedId)) setSelectedId(null)
  }, [scenes, selectedId])

  function move(from, to) {
    if (to < 0 || to >= scenes.length) return
    commit(reorderScenes(blocksRef.current, from, to))
  }

  const info = (selected && sceneInfo[selected.id]) || {}

  if (scenes.length === 0)
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Scenes</h1>
            <p className="muted-text">Your scene list, built from your script.</p>
          </div>
        </div>
        <div className="empty">
          <h2>No scenes yet</h2>
          <p>Scenes appear here as soon as your script has a scene heading, like INT. KITCHEN - NIGHT.</p>
          <Link className="btn btn-primary" to={`/project/${project.id}/script`}>
            Open the script editor
          </Link>
        </div>
      </div>
    )

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Scenes</h1>
          <p className="muted-text">Drag scenes to change their order. The script reorders to match.</p>
        </div>
      </div>

      <div className="scenes-layout">
        <ol className="scene-list">
          {scenes.map((s, i) => (
            <li
              key={s.id}
              className={
                'scene-card' + (selectedId === s.id ? ' selected' : '') + (dragOver === i && dragFrom !== i ? ' drop' : '')
              }
              draggable
              onDragStart={(e) => {
                setDragFrom(i)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', String(i))
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(i)
              }}
              onDragLeave={() => setDragOver((d) => (d === i ? null : d))}
              onDrop={(e) => {
                e.preventDefault()
                if (dragFrom !== null && dragFrom !== i) move(dragFrom, i)
                setDragFrom(null)
                setDragOver(null)
              }}
              onDragEnd={() => {
                setDragFrom(null)
                setDragOver(null)
              }}
            >
              <span className="grip" aria-hidden="true">
                <GripVertical size={16} />
              </span>
              <button className="scene-main" onClick={() => setSelectedId(s.id)}>
                <span className="scene-num">{s.number}</span>
                <span className="scene-body">
                  <span className="scene-heading">{s.heading || 'Untitled scene'}</span>
                  <span className="scene-meta">
                    {s.intExt && <span className={'chip small ' + (s.intExt === 'EXT' ? 'tone-pink' : 'tone-violet')}>{s.intExt}</span>}
                    {s.time && (
                      <span className={'chip small ' + (s.tod === 'night' ? 'tone-blue' : s.tod === 'day' ? 'tone-amber' : '')}>
                        {s.tod === 'night' && <Moon size={11} />}
                        {s.tod === 'day' && <Sun size={11} />}
                        {s.time}
                      </span>
                    )}
                    <span className="meta-text">{fmtPages(s.pages)} pages</span>
                    {s.characters.length > 0 && <span className="meta-text">{s.characters.join(', ')}</span>}
                  </span>
                </span>
              </button>
              <span className="move-btns">
                <button className="icon-btn" aria-label={`Move scene ${s.number} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                  <ArrowUp size={16} />
                </button>
                <button
                  className="icon-btn"
                  aria-label={`Move scene ${s.number} down`}
                  disabled={i === scenes.length - 1}
                  onClick={() => move(i, i + 1)}
                >
                  <ArrowDown size={16} />
                </button>
              </span>
            </li>
          ))}
        </ol>

        <section className="scene-detail card pad" aria-live="polite">
          {!selected ? (
            <div className="detail-empty">
              <h2 className="card-title">Scene details</h2>
              <p className="muted-text">Select a scene to add props, wardrobe, notes, and more. You only type it once, and it stays attached to the scene.</p>
            </div>
          ) : (
            <>
              <div className="detail-head">
                <div>
                  <div className="muted-text">Scene {selected.number}</div>
                  <h2 className="card-title">{selected.heading || 'Untitled scene'}</h2>
                </div>
                <Link className="btn btn-ghost btn-sm" to={`/project/${project.id}/script?scene=${selected.id}`}>
                  Open in script
                </Link>
              </div>

              <dl className="facts">
                <div>
                  <dt>
                    Inside or outside <Hint text="INT. means the scene is inside. EXT. means it is outside." />
                  </dt>
                  <dd>{selected.intExt === 'INT' ? 'Interior' : selected.intExt === 'EXT' ? 'Exterior' : selected.intExt ? 'Both' : 'Not set'}</dd>
                </div>
                <div>
                  <dt>Time of day</dt>
                  <dd>{selected.time || 'Not set'}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{selected.location || 'Not set'}</dd>
                </div>
                <div>
                  <dt>Cast in this scene</dt>
                  <dd>{selected.characters.length ? selected.characters.join(', ') : 'No one speaks yet'}</dd>
                </div>
              </dl>

              {FIELDS.map((f) => (
                <div key={f.key} className="field">
                  <label className="label" htmlFor={`f-${f.key}`}>
                    {f.label} <Hint text={f.hint} />
                  </label>
                  <textarea
                    id={`f-${f.key}`}
                    className="textarea"
                    rows={f.rows}
                    value={info[f.key] || ''}
                    onChange={(e) => updateSceneInfo(selected.id, f.key, e.target.value)}
                  />
                </div>
              ))}

              <div className="field narrow">
                <label className="label" htmlFor="f-minutes">
                  Estimated shooting time (minutes){' '}
                  <Hint text="Your best guess for how long this scene takes to film, including setup. You will get better at guessing." />
                </label>
                <input
                  id="f-minutes"
                  className="input"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={info.minutes || ''}
                  onChange={(e) => updateSceneInfo(selected.id, 'minutes', e.target.value)}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
