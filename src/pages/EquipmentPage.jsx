import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Plus, X } from 'lucide-react'
import { useProject } from './ProjectLayout.jsx'
import Menu from '../components/Menu.jsx'
import Hint from '../components/Hint.jsx'
import { ConfirmModal, Modal } from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { daysUntil, fmtDate, whenText } from '../lib/dates.js'
import { GEAR_CATEGORIES, SCOPES, dayEquipment, equipmentStatus } from '../lib/equipment.js'
import { dayScenes } from '../lib/schedule.js'

function GearModal({ item, onClose, onSave }) {
  const [f, setF] = useState({ name: item?.name || '', category: item?.category || 'Cameras', quantity: item?.quantity ?? 1, notes: item?.notes || '' })
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  return (
    <Modal title={item ? 'Edit gear' : 'Add gear'} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (!f.name.trim()) return
          setBusy(true)
          await onSave({ name: f.name.trim(), category: f.category, quantity: Math.max(1, Number(f.quantity) || 1), notes: f.notes })
          setBusy(false)
        }}
      >
        <label className="label" htmlFor="g-name">
          Name
        </label>
        <input id="g-name" className="input" value={f.name} onChange={set('name')} placeholder="Sony A7 III, 50mm lens, tripod…" autoFocus />
        <div className="two-fields">
          <div>
            <label className="label" htmlFor="g-cat">
              Category
            </label>
            <select id="g-cat" className="input" value={f.category} onChange={set('category')}>
              {GEAR_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="g-qty">
              How many do you have?
            </label>
            <input id="g-qty" className="input" type="number" min="1" value={f.quantity} onChange={set('quantity')} />
          </div>
        </div>
        <label className="label" htmlFor="g-notes">
          Notes
        </label>
        <textarea id="g-notes" className="textarea" rows={2} value={f.notes} onChange={set('notes')} placeholder="Serial number, who owns it, battery info" />
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy || !f.name.trim()}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

