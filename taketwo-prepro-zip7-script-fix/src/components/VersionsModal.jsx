import { useEffect, useMemo, useState } from 'react'
import { Modal, ConfirmModal } from './Modal.jsx'
import { useToast } from './Toast.jsx'
import { supabase } from '../lib/supabase.js'
import { collapseDiff, diffBlocks } from '../lib/merge.js'
import { timeAgo } from '../lib/format.js'
import { TYPE_LABEL } from '../lib/screenplay.js'

const PRESETS = ['Draft 1', 'Draft 2', 'Draft 3', 'Shooting Draft', 'Final Draft']

// Saved snapshots of the script: compare any of them with the current script, or go back to one.
export default function VersionsModal({ project, blocks, sceneInfo, canEdit, team, restoreScript, onClose }) {
  const toast = useToast()
  const [versions, setVersions] = useState(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [comparing, setComparing] = useState(null) // { version, blocks }
  const [restoring, setRestoring] = useState(null)

  async function load() {
    const { data, error } = await supabase
      .from('script_versions')
      .select('id, name, note, created_at, user_id')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
    if (error) {
      toast('Versions are not set up yet. Run the updated SQL file in Supabase.', 'error')
      setVersions([])
    } else setVersions(data || [])
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const suggestion = useMemo(() => PRESETS.find((p) => !(versions || []).some((v) => v.name === p)) || 'Draft', [versions])

  async function save(label, extraNote = '') {
    const title = (label || name || suggestion).trim()
    setBusy(true)
    const { error } = await supabase.from('script_versions').insert({
      project_id: project.id,
      name: title,
      note: extraNote || note.trim(),
      content: blocks,
      scene_info: sceneInfo,
    })
    setBusy(false)
    if (error) return toast(error.message || 'Could not save that version.', 'error')
    setName('')
    setNote('')
    toast(`Saved “${title}”`)
    load()
  }

  async function fetchVersion(v) {
    const { data, error } = await supabase.from('script_versions').select('content, scene_info').eq('id', v.id).single()
    if (error || !data) {
      toast('Could not open that version.', 'error')
      return null
    }
    return data
  }

  async function compare(v) {
    const data = await fetchVersion(v)
    if (data) setComparing({ version: v, blocks: data.content })
  }

  async function restore(v) {
    const data = await fetchVersion(v)
    if (!data) return
    // keep the current script safe first, so nothing is ever lost
    await save(`Before going back to ${v.name}`, 'Saved automatically')
    restoreScript(data.content, data.scene_info || {})
    setRestoring(null)
    toast(`Went back to “${v.name}”`)
    onClose()
  }

  async function remove(v) {
    await supabase.from('script_versions').delete().eq('id', v.id)
    load()
  }

  const nameOf = (id) => team.find((t) => t.id === id)?.name || 'Someone'

  if (comparing) {
    const rows = collapseDiff(diffBlocks(comparing.blocks, blocks))
    const added = rows.filter((r) => r.kind === 'add').length
    const removed = rows.filter((r) => r.kind === 'del').length
    return (
      <Modal title={`Changes since “${comparing.version.name}”`} xl onClose={onClose}>
        <p className="modal-text">
          <span className="diff-count add">{added} {added === 1 ? 'line' : 'lines'} added</span>{' '}
          <span className="diff-count del">{removed} {removed === 1 ? 'line' : 'lines'} removed</span>
        </p>
        {added + removed === 0 ? (
          <p className="muted-text">The current script is the same as this version.</p>
        ) : (
          <div className="diff">
            {rows.map((r, i) =>
              r.kind === 'gap' ? (
                <div key={i} className="diff-gap">
                  {r.count} unchanged {r.count === 1 ? 'line' : 'lines'}
                </div>
              ) : (
                <div key={i} className={'diff-row ' + r.kind}>
                  <span className="diff-sign">{r.kind === 'add' ? '+' : r.kind === 'del' ? '−' : ''}</span>
                  <span className="diff-type">{TYPE_LABEL[r.block.type]}</span>
                  <span className="diff-text">{r.block.text || ' '}</span>
                </div>
              )
            )}
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setComparing(null)}>
            Back to versions
          </button>
          {canEdit && (
            <button className="btn btn-primary" onClick={() => setRestoring(comparing.version)}>
              Go back to this version
            </button>
          )}
        </div>
        {restoring && (
          <ConfirmModal
            title={`Go back to “${restoring.name}”?`}
            confirmLabel="Go back"
            message="The script on screen is replaced with this version. Your current script is saved as a version first, so you can return to it."
            onClose={() => setRestoring(null)}
            onConfirm={() => restore(restoring)}
          />
        )}
      </Modal>
    )
  }

  return (
    <Modal title="Script versions" wide onClose={onClose}>
      <p className="modal-text">
        Save a version before big changes, like when you finish a draft. You can compare any version with your current script, or go back to it.
      </p>
      {canEdit && (
        <div className="ver-new">
          <div className="chips">
            {PRESETS.map((p) => (
              <button key={p} type="button" className={'chip btn-chip' + (name === p ? ' on' : '')} onClick={() => setName(p)}>
                {p}
              </button>
            ))}
          </div>
          <div className="share-form">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={suggestion} aria-label="Version name" />
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Version note" />
            <button className="btn btn-primary" onClick={() => save()} disabled={busy}>
              {busy ? 'Saving…' : 'Save version'}
            </button>
          </div>
        </div>
      )}

      {versions === null ? (
        <p className="muted-text">Loading…</p>
      ) : versions.length === 0 ? (
        <p className="muted-text pad-top">No versions yet.</p>
      ) : (
        <ul className="ver-list">
          {versions.map((v) => (
            <li key={v.id}>
              <div className="ver-main">
                <strong>{v.name}</strong>
                <span className="meta-text">
                  {timeAgo(v.created_at)} by {nameOf(v.user_id)}
                  {v.note ? `, ${v.note}` : ''}
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => compare(v)}>
                Compare
              </button>
              {canEdit && (
                <>
                  <button className="btn btn-ghost btn-sm" onClick={() => setRestoring(v)}>
                    Restore
                  </button>
                  <button className="btn btn-ghost btn-sm danger-text" onClick={() => remove(v)} aria-label={`Delete ${v.name}`}>
                    Delete
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {restoring && (
        <ConfirmModal
          title={`Go back to “${restoring.name}”?`}
          confirmLabel="Go back"
          message="The script on screen is replaced with this version. Your current script is saved as a version first, so you can return to it."
          onClose={() => setRestoring(null)}
          onConfirm={() => restore(restoring)}
        />
      )}
    </Modal>
  )
}
