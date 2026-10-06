export const GEAR_CATEGORIES = ['Cameras', 'Lenses', 'Lighting', 'Audio', 'Grip', 'Tripods', 'Gimbals', 'Monitors', 'Storage', 'Power', 'Other']
export const SCOPES = [
  { value: 'project', label: 'Whole project' },
  { value: 'scene', label: 'A scene' },
  { value: 'shot', label: 'A shot' },
  { value: 'day', label: 'A shoot day' },
]

const catRank = (c) => {
  const i = GEAR_CATEGORIES.indexOf(c)
  return i < 0 ? GEAR_CATEGORIES.length : i
}

// Everything you need on a shoot day: gear for the whole project, for this day, and for the scenes and shots on it
export function dayEquipment({ day, sceneList, uses, items, shots, labels, sceneNumbers }) {
  const itemById = new Map(items.map((i) => [i.id, i]))
  const sceneIds = new Set(sceneList.map((s) => s.id))
  const shotById = new Map(shots.map((s) => [s.id, s]))
  const found = new Map()
  const add = (itemId, why) => {
    const item = itemById.get(itemId)
    if (!item) return
    if (!found.has(itemId)) found.set(itemId, { item, why: [] })
    if (!found.get(itemId).why.includes(why)) found.get(itemId).why.push(why)
  }
  for (const u of uses) {
    if (u.scope === 'project') add(u.item_id, 'Whole project')
    else if (u.scope === 'day' && u.target_id === day.id) add(u.item_id, 'This day')
    else if (u.scope === 'scene' && sceneIds.has(u.target_id)) add(u.item_id, `Scene ${sceneNumbers.get(u.target_id)}`)
    else if (u.scope === 'shot') {
      const shot = shotById.get(u.target_id)
      if (shot && sceneIds.has(shot.scene_id)) add(u.item_id, `Shot ${labels.get(shot.id) || ''}`.trim())
    }
  }
  return [...found.values()].sort((a, b) => catRank(a.item.category) - catRank(b.item.category) || a.item.name.localeCompare(b.item.name))
}

export function equipmentStatus(list, day) {
  const checked = list.filter((e) => day.equip_checked?.[e.item.id]).length
  return { total: list.length, checked, unchecked: list.length - checked }
}
