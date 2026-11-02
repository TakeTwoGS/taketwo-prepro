import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useProject } from './ProjectLayout.jsx'
import EntryList from '../components/EntryList.jsx'
import PhotoGrid from '../components/PhotoGrid.jsx'
import Hint from '../components/Hint.jsx'
import { AreaField, SelectField, TextField } from '../components/Fields.jsx'
import { ConfirmModal, PromptModal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { removeImages, uploadImage } from '../lib/images.js'
import { PERMISSIONS, buildLocationEntries, locationScenes, newLocation } from '../lib/people.js'

const PERM_TONE = { 'Not asked yet': 'gray', Asked: 'amber', Approved: 'green', Denied: 'red', 'Not needed': 'blue' }

export default function LocationsPage() {
  const { project, analysis, locations, userId, extrasError } = useProject()
  const toast = useToast()
  const [params] = useSearchParams()
  const [selectedId, setSelectedId] = useState(null)
  const [q, setQ] = useState('')
  const [asking, setAsking] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [uploading, setUploading] = useState(false)

  const entries = useMemo(() => buildLocationEntries(analysis.locations, locations.rows), [analysis.locations, locations.rows])
  const selected = entries.find((e) => e.id === selectedId) || null
  const missing = entries.filter((e) => !e.record)
  const base = `/project/${project.id}`

  const nameParam = params.get('name')
  useEffect(() => {
    if (!nameParam) return
    const e = entries.find((x) => x.names.has(nameParam.toUpperCase()))
    if (e) setSelectedId(e.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameParam])

  async function addOne(entry) {
    try {
      const rec = await locations.add(newLocation(entry.name))
      setSelectedId(rec.id)
    } catch (e) {
      toast(e.message || 'Could not add that location.', 'error')
    }
  }

  async function addAll() {
    try {
      await locations.addMany(missing.map((e) => newLocation(e.name)))
      toast(`${missing.length} ${missing.length === 1 ? 'location' : 'locations'} added`)
    } catch (e) {
      toast(e.message || 'Could not add the locations.', 'error')
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
      const current = locations.rowsRef.current.find((r) => r.id === rec.id)?.photos || []
      locations.update(rec.id, { photos: [...current, ...added] })
    }
    setUploading(false)
  }

  function removePhoto(rec, path) {
    const current = locations.rowsRef.current.find((r) => r.id === rec.id)?.photos || []
    locations.update(rec.id, { photos: current.filter((p) => p !== path) })
    removeImages([path])
  }

  const rec = selected?.record
  const scenesHere = selected ? locationScenes(selected, analysis.scenes) : []
  const set = (field) => (v) => locations.update(rec.id, { [field]: v })

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Locations</h1>
          <p className="muted-text">Every place you will film, with the details your crew needs.</p>
        </div>
        <div className="head-actions">
          {missing.length > 0 && (
            <button className="btn btn-ghost" onClick={addAll}>
              Add all from script ({missing.length})
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setAsking(true)}>
            <Plus size={16} /> New location
          </button>
        </div>
      </div>

      {extrasError && (
        <div className="notice error">The location tables are not set up yet. Run the updated SQL file in Supabase, then refresh. ({extrasError})</div>
      )}

      {entries.length === 0 ? (
        <div className="empty">
          <h2>No locations yet</h2>
          <p>Locations appear here from your scene headings, like INT. DINER - NIGHT. You can also add a place by hand.</p>
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
            searchLabel="Search locations"
            tone="teal"
            meta={(e) => {
              const n = locationScenes(e, analysis.scenes).length
              return `${n} ${n === 1 ? 'scene' : 'scenes'}${e.record ? `, ${e.record.permission}` : ''}`
            }}
          />

          <section className="people-detail card pad" aria-live="polite">
            {!selected ? (
              <div className="detail-empty">
                <h2 className="card-title">Location details</h2>
                <p className="muted-text">Pick a location to add its address, parking, power, and scouting photos. Scenes filmed there are listed for you.</p>
              </div>
            ) : (
              <>
                <div className="detail-head">
                  <div>
                    <div className="muted-text">{selected.inScript ? 'Used in your script' : 'Not in the script yet'}</div>
                    <h2 className="card-title">{selected.name}</h2>
                  </div>
                  {rec && (
                    <div className="detail-head-actions">
                      <span className={'perm st-' + PERM_TONE[rec.permission]}>{rec.permission}</span>
                      <button className="btn btn-ghost btn-sm danger-text" onClick={() => setConfirm(true)}>
                        <Trash2 size={15} /> Delete
                      </button>
                    </div>
                  )}
                </div>

                {!rec ? (
                  <div className="notice info">
                    <strong>{selected.name}</strong> comes from your scene headings but is not in your location database yet. Add it to keep the address,
                    contact person, and photos together.
                    <div className="notice-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => addOne(selected)}>
                        <Plus size={15} /> Add to location database
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="people-fields" key={rec.id}>
                    <div className="two-fields">
                      <TextField id="lc-name" label="Name" value={rec.name} onChange={set('name')} />
                      <SelectField
                        id="lc-perm"
                        label="Permission status"
                        value={rec.permission}
                        onChange={set('permission')}
                        options={PERMISSIONS}
                        empty={null}
                        hint="Whether you have asked the owner for permission to film here. Always get permission before you film."
                      />
                    </div>
                    <TextField
                      id="lc-alias"
                      label="Other names in scene headings"
                      value={rec.aliases}
                      onChange={set('aliases')}
                      placeholder="APARTMENT - KITCHEN, APARTMENT BALCONY"
                      hint="If several scene headings are really the same place, list the other names here, separated by commas, and their scenes are counted together."
                    />
                    <TextField id="lc-address" label="Address" value={rec.address} onChange={set('address')} />
                    <TextField id="lc-contact" label="Contact person" value={rec.contact} onChange={set('contact')} placeholder="Name and phone or email" />
                    <div className="two-fields">
                      <AreaField id="lc-parking" label="Parking" value={rec.parking} onChange={set('parking')} rows={2} placeholder="Where can the crew park?" />
                      <AreaField
                        id="lc-power"
                        label="Power"
                        value={rec.power}
                        onChange={set('power')}
                        rows={2}
                        placeholder="Outlets, generator needed?"
                        hint="Where you can plug in lights and chargers. Some places have none."
                      />
                    </div>
                    <div className="two-fields">
                      <AreaField id="lc-rest" label="Restrooms" value={rec.restrooms} onChange={set('restrooms')} rows={2} />
                      <AreaField
                        id="lc-sound"
                        label="Sound concerns"
                        value={rec.sound}
                        onChange={set('sound')}
                        rows={2}
                        placeholder="Traffic, air conditioning, planes"
                        hint="Noises that could ruin your audio, like traffic, a loud fridge, or an air conditioner."
                      />
                    </div>
                    <AreaField
                      id="lc-light"
                      label="Lighting notes"
                      value={rec.lighting}
                      onChange={set('lighting')}
                      rows={2}
                      placeholder="Big windows, where the sun comes in"
                    />
                    <AreaField id="lc-notes" label="Notes" value={rec.notes} onChange={set('notes')} rows={3} />
                    <div className="field">
                      <div className="label">
                        Scouting photos <Hint text="Photos you take while visiting a place before you film, so you can plan your shots." />
                      </div>
                      <PhotoGrid
                        paths={rec.photos || []}
                        max={12}
                        busy={uploading}
                        addLabel="Add photos"
                        onAdd={(files) => addPhotos(rec, files)}
                        onRemove={(p) => removePhoto(rec, p)}
                      />
                    </div>
                  </div>
                )}

                <div className="field">
                  <div className="label">Scenes filmed here</div>
                  {scenesHere.length === 0 ? (
                    <p className="muted-text">No scenes use this location yet.</p>
                  ) : (
                    <ul className="scene-links">
                      {scenesHere.map((scene) => (
                        <li key={scene.id}>
                          <Link to={`${base}/script?scene=${scene.id}`}>
                            <span className="scene-num small">{scene.number}</span>
                            <span>{scene.heading || 'Untitled scene'}</span>
                          </Link>
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
          title="New location"
          label="Location name"
          confirmLabel="Add location"
          onClose={() => setAsking(false)}
          onSubmit={async (name) => {
            try {
              const row = await locations.add(newLocation(name))
              setAsking(false)
              setSelectedId(row.id)
            } catch (e) {
              toast(e.message?.includes('duplicate') ? 'You already have a location with that name.' : e.message || 'Could not add that.', 'error')
            }
          }}
        />
      )}
      {confirm && rec && (
        <ConfirmModal
          title={`Delete ${rec.name}?`}
          danger
          confirmLabel="Delete"
          message="This removes its details and photos from the database. The script is not changed."
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            setConfirm(false)
            setSelectedId(null)
            try {
              await locations.remove(rec.id)
              removeImages(rec.photos || [])
            } catch (e) {
              toast(e.message || 'Could not delete.', 'error')
            }
          }}
        />
      )}
    </div>
  )
}
