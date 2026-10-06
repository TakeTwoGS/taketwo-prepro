import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useProject } from './ProjectLayout.jsx'
import { useToast } from '../components/Toast.jsx'
import { daysUntil, fmtDateShort } from '../lib/dates.js'

const STATUSES = ['To do', 'In progress', 'Done']
const PRIORITIES = ['High', 'Medium', 'Low']
const RANK = { High: 0, Medium: 1, Low: 2 }

export default function TasksPage() {
  const { people, tasks, prodError } = useProject()
  const toast = useToast()
  const [name, setName] = useState('')
  const [filter, setFilter] = useState('open')
  const [who, setWho] = useState('all')

  const crew = people.rows.slice().sort((a, b) => a.name.localeCompare(b.name))
  const all = tasks.rows
  const open = all.filter((t) => t.status !== 'Done')
  const overdue = open.filter((t) => t.due_date && daysUntil(t.due_date) < 0)

  const shown = all
    .filter((t) => (filter === 'open' ? t.status !== 'Done' : filter === 'done' ? t.status === 'Done' : true))
    .filter((t) => (who === 'all' ? true : who === 'none' ? !t.person_id : t.person_id === who))
    .sort(
      (a, b) =>
        (a.status === 'Done') - (b.status === 'Done') ||
        (a.due_date || '9999').localeCompare(b.due_date || '9999') ||
        RANK[a.priority] - RANK[b.priority] ||
        a.name.localeCompare(b.name)
    )

  async function addTask(e) {
    e.preventDefault()
    const text = name.trim()
    if (!text) return
    setName('')
    try {
      await tasks.add({ name: text, person_id: null, due_date: null, priority: 'Medium', status: 'To do' })
    } catch (err) {
      setName(text)
      toast(err.message || 'Could not add that task.', 'error')
    }
  }

  const set = (id, patch) => tasks.update(id, patch)

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Tasks</h1>
          <p className="muted-text">A simple to-do list for your production, like booking a location or borrowing a tripod.</p>
        </div>
      </div>

      {prodError && <div className="notice error">The task tables are not set up yet. Run the updated SQL file in Supabase, then refresh. ({prodError})</div>}

      <form className="task-add card pad" onSubmit={addTask}>
        <input className="input" placeholder="Add a task, like “Reserve the restaurant location”" value={name} onChange={(e) => setName(e.target.value)} aria-label="New task" />
        <button className="btn btn-primary" disabled={!name.trim()}>
          <Plus size={16} /> Add task
        </button>
      </form>

      <div className="toolbar-row">
        <div className="seg" role="group" aria-label="Show tasks">
          <button className={filter === 'open' ? 'on' : ''} onClick={() => setFilter('open')}>
            To do ({open.length})
          </button>
          <button className={filter === 'done' ? 'on' : ''} onClick={() => setFilter('done')}>
            Done ({all.length - open.length})
          </button>
          <button className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>
            All
          </button>
        </div>
        <select className="input compact" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Filter by person">
          <option value="all">Everyone</option>
          <option value="none">Unassigned</option>
          {crew.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="tb-spacer" />
        {overdue.length > 0 && <span className="meta-text overdue-note">{overdue.length} overdue</span>}
      </div>

      {all.length === 0 ? (
        <div className="empty">
          <h2>No tasks yet</h2>
          <p>Type a task above and press Enter. Give it a person and a due date so nothing slips.</p>
        </div>
      ) : shown.length === 0 ? (
        <div className="empty">
          <h2>Nothing here</h2>
          <p>{filter === 'open' ? 'You are all caught up.' : 'No tasks match those filters.'}</p>
        </div>
      ) : (
        <div className="task-list">
          {shown.map((t) => {
            const late = t.status !== 'Done' && t.due_date && daysUntil(t.due_date) < 0
            return (
              <div key={t.id} className={'task' + (t.status === 'Done' ? ' done' : '')}>
                <input
                  type="checkbox"
                  className="task-check"
                  checked={t.status === 'Done'}
                  onChange={(e) => set(t.id, { status: e.target.checked ? 'Done' : 'To do' })}
                  aria-label={`Mark ${t.name} done`}
                />
                <input className="task-name" value={t.name} onChange={(e) => set(t.id, { name: e.target.value })} aria-label="Task name" />
                <select className="cell" value={t.person_id || ''} onChange={(e) => set(t.id, { person_id: e.target.value || null })} aria-label={`Who is doing ${t.name}`}>
                  <option value="">Unassigned</option>
                  {crew.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  className={'cell date' + (late ? ' late' : '')}
                  type="date"
                  value={t.due_date || ''}
                  onChange={(e) => set(t.id, { due_date: e.target.value || null })}
                  aria-label={`Due date for ${t.name}`}
                  title={t.due_date ? fmtDateShort(t.due_date) : 'No due date'}
                />
                <select className={'cell prio p-' + t.priority.toLowerCase()} value={t.priority} onChange={(e) => set(t.id, { priority: e.target.value })} aria-label={`Priority for ${t.name}`}>
                  {PRIORITIES.map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                <select className="cell" value={t.status} onChange={(e) => set(t.id, { status: e.target.value })} aria-label={`Status for ${t.name}`}>
                  {STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <button
                  className="icon-btn"
                  aria-label={`Delete ${t.name}`}
                  onClick={() => tasks.remove(t.id).catch((e) => toast(e.message || 'Could not delete that task.', 'error'))}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
