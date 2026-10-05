import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FilePlus2, Plus } from 'lucide-react'
import ProjectCard from '../components/ProjectCard.jsx'
import NewProjectModal from '../components/NewProjectModal.jsx'
import { scriptOf, useProjectList } from '../lib/projects.js'
import { fmtPages } from '../lib/screenplay.js'
import { timeAgo } from '../lib/format.js'

export default function Home() {
  const nav = useNavigate()
  const { projects, error, reload } = useProjectList()
  const [modal, setModal] = useState(null) // 'new' | 'import'

  const active = (projects || []).filter((p) => p.status === 'active')
  const recent = active.slice(0, 4)
  const scripts = active
    .filter((p) => scriptOf(p))
    .sort((a, b) => new Date(scriptOf(b).updated_at) - new Date(scriptOf(a).updated_at))
    .slice(0, 5)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Home</h1>
          <p className="muted-text">Pick up where you left off, or start something new.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>
          <Plus size={16} /> New project
        </button>
      </div>

      {error && <div className="notice error">{error}</div>}

      <section className="quick-create" aria-label="Quick create">
        <button className="quick-btn" onClick={() => setModal('new')}>
          <Plus size={18} />
          <span>
            <strong>New project</strong>
            <small>Start with a blank script</small>
          </span>
        </button>
        <button className="quick-btn" onClick={() => setModal('import')}>
          <FilePlus2 size={18} />
          <span>
            <strong>Import a script</strong>
            <small>Paste one you already wrote</small>
          </span>
        </button>
      </section>

      {projects && active.length === 0 && (
        <div className="empty">
          <h2>No projects yet</h2>
          <p>Create a project to start writing. Everything you add to it stays together in one place.</p>
          <button className="btn btn-primary" onClick={() => setModal('new')}>
            Create your first project
          </button>
        </div>
      )}

      {recent.length > 0 && (
        <section>
          <div className="section-head">
            <h2>Recent projects</h2>
            <Link to="/projects" className="text-link">
              See all projects
            </Link>
          </div>
          <div className="grid-cards">
            {recent.map((p) => (
              <ProjectCard key={p.id} project={p} onChanged={reload} />
            ))}
          </div>
        </section>
      )}

      {scripts.length > 0 && (
        <section>
          <div className="section-head">
            <h2>Recently edited scripts</h2>
          </div>
          <div className="list">
            {scripts.map((p) => {
              const s = scriptOf(p)
              return (
                <button key={p.id} className="list-row" onClick={() => nav(`/project/${p.id}/script`)}>
                  <span className="lr-title">{p.title}</span>
                  <span className="lr-meta">
                    <span>{fmtPages(s.stats?.pages)} pages</span>
                    <span>{s.stats?.scenes || 0} scenes</span>
                    <span>{timeAgo(s.updated_at)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {modal && <NewProjectModal startWithPaste={modal === 'import'} onClose={() => setModal(null)} />}
    </div>
  )
}
