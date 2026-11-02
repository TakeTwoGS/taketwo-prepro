import { castForScenes, isUnavailable } from './crew.js'
import { dayEquipment } from './equipment.js'
import { fmtDate, fmtTime, fromMinutes, toMinutes } from './dates.js'
import { sceneMinutes, dayScenes } from './schedule.js'
import { namesOf } from './people.js'
import { titleCase } from './breakdown.js'

export const SECTIONS = [
  { key: 'schedule', label: 'Schedule' },
  { key: 'cast', label: 'Cast' },
  { key: 'crew', label: 'Crew' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'notes', label: 'Notes' },
]

// Everything on one call sheet, gathered from the rest of the project.
// The screen, the printout, and the copy-as-text all read from this one object.
export function buildCallSheet({ project, day, dayIndex, dayCount, scenes, sceneInfo, shots, characters, locations, people, uses, items, shotLabels }) {
  const scenesById = new Map(scenes.map((s) => [s.id, s]))
  const sceneList = dayScenes(day, scenesById)
  const cs = day.call_sheet || {}
  const general = day.call_time || cs.general_call || '08:00'
  const calls = cs.calls || {}
  const hide = cs.hide || {}

  let t = toMinutes(general) ?? 480
  const schedule = sceneList.map((scene) => {
    const m = sceneMinutes(scene, sceneInfo, shots)
    const row = {
      id: scene.id,
      number: scene.number,
      heading: scene.heading || 'Untitled scene',
      description: sceneInfo[scene.id]?.description || '',
      cast: scene.characters.map(titleCase),
      start: fromMinutes(t),
      minutes: m,
      guessed: m == null,
    }
    t += m ?? 60
    return row
  })
  const wrap = fromMinutes(t)

  const places = new Map()
  for (const s of sceneList) {
    if (!s.location || places.has(s.location)) continue
    const rec = locations.find((r) => namesOf(r).includes(s.location))
    places.set(s.location, {
      name: rec?.name || titleCase(s.location),
      address: rec?.address || '',
      parking: rec?.parking || '',
      contact: rec?.contact || '',
    })
  }

  const cast = castForScenes(sceneList, characters, people).map((c) => ({
    key: c.key,
    character: c.name,
    actor: c.actor,
    contact: [c.person?.phone, c.person?.email].filter(Boolean).join(', '),
    scenes: c.scenes,
    unavailable: Boolean(c.person && isUnavailable(c.person, day.date)),
    call: calls[c.key] || general,
  }))

  const off = new Set(cs.crew_off || [])
  const crew = people
    .filter((p) => p.kind === 'crew')
    .map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      contact: [p.phone, p.email].filter(Boolean).join(', '),
      unavailable: isUnavailable(p, day.date),
      on: !off.has(p.id) && !isUnavailable(p, day.date),
      call: calls[p.id] || general,
    }))

  const sceneNumbers = new Map(scenes.map((s) => [s.id, s.number]))
  const equipment = dayEquipment({ day, sceneList, uses, items, shots, labels: shotLabels, sceneNumbers }).map((e) => ({
    id: e.item.id,
    name: e.item.name,
    category: e.item.category,
    why: e.why,
    checked: Boolean(day.equip_checked?.[e.item.id]),
  }))

  return {
    title: project.title,
    dayLabel: day.label,
    dayNumber: dayIndex + 1,
    dayCount,
    date: day.date,
    dateText: day.date ? fmtDate(day.date) : 'Date to be announced',
    general,
    wrap,
    places: [...places.values()],
    schedule,
    cast,
    crew,
    equipment,
    notes: cs.notes || '',
    safety: cs.safety || '',
    hospital: cs.hospital || '',
    parkingNote: cs.parking || '',
    show: Object.fromEntries(SECTIONS.map((s) => [s.key, hide[s.key] !== true])),
  }
}

// A plain-text version, handy for texting to the group
export function callSheetText(m) {
  const L = []
  L.push(`${m.title.toUpperCase()}`, `CALL SHEET: ${m.dayLabel}${m.dayCount > 1 ? ` (day ${m.dayNumber} of ${m.dayCount})` : ''}`, m.dateText, '')
  L.push(`General call: ${fmtTime(m.general)}`, `Estimated wrap: ${fmtTime(m.wrap)}`)
  if (m.places.length) {
    L.push('', m.places.length > 1 ? 'LOCATIONS' : 'LOCATION')
    for (const p of m.places) L.push(`${p.name}${p.address ? `, ${p.address}` : ''}${p.parking ? ` (parking: ${p.parking})` : ''}`)
  }
  if (m.parkingNote) L.push(`Parking: ${m.parkingNote}`)
  if (m.hospital) L.push(`Nearest hospital: ${m.hospital}`)
  if (m.show.schedule && m.schedule.length) {
    L.push('', 'SCHEDULE')
    for (const s of m.schedule) L.push(`${fmtTime(s.start)}  Scene ${s.number}: ${s.heading}${s.cast.length ? ` (${s.cast.join(', ')})` : ''}`)
  }
  if (m.show.cast && m.cast.length) {
    L.push('', 'CAST')
    for (const c of m.cast) L.push(`${fmtTime(c.call)}  ${c.character}${c.actor ? `: ${c.actor}` : ''}`)
  }
  if (m.show.crew && m.crew.some((c) => c.on)) {
    L.push('', 'CREW')
    for (const c of m.crew.filter((x) => x.on)) L.push(`${fmtTime(c.call)}  ${c.name}${c.role ? `, ${c.role}` : ''}`)
  }
  if (m.show.equipment && m.equipment.length) {
    L.push('', 'EQUIPMENT')
    for (const e of m.equipment) L.push(`- ${e.name}`)
  }
  if (m.show.notes && (m.notes || m.safety)) {
    L.push('')
    if (m.notes) L.push('NOTES', m.notes)
    if (m.safety) L.push('', 'SAFETY', m.safety)
  }
  return L.join('\n') + '\n'
}
