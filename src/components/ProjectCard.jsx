import { useNavigate } from 'react-router-dom'
import { FileText, Clapperboard } from 'lucide-react'
import ProjectMenu from './ProjectMenu.jsx'
import { scriptOf } from '../lib/projects.js'
import { fmtPages } from '../lib/screenplay.js'
import { timeAgo } from '../lib/format.js'
import { useAuth } from '../lib/auth.jsx'
import { toneFor } from '../lib/look.js'

export default function ProjectCard({ project, onChanged }) {
  const nav = useNavigate()
  const { user } = useAuth()
  const isOwner = !project.user_id || project.user_id === user?.id
  const s = scriptOf(project)
  const st = s?.stats || {}
  const open = () => nav(`/project/${project.id}`)

  return (
    <div
      className={'card project-card tone-' + toneFor(project.title)}
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter') open()
      }}
    >
      <div className="pc-top">
        <div className="pc-mono tile" aria-hidden="true">
          {(project.title || '?').trim().charAt(0).toUpperCase()}
        </div>
        <ProjectMenu project={project} onChanged={onChanged} showOpen isOwner={isOwner} />
      </div>
      <h3 className="pc-title">{project.title}</h3>
      <div className="pc-badges">
        {project.is_demo && <span className="badge">Demo</span>}
        {!isOwner && <span className="badge">Shared with you</span>}
        {project.status === 'archived' && <span className="badge muted">Archived</span>}
      </div>
      <div className="pc-stats">
        <span>
          <FileText size={14} /> {fmtPages(st.pages)} pages
        </span>
        <span>
          <Clapperboard size={14} /> {st.scenes || 0} scenes
        </span>
      </div>
      <div className="pc-foot">Edited {timeAgo(s?.updated_at || project.updated_at)}</div>
    </div>
  )
}
