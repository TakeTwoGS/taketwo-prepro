import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Clock } from 'lucide-react'
import { ARTICLES, articleBySlug } from '../lib/learn.js'
import { VISUALS } from '../components/ArticleVisuals.jsx'

function Block({ b }) {
  if (b.t === 'p') return <p>{b.text}</p>
  if (b.t === 'h') return <h2>{b.text}</h2>
  if (b.t === 'list')
    return (
      <ul>
        {b.items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    )
  if (b.t === 'steps')
    return (
      <ol className="art-steps">
        {b.items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ol>
    )
  if (b.t === 'tip')
    return (
      <aside className="art-tip">
        <strong>Tip</strong> {b.text}
      </aside>
    )
  if (b.t === 'visual') {
    const V = VISUALS[b.name]
    return V ? (
      <div className="art-visual">
        <V />
      </div>
    ) : null
  }
  if (b.t === 'link')
    return (
      <p>
        <Link className="btn btn-ghost" to={b.to}>
          {b.label} <ArrowRight size={15} />
        </Link>
      </p>
    )
  return null
}

export default function LearnPage() {
  const { slug } = useParams()
  const article = slug ? articleBySlug(slug) : null

  if (slug && !article)
    return (
      <div className="page">
        <div className="empty">
          <h2>We could not find that guide</h2>
          <Link className="btn btn-primary" to="/learn">
            See all guides
          </Link>
        </div>
      </div>
    )

  if (!article)
    return (
      <div className="page wide">
        <div className="page-head">
          <div>
            <h1>Learn</h1>
            <p className="muted-text">Short, practical guides that match the tools you use. Each takes a few minutes.</p>
          </div>
        </div>
        <div className="tool-cards">
          {ARTICLES.map((a) => (
            <Link key={a.slug} to={`/learn/${a.slug}`} className={'card tool-card tone-' + a.tone}>
              <span className="learn-min">
                <Clock size={13} /> {a.minutes} min read
              </span>
              <h2>{a.title}</h2>
              <p>{a.blurb}</p>
            </Link>
          ))}
        </div>
        <p className="field-note">
          Stuck on a word? Try the{' '}
          <Link className="text-link" to="/tools/glossary">
            film glossary
          </Link>
          .
        </p>
      </div>
    )

  const i = ARTICLES.findIndex((a) => a.slug === article.slug)
  const next = ARTICLES[(i + 1) % ARTICLES.length]
  return (
    <div className="page article-page">
      <div className="crumbs tool-crumbs">
        <Link to="/learn">
          <ArrowLeft size={15} /> All guides
        </Link>
      </div>
      <article className={'article tone-' + article.tone}>
        <span className="learn-min">
          <Clock size={13} /> {article.minutes} min read
        </span>
        <h1>{article.title}</h1>
        <p className="article-lead">{article.blurb}</p>
        {article.body.map((b, n) => (
          <Block key={n} b={b} />
        ))}
      </article>
      <Link to={`/learn/${next.slug}`} className="card next-card">
        <span className="meta-text">Next guide</span>
        <strong>{next.title}</strong>
        <ArrowRight size={18} />
      </Link>
    </div>
  )
}
