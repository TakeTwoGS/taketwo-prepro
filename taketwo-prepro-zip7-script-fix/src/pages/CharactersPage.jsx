import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useProject } from './ProjectLayout.jsx'
import EntryList from '../components/EntryList.jsx'
import PhotoGrid from '../components/PhotoGrid.jsx'
import Hint from '../components/Hint.jsx'
import { AreaField, TextField } from '../components/Fields.jsx'
import { ConfirmModal, PromptModal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { removeImages, uploadImage } from '../lib/images.js'
import { buildCharacterEntries, characterScenes, newCharacter, sceneTexts } from '../lib/people.js'

export default function CharactersPage() {
  const { project, blocks, analysis, characters, userId, extrasError } = useProject()
  const toast = useToast()
  const [params] = useSearchParams()
  const [selectedId, setSelectedId] = useState(null)
  const [q, setQ] = useState('')
  const [asking, setAsking] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [uploading, setUploading] = useState(false)

  const entries = useMemo(() => buildCharacterEntries(analysis.characters, characters.rows), [analysis.characters, characters.rows])
  const texts = useMemo(() => sceneTexts(analysis.scenes, blocks), [analysis.scenes, blocks])
  const selected = entries.find((e) => e.id === selectedId) || null
  const missing = entries.filter((e) => !e.record)
  const base = `/project/${project.id}`

  // Arriving from the script with ?name=ALEX
  const nameParam = params.get('name')
  useEffect(() => {
    if (!nameParam) return
    const e = entries.find((x) => x.names.has(nameParam.toUpperCase()))
    if (e) setSelectedId(e.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameParam])

  async function addOne(entry) {
    try {
      const rec = await characters.add(newCharacter(entry.name))
      setSelectedId(rec.id)
    } catch (e) {
      toast(e.message || 'Could not add that character.', 'error')
    }
  }

  async function addAll() {
    try {
      await characters.addMany(missing.map((e) => newCharacter(e.name)))
      toast(`${missing.length} ${missing.length === 1 ? 'character' : 'characters'} added`)
    } catch (e) {
      toast(e.message || 'Could not add the characters.', 'error')
    }
  }

  async function addPhotos(rec, files) {
    setUploading(true)
    const added = []
    for (const f of files) {
      try {
        added.push(await uploadImage(f, { userId, projectId: project.id }))
      } catch (e) {
        toast(e.message || 'Could not upload a picture.', 'error')
      }
    }
    if (added.length) {
      const current = characters.rowsRef.current.find((r) => r.id === rec.id)?.images || []
      characters.update(rec.id, { images: [...current, ...added] })
    }
    setUploading(false)
  }

  function removePhoto(rec, path) {
    const current = characters.rowsRef.current.find((r) => r.id === rec.id)?.images || []
    characters.update(rec.id, { images: current.filter((p) => p !== path) })
    removeImages([path])
  }

  const rec = selected?.record
  const appears = selected ? characterScenes(selected, analysis.scenes, texts) : []
  const set = (field) => (v) => characters.update(rec.id, { [field]: v })

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Characters</h1>
          <p className="muted-text">Everyone in your film, and every scene they appear in.</p>
        </div>
        <div className="head-actions">
          {missing.length > 0 && (
            <button className="btn btn-ghost" onClick={addAll}>
              Add all from script ({missing.length})
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setAsking(true)}>
            <Plus size={16} /> New character
          </button>
        </div>
      </div>

      {extrasError && (
        <div className="notice error">The character tables are not set up yet. Run the updated SQL file in Supabase, then refresh. ({extrasError})</div>
      )}

      {entries.length === 0 ? (
        <div className="empty">
          <h2>No characters yet</h2>
          <p>Characters appear here as soon as someone speaks in your script. You can also add one by hand, like a background character.</p>
          <Link className="btn btn-primary" to={`${base}/script`}>
            Open the script editor
          </Link>
        </div>
      ) : (
        <div className="people-layout">
          <EntryList
            entries={entries}
            selectedId={selectedId}
            onSelect={setSelectedId}
            search={q}
            onSearch={setQ}
            searchLabel="Search characters"
            tone="pink"
            meta={(e) => {
              const n = characterScenes(e, analysis.scenes, texts).length
              return `${n} ${n === 1 ? 'scene' : 'scenes'}${e.speaking ? '' : ', not in script'}`
            }}
          />

          <section className="people-detail card pad" aria-live="polite">
            {!selected ? (
              <div className="detail-empty">
                <h2 className="card-title">Character details</h2>
                <p className="muted-text">
                  Pick a character to add their actor, costume, props, and reference pictures. Scenes they appear in are tracked for you.
                </p>
              </div>
            ) : (
              <>
                <div className="detail-head">
                  <div>
                    <div className="muted-text">{selected.speaking ? 'Speaking character' : 'Not speaking in the script yet'}</div>
                    <h2 className="card-title">{selected.name}</h2>
                  </div>
                  {rec && (
                    <button className="btn btn-ghost btn-sm danger-text" onClick={() => setConfirm(true)}>
                      <Trash2 size={15} /> Delete
                    </button>
                  )}
                </div>

                {!rec ? (
                  <div className="notice info">
                    <strong>{selected.name}</strong> is in your script but not in your character database yet. Add them to keep an actor, costume
                    notes, props, and pictures in one place.
                    <div className="notice-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => addOne(selected)}>
                        <Plus size={15} /> Add to character database
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="people-fields" key={rec.id}>
                    <div className="two-fields">
                      <TextField id="ch-name" label="Name" value={rec.name} onChange={set('name')} />
                      <TextField
                        id="ch-actor"
                        label="Actor"
                        value={rec.actor}
                        onChange={set('actor')}
                        placeholder="Who plays this character?"
                        hint="The person who will play this character. Also called the cast."
                      />
                    </div>
                    <TextField
                      id="ch-alias"
                      label="Other names in the script"
                      value={rec.aliases}
                      onChange={set('aliases')}
                      placeholder="Chuck, Mr. Gardner"
                      hint="If your script calls this character by more than one name, list the others here, separated by commas. We use them to find their scenes."
                    />
                    <AreaField id="ch-desc" label="Description" value={rec.description} onChange={set('description')} placeholder="Age, personality, what they want" />
                    <AreaField
                      id="ch-cos"
                      label="Costume notes"
                      value={rec.costume}
                      onChange={set('costume')}
                      rows={2}
                      hint="What this character wears. Also called wardrobe."
                    />
                    <AreaField id="ch-props" label="Props" value={rec.props} onChange={set('props')} rows={2} hint="Objects this character carries or uses, like a backpack or a phone." />
                    <AreaField id="ch-notes" label="Character notes" value={rec.notes} onChange={set('notes')} rows={3} />
                    <div className="field">
                      <div className="label">
                        Reference pictures <Hint text="Photos that show the look or feeling you want, like costume ideas or the actor in costume." />
                      </div>
                      <PhotoGrid
                        paths={rec.images || []}
                        busy={uploading}
                        onAdd={(files) => addPhotos(rec, files)}
                        onRemove={(p) => removePhoto(rec, p)}
                      />
                    </div>
                  </div>
                )}

                <div className="field">
                  <div className="label">
                    Scenes{' '}
                    <Hint text="Every scene where this character speaks, or where their name appears in the action." />
                  </div>
                  {appears.length === 0 ? (
                    <p className="muted-text">Not in any scene yet.</p>
                  ) : (
                    <ul className="scene-links">
                      {appears.map(({ scene, speaks }) => (
                        <li key={scene.id}>
                          <Link to={`${base}/script?scene=${scene.id}`}>
                            <span className="scene-num small">{scene.number}</span>
                            <span>{scene.heading || 'Untitled scene'}</span>
                          </Link>
                          <span className="meta-text">{speaks ? 'speaks' : 'mentioned'}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      )}

      {asking && (
        <PromptModal
          title="New character"
          label="Character name"
          confirmLabel="Add character"
          onClose={() => setAsking(false)}
          onSubmit={async (name) => {
            try {
              const row = await characters.add(newCharacter(name))
              setAsking(false)
              setSelectedId(row.id)
            } catch (e) {
              toast(e.message?.includes('duplicate') ? 'You already have a character with that name.' : e.message || 'Could not add that.', 'error')
            }
          }}
        />
      )}
      {confirm && rec && (
        <ConfirmModal
          title={`Delete ${rec.name}?`}
          danger
          confirmLabel="Delete"
          message="This removes their notes and pictures from the database. The script is not changed."
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            setConfirm(false)
            setSelectedId(null)
            try {
              await characters.remove(rec.id)
              removeImages(rec.images || [])
            } catch (e) {
              toast(e.message || 'Could not delete.', 'error')
            }
          }}
        />
      )}
    </div>
  )
}
