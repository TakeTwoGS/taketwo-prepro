import { namesOf, splitList } from './people.js'
import { titleCase } from './breakdown.js'

export const ROLES = [
  'Director',
  'Producer',
  'Cinematographer',
  'Camera Operator',
  '1st AC',
  'Gaffer',
  'Grip',
  'Sound Mixer',
  'Boom Operator',
  'Production Designer',
  'Editor',
]

export const isUnavailable = (person, date) => Boolean(date) && (person.unavailable || []).includes(date)
export const playsNames = (person) => splitList(person.plays).map((x) => x.toUpperCase())

// Every speaking character in these scenes, with the person who plays them (if you have set that up)
export function castForScenes(sceneList, characters, people) {
  const order = []
  const seen = new Set()
  for (const s of sceneList) {
    for (const n of s.characters) {
      if (!seen.has(n)) {
        seen.add(n)
        order.push(n)
      }
    }
  }
  return order.map((n) => {
    const record = characters.find((r) => namesOf(r).includes(n))
    const all = record ? namesOf(record) : [n]
    const person = people.find((p) => p.kind === 'cast' && playsNames(p).some((x) => all.includes(x))) || null
    return {
      key: 'c:' + n,
      name: record?.name || titleCase(n),
      scriptName: n,
      scenes: sceneList.filter((s) => s.characters.includes(n)).map((s) => s.number),
      record,
      person,
      actor: person ? person.name : record?.actor || '',
    }
  })
}

// Scenes where any character this person plays speaks
export function personScenes(person, characters, scenes) {
  const names = new Set()
  for (const x of playsNames(person)) {
    names.add(x)
    const rec = characters.find((r) => namesOf(r).includes(x))
    if (rec) namesOf(rec).forEach((n) => names.add(n))
  }
  return scenes.filter((s) => s.characters.some((c) => names.has(c)))
}
