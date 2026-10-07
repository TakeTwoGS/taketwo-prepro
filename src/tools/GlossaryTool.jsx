import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { CATEGORIES, GLOSSARY } from '../lib/glossary.js'

export default function GlossaryTool() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const cat = params.get('cat') || 'All'
  const set = (key, value) => {
    const next = new URLSearchParams(params)
    value && value !== 'All' ? next.set(key, value) : next.delete(key)
    setParams(next, { replace: true })
  }

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return GLOSSARY.filter((g) => cat === 'All' || g.cat === cat)
      .filter((g) => !needle || g.term.toLowerCase().includes(needle) || g.def.toLowerCase().includes(needle))
      .sort((a, b) => a.term.localeCompare(b.term, undefined, { numeric: true }))
  }, [q, cat])

  const groups = []
  for (const g of list) {
    const letter = /[a-z]/i.test(g.term[0]) ? g.term[0].toUpperCase() : '#'
    if (!groups.length || groups[groups.length - 1].letter !== letter) groups.push({ letter, items: [] })
    groups[groups.length - 1].items.push(g)
  }

  return (
    <div className="tool">
      <p className="muted-text tool-intro">Filmmaking has its own language. Here is every term explained in plain words. Search, or browse by topic.</p>
      <div className="toolbar-row">
        <div className="search">
          <Search size={16} />
          <input placeholder="Search terms, like focus or gaffer" value={q} onChange={(e) => set('q', e.target.value)} aria-label="Search the glossary" />
        </div>
        <div className="chips" role="group" aria-label="Topic">
          {['All', ...CATEGORIES].map((c) => (
            <button key={c} className={'chip btn-chip' + (cat === c ? ' on' : '')} aria-pressed={cat === c} onClick={() => set('cat', c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
      {list.length === 0 ? (
        <div className="empty">
          <h2>No terms match</h2>
          <p>Try a shorter word, or clear the topic filter.</p>
        </div>
      ) : (
        <div className="gloss">
          {groups.map((g) => (
            <section key={g.letter} className="gloss-group">
              <h2 className="gloss-letter">{g.letter}</h2>
              <dl>
                {g.items.map((t) => (
                  <div key={t.term} className="gloss-item">
                    <dt>
                      {t.term} <span className="badge muted">{t.cat}</span>
                    </dt>
                    <dd>{t.def}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
      <p className="field-note">{list.length} of {GLOSSARY.length} terms shown.</p>
    </div>
  )
}
