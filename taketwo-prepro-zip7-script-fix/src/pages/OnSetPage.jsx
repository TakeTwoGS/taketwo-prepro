import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, ChevronLeft, ChevronRight, Expand, ListChecks, Maximize2, RotateCcw, SkipForward, Star, ThumbsDown, ThumbsUp, Undo2, X } from 'lucide-react'
import { useProject } from './ProjectLayout.jsx'
import FrameImage from '../components/FrameImage.jsx'
import { Modal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { titleCase } from '../lib/breakdown.js'
import { ratioOf, shotCast, shotLocation, sizeAbbr } from '../lib/shots.js'

const DONE = new Set(['Completed'])
const RATING = { good: 'Good', bad: 'Bad', favorite: 'Favorite' }

// Keeps the screen from going to sleep while filming
export function useWakeLock() {
  useEffect(() => {
    let lock = null
    let dead = false
    const ask = async () => {
      try {
        if ('wakeLock' in navigator && document.visibilityState === 'visible') lock = await navigator.wakeLock.request('screen')
      } catch {
        /* not supported: fine */
      }
    }
    ask()
    const again = () => !dead && ask()
    document.addEventListener('visibilitychange', again)
    return () => {
      dead = true
      document.removeEventListener('visibilitychange', again)
      lock?.release?.().catch(() => {})
    }
  }, [])
}

export function toggleFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen?.()
  } catch {
    /* ignore */
  }
}

