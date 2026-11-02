import { Search } from 'lucide-react'
import { useImageUrl } from '../lib/images.js'

export function Avatar({ path, name, tone = 'violet', size = 40 }) {
  const url = useImageUrl(path)
  return (
    <span className={'avatar-tile tone-' + tone} style={{ width: size, height: size }}>
      {url ? <img src={url} alt="" /> : <span>{(name || '?').trim().charAt(0).toUpperCase()}</span>}
    </span>
  )
}

// The left-hand list on the Characters and Locations pages
export default function EntryList({ entries, selectedId, onSelect, search, onSearch, searchLabel, tone, meta, children }) {
  const q = search.trim().toLowerCase()
  const shown = entries.filter((e) => !q || e.name.toLowerCase().includes(q))
  return (
    <div className="entry-list">
      {children}
      <div className="search">
        <Search size={16} />
        <input placeholder={searchLabel} value={search} onChange={(e) => onSearch(e.target.value)} aria-label={searchLabel} />
      </div>
      <ul>
        {shown.map((e) => (
          <li key={e.id}>
            <button className={'entry' + (selectedId === e.id ? ' on' : '')} onClick={() => onSelect(e.id)}>
              <Avatar path={e.record?.images?.[0] || e.record?.photos?.[0]} name={e.name} tone={tone} />
              <span className="entry-text">
                <strong>{e.name}</strong>
                <span className="meta-text">{meta(e)}</span>
              </span>
              {!e.record && <span className="badge">New</span>}
            </button>
          </li>
        ))}
        {shown.length === 0 && <li className="meta-text pad-sm">Nothing matches.</li>}
      </ul>
    </div>
  )
}
