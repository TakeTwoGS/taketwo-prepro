// Merging two people's edits to the same script, line by line.
// base = the last version both people had, mine = what is on my screen, theirs = what the other person saved.

const same = (a, b) => a.type === b.type && a.text === b.text

export function sameBlocks(a, b) {
  if (a === b) return true
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i].id !== b[i].id || !same(a[i], b[i])) return false
  return true
}

export function mergeBlocks(base, mine, theirs) {
  if (sameBlocks(mine, base)) return { blocks: theirs, conflicts: [] }
  if (sameBlocks(theirs, base)) return { blocks: mine, conflicts: [] }

  const B = new Map(base.map((b) => [b.id, b]))
  const M = new Map(mine.map((b) => [b.id, b]))
  const T = new Map(theirs.map((b) => [b.id, b]))
  const conflicts = []
  const out = []

  for (const t of theirs) {
    const b = B.get(t.id)
    const m = M.get(t.id)
    if (b && !m) {
      // I deleted this line. If they left it alone it stays deleted; if they edited it, keep their edit.
      if (!same(t, b)) out.push(t)
      continue
    }
    if (b && m) {
      const iChanged = !same(m, b)
      const theyChanged = !same(t, b)
      if (iChanged && theyChanged && !same(m, t)) {
        conflicts.push(t.id) // both edited the same line: yours stays, and you are told
        out.push(m)
      } else out.push(iChanged ? m : t)
      continue
    }
    out.push(t) // a new line from them
  }

  // Lines only I have: new lines I wrote, or lines they deleted
  const present = new Set(out.map((b) => b.id))
  mine.forEach((m, i) => {
    if (present.has(m.id)) return
    const b = B.get(m.id)
    if (b && !T.has(m.id) && same(m, b)) return // they deleted it and I never touched it
    let at = 0
    for (let j = i - 1; j >= 0; j--) {
      const idx = out.findIndex((x) => x.id === mine[j].id)
      if (idx >= 0) {
        at = idx + 1
        break
      }
    }
    out.splice(at, 0, m)
    present.add(m.id)
  })
  return { blocks: out, conflicts }
}

// Scene notes (props, wardrobe...) are merged per scene
export function mergeInfo(base, mine, theirs) {
  const out = { ...theirs }
  for (const k of Object.keys(mine)) {
    if (JSON.stringify(mine[k]) !== JSON.stringify(base[k])) out[k] = mine[k]
  }
  for (const k of Object.keys(base)) {
    if (!(k in mine) && JSON.stringify(theirs[k]) === JSON.stringify(base[k])) delete out[k]
  }
  return out
}

// A line-by-line comparison of two versions of a script. Each row is { kind: 'same' | 'add' | 'del', block }.
export function diffBlocks(a, b) {
  const key = (x) => x.type + '\u0000' + x.text
  const n = a.length
  const m = b.length
  // longest common subsequence
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = key(a[i]) === key(b[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const rows = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (key(a[i]) === key(b[j])) {
      rows.push({ kind: 'same', block: b[j] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ kind: 'del', block: a[i++] })
    } else {
      rows.push({ kind: 'add', block: b[j++] })
    }
  }
  while (i < n) rows.push({ kind: 'del', block: a[i++] })
  while (j < m) rows.push({ kind: 'add', block: b[j++] })
  return rows
}

// Hide long stretches of unchanged lines, keeping a little context around each change
export function collapseDiff(rows, context = 2) {
  const keep = new Array(rows.length).fill(false)
  rows.forEach((r, i) => {
    if (r.kind !== 'same') for (let k = Math.max(0, i - context); k <= Math.min(rows.length - 1, i + context); k++) keep[k] = true
  })
  const out = []
  let skipped = 0
  rows.forEach((r, i) => {
    if (keep[i]) {
      if (skipped) out.push({ kind: 'gap', count: skipped })
      skipped = 0
      out.push(r)
    } else skipped++
  })
  if (skipped) out.push({ kind: 'gap', count: skipped })
  return out
}
