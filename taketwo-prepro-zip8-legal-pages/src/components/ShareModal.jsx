import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal, ConfirmModal } from './Modal.jsx'
import { useToast } from './Toast.jsx'
import { supabase } from '../lib/supabase.js'

const ROLE_TEXT = {
  editor: 'Editor: can change everything',
  commenter: 'Commenter: can read and comment on the script',
  viewer: 'Viewer: can read, print, and export',
}

function Face({ person }) {
  return (
    <span className="face">
      {person.avatar ? <img src={person.avatar} alt="" referrerPolicy="no-referrer" /> : (person.name || '?').charAt(0).toUpperCase()}
    </span>
  )
}

// Invite people to work on a project, and see who already can
export default function ShareModal({ ctx, onClose }) {
  const { project, team, isOwner, refreshTeam, userId, collabError } = ctx
  const toast = useToast()
  const nav = useNavigate()
  const [invites, setInvites] = useState([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('editor')
  const [busy, setBusy] = useState(false)
  const [leaving, setLeaving] = useState(false)

  async function loadInvites() {
    if (!isOwner) return
    const { data } = await supabase.from('project_invites').select('*').eq('project_id', project.id)
    setInvites(data || [])
  }
  useEffect(() => {
    refreshTeam()
    loadInvites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function invite(e) {
    e.preventDefault()
    const clean = email.trim().toLowerCase()
    if (!/^\S+@\S+\.\S+$/.test(clean)) return toast('That does not look like an email address.', 'error')
    if (team.some((t) => t.email.toLowerCase() === clean)) return toast('That person is already on the team.', 'error')
    setBusy(true)
    const { error } = await supabase.from('project_invites').insert({ project_id: project.id, email: clean, role })
    setBusy(false)
    if (error) return toast(error.message.includes('duplicate') ? 'You already invited that email.' : error.message, 'error')
    setEmail('')
    toast('Invite saved')
    loadInvites()
  }

  async function changeRole(member, next) {
    const { error } = await supabase.from('project_members').update({ role: next }).eq('project_id', project.id).eq('user_id', member.id)
    if (error) toast(error.message, 'error')
    refreshTeam()
  }

  async function removeMember(member) {
    const { error } = await supabase.from('project_members').delete().eq('project_id', project.id).eq('user_id', member.id)
    if (error) toast(error.message, 'error')
    refreshTeam()
  }

  async function revoke(id) {
    await supabase.from('project_invites').delete().eq('id', id)
    loadInvites()
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin)
      toast('Link copied')
    } catch {
      toast(window.location.origin)
    }
  }

  return (
    <Modal title={isOwner ? 'Share this project' : 'Team'} onClose={onClose} wide>
      {collabError && <div className="notice error">Sharing is not set up yet. Run the updated SQL file in Supabase, then refresh. ({collabError})</div>}

      {isOwner ? (
        <>
          <p className="modal-text">
            Invite people by the email address they use for Google. Next time they log in to TakeTwo PrePro, this project appears on their Home page.
          </p>
          <form className="share-form" onSubmit={invite}>
            <input className="input" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email to invite" />
            <select className="input" value={role} onChange={(e) => setRole(e.target.value)} aria-label="What they can do">
              <option value="editor">Editor</option>
              <option value="commenter">Commenter</option>
              <option value="viewer">Viewer</option>
            </select>
            <button className="btn btn-primary" disabled={busy || !email.trim()}>
              {busy ? 'Inviting…' : 'Invite'}
            </button>
          </form>
          <p className="field-note">{ROLE_TEXT[role]}.</p>
          <button className="link-btn" onClick={copyLink}>
            Copy the site link to send them
          </button>
        </>
      ) : (
        <p className="modal-text">These are the people who can see this project. Only the owner can invite or remove people.</p>
      )}

      <h3 className="share-h">People with access</h3>
      <ul className="share-list">
        {team.map((t) => (
          <li key={t.id}>
            <Face person={t} />
            <div className="share-who">
              <strong>
                {t.name}
                {t.id === userId && <span className="meta-text"> (you)</span>}
              </strong>
              <span className="meta-text">{t.email}</span>
            </div>
            {t.role === 'owner' ? (
              <span className="badge">Owner</span>
            ) : isOwner ? (
              <>
                <select className="input compact" value={t.role} onChange={(e) => changeRole(t, e.target.value)} aria-label={`Access for ${t.name}`}>
                  <option value="editor">Editor</option>
                  <option value="commenter">Commenter</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button className="btn btn-ghost btn-sm danger-text" onClick={() => removeMember(t)}>
                  Remove
                </button>
              </>
            ) : (
              <span className="badge muted">{t.role}</span>
            )}
          </li>
        ))}
      </ul>

      {isOwner && invites.length > 0 && (
        <>
          <h3 className="share-h">Waiting for them to log in</h3>
          <ul className="share-list">
            {invites.map((i) => (
              <li key={i.id}>
                <span className="face">@</span>
                <div className="share-who">
                  <strong>{i.email}</strong>
                  <span className="meta-text">{i.role}</span>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => revoke(i.id)}>
                  Cancel invite
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {!isOwner && (
        <div className="modal-actions">
          <button className="btn btn-ghost danger-text" onClick={() => setLeaving(true)}>
            Leave this project
          </button>
        </div>
      )}
      {leaving && (
        <ConfirmModal
          title="Leave this project?"
          danger
          confirmLabel="Leave"
          message="It disappears from your Home page. The owner can invite you again."
          onClose={() => setLeaving(false)}
          onConfirm={async () => {
            await supabase.from('project_members').delete().eq('project_id', project.id).eq('user_id', userId)
            nav('/projects')
          }}
        />
      )}
    </Modal>
  )
}
