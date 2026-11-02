import { useRef, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Modal } from './Modal.jsx'
import { useImageUrl } from '../lib/images.js'

function Thumb({ path, onOpen, onRemove }) {
  const url = useImageUrl(path)
  return (
    <div className="photo">
      <button type="button" className="photo-open" onClick={() => url && onOpen(url)} aria-label="View picture">
        {url ? <img src={url} alt="" /> : <span className="photo-wait">…</span>}
      </button>
      <button type="button" className="photo-x" onClick={onRemove} aria-label="Remove picture">
        <X size={14} />
      </button>
    </div>
  )
}

// A small gallery with an "add pictures" tile
export default function PhotoGrid({ paths = [], onAdd, onRemove, max = 8, busy = false, addLabel = 'Add pictures' }) {
  const input = useRef(null)
  const [big, setBig] = useState(null)
  return (
    <>
      <div className="photo-grid">
        {paths.map((p) => (
          <Thumb key={p} path={p} onOpen={setBig} onRemove={() => onRemove(p)} />
        ))}
        {paths.length < max && (
          <button type="button" className="photo-add" onClick={() => input.current?.click()} disabled={busy}>
            <ImagePlus size={20} />
            <span>{busy ? 'Uploading…' : addLabel}</span>
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            const files = [...e.target.files]
            e.target.value = ''
            if (files.length) onAdd(files.slice(0, Math.max(0, max - paths.length)))
          }}
        />
      </div>
      {big && (
        <Modal title="Picture" xl onClose={() => setBig(null)}>
          <img className="photo-big" src={big} alt="" />
        </Modal>
      )}
    </>
  )
}
