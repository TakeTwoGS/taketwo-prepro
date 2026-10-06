import Hint from './Hint.jsx'

export function TextField({ id, label, hint, value, onChange, placeholder, type = 'text', ...rest }) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label} {hint && <Hint text={hint} />}
      </label>
      <input id={id} className="input" type={type} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  )
}

export function AreaField({ id, label, hint, value, onChange, placeholder, rows = 3 }) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label} {hint && <Hint text={hint} />}
      </label>
      <textarea id={id} className="textarea" rows={rows} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

export function SelectField({ id, label, hint, value, onChange, options, empty = 'Not set', note }) {
  return (
    <div className="field">
      <label className="label" htmlFor={id}>
        {label} {hint && <Hint text={hint} />}
      </label>
      <select id={id} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {empty !== null && <option value="">{empty}</option>}
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
      {note && <p className="field-note">{note}</p>}
    </div>
  )
}

export function sceneOptions(scenes) {
  return scenes.map((s) => ({ value: s.id, label: `${s.number}. ${s.heading || 'Untitled scene'}` }))
}
