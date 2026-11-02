import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BarChart3, Check, History, HelpCircle, ListTree, MessageSquare, Printer, Redo2, Save, Undo2, X } from 'lucide-react'
import { useProject } from './ProjectLayout.jsx'
import Hint from '../components/Hint.jsx'
import CommentsPanel from '../components/CommentsPanel.jsx'
import VersionsModal from '../components/VersionsModal.jsx'
import { useToast } from '../components/Toast.jsx'
import { newCharacter, namesOf } from '../lib/people.js'
import { titleCase } from '../lib/breakdown.js'
import { useAuth } from '../lib/auth.jsx'
import {
  AUTO_SCENE_RE,
  NEXT_TYPE,
  TYPES,
  TYPE_HINT,
  TYPE_LABEL,
  TYPE_PLACEHOLDER,
  TYPE_SHORT,
  UPPER_TYPES,
  convertText,
  cleanName,
  cycleType,
  fmtPages,
  isEmptyText,
  newBlock,
  normalizeText,
  parsePlainText,
  reorderScenes,
} from '../lib/screenplay.js'

// ---------- helpers ----------

// Which visual line is the cursor on, and how many lines does the box have?
function caretLine(el) {
  const cs = getComputedStyle(el)
  const lh = parseFloat(cs.lineHeight) || 20
  const padTop = parseFloat(cs.paddingTop) || 0
  const padBottom = parseFloat(cs.paddingBottom) || 0
  const total = Math.max(1, Math.round((el.scrollHeight - padTop - padBottom) / lh))

  const mirror = document.createElement('div')
  const copy = ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight', 'textTransform', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth', 'borderTopWidth', 'borderBottomWidth']
  copy.forEach((p) => (mirror.style[p] = cs[p]))
  mirror.style.boxSizing = 'border-box'
  mirror.style.width = el.offsetWidth + 'px'
  mirror.style.position = 'absolute'
  mirror.style.visibility = 'hidden'
  mirror.style.left = '-9999px'
  mirror.style.top = '0'
  mirror.style.whiteSpace = 'pre-wrap'
  mirror.style.overflowWrap = 'break-word'
  mirror.textContent = el.value.slice(0, el.selectionStart)
  const marker = document.createElement('span')
  marker.textContent = '\u200b'
  mirror.appendChild(marker)
  document.body.appendChild(mirror)
  const line = Math.round((marker.offsetTop - padTop) / lh)
  document.body.removeChild(mirror)
  return { line: Math.max(0, line), total }
}

// ---------- one line of the script ----------

const Block = memo(function Block({ block, active, tick, register, onChange, onKeyDown, onFocus, onBlur, onPaste, commentCount, readOnly, onComment }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = el.scrollHeight + 'px'
  }, [block.text, block.type, tick])

  return (
    <div className={'sp-row sp-row-' + block.type} data-active={active ? 'true' : 'false'} data-label={TYPE_LABEL[block.type]}>
      <textarea
        ref={(el) => {
          ref.current = el
          register(block.id, el)
        }}
        className={'sp sp-' + block.type}
        rows={1}
        value={block.text}
        placeholder={TYPE_PLACEHOLDER[block.type]}
        aria-label={TYPE_LABEL[block.type]}
        spellCheck
        onChange={(e) => onChange(block.id, e.target.value)}
        onKeyDown={(e) => onKeyDown(e, block.id)}
        onFocus={() => onFocus(block.id)}
        onBlur={() => onBlur(block.id)}
        onPaste={(e) => onPaste(e, block.id)}
        readOnly={readOnly}
      />
      {commentCount > 0 && (
        <button className="cm-dot" onClick={() => onComment(block.id)} aria-label={`${commentCount} ${commentCount === 1 ? 'comment' : 'comments'} on this line`}>
          {commentCount}
        </button>
      )}
    </div>
  )
})

// ---------- the page ----------

