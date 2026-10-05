import { useNavigate } from 'react-router-dom'
import { scriptOf, useProjectList } from '../lib/projects.js'
import { fmtPages } from '../lib/screenplay.js'
import { timeAgo } from '../lib/format.js'

export default function Scripts() {
  const nav = useNavigate()
  const { projects, error } = useProjectList()
  const rows = (projects || [])
    .filter((p) => p.status === 'active' && scriptOf(p))
    .sort((a, b) => new Date(scriptOf(b).updated_at) - new Date(scriptOf(a).updated_at))

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Scripts</h1>
          <p className="muted-text">Every screenplay across your projects.</p>
        </div>
      </div>
      {error && <div className="notice error">{error}</div>}
      {projects && rows.length === 0 && (
        <div className="empty">
          <h2>No scripts yet</h2>
          <p>Scripts live inside projects. Create a project and its script is ready to write.</p>
        </div>
      )}
      <div className="list">
        {rows.map((p) => {
          const s = scriptOf(p)
          return (
            <button key={p.id} className="list-row" onClick={() => nav(`/project/${p.id}/script`)}>
              <span className="lr-title">
                {p.title} {p.is_demo && <span className="badge">Demo</span>}
              </span>
              <span className="lr-meta">
                <span>{fmtPages(s.stats?.pages)} pages</span>
                <span>{s.stats?.scenes || 0} scenes</span>
                <span>{s.stats?.characters || 0} speaking characters</span>
                <span>{timeAgo(s.updated_at)}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
