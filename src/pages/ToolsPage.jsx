import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { TOOLS, toolBySlug } from '../tools/registry.js'

export default function ToolsPage() {
  const { slug } = useParams()
  const tool = slug ? toolBySlug(slug) : null

  if (slug && !tool)
    return (
      <div className="page">
        <div className="empty">
          <h2>We could not find that tool</h2>
          <Link className="btn btn-primary" to="/tools">
            See all tools
          </Link>
        </div>
      </div>
    )

  if (!tool)
    return (
      <div className="page wide">
        <div className="page-head">
          <div>
            <h1>Tools</h1>
            <p className="muted-text">Quick helpers for planning your shoot. No project needed.</p>
          </div>
        </div>
        <div className="tool-cards">
          {TOOLS.map((t) => (
            <Link key={t.slug} to={`/tools/${t.slug}`} className={'card tool-card tone-' + t.tone}>
              <span className="tile">
                <t.icon size={20} />
              </span>
              <h2>{t.title}</h2>
              <p>{t.blurb}</p>
            </Link>
          ))}
        </div>
      </div>
    )

  const Tool = tool.Component
  return (
    <div className="page wide">
      <div className="crumbs tool-crumbs">
        <Link to="/tools">
          <ArrowLeft size={15} /> Tools
        </Link>
      </div>
      <div className="page-head">
        <div>
          <h1>{tool.title}</h1>
        </div>
      </div>
      <Tool />
      <nav className="tool-others" aria-label="Other tools">
        <h3>More tools</h3>
        <div className="chips">
          {TOOLS.filter((t) => t.slug !== tool.slug).map((t) => (
            <Link key={t.slug} to={`/tools/${t.slug}`} className="chip btn-chip">
              {t.title}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
