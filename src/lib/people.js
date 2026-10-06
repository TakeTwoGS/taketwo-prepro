import { titleCase } from './breakdown.js'

// Characters and locations in the database vs. the ones found in the script

export const splitList = (s) =>
  String(s || '')
    .split(/[,;\n]/)
    .map((x) => x.trim())
    .filter(Boolean)

export const namesOf = (record) =>
  [record.name, ...splitList(record.aliases)].map((n) => n.toUpperCase().trim()).filter(Boolean)

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// One entry per character: matched to a saved record when there is one
export function buildCharacterEntries(detected, records) {
  const entries = []
  const byRecord = new Map()
  for (const name of detected) {
    const rec = records.find((r) => namesOf(r).includes(name))
    if (rec) {
      if (!byRecord.has(rec.id)) {
        const e = { id: rec.id, name: rec.name, record: rec, speaking: true, names: new Set(namesOf(rec)) }
        byRecord.set(rec.id, e)
        entries.push(e)
      }
      byRecord.get(rec.id).names.add(name)
    } else {
      entries.push({ id: 'script:' + name, name: titleCase(name), record: null, speaking: true, names: new Set([name]) })
    }
  }
  for (const rec of records) {
    if (!byRecord.has(rec.id)) {
      entries.push({ id: rec.id, name: rec.name, record: rec, speaking: false, names: new Set(namesOf(rec)) })
    }
  }
  return entries
}

export function buildLocationEntries(detected, records) {
  const entries = []
  const byRecord = new Map()
  for (const loc of detected) {
    const name = loc.name.toUpperCase()
    const rec = records.find((r) => namesOf(r).includes(name))
    if (rec) {
      if (!byRecord.has(rec.id)) {
        const e = { id: rec.id, name: rec.name, record: rec, inScript: true, names: new Set(namesOf(rec)) }
        byRecord.set(rec.id, e)
        entries.push(e)
      }
      byRecord.get(rec.id).names.add(name)
    } else {
      entries.push({ id: 'script:' + name, name: titleCase(name), record: null, inScript: true, names: new Set([name]) })
    }
  }
  for (const rec of records) {
    if (!byRecord.has(rec.id)) {
      entries.push({ id: rec.id, name: rec.name, record: rec, inScript: false, names: new Set(namesOf(rec)) })
    }
  }
  return entries
}

// The text of each scene, used to spot a character's name in the action lines too
export function sceneTexts(scenes, blocks) {
  return scenes.map((s) =>
    blocks
      .slice(s.start, s.end + 1)
      .map((b) => b.text || '')
      .join('\n')
  )
}

// Scenes a character is in: speaks in them, or is named in them
export function characterScenes(entry, scenes, texts) {
  const res = []
  scenes.forEach((scene, i) => {
    const speaks = scene.characters.some((n) => entry.names.has(n))
    let mentioned = false
    if (!speaks) {
      mentioned = [...entry.names].some((n) => new RegExp('(^|[^\\w])' + esc(n) + '($|[^\\w])', 'i').test(texts[i] || ''))
    }
    if (speaks || mentioned) res.push({ scene, speaks })
  })
  return res
}

export function locationScenes(entry, scenes) {
  return scenes.filter((s) => s.location && entry.names.has(s.location))
}

// What "Start Pre-Production" would add
export function planPrePro(analysis, characters, locations, shots) {
  const charNames = new Set(characters.flatMap(namesOf))
  const locNames = new Set(locations.flatMap(namesOf))
  const newCharacters = analysis.characters.filter((n) => !charNames.has(n))
  const newLocations = analysis.locations.filter((l) => !locNames.has(l.name.toUpperCase()))
  const used = new Set(shots.map((s) => s.scene_id).filter(Boolean))
  const scenesWithoutShots = analysis.scenes.filter((s) => !used.has(s.id))
  return { newCharacters, newLocations, scenesWithoutShots }
}

export const newCharacter = (name) => ({
  name,
  aliases: '',
  description: '',
  actor: '',
  costume: '',
  props: '',
  notes: '',
  images: [],
})

export const newLocation = (name) => ({
  name,
  aliases: '',
  address: '',
  contact: '',
  parking: '',
  power: '',
  restrooms: '',
  sound: '',
  lighting: '',
  permission: 'Not asked yet',
  notes: '',
  photos: [],
})

export const PERMISSIONS = ['Not asked yet', 'Asked', 'Approved', 'Denied', 'Not needed']
