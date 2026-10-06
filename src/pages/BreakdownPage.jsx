import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { useProject } from './ProjectLayout.jsx'
import Hint from '../components/Hint.jsx'
import { ConfirmModal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { CATEGORIES, CATEGORY_KEYS, colorOf, resolveTags, segmentsFor, summarize } from '../lib/breakdown.js'

const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`
}

const blockOf = (node) => {
  const el = node && node.nodeType === 3 ? node.parentElement : node
  return el && el.closest ? el.closest('[data-bid]') : null
}

export default function BreakdownPage() {
  const { project, blocks, analysis, tags, extrasError } = useProject()
  const toast = useToast()
  const scriptRef = useRef(null)

  const [selection, setSelection] = useState(null) // { blockId, start, end, text } | { invalid: true }
  const [activeTagId, setActiveTagId] = useState(null)
  const [hidden, setHidden] = useState(() => new Set())
  const [tab, setTab] = useState('category')
  const [manual, setManual] = useState({ category: 'Prop', text: '', scene: '' })
  const [confirm, setConfirm] = useState(null)

  const resolved = useMemo(() => resolveTags(blocks, tags.rows, analysis.scenes), [blocks, tags.rows, analysis.scenes])
  const summary = useMemo(() => summarize(resolved, tags.rows, analysis), [resolved, tags.rows, analysis])
  const activeTag = tags.rows.find((t) => t.id === activeTagId) || null

  // Watch what the person has highlighted in the script
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection()
      const root = scriptRef.current
      if (!sel || !root || sel.isCollapsed || !sel.rangeCount) return setSelection(null)
      const range = sel.getRangeAt(0)
      if (!root.contains(range.commonAncestorContainer)) return setSelection(null)
      const a = blockOf(range.startContainer)
      const b = blockOf(range.endContainer)
      if (!a || a !== b) return setSelection({ invalid: true })
      const pre = document.createRange()
      pre.selectNodeContents(a)
      pre.setEnd(range.startContainer, range.startOffset)
      const raw = range.toString()
      const lead = raw.length - raw.trimStart().length
      const text = raw.trim()
      if (!text) return setSelection(null)
      const start = pre.toString().length + lead
      setSelection({ blockId: a.dataset.bid, start, end: start + text.length, text })
      setActiveTagId(null)
    }
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [])

  async function tagSelection(category) {
    const sel = selection
    if (!sel || sel.invalid) return
    const existing = resolved.placed.get(sel.blockId) || []
    if (existing.some((it) => sel.start < it.end && sel.end > it.start)) {
      toast('That text is already tagged. Click the highlight to change or remove it.', 'error')
      return
    }
    try {
      await tags.add({ category, text: sel.text, block_id: sel.blockId, start_idx: sel.start, end_idx: sel.end, scene_id: null })
      window.getSelection()?.removeAllRanges()
      setSelection(null)
    } catch (e) {
      toast(e.message || 'Could not save that tag.', 'error')
    }
  }

  async function removeTags(ids) {
    try {
      await tags.removeMany(ids)
      setActiveTagId(null)
    } catch (e) {
      toast(e.message || 'Could not remove that.', 'error')
    }
  }

  async function addManual(e) {
    e.preventDefault()
    if (!manual.text.trim()) return
    try {
      await tags.add({ category: manual.category, text: manual.text.trim(), block_id: null, start_idx: null, end_idx: null, scene_id: manual.scene || null })
      setManual((m) => ({ ...m, text: '' }))
    } catch (err) {
      toast(err.message || 'Could not add that.', 'error')
    }
  }

  const toggleHidden = (key) =>
    setHidden((h) => {
      const n = new Set(h)
      n.has(key) ? n.delete(key) : n.add(key)
      return n
    })

  const hasText = blocks.some((b) => (b.text || '').trim())

  if (!hasText)
    return (
      <div className="page">
        <div className="page-head">
          <div>
            <h1>Script breakdown</h1>
            <p className="muted-text">Pick out everything your scenes need.</p>
          </div>
        </div>
        <div className="empty">
          <h2>Write some script first</h2>
          <p>The breakdown reads your script. Once it has scenes, you can highlight props, costumes, vehicles, and more.</p>
          <Link className="btn btn-primary" to={`/project/${project.id}/script`}>
            Open the script editor
          </Link>
        </div>
      </div>
    )

  return (
    <div className="bd-layout">
      <section className="bd-script-col" aria-label="Script">
        <div className="bd-bar">
          {selection && !selection.invalid ? (
            <div className="bd-bar-inner">
              <span className="bd-sel">
                Tag “{selection.text.length > 40 ? selection.text.slice(0, 40) + '…' : selection.text}” as:
              </span>
              <div className="bd-cats">
                {CATEGORIES.map((c) => (
                  <button key={c.key} className="bd-cat" style={{ '--c': c.color }} onMouseDown={(e) => e.preventDefault()} onClick={() => tagSelection(c.key)}>
                    {c.key}
                  </button>
                ))}
              </div>
            </div>
          ) : selection?.invalid ? (
            <div className="bd-hint">Select words within a single line of the script.</div>
          ) : activeTag ? (
            <div className="bd-bar-inner">
              <span className="bd-sel">
                <span className="dot" style={{ background: colorOf(activeTag.category) }} /> {activeTag.category}: “{activeTag.text}”
              </span>
              <div className="bd-cats">
                <select
                  className="input compact"
                  value={activeTag.category}
                  onChange={(e) => tags.update(activeTag.id, { category: e.target.value })}
                  aria-label="Change category"
                >
                  {CATEGORY_KEYS.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                <button className="btn btn-ghost btn-sm" onClick={() => removeTags([activeTag.id])}>
                  Remove tag
                </button>
                <button className="icon-btn" onClick={() => setActiveTagId(null)} aria-label="Close">
                  <X size={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className="bd-hint">
              Highlight words in the script, then pick a category. Tagged words are color coded.{' '}
              <Hint text="A script breakdown lists everything a scene needs, like props, costumes, and vehicles, so nothing is forgotten on shoot day." />
            </div>
          )}
        </div>

        <div className="bd-legend" role="group" aria-label="Show or hide categories">
          {CATEGORIES.map((c) => (
            <button key={c.key} className={'bd-chip' + (hidden.has(c.key) ? ' off' : '')} style={{ '--c': c.color }} onClick={() => toggleHidden(c.key)} title={c.hint}>
              <span className="dot" /> {c.key}
            </button>
          ))}
        </div>

        <div className="bd-script" ref={scriptRef}>
          <div className="bd-sheet">
            {blocks.map((b) => {
              const text = b.text || ''
              if (!text.trim()) return null
              const segs = segmentsFor(text, resolved.placed.get(b.id))
              return (
                <div key={b.id} className={'bd-row bd-' + b.type} data-bid={b.id}>
                  {segs.map((seg, i) =>
                    seg.tag && !hidden.has(seg.tag.category) ? (
                      <mark
                        key={i}
                        className={'bd-mark' + (seg.tag.id === activeTagId ? ' active' : '')}
                        style={{ background: hexA(colorOf(seg.tag.category), 0.26), boxShadow: `inset 0 -2px 0 ${colorOf(seg.tag.category)}` }}
                        title={seg.tag.category}
                        onClick={() => {
                          if (window.getSelection()?.isCollapsed) setActiveTagId(seg.tag.id)
                        }}
                      >
                        {seg.text}
                      </mark>
                    ) : (
                      <span key={i}>{seg.text}</span>
                    )
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <aside className="bd-side" aria-label="Breakdown">
        {extrasError && <div className="notice error">The breakdown tables are not set up yet. Run the updated SQL file in Supabase, then refresh.</div>}
        <div className="bd-side-head">
          <h2>Breakdown</h2>
          <div className="seg">
            <button className={tab === 'category' ? 'on' : ''} onClick={() => setTab('category')}>
              By category
            </button>
            <button className={tab === 'scene' ? 'on' : ''} onClick={() => setTab('scene')}>
              By scene
            </button>
          </div>
        </div>

        {tab === 'category' ? (
          <div className="bd-groups">
            {summary.cats.map((c) => (
              <section key={c.key} className="bd-group" style={{ '--c': c.color }}>
                <h3>
                  <span className="dot" /> {c.key} <span className="bd-count">{c.items.length}</span>
                  <Hint text={c.hint} />
                </h3>
                {c.items.length === 0 ? (
                  <p className="bd-none">Nothing tagged yet</p>
                ) : (
                  <ul>
                    {c.items.map((it) => (
                      <li key={it.key}>
                        <span className="bd-item">
                          {it.text}
                          {it.auto && !it.tagIds.length && <span className="bd-auto">from script</span>}
                          {it.stale && <span className="bd-stale">text changed in script</span>}
                          {it.tagIds.length > 1 && <span className="bd-times">x{it.tagIds.length}</span>}
                        </span>
                        <span className="bd-scenes">{it.scenes.length ? it.scenes.map((n) => `S${n}`).join(' ') : ''}</span>
                        {it.tagIds.length > 0 && (
                          <button
                            className="icon-btn small"
                            aria-label={`Remove ${it.text}`}
                            onClick={() => (it.tagIds.length > 1 ? setConfirm(it) : removeTags(it.tagIds))}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        ) : (
          <div className="bd-groups">
            {summary.scenes.map(({ scene, groups }) => (
              <section key={scene.id} className="bd-group scene">
                <h3>
                  <span className="scene-num small">{scene.number}</span> {scene.heading || 'Untitled scene'}
                </h3>
                {groups.length === 0 ? (
                  <p className="bd-none">Nothing tagged in this scene</p>
                ) : (
                  groups.map((g) => (
                    <div key={g.key} className="bd-scene-group" style={{ '--c': g.color }}>
                      <span className="bd-scene-cat">
                        <span className="dot" /> {g.key}
                      </span>
                      <span className="bd-scene-items">{g.items.join(', ')}</span>
                    </div>
                  ))
                )}
              </section>
            ))}
          </div>
        )}

        <form className="bd-add" onSubmit={addManual}>
          <h3>Add something by hand</h3>
          <p className="field-note">For things that are not written in the script, like 20 background diners.</p>
          <div className="bd-add-row">
            <select className="input compact" value={manual.category} onChange={(e) => setManual({ ...manual, category: e.target.value })} aria-label="Category">
              {CATEGORY_KEYS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <select className="input compact" value={manual.scene} onChange={(e) => setManual({ ...manual, scene: e.target.value })} aria-label="Scene">
              <option value="">No scene</option>
              {analysis.scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  Scene {s.number}
                </option>
              ))}
            </select>
          </div>
          <div className="bd-add-row">
            <input className="input" placeholder="What do you need?" value={manual.text} onChange={(e) => setManual({ ...manual, text: e.target.value })} aria-label="Item" />
            <button className="btn btn-primary btn-sm" disabled={!manual.text.trim()}>
              <Plus size={15} /> Add
            </button>
          </div>
        </form>
      </aside>

      {confirm && (
        <ConfirmModal
          title={`Remove “${confirm.text}”?`}
          danger
          confirmLabel="Remove all"
          message={`This text is tagged ${confirm.tagIds.length} times. Removing it takes away all of the tags.`}
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            const ids = confirm.tagIds
            setConfirm(null)
            await removeTags(ids)
          }}
        />
      )}
    </div>
  )
}
