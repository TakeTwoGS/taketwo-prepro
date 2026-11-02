import { useMemo, useRef, useState } from 'react'
import { Check, RotateCcw, Trash2, X } from 'lucide-react'
import { useProject } from '../pages/ProjectLayout.jsx'
import { useToast } from './Toast.jsx'
import { splitMentions, mentionedIds } from '../lib/mentions.js'
import { timeAgo } from '../lib/format.js'

// A text box that suggests teammates when you type @
export function MentionTextarea({ value, onChange, people, id, placeholder, rows = 3, onSubmit }) {
  const ref = useRef(null)
  const [query, setQuery] = useState(null)
  const matches = query ? people.filter((p) => p.name.toLowerCase().includes(query.text)).slice(0, 5) : []

  function input(e) {
    const v = e.target.value
    onChange(v)
    const pos = e.target.selectionStart
    const m = v.slice(0, pos).match(/(?:^|\s)@([^\s@]*)$/)
    setQuery(m ? { start: pos - m[1].length - 1, text: m[1].toLowerCase() } : null)
  }
  function pick(p) {
    const el = ref.current
    const pos = el.selectionStart
    const next = value.slice(0, query.start) + '@' + p.name + ' ' + value.slice(pos)
    onChange(next)
    setQuery(null)
    const at = query.start + p.name.length + 2
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(at, at)
    })
  }
  return (
    <div className="mention-wrap">
      <textarea
        id={id}
        ref={ref}
        className="textarea"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={input}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') onSubmit?.()
        }}
      />
      {matches.length > 0 && (
        <ul className="mention-list" role="listbox">
          {matches.map((p) => (
            <li key={p.id}>
              <button type="button" role="option" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(p)}>
                {p.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Face({ person }) {
  return (
    <span className="face small">
      {person?.avatar ? <img src={person.avatar} alt="" referrerPolicy="no-referrer" /> : (person?.name || '?').charAt(0).toUpperCase()}
    </span>
  )
}

function Body({ text, team }) {
  return (
    <p className="cm-body">
      {splitMentions(text, team).map((s, i) =>
        s.mention ? (
          <span key={i} className="mention">
            {s.text}
          </span>
        ) : (
          <span key={i}>{s.text}</span>
        )
      )}
    </p>
  )
}

export default function CommentsPanel({ activeBlock, focusBlockId, onClose, onJump }) {
  const { comments, team, userId, canComment, canEdit, blocks } = useProject()
  const toast = useToast()
  const [draft, setDraft] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [reply, setReply] = useState('')
  const [showResolved, setShowResolved] = useState(false)
  const [only, setOnly] = useState(focusBlockId || null)

  const order = useMemo(() => new Map(blocks.map((b, i) => [b.id, i])), [blocks])
  const byTime = (a, b) => String(a.created_at || '').localeCompare(String(b.created_at || ''))
  const tops = comments.rows.filter((c) => !c.parent_id)
  const threads = tops
    .filter((c) => (showResolved || !c.resolved) && (!only || c.block_id === only))
    .sort((a, b) => (order.get(a.block_id) ?? 1e9) - (order.get(b.block_id) ?? 1e9) || byTime(a, b))
  const resolvedCount = tops.filter((c) => c.resolved).length
  const others = team.filter((t) => t.id !== userId)

  async function post(text, parent) {
    const body = text.trim()
    if (!body) return false
    const block = parent ? null : activeBlock
    if (!parent && !block) return false
    try {
      await comments.add({
        user_id: userId,
        block_id: parent ? parent.block_id : block.id,
        parent_id: parent ? parent.id : null,
        body,
        quote: parent ? '' : (block.text || '').slice(0, 140),
        mentions: mentionedIds(body, others),
        resolved: false,
        created_at: new Date().toISOString(),
      })
      return true
    } catch (e) {
      toast(e.message || 'Could not post that comment.', 'error')
      return false
    }
  }

  async function remove(c) {
    const ids = [c.id, ...comments.rows.filter((r) => r.parent_id === c.id).map((r) => r.id)]
    try {
      await comments.removeMany(ids)
    } catch (e) {
      toast(e.message || 'Could not delete that.', 'error')
    }
  }

  const mine = (c) => c.user_id === userId || canEdit

  return (
    <aside className="comments-panel" aria-label="Comments">
      <div className="cm-head">
        <h2>Comments</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close comments">
          <X size={18} />
        </button>
      </div>

      {canComment ? (
        <div className="cm-new">
          {activeBlock ? (
            <>
              <div className="cm-quote">On: “{(activeBlock.text || 'an empty line').slice(0, 90)}”</div>
              <MentionTextarea id="cm-new" value={draft} onChange={setDraft} people={others} placeholder="Write a comment. Type @ to mention someone." rows={3} onSubmit={async () => (await post(draft)) && setDraft('')} />
              <button className="btn btn-primary btn-sm" disabled={!draft.trim()} onClick={async () => (await post(draft)) && setDraft('')}>
                Comment
              </button>
            </>
          ) : (
            <p className="muted-text">Click a line in the script, then write your comment here.</p>
          )}
        </div>
      ) : (
        <p className="muted-text pad-sm">You can read comments but not write them.</p>
      )}

      {only && (
        <button className="link-btn cm-filter" onClick={() => setOnly(null)}>
          Showing one line. Show all comments
        </button>
      )}

      <div className="cm-list">
        {threads.length === 0 && <p className="muted-text pad-sm">{only ? 'No comments on this line.' : 'No comments yet.'}</p>}
        {threads.map((c) => {
          const author = team.find((t) => t.id === c.user_id)
          const replies = comments.rows.filter((r) => r.parent_id === c.id).sort(byTime)
          const gone = !order.has(c.block_id)
          return (
            <article key={c.id} className={'cm-thread' + (c.resolved ? ' resolved' : '')} data-block={c.block_id}>
              <button className="cm-quote link" onClick={() => !gone && onJump(c.block_id)} disabled={gone} title={gone ? 'That line was deleted' : 'Jump to this line'}>
                {gone ? 'This line was deleted' : `“${c.quote || '…'}”`}
              </button>
              <div className="cm-row">
                <Face person={author} />
                <div className="cm-main">
                  <div className="cm-meta">
                    <strong>{author?.name || 'Someone'}</strong> <span className="meta-text">{timeAgo(c.created_at)}</span>
                  </div>
                  <Body text={c.body} team={team} />
                </div>
              </div>
              {replies.map((r) => (
                <div key={r.id} className="cm-row reply">
                  <Face person={team.find((t) => t.id === r.user_id)} />
                  <div className="cm-main">
                    <div className="cm-meta">
                      <strong>{team.find((t) => t.id === r.user_id)?.name || 'Someone'}</strong> <span className="meta-text">{timeAgo(r.created_at)}</span>
                      {mine(r) && (
                        <button className="icon-btn small" aria-label="Delete reply" onClick={() => comments.remove(r.id).catch((e) => toast(e.message, 'error'))}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <Body text={r.body} team={team} />
                  </div>
                </div>
              ))}
              <div className="cm-actions">
                {canComment && (
                  <button className="link-btn" onClick={() => setReplyTo(replyTo === c.id ? null : c.id)}>
                    Reply
                  </button>
                )}
                {mine(c) && (
                  <button className="link-btn" onClick={() => comments.update(c.id, { resolved: !c.resolved })}>
                    {c.resolved ? (
                      <>
                        <RotateCcw size={13} /> Reopen
                      </>
                    ) : (
                      <>
                        <Check size={13} /> Resolve
                      </>
                    )}
                  </button>
                )}
                {mine(c) && (
                  <button className="link-btn danger-text" onClick={() => remove(c)}>
                    Delete
                  </button>
                )}
              </div>
              {replyTo === c.id && (
                <div className="cm-reply">
                  <MentionTextarea id={`reply-${c.id}`} value={reply} onChange={setReply} people={others} placeholder="Write a reply" rows={2} />
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={!reply.trim()}
                    onClick={async () => {
                      if (await post(reply, c)) {
                        setReply('')
                        setReplyTo(null)
                      }
                    }}
                  >
                    Reply
                  </button>
                </div>
              )}
            </article>
          )
        })}
      </div>

      {resolvedCount > 0 && (
        <label className="check small cm-resolved">
          <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
          <span>Show {resolvedCount} resolved</span>
        </label>
      )}
    </aside>
  )
}
