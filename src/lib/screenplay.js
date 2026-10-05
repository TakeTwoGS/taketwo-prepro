// Everything about how a screenplay is structured lives here.
// A script is a list of "blocks": { id, type, text }

export const TYPES = ['scene', 'action', 'character', 'dialogue', 'paren', 'transition', 'shot']

export const TYPE_LABEL = {
  scene: 'Scene Heading',
  action: 'Action',
  character: 'Character',
  dialogue: 'Dialogue',
  paren: 'Parenthetical',
  transition: 'Transition',
  shot: 'Shot',
}

export const TYPE_SHORT = {
  scene: 'Scene',
  action: 'Action',
  character: 'Character',
  dialogue: 'Dialogue',
  paren: 'Paren.',
  transition: 'Transition',
  shot: 'Shot',
}

export const TYPE_PLACEHOLDER = {
  scene: 'INT. LOCATION - DAY',
  action: 'Describe what we see and hear',
  character: 'CHARACTER',
  dialogue: 'What they say',
  paren: 'how it is said',
  transition: 'CUT TO:',
  shot: 'CLOSE ON the detail',
}

// Plain-language help shown in Beginner Mode
export const TYPE_HINT = {
  scene:
    'Scene Heading: says where and when a scene happens. Write INT. (inside) or EXT. (outside), then the place, a dash, and the time of day. Example: INT. KITCHEN - NIGHT',
  action:
    'Action: describes what the audience sees and hears. Write it in the present tense, as if it is happening right now.',
  character:
    'Character: the name of the person who is about to speak, in capital letters. Press Enter and their line comes next.',
  dialogue: 'Dialogue: the words a character says out loud.',
  paren:
    'Parenthetical: a very short note about how a line is said, like (whispering). Use it rarely. Actors and directors like room to decide.',
  transition:
    'Transition: how one scene moves into the next, like CUT TO: or FADE OUT. Most scripts barely need these.',
  shot:
    'Shot: a camera instruction written into the script, like CLOSE ON the candle. Use sparingly. Directors usually choose their own shots.',
}

export const UPPER_TYPES = new Set(['scene', 'character', 'transition', 'shot'])

// What Enter creates after each element
export const NEXT_TYPE = {
  scene: 'action',
  action: 'action',
  character: 'dialogue',
  dialogue: 'action',
  paren: 'dialogue',
  transition: 'scene',
  shot: 'action',
}

export function uid() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
}

export function newBlock(type = 'action', text = '') {
  return { id: uid(), type, text }
}

export function normalizeText(type, text) {
  return UPPER_TYPES.has(type) ? (text || '').toUpperCase() : text
}

// Parentheticals are stored with their brackets, like "(whispering)"
export function isEmptyText(type, text) {
  const t = (text || '').trim()
  if (!t) return true
  return type === 'paren' && /^\(\s*\)$/.test(t)
}

// Changing a line from one type to another: handle capitals and brackets
export function convertText(from, to, text) {
  let t = text || ''
  if (from === 'paren' && to !== 'paren') t = t.trim().replace(/^\(\s*/, '').replace(/\s*\)$/, '')
  if (to === 'paren' && !/^\(.*\)$/s.test(t.trim())) t = '(' + t.trim() + ')'
  return normalizeText(to, t)
}

export function cycleType(type, dir = 1) {
  const i = TYPES.indexOf(type)
  return TYPES[(i + dir + TYPES.length) % TYPES.length]
}

// "INT. " typed at the start of an action line turns it into a scene heading
export const AUTO_SCENE_RE = /^(int\.?\/ext|ext\.?\/int|int|ext|i\/e)\.\s/i

// ---------- Scene headings ----------

const TIME_RE =
  /\b(DAY|NIGHT|MORNING|AFTERNOON|EVENING|DAWN|DUSK|SUNRISE|SUNSET|NOON|MIDNIGHT|TWILIGHT|DAYBREAK|CONTINUOUS|LATER|SAME|MOMENTS)\b/i
