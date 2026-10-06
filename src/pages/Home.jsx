import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Clapperboard, FilePlus2, FileText, FolderKanban, Plus } from 'lucide-react'
import ProjectCard from '../components/ProjectCard.jsx'
import NewProjectModal from '../components/NewProjectModal.jsx'
import { useAuth } from '../lib/auth.jsx'
import { scriptOf, useProjectList } from '../lib/projects.js'
import { fmtPages } from '../lib/screenplay.js'
import { timeAgo } from '../lib/format.js'
import { toneFor } from '../lib/look.js'

function greeting() {
  const h = new Date().getHours()
  return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export default function Home() {
  const nav = useNavigate()
  const { user } = useAuth()
  const { projects, error, reload } = useProjectList()
  const [modal, setModal] = useState(null) // 'new' | 'import'

  const first = (user?.user_metadata?.full_name || '').split(' ')[0]
  const active = (projects || []).filter((p) => p.status === 'active')
  const recent = active.slice(0, 4)
  const scripts = active
    .filter((p) => scriptOf(p))
    .sort((a, b) => new Date(scriptOf(b).updated_at) - new Date(scriptOf(a).updated_at))
    .slice(0, 5)
  const totalPages = active.reduce((n, p) => n + (scriptOf(p)?.stats?.pages || 0), 0)
  const totalScenes = active.reduce((n, p) => n + (scriptOf(p)?.stats?.scenes || 0), 0)

  return (
    <div className="page">
      <section className="welcome">
        <div>
          <h1>
            {greeting()}
            {first ? `, ${first}` : ''}.
          </h1>
          <p>Pick up where you left off, or start something new.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => setModal('new')}>
          <Plus size={18} /> New project
        </button>
      </section>

      {error && <div className="notice error">{error}</div>}

      {projects && active.length > 0 && (
        <section className="mini-stats" aria-label="Your totals">
          <div className="mini tone-violet">
            <span className="tile">
              <FolderKanban size={18} />
            </span>
            <div>
              <strong>{active.length}</strong>
              <small>{active.length === 1 ? 'Project' : 'Projects'}</small>
            </div>
          </div>
          <div className="mini tone-pink">
            <span className="tile">
              <FileText size={18} />
            </span>
            <div>
              <strong>{fmtPages(totalPages)}</strong>
              <small>Pages written</small>
            </div>
          </div>
          <div className="mini tone-amber">
            <span className="tile">
              <Clapperboard size={18} />
            </span>
            <div>
              <strong>{totalScenes}</strong>
              <small>Scenes planned</small>
            </div>
          </div>
        </section>
      )}

      <section className="quick-create" aria-label="Quick create">
        <button className="quick-btn tone-pink" onClick={() => setModal('new')}>
          <span className="tile">
            <Plus size={20} />
          </span>
          <span>
            <strong>New project</strong>
            <small>Start with a blank script</small>
          </span>
        </button>
        <button className="quick-btn tone-violet" onClick={() => setModal('import')}>
          <span className="tile">
            <FilePlus2 size={20} />
          </span>
          <span>
            <strong>Import a script</strong>
            <small>Paste one you already wrote</small>
          </span>
        </button>
      </section>

      {projects && active.length === 0 && (
        <div className="empty">
          <img src="/taketwo-logo.png" alt="" className="empty-logo" />
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
            <Link to="/scripts" className="text-link">
              See all scripts
            </Link>
          </div>
          <div className="list">
            {scripts.map((p) => {
              const s = scriptOf(p)
              return (
                <button key={p.id} className={'list-row tone-' + toneFor(p.title)} onClick={() => nav(`/project/${p.id}/script`)}>
                  <span className="lr-title">
                    <span className="lr-dot" aria-hidden="true" />
                    {p.title}
                  </span>
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