function AssignModal({ gear, scenes, shots, shotLabels, days, initialScope = 'project', initialTarget = '', initialPick = null, onClose, onAssign }) {
  const [scope, setScope] = useState(initialScope)
  const [target, setTarget] = useState(initialTarget)
  const [picked, setPicked] = useState(() => new Set(initialPick ? [initialPick] : []))
  const [busy, setBusy] = useState(false)
  const toggle = (id) =>
    setPicked((p) => {
      const n = new Set(p)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  const needsTarget = scope !== 'project'
  const options =
    scope === 'scene'
      ? scenes.map((s) => ({ value: s.id, label: `Scene ${s.number}: ${s.heading || 'Untitled scene'}` }))
      : scope === 'shot'
      ? shots.map((s) => ({ value: s.id, label: `Shot ${shotLabels.get(s.id) || '—'}${s.description ? `: ${s.description.slice(0, 40)}` : ''}` }))
      : scope === 'day'
      ? days.map((d) => ({ value: d.id, label: `${d.label}${d.date ? ` (${fmtDate(d.date, { weekday: false })})` : ''}` }))
      : []
  const byCat = GEAR_CATEGORIES.map((c) => ({ c, items: gear.filter((g) => g.category === c) })).filter((g) => g.items.length)

  return (
    <Modal title="Assign gear" onClose={onClose} wide>
      <label className="label" htmlFor="as-scope">
        Where will it be used?
      </label>
      <div className="two-fields">
        <select
          id="as-scope"
          className="input"
          value={scope}
          onChange={(e) => {
            setScope(e.target.value)
            setTarget('')
          }}
        >
          {SCOPES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {needsTarget && (
          <select className="input" value={target} onChange={(e) => setTarget(e.target.value)} aria-label="Which one">
            <option value="">Choose…</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {needsTarget && options.length === 0 && <p className="field-note">There is nothing to choose from yet. Add one first.</p>}

      <div className="label">Pick your gear</div>
      <div className="gear-pick">
        {byCat.map(({ c, items }) => (
          <div key={c}>
            <div className="pool-group-title">{c}</div>
            {items.map((g) => (
              <label key={g.id} className="check">
                <input type="checkbox" checked={picked.has(g.id)} onChange={() => toggle(g.id)} />
                <span>
                  {g.name}
                  {g.quantity > 1 && <span className="meta-text"> x{g.quantity}</span>}
                </span>
              </label>
            ))}
          </div>
        ))}
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          disabled={busy || picked.size === 0 || (needsTarget && !target)}
          onClick={async () => {
            setBusy(true)
            await onAssign([...picked], scope, needsTarget ? target : null)
            setBusy(false)
          }}
        >
          {busy ? 'Assigning…' : `Assign ${picked.size || ''} ${picked.size === 1 ? 'item' : 'items'}`}
        </button>
      </div>
    </Modal>
  )
}

export default function EquipmentPage() {
  const { project, analysis, shots, shotLabels, gear, uses, days, prodError } = useProject()
  const toast = useToast()
  const [params] = useSearchParams()
  const [tab, setTab] = useState(params.get('day') ? 'checklist' : 'gear')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | item
  const [confirm, setConfirm] = useState(null)
  const [assigning, setAssigning] = useState(null) // null | { scope, target }
  const [dayId, setDayId] = useState(params.get('day') || '')

  const scenes = analysis.scenes
  const scenesById = useMemo(() => new Map(scenes.map((s) => [s.id, s])), [scenes])
  const sceneNumbers = useMemo(() => new Map(scenes.map((s) => [s.id, s.number])), [scenes])
  const itemById = new Map(gear.rows.map((g) => [g.id, g]))
  const dayList = days.rows
  const day = dayList.find((d) => d.id === dayId) || dayList.find((d) => d.date && daysUntil(d.date) >= 0) || dayList[0] || null

  const checklist = useMemo(
    () =>
      day
        ? dayEquipment({ day, sceneList: dayScenes(day, scenesById), uses: uses.rows, items: gear.rows, shots: shots.rows, labels: shotLabels, sceneNumbers })
        : [],
    [day, scenesById, uses.rows, gear.rows, shots.rows, shotLabels, sceneNumbers]
  )
  const status = day ? equipmentStatus(checklist, day) : { total: 0, checked: 0, unchecked: 0 }
  const soon = day?.date ? daysUntil(day.date) : null

  async function saveGear(values) {
    try {
      if (editing && editing !== 'new') gear.update(editing.id, values)
      else await gear.add(values)
      setEditing(null)
    } catch (e) {
      toast(e.message || 'Could not save that gear.', 'error')
    }
  }

  async function assign(itemIds, scope, target) {
    const have = new Set(uses.rows.map((u) => `${u.item_id}|${u.scope}|${u.target_id || ''}`))
    const fresh = itemIds.filter((id) => !have.has(`${id}|${scope}|${target || ''}`))
    try {
      if (fresh.length) await uses.addMany(fresh.map((item_id) => ({ item_id, scope, target_id: target })))
      toast(fresh.length ? 'Gear assigned' : 'Those are already assigned there')
      setAssigning(null)
    } catch (e) {
      toast(e.message || 'Could not assign that gear.', 'error')
    }
  }

  const label = (u) =>
    u.scope === 'project'
      ? 'Whole project'
      : u.scope === 'scene'
      ? `Scene ${sceneNumbers.get(u.target_id) ?? '?'}`
      : u.scope === 'shot'
      ? `Shot ${shotLabels.get(u.target_id) || '?'}`
      : dayList.find((d) => d.id === u.target_id)?.label || 'A shoot day'

  const filtered = gear.rows.filter((g) => !q.trim() || g.name.toLowerCase().includes(q.trim().toLowerCase()))
  const byCat = GEAR_CATEGORIES.map((c) => ({ c, items: filtered.filter((g) => g.category === c) })).filter((g) => g.items.length)

  // Assignments grouped by where they are used
  const groups = new Map()
  for (const u of uses.rows) {
    const key = `${u.scope}|${u.target_id || ''}`
    if (!groups.has(key)) groups.set(key, { key, label: label(u), scope: u.scope, uses: [] })
    groups.get(key).uses.push(u)
  }
  const order = { project: 0, day: 1, scene: 2, shot: 3 }
  const groupList = [...groups.values()].sort((a, b) => order[a.scope] - order[b.scope] || a.label.localeCompare(b.label, undefined, { numeric: true }))

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Equipment</h1>
          <p className="muted-text">Your gear, what each part of the film needs, and a checklist for shoot day.</p>
        </div>
        <div className="head-actions">
          <button className="btn btn-ghost" onClick={() => setAssigning({ scope: 'project', target: '' })} disabled={gear.rows.length === 0}>
            Assign gear
          </button>
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            <Plus size={16} /> Add gear
          </button>
        </div>
      </div>

      {prodError && (
        <div className="notice error">The equipment tables are not set up yet. Run the updated SQL file in Supabase, then refresh. ({prodError})</div>
      )}

      <div className="toolbar-row">
        <div className="seg" role="group" aria-label="Equipment views">
          <button className={tab === 'gear' ? 'on' : ''} onClick={() => setTab('gear')}>
            My gear ({gear.rows.length})
          </button>
          <button className={tab === 'project' ? 'on' : ''} onClick={() => setTab('project')}>
            In this project ({uses.rows.length})
          </button>
          <button className={tab === 'checklist' ? 'on' : ''} onClick={() => setTab('checklist')}>
            Shoot day checklist
          </button>
        </div>
        {tab === 'gear' && gear.rows.length > 0 && (
          <div className="search">
            <input placeholder="Search your gear" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search your gear" />
          </div>
        )}
      </div>

      {tab === 'gear' &&
        (gear.rows.length === 0 ? (
          <div className="empty">
            <h2>Add the gear you own or borrow</h2>
            <p>List your cameras, lenses, lights, microphones, and more. This list is yours, and you can use it in every project.</p>
            <button className="btn btn-primary" onClick={() => setEditing('new')}>
              <Plus size={16} /> Add your first piece of gear
            </button>
          </div>
        ) : (
          <div className="gear-groups">
            {byCat.map(({ c, items }) => (
              <section key={c} className="card pad">
                <h2 className="card-title">
                  {c} <span className="bd-count">{items.length}</span>
                </h2>
                <ul className="gear-list">
                  {items.map((g) => (
                    <li key={g.id}>
                      <div className="gear-main">
                        <strong>{g.name}</strong>
                        {g.quantity > 1 && <span className="meta-text"> x{g.quantity}</span>}
                        {g.notes && <div className="meta-text">{g.notes}</div>}
                      </div>
                      <Menu
                        label={`Options for ${g.name}`}
                        items={[
                          { label: 'Edit', onClick: () => setEditing(g) },
                          { label: 'Use in this project', onClick: () => setAssigning({ scope: 'project', target: '', pick: g.id }) },
                          { divider: true },
                          { label: 'Delete', danger: true, onClick: () => setConfirm(g) },
                        ]}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {byCat.length === 0 && <p className="muted-text">No gear matches that search.</p>}
          </div>
        ))}

      {tab === 'project' &&
        (uses.rows.length === 0 ? (
          <div className="empty">
            <h2>Nothing assigned yet</h2>
            <p>Say which gear your film needs. You can assign it to the whole project, a scene, a shot, or a shoot day.</p>
            <button className="btn btn-primary" onClick={() => setAssigning({ scope: 'project', target: '' })} disabled={gear.rows.length === 0}>
              Assign gear
            </button>
            {gear.rows.length === 0 && <p className="field-note">Add some gear first, from the My gear view.</p>}
          </div>
        ) : (
          <div className="gear-groups">
            {groupList.map((g) => (
              <section key={g.key} className="card pad">
                <h2 className="card-title">{g.label}</h2>
                <div className="chips">
                  {g.uses.map((u) => (
                    <span key={u.id} className="chip date-chip">
                      {itemById.get(u.item_id)?.name || 'Removed gear'}
                      <button type="button" aria-label={`Remove ${itemById.get(u.item_id)?.name || 'gear'} from ${g.label}`} onClick={() => uses.remove(u.id)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ))}

      {tab === 'checklist' &&
        (dayList.length === 0 ? (
          <div className="empty">
            <h2>No shoot days yet</h2>
            <p>Add a shoot day on the Schedule tab. Its gear checklist is built from the scenes you put on it.</p>
            <Link className="btn btn-primary" to={`/project/${project.id}/schedule`}>
              Open the schedule
            </Link>
          </div>
        ) : (
          <div className="card pad checklist">
            <div className="checklist-head">
              <select className="input compact" value={day?.id || ''} onChange={(e) => setDayId(e.target.value)} aria-label="Shoot day">
                {dayList.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                    {d.date ? ` (${fmtDate(d.date, { weekday: false })})` : ''}
                  </option>
                ))}
              </select>
              <span className="tb-spacer" />
              <button className="btn btn-ghost btn-sm" onClick={() => setAssigning({ scope: 'day', target: day.id })} disabled={gear.rows.length === 0}>
                Add gear to this day
              </button>
              <button
                className="btn btn-ghost btn-sm"
                disabled={status.total === 0 || status.unchecked === 0}
                onClick={() => days.update(day.id, { equip_checked: { ...(day.equip_checked || {}), ...Object.fromEntries(checklist.map((e) => [e.item.id, true])) } })}
              >
                Check everything
              </button>
            </div>

            {status.total > 0 && (
              <>
                <div className="sl-progress-top">
                  <strong>
                    {status.checked} of {status.total} ready
                  </strong>
                  {day.date && <span className="meta-text">{fmtDate(day.date)}, {whenText(day.date)}</span>}
                </div>
                <div className="progress" aria-hidden="true">
                  <span style={{ width: Math.round((status.checked / status.total) * 100) + '%' }} />
                </div>
              </>
            )}

            {status.unchecked > 0 && soon !== null && soon >= 0 && soon <= 3 && (
              <div className="warning warn big">
                <AlertTriangle size={16} />
                <span>
                  {status.unchecked} {status.unchecked === 1 ? 'item is' : 'items are'} not checked off yet, and this shoot is {whenText(day.date)}.
                </span>
              </div>
            )}

            {checklist.length === 0 ? (
              <p className="muted-text pad-top">
                Nothing is assigned to this day yet. Gear assigned to the whole project, to this day, or to scenes and shots on this day will appear here.
              </p>
            ) : (
              <ul className="check-list">
                {checklist.map((e) => {
                  const on = Boolean(day.equip_checked?.[e.item.id])
                  const dayUse = uses.rows.find((u) => u.scope === 'day' && u.target_id === day.id && u.item_id === e.item.id)
                  return (
                    <li key={e.item.id} className={on ? 'done' : ''}>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(ev) => days.update(day.id, { equip_checked: { ...(day.equip_checked || {}), [e.item.id]: ev.target.checked } })}
                        />
                        <span>{e.item.name}</span>
                      </label>
                      <span className="chips">
                        <span className="chip small">{e.item.category}</span>
                        {e.why.map((w) => (
                          <span key={w} className="chip small">
                            {w}
                          </span>
                        ))}
                      </span>
                      {dayUse && (
                        <button className="icon-btn small" aria-label={`Remove ${e.item.name} from this day`} onClick={() => uses.remove(dayUse.id)}>
                          <X size={14} />
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="field-note">
              A checklist makes sure nothing is left behind.{' '}
              <Hint text="Check items off as you pack them. Gear marked Whole project is needed every day, and gear tied to scenes appears on the days those scenes are scheduled." />
            </p>
          </div>
        ))}

      {editing && <GearModal item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSave={saveGear} />}
      {assigning && (
        <AssignModal
          gear={gear.rows}
          scenes={scenes}
          shots={shots.rows}
          shotLabels={shotLabels}
          days={dayList}
          initialScope={assigning.scope}
          initialTarget={assigning.target}
          initialPick={assigning.pick}
          onClose={() => setAssigning(null)}
          onAssign={assign}
        />
      )}
      {confirm && (
        <ConfirmModal
          title={`Delete ${confirm.name}?`}
          danger
          confirmLabel="Delete"
          message="It is removed from your gear list and from every project where you used it."
          onClose={() => setConfirm(null)}
          onConfirm={async () => {
            const g = confirm
            setConfirm(null)
            try {
              await gear.remove(g.id)
              const gone = uses.rows.filter((u) => u.item_id === g.id).map((u) => u.id)
              if (gone.length) await uses.removeMany(gone)
            } catch (e) {
              toast(e.message || 'Could not delete that.', 'error')
            }
          }}
        />
      )}
    </div>
  )
}
