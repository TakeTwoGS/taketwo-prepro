// @mentions in comments: "@Dana Reyes" turns into a highlighted name and a note for that person

export function mentionedIds(text, people) {
  const found = new Set(
    splitMentions(text, people)
      .filter((s) => s.mention)
      .map((s) => s.text.slice(1).toLowerCase())
  )
  return people.filter((p) => p.name && found.has(p.name.toLowerCase())).map((p) => p.id)
}

// Cuts text into plain pieces and mention pieces, so mentions can be highlighted
export function splitMentions(text, people) {
  const names = people.map((p) => p.name).filter(Boolean).sort((a, b) => b.length - a.length)
  if (!names.length) return [{ text: String(text || '') }]
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp('@(' + names.map(esc).join('|') + ')', 'gi')
  const out = []
  let last = 0
  const src = String(text || '')
  for (const m of src.matchAll(re)) {
    if (m.index > last) out.push({ text: src.slice(last, m.index) })
    out.push({ text: m[0], mention: true })
    last = m.index + m[0].length
  }
  if (last < src.length) out.push({ text: src.slice(last) })
  return out.length ? out : [{ text: src }]
}