const NIGHT_RE = /\b(NIGHT|EVENING|DUSK|MIDNIGHT|SUNSET|TWILIGHT)\b/i
const DAY_RE = /\b(DAY|MORNING|AFTERNOON|NOON|DAWN|SUNRISE|DAYBREAK)\b/i
const HEADING_RE = /^(INT\.?\s*\/\s*EXT\.?|EXT\.?\s*\/\s*INT\.?|I\s*\/\s*E\.?|INT\.?|EXT\.?)(?:\s+(.*))?$/i

// "EXT. PARK - NIGHT" -> { intExt: 'EXT', location: 'PARK', time: 'NIGHT', tod: 'night' }
export function parseHeading(text) {
  const t = (text || '').trim()
  let intExt = ''
  let rest = t
  const m = t.match(HEADING_RE)
  if (m) {
    const k = m[1].toUpperCase().replace(/[.\s]/g, '')
    intExt = k.includes('/') ? 'INT/EXT' : k.startsWith('INT') ? 'INT' : 'EXT'
    rest = (m[2] || '').trim()
  }
  let location = rest.toUpperCase()
  let time = ''
  const parts = rest.split(/\s+[-–—]\s+/)
  if (parts.length > 1) {
    const last = parts[parts.length - 1].trim()
    if (TIME_RE.test(last)) {
      time = last.toUpperCase()
      location = parts.slice(0, -1).join(' - ').trim().toUpperCase()
    }
  }
  const tod = NIGHT_RE.test(time) ? 'night' : DAY_RE.test(time) ? 'day' : 'other'
  return { intExt, location, time, tod }
}