export default function ScriptPage() {
  const { blocks, blocksRef, commit, undo, redo, canUndo, canRedo, analysis, saveNow, saveState, openExport, project, characters: charsApi, comments, team, canEdit, sceneInfo, restoreScript } = useProject()
  const toast = useToast()
  const { beginner } = useAuth()
  const [params] = useSearchParams()

  const [activeId, setActiveId] = useState(null)
  const [navOpen, setNavOpen] = useState(false)
  const [popover, setPopover] = useState(null) // 'stats' | 'help' | null
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentFocus, setCommentFocus] = useState(null)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [tick, setTick] = useState(0)
  const [dragFrom, setDragFrom] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  const refs = useRef(new Map())
  const pending = useRef(null)
  const scroller = useRef(null)

  const register = useCallback((id, el) => {
    if (el) refs.current.set(id, el)
    else refs.current.delete(id)
  }, [])

  // After the list changes, put the cursor where we meant it to go
  useLayoutEffect(() => {
    const pf = pending.current
    if (!pf) return
    const el = refs.current.get(pf.id)
    if (!el) return
    pending.current = null
    el.focus()
    const p = pf.pos === 'end' ? el.value.length : pf.pos === 'start' ? 0 : pf.pos
    el.setSelectionRange(p, p)
  }, [blocks])

  // Resize boxes when the window width changes
  useEffect(() => {
    let t
    const onResize = () => {
      clearTimeout(t)
      t = setTimeout(() => setTick((n) => n + 1), 120)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      clearTimeout(t)
    }
  }, [])

  // Fonts can finish loading after the first measure
  useEffect(() => {
    if (document.fonts?.ready) document.fonts.ready.then(() => setTick((n) => n + 1))
  }, [])

  const apply = useCallback(
    (next, focus, key) => {
      if (focus) pending.current = focus
      commit(next, key)
    },
    [commit]
  )

  const setType = useCallback(
    (id, type) => {
      const bl = blocksRef.current
      const cur = bl.find((b) => b.id === id)
      if (!cur) return
      const text = convertText(cur.type, type, cur.text)
      // a new, empty parenthetical: put the cursor between the brackets
      const focus = type === 'paren' && cur.type !== 'paren' && text === '()' ? { id, pos: 1 } : null
      apply(
        bl.map((b) => (b.id === id ? { ...b, type, text } : b)),
        focus
      )
    },
    [apply, blocksRef]
  )

  const handleChange = useCallback(
    (id, text) => {
      if (!canEdit) return
      const bl = blocksRef.current
      const b = bl.find((x) => x.id === id)
      if (!b) return
      let type = b.type
      if (type === 'action' && AUTO_SCENE_RE.test(text)) type = 'scene'
      apply(
        bl.map((x) => (x.id === id ? { ...x, text, type } : x)),
        null,
        'text:' + id
      )
    },
    [apply, blocksRef, canEdit]
  )

  const handleBlur = useCallback(
    (id) => {
      if (!canEdit) return
      const bl = blocksRef.current
      const b = bl.find((x) => x.id === id)
      if (!b || !UPPER_TYPES.has(b.type)) return
      const up = normalizeText(b.type, b.text)
      if (up !== b.text) apply(bl.map((x) => (x.id === id ? { ...x, text: up } : x)), null)
    },
    [apply, blocksRef, canEdit]
  )

  const handleKeyDown = useCallback(
    (e, id) => {
      if (!canEdit && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return // read-only: just move around
      const bl = blocksRef.current
      const idx = bl.findIndex((b) => b.id === id)
      if (idx < 0) return
      const b = bl[idx]
      const el = e.target
      const mod = e.ctrlKey || e.metaKey
      const key = e.key

      if (mod && !e.shiftKey && key.toLowerCase() === 'z') {
        e.preventDefault()
        return undo()
      }
      if (mod && (key.toLowerCase() === 'y' || (e.shiftKey && key.toLowerCase() === 'z'))) {
        e.preventDefault()
        return redo()
      }
      if (mod && key.toLowerCase() === 's') {
        e.preventDefault()
        return saveNow()
      }
      if (e.altKey && /^Digit[1-7]$/.test(e.code)) {
        e.preventDefault()
        return setType(id, TYPES[Number(e.code.slice(5)) - 1])
      }
      if (key === 'Tab') {
        e.preventDefault()
        return setType(id, cycleType(b.type, e.shiftKey ? -1 : 1))
      }

      if (key === 'Enter' && !e.shiftKey && !mod) {
        e.preventDefault()
        const text = b.text
        // Enter on an empty line changes it to Action, or adds another blank Action line
        if (isEmptyText(b.type, text)) {
          if (b.type !== 'action') return setType(id, 'action')
          const nb = newBlock('action', '')
          return apply([...bl.slice(0, idx + 1), nb, ...bl.slice(idx + 1)], { id: nb.id, pos: 'start' })
        }
        const before = text.slice(0, el.selectionStart)
        const after = text.slice(el.selectionEnd)
        let nextType = NEXT_TYPE[b.type]
        if (after && (b.type === 'action' || b.type === 'dialogue')) nextType = b.type
        const nb = newBlock(nextType, normalizeText(nextType, after))
        return apply(
          [...bl.slice(0, idx), { ...b, text: normalizeText(b.type, before) }, nb, ...bl.slice(idx + 1)],
          { id: nb.id, pos: 'start' }
        )
      }

      if (key === 'Backspace' && el.selectionStart === 0 && el.selectionEnd === 0 && idx > 0) {
        e.preventDefault()
        const prev = bl[idx - 1]
        if (isEmptyText(b.type, b.text)) {
          return apply(bl.filter((_, i) => i !== idx), { id: prev.id, pos: 'end' })
        }
        const merged = { ...prev, text: prev.text + b.text }
        return apply([...bl.slice(0, idx - 1), merged, ...bl.slice(idx + 1)], { id: prev.id, pos: prev.text.length })
      }

      if (key === 'Delete' && el.selectionStart === b.text.length && el.selectionEnd === b.text.length && idx < bl.length - 1) {
        e.preventDefault()
        const next = bl[idx + 1]
        const merged = { ...b, text: b.text + next.text }
        return apply([...bl.slice(0, idx), merged, ...bl.slice(idx + 2)], { id: b.id, pos: b.text.length })
      }

      if ((key === 'ArrowUp' || key === 'ArrowDown') && !e.shiftKey && !mod && !e.altKey) {
        const { line, total } = caretLine(el)
        if (key === 'ArrowUp' && line === 0 && idx > 0) {
          e.preventDefault()
          const target = refs.current.get(bl[idx - 1].id)
          if (target) {
            target.focus()
            target.setSelectionRange(target.value.length, target.value.length)
          }
        } else if (key === 'ArrowDown' && line >= total - 1 && idx < bl.length - 1) {
          e.preventDefault()
          const target = refs.current.get(bl[idx + 1].id)
          if (target) {
            target.focus()
            target.setSelectionRange(0, 0)
          }
        }
      }
    },
    [apply, blocksRef, redo, saveNow, setType, undo, canEdit]
  )

  const handlePaste = useCallback(
    (e, id) => {
      if (!canEdit) return
      const text = e.clipboardData?.getData('text/plain') || ''
      if (!/\n/.test(text.replace(/\r/g, '').replace(/\n+$/, ''))) return // one line: normal paste
      e.preventDefault()
      const parsed = parsePlainText(text)
      if (!parsed.length) return
      const bl = blocksRef.current
      const idx = bl.findIndex((b) => b.id === id)
      if (idx < 0) return
      const b = bl[idx]
      const el = e.target
      const before = b.text.slice(0, el.selectionStart)
      const after = b.text.slice(el.selectionEnd)
      const head = before.trim() ? [{ ...b, text: before }] : []
      const tail = after.trim() ? [newBlock(b.type, after)] : []
      apply([...bl.slice(0, idx), ...head, ...parsed, ...tail, ...bl.slice(idx + 1)], {
        id: parsed[parsed.length - 1].id,
        pos: 'end',
      })
    },
    [apply, blocksRef, canEdit]
  )

  const jump = useCallback((id) => {
    const el = refs.current.get(id)
    if (!el) return
    el.scrollIntoView({ block: 'start', behavior: 'smooth' })
    el.focus({ preventScroll: true })
    el.setSelectionRange(el.value.length, el.value.length)
    setNavOpen(false)
  }, [])

  // Opened from the Scenes or Overview page with ?scene=...
  const sceneParam = params.get('scene')
  useEffect(() => {
    if (!sceneParam) return
    const t = setTimeout(() => jump(sceneParam), 80)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ----- derived -----
  const activeIdx = blocks.findIndex((b) => b.id === activeId)
  const active = activeIdx >= 0 ? blocks[activeIdx] : null
  let activeSceneId = null
  for (let i = activeIdx; i >= 0; i--) {
    if (blocks[i].type === 'scene') {
      activeSceneId = blocks[i].id
      break
    }
  }
  const { scenes, stats, characters } = analysis

  const onFocus = useCallback((id) => setActiveId(id), [])

  // open (unresolved) comment threads on each line
  const countByBlock = useMemo(() => {
    const m = new Map()
    for (const c of comments.rows) if (!c.parent_id && !c.resolved) m.set(c.block_id, (m.get(c.block_id) || 0) + 1)
    return m
  }, [comments.rows])
  const openComments = useCallback((blockId) => {
    setCommentFocus(blockId)
    setCommentsOpen(true)
  }, [])

  function reorder(from, to) {
    commit(reorderScenes(blocksRef.current, from, to))
  }

  const showNames = active?.type === 'character' && characters.length > 0
  const nameChoices = showNames
    ? characters.filter((n) => n.startsWith((active.text || '').trim().toUpperCase()) && n !== (active.text || '').trim().toUpperCase()).slice(0, 8)
    : []

  // The character on the current line: already in the database, or can be added
  const lineName = active?.type === 'character' ? cleanName(active.text) : ''
  const lineRecord = lineName ? charsApi.rows.find((r) => namesOf(r).includes(lineName)) : null

  async function addLineCharacter() {
    try {
      await charsApi.add(newCharacter(titleCase(lineName)))
      toast(`${titleCase(lineName)} added to your characters`)
    } catch (e) {
      toast(e.message || 'Could not add that character.', 'error')
    }
  }

  function fillName(name) {
    if (!active) return
    apply(
      blocksRef.current.map((b) => (b.id === active.id ? { ...b, text: name } : b)),
      { id: active.id, pos: 'end' }
    )
  }

  return (
    <div className={'script-page' + (navOpen ? ' nav-open' : '')}>
      <aside className="scene-nav" aria-label="Scene navigator">
        <div className="scene-nav-head">
          <h2>Scenes</h2>
          <button className="icon-btn nav-close" onClick={() => setNavOpen(false)} aria-label="Close scene list">
            <X size={18} />
          </button>
        </div>
        {scenes.length === 0 ? (
          <p className="muted-text pad-sm">Scenes show up here as you add scene headings.</p>
        ) : (
          <ol>
            {scenes.map((s, i) => (
              <li
                key={s.id}
                className={(activeSceneId === s.id ? 'active ' : '') + (dragOver === i && dragFrom !== i ? 'drop' : '')}
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
                  if (dragFrom !== null && dragFrom !== i) reorder(dragFrom, i)
                  setDragFrom(null)
                  setDragOver(null)
                }}
                onDragEnd={() => {
                  setDragFrom(null)
                  setDragOver(null)
                }}
              >
                <button onClick={() => jump(s.id)} title={s.heading}>
                  <span className="nav-num">{s.number}</span>
                  <span className="nav-title">{s.heading || 'Untitled scene'}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
        {scenes.length > 1 && <p className="nav-foot">Drag a scene to move it. The script follows.</p>}
      </aside>
      {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)} />}

      <section className="editor-col">
        <div className="editor-toolbar">
          <div className="tb-row">
            <button className="btn btn-ghost btn-sm nav-toggle" onClick={() => setNavOpen(true)}>
              <ListTree size={16} /> Scenes
            </button>
            <div className="type-btns" role="toolbar" aria-label="Script element">
              {TYPES.map((t, i) => (
                <button
                  key={t}
                  className={'type-btn' + (active?.type === t ? ' on' : '')}
                  title={`${TYPE_LABEL[t]} (Alt+${i + 1})`}
                  disabled={!active || !canEdit}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => active && setType(active.id, t)}
                >
                  {TYPE_SHORT[t]}
                </button>
              ))}
            </div>
            <div className="tb-actions">
            <button className="icon-btn" onClick={undo} disabled={!canUndo || !canEdit} aria-label="Undo" title="Undo (Ctrl+Z)">
              <Undo2 size={17} />
            </button>
            <button className="icon-btn" onClick={redo} disabled={!canRedo || !canEdit} aria-label="Redo" title="Redo (Ctrl+Y)">
              <Redo2 size={17} />
            </button>
            <div className="pop-wrap">
              <button className="btn btn-ghost btn-sm" onClick={() => setPopover(popover === 'stats' ? null : 'stats')}>
                <BarChart3 size={16} /> {fmtPages(stats.pages)} pages
              </button>
              {popover === 'stats' && (
                <div className="popover right" role="dialog" aria-label="Script statistics">
                  <h3>Script statistics</h3>
                  <dl className="pop-list">
                    <div><dt>Pages <Hint text="Estimated from how much text there is. Real page count depends on formatting." /></dt><dd>{fmtPages(stats.pages)}</dd></div>
                    <div><dt>Estimated runtime <Hint text="About one page per minute. This is only an estimate." /></dt><dd>{stats.runtime} min</dd></div>
                    <div><dt>Scenes</dt><dd>{stats.scenes}</dd></div>
                    <div><dt>Interior scenes</dt><dd>{stats.interior}</dd></div>
                    <div><dt>Exterior scenes</dt><dd>{stats.exterior}</dd></div>
                    <div><dt>Day scenes</dt><dd>{stats.day}</dd></div>
                    <div><dt>Night scenes</dt><dd>{stats.night}</dd></div>
                    <div><dt>Locations</dt><dd>{stats.locations}</dd></div>
                    <div><dt>Speaking characters</dt><dd>{stats.characters}</dd></div>
                  </dl>
                  <p className="pop-note">Runtime uses the common rule of about one page per minute. It is a rough guide, not a promise.</p>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPopover(null)}>
                    Close
                  </button>
                </div>
              )}
            </div>
            <div className="pop-wrap">
              <button className="icon-btn" onClick={() => setPopover(popover === 'help' ? null : 'help')} aria-label="Keyboard shortcuts" title="Keyboard shortcuts">
                <HelpCircle size={18} />
              </button>
              {popover === 'help' && (
                <div className="popover right" role="dialog" aria-label="Keyboard shortcuts">
                  <h3>Writing faster</h3>
                  <dl className="pop-list keys">
                    <div><dt>Enter</dt><dd>Next line. It picks the right type for you</dd></div>
                    <div><dt>Tab</dt><dd>Change this line to the next type</dd></div>
                    <div><dt>Shift + Tab</dt><dd>Change this line to the previous type</dd></div>
                    <div><dt>Shift + Enter</dt><dd>New line inside the same element</dd></div>
                    <div><dt>Alt + 1 to 7</dt><dd>Scene, Action, Character, Dialogue, Paren., Transition, Shot</dd></div>
                    <div><dt>Ctrl or Cmd + Z</dt><dd>Undo</dd></div>
                    <div><dt>Ctrl or Cmd + Y</dt><dd>Redo</dd></div>
                    <div><dt>Ctrl or Cmd + S</dt><dd>Save now (it also saves on its own)</dd></div>
                  </dl>
                  <p className="pop-note">Type INT. or EXT. at the start of a line and it becomes a scene heading. Paste a whole script and it gets sorted for you.</p>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPopover(null)}>
                    Close
                  </button>
                </div>
              )}
            </div>
            <button
              className={'btn btn-ghost btn-sm' + (commentsOpen ? ' on' : '')}
              onClick={() => {
                setCommentFocus(null)
                setCommentsOpen((o) => !o)
              }}
              title="Comments"
            >
              <MessageSquare size={16} />{' '}
              <span className="btn-label">Comments{[...countByBlock.values()].reduce((a, b) => a + b, 0) ? ` (${[...countByBlock.values()].reduce((a, b) => a + b, 0)})` : ''}</span>
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setVersionsOpen(true)} title="Saved versions of the script">
              <History size={16} /> <span className="btn-label">Versions</span>
            </button>
            <button className="btn btn-ghost btn-sm" onClick={openExport} title="Print or save as PDF">
              <Printer size={16} /> <span className="btn-label">Export</span>
            </button>
            <button
              className={'btn btn-sm ' + (saveState === 'saved' ? 'btn-ghost saved' : 'btn-primary')}
              onClick={saveNow}
              disabled={saveState === 'saving' || !canEdit}
              title="Save your script (Ctrl+S)"
            >
              {saveState === 'saved' ? <Check size={16} /> : <Save size={16} />}
              <span>{saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save'}</span>
            </button>
            </div>
          </div>
          {beginner && (
            <div className="hint-bar">
              {active
                ? TYPE_HINT[active.type]
                : 'Click a line and start typing. Press Enter for the next line and Tab to change what kind of line it is.'}
            </div>
          )}
          {lineName && (
            <div className="name-bar">
              {lineRecord ? (
                <Link className="text-link" to={`/project/${project.id}/characters?name=${encodeURIComponent(lineName)}`}>
                  View {lineRecord.name}'s details
                </Link>
              ) : (
                <button className="btn btn-ghost btn-sm" onMouseDown={(e) => e.preventDefault()} onClick={addLineCharacter}>
                  Add {titleCase(lineName)} to your characters
                </button>
              )}
            </div>
          )}
          {nameChoices.length > 0 && (
            <div className="name-bar">
              <span>Characters so far:</span>
              {nameChoices.map((n) => (
                <button key={n} className="chip btn-chip" onMouseDown={(e) => e.preventDefault()} onClick={() => fillName(n)}>
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="editor-scroll" ref={scroller} onClick={() => popover && setPopover(null)}>
          <div className="sp-sheet">
            <div className="sp-inner">
              {blocks.map((b) => (
                <Block
                  key={b.id}
                  block={b}
                  active={b.id === activeId}
                  tick={tick}
                  register={register}
                  onChange={handleChange}
                  onKeyDown={handleKeyDown}
                  onFocus={onFocus}
                  onBlur={handleBlur}
                  onPaste={handlePaste}
                  commentCount={countByBlock.get(b.id) || 0}
                  readOnly={!canEdit}
                  onComment={openComments}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
      {commentsOpen && (
        <CommentsPanel
          key={commentFocus || 'all'}
          activeBlock={blocks.find((b) => b.id === activeId) || null}
          focusBlockId={commentFocus}
          onClose={() => setCommentsOpen(false)}
          onJump={jump}
        />
      )}
      {versionsOpen && (
        <VersionsModal
          project={project}
          blocks={blocks}
          sceneInfo={sceneInfo}
          canEdit={canEdit}
          team={team}
          restoreScript={restoreScript}
          onClose={() => setVersionsOpen(false)}
        />
      )}
    </div>
  )
}
