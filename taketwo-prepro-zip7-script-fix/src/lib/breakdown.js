// Script breakdown: tag words in the script by category, then see them gathered per category and per scene.

export const CATEGORIES = [
  { key: 'Character', color: '#f472ff', hint: 'A speaking or important person in the scene.' },
  { key: 'Prop', color: '#ffc247', hint: 'An object an actor handles or uses, like a phone, a cup, or a backpack.' },
  { key: 'Location', color: '#3fd6c0', hint: 'The place where a scene happens.' },
  { key: 'Costume', color: '#a78bfa', hint: 'Clothing and accessories an actor wears.' },
  { key: 'Vehicle', color: '#6ea8ff', hint: 'Any car, bike, bus, or other vehicle that shows up on screen.' },
  { key: 'Makeup', color: '#ff7a9c', hint: 'Makeup, hair, or special looks like scars and bruises.' },
  { key: 'Sound', color: '#4fd1e8', hint: 'A sound you need to record or add later, like a ringing phone or a gunshot.' },
  { key: 'Special effect', color: '#ff9a5a', hint: 'Anything that is not simply filming real life, like smoke, rain, or a visual effect.' },
  { key: 'Set dressing', color: '#9be15d', hint: 'Things that make a place feel real, like pictures on a wall or books on a shelf.' },
  { key: 'Equipment', color: '#8c9bff', hint: 'Special gear you will need for a moment, like a drone or a slider.' },
  { key: 'Extra', color: '#b8b0c4', hint: 'Background people who do not speak, like other diners in a restaurant.' },
]
export const CATEGORY_KEYS = CATEGORIES.map((c) => c.key)
export const colorOf = (key) => CATEGORIES.find((c) => c.key === key)?.color || '#b8b0c4'

export function titleCase(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/(^|[^a-z0-9])([a-z])/g, (m, a, b) => a + b.toUpperCase())
}

// Works out where every tag sits in the CURRENT script text, even if the script was edited since.
export function resolveTags(blocks, tags, scenes) {
  const blockById = new Map(blocks.map((b) => [b.id, b]))
  const sceneOfBlock = new Map()
  let cur = null
  for (const b of blocks) {
    if (b.type === 'scene') cur = b.id
    sceneOfBlock.set(b.id, cur)
  }
  const placed = new Map() // blockId -> [{ tag, start, end }]
  const stale = [] // tags whose text can no longer be found
  const manual = [] // items added by hand, not tied to a spot in the script

  for (const t of tags) {
    if (!t.block_id) {
      manual.push(t)
      continue
    }
    const b = blockById.get(t.block_id)
    if (!b) {
      stale.push(t)
      continue
    }
    let s = t.start_idx
    let e = t.end_idx
    if (s == null || e == null || (b.text || '').slice(s, e) !== t.text) {
      const i = (b.text || '').indexOf(t.text)
      if (i < 0) {
        stale.push(t)
        continue
      }
      s = i
      e = i + t.text.length
    }
    if (!placed.has(b.id)) placed.set(b.id, [])
    placed.get(b.id).push({ tag: t, start: s, end: e })
  }

  for (const [id, list] of placed) {
    list.sort((a, b) => a.start - b.start)
    const keep = []
    let end = -1
    for (const item of list) {
      if (item.start >= end) {
        keep.push(item)
        end = item.end
      } else stale.push(item.tag)
    }
    placed.set(id, keep)
  }
  return { placed, stale, manual, sceneOfBlock, sceneNumber: new Map(scenes.map((s) => [s.id, s.number])) }
}

// Cuts a line of script into plain pieces and highlighted pieces
export function segmentsFor(text, items) {
  const out = []
  let pos = 0
  for (const it of items || []) {
    if (it.start > pos) out.push({ text: text.slice(pos, it.start) })
    out.push({ text: text.slice(it.start, it.end), tag: it.tag })
    pos = it.end
  }
  if (pos < text.length) out.push({ text: text.slice(pos) })
  if (!out.length) out.push({ text })
  return out
}

// Gathers everything into "by category" and "by scene" lists.
// Characters and locations are filled in automatically from the script itself.
export function summarize(resolved, tags, analysis) {
  const { sceneOfBlock, stale } = resolved
  const staleIds = new Set(stale.map((t) => t.id))
  const sceneNum = new Map(analysis.scenes.map((s) => [s.id, s.number]))
  const byCat = new Map(CATEGORIES.map((c) => [c.key, new Map()]))
  const bySceneMap = new Map(analysis.scenes.map((s) => [s.id, new Map()]))

  function bump(cat, text, sceneId, tag, auto) {
    const clean = String(text || '').trim()
    if (!clean || !byCat.has(cat)) return
    const k = clean.toLowerCase()
    const m = byCat.get(cat)
    if (!m.has(k)) m.set(k, { key: k, text: clean, scenes: new Set(), tagIds: [], auto: false, stale: false })
    const item = m.get(k)
    if (sceneNum.has(sceneId)) item.scenes.add(sceneNum.get(sceneId))
    if (tag) {
      item.tagIds.push(tag.id)
      if (staleIds.has(tag.id)) item.stale = true
    }
    if (auto) item.auto = true
    if (sceneId && bySceneMap.has(sceneId)) {
      const cm = bySceneMap.get(sceneId)
      if (!cm.has(cat)) cm.set(cat, new Map())
      cm.get(cat).set(k, clean)
    }
  }

  for (const s of analysis.scenes) {
    for (const n of s.characters) bump('Character', titleCase(n), s.id, null, true)
    if (s.location) bump('Location', titleCase(s.location), s.id, null, true)
  }
  for (const t of tags) {
    const sceneId = t.block_id ? sceneOfBlock.get(t.block_id) : t.scene_id
    bump(t.category, t.text, sceneId, t, false)
  }

  const cats = CATEGORIES.map((c) => ({
    ...c,
    items: [...byCat.get(c.key).values()]
      .map((i) => ({ ...i, scenes: [...i.scenes].sort((a, b) => a - b) }))
      .sort((a, b) => a.text.localeCompare(b.text)),
  }))
  const scenes = analysis.scenes.map((s) => ({
    scene: s,
    groups: CATEGORIES.map((c) => ({
      ...c,
      items: [...(bySceneMap.get(s.id).get(c.key)?.values() || [])].sort((a, b) => a.localeCompare(b)),
    })).filter((g) => g.items.length),
  }))
  return { cats, scenes, total: cats.reduce((n, c) => n + c.items.length, 0) }
}