export default function OnSetPage() {
  const { project, analysis, shots, shotLabels, takes, days, sceneInfo, slate, updateSlate, canEdit, boardRatio } = useProject()
  const toast = useToast()
  const nav = useNavigate()
  useWakeLock()

  const storeKey = `prepro:onset:${project.id}`
  const [dayId, setDayId] = useState(() => {
    try {
      return localStorage.getItem(storeKey) || 'all'
    } catch {
      return 'all'
    }
  })
  const [skipped, setSkipped] = useState(() => new Set())
  const [form, setForm] = useState({ rating: '', director: '', continuity: '' })
  const [picker, setPicker] = useState(false)
  const [last, setLast] = useState(null) // what to undo
  const ratio = ratioOf(boardRatio)
  const scenesById = useMemo(() => new Map(analysis.scenes.map((s) => [s.id, s])), [analysis.scenes])

  const day = days.rows.find((d) => d.id === dayId) || null
  // The order to film in: the shot list order, or the chosen day's scene order
  const queue = useMemo(() => {
    const list = shots.rows.filter((s) => s.in_list)
    if (!day) return list
    const order = (day.scene_ids || []).filter((id) => scenesById.has(id))
    const rank = new Map(order.map((id, i) => [id, i]))
    return list.filter((s) => rank.has(s.scene_id)).sort((a, b) => rank.get(a.scene_id) - rank.get(b.scene_id) || a.position - b.position)
  }, [shots.rows, day, scenesById])

  const doneCount = queue.filter((s) => DONE.has(s.status)).length
  const pct = queue.length ? Math.round((doneCount / queue.length) * 100) : 0

  const byId = new Map(queue.map((s) => [s.id, s]))
  const nextPending = (fromIndex) => {
    for (let k = 1; k <= queue.length; k++) {
      const s = queue[(fromIndex + k) % queue.length]
      if (s && !DONE.has(s.status) && !skipped.has(s.id)) return s
    }
    return null
  }
  const current = byId.get(slate.shot_id) || null

  // Pick a starting shot, and keep the slate pointing at a real one
  useEffect(() => {
    if (!canEdit) return
    if (!current) {
      const first = queue.find((s) => !DONE.has(s.status) && !skipped.has(s.id)) || null
      if (first) updateSlate({ shot_id: first.id, take: nextTakeNumber(first.id) })
      else if (slate.shot_id) updateSlate({ shot_id: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, current])

  const shotTakes = (id) => takes.rows.filter((t) => t.shot_id === id).sort((a, b) => a.take_number - b.take_number)
  function nextTakeNumber(id) {
    const list = takes.rows.filter((t) => t.shot_id === id)
    return list.length ? Math.max(...list.map((t) => t.take_number)) + 1 : 1
  }
  const take = slate.take || (current ? nextTakeNumber(current.id) : 1)

  function goTo(shot) {
    setForm({ rating: '', director: '', continuity: '' })
    if (shot) updateSlate({ shot_id: shot.id, take: nextTakeNumber(shot.id) })
    else updateSlate({ shot_id: null })
  }

  function chooseDay(id) {
    setDayId(id)
    setSkipped(new Set())
    try {
      localStorage.setItem(storeKey, id)
    } catch {
      /* fine */
    }
    updateSlate({ shot_id: null })
  }

  async function logTake(defaultRating) {
    if (!current) return null
    try {
      return await takes.add({
        shot_id: current.id,
        take_number: take,
        rating: form.rating || defaultRating,
        director_note: form.director.trim(),
        continuity_note: form.continuity.trim(),
      })
    } catch (e) {
      toast(e.message || 'Could not save that take.', 'error')
      return null
    }
  }

  async function anotherTake() {
    if (!current) return
    const before = current.status
    const row = await logTake('')
    if (!row) return
    if (current.status !== 'Filming') shots.update(current.id, { status: 'Filming' })
    setLast({ shotId: current.id, takeId: row.id, status: before, slateTake: take })
    setForm({ rating: '', director: '', continuity: '' })
    updateSlate({ take: take + 1 })
  }

  async function finish(status, defaultRating) {
    if (!current) return
    const idx = queue.findIndex((s) => s.id === current.id)
    const before = current.status
    const row = await logTake(defaultRating)
    if (!row) return
    shots.update(current.id, { status })
    setLast({ shotId: current.id, takeId: row.id, status: before, slateTake: take, wasShot: current.id })
    const nxt = nextPending(idx)
    goTo(nxt && nxt.id !== current.id ? nxt : null)
  }

  function skip() {
    if (!current) return
    const idx = queue.findIndex((s) => s.id === current.id)
    const nextSkipped = new Set(skipped).add(current.id)
    setSkipped(nextSkipped)
    let nxt = null
    for (let k = 1; k <= queue.length; k++) {
      const s = queue[(idx + k) % queue.length]
      if (s && !DONE.has(s.status) && !nextSkipped.has(s.id)) {
        nxt = s
        break
      }
    }
    if (!nxt) {
      // everything left was skipped: start over with the skipped ones
      setSkipped(new Set())
      nxt = queue.find((s) => !DONE.has(s.status) && s.id !== current.id) || null
    }
    goTo(nxt)
  }

  async function undo() {
    if (!last) return
    try {
      await takes.remove(last.takeId)
    } catch {
      /* already gone */
    }
    shots.update(last.shotId, { status: last.status })
    updateSlate({ shot_id: last.shotId, take: last.slateTake })
    setForm({ rating: '', director: '', continuity: '' })
    setLast(null)
  }

  const scene = current ? scenesById.get(current.scene_id) : null
  const history = current ? shotTakes(current.id) : []
  const label = current ? shotLabels.get(current.id) || '—' : ''
  const fullyDone = queue.length > 0 && doneCount === queue.length
  const pos = current ? queue.findIndex((s) => s.id === current.id) : -1

  function step(dir) {
    if (!queue.length) return
    const i = pos < 0 ? 0 : (pos + dir + queue.length) % queue.length
    goTo(queue[i])
  }

  return (
    <div className="onset" role="application" aria-label="On-set mode">
      <header className="onset-top">
        <button className="onset-btn ghost" onClick={() => nav(`/project/${project.id}`)} aria-label="Leave on-set mode">
          <X size={20} /> Exit
        </button>
        <div className="onset-progress">
          <strong>
            {doneCount} / {queue.length} shots completed
          </strong>
          <div className="progress" aria-hidden="true">
            <span style={{ width: pct + '%' }} />
          </div>
        </div>
        <select className="onset-select" value={dayId} onChange={(e) => chooseDay(e.target.value)} aria-label="Shoot day">
          <option value="all">All shots</option>
          {days.rows.map((d) => (
            <option key={d.id} value={d.id}>
              {d.label}
            </option>
          ))}
        </select>
        <button className="onset-btn ghost" onClick={() => setPicker(true)} aria-label="Choose a shot">
          <ListChecks size={20} />
        </button>
        <button className="onset-btn ghost" onClick={() => nav(`/project/${project.id}/slate`)}>
          Slate
        </button>
        <button className="onset-btn ghost" onClick={toggleFullscreen} aria-label="Full screen">
          <Maximize2 size={18} />
        </button>
      </header>

      {!canEdit && <div className="onset-note">You have view-only access. You can follow along, but taking notes needs edit access.</div>}

      {queue.length === 0 ? (
        <div className="onset-empty">
          <h2>No shots to film</h2>
          <p>
            {day
              ? 'This shoot day has no shots yet. Put scenes on the day in the Schedule, and shots for those scenes in the shot list.'
              : 'Add shots to your shot list first. On-Set Mode walks you through them one at a time.'}
          </p>
          <button className="onset-btn" onClick={() => nav(`/project/${project.id}/shots`)}>
            Open the shot list
          </button>
        </div>
      ) : fullyDone || !current ? (
        <div className="onset-empty">
          <h2>{fullyDone ? 'That is a wrap' : 'Nothing left to film here'}</h2>
          <p>
            {fullyDone
              ? 'Every shot in this list is completed. Great work.'
              : 'Everything left was skipped or is already done. Pick a shot from the list to go back.'}
          </p>
          <button className="onset-btn" onClick={() => setPicker(true)}>
            See all shots
          </button>
        </div>
      ) : (
        <main className="onset-main">
          <section className="onset-shot">
            <div className="onset-ids">
              <div className="onset-scene">SCENE {scene ? scene.number : '—'}</div>
              <div className="onset-shotno">SHOT {label}</div>
              <div className="onset-size">{current.size || 'No shot size set'}</div>
            </div>
            <div className="onset-pic">
              <FrameImage path={current.image_path} marks={current.marks} ratio={ratio} blankText="No storyboard picture" />
            </div>
            <div className="onset-facts">
              <div>
                <span>Lens</span>
                {current.lens || '—'}
              </div>
              <div>
                <span>Camera</span>
                {current.camera || '—'}
              </div>
              <div>
                <span>Frame rate</span>
                {current.fps || '—'}
              </div>
              <div>
                <span>Movement</span>
                {current.movement || '—'}
              </div>
            </div>
            <div className="onset-notes">
              <span>Notes</span>
              {current.description || current.notes ? (
                <p>
                  {current.description}
                  {current.description && current.notes ? ' ' : ''}
                  {current.notes}
                </p>
              ) : (
                <p className="faint">No notes for this shot.</p>
              )}
              {current.dialogue && <p className="onset-dia">“{current.dialogue}”</p>}
              <p className="onset-meta">
                {[shotCast(current, scene) && `Cast: ${titleCase(shotCast(current, scene))}`, shotLocation(current, scene) && `At: ${titleCase(shotLocation(current, scene))}`, sizeAbbr(current.size)]
                  .filter(Boolean)
                  .join('   ')}
              </p>
            </div>
          </section>

          <section className="onset-take">
            <div className="onset-take-head">
              <div className="onset-takeno">
                <span>TAKE</span>
                {take}
              </div>
              <div className="onset-nav">
                <button className="onset-btn ghost" onClick={() => step(-1)} aria-label="Previous shot">
                  <ChevronLeft size={22} />
                </button>
                <button className="onset-btn ghost" onClick={() => step(1)} aria-label="Next shot">
                  <ChevronRight size={22} />
                </button>
              </div>
            </div>

            <div className="onset-rate" role="group" aria-label="How was this take?">
              <button className={'rate good' + (form.rating === 'good' ? ' on' : '')} aria-pressed={form.rating === 'good'} onClick={() => setForm((f) => ({ ...f, rating: f.rating === 'good' ? '' : 'good' }))}>
                <ThumbsUp size={20} /> Good
              </button>
              <button className={'rate bad' + (form.rating === 'bad' ? ' on' : '')} aria-pressed={form.rating === 'bad'} onClick={() => setForm((f) => ({ ...f, rating: f.rating === 'bad' ? '' : 'bad' }))}>
                <ThumbsDown size={20} /> Bad
              </button>
              <button
                className={'rate fav' + (form.rating === 'favorite' ? ' on' : '')}
                aria-pressed={form.rating === 'favorite'}
                onClick={() => setForm((f) => ({ ...f, rating: f.rating === 'favorite' ? '' : 'favorite' }))}
              >
                <Star size={20} /> Favorite
              </button>
            </div>

            <label className="onset-label" htmlFor="os-dir">
              Director note
            </label>
            <textarea id="os-dir" className="onset-input" rows={2} value={form.director} onChange={(e) => setForm((f) => ({ ...f, director: e.target.value }))} placeholder="Great energy. Try it slower." />
            <label className="onset-label" htmlFor="os-con">
              Continuity note
            </label>
            <textarea id="os-con" className="onset-input" rows={2} value={form.continuity} onChange={(e) => setForm((f) => ({ ...f, continuity: e.target.value }))} placeholder="Coffee cup in left hand. Door open." />

            {history.length > 0 && (
              <div className="onset-history">
                <span>Takes so far</span>
                <ul>
                  {history.map((t) => (
                    <li key={t.id} className={'h-' + (t.rating || 'none')}>
                      <strong>Take {t.take_number}</strong>
                      <em>{RATING[t.rating] || 'No rating'}</em>
                      {(t.director_note || t.continuity_note) && <small>{[t.director_note, t.continuity_note].filter(Boolean).join(' / ')}</small>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        </main>
      )}

      {current && !fullyDone && (
        <footer className="onset-actions">
          <button className="act complete" onClick={() => finish('Completed', 'good')} disabled={!canEdit}>
            <Check size={26} /> COMPLETE
          </button>
          <button className="act another" onClick={anotherTake} disabled={!canEdit}>
            <RotateCcw size={24} /> ANOTHER TAKE
          </button>
          <button className="act reshoot" onClick={() => finish('Needs Reshoot', 'bad')} disabled={!canEdit}>
            <Expand size={24} /> NEEDS RESHOOT
          </button>
          <button className="act skip" onClick={skip}>
            <SkipForward size={24} /> SKIP
          </button>
          {last && (
            <button className="act undo" onClick={undo} disabled={!canEdit}>
              <Undo2 size={20} /> Undo last
            </button>
          )}
        </footer>
      )}

      {picker && (
        <Modal title="Choose a shot" onClose={() => setPicker(false)} wide>
          <ul className="picker">
            {queue.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => {
                    setSkipped((x) => {
                      const n = new Set(x)
                      n.delete(s.id)
                      return n
                    })
                    goTo(s)
                    setPicker(false)
                  }}
                  className={slate.shot_id === s.id ? 'on' : ''}
                >
                  <strong>{shotLabels.get(s.id) || '—'}</strong>
                  <span>{s.description || s.size || 'No description'}</span>
                  <em className={'st st-' + s.status.toLowerCase().replace(/\s+/g, '-')}>{s.status}</em>
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}
    </div>
  )
}
