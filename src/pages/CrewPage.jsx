import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImagePlus, Plus, Trash2, X } from 'lucide-react'
import { useProject } from './ProjectLayout.jsx'
import EntryList, { Avatar } from '../components/EntryList.jsx'
import Hint from '../components/Hint.jsx'
import { AreaField, TextField } from '../components/Fields.jsx'
import { ConfirmModal, Modal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { titleCase } from '../lib/breakdown.js'
import { ROLES, personScenes, playsNames } from '../lib/crew.js'
import { fmtDate } from '../lib/dates.js'
import { removeImages, uploadImage } from '../lib/images.js'
import { buildCharacterEntries, namesOf, splitList } from '../lib/people.js'

const newPerson = (kind, name, role = '') => ({
  kind,
  name,
  role: kind === 'cast' ? 'Actor' : role,
  plays: '',
  email: '',
  phone: '',
  notes: '',
  photo_path: null,
  unavailable: [],
})

export default function CrewPage() {
  const { project, analysis, characters, people, userId, prodError } = useProject()
  const toast = useToast()
  const [tab, setTab] = useState('cast')
  const [selectedId, setSelectedId] = useState(null)
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newDate, setNewDate] = useState('')
  const photoInput = useRef(null)
  const base = `/project/${project.id}`

  const cast = people.rows.filter((p) => p.kind === 'cast')
  const crew = people.rows.filter((p) => p.kind === 'crew')
  const list = tab === 'cast' ? cast : crew
  const entries = useMemo(
    () =>
      list
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((p) => ({ id: p.id, name: p.name, role: p.role, record: { images: p.photo_path ? [p.photo_path] : [] }, person: p })),
    [list]
  )
  const selected = people.rows.find((p) => p.id === selectedId) || null
  const set = (field) => (v) => people.update(selected.id, { [field]: v })

  // Characters you can cast a person as: the ones from the script plus any you added
  const charChoices = useMemo(() => buildCharacterEntries(analysis.characters, characters.rows).map((e) => e.name), [analysis.characters, characters.rows])

  const scenesFor = selected && selected.kind === 'cast' ? personScenes(selected, characters.rows, analysis.scenes) : []
  const playing = selected ? playsNames(selected) : []

  function togglePlays(name) {
    const cur = splitList(selected.plays)
    const has = cur.some((x) => x.toUpperCase() === name.toUpperCase())
    set('plays')((has ? cur.filter((x) => x.toUpperCase() !== name.toUpperCase()) : [...cur, name]).join(', '))
  }

  function addDate() {
    if (!newDate) return
    const cur = selected.unavailable || []
    if (!cur.includes(newDate)) set('unavailable')([...cur, newDate].sort())
    setNewDate('')
  }

  async function addPhoto(file) {
    setUploading(true)
    try {
      const path = await uploadImage(file, { userId, projectId: project.id })
      const old = selected.photo_path
      people.update(selected.id, { photo_path: path })
      if (old) removeImages([old])
    } catch (e) {
      toast(e.message || 'Could not upload that picture.', 'error')
    }
    setUploading(false)
  }

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Cast &amp; crew</h1>
          <p className="muted-text">Everyone working on your film, and the days they can and cannot work.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Plus size={16} /> Add {tab === 'cast' ? 'cast member' : 'crew member'}
        </button>
      </div>

      {prodError && (
        <div className="notice error">The cast and crew tables are not set up yet. Run the updated SQL file in Supabase, then refresh. ({prodError})</div>
      )}

      <div className="toolbar-row">
        <div className="seg" role="group" aria-label="Cast or crew">
          <button className={tab === 'cast' ? 'on' : ''} onClick={() => (setTab('cast'), setSelectedId(null))}>
            Cast ({cast.length})
          </button>
          <button className={tab === 'crew' ? 'on' : ''} onClick={() => (setTab('crew'), setSelectedId(null))}>
            Crew ({crew.length})
          </button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="empty">
          <h2>{tab === 'cast' ? 'No cast members yet' : 'No crew yet'}</h2>
          <p>
            {tab === 'cast'
              ? 'Add the actors in your film and say which characters they play. Their availability then shows up when you schedule.'
              : 'Add your director, camera operator, sound mixer, and everyone else who helps. They appear on your call sheets.'}
          </p>
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            <Plus size={16} /> Add {tab === 'cast' ? 'a cast member' : 'a crew member'}
          </button>
        </div>
      ) : (
        <div className="people-layout">
          <EntryList
            entries={entries}
            selectedId={selectedId}
            onSelect={setSelectedId}
            search={q}
            onSearch={setQ}
            searchLabel={`Search ${tab}`}
            tone={tab === 'cast' ? 'pink' : 'blue'}
            meta={(e) => (tab === 'cast' ? playing_text(e.person) : e.role || 'No role yet')}
          />

          <section className="people-detail card pad" aria-live="polite">
            {!selected || selected.kind !== tab ? (
              <div className="detail-empty">
                <h2 className="card-title">{tab === 'cast' ? 'Cast details' : 'Crew details'}</h2>
                <p className="muted-text">Pick a person to add contact details, their role, and the dates they cannot work.</p>
              </div>
            ) : (
              <>
                <div className="detail-head">
                  <div className="person-head">
                    <Avatar path={selected.photo_path} name={selected.name} tone={tab === 'cast' ? 'pink' : 'blue'} size={56} />
                    <div>
                      <div className="muted-text">{selected.kind === 'cast' ? 'Cast' : selected.role || 'Crew'}</div>
                      <h2 className="card-title">{selected.name}</h2>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm danger-text" onClick={() => setConfirm(true)}>
                    <Trash2 size={15} /> Remove
                  </button>
                </div>

                <div className="people-fields" key={selected.id}>
                  <div className="two-fields">
                    <TextField id="pp-name" label="Name" value={selected.name} onChange={set('name')} />
                    {selected.kind === 'crew' ? (
                      <div className="field">
                        <label className="label" htmlFor="pp-role">
                          Role <Hint text="What this person does on the film. Pick one from the list or type your own." />
                        </label>
                        <input
                          id="pp-role"
                          className="input"
                          list="role-options"
                          value={selected.role}
                          placeholder="Gaffer, Boom Operator…"
                          onChange={(e) => set('role')(e.target.value)}
                        />
                        <datalist id="role-options">
                          {ROLES.map((r) => (
                            <option key={r} value={r} />
                          ))}
                        </datalist>
                      </div>
                    ) : (
                      <TextField id="pp-role" label="Role" value={selected.role} onChange={set('role')} placeholder="Actor" />
                    )}
                  </div>

                  {selected.kind === 'cast' && (
                    <div className="field">
                      <div className="label">
                        Plays <Hint text="Pick the characters this actor plays. Their scenes and availability then connect to your schedule and call sheets." />
                      </div>
                      {charChoices.length === 0 ? (
                        <p className="muted-text">
                          Characters from your script show up here.{' '}
                          <Link className="text-link" to={`${base}/script`}>
                            Open the script
                          </Link>
                        </p>
                      ) : (
                        <div className="chips">
                          {charChoices.map((n) => {
                            const on = playing.some((x) => x === n.toUpperCase() || namesOf({ name: n, aliases: '' }).includes(x))
                            return (
                              <button key={n} type="button" className={'chip btn-chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => togglePlays(n)}>
                                {n}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="two-fields">
                    <TextField id="pp-phone" label="Phone" type="tel" value={selected.phone} onChange={set('phone')} />
                    <TextField id="pp-email" label="Email" type="email" value={selected.email} onChange={set('email')} />
                  </div>

                  <div className="field">
                    <div className="label">
                      Dates they cannot work{' '}
                      <Hint text="Add any days this person is busy. When you schedule a shoot on one of those days, you will get a warning." />
                    </div>
                    <div className="date-add">
                      <input className="input compact" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} aria-label="Date they cannot work" />
                      <button className="btn btn-ghost btn-sm" onClick={addDate} disabled={!newDate}>
                        Add date
                      </button>
                    </div>
                    {(selected.unavailable || []).length === 0 ? (
                      <p className="muted-text pad-top">Available on any day.</p>
                    ) : (
                      <div className="chips pad-top">
                        {selected.unavailable.map((d) => (
                          <span key={d} className="chip date-chip">
                            {fmtDate(d, { year: true })}
                            <button type="button" aria-label={`Remove ${d}`} onClick={() => set('unavailable')(selected.unavailable.filter((x) => x !== d))}>
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <AreaField id="pp-notes" label="Notes" value={selected.notes} onChange={set('notes')} rows={3} placeholder="Allergies, transportation, anything the crew should know" />

                  <div className="field">
                    <div className="label">Photo</div>
                    <div className="date-add">
                      <button className="btn btn-ghost btn-sm" onClick={() => photoInput.current?.click()} disabled={uploading}>
                        <ImagePlus size={15} /> {uploading ? 'Uploading…' : selected.photo_path ? 'Change photo' : 'Add photo'}
                      </button>
                      {selected.photo_path && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            removeImages([selected.photo_path])
                            people.update(selected.id, { photo_path: null })
                          }}
                        >
                          Remove
                        </button>
                      )}
                      <input
                        ref={photoInput}
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={(e) => {
                          const f = e.target.files[0]
                          e.target.value = ''
                          if (f) addPhoto(f)
                        }}
                      />
                    </div>
                  </div>

                  {selected.kind === 'cast' && (
                    <div className="field">
                      <div className="label">Scenes</div>
                      {scenesFor.length === 0 ? (
                        <p className="muted-text">Choose a character above to see their scenes.</p>
                      ) : (
                        <ul className="scene-links">
                          {scenesFor.map((s) => (
                            <li key={s.id}>
                              <Link to={`${base}/script?scene=${s.id}`}>
                                <span className="scene-num small">{s.number}</span>
                                <span>{s.heading || 'Untitled scene'}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {adding && (
        <AddPersonModal
          kind={tab}
          onClose={() => setAdding(false)}
          onAdd={async (name, role) => {
            try {
              const row = await people.add(newPerson(tab, name, role))
              setAdding(false)
              setSelectedId(row.id)
            } catch (e) {
              toast(e.message || 'Could not add that person.', 'error')
            }
          }}
        />
      )}
      {confirm && selected && (
        <ConfirmModal
          title={`Remove ${selected.name}?`}
          danger
          confirmLabel="Remove"
          message="They are taken off your cast and crew list. Tasks assigned to them become unassigned."
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            const p = selected
            setConfirm(false)
            setSelectedId(null)
            try {
              await people.remove(p.id)
              if (p.photo_path) removeImages([p.photo_path])
            } catch (e) {
              toast(e.message || 'Could not remove them.', 'error')
            }
          }}
        />
      )}
    </div>
  )
}

function playing_text(person) {
  const names = splitList(person.plays)
  return names.length ? `Plays ${names.map(titleCase).join(', ')}` : 'No character yet'
}

function AddPersonModal({ kind, onClose, onAdd }) {
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <Modal title={kind === 'cast' ? 'Add cast member' : 'Add crew member'} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!name.trim()) return
          setBusy(true)
          await onAdd(name.trim(), role.trim())
          setBusy(false)
        }}
      >
        <label className="label" htmlFor="ap-name">
          Name
        </label>
        <input id="ap-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        {kind === 'crew' && (
          <>
            <label className="label" htmlFor="ap-role">
              Role
            </label>
            <input id="ap-role" className="input" list="role-options-add" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Director, Gaffer, Sound Mixer…" />
            <datalist id="role-options-add">
              {ROLES.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy || !name.trim()}>
            {busy ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
