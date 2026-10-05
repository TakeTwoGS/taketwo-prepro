import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import ProjectCard from '../components/ProjectCard.jsx'
import NewProjectModal from '../components/NewProjectModal.jsx'
import { useProjectList } from '../lib/projects.js'

export default function Projects() {
  const { projects, error, reload } = useProjectList()
  const [filter, setFilter] = useState('active')
  const [q, setQ] = useState('')
  const [newOpen, setNewOpen] = useState(false)

  const shown = (projects || [])
    .filter((p) => p.status === filter)
    .filter((p) => p.title.toLowerCase().includes(q.trim().toLowerCase()))
  const archivedCount = (projects || []).filter((p) => p.status === 'archived').length

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Projects</h1>
          <p className="muted-text">Each film is its own workspace.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
          <Plus size={16} /> New project
        </button>
      </div>

      <div className="toolbar-row">
        <div className="seg">
          <button className={filter === 'active' ? 'on' : ''} onClick={() => setFilter('active')}>
            Active
          </button>
          <button className={filter === 'archived' ? 'on' : ''} onClick={() => setFilter('archived')}>
            Archived{archivedCount ? ` (${archivedCount})` : ''}
          </button>
        </div>
        <div className="search">
          <Search size={16} />
          <input placeholder="Search projects" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search projects" />
        </div>
      </div>

      {error && <div className="notice error">{error}</div>}

      {projects && shown.length === 0 && (
        <div className="empty">
          <h2>{q ? 'No projects match that search' : filter === 'archived' ? 'Nothing archived' : 'No projects yet'}</h2>
          {!q && filter === 'active' && (
            <>
              <p>Create a project to start writing your script.</p>
              <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
                Create a project
              </button>
            </>
          )}
        </div>
      )}

      <div className="grid-cards">
        {shown.map((p) => (
          <ProjectCard key={p.id} project={p} onChanged={reload} />
        ))}
      </div>

      {newOpen && <NewProjectModal onClose={() => setNewOpen(false)} />}
    </div>
  )
}
