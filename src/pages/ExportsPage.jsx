import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ClipboardList, FileText, Layers, ListChecks, Printer, Rows3, Wrench } from 'lucide-react'
import { useProject } from './ProjectLayout.jsx'
import { fmtDate } from '../lib/dates.js'

function Card({ icon: Icon, tone, title, text, count, action, children, disabled }) {
  return (
    <section className={'card pad export-card tone-' + tone}>
      <div className="export-top">
        <span className="tile">
          <Icon size={20} />
        </span>
        <div>
          <h2 className="card-title">{title}</h2>
          <p className="muted-text">{text}</p>
        </div>
      </div>
      {children}
      <div className="export-foot">
        <span className="meta-text">{count}</span>
        <button className="btn btn-primary btn-sm" onClick={action} disabled={disabled}>
          <Printer size={15} /> Print or save as PDF
        </button>
      </div>
    </section>
  )
}

export default function ExportsPage() {
  const { project, blocks, shots, days, analysis, tags, uses, openExport, printDoc } = useProject()
  const [sheetDay, setSheetDay] = useState('')
  const [listDay, setListDay] = useState('all')
  const frames = shots.rows.filter((s) => s.on_board).length
  const listed = shots.rows.filter((s) => s.in_list).length
  const hasScript = blocks.some((b) => (b.text || '').trim())
  const dayName = (d) => `${d.label}${d.date ? ` (${fmtDate(d.date, { weekday: false })})` : ''}`
  const pickedSheetDay = sheetDay || days.rows[0]?.id || ''

  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <h1>Exports</h1>
          <p className="muted-text">
            Clean, printable versions of everything. Each one opens your browser's print window. Choose <strong>Save as PDF</strong> as the printer to get a file, or send it straight to a printer.
          </p>
        </div>
      </div>

      <div className="export-grid">
        <Card
          icon={FileText}
          tone="pink"
          title="Screenplay"
          text="Your script in standard screenplay format, with an optional title page and scene numbers."
          count={hasScript ? `${analysis.stats.pages} pages` : 'The script is empty'}
          action={openExport}
          disabled={!hasScript}
        />
        <Card
          icon={Layers}
          tone="violet"
          title="Storyboard"
          text="Every frame with its picture, drawing, shot details, and dialogue."
          count={`${frames} ${frames === 1 ? 'frame' : 'frames'}`}
          action={() => printDoc('storyboard')}
          disabled={frames === 0}
        />
        <Card
          icon={Rows3}
          tone="blue"
          title="Shot list"
          text="The full shot list on landscape pages, ready to carry on set."
          count={`${listed} ${listed === 1 ? 'shot' : 'shots'}`}
          action={() => printDoc('shotlist')}
          disabled={listed === 0}
        />
        <Card
          icon={ClipboardList}
          tone="teal"
          title="Call sheet"
          text="One page for a shoot day: where to be, when, and who is needed."
          count={days.rows.length ? `${days.rows.length} shoot ${days.rows.length === 1 ? 'day' : 'days'}` : 'No shoot days yet'}
          action={() => printDoc('callsheet', { dayId: pickedSheetDay })}
          disabled={!days.rows.length}
        >
          {days.rows.length > 0 && (
            <select className="input compact" value={pickedSheetDay} onChange={(e) => setSheetDay(e.target.value)} aria-label="Shoot day for the call sheet">
              {days.rows.map((d) => (
                <option key={d.id} value={d.id}>
                  {dayName(d)}
                </option>
              ))}
            </select>
          )}
        </Card>
        <Card
          icon={CalendarDays}
          tone="amber"
          title="Production schedule"
          text="Every shoot day with its scenes, cast, and estimated time."
          count={days.rows.length ? `${days.rows.length} shoot ${days.rows.length === 1 ? 'day' : 'days'}` : 'No shoot days yet'}
          action={() => printDoc('schedule')}
          disabled={!days.rows.length}
        />
        <Card
          icon={ListChecks}
          tone="rose"
          title="Equipment checklist"
          text="The gear for each shoot day, with boxes to tick as you pack."
          count={uses.rows.length ? `${uses.rows.length} assignments` : 'No gear assigned yet'}
          action={() => printDoc('checklist', { dayId: listDay })}
          disabled={!days.rows.length || !uses.rows.length}
        >
          {days.rows.length > 0 && (
            <select className="input compact" value={listDay} onChange={(e) => setListDay(e.target.value)} aria-label="Shoot day for the checklist">
              <option value="all">All shoot days</option>
              {days.rows.map((d) => (
                <option key={d.id} value={d.id}>
                  {dayName(d)}
                </option>
              ))}
            </select>
          )}
        </Card>
        <Card
          icon={Wrench}
          tone="violet"
          title="Script breakdown"
          text="Every scene with its characters, props, costumes, vehicles, and more."
          count={`${tags.rows.length} tagged ${tags.rows.length === 1 ? 'item' : 'items'}`}
          action={() => printDoc('breakdown')}
          disabled={!hasScript}
        />
      </div>

      <p className="field-note">
        Tip: in the print window, turn off <em>Headers and footers</em> for the cleanest pages. Need to hand someone a call sheet fast? Open{' '}
        <Link className="text-link" to={`/project/${project.id}/callsheets`}>
          Call sheets
        </Link>{' '}
        and use Copy as text.
      </p>
    </div>
  )
}
