import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from './Modal.jsx'
import { useToast } from './Toast.jsx'
import { createProject } from '../lib/projects.js'

export default function NewProjectModal({ onClose, startWithPaste = false }) {
  const nav = useNavigate()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [paste, setPaste] = useState(startWithPaste)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const project = await createProject({ title, text: paste ? text : '' })
      onClose()
      nav(`/project/${project.id}/script`)
    } catch (err) {
      toast(err.message || 'Could not create the project.', 'error')
      setBusy(false)
    }
  }

  return (
    <Modal title="New project" onClose={onClose} wide={paste}>
      <form onSubmit={submit}>
        <label className="label" htmlFor="np-title">
          Film title
        </label>
        <input
          id="np-title"
          className="input"
          placeholder="My Short Film"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <div className="seg" role="radiogroup" aria-label="How do you want to start?">
          <button type="button" role="radio" aria-checked={!paste} className={!paste ? 'on' : ''} onClick={() => setPaste(false)}>
            Start a blank script
          </button>
          <button type="button" role="radio" aria-checked={paste} className={paste ? 'on' : ''} onClick={() => setPaste(true)}>
            Paste an existing script
          </button>
        </div>

        {paste && (
          <>
            <label className="label" htmlFor="np-text">
              Paste your script
            </label>
            <textarea
              id="np-text"
              className="textarea mono"
              rows={10}
              placeholder={'INT. APARTMENT - NIGHT\n\nCharles enters the dark apartment.\n\nCHARLES\nHello?'}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <p className="field-note">
              We sort scene headings, action, character names, and dialogue automatically. You can fix anything in the editor.
            </p>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
