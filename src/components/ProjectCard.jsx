import { useNavigate } from 'react-router-dom'
import ProjectMenu from './ProjectMenu.jsx'
import { scriptOf } from '../lib/projects.js'
import { fmtPages } from '../lib/screenplay.js'
import { timeAgo } from '../lib/format.js'

export default function ProjectCard({ project, onChanged }) {
  const nav = useNavigate()
  const s = scriptOf(project)
  const st = s?.stats || {}
  const open = () => nav(`/project/${project.id}`)

  return (
    <div
      className="card project-card"
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter') open()
      }}
    >
      <div className="pc-top">
        <div className="pc-mono" aria-hidden="true">
          {(project.title || '?').trim().charAt(0).toUpperCase()}
        </div>
        <ProjectMenu project={project} onChanged={onChanged} showOpen />
      </div>
      <h3 className="pc-title">{project.title}</h3>
      <div className="pc-badges">
        {project.is_demo && <span className="badge">Demo</span>}
        {project.status === 'archived' && <span className="badge muted">Archived</span>}
      </div>
      <div className="pc-stats">
        <span>{fmtPages(st.pages)} pages</span>
        <span>{st.scenes || 0} scenes</span>
      </div>
      <div className="pc-foot">Edited {timeAgo(s?.updated_at || project.updated_at)}</div>
    </div>
  )
}