export function cleanName(text) {
  return (text || '')
    .replace(/\(.*?\)/g, '')
    .replace(/\^/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
}

// ---------- Estimating pages ----------

export const LINES_PER_PAGE = 55
// How many characters fit on a line for each element (standard screenplay layout)
const WIDTH = { scene: 60, action: 60, character: 38, dialogue: 35, paren: 25, transition: 60, shot: 60 }
// Blank lines before each element
const LINES_BEFORE = { scene: 2, action: 1, character: 1, dialogue: 0, paren: 0, transition: 1, shot: 1 }

function wrapLines(text, width) {
  const paras = String(text || '').split('\n')
  let total = 0
  for (const p of paras) {
    const words = p.split(/\s+/).filter(Boolean)
    if (!words.length) {
      total += 1
      continue
    }
    let lines = 1
    let len = 0
    for (const w of words) {
      if (len === 0) len = w.length
      else if (len + 1 + w.length <= width) len += 1 + w.length
      else {
        lines++
        len = w.length
      }
      while (len > width) {
        lines++
        len -= width
      }
    }
    total += lines
  }
  return total
}

// ---------- Analysis: scenes, characters, stats ----------

export function analyze(blocks) {
  const scenes = []
  const names = new Set()
  let cur = null
  let lines = 0
  let words = 0

  blocks.forEach((b, i) => {
    const text = b.text || ''
    if (b.type === 'scene') {
      const h = parseHeading(text)
      cur = {
        id: b.id,
        number: scenes.length + 1,
        heading: text.trim().toUpperCase(),
        intExt: h.intExt,
        location: h.location,
        time: h.time,
        tod: h.tod,
        start: i,
        end: i,
        characters: new Set(),
        lines: 0,
      }
      scenes.push(cur)
    } else if (cur) {
      cur.end = i
    }
    if (b.type === 'character') {
      const n = cleanName(text)
      if (n) {
        names.add(n)
        if (cur) cur.characters.add(n)
      }
    }
    const l = (i === 0 ? 0 : LINES_BEFORE[b.type] || 0) + wrapLines(text, WIDTH[b.type] || 60)
    lines += l
    if (cur) cur.lines += l
    words += text.split(/\s+/).filter(Boolean).length
  })

  const locationMap = new Map()
  for (const s of scenes) {
    s.characters = [...s.characters].sort()
    s.pages = s.lines / LINES_PER_PAGE
    if (s.location) {
      if (!locationMap.has(s.location)) locationMap.set(s.location, [])
      locationMap.get(s.location).push(s.number)
    }
  }
  const locations = [...locationMap.entries()].map(([name, nums]) => ({ name, scenes: nums }))

  const pages = words === 0 ? 0 : lines / LINES_PER_PAGE
  const count = (fn) => scenes.filter(fn).length
  const stats = {
    pages: Math.round(pages * 10) / 10,
    runtime: pages === 0 ? 0 : Math.max(1, Math.round(pages)),
    scenes: scenes.length,
    interior: count((s) => s.intExt === 'INT'),
    exterior: count((s) => s.intExt === 'EXT'),
    intExt: count((s) => s.intExt === 'INT/EXT'),
    day: count((s) => s.tod === 'day'),
    night: count((s) => s.tod === 'night'),
    otherTime: count((s) => s.tod === 'other'),
    locations: locations.length,
    characters: names.size,
    words,
  }
  return { scenes, locations, characters: [...names].sort(), stats }
}

// ---------- Reordering scenes ----------

function splitIntoScenes(blocks) {
  const preface = []
  const groups = []
  let cur = null
  for (const b of blocks) {
    if (b.type === 'scene') {
      cur = [b]
      groups.push(cur)
    } else if (cur) cur.push(b)
    else preface.push(b)
  }
  return { preface, groups }
}

// Moves the scene at index `from` so that it ends up at index `to` (0-based scene positions)
export function reorderScenes(blocks, from, to) {
  const { preface, groups } = splitIntoScenes(blocks)
  if (from === to || from < 0 || to < 0 || from >= groups.length || to >= groups.length) return blocks
  const [g] = groups.splice(from, 1)
  groups.splice(to, 0, g)
  return [...preface, ...groups.flat()]
}

// ---------- Turning pasted plain text into blocks ----------

const TRANSITION_RE = /^(FADE (IN|OUT)[.:]?|FADE TO BLACK[.:]?|CUT TO BLACK[.:]?|THE END\.?|[A-Z0-9 .'’-]+ TO:)$/
const SHOT_RE = /^(CLOSE ON|CLOSE UP|ANGLE ON|WIDE ON|INSERT|POV|BACK TO|INTERCUT)\b/

export function parsePlainText(raw) {
  const lines = String(raw || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
  const out = []
  let inDialogue = false
  let prevBlank = true

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (!t) {
      inDialogue = false
      prevBlank = true
      continue
    }
    const upper = t === t.toUpperCase() && /[A-Z]/.test(t)
    const nextLine = (lines[i + 1] || '').trim()

    if (HEADING_RE.test(t) && /^(int|ext|i\/e|int\.?\s*\/|ext\.?\s*\/)/i.test(t) && t.length < 120) {
      out.push({ ...newBlock('scene', t.toUpperCase()) })
      inDialogue = false
    } else if (inDialogue) {
      const last = out[out.length - 1]
      if (/^\(.*\)$/.test(t)) {
        out.push(newBlock('paren', t))
      } else if (!prevBlank && last && last.type === 'dialogue') {
        last.text += ' ' + t
      } else {
        out.push(newBlock('dialogue', t))
      }
    } else if (upper && TRANSITION_RE.test(t)) {
      out.push(newBlock('transition', t))
    } else if (upper && SHOT_RE.test(t)) {
      out.push(newBlock('shot', t))
    } else if (upper && prevBlank && nextLine && t.length <= 40 && !/[.!?:]$/.test(t)) {
      out.push(newBlock('character', t))
      inDialogue = true
    } else {
      const last = out[out.length - 1]
      if (!prevBlank && last && last.type === 'action') last.text += ' ' + t
      else out.push(newBlock('action', t))
    }
    prevBlank = false
  }
  return out
}

export function fmtPages(p) {
  if (!p) return '0'
  return p < 10 ? p.toFixed(1) : String(Math.round(p))
}

export function fmtRuntime(stats) {
  if (!stats || !stats.runtime) return '0 min'
  return `about ${stats.runtime} min`
}
