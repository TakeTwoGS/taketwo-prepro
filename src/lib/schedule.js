import { castForScenes, isUnavailable } from './crew.js'
import { titleCase } from './breakdown.js'
import { daysUntil, fmtDuration, whenText } from './dates.js'

// How long a scene is expected to take: your own estimate, or the setup + shooting times in the shot list
export function sceneMinutes(scene, sceneInfo, shots) {
  const own = Number(sceneInfo?.[scene.id]?.minutes)
  if (own > 0) return own
  const sum = shots
    .filter((s) => s.scene_id === scene.id && s.in_list)
    .reduce((n, s) => n + (s.setup_min || 0) + (s.shoot_min || 0), 0)
  return sum > 0 ? sum : null
}

export const sortDays = (days) =>
  days.slice().sort((a, b) => {
    const ad = a.date || '9999-99-99'
    const bd = b.date || '9999-99-99'
    return ad === bd ? String(a.created_at || '').localeCompare(String(b.created_at || '')) || a.label.localeCompare(b.label) : ad.localeCompare(bd)
  })

export function dayScenes(day, scenesById) {
  return (day.scene_ids || []).map((id) => scenesById.get(id)).filter(Boolean)
}

export function scheduledIds(days) {
  return new Set(days.flatMap((d) => d.scene_ids || []))
}

export function dayStats(sceneList, sceneInfo, shots) {
  let pages = 0
  let minutes = 0
  let unknown = 0
  const tods = new Set()
  const locations = new Set()
  for (const s of sceneList) {
    pages += s.pages || 0
    const m = sceneMinutes(s, sceneInfo, shots)
    if (m == null) unknown += 1
    else minutes += m
    tods.add(s.tod)
    if (s.location) locations.add(s.location)
  }
  return { count: sceneList.length, pages, minutes, unknown, hasDay: tods.has('day'), hasNight: tods.has('night'), locations }
}

// Ways to organize the scenes that are not scheduled yet
export function groupScenes(scenes, mode) {
  if (mode === 'location') {
    const map = new Map()
    for (const s of scenes) {
      const k = s.location ? titleCase(s.location) : 'No location'
      if (!map.has(k)) map.set(k, [])
      map.get(k).push(s)
    }
    return [...map.entries()].map(([label, list]) => ({ key: label, label, scenes: list }))
  }
  if (mode === 'time') {
    const defs = [['day', 'Day scenes'], ['night', 'Night scenes'], ['other', 'Other or not set']]
    return defs.map(([k, label]) => ({ key: k, label, scenes: scenes.filter((s) => s.tod === k) })).filter((g) => g.scenes.length)
  }
  if (mode === 'intext') {
    const defs = [['INT', 'Interior'], ['EXT', 'Exterior'], ['INT/EXT', 'Interior and exterior'], ['', 'Not set']]
    return defs.map(([k, label]) => ({ key: k || 'none', label, scenes: scenes.filter((s) => s.intExt === k) })).filter((g) => g.scenes.length)
  }
  return [{ key: 'all', label: '', scenes }]
}

// Recommendations only. Nothing here ever changes the schedule by itself.
// level: 'warn' needs attention, 'tip' is a suggestion, 'info' is just a note
export function dayWarnings({ day, days, scenes, sceneInfo, shots, characters, people, equipment, mine, stats }) {
  const out = []
  if (!mine.length) {
    out.push({ level: 'info', text: 'No scenes are scheduled for this day yet. Drag scenes here.' })
    return out
  }

  if (!day.date) {
    out.push({ level: 'info', text: 'Pick a date for this day so we can check cast and crew availability.' })
  } else {
    for (const c of castForScenes(mine, characters, people)) {
      if (c.person && isUnavailable(c.person, day.date)) {
        out.push({
          level: 'warn',
          text: `Actor unavailable this day: ${c.person.name} (${c.name}) is needed in ${c.scenes.length === 1 ? 'scene' : 'scenes'} ${c.scenes.join(', ')}.`,
        })
      }
    }
    const crewOut = people.filter((p) => p.kind === 'crew' && isUnavailable(p, day.date))
    if (crewOut.length) {
      out.push({ level: 'info', text: `Crew unavailable this day: ${crewOut.map((p) => (p.role ? `${p.name} (${p.role})` : p.name)).join(', ')}.` })
    }
  }

  const homeOf = (sceneId) => days.find((d) => (d.scene_ids || []).includes(sceneId))
  for (const loc of stats.locations) {
    const others = scenes.filter((s) => s.location === loc && !mine.includes(s))
    if (!others.length) continue
    const where = (s) => homeOf(s.id)?.label || 'not scheduled yet'
    out.push({
      level: 'tip',
      text: `${others.length === 1 ? 'Another scene uses' : 'Other scenes use'} the same location, ${titleCase(loc)}: ${others
        .map((s) => `scene ${s.number} (${where(s)})`)
        .join(', ')}. Shooting them together can save setup time.`,
      actions: others.slice(0, 3).map((s) => ({ label: `Move scene ${s.number} here`, sceneId: s.id })),
    })
  }

  if (stats.minutes > 600) {
    out.push({ level: 'warn', text: `This is a big day: about ${fmtDuration(stats.minutes)} of work is planned. A typical shoot day is around 10 hours.` })
  }
  if (stats.pages > 6) {
    out.push({ level: 'warn', text: `${stats.pages.toFixed(1)} script pages is a lot for one day. Many small crews aim for about 3 to 5.` })
  }
  if (stats.hasDay && stats.hasNight) {
    out.push({ level: 'tip', text: 'This day mixes day and night scenes. Plan your light carefully, since it can make for a very long day.' })
  }

  if (day.date && equipment) {
    const n = daysUntil(day.date)
    if (n !== null && n >= 0 && n <= 3) {
      if (equipment.total === 0) out.push({ level: 'tip', text: 'No gear is assigned to this day yet. Add it on the Equipment tab.' })
      else if (equipment.unchecked > 0) {
        out.push({
          level: 'warn',
          text: `${equipment.unchecked} of ${equipment.total} gear items are not checked off yet, and this shoot is ${whenText(day.date)}.`,
        })
      }
    }
  }
  return out
}
