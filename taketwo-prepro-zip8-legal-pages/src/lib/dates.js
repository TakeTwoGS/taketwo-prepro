// Dates are kept as plain "YYYY-MM-DD" text and times as "HH:MM", so time zones can never shift them.

const pad = (n) => String(n).padStart(2, '0')

export function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseDate(s) {
  if (!s) return null
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function fmtDate(s, { weekday = true, year } = {}) {
  const d = parseDate(s)
  if (!d) return ''
  const showYear = year ?? d.getFullYear() !== new Date().getFullYear()
  return d.toLocaleDateString(undefined, {
    weekday: weekday ? 'long' : undefined,
    month: 'long',
    day: 'numeric',
    year: showYear ? 'numeric' : undefined,
  })
}

export function fmtDateShort(s) {
  const d = parseDate(s)
  return d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : ''
}

export function daysUntil(s) {
  const t = parseDate(s)
  const n = parseDate(todayStr())
  if (!t || !n) return null
  return Math.round((t - n) / 86400000)
}

export function whenText(s) {
  const n = daysUntil(s)
  if (n === null) return ''
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return 'yesterday'
  return n > 0 ? `in ${n} days` : `${-n} days ago`
}

export function toMinutes(t) {
  if (!t || !/^\d{1,2}:\d{2}/.test(t)) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function fromMinutes(total) {
  const t = ((Math.round(total) % 1440) + 1440) % 1440
  return `${pad(Math.floor(t / 60))}:${pad(t % 60)}`
}

export function fmtTime(t) {
  const m = toMinutes(t)
  if (m === null) return ''
  const h = Math.floor(m / 60)
  return `${h % 12 || 12}:${pad(m % 60)} ${h >= 12 ? 'PM' : 'AM'}`
}

export function fmtDuration(mins) {
  if (!mins) return '0 min'
  const h = Math.floor(mins / 60)
  const m = Math.round(mins % 60)
  return h ? `${h} h${m ? ` ${m} min` : ''}` : `${m} min`
}
