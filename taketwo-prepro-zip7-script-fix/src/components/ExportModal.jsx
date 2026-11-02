import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Download, Printer } from 'lucide-react'
import { Modal } from './Modal.jsx'
import { useAuth } from '../lib/auth.jsx'
import { downloadText, safeFileName, toPlainText } from '../lib/export.js'

// The hidden, print-only copy of the script. It is styled in styles.css under "print".
function PrintView({ blocks, opts }) {
  useEffect(() => {
    document.body.classList.add('has-print')
    return () => document.body.classList.remove('has-print')
  }, [])

  let sceneNo = 0
  return createPortal(
    <div id="print-root" className={opts.sceneNumbers ? 'pr-numbered' : ''}>
      {opts.titlePage && (
        <div className="pr-title-page">
          <div className="pr-tp-main">
            <div className="pr-tp-title">{opts.title}</div>
            {opts.author && (
              <>
                <div className="pr-tp-by">Written by</div>
                <div className="pr-tp-author">{opts.author}</div>
              </>
            )}
          </div>
          {opts.contact && <div className="pr-tp-contact">{opts.contact}</div>}
        </div>
      )}
      <div className="pr-script">
        {blocks
          .filter((b) => (b.text || '').trim())
          .map((b) => {
            if (b.type === 'scene') sceneNo += 1
            return (
              <div key={b.id} className={'pr pr-' + b.type} data-n={b.type === 'scene' ? sceneNo : undefined}>
                {b.text}
              </div>
            )
          })}
      </div>
    </div>,
    document.body
  )
}

export default function ExportModal({ project, blocks, onClose }) {
  const { user } = useAuth()
  const [opts, setOpts] = useState({
    title: project.title,
    author: user?.user_metadata?.full_name || '',
    contact: '',
    titlePage: true,
    sceneNumbers: false,
  })
  const set = (k, v) => setOpts((o) => ({ ...o, [k]: v }))

  return (
    <>
      <Modal title="Export your script" onClose={onClose} wide>
        <p className="modal-text">
          Print your script, or save it as a PDF. In the print window, choose <strong>Save as PDF</strong> as the printer.
        </p>

        <div className="check-row">
          <label className="check">
            <input type="checkbox" checked={opts.titlePage} onChange={(e) => set('titlePage', e.target.checked)} />
            <span>Include a title page</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={opts.sceneNumbers} onChange={(e) => set('sceneNumbers', e.target.checked)} />
            <span>Show scene numbers</span>
          </label>
        </div>

        {opts.titlePage && (
          <>
            <label className="label" htmlFor="ex-title">
              Title
            </label>
            <input id="ex-title" className="input" value={opts.title} onChange={(e) => set('title', e.target.value)} />
            <label className="label" htmlFor="ex-author">
              Written by
            </label>
            <input id="ex-author" className="input" value={opts.author} onChange={(e) => set('author', e.target.value)} />
            <label className="label" htmlFor="ex-contact">
              Contact info (optional)
            </label>
            <textarea
              id="ex-contact"
              className="textarea"
              rows={3}
              placeholder={'Your name\nEmail or phone'}
              value={opts.contact}
              onChange={(e) => set('contact', e.target.value)}
            />
          </>
        )}

        <p className="field-note">For the cleanest pages, turn off “Headers and footers” in the print window.</p>

        <div className="modal-actions spread">
          <button
            className="btn btn-ghost"
            onClick={() =>
              downloadText(
                safeFileName(project.title) + '.txt',
                toPlainText(blocks, { title: opts.title, author: opts.author, contact: opts.contact, titlePage: opts.titlePage })
              )
            }
          >
            <Download size={16} /> Download as text
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={16} /> Print or save as PDF
          </button>
        </div>
      </Modal>
      <PrintView blocks={blocks} opts={opts} />
    </>
  )
}
